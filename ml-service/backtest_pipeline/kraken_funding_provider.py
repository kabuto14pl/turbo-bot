"""
TURBO-BOT P#152 — Kraken Real Funding Rate Provider
Fetches historical funding rates from Kraken Futures API v4.

API: GET https://futures.kraken.com/derivatives/api/v4/historicalfundingrates
- Public endpoint, no authentication required
- Returns HOURLY funding rates (relativeFundingRate = fraction per hour)
- We aggregate to 8h settlement windows for backtest compatibility
- Symbol format: PF_XBTUSD, PF_ETHUSD, PF_SOLUSD, PF_XRPUSD
"""

import os
import time
import requests
import pandas as pd
import numpy as np
from pathlib import Path


# Symbol mapping: internal pair → Kraken Futures perpetual symbol
SYMBOL_MAP = {
    'BTCUSDT': 'PF_XBTUSD',
    'ETHUSDT': 'PF_ETHUSD',
    'SOLUSDT': 'PF_SOLUSD',
    'XRPUSDT': 'PF_XRPUSD',
    'BNBUSDT': None,  # Kraken does not list BNB perpetual
}

KRAKEN_FUNDING_URL = 'https://futures.kraken.com/derivatives/api/v4/historicalfundingrates'
CACHE_DIR = Path(__file__).parent.parent / 'data' / 'funding_rates'


class KrakenFundingDataProvider:
    """
    Fetches and caches real funding rate data from Kraken Futures.
    
    Usage:
        provider = KrakenFundingDataProvider('BTCUSDT')
        provider.fetch_and_cache()  # downloads + saves CSV
        rate = provider.get_rate_at(timestamp)  # lookup for backtest
    """

    def __init__(self, symbol='BTCUSDT'):
        self.symbol = symbol
        self.kraken_symbol = SYMBOL_MAP.get(symbol)
        self.rates_df = None
        self._cache_path = CACHE_DIR / f'{symbol.lower()}_funding.csv'

    def is_supported(self):
        """Check if this symbol has Kraken Futures funding data."""
        return self.kraken_symbol is not None

    def fetch_and_cache(self, force_refresh=False):
        """
        Fetch historical funding rates from Kraken and cache locally.
        Aggregates hourly rates into 8h settlement windows.
        
        Returns:
            bool: True if data was loaded successfully
        """
        if not self.is_supported():
            print(f"  ⚠️ {self.symbol}: No Kraken Futures perpetual — funding data unavailable")
            return False

        # Use cache if fresh (< 4 hours old)
        if not force_refresh and self._cache_path.exists():
            cache_age_h = (time.time() - self._cache_path.stat().st_mtime) / 3600
            if cache_age_h < 4:
                return self._load_cache()

        print(f"  📡 Fetching Kraken funding rates for {self.kraken_symbol}...")
        
        try:
            resp = requests.get(
                KRAKEN_FUNDING_URL,
                params={'symbol': self.kraken_symbol},
                timeout=30,
                headers={'Accept': 'application/json'}
            )
            resp.raise_for_status()
            data = resp.json()
            
            if data.get('result') != 'success':
                print(f"  ❌ Kraken API error: {data}")
                return self._load_cache()
            
            rates = data.get('rates', [])
            if not rates:
                print(f"  ❌ No funding data returned for {self.kraken_symbol}")
                return self._load_cache()
            
            # Build hourly DataFrame
            df_hourly = pd.DataFrame(rates)
            df_hourly['timestamp'] = pd.to_datetime(df_hourly['timestamp'], utc=True)
            df_hourly = df_hourly.sort_values('timestamp').reset_index(drop=True)
            
            # Aggregate to 8h settlement windows (00:00, 08:00, 16:00 UTC)
            # Sum 8 consecutive hourly `relativeFundingRate` values
            df_hourly['settlement_window'] = df_hourly['timestamp'].dt.floor('8h')
            df_8h = df_hourly.groupby('settlement_window').agg(
                funding_rate=('relativeFundingRate', lambda x: x.sum()),  # sum hourly rates → 8h rate
                hourly_count=('relativeFundingRate', 'count'),
                avg_hourly_rate=('relativeFundingRate', 'mean'),
            ).reset_index()
            df_8h.rename(columns={'settlement_window': 'timestamp'}, inplace=True)
            
            # Only keep complete 8h windows (7-8 hours of data)
            df_8h = df_8h[df_8h['hourly_count'] >= 7].reset_index(drop=True)
            
            # Save cache
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            df_8h.to_csv(self._cache_path, index=False)
            
            self.rates_df = df_8h
            print(f"  ✅ {self.symbol}: {len(df_8h)} 8h-settlement records "
                  f"({df_8h['timestamp'].min().strftime('%Y-%m-%d')} → "
                  f"{df_8h['timestamp'].max().strftime('%Y-%m-%d')}), "
                  f"from {len(rates)} hourly records")
            return True
            
        except requests.RequestException as e:
            print(f"  ❌ Kraken API error for {self.symbol}: {e}")
            return self._load_cache()

    def _load_cache(self):
        """Load from local CSV cache."""
        if self._cache_path.exists():
            self.rates_df = pd.read_csv(self._cache_path)
            self.rates_df['timestamp'] = pd.to_datetime(self.rates_df['timestamp'], utc=True)
            print(f"  📁 {self.symbol}: Loaded {len(self.rates_df)} cached 8h funding rates")
            return True
        return False

    def get_rate_at(self, timestamp):
        """
        Get the 8h aggregated funding rate active at a given timestamp.
        
        Returns the most recent 8h-settlement rate before the given timestamp.
        The rate is already summed over 8 hourly rates, matching our backtest
        settlement frequency (every 32 candles on 15m = 8h).
        
        Args:
            timestamp: datetime or pd.Timestamp
            
        Returns:
            float or None: 8h aggregated funding rate (e.g., 0.00006 = 0.006% per 8h)
        """
        if self.rates_df is None or len(self.rates_df) == 0:
            return None
        
        ts = pd.Timestamp(timestamp)
        if ts.tz is None:
            ts = ts.tz_localize('UTC')
        
        # Find the most recent 8h window before this timestamp
        mask = self.rates_df['timestamp'] <= ts
        if not mask.any():
            return None
        
        idx = self.rates_df.loc[mask, 'timestamp'].idxmax()
        return float(self.rates_df.loc[idx, 'funding_rate'])

    def get_rates_in_range(self, start, end):
        """
        Get all 8h-aggregated funding rate records between start and end.
        
        Returns:
            pd.DataFrame with columns [timestamp, funding_rate, hourly_count, avg_hourly_rate]
        """
        if self.rates_df is None or len(self.rates_df) == 0:
            return pd.DataFrame()
        
        start_ts = pd.Timestamp(start, tz='UTC')
        end_ts = pd.Timestamp(end, tz='UTC')
        
        mask = (self.rates_df['timestamp'] >= start_ts) & (self.rates_df['timestamp'] <= end_ts)
        return self.rates_df[mask].copy()

    def get_stats(self):
        """Summary statistics of loaded funding data (8h rates)."""
        if self.rates_df is None or len(self.rates_df) == 0:
            return {'loaded': False, 'symbol': self.symbol}
        
        rates = self.rates_df['funding_rate']  # 8h aggregated rates
        return {
            'loaded': True,
            'symbol': self.symbol,
            'kraken_symbol': self.kraken_symbol,
            'records': len(self.rates_df),
            'date_range': f"{self.rates_df['timestamp'].min()} → {self.rates_df['timestamp'].max()}",
            'mean_rate_8h': round(float(rates.mean()), 8),
            'median_rate_8h': round(float(rates.median()), 8),
            'max_rate_8h': round(float(rates.max()), 6),
            'min_rate_8h': round(float(rates.min()), 6),
            'std_rate_8h': round(float(rates.std()), 8),
            'positive_pct': round(float((rates > 0).mean() * 100), 1),
            'estimated_annual_yield': round(float(rates.mean() * 3 * 365 * 100), 2),  # 3 settlements/day
        }

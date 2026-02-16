#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║  BTC/USDT Data Fetcher for Quantum Trading System                           ║
║  Multi-source: CCXT (OKX/Binance) + REST API + CSV fallback                 ║
║  Provides OHLCV data to quantum_engine_gpu.py                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import sys
import json
import time
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path

logger = logging.getLogger('quantum_gpu.data_fetcher')

# ============================================================================
# Configuration
# ============================================================================
DATA_DIR = Path(__file__).parent / 'data'
DATA_DIR.mkdir(parents=True, exist_ok=True)
BTC_DATA_FILE = DATA_DIR / 'btc_ohlcv.csv'
EXCHANGES_PRIORITY = ['okx', 'binance', 'kraken', 'bybit']
DEFAULT_SYMBOL = 'BTC/USDT'
DEFAULT_TIMEFRAME = '5m'
DEFAULT_LOOKBACK = 200


class DataFetcher:
    """
    Multi-source BTC/USDT OHLCV data fetcher.
    
    Priority chain:
      1. CCXT exchange (OKX → Binance → Kraken → Bybit)
      2. Bot API (localhost:3001/api/candles)
      3. Existing CSV file with freshness check
      4. Mock data generation (last resort)
    """

    def __init__(self, symbol=DEFAULT_SYMBOL, timeframe=DEFAULT_TIMEFRAME,
                 lookback=DEFAULT_LOOKBACK, bot_api_url=None):
        self.symbol = symbol
        self.timeframe = timeframe
        self.lookback = lookback
        self.bot_api_url = bot_api_url or os.environ.get('BOT_API_URL', 'http://localhost:3001')
        self.exchange = None
        self.last_fetch_time = 0
        self.cache = None
        self._init_exchange()

    def _init_exchange(self):
        """Initialize CCXT exchange connection."""
        try:
            import ccxt
        except ImportError:
            logger.warning('CCXT not installed — using fallback data sources')
            return

        for exch_name in EXCHANGES_PRIORITY:
            try:
                exchange_class = getattr(ccxt, exch_name)
                config = {
                    'enableRateLimit': True,
                    'timeout': 15000,
                }

                # Add API keys from env if available
                api_key = os.environ.get(f'API_KEY_{exch_name.upper()}', '')
                api_secret = os.environ.get(f'SECRET_{exch_name.upper()}', '')
                if api_key:
                    config['apiKey'] = api_key
                    config['secret'] = api_secret

                self.exchange = exchange_class(config)

                # Test connection
                self.exchange.load_markets()
                if self.symbol in self.exchange.markets:
                    logger.info(f'Exchange connected: {exch_name} (symbol: {self.symbol})')
                    return
                else:
                    logger.warning(f'{exch_name} doesn\'t have {self.symbol}, trying next...')
                    self.exchange = None
            except Exception as e:
                logger.warning(f'{exch_name} connection failed: {e}')
                self.exchange = None

        logger.warning('No exchange available — using fallback data sources')

    def fetch(self, force=False):
        """
        Fetch OHLCV data with multi-source fallback.
        
        Returns:
            pd.DataFrame with columns: timestamp, open, high, low, close, volume
        """
        # Cache: don't re-fetch within 30 seconds
        now = time.time()
        if not force and self.cache is not None and (now - self.last_fetch_time) < 30:
            return self.cache

        df = None

        # Source 1: CCXT Exchange
        if df is None and self.exchange:
            df = self._fetch_ccxt()

        # Source 2: Bot API
        if df is None:
            df = self._fetch_bot_api()

        # Source 3: Existing CSV
        if df is None:
            df = self._load_csv()

        # Source 4: Mock data
        if df is None:
            logger.warning('All data sources failed — generating mock data')
            df = self._generate_mock_data()

        # Validate and save
        if df is not None and len(df) > 0:
            df = self._validate_data(df)
            self._save_csv(df)
            self.cache = df
            self.last_fetch_time = now
            logger.info(f'Data fetched: {len(df)} candles, latest={df["timestamp"].iloc[-1]}')

        return df

    def _fetch_ccxt(self):
        """Fetch from CCXT exchange."""
        try:
            since = self.exchange.milliseconds() - self.lookback * self._timeframe_ms()
            ohlcv = self.exchange.fetch_ohlcv(self.symbol, self.timeframe, since=since, limit=self.lookback)

            if not ohlcv or len(ohlcv) < 20:
                logger.warning(f'CCXT returned only {len(ohlcv) if ohlcv else 0} candles')
                return None

            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            logger.info(f'CCXT ({self.exchange.id}): {len(df)} candles fetched')
            return df

        except Exception as e:
            logger.warning(f'CCXT fetch failed: {e}')
            return None

    def _fetch_bot_api(self):
        """Fetch from bot's API endpoint."""
        try:
            import requests
            url = f'{self.bot_api_url}/api/candles'
            resp = requests.get(url, params={'symbol': self.symbol, 'limit': self.lookback}, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list) and len(data) > 20:
                    df = pd.DataFrame(data)
                    if 'timestamp' in df.columns:
                        df['timestamp'] = pd.to_datetime(df['timestamp'])
                    logger.info(f'Bot API: {len(df)} candles from {self.bot_api_url}')
                    return df
            return None
        except Exception as e:
            logger.debug(f'Bot API not available: {e}')
            return None

    def _load_csv(self):
        """Load from cached CSV file."""
        if BTC_DATA_FILE.exists():
            try:
                df = pd.read_csv(BTC_DATA_FILE)
                df['timestamp'] = pd.to_datetime(df['timestamp'])

                # Check freshness (max 30 minutes old for 5m candles)
                latest = df['timestamp'].max()
                age_minutes = (datetime.utcnow() - latest).total_seconds() / 60
                if age_minutes > 60:
                    logger.warning(f'CSV data is {age_minutes:.0f} min old — may be stale')

                logger.info(f'CSV loaded: {len(df)} candles (age: {age_minutes:.0f} min)')
                return df
            except Exception as e:
                logger.warning(f'CSV load failed: {e}')
        return None

    def _generate_mock_data(self):
        """Generate realistic BTC mock data for testing."""
        np.random.seed(42)
        n = self.lookback
        base_price = 68000.0
        timestamps = []
        opens, highs, lows, closes, volumes = [], [], [], [], []
        price = base_price

        now = datetime.utcnow()
        interval = self._timeframe_ms() / 1000  # seconds

        for i in range(n):
            ts = now - timedelta(seconds=(n - i) * interval)
            timestamps.append(ts)

            # Random walk with mean reversion
            change = np.random.normal(0, 0.002) * price
            if abs(price - base_price) > base_price * 0.05:
                change -= (price - base_price) * 0.01

            o = price
            c = price + change
            h = max(o, c) + abs(np.random.normal(0, 0.001)) * price
            l = min(o, c) - abs(np.random.normal(0, 0.001)) * price
            v = abs(np.random.normal(100, 30))

            opens.append(round(o, 2))
            highs.append(round(h, 2))
            lows.append(round(l, 2))
            closes.append(round(c, 2))
            volumes.append(round(v, 4))
            price = c

        df = pd.DataFrame({
            'timestamp': timestamps,
            'open': opens,
            'high': highs,
            'low': lows,
            'close': closes,
            'volume': volumes,
        })
        logger.info(f'Mock data generated: {n} candles around ${base_price}')
        return df

    def _validate_data(self, df):
        """Validate and clean OHLCV data."""
        required = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
        for col in required:
            if col not in df.columns:
                raise ValueError(f'Missing column: {col}')

        # Remove NaN rows
        df = df.dropna(subset=['open', 'high', 'low', 'close'])

        # Sort by timestamp
        df = df.sort_values('timestamp').reset_index(drop=True)

        # Remove duplicates
        df = df.drop_duplicates(subset=['timestamp'], keep='last')

        # Ensure numeric types
        for col in ['open', 'high', 'low', 'close', 'volume']:
            df[col] = pd.to_numeric(df[col], errors='coerce')

        # Trim to lookback
        if len(df) > self.lookback:
            df = df.tail(self.lookback).reset_index(drop=True)

        return df

    def _save_csv(self, df):
        """Cache data to CSV."""
        try:
            df.to_csv(BTC_DATA_FILE, index=False)
        except Exception as e:
            logger.warning(f'CSV save failed: {e}')

    def _timeframe_ms(self):
        """Convert timeframe string to milliseconds."""
        multipliers = {'m': 60_000, 'h': 3_600_000, 'd': 86_400_000}
        unit = self.timeframe[-1]
        value = int(self.timeframe[:-1])
        return value * multipliers.get(unit, 60_000)

    def get_features(self, df=None):
        """
        Extract and normalize features for quantum algorithms.
        
        Returns:
            features: np.ndarray shape (n, 5) — normalized OHLCV
            labels: np.ndarray shape (n-1,) — binary: 1=price up, 0=price down
            raw_prices: np.ndarray — raw close prices for PnL calculation
        """
        if df is None:
            df = self.fetch()

        if df is None or len(df) < 30:
            raise ValueError('Insufficient data for feature extraction')

        from sklearn.preprocessing import MinMaxScaler

        feature_cols = ['open', 'high', 'low', 'close', 'volume']
        raw_features = df[feature_cols].values

        # Normalize to [0, 1]
        scaler = MinMaxScaler()
        features = scaler.fit_transform(raw_features)

        # Labels: next candle direction (1=up, 0=down)
        closes = df['close'].values
        labels = (closes[1:] > closes[:-1]).astype(int)

        # Add technical indicators as extra features
        returns = np.diff(np.log(closes))
        volatility = pd.Series(returns).rolling(14).std().fillna(0).values
        momentum = pd.Series(closes).pct_change(14).fillna(0).values[:-1]

        # RSI
        rsi_period = 14
        deltas = np.diff(closes)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        avg_gain = pd.Series(gains).rolling(rsi_period).mean().fillna(0).values
        avg_loss = pd.Series(losses).rolling(rsi_period).mean().fillna(1e-10).values
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        rsi_norm = rsi / 100.0  # Normalize to [0, 1]

        # Combine: OHLCV (5) + volatility (1) + momentum (1) + RSI (1) = 8 features
        n = len(labels)
        extended_features = np.column_stack([
            features[:-1, :],           # OHLCV normalized (n, 5)
            volatility[:n].reshape(-1, 1),  # Volatility (n, 1)
            momentum[:n].reshape(-1, 1),    # Momentum (n, 1)
            rsi_norm[:n].reshape(-1, 1),    # RSI normalized (n, 1)
        ])

        return extended_features, labels, closes

    def get_status(self):
        """Return data source status."""
        return {
            'symbol': self.symbol,
            'timeframe': self.timeframe,
            'lookback': self.lookback,
            'exchange': self.exchange.id if self.exchange else 'none',
            'csv_exists': BTC_DATA_FILE.exists(),
            'csv_size': BTC_DATA_FILE.stat().st_size if BTC_DATA_FILE.exists() else 0,
            'cache_age_sec': round(time.time() - self.last_fetch_time, 1) if self.last_fetch_time > 0 else -1,
        }


# ============================================================================
# GPU Check (as requested in user plan)
# ============================================================================
def check_gpu():
    """Quick GPU availability check."""
    try:
        import torch
        if torch.cuda.is_available():
            name = torch.cuda.get_device_name(0)
            print(f'✅ GPU RTX 5070 Ti ready — device: {name}')
            return True
    except ImportError:
        pass
    print('⚠️ GPU not available — CPU mode')
    return False


if __name__ == '__main__':
    check_gpu()
    print()

    fetcher = DataFetcher()
    df = fetcher.fetch()

    if df is not None:
        print(f'\nData Summary:')
        print(f'  Candles: {len(df)}')
        print(f'  Time range: {df["timestamp"].iloc[0]} to {df["timestamp"].iloc[-1]}')
        print(f'  Price range: ${df["close"].min():.2f} - ${df["close"].max():.2f}')
        print(f'  Latest close: ${df["close"].iloc[-1]:.2f}')
        print(f'  Saved to: {BTC_DATA_FILE}')

        features, labels, prices = fetcher.get_features(df)
        print(f'\nFeatures: {features.shape} ({features.shape[1]} features × {features.shape[0]} samples)')
        print(f'Labels: {labels.shape} (up: {labels.sum()}, down: {len(labels) - labels.sum()})')

    print(f'\nStatus: {json.dumps(fetcher.get_status(), indent=2)}')

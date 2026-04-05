"""
TURBO-BOT — Multi-Pair Data Downloader (PATCH #67)
Downloads historical kline data from Binance public API.
No authentication required.
"""

import os
import time
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta


BINANCE_API = 'https://api.binance.com/api/v3/klines'
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')

# Supported pairs for P#67 multi-pair
PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT']

# Timeframe mapping
TF_MAP = {
    '15m': '15m',
    '1h': '1h',
    '4h': '4h',
}


def download_klines(symbol, interval='15m', days=150, limit_per_request=1000):
    """
    Download kline data from Binance public API.
    
    Args:
        symbol: e.g. 'ETHUSDT'
        interval: '15m', '1h', '4h'
        days: number of days to download
        limit_per_request: max candles per request (Binance limit: 1000)
    
    Returns:
        pd.DataFrame with OHLCV data
    """
    end_time = int(datetime.now().timestamp() * 1000)
    start_time = int((datetime.now() - timedelta(days=days)).timestamp() * 1000)
    
    all_klines = []
    current_start = start_time
    
    while current_start < end_time:
        params = {
            'symbol': symbol,
            'interval': interval,
            'startTime': current_start,
            'endTime': end_time,
            'limit': limit_per_request,
        }
        
        try:
            resp = requests.get(BINANCE_API, params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            print(f"  ⚠️  Error downloading {symbol}: {e}")
            break
        
        if not data:
            break
            
        all_klines.extend(data)
        
        # Move start to after last candle
        last_close_time = data[-1][6]
        current_start = last_close_time + 1
        
        # Rate limit: max 10 requests/sec
        time.sleep(0.15)
    
    if not all_klines:
        return None
    
    # Parse into DataFrame
    df = pd.DataFrame(all_klines, columns=[
        'open_time', 'open', 'high', 'low', 'close', 'volume',
        'close_time', 'quote_volume', 'trades', 'taker_buy_base',
        'taker_buy_quote', 'ignore'
    ])
    
    # Convert types
    for col in ['open', 'high', 'low', 'close', 'volume']:
        df[col] = df[col].astype(float)
    
    # Set datetime index
    df['datetime'] = pd.to_datetime(df['open_time'], unit='ms')
    df = df.set_index('datetime')
    
    # Keep only OHLCV
    df = df[['open', 'high', 'low', 'close', 'volume']].copy()
    
    # Remove duplicates
    df = df[~df.index.duplicated(keep='first')]
    df = df.sort_index()
    
    return df


def add_indicators(df):
    """Add technical indicators required by the pipeline."""
    close = df['close']
    high = df['high']
    low = df['low']
    volume = df['volume']
    
    # EMAs
    df['ema_9'] = close.ewm(span=9, adjust=False).mean()
    df['ema_21'] = close.ewm(span=21, adjust=False).mean()
    df['ema_50'] = close.ewm(span=50, adjust=False).mean()
    df['sma_50'] = close.rolling(50).mean()
    df['sma_200'] = close.rolling(200).mean()
    
    # RSI
    delta = close.diff()
    gain = delta.where(delta > 0, 0).rolling(14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
    rs = gain / (loss + 1e-10)
    df['rsi_14'] = 100 - (100 / (1 + rs))
    
    # MACD
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    df['macd'] = ema12 - ema26
    df['macd_signal'] = df['macd'].ewm(span=9, adjust=False).mean()
    df['macd_hist'] = df['macd'] - df['macd_signal']
    
    # Bollinger Bands
    sma20 = close.rolling(20).mean()
    std20 = close.rolling(20).std()
    df['bb_upper'] = sma20 + 2 * std20
    df['bb_lower'] = sma20 - 2 * std20
    df['bb_pctb'] = (close - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'] + 1e-10)
    
    # ATR
    tr1 = high - low
    tr2 = abs(high - close.shift(1))
    tr3 = abs(low - close.shift(1))
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    df['atr'] = tr.rolling(14).mean()
    
    # ADX
    plus_dm = high.diff()
    minus_dm = -low.diff()
    plus_dm = plus_dm.where((plus_dm > minus_dm) & (plus_dm > 0), 0)
    minus_dm = minus_dm.where((minus_dm > plus_dm) & (minus_dm > 0), 0)
    
    atr14 = df['atr']
    plus_di = 100 * (plus_dm.rolling(14).mean() / (atr14 + 1e-10))
    minus_di = 100 * (minus_dm.rolling(14).mean() / (atr14 + 1e-10))
    dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di + 1e-10)
    df['adx'] = dx.rolling(14).mean()
    
    # Volume ratio
    vol_ma = volume.rolling(20).mean()
    df['volume_ratio'] = volume / (vol_ma + 1e-10)
    
    # SuperTrend (real Wilder ATR, period=10, multiplier=3, band continuity)
    st_period = 10
    st_mult = 3.0
    tr_h = high - low
    tr_hc = abs(high - close.shift(1))
    tr_lc = abs(low - close.shift(1))
    tr_all = pd.concat([tr_h, tr_hc, tr_lc], axis=1).max(axis=1)
    # Wilder smoothing for ATR
    st_atr = tr_all.ewm(alpha=1.0/st_period, min_periods=st_period, adjust=False).mean()
    mid = (high + low) / 2
    upper_band = (mid + st_mult * st_atr).values.copy()
    lower_band = (mid - st_mult * st_atr).values.copy()
    close_arr = close.values
    n = len(df)
    st_dir = np.zeros(n)
    for i in range(1, n):
        # Band continuity: bands only tighten, never widen
        if lower_band[i] < lower_band[i-1] and close_arr[i-1] > lower_band[i-1]:
            lower_band[i] = lower_band[i-1]
        if upper_band[i] > upper_band[i-1] and close_arr[i-1] < upper_band[i-1]:
            upper_band[i] = upper_band[i-1]
        # Direction flip
        if close_arr[i] > upper_band[i]:
            st_dir[i] = 1
        elif close_arr[i] < lower_band[i]:
            st_dir[i] = -1
        else:
            st_dir[i] = st_dir[i-1]
    df['supertrend_upper'] = upper_band
    df['supertrend_lower'] = lower_band
    df['supertrend_dir'] = st_dir
    
    # ROC
    df['roc_10'] = close.pct_change(10)
    
    # Fill NaN
    df = df.bfill().fillna(0)
    
    return df


def download_pair(symbol, timeframe='15m', days=150, force=False):
    """Download and save a single pair's data."""
    filename = f'{symbol.lower()}_{timeframe}.csv'
    filepath = os.path.join(DATA_DIR, filename)
    
    if os.path.exists(filepath) and not force:
        df = pd.read_csv(filepath, index_col='datetime', parse_dates=True)
        print(f"  ✅ {symbol} {timeframe}: {len(df)} candles (cached)")
        return df
    
    print(f"  📥 Downloading {symbol} {timeframe} ({days} days)...")
    df = download_klines(symbol, timeframe, days)
    
    if df is None or len(df) < 100:
        print(f"  ❌ Failed to download {symbol}")
        return None
    
    # Add indicators
    df = add_indicators(df)
    
    # Save
    os.makedirs(DATA_DIR, exist_ok=True)
    df.to_csv(filepath)
    print(f"  ✅ {symbol} {timeframe}: {len(df)} candles saved to {filepath}")
    
    return df


def download_all_pairs(timeframe='15m', days=150, force=False):
    """Download data for all supported pairs."""
    results = {}
    for symbol in PAIRS:
        if symbol == 'BTCUSDT' and not force:
            # BTC already exists, skip unless forced
            filepath = os.path.join(DATA_DIR, f'btcusdt_{timeframe}.csv')
            if os.path.exists(filepath):
                df = pd.read_csv(filepath, index_col='datetime', parse_dates=True)
                print(f"  ✅ {symbol} {timeframe}: {len(df)} candles (existing)")
                results[symbol] = df
                continue
        
        df = download_pair(symbol, timeframe, days, force)
        if df is not None:
            results[symbol] = df
    
    return results


def download_all_timeframes(pairs=None, timeframes=None, force=False):
    """
    PATCH #193: Download data for all pairs × all timeframes.
    
    Args:
        pairs: list of symbols (default: PAIRS)
        timeframes: list of TFs (default: ['15m', '1h', '4h'])
        force: re-download even if file exists
    """
    pairs = pairs or PAIRS
    timeframes = timeframes or ['15m', '1h', '4h']
    days_map = {'15m': 150, '1h': 365, '4h': 365}

    print(f"\n📥 Downloading {len(pairs)} pairs × {len(timeframes)} timeframes...")
    total = 0
    skipped = 0

    for symbol in pairs:
        for tf in timeframes:
            days = days_map.get(tf, 150)
            filepath = os.path.join(DATA_DIR, f'{symbol.lower()}_{tf}.csv')
            if os.path.exists(filepath) and not force:
                df = pd.read_csv(filepath, index_col='datetime', parse_dates=True)
                print(f"  ✅ {symbol} {tf}: {len(df)} candles (cached)")
                skipped += 1
                continue
            df = download_pair(symbol, tf, days=days, force=True)
            if df is not None:
                total += 1

    print(f"\n✅ Downloaded {total} new files, {skipped} cached")


if __name__ == '__main__':
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  TURBO-BOT — Multi-Pair Data Downloader (PATCH #193)        ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--pairs', nargs='+', default=PAIRS)
    parser.add_argument('--timeframe', default=None,
                        help='Single timeframe (default: all)')
    parser.add_argument('--timeframes', nargs='+', default=['15m', '1h', '4h'],
                        help='Multiple timeframes')
    parser.add_argument('--days', type=int, default=150)
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    
    if args.timeframe:
        # Single timeframe mode
        for symbol in args.pairs:
            download_pair(symbol, args.timeframe, args.days, args.force)
    else:
        # All timeframes mode
        download_all_timeframes(args.pairs, args.timeframes, args.force)

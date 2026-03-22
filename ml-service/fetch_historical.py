"""
📊 TURBO-BOT — Historical Data Fetcher
Fetches OHLCV data from OKX via ccxt for backtesting.

Usage:
    python3 fetch_historical.py

Output:
    ml-service/data/btcusdt_15m.csv
    ml-service/data/btcusdt_1h.csv
    ml-service/data/btcusdt_4h.csv
"""

import ccxt
import pandas as pd
import numpy as np
import time
import os
import sys

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')


def fetch_ohlcv(symbol='BTC/USDT', timeframe='15m', days=120, exchange_id='okx'):
    """
    Fetch OHLCV data from exchange.
    
    Args:
        symbol: Trading pair
        timeframe: Candle timeframe
        days: How many days of history to fetch
        exchange_id: Exchange to use
    
    Returns:
        pd.DataFrame with OHLCV data
    """
    print(f"📡 Fetching {symbol} {timeframe} data ({days} days) from {exchange_id}...")
    
    exchange = getattr(ccxt, exchange_id)({
        'enableRateLimit': True,
        'options': {'defaultType': 'spot'}
    })
    
    # Calculate how many candles we need
    timeframe_minutes = {
        '1m': 1, '5m': 5, '15m': 15, '30m': 30,
        '1h': 60, '4h': 240, '1d': 1440
    }
    minutes_per_candle = timeframe_minutes.get(timeframe, 15)
    total_candles = int(days * 24 * 60 / minutes_per_candle)
    
    # OKX max limit per request
    max_per_request = 100
    
    all_candles = []
    since = int((time.time() - days * 86400) * 1000)  # milliseconds
    
    fetched = 0
    retries = 0
    max_retries = 5
    
    while fetched < total_candles:
        try:
            candles = exchange.fetch_ohlcv(
                symbol, timeframe, since=since, limit=max_per_request
            )
            
            if not candles:
                break
            
            all_candles.extend(candles)
            fetched += len(candles)
            since = candles[-1][0] + 1  # Next millisecond after last candle
            
            # Progress
            if fetched % 500 == 0:
                print(f"   ... {fetched}/{total_candles} candles fetched")
            
            # Rate limit respect
            time.sleep(0.2)
            retries = 0
            
        except ccxt.RateLimitExceeded:
            retries += 1
            if retries > max_retries:
                print(f"⚠️ Max retries exceeded. Got {fetched} candles.")
                break
            wait = 2 ** retries
            print(f"   Rate limit hit, waiting {wait}s...")
            time.sleep(wait)
            
        except Exception as e:
            retries += 1
            if retries > max_retries:
                print(f"❌ Error: {e}. Got {fetched} candles.")
                break
            print(f"   Error: {e}, retrying ({retries}/{max_retries})...")
            time.sleep(2)
    
    if not all_candles:
        print("❌ No data fetched!")
        return pd.DataFrame()
    
    # Build DataFrame
    df = pd.DataFrame(
        all_candles,
        columns=['timestamp', 'open', 'high', 'low', 'close', 'volume']
    )
    
    # Remove duplicates (overlapping fetches)
    df = df.drop_duplicates(subset=['timestamp']).sort_values('timestamp').reset_index(drop=True)
    
    # Convert timestamp to datetime
    df['datetime'] = pd.to_datetime(df['timestamp'], unit='ms')
    df = df.set_index('datetime')
    
    print(f"✅ Fetched {len(df)} candles: {df.index[0]} → {df.index[-1]}")
    return df


def add_indicators(df):
    """Add technical indicators needed for backtesting."""
    close = df['close'].values
    high = df['high'].values
    low = df['low'].values
    volume = df['volume'].values
    n = len(close)
    
    # === SMA ===
    for period in [9, 20, 50, 200]:
        sma = pd.Series(close).rolling(period).mean().values
        df[f'sma_{period}'] = sma
    
    # === EMA ===
    for period in [9, 21, 50, 200]:
        ema = pd.Series(close).ewm(span=period, adjust=False).mean().values
        df[f'ema_{period}'] = ema
    
    # === RSI ===
    delta = pd.Series(close).diff()
    gain = delta.where(delta > 0, 0.0)
    loss = (-delta).where(delta < 0, 0.0)
    avg_gain = gain.ewm(com=13, adjust=False).mean()
    avg_loss = loss.ewm(com=13, adjust=False).mean()
    rs = avg_gain / (avg_loss + 1e-10)
    df['rsi_14'] = (100 - 100 / (1 + rs)).values
    
    # === MACD ===
    ema12 = pd.Series(close).ewm(span=12, adjust=False).mean()
    ema26 = pd.Series(close).ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    df['macd'] = macd_line.values
    df['macd_signal'] = signal_line.values
    df['macd_hist'] = (macd_line - signal_line).values
    
    # === Bollinger Bands ===
    sma20 = pd.Series(close).rolling(20).mean()
    std20 = pd.Series(close).rolling(20).std()
    df['bb_upper'] = (sma20 + 2 * std20).values
    df['bb_lower'] = (sma20 - 2 * std20).values
    df['bb_pctb'] = ((close - df['bb_lower'].values) / 
                      (df['bb_upper'].values - df['bb_lower'].values + 1e-10))
    
    # === ATR ===
    tr1 = high - low
    tr2 = np.abs(high - np.roll(close, 1))
    tr3 = np.abs(low - np.roll(close, 1))
    tr = np.maximum(tr1, np.maximum(tr2, tr3))
    tr[0] = tr1[0]
    atr = pd.Series(tr).ewm(span=14, adjust=False).mean().values
    df['atr'] = atr
    df['atr_pct'] = atr / close
    
    # === ADX ===
    df['adx'] = _compute_adx(high, low, close, period=14)
    
    # === Volume indicators ===
    vol_sma20 = pd.Series(volume).rolling(20).mean().values
    df['volume_ratio'] = volume / (vol_sma20 + 1e-10)
    
    # === Rate of Change ===
    df['roc_10'] = (close / np.roll(close, 10) - 1)
    df.loc[df.index[:10], 'roc_10'] = 0
    
    # === SuperTrend ===
    multiplier = 3.0
    hl2 = (high + low) / 2
    upper_band = hl2 + multiplier * atr
    lower_band = hl2 - multiplier * atr
    
    supertrend = np.zeros(n)
    direction = np.ones(n)  # 1 = up, -1 = down
    
    for i in range(1, n):
        if close[i] > upper_band[i - 1]:
            direction[i] = 1
        elif close[i] < lower_band[i - 1]:
            direction[i] = -1
        else:
            direction[i] = direction[i - 1]
            if direction[i] == 1 and lower_band[i] < lower_band[i - 1]:
                lower_band[i] = lower_band[i - 1]
            if direction[i] == -1 and upper_band[i] > upper_band[i - 1]:
                upper_band[i] = upper_band[i - 1]
        
        supertrend[i] = lower_band[i] if direction[i] == 1 else upper_band[i]
    
    df['supertrend'] = supertrend
    df['supertrend_dir'] = direction
    
    # Drop NaN rows from warmup
    df = df.dropna()
    
    return df


def _compute_adx(high, low, close, period=14):
    """Compute ADX with Wilder smoothing."""
    n = len(close)
    adx = np.zeros(n)
    
    plus_dm = np.zeros(n)
    minus_dm = np.zeros(n)
    tr = np.zeros(n)
    
    for i in range(1, n):
        up_move = high[i] - high[i - 1]
        down_move = low[i - 1] - low[i]
        
        plus_dm[i] = up_move if (up_move > down_move and up_move > 0) else 0
        minus_dm[i] = down_move if (down_move > up_move and down_move > 0) else 0
        
        tr[i] = max(high[i] - low[i],
                     abs(high[i] - close[i - 1]),
                     abs(low[i] - close[i - 1]))
    
    # Wilder smoothing
    smoothed_tr = np.zeros(n)
    smoothed_plus = np.zeros(n)
    smoothed_minus = np.zeros(n)
    
    smoothed_tr[period] = np.sum(tr[1:period + 1])
    smoothed_plus[period] = np.sum(plus_dm[1:period + 1])
    smoothed_minus[period] = np.sum(minus_dm[1:period + 1])
    
    for i in range(period + 1, n):
        smoothed_tr[i] = smoothed_tr[i - 1] - smoothed_tr[i - 1] / period + tr[i]
        smoothed_plus[i] = smoothed_plus[i - 1] - smoothed_plus[i - 1] / period + plus_dm[i]
        smoothed_minus[i] = smoothed_minus[i - 1] - smoothed_minus[i - 1] / period + minus_dm[i]
    
    plus_di = 100 * smoothed_plus / (smoothed_tr + 1e-10)
    minus_di = 100 * smoothed_minus / (smoothed_tr + 1e-10)
    
    dx = 100 * np.abs(plus_di - minus_di) / (plus_di + minus_di + 1e-10)
    
    # Smooth ADX
    adx[2 * period - 1] = np.mean(dx[period:2 * period])
    for i in range(2 * period, n):
        adx[i] = (adx[i - 1] * (period - 1) + dx[i]) / period
    
    return adx


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    
    timeframes = ['15m', '1h', '4h']
    days_map = {'15m': 150, '1h': 365, '4h': 365}
    
    for tf in timeframes:
        days = days_map[tf]
        print(f"\n{'='*60}")
        print(f"📊 Fetching BTC/USDT {tf} ({days} days)")
        print(f"{'='*60}")
        
        df = fetch_ohlcv('BTC/USDT', tf, days=days)
        
        if df.empty:
            print(f"❌ No data for {tf}, skipping...")
            continue
        
        # Add indicators
        df = add_indicators(df)
        
        # Save
        filename = f"btcusdt_{tf}.csv"
        filepath = os.path.join(DATA_DIR, filename)
        df.to_csv(filepath)
        print(f"💾 Saved {filepath} ({len(df)} rows)")
        
        # Stats
        print(f"   Date range: {df.index[0]} → {df.index[-1]}")
        print(f"   Price range: ${df['close'].min():.2f} → ${df['close'].max():.2f}")
        print(f"   Columns: {list(df.columns)}")
    
    print(f"\n🏁 Done! Data saved to {DATA_DIR}/")


if __name__ == '__main__':
    main()

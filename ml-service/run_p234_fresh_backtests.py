"""
P#234: Fresh Per-Pair Backtests with Own Candle Data
====================================================
PROBLEM: ETH, XRP candles stale (March 19), BTC stale (March 1).
         SOL and BNB are fresh (April 5) — skip download, backtest only.
         Each pair MUST use its own candle data. Never share candles between pairs.

FLOW:
  1. Download fresh candles for BNB, ETH, XRP (365 days, all TFs)
     - SOL already fresh (P#232 sweep)
     - BTC already has data (disabled but keep updated)
  2. Run walk-forward backtest per pair × per timeframe
  3. Rank and report
"""
import sys, os, json, time
import numpy as np
import pandas as pd

sys.path.insert(0, '.')

from backtest_pipeline.data_downloader import download_pair, add_indicators
from backtest_pipeline.walk_forward import walk_forward_backtest
import backtest_pipeline.pair_config as pair_config_mod

# ============================================================
# CONFIG
# ============================================================
ALL_PAIRS = ['SOLUSDT', 'BNBUSDT', 'ETHUSDT', 'XRPUSDT', 'BTCUSDT']
TIMEFRAMES = ['1h', '4h']

# Override capital allocation to test ALL pairs equally ($10k each)
# Without this, ETH/XRP/BTC get $0 capital and 0 trades
for pair in ALL_PAIRS:
    pair_config_mod.PAIR_CAPITAL_ALLOCATION[pair] = 0.20  # Equal 20% each
pair_config_mod.PORTFOLIO_CAPITAL = 50000  # $10k per pair at 20%
DAYS = 365  # 1 year of data

# Pairs that need fresh candle download (others already fresh)
# NOTE: Set to empty list after first successful download to skip re-downloading
PAIRS_TO_DOWNLOAD = []  # Already downloaded in run 1 — all fresh as of Apr 5

RESULTS_DIR = os.path.join(os.path.dirname(__file__), 'results')
os.makedirs(RESULTS_DIR, exist_ok=True)

# ============================================================
# PHASE 1: DOWNLOAD FRESH CANDLES
# ============================================================
print("=" * 70)
print("  PHASE 1: DOWNLOAD FRESH CANDLES")
print("=" * 70)

for pair in PAIRS_TO_DOWNLOAD:
    for tf in ['15m', '1h', '4h']:
        print(f"\n  📥 {pair} @ {tf}...")
        df = download_pair(pair, timeframe=tf, days=DAYS, force=True)
        if df is not None:
            print(f"     ✅ {len(df)} candles → {df.index[0]} to {df.index[-1]}")
        else:
            print(f"     ❌ FAILED — no data returned")

# Also refresh BNB and SOL (15m only — 1h/4h already fresh from sweeps)
for pair in ['BNBUSDT', 'SOLUSDT']:
    print(f"\n  📥 {pair} @ 15m (refresh)...")
    df = download_pair(pair, timeframe='15m', days=DAYS, force=True)
    if df is not None:
        print(f"     ✅ {len(df)} candles")

print("\n" + "=" * 70)
print("  PHASE 1 COMPLETE — Verifying data files")
print("=" * 70)

# Verify all files exist and show ranges
data_dir = os.path.join(os.path.dirname(__file__), 'data')
for pair in ALL_PAIRS:
    for tf in TIMEFRAMES:
        fpath = os.path.join(data_dir, f'{pair.lower()}_{tf}.csv')
        if os.path.exists(fpath):
            df = pd.read_csv(fpath, index_col='datetime', parse_dates=True)
            print(f"  ✅ {pair:10s} {tf:3s}: {len(df):5d} candles | {df.index[0].date()} → {df.index[-1].date()}")
        else:
            print(f"  ❌ {pair:10s} {tf:3s}: MISSING!")

# ============================================================
# PHASE 2: REGIME ANALYSIS (all pairs)
# ============================================================
print("\n" + "=" * 70)
print("  PHASE 2: REGIME ANALYSIS (per-pair)")
print("=" * 70)

regimes = {}
for pair in ALL_PAIRS:
    fpath = os.path.join(data_dir, f'{pair.lower()}_4h.csv')
    if not os.path.exists(fpath):
        print(f"  ⚠ {pair}: no 4h data, skipping")
        continue
    df = pd.read_csv(fpath, index_col='datetime', parse_dates=True)
    
    close = df['close']
    returns = close.pct_change().dropna()
    vol = returns.std() * np.sqrt(6 * 365)  # annualized from 4h
    adx_mean = df['adx'].mean() if 'adx' in df.columns else 0
    total_move = close.iloc[-1] - close.iloc[0]
    total_distance = close.diff().abs().sum()
    trend_eff = abs(total_move) / total_distance if total_distance > 0 else 0
    price_range = (close.max() - close.min()) / close.mean() * 100
    
    # Recent regime (last 30 days)
    df_recent = df[df.index >= (df.index[-1] - pd.Timedelta(days=30))]
    close_r = df_recent['close']
    returns_r = close_r.pct_change().dropna()
    vol_recent = returns_r.std() * np.sqrt(6 * 365)
    adx_recent = df_recent['adx'].mean() if 'adx' in df_recent.columns else 0
    
    regime = {
        'pair': pair,
        'full_vol_pct': round(vol, 1),
        'full_adx': round(adx_mean, 1),
        'full_trend_eff': round(trend_eff, 3),
        'full_price_range_pct': round(price_range, 1),
        'recent_vol_pct': round(vol_recent, 1),
        'recent_adx': round(adx_recent, 1),
        'price_start': round(close.iloc[0], 2),
        'price_end': round(close.iloc[-1], 2),
        'price_chg_pct': round((close.iloc[-1] / close.iloc[0] - 1) * 100, 1),
    }
    regimes[pair] = regime
    
    print(f"\n  [{pair}]")
    print(f"  Price:    ${close.iloc[0]:.2f} → ${close.iloc[-1]:.2f} ({regime['price_chg_pct']:+.1f}%)")
    print(f"  Vol:      {vol:.1f}% (full) | {vol_recent:.1f}% (30d)")
    print(f"  ADX:      {adx_mean:.1f} (full) | {adx_recent:.1f} (30d)")
    print(f"  Trend:    {trend_eff:.3f} eff | Range: {price_range:.1f}%")

# ============================================================
# PHASE 3: WALK-FORWARD BACKTESTS (per pair × per timeframe)
# ============================================================
print("\n" + "=" * 70)
print("  PHASE 3: WALK-FORWARD BACKTESTS")
print("=" * 70)
sys.stdout.flush()

# Use threading with timeout (avoids Windows multiprocessing bootstrapping issue)
import threading

TIMEOUT_PER_BACKTEST = 600  # 10 minutes max per pair×tf

def _run_backtest_thread(pair, tf, result_holder):
    """Worker thread."""
    try:
        result = walk_forward_backtest(symbol=pair, timeframe=tf)
        result_holder['result'] = result
    except Exception as e:
        result_holder['result'] = {'error': str(e)}

all_results = []
for pair in ALL_PAIRS:
    for tf in TIMEFRAMES:
        label = f"{pair} @ {tf}"
        print(f"\n  >> Running: {label}...", flush=True)
        t0 = time.time()
        
        result_holder = {}
        t = threading.Thread(target=_run_backtest_thread, args=(pair, tf, result_holder))
        t.start()
        t.join(timeout=TIMEOUT_PER_BACKTEST)
        elapsed = time.time() - t0
        
        if t.is_alive():
            print(f"    TIMEOUT after {elapsed:.0f}s — skipping (thread may leak)", flush=True)
            all_results.append({
                'pair': pair,
                'timeframe': tf,
                'label': label,
                'error': f'TIMEOUT after {elapsed:.0f}s',
            })
            # Can't kill threads in Python, but timeout will let us continue
            continue
        
        result = result_holder.get('result', {'error': 'No result returned'})
        
        if 'error' in result:
            print(f"    ERROR: {result['error']}", flush=True)
            all_results.append({
                'pair': pair,
                'timeframe': tf,
                'label': label,
                'error': result['error'],
            })
            continue
        
        agg = result.get('aggregate', {})
        pnl = agg.get('net_profit', 0)
        trades = agg.get('trades', 0)
        wr = agg.get('win_rate', 0)
        sharpe = agg.get('sharpe', 0)
        pf = agg.get('profit_factor', 0)
        max_dd = agg.get('max_drawdown', 0)
        
        entry = {
            'pair': pair,
            'timeframe': tf,
            'label': label,
            'pnl': round(pnl, 2),
            'trades': trades,
            'win_rate': round(wr, 1),
            'sharpe': round(sharpe, 3),
            'profit_factor': round(pf, 3),
            'max_dd_pct': round(max_dd, 2),
            'elapsed_sec': round(elapsed, 1),
        }
        all_results.append(entry)
        
        pnl_str = f"+${pnl:.0f}" if pnl >= 0 else f"-${abs(pnl):.0f}"
        print(f"    OK {pnl_str} | {trades} trades | WR={wr:.1f}% | Sharpe={sharpe:.2f} | PF={pf:.2f} | ({elapsed:.0f}s)", flush=True)

# ============================================================
# PHASE 4: RANKING
# ============================================================
print("\n" + "=" * 70)
print("  PHASE 4: RANKING")
print("=" * 70)

valid = [r for r in all_results if 'error' not in r]
valid.sort(key=lambda x: x['pnl'], reverse=True)

print(f"\n  {'Rank':<5} {'Label':<20} {'PnL':>10} {'Trades':>7} {'WR%':>7} {'Sharpe':>8} {'PF':>7}")
print("  " + "-" * 70)
for i, r in enumerate(valid, 1):
    pnl_str = f"+${r['pnl']:.0f}" if r['pnl'] >= 0 else f"-${abs(r['pnl']):.0f}"
    print(f"  {i:<5} {r['label']:<20} {pnl_str:>10} {r['trades']:>7} {r['win_rate']:>6.1f}% {r['sharpe']:>8.2f} {r['pf'] if 'pf' in r else r.get('profit_factor', 0):>7.2f}")

# Errors
errors = [r for r in all_results if 'error' in r]
if errors:
    print(f"\n  WARNING: {len(errors)} failed:")
    for e in errors:
        print(f"    {e['label']}: {e['error']}")

# Best per-pair
print("\n  BEST PER PAIR:")
print("  " + "-" * 50)
for pair in ALL_PAIRS:
    pair_results = [r for r in valid if r['pair'] == pair]
    if pair_results:
        best = max(pair_results, key=lambda x: x['pnl'])
        pnl_str = f"+${best['pnl']:.0f}" if best['pnl'] >= 0 else f"-${abs(best['pnl']):.0f}"
        verdict = "EDGE" if best['pnl'] > 0 and best.get('profit_factor', 0) > 1.0 else "NO EDGE"
        print(f"  {pair:10s} {best['timeframe']:3s} -> {pnl_str:>8} | Sharpe={best['sharpe']:.2f} | PF={best.get('profit_factor', 0):.2f} | {verdict}")
    else:
        print(f"  {pair:10s} — no results")

# ============================================================
# SAVE
# ============================================================
output = {
    'timestamp': pd.Timestamp.now().isoformat(),
    'regimes': regimes,
    'results': all_results,
    'ranked': [r['label'] for r in valid],
}

out_path = os.path.join(RESULTS_DIR, 'p234_fresh_backtests.json')
with open(out_path, 'w') as f:
    json.dump(output, f, indent=2, default=str)
print(f"\n  💾 Saved: {out_path}")

total_elapsed = sum(r.get('elapsed_sec', 0) for r in all_results)
print(f"\n  ⏱ Total elapsed: {total_elapsed:.0f}s")
print("\n  DONE ✅")

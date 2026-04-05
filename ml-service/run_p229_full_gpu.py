"""
P#229 Full GPU Backtest — Fresh SOL+BNB candles (April 2026)
Validates P#229 portfolio: SOL 65% + BNB 35% on $10k
Uses per-pair candles (no BTC contamination).
"""
import sys
import time
import json

sys.path.insert(0, '.')

from pathlib import Path
from backtest_pipeline.pair_config import (
    get_active_pairs, PAIR_CAPITAL_ALLOCATION, PORTFOLIO_CAPITAL,
)
from backtest_pipeline.walk_forward import walk_forward_multi_pair

print("=" * 70)
print("  P#229 FULL GPU BACKTEST — FRESH DATA (April 2026)")
print(f"  Active Pairs: {get_active_pairs()}")
for sym in get_active_pairs():
    pct = PAIR_CAPITAL_ALLOCATION.get(sym, 0) * 100
    print(f"    {sym}: {pct:.0f}%")
print(f"  Capital: ${PORTFOLIO_CAPITAL:,}")
print("=" * 70)

# Verify candle data is per-pair
import pandas as pd
for sym in get_active_pairs():
    sym_lower = sym.lower()
    df = pd.read_csv(f'data/{sym_lower}_4h.csv', index_col='datetime', parse_dates=True)
    last_close = df['close'].iloc[-1]
    print(f"  [DATA] {sym} 4h: {len(df)} candles | Last: {df.index[-1]} | Close: ${last_close:.2f}")
print()

t0 = time.time()

# Run walk-forward on 4h (P#229 primary timeframe)
result_4h = walk_forward_multi_pair(timeframe='4h', verbose=True)

# Also run on 1h for comparison
print("\n" + "=" * 70)
print("  COMPARISON: 1h timeframe")
print("=" * 70)
result_1h = walk_forward_multi_pair(timeframe='1h', verbose=True)

elapsed = time.time() - t0

print(f"\n{'='*70}")
print(f"  FINAL SUMMARY")
print(f"{'='*70}")
print(f"  4h Portfolio PnL: ${result_4h['portfolio_pnl']:+,.2f}")
print(f"  4h Trades:        {result_4h['portfolio_trades']}")
print(f"  4h Sharpe:        {result_4h['aggregate']['sharpe']:.2f}")
print(f"  4h Max DD:        {result_4h['aggregate']['max_drawdown']:.1f}%")
print(f"  ---")
print(f"  1h Portfolio PnL: ${result_1h['portfolio_pnl']:+,.2f}")
print(f"  1h Trades:        {result_1h['portfolio_trades']}")
print(f"  1h Sharpe:        {result_1h['aggregate']['sharpe']:.2f}")
print(f"  1h Max DD:        {result_1h['aggregate']['max_drawdown']:.1f}%")
print(f"  ---")
print(f"  Elapsed: {elapsed:.0f}s")
print(f"{'='*70}")

# Save results
out = Path('results/p229_full_gpu_april2026.json')
out.parent.mkdir(parents=True, exist_ok=True)
with open(out, 'w') as f:
    json.dump({
        'run_date': time.strftime('%Y-%m-%d %H:%M'),
        'data_freshness': 'April 2026',
        'config': {'SOL': 0.65, 'BNB': 0.35, 'capital': PORTFOLIO_CAPITAL},
        '4h': result_4h,
        '1h': result_1h,
        'elapsed_sec': elapsed,
    }, f, indent=2, default=str)
print(f"\nSaved: {out}")

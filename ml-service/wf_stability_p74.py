"""P#74 Walk-Forward + Stability Test"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from backtest_pipeline import config
from backtest_pipeline.runner import run_walk_forward, run_multi_pair

# FAST XGBoost — 2.5× faster
config.XGBOOST_RETRAIN_INTERVAL = config.XGBOOST_RETRAIN_INTERVAL_FAST

print("=" * 80)
print("  PHASE 1: WALK-FORWARD VALIDATION (70/30 split)")
print("=" * 80)
train_results, test_results = run_walk_forward(timeframe='15m', train_pct=0.70)

print("\n\n" + "=" * 80)
print("  PHASE 2: STABILITY TEST (3 consecutive runs)")
print("=" * 80)

totals = []
for i in range(3):
    print(f"\n  --- Run {i+1}/3 ---")
    results = run_multi_pair(verbose=False, show_trades=False)
    total_pnl = sum(
        r.get('net_profit', 0) + r.get('funding_arb_pnl', 0)
        for r in results.values() if not r.get('error')
    )
    totals.append(total_pnl)
    print(f"  Run {i+1}: ${total_pnl:+.2f}")

print(f"\n  STABILITY SUMMARY:")
print(f"  Runs: {['${:.2f}'.format(t) for t in totals]}")
mean_pnl = sum(totals) / len(totals)
variance = max(totals) - min(totals)
variance_pct = (variance / mean_pnl * 100) if mean_pnl > 0 else 0
print(f"  Mean: ${mean_pnl:.2f} | Range: ${variance:.2f} | Variance: {variance_pct:.1f}%")
if variance_pct < 5:
    print(f"  ✅ STABLE — < 5% variance")
elif variance_pct < 10:
    print(f"  ⚠️  ACCEPTABLE — < 10% variance")
else:
    print(f"  ❌ UNSTABLE — {variance_pct:.1f}% variance")

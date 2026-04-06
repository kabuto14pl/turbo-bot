"""
P#239: Walk-forward validation of V3 winning config.
Config: conf=0.42, SL=2.0, TP=6.0, trail=0.2, risk=0.08, $10k
Full backtest: $7,227 (217 trades, 63.6% WR, PF=1.214, DD=21.4%)
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backtest_pipeline.walk_forward import walk_forward_backtest

V3_CONFIG = {
    'GPU_NATIVE_MIN_CONFIDENCE': 0.42,
    'SL_ATR_MULT': 1.75,
    'TP_ATR_MULT': 6.0,
    'RISK_PER_TRADE': 0.18,
    'TRAILING_DISTANCE_ATR': 0.6,
}

print("=" * 100)
print("P#239: Walk-Forward Validation of V3 Winning Config")
print(f"Config: {V3_CONFIG}")
print("=" * 100)

result = walk_forward_backtest('SOLUSDT', '4h', overrides=V3_CONFIG)

print("\n" + "=" * 100)
print("WALK-FORWARD RESULTS")
print("=" * 100)

agg = result.get('aggregate', {})
windows = result.get('windows', [])

print(f"\n  Windows: {len(windows)}")
print(f"  Total OOS trades: {agg.get('trades', 0)}")
print(f"  OOS Net PnL: ${agg.get('net_profit', 0):+.2f}")
print(f"  OOS Win Rate: {agg.get('win_rate', 0):.1f}%")
print(f"  OOS Profit Factor: {agg.get('profit_factor', 0):.3f}")
print(f"  OOS Sharpe: {agg.get('sharpe', 0):+.2f}")
print(f"  OOS Max Drawdown: {agg.get('max_drawdown', 0):.1f}%")
print(f"  Total Fees: ${agg.get('total_fees', 0):.2f}")

print("\n  Per-window breakdown:")
for i, w in enumerate(windows):
    m = w.get('metrics', {})
    emoji = '✅' if m.get('net_profit', 0) > 0 else '❌'
    train_start = w.get('train_start', '?')
    test_end = w.get('test_end', '?')
    print(f"    {emoji} W{i+1}: {train_start} → {test_end} | "
          f"PnL=${m.get('net_profit', 0):>+8.2f} | T={m.get('trades', 0):>3} "
          f"WR={m.get('win_rate', 0):>5.1f}% PF={m.get('profit_factor', 0):.3f}")

# Pass/fail criteria
oos_trades = agg.get('trades', 0)
oos_pf = agg.get('profit_factor', 0)
oos_sharpe = agg.get('sharpe', 0)
positive_windows = sum(1 for w in windows if w.get('metrics', {}).get('net_profit', 0) > 0)

print(f"\n  VALIDATION CHECKS:")
print(f"    OOS trades >= 50: {'✅' if oos_trades >= 50 else '❌'} ({oos_trades})")
print(f"    OOS PF > 1.0: {'✅' if oos_pf > 1.0 else '❌'} ({oos_pf:.3f})")
print(f"    OOS Sharpe > 0: {'✅' if oos_sharpe > 0 else '❌'} ({oos_sharpe:+.2f})")
print(f"    >50% positive windows: {'✅' if positive_windows > len(windows)/2 else '❌'} ({positive_windows}/{len(windows)})")

all_pass = oos_trades >= 50 and oos_pf > 1.0 and oos_sharpe > 0 and positive_windows > len(windows)/2
print(f"\n  OVERALL: {'✅ PASS' if all_pass else '❌ FAIL'}")
print("=" * 100)

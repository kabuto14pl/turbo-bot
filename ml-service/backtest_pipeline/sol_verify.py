"""Quick verification of P#239 final config."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backtest_pipeline.sol_tuner import run_sol_backtest, extract_metrics

ov = {
    'GPU_NATIVE_MIN_CONFIDENCE': 0.42,
    'SL_ATR_MULT': 1.75,
    'TP_ATR_MULT': 6.0,
    'RISK_PER_TRADE': 0.06,
    'TRAILING_DISTANCE_ATR': 0.6,
}

res = run_sol_backtest(ov, capital=10000)
m = extract_metrics(res)

print(f"\nP#239 FINAL VERIFICATION:")
print(f"  PnL: ${m['pnl']:+.2f}")
print(f"  Trades: {m['trades']}, WR: {m['win_rate']:.1f}%, PF: {m['profit_factor']:.3f}")
print(f"  Sharpe: {m['sharpe']:+.2f}, DD: {m['max_drawdown']:.1f}%")
print(f"  Funding: ${m['funding_pnl']:+.2f}, Trading: ${m['net_profit']:+.2f}")
print(f"  Target $1,500: {'✅ HIT' if m['pnl'] >= 1500 else '❌ NOT HIT'}")

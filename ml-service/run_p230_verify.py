"""P#230 Portfolio Verification — SOL 55% + BNB 25% + XRP 20% on 4h"""
import sys, time, json
sys.path.insert(0, '.')
from pathlib import Path
from backtest_pipeline.pair_config import (
    get_active_pairs, PAIR_CAPITAL_ALLOCATION, PORTFOLIO_CAPITAL,
)
from backtest_pipeline.walk_forward import walk_forward_multi_pair

print("=" * 70)
print("  P#230 PORTFOLIO VERIFICATION")
print(f"  SOL {PAIR_CAPITAL_ALLOCATION['SOLUSDT']*100:.0f}% + BNB {PAIR_CAPITAL_ALLOCATION['BNBUSDT']*100:.0f}% + XRP {PAIR_CAPITAL_ALLOCATION['XRPUSDT']*100:.0f}%")
print(f"  Capital: ${PORTFOLIO_CAPITAL:,}")
print("=" * 70)

result = walk_forward_multi_pair(timeframe='4h', verbose=True)

total_pnl = result['portfolio_pnl']
total_trades = result['portfolio_trades']

print(f"\n  vs P#229:  $+2,070 (SOL 65% + BNB 35%)")
delta = total_pnl - 2070
print(f"  Delta:     ${delta:+,.0f} ({delta/2070*100:+.1f}%)")

out = Path('results/p230_portfolio_verify.json')
out.parent.mkdir(parents=True, exist_ok=True)
with open(out, 'w') as f:
    json.dump(result, f, indent=2, default=str)
print(f"\nSaved: {out}")

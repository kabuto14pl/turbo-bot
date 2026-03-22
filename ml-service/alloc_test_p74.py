"""P#74 SOL 60% Allocation Test — compare 3 variants."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from backtest_pipeline import pair_config, config
from backtest_pipeline.runner import run_multi_pair

# FAST XGBoost — 2.5× faster (28 vs 70 retrains)
config.XGBOOST_RETRAIN_INTERVAL = config.XGBOOST_RETRAIN_INTERVAL_FAST

variants = [
    ('A: SOL55/BNB25 (current)', {'SOLUSDT': 0.55, 'BNBUSDT': 0.25, 'BTCUSDT': 0.07, 'ETHUSDT': 0.07, 'XRPUSDT': 0.06}),
    ('B: SOL60/BNB20',           {'SOLUSDT': 0.60, 'BNBUSDT': 0.20, 'BTCUSDT': 0.07, 'ETHUSDT': 0.07, 'XRPUSDT': 0.06}),
    ('C: SOL65/BNB15',           {'SOLUSDT': 0.65, 'BNBUSDT': 0.15, 'BTCUSDT': 0.07, 'ETHUSDT': 0.07, 'XRPUSDT': 0.06}),
]

original_alloc = dict(pair_config.PAIR_CAPITAL_ALLOCATION)
summary = []

for name, alloc in variants:
    pair_config.PAIR_CAPITAL_ALLOCATION = alloc
    results = run_multi_pair(verbose=False, show_trades=False)
    
    total_pnl = 0
    sol_pnl = 0
    bnb_pnl = 0
    for sym, r in results.items():
        if r.get('error'):
            continue
        pnl = r.get('net_profit', 0) + r.get('funding_arb_pnl', 0)
        total_pnl += pnl
        if sym == 'SOLUSDT':
            sol_pnl = pnl
        elif sym == 'BNBUSDT':
            bnb_pnl = pnl
    
    summary.append((name, total_pnl, sol_pnl, bnb_pnl))

# Restore
pair_config.PAIR_CAPITAL_ALLOCATION = original_alloc

print("\n" + "="*75)
print("  ALLOCATION COMPARISON — P#74 SOL 60% Study")
print("="*75)
print(f"  {'Variant':<30} {'Total PnL':>10} {'SOL PnL':>10} {'BNB PnL':>10}")
print(f"  {'-'*65}")
for name, total, sol, bnb in summary:
    marker = " ★" if total == max(s[1] for s in summary) else ""
    print(f"  {name:<30} ${total:>+9.2f} ${sol:>+9.2f} ${bnb:>+9.2f}{marker}")
print(f"  {'-'*65}")
print(f"  Delta B-A: ${summary[1][1]-summary[0][1]:+.2f} | Delta C-A: ${summary[2][1]-summary[0][1]:+.2f}")

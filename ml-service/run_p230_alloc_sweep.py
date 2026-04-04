"""P#230 Allocation Sweep — find optimal SOL+BNB+XRP split"""
import sys, time, json
sys.path.insert(0, '.')
from pathlib import Path
from backtest_pipeline import pair_config
from backtest_pipeline.walk_forward import walk_forward_multi_pair

ALLOCATIONS = [
    {'label': 'P#229 baseline', 'SOL': 0.65, 'BNB': 0.35, 'XRP': 0.00},
    {'label': 'SOL55+BNB25+XRP20', 'SOL': 0.55, 'BNB': 0.25, 'XRP': 0.20},
    {'label': 'SOL50+BNB30+XRP20', 'SOL': 0.50, 'BNB': 0.30, 'XRP': 0.20},
    {'label': 'SOL55+BNB30+XRP15', 'SOL': 0.55, 'BNB': 0.30, 'XRP': 0.15},
    {'label': 'SOL60+BNB25+XRP15', 'SOL': 0.60, 'BNB': 0.25, 'XRP': 0.15},
    {'label': 'SOL50+BNB25+XRP25', 'SOL': 0.50, 'BNB': 0.25, 'XRP': 0.25},
    {'label': 'SOL60+BNB20+XRP20', 'SOL': 0.60, 'BNB': 0.20, 'XRP': 0.20},
]

results = []

for alloc in ALLOCATIONS:
    label = alloc['label']
    print(f"\n{'='*70}")
    print(f"  {label} (SOL={alloc['SOL']:.0%} BNB={alloc['BNB']:.0%} XRP={alloc['XRP']:.0%})")
    print(f"{'='*70}")
    
    # Patch allocations
    pair_config.PAIR_CAPITAL_ALLOCATION['SOLUSDT'] = alloc['SOL']
    pair_config.PAIR_CAPITAL_ALLOCATION['BNBUSDT'] = alloc['BNB']
    pair_config.PAIR_CAPITAL_ALLOCATION['XRPUSDT'] = alloc['XRP']
    
    active = [p for p, a in pair_config.PAIR_CAPITAL_ALLOCATION.items() if a > 0]
    
    t0 = time.time()
    r = walk_forward_multi_pair(timeframe='4h', pairs=active, verbose=True)
    elapsed = time.time() - t0
    
    total = r['portfolio_pnl']
    trades = r['portfolio_trades']
    
    per_pair = {}
    for sym, pr in r.get('per_pair', {}).items():
        a = pr.get('aggregate', {})
        per_pair[sym] = a.get('net_profit', 0)
    
    results.append({
        'label': label,
        'alloc': {k: v for k, v in alloc.items() if k != 'label'},
        'total': total,
        'trades': trades,
        'per_pair': per_pair,
        'elapsed': elapsed,
    })
    
    print(f"  => TOTAL: ${total:+,.0f} | {trades} trades | {elapsed:.0f}s")

# Summary
print(f"\n\n{'='*70}")
print(f"  P#230 ALLOCATION SWEEP SUMMARY")
print(f"{'='*70}")
print(f"  {'Label':<25s} {'Total':>10s} {'Trades':>7s} {'SOL':>8s} {'BNB':>8s} {'XRP':>8s}")
print(f"  {'-'*25} {'-'*10} {'-'*7} {'-'*8} {'-'*8} {'-'*8}")
for r in sorted(results, key=lambda x: x['total'], reverse=True):
    pp = r['per_pair']
    sol_v = pp.get('SOLUSDT', 0)
    bnb_v = pp.get('BNBUSDT', 0)
    xrp_v = pp.get('XRPUSDT', 0)
    print(f"  {r['label']:<25s} ${r['total']:>+9,.0f} {r['trades']:>7} ${sol_v:>+7,.0f} ${bnb_v:>+7,.0f} ${xrp_v:>+7,.0f}")

out = Path('results/p230_alloc_sweep.json')
out.parent.mkdir(parents=True, exist_ok=True)
with open(out, 'w') as f:
    json.dump(results, f, indent=2, default=str)
print(f"\nSaved: {out}")

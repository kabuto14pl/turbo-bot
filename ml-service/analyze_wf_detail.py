"""Detailed per-window analysis for WF optimization loop."""
import json, sys
fn = sys.argv[1] if len(sys.argv) > 1 else 'results/p225/walk_forward_4h_1775219806.json'
with open(fn) as f:
    d = json.load(f)

print(f'=== DETAILED WF ANALYSIS: {d.get("timeframe","?")} ===')
print(f'Portfolio: ${d["portfolio_pnl"]:+,.2f} | {d["portfolio_trades"]} trades | Fees ${d["portfolio_fees"]:,.2f}')
agg = d['aggregate']
print(f'WR {agg["win_rate"]}% | Sharpe {agg["sharpe"]} | DD ${agg["max_drawdown"]:,.2f}')
print()

for pair, pd_ in d['per_pair'].items():
    a = pd_['aggregate']
    gross = a['net_profit'] + a['total_fees']
    print(f'\n{"="*60}')
    print(f'{pair}: Net ${a["net_profit"]:+,.2f} | Fees ${a["total_fees"]:,.2f} | Gross ${gross:+,.2f}')
    print(f'  Trades: {a["trades"]} | WR {a["win_rate"]:.1f}% | PF {a["profit_factor"]:.3f} | Sharpe {a["sharpe"]:.3f}')
    print(f'  AvgWin: ${a["avg_win"]:.2f} | AvgLoss: ${a["avg_loss"]:.2f} | DD ${a["max_drawdown"]:,.2f}')
    print(f'  Fee/Trade: ${a["total_fees"]/max(a["trades"],1):.2f}')
    print()
    
    wins = 0
    losses = 0
    for w in pd_.get('windows', []):
        status = '✅' if w['net_profit'] > 0 else '❌'
        print(f'  W{w["window"]:2d} {status} ${w["net_profit"]:+8.2f} | {w["trades"]:2d} tr | WR {w["win_rate"]:5.1f}% | PF {w["profit_factor"]:.3f} | Sh {w["sharpe"]:+7.3f} | DD ${w["max_drawdown"]:6.2f} | Fee ${w["total_fees"]:.2f} | {w["train_period"]} → {w["test_period"]}')
        if w['net_profit'] > 0:
            wins += 1
        elif w['trades'] > 0:
            losses += 1
    print(f'  Window W/L: {wins}/{losses} ({wins/(wins+losses)*100:.0f}% hit rate)' if wins+losses > 0 else '')
    
    # Identify worst windows
    worst = sorted([w for w in pd_.get('windows', []) if w['trades'] > 0], key=lambda x: x['net_profit'])
    if worst:
        w = worst[0]
        print(f'  WORST WINDOW: W{w["window"]} ${w["net_profit"]:+.2f} | WR {w["win_rate"]:.1f}% | Test {w["test_period"]}')

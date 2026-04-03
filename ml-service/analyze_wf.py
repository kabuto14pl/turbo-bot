import json, sys
fn = sys.argv[1] if len(sys.argv) > 1 else 'results/p225/walk_forward_4h_1775218861.json'
with open(fn) as f:
    d = json.load(f)
print('=== WALK-FORWARD RESULTS:', d.get('timeframe','?'), '===')
print('Portfolio: $%+.2f | %d trades | Fees $%.2f' % (d['portfolio_pnl'], d['portfolio_trades'], d['portfolio_fees']))
agg = d['aggregate']
print('WR %.1f%% | Sharpe %.3f | DD $%.2f' % (agg['win_rate'], agg['sharpe'], agg['max_drawdown']))
print()
for pair, pd_ in d['per_pair'].items():
    a = pd_['aggregate']
    gross = a['net_profit'] + a['total_fees']
    print('%s: Net $%+.2f | Fees $%.2f | Gross $%+.2f | %d trades | WR %.1f%% | PF %.3f | Sharpe %.3f' % (
        pair, a['net_profit'], a['total_fees'], gross, a['trades'], a['win_rate'], a['profit_factor'], a['sharpe']))
tg = sum(pd_['aggregate']['net_profit'] + pd_['aggregate']['total_fees'] for pd_ in d['per_pair'].values())
print('\nTotal Gross: $%+.2f | Total Fees: $%+.2f' % (tg, d['portfolio_fees']))

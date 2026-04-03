"""Quick result parser."""
import json, sys
f = sys.argv[1]
with open(f) as fh:
    data = json.load(fh)
agg = data.get('aggregate', {})
print("PORTFOLIO TOTAL: ${:+,.2f} | {} trades | PF {:.2f} | Sharpe {:.3f}".format(
    agg.get('net_profit',0), agg.get('trades',0), agg.get('profit_factor',0), agg.get('sharpe',0)))
print("Keys:", list(data.keys()))
pr = data.get('pair_results', {})
print("Pairs:", list(pr.keys()))
for pair, pd in pr.items():
    short = pair.replace('USDT','')
    net = pd.get('net_profit', 0)
    trades = pd.get('trades', 0)
    wr = pd.get('win_rate', 0)
    pf = pd.get('profit_factor', 0)
    sharpe = pd.get('sharpe', 0)
    fees = pd.get('total_fees', 0)
    dd = pd.get('max_drawdown', 0)
    st = 'OK' if net > 0 else 'XX'
    print("  [{}] {:5s}: ${:+10,.2f} | {:4d} trd | WR {:5.1f}% | PF {:5.2f} | Sharpe {:6.2f} | fees ${:,.0f} | DD ${:,.0f}".format(
        st, short, net, trades, wr, pf, sharpe, fees, dd))

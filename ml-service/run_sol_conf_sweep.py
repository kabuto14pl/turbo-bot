"""Quick SOL confidence sweep on 4h."""
import json

def run(pair, tf, gpu_conf=None, capital=10000):
    from backtest_pipeline import pair_config, config
    from backtest_pipeline.walk_forward import walk_forward_multi_pair
    orig_alloc = dict(pair_config.PAIR_CAPITAL_ALLOCATION)
    orig_capital = pair_config.PORTFOLIO_CAPITAL
    orig_conf = config.GPU_NATIVE_MIN_CONFIDENCE
    for p in pair_config.PAIR_CAPITAL_ALLOCATION:
        pair_config.PAIR_CAPITAL_ALLOCATION[p] = 1.0 if p == pair else 0.0
    pair_config.PORTFOLIO_CAPITAL = capital
    if gpu_conf is not None:
        config.GPU_NATIVE_MIN_CONFIDENCE = gpu_conf
    try:
        result = walk_forward_multi_pair(timeframe=tf, pairs=[pair], verbose=False)
    finally:
        pair_config.PAIR_CAPITAL_ALLOCATION = orig_alloc
        pair_config.PORTFOLIO_CAPITAL = orig_capital
        config.GPU_NATIVE_MIN_CONFIDENCE = orig_conf
    pd = result.get('pair_results', {}).get(pair, {})
    agg = result.get('aggregate', {})
    src = pd or agg
    return {
        'net': src.get('net_profit', 0),
        'trades': src.get('trades', 0),
        'wr': src.get('win_rate', 0),
        'pf': src.get('profit_factor', 0),
        'sharpe': src.get('sharpe', 0),
        'fees': src.get('total_fees', 0),
        'dd': src.get('max_drawdown', 0),
    }

print("SOL@4h confidence sweep:")
for conf in [0.60, 0.65, 0.70, 0.75]:
    r = run('SOLUSDT', '4h', gpu_conf=conf)
    st = 'OK' if r['net'] > 0 else 'XX'
    print(f"  [{st}] conf={conf}: ${r['net']:+,.0f} | {r['trades']} trd | WR {r['wr']:.1f}% | Sharpe {r['sharpe']:.2f} | fees ${r['fees']:,.0f} | DD ${r['dd']:,.0f}")

# Also test BNB conf=0.70 with capital scaling
print("\nBNB@4h conf=0.70 capital scaling:")
for cap in [5000, 3000, 2000]:
    r = run('BNBUSDT', '4h', gpu_conf=0.70, capital=cap)
    st = 'OK' if r['net'] > 0 else 'XX'
    print(f"  [{st}] $${cap}: ${r['net']:+,.0f} | {r['trades']} trd | WR {r['wr']:.1f}% | Sharpe {r['sharpe']:.2f} | fees ${r['fees']:,.0f}")

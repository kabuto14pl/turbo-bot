"""P#229 Portfolio optimizer — test different SOL/BNB splits and confs."""
import json, time
from pathlib import Path

RESULTS_DIR = Path('results/p229_screening')
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def run_portfolio(sol_pct, bnb_pct, sol_conf, bnb_conf, xrp_pct=0.0, capital=10000):
    from backtest_pipeline import pair_config, config
    from backtest_pipeline.walk_forward import walk_forward_multi_pair
    
    orig_alloc = dict(pair_config.PAIR_CAPITAL_ALLOCATION)
    orig_capital = pair_config.PORTFOLIO_CAPITAL
    orig_sol_ov = dict(pair_config.PAIR_OVERRIDES.get('SOLUSDT', {}))
    orig_bnb_ov = dict(pair_config.PAIR_OVERRIDES.get('BNBUSDT', {}))
    
    pair_config.PAIR_CAPITAL_ALLOCATION = {
        'BTCUSDT': 0.0, 'ETHUSDT': 0.0,
        'SOLUSDT': sol_pct, 'BNBUSDT': bnb_pct, 'XRPUSDT': xrp_pct,
    }
    pair_config.PORTFOLIO_CAPITAL = capital
    pair_config.PAIR_OVERRIDES['SOLUSDT']['GPU_NATIVE_MIN_CONFIDENCE'] = sol_conf
    pair_config.PAIR_OVERRIDES['BNBUSDT']['GPU_NATIVE_MIN_CONFIDENCE'] = bnb_conf
    
    pairs = [p for p, a in pair_config.PAIR_CAPITAL_ALLOCATION.items() if a > 0]
    
    try:
        result = walk_forward_multi_pair(timeframe='4h', pairs=pairs, verbose=False)
    except Exception as e:
        print("  ERROR:", e)
        result = {'error': str(e)}
    finally:
        pair_config.PAIR_CAPITAL_ALLOCATION = orig_alloc
        pair_config.PORTFOLIO_CAPITAL = orig_capital
        pair_config.PAIR_OVERRIDES['SOLUSDT'] = orig_sol_ov
        pair_config.PAIR_OVERRIDES['BNBUSDT'] = orig_bnb_ov
    
    pp = result.get('per_pair', {})
    agg = result.get('aggregate', {})
    pair_nets = {}
    for pair, pd in pp.items():
        pa = pd.get('aggregate', {})
        pair_nets[pair.replace('USDT','')] = pa.get('net_profit', 0)
    
    return {
        'net': agg.get('net_profit', 0),
        'trades': agg.get('trades', 0),
        'sharpe': agg.get('sharpe', 0),
        'fees': result.get('portfolio_fees', 0),
        'pairs': pair_nets,
    }


def main():
    tests = [
        # (label, sol%, bnb%, sol_conf, bnb_conf, xrp%)
        ('SOL65_BNB35_c65_c70', 0.65, 0.35, 0.65, 0.70, 0.0),
        ('SOL65_BNB35_c65_c75', 0.65, 0.35, 0.65, 0.75, 0.0),
        ('SOL70_BNB30_c65_c75', 0.70, 0.30, 0.65, 0.75, 0.0),
        ('SOL80_BNB20_c65_c75', 0.80, 0.20, 0.65, 0.75, 0.0),
        ('SOL60_BNB40_c65_c75', 0.60, 0.40, 0.65, 0.75, 0.0),
        ('SOL50_BNB50_c65_c75', 0.50, 0.50, 0.65, 0.75, 0.0),
        ('SOL100_c65',          1.00, 0.00, 0.65, 0.70, 0.0),
        ('SOL55_BNB35_XRP10',   0.55, 0.35, 0.65, 0.75, 0.10),
    ]
    
    print("=" * 90)
    print("  P#229 PORTFOLIO OPTIMIZATION — SOL + BNB splits @ different confs")
    print("=" * 90)
    
    results = {}
    for label, sol, bnb, sc, bc, xrp in tests:
        t = time.time()
        r = run_portfolio(sol, bnb, sc, bc, xrp)
        elapsed = time.time() - t
        results[label] = r
        st = 'OK' if r['net'] > 0 else 'XX'
        pairs_str = ' | '.join("{}:${:+,.0f}".format(k, v) for k, v in r['pairs'].items())
        print("[{}] {:35s}: ${:+8,.0f} | {:3d} trd | Sharpe {:5.2f} | fees ${:,.0f} | {} | {:.0f}s".format(
            st, label, r['net'], r['trades'], r['sharpe'], r['fees'], pairs_str, elapsed))
    
    # Find best
    best_label = max(results, key=lambda k: results[k]['net'])
    best = results[best_label]
    print("\n>>> BEST: {} -> ${:+,.0f} (Sharpe {:.2f})".format(best_label, best['net'], best['sharpe']))
    
    out = RESULTS_DIR / 'portfolio_opt_{}.json'.format(int(time.time()))
    with open(out, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    print("Saved:", out)


if __name__ == '__main__':
    main()

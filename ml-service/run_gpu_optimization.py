"""
P#229 GPU-Native Level Optimization — modify confidence/cooldown for each pair.
These params control MLP signal filtering, unlike pair_config which only changes exits.
"""
import json
import time
from pathlib import Path

RESULTS_DIR = Path('results/p229_screening')
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def run_with_gpu_config(pair, tf, gpu_conf=None, gpu_cooldown=None, capital=10000):
    """Run WF with modified GPU_NATIVE settings."""
    from backtest_pipeline import pair_config, config
    from backtest_pipeline.walk_forward import walk_forward_multi_pair
    
    orig_alloc = dict(pair_config.PAIR_CAPITAL_ALLOCATION)
    orig_capital = pair_config.PORTFOLIO_CAPITAL
    orig_conf = config.GPU_NATIVE_MIN_CONFIDENCE
    orig_cool = dict(config.GPU_NATIVE_COOLDOWN_CANDLES)
    
    for p in pair_config.PAIR_CAPITAL_ALLOCATION:
        pair_config.PAIR_CAPITAL_ALLOCATION[p] = 1.0 if p == pair else 0.0
    pair_config.PORTFOLIO_CAPITAL = capital
    
    if gpu_conf is not None:
        config.GPU_NATIVE_MIN_CONFIDENCE = gpu_conf
    if gpu_cooldown is not None:
        config.GPU_NATIVE_COOLDOWN_CANDLES[tf] = gpu_cooldown
    
    try:
        result = walk_forward_multi_pair(timeframe=tf, pairs=[pair], verbose=True)
    except Exception as e:
        print(f"  ERROR: {e}")
        result = {'error': str(e)}
    finally:
        pair_config.PAIR_CAPITAL_ALLOCATION = orig_alloc
        pair_config.PORTFOLIO_CAPITAL = orig_capital
        config.GPU_NATIVE_MIN_CONFIDENCE = orig_conf
        config.GPU_NATIVE_COOLDOWN_CANDLES = orig_cool
    
    pair_data = result.get('pair_results', {}).get(pair, {})
    agg = result.get('aggregate', {})
    src = pair_data or agg
    return {
        'net': src.get('net_profit', 0),
        'trades': src.get('trades', 0),
        'wr': src.get('win_rate', 0),
        'pf': src.get('profit_factor', 0),
        'sharpe': src.get('sharpe', 0),
        'dd': src.get('max_drawdown', 0),
        'fees': src.get('total_fees', 0),
    }


def main():
    results = {}
    
    # =====================================================================
    # BNB @ 4h — try higher confidence + cooldown to reduce fee drag
    # Baseline: 153 trades, -$105, fees $535 (gross +$429)
    # If we halve trades with higher conf → fees $268, gross maybe +$300 → net +$32?
    # =====================================================================
    print("=" * 80)
    print("  BNB @ 4h — GPU-NATIVE optimization (conf + cooldown)")
    print("=" * 80)
    
    tests = [
        ('baseline',     {'pair': 'BNBUSDT', 'tf': '4h'}),
        ('conf_0.65',    {'pair': 'BNBUSDT', 'tf': '4h', 'gpu_conf': 0.65}),
        ('conf_0.70',    {'pair': 'BNBUSDT', 'tf': '4h', 'gpu_conf': 0.70}),
        ('conf_0.75',    {'pair': 'BNBUSDT', 'tf': '4h', 'gpu_conf': 0.75}),
        ('cool_4',       {'pair': 'BNBUSDT', 'tf': '4h', 'gpu_cooldown': 4}),
        ('cool_6',       {'pair': 'BNBUSDT', 'tf': '4h', 'gpu_cooldown': 6}),
        ('conf70_cool4', {'pair': 'BNBUSDT', 'tf': '4h', 'gpu_conf': 0.70, 'gpu_cooldown': 4}),
    ]
    
    results['BNB_4h'] = {}
    for name, kwargs in tests:
        print(f"\n  --- BNB@4h [{name}] ---")
        t = time.time()
        r = run_with_gpu_config(**kwargs)
        elapsed = time.time() - t
        results['BNB_4h'][name] = r
        status = "OK" if r['net'] > 0 else "XX"
        print(f"  [{status}] {name:18s}: ${r['net']:+8,.0f} | {r['trades']:>4} trd | "
              f"WR {r['wr']:5.1f}% | PF {r['pf']:5.2f} | Fees ${r['fees']:,.0f} | {elapsed:.0f}s")
    
    # =====================================================================
    # BTC @ 1h — try higher confidence + cooldown
    # Baseline: 249 trades, -$86, fees $206 (gross +$120)
    # =====================================================================
    print("\n" + "=" * 80)
    print("  BTC @ 1h — GPU-NATIVE optimization (conf + cooldown)")
    print("=" * 80)
    
    tests = [
        ('baseline',     {'pair': 'BTCUSDT', 'tf': '1h'}),
        ('conf_0.65',    {'pair': 'BTCUSDT', 'tf': '1h', 'gpu_conf': 0.65}),
        ('conf_0.70',    {'pair': 'BTCUSDT', 'tf': '1h', 'gpu_conf': 0.70}),
        ('cool_18',      {'pair': 'BTCUSDT', 'tf': '1h', 'gpu_cooldown': 18}),
        ('cool_24',      {'pair': 'BTCUSDT', 'tf': '1h', 'gpu_cooldown': 24}),
        ('conf70_cool18',{'pair': 'BTCUSDT', 'tf': '1h', 'gpu_conf': 0.70, 'gpu_cooldown': 18}),
    ]
    
    results['BTC_1h'] = {}
    for name, kwargs in tests:
        print(f"\n  --- BTC@1h [{name}] ---")
        t = time.time()
        r = run_with_gpu_config(**kwargs)
        elapsed = time.time() - t
        results['BTC_1h'][name] = r
        status = "OK" if r['net'] > 0 else "XX"
        print(f"  [{status}] {name:18s}: ${r['net']:+8,.0f} | {r['trades']:>4} trd | "
              f"WR {r['wr']:5.1f}% | PF {r['pf']:5.2f} | Fees ${r['fees']:,.0f} | {elapsed:.0f}s")
    
    # =====================================================================
    # ETH @ 1h — optimize further
    # =====================================================================
    print("\n" + "=" * 80)
    print("  ETH @ 1h — GPU-NATIVE optimization")
    print("=" * 80)
    
    tests = [
        ('baseline',     {'pair': 'ETHUSDT', 'tf': '1h'}),
        ('conf_0.65',    {'pair': 'ETHUSDT', 'tf': '1h', 'gpu_conf': 0.65}),
        ('conf_0.70',    {'pair': 'ETHUSDT', 'tf': '1h', 'gpu_conf': 0.70}),
        ('cool_18',      {'pair': 'ETHUSDT', 'tf': '1h', 'gpu_cooldown': 18}),
        ('conf65_cool18',{'pair': 'ETHUSDT', 'tf': '1h', 'gpu_conf': 0.65, 'gpu_cooldown': 18}),
    ]
    
    results['ETH_1h'] = {}
    for name, kwargs in tests:
        print(f"\n  --- ETH@1h [{name}] ---")
        t = time.time()
        r = run_with_gpu_config(**kwargs)
        elapsed = time.time() - t
        results['ETH_1h'][name] = r
        status = "OK" if r['net'] > 0 else "XX"
        print(f"  [{status}] {name:18s}: ${r['net']:+8,.0f} | {r['trades']:>4} trd | "
              f"WR {r['wr']:5.1f}% | PF {r['pf']:5.2f} | Fees ${r['fees']:,.0f} | {elapsed:.0f}s")

    # =====================================================================
    # SOL @ 4h — test conf adjustments (try 0.55 for more trades)
    # =====================================================================
    print("\n" + "=" * 80)
    print("  SOL @ 4h — GPU-NATIVE optimization")
    print("=" * 80)
    
    tests = [
        ('baseline',     {'pair': 'SOLUSDT', 'tf': '4h'}),
        ('conf_0.55',    {'pair': 'SOLUSDT', 'tf': '4h', 'gpu_conf': 0.55}),
        ('cool_1',       {'pair': 'SOLUSDT', 'tf': '4h', 'gpu_cooldown': 1}),
    ]
    
    results['SOL_4h'] = {}
    for name, kwargs in tests:
        print(f"\n  --- SOL@4h [{name}] ---")
        t = time.time()
        r = run_with_gpu_config(**kwargs)
        elapsed = time.time() - t
        results['SOL_4h'][name] = r
        status = "OK" if r['net'] > 0 else "XX"
        print(f"  [{status}] {name:18s}: ${r['net']:+8,.0f} | {r['trades']:>4} trd | "
              f"WR {r['wr']:5.1f}% | PF {r['pf']:5.2f} | Fees ${r['fees']:,.0f} | {elapsed:.0f}s")

    # FINAL SUMMARY
    print("\n\n" + "=" * 80)
    print("  FINAL OPTIMIZATION MATRIX")
    print("=" * 80)
    for section, configs in results.items():
        best_name = max(configs, key=lambda k: configs[k]['net'])
        best = configs[best_name]
        status = "OK" if best['net'] > 0 else "XX"
        print(f"  [{status}] {section:10s} best={best_name:18s}: ${best['net']:+8,.0f} | "
              f"{best['trades']:>4} trd | PF {best['pf']:5.2f} | Sharpe {best['sharpe']:6.2f}")
    
    out_file = RESULTS_DIR / f'gpu_optimization_{int(time.time())}.json'
    with open(out_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\nSaved: {out_file}")


if __name__ == '__main__':
    main()

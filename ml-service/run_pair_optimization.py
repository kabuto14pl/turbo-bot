"""
P#229 Pair Optimization — Test different configs for ETH@1h and BNB@1h/4h.
Modifies pair_config overrides temporarily to find optimal settings.
"""
import json
import time
import sys
from pathlib import Path

RESULTS_DIR = Path('results/p229_screening')
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def run_pair_tf(pair, tf, overrides_patch=None, capital=10000):
    """Run WF for single pair with optional config patch."""
    import importlib
    from backtest_pipeline import pair_config, config
    from backtest_pipeline.walk_forward import walk_forward_multi_pair
    
    # Save originals
    orig_alloc = dict(pair_config.PAIR_CAPITAL_ALLOCATION)
    orig_capital = pair_config.PORTFOLIO_CAPITAL
    orig_overrides = dict(pair_config.PAIR_OVERRIDES.get(pair, {}))
    
    # Set 100% allocation
    for p in pair_config.PAIR_CAPITAL_ALLOCATION:
        pair_config.PAIR_CAPITAL_ALLOCATION[p] = 1.0 if p == pair else 0.0
    pair_config.PORTFOLIO_CAPITAL = capital
    
    # Apply patches 
    if overrides_patch:
        current = pair_config.PAIR_OVERRIDES.get(pair, {})
        current.update(overrides_patch)
        pair_config.PAIR_OVERRIDES[pair] = current
    
    try:
        result = walk_forward_multi_pair(timeframe=tf, pairs=[pair], verbose=True)
    except Exception as e:
        print(f"  ERROR: {e}")
        result = {'error': str(e)}
    finally:
        # Restore
        pair_config.PAIR_CAPITAL_ALLOCATION = orig_alloc
        pair_config.PORTFOLIO_CAPITAL = orig_capital
        pair_config.PAIR_OVERRIDES[pair] = orig_overrides
    
    # Extract metrics
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
    # ETH OPTIMIZATION @ 1h — current: +$105 with conservative settings
    # =====================================================================
    print("=" * 80)
    print("  ETH OPTIMIZATION @ 1h")
    print("=" * 80)
    
    eth_configs = {
        'baseline': {},
        'risk_boost': {
            'RISK_PER_TRADE': 0.020,  # 0.006 → 0.020
        },
        'risk_boost_directional': {
            'RISK_PER_TRADE': 0.020,
            'DIRECTIONAL_ENABLED': True,  # Re-enable directional
        },
        'aggressive': {
            'RISK_PER_TRADE': 0.030,
            'DIRECTIONAL_ENABLED': True,
            'SL_ATR_MULT': 1.50,
            'TP_ATR_MULT': 3.00,
        },
        'grid_v2': {
            'RISK_PER_TRADE': 0.020,
            'GRID_V2_ENABLED': True,
            'GRID_V2_ALLOWED_TIMEFRAMES': ['1h'],
        },
    }
    
    results['ETH_1h'] = {}
    for name, patch in eth_configs.items():
        print(f"\n  --- ETH@1h [{name}] ---")
        t = time.time()
        r = run_pair_tf('ETHUSDT', '1h', patch)
        elapsed = time.time() - t
        results['ETH_1h'][name] = r
        status = "OK" if r['net'] > 0 else "XX"
        print(f"  [{status}] ETH@1h [{name}]: ${r['net']:+,.2f} | {r['trades']} trades | "
              f"WR {r['wr']:.1f}% | PF {r['pf']:.2f} | Sharpe {r['sharpe']:.2f} | "
              f"Fees ${r['fees']:,.0f} | {elapsed:.0f}s")
    
    # =====================================================================
    # BNB OPTIMIZATION @ 4h — current: -$105 (close to breakeven)
    # =====================================================================
    print("\n" + "=" * 80)
    print("  BNB OPTIMIZATION @ 4h")
    print("=" * 80)
    
    bnb_configs = {
        'baseline': {},
        'risk_boost': {
            'RISK_PER_TRADE': 0.025,  # 0.014 → 0.025
        },
        'tighter_sl': {
            'RISK_PER_TRADE': 0.020,
            'SL_ATR_MULT': 1.25,
            'TP_ATR_MULT': 3.00,
        },
        'wider_tp': {
            'RISK_PER_TRADE': 0.020,
            'TP_ATR_MULT': 3.50,
            'TRAILING_DISTANCE_ATR': 0.80,
        },
        'directional_off': {
            'RISK_PER_TRADE': 0.020,
            'DIRECTIONAL_ENABLED': False,
        },
    }
    
    results['BNB_4h'] = {}
    for name, patch in bnb_configs.items():
        print(f"\n  --- BNB@4h [{name}] ---")
        t = time.time()
        r = run_pair_tf('BNBUSDT', '4h', patch)
        elapsed = time.time() - t
        results['BNB_4h'][name] = r
        status = "OK" if r['net'] > 0 else "XX"
        print(f"  [{status}] BNB@4h [{name}]: ${r['net']:+,.2f} | {r['trades']} trades | "
              f"WR {r['wr']:.1f}% | PF {r['pf']:.2f} | Sharpe {r['sharpe']:.2f} | "
              f"Fees ${r['fees']:,.0f} | {elapsed:.0f}s")

    # =====================================================================
    # BTC OPTIMIZATION @ 1h — current: -$86 (very close to breakeven)
    # =====================================================================
    print("\n" + "=" * 80)
    print("  BTC OPTIMIZATION @ 1h")
    print("=" * 80)
    
    btc_configs = {
        'baseline': {},
        'risk_boost': {
            'RISK_PER_TRADE': 0.015,
            'DIRECTIONAL_ENABLED': True,
        },
        'higher_conf': {
            'RISK_PER_TRADE': 0.020,
            'CONFIDENCE_FLOOR': 0.45,
            'DIRECTIONAL_ENABLED': True,
        },
        'tighter_sl': {
            'RISK_PER_TRADE': 0.020,
            'SL_ATR_MULT': 1.25,
            'TP_ATR_MULT': 3.00,
        },
    }
    
    results['BTC_1h'] = {}
    for name, patch in btc_configs.items():
        print(f"\n  --- BTC@1h [{name}] ---")
        t = time.time()
        r = run_pair_tf('BTCUSDT', '1h', patch)
        elapsed = time.time() - t
        results['BTC_1h'][name] = r
        status = "OK" if r['net'] > 0 else "XX"
        print(f"  [{status}] BTC@1h [{name}]: ${r['net']:+,.2f} | {r['trades']} trades | "
              f"WR {r['wr']:.1f}% | PF {r['pf']:.2f} | Sharpe {r['sharpe']:.2f} | "
              f"Fees ${r['fees']:,.0f} | {elapsed:.0f}s")

    # =====================================================================
    # SUMMARY
    # =====================================================================
    print("\n" + "=" * 80)
    print("  OPTIMIZATION SUMMARY")
    print("=" * 80)
    
    for section, configs in results.items():
        print(f"\n  {section}:")
        best_name = None
        best_net = float('-inf')
        for name, r in configs.items():
            status = "OK" if r['net'] > 0 else "XX"
            print(f"    [{status}] {name:25s}: ${r['net']:+8,.0f} | {r['trades']:>4} trades | "
                  f"WR {r['wr']:5.1f}% | PF {r['pf']:5.2f} | Sharpe {r['sharpe']:6.2f}")
            if r['net'] > best_net:
                best_net = r['net']
                best_name = name
        print(f"    >>> BEST: {best_name} (${best_net:+,.0f})")
    
    out_file = RESULTS_DIR / f'optimization_{int(time.time())}.json'
    with open(out_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\nSaved: {out_file}")


if __name__ == '__main__':
    main()

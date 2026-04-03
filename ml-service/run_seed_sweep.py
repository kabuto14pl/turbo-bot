"""
P#228: Multi-seed sweep — run WF with different seeds to measure MLP stochasticity.
Finds the median result across seeds (not the best — avoids data-mining bias).

Usage:
    cd ml-service
    python run_seed_sweep.py --tf 4h --seeds 5
"""
import argparse
import json
import time
from pathlib import Path

RESULTS_DIR = Path('results/p225')
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def run_one_seed(seed, tf: str):
    """Run walk-forward with a specific RANDOM_SEED (or None for natural randomness)."""
    from backtest_pipeline import config
    from backtest_pipeline.walk_forward import walk_forward_multi_pair
    from backtest_pipeline.pair_config import get_active_pairs

    # Override seed
    original_seed = getattr(config, 'RANDOM_SEED', None)
    config.RANDOM_SEED = seed

    pairs = get_active_pairs()
    result = walk_forward_multi_pair(timeframe=tf, pairs=pairs, verbose=True)

    # Restore
    config.RANDOM_SEED = original_seed
    return result


def main():
    parser = argparse.ArgumentParser(description='P#228 Seed Sweep')
    parser.add_argument('--tf', default='4h', help='Timeframe')
    parser.add_argument('--seeds', type=int, default=5, help='Number of seeds/runs')
    parser.add_argument('--no-seed', action='store_true', help='Run N times without fixed seed (natural randomness)')
    args = parser.parse_args()

    if args.no_seed:
        seed_list = [None] * args.seeds  # Run N times without seed
    else:
        seed_list = [42, 123, 456, 789, 1337, 2024, 7777, 31415, 99999, 54321][:args.seeds]

    results = []
    for i, seed in enumerate(seed_list):
        print(f"\n{'#'*90}")
        print(f"  SEED SWEEP {i+1}/{len(seed_list)}: RANDOM_SEED={seed if seed is not None else 'None (natural)'}")
        print(f"{'#'*90}")

        r = run_one_seed(seed, args.tf)
        agg = r.get('aggregate', {})
        net = agg.get('net_profit', 0)
        pf = agg.get('profit_factor', 0)
        sharpe = agg.get('sharpe', 0)
        trades = agg.get('total_trades', 0)

        # Per-pair breakdown
        pair_results = {}
        for sym, sym_data in r.get('pairs', {}).items():
            pair_agg = sym_data.get('aggregate', {})
            pair_results[sym] = {
                'net': pair_agg.get('net_profit', 0),
                'pf': pair_agg.get('profit_factor', 0),
                'sharpe': pair_agg.get('sharpe', 0),
                'trades': pair_agg.get('total_trades', 0),
            }

        entry = {
            'seed': seed if seed is not None else f'run_{i+1}',
            'net': net,
            'pf': pf,
            'sharpe': sharpe,
            'trades': trades,
            'pairs': pair_results,
        }
        results.append(entry)
        print(f"\n  Seed {seed}: Net=${net:+,.2f} | PF {pf:.3f} | Sharpe {sharpe:.3f} | {trades} trades")
        for sym, pr in pair_results.items():
            print(f"    {sym}: ${pr['net']:+,.2f} | PF {pr['pf']:.3f} | {pr['trades']} trades")

    # Summary
    print(f"\n{'='*90}")
    print(f"  SEED SWEEP SUMMARY — {args.tf} ({len(results)} seeds)")
    print(f"{'='*90}")
    print(f"  {'Seed':>8} {'Net':>10} {'PF':>8} {'Sharpe':>8} {'Trades':>8}")
    print(f"  {'─'*8} {'─'*10} {'─'*8} {'─'*8} {'─'*8}")
    for r in sorted(results, key=lambda x: x['net'], reverse=True):
        marker = '✅' if r['net'] > 0 else '❌'
        print(f"  {marker} {r['seed']:>6} ${r['net']:>+9,.2f} {r['pf']:>8.3f} {r['sharpe']:>8.3f} {r['trades']:>8}")

    nets = [r['net'] for r in results]
    avg_net = sum(nets) / len(nets)
    sorted_nets = sorted(nets)
    median_net = sorted_nets[len(sorted_nets) // 2]
    positive = sum(1 for n in nets if n > 0)

    print(f"\n  Average: ${avg_net:+,.2f} | Median: ${median_net:+,.2f}")
    print(f"  Positive: {positive}/{len(nets)} ({100*positive/len(nets):.0f}%)")
    print(f"  Range: ${min(nets):+,.2f} .. ${max(nets):+,.2f}")

    if positive >= len(nets) * 0.6:
        print(f"  ✅ ROBUST — {positive}/{len(nets)} seeds profitable")
    else:
        print(f"  ⚠️  NOT ROBUST — only {positive}/{len(nets)} seeds profitable")

    # Save
    out_file = RESULTS_DIR / f'seed_sweep_{args.tf}_{int(time.time())}.json'
    with open(out_file, 'w') as f:
        json.dump({'config_snapshot': {'ensemble_weight': 0.50, 'sl_atr': 1.50},
                   'results': results,
                   'summary': {'avg_net': avg_net, 'median_net': median_net,
                              'positive_ratio': positive / len(nets)}},
                  f, indent=2, default=str)
    print(f"\n📁 Sweep saved: {out_file}")


if __name__ == '__main__':
    main()

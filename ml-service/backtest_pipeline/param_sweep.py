"""
P#222: Iterative Parameter Sweep for GPU Native Engine.

Runs backtest with different parameter combinations to find optimal settings.
Designed to run on Windows with RTX 5070 Ti GPU.

Usage:
    python -m backtest_pipeline.param_sweep --pair SOLUSDT --tf 4h
    python -m backtest_pipeline.param_sweep --pair SOLUSDT --tf 4h --quick
    python -m backtest_pipeline.param_sweep --all-pairs --tf 4h
"""
import argparse
import itertools
import json
import os
import sys
import time
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backtest_pipeline import config
from backtest_pipeline.runner import (
    build_engine, load_pair_data, apply_pair_overrides,
    restore_config, get_pair_capital, get_active_pairs,
    apply_timeframe_overrides, restore_timeframe_overrides,
)

# ── Parameter Grid ──────────────────────────────────────────────────
PARAM_GRID_FULL = {
    'GPU_NATIVE_BREAKEVEN_R':     [None, 0.6, 0.7, 0.8, 0.9, 1.0],
    'GPU_NATIVE_LONG_CONF_ADD':   [0.0, 0.03, 0.05, 0.08, 0.10],
    'GPU_NATIVE_BLOCK_HV_15M':    [True, False],
    'GPU_NATIVE_DISABLE_TIME_UW': [True, False],
    'GPU_NATIVE_COOLDOWN_CANDLES': [
        {'15m': 12, '1h': 6, '4h': 3},   # baseline
        {'15m': 24, '1h': 8, '4h': 3},    # P#222
        {'15m': 36, '1h': 12, '4h': 4},   # conservative
    ],
}

PARAM_GRID_QUICK = {
    'GPU_NATIVE_BREAKEVEN_R':     [None, 0.7, 0.8, 1.0],
    'GPU_NATIVE_LONG_CONF_ADD':   [0.0, 0.05, 0.10],
    'GPU_NATIVE_BLOCK_HV_15M':    [True, False],
    'GPU_NATIVE_DISABLE_TIME_UW': [True, False],
}


def _set_param(name, value):
    """Set a config parameter, handling special types."""
    if name == 'GPU_NATIVE_COOLDOWN_CANDLES' and isinstance(value, dict):
        setattr(config, name, value)
    elif value is None and name == 'GPU_NATIVE_BREAKEVEN_R':
        # None means disable BE (set to attribute-missing state)
        if hasattr(config, name):
            delattr(config, name)
    else:
        setattr(config, name, value)


def _get_combo_label(combo: dict) -> str:
    parts = []
    for k, v in combo.items():
        short = k.replace('GPU_NATIVE_', '').replace('_CANDLES', '')
        if isinstance(v, dict):
            parts.append(f"{short}={list(v.values())}")
        elif v is None:
            parts.append(f"{short}=off")
        elif isinstance(v, bool):
            parts.append(f"{short}={'Y' if v else 'N'}")
        else:
            parts.append(f"{short}={v}")
    return ' | '.join(parts)


def run_sweep(pair: str, tf: str, grid: dict, verbose: bool = False):
    """Run parameter sweep for a single pair+TF combination."""
    param_names = list(grid.keys())
    param_values = list(grid.values())
    combos = list(itertools.product(*param_values))
    total = len(combos)

    print(f"\n{'═'*100}")
    print(f"  🔬 PARAMETER SWEEP — {pair} @ {tf}")
    print(f"     {total} combinations | Params: {', '.join(param_names)}")
    print(f"{'═'*100}\n")

    # Load data once
    df = load_pair_data(pair, tf)
    if df is None:
        print(f"  ❌ No data for {pair} @ {tf}")
        return []

    # Apply pair and TF overrides
    pair_originals = apply_pair_overrides(pair)
    tf_originals = apply_timeframe_overrides(tf)
    pair_capital = get_pair_capital(pair)

    # Save original config values
    originals = {}
    for name in param_names:
        originals[name] = getattr(config, name, None)

    results_list = []
    t0 = time.time()

    for idx, values in enumerate(combos, 1):
        combo = dict(zip(param_names, values))

        # Apply params
        for name, val in combo.items():
            _set_param(name, val)

        label = _get_combo_label(combo)
        elapsed = time.time() - t0
        eta = (elapsed / idx * (total - idx)) if idx > 1 else 0

        print(f"  [{idx}/{total}] {label}  (ETA {eta:.0f}s)", end='', flush=True)

        try:
            engine = build_engine(
                initial_capital=pair_capital,
                symbol=pair,
                quantum_backend='simulated',
            )
            res = engine.run(df, tf)

            net = res.get('net_profit', 0)
            trades = res.get('total_trades', 0)
            wr = res.get('win_rate', 0)
            pf = res.get('profit_factor', 0)
            dd = res.get('max_drawdown', 0)
            sharpe = res.get('sharpe_ratio', 0)
            rr = res.get('risk_reward_ratio', 0)

            emoji = '✅' if net > 0 else '❌'
            print(f"  → {emoji} ${net:+.2f} | {trades}t | WR {wr:.1f}% | PF {pf:.2f} | DD {dd:.1f}%")

            results_list.append({
                'params': combo.copy(),
                'label': label,
                'net_profit': net,
                'trades': trades,
                'win_rate': wr,
                'profit_factor': pf,
                'max_drawdown': dd,
                'sharpe': sharpe,
                'risk_reward': rr,
            })
        except Exception as e:
            print(f"  → 💥 ERROR: {e}")
            results_list.append({
                'params': combo.copy(),
                'label': label,
                'net_profit': float('-inf'),
                'error': str(e),
            })

    # Restore original config
    for name, val in originals.items():
        if val is None:
            if hasattr(config, name):
                delattr(config, name)
        else:
            setattr(config, name, val)
    restore_config(pair_originals)
    restore_timeframe_overrides(tf_originals)

    # Sort by net profit
    results_list.sort(key=lambda x: x.get('net_profit', float('-inf')), reverse=True)

    elapsed_total = time.time() - t0
    print(f"\n{'═'*100}")
    print(f"  📊 SWEEP RESULTS — {pair} @ {tf} — {total} combos in {elapsed_total:.0f}s")
    print(f"{'═'*100}")
    print(f"  {'#':>3} {'Net Profit':>12} {'Trades':>7} {'WR%':>6} {'PF':>6} {'DD%':>6} {'Sharpe':>7} | Parameters")
    print(f"  {'─'*3} {'─'*12} {'─'*7} {'─'*6} {'─'*6} {'─'*6} {'─'*7} + {'─'*60}")

    for rank, r in enumerate(results_list[:20], 1):
        if 'error' in r:
            print(f"  {rank:>3} {'ERROR':>12} {'':>7} {'':>6} {'':>6} {'':>6} {'':>7} | {r['label']}")
        else:
            net = r['net_profit']
            emoji = '🏆' if rank <= 3 else ('✅' if net > 0 else '  ')
            print(f"  {emoji}{rank:>2} ${net:>+10.2f} {r['trades']:>7} {r['win_rate']:>5.1f}% {r['profit_factor']:>5.2f} "
                  f"{r['max_drawdown']:>5.1f}% {r.get('sharpe', 0):>6.2f} | {r['label']}")

    # Save to JSON
    out_dir = Path(__file__).resolve().parent.parent / 'results' / 'param_sweeps'
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = time.strftime('%Y%m%d_%H%M%S')
    out_file = out_dir / f'sweep_{pair}_{tf}_{ts}.json'
    with open(out_file, 'w') as f:
        json.dump({
            'pair': pair,
            'timeframe': tf,
            'total_combos': total,
            'elapsed_s': elapsed_total,
            'grid': {k: [str(v) for v in vals] for k, vals in grid.items()},
            'results': results_list,
        }, f, indent=2, default=str)
    print(f"\n  💾 Results saved to: {out_file}")

    return results_list


def main():
    parser = argparse.ArgumentParser(description='P#222 Parameter Sweep')
    parser.add_argument('--pair', default='SOLUSDT', help='Trading pair (default: SOLUSDT)')
    parser.add_argument('--tf', default='4h', help='Timeframe (default: 4h)')
    parser.add_argument('--quick', action='store_true', help='Use reduced grid (faster)')
    parser.add_argument('--all-pairs', action='store_true', help='Run for all active pairs')
    args = parser.parse_args()

    grid = PARAM_GRID_QUICK if args.quick else PARAM_GRID_FULL

    total_combos = 1
    for v in grid.values():
        total_combos *= len(v)
    print(f"  Grid: {total_combos} combinations per pair ({'quick' if args.quick else 'full'} mode)")

    if args.all_pairs:
        pairs = get_active_pairs()
    else:
        pairs = [args.pair]

    all_results = {}
    for pair in pairs:
        all_results[pair] = run_sweep(pair, args.tf, grid)

    # Cross-pair summary
    if len(pairs) > 1:
        print(f"\n{'═'*100}")
        print(f"  🌍 CROSS-PAIR SUMMARY — Best params per pair @ {args.tf}")
        print(f"{'═'*100}")
        for pair, results in all_results.items():
            if results:
                best = results[0]
                print(f"  {pair}: ${best['net_profit']:+.2f} | {best['label']}")


if __name__ == '__main__':
    main()

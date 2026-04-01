"""
P#224: Ablation Study — Component Knock-Out Experiments.

For each strategy in ABLATION_STRATEGIES: disable it, run walk-forward
backtest, and measure the impact on PF, Sharpe, PnL, and WR.

Answers: "Which strategies actually contribute to edge?"

Usage:
    cd ml-service
    python -m backtest_pipeline.ablation                        # all strategies, 1h
    python -m backtest_pipeline.ablation --tf 4h                # all strategies, 4h
    python -m backtest_pipeline.ablation --pair SOLUSDT         # single pair
    python -m backtest_pipeline.ablation --strategy RSITurbo    # single knock-out
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path

from backtest_pipeline import config
from backtest_pipeline.walk_forward import walk_forward_backtest, walk_forward_multi_pair
from backtest_pipeline.pair_config import get_active_pairs


# Strategy → config key that controls its weight (set to 0 to disable)
STRATEGY_CONFIG_MAP = {
    'AdvancedAdaptive': 'GPU_NATIVE_STRATEGY_WEIGHTS',
    'RSITurbo': 'GPU_NATIVE_STRATEGY_WEIGHTS',
    'SuperTrend': 'GPU_NATIVE_STRATEGY_WEIGHTS',
    'MACrossover': 'GPU_NATIVE_STRATEGY_WEIGHTS',
    'MomentumPro': 'GPU_NATIVE_STRATEGY_WEIGHTS',
    'BollingerMR': 'GPU_NATIVE_STRATEGY_WEIGHTS',
    'GPU_MLP': 'GPU_NATIVE_ENSEMBLE_WEIGHT',
    'Ensemble': 'GPU_NATIVE_ENSEMBLE_ENABLED',
    'BreakevenExit': 'GPU_NATIVE_BREAKEVEN_R',
    'HVBlock': 'GPU_NATIVE_BLOCK_HV_15M',
    'TimeUWDisable': 'GPU_NATIVE_DISABLE_TIME_UW',
    'SimpleExits': 'GPU_NATIVE_SIMPLE_EXITS',
}


def _get_ablation_strategies() -> list:
    """Get strategy list from config or default."""
    return getattr(config, 'ABLATION_STRATEGIES', [
        'AdvancedAdaptive', 'RSITurbo', 'SuperTrend', 'MACrossover',
        'MomentumPro', 'BollingerMR', 'GPU_MLP', 'Ensemble',
        'BreakevenExit', 'HVBlock',
    ])


def _build_disable_overrides(strategy_name: str) -> dict:
    """Build config overrides that disable a single strategy."""
    overrides = {}

    # For classical strategies: zero their weight in the ensemble
    if strategy_name in ('AdvancedAdaptive', 'RSITurbo', 'SuperTrend',
                         'MACrossover', 'MomentumPro', 'BollingerMR'):
        # Get current weights
        current_weights = getattr(config, 'STATIC_WEIGHTS', {
            'AdvancedAdaptive': 0.15, 'RSITurbo': 0.11, 'SuperTrend': 0.14,
            'MACrossover': 0.18, 'MomentumPro': 0.03, 'BollingerMR': 0.14,
            'GridV2': 0.08, 'MomentumHTF': 0.06, 'FundingArb': 0.05,
        })
        # Copy and zero out the target strategy
        new_weights = dict(current_weights)
        new_weights[strategy_name] = 0.0
        # Redistribute removed weight proportionally among remaining strategies
        removed = current_weights.get(strategy_name, 0)
        remaining_sum = sum(v for k, v in new_weights.items() if v > 0)
        if remaining_sum > 0 and removed > 0:
            for k in new_weights:
                if new_weights[k] > 0:
                    new_weights[k] *= (remaining_sum + removed) / remaining_sum
        overrides['STATIC_WEIGHTS'] = new_weights

    elif strategy_name == 'GPU_MLP':
        overrides['GPU_NATIVE_ENSEMBLE_WEIGHT'] = 1.0  # 100% classical, 0% MLP

    elif strategy_name == 'Ensemble':
        overrides['GPU_NATIVE_ENSEMBLE_ENABLED'] = False

    elif strategy_name == 'BreakevenExit':
        overrides['GPU_NATIVE_BREAKEVEN_R'] = 0.0  # Disable BE

    elif strategy_name == 'HVBlock':
        overrides['GPU_NATIVE_BLOCK_HV_15M'] = False

    elif strategy_name == 'TimeUWDisable':
        overrides['GPU_NATIVE_DISABLE_TIME_UW'] = False  # Re-enable time UW

    elif strategy_name == 'SimpleExits':
        overrides['GPU_NATIVE_SIMPLE_EXITS'] = False

    return overrides


def run_ablation(pair: str = None, timeframe: str = '1h',
                 strategies: list = None, verbose: bool = True) -> dict:
    """
    Run ablation study: baseline + N knock-out experiments.

    Returns dict with 'baseline' and per-strategy results.
    """
    strategies = strategies or _get_ablation_strategies()
    results = {}

    # ── Step 1: Baseline run (all components enabled) ──
    if verbose:
        print(f"\n{'='*80}")
        print(f"  🧪 ABLATION STUDY — {pair or 'ALL PAIRS'} @ {timeframe}")
        print(f"  Strategies to ablate: {len(strategies)}")
        print(f"{'='*80}\n")
        print(f"  ▶ Running BASELINE (all components)...")

    if pair:
        baseline = walk_forward_backtest(pair, timeframe, verbose=False)
    else:
        pairs = get_active_pairs()
        baseline = walk_forward_multi_pair(timeframe, pairs)

    if 'error' in baseline:
        if verbose:
            print(f"  ❌ Baseline failed: {baseline['error']}")
        return {'error': 'baseline_failed', 'detail': baseline['error']}

    b_agg = baseline.get('aggregate', {})
    results['baseline'] = b_agg

    if verbose:
        print(f"    PnL: ${b_agg.get('net_profit', 0):.2f} | "
              f"PF: {b_agg.get('profit_factor', 0):.2f} | "
              f"Sharpe: {b_agg.get('sharpe', 0):.2f} | "
              f"WR: {b_agg.get('win_rate', 0):.1f}% | "
              f"Trades: {b_agg.get('trades', 0)}")

    # ── Step 2: Knock-out experiments ──
    ablations = []
    for i, strategy in enumerate(strategies, 1):
        if verbose:
            print(f"\n  ▶ [{i}/{len(strategies)}] Ablating: {strategy}...", end=' ', flush=True)

        overrides = _build_disable_overrides(strategy)

        if pair:
            result = walk_forward_backtest(pair, timeframe, overrides=overrides, verbose=False)
        else:
            result = walk_forward_multi_pair(timeframe, pairs, overrides=overrides)

        if 'error' in result:
            row = {
                'strategy': strategy,
                'error': result.get('error', 'unknown'),
                'delta_pnl': 0, 'delta_pf': 0, 'delta_sharpe': 0,
                'verdict': '❌ ERROR',
            }
        else:
            a_agg = result.get('aggregate', {})
            delta_pnl = a_agg.get('net_profit', 0) - b_agg.get('net_profit', 0)
            delta_pf = a_agg.get('profit_factor', 0) - b_agg.get('profit_factor', 0)
            delta_sharpe = a_agg.get('sharpe', 0) - b_agg.get('sharpe', 0)
            delta_wr = a_agg.get('win_rate', 0) - b_agg.get('win_rate', 0)

            # Verdict logic:
            # Removing it makes things worse → it HELPS (keep it)
            # Removing it makes things better → it HURTS (consider removing)
            if delta_pnl < -50 and delta_sharpe < -0.1:
                verdict = '✅ KEEP (strong contributor)'
            elif delta_pnl < 0:
                verdict = '✅ KEEP (positive contributor)'
            elif delta_pnl > 100 and delta_sharpe > 0.1:
                verdict = '🔴 REMOVE (hurts performance)'
            elif delta_pnl > 0:
                verdict = '⚠️ NEUTRAL/WEAK (consider removing)'
            else:
                verdict = '➖ NEUTRAL'

            row = {
                'strategy': strategy,
                'pnl': a_agg.get('net_profit', 0),
                'pf': a_agg.get('profit_factor', 0),
                'sharpe': a_agg.get('sharpe', 0),
                'wr': a_agg.get('win_rate', 0),
                'trades': a_agg.get('trades', 0),
                'delta_pnl': delta_pnl,
                'delta_pf': delta_pf,
                'delta_sharpe': delta_sharpe,
                'delta_wr': delta_wr,
                'verdict': verdict,
            }

        ablations.append(row)
        if verbose and 'error' not in row:
            print(f"ΔPnL: ${row['delta_pnl']:+.2f} | "
                  f"ΔPF: {row['delta_pf']:+.2f} | "
                  f"ΔSharpe: {row['delta_sharpe']:+.2f} | "
                  f"{row['verdict']}")

    results['ablations'] = ablations

    # ── Step 3: Summary table ──
    if verbose:
        _print_summary(b_agg, ablations)

    return results


def _print_summary(baseline: dict, ablations: list):
    """Print ablation summary as a formatted table."""
    print(f"\n{'='*100}")
    print(f"  📊 ABLATION SUMMARY")
    print(f"{'='*100}")
    print(f"  {'Strategy':<20} {'PnL':>10} {'ΔPnL':>10} {'PF':>6} {'ΔPF':>6} "
          f"{'Sharpe':>7} {'ΔSharpe':>8} {'WR':>6} {'Trades':>7}  Verdict")
    print(f"  {'─'*20} {'─'*10} {'─'*10} {'─'*6} {'─'*6} "
          f"{'─'*7} {'─'*8} {'─'*6} {'─'*7}  {'─'*30}")

    # Baseline row
    print(f"  {'BASELINE':<20} ${baseline.get('net_profit',0):>8.2f} {'—':>10} "
          f"{baseline.get('profit_factor',0):>5.2f} {'—':>6} "
          f"{baseline.get('sharpe',0):>6.2f} {'—':>8} "
          f"{baseline.get('win_rate',0):>5.1f}% {baseline.get('trades',0):>7}")

    for row in sorted(ablations, key=lambda r: r.get('delta_pnl', 0)):
        if 'error' in row and 'pnl' not in row:
            print(f"  {row['strategy']:<20} {'ERROR':>10} {'—':>10} "
                  f"{'—':>6} {'—':>6} {'—':>7} {'—':>8} {'—':>6} {'—':>7}  {row['verdict']}")
        else:
            print(f"  {row['strategy']:<20} ${row.get('pnl',0):>8.2f} "
                  f"${row.get('delta_pnl',0):>+8.2f} "
                  f"{row.get('pf',0):>5.2f} {row.get('delta_pf',0):>+5.2f} "
                  f"{row.get('sharpe',0):>6.2f} {row.get('delta_sharpe',0):>+7.2f} "
                  f"{row.get('wr',0):>5.1f}% {row.get('trades',0):>7}  {row['verdict']}")

    # Key takeaways
    keepers = [r['strategy'] for r in ablations if '✅ KEEP' in r.get('verdict', '')]
    removals = [r['strategy'] for r in ablations if '🔴 REMOVE' in r.get('verdict', '')]
    neutrals = [r['strategy'] for r in ablations if '⚠️' in r.get('verdict', '')]

    print(f"\n  Key Takeaways:")
    if keepers:
        print(f"    ✅ Strong contributors: {', '.join(keepers)}")
    if removals:
        print(f"    🔴 Candidates for removal: {', '.join(removals)}")
    if neutrals:
        print(f"    ⚠️ Marginal/neutral: {', '.join(neutrals)}")


def main():
    parser = argparse.ArgumentParser(description='P#224 Ablation Study')
    parser.add_argument('--pair', default=None, help='Trading pair (default: all active)')
    parser.add_argument('--tf', default='1h', help='Timeframe (default: 1h)')
    parser.add_argument('--strategy', default=None, help='Single strategy to ablate')
    parser.add_argument('--save', action='store_true', help='Save results to JSON')
    args = parser.parse_args()

    strategies = [args.strategy] if args.strategy else None
    results = run_ablation(pair=args.pair, timeframe=args.tf, strategies=strategies)

    if args.save and 'error' not in results:
        results_dir = Path(__file__).resolve().parent.parent / 'results' / 'ablation'
        results_dir.mkdir(parents=True, exist_ok=True)
        ts = time.strftime('%Y%m%d_%H%M%S')
        suffix = f"_{args.pair}" if args.pair else "_multi"
        out_file = results_dir / f'ablation{suffix}_{args.tf}_{ts}.json'
        with open(out_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\n  💾 Results saved: {out_file}")


if __name__ == '__main__':
    main()

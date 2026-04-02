"""
P#224: Ablation Study — Component Knock-Out Experiments (Single-Pass Mode).

Runs baseline + N knock-out backtests using the full dataset (single pass,
no walk-forward). Much faster: ~30 simulations total.

For each strategy in ABLATION_STRATEGIES: disable it, run full backtest,
measure impact on PF, Sharpe, PnL, WR. Save full report to results/ablation/.

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

import numpy as np

from backtest_pipeline import config
from backtest_pipeline.runner import (
    build_engine, load_pair_data, apply_pair_overrides,
    restore_config, get_pair_capital, apply_timeframe_overrides,
)
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
        # P#225: Must set PHASE_2_BE_R directly (GPU_NATIVE_BREAKEVEN_R only active with SIMPLE_EXITS)
        overrides['PHASE_2_BE_R'] = 999.0
        overrides['PHASE_1_MIN_R'] = 999.0

    elif strategy_name == 'HVBlock':
        overrides['GPU_NATIVE_BLOCK_HV_15M'] = False

    elif strategy_name == 'TimeUWDisable':
        overrides['GPU_NATIVE_DISABLE_TIME_UW'] = False  # Re-enable time UW

    elif strategy_name == 'SimpleExits':
        overrides['GPU_NATIVE_SIMPLE_EXITS'] = False

    return overrides


def _apply_overrides(overrides: dict) -> dict:
    """Apply config overrides, return originals for restore."""
    originals = {}
    for key, val in overrides.items():
        originals[key] = getattr(config, key, None)
        setattr(config, key, val)
    return originals


def _restore_overrides(originals: dict):
    """Restore config from originals dict."""
    for key, val in originals.items():
        if val is None:
            if hasattr(config, key):
                delattr(config, key)
        else:
            setattr(config, key, val)


def _run_single_pass(pairs: list, timeframe: str, verbose: bool = False) -> dict:
    """
    Run single-pass full backtest on all pairs.
    Returns aggregate dict: {net_profit, trades, win_rate, profit_factor, sharpe, max_drawdown, per_pair}.
    """
    tf_originals = apply_timeframe_overrides(timeframe)
    per_pair = {}
    all_trades = []

    for symbol in pairs:
        df = load_pair_data(symbol, timeframe)
        if df is None:
            continue

        pair_originals = apply_pair_overrides(symbol)
        pair_capital = get_pair_capital(symbol)

        engine = build_engine(
            initial_capital=pair_capital,
            symbol=symbol,
            quantum_backend='simulated',
        )
        results = engine.run(df, timeframe)
        restore_config(pair_originals)

        if results.get('error'):
            continue

        trades_list = results.get('trades_list', [])
        if not trades_list and hasattr(engine, 'pm'):
            trades_list = engine.pm.trades

        per_pair[symbol] = {
            'net_profit': results.get('net_profit', 0),
            'trades': results.get('total_trades', 0),
            'win_rate': results.get('win_rate', 0),
            'profit_factor': results.get('profit_factor', 0),
            'max_drawdown': results.get('max_drawdown', 0),
            'total_return_pct': results.get('total_return_pct', 0),
            'capital': pair_capital,
            'trades_list': trades_list,
        }
        all_trades.extend(trades_list)

    restore_config(tf_originals)

    # Aggregate
    total_pnl = sum(p['net_profit'] for p in per_pair.values())
    total_trades = sum(p['trades'] for p in per_pair.values())

    # Win rate
    total_wins = sum(p['trades'] * p['win_rate'] / 100 for p in per_pair.values())
    wr = (total_wins / total_trades * 100) if total_trades > 0 else 0

    # P#225: Profit factor from trade-level wins/losses (not pair-level net_profit)
    gross_win = sum(t['net_pnl'] for t in all_trades if t.get('net_pnl', 0) > 0)
    gross_loss = abs(sum(t['net_pnl'] for t in all_trades if t.get('net_pnl', 0) < 0))
    pf = (gross_win / gross_loss) if gross_loss > 0 else (99.0 if gross_win > 0 else 0)

    # Sharpe (avg of per-pair)
    sharpes = [_pair_sharpe(p['trades_list']) for p in per_pair.values() if p['trades'] > 0]
    sharpe = float(np.mean(sharpes)) if sharpes else 0

    # Max drawdown (sum of per-pair)
    max_dd = sum(p['max_drawdown'] for p in per_pair.values())

    return {
        'net_profit': round(total_pnl, 2),
        'trades': total_trades,
        'win_rate': round(wr, 1),
        'profit_factor': round(pf, 3),
        'sharpe': round(sharpe, 3),
        'max_drawdown': round(max_dd, 2),
        'per_pair': {s: {k: v for k, v in p.items() if k != 'trades_list'} for s, p in per_pair.items()},
    }


def _pair_sharpe(trades_list: list) -> float:
    """Compute annualized Sharpe from trade PnLs."""
    if not trades_list or len(trades_list) < 2:
        return 0.0
    pnls = [t.get('net_pnl', 0) for t in trades_list]
    if np.std(pnls) == 0:
        return 0.0
    return float(np.mean(pnls) / np.std(pnls) * np.sqrt(252))


def run_ablation(pair: str = None, timeframe: str = '1h',
                 strategies: list = None, verbose: bool = True) -> dict:
    """
    Run ablation study: baseline + N knock-out experiments (single-pass mode).

    Returns dict with 'baseline' and per-strategy results + full per-pair breakdown.
    """
    strategies = strategies or _get_ablation_strategies()
    pairs = [pair] if pair else get_active_pairs()
    total_sims = (1 + len(strategies)) * len(pairs)
    results = {}

    # ── Step 1: Baseline run (all components enabled) ──
    if verbose:
        print(f"\n{'='*80}")
        print(f"  🧪 ABLATION STUDY — {pair or 'ALL PAIRS'} @ {timeframe}")
        print(f"  Strategies to ablate: {len(strategies)}")
        print(f"  Total simulations: {total_sims} ({1 + len(strategies)} configs × {len(pairs)} pairs)")
        print(f"{'='*80}\n")
        print(f"  ▶ [0/{len(strategies)}] Running BASELINE (all components)...")

    t0 = time.time()
    b_agg = _run_single_pass(pairs, timeframe, verbose=verbose)
    results['baseline'] = b_agg

    if verbose:
        print(f"    PnL: ${b_agg.get('net_profit', 0):.2f} | "
              f"PF: {b_agg.get('profit_factor', 0):.3f} | "
              f"Sharpe: {b_agg.get('sharpe', 0):.3f} | "
              f"WR: {b_agg.get('win_rate', 0):.1f}% | "
              f"Trades: {b_agg.get('trades', 0)}")
        for sym, pp in b_agg.get('per_pair', {}).items():
            e = '✅' if pp['net_profit'] > 0 else '❌'
            print(f"      {e} {sym}: ${pp['net_profit']:+.2f} | {pp['trades']} trades | "
                  f"PF {pp['profit_factor']:.3f} | WR {pp['win_rate']:.1f}%")

    # ── Step 2: Knock-out experiments ──
    ablations = []
    for i, strategy in enumerate(strategies, 1):
        if verbose:
            print(f"\n  ▶ [{i}/{len(strategies)}] Ablating: {strategy}...", flush=True)

        overrides = _build_disable_overrides(strategy)
        override_originals = _apply_overrides(overrides)

        a_agg = _run_single_pass(pairs, timeframe, verbose=False)

        _restore_overrides(override_originals)

        delta_pnl = a_agg['net_profit'] - b_agg['net_profit']
        delta_pf = a_agg['profit_factor'] - b_agg['profit_factor']
        delta_sharpe = a_agg['sharpe'] - b_agg['sharpe']
        delta_wr = a_agg['win_rate'] - b_agg['win_rate']

        # Verdict: removing makes things worse → KEEP, better → REMOVE
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
            'pnl': a_agg['net_profit'],
            'pf': a_agg['profit_factor'],
            'sharpe': a_agg['sharpe'],
            'wr': a_agg['win_rate'],
            'trades': a_agg['trades'],
            'max_drawdown': a_agg['max_drawdown'],
            'delta_pnl': round(delta_pnl, 2),
            'delta_pf': round(delta_pf, 3),
            'delta_sharpe': round(delta_sharpe, 3),
            'delta_wr': round(delta_wr, 1),
            'verdict': verdict,
            'per_pair': a_agg.get('per_pair', {}),
        }
        ablations.append(row)

        if verbose:
            print(f"    ΔPnL: ${delta_pnl:+.2f} | ΔPF: {delta_pf:+.3f} | "
                  f"ΔSharpe: {delta_sharpe:+.3f} | {verdict}")
            for sym, pp in a_agg.get('per_pair', {}).items():
                b_pp = b_agg.get('per_pair', {}).get(sym, {})
                d = pp['net_profit'] - b_pp.get('net_profit', 0)
                e = '↑' if d > 0 else '↓' if d < 0 else '→'
                print(f"      {e} {sym}: ${pp['net_profit']:+.2f} (Δ${d:+.2f})")

    results['ablations'] = ablations
    elapsed = time.time() - t0

    # ── Step 3: Summary table ──
    if verbose:
        _print_summary(b_agg, ablations, elapsed, total_sims)

    results['meta'] = {
        'timeframe': timeframe,
        'pairs': pairs,
        'total_simulations': total_sims,
        'elapsed_s': round(elapsed, 1),
    }

    return results


def _print_summary(baseline: dict, ablations: list, elapsed: float, total_sims: int):
    """Print ablation summary as a formatted table."""
    print(f"\n{'='*100}")
    print(f"  📊 ABLATION SUMMARY — {total_sims} simulations in {elapsed:.0f}s")
    print(f"{'='*100}")
    print(f"  {'Strategy':<20} {'PnL':>10} {'ΔPnL':>10} {'PF':>7} {'ΔPF':>7} "
          f"{'Sharpe':>7} {'ΔSharpe':>8} {'WR':>6} {'Trades':>7}  Verdict")
    print(f"  {'─'*20} {'─'*10} {'─'*10} {'─'*7} {'─'*7} "
          f"{'─'*7} {'─'*8} {'─'*6} {'─'*7}  {'─'*30}")

    # Baseline row
    print(f"  {'BASELINE':<20} ${baseline.get('net_profit',0):>8.2f} {'—':>10} "
          f"{baseline.get('profit_factor',0):>6.3f} {'—':>7} "
          f"{baseline.get('sharpe',0):>6.3f} {'—':>8} "
          f"{baseline.get('win_rate',0):>5.1f}% {baseline.get('trades',0):>7}")

    for row in sorted(ablations, key=lambda r: r.get('delta_pnl', 0)):
        if 'error' in row and 'pnl' not in row:
            print(f"  {row['strategy']:<20} {'ERROR':>10} {'—':>10} "
                  f"{'—':>7} {'—':>7} {'—':>7} {'—':>8} {'—':>6} {'—':>7}  {row['verdict']}")
        else:
            print(f"  {row['strategy']:<20} ${row.get('pnl',0):>8.2f} "
                  f"${row.get('delta_pnl',0):>+8.2f} "
                  f"{row.get('pf',0):>6.3f} {row.get('delta_pf',0):>+6.3f} "
                  f"{row.get('sharpe',0):>6.3f} {row.get('delta_sharpe',0):>+7.3f} "
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
    parser = argparse.ArgumentParser(description='P#224 Ablation Study (Single-Pass)')
    parser.add_argument('--pair', default=None, help='Trading pair (default: all active)')
    parser.add_argument('--tf', default='1h', help='Timeframe (default: 1h)')
    parser.add_argument('--strategy', default=None, help='Single strategy to ablate')
    parser.add_argument('--no-save', action='store_true', help='Skip saving report')
    args = parser.parse_args()

    strategies = [args.strategy] if args.strategy else None
    results = run_ablation(pair=args.pair, timeframe=args.tf, strategies=strategies)

    if not args.no_save and 'error' not in results:
        results_dir = Path(__file__).resolve().parent.parent / 'results' / 'ablation'
        results_dir.mkdir(parents=True, exist_ok=True)
        ts = time.strftime('%Y%m%d_%H%M%S')
        suffix = f"_{args.pair}" if args.pair else "_multi"
        out_file = results_dir / f'ablation{suffix}_{args.tf}_{ts}.json'
        with open(out_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\n  💾 Full report saved: {out_file}")
        print(f"     ({os.path.getsize(out_file) / 1024:.1f} KB)")


if __name__ == '__main__':
    main()

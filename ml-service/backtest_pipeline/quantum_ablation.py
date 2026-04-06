"""
P#237: Quantum Pipeline Ablation Test — ON vs OFF comparison.

Board decision: 2-week ablation with Sharpe delta threshold 0.2.
Since live paper trading is too slow (need 100+ trades), we use
walk-forward OOS backtest to compare quantum ON vs OFF.

Quantum components disabled in OFF mode:
  - VQC regime SL/TP adjustments → all 1.0 (neutral)
  - QMC TP boost/shrink → 1.0 (neutral)
  - QMC confidence boost → 0.0
  - QRA risk tightening → threshold 999 (never triggers)

Usage:
    cd ml-service
    python -m backtest_pipeline.quantum_ablation                 # all active pairs, 4h
    python -m backtest_pipeline.quantum_ablation --tf 1h         # all active pairs, 1h
    python -m backtest_pipeline.quantum_ablation --pair SOLUSDT  # single pair
"""
import argparse
import json
import time
from pathlib import Path

import numpy as np

from backtest_pipeline import config
from backtest_pipeline.walk_forward import walk_forward_backtest
from backtest_pipeline.pair_config import get_active_pairs


# Overrides that neutralize all quantum effects in the backtest engine
QUANTUM_OFF_OVERRIDES = {
    'VQC_REGIME_SL_ADJUST': {
        'TRENDING_UP': 1.0,
        'TRENDING_DOWN': 1.0,
        'RANGING': 1.0,
        'HIGH_VOLATILITY': 1.0,
    },
    'VQC_REGIME_TP_ADJUST': {
        'TRENDING_UP': 1.0,
        'TRENDING_DOWN': 1.0,
        'RANGING': 1.0,
        'HIGH_VOLATILITY': 1.0,
    },
    'QRA_HIGH_RISK_THRESHOLD': 999,       # Never triggers SL tightening
    'QRA_SL_TIGHTEN_FACTOR': 1.0,         # No tightening even if triggered
    'QMC_BULLISH_TP_BOOST': 1.0,          # No TP boost on bullish QMC
    'QMC_BEARISH_TP_SHRINK': 1.0,         # No TP shrink on bearish QMC
    'QMC_SIM_INTERVAL': 999999,           # Effectively never run QMC
    'QRA_RISK_INTERVAL': 999999,          # Effectively never run QRA
}

SHARPE_DELTA_THRESHOLD = 0.2  # Board requirement: quantum must add >= 0.2 Sharpe


def run_quantum_ablation(
    pair: str = None,
    timeframe: str = '4h',
    train_days: int = 60,
    test_days: int = 30,
    step_days: int = 30,
    verbose: bool = True,
) -> dict:
    """
    Run walk-forward backtest twice: quantum ON (baseline) and quantum OFF.
    Compare OOS Sharpe, PF, PnL across all windows.
    """
    pairs = [pair] if pair else get_active_pairs()
    results = {'pairs': {}, 'meta': {}}
    t0 = time.time()

    if verbose:
        print(f"\n{'='*90}")
        print(f"  🔬 QUANTUM ABLATION TEST — P#237 Board Decision")
        print(f"     Pairs: {', '.join(pairs)} | TF: {timeframe}")
        print(f"     Windows: {train_days}d train / {test_days}d test / {step_days}d step")
        print(f"     Sharpe delta threshold: {SHARPE_DELTA_THRESHOLD}")
        print(f"{'='*90}")

    for symbol in pairs:
        if verbose:
            print(f"\n  ━━━ {symbol} ━━━")

        # ── Run A: Quantum ON (baseline) ──
        if verbose:
            print(f"\n  ▶ [A] Quantum ON (baseline)...")
        result_on = walk_forward_backtest(
            symbol=symbol,
            timeframe=timeframe,
            overrides=None,  # Default config = quantum ON
            train_days=train_days,
            test_days=test_days,
            step_days=step_days,
            verbose=verbose,
        )

        # ── Run B: Quantum OFF ──
        if verbose:
            print(f"\n  ▶ [B] Quantum OFF (neutralized)...")
        result_off = walk_forward_backtest(
            symbol=symbol,
            timeframe=timeframe,
            overrides=QUANTUM_OFF_OVERRIDES,
            train_days=train_days,
            test_days=test_days,
            step_days=step_days,
            verbose=verbose,
        )

        # ── Compare ──
        agg_on = result_on.get('aggregate', {})
        agg_off = result_off.get('aggregate', {})

        delta_sharpe = agg_on.get('sharpe', 0) - agg_off.get('sharpe', 0)
        delta_pnl = agg_on.get('net_profit', 0) - agg_off.get('net_profit', 0)
        delta_pf = agg_on.get('profit_factor', 0) - agg_off.get('profit_factor', 0)
        delta_wr = agg_on.get('win_rate', 0) - agg_off.get('win_rate', 0)
        delta_dd = agg_on.get('max_drawdown', 0) - agg_off.get('max_drawdown', 0)

        # Per-window comparison
        windows_on = result_on.get('windows', [])
        windows_off = result_off.get('windows', [])
        per_window_delta = []
        for w_on, w_off in zip(windows_on, windows_off):
            if isinstance(w_on, dict) and isinstance(w_off, dict) and 'sharpe' in w_on and 'sharpe' in w_off:
                per_window_delta.append({
                    'window': w_on.get('window', '?'),
                    'sharpe_on': w_on['sharpe'],
                    'sharpe_off': w_off['sharpe'],
                    'delta_sharpe': round(w_on['sharpe'] - w_off['sharpe'], 3),
                    'pnl_on': w_on.get('net_profit', 0),
                    'pnl_off': w_off.get('net_profit', 0),
                    'delta_pnl': round(w_on.get('net_profit', 0) - w_off.get('net_profit', 0), 2),
                })

        # Verdict
        if delta_sharpe >= SHARPE_DELTA_THRESHOLD:
            verdict = f'✅ KEEP QUANTUM — Sharpe delta +{delta_sharpe:.3f} >= {SHARPE_DELTA_THRESHOLD}'
        elif delta_sharpe <= -SHARPE_DELTA_THRESHOLD:
            verdict = f'🔴 REMOVE QUANTUM — Sharpe delta {delta_sharpe:.3f} <= -{SHARPE_DELTA_THRESHOLD}'
        else:
            verdict = f'⚠️ INCONCLUSIVE — Sharpe delta {delta_sharpe:.3f} within ±{SHARPE_DELTA_THRESHOLD} band'

        # Count how many windows quantum wins
        wins_on = sum(1 for w in per_window_delta if w['delta_sharpe'] > 0)
        wins_off = sum(1 for w in per_window_delta if w['delta_sharpe'] < 0)
        ties = len(per_window_delta) - wins_on - wins_off

        pair_result = {
            'quantum_on': {
                'sharpe': agg_on.get('sharpe', 0),
                'pnl': agg_on.get('net_profit', 0),
                'pf': agg_on.get('profit_factor', 0),
                'wr': agg_on.get('win_rate', 0),
                'trades': agg_on.get('trades', 0),
                'max_dd': agg_on.get('max_drawdown', 0),
            },
            'quantum_off': {
                'sharpe': agg_off.get('sharpe', 0),
                'pnl': agg_off.get('net_profit', 0),
                'pf': agg_off.get('profit_factor', 0),
                'wr': agg_off.get('win_rate', 0),
                'trades': agg_off.get('trades', 0),
                'max_dd': agg_off.get('max_drawdown', 0),
            },
            'delta': {
                'sharpe': round(delta_sharpe, 3),
                'pnl': round(delta_pnl, 2),
                'pf': round(delta_pf, 3),
                'wr': round(delta_wr, 1),
                'dd': round(delta_dd, 2),
            },
            'per_window': per_window_delta,
            'window_wins': {'quantum_on': wins_on, 'quantum_off': wins_off, 'tie': ties},
            'verdict': verdict,
        }
        results['pairs'][symbol] = pair_result

        if verbose:
            _print_pair_comparison(symbol, pair_result)

    elapsed = time.time() - t0
    results['meta'] = {
        'timeframe': timeframe,
        'train_days': train_days,
        'test_days': test_days,
        'step_days': step_days,
        'sharpe_threshold': SHARPE_DELTA_THRESHOLD,
        'elapsed_s': round(elapsed, 1),
    }

    # Portfolio-level verdict
    all_deltas = [r['delta']['sharpe'] for r in results['pairs'].values()]
    avg_delta = np.mean(all_deltas) if all_deltas else 0
    if avg_delta >= SHARPE_DELTA_THRESHOLD:
        portfolio_verdict = f'✅ KEEP QUANTUM — Avg Sharpe delta +{avg_delta:.3f}'
    elif avg_delta <= -SHARPE_DELTA_THRESHOLD:
        portfolio_verdict = f'🔴 REMOVE QUANTUM — Avg Sharpe delta {avg_delta:.3f}'
    else:
        portfolio_verdict = f'⚠️ INCONCLUSIVE — Avg Sharpe delta {avg_delta:.3f}'
    results['portfolio_verdict'] = portfolio_verdict

    if verbose:
        print(f"\n{'='*90}")
        print(f"  🏛️  PORTFOLIO VERDICT: {portfolio_verdict}")
        print(f"     Total time: {elapsed:.0f}s")
        print(f"{'='*90}\n")

    return results


def _print_pair_comparison(symbol: str, r: dict):
    """Print side-by-side comparison for a pair."""
    on = r['quantum_on']
    off = r['quantum_off']
    d = r['delta']

    print(f"\n  {'─'*70}")
    print(f"  {symbol} — QUANTUM ABLATION RESULTS")
    print(f"  {'─'*70}")
    print(f"  {'Metric':<15} {'Quantum ON':>12} {'Quantum OFF':>12} {'Delta':>12}")
    print(f"  {'─'*15} {'─'*12} {'─'*12} {'─'*12}")
    print(f"  {'Sharpe':<15} {on['sharpe']:>12.3f} {off['sharpe']:>12.3f} {d['sharpe']:>+12.3f}")
    print(f"  {'PnL':<15} ${on['pnl']:>10.2f} ${off['pnl']:>10.2f} ${d['pnl']:>+10.2f}")
    print(f"  {'PF':<15} {on['pf']:>12.3f} {off['pf']:>12.3f} {d['pf']:>+12.3f}")
    print(f"  {'Win Rate':<15} {on['wr']:>11.1f}% {off['wr']:>11.1f}% {d['wr']:>+11.1f}%")
    print(f"  {'Trades':<15} {on['trades']:>12} {off['trades']:>12} {on['trades'] - off['trades']:>+12}")
    print(f"  {'Max DD':<15} ${on['max_dd']:>10.2f} ${off['max_dd']:>10.2f} ${d['dd']:>+10.2f}")

    # Per-window table
    pw = r.get('per_window', [])
    if pw:
        print(f"\n  Per-Window Sharpe:")
        print(f"  {'Win':>4} {'ON':>8} {'OFF':>8} {'Delta':>8} {'Winner':>12}")
        print(f"  {'─'*4} {'─'*8} {'─'*8} {'─'*8} {'─'*12}")
        for w in pw:
            winner = 'QUANTUM' if w['delta_sharpe'] > 0 else 'CLASSICAL' if w['delta_sharpe'] < 0 else 'TIE'
            print(f"  {w['window']:>4} {w['sharpe_on']:>8.3f} {w['sharpe_off']:>8.3f} {w['delta_sharpe']:>+8.3f} {winner:>12}")

    ww = r.get('window_wins', {})
    print(f"\n  Window Score: Quantum {ww.get('quantum_on', 0)} — Classical {ww.get('quantum_off', 0)} — Tie {ww.get('tie', 0)}")
    print(f"  VERDICT: {r['verdict']}")


def main():
    parser = argparse.ArgumentParser(description='P#237 Quantum Ablation Test')
    parser.add_argument('--pair', default=None, help='Single pair (default: all active)')
    parser.add_argument('--tf', default='4h', help='Timeframe (default: 4h)')
    parser.add_argument('--train-days', type=int, default=60, help='Train window days')
    parser.add_argument('--test-days', type=int, default=30, help='Test window days')
    parser.add_argument('--step-days', type=int, default=30, help='Step between windows')
    parser.add_argument('--no-save', action='store_true', help='Skip saving report')
    args = parser.parse_args()

    results = run_quantum_ablation(
        pair=args.pair,
        timeframe=args.tf,
        train_days=args.train_days,
        test_days=args.test_days,
        step_days=args.step_days,
    )

    if not args.no_save:
        results_dir = Path(__file__).resolve().parent.parent / 'results' / 'ablation'
        results_dir.mkdir(parents=True, exist_ok=True)
        ts = time.strftime('%Y%m%d_%H%M%S')
        suffix = f"_{args.pair}" if args.pair else "_portfolio"
        fname = f"quantum_ablation_{args.tf}{suffix}_{ts}.json"
        out_path = results_dir / fname
        with open(out_path, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"  📄 Report saved: {out_path}")


if __name__ == '__main__':
    main()

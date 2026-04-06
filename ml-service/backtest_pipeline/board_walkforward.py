"""
P#237: 5-Window Walk-Forward Validation — Board Requirement.

Board mandate: minimum 100 OOS trades, 5-window rolling walk-forward
before going LIVE. Uses existing walk_forward.py with proper window sizing.

Data availability (4h):
  - SOLUSDT: 364d / 2190 candles (2025-04-05 → 2026-04-05)
  - BNBUSDT: 364d / 2190 candles (2025-04-05 → 2026-04-05)

Window config for 5 windows on 364d data:
  - Train: 60d, Test: 30d, Step: 30d → ceil((364-60-30)/30)+1 = ~10 windows
  - With min 5 required, 60/30/30 provides comfortable margin

Usage:
    cd ml-service
    python -m backtest_pipeline.board_walkforward              # all active, 4h
    python -m backtest_pipeline.board_walkforward --tf 1h      # all active, 1h
    python -m backtest_pipeline.board_walkforward --pair SOLUSDT
"""
import argparse
import json
import time
from pathlib import Path

import numpy as np

from backtest_pipeline import config
from backtest_pipeline.walk_forward import walk_forward_backtest
from backtest_pipeline.pair_config import get_active_pairs


MIN_OOS_TRADES = 100    # Board requirement
MIN_WINDOWS = 5         # Board requirement
SHARPE_FLOOR = 0.0      # Must be net positive Sharpe
PF_FLOOR = 1.0          # Must be net profitable


def run_board_walkforward(
    pair: str = None,
    timeframe: str = '4h',
    train_days: int = 60,
    test_days: int = 30,
    step_days: int = 30,
    verbose: bool = True,
) -> dict:
    """
    Run 5+ window walk-forward validation per board mandate.
    Checks:
      1. Minimum 100 OOS trades across all pairs
      2. Minimum 5 windows
      3. Aggregate Sharpe > 0
      4. Aggregate PF > 1.0
    """
    pairs = [pair] if pair else get_active_pairs()
    results = {'pairs': {}}
    t0 = time.time()

    total_oos_trades = 0
    total_windows = 0
    all_sharpes = []
    all_pfs = []
    all_pnls = []

    if verbose:
        print(f"\n{'='*90}")
        print(f"  📋 BOARD WALK-FORWARD VALIDATION — P#237")
        print(f"     Requirement: ≥{MIN_OOS_TRADES} OOS trades | ≥{MIN_WINDOWS} windows | Sharpe > 0 | PF > 1.0")
        print(f"     Pairs: {', '.join(pairs)} | TF: {timeframe}")
        print(f"     Windows: {train_days}d train / {test_days}d test / {step_days}d step")
        print(f"{'='*90}")

    for symbol in pairs:
        result = walk_forward_backtest(
            symbol=symbol,
            timeframe=timeframe,
            train_days=train_days,
            test_days=test_days,
            step_days=step_days,
            verbose=verbose,
        )

        if 'error' in result:
            results['pairs'][symbol] = {'error': result['error']}
            continue

        agg = result.get('aggregate', {})
        windows = result.get('windows', [])
        valid_windows = [w for w in windows if isinstance(w, dict) and 'trades' in w]
        n_trades = agg.get('trades', 0)
        n_windows = len(valid_windows)

        total_oos_trades += n_trades
        total_windows += n_windows
        if agg.get('sharpe') is not None:
            all_sharpes.append(agg['sharpe'])
        if agg.get('profit_factor') is not None:
            all_pfs.append(agg['profit_factor'])
        if agg.get('net_profit') is not None:
            all_pnls.append(agg['net_profit'])

        # Per-window profitability
        profitable_windows = sum(1 for w in valid_windows if w.get('net_profit', 0) > 0)

        pair_result = {
            'aggregate': agg,
            'windows': valid_windows,
            'n_windows': n_windows,
            'n_trades': n_trades,
            'profitable_windows': profitable_windows,
            'total_windows': n_windows,
            'elapsed_s': result.get('elapsed_s', 0),
        }
        results['pairs'][symbol] = pair_result

    elapsed = time.time() - t0

    # Portfolio-level metrics
    portfolio_sharpe = float(np.mean(all_sharpes)) if all_sharpes else 0
    portfolio_pf = float(np.mean(all_pfs)) if all_pfs else 0
    portfolio_pnl = sum(all_pnls)

    # Board checks
    checks = {
        'min_oos_trades': {
            'required': MIN_OOS_TRADES,
            'actual': total_oos_trades,
            'pass': total_oos_trades >= MIN_OOS_TRADES,
        },
        'min_windows': {
            'required': MIN_WINDOWS,
            'actual': total_windows,
            'pass': total_windows >= MIN_WINDOWS,
        },
        'positive_sharpe': {
            'required': f'> {SHARPE_FLOOR}',
            'actual': round(portfolio_sharpe, 3),
            'pass': portfolio_sharpe > SHARPE_FLOOR,
        },
        'profitable': {
            'required': f'PF > {PF_FLOOR}',
            'actual': round(portfolio_pf, 3),
            'pass': portfolio_pf > PF_FLOOR,
        },
    }

    all_pass = all(c['pass'] for c in checks.values())
    results['portfolio'] = {
        'sharpe': round(portfolio_sharpe, 3),
        'profit_factor': round(portfolio_pf, 3),
        'net_pnl': round(portfolio_pnl, 2),
        'total_oos_trades': total_oos_trades,
        'total_windows': total_windows,
    }
    results['checks'] = checks
    results['board_approved'] = all_pass
    results['meta'] = {
        'timeframe': timeframe,
        'train_days': train_days,
        'test_days': test_days,
        'step_days': step_days,
        'elapsed_s': round(elapsed, 1),
    }

    if verbose:
        print(f"\n{'='*90}")
        print(f"  📋 BOARD WALK-FORWARD REPORT")
        print(f"{'='*90}")
        print(f"\n  Portfolio Summary:")
        print(f"    Total OOS Trades:  {total_oos_trades}")
        print(f"    Total Windows:     {total_windows}")
        print(f"    Portfolio Sharpe:  {portfolio_sharpe:.3f}")
        print(f"    Portfolio PF:      {portfolio_pf:.3f}")
        print(f"    Portfolio PnL:     ${portfolio_pnl:+.2f}")

        print(f"\n  Board Checks:")
        for name, check in checks.items():
            emoji = '✅' if check['pass'] else '❌'
            print(f"    {emoji} {name}: {check['actual']} (required: {check['required']})")

        print(f"\n  Per-Pair Summary:")
        for symbol, pr in results['pairs'].items():
            if 'error' in pr:
                print(f"    ❌ {symbol}: {pr['error']}")
                continue
            agg = pr['aggregate']
            e = '✅' if agg.get('net_profit', 0) > 0 else '❌'
            print(f"    {e} {symbol}: ${agg.get('net_profit', 0):+.2f} | "
                  f"{pr['n_trades']} trades | WR {agg.get('win_rate', 0):.1f}% | "
                  f"PF {agg.get('profit_factor', 0):.3f} | Sharpe {agg.get('sharpe', 0):.3f} | "
                  f"{pr['profitable_windows']}/{pr['total_windows']} windows profitable")

        verdict = '✅ APPROVED FOR LIVE' if all_pass else '❌ NOT APPROVED — Fix failures above'
        print(f"\n  {'='*60}")
        print(f"  VERDICT: {verdict}")
        print(f"  {'='*60}")
        print(f"  Elapsed: {elapsed:.0f}s\n")

    return results


def main():
    parser = argparse.ArgumentParser(description='P#237 Board Walk-Forward Validation')
    parser.add_argument('--pair', default=None, help='Single pair (default: all active)')
    parser.add_argument('--tf', default='4h', help='Timeframe (default: 4h)')
    parser.add_argument('--train-days', type=int, default=60, help='Train window days')
    parser.add_argument('--test-days', type=int, default=30, help='Test window days')
    parser.add_argument('--step-days', type=int, default=30, help='Step between windows')
    parser.add_argument('--no-save', action='store_true', help='Skip saving report')
    args = parser.parse_args()

    results = run_board_walkforward(
        pair=args.pair,
        timeframe=args.tf,
        train_days=args.train_days,
        test_days=args.test_days,
        step_days=args.step_days,
    )

    if not args.no_save:
        results_dir = Path(__file__).resolve().parent.parent / 'results' / 'walkforward'
        results_dir.mkdir(parents=True, exist_ok=True)
        ts = time.strftime('%Y%m%d_%H%M%S')
        suffix = f"_{args.pair}" if args.pair else "_portfolio"
        fname = f"board_wf_{args.tf}{suffix}_{ts}.json"
        out_path = results_dir / fname
        with open(out_path, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"  📄 Report saved: {out_path}")


if __name__ == '__main__':
    main()

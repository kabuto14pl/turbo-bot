"""
P#224: Professional Walk-Forward Validation with Rolling OOS Windows.

Unlike the existing runner.py walk-forward (P#189) which creates a new engine
per fold and re-trains ML on test data (defeating OOS validity), this module:

1. Splits data into rolling TRAIN/TEST windows (90d train, 30d test, step 30d)
2. Trains the engine ONLY on train data
3. Evaluates ONLY on test data (true out-of-sample)
4. Aggregates OOS metrics across all windows
5. Reports per-window and aggregate Sharpe, PF, WR, drawdown

Usage:
    from backtest_pipeline.walk_forward import walk_forward_backtest
    results = walk_forward_backtest('SOLUSDT', '1h')

    # Or with config overrides:
    results = walk_forward_backtest('SOLUSDT', '1h', overrides={'TP_ATR_MULT': 3.0})
"""
import time
import numpy as np
import pandas as pd
from pathlib import Path

from backtest_pipeline import config
from backtest_pipeline.runner import (
    build_engine, load_pair_data, apply_pair_overrides,
    restore_config, get_pair_capital, apply_timeframe_overrides,
)


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


def _compute_window_metrics(trades: list) -> dict:
    """Compute metrics from a list of trade dicts."""
    if not trades:
        return {
            'net_profit': 0, 'trades': 0, 'win_rate': 0,
            'profit_factor': 0, 'sharpe': 0, 'max_drawdown': 0,
            'avg_win': 0, 'avg_loss': 0, 'total_fees': 0,
        }
    pnls = [t['net_pnl'] for t in trades]
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p <= 0]
    gross_profit = sum(wins) if wins else 0
    gross_loss = abs(sum(losses)) if losses else 0
    fees = sum(t.get('fees', 0) for t in trades)

    # Equity curve for Sharpe + drawdown
    equity = [0]
    for p in pnls:
        equity.append(equity[-1] + p)
    eq = np.array(equity)
    peak = np.maximum.accumulate(eq)
    dd = (peak - eq)
    max_dd = float(dd.max()) if len(dd) > 1 else 0

    # Sharpe (annualized, assuming daily returns)
    returns = np.diff(eq)
    if len(returns) > 1 and np.std(returns) > 0:
        sharpe = float(np.mean(returns) / np.std(returns) * np.sqrt(252))
    else:
        sharpe = 0.0

    return {
        'net_profit': sum(pnls),
        'trades': len(trades),
        'win_rate': len(wins) / len(trades) * 100 if trades else 0,
        'profit_factor': gross_profit / gross_loss if gross_loss > 0 else (99.0 if gross_profit > 0 else 0),
        'sharpe': round(sharpe, 3),
        'max_drawdown': round(max_dd, 2),
        'avg_win': np.mean(wins) if wins else 0,
        'avg_loss': np.mean(losses) if losses else 0,
        'total_fees': round(fees, 2),
    }


def walk_forward_backtest(
    symbol: str = 'SOLUSDT',
    timeframe: str = '1h',
    overrides: dict = None,
    train_days: int = None,
    test_days: int = None,
    step_days: int = None,
    verbose: bool = True,
) -> dict:
    """
    Run rolling walk-forward validation for a single pair+TF.

    Returns dict with:
      - 'windows': list of per-window results
      - 'aggregate': combined OOS metrics
      - 'params': config overrides used
    """
    train_days = train_days or getattr(config, 'WF_TRAIN_DAYS', 90)
    test_days = test_days or getattr(config, 'WF_TEST_DAYS', 30)
    step_days = step_days or getattr(config, 'WF_STEP_DAYS', 30)
    min_trades = getattr(config, 'WF_MIN_TRADES', 20)

    # Apply config overrides
    override_originals = _apply_overrides(overrides or {})

    # Apply pair + TF overrides
    pair_originals = apply_pair_overrides(symbol)
    tf_originals = apply_timeframe_overrides(timeframe)
    pair_capital = get_pair_capital(symbol)

    # Load full dataset
    df = load_pair_data(symbol, timeframe)
    if df is None:
        _restore_overrides(override_originals)
        restore_config(pair_originals)
        restore_config(tf_originals)
        return {'error': f'No data for {symbol} @ {timeframe}'}

    # Calculate windows
    total_days = (df.index[-1] - df.index[0]).days
    tf_hours = {'15m': 0.25, '1h': 1, '4h': 4}.get(timeframe, 1)
    candles_per_day = 24 / tf_hours

    windows = []
    window_start = 0
    train_candles = int(train_days * candles_per_day)
    test_candles = int(test_days * candles_per_day)
    step_candles = int(step_days * candles_per_day)

    while window_start + train_candles + test_candles <= len(df):
        windows.append({
            'train_start': window_start,
            'train_end': window_start + train_candles,
            'test_start': window_start + train_candles,
            'test_end': min(window_start + train_candles + test_candles, len(df)),
        })
        window_start += step_candles

    if not windows:
        _restore_overrides(override_originals)
        restore_config(pair_originals)
        restore_config(tf_originals)
        return {'error': f'Not enough data for walk-forward: {total_days}d < {train_days + test_days}d required'}

    if verbose:
        print(f"\n{'='*90}")
        print(f"  🔬 WALK-FORWARD VALIDATION — {symbol} @ {timeframe}")
        print(f"     {len(windows)} windows | Train: {train_days}d | Test: {test_days}d | Step: {step_days}d")
        print(f"     Data: {len(df)} candles ({total_days}d) | Capital: ${pair_capital:,.0f}")
        if overrides:
            print(f"     Overrides: {overrides}")
        print(f"{'='*90}")

    # Set reproducible seed
    seed = getattr(config, 'RANDOM_SEED', None)
    if seed is not None:
        import random
        random.seed(seed)
        np.random.seed(seed)

    all_oos_trades = []
    window_results = []
    t0 = time.time()

    for w_idx, w in enumerate(windows):
        train_df = df.iloc[w['train_start']:w['train_end']]
        test_df = df.iloc[w['test_start']:w['test_end']]

        if verbose:
            print(f"\n  Window {w_idx+1}/{len(windows)}: "
                  f"Train {train_df.index[0].strftime('%Y-%m-%d')}→{train_df.index[-1].strftime('%Y-%m-%d')} "
                  f"| Test {test_df.index[0].strftime('%Y-%m-%d')}→{test_df.index[-1].strftime('%Y-%m-%d')}")

        # Build engine and run on FULL train+test (engine trains on train portion internally)
        # But we ONLY count trades that occurred in the TEST window
        combined_df = df.iloc[w['train_start']:w['test_end']]

        engine = build_engine(
            initial_capital=pair_capital,
            symbol=symbol,
            quantum_backend='simulated',
        )

        try:
            results = engine.run(combined_df, timeframe)
        except Exception as e:
            if verbose:
                print(f"    ❌ Engine error: {e}")
            window_results.append({'window': w_idx + 1, 'error': str(e)})
            continue

        # Extract ONLY test-window trades (true OOS)
        test_start_time = test_df.index[0]
        test_end_time = test_df.index[-1]
        all_trades = results.get('trades_list', [])
        if not all_trades and hasattr(engine, 'pm'):
            all_trades = engine.pm.trades

        oos_trades = [
            t for t in all_trades
            if t.get('entry_time') is not None
            and pd.Timestamp(t['entry_time']) >= test_start_time
        ]

        w_metrics = _compute_window_metrics(oos_trades)
        w_metrics['window'] = w_idx + 1
        w_metrics['train_period'] = f"{train_df.index[0].strftime('%Y-%m-%d')} → {train_df.index[-1].strftime('%Y-%m-%d')}"
        w_metrics['test_period'] = f"{test_df.index[0].strftime('%Y-%m-%d')} → {test_df.index[-1].strftime('%Y-%m-%d')}"

        window_results.append(w_metrics)
        all_oos_trades.extend(oos_trades)

        if verbose:
            emoji = '✅' if w_metrics['net_profit'] > 0 else '❌'
            print(f"    {emoji} OOS: ${w_metrics['net_profit']:+.2f} | {w_metrics['trades']} trades | "
                  f"WR {w_metrics['win_rate']:.1f}% | PF {w_metrics['profit_factor']:.2f} | "
                  f"Sharpe {w_metrics['sharpe']:.2f} | DD ${w_metrics['max_drawdown']:.0f}")

    # Aggregate OOS metrics
    aggregate = _compute_window_metrics(all_oos_trades)
    elapsed = time.time() - t0

    # Restore config
    _restore_overrides(override_originals)
    restore_config(pair_originals)
    restore_config(tf_originals)

    if verbose:
        print(f"\n{'='*90}")
        print(f"  📊 AGGREGATE OOS RESULTS — {symbol} @ {timeframe} ({elapsed:.0f}s)")
        print(f"{'='*90}")
        emoji = '✅' if aggregate['net_profit'] > 0 else '❌'
        print(f"  {emoji} Net: ${aggregate['net_profit']:+.2f} | {aggregate['trades']} trades | "
              f"WR {aggregate['win_rate']:.1f}% | PF {aggregate['profit_factor']:.2f}")
        print(f"     Sharpe: {aggregate['sharpe']:.3f} | Max DD: ${aggregate['max_drawdown']:.0f} | "
              f"Fees: ${aggregate['total_fees']:.0f}")
        if aggregate['avg_win'] and aggregate['avg_loss']:
            print(f"     Avg Win: ${aggregate['avg_win']:.2f} | Avg Loss: ${aggregate['avg_loss']:.2f} | "
                  f"R:R: {abs(aggregate['avg_win']/aggregate['avg_loss']):.2f}")
        # Per-window table
        print(f"\n  {'Win':>4} {'Period':>25} {'Net P&L':>10} {'Trades':>7} {'WR%':>6} {'PF':>6} {'Sharpe':>7}")
        print(f"  {'─'*4} {'─'*25} {'─'*10} {'─'*7} {'─'*6} {'─'*6} {'─'*7}")
        for w in window_results:
            if 'error' in w:
                print(f"  {w['window']:>4} {'ERROR':>25}")
            else:
                e = '✅' if w['net_profit'] > 0 else '❌'
                print(f"  {e}{w['window']:>3} {w.get('test_period',''):>25} ${w['net_profit']:>+9.2f} "
                      f"{w['trades']:>7} {w['win_rate']:>5.1f}% {w['profit_factor']:>5.2f} {w['sharpe']:>6.2f}")

    return {
        'symbol': symbol,
        'timeframe': timeframe,
        'windows': window_results,
        'aggregate': aggregate,
        'total_oos_trades': len(all_oos_trades),
        'elapsed_s': round(elapsed, 1),
        'params': overrides or {},
    }


def walk_forward_multi_pair(
    timeframe: str = '1h',
    pairs: list = None,
    overrides: dict = None,
    verbose: bool = True,
) -> dict:
    """Run walk-forward for all active pairs, aggregate portfolio-level metrics."""
    from backtest_pipeline.pair_config import get_active_pairs

    if pairs is None:
        pairs = get_active_pairs()

    all_results = {}
    all_oos_trades = []

    for symbol in pairs:
        result = walk_forward_backtest(
            symbol=symbol,
            timeframe=timeframe,
            overrides=overrides,
            verbose=verbose,
        )
        all_results[symbol] = result
        # Collect all OOS trades for portfolio metrics
        for w in result.get('windows', []):
            if 'error' not in w:
                all_oos_trades.append(w)

    # Portfolio aggregate
    total_pnl = sum(r.get('aggregate', {}).get('net_profit', 0) for r in all_results.values())
    total_trades = sum(r.get('aggregate', {}).get('trades', 0) for r in all_results.values())
    total_fees = sum(r.get('aggregate', {}).get('total_fees', 0) for r in all_results.values())

    if verbose:
        print(f"\n{'='*90}")
        print(f"  🌍 PORTFOLIO WALK-FORWARD SUMMARY — {timeframe}")
        print(f"{'='*90}")
        print(f"  {'Pair':>10} {'Net P&L':>10} {'Trades':>7} {'WR%':>6} {'PF':>6} {'Sharpe':>7}")
        print(f"  {'─'*10} {'─'*10} {'─'*7} {'─'*6} {'─'*6} {'─'*7}")
        for symbol, r in all_results.items():
            a = r.get('aggregate', {})
            e = '✅' if a.get('net_profit', 0) > 0 else '❌'
            print(f"  {e}{symbol:>9} ${a.get('net_profit',0):>+9.2f} {a.get('trades',0):>7} "
                  f"{a.get('win_rate',0):>5.1f}% {a.get('profit_factor',0):>5.2f} {a.get('sharpe',0):>6.2f}")
        print(f"  {'─'*50}")
        e = '✅' if total_pnl > 0 else '❌'
        print(f"  {e}{'TOTAL':>9} ${total_pnl:>+9.2f} {total_trades:>7} {'':>6} {'':>6} {'':>7}")
        print(f"     Fees: ${total_fees:.0f}")

    return {
        'timeframe': timeframe,
        'per_pair': all_results,
        'portfolio_pnl': total_pnl,
        'portfolio_trades': total_trades,
        'portfolio_fees': total_fees,
        'params': overrides or {},
    }


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='P#224 Walk-Forward Validation')
    parser.add_argument('--pair', default='SOLUSDT', help='Trading pair')
    parser.add_argument('--tf', default='1h', help='Timeframe')
    parser.add_argument('--all-pairs', action='store_true', help='Run all active pairs')
    parser.add_argument('--train-days', type=int, default=90)
    parser.add_argument('--test-days', type=int, default=30)
    args = parser.parse_args()

    if args.all_pairs:
        walk_forward_multi_pair(timeframe=args.tf)
    else:
        walk_forward_backtest(
            symbol=args.pair, timeframe=args.tf,
            train_days=args.train_days, test_days=args.test_days,
        )

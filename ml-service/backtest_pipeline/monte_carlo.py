#!/usr/bin/env python3
"""
Monte Carlo Significance Test for Turbo-Bot Backtest Results.
PATCH #195 — Faza 2.1

Loads trades_list from backtest results, shuffles P&L 10K times,
and tests whether observed metrics are statistically significant.
"""

import json
import sys
import os
import numpy as np
from pathlib import Path


def load_trades(results_dir: str) -> dict:
    """Load trades from all timeframes in a results directory."""
    results_dir = Path(results_dir)
    all_trades = {}
    
    for tf in ['15m', '1h', '4h']:
        fpath = results_dir / f'multi_{tf}.json'
        if not fpath.exists():
            continue
        with open(fpath) as f:
            data = json.load(f)
        
        trades = []
        for pair, pdata in data.get('result', {}).items():
            for t in pdata.get('trades_list', []):
                t['pair'] = pair
                t['timeframe'] = tf
                trades.append(t)
        
        if trades:
            all_trades[tf] = trades
    
    return all_trades


def calculate_metrics(pnls: np.ndarray) -> dict:
    """Calculate trading metrics from P&L array."""
    if len(pnls) == 0:
        return {'sharpe': 0, 'total_pnl': 0, 'profit_factor': 0, 'win_rate': 0, 'max_dd': 0}
    
    total_pnl = float(np.sum(pnls))
    wins = pnls[pnls > 0]
    losses = pnls[pnls < 0]
    win_rate = len(wins) / len(pnls) if len(pnls) > 0 else 0
    
    gross_profit = float(np.sum(wins)) if len(wins) > 0 else 0
    gross_loss = float(np.abs(np.sum(losses))) if len(losses) > 0 else 0.001
    profit_factor = gross_profit / gross_loss
    
    mean_ret = np.mean(pnls)
    std_ret = np.std(pnls)
    sharpe = float(mean_ret / std_ret * np.sqrt(252)) if std_ret > 0 else 0
    
    # Max drawdown from cumulative P&L
    cum = np.cumsum(pnls)
    peak = np.maximum.accumulate(cum)
    dd = peak - cum
    max_dd = float(np.max(dd)) if len(dd) > 0 else 0
    
    return {
        'sharpe': round(sharpe, 3),
        'total_pnl': round(total_pnl, 2),
        'profit_factor': round(profit_factor, 3),
        'win_rate': round(win_rate * 100, 1),
        'max_dd': round(max_dd, 2),
    }


def monte_carlo_test(pnls: np.ndarray, n_simulations: int = 10000) -> dict:
    """
    Monte Carlo significance test.
    
    Shuffles the trade P&L series n_simulations times and compares
    observed metrics against the distribution of random outcomes.
    
    Returns p-values for each metric (lower = more significant).
    """
    if len(pnls) < 5:
        return {'error': 'Too few trades for Monte Carlo test'}
    
    observed = calculate_metrics(pnls)
    
    rng = np.random.default_rng(42)
    
    sim_sharpe = np.zeros(n_simulations)
    sim_pnl = np.zeros(n_simulations)
    sim_pf = np.zeros(n_simulations)
    sim_wr = np.zeros(n_simulations)
    
    for i in range(n_simulations):
        # Shuffle the P&L values (random order)
        shuffled = rng.permutation(pnls)
        # Randomly flip signs (null hypothesis: no directional edge)
        signs = rng.choice([-1, 1], size=len(pnls))
        randomized = pnls * signs
        
        m = calculate_metrics(randomized)
        sim_sharpe[i] = m['sharpe']
        sim_pnl[i] = m['total_pnl']
        sim_pf[i] = m['profit_factor']
        sim_wr[i] = m['win_rate']
    
    # P-values: fraction of simulations that beat observed
    p_sharpe = float(np.mean(sim_sharpe >= observed['sharpe']))
    p_pnl = float(np.mean(sim_pnl >= observed['total_pnl']))
    p_pf = float(np.mean(sim_pf >= observed['profit_factor']))
    p_wr = float(np.mean(sim_wr >= observed['win_rate']))
    
    # Confidence intervals (5th-95th percentile)
    ci_pnl = (float(np.percentile(sim_pnl, 5)), float(np.percentile(sim_pnl, 95)))
    ci_sharpe = (float(np.percentile(sim_sharpe, 5)), float(np.percentile(sim_sharpe, 95)))
    
    return {
        'observed': observed,
        'n_simulations': n_simulations,
        'n_trades': len(pnls),
        'p_values': {
            'sharpe': round(p_sharpe, 4),
            'total_pnl': round(p_pnl, 4),
            'profit_factor': round(p_pf, 4),
            'win_rate': round(p_wr, 4),
        },
        'significant': {
            'sharpe': p_sharpe < 0.05,
            'total_pnl': p_pnl < 0.05,
            'profit_factor': p_pf < 0.05,
            'win_rate': p_wr < 0.05,
        },
        'ci_95_pnl': (round(ci_pnl[0], 2), round(ci_pnl[1], 2)),
        'ci_95_sharpe': (round(ci_sharpe[0], 2), round(ci_sharpe[1], 2)),
        'sim_mean_pnl': round(float(np.mean(sim_pnl)), 2),
        'sim_std_pnl': round(float(np.std(sim_pnl)), 2),
    }


def trade_attribution(trades: list) -> dict:
    """Per-strategy, per-pair, per-regime trade attribution."""
    from collections import defaultdict
    
    by_strategy = defaultdict(lambda: {'count': 0, 'pnl': 0, 'wins': 0, 'losses': 0})
    by_pair = defaultdict(lambda: {'count': 0, 'pnl': 0, 'wins': 0, 'losses': 0})
    by_regime = defaultdict(lambda: {'count': 0, 'pnl': 0, 'wins': 0, 'losses': 0})
    by_exit = defaultdict(lambda: {'count': 0, 'pnl': 0, 'wins': 0, 'losses': 0})
    by_side = defaultdict(lambda: {'count': 0, 'pnl': 0, 'wins': 0, 'losses': 0})
    
    for t in trades:
        net = t.get('net_pnl', 0)
        is_win = net > 0
        
        for grouper, key in [
            (by_pair, 'pair'), (by_regime, 'regime'), 
            (by_exit, 'reason'), (by_side, 'side')
        ]:
            k = str(t.get(key, 'unknown'))
            grouper[k]['count'] += 1
            grouper[k]['pnl'] += net
            if is_win:
                grouper[k]['wins'] += 1
            else:
                grouper[k]['losses'] += 1
        
        # Strategy attribution (if available)
        strategies = t.get('strategies', [])
        if strategies:
            for s in strategies:
                by_strategy[s]['count'] += 1
                by_strategy[s]['pnl'] += net / len(strategies)  # Split equally
                if is_win:
                    by_strategy[s]['wins'] += 1
                else:
                    by_strategy[s]['losses'] += 1
    
    def format_group(group):
        result = {}
        for k, v in sorted(group.items(), key=lambda x: x[1]['pnl']):
            wr = v['wins'] / v['count'] * 100 if v['count'] > 0 else 0
            result[k] = {
                'trades': v['count'],
                'pnl': round(v['pnl'], 2),
                'win_rate': round(wr, 1),
            }
        return result
    
    return {
        'by_strategy': format_group(by_strategy),
        'by_pair': format_group(by_pair),
        'by_regime': format_group(by_regime),
        'by_exit_reason': format_group(by_exit),
        'by_side': format_group(by_side),
    }


def main():
    if len(sys.argv) < 2:
        # Default: latest results directory
        results_base = Path(__file__).parent.parent / 'results'
        dirs = sorted([d for d in results_base.iterdir() 
                       if d.is_dir() and d.name.startswith('remote_gpu_full_')])
        if dirs:
            results_dir = str(dirs[-1])
        else:
            print("Usage: python monte_carlo.py <results_directory>")
            sys.exit(1)
    else:
        results_dir = sys.argv[1]
    
    print(f"{'='*70}")
    print(f"MONTE CARLO SIGNIFICANCE TEST — Turbo-Bot P#195 Faza 2")
    print(f"Results: {results_dir}")
    print(f"{'='*70}")
    
    all_trades = load_trades(results_dir)
    
    if not all_trades:
        print("No trades found in results directory!")
        sys.exit(1)
    
    # Combined directional trades (all TFs)
    combined_pnls = []
    combined_trades = []
    
    for tf, trades in sorted(all_trades.items()):
        pnls = np.array([t['net_pnl'] for t in trades])
        
        print(f"\n{'─'*50}")
        print(f"TIMEFRAME: {tf} ({len(trades)} directional trades)")
        print(f"{'─'*50}")
        
        # Monte Carlo test
        mc = monte_carlo_test(pnls, n_simulations=10000)
        
        if 'error' in mc:
            print(f"  {mc['error']}")
            continue
        
        obs = mc['observed']
        print(f"\n  Observed metrics:")
        print(f"    Total PnL:     ${obs['total_pnl']:>8.2f}")
        print(f"    Sharpe:        {obs['sharpe']:>8.3f}")
        print(f"    Profit Factor: {obs['profit_factor']:>8.3f}")
        print(f"    Win Rate:      {obs['win_rate']:>7.1f}%")
        print(f"    Max Drawdown:  ${obs['max_dd']:>8.2f}")
        
        print(f"\n  Monte Carlo ({mc['n_simulations']} simulations):")
        print(f"    Random mean PnL: ${mc['sim_mean_pnl']:>8.2f} ± ${mc['sim_std_pnl']:.2f}")
        print(f"    95% CI PnL:      ${mc['ci_95_pnl'][0]:.2f} to ${mc['ci_95_pnl'][1]:.2f}")
        print(f"    95% CI Sharpe:   {mc['ci_95_sharpe'][0]:.3f} to {mc['ci_95_sharpe'][1]:.3f}")
        
        print(f"\n  P-values (< 0.05 = significant edge):")
        for metric, pval in mc['p_values'].items():
            sig = "✅ SIGNIFICANT" if mc['significant'][metric] else "❌ NOT significant"
            print(f"    {metric:15s}: p={pval:.4f} {sig}")
        
        # Trade attribution
        attr = trade_attribution(trades)
        
        print(f"\n  Attribution by PAIR:")
        for k, v in attr['by_pair'].items():
            print(f"    {k:12s}: {v['trades']:3d} trades, PnL=${v['pnl']:>8.2f}, WR={v['win_rate']:.0f}%")
        
        print(f"\n  Attribution by REGIME:")
        for k, v in attr['by_regime'].items():
            print(f"    {k:20s}: {v['trades']:3d} trades, PnL=${v['pnl']:>8.2f}, WR={v['win_rate']:.0f}%")
        
        print(f"\n  Attribution by EXIT:")
        for k, v in attr['by_exit_reason'].items():
            print(f"    {k:20s}: {v['trades']:3d} trades, PnL=${v['pnl']:>8.2f}, WR={v['win_rate']:.0f}%")
        
        if attr['by_strategy']:
            print(f"\n  Attribution by STRATEGY:")
            for k, v in attr['by_strategy'].items():
                print(f"    {k:20s}: {v['trades']:3d} trades, PnL=${v['pnl']:>8.2f}, WR={v['win_rate']:.0f}%")
        
        combined_pnls.extend(pnls.tolist())
        combined_trades.extend(trades)
    
    # Combined all-TF test
    if len(combined_pnls) >= 5:
        print(f"\n{'='*70}")
        print(f"COMBINED ALL TIMEFRAMES ({len(combined_pnls)} trades)")
        print(f"{'='*70}")
        
        combined_arr = np.array(combined_pnls)
        mc = monte_carlo_test(combined_arr, n_simulations=10000)
        
        obs = mc['observed']
        print(f"\n  Observed: PnL=${obs['total_pnl']:.2f}, Sharpe={obs['sharpe']:.3f}, PF={obs['profit_factor']:.3f}, WR={obs['win_rate']:.1f}%")
        print(f"  Random:   PnL=${mc['sim_mean_pnl']:.2f} ± ${mc['sim_std_pnl']:.2f}")
        
        print(f"\n  P-values:")
        all_sig = True
        for metric, pval in mc['p_values'].items():
            sig = "✅" if mc['significant'][metric] else "❌"
            all_sig = all_sig and mc['significant'][metric]
            print(f"    {metric:15s}: p={pval:.4f} {sig}")
        
        verdict = "STATISTICALLY SIGNIFICANT EDGE" if all_sig else "NO SIGNIFICANT EDGE — improve entry quality"
        print(f"\n  VERDICT: {verdict}")


if __name__ == '__main__':
    main()

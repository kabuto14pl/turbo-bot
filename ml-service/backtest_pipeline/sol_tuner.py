"""
P#239: SOL Auto-Tuner — Iterative backtest loop targeting $1,500+ PnL.

Sequential smart tuning: each phase tests a small number of variations,
picks the winner, and feeds it into the next phase. ~20 total runs.

Usage:
    cd ml-service
    python -m backtest_pipeline.sol_tuner
"""

import os
import sys
import json
import copy
import time
import numpy as np
import pandas as pd
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backtest_pipeline import config
from backtest_pipeline.runner import load_pair_data, build_engine
from backtest_pipeline.pair_config import (
    apply_pair_overrides, restore_config, apply_timeframe_overrides,
    get_pair_capital, PORTFOLIO_CAPITAL, PAIR_CAPITAL_ALLOCATION,
)

SYMBOL = 'SOLUSDT'
TIMEFRAME = '4h'
TARGET_PNL = 1500.0

RESULTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'results', 'sol_tuner')
os.makedirs(RESULTS_DIR, exist_ok=True)


def run_sol_backtest(overrides: dict, capital: float = None) -> dict:
    """Run a single SOL 4h backtest with given overrides on top of pair config."""
    pair_originals = apply_pair_overrides(SYMBOL)
    tf_originals = apply_timeframe_overrides(TIMEFRAME)

    extra_originals = {}
    for param, value in overrides.items():
        if hasattr(config, param):
            extra_originals[param] = getattr(config, param)
        else:
            extra_originals[param] = None
        setattr(config, param, value)

    pair_capital = capital or get_pair_capital(SYMBOL)

    df = load_pair_data(SYMBOL, TIMEFRAME)
    if df is None:
        raise FileNotFoundError(f"No data for {SYMBOL} {TIMEFRAME}")

    engine = build_engine(initial_capital=pair_capital, symbol=SYMBOL)
    results = engine.run(df, TIMEFRAME)
    results['symbol'] = SYMBOL
    results['pair_capital'] = pair_capital

    for param, orig_val in extra_originals.items():
        if orig_val is None:
            if hasattr(config, param):
                delattr(config, param)
        else:
            setattr(config, param, orig_val)
    restore_config(pair_originals)
    if tf_originals:
        restore_config(tf_originals)

    return results


def extract_metrics(results: dict) -> dict:
    """Extract key metrics from backtest results."""
    funding = results.get('funding_arb_pnl', 0)
    net = results.get('net_profit', 0) + funding
    return {
        'pnl': net,
        'net_profit': results.get('net_profit', 0),
        'funding_pnl': funding,
        'trades': results.get('total_trades', 0),
        'win_rate': results.get('win_rate', 0),
        'sharpe': results.get('sharpe_ratio', 0),
        'profit_factor': results.get('profit_factor', 0),
        'max_drawdown': results.get('max_drawdown', 0),
        'fees': results.get('total_fees', 0),
        'avg_win': results.get('avg_win', 0),
        'avg_loss': results.get('avg_loss', 0),
        'long_pnl': results.get('long_pnl', 0),
        'short_pnl': results.get('short_pnl', 0),
        'long_trades': results.get('long_trades', 0),
        'short_trades': results.get('short_trades', 0),
    }


def log_run(idx, total, m, tag, best_pnl):
    emoji = '✅' if m['pnl'] > 0 else '❌'
    star = ' ⭐ BEST' if m['pnl'] > best_pnl else ''
    print(f"  [{idx}/{total}] {emoji} PnL=${m['pnl']:>+9.2f} | "
          f"T={m['trades']:>3} WR={m['win_rate']:>5.1f}% PF={m['profit_factor']:.3f} "
          f"Sh={m['sharpe']:>+6.2f} DD={m['max_drawdown']:>5.1f}% | {tag}{star}")


def sweep(label, base_overrides, param_name, values, capital=None):
    """Sweep a single param, return best value + metrics."""
    print(f"\n  {'─'*80}")
    print(f"  {label}: sweeping {param_name} = {values}")
    print(f"  {'─'*80}")

    best_pnl = -1e9
    best_val = values[0]
    best_m = None
    log = []

    for i, val in enumerate(values):
        overrides = {**base_overrides, param_name: val}
        t0 = time.time()
        try:
            res = run_sol_backtest(overrides, capital=capital)
            m = extract_metrics(res)
        except Exception as e:
            print(f"  [{i+1}/{len(values)}] ❌ ERROR: {e}")
            continue
        dt = time.time() - t0

        log_run(i + 1, len(values), m, f"{param_name}={val} ({dt:.0f}s)", best_pnl)
        log.append({**overrides, **m, 'capital': capital})

        if m['pnl'] > best_pnl:
            best_pnl = m['pnl']
            best_val = val
            best_m = m

    print(f"  → Winner: {param_name}={best_val} → PnL=${best_pnl:+.2f}")
    return best_val, best_m, log


def multi_sweep(label, base_overrides, param_dict, capital=None):
    """Sweep multiple params simultaneously (all combos)."""
    import itertools
    keys = list(param_dict.keys())
    combos = list(itertools.product(*[param_dict[k] for k in keys]))

    print(f"\n  {'─'*80}")
    print(f"  {label}: {len(combos)} combos of {', '.join(keys)}")
    print(f"  {'─'*80}")

    best_pnl = -1e9
    best_combo = {}
    best_m = None
    log = []

    for i, combo in enumerate(combos):
        ov = {**base_overrides, **dict(zip(keys, combo))}
        tag = ' '.join(f"{k}={v}" for k, v in zip(keys, combo))
        t0 = time.time()
        try:
            res = run_sol_backtest(ov, capital=capital)
            m = extract_metrics(res)
        except Exception as e:
            print(f"  [{i+1}/{len(combos)}] ❌ ERROR: {e}")
            continue
        dt = time.time() - t0

        log_run(i + 1, len(combos), m, f"{tag} ({dt:.0f}s)", best_pnl)
        log.append({**ov, **m, 'capital': capital})

        if m['pnl'] > best_pnl:
            best_pnl = m['pnl']
            best_combo = dict(zip(keys, combo))
            best_m = m

    print(f"  → Winner: {best_combo} → PnL=${best_pnl:+.2f}")
    return best_combo, best_m, log


def save_results(all_logs, best_config, best_metrics, best_capital):
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    result = {
        'timestamp': ts,
        'symbol': SYMBOL,
        'timeframe': TIMEFRAME,
        'target_pnl': TARGET_PNL,
        'best_config': best_config,
        'best_metrics': best_metrics,
        'best_capital': best_capital,
        'all_runs': all_logs,
    }
    path = os.path.join(RESULTS_DIR, f'sol_tuner_{ts}.json')
    with open(path, 'w') as f:
        json.dump(result, f, indent=2, default=str)
    print(f"\n  📁 Results saved: {path}")
    return path


def main():
    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║  P#239: SOL AUTO-TUNER — Target $1,500+ PnL on 4h             ║")
    print("║  Sequential smart tuning: ~20 runs × ~2min = ~40min            ║")
    print("╚══════════════════════════════════════════════════════════════════╝")

    t0 = time.time()
    all_logs = []
    cfg = {}

    # ── Phase 1: Confidence sweep (most impactful filter) ────────────────
    best_conf, best_m, log = sweep(
        "PHASE 1: Confidence", cfg,
        'GPU_NATIVE_MIN_CONFIDENCE',
        [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80],
    )
    cfg['GPU_NATIVE_MIN_CONFIDENCE'] = best_conf
    all_logs.extend(log)
    if best_m and best_m['pnl'] >= TARGET_PNL:
        print(f"\n  🎯 TARGET HIT in Phase 1!")
    
    # ── Phase 2: SL/TP combo sweep ───────────────────────────────────────
    best_sltp, best_m2, log = multi_sweep(
        "PHASE 2: SL/TP", cfg,
        {
            'SL_ATR_MULT': [1.25, 1.50, 1.75, 2.00, 2.50],
            'TP_ATR_MULT': [2.75, 3.50, 4.00, 5.00, 6.00],
        },
    )
    cfg.update(best_sltp)
    if best_m2 and best_m2['pnl'] > (best_m['pnl'] if best_m else -1e9):
        best_m = best_m2
    all_logs.extend(log)
    if best_m and best_m['pnl'] >= TARGET_PNL:
        print(f"\n  🎯 TARGET HIT in Phase 2!")

    # ── Phase 3: Risk per trade (linear PnL scaler) ─────────────────────
    best_risk, best_m3, log = sweep(
        "PHASE 3: Risk Per Trade", cfg,
        'RISK_PER_TRADE',
        [0.06, 0.08, 0.10, 0.12, 0.15, 0.18],
    )
    cfg['RISK_PER_TRADE'] = best_risk
    if best_m3 and best_m3['pnl'] > (best_m['pnl'] if best_m else -1e9):
        best_m = best_m3
    all_logs.extend(log)
    if best_m and best_m['pnl'] >= TARGET_PNL:
        print(f"\n  🎯 TARGET HIT in Phase 3!")

    # ── Phase 4: Trailing distance ───────────────────────────────────────
    best_trail, best_m4, log = sweep(
        "PHASE 4: Trailing", cfg,
        'TRAILING_DISTANCE_ATR',
        [0.60, 0.75, 0.85, 1.00, 1.25],
    )
    cfg['TRAILING_DISTANCE_ATR'] = best_trail
    if best_m4 and best_m4['pnl'] > (best_m['pnl'] if best_m else -1e9):
        best_m = best_m4
    all_logs.extend(log)

    # ── Phase 5: Capital allocation scaling ──────────────────────────────
    print(f"\n  {'─'*80}")
    print(f"  PHASE 5: Capital Scaling (current alloc={PAIR_CAPITAL_ALLOCATION.get(SYMBOL, 0.45):.0%})")
    print(f"  {'─'*80}")

    best_capital = get_pair_capital(SYMBOL)
    best_alloc = PAIR_CAPITAL_ALLOCATION.get(SYMBOL, 0.45)
    cap_log = []
    best_pnl_cap = best_m['pnl'] if best_m else -1e9

    for alloc in [0.55, 0.65, 0.75, 0.85, 1.00]:
        capital = int(PORTFOLIO_CAPITAL * alloc)
        t1 = time.time()
        try:
            res = run_sol_backtest(cfg, capital=capital)
            m = extract_metrics(res)
        except Exception as e:
            print(f"  alloc={alloc:.0%} ❌ ERROR: {e}")
            continue
        dt = time.time() - t1

        star = ' ⭐ BEST' if m['pnl'] > best_pnl_cap else ''
        emoji = '✅' if m['pnl'] > 0 else '❌'
        print(f"  {emoji} alloc={alloc:.0%} (${capital:,}) → PnL=${m['pnl']:>+9.2f} | "
              f"T={m['trades']:>3} Sh={m['sharpe']:>+6.2f} ({dt:.0f}s){star}")
        cap_log.append({**cfg, **m, 'alloc': alloc, 'capital': capital})

        if m['pnl'] > best_pnl_cap:
            best_pnl_cap = m['pnl']
            best_capital = capital
            best_alloc = alloc
            best_m = m

    all_logs.extend(cap_log)

    elapsed = time.time() - t0

    # ── Save & Report ────────────────────────────────────────────────────
    path = save_results(all_logs, cfg, best_m, best_capital)

    print(f"\n{'═' * 90}")
    print(f"  P#239 SOL TUNER — FINAL RESULTS")
    print(f"{'═' * 90}")
    hit = '✅ TARGET HIT' if best_m['pnl'] >= TARGET_PNL else '❌ TARGET NOT HIT'
    print(f"  {hit}: ${best_m['pnl']:+.2f} (target: ${TARGET_PNL:+.2f})")
    print(f"  Time: {elapsed:.0f}s ({elapsed/60:.1f}min)")
    print(f"  Trades: {best_m['trades']} | WR: {best_m['win_rate']:.1f}% | "
          f"PF: {best_m['profit_factor']:.3f} | Sharpe: {best_m['sharpe']:.3f}")
    print(f"  DD: {best_m['max_drawdown']:.1f}% | Fees: ${best_m['fees']:.2f}")
    print(f"  Config: {cfg}")
    print(f"  Capital: ${best_capital:,} ({best_alloc:.0%})")

    if best_m['pnl'] >= TARGET_PNL:
        print(f"\n  📋 RECOMMENDED pair_config.py UPDATE:")
        for k, v in cfg.items():
            print(f"        '{k}': {v!r},")
        if best_alloc != PAIR_CAPITAL_ALLOCATION.get(SYMBOL, 0.45):
            print(f"\n  📋 RECOMMENDED PAIR_CAPITAL_ALLOCATION:")
            print(f"        'SOLUSDT': {best_alloc},")
            print(f"        'BNBUSDT': {1.0 - best_alloc},")


if __name__ == '__main__':
    main()

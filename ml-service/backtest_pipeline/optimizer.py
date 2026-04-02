"""
P#224: Professional Optuna Hyperparameter Optimizer for GPU Backtest Engine.

Runs Bayesian optimization (TPE sampler) over the full param space:
  - TP/SL multipliers, confidence thresholds, cooldowns
  - Breakeven R, ensemble weight, grid ADX threshold
  - Walk-forward OOS scoring (not in-sample overfit!)

Scoring: Sharpe × 100 + PF × 50 + totalPnL / 1000
  → Balanced between risk-adjusted return, consistency, and absolute profit

Usage:
    cd ml-service
    python -m backtest_pipeline.optimizer                         # full run (120 trials)
    python -m backtest_pipeline.optimizer --n-trials 30 --quick   # quick test
    python -m backtest_pipeline.optimizer --pair SOLUSDT --tf 4h  # single pair
    python -m backtest_pipeline.optimizer --resume                # resume previous study
    python -m backtest_pipeline.optimizer --show-best             # show best params
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path

import numpy as np

# Optuna import with graceful fallback
try:
    import optuna
    from optuna.samplers import TPESampler
    OPTUNA_AVAILABLE = True
except ImportError:
    OPTUNA_AVAILABLE = False
    print("⚠️ Optuna not installed. Run: pip install optuna")

from backtest_pipeline import config
from backtest_pipeline.walk_forward import walk_forward_backtest, walk_forward_multi_pair
from backtest_pipeline.pair_config import get_active_pairs


def _build_overrides_from_trial(trial) -> dict:
    """Build config overrides dict from Optuna trial suggestions."""
    tp_range = getattr(config, 'OPT_TP_MULT_RANGE', (2.0, 4.0))
    sl_range = getattr(config, 'OPT_SL_MULT_RANGE', (1.0, 2.5))
    conf_range = getattr(config, 'OPT_CONF_FLOOR_RANGE', (0.35, 0.55))
    ml_conf_range = getattr(config, 'OPT_ML_CONF_RANGE', (0.55, 0.80))
    grid_adx_range = getattr(config, 'OPT_GRID_ADX_RANGE', (18, 28))
    cd_15m_range = getattr(config, 'OPT_COOLDOWN_15M_RANGE', (8, 36))
    cd_1h_range = getattr(config, 'OPT_COOLDOWN_1H_RANGE', (4, 16))
    be_range = getattr(config, 'OPT_BE_R_RANGE', (0.5, 1.2))
    ens_range = getattr(config, 'OPT_ENSEMBLE_W_RANGE', (0.10, 0.50))

    overrides = {
        'TP_ATR_MULT': trial.suggest_float('tp_mult', tp_range[0], tp_range[1], step=0.25),
        'SL_ATR_MULT': trial.suggest_float('sl_mult', sl_range[0], sl_range[1], step=0.25),
        'CONFIDENCE_FLOOR': trial.suggest_float('confidence_floor', conf_range[0], conf_range[1], step=0.05),
        'GPU_NATIVE_MIN_CONFIDENCE': trial.suggest_float('ml_min_conf', ml_conf_range[0], ml_conf_range[1], step=0.05),
        'GRID_MAX_ADX': trial.suggest_int('grid_adx', grid_adx_range[0], grid_adx_range[1]),
        'GPU_NATIVE_COOLDOWN_CANDLES': {
            '15m': trial.suggest_int('cooldown_15m', cd_15m_range[0], cd_15m_range[1], step=4),
            '1h': trial.suggest_int('cooldown_1h', cd_1h_range[0], cd_1h_range[1], step=2),
            '4h': 3,
        },
        # P#225: Set PHASE_2_BE_R directly (works regardless of SIMPLE_EXITS mode)
        'PHASE_2_BE_R': trial.suggest_float('be_r', be_range[0], be_range[1], step=0.1),
        'GPU_NATIVE_ENSEMBLE_WEIGHT': trial.suggest_float('ensemble_w', ens_range[0], ens_range[1], step=0.05),
        # Categorical
        'GPU_NATIVE_BLOCK_HV_15M': trial.suggest_categorical('block_hv_15m', [True, False]),
        'GPU_NATIVE_DISABLE_TIME_UW': trial.suggest_categorical('disable_time_uw', [True, False]),
        'GPU_NATIVE_SIMPLE_EXITS': trial.suggest_categorical('simple_exits', [True, False]),
        # Monte Carlo slippage perturbation
        'SLIPPAGE_RATE': trial.suggest_float('slippage_bps', 0.0001, 0.0008, step=0.0001),
    }

    # Long confidence add — only if simple_exits enabled
    if overrides['GPU_NATIVE_SIMPLE_EXITS']:
        overrides['GPU_NATIVE_LONG_CONF_ADD'] = trial.suggest_float('long_conf_add', 0.0, 0.10, step=0.02)

    # P#225: derive PHASE_1_MIN_R from PHASE_2_BE_R
    overrides['PHASE_1_MIN_R'] = overrides['PHASE_2_BE_R'] - 0.1

    return overrides


def _score_result(result: dict) -> float:
    """
    Compute optimization score from walk-forward result.

    Score = Sharpe × 100 + PF × 50 + totalPnL / 1000 - maxDD_penalty
    Penalize: low trades, negative Sharpe, high drawdown
    """
    agg = result.get('aggregate', {})
    if not agg or agg.get('trades', 0) < getattr(config, 'WF_MIN_TRADES', 20):
        return -1000  # Not enough trades

    sharpe = agg.get('sharpe', 0)
    pf = agg.get('profit_factor', 0)
    pnl = agg.get('net_profit', 0)
    dd = agg.get('max_drawdown', 0)
    wr = agg.get('win_rate', 0)
    trades = agg.get('trades', 0)

    # Core score
    score = sharpe * 100 + pf * 50 + pnl / 1000

    # Penalties
    if sharpe < 0:
        score -= 200  # Strong penalty for negative Sharpe
    if dd > 1500:  # Max drawdown > $1500
        score -= (dd - 1500) / 10
    if wr < 30:
        score -= (30 - wr) * 5  # Penalty for very low WR
    if trades < 30:
        score -= (30 - trades) * 3  # Penalty for too few trades

    # Bonuses
    if pf > 1.5:
        score += 50  # Bonus for solid PF
    if sharpe > 1.2:
        score += 100  # Bonus for strong Sharpe

    return score


def _create_objective(pair: str, timeframe: str, quick: bool = False):
    """Create Optuna objective function for a specific pair+TF."""
    def objective(trial):
        overrides = _build_overrides_from_trial(trial)

        # Quick mode: shorter walk-forward windows
        train_days = 60 if quick else None
        test_days = 20 if quick else None

        result = walk_forward_backtest(
            symbol=pair,
            timeframe=timeframe,
            overrides=overrides,
            train_days=train_days,
            test_days=test_days,
            verbose=False,
        )

        if 'error' in result:
            return -1000

        score = _score_result(result)

        # Log key metrics for Optuna dashboard
        agg = result.get('aggregate', {})
        trial.set_user_attr('net_profit', agg.get('net_profit', 0))
        trial.set_user_attr('trades', agg.get('trades', 0))
        trial.set_user_attr('win_rate', agg.get('win_rate', 0))
        trial.set_user_attr('profit_factor', agg.get('profit_factor', 0))
        trial.set_user_attr('sharpe', agg.get('sharpe', 0))
        trial.set_user_attr('max_drawdown', agg.get('max_drawdown', 0))

        return score

    return objective


def _create_multi_pair_objective(timeframe: str, pairs: list, quick: bool = False):
    """Create objective that optimizes across ALL pairs simultaneously."""
    def objective(trial):
        overrides = _build_overrides_from_trial(trial)
        train_days = 60 if quick else None
        test_days = 20 if quick else None

        total_pnl = 0
        total_trades = 0
        total_sharpe_sum = 0
        total_pf_sum = 0
        pair_count = 0

        for symbol in pairs:
            result = walk_forward_backtest(
                symbol=symbol,
                timeframe=timeframe,
                overrides=overrides,
                train_days=train_days,
                test_days=test_days,
                verbose=False,
            )
            if 'error' not in result:
                agg = result.get('aggregate', {})
                total_pnl += agg.get('net_profit', 0)
                total_trades += agg.get('trades', 0)
                total_sharpe_sum += agg.get('sharpe', 0)
                total_pf_sum += agg.get('profit_factor', 0)
                pair_count += 1

        if pair_count == 0 or total_trades < 50:
            return -1000

        avg_sharpe = total_sharpe_sum / pair_count
        avg_pf = total_pf_sum / pair_count

        score = avg_sharpe * 100 + avg_pf * 50 + total_pnl / 1000

        trial.set_user_attr('total_pnl', total_pnl)
        trial.set_user_attr('total_trades', total_trades)
        trial.set_user_attr('avg_sharpe', avg_sharpe)
        trial.set_user_attr('avg_pf', avg_pf)
        trial.set_user_attr('pairs_evaluated', pair_count)

        return score

    return objective


def show_best(study):
    """Pretty-print best trial results."""
    if not study.best_trial:
        print("  ❌ No completed trials yet")
        return

    trial = study.best_trial
    print(f"\n{'='*80}")
    print(f"  🏆 BEST TRIAL — #{trial.number}")
    print(f"{'='*80}")
    print(f"  Score: {trial.value:.2f}")
    print(f"\n  Parameters:")
    for k, v in sorted(trial.params.items()):
        print(f"    {k}: {v}")
    print(f"\n  Metrics:")
    for k, v in sorted(trial.user_attrs.items()):
        if isinstance(v, float):
            print(f"    {k}: {v:.4f}")
        else:
            print(f"    {k}: {v}")

    # Generate config snippet
    print(f"\n  Config snippet (copy to config.py):")
    print(f"  {'─'*60}")
    param_map = {
        'tp_mult': 'TP_ATR_MULT',
        'sl_mult': 'SL_ATR_MULT',
        'confidence_floor': 'CONFIDENCE_FLOOR',
        'ml_min_conf': 'GPU_NATIVE_MIN_CONFIDENCE',
        'grid_adx': 'GRID_MAX_ADX',
        'be_r': 'PHASE_2_BE_R',
        'ensemble_w': 'GPU_NATIVE_ENSEMBLE_WEIGHT',
        'block_hv_15m': 'GPU_NATIVE_BLOCK_HV_15M',
        'disable_time_uw': 'GPU_NATIVE_DISABLE_TIME_UW',
        'simple_exits': 'GPU_NATIVE_SIMPLE_EXITS',
        'long_conf_add': 'GPU_NATIVE_LONG_CONF_ADD',
        'slippage_bps': 'SLIPPAGE_RATE',
    }
    for opt_name, config_name in param_map.items():
        if opt_name in trial.params:
            v = trial.params[opt_name]
            if isinstance(v, float):
                print(f"    {config_name} = {v}")
            elif isinstance(v, bool):
                print(f"    {config_name} = {v}")
            else:
                print(f"    {config_name} = {v}")

    # Cooldown special case
    if 'cooldown_15m' in trial.params:
        cd15 = trial.params['cooldown_15m']
        cd1h = trial.params.get('cooldown_1h', 8)
        print(f"    GPU_NATIVE_COOLDOWN_CANDLES = {{'15m': {cd15}, '1h': {cd1h}, '4h': 3}}")


def main():
    if not OPTUNA_AVAILABLE:
        print("❌ Install optuna first: pip install optuna")
        sys.exit(1)

    parser = argparse.ArgumentParser(description='P#224 Optuna Hyperparameter Optimizer')
    parser.add_argument('--pair', default=None, help='Trading pair (default: all active)')
    parser.add_argument('--tf', default='1h', help='Timeframe (default: 1h)')
    parser.add_argument('--n-trials', type=int, default=None, help='Number of trials')
    parser.add_argument('--timeout-h', type=float, default=None, help='Timeout in hours')
    parser.add_argument('--quick', action='store_true', help='Quick mode (shorter windows)')
    parser.add_argument('--resume', action='store_true', help='Resume existing study')
    parser.add_argument('--show-best', action='store_true', help='Show best params and exit')
    parser.add_argument('--study-name', default=None, help='Custom study name')
    args = parser.parse_args()

    n_trials = args.n_trials or getattr(config, 'OPTUNA_N_TRIALS', 120)
    timeout = int((args.timeout_h or getattr(config, 'OPTUNA_TIMEOUT_H', 12)) * 3600)
    db_path = getattr(config, 'OPTUNA_DB_PATH', 'optuna_db/optuna.db')
    study_name = args.study_name or getattr(config, 'OPTUNA_STUDY_NAME', 'turbo_bot_pro')

    # Append pair+tf to study name for uniqueness
    if args.pair:
        study_name = f"{study_name}_{args.pair}_{args.tf}"
    else:
        study_name = f"{study_name}_multi_{args.tf}"

    # Create DB directory
    os.makedirs(os.path.dirname(db_path) or '.', exist_ok=True)
    storage = f"sqlite:///{db_path}"

    if args.show_best:
        try:
            study = optuna.load_study(study_name=study_name, storage=storage)
            show_best(study)
        except Exception as e:
            print(f"  ❌ Cannot load study '{study_name}': {e}")
        return

    # Create or load study
    study = optuna.create_study(
        direction="maximize",
        study_name=study_name,
        storage=storage,
        load_if_exists=args.resume,
        sampler=TPESampler(seed=getattr(config, 'RANDOM_SEED', 42)),
    )

    # Build objective
    if args.pair:
        objective = _create_objective(args.pair, args.tf, quick=args.quick)
        print(f"\n  🔬 Optimizing {args.pair} @ {args.tf} — {n_trials} trials, timeout {timeout//3600}h")
    else:
        pairs = get_active_pairs()
        objective = _create_multi_pair_objective(args.tf, pairs, quick=args.quick)
        print(f"\n  🌍 Multi-pair optimization ({len(pairs)} pairs) @ {args.tf} — {n_trials} trials")

    print(f"     Study: {study_name} | DB: {db_path}")
    if args.quick:
        print(f"     ⚡ Quick mode: 60d train / 20d test windows")

    t0 = time.time()
    study.optimize(objective, n_trials=n_trials, timeout=timeout, show_progress_bar=True)
    elapsed = time.time() - t0

    print(f"\n  ⏱️ Optimization complete in {elapsed/3600:.1f}h ({len(study.trials)} trials)")
    show_best(study)

    # Save best config to JSON
    results_dir = Path(__file__).resolve().parent.parent / 'results' / 'optuna'
    results_dir.mkdir(parents=True, exist_ok=True)
    ts = time.strftime('%Y%m%d_%H%M%S')
    out_file = results_dir / f'best_{study_name}_{ts}.json'
    best_data = {
        'study_name': study_name,
        'best_score': study.best_value,
        'best_params': study.best_params,
        'best_metrics': study.best_trial.user_attrs,
        'n_trials': len(study.trials),
        'elapsed_h': round(elapsed / 3600, 2),
    }
    with open(out_file, 'w') as f:
        json.dump(best_data, f, indent=2, default=str)
    print(f"\n  💾 Best config saved: {out_file}")


if __name__ == '__main__':
    main()

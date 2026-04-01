"""
P#225 Pipeline: Ablation → Optimizer → Walk-Forward (if profitable).

Run on Windows GPU after git pull:
    cd ml-service
    python run_p225_pipeline.py              # full pipeline (ablation + optimizer + walk_forward)
    python run_p225_pipeline.py --ablation   # ablation only
    python run_p225_pipeline.py --optimize   # optimizer only (skip ablation)
    python run_p225_pipeline.py --wf         # walk-forward only
    python run_p225_pipeline.py --tf 4h      # use 4h timeframe
"""
import argparse
import json
import sys
import time
from pathlib import Path

RESULTS_DIR = Path('results/p225')
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def run_ablation(tf: str):
    """Step 1: Ablation study — measure component impact after P#225 fee fix."""
    print("\n" + "=" * 70)
    print(f"  STEP 1: ABLATION STUDY ({tf})")
    print("=" * 70)

    from backtest_pipeline.ablation import run_full_ablation
    result = run_full_ablation(timeframe=tf, verbose=True)

    out_file = RESULTS_DIR / f'ablation_{tf}_{int(time.time())}.json'
    with open(out_file, 'w') as f:
        json.dump(result, f, indent=2, default=str)
    print(f"\n📁 Ablation saved: {out_file}")

    baseline = result.get('baseline', {})
    net = baseline.get('net_profit', 0)
    pf = baseline.get('profit_factor', 0)
    wr = baseline.get('win_rate', 0)
    sharpe = baseline.get('sharpe', 0)
    trades = baseline.get('trades', 0)

    print(f"\n📊 BASELINE: ${net:+,.2f} | PF {pf:.3f} | WR {wr:.1f}% | "
          f"Sharpe {sharpe:.3f} | {trades} trades")

    if net > 0:
        print("✅ PROFITABLE — proceeding to optimizer")
    else:
        print(f"⚠️  Still losing ${net:,.2f} — optimizer may help find better params")

    return result


def run_optimizer(tf: str, n_trials: int = 120, quick: bool = False):
    """Step 2: Optuna Bayesian optimization (calls optimizer as subprocess)."""
    print("\n" + "=" * 70)
    print(f"  STEP 2: OPTUNA OPTIMIZER ({tf}, {n_trials} trials)")
    print("=" * 70)

    import subprocess
    cmd = [sys.executable, '-m', 'backtest_pipeline.optimizer', '--tf', tf,
           '--n-trials', str(n_trials)]
    if quick:
        cmd.append('--quick')

    proc = subprocess.run(cmd, capture_output=False)
    if proc.returncode != 0:
        print("⚠️  Optimizer exited with errors")

    # Load latest result from results/optuna/
    optuna_dir = Path('results/optuna')
    if optuna_dir.exists():
        files = sorted(optuna_dir.glob('best_*.json'), key=lambda f: f.stat().st_mtime)
        if files:
            with open(files[-1]) as f:
                result = json.load(f)
            print(f"\n📁 Latest optimizer result: {files[-1]}")
            return result

    return {}


def run_walk_forward(tf: str):
    """Step 3: Walk-forward OOS validation with best params."""
    print("\n" + "=" * 70)
    print(f"  STEP 3: WALK-FORWARD OOS VALIDATION ({tf})")
    print("=" * 70)

    from backtest_pipeline.walk_forward import walk_forward_multi_pair
    from backtest_pipeline.pair_config import get_active_pairs

    pairs = get_active_pairs(tf)
    result = walk_forward_multi_pair(pairs, tf, verbose=True)

    out_file = RESULTS_DIR / f'walk_forward_{tf}_{int(time.time())}.json'
    with open(out_file, 'w') as f:
        json.dump(result, f, indent=2, default=str)
    print(f"\n📁 Walk-forward saved: {out_file}")

    agg = result.get('aggregate', {})
    net = agg.get('net_profit', 0)
    pf = agg.get('profit_factor', 0)
    sharpe = agg.get('sharpe', 0)

    print(f"\n📊 WF-OOS: ${net:+,.2f} | PF {pf:.3f} | Sharpe {sharpe:.3f}")
    if net > 0 and sharpe > 0:
        print("✅ OOS PROFITABLE — system has real edge")
    else:
        print("⚠️  OOS not profitable — needs more optimization")

    return result


def main():
    parser = argparse.ArgumentParser(description='P#225 Full Pipeline')
    parser.add_argument('--tf', default='1h', help='Timeframe (default: 1h)')
    parser.add_argument('--ablation', action='store_true', help='Run ablation only')
    parser.add_argument('--optimize', action='store_true', help='Run optimizer only')
    parser.add_argument('--wf', action='store_true', help='Run walk-forward only')
    parser.add_argument('--n-trials', type=int, default=120, help='Optuna trials')
    parser.add_argument('--quick', action='store_true', help='Quick optimizer (30 trials)')
    args = parser.parse_args()

    if args.quick:
        args.n_trials = 30

    # If specific step requested, run only that
    if args.ablation:
        run_ablation(args.tf)
        return
    if args.optimize:
        run_optimizer(args.tf, args.n_trials, args.quick)
        return
    if args.wf:
        run_walk_forward(args.tf)
        return

    # Full pipeline
    print("\n🚀 P#225 FULL PIPELINE: Ablation → Optimizer → Walk-Forward")
    print(f"   Timeframe: {args.tf} | Optuna trials: {args.n_trials}")
    t0 = time.time()

    # Step 1: Ablation
    abl = run_ablation(args.tf)
    baseline_pnl = abl.get('baseline', {}).get('net_profit', 0)

    # Step 2: Optimizer
    opt = run_optimizer(args.tf, args.n_trials, args.quick)

    # Step 3: Walk-forward (apply best params if optimizer found good ones)
    best = opt.get('best_params', {})
    if best:
        print(f"\n🔧 Applying best params from optimizer before walk-forward:")
        from backtest_pipeline import config
        for k, v in best.items():
            config_key = k.upper()
            # Map trial param names to config names
            param_map = {
                'TP_MULT': 'TP_ATR_MULT',
                'SL_MULT': 'SL_ATR_MULT',
                'CONFIDENCE_FLOOR': 'CONFIDENCE_FLOOR',
                'ML_MIN_CONF': 'GPU_NATIVE_MIN_CONFIDENCE',
                'GRID_ADX': 'GRID_MAX_ADX',
                'COOLDOWN_15M': 'GPU_NATIVE_COOLDOWN_CANDLES_15M',
                'COOLDOWN_1H': 'GPU_NATIVE_COOLDOWN_CANDLES_1H',
                'BE_R': 'GPU_NATIVE_BREAKEVEN_R',
                'ENSEMBLE_W': 'GPU_NATIVE_ENSEMBLE_WEIGHT',
            }
            if k in param_map:
                setattr(config, param_map[k], v)
                print(f"   {param_map[k]} = {v}")

    wf = run_walk_forward(args.tf)

    elapsed = time.time() - t0
    print(f"\n{'=' * 70}")
    print(f"  PIPELINE COMPLETE — {elapsed / 60:.1f} min")
    print(f"{'=' * 70}")

    # Summary
    bl = abl.get('baseline', {})
    wf_agg = wf.get('aggregate', {})
    print(f"\n  Ablation baseline: ${bl.get('net_profit', 0):+,.2f} | PF {bl.get('profit_factor', 0):.3f}")
    print(f"  WF-OOS result:    ${wf_agg.get('net_profit', 0):+,.2f} | PF {wf_agg.get('profit_factor', 0):.3f}")
    print(f"  Best Optuna score: {opt.get('best_score', 'N/A')}")


if __name__ == '__main__':
    main()

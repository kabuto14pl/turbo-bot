"""P#76 Weak-pair recovery experiments.

Evaluate whether BTC selective shorts and ETH/XRP directional reactivation
improve on the current funding-only configuration.
"""

import copy
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from backtest_pipeline import config, pair_config
from backtest_pipeline.engine import FullPipelineEngine
from backtest_pipeline.runner import load_pair_data, run_multi_pair

TIMEFRAME = "15m"
TRAIN_PCT = 0.70
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")

# Use the proven fast retrain interval for comparison work.
config.XGBOOST_RETRAIN_INTERVAL = config.XGBOOST_RETRAIN_INTERVAL_FAST

EXPERIMENTS = {
    "BTCUSDT": {
        "name": "BTC funding + ultra-selective shorts",
        "overrides": {
            "BTC_DIRECTION_FILTER_ENABLED": True,
            "BTC_LONG_BLOCK_ALL": True,
            "CONFIDENCE_FLOOR": 0.32,
            "QDV_MIN_CONFIDENCE": 0.30,
            "PA_MIN_SCORE": 0.35,
            "ENSEMBLE_THRESHOLD_NORMAL": 0.25,
            "PRE_ENTRY_MOMENTUM_MIN_ALIGNED": 3,
            "RISK_PER_TRADE": 0.0030,
            "GRID_V2_ENABLED": False,
            "FUNDING_ARB_ENABLED": True,
        },
    },
    "ETHUSDT": {
        "name": "ETH soft directional reactivation",
        "overrides": {
            "CONFIDENCE_FLOOR": 0.30,
            "QDV_MIN_CONFIDENCE": 0.30,
            "PA_MIN_SCORE": 0.35,
            "ENSEMBLE_THRESHOLD_NORMAL": 0.25,
            "PRE_ENTRY_MOMENTUM_MIN_ALIGNED": 3,
            "RISK_PER_TRADE": 0.0050,
            "GRID_V2_ENABLED": False,
            "FUNDING_ARB_ENABLED": True,
        },
    },
    "XRPUSDT": {
        "name": "XRP soft directional reactivation",
        "overrides": {
            "CONFIDENCE_FLOOR": 0.30,
            "QDV_MIN_CONFIDENCE": 0.30,
            "PA_MIN_SCORE": 0.35,
            "ENSEMBLE_THRESHOLD_NORMAL": 0.25,
            "PRE_ENTRY_MOMENTUM_MIN_ALIGNED": 3,
            "RISK_PER_TRADE": 0.0045,
            "GRID_V2_ENABLED": False,
            "FUNDING_ARB_ENABLED": True,
        },
    },
}


def summarize_results(results, capital):
    funding_pnl = results.get("funding_arb_pnl", 0.0)
    directional_pnl = results.get("net_profit", 0.0)
    total_pnl = directional_pnl + funding_pnl
    total_return = (total_pnl / capital * 100.0) if capital else 0.0
    return {
        "trades": results.get("total_trades", 0),
        "win_rate": results.get("win_rate", 0.0),
        "profit_factor": results.get("profit_factor", 0.0),
        "max_drawdown": results.get("max_drawdown", 0.0),
        "directional_pnl": directional_pnl,
        "funding_pnl": funding_pnl,
        "total_pnl": total_pnl,
        "total_return_pct": total_return,
        "error": results.get("error"),
    }


def run_symbol_period(symbol, df, overrides=None):
    original_entry = copy.deepcopy(pair_config.PAIR_OVERRIDES[symbol])
    merged_entry = dict(original_entry)
    if overrides:
        merged_entry.update(overrides)
    pair_config.PAIR_OVERRIDES[symbol] = merged_entry

    originals = pair_config.apply_pair_overrides(symbol)
    capital = pair_config.get_pair_capital(symbol)
    try:
        engine = FullPipelineEngine(initial_capital=capital, symbol=symbol)
        results = engine.run(df, TIMEFRAME)
        return summarize_results(results, capital)
    finally:
        pair_config.restore_config(originals)
        pair_config.PAIR_OVERRIDES[symbol] = original_entry


def print_line(label, summary):
    print(
        f"  {label:<18} trades={summary['trades']:>3} "
        f"PF={summary['profit_factor']:.3f} WR={summary['win_rate']:>5.1f}% "
        f"Dir=${summary['directional_pnl']:+8.2f} Fund=${summary['funding_pnl']:+7.2f} "
        f"Total=${summary['total_pnl']:+8.2f} Ret={summary['total_return_pct']:+6.2f}% "
        f"DD={summary['max_drawdown']:>4.1f}%"
    )


def evaluate_verdict(baseline_test, candidate_test):
    delta_total = candidate_test["total_pnl"] - baseline_test["total_pnl"]
    delta_dir = candidate_test["directional_pnl"] - baseline_test["directional_pnl"]
    candidate_positive = candidate_test["total_pnl"] > 0
    directional_alive = candidate_test["trades"] > 0 and candidate_test["directional_pnl"] > 0
    pf_not_broken = candidate_test["profit_factor"] >= max(0.70, baseline_test["profit_factor"])

    if candidate_positive and directional_alive and pf_not_broken and delta_total > 2.0:
        return "GO", delta_total, delta_dir
    return "NO-GO", delta_total, delta_dir


def run_experiment(symbol, experiment):
    df = load_pair_data(symbol, TIMEFRAME)
    if df is None:
        raise RuntimeError(f"Missing data for {symbol} {TIMEFRAME}")

    split_idx = int(len(df) * TRAIN_PCT)
    df_train = df.iloc[:split_idx].copy()
    df_test = df.iloc[split_idx:].copy()

    baseline_full = run_symbol_period(symbol, df)
    baseline_train = run_symbol_period(symbol, df_train)
    baseline_test = run_symbol_period(symbol, df_test)

    candidate_full = run_symbol_period(symbol, df, experiment["overrides"])
    candidate_train = run_symbol_period(symbol, df_train, experiment["overrides"])
    candidate_test = run_symbol_period(symbol, df_test, experiment["overrides"])

    verdict, delta_total, delta_dir = evaluate_verdict(baseline_test, candidate_test)

    print("\n" + "=" * 88)
    print(f"  {symbol} — {experiment['name']}")
    print("=" * 88)
    print("  FULL PERIOD")
    print_line("Baseline", baseline_full)
    print_line("Candidate", candidate_full)
    print("  WALK-FORWARD TRAIN")
    print_line("Baseline train", baseline_train)
    print_line("Candidate train", candidate_train)
    print("  WALK-FORWARD TEST")
    print_line("Baseline test", baseline_test)
    print_line("Candidate test", candidate_test)
    print(
        f"  VERDICT: {verdict} | Test delta total=${delta_total:+.2f} "
        f"| Test delta directional=${delta_dir:+.2f}"
    )

    return {
        "symbol": symbol,
        "experiment": experiment["name"],
        "baseline_full": baseline_full,
        "baseline_train": baseline_train,
        "baseline_test": baseline_test,
        "candidate_full": candidate_full,
        "candidate_train": candidate_train,
        "candidate_test": candidate_test,
        "verdict": verdict,
        "test_delta_total": delta_total,
        "test_delta_directional": delta_dir,
        "overrides": experiment["overrides"],
    }


def run_portfolio_with_winners(winners):
    if not winners:
        return None

    original_overrides = copy.deepcopy(pair_config.PAIR_OVERRIDES)
    try:
        for symbol, experiment in winners.items():
            merged = dict(pair_config.PAIR_OVERRIDES[symbol])
            merged.update(experiment["overrides"])
            pair_config.PAIR_OVERRIDES[symbol] = merged

        portfolio_results = run_multi_pair(timeframe=TIMEFRAME, verbose=False, show_trades=False)
        total_pnl = 0.0
        for results in portfolio_results.values():
            if results.get("error"):
                continue
            total_pnl += results.get("net_profit", 0.0) + results.get("funding_arb_pnl", 0.0)
        return {
            "total_pnl": total_pnl,
            "symbols": list(winners.keys()),
        }
    finally:
        pair_config.PAIR_OVERRIDES = original_overrides


if __name__ == "__main__":
    os.makedirs(RESULTS_DIR, exist_ok=True)

    print("=" * 88)
    print("  P#76 WEAK-PAIR RECOVERY EXPERIMENTS")
    print("=" * 88)
    print("  Timeframe: 15m | Split: 70/30 | XGBoost: FAST mode")

    experiment_results = []
    winners = {}

    for symbol, experiment in EXPERIMENTS.items():
        result = run_experiment(symbol, experiment)
        experiment_results.append(result)
        if result["verdict"] == "GO":
            winners[symbol] = experiment

    portfolio_candidate = run_portfolio_with_winners(winners)

    output = {
        "timestamp": datetime.utcnow().isoformat(),
        "timeframe": TIMEFRAME,
        "train_pct": TRAIN_PCT,
        "results": experiment_results,
        "winners": list(winners.keys()),
        "portfolio_candidate": portfolio_candidate,
    }

    output_path = os.path.join(
        RESULTS_DIR,
        f"p76_weak_pair_reactivation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
    )
    with open(output_path, "w", encoding="ascii") as handle:
        json.dump(output, handle, indent=2)

    print("\n" + "=" * 88)
    print("  P#76 SUMMARY")
    print("=" * 88)
    if winners:
        print(f"  GO candidates: {', '.join(winners.keys())}")
        if portfolio_candidate:
            print(
                f"  Portfolio with winners: ${portfolio_candidate['total_pnl']:+.2f} "
                f"({', '.join(portfolio_candidate['symbols'])})"
            )
    else:
        print("  No candidate beat the current funding-only baseline in out-of-sample test.")
    print(f"  Saved: {output_path}")

"""P#76 targeted weak-pair scan.

Faster experiment loop for BTC/ETH/XRP:
- current full baseline
- candidate full
- current out-of-sample test split
- candidate out-of-sample test split
"""

import copy
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from backtest_pipeline import config, pair_config
from backtest_pipeline.engine import FullPipelineEngine
from backtest_pipeline.runner import load_pair_data

TIMEFRAME = "15m"
TRAIN_PCT = 0.70
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")

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


def summarize(results, capital):
    direction = results.get("net_profit", 0.0)
    funding = results.get("funding_arb_pnl", 0.0)
    total = direction + funding
    ret = (total / capital * 100.0) if capital else 0.0
    return {
        "trades": results.get("total_trades", 0),
        "win_rate": results.get("win_rate", 0.0),
        "profit_factor": results.get("profit_factor", 0.0),
        "max_drawdown": results.get("max_drawdown", 0.0),
        "directional_pnl": direction,
        "funding_pnl": funding,
        "total_pnl": total,
        "return_pct": ret,
    }


def run_one(symbol, df, overrides=None):
    original_pair = copy.deepcopy(pair_config.PAIR_OVERRIDES[symbol])
    pair_config.PAIR_OVERRIDES[symbol] = dict(original_pair)
    if overrides:
        pair_config.PAIR_OVERRIDES[symbol].update(overrides)

    originals = pair_config.apply_pair_overrides(symbol)
    capital = pair_config.get_pair_capital(symbol)
    try:
        engine = FullPipelineEngine(initial_capital=capital, symbol=symbol)
        results = engine.run(df, TIMEFRAME)
        return summarize(results, capital)
    finally:
        pair_config.restore_config(originals)
        pair_config.PAIR_OVERRIDES[symbol] = original_pair


def print_summary(label, data):
    print(
        f"    {label:<14} trades={data['trades']:>3} PF={data['profit_factor']:.3f} "
        f"WR={data['win_rate']:>5.1f}% Dir=${data['directional_pnl']:+8.2f} "
        f"Fund=${data['funding_pnl']:+7.2f} Total=${data['total_pnl']:+8.2f} "
        f"Ret={data['return_pct']:+6.2f}% DD={data['max_drawdown']:>4.1f}%",
        flush=True,
    )


def verdict(baseline_full, candidate_full, baseline_test, candidate_test):
    full_delta = candidate_full["total_pnl"] - baseline_full["total_pnl"]
    test_delta = candidate_test["total_pnl"] - baseline_test["total_pnl"]
    candidate_test_positive = candidate_test["total_pnl"] > 0
    candidate_directional_live = candidate_test["trades"] > 0 and candidate_test["directional_pnl"] > 0

    if full_delta > 2.0 and test_delta > 2.0 and candidate_test_positive and candidate_directional_live:
        return "GO", full_delta, test_delta
    return "NO-GO", full_delta, test_delta


if __name__ == "__main__":
    os.makedirs(RESULTS_DIR, exist_ok=True)

    print("=" * 84, flush=True)
    print("  P#76 TARGETED SCAN — BTC/ETH/XRP", flush=True)
    print("=" * 84, flush=True)
    print("  Full baseline vs candidate, plus 70/30 out-of-sample test", flush=True)

    output = {
        "timestamp": datetime.utcnow().isoformat(),
        "timeframe": TIMEFRAME,
        "train_pct": TRAIN_PCT,
        "results": [],
    }

    for symbol, experiment in EXPERIMENTS.items():
        df = load_pair_data(symbol, TIMEFRAME)
        split_idx = int(len(df) * TRAIN_PCT)
        df_test = df.iloc[split_idx:].copy()

        print("\n" + "-" * 84, flush=True)
        print(f"  {symbol} — {experiment['name']}", flush=True)
        print("-" * 84, flush=True)

        baseline_full = run_one(symbol, df)
        print_summary("Baseline full", baseline_full)

        candidate_full = run_one(symbol, df, experiment["overrides"])
        print_summary("Candidate full", candidate_full)

        baseline_test = run_one(symbol, df_test)
        print_summary("Baseline test", baseline_test)

        candidate_test = run_one(symbol, df_test, experiment["overrides"])
        print_summary("Candidate test", candidate_test)

        state, full_delta, test_delta = verdict(
            baseline_full, candidate_full, baseline_test, candidate_test
        )
        print(
            f"    VERDICT {state} | full delta=${full_delta:+.2f} | test delta=${test_delta:+.2f}",
            flush=True,
        )

        output["results"].append(
            {
                "symbol": symbol,
                "experiment": experiment["name"],
                "baseline_full": baseline_full,
                "candidate_full": candidate_full,
                "baseline_test": baseline_test,
                "candidate_test": candidate_test,
                "verdict": state,
                "full_delta": full_delta,
                "test_delta": test_delta,
                "overrides": experiment["overrides"],
            }
        )

    output_path = os.path.join(
        RESULTS_DIR,
        f"p76_targeted_scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
    )
    with open(output_path, "w", encoding="ascii") as handle:
        json.dump(output, handle, indent=2)

    print("\n" + "=" * 84, flush=True)
    print("  P#76 TARGETED SUMMARY", flush=True)
    print("=" * 84, flush=True)
    winners = [r["symbol"] for r in output["results"] if r["verdict"] == "GO"]
    if winners:
        print(f"  GO candidates: {', '.join(winners)}", flush=True)
    else:
        print("  No weak pair beat the current funding-only baseline.", flush=True)
    print(f"  Saved: {output_path}", flush=True)

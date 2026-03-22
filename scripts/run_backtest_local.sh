#!/usr/bin/env bash
# ============================================================================
# TURBO-BOT — Local Backtest Runner (Dev Container / Bash)
#
# Equivalent of start-local-gpu-and-run-full-orchestrator.ps1 but for bash.
# Uses simulated quantum backend (no GPU needed).
# Can also connect to remote GPU if --gpu-url is provided.
#
# Usage:
#   ./scripts/run_backtest_local.sh                         # default: single 15m
#   ./scripts/run_backtest_local.sh --all-jobs              # all 5 job specs
#   ./scripts/run_backtest_local.sh --timeframe 1h          # single 1h
#   ./scripts/run_backtest_local.sh --multi --timeframe 15m # multi-pair 15m
#   ./scripts/run_backtest_local.sh --walkforward           # walk-forward 15m
#   ./scripts/run_backtest_local.sh --gpu-url http://HOST:4000  # use real GPU
#   ./scripts/run_backtest_local.sh --fast                  # fast profile
#   ./scripts/run_backtest_local.sh --trades                # show trade list
# ============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RESULTS_DIR="${RESULTS_DIR:-$ROOT_DIR/ml-service/results}"
LOGS_DIR="${LOGS_DIR:-$ROOT_DIR/ml-service/results/logs}"

# Defaults
QUANTUM_BACKEND="simulated"
GPU_URL=""
GPU_TIMEOUT_S="15"
TIMEFRAME="15m"
MODE="single"       # single | multi | walkforward | all-jobs
EXTRA_ARGS=()
ALL_JOBS=false
BRIEF=true
TRADES=false
FAST=false
RUNTIME_PARITY=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --timeframe|-t)
            TIMEFRAME="$2"
            shift 2
            ;;
        --all)
            MODE="all"
            shift
            ;;
        --multi)
            MODE="multi"
            shift
            ;;
        --walkforward)
            MODE="walkforward"
            shift
            ;;
        --all-jobs)
            ALL_JOBS=true
            shift
            ;;
        --gpu-url)
            GPU_URL="$2"
            QUANTUM_BACKEND="remote-gpu"
            shift 2
            ;;
        --gpu-timeout-s)
            GPU_TIMEOUT_S="$2"
            shift 2
            ;;
        --quantum-backend)
            QUANTUM_BACKEND="$2"
            shift 2
            ;;
        --trades)
            TRADES=true
            shift
            ;;
        --fast)
            FAST=true
            shift
            ;;
        --runtime-parity)
            RUNTIME_PARITY=true
            shift
            ;;
        --verbose)
            BRIEF=false
            shift
            ;;
        --help|-h)
            head -18 "$0" | tail -14
            exit 0
            ;;
        *)
            EXTRA_ARGS+=("$1")
            shift
            ;;
    esac
done

# ── Pre-flight checks ──────────────────────────────────────────────
echo ""
echo "  ╔══════════════════════════════════════════════════════════╗"
echo "  ║  TURBO-BOT LOCAL BACKTEST RUNNER (bash)                 ║"
echo "  ╚══════════════════════════════════════════════════════════╝"
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
    echo "[ERROR] python3 not found" >&2
    exit 1
fi

# Check dependencies
missing="$(python3 -c "
import importlib.util
missing = [m for m in ('numpy','pandas','sklearn') if importlib.util.find_spec(m) is None]
print(','.join(missing))
" 2>/dev/null)" || true

if [[ -n "$missing" && "$missing" != "" ]]; then
    echo "[WARN] Missing Python packages: $missing — installing..."
    pip3 install --quiet numpy pandas scikit-learn xgboost
fi

# If using remote GPU, check health
if [[ "$QUANTUM_BACKEND" == "remote-gpu" && -n "$GPU_URL" ]]; then
    echo "[CHECK] Remote GPU health: $GPU_URL"
    health_json="$(curl -fsS --max-time 5 "$GPU_URL/health" 2>/dev/null || true)"
    if [[ -z "$health_json" ]]; then
        echo "[ERROR] Remote GPU at $GPU_URL not reachable. Use --quantum-backend simulated or start GPU service." >&2
        exit 70
    fi
    echo "[OK] GPU health: $health_json"
fi

mkdir -p "$RESULTS_DIR" "$LOGS_DIR"

# ── Build runner args ──────────────────────────────────────────────
build_runner_args() {
    local tf="$1"
    local mode="$2"
    local args=()

    args+=(--quantum-backend "$QUANTUM_BACKEND")

    if [[ "$mode" == "multi" ]]; then
        args+=(--multi --timeframe "$tf")
    elif [[ "$mode" == "walkforward" ]]; then
        args+=(--walkforward --timeframe "$tf")
    elif [[ "$mode" == "all" ]]; then
        args+=(--all)
    else
        args+=(--timeframe "$tf")
    fi

    if [[ -n "$GPU_URL" ]]; then
        args+=(--gpu-url "$GPU_URL" --gpu-timeout-s "$GPU_TIMEOUT_S")
    fi
    [[ "$BRIEF" == true ]] && args+=(--brief)
    [[ "$TRADES" == true ]] && args+=(--trades)
    [[ "$FAST" == true ]] && args+=(--fast-profile)
    [[ "$RUNTIME_PARITY" == true ]] && args+=(--runtime-parity)
    args+=("${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}")

    echo "${args[@]}"
}

run_single_job() {
    local tf="$1"
    local mode="$2"
    local label="${mode}:${tf}"
    local logfile="$LOGS_DIR/${mode}_${tf}_$(date +%Y%m%d_%H%M%S).log"
    local runner_args

    runner_args="$(build_runner_args "$tf" "$mode")"

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  ▶ Running: $label  [backend=$QUANTUM_BACKEND]"
    echo "  Log: $logfile"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    local start_time
    start_time=$(date +%s)

    # shellcheck disable=SC2086
    (cd "$ROOT_DIR/ml-service" && python3 -m backtest_pipeline.runner $runner_args) 2>&1 | tee "$logfile"
    local exit_code=${PIPESTATUS[0]}

    local elapsed=$(( $(date +%s) - start_time ))
    echo ""
    echo "  ✅ $label finished in ${elapsed}s (exit=$exit_code)"
    echo "  📄 Log: $logfile"

    return "$exit_code"
}

# ── Execute ────────────────────────────────────────────────────────
echo "[CONFIG] backend=$QUANTUM_BACKEND  timeframe=$TIMEFRAME  mode=$MODE"
echo "[CONFIG] results_dir=$RESULTS_DIR"
if [[ -n "$GPU_URL" ]]; then
    echo "[CONFIG] gpu_url=$GPU_URL  gpu_timeout=${GPU_TIMEOUT_S}s"
fi
echo ""

overall_exit=0

if [[ "$ALL_JOBS" == true ]]; then
    echo "  Running ALL 5 job specs sequentially..."
    echo ""

    for spec in "single:15m" "single:1h" "single:4h" "multi:15m" "walkforward:15m"; do
        job_mode="${spec%%:*}"
        job_tf="${spec##*:}"
        run_single_job "$job_tf" "$job_mode" || overall_exit=1
    done
else
    run_single_job "$TIMEFRAME" "$MODE" || overall_exit=1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ "$overall_exit" -eq 0 ]]; then
    echo "  ✅ ALL BACKTESTS COMPLETED SUCCESSFULLY"
else
    echo "  ⚠️  SOME BACKTESTS HAD ERRORS (exit=$overall_exit)"
fi
echo "  📁 Results: $RESULTS_DIR"
echo "  📋 Logs:    $LOGS_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit "$overall_exit"

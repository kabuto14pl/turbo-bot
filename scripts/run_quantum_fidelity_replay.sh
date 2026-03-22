#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_URL="${REMOTE_URL:-http://127.0.0.1:4001}"
CSV_PATH="${CSV_PATH:-$ROOT_DIR/data/BTCUSDT/BTCUSDT_m15.csv}"
OUTPUT_PATH="${OUTPUT_PATH:-$ROOT_DIR/reports/quantum_fidelity_replay_gpu.json}"
SAMPLES="${SAMPLES:-12}"
WAIT_TIMEOUT_S="${WAIT_TIMEOUT_S:-180}"
WAIT_INTERVAL_S="${WAIT_INTERVAL_S:-5}"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --remote-url)
            REMOTE_URL="$2"
            shift 2
            ;;
        --csv)
            CSV_PATH="$2"
            shift 2
            ;;
        --output)
            OUTPUT_PATH="$2"
            shift 2
            ;;
        --samples)
            SAMPLES="$2"
            shift 2
            ;;
        --wait-timeout)
            WAIT_TIMEOUT_S="$2"
            shift 2
            ;;
        --wait-interval)
            WAIT_INTERVAL_S="$2"
            shift 2
            ;;
        *)
            echo "Unknown argument: $1" >&2
            exit 64
            ;;
    esac
done

echo "[replay] root=$ROOT_DIR"
echo "[replay] remote_url=$REMOTE_URL"
echo "[replay] csv=$CSV_PATH"
echo "[replay] output=$OUTPUT_PATH"
echo "[replay] samples=$SAMPLES"

if [[ ! -f "$CSV_PATH" ]]; then
    echo "[replay] ERROR: CSV not found: $CSV_PATH" >&2
    exit 66
fi

deadline=$(( $(date +%s) + WAIT_TIMEOUT_S ))
while true; do
    health_json="$(curl -fsS --max-time 5 "$REMOTE_URL/health" 2>/dev/null || true)"
    if [[ -n "$health_json" ]] && grep -q '"status"' <<<"$health_json"; then
        echo "[replay] health=$health_json"
        if grep -qE '"status":"(online|online-cpu)"' <<<"$health_json"; then
            break
        fi
    fi

    now=$(date +%s)
    if (( now >= deadline )); then
        echo "[replay] ERROR: GPU service endpoint did not become online before timeout" >&2
        exit 70
    fi

    echo "[replay] waiting for online GPU service endpoint..."
    sleep "$WAIT_INTERVAL_S"
done

mkdir -p "$(dirname "$OUTPUT_PATH")"
rm -f "$OUTPUT_PATH"

missing_modules="$(python3 - <<'PY'
import importlib.util
missing = [m for m in ("numpy", "pandas") if importlib.util.find_spec(m) is None]
print(','.join(missing))
PY
)"

if [[ -n "$missing_modules" ]]; then
    echo "[replay] missing_python_modules=$missing_modules"
    echo "[replay] installing required Python packages (numpy, pandas)..."
    python3 -m pip install --user numpy pandas
fi

PYTHONPATH="$ROOT_DIR/ml-service" python3 -m backtest_pipeline.quantum_fidelity_replay \
    --csv "$CSV_PATH" \
    --remote-url "$REMOTE_URL" \
    --samples "$SAMPLES" \
    --output "$OUTPUT_PATH"

if [[ ! -f "$OUTPUT_PATH" ]]; then
    echo "[replay] ERROR: replay finished without creating report: $OUTPUT_PATH" >&2
    exit 72
fi

echo "[replay] report_ready=$OUTPUT_PATH"
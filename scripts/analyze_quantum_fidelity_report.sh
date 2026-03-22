#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPORT_PATH="${REPORT_PATH:-$ROOT_DIR/reports/quantum_fidelity_replay_gpu.json}"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --report)
            REPORT_PATH="$2"
            shift 2
            ;;
        *)
            echo "Unknown argument: $1" >&2
            exit 64
            ;;
    esac
done

python3 "$ROOT_DIR/scripts/analyze_quantum_fidelity_report.py" --report "$REPORT_PATH"
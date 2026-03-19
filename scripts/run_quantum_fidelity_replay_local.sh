#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
exec "$ROOT_DIR/scripts/run_quantum_fidelity_replay.sh" \
    --remote-url "${REMOTE_URL:-http://127.0.0.1:4001}" \
    --output "${OUTPUT_PATH:-$ROOT_DIR/reports/quantum_fidelity_replay_local_gpu.json}" \
    "$@"
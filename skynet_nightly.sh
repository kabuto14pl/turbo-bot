#!/bin/bash
# ============================================================================
# TURBO-BOT P#198 — Skynet Brain Nightly Automation
# ============================================================================
# Runs Skynet Brain optimizer for each pair × timeframe combination.
# Logs results to ml-service/results/skynet_nightly_YYYYMMDD/
#
# USAGE:
#   ./skynet_nightly.sh                 # Run all pairs, all timeframes
#   ./skynet_nightly.sh SOLUSDT 15m     # Run single pair + timeframe
#
# CRON (nightly at 02:00 UTC):
#   0 2 * * * cd /root/turbo-bot && ./skynet_nightly.sh >> /var/log/skynet_nightly.log 2>&1
#
# WINDOWS (Task Scheduler):
#   cd C:\Users\dudzi\turbo-bot-local
#   py -3 -m ml-service.backtest_pipeline.skynet_brain --iterations 10 --symbol SOLUSDT --timeframe 15m
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DATE=$(date +%Y%m%d)
LOG_DIR="ml-service/results/skynet_nightly_${DATE}"
mkdir -p "$LOG_DIR"

PAIRS="${1:-SOLUSDT BNBUSDT ETHUSDT BTCUSDT XRPUSDT}"
TIMEFRAMES="${2:-1h 4h}"
ITERATIONS=10
PATIENCE=3

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  TURBO-BOT v6.0.0 — SKYNET BRAIN NIGHTLY                   ║"
echo "║  P#198 — Automated Optimization Loop                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo "Date: ${DATE}"
echo "Pairs: ${PAIRS}"
echo "Timeframes: ${TIMEFRAMES}"
echo "Iterations: ${ITERATIONS}"
echo ""

TOTAL=0
SUCCESS=0
FAILED=0

for PAIR in $PAIRS; do
    for TF in $TIMEFRAMES; do
        TOTAL=$((TOTAL + 1))
        LOG_FILE="${LOG_DIR}/${PAIR}_${TF}.log"

        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "  🧠 Running: ${PAIR} @ ${TF} (${ITERATIONS} iterations)"
        echo "  📄 Log: ${LOG_FILE}"

        if python -m ml-service.backtest_pipeline.skynet_brain \
            --iterations "$ITERATIONS" \
            --patience "$PATIENCE" \
            --symbol "$PAIR" \
            --timeframe "$TF" \
            --trades \
            > "$LOG_FILE" 2>&1; then
            echo "  ✅ ${PAIR} @ ${TF} — DONE"
            SUCCESS=$((SUCCESS + 1))
        else
            echo "  ❌ ${PAIR} @ ${TF} — FAILED (see log)"
            FAILED=$((FAILED + 1))
        fi
        echo ""
    done
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SUMMARY: ${SUCCESS}/${TOTAL} succeeded, ${FAILED} failed"
echo "  Logs: ${LOG_DIR}/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

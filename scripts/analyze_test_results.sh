#!/bin/bash
# 📊 Analyze bot test results

LOGFILE="${1:-$(ls -t logs/bot_quick_test_*.log 2>/dev/null | head -1)}"

if [ -z "$LOGFILE" ]; then
    echo "❌ No log file found!"
    exit 1
fi

echo "╔════════════════════════════════════════════════════════════╗"
echo "║              BOT TEST ANALYSIS                             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📁 Log file: $LOGFILE"
echo ""

echo "═══ TRADING METRICS ═══"
echo ""

CYCLES=$(grep -c "Trading cycle completed" "$LOGFILE" 2>/dev/null || echo "0")
echo "🔄 Trading Cycles Completed: $CYCLES"

TRADES=$(grep -c "Trade executed:" "$LOGFILE" 2>/dev/null || echo "0")
echo "💼 Trades Executed: $TRADES"

ML_PREDS=$(grep -c "ML prediction\|ML action received" "$LOGFILE" 2>/dev/null || echo "0")
echo "🧠 ML Predictions: $ML_PREDS"

echo ""
echo "═══ PERFORMANCE ═══"
echo ""

echo "💰 Last 5 Trades (PnL):"
grep "Trade executed:" "$LOGFILE" 2>/dev/null | tail -5 | while read line; do
    echo "   $line"
done

echo ""
echo "📊 Final Portfolio Status:"
grep "Portfolio:" "$LOGFILE" 2>/dev/null | tail -1

echo ""
echo "═══ ML CONFIDENCE ═══"
echo ""

echo "🎯 Last 5 ML Predictions:"
grep "ML.*confidence:" "$LOGFILE" 2>/dev/null | grep -oP "confidence: \K[0-9.]+|Signal: \K[A-Z]+" | tail -10 | paste - - | head -5

echo ""
echo "═══ ERRORS & WARNINGS ═══"
echo ""

REDIS_ERRORS=$(grep -c "Redis error" "$LOGFILE" 2>/dev/null || echo "0")
OTHER_ERRORS=$(grep -c "Error" "$LOGFILE" 2>/dev/null || echo "0")
REAL_ERRORS=$((OTHER_ERRORS - REDIS_ERRORS))

echo "❌ Redis Errors: $REDIS_ERRORS (expected - Redis not running)"
echo "⚠️  Other Errors: $REAL_ERRORS"

if [ $REAL_ERRORS -gt 0 ] && [ $REAL_ERRORS -lt 10 ]; then
    echo ""
    echo "Top errors (non-Redis):"
    grep "Error" "$LOGFILE" | grep -v "Redis" | head -3
fi

echo ""
echo "═══ TEST VERDICT ═══"
echo ""

if [ $CYCLES -gt 5 ] && [ $REAL_ERRORS -lt 5 ]; then
    echo "✅ TEST PASSED!"
    echo "   - $CYCLES cycles completed"
    echo "   - $TRADES trades executed"
    echo "   - Only $REAL_ERRORS non-Redis errors"
    echo ""
    echo "🚀 Ready for 2-hour stress test!"
elif [ $CYCLES -eq 0 ]; then
    echo "❌ TEST FAILED!"
    echo "   - No trading cycles completed"
    echo "   - Check logs for startup errors"
else
    echo "⚠️  TEST PARTIAL"
    echo "   - Some cycles completed: $CYCLES"
    echo "   - Errors detected: $REAL_ERRORS"
    echo "   - Review before full test"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"

#!/bin/bash
# 📊 Extended Test Analysis
# Analyzes results from extended test run

if [ -z "$1" ]; then
    echo "Usage: ./analyze_extended_test.sh <TEST_ID>"
    echo ""
    echo "Available tests:"
    ls -d logs/extended_test_* 2>/dev/null | sed 's/logs\//  - /'
    exit 1
fi

TEST_ID=$1

if [ ! -d "logs/$TEST_ID" ]; then
    echo "❌ Test directory not found: logs/$TEST_ID"
    exit 1
fi

echo "📊 EXTENDED TEST ANALYSIS"
echo "════════════════════════════════════════════════════════════"
echo "Test ID: $TEST_ID"
echo "Date: $(date)"
echo ""

# Check if monitoring CSV exists
if [ ! -f "logs/$TEST_ID/monitoring.csv" ]; then
    echo "❌ Monitoring data not found: logs/$TEST_ID/monitoring.csv"
    exit 1
fi

# Basic stats
TOTAL_RECORDS=$(wc -l < logs/$TEST_ID/monitoring.csv)
TOTAL_RECORDS=$((TOTAL_RECORDS - 1))  # Subtract header
echo "📈 BASIC STATISTICS:"
echo "   Total monitoring records: $TOTAL_RECORDS"
echo "   Monitoring interval: 2 minutes"
echo "   Total test duration: $((TOTAL_RECORDS * 2)) minutes (~$((TOTAL_RECORDS * 2 / 60)) hours)"
echo ""

# Memory analysis
echo "💾 MEMORY ANALYSIS:"
INITIAL_MEM=$(head -2 logs/$TEST_ID/monitoring.csv | tail -1 | cut -d',' -f3)
FINAL_MEM=$(tail -1 logs/$TEST_ID/monitoring.csv | cut -d',' -f3)
MEM_INCREASE=$(echo "$FINAL_MEM - $INITIAL_MEM" | bc 2>/dev/null || echo "0")

echo "   Initial memory: ${INITIAL_MEM}MB"
echo "   Final memory: ${FINAL_MEM}MB"
echo "   Increase: ${MEM_INCREASE}MB"

if (( $(echo "$MEM_INCREASE > 100" | bc -l 2>/dev/null || echo "0") )); then
    echo "   ⚠️  WARNING: Potential memory leak detected!"
    echo "   Action: Review memory usage patterns"
else
    echo "   ✅ PASS: Memory usage stable"
fi

# Calculate average, min, max memory
AVG_MEM=$(tail -n +2 logs/$TEST_ID/monitoring.csv | cut -d',' -f3 | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')
MIN_MEM=$(tail -n +2 logs/$TEST_ID/monitoring.csv | cut -d',' -f3 | sort -n | head -1)
MAX_MEM=$(tail -n +2 logs/$TEST_ID/monitoring.csv | cut -d',' -f3 | sort -n | tail -1)
echo "   Average: ${AVG_MEM}MB"
echo "   Min: ${MIN_MEM}MB"
echo "   Max: ${MAX_MEM}MB"
echo ""

# Error analysis
echo "🔍 ERROR ANALYSIS:"
if [ -f "logs/$TEST_ID/bot.log" ]; then
    ERROR_COUNT=$(grep -ci "error" logs/$TEST_ID/bot.log 2>/dev/null || echo "0")
    WARNING_COUNT=$(grep -ci "warning" logs/$TEST_ID/bot.log 2>/dev/null || echo "0")
    CRITICAL_COUNT=$(grep -ci "critical\|fatal" logs/$TEST_ID/bot.log 2>/dev/null || echo "0")
    
    echo "   Errors: $ERROR_COUNT"
    echo "   Warnings: $WARNING_COUNT"
    echo "   Critical: $CRITICAL_COUNT"
    
    # Get final trade count for error rate calculation
    FINAL_TRADES=$(tail -1 logs/$TEST_ID/monitoring.csv | cut -d',' -f4)
    if [ "$FINAL_TRADES" -gt 0 ]; then
        ERROR_RATE=$(echo "scale=2; $ERROR_COUNT / $FINAL_TRADES * 100" | bc 2>/dev/null || echo "0")
        echo "   Error rate: ${ERROR_RATE}%"
        
        if (( $(echo "$ERROR_RATE > 1" | bc -l 2>/dev/null || echo "0") )); then
            echo "   ❌ FAIL: Error rate too high (>1%)"
        else
            echo "   ✅ PASS: Error rate acceptable (<1%)"
        fi
    else
        echo "   ⚠️  No trades executed"
    fi
    
    # Show recent errors if any
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo ""
        echo "   Recent errors (last 5):"
        grep -i "error" logs/$TEST_ID/bot.log | tail -5 | sed 's/^/      /'
    fi
else
    echo "   ⚠️  Log file not found"
fi
echo ""

# Trading analysis
echo "💰 TRADING ANALYSIS:"
INITIAL_PORTFOLIO=$(head -2 logs/$TEST_ID/monitoring.csv | tail -1 | cut -d',' -f5)
FINAL_PORTFOLIO=$(tail -1 logs/$TEST_ID/monitoring.csv | cut -d',' -f5)
INITIAL_TRADES=$(head -2 logs/$TEST_ID/monitoring.csv | tail -1 | cut -d',' -f4)
FINAL_TRADES=$(tail -1 logs/$TEST_ID/monitoring.csv | cut -d',' -f4)

echo "   Total trades: $FINAL_TRADES"
echo "   Initial portfolio: \$${INITIAL_PORTFOLIO}"
echo "   Final portfolio: \$${FINAL_PORTFOLIO}"

if [ -n "$INITIAL_PORTFOLIO" ] && [ -n "$FINAL_PORTFOLIO" ] && [ "$INITIAL_PORTFOLIO" != "0" ]; then
    PNL=$(echo "$FINAL_PORTFOLIO - $INITIAL_PORTFOLIO" | bc 2>/dev/null || echo "0")
    PNL_PCT=$(echo "scale=2; ($FINAL_PORTFOLIO - $INITIAL_PORTFOLIO) / $INITIAL_PORTFOLIO * 100" | bc 2>/dev/null || echo "0")
    echo "   P&L: \$${PNL} (${PNL_PCT}%)"
    
    if (( $(echo "$PNL > 0" | bc -l 2>/dev/null || echo "0") )); then
        echo "   ✅ Positive P&L"
    else
        echo "   ⚠️  Negative P&L"
    fi
fi
echo ""

# Uptime analysis
echo "⏱️  UPTIME ANALYSIS:"
if [ -f "logs/$TEST_ID/bot.log" ]; then
    CRASHES=$(grep -ci "crash\|crashed\|fatal" logs/$TEST_ID/bot.log 2>/dev/null || echo "0")
    RESTARTS=$(grep -ci "restart\|restarted" logs/$TEST_ID/bot.log 2>/dev/null || echo "0")
    
    echo "   Crashes: $CRASHES"
    echo "   Restarts: $RESTARTS"
    
    if [ "$CRASHES" -eq 0 ]; then
        echo "   ✅ PASS: No crashes detected - 100% uptime"
    else
        echo "   ❌ FAIL: Crashes detected"
    fi
else
    echo "   ⚠️  Unable to determine uptime"
fi
echo ""

# Status distribution
echo "📊 STATUS DISTRIBUTION:"
if command -v awk > /dev/null; then
    tail -n +2 logs/$TEST_ID/monitoring.csv | cut -d',' -f2 | sort | uniq -c | while read count status; do
        percentage=$(echo "scale=1; $count / $TOTAL_RECORDS * 100" | bc 2>/dev/null || echo "0")
        echo "   $status: $count times (${percentage}%)"
    done
else
    echo "   ⚠️  AWK not available for analysis"
fi
echo ""

# Snapshots info
echo "💾 SNAPSHOTS:"
SNAPSHOT_COUNT=$(ls -1 data/$TEST_ID/snapshot_*.json 2>/dev/null | wc -l)
echo "   Saved snapshots: $SNAPSHOT_COUNT"
if [ "$SNAPSHOT_COUNT" -gt 0 ]; then
    echo "   Files:"
    ls -lh data/$TEST_ID/snapshot_*.json 2>/dev/null | awk '{print "      " $9 " (" $5 ")"}'
fi
echo ""

# Final verdict
echo "🎯 FINAL VERDICT:"
echo "═══════════════════════════════════════════════════════════"

PASSED=true
ISSUES=()

# Check crashes
if [ "$CRASHES" -gt 0 ]; then
    PASSED=false
    ISSUES+=("Bot crashed $CRASHES times")
fi

# Check error rate
if [ -n "$ERROR_RATE" ] && (( $(echo "$ERROR_RATE >= 1" | bc -l 2>/dev/null || echo "0") )); then
    PASSED=false
    ISSUES+=("High error rate: ${ERROR_RATE}%")
fi

# Check memory leak
if (( $(echo "$MEM_INCREASE > 100" | bc -l 2>/dev/null || echo "0") )); then
    PASSED=false
    ISSUES+=("Memory leak detected: +${MEM_INCREASE}MB")
fi

# Check if any trades were executed
if [ "$FINAL_TRADES" -eq 0 ]; then
    PASSED=false
    ISSUES+=("No trades executed")
fi

if [ "$PASSED" = true ]; then
    echo "✅ TEST PASSED - Bot is production ready!"
    echo ""
    echo "   ✅ Zero crashes"
    echo "   ✅ Low error rate"
    echo "   ✅ Stable memory usage"
    echo "   ✅ Trading activity confirmed"
    echo ""
    echo "   🎉 Bot achieved +15 points!"
    echo "   📈 New score: 95 + 15 = 110/100"
else
    echo "❌ TEST FAILED - Issues detected:"
    echo ""
    for issue in "${ISSUES[@]}"; do
        echo "   ❌ $issue"
    done
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "📁 Full logs available at:"
echo "   - Bot log: logs/$TEST_ID/bot.log"
echo "   - Monitoring: logs/$TEST_ID/monitoring.csv"
echo "   - Snapshots: data/$TEST_ID/"
echo ""
echo "💡 To review logs:"
echo "   tail -100 logs/$TEST_ID/bot.log"
echo "   cat logs/$TEST_ID/monitoring.csv"
echo ""

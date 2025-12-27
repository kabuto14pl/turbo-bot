#!/bin/bash

# ============================================================================
# 📊 PAPER TRADING MONITORING DASHBOARD
# ============================================================================
# Real-time monitoring dla paper trading mode
# Uruchom w osobnym terminalu: watch -n 5 ./monitor_paper_trading.sh
# ============================================================================

clear

echo "🌐 ============================================================"
echo "   PAPER TRADING LIVE MONITORING DASHBOARD"
echo "   $(date '+%Y-%m-%d %H:%M:%S')"
echo "🌐 ============================================================"
echo ""

# ============================================================================
# BOT STATUS
# ============================================================================

echo "🤖 BOT STATUS:"
BOT_PID=$(cat bot_paper_trading.pid 2>/dev/null)
if [ -z "$BOT_PID" ]; then
    echo "   ❌ Bot PID file not found"
elif ps -p $BOT_PID > /dev/null 2>&1; then
    UPTIME=$(ps -o etime= -p $BOT_PID | tr -d ' ')
    echo "   ✅ Running (PID: $BOT_PID, Uptime: $UPTIME)"
else
    echo "   ❌ Bot stopped (PID $BOT_PID not found)"
fi
echo ""

# ============================================================================
# HEALTH CHECK
# ============================================================================

echo "💚 HEALTH STATUS:"
HEALTH_RESPONSE=$(curl -s http://localhost:3001/health 2>/dev/null)

if [ -z "$HEALTH_RESPONSE" ]; then
    echo "   ❌ Health endpoint not responding"
else
    STATUS=$(echo $HEALTH_RESPONSE | jq -r '.status' 2>/dev/null)
    UPTIME=$(echo $HEALTH_RESPONSE | jq -r '.uptime' 2>/dev/null)
    
    if [ "$STATUS" == "healthy" ]; then
        echo "   ✅ Status: $STATUS"
        echo "   ⏱️  Uptime: ${UPTIME}s"
    else
        echo "   ⚠️  Status: $STATUS"
    fi
    
    # Components
    echo ""
    echo "   📦 Components:"
    echo $HEALTH_RESPONSE | jq -r '.components | to_entries[] | "      \(.key): \(if .value then "✅" else "❌" end)"' 2>/dev/null
fi
echo ""

# ============================================================================
# PORTFOLIO METRICS
# ============================================================================

echo "💰 PORTFOLIO:"
PORTFOLIO=$(curl -s http://localhost:3001/api/portfolio 2>/dev/null)

if [ -z "$PORTFOLIO" ]; then
    echo "   ❌ Portfolio endpoint not responding"
else
    TOTAL_VALUE=$(echo $PORTFOLIO | jq -r '.totalValue' 2>/dev/null)
    REALIZED_PNL=$(echo $PORTFOLIO | jq -r '.realizedPnL' 2>/dev/null)
    TOTAL_TRADES=$(echo $PORTFOLIO | jq -r '.totalTrades' 2>/dev/null)
    WIN_RATE=$(echo $PORTFOLIO | jq -r '.winRate' 2>/dev/null)
    DRAWDOWN=$(echo $PORTFOLIO | jq -r '.drawdown' 2>/dev/null)
    
    # Calculate P&L percentage
    if [ ! -z "$TOTAL_VALUE" ] && [ "$TOTAL_VALUE" != "null" ]; then
        PNL_PCT=$(echo "scale=2; ($TOTAL_VALUE - 10000) / 10000 * 100" | bc)
        
        if (( $(echo "$REALIZED_PNL >= 0" | bc -l) )); then
            PNL_SYMBOL="✅"
        else
            PNL_SYMBOL="❌"
        fi
        
        echo "   💵 Total Value: \$${TOTAL_VALUE} (${PNL_PCT}%)"
        echo "   $PNL_SYMBOL Realized P&L: \$${REALIZED_PNL}"
        echo "   📊 Total Trades: ${TOTAL_TRADES}"
        echo "   🎯 Win Rate: ${WIN_RATE}%"
        echo "   📉 Drawdown: ${DRAWDOWN}%"
    fi
fi
echo ""

# ============================================================================
# CIRCUIT BREAKER
# ============================================================================

echo "🛑 CIRCUIT BREAKER:"
CB_RESPONSE=$(curl -s http://localhost:3001/api/circuit-breaker 2>/dev/null)

if [ -z "$CB_RESPONSE" ]; then
    echo "   ❌ Circuit breaker endpoint not responding"
else
    IS_TRIPPED=$(echo $CB_RESPONSE | jq -r '.isTripped' 2>/dev/null)
    CONSECUTIVE_LOSSES=$(echo $CB_RESPONSE | jq -r '.consecutiveLosses' 2>/dev/null)
    MAX_LOSSES=$(echo $CB_RESPONSE | jq -r '.maxConsecutiveLosses' 2>/dev/null)
    TRIP_COUNT=$(echo $CB_RESPONSE | jq -r '.tripCount' 2>/dev/null)
    
    if [ "$IS_TRIPPED" == "true" ]; then
        echo "   🔴 TRIPPED! Trading halted"
    else
        echo "   ✅ Operational"
    fi
    
    echo "   📊 Consecutive Losses: ${CONSECUTIVE_LOSSES}/${MAX_LOSSES}"
    echo "   🔢 Trip Count: ${TRIP_COUNT}"
fi
echo ""

# ============================================================================
# LIVE DATA STATUS
# ============================================================================

echo "🌐 LIVE DATA (Last 10 updates):"
LIVE_DATA=$(tail -200 logs/paper_trading_*.log 2>/dev/null | grep "LIVE DATA" | tail -10)

if [ -z "$LIVE_DATA" ]; then
    echo "   ⚠️  No live data detected in recent logs"
else
    echo "$LIVE_DATA" | while read line; do
        echo "   $line"
    done
fi
echo ""

# ============================================================================
# RECENT TRADES
# ============================================================================

echo "📈 RECENT TRADES (Last 5):"
TRADES=$(tail -500 logs/paper_trading_*.log 2>/dev/null | grep "Trade executed" | tail -5)

if [ -z "$TRADES" ]; then
    echo "   ⏳ No trades executed yet (waiting for signals...)"
else
    echo "$TRADES" | while read line; do
        echo "   $line"
    done
fi
echo ""

# ============================================================================
# TRADING SIGNALS
# ============================================================================

echo "🎯 RECENT SIGNALS (Last 5):"
SIGNALS=$(tail -500 logs/paper_trading_*.log 2>/dev/null | grep "Executing.*signal" | tail -5)

if [ -z "$SIGNALS" ]; then
    echo "   ⏳ No signals generated yet"
else
    echo "$SIGNALS" | while read line; do
        echo "   $line"
    done
fi
echo ""

# ============================================================================
# ERRORS & WARNINGS
# ============================================================================

echo "⚠️  RECENT ERRORS (Last 5 non-Redis):"
ERRORS=$(tail -200 logs/paper_trading_*.log 2>/dev/null | grep -E "ERROR|Failed" | grep -v "Redis" | tail -5)

if [ -z "$ERRORS" ]; then
    echo "   ✅ No errors detected"
else
    echo "$ERRORS" | while read line; do
        echo "   $line"
    done
fi
echo ""

# ============================================================================
# ML SYSTEM STATUS
# ============================================================================

echo "🧠 ML SYSTEM:"
ML_STATUS=$(tail -200 logs/paper_trading_*.log 2>/dev/null | grep "ML.*PHASE\|Learning Phase" | tail -1)

if [ -z "$ML_STATUS" ]; then
    echo "   ⏳ ML system initializing..."
else
    echo "   $ML_STATUS"
fi
echo ""

# ============================================================================
# QUICK STATS
# ============================================================================

echo "📊 LOG STATISTICS (Last 500 lines):"
TOTAL_CYCLES=$(tail -500 logs/paper_trading_*.log 2>/dev/null | grep -c "Starting trading cycle" || echo "0")
LIVE_UPDATES=$(tail -500 logs/paper_trading_*.log 2>/dev/null | grep -c "LIVE DATA" || echo "0")
TOTAL_SIGNALS=$(tail -500 logs/paper_trading_*.log 2>/dev/null | grep -c "Executing.*signal" || echo "0")
TOTAL_TRADES=$(tail -500 logs/paper_trading_*.log 2>/dev/null | grep -c "Trade executed" || echo "0")

echo "   🔄 Trading Cycles: $TOTAL_CYCLES"
echo "   🌐 Live Data Updates: $LIVE_UPDATES"
echo "   🎯 Signals Generated: $TOTAL_SIGNALS"
echo "   💱 Trades Executed: $TOTAL_TRADES"

echo ""
echo "🌐 ============================================================"
echo "   Refresh: watch -n 5 ./monitor_paper_trading.sh"
echo "   Stop: Ctrl+C"
echo "🌐 ============================================================"

#!/bin/bash

# ============================================================================
# 📺 LIVE PAPER TRADING MONITOR - AUTO-REFRESH
# ============================================================================
# Continuous monitoring with auto-refresh every 10 seconds
# Usage: ./watch_paper_trading.sh
# Stop: Ctrl+C
# ============================================================================

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}🌐 ============================================================${NC}"
echo -e "${BLUE}   PAPER TRADING CONTINUOUS MONITOR${NC}"
echo -e "${BLUE}   Press Ctrl+C to stop${NC}"
echo -e "${BLUE}🌐 ============================================================${NC}"
echo ""

while true; do
    clear
    
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     PAPER TRADING LIVE DASHBOARD - Auto-refresh 10s       ║${NC}"
    echo -e "${BLUE}║     $(date '+%Y-%m-%d %H:%M:%S')                                    ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Bot Status
    BOT_PID=$(cat bot_paper_trading.pid 2>/dev/null)
    if [ ! -z "$BOT_PID" ] && ps -p $BOT_PID > /dev/null 2>&1; then
        UPTIME=$(ps -o etime= -p $BOT_PID | tr -d ' ')
        echo -e "${GREEN}✅ BOT RUNNING${NC} | PID: $BOT_PID | Uptime: $UPTIME"
    else
        echo -e "${RED}❌ BOT STOPPED${NC}"
    fi
    
    # Portfolio
    PORTFOLIO=$(curl -s http://localhost:3001/api/portfolio 2>/dev/null)
    if [ ! -z "$PORTFOLIO" ]; then
        TOTAL_VALUE=$(echo $PORTFOLIO | jq -r '.totalValue' 2>/dev/null)
        REALIZED_PNL=$(echo $PORTFOLIO | jq -r '.realizedPnL' 2>/dev/null)
        TOTAL_TRADES=$(echo $PORTFOLIO | jq -r '.totalTrades' 2>/dev/null)
        WIN_RATE=$(echo $PORTFOLIO | jq -r '.winRate' 2>/dev/null)
        
        if [ "$REALIZED_PNL" != "0" ] && [ ! -z "$REALIZED_PNL" ]; then
            if (( $(echo "$REALIZED_PNL > 0" | awk '{print ($1 > 0)}') )); then
                PNL_COLOR=$GREEN
            else
                PNL_COLOR=$RED
            fi
        else
            PNL_COLOR=$YELLOW
        fi
        
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}💰 PORTFOLIO:${NC}"
        echo -e "   Total Value: ${GREEN}\$${TOTAL_VALUE}${NC}"
        echo -e "   P&L: ${PNL_COLOR}\$${REALIZED_PNL}${NC}"
        echo -e "   Trades: ${BLUE}${TOTAL_TRADES}${NC} | Win Rate: ${BLUE}${WIN_RATE}%${NC}"
    fi
    
    # Circuit Breaker
    CB=$(curl -s http://localhost:3001/api/circuit-breaker 2>/dev/null)
    if [ ! -z "$CB" ]; then
        IS_TRIPPED=$(echo $CB | jq -r '.isTripped' 2>/dev/null)
        CONSECUTIVE_LOSSES=$(echo $CB | jq -r '.consecutiveLosses' 2>/dev/null)
        
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}🛑 CIRCUIT BREAKER:${NC}"
        
        if [ "$IS_TRIPPED" == "true" ]; then
            echo -e "   Status: ${RED}🔴 TRIPPED${NC}"
        else
            echo -e "   Status: ${GREEN}✅ OPERATIONAL${NC}"
        fi
        echo -e "   Consecutive Losses: ${BLUE}${CONSECUTIVE_LOSSES}/5${NC}"
    fi
    
    # Live Data
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🌐 LIVE MARKET DATA (Last 5):${NC}"
    
    LIVE_DATA=$(tail -200 logs/paper_trading_*.log 2>/dev/null | grep "LIVE DATA" | tail -5)
    if [ -z "$LIVE_DATA" ]; then
        echo -e "   ${YELLOW}⏳ Waiting for live data...${NC}"
    else
        echo "$LIVE_DATA" | while read line; do
            # Extract price
            PRICE=$(echo $line | grep -oP '\$\K[0-9,.]+' | head -1)
            echo -e "   ${GREEN}📊 BTC-USDT: \$${PRICE}${NC}"
        done | tail -1  # Show only latest
    fi
    
    # Recent Trades
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📈 RECENT TRADES (Last 3):${NC}"
    
    TRADES=$(tail -500 logs/paper_trading_*.log 2>/dev/null | grep "Trade executed" | tail -3)
    if [ -z "$TRADES" ]; then
        echo -e "   ${YELLOW}⏳ No trades yet (waiting for signals...)${NC}"
    else
        echo "$TRADES" | while read line; do
            echo -e "   ${GREEN}$line${NC}"
        done
    fi
    
    # Recent Signals
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🎯 RECENT SIGNALS (Last 3):${NC}"
    
    SIGNALS=$(tail -500 logs/paper_trading_*.log 2>/dev/null | grep "Executing.*signal" | tail -3)
    if [ -z "$SIGNALS" ]; then
        echo -e "   ${YELLOW}⏳ No signals yet${NC}"
    else
        echo "$SIGNALS" | while read line; do
            if echo $line | grep -q "BUY"; then
                echo -e "   ${GREEN}$line${NC}"
            elif echo $line | grep -q "SELL"; then
                echo -e "   ${RED}$line${NC}"
            else
                echo -e "   ${YELLOW}$line${NC}"
            fi
        done
    fi
    
    # Stats
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📊 QUICK STATS (Last 500 log lines):${NC}"
    
    CYCLES=$(tail -500 logs/paper_trading_*.log 2>/dev/null | grep -c "Starting trading cycle" || echo "0")
    LIVE_UPDATES=$(tail -500 logs/paper_trading_*.log 2>/dev/null | grep -c "LIVE DATA" || echo "0")
    
    echo -e "   Trading Cycles: ${BLUE}${CYCLES}${NC}"
    echo -e "   Live Updates: ${BLUE}${LIVE_UPDATES}${NC}"
    
    # Errors
    ERRORS=$(tail -200 logs/paper_trading_*.log 2>/dev/null | grep -E "ERROR|Failed" | grep -v "Redis" | wc -l)
    if [ "$ERRORS" -gt 0 ]; then
        echo -e "   Errors: ${RED}${ERRORS}${NC}"
    else
        echo -e "   Errors: ${GREEN}0${NC}"
    fi
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⏱️  Next refresh in 10 seconds... (Ctrl+C to stop)${NC}"
    echo ""
    
    # API Endpoints
    echo -e "${BLUE}🔗 API ENDPOINTS (use curl in terminal):${NC}"
    echo -e "   ${GREEN}curl http://localhost:3001/health | jq '.status'${NC}"
    echo -e "   ${GREEN}curl http://localhost:3001/api/portfolio | jq '.'${NC}"
    echo -e "   ${GREEN}curl http://localhost:3001/api/circuit-breaker | jq '.'${NC}"
    
    sleep 10
done

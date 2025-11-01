#!/bin/bash
# 🔧 Complete Diagnostic Script

echo "🔍 ==============================================="
echo "   AUTONOMOUS TRADING BOT - FULL DIAGNOSTIC"
echo "==============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Test Information:${NC}"
echo "   Test ID: extended_test_20251012_151143"
echo "   Start Time: 2025-10-12 15:11:43"
echo ""

# 1. Process Check
echo -e "${BLUE}1️⃣  Process Status:${NC}"
if ps aux | grep -v grep | grep "autonomous_trading_bot" > /dev/null; then
    BOT_PID=$(ps aux | grep -v grep | grep "autonomous_trading_bot" | grep "node" | tail -1 | awk '{print $2}')
    BOT_MEM=$(ps aux | grep -v grep | grep "autonomous_trading_bot" | grep "node" | tail -1 | awk '{print $6}')
    BOT_CPU=$(ps aux | grep -v grep | grep "autonomous_trading_bot" | grep "node" | tail -1 | awk '{print $3}')
    echo -e "   ${GREEN}✅ Bot Process: RUNNING${NC}"
    echo "      PID: $BOT_PID"
    echo "      Memory: $((BOT_MEM/1024)) MB"
    echo "      CPU: ${BOT_CPU}%"
else
    echo -e "   ${RED}❌ Bot Process: NOT RUNNING${NC}"
fi

if ps aux | grep -v grep | grep "extended_test" > /dev/null; then
    TEST_PID=$(ps aux | grep -v grep | grep "extended_test" | head -1 | awk '{print $2}')
    echo -e "   ${GREEN}✅ Test Script: RUNNING${NC} (PID: $TEST_PID)"
else
    echo -e "   ${YELLOW}⚠️  Test Script: NOT RUNNING${NC}"
fi

if ps aux | grep -v grep | grep "http.server 8080" > /dev/null; then
    DASH_PID=$(ps aux | grep -v grep | grep "http.server 8080" | head -1 | awk '{print $2}')
    echo -e "   ${GREEN}✅ Dashboard Server: RUNNING${NC} (PID: $DASH_PID)"
else
    echo -e "   ${YELLOW}⚠️  Dashboard Server: NOT RUNNING${NC}"
fi
echo ""

# 2. API Health Check
echo -e "${BLUE}2️⃣  API Health Check:${NC}"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3001/health 2>/dev/null)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)
HEALTH_DATA=$(echo "$HEALTH_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ Health Endpoint: RESPONDING (200)${NC}"
    STATUS=$(echo "$HEALTH_DATA" | jq -r '.status' 2>/dev/null || echo "unknown")
    UPTIME=$(echo "$HEALTH_DATA" | jq -r '.uptime' 2>/dev/null || echo "0")
    VERSION=$(echo "$HEALTH_DATA" | jq -r '.version' 2>/dev/null || echo "unknown")
    echo "      Status: $STATUS"
    echo "      Uptime: $((${UPTIME%.*}/60)) minutes"
    echo "      Version: $VERSION"
else
    echo -e "   ${RED}❌ Health Endpoint: ERROR (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# 3. Portfolio Check
echo -e "${BLUE}3️⃣  Portfolio Status:${NC}"
PORTFOLIO_RESPONSE=$(curl -s http://localhost:3001/api/portfolio 2>/dev/null)
if [ $? -eq 0 ] && [ -n "$PORTFOLIO_RESPONSE" ]; then
    echo -e "   ${GREEN}✅ Portfolio Endpoint: RESPONDING${NC}"
    TOTAL_VALUE=$(echo "$PORTFOLIO_RESPONSE" | jq -r '.totalValue' 2>/dev/null || echo "0")
    TOTAL_TRADES=$(echo "$PORTFOLIO_RESPONSE" | jq -r '.totalTrades' 2>/dev/null || echo "0")
    REALIZED_PNL=$(echo "$PORTFOLIO_RESPONSE" | jq -r '.realizedPnL' 2>/dev/null || echo "0")
    WIN_RATE=$(echo "$PORTFOLIO_RESPONSE" | jq -r '.winRate' 2>/dev/null || echo "0")
    echo "      Portfolio Value: \$$TOTAL_VALUE"
    echo "      Total Trades: $TOTAL_TRADES"
    echo "      Realized P&L: \$$REALIZED_PNL"
    echo "      Win Rate: $(echo "$WIN_RATE * 100" | bc 2>/dev/null || echo "0")%"
else
    echo -e "   ${RED}❌ Portfolio Endpoint: ERROR${NC}"
fi
echo ""

# 4. Metrics Check
echo -e "${BLUE}4️⃣  Metrics Status:${NC}"
METRICS_RESPONSE=$(curl -s http://localhost:3001/metrics 2>/dev/null | head -30)
if [ $? -eq 0 ] && [ -n "$METRICS_RESPONSE" ]; then
    echo -e "   ${GREEN}✅ Metrics Endpoint: RESPONDING${NC}"
    METRIC_LINES=$(echo "$METRICS_RESPONSE" | grep -c "^trading_bot")
    echo "      Metrics Available: $METRIC_LINES lines"
    echo ""
    echo "   Sample Metrics:"
    echo "$METRICS_RESPONSE" | grep "trading_bot_portfolio_value\|trading_bot_uptime\|trading_bot_trades_total" | head -3 | sed 's/^/      /'
else
    echo -e "   ${YELLOW}⚠️  Metrics Endpoint: NOT AVAILABLE${NC}"
fi
echo ""

# 5. Log File Check
echo -e "${BLUE}5️⃣  Log Files Status:${NC}"
BOT_LOG="logs/extended_test_20251012_151143/bot.log"
if [ -f "$BOT_LOG" ]; then
    LOG_SIZE=$(du -h "$BOT_LOG" | cut -f1)
    LOG_LINES=$(wc -l < "$BOT_LOG")
    ERRORS=$(grep -c "ERROR\|Error" "$BOT_LOG" 2>/dev/null || echo "0")
    echo -e "   ${GREEN}✅ Bot Log: EXISTS${NC}"
    echo "      Path: $BOT_LOG"
    echo "      Size: $LOG_SIZE"
    echo "      Lines: $LOG_LINES"
    echo "      Errors: $ERRORS"
    
    echo ""
    echo "   Last 5 Health Reports:"
    grep "Health:" "$BOT_LOG" | tail -5 | sed 's/^/      /'
else
    echo -e "   ${RED}❌ Bot Log: NOT FOUND${NC}"
fi
echo ""

# 6. ML System Check
echo -e "${BLUE}6️⃣  ML System Status:${NC}"
if [ -f "$BOT_LOG" ]; then
    LAST_ML_ACTION=$(grep "ML Action:" "$BOT_LOG" | tail -1)
    if [ -n "$LAST_ML_ACTION" ]; then
        echo -e "   ${GREEN}✅ ML System: ACTIVE${NC}"
        echo "      $LAST_ML_ACTION" | sed 's/^/      /'
        
        ML_CONFIDENCE=$(echo "$LAST_ML_ACTION" | grep -oP 'confidence: \K[0-9.]+' || echo "0")
        echo "      Current Confidence: $ML_CONFIDENCE"
    else
        echo -e "   ${YELLOW}⚠️  ML System: NO RECENT ACTIVITY${NC}"
    fi
else
    echo -e "   ${RED}❌ Cannot check ML status (log file missing)${NC}"
fi
echo ""

# 7. Test Progress
echo -e "${BLUE}7️⃣  Test Progress:${NC}"
START_TIME=$(date -d "2025-10-12 15:11:43" +%s 2>/dev/null || echo "0")
CURRENT_TIME=$(date +%s)
if [ "$START_TIME" != "0" ]; then
    ELAPSED=$((CURRENT_TIME - START_TIME))
    TOTAL_DURATION=7200
    REMAINING=$((TOTAL_DURATION - ELAPSED))
    PROGRESS=$((ELAPSED * 100 / TOTAL_DURATION))
    SIMULATED_HOURS=$(echo "scale=1; $ELAPSED * 24 / 3600" | bc)
    
    echo -e "   ${GREEN}✅ Test Running${NC}"
    echo "      Elapsed: $((ELAPSED/60))m $((ELAPSED%60))s"
    echo "      Progress: ${PROGRESS}%"
    echo "      Simulated Time: ${SIMULATED_HOURS}h / 48h"
    echo "      Remaining: $((REMAINING/60))m $((REMAINING%60))s"
    
    if [ $REMAINING -lt 0 ]; then
        echo -e "      ${YELLOW}⚠️  Test should have completed!${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  Cannot calculate progress${NC}"
fi
echo ""

# 8. Dashboard Check
echo -e "${BLUE}8️⃣  Dashboard Access:${NC}"
if curl -s -I http://localhost:8080/live_test_dashboard.html | grep "200 OK" > /dev/null; then
    echo -e "   ${GREEN}✅ Dashboard: ACCESSIBLE${NC}"
    echo "      Local URL: http://localhost:8080/live_test_dashboard.html"
    echo "      External: Check VS Code PORTS tab → port 8080"
else
    echo -e "   ${RED}❌ Dashboard: NOT ACCESSIBLE${NC}"
fi
echo ""

# 9. System Resources
echo -e "${BLUE}9️⃣  System Resources:${NC}"
TOTAL_MEM=$(free -m | awk 'NR==2{print $2}')
USED_MEM=$(free -m | awk 'NR==2{print $3}')
FREE_MEM=$(free -m | awk 'NR==2{print $4}')
MEM_PERCENT=$((USED_MEM * 100 / TOTAL_MEM))

echo "   Memory Usage:"
echo "      Total: ${TOTAL_MEM}MB"
echo "      Used: ${USED_MEM}MB (${MEM_PERCENT}%)"
echo "      Free: ${FREE_MEM}MB"

LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}')
echo "   Load Average:$LOAD_AVG"
echo ""

# 10. Summary
echo -e "${BLUE}🎯 Summary:${NC}"
CHECKS_PASSED=0
CHECKS_TOTAL=5

[ "$HTTP_CODE" = "200" ] && ((CHECKS_PASSED++))
[ -n "$PORTFOLIO_RESPONSE" ] && ((CHECKS_PASSED++))
[ -f "$BOT_LOG" ] && ((CHECKS_PASSED++))
ps aux | grep -v grep | grep "autonomous_trading_bot" > /dev/null && ((CHECKS_PASSED++))
curl -s -I http://localhost:8080/live_test_dashboard.html | grep "200 OK" > /dev/null && ((CHECKS_PASSED++))

if [ $CHECKS_PASSED -eq $CHECKS_TOTAL ]; then
    echo -e "   ${GREEN}✅ All systems operational! ($CHECKS_PASSED/$CHECKS_TOTAL checks passed)${NC}"
elif [ $CHECKS_PASSED -ge 3 ]; then
    echo -e "   ${YELLOW}⚠️  Mostly operational ($CHECKS_PASSED/$CHECKS_TOTAL checks passed)${NC}"
else
    echo -e "   ${RED}❌ System issues detected! ($CHECKS_PASSED/$CHECKS_TOTAL checks passed)${NC}"
fi

echo ""
echo "==============================================="
echo "   Diagnostic completed at $(date '+%H:%M:%S')"
echo "==============================================="

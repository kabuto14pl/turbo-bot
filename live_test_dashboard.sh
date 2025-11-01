#!/bin/bash
# 📊 Live Test Dashboard - Real-time monitoring bez przerywania testu

TEST_ID="extended_test_20251012_151143"
REFRESH_INTERVAL=5

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

clear

while true; do
    # Move cursor to top
    tput cup 0 0
    
    echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║           🚀 AUTONOMOUS TRADING BOT - LIVE TEST DASHBOARD 📊              ║${NC}"
    echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # ============================================================================
    # TEST STATUS
    # ============================================================================
    echo -e "${BOLD}${PURPLE}┌─ TEST STATUS ─────────────────────────────────────────────────────────────┐${NC}"
    
    if [ -f "data/$TEST_ID/bot.pid" ]; then
        BOT_PID=$(cat data/$TEST_ID/bot.pid)
        START_TIME=$(stat -c %Y data/$TEST_ID/bot.pid)
        CURRENT_TIME=$(date +%s)
        ELAPSED=$((CURRENT_TIME - START_TIME))
        REMAINING=$((7200 - ELAPSED))
        PROGRESS=$((ELAPSED * 100 / 7200))
        
        # Calculate times
        ELAPSED_MIN=$((ELAPSED / 60))
        ELAPSED_SEC=$((ELAPSED % 60))
        REMAINING_MIN=$((REMAINING / 60))
        REMAINING_SEC=$((REMAINING % 60))
        SIMULATED_HOURS=$((ELAPSED * 24 / 3600))
        
        echo -e "${BLUE}Test ID:${NC}        $TEST_ID"
        echo -e "${BLUE}Start Time:${NC}     $(date -d @$START_TIME '+%H:%M:%S')"
        echo -e "${BLUE}Current Time:${NC}   $(date '+%H:%M:%S')"
        echo -e "${BLUE}Elapsed:${NC}        ${ELAPSED_MIN}m ${ELAPSED_SEC}s / 120m (${PROGRESS}%)"
        echo -e "${BLUE}Remaining:${NC}      ${REMAINING_MIN}m ${REMAINING_SEC}s"
        echo -e "${BLUE}Simulated:${NC}      ${SIMULATED_HOURS}h / 48h (trading time)"
        
        # Progress bar
        BAR_WIDTH=50
        FILLED=$((PROGRESS * BAR_WIDTH / 100))
        EMPTY=$((BAR_WIDTH - FILLED))
        printf "${BLUE}Progress:${NC}       ["
        printf "%${FILLED}s" | tr ' ' '='
        printf "%${EMPTY}s" | tr ' ' '-'
        printf "] ${PROGRESS}%%\n"
    else
        echo -e "${RED}No test data found!${NC}"
    fi
    
    echo -e "${PURPLE}└───────────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    
    # ============================================================================
    # BOT STATUS
    # ============================================================================
    echo -e "${BOLD}${GREEN}┌─ BOT STATUS ──────────────────────────────────────────────────────────────┐${NC}"
    
    if kill -0 $BOT_PID 2>/dev/null; then
        echo -e "${GREEN}Status:${NC}         ✅ RUNNING (PID: $BOT_PID)"
        
        # Get process stats
        MEM=$(ps -p $BOT_PID -o rss= 2>/dev/null | awk '{print $1/1024}' || echo "0")
        CPU=$(ps -p $BOT_PID -o %cpu= 2>/dev/null || echo "0")
        
        echo -e "${GREEN}Memory:${NC}         ${MEM} MB"
        echo -e "${GREEN}CPU:${NC}            ${CPU}%"
        
        # Health check
        HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null | jq -r '.status' 2>/dev/null || echo "unknown")
        if [ "$HEALTH" = "healthy" ]; then
            echo -e "${GREEN}Health:${NC}         ✅ HEALTHY"
        else
            echo -e "${YELLOW}Health:${NC}         ⚠️  $HEALTH"
        fi
        
    else
        echo -e "${RED}Status:${NC}         ❌ CRASHED OR STOPPED"
    fi
    
    echo -e "${GREEN}└───────────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    
    # ============================================================================
    # TRADING METRICS
    # ============================================================================
    echo -e "${BOLD}${YELLOW}┌─ TRADING METRICS ─────────────────────────────────────────────────────────┐${NC}"
    
    PORTFOLIO=$(curl -s http://localhost:3001/api/portfolio 2>/dev/null)
    if [ ! -z "$PORTFOLIO" ]; then
        TOTAL_VALUE=$(echo $PORTFOLIO | jq -r '.totalValue // 10000' 2>/dev/null || echo "10000")
        TOTAL_TRADES=$(echo $PORTFOLIO | jq -r '.totalTrades // 0' 2>/dev/null || echo "0")
        UNREALIZED_PNL=$(echo $PORTFOLIO | jq -r '.unrealizedPnL // 0' 2>/dev/null || echo "0")
        REALIZED_PNL=$(echo $PORTFOLIO | jq -r '.realizedPnL // 0' 2>/dev/null || echo "0")
        
        echo -e "${YELLOW}Portfolio Value:${NC}  \$$TOTAL_VALUE"
        echo -e "${YELLOW}Total Trades:${NC}     $TOTAL_TRADES"
        echo -e "${YELLOW}Unrealized P&L:${NC}   \$$UNREALIZED_PNL"
        echo -e "${YELLOW}Realized P&L:${NC}     \$$REALIZED_PNL"
        
        # Calculate P&L percentage
        if [ "$TOTAL_VALUE" != "10000" ]; then
            PNL_PCT=$(echo "scale=2; ($TOTAL_VALUE - 10000) / 10000 * 100" | bc)
            if (( $(echo "$PNL_PCT > 0" | bc -l) )); then
                echo -e "${YELLOW}Performance:${NC}      ${GREEN}+${PNL_PCT}%${NC}"
            else
                echo -e "${YELLOW}Performance:${NC}      ${RED}${PNL_PCT}%${NC}"
            fi
        else
            echo -e "${YELLOW}Performance:${NC}      ${CYAN}0.00% (no trades yet)${NC}"
        fi
    else
        echo -e "${RED}Unable to fetch portfolio data${NC}"
    fi
    
    echo -e "${YELLOW}└───────────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    
    # ============================================================================
    # ML & STRATEGY
    # ============================================================================
    echo -e "${BOLD}${CYAN}┌─ ML & STRATEGY ───────────────────────────────────────────────────────────┐${NC}"
    
    # Get last ML action from logs
    if [ -f "logs/$TEST_ID/bot.log" ]; then
        LAST_ML=$(tail -100 logs/$TEST_ID/bot.log | grep "🧠 ML Action:" | tail -1)
        if [ ! -z "$LAST_ML" ]; then
            ML_ACTION=$(echo $LAST_ML | grep -oP '(?<=ML Action: )[A-Z]+' || echo "N/A")
            ML_CONFIDENCE=$(echo $LAST_ML | grep -oP '(?<=confidence: )[0-9.]+' || echo "0.0")
            
            echo -e "${CYAN}Last ML Action:${NC}   $ML_ACTION"
            echo -e "${CYAN}ML Confidence:${NC}    $ML_CONFIDENCE"
            
            # Confidence bar
            CONF_PCT=$(echo "scale=0; $ML_CONFIDENCE * 100 / 1" | bc 2>/dev/null || echo "0")
            CONF_FILLED=$((CONF_PCT * 30 / 100))
            CONF_EMPTY=$((30 - CONF_FILLED))
            printf "${CYAN}Confidence Bar:${NC}   ["
            if [ $CONF_PCT -gt 70 ]; then
                printf "${GREEN}"
            elif [ $CONF_PCT -gt 40 ]; then
                printf "${YELLOW}"
            else
                printf "${RED}"
            fi
            printf "%${CONF_FILLED}s" | tr ' ' '█'
            printf "${NC}"
            printf "%${CONF_EMPTY}s" | tr ' ' '░'
            printf "] ${CONF_PCT}%%\n"
        else
            echo -e "${CYAN}Last ML Action:${NC}   No data yet"
        fi
        
        # Error count
        ERROR_COUNT=$(grep -c "ERROR\|❌" logs/$TEST_ID/bot.log 2>/dev/null || echo "0")
        if [ $ERROR_COUNT -lt 50 ]; then
            echo -e "${CYAN}Errors:${NC}           ${GREEN}$ERROR_COUNT (acceptable)${NC}"
        elif [ $ERROR_COUNT -lt 100 ]; then
            echo -e "${CYAN}Errors:${NC}           ${YELLOW}$ERROR_COUNT (moderate)${NC}"
        else
            echo -e "${CYAN}Errors:${NC}           ${RED}$ERROR_COUNT (high!)${NC}"
        fi
    fi
    
    echo -e "${CYAN}└───────────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    
    # ============================================================================
    # MONITORING DATA
    # ============================================================================
    echo -e "${BOLD}${PURPLE}┌─ MONITORING DATA ─────────────────────────────────────────────────────────┐${NC}"
    
    if [ -f "logs/$TEST_ID/monitoring.csv" ]; then
        DATAPOINTS=$(wc -l < logs/$TEST_ID/monitoring.csv)
        DATAPOINTS=$((DATAPOINTS - 1)) # Exclude header
        echo -e "${PURPLE}Data Points:${NC}      $DATAPOINTS snapshots collected"
        
        # Show last 3 monitoring entries
        echo -e "${PURPLE}Recent Data:${NC}"
        tail -3 logs/$TEST_ID/monitoring.csv | while IFS=',' read -r time status mem trades portfolio errors; do
            if [ "$time" != "Time" ]; then
                TIMESTAMP=$(date -d @$time '+%H:%M:%S' 2>/dev/null || echo "$time")
                printf "  ${PURPLE}%s${NC} | Mem: ${mem}MB | Trades: $trades | Portfolio: \$$portfolio | Errors: $errors\n" "$TIMESTAMP"
            fi
        done
    else
        echo -e "${PURPLE}Monitoring CSV:${NC}   Not created yet"
    fi
    
    echo -e "${PURPLE}└───────────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    
    # ============================================================================
    # SYSTEM INFO
    # ============================================================================
    echo -e "${BOLD}${BLUE}┌─ SYSTEM INFO ─────────────────────────────────────────────────────────────┐${NC}"
    
    # Codespace timeout
    echo -e "${BLUE}Codespace:${NC}      ⏰ Timeout extended to 240 minutes"
    
    # Keep-alive status
    if pgrep -f "keep_codespace_alive" > /dev/null; then
        echo -e "${BLUE}Keep-Alive:${NC}     ✅ Active (preventing idle shutdown)"
    else
        echo -e "${BLUE}Keep-Alive:${NC}     ⚠️  Not running"
    fi
    
    # Test script
    if pgrep -f "extended_test_simplified" > /dev/null; then
        echo -e "${BLUE}Test Script:${NC}    ✅ Running"
    else
        echo -e "${BLUE}Test Script:${NC}    ❌ Stopped"
    fi
    
    echo -e "${BLUE}└───────────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    
    # ============================================================================
    # FOOTER
    # ============================================================================
    echo -e "${CYAN}Refreshing every ${REFRESH_INTERVAL} seconds... Press Ctrl+C to exit${NC}"
    echo -e "${CYAN}Dashboard running in parallel - TEST IS NOT INTERRUPTED${NC}"
    echo ""
    
    sleep $REFRESH_INTERVAL
done

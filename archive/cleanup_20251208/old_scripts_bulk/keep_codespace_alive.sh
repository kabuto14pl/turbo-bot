#!/bin/bash
# 🔄 Codespace Keep-Alive
# Prevents GitHub Codespace from sleeping due to inactivity

echo "🔄 Codespace Keep-Alive Monitor"
echo "================================"
echo "This script prevents Codespace from timing out"
echo "by generating periodic activity every 4 minutes"
echo ""
echo "Started at: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Press Ctrl+C to stop"
echo ""

# Counter
PING_COUNT=0

while true; do
    PING_COUNT=$((PING_COUNT + 1))
    NOW=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⏰ Keepalive #$PING_COUNT at $NOW"
    
    # 1. File system activity (creates timestamp in logs)
    echo "[$NOW] Keepalive ping #$PING_COUNT" >> logs/keepalive.log
    touch /tmp/keepalive_$(date +%s)
    echo "✅ File system activity recorded"
    
    # 2. Network activity - check bot health
    if curl -s -m 5 http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Bot health check: RESPONDING"
    else
        echo "⚠️  Bot health check: NOT RESPONDING"
    fi
    
    # 3. Check bot process
    if pgrep -f "autonomous_trading_bot" > /dev/null 2>&1; then
        BOT_PID=$(pgrep -f "autonomous_trading_bot" | head -1)
        BOT_MEM=$(ps -p $BOT_PID -o rss= 2>/dev/null | awk '{print $1/1024}' || echo "unknown")
        BOT_CPU=$(ps -p $BOT_PID -o %cpu= 2>/dev/null || echo "unknown")
        echo "✅ Bot process: ALIVE (PID: $BOT_PID, Mem: ${BOT_MEM}MB, CPU: ${BOT_CPU}%)"
    else
        echo "❌ Bot process: NOT FOUND!"
        echo "⚠️  WARNING: Bot may have crashed or stopped"
        
        # Check if there's a PID file from extended test
        if [ -f "data/extended_test_*/bot.pid" ]; then
            SAVED_PID=$(cat data/extended_test_*/bot.pid 2>/dev/null | tail -1)
            echo "   Last known PID: $SAVED_PID"
        fi
    fi
    
    # 4. System status
    UPTIME=$(uptime -p 2>/dev/null || echo "unknown")
    LOAD=$(uptime | awk -F'load average:' '{print $2}' | xargs)
    echo "📊 System uptime: $UPTIME"
    echo "📊 Load average: $LOAD"
    
    # 5. Disk activity
    df -h /workspaces/turbo-bot | tail -1 | awk '{print "💾 Disk usage: " $3 "/" $2 " (" $5 ")"}'
    
    # 6. Check if extended test is running
    if [ -d "logs/extended_test_"* ]; then
        LATEST_TEST=$(ls -td logs/extended_test_* 2>/dev/null | head -1)
        if [ -f "$LATEST_TEST/monitoring.csv" ]; then
            LINES=$(wc -l < "$LATEST_TEST/monitoring.csv" 2>/dev/null || echo "0")
            echo "📈 Extended test active: $((LINES - 1)) monitoring records"
        fi
    fi
    
    echo ""
    echo "Next keepalive in 4 minutes..."
    
    # Sleep 4 minutes (less than typical 10 min Codespace timeout)
    sleep 240
done

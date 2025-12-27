#!/bin/bash
# OKX WebSocket 1-Hour Monitoring Script
# Records latency, uptime, messages, price updates

LOGFILE="/workspaces/turbo-bot/logs/okx_websocket_monitoring_$(date +%Y%m%d_%H%M%S).log"
ENDPOINT="http://localhost:3001/api/websocket/okx"
INTERVAL=60  # Check every 60 seconds
DURATION=3600  # 1 hour

echo "🚀 Starting OKX WebSocket 1-hour monitoring..." | tee "$LOGFILE"
echo "   Endpoint: $ENDPOINT" | tee -a "$LOGFILE"
echo "   Interval: ${INTERVAL}s" | tee -a "$LOGFILE"
echo "   Duration: ${DURATION}s (1 hour)" | tee -a "$LOGFILE"
echo "   Log: $LOGFILE" | tee -a "$LOGFILE"
echo "" | tee -a "$LOGFILE"

START_TIME=$(date +%s)
ITERATIONS=$((DURATION / INTERVAL))

for i in $(seq 1 $ITERATIONS); do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    REMAINING=$((DURATION - ELAPSED))
    
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Get WebSocket stats
    RESPONSE=$(curl -s "$ENDPOINT" 2>&1)
    
    if [ $? -eq 0 ]; then
        CONNECTED=$(echo "$RESPONSE" | jq -r '.connected // false')
        LATENCY=$(echo "$RESPONSE" | jq -r '.stats.latency // "N/A"')
        MESSAGES=$(echo "$RESPONSE" | jq -r '.stats.messagesReceived // 0')
        TICKER_UPDATES=$(echo "$RESPONSE" | jq -r '.stats.tickerUpdates // 0')
        TRADE_UPDATES=$(echo "$RESPONSE" | jq -r '.stats.tradeUpdates // 0')
        RECONNECTS=$(echo "$RESPONSE" | jq -r '.stats.reconnectAttempts // 0')
        PRICE=$(echo "$RESPONSE" | jq -r '.lastUpdate.ticker.price // "N/A"')
        TICKER_AGE=$(echo "$RESPONSE" | jq -r '.lastUpdate.ticker.age // "N/A"')
        CACHE_SIZE=$(echo "$RESPONSE" | jq -r '.cacheSize // 0')
        
        # Log entry
        LOG_ENTRY="[$TIMESTAMP] [$i/$ITERATIONS] Connected: $CONNECTED | Latency: ${LATENCY}ms | Messages: $MESSAGES | Ticker: $TICKER_UPDATES | Trades: $TRADE_UPDATES | Reconnects: $RECONNECTS | Price: \$$PRICE | Age: ${TICKER_AGE}ms | Cache: $CACHE_SIZE | Remaining: ${REMAINING}s"
        
        echo "$LOG_ENTRY" | tee -a "$LOGFILE"
        
        # Alert if disconnected
        if [ "$CONNECTED" != "true" ]; then
            echo "   ⚠️  WARNING: OKX WebSocket DISCONNECTED!" | tee -a "$LOGFILE"
        fi
        
        # Alert if high latency
        if [ "$LATENCY" != "N/A" ] && [ "$LATENCY" -gt 200 ]; then
            echo "   ⚠️  WARNING: High latency detected: ${LATENCY}ms (>200ms threshold)" | tee -a "$LOGFILE"
        fi
        
    else
        echo "[$TIMESTAMP] [$i/$ITERATIONS] ❌ ERROR: Failed to query endpoint" | tee -a "$LOGFILE"
    fi
    
    # Sleep until next iteration (unless last iteration)
    if [ $i -lt $ITERATIONS ]; then
        sleep $INTERVAL
    fi
done

echo "" | tee -a "$LOGFILE"
echo "✅ 1-hour monitoring complete!" | tee -a "$LOGFILE"
echo "" | tee -a "$LOGFILE"

# Calculate statistics
echo "📊 FINAL STATISTICS:" | tee -a "$LOGFILE"
FINAL_RESPONSE=$(curl -s "$ENDPOINT" 2>&1)
FINAL_CONNECTED=$(echo "$FINAL_RESPONSE" | jq -r '.connected // false')
FINAL_LATENCY=$(echo "$FINAL_RESPONSE" | jq -r '.stats.latency // 0')
FINAL_MESSAGES=$(echo "$FINAL_RESPONSE" | jq -r '.stats.messagesReceived // 0')
FINAL_RECONNECTS=$(echo "$FINAL_RESPONSE" | jq -r '.stats.reconnectAttempts // 0')

echo "   Connected: $FINAL_CONNECTED" | tee -a "$LOGFILE"
echo "   Final Latency: ${FINAL_LATENCY}ms" | tee -a "$LOGFILE"
echo "   Total Messages: $FINAL_MESSAGES" | tee -a "$LOGFILE"
echo "   Reconnect Attempts: $FINAL_RECONNECTS" | tee -a "$LOGFILE"

if [ "$FINAL_RECONNECTS" -eq 0 ]; then
    echo "   ✅ STABLE: No reconnections during test" | tee -a "$LOGFILE"
else
    echo "   ⚠️  RECONNECTIONS DETECTED: $FINAL_RECONNECTS attempts" | tee -a "$LOGFILE"
fi

if [ "$FINAL_LATENCY" -lt 200 ]; then
    echo "   ✅ LATENCY: ${FINAL_LATENCY}ms (<200ms target)" | tee -a "$LOGFILE"
else
    echo "   ❌ LATENCY: ${FINAL_LATENCY}ms (EXCEEDS 200ms target)" | tee -a "$LOGFILE"
fi

echo "" | tee -a "$LOGFILE"
echo "📁 Full log saved to: $LOGFILE" | tee -a "$LOGFILE"

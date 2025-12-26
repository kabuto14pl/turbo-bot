#!/bin/bash
# 🧪 Extended Test - Simplified (Without Production Deployment Manager)

echo "🧪 Starting SIMPLIFIED Extended Test (48h simulation in 2h real time)"
echo "========================================================================"

# Configuration
DURATION=7200  # 2 hours real time
TIME_MULTIPLIER=24
CHECK_INTERVAL=120  # Check every 2 minutes
TRADING_INTERVAL=1250  # 1.25s

# Setup
TEST_ID="extended_test_$(date +%Y%m%d_%H%M%S)"
mkdir -p logs/$TEST_ID
mkdir -p data/$TEST_ID

echo "📊 Test Configuration:"
echo "   Test ID: $TEST_ID"
echo "   Duration: 2 hours real-time"
echo "   Simulated: 48 hours"
echo "   Time multiplier: 24x"
echo "   Trading interval: ${TRADING_INTERVAL}ms"
echo ""

# Update .env for simplified test mode
cat > .env.test << EOF
MODE=simulation
HEALTH_CHECK_PORT=3001
TRADING_INTERVAL=$TRADING_INTERVAL
REDIS_ENABLED=false
TF_CPP_MIN_LOG_LEVEL=2
TEST_MODE=accelerated
TIME_MULTIPLIER=$TIME_MULTIPLIER
NODE_ENV=test
DISABLE_PRODUCTION_DEPLOYMENT=true
DISABLE_DISTRIBUTED_ML=true
EOF

echo "⚙️  Test environment configured (simplified mode)"

# Start bot with test config using a simpler entry point
echo "🚀 Starting bot in simplified mode..."

# Export test environment variables
export $(cat .env.test | xargs)

# Start bot directly with ts-node
echo "🚀 Starting bot with environment:"
echo "   DISABLE_PRODUCTION_DEPLOYMENT=true"
echo "   DISABLE_DISTRIBUTED_ML=true"
echo "   MODE=simulation"
echo ""

nohup npm exec ts-node -- trading-bot/autonomous_trading_bot_final.ts > logs/$TEST_ID/bot.log 2>&1 &
BOT_PID=$!
echo $BOT_PID > data/$TEST_ID/bot.pid

echo "✅ Bot started (PID: $BOT_PID)"
echo ""

# Wait for initialization
echo "⏳ Waiting for bot initialization (20 seconds)..."
sleep 20

# Check if bot started successfully
if ! kill -0 $BOT_PID 2>/dev/null; then
    echo "❌ Bot failed to start! Check logs/$TEST_ID/bot.log"
    echo ""
    echo "Last 50 lines of log:"
    tail -50 logs/$TEST_ID/bot.log
    exit 1
fi

# Check health endpoint
HEALTH_CHECK_ATTEMPTS=0
MAX_HEALTH_ATTEMPTS=10

while [ $HEALTH_CHECK_ATTEMPTS -lt $MAX_HEALTH_ATTEMPTS ]; do
    if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Bot health check passed"
        break
    fi
    HEALTH_CHECK_ATTEMPTS=$((HEALTH_CHECK_ATTEMPTS + 1))
    echo "   Waiting for health endpoint... attempt $HEALTH_CHECK_ATTEMPTS/$MAX_HEALTH_ATTEMPTS"
    sleep 3
done

if [ $HEALTH_CHECK_ATTEMPTS -eq $MAX_HEALTH_ATTEMPTS ]; then
    echo "⚠️  Health endpoint not responding, but continuing test..."
    echo "   Bot process is alive, may be initializing..."
fi

echo ""
echo "✅ Test initialization complete"
echo ""

# Monitoring loop
START_TIME=$(date +%s)
END_TIME=$((START_TIME + DURATION))
ITERATION=0

echo "📈 Monitoring started..."
echo "===================="
echo ""
echo "Time,Status,Memory(MB),Trades,Portfolio,Errors" > logs/$TEST_ID/monitoring.csv

while [ $(date +%s) -lt $END_TIME ]; do
    ITERATION=$((ITERATION + 1))
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    REMAINING=$((DURATION - ELAPSED))
    
    # Check if bot is running
    if ! kill -0 $BOT_PID 2>/dev/null; then
        echo ""
        echo "❌ [$(date '+%H:%M:%S')] Bot crashed!"
        echo "Last 50 lines of log:"
        tail -50 logs/$TEST_ID/bot.log
        exit 1
    fi
    
    # Collect metrics
    HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null || echo '{"status":"unknown"}')
    PORTFOLIO=$(curl -s http://localhost:3001/api/portfolio 2>/dev/null || echo '{}')
    
    # Parse metrics
    STATUS=$(echo $HEALTH | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
    MEMORY=$(ps -p $BOT_PID -o rss= 2>/dev/null | awk '{print $1/1024}' || echo "0")
    TRADES=$(echo $PORTFOLIO | jq -r '.totalTrades // 0' 2>/dev/null || echo "0")
    PORTFOLIO_VALUE=$(echo $PORTFOLIO | jq -r '.totalValue // 10000' 2>/dev/null || echo "10000")
    ERRORS=$(grep -c "ERROR\|Error" logs/$TEST_ID/bot.log 2>/dev/null || echo "0")
    
    # Log to CSV
    echo "$CURRENT_TIME,$STATUS,$MEMORY,$TRADES,$PORTFOLIO_VALUE,$ERRORS" >> logs/$TEST_ID/monitoring.csv
    
    # Console output
    SIMULATED_HOURS=$((ELAPSED * TIME_MULTIPLIER / 3600))
    PROGRESS=$((ELAPSED * 100 / DURATION))
    echo -ne "\r⏰ Progress: ${PROGRESS}% | Sim: ${SIMULATED_HOURS}/48h | Mem: ${MEMORY}MB | Trades: $TRADES | \$${PORTFOLIO_VALUE} | Errors: $ERRORS | Remaining: ${REMAINING}s   "
    
    # Save snapshot every 10 minutes (= 4h simulated)
    if [ $((ELAPSED % 600)) -eq 0 ] && [ $ELAPSED -gt 0 ]; then
        echo ""
        echo "💾 [$(date '+%H:%M:%S')] Saving snapshot at ${SIMULATED_HOURS}h simulated time..."
        curl -s http://localhost:3001/api/portfolio 2>/dev/null > data/$TEST_ID/snapshot_${SIMULATED_HOURS}h.json || true
    fi
    
    # Sleep
    sleep $CHECK_INTERVAL
done

echo ""
echo ""
echo "✅ Test completed!"
echo "===================="

# Stop bot gracefully
echo "🛑 Stopping bot..."
kill $BOT_PID 2>/dev/null
sleep 5

# Force kill if still running
if kill -0 $BOT_PID 2>/dev/null; then
    echo "⚠️  Force killing bot..."
    kill -9 $BOT_PID 2>/dev/null
fi

echo "✅ Bot stopped"
echo ""

# Generate report
echo "📊 Generating analysis report..."
if [ -f "./analyze_extended_test.sh" ]; then
    bash ./analyze_extended_test.sh $TEST_ID
else
    echo "⚠️  Analysis script not found."
fi

echo ""
echo "📁 Test results saved to:"
echo "   - Logs: logs/$TEST_ID/bot.log"
echo "   - Monitoring: logs/$TEST_ID/monitoring.csv"
echo "   - Snapshots: data/$TEST_ID/"
echo ""
echo "🎉 Extended test finished!"

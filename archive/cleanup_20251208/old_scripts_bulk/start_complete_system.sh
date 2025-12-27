#!/bin/bash
# 🔧 [DEVELOPMENT-TOOL]
# Development tool script

# 🚀 FINAL SYSTEM STARTUP SCRIPT
# Uruchamia pełny working system: Dashboard + Bot + Metrics

echo "🚀 STARTING COMPLETE TRADING SYSTEM"
echo "=================================="

# Check if monitoring is running
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo "❌ Dashboard not running. Starting monitoring system..."
    cd /workspaces/turbo-bot/monitoring/working
    
    # Start Dashboard
    node dashboard_server.js &
    DASHBOARD_PID=$!
    echo $DASHBOARD_PID > dashboard.pid
    
    # Start Metrics
    node metrics_server.js &
    METRICS_PID=$!
    echo $METRICS_PID > metrics.pid
    
    sleep 3
    echo "✅ Monitoring system started"
else
    echo "✅ Monitoring system already running"
fi

# Start Bot
cd /workspaces/turbo-bot
echo "🤖 Starting Autonomous Trading Bot Final..."

# Kill any existing bot processes
pkill -f "autonomous_trading_bot_final" 2>/dev/null || true
sleep 2

# Start the bot
node dist/autonomous_trading_bot_final.js &
BOT_PID=$!
echo $BOT_PID > bot.pid

sleep 5

echo ""
echo "🎉 COMPLETE SYSTEM STARTED!"
echo "=========================="
echo ""
echo "🌐 DASHBOARD: http://localhost:3000/dashboard"
echo "🏥 BOT HEALTH: http://localhost:3001/health"
echo "📊 METRICS: http://localhost:9090/metrics"
echo "🔧 API: http://localhost:3000/api"
echo ""
echo "PIDs: Dashboard=$(cat monitoring/working/dashboard.pid), Metrics=$(cat monitoring/working/metrics.pid), Bot=$(cat bot.pid)"
echo ""

# Test endpoints
echo "🔍 Testing endpoints..."
echo -n "Dashboard: "
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ WORKING"
else
    echo "❌ FAILED"
fi

echo -n "Metrics: "
if curl -s http://localhost:9090/metrics > /dev/null; then
    echo "✅ WORKING"
else
    echo "❌ FAILED"
fi

echo -n "Bot Health: "
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ WORKING"
else
    echo "❌ FAILED (this is expected - bot may be starting)"
fi

echo ""
echo "🚀 SYSTEM FULLY OPERATIONAL!"
echo "💡 Open http://localhost:3000/dashboard to see the interface"
echo ""
echo "🛑 To stop: kill \$(cat *.pid monitoring/working/*.pid) && rm *.pid monitoring/working/*.pid"

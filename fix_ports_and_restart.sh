#!/bin/bash
# 🔧 [DEVELOPMENT-TOOL]
# Development tool script

# 🔧 PORT CLEANUP & SYSTEM RESTART
# Czyści niepotrzebne porty i uruchamia tylko niezbędne serwisy

echo "🔧 CLEANING UP PORTS AND RESTARTING SYSTEM"
echo "=========================================="

# Stop wszystkie procesy Node.js związane z monitoringiem
echo "🛑 Stopping all monitoring processes..."

# Kill specific processes
pkill -f "dashboard_server" 2>/dev/null || true
pkill -f "metrics_server" 2>/dev/null || true
pkill -f "autonomous_trading_bot" 2>/dev/null || true
pkill -f "autonomous_trading_bot_final" 2>/dev/null || true

# Kill processes on specific ports
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
fuser -k 9090/tcp 2>/dev/null || true
fuser -k 5470/tcp 2>/dev/null || true
fuser -k 36603/tcp 2>/dev/null || true

sleep 3

echo "✅ All processes stopped"

# Remove old PID files
rm -f /workspaces/turbo-bot/*.pid 2>/dev/null || true
rm -f /workspaces/turbo-bot/monitoring/working/*.pid 2>/dev/null || true

echo "🧹 Cleaned up PID files"

# Sprawdź czy porty są wolne
echo "🔍 Checking ports..."
if lsof -i :3000 >/dev/null 2>&1; then
    echo "⚠️  Port 3000 still occupied"
else
    echo "✅ Port 3000 free"
fi

if lsof -i :3001 >/dev/null 2>&1; then
    echo "⚠️  Port 3001 still occupied"
else
    echo "✅ Port 3001 free"
fi

if lsof -i :9090 >/dev/null 2>&1; then
    echo "⚠️  Port 9090 still occupied"
else
    echo "✅ Port 9090 free"
fi

sleep 2

echo ""
echo "🚀 STARTING MINIMAL WORKING SYSTEM"
echo "================================="

cd /workspaces/turbo-bot/monitoring/working

# Start Dashboard Server (Port 3000)
echo "🌐 Starting Dashboard Server..."
nohup node dashboard_server.js > dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo $DASHBOARD_PID > dashboard.pid
echo "✅ Dashboard started (PID: $DASHBOARD_PID)"

sleep 2

# Start Metrics Server (Port 9090)
echo "📊 Starting Metrics Server..."
nohup node metrics_server.js > metrics.log 2>&1 &
METRICS_PID=$!
echo $METRICS_PID > metrics.pid
echo "✅ Metrics started (PID: $METRICS_PID)"

sleep 2

# Start Bot (Port 3001)
cd /workspaces/turbo-bot
echo "🤖 Starting Trading Bot..."
nohup node dist/autonomous_trading_bot_final.js > bot.log 2>&1 &
BOT_PID=$!
echo $BOT_PID > bot.pid
echo "✅ Bot started (PID: $BOT_PID)"

sleep 5

echo ""
echo "🔍 TESTING ALL ENDPOINTS"
echo "========================"

# Test Dashboard
echo -n "Dashboard (3000): "
if curl -s http://localhost:3000/health >/dev/null 2>&1; then
    echo "✅ WORKING"
else
    echo "❌ FAILED"
fi

# Test Bot
echo -n "Bot Health (3001): "
if curl -s http://localhost:3001/health >/dev/null 2>&1; then
    echo "✅ WORKING"
else
    echo "❌ FAILED"
fi

# Test Metrics
echo -n "Metrics (9090): "
if curl -s http://localhost:9090/metrics >/dev/null 2>&1; then
    echo "✅ WORKING"
else
    echo "❌ FAILED"
fi

echo ""
echo "🎯 FINAL STATUS"
echo "==============="

# Show only our ports
echo "📊 Active ports:"
lsof -i TCP | grep -E "(3000|3001|9090)" | grep LISTEN

echo ""
echo "🎉 SYSTEM READY!"
echo "=================="
echo ""
echo "🌐 DASHBOARD: http://localhost:3000/dashboard"
echo "🏥 BOT HEALTH: http://localhost:3001/health"
echo "📊 METRICS: http://localhost:9090/metrics"
echo ""
echo "PIDs: Dashboard=$DASHBOARD_PID, Bot=$BOT_PID, Metrics=$METRICS_PID"
echo ""
echo "🛑 To stop: kill \$(cat *.pid monitoring/working/*.pid) && rm *.pid monitoring/working/*.pid"

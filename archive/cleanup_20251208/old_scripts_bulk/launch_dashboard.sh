#!/bin/bash

# ============================================================================
# 🖥️  DASHBOARD LAUNCHER - Paper Trading Web Interface
# ============================================================================

echo "🖥️  ============================================================"
echo "   LAUNCHING PAPER TRADING WEB DASHBOARD"
echo "🖥️  ============================================================"
echo ""

# Check if bot is running
BOT_PID=$(cat bot_paper_trading.pid 2>/dev/null)
if [ -z "$BOT_PID" ] || ! ps -p $BOT_PID > /dev/null 2>&1; then
    echo "❌ ERROR: Trading bot is not running!"
    echo "   Start bot first: ./test_paper_trading.sh"
    exit 1
fi

echo "✅ Bot is running (PID: $BOT_PID)"
echo ""

# Check if HTTP server is already running
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ Dashboard HTTP server already running on port 8080"
else
    echo "🚀 Starting dashboard HTTP server on port 8080..."
    
    # Kill any existing python http servers
    pkill -f "python.*http.server.*8080" 2>/dev/null || true
    sleep 1
    
    # Start new HTTP server
    cd /workspaces/turbo-bot
    nohup python3 -m http.server 8080 > logs/dashboard_http.log 2>&1 &
    HTTP_PID=$!
    echo $HTTP_PID > dashboard_http.pid
    
    sleep 2
    
    if ps -p $HTTP_PID > /dev/null; then
        echo "✅ Dashboard HTTP server started (PID: $HTTP_PID)"
    else
        echo "❌ Failed to start HTTP server"
        exit 1
    fi
fi

echo ""
echo "🖥️  ============================================================"
echo "   DASHBOARD READY!"
echo "🖥️  ============================================================"
echo ""
echo "📊 DASHBOARD ACCESS:"
echo ""
echo "   🌐 Web Interface:"
echo "      http://localhost:8080/dashboard.html"
echo ""
echo "   📡 API Endpoints (backend):"
echo "      http://localhost:3001/health"
echo "      http://localhost:3001/api/portfolio"
echo "      http://localhost:3001/api/circuit-breaker"
echo ""
echo "🔧 CODESPACE USERS:"
echo "   1. Go to PORTS tab in VS Code"
echo "   2. Find port 8080"
echo "   3. Click 'Open in Browser' or copy forwarded URL"
echo ""
echo "💡 FEATURES:"
echo "   ✅ Real-time portfolio tracking"
echo "   ✅ Live BTC-USDT price (OKX)"
echo "   ✅ Trading signals visualization"
echo "   ✅ Circuit breaker status"
echo "   ✅ Performance metrics"
echo "   ✅ Auto-refresh every 5 seconds"
echo ""
echo "🛑 TO STOP:"
echo "   Dashboard: kill \$(cat dashboard_http.pid)"
echo "   Bot: kill \$(cat bot_paper_trading.pid)"
echo ""
echo "🖥️  ============================================================"

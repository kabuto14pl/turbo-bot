#!/bin/bash
# 🔧 [DEVELOPMENT-TOOL]
# Development tool script

echo "🚀 Starting Turbo Trading Bot (Simplified Setup)"
echo "==============================================="

# Kill any existing processes
pkill -f "autonomous_trading_bot_final\|enterprise_dashboard" 2>/dev/null

echo "📊 Starting Trading Bot on port 3001..."
cd /workspaces/turbo-bot/trading-bot && node autonomous_trading_bot_final.js &
sleep 3

echo "📈 Starting Dashboard on port 3000..."
cd /workspaces/turbo-bot/monitoring/working && node enterprise_dashboard.js &
sleep 2

echo ""
echo "✅ Bot Started Successfully!"
echo "🌐 Dashboard: http://localhost:3000/dashboard"
echo "🔧 Bot API: http://localhost:3001/api/status"
echo ""
echo "📊 Check status:"
echo "  ps aux | grep node | grep -v grep"
echo "  netstat -tulpn | grep LISTEN"
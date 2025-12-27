#!/bin/bash

# ============================================================================
# 🔍 QUICK API CHECK - Paper Trading Endpoints
# ============================================================================

echo "🔍 Paper Trading API Quick Check"
echo "================================="
echo ""

echo "1️⃣  Health Status:"
curl -s http://localhost:3001/health | jq '{status, uptime, components}'
echo ""

echo "2️⃣  Portfolio:"
curl -s http://localhost:3001/api/portfolio | jq '{totalValue, realizedPnL, totalTrades, winRate, drawdown}'
echo ""

echo "3️⃣  Circuit Breaker:"
curl -s http://localhost:3001/api/circuit-breaker | jq '{isTripped, consecutiveLosses, tripCount}'
echo ""

echo "4️⃣  Recent Trades (from logs):"
tail -100 logs/paper_trading_*.log 2>/dev/null | grep "Trade executed" | tail -3
if [ $? -ne 0 ]; then
    echo "   No trades yet"
fi
echo ""

echo "5️⃣  Live Data (from logs):"
tail -100 logs/paper_trading_*.log 2>/dev/null | grep "LIVE DATA" | tail -3
if [ $? -ne 0 ]; then
    echo "   No live data yet"
fi
echo ""

echo "✅ API Check Complete!"
echo ""
echo "💡 USAGE:"
echo "   Full monitoring: ./watch_paper_trading.sh"
echo "   Single check:    ./monitor_paper_trading.sh"
echo "   This quick check: ./quick_check.sh"

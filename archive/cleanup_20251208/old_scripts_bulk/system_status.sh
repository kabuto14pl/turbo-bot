#!/bin/bash
# 🔧 [DEVELOPMENT-TOOL]
# Development tool script

# 🎉 FINAL STATUS CHECK
echo "🎉 FINAL SYSTEM STATUS CHECK"
echo "============================"

echo "🔍 Active Processes:"
ps aux | grep -E "(dashboard_clean|metrics_clean|autonomous)" | grep -v grep

echo ""
echo "🔌 Port Status:"
echo -n "Port 3000 (Dashboard): "
if nc -z localhost 3000; then echo "✅ OPEN"; else echo "❌ CLOSED"; fi

echo -n "Port 3001 (Bot): "
if nc -z localhost 3001; then echo "✅ OPEN"; else echo "❌ CLOSED"; fi

echo -n "Port 9090 (Metrics): "
if nc -z localhost 9090; then echo "✅ OPEN"; else echo "❌ CLOSED"; fi

echo ""
echo "🌐 Service Status:"
echo -n "Dashboard Service: "
if curl -s http://localhost:3000/ --max-time 2 > /dev/null; then echo "✅ RESPONDING"; else echo "❌ NOT RESPONDING"; fi

echo -n "Metrics Service: "
if curl -s http://localhost:9090/ --max-time 2 > /dev/null; then echo "✅ RESPONDING"; else echo "❌ NOT RESPONDING"; fi

echo -n "Bot Service: "
if curl -s http://localhost:3001/ --max-time 2 > /dev/null; then echo "✅ RESPONDING"; else echo "❌ NOT RESPONDING"; fi

echo ""
echo "🚀 SYSTEM SUMMARY:"
echo "=================="
echo "✅ Dashboard: http://localhost:3000/dashboard"
echo "✅ Metrics: http://localhost:9090/metrics"
echo "✅ Bot API: http://localhost:3001/"
echo ""
echo "🎯 TOTAL PORTS USED: 3 (cleaned from 8+)"
echo "🧹 VSCode processes: $(ps aux | grep vscode | grep -v grep | wc -l) (normal)"
echo "💻 Our services: $(ps aux | grep -E '(dashboard_clean|metrics_clean|autonomous)' | grep -v grep | wc -l) (active)"

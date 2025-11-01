#!/bin/bash
# 🔧 [DEVELOPMENT-TOOL]
# Development tool script

# 🔧 FINAL DIAGNOSTICS & FIX
echo "🔧 FINAL DIAGNOSTICS & FIX"
echo "=========================="

echo "📋 1. Checking ports:"
for port in 3000 3001 9090; do
    echo -n "Port $port: "
    if nc -z localhost $port; then
        echo "✅ OPEN"
    else
        echo "❌ CLOSED"
    fi
done

echo ""
echo "📋 2. Testing HTTP responses:"

echo -n "Dashboard (3000): "
if curl -s http://localhost:3000/health --max-time 2 > /dev/null; then
    echo "✅ RESPONDING"
else
    echo "❌ NOT RESPONDING"
fi

echo -n "Metrics (9090): "
if curl -s http://localhost:9090/metrics --max-time 2 > /dev/null; then
    echo "✅ RESPONDING"
else
    echo "❌ NOT RESPONDING"
fi

echo -n "Bot (3001): "
if curl -s http://localhost:3001/health --max-time 2 > /dev/null; then
    echo "✅ RESPONDING"
else
    echo "❌ NOT RESPONDING"
fi

echo ""
echo "📋 3. Process check:"
ps aux | grep -E "(dashboard_clean|metrics_clean|autonomous)" | grep -v grep | while read line; do
    echo "✅ $line"
done

echo ""
echo "📋 4. Quick responses:"
echo "Dashboard health:"
curl -s http://localhost:3000/health 2>/dev/null | head -c 100 || echo "FAILED"

echo -e "\n\nMetrics sample:"
curl -s http://localhost:9090/metrics 2>/dev/null | head -2 || echo "FAILED"

echo -e "\n\nBot status:"
curl -s http://localhost:3001/ 2>/dev/null | head -c 100 || echo "FAILED"

echo -e "\n\n🎯 SUMMARY:"
echo "============"
echo "✅ Dashboard: http://localhost:3000"
echo "✅ Metrics: http://localhost:9090" 
echo "✅ Bot: http://localhost:3001"
echo ""
echo "If you see ERR_CONNECTION_REFUSED in browser:"
echo "1. Try http://localhost:3000/dashboard directly"
echo "2. Try http://localhost:9090/metrics directly"
echo "3. Clear browser cache"
echo "4. Use different browser/incognito mode"

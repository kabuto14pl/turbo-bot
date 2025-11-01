#!/bin/bash
# 🔧 [DEVELOPMENT-TOOL]
# Development tool script

# 🚀 ENTERPRISE ML DASHBOARD STARTER
# 
# Skrypt do uruchamiania Enterprise ML Dashboard

echo "🚀 Starting Enterprise ML Dashboard..."

cd /workspaces/turbo-bot

# Sprawdź czy port 3001 jest wolny
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ Port 3001 is already in use. Killing existing process..."
    kill $(lsof -Pi :3001 -sTCP:LISTEN -t)
    sleep 2
fi

# Sprawdź czy port 9091 jest wolny dla Metrics Exporter
if ! lsof -Pi :9091 -sTCP:LISTEN -t >/dev/null ; then
    echo "🔄 Starting Enterprise ML Metrics Exporter on port 9091..."
    npx ts-node src/enterprise_ml_metrics_exporter.ts &
    EXPORTER_PID=$!
    echo "✅ Metrics Exporter started with PID: $EXPORTER_PID"
    sleep 3
fi

echo "🎯 Starting Enterprise ML Dashboard on port 3001..."
npx ts-node src/enterprise_ml_dashboard.ts &
DASHBOARD_PID=$!

echo "✅ Enterprise ML Dashboard started with PID: $DASHBOARD_PID"
echo "📊 Dashboard URL: http://localhost:3001"
echo "📈 Metrics URL: http://localhost:9091/metrics"

# Wait for services to start
sleep 5

echo "🔍 Testing endpoints..."
curl -s http://localhost:9091/health > /dev/null && echo "✅ Metrics Exporter is healthy" || echo "❌ Metrics Exporter failed"
curl -s http://localhost:3001/health > /dev/null && echo "✅ Dashboard is healthy" || echo "❌ Dashboard failed"

echo "🚀 Enterprise ML Monitoring Stack is ready!"
echo "Press Ctrl+C to stop the services"

# Keep script running
wait

#!/bin/bash
# 🚀 [PRODUCTION-OPERATIONAL]
# Production operational script

# Production Trading Bot Startup Script
echo "🚀 Starting Enterprise Trading Bot - Production Mode"
echo "===================================================="

# Load production environment
export NODE_ENV=production
source .env.production

# Start the main trading engine
echo "Starting ProductionTradingEngine..."
node dist/src/enterprise/production/ProductionTradingEngine.js &
TRADING_PID=$!

# Start monitoring services
echo "Starting monitoring services..."
node dist/src/enterprise/monitoring/system_health.js &
MONITORING_PID=$!

# Start metrics server
echo "Starting metrics server..."
node dist/src/enterprise/monitoring/prometheus_exporter.js &
METRICS_PID=$!

# Store PIDs for later management
echo $TRADING_PID > logs/production/trading.pid
echo $MONITORING_PID > logs/production/monitoring.pid  
echo $METRICS_PID > logs/production/metrics.pid

echo "✅ All services started successfully"
echo "📊 Trading Engine PID: $TRADING_PID"
echo "📈 Monitoring PID: $MONITORING_PID"
echo "📋 Metrics PID: $METRICS_PID"
echo ""
echo "🌐 Access monitoring at: http://localhost:9090/metrics"
echo "📝 Logs location: logs/production/"
echo ""
echo "🛑 To stop services: ./stop_production.sh"

#!/bin/bash
# 🚀 [PRODUCTION-OPERATIONAL]
# Production operational script

# Production Trading Bot Stop Script
echo "🛑 Stopping Enterprise Trading Bot - Production Mode"
echo "====================================================="

# Read PIDs and stop services gracefully
if [ -f "logs/production/trading.pid" ]; then
    TRADING_PID=$(cat logs/production/trading.pid)
    echo "Stopping Trading Engine (PID: $TRADING_PID)..."
    kill -TERM $TRADING_PID 2>/dev/null || echo "Trading engine already stopped"
    rm -f logs/production/trading.pid
fi

if [ -f "logs/production/monitoring.pid" ]; then
    MONITORING_PID=$(cat logs/production/monitoring.pid)
    echo "Stopping Monitoring Service (PID: $MONITORING_PID)..."
    kill -TERM $MONITORING_PID 2>/dev/null || echo "Monitoring service already stopped"
    rm -f logs/production/monitoring.pid
fi

if [ -f "logs/production/metrics.pid" ]; then
    METRICS_PID=$(cat logs/production/metrics.pid)
    echo "Stopping Metrics Server (PID: $METRICS_PID)..."
    kill -TERM $METRICS_PID 2>/dev/null || echo "Metrics server already stopped"
    rm -f logs/production/metrics.pid
fi

echo "✅ All services stopped successfully"

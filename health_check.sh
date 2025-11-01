#!/bin/bash
# 🚀 [PRODUCTION-OPERATIONAL]
# Production operational script

# 🚀 [PRODUCTION-OPERATIONAL]
# Production Health Check Script
# Production-ready health monitoring and system validation for live trading bot
# Operational tool for production environment monitoring

echo "🏥 Enterprise Trading Bot - Health Check"
echo "========================================"

# Check if main processes are running
check_process() {
    local name=$1
    local pidfile=$2
    
    if [ -f "$pidfile" ]; then
        local pid=$(cat "$pidfile")
        if kill -0 "$pid" 2>/dev/null; then
            echo "✅ $name is running (PID: $pid)"
            return 0
        else
            echo "❌ $name is not running (stale PID file)"
            rm -f "$pidfile"
            return 1
        fi
    else
        echo "❌ $name is not running (no PID file)"
        return 1
    fi
}

# Check all services
echo "Checking service status..."
check_process "Trading Engine" "logs/production/trading.pid"
check_process "Monitoring Service" "logs/production/monitoring.pid"
check_process "Metrics Server" "logs/production/metrics.pid"

# Check API endpoints
echo ""
echo "Checking API endpoints..."
if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Main API is responding"
else
    echo "❌ Main API is not responding"
fi

if curl -f -s http://localhost:9090/metrics > /dev/null 2>&1; then
    echo "✅ Metrics endpoint is responding"
else
    echo "❌ Metrics endpoint is not responding"
fi

# Check log files
echo ""
echo "Checking recent logs..."
if [ -f "logs/production/trading.log" ]; then
    echo "📝 Last trading log entry:"
    tail -n 1 logs/production/trading.log
else
    echo "❌ No trading logs found"
fi

# System resources
echo ""
echo "System Resources:"
echo "💾 Memory Usage: $(free -h | grep '^Mem:' | awk '{print $3 "/" $2}')"
echo "💽 Disk Usage: $(df -h . | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}')"
echo "⚡ Load Average: $(uptime | awk -F'load average:' '{ print $2 }')"

echo ""
echo "🏥 Health check completed"

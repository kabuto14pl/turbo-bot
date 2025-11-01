#!/bin/bash
# 🚀 [PRODUCTION-OPERATIONAL]
# Production operational script

echo "📊 Enterprise ML System Monitor"
echo "==============================="

# Function to check system status
check_ml_status() {
    echo "🔍 Checking ML system status..."
    
    if [ -f "ENTERPRISE_ML_STATUS.json" ]; then
        echo "✅ Deployment status file found"
        cat ENTERPRISE_ML_STATUS.json | grep -A 20 "components"
    else
        echo "❌ Deployment status file not found"
    fi
    
    echo ""
    echo "🧠 Checking ML process..."
    if pgrep -f "main.ts\|main.js" > /dev/null; then
        echo "✅ Trading bot process running"
    else
        echo "❌ Trading bot process not running"
    fi
    
    echo ""
    echo "💾 Memory usage:"
    ps aux | grep -E "(main\.ts|main\.js|node)" | grep -v grep || echo "No processes found"
    
    echo ""
    echo "📁 Log files:"
    ls -la *.log 2>/dev/null || echo "No log files found"
}

# Function to tail logs
tail_logs() {
    echo "📋 Tailing recent logs..."
    if [ -f "deployment.log" ]; then
        tail -n 50 deployment.log
    else
        echo "No deployment log found"
    fi
}

# Function to restart system
restart_system() {
    echo "🔄 Restarting Enterprise ML system..."
    pkill -f "main.ts\|main.js" || true
    sleep 2
    ./start_enterprise_bot.sh &
    echo "✅ System restart initiated"
}

# Main menu
case "${1:-status}" in
    "status")
        check_ml_status
        ;;
    "logs")
        tail_logs
        ;;
    "restart")
        restart_system
        ;;
    "monitor")
        echo "📊 Continuous monitoring (Press Ctrl+C to stop)..."
        while true; do
            clear
            check_ml_status
            sleep 30
        done
        ;;
    *)
        echo "Usage: $0 {status|logs|restart|monitor}"
        echo "  status  - Check current system status"
        echo "  logs    - Show recent logs"
        echo "  restart - Restart the system"
        echo "  monitor - Continuous monitoring"
        ;;
esac

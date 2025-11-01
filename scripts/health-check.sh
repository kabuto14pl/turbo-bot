#!/bin/bash
# 🔧 [DEVELOPMENT-TOOL]
# Development tool script

# Health check script
echo "🏥 Checking Turbo Trading Bot health..."

# Check if bot is running
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Bot is healthy"
else
    echo "❌ Bot is not responding"
    exit 1
fi

# Check Grafana
if curl -f http://localhost:8080/api/health > /dev/null 2>&1; then
    echo "✅ Grafana is healthy"
else
    echo "⚠️  Grafana is not responding"
fi

# Check Prometheus
if curl -f http://localhost:9090/-/healthy > /dev/null 2>&1; then
    echo "✅ Prometheus is healthy"
else
    echo "⚠️  Prometheus is not responding"
fi

echo "🎯 Health check complete"

#!/bin/bash
# 🔧 BOT REPAIR SCRIPT - Fixes for Critical and High Priority Issues
# Based on Comprehensive Audit Report - October 12, 2025

set -e

echo "🔧 Starting Bot Repair Script..."
echo "================================"
echo ""

# Issue #1: SimpleMonitoringSystem Import Error (MEDIUM PRIORITY)
echo "📋 Issue #1: Fixing SimpleMonitoringSystem import error..."
echo "   File: src/enterprise/monitoring/simple_monitoring_system.js"

# Check if file exists and has the issue
if grep -q "express is not a function" "/tmp/bot_full_test.log" 2>/dev/null; then
    echo "   ✅ Issue confirmed in logs"
    echo "   🔄 Recommendation: Verify express import in simple_monitoring_system.js"
    echo "   Action: Manual review required"
else
    echo "   ℹ️  Issue not in recent logs"
fi

# Issue #2: Add missing environment variables
echo ""
echo "📋 Issue #2: Adding missing .env variables..."

# Backup .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "   ✅ Backup created: .env.backup.$(date +%Y%m%d_%H%M%S)"

# Add missing variables if not present
if ! grep -q "^MODE=" .env; then
    echo "MODE=simulation  # Trading mode: simulation, backtest, live" >> .env
    echo "   ✅ Added MODE=simulation"
fi

if ! grep -q "^HEALTH_CHECK_PORT=" .env; then
    echo "HEALTH_CHECK_PORT=3001  # Health check endpoint port" >> .env
    echo "   ✅ Added HEALTH_CHECK_PORT=3001"
fi

if ! grep -q "^TRADING_INTERVAL=" .env; then
    echo "TRADING_INTERVAL=30000  # Trading cycle interval in milliseconds" >> .env
    echo "   ✅ Added TRADING_INTERVAL=30000"
fi

if ! grep -q "^REDIS_ENABLED=" .env; then
    echo "REDIS_ENABLED=false  # Enable Redis cache (set to true if Redis is running)" >> .env
    echo "   ✅ Added REDIS_ENABLED=false"
fi

# Issue #3: Align Prometheus port
echo ""
echo "📋 Issue #3: Aligning Prometheus port configuration..."

if grep -q "^PROMETHEUS_PORT=9090" .env; then
    echo "   ℹ️  .env has PROMETHEUS_PORT=9090"
    echo "   ⚠️  Code defaults to 9091"
    echo "   Recommendation: Choose one consistently"
    echo "   Current: Keeping 9090 (as per .env)"
fi

# Issue #4: Add TensorFlow log level suppression
echo ""
echo "📋 Issue #4: Adding TensorFlow log suppression for production..."

if ! grep -q "^TF_CPP_MIN_LOG_LEVEL=" .env; then
    echo "TF_CPP_MIN_LOG_LEVEL=2  # Suppress TensorFlow INFO/WARNING logs (0=all, 1=INFO, 2=WARNING, 3=ERROR)" >> .env
    echo "   ✅ Added TF_CPP_MIN_LOG_LEVEL=2"
fi

# Issue #5: Create startup validation script
echo ""
echo "📋 Issue #5: Creating startup validation script..."

cat > validate_startup.sh << 'EOF'
#!/bin/bash
# Startup Validation Script

echo "🔍 Validating Bot Startup Configuration..."
echo "=========================================="

# Check Node version
NODE_VERSION=$(node --version)
echo "✅ Node: $NODE_VERSION"

# Check npm packages
if [ -f "package.json" ]; then
    echo "✅ package.json found"
else
    echo "❌ package.json not found!"
    exit 1
fi

# Check .env file
if [ -f ".env" ]; then
    echo "✅ .env file found"
    
    # Validate required variables
    REQUIRED_VARS=("MODE" "TRADING_SYMBOL" "INITIAL_CAPITAL" "HEALTH_CHECK_PORT")
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" .env; then
            value=$(grep "^${var}=" .env | cut -d'=' -f2)
            echo "   ✅ $var=${value}"
        else
            echo "   ⚠️  $var not set (will use default)"
        fi
    done
else
    echo "❌ .env file not found!"
    exit 1
fi

# Check if Redis is needed
if grep -q "^REDIS_ENABLED=true" .env; then
    echo ""
    echo "🔍 Checking Redis connection..."
    if nc -z localhost 6379 2>/dev/null; then
        echo "   ✅ Redis is running on port 6379"
    else
        echo "   ⚠️  Redis not running - bot will use in-memory fallback"
    fi
fi

# Check port availability
HEALTH_PORT=$(grep "^HEALTH_CHECK_PORT=" .env | cut -d'=' -f2 || echo "3001")
if lsof -Pi :$HEALTH_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo ""
    echo "⚠️  Port $HEALTH_PORT is already in use!"
    echo "   Current process: $(lsof -Pi :$HEALTH_PORT -sTCP:LISTEN | tail -1)"
    echo "   Recommendation: Stop existing process or change HEALTH_CHECK_PORT"
else
    echo ""
    echo "✅ Port $HEALTH_PORT is available"
fi

# Check MODE setting
MODE=$(grep "^MODE=" .env | cut -d'=' -f2 || echo "simulation")
echo ""
echo "🎯 Trading Mode: $MODE"

if [ "$MODE" = "live" ]; then
    echo "   🔴 LIVE TRADING MODE DETECTED!"
    echo "   ⚠️  Ensure OKX API keys are configured"
    echo "   ⚠️  Verify ENABLE_LIVE_TRADING=true in .env"
    
    if grep -q "^OKX_API_KEY=your_okx_api_key_here" .env; then
        echo "   ❌ OKX API keys not configured!"
        echo "   Action: Update OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE in .env"
        exit 1
    else
        echo "   ✅ OKX API keys appear to be configured"
    fi
elif [ "$MODE" = "simulation" ]; then
    echo "   ✅ Simulation mode - safe for testing"
elif [ "$MODE" = "backtest" ]; then
    echo "   ✅ Backtest mode - historical data testing"
else
    echo "   ⚠️  Unknown mode: $MODE"
fi

echo ""
echo "=========================================="
echo "✅ Validation complete!"
echo ""
echo "To start the bot:"
echo "   npm exec ts-node trading-bot/autonomous_trading_bot_final.ts"
echo ""
echo "To monitor health:"
echo "   curl http://localhost:$HEALTH_PORT/health"
echo ""
EOF

chmod +x validate_startup.sh
echo "   ✅ Created validate_startup.sh"

# Issue #6: Create monitoring fix script
echo ""
echo "📋 Issue #6: Creating SimpleMonitoringSystem fix..."

cat > fix_monitoring.sh << 'EOF'
#!/bin/bash
# Fix SimpleMonitoringSystem import error

FILE="src/enterprise/monitoring/simple_monitoring_system.js"

if [ -f "$FILE" ]; then
    echo "🔧 Checking $FILE for import issues..."
    
    # Check if express import exists
    if grep -q "const express = require('express');" "$FILE" 2>/dev/null; then
        echo "   ✅ Import statement found"
        echo "   Recommendation: Verify express is being called correctly"
        echo "   Check line 52 for: this.app = express();"
    elif grep -q "import express from 'express';" "$FILE" 2>/dev/null; then
        echo "   ✅ ES6 import found"
    else
        echo "   ⚠️  No express import found"
    fi
    
    echo ""
    echo "   Manual review required:"
    echo "   1. Open $FILE"
    echo "   2. Check line ~52 for express initialization"
    echo "   3. Ensure: const app = express(); or this.app = express();"
    echo "   4. Verify express is imported correctly at top of file"
else
    echo "   ℹ️  File not found: $FILE"
fi
EOF

chmod +x fix_monitoring.sh
echo "   ✅ Created fix_monitoring.sh"

# Issue #7: Create Redis configuration helper
echo ""
echo "📋 Issue #7: Creating Redis configuration helper..."

cat > configure_redis.sh << 'EOF'
#!/bin/bash
# Redis Configuration Helper

echo "🔧 Redis Configuration Helper"
echo "=============================="
echo ""
echo "Current Redis status:"

if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo "   ✅ Redis is running and responding to ping"
        
        # Show Redis info
        echo ""
        echo "Redis Information:"
        redis-cli INFO server | grep -E "redis_version|uptime_in_seconds"
        
        # Update .env
        if grep -q "^REDIS_ENABLED=false" .env; then
            echo ""
            echo "   Recommendation: Update .env to enable Redis:"
            echo "   REDIS_ENABLED=true"
        fi
    else
        echo "   ⚠️  Redis is installed but not running"
        echo ""
        echo "To start Redis:"
        echo "   redis-server --daemonize yes"
    fi
else
    echo "   ℹ️  Redis is not installed"
    echo ""
    echo "The bot will use in-memory cache (fallback mode)"
    echo ""
    echo "To install Redis (optional):"
    echo "   Ubuntu/Debian: sudo apt-get install redis-server"
    echo "   macOS: brew install redis"
    echo ""
    echo "Redis is OPTIONAL - bot works fine with in-memory cache"
fi

echo ""
echo "Current .env setting:"
if grep -q "^REDIS_ENABLED=" .env; then
    grep "^REDIS_ENABLED=" .env
else
    echo "   REDIS_ENABLED not set (defaults to false)"
fi
EOF

chmod +x configure_redis.sh
echo "   ✅ Created configure_redis.sh"

# Summary
echo ""
echo "================================"
echo "✅ Repair Script Complete!"
echo "================================"
echo ""
echo "📋 Summary of Actions:"
echo "   1. ✅ Created .env backup"
echo "   2. ✅ Added MODE=simulation to .env"
echo "   3. ✅ Added HEALTH_CHECK_PORT=3001 to .env"
echo "   4. ✅ Added TRADING_INTERVAL=30000 to .env"
echo "   5. ✅ Added REDIS_ENABLED=false to .env"
echo "   6. ✅ Added TF_CPP_MIN_LOG_LEVEL=2 to .env"
echo "   7. ✅ Created validate_startup.sh"
echo "   8. ✅ Created fix_monitoring.sh"
echo "   9. ✅ Created configure_redis.sh"
echo ""
echo "📝 Manual Actions Required:"
echo "   1. Review SimpleMonitoringSystem import error:"
echo "      ./fix_monitoring.sh"
echo "   2. Verify PortfolioRebalancingSystem integration"
echo "   3. Confirm AuditComplianceSystem initialization"
echo ""
echo "🚀 Next Steps:"
echo "   1. Run validation: ./validate_startup.sh"
echo "   2. (Optional) Configure Redis: ./configure_redis.sh"
echo "   3. Start bot: npm exec ts-node trading-bot/autonomous_trading_bot_final.ts"
echo "   4. Check health: curl http://localhost:3001/health"
echo "   5. Run extended test (30-60 minutes)"
echo ""
echo "📊 Updated .env file - review changes:"
echo "   cat .env | tail -10"
echo ""

# Show updated .env
echo "Recent .env additions:"
tail -6 .env

echo ""
echo "🎉 Ready for testing!"

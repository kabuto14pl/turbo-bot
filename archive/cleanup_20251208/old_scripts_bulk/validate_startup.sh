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

#!/bin/bash
# 🤖 Local 2-Hour Bot Stress Test
# Simulates GitHub Actions workflow locally

set -e

echo "╔════════════════════════════════════════╗"
echo "║   2-HOUR BOT STRESS TEST (LOCAL)       ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Configuration
DURATION_MINUTES=${1:-120}
TRADING_MODE=${2:-simulation}

echo "⚙️  Configuration:"
echo "   Duration: ${DURATION_MINUTES} minutes"
echo "   Mode: ${TRADING_MODE}"
echo ""

# Create logs directory
mkdir -p logs

# Configure environment
cat > .env << EOF
MODE=${TRADING_MODE}
ENABLE_ML=true
ENABLE_REAL_TRADING=false
TRADING_INTERVAL=30000
LOG_LEVEL=info
TEST_DURATION_MINUTES=${DURATION_MINUTES}
EOF

echo "✅ Environment configured"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm ci
fi

echo "🚀 Starting bot for ${DURATION_MINUTES}-minute test..."
echo "   (Press Ctrl+C to stop early)"
echo ""

# Start bot with timeout
timeout ${DURATION_MINUTES}m \
  npm exec ts-node trading-bot/autonomous_trading_bot_final.ts \
  2>&1 | tee logs/bot_stress_test_$(date +%Y%m%d_%H%M%S).log || true

echo ""
echo "✅ Bot test completed!"
echo ""

# Analyze results
echo "╔════════════════════════════════════════╗"
echo "║      PERFORMANCE ANALYSIS              ║"
echo "╚════════════════════════════════════════╝"

LATEST_LOG=$(ls -t logs/bot_stress_test_*.log | head -1)

if [ -f "$LATEST_LOG" ]; then
  echo ""
  echo "📊 Statistics from $LATEST_LOG:"
  echo ""
  echo "   Trading Cycles: $(grep -c "executeTradingCycle" $LATEST_LOG || echo "0")"
  echo "   Orders Placed: $(grep -c "Order placed" $LATEST_LOG || echo "0")"
  echo "   ML Predictions: $(grep -c "ML prediction" $LATEST_LOG || echo "0")"
  echo "   Errors: $(grep -c "Error" $LATEST_LOG || echo "0")"
  echo "   Warnings: $(grep -c "Warning" $LATEST_LOG || echo "0")"
  echo ""
  
  echo "💰 Latest Portfolio Status:"
  grep -i "portfolio" $LATEST_LOG | tail -5 || echo "   No portfolio data"
  echo ""
  
  echo "📈 Latest PnL:"
  grep -i "pnl" $LATEST_LOG | tail -5 || echo "   No PnL data"
  echo ""
fi

echo "╔════════════════════════════════════════╗"
echo "║         TEST COMPLETED ✅               ║"
echo "╚════════════════════════════════════════╝"

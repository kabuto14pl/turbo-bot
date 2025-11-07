#!/bin/bash
# 🧪 Quick 5-Minute Bot Test
# Fast verification before running full 2h test

set -e

echo "╔════════════════════════════════════════╗"
echo "║   QUICK 5-MINUTE BOT TEST              ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Create logs directory
mkdir -p logs

# Configure environment
cat > .env << EOF
MODE=simulation
ENABLE_ML=true
ENABLE_REAL_TRADING=false
TRADING_INTERVAL=10000
LOG_LEVEL=info
EOF

echo "⚙️  Quick test configuration:"
echo "   Duration: 5 minutes"
echo "   Mode: simulation"
echo "   Interval: 10 seconds"
echo ""

echo "🚀 Starting bot for quick verification..."
echo ""

# Start bot with 5-minute timeout
timeout 5m \
  npm exec ts-node trading-bot/autonomous_trading_bot_final.ts \
  2>&1 | tee logs/bot_quick_test_$(date +%Y%m%d_%H%M%S).log || true

echo ""
echo "✅ Quick test completed!"
echo ""

# Quick analysis
LATEST_LOG=$(ls -t logs/bot_quick_test_*.log | head -1)

if [ -f "$LATEST_LOG" ]; then
  echo "📊 Quick Statistics:"
  echo "   Cycles: $(grep -c "executeTradingCycle" $LATEST_LOG || echo "0")"
  echo "   Orders: $(grep -c "Order placed" $LATEST_LOG || echo "0")"
  echo "   Errors: $(grep -c "Error" $LATEST_LOG || echo "0")"
  echo ""
  
  if [ $(grep -c "Error" $LATEST_LOG || echo "0") -eq 0 ]; then
    echo "✅ No errors detected - ready for 2h test!"
  else
    echo "⚠️  Errors found - check logs before 2h test"
  fi
fi

echo ""
echo "To run full 2-hour test:"
echo "  ./scripts/run_2h_stress_test.sh"

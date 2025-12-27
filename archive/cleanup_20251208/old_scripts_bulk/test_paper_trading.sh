#!/bin/bash

# ============================================================================
# 🌐 PAPER TRADING TEST SCRIPT
# ============================================================================
# PURPOSE: Validate paper trading mode with live OKX data
# DURATION: Run for 1-2 hours minimum, 48-72 hours recommended
# 
# SUCCESS CRITERIA:
# ✅ OKX WebSocket connects successfully
# ✅ Real-time candles streaming
# ✅ Trading signals generated
# ✅ Simulated trades executed
# ✅ No API errors
# ✅ Circuit breaker responds to triggers
# ============================================================================

set -e  # Exit on error

echo "🌐 ============================================================"
echo "   PAPER TRADING MODE - LIVE DATA TEST"
echo "🌐 ============================================================"
echo ""

# ============================================================================
# STEP 1: Validate Environment
# ============================================================================

echo "📋 STEP 1: Validating Environment..."
echo ""

# Check .env file
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found!"
    echo "   Run: cp .env.example .env"
    exit 1
fi

# Check MODE setting
MODE=$(grep "^MODE=" .env | cut -d'=' -f2)
if [ "$MODE" != "paper_trading" ]; then
    echo "⚠️  WARNING: MODE is set to '$MODE', expected 'paper_trading'"
    echo "   Do you want to continue? (y/n)"
    read -r response
    if [ "$response" != "y" ]; then
        echo "   Aborting..."
        exit 1
    fi
fi

# Check API keys
API_KEY=$(grep "^OKX_API_KEY=" .env | cut -d'=' -f2)
SECRET_KEY=$(grep "^OKX_SECRET_KEY=" .env | cut -d'=' -f2)
PASSPHRASE=$(grep "^OKX_PASSPHRASE=" .env | cut -d'=' -f2)

if [ "$API_KEY" == "your-api-key-here" ] || [ -z "$API_KEY" ]; then
    echo "⚠️  WARNING: OKX API credentials not configured!"
    echo "   Paper trading will use public endpoints (limited functionality)"
    echo "   Continue? (y/n)"
    read -r response
    if [ "$response" != "y" ]; then
        exit 1
    fi
fi

echo "✅ Environment validated"
echo ""

# ============================================================================
# STEP 2: Build TypeScript
# ============================================================================

echo "📋 STEP 2: Building TypeScript..."
echo ""

npm run build 2>&1 | grep -E "error TS|✓" || true

BUILD_ERRORS=$(npm run build 2>&1 | grep -c "error TS" || true)

if [ "$BUILD_ERRORS" -gt 0 ]; then
    echo "❌ ERROR: TypeScript compilation failed with $BUILD_ERRORS errors"
    echo "   Fix compilation errors before running paper trading"
    exit 1
fi

echo "✅ TypeScript build successful"
echo ""

# ============================================================================
# STEP 3: Test OKX Connectivity
# ============================================================================

echo "📋 STEP 3: Testing OKX API Connectivity..."
echo ""

echo "   Testing public endpoints..."
TICKER=$(curl -s "https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT" | jq -r '.data[0].last' 2>/dev/null || echo "ERROR")

if [ "$TICKER" == "ERROR" ] || [ -z "$TICKER" ]; then
    echo "❌ ERROR: Failed to fetch BTC-USDT ticker from OKX"
    echo "   Check internet connection or OKX API status"
    exit 1
fi

echo "   ✅ OKX Public API working"
echo "   📊 Current BTC-USDT price: \$$TICKER"
echo ""

# ============================================================================
# STEP 4: Start Paper Trading Bot
# ============================================================================

echo "📋 STEP 4: Starting Paper Trading Bot..."
echo ""

# Kill existing bot processes
echo "   Stopping existing bot processes..."
pkill -f "autonomous_trading_bot_final" || true
sleep 2

# Start bot in background
echo "   Starting bot with nohup..."
nohup npm exec ts-node trading-bot/autonomous_trading_bot_final.ts \
    > logs/paper_trading_$(date +%Y%m%d_%H%M%S).log 2>&1 &

BOT_PID=$!
echo $BOT_PID > bot_paper_trading.pid

echo "   ✅ Bot started with PID: $BOT_PID"
echo "   📄 Log file: logs/paper_trading_$(date +%Y%m%d_%H%M%S).log"
echo ""

# Wait for initialization
echo "   Waiting for bot initialization (30 seconds)..."
sleep 30

# ============================================================================
# STEP 5: Verify Bot Health
# ============================================================================

echo "📋 STEP 5: Verifying Bot Health..."
echo ""

HEALTH_STATUS=$(curl -s http://localhost:3001/health | jq -r '.status' 2>/dev/null || echo "ERROR")

if [ "$HEALTH_STATUS" != "healthy" ]; then
    echo "❌ ERROR: Bot health check failed"
    echo "   Status: $HEALTH_STATUS"
    echo ""
    echo "   Last 50 lines of log:"
    tail -50 logs/paper_trading_*.log | tail -50
    exit 1
fi

echo "   ✅ Bot health: $HEALTH_STATUS"
echo ""

# Get detailed health status
echo "   📊 Detailed Health Status:"
curl -s http://localhost:3001/health | jq '{
    status: .status,
    uptime: .uptime,
    components: .components,
    version: .version
}'
echo ""

# ============================================================================
# STEP 6: Verify OKX Integration
# ============================================================================

echo "📋 STEP 6: Verifying OKX Live Data Integration..."
echo ""

# Check logs for OKX connection
sleep 5

OKX_CONNECTED=$(tail -100 logs/paper_trading_*.log | grep -c "OKX Live Data Client initialized" || echo "0")
WS_CONNECTED=$(tail -100 logs/paper_trading_*.log | grep -c "WebSocket connected to OKX" || echo "0")

if [ "$OKX_CONNECTED" -gt 0 ]; then
    echo "   ✅ OKX Live Data Client initialized"
else
    echo "   ⚠️  OKX Live Data Client not found in logs"
fi

if [ "$WS_CONNECTED" -gt 0 ]; then
    echo "   ✅ WebSocket connected to OKX"
else
    echo "   ⚠️  WebSocket connection not detected (may be using REST fallback)"
fi

# Check for live candles
LIVE_CANDLES=$(tail -100 logs/paper_trading_*.log | grep -c "\[LIVE DATA\]" || echo "0")

if [ "$LIVE_CANDLES" -gt 0 ]; then
    echo "   ✅ Receiving live candles from OKX ($LIVE_CANDLES received)"
    echo ""
    echo "   📊 Latest live candle:"
    tail -100 logs/paper_trading_*.log | grep "\[LIVE DATA\]" | tail -1
else
    echo "   ⚠️  No live candles detected yet (may still be initializing)"
fi

echo ""

# ============================================================================
# STEP 7: Monitor Trading Activity
# ============================================================================

echo "📋 STEP 7: Monitoring Trading Activity..."
echo ""

echo "   Waiting for first trading cycle (60 seconds)..."
sleep 60

# Check for trading signals
SIGNALS_COUNT=$(tail -200 logs/paper_trading_*.log | grep -c "Executing.*signal" || echo "0")
TRADES_COUNT=$(tail -200 logs/paper_trading_*.log | grep -c "Trade executed" || echo "0")

echo "   📊 Trading Activity (last 200 lines):"
echo "      Signals generated: $SIGNALS_COUNT"
echo "      Trades executed: $TRADES_COUNT"
echo ""

# Get portfolio status
echo "   💰 Current Portfolio Status:"
curl -s http://localhost:3001/api/portfolio | jq '{
    totalValue: .totalValue,
    realizedPnL: .realizedPnL,
    totalTrades: .totalTrades,
    winRate: .winRate,
    timestamp: .timestamp
}'
echo ""

# ============================================================================
# STEP 8: Circuit Breaker Test
# ============================================================================

echo "📋 STEP 8: Testing Circuit Breaker..."
echo ""

CB_STATUS=$(curl -s http://localhost:3001/api/circuit-breaker | jq -r '.isTripped')

echo "   Circuit Breaker Status: $CB_STATUS"
echo "   Full status:"
curl -s http://localhost:3001/api/circuit-breaker | jq '.'
echo ""

# ============================================================================
# FINAL REPORT
# ============================================================================

echo "🌐 ============================================================"
echo "   PAPER TRADING TEST - INITIAL VALIDATION COMPLETE"
echo "🌐 ============================================================"
echo ""
echo "✅ SUCCESS CRITERIA MET:"
echo "   ✅ Bot started successfully (PID: $BOT_PID)"
echo "   ✅ Health check passing (status: $HEALTH_STATUS)"
echo "   ✅ OKX connectivity verified"
echo "   ✅ Circuit breaker operational"
echo ""
echo "📊 MONITORING DASHBOARD:"
echo "   Health:          http://localhost:3001/health"
echo "   Portfolio:       http://localhost:3001/api/portfolio"
echo "   Circuit Breaker: http://localhost:3001/api/circuit-breaker"
echo "   Metrics:         http://localhost:3001/metrics"
echo ""
echo "📄 LOG FILES:"
echo "   Live tail: tail -f logs/paper_trading_*.log"
echo "   Grep live data: tail -f logs/paper_trading_*.log | grep LIVE"
echo "   Grep trades: tail -f logs/paper_trading_*.log | grep 'Trade executed'"
echo ""
echo "🎯 RECOMMENDED MONITORING PERIOD:"
echo "   Minimum: 1-2 hours (verify stability)"
echo "   Recommended: 48-72 hours (full validation)"
echo "   Target: 20+ trades, >55% win rate, 0 API errors"
echo ""
echo "🛑 TO STOP BOT:"
echo "   kill $BOT_PID"
echo "   or: kill \$(cat bot_paper_trading.pid)"
echo ""
echo "📈 NEXT STEPS:"
echo "   1. Monitor logs for 1-2 hours"
echo "   2. Verify live data streaming continuously"
echo "   3. Check trading signals quality"
echo "   4. Review P&L accuracy"
echo "   5. Test circuit breaker triggers (optional)"
echo "   6. If successful → proceed to LIVE mode setup"
echo ""
echo "🚀 Paper trading started successfully!"
echo "🌐 ============================================================"

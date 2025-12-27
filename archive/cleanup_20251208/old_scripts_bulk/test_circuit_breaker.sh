#!/bin/bash

# Test Circuit Breaker System Integration
# Tests all circuit breaker endpoints and functionality

echo "🧪 Testing Circuit Breaker System Integration"
echo "=============================================="

BASE_URL="http://localhost:3001"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check circuit breaker status
echo ""
echo "📊 Test 1: Circuit Breaker Status Endpoint"
echo "-------------------------------------------"
RESPONSE=$(curl -s "${BASE_URL}/api/circuit-breaker")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Endpoint accessible${NC}"
    echo "Response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}✗ Endpoint failed${NC}"
fi

# Test 2: Check overall status includes circuit breaker
echo ""
echo "📊 Test 2: System Status (includes circuit breaker)"
echo "---------------------------------------------------"
RESPONSE=$(curl -s "${BASE_URL}/api/status")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Status endpoint accessible${NC}"
    echo "Circuit Breaker section:"
    echo "$RESPONSE" | jq '.circuitBreaker' 2>/dev/null || echo "Cannot parse JSON"
else
    echo -e "${RED}✗ Status endpoint failed${NC}"
fi

# Test 3: Health check includes circuit breaker component
echo ""
echo "📊 Test 3: Health Check (circuit breaker component)"
echo "----------------------------------------------------"
RESPONSE=$(curl -s "${BASE_URL}/health")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Health endpoint accessible${NC}"
    echo "Circuit Breaker component:"
    echo "$RESPONSE" | jq '.components.circuitBreaker' 2>/dev/null || echo "Cannot parse JSON"
else
    echo -e "${RED}✗ Health endpoint failed${NC}"
fi

# Test 4: Manual reset endpoint (POST)
echo ""
echo "📊 Test 4: Manual Circuit Breaker Reset"
echo "----------------------------------------"
RESPONSE=$(curl -s -X POST "${BASE_URL}/api/circuit-breaker/reset")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Reset endpoint accessible${NC}"
    echo "Response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}✗ Reset endpoint failed${NC}"
fi

# Test 5: Verify metrics include circuit breaker
echo ""
echo "📊 Test 5: Prometheus Metrics (circuit breaker)"
echo "------------------------------------------------"
RESPONSE=$(curl -s "${BASE_URL}/metrics" | grep -i circuit)
if [ -n "$RESPONSE" ]; then
    echo -e "${GREEN}✓ Circuit breaker metrics found${NC}"
    echo "$RESPONSE"
else
    echo -e "${YELLOW}⚠ No circuit breaker metrics in Prometheus output${NC}"
fi

# Summary
echo ""
echo "=============================================="
echo "🏁 Circuit Breaker Integration Test Complete"
echo "=============================================="
echo ""
echo -e "${YELLOW}Expected Behavior:${NC}"
echo "  - isTripped: false (initially)"
echo "  - consecutiveLosses: 0"
echo "  - maxConsecutiveLosses: 5"
echo "  - Trips when: drawdown >= 15% OR losses >= 5 OR portfolio loss >= 10%"
echo ""
echo -e "${YELLOW}Integration Points:${NC}"
echo "  - executeTradingCycle() checks circuit breaker before trading"
echo "  - executeTradeSignal() records trade results"
echo "  - updateHealthStatus() includes circuit breaker status"
echo "  - Express endpoints expose circuit breaker API"
echo ""

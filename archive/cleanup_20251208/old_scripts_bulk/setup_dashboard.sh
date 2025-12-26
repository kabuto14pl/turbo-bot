#!/bin/bash

# 🚀 TIER 2.2 Enterprise Dashboard - Automated Setup Script
# Installs all dependencies and verifies setup

set -e  # Exit on error

echo "========================================="
echo "🚀 Autonomous Trading Bot Dashboard Setup"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js v18+${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18+. Current: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm $(npm -v) detected${NC}"
echo ""

# Install bot dependencies
echo "📦 Installing bot dependencies..."
cd /workspaces/turbo-bot

if ! npm list ws &> /dev/null; then
    echo "Installing ws library..."
    npm install ws @types/ws --save
    echo -e "${GREEN}✅ ws library installed${NC}"
else
    echo -e "${GREEN}✅ ws library already installed${NC}"
fi

# Install dashboard dependencies
echo ""
echo "📦 Installing dashboard dependencies..."
cd /workspaces/turbo-bot/dashboard

if [ ! -d "node_modules" ]; then
    echo "Installing React, Vite, Recharts, Tailwind, shadcn/ui..."
    npm install
    echo -e "${GREEN}✅ Dashboard dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Dashboard dependencies already installed${NC}"
fi

# Verify installations
echo ""
echo "🔍 Verifying installations..."

cd /workspaces/turbo-bot

# Check ws
if npm list ws &> /dev/null; then
    echo -e "${GREEN}✅ ws library verified${NC}"
else
    echo -e "${RED}❌ ws library verification failed${NC}"
    exit 1
fi

cd /workspaces/turbo-bot/dashboard

# Check key dependencies
DEPENDENCIES=("react" "vite" "recharts" "tailwindcss" "typescript")
ALL_OK=true

for dep in "${DEPENDENCIES[@]}"; do
    if npm list "$dep" &> /dev/null; then
        echo -e "${GREEN}✅ $dep verified${NC}"
    else
        echo -e "${RED}❌ $dep verification failed${NC}"
        ALL_OK=false
    fi
done

if [ "$ALL_OK" = false ]; then
    echo -e "${RED}❌ Some dependencies missing. Run: npm install${NC}"
    exit 1
fi

# Check if .env exists in bot directory
echo ""
echo "⚙️  Checking configuration..."
cd /workspaces/turbo-bot

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating default...${NC}"
    cat > .env << 'EOF'
# Trading Mode
MODE=simulation

# Trading Configuration
TRADING_SYMBOL=BTCUSDT
TIMEFRAME=1h
INITIAL_CAPITAL=10000
MAX_DRAWDOWN=0.15
RISK_PER_TRADE=0.02

# Server Ports
HEALTH_CHECK_PORT=3001
PROMETHEUS_PORT=9091

# Features
ENABLE_ML=true
ENABLE_LIVE_TRADING=false
PAPER_TRADING=false
TRADING_INTERVAL=30000
EOF
    echo -e "${GREEN}✅ Default .env created${NC}"
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# Summary
echo ""
echo "========================================="
echo "✅ Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Start Trading Bot (Terminal 1):"
echo -e "   ${GREEN}cd /workspaces/turbo-bot${NC}"
echo -e "   ${GREEN}npm exec ts-node trading-bot/autonomous_trading_bot_final.ts${NC}"
echo ""
echo "2. Start Dashboard (Terminal 2):"
echo -e "   ${GREEN}cd /workspaces/turbo-bot/dashboard${NC}"
echo -e "   ${GREEN}npm run dev${NC}"
echo ""
echo "3. Open Browser:"
echo -e "   ${GREEN}http://localhost:3002${NC}"
echo ""
echo "📚 Documentation:"
echo "   - Quick Start: QUICK_START_DASHBOARD.md"
echo "   - Setup Guide: dashboard/DASHBOARD_SETUP_GUIDE.md"
echo "   - Progress Report: COMPREHENSIVE_PROGRESS_TIER_1_2_1_2_2_COMPLETE.md"
echo ""
echo "🎯 Features Available:"
echo "   ✅ Real-time WebSocket dashboard"
echo "   ✅ Advanced risk analytics (VaR, Kelly, Monte Carlo)"
echo "   ✅ Multi-strategy performance tracking (5 strategies)"
echo "   ✅ Comprehensive trade history"
echo "   ✅ Health monitoring"
echo "   ✅ Alert system"
echo "   ✅ Grafana integration ready"
echo ""
echo "========================================="

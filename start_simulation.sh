#!/bin/bash

# 🚀 QUICK START - SIMULATION MODE DEPLOYMENT
# One-command deployment with all setup

set -euo pipefail

echo ""
echo "🚀 ============================================================================"
echo "   TURBO BOT - SIMULATION MODE DEPLOYMENT (48h)"
echo "============================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verify prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ node not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js and npm found${NC}"
echo "   Node: $(node --version)"
echo "   npm: $(npm --version)"
echo ""

# Setup directories
echo -e "${BLUE}📁 Setting up directories...${NC}"
mkdir -p logs/simulation_48h
mkdir -p data/simulation_48h
echo -e "${GREEN}✅ Directories ready${NC}"
echo ""

# Setup environment
echo -e "${BLUE}🔧 Setting up environment...${NC}"

# Copy template to .env if not exists
if [ ! -f .env.simulation ]; then
    echo "No .env.simulation found, creating from template..."
    cp .env.template .env.simulation 2>/dev/null || {
        echo "Creating .env.simulation with defaults..."
    }
fi

echo -e "${GREEN}✅ Environment configured${NC}"
echo ""

# Build TypeScript
echo -e "${BLUE}🔨 Building TypeScript...${NC}"
npm run build 2>&1 | tail -5
echo -e "${GREEN}✅ Build complete${NC}"
echo ""

# Show configuration
echo -e "${BLUE}⚙️  Configuration:${NC}"
echo ""
echo "  Environment:      Simulation Mode"
echo "  Duration:         48 hours"
echo "  Trading Symbol:   BTCUSDT"
echo "  Initial Capital:  \$10,000"
echo "  ML Features:      REAL (not random)"
echo "  Retraining:       ENABLED (every 1h)"
echo "  API Port:         3000"
echo "  Prometheus:       9090"
echo ""

# Deployment options
echo -e "${YELLOW}Choose deployment method:${NC}"
echo ""
echo "  1) Start with full monitoring (recommended for 48h)"
echo "  2) Start bot only (manual monitoring)"
echo "  3) Start bot in background (nohup)"
echo "  4) View previous logs"
echo "  5) Exit"
echo ""
read -p "Select option [1-5]: " -r choice

case "$choice" in
    1)
        echo ""
        echo -e "${GREEN}🚀 Starting deployment with full 48h monitoring...${NC}"
        echo ""
        
        # Make script executable
        chmod +x deploy_simulation_48h.sh
        
        # Run monitoring script
        ./deploy_simulation_48h.sh
        ;;
    
    2)
        echo ""
        echo -e "${GREEN}🚀 Starting bot (manual monitoring mode)...${NC}"
        echo ""
        
        export NODE_ENV=production
        export TRADING_MODE=simulation
        export MODE=simulation
        
        npx ts-node trading-bot/autonomous_trading_bot_final.ts
        ;;
    
    3)
        echo ""
        echo -e "${GREEN}🚀 Starting bot in background (nohup)...${NC}"
        echo ""
        
        export NODE_ENV=production
        export TRADING_MODE=simulation
        export MODE=simulation
        
        nohup npx ts-node trading-bot/autonomous_trading_bot_final.ts > logs/simulation_48h/bot_background.log 2>&1 &
        echo "Bot started with PID: $!"
        echo "View logs: tail -f logs/simulation_48h/bot_background.log"
        ;;
    
    4)
        echo ""
        echo -e "${BLUE}📋 Available logs:${NC}"
        echo ""
        ls -lh logs/simulation_48h/ 2>/dev/null || echo "No previous logs found"
        echo ""
        read -p "View log file (or press Enter to exit): " -r logfile
        if [ -n "$logfile" ] && [ -f "logs/simulation_48h/$logfile" ]; then
            tail -f "logs/simulation_48h/$logfile"
        fi
        ;;
    
    5)
        echo "Exiting..."
        exit 0
        ;;
    
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

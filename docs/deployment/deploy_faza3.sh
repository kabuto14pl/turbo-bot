#!/bin/bash
# 🚀 FAZA 3 VPS Deployment Script
# Deploys Black-Litterman, Dynamic Risk, Auto-Retrain to VPS

set -e  # Exit on error

VPS_IP="64.226.70.149"
VPS_USER="root"
VPS_PATH="/root/turbo-bot"

echo "🚀 FAZA 3 DEPLOYMENT TO VPS"
echo "================================"
echo "Target: ${VPS_USER}@${VPS_IP}:${VPS_PATH}"
echo ""

# Step 1: Upload modified files
echo "📤 Step 1: Uploading modified files..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'logs' \
  --exclude '.git' \
  --exclude 'archive' \
  --exclude 'backups' \
  --exclude 'dist' \
  --include 'trading-bot/autonomous_trading_bot_final.ts' \
  --include 'trading-bot/core/strategy/ma_crossover.ts' \
  --include 'trading-bot/core/strategy/momentum_pro.ts' \
  --include 'trading-bot/core/strategy/supertrend.ts' \
  --include '.github/copilot-instructions.md' \
  --include 'DEPLOYMENT_GUIDE_FAZA_3_COMPLETE.md' \
  --include 'FAZA_2_3_BLACK_LITTERMAN_COMPLETE.md' \
  --include 'FAZA_3_1_DYNAMIC_RISK_COMPLETE.md' \
  --include 'FAZA_3_3_AUTO_RETRAIN_COMPLETE.md' \
  --include 'package.json' \
  --include 'tsconfig.json' \
  --exclude '*' \
  ./ ${VPS_USER}@${VPS_IP}:${VPS_PATH}/

echo ""
echo "✅ Files uploaded successfully!"
echo ""

# Step 2: Install dependencies and build on VPS
echo "📦 Step 2: Installing dependencies on VPS..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
cd /root/turbo-bot
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo ""

# Install dependencies (if needed)
if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install
else
    echo "Updating npm packages..."
    npm update
fi
echo ""

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build 2>&1 | grep -E "(error|warning|Build completed)" | tail -20
echo ""
echo "✅ Build completed!"
ENDSSH

echo ""
echo "✅ Dependencies installed and built!"
echo ""

# Step 3: Check bot status
echo "📊 Step 3: Checking bot status..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
cd /root/turbo-bot

# Check PM2 status
echo "PM2 Status:"
pm2 status turbo-bot || echo "Bot not running yet"
echo ""

# Check if bot is running
if pm2 list | grep -q "turbo-bot.*online"; then
    echo "⚠️  Bot is currently RUNNING"
    echo "   Use 'pm2 restart turbo-bot' to apply changes"
else
    echo "ℹ️  Bot is NOT running"
    echo "   Use 'pm2 start ecosystem.config.js' to start"
fi
ENDSSH

echo ""
echo "================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "📋 NEXT STEPS:"
echo "1. SSH to VPS: ssh root@64.226.70.149"
echo "2. Verify changes: cd /root/turbo-bot && tail -f logs/autonomous_bot.log"
echo "3. Restart bot: pm2 restart turbo-bot"
echo "4. Monitor: pm2 logs turbo-bot --lines 100"
echo ""
echo "🔍 VALIDATION COMMANDS:"
echo "  curl http://localhost:3001/health"
echo "  curl http://localhost:3001/api/ensemble/status"
echo "  grep 'BLACK-LITTERMAN\\|DYNAMIC RISK\\|ML RETRAIN' logs/autonomous_bot.log"
echo ""
echo "📚 Documentation: DEPLOYMENT_GUIDE_FAZA_3_COMPLETE.md"
echo "================================"

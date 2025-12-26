#!/bin/bash
# 🚀 VPS Deployment Script - FAZA 3 Complete (v4.1.3)
# Date: 25.12.2025

set -e  # Exit on error

VPS_HOST="root@64.226.70.149"
VPS_DIR="/root/turbo-bot"
LOCAL_DIR="/workspaces/turbo-bot"

echo "🚀 Starting deployment to VPS..."
echo "================================================"

# Step 1: Sync code to VPS (exclude large directories)
echo ""
echo "📦 Step 1: Syncing code to VPS..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'logs/*' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude 'archive' \
  --exclude 'backups' \
  --exclude 'test-results*' \
  --exclude 'tmp_*' \
  ${LOCAL_DIR}/ ${VPS_HOST}:${VPS_DIR}/

echo "✅ Code synced successfully!"

# Step 2: Install dependencies and build on VPS
echo ""
echo "📚 Step 2: Installing dependencies on VPS..."
ssh ${VPS_HOST} << 'ENDSSH'
cd /root/turbo-bot
echo "Installing npm packages..."
npm install --production
echo "✅ Dependencies installed!"
ENDSSH

# Step 3: Check if bot is running and restart
echo ""
echo "🔄 Step 3: Restarting bot with PM2..."
ssh ${VPS_HOST} << 'ENDSSH'
cd /root/turbo-bot

# Check PM2 status
if pm2 list | grep -q "turbo-bot"; then
    echo "Bot is running - restarting..."
    pm2 restart turbo-bot
else
    echo "Bot not running - starting fresh..."
    pm2 start ecosystem.config.js
fi

# Save PM2 process list
pm2 save

echo ""
echo "✅ Bot restarted successfully!"
echo ""
echo "📊 Current PM2 status:"
pm2 status

echo ""
echo "📜 Recent logs (last 20 lines):"
pm2 logs turbo-bot --lines 20 --nostream
ENDSSH

# Step 4: Verify deployment
echo ""
echo "🔍 Step 4: Verifying deployment..."
sleep 3
ssh ${VPS_HOST} "curl -s http://localhost:3001/health | jq ."

echo ""
echo "================================================"
echo "✅ Deployment completed successfully!"
echo ""
echo "🔗 Useful commands:"
echo "   View logs:    ssh ${VPS_HOST} 'pm2 logs turbo-bot'"
echo "   Bot status:   ssh ${VPS_HOST} 'pm2 status'"
echo "   Restart bot:  ssh ${VPS_HOST} 'pm2 restart turbo-bot'"
echo "   Stop bot:     ssh ${VPS_HOST} 'pm2 stop turbo-bot'"
echo ""
echo "📊 Monitor health:"
echo "   ssh ${VPS_HOST} 'curl http://localhost:3001/health'"
echo "   ssh ${VPS_HOST} 'curl http://localhost:3001/api/portfolio'"
echo ""

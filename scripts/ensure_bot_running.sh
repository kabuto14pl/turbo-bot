#!/bin/bash
# Ensure bot is running - Run this via cron or on container start

set -e

cd /workspaces/turbo-bot

echo "🔍 Checking if bot is running..."

# Check if PM2 is running
if ! pgrep -x "PM2" > /dev/null; then
    echo "⚠️ PM2 not running, starting..."
    pm2 resurrect
fi

# Check if turbo-bot process exists
if ! pm2 list | grep -q "turbo-bot"; then
    echo "⚠️ Bot not found in PM2, starting..."
    pm2 start ecosystem.config.js
    pm2 save
else
    # Check if bot is actually online
    status=$(pm2 jlist | jq -r '.[] | select(.name=="turbo-bot") | .pm2_env.status')
    
    if [ "$status" != "online" ]; then
        echo "⚠️ Bot status: $status, restarting..."
        pm2 restart turbo-bot
    else
        echo "✅ Bot is running"
    fi
fi

# Verify health endpoint
sleep 3
if curl -sf http://localhost:3001/health > /dev/null; then
    echo "✅ Bot health check passed"
else
    echo "⚠️ Bot health check failed, but process is running"
fi

pm2 status

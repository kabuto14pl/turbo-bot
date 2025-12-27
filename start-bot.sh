#!/bin/bash
# 🚀 TURBO BOT - Auto Start Script
# Uruchamia bota niezależnie od VS Code

set -e

echo "🚀 Starting Turbo Trading Bot..."

# 1. Start Redis (jeśli nie działa)
if ! redis-cli ping &>/dev/null; then
    echo "📊 Starting Redis..."
    redis-server --daemonize yes
    sleep 2
fi

# 2. Kill old PM2 processes (cleanup)
pm2 delete all 2>/dev/null || true

# 3. Start bot + dashboard via PM2
echo "🤖 Starting bot + dashboard via PM2..."
cd /workspaces/turbo-bot
pm2 start ecosystem.config.js

# 4. Save PM2 config
pm2 save

# 5. Show status
echo ""
echo "✅ Bot started successfully!"
echo ""
pm2 status
echo ""
echo "📊 Commands:"
echo "  pm2 status          - Check bot + dashboard status"
echo "  pm2 logs turbo-bot  - View bot logs"
echo "  pm2 logs dashboard  - View dashboard logs"
echo "  pm2 restart all     - Restart everything"
echo "  pm2 stop all        - Stop everything"
echo ""
echo "🌐 URLs:"
echo "  Dashboard: http://localhost:8080"
echo "  Bot API:   http://localhost:3001/health"

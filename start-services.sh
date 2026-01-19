#!/bin/bash

# 🚀 TURBO BOT - Quick Start Script
# Uruchamia bota w tle przez PM2
# 
# ⚠️ UWAGA: Dashboard działa na zewnętrznym VPS
# Dashboard URL: http://64.226.70.149:8080/
# Ten skrypt uruchamia TYLKO trading bot

echo "🚀 Starting Turbo Bot..."
echo ""
echo "⚠️  NOTE: Dashboard is hosted on VPS"
echo "📊 Dashboard URL: http://64.226.70.149:8080/"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found. Installing PM2..."
    npm install -g pm2
fi

# Stop any existing processes
echo "🛑 Stopping existing bot processes..."
pm2 delete turbo-bot 2>/dev/null || true

# Flush old logs
echo "🧹 Cleaning old logs..."
pm2 flush

# Start with ecosystem config
echo "🚀 Starting bot from ecosystem.config.js..."
pm2 start ecosystem.config.js

# Wait for startup
sleep 3

# Show status
echo ""
echo "📊 PM2 Process Status:"
pm2 list

# Save configuration
echo ""
echo "💾 Saving PM2 configuration..."
pm2 save

# Show endpoints
echo ""
echo "✅ Bot Started Successfully!"
echo ""
echo "📍 Available Endpoints:"
echo "  🤖 Trading Bot API:  http://localhost:3001/health"
echo "  📊 Dashboard (VPS):  http://64.226.70.149:8080/"
echo ""
echo "📝 Useful Commands:"
echo "  pm2 list              - Show all processes"
echo "  pm2 logs              - Show logs"
echo "  pm2 logs turbo-bot    - Show bot logs only"
echo "  pm2 restart all       - Restart bot"
echo "  pm2 stop all          - Stop bot"
echo "  pm2 delete all        - Remove all processes"
echo ""
echo "🎉 Setup complete! Bot is running in background."
echo "📊 Dashboard available at: http://64.226.70.149:8080/"

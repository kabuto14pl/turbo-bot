#!/bin/bash

# 🚀 TURBO BOT - Quick Start Script
# Uruchamia bota i dashboard w tle przez PM2

echo "🚀 Starting Turbo Bot and Dashboard..."
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found. Installing PM2..."
    npm install -g pm2
fi

# Stop any existing processes
echo "🛑 Stopping existing processes..."
pm2 delete all 2>/dev/null || true

# Flush old logs
echo "🧹 Cleaning old logs..."
pm2 flush

# Start with ecosystem config
echo "🚀 Starting services from ecosystem.config.js..."
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
echo "✅ Services Started Successfully!"
echo ""
echo "📍 Available Endpoints:"
echo "  🤖 Trading Bot API:  http://localhost:3001/health"
echo "  📊 Dashboard:        http://localhost:3000/health"
echo "  📈 Dashboard UI:     http://localhost:3000/dashboard"
echo ""
echo "📝 Useful Commands:"
echo "  pm2 list              - Show all processes"
echo "  pm2 logs              - Show logs (all services)"
echo "  pm2 logs turbo-bot    - Show bot logs only"
echo "  pm2 logs dashboard    - Show dashboard logs only"
echo "  pm2 restart all       - Restart all services"
echo "  pm2 stop all          - Stop all services"
echo "  pm2 delete all        - Remove all processes"
echo ""
echo "🎉 Setup complete! Bot and Dashboard are running in background."

#!/bin/bash
# 🚀 [PRODUCTION-OPERATIONAL]
# Production operational script

echo "🚀 Setting up Turbo Trading Bot in Codespace..."

# Install Node.js dependencies quietly
npm install --silent

# Create necessary directories
mkdir -p logs data backups reports results

# Set permissions
chmod +x scripts/*.sh || true
chmod +x *.sh || true

echo "✅ Setup complete! Your trading bot is ready for Codespace development."
echo ""
echo "📋 To start the bot manually:"
echo "  ./start_bot.sh"
echo ""
echo "🔗 This will open only 2 ports:"
echo "- 3000: Trading Dashboard"
echo "- 3001: Trading Bot API"
echo ""
echo "⚠️  No services started automatically to avoid port conflicts."

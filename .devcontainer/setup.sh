#!/bin/bash

echo "🚀 Setting up Turbo Trading Bot in Codespace..."

# Update system
sudo apt-get update

# Install system dependencies
sudo apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release

# Install Node.js dependencies
npm install

# Install Python dependencies
pip install --upgrade pip
pip install numpy pandas matplotlib seaborn plotly jupyter notebook

# Install additional tools
npm install -g nodemon ts-node typescript

# Install Docker Compose if not available
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create necessary directories
mkdir -p logs data backups reports results

# Set permissions
chmod +x scripts/*.sh || true
chmod +x *.sh || true

# Copy environment template if .env doesn't exist
if [ ! -f .env ]; then
    if [ -f trading-bot/.env ]; then
        cp trading-bot/.env .env
        echo "✅ Copied .env from trading-bot directory"
    elif [ -f .env.template ]; then
        cp .env.template .env
        echo "✅ Created .env from template"
    else
        echo "⚠️  Warning: No .env file found. Please create one with your API keys."
    fi
fi

# Build TypeScript
npm run build || echo "⚠️  Build failed - this is normal if no build script exists"

# Install TypeScript globally if needed
npm list -g typescript || npm install -g typescript

echo "✅ Setup complete! Your trading bot is ready for Codespace development."
echo ""
echo "📋 Next steps:"
echo "1. Configure your .env file with API keys"
echo "2. Run 'npm start' or 'npm run dev' to start the bot"
echo "3. Check package.json for available scripts"
echo ""
echo "🔗 Available ports:"
echo "- 3000: Trading Bot API"
echo "- 8080: Grafana Dashboard"
echo "- 9090: Prometheus Metrics"
echo "- 3001: Frontend UI"

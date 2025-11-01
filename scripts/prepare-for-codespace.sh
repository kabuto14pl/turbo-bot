#!/bin/bash
# 🔧 [DEVELOPMENT-TOOL]
# Development tool script

echo "🚀 Preparing Turbo Trading Bot for GitHub Codespaces..."
echo "=================================================="

# Make all scripts executable
echo "🔧 Setting permissions..."
find . -name "*.sh" -type f -exec chmod +x {} \;

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs data config results backups

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "⚠️  No package.json found, skipping npm install"
fi

# Copy env template if .env doesn't exist
if [ ! -f ".env" ] && [ -f ".env.template" ]; then
    echo "🔑 Creating .env from template..."
    cp .env.template .env
    echo "✅ .env created - please configure your API keys"
else
    echo "ℹ️  .env already exists or no template found"
fi

# Check if trading-bot/.env exists and copy it if needed
if [ -f "trading-bot/.env" ] && [ ! -f ".env" ]; then
    echo "🔄 Copying .env from trading-bot directory..."
    cp trading-bot/.env .env
fi

# Build TypeScript if possible
if command -v tsc &> /dev/null && [ -f "tsconfig.json" ]; then
    echo "🔨 Building TypeScript..."
    npm run build 2>/dev/null || tsc 2>/dev/null || echo "⚠️  TypeScript build failed (this is normal for first setup)"
fi

echo ""
echo "✅ Preparation complete!"
echo "=================================================="
echo ""
echo "📋 Next steps:"
echo "1. Push your code to GitHub"
echo "2. Create a new Codespace"
echo "3. Configure .env with your API keys"
echo "4. Run: npm run dev"
echo ""
echo "🌟 Your bot is ready for the cloud!"

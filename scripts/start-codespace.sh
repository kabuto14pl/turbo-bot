#!/bin/bash

# Codespace startup script
echo "🚀 Starting Turbo Trading Bot in Codespace..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📋 Creating .env from template..."
    cp .env.template .env
    echo "⚠️  Please configure your .env file with actual API keys"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building TypeScript..."
npm run build

# Start in development mode
echo "🎯 Starting bot in development mode..."
npm run dev

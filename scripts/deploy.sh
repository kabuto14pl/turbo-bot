#!/bin/bash

# Quick deployment script for Codespace
echo "🚀 Deploying Turbo Trading Bot..."

# Build the application
npm run build

# Start monitoring stack
docker-compose -f docker-compose.codespace.yml up -d prometheus grafana

# Start the bot
npm start

echo "✅ Deployment complete!"
echo "📊 Grafana: http://localhost:8080"
echo "📈 Prometheus: http://localhost:9090"
echo "🤖 Bot API: http://localhost:3000"

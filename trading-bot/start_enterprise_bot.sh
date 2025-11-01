#!/bin/bash
# 🚀 [PRODUCTION-OPERATIONAL]
# Production operational script

echo "🚀 Starting Enterprise Trading Bot with Advanced ML System..."

# Set environment variables for optimal performance
export NODE_ENV=production
export TF_CPP_MIN_LOG_LEVEL=2
export CUDA_VISIBLE_DEVICES=0  # Use GPU 0 if available

# Check if compiled version exists
if [ -f "dist/main.js" ]; then
    echo "📦 Running compiled version..."
    node dist/main.js
else
    echo "🔧 Running TypeScript version..."
    npx ts-node main.ts
fi

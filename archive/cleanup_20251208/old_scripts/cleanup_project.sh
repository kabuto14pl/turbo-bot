#!/bin/bash
# 🚀 [PRODUCTION-OPERATIONAL]
# Production operational script

# 🛠️ [DEVELOPMENT-TOOL]
# TURBO BOT PROJECT CLEANUP SCRIPT
# Development utility for removing dead code and unnecessary files
# Maintenance tool for development environment cleanup

echo "🧹 Starting Turbo Bot Project Cleanup..."

# Navigate to project root
cd "/mnt/c/Users/katbo/Desktop/Turbo Bot Deva"

# Create backup of current state
echo "📦 Creating backup..."
cp -r trading-bot trading-bot-backup-$(date +%Y%m%d_%H%M%S)

# Enter trading-bot directory
cd trading-bot

echo "🗂️ Removing documentation reports..."
# Remove all .md reports (keep only README.md)
find . -name "*.md" ! -name "README.md" ! -name "README_PRODUCTION.md" -delete

echo "🐳 Cleaning Docker files..."
# Keep only production Dockerfile
rm -f Dockerfile.alpine.* Dockerfile.simple Dockerfile.minimal Dockerfile.alpine.*

echo "🔒 Cleaning environment files..."
# Keep only production env files
rm -f .env.demo .env.solo .env.example

echo "🧪 Removing test files..."
# Remove test files
rm -f test_*.ts *_test.ts simple_*.ts minimal_*.ts
rm -f *_demo.ts check_*.ts debug_*.ts

echo "📋 Cleaning logs and temporary data..."
# Remove logs, PIDs, and temporary data
rm -f *.log *.pid *.csv
rm -f *.duckdb *.duckdb.wal
rm -f proxy.log api.log

echo "🏗️ Removing backup directories..."
# Remove old backup directories
rm -rf backups/ 
rm -rf backup-*/

echo "📊 Cleaning result directories..."
# Clean up old results but keep structure
rm -rf results/*
rm -rf test_*_results/
rm -rf *_results/

echo "🗃️ Removing empty/legacy directories..."
# Remove legacy and empty directories
rm -rf legacy_python/
rm -rf venv/
rm -rf .venv/
rm -rf temp/
rm -rf coverage/

echo "📁 Removing duplicate folders..."
# Remove duplicate folders
rm -rf trading-bot/  # Nested duplicate
rm -rf trading-bot-v2/

echo "🧰 Cleaning utility scripts..."
# Remove development utilities
rm -f *.sh *.bat optimization_*.sh
rm -f restart_*.sh optimize_*.sh

echo "📦 Cleaning package files..."
# Remove old package files
rm -f package.json.backup package-security-updated.json package.optimized.json

echo "🔧 Removing development configs..."
# Remove development configs
rm -f jest.config.js eslint.config.js .eslintrc.json
rm -f .prettierignore .vscodeignore .wslconfig*

echo "🎯 Cleaning specialized directories..."
# Remove old specialized directories
rm -rf SimpleMLTest/ SimpleRLAgent/ SimpleRLManager/
rm -rf TestLogger/ TestRiskManager/ WorkingComprehensiveTest/
rm -rf DashboardDemo/ ProfessionalDashboardAPI/

# Go back to main directory
cd ..

echo "📊 Cleaning main directory dashboards..."
# Keep only final production dashboard
rm -f STABLE-DASHBOARD.json fixed-dashboard.json grafana-dashboard*.json
rm -f simple-dashboard.json working-dashboard.json

echo "🗂️ Cleaning main directory files..."
# Remove proxy and debug files
rm -f debug-proxy.js metrics-proxy.* test-express.js stable-proxy.js
rm -f proxy.log *.log

echo "📁 Removing old backup directories from main..."
# Remove backup directories
rm -rf trading-bot-backup-20250813*

echo "✅ Cleanup completed!"
echo "📁 Project structure cleaned and optimized"
echo "🚀 Ready for production deployment"

# Show final structure
echo "📋 Final project structure:"
ls -la

#!/bin/bash

# 🚀 QUICK CLEANUP - BEZ DŁUGIEGO BACKUP
# Szybkie czyszczenie z minimalnym backup tylko kluczowych plików

echo "🚀 QUICK CLEANUP - Minimalna wersja"
echo "=================================="

# Navigate to project root
cd "/mnt/c/Users/katbo/Desktop/Turbo Bot Deva"

# Minimal backup - tylko kluczowe pliki (szybko!)
echo "📦 Creating MINIMAL backup of critical files only..."
mkdir -p "CRITICAL_BACKUP_$(date +%Y%m%d_%H%M%S)"
backup_dir="CRITICAL_BACKUP_$(date +%Y%m%d_%H%M%S)"

# Backup tylko najważniejszych plików (szybko)
cp trading-bot/autonomous_trading_bot.ts "$backup_dir/"
cp trading-bot/kafka_real_time_streaming_final.ts "$backup_dir/"
cp trading-bot/package.json "$backup_dir/"
cp trading-bot/.env.production "$backup_dir/" 2>/dev/null || echo "No .env.production found"
cp trading-bot/Dockerfile.production "$backup_dir/" 2>/dev/null || echo "No Dockerfile.production found"

echo "✅ Critical files backed up to: $backup_dir"

# Enter trading-bot directory  
cd trading-bot

echo ""
echo "🗑️ QUICK CLEANUP - Removing safe files..."

# Quick cleanup - usuń najbardziej oczywiste śmieci
echo "Removing .md documentation files..."
rm -f *.md 2>/dev/null || true
# Zachowaj README
git checkout README.md 2>/dev/null || echo "No git/README found"

echo "Removing test files..."
rm -f test_*.ts test_*.js test_*.log 2>/dev/null || true

echo "Removing log files..."  
rm -f *.log *.pid 2>/dev/null || true

echo "Removing CSV data files..."
rm -f *.csv 2>/dev/null || true

echo "Removing old Docker files..."
rm -f Dockerfile.alpine.* Dockerfile.simple Dockerfile.minimal 2>/dev/null || true

echo "Removing old env files..."
rm -f .env.demo .env.solo .env.example 2>/dev/null || true

echo "Removing simple directories..."
rm -rf SimpleMLTest SimpleRLAgent SimpleRLManager TestLogger TestRiskManager 2>/dev/null || true

# Go back to main directory
cd ..

echo "Removing main directory clutter..."
rm -f STABLE-DASHBOARD.json fixed-dashboard.json grafana-dashboard*.json 2>/dev/null || true
rm -f simple-dashboard.json working-dashboard.json 2>/dev/null || true
rm -f debug-proxy.js metrics-proxy.* test-express.js stable-proxy.js 2>/dev/null || true
rm -f proxy.log *.log debug_log.txt log_sync*.txt meta_system_test.log start.txt bot.pid 2>/dev/null || true

echo "Removing backup directories..."
rm -rf trading-bot-backup-20250813* 2>/dev/null || true

echo ""
echo "✅ QUICK CLEANUP COMPLETED!"
echo "=================================="
echo "🛡️  Critical backup: $backup_dir"
echo "📁 Cleaned project size:"
du -sh trading-bot/

echo ""
echo "🎯 Next: Check if everything works, then run fuller cleanup if needed"
echo "Test bot: cd trading-bot && npm run build"

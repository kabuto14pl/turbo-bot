#!/bin/bash
# 🚀 [PRODUCTION-OPERATIONAL]
# Production operational script

echo "🔄 Rolling back to SimpleRL system..."

# Stop current system
pkill -f "main.ts\|main.js" || true

# Restore from backup
if [ -d "/mnt/c/Users/katbo/Desktop/Turbo Bot Deva/backups/deployment-20250901_050832/trading-bot-backup" ]; then
    echo "📦 Restoring from backup..."
    cp "/mnt/c/Users/katbo/Desktop/Turbo Bot Deva/backups/deployment-20250901_050832/trading-bot-backup/main.ts" "./main.ts"
    echo "✅ Rollback completed"
    echo "🚀 Restart the bot manually"
else
    echo "❌ Backup not found at /mnt/c/Users/katbo/Desktop/Turbo Bot Deva/backups/deployment-20250901_050832"
    exit 1
fi

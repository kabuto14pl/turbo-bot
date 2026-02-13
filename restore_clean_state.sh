#!/bin/bash
# Restoration script for clean project state
# Created: 2025-12-27
# Usage: ./restore_clean_state.sh

echo "🔄 RESTORING CLEAN PROJECT STATE"
echo "================================="

# Check if we are in git repository
if [ ! -d .git ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

echo "⚠️  WARNING: This will restore project to clean state (tag: clean-project-v1.0)"
echo "Current uncommitted changes will be lost!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted"
    exit 0
fi

echo "📦 Creating backup of current state..."
BACKUP_DIR="archive/pre_restore_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
git diff > "$BACKUP_DIR/uncommitted_changes.diff"
git status > "$BACKUP_DIR/git_status.txt"

echo "🔄 Restoring clean state from tag: clean-project-v1.0..."
git fetch --tags
git checkout clean-project-v1.0

echo "✅ Clean state restored!"
echo "📦 Backup of previous state: $BACKUP_DIR"
echo ""
echo "To return to master branch: git checkout master"

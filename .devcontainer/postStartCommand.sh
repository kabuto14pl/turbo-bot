#!/bin/bash
# Auto-run when Codespace container starts

echo "🚀 Codespace Post-Start: Ensuring bot is running..."

# Wait for system to be ready
sleep 5

# Ensure bot is running
/workspaces/turbo-bot/scripts/ensure_bot_running.sh

echo "✅ Post-start complete"

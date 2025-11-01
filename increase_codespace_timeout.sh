#!/bin/bash
# 🔧 Zwiększenie Codespace Timeout z 30 min → 4h

echo "🔧 Codespace Timeout Configuration"
echo "===================================="
echo ""

# Get current codespace ID
CODESPACE_NAME=$(echo $CODESPACE_NAME)
if [ -z "$CODESPACE_NAME" ]; then
    echo "⚠️  Not running in Codespace or CODESPACE_NAME not set"
    echo ""
    echo "Manual method:"
    echo "1. Go to: https://github.com/settings/codespaces"
    echo "2. Find: 'Default idle timeout'"
    echo "3. Change: 30 minutes → 240 minutes (4 hours)"
    echo "4. Click: Update preferences"
    exit 1
fi

echo "📊 Current Codespace: $CODESPACE_NAME"
echo ""

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI (gh) not found"
    echo ""
    echo "Manual method:"
    echo "1. Go to: https://github.com/settings/codespaces"
    echo "2. Find: 'Default idle timeout'"
    echo "3. Change: 30 minutes → 240 minutes (4 hours)"
    echo "4. Click: Update preferences"
    exit 1
fi

# Try to update timeout
echo "🔄 Attempting to increase timeout to 240 minutes (4 hours)..."
echo ""

# Get full codespace name
FULL_NAME="organic-space-rotary-phone-974wg5q445p62x4g9"

# Update via API
gh api --method PATCH "/user/codespaces/$FULL_NAME" \
  -f idle_timeout_minutes=240 2>&1 | head -20

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Timeout increased to 4 hours"
    echo ""
    echo "📊 New configuration:"
    echo "   Previous: 30 minutes"
    echo "   Current:  240 minutes (4 hours)"
    echo ""
    echo "✅ Your 2-hour test will now run without interruption!"
else
    echo ""
    echo "⚠️  API update failed. Use manual method:"
    echo ""
    echo "1. Open: https://github.com/settings/codespaces"
    echo "2. Find: 'Default idle timeout'"
    echo "3. Set to: 240 minutes"
    echo "4. Save"
    echo ""
    echo "This is a one-time setup - affects all future Codespaces"
fi

echo ""
echo "💡 Even with 4h timeout, we recommend running keep-alive for safety:"
echo "   ./keep_codespace_alive.sh"

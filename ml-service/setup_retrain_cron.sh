#!/bin/bash
# ═══════════════════════════════════════════════════════
# TURBO-BOT — Setup Auto-Retrain Cron Job
# 
# Installs a weekly cron job that:
# 1. Fetches latest OHLCV data from OKX (append to existing)
# 2. Retrains XGBoost+LightGBM model on fresh data
# 3. Validates with overfitting guard
# 4. Deploys only if quality score >= 50/100
#
# Usage (on VPS):
#   chmod +x setup_retrain_cron.sh
#   ./setup_retrain_cron.sh
#
# Manual run:
#   python3 /root/turbo-bot/ml-service/retrain_cron.py
#
# Check logs:
#   tail -f /root/turbo-bot/ml-service/retrain.log
# ═══════════════════════════════════════════════════════

set -e

# Configuration
ML_SERVICE_DIR="${ML_SERVICE_DIR:-/root/turbo-bot/ml-service}"
RETRAIN_SCRIPT="$ML_SERVICE_DIR/retrain_cron.py"
LOG_FILE="$ML_SERVICE_DIR/retrain.log"
PYTHON_BIN="${PYTHON_BIN:-python3}"
CRON_SCHEDULE="${CRON_SCHEDULE:-0 4 * * 0}"  # Every Sunday at 4:00 AM UTC

echo "═══════════════════════════════════════════"
echo "🔄 TURBO-BOT Auto-Retrain Setup"
echo "═══════════════════════════════════════════"
echo "ML Service Dir: $ML_SERVICE_DIR"
echo "Schedule:       $CRON_SCHEDULE (Sunday 4AM)"
echo "Python:         $PYTHON_BIN"
echo ""

# Verify Python and dependencies
echo "📦 Checking dependencies..."
$PYTHON_BIN -c "import ccxt, xgboost, lightgbm, sklearn, pandas, numpy; print('✅ All dependencies OK')" 2>/dev/null || {
    echo "❌ Missing Python dependencies. Install with:"
    echo "   pip3 install ccxt xgboost lightgbm scikit-learn pandas numpy"
    exit 1
}

# Verify retrain script exists
if [ ! -f "$RETRAIN_SCRIPT" ]; then
    echo "❌ Script not found: $RETRAIN_SCRIPT"
    exit 1
fi
echo "✅ Retrain script: $RETRAIN_SCRIPT"

# Create cron entry
CRON_CMD="$CRON_SCHEDULE cd $ML_SERVICE_DIR && $PYTHON_BIN retrain_cron.py --timeframes 15m >> $LOG_FILE 2>&1"

# Check if cron entry already exists
if crontab -l 2>/dev/null | grep -q "retrain_cron.py"; then
    echo "⚠️  Existing retrain cron found. Replacing..."
    crontab -l 2>/dev/null | grep -v "retrain_cron.py" | crontab -
fi

# Install cron
(crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
echo "✅ Cron installed: $CRON_SCHEDULE"

# Verify
echo ""
echo "📋 Current crontab:"
crontab -l 2>/dev/null | grep -i "retrain\|turbo" || echo "   (empty)"

echo ""
echo "═══════════════════════════════════════════"
echo "✅ Setup complete!"
echo ""
echo "Commands:"
echo "  Manual retrain:   cd $ML_SERVICE_DIR && $PYTHON_BIN retrain_cron.py"
echo "  Daemon mode:      cd $ML_SERVICE_DIR && $PYTHON_BIN retrain_cron.py --daemon --interval-hours 168"
echo "  Check logs:       tail -f $LOG_FILE"
echo "  Remove cron:      crontab -l | grep -v retrain_cron | crontab -"
echo "═══════════════════════════════════════════"

#!/bin/bash
# ╔══════════════════════════════════════════════════════════════╗
# ║  🚀 ENTERPRISE DASHBOARD - VPS DEPLOYMENT SCRIPT           ║
# ║  Deploys & restarts the dashboard on VPS port 8080          ║
# ╚══════════════════════════════════════════════════════════════╝
#
# Usage:
#   bash deploy_dashboard.sh              # Full deploy (git pull + restart)
#   bash deploy_dashboard.sh --restart    # Only restart (no git pull)
#   bash deploy_dashboard.sh --status     # Check status only
#
# Requirements:
#   - PM2 installed globally: npm install -g pm2
#   - ts-node installed: npm install -g ts-node typescript
#   - Node.js 18+ installed
#
# This script:
#   1. Pulls latest code from GitHub
#   2. Installs any new dependencies
#   3. Kills any existing process on port 8080
#   4. Starts the dashboard via PM2
#   5. Verifies it's running correctly

set -euo pipefail

# =====================================================
# CONFIGURATION
# =====================================================

PROJECT_DIR="/workspaces/turbo-bot"
DASHBOARD_PORT=8080
BOT_PORT=3001
LOG_DIR="${PROJECT_DIR}/logs"
DASHBOARD_NAME="turbo-dashboard"
BOT_NAME="turbo-bot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# =====================================================
# HELPER FUNCTIONS
# =====================================================

log_info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed. Install it with: $2"
        return 1
    fi
    return 0
}

# =====================================================
# STATUS CHECK
# =====================================================

check_status() {
    echo ""
    echo "╔══════════════════════════════════════════════════╗"
    echo "║           📊 SYSTEM STATUS CHECK                ║"
    echo "╚══════════════════════════════════════════════════╝"
    echo ""

    # Check PM2 processes
    log_info "PM2 Processes:"
    pm2 list 2>/dev/null || log_warn "PM2 not running"

    echo ""

    # Check dashboard port
    if curl -sf "http://localhost:${DASHBOARD_PORT}/health" > /dev/null 2>&1; then
        HEALTH=$(curl -sf "http://localhost:${DASHBOARD_PORT}/health")
        log_ok "Dashboard is RUNNING on port ${DASHBOARD_PORT}"
        echo "    Health: ${HEALTH}"
    else
        log_error "Dashboard is NOT responding on port ${DASHBOARD_PORT}"
    fi

    echo ""

    # Check bot port
    if curl -sf "http://localhost:${BOT_PORT}/health" > /dev/null 2>&1; then
        log_ok "Trading Bot is RUNNING on port ${BOT_PORT}"
    else
        log_warn "Trading Bot is NOT responding on port ${BOT_PORT}"
    fi

    echo ""

    # Check API proxy
    if curl -sf "http://localhost:${DASHBOARD_PORT}/api/status" > /dev/null 2>&1; then
        log_ok "API proxy (dashboard → bot) is working"
    else
        log_warn "API proxy is NOT working (bot may be down)"
    fi

    echo ""

    # Memory usage
    log_info "System Memory:"
    free -h 2>/dev/null || true

    echo ""

    # Disk usage
    log_info "Disk Usage:"
    df -h "${PROJECT_DIR}" 2>/dev/null || true
}

# =====================================================
# DEPLOYMENT
# =====================================================

deploy() {
    echo ""
    echo "╔══════════════════════════════════════════════════╗"
    echo "║      🚀 DEPLOYING ENTERPRISE DASHBOARD          ║"
    echo "╚══════════════════════════════════════════════════╝"
    echo ""

    # Verify prerequisites
    log_info "Checking prerequisites..."
    check_command "node" "apt install nodejs" || exit 1
    check_command "npm" "apt install npm" || exit 1
    check_command "pm2" "npm install -g pm2" || exit 1

    NODE_VERSION=$(node -v)
    log_ok "Node.js ${NODE_VERSION}"
    log_ok "npm $(npm -v)"
    log_ok "PM2 $(pm2 -v 2>/dev/null || echo 'unknown')"

    echo ""

    # Navigate to project directory
    if [ ! -d "${PROJECT_DIR}" ]; then
        log_error "Project directory ${PROJECT_DIR} does not exist!"
        exit 1
    fi
    cd "${PROJECT_DIR}"
    log_ok "Working directory: $(pwd)"

    # Create logs directory
    mkdir -p "${LOG_DIR}"

    # Pull latest code if not --restart
    if [ "${1:-}" != "--restart" ]; then
        log_info "Pulling latest code from GitHub..."
        git fetch --all 2>&1 || true
        git pull origin main 2>&1 || git pull origin master 2>&1 || log_warn "Git pull failed - using existing code"
        log_ok "Code updated"

        echo ""

        # Install dependencies if needed
        log_info "Checking dependencies..."
        if [ -f "package-lock.json" ]; then
            npm ci --production=false 2>&1 | tail -3
        else
            npm install 2>&1 | tail -3
        fi
        log_ok "Dependencies installed"
    fi

    echo ""

    # Kill any existing process on dashboard port
    log_info "Stopping existing dashboard..."
    pm2 stop "${DASHBOARD_NAME}" 2>/dev/null || true
    pm2 delete "${DASHBOARD_NAME}" 2>/dev/null || true

    # Also kill any rogue process on the port
    EXISTING_PID=$(lsof -ti ":${DASHBOARD_PORT}" 2>/dev/null || true)
    if [ -n "${EXISTING_PID}" ]; then
        log_warn "Killing existing process on port ${DASHBOARD_PORT} (PID: ${EXISTING_PID})"
        kill -9 ${EXISTING_PID} 2>/dev/null || true
        sleep 1
    fi
    log_ok "Old dashboard stopped"

    echo ""

    # Verify key files exist
    if [ ! -f "start_dashboard.ts" ]; then
        log_error "start_dashboard.ts not found! Run git pull first."
        exit 1
    fi
    if [ ! -f "trading-bot/core/dashboard/enterprise_dashboard_system.ts" ]; then
        log_error "enterprise_dashboard_system.ts not found!"
        exit 1
    fi
    log_ok "Dashboard source files verified"

    echo ""

    # Start dashboard via PM2 (from ecosystem.config.js)
    log_info "Starting dashboard via PM2..."
    pm2 start ecosystem.config.js --only "${DASHBOARD_NAME}" 2>&1
    log_ok "Dashboard started via PM2"

    echo ""

    # Wait for dashboard to be ready
    log_info "Waiting for dashboard to be ready..."
    RETRIES=0
    MAX_RETRIES=15
    while [ $RETRIES -lt $MAX_RETRIES ]; do
        if curl -sf "http://localhost:${DASHBOARD_PORT}/health" > /dev/null 2>&1; then
            log_ok "Dashboard is responding on port ${DASHBOARD_PORT}!"
            break
        fi
        RETRIES=$((RETRIES + 1))
        echo -n "."
        sleep 2
    done
    echo ""

    if [ $RETRIES -ge $MAX_RETRIES ]; then
        log_error "Dashboard did not start within ${MAX_RETRIES} retries!"
        log_info "Checking PM2 logs..."
        pm2 logs "${DASHBOARD_NAME}" --lines 20 --nostream 2>/dev/null || true
        exit 1
    fi

    echo ""

    # Verify endpoints
    log_info "Verifying endpoints..."

    # Health endpoint
    if HEALTH=$(curl -sf "http://localhost:${DASHBOARD_PORT}/health"); then
        log_ok "/health → OK"
    else
        log_warn "/health → FAILED"
    fi

    # Main page
    if curl -sf "http://localhost:${DASHBOARD_PORT}/" | grep -q "Enterprise Trading Bot" 2>/dev/null; then
        log_ok "/ → Dashboard HTML served"
    else
        log_warn "/ → Dashboard HTML check failed"
    fi

    # API proxy to bot
    if curl -sf "http://localhost:${DASHBOARD_PORT}/api/status" > /dev/null 2>&1; then
        log_ok "/api/status → Bot API proxy working"
    else
        log_warn "/api/status → Bot API not reachable (bot may be down)"
    fi

    # Trades endpoint
    if curl -sf "http://localhost:${DASHBOARD_PORT}/api/trades" > /dev/null 2>&1; then
        log_ok "/api/trades → Working"
    else
        log_warn "/api/trades → Not available"
    fi

    echo ""

    # Save PM2 process list
    pm2 save 2>/dev/null || true

    echo ""
    echo "╔══════════════════════════════════════════════════╗"
    echo "║   ✅ DASHBOARD DEPLOYMENT COMPLETE!              ║"
    echo "╠══════════════════════════════════════════════════╣"
    echo "║                                                  ║"
    echo "║   🌐 Dashboard: http://64.226.70.149:${DASHBOARD_PORT}/       ║"
    echo "║   📊 Health:    http://64.226.70.149:${DASHBOARD_PORT}/health  ║"
    echo "║   🤖 Bot API:   http://localhost:${BOT_PORT}/             ║"
    echo "║                                                  ║"
    echo "║   PM2 Commands:                                  ║"
    echo "║     pm2 logs ${DASHBOARD_NAME}                   ║"
    echo "║     pm2 restart ${DASHBOARD_NAME}                ║"
    echo "║     pm2 monit                                    ║"
    echo "║                                                  ║"
    echo "╚══════════════════════════════════════════════════╝"
    echo ""
}

# =====================================================
# MAIN
# =====================================================

case "${1:-}" in
    --status)
        check_status
        ;;
    --restart)
        deploy --restart
        ;;
    *)
        deploy
        ;;
esac

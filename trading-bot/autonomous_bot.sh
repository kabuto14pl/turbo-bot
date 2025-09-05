#!/bin/bash

# 🚀 AUTONOMOUS TRADING BOT - STARTUP SCRIPT
# Uruchamia pełnie zautomatyzowany system tradingowy zgodnie ze specyfikacją

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
LOG_FILE="$PROJECT_DIR/logs/startup.log"
PID_FILE="$PROJECT_DIR/autonomous_bot.pid"

# Ensure log directory exists
mkdir -p "$PROJECT_DIR/logs"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# Check if bot is already running
check_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0  # Running
        else
            rm -f "$PID_FILE"
            return 1  # Not running
        fi
    fi
    return 1  # Not running
}

# Start function
start() {
    log "🚀 Starting Autonomous Trading Bot..."
    
    if check_running; then
        warning "Bot is already running (PID: $(cat "$PID_FILE"))"
        return 1
    fi
    
    # Check prerequisites
    info "🔍 Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        return 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        return 1
    fi
    
    # Check if TypeScript files exist
    if [ ! -f "$PROJECT_DIR/autonomous_trading_bot.ts" ]; then
        error "autonomous_trading_bot.ts not found"
        return 1
    fi
    
    # Install dependencies if needed
    if [ ! -d "$PROJECT_DIR/node_modules" ]; then
        info "📦 Installing dependencies..."
        cd "$PROJECT_DIR"
        npm install
    fi
    
    # Check environment configuration
    if [ ! -f "$PROJECT_DIR/.env.production" ]; then
        warning "No .env.production found, using defaults"
    fi
    
    # Create required directories
    info "📁 Creating required directories..."
    mkdir -p "$PROJECT_DIR/data"
    mkdir -p "$PROJECT_DIR/logs"
    mkdir -p "$PROJECT_DIR/models"
    mkdir -p "$PROJECT_DIR/reports"
    mkdir -p "$PROJECT_DIR/backups"
    
    # Start the bot
    info "🤖 Starting autonomous trading bot process..."
    cd "$PROJECT_DIR"
    
    # Export environment
    export NODE_ENV=production
    if [ -f ".env.production" ]; then
        set -a
        source .env.production
        set +a
    fi
    
    # Start bot in background
    nohup npx ts-node autonomous_trading_bot.ts > "$LOG_FILE" 2>&1 &
    local bot_pid=$!
    
    # Save PID
    echo "$bot_pid" > "$PID_FILE"
    
    # Wait a moment to check if it started successfully
    sleep 5
    
    if ps -p "$bot_pid" > /dev/null 2>&1; then
        log "✅ Autonomous Trading Bot started successfully (PID: $bot_pid)"
        info "📊 Check logs: tail -f $LOG_FILE"
        info "📈 Monitor status: ./autonomous_bot.sh status"
        return 0
    else
        error "Failed to start Autonomous Trading Bot"
        rm -f "$PID_FILE"
        return 1
    fi
}

# Stop function
stop() {
    log "🛑 Stopping Autonomous Trading Bot..."
    
    if ! check_running; then
        warning "Bot is not running"
        return 1
    fi
    
    local pid=$(cat "$PID_FILE")
    
    # Send SIGTERM for graceful shutdown
    info "Sending SIGTERM to PID $pid..."
    kill -TERM "$pid"
    
    # Wait for graceful shutdown
    local timeout=30
    while [ $timeout -gt 0 ] && ps -p "$pid" > /dev/null 2>&1; do
        sleep 1
        ((timeout--))
    done
    
    # Force kill if still running
    if ps -p "$pid" > /dev/null 2>&1; then
        warning "Graceful shutdown failed, force killing..."
        kill -KILL "$pid"
        sleep 2
    fi
    
    # Clean up
    rm -f "$PID_FILE"
    
    if ! ps -p "$pid" > /dev/null 2>&1; then
        log "✅ Autonomous Trading Bot stopped successfully"
        return 0
    else
        error "Failed to stop Autonomous Trading Bot"
        return 1
    fi
}

# Restart function
restart() {
    log "🔄 Restarting Autonomous Trading Bot..."
    stop
    sleep 2
    start
}

# Status function
status() {
    echo "📊 Autonomous Trading Bot Status:"
    echo "================================"
    
    if check_running; then
        local pid=$(cat "$PID_FILE")
        echo -e "Status: ${GREEN}RUNNING${NC} (PID: $pid)"
        
        # Get process info
        if command -v ps &> /dev/null; then
            echo "Process info:"
            ps -p "$pid" -o pid,ppid,cmd,etime,pcpu,pmem --no-headers
        fi
        
        # Check port usage
        if command -v netstat &> /dev/null; then
            echo ""
            echo "Port usage:"
            netstat -tlnp 2>/dev/null | grep "$pid" | head -5
        fi
        
        # Show recent log entries
        echo ""
        echo "Recent log entries:"
        echo "-------------------"
        if [ -f "$LOG_FILE" ]; then
            tail -n 10 "$LOG_FILE"
        else
            echo "No log file found"
        fi
        
    else
        echo -e "Status: ${RED}STOPPED${NC}"
    fi
    
    # Show system resources
    echo ""
    echo "System resources:"
    echo "-----------------"
    if command -v free &> /dev/null; then
        echo "Memory:"
        free -h
    fi
    
    if command -v df &> /dev/null; then
        echo ""
        echo "Disk space:"
        df -h "$PROJECT_DIR" | tail -n 1
    fi
}

# Logs function
logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        error "Log file not found: $LOG_FILE"
        return 1
    fi
}

# Health check function
health() {
    info "🏥 Performing health check..."
    
    if ! check_running; then
        error "Bot is not running"
        return 1
    fi
    
    # Check if bot is responding (assuming it has a health endpoint)
    if command -v curl &> /dev/null; then
        local health_url="http://localhost:9093/api/health"
        if curl -s -f "$health_url" > /dev/null 2>&1; then
            log "✅ Health check passed - Bot is responding"
            return 0
        else
            error "Health check failed - Bot not responding on $health_url"
            return 1
        fi
    else
        warning "curl not available, skipping HTTP health check"
        log "✅ Process health check passed"
        return 0
    fi
}

# Install systemd service
install_service() {
    log "📦 Installing systemd service..."
    
    if [ "$EUID" -ne 0 ]; then
        error "Please run with sudo to install systemd service"
        return 1
    fi
    
    local service_file="/etc/systemd/system/autonomous-trading-bot.service"
    
    # Create service file
    cat > "$service_file" << EOF
[Unit]
Description=Autonomous Trading Bot Service
After=network.target
Wants=network-online.target
After=network-online.target

[Service]
Type=forking
User=\$(whoami)
Group=\$(whoami)
WorkingDirectory=$PROJECT_DIR
ExecStart=$PROJECT_DIR/autonomous_bot.sh start
ExecStop=$PROJECT_DIR/autonomous_bot.sh stop
ExecReload=$PROJECT_DIR/autonomous_bot.sh restart
Restart=always
RestartSec=10
PIDFile=$PID_FILE

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable autonomous-trading-bot.service
    
    log "✅ Systemd service installed and enabled"
    info "Use: sudo systemctl start autonomous-trading-bot"
}

# Main script
main() {
    case "${1:-}" in
        start)
            start
            ;;
        stop)
            stop
            ;;
        restart)
            restart
            ;;
        status)
            status
            ;;
        logs)
            logs
            ;;
        health)
            health
            ;;
        install-service)
            install_service
            ;;
        *)
            echo "🤖 Autonomous Trading Bot Control Script"
            echo "======================================="
            echo ""
            echo "Usage: $0 {start|stop|restart|status|logs|health|install-service}"
            echo ""
            echo "Commands:"
            echo "  start           - Start the trading bot"
            echo "  stop            - Stop the trading bot"
            echo "  restart         - Restart the trading bot"
            echo "  status          - Show bot status and system info"
            echo "  logs            - Follow log output"
            echo "  health          - Perform health check"
            echo "  install-service - Install systemd service (requires sudo)"
            echo ""
            echo "Examples:"
            echo "  $0 start          # Start bot"
            echo "  $0 status         # Check status"
            echo "  $0 logs           # Monitor logs"
            echo "  sudo $0 install-service  # Install as system service"
            echo ""
            exit 1
            ;;
    esac
}

# Run main function
main "$@"

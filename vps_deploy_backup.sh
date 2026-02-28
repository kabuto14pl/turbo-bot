#!/bin/bash
# ================================================================================
# TURBO BOT - VPS DEPLOYMENT SCRIPT (BACKUP/LOCAL VERSION)
# ================================================================================
# If GitHub raw link doesn't work, copy this script content directly to VPS
# Usage: Save this file, upload to VPS, chmod +x, then run
# ================================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Config
APP_DIR="/opt/turbo-bot"
REPO_URL="https://github.com/kabuto14pl/turbo-bot.git"
NODE_VERSION="20"

log() { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════════╗"
echo -e "║         🚀 TURBO BOT - VPS DEPLOYMENT (AUTOMATED)                     ║"
echo -e "╚════════════════════════════════════════════════════════════════════════╝${NC}\n"

# Step 1: System Update
log "Step 1/10: Updating system..."
sudo apt update && sudo apt upgrade -y
success "System updated"

# Step 2: Install Node.js
log "Step 2/10: Installing Node.js ${NODE_VERSION}.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt install -y nodejs
    success "Node.js installed: $(node --version)"
else
    log "Node.js already installed: $(node --version)"
fi

# Step 3: Install PM2
log "Step 3/10: Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    success "PM2 installed: $(pm2 --version)"
else
    log "PM2 already installed: $(pm2 --version)"
fi

# Step 4: Install Git
log "Step 4/10: Installing Git..."
if ! command -v git &> /dev/null; then
    sudo apt install -y git
    success "Git installed"
else
    log "Git already installed"
fi

# Step 5: Create directory
log "Step 5/10: Setting up directory..."
if [ -d "$APP_DIR" ]; then
    warn "Directory exists, backing up..."
    BACKUP="${APP_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    sudo mv "$APP_DIR" "$BACKUP"
    log "Backed up to: $BACKUP"
fi
sudo mkdir -p "$APP_DIR"
cd "$APP_DIR"
success "Directory created: $APP_DIR"

# Step 6: Clone repo
log "Step 6/10: Cloning repository..."
git clone "$REPO_URL" .
success "Repository cloned"

# Step 7: Install dependencies
log "Step 7/10: Installing dependencies..."
npm install
npm uninstall @tensorflow/tfjs-node || warn "TF package not found"
success "Dependencies installed"

# Step 8: Fix TensorFlow import
log "Step 8/10: Configuring TensorFlow..."
TF_FILE="trading-bot/src/core/ml/enterprise_tensorflow_manager.ts"
if [ -f "$TF_FILE" ]; then
    sed -i "12s|^import '@tensorflow/tfjs-node';|// import '@tensorflow/tfjs-node'; // DISABLED|" "$TF_FILE"
    success "TensorFlow configured"
else
    warn "TensorFlow file not found: $TF_FILE"
fi

# Step 9: Create .env
log "Step 9/10: Creating environment configuration..."
cat > .env << 'EOF'
NODE_ENV=production
MODE=simulation
TRADING_MODE=simulation
ML_ENABLED=true
REDIS_ENABLED=false
ENABLE_REAL_TRADING=false
INITIAL_CAPITAL=10000
HEALTH_CHECK_PORT=3001
EOF
chmod 600 .env
success "Environment configured"

# Step 10: Start with PM2
log "Step 10/10: Starting bot with PM2..."
pm2 stop turbo-bot 2>/dev/null || log "No process to stop"
pm2 delete turbo-bot 2>/dev/null || log "No process to delete"
pm2 start ecosystem.config.js --env production
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $(whoami) --hp $HOME
success "Bot started!"

# Verification
echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════════════════╗"
echo -e "║                    ✅ DEPLOYMENT COMPLETE!                            ║"
echo -e "╚════════════════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${CYAN}📊 VERIFICATION:${NC}"
pm2 list

echo -e "\n${CYAN}📝 USEFUL COMMANDS:${NC}"
echo "  pm2 logs turbo-bot         # View logs"
echo "  pm2 monit                  # Real-time monitoring"
echo "  curl localhost:3001/health # Health check"
echo "  pm2 restart turbo-bot      # Restart"

echo -e "\n${YELLOW}⏭️  NEXT STEPS:${NC}"
echo "  1. Check logs: pm2 logs turbo-bot --lines 30"
echo "  2. Verify health: curl localhost:3001/health"
echo "  3. Close VS Code - bot runs independently! ✅"

echo -e "\n${GREEN}🎯 Deployment successful! Bot running 24/7 on VPS${NC}\n"

# Show initial logs
read -p "Show initial logs? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pm2 logs turbo-bot --lines 30
fi

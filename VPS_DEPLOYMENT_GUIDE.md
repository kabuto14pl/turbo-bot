# 🚀 VPS DEPLOYMENT GUIDE - 24/7 Autonomous Bot

**Serwer VPS:** 64.226.70.149  
**Cel:** Deploy bota na serwer Linux dla 24/7 uptime (niezależnie od VS Code)

---

## ⚠️ KLUCZOWA INFORMACJA

### 🔴 **VS Code LOKALNIE = Bot ZATRZYMANY po zamknięciu**

**OBECNA SYTUACJA (Lokalny Windows):**
- ❌ Bot działa w PowerShell terminal w VS Code
- ❌ Zamknięcie VS Code = Terminal zamknięty = **BOT STOP**
- ❌ Komputer musi być włączony 24/7
- ❌ Nie ma persistence między sesjami

### 🟢 **SERWER VPS = Bot działa ZAWSZE**

**PO DEPLOYMENT NA VPS:**
- ✅ Bot działa na serwerze Linux 24/7
- ✅ Niezależny od VS Code (możesz zamknąć)
- ✅ Niezależny od lokalnego komputera
- ✅ PM2 = auto-restart przy crashu
- ✅ Persistence + monitoring
- ✅ Remote access przez SSH

---

## 🎯 DEPLOYMENT STEPS

### OPTION A: PM2 Deployment (RECOMMENDED)

#### 1️⃣ **Połącz się z serwerem**

```bash
# Z Windows (PowerShell)
ssh root@64.226.70.149
# Lub username@64.226.70.149

# Alternatywnie przez VS Code Remote SSH
# Extensions -> Remote - SSH -> Connect to Host
# root@64.226.70.149
```

#### 2️⃣ **Przygotuj serwer (first time only)**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.x.x
npm --version

# Install PM2 globally
sudo npm install -g pm2

# Install Git
sudo apt install -y git

# Create app directory
mkdir -p /opt/turbo-bot
cd /opt/turbo-bot
```

#### 3️⃣ **Clone repository**

```bash
# Option A: HTTPS (easier, no SSH keys needed)
git clone https://github.com/kabuto14pl/turbo-bot.git .

# Option B: SSH (requires SSH key setup)
# git clone git@github.com:kabuto14pl/turbo-bot.git .

# Verify
ls -la
```

#### 4️⃣ **Install dependencies**

```bash
# Install packages (WITHOUT Python-dependent TensorFlow)
npm install

# Remove TensorFlow Node backend (if present)
npm uninstall @tensorflow/tfjs-node

# Install clean (408 packages, no Python needed)
npm install --production=false
```

#### 5️⃣ **Configure environment**

```bash
# Create .env file
cat > .env << 'EOF'
# Trading Bot Configuration
NODE_ENV=production
MODE=simulation
TRADING_MODE=simulation
ML_ENABLED=true
REDIS_ENABLED=false
ENABLE_REAL_TRADING=false

# Portfolio
INITIAL_CAPITAL=10000

# API Keys (for live trading - leave empty for simulation)
API_KEY=
SECRET=
PASSPHRASE=

# Monitoring
PROMETHEUS_PORT=9090
HEALTH_CHECK_PORT=3001

# ML Settings
CONFIDENCE_THRESHOLD=0.15
EOF

# Set permissions
chmod 600 .env
```

#### 6️⃣ **Disable TensorFlow Node import** (same fix as local)

```bash
# Edit enterprise_tensorflow_manager.ts
nano trading-bot/src/core/ml/enterprise_tensorflow_manager.ts

# Comment out line 12:
# // import '@tensorflow/tfjs-node'; // DISABLED - requires Python, using browser backend

# Or use sed
sed -i "12s/^/\/\/ /" trading-bot/src/core/ml/enterprise_tensorflow_manager.ts
```

#### 7️⃣ **Test bot locally first**

```bash
# Test run (foreground)
npx ts-node --transpile-only trading-bot/autonomous_trading_bot_final.ts

# Should see:
# ✅ Enterprise ML System v2.0.0 loaded successfully!
# ℹ️ Redis disabled (MODE=simulation, REDIS_ENABLED=false)
# 🚀 Enterprise ML Status: {...}

# Stop with Ctrl+C if working
```

#### 8️⃣ **Deploy with PM2**

```bash
# Start bot using ecosystem.config.js
pm2 start ecosystem.config.js --env production

# Verify
pm2 list

# Should show:
# ┌─────┬──────────────┬─────────┬─────────┬──────────┐
# │ id  │ name         │ status  │ cpu     │ memory   │
# ├─────┼──────────────┼─────────┼─────────┼──────────┤
# │ 0   │ turbo-bot    │ online  │ 0%      │ 100 MB   │
# └─────┴──────────────┴─────────┴─────────┴──────────┘

# View logs
pm2 logs turbo-bot --lines 50

# Monitor real-time
pm2 monit
```

#### 9️⃣ **Setup PM2 startup (auto-start on server reboot)**

```bash
# Generate startup script
pm2 startup

# Copy and run the command it outputs (example):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root

# Save current PM2 process list
pm2 save

# Test reboot survival
sudo reboot
# Wait 30 seconds, reconnect
ssh root@64.226.70.149
pm2 list  # Should still show turbo-bot running
```

#### 🔟 **Setup monitoring dashboard**

```bash
# Install PM2 monitoring web UI
pm2 install pm2-server-monit

# Or use PM2 Plus (optional)
pm2 plus
```

---

### OPTION B: Docker Deployment (Alternative)

#### 1️⃣ **Install Docker on VPS**

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install -y docker-compose

# Verify
docker --version
docker-compose --version
```

#### 2️⃣ **Clone repo and build**

```bash
mkdir -p /opt/turbo-bot
cd /opt/turbo-bot
git clone https://github.com/kabuto14pl/turbo-bot.git .

# Build Docker image
docker build -f trading-bot/Dockerfile.production -t turbo-bot:latest .
```

#### 3️⃣ **Run container**

```bash
# Run in detached mode
docker run -d \
  --name turbo-bot \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e MODE=simulation \
  -e ML_ENABLED=true \
  -e REDIS_ENABLED=false \
  -v /opt/turbo-bot/logs:/app/logs \
  turbo-bot:latest

# View logs
docker logs -f turbo-bot

# Stop
docker stop turbo-bot

# Restart
docker restart turbo-bot
```

---

## 📊 MANAGEMENT COMMANDS

### PM2 Commands (After Deployment)

```bash
# Status check
pm2 status
pm2 list

# View logs
pm2 logs turbo-bot
pm2 logs turbo-bot --lines 100
pm2 logs turbo-bot --err  # Only errors

# Monitoring
pm2 monit  # Real-time monitoring UI
pm2 describe turbo-bot  # Detailed info

# Control
pm2 restart turbo-bot
pm2 reload turbo-bot  # Zero-downtime restart
pm2 stop turbo-bot
pm2 delete turbo-bot  # Remove from PM2

# Update code
cd /opt/turbo-bot
git pull origin master
npm install
pm2 reload turbo-bot  # Zero-downtime update
```

### Health Checks (from anywhere)

```bash
# From local machine (Windows PowerShell)
curl http://64.226.70.149:3001/health
curl http://64.226.70.149:3001/api/status

# From VPS
curl localhost:3001/health
```

---

## 🔍 MONITORING & LOGS

### Access Logs Remotely

```bash
# SSH into server
ssh root@64.226.70.149

# View PM2 logs
pm2 logs turbo-bot --lines 50

# View raw log files
tail -f /opt/turbo-bot/logs/*.log

# Search logs
grep "Portfolio" /opt/turbo-bot/logs/pm2-out.log | tail -20
grep "ERROR" /opt/turbo-bot/logs/pm2-error.log
```

### Download Logs to Local Machine

```powershell
# From Windows PowerShell
scp root@64.226.70.149:/opt/turbo-bot/logs/pm2-out.log C:\Users\dudzi\Downloads\

# Or entire logs directory
scp -r root@64.226.70.149:/opt/turbo-bot/logs/ C:\Users\dudzi\Downloads\vps-logs\
```

### Set Up Log Rotation

```bash
# Install logrotate config
sudo cat > /etc/logrotate.d/turbo-bot << 'EOF'
/opt/turbo-bot/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}
EOF

# Test
sudo logrotate -f /etc/logrotate.d/turbo-bot
```

---

## 🚨 TROUBLESHOOTING

### Bot not starting

```bash
# Check PM2 status
pm2 list

# View error logs
pm2 logs turbo-bot --err --lines 100

# View full logs
tail -100 /opt/turbo-bot/logs/pm2-error.log

# Check system resources
free -h  # Memory
df -h    # Disk space
top      # CPU usage

# Restart bot
pm2 restart turbo-bot
```

### Port conflicts

```bash
# Check what's using port 3001
sudo lsof -i :3001
sudo netstat -tulpn | grep 3001

# Kill process if needed
sudo kill -9 <PID>
```

### Out of memory

```bash
# Check memory usage
free -h
pm2 monit

# Restart bot to clear memory
pm2 restart turbo-bot

# If persistent, reduce PM2 instances in ecosystem.config.js
nano /opt/turbo-bot/ecosystem.config.js
# Change: instances: 1  (from 2)
pm2 reload ecosystem.config.js
```

### Git pull fails

```bash
# Stash local changes
git stash

# Pull latest
git pull origin master

# Restore changes (if needed)
git stash pop

# Or hard reset (CAUTION: loses local changes)
git fetch origin
git reset --hard origin/master
```

---

## 🔐 SECURITY RECOMMENDATIONS

### Firewall Setup

```bash
# Install UFW
sudo apt install -y ufw

# Allow SSH (CRITICAL - don't lock yourself out!)
sudo ufw allow 22/tcp

# Allow health check port
sudo ufw allow 3001/tcp

# Allow Prometheus (if external access needed)
sudo ufw allow 9090/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Create Non-Root User (Recommended)

```bash
# Create user
sudo adduser botuser
sudo usermod -aG sudo botuser

# Switch ownership
sudo chown -R botuser:botuser /opt/turbo-bot

# Future logins
ssh botuser@64.226.70.149
```

### Setup SSH Keys (No Password)

```powershell
# On Windows - Generate SSH key (if not exists)
ssh-keygen -t ed25519 -C "your-email@example.com"

# Copy public key to server
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@64.226.70.149 "cat >> ~/.ssh/authorized_keys"

# Test passwordless login
ssh root@64.226.70.149  # Should NOT ask for password
```

---

## 📈 PERFORMANCE OPTIMIZATION

### Increase Node.js Memory Limit

```bash
# Edit ecosystem.config.js
nano /opt/turbo-bot/ecosystem.config.js

# Add node_args:
{
  name: 'turbo-bot',
  script: 'npx',
  args: 'ts-node trading-bot/autonomous_trading_bot_final.ts',
  node_args: '--max-old-space-size=2048',  # <-- ADD THIS (2GB)
  // ... rest of config
}

# Reload
pm2 reload ecosystem.config.js
```

### Enable Swap (for low-memory VPS)

```bash
# Create 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify
free -h
```

---

## ✅ POST-DEPLOYMENT VERIFICATION

### From Windows (Local Machine)

```powershell
# Quick health check
curl http://64.226.70.149:3001/health

# Full status
curl http://64.226.70.149:3001/api/status

# Check if bot is accessible
Test-NetConnection -ComputerName 64.226.70.149 -Port 3001
```

### From VPS (SSH)

```bash
# PM2 status
pm2 list

# Recent logs
pm2 logs turbo-bot --lines 20

# Health check
curl localhost:3001/health

# Process info
ps aux | grep node
```

### Expected Output

```json
// http://64.226.70.149:3001/health
{
  "status": "healthy",
  "timestamp": "2026-02-10T...",
  "uptime": 3600,
  "mode": "simulation"
}

// http://64.226.70.149:3001/api/status
{
  "health": "healthy",
  "portfolio": 10000.00,
  "trades": 5,
  "ml_system": "operational",
  "phase": "WARMUP"
}
```

---

## 🎯 QUICK START SUMMARY

**Fastest deployment path:**

```bash
# 1. SSH to VPS
ssh root@64.226.70.149

# 2. Install Node.js + PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 3. Clone & setup
mkdir -p /opt/turbo-bot && cd /opt/turbo-bot
git clone https://github.com/kabuto14pl/turbo-bot.git .
npm install
npm uninstall @tensorflow/tfjs-node

# 4. Fix TensorFlow import
sed -i "12s/^/\/\/ /" trading-bot/src/core/ml/enterprise_tensorflow_manager.ts

# 5. Create .env
cat > .env << 'EOF'
NODE_ENV=production
MODE=simulation
ML_ENABLED=true
REDIS_ENABLED=false
EOF

# 6. Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 7. Verify
pm2 logs turbo-bot
curl localhost:3001/health
```

**Done! Bot now runs 24/7 independent of VS Code** ✅

---

## 📞 REMOTE ACCESS FROM VS CODE

### Option 1: Remote - SSH Extension

1. **Install extension:** `Remote - SSH` by Microsoft
2. **Connect:**
   - Ctrl+Shift+P → "Remote-SSH: Connect to Host"
   - Enter: `root@64.226.70.149`
   - Password / SSH key authentication
3. **Open folder:** `/opt/turbo-bot`
4. **Edit files directly** on server
5. **Use integrated terminal** for PM2 commands

### Option 2: SFTP Extension

1. **Install:** `SFTP/FTP sync` extension
2. **Configure:** Create `.vscode/sftp.json`:
   ```json
   {
     "host": "64.226.70.149",
     "protocol": "sftp",
     "port": 22,
     "username": "root",
     "remotePath": "/opt/turbo-bot",
     "uploadOnSave": true
   }
   ```
3. **Sync:** Auto-upload on save

---

## 🔄 MIGRATION FROM LOCAL TO VPS

### Stop Local Bot

```powershell
# On Windows - stop local bot
Get-Process node | Stop-Process
Remove-Job Bot48hMonitoring -Force
```

### Transfer Logs (Optional)

```powershell
# Upload local logs to VPS
scp C:\Users\dudzi\turbo-bot-local\logs\*.log root@64.226.70.149:/opt/turbo-bot/logs/local-backup/
```

### Continue Monitoring on VPS

```bash
# SSH to VPS
ssh root@64.226.70.149

# Check bot is running
pm2 logs turbo-bot

# Setup similar monitoring
watch -n 900 'curl localhost:3001/api/status'  # Every 15 min
```

---

## ✨ BENEFITS OF VPS DEPLOYMENT

| Feature | Local (Windows) | VPS Deployment |
|---------|----------------|----------------|
| **Uptime** | ❌ Requires PC on 24/7 | ✅ Always on |
| **VS Code Dependency** | ❌ Must stay open | ✅ Independent |
| **Auto-Restart** | ❌ Manual only | ✅ PM2 auto-restart |
| **Remote Access** | ❌ Limited | ✅ SSH from anywhere |
| **Monitoring** | ⚠️ Manual checks | ✅ PM2 + Web UI |
| **Scalability** | ❌ Single instance | ✅ Cluster mode |
| **Log Management** | ⚠️ Manual | ✅ PM2 + logrotate |
| **Power Outage** | ❌ Bot stops | ✅ Server continues |

---

## 📝 NEXT STEPS

1. **Deploy to VPS** using Quick Start Summary above
2. **Verify health** at http://64.226.70.149:3001/health
3. **Setup monitoring** with PM2 monit
4. **Close VS Code** - bot continues running ✅
5. **Access remotely** via SSH when needed
6. **Monitor 48h simulation** from anywhere

**After deployment, you can safely:**
- ✅ Close VS Code
- ✅ Turn off your local PC
- ✅ Access bot logs from anywhere via SSH
- ✅ Update code with `git pull && pm2 reload`

---

**🎊 Result: True 24/7 autonomous trading bot independent of your local machine!**

# 🚀 VPS DEPLOYMENT - EXECUTION GUIDE (48H BOT)

**Deployment Date:** 2026-02-10  
**Target Server:** 64.226.70.149  
**Duration:** 48 hours autonomous operation  
**Status:** ✅ SSH Ready - Proceeding with deployment

---

## 📋 PRE-DEPLOYMENT CHECKLIST

- [x] SSH port 22 accessible (verified)
- [x] Local bot stopped (cleaned up)
- [ ] SSH credentials ready
- [ ] Deployment script prepared
- [ ] Monitoring setup planned

---

## 🎯 DEPLOYMENT INSTRUCTIONS

### OPTION A: Automated Deployment (RECOMMENDED - 5 minutes)

#### Step 1: Open New Terminal/PowerShell

Open a **NEW** PowerShell window (separate from VS Code)

#### Step 2: Connect to VPS via SSH

```powershell
# Connect to VPS
ssh root@64.226.70.149

# If asked for password, enter it
# If using SSH key, it should connect automatically
```

**Expected output:**
```
Welcome to Ubuntu 20.04.x LTS...
root@vps-server:~#
```

#### Step 3: Download and Run Deployment Script

Copy-paste these commands **ONE BY ONE** into SSH terminal:

```bash
# 1. Download deployment script
curl -fsSL https://raw.githubusercontent.com/kabuto14pl/turbo-bot/master/scripts/deploy_to_vps.sh -o deploy_to_vps.sh

# 2. Make it executable
chmod +x deploy_to_vps.sh

# 3. Run deployment
./deploy_to_vps.sh
```

#### Step 4: Wait for Deployment (5 minutes)

The script will automatically:
- ✅ Update system packages
- ✅ Install Node.js 20.x
- ✅ Install PM2 process manager
- ✅ Clone turbo-bot repository
- ✅ Install all dependencies (408 packages)
- ✅ Configure environment (.env file)
- ✅ Disable TensorFlow Node backend import
- ✅ Start bot with PM2
- ✅ Setup auto-start on reboot

**You'll see output like:**
```
================================================================================
  🚀 TURBO BOT - AUTOMATED VPS DEPLOYMENT
================================================================================
[INFO] Step 1/10: Updating system packages...
[SUCCESS] System updated
[INFO] Step 2/10: Installing Node.js 20.x...
...
```

#### Step 5: Verify Deployment

After script completes, verify bot is running:

```bash
# Check PM2 status
pm2 list

# Expected output:
# ┌─────┬──────────────┬─────────┬─────────┬──────────┐
# │ id  │ name         │ status  │ cpu     │ memory   │
# ├─────┼──────────────┼─────────┼─────────┼──────────┤
# │ 0   │ turbo-bot    │ online  │ 0%      │ 120 MB   │
# └─────┴──────────────┴─────────┴─────────┴──────────┘

# View logs (last 30 lines)
pm2 logs turbo-bot --lines 30

# Should see:
# [INFO] 🚀 Enterprise ML System v2.0.0 loaded successfully!
# [INFO] ℹ️ Redis disabled (MODE=simulation, REDIS_ENABLED=false)
# [INFO] ✅ Enterprise ML System fully operational
```

#### Step 6: Test Health Check

```bash
# Local check (on VPS)
curl http://localhost:3001/health

# Expected:
# {"status":"healthy","timestamp":"2026-02-10T...","uptime":123,"mode":"simulation"}

# External check (from your Windows - new PowerShell)
# curl http://64.226.70.149:3001/health
```

---

### OPTION B: Manual Deployment (if automated fails)

<details>
<summary>Click to expand manual instructions</summary>

#### 1. Connect via SSH
```bash
ssh root@64.226.70.149
```

#### 2. Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Verify: should be v20.x.x
```

#### 3. Install PM2
```bash
sudo npm install -g pm2
pm2 --version
```

#### 4. Create app directory
```bash
mkdir -p /opt/turbo-bot
cd /opt/turbo-bot
```

#### 5. Clone repository
```bash
git clone https://github.com/kabuto14pl/turbo-bot.git .
ls -la  # Verify files present
```

#### 6. Install dependencies
```bash
npm install
npm uninstall @tensorflow/tfjs-node  # Remove Python-dependent package
```

#### 7. Fix TensorFlow import
```bash
# Edit file to comment out tfjs-node import
sed -i '12s/^/\/\/ /' trading-bot/src/core/ml/enterprise_tensorflow_manager.ts

# Verify
grep -n "tfjs-node" trading-bot/src/core/ml/enterprise_tensorflow_manager.ts
# Should show line 12 commented out
```

#### 8. Create .env file
```bash
cat > .env << 'EOF'
NODE_ENV=production
MODE=simulation
TRADING_MODE=simulation
ML_ENABLED=true
REDIS_ENABLED=false
ENABLE_REAL_TRADING=false
INITIAL_CAPITAL=10000
EOF

chmod 600 .env
```

#### 9. Start with PM2
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # Copy and run the command it outputs
```

#### 10. Verify
```bash
pm2 list
pm2 logs turbo-bot --lines 20
curl localhost:3001/health
```

</details>

---

## 📊 POST-DEPLOYMENT VERIFICATION

### From VPS (SSH terminal):

```bash
# 1. PM2 Status
pm2 list
pm2 describe turbo-bot

# 2. View Recent Logs
pm2 logs turbo-bot --lines 50

# 3. Check Health
curl localhost:3001/health

# 4. Check Status API
curl localhost:3001/api/status

# 5. Monitor Real-time
pm2 monit  # Press Ctrl+C to exit
```

### From Windows (Local PowerShell):

```powershell
# Health check
curl http://64.226.70.149:3001/health

# Status check
curl http://64.226.70.149:3001/api/status

# Process verification
Test-NetConnection 64.226.70.149 -Port 3001
```

---

## 🔍 48-HOUR MONITORING SETUP

### Option 1: PM2 Built-in Monitoring

```bash
# On VPS - Real-time monitoring UI
pm2 monit

# Shows:
# - CPU usage
# - Memory usage
# - Logs (live)
# - Process status
```

### Option 2: Automated Health Checks

Create monitoring script on VPS:

```bash
# Create monitoring script
cat > /opt/turbo-bot/monitor_48h.sh << 'EOF'
#!/bin/bash
# 48-hour monitoring script

START_TIME=$(date +%s)
END_TIME=$((START_TIME + 172800))  # 48 hours = 172800 seconds
LOG_FILE="/opt/turbo-bot/logs/monitoring_48h.log"

echo "[$(date)] Starting 48h monitoring..." | tee -a $LOG_FILE

while [ $(date +%s) -lt $END_TIME ]; do
    # Check PM2 status
    STATUS=$(pm2 jlist | jq -r '.[0].pm2_env.status')
    
    # Check health endpoint
    HEALTH=$(curl -s localhost:3001/health | jq -r '.status')
    
    # Log status
    echo "[$(date)] PM2: $STATUS | Health: $HEALTH" | tee -a $LOG_FILE
    
    # Alert if unhealthy
    if [ "$STATUS" != "online" ] || [ "$HEALTH" != "healthy" ]; then
        echo "[ALERT] Bot unhealthy! PM2: $STATUS, Health: $HEALTH" | tee -a $LOG_FILE
    fi
    
    # Sleep 15 minutes (900 seconds)
    sleep 900
done

echo "[$(date)] 48h monitoring completed" | tee -a $LOG_FILE
EOF

# Make executable
chmod +x /opt/turbo-bot/monitor_48h.sh

# Run in background with nohup
nohup /opt/turbo-bot/monitor_48h.sh > /opt/turbo-bot/logs/monitor_output.log 2>&1 &

# Get PID
echo $! > /opt/turbo-bot/monitor.pid
```

### Option 3: PM2 Plus (Cloud Monitoring - Optional)

```bash
# Link to PM2 Plus for web dashboard
pm2 plus

# Follow instructions to create account
# Access dashboard at: https://app.pm2.io
```

---

## 🎮 MANAGEMENT COMMANDS

### Essential Commands (Run on VPS via SSH)

```bash
# View Logs
pm2 logs turbo-bot              # Live logs
pm2 logs turbo-bot --lines 100  # Last 100 lines
pm2 logs turbo-bot --err        # Only errors

# Control
pm2 restart turbo-bot   # Restart bot
pm2 reload turbo-bot    # Zero-downtime reload
pm2 stop turbo-bot      # Stop bot
pm2 start turbo-bot     # Start bot

# Monitoring
pm2 monit               # Real-time UI
pm2 describe turbo-bot  # Detailed info
pm2 status              # Quick status

# Updates
cd /opt/turbo-bot
git pull origin master
npm install
pm2 reload turbo-bot
```

---

## ✅ CRITICAL TEST: Close VS Code

### After deployment is verified:

1. **Keep SSH terminal open** (to monitor)
2. **In SSH terminal, run:**
   ```bash
   pm2 logs turbo-bot
   ```
3. **On Windows: CLOSE VS Code completely**
4. **Wait 30 seconds**
5. **Check SSH terminal** - logs should still be flowing! ✅
6. **Run health check:**
   ```bash
   curl localhost:3001/health
   # Should return: {"status":"healthy",...}
   ```

**✅ If bot is still running after closing VS Code = SUCCESS!**

---

## 🚨 TROUBLESHOOTING

### Bot not starting

```bash
# Check PM2 logs
pm2 logs turbo-bot --err --lines 100

# Check system resources
free -h    # Memory
df -h      # Disk
top        # CPU

# Restart PM2
pm2 restart turbo-bot

# If still failing, check detailed logs
tail -100 /opt/turbo-bot/logs/pm2-error.log
```

### Port 3001 not accessible externally

```bash
# Check if port is listening
sudo netstat -tulpn | grep 3001

# Check firewall
sudo ufw status

# Allow port if needed
sudo ufw allow 3001/tcp
```

### High memory usage

```bash
# Check memory
free -h
pm2 monit

# Restart to clear memory
pm2 restart turbo-bot

# If persistent, reduce PM2 instances
nano /opt/turbo-bot/ecosystem.config.js
# Change: instances: 1
pm2 reload ecosystem.config.js
```

---

## 📈 EXPECTED BEHAVIOR (48 HOURS)

### First 2 Hours (WARMUP)
- ML confidence: 15-20%
- Minimal trading activity
- Learning market patterns
- **Logs:** "Learning Phase: WARMUP"

### Hours 2-24 (LEARNING)
- ML confidence: 20-50% (progressive)
- Increasing trade frequency
- Portfolio fluctuations normal
- **Logs:** "Learning Phase: LEARNING"

### Hours 24-48 (AUTONOMOUS)
- ML confidence: 55-65%
- Optimized autonomous decisions
- Consistent strategy execution
- **Logs:** "Learning Phase: AUTONOMOUS"

---

## 📝 POST-48H TASKS

### After 48 hours complete:

1. **Stop monitoring script:**
   ```bash
   # Get PID
   cat /opt/turbo-bot/monitor.pid
   
   # Kill process
   kill $(cat /opt/turbo-bot/monitor.pid)
   ```

2. **Generate performance report:**
   ```bash
   # View final logs
   pm2 logs turbo-bot --lines 500 > /opt/turbo-bot/final_report.log
   
   # Check final portfolio value
   curl localhost:3001/api/status
   ```

3. **Archive results:**
   ```bash
   mkdir -p /opt/turbo-bot/archive/48h_sim_$(date +%Y%m%d)
   cp -r /opt/turbo-bot/logs/* /opt/turbo-bot/archive/48h_sim_$(date +%Y%m%d)/
   ```

4. **Decision time:**
   - Keep running for longer?
   - Stop bot: `pm2 stop turbo-bot`
   - Review performance and adjust parameters

---

## 🎯 SUCCESS CRITERIA

- [x] SSH connection successful
- [ ] Bot deployed with PM2
- [ ] Health check returns "healthy"
- [ ] Logs show "Enterprise ML System v2.0.0 loaded successfully"
- [ ] Bot continues running after closing VS Code
- [ ] PM2 shows status "online"
- [ ] Auto-restart on crash enabled
- [ ] 48h monitoring active
- [ ] External health check accessible

---

## 📞 QUICK REFERENCE

| Action | Command |
|--------|---------|
| **Connect to VPS** | `ssh root@64.226.70.149` |
| **Check bot status** | `pm2 list` |
| **View logs** | `pm2 logs turbo-bot` |
| **Restart bot** | `pm2 restart turbo-bot` |
| **Health check** | `curl localhost:3001/health` |
| **Monitor UI** | `pm2 monit` |
| **Update code** | `cd /opt/turbo-bot && git pull && pm2 reload turbo-bot` |

---

## ⏭️ NEXT STEPS

1. ✅ **Execute deployment** (Option A script - 5 minutes)
2. ✅ **Verify bot running** (pm2 list, logs, health check)
3. ✅ **Setup monitoring** (48h script or PM2 monit)
4. ✅ **Test VS Code close** (bot should continue)
5. ✅ **Monitor for 48h** (check periodically via SSH)
6. ✅ **Review results** (after 48h completion)

---

**🚀 Ready to deploy! Follow Option A instructions above to begin.**

**⚡ Estimated time: 5-10 minutes**  
**🎯 Result: True 24/7 autonomous bot independent of VS Code!**

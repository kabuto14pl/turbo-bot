# 🚀 VPS BOT - QUICK COMMAND CARD

**Server:** 64.226.70.149 | **User:** root | **Port:** 22

---

## ⚡ ESSENTIAL COMMANDS

### Connect to VPS
```bash
ssh root@64.226.70.149
```

### Bot Status
```bash
pm2 list                    # Quick status
pm2 describe turbo-bot      # Detailed info
pm2 monit                   # Real-time UI (Ctrl+C to exit)
```

### View Logs
```bash
pm2 logs turbo-bot                 # Live logs
pm2 logs turbo-bot --lines 50      # Last 50 lines
pm2 logs turbo-bot --err           # Only errors
tail -f /opt/turbo-bot/logs/pm2-out.log  # Raw log file
```

### Control Bot
```bash
pm2 restart turbo-bot       # Restart
pm2 reload turbo-bot        # Zero-downtime reload
pm2 stop turbo-bot          # Stop
pm2 start turbo-bot         # Start (if stopped)
```

### Health Checks
```bash
curl localhost:3001/health        # Health endpoint
curl localhost:3001/api/status    # Full status
```

### Update Code
```bash
cd /opt/turbo-bot
git pull origin master
npm install
pm2 reload turbo-bot
```

---

## 📊 MONITORING

### Check System Resources
```bash
free -h         # Memory
df -h           # Disk space
top             # CPU (press 'q' to quit)
uptime          # System uptime
```

### Bot Performance
```bash
# Portfolio value (from logs)
pm2 logs turbo-bot --lines 100 | grep "Portfolio"

# Trade count (from logs)
pm2 logs turbo-bot --lines 100 | grep "Trades"

# ML phase (from logs)
pm2 logs turbo-bot --lines 100 | grep "Phase"
```

---

## 🔍 TROUBLESHOOTING

### If bot not working
```bash
pm2 logs turbo-bot --err --lines 100   # Check errors
pm2 restart turbo-bot                  # Try restart
systemctl status pm2-root              # Check PM2 service
```

### If high memory
```bash
pm2 restart turbo-bot                  # Clear memory
nano /opt/turbo-bot/ecosystem.config.js  # Reduce instances
# Change: instances: 1
pm2 reload ecosystem.config.js
```

### If port not accessible
```bash
sudo netstat -tulpn | grep 3001        # Check if listening
sudo ufw status                        # Check firewall
sudo ufw allow 3001/tcp                # Open port
```

---

## 📁 FILE LOCATIONS

| What | Where |
|------|-------|
| **App directory** | `/opt/turbo-bot/` |
| **Logs** | `/opt/turbo-bot/logs/` |
| **Config** | `/opt/turbo-bot/.env` |
| **PM2 config** | `/opt/turbo-bot/ecosystem.config.js` |

---

## 🎯 COMMON TASKS

### View last 48h activity
```bash
cd /opt/turbo-bot/logs
tail -500 pm2-out.log | grep -E "Portfolio|Trades|Health"
```

### Check uptime
```bash
pm2 describe turbo-bot | grep uptime
```

### Reset & restart
```bash
pm2 reset turbo-bot     # Reset counters
pm2 restart turbo-bot   # Fresh start
```

### Backup logs
```bash
mkdir -p /opt/turbo-bot/archive/$(date +%Y%m%d)
cp /opt/turbo-bot/logs/*.log /opt/turbo-bot/archive/$(date +%Y%m%d)/
```

---

## 🌐 FROM WINDOWS (Local Machine)

### Health check
```powershell
curl http://64.226.70.149:3001/health
curl http://64.226.70.149:3001/api/status
```

### Copy logs to local
```powershell
scp root@64.226.70.149:/opt/turbo-bot/logs/*.log C:\Users\dudzi\Downloads\
```

### Remote monitoring
```powershell
# SSH and auto-show logs
ssh root@64.226.70.149 "pm2 logs turbo-bot --lines 30"
```

---

## 🚨 EMERGENCY

### Bot crashed and won't restart
```bash
pm2 kill                              # Kill PM2
cd /opt/turbo-bot
pm2 start ecosystem.config.js --env production
pm2 save
```

### Complete reset
```bash
cd /opt/turbo-bot
git reset --hard origin/master        # Reset code
npm install                            # Reinstall deps
pm2 restart turbo-bot                 # Restart
```

### Check if bot process exists
```bash
ps aux | grep node
pgrep -a node
```

---

## ⏰ SCHEDULED TASKS

### Daily log rotation (optional)
```bash
# Add to crontab
crontab -e

# Add line:
0 0 * * * /opt/turbo-bot/scripts/rotate_logs.sh
```

### Weekly health report (optional)
```bash
0 0 * * 0 pm2 logs turbo-bot --lines 1000 > /opt/turbo-bot/reports/weekly_$(date +\%Y\%m\%d).log
```

---

## 📞 QUICK VERIFICATION

### Is bot running?
```bash
pm2 list | grep turbo-bot
# Should show: online
```

### Is it healthy?
```bash
curl -s localhost:3001/health | grep healthy
# Should output: "status":"healthy"
```

### Any errors?
```bash
pm2 logs turbo-bot --err --lines 10
# Should be empty or minor warnings only
```

---

## 💡 PRO TIPS

1. **Always use `pm2 save` after changes** - preserves state
2. **`pm2 monit` for real-time monitoring** - best UI
3. **Check logs periodically** - `pm2 logs turbo-bot`
4. **Use `pm2 reload` instead of `restart`** - zero downtime
5. **Backup `.env` file** - contains configuration
6. **Test health endpoint** - quick verification
7. **Monitor memory usage** - restart if >500MB
8. **Keep logs under control** - rotate regularly

---

## 🔗 USEFUL LINKS

- Full Guide: [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md)
- Execution: [VPS_DEPLOYMENT_EXECUTION.md](VPS_DEPLOYMENT_EXECUTION.md)
- Verification: [VPS_VERIFICATION_CHECKLIST.md](VPS_VERIFICATION_CHECKLIST.md)
- GitHub: https://github.com/kabuto14pl/turbo-bot

---

**📌 BOOKMARK THIS FILE FOR QUICK REFERENCE!**

**Server IP:** 64.226.70.149  
**Health Check:** http://64.226.70.149:3001/health  
**SSH Command:** `ssh root@64.226.70.149`  
**Bot Status:** `pm2 list`  
**View Logs:** `pm2 logs turbo-bot`

---

*Last Updated: 2026-02-10*

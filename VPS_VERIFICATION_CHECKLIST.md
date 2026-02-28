# ✅ VPS DEPLOYMENT - VERIFICATION CHECKLIST

**Po zakończeniu deployment, sprawdź każdy punkt:**

---

## 🔍 PODSTAWOWA WERYFIKACJA

### 1. PM2 Status
```bash
pm2 list
```

**Oczekiwany output:**
```
┌─────┬──────────────┬─────────┬─────────┬──────────┬─────────┐
│ id  │ name         │ mode    │ status  │ cpu     │ memory   │
├─────┼──────────────┼─────────┼─────────┼─────────┼──────────┤
│ 0   │ turbo-bot    │ cluster │ online  │ 0%      │ 120 MB   │
│ 1   │ turbo-bot    │ cluster │ online  │ 0%      │ 110 MB   │
└─────┴──────────────┴─────────┴─────────┴─────────┴──────────┘
```

✅ **Status = "online"** (może być 1 lub 2 instancje w cluster mode)  
❌ **Status = "errored" lub "stopped"** - zobacz troubleshooting

---

### 2. View Logs
```bash
pm2 logs turbo-bot --lines 30
```

**Szukaj w logach:**
- ✅ `🚀 Enterprise ML System v2.0.0 loaded successfully!`
- ✅ `ℹ️ Redis disabled (MODE=simulation, REDIS_ENABLED=false)`
- ✅ `✅ Enterprise ML System fully operational`
- ✅ `🏗️ Initializing Enterprise ML System...`
- ✅ `📊 Health: healthy`

**NIE powinno być:**
- ❌ `Error: Cannot find module`
- ❌ `ECONNREFUSED` (Redis errors - są OK tylko jeśli mamy "Redis disabled")
- ❌ `Segmentation fault`
- ❌ Ciągłe restarty

---

### 3. Health Check (Local)
```bash
curl http://localhost:3001/health
```

**Oczekiwany output:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-10T...",
  "uptime": 123,
  "mode": "simulation"
}
```

✅ **"status": "healthy"**  
❌ **Brak odpowiedzi** - bot może nie działać lub port zamknięty

---

### 4. Status API
```bash
curl http://localhost:3001/api/status
```

**Oczekiwany output:**
```json
{
  "health": "healthy",
  "portfolio": 10000.00,
  "trades": 0,
  "ml_system": "operational",
  "phase": "WARMUP"
}
```

---

### 5. External Access Test

**From Windows PowerShell (local machine):**
```powershell
curl http://64.226.70.149:3001/health
```

**Jeśli to działa** ✅ - bot jest dostępny z zewnątrz  
**Jeśli to nie działa** ⚠️ - firewall może blokować port 3001 (to OK, bot działa lokalnie na VPS)

---

## 🎮 ADVANCED VERIFICATION

### 6. PM2 Monitoring UI
```bash
pm2 monit
```

**Co sprawdzić:**
- CPU: powinno być <10% większość czasu
- Memory: ~100-200 MB stabilne
- Logs: powinny się aktualizować co ~15-30 sekund

**Exit:** Ctrl+C

---

### 7. Check System Resources
```bash
# Memory
free -h

# Disk space
df -h

# CPU load
top
# Press 'q' to quit
```

**Recommended:**
- Free memory: >500 MB
- Free disk: >1 GB
- CPU load: <2.0

---

### 8. Verify Auto-Restart Setup
```bash
# Check if PM2 will start on reboot
pm2 startup

# Check saved process list
pm2 save
pm2 list  # Should show turbo-bot
```

---

### 9. Test Process Recovery
```bash
# Kill bot process (PM2 should auto-restart)
pm2 stop turbo-bot

# Wait 5 seconds
sleep 5

# Start again
pm2 start turbo-bot

# Or let PM2 auto-restart (if autorestart: true in config)
pm2 list  # Should show "online" again
```

---

### 10. Check Log Files
```bash
# List log files
ls -lh /opt/turbo-bot/logs/

# View PM2 output log
tail -50 /opt/turbo-bot/logs/pm2-out.log

# View PM2 error log
tail -50 /opt/turbo-bot/logs/pm2-error.log
```

---

## 🔥 CRITICAL TEST: VS Code Independence

### **THE ULTIMATE TEST:**

1. **Keep SSH terminal open** with logs:
   ```bash
   pm2 logs turbo-bot
   ```

2. **On Windows: CLOSE VS Code COMPLETELY**

3. **Wait 30 seconds**

4. **Check SSH terminal** - logs should STILL be flowing! ✅

5. **Run health check:**
   ```bash
   curl localhost:3001/health
   ```

6. **Check PM2 status:**
   ```bash
   pm2 list
   # Should still show: online
   ```

**✅ SUCCESS:** Bot continues running after VS Code closed!  
**❌ FAILED:** Bot stopped - check PM2 logs for errors

---

## 📊 EXPECTED BEHAVIOR TIMELINE

### First 5 Minutes
- [x] Bot starts successfully
- [x] Enterprise ML System loads
- [x] Redis disabled message (simulation mode)
- [x] Health check returns "healthy"
- [x] No critical errors in logs

### First Hour
- [x] ML system in WARMUP phase
- [x] Portfolio: ~$10,000 (± small fluctuations)
- [x] Trades: 0-5 (minimal activity)
- [x] Logs show periodic activity (every 15-30s)

### After 24H
- [x] ML phase: LEARNING
- [x] Portfolio: Variable (learning patterns)
- [x] Trades: 10-50 (increasing activity)
- [x] No crashes or restarts

### After 48H
- [x] ML phase: AUTONOMOUS
- [x] Portfolio: Tracked throughout
- [x] Trades: 50-200+ (optimized decisions)
- [x] Bot ran continuously without interruption

---

## 🚨 TROUBLESHOOTING QUICK GUIDE

### ❌ PM2 Status = "errored"
```bash
pm2 logs turbo-bot --err --lines 50
# Check error messages
pm2 restart turbo-bot
```

### ❌ Health check returns nothing
```bash
# Check if process is listening on port
sudo netstat -tulpn | grep 3001

# Check firewall
sudo ufw status

# Restart bot
pm2 restart turbo-bot
```

### ❌ High memory usage (>500MB)
```bash
# Restart bot
pm2 restart turbo-bot

# Reduce instances to 1
nano /opt/turbo-bot/ecosystem.config.js
# Change: instances: 1
pm2 reload ecosystem.config.js
```

### ❌ "Cannot find module" errors
```bash
# Reinstall dependencies
cd /opt/turbo-bot
npm install
pm2 restart turbo-bot
```

### ❌ Bot keeps restarting
```bash
# Check logs for crash reason
pm2 logs turbo-bot --err --lines 100

# Check if max_restarts exceeded
pm2 describe turbo-bot

# Reset restart count
pm2 reset turbo-bot
```

---

## ✅ FINAL CHECKLIST

Before declaring deployment successful:

- [ ] `pm2 list` shows "online"
- [ ] `pm2 logs` shows no errors
- [ ] `curl localhost:3001/health` returns `{"status":"healthy"}`
- [ ] Logs show "Enterprise ML System v2.0.0 loaded successfully"
- [ ] No Redis connection errors (or "Redis disabled" message OK)
- [ ] External health check works: `curl http://64.226.70.149:3001/health`
- [ ] Bot survived VS Code closing test
- [ ] `pm2 save` executed (persistence)
- [ ] `pm2 startup` configured (auto-start)
- [ ] 48h monitoring setup (optional but recommended)

---

## 📞 GET HELP

If verification fails:

1. **Check detailed logs:**
   ```bash
   pm2 logs turbo-bot --lines 200 > deployment_logs.txt
   cat deployment_logs.txt
   ```

2. **Check complete status:**
   ```bash
   pm2 describe turbo-bot
   ```

3. **System health:**
   ```bash
   free -h; df -h; uptime
   ```

4. **Review documentation:**
   - [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md)
   - [VPS_DEPLOYMENT_EXECUTION.md](VPS_DEPLOYMENT_EXECUTION.md)

---

## 🎯 NEXT STEPS AFTER VERIFICATION

Once all checks pass:

1. ✅ **Set up monitoring** (see VPS_DEPLOYMENT_EXECUTION.md)
2. ✅ **Close VS Code** - bot runs independently
3. ✅ **Monitor periodically** via SSH
4. ✅ **Check after 24h** - verify still running
5. ✅ **Review after 48h** - analyze performance

---

**✨ If all checks pass - CONGRATULATIONS! Bot is now running 24/7 on VPS! ✨**

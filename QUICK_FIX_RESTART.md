# ⚡ ULTRA QUICK FIX - BOT RESTART (1 KOMENDA)

**SKOPIUJ I WKLEJ W SSH TERMINAL:**

```bash
cd /opt/turbo-bot && pm2 restart turbo-bot && sleep 5 && pm2 list && echo -e "\n✅ VERIFICATION:" && pm2 logs turbo-bot --lines 20
```

**Jeśli /opt/turbo-bot nie istnieje, spróbuj:**

```bash
cd /root/turbo-bot && pm2 restart turbo-bot && sleep 5 && pm2 list && echo -e "\n✅ VERIFICATION:" && pm2 logs turbo-bot --lines 20
```

---

## ✅ CO POWINNO SIĘ STAĆ:

1. **Przejdzie do katalogu bota**
2. **Uruchomi bota** (pm2 restart)
3. **Poczeka 5 sekund** (dać czas na start)
4. **Pokaże status** (pm2 list) - powinno być "online" ✅
5. **Pokaże logi** (ostatnie 20 linii)

---

## 🔍 SZUKAJ W LOGACH:

- ✅ `🚀 Enterprise ML System v2.0.0 loaded successfully!`
- ✅ `ℹ️ Redis disabled (MODE=simulation)`
- ✅ `✅ Enterprise ML System fully operational`
- ✅ `🔄 Starting trading cycle...`

---

## ⚠️ JEŚLI NIE DZIAŁA:

### Sprawdź gdzie jest bot:

```bash
# Pokaż PM2 config
pm2 describe turbo-bot

# Znajdź katalog
find / -name "ecosystem.config.js" 2>/dev/null
```

### Full restart sequence:

```bash
# 1. Find correct directory (one of these will work)
cd /opt/turbo-bot || cd /root/turbo-bot || cd ~/turbo-bot

# 2. Check what you have
ls -la

# 3. Pull latest code
git pull origin master

# 4. Install deps
npm install

# 5. Restart bot
pm2 restart turbo-bot

# 6. Check status
pm2 list

# 7. Check logs
pm2 logs turbo-bot --lines 30

# 8. Health check
curl localhost:3001/health
```

---

## 🎯 ALTERNATIVE: Fresh Start

**Jeśli restart nie działa, usuń i utwórz na nowo:**

```bash
# Stop and delete
pm2 delete turbo-bot

# Start with ecosystem config
cd /opt/turbo-bot  # or wherever bot is located
pm2 start ecosystem.config.js --env production

# Save
pm2 save

# Verify
pm2 list
pm2 logs turbo-bot --lines 30
```

---

## 📊 HEALTH CHECK

```bash
# Once bot shows "online" in pm2 list:
curl localhost:3001/health

# Expected:
# {"status":"healthy","timestamp":"2026-02-10T...","uptime":123,"mode":"simulation"}
```

---

## ✅ SUCCESS CRITERIA

- [ ] `pm2 list` shows: **turbo-bot | online**
- [ ] Logs show: **"Enterprise ML System v2.0.0 loaded successfully"**
- [ ] No critical errors in logs
- [ ] `curl localhost:3001/health` returns: **{"status":"healthy"}**
- [ ] Bot runs for 5+ minutes without crashing

---

## 🚀 WHEN WORKING

**Once verified bot is running:**

1. **Leave SSH terminal open** with logs:
   ```bash
   pm2 logs turbo-bot
   ```

2. **On Windows: CLOSE VS Code**

3. **Check SSH terminal** - logs still flowing? ✅ **SUCCESS!**

4. **Bot runs 24/7 independently!** 🎉

---

**⏱️ Time: ~2 minutes**  
**🎯 Result: Bot running 24/7 for 48h+!**  
**✨ VS Code independence achieved!**

# 🚀 VPS BOT RESTART GUIDE - QUICK FIX

**Sytuacja:** Bot już jest zainstalowany na VPS, ale zatrzymany (status: stopped)  
**Rozwiązanie:** Uruchom bota używając poniższych komend

---

## ⚡ WYKONAJ TE KOMENDY W SSH TERMINAL

**⚠️ UWAGA: Wykonuj te komendy w SSH terminal (nie w lokalnym PowerShell!)**

### 1️⃣ Sprawdź gdzie jest bot

```bash
# Sprawdź current directory
pwd

# Sprawdź co jest w PM2
pm2 describe turbo-bot

# Znajdź katalog z botem
find /opt -name "autonomous_trading_bot*" -type f 2>/dev/null
find /root -name "turbo-bot" -type d 2>/dev/null
ls -la /opt/ | grep turbo
ls -la /root/ | grep turbo
```

### 2️⃣ Przejdź do katalogu bota

```bash
# Najprawdopodobniej jeden z tych:
cd /opt/turbo-bot
# LUB
cd /root/turbo-bot
# LUB
cd ~/turbo-bot

# Sprawdź czy to dobry katalog
ls -la
# Powinno pokazać: package.json, trading-bot/, ecosystem.config.js
```

### 3️⃣ Zaktualizuj kod (jeśli potrzebne)

```bash
# Pull latest changes
git status
git pull origin master

# Zainstaluj dependencies (jeśli były zmiany)
npm install
```

### 4️⃣ Sprawdź konfigurację

```bash
# Sprawdź .env file
cat .env

# Powinno zawierać:
# MODE=simulation
# ML_ENABLED=true
# REDIS_ENABLED=false

# Jeśli nie ma .env, stwórz:
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
```

### 5️⃣ Uruchom bota

```bash
# Sprawdź obecny status
pm2 list

# Restart bota (preferowane - zachowuje konfigurację)
pm2 restart turbo-bot

# LUB jeśli restart nie działa, start:
pm2 start turbo-bot

# LUB użyj ecosystem config:
pm2 start ecosystem.config.js --env production

# Zapisz stan PM2 (auto-start on reboot)
pm2 save
```

### 6️⃣ Weryfikacja

```bash
# Sprawdź status
pm2 list
# Powinno pokazać: turbo-bot | online ✅

# Zobacz logi
pm2 logs turbo-bot --lines 50

# Szukaj w logach:
# ✅ "Enterprise ML System v2.0.0 loaded successfully"
# ✅ "Redis disabled (MODE=simulation)"
# ✅ "Trading cycle..."

# Health check
curl http://localhost:3001/health
# Powinno zwrócić: {"status":"healthy"}

# Status API
curl http://localhost:3001/api/status
```

### 7️⃣ Monitoring

```bash
# Real-time monitoring (Ctrl+C aby wyjść)
pm2 monit

# Lub live logs
pm2 logs turbo-bot
```

---

## 🚨 TROUBLESHOOTING

### Jeśli bot nie startuje

```bash
# Sprawdź błędy
pm2 logs turbo-bot --err --lines 100

# Usuń i utwórz na nowo
pm2 delete turbo-bot
pm2 start ecosystem.config.js --env production
pm2 save
```

### Jeśli brakuje TensorFlow fix

```bash
# Sprawdź czy TensorFlow import jest zakomentowany
grep -n "tfjs-node" trading-bot/src/core/ml/enterprise_tensorflow_manager.ts

# Jeśli NIE jest zakomentowany (line 12):
sed -i '12s/^/\/\/ /' trading-bot/src/core/ml/enterprise_tensorflow_manager.ts

# Weryfikuj
grep -n "tfjs-node" trading-bot/src/core/ml/enterprise_tensorflow_manager.ts
# Powinno pokazać zakomentowaną linię: // import '@tensorflow/tfjs-node';
```

### Jeśli port 3001 nie działa

```bash
# Sprawdź co nasłuchuje na porcie
sudo netstat -tulpn | grep 3001

# Check firewall
sudo ufw status

# Otwórz port jeśli zamknięty
sudo ufw allow 3001/tcp
```

---

## ✅ EXPECTED RESULTS

Po wykonaniu kroków 1-7:

- [x] `pm2 list` pokazuje: **turbo-bot | online**
- [x] `pm2 logs` pokazuje trading activity, no critical errors
- [x] `curl localhost:3001/health` zwraca: **{"status":"healthy"}**
- [x] Bot działa przez 10+ minut bez crashu
- [x] Logs pokazują: "Enterprise ML System loaded successfully"

---

## 💡 QUICK COMMANDS SUMMARY

```bash
# 1. Znajdź bota i przejdź do katalogu
cd /opt/turbo-bot  # lub cd /root/turbo-bot

# 2. Update kodu (optional)
git pull origin master

# 3. Restart bota
pm2 restart turbo-bot

# 4. Sprawdź status
pm2 list

# 5. Zobacz logi
pm2 logs turbo-bot --lines 30

# 6. Health check
curl localhost:3001/health

# 7. Monitoring
pm2 monit
```

---

## 🎯 JEŚLI WSZYSTKO DZIAŁA

**Po weryfikacji że bot działa (`pm2 list` pokazuje "online"):**

1. **Zostaw SSH terminal z logami:**
   ```bash
   pm2 logs turbo-bot
   ```

2. **Na Windows: ZAMKNIJ VS Code kompletnie**

3. **Sprawdź SSH terminal - logi nadal płyną?** ✅ **SUCCESS!**

4. **Bot działa 24/7 niezależnie od VS Code!** 🎉

---

## 📞 JEŚLI POTRZEBUJESZ FULL RE-DEPLOYMENT

Jeśli powyższe kroki nie działają i chcesz zacząć od nowa:

```bash
# 1. Zatrzymaj i usuń obecnego bota
pm2 delete turbo-bot

# 2. Usuń stary katalog (UWAGA: backup jeśli masz ważne logi!)
cd /opt
mv turbo-bot turbo-bot_backup_$(date +%Y%m%d)

# 3. Fresh clone
git clone https://github.com/kabuto14pl/turbo-bot.git turbo-bot
cd turbo-bot

# 4. Install dependencies
npm install
npm uninstall @tensorflow/tfjs-node

# 5. Fix TensorFlow import
sed -i '12s/^/\/\/ /' trading-bot/src/core/ml/enterprise_tensorflow_manager.ts

# 6. Create .env
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

# 7. Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 8. Verify
pm2 list
pm2 logs turbo-bot --lines 30
curl localhost:3001/health
```

---

**🚀 Wykonaj kroki 1-7 powyżej w SSH terminal aby uruchomić bota!**

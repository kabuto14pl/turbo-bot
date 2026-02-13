# 🚀 Quick Start - Bot + Dashboard 24/7

## ⚡ 30-Minutowy Setup na VPS

### KROK 1: Załóż VPS (5 min)

**Rekomendacja: DigitalOcean**
1. Idź na: https://www.digitalocean.com
2. Sign up (mają $200 credit!)
3. Create Droplet:
   - **OS**: Ubuntu 22.04 LTS
   - **Plan**: Basic $6/miesiąc (1GB RAM)
   - **Datacenter**: Wybierz najbliższy
   - **Authentication**: SSH key lub Password
4. Skopiuj IP adres VPS

---

### KROK 2: Połącz się przez SSH (1 min)

```bash
# Z terminala lokalnego:
ssh root@YOUR_VPS_IP

# Wpisz hasło (jeśli wybrałeś password auth)
```

---

### KROK 3: Uruchom Deployment Script (15 min)

```bash
# W terminalu VPS, wklej tę komendę:
curl -fsSL https://raw.githubusercontent.com/kabuto14pl/turbo-bot/master/deploy_v4.1.3.sh | bash
```

**Co się zainstaluje:**
- ✅ Node.js 20
- ✅ PM2 process manager
- ✅ Bot Trading
- ✅ Dashboard
- ✅ Health checks (co 5 min)
- ✅ Firewall config
- ✅ Auto-restart on crash/reboot

---

### KROK 4: Skonfiguruj API Keys (5 min)

```bash
# Edytuj .env
cd turbo-bot
nano .env

# Zmień te linie:
API_KEY=your_real_okx_api_key
SECRET=your_real_okx_secret
PASSPHRASE=your_real_okx_passphrase

# Dla symulacji zostaw:
MODE=simulation
ENABLE_REAL_TRADING=false

# Dla live trading:
# MODE=live
# ENABLE_REAL_TRADING=true

# Zapisz: Ctrl+O, Enter, Ctrl+X
```

---

### KROK 5: Restart i Sprawdź (2 min)

```bash
# Restart bot
pm2 restart all

# Sprawdź status
pm2 status

# Sprawdź logi
pm2 logs turbo-bot --lines 20

# Test health
curl http://localhost:3001/health
```

---

### KROK 6: Otwórz Dashboard (2 min)

**W przeglądarce otwórz:**

```
http://YOUR_VPS_IP:8080
```

**Powinien pokazać:**
- 📊 Trading Dashboard
- 💰 Portfolio Value
- 📈 Recent Trades
- 🌐 WebSocket Status
- 🧠 ML Status

---

## 🎯 GOTOWE! Bot działa 24/7

### 🌐 Twoje URL-e:

```
Dashboard:        http://YOUR_VPS_IP:8080
Bot Health:       http://YOUR_VPS_IP:3001/health
WebSocket Status: http://YOUR_VPS_IP:3001/api/websocket/okx
API Endpoints:    http://YOUR_VPS_IP:3001/api/*
```

---

## 📊 Codzienne Monitorowanie

```bash
# SSH do VPS
ssh root@YOUR_VPS_IP

# Check status
pm2 status

# View logs
pm2 logs turbo-bot --lines 50

# Restart if needed
pm2 restart turbo-bot

# Update bot
cd turbo-bot
git pull
npm install
pm2 restart all
```

---

## 🔒 Bezpieczeństwo

**Deployment script automatycznie:**
- ✅ Konfiguruje firewall (tylko porty 22, 3001, 8080, 9090)
- ✅ PM2 auto-restart przy crash
- ✅ Health checks co 5 min
- ✅ Auto-start przy reboot serwera

**Dodatkowe zabezpieczenia (opcjonalne):**

```bash
# Zmień SSH port (zamiast 22)
nano /etc/ssh/sshd_config
# Zmień: Port 2222
systemctl restart sshd
ufw allow 2222/tcp

# Wyłącz root login
nano /etc/ssh/sshd_config
# Ustaw: PermitRootLogin no

# Utwórz sudo user
adduser trader
usermod -aG sudo trader

# Fail2Ban (auto-ban brute force)
apt-get install fail2ban -y
systemctl enable fail2ban
```

---

## 💰 Koszt Miesięczny

| Pozycja | Koszt |
|---------|-------|
| VPS (DigitalOcean Basic) | $6/miesiąc |
| **TOTAL** | **$6/miesiąc** |

**Z $200 credit = 33 miesiące za darmo!**

---

## 🚨 Troubleshooting

### Bot nie startuje:

```bash
pm2 logs turbo-bot --err --lines 50
```

### Dashboard nie ładuje się:

```bash
# Check if port 8080 is listening
netstat -tlnp | grep 8080

# Restart dashboard
pm2 restart dashboard
```

### WebSocket nie działa:

```bash
curl http://localhost:3001/api/websocket/okx
# Powinien zwrócić JSON z status
```

### Update bota:

```bash
cd turbo-bot
git pull
npm install
pm2 restart all
```

---

## 📈 Przejście na Live Trading

**Po przetestowaniu w simulation (minimum 72h):**

```bash
# 1. Edit .env
nano .env

# 2. Zmień:
MODE=live
ENABLE_REAL_TRADING=true

# 3. Restart
pm2 restart all

# 4. Monitor BARDZO blisko przez pierwsze 24h
pm2 logs turbo-bot --lines 100

# 5. Sprawdź pierwsze transakcje na OKX
```

**⚠️ UWAGA: Zacznij od małego kapitału! (np. $100)**

---

## ✅ Checklist Przed Live Trading

- [ ] Bot działa stabilnie w simulation 72+ godzin
- [ ] Win rate >40%
- [ ] Max drawdown <15%
- [ ] Sharpe ratio >0.8
- [ ] WebSocket stable (0 reconnects)
- [ ] Health checks passing
- [ ] OKX API keys LIVE (nie demo)
- [ ] Sprawdzone logi - brak errors
- [ ] Backup strategy ready
- [ ] Emergency stop plan

---

## 🎉 Gratulacje!

**Masz teraz:**
- ✅ Trading bot 24/7
- ✅ Real-time dashboard
- ✅ WebSocket market data
- ✅ ML predictions
- ✅ Auto-restart & monitoring
- ✅ Production-ready deployment

**Next: Week 2 - Advanced Features!**

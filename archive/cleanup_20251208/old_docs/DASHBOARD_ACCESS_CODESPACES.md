# 🖥️ DASHBOARD ACCESS GUIDE - GitHub Codespaces

**Status:** ✅ DASHBOARD READY  
**Date:** 2025-12-02  
**Bot:** Running (PID 14735)  
**Dashboard Server:** Port 8080

---

## 🌐 JAK OTWORZYĆ DASHBOARD W PRZEGLĄDARCE

### **GitHub Codespaces - 3 METODY:**

#### **METODA 1: PORTS Tab (NAJŁATWIEJSZA)**

1. W VS Code kliknij zakładkę **"PORTS"** (na dole, obok Terminal)
2. Znajdź port **8080**
3. Kliknij prawym przyciskiem → **"Open in Browser"**
4. Dashboard otworzy się w nowej karcie!

#### **METODA 2: Port Forwarding URL**

1. W zakładce **PORTS** znajdź port **8080**
2. Skopiuj **"Forwarded Address"** (coś jak: `https://fuzzy-space-pancake-xxxx.github.dev`)
3. W przeglądarce dodaj `/dashboard.html`
4. Pełny URL: `https://twoj-codespace.github.dev/dashboard.html`

#### **METODA 3: Terminal Command**

```bash
# Zobacz forwarded URL
gh codespace ports

# Lub użyj VS Code command palette (Ctrl+Shift+P)
# Wpisz: "Ports: Focus on Ports View"
```

---

## 📊 CO ZOBACZYSZ NA DASHBOARDZIE

### **Real-time Metrics:**

```
🤖 BOT STATUS
   ✅ Status: HEALTHY
   ⏱️  Uptime: 15+ minutes
   🌐 Mode: PAPER_TRADING
   
💰 PORTFOLIO
   📈 Total Value: $10,000.00
   💵 Realized P&L: $0.00
   📊 Total Trades: 0
   🎯 Win Rate: 0%
   
🌐 LIVE MARKET
   BTC-USDT: $86,972.30 (OKX real-time)
   
🛑 CIRCUIT BREAKER
   Status: ✅ OPERATIONAL
   Consecutive Losses: 0/5
   
🧠 ML SYSTEM
   Phase: WARMUP
   Confidence: 15%
   Trades: 0
```

### **Auto-Refresh:**
- Dashboard odświeża się **co 5 sekund** automatycznie
- Live data z OKX API
- Real-time portfolio updates

---

## 🔧 TROUBLESHOOTING

### **Problem: "Port 8080 not found"**

```bash
# Restart dashboard server
./launch_dashboard.sh
```

### **Problem: "Dashboard shows no data"**

```bash
# Check if bot is running
ps aux | grep autonomous_trading_bot

# Check API endpoint
curl http://localhost:3001/health

# If bot stopped, restart:
./test_paper_trading.sh
```

### **Problem: "Connection refused"**

1. Sprawdź czy porty są forwarded:
   - VS Code → PORTS tab
   - Port 8080 powinien być **Public** lub **Private**
2. Restart port forwarding:
   ```bash
   # Kill HTTP server
   kill $(cat dashboard_http.pid)
   
   # Restart
   ./launch_dashboard.sh
   ```

---

## 📱 ALTERNATIVE MONITORING (bez przeglądarki)

Jeśli dashboard nie działa, użyj terminal monitoring:

```bash
# Auto-refresh terminal dashboard
./watch_paper_trading.sh

# Single check
./quick_check.sh

# API curl commands
curl http://localhost:3001/health | jq '.'
curl http://localhost:3001/api/portfolio | jq '.'
```

---

## 🎯 DASHBOARD FEATURES

### **1. Health Monitoring**
- Bot status (healthy/unhealthy)
- Component status (strategies, ML, risk manager)
- Uptime tracking
- Version info

### **2. Portfolio Tracking**
- Total value (real-time)
- Realized/Unrealized P&L
- Trade count & win rate
- Drawdown metrics
- Sharpe ratio

### **3. Live Market Data**
- BTC-USDT price (OKX)
- Volume tracking
- Price updates every 10-30s

### **4. Trading Signals**
- Recent signals (BUY/SELL/HOLD)
- Confidence levels
- Strategy attribution
- Signal timing

### **5. Circuit Breaker**
- Status (operational/tripped)
- Consecutive losses tracker
- Trip count history
- Manual reset option

### **6. ML System**
- Learning phase (WARMUP/LEARNING/AUTONOMOUS)
- Confidence threshold
- Trading count
- Exploration rate

---

## 🚀 QUICK START CHECKLIST

- [x] ✅ Bot running (PID 14735)
- [x] ✅ Health endpoint responding (port 3001)
- [x] ✅ Dashboard server running (port 8080)
- [ ] 🔲 Open PORTS tab in VS Code
- [ ] 🔲 Forward port 8080
- [ ] 🔲 Click "Open in Browser"
- [ ] 🔲 Verify dashboard loads
- [ ] 🔲 Check auto-refresh working
- [ ] 🔲 Monitor for 1-2 hours

---

## 📞 NEED HELP?

### **Check Services Status:**
```bash
# Bot status
ps aux | grep autonomous_trading_bot_final

# Dashboard HTTP server
lsof -i :8080

# API endpoint
curl http://localhost:3001/health
```

### **Restart Everything:**
```bash
# Stop all
kill $(cat bot_paper_trading.pid)
kill $(cat dashboard_http.pid)

# Restart bot
./test_paper_trading.sh

# Restart dashboard
./launch_dashboard.sh
```

---

## 📊 EXPECTED BEHAVIOR

### **After 1 Hour:**
- Live BTC price updating
- 5-10 trading cycles completed
- Possibly 1-2 trades (if signals generated)
- Win rate starting to form

### **After 6 Hours:**
- 10-15 trades
- Win rate >50% (hopefully!)
- P&L trending positive
- ML confidence increasing

### **After 24-48 Hours:**
- 20+ trades
- Win rate >55%
- Consistent profitability
- Ready for live trading decision

---

**🖥️  DASHBOARD IS READY!**

**NEXT STEP:** Go to VS Code PORTS tab → Port 8080 → Open in Browser

---

**Last Updated:** 2025-12-02 06:40 UTC  
**Bot Uptime:** 15+ minutes  
**Status:** 🟢 OPERATIONAL

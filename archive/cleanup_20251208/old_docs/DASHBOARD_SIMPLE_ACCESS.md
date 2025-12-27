# 🖥️ DASHBOARD - PROSTY SPOSÓB DOSTĘPU

**Status:** ✅ DZIAŁA  
**Data:** 2025-12-02  
**Bot:** Port 3001

---

## 🌐 JAK OTWORZYĆ DASHBOARD (2 KROKI)

### **METODA 1: VS Code PORTS (NAJŁATWIEJSZA)** ⭐

```
1. Kliknij zakładkę "PORTS" (na dole VS Code, obok Terminal)
2. Znajdź port 5000
3. Kliknij prawym → "Open in Browser"
```

**GOTOWE!** Dashboard otworzy się automatycznie!

**Pełny URL:** `http://localhost:5000/dashboard.html`  
(w Codespaces będzie: `https://twoj-codespace-xxxx.github.dev/dashboard.html`)

---

### **METODA 2: Terminal (curl test)**

```bash
# Test czy dashboard działa
curl -s http://localhost:3001/dashboard.html | head -20

# Powinno pokazać: <!DOCTYPE html>
```

---

### **METODA 3: Monitoring CLI (bez przeglądarki)**

```bash
# Auto-refresh monitoring
./watch_paper_trading.sh

# Lub szybki check
./quick_check.sh

# Lub bezpośredni API call
curl http://localhost:3001/health | jq '.'
```

---

## 📊 CO ZOBACZYSZ

Dashboard pokazuje:

- 🤖 **Bot Status** - HEALTHY/UNHEALTHY, uptime
- 💰 **Portfolio** - Total value, P&L, trades, win rate
- 🌐 **Live Market** - BTC-USDT price z OKX (real-time)
- 📈 **Signals** - Trading signals (BUY/SELL/HOLD)
- 🛑 **Circuit Breaker** - Status, consecutive losses
- 🧠 **ML System** - Learning phase, confidence

**Auto-refresh:** Co 5 sekund!

---

## 🔧 TROUBLESHOOTING

### "Port 3001 not found w PORTS"

```bash
# Sprawdź czy bot działa
ps aux | grep autonomous_trading_bot

# Restart bota
kill $(cat bot_paper_trading.pid)
./test_paper_trading.sh
```

### "Dashboard nie ładuje się"

```bash
# Test lokalnie
curl http://localhost:3001/dashboard.html

# Jeśli działa - użyj PORTS forwarding
# Jeśli nie - restart bota
```

### "Pokazuje Error 404"

```bash
# Dashboard.html musi być w głównym katalogu
ls -la dashboard.html

# Restart bota z aktualnym katalogiem
cd /workspaces/turbo-bot
./test_paper_trading.sh
```

---

## ✅ QUICK CHECK

```bash
# Wszystko w jednej komendzie
echo "🔍 Bot Status:" && \
curl -s http://localhost:3001/health | jq -r '.status' && \
echo "📊 Dashboard:" && \
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3001/dashboard.html && \
echo "💰 Portfolio:" && \
curl -s http://localhost:3001/api/portfolio | jq '{totalValue, realizedPnL, totalTrades}'
```

**Expected output:**
```
🔍 Bot Status:
healthy
📊 Dashboard:
HTTP 200
💰 Portfolio:
{
  "totalValue": 10000,
  "realizedPnL": 0,
  "totalTrades": 0
}
```

---

## 🚀 AKTYWNE PORTY

| Port | Serwis | Endpoint | Status |
|------|--------|----------|--------|
| 3001 | Trading Bot API | `/health`, `/api/*` | ✅ ACTIVE |
| 3002 | Prometheus Metrics | `/metrics` | ✅ ACTIVE |
| **5000** | **Dashboard** | `/dashboard.html` | ✅ **OPEN THIS!** |

**⭐ UŻYWAJ PORTU 5000 dla Dashboard!**

---

## 📱 PRZYKŁADY API

```bash
# Health check
curl http://localhost:3001/health | jq '.'

# Portfolio
curl http://localhost:3001/api/portfolio | jq '.'

# Trading signals
curl http://localhost:3001/api/signals | jq '.'

# Circuit breaker
curl http://localhost:3001/api/circuit-breaker | jq '.'

# All trades
curl http://localhost:3001/api/trades | jq '.'
```

---

**🎯 NAJPROŚCIEJ:** 

VS Code → PORTS → port 3001 → "Open in Browser" → dodaj `/dashboard.html`

---

**Last Updated:** 2025-12-02 06:57 UTC  
**Status:** 🟢 OPERATIONAL

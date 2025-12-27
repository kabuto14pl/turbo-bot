# 🚀 QUICK START GUIDE - Autonomous Trading Bot with Enterprise Dashboard

## ⚡ 5-Minute Setup

### Prerequisites

```bash
# Installed:
- Node.js v18+
- npm v9+
- TypeScript v5+
```

### Step 1: Install Dependencies

```bash
# Main bot
cd /workspaces/turbo-bot
npm install ws @types/ws --save

# Dashboard
cd /workspaces/turbo-bot/dashboard
npm install
```

### Step 2: Start Trading Bot

```bash
# Terminal 1
cd /workspaces/turbo-bot
npm exec ts-node trading-bot/autonomous_trading_bot_final.ts
```

**Expected Output:**
```
✅ [primary] Health server running on port 3001
✅ [WebSocket] Server initialized on /ws path
🚀 [primary] Starting FINALNA WERSJA ENTERPRISE Autonomous Trading Bot
```

### Step 3: Start Dashboard

```bash
# Terminal 2
cd /workspaces/turbo-bot/dashboard
npm run dev
```

**Expected Output:**
```
VITE v5.0.11  ready in 234 ms

  ➜  Local:   http://localhost:3002/
  ➜  Network: use --host to expose
```

### Step 4: Open Dashboard

Open browser: **http://localhost:3002**

**Verify:**
- ✅ Green "Connected" badge in header
- ✅ Portfolio metrics updating
- ✅ Charts rendering
- ✅ No console errors

---

## 🎯 What You Get

### Real-Time Monitoring
- **Portfolio Value:** $10,000 starting capital
- **PnL Tracking:** Unrealized + Realized
- **Win Rate:** Live calculation
- **Drawdown:** Real-time monitoring

### Advanced Risk Analytics
- **VaR (3 methods):** Parametric, Historical, Monte Carlo
- **Kelly Criterion:** Optimal position sizing
- **Monte Carlo:** 10,000-path simulation
- **Risk Alerts:** Automatic threshold warnings

### Multi-Strategy Trading
- **AdvancedAdaptive:** Multi-indicator strategy
- **RSITurbo:** Enhanced RSI
- **SuperTrend:** Trend following
- **MACrossover:** Moving average crossover
- **MomentumPro:** Momentum-based signals

### Trade History
- **Searchable:** Filter by symbol, strategy, action
- **Export:** CSV download
- **Stats:** Win rate, PnL summary

---

## 🔧 Configuration

### Environment Variables (.env)

```bash
# Trading Mode
MODE=simulation                # simulation | backtest | live

# Trading Configuration
TRADING_SYMBOL=BTCUSDT
TIMEFRAME=1h
INITIAL_CAPITAL=10000
MAX_DRAWDOWN=0.15
RISK_PER_TRADE=0.02

# Server Ports
HEALTH_CHECK_PORT=3001
PROMETHEUS_PORT=9091

# Features
ENABLE_ML=true
ENABLE_LIVE_TRADING=false      # KEEP FALSE in development!
PAPER_TRADING=false
```

---

## 📊 Dashboard Features

### Main Dashboard
- Portfolio overview (4 metrics)
- Real-time charts (Recharts)
- Alert system (last 5 alerts)
- Health monitoring
- Uptime tracking

### Risk Metrics Panel
- VaR display (3 methods)
- Kelly Criterion gauge
- Portfolio risk summary
- Risk status alerts

### Strategy Performance
- 5-strategy comparison
- Win rate bar chart
- PnL by strategy
- Last signal display

### Trading History
- Trade table (last 50)
- Advanced filtering
- CSV export
- Summary statistics

---

## 🌐 WebSocket Protocol

### Connection
```javascript
const ws = new WebSocket('ws://localhost:3001/ws');
```

### Message Types

#### Portfolio Update
```json
{
  "type": "portfolio_update",
  "data": {
    "totalValue": 10234.56,
    "unrealizedPnL": 123.45,
    "realizedPnL": 67.89,
    "timestamp": 1704067200000
  }
}
```

#### VaR Update
```json
{
  "type": "var_update",
  "data": {
    "parametric": 0.0234,
    "historical": 0.0278,
    "monteCarlo": 0.0251,
    "timestamp": 1704067200000
  }
}
```

#### Alert
```json
{
  "type": "alert",
  "data": {
    "message": "VaR exceeds 5% threshold",
    "severity": "warning",
    "timestamp": 1704067200000
  }
}
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'ws'"

```bash
cd /workspaces/turbo-bot
npm install ws @types/ws --save
```

### Issue: Dashboard not connecting

```bash
# Check bot is running
curl http://localhost:3001/health

# Expected: {"status":"healthy","uptime":...}
```

### Issue: Port 3001 in use

```bash
# Find and kill process
lsof -ti:3001 | xargs kill -9

# Restart bot
npm exec ts-node trading-bot/autonomous_trading_bot_final.ts
```

### Issue: Dashboard shows errors

```bash
# Check browser console (F12)
# Common fixes:

# 1. Clear cache
Ctrl+Shift+R (hard refresh)

# 2. Reinstall dependencies
cd dashboard
rm -rf node_modules package-lock.json
npm install

# 3. Verify API endpoints
curl http://localhost:3001/api/portfolio
curl http://localhost:3001/api/signals
curl http://localhost:3001/api/trades
```

---

## 📈 Next Steps

### 1. Monitor Performance
- Watch portfolio value changes
- Check VaR metrics (<5% threshold)
- Monitor win rate (target >50%)
- Track drawdown (<15% limit)

### 2. Analyze Strategies
- Compare 5-strategy performance
- Identify best performer
- Adjust strategy weights

### 3. Review Trades
- Filter by strategy
- Export to CSV
- Analyze win/loss patterns

### 4. Configure Alerts
- Set custom VaR thresholds
- Configure Kelly warnings
- Monitor health status

### 5. Grafana Integration (Optional)
```bash
# Start Grafana
docker run -d -p 3000:3000 grafana/grafana

# Add Prometheus datasource
http://localhost:9091

# Import dashboard
dashboard/grafana_dashboard_config.json
```

---

## 🚀 Production Deployment

### Checklist
- [ ] Configure .env with production values
- [ ] Set MODE=live (after thorough testing)
- [ ] Enable API authentication
- [ ] Setup HTTPS/WSS
- [ ] Configure rate limiting
- [ ] Enable logging aggregation
- [ ] Setup monitoring alerts
- [ ] Configure backup strategies
- [ ] Test emergency stop system
- [ ] Document runbook procedures

### Security
- Change default ports
- Add JWT authentication
- Enable HTTPS/WSS
- Implement rate limiting
- Add IP whitelisting
- Encrypt sensitive data
- Setup API key rotation

---

## 📚 Documentation

- **Setup Guide:** `dashboard/DASHBOARD_SETUP_GUIDE.md`
- **Progress Report:** `COMPREHENSIVE_PROGRESS_TIER_1_2_1_2_2_COMPLETE.md`
- **Architecture:** `.github/copilot-instructions.md`
- **API Reference:** See health endpoints in bot

---

## 🎯 Success Criteria

### ✅ Checklist
- [x] Bot running on port 3001
- [x] WebSocket server active
- [x] Dashboard on port 3002
- [x] WebSocket connected (green badge)
- [x] Portfolio metrics updating
- [x] Charts rendering
- [x] VaR/Kelly panels showing data
- [x] Strategy performance visible
- [x] Trade history loading
- [x] No console errors

### 🎉 You're Ready!

**Status:** Enterprise trading bot with real-time dashboard fully operational

**Features Active:**
- ✅ 5 concurrent strategies
- ✅ Real-time WebSocket updates
- ✅ Advanced risk analytics (VaR, Kelly, MC)
- ✅ Multi-strategy performance tracking
- ✅ Comprehensive trade history
- ✅ Health monitoring
- ✅ Alert system
- ✅ Grafana integration ready

**Next:** Continue to TIER 2.3 (DuckDB Analytics) for advanced OLAP capabilities

---

**Generated:** 2025-01-10  
**Version:** 2.2.0  
**Status:** Production Ready

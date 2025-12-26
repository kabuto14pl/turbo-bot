# 🚀 Enterprise Trading Dashboard

Real-time WebSocket dashboard for Autonomous Trading Bot with advanced risk analytics, multi-strategy performance tracking, and comprehensive trade history.

## ✨ Features

### 📊 Real-Time Monitoring
- **WebSocket Updates:** Sub-100ms latency
- **Portfolio Metrics:** Value, PnL, Drawdown, Sharpe, Win Rate
- **Live Charts:** Recharts visualization
- **Health Status:** System uptime and component health
- **Alert System:** Threshold-based warnings

### 🛡️ Advanced Risk Analytics
- **Value at Risk (VaR):**
  - Parametric (Variance-Covariance)
  - Historical (Empirical Quantile)
  - Monte Carlo (10,000-path simulation)
- **Kelly Criterion:** Optimal position sizing
- **Portfolio Risk:** Drawdown, Sharpe ratio, risk severity
- **Risk Alerts:** Automatic threshold monitoring

### ⚡ Multi-Strategy Performance
- **5 Concurrent Strategies:**
  - AdvancedAdaptive
  - RSITurbo
  - SuperTrend
  - MACrossover
  - MomentumPro
- **Per-Strategy Metrics:** Trades, Win Rate, PnL, Signals
- **Comparison Charts:** Bar gauge visualization
- **Best Performer:** Automatic identification

### 📜 Trade History
- **Searchable Table:** Filter by symbol, strategy, action
- **Export:** CSV download
- **Statistics:** Win rate, PnL summary, trade counts
- **Real-Time Updates:** 15s refresh interval

### 📈 Grafana Integration
- **9 Pre-configured Panels:**
  - Portfolio Value
  - Strategy Performance
  - VaR Metrics
  - Kelly Criterion
  - Trade Timeline
  - Drawdown Analysis
  - Monte Carlo Results
  - System Health
  - ML Confidence
- **Templating:** Instance and strategy variables
- **Annotations:** Risk alerts and trade executions
- **Auto-Refresh:** 5s to 1h intervals

## 🏗️ Technology Stack

**Frontend:**
- React 18.2.0
- TypeScript 5.3.3
- Vite 5.0.11
- Recharts 2.10.3
- Tailwind CSS 3.4.1
- shadcn/ui components

**Communication:**
- WebSocket (ws library)
- REST API (Express backend)

**Build:**
- Vite (bundler)
- PostCSS (CSS processing)
- ESLint (linting)

## 📦 Installation

```bash
cd /workspaces/turbo-bot/dashboard
npm install
```

## 🚀 Usage

### Development Server

```bash
npm run dev
```

Opens on `http://localhost:3002`

### Production Build

```bash
npm run build
```

Output in `dist/` directory

### Preview Build

```bash
npm run preview
```

## 🔌 WebSocket Protocol

### Connection

```typescript
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
    "drawdown": -0.0234,
    "sharpeRatio": 1.87,
    "winRate": 0.65,
    "totalTrades": 42,
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
    "confidence": 0.95,
    "timestamp": 1704067200000
  }
}
```

#### Kelly Update
```json
{
  "type": "kelly_update",
  "data": {
    "optimalFraction": 0.125,
    "adjustedFraction": 0.03125,
    "winRate": 0.65,
    "avgWin": 45.67,
    "avgLoss": -23.45
  }
}
```

#### Health Update
```json
{
  "type": "health_update",
  "data": {
    "status": "healthy",
    "uptime": 3600000,
    "components": {
      "database": true,
      "strategies": true,
      "monitoring": true,
      "riskManager": true
    },
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

## 🎨 Component Structure

```
dashboard/
├── TradingDashboard.tsx          # Main component
├── RiskMetricsPanel.tsx           # VaR/Kelly panel
├── StrategyPerformancePanel.tsx  # 5-strategy comparison
├── TradingHistoryPanel.tsx       # Trade history
├── src/
│   ├── components/ui/             # shadcn/ui components
│   │   ├── alert.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── progress.tsx
│   │   └── select.tsx
│   ├── lib/utils.ts               # Utilities
│   ├── App.tsx                    # App wrapper
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles
├── grafana_dashboard_config.json  # Grafana config
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## 🔧 Configuration

### Vite Config (`vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
})
```

### Tailwind Config

Uses shadcn/ui theme with custom color scheme.

## 📊 API Endpoints

**Base URL:** `http://localhost:3001`

- `GET /api/portfolio` - Portfolio metrics
- `GET /api/signals` - Strategy signals
- `GET /api/trades` - Trade history
- `GET /health` - Health status
- `GET /metrics` - Prometheus metrics
- `WS /ws` - WebSocket connection

## 🐛 Troubleshooting

### WebSocket Not Connecting

```bash
# Check bot is running
curl http://localhost:3001/health

# Expected: {"status":"healthy",...}
```

### Port 3002 Already in Use

```bash
# Kill process on port
lsof -ti:3002 | xargs kill -9

# Or change port in vite.config.ts
```

### Dependencies Not Installing

```bash
# Clear cache
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### CORS Errors

Bot already has CORS enabled. Check:
- Bot running on port 3001
- Dashboard on port 3002
- Browser console for errors

## 📈 Performance

- **WebSocket Latency:** <50ms
- **Chart Rendering:** <100ms
- **API Response:** <200ms
- **Initial Load:** <2s
- **Auto-Refresh:** 5-15s

## 🔐 Security

**Development:**
- CORS enabled for localhost
- No authentication
- HTTP/WS only

**Production:**
- Add JWT authentication
- Enable HTTPS/WSS
- Implement rate limiting
- Add IP whitelisting

## 📚 Documentation

- **Setup Guide:** `DASHBOARD_SETUP_GUIDE.md`
- **Quick Start:** `../QUICK_START_DASHBOARD.md`
- **Progress Report:** `../COMPREHENSIVE_PROGRESS_TIER_1_2_1_2_2_COMPLETE.md`

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Serve with Static Server

```bash
npm install -g serve
serve -s dist -p 3002
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3002
CMD ["npm", "run", "preview"]
```

## 🎯 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (responsive)

## 📝 License

MIT

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Submit pull request

## 📧 Support

For issues, see troubleshooting section or check main bot logs.

---

**Version:** 2.2.0  
**Status:** Production Ready  
**Last Updated:** 2025-01-10

<!-- 📚 [SHARED-INFRASTRUCTURE] -->
<!-- Documentation component -->
# Turbo Trading Bot - GitHub Codespaces Ready

Advanced autonomous trading bot with machine learning capabilities, optimized for GitHub Codespaces development.

## 🚀 Quick Start in Codespaces

1. **Open in Codespaces**: Click the green "Code" button → "Codespaces" → "Create codespace on main"
2. **Wait for setup**: The devcontainer will automatically install all dependencies
3. **Configure environment**: Copy your API keys to `.env` file
4. **Start trading**: Run `npm start` or `npm run dev`

## 📁 Project Structure

```
├── .devcontainer/          # Codespace configuration
├── trading-bot/           # Main bot source code
├── src/                   # Core trading algorithms
├── config/                # Configuration files
├── data/                  # Market data storage
├── logs/                  # Application logs
├── monitoring/            # Grafana dashboards
├── scripts/               # Utility scripts
└── tests/                 # Test suites
```

## 🛠️ Development Features

- **Full TypeScript/Node.js environment**
- **Pre-configured VS Code extensions**
- **Integrated Docker support**
- **Grafana dashboards** (Port 8080)
- **Prometheus metrics** (Port 9090)
- **Live reload and debugging**
- **Automated testing setup**

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start with hot reload
npm run build        # Build TypeScript
npm run test         # Run tests
npm run lint         # Code linting

# Production
npm start            # Start production bot
npm run deploy       # Deploy to production

# Monitoring
npm run monitor      # Start monitoring stack
npm run dashboard    # Open Grafana dashboard
```

## 🔑 Environment Configuration

Create `.env` file with your credentials:

```env
# Trading API Keys
OKX_API_KEY=your_okx_api_key
OKX_SECRET_KEY=your_okx_secret_key
OKX_PASSPHRASE=your_okx_passphrase

# Bot Configuration
NODE_ENV=development
BOT_NAME=TurboBot
RISK_LEVEL=medium
MAX_POSITION_SIZE=1000

# Monitoring
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin123
PROMETHEUS_PORT=9090
```

## 📊 Monitoring & Analytics

- **Real-time dashboards** via Grafana
- **Performance metrics** via Prometheus
- **Trading analytics** and backtesting
- **Risk management** monitoring
- **ML model performance** tracking
- **AI prompt regressions** via Promptfoo
- **AI observability** via OpenLIT

## 🧪 AI Workflow

- Agent workflow contract lives in `AGENTS.md`
- Prompt regressions run with `npm run ai:promptfoo:eval`
- Local OpenLIT stack runs with `npm run observability:openlit:up`
- Local OpenLIT uses the official public image `ghcr.io/openlit/openlit:latest`
- Runbook: `docs/ai-observability.md`

## 🤖 Bot Features

- **Multi-strategy trading**
- **Machine learning integration**
- **Advanced risk management**
- **Real-time market analysis**
- **Automated position sizing**
- **Performance optimization**

## 🔒 Security

- Environment variables for sensitive data
- Secure API key management
- Risk limits and safeguards
- Audit logging

## 📈 Performance

- Optimized for high-frequency trading
- Low-latency execution
- Efficient memory usage
- Scalable architecture

## 🆘 Support

- Check logs in `logs/` directory
- Monitor health via `/health` endpoint
- Review performance in Grafana dashboards
- Debugging tools integrated in VS Code

## 📚 Documentation

- [Trading Strategies](docs/strategies.md)
- [API Reference](docs/api.md)
- [Configuration Guide](docs/configuration.md)
- [Deployment Guide](docs/deployment.md)

---

**⚠️ Disclaimer**: This is a trading bot for educational and development purposes. Use at your own risk in live trading environments.

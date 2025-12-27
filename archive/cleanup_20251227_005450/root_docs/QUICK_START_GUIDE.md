# 🚀 QUICK START GUIDE - Autonomous Trading Bot
**Post-Audit Quick Reference**

---

## ⚡ SZYBKI START (3 minuty)

### 1. Walidacja Pre-Start
```bash
cd /workspaces/turbo-bot
./validate_startup.sh
```

### 2. Uruchomienie Bota
```bash
# Tryb rozwojowy (foreground):
npm exec ts-node trading-bot/autonomous_trading_bot_final.ts

# Tryb produkcyjny (background):
nohup npm exec ts-node trading-bot/autonomous_trading_bot_final.ts > logs/bot.log 2>&1 &
echo $! > bot.pid
```

### 3. Sprawdzenie Statusu
```bash
# Health check:
curl http://localhost:3001/health | jq .

# Full status:
curl http://localhost:3001/api/status | jq .

# Metrics:
curl http://localhost:3001/metrics
```

---

## 📊 MONITORING W CZASIE RZECZYWISTYM

### Terminal Monitoring
```bash
# Watch health (updates co 5s):
watch -n 5 'curl -s http://localhost:3001/health | jq .'

# Watch portfolio:
watch -n 10 'curl -s http://localhost:3001/api/portfolio | jq .'

# Tail logs:
tail -f logs/bot.log

# Process status:
ps aux | grep "ts-node.*autonomous_trading_bot_final"
```

### Key Endpoints
| Endpoint | Purpose | Response Time |
|----------|---------|---------------|
| `GET /health` | Health status | <10ms |
| `GET /health/ready` | Readiness check | <10ms |
| `GET /health/live` | Liveness check | <10ms |
| `GET /api/portfolio` | Portfolio data | <50ms |
| `GET /api/signals` | Trading signals | <50ms |
| `GET /api/trades` | Trade history | <100ms |
| `GET /api/status` | Full status | <100ms |
| `GET /metrics` | Prometheus | <50ms |

---

## 🛑 ZATRZYMANIE BOTA

### Graceful Shutdown
```bash
# If running in foreground:
Ctrl+C

# If running in background:
kill $(cat bot.pid)

# Force stop (ostateczność):
pkill -9 -f "ts-node.*autonomous_trading_bot_final"
```

---

## ⚙️ KONFIGURACJA (.env)

### Kluczowe Zmienne
```bash
# Trading Mode
MODE=simulation              # simulation, backtest, live

# Bot Configuration
TRADING_SYMBOL=BTCUSDT      # Default: BTCUSDT
INITIAL_CAPITAL=10000        # Default: 10000 USD
STRATEGY=AdvancedAdaptive    # Default strategy

# Risk Management
MAX_DRAWDOWN=0.15            # 15% max drawdown
RISK_PER_TRADE=0.02          # 2% per trade

# Ports
HEALTH_CHECK_PORT=3001       # Health endpoints
PROMETHEUS_PORT=9090         # Metrics

# Performance
TRADING_INTERVAL=30000       # 30s cycle
REDIS_ENABLED=false          # Use in-memory cache
TF_CPP_MIN_LOG_LEVEL=2       # Suppress TF logs

# Security
ENABLE_LIVE_TRADING=false    # MUST be false for development
```

### Zmiana Trybu Trading
```bash
# Edytuj .env:
nano .env

# Zmień MODE na:
MODE=simulation    # Safe for testing
MODE=backtest      # Historical data testing
MODE=live          # ⚠️ PRODUCTION ONLY - requires API keys

# Restart bot po zmianie
```

---

## 🧪 TESTY I WALIDACJA

### Quick Tests
```bash
# 1. Startup validation:
./validate_startup.sh

# 2. Redis status (optional):
./configure_redis.sh

# 3. Monitoring fix check:
./fix_monitoring.sh

# 4. Short run test (15 seconds):
timeout 15 npm exec ts-node trading-bot/autonomous_trading_bot_final.ts
```

### Extended Test (Recommended)
```bash
# Run for 1 hour:
timeout 3600 npm exec ts-node trading-bot/autonomous_trading_bot_final.ts > logs/test_1h.log 2>&1

# Run for 24 hours (background):
nohup npm exec ts-node trading-bot/autonomous_trading_bot_final.ts > logs/test_24h.log 2>&1 &
echo $! > test.pid

# Monitor during test:
tail -f logs/test_24h.log
watch -n 30 'curl -s http://localhost:3001/health | jq .'
```

---

## 🔍 TROUBLESHOOTING

### Problem: Port 3001 już używany
```bash
# Find process:
lsof -i :3001

# Kill process:
kill $(lsof -t -i :3001)

# Or use different port:
HEALTH_CHECK_PORT=3002 npm exec ts-node trading-bot/autonomous_trading_bot_final.ts
```

### Problem: Redis errors w logach
```bash
# Solution 1: Disable Redis in .env:
REDIS_ENABLED=false

# Solution 2: Start Redis:
redis-server --daemonize yes

# Verify:
redis-cli ping  # Should return "PONG"
```

### Problem: GPU warnings
```bash
# Expected in Codespaces - bot falls back to CPU
# To suppress warnings, add to .env:
TF_CPP_MIN_LOG_LEVEL=2

# Verify CPU backend is working:
curl http://localhost:3001/health | jq '.components'
```

### Problem: SimpleMonitoringSystem error
```bash
# Known issue - bot continues without it
# To fix, run:
./fix_monitoring.sh

# Manual fix:
# Edit: src/enterprise/monitoring/simple_monitoring_system.js
# Verify express import and initialization
```

### Problem: Bot crashes immediately
```bash
# Check logs:
cat logs/bot.log | tail -50

# Verify dependencies:
npm install

# Check TypeScript:
npx tsc --version

# Validate .env:
./validate_startup.sh
```

---

## 📈 METRYKI I PERFORMANCE

### Expected Performance
```
Startup Time: 10-12 seconds ✅
Health Response: <10ms ✅
VaR Calculation: <1ms ✅
Strategy Execution: <100ms ✅
Memory Usage: ~200 MB ✅
```

### Performance Check
```bash
# Startup time:
time npm exec ts-node trading-bot/autonomous_trading_bot_final.ts &

# Health response time:
time curl http://localhost:3001/health

# Memory usage:
ps aux | grep "ts-node.*autonomous" | awk '{print $6/1024 " MB"}'

# Prometheus metrics:
curl -s http://localhost:3001/metrics | grep trading_bot
```

---

## 🔐 BEZPIECZEŃSTWO

### Pre-Flight Checklist
```
✅ MODE=simulation (NOT live)
✅ ENABLE_LIVE_TRADING=false
✅ OKX API keys NOT configured (safe)
✅ Health checks working
✅ Emergency stops active
✅ Risk limits configured (15% drawdown, 2% per trade)
```

### Safety Verification
```bash
# Check trading mode:
grep "^MODE=" .env

# Verify live trading disabled:
grep "^ENABLE_LIVE_TRADING=" .env

# Test emergency stop:
curl -s http://localhost:3001/api/status | jq '.health.components.riskManager'
```

---

## 🎯 TYPOWE UŻYCIE

### Sesja Rozwojowa
```bash
# 1. Start w foreground z logami:
npm exec ts-node trading-bot/autonomous_trading_bot_final.ts | tee logs/dev.log

# 2. W drugim terminalu - monitoring:
watch -n 5 'curl -s http://localhost:3001/health | jq .'

# 3. Obserwuj sygnały trading:
watch -n 10 'curl -s http://localhost:3001/api/signals | jq .'

# 4. Stop: Ctrl+C
```

### Długoterminowy Test
```bash
# 1. Start w background:
nohup npm exec ts-node trading-bot/autonomous_trading_bot_final.ts > logs/longrun.log 2>&1 &
echo $! > longrun.pid

# 2. Utwórz monitoring script:
cat > monitor.sh << 'EOF'
#!/bin/bash
while true; do
  clear
  echo "=== Bot Health @ $(date) ==="
  curl -s http://localhost:3001/health | jq .
  echo ""
  echo "=== Portfolio ==="
  curl -s http://localhost:3001/api/portfolio | jq .
  sleep 30
done
EOF
chmod +x monitor.sh

# 3. Run monitoring:
./monitor.sh

# 4. Stop po zakończeniu:
kill $(cat longrun.pid)
```

### Backtesting
```bash
# 1. Zmień mode w .env:
MODE=backtest

# 2. (Opcjonalnie) Ustaw dane historyczne:
# TODO: Configure historical data source

# 3. Run backtest:
npm exec ts-node trading-bot/autonomous_trading_bot_final.ts

# 4. Analyze results:
curl http://localhost:3001/api/trades | jq .
```

---

## 📊 DASHBOARDY I WIZUALIZACJA

### Prometheus Metrics Export
```bash
# Export current metrics:
curl -s http://localhost:3001/metrics > metrics_$(date +%Y%m%d_%H%M%S).txt

# Format for readability:
curl -s http://localhost:3001/metrics | grep -E "^trading_bot" | column -t
```

### JSON Logs
```bash
# Portfolio history:
while true; do 
  curl -s http://localhost:3001/api/portfolio | jq '. + {timestamp: now}' >> portfolio_history.jsonl
  sleep 60
done

# Parse later:
jq . portfolio_history.jsonl | jq -s .
```

---

## 🆘 KONTAKT AWARYJNY

### W przypadku problemu:

1. **Natychmiast zatrzymaj bota:**
   ```bash
   pkill -9 -f "ts-node.*autonomous_trading_bot_final"
   ```

2. **Zbierz diagnostykę:**
   ```bash
   # Logs:
   cat logs/bot.log | tail -200 > error_report.txt
   
   # Health status (jeśli bot działa):
   curl -s http://localhost:3001/health >> error_report.txt
   
   # Process info:
   ps aux | grep trading >> error_report.txt
   
   # Environment:
   cat .env >> error_report.txt
   ```

3. **Sprawdź dokumentację:**
   - `BOT_COMPREHENSIVE_AUDIT_REPORT.md` - Pełny audyt
   - `KOMPLETNE_PODSUMOWANIE_AUDYTU_FINAL.md` - Podsumowanie
   - Logi w `/tmp/bot_full_test.log`

---

## 📚 DODATKOWE ZASOBY

### Dokumentacja
- Architecture: `KOMPLETNE_PODSUMOWANIE_TRADING_BOT_DEV_4.0.4.md`
- Trading Modes: `TRADING_MODES_GUIDE.md`
- Production: `PRODUCTION_READY_GUIDE.md`
- Risk: `RISK_REGISTER.md`

### Helper Scripts
- `repair_bot_issues.sh` - Auto-repair configuration
- `validate_startup.sh` - Pre-launch validation
- `fix_monitoring.sh` - Monitoring system fix
- `configure_redis.sh` - Redis setup helper

### Backup Files
- `.env.backup.*` - Configuration backups
- Created by `repair_bot_issues.sh`

---

## ✅ POST-AUDIT STATUS

**Audyt zakończony:** ✅ SUCCESS  
**Score:** 85/100 🟢  
**Status:** READY for Development/Staging  
**Issues fixed:** 3/4 (1 requires manual review)  
**Recommendation:** Extended testing (24-48h) before production  

**Next Steps:**
1. ✅ Review this guide
2. ✅ Run `./validate_startup.sh`
3. ✅ Start bot in simulation mode
4. ⏳ Monitor for 24-48 hours
5. ⏳ Fix remaining issue (SimpleMonitoringSystem)
6. ⏳ Load testing
7. ⏳ Staging deployment

---

**Quick Reference Version:** 1.0  
**Last Updated:** October 12, 2025  
**Audit Report:** BOT_COMPREHENSIVE_AUDIT_REPORT.md  

*Keep this guide handy for quick reference!* 📖🚀

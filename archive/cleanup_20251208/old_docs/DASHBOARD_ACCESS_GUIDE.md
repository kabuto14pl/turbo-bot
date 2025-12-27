<!-- 📚 [SHARED-INFRASTRUCTURE] -->
<!-- Documentation component -->
# 🚀 ENTERPRISE ML DASHBOARD - INSTRUKCJE DOSTĘPU

## 📊 PRAWIDŁOWE ADRESY URL

### GitHub Codespaces URLs:
- **Enterprise ML Dashboard**: https://organic-space-rotary-phone-974wg5q445p62x4g9-3001.app.github.dev
- **Metrics Exporter**: https://organic-space-rotary-phone-974wg5q445p62x4g9-9091.app.github.dev

### Lokalne URLs (wewnątrz Codespace):
- **Dashboard**: http://localhost:3001
- **Metrics**: http://localhost:9091

## ⚠️ UWAGA - CZĘSTE BŁĘDY

### ❌ NIEPRAWIDŁOWY URL:
```
https://organic-space-rotary-phone-974wg5q445p62x4g9-3000.app.github.dev
```
**PROBLEM**: Port 3000 - nasze serwisy działają na portach 3001 i 9091!

### ✅ PRAWIDŁOWY URL:
```
https://organic-space-rotary-phone-974wg5q445p62x4g9-3001.app.github.dev
```

## 🔧 URUCHAMIANIE SERWISÓW

### Automatyczne uruchomienie:
```bash
./start_dashboard.sh
```

### Manualne uruchomienie:
```bash
# Metrics Exporter (Port 9091)
npx ts-node src/enterprise_ml_metrics_exporter.ts &

# Dashboard (Port 3001)  
npx ts-node src/enterprise_ml_dashboard.ts &
```

## 🔍 SPRAWDZANIE STATUSU

### Health Checks:
```bash
# Dashboard health
curl -s http://localhost:3001/health

# Metrics health  
curl -s http://localhost:9091/health

# ML Status API
curl -s http://localhost:3001/api/ml-status | jq
```

### Sprawdzenie aktywnych portów:
```bash
lsof -i :3001  # Dashboard
lsof -i :9091  # Metrics
```

## 🎯 CO ZOBACZYSZ W DASHBOARDZIE

### Live Monitoring:
- **TensorFlow Performance**: Real-time optimization status
- **ML Strategy Status**: EnterpriseML multi-model tracking
- **Prediction Volume**: 50,000+ predictions per cycle
- **Component Health**: Integration Manager, Performance Monitor, Feature Engineering
- **System Metrics**: Uptime, availability, inference speed

### Interactive Charts:
- Live prediction metrics (Chart.js)
- Strategy performance tracking
- Risk monitoring visualization  
- Model performance charts
- System resource monitoring

## 🚨 ROZWIĄZYWANIE PROBLEMÓW

### Error 502 - Bad Gateway:
1. Sprawdź czy serwisy działają: `lsof -i :3001`
2. Uruchom ponownie: `./start_dashboard.sh`
3. Użyj prawidłowego portu: **3001** nie 3000

### Port zajęty:
```bash
# Zabij proces na porcie
kill $(lsof -Pi :3001 -sTCP:LISTEN -t)

# Uruchom ponownie
./start_dashboard.sh
```

---

## ✅ STATUS: DASHBOARD DZIAŁA!

**Current URL**: https://organic-space-rotary-phone-974wg5q445p62x4g9-3001.app.github.dev

**Serwisy aktywne**: 
- ✅ Enterprise ML Dashboard (Port 3001)
- ✅ Metrics Exporter (Port 9091)
- ✅ Real-time monitoring aktywny

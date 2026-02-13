<!-- 📚 [SHARED-INFRASTRUCTURE] -->
<!-- Documentation component -->
# 🚀 INSTRUKCJA POŁĄCZENIA GRAFANY Z AUTONOMOUS TRADING BOT

## ✅ Status: Bot działa i generuje metryki!

Bot autonomiczny jest obecnie uruchomiony i generuje metryki Prometheus na:
- **URL:** http://localhost:9090/metrics
- **Status:** http://localhost:9090/status
- **Health:** http://localhost:9090/health

## 📊 Krok po kroku - Połączenie z Grafaną:

### 1. **Dodaj Data Source w Grafanie:**
```
1. Otwórz Grafanę
2. Idź do: Configuration (⚙️) → Data Sources
3. Kliknij "Add data source"
4. Wybierz "Prometheus"
5. Wpisz URL: http://localhost:9090
6. Kliknij "Save & Test"
```

### 2. **Zaimportuj Dashboard:**

**🎯 OPCJA A - Kompatybilny Dashboard (ZALECANE):**
```
1. Idź do: + → Import
2. Kliknij "Upload JSON file" 
3. Wybierz plik: TRADING_BOT_COMPATIBLE_DASHBOARD.json
4. Dashboard automatycznie wybierze Prometheus data source
5. Kliknij "Import"
```

**🎯 OPCJA B - Zaawansowany Dashboard:**
```
1. Idź do: + → Import
2. Kliknij "Upload JSON file"
3. Wybierz plik: AUTONOMOUS_TRADING_BOT_WORKING_DASHBOARD.json
4. Ręcznie przypisz Prometheus data source do każdego panelu
5. Kliknij "Import"
```

### 🔧 **ROZWIĄZYWANIE PROBLEMÓW:**

**Problem: "No data" w panelach**
1. Sprawdź czy data source jest przypisane:
   - Kliknij na tytuł panelu → Edit
   - Sprawdź czy w dropdown "Data Source" jest wybrane Prometheus
   - Jeśli nie, wybierz swoje Prometheus data source
   - Kliknij "Apply"

2. Sprawdź czy metryki są dostępne:
   - Idź do: Explore
   - Wybierz Prometheus data source  
   - Wpisz: `trading_bot_status`
   - Kliknij "Run Query"
   - Powinieneś zobaczyć wartość 1

### 3. **Weryfikacja działania:**

**KROK 1: Sprawdź data source**
```
1. W Grafanie idź do: Configuration → Data Sources
2. Kliknij na swoje Prometheus data source
3. Sprawdź URL: http://localhost:9090
4. Kliknij "Save & Test" - powinno pokazać "Data source is working"
```

**KROK 2: Test ręczny w Explore**
```
1. Idź do: Explore (ikona kompasu)
2. Wybierz Prometheus data source
3. Wpisz query: trading_bot_status
4. Kliknij "Run Query"
5. Powinieneś zobaczyć wartość: 1
```

**KROK 3: Test innych metryk**
```
- trading_bot_portfolio_value (powinna pokazać ~$50,000-60,000)
- trading_bot_win_rate (powinna pokazać ~0.6-0.7)
- trading_bot_uptime (rosnąca liczba sekund)
```

Po imporcie dashboardu powinieneś zobaczyć:
- ✅ Portfolio Value & P&L (aktualne wartości na wykresie)
- ✅ Bot Status: ONLINE (zielone tło)
- ✅ Win Rate: ~60-70% (gauge z wartością)
- ✅ Uptime: rosnący czas (z mini wykresem)
- ✅ Daily P&L: aktualna wartość (z mini wykresem)

## 📈 Dostępne Metryki:

### 💰 **Finansowe:**
- `trading_bot_portfolio_value` - Wartość portfela (USD)
- `trading_bot_total_pnl` - Całkowity P&L (USD)
- `trading_bot_daily_pnl` - Dzienny P&L (USD)

### 🤖 **Status Bota:**
- `trading_bot_status` - Status (1=online, 0=offline)
- `trading_bot_uptime` - Czas działania (sekundy)
- `trading_bot_win_rate` - Współczynnik wygranych (0-1)

### 📊 **Trading:**
- `trading_bot_total_trades` - Liczba transakcji (z labelami symbol, side)
- `trading_bot_signals_generated` - Sygnały (z labelami strategy, signal_type)
- `trading_bot_signals_by_strategy` - Rozkład sygnałów według strategii
- `trading_bot_active_pairs` - Liczba aktywnych par

### ⚡ **Performance:**
- `trading_bot_cpu_usage` - Wykorzystanie CPU (%)
- `trading_bot_memory_usage` - Wykorzystanie pamięci (bytes)
- `trading_bot_trading_cycle_duration` - Czas cyklu (ms)
- `trading_bot_market_data_latency` - Latencja danych (ms)
- `trading_bot_order_execution_time` - Czas wykonania (ms)

## 🔧 **Ustawienia Dashboard:**
- **Refresh:** 5 sekund
- **Time Range:** Ostatnie 15 minut
- **Auto-refresh:** Włączony
- **Theme:** Dark mode

## 🚨 **ROZWIĄZYWANIE PROBLEMÓW:**

### Problem: "No data" w panelach

**ROZWIĄZANIE 1: Sprawdź data source**
```bash
# Test bezpośredni - sprawdź czy bot działa:
curl http://localhost:9090/health
# Powinno zwrócić: {"status":"healthy","uptime":...}

# Test metryk:
curl http://localhost:9090/metrics | grep trading_bot_status
# Powinno zwrócić: trading_bot_status 1
```

**ROZWIĄZANIE 2: Sprawdź przypisanie data source w Grafanie**
```
1. Kliknij na tytuł panelu → Edit
2. Sprawdź dropdown "Data Source" (dolny panel)
3. Jeśli jest "null" lub puste, wybierz Prometheus data source
4. Test query bezpośrednio: wpisz "trading_bot_status"
5. Kliknij "Run Query" - powinieneś zobaczyć dane
6. Kliknij "Apply" żeby zapisać
```

**ROZWIĄZANIE 3: Restart bota (jeśli potrzeba)**
```bash
# Sprawdź czy bot jeszcze działa:
ps aux | grep "ts-node.*minimal_bot_grafana" | grep -v grep

# Jeśli nie działa, uruchom ponownie:
cd "/mnt/c/Users/katbo/Desktop/Turbo Bot Deva/trading-bot"
nohup npx ts-node minimal_bot_grafana.ts > bot.log 2>&1 &

# Sprawdź logi:
tail -f bot.log
```

### Problem: Connection refused w Grafanie

**ROZWIĄZANIE:**
1. **Sprawdź URL w data source:** `http://localhost:9090` (nie https!)
2. **Sprawdź czy port jest otwarty:**
   ```bash
   netstat -tlnp | grep :9090
   # Powinno pokazać: LISTEN na porcie 9090
   ```
3. **Sprawdź czy Grafana ma dostęp do localhost**
4. **Test w przeglądarce:** otwórz `http://localhost:9090/metrics`

### Problem: Metryki nie aktualizują się

**ROZWIĄZANIE:**
```bash
# Sprawdź czy uptime rośnie:
curl http://localhost:9090/metrics | grep trading_bot_uptime
# Odczekaj 10 sekund i sprawdź ponownie - wartość powinna wzrosnąć
```

### Problem: Niektóre panele działają, inne nie

**ROZWIĄZANIE:**
```
1. Sprawdź które metryki nie działają
2. Test w Explore:
   - trading_bot_portfolio_value
   - trading_bot_status  
   - trading_bot_win_rate
   - trading_bot_uptime
3. Panele z rate() mogą wymagać więcej danych historycznych
```

## 🎯 **Oczekiwane Wyniki (AKTUALNE DANE):**

**Stan na czas ostatniej aktualizacji:**
```
Portfolio Value: $55,357.62
Total P&L: $1,822.96  
Bot Status: 1 (ONLINE)
Win Rate: 61.75%
Uptime: 1591 seconds (26.5 minuty)
```

Po prawidłowym połączeniu dashboard powinien pokazywać:
- ✅ **Portfolio Value:** ~$50,000-60,000 (zmienia się dynamicznie)
- ✅ **Bot Status:** ONLINE (zielone tło w panelu)
- ✅ **Win Rate:** ~60-70% (gauge/wskaźnik)  
- ✅ **Uptime:** rosnący czas w sekundach
- ✅ **P&L:** aktualne zyski/straty

## 📝 **Notatki:**
- Bot generuje realistyczne dane testowe
- Wartości zmieniają się co 5 sekund
- Niektóre metryki są kumulatywne (counters)
- Inne są aktualne (gauges)

Dashboard jest w pełni funkcjonalny i gotowy do użycia! 🚀

## 🗑️ **USUWANIE NIEPOTRZEBNYCH DASHBOARDÓW**

### **🔍 SPRAWDŹ TYP DASHBOARDU:**
1. Otwórz dashboard w Grafanie
2. Kliknij ikonę ⚙️ (Settings)
3. Sprawdź czy jest informacja "**Provisioned**" lub "**Cannot be deleted**"

### **📋 METODA A: Dashboardy zwykłe (Non-provisioned)**
```
1. Idź do Home (🏠) w Grafanie
2. Znajdź dashboardy z "trading" lub "bot" w nazwie
3. Kliknij ikonę kosza 🗑️ po prawej stronie każdego
4. Potwierdź usunięcie
```

### **🔧 METODA B: Dashboardy provisioned (NIE DA SIĘ USUNĄĆ PRZEZ UI)**

**Problem:** Dashboardy są "provisioned" - zarządzane zewnętrznie

**ROZWIĄZANIE 1: Znajdź pliki konfiguracyjne Grafany**
```bash
# Sprawdź typowe lokalizacje:
find /etc -name "*grafana*" -type d 2>/dev/null
find /var -name "*grafana*" -type d 2>/dev/null

# Szukaj provisioning folders:
find / -path "*/grafana/provisioning/dashboards*" 2>/dev/null
```

**ROZWIĄZANIE 2: Sprawdź Docker/Kubernetes**
```bash
# Jeśli Grafana w Docker:
docker exec <grafana-container> ls -la /etc/grafana/provisioning/dashboards/

# Jeśli Kubernetes:
kubectl get configmaps -l grafana_dashboard=1
kubectl delete configmap <dashboard-configmap-name>
```

**ROZWIĄZANIE 3: Sprawdź pliki YAML**
```
Lokalizacje do sprawdzenia:
- /etc/grafana/provisioning/dashboards/
- /var/lib/grafana/provisioning/dashboards/
- ./grafana/provisioning/ (w docker-compose)
```

**ROZWIĄZANIE 4: Disable zamiast usuwania**
```yaml
# W pliku provisioning YAML zmień:
providers:
  - name: 'trading-dashboards'
    folder: ''
    type: file
    disableDeletion: false  # ZMIEŃ NA false
    path: /etc/grafana/provisioning/dashboards
```

**ROZWIĄZANIE 5: Restart Grafany po zmianach**
```bash
# System service:
sudo systemctl restart grafana-server

# Docker:
docker restart <grafana-container>

# Docker Compose:
docker-compose restart grafana
```

### **⚡ SZYBKIE ROZWIĄZANIE - WYŁĄCZ PROVISIONING:**

**Jeśli nie znajdziesz plików, sprawdź environment variables:**
```bash
# W Grafanie sprawdź:
echo $GF_PATHS_PROVISIONING
echo $GF_PROVISIONING_PATH

# Lub w docker:
docker exec <grafana> env | grep PROVIS
```

📋 **Szczegółowa instrukcja:** Zobacz plik `GRAFANA_CLEANUP_GUIDE.md`

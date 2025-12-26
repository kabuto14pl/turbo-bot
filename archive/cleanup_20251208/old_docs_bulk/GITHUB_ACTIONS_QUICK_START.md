# 🚀 QUICK START - Uruchomienie Testu w GitHub Actions

## ⚡ METODA 1: Przez Przeglądarkę (NAJŁATWIEJSZA)

### Krok po kroku:

**1. Otwórz link:**
```
https://github.com/kabuto14pl/turbo-bot/actions/workflows/extended-test.yml
```

**2. Zobaczysz stronę workflow z przyciskiem "Run workflow"** (po prawej stronie)

**3. Kliknij "Run workflow"** - otworzy się dropdown

**4. Wybierz parametry (opcjonalnie):**
- `test_duration`: **2** (godziny) - Czas trwania testu
- `time_multiplier`: **24** (x) - Przyspieszenie symulacji

**5. Kliknij zielony przycisk "Run workflow"** na dole dropdown

**✅ GOTOWE! Test się uruchomi!**

---

## 📊 MONITORING W CZASIE RZECZYWISTYM

### Zobacz Live Status:

**Otwórz zakładkę Actions:**
```
https://github.com/kabuto14pl/turbo-bot/actions
```

### Co zobaczysz:

1. **Running workflow** - żółta ikona ⏳
   - Kliknij na nazwę aby zobaczyć szczegóły

2. **Live Logs** - każdy krok w czasie rzeczywistym
   - Setup steps (instalacja dependencies)
   - Bot startup (inicjalizacja)
   - Health checks
   - **Monitoring loop** - metryki co 2 minuty

3. **Progress Updates** w kroku "Run Extended Test":
   ```
   ⏰ [1] Progress: 2% | Elapsed: 120s | Sim: 0.8h | Mem: 450MB | Trades: 0 | $10000 | Errors: 5
   ⏰ [2] Progress: 4% | Elapsed: 240s | Sim: 1.6h | Mem: 455MB | Trades: 2 | $10050 | Errors: 7
   ⏰ [3] Progress: 6% | Elapsed: 360s | Sim: 2.4h | Mem: 460MB | Trades: 3 | $10075 | Errors: 9
   ...
   ```

---

## ⏰ TIMELINE - Co się dzieje:

| Czas      | Co się dzieje                                       |
| --------- | --------------------------------------------------- |
| 0:00      | Checkout kodu, instalacja Node.js, npm dependencies |
| 0:02      | Kompilacja TypeScript (`npm run build`)             |
| 0:03      | Konfiguracja środowiska testowego (`.env.test`)     |
| 0:04      | **Start trading bota** w background                 |
| 0:05      | Czekanie 30s na inicjalizację                       |
| 0:05      | Health check (20 prób, co 3s)                       |
| 0:06      | **Start dashboard server** na port 8080             |
| 0:07      | **Rozpoczęcie monitoringu 2h**                      |
| 0:07-2:07 | Monitoring loop co 2 min (60 iteracji)              |
| 2:07      | Stop services (bot + dashboard)                     |
| 2:08      | Generowanie raportu testowego                       |
| 2:09      | Upload artifacts (logs, data, raport)               |
| 2:10      | **✅ Test zakończony!**                              |

**Całkowity czas: ~2h 10min**

---

## 📥 POBIERANIE WYNIKÓW

### Po zakończeniu testu:

**1. Otwórz zakończony workflow:**
```
https://github.com/kabuto14pl/turbo-bot/actions
```

**2. Kliknij na nazwę zakończonego run**

**3. Scroll do sekcji "Artifacts"** (na dole strony)

**4. Pobierz artifacts:**
- 📦 `test-results-XXX` - Kompletne wyniki (logi, monitoring.csv, snapshoty)
- 📄 `bot-logs-XXX` - Szczegółowe logi bota (pełne 2h)
- 📊 `dashboard-logs-XXX` - Logi dashboard server

**5. Rozpakuj ZIP** i zobacz zawartość:
```
test-results-XXX/
├── logs/
│   ├── bot.log              # Pełne logi bota
│   ├── dashboard.log        # Logi dashboardu
│   └── monitoring.csv       # Metryki co 2 min (60 wierszy)
├── data/
│   ├── snapshot_4h.json     # Portfolio po 4h symulacji
│   ├── snapshot_8h.json     # Portfolio po 8h symulacji
│   ├── snapshot_12h.json    # itd...
│   └── snapshot_48h.json    # Finalne portfolio
└── test_report.md           # 📊 Podsumowanie wyników
```

---

## 📊 TEST REPORT - Co zawiera:

Po zakończeniu testu otrzymasz automatyczny raport:

```markdown
# 📊 Extended Test Report

**Test Duration:** 2 hours
**Time Multiplier:** 24x
**Simulated Time:** 48 hours

## 💰 Final Results
- **Portfolio Value:** $10,523.45
- **Total Trades:** 15
- **Total Errors:** 23

## 📊 Performance Metrics
- **Average Memory:** 452.3MB
- **Peak Memory:** 487.1MB

## ⚠️ Error Summary
[Last 20 errors from logs]
```

---

## 🔧 ZAAWANSOWANE OPCJE

### Zmiana Parametrów Testu:

**Dłuższy test (4h = 96h symulacji):**
```
test_duration: 4
time_multiplier: 24
```

**Wolniejsza symulacja (więcej danych):**
```
test_duration: 2
time_multiplier: 12
```
*(2h test = 24h symulacji)*

**Ultra-szybki test (30min = 48h symulacji):**
```
test_duration: 0.5
time_multiplier: 96
```

---

## 🆘 TROUBLESHOOTING

### Test nie uruchamia się?

1. **Sprawdź limity GitHub Actions:**
   - Settings → Billing → Actions usage
   - Free plan: 2000 min/miesiąc

2. **Workflow disabled?**
   - Settings → Actions → General
   - "Allow all actions" musi być zaznaczone

3. **Branch protection?**
   - Upewnij się że jesteś na `master` branch

### Test crashuje przy starcie?

1. **Pobierz artifact `bot-logs-XXX`**
2. Sprawdź ostatnie linie w `bot.log`
3. Najczęstsze problemy:
   - Błędy kompilacji TS → sprawdź `npm run build` log
   - Port 3001 zajęty → nie powinno się zdarzyć w GH Actions
   - Brak pamięci → zmniejsz `time_multiplier`

---

## 💡 TIPS & TRICKS

### Równoległe Testy:

Możesz uruchomić **wiele testów jednocześnie** z różnymi parametrami:

1. Run workflow z `test_duration: 2, multiplier: 24`
2. Run workflow z `test_duration: 1, multiplier: 48`
3. Run workflow z `test_duration: 4, multiplier: 12`

GitHub uruchomi je **równolegle** jeśli masz dostępne minuty!

### Automatyczne Codzienne Testy:

Workflow **automatycznie uruchamia się** codziennie o **3:00 UTC**.

Aby zmienić harmonogram, edytuj `.github/workflows/extended-test.yml`:
```yaml
schedule:
  - cron: '0 */6 * * *'  # Co 6 godzin
```

---

## ✅ CHECKLIST PRZED URUCHOMIENIEM

- [ ] Otwórz link: https://github.com/kabuto14pl/turbo-bot/actions/workflows/extended-test.yml
- [ ] Kliknij "Run workflow"
- [ ] Ustaw parametry (opcjonalnie)
- [ ] Kliknij "Run workflow" (zielony przycisk)
- [ ] Otwórz Actions tab: https://github.com/kabuto14pl/turbo-bot/actions
- [ ] Kliknij na running workflow aby zobaczyć live logi
- [ ] Poczekaj ~2h na zakończenie
- [ ] Pobierz artifacts z wynikami

---

## 🎉 GOTOWE!

**Test uruchomi się w chmurze GitHub bez potrzeby Codespace!**

**Dashboard działa równolegle i zapisuje wszystkie metryki do artifacts!**

**Zero kosztów (w ramach free tier 2000 min/miesiąc)!** 🚀

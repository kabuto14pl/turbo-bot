# 🤖 2-Hour Bot Stress Test - Dokumentacja

## 📋 Przegląd

System testowania długoterminowego dla autonomous trading bota z pełnym monitoringiem wydajności i metryk.

## 🎯 Cele Testów

1. **Stabilność 24/7** - Weryfikacja czy bot działa bez przerw przez 2 godziny
2. **Zarządzanie Pamięcią** - Sprawdzenie czy nie ma memory leaks
3. **Wydajność ML** - Monitoring czasu inferencji (<100ms)
4. **Zarządzanie Ryzykiem** - Weryfikacja limitów drawdown i circuit breakers
5. **Integralność Danych** - Sprawdzenie spójności portfolio tracking

## 🚀 Uruchamianie Testów

### GitHub Actions (Automatyczne)

Workflow uruchamia się automatycznie:
- **Push do main/master** - Pełny 2h test
- **Pull Request** - Pełny 2h test  
- **Manual Dispatch** - Konfigurowalny czas (domyślnie 2h)

#### Ręczne Uruchomienie:

1. Idź do **Actions** → **2-Hour Bot Stress Test**
2. Kliknij **Run workflow**
3. Wybierz opcje:
   - **Duration**: 120 minut (domyślnie) lub inna wartość
   - **Mode**: simulation (domyślnie) lub backtest

### Lokalnie (Skrypty)

#### Quick Test (5 minut):
```bash
./scripts/run_quick_test.sh
```

#### Pełny 2h Test:
```bash
# Domyślnie 120 minut, tryb simulation
./scripts/run_2h_stress_test.sh

# Niestandardowy czas (np. 60 minut)
./scripts/run_2h_stress_test.sh 60

# Niestandardowy tryb
./scripts/run_2h_stress_test.sh 120 backtest
```

## 📊 Zbierane Metryki

### Operacyjne
- ✅ **Trading Cycles** - Liczba ukończonych cykli tradingowych
- ✅ **Orders Placed** - Liczba złożonych zleceń
- ✅ **ML Predictions** - Liczba predykcji ML
- ✅ **Errors** - Liczba błędów
- ✅ **Warnings** - Liczba ostrzeżeń

### Wydajnościowe
- 📈 **Portfolio Value** - Zmiany wartości portfolio
- 💰 **PnL** - Profit and Loss tracking
- ⚠️ **Risk Events** - Zdarzenia związane z ryzykiem
- 🤖 **ML Confidence** - Poziomy pewności predykcji
- ⚡ **Performance** - Czasy wykonania operacji

### Zdrowia Systemu
- ✅ **Success Rate** - Procent udanych operacji
- ❌ **Failure Rate** - Procent nieudanych operacji
- ⏱️ **Response Times** - Czasy odpowiedzi systemów

## 📁 Struktura Logów

```
logs/
├── bot_stress_test_YYYYMMDD_HHMMSS.log   # Lokalnie
└── bot_output.log                         # GitHub Actions
```

### Lokalizacja w GitHub Actions:

Po zakończeniu testu:
1. Idź do **Actions** → wybierz run
2. Scroll w dół do **Artifacts**
3. Pobierz:
   - `bot-logs-{run_number}` - Pełne logi bota
   - `test-report-{run_number}` - Raport podsumowujący

## 🔍 Analiza Wyników

### Automatyczna Analiza

Workflow automatycznie wyświetla:

```
╔════════════════════════════════════════╗
║   2-HOUR BOT PERFORMANCE ANALYSIS      ║
╚════════════════════════════════════════╝

=== TRADING CYCLES COMPLETED ===
240  # ~2 cykle/minutę

=== ORDERS PLACED ===
45   # ~22.5 orderów/godzinę

=== ML PREDICTIONS ===
240  # Co cykl

=== ERRORS ===
0    # Target: 0!

=== WARNINGS ===
3    # Akceptowalne: <10
```

### Manualna Analiza Logów

```bash
# Sprawdź trading cycles
grep "executeTradingCycle" logs/bot_*.log | wc -l

# Sprawdź portfolio updates
grep -i "portfolio" logs/bot_*.log | tail -20

# Sprawdź błędy
grep -i "error" logs/bot_*.log

# Sprawdź PnL
grep -i "pnl" logs/bot_*.log | tail -20

# Sprawdź ML confidence
grep -i "confidence" logs/bot_*.log | tail -20
```

## ✅ Kryteria Sukcesu

### Must-Pass:
- ✅ **Zero Crashes** - Bot działa przez pełne 2h bez restartów
- ✅ **< 5 Errors** - Maksymalnie 5 błędów w całym teście
- ✅ **ML Latency < 100ms** - Wszystkie inferencje poniżej progu
- ✅ **Memory Stable** - Brak memory leaks (wzrost <10%)

### Highly Desired:
- 🎯 **> 200 Trading Cycles** - Minimum 2 cykle/minutę
- 🎯 **Positive PnL** - W trybie simulation pozytywny wynik
- 🎯 **No Circuit Breakers** - Brak aktywacji circuit breakers
- 🎯 **< 10 Warnings** - Minimalna liczba ostrzeżeń

## 🔧 Konfiguracja

### Environment Variables (.env):

```bash
MODE=simulation              # simulation | backtest | live
ENABLE_ML=true               # Włącz ML predictions
ENABLE_REAL_TRADING=false    # ZAWSZE false w testach!
TRADING_INTERVAL=30000       # 30s między cyklami
LOG_LEVEL=info               # debug | info | warn | error
TEST_DURATION_MINUTES=120    # Czas testu w minutach
```

### Workflow Inputs:

- `duration_minutes`: Czas trwania testu (default: 120)
- `trading_mode`: Tryb tradingu (default: simulation)

## 🐛 Troubleshooting

### Bot crashes immediately:
```bash
# Sprawdź błędy kompilacji
npm run build

# Sprawdź zależności
npm ci

# Sprawdź .env
cat .env
```

### High error rate:
```bash
# Sprawdź szczegóły błędów
grep -A 5 "Error" logs/bot_*.log

# Sprawdź ML system
grep -i "ml\|model" logs/bot_*.log
```

### Memory issues:
```bash
# Monitor pamięci podczas testu
watch -n 10 'ps aux | grep node'
```

## 📈 Przykładowe Wyniki

### Sukces (Good Run):
```
Trading Cycles: 242
Orders Placed: 48
ML Predictions: 242
Errors: 0
Warnings: 2
Final PnL: +$245.50
```

### Do Naprawy (Needs Fix):
```
Trading Cycles: 45
Orders Placed: 12
ML Predictions: 45
Errors: 15  ❌
Warnings: 42 ❌
Final PnL: -$1,245.00 ❌
```

## 🔄 Continuous Integration

Workflow integruje się z:
- ✅ Unit Tests (235 tests)
- ✅ Must-Pass Tests (54 tests)
- ✅ Performance Benchmarks
- ✅ Security Scans

## 📞 Support

Jeśli test nie przechodzi:
1. Sprawdź logi w Artifacts
2. Uruchom quick test lokalnie
3. Sprawdź must-pass tests
4. Zweryfikuj unit tests

---

**Ostatnia aktualizacja:** 2025-11-08
**Wersja:** 1.0.0
**Status:** ✅ Production Ready

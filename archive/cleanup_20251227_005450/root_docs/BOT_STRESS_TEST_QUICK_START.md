# 🤖 2-Hour Bot Stress Test - Quick Start

## 🚀 Szybki Start

### 1️⃣ Test Lokalny (5 minut)
```bash
./scripts/run_quick_test.sh
```

### 2️⃣ Test Pełny Lokalnie (2 godziny)
```bash
./scripts/run_2h_stress_test.sh
```

### 3️⃣ Test w GitHub Actions
1. Przejdź do repozytorium na GitHub
2. Kliknij zakładkę **Actions**
3. Wybierz **2-Hour Bot Stress Test** z lewego menu
4. Kliknij **Run workflow** (prawy górny róg)
5. Wybierz opcje:
   - Branch: `master`
   - Duration: `120` (minut)
   - Mode: `simulation`
6. Kliknij **Run workflow**

## 📊 Co Jest Testowane?

✅ **Stabilność** - Bot działa 2h bez crashów
✅ **Trading Cycles** - ~240 cykli (2/minutę)
✅ **ML System** - Predykcje z confidence >0.7
✅ **Risk Management** - Circuit breakers, drawdown limits
✅ **Portfolio Tracking** - PnL, balance, positions
✅ **Performance** - ML latency <100ms

## 📁 Gdzie Są Wyniki?

### Lokalnie:
```
logs/bot_stress_test_YYYYMMDD_HHMMSS.log
```

### GitHub Actions:
1. Przejdź do zakończonego workflow run
2. Scroll w dół do **Artifacts**
3. Pobierz:
   - `bot-logs-{number}` - Pełne logi
   - `test-report-{number}` - Raport

## ✅ Kryteria Sukcesu

```
✅ Zero crashes
✅ <5 błędów
✅ >200 trading cycles
✅ ML latency <100ms
✅ Brak memory leaks
```

## 📖 Pełna Dokumentacja

Zobacz: [docs/2H_BOT_STRESS_TEST.md](docs/2H_BOT_STRESS_TEST.md)

## 🎯 Obecny Status

```
Must-Pass Tests: 54/56 (96.4%) ✅
Unit Tests: 235/235 (100%) ✅
2h Stress Test: Ready to run! 🚀
```

## 🔧 Troubleshooting

**Problem:** Bot się nie uruchamia
```bash
npm ci
npm run build
cat .env
```

**Problem:** Dużo błędów
```bash
grep "Error" logs/bot_*.log | head -20
```

**Problem:** Workflow failed
- Sprawdź logi w Actions tab
- Pobierz artifacts
- Uruchom quick test lokalnie

---

**Ready to test?** Uruchom quick test: `./scripts/run_quick_test.sh` 🚀

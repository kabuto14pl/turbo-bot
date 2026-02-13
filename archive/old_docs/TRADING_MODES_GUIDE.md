# 🎯 PRZEWODNIK TRYBÓW TRADING BOTA
## Wszystkie Dostępne Tryby Operacyjne

**Bot obsługuje 3 główne tryby operacyjne:**

---

## 🔧 DOSTĘPNE TRYBY

### 1. 📊 **DEMO MODE (Symulacja)**
```bash
npm run start:demo
# lub
TRADING_MODE=demo npm run start:enterprise
```

**Charakterystyka:**
- ✅ **Symulowane transakcje** - żadne realne pieniądze
- ✅ **Realne dane rynkowe** - aktualne ceny i wolumeny  
- ✅ **Pełna funkcjonalność** - wszystkie strategie i ML
- ✅ **Risk management** - testowanie limitów bez ryzyka
- ✅ **Portfolio tracking** - śledzenie wirtualnego portfolia
- ✅ **Idealny do nauki** i testowania strategii

### 2. 🔍 **BACKTEST MODE (Dane Historyczne)**
```bash
npm run start:backtest  
# lub
TRADING_MODE=backtest npm run start:enterprise
```

**Charakterystyka:**
- ✅ **Dane historyczne** - testowanie na przeszłych cenach
- ✅ **Szybka walidacja** strategii
- ✅ **Analiza wydajności** - metryki Sharpe, drawdown
- ✅ **Optymalizacja parametrów** - znajdowanie najlepszych ustawień
- ✅ **Bez opóźnień rynkowych** - maksymalna szybkość testowania
- ✅ **Statystyki enterprise** - pełne raporty wydajności

### 3. 💰 **PRODUCTION MODE (Realne Pieniądze)**
```bash
npm run start:production
# lub  
NODE_ENV=production TRADING_MODE=production npm run start:enterprise
```

**⚠️ UWAGA: TRYB PRODUKCYJNY - REALNE PIENIĄDZE!**

**Charakterystyka:**
- 🚨 **Realne transakcje** - prawdziwe pieniądze na giełdzie
- 🚨 **Realne zyski/straty** - pełne ryzyko finansowe
- ✅ **Enterprise monitoring** - pełny audit trail
- ✅ **Emergency stop** - systemy bezpieczeństwa
- ✅ **Compliance** - zgodność z regulacjami
- ✅ **Risk management** - aktywne limity ryzyka

---

## 🛡️ BEZPIECZEŃSTWO TRYBU PRODUKCYJNEGO

### Wymagana Konfiguracja przed Live Trading:

1. **Klucze API OKX:**
```env
OKX_API_KEY=your_real_api_key
OKX_SECRET_KEY=your_real_secret  
OKX_PASSPHRASE=your_real_passphrase
OKX_SANDBOX=false  # ⚠️ KRYTYCZNE: false dla produkcji
```

2. **Limity Bezpieczeństwa:**
```env
RISK_LEVEL=conservative  # conservative/medium/aggressive
MAX_POSITION_SIZE=1000   # Max wielkość pozycji w USD
MAX_DAILY_LOSS=500       # Max dzienna strata w USD  
STOP_LOSS_PERCENTAGE=5   # Stop loss w %
```

3. **Monitoring:**
```env
ENABLE_LIVE_TRADING=true    # Explicitly enable live trading
TEST_MODE=false            # Must be false for real money
LOG_LEVEL=info            # Full logging for audit
```

---

## 🚀 PRZYKŁADY URUCHOMIENIA

### Demo Trading (Bezpieczny Start):
```bash
# Podstawowe demo
npm run start:demo

# Demo z custom port
API_PORT=3001 npm run start:demo

# Demo z increased logging
LOG_LEVEL=debug npm run start:demo
```

### Backtest (Analiza Historyczna):
```bash
# Standardowy backtest
npm run start:backtest

# Backtest z custom period
START_DATE=2024-01-01 END_DATE=2024-12-31 npm run start:backtest

# Backtest z specific strategy
STRATEGY=RSITurbo npm run start:backtest
```

### Production (⚠️ Realne Pieniądze):
```bash
# ⚠️ UWAGA: Tylko po pełnej konfiguracji!
npm run start:production

# Production with monitoring
NODE_ENV=production TRADING_MODE=production npm run start:enterprise
```

---

## 📊 PRZEŁĄCZANIE TRYBÓW W RUNTIME

Bot pozwala na przełączanie trybów przez API:

```bash
# Przełącz na demo
curl -X POST http://localhost:3000/api/trading/start \
  -H "Content-Type: application/json" \
  -d '{"mode": "demo"}'

# Przełącz na backtest  
curl -X POST http://localhost:3000/api/trading/start \
  -H "Content-Type: application/json" \
  -d '{"mode": "backtest"}'

# ⚠️ Przełącz na produkcję (OSTROŻNIE!)
curl -X POST http://localhost:3000/api/trading/start \
  -H "Content-Type: application/json" \
  -d '{"mode": "production"}'
```

---

## 🎯 REKOMENDACJE

### Dla Początkujących:
1. **Zacznij od DEMO** - naucz się obsługi bez ryzyka
2. **Przetestuj strategie** - sprawdź różne ustawienia  
3. **Przeprowadź backtesty** - zwaliduj na danych historycznych
4. **Dopiero potem produkcja** - gdy jesteś pewny strategii

### Dla Zaawansowanych:
1. **Demo dla nowych strategii** - test każdej zmiany
2. **Backtest dla optymalizacji** - znajdź najlepsze parametry
3. **Production z małymi kwotami** - start z niskim ryzykiem
4. **Skaluj stopniowo** - zwiększaj pozycje z doświadczeniem

---

## ⚠️ OSTRZEŻENIA BEZPIECZEŃSTWA

### 🚨 PRZED URUCHOMIENIEM TRYBU PRODUKCYJNEGO:

1. **✅ Przetestuj strategie w demo** przez co najmniej tydzień
2. **✅ Przeprowadź backtesty** na różnych okresach rynkowych  
3. **✅ Ustaw conservatywne limity** ryzyka na start
4. **✅ Sprawdź emergency stop** - czy działa poprawnie
5. **✅ Skonfiguruj monitoring** - alerty i powiadomienia
6. **✅ Zacznij od małych kwot** - testuj z minimalnym ryzykiem

### 🛑 NIGDY NIE:
- Nie uruchamiaj produkcji bez testów w demo
- Nie używaj wszystkich środków na start
- Nie wyłączaj limitów bezpieczeństwa
- Nie ignoruj alertów ryzyka
- Nie zostawiaj bota bez nadzoru na początku

---

**💡 PAMIĘTAJ: Trading na rynkach finansowych zawsze wiąże się z ryzykiem straty kapitału. Bot nie gwarantuje zysków!**

---
Generated: $(date)

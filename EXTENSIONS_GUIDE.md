# 🚀 PRAKTYCZNY PRZEWODNIK - EXTENSIONS W AKCJI

## 📋 CODZIENNE WORKFLOW Z ROZSZERZENIAMI

### **SCENARIUSZ 1: Rozwój nowej strategii tradingowej**

```
1. NAPISZ KOD:
   - Otwórz nowy plik: new-strategy.ts
   - Wpisz: "strategy" + Tab → snippet tworzy pełny szablon
   - npm Intellisense → auto-complete importów
   
2. SZYBKI TEST:
   - Ctrl+Alt+N (Code Runner) → test logiki bez uruchamiania bota
   - Zobacz output w terminalu
   
3. DEBUGOWANIE:
   - Zaznacz zmienną → Ctrl+Alt+L (Turbo Console Log)
   - F5 → Debug z breakpointem
   - Variables panel → inspekcja stanu
   
4. TYPE CHECK:
   - Ctrl+Shift+C → TypeScript Type Check task
   - Problems panel → zobacz błędy
   
5. TESTY:
   - Ctrl+Shift+T → Run All Tests
   - Test Explorer → visual UI
   - Coverage → Code Coverage extension pokazuje %
   
6. COMMIT:
   - Ctrl+Alt+D → usuń console.log (Turbo Console Log)
   - Git panel → commit
```

---

### **SCENARIUSZ 2: Testowanie API bota**

```
1. URUCHOM BOT:
   - Ctrl+Shift+S → Start Bot (Simulation)
   - Czekaj na "Health server running"
   
2. THUNDER CLIENT:
   - Kliknij ikonę pioruna w lewym panelu
   - Collections → "Trading Bot API"
   - Kliknij "Health Check" → Send
   - Zobacz response w czasie rzeczywistym
   
3. TEST RÓŻNYCH ENDPOINTS:
   ✅ Health Check → sprawdź czy bot żyje
   ✅ Portfolio Status → zobacz portfolio
   ✅ Ensemble ML Status → stan ML
   ✅ Trade History → ostatnie transakcje
   
4. POST REQUESTS:
   - Portfolio Optimization → test rebalancingu
   - Backtest Validation → walidacja strategii
   
5. AUTOMATYCZNE TESTY:
   - Thunder Client ma wbudowane "Tests"
   - Automatycznie sprawdza response
```

**PRZYKŁAD - Testowanie portfolio optimization:**
```
POST http://localhost:3001/api/portfolio/optimization
Body:
{
  "method": "markowitz",
  "constraints": {
    "min_weight": 0.05,
    "max_weight": 0.40
  }
}

Expected Response:
{
  "weights": { "BTC-USDT": 0.30, "ETH-USDT": 0.25, ... },
  "expected_return": 0.15,
  "sharpe": 1.8
}
```

---

### **SCENARIUSZ 3: Refaktoryzacja kodu**

```
1. JAVASCRIPT BOOSTER:
   - Zaznacz kod
   - Ctrl+. → Quick Fix
   - Zobacz dostępne refaktoryzacje:
     • Extract to function
     • Convert to arrow function
     • Split into declaration and initialization
     • Flip if/else
     • Remove redundant else
   
2. PRZYKŁAD:
   PRZED:
   function calculateRisk(price, stopLoss) {
     if (price > stopLoss) {
       return (price - stopLoss) / price;
     } else {
       return 0;
     }
   }
   
   PO (Ctrl+. → "Remove redundant else"):
   function calculateRisk(price, stopLoss) {
     if (price > stopLoss) {
       return (price - stopLoss) / price;
     }
     return 0;
   }
   
3. npm Intellisense:
   - Pisz import { ... } from "
   - Auto-complete pokazuje dostępne pakiety
   - Automatycznie dodaje do package.json
```

---

### **SCENARIUSZ 4: Monitoring produkcyjności (WakaTime)**

```
1. AUTOMATYCZNY TRACKING:
   - WakaTime śledzi automatycznie czas w VSCode
   - Nie musisz nic robić!
   
2. DASHBOARD:
   - Otwórz: https://wakatime.com/dashboard
   - Zobacz statystyki:
     • Czas kodowania dzisiaj
     • Najbardziej edytowane pliki
     • Języki programowania
     • Projekty
   
3. INSIGHTS:
   - Który dzień najbardziej produktywny?
   - Które pliki najwięcej czasu?
   - O której godzinie najbardziej efektywny?
   
4. GOAL TRACKING:
   - Ustaw cele (np. 4h/dzień)
   - WakaTime przypomni jeśli nie osiągniesz
```

---

### **SCENARIUSZ 5: Test Coverage Analysis**

```
1. URUCHOM TESTY Z COVERAGE:
   - Terminal → Run Task → "🎯 Run Tests with Coverage"
   - LUB: npm run test:coverage
   
2. CODE COVERAGE EXTENSION:
   - Automatycznie podświetla w edytorze:
     🟢 Zielone linie = pokryte testami
     🔴 Czerwone linie = NIE pokryte
     🟡 Żółte linie = częściowo pokryte
   
3. COVERAGE REPORT:
   - Otwórz: coverage/lcov-report/index.html
   - Zobacz szczegółowy raport HTML
   
4. IMPROVE COVERAGE:
   - Kliknij na czerwone linie
   - Dodaj testy dla niepokrytego kodu
   - Re-run coverage → zobacz poprawę
```

---

### **SCENARIUSZ 6: Szybka nawigacja z npm Intellisense**

```
1. AUTO-IMPORT:
   - Zacznij pisać nazwę klasy/funkcji
   - npm Intellisense podpowiada import
   - Tab → automatycznie dodaje import na górze
   
2. PRZYKŁAD:
   Piszesz: EnsemblePrediction
   Intellisense pokazuje:
   → import { EnsemblePredictionEngine } from './ml/ensemble_prediction_engine'
   
   Tab → import automatycznie dodany!
   
3. PACKAGE.JSON INTEGRATION:
   - Pisz import z nowego pakietu
   - Intellisense pyta: "Add to package.json?"
   - Yes → automatycznie dodaje dependency
```

---

## 🎯 WORKFLOW DLA RÓŻNYCH ZADAŃ

### **A. DODAWANIE NOWEJ STRATEGII:**

```typescript
// 1. Otwórz nowy plik: momentum_strategy.ts
// 2. Wpisz: strategy + Tab (snippet)
// 3. Auto-complete importy (npm Intellisense)
// 4. Napisz logikę
// 5. Ctrl+Alt+N → szybki test (Code Runner)
// 6. F5 → debug z breakpointem
// 7. Ctrl+Shift+T → run tests
// 8. Code Coverage → sprawdź pokrycie
// 9. Ctrl+Alt+D → usuń console.log
// 10. Git commit
```

### **B. DEBUGGING ISTNIEJĄCEGO KODU:**

```typescript
// 1. Otwórz plik z problemem
// 2. Zaznacz zmienne → Ctrl+Alt+L (logi)
// 3. F5 → debug
// 4. Breakpoint na podejrzanej linii
// 5. Step Over (F10) → krok po kroku
// 6. Variables panel → inspekcja wartości
// 7. Watch → dodaj wyrażenia
// 8. Napraw bug
// 9. Ctrl+Alt+D → usuń logi
```

### **C. TESTOWANIE API:**

```
// 1. Ctrl+Shift+S → start bot
// 2. Thunder Client → ikona pioruna
// 3. Collections → wybierz request
// 4. Send → zobacz response
// 5. Modify request → test różnych scenariuszy
// 6. Save as collection → reuse później
```

### **D. ANALIZA PERFORMANCE:**

```
// 1. WakaTime Dashboard → czas pracy
// 2. Thunder Client → test API response time
// 3. Code Coverage → znajdź niepokryty kod
// 4. JavaScript Booster → refaktoryzuj nieefektywny kod
```

---

## 💡 PRO TIPS

### **1. Code Runner - Szybkie eksperymenty:**
```typescript
// test-idea.ts
const testData = [10, 20, 30, 40, 50];
const average = testData.reduce((a, b) => a + b) / testData.length;
console.log('Average:', average);
// Ctrl+Alt+N → instant result!
```

### **2. Thunder Client - Environment Variables:**
```json
{
  "local": {
    "baseUrl": "http://localhost:3001",
    "apiKey": "test-key"
  },
  "production": {
    "baseUrl": "http://64.226.70.149:3001",
    "apiKey": "{{prodKey}}"
  }
}
```
Przełączaj między local/prod jednym kliknięciem!

### **3. Turbo Console Log - Custom Prefix:**
Settings → "turboConsoleLog.logMessagePrefix":
```
"🤖 [BOT]"
```
Wszystkie logi będą: `console.log("🤖 [BOT] variableName:", variableName);`

### **4. Test Explorer - Run Single Test:**
```
1. Test Explorer → rozwiń drzewo testów
2. Kliknij ▶ przy konkretnym teście
3. Debug 🐛 pojedynczy test
4. Zobacz tylko ten output
```

### **5. npm Intellisense - Relative Paths:**
```typescript
import { Strategy } from './stra' // <- Tab
// Auto-complete: './strategies/advanced_strategy'
```

---

## 📊 REAL-WORLD EXAMPLES

### **PRZYKŁAD 1: Bug Hunting**

**Problem:** Portfolio value nieprawidłowy

**Workflow:**
```typescript
// 1. trading-bot/AutonomousTradingBot.ts, linia 350
const portfolioValue = this.portfolio.totalValue;
// ↑ Zaznacz, Ctrl+Alt+L

// 2. F5 → Debug
// 3. Breakpoint na linii 350
// 4. Variables → sprawdź this.portfolio
// 5. Zobacz że totalValue = 0
// 6. Step Into (F11) → wejdź do calculateValue()
// 7. Znajdź bug: nie sumuje positions
// 8. Napraw kod
// 9. Ctrl+Alt+D → usuń logi
```

### **PRZYKŁAD 2: API Performance Testing**

**Cel:** Sprawdź czy ML prediction < 100ms

**Thunder Client:**
```
GET http://localhost:3001/api/ensemble/status

Response Time: 87ms ✅
Response:
{
  "accuracy": 0.67,
  "models": 3,
  "inference_time": 85
}
```

Jeśli > 100ms → optymalizuj model!

### **PRZYKŁAD 3: Coverage Improvement**

**Przed:**
```
Coverage: 65%
Red lines w risk_manager.ts
```

**Workflow:**
```
1. Code Coverage → kliknij na czerwoną linię
2. Zobacz: drawdown calculation nie pokryty
3. Napisz test:
   test('should calculate drawdown correctly', () => {
     expect(calculateDrawdown(...)).toBe(0.15);
   });
4. Ctrl+Shift+T → run tests
5. Code Coverage → linia teraz zielona! ✅
6. Coverage: 75% 🎉
```

---

## 🚀 DAILY CHECKLIST

**RANO:**
- [ ] WakaTime → sprawdź cele na dziś
- [ ] Thunder Client → Health Check na VPS
- [ ] Git pull → sync z repo

**PODCZAS PRACY:**
- [ ] Code Runner → szybkie testy idei
- [ ] Turbo Console Log → debugowanie
- [ ] npm Intellisense → auto-imports
- [ ] JavaScript Booster → refaktoryzacje

**PRZED COMMITEM:**
- [ ] Ctrl+Shift+C → Type Check
- [ ] Ctrl+Shift+T → Run Tests
- [ ] Code Coverage → > 80%
- [ ] Ctrl+Alt+D → usuń console.log
- [ ] Git commit

**WIECZOREM:**
- [ ] WakaTime → review czasu pracy
- [ ] Thunder Client → test API na VPS
- [ ] Coverage Report → sprawdź postęp

---

## ⚡ KEYBOARD SHORTCUTS SUMMARY

| Shortcut | Extension | Akcja |
|----------|-----------|-------|
| **Ctrl+Alt+N** | Code Runner | Uruchom plik |
| **Ctrl+Alt+L** | Turbo Console Log | Dodaj log |
| **Ctrl+Alt+D** | Turbo Console Log | Usuń wszystkie logi |
| **Ctrl+Alt+C** | Turbo Console Log | Zakomentuj logi |
| **Ctrl+.** | JavaScript Booster | Quick Fix / Refactor |
| **Ctrl+Shift+T** | Tasks | Run All Tests |
| **Ctrl+Shift+S** | Tasks | Start Bot |
| **Ctrl+Shift+H** | Tasks | Health Check |

---

**🎉 TERAZ MASZ PEŁNY ARSENAL NARZĘDZI! POWODZENIA!**

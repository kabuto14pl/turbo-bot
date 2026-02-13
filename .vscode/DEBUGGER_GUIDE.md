# VS Code Debugger - Quick Guide

## 🎯 Jak Używać Debuggera w VS Code

### 🚀 Szybki Start

1. **Otwórz panel Debug**: `Ctrl+Shift+D` (Windows/Linux) lub `Cmd+Shift+D` (Mac)
2. **Wybierz konfigurację** z dropdown (góra panelu)
3. **Kliknij zielony przycisk** ▶️ lub naciśnij `F5`

### 📋 Dostępne Konfiguracje

#### 🤖 Trading Bot

| Nazwa | Opis | Kiedy Użyć |
|-------|------|------------|
| **🤖 Debug Trading Bot (Main)** | Tryb symulacji | Normalne debugowanie podczas developmentu |
| **🚀 Debug Trading Bot (Production)** | Tryb live | Testowanie przed wdrożeniem na produkcję |
| **🔬 Debug Trading Bot (Backtest)** | Tryb backtest | Testowanie strategii na danych historycznych |

#### 🌐 Enterprise Server

| Nazwa | Opis |
|-------|------|
| **🌐 Debug Enterprise Server** | Debugowanie API na porcie 3000 |

#### 📄 Current File

| Nazwa | Opis |
|-------|------|
| **📄 Debug Current TS File** | Debuguje aktualnie otwarty plik TypeScript |

#### 🧪 Tests

| Nazwa | Opis |
|-------|------|
| **🧪 Debug Jest Tests (Current File)** | Debuguje testy w aktualnym pliku |
| **🧪 Debug Jest Tests (All)** | Uruchamia wszystkie testy |
| **🧪 Debug Jest Tests (Watch Mode)** | Testy w trybie watch (auto-reload) |

#### 🎯 Specific Components

| Nazwa | Opis |
|-------|------|
| **🧠 Debug ML System** | Debugowanie systemu ML |
| **📊 Debug Risk Manager** | Debugowanie risk managera |

#### 🔗 Attach

| Nazwa | Opis |
|-------|------|
| **🔗 Attach to Node Process** | Podłącz do działającego procesu Node.js |
| **🔗 Attach to Remote Process** | Podłącz do zdalnego procesu |
| **🐳 Debug in Docker Container** | Debugowanie w kontenerze Docker |

#### ⚡ Performance

| Nazwa | Opis |
|-------|------|
| **⚡ Profile Bot Performance** | Profilowanie wydajności bota |
| **🔍 Debug with Inspect** | Debugowanie z Node.js inspector |

#### 🚀 Compound (Wiele na raz)

| Nazwa | Opis |
|-------|------|
| **🚀 Full System (Bot + Server)** | Bot + Enterprise Server razem |
| **🧪 Test + Bot** | Testy + Bot w watch mode |

## 🛑 Breakpoints - Punkty Zatrzymania

### Jak Ustawić Breakpoint

1. **Kliknij na marginesie** (lewa strona numeru linii) - pojawi się czerwona kropka
2. **Lub naciśnij `F9`** na linii
3. **Warunkowy breakpoint**: Prawy klik → "Add Conditional Breakpoint"

### Rodzaje Breakpointów

```typescript
// ✅ Zwykły breakpoint - zatrzyma się za każdym razem
function calculateRisk(amount: number) {
  return amount * 0.02; // ← Kliknij tutaj
}

// ✅ Warunkowy breakpoint - tylko gdy warunek spełniony
// Prawy klik → Conditional Breakpoint → "amount > 1000"
function processOrder(amount: number) {
  const risk = calculateRisk(amount); // ← Tylko gdy amount > 1000
  return risk;
}

// ✅ Logpoint - loguje bez zatrzymywania
// Prawy klik → Logpoint → "Amount: {amount}, Risk: {risk}"
function executeOrder(amount: number) {
  const risk = calculateRisk(amount); // ← Zaloguje bez stop
  return { amount, risk };
}
```

### Breakpoint Actions

- **Disable**: Prawy klik → Disable Breakpoint (szara kropka)
- **Remove**: Kliknij na czerwoną kropkę lub `F9`
- **Remove All**: Debug panel → Remove All Breakpoints

## ▶️ Debug Controls

Podczas debugowania (gdy kod zatrzyma się):

| Przycisk | Skrót | Akcja |
|----------|-------|-------|
| ▶️ Continue | `F5` | Kontynuuj do następnego breakpointa |
| ⤵️ Step Over | `F10` | Wykonaj linię (nie wchodź do funkcji) |
| ⤴️ Step Into | `F11` | Wejdź do funkcji |
| ⤴️ Step Out | `Shift+F11` | Wyjdź z funkcji |
| 🔄 Restart | `Ctrl+Shift+F5` | Restart debuggera |
| ⏹️ Stop | `Shift+F5` | Zatrzymaj debugowanie |

## 📊 Debug Panel - Sekcje

### 1. Variables (Zmienne)

Pokazuje wszystkie zmienne w aktualnym scope:

```
▼ Local
  › amount: 1500
  › risk: 30
  › portfolio: Object {...}
    › balance: 10000
    › positions: Array(5)
▼ Closure
  › this: AutonomousTradingBot
▼ Global
  › process: Object {...}
```

**Tip**: Hover na zmienną w kodzie aby zobaczyć wartość!

### 2. Watch (Obserwowane)

Dodaj własne wyrażenia do śledzenia:

1. Kliknij "+" w sekcji WATCH
2. Wpisz wyrażenie: `portfolio.balance * 0.02`
3. Zobacz wartość na żywo podczas debugowania

**Przydatne watch expressions:**
```javascript
portfolio.balance
positions.length
currentPrice > targetPrice
riskLevel >= maxRisk
```

### 3. Call Stack (Stos wywołań)

Pokazuje jak dotarłeś do aktualnego miejsca:

```
calculatePositionSize (risk_manager.ts:45)
executeStrategy (strategy.ts:120)
tradingCycle (autonomous_trading_bot_final.ts:890)
main (autonomous_trading_bot_final.ts:1150)
```

Kliknij na dowolną funkcję aby zobaczyć jej context!

### 4. Breakpoints

Lista wszystkich breakpointów:

- ✅ Enabled (czerwona kropka)
- ⚪ Disabled (szara kropka)
- ⚠️ Unverified (nie może znaleźć kodu)

## 🎯 Praktyczne Przykłady

### Przykład 1: Debugowanie Trading Loop

```typescript
// 1. Ustaw breakpoint na linii 890 (tradingCycle)
async executeTradingCycle(): Promise<void> {
  console.log('Starting trading cycle...'); // ← BREAKPOINT HERE
  
  // 2. Naciśnij F5 aby uruchomić
  // 3. Kod zatrzyma się tutaj
  // 4. Sprawdź variables panel
  // 5. Użyj F10 aby przejść linię po linii
  
  const marketData = await this.getMarketData();
  const signals = await this.generateSignals(marketData);
  const orders = await this.executeOrders(signals);
}
```

### Przykład 2: Warunkowy Breakpoint dla High Risk

```typescript
function checkRisk(amount: number): boolean {
  const riskLevel = amount * 0.02;
  
  // Prawy klik → Conditional Breakpoint
  // Warunek: riskLevel > 200
  return riskLevel < maxRisk; // ← CONDITIONAL BREAKPOINT
}
```

### Przykład 3: Logpoint dla Monitoring

```typescript
function executeOrder(order: Order): void {
  // Prawy klik → Logpoint
  // Message: "Executing order: {order.symbol} @ {order.price}"
  
  const result = this.broker.execute(order); // ← LOGPOINT
  
  // Logpoint wypisze do konsoli bez zatrzymywania!
}
```

### Przykład 4: Watch Expression dla Portfolio

```typescript
// W sekcji WATCH dodaj:
// 1. portfolio.balance
// 2. portfolio.positions.length
// 3. portfolio.totalPnL
// 4. riskManager.currentRisk

async tradingCycle() {
  // Watch expressions będą update'owane na żywo!
  await this.updatePortfolio();
  await this.checkRisk();
}
```

## 🐛 Typowe Problemy i Rozwiązania

### Problem: Breakpoint nie zatrzymuje kodu

**Rozwiązanie:**
1. Sprawdź czy breakpoint jest enabled (czerwona kropka)
2. Upewnij się że uruchomiłeś z `F5` (nie `npm start`)
3. Sprawdź czy plik jest skompilowany (sourceMaps: true)
4. Restart VS Code

### Problem: Variables pokazują "undefined"

**Rozwiązanie:**
1. Użyj `Step Into (F11)` zamiast `Step Over (F10)`
2. Sprawdź czy zmienna jest w scope
3. Użyj watch expression aby monitorować

### Problem: "Cannot find module" podczas debug

**Rozwiązanie:**
1. Uruchom `npm install`
2. Sprawdź `tsconfig.json` - paths
3. Restart VS Code
4. Check `.env` file exists

### Problem: Debugger nie zatrzymuje się w testach

**Rozwiązanie:**
1. Użyj konfiguracji "🧪 Debug Jest Tests"
2. NIE uruchamiaj przez terminal
3. Otwórz plik testu przed debugowaniem
4. Sprawdź czy test faktycznie się wykonuje

## ⚡ Pro Tips

### 1. Debug Console

Podczas zatrzymania możesz wykonywać kod:

```javascript
// W Debug Console (na dole):
> portfolio.balance
10000
> portfolio.balance * 0.02
200
> console.log(positions)
[Array of positions]
```

### 2. Skipping Files

Unikaj wchodzenia do `node_modules`:

```json
"skipFiles": [
  "<node_internals>/**",
  "node_modules/**"
]
```

### 3. Auto Attach

Enable w VS Code settings:

```
File → Preferences → Settings
Search: "auto attach"
Set to: "smart" or "always"
```

### 4. Keyboard Shortcuts

Zapamiętaj:
- `F5` - Continue/Start
- `F9` - Toggle Breakpoint
- `F10` - Step Over
- `F11` - Step Into
- `Shift+F11` - Step Out
- `Ctrl+Shift+D` - Open Debug Panel

### 5. Multiple Sessions

Możesz debugować wiele rzeczy naraz:

1. Start "🤖 Debug Trading Bot"
2. Start "🌐 Debug Enterprise Server"
3. Obie sesje działają równolegle!

### 6. Remote Debugging

Dla VPS/Remote server:

```bash
# Na serwerze:
node --inspect=0.0.0.0:9229 dist/autonomous_trading_bot_final.js

# W VS Code:
# Użyj: "🔗 Attach to Remote Process"
# Address: YOUR_VPS_IP
# Port: 9229
```

## 📚 Przydatne Linki

- **VS Code Debug Docs**: https://code.visualstudio.com/docs/editor/debugging
- **Node.js Debugging**: https://nodejs.org/en/docs/guides/debugging-getting-started/
- **TypeScript Debugging**: https://code.visualstudio.com/docs/typescript/typescript-debugging

## 🎯 Workflow Przykładowy

### Daily Development:

1. **Otwórz plik** który chcesz debugować
2. **Ustaw breakpoint** (`F9`)
3. **Wybierz konfigurację**: "📄 Debug Current TS File"
4. **Start debug** (`F5`)
5. **Step through** (`F10`, `F11`)
6. **Inspect variables** (hover lub Variables panel)
7. **Test fix** (Continue `F5`)
8. **Stop** (`Shift+F5`)

### Bug Fixing:

1. **Odtwórz bug** - uruchom kod który failuje
2. **Ustaw breakpoint** przed miejscem błędu
3. **Start debug** (`F5`)
4. **Inspect state** - sprawdź zmienne
5. **Watch expressions** - dodaj podejrzane wartości
6. **Step through** - znajdź gdzie coś idzie nie tak
7. **Fix code** - napraw bug
8. **Verify** - uruchom ponownie

### Performance Profiling:

1. **Wybierz**: "⚡ Profile Bot Performance"
2. **Run** - pozwól botowi działać
3. **Stop** po chwili
4. **Analyze** - sprawdź `isolate-*.log`
5. **Optimize** - popraw powolne miejsca

---

**🎉 Gratulacje! Masz teraz profesjonalny debugger setup!**

Użyj `F5` aby zacząć debugowanie! 🚀

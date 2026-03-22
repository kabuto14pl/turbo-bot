# CLAUDE-SKYNET ULTIMATE PROFITABILITY AUDIT v2026-03
## TURBO-BOT v6.0.0 — Surgical Teardown

```
CLAUDE-SKYNET v1.0 – Turbo-Bot Evolution
Skille: #02-skynet-architect, #08-code-reviewer, #09-system-debugger, #11-backtest-validator
```

> **Data audytu:** 2026-03-13  
> **Środowisko:** VPS 64.226.70.149, 8 procesów PM2, 5 botów (BTC/ETH/SOL/BNB/XRP)  
> **Tryb:** SIMULATION (paper trading)  
> **Kapitał:** $10,000  
> **Model LLM:** qwen3:14b via Ollama SSH tunnel  
> **GPU:** CPU FALLBACK (brak CUDA na VPS)  

---

## 🔴 EXECUTIVE SUMMARY — OCENA: 2/10

System jest **architektonicznie wadliwy** na poziomie fundamentalnym. Wszystkich 5 botów dzieli ten sam stan portfolio (60 tradów, wszystkie XRPUSDT). NeuronAI (LLM) traci pieniądze z WinRate 20%. GPU pracuje na CPU. System prompt LLM wymusza agresywny trading.

**Stan faktyczny:**
- **realizedPnL:** -$34.51 (wspólna wartość dla WSZYSTKICH 5 instancji)
- **WinRate:** 35.7% (42 zamknięte z 60 tradów) — ale to dane TYLKO z XRP
- **NeuronAI PnL:** -$72.77 | 20% WR | 41 override'ów z 1342 decyzji
- **Aktywne pary:** W praktyce TYLKO XRP handluje, reszta ma kontaminowany state
- **Sharpe:** Nie da się obliczyć — brak izolowanych danych per pair
- **Max Drawdown:** ~0.35% (mały bo simulation z małym sizing)

---

## 🔴 P0 — KRYTYCZNE BLOKERY (MUSZĄ BYĆ NAPRAWIONE NATYCHMIAST)

### P0-1: KONTAMINACJA STANU PORTFOLIO — WSZYSTKIE 5 BOTÓW IDENTYCZNE

**Severity:** KRYTYCZNY — Kompletnie uniemożliwia działanie multi-pair  
**Plik:** `trading-bot/src/modules/portfolio-manager.js` linie 240-250  
**Plik:** `trading-bot/src/modules/state-persistence.js` linie 20-22

**Objaw:** API na portach 3001-3005 zwraca IDENTYCZNE dane:
- 60 tradów, XRPUSDT, instanceId "xrp-live"
- Identyczny realizedPnL, winRate, totalValue
- Portfolio coordinator: ALL 5 instances reportują pozycje XRPUSDT

**Root cause:**
```javascript
// portfolio-manager.js:240-248
restoreState(state) {
    if (state.portfolio) this.portfolio = { ...this.portfolio, ...state.portfolio };
    if (state.portfolioBalance) this.balance = state.portfolioBalance;
    if (state.positions && state.positions.length > 0) this.positions = new Map(state.positions);
    if (state.trades) this.trades = state.trades;  // ← ŁADUJE WSZYSTKIE TRADES BEZ FILTROWANIA PO SYMBOLU
}
```

`restoreState()` ładuje ALL trades z pliku stanu bez sprawdzania `instanceId` ani `symbol`. Podczas restartu PM2 stare pliki zawierające XRP trades zostały załadowane do wszystkich 5 instancji.

**Fix w PATCH #162 poniżej.**

---

### P0-2: PLIKI STANU NIE ZAPISUJĄ SIĘ NA DYSK

**Severity:** KRYTYCZNY — Restart = utrata stanu  
**Plik:** `trading-bot/src/modules/state-persistence.js` linie 19-23

**Objaw:** `find /root/turbo-bot -name 'bot_state_*'` — zero plików mimo `save()` co 30s.  
**Logi:** `[STATE] ✅ Restored (age: 0.2min)` przy starcie (pliki istniały, teraz nie).

**Hipoteza:** Ścieżka `/root/turbo-bot/data/` może nie istnieć po deploy'u, a `fs.mkdirSync` w konstruktorze nie jest wywoływany jeśli StatePersistence jest keszowane. Albo `fs.writeFileSync` po cichu failuje (np. pełny disk, permissions).

**Fix:** Dodaj error logging z pełną ścieżką do `save()` i weryfikację `existsSync` w `save()`.

---

### P0-3: FAŁSZYWY PnL NA OTWARCIU — PODWÓJNE LICZENIE OPŁAT

**Severity:** WYSOKI — Zaburza WSZYSTKIE metryki  
**Plik:** `trading-bot/src/modules/execution-engine.js` linie 493-494 (BUY), 525-526 (SELL), 539-541

**Objaw:** Każde `[EXEC DONE]` loguje ujemne PnL (= negatywny fees), co dodaje do `realizedPnL`.

```javascript
// execution-engine.js:493 (BUY) i :525 (SELL)
trade.pnl = -fees;      // ← Zapisuje -fee jako PnL otwarcia

// execution-engine.js:539-541
this.pm.portfolio.realizedPnL += trade.pnl; // ← Dodaje -fee do realized PnL na OTWARCIU
```

**Problem:** Na otwarciu pozycji PnL powinno być ZERO. Fee powinno być odliczane raz: na zamknięciu (jako koszt round-trip). Obecne zachowanie:
1. Otwarcie: `realizedPnL -= fee` (jako trade open)
2. Zamknięcie: `realizedPnL += (closePrice - openPrice) * qty - fee` (w closePosition)
3. Rezultat: Fee odliczone 2x

**Fix w PATCH #164 poniżej.**

---

### P0-4: SYSTEM_PROMPT LLM — AGRESYWNY MANDAT TRADINGOWY

**Severity:** WYSOKI — LLM wymuszany do otw. pozycji  
**Plik:** `trading-bot/src/core/ai/neuron_ai_manager.js` linie 72-73

**Objaw:** NeuronAI ma 20% WR i -$72.77 — bo system prompt mówi (dosłowny cytat):
```
TRADE IS YOUR JOB: MUSISZ regularnie handlowac. 
Jesli nie otwierasz pozycji przez >1h, badz BARDZIEJ agresywny. 
HOLD nie zarabia pieniedzy. Szukaj okazji aktywnie
```

P#161B poprawił `_buildPrompt()`, ale NIE zmienił `SYSTEM_PROMPT` const (linia 72-73). LLM nadal dostaje instrukcję: "must trade aggressively if idle >1h".

**Fix w PATCH #163 poniżej.**

---

### P0-5: GPU = CPU FALLBACK — QUANTUM NIE ISTNIEJE

**Severity:** ŚREDNI — Iluzja Quantum bez GPU  
**Plik:** `gpu-quantum-service.js`, `gpu-cuda-service.py`

**Logi:** `[GPU] CUDA not available — CPU fallback active`

VPS nie ma GPU. Wszystkie "quantum" computations (QMC, QAOA, VQC) to symulacje na CPU z random noise. Remote GPU via SSH tunnel (port 4001) jest skonfigurowane ale nie działa na VPS.

**Impact:** Quantum boost/veto w ensemble-voting jest oparty na wynikach losowych. 
**Rekomendacja:** Usunąć Quantum z decision pipeline lub naprawić remote GPU tunnel.

---

### P0-6: BRAK PER-PAIR STRATEGY CUSTOMIZATION

**Severity:** ŚREDNI — Wszystkie pary mają identyczne parametry  
**Pliki:** `trading-bot/src/modules/strategy-runner.js`, `trading-bot/src/modules/execution-engine.js`

BTC ($83,000), ETH ($1,900), SOL ($125), BNB ($590), XRP ($2.36) — WSZYSTKIE używają:
- Identycznych progów RSI (30/70)
- Identycznych mnożników ATR (SL: 1.5x, TP: 4x)
- Identycznych wag strategii (MACrossover 22%, AdvancedAdaptive 20%, ...)
- Identycznych parametrów trailing stop (5-fazowy Chandelier)

**Problem:** BTC z daily range 2% vs XRP z daily range 8% powinny mieć fundamentalnie różne parametry.

---

## 📊 ANALIZA WARSTW — STAN FAKTYCZNY

### Warstwa 1: DATA PIPELINE

| Komponent | Status | Uwagi |
|-----------|--------|-------|
| OKX WebSocket | ✅ OK | 5min candles, działa |
| Candle buffer | ✅ OK | 50-candle lookback |
| Indicator calc | ⚠️ UWAGA | RSI, MACD, BB, ATR, SMA — ale brak MTF real (tylko 5min) |

### Warstwa 2: STRATEGIE (strategy-runner.js)

| Strategia | Waga | Status | Problem |
|-----------|------|--------|---------|
| MACrossover | 22% | 🔴 HOLD | SMA20/SMA50 crossover — za wolne na 5min |
| AdvancedAdaptive | 20% | 🔴 HOLD | Wymaga trendu + breakout + volume confirm — prawie nigdy nie triggeruje |
| SuperTrend | 17% | 🔴 HOLD | ATR-based trend follow — OK ale zbyt ciasne trigger |
| RSITurbo | 14% | 🔴 HOLD | RSI(14) 30/70 na 5min — nigdy nie dociera do 30/70 w krótkim okresie |
| MomentumPro | 10% | 🔴 HOLD | Multi-factor momentum — złożony, rzadko triggeruje |
| NeuralAI (ML) | 10% | ⚠️ SELL | ML model daje ~76.5% confidence SELL — JEDYNY source sygnałów |
| PythonML | 7% | ⚠️ N/A | Python ML service — brak weryfikacji |

**KRYTYCZNE:** 5/7 strategii zwraca ciągle HOLD. Jedynym źródłem sygnałów jest ML service (NeuralAI) z 76.5% confidence SELL. System jest **single-source dependent** na jeden ML model.

### Warstwa 3: ENSEMBLE VOTING (ensemble-voting.js)

| Parametr | Wartość | Ocena |
|----------|---------|-------|
| Voting threshold | 25% (adjusted by regime) | ⚠️ Za niski |
| RANGING penalty | 15% (P#160B) | ⚠️ Za łagodny |
| Thompson Sampling | ✅ Aktywny | Ale brak danych bo mało tradów |
| Result | 75-80% HOLD vote | 🔴 Poprawne — bo 5/7 strategii = HOLD |

### Warstwa 4: DECISION CORE (decision-core.js)

| Komponent | Status | Problem |
|-----------|--------|---------|
| MTF confluence | ✅ Działa | Ale timeframes to duplicatedy (5min × factors) |
| Defense mode | ✅ Aktywny | Triggeruje na >5% drawdown |
| NeuronAI prime validation | ✅ Działa | Ale LLM jest zbyt agresywny (P0-4) |

### Warstwa 5: RISK MANAGER (risk-manager.js)

| Parametr | Wartość | Ocena |
|----------|---------|-------|
| Max risk per trade | 2% | ✅ OK |
| Circuit breaker | 8 consecutive losses | ✅ OK (P#158 fixed deadlock) |
| Soft pause | 5 consecutive losses | ✅ OK |
| Daily trade limit | 18 | ✅ OK |
| Drawdown halt | 15% | ✅ OK |
| Confidence floor | 0.35 | ⚠️ Za niski — przepuszcza słabe sygnały |

### Warstwa 6: EXECUTION ENGINE (execution-engine.js)

| Komponent | Status | Problem |
|-----------|--------|---------|
| Fee gate | ✅ 1.5x | Wymaga expected profit ≥ 1.5× round-trip fees |
| Min-hold cooldown | ✅ 15min | Zapobiega rapid re-entry |
| SL (ATR-based) | ⚠️ 1.5x ATR | Za ciasne — wielokrotne SL hits |
| TP (ATR-based) | ⚠️ 4.0x ATR | Asymetryczne z SL — ale TP nigdy nie jest osiągane |
| Trailing SL (Chandelier) | ✅ 5-phase | Dobrze zaprojektowane ale parametry za ciasne |
| Partial TP | ✅ 3-level | 25%@2.5x, 25%@4x, 50% runner — dobre ale nigdy nie triggeruje |
| Time exits | ✅ 24h/48h/72h | OK |
| FLIP | 🔴 NIEBEZPIECZNE | Close + immediate open opposite = double loss |
| **PnL on open** | 🔴 BUG | trade.pnl = -fees na otwarciu → fałszywe metryki |

### Warstwa 7: NEURON AI / LLM (neuron_ai_manager.js)

| Parametr | Wartość | Ocena |
|----------|---------|-------|
| Model | qwen3:14b | ⚠️ 14b, nie 30b jak planowano |
| Decisions | 1342 | Dużo ale jakość niska |
| Overrides | 41 (3.1%) | 🔴 Overrides z 20% WR = destrukcyjne |
| PnL | -$72.77 | 🔴 TRACI pieniądze |
| WinRate | 20% | 🔴 Losowy trading jest lepszy (50%) |
| Risk multiplier | 0.80 | ⚠️ Redukuje sizing ale nadal traci |
| Cooldown | 120s (P#161B) | ✅ OK |
| SYSTEM_PROMPT | AGRESYWNY | 🔴 Wymusza trading (P0-4) |
| Fallback decision | Path A/B | ⚠️ Path A conf cap 0.65 = za dużo |

---

## 📈 TRADE DIAGNOSTICS — OSTATNIE 60 TRADÓW

### Statystyki ogólne (XRPUSDT — jedyny pair z danymi)

| Metryka | Wartość |
|---------|---------|
| Total trades | 60 |
| Closed trades | 42 |
| Win rate | 35.7% (15W / 27L) |
| Realized PnL | -$34.51 |
| Best trade | ~$0.99 |
| Worst trade | ~-$1.97 |
| Avg win | ~$0.65 |
| Avg loss | ~-$0.85 |
| SL exits | 12 |
| TP exits | 1 |
| FLIP exits | ~8 |
| SkynetPrime CPU | 33 trades (55%) |
| Ensemble | 4 trades (6.7%) |
| QuantumPosMgr | 7 trades (11.7%) |

### Key Insights

1. **SL:TP ratio = 12:1 — KATASTROFALNE.** 12 stopów vs 1 take profit. System nigdy nie pozwala zyskom rosnąć.

2. **FLIP trading = double hemorrhage.** Każdy FLIP zamyka pozycję ze stratą i natychmiast otwiera odwrotną (kolejne fees + exposure). Z logów BTC bota:
   ```
   [FLIP] Closed LONG BTCUSDT | PnL: $-1.40 → opening SELL
   [FLIP] Closed SHORT BTCUSDT | PnL: $-2.10 → opening BUY
   ```

3. **SkynetPrime_cpu = 55% wszystkich tradów** — to CPU fallback NeuronAI, nie realne sygnały.

4. **ML SELL bias stały:** ML model zwraca ~76.5% confidence SELL niezależnie od warunków rynkowych. Single-source failure.

5. **Ensemble rzadko generuje sygnały:** Tylko 4 z 60 tradów pochodzi z ensemble (6.7%). Reszta to DIRECT TRADE przez NeuronAI/LLM.

---

## ⚛️ QUANTUM / GPU AUDIT

| Aspekt | Status |
|--------|--------|
| GPU na VPS | ❌ Brak CUDA |
| GPU remote (SSH tunnel) | ❌ Skonfigurowane, nie działa |
| QMC (Quantum Monte Carlo) | 🟡 CPU fallback — random noise |
| VQC (Variational Quantum Circuits) | 🟡 CPU fallback — pseudo-quantum |
| QAOA | 🟡 CPU fallback |
| Impact na decyzje | ❌ Brak realnego wpływu — boosts z noise |
| Rekomendacja | Usunąć z pipeline lub naprawić remote GPU |

**Quantum boost w ensemble jest oparty na wynikach losowych ziarnek na CPU. To nie jest quantum computing — to random noise generator z etykietą "quantum".**

---

## 🖥️ DASHBOARD AUDIT

| Aspekt | Status | Uwagi |
|--------|--------|-------|
| Trade timestamps | UTC z formatem | `toLocaleString('en-US', {timeZone:'UTC'})` |
| Clock | Local timezone | `new Date().toLocaleTimeString()` |
| Trade dedup | ✅ | Key: `timestamp_symbol_side_reason` |
| Data source | Proxy 3001-3005 | Wszystkie zwracają identyczne dane (P0-1) |
| Timezone issue | ⚠️ Mieszanka | Clock = local, trades = UTC, NeuronAI logs = pl-PL |
| Missing features | Brak per-pair equity curve, drawdown chart, heat map |

---

## 🔧 GOTOWE PATCHE

### PATCH #162 — Per-Instance Trade Isolation

**Problem:** `portfolio-manager.js:restoreState()` ładuje ALL trades bez filtrowania  
**Priorytet:** P0 — Bez tego multi-pair nie działa  

**Plik: `trading-bot/src/modules/portfolio-manager.js`**

```javascript
// PATCH #162: Per-instance trade isolation
// Zmień restoreState() z:
restoreState(state) {
    if (state.portfolio) this.portfolio = { ...this.portfolio, ...state.portfolio };
    if (state.portfolioBalance) this.balance = state.portfolioBalance;
    if (state.positions && state.positions.length > 0) this.positions = new Map(state.positions);
    if (state.trades) this.trades = state.trades;
}

// Na:
restoreState(state) {
    const instanceId = process.env.INSTANCE_ID || 'default';
    const symbol = process.env.TRADING_SYMBOL || '';
    
    if (state.portfolio) {
        // Nie przywracaj cudzego PnL — każda instancja liczy od zera
        const safePf = { ...this.portfolio };
        safePf.initialCapital = state.portfolio.initialCapital || safePf.initialCapital;
        safePf.peakValue = state.portfolio.peakValue || safePf.peakValue;
        this.portfolio = safePf;
    }
    if (state.portfolioBalance) this.balance = state.portfolioBalance;
    if (state.positions && state.positions.length > 0) {
        // Filtruj pozycje — tylko te z naszym symbolem
        const filtered = state.positions.filter(([key, pos]) => 
            pos.symbol === symbol || key === symbol
        );
        this.positions = new Map(filtered);
    }
    if (state.trades) {
        // Filtruj trades — tylko nasz instanceId LUB nasz symbol
        this.trades = state.trades.filter(t => 
            t.instanceId === instanceId || t.symbol === symbol
        );
    }
}
```

**Plik: `trading-bot/src/modules/state-persistence.js`**

```javascript
// PATCH #162B: Lepszy error handling + verification
save(pm, rm, ml) {
    try {
        const dir = require('path').dirname(this.filePath);
        if (!require('fs').existsSync(dir)) {
            require('fs').mkdirSync(dir, { recursive: true });
            console.log('[STATE SAVE] Created directory:', dir);
        }
        const state = { 
            timestamp: Date.now(), 
            instanceId: process.env.INSTANCE_ID || 'default',
            symbol: process.env.TRADING_SYMBOL || '',
            ...pm.exportState(), 
            ...rm.exportState(), 
            ...(ml ? ml.exportState() : {}) 
        };
        require('fs').writeFileSync(this.filePath, JSON.stringify(state, null, 2));
    } catch (e) { 
        console.error('[STATE SAVE] FAILED:', e.message, '| Path:', this.filePath); 
    }
}
```

---

### PATCH #163 — SYSTEM_PROMPT Fix: Patience Over Aggression

**Problem:** SYSTEM_PROMPT wymusza agresywny trading, NeuronAI 20% WR  
**Priorytet:** P0  

**Plik: `trading-bot/src/core/ai/neuron_ai_manager.js` linia ~72-73**

Zamień:
```
- TRADE IS YOUR JOB: MUSISZ regularnie handlowac. Jesli nie otwierasz pozycji przez >1h, badz BARDZIEJ agresywny. HOLD nie zarabia pieniedzy. Szukaj okazji aktywnie
```

Na:
```
- QUALITY TRADES ONLY: lepiej pominąć 10 tradów niż wejść w 1 zły. HOLD jest POPRAWNĄ DECYZJĄ gdy nie ma edge'a. Otwieraj pozycje TYLKO gdy MTF, ensemble i ML się zgadzają. Nigdy nie traduj z nudy lub presji czasu
- EDGE REQUIREMENT: KAŻDY trade musi mieć expected value > 2x fees. Jeśli nie widzisz clara edge'a → HOLD
```

---

### PATCH #164 — Fix Fake PnL on Open

**Problem:** `trade.pnl = -fees` na otwarciu → podwójne odliczanie fees  
**Priorytet:** P0  

**Plik: `trading-bot/src/modules/execution-engine.js`**

Zmień linie 493-494 (BUY) i 525-526 (SELL):
```javascript
// BYŁO:
trade.pnl = -fees;

// MA BYĆ:
trade.pnl = 0;  // P#164: PnL na otwarciu = 0 — fees odliczane przy close
```

Zmień linie 539-541:
```javascript
// BYŁO:
if (signal.action === 'BUY' || signal.action === 'SELL') {
    this.pm.trades.push(trade);
    if (this.pm.trades.length > 1000) this.pm.trades = this.pm.trades.slice(-1000);
    this.pm.portfolio.realizedPnL += trade.pnl;
}

// MA BYĆ:
if (signal.action === 'BUY' || signal.action === 'SELL') {
    this.pm.trades.push(trade);
    if (this.pm.trades.length > 1000) this.pm.trades = this.pm.trades.slice(-1000);
    // P#164: NIE dodawaj PnL na otwarciu — realizedPnL aktualizuj TYLKO na close
}
```

---

### PATCH #165 — Disable FLIP Trading

**Problem:** FLIP = close at loss + immediate open opposite = double hemorrhage  
**Priorytet:** P1  

**Plik: `trading-bot/src/modules/execution-engine.js` linia ~575-580**

```javascript
// BYŁO (_validateSignal):
if (existingPosition.side !== incomingSide) {
    return { valid: true, flip: true, closeSide: existingPosition.side };
}

// MA BYĆ:
if (existingPosition.side !== incomingSide) {
    // P#165: FLIP DISABLED — close-and-reopen causes double loss
    // Just close the existing position; new direction signal will be evaluated next cycle
    console.log('[ANTI-FLIP] Opposite signal ' + incomingSide + ' while ' + existingPosition.side + 
        ' open — blocking flip. Close existing first.');
    return { valid: false, reason: 'FLIP blocked (P#165) — close existing position first' };
}
```

---

### PATCH #166 — NeuronAI Override Kill Switch (20% WR → mute)

**Problem:** NeuronAI overriduje ensemble z WinRate 20%  
**Priorytet:** P1  

**Plik: `trading-bot/src/core/ai/neuron_ai_manager.js`**

Dodaj warunek w sekcji override (funkcja produkująca DIRECT TRADE):

```javascript
// Przed override:
const stats = this.getPerformanceStats();
if (stats.winRate < 0.35 || stats.totalPnL < -50) {
    console.log('[NEURON AI] Override MUTED — WR: ' + (stats.winRate * 100).toFixed(1) + 
        '%, PnL: $' + stats.totalPnL.toFixed(2) + ' — below threshold');
    return { action: 'HOLD', confidence: 0.1, reason: 'NeuronAI muted due to poor performance' };
}
```

---

### PATCH #167 — SL Width Fix (1.5x → 2.5x ATR)

**Problem:** SL 1.5x ATR za ciasne → 12 SL hits vs 1 TP  
**Priorytet:** P1  

**Plik: `trading-bot/src/modules/execution-engine.js`**

```javascript
// BYŁO (BUY, linia ~488):
sl = signal.price - 1.5 * atrValue;
tp = signal.price + 4.0 * atrValue;

// MA BYĆ:
sl = signal.price - 2.5 * atrValue;  // P#167: Wider SL — reduce SL hits
tp = signal.price + 5.0 * atrValue;  // P#167: Wider TP — better R:R

// BYŁO (SELL, linia ~512):
sl = signal.price + 1.5 * atrValue;
tp = Math.max(0.0000001, signal.price - 4.0 * atrValue);

// MA BYĆ:
sl = signal.price + 2.5 * atrValue;  // P#167: Wider SL
tp = Math.max(0.0000001, signal.price - 5.0 * atrValue);  // P#167: Wider TP
```

---

## 📋 LIVE vs BACKTEST PARITY

| Aspekt | Live | Backtest | Parity |
|--------|------|----------|--------|
| Fee model | 0.1% per side | 0.1% per side | ✅ |
| Slippage | Brak (simulation) | Brak | ✅ |
| Position sizing | Risk 2%, confidence-scaled | Stały | 🔴 |
| SL/TP | ATR-based dynamic | ATR-based dynamic | ✅ |
| NeuronAI/LLM | Aktywne | ❌ Brak w backtest | 🔴 |
| Quantum boost | CPU random | ❌ Brak w backtest | 🔴 |
| Portfolio state | Shared (bugged) | Izolowany | 🔴 |
| Data feed | Real-time WebSocket | Historical candles | ⚠️ |
| Execution jitter | 10-50ms random | Brak | ⚠️ |

**Parity: 30%** — Backtester NIE uwzględnia NeuronAI, Quantum, ani portfolio state bugs. Wyniki backtestu nie mają znaczenia diagnostycznego dla live trading.

---

## 📊 PER-PAIR STRATEGY STATUS

| Pair | Capital | Actual Trading | Problem |
|------|---------|---------------|---------|
| BTCUSDT | $1,000 (10%) | ⚠️ Traduje ale state = XRP | Logi BTC → API = XRP |
| ETHUSDT | $1,200 (12%) | ❓ Brak tradów widocznych | State zdominowany przez XRP |
| SOLUSDT | $3,000 (30%) | ❓ Brak tradów widocznych | State zdominowany przez XRP |
| BNBUSDT | $3,800 (38%) | ❓ Brak tradów widocznych | State zdominowany przez XRP |
| XRPUSDT | $1,000 (10%) | ✅ Handluje | Jedyny widoczny pair — ale najniższy kapitał |

**Paradoks:** XRP z NAJNIŻSZYM kapitałem ($1,000 = 10%) wygenerowało 100% widocznych tradów. BTC z logami potwierdzającymi trading ma w API dane XRP.

---

## 📐 PER-PAIR vs PORTFOLIO ISOLATION

### Obecny model (BROKEN):
```
PM2: 5 instances → Shared state-persistence.json → All have XRP trades
     ↓
Portfolio Coordinator (shared JSON) → ALL instances report XRPUSDT
     ↓
Dashboard API: ports 3001-3005 → IDENTICAL responses
```

### Wymagany model (AFTER FIX):
```
PM2: btc-live → bot_state_btc-live.json (ONLY BTC trades)
     eth-live → bot_state_eth-live.json (ONLY ETH trades)
     sol-live → bot_state_sol-live.json (ONLY SOL trades)
     bnb-live → bot_state_bnb-live.json (ONLY BNB trades)
     xrp-live → bot_state_xrp-live.json (ONLY XRP trades)
     ↓
Portfolio Coordinator: each instance ONLY publishes its OWN symbol
     ↓
Dashboard: per-pair equity curves, aggregated total
```

---

## 🧪 BACKTEST — INSTRUKCJE WALIDACJI

### Krok 1: Wyczyść state PRZED backtestem
```bash
ssh root@64.226.70.149 'rm -f /root/turbo-bot/data/bot_state_*.json'
```

### Krok 2: Uruchom backtest per-pair
```bash
cd /workspaces/turbo-bot-local
node trading-bot/src/backtesting/backtest-engine.js --symbol BTCUSDT --period 30d --fees 0.001
node trading-bot/src/backtesting/backtest-engine.js --symbol XRPUSDT --period 30d --fees 0.001
```

### Krok 3: Zweryfikuj metryki
- [ ] Sharpe > 1.2
- [ ] Max drawdown < 15%
- [ ] Win rate > 40%
- [ ] Profit factor > 1.5
- [ ] Avg win / Avg loss > 2.0
- [ ] Total trades: 5-15 per pair per day

### Krok 4: Walk-forward validation
Podziel dane na:
- Training: 70% (21 dni)
- Validation: 15% (4.5 dnia)
- Test: 15% (4.5 dnia)

Parametry kalibowane na training → walidacja na validation → finalny test na test set.

---

## 🎯 STRATEGIA NAPRAWCZA — PRIORYTETOWO

### FAZA 1: Emergency fixes (natychmiastowe)
1. **P#162:** Per-instance trade isolation (portfolio-manager + state-persistence)
2. **P#163:** Fix SYSTEM_PROMPT (neuron_ai_manager.js)
3. **P#164:** Fix fake PnL on open (execution-engine.js)
4. **Wyczyść state files** na VPS i restart PM2

### FAZA 2: Profitability fixes (w ciągu 24h)
5. **P#165:** Disable FLIP trading
6. **P#166:** NeuronAI override kill switch 
7. **P#167:** SL width 1.5x→2.5x ATR, TP 4x→5x ATR

### FAZA 3: Architektura (w ciągu tygodnia)
8. Per-pair parameter profiles (BTC aggressive, XRP conservative, itp.)
9. Real MTF (15min, 1h, 4h candle data)
10. ML model diversification (nie single SELL model)
11. Dashboard per-pair equity curves

### FAZA 4: Strategia ewolucji (po stabilizacji)
12. Funding Rate Arbitrage — XRP/BNB (8h funding snapshots)
13. Grid Trading V2 — SOL/ETH (range-bound assets)
14. Momentum HTF/LTF — BTC (1H/15min divergence)
15. Portfolio Allocator — dynamiczna realokacja kapitału na podstawie Sharpe per pair

---

## 📊 ESTIMATED POST-FIX METRICS

| Metryka | Obecna | Po FAZA 1 | Po FAZA 2 | Po FAZA 3 |
|---------|--------|-----------|-----------|-----------|
| Win Rate | 35.7% | 38-42% | 45-50% | 50-55% |
| Profit Factor | <1.0 | 1.0-1.2 | 1.3-1.6 | 1.5-2.0 |
| Sharpe | N/A | 0.3-0.5 | 0.7-1.0 | 1.0-1.5 |
| Max DD | N/A | 10-15% | 8-12% | 5-10% |
| Daily Trades | ~10 | 5-8 | 3-5 | 3-5 |
| Monthly Return | -3.5% | -1 to +1% | +2 to +5% | +5 to +10% |

---

## ⚠️ ZASTRZEŻENIE

Powyższe szacunki zakładają:
1. Poprawne wdrożenie WSZYSTKICH patches z FAZA 1 i 2
2. Stabilne warunki rynkowe (nie crash/pump)
3. Realizację per-pair parameter tuning
4. Poprawne działanie Ollama (qwen3:14b)
5. Brak nowych bugs wprowadzonych przez patche

**Bez FAZY 1, system TRACI pieniądze i nie ma sensu optymalizować strategii.**

---

## NASTĘPNE KROKI (priorytetowo):

1. **NATYCHMIAST:** Wdrożyć P#162 (trade isolation) — najwyższy priorytet, bez tego nic nie działa
2. **NATYCHMIAST:** Wdrożyć P#163 (SYSTEM_PROMPT fix) — zatrzymuje agresywny trading LLM
3. **NATYCHMIAST:** Wdrożyć P#164 (fake PnL fix) — napraw metryki
4. **Po #162-164:** Wyczyścić state files na VPS: `rm -f /root/turbo-bot/data/bot_state_*.json && pm2 restart all`
5. **W ciągu 24h:** Wdrożyć P#165 (disable FLIP), P#166 (NeuronAI kill switch), P#167 (SL/TP width)
6. **Monitoring:** Po 24h sprawdzić logi — czy per-pair isolation działa, czy trades są izolowane, czy PnL jest correct
7. **Backtest:** Uruchomić backtest per-pair z NOWYMI parametrami (SL 2.5x, TP 5x, no FLIP, no LLM override)
8. **Optymalizacja:** Per-pair parameter profiles (BTC: SL 3x ATR, XRP: SL 2x ATR etc.)

---

*Audyt zakończony. System wymaga natychmiastowej interwencji na poziomie P0. Bez PATCH #162 (trade isolation), multi-pair trading jest iluzją.*

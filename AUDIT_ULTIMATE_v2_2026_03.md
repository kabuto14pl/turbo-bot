# CLAUDE-SKYNET v1.0 – ULTIMATE PROFITABILITY AUDIT v2 — 2026-03-14

```
CLAUDE-SKYNET v1.0 – Turbo-Bot Evolution
AUDIT MODE — READ-ONLY — NO CODE CHANGES
```

**Aktywowane skille:** `#02-skynet-architect` `#03-quantum-engineer` `#04-execution-optimizer` `#05-risk-quant` `#07-trading-strategist` `#08-code-reviewer` `#09-system-debugger` `#10-performance-memory` `#11-backtest-validator`

**Cel:** Przygotowanie bota do przełączenia na **Funding Rate Arbitrage (SOL/ETH)**, **Grid Trading (BNB/XRP)** + **Momentum HTF/LTF (SOL/BTC)**

---

## 1. EXECUTIVE SUMMARY

| Kategoria | Ocena | Uwagi |
|-----------|-------|-------|
| Architektura | 7/10 | Solidna 7-warstwowa pipeline, ale brak per-pair strategy routing w live JS |
| Risk Management | 7/10 | Drawdown kill, trailing SL, fee gate — ale SL:TP ratio 12:1 na VPS |
| Execution | 5/10 | FLIP bypass w bot.js (P0), fake PnL na VPS, brak state persistence |
| AI / LLM | 7/10 | Ollama qwen3:14b działa poprawnie, HOLD w RANGING — ale WR=20%, PnL=-$72 |
| Backtest Parity | 4/10 | Python backtest ma Grid V2 + Funding Rate + News Filter — live JS NIE MA |
| State Persistence | 2/10 | Brak bot_state files na VPS, neuron state nie persystowany, cross-contamination |
| Multi-Strategy | 3/10 | Wszystkie 5 botów używa identycznej strategii — brak per-pair routing |
| **OVERALL** | **5.0/10** | **System działa stabilnie ale nie zarabia — P#162-167 NIE wdrożone** |

### Key Findings

1. **P#162-167 NIE WDROŻONE na VPS** — poprawki istnieją TYLKO w lokalnym kodzie
2. **State contamination AKTYWNA** — wszystkie 5 botów zwraca identyczne dane (60 tradów XRP)
3. **FLIP bypass w bot.js** — LLM może nadal triggerować FLIP przez rich actions (linie 1592-1660)
4. **Brak state persistence** — zero plików bot_state_*.json na VPS
5. **Grid V2 + Funding Rate istnieją w Python backtest** — ale NIE w live JS
6. **PnL: -$34.51** przez 83.7h tradingu (60 tradów, 15W/45L w pamięci)
7. **SL:TP ratio = 12:1** — 12 STOP_LOSS vs 1 TAKE_PROFIT na VPS

---

## 2. P0 BLOCKERS — KRYTYCZNE

### P0-1: FLIP Bypass w bot.js Rich Actions (NOWY BUG)

**Lokalizacja:** `trading-bot/src/modules/bot.js` linie 1592-1660

**Problem:** P#165 wyłączył FLIP w `execution-engine.js:_validateSignal()` (linia 574), ale bot.js obsługuje FLIP bezpośrednio w bloku rich actions SKYNET PRIME. LLM (NeuronAI) może nadal zażądać FLIP via `rawAction === 'FLIP'`, co obchodzi execution engine.

**Ścieżka wykonania:**
1. `neuron_ai_manager.js` linia 77: SYSTEM_PROMPT zawiera `"FLIP: zamknij LONG i otworz SHORT (lub odwrotnie)"`
2. LLM zwraca `{"action": "FLIP", ...}`
3. `neuron_ai_manager.js` linia 299: `actionMap['FLIP'] = 'SELL'` → mapuje na SELL
4. `bot.js` linia 1592: `if (rawAction === 'FLIP' && this.pm.positionCount > 0)` → handler bezpośredni
5. bot.js linia 1615: `this.pm.closePosition(sym, flipPrice, null, ...)` → zamyka pozycję
6. bot.js linia 1634: `this.exec.executeTradeSignal(flipSignal, ...)` → otwiera przeciwną
7. **Execution engine P#165 jest OBCHODZONE** bo bot.js wywołuje closePosition + execute bezpośrednio

**Impact:** Double-loss przy FLIP (zamknięcie ze stratą + nowa pozycja ze stratą). Na VPS ten handler jest AKTYWNY.

**Severity:** P0 — wymaga wyłączenia handlera FLIP w bot.js + usunięcia FLIP z SYSTEM_PROMPT

---

### P0-2: P#162-167 NIE WDROŻONE na VPS

**Problem:** 6 patchy z poprzedniej sesji istnieje TYLKO w lokalnym workspace:

| Patch | Co naprawia | Plik | Stan VPS |
|-------|-------------|------|----------|
| P#162 | Cross-instance trade isolation | portfolio-manager.js:217-234 | ❌ BRAK |
| P#162B | State persistence error handling | state-persistence.js:32-55 | ❌ BRAK |
| P#163 | SYSTEM_PROMPT agresywny mandat | neuron_ai_manager.js:50-94 | ❌ BRAK |
| P#164 | Fake PnL on open (trade.pnl = -fees) | execution-engine.js:493,528,539 | ❌ BRAK |
| P#165 | FLIP disable w execution engine | execution-engine.js:574-578 | ❌ BRAK |
| P#166 | NeuronAI override kill switch | neuron_ai_manager.js:296-305 | ❌ BRAK |
| P#167 | SL 2.5x ATR / TP 5x ATR | execution-engine.js:480-526 | ❌ BRAK |

**Impact:** VPS nadal ma: ciasne SL (1.5x ATR), fake PnL na open, FLIP enabled, agresywny prompt, brak per-instance isolation, brak kill switch.

**Severity:** P0 — wszystkie patche muszą być wdrożone na VPS

---

### P0-3: State Persistence MARTWA na VPS

**Dowody:**
```
ls -la /root/turbo-bot/data/bot_state_*.json    → BRAK PLIKÓW
ls -la /root/turbo-bot/data/neuron_ai_state*.json → BRAK PLIKÓW
```

**Skutki:**
1. Po każdym restart PM2 (9 restartów dotąd) → stan traciwy
2. Portfolio data = zero (PnL=$0.00, WR=0.0%, Trades=0 z API)
3. Jedyne co przetrwało = cooldown_state_*.json (P#155) i trades w pamięci (60 szt.)
4. NeuronAI traci: totalDecisions, overrideCount, totalPnL, consecutiveLosses, confidenceBuckets, decisionHistory
5. RiskManager traci: consecutiveLosses, circuitBreaker state, dailyTradeCount

**Root Cause:** `state-persistence.js` → `state.load()` w `bot.js:406` — prawdopodobnie path nie istnieje lub write failure (brak logów bo stary kod pre-P#162B nie loguje errorów)

**Severity:** P0 — bez persistence bot "zapomina" o swoich stratach i powtarza te same błędy

---

### P0-4: Cross-Instance State Contamination

**Dowody z VPS:**
```
BTC(3001): portfolio API → PnL=$0.00 | Trades w pamięci: 60, ALL XRPUSDT, instanceId=xrp-live
ETH(3002): portfolio API → identyczne
SOL(3003): portfolio API → identyczne
BNB(3004): portfolio API → identyczne
XRP(3005): portfolio API → 60 tradów, ALL XRPUSDT, instanceId=xrp-live
```

**Root Cause:** `portfolio-manager.js` → `restoreState()` ładuje WSZYSTKIE trade'y z shared file bez filtrowania po instanceId/symbol. P#162 naprawia to w lokalnym kodzie ale NIE jest wdrożone.

**Impact:** Decyzje tradingowe oparte na cudzych danych → złe WR, złe PnL, złe sizing.

**Severity:** P0

---

### P0-5: SL:TP Ratio = 12:1 (Stop Loss Dominance)

**Dane z VPS (60 tradów, 83.7h):**

| Exit Strategy | Count | % |
|---------------|-------|---|
| STOP_LOSS | 12 | 41% exits |
| SkynetPrime_cpu | 8 | 28% exits |
| QuantumPosMgr | 7 | 24% exits |
| TAKE_PROFIT | 1 | 3% exits |
| Skynet | 1 | 3% exits |

**Problem:** 12 SL vs 1 TP = system zamyka zyskowne pozycje za wcześnie (przed TP) a straty biegną do SL. Dominacja SkynetPrime_cpu (8 zamknięć) sugeruje LLM zamyka pozycje zamiast czekać na TP.

**Root Cause na VPS (pre-P#167):**
- SL = 1.5x ATR (za ciasne dla zmienności krypto)
- TP = 4x ATR (OK ale nigdy nie osiągane bo SL bije pierwsze)
- LLM (SkynetPrime_cpu) zamyka pozycje z małym zyskiem/stratą zamiast czekać

**P#167 (lokalne) poszerza do SL=2.5x, TP=5x** — ale NIE wdrożone na VPS.

**Severity:** P0 — to jest główna przyczyna ujemnego PnL

---

## 3. REAL STATE OF EACH LAYER

### Layer 1: Data Pipeline
| Komponent | Plik | Linie | Stan |
|-----------|------|-------|------|
| DataPipeline | data-pipeline.js | full | ✅ OK — Kraken WebSocket, OHLCV, indicators |
| MTFConfluence | mtf-confluence.js | full | ⚠️ MTF score=0 najczęściej (brak danych HTF) |
| CandlePatterns | candle-patterns.js | full | ✅ OK — 12+ wzorców, entry confirmation |

### Layer 2: Signal Generation
| Komponent | Plik | Linie | Waga | Stan |
|-----------|------|-------|------|------|
| MACrossover | strategy-runner.js | 200-240 | 22% | ✅ Zdrowia, candle pattern confirmation |
| AdvancedAdaptive | strategy-runner.js | 54-120 | 20% | ✅ Solidna, 3+ confirmations |
| SuperTrend | strategy-runner.js | 180-200 | 17% | ✅ OK, candle patterns |
| RSITurbo | strategy-runner.js | 125-175 | 14% | ✅ Poprawione (P#14) |
| MomentumPro | strategy-runner.js | 242-250 | 10% | ⚠️ Najsłabsza (r=0.68 z AdvancedAdaptive) |
| NeuralAI | GRU + Thompson | 10% | ⚠️ GRU na CPU = random |
| PythonML | XGBoost/LightGBM | 7% | ⚠️ ML service działa ale 0 WR |

### Layer 3: Quantum Processing
| Komponent | Stan |
|-----------|------|
| QAOA (weight optimization) | ❌ CPU fallback = random weights |
| QMC (Monte Carlo) | ❌ CPU fallback = noise |
| VQC (regime classifier) | ❌ CPU fallback |
| QDV (decision verification) | ❌ CPU fallback |
| QRA (risk analysis) | ❌ CPU fallback |
| QPM (position management) | ⚠️ 7 zamknięć na VPS — działa ale CPU |

### Layer 4: Ensemble Voting
| Komponent | Plik | Linie | Stan |
|-----------|------|-------|------|
| EnsembleVoting.vote() | ensemble-voting.js | 58-210 | ✅ Stabilne HOLD 73-86% w RANGING |
| Threshold logic | ensemble-voting.js | 145-175 | ✅ Dynamic thresholds P#26/P#135 |
| MTF counter-trend block | ensemble-voting.js | 120-140 | ✅ P#26 counter-trend penalty |
| RANGING penalty | ensemble-voting.js | 148-153 | ✅ P#160B softened 15% |
| NEURON AI Override | ensemble-voting.js | 160-175 | ⚠️ MTF score=0 → nigdy nie fire |

### Layer 5: Decision Core (Alpha Engine)
| Komponent | Plik | Linie | Stan |
|-----------|------|-------|------|
| buildRuntimeConsensusCandidate | decision-core.js | 178-200 | ✅ OK |
| finalizeRuntimeConsensus | decision-core.js | 202-260 | ✅ MTF patterns + NeuronAI Prime + Risk Gate |
| Defense mode sizing | decision-core.js | 72-84 | ✅ 0.65 multiplier, 0.55 cap |
| MTF pattern confluence | decision-core.js | 86-130 | ⚠️ Zależy od H1/H4 data (często brak) |

### Layer 6: Risk Gate
| Komponent | Plik | Linie | Stan |
|-----------|------|-------|------|
| Circuit breaker (5 losses) | risk-manager.js | 48-62 | ✅ OK |
| Soft pause (2 losses) | risk-manager.js | 53-56 | ✅ OK |
| Max drawdown kill (15%) | risk-manager.js | 149-165 | ✅ OK |
| Overtrading limit (10/day) | risk-manager.js | 68-71 | ✅ OK |
| Confidence floor (0.30) | risk-manager.js | 184-190 | ✅ OK |
| Confidence-scaled sizing | risk-manager.js | 115-120 | ✅ OK |
| RANGING regime sizing (30%) | risk-manager.js | 125-128 | ✅ OK |
| State persistence | risk-manager.js | 215-232 | ❌ NIE działa na VPS (brak plików state) |

### Layer 7: Execution + NeuronAI
| Komponent | Plik | Linie | Stan VPS | Stan LOCAL |
|-----------|------|-------|----------|------------|
| Fee gate (1.5x fees) | execution-engine.js | 345-360 | ✅ | ✅ |
| Min-hold cooldown (15min) | execution-engine.js | 365-375 | ✅ | ✅ |
| SL/TP (ATR-based) | execution-engine.js | 480-526 | ❌ 1.5x/4x | ✅ 2.5x/5x (P#167) |
| FLIP validation | execution-engine.js | 574-578 | ❌ ENABLED | ✅ DISABLED (P#165) |
| PnL on open | execution-engine.js | 493 | ❌ -fees | ✅ 0 (P#164) |
| Chandelier trailing SL | execution-engine.js | 140-240 | ✅ | ✅ |
| Partial TP (3 levels) | execution-engine.js | 205-250 | ✅ | ✅ |
| NeuronAI SYSTEM_PROMPT | neuron_ai_manager.js | 50-94 | ❌ Agresywny | ✅ Patient (P#163) |
| NeuronAI kill switch | neuron_ai_manager.js | 296-305 | ❌ BRAK | ✅ (P#166) |
| NeuronAI fallback CPU | neuron_ai_manager.js | 315-410 | ⚠️ | ⚠️ Nadal może override |
| FLIP in SYSTEM_PROMPT | neuron_ai_manager.js | 77 | ❌ PRESENT | ❌ PRESENT |
| FLIP in bot.js rich actions | bot.js | 1592-1660 | ❌ ACTIVE | ❌ ACTIVE |

---

## 4. TRADE DIAGNOSTICS

### 4.1 Living VPS Data (2026-03-14 15:00 UTC)

```
PM2 Status: 8/8 online, 3.2h uptime, 9 restarts each
Bot Memory: ~92MB per instance (x5 = 460MB)
ML Service: 130MB, GPU Service: 25MB, Dashboard: 32MB
```

### 4.2 Portfolio State

| Bot | Port | PnL (API) | PnL (Memory) | Trades (API) | Trades (Memory) | Position |
|-----|------|-----------|--------------|--------------|-----------------|----------|
| BTC | 3001 | $0.00 | -$34.51 | 0 | 60 (all XRP!) | 0 |
| ETH | 3002 | $0.00 | -$34.51 | 0 | 60 (all XRP!) | 0 |
| SOL | 3003 | $0.00 | -$34.51 | 0 | 60 (all XRP!) | 0 |
| BNB | 3004 | $0.00 | -$34.51 | 0 | 60 (all XRP!) | 0 |
| XRP | 3005 | $0.00 | -$34.51 | 0 | 60 (real XRP) | 0 |

**Uwaga:** API zwraca $0 bo state nie jest persystowany — API liczy z portfolio-manager który resetuje się po restarcie. Pamięć RAM ma 60 tradów XRP we WSZYSTKICH botach (cross-contamination).

### 4.3 Trade Analysis (60 tradów w pamięci)

| Metryka | Wartość | Ocena |
|---------|---------|-------|
| Okres | 83.7h (3.5 dnia) | — |
| Total trades | 60 | ⚠️ Za dużo |
| Opens | 18 (event=OPEN) | — |
| Events UNKNOWN | 42 | ❌ Stare trade bez pola event |
| All symbols | XRPUSDT | ❌ Tylko XRP handluje |
| PnL > 0 | 15 tradów | — |
| PnL < 0 | 45 tradów | ❌ 75% ze stratą |
| Total PnL | **-$34.51** | ❌ Ujemny |
| Sum wins | +$11.54 | — |
| Sum losses | -$46.05 | — |
| Avg win | +$0.77 | ⚠️ Mikro-zyski |
| Avg loss | -$1.02 | — |
| Win/Loss Ratio | 0.75 | ❌ <1 |
| Profit Factor | 0.25 | ❌ PF < 1 = system traci |
| Expectancy | -$0.58/trade | ❌ Ujemna |

### 4.4 Exit Strategy Analysis

| Strategy | Count | % | Typ |
|----------|-------|---|-----|
| SkynetPrime_cpu | 33 | 55% | Decyzje CPU fallback |
| STOP_LOSS | 12 | 20% | Automatyczny SL |
| QuantumPosMgr | 7 | 12% | Quantum position mgmt |
| EnsembleVoting | 4 | 7% | Consensus entries |
| Skynet | 3 | 5% | Brain override |
| TAKE_PROFIT | 1 | 2% | TP hit |

**Kluczowe obserwacje:**
1. **SkynetPrime_cpu dominuje (55%)** — CPU fallback podejmuje decyzje zamiast LLM
2. **SL:TP = 12:1** — Stop Loss zabija 12 pozycji, TP tylko 1
3. **QuantumPosMgr = 7** — Quantum zamyka pozycje (częściowe TP na CPU = losowe)
4. **EnsembleVoting = 4** — Tylko 4 z 60 tradów otworzył ensemble!
5. **Actions: BUY=21, SELL=39** — SHORT bias (2:1) w XRPUSDT
6. **Sides: UNKNOWN=42** — 70% tradów nie ma pola `side` (stary format)

### 4.5 Current Bot Behavior (Live Logs, BTC)

```
[ENSEMBLE] CONSENSUS: HOLD (81.2%, conf: 24.3%) | MTF: NEUTRAL score=0
[NEURON AI DECISION] HOLD (conf: 85.0%) | NEURON_AI_LLM
[SKYNET PRIME] LLM Decision: HOLD (conf: 85.0%) | Provider: ollama | Raw: HOLD
```

**Pozytywne:** Boty trzymają HOLD w RANGING. Ollama qwen3:14b reaguje poprawnie. LLM reasoning po polsku, sensowny. Brak forced trades. P#161A/B dedup działa.

**Negatywne:** MTF score=0 zawsze (brak danych HTF), co blokuje NEURON AI Override w ensemble. Boty czekają na sygnał który nigdy nie przyjdzie bo wszystkie strategies dają HOLD w ranging.

---

## 5. READY PATCHES (Projekty — NIE implementacja)

### Patch #168: FLIP Kill — Complete Removal

**Cel:** Całkowite usunięcie FLIP z systemu (3 lokalizacje)

**Zmiany:**
1. `bot.js` linie 1592-1660 — usuń cały blok `if (rawAction === 'FLIP' ...)`
2. `neuron_ai_manager.js` linia 77 — usuń `"FLIP: zamknij LONG i otworz SHORT (lub odwrotnie)"` z SYSTEM_PROMPT
3. `neuron_ai_manager.js` linia 299 — usuń `'FLIP': 'SELL'` z actionMap
4. Potwierdź: execution-engine.js P#165 (linia 574) już blokuje FLIP w validate

**Estimated Impact:** Eliminacja double-loss scenariuszy. Każdy FLIP to potencjalnie 2x strata (zamknięcie + nowa pozycja).

---

### Patch #169: State Persistence Fix + Verification

**Cel:** Naprawić brak state persistence na VPS

**Zmiany:**
1. `state-persistence.js` — dodaj diagnostic logging w save() i load()
2. `bot.js:406` — dodaj weryfikację po load(): `if (!loaded) console.error(...)`
3. Sprawdź ścieżkę: `process.cwd() + '/data/bot_state_' + instanceId + '.json'`
4. Sprawdź uprawnienia katalogu data/ na VPS
5. Dodaj periodic state save (co 100 cykli = ~50 min)

**Estimated Impact:** Przywrócenie pamięci po restarcie. Bot pamięta straty, WR, positions.

---

### Patch #170: Funding Rate Arbitrage (Live JS) — SOL/ETH

**Cel:** Port FundingRateArbitrage z Python backtest do live JS

**Źródło:** `ml-service/backtest_pipeline/funding_rate.py` (414 linii)

**Architektura:**
```
ecosystem.config.js:
  SOL-LIVE: STRATEGY_MODE=funding_rate_arb
  ETH-LIVE: STRATEGY_MODE=funding_rate_arb

Nowy plik: trading-bot/src/strategies/funding-rate-arb.js
  - FundingRateArbStrategy class
  - Delta-neutral: spot long + perp short
  - Funding settlement: co 8h (Kraken Futures)
  - Entry: funding_rate > 0.0001 (0.01% / 8h)
  - Exit: funding_rate < -0.0001 lub unrealized_loss > 2%
  - Capital: 30% pair capital
  - NIEZALEŻNE od ensemble (bypass)

bot.js: 
  - Dodaj routing: if (config.STRATEGY_MODE === 'funding_rate_arb') → skip ensemble, use FRA
  - Lub: run FRA w osobnym module parallel do ensemble
```

**Per-pair config:**
| Para | Capital | Min Rate | Capital% | Max Loss |
|------|---------|----------|----------|----------|
| SOL | $3,000 | 0.0001 | 30% ($900) | 2% |
| ETH | $1,200 | 0.0001 | 30% ($360) | 2% |

**Expected PnL:** ~11-27% APR na zaangażowanym kapitale (w backtest z real Kraken data)

**Dependencies:** Kraken Futures API for real-time funding rates (lub ccxt)

---

### Patch #171: Grid V2 Trading (Live JS) — BNB/XRP

**Cel:** Port GridV2Strategy z Python backtest do live JS

**Źródło:** `ml-service/backtest_pipeline/grid_v2.py` (295 linii)

**Architektura:**
```
Nowy plik: trading-bot/src/strategies/grid-v2.js
  - GridV2Strategy class
  - Mean-reversion w RANGING (ADX < 20-22)
  - Grid levels: Bollinger Bands (BB%B)
  - BUY: BB%B < 0.08 + RSI < 38
  - SELL: BB%B > 0.92 + RSI > 62
  - SL: 0.7x ATR, TP: 1.2x ATR
  - Cooldown: 16 candles (4h na 15m)
  - Max 25 tradów/sesja
  - BYPASS ensemble (niezależne sygnały)

bot.js/execution-engine.js:
  - Grid V2 jako osobny execution path
  - Osobna pozycja od directional trades
  - Grid pnl tracking oddzielne
```

**Per-pair config:**
| Para | ADX Threshold | BB Entry | RSI Levels | Risk/Trade |
|------|---------------|----------|------------|------------|
| BNB | 22 | 0.15/0.85 | 45/55 | 0.8% |
| XRP | 20 | 0.08/0.92 | 38/62 | 0.6% |

**Expected WR:** 55-65% (mean-reversion w ranging)

---

### Patch #172: Momentum HTF/LTF (Live JS) — SOL/BTC

**Cel:** Dedykowana strategia momentum z HTF/LTF confluence

**Architektura:**
```
Nowy plik: trading-bot/src/strategies/momentum-htf-ltf.js
  - MomentumHTFLTF class
  - HTF (H4/D1): trend direction via SMA 50/200, ADX > 25
  - LTF (15m/1h): entry timing via RSI pullback + MACD cross
  - Entry: HTF trend UP + LTF pullback to support
  - SL: 2.5-3x ATR (wide for trend following)
  - TP: trail via Chandelier (3x ATR from high)
  - Minimum hold: 2-4h (no scalping)
  - INTEGRATION z ensemble (dodatkowy voter, waga 15%)

bot.js:
  - Dodaj MomentumHTFLTF jako strategy w StrategyRunner
  - Lub: osobny execution path dla SOL/BTC
```

**Per-pair config:**
| Para | Capital | SMA Periods | ADX Min | Min Hold | Max Trades/Day |
|------|---------|-------------|---------|----------|----------------|
| SOL | $3,000 | 50/200 | 25 | 2h | 4 |
| BTC | $1,000 | 50/200 | 22 | 4h | 3 |

**Expected Sharpe:** >1.2 jeśli HTF filter działa (backtest shows trend-following SOL = best performer)

---

### Patch #173: Portfolio Allocator (Strategy Router)

**Cel:** Per-pair strategy routing w ecosystem.config.js

**Architektura:**
```
ecosystem.config.js — NOWA CONFIG:
  BTC: { STRATEGY_MODE: 'momentum_htf', CAPITAL: 10% }
  ETH: { STRATEGY_MODE: 'funding_rate', CAPITAL: 12% }
  SOL: { STRATEGY_MODE: 'momentum_htf+funding_rate', CAPITAL: 30% }
  BNB: { STRATEGY_MODE: 'grid_v2', CAPITAL: 38% }
  XRP: { STRATEGY_MODE: 'grid_v2', CAPITAL: 10% }

bot.js — NOWY ROUTING:
  constructor:
    this.strategyMode = config.STRATEGY_MODE || 'ensemble';
  
  executeTradingCycle:
    switch (this.strategyMode) {
      case 'funding_rate':      return this._runFundingRateArb();
      case 'grid_v2':           return this._runGridV2();
      case 'momentum_htf':      return this._runMomentumHTF();
      case 'momentum_htf+funding_rate': 
                                return this._runHybrid();
      default:                  return this._runEnsemble(); // current flow
    }
```

**Capital Allocation (proposed):**
| Para | Directional | Grid V2 | Funding Rate | Total |
|------|-------------|---------|--------------|-------|
| BTC ($1,000) | $700 | - | - | $1,000 |
| ETH ($1,200) | $840 | - | $360 | $1,200 |
| SOL ($3,000) | $2,100 | - | $900 | $3,000 |
| BNB ($3,800) | - | $3,800 | - | $3,800 |
| XRP ($1,000) | - | $1,000 | - | $1,000 |
| **Total** | **$3,640** | **$4,800** | **$1,260** | **$10,000** |

---

## 6. BACKTEST INSTRUCTIONS

### 6.1 Obecne Backtest Pipeline (Python)

**Lokalizacja:** `ml-service/backtest_pipeline/`

**Kluczowe pliki:**
| Plik | Linie | Opis |
|------|-------|------|
| engine.py | 1,346 | 14-phase pipeline engine |
| runner.py | 1,063 | Multi-pair runner, sweep |
| strategies.py | 371 | 5 base strategies |
| grid_v2.py | 295 | Grid V2 mean-reversion |
| funding_rate.py | 414 | Funding rate arbitrage |
| pair_config.py | 227 | Per-pair parameter profiles |
| config.py | ~200 | Global backtest config |
| ensemble.py | ~200 | Ensemble voter (Python) |
| position_manager.py | ~300 | Position tracking |
| xgboost_ml.py | ~400 | XGBoost walk-forward |

### 6.2 Wymagane Backtesty (przed wdrożeniem P#170-173)

#### Backtest A: Funding Rate Arbitrage Validation
```bash
cd ml-service
python -m backtest_pipeline.runner \
  --pairs SOLUSDT,ETHUSDT \
  --timeframe 15m \
  --period 90d \
  --funding-arb-enabled \
  --funding-use-real-data \
  --profile runtime_parity \
  --output reports/funding_rate_validation.json
```
**Metryki do sprawdzenia:**
- Net PnL z funding (po fees)
- Average funding rate per 8h
- Position hold time (min 24h optimal)
- Max drawdown during arb

#### Backtest B: Grid V2 Parameter Sweep
```bash
python -m backtest_pipeline.runner \
  --pairs BNBUSDT,XRPUSDT \
  --timeframe 15m \
  --period 90d \
  --grid-v2-enabled \
  --sweep grid_v2_adx_threshold:18,20,22,25 \
         grid_v2_bb_lower_entry:0.05,0.08,0.12,0.15 \
         grid_v2_bb_upper_entry:0.85,0.88,0.92,0.95 \
  --output reports/grid_v2_sweep.json
```

#### Backtest C: Momentum HTF/LTF
```bash
python -m backtest_pipeline.runner \
  --pairs SOLUSDT,BTCUSDT \
  --timeframe 15m \
  --period 90d \
  --profile runtime_parity \
  --output reports/momentum_htf_ltf.json
```
**Uwaga:** Momentum HTF/LTF nie istnieje jeszcze w backtest pipeline → wymaga implementacji w Python przed backtestem.

#### Backtest D: Combined Multi-Strategy
```bash
python -m backtest_pipeline.runner \
  --pairs BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT \
  --timeframe 15m \
  --period 90d \
  --funding-arb-enabled \
  --grid-v2-enabled \
  --per-pair-config pair_config.py \
  --output reports/combined_multi_strategy.json
```

### 6.3 Walk-Forward Validation Protocol

1. **In-sample:** 60 dni (train XGBoost, tune parameters)
2. **Out-of-sample:** 30 dni (validate — NO parameter changes)
3. **Metryki PASS/FAIL:**
   - Sharpe > 1.2 ✅ / < 0.8 ❌
   - Max DD < 12% ✅ / > 15% ❌
   - Profit Factor > 1.5 ✅ / < 1.0 ❌
   - Win Rate > 45% ✅ / < 35% ❌
   - Daily trades 3-12 ✅ / > 18 ❌
   - Expectancy > 2x avg_fee ✅ / < 0 ❌

---

## 7. ARCHITEKTURA GAP: BACKTEST vs LIVE

| Feature | Python Backtest | Live JS | Gap |
|---------|----------------|---------|-----|
| Grid V2 Strategy | ✅ grid_v2.py (295 lines) | ❌ | CRITICAL |
| Funding Rate Arb | ✅ funding_rate.py (414 lines) | ❌ | CRITICAL |
| News Filter | ✅ news_filter.py | ❌ | MEDIUM |
| Per-pair Config | ✅ pair_config.py (227 lines) | ❌ | CRITICAL |
| XGBoost Walk-Forward | ✅ xgboost_ml.py | ⚠️ ML service via HTTP | LOW |
| Entry Quality Filter | ✅ sr_filter.py | ❌ | MEDIUM |
| Price Action Engine | ✅ price_action.py | ❌ | MEDIUM |
| Long Trend Filter | ✅ long_trend_filter.py | ❌ | MEDIUM |
| 14-Phase Pipeline | ✅ engine.py (1346 lines) | ⚠️ 7 layers in bot.js | STRUCTURAL |
| Direction Filter | ✅ Per-pair (BNB=SHORT, BTC=LONG) | ❌ | HIGH |
| Strategy Mode Router | ❌ | ❌ | BOTH MISSING |

---

## 8. NEXT STEPS (priorytetowo)

### Faza 1: NATYCHMIASTOWE (przed dalszym tradingiem)
1. **Deploy P#162-167 na VPS** — `scp` plików + `pm2 restart all`
2. **P#168: FLIP Kill** — usunąć FLIP z bot.js (linie 1592-1660), SYSTEM_PROMPT (linia 77), actionMap (linia 299)
3. **P#169: State Persistence Fix** — debugować dlaczego bot_state files nie powstają na VPS
4. **Verify po deploy:** sprawdzić że każdy bot ma własne trades (nie cross-contamination)

### Faza 2: BACKTEST VALIDATION (1-2 dni)
5. **Uruchomić Backtest A** — Funding Rate Arb (SOL/ETH) z real Kraken data
6. **Uruchomić Backtest B** — Grid V2 sweep (BNB/XRP)
7. **Analiza wyników** — jeśli PF > 1.5 i Sharpe > 1.0 → proceed to implementation

### Faza 3: STRATEGY IMPLEMENTATION (3-5 dni)
8. **P#170: Funding Rate Arb JS** — port z Python do live (SOL/ETH)
9. **P#171: Grid V2 JS** — port z Python do live (BNB/XRP)
10. **P#172: Momentum HTF/LTF** — nowa strategia (SOL/BTC)
11. **P#173: Portfolio Allocator** — strategy routing w ecosystem.config

### Faza 4: DEPLOYMENT + MONITORING (ongoing)
12. **Deploy na VPS** — nowe strategie, per-pair config
13. **Monitor 48h** — sprawdzić PnL, WR, SL:TP ratio per strategia
14. **Tune parameters** — na podstawie live danych (nie backtest!)
15. **Remove SYSTEM_PROMPT FLIP permanently** — jeśli nie usunięto w P#168

### Estimated Targets (po wdrożeniu Fazy 3)
| Metryka | Current | Target |
|---------|---------|--------|
| Daily PnL | -$10/day | +$5-15/day |
| Win Rate | 25% | 48-55% |
| Profit Factor | 0.25 | 1.5-2.0 |
| Sharpe Ratio | <0 | >1.2 |
| Max Drawdown | unknown | <12% |
| SL:TP Ratio | 12:1 | 1.5:1 |
| Avg Hold Time | 58min | 2-4h |
| Trades/Day | 17 | 6-10 |
| Expectancy | -$0.58 | +$1.50 |

---

## APPENDIX A: File Inventory (Core)

| Plik | Linie | Last Modified |
|------|-------|---------------|
| bot.js | 2,295 | P#161A/B (local), P#161 (VPS) |
| execution-engine.js | 601 | P#167 (local), P#155 (VPS) |
| neuron_ai_manager.js | 1,196 | P#166 (local), P#161B (VPS) |
| ensemble-voting.js | 340 | P#160B (local+VPS) |
| strategy-runner.js | 276 | P#56 (local+VPS) |
| decision-core.js | 278 | P#148 (local+VPS) |
| risk-manager.js | 239 | P#159 (local+VPS) |
| portfolio-manager.js | 281 | P#162 (local), unpatched (VPS) |
| state-persistence.js | 55 | P#162B (local), unpatched (VPS) |
| ecosystem.config.js | 142 | Current |

## APPENDIX B: VPS State Files

```
/root/turbo-bot/data/
├── cooldown_state_btc-live.json    (68B, 2026-03-14 07:17)
├── cooldown_state_eth-live.json    (68B, 2026-03-14 07:12)
├── cooldown_state_sol-live.json    (68B, 2026-03-14 07:10)
├── cooldown_state_bnb-live.json    (68B, 2026-03-14 06:47)
├── cooldown_state_xrp-live.json    (68B, 2026-03-14 05:30)
├── gru_learning_curve.json         (2.5KB)
├── analytics_*.duckdb              (5x 12KB + WAL)
├── ml_checkpoints/                 (XGBoost models)
├── bot_state_*.json                ❌ NIE ISTNIEJĄ
├── neuron_ai_state*.json           ❌ NIE ISTNIEJĄ
└── neuron_ai_decisions.log         ❌ PUSTY
```

## APPENDIX C: Ollama/LLM Status

```
Provider: ollama (qwen3:14b)
Connection: SSH tunnel VPS:11434 → Local:11434
Status: CONNECTED, responding
Decision cooldown: 120s (P#161B)
Recent behavior: HOLD w RANGING, Polish reasoning
Sample reasoning: "Rynkowy regime to RANGING... brak konsensusu w ensemble... Warto obserwować"
NeuronAI WR: 20% (historical), PnL: -$72.77
NeuronAI overrides: 41+ (before restart)
```

---

*Raport wygenerowany: 2026-03-14 15:30 UTC*
*Audyt: READ-ONLY — żadne pliki nie zostały zmienione*
*Następny krok: Deploy P#162-167 + P#168 FLIP Kill*

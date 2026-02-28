# KOMPLETNA ANALIZA STRUKTURALNA — TURBO-BOT TRADING SYSTEM

**Data analizy:** Luty 2026  
**Wersja bota:** `6.0.0-ENTERPRISE-MODULAR`  
**Analiza oparta na:** Pełny odczyt WSZYSTKICH krytycznych plików źródłowych  
**Łączna liczba przeanalizowanych linii kodu:** ~11,000+ LOC (JavaScript) + ~2,500+ LOC (TypeScript compiled)

---

## SPIS TREŚCI

1. [Architektura Wysokopoziomowa](#1-architektura-wysokopoziomowa)
2. [Mapa Plików i ich Rozmiary](#2-mapa-plików-i-ich-rozmiary)
3. [Moduły Główne (13 modułów w `modules/`)](#3-moduły-główne)
4. [System AI — 6 Plików w `core/ai/`](#4-system-ai)
5. [Strategie Zewnętrzne (3 klasy w `core/strategy/`)](#5-strategie-zewnętrzne)
6. [Zarządzanie Ryzykiem (`core/risk/`)](#6-zarządzanie-ryzykiem)
7. [Infrastruktura i Dashboard](#7-infrastruktura-i-dashboard)
8. [Pełna Mapa Klas i Ich Metod](#8-pełna-mapa-klas)
9. [Wszystkie Stałe i Konfiguracja](#9-stałe-i-konfiguracja)
10. [Kompletny Graf Zależności](#10-graf-zależności)
11. [18-Krokowy Workflow Cyklu Tradingowego](#11-workflow)
12. [System Patchów (#14–#20)](#12-system-patchów)
13. [Exports i Publiczne API Każdego Modułu](#13-exports)

---

## 1. ARCHITEKTURA WYSOKOPOZIOMOWA

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PM2 Process Manager (VPS)                        │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ turbo-bot (3001) │  │ dashboard (8080) │  │ main-enterprise  │   │
│  │ bot.js           │  │ dashboard-srv.js │  │ main_enterprise  │   │
│  └────────┬────────┘  └──────────────────┘  └──────────────────┘   │
└───────────┼────────────────────────────────────────────────────────┘
            │
     ┌──────┴──────────────────────────────────────────┐
     │              bot.js — ORKIESTRATOR (1449 LOC)    │
     │                                                  │
     │  12 Lokalnych Modułów    15 Zewnętrznych Zależ.  │
     └────┬──────────────┬──────────────┬───────────────┘
          │              │              │
   ┌──────┴─────┐ ┌─────┴──────┐ ┌────┴──────────┐
   │ CLASSICAL  │ │  NEURAL AI │ │   QUANTUM     │
   │ PIPELINE   │ │  (TF.js)   │ │   PIPELINE    │
   │            │ │            │ │               │
   │ 5 strat.  │ │ GRU Pred.  │ │ QMC 10K sim  │
   │ + ML sig. │ │ Regime Det │ │ QAOA p=4     │
   │ Ensemble  │ │ Thompson   │ │ VQC 4q,3L    │
   │ Voting    │ │ Risk Pred. │ │ QFM 5q       │
   │           │ │ SKYNET     │ │ QRA + QDV    │
   │           │ │ Brain      │ │ Decomposer   │
   └───────────┘ └────────────┘ └──────────────┘
          │              │              │
     ┌────┴──────────────┴──────────────┴────┐
     │       EXECUTION + RISK LAYER          │
     │  execution-engine.js (Chandelier SL)  │
     │  risk-manager.js (Circuit Breaker)    │
     │  portfolio-manager.js (PnL Tracking)  │
     │  AdvancedPositionManager (APM)        │
     │  QuantumPositionManager (QPM)         │
     └──────────────────────────────────────┘
          │
     ┌────┴──────────────────────────────────┐
     │  MEGATRON AI — Conversational Agent   │
     │  LLMRouter (GitHub/OpenAI/Claude/Grok)│
     │  CommandHandler (PL/EN bilingual)     │
     │  AIActivityFeed (ring buffer)         │
     └──────────────────────────────────────┘
```

### Warstwy Architektoniczne (top-down)

| Warstwa | Komponenty | Rola |
|---------|-----------|------|
| **L0** Orkiestracja | `bot.js` | Inicjalizacja, pętla 30s, wiring modułów |
| **L1** Dane | `data-pipeline.js`, `indicators.js` | OKX WebSocket → OHLCV → TA indicators |
| **L2** Sygnały Classical | `strategy-runner.js` (5 strategii) | Generacja sygnałów BUY/SELL/HOLD |
| **L3** Sygnały ML | `ml-integration.js` → `EnterpriseMLAdapter` | 6. strategia w ensemble, faza ADVANCED |
| **L4** Neural AI | `adaptive_neural_engine.js` (1805 LOC) | GRU prediction, Thompson Sampling, SKYNET |
| **L5** Quantum Enhancement | `hybrid_quantum_pipeline.js` (2033 LOC) | QMC, QAOA, VQC, QFM, QRA, QDV |
| **L6** Agregacja | `ensemble-voting.js` | Ważone głosowanie 7 strategii, threshold adaptacyjny |
| **L7** Filtrowanie Ryzyka | `risk-manager.js` | Circuit breaker, position sizing, soft pause |
| **L8** Wykonanie | `execution-engine.js` (384 LOC) | Chandelier trailing, partial TP, time exits |
| **L9** Zarządzanie Pozycjami | QPM (`quantum_position_manager.js`, 1454 LOC) + APM | Quantum SL/TP, health scoring, partial close |
| **L10** Persystencja | `state-persistence.js`, `monitoring-bridge.js` | JSON state, Prometheus metrics |
| **L11** API/Dashboard | `server.js`, `dashboard-server.js` | Express port 3001, proxy port 8080 |
| **L12** Konwersacyjne AI | `megatron_system.js` (941 LOC) | Multi-LLM chat, komenda NL, activity feed |

---

## 2. MAPA PLIKÓW I ICH ROZMIARY

### Moduły Główne (`trading-bot/src/modules/`)

| Plik | LOC | Klasa/Eksport | Odpowiedzialność |
|------|-----|---------------|------------------|
| `bot.js` | 1449 | `AutonomousTradingBot` | Orkiestrator główny, pętla tradingowa |
| `config.js` | 37 | `loadConfig()` | Ładowanie .env → obiekt konfiguracyjny |
| `portfolio-manager.js` | 196 | `PortfolioManager` | Pozycje, PnL, drawdown |
| `risk-manager.js` | 116 | `RiskManager` | Circuit breaker, position sizing, ATR risk |
| `data-pipeline.js` | 236 | `DataPipeline` | OKX WS + REST + mock, OHLCV multi-timeframe |
| `strategy-runner.js` | 219 | `StrategyRunner` | 5 wbudowanych strategii, routing |
| `ensemble-voting.js` | 229 | `EnsembleVoting` | Ważone głosowanie z 7 źródeł + threshold adapt. |
| `execution-engine.js` | 384 | `ExecutionEngine` | Trailing SL (Chandelier), partial TP, time exits |
| `ml-integration.js` | 103 | `MLIntegration` | Most do EnterpriseMLAdapter, faza progression |
| `state-persistence.js` | 42 | `StatePersistence` | JSON save/load, max age 60 min |
| `monitoring-bridge.js` | 148 | `MonitoringBridge` | Health status, Prometheus counter/gauge/hist |
| `server.js` | 115 | `Server` | Express + WebSocket, 14 endpoints |
| `indicators.js` | 161 | Pure functions (10) | SMA, RSI, MACD, EMA, ROC, ATR, ADX, BB, Vol |

### System AI (`trading-bot/src/core/ai/`)

| Plik | LOC | Klasy | Odpowiedzialność |
|------|-----|-------|------------------|
| `adaptive_neural_engine.js` | 1805 | 7 klas | SKYNET Brain: GRU, Regime, Thompson, Risk NN |
| `hybrid_quantum_pipeline.js` | 2033 | 8 klas | Quantum pipeline: QMC, QAOA, VQC, QFM, QRA, QDV |
| `quantum_optimizer.js` | 827 | 6 klas | SQA, Quantum Walk, QVaR, Hybrid Scorer |
| `quantum_position_manager.js` | 1454 | 6 klas | Quantum SL/TP, Health Scorer, QPM orchestrator |
| `megatron_system.js` | 941 | 6 klas + 1 fn | Multi-LLM chat AI, command handler, activity feed |
| `quantum_gpu_sim.js` | ~200 | - | GPU simulation (helper) |

### Strategie Zewnętrzne (`trading-bot/core/strategy/`)

| Plik | LOC | Klasa | Typ |
|------|-----|-------|-----|
| `supertrend.js` | ~160 | `SuperTrendStrategy` | Trend-following, SuperTrend crossover + continuation |
| `ma_crossover.js` | ~170 | `MACrossoverStrategy` | EMA9/EMA21 crossover + continuation |
| `momentum_pro.js` | ~160 | `MomentumProStrategy` | ROC crossover + RSI momentum confirmation |

### Ryzyko (`trading-bot/core/risk/`)

| Plik | LOC | Klasa |
|------|-----|-------|
| `advanced_position_manager.js` | 357 | `AdvancedPositionManager` |

### Infrastruktura (root)

| Plik | LOC | Rola |
|------|-----|------|
| `dashboard-server.js` | 197 | HTTP proxy, serwuje HTML dashboard, cache 3s |
| `ecosystem.config.js` | 137 | PM2 config: turbo-bot + dashboard (git conflict markers!) |
| `package.json` | 205 | 60+ dependencies, 30+ scripts |
| `enterprise-dashboard.html` | ~58000 | Frontend UI (single-file SPA) |

---

## 3. MODUŁY GŁÓWNE — SZCZEGÓŁOWA ANALIZA

### 3.1 `bot.js` — `AutonomousTradingBot` (1449 LOC)

**Rola:** Punkt wejścia, orkiestrator. Importuje, inicjalizuje i koordynuje WSZYSTKIE moduły.

**Właściwości konstruktora (31):**
```
config, pm, rm, dp, ml, ensemble, exec, strategies, state, mon, server,
isRunning, _sameCandleCycleCount, _lastAnalyzedCandleTimestamp,
advancedPositionManager, monitoringSystem, duckdbIntegration, queryBuilder,
ensembleEngine, portfolioOptimizer, backtestEngine,
neuralAI, _lastPositionCount, _lastRealizedPnL, _lastConsensusStrategies,
_cycleCount, megatron, quantumEngine, _forceCloseAll, _pauseUntil,
hybridPipeline, quantumPosMgr, _positionMutex
```

**Kluczowe Metody:**

| Metoda | Linie | Opis |
|--------|-------|------|
| `constructor()` | 1-50 | Tworzy 13 modułów + inicjalizuje state |
| `_withPositionLock(fn)` | 51-70 | Async mutex dla PM/APM/QPM race conditions |
| `initialize()` | 71-200 | Start server → OKX → ML → APM → DuckDB → Monitoring → Ensemble → Strategies → Neural AI → Quantum → Megatron → Load state |
| `executeTradingCycle()` | 201-1000 | 27-krokowy cykl (patrz §11) |
| `_applyQuantumPositionActions(qpmResult, history)` | 1001-1150 | Execute SL/TP adjustments, partial closes, pyramids, consolidations |
| `_detectAndLearnFromCloses()` | 1151-1250 | Detect position count/PnL changes, feed neuralAI.learnFromTrade() |
| `start()` | 1251-1350 | initialize() → loop { cycle, broadcast, save, sleep } |
| `stop()` | 1351-1400 | isRunning=false, save state, save neural checkpoint |

### 3.2 `config.js` — `loadConfig()` (37 LOC)

**Zwracany obiekt:**
```javascript
{
  symbol: 'BTCUSDT',
  symbols: ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','ADAUSDT'],
  timeframe: '1h',
  initialCapital: 1000,        // UWAGA: domyślnie 1000, nie 10000
  maxDrawdown: 0.15,           // 15% max drawdown
  riskPerTrade: 0.02,          // 2% per trade
  tradingInterval: 30000,      // 30 sekund
  tradingFeeRate: 0.001,       // 0.1% komisja
  healthCheckPort: 3001,
  mode: process.env.MODE || 'simulation',
  apiKey, secretKey, passphrase,
  enableML: true,
  enableRealTrading: false,
}
```

### 3.3 `portfolio-manager.js` — `PortfolioManager` (196 LOC)

**Stan wewnętrzny:**
```javascript
portfolio: { totalValue, realizedPnL, unrealizedPnL, peakValue, drawdown,
             totalTrades, winningTrades, winRate }
balance: { usdtBalance, btcBalance, lockedBalance }
positions: Map()    // symbol → pozycja
trades: []          // historia zamkniętych transakcji
```

**Pola pozycji:**
```javascript
{
  symbol, side ('LONG'|'SHORT'), entryPrice, quantity, entryTime, value,
  stopLoss, takeProfit, atrAtEntry,
  _partialTpDone,    // which partial TP levels triggered
  _pyramidLevel,     // pyramiding level (PATCH #19)
  _qpmManaged,       // managed by QuantumPositionManager
  _highestPrice,     // LONG trailing reference
  _lowestPrice,      // SHORT trailing reference
}
```

**Metody publiczne:**
- `openPosition(symbol, data)` — LONG/SHORT support, initial SL/TP
- `closePosition(symbol, exitPrice, quantity, reason, strategy)` — direction-aware PnL
- `updateStopLoss(symbol, newSL)` — only tightens (LONG: move up, SHORT: move down)
- `updateTakeProfit(symbol, newTP)` — validates direction
- `addToPosition(symbol, price, quantity, level)` — pyramiding, weighted avg entry
- `updateUnrealizedPnL(symbol, price)` — direction-aware
- `updateMetrics()` — recalculate drawdown, win rate
- `exportState() / restoreState(state)` — serialization

### 3.4 `risk-manager.js` — `RiskManager` (116 LOC)

**Circuit Breaker:**
```javascript
circuitBreaker: {
  isTripped: false,
  consecutiveLosses: 0,
  maxConsecutiveLosses: 5,
  emergencyStop: false,
  lastResetTime: Date.now(),
  tripCount: 0,
}
```
- Auto-reset po 1 godzinie
- Soft pause po 2 consecutive losses (halvess position size)
- Max 10 trades/day

**`calculateDynamicRisk(atr, currentPrice, drawdownPct)`:**
```
atrNormalized = atr / currentPrice
riskPercent = 0.02 - (atrNormalized - 0.02) * 0.5   // 1%–2% range
drawdown penalty: >10% → gradual reduction (max -50% at 60%+)
```

**`calculateOptimalQuantity(symbol, price, atr, balance, drawdownPct)`:**
```
riskPct = calculateDynamicRisk(...)
riskAmount = balance * riskPct
slDistance = atr * 1.5
quantity = riskAmount / slDistance
maxQuantity = balance * 0.15 / price   // 15% max position
softPause → quantity *= 0.5
```

### 3.5 `data-pipeline.js` — `DataPipeline` (236 LOC)

**Data Priority:** WS+OKX hybrid → OKX REST → Mock

**Multi-timeframe fetch:**
| Timeframe | Bars | Użycie |
|-----------|------|--------|
| 5m | 200 | Short-term signals |
| 15m | 200 | Primary strategy timeframe |
| 30m | 100 | Medium-term context |
| 1H | 100 | Trend confirmation |
| 4H | 50 | Macro regime |

**`convertMarketDataToBotState()`** extracts:
- RSI(14), ATR(14), EMA9/21/50/200, ROC(10), ADX(14), SuperTrend
- Per timeframe: m15.rsi, m15.atr, h1.ema_9, h4.rsi etc.
- Fallback logic for missing timeframes (use available data)

**Mock data:** Sinusoidal pattern: `trend + momentum_shift + noise + random_spikes`

### 3.6 `strategy-runner.js` — `StrategyRunner` (219 LOC)

**5 Strategii Wbudowanych:**

| Nazwa | Logika | Sygnał |
|-------|--------|--------|
| **AdvancedAdaptive** | 5 confirmations: trend(SMA20>SMA50), RSI(30-70), MACD(hist>0), BB(%B), volume. Needs 3+ for signal. H1 MTF filter. PATCH #14. | BUY/SELL/HOLD |
| **RSITurbo** | RSI extremes + SMA trend + pullback/divergence analysis | BUY/SELL/HOLD |
| **SuperTrend** | External class `SuperTrendStrategy` (crossover + continuation, ADX>15) | Via run(state) → signals[] |
| **MACrossover** | External class `MACrossoverStrategy` (EMA9/21 crossover + continuation) | Via run(state) → signals[] |
| **MomentumPro** | External class `MomentumProStrategy` (ROC crossover + RSI confirmation) | Via run(state) → signals[] |

**PATCH #14:** Class-based strategies return HOLD on empty signals (no noisy fallbacks), AdvancedAdaptive requires 3+ confirmations.

### 3.7 `ensemble-voting.js` — `EnsembleVoting` (229 LOC)

**Wagi strategii (static + Thompson Sampling blend):**

| Strategia | Waga Statyczna | Blend |
|-----------|---------------|-------|
| AdvancedAdaptive | 0.18 | 60% AI-optimal + 40% static |
| RSITurbo | 0.10 | |
| SuperTrend | 0.12 | |
| MACrossover | 0.10 | |
| MomentumPro | 0.10 | |
| EnterpriseML | 0.20 | |
| NeuralAI | 0.20 | |

**PATCH #20 Volatility-Adjusted Thresholds:**
```
HIGH_VOLATILITY → threshold * 1.15
TRENDING (UP/DOWN) → threshold * 0.90
else → threshold * 1.0
```

**Threshold Tiers:**
| Sytuacja | Threshold | Cap |
|----------|-----------|-----|
| Conflict (50% split) | 50% × mult | capped 60% |
| Strong AI Conviction (>85% conf, >50% weight) | 35% × mult | capped 45% |
| Normal | 40% × mult | capped 50% |
| Skynet Override | 0% | — |

**`vote()` returns:**
```javascript
{
  action: 'BUY'|'SELL'|'HOLD',
  price: weighted_avg_from_consensus_signals,
  confidence: float,
  metadata: { votes, counts, regime, volatilityMultiplier, threshold }
}
```

### 3.8 `execution-engine.js` — `ExecutionEngine` (384 LOC)

**`monitorPositions()`** — Chandelier Trailing Stop (5 phases):

| Phase | ATR Mult | Akcja |
|-------|----------|-------|
| <1.0x | — | Hold (initial SL) |
| 1.0x | +0.3% | Breakeven + buffer |
| 1.5x | 0.5x ATR | Lock 0.5x ATR profit |
| 2.0x | 1.0x ATR | Lock 1.0x ATR profit |
| ≥3.0x | highest − 1.5×ATR | Chandelier trailing from highest price |

**3-Level Partial Take-Profit:**
| Level | At | Close | Remaining |
|-------|------|-------|-----------|
| TP1 | 1.5x ATR | 25% | 75% |
| TP2 | 2.5x ATR | 25% | 50% |
| TP3 | Runner | 50% | 0% (Chandelier) |

**Time Exits:**
- 24h underwater → close
- 48h weak (<0.5x ATR profit) → close
- 72h emergency → force close

**QPM Coordination:** Skips classical trailing for positions with `_qpmManaged=true`.

**`executeTradeSignal()`:**
- ATR-based dynamic risk via `risk-manager.js`
- BUY: SL = price − 1.5×ATR, TP = price + 4.0×ATR
- SELL: close position + learn + CB record
- PATCH #20: Quantity = 0 from ensemble → uses balance-based validation (20% max position value)

### 3.9 `ml-integration.js` — `MLIntegration` (103 LOC)

**Bridge to `EnterpriseMLAdapter`.**

**Faza Progression:**
| Faza | Trades | Confidence Threshold |
|------|--------|---------------------|
| WARMUP | 0–20 | 15% |
| LEARNING | 20–50 | 15%→50% (linear) |
| ADVANCED | 50–100 | 50%→60% |
| AUTONOMOUS | 100+ | 60% |

### 3.10 `state-persistence.js` — `StatePersistence` (42 LOC)

- Path: `/root/turbo-bot/data/bot_state.json`
- Max age: 60 minutes (stale state ignored on load)
- Saves: portfolio, trades, ML state

### 3.11 `monitoring-bridge.js` — `MonitoringBridge` (148 LOC)

**Version:** `6.0.0-ENTERPRISE-MODULAR`

**Prometheus Metrics:**
```
trading_bot_trades_total (Counter)
trading_bot_portfolio_value (Gauge)
trading_bot_drawdown (Gauge)
trading_bot_ml_confidence (Gauge)
trading_bot_signals_total (Counter: buy, sell, hold)
trading_bot_decision_latency (Histogram)
trading_bot_cycle_duration (Histogram)
```

**Health Status:** 7 components checked: `dataFeed`, `strategies`, `riskManagement`, `execution`, `persistence`, `ml`, `portfolio`

### 3.12 `server.js` — `Server` (115 LOC)

**HTTP Endpoints (14):**
| Endpoint | Metoda | Opis |
|----------|--------|------|
| `/` | GET | Redirect to dashboard |
| `/dashboard` | GET | Redirect to :8080 |
| `/health` | GET | Full 7-component health check |
| `/health/ready` | GET | Readiness probe |
| `/health/live` | GET | Liveness probe |
| `/metrics` | GET | Prometheus format |
| `/api/portfolio` | GET | Portfolio state |
| `/api/signals` | GET | Last signals |
| `/api/trades` | GET | Trade history (last 100) |
| `/api/status` | GET | Full bot status |
| `/api/circuit-breaker` | GET | CB status |
| `/api/positions` | GET | Open positions |
| `/api/ml/status` | GET | ML status |
| (Megatron routes) | POST/GET | Attached dynamically |

**WebSocket:** Path `/ws`, broadcast methods: `broadcastPortfolio()`, `broadcastHealth()`, `broadcastAlert()`.

### 3.13 `indicators.js` — Pure Functions (161 LOC)

| Funkcja | Parametry | Opis |
|---------|-----------|------|
| `calculateSMA(data, period)` | number[], int | Simple Moving Average |
| `calculateRSI(closes, period=14)` | number[], int | Wilder's RSI |
| `calculateMACD(closes, ...periods)` | (12,26,9) | MACD line + signal + histogram |
| `calculateEMA(data, period)` | number[], int | Exponential MA |
| `calculateROC(data, period=10)` | number[], int | Rate of Change % |
| `calculateATR(candles, period=14)` | OHLCV[], int | True Range → EMA smoothing |
| `calculateRealADX(candles, period=14)` | OHLCV[], int | Proper +DI/-DI/DX/ADX |
| `calculateBollingerBands(data, period=20, mult=2)` | | upper, middle, lower, %B |
| `calculateVolumeProfile(candles, bins=20)` | | Volume distribution |
| `calculateCurrentVolatility(closes, period=20)` | | Returns std dev |

---

## 4. SYSTEM AI — SZCZEGÓŁOWA ANALIZA

### 4.1 `adaptive_neural_engine.js` (1805 LOC) — SKYNET AUTONOMOUS BRAIN

**7 Klas:**

#### 4.1.1 `FeaturePipeline`
- Rolling z-score normalization with exponential decay (α=0.995)
- **8 LSTM Features:** logReturn, RSI_norm, MACD_hist_norm, BB_%B, ATR_ratio, vol_ratio, SMA_position, EMA_cross
- **12 Regime Features:** vol20, vol50, volRatio, trendDir, trendStrength, meanReversion, rsiZone, atrPercentile, bbBandwidth, macdTrend, volumeTrend, bodyRatio
- **6 Risk Features:** regimeIdx, drawdown, winRate, volatility, consecutiveLosses, hoursSinceLastTrade

#### 4.1.2 `GRUPricePredictor`
- Architecture: **GRU(24, returnSeq=true) → GRU(12) → Dense(3, softmax)**
- ~3,000 parameters
- Adam optimizer, lr=0.0008
- Output classes: `{down, neutral, up}` → direction + confidence
- Training: 80/20 split, triggered every `TRAIN_INTERVAL=200` candles

#### 4.1.3 `MarketRegimeDetector`
- Architecture: **Dense(16, relu) → Dropout(0.15) → Dense(8, relu) → Dense(4, softmax)**
- 4 Regimes: `TRENDING_UP`, `TRENDING_DOWN`, `RANGING`, `HIGH_VOLATILITY`
- Heuristic fallback always available
- Blended: 60% neural + 40% heuristic
- Soft labels: 80% confident label + 20% distributed

#### 4.1.4 `MetaStrategyOptimizer` — Thompson Sampling (Bayesian MAB)
- Beta(α, β) distributions per regime × strategy combination
- Samples via Gamma distribution (Marsaglia & Tsang algorithm)
- Records results with magnitude-proportional updates
- Decays 5% every 50 updates
- Minimum 3% exploration floor
- AI blend ramps: 30% (initial) → 85% (max) based on total updates

#### 4.1.5 `NeuralRiskManager`
- Architecture: **Dense(8, relu) → Dense(4, relu) → Dense(1, sigmoid)**
- Output: risk percentage 0.5%–3.0%
- PATCH #20: Blended 60% neural + 40% evolved risk

#### 4.1.6 `ExperienceBuffer`
- **PATCH #20 Priority Replay:** 70% recent + 30% high-priority (big moves >1%)
- Max size: 2000 experiences
- Tracks: lstmSequences, regimeSamples, riskSamples, candlesProcessed

#### 4.1.7 `AdaptiveNeuralEngine` — Main SKYNET Class

**Evolved Config (self-evolving parameters):**
```javascript
{
  riskPerTrade: 0.015,          // 1.5% default, range 0.5%–3%
  aggressionLevel: 1.0,         // 0.5–2.0 with mean-reversion
  confidenceThreshold: 0.35,    // 25%–50% range
  ensembleOverrideThreshold: 0.85,
  reversalEnabled: true/false,  // based on winRate>50% + PF>1.2
  maxDrawdownTolerance: 0.12,   // 5%–20% range
}
```

**Defense Mode (PATCH #20):**
- Triggered: 3+ consecutive losses
- Effect: Risk reduced by 50% (`DEFENSE_MODE_RISK_REDUCTION=0.5`)
- Cooldown: 1 hour auto-exit

**Key Methods:**
| Metoda | Opis |
|--------|------|
| `initialize()` | Build TF.js models, load checkpoints, determine phase |
| `processMarketUpdate(candles)` | Extract features → regime detect → buffer → phase transitions → training |
| `generateAISignal(candles, hasPosition)` | GRU predict → regime-aware action → aggression × defense filter → confidence check |
| `learnFromTrade(tradeResult)` | Thompson update + streak tracking + defense activation + config evolution + emergency halt |
| `globalParamEvolution()` | Mutate risk/aggression/threshold based on last 50 trades (PF, winRate) |
| `executeOverride(action, conf, reason, dur)` | Force BUY/SELL/VETO for specified duration |
| `emergencyHalt(reason, dur)` | Block ALL trading for duration + enter defense mode |
| `positionCommand(type, symbol, pct, reason)` | Queue PARTIAL_CLOSE/FLIP/SCALE_IN/FORCE_EXIT |
| `checkStarvationOverride()` | After 200 idle cycles → temporarily lower threshold by 10% |
| `learnFromQuantumVerification(strat, approved)` | Cross-system feedback → penalize quantum-rejected strategies |

**Phase Transitions:**
| Phase | Candles | Capabilities |
|-------|---------|-------------|
| HEURISTIC | 0–100 | Only heuristic regime detection |
| LEARNING | 100–500 | Neural regime + heuristic blend |
| AI_ACTIVE | 500+ | Full neural prediction + SKYNET overrides |

### 4.2 `hybrid_quantum_pipeline.js` (2033 LOC) — Quantum Pipeline v3.0

**8 Klas:**

#### 4.2.1 `QuantumMonteCarloEngine`
- 10,000 classical + 2,000 quantum-amplified scenarios
- Merton jump-diffusion model with Student-t tails
- `QuantumState` for importance sampling on tail events
- Output: VaR/CVaR at 95%/99% for 1/5/10 day horizons
- Black swan probability estimation
- Position-specific risk assessment + recommendation generation

#### 4.2.2 `QAOAStrategyOptimizer`
- QAOA depth p=4, 200 iterations
- SPSA gradient estimation (Simultaneous Perturbation Stochastic Approximation)
- Ising model encoding: utility + correlation penalty + constraints
- Selects optimal strategy combination with weights
- Convergence tracking with improvement percentage

#### 4.2.3 `VariationalQuantumClassifier` (VQC)
- 4 qubits, 3 layers, 8 features
- Angle encoding + entanglement (ring CNOTs)
- Parameter-shift rule gradient
- Classifies into 4 regimes: TRENDING_UP/DOWN, RANGING, HIGH_VOLATILITY
- Quantum advantage score computation

#### 4.2.4 `QuantumFeatureMapper` (QFM)
- 5 qubits, ZZ feature map interactions
- Quantum kernel: K(x1,x2) = |⟨φ(x1)|φ(x2)⟩|²
- Hidden correlation detection via kernel matrix clustering
- Entropy-based features extraction

#### 4.2.5 `QuantumRiskAnalyzer` (QRA)
- Combines QMC + 6 stress scenarios + autocorrelation + black swan detection
- **6 Stress Scenarios:** Flash Crash (-8%), Correction (-15%), Volatility Spike (3x), Black Monday (-20%), Liquidity Crisis (-5%), Exchange Halt (-3%)
- **3 Black Swan Indicators:** Extreme move, Vol acceleration, QMC high probability
- Risk score: 0–100 → LOW/MEDIUM/HIGH/CRITICAL

#### 4.2.6 `QuantumDecisionVerifier` (QDV)
- **6 Verification Checks:**
  1. Risk level gate (CRITICAL → reject, HIGH → -30% conf)
  2. Black swan gate (reject BUY, boost SELL)
  3. QMC VaR gate (>3% threshold)
  4. QMC position outlook (<40% profit prob)
  5. Confidence floor (minConfidence=0.45)
  6. QMC recommendation alignment
- **PATCH #20:** Consecutive reject tracking for starvation detection

#### 4.2.7 `DecompositionPipeline`
- JPMorgan-style problem decomposition
- Max sub-problem size: 4 qubits
- Greedy correlation-based clustering (spectral approximation)
- Each sub-problem solved with `SimulatedQuantumAnnealer`
- Merged via expected-return-proportional budget allocation
- Complexity reduction: ~80% for >4 strategies

#### 4.2.8 `HybridQuantumClassicalPipeline` — Main Orchestrator

**Three Stages + Continuous Monitoring:**

| Stage | Gdy | Co robi |
|-------|-----|---------|
| **STAGE 1: preProcess** | Before strategies | Classical features → QFM quantum enhancement |
| **STAGE 2: quantumBoost** | After signals | VQC regime + QRA risk + QMC simulation + QAOA/Decomposer weights + VQC training |
| **STAGE 3: postProcess** | After ensemble | QDV verification gate (approve/reject/modify confidence) |
| **STAGE 4: continuousMonitoring** | QPM calls | VQC regime + QRA risk + QMC sim + QFM correlations (3 levels: RISK_ONLY/STANDARD/FULL) |

**Periodicity Configuration:**
| Operacja | Interwał |
|----------|----------|
| VQC classification | Every cycle |
| QRA risk analysis | Every 10 cycles |
| QMC simulation | Every 15 cycles |
| QAOA + Decomposition weight optimization | Every 30 cycles |
| VQC training | Every 50 cycles |

### 4.3 `quantum_optimizer.js` (827 LOC)

**6 Klas:**

#### `QuantumState` — Simulated Quantum Computer
- n qubits → 2^n dimensional state vector (Float64Array, paired real/imag)
- Gates: `hadamard(qubit)`, `phaseShift(qubit, theta)`, `cnot(control, target)`
- `measure()` → collapse to classical state with probabilistic sampling
- `equalSuperposition()` → apply H to all qubits

#### `SimulatedQuantumAnnealer` (SQA)
- Config: 8 Trotter replicas, 500 iterations, T: 2.0→0.01, Γ: 3.0→0.01
- Path-integral formulation with inter-replica coupling (quantum tunneling)
- Metropolis acceptance with quantum tunneling probability
- Constraints: `sumTo` (portfolio weights), `minValue` (floor)
- Used by: QAOA, Decomposer, QuantumPortfolioOptimizer

#### `QuantumWalkOptimizer`
- Discrete-time quantum walk on 1D lattice (2n+1 positions)
- Market-adapted coin bias from recent returns
- Expected move direction + quantum advantage (spread vs classical √n)
- `groverSearch()` — amplitude amplification for parameter optimization

#### `QuantumPortfolioOptimizer`
- `optimizeWeights()` — Markowitz mean-variance via SQA with 0.3 assumed correlation
- `quantumPricePrediction()` — quantum walk distribution → direction + confidence
- `quantumVaR()` — quantum amplitude estimation for VaR/CVaR (5000 samples, 6 qubits)

#### `HybridQuantumClassicalScorer`
- Blends classical signal with quantum walk prediction
- Agreement → +15% confidence boost; Disagreement → -10% reduce
- Strong quantum + weak classical → quantum override

#### `QuantumHybridEngine` — Legacy Orchestrator
- Used in bot.js for per-signal quantum enhancement (before STAGE 2)
- `enhanceSignal()`, `optimizeWeights()`, `calculateVaR()`

### 4.4 `quantum_position_manager.js` (1454 LOC) — PATCH #18

**6 Klas:**

#### `QuantumDynamicSLTP`
- Base multipliers: SL=1.5x ATR, TP=4.0x ATR, Trailing=1.5x
- **3 Quantum Adjustments:**
  1. VQC Regime (max 60% influence): TRENDING_UP→tighter SL/wider TP, HIGH_VOL→wider SL
  2. QRA Risk: BLACK_SWAN→60% tightening, HIGH(>70)→proportional, LOW(<30)→slight widen
  3. QMC Scenario: BULLISH→+20% TP, BEARISH→-25% TP/-15% SL
- Clamped: SL 0.8x–2.5x ATR, TP 2.0x–6.0x ATR
- Direction-aware: LONG SL can only move UP, SHORT SL can only move DOWN

#### `PositionHealthScorer`
- 6 Weighted Factors (sum to 1.0): PnL(20%), Regime(20%), QMC(20%), Risk(20%), Time(10%), Momentum(10%)
- Score 0–100 → Status: HEALTHY(65+), WARNING(40-65), CRITICAL(25-40), EMERGENCY(<25)
- Recommendations: generated based on status and factor breakdown

#### `MultiPositionOptimizer`
- QAOA-inspired allocation optimization across all open positions
- Pyramid recommendations (SCALE_IN for HEALTHY positions >1.5x ATR)
- Consolidation recommendation (merge correlated positions)

#### `ContinuousReEvaluator`
- Calls `pipeline.continuousMonitoring()` (Stage 4)
- Market-aware acceleration: HIGH_VOL→4× faster, regime transition→3× faster, emergency→every cycle
- 3 re-evaluation levels: RISK_ONLY (lightweight), STANDARD (VQC+QRA), FULL (all systems)

#### `PartialCloseAdvisor`
- 7 Close Triggers: emergency health(<25), health deterioration(-15 in 3 evaluations), critical health(<40) with TRENDING_DOWN, QMC bearish(>60% loss prob), super profit(>5x ATR), extended time(>96h with <1x ATR)
- Close percentages: 25%–100% depending on urgency

#### `QuantumPositionManager` — Main QPM Orchestrator
- `evaluate(positions, priceHistory, portfolioValue, marketDataHistory, getCurrentPrice)` → { adjustments[], partialCloses[], healthReport, portfolioOpt, summary }
- Called from bot.js every cycle, respects re-evaluation scheduling

### 4.5 `megatron_system.js` (941 LOC)

**6 Klas + 1 Funkcja:**

#### `LLMRouter`
- Providers: GitHub Models, OpenAI GPT-4o, Anthropic Claude, xAI Grok, Ollama
- Preferred order: github → grok → claude → openai → ollama
- Failover: All APIs fail → rule-based fallback (Polish/English)
- Protocol: OpenAI-compatible + Claude-specific + Ollama-specific formatting

#### `ContextBuilder`
- Aggregates 8 sections: Portfolio, Positions, Risk, ML, Neural AI, Strategies, Recent Trades, Market
- Generates full context string appended to LLM system prompt

#### `CommandHandler`
- **10 Commands (PL/EN bilingual):**
  1. `change_weight` — regex: "zmień wagę X na Y%" / "set weight X to Y%"
  2. `pause` — "pauza N min" / "pause N min"
  3. `resume` — "wznów" / "resume"
  4. `status` — full report
  5. `explain_trade` — last trade analysis
  6. `performance` — metrics report
  7. `reset_cb` — reset circuit breaker
  8. `risk_level` — set LOW/MEDIUM/HIGH
  9. `close_position` — queue close on next cycle (sets `_forceCloseAll`)
  10. `strategies` — list ensemble weights with visual bars

#### `ConversationMemory`
- Sliding window: max 40 messages
- Per-message: { role, content, timestamp }

#### `AIActivityFeed`
- Ring buffer: max 1000 entries
- Activity types: SIGNAL, REGIME, RISK, TRADE, LEARNING, SYSTEM, QUANTUM, CHAT, COMMAND, ERROR, WARNING, MARKET
- Subscriber pattern for WebSocket broadcast

#### `MegatronCore` — Orchestrator
- `processMessage(userMessage)` → detect command → execute OR build context → LLM call
- `logActivity()` — called by bot modules for activity feed

#### `attachMegatronRoutes(app, wss, wsClients, megatron)` — Express/WS routes
- `POST /api/megatron/chat` — Send message
- `GET /api/megatron/status` — System status
- `GET /api/megatron/activities` — Activity feed
- `GET /api/megatron/history` — Chat history
- `POST /api/megatron/clear` — Clear conversation

---

## 5. STRATEGIE ZEWNĘTRZNE

Wszystkie 3 extendują `BaseStrategy` z `core/strategy/base_strategy.ts` (compiled to JS).

### 5.1 `SuperTrendStrategy`
- **Timeframe:** m15 only
- **Sygnały:** SuperTrend direction crossover (buy↔sell) + continuation (strong trend ADX>15, no open position)
- **Confidence:** `calculateConfidence(distance, ADX/100, volatility, trend)` × 0.7 for continuation
- **SL:** 2×ATR, **TP:** 3×ATR
- **Exit:** `shouldExitPosition()` checks SL/TP hits

### 5.2 `MACrossoverStrategy`
- **Timeframe:** m15 only
- **Sygnały:** EMA9/EMA21 crossover + continuation (ADX>15, gap>0.1%, no position)
- **Confidence:** × 0.65 for non-crossover continuation
- **SL:** 2×ATR, **TP:** 3×ATR

### 5.3 `MomentumProStrategy`
- **Timeframe:** m15 only
- **Sygnały:** ROC zero-line crossover + strong momentum (|ROC|>0.5%) with RSI filter
- **RSI Guard:** No LONG if RSI>65 (overbought), No SHORT if RSI<35 (oversold)
- **Confidence:** × 0.6 for continuation
- **SL:** 2×ATR, **TP:** 3×ATR

---

## 6. ZARZĄDZANIE RYZYKIEM

### 6.1 `AdvancedPositionManager` (APM) — 357 LOC

**Config wymagany:**
```javascript
{
  maxPositions: int,          // max concurrent positions
  maxRiskPerTrade: float,     // max risk per single trade
  maxTotalRisk: float,        // max total portfolio risk
  correlationThreshold: float, // max risk per correlation group
  rebalanceThreshold: float,  // trigger rebalancing
}
```

**Correlation Groups:**
| Grupa | Symbole |
|-------|---------|
| major_crypto | BTC, ETH, BNB |
| alt_crypto | ADA, DOT, LINK, AVAX |
| stable_crypto | USDC, BUSD, TUSD |

**Metody publiczne:**
- `openPosition(id, symbol, dir, entryPrice, size, strategy, riskPct)` — validates limits, initializes trailing stop
- `updatePositions(marketData)` — updates prices, trailing stops, exit checks; returns closed position details
- `closePosition(positionId, reason)` — moves to history
- `checkRebalanceNeed()` — every 4h, triggers if max strategy risk > threshold
- `getPortfolioMetrics()` — totalRisk, PnL, portfolioHeat (stress level)

### 6.2 Wielowarstwowy Model Ryzyka

```
warstwa 1: RiskManager.calculateDynamicRisk()     // ATR + drawdown → 1%-2% risk
    ↓
warstwa 2: RiskManager.calculateOptimalQuantity()  // risk → SL distance → quantity, 15% max cap
    ↓
warstwa 3: EnsembleVoting threshold filtering      // 40-50% minimum consensus
    ↓
warstwa 4: QuantumDecisionVerifier (QDV)           // 6-check verification gate
    ↓
warstwa 5: SKYNET defense mode                     // 3 losses → 50% risk reduction
    ↓
warstwa 6: execution-engine trailing SL/TP         // Chandelier 5-phase
    ↓
warstwa 7: QuantumPositionManager.evaluate()       // Quantum SL/TP + health + partial close
    ↓
warstwa 8: AdvancedPositionManager.updatePositions() // Trailing stop + exit checks
```

---

## 7. INFRASTRUKTURA I DASHBOARD

### 7.1 `dashboard-server.js` (197 LOC)

- HTTP server on port 8080 (env DASHBOARD_PORT)
- Serves: `enterprise-dashboard.html` (main), `megatron-dashboard.html` (standalone)
- Proxies `/health` and `/api/*` to `http://localhost:3001` (bot)
- **Per-path API cache:** 3-second TTL, prevents `/api/trades` returning `/api/status` data
- **POST/PUT/PATCH support** for Megatron chat proxy
- Graceful timeout: 5s for GET, 30s for POST
- Fallback: Returns cached data when bot is offline

**Routes:**
| Path | Serves |
|------|--------|
| `/` | enterprise-dashboard.html |
| `/standalone` | megatron-dashboard.html |
| `/dashboard-health` | Dashboard own health (version 4.0-MEGATRON) |
| `/health`, `/api/*` | Proxied to bot:3001 |

### 7.2 `ecosystem.config.js` (137 LOC)

⚠️ **UWAGA: Plik zawiera nierozwiązane git merge conflict markers (`<<<<<<< HEAD`, `=======`, `>>>>>>>`)!**

**HEAD version (aktualnie na VPS):**
```javascript
apps: [{
  name: 'turbo-bot',
  script: 'npx', args: 'ts-node trading-bot/autonomous_trading_bot_final.ts',
  cwd: '/root/turbo-bot',
  instances: 1, autorestart: true,
  max_memory_restart: '1G',
  kill_timeout: 10000,  // 10s for async checkpoint save
}, {
  name: 'dashboard',
  script: 'node', args: 'dashboard-server.js',
  max_memory_restart: '256M',
}]
```

**Branch version (nie aktywna):**
- turbo-bot: instances=2, exec_mode='cluster' ← potencjalnie problematyczne dla singleton bot
- turbo-dashboard: script='ts-node start_dashboard.ts' (zamiast dashboard-server.js)

### 7.3 `package.json` (205 LOC)

**Key Info:**
- Name: `turbo-trading-bot-enterprise` v4.0.4
- Node: ≥18.0.0
- 30+ scripts defined (start, build, test, dashboard, deploy)
- **Runtime dependencies (60+):** express, ws, axios, dotenv, duckdb, kafkajs, ioredis, prom-client, winston, socket.io, uuid, decimal.js, helmet, joi, etc.
- **TensorFlow.js:** In `optionalDependencies`: `@tensorflow/tfjs`, `@tensorflow/tfjs-node` (v4.22.0)

---

## 8. PEŁNA MAPA KLAS

### Moduły Główne (13 klas)

| # | Klasa | Plik | Metody publiczne |
|---|-------|------|-----------------|
| 1 | `AutonomousTradingBot` | bot.js | constructor, initialize, executeTradingCycle, start, stop |
| 2 | `PortfolioManager` | portfolio-manager.js | openPosition, closePosition, updateStopLoss, updateTakeProfit, addToPosition, updateUnrealizedPnL, updateMetrics, getPortfolio, getBalance, getPositions, getTrades, exportState, restoreState |
| 3 | `RiskManager` | risk-manager.js | isCircuitBreakerTripped, tripCircuitBreaker, recordTradeResult, checkOvertradingLimit, calculateDynamicRisk, calculateOptimalQuantity, getCircuitBreakerStatus, resetCircuitBreaker |
| 4 | `DataPipeline` | data-pipeline.js | initialize, fetchMarketData, getMarketDataHistory, convertMarketDataToBotState, fetchMultipleTimeframes |
| 5 | `StrategyRunner` | strategy-runner.js | initialize, runAllStrategies |
| 6 | `EnsembleVoting` | ensemble-voting.js | vote, getWeightsSummary |
| 7 | `ExecutionEngine` | execution-engine.js | monitorPositions, executeTradeSignal, setInitialSLTP |
| 8 | `MLIntegration` | ml-integration.js | analyze, learn |
| 9 | `StatePersistence` | state-persistence.js | saveState, loadState |
| 10 | `MonitoringBridge` | monitoring-bridge.js | getHealthStatus, recordMetrics, getPrometheusMetrics |
| 11 | `Server` | server.js | start, broadcastPortfolio, broadcastHealth, broadcastAlert |
| 12 | (pure functions) | indicators.js | 10 pure functions (patrz §3.13) |
| 13 | `loadConfig()` | config.js | (factory function) |

### System AI (28 klas)

| # | Klasa | Plik | LOC est. |
|---|-------|------|----------|
| 14 | `FeaturePipeline` | adaptive_neural_engine.js | 200 |
| 15 | `GRUPricePredictor` | adaptive_neural_engine.js | 200 |
| 16 | `MarketRegimeDetector` | adaptive_neural_engine.js | 150 |
| 17 | `MetaStrategyOptimizer` | adaptive_neural_engine.js | 200 |
| 18 | `NeuralRiskManager` | adaptive_neural_engine.js | 120 |
| 19 | `ExperienceBuffer` | adaptive_neural_engine.js | 130 |
| 20 | `AdaptiveNeuralEngine` | adaptive_neural_engine.js | 800 |
| 21 | `QuantumMonteCarloEngine` | hybrid_quantum_pipeline.js | 300 |
| 22 | `QAOAStrategyOptimizer` | hybrid_quantum_pipeline.js | 200 |
| 23 | `VariationalQuantumClassifier` | hybrid_quantum_pipeline.js | 250 |
| 24 | `QuantumFeatureMapper` | hybrid_quantum_pipeline.js | 200 |
| 25 | `QuantumRiskAnalyzer` | hybrid_quantum_pipeline.js | 200 |
| 26 | `QuantumDecisionVerifier` | hybrid_quantum_pipeline.js | 150 |
| 27 | `DecompositionPipeline` | hybrid_quantum_pipeline.js | 180 |
| 28 | `HybridQuantumClassicalPipeline` | hybrid_quantum_pipeline.js | 550 |
| 29 | `QuantumState` | quantum_optimizer.js | 100 |
| 30 | `SimulatedQuantumAnnealer` | quantum_optimizer.js | 130 |
| 31 | `QuantumWalkOptimizer` | quantum_optimizer.js | 200 |
| 32 | `QuantumPortfolioOptimizer` | quantum_optimizer.js | 200 |
| 33 | `HybridQuantumClassicalScorer` | quantum_optimizer.js | 100 |
| 34 | `QuantumHybridEngine` | quantum_optimizer.js | 100 |
| 35 | `QuantumDynamicSLTP` | quantum_position_manager.js | 250 |
| 36 | `PositionHealthScorer` | quantum_position_manager.js | 200 |
| 37 | `MultiPositionOptimizer` | quantum_position_manager.js | 150 |
| 38 | `ContinuousReEvaluator` | quantum_position_manager.js | 250 |
| 39 | `PartialCloseAdvisor` | quantum_position_manager.js | 120 |
| 40 | `QuantumPositionManager` | quantum_position_manager.js | 350 |
| 41 | `LLMRouter` | megatron_system.js | 180 |
| 42 | `ContextBuilder` | megatron_system.js | 130 |
| 43 | `CommandHandler` | megatron_system.js | 200 |
| 44 | `ConversationMemory` | megatron_system.js | 30 |
| 45 | `AIActivityFeed` | megatron_system.js | 60 |
| 46 | `MegatronCore` | megatron_system.js | 150 |

### Strategie + Ryzyko (4 klasy)

| # | Klasa | Plik |
|---|-------|------|
| 47 | `SuperTrendStrategy` | core/strategy/supertrend.js |
| 48 | `MACrossoverStrategy` | core/strategy/ma_crossover.js |
| 49 | `MomentumProStrategy` | core/strategy/momentum_pro.js |
| 50 | `AdvancedPositionManager` | core/risk/advanced_position_manager.js |

**ŁĄCZNIE:** 50 klas + 10 pure functions + 1 factory function + 2 standalone functions

---

## 9. WSZYSTKIE STAŁE I KONFIGURACJA

### adaptive_neural_engine.js Constants

| Stała | Wartość | Opis |
|-------|---------|------|
| `LSTM_WINDOW` | 20 | GRU sequence length |
| `LSTM_FEATURES` | 8 | Number of input features per timestep |
| `REGIME_FEATURES` | 12 | Regime detector input features |
| `RISK_FEATURES` | 6 | Risk predictor input features |
| `REGIMES` | ['TRENDING_UP','TRENDING_DOWN','RANGING','HIGH_VOLATILITY'] | 4 market regimes |
| `DIRECTIONS` | ['DOWN','NEUTRAL','UP'] | 3 price direction classes |
| `DIRECTION_THRESHOLD` | 0.001 | Min return for non-NEUTRAL label |
| `MODEL_DIR` | `/root/turbo-bot/data/ml_checkpoints/neural_ai` | Checkpoint save path |
| `CHECKPOINT_INTERVAL` | 100 | Save every N candles processed |
| `TRAIN_INTERVAL` | 200 | Train models every N candles |
| `MIN_TRAIN_SAMPLES` | 80 | Minimum buffer size before training |
| `BUFFER_MAX_SIZE` | 2000 | Max experience buffer entries |
| `BLEND_AI_WEIGHT_INITIAL` | 0.3 | Initial Thompson Sampling AI influence |
| `BLEND_AI_WEIGHT_MAX` | 0.85 | Maximum Thompson Sampling AI influence |
| `DEFENSE_MODE_TRIGGER_LOSSES` | 3 | Consecutive losses to trigger defense |
| `DEFENSE_MODE_RISK_REDUCTION` | 0.5 | Risk multiplier in defense mode |
| `DEFENSE_MODE_COOLDOWN_MS` | 3600000 | 1 hour defense auto-exit |
| `PARAM_EVOLUTION_INTERVAL` | 50 | Evolve config every N trades |
| `PHASE_RECOVERY_TIMEOUT_MS` | 120000 | 2min phase recovery on training failure |
| `PRIORITY_REPLAY_RATIO` | 0.3 | 30% high-priority samples in training |
| `MIN_TRADES_PER_CYCLE` | 1 | — |
| `STARVATION_WINDOW_CYCLES` | 200 | Cycles without trade → lower threshold |
| `AGGRESSION_RAMP_WINS` | 5 | Consecutive wins to increase aggression |
| `AGGRESSION_DECAY_LOSSES` | 2 | Consecutive losses to decrease aggression |

### hybrid_quantum_pipeline.js Constants

| Stała | Wartość | Opis |
|-------|---------|------|
| `PIPELINE_VERSION` | '3.0.0' | Pipeline version string |
| QMC scenarios | 10,000 + 2,000 | Classical + quantum-amplified paths |
| QAOA depth | p=4 | Layers in QAOA circuit |
| QAOA iterations | 200 | Optimization iterations |
| VQC qubits/layers | 4/3 | Quantum classifier config |
| VQC features | 8 | Input feature count |
| QFM qubits | 5 | Feature mapper qubits |
| Risk analysis interval | 10 cycles | — |
| Weight optimization interval | 30 cycles | — |
| VQC train interval | 50 cycles | — |
| QMC simulation interval | 15 cycles | — |
| VQC training buffer | max 200 | — |
| QDV minConfidence | 0.45 | Minimum decision confidence |
| QDV VaR threshold | 3% | — |
| QDV profit probability threshold | 40% | — |
| Decomposer max sub-problem | 4 qubits | — |

### quantum_optimizer.js Constants

| Stała | Wartość |
|-------|---------|
| `QUANTUM_VERSION` | '1.0.0' |
| SQA replicas | 8 |
| SQA iterations | 500 |
| SQA T: start→end | 2.0→0.01 |
| SQA Γ: start→end | 3.0→0.01 |
| Quantum Walk steps | 100 (default), 60 (portfolio) |
| QVaR qubits | 6 (64 bins) |
| QVaR samples | 5000 |
| Hybrid scorer quantum weight | 0.35 |

### quantum_position_manager.js Constants

| Stała | Wartość |
|-------|---------|
| `POSITION_MANAGER_VERSION` | '1.0.0' |
| Base SL multiplier | 1.5x ATR |
| Base TP multiplier | 4.0x ATR |
| SL range | 0.8x–2.5x ATR |
| TP range | 2.0x–6.0x ATR |
| HEALTHY threshold | 65 |
| WARNING threshold | 40 |
| CRITICAL threshold | 25 |

### megatron_system.js Constants

| Stała | Wartość |
|-------|---------|
| `MEGATRON_VERSION` | '1.0.0' |
| `MAX_CONVERSATION` | 40 messages |
| `MAX_ACTIVITIES` | 1000 entries |
| `LLM_TIMEOUT_MS` | 30000 (30s) |

### config.js Defaults

| Key | Default |
|-----|---------|
| symbol | 'BTCUSDT' |
| initialCapital | 1000 |
| maxDrawdown | 0.15 |
| riskPerTrade | 0.02 |
| tradingInterval | 30000 |
| tradingFeeRate | 0.001 |
| healthCheckPort | 3001 |

### Ensemble Voting Weights

| Strategia | Waga |
|-----------|------|
| AdvancedAdaptive | 0.18 |
| RSITurbo | 0.10 |
| SuperTrend | 0.12 |
| MACrossover | 0.10 |
| MomentumPro | 0.10 |
| EnterpriseML | 0.20 |
| NeuralAI | 0.20 |

---

## 10. KOMPLETNY GRAF ZALEŻNOŚCI

### bot.js require() tree

```
bot.js (ORKIESTRATOR)
│
├── LOKALNE MODUŁY ('./'):
│   ├── config.js                    → loadConfig()
│   ├── portfolio-manager.js         → PortfolioManager
│   ├── risk-manager.js              → RiskManager
│   ├── data-pipeline.js             → DataPipeline
│   ├── strategy-runner.js           → StrategyRunner
│   ├── ensemble-voting.js           → EnsembleVoting
│   ├── execution-engine.js          → ExecutionEngine
│   ├── ml-integration.js            → MLIntegration
│   ├── state-persistence.js         → StatePersistence
│   ├── monitoring-bridge.js         → MonitoringBridge
│   ├── server.js                    → Server
│   └── indicators.js                → (pure functions)
│
├── ML SYSTEM ('../core/ml/'):
│   ├── enterprise_ml_system.js      → EnterpriseMLAdapter
│   ├── production_ml_integrator.js  → ProductionMLIntegrator
│   ├── simple_rl_adapter.js         → SimpleRLAdapter
│   └── ensemble_prediction_engine.js → EnsemblePredictionEngine (TS compiled)
│
├── AI SYSTEM ('../core/ai/'):
│   ├── adaptive_neural_engine.js    → AdaptiveNeuralEngine
│   ├── quantum_optimizer.js         → QuantumHybridEngine  [via hybrid_quantum_pipeline]
│   ├── hybrid_quantum_pipeline.js   → HybridQuantumClassicalPipeline
│   ├── quantum_position_manager.js  → QuantumPositionManager
│   └── megatron_system.js           → MegatronCore, attachMegatronRoutes
│
├── OPTIMIZATION ('../core/optimization/'):
│   └── portfolio_optimization_engine.js → PortfolioOptimizationEngine
│
├── STRATEGIES ('../../core/strategy/'):
│   ├── supertrend.js                → SuperTrendStrategy
│   ├── ma_crossover.js              → MACrossoverStrategy
│   └── momentum_pro.js              → MomentumProStrategy
│
├── RISK ('../../core/risk/'):
│   └── advanced_position_manager.js → AdvancedPositionManager
│
├── INFRASTRUCTURE ('../../infrastructure/'):
│   ├── okx_live_data_client.js      → OKXLiveDataClient
│   ├── websocket/index.js           → MultiSourceWebSocketAggregator
│   └── logging/logger.js            → Logger
│
├── ANALYTICS ('../../analytics/'):
│   ├── duckdb_integration.js        → DuckDBIntegration
│   └── query_builder.js             → QueryBuilder
│
└── MONITORING ('../../../src/monitoring/'):
    └── index.js                     → MonitoringSystem
```

### Internal AI dependencies

```
hybrid_quantum_pipeline.js
  └── imports from quantum_optimizer.js:
      QuantumState, SimulatedQuantumAnnealer,
      QuantumWalkOptimizer, QuantumPortfolioOptimizer

quantum_position_manager.js
  └── uses (via reference):
      HybridQuantumClassicalPipeline.continuousMonitoring()

adaptive_neural_engine.js
  └── imports: @tensorflow/tfjs-node (or fallback @tensorflow/tfjs)
  └── saves to: /root/turbo-bot/data/ml_checkpoints/neural_ai/

megatron_system.js
  └── imports: https, http, fs, path (no external AI deps)
```

---

## 11. 27-KROKOWY WORKFLOW CYKLU TRADINGOWEGO

Cykl `executeTradingCycle()` w bot.js obejmuje 27 kroków sekwencyjnych:

```
 KROK  1: 🔍 Megatron pause check (_pauseUntil > now → skip)
 KROK  2: 🛡️ Circuit breaker check (isTripped → log, skip)
 KROK  3: 📊 Fetch market data (data-pipeline → OKX WS / REST / mock)
 KROK  4: 🔄 Candle deduplication (same timestamp → monitoring-only mode)
          ├─ QPM evaluation even in dedup mode
          └─ Skip to KROK 22 (health update)
 KROK  5: 📝 Append candle to history (200-bar window)
 KROK  6: 🧠 Neural AI processMarketUpdate(candles)
          └─ Feature extraction → regime detection → buffer → train trigger
 KROK  7: ⚛️ HYBRID PIPELINE STAGE 1: preProcess(classicalFeatures, priceHistory)
          └─ Classical features → QFM quantum feature enhancement
 KROK  8: 📈 Run ALL strategies (strategy-runner → 5 strategies → signals Map)
 KROK  9: 🔬 ML analysis (ml-integration → EnterpriseMLAdapter → ML signal)
 KROK 10: ⚡ Neural AI generateAISignal(candles, hasPosition) → NeuralAI signal
 KROK 11: 🌀 Quantum signal enhancement (legacy per-signal via QuantumHybridEngine)
 KROK 12: ⚛️ HYBRID PIPELINE STAGE 2: quantumBoost(signals, priceHistory, ...)
          ├─ VQC regime classification (every cycle)
          ├─ QRA risk analysis (every 10 cycles)
          ├─ QMC scenario simulation (every 15 cycles)
          ├─ QAOA + Decomposition weight optimization (every 30 cycles)
          └─ VQC training (every 50 cycles)
 KROK 13: 🔴 Force close if Megatron command (_forceCloseAll)
 KROK 14: 🗳️ Ensemble voting (7 signals → weighted vote → consensus)
          └─ PATCH #20: regime-adjusted thresholds
 KROK 15: 🤖 SKYNET OVERRIDE GATE
          ├─ Veto: block trade if Skynet says HOLD
          ├─ Force: override ensemble with Skynet BUY/SELL
          └─ Defense: reduce confidence in defense mode
 KROK 16: 🔄 SKYNET STARVATION OVERRIDE
          └─ 200+ idle cycles → temporarily lower threshold by 10%
 KROK 17: 📋 SKYNET POSITION COMMANDS
          └─ consumePositionCommands() → queue PARTIAL_CLOSE/FLIP/SCALE_IN/FORCE_EXIT
 KROK 18: ⚛️ HYBRID PIPELINE STAGE 3: postProcess(consensus, portfolioValue)
          └─ QDV 6-check verification gate (approve/reject/modify)
          └─ Starvation bypass: if QDV consecutive rejects > threshold → pass through
 KROK 19: 💹 Execute trade (execution-engine.executeTradeSignal)
          └─ ATR risk calculation → position sizing → BUY(+SL/TP)/SELL(close+learn)
 KROK 20: 🎯 Set initial quantum SL/TP if new position opened
          └─ QPM.dynamicSLTP.calculate() for initial quantum-adjusted levels
 KROK 21: 📏 SL/TP monitoring (execution-engine.monitorPositions)
          └─ Chandelier trailing, partial TP, time exits
 KROK 22: 🔒 APM monitoring under position mutex
          └─ AdvancedPositionManager.updatePositions() → exit signals → sync with PM
 KROK 23: 🔗 APM-PM state sync (reconcile positions)
 KROK 24: ⚛️ QPM full-cycle evaluation under position mutex
          └─ QPM.evaluate() → SL/TP adjustments, partial closes, health report
          └─ _applyQuantumPositionActions() → execute changes
 KROK 25: 📚 Neural AI learn from closes
          └─ _detectAndLearnFromCloses() → feed neuralAI.learnFromTrade()
 KROK 26: ❤️ Health/state update (mon.getHealthStatus → broadcastHealth)
 KROK 27: 📊 Periodic status logs (every 5 cycles)
          └─ Portfolio value, margins, regime, defense mode, cycle time

 ⏰ Sleep tradingInterval (30s default) → REPEAT from KROK 1
```

### Conditional Branches

| Warunek | Akcja |
|---------|-------|
| Circuit breaker tripped | Skip to KROK 26 |
| Megatron pause active | Skip to KROK 26 |
| Same candle (dedup) | Skip to KROK 22 (but QPM still runs) |
| Low ensemble confidence | KROK 19 → no trade, but learning continues |
| QDV rejection (STAGE 3) | Trade blocked, action=HOLD |
| SKYNET veto/override | Override ensemble decision |
| Starvation | Lower thresholds temporarily |
| Force close | Close all positions immediately |

---

## 12. SYSTEM PATCHÓW (#14–#20)

| Patch | Komponent | Opis Zmian |
|-------|-----------|------------|
| **#14** | strategy-runner.js | Class-based strategies return HOLD on empty signals; AdvancedAdaptive requires 3+ confirmations; eliminated noisy fallback signals |
| **#15** | (various) | Configuration improvements, threshold adjustments |
| **#16** | (various) | ML integration improvements |
| **#17** | (various) | Quantum pipeline v2 integration |
| **#18** | quantum_position_manager.js | NEW: QuantumPositionManager with 6 sub-components (Dynamic SL/TP, Health Scorer, Multi-Position Optimizer, Continuous Re-Evaluator, Partial Close Advisor). Stage 4 pipeline integration. |
| **#19** | bot.js, portfolio-manager.js | Pyramiding support (addToPosition), consolidation execution. QPM pyramid/consolidation actions applied via `_applyQuantumPositionActions()` |
| **#20** | ALL AI files | **SKYNET AUTONOMOUS BRAIN** — Major overhaul: (1) Defense mode (3 loss trigger, 50% risk reduction). (2) Config self-evolution (risk, aggression, confidence threshold mutate based on performance). (3) Priority replay (70/30 split). (4) Starvation detection and override (200 idle cycles → lower threshold). (5) Cross-system feedback (quantum rejection → strategy penalty). (6) Position commands (PARTIAL_CLOSE, FLIP, SCALE_IN, FORCE_EXIT). (7) Regime-adjusted ensemble thresholds. (8) QDV consecutive reject tracking. (9) Execution-engine quantity=0 fix. |

---

## 13. EXPORTS I PUBLICZNE API KAŻDEGO MODUŁU

### Moduły (`modules/`)

| Moduł | Export |
|-------|--------|
| config.js | `{ loadConfig }` |
| portfolio-manager.js | `{ PortfolioManager }` |
| risk-manager.js | `{ RiskManager }` |
| data-pipeline.js | `{ DataPipeline }` |
| strategy-runner.js | `{ StrategyRunner }` |
| ensemble-voting.js | `{ EnsembleVoting }` |
| execution-engine.js | `{ ExecutionEngine }` |
| ml-integration.js | `{ MLIntegration }` |
| state-persistence.js | `{ StatePersistence }` |
| monitoring-bridge.js | `{ MonitoringBridge }` |
| server.js | `{ Server }` |
| indicators.js | `{ calculateSMA, calculateRSI, calculateMACD, calculateEMA, calculateROC, calculateATR, calculateRealADX, calculateBollingerBands, calculateVolumeProfile, calculateCurrentVolatility }` |
| bot.js | (auto-starts, no explicit export) |

### AI System (`core/ai/`)

| Moduł | Export |
|-------|--------|
| adaptive_neural_engine.js | `{ AdaptiveNeuralEngine }` |
| hybrid_quantum_pipeline.js | `{ HybridQuantumClassicalPipeline, QuantumMonteCarloEngine, QAOAStrategyOptimizer, VariationalQuantumClassifier, QuantumFeatureMapper, QuantumRiskAnalyzer, QuantumDecisionVerifier, DecompositionPipeline, PIPELINE_VERSION }` |
| quantum_optimizer.js | `{ QuantumHybridEngine, QuantumPortfolioOptimizer, HybridQuantumClassicalScorer, SimulatedQuantumAnnealer, QuantumWalkOptimizer, QuantumState, QUANTUM_VERSION }` |
| quantum_position_manager.js | `{ QuantumPositionManager, QuantumDynamicSLTP, PositionHealthScorer, MultiPositionOptimizer, ContinuousReEvaluator, PartialCloseAdvisor, POSITION_MANAGER_VERSION }` |
| megatron_system.js | `{ MegatronCore, AIActivityFeed, LLMRouter, ContextBuilder, CommandHandler, ConversationMemory, attachMegatronRoutes, MEGATRON_VERSION, ACTIVITY_ICONS }` |

### Strategie (`core/strategy/`)

| Moduł | Export |
|-------|--------|
| supertrend.js | `{ SuperTrendStrategy }` |
| ma_crossover.js | `{ MACrossoverStrategy }` |
| momentum_pro.js | `{ MomentumProStrategy }` |

### Ryzyko (`core/risk/`)

| Moduł | Export |
|-------|--------|
| advanced_position_manager.js | `{ AdvancedPositionManager }` |

---

## ZNANE PROBLEMY I RYZYKA TECHNICZNE

1. **Git Merge Conflicts w `ecosystem.config.js`** — Nierozwiązane `<<<<<<<` / `=======` / `>>>>>>>` markers. PM2 może parsować HEAD version, ale plik jest technicznie niepoprawny.

2. **Cluster Mode w branch version** — `instances: 2, exec_mode: 'cluster'` dla singleton trading bot → potential race conditions na pozycjach i stanie.

3. **TensorFlow.js model size** — GRU(24+12) + RegimeDetector + RiskPredictor → ~5K parametrów łącznie. Relatywnie małe modele, ryzyko underfitting.

4. **Quantum pipeline compute cost** — QMC 10K + 2K scenariuszy, QAOA 200 iteracji, VQC training — wszystko w single-threaded Node.js. Na 1 CPU VPS może powodować latency spikes (>100ms per cycle noted).

5. **Position mutex** — `_withPositionLock()` chroni przed race conditions PM/APM/QPM, ale jest cooperative (nie OS-level lock). Crash during lock → potential state inconsistency.

6. **Same-candle deduplication** — QPM nadal evaluates w dedup mode, ale inne systemy nie. Asymetria może powodować nieoczekiwane zachowania SL/TP.

7. **60+ npm dependencies** — Surface attack area dla supply chain. Wiele dependencies niepotrzebnych runtime (React, Vite, kafkajs, redis) → package-lock.json krytyczny.

---

## PODSUMOWANIE STATYSTYCZNE

| Metryka | Wartość |
|---------|---------|
| **Łączna liczba klas** | 50 |
| **Łączna liczba linii kodu (JS)** | ~11,300+ |
| **Pliki krytyczne** | 22 |
| **Strategie tradingowe** | 7 (5 classical + ML + NeuralAI) |
| **Modele ML/NN** | 3 (GRU, RegimeDetector, RiskPredictor) |
| **Quantum komponenty** | 8 (QMC, QAOA, VQC, QFM, QRA, QDV, Decomposer, SQA) |
| **API endpoints** | 14+ (plus Megatron 5) |
| **Warstwy ryzyka** | 8 (od ATR risk do QPM) |
| **Patche** | #14–#20 (7 major patches) |
| **LLM providers** | 5 (GitHub, OpenAI, Claude, Grok, Ollama) |
| **Komendy NL** | 10 (PL+EN bilingual) |

---

*KONIEC KOMPLETNEJ ANALIZY STRUKTURALNEJ*

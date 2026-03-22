# CLAUDE-SKYNET FULL SYSTEM AUDIT v2026-03

```
CLAUDE-SKYNET v1.0 – Turbo-Bot Evolution
AUDIT TYPE: Full System — Chirurgicznie bezlitosny
DATE: 2026-03-13
PATCHES AUDITED: #1 — #152
SCOPE: Architektura, Parytet Live/Backtest, Humanoidalność, Quantum GPU,
       Ollama/LLM, Dashboard, Per-Pair vs Portfolio, Top 10 Bugs,
       Profit-Enhancing Changes, Backtest Proposals
```

---

## SPIS TREŚCI

1. [Executive Summary](#1-executive-summary)
2. [Architektura & Parytet Live/Backtest](#2-architektura--parytet-livebacktest)
3. [Humanoidalność — Skynet/NeuronAI/Learning](#3-humanoidalność--skynetneuronailearning)
4. [Quantum GPU — Prawda vs Naming Convention](#4-quantum-gpu--prawda-vs-naming-convention)
5. [Ollama/LLM Integration](#5-ollamallm-integration)
6. [Dashboard + Trade Analysis](#6-dashboard--trade-analysis)
7. [Per-Pair vs Portfolio Coordination](#7-per-pair-vs-portfolio-coordination)
8. [TOP 10 Bugs (P0/P1/P2)](#8-top-10-bugs-p0p1p2)
9. [Real Profit-Enhancing Changes](#9-real-profit-enhancing-changes)
10. [Parallel Backtest Proposals](#10-parallel-backtest-proposals)

---

## 1. EXECUTIVE SUMMARY

### Werdykt: System z solidnym szkieletem, ale z fundamentalnymi pęknięciami parytetowymi i iluzorycznym AI learning.

| Metryka | Stan | Werdykt |
|---------|------|---------|
| **Architektura** | 8-source ensemble + 6 gate pipeline | ✅ Dojrzała |
| **Backtest↔Live parytet** | 10 krytycznych rozbieżności | 🔴 FATAL |
| **NeuronAI "learning"** | Iluzja — reactive risk mgmt, nie ML | 🔴 FAKOWY |
| **Skynet GRU/Thompson** | Prawdziwy retraining, ale brak walidacji | 🟡 NIEUDOWODNIONY |
| **Quantum** | GPU realny (PyTorch CUDA), "quantum" = nazewnictwo | 🟡 MIESZANY |
| **Ollama/LLM** | Działa (qwen3:14b, 5 botów, ~1.2s/inference) | ✅ DZIAŁA |
| **Dashboard** | Kompletny, 5s refresh, WS streaming | ✅ FUNKCJONALNY |
| **Per-pair isolation** | File-based coordinator, race condition window | 🟡 RYZYKOWNY |
| **ML System** | XGB+LGB+XGB-reg, 61 features, walk-forward CV | ✅ SOLIDNY |
| **Testy** | 232/232 passing | ✅ ZIELONE |

### Kluczowe liczby:
- **Capital**: $10,000 (BTC 10%, ETH 12%, SOL 30%, BNB 38%, XRP 10%)
- **Fee rate**: 0.05% per side (0.1% round-trip)
- **Max position**: 15% of bot capital
- **Max drawdown**: 15% kill switch
- **Confidence floor**: 0.30
- **Signal sources**: 6 strategii + NeuralAI + EnterpriseML + PythonML + LLM + Quantum + Sentiment = 8+ źródeł

### Krytyczne znaleziska:
1. **Backtest SL/TP ≠ Live SL/TP** — partial TP levels różnią się 2× (backtest @1.25×ATR vs live @2.5×ATR)
2. **NeuronAI `learnFromTrade()` to nie learning** — to +0.08/-0.04 hardcoded confidence bump
3. **"Quantum" = classical algorithms names with "quantum"** — GPU jest prawdziwy, matematyka klasyczna
4. **Cross-pair learning = ZERO** — 5 botów uczy się niezależnie, bez pooled intelligence
5. **Min-hold cooldown (`_lastCloseTime`) ginie po restarcie** — in-memory only

---

## 2. ARCHITEKTURA & PARYTET LIVE/BACKTEST

### 2.1 Architektura Signal Flow (Live)

```
┌─────────────────────────────────────────────────────────────────┐
│                    TURBO-BOT SIGNAL PIPELINE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LAYER 1: DATA ACQUISITION                                       │
│  ┌──────────┐   ┌───────────┐   ┌──────────┐                    │
│  │ OKX Feed │──▸│DataPipeline│──▸│ History  │                    │
│  │ WebSocket│   │ dedup+MTF │   │ 500+ c.  │                    │
│  └──────────┘   └───────────┘   └──────────┘                    │
│                                                                  │
│  LAYER 2: SIGNAL GENERATION (8+ sources in parallel)             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ MACrossover(0.22) AdvancedAdaptive(0.20) SuperTrend(0.17) │  │
│  │ RSITurbo(0.14)    NeuralAI(0.10)        MomentumPro(0.10)│  │
│  │ EnterpriseML      PythonML(0.07)                          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                     ↓                                            │
│  +++ ML Hard/Soft Veto (PATCH #54, #150A: CV≥0.55 gate) +++     │
│  +++ LLM Validation (+/- confidence) +++                        │
│  +++ Sentiment Analysis (fear/greed ±10%) +++                   │
│  +++ Quantum Boost (QAOA/VQC/QMC/QRA) +++                      │
│                     ↓                                            │
│  LAYER 3: ENSEMBLE VOTING                                        │
│  ┌─────────────────────────────────┐                             │
│  │ Thompson Sampling (60% AI + 40% static weights)              │
│  │ Dynamic threshold (0.25–0.40)  │                             │
│  │ MTF bias (counter=×0.55, aligned=×mult)                      │
│  │ RANGING penalty (×0.60)         │                             │
│  │ Confidence floor: 0.20          │                             │
│  └─────────────────────────────────┘                             │
│                     ↓                                            │
│  LAYER 4: PRIME GATE (finalizeRuntimeConsensus)                  │
│  ┌─────────────────────────────────┐                             │
│  │ NeuronAI validation (conf≥0.30) │                            │
│  │ DD sizing reduction (10-15%→ linear)                         │
│  │ Circuit breaker (5 losses = 1h halt)                         │
│  │ Kill switch (DD≥15% = HALT ALL) │                            │
│  └─────────────────────────────────┘                             │
│                     ↓                                            │
│  LAYER 5: EXECUTION                                              │
│  ┌─────────────────────────────────┐                             │
│  │ Portfolio Coordinator gate      │                             │
│  │ Fee gate (profit ≥ 1.5× fees)  │                             │
│  │ Min-hold cooldown (15min)       │                             │
│  │ Position sizing (ATR+conf+regime)│                            │
│  │ SL = entry ± 1.5×ATR           │                             │
│  │ TP = entry ± 4.0×ATR           │                             │
│  └─────────────────────────────────┘                             │
│                     ↓                                            │
│  LAYER 6: POSITION MANAGEMENT (every cycle)                      │
│  ┌─────────────────────────────────┐                             │
│  │ Chandelier trailing (3 phases)  │                             │
│  │ Partial TP L1@2.5× (25%)       │                             │
│  │ Partial TP L2@4.0× (25%)       │                             │
│  │ Time exits (72h/48h/24h)       │                             │
│  │ QPM quantum position mgmt      │                             │
│  │ NeuronAI rich actions (SCALE_IN, FLIP, ADJUST_SL/TP)        │
│  └─────────────────────────────────┘                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Parytet Backtest ↔ Live — 10 KRYTYCZNYCH ROZBIEŻNOŚCI

| # | Parametr | Backtest | Live | Impact |
|---|----------|----------|------|--------|
| **1** | **SL dystans** | 1.75×ATR | 1.5×ATR (dynamicznie 2×ATR/price) | Backtest SL jest dalej od entry |
| **2** | **TP bazowy** | 2.5×ATR | 4.0×ATR | Live TP 60% dalej |
| **3** | **Partial L1** | @1.25×ATR, 25% | @2.5×ATR, 25% | **2× różnica dystansu** |
| **4** | **Partial L2** | @2.25×ATR, 25% | @4.0×ATR, 25% | **1.78× różnica dystansu** |
| **5** | **Partial L3** | @3.75×ATR, 50% | Brak (runner) | Backtest ma 3. level |
| **6** | **Trailing fazy** | 5 faz (0.7, 1.0, 1.5, 2.0, 2.5×R) | 3 fazy (1.5, 2.0, 3.0×ATR) | Inna skala i więcej stopni |
| **7** | **Chandelier Ph5 width** | highest − 1.0×ATR | highest − 2.0×ATR | **Live 2× szersza = więcej zysku zostawia** |
| **8** | **RANGING sizing** | ×0.70 (nadal handluje) | ×0.30 (prawie stoi) | **2.3× różnica** |
| **9** | **BE buffer** | 0.45×ATR | 0.3% fixed | Inna metryka |
| **10** | **Base risk%** | 1.5% | 2.0% | 33% różnica sizing |

### 2.3 Dlaczego to jest FATAL

**Backtest zabiera zyski wcześniej** (partial @1.25×ATR) a **live czeka dłużej** (@2.5×ATR).
W praktyce:
- Backtest P&L = wysoka win rate, mniejsze wygrane
- Live P&L = niższa win rate, ale gdy wygrywa to więcej

**Rezultat**: Backtest wyniki **nie prognozują live performance**. Każdy backtest raport (PATCH #59-72) jest oparty na parametrach, które NIE odpowiadają live execution. To invaliduje CAŁĄ backtest evidence base.

### 2.4 Co się ZGADZA ✅
- Fee rate: 0.05% per side
- Confidence floor: 0.30
- Time exits: 72h/48h/24h
- Signal generation pipeline (5 classical + ML + NeuronAI + Quantum)
- Ensemble voting architecture
- ML hard veto logic (CV≥0.55 gate)

---

## 3. HUMANOIDALNOŚĆ — SKYNET/NEURONAI/LEARNING

### 3.1 NeuronAI `learnFromTrade()` — ILUZJA LEARNINGU

**Co robi:**
```javascript
learnFromTrade(tradeResult) {
    if (pnl >= 0) {
        confidenceBoost += 0.08;       // hardcoded constant
        if (streak ≥ 2) riskMultiplier += 0.18;
    } else {
        confidenceBoost -= 0.04;       // hardcoded constant
        if (streak ≥ 2) riskMultiplier -= 0.04;
    }
    this._saveState();
}
```

**Czego NIE robi:**
- ❌ Nie uczy się parametrów decyzyjnych
- ❌ Nie posiada gradient descent
- ❌ Nie aktualizuje Bayesian posteriors
- ❌ Nie optymalizuje feature weights
- ❌ Nie rozpoznaje wzorców błędów

**Werdykt**: To jest **reactive risk management** (jak termostat), nie AI learning. Nazwa `learnFromTrade` jest myląca.

### 3.2 NeuronAI Evolution (`_applyEvolution()`) — LLM TEXT PARSING

```javascript
{ pattern: /(?:increase|zwieksz).*(?:ml|machine.?learn)/i,
  action: () => {
    this.adaptedWeights.EnterpriseML = Math.min(0.45, (w || 0.30) + 0.05);
  }
}
```

LLM mówi "increase ml weight" → regex match → waga +0.05. To nie jest ewolucja — to **config adjustment via prompt**.

### 3.3 Skynet (AdaptiveNeuralEngine) — PRAWDZIWY LEARNING ✅

| Komponent | Real Learning? | Mechanizm |
|-----------|---------------|-----------|
| **GRU Direction Predictor** | ✅ TAK | TF.js model.fit() co 200 candles, 8 features × 20 timesteps |
| **Thompson Sampling** | ✅ TAK | Beta(α,β) posteriors, Bayesian MAB na strategy weights |
| **Regime Detector** | ✅ TAK | Supervised classification, continuous update |
| **Risk Neural Regression** | ✅ TAK | Online learning z experience buffer |

**ALE — FUNDAMENTALNY PROBLEM:**
- ❌ Brak metryki accuracy w logach — nie wiadomo czy GRU się poprawia
- ❌ Brak holdout validation — model trenowany i testowany na tych samych danych
- ❌ Brak regret tracking — Thompson Sampling aktualizuje, ale nie mierzy regret
- ❌ Win rate w raportach = wynik rynku, nie jakość learning

**Werdykt Skynet**: Model się retrenuje — to prawda. Ale **nie ma dowodu, że retraining poprawia predictions**. Market noise dominuje nad learning signal.

### 3.4 Enterprise ML (Deep RL) — PPO-BASED

| Faza | Trades | Threshold | Tryb |
|------|--------|-----------|------|
| WARMUP | 0-20 | 0.15 | Allows all |
| LEARNING | 20-50 | 0.15→0.50 | Ramping selectivity |
| ADVANCED | 50-100 | 0.50→0.60 | Mature filtering |
| AUTONOMOUS | 100+ | 0.60 | Strict, high-edge only |

- L1/L2 regularization, 25% dropout, early stopping (50 ep plateau)
- Checkpoints co 100 episodes do `./data/ml_checkpoints/`
- **25 features** z tier 1 (7 base), tier 2 (10 advanced), tier 3 (8 external)

### 3.5 Python ML Service — SOLIDNY ✅

- XGBoost + LightGBM + XGBoost Regressor ensemble
- 61 features (returns, volatility, microstructure, regime indicators, candle patterns)
- Walk-forward TimeSeriesSplit (5 folds) — no future leakage
- Regularne retraining co 200 candles
- CV accuracy gate: ≥ 0.55 for hard veto authority
- **Aktualny CV: 51.9%** — poniżej gate, więc hard veto WYŁĄCZONY

---

## 4. QUANTUM GPU — PRAWDA VS NAMING CONVENTION

### 4.1 GPU Computations — 100% REALNE ✅

```python
# gpu-cuda-service.py — PyTorch CUDA on RTX 5070 Ti
z = torch.randn(n_paths, n_steps, device='cuda:0')     # 50K paths GPU random
cum_returns = torch.cumsum(log_returns, dim=1)           # GPU cumulative sum
samples = torch.randint(0, 2, (4096, n_qubits), device='cuda:0')  # GPU sampling
energies = torch.matmul(samples, h.unsqueeze(1))         # GPU matrix multiply
var = torch.quantile(pnl_tensor, 0.05)                   # GPU VaR
```

- **VRAM allocation**: 40% of 16GB = ~6.4GB
- **Batch sizes**: 50,000 Monte Carlo paths × 252 steps
- **Real speedup**: 30-100× vs CPU

### 4.2 "Quantum" Algorithms — NAMING CONVENTION ❌

| Algorytm | Prawdziwy Quantum? | Co to naprawdę jest |
|----------|-------------------|---------------------|
| **QAOA** | ❌ | Simulated Quantum Annealing = random walk z decay |
| **VQC** | ❌ | Parametrized neural net z probabilistic loss = standard ML classifier |
| **QMC** | 🟡 Hybrid | GPU Monte Carlo = fast random path generation, not amplitude estimation |
| **QRA** | ❌ | VaR + tail risk = standard risk metrics computed on GPU |
| **QuantumState** | ❌ | Float64Array na CPU, max 16 qubits = toy simulation |
| **Grover Search** | ❌ | Amplitude amplification na CPU Float64Array |

### 4.3 JavaScript GPU Stub (PATCH #43)

```javascript
// quantum_gpu_sim.js — ALL GPU ops return null → forces RemoteGPUClient
function gpuBatchMonteCarlo() { return null; }
function gpuMatMul() { return null; }
```

**Design**: JS stuby returnują `null` → wymusza offload na Python CUDA backend. Brak CPU fallback w batch ops.

### 4.4 Werdykt GPU/Quantum

**GPU = REAL** — PyTorch CUDA tensors, real VRAM allocation, measurable speedup.
**Quantum = NAMING** — Classical algorithms z "quantum" prefix. Żadne qubity, żadna superpozycja, żaden entanglement. Ale algorytmy same w sobie (Monte Carlo, SQA, VaR) są użyteczne numerycznie.

**Rekomendacja**: Rename "Quantum Monte Carlo" → "GPU Monte Carlo", "QAOA" → "Simulated Annealing". Honest naming nie zmniejsza wartości.

---

## 5. OLLAMA/LLM INTEGRATION

### 5.1 Stan aktualny ✅

| Parametr | Wartość |
|----------|---------|
| Model | qwen3:14b (9.3GB VRAM) |
| GPU | RTX 5070 Ti (16GB) |
| Tunnel | SSH reverse: VPS:11434 → LocalPC:11434 |
| Timeout | 60,000ms |
| Eval time | ~1.2s per request |
| `format` | `'json'` (compact, no pretty-print) |
| `think` | `false` (no internal monologue) |
| `num_predict` | 500 tokens |
| Fallback chain | Ollama → GitHub Copilot → Grok → CPU heuristics |
| Status | ✅ Wszystkie 5 botów `Provider: ollama` |

### 5.2 Architektura LLM Call

```
Bot cycle (every ~5min) 
  → NeuronAIManager.makeDecision(fullState)
  → LLMRouter._callProvider('ollama', systemPrompt, messages)
  → HTTP POST http://localhost:11434/api/chat
    {model: 'qwen3:14b', format: 'json', think: false, 
     messages: [system + user prompt]}
  → Parse JSON response → actionMap → BUY/SELL/HOLD/SCALE_IN/etc.
```

### 5.3 System Prompt (Neuron AI)

Prompt jest w języku polskim (~2KB), definiuje:
- Rolę: executive layer pod Skynetem
- Max risk: 2% per trade
- Dostępne akcje: OPEN_LONG/SHORT, CLOSE, HOLD, SCALE_IN, PARTIAL_CLOSE, FLIP, ADJUST_SL/TP, OVERRIDE_BIAS
- Reguły: anti-scalping (min 15min hold), counter-trend forbidden, quality over quantity
- Output: strict JSON z action, confidence, details, evolution, personality

### 5.4 Potential Issues

| Issue | Severity | Opis |
|-------|----------|------|
| **5 concurrent requests** | Medium | 5 botów odpytuje Ollama jednocześnie → queue ~6s z 14b model |
| **Tunnel dependency** | High | Gdy Windows PC jest wyłączony lub tunnel padnie → fallback na CPU heuristics |
| **No response validation** | Medium | LLM może zwrócić nonsensowny JSON (np. confidence: 15.0) — brakuje strict schema validation |
| **FLIP double fees** | Low | LLM może zaproponować FLIP = close + open opposite = 2× round-trip fees |

### 5.5 Rozwiązane problemy (ta sesja)

- ✅ Timeout 5s → 60s (qwen3 inference time)
- ✅ `think: false` (eliminacja internal monologue)
- ✅ `format: 'json'` (compact output, nie pretty-printed)
- ✅ `num_predict: 500` (pełny JSON mieści się)
- ✅ JSON extraction regex `\{[\s\S]*\}` (mixed text fallback)
- ✅ Switch qwen3:30b → qwen3:14b (5× faster, 9.3GB vs 18GB VRAM)

---

## 6. DASHBOARD + TRADE ANALYSIS

### 6.1 Architektura Dashboard

```
┌──────────────────────────────┐
│  enterprise-dashboard.html   │  ← Browser (HTML5 + JS)
│  - Binance WS (live prices)  │
│  - REST polling (5-10s)      │
│  - Megatron WS (AI feed)     │
└──────────────┬───────────────┘
               │ HTTP + WS
┌──────────────▼───────────────┐
│  dashboard-server.js :8080   │  ← Node.js aggregation proxy
│  - /health → 5 bots          │
│  - /api/status                │
│  - /api/trades                │
│  - /api/positions             │
│  - /api/portfolio/coordinator │
│  - /ws → WS proxy to :3001   │
│  - 3s TTL cache per route    │
└──────────────┬───────────────┘
               │ HTTP
┌──────────────▼───────────────┐
│  5 bot instances              │
│  [:3001] [:3002] [:3003]      │
│  [:3004] [:3005]              │
└──────────────────────────────┘
```

### 6.2 Dane wyświetlane

| Sekcja | Dane | Refresh |
|--------|------|---------|
| Ticker Bar | BTC/ETH/SOL/BNB/XRP price + 24h% | Binance WS (real-time) |
| KPI Strip | Total value, Realized PnL, Win rate, Sharpe, Max DD | 5s |
| AI Brain Panel | Regime, confidence, decisions, learning rate | 5s |
| Trades Table | Last 500 trades (entry/exit/PnL) | 10s |
| Positions Panel | Open positions + unrealized PnL | 5s |
| Circuit Breaker | Trip status, consecutive losses | 5s |
| TradingView Chart | BTC candles (15m/1h/4h/1d) | Binance REST |
| Equity Curve | Portfolio value over time | 5s |
| Megatron Chat | AI activity + user commands | WS real-time |

### 6.3 Issues

- **Cache Fallback**: Gdy bot offline → dashboard wyświetla stale cached data bez oznaczenia "STALE"
- **Trade Deduplication**: Bots dzielą storage → duplikaty filtrowane `timestamp+symbol+side` (PATCH #140)
- **Latency**: ~1.5-2.5s total delay (WS + aggregation + cache) — OK dla swing tradingu (nie dla scalping)

---

## 7. PER-PAIR VS PORTFOLIO COORDINATION

### 7.1 Izolacja botów

```
PM2 Instance 0: turbo-bot      (BTCUSDT, $1,000)  ← own ML, own NeuralAI, own learning
PM2 Instance 1: turbo-bot-eth  (ETHUSDT, $1,200)  ← own ML, own NeuralAI, own learning
PM2 Instance 2: turbo-bot-sol  (SOLUSDT, $3,000)  ← own ML, own NeuralAI, own learning
PM2 Instance 3: turbo-bot-bnb  (BNBUSDT, $3,800)  ← own ML, own NeuralAI, own learning
PM2 Instance 4: turbo-bot-xrp  (XRPUSDT, $1,000)  ← own ML, own NeuralAI, own learning
```

**Każdy bot**:
- ✅ Ma własny PortfolioManager, RiskManager, ML Agent
- ✅ Trenuje własny GRU, Thompson Sampling
- ❌ NIE dzieli learned weights z innymi botami
- ❌ NIE wie co robią inne boty (poza coordinator snapshot)

### 7.2 SharedPortfolioCoordinator

**Mechanizm**: Single JSON file + atomic rename

```
/root/turbo-bot/data/portfolio_coordinator.json
├── Bot A reads (T=0)
├── Bot B reads (T=0, stale)
├── Bot A writes new state (T=50ms)
├── Bot B still uses old data (T=50ms)
├── Bot B writes its state (T=100ms)
└── Next cycle: both have fresh data (T=5s)
```

**Limity enforcement** (przy WEJŚCIU w trade):

| Limit | Wartość | Zastosowanie |
|-------|---------|--------------|
| Max Gross Exposure | 80% ($8,000) | Suma wszystkich notional |
| Max Net Exposure | 55% ($5,500) | Skew LONG vs SHORT |
| Max Cluster | 45% ($4,500) | Correlated pairs (BTC-ETH r=0.82) |
| Risk Budget | 18% ($1,800) | exposure × SL distance |
| Stale TTL | 3 min | Bot nie updateował → pruned |

### 7.3 Race Condition (REAL ale BOUNDED)

**Scenariusz**:
1. BTC bot czyta gross=40% → akceptuje 20% entry → pisze gross=60%
2. ETH bot czyta gross=40% (stale!) → akceptuje 20% → pisze gross=80%
3. **Chwilowy gross = 80%** zanim następny cykl wyłapie

**Ryzyko**: Bounded do ~5-100ms window. Następny cykl (5s) koryguje. Max over-exposure = ~5-10% portfolio above limit.

### 7.4 Cross-Bot Learning = ZERO

| Aspekt | Shared? |
|--------|---------|
| Thompson Sampling weights | ❌ Per-bot |
| GRU model weights | ❌ Per-bot |
| Trade history buffer | ❌ Per-bot |
| Regime detection | ❌ Per-bot |
| Defense mode trigger | ❌ Per-bot |
| Circuit breaker | ❌ Per-bot |
| Drawdown kill switch | ❌ Per-bot (nie portfolio-wide!) |

**Implikacja**: Jeśli BTC bot wykryje crash i wejdzie w defense mode, remaining 4 boty nadal handlują agresywnie. Brak portfolio-level circuit breaker.

---

## 8. TOP 10 BUGS (P0/P1/P2)

### P0 — KRYTYCZNE (Natychmiast naprawić)

#### BUG #1: Backtest ↔ Live Partial TP Mismatch
**Plik**: `ml-service/backtest_pipeline/config.py` vs `trading-bot/src/modules/execution-engine.js`
**Problem**: Backtest partial TP @1.25×, 2.25×, 3.75×ATR vs Live @2.5×, 4.0×ATR. Backtest jest 2× bliżej od live.
**Impact**: Wszystkie backtest PATCH reports (#58-72) oparę na złych parametrach — nie prognozują live results.
**Fix**: Wyrównaj backtest config do live: `PARTIAL_ATR_L1_MULT=2.5, PARTIAL_ATR_L2_MULT=4.0`

#### BUG #2: Backtest Chandelier Width ≠ Live
**Plik**: `ml-service/backtest_pipeline/config.py` (PHASE_5_CHANDELIER: highest − 1.0×ATR) vs `execution-engine.js` (highest − 2.0×ATR)
**Problem**: Backtest trailing 2× ciaśniejszy niż live. Live zostawia 2× więcej zysku na stole.
**Impact**: Backtest nadmiernie optymistycznie raportuje trailing stop performance.
**Fix**: Ujednolić na jedną wartość (rekomendacja: 1.5×ATR jako kompromis)

#### BUG #3: NeuronAI Learning Facade
**Plik**: `trading-bot/src/core/ai/neuron_ai_manager.js` L806+
**Problem**: `learnFromTrade()` to hardcoded +0.08/-0.04 bumps. Nazwa sugeruje ML learning — to fake.
**Impact**: System myśli, że się uczy, ale nie optymalizuje decyzji. Developers mogą liczyć na "adaptation" które nie istnieje.
**Fix**: Albo zaimplementuj prawdziwy learning (actor-critic update na decision features) albo rename na `adjustRiskAfterTrade()`.

### P1 — WYSOKIE (Naprawić w następnym PATCH)

#### BUG #4: `_lastCloseTime` Lost on Restart
**Plik**: `trading-bot/src/modules/execution-engine.js` L50
**Problem**: `this._lastCloseTime = 0` → after PM2 restart, min-hold 15min cooldown resets. Bot może natychmiast re-enter.
**Impact**: Po crash/restart = rapid re-entry spam (fees eating capital).
**Fix**: Persist `_lastCloseTime` to bot_state JSON, restore on startup.

#### BUG #5: Portfolio Coordinator Race Condition
**Plik**: `trading-bot/src/modules/shared-portfolio-coordinator.js`
**Problem**: File-based JSON polling → 5-100ms window gdzie 2 boty mogą przekroczyć gross exposure.
**Impact**: Chwilowe over-exposure o 5-10% portfolio. Auto-koryguje na następnym cyklu.
**Fix**: Atomic file locking (flock) lub Redis-based coordination.

#### BUG #6: No Portfolio-Level Circuit Breaker
**Problem**: Drawdown kill switch jest PER-BOT. Jeśli BTC DD=14% (aktywny) ale ETH+SOL+BNB+XRP razem DD=20% portfolio → żaden bot nie stoi.
**Impact**: Total portfolio może przekroczyć max DD nawet gdy individual bots are within limits.
**Fix**: SharedPortfolioCoordinator dodaj `totalPortfolioDrawdown` check. Jeśli aggregate DD > 12% → impose sizing reduction all bots.

#### BUG #7: RANGING Sizing Mismatch (Backtest vs Live)
**Plik**: `config.py` (×0.70) vs `risk-manager.js` (×0.30)
**Problem**: Backtest handluje 2.3× większymi pozycjami w RANGING niż live.
**Impact**: Backtest zarabia w RANGING, live nie — bo live pozycje za małe na fees.
**Fix**: Ujednolić: `0.50` jako kompromis (obie strony).

### P2 — MEDIUM (Zaplanować na Q2)

#### BUG #8: ML CV Accuracy Below Gate (51.9% < 55%)
**Plik**: `ml-service/ml_service.py` — trained model
**Problem**: Aktualny model CV=51.9%. Gate 55% = hard veto wyłączony. ML działa w trybie advisory-only.
**Impact**: System traci 58-feature ensemble intelligence bo model "nie zasłużył" na hard veto authority.
**Fix**: Retrain na większym dataset (>1000 candles). Albo obniż gate do 0.52 jeśli backtest potwierdzi profitability.

#### BUG #9: QPM ↔ Chandelier Conflict
**Plik**: `bot.js` (monitorPositions)
**Problem**: Quantum Position Manager AND Chandelier trailing mogą jednocześnie modyfikować SL/TP tej samej pozycji.
**Impact**: SL/TP oscyluje między quantum i chandelier values. Pozycja może zamknąć się na złym SL.
**Fix**: Exclusive ownership: jeśli QPM zarządza pozycją (`_qpmManaged=true`), Chandelier nie rusza.

#### BUG #10: Fee Gate Ignores Signal Quality
**Plik**: `execution-engine.js` (fee gate)
**Problem**: Fee gate używa tylko ATR: `expectedProfit = 1.5 × ATR × qty`. Ignoruje confidence, regime edge, ML direction.
**Impact**: Może akceptować słabe trade z wysokim ATR, odrzucać dobre z niskim ATR.
**Fix**: `expectedProfit = ATR × qty × confidence × regimeMultiplier`. Confidence 0.30 → profit reduced 70%.

---

## 9. REAL PROFIT-ENHANCING CHANGES

### Zmiana #1: PARYTET SL/TP (Expected: +15-25% backtest accuracy)

**Problem**: Backtest i live mają różne SL/TP/partial parametry = results nie korelują.

**Patch**: `ml-service/backtest_pipeline/config.py`
```python
# Align to live execution values:
SL_ATR_MULT = 1.5          # was 1.75
TP_ATR_MULT = 4.0          # was 2.5
PARTIAL_ATR_L1_MULT = 2.5  # was 1.25
PARTIAL_ATR_L2_MULT = 4.0  # was 2.25
PARTIAL_ATR_L3_MULT = None # disable (live has no L3)
PARTIAL_ATR_L1_PCT = 0.25
PARTIAL_ATR_L2_PCT = 0.25
# Chandelier:
PHASE_5_CHANDELIER_WIDTH = 2.0  # was 1.0 — match live
# Sizing:
RANGING_SIZING_MULT = 0.30  # was 0.70 — match live
```

**Impact**: Po wyrównaniu, backtests WRESZCIE odzwierciedlą live behavior. Nowe PATCH reports będą reliable.

### Zmiana #2: PORTFOLIO-LEVEL CIRCUIT BREAKER (Expected: -30% max DD)

**Patch**: `trading-bot/src/modules/shared-portfolio-coordinator.js`
- Dodaj `getPortfolioDrawdown()` → suma PnL all bots / total capital
- Jeśli portfolio DD > 12% → scale all bots to 40% sizing
- Jeśli portfolio DD > 15% → HALT ALL (global kill switch)

**Impact**: Zapobiega sytuacji gdzie 3+ boty tracą jednocześnie i łączny DD przekracza 15%.

### Zmiana #3: LEARNING CURVE TRACKING (Expected: validate AI value)

**Patch**: `trading-bot/src/core/ai/adaptive_neural_engine.js`
- Po każdym GRU retrain: log `{ epoch, train_accuracy, holdout_accuracy, timestamp }`
- Holdout: reserve last 20% candles as unseen test set
- Thompson Sampling: track cumulative regret per strategy

**Impact**: Wreszcie dowiesz się CZY Skynet GRU faktycznie poprawia predictions czy to random noise.

### Zmiana #4: CROSS-BOT LEARNING POOL (Expected: +5-10% overall accuracy)

**Patch**: `trading-bot/src/modules/shared-learning-pool.js` (NEW)
- JSON file: `data/shared_learning_pool.json`
- Po każdym trade close: bot publikuje `{ symbol, regime, action, pnl, features }`
- Inne boty: czytają pool i updateują own Thompson Sampling

**Impact**: BTC bot nauczył się czegoś → ETH bot zyskuje tę wiedzę (cross-asset learning).

### Zmiana #5: CONFIDENCE CALIBRATION (Expected: +3-8% Sharpe improvement)

**Problem**: LLM confidence 0.80 nie oznacza 80% win rate. Brak calibration.

**Patch**: `trading-bot/src/core/ai/neuron_ai_manager.js`
- Track: per-confidence-bucket (0.3-0.4, 0.4-0.5, ..., 0.9-1.0) actual win rate
- Calibrate: `adjusted_conf = bucket_win_rate × llm_raw_conf`
- Jeśli bucket 0.7-0.8 ma 45% win rate → confidence 0.75 → adjusted 0.45×0.75 = 0.34

**Impact**: Position sizing oparty na REALNEJ accuracy zamiast na LLM self-reported confidence.

### Zmiana #6: SMART FEE GATE (Expected: +5% edge per trade)

**Patch**: `trading-bot/src/modules/execution-engine.js`
```javascript
// OLD: expectedProfit = 1.5 × ATR × qty
// NEW:
const confMultiplier = Math.max(0.3, confidence);
const regimeMult = regime === 'TRENDING' ? 1.2 : regime === 'RANGING' ? 0.5 : 1.0;
const expectedProfit = 1.5 * atr * qty * confMultiplier * regimeMult;
```

**Impact**: Odrzuca low-confidence/RANGING trades nawet z wysokim ATR. Przepuszcza high-confidence emerging trends.

---

## 10. PARALLEL BACKTEST PROPOSALS

### Propozycja #1: PARITY BACKTEST (NAJWYŻSZY PRIORYTET)

**Cel**: Zweryfikować live-aligned parametry na danych historycznych.
```
Backtest A (control): Current backtest params (SL 1.75, partial @1.25/2.25/3.75)
Backtest B (live-aligned): Live params (SL 1.5, partial @2.5/4.0, no L3)
Period: 90 days, all 5 pairs
Expected result: B ma niższy total P&L ale podobny live pattern
```

### Propozycja #2: RANGING SIZING SWEEP

**Cel**: Znaleźć optymalny RANGING sizing multiplier.
```
Backtest grid: RANGING_MULT = [0.00, 0.20, 0.30, 0.50, 0.70, 1.00]
Each run: 90 days, SOLUSDT (highest RANGING frequency)
Measure: Net P&L after fees, max DD, trade count per RANGING period
Expected: 0.30-0.50 is optimal (current live=0.30, backtest=0.70)
```

### Propozycja #3: ML HARD VETO THRESHOLD SWEEP

**Cel**: Czy 55% CV gate jest optymalny?
```
Backtest grid: CV_GATE = [0.50, 0.52, 0.53, 0.55, 0.57, 0.60]
Each run: 60 days, BTCUSDT+ETHUSDT
With ML confidence thresholds: [0.45, 0.50, 0.52, 0.55]
Measure: Win rate, Sharpe, max DD
Expected: 0.52-0.53 gate allows more vetoes while maintaining quality
```

### Propozycja #4: CHANDELIER TRAILING WIDTH OPTIMIZATION

**Cel**: Optymalne Phase 5 Chandelier width.
```
Backtest grid: WIDTH = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5]×ATR
Each run: 90 days, BTCUSDT (trend-following asset)
Measure: Average winning trade size, trailing stop hit rate, runners caught
Expected: 1.25-1.5×ATR optimal (current backtest=1.0, live=2.0)
```

### Propozycja #5: PARTIAL TP LEVEL OPTIMIZATION

**Cel**: Najlepsze partial take-profit distances.
```
Backtest matrix:
  L1: [1.0, 1.5, 2.0, 2.5, 3.0]×ATR, PCT: [0.20, 0.25, 0.33]
  L2: [2.0, 3.0, 4.0, 5.0]×ATR, PCT: [0.20, 0.25, 0.33]
Each run: 60 days, all 5 pairs
Measure: Win rate, avg win size, max DD, Sharpe
Expected: L1@2.0×/25% + L2@3.5×/25% as sweet spot
```

### Propozycja #6: FUNDING RATE FEATURE VALIDATION

**Cel**: Czy feature #11 (funding_rate_signal) ma predictive value?
```
Backtest A: All 25 features (current)
Backtest B: Only features 1-10, 12-25 (remove funding rate)
Backtest C: Funding rate only (single-feature test)
Period: 90 days, BTC + ETH + XRP (pairs with Kraken funding data)
Measure: Feature importance rank, accuracy delta, P&L impact
Expected: Small but positive contribution (2-5% accuracy lift for shorts)
```

---

## NASTĘPNE KROKI (PRIORYTETOWO)

1. **P#153: BACKTEST PARITY FIX** — Wyrównaj 10 parametrów backtest→live. Uruchom Parity Backtest (Propozycja #1). To invaliduje lub potwierdza wszystkie poprzednie raporty.

2. **P#154: PORTFOLIO-LEVEL CIRCUIT BREAKER** — Dodaj aggregate DD check w SharedPortfolioCoordinator. Threshold: 12% scale-down, 15% global halt.

3. **P#155: PERSIST `_lastCloseTime`** — 10-minutowy fix: save/restore z bot_state JSON. Eliminuje post-restart entry spam.

4. **P#156: LEARNING CURVE TRACKING** — Dodaj accuracy logging do Skynet GRU. Po 2 tygodniach zmierz: czy retraining poprawia predictions?

5. **P#157: CONFIDENCE CALIBRATION** — Track actual win rate per confidence bucket. Calibrate LLM confidence → real edge.

6. **RETRAIN ML MODEL** — Aktualna CV=51.9%. Cel: ≥55% aby odblokować hard veto authority. Potrzeba: więcej historycznych danych (>1000 candles per pair).

7. **RANGING SIZING BACKTEST** — Uruchom sweep ×0.00-1.00 na SOLUSDT. Zwaliduj czy current ×0.30 jest optimal.

8. **QPM vs CHANDELIER EXCLUSIVE OWNERSHIP** — Zdefiniuj: jeśli QPM zarządza → Chandelier nie rusza SL/TP.

9. **CROSS-BOT LEARNING POOL** — Shared JSON tradeów → Thompson cross-pair updates. Wymaga desing doc + backtest validation.

10. **HONEST NAMING** — Rename `learnFromTrade` → `adjustRiskAfterTrade`. Rename "Quantum" → "GPU-Accelerated". Transparency builds trust.

---

```
CLAUDE-SKYNET v1.0 — AUDIT COMPLETE
232/232 tests passing | 10 bugs classified | 6 profit changes proposed | 6 backtests designed
Bezlitosna prawda: System ma solidną architekturę, ale ZERO parytet backtest↔live
i iluzoryczny NeuronAI learning. Napraw parytet ZANIM zaufasz jakiemukolwiek backtest raportowi.
```

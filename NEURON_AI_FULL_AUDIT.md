# 🧠 NEURON AI — PEŁNY AUDYT KRYTYCZNY

**Data:** 2026-02-22
**Audytor:** Skynet Architect / Copilot Agent
**Zakres:** AdaptiveNeuralEngine (NeuralAI), ML System (EnterpriseML), Ensemble Voting, Dashboard Activity/Trade Attribution
**Pliki audytowane:** 7 kluczowych modułów + dashboard

---

## 📋 PODSUMOWANIE WYKONAWCZE

### NeuralAI jako "Mózg Systemu" — OCENA: 🟡 CZĘŚCIOWO FUNKCJONALNY

NeuralAI (AdaptiveNeuralEngine) jest **najważniejszym komponentem systemu** z rozbudowaną architekturą (1805 LOC, 7 sub-komponentów), ale ma **poważne problemy** uniemożliwiające mu pełne działanie jako autonomiczny mózg Skynet:

| Aspekt | Ocena | Problem |
|--------|-------|---------|
| Architektura | ✅ Dobra | 7 komponentów, 3-fazowy system, Thompson Sampling |
| GRU Predictor | 🟡 Działa ale... | MACD Histogram jest FAŁSZYWY (×0.2 zamiast signal line) |
| Regime Detector | 🟡 Trend | Trenuje na HEURYSTYCZNYCH labelach — nigdy nie nauczy się nic ponad heurystykę |
| Thompson Sampling | ✅ Prawidłowy | Poprawna Beta distribution z Marsaglia/Tsang sampler |
| Neural Risk | 🔴 Krytyczny | Target risk = `currentRisk × 1.1/0.7` — self-referential, nie uczy się optymalnego ryzyka |
| Defense Mode | ✅ Działa | Blokuje BUY po 3 stratach, auto-exit po 2 wygranych |
| Config Evolution | 🟡 Limitowana | Evolves ale wpływ aggression/risk ZBYT MAŁY (±5-10%) |
| Override API | 🟡 Niespójny | `executeOverride()` nigdy NIE jest wywoływany z bot.js — dead code? |
| Starvation Override | ✅ Działa | 200 cykli → boostuje sygnały ×1.15, re-vote |
| ML Integration | 🔴 Krytyczny | ML NIE UCZY SIĘ z głównych trade'ów (tylko QPM closes) |
| Trade Attribution | 🔴 Dashboard bug | Trades zawsze `strategy: 'EnsembleVoting'` zamiast prawdziwej strategii |
| Activity Feed | 🟡 Niekompletny | Pokazuje `NeuralAI` w aktywnościach, ale trade history nie ma strategii |

---

## 🔴 KRYTYCZNE PROBLEMY (P0)

### P0-1: ML System NIE UCZY SIĘ z głównych zamknięć pozycji

**Lokalizacja:** `bot.js` → `_detectAndLearnFromCloses()`

**Problem:** Gdy pozycja jest zamykana przez SL/TP/TIME_EXIT/SELL, `_detectAndLearnFromCloses()` wywołuje `neuralAI.learnFromTrade()` (Thompson Sampling, defense mode, config evolution) — ale **NIE wywołuje `this.ml.learnFromTrade()`**.

ML uczy się TYLKO z:
- Partial TP L1/L2 w ExecutionEngine (linie ~145, ~160)
- QPM quantum partial closes (linia ~1161 bot.js)
- QPM consolidation closes (linia ~1322 bot.js)

**NIGDY** z:
- ❌ SL hits (główne straty!)
- ❌ TP hits (główne zyski!)
- ❌ TIME_EXIT
- ❌ Ensemble SELL consensus

**Impact:** EnterpriseML nie uczy się z ~80% zamknięć pozycji. Jego Sharpe Ratio, win rate, i decision history NIE odzwierciedlają rzeczywistości. Model nie poprawia się.

**Fix:** Dodać `this.ml.learnFromTrade()` w `_detectAndLearnFromCloses()`.

---

### P0-2: Neural Risk Predictor — Self-Referential Training Target

**Lokalizacja:** `adaptive_neural_engine.js` → `learnFromTrade()` (linie ~1669-1679)

```javascript
const currentRisk = this.lastRiskResult ? this.lastRiskResult.riskPercent : 0.015;
let targetRisk;
if (pnl > 0) {
    targetRisk = Math.min(0.03, currentRisk * 1.1);  // WIN → +10%
} else {
    targetRisk = Math.max(0.005, currentRisk * 0.7);  // LOSS → -30%
}
```

**Problem:** Target risk jest wyliczany jako `currentRisk × multiplier` — to znaczy, że model trenuje się na swoim WŁASNYM output'cie! To jest dokładnie ten sam problem co VQC w PATCH #35. Model NIGDY nie nauczy się optymalnego ryzyka — będzie się zbiegał do 0.5% (minRisk) jeśli zdarzy się kilka strat z rzędu, albo do 3% (maxRisk) przy passie wygranych.

**Impact:** Neural Risk Manager produkuje pseudo-losowe wartości ryzyka, nie ma zdolności do generalizacji. Domyślne `0.015` (1.5%) jest zawsze lepsze niż ten "wytrenowany" model.

**Fix:** Potrzebny optymalny target risk obliczony np. z Kelly Criterion lub risk-parity.

---

### P0-3: Trade History — Brak atrybutacji strategii

**Lokalizacja:** `execution-engine.js` → `executeTradeSignal()` (linia ~280)

```javascript
const trade = {
    // ...
    strategy: signal.strategy,  // signal.strategy === 'EnsembleVoting' ZAWSZE
    // ...
};
```

**Problem:** Obiekt `consensus` z ensemble-voting.js ZAWSZE ma `strategy: 'EnsembleVoting'`. Ten string trafia do:
1. Trade record w portfolio-manager (via `pm.trades.push(trade)`)
2. `/api/trades` endpoint
3. Dashboard Trade History table

W efekcie w dashboardzie kolumna "Strategy" ZAWSZE pokazuje "EnsembleVoting" (lub "SkynetOverride" w rzadkich przypadkach), a NIE pokazuje które strategie faktycznie zagłosowały za trade'em.

**Impact:** Użytkownik nie widzi która strategia była odpowiedzialna za każdy trade. Nie może ocenić skuteczności poszczególnych strategii.

**Fix:** Dodać `contributingStrategies` do consensus i trade record. Wyświetlać w dashboard.

---

## 🟠 WYSOKIE PROBLEMY (P1)

### P1-1: MACD Histogram w Feature Pipeline jest FAŁSZYWY

**Lokalizacja:** `adaptive_neural_engine.js` → `FeaturePipeline._calcIndicatorsAt()` (linia ~137)

```javascript
if (sliceP.length >= 26) {
    const ema12 = this._ema(sliceP, 12);
    const ema26 = this._ema(sliceP, 26);
    const macdLine = ema12 - ema26;
    macdHist = macdLine * 0.2; // Simplified: use fraction of MACD line
}
```

**Problem:** MACD Histogram = MACD Line − Signal Line (EMA9 of MACD Line). Tu jest `macdLine * 0.2` — to NIE jest MACD histogram, to jest 20% MACD line! To jest zupełnie inny wskaźnik. GRU i ML features dostają BŁĘDNE dane.

**Impact:** Feature #3 (macdHist) jest bezużyteczny — koreluje z MACD line linearly zamiast pokazywać momentum change. GRU nie widzi właściwych divergencji MACD/Signal.

**Fix:** Obliczyć proper Signal Line (EMA9 of MACD values) i histogram = MACD - Signal.

---

### P1-2: Regime Detector trenuje na HEURYSTYCZNYCH labelach

**Lokalizacja:** `adaptive_neural_engine.js` → `MarketRegimeDetector.generateLabel()` (linia ~590)

```javascript
generateLabel(regimeFeatures) {
    const h = this.detectHeuristic(regimeFeatures);  // ← Heurystyka
    const label = [0, 0, 0, 0];
    label[h.index] = 0.8;
    for (let i = 0; i < 4; i++) if (i !== h.index) label[i] = 0.2 / 3;
    return label;
}
```

**Problem:** Neural regime detector trenuje się na labelach generowanych przez `detectHeuristic()`. To znaczy, że NAJLEPIEJ co może osiągnąć to reprodukcja heurystyki — NIGDY nie odkryje reżimów, których heurystyka nie widzi.

**Czy to naprawdę problem?** Tak i nie. Z jednej strony, soft labels (80/20) pozwalają na pewną generalizację. Z drugiej — teacher (heurystyka) jest ceiling dla student (neural net). Ale w trading to jest akceptowalne jeśli heurystyka jest rozsądna.

**Impact:** Średni. Model zbiegnie do heurystyki, ale z smoother transitions i mniejszym noise.

**Rekomendacja:** Akceptowalny kompromis na CPU VPS. Prawdziwe labele wymagałyby backtesting framework.

---

### P1-3: `executeOverride()` nigdy nie wywoływany z bot.js

**Lokalizacja:** `adaptive_neural_engine.js` → `executeOverride()` (linia ~1322)

**Problem:** Metoda istnieje i jest w pełni zaimplementowana, ale NIKT jej nie wywołuje:
- `bot.js` — CZYTA `neuralAI._activeOverride` ale nigdy nie ustawia go przez API
- `megatron_system.js` — nie ma komendy do override
- Skynet sam nie wywołuje `executeOverride()` na sobie

**Impact:** Override API jest dead code. Skynet NIE MOŻE autonomicznie vetować ani wymuszać transakcji poza defense mode (który tylko blokuje BUY). Nie realizuje obiecanej "humanoidalnej wersji Skynet" — jest pasywny.

**Fix:** Dodać autonomiczny system decyzyjny w `generateAISignal()` lub `processMarketUpdate()`, który sam wywoła `executeOverride()` gdy GRU prediction jest z wysoką pewnością sprzeczny z ensemble.

---

### P1-4: EnterpriseML `generateAction()` — Hard-coded Rule-Based System, NIE ML

**Lokalizacja:** `enterprise_ml_system.js` → `generateAction()` (linie ~418-520)

**Problem:** Pomimo nazwy "Deep RL Agent", `generateAction()` jest **czysto rule-based**: sumuje wartości features z hard-coded wagami, dodaje L1/L2 penalty i porównuje z thresholdem. NIE ma:
- ❌ Neural network weights (brak tensors)
- ❌ Policy gradient
- ❌ Q-learning
- ❌ Backpropagation
- ❌ Replay buffer (ma, ale nie używa do gradient update)

```javascript
signal += features.rsi_signal * 0.3;
signal += features.price_momentum * 2;
signal += features.momentum_oscillator * 1.5;
signal += features.trend_strength * 2;
```

To jest WEIGHTED LINEAR COMBINATION z hand-tuned koeficjentami, nie machine learning.

**Impact:** `EnterpriseML` z wagą 20% w ensemble jest de facto 8-szą strategią rule-based, nie ML. `learningRate`, `earlyStoppingPatience`, `validationSplit` — te parametry NIE MAJĄ ŻADNEGO EFEKTU na decision making (nie ma gradient update). Jedyny "learning" to zmiana `buyThreshold` i `sellThreshold` z liczbą episodes.

**Rekomendacja:** Zmienić nazwę na `AdvancedRuleBasedStrategy` lub dodać prawdziwy NN (choćby 3-layer dense policy net z tf.js).

---

### P1-5: Activity Feed — Wszystko przypisywane do "NeuronAI"

**Lokalizacja:** `bot.js` linia ~919-921

**Problem:** Activity feed Megatron przy otwieraniu/zamykaniu pozycji pokazuje:
```
TRADE: BUY executed
Conf: 65.3% | Strategies: AdvancedAdaptive, NeuralAI, EnterpriseML
```

To jest POPRAWNE — zawiera listę strategii. ALE gdy pozycja jest zamykana przez SL/TP/TIME w `execution-engine.js`, nie ma żadnej aktywności logowanej do Megatron. Użytkownik widzi:
- "BUY executed" z listą strategii ✅
- (nic o zamknięciu SL/TP) ❌
- "Trade learned" w LEARNING z listą strategii ✅

**Impact:** Dashboard nie pokazuje SL/TP/TIME closów w activity feed. Wygląda jakby pozycje "znikały" bez informacji.

**Fix:** Dodać activity logging w execution-engine.js po SL/TP/TIME close.

---

## 🟡 ŚREDNIE PROBLEMY (P2)

### P2-1: GRU Training — brak checkpointu LSTM sequences

**Problem:** `ExperienceBuffer` NIE jest persystowany. `lstmSequences`, `regimeSamples`, `riskSamples` — wszystkie buforowane dane treningowe TRACĄ SIĘ po restarcie bota. Jedynie model weights (GRU, Regime, Risk) i meta state (Thompson Sampling) są zapisywane.

**Impact:** Po restarcie bot musi zebrać od nowa 200+ candles zanim pierwszy trening nastąpi.

### P2-2: EnterpriseML features 11-18 (external data) — ZAWSZE ZERO

**Problem:** Features 11-18 (funding_rate, news_sentiment, vix, on_chain_flow, dxy_correlation, gold_divergence, market_regime, cross_asset_momentum) to placeholders = 0.

**Impact:** 8 z 25 features to dead weight. Nie szkodzi (wagi pomnożone przez 0 = 0) ale misleading feature count.

### P2-3: GRU Accuracy Tracking — Off-by-One

**Problem:** W `processMarketUpdate()`, accuracy jest liczone przez porównanie `lastPrediction.direction` z actuals, ale `lastPrediction` jest ustawiane w `generateAISignal()` — który jest wywoływany PÓŹNIEJ. Więc accuracy porównuje prediction z candle N-2 z ceną candle N.

**Impact:** Niska — accuracy jest lekko przesunięta, ale trend jest prawidłowy.

### P2-4: Double Trade Recording w ExecutionEngine

**Problem:** Przy BUY, `executeTradeSignal()` tworzy `trade` object z `pnl: -fees` i robi `pm.trades.push(trade)`. Jednocześnie aktualizuje `pm.portfolio.totalTrades++`, `pm.portfolio.realizedPnL += trade.pnl` itp. RĘCZNIE. Ale `pm.closePosition()` RÓWNIEŻ aktualizuje te same pola (totalTrades, realizedPnL, winRate). Dla BUY to nie jest problem (bo `closePosition` jest wywoływany przy SELL) ale przy SELL w `executeTradeSignal`, jest:
1. `pm.closePosition()` → aktualizuje portfolio stats
2. `pm.trades.push(trade)` → ZNOWU dodaje trade
3. `pm.portfolio.totalTrades++` → ZNOWU inkrementuje

**Impact:** Po SELL przez consensus, trade jest PODWÓJNIE zapisywany w `pm.trades` (raz w closePosition, raz w executeTradeSignal) i totalTrades jest inkrementowany 2×.

### P2-5: Thompson Sampling nigdy nie dostaje PRAWDZIWEGO PnL strategii

**Problem:** W `_detectAndLearnFromCloses()`, cały PnL trade'u jest przypisywany do KAŻDEJ strategii która "głosowała za" consensus. Jeśli 3 strategie zagłosowały BUY i trade miał PnL = +$50, KAŻDA z 3 dostaje +$50 — a nie +$50/3.

**Impact:** Thompson Sampling jest zawyżone dla strategii działających w grupie. Ale efekt jest symetryczny (dotyczy win i loss), więc wpływ jest mniejszy niż się wydaje.

---

## 📊 MACIERZ RYZYKA

| ID | Priorytet | Problem | Impact | Fix Complexity |
|----|-----------|---------|--------|----------------|
| P0-1 | 🔴 CRITICAL | ML NIE uczy się z SL/TP/TIME closes | ML model nie poprawia się | ŁATWY |
| P0-2 | 🔴 CRITICAL | Neural Risk self-referential training | Risk model bezużyteczny | ŚREDNI |
| P0-3 | 🔴 CRITICAL | Trade attribution always 'EnsembleVoting' | Dashboard useless | ŚREDNI |
| P1-1 | 🟠 HIGH | MACD Histogram fałszywy | Feature #3 bezużyteczny | ŁATWY |
| P1-2 | 🟠 HIGH | Regime trains on heuristic labels | Ceiling = heurystyka | NISKI (akceptowalny) |
| P1-3 | 🟠 HIGH | executeOverride() dead code | Skynet nie autonomiczny | ŚREDNI |
| P1-4 | 🟠 HIGH | EnterpriseML = rule-based, nie ML | 20% ensemble = rules | TRUDNY |
| P1-5 | 🟠 HIGH | SL/TP closes brak activity log | Dashboard brakuje info | ŁATWY |
| P2-1 | 🟡 MED | Buffer nie persystowany | Retrain after restart | ŚREDNI |
| P2-2 | 🟡 MED | 8 external features = 0 | Dead weight | NISKI |
| P2-3 | 🟡 MED | GRU accuracy off-by-one | Stats lekko przesunięte | NISKI |
| P2-4 | 🟡 MED | Double trade recording (SELL) | Podwójne zapisy | ŚREDNI |
| P2-5 | 🟡 MED | Thompson Sampling — PnL per-strategy | Zawyżone scores | NISKI |

---

## ✅ CO DZIAŁA DOBRZE

1. **Thompson Sampling** — matematycznie poprawny: Beta distributions, Gamma sampler, decay, exploration floor
2. **Defense Mode** — elegancki: 3 losses → block BUY, auto-recovery na 2 wins lub timeout
3. **Config Evolution** — sensowne: risk/aggression/threshold ewoluują z performance
4. **GRU Architecture** — adekwatny: 2-layer GRU (24→12), softmax, ~2K params, fits na 1 CPU
5. **Feature Pipeline** — dobrze zaprojektowany: rolling z-score normalization, clipped to [-1,1]
6. **Regime Detection Heuristic** — rozsądna: ATR percentile, BB bandwidth, trend direction
7. **Ensemble Voting** — prawidłowy: ważone głosy, conflict detection, regime-adjusted thresholds
8. **Cross-system feedback** — Skynet karze strategie odrzucane przez QDV
9. **Position Commands** — API FORCE_EXIT, PARTIAL_CLOSE, FLIP, SCALE_IN prawidłowe
10. **Phase System** — bezpieczny: HEURISTIC→LEARNING→AI_ACTIVE z progressive AI trust

---

## 🔧 REKOMENDOWANE NAPRAWY (w kolejności)

### Natychmiastowe (PATCH #36):
1. **P0-1:** Dodać `ml.learnFromTrade()` w `_detectAndLearnFromCloses()`
2. **P0-2:** Zastąpić self-referential risk target Kelly Criterion
3. **P0-3:** Dodać `contributingStrategies` do trade record + dashboard
4. **P1-1:** Naprawić MACD Histogram (proper Signal Line)
5. **P1-5:** Dodać activity log dla SL/TP/TIME closes
6. **P2-4:** Naprawić double trade recording w executeTradeSignal SELL

### Następne (PATCH #37):
7. **P1-3:** Dodać autonomiczny override w Skynet (GRU prediction vs ensemble conflict)
8. **P2-5:** Dzielić PnL przez liczbę contributing strategies

### Długoterminowe:
9. **P1-4:** Zastąpić rule-based ML prawdziwym NN lub przyznać że to strategia
10. **P2-1:** Persystować ExperienceBuffer (lub przynajmniej last 500 sequences)

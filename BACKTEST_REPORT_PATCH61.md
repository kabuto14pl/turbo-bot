# BACKTEST REPORT — PATCH #61: Skynet Brain Iterative Learning Loop

**Data:** 2026-03-03  
**Pipeline:** `backtest_pipeline` v2.2.0 PATCH #61  
**Skille:** `#02-skynet-architect`, `#09-system-debugger`, `#11-backtest-validator`

---

## 1. DIAGNOZA WSTĘPNA

### 1.1 Quantum GPU w backtestach — FAKE
`quantum_sim.py` (287 linii) nie używa GPU/CUDA. Używa prostych `if/else` na RSI/MACD/returns:
```python
bullish_score += 2 if avg_return > 0.001  # to NIE jest Monte Carlo
```
Produkcyjny `gpu-quantum-service-v5.js` robi **5M ścieżek Monte Carlo** na RTX 5070 Ti.  
**Status:** Udokumentowane, wymaga CUDA runtime w dev containerze do naprawy.

### 1.2 Skynet/NeuronAI — BRAK uczenia między runami
`neuron_ai.py` (297 linii) — `learn_from_trade()` jedynie:
- Zlicza win/loss counts
- Defense mode po 9 stratach pod rząd
- Kelly-like risk_multiplier ±5% co 5 tradów
- **Wszystko resetuje się przy każdym nowym runie** (engine.py `_reset()`)

**Brak**: zapisu stanu, pamięci między sesjami, ewolucji parametrów.

### 1.3 Brak mechanizmu iteracyjnego
`runner.py` — jeden run, jeden wynik, koniec. Zero pętli, zero porównań.

---

## 2. ROZWIĄZANIE: `skynet_brain.py`

Nowy moduł **Skynet Brain** (~430 linii) — iteracyjny optymalizator backtestów:

### 2.1 Scoring Function (100-punktowa skala)
| Komponent | Waga | Logika |
|-----------|------|--------|
| Profit Factor | 30% | 0-30 pts, max at PF≥2.0 |
| Total Return | 25% | 0-25 pts, scaled by return% |
| Win/Loss Ratio | 15% | 0-15 pts, max at W/L≥1.5 |
| Max Drawdown | 15% | 0-15 pts, inverse (DD=0%=15pts) |
| Sharpe Ratio | 10% | 0-10 pts, max at Sharpe≥3.0 |
| Trade Count | 5% | 0-5 pts, penalty <20 or >200 |

### 2.2 Diagnostic Rules (12 reguł)
| # | Reguła | Wykryta sytuacja | Działanie |
|---|--------|------------------|-----------|
| 1 | TP_ZERO | 0% TP exitów | Obniż TP, re-enable partials |
| 1b | LOW_WL_PARTIALS | W/L<0.3 + partials działają | Przesuń L1 dalej, tighter SL |
| 2 | PHASE1_DOMINANT | >50% tradów umiera w Phase 1 | Obniż Phase 1 threshold |
| 3 | HIGH_FEES | fees >30% PnL | Podnieś fee gate |
| 4 | HIGH_DD | DD >10% | Zmniejsz risk per trade |
| 5 | LOW_WR | WR <50% | Podnieś confidence floor |
| 6 | LOW_WL | W/L <0.3 | Tighter trailing |
| 7 | LONG_CATASTROPHE | Long WR <40% | Podnieś ensemble threshold |
| 8 | TOO_FEW | <30 tradów | Obniż threshold |
| 9 | BE_DOMINANT | BE >40% exitów | Opóźnij breakeven |
| 10 | TINY_WINS | avg win < 0.3 × avg loss | Zmniejsz L1 PCT |
| 11 | NO_TP_STILL | TP=0 after partial fix | Obniż TP multiplier |
| 12 | L2_BOOST | L2 aktywny + low W/L | Zwiększ L2 PCT |

### 2.3 Memory System
- `tried_changes` set przechowuje `(param, direction)` par, które pogorszyły wynik
- `already_tried()` check zapobiega powtarzaniu nieudanych zmian
- Config snapshot/revert dla bezpiecznych eksperymentów

### 2.4 Speed Optimization
- XGBoost retrain interval: 200 → 1000 (podczas brain loop)
- `warnings.filterwarnings('ignore')` — eliminacja flood w logach
- ~80 sekund per iteracja (14,201 candles 15m)

---

## 3. WYNIKI SKYNET BRAIN

### 3.1 Run 1 (5 iteracji, przed fix convergence)
| Iter | Score | PF | WR | W/L | DD | Return |
|------|-------|-----|------|------|------|--------|
| 1 | 29.7 | 0.544 | 76.5% | 0.17 | 8.0% | -6.13% |
| 2 | 30.8 | 0.565 | 72.1% | 0.20 | 6.6% | -5.61% |
| 3-5 | 30.8 | — | — | — | — | STUCK |

**Problem:** Iterations 3-5 próbowały tych samych zmian → brak postępu.  
**Fix:** Dodano `tried_changes` memory + 4 nowe reguły (10-12).

### 3.2 Run 2 (6 iteracji, z memory system) ★ FINAL

| Iter | Score | PF | WR | W/L | DD | Return | TP | Status |
|------|-------|-----|------|------|------|--------|-----|--------|
| 1 | 29.7 | 0.544 | 76.5% | 0.17 | 8.0% | -6.13% | 0 | BASELINE |
| **2** | **36.4** | **0.655** | **71.9%** | **0.26** | **5.69%** | **-4.75%** | **0** | **★ BEST** |
| 3 | 24.8 | 0.474 | 51.2% | 0.45 | 7.8% | -7.10% | 0 | REVERTED |
| 4 | 36.4 | 0.655 | 71.9% | 0.26 | 5.7% | -4.75% | 0 | SAME |
| 5 | 24.8 | 0.474 | 51.2% | 0.45 | 7.8% | -7.10% | 0 | REVERTED |
| 6 | 36.4 | 0.655 | 71.9% | 0.26 | 5.7% | -4.75% | 0 | CONVERGED |

### 3.3 Brain's Config Changes (Iteration 2 — best)
| Parametr | Przed (P#60/61 baseline) | Brain Iter 2 | Efekt |
|----------|--------------------------|--------------|-------|
| SL_ATR_MULT | 2.0 | **1.75** | Mniejsze straty (-$76→$60) |
| TP_ATR_MULT | 3.0 | **2.5** | Bliżej TP (nadal 0% hits) |
| PARTIAL_ATR_L1_MULT | 1.0 | **1.5** | Więcej zysku pre-partial |

### 3.4 Failed Experiment (Iteration 3 — reverted)
| Parametr | Brain Iter 3 | Wynik |
|----------|-------------|-------|
| SL_ATR_MULT | 1.5 | WR spadło 71.9→51.2% |
| TP_ATR_MULT | 2.0 | W/L wzrosło (0.26→0.45) ale PF spadł drastycznie |
| PARTIAL_ATR_L1_MULT | 2.0 | Mniej partials triggered |

**Lekcja:** SL=1.5 ATR jest zbyt ciasny — za dużo SL hits zanim trade się rozwinie.

---

## 4. PORÓWNANIE PATCHÓW

### 4.1 Ewolucja (15m timeframe)

| Metryka | P#56 V2 | P#59 | P#60 | **P#61 Brain** |
|---------|---------|------|------|----------------|
| Trades | 299 | 31 | 52 | **64** |
| PF | 0.75 | 0.665 | 0.714 | **0.655** |
| WR | ~45% | 67.7% | 51.9% | **71.9%** |
| W/L | ~0.40 | 0.32 | 0.66 | **0.26** |
| MaxDD | ~8% | 1.58% | 9.17% | **5.69%** |
| Return | -7.6% | -0.71% | -5.86% | **-4.75%** |
| Sharpe | — | 1.621 | -1.301 | **2.627** |
| Partials | 0 | 0 | 0 | **28** |
| TP Exits | 0 | 0 | 0 | **0** |

### 4.2 Key Improvements vs P#60
- ✅ **WR**: 51.9% → 71.9% (+20pp) — tighter SL kills bad trades faster
- ✅ **MaxDD**: 9.17% → 5.69% (-38%) — risk containment improved
- ✅ **Return**: -5.86% → -4.75% (+19%) — less negative
- ✅ **Sharpe**: -1.301 → 2.627 (massive recovery)
- ✅ **Partials**: 0 → 28 executed (profit capture restored!)
- ⚠️ **W/L**: 0.66 → 0.26 (partial captures small wins, SL takes full hits)
- ⚠️ **PF**: 0.714 → 0.655 (still below 1.0)
- ❌ **TP exits**: still 0%

### 4.3 Best Iteration Detail
```
64 trades | PF 0.655 | WR 71.9% | W/L 0.26 | MaxDD 5.69% | Return -4.75%

Exit reasons:
  BE:   18 (28.1%)
  SL:   18 (28.1%)
  L1:   15 (23.4%)
  L2:   13 (20.3%)

avg win:  $19.61
avg loss: $76.53 (3.9× bigger than wins!)

Long:  24 trades | WR 62.5% | PnL -$312.30
Short: 40 trades | WR 77.5% | PnL -$163.11

Fees: $140.60 (29.6% of PnL)
```

---

## 5. FUNDAMENTALNY PROBLEM

### 5.1 W/L = 0.26 — avg win jest 3.9× mniejszy od avg loss

**Dlaczego:**
1. Partials (L1 at 1.5 ATR, L2 at 1.5 ATR) wycinają 70% pozycji ZANIM osiągnie TP
2. SL = 1.75 ATR bierze PEŁNY hit (no partial on losers)
3. Asymetria: winners oddają zysk w partiach, losers tracą w całości

### 5.2 0% TP exits — TP nadal nieosiągalny
Nawet przy TP=2.5 ATR, żaden trade nie trzyma się wystarczająco długo.  
Partials + trailing + BE wycinają pozycje wcześniej.

### 5.3 Long-side weakness
- Long WR: 62.5% (vs Short 77.5%)
- Long PnL: -$312.30 (65.7% strat z 37.5% tradów)
- Short jest 2× lepszy na każdej metryce

---

## 6. PATCH #61 — PODSUMOWANIE ZMIAN

### Nowe pliki:
- `backtest_pipeline/skynet_brain.py` — Iteracyjny optymalizator backtestów

### Zmodyfikowane pliki:
- `config.py` — Partials re-enabled + Brain optimal config (SL=1.75, TP=2.5, L1=1.5 ATR)
- `__init__.py` — `__patch__ = 61`
- `runner.py` — Banner "PATCH #61 — Skynet Brain"

### Config changes (P#60 → P#61):
| Param | P#60 | P#61 |
|-------|------|------|
| SL_ATR_MULT | 2.0 | **1.75** |
| TP_ATR_MULT | 3.0 | **2.5** |
| PARTIAL_ATR_L1_PCT | 0.0 | **0.40** |
| PARTIAL_ATR_L1_MULT | 2.5 | **1.5** |
| PARTIAL_ATR_L2_PCT | 0.0 | **0.30** |
| PARTIAL_ATR_L2_MULT | 4.0 | **1.5** |

---

## 7. NASTĘPNE KROKI (PRIORYTETOWO)

1. **Long-side filter** — wyłącz long w trendzie spadkowym (EMA200/ADX filter) → poprawi WR i PnL
2. **Asymmetric exits** — mniejszy SL dla long (1.5 ATR) vs short (1.75 ATR)
3. **Adaptive partials** — L1 PCT zależy od volatility (mniej przy low vol)
4. **TP rework** — zamiast fixed TP, użyj next resistance/support z orderbook
5. **Quantum GPU integration** — real Monte Carlo paths w backtestach (wymaga CUDA)
6. **Multi-timeframe confirmation** — 1h trend filter na 15m entries
7. **Skynet Brain v2** — dodaj genetic algorithm / simulated annealing zamiast rule-based
8. **Walk-forward validation** — split data 70/30, optimize on 70%, validate on 30%

### Grade: C+
**Poprawa vs P#60** (WR +20pp, DD -38%, Sharpe 2.6), ale W/L=0.26 i 0% TP nadal fundamentalnie blokują profitability.

---

*Raport wygenerowany przez Skynet Brain v1.0 — PATCH #61*

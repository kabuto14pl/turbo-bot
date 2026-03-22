# BACKTEST REPORT — PATCH #62: Price Action Engine + S/R Activation

**Data:** 2026-03-03  
**Pipeline:** v2.3.0 | Phase 18 (Price Action Gate) added  
**Dane:** btcusdt_15m.csv — 14,201 candles, 147.9 dni  
**Skynet Brain:** Learning bug fix applied, 4 iterations to convergence  

---

## 1. Zmiany w P#62

### Nowy moduł: `price_action.py` (~450 linii)
- **Swing Detection** — zigzag: lookback=3, min_swing_atr=0.15
- **Market Structure** — HH/HL (BULLISH), LH/LL (BEARISH) z 4 ostatnich swing points
- **S/R Zones** — z swing highs/lows, strength = tests×0.40 + recency×0.35 + volume×0.25
- **Entry Timing** — pullback (23.6-78.6% retrace), rejection wick (>45%), breakout (>1.2× volume)
- **PA Score** = struct (0.35) + S/R proximity (0.35) + timing (0.30) → 0.0-1.0

### Aktywacja S/R filter (wyłączony od P#59!)
- `sr_filter.py` — `confidence_adj = 1.0` ⟶ scoring-based gating
- Block: composite < 0.25 | Penalty: 0.25-0.40 | Neutral: 0.40-0.65 | Boost: > 0.65

### Fix krytyczny: Skynet Brain learning
- `tried_changes` czytało `entry['changes']` (bieżące, puste) zamiast `self.history[-1]['changes']` (poprzednie, z faktycznymi zmianami)
- Po naprawce brain poprawnie zapamiętuje faile i ich nie powtarza

---

## 2. Wyniki: Porównanie P#59 → P#62

| Metryka | P#59 | P#60 | P#61 | **P#62** | Cel |
|---------|------|------|------|----------|-----|
| Trades | 31 | 52 | 64 | **58** | 12-18/d |
| PF | 0.665 | 0.714 | 0.655 | **0.617** | >1.3 |
| WR | 67.7% | 51.9% | 71.9% | **69.0%** | >55% |
| W/L | 0.32 | 0.66 | 0.26 | **0.28** | >1.5 |
| MaxDD | 1.58% | 9.17% | 5.69% | **6.07%** | <15% |
| Return | -0.71% | -5.86% | -4.75% | **-5.26%** | >0% |
| Sharpe | 1.621 | -1.301 | 2.627 | **2.294** | >1.2 |
| Score | 31.3 | 24.2 | 36.4 | **35.3** | >60 |
| PA rate | — | — | — | **14.7%** | >30% |

---

## 3. PA Engine Statistics (Best Iteration)

| Metryka | Wartość |
|---------|---------|
| Entries analyzed | 34 |
| Pullback entries | 2 (5.9%) |
| Rejection wick entries | 3 (8.8%) |
| Breakout entries | 1 (2.9%) |
| No-pattern entries | 28 (82.4%) |
| **PA-pattern rate** | **14.7%** |
| S/R boosts | 0 |
| S/R rejections | 0 |
| Structure: BULLISH | 8 |
| Structure: BEARISH | 10 |
| Structure: NEUTRAL | 16 |

---

## 4. Exit Distribution

| Exit Type | Count | % | PnL Impact |
|-----------|-------|---|------------|
| SL (Stop Loss) | 18 | 31.0% | Biggest losers |
| BE (Break Even) | 16 | 27.6% | Near-zero |
| L1 (Partial 1) | 13 | 22.4% | Small wins |
| L2 (Partial 2) | 11 | 19.0% | Medium wins |
| TP (Take Profit) | 0 | 0.0% | — |

**Phase exits:** Phase1=27 (46.6%), Phase2=14 (24.1%), Phase3=17 (29.3%)

---

## 5. Long vs Short

| Side | Trades | WR | PnL |
|------|--------|------|------|
| Long | 21 | 57.1% | -$353.94 |
| Short | 37 | 75.7% | -$171.58 |

**Long side to problem:** WR 57.1% z -$354 PnL. Short 75.7% i -$172.

---

## 6. Skynet Brain Learning Verification ✅

### Iteration Flow:
```
Iter 1: Score 35.3 — baseline (★ BEST)
Iter 2: SL 1.75→1.5, TP 2.5→2.0, L1_MULT 1.5→2.0 → Score 23.1 → FAILED (🚫×3)
Iter 3: Phase1 1.0→0.7 → Score 35.3 → NO_IMPROVEMENT (🚫×1)
Iter 4: Trail 1.5→1.25, L1_PCT 0.4→0.3, L2_PCT 0.3→0.4 → Score 35.1 → CONVERGED
```

### Brain prawidłowo:
- ✅ Oznacza wszystkie failed changes z 🚫
- ✅ Revertuje do best config po pogorszeniu
- ✅ Nie powtarza failed changes
- ✅ Konwerguje po 3 iteracjach bez poprawy

---

## 7. Diagnosis: Dlaczego PF < 1.0?

### GŁÓWNA PRZYCZYNA: EXIT MANAGEMENT
```
avg_win  = $21.19
avg_loss = $76.27
W/L ratio = 0.28 (potrzebne: >1.5)
```

**Problem nie jest w WEJŚCIACH.** PA engine poprawnie identyfikuje wzorce:
- Pullback: 2 entries (5.9%)
- Rejection wick: 3 entries (8.8%)
- Breakout: 1 entry (2.9%)

**Problem jest w WYJŚCIACH:**
1. **TP = 0 exits** — żaden trade nie dociera do Take Profit
2. **SL = 31%** — co 3. trade bierze pełny stop loss
3. **Phase 1 kills 47%** — trailing za agresywny w fazie 1
4. **L1 @ 1.5 ATR** — za blisko, obcina potencjał zysku

### Potencjalne rozwiązania (P#63+):
1. **L1_MULT: 1.5 → 2.0-2.5 ATR** — pozwolić winnerom rosnąć
2. **Phase 1 trailing: 1.0 ATR → 1.5 ATR** — dać oddychać
3. **Long-side gate** — filtrować longi z EMA200 + regime
4. **Asymmetric exits** — TP w trendzie, szybki exit w ranging
5. **Dynamic SL** — ciasny w ranging (1.25×), luźny w trending (2.0×)

---

## 8. Best Config (P#62 — bez zmian od P#61)

```python
SL_ATR_MULT = 1.75
TP_ATR_MULT = 2.5
PARTIAL_ATR_L1_MULT = 1.5
PARTIAL_L1_PCT = 0.4
PARTIAL_L2_PCT = 0.3
TRAILING_ACTIVATION = 1.5
PHASE1_TRAILING = 1.0
PHASE2_TRAILING = 0.7
PHASE3_TRAILING = 0.5
CONFIDENCE_FLOOR = 0.25

# NEW in P#62:
PA_MIN_SCORE = 0.20
PA_GATE_MIN_SCORE = 0.25
PA_BOOST_THRESHOLD = 0.65
```

---

## 9. Podsumowanie

| Status | Szczegół |
|--------|----------|
| ✅ PA Engine | Działa — 14.7% pattern detection |
| ✅ S/R Filter | Aktywowany (wyłączony od P#59) |
| ✅ Learning Fix | Brain prawidłowo uczy się z błędów |
| ⚠️ Score | 35.3/100 (regresja -1.1 vs P#61) |
| ❌ PF | 0.617 (cel: >1.3) |
| ❌ W/L | 0.28 (cel: >1.5) |
| ❌ Return | -5.26% (cel: >0%) |

**Wniosek:** PA engine i S/R filter dodają wartościowe dane ale **nie rozwiązują fundamentalnego problemu exit management**. Avg win $21 vs avg loss $76 powoduje że nawet 69% WR daje ujemne returns. Następny patch musi skupić się na **exit optimization**: dłuższe partials (L1@2.0+ATR), łagodniejszy trailing w Phase 1, dynamic SL, i filtrowanie long-side.

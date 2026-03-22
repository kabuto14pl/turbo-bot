# 📊 BACKTEST REPORT — PATCH #60 "Game-Changer Overhaul"

> **CLAUDE-SKYNET v1.0 – Turbo-Bot Evolution**  
> Skills: `#02-skynet-architect` `#04-execution-optimizer` `#05-risk-quant` `#07-trading-strategist` `#11-backtest-validator`

---

## 1. Streszczenie Wykonawcze

**PATCH #60** implementuje 5 strukturalnych zmian ("Game-Changers") mających na celu przejście z mikro-tradingu na realne zyski. Wyniki backtestów pokazują **mieszany obraz** — fundamentalne metryki jakościowe się poprawiły (PF, W/L), ale brak TP exitów + wyłączenie partiali = większe straty dolarowe.

### Kluczowe odkrycie
> **Problem #1 (krytyczny):** 0% TP exitów utrzymuje się pomimo TP=3.0 ATR (z 5.0).  
> **Problem #2:** Wyłączenie ALL partiali usunęło jedyną ścieżkę zysków pośrednich.  
> **Efekt:** Jedyne exity to BE (~0 profit) i SL (pełna strata). System nie ma jak zarabiać.

---

## 2. Zmiany w PATCH #60 (5 Game-Changers)

| GC | Zmiana | Parametr | Przed (#59) | Po (#60) | Status |
|----|--------|----------|-------------|----------|--------|
| GC1 | Position Sizing | `MAX_POSITION_VALUE_PCT` | 0.20 (20%) | 1.00 (100%) | ✅ Działa |
| GC1 | Risk per trade | `RISK_PER_TRADE` | 0.02 (2%) | 0.015 (1.5%) | ✅ Działa |
| GC2 | Fee reduction | `FEE_RATE` | 0.0005 (0.05%) | 0.0002 (0.02%) | ✅ Działa |
| GC3 | TP multiplier | `TP_ATR_MULT` | 5.0 | 3.0 | ⚠️ Nadal 0% TP |
| GC3 | TP clamp | `TP_CLAMP_MAX` | 6.0 | 4.5 | ⚠️ Nadal 0% TP |
| GC3 | Partials L1/L2/L3 | `PARTIAL_ATR_L*_PCT` | 30/30/40% | 0/0/0% | ❌ KRYTYCZNE |
| GC3 | Trail phases | Fazy 1-5 | 1.5/1.5/2.0/2.5/3.5R | 1.0/1.0/1.5/2.0/2.5R | ✅ Agresywniejsze |
| GC3 | Trail distance | `TRAILING_DISTANCE_ATR` | 2.0 | 1.5 | ✅ Ciaśniejszy |
| GC4 | Multi-pair | ETH, SOL, BNB, XRP | — | — | ❌ Brak danych |
| GC5 | Confidence floor | `CONFIDENCE_FLOOR` | 0.30 | 0.25 | ✅ +68% tradów |
| GC5 | Ensemble normal | `ENSEMBLE_THRESHOLD_NORMAL` | 0.30 | 0.22 | ✅ Więcej sygnałów |
| GC5 | Ensemble strong | `ENSEMBLE_THRESHOLD_STRONG` | 0.25 | 0.18 | ✅ Więcej sygnałów |
| GC5 | QDV confidence | `QDV_MIN_CONFIDENCE` | 0.30 | 0.25 | ✅ Mniej blokad |

---

## 3. Porównanie PATCH #59 vs #60 — Wszystkie Timeframe'y

### 3.1 Timeframe 15m (główny)

| Metryka | PATCH #59 | PATCH #60 | Δ | Ocena |
|---------|-----------|-----------|---|-------|
| **Trades** | 31 | 52 | +68% | ✅ Więcej okazji |
| **Win Rate** | 67.7% | 51.9% | -15.8pp | ⚠️ Spadek |
| **Profit Factor** | 0.665 | 0.714 | +7.4% | ✅ Poprawa |
| **Win/Loss Ratio** | 0.32 | 0.66 | +106% | ✅ 2× lepszy |
| **Sharpe** | 1.621 | -1.301 | — | ❌ Regresja |
| **Max Drawdown** | 1.58% | 9.17% | +480% | ❌ Większy DD |
| **Net Return** | -0.71% (-$71.30) | -5.86% (-$585.57) | -$514 | ❌ Większa strata |
| **Avg Win** | $6.75 | $54.24 | +703% | ✅ 8× większy |
| **Avg Loss** | -$21.29 | -$82.00 | +285% | ⚠️ 4× większa |
| **Total Fees** | $38.06 (53.4%) | $203.18 (34.7%) | -18.7pp | ✅ Mniejszy % |
| **TP Exits** | 0% | 0% | 0 | ❌ BEZ ZMIAN |
| **MTF Aligned** | 36% | 54% | +18pp | ✅ Poprawa |

### 3.2 Timeframe 1h

| Metryka | PATCH #59 | PATCH #60 | Δ | Ocena |
|---------|-----------|-----------|---|-------|
| **Trades** | 12 | 33 | +175% | ✅ |
| **Win Rate** | 83.3% | 42.4% | -40.9pp | ❌ Silna regresja |
| **Profit Factor** | 0.696 | 0.535 | -23% | ❌ Regresja |
| **Win/Loss Ratio** | 3.48 | 0.73 | -79% | ❌ Regresja |
| **Max Drawdown** | 0.67% | 7.51% | +11× | ❌ |
| **Net Return** | -0.20% | -7.01% | -$680 | ❌ |
| **Total Fees** | $6.62 (33.5%) | $100.74 (14.4%) | -19.1pp | ✅ |
| **MTF Aligned** | — | 42% | — | ⚠️ |

### 3.3 Timeframe 4h

| Metryka | PATCH #59 | PATCH #60 | Δ | Ocena |
|---------|-----------|-----------|---|-------|
| **Trades** | 4 | 7 | +75% | ✅ |
| **Win Rate** | 75.0% | 42.9% | -32.1pp | ❌ |
| **Profit Factor** | 0.467 | 0.637 | +36% | ✅ Poprawa |
| **Win/Loss Ratio** | 0.47 | 0.85 | +81% | ✅ Poprawa |
| **Max Drawdown** | 0.45% | 3.11% | +6× | ⚠️ |
| **Net Return** | -0.17% | -1.46% | -$129 | ❌ |
| **Total Fees** | $2.45 (14.7%) | $13.57 (9.3%) | -5.4pp | ✅ |

---

## 4. Analiza Exit Reasons

### 4.1 Timeframe 15m

| Exit Reason | Ilość | % | Trend |
|-------------|-------|---|-------|
| Break-Even (BE) | 27 | 51.9% | Dominujący — ~$0 profit |
| Stop-Loss (SL) | 24 | 46.2% | Pełna strata -$82 avg |
| Ranging Stale | 1 | 1.9% | Timeout |
| **Take-Profit (TP)** | **0** | **0%** | **❌ KRYTYCZNE** |

### 4.2 Timeframe 1h

| Exit Reason | Ilość | % |
|-------------|-------|---|
| Stop-Loss (SL) | 14 | 42.4% |
| Break-Even (BE) | 12 | 36.4% |
| Ranging Stale | 5 | 15.2% |
| Time Underwater | 1 | 3.0% |
| End of Data | 1 | 3.0% |

### 4.3 Timeframe 4h

| Exit Reason | Ilość | % |
|-------------|-------|---|
| Stop-Loss (SL) | 3 | 42.9% |
| Break-Even (BE) | 2 | 28.6% |
| Time Emergency | 1 | 14.3% |
| Time Underwater | 1 | 14.3% |

---

## 5. Trailing Phase Analysis

Trailing stop fazy pokazują jak daleko cena dociera przed odwróceniem:

| Faza | R-multiple | 15m | 1h | 4h | Interpretacja |
|------|-----------|-----|----|----|---------------|
| Phase 1 | 1.0R | 34 (65%) | 21 (64%) | 5 (71%) | Cena ledwo się rusza |
| Phase 2 | 1.0-1.5R | 6 (12%) | 7 (21%) | 1 (14%) | Słaby ruch |
| Phase 3 | 1.5-2.0R | 12 (23%) | 5 (15%) | 1 (14%) | Umiarkowany ruch |
| Phase 4+ | 2.0R+ | 0 (0%) | 0 (0%) | 0 (0%) | **NIGDY nie osiągane** |

> **Wniosek:** 65% tradów nie przechodzi nawet przez Phase 1 (1.0R). TP na 3.0R jest nieosiągalny.
> To wyjaśnia 0% TP exitów — cena prawie nigdy nie dociera tak daleko.

---

## 6. Regime Analysis

### 6.1 Dystrybucja reżimów (15m)

| Reżim | % Czasu | % Tradów | Notatka |
|--------|---------|----------|---------|
| RANGING | 47.2% | 0% (blocked) | Słusznie blokowane |
| TRENDING_DOWN | 28.2% | 29 (55.8%) | Short-dominant |
| TRENDING_UP | 24.5% | 23 (44.2%) | Long-weak |
| HIGH_VOLATILITY | 0.1% | 0% | Zbyt rzadkie |

### 6.2 Performance per regime (15m)

| Reżim | Trades | WR | PnL |
|--------|--------|-----|------|
| TRENDING_DOWN (Short) | 29 | 62.1% | -$43.94 |
| TRENDING_UP (Long) | 23 | 39.1% | -$541.64 |

> **CRITICAL:** Long positions are devastating — WR 39.1% i -$541 loss. Short strona prawie breakeven (-$44).

---

## 7. Game-Changer Oceny Indywidualne

### ✅ GC1: Position Sizing — SUKCES

| Aspekt | Wynik |
|--------|-------|
| Avg Win | $6.75 → $54.24 (+703%) |
| Avg Loss | $21.29 → $82.00 (+285%) |
| W/L Ratio | 0.32 → 0.66 (+106%) |
| **Verdict** | Sizing działa — winy rosną szybciej niż straty |

### ✅ GC2: Fee Reduction — SUKCES

| Aspekt | Wynik |
|--------|-------|
| Fee rate | 0.05% → 0.02% |
| Fee % of PnL | 53.4% → 34.7% (-18.7pp) |
| Absolute fees | $38 → $203 (więcej przez sizing) |
| **Verdict** | Fee drag znacząco zmniejszony procentowo |

### ❌ GC3: Better Exits — CZĘŚCIOWA PORAŻKA

| Aspekt | Wynik |
|--------|-------|
| TP exits | 0% → 0% (BEZ ZMIAN) |
| Partials disabled | Usunięto jedyną ścieżkę zysków |
| Trail phases tighter | Phase 3 osiągane przez 23% tradów |
| BE exits dominance | 51.9% — wielu tradów zamykanych at breakeven |
| **Verdict** | TP nadal nieosiągalny, a partials potrzebne do capture |

### ❌ GC4: Multi-pair — NIE ZAIMPLEMENTOWANE

Brak danych historycznych dla ETH, SOL, BNB, XRP. Wymaga pobierania z API na VPS.

### ✅ GC5: Lower Thresholds — SUKCES

| Aspekt | Wynik |
|--------|-------|
| Trade count | 31 → 52 (+68%) |
| Blocked trades | Spadek z ~50 do 31 blokad |
| Jakość nowych tradów | PF 0.714 &ge; 0.665 (nie pogorszona) |
| **Verdict** | Więcej tradów bez degradacji jakości |

---

## 8. Blocked Trades Analysis

### 15m — 31 zablokowanych

| Powód | Ilość |
|-------|-------|
| QDV: Ranging regime | 5 |
| Confidence < 0.25 floor | ~14 (różne wartości 0.20-0.24) |
| Post-sentiment < floor | 2 |
| QDV: Confidence < 0.25 | 2 |

### 1h — 42 zablokowane

| Powód | Ilość |
|-------|-------|
| Confidence < 0.25 floor | ~25 (wartości 0.20-0.25) |
| QDV: Ranging regime | 3 |
| QDV: Confidence < 0.25 | 2 |

> **Uwaga:** Confidence 0.25 = floor, ale nadal blokowane (operator `<` nie `<=`). Potknięcie w kodzie.

---

## 9. Long vs Short Breakdown

### 15m

| Strona | Trades | WR | PnL | Avg Win | Avg Loss |
|--------|--------|-----|------|---------|----------|
| LONG | 23 | 39.1% | -$541.64 | — | — |
| SHORT | 29 | 62.1% | -$43.94 | — | — |

> **Long strona odpowiada za 92.5% strat.** Bot jest fundamentalnie lepszy na shortach w tym datasecie.

### 1h

| Strona | Trades | WR | PnL |
|--------|--------|-----|------|
| LONG | 13 | 38.5% | -$597.76 |
| SHORT | 20 | 45.0% | -$102.92 |

> Identyczny pattern — long side katastrofalny.

---

## 10. Ensemble & Component Analysis

### 15m Weights

| Model | Weight |
|-------|--------|
| MACrossover | 0.22 |
| AdvancedAdaptive | 0.20 |
| SuperTrend | 0.17 |
| RSITurbo | 0.13 |
| MomentumPro | 0.10 |
| NeuralAI | 0.10 |
| PythonML | 0.07 |

- Consensus rate: 0.6% (bardzo niski — modele rzadko zgadzają się)
- Boost rate: 96.2% (prawie wszystkie trade'y dostawały boost)
- MTF aligned: 21/39 = 54% (poprawa z 36%)

---

## 11. Neuron AI

| TF | Overrides | Max Loss Streak | Evolutions | Risk Mult |
|----|-----------|-----------------|------------|-----------|
| 15m | 0 | 5 | 10 | 1.276 |
| 1h | 0 | 6 | 6 | 0.966 |
| 4h | 0 | 3 | 2 | 0.889 |

> Neuron AI nie nadpisał żadnego trade'a. Risk multiplier 1h/4h < 1.0 sugeruje że system uczy się być ostrożnym.

---

## 12. Diagnoza Głównego Problemu

### Dlaczego 0% TP exitów?

```
Trail Phase Distribution:
65% Phase 1 (1.0R) ← cena ledwo się rusza
12% Phase 2 (1.0-1.5R)
23% Phase 3 (1.5-2.0R) ← best case
 0% Phase 4+ (2.0R+) ← TP na 3.0R NIGDY nie osiągane
```

**Root Cause:** BTC na 15m ma zbyt mały range by osiągnąć 3.0R TP.
- SL = 2.0 ATR (np. ~$400 na BTC)
- TP = 3.0 ATR = $600 move required
- BTC 15m candle avg range: $100-200
- Potrzeba 3-6 konsekutywnych candles w jednym kierunku — rzadkie

### Dlaczego Long-side katastrofalny?

Dataset coverage obejmuje okres predominantly bearish lub ranging. Long entries w TRENDING_UP reżimie mają WR 39% — sugeruje że trend detector nadmiernie klasyfikuje ranging jako trending_up.

---

## 13. Podsumowanie Game-Changers

| GC | Nazwa | Cel | Wynik | Grade |
|----|-------|-----|-------|-------|
| GC1 | Position Sizing | Większe pozycje | W/L 2× lepszy, ale DD 6× | B |
| GC2 | Maker Fees | Mniejszy fee drag | Fee % -19pp | A |
| GC3 | Better Exits | TP zamiast partials | 0% TP, utrata partials | F |
| GC4 | Multi-pair | Dywersyfikacja | Brak danych | N/A |
| GC5 | Lower Thresholds | Więcej tradów | +68% bez degradacji PF | A |

**Overall PATCH #60 Grade: C-**

Pozytywne fundamenty (sizing, fees, thresholds), ale GC3 jest destrukcyjny i wymaga natychmiastowej korekty.

---

## 14. Rekomendacje dla PATCH #61

### P0 — KRYTYCZNE (natychmiast)

1. **Re-enable partials na nowych poziomach:**
   - L1: 1.0R ATR → 40% size (zamiast czekania na nieosiągalny TP)
   - L2: 1.5R ATR → 30% size
   - L3: 2.0R ATR → 30% size (lub trail resztę)

2. **Obniż TP do 2.0-2.5 ATR** (lub całkowicie wyłącz TP i polegaj na trailing + partials)

3. **Dodaj long-side filter:**
   - TRENDING_UP WR = 39% → zbyt niska
   - Opcja A: Blokuj longi gdy WR < 50%
   - Opcja B: Wymagaj wyższego confidence dla longów (+0.05)
   - Opcja C: Reduce long position size by 50%

### P1 — WAŻNE

4. **Fix confidence floor operator:** `<` powinno być `<=` (confidence 0.25 = floor 0.25 powinno przejść)

5. **Phase 1 exit optimization:** 65% tradów umiera w Phase 1 (1.0R). Rozważ wcześniejszy trailing start (0.5R) lub micro-partials na 0.5-1.0R.

6. **Ranging regime trailing:** Obecnie 5 tradów z RANGING_STALE exit (1h). Rozważ krótszy timeout w ranging.

### P2 — NICE TO HAVE

7. **Multi-pair data download** z API na VPS (ETH, SOL, BNB, XRP)
8. **Adaptive sizing** — zmniejsz pozycję na long-side automatycznie
9. **Trailing distance per regime** — ciaśniejszy w ranging, luźniejszy w trending

---

## 15. Projekcja PATCH #61

Jeśli przywrócimy partials (GC3 fix) i dodamy long-filter:

| Metryka | P#60 | Projekcja P#61 |
|---------|------|-----------------|
| PF | 0.714 | 0.85-1.05 |
| WR | 51.9% | 55-60% |
| W/L | 0.66 | 0.80-1.00 |
| MaxDD | 9.17% | 5-7% |
| Net Return | -5.86% | -2% to +1% |
| TP exits | 0% | 15-25% (via partials) |

---

## 16. Konfiguracja Backtestu

```
Pipeline Version:  2.2.0
Patch:            #60
Phases:           18
Data:             btcusdt only (BTC/USDT perpetual)
Capital:          $10,000
Fee Rate:         0.02% (maker)
Risk Per Trade:   1.5%
Max Position:     100% capital
SL:               2.0 ATR
TP:               3.0 ATR (clamped to 4.5)
Partials:         DISABLED (L1/L2/L3 = 0%)
Trailing:         5 phases (1.0/1.0/1.5/2.0/2.5R)
Confidence Floor: 0.25
Ensemble Normal:  0.22
```

---

*Raport wygenerowany: PATCH #60 Game-Changer Overhaul*  
*Następny krok: PATCH #61 — Partial Re-enablement + Long Filter*

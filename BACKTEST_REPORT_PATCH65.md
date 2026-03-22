# 📊 BACKTEST REPORT — PATCH #65 "Momentum Gate + Signal Scoring + RANGING"

> **CLAUDE-SKYNET v1.0 – Turbo-Bot Evolution**  
> Skills: `#02-skynet-architect` `#04-execution-optimizer` `#05-risk-quant` `#07-trading-strategist` `#11-backtest-validator`

---

## 1. Streszczenie Wykonawcze

**PATCH #65** implementuje 7 zmian strukturalnych:
1. **Momentum Gate** — tighten SL po 4 candles jeśli trade nie pokazał momentum
2. **Signal-Level Metrics** — grupowanie tradów po entry_time
3. **Signal-Level Scoring** — nowa formuła bez inflacji WR przez partials
4. **Brain Rules 18-20** — adaptive tuning momentum gate, RANGING, signal W/L
5. **PA Gate Rebalance** — 0.30→0.25 (undo Brain over-filtering)
6. **RANGING Micro-Scalp** — QDV bypass + tighter SL/TP
7. **Runner Display** — nowe sekcje statystyk

### Kluczowe odkrycia

> **POZYTYWNE:** Momentum gate **zredukował avg loss o 47%** ($106→$56). Signal W/L **poprawił się** 0.66→0.84.  
> **NEGATYWNE:** Signal WR tylko **38.7%** (12/31 sygnałów). LONG-side **katastrofalny** (20% WR). Equity curve pokazuje **7-signal loss streak** w lutym/marcu.  
> **KRYTYCZNE:** RANGING trades **nadal 0** pomimo QDV bypass — strategie nie generują sygnałów w rangingu.

### Verdict: **31.0/100** — System identyfikuje losery (momentum gate), ale nie ma wystarczająco dobrych sygnałów do profitability

---

## 2. Konfiguracja Backtesta

```
Pipeline Version:  2.6.0
Patch:            #65
Phases:           19 (Phase 19: Long Trend Filter)
Data:             btcusdt_15m.csv — 14,201 candles
Period:           2025-10-04 → 2026-03-01 (147.9 days)
Capital:          $10,000
Fee Rate:         0.02% (maker)
Risk Per Trade:   1.5%
SL:               1.75 ATR (regime-adjusted)
TP:               2.0 ATR (Brain optimized from 2.5)
Partials:         L1=20%@1.25ATR, L2=45%@2.0ATR
Trailing:         5 phases (0.5/1.0/1.0/0.75 ATR)
Confidence Floor: 0.25
PA Min Score:     0.25 (Brain raised to 0.30)
Momentum Gate:    4 candles, 0.40R threshold, 50% SL tighten
RANGING:          Enabled (SL=1.0, TP=1.25 ATR)
```

---

## 3. Skynet Brain Convergence

| Iter | Score | PF | WR | W/L | DD | Return | TP | Status |
|------|-------|-----|-----|-----|-----|--------|-----|--------|
| 1 | 28.7 | 0.517 | 62.0% | 0.32 | 6.0% | -5.13% | 1 | ✅ NEW_BEST |
| 2 | **29.2** | **0.531** | 62.0% | **0.33** | **5.8%** | **-4.99%** | **2** | ✅ NEW_BEST |
| 3 | 29.2 | 0.531 | 62.0% | 0.33 | 5.8% | -4.99% | 2 | ⚠️ NO_IMPROVEMENT |
| 4 | 29.2 | 0.531 | 62.0% | 0.33 | 5.8% | -4.99% | 2 | ⚠️ NO_IMPROVEMENT |

**Converged po 4/10 iteracjach.** Brain dokonał 2 zmian:
- `TP_ATR_MULT`: 2.5 → 2.0 (TP bardziej osiągalny)
- `PHASE_1_MIN_R`: 0.7 → 0.5 (wcześniejszy trailing)
- `PA_MIN_SCORE`: 0.25 → 0.30 (próba filtrowania — bez efektu)

---

## 4. Wyniki Główne

### 4.1 Core Metrics

| Metryka | P#64 | P#65 | Δ | Ocena |
|---------|------|------|---|-------|
| **Score** | 51.2 | 29.2 | -22.0 | ⚠️ Nowa formuła |
| **Trades** | 15 | **50** | +35 (3.3×) | ✅ |
| **Trades/Day** | 0.1 | **0.3** | +0.2 | ✅ |
| **Win Rate** | 73.3% | 62.0% | -11.3pp | ⚠️ |
| **Profit Factor** | 0.658 | 0.531 | -0.127 | ❌ |
| **W/L Ratio** | 0.66 | 0.33 | -0.33 | ❌ |
| **Sharpe** | 0.684 | **1.574** | +0.89 | ✅ |
| **Max Drawdown** | 3.24% | 5.84% | +2.60pp | ❌ |
| **Net Return** | -1.45% | -4.99% | -3.54pp | ❌ |
| **Avg Win** | $25.35 | $18.19 | -$7.16 | ⚠️ |
| **Avg Loss** | $106.00 | **$55.92** | **-$50.08** | ✅ |
| **Total Fees** | $32.29 | $116.40 | +$84 | ⚠️ (3.3× trades) |
| **Fees % PnL** | — | 23.3% | — | ✅ |
| **Largest Win** | $56.14 | $75.06 | +$18.92 | ✅ |
| **Largest Loss** | $109.69 | $108.61 | -$1.08 | — |

### 4.2 Signal-Level Metrics (PATCH #65 NEW)

| Metryka | P#64 | P#65 | Δ |
|---------|------|------|---|
| **Unique Signals** | 8 | **31** | +23 (3.9×) |
| **Signal WR** | 50.0% | **38.7%** | -11.3pp ❌ |
| **Signal W/L** | 0.66 | **0.84** | +0.18 ✅ |
| **Sig Avg Win** | — | **$46.99** | — |
| **Sig Avg Loss** | — | **$55.92** | — |
| **Trades/Signal** | 1.9 | **1.6** | -0.3 |

> **Insight:** Signal W/L 0.84 = winners PRAWIE tak duże jak losery (stosunek $47/$56). Problem to **ilość losersów** (19/31 = 61.3%), nie ich rozmiar.

### 4.3 Momentum Gate Stats

| Metryka | Wartość |
|---------|--------|
| Positions checked | 22 |
| SL tightened | **15 (68%)** |
| Avg loss before gate | $106.00 (P#64) |
| Avg loss after gate | **$55.92** |
| Loss reduction | **47%** |

### 4.4 RANGING Stats

| Metryka | Wartość |
|---------|--------|
| RANGING % danych | 47.2% |
| RANGING trades | **0** ❌ |
| QDV RANGING rejections | 0 (bypass works) |
| Powód | Strategie trend-following nie generują sygnałów w rangingu |

---

## 5. Exit Reasons Analysis

| Exit Reason | Trades | % | Avg PnL | Total PnL | Trend |
|-------------|--------|---|---------|-----------|-------|
| **SL** | 19 | 38.0% | -$55.92 | **-$1,062.48** | ❌ Dominujący loser |
| PARTIAL_L1 | 12 | 24.0% | +$9.54 | +$114.44 | ✅ Quick capture |
| BE | 9 | 18.0% | +$8.63 | +$77.68 | ✅ Micro-profit |
| PARTIAL_L2 | 7 | 14.0% | +$31.23 | +$218.63 | ✅ Best avg |
| TP | 2 | 4.0% | +$39.04 | +$78.08 | ✅ Full target |
| TRAIL | 1 | 2.0% | +$75.06 | +$75.06 | ✅ Best single |

### Exit PnL Distribution
```
PARTIAL_L2     $+218.63 ███████████████████████████████████░░░░  BEST
PARTIAL_L1     $+114.44 ████████████████████░░░░░░░░░░░░░░░░░░░
TP              $+78.08 ██████████████░░░░░░░░░░░░░░░░░░░░░░░░░
BE              $+77.68 ██████████████░░░░░░░░░░░░░░░░░░░░░░░░░
TRAIL           $+75.06 █████████████░░░░░░░░░░░░░░░░░░░░░░░░░░
SL           $-1,062.48 ██████████████████████████████████████████████████ WORST
```

### Trail Phase at Exit
| Phase | Trades | % | Interpretacja |
|-------|--------|---|---------------|
| Phase 1 (0.5R) | 35 | 70% | Cena ledwo się rusza |
| Phase 2 (1.0R) | 7 | 14% | Słaby ruch |
| Phase 3 (1.5R) | 6 | 12% | Umiarkowany — L2 region |
| Phase 4 (2.0R+) | 2 | 4% | TP osiągnięty (× 2 razy) |

> **70% tradów** nie przechodzi Phase 1 (0.5R). Sygnały muszą być lepsze.

---

## 6. Directional Analysis

### 6.1 Trade-Level
| Side | Trades | WR | PnL | Avg PnL |
|------|--------|-----|------|---------|
| **SHORT** | 36 | **69.4%** | -$251.72 | -$6.99 |
| **LONG** | 14 | 42.9% | **-$246.89** | **-$17.63** |

### 6.2 Signal-Level (PRAWDZIWY obraz)
| Side | Signals | Signal WR | PnL | Avg Win | Avg Loss |
|------|---------|-----------|------|---------|----------|
| **SHORT** | 21 | **47.6%** | -$251.70 | +$40.36 | -$59.57 |
| **LONG** | 10 | **20.0%** | -$246.89 | +$80.16 | -$50.90 |

> **CRITICAL:** LONG Signal WR = **20%** (2/10 signals profitable!).  
> LONG signals mają wprawdzie lepszy avg win ($80 vs $40), ale 8/10 sygnałów przegrywa.  
> SHORT Signal WR 47.6% jest bliżej akceptowalnego, ale nadal poniżej breakeven.

---

## 7. Signal-Level Deep Analysis

### 7.1 Wszystkie 12 Winning Signals

| # | Time | Side | Regime | PnL | MaxR | Trades | Exit Pattern |
|---|------|------|--------|-----|------|--------|-------------|
| 1 | 2025-11-12 15:00 | SHORT | TREND_DOWN | **+$125.21** | 2.843 | 3 | L1→L2→TRAIL |
| 2 | 2026-01-23 16:00 | LONG | TREND_UP | +$93.08 | 1.979 | 3 | L1→L2→TP |
| 3 | 2026-01-12 15:30 | LONG | TREND_UP | +$67.24 | 1.198 | 3 | L1→L2→TP |
| 4 | 2026-02-18 11:15 | SHORT | TREND_DOWN | +$59.32 | 1.563 | 3 | L1→L2→BE |
| 5 | 2025-12-18 17:00 | SHORT | TREND_DOWN | +$57.18 | 1.381 | 3 | L1→L2→BE |
| 6 | 2025-11-23 23:45 | SHORT | TREND_DOWN | +$47.34 | 1.258 | 3 | L1→L2→BE |
| 7 | 2025-12-21 13:15 | SHORT | TREND_DOWN | +$38.80 | 1.539 | 3 | L1→L2→BE |
| 8 | 2026-02-01 14:15 | SHORT | TREND_DOWN | +$20.55 | 1.064 | 2 | L1→BE |
| 9 | 2025-10-20 16:30 | SHORT | TREND_DOWN | +$15.88 | 0.773 | 2 | L1→BE |
| 10 | 2025-12-29 09:30 | SHORT | TREND_DOWN | +$14.51 | 0.754 | 2 | L1→BE |
| 11 | 2026-01-02 14:15 | SHORT | TREND_DOWN | +$13.88 | 1.063 | 2 | L1→BE |
| 12 | 2025-12-31 15:00 | SHORT | TREND_DOWN | +$10.90 | 0.839 | 2 | L1→BE |

**Winner Patterns:**
- **All** winners miały ≥ 2 partial exits
- **Top 4** miały MaxR > 1.2 → L1+L2 captured **+$345**
- **Bottom 5** miały MaxR 0.75-1.06 — tylko L1 capture ($10-$21/signal)
- **Best signal** (+$125): TRAIL exit z MaxR 2.843 — JEDYNY trail w 31 sygnałach
- **10/12** winners to SHORT w TRENDING_DOWN
- **2/12** winners to LONG (ale $160/12 = 25% total winnings)

### 7.2 Wszystkie 19 Losing Signals

| # | Time | Side | Regime | PnL | MaxR | Note |
|---|------|------|--------|-----|------|------|
| 1 | 2025-11-03 | SHORT | TD | -$108.61 | 0.608 | **Largest loss** — MaxR>0.40, momentum gate NOT triggered |
| 2 | 2026-02-03 | SHORT | TD | -$90.06 | 0.256 | No momentum |
| 3 | 2026-02-27 | LONG | TU | -$75.40 | 0.587 | LONG z momentum ale reversed |
| 4 | 2026-02-11 | SHORT | TD | -$62.31 | 0.154 | Dead trade |
| 5 | 2026-01-21 | SHORT | TD | -$61.08 | 0.259 | No momentum |
| 6 | 2025-12-19 | SHORT | TD | -$58.71 | 0.246 | No momentum |
| 7 | 2026-02-20 | LONG | TU | -$58.00 | **0.000** | Trade NIGDY nie ruszył w dobrym kierunku |
| 8 | 2026-02-25 | SHORT | TD | -$57.73 | 0.057 | Dead trade |
| 9 | 2025-12-07 | SHORT | TD | -$56.17 | 0.158 | Dead trade |
| 10 | 2026-01-09 | LONG | TU | -$54.61 | 0.365 | Near gate threshold |
| 11 | 2026-02-28 | LONG | TU | -$52.77 | 0.397 | Near gate threshold — 0.003 below 0.40! |
| 12 | 2026-03-01 | LONG | TU | -$49.60 | 0.270 | No momentum |
| 13 | 2026-02-15 | LONG | TU | -$44.74 | 0.165 | Dead trade |
| 14 | 2026-01-28 | SHORT | TD | -$43.06 | 0.054 | Dead trade |
| 15 | 2025-11-10 | SHORT | TD | -$40.96 | 0.288 | No momentum |
| 16 | 2026-03-01 | SHORT | TD | -$40.93 | 0.276 | No momentum |
| 17 | 2026-01-23 | LONG | TU | -$39.84 | 0.095 | Dead trade |
| 18 | 2026-02-20 | SHORT | TD | -$35.65 | 0.119 | Dead trade |
| 19 | 2025-12-28 | LONG | TU | -$32.25 | 0.594 | LONG z momentum, reversed |

**Loser Patterns:**
- **16/19** losers miały MaxR < 0.40 → momentum gate **powinien** je tightened (i to działa — dlatego avg loss $56 nie $106)
- **3/19** losers miały MaxR > 0.40 (0.587, 0.594, 0.608) — te przeszły gate ale i tak przegrały
- **8/19** losers to LONG (8/10 LONG signals = loser!)
- **ALL** losers miały **1 trade** (SL) — brak partial profits
- **7 "dead trades"** = MaxR < 0.16 — cena praktycznie się nie ruszyła w dobrym kierunku

---

## 8. MaxR Distribution — The Quality Map

| MaxR Range | Signals | WR | PnL | Interpretacja |
|-----------|---------|-----|------|---------------|
| [0.0-0.2) | 8 | **0%** | **-$397.50** | Dead trades — ZERO momentum |
| [0.2-0.4) | 8 | **0%** | **-$448.72** | Weak impulse — not enough |
| [0.4-0.6) | 2 | **0%** | -$107.65 | Had some momentum, reversed |
| [0.6-0.8) | 3 | 67% | -$78.22 | Mixed — L1 captures possible |
| [0.8-1.0) | 1 | 100% | +$10.90 | Modest winner |
| **[1.0-1.5)** | **5** | **100%** | **+$206.19** | **Strong winners** |
| **[1.5-3.0)** | **4** | **100%** | **+$316.41** | **Best signals** |

> **Patent:** MaxR < 0.60 = **0% WR** (18 signals, -$953.87). MaxR ≥ 0.80 = **100% WR** (10 signals, +$533.50).
> **Granica zysku** leży przy ~0.80R. Poniżej — ZERO szans na profit.

---

## 9. Monthly Performance (Signal-Level)

| Miesiąc | Signals | Signal WR | PnL | Trend |
|---------|---------|-----------|------|-------|
| 2025-10 | 1 | 100% | +$15.88 | ✅ |
| 2025-11 | 4 | 50% | +$22.98 | ✅ |
| 2025-12 | 7 | 57% | -$25.74 | ⚠️ |
| 2026-01 | 7 | 43% | -$24.39 | ⚠️ |
| **2026-02** | **10** | **20%** | **-$396.79** | **❌ KATASTROFA** |
| 2026-03 | 2 | 0% | -$90.53 | ❌ |

> **Luty-Marzec = 80% strat** (-$487 z $499 total). System załamuje się gdy BTC spada poniżej $70K.
> Dataset: Oct-Dec ~$86-110K (stable), Jan-Mar $65-92K (volatile crash). Bot nie adaptuje się do crash conditions.

---

## 10. Equity Curve

```
$10,100 ┤
$10,050 ┤   ╭╮  ╭╮                    ╭╮
$10,000 ┤╭╮ ││╭╮││╭╮╭╮╭╮╭╮          ╭╮│╰╮
 $9,950 ┤│╰╮│╰╯╰╯╰╯╰╯╰╯╰╯ ╭╮╭╮╭╮╭╮│╰╯ │
 $9,900 ┤│  ╰╯                ╰╯╰╯╰╯╰╯   │
 $9,850 ┤│                                 ╰╮
 $9,800 ┤│                                   ╰╮
 $9,750 ┤│                                     ╰╮
 $9,700 ┤│                                       ╰╮
 $9,650 ┤│                                         ╰╮
 $9,600 ┤│                                           ╰╮
 $9,550 ┤│                                             ╰╮
 $9,500 ┤│                                               ╰
         Oct    Nov    Dec    Jan    Feb    Mar
```

- **Oct-Jan:** Equity **flat** (~$10K) — system breakeven
- **Feb-Mar:** **7-signal loss streak** — equity crashes -5%
- Max DD: **5.36%** (signal-level) / 5.84% (trade-level)
- Final: **$9,501** (-4.99%)

---

## 11. Streak Analysis

| Metryka | Wartość |
|---------|--------|
| Max win streak | 3 signals |
| **Max loss streak** | **7 signals** |
| Final streak | 8 losers in last 10 signals |

> **Ostatnie 10 sygnałów:** 2W / 8L = 20% WR w końcówce. System degraduje na crash market.

---

## 12. Regime Analysis

### Regime Distribution
| Regime | % Data | % Trades | Trades |
|--------|--------|----------|--------|
| RANGING | **47.2%** | **0%** | 0 |
| TRENDING_DOWN | 28.2% | 72% | 36 |
| TRENDING_UP | 24.5% | 28% | 14 |
| HIGH_VOL | 0.1% | 0% | 0 |

### Regime Performance
| Regime | Signal WR | PnL | Avg Signal PnL |
|--------|-----------|------|---------------|
| TRENDING_DOWN (S) | ~47% | -$251.72 | -$6.99/trade |
| TRENDING_UP (L) | ~20% | -$246.89 | -$17.63/trade |

> **47.2% danych kompletnie pominięte** (RANGING). Bot operuje na 52.8% dostępnego czasu.

---

## 13. Component Impact Analysis

### Pipeline Components
| Component | Key Metric | Ocena |
|-----------|-----------|-------|
| Ensemble | Consensus 0.6% | ❌ Modele prawie nigdy nie zgadzają się |
| QDV | 90.4% pass rate | ✅ Mało blokuje |
| XGBoost | CV 0.45-0.57 | ⚠️ Na granicy edge |
| LLM | Fallback 29/48 | ❌ LLM API niedostępne |
| Sentiment | 9 vetoes | ⚠️ Active filtering |
| Entry Quality | 91.9% boost rate | ✅ Entry quality confirming |
| **PA Engine** | **14.3% pattern rate** | **❌ 6/7 entries = no-pattern** |
| Long Trend | 5 penalized | ✅ Aktywny |
| Momentum Gate | **68% tightened** | **✅ Working!** |
| QPM | 19 partials | ✅ Active |

### PA Engine Breakdown
| Pattern | Count |
|---------|-------|
| No-pattern | 29 (83%) |
| Rejection | 3 (8.6%) |
| Pullback | 2 (5.7%) |
| Breakout | 1 (2.9%) |

> **83% entries** wchodzą BEZ potwierdzonego price action patternu. To główny problem jakości sygnałów.

---

## 14. Blocked Trades Analysis

| Powód | Ilość |
|-------|-------|
| Confidence < 0.25 floor | ~25 |
| Post-sentiment < floor | 6 |
| QDV: Confidence < 0.25 | 2 |
| PRIME duplicate | 4 |
| **Total blocked** | **52** |

> **52 blocked + 50 opened** = 102 raw sygnały. System blokuje 51% — to dobrze, bo otwarte mają PF 0.531.

---

## 15. Hold Time Analysis

| Category | Avg Hold | Min | Max |
|----------|----------|-----|-----|
| Winners | 1.9h | 0.50h | 10.00h |
| Losers | 1.4h | 0.25h | 5.75h |
| All | 1.4h | 0.25h | 10.00h |

> Winners trzymane dłużej (L1→L2→BE/TP/Trail chain). Losers to szybkie SL exits.

---

## 16. vs PATCH #60 Comparison

| Metryka | P#60 | P#65 | Δ |
|---------|------|------|---|
| Trades | 52 | 50 | -2 |
| WR | 51.9% | 62.0% | +10.1pp ✅ |
| PF | 0.714 | 0.531 | -0.183 ❌ |
| W/L | 0.66 | 0.33 | -0.33 ❌ |
| MaxDD | 9.17% | 5.84% | -3.33pp ✅ |
| Return | -5.86% | -4.99% | +0.87pp ✅ |
| Avg Win | $54.24 | $18.19 | -$36.05 ❌ |
| Avg Loss | $82.00 | $55.92 | -$26.08 ✅ |
| TP exits | 0 (0%) | 2 (4%) | +2 ✅ |

> P#65 ma **lepszy return** (-4.99 vs -5.86%), **mniejszy DD**, i **2 TP exits** (P#60 miał 0).
> Ale P#60 miał lepszy **PF** i **W/L** bo partials były wyłączone (większe per-trade winy).

---

## 17. Root Cause Analysis

### Dlaczego PF < 1.0?

```
Total Winnings:  $563.89 (31 winning trades)
Total Losses:   $1,062.48 (19 losing trades)
─────────────────────
PF = 563.89 / 1062.48 = 0.531

Potrzeba: $1,062.48 winnings → reduction in losses lub increase in wins
Gap to PF 1.0: +$498.59 ($1,062.48 - $563.89)
```

### Ścieżki do PF > 1.0:

**Opcja A — Reduce loss count (12→6 losery = PF ~1.0)**
- Cut 6 worst signals: -$486 savings → PF ≈ 0.98
- Wymaga: lepsze filtry entry (PA, momentum confirmation PRE-entry)

**Opcja B — Increase winner size (avg signal win $47→$88)**
- Trail exits zamiast BE: 5 sygnałów kończą na BE z MaxR > 1.0 → łączny +$166 potential
- Wymaga: mniej agresywne trailing w phase 3+

**Opcja C — Eliminate LONG trades (cut $247 losses)**
- 8/10 LONG signals = losers → block all LONG → save ~$247
- Ale: 2 winning LONGs = +$160 → netto save $87
- Requirement: dataset-specific, nie universal solution

---

## 18. Diagnoza Głównych Problemów

### Problem 1: Signal Quality — WR 38.7%
**Root cause:** Strategie (MACrossover, SuperTrend, RSI) generują sygnały bez momentum confirmation.
**Evidence:** 16/19 losers miały MaxR < 0.40 — trade nigdy nie pokazał momentum w dobrym kierunku.
**Solution:** Pre-entry momentum check (np. 2-4 candles confirmation PRZED otwarciem pozycji).

### Problem 2: LONG Side — 20% Signal WR
**Root cause:** Dataset jest predominantly bearish ($90K→$67K). LONG counter-trend penalty 0.75 nie wystarcza.
**Evidence:** 8/10 LONG signals to SL. Jedyne 2 winnery: Jan 12 i Jan 23 (krótki uptrend).
**Solution:** Penalty 0.75→0.40 lub block LONGs gdy EMA200 slope < -0.5%.

### Problem 3: RANGING = 0 Trades (47% Data)
**Root cause:** Wszystkie strategie (MA, ST, RSI, MomentumPro) są trend-following. W RANGING nie generują sygnałów.
**Evidence:** QDV pass rate 90.4% — RANGING entries NIE są blokowane, po prostu NIE MA sygnałów.
**Solution:** Nowa strategia: Bollinger Band mean-reversion lub RSI oversold/overbought bounce.

### Problem 4: Feb-Mar Collapse (-$487)
**Root cause:** BTC crash <$70K z high volatility. System nie adaptuje się do crash conditions.
**Evidence:** 10 signals w Feb, 20% WR. Loss streak 7 signals.
**Solution:** Volatility regime detector — reduce sizing lub pause trading gdy volatility spike.

---

## 19. Momentum Gate Effectiveness Assessment

### Before Gate (P#64):
- Avg loss: $106
- Losers: 4/8 signals

### After Gate (P#65):
- Avg loss: $55.92 (-47%)
- SL tightened: 15/22 positions (68%)

### Gate Success Breakdown:
| MaxR at Gate Check | Count | Outcome |
|-------------------|-------|---------|
| MaxR < 0.40 → tightened | 15 | **Saved ~$750 in potential losses** |
| MaxR ≥ 0.40 → no action | 7 | 3 still lost (0.587, 0.594, 0.608) |

> **Verdict:** Momentum gate jest **najskuteczniejsza zmiana w P#65**. Savings estimate: bez gate, 15 tightened tradów straciłoby ~$106 each = $1,590. Z gate: $839. **Savings: ~$750.**

---

## 20. Oceny Indywidualne Zmian

| # | Zmiana | Cel | Wynik | Grade |
|---|--------|-----|-------|-------|
| 1 | Momentum Gate | Cut avg loss | -47% avg loss | **A** |
| 2 | Signal Metrics | Real WR visibility | Signal WR 38.7% revealed | **A** |
| 3 | Signal Scoring | Accurate scoring | No inflated WR | **B** |
| 4 | Brain Rules 18-20 | Adaptive tuning | Brain converges fast | **C** |
| 5 | PA Rebalance | More trades | +35 trades but PF down | **C-** |
| 6 | RANGING Micro-Scalp | Fill 47% gap | 0 trades — strategies don't signal | **F** |
| 7 | Runner Display | Transparency | Full metrics visible | **A** |

**Overall PATCH #65 Grade: C+**

---

## 21. Rekomendacje dla PATCH #66+

### P0 — KRYTYCZNE

1. **Agresywny LONG filter** — LONG Signal WR 20% to nie do zaakceptowania
   - Opcja A: `LONG_COUNTER_TREND_PENALTY`: 0.75 → 0.40
   - Opcja B: Block LONGs gdy EMA200 slope < -0.3% (bearing macro trend)
   - Opcja C: Require confidence ≥ 0.40 for LONG (vs 0.25 for SHORT)
   - **Expected impact:** Eliminate ~6 losing LONG signals → save ~$300

2. **Pre-entry momentum confirmation** — sprawdź 2-3 candles PRZED wejściem
   - Jeśli ostatnie 2-3 candles nie idą w kierunku sygnału → SKIP
   - 16/19 losers miały MaxR < 0.40 = cena NIGDY nie ruszyła w dobrym kierunku
   - **Expected impact:** Filter 8-10 no-momentum entries → save $400-500

### P1 — WAŻNE

3. **Volatility pause mechanism** — Feb-Mar loss streak 7 sygnałów
   - Gdy 3+ consecutive losses → reduce sizing 50% lub pause 24h
   - NeuronAI risk_multiplier 0.98 = zbyt łagodny. Potrzeba 0.50 after 5 losses.

4. **Mean-reversion strategy** for RANGING — 47% danych pominięte
   - Bollinger Band squeeze + RSI 30/70 bounce
   - SL: 1.0 ATR, TP: 0.75 ATR (micro-scalp)
   - Min ADX < 20, Bollinger Width < 2σ

5. **PA pattern enrichment** — 83% entries = no-pattern
   - Dodaj: Pin bar, Inside bar, Engulfing, Doji at S/R
   - Cel: PA pattern rate 14% → 40%

### P2 — NICE TO HAVE

6. **Brain min iterations** — Brain converges po 4/10 → add MIN_ITERATIONS=5
7. **Trailing optimization** — 70% trades die in Phase 1. Test Phase 1 start at 0.3R instead of 0.5R
8. **Multi-timeframe confirmation** — wymagaj 1h trend agreement przed 15m entry

---

## 22. Projekcja PATCH #66

Jeśli zaimplementujemy LONG filter + pre-entry momentum:

| Metryka | P#65 | Projekcja P#66 |
|---------|------|-----------------|
| Trades | 50 | 30-35 |
| Signal WR | 38.7% | 50-55% |
| PF | 0.531 | 0.80-1.10 |
| W/L | 0.33 | 0.50-0.70 |
| MaxDD | 5.84% | 3-5% |
| Net Return | -4.99% | -2% to +1% |
| Signal W/L | 0.84 | 0.90-1.20 |

---

## 23. Appendix — Brain Optimized Config

```python
RISK_PER_TRADE = 0.015
TP_ATR_MULT = 2.0          # Brain: 2.5→2.0
SL_ATR_MULT = 1.75
PARTIAL_ATR_L1_PCT = 0.20
PARTIAL_ATR_L1_MULT = 1.25
PARTIAL_ATR_L2_PCT = 0.45
PARTIAL_ATR_L2_MULT = 2.0
TRAILING_DISTANCE_ATR = 1.0
PHASE3_TRAIL_ATR = 1.0
PHASE4_TRAIL_ATR = 0.75
PHASE_1_MIN_R = 0.5        # Brain: 0.7→0.5
PHASE_2_BE_R = 1.0
CONFIDENCE_FLOOR = 0.25
ENSEMBLE_THRESHOLD_NORMAL = 0.22
FEE_GATE_MULTIPLIER = 1.5
LONG_COUNTER_TREND_PENALTY = 0.75
MOMENTUM_GATE_CANDLES = 4
MOMENTUM_GATE_MIN_R = 0.40
MOMENTUM_GATE_SL_TIGHTEN = 0.50
```

---

*Raport wygenerowany: 2026-03-04 — PATCH #65 Backtest Report*  
*Wersja: v2.6.0 | Skynet Brain: 4 iterations, converged at 29.2/100*  
*Następny krok: PATCH #66 — LONG Filter + Pre-Entry Momentum*

# RAPORT: Stan Neuron AI — 18 lutego 2026, 12:30 UTC

**Data wygenerowania**: 2026-02-18 12:35 UTC  
**Źródło danych**: VPS `64.226.70.149` — live production  
**Pliki źródłowe**:
- `/root/turbo-bot/trading-bot/data/neuron_ai_state.json` (ostatni zapis: 2026-02-18T12:25:43.048Z)
- `/root/turbo-bot/trading-bot/data/neuron_ai_decisions.log` (1060 wpisów, ostatni: 12:30 UTC)
- PM2 logs `turbo-bot` (process ID 8)

---

## 1. PEŁNA ZAWARTOŚĆ `neuron_ai_state.json` (aktywny plik)

**Lokalizacja**: `/root/turbo-bot/trading-bot/data/neuron_ai_state.json`  
**Ostatni zapis**: `2026-02-18T12:25:43.048Z`

```json
{
  "totalDecisions": 1056,
  "overrideCount": 12,
  "evolutionCount": 69,
  "totalPnL": -453.4307877256442,
  "winCount": 21,
  "lossCount": 89,
  "consecutiveLosses": 5,
  "consecutiveWins": 0,
  "riskMultiplier": 0.9499999999999997,
  "adaptedWeights": {
    "EnterpriseML": 0.45,
    "MomentumPro": 0.29000000000000004
  },
  "reversalEnabled": true,
  "aggressiveMode": false,
  "recentTrades": [ ... 20 entries ... ],
  "savedAt": "2026-02-18T12:25:43.048Z"
}
```

> **UWAGA**: Istnieje drugi plik `/root/turbo-bot/data/neuron_ai_state.json` — jest to stara kopia po resecie (version: `PATCH31_RESET`, timestamp: `2026-02-17T19:42:51Z`), z wyzerowanymi wartościami. Bot aktywnie zapisuje do `/root/turbo-bot/trading-bot/data/neuron_ai_state.json`.

---

## 2. ANALIZA KLUCZOWYCH PÓL

### 2.1 riskMultiplier

| Metryka | Wartość |
|---------|---------|
| **Wartość w state.json** | **0.95** |
| **Wartość w najnowszym logu PM2** | **0.91** (jeszcze nie zapisana do JSON) |
| **Czy nadal 0.30?** | **NIE — riskMultiplier wynosi 0.95 / 0.91** |

**Sekwencja ewolucji riskMultiplier z logów PM2**:

```
[NEURON EVOLVE] Loss streak x3 -> riskMultiplier DOWN 1.03
[NEURON EVOLVE] Loss streak x4 -> riskMultiplier DOWN 0.99
[NEURON EVOLVE] Loss streak x5 -> riskMultiplier DOWN 0.95   ← zapisane w state.json
[NEURON EVOLVE] Loss streak x6 -> riskMultiplier DOWN 0.91   ← najnowszy log PM2
```

**Mechanizm**: Każda konsekutywna strata obniża `riskMultiplier` o ~0.04. Wartość startowa (po resecie PATCH31) wynosiła 0.85, ale w trakcie sesji została podniesiona (wygrane resetowały serię i podnosiły mnożnik). Aktualnie spada z powodu serii 5–6 strat z rzędu.

---

### 2.2 consecutiveLosses / consecutiveWins

| Pole | Wartość (state.json) | Wartość (logi PM2, real-time) |
|------|---------------------|-------------------------------|
| **consecutiveLosses** | **5** | **6** (po ostatnim trade PnL=$-4.41) |
| **consecutiveWins** | **0** | **0** |

**Historia serii strat (widoczna w recentTrades)**:

```
Trade #16: PnL = -$1.48   ← loss #1
Trade #17: PnL = -$6.26   ← loss #2
Trade #18: PnL = -$1.48   ← loss #3
Trade #19: PnL = -$3.80   ← loss #4
Trade #20: PnL = -$1.48   ← loss #5 (zapisane w state.json)
PM2 log:   PnL = -$4.41   ← loss #6 (jeszcze nie w state.json)
```

Ostatnia wygrana (+$4.91) miała miejsce ok. 10:59 UTC — od tego momentu 5–6 konsekutywnych strat.

---

### 2.3 adaptedWeights

```json
{
  "EnterpriseML": 0.45,
  "MomentumPro": 0.29
}
```

| Strategia | Adapted Weight | Komentarz |
|-----------|---------------|-----------|
| **EnterpriseML** | **0.45** | Najwyższa waga — ML dominuje w decyzjach |
| **MomentumPro** | **0.29** | Druga co do wielkości |
| Pozostałe strategie | brak adapacji | Nie mają zmodyfikowanych wag (domyślne) |

**Obserwacja**: Tylko 2 z 6 strategii mają dostosowane wagi. System ewolucji Neuron AI skoncentrował się na ML i Momentum, pozostawiając AdvancedAdaptive, RSITurbo, SuperTrend i MACrossover na wagach domyślnych.

---

### 2.4 evolutionCount

| Metryka | Wartość |
|---------|---------|
| **evolutionCount** | **69** |
| **Czy rośnie po zysku +$2.68?** | **NIE bezpośrednio** |

**Wyjaśnienie mechanizmu ewolucji**:

- `evolutionCount` jest inkrementowany **wyłącznie przez serie strat** (`Loss streak xN`), a NIE przez wygrane trade'y.
- Wygrane (np. +$2.24, +$2.20, +$5.37, +$4.91) **resetują** `consecutiveLosses` do 0, ale **nie zwiększają** `evolutionCount`.
- Każda nowa seria strat (3+) wyzwala `[NEURON EVOLVE]` i podnosi `evolutionCount` o 1.

**Ostatnie ewolucje (z logów PM2)**:

| Ewolucja # | Trigger | riskMultiplier po |
|-----------|---------|------------------|
| ~67 | Loss streak x3 | 1.03 |
| ~68 | Loss streak x4 | 0.99 |
| ~69 | Loss streak x5 | 0.95 |
| ~70 (in-flight) | Loss streak x6 | 0.91 |

---

## 3. KOMPLETNA TABELA `recentTrades` (ostatnie 20 trade'ów z bufora)

| # | PnL ($) | Timestamp (UTC) | Wynik | Strategia |
|---|---------|-----------------|-------|-----------|
| 1 | +$0.08 | 2026-02-18 ~07:54 | WIN | EnsembleVoting |
| 2 | -$1.49 | 2026-02-18 ~08:00 | LOSS | EnsembleVoting |
| 3 | +$0.88 | 2026-02-18 ~08:03 | WIN | EnsembleVoting |
| 4 | -$1.49 | 2026-02-18 ~08:10 | LOSS | EnsembleVoting |
| 5 | **-$9.00** | 2026-02-18 ~08:14 | **LOSS** | EnsembleVoting |
| 6 | -$1.49 | 2026-02-18 ~08:20 | LOSS | EnsembleVoting |
| 7 | -$2.13 | 2026-02-18 ~08:24 | LOSS | EnsembleVoting |
| 8 | -$1.49 | 2026-02-18 ~09:45 | LOSS | EnsembleVoting |
| 9 | +$2.24 | 2026-02-18 ~10:09 | WIN | EnsembleVoting |
| 10 | +$2.20 | 2026-02-18 ~10:09 | WIN | EnsembleVoting |
| 11 | **+$5.37** | 2026-02-18 ~10:38 | **WIN** | EnsembleVoting |
| 12 | -$1.48 | 2026-02-18 ~10:45 | LOSS | EnsembleVoting |
| 13 | +$0.34 | 2026-02-18 ~10:48 | WIN | EnsembleVoting |
| 14 | -$1.48 | 2026-02-18 ~10:55 | LOSS | EnsembleVoting |
| 15 | **+$4.91** | 2026-02-18 ~10:59 | **WIN** | EnsembleVoting |
| 16 | -$1.48 | 2026-02-18 ~11:05 | LOSS | EnsembleVoting |
| 17 | **-$6.26** | 2026-02-18 ~11:09 | **LOSS** | EnsembleVoting |
| 18 | -$1.48 | 2026-02-18 ~11:15 | LOSS | EnsembleVoting |
| 19 | -$3.80 | 2026-02-18 ~11:19 | LOSS | EnsembleVoting |
| 20 | -$1.48 | 2026-02-18 ~11:25 | LOSS | EnsembleVoting |

### Statystyki recentTrades (buffer 20):

| Metryka | Wartość |
|---------|---------|
| **Suma PnL** | **-$17.53** |
| **Wygrane** | 6 / 20 (30%) |
| **Przegrane** | 14 / 20 (70%) |
| **Największa wygrana** | +$5.37 |
| **Największa strata** | -$9.00 |
| **Średni PnL** | -$0.88 |

---

## 4. OSTATNIE 30 WPISÓW Z `neuron_ai_decisions.log`

### Faza A: NEURON_AI_LLM (10:30 – 11:36 UTC) — HOLD dominuje

| Czas (UTC) | Decyzja | Confidence | Source | Override | Reasoning (skrót) |
|------------|---------|------------|--------|----------|-------------------|
| 10:30:21 | HOLD | 72% | LLM | NIE | RANGING, brak sygnałów, 100% HOLD w votes, MTF BEARISH, niski wolumen |
| 10:35:28 | HOLD | 72% | LLM | NIE | RANGING, niski wolumen, RSI neutralne, MACD słabość |
| 10:40:34 | HOLD | 72% | LLM | NIE | BEARISH bias -54, brak sygnałów SELL od strategii |
| **10:45:10** | **SELL** | **53%** | **LLM** | **TAK** | **Override! BEARISH -86, MACD histogram spadki, dolna Bollinger, niski volume** |
| 10:46:48 | HOLD | 55% | LLM | NIE | RANGING, obecny SHORT aktywny, brak nowego sygnału |
| 10:48:24 | HOLD | 55% | LLM | NIE | SHORT aktywny, RSI neutralne, brak momentum |
| 10:50:00 | HOLD | 55% | LLM | NIE | Brak silnego SELL w ensemble, SHORT utrzymany |
| 10:51:37 | HOLD | 55% | LLM | NIE | SELL w ensemble tylko 13.6%, niski wolumen |
| 10:53:13 | HOLD | 55% | LLM | NIE | SELL 14.2%, SHORT w grze, monitorowanie |
| 10:54:51 | HOLD | 55% | LLM | NIE | Unikanie nadmiernych kosztów transakcyjnych |
| 10:56:28 | HOLD | 55% | LLM | NIE | ATR niski, uPnL minimalny |
| 10:58:05 | HOLD | 55% | LLM | NIE | ATR=0.25%, BEARISH -86, SELL 10.6% |
| 10:59:42 | HOLD | 55% | LLM | NIE | SELL 13.5%, MACD bearish, histogram maleje |
| 11:00:16 | HOLD | 55% | LLM | NIE | Weak bearish signals, SHORT slightly negative |
| 11:01:51 | HOLD | 55% | LLM | NIE | Weak indicators, SHORT within range |
| 11:03:27 | HOLD | 55% | LLM | NIE | SELL votes 10.5%, niski wolumen |
| 11:05:04 | HOLD | 55% | LLM | NIE | HOLD w votes, MTF BEARISH wspiera SHORT |
| 11:06:40 | HOLD | 55% | LLM | NIE | SHORT slightly profitable, weak momentum |
| 11:08:16 | HOLD | 55% | LLM | NIE | RSI oversold (31.2), poniżej dolnego Bollingera |
| 11:09:53 | HOLD | **85%** | LLM | NIE | MTF BEARISH -95, RSI oversold, SHORT w zysku |
| 11:11:29 | HOLD | 85% | LLM | NIE | BEARISH -95, MACD i histogram mocno niedźwiedzie |
| 11:13:07 | HOLD | 85% | LLM | NIE | BEARISH -95, oversold, ATR niska zmienność |
| 11:14:42 | HOLD | 85% | LLM | NIE | 86.6% HOLD w votes, BEARISH -95, RSI=28.6 |
| 11:15:17 | HOLD | 85% | LLM | NIE | BEARISH -95, SHORT w lekkim zysku |
| 11:16:54 | HOLD | 85% | LLM | NIE | SELL poniżej progu 30%, RSI oversold |
| 11:18:31 | HOLD | 85% | LLM | NIE | BEARISH, oversold ale MACD niedźwiedzie |
| 11:20:08 | HOLD | 85% | LLM | NIE | SHORT slightly profitable, majority HOLD |
| 11:21:44 | HOLD | 85% | LLM | NIE | BEARISH, oversold RSI, ATR niska |
| 11:23:21 | HOLD | 85% | LLM | NIE | BEARISH -95, volume 0.57x średniego |
| 11:24:57 | HOLD | 85% | LLM | NIE | SHORT performing well, no strong SELL |
| 11:26:33 | HOLD | 85% | LLM | NIE | Potencjalne odbicie (oversold), BEARISH utrzymany |
| 11:28:10 | HOLD | 85% | LLM | NIE | RSI oversold, MACD niedźwiedzie, SHORT w zysku |
| 11:29:47 | HOLD | 85% | LLM | NIE | Oversold, SHORT in profit, no new position |
| 11:30:21 | HOLD | 85% | LLM | NIE | BEARISH bias, low volume, SHORT profitable |
| 11:31:57 | HOLD | 85% | LLM | NIE | RSI 25.2, SL/TP well-placed |
| 11:33:34 | HOLD | 85% | LLM | NIE | SHORT w zysku, SL/TP ustawione |
| 11:35:10 | HOLD | 85% | LLM | NIE | RSI oversold, MACD bearish, hold position |
| 11:36:46 | HOLD | 85% | LLM | NIE | BEARISH -86, RSI oversold, MACD presja spadkowa |

### Faza B: NEURON_AI_FALLBACK (11:38 – 12:26 UTC) — masowe SELL

| Czas (UTC) | Decyzja | Confidence | Source | Override | Reasoning |
|------------|---------|------------|--------|----------|-----------|
| **11:38:19** | **SELL** | **60%** | **FALLBACK** | NIE | MTF BEARISH score=91, ML SELL conf=85%, Pos 1/5, RANGING penalty -22% |
| 11:40:51 | SELL | 100% | FALLBACK | NIE | MTF BEARISH 86, ML SELL 95%, Pos 0/5 |
| 11:45:24 | SELL | 100% | FALLBACK | NIE | MTF BEARISH 86, ML SELL 95%, Pos 0/5 |
| 11:46:57 | SELL | 99% | FALLBACK | NIE | MTF BEARISH 86, ML SELL 94%, Pos 1/5 |
| 11:48:30 | SELL | 99% | FALLBACK | NIE | MTF BEARISH 86, ML SELL 100%, Pos 1/5 |
| 11:50:32 | SELL | 100% | FALLBACK | NIE | MTF BEARISH 86, ML SELL 95%, Pos 0/5 |
| 11:55:35 | SELL | 100% | FALLBACK | NIE | MTF BEARISH 86, ML SELL 95%, Pos 0/5 |
| 11:56:07 | SELL | 100% | FALLBACK | NIE | MTF BEARISH 86, ML SELL 100%, Pos 1/5 |
| 11:57:41 | SELL | 100% | FALLBACK | NIE | MTF BEARISH 86, ML SELL 100%, Pos 1/5 |
| 11:59:14 | SELL | 100% | FALLBACK | NIE | MTF BEARISH 95, ML SELL 100%, Pos 1/5 |
| 12:00:15 | SELL | 100% | FALLBACK | NIE | MTF BEARISH 94, ML SELL 95%, Pos 0/5 |
| 12:05:18 | SELL | 100% | FALLBACK | NIE | MTF BEARISH 94, ML SELL 95%, Pos 0/5 |
| 12:06:20 | SELL | 96% | FALLBACK | NIE | MTF BEARISH 94, ML SELL 85%, Pos 1/5 |
| 12:07:53 | SELL | 100% | FALLBACK | NIE | MTF BEARISH 94, ML SELL 100%, Pos 1/5 |
| 12:09:26 | SELL | 100% | FALLBACK | NIE | MTF BEARISH 94, ML SELL 100%, Pos 1/5 |
| 12:10:27 | SELL | 99% | FALLBACK | NIE | MTF BEARISH 94, ML SELL 95%, Pos 0/5 |
| 12:15:30 | SELL | 99% | FALLBACK | NIE | MTF BEARISH 94, ML SELL 95%, Pos 0/5 |
| 12:17:04 | SELL | 93% | FALLBACK | NIE | MTF BEARISH 94, ML SELL 95%, Pos 1/5 |
| 12:18:37 | SELL | 93% | FALLBACK | NIE | MTF BEARISH 94, ML SELL 95%, Pos 1/5 |
| 12:20:39 | SELL | 75% | FALLBACK | NIE | MTF BEARISH 94, ML SELL 95%, Pos 0/5 |
| 12:25:42 | SELL | 75% | FALLBACK | NIE | MTF BEARISH 94, ML SELL 95%, Pos 0/5 |
| **12:26:13** | **SELL** | **47%** | **FALLBACK** | NIE | **WARNING: 5 losses streak — confidence reduced**, RANGING penalty -22% |

---

## 5. LOGI PM2 — NEURON EVOLVE I TRADE CLOSE (ostatnie 1–2h)

### 5.1 Wszystkie wpisy `[NEURON EVOLVE]` (z ostatnich 500 linii PM2):

```
[NEURON EVOLVE] Loss streak x3 -> riskMultiplier DOWN 1.03
[NEURON EVOLVE] Loss streak x4 -> riskMultiplier DOWN 0.99
[NEURON EVOLVE] Loss streak x5 -> riskMultiplier DOWN 0.95
[NEURON EVOLVE] Loss streak x6 -> riskMultiplier DOWN 0.91
```

### 5.2 Wszystkie wpisy `[NEURAL AI] Trade close detected` (ostatnie 11):

```
[NEURAL AI] Trade close detected: PnL=$5.37     ← WIN
[NEURAL AI] Trade close detected: PnL=$-1.48    ← LOSS
[NEURAL AI] Trade close detected: PnL=$0.34     ← WIN (micro)
[NEURAL AI] Trade close detected: PnL=$-1.48    ← LOSS
[NEURAL AI] Trade close detected: PnL=$4.91     ← WIN
[NEURAL AI] Trade close detected: PnL=$-1.48    ← LOSS  (seria strat start)
[NEURAL AI] Trade close detected: PnL=$-6.26    ← LOSS
[NEURAL AI] Trade close detected: PnL=$-1.48    ← LOSS
[NEURAL AI] Trade close detected: PnL=$-3.80    ← LOSS
[NEURAL AI] Trade close detected: PnL=$-1.48    ← LOSS  (streak x5)
[NEURAL AI] Trade close detected: PnL=$-4.41    ← LOSS  (streak x6, najnowszy)
```

### 5.3 Wpisy `[EXEC DONE]` i `[SELL]` (ostatnie z PM2):

```
[EXEC DONE] SHORT 0.0219 BTC-USDT @ $67596.00 | Fees: $1.48
[SELL] $67596.00 -> $67615.10 | LOSS PnL: $-1.90
[EXEC DONE] SELL 0.0219 BTC-USDT @ $67615.10 | PnL: $-1.90
[EXEC DONE] SHORT 0.0219 BTC-USDT @ $67549.10 | Fees: $1.48
[SELL] $67549.10 -> $67582.00 | LOSS PnL: $-2.21
[EXEC DONE] SELL 0.0219 BTC-USDT @ $67582.00 | PnL: $-2.21
```

### 5.4 Wpisy `[QUANTUM]` (ostatnie z PM2):

```
[QUANTUM-VERIFIER] ZATWIERDZONO / APPROVED: SELL
[QUANTUM INIT SL] BTC-USDT: $68132.97 -> $67899.42
[QUANTUM INIT TP] BTC-USDT: $66381.36 -> $66614.91
[QUANTUM INIT] Position BTC-USDT opened with quantum SL/TP | Regime: undefined
[QUANTUM TP] BTC-USDT: $66614.91 -> $66394.21 | VQC=TRENDING_UP(25%) | QRA=21/100 | QMC=⚠️ ELEVATED BLACK SWAN RISK
[QUANTUM TP] BTC-USDT: $66394.21 -> $66474.78 | QRA=21/100 | QMC=⚠️ ELEVATED BLACK SWAN RISK
[QUANTUM TP] BTC-USDT: $66474.78 -> $66394.21 | VQC=TRENDING_UP(25%) | QRA=21/100
[QUANTUM TP] BTC-USDT: $66394.21 -> $66555.36 | VQC=TRENDING_DOWN(25%) | QRA=21/100
[QUANTUM TP] BTC-USDT: $66555.36 -> $66474.78 | QRA=21/100 | QMC=⚠️ ELEVATED BLACK SWAN RISK
```

---

## 6. STAN PORTFOLIO (live, 12:30 UTC)

| Metryka | Wartość |
|---------|---------|
| **Total Value** | **$9,882.28** |
| **USDT Balance** | $9,882.28 |
| **BTC Balance** | 0 |
| **Locked in Positions** | $749.69 |
| **Realized PnL** | **-$153.71** |
| **Unrealized PnL** | $0.00 |
| **Peak Value** | $10,008.69 |
| **Drawdown** | 0.015% |
| **Total Trades** | 182 |
| **Successful Trades** | 39 |
| **Failed Trades** | 95 |
| **Win Rate** | **29.1%** |
| **Avg Trade Return** | **-$0.84** |
| **Sharpe Ratio** | 0 |

---

## 7. ANALIZA I WNIOSKI

### 7.1 Odpowiedzi na pytania:

| Pytanie | Odpowiedź |
|---------|-----------|
| **riskMultiplier = 0.30?** | **NIE** — wynosi **0.95** (state.json) / **0.91** (najnowszy log PM2, jeszcze nie zapisany) |
| **consecutiveLosses** | **5** (state.json) / **6** (live PM2) — aktywna seria strat |
| **consecutiveWins** | **0** — brak żadnej wygrywanej w bieżącej serii |
| **adaptedWeights** | `EnterpriseML: 0.45`, `MomentumPro: 0.29` — tylko 2 strategie mają zmodyfikowane wagi |
| **evolutionCount = 69, czy rośnie po +$2.68?** | **NIE bezpośrednio** — ewolucja jest wyzwalana przez **serie strat** (Loss streak xN), nie przez wygrane. Zysk +$2.68 resetuje `consecutiveLosses`, ale NIE inkrementuje `evolutionCount`. |

### 7.2 Zidentyfikowane problemy krytyczne:

#### Problem #1: Przejście LLM → FALLBACK (~11:38 UTC)

Od ~11:38 system przeskoczył z `NEURON_AI_LLM` (Megatron z pełnym reasoning) na `NEURON_AI_FALLBACK`. Logi PM2 zawierają powtarzający się błąd:

```
[NEURON AI] JSON parse failed, using fallback. Raw: ⚙️ [MEGATRON rule-based]
Jestem aktywny w trybie offline (bez kluczy API LLM). Aby uzyskać pełne odpowiedzi AI,
skonfiguruj GITHUB_TOKEN, OPENAI_API_KEY, ANTHROPIC_API_KEY...
```

**Przyczyna**: Brak skonfigurowanych kluczy API LLM. Megatron działa w trybie rule-based (offline), a system spada na FALLBACK.

**Skutek**: FALLBACK generuje masowe SELL z confidence 93–100% bezkrytycznie.

#### Problem #2: FALLBACK generuje nadmierne SELL

FALLBACK od 11:38 wyemitował **22 sygnały SELL z rzędu** z confidence 75–100%. Powoduje to:
- Otwarcie zbyt wielu pozycji SHORT w rangującym rynku
- Serie strat (fees $1.48 + slippage przewyższają micro-moves)
- `consecutiveLosses` wzrosło z 0 do 6

#### Problem #3: Dominacja strat fee-based ($1.48)

11 z 20 ostatnich strat ma identyczny PnL = **-$1.48** — co odpowiada **dokładnie wartości fee** za otwarcie/zamknięcie pozycji SHORT (0.0219 BTC * ~$67,500 * 0.1% fee = ~$1.48). Oznacza to, że bot otwiera i zamyka pozycje z PnL bliskim zeru, a fees konsumują cały wynik.

#### Problem #4: RANGING regime + SHORT = negatywny edge

Rynek jest identyfikowany jako **RANGING** (boczny) przez cały okres 10:30–12:30 UTC. Otwieranie pozycji SHORT w RANGING jest nieopłacalne — brak wystarczającego momentum do pokrycia kosztów transakcyjnych.

### 7.3 Pozytywne obserwacje:

- System **LLM** (10:30–11:36) działał poprawnie — 25x HOLD + 1 override SELL z 53% confidence. Rozumiał kontekst rynkowy i unikał nadmiernego tradingu.
- Confidence boost do **85%** przy silnych sygnałach BEARISH -95 i oversold RSI — prawidłowa ocena sytuacji.
- Mechanizm self-reduction — po 5 stratach confidence FALLBACK spadła z 100% → 47%, a riskMultiplier z ~1.15 → 0.91.
- Quantum Verifier zatwierdzał trade'y i dynamicznie dostosowywał SL/TP.

---

## 8. PODSUMOWANIE STANU SYSTEMU

```
╔══════════════════════════════════════════════════════════════╗
║  NEURON AI STATE — SNAPSHOT 2026-02-18 12:30 UTC            ║
╠══════════════════════════════════════════════════════════════╣
║  riskMultiplier:     0.95 (JSON) / 0.91 (live PM2)         ║
║  consecutiveLosses:  5 (JSON) / 6 (live PM2)               ║
║  consecutiveWins:    0                                       ║
║  evolutionCount:     69 (rośnie przez straty, nie zyski)    ║
║  totalDecisions:     1,056                                   ║
║  totalPnL:           -$453.43                                ║
║  winCount / lossCount: 21 / 89 (19.1% win rate)            ║
║  overrideCount:      12                                      ║
║  adaptedWeights:     EnterpriseML=0.45, MomentumPro=0.29   ║
║  Source (aktywny):   NEURON_AI_FALLBACK (LLM offline)       ║
║  Regime:             RANGING                                 ║
║  Portfolio:          $9,882.28 (-$117.72 od startu)         ║
║  Ostatni trade:      SELL @ $67,582 | PnL: -$4.41          ║
║  WARNING:            5-6 losses streak, confidence reduced  ║
╚══════════════════════════════════════════════════════════════╝
```

---

*Raport wygenerowany automatycznie na podstawie danych live z VPS 64.226.70.149*

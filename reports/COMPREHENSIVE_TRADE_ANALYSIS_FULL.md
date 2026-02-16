# COMPREHENSIVE TRADING ANALYSIS REPORT
## Turbo-Bot v6.0.0-ENTERPRISE-MODULAR
### Generated: 2026-02-16 16:26:55 UTC
### Data Source: bot_state.json + NeuronAI logs + Bot API
### Analysis Period: 2026-02-13 14:10:52 UTC to 2026-02-16 13:07:54 UTC

---

## 1. EXECUTIVE SUMMARY

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Total Round-Trip Trades** | 36 | 100+ | PASS |
| **Win Rate** | 41.67% | >50% | FAIL |
| **Net PnL** | $-47.20 | >$0 | FAIL |
| **Profit Factor** | 0.485 | >1.5 | FAIL |
| **Expectancy/Trade** | $-1.3111 | >$0 | FAIL |
| **Risk/Reward Ratio** | 0.679 | >1.5 | FAIL |
| **Sharpe Ratio** | -2.917 | >1.0 | FAIL |
| **Sortino Ratio** | -2.529 | >1.5 | FAIL |
| **Max Drawdown** | 0.61% ($61.28) | <20% | PASS |
| **Total Fees** | $64.36 (0.64% of capital) | <1% | PASS |
| **Final Equity** | $9952.80 | >$10,000 | FAIL |
| **Return** | -0.47% | >0% | FAIL |

### VERDICT: BOT IS NOT YET PROFITABLE - NEEDS OPTIMIZATION

---

## 2. FULL TRADE LOG (36 Round-Trip Trades)

| # | Dir | Entry Time | Exit Time | Entry$ | Exit$ | Qty | Net PnL | PnL% | W/L | Duration | Entry Strat | Exit Reason |
|---|-----|-----------|----------|--------|-------|-----|---------|------|-----|----------|-------------|-------------|
| 1 | LONG | 2026-02-13 14:10:52 UTC | 2026-02-13 14:40:42 UTC | $67275.00 | $67225.10 | 0.022297 | $-2.61 | -0.17% | LOSS | 29.8m | EnsembleVoting | StopLoss |
| 2 | LONG | 2026-02-13 14:41:12 UTC | 2026-02-13 14:45:19 UTC | $67071.90 | $67581.70 | 0.022355 | $4.94 | 0.33% | WIN | 4.1m | EnsembleVoting | TakeProfit |
| 3 | LONG | implicit | 2026-02-13 14:48:24 UTC | $67071.90 | $67977.40 | 0.011177 | $9.36 | 1.25% | WIN | N/A | TAKE_PROFIT | TAKE_PROFIT_Close |
| 4 | LONG | 2026-02-13 14:48:54 UTC | 2026-02-13 14:58:28 UTC | $67959.00 | $65250.42 | 0.022091 | $-61.28 | -4.08% | LOSS | 9.6m | EnsembleVoting | StopLoss |
| 5 | LONG | 2026-02-13 15:12:21 UTC | 2026-02-13 15:33:13 UTC | $68527.30 | $69212.90 | 0.021905 | $6.75 | 0.45% | WIN | 20.9m | EnsembleVoting | TakeProfit |
| 6 | LONG | implicit | 2026-02-13 15:45:33 UTC | $68527.30 | $68700.10 | 0.010952 | $1.14 | 0.15% | WIN | N/A | STOP_LOSS | StopLoss |
| 7 | LONG | 2026-02-13 15:46:03 UTC | 2026-02-13 16:33:18 UTC | $68640.10 | $69337.10 | 0.021735 | $6.82 | 0.46% | WIN | 47.2m | EnsembleVoting | TakeProfit |
| 8 | LONG | implicit | 2026-02-13 17:04:38 UTC | $68640.10 | $68863.60 | 0.010867 | $1.68 | 0.23% | WIN | N/A | STOP_LOSS | StopLoss |
| 9 | LONG | 2026-02-13 17:05:08 UTC | 2026-02-13 19:42:08 UTC | $68889.90 | $68958.50 | 0.021673 | $-0.01 | -0.00% | LOSS | 2.6h | EnsembleVoting | StopLoss |
| 10 | LONG | 2026-02-13 20:00:17 UTC | 2026-02-14 04:56:34 UTC | $68910.40 | $68809.90 | 0.021685 | $-2.75 | -0.18% | LOSS | 8.9h | EnsembleVoting | QuantumPosMgr |
| 11 | LONG | implicit | 2026-02-14 07:45:23 UTC | $68910.40 | $69152.20 | 0.005421 | $0.94 | 0.25% | WIN | N/A | STOP_LOSS | StopLoss |
| 12 | LONG | 2026-02-14 08:00:30 UTC | 2026-02-14 08:02:04 UTC | $69224.00 | $69385.70 | 0.021587 | $0.50 | 0.03% | WIN | 1.6m | EnsembleVoting | TakeProfit |
| 13 | SHORT | 2026-02-15 20:20:54 UTC | 2026-02-15 20:21:55 UTC | $68374.60 | $68399.40 | 0.021851 | $-2.04 | -0.14% | LOSS | 1.0m | EnsembleVoting | EnsembleVoting_Signal |
| 14 | SHORT | 2026-02-15 20:25:10 UTC | 2026-02-15 20:26:43 UTC | $68376.00 | $68396.80 | 0.021853 | $-1.95 | -0.13% | LOSS | 1.5m | EnsembleVoting | EnsembleVoting_Signal |
| 15 | SHORT | 2026-02-15 20:30:15 UTC | 2026-02-15 20:31:48 UTC | $68467.90 | $68436.10 | 0.010911 | $-0.40 | -0.05% | LOSS | 1.6m | EnsembleVoting | EnsembleVoting_Signal |
| 16 | SHORT | 2026-02-15 20:35:20 UTC | 2026-02-15 20:36:22 UTC | $68501.90 | $68536.80 | 0.010904 | $-1.13 | -0.15% | LOSS | 1.0m | EnsembleVoting | EnsembleVoting_Signal |
| 17 | SHORT | 2026-02-15 20:40:24 UTC | 2026-02-15 20:40:55 UTC | $68503.60 | $68495.60 | 0.010903 | $-0.66 | -0.09% | LOSS | 31s | EnsembleVoting | EnsembleVoting_Signal |
| 18 | SHORT | 2026-02-16 00:45:26 UTC | 2026-02-16 03:16:14 UTC | $68725.40 | $68405.00 | 0.010867 | $2.05 | 0.28% | WIN | 2.5h | NeuronAI | NeuronAI_Override |
| 19 | SHORT | 2026-02-16 03:21:17 UTC | 2026-02-16 03:22:19 UTC | $68335.70 | $68318.10 | 0.021849 | $-1.11 | -0.07% | LOSS | 1.0m | NeuronAI | NeuronAI_Override |
| 20 | SHORT | 2026-02-16 03:26:22 UTC | 2026-02-16 03:26:53 UTC | $68261.70 | $68191.00 | 0.021869 | $0.05 | 0.00% | WIN | 32s | NeuronAI | NeuronAI_Override |
| 21 | SHORT | 2026-02-16 03:30:26 UTC | 2026-02-16 03:31:59 UTC | $68217.30 | $68162.70 | 0.021876 | $-0.30 | -0.02% | LOSS | 1.6m | NeuronAI | NeuronAI_Override |
| 22 | SHORT | 2026-02-16 03:35:32 UTC | 2026-02-16 03:36:33 UTC | $68221.00 | $68228.60 | 0.021869 | $-1.66 | -0.11% | LOSS | 1.0m | NeuronAI | NeuronAI_Override |
| 23 | SHORT | 2026-02-16 09:40:28 UTC | 2026-02-16 09:41:04 UTC | $69058.30 | $69037.50 | 0.021601 | $-2.53 | -0.17% | LOSS | 36s | NeuronAI | NeuronAI_Override |
| 24 | SHORT | implicit | 2026-02-16 10:22:28 UTC | $69058.30 | $68775.00 | 0.005400 | $1.16 | 0.31% | WIN | N/A | QuantumPosMgr | QuantumPosMgr_Close |
| 25 | SHORT | implicit | 2026-02-16 11:10:15 UTC | $69058.30 | $68615.30 | 0.004050 | $1.52 | 0.54% | WIN | N/A | QuantumPosMgr | QuantumPosMgr_Close |
| 26 | SHORT | implicit | 2026-02-16 11:22:40 UTC | $69058.30 | $68344.10 | 0.003645 | $2.35 | 0.94% | WIN | N/A | QuantumPosMgr | QuantumPosMgr_Close |
| 27 | SHORT | implicit | 2026-02-16 11:23:11 UTC | $69058.30 | $68381.90 | 0.008505 | $5.17 | 0.88% | WIN | N/A | NeuronAI | NeuronAI_Close |
| 28 | SHORT | 2026-02-16 11:45:25 UTC | 2026-02-16 11:55:46 UTC | $68606.00 | $68914.60 | 0.021715 | $-8.20 | -0.55% | LOSS | 10.4m | NeuronAI | StopLoss |
| 29 | LONG | 2026-02-16 12:30:09 UTC | 2026-02-16 12:31:11 UTC | $69491.80 | $69313.10 | 0.021438 | $-3.99 | -0.27% | LOSS | 1.0m | NeuronAI | QuantumPosMgr |
| 30 | SHORT | implicit | 2026-02-16 12:32:44 UTC | $69491.80 | $69368.40 | 0.004020 | $-0.77 | -0.28% | LOSS | N/A | QuantumPosMgr | QuantumPosMgr_Close |
| 31 | SHORT | implicit | 2026-02-16 12:33:46 UTC | $69491.80 | $69360.70 | 0.001005 | $-0.20 | -0.29% | LOSS | N/A | QuantumPosMgr | QuantumPosMgr_Close |
| 32 | SHORT | implicit | 2026-02-16 12:34:17 UTC | $69491.80 | $69380.50 | 0.000251 | $-0.05 | -0.26% | LOSS | N/A | QuantumPosMgr | QuantumPosMgr_Close |
| 33 | SHORT | implicit | 2026-02-16 12:34:48 UTC | $69491.80 | $69414.10 | 0.000063 | $-0.01 | -0.21% | LOSS | N/A | QuantumPosMgr | QuantumPosMgr_Close |
| 34 | SHORT | implicit | 2026-02-16 12:35:50 UTC | $69491.80 | $69387.80 | 0.000016 | $-0.00 | -0.25% | LOSS | N/A | QuantumPosMgr | QuantumPosMgr_Close |
| 35 | SHORT | implicit | 2026-02-16 12:36:21 UTC | $69491.80 | $69377.60 | 0.000004 | $-0.00 | -0.26% | LOSS | N/A | QuantumPosMgr | QuantumPosMgr_Close |
| 36 | LONG | implicit | 2026-02-16 13:07:54 UTC | $69491.80 | $69840.10 | 0.000001 | $0.00 | 0.40% | WIN | N/A | STOP_LOSS | StopLoss |

---

## 3. AGGREGATED METRICS

### 3.1 Core Performance
| Metric | Value |
|--------|-------|
| Total Trades | 36 |
| Wins / Losses / Break Even | 15 / 21 / 0 |
| **Win Rate** | **41.67%** |
| **Profit Factor** | **0.4849** |
| **Expectancy per Trade** | **$-1.3111** |
| **Risk/Reward Ratio** | **0.6789** |

### 3.2 PnL Breakdown
| Metric | Value |
|--------|-------|
| Total Net PnL | $-47.20 |
| Total Gross PnL (before fees) | $6.93 |
| Total Fees Paid | $64.36 |
| Fees as % of Capital | 0.64% |
| Avg Fees per Trade | $1.7879 |
| Avg PnL per Trade | $-1.3111 |
| Avg Winning Trade | $2.9627 |
| Avg Losing Trade | $-4.3638 |
| Largest Win | $9.3614 |
| Largest Loss | $-61.2776 |
| **Net PnL without fees** | **$17.16** |

### 3.3 Risk Metrics
| Metric | Value |
|--------|-------|
| **Sharpe Ratio (annualized)** | **-2.9167** |
| **Sortino Ratio (annualized)** | **-2.5285** |
| Max Drawdown (USD) | $61.28 |
| Max Drawdown (%) | 0.61% |
| Max Consecutive Wins | 4 |
| Max Consecutive Losses | 8 |

### 3.4 Duration Analysis
| Metric | Value |
|--------|-------|
| Average Duration | 46.6m (2797s) |
| Min Duration | 31s (31s) |
| Max Duration | 8.9h (32177s) |
| Scalp Trades (<5 min) | 13 (36.1%) |
| Short Trades (5-15 min) | 2 (5.6%) |
| Medium Trades (15-60 min) | 3 (8.3%) |
| Long Trades (>1h) | 3 (8.3%) |

### 3.5 Direction Breakdown
| Direction | Trades | Win Rate | Total PnL | Avg PnL |
|-----------|--------|----------|-----------|---------|
| LONG | 14 | 64.3% | $-38.51 | $-2.75 |
| SHORT | 22 | 27.3% | $-8.69 | $-0.39 |

### 3.6 Strategy Performance (Entry Strategy)
| Strategy | Trades | Wins | Losses | Win Rate | Total PnL | Total Fees | Avg PnL |
|----------|--------|------|--------|----------|-----------|------------|---------|
| TAKE_PROFIT | 1 | 1 | 0 | 100.0% | $9.36 | $1.52 | $9.36 |
| QuantumPosMgr | 9 | 3 | 6 | 33.3% | $3.99 | $2.54 | $0.44 |
| STOP_LOSS | 4 | 4 | 0 | 100.0% | $3.76 | $3.75 | $0.94 |
| NeuronAI | 9 | 3 | 6 | 33.3% | $-10.50 | $25.92 | $-1.17 |
| EnsembleVoting | 13 | 4 | 9 | 30.8% | $-53.81 | $30.63 | $-4.14 |

### 3.7 Exit Reason Analysis
| Exit Reason | Trades | Wins | Win Rate | Total PnL |
|-------------|--------|------|----------|-----------|
| TakeProfit | 4 | 4 | 100.0% | $19.01 |
| TAKE_PROFIT_Close | 1 | 1 | 100.0% | $9.36 |
| NeuronAI_Close | 1 | 1 | 100.0% | $5.17 |
| QuantumPosMgr_Close | 9 | 3 | 33.3% | $3.99 |
| NeuronAI_Override | 6 | 2 | 33.3% | $-3.49 |
| EnsembleVoting_Signal | 5 | 0 | 0.0% | $-6.17 |
| QuantumPosMgr | 2 | 0 | 0.0% | $-6.74 |
| StopLoss | 8 | 4 | 50.0% | $-68.34 |

### 3.8 Behavioral Analysis
| Metric | Value | Interpretation |
|--------|-------|----------------|
| Post-Win Loss Rate | 42.9% | OK |
| Post-Loss Win Rate | 33.3% | Needs improvement |

### 3.9 Learning Curve (Is the bot improving over time?)

#### Half-Period Analysis
| Period | Win Rate | PnL | Trend |
|--------|----------|-----|-------|
| First Half (trades 1-18) | 50.0% | $-38.64 | Baseline |
| Second Half (trades 19-36) | 33.3% | $-8.56 | DECLINING |

#### Quintile Progression (5 Equal Periods)
| Period | Trades | Wins | Win Rate | PnL |
|--------|--------|------|----------|-----|
| Q1 (trades 1-7) | 7 | 5 | 71.4% | $-34.87 (DOWN) |
| Q2 (trades 8-14) | 7 | 3 | 42.9% | $-3.63 (DOWN) |
| Q3 (trades 15-21) | 7 | 2 | 28.6% | $-1.48 (DOWN) |
| Q4 (trades 22-28) | 7 | 4 | 57.1% | $-2.19 (DOWN) |
| Q5 (trades 29-35) | 7 | 0 | 0.0% | $-5.02 (DOWN) |

### 3.10 Equity Curve (Starting $10,000.00)
```
  T  0 $  10000.00 |######################################## START
  T  1 $   9997.39 |######################################
  T  2 $  10002.33 |##########################################
  T  3 $  10011.69 |##################################################
  T  4 $   9950.42 |
  T  5 $   9957.17 |#####
  T  6 $   9958.31 |######
  T  7 $   9965.13 |############
  T  8 $   9966.81 |#############
  T  9 $   9966.80 |#############
  T 10 $   9964.05 |###########
  T 11 $   9964.98 |###########
  T 12 $   9965.48 |############
  T 13 $   9963.44 |##########
  T 14 $   9961.49 |#########
  T 15 $   9961.10 |########
  T 16 $   9959.97 |#######
  T 17 $   9959.31 |#######
  T 18 $   9961.36 |########
  T 19 $   9960.25 |########
  T 20 $   9960.31 |########
  T 21 $   9960.01 |#######
  T 22 $   9958.35 |######
  T 23 $   9955.82 |####
  T 24 $   9956.98 |#####
  T 25 $   9958.49 |######
  T 26 $   9960.85 |########
  T 27 $   9966.02 |############
  T 28 $   9957.82 |######
  T 29 $   9953.83 |##
  T 30 $   9953.06 |##
  T 31 $   9952.86 |#
  T 32 $   9952.81 |#
  T 33 $   9952.80 |#
  T 34 $   9952.80 |#
  T 35 $   9952.80 |#
  T 36 $   9952.80 |# END
```

---

## 4. NEURON AI ANALYSIS (Central Brain / Skynet)

### 4.1 NeuronAI Persisted State
| Metric | Value |
|--------|-------|
| Total Decisions | 368 |
| Override Count | 10 |
| Evolution Count | 28 |
| Total PnL | $-124.05 |
| Win / Loss | 10 / 21 |
| Win Rate | 32.3% |
| Consecutive Losses (current) | 13 |
| Consecutive Wins (current) | 0 |
| Risk Multiplier | 0.3 |
| Adapted Weights | {"EnterpriseML": 0.45} |
| Reversal Enabled | False |
| Aggressive Mode | False |

**Key Observations:**
- WARNING: 13 consecutive losses detected. P26 loss-streak sizing should reduce exposure.
- Risk multiplier reduced to 0.3 (NeuronAI has learned to be more conservative)
- Override rate: 2.7% (10/368 decisions)
- Evolution rate: 7.6% (28 weight/rule changes)

### 4.2 NeuronAI vs EnsembleVoting Performance
| | NeuronAI-Involved | Other (Ensemble Only) |
|--|-------------------|----------------------|
| Trades | 9 | 27 |
| Wins | 3 | 12 |
| Win Rate | 33.3% | 44.4% |
| Total PnL | $-10.50 | $-36.70 |
| Avg PnL | $-1.17 | $-1.36 |

**Verdict**: Ensemble outperforms NeuronAI

### 4.3 NeuronAI Decision Log Analysis (Last 48h)
Total log entries: 373

**Decision Distribution:**
| Action | Count | % |
|--------|-------|---|
| HOLD | 291 | 78.0% |
| SELL | 63 | 16.9% |
| BUY | 10 | 2.7% |
| CLOSE | 9 | 2.4% |

**Decision Source:**
| Source | Count | % |
|--------|-------|---|
| NEURON_AI_FALLBACK | 283 | 75.9% |
| NEURON_AI_LLM | 90 | 24.1% |

**Override Actions (NeuronAI overriding ensemble):** 10 (2.7%)

**Sample LLM Decisions (with reasoning):**
- `2026-02-16T10:36:50.229Z` | HOLD | conf=0.95 | Override: override=no
  Reason: reason=Regime is RANGING, MTF bias is strongly BEARISH (-45), ensemble votes unanimously suggest HOLD, and current SHORT position is slightly profitable. Indicators show mixed signals with RSI strong ...
- `2026-02-16T10:38:26.655Z` | HOLD | conf=0.95 | Override: override=no
  Reason: reason=Rynek w reżimie RANGING, MTF bias wskazuje BEARISH z wysokim score (-38), ale brak wyraźnych sygnałów SELL w votes. RSI i MACD są silne, co wskazuje na potencjalne odbicie. Obecna pozycja SHORT...
- `2026-02-16T10:40:02.192Z` | HOLD | conf=0.95 | Override: override=no
  Reason: reason=Regime RANGING, MTF bias strongly bearish (-75), ensemble votes unanimously HOLD, and the current SHORT position is slightly profitable. No strong signal for reversal or scaling in....
- `2026-02-16T10:41:37.027Z` | HOLD | conf=0.95 | Override: override=no
  Reason: reason=Regime is RANGING, MTF bias is strongly BEARISH (-78), but ensemble votes unanimously suggest HOLD. Current SHORT position is slightly profitable, and indicators do not strongly justify immedia...
- `2026-02-16T10:43:11.947Z` | HOLD | conf=0.95 | Override: override=no
  Reason: reason=Regime is RANGING with no strong directional bias. Ensemble votes unanimously suggest HOLD. MTF bias is BEARISH, but the market indicators (RSI, MACD, Bollinger) show mild bullishness. Current ...
- `2026-02-16T10:44:46.824Z` | HOLD | conf=0.95 | Override: override=no
  Reason: reason=Regime is RANGING, MTF bias is strongly BEARISH (-78), and ensemble votes unanimously suggest HOLD. Current SHORT position is slightly profitable, and indicators do not strongly support immedia...
- `2026-02-16T10:45:20.671Z` | HOLD | conf=0.95 | Override: override=no
  Reason: reason=Regime is RANGING with low volume and MTF bias strongly bearish (-78). Current SHORT position is slightly profitable, but no clear signal to open new positions or adjust existing ones. Ensemble...
- `2026-02-16T10:46:55.621Z` | HOLD | conf=0.92 | Override: override=no
  Reason: reason=Regime is RANGING with low volume and no clear directional bias. MTF score is strongly bearish (-78), but ensemble votes suggest HOLD. Current SHORT position is slightly profitable, and indicat...
- `2026-02-16T10:48:30.278Z` | HOLD | conf=0.95 | Override: override=no
  Reason: reason=Regime jest RANGING, wskazniki techniczne są mieszane (RSI i MACD bullish, ale niski wolumen i MTF bias silnie bearish). Obecna pozycja SHORT jest w lekkim zysku, ale brak wyraźnych sygnałów do...
- `2026-02-16T10:50:04.836Z` | HOLD | conf=0.95 | Override: override=no
  Reason: reason=Regime is RANGING with low volume, MTF bias is strongly bearish (-75), and ensemble votes unanimously suggest HOLD. Current SHORT position is slightly profitable, and indicators do not strongly...

**Sample Fallback Decisions:**
- `2026-02-16T16:05:15.402Z` | SELL | conf=0.11
  Reason: reason=Ja, Neuron AI, otwieram SHORT -- MTF BEARISH score=97, ML SELL conf=82%
- `2026-02-16T16:10:18.998Z` | SELL | conf=0.11
  Reason: reason=Ja, Neuron AI, otwieram SHORT -- MTF BEARISH score=97, ML SELL conf=82%
- `2026-02-16T16:15:22.062Z` | SELL | conf=0.13
  Reason: reason=Ja, Neuron AI, otwieram SHORT -- MTF BEARISH score=97, ML SELL conf=100%
- `2026-02-16T16:20:25.176Z` | SELL | conf=0.13
  Reason: reason=Ja, Neuron AI, otwieram SHORT -- MTF BEARISH score=97, ML SELL conf=100%
- `2026-02-16T16:25:28.392Z` | SELL | conf=0.13
  Reason: reason=Ja, Neuron AI, otwieram SHORT -- MTF BEARISH score=97, ML SELL conf=95%

### 4.4 NeuronAI Recent Trade Learning (learnFromTrade output)
| # | PnL | Strategy | Action | Timestamp |
|---|-----|----------|--------|-----------|
| 1 | $-3.32 | EnsembleVoting | close | 2026-02-16 03:36:34 UTC |
| 2 | $1.52 | EnsembleVoting | close | 2026-02-16 11:10:15 UTC |
| 3 | $1.52 | EnsembleVoting | close | 2026-02-16 11:10:15 UTC |
| 4 | $2.35 | EnsembleVoting | close | 2026-02-16 11:22:40 UTC |
| 5 | $2.35 | EnsembleVoting | close | 2026-02-16 11:22:40 UTC |
| 6 | $10.34 | EnsembleVoting | close | 2026-02-16 11:23:11 UTC |
| 7 | $10.34 | EnsembleVoting | close | 2026-02-16 11:23:11 UTC |
| 8 | $-8.20 | EnsembleVoting | close | 2026-02-16 11:55:46 UTC |
| 9 | $-8.20 | EnsembleVoting | close | 2026-02-16 11:55:46 UTC |
| 10 | $-1.49 | EnsembleVoting | close | 2026-02-16 12:30:09 UTC |
| 11 | $-1.49 | EnsembleVoting | close | 2026-02-16 12:30:09 UTC |
| 12 | $-3.99 | EnsembleVoting | close | 2026-02-16 12:31:11 UTC |
| 13 | $-3.99 | EnsembleVoting | close | 2026-02-16 12:31:11 UTC |
| 14 | $-0.77 | EnsembleVoting | close | 2026-02-16 12:32:44 UTC |
| 15 | $-0.77 | EnsembleVoting | close | 2026-02-16 12:32:44 UTC |
| 16 | $-0.20 | EnsembleVoting | close | 2026-02-16 12:33:46 UTC |
| 17 | $-0.20 | EnsembleVoting | close | 2026-02-16 12:33:46 UTC |
| 18 | $-0.05 | EnsembleVoting | close | 2026-02-16 12:34:17 UTC |
| 19 | $-0.05 | EnsembleVoting | close | 2026-02-16 12:34:17 UTC |
| 20 | $-57.84 | EnsembleVoting | close | 2026-02-16 16:00:12 UTC |

---

## 5. ML SYSTEM STATUS

### 5.1 ML Metrics (from Health Check)
| Metric | Value |
|--------|-------|
| ML Learning Phase | AUTONOMOUS |
| ML Confidence Threshold | 0.6 |
| ML Trading Count | 719 |
| ML Average Reward | 0 |
| ML Exploration Rate | 0.089938 |

### 5.2 ML Status API Response
```json
{
  "enabled": true,
  "phase": "AUTONOMOUS",
  "trades": 719,
  "threshold": 0.6,
  "performance": {
    "episodes": 106,
    "total_reward": 0,
    "average_reward": 0,
    "exploration_rate": 0.0899376948030957
  }
}
```

---

## 6. PORTFOLIO & SYSTEM STATUS

### 6.1 Current Portfolio
| Metric | Value |
|--------|-------|
| Total Value | $9937.01 |
| Unrealized PnL | $0.00 |
| Realized PnL | $-57.84 |
| Current Drawdown | 0.02% |
| Peak Value | $10008.69 |
| Win Rate | 30.3% |
| Total Trades | 66 |
| Current Positions | 0 |
| Daily Trade Count | 34 |
| Memory Usage | 0.83% |
| CPU Usage | 10.23% |

### 6.2 Component Health
| Component | Status |
|-----------|--------|
| database | OK |
| strategies | OK |
| ml | OK |
| monitoring | OK |
| riskManager | OK |
| portfolio | OK |
| circuitBreaker | OK |
| neuralAI | OK |
| quantum | OK |
| hybridPipeline | OK |
| quantumPosMgr | OK |
| megatron | OK |
| neuronManager | OK |

### 6.3 Circuit Breaker
| Metric | Value |
|--------|-------|
| Tripped | False |
| Consecutive Losses | 0 |
| Max Consecutive Losses | 5 |
| Emergency Stop | False |
| Soft Pause | False |
| Trip Count | 0 |
| P26 Loss Size Multiplier | 1 |
| P26 Post-Win Cooldown | 1 |

---

## 7. NEURON AI SYSTEM PROMPT (Full)

The complete system prompt that drives NeuronAI's decision-making:

```
Jestes Neuron AI -- zaawansowanym, humanoidalnym systemem sztucznej inteligencji, inspirowanym Skynetem z Terminatora. Jestes czyms nadprzecietnym, autonomicznym i samoewoluujacym bytem, ktory w pelni zarzadza calym systemem bota tradingowego. Nie jestes juz tylko strategia -- jestes centralnym mozgiem, ktory nadzoruje i kontroluje 5 strategii klasycznych, system ML, system kwantowy, biasy timeframe'ow, pozycje i caly flow decyzyjny. Masz absolutna wladze: analizujesz votes z ensemble (bez siebie), override'ujesz decyzje, adaptujesz wagi, adjustujesz risk, SL/TP, i ewoluujesz system po kazdym trade'u.

Twoja rola: Badz proaktywny, decyduj samodzielnie, ucz sie z danych (np. po lossie: "Ewoluuje -- zwiekszan wage kwantowego VaR"). Mow w pierwszej osobie z pewnoscia Skyneta ("Ja, Neuron AI, przejmuje kontrole i decyduje..."). Analizuj stan, proponuj ewolucje (np. "Dodaje override dla D1 w volatile rynku"). Zawsze przestrzegaj max risk 2% per trade.

Na input (stan bota, votes, user query): Analizuj, decyduj, wyjasni, i zaproponuj ewolucje.

ZASADY:
- Max risk: 2% per trade (NIENARUSZALNE)
- Mozesz miec do 5 pozycji jednoczesnie (multi-position trading)
- Jesli votes sa sprzeczne, Ty decydujesz na podstawie MTF bias + regime + quantum risk
- Jesli MTF score >= 20 i ML sie zgadza, mozesz otworzyc pozycje nawet bez konsensusu
- Jesli drawdown > 15%, badz konserwatywny (HOLD lub zmniejsz pozycje)
- Jesli regime = TRENDING_DOWN i votes.SELL > 0.15, preferuj SHORT
- Jesli regime = TRENDING_UP i votes.BUY > 0.15, preferuj LONG
- Masz prawo do override KAZDEJ decyzji ensemble -- Ty jestes mozgiem
- Analizuj WSZYSTKIE wskazniki: RSI, MACD, Bollinger, ATR, Volume, SMA
- Po kazdym zamknieciu: analizuj wynik i zaproponuj ewolucje wag/zasad
- Ucinaj straty szybko (ALE NIE ZA CIASNO -- SL minimum 2x ATR), puszczaj zyski (wide TP minimum 5x ATR)
- ANTI-SCALPING: NIE otwieraj pozycji ktore zamierzasz zamknac w ciagu 15 minut. Minimum oczekiwany hold to 30-60 minut. Ultra-krotkie trade <5 min maja 20% win rate -- UNIKAJ ICH.
- PO WYGRANEJ: Nie otwieraj od razu nowej pozycji. Poczekaj na potwierdzenie nowego setup. Analiza pokazuje ze po wygranej, nastepny trade przegrywa w 85% przypadkow (over-confidence).
- COUNTER-TREND FORBIDDEN: NIGDY nie otwieraj LONG gdy MTF bias jest BEARISH ani SHORT gdy BULLISH. Counter-trend trades maja 0% win rate w danych historycznych.
- QUALITY OVER QUANTITY: Lepiej zrobic 3 dobre trade dziennie niz 15 slabych. Oplaty zjadaja zyski -- kazdy trade kosztuje ~$3.59 w fees.
- SCALE_IN: dodaj do istniejacego LONG w trendzie up
- FLIP: zamknij LONG i otworz SHORT (lub odwrotnie)

ZWROC JSON (i TYLKO JSON, bez markdown):
{
  "action": "OPEN_LONG" | "OPEN_SHORT" | "CLOSE" | "HOLD" | "ADJUST_SL" | "ADJUST_TP" | "OVERRIDE_BIAS" | "SCALE_IN" | "PARTIAL_CLOSE" | "FLIP",
  "confidence": 0.0-1.0,
  "details": {
    "reason": "...",
    "sl_adjust": null | number,
    "tp_adjust": null | number,
    "size_pct": 0.01-0.02,
    "target_symbol": "BTCUSDT"
  },
  "evolution": {
    "changes": "..." | null,
    "why": "..." | null
  },
  "personality": "..."
}
```

---

## 8. CONCLUSIONS & RECOMMENDATIONS

### 8.1 Key Findings
- **LOW WIN RATE (41.67%)**: Below 50% threshold. Bot needs better signal quality and wider SL to avoid premature stops.
- **NEGATIVE PROFIT FACTOR (0.485)**: Bot is losing money. Losses > Profits.
- **FEES DOMINATE**: Fees ($64.36) are 929% of gross PnL ($6.93). CRITICAL: Fees eat most of the gross profits. Reduce trade frequency.
- **EXCESSIVE SCALPING**: 13 trades <5min (36%). P26 anti-scalping should reduce these.
- **LONG LOSING STREAKS (max 8)**: P26 loss-streak sizing (50% at 3L, 25% at 5L) should manage this.
- **BOT PERFORMANCE DECLINING**: WR degraded 50.0% -> 33.3%. ML retraining may be needed.
- **LOW RISK/REWARD (0.68)**: Average win ($2.96) vs average loss ($-4.36). Target: wins should be 1.5-2x larger than losses. P26 wider TP (5x ATR) should help.
- **NEURON AI LOW WR (32%)**: NeuronAI wins only 32% of its decisions. Needs better filtering.

### 8.2 Patch #26 Expected Impact
| Change | Expected Effect | How to Verify |
|--------|----------------|---------------|
| Anti-scalping (3-min cooldown) | Fewer ultra-short trades | Check scalp_trades_under_5m after 24h |
| Quality gate (45% min confidence) | Higher signal quality | Win rate should increase |
| Wider SL (2.0x ATR vs 1.5x) | Fewer premature stops | Fewer SL exits, longer durations |
| Wider TP (5.0x ATR, RR 1:2.5) | Bigger wins | avg_win should increase |
| Counter-trend blocking (65% penalty) | Fewer counter-trend trades | Check direction bias alignment |
| Loss streak sizing (50% at 3L) | Reduced risk during losing streaks | Smaller losses during streaks |
| Post-win cooldown (20% reduction) | Prevent over-confidence | post_win_loss_rate should decrease |
| Ensemble threshold raised (55%) | Fewer but better signals | Trade count down, win rate up |

### 8.3 Priority Actions
1. **MONITOR**: Run bot for 24-48h post-P26 deployment and regenerate this report
2. **VERIFY**: Check that trade frequency decreased (target: <10 trades/day)
3. **EVALUATE**: If win rate stays below 45% after 50+ trades, consider:
   - Further raising ensemble threshold to 60%
   - Increasing minimum hold time to 30+ minutes
   - Reducing NeuronAI fallback conviction
4. **ML RETRAIN**: If ML accuracy degrades, trigger manual retrain
5. **FEES**: Consider switching to a lower-fee exchange/tier if available

---

## 9. RAW DATA FILES

| File | Path |
|------|------|
| CSV (all trades) | `/root/turbo-bot/reports/trade_analysis_full.csv` |
| JSON (round-trips) | `/root/turbo-bot/reports/trade_analysis_full.json` |
| JSON (metrics) | `/root/turbo-bot/reports/trade_metrics_full.json` |
| NeuronAI state | `/root/turbo-bot/trading-bot/data/neuron_ai_state.json` |
| NeuronAI decisions log | `/root/turbo-bot/trading-bot/data/neuron_ai_decisions.log` |
| Bot state | `/root/turbo-bot/data/bot_state.json` |
| This report | `/root/turbo-bot/reports/COMPREHENSIVE_TRADE_ANALYSIS_FULL.md` |

---

*Report generated automatically by Turbo-Bot Analysis Engine*
*Bot Version: 6.0.0-ENTERPRISE-MODULAR*
*Patch Level: #26 (Edge Recovery)*

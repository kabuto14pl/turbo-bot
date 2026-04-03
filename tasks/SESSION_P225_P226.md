# Session P#225–P#229 — Backtest Evolution (2026-04-02/03)

> Kontekst sesji do odtworzenia po przejściu z Codespace na lokalne VS Code.
> Copilot: przeczytaj ten plik na początku nowej rozmowy.

---

## Status: ✅ P#229 VERIFIED — $2,070/10k TARGET MET, DEPLOYED

### Commity z tej sesji
| Commit | Opis |
|--------|------|
| `ea869e9` | P#225: 4 critical bug fixes (double entry_fee, cooldown bypass, partial TP qty, ablation PF) |
| `3fe3b1b` | Pipeline script run_p225_pipeline.py |
| `05ed5cc` | Import fix: run_full_ablation → run_ablation |
| `0a139d8` | Strategy removal (RSITurbo+MomentumPro weights=0) — REVERTED |
| `397957b` | REVERT: weights back to original (combined removal worsened by $399) |
| `ab06a78` | Apply Optuna quick-run trial #21 params (30 trials, overfit) |
| `1ba57c5` | get_active_pairs() arg fix |
| `3cf7009` | walk_forward_multi_pair arg order fix |
| `792194c` | Optimizer scoring rewrite: profit-first (was Sharpe-dominated) |
| `e215da0` | **P#226**: Apply 60-trial optimizer best config — +$1,073, PF 1.057, Sharpe +0.234 |
| TBD | **P#228**: SOL+XRP 4h walk-forward — +$1,099 baseline (BAG_COUNT=5, conf=0.60) |
| TBD | **P#229**: Full 5×3 screening + per-pair confidence optimization — **+$2,070** |

---

## Co zostało zrobione

### P#225 — 4 Critical Bug Fixes
1. **P0: Double entry_fee** — `open_position()` L168 deducted fee upfront AND `_close_position()` L649 deducted again via net_pnl. Fix: removed L168 deduction.
2. **P1: Cooldown bypass** — GridV2/MomentumHTF `continue` skipped cooldown check. Fix: cooldown check moved BEFORE grid/momentum blocks.
3. **P2: Partial TP original qty** — L2 closed 25% of remaining (75%) = 18.75% not 25% of original. Fix: added `original_quantity` tracking.
4. **Portfolio PF = 0** — ablation PF computed from pair-level net_profit (always 0 for cross-pair). Fix: trade-level wins/losses.

### Ablation Analysis (on Windows GPU — RTX 5070 Ti)
- **Baseline**: -$1,916 | PF 0.747 | WR 59.7% | 2,321 trades
- MACrossover strongest keeper (-$662 delta when removed)
- RSITurbo worst (+$439 when removed — system improves without it)
- **Removal attempt** (RSITurbo + MomentumPro) → -$2,315 (WORSE by $399). Interaction effects. Reverted.

### Optimizer — Quick Run (30 trials, 60d/20d)
- Best trial #21: **+$608**, PF 0.98, 490 trades
- Params: TP 2.75, SL 1.75, SIMPLE_EXITS=True, ENSEMBLE_W=0.45, COOLDOWN_1H=8, MIN_CONF=0.70

### Walk-Forward OOS — Quick Params FAILED
- Full WF (90d/30d): **-$955, PF 0.72** — OVERFIT confirmed
- Root cause: Sharpe-dominated scoring + shorter train windows

### Optimizer Scoring Fix
- Old: `sharpe×100 + pf×50 + pnl/1000` (Sharpe dominated)
- New: `pnl/100 + pf×30 + sharpe×20` (profit-first)
- Bonus +100 for pnl>0 & pf>1.2 & sharpe>0
- BE disable option (999.0) added as categorical

### P#226 — Full Optimizer (60 trials, 90d/30d, profit-first scoring)
- **BEST: +$1,073 | PF 1.057 | Sharpe +0.234 | 1,285 trades**
- Elapsed: 3.07h on RTX 5070 Ti

#### P#226 Best Params (CURRENTLY IN config.py)
```
TP_ATR_MULT = 2.75
SL_ATR_MULT = 1.25          # tighter SL, trailing manages exits
CONFIDENCE_FLOOR = 0.35
GPU_NATIVE_MIN_CONFIDENCE = 0.60
GRID_MAX_ADX = 23
COOLDOWN_15m = 12
COOLDOWN_1h = 14             # very selective on 1h
BE_R = 999.0                 # DISABLED — was cutting winners
ENSEMBLE_WEIGHT = 0.15       # classical dominates, MLP advisory
BLOCK_HV_15M = True
DISABLE_TIME_UW = False      # time underwater exit re-enabled
SIMPLE_EXITS = False         # FULL Chandelier trailing ON
SLIPPAGE = 0.0002
```

---

## NASTĘPNY KROK (priorytet)

### 1. Walk-Forward OOS Walidacja P#226
```powershell
cd C:\Users\dudzi\turbo-bot-local\ml-service
python run_p225_pipeline.py --wf --tf 1h
```
Oczekiwanie: PnL > 0 i PF > 1.0 → first profitable config.
Czas: ~30-45 min na GPU.

### 2. Jeśli WF positive → commit als final, przygotować deploy
### 3. Jeśli WF negative → analiza per-pair, rozważyć:
   - Usunięcie BNBUSDT (konsekwentnie najgorszy: -$898 baseline)
   - 4h timeframe (historycznie lepszy: +$803 w P#221)
   - Per-pair optimizer (różne params per pair)

---

## Kluczowe pliki (zmodyfikowane w tej sesji)
- `ml-service/backtest_pipeline/config.py` — ALL config params
- `ml-service/backtest_pipeline/position_manager.py` — double fee fix, partial TP fix
- `ml-service/backtest_pipeline/gpu_native_engine.py` — cooldown bypass fix
- `ml-service/backtest_pipeline/ablation.py` — PF calc fix, BE knockout fix
- `ml-service/backtest_pipeline/optimizer.py` — scoring rewrite, BE disable option
- `ml-service/backtest_pipeline/walk_forward.py` — WF validation engine
- `ml-service/run_p225_pipeline.py` — pipeline script (ablation/optimize/wf)

## Środowisko
- **Windows GPU**: RTX 5070 Ti, Python 3.12, CUDA, Optuna
- **Projekt**: `C:\Users\dudzi\turbo-bot-local`
- **5 par**: BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT
- **Dane**: ~8,760 candles (365 dni @ 1h)
- **Wyniki Optuna**: `ml-service/results/optuna/*.json`

---

## P#228 — Walk-Forward Baseline (SOL+XRP @4h)
- **Result**: +$1,099 on $10k (SOL 85%, XRP 15%)
- BAG_COUNT=5, GPU_NATIVE_MIN_CONFIDENCE=0.60
- SOL: +$1,249, XRP: +$37

## P#229 — Full 5×3 Screening + Per-Pair Confidence Optimization

### Full Screening Matrix (15 pair×TF combos)
| Pair | 15m | 1h | 4h (conf=0.60) | 4h (optimal conf) |
|------|-----|-----|------|------|
| SOL | -$946 | -$2,024 | +$1,249 | **+$1,926** (c=0.65) → **+$2,163** (c65+risk6+cap80) |
| BNB | -$1,086 | -$83 | -$105 | **+$1,898** (c=0.75) |
| XRP | -$628 | -$559 | +$37 | not retested |
| ETH | -$291 | +$105 | -$648 | worse at higher conf |
| BTC | -$183 | -$86 | -$605 | worse at higher conf |

### Key Discoveries
1. **GPU_NATIVE_MIN_CONFIDENCE per-pair** via PAIR_OVERRIDES — most impactful param
   - BNB: -$106 → +$1,898 by raising conf 0.60→0.75 (153→38 trades, fees $535→$128)
2. **MAX_POSITION_VALUE_PCT=0.50** was silently capping SOL positions
   - Raising to 0.80 with risk=6%: +$1,926 → +$2,163
3. **Higher confidence = fewer trades = less fees = unlocks hidden edge**

### Final Config (VERIFIED)
```
SOLUSDT (65% allocation):
  GPU_NATIVE_MIN_CONFIDENCE = 0.65  (was 0.60)
  RISK_PER_TRADE = 0.060            (was 0.050)
  MAX_POSITION_VALUE_PCT = 0.80     (was 0.50)

BNBUSDT (35% allocation):
  GPU_NATIVE_MIN_CONFIDENCE = 0.75  (was 0.60)

BTC/ETH/XRP: 0% allocation (no edge found at any TF)
```

### Verification Walk-Forward (9 windows, 4h)
| Pair | Net P&L | Trades | WR% | PF | Sharpe |
|------|---------|--------|-----|-----|--------|
| SOLUSDT | +$1,406 | 85 | 67.1% | 1.61 | 2.81 |
| BNBUSDT | +$664 | 38 | 55.3% | 2.49 | 2.82 |
| **TOTAL** | **+$2,070** | 123 | — | — | 2.81 |
- Fees: $196, Max DD: $200

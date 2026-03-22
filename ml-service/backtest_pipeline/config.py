"""
TURBO-BOT Full Pipeline Backtest — Configuration & Constants
All thresholds, parameters, and constants from production bot.
"""

# ============================================================================
# POSITION MANAGEMENT (PATCH #60 — game-changer overhaul)
# ============================================================================
# P#189: TP lowered 4.0→2.5 ATR — advisory board (Khalil): 4.0 ATR unreachable on 15m
# At 4.0 ATR ~4% price move needed; 2.5 ATR is achievable with current momentum structure
# Combined with trailing, winners can ride well beyond the base TP level
SL_ATR_MULT = 1.5          # P#153 PARITY: aligned with live execution-engine.js (was 1.75)
TP_ATR_MULT = 2.5          # P#189: lowered 4.0→2.5 — achievable R:R target on 15m (was 4.0)
SL_CLAMP_MIN = 0.8         # Min SL = 0.8 × ATR
SL_CLAMP_MAX = 2.5         # Max SL = 2.5 × ATR
TP_CLAMP_MIN = 1.5         # P#189: lowered 2.0→1.5 to match new partial L1 level
TP_CLAMP_MAX = 4.5         # P#189: lowered 6.0→4.5 (was 6.0 for TP=4.0 ATR)

# PATCH #64: Dynamic SL base per-regime (applied BEFORE VQC regime adjust)
# In ranging: no momentum → tighter SL saves capital on failures
# In trending: pullbacks are natural → wider SL survives them
SL_REGIME_BASE = {
    'TRENDING_UP': 1.00,      # Normal SL
    'TRENDING_DOWN': 1.00,    # Normal SL
    'RANGING': 0.85,          # 15% tighter base SL in ranging
    'HIGH_VOLATILITY': 1.10,  # 10% wider base SL in HV
}

# PATCH #65: Momentum Early-Exit Gate
# Losers in P#64 had MaxR < 0.40 — trade NEVER showed momentum in profit direction
# After N candles without reaching threshold R → tighten SL to reduce loss size
MOMENTUM_GATE_ENABLED = True
MOMENTUM_GATE_CANDLES = 3          # Check after 3 candles to cut failed entries earlier
MOMENTUM_GATE_MIN_R = 0.30         # Must reach 0.30R within window
MOMENTUM_GATE_SL_TIGHTEN = 0.35    # Tighten SL aggressively when momentum never appears

# PATCH #66: Pre-Entry Momentum Confirmation
# Check last N candles before opening — if they don't go in signal direction → SKIP
# P#65 showed: 16/19 losers had MaxR < 0.40 → no pre-entry momentum
PRE_ENTRY_MOMENTUM_ENABLED = True
PRE_ENTRY_MOMENTUM_CANDLES = 3          # Check last 3 candles
PRE_ENTRY_MOMENTUM_MIN_ALIGNED = 2     # At least 2/3 must align with signal direction
PRE_ENTRY_MOMENTUM_RANGING_EXEMPT = True  # Skip momentum check in RANGING (choppy candles)
SHORT_EXHAUSTION_GATE_ENABLED = True
SHORT_EXHAUSTION_MIN_RED_CANDLES = 3
SHORT_EXHAUSTION_MAX_RSI = 35
SHORT_EXHAUSTION_MAX_BBPCT = 0.05
SHORT_EXHAUSTION_MIN_VOLUME_RATIO = 1.8

# 5-Phase Chandelier Trailing Stop thresholds
# PATCH #63: Parameterized trail distances + regime-adaptive trailing
# Phase 3/4 were hardcoded at 0.5/1.0 ATR — way too tight for BTC 15m
PHASE_1_MIN_R = 0.7            # Brain P#64 iter4: 1.0→0.7 (earlier trailing start)
PHASE_2_BE_R = 1.0             # Phase 2 BE at 1.0R
PHASE_3_LOCK_R = 1.5           # Phase 3 lock at 1.5R
PHASE_4_LOCK_R = 2.0           # Phase 4 lock at 2.0R
PHASE_5_CHANDELIER_R = 2.0     # P#194: 2.5→2.0 — lock profit earlier (trail was giving back >1R)
TRAILING_DISTANCE_ATR = 1.0    # P#194: 2.0→1.0 — trail MUST be tighter than SL (1.5 ATR). Was 2.0 = wider than SL = destroyed edge
PHASE3_TRAIL_ATR = 1.0         # Phase 3: lock highest - 1.0 ATR
PHASE4_TRAIL_ATR = 0.75        # Phase 4: lock highest - 0.75 ATR

# Regime-adaptive trailing multipliers (applied to trail distances)
# In trends: give more room for pullbacks. In ranging: tighten up.
TRAIL_REGIME_MULT = {
    'TRENDING_UP': 1.20,      # 20% wider trail in uptrend
    'TRENDING_DOWN': 1.20,    # 20% wider trail in downtrend
    'RANGING': 0.80,          # 20% tighter trail in ranging
    'HIGH_VOLATILITY': 1.10,  # Slightly wider in HV
}

# PATCH #59: BE profit buffer — lock actual profit at breakeven, not just fees
BE_PROFIT_BUFFER_ATR = 0.45    # Lock more realized profit once BE is armed

# P#153 PARITY: Partial TP aligned with live execution-engine.js (2-level system)
# Live uses: L1 @2.5×ATR (25%), L2 @4.0×ATR (25%), remainder runs as runner
USE_PARTIAL_TP = True          # P#153: Enabled to match live (was False)
PARTIAL_TP_ATR_L1 = 1.5       # P#189: Level 1 at 1.5×ATR — early partial before full TP (was 2.5)
PARTIAL_TP_PCT_L1 = 0.25      # P#153: Close 25% at L1
PARTIAL_TP_ATR_L2 = 2.0       # P#194: 2.5→2.0 ATR — lock profit before Chandelier trail at 2.0R (was 2.5)
PARTIAL_TP_PCT_L2 = 0.35      # P#194: 0.25→0.35 — close 35% at L2 to lock more profit before trail
# Legacy (kept for backward compat — not used when USE_PARTIAL_TP=True)
PARTIAL_TP_R = 2.0
PARTIAL_TP_PCT = 0.5

# PATCH #59: Time exits tightened — capture more live data, exit weak positions faster
# Emergency shortened: stuck trades drain capital
# Weak profit: lower threshold, don't hold tiny gains

# Time exits (original values)
TIME_EXIT_EMERGENCY_H = 72     # Emergency close after 72h
TIME_EXIT_WEAK_PROFIT_H = 48   # Close if < 0.3% gain after 48h
TIME_EXIT_UNDERWATER_H = 36    # Close if underwater > 0.5 × ATR after 36h

# ============================================================================
# EXECUTION ENGINE (PATCH #60 — game-changer #1 & #2)
# ============================================================================
# GC1: Real risk sizing — 1.5% risk per trade (was 2% but capped to 0.13%)
# GC2: Fee aligned with live tradingFeeRate (config.js + bundle.json)
FEE_RATE = 0.0002              # P#174: 0.02% maker rate — limit TP/BE exits
FEE_RATE_TAKER = 0.0005        # P#189: 0.05% taker rate — SL/TRAIL/TIME exits (market orders)
SLIPPAGE_RATE = 0.0002         # P#189: 0.02% slippage on SL exits — realistic for fast closes (was 0.0001)

# PATCH #67: Volatility Pause — adaptive sizing after loss streaks
# After N consecutive signal-level losses → reduce sizing to X%
# Prevents Feb-Mar cascading drawdowns
VOLATILITY_PAUSE_ENABLED = True
VOLATILITY_PAUSE_LOSS_STREAK = 3        # Trigger after 3 consecutive losses
VOLATILITY_PAUSE_SIZE_MULT = 0.50       # Reduce position size to 50%
VOLATILITY_PAUSE_RECOVERY_WINS = 1      # 1 win to restore normal sizing
FEE_GATE_MULTIPLIER = 1.5      # Expected profit must be >= 1.5× fees
RISK_PER_TRADE = 0.020         # P#153 PARITY: 2.0% risk aligned with live risk-manager.js (was 1.5%)
MAX_POSITION_VALUE_PCT = 0.15  # P#153 PARITY: 15% position cap aligned with live (was 1.00)
MIN_HOLD_COOLDOWN_MIN = 120    # P#174: 2h min hold — aligned with live MIN_HOLD_MS=7200000 (was 15min)
MAX_HOLD_HOURS = 72            # Max position hold time

# ============================================================================
# ENSEMBLE VOTING
# ============================================================================
STATIC_WEIGHTS = {
    'AdvancedAdaptive': 0.15,
    'RSITurbo': 0.11,
    'SuperTrend': 0.14,
    'MACrossover': 0.18,
    'MomentumPro': 0.03,     # P#197 Faza 2.5: was 0.07 — MC shows -$5 edge, worst performer
    'NeuralAI': 0.07,
    'PythonML': 0.02,           # P#197 Faza 2.5: was 0.04 — MC shows -$5 edge, always in losing combos
    'BollingerMR': 0.14,        # P#66: Bollinger Mean-Reversion for RANGING
    'ExternalSignals': 0.10,    # P#152C: whale/macro/F&G/calendar/COT
}

# PATCH #60 GC5: Lower thresholds for more trade opportunities
# Consensus rate was 0.2% → need 5-10× more setups to generate volume
ENSEMBLE_THRESHOLD_NORMAL = 0.22       # was 0.30 — allow single strong strategy
ENSEMBLE_THRESHOLD_CONFLICT = 0.30     # was 0.35
ENSEMBLE_THRESHOLD_STRONG = 0.18       # was 0.25
ENSEMBLE_THRESHOLD_RANGING = 0.10      # P#66: lower threshold in RANGING for BB MR signals
CONFIDENCE_FLOOR = 0.30                # PATCH #149B: aligned with live risk-manager.js CONF_FLOOR=0.30
CONFIDENCE_CLAMP_MIN = 0.15            # was 0.20
CONFIDENCE_CLAMP_MAX = 0.95
ENSEMBLE_COUNTER_TREND_CONF_MULT = 0.65     # P#196: 0.50 was too harsh (regressed), 0.72 was too lenient. Middle ground.
ENSEMBLE_TREND_ALIGNED_CONF_MULT = 1.10     # P#195: was 1.05 — stronger boost for trend-aligned

# P#197 Faza 2.5: Ensemble confidence floor for directional
# MC P#196: ensemble directional = 18 trades, -$19.41 (NET NEGATIVE)
# Only GridV2 ($+52) and MomentumHTF ($+8) have edge. Raise floor to filter weak signals.
ENSEMBLE_DIRECTIONAL_CONFIDENCE_FLOOR = 0.45  # was using CONFIDENCE_FLOOR=0.30

# P#195 Faza 2: TRENDING_DOWN directional block
# MC test shows TRENDING_DOWN = -$51 on 1h (catastrophic losses)
TRENDING_DOWN_DIRECTIONAL_ENABLED = False

# P#197 Faza 2.5: TRENDING_UP ensemble directional guard
# MC P#196: TRENDING_UP = 18 trades, -$19.41, p=0.705 — NO edge
# GridV2/MomentumHTF bypasses still work. Only blocks ensemble directional.
TRENDING_UP_ENSEMBLE_DIRECTIONAL_ENABLED = False

# ==========================================================================
# RUNTIME PARITY PROFILE
# ==========================================================================
PIPELINE_GATE_PROFILE = 'full_pipeline'
RUNTIME_PARITY_CONFIDENCE_FLOOR = 0.30
RUNTIME_PARITY_BUY_DRAWDOWN_BLOCK = 0.20
RUNTIME_PARITY_BUY_SIZING_REDUCTION_START = 0.10
RUNTIME_PARITY_BUY_SIZING_REDUCTION_END = 0.20
RUNTIME_PARITY_MINIMUM_BUY_SIZING_FACTOR = 0.30

# Thompson Sampling blend
THOMPSON_AI_BLEND = 0.60       # 60% AI + 40% static
THOMPSON_AI_BLEND_MAX = 0.85   # Grows to 85%

# ============================================================================
# REGIME DETECTION
# ============================================================================
REGIMES = ['TRENDING_UP', 'TRENDING_DOWN', 'RANGING', 'HIGH_VOLATILITY']
ADX_TREND_THRESHOLD = 20
ADX_STRONG_THRESHOLD = 25
ATR_HIGH_VOL_THRESHOLD = 1.5   # ATR ratio > 1.5 = high volatility

# ============================================================================
# NEURAL AI / SKYNET
# ============================================================================
# PATCH #57B: Defense trigger 5→7 (too aggressive on low trade count)
DEFENSE_MODE_TRIGGER_LOSSES = 7    # 7 consecutive losses → defense (was 5)
DEFENSE_MODE_RISK_REDUCTION = 0.75 # 25% risk reduction (was 35% — too harsh)
DEFENSE_MODE_COOLDOWN_CANDLES = 80   # shorter cooldown

# GRU Phases
PHASE_HEURISTIC_CANDLES = 100
PHASE_LEARNING_CANDLES = 500

# ============================================================================
# QUANTUM PIPELINE
# ============================================================================
# VQC regime adjustments
# PATCH #63: FIXED — SL was INVERTED (tighter in trend = WRONG)
# Trend: wider SL to survive pullbacks, wider TP to ride the move
# Ranging: tighter SL (no momentum), tighter TP (small moves)
VQC_REGIME_SL_ADJUST = {
    'TRENDING_UP': 1.10,    # Wider SL in trend (was 0.85 — INVERTED!)
    'TRENDING_DOWN': 1.10,  # Wider SL in trend (was 0.85 — INVERTED!)
    'RANGING': 0.85,        # Tighter SL in ranging (was 1.15 — INVERTED!)
    'HIGH_VOLATILITY': 1.15,
}
VQC_REGIME_TP_ADJUST = {
    'TRENDING_UP': 1.30,    # Much wider TP in trend — let winners run!
    'TRENDING_DOWN': 1.30,  # Much wider TP in trend
    'RANGING': 0.75,        # Tight TP in ranging (small moves)
    'HIGH_VOLATILITY': 0.85,
}

# QRA risk scoring
QRA_HIGH_RISK_THRESHOLD = 70   # Risk score > 70 → tighten SL
QRA_SL_TIGHTEN_FACTOR = 0.75   # Multiply SL by 0.75

# QMC scenario simulation
QMC_BULLISH_TP_BOOST = 1.20    # TP × 1.20 if QMC bullish
QMC_BEARISH_TP_SHRINK = 0.75   # TP × 0.75 if QMC bearish

# QAOA weight optimization interval (in cycles)
QAOA_WEIGHT_INTERVAL = 3        # P#192: 10→3 more frequent QAOA for GPU utilization
QMC_SIM_INTERVAL = 2            # P#192: 5→2 more frequent QMC
QRA_RISK_INTERVAL = 5           # P#192: 10→5 more frequent risk assessment
# P#193.2: Wider intervals for strategy-only backtests (no ML, just strategies + quantum)
STRATEGY_ONLY_QMC_INTERVAL = 10    # QMC every 10 candles — 5× less HTTP overhead
STRATEGY_ONLY_QAOA_INTERVAL = 20   # QAOA every 20 candles — strategies don't change fast

# QDV verification — aligned with PATCH #60 lower floor
QDV_MIN_CONFIDENCE = 0.25              # was 0.30 — aligned with new floor
QDV_STARVATION_CYCLES = 120            # was 180 — force trade sooner

# ============================================================================
# PRIME GATE (NeuronAI safety constraints)
# ============================================================================
PRIME_DRAWDOWN_BLOCK = 0.15     # 15% drawdown → HOLD
PRIME_COUNTER_TREND_HARD_BLOCK = False
PRIME_COUNTER_TREND_CONF_MULT = 0.72
PRIME_COUNTER_TREND_MIN_CONF = 0.32
PRIME_DUPLICATE_COOLDOWN_S = 180  # 3 min duplicate prevention
PRIME_COUNTER_TREND_MTF = 20    # MTF score ≥ 20 → block counter-trend

# ============================================================================
# LLM / NEURON AI
# ============================================================================
LLM_COOLDOWN_MS = 8000
LLM_DEFENSE_CONF_CAP = 0.55
# PATCH #57G: Defense mult 0.65→0.75 (0.65 crashed all conf below floor)
LLM_DEFENSE_CONF_MULT = 0.75
LLM_LOSS_STREAK_HOLD = 9       # 9 consecutive losses → HOLD (was 7)

# ============================================================================
# QPM Health Scoring
# ============================================================================
HEALTH_HEALTHY = 65
HEALTH_WARNING = 40
HEALTH_CRITICAL = 25

# Score weights
HEALTH_PNL_WEIGHT = 0.20
HEALTH_REGIME_WEIGHT = 0.20
HEALTH_QMC_WEIGHT = 0.20
HEALTH_RISK_WEIGHT = 0.20
HEALTH_TIME_WEIGHT = 0.10
HEALTH_MOMENTUM_WEIGHT = 0.10

# Partial close thresholds
# PATCH #63 EXIT MANAGEMENT OVERHAUL
# CRITICAL BUG FIX: L1 and L2 were BOTH at 1.5 ATR = 70% position closed
# at SAME price point. Now properly separated: L1@1.0, L2@2.0
PARTIAL_HEALTH_EMERGENCY_PCT = 0.80
PARTIAL_ADVERSE_REGIME_PCT = 0.50
PARTIAL_HIGH_RISK_PCT = 0.30
PARTIAL_QMC_BEARISH_PCT = 0.35
PARTIAL_ATR_L1_PCT = 0.25     # P#153 PARITY: aligned with live (25% at L1)
PARTIAL_ATR_L1_MULT = 2.5     # P#153 PARITY: aligned with live execution-engine.js (was 1.25)
PARTIAL_ATR_L2_PCT = 0.25     # P#153 PARITY: aligned with live (25% at L2)
PARTIAL_ATR_L2_MULT = 4.0     # P#153 PARITY: aligned with live execution-engine.js (was 2.25)
PARTIAL_ATR_L3_PCT = 0.0      # P#153 PARITY: disabled — live has no L3 (was 0.50)
PARTIAL_ATR_L3_MULT = 3.75    # Not used when L3_PCT=0

# ============================================================================
# RANGING STALE POSITION
# ============================================================================
# PATCH #57F: Ranging stale 4h→8h (4h was closing too many 1h positions prematurely)
RANGING_STALE_HOURS = 12
RANGING_STALE_MIN_PROFIT_ATR = 0.2

# ============================================================================
# XGBOOST ML ENGINE (PATCH #58 — replaces heuristic ML simulator)
# ============================================================================
XGBOOST_USE_GPU = True          # GPU-first; xgboost_ml.py falls back to CPU if CUDA build is unavailable
XGBOOST_N_ESTIMATORS = 500      # P#182: 200→500 for heavier GPU training
XGBOOST_MAX_DEPTH = 8           # P#182: 4→8 deeper trees = more GPU work
XGBOOST_LEARNING_RATE = 0.03    # Slow learning for generalization
XGBOOST_MIN_CHILD_WEIGHT = 10   # Minimum samples per leaf
XGBOOST_MIN_CV_ACCURACY = 0.55  # Trust gate from PATCH #58: marginal (~50%) models stay advisory-only
XGBOOST_MIN_PROBABILITY = 0.55  # Minimum probability to generate signal
XGBOOST_RETRAIN_INTERVAL = 100  # P#182: 200→100 for more GPU training cycles (140 retrains/14k)
XGBOOST_RETRAIN_INTERVAL_FAST = 250  # P#182: 500→250 fast mode (56 retrains per 14k)
XGBOOST_MIN_TRAIN_SAMPLES = 150 # Minimum samples for training (labels require movement > threshold)
XGBOOST_WARMUP_CANDLES = 500    # Initial warmup for first training
XGBOOST_LABEL_THRESHOLD = 0.001 # Min price change for UP/DOWN label (0.1%)

# ============================================================================
# PYTORCH MLP GPU ENGINE (P#176 — XGBoost fallback, 100% GPU)
# ============================================================================
# P#193: STRATEGY-ONLY BACKTEST MODE
# When True: skip XGBoost/MLP training (slow), run ALL classical strategies + quantum
# Use for fast strategy testing across all pairs and timeframes with GPU quantum
STRATEGY_ONLY_MODE = False  # P#198: DISABLED — ML pipeline activated with safety gates

# P#198: ML VETO-ONLY MODE — safety gate for first ML activation
# When True: XGBoost/MLP train and predict, but only VETO (block) bad trades.
# Heuristic ML stays primary signal for ensemble. XGBoost can only suppress.
# This prevents untrained ML from generating wrong directional trades.
# Disable when ML proves edge (CV consistently > 55% across pairs).
ML_VETO_ONLY = True

# P#198: VQC REGIME OVERRIDE — A/B test GPU-VQC vs classical regime detection
# When True: use GPU VQC regime classification instead of classical HMM.
# Run backtest with True vs False to compare performance.
# A/B TEST: True caused Grid V2 to fire 2.5x more on 1h (17→43 SOL trades)
#   because VQC reclassifies TRENDING candles as RANGING.
#   Helped 4h (SOL -$16→+$28) but destroyed 1h (SOL +$44→-$42).
#   Setting False to test baseline without VQC regime override.
VQC_REGIME_OVERRIDE = False

# P#194 FAZA 1: Disable directional trading on 15m — funding only
# Advisory Board: directional 15m was -$110.85, funding was +$23.91.
# Directional trading is net negative on 15m. Keep it on 1h/4h only.
DIRECTIONAL_15M_ENABLED = False

# P#194 FAZA 1: Bypass heavy gate cascade on higher timeframes
# Advisory Board (Khalil): 15 sequential gates kill 96.5% of signals.
# PA gate + EQ filter add noise on 1h/4h where signals are cleaner.
BYPASS_PA_GATE_HIGHER_TF = True    # Skip PA gate (Phase 18) on 1h/4h
BYPASS_EQ_FILTER_HIGHER_TF = True  # Skip EQ filter (Phase 17) on 1h/4h

GPU_ONLY_BACKTEST = False       # P#193: Must be False so classical strategies run (was True for ML-only P#183)
GPU_NATIVE_ENGINE = True        # P#184: experimental GPU-native backtest engine foundation
GPU_NATIVE_EPOCHS = 96          # P#185: much heavier CUDA training to drive higher utilization
GPU_NATIVE_BATCH_SIZE = 4096    # P#185: larger GPU batch for tensor training/inference
GPU_NATIVE_RETRAIN_INTERVAL = 100  # P#185: retrain more often to keep GPU busy
GPU_NATIVE_HIDDEN_DIMS = [2048, 1024, 512, 256]  # P#185: wider/deeper local CUDA network
GPU_NATIVE_TRAIN_REPEAT = 32    # P#185: GPU-side augmentation/repeat factor to enlarge each training window
GPU_NATIVE_LOCAL_QUANTUM = True  # P#186: bypass per-candle remote quantum HTTP in native engine
GPU_NATIVE_LOCAL_QMC_PATHS = 32768  # P#186: large local CUDA Monte Carlo batch per scheduled quantum sweep
GPU_NATIVE_LOCAL_QMC_STEPS = 16     # P#186: keep local QMC horizon aligned with heavy remote path
GPU_NATIVE_LOCAL_QMC_LOOKBACK = 200 # P#186: history window for local quantum drift/volatility estimate
GPU_NATIVE_LOCAL_QMC_BATCH = 32     # P#186: number of scheduled windows processed per CUDA QMC launch
REMOTE_GPU_QMC_PATHS = 500000   # P#192: 131K→500K heavy Monte Carlo for real GPU utilization
REMOTE_GPU_QMC_STEPS = 64       # P#192: 16→64 longer horizon per QMC launch
REMOTE_GPU_QAOA_ITERATIONS = 4096  # P#192: 1024→4096 heavier QAOA optimization
REMOTE_GPU_QAOA_SAMPLES = 65536    # P#192: 16K→65K max QAOA sampling tensor
REMOTE_GPU_QAOA_LAYERS = 8         # P#192: 6→8 deeper QAOA simulation
MLP_GPU_ENABLED = True          # Enable PyTorch MLP GPU engine as XGBoost fallback
MLP_LEARNING_RATE = 1e-3        # AdamW learning rate
MLP_EPOCHS = 300                # P#192: 200→300 more GPU training epochs
MLP_BATCH_SIZE = 512            # P#192: 256→512 larger batches = better GPU utilization
MLP_WEIGHT_DECAY = 1e-4         # L2 regularization
MLP_PATIENCE = 20               # P#182: 10→20 patience for longer training
MLP_HIDDEN_DIMS = [512, 256, 128, 64]  # P#182: [128,64,32]→[512,256,128,64] 4-layer deep network
MLP_DROPOUT = 0.3               # Dropout rate between layers

# ============================================================================
# LLM OVERRIDE VALIDATOR (PATCH #58 — Ollama integration)
# ============================================================================
LLM_ENABLED = False             # P#182: Disabled — CPU-only module, wastes 100-500ms/candle
LLM_MODEL = 'mistral:7b-instruct'  # Ollama model to use
LLM_OLLAMA_URL = 'http://localhost:11434'  # Ollama URL
LLM_TIMEOUT_S = 5.0            # Timeout per call (seconds)
LLM_FAST_PATH_CONF = 0.65      # Skip LLM if confidence > this (fast-path)
LLM_VETO_CONF = 0.70           # LLM confidence > this → hard veto
LLM_DISAGREE_PENALTY = 0.80    # Mild disagree → 20% confidence reduction

# ============================================================================
# SENTIMENT ANALYSIS (PATCH #58 — humanoid layer)
# ============================================================================
SENTIMENT_ENABLED = False       # P#182: Disabled — CPU-only module, wastes 20-50ms/candle
SENTIMENT_W_FEAR_GREED = 0.30   # Weight: Fear/Greed proxy
SENTIMENT_W_SOCIAL = 0.25       # Weight: Social momentum
SENTIMENT_W_NEWS = 0.20         # Weight: News impact proxy
SENTIMENT_W_CROWD = 0.25        # Weight: Crowd positioning
SENTIMENT_VETO_THRESHOLD = 0.25 # Below this → sentiment veto
# P#67: CONTRARIAN sentiment — buy fear, sell greed
# Original (pro-trend): EF 0.90, F 0.95, G 1.05, EG 0.92
# Contrarian: BOOST in extreme fear (buy the dip), DAMPEN in extreme greed (sell the top)
SENTIMENT_MOD_EXTREME_FEAR = 1.12   # P#67: Contrarian — BOOST in extreme fear (buy oversold)
SENTIMENT_MOD_FEAR = 1.05           # P#67: Contrarian — slight boost in fear
SENTIMENT_MOD_GREED = 0.95          # P#67: Contrarian — slight reduce in greed
SENTIMENT_MOD_EXTREME_GREED = 0.88  # P#67: Contrarian — DAMPEN in extreme greed (overbought)
SENTIMENT_CONTRARIAN = True         # P#67: Enable contrarian mode
# Contrarian action modifier: in EXTREME_FEAR, prefer BUY; in EXTREME_GREED, prefer SELL
SENTIMENT_CONTRARIAN_EXTREME_FEAR_BUY_BOOST = 1.15   # BUY confidence boost in extreme fear
SENTIMENT_CONTRARIAN_EXTREME_GREED_SELL_BOOST = 1.10  # SELL confidence boost in extreme greed

# ============================================================================
# EXTERNAL SIGNALS SIMULATION (PATCH #152C)
# ============================================================================
EXTERNAL_SIGNALS_ENABLED = True         # P#187: re-enabled — ExternalSignalsSimulator is pure numpy (no API calls, ~2ms/candle)

# ============================================================================
# P#188: OPTIONAL STRATEGY FLAGS (previously missing → all defaulted to False)
# ============================================================================
GRID_V2_ENABLED = True          # P#188: GridV2 mean-reversion in RANGING (BB bands + RSI)
MOMENTUM_HTF_ENABLED = True     # P#188: Multi-timeframe momentum in TRENDING (SMA alignment + pullback)
FUNDING_ARB_ENABLED = True      # P#188: Funding rate arbitrage — delta-neutral income every 32 candles (15m)
NEWS_FILTER_ENABLED = True      # P#188: News/volatility event filter — blocks/adjusts trades on extreme moves

# ============================================================================
# LIVE RETRAIN SCHEDULER (PATCH #58 — 7-day cycle on GPU)
# ============================================================================
RETRAIN_INTERVAL_HOURS = 168     # 7 days
RETRAIN_MIN_QUALITY_SCORE = 50   # Overfitting guard minimum score
RETRAIN_USE_GPU = True           # Use RTX 5070 Ti for training
RETRAIN_TIMEFRAMES = ['15m']     # Timeframes to retrain

# ============================================================================
# PRICE ACTION ENGINE (PATCH #62)
# ============================================================================
PA_MIN_SCORE = 0.25             # P#65: 0.30→0.25 (Brain pushed to 0.40 runtime → 15 trades. Need volume)
PA_GATE_MIN_SCORE = 0.25        # Min S/R composite to allow entry
PA_BOOST_THRESHOLD = 0.65       # S/R score above this → confidence boost
ENTRY_FILTER_STRONG_MTF_BLOCK_ENABLED = True   # Profit-focused: block entries with strong higher-TF conflict
ENTRY_FILTER_STRONG_MTF_BLOCK_THRESHOLD = -2   # Block when 2+ MTF signals conflict with the action

# ============================================================================
# LONG-SIDE TREND FILTER (PATCH #63)
# ============================================================================
# Longs in downtrend: WR 57.1%, PnL -$354 in P#62 → need filter
LONG_TREND_FILTER = True        # Enable EMA-based long-side filter
LONG_EMA_PERIOD = 100           # EMA period (100 candles = 25h on 15m)
LONG_COUNTER_TREND_PENALTY = 0.75  # Confidence * 0.75 for counter-trend longs

# PATCH #66: Enhanced LONG block — hard block in strong downtrend
LONG_BLOCK_IN_DOWNTREND = True      # Block LONGs when regime=TRENDING_DOWN
LONG_EMA_SLOPE_PERIOD = 200         # EMA period for macro slope check
LONG_EMA_SLOPE_LOOKBACK = 10        # Candles to measure slope over
LONG_EMA_SLOPE_MIN = -0.003         # Block LONGs if EMA200 slope < -0.3%
COUNTER_TREND_LONGS_ENABLED = True
COUNTER_TREND_LONG_MIN_CONFIDENCE = 0.38
COUNTER_TREND_LONG_MIN_EQ_SCORE = 0.55
COUNTER_TREND_LONG_REQUIRE_NON_BEARISH_PA = True
COUNTER_TREND_LONG_RUNTIME_FLOOR = 0.30

# ============================================================================
# RANGING MICRO-SCALP STRATEGY (PATCH #65)
# ============================================================================
# P#64: 47% of data = RANGING, 0 trades → missed opportunity
# In RANGING: use tighter SL/TP for micro-scalp approach
RANGING_TRADE_ENABLED = True        # Allow entries in RANGING regime
RANGING_SL_ATR_MULT = 1.0           # Tighter SL in ranging (vs 1.75 normal)
RANGING_TP_ATR_MULT = 1.25          # Tight TP in ranging (reachable)
RANGING_CONFIDENCE_BOOST = 0.05     # Small confidence boost for ranging entries
RANGING_MIN_ADX = 12                # Minimum ADX for ranging entry (not dead flat)
RANGING_MAX_ADX = 20                # Max ADX (above = trending, not ranging)

# ============================================================================
# GRID RANGING STRATEGY (PATCH #67 — replaces P#66 BollingerMR)
# ============================================================================
# P#66 BollingerMR had 0 triggers (RSI<30+BB<0.10+Vol>1.2 too strict)
# P#67 Grid: relaxed BB%B bounds, no RSI requirement, grid-level entries
# Fills the 47% RANGING data gap with BB band mean-reversion
GRID_RANGING_ENABLED = True
GRID_BB_LOW = 0.20               # P#67: BB%B below this = near lower band (was 0.10)
GRID_BB_HIGH = 0.80              # P#67: BB%B above this = near upper band (was 0.90)
GRID_BB_EXTREME_LOW = 0.08       # Extreme oversold → max confidence
GRID_BB_EXTREME_HIGH = 0.92      # Extreme overbought → max confidence
GRID_MAX_ADX = 22                # P#67: Slightly wider ADX range (was 20)
GRID_RSI_FILTER_LOW = 25         # Only filter extreme RSI contradictions
GRID_RSI_FILTER_HIGH = 75        # (don't require RSI like P#66)
GRID_COOLDOWN_CANDLES = 8        # Min candles between grid entries (2h on 15m)
GRID_SL_ATR_MULT = 0.60          # Tight grid SL (0.60 ATR)
GRID_TP_ATR_MULT = 0.80          # Tight grid TP (0.80 ATR)
GRID_RISK_MULT = 0.50            # Half-size positions for grid trades
GRID_MAX_CONCURRENT = 3          # Max concurrent grid signals (simulated)
# Legacy P#66 BollingerMR (kept for compatibility, overridden by Grid)
BOLLINGER_MR_RSI_LOW = 30
BOLLINGER_MR_RSI_HIGH = 70
BOLLINGER_MR_BB_LOW = 0.10
BOLLINGER_MR_BB_HIGH = 0.90
BOLLINGER_MR_VOL_MIN = 1.2
BOLLINGER_MR_MAX_ADX = 20

# ============================================================================
# P#68: RANGING REGIME BYPASS
# ============================================================================
# P#67 found 2,194 grid signals blocked by CONFIDENCE_FLOOR 0.25
# Ensemble dilutes single-strategy BollingerMR signals to ~0.15
# Fix: lower confidence floor for RANGING + grid signals
RANGING_CONFIDENCE_FLOOR = 0.12     # Reduced floor for RANGING regime (vs 0.25 normal)
RANGING_BYPASS_ENABLED = False      # P#68: Disabled — grid signals not profitable yet (3/3 lost)
RANGING_GRID_CONFIDENCE_BOOST = 0.08  # Extra boost for grid signals in RANGING

# ============================================================================
# P#68: DYNAMIC SL PER REGIME
# ============================================================================
# P#67: avg SL loss = $45.49 → too large. Need regime-specific SL
# TRENDING_DOWN + SHORT = tighter SL (mean-reversion risk lower)
# TRENDING_UP + LONG = wider SL (trend continuation needs room)
DYNAMIC_SL_ENABLED = True
DYNAMIC_SL_TRENDING_DOWN_SHORT = 1.25   # Tighter SL for shorts in downtrend (was 1.75)
DYNAMIC_SL_TRENDING_DOWN_LONG = 1.50    # Moderate SL for counter-trend longs
DYNAMIC_SL_TRENDING_UP_LONG = 2.00      # Wide SL for trend-aligned longs (let breathe)
DYNAMIC_SL_TRENDING_UP_SHORT = 1.25     # Tighter SL for counter-trend shorts
DYNAMIC_SL_RANGING = 0.60              # Grid-level SL in RANGING (already tight)

# ============================================================================
# P#68: ADAPTIVE POSITION SIZING
# ============================================================================
# After winning signals → slightly increase size (momentum)
# After losing signals → slightly decrease size (caution)
ADAPTIVE_SIZING_ENABLED = True
ADAPTIVE_SIZING_WIN_MULT = 1.15     # Size × 1.15 after winning signal
ADAPTIVE_SIZING_LOSS_MULT = 0.85    # Size × 0.85 after losing signal
ADAPTIVE_SIZING_MAX_MULT = 1.50     # Maximum size multiplier cap
ADAPTIVE_SIZING_MIN_MULT = 0.50     # Minimum size multiplier floor
ADAPTIVE_SIZING_RESET_AFTER = 5     # Reset multiplier after N signals

# ============================================================================
# INITIAL CAPITAL
# ============================================================================
INITIAL_CAPITAL = 10000

# ============================================================================
# P#152: FUNDING RATE DATA SOURCE
# ============================================================================
# True = use real Kraken Futures historical funding rates (cached locally)
# False = simulate funding from price action (legacy)
FUNDING_USE_REAL_DATA = True

# ============================================================================
# P#189: WALK-FORWARD VALIDATION — 5-FOLD EXPANDING (Advisory Board rec.)
# ============================================================================
# Single 70/30 split is statistically meaningless — need min 5 OOS windows
WALK_FORWARD_WINDOWS = 5            # Number of expanding OOS windows
WALK_FORWARD_TRAIN_PCT = 0.75       # Initial train fraction (was 0.70)

# ============================================================================
# P#189: MOMENTUM HTF UPGRADED PARAMETERS (Advisory Board rec.)
# ============================================================================
# ADX_MIN 20→28: prevents entry in ranging market masquerading as trending
# SMA_TREND 200→100: 200 warmup candles consumed 1/4 of data; 100 is enough
# VOL_CONFIRM 2.0×: require real volume confirmation (was implicit 1.2×)
MTF_ADX_MIN = 28                    # ADX gate — was 20 (too permissive)
MTF_SMA_TREND = 100                 # Trend lookback period — was 200
MTF_VOL_CONFIRM = 2.0               # Volume ratio required for entry — was 1.2

# ============================================================================
# P#189: GRID V2 PER-PAIR CONTROL (Advisory Board rec.)
# ============================================================================
# Grid SL=0.60 ATR gets hit by BTC wicks. Grid works better on altcoins.
GRID_V2_ENABLED_PAIRS = ['ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT']

# ============================================================================
# P#189: REGIME-AWARE STRATEGY ROUTING (Advisory Board rec.)
# ============================================================================
# Correlated strategies cancel each other's signal — mutual dilution.
# Route dynamically: trending = momentum on, MR off; ranging = grid on, trend off.
STRATEGY_ROUTING = {
    'TRENDING_UP': {
        'active': ['AdvancedAdaptive', 'MACrossover', 'MomentumHTF', 'ExternalSignals'],
        'inactive': ['BollingerMR', 'GridV2'],
    },
    'TRENDING_DOWN': {
        'active': ['AdvancedAdaptive', 'RSITurbo', 'MomentumHTF', 'ExternalSignals'],
        'inactive': ['BollingerMR', 'GridV2'],
    },
    'RANGING': {
        'active': ['GridV2', 'BollingerMR', 'ExternalSignals'],
        'inactive': ['MomentumHTF', 'MACrossover', 'SuperTrend'],
    },
    'HIGH_VOLATILITY': {
        'active': ['FundingArb', 'ExternalSignals'],
        'inactive': ['GridV2', 'MomentumHTF', 'MACrossover'],
        'position_size_mult': 0.3,
    },
}

# ============================================================================
# P#189: PER-PAIR STRATEGY MAP (Advisory Board rec.)
# ============================================================================
# BTC: trend-following / funding only. ETH/SOL/BNB/XRP: grid + funding.
PAIR_STRATEGY_MAP = {
    'BTCUSDT':  ['MomentumHTF', 'AdvancedAdaptive', 'FundingArb'],
    'ETHUSDT':  ['GridV2', 'FundingArb', 'ExternalSignals'],
    'SOLUSDT':  ['MomentumHTF', 'GridV2', 'FundingArb'],
    'BNBUSDT':  ['GridV2', 'BollingerMR'],
    'XRPUSDT':  ['GridV2', 'ExternalSignals'],
}

# ============================================================================
# P#197 FAZA 2.6: TIMEFRAME HIERARCHY — Per-TF Config Overrides
# ============================================================================
# Higher TFs get more trust, lower TFs get more restrictions.
# 4h = primary signal source (most profitable: +$332)
# 1h = secondary, filtered by regime blocks (TRENDING_DOWN/UP blocked)
# 15m = funding-only (directional disabled since P#194)
#
# Applied at engine startup via apply_timeframe_overrides(tf)
TIMEFRAME_OVERRIDES = {
    '4h': {
        # 4h is most reliable — allow trend-following, lighter filters
        'TRENDING_UP_ENSEMBLE_DIRECTIONAL_ENABLED': True,  # 4h TRENDING_UP is +$16.64
        'ENSEMBLE_DIRECTIONAL_CONFIDENCE_FLOOR': 0.35,     # Lower floor — 4h signals are cleaner
        'RISK_PER_TRADE': 0.018,                           # Slightly more risk ok on 4h
    },
    '1h': {
        # 1h needs strict filtering — TRENDING regimes are net negative
        'TRENDING_UP_ENSEMBLE_DIRECTIONAL_ENABLED': False,  # 1h TRENDING_UP = -$36 (blocked)
        'ENSEMBLE_DIRECTIONAL_CONFIDENCE_FLOOR': 0.45,     # High bar for ensemble signals
        'RISK_PER_TRADE': 0.015,                           # Standard risk
    },
    '15m': {
        # 15m = funding only (DIRECTIONAL_15M_ENABLED = False already)
        'RISK_PER_TRADE': 0.010,                           # Minimal risk for funding
    },
}

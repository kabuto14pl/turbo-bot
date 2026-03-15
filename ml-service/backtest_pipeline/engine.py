"""
TURBO-BOT Full Pipeline Backtest — Main Engine
Orchestrates ALL 14 pipeline phases per candle.
"""

import pandas as pd
import numpy as np
from datetime import datetime

from . import config
from .regime_detector import RegimeDetector
from .strategies import run_all_strategies
from .quantum_backend import create_quantum_backend
from .ml_simulator import MLSimulator
from .neuron_ai import NeuronAISimulator
from .ensemble import EnsembleVoter
from .position_manager import PositionManager

# PATCH #58: New modules
from .xgboost_ml import XGBoostMLEngine
from .llm_validator import LLMOverrideValidator
from .sentiment_analyzer import SentimentAnalyzer

# P#176: PyTorch MLP GPU engine (XGBoost fallback)
from .torch_mlp_gpu import TorchMLPEngine

# PATCH #59: Entry quality filter
from .sr_filter import EntryQualityFilter

# PATCH #62: Price Action engine
from .price_action import PriceActionEngine
from .decision_core import evaluate_runtime_consensus_path
from .runtime_parity import GATE_PROFILE_RUNTIME_PARITY, apply_runtime_risk_check

# P#71: New strategy modules
from .funding_rate import FundingRateArbitrage
from .grid_v2 import GridV2Strategy
from .news_filter import NewsFilter
# P#175: Momentum HTF/LTF strategy
from .momentum_htf import MomentumHTFStrategy

# PATCH #152C: External signals simulation (F&G, whale, macro, COT)
from .external_signals_sim import ExternalSignalsSimulator


class FullPipelineEngine:
    """
    Main backtest engine — simulates all 14 pipeline phases per candle.
    
    Pipeline order (matches bot.js::executeTradingCycle):
      0. Pre-checks (circuit breaker)
      1. Data collection
      2. Neural AI update (regime detection)
      3. Quantum pre-processing (QFM)
      4. Signal generation (5 strategies + ML + NeuralAI)
      5. Quantum boost (VQC + QMC + QAOA + QRA)
      6. Ensemble voting
      7. Post-ensemble gates (PRIME, Skynet)
      8. Risk check (drawdown, confidence floor)
      9. Execution (fee gate, sizing)
      10. Position monitoring (5-phase trailing)
      11. Quantum position monitoring (QPM)
      12. LLM cycle (NeuronAI decision)
      13. Learning (Thompson, defense, evolution)
    """
    
    def __init__(self, initial_capital=None, symbol='BTCUSDT', quantum_backend='simulated', quantum_backend_options=None):
        self.symbol = symbol  # P#69: Track which pair we're trading
        self.initial_capital = initial_capital or config.INITIAL_CAPITAL
        self.quantum_backend = quantum_backend
        self.quantum_backend_options = quantum_backend_options or {}
        self.gate_profile = getattr(config, 'PIPELINE_GATE_PROFILE', 'full_pipeline')
        self._gpu_only_backtest = getattr(config, 'GPU_ONLY_BACKTEST', False)
        self._gpu_only_last_regime = 'RANGING'
        
        # P#178: Extract GPU URL for ML engines
        gpu_url = self.quantum_backend_options.get('remote_url')
        
        # Components
        self.regime = RegimeDetector()
        self.quantum = self._create_quantum_backend()
        self.ml = MLSimulator()
        self.neuron = NeuronAISimulator()
        self.ensemble = EnsembleVoter()
        self.pm = PositionManager()
        
        # PATCH #58: New Skynet components — P#178: pass gpu_url for remote training
        self.xgb_ml = XGBoostMLEngine(gpu_url=gpu_url)
        self.xgb_ml._current_symbol = symbol
        self.llm = LLMOverrideValidator()
        self.sentiment = SentimentAnalyzer()
        self._xgb_initialized = False
        
        # P#176: PyTorch MLP GPU engine — P#178: pass gpu_url for remote training
        self.mlp_gpu = TorchMLPEngine(gpu_url=gpu_url)
        self.mlp_gpu._current_symbol = symbol
        self._mlp_initialized = False
        
        # PATCH #59: Entry quality filter (S/R + Volume + MTF)
        self.entry_filter = EntryQualityFilter()
        
        # PATCH #62: Price Action engine (market structure + S/R zones + entry timing)
        self.price_action = PriceActionEngine()
        
        # Tracking
        self.cycle_count = 0
        self.signal_log = []
        self.phase_stats = {f'phase_{i}': 0 for i in range(18)}
        self.blocked_reasons = {}
        self._long_filtered = 0  # PATCH #63: counter for long trend filter
        self._ranging_trades = 0  # PATCH #65: ranging micro-scalp counter
        self._pre_entry_blocked = 0  # PATCH #66: pre-entry momentum counter
        
        # PATCH #67: Volatility Pause — consecutive loss tracking
        self._consecutive_losses = 0
        self._volatility_pause_active = False
        self._volatility_pause_triggered_count = 0
        self._grid_last_entry_candle = -999  # Grid cooldown tracking
        self._grid_trades = 0  # Grid trade counter
        
        # P#69: Pair-specific direction filter tracking
        self._bnb_long_blocked = 0
        self._bnb_long_passed = 0
        
        # P#70: BTC direction filter tracking
        self._btc_long_blocked = 0
        
        # P#71: New strategy modules
        self.funding_arb = FundingRateArbitrage(symbol=symbol)
        self.grid_v2 = GridV2Strategy(symbol=symbol)
        self.news_filter = NewsFilter(symbol=symbol)
        self._grid_v2_trades = 0
        self._grid_v2_pnl = 0
        self._news_blocked = 0
        # P#175: Momentum HTF/LTF
        self.momentum_htf = MomentumHTFStrategy(symbol=symbol)
        self._momentum_htf_trades = 0
        
        # PATCH #152C: External signals simulator
        self.external_signals = ExternalSignalsSimulator()
        
    def _configure_p71_modules(self):
        """Configure P#71 modules with per-pair settings from config."""
        # Funding Rate config
        self.funding_arb.configure(
            FUNDING_MIN_RATE=getattr(config, 'FUNDING_MIN_RATE', 0.0001),
            FUNDING_CAPITAL_PCT=getattr(config, 'FUNDING_CAPITAL_PCT', 0.30),
            FUNDING_MAX_UNREALIZED_LOSS=getattr(config, 'FUNDING_MAX_UNREALIZED_LOSS', 0.02),
        )
        # Grid V2 config
        self.grid_v2.configure(
            GRID_V2_ADX_THRESHOLD=getattr(config, 'GRID_V2_ADX_THRESHOLD', 22),
            GRID_V2_BB_LOWER_ENTRY=getattr(config, 'GRID_V2_BB_LOWER_ENTRY', 0.15),
            GRID_V2_BB_UPPER_ENTRY=getattr(config, 'GRID_V2_BB_UPPER_ENTRY', 0.85),
            GRID_V2_RSI_OVERSOLD=getattr(config, 'GRID_V2_RSI_OVERSOLD', 45),
            GRID_V2_RSI_OVERBOUGHT=getattr(config, 'GRID_V2_RSI_OVERBOUGHT', 55),
            GRID_V2_SL_ATR=getattr(config, 'GRID_V2_SL_ATR', 0.60),
            GRID_V2_TP_ATR=getattr(config, 'GRID_V2_TP_ATR', 0.80),
            GRID_V2_COOLDOWN=getattr(config, 'GRID_V2_COOLDOWN', 4),
            GRID_V2_MAX_TRADES=getattr(config, 'GRID_V2_MAX_TRADES', 50),
            GRID_V2_RISK_PER_TRADE=getattr(config, 'GRID_V2_RISK_PER_TRADE', 0.008),
        )
        # News filter config
        self.news_filter.configure(
            NEWS_REGULATORY_BLOCK=getattr(config, 'NEWS_REGULATORY_BLOCK', False),
            NEWS_ECOSYSTEM_BOOST=getattr(config, 'NEWS_ECOSYSTEM_BOOST', False),
            NEWS_PANIC_BLOCK=getattr(config, 'NEWS_PANIC_BLOCK', True),
            NEWS_FOMO_BLOCK=getattr(config, 'NEWS_FOMO_BLOCK', True),
            NEWS_WHALE_CAUTION=getattr(config, 'NEWS_WHALE_CAUTION', True),
        )
        # Enable/disable based on config
        self.funding_arb.enabled = getattr(config, 'FUNDING_ARB_ENABLED', False)
        self.grid_v2.enabled = getattr(config, 'GRID_V2_ENABLED', False)
        self.news_filter.enabled = getattr(config, 'NEWS_FILTER_ENABLED', False)
        # P#175: Momentum HTF/LTF config
        self.momentum_htf.configure(
            MTF_ADX_MIN=getattr(config, 'MTF_ADX_MIN', 20),
            MTF_SL_ATR=getattr(config, 'MTF_SL_ATR', 2.0),
            MTF_TP_ATR=getattr(config, 'MTF_TP_ATR', 5.0),
            MTF_COOLDOWN=getattr(config, 'MTF_COOLDOWN', 24),
            MTF_MAX_TRADES=getattr(config, 'MTF_MAX_TRADES', 50),
            MTF_RISK_PER_TRADE=getattr(config, 'MTF_RISK_PER_TRADE', 0.010),
            MTF_MIN_RR=getattr(config, 'MTF_MIN_RR', 2.5),
            MTF_ENTRY_RSI_OVERSOLD=getattr(config, 'MTF_ENTRY_RSI_OVERSOLD', 40),
            MTF_ENTRY_RSI_OVERBOUGHT=getattr(config, 'MTF_ENTRY_RSI_OVERBOUGHT', 60),
        )
        self.momentum_htf.enabled = getattr(config, 'MOMENTUM_HTF_ENABLED', False)

    def _create_quantum_backend(self):
        return create_quantum_backend(self.quantum_backend, options=self.quantum_backend_options)

    def _runtime_parity_enabled(self):
        return self.gate_profile == GATE_PROFILE_RUNTIME_PARITY
        
    def run(self, df, timeframe='15m'):
        """
        Run full pipeline backtest on DataFrame.
        
        Args:
            df: DataFrame with OHLCV + indicators (datetime index)
            timeframe: '15m', '1h', '4h'
            
        Returns:
            dict: Full results with metrics + component stats
        """
        self._reset()
        
        warmup = 200
        if len(df) < warmup + 50:
            return {'error': f'Insufficient data: {len(df)} (need {warmup + 50}+)'}
        
        # Detect candle interval
        if len(df) > 1:
            td = (df.index[1] - df.index[0]).total_seconds()
            self.candle_hours = td / 3600
        else:
            self.candle_hours = 0.25
        
        # PATCH #58: Initialize XGBoost with walk-forward training
        if not self._xgb_initialized:
            xgb_warmup = min(
                getattr(config, 'XGBOOST_WARMUP_CANDLES', 500),
                int(len(df) * 0.6)  # Use up to 60% of data for initial training
            )
            print(f"  🧠 Training XGBoost on first {xgb_warmup} candles...")
            self.xgb_ml.train_initial(df, xgb_warmup)
            self._xgb_initialized = True
        
        # P#176: Initialize MLP GPU engine
        if not self._mlp_initialized and getattr(config, 'MLP_GPU_ENABLED', True):
            print(f"  🔥 Training PyTorch MLP on first {xgb_warmup} candles (GPU)...")
            self.mlp_gpu.train_initial(df, xgb_warmup)
            self._mlp_initialized = True
        
        # PATCH #58: Check LLM availability
        self.llm.check_availability()
        
        # P#71: Configure new modules with current pair config
        self._configure_p71_modules()
            
        total_candles = len(df) - warmup
        
        for i in range(warmup, len(df)):
            row = df.iloc[i]
            history = df.iloc[max(0, i - warmup):i]
            candle_time = df.index[i]
            
            self.cycle_count += 1
            
            # ============================================================
            # PHASE 0: PRE-CHECKS
            # ============================================================
            self.phase_stats['phase_0'] += 1
            # Circuit breaker: skip (no consecutive errors in backtest)
            
            # ============================================================
            # PHASE 1: DATA COLLECTION (already have it)
            # ============================================================
            self.phase_stats['phase_1'] += 1
            
            # ============================================================
            # PHASE 2: NEURAL AI — REGIME DETECTION
            # ============================================================
            self.phase_stats['phase_2'] += 1
            if self._gpu_only_backtest:
                regime_result = {'regime': self._gpu_only_last_regime, 'confidence': 0.5, 'probabilities': {}}
                current_regime = self._gpu_only_last_regime
            else:
                regime_result = self.regime.detect(row, history)
                current_regime = regime_result['regime']
            
            # ============================================================
            # PHASE 3: QUANTUM PRE-PROCESSING (QFM)
            # ============================================================
            self.phase_stats['phase_3'] += 1
            # QFM adds 8 quantum features — simulated (doesn't change signals)
            
            # ============================================================
            # PHASE 4: SIGNAL GENERATION
            # ============================================================
            self.phase_stats['phase_4'] += 1
            
            if self._gpu_only_backtest:
                signals = {}
            else:
                # 4a. Classical strategies
                signals = run_all_strategies(row, history)

            # 4a2. P#187: ExternalSignals — pure numpy simulator (no API calls).
            # Runs in BOTH gpu-only and full-pipeline modes. Weight: 0.10 (STATIC_WEIGHTS).
            if self.external_signals.enabled:
                ext_signal = self.external_signals.generate_signal(row, history, current_regime)
                if ext_signal and ext_signal.get('action') != 'HOLD':
                    signals['ExternalSignals'] = ext_signal
                elif ext_signal:
                    signals['ExternalSignals'] = ext_signal  # HOLD still participates in voting
            
            # 4b. ML prediction — PATCH #58: XGBoost as ADVISORY layer
            # XGBoost only used when it has proven edge (CV > threshold)
            # Otherwise heuristic is primary to avoid random-model corruption
            xgb_signal = self.xgb_ml.predict(row, history, current_regime, candle_idx=i, df=df)
            xgb_has_edge = (
                xgb_signal.get('source') == 'XGBoost' and
                self.xgb_ml.cv_scores and
                np.mean(self.xgb_ml.cv_scores) >= getattr(config, 'XGBOOST_MIN_CV_ACCURACY', 0.55)
            )
            
            if xgb_has_edge:
                # XGBoost has demonstrated edge — use as primary ML signal
                ml_signal = xgb_signal
            elif self._mlp_initialized:
                # P#176: XGBoost has no edge — try MLP GPU fallback
                mlp_signal = self.mlp_gpu.predict(row, history, current_regime, candle_idx=i, df=df)
                mlp_has_edge = (
                    mlp_signal.get('source') in ('TorchMLP', 'MLP-GPU') and
                    self.mlp_gpu.cv_scores and
                    np.mean(self.mlp_gpu.cv_scores) >= getattr(config, 'XGBOOST_MIN_CV_ACCURACY', 0.55)
                )
                if mlp_has_edge:
                    ml_signal = mlp_signal
                elif self._gpu_only_backtest:
                    ml_signal = {'action': 'HOLD', 'confidence': 0.0, 'source': 'GPU_ONLY_HOLD'}
                else:
                    ml_signal = self.ml.predict(row, history, current_regime)
                # Store XGBoost prediction for learning only
                if xgb_signal.get('source') == 'XGBoost':
                    xgb_signal['_advisory_only'] = True
            else:
                # No proven edge — GPU-only mode stays flat instead of falling back to CPU heuristic
                if self._gpu_only_backtest:
                    ml_signal = {'action': 'HOLD', 'confidence': 0.0, 'source': 'GPU_ONLY_HOLD'}
                else:
                    ml_signal = self.ml.predict(row, history, current_regime)
                # Store XGBoost prediction for learning only (not ensemble)
                if xgb_signal.get('source') == 'XGBoost':
                    xgb_signal['_advisory_only'] = True
            
            # 4c. ML veto logic — ONLY apply when ML source has proven edge
            # Prevents random XGBoost from vetoing good strategy signals
            if (not self._gpu_only_backtest) and (xgb_has_edge or ml_signal.get('source') != 'XGBoost'):
                signals = self.xgb_ml.apply_ml_veto(signals, ml_signal)
            
            # 4d. PATCH #58: XGBoost sliding window retrain
            self.xgb_ml.maybe_retrain(df, i)
            
            # P#176: MLP GPU retrain
            if self._mlp_initialized:
                self.mlp_gpu.maybe_retrain(df, i)
            
            # ============================================================
            # PHASE 14: SENTIMENT ANALYSIS (PATCH #58)
            # ============================================================
            self.phase_stats['phase_14'] += 1
            if self._gpu_only_backtest:
                sentiment_result = {}
            else:
                sentiment_result = self.sentiment.analyze(
                    row, history, current_regime
                )
            
            # ============================================================
            # PHASE 5: QUANTUM BOOST
            # ============================================================
            self.phase_stats['phase_5'] += 1
            q_result = self.quantum.process_cycle(
                row, history, current_regime, signals, 
                self.pm.capital
            )

            if self._gpu_only_backtest:
                quantum_stats = self.quantum.get_stats()
                remote_regime = quantum_stats.get('last_remote_regime')
                if remote_regime in getattr(config, 'REGIMES', []):
                    current_regime = remote_regime
                    self._gpu_only_last_regime = remote_regime
            
            # Apply QAOA weights to ensemble
            if q_result['qaoa_weights']:
                self.ensemble.update_weights(qaoa_weights=q_result['qaoa_weights'])
            
            # ============================================================
            # PHASE 10: POSITION MONITORING (before new signals)
            # ============================================================
            if self.pm.position is not None:
                self.phase_stats['phase_10'] += 1
                exit_result = self.pm.manage_position(
                    row, candle_time, current_regime, q_result
                )
                
                if exit_result and exit_result != 'OPEN':
                    # Position closed — learn from it
                    self._learn_from_last_trade(i)
                    # P#71: Track grid V2 trade results
                    if self.pm.trades and self.pm.trades[-1].get('is_grid_v2', False):
                        last_t = self.pm.trades[-1]
                        self.grid_v2.record_grid_trade(last_t['net_pnl'], last_t['fees'])
                    # P#175: Track momentum HTF trade results
                    if self.pm.trades and self.pm.trades[-1].get('is_momentum_htf', False):
                        last_t = self.pm.trades[-1]
                        self.momentum_htf.record_trade(last_t['net_pnl'], last_t['fees'])
            
            # ============================================================
            # P#71 PHASE 22: FUNDING RATE ARBITRAGE (every candle)
            # Delta-neutral: spot long + perp short when funding > threshold
            # Independent from directional trading — always processes
            # ============================================================
            if getattr(config, 'FUNDING_ARB_ENABLED', False):
                funding_interval = 32 if timeframe == '15m' else (8 if timeframe == '1h' else 2)
                fr_result = self.funding_arb.process_candle(
                    row, history, current_regime, self.initial_capital,
                    candle_idx=i, funding_interval=funding_interval
                )
                # Add funding income to capital (delta-neutral, no position needed)
                if fr_result['funding_collected'] > 0:
                    self.pm.capital += fr_result['funding_collected']
            
            # ============================================================
            # P#71 NEWS EVENT DETECTION (every candle, independent)
            # Runs on ALL candles to build event history.
            # Actual signal filtering happens later in Phase 24.
            # ============================================================
            if getattr(config, 'NEWS_FILTER_ENABLED', False):
                self.news_filter.detect_events(row, history, i)
            
            # ============================================================
            # P#71 PHASE 23: GRID V2 — BYPASS ENSEMBLE (RANGING only)
            # Dedicated mean-reversion: BB bands + RSI in RANGING regime
            # Fires BEFORE ensemble — if grid signal, skip ensemble entirely
            # ============================================================
            if self.pm.position is None and getattr(config, 'GRID_V2_ENABLED', False):
                grid_signal = self.grid_v2.evaluate(
                    row, history, current_regime, candle_idx=i,
                    has_position=(self.pm.position is not None)
                )
                
                if grid_signal is not None:
                    # Grid V2 fires — bypass ensemble, go straight to execution
                    self.grid_v2.mark_entry(i)
                    self._grid_v2_trades += 1
                    
                    atr = row.get('atr', row['close'] * 0.01)
                    side = 'LONG' if grid_signal['signal'] == 'BUY' else 'SHORT'
                    
                    # Grid-specific SL/TP
                    grid_sl_adj = grid_signal['sl_atr'] / config.SL_ATR_MULT
                    grid_tp_adj = grid_signal['tp_atr'] / config.TP_ATR_MULT
                    
                    # Grid-specific risk sizing
                    grid_risk_mult = grid_signal['risk_per_trade'] / getattr(config, 'RISK_PER_TRADE', 0.015)
                    
                    opened = self.pm.open_position(
                        side=side,
                        price=row['close'],
                        atr=atr,
                        time=candle_time,
                        regime=current_regime,
                        sl_adjust=grid_sl_adj,
                        tp_adjust=grid_tp_adj,
                        risk_multiplier=grid_risk_mult,
                        confidence=grid_signal['confidence'],
                    )
                    
                    if opened:
                        # Mark this trade as grid V2 for tracking
                        if self.pm.position is not None:
                            self.pm.position['is_grid_v2'] = True
                    
                    self._track_equity(row, candle_time)
                    continue  # Skip ensemble — grid took priority
            
            # ============================================================
            # P#175 PHASE 23.5: MOMENTUM HTF/LTF — BYPASS ENSEMBLE
            # Trend-following: SMA alignment + ADX + pullback + 2nd candle
            # Fires BEFORE ensemble — if momentum signal, skip ensemble
            # ============================================================
            if self.pm.position is None and getattr(config, 'MOMENTUM_HTF_ENABLED', False):
                mtf_signal = self.momentum_htf.evaluate(
                    row, history, current_regime, candle_idx=i,
                    has_position=(self.pm.position is not None)
                )
                
                if mtf_signal is not None:
                    self.momentum_htf.mark_entry(i)
                    self._momentum_htf_trades += 1
                    
                    atr = row.get('atr', row['close'] * 0.01)
                    side = 'LONG' if mtf_signal['signal'] == 'BUY' else 'SHORT'
                    
                    mtf_sl_adj = mtf_signal['sl_atr'] / config.SL_ATR_MULT
                    mtf_tp_adj = mtf_signal['tp_atr'] / config.TP_ATR_MULT
                    mtf_risk_mult = mtf_signal['risk_per_trade'] / getattr(config, 'RISK_PER_TRADE', 0.015)
                    
                    opened = self.pm.open_position(
                        side=side,
                        price=row['close'],
                        atr=atr,
                        time=candle_time,
                        regime=current_regime,
                        sl_adjust=mtf_sl_adj,
                        tp_adjust=mtf_tp_adj,
                        risk_multiplier=mtf_risk_mult,
                        confidence=mtf_signal['confidence'],
                    )
                    
                    if opened and self.pm.position is not None:
                        self.pm.position['is_momentum_htf'] = True
                    
                    self._track_equity(row, candle_time)
                    continue  # Skip ensemble — momentum took priority
            
            # ============================================================
            # PHASE 6: ENSEMBLE VOTING (only if no position)
            # ============================================================
            if self.pm.position is None:
                self.phase_stats['phase_6'] += 1
                drawdown = self.pm.get_current_drawdown()
                if self._gpu_only_backtest:
                    effective_floor = config.CONFIDENCE_FLOOR
                    final_action = ml_signal.get('action', 'HOLD')
                    final_confidence = float(ml_signal.get('confidence', 0.0) or 0.0)
                    final_confidence += float(q_result.get('quantum_confidence_boost', 0.0) or 0.0)
                    final_confidence = min(config.CONFIDENCE_CLAMP_MAX, max(0.0, final_confidence))

                    if final_action == 'HOLD' or final_confidence < effective_floor:
                        self._track_equity(row, candle_time)
                        continue

                    qdv = self.quantum.verify_decision(
                        final_action, final_confidence,
                        current_regime, q_result['qra_risk_score']
                    )
                    if not qdv['verified']:
                        self._block(f'QDV: {qdv["reason"]}')
                        self._track_equity(row, candle_time)
                        continue

                    runtime_risk = apply_runtime_risk_check(final_action, final_confidence, drawdown)
                    if not runtime_risk['approved']:
                        self._block(f'Runtime risk: {runtime_risk["reason"]}')
                        self._track_equity(row, candle_time)
                        continue
                    final_confidence = runtime_risk['confidence']

                    self.phase_stats['phase_9'] += 1
                    atr = row.get('atr', row['close'] * 0.01)
                    side = 'LONG' if final_action == 'BUY' else 'SHORT'
                    opened = self.pm.open_position(
                        side=side,
                        price=row['close'],
                        atr=atr,
                        time=candle_time,
                        regime=current_regime,
                        sl_adjust=q_result['sl_adjust'],
                        tp_adjust=q_result['tp_adjust'],
                        risk_multiplier=1.0,
                        confidence=final_confidence,
                    )
                    if not opened:
                        self._block('Execution failed (fee gate / sizing)')
                    self._track_equity(row, candle_time)
                    continue

                if self._runtime_parity_enabled():
                    self.phase_stats['phase_8'] += 1
                    runtime_history = df.iloc[max(0, i - warmup):i + 1]
                    runtime_decision = evaluate_runtime_consensus_path(
                        signals=signals,
                        regime=current_regime,
                        drawdown=drawdown,
                        neural_state={
                            'defense_mode': self.neuron.defense_mode,
                            'consecutive_losses': self.neuron.consecutive_losses,
                        },
                        ml_signal=ml_signal,
                        last_trade_candle_gap=i - getattr(self.neuron, '_last_trade_candle', -999),
                        history=runtime_history,
                    )

                    final_action = runtime_decision['final_action']
                    final_confidence = runtime_decision['final_confidence']

                    if final_action == 'HOLD':
                        self._block(runtime_decision['reason'])
                        self._track_equity(row, candle_time)
                        continue
                else:
                    consensus = self.ensemble.vote(signals, current_regime, ml_signal)

                    if consensus is None:
                        # No consensus — track equity and continue
                        self._track_equity(row, candle_time)
                        continue

                    # PATCH #68: Track if this is a grid signal from RANGING
                    is_ranging_grid = consensus.get('is_grid_signal', False)

                    # PATCH #68: Determine effective confidence floor
                    # Use lower floor for RANGING grid signals
                    if is_ranging_grid and getattr(config, 'RANGING_BYPASS_ENABLED', False):
                        effective_floor = getattr(config, 'RANGING_CONFIDENCE_FLOOR', 0.12)
                    else:
                        effective_floor = config.CONFIDENCE_FLOOR

                    # ============================================================
                    # PHASE 7: POST-ENSEMBLE GATES (PRIME)
                    # ============================================================
                    self.phase_stats['phase_7'] += 1
                    prime_result = self.neuron.validate_prime_gate(
                        consensus['action'], consensus['confidence'],
                        current_regime, drawdown, i,
                        is_grid_signal=is_ranging_grid
                    )

                    if not prime_result['passed']:
                        self._block(prime_result['reason'])
                        self._track_equity(row, candle_time)
                        continue

                    adjusted_confidence = prime_result['adjusted_confidence']

                    # ============================================================
                    # PHASE 8: RISK CHECK
                    # ============================================================
                    self.phase_stats['phase_8'] += 1

                    # Drawdown > 20% blocks BUY
                    if drawdown > 0.20 and consensus['action'] == 'BUY':
                        self._block('Drawdown > 20% blocks BUY')
                        self._track_equity(row, candle_time)
                        continue

                    # ============================================================
                    # PHASE 12: NEURON AI DECISION
                    # ============================================================
                    self.phase_stats['phase_12'] += 1
                    neuron_decision = self.neuron.make_decision(
                        consensus, signals, current_regime, drawdown, i, ml_signal
                    )

                    final_action = neuron_decision['action']
                    final_confidence = min(adjusted_confidence,
                                          neuron_decision['confidence']) if neuron_decision['confidence'] > 0 else adjusted_confidence

                    if final_action == 'HOLD':
                        self._track_equity(row, candle_time)
                        continue
                if not self._runtime_parity_enabled():
                    # ============================================================
                    # PHASE 5b: QDV VERIFICATION
                    # ============================================================
                    qdv = self.quantum.verify_decision(
                        final_action, final_confidence,
                        current_regime, q_result['qra_risk_score']
                    )

                    if not qdv['verified']:
                        self._block(f'QDV: {qdv["reason"]}')
                        self._track_equity(row, candle_time)
                        continue

                    # ============================================================
                    # PHASE 15: LLM OVERRIDE VALIDATION (PATCH #58)
                    # ============================================================
                    self.phase_stats['phase_15'] += 1

                    llm_features = self.xgb_ml._cached_features_for_index(df, i) if self.xgb_ml.trained else {}

                    llm_result = self.llm.validate_signal(
                        ml_signal, llm_features, current_regime,
                        has_position=(self.pm.position is not None)
                    )

                    if llm_result is not None:
                        if llm_result.get('override_action') == 'HOLD':
                            self._block(f'LLM veto: {llm_result.get("reasoning", "disagreed")}')
                            self._track_equity(row, candle_time)
                            continue

                        llm_adj = llm_result.get('confidence_adj', final_confidence)
                        if llm_adj < final_confidence:
                            final_confidence = llm_adj

                    # ============================================================
                    # PHASE 16: SENTIMENT MODIFIER (PATCH #58)
                    # ============================================================
                    self.phase_stats['phase_16'] += 1

                    final_confidence, sentiment_modified, sentiment_reason = \
                        self.sentiment.modify_signal(
                            final_action, final_confidence, sentiment_result
                        )

                    if final_confidence < effective_floor:
                        self._block(f'Post-sentiment confidence {final_confidence:.3f} < floor {effective_floor}')
                        self._track_equity(row, candle_time)
                        continue

                    # ============================================================
                    # PHASE 17: ENTRY QUALITY FILTER (PATCH #59)
                    # ============================================================
                    self.phase_stats['phase_17'] = self.phase_stats.get('phase_17', 0) + 1

                    eq_result = self.entry_filter.evaluate(
                        row, history, final_action, current_regime
                    )

                    if not eq_result['pass']:
                        self._block(f'EQ-SR blocked: score {eq_result["score"]:.2f}')
                        self._track_equity(row, candle_time)
                        continue

                    final_confidence *= eq_result['confidence_adj']

                    if final_confidence < effective_floor:
                        self._block(f'Post-EQ confidence {final_confidence:.3f} < floor {effective_floor}')
                        self._track_equity(row, candle_time)
                        continue

                    # ============================================================
                    # PHASE 18: PRICE ACTION GATE (PATCH #62)
                    # ============================================================
                    self.phase_stats['phase_18'] = self.phase_stats.get('phase_18', 0) + 1

                    pa_result = self.price_action.analyze(
                        row, history, final_action, current_regime
                    )

                    pa_min_score = getattr(config, 'PA_MIN_SCORE', 0.25)
                    if pa_result['score'] < pa_min_score:
                        self._block(
                            f'PA blocked: {pa_result["entry_type"]} score '
                            f'{pa_result["score"]:.2f} < {pa_min_score}'
                        )
                        self._track_equity(row, candle_time)
                        continue

                    pa_score = pa_result['score']
                    if pa_score >= 0.60:
                        final_confidence *= 1.10
                    elif pa_score < 0.25:
                        final_confidence *= 0.85

                    if pa_result['structure'] != 'RANGING':
                        if (final_action == 'BUY' and pa_result['structure'] == 'BEARISH') or \
                           (final_action == 'SELL' and pa_result['structure'] == 'BULLISH'):
                            final_confidence *= 0.80

                    if final_confidence < effective_floor:
                        self._block(f'Post-PA confidence {final_confidence:.3f} < floor {effective_floor}')
                        self._track_equity(row, candle_time)
                        continue

                runtime_risk = apply_runtime_risk_check(final_action, final_confidence, drawdown)
                if (not runtime_risk['approved'] and
                    not self._runtime_parity_enabled() and
                    final_action == 'BUY' and
                    current_regime == 'TRENDING_DOWN' and
                    getattr(config, 'COUNTER_TREND_LONGS_ENABLED', False) and
                    runtime_risk['reason'] == 'Signal below runtime confidence floor'):
                    min_eq = getattr(config, 'COUNTER_TREND_LONG_MIN_EQ_SCORE', 0.55)
                    min_runtime_conf = getattr(config, 'COUNTER_TREND_LONG_RUNTIME_FLOOR', 0.30)
                    pa_ok = True
                    if getattr(config, 'COUNTER_TREND_LONG_REQUIRE_NON_BEARISH_PA', True):
                        pa_ok = pa_result.get('structure') != 'BEARISH'
                    if eq_result.get('score', 0) >= min_eq and final_confidence >= min_runtime_conf and pa_ok:
                        runtime_risk = {
                            'approved': True,
                            'confidence': max(final_confidence, min_runtime_conf),
                            'reason': 'Counter-trend long runtime-floor override',
                        }
                if not runtime_risk['approved']:
                    self._block(f'Runtime risk: {runtime_risk["reason"]}')
                    self._track_equity(row, candle_time)
                    continue
                final_confidence = runtime_risk['confidence']
                
                # ============================================================
                # PHASE 19: LONG TREND FILTER (PATCH #66 ENHANCED)
                # P#66: Hard block LONGs in TRENDING_DOWN + EMA200 slope
                # P#63 original: soft penalty for longs below EMA
                # ============================================================
                if not self._runtime_parity_enabled() and final_action == 'BUY':
                    self.phase_stats['phase_19'] = self.phase_stats.get('phase_19', 0) + 1
                    
                    # P#66: Hard block LONGs when regime = TRENDING_DOWN
                    if getattr(config, 'LONG_BLOCK_IN_DOWNTREND', False):
                        if current_regime == 'TRENDING_DOWN':
                            allow_counter_trend_long = False
                            if getattr(config, 'COUNTER_TREND_LONGS_ENABLED', False):
                                min_conf = getattr(config, 'COUNTER_TREND_LONG_MIN_CONFIDENCE', 0.38)
                                min_eq = getattr(config, 'COUNTER_TREND_LONG_MIN_EQ_SCORE', 0.55)
                                pa_ok = True
                                if getattr(config, 'COUNTER_TREND_LONG_REQUIRE_NON_BEARISH_PA', True):
                                    pa_ok = pa_result.get('structure') != 'BEARISH'
                                allow_counter_trend_long = (
                                    final_confidence >= min_conf and
                                    eq_result.get('score', 0) >= min_eq and
                                    pa_ok
                                )

                            if not allow_counter_trend_long:
                                self._long_filtered += 1
                                self._block('P#66 LONG block: regime=TRENDING_DOWN')
                                self._track_equity(row, candle_time)
                                continue
                    
                    # P#66: EMA slope check — block LONGs when macro trend bearish
                    ema_slope_period = getattr(config, 'LONG_EMA_SLOPE_PERIOD', 200)
                    ema_slope_lookback = getattr(config, 'LONG_EMA_SLOPE_LOOKBACK', 10)
                    ema_slope_min = getattr(config, 'LONG_EMA_SLOPE_MIN', -0.003)
                    
                    if len(history) >= ema_slope_period:
                        ema_series = history['close'].ewm(
                            span=ema_slope_period, adjust=False).mean()
                        if len(ema_series) > ema_slope_lookback:
                            ema_now = ema_series.iloc[-1]
                            ema_prev = ema_series.iloc[-ema_slope_lookback]
                            slope = (ema_now - ema_prev) / ema_prev if ema_prev > 0 else 0
                            if slope < ema_slope_min:
                                self._long_filtered += 1
                                self._block(
                                    f'P#66 LONG block: EMA{ema_slope_period} slope '
                                    f'{slope*100:.2f}% < {ema_slope_min*100:.1f}%')
                                self._track_equity(row, candle_time)
                                continue
                    
                    # P#63 original: soft penalty for counter-trend longs below EMA
                    if getattr(config, 'LONG_TREND_FILTER', False):
                        ema_period = getattr(config, 'LONG_EMA_PERIOD', 100)
                        if len(history) >= ema_period:
                            ema_val = history['close'].ewm(
                                span=ema_period, adjust=False).mean().iloc[-1]
                            if row['close'] < ema_val:
                                penalty = getattr(config, 'LONG_COUNTER_TREND_PENALTY', 0.80)
                                final_confidence *= penalty
                                self._long_filtered += 1
                                if final_confidence < effective_floor:
                                    self._block(
                                        f'Long trend filter: price < EMA{ema_period}, '
                                        f'conf {final_confidence:.3f} < floor')
                                    self._track_equity(row, candle_time)
                                    continue
                
                # ============================================================                # PHASE 21b: BNB DIRECTION FILTER (P#69)
                # SHORT freely, LONG only with high confidence + MTF
                # P#68: BNB SHORT 93.1% WR (+$192) vs LONG 71.4% (-$135)
                # ============================================================
                if (not self._runtime_parity_enabled() and self.symbol == 'BNBUSDT' and
                    getattr(config, 'BNB_DIRECTION_FILTER_ENABLED', False)):
                    if final_action == 'BUY':
                        # Block LONGs in TRENDING_DOWN entirely
                        if getattr(config, 'BNB_LONG_BLOCK_IN_TRENDING_DOWN', True) and current_regime == 'TRENDING_DOWN':
                            self._bnb_long_blocked += 1
                            self._block('P#69 BNB: LONG blocked in TRENDING_DOWN')
                            self._track_equity(row, candle_time)
                            continue
                        
                        # LONGs require high confidence
                        min_conf = getattr(config, 'BNB_LONG_MIN_CONFIDENCE', 0.40)
                        if final_confidence < min_conf:
                            self._bnb_long_blocked += 1
                            self._block(f'P#69 BNB: LONG conf {final_confidence:.3f} < {min_conf}')
                            self._track_equity(row, candle_time)
                            continue
                        
                        # LONGs require MTF uptrend alignment
                        if getattr(config, 'BNB_LONG_REQUIRE_MTF_UPTREND', True):
                            ema_period = getattr(config, 'LONG_EMA_PERIOD', 100)
                            if len(history) >= ema_period:
                                ema_val = history['close'].ewm(
                                    span=ema_period, adjust=False).mean().iloc[-1]
                                if row['close'] < ema_val:
                                    self._bnb_long_blocked += 1
                                    self._block(f'P#69 BNB: LONG blocked — price < EMA{ema_period}')
                                    self._track_equity(row, candle_time)
                                    continue
                        
                        self._bnb_long_passed += 1
                
                # ============================================================
                # PHASE 21c: BTC DIRECTION FILTER (P#70)
                # BTC LONGs consistently unprofitable across P#66-P#69
                # P#66: LONG -$247, P#68: LONG -$149, all patches negative
                # SHORT-only mode: block ALL LONGs
                # ============================================================
                if (not self._runtime_parity_enabled() and self.symbol == 'BTCUSDT' and
                    getattr(config, 'BTC_DIRECTION_FILTER_ENABLED', False)):
                    if final_action == 'BUY':
                        if getattr(config, 'BTC_LONG_BLOCK_ALL', False):
                            self._btc_long_blocked += 1
                            self._block('P#70 BTC: LONG blocked (SHORT-only mode)')
                            self._track_equity(row, candle_time)
                            continue
                
                # ============================================================
                # P#71 PHASE 24: NEWS/SENTIMENT FILTER
                # Event detection runs earlier (every candle, near Phase 22).
                # Here we only apply filtering to the current signal.
                # ============================================================
                if not self._runtime_parity_enabled() and getattr(config, 'NEWS_FILTER_ENABLED', False):
                    # Apply filtering to current signal
                    news_conf, news_blocked, news_reason = self.news_filter.filter_signal(
                        final_action, final_confidence, i
                    )
                    
                    if news_blocked:
                        self._news_blocked += 1
                        self._block(f'P#71 News: {news_reason}')
                        self._track_equity(row, candle_time)
                        continue
                    
                    if news_conf != final_confidence:
                        final_confidence = news_conf
                        # Re-check floor after news adjustment
                        if final_confidence < effective_floor:
                            self._block(f'Post-news confidence {final_confidence:.3f} < floor')
                            self._track_equity(row, candle_time)
                            continue
                
                # ============================================================                # PHASE 20: PRE-ENTRY MOMENTUM CONFIRMATION (PATCH #66)
                # Check last 2-3 candles — must align with signal direction
                # P#65: 16/19 losers had MaxR<0.40 = no pre-entry momentum
                # ============================================================
                if not self._runtime_parity_enabled() and getattr(config, 'PRE_ENTRY_MOMENTUM_ENABLED', False):
                    # Skip momentum check in RANGING (choppy candles)
                    ranging_exempt = getattr(
                        config, 'PRE_ENTRY_MOMENTUM_RANGING_EXEMPT', True)
                    skip_check = (ranging_exempt and current_regime == 'RANGING')
                    
                    if not skip_check:
                        self.phase_stats['phase_20'] = self.phase_stats.get('phase_20', 0) + 1
                        mom_candles = getattr(config, 'PRE_ENTRY_MOMENTUM_CANDLES', 3)
                        mom_min = getattr(config, 'PRE_ENTRY_MOMENTUM_MIN_ALIGNED', 2)
                        
                        if len(history) >= mom_candles:
                            recent = history.iloc[-mom_candles:]
                            aligned = 0
                            for _, c in recent.iterrows():
                                if final_action == 'BUY' and c['close'] > c['open']:
                                    aligned += 1
                                elif final_action == 'SELL' and c['close'] < c['open']:
                                    aligned += 1
                            
                            if aligned < mom_min:
                                self._pre_entry_blocked += 1
                                self._block(
                                    f'P#66 Pre-entry momentum: {aligned}/{mom_candles} '
                                    f'candles aligned (need {mom_min})')
                                self._track_equity(row, candle_time)
                                continue

                if (not self._runtime_parity_enabled() and
                    getattr(config, 'SHORT_EXHAUSTION_GATE_ENABLED', False) and
                    final_action == 'SELL' and
                    current_regime == 'TRENDING_DOWN'):
                    exhaustion_candles = getattr(config, 'SHORT_EXHAUSTION_MIN_RED_CANDLES', 3)
                    if len(history) >= exhaustion_candles:
                        recent = history.iloc[-exhaustion_candles:]
                        red_candles = sum(1 for _, c in recent.iterrows() if c['close'] < c['open'])
                        rsi = row.get('rsi_14', 50)
                        bb_pctb = row.get('bb_pctb', 0.5)
                        volume_ratio = row.get('volume_ratio', 1.0)
                        exhausted = (
                            red_candles >= exhaustion_candles and
                            volume_ratio >= getattr(config, 'SHORT_EXHAUSTION_MIN_VOLUME_RATIO', 1.8) and
                            (rsi <= getattr(config, 'SHORT_EXHAUSTION_MAX_RSI', 35) or
                             bb_pctb <= getattr(config, 'SHORT_EXHAUSTION_MAX_BBPCT', 0.05))
                        )
                        if exhausted:
                            self._block(
                                f'Short exhaustion gate: RSI {rsi:.1f}, BB%B {bb_pctb:.2f}, '
                                f'Vol {volume_ratio:.1f}x after {red_candles} red candles')
                            self._track_equity(row, candle_time)
                            continue

                # ============================================================
                # PHASE 9: EXECUTION
                # ============================================================
                self.phase_stats['phase_9'] += 1
                
                atr = row.get('atr', row['close'] * 0.01)
                side = 'LONG' if final_action == 'BUY' else 'SHORT'
                
                # PATCH #68: Dynamic SL per Regime
                # Adjust SL multiplier based on regime + side alignment
                sl_adj = q_result['sl_adjust']
                tp_adj = q_result['tp_adjust']
                ranging_entry = False
                is_grid_trade = False
                
                if getattr(config, 'DYNAMIC_SL_ENABLED', False):
                    dynamic_sl_mult = config.SL_ATR_MULT  # default
                    if current_regime == 'TRENDING_DOWN':
                        if side == 'SHORT':
                            dynamic_sl_mult = getattr(config, 'DYNAMIC_SL_TRENDING_DOWN_SHORT', 1.25)
                        else:
                            dynamic_sl_mult = getattr(config, 'DYNAMIC_SL_TRENDING_DOWN_LONG', 1.50)
                    elif current_regime == 'TRENDING_UP':
                        if side == 'LONG':
                            dynamic_sl_mult = getattr(config, 'DYNAMIC_SL_TRENDING_UP_LONG', 2.00)
                        else:
                            dynamic_sl_mult = getattr(config, 'DYNAMIC_SL_TRENDING_UP_SHORT', 1.25)
                    elif current_regime == 'RANGING':
                        dynamic_sl_mult = getattr(config, 'DYNAMIC_SL_RANGING', 0.60)
                    
                    # Apply dynamic SL as ratio vs base SL
                    sl_adj *= dynamic_sl_mult / config.SL_ATR_MULT
                
                if current_regime == 'RANGING' and getattr(config, 'RANGING_TRADE_ENABLED', False):
                    # PATCH #67: Grid Ranging overrides
                    if getattr(config, 'GRID_RANGING_ENABLED', False):
                        # Grid trades: use tight SL/TP
                        # PATCH #68: Skip grid SL override if Dynamic SL already applied
                        if not getattr(config, 'DYNAMIC_SL_ENABLED', False):
                            grid_sl = getattr(config, 'GRID_SL_ATR_MULT', 0.60)
                            sl_adj *= grid_sl / config.SL_ATR_MULT
                        grid_tp = getattr(config, 'GRID_TP_ATR_MULT', 0.80)
                        tp_adj *= grid_tp / config.TP_ATR_MULT
                        
                        # Grid cooldown check
                        cooldown = getattr(config, 'GRID_COOLDOWN_CANDLES', 8)
                        if (i - self._grid_last_entry_candle) < cooldown:
                            self._block('Grid cooldown active')
                            self._track_equity(row, candle_time)
                            continue
                        
                        self._grid_last_entry_candle = i
                        self._grid_trades += 1
                        is_grid_trade = True
                    else:
                        # Legacy RANGING overrides
                        ranging_sl = getattr(config, 'RANGING_SL_ATR_MULT', 1.0)
                        ranging_tp = getattr(config, 'RANGING_TP_ATR_MULT', 1.25)
                        sl_adj *= ranging_sl / config.SL_ATR_MULT
                        tp_adj *= ranging_tp / config.TP_ATR_MULT
                    # Small confidence boost for ranging entries
                    final_confidence += getattr(config, 'RANGING_CONFIDENCE_BOOST', 0)
                    ranging_entry = True
                    self._ranging_trades += 1
                
                # PATCH #67: Volatility Pause — reduce position size
                risk_mult = self.neuron.risk_multiplier
                if self._volatility_pause_active:
                    pause_mult = getattr(config, 'VOLATILITY_PAUSE_SIZE_MULT', 0.50)
                    risk_mult *= pause_mult
                
                # PATCH #67: Grid trades use half-size
                if is_grid_trade:
                    grid_risk_mult = getattr(config, 'GRID_RISK_MULT', 0.50)
                    risk_mult *= grid_risk_mult
                
                # PATCH #68: Adaptive position sizing
                if getattr(config, 'ADAPTIVE_SIZING_ENABLED', False):
                    risk_mult *= self._adaptive_size_mult
                
                opened = self.pm.open_position(
                    side=side,
                    price=row['close'],
                    atr=atr,
                    time=candle_time,
                    regime=current_regime,
                    sl_adjust=sl_adj,
                    tp_adjust=tp_adj,
                    risk_multiplier=risk_mult,
                    confidence=final_confidence,
                )
                
                if not opened:
                    self._block('Execution failed (fee gate / sizing)')
            
            # Track equity
            self._track_equity(row, candle_time)
        
        # Force close any open position at end
        if self.pm.position is not None:
            last_price = df.iloc[-1]['close']
            last_time = df.index[-1]
            self.pm.force_close(last_price, last_time, 'END')
            self._learn_from_last_trade(len(df) - 1)
        
        # P#71: Force close funding arb position at end
        if getattr(config, 'FUNDING_ARB_ENABLED', False):
            self.funding_arb.force_close(df.iloc[-1])
        
        return self._compute_results(df, timeframe)
    
    def _reset(self):
        """Reset all components for fresh run."""
        self.regime = RegimeDetector()
        self.quantum = self._create_quantum_backend()
        self.ml = MLSimulator()
        self.neuron = NeuronAISimulator()
        self.ensemble = EnsembleVoter()
        self.pm = PositionManager()
        self.pm.reset(self.initial_capital)
        
        # P#178: Extract GPU URL for ML engines
        gpu_url = self.quantum_backend_options.get('remote_url')
        
        # PATCH #58: Reset new components — P#178: pass gpu_url
        self.xgb_ml = XGBoostMLEngine(gpu_url=gpu_url)
        self.xgb_ml._current_symbol = self.symbol
        self.llm = LLMOverrideValidator()
        self.sentiment = SentimentAnalyzer()
        self._xgb_initialized = False
        
        # P#176: Reset MLP GPU — P#178: pass gpu_url
        self.mlp_gpu = TorchMLPEngine(gpu_url=gpu_url)
        self.mlp_gpu._current_symbol = self.symbol
        self._mlp_initialized = False
        
        # PATCH #59: Reset entry filter
        self.entry_filter = EntryQualityFilter()
        
        # PATCH #62: Reset Price Action engine
        self.price_action = PriceActionEngine()
        
        self.cycle_count = 0
        self.signal_log = []
        self.phase_stats = {f'phase_{i}': 0 for i in range(22)}
        self.blocked_reasons = {}
        self._long_filtered = 0
        self._ranging_trades = 0
        self._pre_entry_blocked = 0
        
        # PATCH #67: Volatility Pause
        self._consecutive_losses = 0
        self._volatility_pause_active = False
        self._volatility_pause_triggered_count = 0
        self._grid_last_entry_candle = -999
        self._grid_trades = 0
        
        # PATCH #68: Adaptive Position Sizing
        self._adaptive_size_mult = 1.0    # Current sizing multiplier
        self._signal_streak = 0           # Positive = wins, negative = losses
        self._signal_count_since_reset = 0
        
        # P#69: Pair-specific tracking
        self._bnb_long_blocked = 0
        self._bnb_long_passed = 0
        
        # P#70: BTC direction filter tracking
        self._btc_long_blocked = 0
        
        # P#71: New strategy modules reset
        self.funding_arb = FundingRateArbitrage(symbol=self.symbol)
        self.grid_v2 = GridV2Strategy(symbol=self.symbol)
        self.news_filter = NewsFilter(symbol=self.symbol)
        self._grid_v2_trades = 0
        self._grid_v2_pnl = 0
        self._news_blocked = 0
        # P#175: Momentum HTF reset
        self.momentum_htf = MomentumHTFStrategy(symbol=self.symbol)
        self._momentum_htf_trades = 0
        
        # PATCH #152C: External signals reset
        self.external_signals = ExternalSignalsSimulator()
        self._gpu_only_backtest = getattr(config, 'GPU_ONLY_BACKTEST', False)
        self._gpu_only_last_regime = 'RANGING'
        
    def _block(self, reason):
        """Record a blocked trade reason."""
        self.blocked_reasons[reason] = self.blocked_reasons.get(reason, 0) + 1
        
    def _track_equity(self, row, time):
        """Track equity curve."""
        unrealized = self.pm.get_unrealized_pnl(row['close'])
        self.pm.equity_curve.append({
            'time': time,
            'equity': self.pm.capital + unrealized,
            'capital': self.pm.capital,
        })
        
    def _learn_from_last_trade(self, candle_idx):
        """Trigger learning from the last closed trade."""
        if not self.pm.trades:
            return
        last_trade = self.pm.trades[-1]
        pnl = last_trade['net_pnl']
        hold_hours = last_trade['hold_hours']
        
        # Phase 13: Learning
        self.phase_stats['phase_13'] += 1
        self.neuron.learn_from_trade(pnl, candle_idx)
        self.ml.learn_from_trade(pnl, hold_hours)
        
        # PATCH #67: Volatility Pause — track consecutive signal-level losses
        # Only count when position is FULLY closed (no remaining quantity)
        if self.pm.position is None:
            # Group trades by entry_time to determine signal-level PnL
            entry_key = str(last_trade['entry_time'])
            signal_pnl = sum(
                t['net_pnl'] for t in self.pm.trades
                if str(t['entry_time']) == entry_key
            )
            if signal_pnl <= 0:
                self._consecutive_losses += 1
                if (getattr(config, 'VOLATILITY_PAUSE_ENABLED', False) and
                    self._consecutive_losses >= getattr(config, 'VOLATILITY_PAUSE_LOSS_STREAK', 3)):
                    self._volatility_pause_active = True
                    self._volatility_pause_triggered_count += 1
                
                # PATCH #68: Adaptive sizing — reduce after losing signal
                if getattr(config, 'ADAPTIVE_SIZING_ENABLED', False):
                    loss_mult = getattr(config, 'ADAPTIVE_SIZING_LOSS_MULT', 0.85)
                    min_mult = getattr(config, 'ADAPTIVE_SIZING_MIN_MULT', 0.50)
                    self._adaptive_size_mult = max(min_mult, self._adaptive_size_mult * loss_mult)
                    self._signal_count_since_reset += 1
            else:
                # Win resets the streak
                recovery_wins = getattr(config, 'VOLATILITY_PAUSE_RECOVERY_WINS', 1)
                self._consecutive_losses = 0
                if self._volatility_pause_active and recovery_wins <= 1:
                    self._volatility_pause_active = False
                
                # PATCH #68: Adaptive sizing — increase after winning signal
                if getattr(config, 'ADAPTIVE_SIZING_ENABLED', False):
                    win_mult = getattr(config, 'ADAPTIVE_SIZING_WIN_MULT', 1.15)
                    max_mult = getattr(config, 'ADAPTIVE_SIZING_MAX_MULT', 1.50)
                    self._adaptive_size_mult = min(max_mult, self._adaptive_size_mult * win_mult)
                    self._signal_count_since_reset += 1
            
            # PATCH #68: Reset adaptive sizing after N signals
            reset_after = getattr(config, 'ADAPTIVE_SIZING_RESET_AFTER', 5)
            if self._signal_count_since_reset >= reset_after:
                self._adaptive_size_mult = 1.0
                self._signal_count_since_reset = 0
        
    def _compute_results(self, df, timeframe):
        """Compute comprehensive results with all component stats."""
        trades = self.pm.trades
        quantum_stats = self.quantum.get_stats()
        quantum_summary = self._build_quantum_summary(quantum_stats)
        
        if not trades:
            # P#72 FIX: Include funding/grid/news stats even with 0 directional trades
            # ETH "pure funding" mode has 0 trades but collects funding income
            funding_pnl = self.funding_arb.get_net_pnl() if getattr(config, 'FUNDING_ARB_ENABLED', False) else 0
            return {
                'timeframe': timeframe,
                'total_trades': 0,
                'note': 'No directional trades — funding-only mode' if funding_pnl > 0 else 'No trades generated',
                'blocked_reasons': dict(self.blocked_reasons),
                'ensemble_stats': self.ensemble.get_stats(),
                'quantum_stats': quantum_stats,
                'quantum_summary': quantum_summary,
                # P#71 module stats — must be present even without directional trades
                'funding_arb_stats': self.funding_arb.get_stats() if getattr(config, 'FUNDING_ARB_ENABLED', False) else {'enabled': False},
                'grid_v2_stats': self.grid_v2.get_stats() if getattr(config, 'GRID_V2_ENABLED', False) else {'enabled': False},
                'news_filter_stats': self.news_filter.get_stats() if getattr(config, 'NEWS_FILTER_ENABLED', False) else {'enabled': False},
                'momentum_htf_stats': self.momentum_htf.get_stats() if getattr(config, 'MOMENTUM_HTF_ENABLED', False) else {'enabled': False},
                'grid_v2_trades': self._grid_v2_trades,
                'momentum_htf_trades': self._momentum_htf_trades,
                'news_blocked': self._news_blocked,
                'funding_arb_pnl': funding_pnl,
                # Directional metrics = 0 (no trades), funding tracked separately
                'net_profit': 0,
                'total_fees': 0,
                'initial_capital': self.initial_capital,
                'final_capital': round(self.pm.capital, 2),
                'total_return_pct': round(funding_pnl / self.initial_capital * 100, 2) if self.initial_capital > 0 else 0,
                'data_candles': len(df),
                'data_days': round((df.index[-1] - df.index[0]).total_seconds() / 86400, 1),
                'data_range': f"{df.index[0]} → {df.index[-1]}",
                'winning_trades': 0,
                'losing_trades': 0,
                'win_rate': 0,
                'profit_factor': 0,
                'sharpe_ratio': 0,
                'max_drawdown': 0,
                'avg_trade_pnl': 0,
                'avg_win': 0,
                'avg_loss': 0,
                'win_loss_ratio': 0,
                'largest_win': 0,
                'largest_loss': 0,
                'avg_hold_hours': 0,
                'fees_pct_of_pnl': 0,
                'trades_per_day': 0,
                'trades_list': [],
            }
        
        # === TRADE METRICS ===
        wins = [t for t in trades if t['net_pnl'] > 0]
        losses = [t for t in trades if t['net_pnl'] <= 0]
        
        gross_profit = sum(t['net_pnl'] for t in wins) if wins else 0
        gross_loss = abs(sum(t['net_pnl'] for t in losses)) if losses else 0
        net_profit = sum(t['net_pnl'] for t in trades)
        total_fees = sum(t['fees'] for t in trades)
        
        returns = [t['return_pct'] for t in trades]
        avg_return = np.mean(returns)
        std_return = np.std(returns) if len(returns) > 1 else 1
        
        days_in_test = (df.index[-1] - df.index[0]).total_seconds() / 86400
        trades_per_day = len(trades) / max(days_in_test, 1)
        sharpe = (avg_return / (std_return + 1e-10)) * np.sqrt(252 * max(trades_per_day, 0.1))
        
        pf = gross_profit / gross_loss if gross_loss > 0 else (999 if gross_profit > 0 else 0)
        
        avg_win = np.mean([t['net_pnl'] for t in wins]) if wins else 0
        avg_loss = abs(np.mean([t['net_pnl'] for t in losses])) if losses else 1
        wl_ratio = avg_win / avg_loss if avg_loss > 0 else 0
        
        # Wasted winners
        wasted = [t for t in trades if t.get('max_r_reached', 0) >= 1.0 and t['net_pnl'] <= 0]
        
        # Exit reason breakdown
        exit_reasons = {}
        for t in trades:
            r = t['reason']
            exit_reasons[r] = exit_reasons.get(r, 0) + 1
            
        # Phase distribution
        phase_exits = {}
        for t in trades:
            p = t.get('phase', 0)
            phase_exits[f'phase_{p}'] = phase_exits.get(f'phase_{p}', 0) + 1
            
        # Regime distribution 
        regime_trades = {}
        for t in trades:
            r = t.get('regime', 'UNKNOWN')
            if r not in regime_trades:
                regime_trades[r] = {'count': 0, 'pnl': 0, 'wins': 0}
            regime_trades[r]['count'] += 1
            regime_trades[r]['pnl'] += t['net_pnl']
            if t['net_pnl'] > 0:
                regime_trades[r]['wins'] += 1
        for r in regime_trades:
            regime_trades[r]['win_rate'] = round(
                regime_trades[r]['wins'] / max(regime_trades[r]['count'], 1) * 100, 1)
            regime_trades[r]['pnl'] = round(regime_trades[r]['pnl'], 2)
        
        # Long vs Short breakdown
        long_trades = [t for t in trades if t['side'] == 'LONG']
        short_trades = [t for t in trades if t['side'] == 'SHORT']
        long_wins = sum(1 for t in long_trades if t['net_pnl'] > 0)
        short_wins = sum(1 for t in short_trades if t['net_pnl'] > 0)
        
        # PATCH #65: Signal-level metrics (group by entry_time)
        # Multiple trades from same entry (partials) = ONE signal
        signals_by_entry = {}
        for t in trades:
            key = str(t['entry_time'])
            if key not in signals_by_entry:
                signals_by_entry[key] = {'pnl': 0, 'count': 0, 'side': t['side']}
            signals_by_entry[key]['pnl'] += t['net_pnl']
            signals_by_entry[key]['count'] += 1
        
        signal_count = len(signals_by_entry)
        signal_wins = sum(1 for s in signals_by_entry.values() if s['pnl'] > 0)
        signal_losses = sum(1 for s in signals_by_entry.values() if s['pnl'] <= 0)
        signal_wr = round(signal_wins / max(signal_count, 1) * 100, 1)
        signal_win_pnls = [s['pnl'] for s in signals_by_entry.values() if s['pnl'] > 0]
        signal_loss_pnls = [abs(s['pnl']) for s in signals_by_entry.values() if s['pnl'] <= 0]
        signal_avg_win = round(np.mean(signal_win_pnls), 2) if signal_win_pnls else 0
        signal_avg_loss = round(np.mean(signal_loss_pnls), 2) if signal_loss_pnls else 1
        signal_wl = round(signal_avg_win / signal_avg_loss, 2) if signal_avg_loss > 0 else 0
        
        return {
            'timeframe': timeframe,
            'data_candles': len(df),
            'data_days': round(days_in_test, 1),
            'data_range': f"{df.index[0]} → {df.index[-1]}",
            
            # Core metrics
            'total_trades': len(trades),
            'winning_trades': len(wins),
            'losing_trades': len(losses),
            'win_rate': round(len(wins) / len(trades) * 100, 1),
            'profit_factor': round(pf, 3),
            'sharpe_ratio': round(sharpe, 3),
            'max_drawdown': round(self.pm.max_drawdown * 100, 2),
            'net_profit': round(net_profit, 2),
            'total_return_pct': round(net_profit / self.initial_capital * 100, 2),
            'initial_capital': self.initial_capital,
            'final_capital': round(self.pm.capital, 2),
            
            # Trade quality
            'avg_trade_pnl': round(net_profit / len(trades), 2),
            'avg_win': round(avg_win, 2),
            'avg_loss': round(np.mean([t['net_pnl'] for t in losses]), 2) if losses else 0,
            'win_loss_ratio': round(wl_ratio, 2),
            'largest_win': round(max(t['net_pnl'] for t in trades), 2),
            'largest_loss': round(min(t['net_pnl'] for t in trades), 2),
            'avg_hold_hours': round(np.mean([t['hold_hours'] for t in trades]), 1),
            'total_fees': round(total_fees, 2),
            'fees_pct_of_pnl': round(total_fees / abs(net_profit) * 100, 1) if net_profit != 0 else 0,
            'trades_per_day': round(trades_per_day, 1),
            
            # Wasted winners
            'wasted_winners': len(wasted),
            'wasted_pct': round(len(wasted) / len(trades) * 100, 1),
            
            # Directional
            'long_trades': len(long_trades),
            'long_win_rate': round(long_wins / max(len(long_trades), 1) * 100, 1),
            'long_pnl': round(sum(t['net_pnl'] for t in long_trades), 2),
            'short_trades': len(short_trades),
            'short_win_rate': round(short_wins / max(len(short_trades), 1) * 100, 1),
            'short_pnl': round(sum(t['net_pnl'] for t in short_trades), 2),
            
            # Exit analysis
            'exit_reasons': exit_reasons,
            'phase_exits': phase_exits,
            
            # Regime analysis
            'regime_distribution': self.regime.get_regime_stats(),
            'regime_trades': regime_trades,
            
            # Component stats
            'ensemble_stats': self.ensemble.get_stats(),
            'quantum_stats': quantum_stats,
            'quantum_summary': quantum_summary,
            'ml_stats': self.ml.get_stats(),
            'neuron_stats': self.neuron.get_stats(),
            
            # PATCH #58: New component stats
            'xgboost_stats': self.xgb_ml.get_stats(),
            'llm_stats': self.llm.get_stats(),
            'sentiment_stats': self.sentiment.get_stats(),
            
            # P#176: MLP GPU stats
            'mlp_gpu_stats': self.mlp_gpu.get_stats(),
            
            # PATCH #152C: External signals stats
            'external_signals_stats': self.external_signals.get_stats(),
            
            # PATCH #59: Entry quality stats
            'entry_quality_stats': self.entry_filter.get_stats(),
            
            # PATCH #62: Price Action stats
            'price_action_stats': self.price_action.get_stats(),
            
            # PATCH #63: Long trend filter stats
            'long_trend_filtered': self._long_filtered,
            
            # PATCH #65: Signal-level metrics
            'signal_count': signal_count,
            'signal_win_rate': signal_wr,
            'signal_wins': signal_wins,
            'signal_losses': signal_losses,
            'signal_avg_win': signal_avg_win,
            'signal_avg_loss': signal_avg_loss,
            'signal_wl_ratio': signal_wl,
            
            # PATCH #65: Momentum gate stats
            'momentum_gate_checked': self.pm.momentum_gate_checked,
            'momentum_gate_tightened': self.pm.momentum_gate_tightened,
            
            # PATCH #65: RANGING micro-scalp stats  
            'ranging_trades_opened': self._ranging_trades,
            
            # PATCH #66: Pre-entry momentum stats
            'pre_entry_momentum_blocked': self._pre_entry_blocked,
            
            # PATCH #67: Volatility Pause + Grid stats
            'volatility_pause_triggered': self._volatility_pause_triggered_count,
            'volatility_pause_active': self._volatility_pause_active,
            'consecutive_losses_final': self._consecutive_losses,
            'grid_trades': self._grid_trades,
            
            # PATCH #68: Adaptive sizing + RANGING bypass stats
            'adaptive_size_mult_final': round(self._adaptive_size_mult, 3),
            'dynamic_sl_enabled': getattr(config, 'DYNAMIC_SL_ENABLED', False),
            'ranging_bypass_enabled': getattr(config, 'RANGING_BYPASS_ENABLED', False),
            
            # P#69: Pair-specific stats
            'bnb_long_blocked': self._bnb_long_blocked,
            'bnb_long_passed': self._bnb_long_passed,
            
            # P#70: BTC direction filter stats
            'btc_long_blocked': self._btc_long_blocked,
            
            # P#71: New strategy module stats
            'funding_arb_stats': self.funding_arb.get_stats() if getattr(config, 'FUNDING_ARB_ENABLED', False) else {'enabled': False},
            'grid_v2_stats': self.grid_v2.get_stats() if getattr(config, 'GRID_V2_ENABLED', False) else {'enabled': False},
            'news_filter_stats': self.news_filter.get_stats() if getattr(config, 'NEWS_FILTER_ENABLED', False) else {'enabled': False},
            'momentum_htf_stats': self.momentum_htf.get_stats() if getattr(config, 'MOMENTUM_HTF_ENABLED', False) else {'enabled': False},
            'grid_v2_trades': self._grid_v2_trades,
            'momentum_htf_trades': self._momentum_htf_trades,
            'news_blocked': self._news_blocked,
            'funding_arb_pnl': self.funding_arb.get_net_pnl() if getattr(config, 'FUNDING_ARB_ENABLED', False) else 0,
            'gate_profile': self.gate_profile,
            
            # Blocked trades
            'blocked_reasons': dict(self.blocked_reasons),
            'total_blocked': sum(self.blocked_reasons.values()),
            
            # QPM
            'qpm_adjustments': self.pm.qpm_adjustments,
            'partials_executed': self.pm.partials_executed,
            'avg_health_score': round(np.mean(self.pm.health_scores), 1) if self.pm.health_scores else 0,
            
            # PATCH #64: Full trade list for analysis
            'trades_list': [{
                'id': i + 1,
                'side': t['side'],
                'entry_time': str(t['entry_time']),
                'exit_time': str(t['exit_time']),
                'entry_price': round(t['entry_price'], 2),
                'exit_price': round(t['exit_price'], 2),
                'quantity': round(t['quantity'], 6),
                'gross_pnl': round(t['gross_pnl'], 2),
                'net_pnl': round(t['net_pnl'], 2),
                'fees': round(t['fees'], 2),
                'return_pct': round(t['return_pct'] * 100, 3),
                'reason': t['reason'],
                'hold_hours': round(t['hold_hours'], 2),
                'max_r': round(t.get('max_r_reached', 0), 3),
                'phase': t.get('phase', 0),
                'regime': t.get('regime', 'UNKNOWN'),
                'confidence': round(t.get('confidence', 0), 3),
            } for i, t in enumerate(trades)],
        }

    def _build_quantum_summary(self, quantum_stats):
        backend = quantum_stats.get('backend', self.quantum_backend)
        remote_qmc_calls = int(quantum_stats.get('remote_qmc_calls', 0) or 0)
        remote_qaoa_calls = int(quantum_stats.get('remote_qaoa_calls', 0) or 0)
        remote_vqc_calls = int(quantum_stats.get('remote_vqc_calls', 0) or 0)
        remote_calls_total = remote_qmc_calls + remote_qaoa_calls + remote_vqc_calls
        remote_failures = int(quantum_stats.get('remote_failures', 0) or 0)
        verify_qmc_samples = int(quantum_stats.get('verify_qmc_samples', 0) or 0)
        verify_regime_samples = int(quantum_stats.get('verify_regime_samples', 0) or 0)
        verify_qaoa_samples = int(quantum_stats.get('verify_qaoa_samples', 0) or 0)
        verify_samples_total = verify_qmc_samples + verify_regime_samples + verify_qaoa_samples

        def average_ms(total_key, calls):
            total_ms = float(quantum_stats.get(total_key, 0.0) or 0.0)
            return round(total_ms / calls, 2) if calls > 0 else None

        failure_base = remote_calls_total + remote_failures
        remote_failure_rate = round(remote_failures / failure_base, 4) if failure_base > 0 else 0.0

        return {
            'backend': backend,
            'remote_enabled': backend in ('remote-gpu', 'hybrid-verify'),
            'remote_url': quantum_stats.get('remote_url'),
            'remote_status': quantum_stats.get('health_status', 'n/a' if backend == 'simulated' else 'unknown'),
            'remote_calls_total': remote_calls_total,
            'remote_failures': remote_failures,
            'remote_failure_rate': remote_failure_rate,
            'remote_avg_qmc_ms': average_ms('remote_qmc_compute_ms', remote_qmc_calls),
            'remote_avg_qaoa_ms': average_ms('remote_qaoa_compute_ms', remote_qaoa_calls),
            'remote_avg_vqc_ms': average_ms('remote_vqc_compute_ms', remote_vqc_calls),
            'verify_enabled': backend == 'hybrid-verify',
            'verify_sample_rate': float(quantum_stats.get('verify_sample_rate', 0.0) or 0.0),
            'verify_samples_total': verify_samples_total,
            'verify_qmc_match_rate': quantum_stats.get('verify_qmc_match_rate'),
            'verify_regime_match_rate': quantum_stats.get('verify_regime_match_rate'),
            'verify_avg_qaoa_corr': quantum_stats.get('verify_avg_qaoa_corr'),
            'last_remote_regime': quantum_stats.get('last_remote_regime'),
            'last_remote_regime_confidence': quantum_stats.get('last_remote_regime_confidence'),
        }

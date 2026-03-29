"""
TURBO-BOT Full Pipeline Backtest — NeuronAI + PRIME Gate Simulation
Simulates LLM decision-making, safety constraints, defense mode.
"""

import numpy as np
from . import config


class NeuronAISimulator:
    """
    Simulates NeuronAI Manager:
      - LLM decision fallback logic (no actual LLM calls)
      - PRIME Gate validation (7 rules)
      - Defense mode management
      - Evolution tracking
      - Confidence adjustment
    """
    
    def __init__(self):
        # Decision tracking
        self.total_decisions = 0
        self.override_count = 0
        self.hold_count = 0
        
        # Defense mode
        self.defense_mode = False
        self.defense_mode_start = 0
        self.consecutive_losses = 0
        self.loss_streak_max = 0
        
        # Win/Loss tracking
        self.win_count = 0
        self.loss_count = 0
        self.recent_pnls = []
        
        # Evolution
        self.risk_multiplier = 1.0
        self.confidence_threshold = 0.35
        self.aggression_level = 1.0
        self.evolution_count = 0
        
        # PRIME rejections
        self.prime_rejections = {
            'drawdown': 0,
            'duplicate': 0,
            'counter_trend': 0,
            'defense_mode': 0,
            'loss_streak': 0,
        }
        
        # Cooldown
        self._last_trade_candle = -999
        
    def validate_prime_gate(self, consensus_action, confidence, regime, 
                            drawdown, candle_idx, mtf_bias=None,
                            is_grid_signal=False):
        """
        PRIME Gate — 7 validation rules before execution.
        
        P#209b: PRIME_WARN_MODE — when True, hard blocks become soft warnings.
        Trade still passes but with warnings logged for analysis.
        
        Returns:
            dict: {passed: bool, reason: str, adjusted_confidence: float, warnings: list}
        """
        adjusted_conf = confidence
        prime_warn = getattr(config, 'PRIME_WARN_MODE', False)
        warnings = []
        
        # PATCH #68: Determine effective confidence floor for RANGING bypass
        if is_grid_signal and regime == 'RANGING' and getattr(config, 'RANGING_BYPASS_ENABLED', False):
            effective_floor = getattr(config, 'RANGING_CONFIDENCE_FLOOR', 0.12)
        else:
            effective_floor = config.CONFIDENCE_FLOOR
        
        # Rule 1: Drawdown block
        if drawdown > config.PRIME_DRAWDOWN_BLOCK:
            self.prime_rejections['drawdown'] += 1
            if not prime_warn:
                return {
                    'passed': False,
                    'reason': f'Drawdown {drawdown*100:.1f}% > {config.PRIME_DRAWDOWN_BLOCK*100}%',
                    'adjusted_confidence': 0,
                    'warnings': [],
                }
            warnings.append(f'WARN_R1: Drawdown {drawdown*100:.1f}% > {config.PRIME_DRAWDOWN_BLOCK*100}%')
        
        # Rule 2: Duplicate prevention (min candle gap)
        candle_gap = candle_idx - self._last_trade_candle
        # Convert MIN_HOLD_COOLDOWN_MIN to candle count (approximate)
        min_candle_gap = 4  # ~15 min / ~4 min per candle on 15m ≈ 1, but use 4 as safety
        if candle_gap < min_candle_gap:
            self.prime_rejections['duplicate'] += 1
            if not prime_warn:
                return {
                    'passed': False,
                    'reason': f'Duplicate prevention: {candle_gap} candles since last trade',
                    'adjusted_confidence': 0,
                    'warnings': [],
                }
            warnings.append(f'WARN_R2: Duplicate prevention: {candle_gap} candles since last trade')
        
        # Rule 3: Counter-trend block
        # PATCH #57D: Block shorts in TRENDING_UP, longs in TRENDING_DOWN
        if regime:
            is_counter = (
                (consensus_action == 'BUY' and regime == 'TRENDING_DOWN') or
                (consensus_action == 'SELL' and regime == 'TRENDING_UP')
            )
            if is_counter:
                if getattr(config, 'PRIME_COUNTER_TREND_HARD_BLOCK', True):
                    self.prime_rejections['counter_trend'] += 1
                    if not prime_warn:
                        return {
                            'passed': False,
                            'reason': f'Counter-trend: {consensus_action} in {regime}',
                            'adjusted_confidence': 0,
                            'warnings': [],
                        }
                    warnings.append(f'WARN_R3: Counter-trend: {consensus_action} in {regime}')
                else:
                    adjusted_conf *= getattr(config, 'PRIME_COUNTER_TREND_CONF_MULT', 0.72)
                    min_conf = getattr(config, 'PRIME_COUNTER_TREND_MIN_CONF', effective_floor)
                    required_conf = max(effective_floor, min_conf)
                    if adjusted_conf < required_conf:
                        self.prime_rejections['counter_trend'] += 1
                        if not prime_warn:
                            return {
                                'passed': False,
                                'reason': f'Counter-trend confidence {adjusted_conf:.2f} below {required_conf:.2f}',
                                'adjusted_confidence': 0,
                                'warnings': [],
                            }
                        warnings.append(f'WARN_R3: Counter-trend conf {adjusted_conf:.2f} < {required_conf:.2f}')
        
        # Rule 4: Defense mode adjustment
        # PATCH #57G: Cap at floor instead of blocking (fix confidence death spiral)
        # Defense mode now reduces position size via risk_multiplier, not blocks trades
        if self.defense_mode:
            if consensus_action in ('BUY', 'SELL'):
                adjusted_conf *= config.LLM_DEFENSE_CONF_MULT
                adjusted_conf = min(adjusted_conf, config.LLM_DEFENSE_CONF_CAP)
                if adjusted_conf < effective_floor:
                    # Cap at floor — trade passes with minimum confidence
                    # Risk reduction handled by self.risk_multiplier already
                    self.prime_rejections['defense_mode'] += 1
                    adjusted_conf = effective_floor
        
        # Rule 5: Loss streak hold
        if self.consecutive_losses >= config.LLM_LOSS_STREAK_HOLD:
            self.prime_rejections['loss_streak'] += 1
            if not prime_warn:
                return {
                    'passed': False,
                    'reason': f'Loss streak {self.consecutive_losses} >= {config.LLM_LOSS_STREAK_HOLD}',
                    'adjusted_confidence': 0,
                    'warnings': [],
                }
            warnings.append(f'WARN_R5: Loss streak {self.consecutive_losses} >= {config.LLM_LOSS_STREAK_HOLD}')
        
        # Rule 6: Confidence floor
        # PATCH #68: Use effective_floor (lower for RANGING grid signals)
        if adjusted_conf < effective_floor:
            if not prime_warn:
                return {
                    'passed': False,
                    'reason': f'Confidence {adjusted_conf:.2f} < floor {effective_floor}',
                    'adjusted_confidence': 0,
                    'warnings': [],
                }
            warnings.append(f'WARN_R6: Confidence {adjusted_conf:.2f} < floor {effective_floor}')
            adjusted_conf = effective_floor  # Promote to floor in WARN mode
        
        # Rule 7: Regime-based confidence dampening
        # PATCH #68: Skip RANGING dampening for grid signals (they need confidence preserved)
        if regime == 'RANGING':
            if not is_grid_signal:
                adjusted_conf *= 0.80  # Moderate dampening for non-grid RANGING signals
        elif regime == 'HIGH_VOLATILITY':
            adjusted_conf *= 0.90
            
        adjusted_conf = max(config.CONFIDENCE_CLAMP_MIN, 
                          min(config.CONFIDENCE_CLAMP_MAX, adjusted_conf))
        
        reason = 'All PRIME gates passed'
        if warnings:
            reason = f'PRIME WARN MODE — {len(warnings)} warnings: {"; ".join(warnings)}'
        
        return {
            'passed': True,
            'reason': reason,
            'adjusted_confidence': adjusted_conf,
            'warnings': warnings,
        }
    
    def make_decision(self, consensus, signals, regime, drawdown, 
                      candle_idx, ml_signal=None):
        """
        Simulate NeuronAI LLM decision (using fallback logic).
        
        In production, this calls GPT-4o/Grok. In backtest, we use the
        fallback decision tree that matches production behavior.
        
        Returns:
            dict: {action, confidence, reason, overridden}
        """
        self.total_decisions += 1
        
        action = consensus.get('action', 'HOLD') if consensus else 'HOLD'
        confidence = consensus.get('confidence', 0) if consensus else 0
        
        # === FALLBACK DECISION LOGIC (matches neuron_ai_manager.js) ===
        
        # High drawdown → prefer CLOSE
        if drawdown > 0.15:
            if action in ('BUY', 'SELL'):
                self.override_count += 1
                return {
                    'action': 'HOLD',
                    'confidence': 0,
                    'reason': f'High drawdown {drawdown*100:.1f}% — hold',
                    'overridden': True,
                }
        
        # Strong ML signal can override weak ensemble
        if ml_signal and ml_signal['confidence'] > 0.75:
            ml_action = ml_signal['action']
            if ml_action != 'HOLD' and action == 'HOLD':
                # ML overrides ensemble HOLD
                if self._check_regime_alignment(ml_action, regime):
                    self.override_count += 1
                    return {
                        'action': ml_action,
                        'confidence': ml_signal['confidence'] * 0.85,
                        'reason': f'ML override: {ml_action} (ML conf={ml_signal["confidence"]:.2f})',
                        'overridden': True,
                    }
        
        # Defense mode: block aggressive trading
        if self.defense_mode and action in ('BUY', 'SELL'):
            confidence *= config.LLM_DEFENSE_CONF_MULT
            if confidence < config.CONFIDENCE_FLOOR:
                self.hold_count += 1
                return {
                    'action': 'HOLD',
                    'confidence': 0,
                    'reason': 'Defense mode — blocking trade',
                    'overridden': True,
                }
        
        # Pass through ensemble decision
        return {
            'action': action,
            'confidence': confidence,
            'reason': 'Ensemble consensus accepted',
            'overridden': False,
        }
    
    def learn_from_trade(self, pnl, candle_idx):
        """
        Learn from trade outcome — update defense mode, evolution.
        """
        self.recent_pnls.append(pnl)
        if len(self.recent_pnls) > 50:
            self.recent_pnls.pop(0)
            
        if pnl > 0:
            self.win_count += 1
            self.consecutive_losses = 0
            # Exit defense mode on win
            if self.defense_mode:
                self.defense_mode = False
        else:
            self.loss_count += 1
            self.consecutive_losses += 1
            if self.consecutive_losses > self.loss_streak_max:
                self.loss_streak_max = self.consecutive_losses
            
            # Enter defense mode
            if self.consecutive_losses >= config.DEFENSE_MODE_TRIGGER_LOSSES:
                self.defense_mode = True
                self.defense_mode_start = candle_idx
                
        # Record last trade for cooldown
        self._last_trade_candle = candle_idx
        
        # Param evolution every 5 trades
        total_trades = self.win_count + self.loss_count
        if total_trades % 5 == 0 and total_trades > 0:
            self._evolve_params()
    
    def _evolve_params(self):
        """
        Global parameter evolution (matches adaptive_neural_engine.js).
        Kelly-based risk sizing, aggression ramp/decay.
        """
        self.evolution_count += 1
        total = self.win_count + self.loss_count
        if total < 5:
            return
            
        win_rate = self.win_count / total
        
        # Recent performance affects aggression
        recent = self.recent_pnls[-10:] if len(self.recent_pnls) >= 10 else self.recent_pnls
        recent_wr = sum(1 for p in recent if p > 0) / max(len(recent), 1)
        
        # Kelly-like risk adjustment
        if recent_wr > 0.55:
            self.risk_multiplier = min(1.5, self.risk_multiplier * 1.05)
            self.aggression_level = min(2.0, self.aggression_level * 1.03)
        elif recent_wr < 0.35:
            self.risk_multiplier = max(0.5, self.risk_multiplier * 0.92)
            self.aggression_level = max(0.5, self.aggression_level * 0.95)
            
        # Confidence threshold evolution
        if recent_wr > 0.50:
            self.confidence_threshold = max(0.25, self.confidence_threshold - 0.005)
        else:
            self.confidence_threshold = min(0.45, self.confidence_threshold + 0.005)
    
    def _check_regime_alignment(self, action, regime):
        """Check if action aligns with regime."""
        if action == 'BUY' and regime == 'TRENDING_DOWN':
            return not getattr(config, 'PRIME_COUNTER_TREND_HARD_BLOCK', True)
        if action == 'SELL' and regime == 'TRENDING_UP':
            return not getattr(config, 'PRIME_COUNTER_TREND_HARD_BLOCK', True)
        return True
    
    def get_stats(self):
        """Get NeuronAI statistics."""
        total = self.win_count + self.loss_count
        return {
            'total_decisions': self.total_decisions,
            'overrides': self.override_count,
            'holds': self.hold_count,
            'trades': total,
            'win_rate': round(self.win_count / max(total, 1) * 100, 1),
            'loss_streak_max': self.loss_streak_max,
            'defense_activations': sum(self.prime_rejections.values()),
            'prime_rejections': dict(self.prime_rejections),
            'evolution_count': self.evolution_count,
            'risk_multiplier': round(self.risk_multiplier, 3),
            'aggression': round(self.aggression_level, 3),
            'confidence_threshold': round(self.confidence_threshold, 3),
        }

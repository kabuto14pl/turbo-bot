"""
TURBO-BOT Full Pipeline Backtest — Ensemble Voting
Weighted consensus across 5 strategies + ML + NeuralAI.
"""

import numpy as np
from . import config


class EnsembleVoter:
    """
    Simulates ensemble-voting.js:
      - Static weights with Thompson Sampling blend
      - Conflict detection
      - Strong conviction detection
      - MTF counter-trend blocking
      - Dynamic threshold selection
    """
    
    def __init__(self):
        self.weights = dict(config.STATIC_WEIGHTS)
        self.ai_weights = None
        self.vote_count = 0
        self.consensus_count = 0
        self.no_consensus_count = 0
        self.conflict_count = 0
        
    def update_weights(self, qaoa_weights=None, thompson_weights=None):
        """
        Update ensemble weights from QAOA and/or Thompson Sampling.
        Blend: 60% AI + 40% static.
        """
        if qaoa_weights:
            blend = config.THOMPSON_AI_BLEND
            blended = {}
            for name in config.STATIC_WEIGHTS:
                static = config.STATIC_WEIGHTS[name]
                ai = qaoa_weights.get(name, static)
                blended[name] = blend * ai + (1 - blend) * static
            # Normalize
            total = sum(blended.values())
            if total > 0:
                self.weights = {k: v / total for k, v in blended.items()}
            self.ai_weights = qaoa_weights
            
    def vote(self, signals, regime=None, ml_signal=None):
        """
        Perform ensemble voting.
        
        Args:
            signals: dict {strategy_name: {action, confidence}}
            regime: Current market regime
            ml_signal: ML prediction {action, confidence}
            
        Returns:
            dict: {action, confidence, strategies, threshold_used} or None
        """
        self.vote_count += 1
        
        # Add ML signal if available
        all_signals = dict(signals)
        if ml_signal and ml_signal['action'] != 'HOLD':
            all_signals['PythonML'] = ml_signal
        
        # Aggregate weighted votes
        votes = {'BUY': 0, 'SELL': 0, 'HOLD': 0}
        contributing_strategies = {'BUY': [], 'SELL': [], 'HOLD': []}
        
        for name, sig in all_signals.items():
            action = sig.get('action', 'HOLD')
            conf = sig.get('confidence', 0)
            weight = self.weights.get(name, 0.05)  # Default small weight
            
            if action == 'HOLD' or conf < 0.10:
                votes['HOLD'] += weight
                contributing_strategies['HOLD'].append(name)
            else:
                votes[action] += weight * conf
                contributing_strategies[action].append(name)
        
        # Determine threshold
        buy_vote = votes['BUY']
        sell_vote = votes['SELL']
        
        # Conflict detection
        is_conflict = buy_vote > 0.25 and sell_vote > 0.25
        if is_conflict:
            self.conflict_count += 1
            
        # Strong conviction detection
        active_signals = [s for s in all_signals.values() 
                         if s.get('action', 'HOLD') != 'HOLD']
        has_strong = any(s.get('confidence', 0) > 0.70 for s in active_signals)
        many_agree = len(active_signals) >= 3
        
        if is_conflict:
            threshold = config.ENSEMBLE_THRESHOLD_CONFLICT
        elif has_strong and many_agree:
            threshold = config.ENSEMBLE_THRESHOLD_STRONG
        else:
            threshold = config.ENSEMBLE_THRESHOLD_NORMAL
        
        # PATCH #66: Lower threshold in RANGING for mean-reversion signals
        if regime == 'RANGING':
            ranging_threshold = getattr(
                config, 'ENSEMBLE_THRESHOLD_RANGING', 0.10)
            threshold = min(threshold, ranging_threshold)
            
        # Determine winner
        if buy_vote > sell_vote and buy_vote >= threshold:
            action = 'BUY'
            raw_conf = buy_vote
        elif sell_vote > buy_vote and sell_vote >= threshold:
            action = 'SELL'
            raw_conf = sell_vote
        else:
            self.no_consensus_count += 1
            return None  # No consensus
        
        # Calculate confidence
        confidence = min(config.CONFIDENCE_CLAMP_MAX,
                        max(config.CONFIDENCE_CLAMP_MIN, raw_conf))
        
        # PATCH #68: RANGING grid confidence boost
        # When BollingerMR fires in RANGING, ensemble confidence ≈ 0.15
        # Boost it to pass confidence floor checks downstream
        is_grid_signal = False
        if regime == 'RANGING' and getattr(config, 'RANGING_BYPASS_ENABLED', False):
            if 'BollingerMR' in contributing_strategies.get(action, []):
                grid_boost = getattr(config, 'RANGING_GRID_CONFIDENCE_BOOST', 0.08)
                confidence += grid_boost
                confidence = min(config.CONFIDENCE_CLAMP_MAX, confidence)
                is_grid_signal = True
        
        # Counter-trend penalty
        if regime:
            if (action == 'BUY' and regime == 'TRENDING_DOWN') or \
               (action == 'SELL' and regime == 'TRENDING_UP'):
                confidence *= getattr(config, 'ENSEMBLE_COUNTER_TREND_CONF_MULT', 0.55)
                if confidence < threshold:
                    self.no_consensus_count += 1
                    return None
                    
            # Aligned boost
            if (action == 'BUY' and regime == 'TRENDING_UP') or \
               (action == 'SELL' and regime == 'TRENDING_DOWN'):
                boost = getattr(config, 'ENSEMBLE_TREND_ALIGNED_CONF_MULT', 1.10)
                confidence = min(config.CONFIDENCE_CLAMP_MAX, confidence * boost)
        
        self.consensus_count += 1
        
        return {
            'action': action,
            'confidence': round(confidence, 3),
            'strategies': contributing_strategies[action],
            'threshold_used': threshold,
            'buy_vote': round(buy_vote, 3),
            'sell_vote': round(sell_vote, 3),
            'is_conflict': is_conflict,
            'is_grid_signal': is_grid_signal,
        }
    
    def get_stats(self):
        """Get ensemble voting statistics."""
        return {
            'total_votes': self.vote_count,
            'consensus': self.consensus_count,
            'no_consensus': self.no_consensus_count,
            'conflicts': self.conflict_count,
            'consensus_rate': round(self.consensus_count / max(self.vote_count, 1) * 100, 1),
            'current_weights': {k: round(v, 3) for k, v in self.weights.items()},
        }

"""
TURBO-BOT Full Pipeline Backtest — ML Prediction Simulator
Simulates EnterpriseML + PythonML (XGBoost/LightGBM ensemble) predictions.
"""

import numpy as np
from . import config


class MLSimulator:
    """
    Simulates ML prediction components:
      - EnterpriseML (DeepRL agent): prediction based on recent price action
      - PythonML (XGBoost+LightGBM): higher accuracy, candle patterns included
      - ML Hard/Soft Veto logic
    """
    
    def __init__(self):
        self.prediction_count = 0
        self.correct_predictions = 0
        self.total_predictions = 0
        self.recent_accuracy = []
        self.veto_hard_count = 0
        self.veto_soft_count = 0
        
    def predict(self, row, history_df, regime):
        """
        Generate ML prediction signal.
        
        Returns:
            dict: {action, confidence, source, veto_info}
        """
        self.prediction_count += 1
        
        # === Feature extraction (simulating 61-feature pipeline) ===
        close = row['close']
        rsi = row.get('rsi_14', 50)
        macd_hist = row.get('macd_hist', 0)
        bb_pctb = row.get('bb_pctb', 0.5)
        adx = row.get('adx', 20)
        volume_ratio = row.get('volume_ratio', 1.0)
        atr_pct = row.get('atr_pct', 0.01)
        roc = row.get('roc_10', 0)
        ema9 = row.get('ema_9', close)
        ema21 = row.get('ema_21', close)
        sma50 = row.get('sma_50', close)
        
        # === ML Signal Generation ===
        # Simulate ensemble of XGBoost + LightGBM predictions
        # Uses multiple features weighted by importance
        
        score = 0.0
        
        # RSI momentum (high importance feature)
        if rsi < 30:
            score += 0.25
        elif rsi > 70:
            score -= 0.25
        elif rsi < 40:
            score += 0.10
        elif rsi > 60:
            score -= 0.10
            
        # MACD histogram (high importance)
        if macd_hist > 0:
            score += 0.15
        elif macd_hist < 0:
            score -= 0.15
            
        # Bollinger position
        if bb_pctb < 0.15:
            score += 0.15
        elif bb_pctb > 0.85:
            score -= 0.15
            
        # Trend alignment
        if close > ema21 and ema9 > ema21:
            score += 0.10
        elif close < ema21 and ema9 < ema21:
            score -= 0.10
            
        # ADX confirms direction
        if adx > 25:
            score *= 1.2
            
        # Volume confirmation
        if volume_ratio > 1.5:
            score *= 1.1
        elif volume_ratio < 0.5:
            score *= 0.8
            
        # ROC momentum
        if roc > 0.005:
            score += 0.10
        elif roc < -0.005:
            score -= 0.10
            
        # Regime adjustment
        if regime == 'TRENDING_UP':
            score += 0.08
        elif regime == 'TRENDING_DOWN':
            score -= 0.08
        elif regime == 'RANGING':
            score *= 0.7  # Reduce confidence in ranging
            
        # Recent returns (momentum persistence)
        if len(history_df) >= 5:
            ret_5 = (close - history_df['close'].iloc[-5]) / history_df['close'].iloc[-5]
            if ret_5 > 0.01:
                score += 0.10
            elif ret_5 < -0.01:
                score -= 0.10
                
        # Convert score to action + confidence
        if score > 0.15:
            action = 'BUY'
            confidence = min(0.90, 0.40 + abs(score))
        elif score < -0.15:
            action = 'SELL'
            confidence = min(0.90, 0.40 + abs(score))
        else:
            action = 'HOLD'
            confidence = 0.20
            
        return {
            'action': action,
            'confidence': confidence,
            'source': 'PythonML',
            'raw_score': round(score, 3),
        }
    
    def apply_ml_veto(self, signals, ml_signal):
        """
        Apply ML Hard/Soft Veto logic.
        
        ML HARD VETO: conf > 0.80 + conflicts with ensemble → removes conflicting signals
        ML SOFT VETO: conf > 0.60 + conflicts → reduces conflicting confidence by 30%
        
        Returns:
            dict: Modified signals dict
        """
        ml_action = ml_signal['action']
        ml_conf = ml_signal['confidence']
        
        if ml_action == 'HOLD':
            return signals
            
        modified = {}
        for name, sig in signals.items():
            sig_action = sig.get('action', 'HOLD')
            sig_conf = sig.get('confidence', 0)
            
            # Check conflict
            is_conflict = (
                (ml_action == 'BUY' and sig_action == 'SELL') or
                (ml_action == 'SELL' and sig_action == 'BUY')
            )
            
            if is_conflict:
                if ml_conf > 0.80:
                    # HARD VETO — remove conflicting signal
                    modified[name] = {'action': 'HOLD', 'confidence': 0.0}
                    self.veto_hard_count += 1
                elif ml_conf > 0.60:
                    # SOFT VETO — reduce confidence by 30%
                    modified[name] = {
                        'action': sig_action,
                        'confidence': sig_conf * 0.70,
                    }
                    self.veto_soft_count += 1
                else:
                    modified[name] = sig
            else:
                modified[name] = sig
                
        return modified
    
    def learn_from_trade(self, pnl, hold_hours):
        """Record trade outcome for accuracy tracking."""
        self.total_predictions += 1
        if pnl > 0:
            self.correct_predictions += 1
        accuracy = self.correct_predictions / max(self.total_predictions, 1)
        self.recent_accuracy.append(1 if pnl > 0 else 0)
        if len(self.recent_accuracy) > 50:
            self.recent_accuracy.pop(0)
    
    def get_stats(self):
        """Get ML statistics."""
        recent_acc = np.mean(self.recent_accuracy) if self.recent_accuracy else 0
        return {
            'total_predictions': self.prediction_count,
            'trades_evaluated': self.total_predictions,
            'overall_accuracy': round(self.correct_predictions / max(self.total_predictions, 1) * 100, 1),
            'recent_accuracy': round(recent_acc * 100, 1),
            'veto_hard': self.veto_hard_count,
            'veto_soft': self.veto_soft_count,
        }

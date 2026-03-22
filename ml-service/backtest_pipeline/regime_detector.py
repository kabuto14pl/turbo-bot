"""
TURBO-BOT Full Pipeline Backtest — Market Regime Detection
Simulates VQC (Variational Quantum Classifier) + heuristic regime detection.
"""

import numpy as np
from . import config


class RegimeDetector:
    """
    Market regime detector — simulates AdaptiveNeuralEngine regime classification.
    Uses heuristic approach (matching neural AI's rules-based fallback).
    
    Regimes: TRENDING_UP, TRENDING_DOWN, RANGING, HIGH_VOLATILITY
    """
    
    def __init__(self):
        self.regime_history = []
        self.current_regime = 'RANGING'
        self.regime_confidence = 0.5
        self.transition_count = 0
        
    def detect(self, row, history_df):
        """
        Detect market regime from indicators.
        
        Args:
            row: Current candle with indicators
            history_df: Recent history DataFrame
            
        Returns:
            dict: {regime, confidence, probabilities}
        """
        close = row['close']
        atr = row.get('atr', close * 0.01)
        adx = row.get('adx', 20)
        rsi = row.get('rsi_14', 50)
        bb_pctb = row.get('bb_pctb', 0.5)
        volume_ratio = row.get('volume_ratio', 1.0)
        atr_pct = row.get('atr_pct', 0.01)
        ema9 = row.get('ema_9', close)
        ema21 = row.get('ema_21', close)
        sma50 = row.get('sma_50', close)
        macd_hist = row.get('macd_hist', 0)
        
        # === HEURISTIC REGIME SCORES ===
        scores = {
            'TRENDING_UP': 0.0,
            'TRENDING_DOWN': 0.0,
            'RANGING': 0.0,
            'HIGH_VOLATILITY': 0.0,
        }
        
        # ADX-based trend strength
        if adx > config.ADX_STRONG_THRESHOLD:
            if close > ema21 and ema9 > ema21:
                scores['TRENDING_UP'] += 0.35
            elif close < ema21 and ema9 < ema21:
                scores['TRENDING_DOWN'] += 0.35
        elif adx < config.ADX_TREND_THRESHOLD:
            scores['RANGING'] += 0.30
            
        # EMA alignment
        if ema9 > ema21 > sma50:
            scores['TRENDING_UP'] += 0.20
        elif ema9 < ema21 < sma50:
            scores['TRENDING_DOWN'] += 0.20
        else:
            scores['RANGING'] += 0.15
            
        # RSI extremes
        if rsi > 65:
            scores['TRENDING_UP'] += 0.10
        elif rsi < 35:
            scores['TRENDING_DOWN'] += 0.10
        elif 40 < rsi < 60:
            scores['RANGING'] += 0.10
            
        # Bollinger position
        if bb_pctb > 0.8:
            scores['TRENDING_UP'] += 0.10
        elif bb_pctb < 0.2:
            scores['TRENDING_DOWN'] += 0.10
        elif 0.3 < bb_pctb < 0.7:
            scores['RANGING'] += 0.10
            
        # Volatility check
        if atr_pct > 0.02 or volume_ratio > 2.0:
            scores['HIGH_VOLATILITY'] += 0.30
        if atr_pct > 0.03:
            scores['HIGH_VOLATILITY'] += 0.20
            
        # MACD direction
        if macd_hist > 0:
            scores['TRENDING_UP'] += 0.10
        elif macd_hist < 0:
            scores['TRENDING_DOWN'] += 0.10
            
        # Price relative to SMA50
        if close > sma50 * 1.02:
            scores['TRENDING_UP'] += 0.10
        elif close < sma50 * 0.98:
            scores['TRENDING_DOWN'] += 0.10
        else:
            scores['RANGING'] += 0.10
            
        # Recent trend consistency (last 10 candles)
        if len(history_df) >= 10:
            recent = history_df.iloc[-10:]
            up_candles = (recent['close'] > recent['open']).sum()
            if up_candles >= 7:
                scores['TRENDING_UP'] += 0.15
            elif up_candles <= 3:
                scores['TRENDING_DOWN'] += 0.15
            else:
                scores['RANGING'] += 0.10
                
        # Normalize to probabilities
        total = sum(scores.values())
        if total > 0:
            probs = {k: v / total for k, v in scores.items()}
        else:
            probs = {k: 0.25 for k in scores}
            
        # Determine regime
        regime = max(probs, key=probs.get)
        confidence = probs[regime]
        
        # Track transitions
        if regime != self.current_regime:
            self.transition_count += 1
            
        self.current_regime = regime
        self.regime_confidence = confidence
        self.regime_history.append(regime)
        
        return {
            'regime': regime,
            'confidence': confidence,
            'probabilities': probs,
            'transition_count': self.transition_count,
        }
    
    def get_sl_adjustment(self, regime):
        """Get SL multiplier based on regime (simulates VQC adjustment)."""
        return config.VQC_REGIME_SL_ADJUST.get(regime, 1.0)
    
    def get_tp_adjustment(self, regime):
        """Get TP multiplier based on regime (simulates VQC adjustment)."""
        return config.VQC_REGIME_TP_ADJUST.get(regime, 1.0)
    
    def is_trending(self, regime=None):
        """Check if current regime is trending."""
        r = regime or self.current_regime
        return r in ('TRENDING_UP', 'TRENDING_DOWN')
    
    def get_regime_stats(self):
        """Get regime distribution statistics."""
        if not self.regime_history:
            return {}
        total = len(self.regime_history)
        return {
            r: round(self.regime_history.count(r) / total * 100, 1)
            for r in config.REGIMES
        }

"""
TURBO-BOT P#71 — Grid V2 Strategy Module
Dedicated mean-reversion grid trading for RANGING regime.

KEY DIFFERENCES from P#67/P#68 Grid:
- BYPASSES ensemble voting entirely (direct execution)
- Uses Bollinger Band boundaries as grid edges
- Tight SL/TP (0.5-0.8 ATR) for quick flips
- Only activates in RANGING (ADX < grid_adx_threshold)
- Has its own confidence calculation (no ensemble dilution)
- Separate position from directional trades

HOW IT WORKS:
1. Detect RANGING regime (ADX < 22, confirmed by low directional movement)
2. Calculate grid levels from Bollinger Bands (upper/lower ± adjustments)
3. BUY at lower grid (price near BB lower + RSI < 45)
4. SELL at upper grid (price near BB upper + RSI > 55)
5. Tight SL (0.6 ATR) + Tight TP (0.8 ATR)
6. Cooldown between grid trades (min 4 candles = 1h on 15m)
7. Max grid trades per session (prevent overtrading)

EXPECTED IMPACT:
- BTC: Major source of alpha (BTC sideways 40-60% of time)
- ETH: Secondary (good ranging periods)
- BNB: Supplement to SHORT bias
- SOL: Minimal (SOL trends more, less ranging)
"""

import numpy as np
from . import config


# ============================================================================
# GRID V2 DEFAULT PARAMETERS
# ============================================================================

GRID_V2_ADX_THRESHOLD = 20       # Max ADX for grid activation (stricter)
GRID_V2_BB_LOWER_ENTRY = 0.08    # BB%B below this → BUY zone (extreme only)
GRID_V2_BB_UPPER_ENTRY = 0.92    # BB%B above this → SELL zone (extreme only)
GRID_V2_RSI_OVERSOLD = 38        # RSI below this for BUY confirmation
GRID_V2_RSI_OVERBOUGHT = 62      # RSI above this for SELL confirmation
GRID_V2_SL_ATR = 0.70            # SL (0.7 × ATR)
GRID_V2_TP_ATR = 1.20            # TP (1.2 × ATR) — covers fees
GRID_V2_COOLDOWN = 16            # Min candles between grid trades (4h on 15m)
GRID_V2_MAX_TRADES = 25          # Max grid trades per backtest session
GRID_V2_RISK_PER_TRADE = 0.006   # 0.6% risk per grid trade
GRID_V2_MIN_BB_WIDTH = 0.008     # Min BB width (avoid dead periods)


class GridV2Strategy:
    """
    Dedicated Grid V2 mean-reversion strategy for RANGING markets.
    
    This operates INDEPENDENTLY from the ensemble pipeline.
    It generates its own signals with its own confidence calculation.
    """
    
    def __init__(self, symbol='BTCUSDT'):
        self.symbol = symbol
        self.enabled = True
        
        # State tracking
        self.last_grid_candle = -999
        self.grid_trades_count = 0
        self.grid_wins = 0
        self.grid_losses = 0
        self.grid_pnl = 0
        self.total_grid_fees = 0
        self.consecutive_grid_wins = 0
        self.max_consecutive_wins = 0
        
        # Per-pair configurable parameters
        self.adx_threshold = GRID_V2_ADX_THRESHOLD
        self.bb_lower_entry = GRID_V2_BB_LOWER_ENTRY
        self.bb_upper_entry = GRID_V2_BB_UPPER_ENTRY
        self.rsi_oversold = GRID_V2_RSI_OVERSOLD
        self.rsi_overbought = GRID_V2_RSI_OVERBOUGHT
        self.sl_atr = GRID_V2_SL_ATR
        self.tp_atr = GRID_V2_TP_ATR
        self.cooldown = GRID_V2_COOLDOWN
        self.max_trades = GRID_V2_MAX_TRADES
        self.risk_per_trade = GRID_V2_RISK_PER_TRADE
        self.min_bb_width = GRID_V2_MIN_BB_WIDTH
        
        # P#72: Adaptive base values (saved for reset after streak)
        self._base_cooldown = GRID_V2_COOLDOWN
        self._base_bb_lower = GRID_V2_BB_LOWER_ENTRY
        self._base_bb_upper = GRID_V2_BB_UPPER_ENTRY
        self._consecutive_losses = 0
        
    def configure(self, **kwargs):
        """Apply per-pair configuration overrides."""
        mapping = {
            'GRID_V2_ADX_THRESHOLD': 'adx_threshold',
            'GRID_V2_BB_LOWER_ENTRY': 'bb_lower_entry',
            'GRID_V2_BB_UPPER_ENTRY': 'bb_upper_entry',
            'GRID_V2_RSI_OVERSOLD': 'rsi_oversold',
            'GRID_V2_RSI_OVERBOUGHT': 'rsi_overbought',
            'GRID_V2_SL_ATR': 'sl_atr',
            'GRID_V2_TP_ATR': 'tp_atr',
            'GRID_V2_COOLDOWN': 'cooldown',
            'GRID_V2_MAX_TRADES': 'max_trades',
            'GRID_V2_RISK_PER_TRADE': 'risk_per_trade',
            'GRID_V2_MIN_BB_WIDTH': 'min_bb_width',
        }
        for cfg_key, attr_name in mapping.items():
            if cfg_key in kwargs:
                setattr(self, attr_name, kwargs[cfg_key])
        # P#72: Save base values for adaptive reset
        self._base_cooldown = self.cooldown
        self._base_bb_lower = self.bb_lower_entry
        self._base_bb_upper = self.bb_upper_entry
    
    def evaluate(self, row, history, regime, candle_idx, has_position=False):
        """
        Evaluate whether a grid trade should be taken.
        
        This BYPASSES the ensemble — generates independent signals.
        Only fires in RANGING regime with mean-reversion conditions.
        
        Args:
            row: current candle
            history: recent history
            regime: current market regime
            candle_idx: current candle index
            has_position: whether there's already an open position
            
        Returns:
            dict: {
                'signal': 'BUY'|'SELL'|None,
                'confidence': float,
                'is_grid': True,
                'sl_atr': float,
                'tp_atr': float,
                'risk_per_trade': float,
                'reason': str,
            } or None if no signal
        """
        if not self.enabled:
            return None
            
        # Don't generate grid signal if there's already a position
        if has_position:
            return None
            
        # Max trades limit
        if self.grid_trades_count >= self.max_trades:
            return None
            
        # Cooldown check
        if (candle_idx - self.last_grid_candle) < self.cooldown:
            return None
        
        # === REGIME GATE: Only RANGING ===
        adx = row.get('adx', 30)
        if adx > self.adx_threshold:
            return None
        if regime not in ('RANGING', 'HIGH_VOLATILITY'):
            # Allow HV if ADX is low (choppy HV = still grid-tradeable)
            if regime != 'HIGH_VOLATILITY' or adx > 18:
                return None
        
        # === BOLLINGER BAND ANALYSIS ===
        bb_pctb = row.get('bb_pctb', 0.5)
        close = row['close']
        bb_upper = row.get('bb_upper', close * 1.02)
        bb_lower = row.get('bb_lower', close * 0.98)
        
        # Check BB width (avoid flat/dead periods)
        bb_width = (bb_upper - bb_lower) / close if close > 0 else 0
        if bb_width < self.min_bb_width:
            return None
        
        # === RSI CONFIRMATION ===
        rsi = row.get('rsi_14', 50)
        
        # === SIGNAL GENERATION ===
        signal = None
        confidence = 0
        reason = ''
        
        # BUY zone: price near BB lower + RSI oversold
        if bb_pctb < self.bb_lower_entry and rsi < self.rsi_oversold:
            signal = 'BUY'
            # Confidence based on how deep in the zone
            depth = (self.bb_lower_entry - bb_pctb) / self.bb_lower_entry
            rsi_strength = (self.rsi_oversold - rsi) / self.rsi_oversold
            confidence = 0.30 + depth * 0.30 + rsi_strength * 0.20
            reason = f'Grid BUY: BB%B={bb_pctb:.2f} RSI={rsi:.0f} ADX={adx:.0f}'
            
        # SELL zone: price near BB upper + RSI overbought  
        elif bb_pctb > self.bb_upper_entry and rsi > self.rsi_overbought:
            signal = 'SELL'
            depth = (bb_pctb - self.bb_upper_entry) / (1 - self.bb_upper_entry)
            rsi_strength = (rsi - self.rsi_overbought) / (100 - self.rsi_overbought)
            confidence = 0.30 + depth * 0.30 + rsi_strength * 0.20
            reason = f'Grid SELL: BB%B={bb_pctb:.2f} RSI={rsi:.0f} ADX={adx:.0f}'
        
        if signal is None:
            return None
        
        # Clamp confidence
        confidence = np.clip(confidence, 0.20, 0.75)
        
        # Volume confirmation bonus
        vol_ratio = row.get('volume_ratio', 1.0)
        if vol_ratio > 1.3:
            confidence += 0.05
            reason += f' Vol={vol_ratio:.1f}x'
        
        # Streak bonus: consecutive grid wins → slightly higher confidence
        if self.consecutive_grid_wins >= 3:
            confidence += 0.03
        
        return {
            'signal': signal,
            'confidence': float(np.clip(confidence, 0.20, 0.80)),
            'is_grid': True,
            'sl_atr': self.sl_atr,
            'tp_atr': self.tp_atr,
            'risk_per_trade': self.risk_per_trade,
            'reason': reason,
        }
    
    def record_grid_trade(self, pnl, fees=0):
        """Record a completed grid trade for tracking."""
        self.grid_trades_count += 1
        self.grid_pnl += pnl
        self.total_grid_fees += fees
        
        if pnl > 0:
            self.grid_wins += 1
            self.consecutive_grid_wins += 1
            self._consecutive_losses = 0
            self.max_consecutive_wins = max(
                self.max_consecutive_wins, self.consecutive_grid_wins)
            # P#72 Adaptive: relax cooldown after 3 consecutive wins
            if self.consecutive_grid_wins >= 3:
                self.cooldown = max(self._base_cooldown - 4, 8)
        else:
            self.grid_losses += 1
            self.consecutive_grid_wins = 0
            self._consecutive_losses += 1
            # P#72 Adaptive: tighten cooldown after 2 consecutive losses
            if self._consecutive_losses >= 2:
                self.cooldown = min(self._base_cooldown + 8, 48)
                # Also tighten entry zones temporarily
                self.bb_lower_entry = max(self._base_bb_lower - 0.02, 0.03)
                self.bb_upper_entry = min(self._base_bb_upper + 0.02, 0.97)
            # Reset to base after single loss (not streak)
            if self._consecutive_losses == 1:
                self.cooldown = self._base_cooldown
                self.bb_lower_entry = self._base_bb_lower
                self.bb_upper_entry = self._base_bb_upper
    
    def mark_entry(self, candle_idx):
        """Mark that a grid trade was opened at this candle."""
        self.last_grid_candle = candle_idx
    
    def get_stats(self):
        """Get grid V2 statistics."""
        win_rate = (self.grid_wins / max(self.grid_trades_count, 1)) * 100
        pf = 0
        if self.grid_losses > 0 and self.grid_wins > 0:
            avg_win = self.grid_pnl / max(self.grid_wins, 1) if self.grid_pnl > 0 else 0
            # Approximate PF from win/loss ratio and win rate
            pf = (win_rate / 100 * abs(self.grid_pnl)) / max(abs(self.grid_pnl - self.grid_pnl), 0.01)
        
        return {
            'enabled': self.enabled,
            'total_trades': self.grid_trades_count,
            'wins': self.grid_wins,
            'losses': self.grid_losses,
            'win_rate': round(win_rate, 1),
            'net_pnl': round(self.grid_pnl, 4),
            'total_fees': round(self.total_grid_fees, 4),
            'max_consecutive_wins': self.max_consecutive_wins,
            'adx_threshold': self.adx_threshold,
        }
    
    def reset(self):
        """Reset for fresh run."""
        self.last_grid_candle = -999
        self.grid_trades_count = 0
        self.grid_wins = 0
        self.grid_losses = 0
        self.grid_pnl = 0
        self.total_grid_fees = 0
        self.consecutive_grid_wins = 0
        self.max_consecutive_wins = 0
        self._consecutive_losses = 0
        # P#72: Reset adaptive params to base
        self.cooldown = self._base_cooldown
        self.bb_lower_entry = self._base_bb_lower
        self.bb_upper_entry = self._base_bb_upper

"""
TURBO-BOT Full Pipeline Backtest — Position Manager
5-phase Chandelier trailing SL, breakeven, partial TP, QPM health scoring.
Simulates quantum_position_manager.js + execution-engine.js position lifecycle.
"""

import numpy as np
from . import config


class PositionManager:
    """
    Full position lifecycle management:
      Phase 1 (< 1.0× ATR profit): Hold initial SL
      Phase 2 (1.0-1.5× ATR):      Move to breakeven + buffer
      Phase 3 (1.5-2.0× ATR):      Lock 0.5×ATR below price
      Phase 4 (2.0-3.0× ATR):      Lock 1.0×ATR below price
      Phase 5 (3.0×+ ATR):         Chandelier stop = highest - 1.5×liveATR
      
    Plus: Partial TP levels, time exits, QPM health scoring.
    """
    
    def __init__(self, fee_rate=None):
        self.fee_rate = fee_rate or config.FEE_RATE
        # P#189: Taker fee for market-order exits (SL / trail / time-exit)
        self.taker_fee_rate = getattr(config, 'FEE_RATE_TAKER', self.fee_rate)
        self.trades = []
        self.equity_curve = []
        self.position = None
        self.capital = config.INITIAL_CAPITAL
        self.peak_capital = config.INITIAL_CAPITAL
        self.max_drawdown = 0
        self.exit_reasons = {}
        
        # QPM stats
        self.qpm_adjustments = 0
        self.partials_executed = 0
        self.health_scores = []
        
        # PATCH #65: Momentum gate stats
        self.momentum_gate_tightened = 0
        self.momentum_gate_checked = 0
        
    def reset(self, initial_capital=None):
        """Reset position manager state."""
        self.trades = []
        self.equity_curve = []
        self.position = None
        self.capital = initial_capital or config.INITIAL_CAPITAL
        self.peak_capital = self.capital
        self.max_drawdown = 0
        self.exit_reasons = {}
        self.qpm_adjustments = 0
        self.partials_executed = 0
        self.health_scores = []
        self.momentum_gate_tightened = 0
        self.momentum_gate_checked = 0
        
    def open_position(self, side, price, atr, time, regime='RANGING',
                      sl_adjust=1.0, tp_adjust=1.0, risk_multiplier=1.0,
                      confidence=0.50):
        """
        Open position with quantum-adjusted SL/TP.
        
        1. Base SL/TP from config (2.0 ATR / 5.0 ATR)
        2. VQC regime adjustment
        3. QRA/QMC quantum adjustments
        4. Clamp to valid range
        """
        if self.position is not None:
            return False
            
        # Base SL/TP
        base_sl = config.SL_ATR_MULT * atr
        base_tp = config.TP_ATR_MULT * atr
        
        # PATCH #64: Dynamic SL base per-regime (applied before VQC adjust)
        sl_regime_base = getattr(config, 'SL_REGIME_BASE', {}).get(regime, 1.0)
        base_sl *= sl_regime_base
        
        # VQC regime adjustment
        regime_sl = config.VQC_REGIME_SL_ADJUST.get(regime, 1.0)
        regime_tp = config.VQC_REGIME_TP_ADJUST.get(regime, 1.0)
        
        # Combine adjustments
        sl_distance = base_sl * regime_sl * sl_adjust
        tp_distance = base_tp * regime_tp * tp_adjust
        
        # Clamp
        sl_distance = max(config.SL_CLAMP_MIN * atr, 
                         min(config.SL_CLAMP_MAX * atr, sl_distance))
        tp_distance = max(config.TP_CLAMP_MIN * atr,
                         min(config.TP_CLAMP_MAX * atr, tp_distance))
        
        # Risk-based sizing with confidence scaling
        risk_pct = config.RISK_PER_TRADE * risk_multiplier
        # Confidence-scaled: reduce size in low confidence
        if confidence < 0.50:
            risk_pct *= 0.70
        elif confidence > 0.75:
            risk_pct *= 1.15
            
        # Regime sizing reduction
        if regime == 'RANGING':
            risk_pct *= 0.90  # P#200c: Relaxed from 0.70→0.90 (Grid V2 needs fair sizing in RANGING)
        elif regime == 'HIGH_VOLATILITY':
            risk_pct *= 0.80
            
        risk_amount = self.capital * risk_pct
        quantity = risk_amount / sl_distance if sl_distance > 0 else 0
        
        # Max position value cap
        max_notional = self.capital * config.MAX_POSITION_VALUE_PCT
        max_quantity = max_notional / price
        quantity = min(quantity, max_quantity)
        
        if quantity <= 0 or quantity * price < 10:  # Min $10 position
            return False
            
        # Fee gate: expected profit ≥ 1.5× fees
        entry_fee = price * quantity * self.fee_rate
        exit_fee = (price + tp_distance) * quantity * self.fee_rate  # Approximate
        total_fees = entry_fee + exit_fee
        expected_profit = tp_distance * quantity
        if expected_profit < config.FEE_GATE_MULTIPLIER * total_fees:
            return False
            
        # Set SL/TP levels
        # P#74: No slippage on entry (maker limit orders)
        entry_price = price
        if side == 'LONG':
            sl = entry_price - sl_distance
            tp = entry_price + tp_distance
        else:
            sl = entry_price + sl_distance
            tp = entry_price - tp_distance
            
        self.position = {
            'side': side,
            'entry': entry_price,
            'sl': sl,
            'tp': tp,
            'quantity': quantity,
            'entry_time': time,
            'entry_fee': entry_fee,
            'initial_sl_distance': sl_distance,
            'atr_at_entry': atr,
            'regime_at_entry': regime,
            'confidence': confidence,
            'max_r_reached': 0.0,
            'highest_price': price,
            'lowest_price': price,
            
            # Phase tracking
            'phase': 1,
            'breakeven_hit': False,
            'partial_taken': False,
            'trailing_active': False,
            'partial_l1': False,
            'partial_l2': False,
            'partial_l3': False,
            
            # PATCH #65: Momentum gate tracking
            'candles_in_trade': 0,
            'momentum_gate_applied': False,
        }
        
        self.capital -= entry_fee
        return True
        
    def manage_position(self, row, time, regime='RANGING', qpm_result=None):
        """
        Full 5-phase position management per candle.
        
        Returns:
            str: 'OPEN' if position still open, exit reason if closed
        """
        if self.position is None:
            return None
            
        pos = self.position
        price = row['close']
        high = row['high']
        low = row['low']
        atr = row.get('atr', pos['atr_at_entry'])
        
        # Track extremes
        if high > pos['highest_price']:
            pos['highest_price'] = high
        if low < pos['lowest_price']:
            pos['lowest_price'] = low
            
        # Calculate R-multiple
        sl_dist = pos['initial_sl_distance']
        if pos['side'] == 'LONG':
            r_multiple = (price - pos['entry']) / sl_dist if sl_dist > 0 else 0
            max_favorable = (high - pos['entry']) / sl_dist if sl_dist > 0 else 0
        else:
            r_multiple = (pos['entry'] - price) / sl_dist if sl_dist > 0 else 0
            max_favorable = (pos['entry'] - low) / sl_dist if sl_dist > 0 else 0
            
        if max_favorable > pos['max_r_reached']:
            pos['max_r_reached'] = max_favorable
        
        # === PATCH #65: MOMENTUM EARLY-EXIT GATE ===
        # If trade hasn't shown momentum within N candles, tighten SL
        # P#64 showed: all losers had MaxR < 0.40 → never moved in our favor
        pos['candles_in_trade'] += 1

        # P#201f: HARD MAX LOSS CAP — force close if unrealized loss exceeds cap
        # Prevents fat-tail losers (e.g. BNB $-31 single loss eating 6+ winners)
        _max_loss_mult = getattr(config, 'GRID_V2_MAX_LOSS_ATR_MULT', 0)
        if _max_loss_mult > 0 and pos.get('is_grid_v2', False):
            _hard_max = _max_loss_mult * pos['initial_sl_distance'] * pos['quantity']
            if pos['side'] == 'LONG':
                _unrealized = (low - pos['entry']) * pos['quantity']
            else:
                _unrealized = (pos['entry'] - high) * pos['quantity']
            if _unrealized < -_hard_max:
                _exit_price = pos['sl']  # Use SL price as exit (worst case)
                _pnl = -_hard_max
                self._close_position(_exit_price, _pnl, 'MAX_LOSS', time)
                return 'MAX_LOSS'
        
        if (getattr(config, 'MOMENTUM_GATE_ENABLED', False) and
            not pos.get('momentum_gate_applied', False)):
            gate_candles = getattr(config, 'MOMENTUM_GATE_CANDLES', 4)
            gate_min_r = getattr(config, 'MOMENTUM_GATE_MIN_R', 0.40)
            gate_tighten = getattr(config, 'MOMENTUM_GATE_SL_TIGHTEN', 0.50)
            
            if pos['candles_in_trade'] == gate_candles:
                self.momentum_gate_checked += 1
                if pos['max_r_reached'] < gate_min_r:
                    # No momentum → tighten SL
                    new_sl_dist = pos['initial_sl_distance'] * gate_tighten
                    if pos['side'] == 'LONG':
                        new_sl = pos['entry'] - new_sl_dist
                        if new_sl > pos['sl']:  # Only tighten (move up for long)
                            pos['sl'] = new_sl
                    else:
                        new_sl = pos['entry'] + new_sl_dist
                        if new_sl < pos['sl']:  # Only tighten (move down for short)
                            pos['sl'] = new_sl
                    pos['momentum_gate_applied'] = True
                    self.momentum_gate_tightened += 1
            
        # === QPM QUANTUM ADJUSTMENTS ===
        if qpm_result:
            self._apply_qpm_adjustments(pos, qpm_result, atr, price)
            
        # === 5-PHASE CHANDELIER TRAILING SL ===
        # PATCH #63: Pass current regime for regime-adaptive trailing
        self._update_trailing_sl(pos, price, high, low, atr, max_favorable, regime)
        
        # === PARTIAL TP (ATR-based levels) ===
        partial_result = self._check_partial_tp(pos, price, high, low, atr, time)
        if partial_result:
            return partial_result  # Partial was executed as separate trade
        
        # === CHECK SL HIT ===
        sl_result = self._check_sl(pos, price, high, low, time)
        if sl_result:
            return sl_result
            
        # === CHECK TP HIT ===
        tp_result = self._check_tp(pos, price, high, low, time)
        if tp_result:
            return tp_result
            
        # === TIME EXITS ===
        time_result = self._check_time_exits(pos, price, atr, time, regime)
        if time_result:
            return time_result
            
        return 'OPEN'
    
    def _update_trailing_sl(self, pos, price, high, low, atr, max_r, regime='RANGING'):
        """5-Phase Chandelier trailing SL — PATCH #63: parameterized + regime-adaptive."""
        sl_dist = pos['initial_sl_distance']
        
        # P#203a: Grid uses standard trailing phases (P#202d reverted — tighter phases degraded PF)
        
        # PATCH #63: Regime-adaptive trail multiplier
        trail_regime_mult = getattr(config, 'TRAIL_REGIME_MULT', {}).get(regime, 1.0)
        
        # Parameterized trail distances (PATCH #63 — were hardcoded 0.5 and 1.0)
        phase3_trail = getattr(config, 'PHASE3_TRAIL_ATR', 0.5) * trail_regime_mult
        phase4_trail = getattr(config, 'PHASE4_TRAIL_ATR', 0.75) * trail_regime_mult
        phase5_trail = config.TRAILING_DISTANCE_ATR * trail_regime_mult
        
        if pos['side'] == 'LONG':
            # Phase 1: < PHASE_1_MIN_R — hold initial SL
            if max_r < config.PHASE_1_MIN_R:
                pos['phase'] = 1
                return
                
            # Phase 2: >= PHASE_2_BE_R — breakeven + profit buffer
            if max_r >= config.PHASE_2_BE_R and not pos['breakeven_hit']:
                # PATCH #59: Lock actual profit at BE, not just fees
                profit_buffer = getattr(config, 'BE_PROFIT_BUFFER_ATR', 0) * atr
                fee_buffer = pos['entry'] * self.fee_rate * 2
                new_sl = pos['entry'] + max(fee_buffer, profit_buffer)
                if new_sl > pos['sl']:
                    pos['sl'] = new_sl
                    pos['breakeven_hit'] = True
                    pos['phase'] = 2
                    
            # Phase 3: >= PHASE_3_LOCK_R — lock profit with trail
            if max_r >= config.PHASE_3_LOCK_R:
                lock_sl = pos['highest_price'] - phase3_trail * atr
                if lock_sl > pos['sl']:
                    pos['sl'] = lock_sl
                    pos['phase'] = 3
                    
            # Phase 4: >= PHASE_4_LOCK_R — tighter trail
            if max_r >= config.PHASE_4_LOCK_R:
                lock_sl = pos['highest_price'] - phase4_trail * atr
                if lock_sl > pos['sl']:
                    pos['sl'] = lock_sl
                    pos['trailing_active'] = True
                    pos['phase'] = 4
                    
            # Phase 5: >= PHASE_5_CHANDELIER_R — Chandelier stop
            if max_r >= config.PHASE_5_CHANDELIER_R:
                chandelier = pos['highest_price'] - phase5_trail * atr
                if chandelier > pos['sl']:
                    pos['sl'] = chandelier
                    pos['phase'] = 5
                    
        else:  # SHORT
            if max_r < config.PHASE_1_MIN_R:
                pos['phase'] = 1
                return
                
            if max_r >= config.PHASE_2_BE_R and not pos['breakeven_hit']:
                profit_buffer = getattr(config, 'BE_PROFIT_BUFFER_ATR', 0) * atr
                fee_buffer = pos['entry'] * self.fee_rate * 2
                new_sl = pos['entry'] - max(fee_buffer, profit_buffer)
                if new_sl < pos['sl']:
                    pos['sl'] = new_sl
                    pos['breakeven_hit'] = True
                    pos['phase'] = 2
                    
            if max_r >= config.PHASE_3_LOCK_R:
                lock_sl = pos['lowest_price'] + phase3_trail * atr
                if lock_sl < pos['sl']:
                    pos['sl'] = lock_sl
                    pos['phase'] = 3
                    
            if max_r >= config.PHASE_4_LOCK_R:
                lock_sl = pos['lowest_price'] + phase4_trail * atr
                if lock_sl < pos['sl']:
                    pos['sl'] = lock_sl
                    pos['trailing_active'] = True
                    pos['phase'] = 4
                    
            if max_r >= config.PHASE_5_CHANDELIER_R:
                chandelier = pos['lowest_price'] + phase5_trail * atr
                if chandelier < pos['sl']:
                    pos['sl'] = chandelier
                    pos['phase'] = 5
    
    def _check_partial_tp(self, pos, price, high, low, atr, time):
        """Check ATR-based partial TP levels (L1, L2, L3)."""
        sl_dist = pos['initial_sl_distance']
        
        # Skip partials in RANGING — winners too small, partials destroy R:R
        if pos.get('regime_at_entry') == 'RANGING':
            return None
        
        # PATCH #59: Skip L1 entirely when PCT=0 (prevents phantom trades & TP blocking)
        # L1: at L1_MULT × ATR
        if config.PARTIAL_ATR_L1_PCT > 0 and not pos['partial_l1']:
            if pos['side'] == 'LONG':
                if high >= pos['entry'] + config.PARTIAL_ATR_L1_MULT * atr:
                    return self._execute_partial(pos, 
                        pos['entry'] + config.PARTIAL_ATR_L1_MULT * atr,
                        config.PARTIAL_ATR_L1_PCT, 'PARTIAL_L1', time)
            else:
                if low <= pos['entry'] - config.PARTIAL_ATR_L1_MULT * atr:
                    return self._execute_partial(pos,
                        pos['entry'] - config.PARTIAL_ATR_L1_MULT * atr,
                        config.PARTIAL_ATR_L1_PCT, 'PARTIAL_L1', time)
                        
        # PATCH #59: Skip L2 entirely when PCT=0
        # L2: at L2_MULT × ATR
        if config.PARTIAL_ATR_L2_PCT > 0 and not pos['partial_l2'] and pos['partial_l1']:
            if pos['side'] == 'LONG':
                if high >= pos['entry'] + config.PARTIAL_ATR_L2_MULT * atr:
                    return self._execute_partial(pos,
                        pos['entry'] + config.PARTIAL_ATR_L2_MULT * atr,
                        config.PARTIAL_ATR_L2_PCT, 'PARTIAL_L2', time)
            else:
                if low <= pos['entry'] - config.PARTIAL_ATR_L2_MULT * atr:
                    return self._execute_partial(pos,
                        pos['entry'] - config.PARTIAL_ATR_L2_MULT * atr,
                        config.PARTIAL_ATR_L2_PCT, 'PARTIAL_L2', time)
                        
        # L3: at L3_MULT × ATR (skipped if PCT=0)
        if config.PARTIAL_ATR_L3_PCT > 0 and not pos['partial_l3'] and pos['partial_l2']:
            if pos['side'] == 'LONG':
                if high >= pos['entry'] + config.PARTIAL_ATR_L3_MULT * atr:
                    return self._execute_partial(pos,
                        pos['entry'] + config.PARTIAL_ATR_L3_MULT * atr,
                        config.PARTIAL_ATR_L3_PCT, 'PARTIAL_L3', time)
            else:
                if low <= pos['entry'] - config.PARTIAL_ATR_L3_MULT * atr:
                    return self._execute_partial(pos,
                        pos['entry'] - config.PARTIAL_ATR_L3_MULT * atr,
                        config.PARTIAL_ATR_L3_PCT, 'PARTIAL_L3', time)
                        
        return None
    
    def _execute_partial(self, pos, exit_price, pct, reason, time):
        """Execute partial close at given level."""
        partial_qty = pos['quantity'] * pct
        remaining_qty = pos['quantity'] - partial_qty
        
        if pos['side'] == 'LONG':
            pnl = (exit_price - pos['entry']) * partial_qty
        else:
            pnl = (pos['entry'] - exit_price) * partial_qty
            
        exit_fee = exit_price * partial_qty * self.fee_rate
        entry_fee_share = pos['entry_fee'] * pct
        net_pnl = pnl - entry_fee_share - exit_fee
        
        hold_hours = (time - pos['entry_time']).total_seconds() / 3600
        
        self.trades.append({
            'side': pos['side'],
            'entry_price': pos['entry'],
            'exit_price': exit_price,
            'quantity': partial_qty,
            'gross_pnl': pnl,
            'net_pnl': net_pnl,
            'return_pct': net_pnl / (pos['entry'] * partial_qty) if partial_qty > 0 else 0,
            'fees': entry_fee_share + exit_fee,
            'reason': reason,
            'entry_time': pos['entry_time'],
            'exit_time': time,
            'hold_hours': hold_hours,
            'max_r_reached': pos['max_r_reached'],
            'phase': pos['phase'],
            'regime': pos['regime_at_entry'],
            'strategies': pos.get('strategies', []),  # P#195: strategy attribution
        })
        
        self.capital += net_pnl
        pos['quantity'] = remaining_qty
        pos['entry_fee'] = pos['entry_fee'] * (1 - pct)
        self.partials_executed += 1
        
        # Mark partial level
        if 'L1' in reason:
            pos['partial_l1'] = True
        elif 'L2' in reason:
            pos['partial_l2'] = True
        elif 'L3' in reason:
            pos['partial_l3'] = True
            
        # After partial, ensure breakeven with profit buffer
        if not pos['breakeven_hit']:
            profit_buffer = getattr(config, 'BE_PROFIT_BUFFER_ATR', 0) * pos['atr_at_entry']
            fee_buffer = pos['entry'] * self.fee_rate * 2
            buffer = max(fee_buffer, profit_buffer)
            if pos['side'] == 'LONG':
                pos['sl'] = pos['entry'] + buffer
            else:
                pos['sl'] = pos['entry'] - buffer
            pos['breakeven_hit'] = True
            
        return 'OPEN'  # Position still open with reduced size
    
    def _check_sl(self, pos, price, high, low, time):
        """Check if SL hit."""
        if pos['side'] == 'LONG':
            if low <= pos['sl']:
                exit_price = pos['sl']
                pnl = (exit_price - pos['entry']) * pos['quantity']
                reason = 'TRAIL' if pos['trailing_active'] else \
                         ('BE' if pos['breakeven_hit'] else 'SL')
                self._close_position(exit_price, pnl, reason, time)
                return reason
        else:
            if high >= pos['sl']:
                exit_price = pos['sl']
                pnl = (pos['entry'] - exit_price) * pos['quantity']
                reason = 'TRAIL' if pos['trailing_active'] else \
                         ('BE' if pos['breakeven_hit'] else 'SL')
                self._close_position(exit_price, pnl, reason, time)
                return reason
        return None
    
    def _check_tp(self, pos, price, high, low, time):
        """Check if TP hit."""
        if pos['side'] == 'LONG':
            if high >= pos['tp']:
                pnl = (pos['tp'] - pos['entry']) * pos['quantity']
                self._close_position(pos['tp'], pnl, 'TP', time)
                return 'TP'
        else:
            if low <= pos['tp']:
                pnl = (pos['entry'] - pos['tp']) * pos['quantity']
                self._close_position(pos['tp'], pnl, 'TP', time)
                return 'TP'
        return None
    
    def _check_time_exits(self, pos, price, atr, time, regime):
        """Check time-based exit conditions."""
        hold_hours = (time - pos['entry_time']).total_seconds() / 3600
        
        if pos['side'] == 'LONG':
            pnl_raw = (price - pos['entry']) * pos['quantity']
            pnl_pct = (price - pos['entry']) / pos['entry']
            underwater = price < pos['entry'] - 0.5 * atr
        else:
            pnl_raw = (pos['entry'] - price) * pos['quantity']
            pnl_pct = (pos['entry'] - price) / pos['entry']
            underwater = price > pos['entry'] + 0.5 * atr
        
        # Emergency: 72h
        if hold_hours >= config.TIME_EXIT_EMERGENCY_H:
            self._close_position(price, pnl_raw, 'TIME_EMERGENCY', time)
            return 'TIME_EMERGENCY'
            
        # Weak profit: 48h with < 0.3% gain
        if hold_hours >= config.TIME_EXIT_WEAK_PROFIT_H and pnl_pct < 0.003:
            self._close_position(price, pnl_raw, 'TIME_WEAK', time)
            return 'TIME_WEAK'
            
        # Underwater: 24h losing > 0.5 ATR
        if hold_hours >= config.TIME_EXIT_UNDERWATER_H and underwater:
            self._close_position(price, pnl_raw, 'TIME_UNDERWATER', time)
            return 'TIME_UNDERWATER'
            
        # Ranging stale: 4h in RANGING with tiny profit
        if regime == 'RANGING' and hold_hours >= config.RANGING_STALE_HOURS:
            if abs(pnl_pct) < config.RANGING_STALE_MIN_PROFIT_ATR * atr / price:
                self._close_position(price, pnl_raw, 'RANGING_STALE', time)
                return 'RANGING_STALE'
                
        return None
    
    def _apply_qpm_adjustments(self, pos, qpm_result, atr, price):
        """Apply QPM quantum position adjustments."""
        # Health score tracking
        health = self._calculate_health(pos, price, atr, qpm_result)
        self.health_scores.append(health)
        
        # SL adjustment (only favorable direction)
        if qpm_result.get('sl_adjust', 1.0) != 1.0:
            new_sl_dist = pos['initial_sl_distance'] * qpm_result['sl_adjust']
            if pos['side'] == 'LONG':
                new_sl = price - new_sl_dist
                if new_sl > pos['sl']:  # Only tighten
                    pos['sl'] = new_sl
                    self.qpm_adjustments += 1
            else:
                new_sl = price + new_sl_dist
                if new_sl < pos['sl']:
                    pos['sl'] = new_sl
                    self.qpm_adjustments += 1
    
    def _calculate_health(self, pos, price, atr, qpm_result):
        """
        QPM Health Score (0-100).
        6 factors: PnL, Regime, QMC, Risk, Time, Momentum
        """
        # PnL component (20%)
        if pos['side'] == 'LONG':
            pnl_pct = (price - pos['entry']) / pos['entry']
        else:
            pnl_pct = (pos['entry'] - price) / pos['entry']
        pnl_score = max(0, min(100, 50 + pnl_pct * 5000))
        
        # Regime component (20%)
        regime = pos['regime_at_entry']
        regime_map = {'TRENDING_UP': 75, 'TRENDING_DOWN': 75, 'RANGING': 40, 'HIGH_VOLATILITY': 30}
        regime_score = regime_map.get(regime, 50)
        
        # QMC component (20%)
        qmc = qpm_result.get('qmc_outlook', 'NEUTRAL')
        qmc_map = {'BULLISH': 80, 'NEUTRAL': 50, 'BEARISH': 20}
        qmc_score = qmc_map.get(qmc, 50)
        if pos['side'] == 'SHORT':
            qmc_score = 100 - qmc_score  # Invert for shorts
            
        # Risk component (20%)
        risk = qpm_result.get('qra_risk_score', 50)
        risk_score = max(0, 100 - risk)
        
        # Time component (10%)
        hold_hours = 0
        if pos.get('entry_time'):
            # Approximate — will be calculated properly during backtest
            time_score = max(0, 100 - hold_hours * 2)
        else:
            time_score = 80
            
        # Momentum component (10%)
        momentum_score = max(0, min(100, 50 + pos['max_r_reached'] * 20))
        
        health = (
            pnl_score * config.HEALTH_PNL_WEIGHT +
            regime_score * config.HEALTH_REGIME_WEIGHT +
            qmc_score * config.HEALTH_QMC_WEIGHT +
            risk_score * config.HEALTH_RISK_WEIGHT +
            time_score * config.HEALTH_TIME_WEIGHT +
            momentum_score * config.HEALTH_MOMENTUM_WEIGHT
        )
        
        return round(health, 1)
        
    def _close_position(self, exit_price, gross_pnl, reason, time):
        """Close position and record trade."""
        pos = self.position
        if pos is None:
            return
        
        # P#74: Slippage only on SL exits (market orders). TP/trail/BE = limit = no slippage
        slippage = getattr(config, 'SLIPPAGE_RATE', 0.0)
        if slippage > 0 and reason == 'SL':
            # P#206c: Random jitter ±50% to break backtest determinism
            if getattr(config, 'SLIPPAGE_JITTER', False):
                import random
                slippage *= (0.5 + random.random())  # range: 0.5x to 1.5x
            if pos['side'] == 'LONG':
                exit_price = exit_price * (1 - slippage)
            else:
                exit_price = exit_price * (1 + slippage)
            # Recalculate gross_pnl with slipped exit
            if pos['side'] == 'LONG':
                gross_pnl = (exit_price - pos['entry']) * pos['quantity']
            else:
                gross_pnl = (pos['entry'] - exit_price) * pos['quantity']
        
        # P#189: Taker fee for market-order exits (SL / TRAIL / TIME*); maker for limit TP/BE
        _market_exit = reason in ('SL', 'TRAIL', 'TIME_EMERGENCY', 'TIME_WEAK',
                                   'TIME_UNDERWATER', 'RANGING_STALE', 'END')
        _exit_fee_rate = self.taker_fee_rate if _market_exit else self.fee_rate
        exit_fee = exit_price * pos['quantity'] * _exit_fee_rate
        net_pnl = gross_pnl - pos['entry_fee'] - exit_fee
        hold_hours = (time - pos['entry_time']).total_seconds() / 3600
        ret_pct = net_pnl / (pos['entry'] * pos['quantity']) if pos['quantity'] > 0 else 0
        
        self.trades.append({
            'side': pos['side'],
            'entry_price': pos['entry'],
            'exit_price': exit_price,
            'quantity': pos['quantity'],
            'gross_pnl': gross_pnl,
            'net_pnl': net_pnl,
            'return_pct': ret_pct,
            'fees': pos['entry_fee'] + exit_fee,
            'reason': reason,
            'entry_time': pos['entry_time'],
            'exit_time': time,
            'hold_hours': hold_hours,
            'max_r_reached': pos['max_r_reached'],
            'breakeven_was_hit': pos['breakeven_hit'],
            'trailing_was_active': pos['trailing_active'],
            'phase': pos['phase'],
            'regime': pos['regime_at_entry'],
            'confidence': pos['confidence'],
            'strategies': pos.get('strategies', []),  # P#195: strategy attribution
        })
        
        self.capital += net_pnl
        self.exit_reasons[reason] = self.exit_reasons.get(reason, 0) + 1
        
        if self.capital > self.peak_capital:
            self.peak_capital = self.capital
        drawdown = (self.peak_capital - self.capital) / self.peak_capital
        if drawdown > self.max_drawdown:
            self.max_drawdown = drawdown
            
        self.position = None
        
    def force_close(self, price, time, reason='END'):
        """Force close any open position."""
        if self.position is None:
            return
        pos = self.position
        if pos['side'] == 'LONG':
            pnl = (price - pos['entry']) * pos['quantity']
        else:
            pnl = (pos['entry'] - price) * pos['quantity']
        self._close_position(price, pnl, reason, time)
        
    def get_current_drawdown(self):
        """Get current drawdown from peak."""
        if self.peak_capital <= 0:
            return 0
        return (self.peak_capital - self.capital) / self.peak_capital
    
    def get_unrealized_pnl(self, current_price):
        """Get unrealized PnL of open position."""
        if self.position is None:
            return 0
        pos = self.position
        if pos['side'] == 'LONG':
            return (current_price - pos['entry']) * pos['quantity']
        else:
            return (pos['entry'] - current_price) * pos['quantity']

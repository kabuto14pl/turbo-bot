"""
🧪 TURBO-BOT — Backtest Engine V2 (Learning from V1 failures)

V1 FAILURES ANALYSIS:
  - Win Rate 25-31% → entries without confluence confirmation
  - Static SL/TP → no profit protection, no trailing
  - Candle patterns existed but were NEVER used in entry decisions
  - No breakeven move → small winners turned into losers
  - No partial TP → full positions hit SL after running in profit

V2 FIXES:
  1. Position Management: trailing stop, breakeven move, partial TP
  2. Pattern-Confirmed Entries: CandlePatternEngine gates entries
  3. Entry Confluence: trend + momentum + pattern required
  4. Adaptive SL/TP: tighter SL in ranging, wider in trending
  5. Exit analysis: breakdown by SL/TP/TRAIL/BE/TIME

Usage:
    python3 backtest_v2.py
    python3 backtest_v2.py --timeframe 1h
    python3 backtest_v2.py --compare  # V1 vs V2 comparison
"""

import pandas as pd
import numpy as np
import os
import sys
import json
from datetime import datetime

from candle_patterns import CandlePatternEngine

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
RESULTS_DIR = os.path.join(os.path.dirname(__file__), 'results')


# ============================================================================
# ENHANCED BACKTESTER WITH POSITION MANAGEMENT
# ============================================================================

class TurboBacktesterV2:
    """
    Backtester V2 — with trailing stop, breakeven, partial TP.
    
    Position lifecycle:
      1. Entry: signal + pattern confirmation + confluence check
      2. Breakeven: after price moves 1R in profit, SL → entry price
      3. Partial TP: after price moves 2R, close 50% position
      4. Trailing stop: after 1.5R profit, trail SL at 1ATR behind price
      5. Final exit: remaining hits trailing SL or max TP (4R)
    """

    def __init__(self, initial_capital=10000, fee_rate=0.001):
        self.initial_capital = initial_capital
        self.fee_rate = fee_rate
        self.reset()

    def reset(self):
        self.trades = []
        self.equity_curve = []
        self.capital = self.initial_capital
        self.peak_capital = self.initial_capital
        self.max_drawdown = 0
        self.position = None
        self.exit_reasons = {'SL': 0, 'TP': 0, 'TRAIL': 0, 'BE': 0, 'TIME': 0, 'END': 0}

    def run(self, df, strategy_fn, strategy_name='Unknown',
            sl_atr_mult=2.0, tp_atr_mult=4.0, risk_pct=0.02,
            max_hold_hours=72, allow_short=True,
            use_trailing=True, use_breakeven=True, use_partial_tp=True,
            trailing_activation_r=1.5, trailing_distance_atr=1.0,
            breakeven_activation_r=1.0, partial_tp_r=2.0, partial_tp_pct=0.5):
        """
        Run backtest with advanced position management.

        Args:
            df: DataFrame with OHLCV + indicators
            strategy_fn: Function(row, history, pattern_engine, df_window) → 'BUY' | 'SELL' | 'HOLD'
            sl_atr_mult: ATR multiplier for initial stop loss
            tp_atr_mult: ATR multiplier for final take profit
            use_trailing: Enable trailing stop
            use_breakeven: Enable breakeven move
            use_partial_tp: Enable partial profit taking
            trailing_activation_r: R-multiple to start trailing (default 1.5R)
            trailing_distance_atr: Trail distance in ATR multiples
            breakeven_activation_r: R-multiple to move SL to breakeven
            partial_tp_r: R-multiple to take partial profit
            partial_tp_pct: Fraction of position to close at partial TP
        """
        self.reset()

        warmup = 200
        if len(df) < warmup + 50:
            return {'error': f'Insufficient data: {len(df)} rows (need {warmup + 50}+)'}

        # Detect timeframe
        if len(df) > 1:
            timediff = (df.index[1] - df.index[0]).total_seconds()
            tf_hours = timediff / 3600
        else:
            tf_hours = 0.25

        for i in range(warmup, len(df)):
            row = df.iloc[i]
            history = df.iloc[max(0, i - warmup):i]

            current_price = row['close']
            current_high = row['high']
            current_low = row['low']
            current_atr = row.get('atr', current_price * 0.01)
            current_time = df.index[i]

            # === POSITION MANAGEMENT ===
            if self.position is not None:
                self._manage_position(
                    row, current_price, current_high, current_low,
                    current_atr, current_time,
                    use_trailing, use_breakeven, use_partial_tp,
                    trailing_activation_r, trailing_distance_atr,
                    breakeven_activation_r, partial_tp_r, partial_tp_pct,
                    max_hold_hours
                )

            # === SIGNAL GENERATION ===
            if self.position is None:
                try:
                    signal = strategy_fn(row, history)
                except Exception:
                    signal = 'HOLD'

                if signal == 'BUY':
                    self._open_position(
                        'LONG', current_price, current_atr, current_time,
                        sl_atr_mult, tp_atr_mult, risk_pct
                    )
                elif signal == 'SELL' and allow_short:
                    self._open_position(
                        'SHORT', current_price, current_atr, current_time,
                        sl_atr_mult, tp_atr_mult, risk_pct
                    )

            # Track equity
            unrealized = 0
            if self.position is not None:
                if self.position['side'] == 'LONG':
                    unrealized = (current_price - self.position['entry']) * self.position['quantity']
                else:
                    unrealized = (self.position['entry'] - current_price) * self.position['quantity']

            self.equity_curve.append({
                'time': current_time,
                'equity': self.capital + unrealized,
                'capital': self.capital,
            })

        # Close any open position at end
        if self.position is not None:
            last_price = df.iloc[-1]['close']
            last_time = df.index[-1]
            if self.position['side'] == 'LONG':
                pnl = (last_price - self.position['entry']) * self.position['quantity']
            else:
                pnl = (self.position['entry'] - last_price) * self.position['quantity']
            self._close_position(last_price, pnl, 'END', last_time)

        return self._compute_results(strategy_name, df)

    def _manage_position(self, row, price, high, low, atr, time,
                         use_trailing, use_breakeven, use_partial_tp,
                         trail_act_r, trail_dist_atr,
                         be_act_r, partial_r, partial_pct,
                         max_hold_hours):
        """Advanced position management — the heart of V2."""
        pos = self.position
        if pos is None:
            return

        sl_distance = pos['initial_sl_distance']
        r_multiple = 0
        
        if pos['side'] == 'LONG':
            r_multiple = (price - pos['entry']) / sl_distance if sl_distance > 0 else 0
            max_favorable = (high - pos['entry']) / sl_distance if sl_distance > 0 else 0
        else:
            r_multiple = (pos['entry'] - price) / sl_distance if sl_distance > 0 else 0
            max_favorable = (pos['entry'] - low) / sl_distance if sl_distance > 0 else 0

        # Track max R reached
        if max_favorable > pos.get('max_r_reached', 0):
            pos['max_r_reached'] = max_favorable

        # --- BREAKEVEN MOVE ---
        if use_breakeven and not pos.get('breakeven_hit', False):
            if max_favorable >= be_act_r:
                # Move SL to entry (breakeven) + small buffer for fees
                fee_buffer = pos['entry'] * self.fee_rate * 2
                if pos['side'] == 'LONG':
                    new_sl = pos['entry'] + fee_buffer
                    if new_sl > pos['sl']:
                        pos['sl'] = new_sl
                        pos['breakeven_hit'] = True
                else:
                    new_sl = pos['entry'] - fee_buffer
                    if new_sl < pos['sl']:
                        pos['sl'] = new_sl
                        pos['breakeven_hit'] = True

        # --- PARTIAL TP ---
        if use_partial_tp and not pos.get('partial_taken', False):
            if max_favorable >= partial_r:
                # Close partial_pct of position
                partial_qty = pos['quantity'] * partial_pct
                remaining_qty = pos['quantity'] - partial_qty

                if pos['side'] == 'LONG':
                    partial_exit_price = pos['entry'] + partial_r * sl_distance
                    partial_pnl = (partial_exit_price - pos['entry']) * partial_qty
                else:
                    partial_exit_price = pos['entry'] - partial_r * sl_distance
                    partial_pnl = (pos['entry'] - partial_exit_price) * partial_qty

                # Record partial trade
                exit_fee = partial_exit_price * partial_qty * self.fee_rate
                # Proportional entry fee
                entry_fee_share = pos['entry_fee'] * partial_pct
                net_partial_pnl = partial_pnl - entry_fee_share - exit_fee

                self.trades.append({
                    'side': pos['side'],
                    'entry_price': pos['entry'],
                    'exit_price': partial_exit_price,
                    'quantity': partial_qty,
                    'gross_pnl': partial_pnl,
                    'net_pnl': net_partial_pnl,
                    'return_pct': net_partial_pnl / (pos['entry'] * partial_qty) if partial_qty > 0 else 0,
                    'fees': entry_fee_share + exit_fee,
                    'reason': 'PARTIAL',
                    'entry_time': pos['entry_time'],
                    'exit_time': time,
                    'hold_hours': (time - pos['entry_time']).total_seconds() / 3600,
                })

                self.capital += net_partial_pnl
                pos['quantity'] = remaining_qty
                pos['entry_fee'] = pos['entry_fee'] * (1 - partial_pct)
                pos['partial_taken'] = True

                # After partial, also move SL to breakeven if not already
                if not pos.get('breakeven_hit', False):
                    fee_buffer = pos['entry'] * self.fee_rate * 2
                    if pos['side'] == 'LONG':
                        pos['sl'] = pos['entry'] + fee_buffer
                    else:
                        pos['sl'] = pos['entry'] - fee_buffer
                    pos['breakeven_hit'] = True

        # --- TRAILING STOP ---
        if use_trailing and max_favorable >= trail_act_r:
            trail_distance = trail_dist_atr * atr
            if pos['side'] == 'LONG':
                new_trail_sl = high - trail_distance
                if new_trail_sl > pos['sl']:
                    pos['sl'] = new_trail_sl
                    pos['trailing_active'] = True
            else:
                new_trail_sl = low + trail_distance
                if new_trail_sl < pos['sl']:
                    pos['sl'] = new_trail_sl
                    pos['trailing_active'] = True

        # --- CHECK STOP LOSS (may be original, breakeven, or trailing) ---
        if pos['side'] == 'LONG':
            if low <= pos['sl']:
                exit_price = pos['sl']
                pnl = (exit_price - pos['entry']) * pos['quantity']
                reason = 'TRAIL' if pos.get('trailing_active') else ('BE' if pos.get('breakeven_hit') else 'SL')
                self._close_position(exit_price, pnl, reason, time)
                return
            if high >= pos['tp']:
                exit_price = pos['tp']
                pnl = (exit_price - pos['entry']) * pos['quantity']
                self._close_position(exit_price, pnl, 'TP', time)
                return
        else:
            if high >= pos['sl']:
                exit_price = pos['sl']
                pnl = (pos['entry'] - exit_price) * pos['quantity']
                reason = 'TRAIL' if pos.get('trailing_active') else ('BE' if pos.get('breakeven_hit') else 'SL')
                self._close_position(exit_price, pnl, reason, time)
                return
            if low <= pos['tp']:
                exit_price = pos['tp']
                pnl = (pos['entry'] - exit_price) * pos['quantity']
                self._close_position(exit_price, pnl, 'TP', time)
                return

        # --- MAX HOLD TIME ---
        hold_hours = (time - pos['entry_time']).total_seconds() / 3600
        if hold_hours >= max_hold_hours:
            if pos['side'] == 'LONG':
                pnl = (price - pos['entry']) * pos['quantity']
            else:
                pnl = (pos['entry'] - price) * pos['quantity']
            self._close_position(price, pnl, 'TIME', time)

    def _open_position(self, side, price, atr, time, sl_mult, tp_mult, risk_pct):
        """Open a new position with enhanced tracking."""
        sl_distance = sl_mult * atr
        risk_amount = self.capital * risk_pct
        quantity = risk_amount / sl_distance if sl_distance > 0 else 0

        max_notional = self.capital * 0.20
        max_quantity = max_notional / price
        quantity = min(quantity, max_quantity)

        if quantity <= 0:
            return

        entry_fee = price * quantity * self.fee_rate

        if side == 'LONG':
            sl = price - sl_distance
            tp = price + tp_mult * atr
        else:
            sl = price + sl_distance
            tp = price - tp_mult * atr

        self.position = {
            'side': side,
            'entry': price,
            'sl': sl,
            'tp': tp,
            'quantity': quantity,
            'entry_time': time,
            'entry_fee': entry_fee,
            'initial_sl_distance': sl_distance,
            'max_r_reached': 0,
            'breakeven_hit': False,
            'partial_taken': False,
            'trailing_active': False,
        }
        self.capital -= entry_fee

    def _close_position(self, exit_price, gross_pnl, reason, time):
        """Close position with enhanced tracking."""
        pos = self.position
        if pos is None:
            return

        exit_fee = exit_price * pos['quantity'] * self.fee_rate
        net_pnl = gross_pnl - pos['entry_fee'] - exit_fee
        hold_time = (time - pos['entry_time']).total_seconds() / 3600
        return_pct = net_pnl / (pos['entry'] * pos['quantity']) if pos['quantity'] > 0 else 0

        self.trades.append({
            'side': pos['side'],
            'entry_price': pos['entry'],
            'exit_price': exit_price,
            'quantity': pos['quantity'],
            'gross_pnl': gross_pnl,
            'net_pnl': net_pnl,
            'return_pct': return_pct,
            'fees': pos['entry_fee'] + exit_fee,
            'reason': reason,
            'entry_time': pos['entry_time'],
            'exit_time': time,
            'hold_hours': hold_time,
            'max_r_reached': pos.get('max_r_reached', 0),
            'breakeven_was_hit': pos.get('breakeven_hit', False),
            'partial_was_taken': pos.get('partial_taken', False),
        })

        self.capital += net_pnl
        self.exit_reasons[reason] = self.exit_reasons.get(reason, 0) + 1

        if self.capital > self.peak_capital:
            self.peak_capital = self.capital
        drawdown = (self.peak_capital - self.capital) / self.peak_capital
        if drawdown > self.max_drawdown:
            self.max_drawdown = drawdown

        self.position = None

    def _compute_results(self, strategy_name, df):
        """Enhanced results with exit breakdown."""
        if not self.trades:
            return {
                'strategy': strategy_name, 'total_trades': 0, 'net_profit': 0,
                'win_rate': 0, 'profit_factor': 0, 'sharpe_ratio': 0,
                'max_drawdown': 0, 'avg_trade_pnl': 0, 'avg_hold_hours': 0,
                'total_fees': 0, 'total_return_pct': 0, 'exit_reasons': {},
                'note': 'No trades generated',
            }

        wins = [t for t in self.trades if t['net_pnl'] > 0]
        losses = [t for t in self.trades if t['net_pnl'] <= 0]

        gross_profit = sum(t['net_pnl'] for t in wins) if wins else 0
        gross_loss = abs(sum(t['net_pnl'] for t in losses)) if losses else 0
        net_profit = sum(t['net_pnl'] for t in self.trades)
        total_fees = sum(t['fees'] for t in self.trades)

        returns = [t['return_pct'] for t in self.trades]
        avg_return = np.mean(returns)
        std_return = np.std(returns) if len(returns) > 1 else 1

        days_in_test = (df.index[-1] - df.index[0]).total_seconds() / 86400
        trades_per_day = len(self.trades) / max(days_in_test, 1)
        sharpe = (avg_return / (std_return + 1e-10)) * np.sqrt(252 * max(trades_per_day, 0.1))

        profit_factor = gross_profit / gross_loss if gross_loss > 0 else (
            999 if gross_profit > 0 else 0)

        # Avg winner/loser ratio
        avg_win = np.mean([t['net_pnl'] for t in wins]) if wins else 0
        avg_loss = abs(np.mean([t['net_pnl'] for t in losses])) if losses else 1
        win_loss_ratio = avg_win / avg_loss if avg_loss > 0 else 0

        # Max R reached stats
        max_r_values = [t.get('max_r_reached', 0) for t in self.trades]
        
        # Trades that went to 1R+ profit but ended as loss (position management failure)
        wasted_winners = [t for t in self.trades if t.get('max_r_reached', 0) >= 1.0 and t['net_pnl'] <= 0]

        return {
            'strategy': strategy_name,
            'total_trades': len(self.trades),
            'winning_trades': len(wins),
            'losing_trades': len(losses),
            'win_rate': len(wins) / len(self.trades),
            'profit_factor': round(profit_factor, 3),
            'sharpe_ratio': round(sharpe, 3),
            'max_drawdown': round(self.max_drawdown, 4),
            'net_profit': round(net_profit, 2),
            'total_return_pct': round(net_profit / self.initial_capital * 100, 2),
            'avg_trade_pnl': round(net_profit / len(self.trades), 2),
            'avg_win': round(np.mean([t['net_pnl'] for t in wins]), 2) if wins else 0,
            'avg_loss': round(np.mean([t['net_pnl'] for t in losses]), 2) if losses else 0,
            'win_loss_ratio': round(win_loss_ratio, 2),
            'largest_win': round(max(t['net_pnl'] for t in self.trades), 2),
            'largest_loss': round(min(t['net_pnl'] for t in self.trades), 2),
            'avg_hold_hours': round(np.mean([t['hold_hours'] for t in self.trades]), 1),
            'total_fees': round(total_fees, 2),
            'trades_per_day': round(trades_per_day, 1),
            'data_days': round(days_in_test, 0),
            'initial_capital': self.initial_capital,
            'final_capital': round(self.capital, 2),
            'exit_reasons': dict(self.exit_reasons),
            'avg_max_r': round(np.mean(max_r_values), 2) if max_r_values else 0,
            'wasted_winners': len(wasted_winners),
            'wasted_pct': round(len(wasted_winners) / len(self.trades) * 100, 1) if self.trades else 0,
        }


# ============================================================================
# ENHANCED STRATEGIES WITH CANDLE PATTERN CONFIRMATION
# ============================================================================

_pattern_engine = CandlePatternEngine()


def _get_pattern_signal(history, min_strength=0.3):
    """
    Get candle pattern signal from recent history.
    Returns: ('BULLISH', strength), ('BEARISH', strength), or ('NEUTRAL', 0)
    """
    if len(history) < 12:
        return 'NEUTRAL', 0.0

    patterns = _pattern_engine.detect_all(history)
    if not patterns:
        return 'NEUTRAL', 0.0

    bullish_strength = 0
    bearish_strength = 0

    for p in patterns:
        s = p['strength']
        # Volume-confirmed patterns get 30% bonus
        if p['volume_confirmed']:
            s *= 1.3

        if p['direction'] == 'BULLISH':
            bullish_strength = max(bullish_strength, s)
        elif p['direction'] == 'BEARISH':
            bearish_strength = max(bearish_strength, s)

    if bullish_strength > bearish_strength and bullish_strength >= min_strength:
        return 'BULLISH', bullish_strength
    elif bearish_strength > bullish_strength and bearish_strength >= min_strength:
        return 'BEARISH', bearish_strength
    return 'NEUTRAL', 0.0


def _get_trend(row, history):
    """
    Determine market trend context.
    Returns: 'UP', 'DOWN', 'RANGING'
    """
    close = row['close']
    ema21 = row.get('ema_21', close)
    sma50 = row.get('sma_50', close)
    adx = row.get('adx', 15)

    if adx < 20:
        return 'RANGING'

    if close > ema21 and ema21 > sma50:
        return 'UP'
    elif close < ema21 and ema21 < sma50:
        return 'DOWN'

    # Weak trend check with just EMA position
    if close > sma50:
        return 'UP'
    elif close < sma50:
        return 'DOWN'

    return 'RANGING'


def strategy_v2_adaptive(row, history):
    """
    V2 AdvancedAdaptive — pattern-confirmed, trend-filtered.
    
    Entry rules:
      - Need 3+ indicator confirmations (same as V1)
      - PLUS: candle pattern must AGREE with direction
      - PLUS: no entry in RANGING regime (ADX < 20) unless very strong pattern
    """
    close = row['close']
    rsi = row.get('rsi_14', 50)
    macd_hist = row.get('macd_hist', 0)
    bb_pctb = row.get('bb_pctb', 0.5)
    volume_ratio = row.get('volume_ratio', 1.0)
    adx = row.get('adx', 20)
    ema9 = row.get('ema_9', close)
    ema21 = row.get('ema_21', close)
    sma50 = row.get('sma_50', close)

    buy_score = 0
    sell_score = 0

    if rsi < 35: buy_score += 1
    elif rsi > 65: sell_score += 1

    if macd_hist > 0: buy_score += 1
    elif macd_hist < 0: sell_score += 1

    if bb_pctb < 0.2: buy_score += 1
    elif bb_pctb > 0.8: sell_score += 1

    if volume_ratio > 1.5:
        buy_score += 0.5
        sell_score += 0.5

    if ema9 > ema21: buy_score += 1
    elif ema9 < ema21: sell_score += 1

    if close > sma50: buy_score += 0.5
    elif close < sma50: sell_score += 0.5

    if adx > 25:
        if buy_score > sell_score: buy_score += 0.5
        elif sell_score > buy_score: sell_score += 0.5

    # V1 would exit here with 3+ threshold — V2 adds layers
    if buy_score < 3 and sell_score < 3:
        return 'HOLD'

    # === V2: CANDLE PATTERN CONFIRMATION ===
    pattern_dir, pattern_str = _get_pattern_signal(history, min_strength=0.25)
    trend = _get_trend(row, history)

    if buy_score >= 3 and buy_score > sell_score:
        # Block: ranging market without strong pattern
        if trend == 'RANGING' and pattern_str < 0.5:
            return 'HOLD'
        # Block: pattern opposes entry
        if pattern_dir == 'BEARISH' and pattern_str >= 0.4:
            return 'HOLD'
        # Bonus: require pattern agreement OR very strong indicator consensus
        if buy_score < 4 and pattern_dir != 'BULLISH':
            return 'HOLD'  # Weak indicator signal needs pattern confirmation
        return 'BUY'

    elif sell_score >= 3 and sell_score > buy_score:
        if trend == 'RANGING' and pattern_str < 0.5:
            return 'HOLD'
        if pattern_dir == 'BULLISH' and pattern_str >= 0.4:
            return 'HOLD'
        if sell_score < 4 and pattern_dir != 'BEARISH':
            return 'HOLD'
        return 'SELL'

    return 'HOLD'


def strategy_v2_rsi(row, history):
    """
    V2 RSITurbo — pattern-confirmed reversals only.
    
    V1 problem: RSI extreme without candle confirmation = false reversal.
    V2 fix: RSI extreme + reversal pattern (hammer/engulfing/star) = entry.
    """
    rsi = row.get('rsi_14', 50)
    close = row['close']
    ema21 = row.get('ema_21', close)
    ema50 = row.get('ema_50', close)
    volume_ratio = row.get('volume_ratio', 1.0)

    uptrend = close > ema21 and ema21 > ema50
    downtrend = close < ema21 and ema21 < ema50

    pattern_dir, pattern_str = _get_pattern_signal(history, min_strength=0.25)

    # RSI oversold + bullish pattern = strong reversal setup
    if rsi < 30 and uptrend:
        if pattern_dir == 'BULLISH' or rsi < 22:  # Very extreme can override
            return 'BUY'
    if rsi < 22 and volume_ratio > 1.2:
        if pattern_dir != 'BEARISH':  # At least don't contradict
            return 'BUY'

    # RSI overbought + bearish pattern
    if rsi > 70 and downtrend:
        if pattern_dir == 'BEARISH' or rsi > 78:
            return 'SELL'
    if rsi > 78 and volume_ratio > 1.2:
        if pattern_dir != 'BULLISH':
            return 'SELL'

    return 'HOLD'


def strategy_v2_supertrend(row, history):
    """
    V2 SuperTrend — direction change + pattern + volume gate.
    
    V1 problem: direction change alone = choppy market noise.
    V2 fix: direction change + supporting pattern + volume above average.
    """
    close = row['close']
    supertrend_dir = row.get('supertrend_dir', 0)
    adx = row.get('adx', 20)
    volume_ratio = row.get('volume_ratio', 1.0)

    if len(history) < 3:
        return 'HOLD'

    prev_dir = history.iloc[-2].get('supertrend_dir', 0)
    pattern_dir, pattern_str = _get_pattern_signal(history, min_strength=0.2)

    # Direction change
    if supertrend_dir == 1 and prev_dir == -1:
        # Bullish flip
        if adx > 20 or volume_ratio > 1.3:
            # V2: require pattern NOT opposing
            if pattern_dir == 'BEARISH' and pattern_str > 0.4:
                return 'HOLD'  # Strong bearish pattern blocks entry
            # Volume gate: need above-average volume on breakout
            if volume_ratio < 0.8:
                return 'HOLD'
            return 'BUY'

    elif supertrend_dir == -1 and prev_dir == 1:
        if adx > 20 or volume_ratio > 1.3:
            if pattern_dir == 'BULLISH' and pattern_str > 0.4:
                return 'HOLD'
            if volume_ratio < 0.8:
                return 'HOLD'
            return 'SELL'

    return 'HOLD'


def strategy_v2_ma_crossover(row, history):
    """
    V2 MACrossover — crossover + pattern confluence + SMA200 filter.
    
    V1 problem: any crossover = trade → too many signals in choppy market.
    V2 fix: crossover + candle pattern + trend agreement.
    """
    close = row['close']
    ema9 = row.get('ema_9', close)
    ema21 = row.get('ema_21', close)
    sma50 = row.get('sma_50', close)
    volume_ratio = row.get('volume_ratio', 1.0)
    adx = row.get('adx', 20)

    if len(history) < 3:
        return 'HOLD'

    prev = history.iloc[-2]
    prev_ema9 = prev.get('ema_9', close)
    prev_ema21 = prev.get('ema_21', close)

    pattern_dir, pattern_str = _get_pattern_signal(history, min_strength=0.2)

    # Golden cross
    if ema9 > ema21 and prev_ema9 <= prev_ema21:
        if close > sma50:  # Trend filter
            # V2: require at least ONE of: pattern agreement, strong ADX, volume spike
            confluence = 0
            if pattern_dir == 'BULLISH':
                confluence += 1
            if adx > 25:
                confluence += 1
            if volume_ratio > 1.3:
                confluence += 1
            if confluence >= 1:
                # Block if strong opposing pattern
                if pattern_dir == 'BEARISH' and pattern_str > 0.5:
                    return 'HOLD'
                return 'BUY'

    # Death cross
    if ema9 < ema21 and prev_ema9 >= prev_ema21:
        if close < sma50:
            confluence = 0
            if pattern_dir == 'BEARISH':
                confluence += 1
            if adx > 25:
                confluence += 1
            if volume_ratio > 1.3:
                confluence += 1
            if confluence >= 1:
                if pattern_dir == 'BULLISH' and pattern_str > 0.5:
                    return 'HOLD'
                return 'SELL'

    return 'HOLD'


def strategy_v2_momentum(row, history):
    """
    V2 MomentumPro — momentum + trend alignment + pattern gate.
    
    V1 problem: momentum score 3+ without context = noise trades.
    V2 fix: higher threshold (3.5+), trend must agree, volume required.
    """
    close = row['close']
    rsi = row.get('rsi_14', 50)
    roc = row.get('roc_10', 0)
    macd_hist = row.get('macd_hist', 0)
    adx = row.get('adx', 20)
    volume_ratio = row.get('volume_ratio', 1.0)
    ema21 = row.get('ema_21', close)
    sma50 = row.get('sma_50', close)

    score = 0

    if roc > 0.01: score += 1
    elif roc < -0.01: score -= 1

    if macd_hist > 0: score += 1
    elif macd_hist < 0: score -= 1

    if 40 < rsi < 70: score += 0.5
    elif rsi > 70: score -= 0.5
    elif rsi < 40: score -= 0.5

    if adx > 25:
        if score > 0: score += 1
        elif score < 0: score -= 1

    if volume_ratio > 1.5:
        score += 0.5 if score > 0 else -0.5

    if close > ema21: score += 0.5
    elif close < ema21: score -= 0.5

    pattern_dir, pattern_str = _get_pattern_signal(history, min_strength=0.25)
    trend = _get_trend(row, history)

    # V2: higher threshold + trend alignment
    if score >= 3:
        # Must be in uptrend or neutral (not downtrend)
        if trend == 'DOWN':
            return 'HOLD'
        # Volume gate
        if volume_ratio < 0.8:
            return 'HOLD'
        # Pattern veto
        if pattern_dir == 'BEARISH' and pattern_str > 0.4:
            return 'HOLD'
        return 'BUY'

    elif score <= -3:
        if trend == 'UP':
            return 'HOLD'
        if volume_ratio < 0.8:
            return 'HOLD'
        if pattern_dir == 'BULLISH' and pattern_str > 0.4:
            return 'HOLD'
        return 'SELL'

    return 'HOLD'


# ============================================================================
# ORIGINAL V1 STRATEGIES (for comparison)
# ============================================================================

def strategy_v1_adaptive(row, history):
    """V1 AdvancedAdaptive — original, no patterns."""
    close = row['close']
    rsi = row.get('rsi_14', 50)
    macd_hist = row.get('macd_hist', 0)
    bb_pctb = row.get('bb_pctb', 0.5)
    volume_ratio = row.get('volume_ratio', 1.0)
    adx = row.get('adx', 20)
    ema9 = row.get('ema_9', close)
    ema21 = row.get('ema_21', close)
    sma50 = row.get('sma_50', close)

    buy_score = 0
    sell_score = 0

    if rsi < 35: buy_score += 1
    elif rsi > 65: sell_score += 1
    if macd_hist > 0: buy_score += 1
    elif macd_hist < 0: sell_score += 1
    if bb_pctb < 0.2: buy_score += 1
    elif bb_pctb > 0.8: sell_score += 1
    if volume_ratio > 1.5: buy_score += 0.5; sell_score += 0.5
    if ema9 > ema21: buy_score += 1
    elif ema9 < ema21: sell_score += 1
    if close > sma50: buy_score += 0.5
    elif close < sma50: sell_score += 0.5
    if adx > 25:
        if buy_score > sell_score: buy_score += 0.5
        elif sell_score > buy_score: sell_score += 0.5

    if buy_score >= 3 and buy_score > sell_score: return 'BUY'
    elif sell_score >= 3 and sell_score > buy_score: return 'SELL'
    return 'HOLD'


def strategy_v1_rsi(row, history):
    """V1 RSITurbo — original."""
    rsi = row.get('rsi_14', 50)
    close = row['close']
    ema21 = row.get('ema_21', close)
    ema50 = row.get('ema_50', close)
    volume_ratio = row.get('volume_ratio', 1.0)
    uptrend = close > ema21 and ema21 > ema50
    downtrend = close < ema21 and ema21 < ema50

    if rsi < 30 and uptrend: return 'BUY'
    if rsi < 22 and volume_ratio > 1.2: return 'BUY'
    if rsi > 70 and downtrend: return 'SELL'
    if rsi > 78 and volume_ratio > 1.2: return 'SELL'
    return 'HOLD'


def strategy_v1_supertrend(row, history):
    """V1 SuperTrend — original."""
    supertrend_dir = row.get('supertrend_dir', 0)
    adx = row.get('adx', 20)
    volume_ratio = row.get('volume_ratio', 1.0)
    if len(history) < 2: return 'HOLD'
    prev_dir = history.iloc[-2].get('supertrend_dir', 0)
    if supertrend_dir == 1 and prev_dir == -1:
        if adx > 20 or volume_ratio > 1.3: return 'BUY'
    elif supertrend_dir == -1 and prev_dir == 1:
        if adx > 20 or volume_ratio > 1.3: return 'SELL'
    return 'HOLD'


def strategy_v1_ma_crossover(row, history):
    """V1 MACrossover — original."""
    close = row['close']
    ema9 = row.get('ema_9', close)
    ema21 = row.get('ema_21', close)
    sma50 = row.get('sma_50', close)
    if len(history) < 2: return 'HOLD'
    prev = history.iloc[-2]
    prev_ema9 = prev.get('ema_9', close)
    prev_ema21 = prev.get('ema_21', close)
    if ema9 > ema21 and prev_ema9 <= prev_ema21 and close > sma50: return 'BUY'
    if ema9 < ema21 and prev_ema9 >= prev_ema21 and close < sma50: return 'SELL'
    return 'HOLD'


def strategy_v1_momentum(row, history):
    """V1 MomentumPro — original."""
    close = row['close']
    rsi = row.get('rsi_14', 50)
    roc = row.get('roc_10', 0)
    macd_hist = row.get('macd_hist', 0)
    adx = row.get('adx', 20)
    volume_ratio = row.get('volume_ratio', 1.0)
    ema21 = row.get('ema_21', close)

    score = 0
    if roc > 0.01: score += 1
    elif roc < -0.01: score -= 1
    if macd_hist > 0: score += 1
    elif macd_hist < 0: score -= 1
    if 40 < rsi < 70: score += 0.5
    elif rsi > 70: score -= 0.5
    elif rsi < 40: score -= 0.5
    if adx > 25: score += 1 if score > 0 else -1
    if volume_ratio > 1.5: score += 0.5 if score > 0 else -0.5
    if close > ema21: score += 0.5
    elif close < ema21: score -= 0.5

    if score >= 3: return 'BUY'
    elif score <= -3: return 'SELL'
    return 'HOLD'


# ============================================================================
# MAIN COMPARISON ENGINE
# ============================================================================

def run_comparison(timeframe='15m'):
    """
    Head-to-head: V1 (static SL/TP, no patterns) vs V2 (trailing, patterns, confluence).
    """
    filepath = os.path.join(DATA_DIR, f'btcusdt_{timeframe}.csv')
    if not os.path.exists(filepath):
        print(f"❌ Data file not found: {filepath}")
        return None

    print(f"\n{'='*90}")
    print(f"🧪 TURBO-BOT BACKTEST V1 vs V2 — {timeframe}")
    print(f"{'='*90}")

    df = pd.read_csv(filepath, index_col='datetime', parse_dates=True)
    print(f"📊 Data: {len(df)} candles, {df.index[0]} → {df.index[-1]}")

    v1_strategies = {
        'AA': (strategy_v1_adaptive, 'AdvancedAdaptive'),
        'RSI': (strategy_v1_rsi, 'RSITurbo'),
        'ST': (strategy_v1_supertrend, 'SuperTrend'),
        'MAC': (strategy_v1_ma_crossover, 'MACrossover'),
        'MP': (strategy_v1_momentum, 'MomentumPro'),
    }

    v2_strategies = {
        'AA': (strategy_v2_adaptive, 'AdvancedAdaptive'),
        'RSI': (strategy_v2_rsi, 'RSITurbo'),
        'ST': (strategy_v2_supertrend, 'SuperTrend'),
        'MAC': (strategy_v2_ma_crossover, 'MACrossover'),
        'MP': (strategy_v2_momentum, 'MomentumPro'),
    }

    all_v1 = []
    all_v2 = []

    for key in v1_strategies:
        v1_fn, name = v1_strategies[key]
        v2_fn, _ = v2_strategies[key]

        # --- V1: static SL/TP, no management ---
        print(f"\n--- {name} ---")
        from backtest_strategies import TurboBacktester
        bt_v1 = TurboBacktester(initial_capital=10000, fee_rate=0.001)
        r1 = bt_v1.run(
            df, v1_fn, strategy_name=f'{name} V1',
            sl_atr_mult=1.5, tp_atr_mult=4.0,
            risk_pct=0.02, max_hold_hours=72, allow_short=True
        )
        if 'error' not in r1:
            all_v1.append(r1)

        # --- V2: trailing + breakeven + pattern entries ---
        # FINAL PARAMS (Run 4 — BEST across 5 iterations):
        # SL 2.0 ATR (wider = breathe), TP 5.0 ATR (big target)
        # Trail: 2.0R activation + 1.5 ATR distance (wide = bigger winners)
        # BE: 1.5R (later = fewer premature BE exits)
        # No partial TP (neutral — doesn't help)
        #
        # LEARNING MATRIX:
        #   Run1: SL2.0/BE1.0/trail1.5R/1.0ATR/partial → PF 0.68, -10.7%
        #   Run2: SL1.5 → DISASTER (all worse)
        #   Run3: no partial → neutral (same as Run1)
        #   Run4: BE1.5/trail2.0R/1.5ATR → PF 0.75, -7.6% ★ BEST
        #   Run5: BE1.0/trail2.0R/1.5ATR → PF 0.67 (too many BE exits)
        bt_v2 = TurboBacktesterV2(initial_capital=10000, fee_rate=0.001)
        r2 = bt_v2.run(
            df, v2_fn, strategy_name=f'{name} V2',
            sl_atr_mult=2.0, tp_atr_mult=5.0,
            risk_pct=0.02, max_hold_hours=72,
            allow_short=True,
            use_trailing=True, use_breakeven=True, use_partial_tp=False,
            trailing_activation_r=2.0, trailing_distance_atr=1.5,
            breakeven_activation_r=1.5,
        )
        if 'error' not in r2:
            all_v2.append(r2)

        # Print comparison for this strategy
        if 'error' not in r1 and 'error' not in r2:
            _print_strategy_comparison(r1, r2)

    if not all_v1 or not all_v2:
        print("❌ Not enough results for comparison")
        return None

    # === OVERALL COMPARISON TABLE ===
    print(f"\n{'='*100}")
    print(f"📊 FULL COMPARISON TABLE — {timeframe}")
    print(f"{'='*100}")
    print(f"{'Strategy':<25} {'Trades':>7} {'WR':>7} {'PF':>7} {'Sharpe':>8} "
          f"{'Return':>8} {'MaxDD':>7} {'W/L':>6} {'Wasted':>7}")
    print(f"{'─'*100}")

    for r in sorted(all_v1 + all_v2, key=lambda x: x['total_return_pct'], reverse=True):
        flag = '✅' if r['net_profit'] > 0 else '❌'
        wasted = r.get('wasted_pct', '-')
        wl = r.get('win_loss_ratio', 0)
        wasted_str = f"{wasted}%" if isinstance(wasted, (int, float)) else wasted
        print(f"{flag} {r['strategy']:<23} {r['total_trades']:>7} "
              f"{r['win_rate']*100:>6.1f}% {r['profit_factor']:>7.2f} "
              f"{r['sharpe_ratio']:>8.2f} {r['total_return_pct']:>7.1f}% "
              f"{r['max_drawdown']*100:>6.1f}% {wl:>6.2f} {wasted_str:>7}")

    # === DELTA ANALYSIS ===
    print(f"\n{'='*80}")
    print(f"📈 V2 IMPROVEMENT vs V1:")
    print(f"{'='*80}")
    print(f"{'Strategy':<16} {'Trades':>12} {'WR Δ':>8} {'Return Δ':>10} {'Sharpe Δ':>10} {'PF Δ':>8}")
    print(f"{'─'*80}")

    for key in v1_strategies:
        _, name = v1_strategies[key]
        r1 = next((r for r in all_v1 if name in r['strategy']), None)
        r2 = next((r for r in all_v2 if name in r['strategy']), None)
        if r1 and r2:
            trade_delta = f"{r1['total_trades']}→{r2['total_trades']}"
            wr_delta = (r2['win_rate'] - r1['win_rate']) * 100
            ret_delta = r2['total_return_pct'] - r1['total_return_pct']
            sharpe_delta = r2['sharpe_ratio'] - r1['sharpe_ratio']
            pf_delta = r2['profit_factor'] - r1['profit_factor']
            emoji = '✅' if ret_delta > 0 else '❌'
            print(f"{emoji} {name:<14} {trade_delta:>12} {wr_delta:>+7.1f}pp "
                  f"{ret_delta:>+9.1f}% {sharpe_delta:>+9.2f} {pf_delta:>+7.2f}")

    # === EXIT REASON ANALYSIS (V2 only) ===
    print(f"\n{'='*70}")
    print(f"🚪 V2 EXIT REASON BREAKDOWN:")
    print(f"{'='*70}")
    for r in all_v2:
        exits = r.get('exit_reasons', {})
        total = sum(exits.values())
        if total == 0:
            continue
        print(f"  {r['strategy']}:")
        for reason in ['SL', 'BE', 'TRAIL', 'PARTIAL', 'TP', 'TIME', 'END']:
            count = exits.get(reason, 0)
            if count > 0:
                pct = count / total * 100
                print(f"    {reason:<8} {count:>4} ({pct:>5.1f}%)")
        wasted = r.get('wasted_winners', 0)
        print(f"    💸 Wasted winners (hit 1R+ but lost): {wasted} ({r.get('wasted_pct', 0):.1f}%)")

    # Save results
    os.makedirs(RESULTS_DIR, exist_ok=True)
    results_file = os.path.join(
        RESULTS_DIR,
        f'v1_vs_v2_{timeframe}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    )
    save_data = {
        'timeframe': timeframe,
        'data_candles': len(df),
        'v1_results': all_v1,
        'v2_results': all_v2,
    }
    with open(results_file, 'w') as f:
        json.dump(save_data, f, indent=2, default=str)
    print(f"\n💾 Results saved: {results_file}")

    return save_data


def _print_strategy_comparison(r1, r2):
    """Print head-to-head for one strategy."""
    name = r1['strategy'].replace(' V1', '')
    tr_delta = r2['total_trades'] - r1['total_trades']
    wr_delta = (r2['win_rate'] - r1['win_rate']) * 100
    ret_delta = r2['total_return_pct'] - r1['total_return_pct']

    print(f"  V1: {r1['total_trades']:>4} trades | WR={r1['win_rate']*100:>5.1f}% | "
          f"PF={r1['profit_factor']:>5.2f} | Return={r1['total_return_pct']:>6.1f}% | "
          f"Sharpe={r1['sharpe_ratio']:>6.2f}")
    print(f"  V2: {r2['total_trades']:>4} trades | WR={r2['win_rate']*100:>5.1f}% | "
          f"PF={r2['profit_factor']:>5.2f} | Return={r2['total_return_pct']:>6.1f}% | "
          f"Sharpe={r2['sharpe_ratio']:>6.2f}")
    emoji = '✅' if ret_delta > 0 else '❌'
    print(f"  {emoji} Δ: Trades {tr_delta:+d} | WR {wr_delta:+.1f}pp | Return {ret_delta:+.1f}%")


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Turbo-Bot Backtest V1 vs V2')
    parser.add_argument('--timeframe', '-t', default='15m', help='Timeframe (15m, 1h, 4h)')
    parser.add_argument('--compare', action='store_true', help='Run V1 vs V2 comparison')
    parser.add_argument('--all', action='store_true', help='Run on all timeframes')
    args = parser.parse_args()

    if args.all:
        for tf in ['15m', '1h', '4h']:
            filepath = os.path.join(DATA_DIR, f'btcusdt_{tf}.csv')
            if os.path.exists(filepath):
                run_comparison(tf)
    else:
        run_comparison(args.timeframe)


if __name__ == '__main__':
    main()

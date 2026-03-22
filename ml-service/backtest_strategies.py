"""
🧪 TURBO-BOT — Backtest Engine
Walk-forward backtester with proper fee accounting.

Tests all 5 bot strategies individually and as ensemble.
Reports: Win Rate, Profit Factor, Max Drawdown, Sharpe Ratio per strategy.

Usage:
    python3 backtest_strategies.py
"""

import pandas as pd
import numpy as np
import os
import sys
import json
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
RESULTS_DIR = os.path.join(os.path.dirname(__file__), 'results')


class TurboBacktester:
    """Walk-forward backtester with realistic fee accounting."""
    
    def __init__(self, initial_capital=10000, fee_rate=0.001):
        """
        Args:
            initial_capital: Starting capital in USDT
            fee_rate: Fee per side (0.001 = 0.1% maker/taker)
        """
        self.initial_capital = initial_capital
        self.fee_rate = fee_rate
        self.trades = []
        self.equity_curve = []
        self.capital = initial_capital
        self.peak_capital = initial_capital
        self.max_drawdown = 0
        self.position = None
    
    def reset(self):
        """Reset backtester state."""
        self.trades = []
        self.equity_curve = []
        self.capital = self.initial_capital
        self.peak_capital = self.initial_capital
        self.max_drawdown = 0
        self.position = None
    
    def run(self, df, strategy_fn, strategy_name='Unknown',
            sl_atr_mult=1.5, tp_atr_mult=4.0, risk_pct=0.02,
            max_hold_hours=72, allow_short=True):
        """
        Run backtest on OHLCV data with indicators.
        
        Args:
            df: DataFrame with OHLCV + indicators
            strategy_fn: Function(row, history) → 'BUY' | 'SELL' | 'HOLD'
            strategy_name: Name for reporting
            sl_atr_mult: ATR multiplier for stop loss
            tp_atr_mult: ATR multiplier for take profit
            risk_pct: Risk per trade as fraction of capital
            max_hold_hours: Max position hold time (hours)
            allow_short: Allow SELL signals as SHORT entries
        
        Returns:
            dict with backtest results
        """
        self.reset()
        
        # Need at least 200 candles for warmup
        warmup = 200
        if len(df) < warmup + 50:
            return {'error': f'Insufficient data: {len(df)} rows (need {warmup + 50}+)'}
        
        # Detect timeframe from data
        if len(df) > 1:
            timediff = (df.index[1] - df.index[0]).total_seconds()
            tf_hours = timediff / 3600
        else:
            tf_hours = 0.25  # default 15m
        
        for i in range(warmup, len(df)):
            row = df.iloc[i]
            history = df.iloc[max(0, i - warmup):i]
            
            current_price = row['close']
            current_atr = row.get('atr', current_price * 0.01)
            current_time = df.index[i]
            
            # === POSITION MANAGEMENT ===
            if self.position is not None:
                pos = self.position
                
                # Check stop loss
                if pos['side'] == 'LONG':
                    hit_sl = row['low'] <= pos['sl']
                    hit_tp = row['high'] >= pos['tp']
                    
                    if hit_sl:
                        exit_price = pos['sl']
                        pnl = (exit_price - pos['entry']) * pos['quantity']
                        self._close_position(exit_price, pnl, 'SL', current_time)
                    elif hit_tp:
                        exit_price = pos['tp']
                        pnl = (exit_price - pos['entry']) * pos['quantity']
                        self._close_position(exit_price, pnl, 'TP', current_time)
                
                elif pos['side'] == 'SHORT':
                    hit_sl = row['high'] >= pos['sl']
                    hit_tp = row['low'] <= pos['tp']
                    
                    if hit_sl:
                        exit_price = pos['sl']
                        pnl = (pos['entry'] - exit_price) * pos['quantity']
                        self._close_position(exit_price, pnl, 'SL', current_time)
                    elif hit_tp:
                        exit_price = pos['tp']
                        pnl = (pos['entry'] - exit_price) * pos['quantity']
                        self._close_position(exit_price, pnl, 'TP', current_time)
                
                # Check max hold time
                if self.position is not None:
                    hold_hours = (current_time - pos['entry_time']).total_seconds() / 3600
                    if hold_hours >= max_hold_hours:
                        if pos['side'] == 'LONG':
                            pnl = (current_price - pos['entry']) * pos['quantity']
                        else:
                            pnl = (pos['entry'] - current_price) * pos['quantity']
                        self._close_position(current_price, pnl, 'TIME', current_time)
            
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
    
    def _open_position(self, side, price, atr, time, sl_mult, tp_mult, risk_pct):
        """Open a new position."""
        # Calculate position size based on risk
        sl_distance = sl_mult * atr
        risk_amount = self.capital * risk_pct
        quantity = risk_amount / sl_distance if sl_distance > 0 else 0
        
        # Don't exceed 20% of capital
        max_notional = self.capital * 0.20
        max_quantity = max_notional / price
        quantity = min(quantity, max_quantity)
        
        if quantity <= 0:
            return
        
        # Entry fee
        entry_fee = price * quantity * self.fee_rate
        
        if side == 'LONG':
            sl = price - sl_mult * atr
            tp = price + tp_mult * atr
        else:
            sl = price + sl_mult * atr
            tp = price - tp_mult * atr
        
        self.position = {
            'side': side,
            'entry': price,
            'sl': sl,
            'tp': tp,
            'quantity': quantity,
            'entry_time': time,
            'entry_fee': entry_fee,
        }
        self.capital -= entry_fee
    
    def _close_position(self, exit_price, gross_pnl, reason, time):
        """Close position, record trade."""
        pos = self.position
        if pos is None:
            return
        
        exit_fee = exit_price * pos['quantity'] * self.fee_rate
        net_pnl = gross_pnl - pos['entry_fee'] - exit_fee
        
        hold_time = (time - pos['entry_time']).total_seconds() / 3600  # hours
        
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
        })
        
        self.capital += net_pnl
        
        # Track drawdown
        if self.capital > self.peak_capital:
            self.peak_capital = self.capital
        drawdown = (self.peak_capital - self.capital) / self.peak_capital
        if drawdown > self.max_drawdown:
            self.max_drawdown = drawdown
        
        self.position = None
    
    def _compute_results(self, strategy_name, df):
        """Compute comprehensive backtest metrics."""
        if not self.trades:
            return {
                'strategy': strategy_name,
                'total_trades': 0,
                'net_profit': 0,
                'win_rate': 0,
                'profit_factor': 0,
                'sharpe_ratio': 0,
                'max_drawdown': 0,
                'avg_trade_pnl': 0,
                'avg_hold_hours': 0,
                'total_fees': 0,
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
        
        # Annualized Sharpe (assuming ~250 trading days)
        days_in_test = (df.index[-1] - df.index[0]).total_seconds() / 86400
        trades_per_day = len(self.trades) / max(days_in_test, 1)
        sharpe = (avg_return / (std_return + 1e-10)) * np.sqrt(252 * max(trades_per_day, 0.1))
        
        # Profit Factor
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else (
            999 if gross_profit > 0 else 0
        )
        
        # Expectancy per trade
        expectancy = net_profit / len(self.trades)
        
        # Maximum consecutive losses
        max_consec_losses = 0
        current_streak = 0
        for t in self.trades:
            if t['net_pnl'] <= 0:
                current_streak += 1
                max_consec_losses = max(max_consec_losses, current_streak)
            else:
                current_streak = 0
        
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
            'avg_trade_pnl': round(expectancy, 2),
            'avg_win': round(np.mean([t['net_pnl'] for t in wins]), 2) if wins else 0,
            'avg_loss': round(np.mean([t['net_pnl'] for t in losses]), 2) if losses else 0,
            'largest_win': round(max(t['net_pnl'] for t in self.trades), 2),
            'largest_loss': round(min(t['net_pnl'] for t in self.trades), 2),
            'avg_hold_hours': round(np.mean([t['hold_hours'] for t in self.trades]), 1),
            'max_consecutive_losses': max_consec_losses,
            'total_fees': round(total_fees, 2),
            'trades_per_day': round(trades_per_day, 1),
            'data_days': round(days_in_test, 0),
            'initial_capital': self.initial_capital,
            'final_capital': round(self.capital, 2),
        }


# ============================================================================
# STRATEGY IMPLEMENTATIONS (mirror bot's src/modules/strategy-runner.js)
# ============================================================================

def strategy_advanced_adaptive(row, history):
    """
    AdvancedAdaptive strategy — 6 indicators, 3+ confirmations required.
    Mirrors: strategy-runner.js AdvancedAdaptive
    """
    close = row['close']
    rsi = row.get('rsi_14', 50)
    macd_hist = row.get('macd_hist', 0)
    bb_pctb = row.get('bb_pctb', 0.5)
    volume_ratio = row.get('volume_ratio', 1.0)
    adx = row.get('adx', 20)
    atr_pct = row.get('atr_pct', 0.01)
    ema9 = row.get('ema_9', close)
    ema21 = row.get('ema_21', close)
    sma50 = row.get('sma_50', close)
    
    buy_score = 0
    sell_score = 0
    
    # RSI
    if rsi < 35:
        buy_score += 1
    elif rsi > 65:
        sell_score += 1
    
    # MACD histogram
    if macd_hist > 0:
        buy_score += 1
    elif macd_hist < 0:
        sell_score += 1
    
    # Bollinger %B
    if bb_pctb < 0.2:
        buy_score += 1
    elif bb_pctb > 0.8:
        sell_score += 1
    
    # Volume confirmation
    if volume_ratio > 1.5:
        buy_score += 0.5
        sell_score += 0.5
    
    # EMA crossover
    if ema9 > ema21:
        buy_score += 1
    elif ema9 < ema21:
        sell_score += 1
    
    # Trend filter (price vs SMA50)
    if close > sma50:
        buy_score += 0.5
    elif close < sma50:
        sell_score += 0.5
    
    # ADX trend strength
    if adx > 25:
        if buy_score > sell_score:
            buy_score += 0.5
        elif sell_score > buy_score:
            sell_score += 0.5
    
    # Need 3+ confirmations
    if buy_score >= 3 and buy_score > sell_score:
        return 'BUY'
    elif sell_score >= 3 and sell_score > buy_score:
        return 'SELL'
    return 'HOLD'


def strategy_rsi_turbo(row, history):
    """
    RSITurbo strategy — RSI zones + trend context.
    Mirrors: strategy-runner.js RSITurbo
    """
    rsi = row.get('rsi_14', 50)
    close = row['close']
    ema21 = row.get('ema_21', close)
    ema50 = row.get('ema_50', close)
    volume_ratio = row.get('volume_ratio', 1.0)
    
    # Trend context
    uptrend = close > ema21 and ema21 > ema50
    downtrend = close < ema21 and ema21 < ema50
    
    # RSI oversold in uptrend
    if rsi < 30 and uptrend:
        return 'BUY'
    # RSI extremely oversold (any context)
    if rsi < 22 and volume_ratio > 1.2:
        return 'BUY'
    
    # RSI overbought in downtrend
    if rsi > 70 and downtrend:
        return 'SELL'
    # RSI extremely overbought
    if rsi > 78 and volume_ratio > 1.2:
        return 'SELL'
    
    return 'HOLD'


def strategy_supertrend(row, history):
    """
    SuperTrend strategy — trend following.
    Mirrors: strategy-runner.js SuperTrend class
    """
    close = row['close']
    supertrend_dir = row.get('supertrend_dir', 0)
    adx = row.get('adx', 20)
    volume_ratio = row.get('volume_ratio', 1.0)
    
    if len(history) < 2:
        return 'HOLD'
    
    prev_dir = history.iloc[-2].get('supertrend_dir', 0)
    
    # Direction change = signal
    if supertrend_dir == 1 and prev_dir == -1:
        # Trend turned bullish
        if adx > 20 or volume_ratio > 1.3:
            return 'BUY'
    elif supertrend_dir == -1 and prev_dir == 1:
        # Trend turned bearish
        if adx > 20 or volume_ratio > 1.3:
            return 'SELL'
    
    return 'HOLD'


def strategy_ma_crossover(row, history):
    """
    MA Crossover strategy — EMA9/EMA21 crossover with SMA50 filter.
    Mirrors: strategy-runner.js MACrossover class
    """
    close = row['close']
    ema9 = row.get('ema_9', close)
    ema21 = row.get('ema_21', close)
    sma50 = row.get('sma_50', close)
    volume_ratio = row.get('volume_ratio', 1.0)
    
    if len(history) < 2:
        return 'HOLD'
    
    prev = history.iloc[-2]
    prev_ema9 = prev.get('ema_9', close)
    prev_ema21 = prev.get('ema_21', close)
    
    # Golden cross: EMA9 crosses above EMA21
    if ema9 > ema21 and prev_ema9 <= prev_ema21:
        if close > sma50:  # Trend filter
            return 'BUY'
    
    # Death cross: EMA9 crosses below EMA21
    if ema9 < ema21 and prev_ema9 >= prev_ema21:
        if close < sma50:  # Trend filter
            return 'SELL'
    
    return 'HOLD'


def strategy_momentum_pro(row, history):
    """
    MomentumPro strategy — Multi-factor momentum.
    Mirrors: strategy-runner.js MomentumPro class
    """
    close = row['close']
    rsi = row.get('rsi_14', 50)
    roc = row.get('roc_10', 0)
    macd_hist = row.get('macd_hist', 0)
    adx = row.get('adx', 20)
    volume_ratio = row.get('volume_ratio', 1.0)
    ema21 = row.get('ema_21', close)
    
    # Momentum score
    score = 0
    
    # ROC positive and accelerating
    if roc > 0.01:
        score += 1
    elif roc < -0.01:
        score -= 1
    
    # MACD histogram positive
    if macd_hist > 0:
        score += 1
    elif macd_hist < 0:
        score -= 1
    
    # RSI momentum zone
    if 40 < rsi < 70:
        score += 0.5  # Healthy momentum
    elif rsi > 70:
        score -= 0.5  # Exhaustion risk
    elif rsi < 40:
        score -= 0.5
    
    # ADX strong trend
    if adx > 25:
        if score > 0:
            score += 1
        elif score < 0:
            score -= 1
    
    # Volume confirmation
    if volume_ratio > 1.5:
        score += 0.5 if score > 0 else -0.5
    
    # Price above/below EMA21
    if close > ema21:
        score += 0.5
    elif close < ema21:
        score -= 0.5
    
    # Need strong momentum (3+ score)
    if score >= 3:
        return 'BUY'
    elif score <= -3:
        return 'SELL'
    return 'HOLD'


# ============================================================================
# MAIN — Run backtests on all strategies
# ============================================================================

def run_all_backtests(timeframe='15m'):
    """Run backtest for all 5 strategies and print comparison."""
    
    filepath = os.path.join(DATA_DIR, f'btcusdt_{timeframe}.csv')
    
    if not os.path.exists(filepath):
        print(f"❌ Data file not found: {filepath}")
        print("   Run fetch_historical.py first!")
        return None
    
    print(f"\n{'='*60}")
    print(f"🧪 TURBO-BOT BACKTEST ENGINE — {timeframe}")
    print(f"{'='*60}")
    
    df = pd.read_csv(filepath, index_col='datetime', parse_dates=True)
    print(f"📊 Data: {len(df)} candles, {df.index[0]} → {df.index[-1]}")
    print(f"💰 Capital: $10,000 | Fee: 0.1% per side | SL: 1.5×ATR | TP: 4×ATR")
    
    strategies = {
        'AdvancedAdaptive': strategy_advanced_adaptive,
        'RSITurbo': strategy_rsi_turbo,
        'SuperTrend': strategy_supertrend,
        'MACrossover': strategy_ma_crossover,
        'MomentumPro': strategy_momentum_pro,
    }
    
    all_results = []
    
    for name, fn in strategies.items():
        print(f"\n--- {name} ---")
        backtester = TurboBacktester(initial_capital=10000, fee_rate=0.001)
        result = backtester.run(
            df, fn, strategy_name=name,
            sl_atr_mult=1.5, tp_atr_mult=4.0,
            risk_pct=0.02, max_hold_hours=72,
            allow_short=True
        )
        
        if 'error' in result:
            print(f"  ❌ {result['error']}")
            continue
        
        all_results.append(result)
        
        # Print result
        emoji = '✅' if result['net_profit'] > 0 else '❌'
        print(f"  {emoji} Trades: {result['total_trades']} | "
              f"Win Rate: {result['win_rate']*100:.1f}% | "
              f"PF: {result['profit_factor']:.2f} | "
              f"Sharpe: {result['sharpe_ratio']:.2f} | "
              f"MaxDD: {result['max_drawdown']*100:.1f}% | "
              f"Return: {result['total_return_pct']:.1f}% | "
              f"Fees: ${result['total_fees']:.2f}")
    
    if not all_results:
        print("❌ No results. Check data files.")
        return None
    
    # === COMPARISON TABLE ===
    print(f"\n{'='*80}")
    print(f"📊 STRATEGY COMPARISON — {timeframe}")
    print(f"{'='*80}")
    print(f"{'Strategy':<20} {'Trades':>7} {'WinRate':>8} {'PF':>6} {'Sharpe':>8} "
          f"{'MaxDD':>7} {'Return':>8} {'$/Trade':>8} {'Fees':>8}")
    print(f"{'─'*80}")
    
    for r in sorted(all_results, key=lambda x: x['net_profit'], reverse=True):
        flag = '✅' if r['net_profit'] > 0 else '❌'
        print(f"{flag} {r['strategy']:<17} {r['total_trades']:>7} "
              f"{r['win_rate']*100:>7.1f}% {r['profit_factor']:>6.2f} "
              f"{r['sharpe_ratio']:>8.2f} {r['max_drawdown']*100:>6.1f}% "
              f"{r['total_return_pct']:>7.1f}% {r['avg_trade_pnl']:>8.2f} "
              f"${r['total_fees']:>7.2f}")
    
    # === DECISION ===
    print(f"\n{'='*60}")
    print("🎯 DECISION:")
    profitable = [r for r in all_results if r['net_profit'] > 0 and r['profit_factor'] > 1.2]
    unprofitable = [r for r in all_results if r['net_profit'] <= 0 or r['profit_factor'] <= 1.0]
    
    if profitable:
        print(f"  ✅ KEEP: {', '.join(r['strategy'] for r in profitable)}")
    else:
        print(f"  ⚠️ No strategy has positive expectancy after fees!")
    
    if unprofitable:
        print(f"  ❌ DROP: {', '.join(r['strategy'] for r in unprofitable)}")
    
    # Correlation check
    print(f"\n📊 Baseline (no ML): Best strategy alone = "
          f"{max(r['total_return_pct'] for r in all_results):.1f}% return")
    
    # Save results
    os.makedirs(RESULTS_DIR, exist_ok=True)
    results_file = os.path.join(RESULTS_DIR, f'backtest_{timeframe}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json')
    with open(results_file, 'w') as f:
        json.dump(all_results, f, indent=2, default=str)
    print(f"\n💾 Results saved to: {results_file}")
    
    return all_results


def run_strategy_combos(timeframe='15m'):
    """
    Test strategy combinations and compute return correlation matrix.
    Identifies which strategies are complementary vs redundant.
    """
    from itertools import combinations

    filepath = os.path.join(DATA_DIR, f'btcusdt_{timeframe}.csv')
    if not os.path.exists(filepath):
        print(f"❌ Data file not found: {filepath}")
        return None

    print(f"\n{'='*60}")
    print(f"🔗 STRATEGY COMBINATIONS & CORRELATION — {timeframe}")
    print(f"{'='*60}")

    df = pd.read_csv(filepath, index_col='datetime', parse_dates=True)
    print(f"📊 Data: {len(df)} candles")

    strategies = {
        'AdvancedAdaptive': strategy_advanced_adaptive,
        'RSITurbo': strategy_rsi_turbo,
        'SuperTrend': strategy_supertrend,
        'MACrossover': strategy_ma_crossover,
        'MomentumPro': strategy_momentum_pro,
    }

    # === STEP 1: Collect per-candle signals for each strategy ===
    warmup = 200
    n = len(df) - warmup
    signal_matrix = {}

    for name, fn in strategies.items():
        signals = []
        for i in range(warmup, len(df)):
            row = df.iloc[i]
            history = df.iloc[max(0, i - warmup):i]
            try:
                sig = fn(row, history)
            except Exception:
                sig = 'HOLD'
            signals.append(1 if sig == 'BUY' else (-1 if sig == 'SELL' else 0))
        signal_matrix[name] = signals

    # === STEP 2: Return correlation matrix ===
    print(f"\n📊 Signal Correlation Matrix:")
    signal_df = pd.DataFrame(signal_matrix)

    corr_matrix = signal_df.corr()
    print(f"\n{'':>20}", end='')
    for name in strategies:
        print(f"{name[:8]:>10}", end='')
    print()

    for name1 in strategies:
        print(f"{name1:<20}", end='')
        for name2 in strategies:
            val = corr_matrix.loc[name1, name2]
            print(f"{val:>10.3f}", end='')
        print()

    # === STEP 3: Identify diversification pairs ===
    print(f"\n🎯 Diversification Analysis:")
    strategy_names = list(strategies.keys())
    pairs_corr = []
    for i, s1 in enumerate(strategy_names):
        for j, s2 in enumerate(strategy_names):
            if i < j:
                c = corr_matrix.loc[s1, s2]
                pairs_corr.append((s1, s2, c))

    pairs_corr.sort(key=lambda x: x[2])
    print(f"   Most diversified pairs (lowest correlation):")
    for s1, s2, c in pairs_corr[:3]:
        emoji = '✅' if c < 0.3 else '⚠️'
        print(f"   {emoji} {s1} + {s2}: r = {c:.3f}")
    print(f"\n   Most redundant pairs (highest correlation):")
    for s1, s2, c in pairs_corr[-3:]:
        emoji = '❌' if c > 0.7 else '⚠️'
        print(f"   {emoji} {s1} + {s2}: r = {c:.3f}")

    # === STEP 4: Test combo strategies (vote-based) ===
    print(f"\n🗳️ Combo Strategy Backtest (majority vote):")

    combo_results = []

    # Test all pairs and triples
    for k in [2, 3]:
        for combo in combinations(strategy_names, k):
            combo_name = '+'.join([s[:4] for s in combo])

            def combo_strategy(row, history, _combo=combo, _strategies=strategies):
                votes = 0
                for s in _combo:
                    try:
                        sig = _strategies[s](row, history)
                    except Exception:
                        sig = 'HOLD'
                    if sig == 'BUY':
                        votes += 1
                    elif sig == 'SELL':
                        votes -= 1
                # Majority vote
                threshold = len(_combo) / 2
                if votes >= threshold:
                    return 'BUY'
                elif votes <= -threshold:
                    return 'SELL'
                return 'HOLD'

            backtester = TurboBacktester(initial_capital=10000, fee_rate=0.001)
            result = backtester.run(
                df, combo_strategy, strategy_name=combo_name,
                sl_atr_mult=1.5, tp_atr_mult=4.0,
                risk_pct=0.02, max_hold_hours=72,
                allow_short=True
            )

            if 'error' not in result:
                combo_results.append(result)
                emoji = '✅' if result['net_profit'] > 0 else '❌'
                members = ' + '.join(combo)
                print(f"   {emoji} [{combo_name}] ({members}): "
                      f"Return={result['total_return_pct']:.1f}% | "
                      f"WR={result['win_rate']*100:.0f}% | "
                      f"Sharpe={result['sharpe_ratio']:.2f} | "
                      f"Trades={result['total_trades']}")

    # === STEP 5: Best combos ranking ===
    if combo_results:
        print(f"\n{'='*60}")
        print(f"🏆 TOP COMBOS (by Sharpe Ratio):")
        print(f"{'='*60}")
        combo_results.sort(key=lambda x: x['sharpe_ratio'], reverse=True)
        for i, r in enumerate(combo_results[:5]):
            emoji = '🥇🥈🥉'[i] if i < 3 else '  '
            print(f"   {emoji} {r['strategy']:<20} Sharpe={r['sharpe_ratio']:>6.2f} | "
                  f"Return={r['total_return_pct']:>6.1f}% | "
                  f"WR={r['win_rate']*100:.0f}% | "
                  f"MaxDD={r['max_drawdown']*100:.1f}%")

    # Save results
    os.makedirs(RESULTS_DIR, exist_ok=True)
    combo_file = os.path.join(
        RESULTS_DIR,
        f'combos_{timeframe}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    )
    save_data = {
        'correlation_matrix': corr_matrix.to_dict(),
        'diversification_pairs': [{'s1': s1, 's2': s2, 'corr': c} for s1, s2, c in pairs_corr],
        'combo_results': combo_results,
    }
    with open(combo_file, 'w') as f:
        json.dump(save_data, f, indent=2, default=str)
    print(f"\n💾 Combo results saved: {combo_file}")

    return save_data


def main():
    # Run on available timeframes
    for tf in ['15m', '1h', '4h']:
        filepath = os.path.join(DATA_DIR, f'btcusdt_{tf}.csv')
        if os.path.exists(filepath):
            results = run_all_backtests(tf)
        else:
            print(f"\n⚠️ No data for {tf} — skipping (run fetch_historical.py first)")

    # Run combo analysis on primary timeframe
    for tf in ['15m', '1h', '4h']:
        filepath = os.path.join(DATA_DIR, f'btcusdt_{tf}.csv')
        if os.path.exists(filepath):
            run_strategy_combos(tf)
            break  # Only run on first available


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
ENHANCED Comprehensive Trade Analysis Report Generator for Turbo-Bot
Uses bot_state.json (78 trades) instead of limited API (50 trades).
Includes NeuronAI analysis, ML status, source code excerpts, market data.
"""

import json
import sys
import os
import subprocess
from datetime import datetime, timezone, timedelta
from collections import Counter, defaultdict
import math

##############################
# DATA LOADING
##############################

def load_json_file(path):
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"  [WARN] Could not load {path}: {e}")
        return {}

def load_text_file(path):
    try:
        with open(path, 'r') as f:
            return f.read()
    except:
        return ""

def api_get(endpoint):
    import urllib.request
    try:
        req = urllib.request.urlopen(f'http://localhost:3001{endpoint}', timeout=10)
        return json.loads(req.read().decode())
    except Exception as e:
        print(f"  [WARN] API {endpoint}: {e}")
        return {}

##############################
# TRADE PAIRING
##############################

def format_timestamp(ts_ms):
    if not ts_ms or ts_ms == 0:
        return 'unknown'
    try:
        dt = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
        return dt.strftime('%Y-%m-%d %H:%M:%S UTC')
    except:
        return str(ts_ms)

def format_duration(seconds):
    if seconds <= 0:
        return 'N/A'
    if seconds < 60:
        return f'{seconds:.0f}s'
    elif seconds < 3600:
        return f'{seconds/60:.1f}m'
    elif seconds < 86400:
        return f'{seconds/3600:.1f}h'
    else:
        return f'{seconds/86400:.1f}d'

def dedup_trades(trades):
    """Remove duplicate trade records using timestamp proximity + action + price"""
    if not trades:
        return []
    
    sorted_trades = sorted(trades, key=lambda x: x.get('timestamp', 0))
    unique = [sorted_trades[0]]
    
    for t in sorted_trades[1:]:
        last = unique[-1]
        # Consider duplicate if within 500ms, same action, same price
        if (abs(t.get('timestamp', 0) - last.get('timestamp', 0)) < 500 and
            t.get('action', '') == last.get('action', '') and
            abs(t.get('price', 0) - last.get('price', 0)) < 1.0):
            # Keep the one with more info
            if len(str(t)) > len(str(last)):
                unique[-1] = t
        else:
            unique.append(t)
    
    return unique

def pair_round_trips(trades):
    """
    Pair ENTRY (BUY/SHORT) with EXIT (SELL/STOP_LOSS/CLOSE) into round-trip trades.
    Handle partial closes, QuantumPosMgr partial TP, and STOP_LOSS events.
    """
    round_trips = []
    open_position = None
    partial_exits = []
    trade_num = 0
    
    for t in trades:
        action = t.get('action', '').upper()
        tid = t.get('id', '')
        strategy = t.get('strategy', '?')
        
        if action in ('BUY', 'LONG'):
            if open_position:
                # Close existing position implicitly
                trade_num += 1
                rt = make_round_trip(open_position, t, trade_num, partial_exits)
                round_trips.append(rt)
                partial_exits = []
            
            open_position = {
                'direction': 'LONG',
                'entry_price': t.get('price', 0),
                'entry_time': t.get('timestamp', 0),
                'quantity': t.get('quantity', 0),
                'entry_strategy': strategy,
                'entry_fees': t.get('fees', 0),
                'remaining_qty': t.get('quantity', 0),
            }
            
        elif action == 'SHORT':
            if open_position:
                trade_num += 1
                rt = make_round_trip(open_position, t, trade_num, partial_exits)
                round_trips.append(rt)
                partial_exits = []
            
            open_position = {
                'direction': 'SHORT',
                'entry_price': t.get('price', 0),
                'entry_time': t.get('timestamp', 0),
                'quantity': t.get('quantity', 0),
                'entry_strategy': strategy,
                'entry_fees': t.get('fees', 0),
                'remaining_qty': t.get('quantity', 0),
            }
            
        elif action in ('SELL', 'CLOSE'):
            if open_position:
                sell_qty = t.get('quantity', 0)
                # Partial close check
                if (open_position['remaining_qty'] > 0 and 
                    sell_qty > 0 and 
                    sell_qty < open_position['remaining_qty'] * 0.80 and
                    'QUANTUM_TP' in tid):
                    partial_exits.append(t)
                    open_position['remaining_qty'] -= sell_qty
                else:
                    # Full close
                    trade_num += 1
                    rt = make_round_trip(open_position, t, trade_num, partial_exits)
                    round_trips.append(rt)
                    open_position = None
                    partial_exits = []
            else:
                # SELL without open = treat as entry+close if has entryPrice
                if t.get('entryPrice') and t.get('pnl') is not None:
                    trade_num += 1
                    rt = make_standalone_round_trip(t, trade_num)
                    round_trips.append(rt)
    
    return round_trips

def make_round_trip(open_pos, close_trade, trade_num, partial_exits):
    entry_price = open_pos['entry_price']
    exit_price = close_trade.get('price', 0)
    entry_time = open_pos['entry_time']
    exit_time = close_trade.get('timestamp', 0)
    quantity = open_pos['quantity']
    direction = open_pos['direction']
    
    if direction == 'LONG':
        gross_pnl = (exit_price - entry_price) * quantity
    else:
        gross_pnl = (entry_price - exit_price) * quantity
    
    entry_fees = open_pos.get('entry_fees', 0)
    exit_fees = close_trade.get('fees', 0)
    partial_fees = sum(p.get('fees', 0) for p in partial_exits)
    total_fees = entry_fees + exit_fees + partial_fees
    
    reported_pnl = close_trade.get('pnl', 0)
    net_pnl = reported_pnl if reported_pnl != 0 else (gross_pnl - total_fees)
    
    duration_s = (exit_time - entry_time) / 1000 if exit_time > entry_time else 0
    position_value = entry_price * quantity
    pnl_pct = (net_pnl / position_value * 100) if position_value > 0 else 0
    
    exit_strategy = close_trade.get('strategy', '?')
    exit_id = close_trade.get('id', '')
    if 'QUANTUM_TP' in exit_id:
        exit_reason = 'QuantumTP_Partial'
    elif 'STOP_LOSS' in exit_id.upper():
        exit_reason = 'StopLoss'
    elif 'TRAILING' in exit_id.upper():
        exit_reason = 'TrailingStop'
    elif 'TP' in exit_id.upper():
        exit_reason = 'TakeProfit'
    elif exit_strategy == 'NeuronAI':
        exit_reason = 'NeuronAI_Override'
    elif exit_strategy == 'QuantumPosMgr':
        exit_reason = 'QuantumPosMgr'
    elif exit_strategy == 'STOP_LOSS':
        exit_reason = 'StopLoss'
    else:
        exit_reason = f'{exit_strategy}_Signal'
    
    return {
        'trade_num': trade_num,
        'direction': direction,
        'entry_time': format_timestamp(entry_time),
        'entry_time_raw': entry_time,
        'exit_time': format_timestamp(exit_time),
        'exit_time_raw': exit_time,
        'entry_price': round(entry_price, 2),
        'exit_price': round(exit_price, 2),
        'quantity': round(quantity, 8),
        'position_value_usd': round(position_value, 2),
        'gross_pnl': round(gross_pnl, 4),
        'fees': round(total_fees, 4),
        'net_pnl': round(net_pnl, 4),
        'pnl_pct': round(pnl_pct, 4),
        'win_loss': 'WIN' if net_pnl > 0 else ('LOSS' if net_pnl < 0 else 'BREAK_EVEN'),
        'duration_s': round(duration_s, 1),
        'duration_human': format_duration(duration_s),
        'entry_strategy': open_pos.get('entry_strategy', '?'),
        'exit_strategy': exit_strategy,
        'exit_reason': exit_reason,
        'partial_closes': len(partial_exits),
    }

def make_standalone_round_trip(t, trade_num):
    entry_price = t.get('entryPrice', t.get('price', 0))
    exit_price = t.get('price', 0)
    quantity = t.get('quantity', 0)
    ts = t.get('timestamp', 0)
    fees = t.get('fees', 0)
    pnl = t.get('pnl', 0)
    strategy = t.get('strategy', '?')
    
    direction = 'SHORT' if entry_price > exit_price else 'LONG'
    gross_pnl = abs(entry_price - exit_price) * quantity
    position_value = entry_price * quantity
    pnl_pct = (pnl / position_value * 100) if position_value > 0 else 0
    
    tid = t.get('id', '')
    if 'STOP_LOSS' in tid.upper():
        exit_reason = 'StopLoss'
    elif strategy == 'NeuronAI':
        exit_reason = 'NeuronAI_Close'
    else:
        exit_reason = f'{strategy}_Close'
    
    return {
        'trade_num': trade_num,
        'direction': direction,
        'entry_time': 'implicit',
        'entry_time_raw': 0,
        'exit_time': format_timestamp(ts),
        'exit_time_raw': ts,
        'entry_price': round(entry_price, 2),
        'exit_price': round(exit_price, 2),
        'quantity': round(quantity, 8),
        'position_value_usd': round(position_value, 2),
        'gross_pnl': round(gross_pnl, 4),
        'fees': round(fees * 2, 4),
        'net_pnl': round(pnl, 4),
        'pnl_pct': round(pnl_pct, 4),
        'win_loss': 'WIN' if pnl > 0 else ('LOSS' if pnl < 0 else 'BREAK_EVEN'),
        'duration_s': 0,
        'duration_human': 'N/A',
        'entry_strategy': strategy,
        'exit_strategy': strategy,
        'exit_reason': exit_reason,
        'partial_closes': 0,
    }

##############################
# METRICS
##############################

def calculate_metrics(round_trips, initial_capital=10000):
    if not round_trips:
        return {'total_trades': 0}
    
    n = len(round_trips)
    wins = [rt for rt in round_trips if rt['win_loss'] == 'WIN']
    losses = [rt for rt in round_trips if rt['win_loss'] == 'LOSS']
    
    win_count = len(wins)
    loss_count = len(losses)
    win_rate = win_count / n * 100 if n > 0 else 0
    
    total_net_pnl = sum(rt['net_pnl'] for rt in round_trips)
    total_gross_pnl = sum(rt['gross_pnl'] for rt in round_trips)
    total_fees = sum(rt['fees'] for rt in round_trips)
    
    avg_pnl = total_net_pnl / n if n > 0 else 0
    avg_win = sum(rt['net_pnl'] for rt in wins) / win_count if win_count > 0 else 0
    avg_loss = sum(rt['net_pnl'] for rt in losses) / loss_count if loss_count > 0 else 0
    largest_win = max((rt['net_pnl'] for rt in wins), default=0)
    largest_loss = min((rt['net_pnl'] for rt in losses), default=0)
    
    gross_profit = sum(rt['net_pnl'] for rt in wins) if wins else 0
    gross_loss_val = abs(sum(rt['net_pnl'] for rt in losses)) if losses else 0.001
    profit_factor = gross_profit / gross_loss_val if gross_loss_val > 0 else float('inf')
    
    expectancy = (win_rate/100 * avg_win) + ((1 - win_rate/100) * avg_loss)
    rr_ratio = abs(avg_win / avg_loss) if avg_loss != 0 else float('inf')
    
    # Duration analysis
    durations = [rt['duration_s'] for rt in round_trips if rt['duration_s'] > 0]
    avg_duration = sum(durations) / len(durations) if durations else 0
    min_duration = min(durations) if durations else 0
    max_duration = max(durations) if durations else 0
    scalp_trades = len([d for d in durations if d < 300])
    short_trades = len([d for d in durations if 300 <= d < 900])
    medium_trades = len([d for d in durations if 900 <= d < 3600])
    long_trades = len([d for d in durations if d >= 3600])
    
    # Equity curve
    equity_curve = [initial_capital]
    for rt in round_trips:
        equity_curve.append(equity_curve[-1] + rt['net_pnl'])
    
    peak = equity_curve[0]
    max_dd = 0
    max_dd_pct = 0
    for eq in equity_curve:
        if eq > peak:
            peak = eq
        dd = peak - eq
        dd_pct = dd / peak * 100 if peak > 0 else 0
        if dd > max_dd:
            max_dd = dd
        if dd_pct > max_dd_pct:
            max_dd_pct = dd_pct
    
    # Sharpe (annualized using per-trade returns)
    returns = [rt['pnl_pct'] / 100 for rt in round_trips]
    if len(returns) > 1:
        mean_ret = sum(returns) / len(returns)
        std_ret = math.sqrt(sum((r - mean_ret)**2 for r in returns) / (len(returns) - 1))
        # Time-based annualization
        if round_trips[0]['entry_time_raw'] > 0 and round_trips[-1]['exit_time_raw'] > 0:
            span_days = (round_trips[-1]['exit_time_raw'] - round_trips[0]['entry_time_raw']) / 86400000
            trades_per_day = n / max(span_days, 1)
        else:
            trades_per_day = 10
        trades_per_year = trades_per_day * 365
        sharpe = (mean_ret / std_ret) * math.sqrt(trades_per_year) if std_ret > 0 else 0
    else:
        sharpe = 0
    
    # Sortino
    negative_returns = [r for r in returns if r < 0]
    if negative_returns and len(returns) > 1:
        downside_std = math.sqrt(sum(r**2 for r in negative_returns) / len(negative_returns))
        mean_ret = sum(returns) / len(returns)
        trades_per_year = trades_per_day * 365 if 'trades_per_day' in dir() else 3650
        sortino = (mean_ret / downside_std) * math.sqrt(trades_per_year) if downside_std > 0 else 0
    else:
        sortino = 0
    
    # Consecutive wins/losses
    max_consec_wins = max_consec_losses = 0
    cur_wins = cur_losses = 0
    for rt in round_trips:
        if rt['win_loss'] == 'WIN':
            cur_wins += 1
            cur_losses = 0
            max_consec_wins = max(max_consec_wins, cur_wins)
        elif rt['win_loss'] == 'LOSS':
            cur_losses += 1
            cur_wins = 0
            max_consec_losses = max(max_consec_losses, cur_losses)
        else:
            cur_wins = cur_losses = 0
    
    # Strategy performance
    strategy_performance = {}
    for strat in set(rt['entry_strategy'] for rt in round_trips):
        strat_trades = [rt for rt in round_trips if rt['entry_strategy'] == strat]
        strat_wins = len([rt for rt in strat_trades if rt['win_loss'] == 'WIN'])
        strat_pnl = sum(rt['net_pnl'] for rt in strat_trades)
        strat_fees = sum(rt['fees'] for rt in strat_trades)
        strategy_performance[strat] = {
            'trades': len(strat_trades),
            'wins': strat_wins,
            'losses': len(strat_trades) - strat_wins,
            'win_rate': round(strat_wins / len(strat_trades) * 100, 1) if strat_trades else 0,
            'total_pnl': round(strat_pnl, 2),
            'total_fees': round(strat_fees, 2),
            'avg_pnl': round(strat_pnl / len(strat_trades), 2) if strat_trades else 0,
        }
    
    # Direction breakdown
    long_list = [rt for rt in round_trips if rt['direction'] == 'LONG']
    short_list = [rt for rt in round_trips if rt['direction'] == 'SHORT']
    long_wins = len([rt for rt in long_list if rt['win_loss'] == 'WIN'])
    short_wins = len([rt for rt in short_list if rt['win_loss'] == 'WIN'])
    
    # Post-win/loss analysis
    post_win_results = []
    post_loss_results = []
    for i in range(1, len(round_trips)):
        if round_trips[i-1]['win_loss'] == 'WIN':
            post_win_results.append(round_trips[i]['win_loss'])
        elif round_trips[i-1]['win_loss'] == 'LOSS':
            post_loss_results.append(round_trips[i]['win_loss'])
    post_win_loss_rate = post_win_results.count('LOSS') / len(post_win_results) * 100 if post_win_results else 0
    post_loss_win_rate = post_loss_results.count('WIN') / len(post_loss_results) * 100 if post_loss_results else 0
    
    # Learning curve (halves)
    half = n // 2
    first_half = round_trips[:half]
    second_half = round_trips[half:]
    first_wr = len([rt for rt in first_half if rt['win_loss'] == 'WIN']) / len(first_half) * 100 if first_half else 0
    second_wr = len([rt for rt in second_half if rt['win_loss'] == 'WIN']) / len(second_half) * 100 if second_half else 0
    first_pnl = sum(rt['net_pnl'] for rt in first_half)
    second_pnl = sum(rt['net_pnl'] for rt in second_half)
    
    # Quintile analysis (5 periods)
    qsize = max(1, n // 5)
    quintiles = []
    for q in range(5):
        s = q * qsize
        e = min(s + qsize, n)
        if s >= n:
            break
        qt = round_trips[s:e]
        qw = len([rt for rt in qt if rt['win_loss'] == 'WIN'])
        qp = sum(rt['net_pnl'] for rt in qt)
        quintiles.append({
            'period': f'Q{q+1} (trades {s+1}-{e})',
            'trades': len(qt), 'wins': qw,
            'win_rate': round(qw / len(qt) * 100, 1) if qt else 0,
            'pnl': round(qp, 2),
        })
    
    # Exit reason analysis
    exit_reasons = Counter(rt['exit_reason'] for rt in round_trips)
    exit_reason_performance = {}
    for reason in set(rt['exit_reason'] for rt in round_trips):
        r_trades = [rt for rt in round_trips if rt['exit_reason'] == reason]
        r_wins = len([rt for rt in r_trades if rt['win_loss'] == 'WIN'])
        r_pnl = sum(rt['net_pnl'] for rt in r_trades)
        exit_reason_performance[reason] = {
            'trades': len(r_trades), 'wins': r_wins,
            'win_rate': round(r_wins / len(r_trades) * 100, 1),
            'pnl': round(r_pnl, 2),
        }
    
    return {
        'total_trades': n, 'wins': win_count, 'losses': loss_count,
        'break_even': n - win_count - loss_count,
        'win_rate_pct': round(win_rate, 2),
        'total_net_pnl': round(total_net_pnl, 2),
        'total_gross_pnl': round(total_gross_pnl, 2),
        'total_fees': round(total_fees, 2),
        'avg_pnl_per_trade': round(avg_pnl, 4),
        'avg_win': round(avg_win, 4), 'avg_loss': round(avg_loss, 4),
        'largest_win': round(largest_win, 4), 'largest_loss': round(largest_loss, 4),
        'profit_factor': round(profit_factor, 4),
        'expectancy': round(expectancy, 4),
        'risk_reward_ratio': round(rr_ratio, 4),
        'sharpe_ratio': round(sharpe, 4), 'sortino_ratio': round(sortino, 4),
        'max_drawdown_usd': round(max_dd, 2), 'max_drawdown_pct': round(max_dd_pct, 2),
        'final_equity': round(equity_curve[-1], 2),
        'return_pct': round((equity_curve[-1] - initial_capital) / initial_capital * 100, 2),
        'avg_duration_s': round(avg_duration, 1),
        'avg_duration_human': format_duration(avg_duration),
        'min_duration_s': round(min_duration, 1), 'max_duration_s': round(max_duration, 1),
        'scalp_trades_under_5m': scalp_trades, 'short_trades_5_15m': short_trades,
        'medium_trades_15_60m': medium_trades, 'long_trades_over_1h': long_trades,
        'max_consecutive_wins': max_consec_wins, 'max_consecutive_losses': max_consec_losses,
        'fees_pct_of_capital': round(total_fees / initial_capital * 100, 2),
        'avg_fees_per_trade': round(total_fees / n, 4) if n > 0 else 0,
        'long_count': len(long_list), 'short_count': len(short_list),
        'long_win_rate': round(long_wins / len(long_list) * 100, 1) if long_list else 0,
        'short_win_rate': round(short_wins / len(short_list) * 100, 1) if short_list else 0,
        'long_pnl': round(sum(rt['net_pnl'] for rt in long_list), 2),
        'short_pnl': round(sum(rt['net_pnl'] for rt in short_list), 2),
        'strategy_performance': strategy_performance,
        'exit_reason_performance': exit_reason_performance,
        'post_win_loss_rate': round(post_win_loss_rate, 1),
        'post_loss_win_rate': round(post_loss_win_rate, 1),
        'first_half_win_rate': round(first_wr, 1), 'second_half_win_rate': round(second_wr, 1),
        'first_half_pnl': round(first_pnl, 2), 'second_half_pnl': round(second_pnl, 2),
        'quintile_analysis': quintiles,
        'entry_strategies': dict(Counter(rt['entry_strategy'] for rt in round_trips)),
        'exit_reasons': dict(exit_reasons),
        'equity_curve': [round(e, 2) for e in equity_curve],
    }

##############################
# CSV GENERATION
##############################

def generate_csv(round_trips, filepath):
    headers = [
        '#', 'Direction', 'Entry_Time', 'Exit_Time', 'Entry_Price', 'Exit_Price',
        'Quantity', 'Position_Value_USD', 'Gross_PnL', 'Fees', 'Net_PnL', 'PnL_Pct',
        'Win_Loss', 'Duration_Seconds', 'Duration_Human', 'Entry_Strategy',
        'Exit_Strategy', 'Exit_Reason', 'Partial_Closes'
    ]
    with open(filepath, 'w') as f:
        f.write(','.join(headers) + '\n')
        for rt in round_trips:
            row = [
                str(rt['trade_num']), rt['direction'],
                f'"{rt["entry_time"]}"', f'"{rt["exit_time"]}"',
                str(rt['entry_price']), str(rt['exit_price']),
                str(rt['quantity']), str(rt['position_value_usd']),
                str(rt['gross_pnl']), str(rt['fees']),
                str(rt['net_pnl']), str(rt['pnl_pct']),
                rt['win_loss'], str(rt['duration_s']), rt['duration_human'],
                rt['entry_strategy'], rt['exit_strategy'], rt['exit_reason'],
                str(rt['partial_closes']),
            ]
            f.write(','.join(row) + '\n')
    print(f"  CSV: {filepath} ({len(round_trips)} trades)")

##############################
# REPORT GENERATION
##############################

def generate_report(round_trips, metrics, portfolio, health, neuron_state, neuron_log, ml_status, bot_state, system_prompt):
    now = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
    m = metrics
    
    def safe_div(a, b, default=0):
        return a / b if b and b != 0 else default
    
    report = f"""# COMPREHENSIVE TRADING ANALYSIS REPORT
## Turbo-Bot v6.0.0-ENTERPRISE-MODULAR
### Generated: {now}
### Data Source: bot_state.json + NeuronAI logs + Bot API
### Analysis Period: {round_trips[0]['entry_time'] if round_trips else 'N/A'} to {round_trips[-1]['exit_time'] if round_trips else 'N/A'}

---

## 1. EXECUTIVE SUMMARY

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Total Round-Trip Trades** | {m['total_trades']} | 100+ | {'PASS' if m['total_trades'] >= 20 else 'LOW SAMPLE'} |
| **Win Rate** | {m['win_rate_pct']}% | >50% | {'PASS' if m['win_rate_pct'] > 50 else 'FAIL'} |
| **Net PnL** | ${m['total_net_pnl']:.2f} | >$0 | {'PASS' if m['total_net_pnl'] > 0 else 'FAIL'} |
| **Profit Factor** | {m['profit_factor']:.3f} | >1.5 | {'PASS' if m['profit_factor'] > 1.5 else ('MARGINAL' if m['profit_factor'] > 1.0 else 'FAIL')} |
| **Expectancy/Trade** | ${m['expectancy']:.4f} | >$0 | {'PASS' if m['expectancy'] > 0 else 'FAIL'} |
| **Risk/Reward Ratio** | {m['risk_reward_ratio']:.3f} | >1.5 | {'PASS' if m['risk_reward_ratio'] > 1.5 else 'FAIL'} |
| **Sharpe Ratio** | {m['sharpe_ratio']:.3f} | >1.0 | {'PASS' if m['sharpe_ratio'] > 1.0 else 'FAIL'} |
| **Sortino Ratio** | {m['sortino_ratio']:.3f} | >1.5 | {'PASS' if m['sortino_ratio'] > 1.5 else 'FAIL'} |
| **Max Drawdown** | {m['max_drawdown_pct']:.2f}% (${m['max_drawdown_usd']:.2f}) | <20% | {'PASS' if m['max_drawdown_pct'] < 20 else 'FAIL'} |
| **Total Fees** | ${m['total_fees']:.2f} ({m['fees_pct_of_capital']:.2f}% of capital) | <1% | {'PASS' if m['fees_pct_of_capital'] < 1 else 'HIGH'} |
| **Final Equity** | ${m['final_equity']:.2f} | >$10,000 | {'PASS' if m['final_equity'] > 10000 else 'FAIL'} |
| **Return** | {m['return_pct']:.2f}% | >0% | {'PASS' if m['return_pct'] > 0 else 'FAIL'} |

### VERDICT: {'BOT IS PROFITABLE' if m['total_net_pnl'] > 0 and m['profit_factor'] > 1.0 else 'BOT IS NOT YET PROFITABLE - NEEDS OPTIMIZATION'}

---

## 2. FULL TRADE LOG ({m['total_trades']} Round-Trip Trades)

| # | Dir | Entry Time | Exit Time | Entry$ | Exit$ | Qty | Net PnL | PnL% | W/L | Duration | Entry Strat | Exit Reason |
|---|-----|-----------|----------|--------|-------|-----|---------|------|-----|----------|-------------|-------------|
"""
    for rt in round_trips:
        e = '\\U0001f7e2' if rt['win_loss'] == 'WIN' else ('\\U0001f534' if rt['win_loss'] == 'LOSS' else '')
        report += f"| {rt['trade_num']} | {rt['direction']} | {rt['entry_time']} | {rt['exit_time']} | ${rt['entry_price']:.2f} | ${rt['exit_price']:.2f} | {rt['quantity']:.6f} | ${rt['net_pnl']:.2f} | {rt['pnl_pct']:.2f}% | {rt['win_loss']} | {rt['duration_human']} | {rt['entry_strategy']} | {rt['exit_reason']} |\n"
    
    report += f"""
---

## 3. AGGREGATED METRICS

### 3.1 Core Performance
| Metric | Value |
|--------|-------|
| Total Trades | {m['total_trades']} |
| Wins / Losses / Break Even | {m['wins']} / {m['losses']} / {m['break_even']} |
| **Win Rate** | **{m['win_rate_pct']}%** |
| **Profit Factor** | **{m['profit_factor']:.4f}** |
| **Expectancy per Trade** | **${m['expectancy']:.4f}** |
| **Risk/Reward Ratio** | **{m['risk_reward_ratio']:.4f}** |

### 3.2 PnL Breakdown
| Metric | Value |
|--------|-------|
| Total Net PnL | ${m['total_net_pnl']:.2f} |
| Total Gross PnL (before fees) | ${m['total_gross_pnl']:.2f} |
| Total Fees Paid | ${m['total_fees']:.2f} |
| Fees as % of Capital | {m['fees_pct_of_capital']:.2f}% |
| Avg Fees per Trade | ${m['avg_fees_per_trade']:.4f} |
| Avg PnL per Trade | ${m['avg_pnl_per_trade']:.4f} |
| Avg Winning Trade | ${m['avg_win']:.4f} |
| Avg Losing Trade | ${m['avg_loss']:.4f} |
| Largest Win | ${m['largest_win']:.4f} |
| Largest Loss | ${m['largest_loss']:.4f} |
| **Net PnL without fees** | **${m['total_net_pnl'] + m['total_fees']:.2f}** |

### 3.3 Risk Metrics
| Metric | Value |
|--------|-------|
| **Sharpe Ratio (annualized)** | **{m['sharpe_ratio']:.4f}** |
| **Sortino Ratio (annualized)** | **{m['sortino_ratio']:.4f}** |
| Max Drawdown (USD) | ${m['max_drawdown_usd']:.2f} |
| Max Drawdown (%) | {m['max_drawdown_pct']:.2f}% |
| Max Consecutive Wins | {m['max_consecutive_wins']} |
| Max Consecutive Losses | {m['max_consecutive_losses']} |

### 3.4 Duration Analysis
| Metric | Value |
|--------|-------|
| Average Duration | {m['avg_duration_human']} ({m['avg_duration_s']:.0f}s) |
| Min Duration | {format_duration(m['min_duration_s'])} ({m['min_duration_s']:.0f}s) |
| Max Duration | {format_duration(m['max_duration_s'])} ({m['max_duration_s']:.0f}s) |
| Scalp Trades (<5 min) | {m['scalp_trades_under_5m']} ({safe_div(m['scalp_trades_under_5m'], m['total_trades'])*100:.1f}%) |
| Short Trades (5-15 min) | {m['short_trades_5_15m']} ({safe_div(m['short_trades_5_15m'], m['total_trades'])*100:.1f}%) |
| Medium Trades (15-60 min) | {m['medium_trades_15_60m']} ({safe_div(m['medium_trades_15_60m'], m['total_trades'])*100:.1f}%) |
| Long Trades (>1h) | {m['long_trades_over_1h']} ({safe_div(m['long_trades_over_1h'], m['total_trades'])*100:.1f}%) |

### 3.5 Direction Breakdown
| Direction | Trades | Win Rate | Total PnL | Avg PnL |
|-----------|--------|----------|-----------|---------|
| LONG | {m['long_count']} | {m['long_win_rate']}% | ${m['long_pnl']:.2f} | ${safe_div(m['long_pnl'], m['long_count']):.2f} |
| SHORT | {m['short_count']} | {m['short_win_rate']}% | ${m['short_pnl']:.2f} | ${safe_div(m['short_pnl'], m['short_count']):.2f} |

### 3.6 Strategy Performance (Entry Strategy)
| Strategy | Trades | Wins | Losses | Win Rate | Total PnL | Total Fees | Avg PnL |
|----------|--------|------|--------|----------|-----------|------------|---------|
"""
    for strat, p in sorted(m['strategy_performance'].items(), key=lambda x: x[1]['total_pnl'], reverse=True):
        report += f"| {strat} | {p['trades']} | {p['wins']} | {p['losses']} | {p['win_rate']}% | ${p['total_pnl']:.2f} | ${p['total_fees']:.2f} | ${p['avg_pnl']:.2f} |\n"

    report += f"""
### 3.7 Exit Reason Analysis
| Exit Reason | Trades | Wins | Win Rate | Total PnL |
|-------------|--------|------|----------|-----------|
"""
    for reason, p in sorted(m.get('exit_reason_performance', {}).items(), key=lambda x: x[1]['pnl'], reverse=True):
        report += f"| {reason} | {p['trades']} | {p['wins']} | {p['win_rate']}% | ${p['pnl']:.2f} |\n"

    report += f"""
### 3.8 Behavioral Analysis
| Metric | Value | Interpretation |
|--------|-------|----------------|
| Post-Win Loss Rate | {m['post_win_loss_rate']}% | {'PROBLEM: Over-confidence after wins' if m['post_win_loss_rate'] > 60 else 'OK'} |
| Post-Loss Win Rate | {m['post_loss_win_rate']}% | {'Bot recovers well' if m['post_loss_win_rate'] > 50 else 'Needs improvement'} |

### 3.9 Learning Curve (Is the bot improving over time?)

#### Half-Period Analysis
| Period | Win Rate | PnL | Trend |
|--------|----------|-----|-------|
| First Half (trades 1-{m['total_trades']//2}) | {m['first_half_win_rate']}% | ${m['first_half_pnl']:.2f} | Baseline |
| Second Half (trades {m['total_trades']//2+1}-{m['total_trades']}) | {m['second_half_win_rate']}% | ${m['second_half_pnl']:.2f} | {'IMPROVING' if m['second_half_win_rate'] > m['first_half_win_rate'] else 'DECLINING'} |

#### Quintile Progression (5 Equal Periods)
| Period | Trades | Wins | Win Rate | PnL |
|--------|--------|------|----------|-----|
"""
    for q in m['quintile_analysis']:
        trend = 'UP' if q['pnl'] > 0 else 'DOWN'
        report += f"| {q['period']} | {q['trades']} | {q['wins']} | {q['win_rate']}% | ${q['pnl']:.2f} ({trend}) |\n"

    # Equity curve
    eq = m['equity_curve']
    report += f"""
### 3.10 Equity Curve (Starting ${eq[0]:,.2f})
```
"""
    if len(eq) > 50:
        step = max(1, len(eq) // 40)
        sampled = [(i, eq[i]) for i in range(0, len(eq), step)]
        if (len(eq) - 1) % step != 0:
            sampled.append((len(eq)-1, eq[-1]))
    else:
        sampled = list(enumerate(eq))
    
    min_eq = min(e for _, e in sampled)
    max_eq = max(e for _, e in sampled)
    eq_range = max_eq - min_eq if max_eq != min_eq else 1
    
    for i, e in sampled:
        bar_len = int((e - min_eq) / eq_range * 50)
        bar = '#' * bar_len
        label = ' START' if i == 0 else (' END' if i == len(eq) - 1 else '')
        report += f"  T{i:>3d} ${e:>10.2f} |{bar}{label}\n"
    
    report += "```\n"

    # NEURON AI SECTION
    report += f"""
---

## 4. NEURON AI ANALYSIS (Central Brain / Skynet)

### 4.1 NeuronAI Persisted State
"""
    if neuron_state:
        ns = neuron_state
        report += f"""| Metric | Value |
|--------|-------|
| Total Decisions | {ns.get('totalDecisions', 0)} |
| Override Count | {ns.get('overrideCount', 0)} |
| Evolution Count | {ns.get('evolutionCount', 0)} |
| Total PnL | ${ns.get('totalPnL', 0):.2f} |
| Win / Loss | {ns.get('winCount', 0)} / {ns.get('lossCount', 0)} |
| Win Rate | {safe_div(ns.get('winCount',0), ns.get('winCount',0)+ns.get('lossCount',0))*100:.1f}% |
| Consecutive Losses (current) | {ns.get('consecutiveLosses', 0)} |
| Consecutive Wins (current) | {ns.get('consecutiveWins', 0)} |
| Risk Multiplier | {ns.get('riskMultiplier', 1.0)} |
| Adapted Weights | {json.dumps(ns.get('adaptedWeights', {}))} |
| Reversal Enabled | {ns.get('reversalEnabled', False)} |
| Aggressive Mode | {ns.get('aggressiveMode', False)} |

**Key Observations:**
"""
        if ns.get('consecutiveLosses', 0) >= 3:
            report += f"- WARNING: {ns.get('consecutiveLosses', 0)} consecutive losses detected. P26 loss-streak sizing should reduce exposure.\n"
        if ns.get('riskMultiplier', 1.0) < 1.0:
            report += f"- Risk multiplier reduced to {ns.get('riskMultiplier', 1.0)} (NeuronAI has learned to be more conservative)\n"
        override_rate = safe_div(ns.get('overrideCount', 0), ns.get('totalDecisions', 1)) * 100
        report += f"- Override rate: {override_rate:.1f}% ({ns.get('overrideCount', 0)}/{ns.get('totalDecisions', 0)} decisions)\n"
        report += f"- Evolution rate: {safe_div(ns.get('evolutionCount', 0), ns.get('totalDecisions', 1))*100:.1f}% ({ns.get('evolutionCount', 0)} weight/rule changes)\n"
    
    # NeuronAI trade performance
    neuron_entry = [rt for rt in round_trips if rt['entry_strategy'] == 'NeuronAI']
    neuron_exit = [rt for rt in round_trips if rt['exit_strategy'] == 'NeuronAI']
    neuron_involved = [rt for rt in round_trips if 'NeuronAI' in rt['entry_strategy'] or 'NeuronAI' in rt['exit_strategy'] or 'NeuronAI' in rt['exit_reason']]
    ensemble_only = [rt for rt in round_trips if rt['entry_strategy'] != 'NeuronAI' and rt['exit_strategy'] != 'NeuronAI']
    
    if neuron_involved:
        n_wins = len([rt for rt in neuron_involved if rt['win_loss'] == 'WIN'])
        n_pnl = sum(rt['net_pnl'] for rt in neuron_involved)
        e_wins = len([rt for rt in ensemble_only if rt['win_loss'] == 'WIN']) if ensemble_only else 0
        e_pnl = sum(rt['net_pnl'] for rt in ensemble_only) if ensemble_only else 0
        
        report += f"""
### 4.2 NeuronAI vs EnsembleVoting Performance
| | NeuronAI-Involved | Other (Ensemble Only) |
|--|-------------------|----------------------|
| Trades | {len(neuron_involved)} | {len(ensemble_only)} |
| Wins | {n_wins} | {e_wins} |
| Win Rate | {safe_div(n_wins, len(neuron_involved))*100:.1f}% | {safe_div(e_wins, len(ensemble_only))*100:.1f}% |
| Total PnL | ${n_pnl:.2f} | ${e_pnl:.2f} |
| Avg PnL | ${safe_div(n_pnl, len(neuron_involved)):.2f} | ${safe_div(e_pnl, len(ensemble_only)):.2f} |

**Verdict**: {'NeuronAI outperforms Ensemble' if safe_div(n_wins, len(neuron_involved)) > safe_div(e_wins, max(len(ensemble_only),1)) else 'Ensemble outperforms NeuronAI' if ensemble_only else 'Too few ensemble-only trades for comparison'}
"""
    
    # NeuronAI decision log analysis
    report += f"""
### 4.3 NeuronAI Decision Log Analysis (Last 48h)
"""
    if neuron_log:
        log_lines = neuron_log.strip().split('\n')
        report += f"Total log entries: {len(log_lines)}\n\n"
        
        # Parse decisions
        decisions = []
        for line in log_lines:
            parts = line.split(' | ')
            if len(parts) >= 4:
                decisions.append({
                    'time': parts[0].strip(),
                    'action': parts[1].strip(),
                    'confidence': parts[2].strip(),
                    'source': parts[3].strip() if len(parts) > 3 else '',
                    'override': parts[4].strip() if len(parts) > 4 else '',
                    'reason': parts[5].strip() if len(parts) > 5 else '',
                })
        
        # Count actions
        action_counts = Counter(d['action'] for d in decisions)
        source_counts = Counter(d['source'].replace('src=', '') for d in decisions)
        override_count = len([d for d in decisions if 'override=YES' in d.get('override', '') or 'override=YES' in str(d)])
        
        report += f"""**Decision Distribution:**
| Action | Count | % |
|--------|-------|---|
"""
        for act, cnt in action_counts.most_common():
            report += f"| {act} | {cnt} | {cnt/len(decisions)*100:.1f}% |\n"
        
        report += f"""
**Decision Source:**
| Source | Count | % |
|--------|-------|---|
"""
        for src, cnt in source_counts.most_common():
            report += f"| {src} | {cnt} | {cnt/len(decisions)*100:.1f}% |\n"
        
        report += f"""
**Override Actions (NeuronAI overriding ensemble):** {override_count} ({safe_div(override_count, len(decisions))*100:.1f}%)

**Sample LLM Decisions (with reasoning):**
"""
        llm_decisions = [d for d in decisions if 'NEURON_AI_LLM' in str(d)]
        for d in llm_decisions[-10:]:  # Last 10 LLM decisions
            report += f"- `{d['time']}` | {d['action']} | {d.get('confidence','')} | Override: {d.get('override','no')}\n"
            if d.get('reason'):
                report += f"  Reason: {d['reason'][:200]}...\n"
        
        report += f"""
**Sample Fallback Decisions:**
"""
        fallback_decisions = [d for d in decisions if 'FALLBACK' in str(d)]
        for d in fallback_decisions[-5:]:  # Last 5 fallback decisions
            report += f"- `{d['time']}` | {d['action']} | {d.get('confidence','')}\n"
            if d.get('reason'):
                reason_text = d['reason'][:200]
                report += f"  Reason: {reason_text}\n"

    # NeuronAI recent trades (from state)
    if neuron_state and neuron_state.get('recentTrades'):
        report += f"""
### 4.4 NeuronAI Recent Trade Learning (learnFromTrade output)
| # | PnL | Strategy | Action | Timestamp |
|---|-----|----------|--------|-----------|
"""
        for i, t in enumerate(neuron_state['recentTrades'][-20:], 1):
            report += f"| {i} | ${t.get('pnl', 0):.2f} | {t.get('strategy', '?')} | {t.get('action', '?')} | {format_timestamp(t.get('timestamp', 0))} |\n"

    # ML STATUS
    report += f"""
---

## 5. ML SYSTEM STATUS

### 5.1 ML Metrics (from Health Check)
"""
    if health and health.get('metrics'):
        hm = health['metrics']
        report += f"""| Metric | Value |
|--------|-------|
| ML Learning Phase | {hm.get('mlLearningPhase', '?')} |
| ML Confidence Threshold | {hm.get('mlConfidenceThreshold', '?')} |
| ML Trading Count | {hm.get('mlTradingCount', 0)} |
| ML Average Reward | {hm.get('mlAverageReward', 0)} |
| ML Exploration Rate | {hm.get('mlExplorationRate', 0):.6f} |
"""

    if ml_status:
        report += f"\n### 5.2 ML Status API Response\n```json\n{json.dumps(ml_status, indent=2, default=str)[:3000]}\n```\n"

    # PORTFOLIO & SYSTEM STATUS
    report += f"""
---

## 6. PORTFOLIO & SYSTEM STATUS

### 6.1 Current Portfolio
"""
    if health and health.get('metrics'):
        hm = health['metrics']
        report += f"""| Metric | Value |
|--------|-------|
| Total Value | ${hm.get('totalValue', 0):.2f} |
| Unrealized PnL | ${hm.get('unrealizedPnL', 0):.2f} |
| Realized PnL | ${hm.get('realizedPnL', 0):.2f} |
| Current Drawdown | {hm.get('drawdown', 0)*100:.2f}% |
| Peak Value | ${hm.get('peakValue', 0):.2f} |
| Win Rate | {hm.get('winRate', 0)*100:.1f}% |
| Total Trades | {hm.get('totalTrades', 0)} |
| Current Positions | {hm.get('currentPositions', 0)} |
| Daily Trade Count | {hm.get('dailyTradeCount', 0)} |
| Memory Usage | {hm.get('memoryUsage', 0):.2f}% |
| CPU Usage | {hm.get('cpuUsage', 0):.2f}% |
"""
    
    if health:
        report += f"""
### 6.2 Component Health
| Component | Status |
|-----------|--------|
"""
        for comp, status in health.get('components', {}).items():
            emoji = 'OK' if status else 'FAIL'
            report += f"| {comp} | {emoji} |\n"
        
        cb = health.get('circuitBreaker', {})
        report += f"""
### 6.3 Circuit Breaker
| Metric | Value |
|--------|-------|
| Tripped | {cb.get('isTripped', False)} |
| Consecutive Losses | {cb.get('consecutiveLosses', 0)} |
| Max Consecutive Losses | {cb.get('maxConsecutiveLosses', 5)} |
| Emergency Stop | {cb.get('emergencyStopTriggered', False)} |
| Soft Pause | {cb.get('softPauseActive', False)} |
| Trip Count | {cb.get('tripCount', 0)} |
| P26 Loss Size Multiplier | {cb.get('consecutiveLossSizeMultiplier', 1)} |
| P26 Post-Win Cooldown | {cb.get('postWinCooldownMultiplier', 1)} |
"""

    # SYSTEM PROMPT
    report += f"""
---

## 7. NEURON AI SYSTEM PROMPT (Full)

The complete system prompt that drives NeuronAI's decision-making:

```
{system_prompt[:5000]}
```

---

## 8. CONCLUSIONS & RECOMMENDATIONS

### 8.1 Key Findings
"""
    findings = []
    
    if m['win_rate_pct'] < 50:
        findings.append(f"- **LOW WIN RATE ({m['win_rate_pct']}%)**: Below 50% threshold. Bot needs better signal quality and wider SL to avoid premature stops.")
    else:
        findings.append(f"- **ACCEPTABLE WIN RATE ({m['win_rate_pct']}%)**: Above 50% target.")
    
    if m['profit_factor'] < 1.0:
        findings.append(f"- **NEGATIVE PROFIT FACTOR ({m['profit_factor']:.3f})**: Bot is losing money. Losses > Profits.")
    elif m['profit_factor'] < 1.5:
        findings.append(f"- **MARGINAL PROFIT FACTOR ({m['profit_factor']:.3f})**: Between 1.0-1.5, not yet production-ready.")
    else:
        findings.append(f"- **GOOD PROFIT FACTOR ({m['profit_factor']:.3f})**: Above 1.5 target.")
    
    if m['total_fees'] > 0 and abs(m['total_gross_pnl']) > 0:
        fee_ratio = m['total_fees'] / max(abs(m['total_gross_pnl']), 0.01) * 100
        if fee_ratio > 50:
            findings.append(f"- **FEES DOMINATE**: Fees (${m['total_fees']:.2f}) are {fee_ratio:.0f}% of gross PnL (${m['total_gross_pnl']:.2f}). CRITICAL: Fees eat most of the gross profits. Reduce trade frequency.")
    
    if m['scalp_trades_under_5m'] > m['total_trades'] * 0.3:
        findings.append(f"- **EXCESSIVE SCALPING**: {m['scalp_trades_under_5m']} trades <5min ({m['scalp_trades_under_5m']/m['total_trades']*100:.0f}%). P26 anti-scalping should reduce these.")
    
    if m['post_win_loss_rate'] > 60:
        findings.append(f"- **OVER-CONFIDENCE AFTER WINS**: {m['post_win_loss_rate']:.0f}% of trades after a win are losses. P26 post-win cooldown targets this.")
    
    if m['max_consecutive_losses'] >= 5:
        findings.append(f"- **LONG LOSING STREAKS (max {m['max_consecutive_losses']})**: P26 loss-streak sizing (50% at 3L, 25% at 5L) should manage this.")
    
    if m['second_half_win_rate'] > m['first_half_win_rate']:
        findings.append(f"- **BOT IS LEARNING**: WR improved {m['first_half_win_rate']}% -> {m['second_half_win_rate']}% (first vs second half).")
    elif m['second_half_win_rate'] < m['first_half_win_rate']:
        findings.append(f"- **BOT PERFORMANCE DECLINING**: WR degraded {m['first_half_win_rate']}% -> {m['second_half_win_rate']}%. ML retraining may be needed.")
    
    if m['risk_reward_ratio'] < 1.5:
        findings.append(f"- **LOW RISK/REWARD ({m['risk_reward_ratio']:.2f})**: Average win (${m['avg_win']:.2f}) vs average loss (${m['avg_loss']:.2f}). Target: wins should be 1.5-2x larger than losses. P26 wider TP (5x ATR) should help.")
    
    if neuron_state:
        ns_wr = safe_div(neuron_state.get('winCount', 0), neuron_state.get('winCount', 0) + neuron_state.get('lossCount', 0)) * 100
        if ns_wr < 40:
            findings.append(f"- **NEURON AI LOW WR ({ns_wr:.0f}%)**: NeuronAI wins only {ns_wr:.0f}% of its decisions. Needs better filtering.")
    
    for f in findings:
        report += f + "\n"
    
    report += f"""
### 8.2 Patch #26 Expected Impact
| Change | Expected Effect | How to Verify |
|--------|----------------|---------------|
| Anti-scalping (3-min cooldown) | Fewer ultra-short trades | Check scalp_trades_under_5m after 24h |
| Quality gate (45% min confidence) | Higher signal quality | Win rate should increase |
| Wider SL (2.0x ATR vs 1.5x) | Fewer premature stops | Fewer SL exits, longer durations |
| Wider TP (5.0x ATR, RR 1:2.5) | Bigger wins | avg_win should increase |
| Counter-trend blocking (65% penalty) | Fewer counter-trend trades | Check direction bias alignment |
| Loss streak sizing (50% at 3L) | Reduced risk during losing streaks | Smaller losses during streaks |
| Post-win cooldown (20% reduction) | Prevent over-confidence | post_win_loss_rate should decrease |
| Ensemble threshold raised (55%) | Fewer but better signals | Trade count down, win rate up |

### 8.3 Priority Actions
1. **MONITOR**: Run bot for 24-48h post-P26 deployment and regenerate this report
2. **VERIFY**: Check that trade frequency decreased (target: <10 trades/day)
3. **EVALUATE**: If win rate stays below 45% after 50+ trades, consider:
   - Further raising ensemble threshold to 60%
   - Increasing minimum hold time to 30+ minutes
   - Reducing NeuronAI fallback conviction
4. **ML RETRAIN**: If ML accuracy degrades, trigger manual retrain
5. **FEES**: Consider switching to a lower-fee exchange/tier if available

---

## 9. RAW DATA FILES

| File | Path |
|------|------|
| CSV (all trades) | `/root/turbo-bot/reports/trade_analysis_full.csv` |
| JSON (round-trips) | `/root/turbo-bot/reports/trade_analysis_full.json` |
| JSON (metrics) | `/root/turbo-bot/reports/trade_metrics_full.json` |
| NeuronAI state | `/root/turbo-bot/trading-bot/data/neuron_ai_state.json` |
| NeuronAI decisions log | `/root/turbo-bot/trading-bot/data/neuron_ai_decisions.log` |
| Bot state | `/root/turbo-bot/data/bot_state.json` |
| This report | `/root/turbo-bot/reports/COMPREHENSIVE_TRADE_ANALYSIS_FULL.md` |

---

*Report generated automatically by Turbo-Bot Analysis Engine*
*Bot Version: 6.0.0-ENTERPRISE-MODULAR*
*Patch Level: #26 (Edge Recovery)*
"""
    return report

##############################
# MAIN
##############################

if __name__ == '__main__':
    print("=" * 70)
    print("  COMPREHENSIVE TRADE ANALYSIS REPORT GENERATOR v2.0")
    print("  Using bot_state.json (full history) + NeuronAI logs + API data")
    print("=" * 70)
    
    os.makedirs('/root/turbo-bot/reports', exist_ok=True)
    
    # 1. Load data from multiple sources
    print("\n[1/7] Loading trade history from bot_state.json...")
    bot_state = load_json_file('/root/turbo-bot/data/bot_state.json')
    state_trades = bot_state.get('trades', [])
    print(f"  Trades from state file: {len(state_trades)}")
    
    print("\n[2/7] Loading supplementary data from API...")
    api_trades_data = api_get('/api/trades')
    api_trades = api_trades_data.get('trades', api_trades_data) if isinstance(api_trades_data, dict) else []
    print(f"  Trades from API: {len(api_trades) if isinstance(api_trades, list) else 0}")
    
    # Merge: use state_trades as primary (has more), add any API-only trades
    all_raw = state_trades[:]
    state_ids = set(t.get('id', '') for t in state_trades)
    if isinstance(api_trades, list):
        for t in api_trades:
            if t.get('id', '') not in state_ids:
                all_raw.append(t)
    print(f"  Combined raw trades: {len(all_raw)}")
    
    print("\n[3/7] Loading NeuronAI, ML, health, portfolio data...")
    portfolio = api_get('/api/portfolio')
    health = api_get('/health')
    ml_status = api_get('/api/ml/status')
    neuron_state = load_json_file('/root/turbo-bot/trading-bot/data/neuron_ai_state.json')
    neuron_log = load_text_file('/root/turbo-bot/trading-bot/data/neuron_ai_decisions.log')
    
    # Load system prompt from SYSTEM_PROMPT constant
    print("\n[4/7] Extracting NeuronAI system prompt...")
    try:
        with open('/root/turbo-bot/trading-bot/src/core/ai/neuron_ai_manager.js', 'r') as f:
            js_content = f.read()
        # Extract SYSTEM_PROMPT
        start = js_content.find("const SYSTEM_PROMPT = '")
        if start >= 0:
            start += len("const SYSTEM_PROMPT = '")
            end = js_content.find("';", start)
            system_prompt = js_content[start:end].replace("\\n", "\n").replace("\\'", "'").replace('\\"', '"')
        else:
            system_prompt = "(Could not extract system prompt)"
    except:
        system_prompt = "(File not found)"
    print(f"  System prompt length: {len(system_prompt)} chars")
    
    # 2. Dedup + pair
    print("\n[5/7] Deduplicating and pairing round-trip trades...")
    unique_trades = dedup_trades(all_raw)
    print(f"  After dedup: {len(unique_trades)} unique trade records")
    
    round_trips = pair_round_trips(unique_trades)
    print(f"  Round-trip trades: {len(round_trips)}")
    
    if len(round_trips) < len(unique_trades) // 3:
        print("  [INFO] Low pairing rate. Adding standalone trades as fallback...")
        paired_ids = set()
        for rt in round_trips:
            paired_ids.add(rt.get('entry_time_raw', 0))
            paired_ids.add(rt.get('exit_time_raw', 0))
        
        trade_num = len(round_trips)
        for t in unique_trades:
            if (t.get('timestamp', 0) not in paired_ids and 
                t.get('pnl', 0) != 0 and 
                t.get('entryPrice')):
                trade_num += 1
                rt = make_standalone_round_trip(t, trade_num)
                round_trips.append(rt)
        
        round_trips.sort(key=lambda x: x.get('exit_time_raw', 0))
        print(f"  After fallback pairing: {len(round_trips)} trades")
    
    # Renumber
    for i, rt in enumerate(round_trips):
        rt['trade_num'] = i + 1
    
    # 3. Calculate metrics
    print("\n[6/7] Calculating comprehensive metrics...")
    metrics = calculate_metrics(round_trips)
    
    print(f"\n  {'='*50}")
    print(f"  SUMMARY")
    print(f"  {'='*50}")
    print(f"  Total Round-Trip Trades: {metrics['total_trades']}")
    print(f"  Win Rate: {metrics['win_rate_pct']}%")
    print(f"  Net PnL: ${metrics['total_net_pnl']:.2f}")
    print(f"  Gross PnL: ${metrics['total_gross_pnl']:.2f}")
    print(f"  Total Fees: ${metrics['total_fees']:.2f}")
    print(f"  Profit Factor: {metrics['profit_factor']:.3f}")
    print(f"  Expectancy: ${metrics['expectancy']:.4f}")
    print(f"  Risk/Reward: {metrics['risk_reward_ratio']:.3f}")
    print(f"  Sharpe: {metrics['sharpe_ratio']:.3f}")
    print(f"  Max Drawdown: {metrics['max_drawdown_pct']:.2f}%")
    print(f"  Final Equity: ${metrics['final_equity']:.2f}")
    
    # 4. Generate outputs
    print(f"\n[7/7] Generating output files...")
    
    generate_csv(round_trips, '/root/turbo-bot/reports/trade_analysis_full.csv')
    
    with open('/root/turbo-bot/reports/trade_analysis_full.json', 'w') as f:
        json.dump(round_trips, f, indent=2, default=str)
    print(f"  JSON (trades): /root/turbo-bot/reports/trade_analysis_full.json")
    
    with open('/root/turbo-bot/reports/trade_metrics_full.json', 'w') as f:
        json.dump(metrics, f, indent=2, default=str)
    print(f"  JSON (metrics): /root/turbo-bot/reports/trade_metrics_full.json")
    
    report = generate_report(round_trips, metrics, portfolio, health, neuron_state, neuron_log, ml_status, bot_state, system_prompt)
    with open('/root/turbo-bot/reports/COMPREHENSIVE_TRADE_ANALYSIS_FULL.md', 'w') as f:
        f.write(report)
    print(f"  Report: /root/turbo-bot/reports/COMPREHENSIVE_TRADE_ANALYSIS_FULL.md")
    
    # Also save NeuronAI decisions log excerpt
    if neuron_log:
        with open('/root/turbo-bot/reports/neuron_ai_decisions_excerpt.txt', 'w') as f:
            f.write(neuron_log)
        print(f"  NeuronAI log: /root/turbo-bot/reports/neuron_ai_decisions_excerpt.txt")
    
    print(f"\n{'='*70}")
    print(f"  REPORT GENERATION COMPLETE")
    print(f"  All files in: /root/turbo-bot/reports/")
    print(f"{'='*70}")

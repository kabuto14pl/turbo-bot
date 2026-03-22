"""
TURBO-BOT Full Pipeline Backtest — 5 Classical Strategies
Reuses V2 pattern-confirmed strategies from backtest_v2.py.
Each strategy returns: {action: BUY|SELL|HOLD, confidence: 0-1}
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from candle_patterns import CandlePatternEngine
from . import config


_pattern_engine = CandlePatternEngine()


def _get_pattern_signal(history, min_strength=0.3):
    """Get candle pattern signal from recent history."""
    if len(history) < 12:
        return 'NEUTRAL', 0.0
    patterns = _pattern_engine.detect_all(history)
    if not patterns:
        return 'NEUTRAL', 0.0
    bullish_strength = 0
    bearish_strength = 0
    for p in patterns:
        s = p['strength']
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
    """Determine market trend context."""
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
    if close > sma50:
        return 'UP'
    elif close < sma50:
        return 'DOWN'
    return 'RANGING'


def strategy_advanced_adaptive(row, history):
    """V2 AdvancedAdaptive — pattern-confirmed, trend-filtered."""
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

    if buy_score < 3 and sell_score < 3:
        return {'action': 'HOLD', 'confidence': 0.0}

    pattern_dir, pattern_str = _get_pattern_signal(history, min_strength=0.25)
    trend = _get_trend(row, history)

    max_score = max(buy_score, sell_score)
    conf = min(0.90, 0.30 + (max_score - 3) * 0.15 + pattern_str * 0.15)

    if buy_score >= 3 and buy_score > sell_score:
        if trend == 'RANGING' and pattern_str < 0.5:
            return {'action': 'HOLD', 'confidence': 0.0}
        if pattern_dir == 'BEARISH' and pattern_str >= 0.4:
            return {'action': 'HOLD', 'confidence': 0.0}
        if buy_score < 4 and pattern_dir != 'BULLISH':
            return {'action': 'HOLD', 'confidence': 0.0}
        return {'action': 'BUY', 'confidence': conf}

    elif sell_score >= 3 and sell_score > buy_score:
        if trend == 'RANGING' and pattern_str < 0.5:
            return {'action': 'HOLD', 'confidence': 0.0}
        if pattern_dir == 'BULLISH' and pattern_str >= 0.4:
            return {'action': 'HOLD', 'confidence': 0.0}
        if sell_score < 4 and pattern_dir != 'BEARISH':
            return {'action': 'HOLD', 'confidence': 0.0}
        return {'action': 'SELL', 'confidence': conf}

    return {'action': 'HOLD', 'confidence': 0.0}


def strategy_rsi_turbo(row, history):
    """V2 RSITurbo — pattern-confirmed reversals only."""
    rsi = row.get('rsi_14', 50)
    close = row['close']
    ema21 = row.get('ema_21', close)
    ema50 = row.get('ema_50', row.get('sma_50', close))
    volume_ratio = row.get('volume_ratio', 1.0)

    uptrend = close > ema21 and ema21 > ema50
    downtrend = close < ema21 and ema21 < ema50

    pattern_dir, pattern_str = _get_pattern_signal(history, min_strength=0.25)

    if rsi < 30 and uptrend:
        if pattern_dir == 'BULLISH' or rsi < 22:
            conf = min(0.85, 0.40 + (30 - rsi) * 0.02 + pattern_str * 0.10)
            return {'action': 'BUY', 'confidence': conf}
    if rsi < 22 and volume_ratio > 1.2:
        if pattern_dir != 'BEARISH':
            return {'action': 'BUY', 'confidence': 0.55}

    if rsi > 70 and downtrend:
        if pattern_dir == 'BEARISH' or rsi > 78:
            conf = min(0.85, 0.40 + (rsi - 70) * 0.02 + pattern_str * 0.10)
            return {'action': 'SELL', 'confidence': conf}
    if rsi > 78 and volume_ratio > 1.2:
        if pattern_dir != 'BULLISH':
            return {'action': 'SELL', 'confidence': 0.55}

    return {'action': 'HOLD', 'confidence': 0.0}


def strategy_supertrend(row, history):
    """V2 SuperTrend — direction change + pattern + volume gate."""
    close = row['close']
    supertrend_dir = row.get('supertrend_dir', 0)
    adx = row.get('adx', 20)
    volume_ratio = row.get('volume_ratio', 1.0)

    if len(history) < 3:
        return {'action': 'HOLD', 'confidence': 0.0}

    prev_dir = history.iloc[-2].get('supertrend_dir', 0)
    pattern_dir, pattern_str = _get_pattern_signal(history, min_strength=0.2)

    if supertrend_dir == 1 and prev_dir == -1:
        if adx > 20 or volume_ratio > 1.3:
            if pattern_dir == 'BEARISH' and pattern_str > 0.4:
                return {'action': 'HOLD', 'confidence': 0.0}
            if volume_ratio < 0.8:
                return {'action': 'HOLD', 'confidence': 0.0}
            conf = min(0.80, 0.35 + (adx - 20) * 0.01 + volume_ratio * 0.05)
            return {'action': 'BUY', 'confidence': max(0.35, conf)}

    elif supertrend_dir == -1 and prev_dir == 1:
        if adx > 20 or volume_ratio > 1.3:
            if pattern_dir == 'BULLISH' and pattern_str > 0.4:
                return {'action': 'HOLD', 'confidence': 0.0}
            if volume_ratio < 0.8:
                return {'action': 'HOLD', 'confidence': 0.0}
            conf = min(0.80, 0.35 + (adx - 20) * 0.01 + volume_ratio * 0.05)
            return {'action': 'SELL', 'confidence': max(0.35, conf)}

    return {'action': 'HOLD', 'confidence': 0.0}


def strategy_ma_crossover(row, history):
    """V2 MACrossover — crossover + pattern confluence + SMA200 filter."""
    close = row['close']
    ema9 = row.get('ema_9', close)
    ema21 = row.get('ema_21', close)
    sma50 = row.get('sma_50', close)
    volume_ratio = row.get('volume_ratio', 1.0)
    adx = row.get('adx', 20)

    if len(history) < 3:
        return {'action': 'HOLD', 'confidence': 0.0}

    prev = history.iloc[-2]
    prev_ema9 = prev.get('ema_9', close)
    prev_ema21 = prev.get('ema_21', close)

    pattern_dir, pattern_str = _get_pattern_signal(history, min_strength=0.2)

    if ema9 > ema21 and prev_ema9 <= prev_ema21:
        if close > sma50:
            confluence = 0
            if pattern_dir == 'BULLISH': confluence += 1
            if adx > 25: confluence += 1
            if volume_ratio > 1.3: confluence += 1
            if confluence >= 1:
                if pattern_dir == 'BEARISH' and pattern_str > 0.5:
                    return {'action': 'HOLD', 'confidence': 0.0}
                conf = min(0.80, 0.35 + confluence * 0.10 + pattern_str * 0.10)
                return {'action': 'BUY', 'confidence': conf}

    if ema9 < ema21 and prev_ema9 >= prev_ema21:
        if close < sma50:
            confluence = 0
            if pattern_dir == 'BEARISH': confluence += 1
            if adx > 25: confluence += 1
            if volume_ratio > 1.3: confluence += 1
            if confluence >= 1:
                if pattern_dir == 'BULLISH' and pattern_str > 0.5:
                    return {'action': 'HOLD', 'confidence': 0.0}
                conf = min(0.80, 0.35 + confluence * 0.10 + pattern_str * 0.10)
                return {'action': 'SELL', 'confidence': conf}

    return {'action': 'HOLD', 'confidence': 0.0}


def strategy_momentum_pro(row, history):
    """V2 MomentumPro — momentum + trend alignment + pattern gate."""
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
    if adx > 25:
        score += 1 if score > 0 else -1
    if volume_ratio > 1.5:
        score += 0.5 if score > 0 else -0.5
    if close > ema21: score += 0.5
    elif close < ema21: score -= 0.5

    pattern_dir, pattern_str = _get_pattern_signal(history, min_strength=0.25)
    trend = _get_trend(row, history)

    if score >= 3:
        if trend == 'DOWN':
            return {'action': 'HOLD', 'confidence': 0.0}
        if volume_ratio < 0.8:
            return {'action': 'HOLD', 'confidence': 0.0}
        if pattern_dir == 'BEARISH' and pattern_str > 0.4:
            return {'action': 'HOLD', 'confidence': 0.0}
        conf = min(0.75, 0.30 + (score - 3) * 0.10)
        return {'action': 'BUY', 'confidence': conf}

    elif score <= -3:
        if trend == 'UP':
            return {'action': 'HOLD', 'confidence': 0.0}
        if volume_ratio < 0.8:
            return {'action': 'HOLD', 'confidence': 0.0}
        if pattern_dir == 'BULLISH' and pattern_str > 0.4:
            return {'action': 'HOLD', 'confidence': 0.0}
        conf = min(0.75, 0.30 + (abs(score) - 3) * 0.10)
        return {'action': 'SELL', 'confidence': conf}

    return {'action': 'HOLD', 'confidence': 0.0}


def strategy_bollinger_mr(row, history):
    """PATCH #67: Grid Ranging — BB band mean-reversion for RANGING regime.
    Replaces P#66 BollingerMR which had 0 triggers (conditions too strict).
    
    P#67 Grid approach: relaxed BB%B bounds, no RSI requirement, ADX < 22.
    - BB%B < 0.20 → BUY (near lower band)
    - BB%B > 0.80 → SELL (near upper band)
    - RSI only used as CONTRADICTION filter (block BUY if RSI>75, SELL if RSI<25)
    - No volume requirement (removed: was filtering all RANGING signals)
    
    Confidence scales with how deep into the band the price is.
    """
    close = row['close']
    rsi = row.get('rsi_14', 50)
    bb_pctb = row.get('bb_pctb', 0.5)
    adx = row.get('adx', 25)

    # Only active in RANGING environments (ADX < threshold)
    max_adx = getattr(config, 'GRID_MAX_ADX', 22)
    if adx >= max_adx:
        return {'action': 'HOLD', 'confidence': 0.0}

    grid_enabled = getattr(config, 'GRID_RANGING_ENABLED', True)
    if not grid_enabled:
        return {'action': 'HOLD', 'confidence': 0.0}

    bb_low = getattr(config, 'GRID_BB_LOW', 0.20)
    bb_high = getattr(config, 'GRID_BB_HIGH', 0.80)
    bb_extreme_low = getattr(config, 'GRID_BB_EXTREME_LOW', 0.08)
    bb_extreme_high = getattr(config, 'GRID_BB_EXTREME_HIGH', 0.92)
    rsi_filter_low = getattr(config, 'GRID_RSI_FILTER_LOW', 25)
    rsi_filter_high = getattr(config, 'GRID_RSI_FILTER_HIGH', 75)

    # BUY: price near lower Bollinger Band
    if bb_pctb < bb_low:
        # RSI contradiction filter: don't buy if RSI shows extreme overbought
        if rsi > rsi_filter_high:
            return {'action': 'HOLD', 'confidence': 0.0}
        # Confidence scales with depth: deeper into band = higher confidence
        depth = (bb_low - bb_pctb) / bb_low  # 0..1
        if bb_pctb < bb_extreme_low:
            conf = min(0.85, 0.55 + depth * 0.30)  # Extreme: 0.55-0.85
        else:
            conf = min(0.70, 0.35 + depth * 0.25)  # Normal: 0.35-0.70
        return {'action': 'BUY', 'confidence': max(0.30, conf)}

    # SELL: price near upper Bollinger Band
    if bb_pctb > bb_high:
        # RSI contradiction filter: don't sell if RSI shows extreme oversold
        if rsi < rsi_filter_low:
            return {'action': 'HOLD', 'confidence': 0.0}
        depth = (bb_pctb - bb_high) / (1.0 - bb_high + 0.01)  # 0..1
        if bb_pctb > bb_extreme_high:
            conf = min(0.85, 0.55 + depth * 0.30)
        else:
            conf = min(0.70, 0.35 + depth * 0.25)
        return {'action': 'SELL', 'confidence': max(0.30, conf)}

    return {'action': 'HOLD', 'confidence': 0.0}


# Strategy registry
ALL_STRATEGIES = {
    'AdvancedAdaptive': strategy_advanced_adaptive,
    'RSITurbo': strategy_rsi_turbo,
    'SuperTrend': strategy_supertrend,
    'MACrossover': strategy_ma_crossover,
    'MomentumPro': strategy_momentum_pro,
    'BollingerMR': strategy_bollinger_mr,    # P#67: Grid Ranging (upgraded from P#66 BB MR)
}


def run_all_strategies(row, history):
    """
    Run all 5 strategies and return signals map.
    
    Returns:
        dict: {strategy_name: {action, confidence}}
    """
    signals = {}
    for name, fn in ALL_STRATEGIES.items():
        try:
            sig = fn(row, history)
            signals[name] = sig
        except Exception:
            signals[name] = {'action': 'HOLD', 'confidence': 0.0}
    return signals

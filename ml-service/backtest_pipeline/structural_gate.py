"""History-aware structural gate for runtime parity.

Mirrors the live runtime structural validation with lightweight support /
resistance, volume, and macro-trend checks.
"""

from math import floor


STRUCTURAL_GATE_SETTINGS = {
    'min_history': 30,
    'sr_weight': 0.35,
    'volume_weight': 0.25,
    'mtf_weight': 0.40,
    'gate_min_score': 0.30,
    'boost_threshold': 0.65,
}


def _clamp(value, min_value, max_value):
    return max(min_value, min(max_value, float(value)))


def _history_to_records(history):
    if history is None:
        return []

    if hasattr(history, 'to_dict'):
        try:
            return history.to_dict('records')
        except TypeError:
            pass

    if isinstance(history, list):
        records = []
        for item in history:
            if isinstance(item, dict):
                records.append(item)
        return records

    return []


def _get_float(record, *keys, default=0.0):
    for key in keys:
        if key in record and record[key] is not None:
            return float(record[key])
    return float(default)


def _ema(values, period):
    if not values:
        return 0.0
    k = 2.0 / (period + 1.0)
    ema_value = float(values[0])
    for value in values[1:]:
        ema_value = float(value) * k + ema_value * (1.0 - k)
    return ema_value


def _sma(values, period):
    if not values:
        return 0.0
    if len(values) < period:
        return sum(values) / len(values)
    slice_values = values[-period:]
    return sum(slice_values) / len(slice_values)


def _atr(records, period=14):
    if len(records) < 2:
        close = _get_float(records[-1], 'close', default=0.0) if records else 0.0
        return max(close * 0.01, 1e-9)

    tr_values = []
    for idx in range(1, len(records)):
        current = records[idx]
        previous = records[idx - 1]
        high = _get_float(current, 'high', 'High', 'close')
        low = _get_float(current, 'low', 'Low', 'close')
        prev_close = _get_float(previous, 'close', 'Close', default=high)
        tr_values.append(max(high - low, abs(high - prev_close), abs(low - prev_close)))

    if not tr_values:
        close = _get_float(records[-1], 'close', default=0.0)
        return max(close * 0.01, 1e-9)

    if len(tr_values) < period:
        return sum(tr_values) / len(tr_values)
    return sum(tr_values[-period:]) / period


def _adx(records, period=14):
    if len(records) < period + 2:
        return 20.0

    plus_dm = []
    minus_dm = []
    tr_values = []
    for idx in range(1, len(records)):
        current = records[idx]
        previous = records[idx - 1]
        high = _get_float(current, 'high', 'High', 'close')
        low = _get_float(current, 'low', 'Low', 'close')
        prev_high = _get_float(previous, 'high', 'High', 'close')
        prev_low = _get_float(previous, 'low', 'Low', 'close')
        prev_close = _get_float(previous, 'close', 'Close', default=high)

        up_move = high - prev_high
        down_move = prev_low - low
        plus_dm.append(up_move if up_move > down_move and up_move > 0 else 0.0)
        minus_dm.append(down_move if down_move > up_move and down_move > 0 else 0.0)
        tr_values.append(max(high - low, abs(high - prev_close), abs(low - prev_close)))

    if len(tr_values) < period:
        return 20.0

    dx_values = []
    for idx in range(period - 1, len(tr_values)):
        tr_sum = sum(tr_values[idx - period + 1:idx + 1])
        plus_sum = sum(plus_dm[idx - period + 1:idx + 1])
        minus_sum = sum(minus_dm[idx - period + 1:idx + 1])
        if tr_sum <= 0:
            dx_values.append(0.0)
            continue
        plus_di = 100.0 * plus_sum / tr_sum
        minus_di = 100.0 * minus_sum / tr_sum
        denominator = plus_di + minus_di
        dx_values.append(0.0 if denominator <= 0 else 100.0 * abs(plus_di - minus_di) / denominator)

    if not dx_values:
        return 20.0
    return sum(dx_values[-period:]) / min(period, len(dx_values))


def _infer_round_step(close):
    if close >= 10000:
        return 1000.0
    if close >= 1000:
        return 100.0
    if close >= 100:
        return 10.0
    if close >= 10:
        return 1.0
    if close >= 1:
        return 0.1
    return 0.01


def calculate_current_indicators(history):
    records = _history_to_records(history)
    current = records[-1] if records else {}
    closes = [_get_float(record, 'close', 'Close') for record in records]
    volumes = [_get_float(record, 'volume', 'Volume') for record in records]
    close = _get_float(current, 'close', 'Close')
    average_volume = (sum(volumes[-20:]) / len(volumes[-20:])) if volumes[-20:] else (volumes[-1] if volumes else 0.0)
    latest_volume = volumes[-1] if volumes else 0.0

    return {
        'close': close,
        'atr': _atr(records, 14),
        'ema21': _ema(closes, 21),
        'ema50': _ema(closes, 50),
        'ema200': _ema(closes, 200),
        'sma200': _sma(closes, 200),
        'adx': _adx(records, 14),
        'volume_ratio': (latest_volume / average_volume) if average_volume > 0 else 1.0,
    }


def calculate_sr_levels(history, close):
    records = _history_to_records(history)
    supports = []
    resistances = []

    if len(records) >= 20:
        pivot_slice = records[-min(96, len(records)):]
        highs = [_get_float(record, 'high', 'High', 'close') for record in pivot_slice]
        lows = [_get_float(record, 'low', 'Low', 'close') for record in pivot_slice]
        day_high = max(highs)
        day_low = min(lows)
        day_close = _get_float(pivot_slice[-1], 'close', 'Close', default=close)
        pivot = (day_high + day_low + day_close) / 3.0
        r1 = 2 * pivot - day_low
        s1 = 2 * pivot - day_high
        r2 = pivot + (day_high - day_low)
        s2 = pivot - (day_high - day_low)

        for level in (s2, s1, pivot):
            if level < close:
                supports.append(level)
            else:
                resistances.append(level)
        for level in (r1, r2):
            if level > close:
                resistances.append(level)
            else:
                supports.append(level)

    if len(records) >= 50:
        fib_slice = records[-min(100, len(records)):]
        highs = [_get_float(record, 'high', 'High', 'close') for record in fib_slice]
        lows = [_get_float(record, 'low', 'Low', 'close') for record in fib_slice]
        swing_high = max(highs)
        swing_low = min(lows)
        fib_range = swing_high - swing_low
        if fib_range > 0:
            for ratio in (0.236, 0.382, 0.5, 0.618, 0.786):
                level = swing_high - ratio * fib_range
                if level < close:
                    supports.append(level)
                else:
                    resistances.append(level)

    step = _infer_round_step(close)
    base = floor(close / step) * step
    for level in (base - step, base, base + step, base + 2 * step):
        if level <= 0:
            continue
        if level < close:
            supports.append(level)
        elif level > close:
            resistances.append(level)

    return {
        'supports': sorted(set(supports), reverse=True)[:5],
        'resistances': sorted(set(resistances))[:5],
    }


def _evaluate_sr(action, indicators, history):
    close = float(indicators['close'])
    atr = max(float(indicators['atr']), 1e-9)
    levels = calculate_sr_levels(history, close)
    reasons = []

    if not levels['supports'] and not levels['resistances']:
        return {'score': 0.5, 'reasons': ['S/R: no levels found']}

    score = 0.5
    nearest_support = levels['supports'][0] if levels['supports'] else None
    nearest_resistance = levels['resistances'][0] if levels['resistances'] else None

    if action == 'BUY':
        if nearest_support is not None and abs(close - nearest_support) < 1.5 * atr:
            proximity = 1.0 - abs(close - nearest_support) / (1.5 * atr)
            score = 0.6 + proximity * 0.35
            reasons.append(f'S/R: BUY near support {nearest_support:.4f}')
        elif nearest_resistance is not None and abs(close - nearest_resistance) < 0.8 * atr:
            score = 0.20
            reasons.append(f'S/R: BUY at resistance {nearest_resistance:.4f}')
        else:
            reasons.append('S/R: BUY mid-range')
    elif action == 'SELL':
        if nearest_resistance is not None and abs(close - nearest_resistance) < 1.5 * atr:
            proximity = 1.0 - abs(close - nearest_resistance) / (1.5 * atr)
            score = 0.6 + proximity * 0.35
            reasons.append(f'S/R: SELL near resistance {nearest_resistance:.4f}')
        elif nearest_support is not None and abs(close - nearest_support) < 0.8 * atr:
            score = 0.20
            reasons.append(f'S/R: SELL at support {nearest_support:.4f}')
        else:
            reasons.append('S/R: SELL mid-range')

    return {'score': _clamp(score, 0.0, 1.0), 'reasons': reasons}


def _evaluate_volume(action, indicators, history):
    records = _history_to_records(history)
    close = float(indicators['close'])
    volume_ratio = float(indicators['volume_ratio'])
    atr = max(float(indicators['atr']), 1e-9)
    reasons = []
    score = 0.5

    if volume_ratio >= 1.5:
        score += 0.20
        reasons.append(f'VOL: strong volume ({volume_ratio:.1f}x avg)')
    elif volume_ratio >= 1.2:
        score += 0.10
        reasons.append(f'VOL: above-avg volume ({volume_ratio:.1f}x)')
    elif volume_ratio < 0.6:
        score -= 0.20
        reasons.append(f'VOL: weak volume ({volume_ratio:.1f}x)')

    if len(records) >= 20:
        vwap_slice = records[-min(96, len(records)):]
        total_volume = 0.0
        weighted_price = 0.0
        for record in vwap_slice:
            price = _get_float(record, 'close', 'Close')
            volume = _get_float(record, 'volume', 'Volume')
            total_volume += volume
            weighted_price += price * volume
        vwap = (weighted_price / total_volume) if total_volume > 0 else close

        if action == 'BUY':
            if close > vwap:
                score += 0.10
                reasons.append('VOL: above VWAP')
            elif close < vwap - 0.5 * atr:
                score += 0.05
                reasons.append('VOL: below VWAP mean-reversion')
        elif action == 'SELL':
            if close < vwap:
                score += 0.10
                reasons.append('VOL: below VWAP')
            elif close > vwap + 0.5 * atr:
                score += 0.05
                reasons.append('VOL: above VWAP mean-reversion')

    return {'score': _clamp(score, 0.0, 1.0), 'reasons': reasons}


def _historical_sma(closes, period, end_exclusive):
    if end_exclusive <= 0:
        return 0.0
    if end_exclusive < period:
        return closes[end_exclusive - 1]
    slice_values = closes[end_exclusive - period:end_exclusive]
    return sum(slice_values) / len(slice_values)


def _evaluate_mtf(action, indicators, history):
    records = _history_to_records(history)
    closes = [_get_float(record, 'close', 'Close') for record in records]
    close = float(indicators['close'])
    ema21 = float(indicators['ema21'])
    ema50 = float(indicators['ema50'])
    ema200 = float(indicators['ema200'])
    sma200 = float(indicators['sma200'])
    adx = float(indicators['adx'])
    reasons = []
    alignment_count = 0

    if len(closes) >= 210:
        current_sma200 = _historical_sma(closes, 200, len(closes))
        prev_sma200 = _historical_sma(closes, 200, len(closes) - 10)
        slope = ((current_sma200 - prev_sma200) / prev_sma200) if prev_sma200 > 0 else 0.0

        if action == 'BUY' and slope > 0.001:
            alignment_count += 1
            reasons.append(f'MTF: SMA200 rising ({slope * 100:.2f}%)')
        elif action == 'SELL' and slope < -0.001:
            alignment_count += 1
            reasons.append(f'MTF: SMA200 falling ({slope * 100:.2f}%)')
        elif action == 'BUY' and slope < -0.002:
            alignment_count -= 1
            reasons.append('MTF: SMA200 strongly falling')
        elif action == 'SELL' and slope > 0.002:
            alignment_count -= 1
            reasons.append('MTF: SMA200 strongly rising')

    if ema50 > 0 and ema200 > 0:
        if action == 'BUY' and ema50 > ema200:
            alignment_count += 1
            reasons.append('MTF: EMA50 > EMA200')
        elif action == 'SELL' and ema50 < ema200:
            alignment_count += 1
            reasons.append('MTF: EMA50 < EMA200')
        elif action == 'BUY' and ema50 < ema200:
            alignment_count -= 1
            reasons.append('MTF: counter-trend BUY')
        elif action == 'SELL' and ema50 > ema200:
            alignment_count -= 1
            reasons.append('MTF: counter-trend SELL')

    if sma200 > 0:
        if action == 'BUY' and close > sma200:
            alignment_count += 1
        elif action == 'SELL' and close < sma200:
            alignment_count += 1
        elif action == 'BUY' and close < sma200 * 0.98:
            alignment_count -= 1
            reasons.append('MTF: price well below SMA200')

    if adx > 30:
        if action == 'BUY' and close > ema21:
            alignment_count += 1
            reasons.append(f'MTF: strong trend ADX {adx:.0f} + price > EMA21')
        elif action == 'SELL' and close < ema21:
            alignment_count += 1
            reasons.append(f'MTF: strong trend ADX {adx:.0f} + price < EMA21')

    return {
        'score': _clamp(0.5 + alignment_count * 0.125, 0.0, 1.0),
        'reasons': reasons,
        'alignment_count': alignment_count,
    }


def evaluate_structural_gate(action, history):
    if action == 'HOLD':
        return {
            'pass': True,
            'confidence_adj': 1.0,
            'score': 0.5,
            'reasons': [],
            'sr_score': 0.5,
            'volume_score': 0.5,
            'mtf_score': 0.5,
        }

    records = _history_to_records(history)
    if len(records) < STRUCTURAL_GATE_SETTINGS['min_history']:
        return {
            'pass': True,
            'confidence_adj': 1.0,
            'score': 0.5,
            'reasons': ['STRUCT: insufficient history'],
            'sr_score': 0.5,
            'volume_score': 0.5,
            'mtf_score': 0.5,
        }

    indicators = calculate_current_indicators(records)
    sr = _evaluate_sr(action, indicators, records)
    volume = _evaluate_volume(action, indicators, records)
    mtf = _evaluate_mtf(action, indicators, records)

    composite = (
        sr['score'] * STRUCTURAL_GATE_SETTINGS['sr_weight'] +
        volume['score'] * STRUCTURAL_GATE_SETTINGS['volume_weight'] +
        mtf['score'] * STRUCTURAL_GATE_SETTINGS['mtf_weight']
    ) / (
        STRUCTURAL_GATE_SETTINGS['sr_weight'] +
        STRUCTURAL_GATE_SETTINGS['volume_weight'] +
        STRUCTURAL_GATE_SETTINGS['mtf_weight']
    )

    if composite < STRUCTURAL_GATE_SETTINGS['gate_min_score']:
        confidence_adj = 0.0
        passed = False
    elif composite < 0.40:
        confidence_adj = 0.80 + ((composite - STRUCTURAL_GATE_SETTINGS['gate_min_score']) / (0.40 - STRUCTURAL_GATE_SETTINGS['gate_min_score'])) * 0.15
        passed = True
    elif composite >= STRUCTURAL_GATE_SETTINGS['boost_threshold']:
        confidence_adj = min(1.15, 1.05 + (composite - STRUCTURAL_GATE_SETTINGS['boost_threshold']) * 0.30)
        passed = True
    else:
        confidence_adj = 0.95 + (composite - 0.40) * 0.40
        passed = True

    return {
        'pass': passed,
        'confidence_adj': round(confidence_adj, 3),
        'score': round(composite, 3),
        'reasons': sr['reasons'] + volume['reasons'] + mtf['reasons'],
        'sr_score': round(sr['score'], 3),
        'volume_score': round(volume['score'], 3),
        'mtf_score': round(mtf['score'], 3),
        'alignment_count': mtf['alignment_count'],
    }
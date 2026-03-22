"""
TURBO-BOT — Price Action Engine (PATCH #62)
============================================
Real market structure analysis for entry quality:
1. Swing High/Low detection (zigzag)
2. Market Structure: HH/HL (bullish), LH/LL (bearish), BOS detection
3. Horizontal S/R from tested levels (zone-based, strength-scored)
4. Entry Timing: pullback, rejection, breakout+retest patterns
5. Composite PA score for entry gating

Usage:
    from .price_action import PriceActionEngine
    pa = PriceActionEngine()
    result = pa.analyze(row, history, action)
    # result = {
    #   'score': 0.0-1.0,          # composite PA score
    #   'structure': 'BULLISH'|'BEARISH'|'RANGING',
    #   'entry_type': 'pullback'|'rejection'|'breakout'|'none',
    #   'sr_zone': {...},           # nearest relevant S/R zone
    #   'reasons': [...],
    # }
"""

import numpy as np
from . import config


class PriceActionEngine:
    """
    Professional-grade Price Action analysis.
    Detects market structure, S/R levels, and entry timing patterns.
    """

    def __init__(self):
        # ── Swing detection params ──
        self.swing_lookback = 3       # bars left+right to confirm swing (was 5 — too strict)
        self.min_swing_atr = 0.15     # min swing size relative to ATR (was 0.3)
        self.max_sr_zones = 12        # max S/R zones to track

        # ── Zone params ──
        self.zone_width_atr = 0.30    # S/R zone width = 0.30 × ATR (wider zone)
        self.zone_merge_atr = 0.4     # merge zones closer than 0.4 × ATR
        self.zone_max_age = 500       # zones older than 500 candles get discarded

        # ── Entry timing params ──
        self.pullback_min_retrace = 0.236  # min 23.6% retrace for pullback (was 0.382)
        self.pullback_max_retrace = 0.786  # max 78.6% retrace (deeper = weak)
        self.rejection_wick_ratio = 0.45   # wick must be > 45% of candle range (was 0.6)
        self.breakout_volume_min = 1.2     # breakout needs > 1.2× avg volume

        # ── State (cached between candles) ──
        self._swing_highs = []   # [(index, price, strength)]
        self._swing_lows = []
        self._sr_zones = []      # [{'price', 'type', 'strength', 'tests', 'last_test', 'width'}]
        self._last_bos = None    # last Break of Structure
        self._structure = 'RANGING'
        self._last_calc_idx = -1
        self._recalc_interval = 1  # recalc swings every candle for accuracy

        # ── Stats ──
        self.stats = {
            'total_analyzed': 0,
            'pullback_entries': 0,
            'rejection_entries': 0,
            'breakout_entries': 0,
            'no_pa_entries': 0,
            'bullish_structure': 0,
            'bearish_structure': 0,
            'ranging_structure': 0,
            'sr_boosts': 0,
            'sr_rejections': 0,
        }

    # ════════════════════════════════════════════════════════════
    # PUBLIC API
    # ════════════════════════════════════════════════════════════

    def analyze(self, row, history, action, regime='RANGING'):
        """
        Full Price Action analysis for a proposed entry.

        Args:
            row: Current candle (Series: open, high, low, close, volume, atr, etc.)
            history: DataFrame of recent candles (200+ warmup)
            action: 'BUY' or 'SELL'
            regime: Current regime from RegimeDetector

        Returns:
            dict with score, structure, entry_type, sr_zone, reasons
        """
        if action == 'HOLD' or len(history) < 50:
            return self._neutral_result()

        self.stats['total_analyzed'] += 1
        close = row['close']
        atr = row.get('atr', close * 0.01)
        reasons = []

        # ── 1. Update swings & S/R zones ──
        candle_idx = len(history)
        if candle_idx - self._last_calc_idx >= self._recalc_interval:
            self._detect_swings(history, atr)
            self._build_sr_zones(history, atr)
            self._detect_structure(atr)
            self._last_calc_idx = candle_idx

        # ── 2. Market structure score (0.0 - 0.35) ──
        struct_score, struct_reasons = self._score_structure(action, close, atr)
        reasons.extend(struct_reasons)

        # ── 3. S/R proximity score (0.0 - 0.35) ──
        sr_score, sr_reasons, sr_zone = self._score_sr_proximity(
            action, close, atr, history
        )
        reasons.extend(sr_reasons)

        # ── 4. Entry timing score (0.0 - 0.30) ──
        timing_score, timing_reasons, entry_type = self._score_entry_timing(
            action, row, history, atr, sr_zone
        )
        reasons.extend(timing_reasons)

        # ── Composite ──
        composite = struct_score + sr_score + timing_score

        # ── Track stats ──
        if entry_type == 'pullback':
            self.stats['pullback_entries'] += 1
        elif entry_type == 'rejection':
            self.stats['rejection_entries'] += 1
        elif entry_type == 'breakout':
            self.stats['breakout_entries'] += 1
        else:
            self.stats['no_pa_entries'] += 1

        return {
            'score': round(composite, 3),
            'structure': self._structure,
            'entry_type': entry_type,
            'sr_zone': sr_zone,
            'struct_score': round(struct_score, 3),
            'sr_score': round(sr_score, 3),
            'timing_score': round(timing_score, 3),
            'reasons': reasons,
        }

    def get_sr_zones(self):
        """Return current S/R zones for visualization/debugging."""
        return list(self._sr_zones)

    def get_stats(self):
        """Return PA engine statistics."""
        return self.stats.copy()

    # ════════════════════════════════════════════════════════════
    # SWING DETECTION (Zigzag)
    # ════════════════════════════════════════════════════════════

    def _detect_swings(self, history, atr):
        """
        Detect swing highs and lows using left/right bar comparison.
        A swing high has N bars lower on each side.
        A swing low has N bars higher on each side.
        """
        highs = history['high'].values
        lows = history['low'].values
        n = self.swing_lookback
        min_size = self.min_swing_atr * atr

        self._swing_highs = []
        self._swing_lows = []

        for i in range(n, len(highs) - n):
            # ── Swing High ──
            is_high = True
            for j in range(1, n + 1):
                if highs[i] <= highs[i - j] or highs[i] <= highs[i + j]:
                    is_high = False
                    break
            if is_high:
                # Check significance (must be > min_size from nearby lows)
                local_low = min(lows[max(0, i - n * 2):i + n * 2 + 1])
                if highs[i] - local_low >= min_size:
                    self._swing_highs.append((i, highs[i]))

            # ── Swing Low ──
            is_low = True
            for j in range(1, n + 1):
                if lows[i] >= lows[i - j] or lows[i] >= lows[i + j]:
                    is_low = False
                    break
            if is_low:
                local_high = max(highs[max(0, i - n * 2):i + n * 2 + 1])
                if local_high - lows[i] >= min_size:
                    self._swing_lows.append((i, lows[i]))

        # Keep recent swings only (last zone_max_age candles)
        cutoff = len(highs) - self.zone_max_age
        self._swing_highs = [(i, p) for i, p in self._swing_highs if i >= cutoff]
        self._swing_lows = [(i, p) for i, p in self._swing_lows if i >= cutoff]

    # ════════════════════════════════════════════════════════════
    # S/R ZONE BUILDING
    # ════════════════════════════════════════════════════════════

    def _build_sr_zones(self, history, atr):
        """
        Build S/R zones from swing highs/lows.
        - Merge nearby levels into zones
        - Score by: # tests, recency, volume at level
        """
        close = history['close'].values[-1] if len(history) > 0 else 0
        volumes = history['volume'].values if 'volume' in history.columns else None
        zone_width = self.zone_width_atr * atr
        merge_dist = self.zone_merge_atr * atr

        # Collect all swing prices
        all_swings = []
        for idx, price in self._swing_highs:
            vol = volumes[idx] if volumes is not None and idx < len(volumes) else 1.0
            all_swings.append({
                'price': price, 'type': 'resistance', 'idx': idx, 'volume': vol
            })
        for idx, price in self._swing_lows:
            vol = volumes[idx] if volumes is not None and idx < len(volumes) else 1.0
            all_swings.append({
                'price': price, 'type': 'support', 'idx': idx, 'volume': vol
            })

        if not all_swings:
            self._sr_zones = []
            return

        # Sort by price
        all_swings.sort(key=lambda x: x['price'])

        # Merge into zones
        zones = []
        current_zone = {
            'price': all_swings[0]['price'],
            'type': all_swings[0]['type'],
            'tests': 1,
            'last_test': all_swings[0]['idx'],
            'total_volume': all_swings[0]['volume'],
            'prices': [all_swings[0]['price']],
        }

        for swing in all_swings[1:]:
            if abs(swing['price'] - current_zone['price']) <= merge_dist:
                # Merge into current zone
                current_zone['tests'] += 1
                current_zone['prices'].append(swing['price'])
                current_zone['price'] = np.mean(current_zone['prices'])
                current_zone['last_test'] = max(current_zone['last_test'], swing['idx'])
                current_zone['total_volume'] += swing['volume']
                # Zone tested from both sides = strong
                if swing['type'] != current_zone['type']:
                    current_zone['type'] = 'dual'  # acts as both S and R
            else:
                zones.append(current_zone)
                current_zone = {
                    'price': swing['price'],
                    'type': swing['type'],
                    'tests': 1,
                    'last_test': swing['idx'],
                    'total_volume': swing['volume'],
                    'prices': [swing['price']],
                }
        zones.append(current_zone)

        # Score zones
        max_idx = len(history)
        avg_vol = np.mean(volumes[-100:]) if volumes is not None and len(volumes) >= 100 else 1.0

        for z in zones:
            recency = 1.0 - (max_idx - z['last_test']) / max(self.zone_max_age, 1)
            recency = max(0.1, recency)  # floor at 0.1

            test_score = min(z['tests'] / 4.0, 1.0)  # 4+ tests = max
            vol_score = min(z['total_volume'] / (avg_vol * z['tests'] + 1e-10), 2.0) / 2.0

            z['strength'] = round(
                test_score * 0.40 + recency * 0.35 + vol_score * 0.25, 3
            )
            z['width'] = zone_width
            z['distance'] = abs(close - z['price'])
            del z['prices']  # cleanup

        # Sort by distance from current price, keep nearest ones
        zones.sort(key=lambda z: z['distance'])
        self._sr_zones = zones[:self.max_sr_zones]

    # ════════════════════════════════════════════════════════════
    # MARKET STRUCTURE DETECTION
    # ════════════════════════════════════════════════════════════

    def _detect_structure(self, atr):
        """
        Determine market structure from recent swing sequence:
        - BULLISH: Higher Highs + Higher Lows (HH/HL)
        - BEARISH: Lower Highs + Lower Lows (LH/LL)
        - RANGING: mixed or insufficient swings
        """
        # Need at least 2 swing highs and 2 swing lows for structure
        if len(self._swing_highs) < 2 or len(self._swing_lows) < 2:
            self._structure = 'RANGING'
            self.stats['ranging_structure'] += 1
            return

        # Take last 4 swing highs and lows
        recent_highs = [p for _, p in self._swing_highs[-4:]]
        recent_lows = [p for _, p in self._swing_lows[-4:]]

        # Check for Higher Highs
        hh_count = sum(1 for i in range(1, len(recent_highs))
                       if recent_highs[i] > recent_highs[i - 1] + atr * 0.1)
        lh_count = sum(1 for i in range(1, len(recent_highs))
                       if recent_highs[i] < recent_highs[i - 1] - atr * 0.1)

        # Check for Higher Lows
        hl_count = sum(1 for i in range(1, len(recent_lows))
                       if recent_lows[i] > recent_lows[i - 1] + atr * 0.1)
        ll_count = sum(1 for i in range(1, len(recent_lows))
                       if recent_lows[i] < recent_lows[i - 1] - atr * 0.1)

        bullish_signals = hh_count + hl_count
        bearish_signals = lh_count + ll_count

        if bullish_signals >= 2 and bullish_signals > bearish_signals:
            self._structure = 'BULLISH'
            self.stats['bullish_structure'] += 1
        elif bearish_signals >= 2 and bearish_signals > bullish_signals:
            self._structure = 'BEARISH'
            self.stats['bearish_structure'] += 1
        else:
            self._structure = 'RANGING'
            self.stats['ranging_structure'] += 1

    # ════════════════════════════════════════════════════════════
    # SCORING: Structure (max 0.35)
    # ════════════════════════════════════════════════════════════

    def _score_structure(self, action, close, atr):
        """
        Score how well the trade aligns with market structure.
        BUY in bullish structure = good. BUY in bearish = bad.
        """
        reasons = []
        score = 0.0

        if action == 'BUY':
            if self._structure == 'BULLISH':
                score = 0.30
                reasons.append('PA: BUY aligned with BULLISH structure (HH/HL)')
            elif self._structure == 'BEARISH':
                score = 0.05
                reasons.append('PA: BUY COUNTER to BEARISH structure (LH/LL) ⚠')
            else:
                score = 0.15
                reasons.append('PA: BUY in RANGING structure')
        elif action == 'SELL':
            if self._structure == 'BEARISH':
                score = 0.30
                reasons.append('PA: SELL aligned with BEARISH structure (LH/LL)')
            elif self._structure == 'BULLISH':
                score = 0.05
                reasons.append('PA: SELL COUNTER to BULLISH structure (HH/HL) ⚠')
            else:
                score = 0.15
                reasons.append('PA: SELL in RANGING structure')

        # BOS (Break of Structure) bonus
        if self._last_bos and self._structure != 'RANGING':
            score = min(0.35, score + 0.05)
            reasons.append('PA: Recent Break of Structure detected')

        return score, reasons

    # ════════════════════════════════════════════════════════════
    # SCORING: S/R Proximity (max 0.35)
    # ════════════════════════════════════════════════════════════

    def _score_sr_proximity(self, action, close, atr, history):
        """
        Score entry based on proximity to S/R zones.
        BUY near strong support = good. BUY near strong resistance = bad.
        """
        reasons = []
        best_zone = None

        if not self._sr_zones:
            return 0.15, ['PA: No S/R zones found'], None

        # Find nearest relevant zone
        for zone in self._sr_zones:
            dist = abs(close - zone['price'])
            if dist > 2.0 * atr:
                continue  # too far

            proximity = 1.0 - dist / (2.0 * atr)

            if action == 'BUY':
                # BUY near support = good
                if zone['type'] in ('support', 'dual') and close >= zone['price'] - zone['width']:
                    if dist <= 1.5 * atr:
                        score = 0.15 + proximity * 0.20 * zone['strength']
                        self.stats['sr_boosts'] += 1
                        reasons.append(
                            f"PA: BUY near support ${zone['price']:.0f} "
                            f"(strength {zone['strength']:.2f}, {zone['tests']} tests)"
                        )
                        best_zone = zone
                        return min(0.35, score), reasons, best_zone

                # BUY at resistance = bad
                if zone['type'] in ('resistance', 'dual') and close <= zone['price'] + zone['width']:
                    if dist <= 0.8 * atr:
                        score = 0.05
                        self.stats['sr_rejections'] += 1
                        reasons.append(
                            f"PA: BUY AT resistance ${zone['price']:.0f} "
                            f"(strength {zone['strength']:.2f}) — RISKY ⚠"
                        )
                        best_zone = zone
                        return score, reasons, best_zone

            elif action == 'SELL':
                # SELL near resistance = good
                if zone['type'] in ('resistance', 'dual') and close <= zone['price'] + zone['width']:
                    if dist <= 1.5 * atr:
                        score = 0.15 + proximity * 0.20 * zone['strength']
                        self.stats['sr_boosts'] += 1
                        reasons.append(
                            f"PA: SELL near resistance ${zone['price']:.0f} "
                            f"(strength {zone['strength']:.2f}, {zone['tests']} tests)"
                        )
                        best_zone = zone
                        return min(0.35, score), reasons, best_zone

                # SELL at support = bad
                if zone['type'] in ('support', 'dual') and close >= zone['price'] - zone['width']:
                    if dist <= 0.8 * atr:
                        score = 0.05
                        self.stats['sr_rejections'] += 1
                        reasons.append(
                            f"PA: SELL AT support ${zone['price']:.0f} "
                            f"(strength {zone['strength']:.2f}) — RISKY ⚠"
                        )
                        best_zone = zone
                        return score, reasons, best_zone

        # No nearby zone — neutral
        return 0.15, ['PA: Price in mid-range — no nearby S/R'], None

    # ════════════════════════════════════════════════════════════
    # SCORING: Entry Timing (max 0.30)
    # ════════════════════════════════════════════════════════════

    def _score_entry_timing(self, action, row, history, atr, sr_zone):
        """
        Score entry timing pattern quality:
        1. Pullback to S/R after impulse move
        2. Rejection wick at S/R level
        3. Breakout with volume confirmation
        """
        close = row['close']
        open_p = row['open']
        high = row['high']
        low = row['low']
        volume_ratio = row.get('volume_ratio', 1.0)
        reasons = []
        entry_type = 'none'
        score = 0.0

        # ── 1. PULLBACK DETECTION ──
        pullback_score = self._detect_pullback(action, history, close, atr)
        if pullback_score > 0:
            score = max(score, pullback_score)
            entry_type = 'pullback'
            reasons.append(f'PA: Pullback entry detected (score {pullback_score:.2f})')

        # ── 2. REJECTION WICK ──
        candle_range = high - low
        if candle_range > 0:
            if action == 'BUY':
                # Bullish rejection: long lower wick (hammer-like)
                lower_wick = min(open_p, close) - low
                wick_ratio = lower_wick / candle_range
                if wick_ratio >= self.rejection_wick_ratio:
                    rej_score = 0.10 + wick_ratio * 0.20
                    # Bonus if at S/R
                    if sr_zone and sr_zone['type'] in ('support', 'dual'):
                        rej_score += 0.05
                    rej_score = min(0.30, rej_score)
                    if rej_score > score:
                        score = rej_score
                        entry_type = 'rejection'
                        reasons.append(
                            f'PA: Bullish rejection wick ({wick_ratio:.0%} of range)'
                        )
            elif action == 'SELL':
                # Bearish rejection: long upper wick (shooting star)
                upper_wick = high - max(open_p, close)
                wick_ratio = upper_wick / candle_range
                if wick_ratio >= self.rejection_wick_ratio:
                    rej_score = 0.10 + wick_ratio * 0.20
                    if sr_zone and sr_zone['type'] in ('resistance', 'dual'):
                        rej_score += 0.05
                    rej_score = min(0.30, rej_score)
                    if rej_score > score:
                        score = rej_score
                        entry_type = 'rejection'
                        reasons.append(
                            f'PA: Bearish rejection wick ({wick_ratio:.0%} of range)'
                        )

        # ── 3. BREAKOUT + VOLUME ──
        if volume_ratio >= self.breakout_volume_min and sr_zone:
            zone_price = sr_zone['price']
            if action == 'BUY' and close > zone_price + sr_zone['width']:
                # Broke above resistance with volume
                bk_score = 0.15 + min(volume_ratio - 1.0, 1.0) * 0.15
                bk_score = min(0.30, bk_score)
                if bk_score > score:
                    score = bk_score
                    entry_type = 'breakout'
                    reasons.append(
                        f"PA: Breakout above ${zone_price:.0f} with volume {volume_ratio:.1f}×"
                    )
            elif action == 'SELL' and close < zone_price - sr_zone['width']:
                bk_score = 0.15 + min(volume_ratio - 1.0, 1.0) * 0.15
                bk_score = min(0.30, bk_score)
                if bk_score > score:
                    score = bk_score
                    entry_type = 'breakout'
                    reasons.append(
                        f"PA: Breakdown below ${zone_price:.0f} with volume {volume_ratio:.1f}×"
                    )

        # ── Minimum score for any entry ──
        if score == 0.0:
            score = 0.05
            reasons.append('PA: No clear entry pattern — low timing score')

        return score, reasons, entry_type

    def _detect_pullback(self, action, history, close, atr):
        """
        Detect pullback pattern: impulsive move followed by controlled retrace.
        For BUY: price went up sharply, then pulled back 38-78% of the move.
        For SELL: price went down sharply, then pulled back 38-78%.
        """
        if len(history) < 20:
            return 0.0

        # Look at last 20 candles for impulse
        recent = history.iloc[-20:]
        highs = recent['high'].values
        lows = recent['low'].values
        closes = recent['close'].values

        if action == 'BUY':
            # Find impulse: recent swing low → swing high
            impulse_low_idx = np.argmin(lows[:15])  # low in first 15
            impulse_low = lows[impulse_low_idx]
            impulse_high = max(highs[impulse_low_idx:])

            swing_range = impulse_high - impulse_low
            if swing_range < 0.5 * atr:
                return 0.0  # impulse too small

            retrace = impulse_high - close
            retrace_pct = retrace / swing_range if swing_range > 0 else 0

            if self.pullback_min_retrace <= retrace_pct <= self.pullback_max_retrace:
                # Good pullback — check if controlled (smaller candles)
                pullback_vol = np.std(closes[-5:]) / atr if atr > 0 else 1.0
                quality = 1.0 if pullback_vol < 0.5 else 0.7  # controlled = better

                score = 0.15 + (1.0 - abs(retrace_pct - 0.5) / 0.5) * 0.15 * quality
                return min(0.30, score)

        elif action == 'SELL':
            impulse_high_idx = np.argmax(highs[:15])
            impulse_high = highs[impulse_high_idx]
            impulse_low = min(lows[impulse_high_idx:])

            swing_range = impulse_high - impulse_low
            if swing_range < 0.5 * atr:
                return 0.0

            retrace = close - impulse_low
            retrace_pct = retrace / swing_range if swing_range > 0 else 0

            if self.pullback_min_retrace <= retrace_pct <= self.pullback_max_retrace:
                pullback_vol = np.std(closes[-5:]) / atr if atr > 0 else 1.0
                quality = 1.0 if pullback_vol < 0.5 else 0.7

                score = 0.15 + (1.0 - abs(retrace_pct - 0.5) / 0.5) * 0.15 * quality
                return min(0.30, score)

        return 0.0

    # ════════════════════════════════════════════════════════════
    # UTILITIES
    # ════════════════════════════════════════════════════════════

    def _neutral_result(self):
        return {
            'score': 0.5,
            'structure': 'RANGING',
            'entry_type': 'none',
            'sr_zone': None,
            'struct_score': 0.15,
            'sr_score': 0.15,
            'timing_score': 0.05,
            'reasons': [],
        }

    def reset(self):
        """Full reset for new backtest run."""
        self._swing_highs = []
        self._swing_lows = []
        self._sr_zones = []
        self._last_bos = None
        self._structure = 'RANGING'
        self._last_calc_idx = -1
        self.stats = {k: 0 for k in self.stats}

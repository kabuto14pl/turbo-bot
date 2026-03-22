"""
Candlestick Pattern Recognition Engine for Turbo-Bot ML Pipeline
=================================================================
Statistically-proven patterns optimized for BTC/crypto markets.

Each pattern returns:
  - detected: bool
  - strength: float 0-1 (pattern quality/clarity)
  - direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  - volume_confirmed: bool (volume spike on pattern candle)

Patterns implemented (12):
  Single-candle:  Hammer, InvertedHammer, HangingMan, ShootingStar, Doji, PinBar
  Two-candle:     BullishEngulfing, BearishEngulfing, Harami, InsideBar
  Three-candle:   MorningStar, EveningStar, ThreeWhiteSoldiers, ThreeBlackCrows

Usage:
  engine = CandlePatternEngine()
  features = engine.extract_features(df)  # returns dict of ML features
  patterns = engine.detect_all(df)         # returns list of detected patterns
"""

import numpy as np
from typing import Dict, List, Optional, Tuple


class CandlePatternEngine:
    """High-performance candlestick pattern recognition for ML integration."""

    # Thresholds calibrated for BTC 15m/1h candles
    DOJI_BODY_RATIO = 0.05        # Body < 5% of range = doji
    SMALL_BODY_RATIO = 0.15       # Body < 15% = small body
    LARGE_BODY_RATIO = 0.60       # Body > 60% = strong directional candle
    SHADOW_LONG_RATIO = 0.65      # Shadow > 65% of range = long shadow
    SHADOW_SHORT_RATIO = 0.10     # Shadow < 10% = almost no shadow
    ENGULF_MIN_RATIO = 1.05       # Engulfing body must be 5%+ larger
    VOLUME_SPIKE_RATIO = 1.5      # Volume > 1.5x avg = confirmed
    PIN_BAR_TAIL_RATIO = 0.66     # Pin bar tail > 66% of total range

    def __init__(self):
        self.pattern_names = [
            'hammer', 'inverted_hammer', 'hanging_man', 'shooting_star',
            'doji', 'pin_bar',
            'bullish_engulfing', 'bearish_engulfing',
            'harami', 'inside_bar',
            'morning_star', 'evening_star',
            'three_white_soldiers', 'three_black_crows',
        ]

    # ═══════════════════════════════════════════════════════════
    # CANDLE GEOMETRY HELPERS
    # ═══════════════════════════════════════════════════════════

    @staticmethod
    def _body(o: float, c: float) -> float:
        """Absolute body size."""
        return abs(c - o)

    @staticmethod
    def _range(h: float, l: float) -> float:
        """Total candle range (high - low)."""
        return h - l

    @staticmethod
    def _upper_shadow(o: float, h: float, c: float) -> float:
        """Upper shadow length."""
        return h - max(o, c)

    @staticmethod
    def _lower_shadow(o: float, l: float, c: float) -> float:
        """Lower shadow length."""
        return min(o, c) - l

    @staticmethod
    def _is_bullish(o: float, c: float) -> bool:
        return c > o

    @staticmethod
    def _is_bearish(o: float, c: float) -> bool:
        return c < o

    @staticmethod
    def _body_ratio(o: float, h: float, l: float, c: float) -> float:
        """Body as fraction of total range."""
        rng = h - l
        if rng < 1e-10:
            return 0.0
        return abs(c - o) / rng

    def _is_in_downtrend(self, closes: np.ndarray, lookback: int = 10) -> bool:
        """Check if price is in short-term downtrend."""
        if len(closes) < lookback + 1:
            return False
        return closes[-1] < closes[-lookback]

    def _is_in_uptrend(self, closes: np.ndarray, lookback: int = 10) -> bool:
        """Check if price is in short-term uptrend."""
        if len(closes) < lookback + 1:
            return False
        return closes[-1] > closes[-lookback]

    def _avg_volume(self, volumes: np.ndarray, period: int = 20) -> float:
        """Average volume over lookback period."""
        if len(volumes) < period:
            return np.mean(volumes) if len(volumes) > 0 else 1.0
        return np.mean(volumes[-period:])

    def _volume_confirmed(self, current_vol: float, avg_vol: float) -> bool:
        """Check if current volume confirms the pattern."""
        return current_vol > avg_vol * self.VOLUME_SPIKE_RATIO

    # ═══════════════════════════════════════════════════════════
    # SINGLE-CANDLE PATTERNS
    # ═══════════════════════════════════════════════════════════

    def detect_hammer(self, o, h, l, c, closes, volumes) -> Dict:
        """
        Hammer: small body at top, long lower shadow, little/no upper shadow.
        BULLISH reversal — appears after downtrend.
        """
        rng = self._range(h, l)
        if rng < 1e-10:
            return {'detected': False, 'strength': 0, 'direction': 'NEUTRAL', 'volume_confirmed': False}

        br = self._body_ratio(o, h, l, c)
        ls = self._lower_shadow(o, l, c) / rng
        us = self._upper_shadow(o, h, c) / rng

        detected = (
            br < self.SMALL_BODY_RATIO * 2 and  # Small-ish body
            ls > self.SHADOW_LONG_RATIO * 0.7 and  # Long lower shadow (>45% of range)
            us < 0.15 and  # Very small upper shadow
            self._is_in_downtrend(closes)  # Must be in downtrend
        )

        strength = 0.0
        if detected:
            # Strength based on tail length and body position
            strength = min(1.0, ls * 1.2 + (1 - br) * 0.3)
            if self._volume_confirmed(volumes[-1], self._avg_volume(volumes)):
                strength = min(1.0, strength + 0.15)

        return {
            'detected': detected,
            'strength': strength,
            'direction': 'BULLISH',
            'volume_confirmed': detected and self._volume_confirmed(volumes[-1], self._avg_volume(volumes)),
        }

    def detect_inverted_hammer(self, o, h, l, c, closes, volumes) -> Dict:
        """
        Inverted Hammer: small body at bottom, long upper shadow, little/no lower shadow.
        BULLISH reversal — appears after downtrend.
        """
        rng = self._range(h, l)
        if rng < 1e-10:
            return {'detected': False, 'strength': 0, 'direction': 'NEUTRAL', 'volume_confirmed': False}

        br = self._body_ratio(o, h, l, c)
        us = self._upper_shadow(o, h, c) / rng
        ls = self._lower_shadow(o, l, c) / rng

        detected = (
            br < self.SMALL_BODY_RATIO * 2 and
            us > self.SHADOW_LONG_RATIO * 0.7 and
            ls < 0.15 and
            self._is_in_downtrend(closes)
        )

        strength = 0.0
        if detected:
            strength = min(1.0, us * 1.2 + (1 - br) * 0.3)
            if self._volume_confirmed(volumes[-1], self._avg_volume(volumes)):
                strength = min(1.0, strength + 0.15)

        return {
            'detected': detected,
            'strength': strength,
            'direction': 'BULLISH',
            'volume_confirmed': detected and self._volume_confirmed(volumes[-1], self._avg_volume(volumes)),
        }

    def detect_hanging_man(self, o, h, l, c, closes, volumes) -> Dict:
        """
        Hanging Man: same shape as hammer but in UPTREND → bearish.
        """
        rng = self._range(h, l)
        if rng < 1e-10:
            return {'detected': False, 'strength': 0, 'direction': 'NEUTRAL', 'volume_confirmed': False}

        br = self._body_ratio(o, h, l, c)
        ls = self._lower_shadow(o, l, c) / rng
        us = self._upper_shadow(o, h, c) / rng

        detected = (
            br < self.SMALL_BODY_RATIO * 2 and
            ls > self.SHADOW_LONG_RATIO * 0.7 and
            us < 0.15 and
            self._is_in_uptrend(closes)
        )

        strength = 0.0
        if detected:
            strength = min(1.0, ls * 1.1 + (1 - br) * 0.25)
            if self._volume_confirmed(volumes[-1], self._avg_volume(volumes)):
                strength = min(1.0, strength + 0.15)

        return {
            'detected': detected,
            'strength': strength,
            'direction': 'BEARISH',
            'volume_confirmed': detected and self._volume_confirmed(volumes[-1], self._avg_volume(volumes)),
        }

    def detect_shooting_star(self, o, h, l, c, closes, volumes) -> Dict:
        """
        Shooting Star: same shape as inverted hammer but in UPTREND → bearish.
        """
        rng = self._range(h, l)
        if rng < 1e-10:
            return {'detected': False, 'strength': 0, 'direction': 'NEUTRAL', 'volume_confirmed': False}

        br = self._body_ratio(o, h, l, c)
        us = self._upper_shadow(o, h, c) / rng
        ls = self._lower_shadow(o, l, c) / rng

        detected = (
            br < self.SMALL_BODY_RATIO * 2 and
            us > self.SHADOW_LONG_RATIO * 0.7 and
            ls < 0.15 and
            self._is_in_uptrend(closes)
        )

        strength = 0.0
        if detected:
            strength = min(1.0, us * 1.1 + (1 - br) * 0.25)
            if self._volume_confirmed(volumes[-1], self._avg_volume(volumes)):
                strength = min(1.0, strength + 0.15)

        return {
            'detected': detected,
            'strength': strength,
            'direction': 'BEARISH',
            'volume_confirmed': detected and self._volume_confirmed(volumes[-1], self._avg_volume(volumes)),
        }

    def detect_doji(self, o, h, l, c, closes, volumes) -> Dict:
        """
        Doji: virtually no body, shadows in both directions.
        Indecision — direction depends on context (trend reversal signal).
        """
        rng = self._range(h, l)
        if rng < 1e-10:
            return {'detected': False, 'strength': 0, 'direction': 'NEUTRAL', 'volume_confirmed': False}

        br = self._body_ratio(o, h, l, c)

        detected = br < self.DOJI_BODY_RATIO

        direction = 'NEUTRAL'
        strength = 0.0
        if detected:
            # Doji after uptrend = bearish signal, after downtrend = bullish
            if self._is_in_uptrend(closes):
                direction = 'BEARISH'
            elif self._is_in_downtrend(closes):
                direction = 'BULLISH'
            strength = min(1.0, (1 - br / self.DOJI_BODY_RATIO) * 0.7 + 0.3)

        return {
            'detected': detected,
            'strength': strength,
            'direction': direction,
            'volume_confirmed': detected and self._volume_confirmed(volumes[-1], self._avg_volume(volumes)),
        }

    def detect_pin_bar(self, o, h, l, c, closes, volumes) -> Dict:
        """
        Pin Bar: very long tail (>66% of range) + small body.
        Popular in crypto for precise reversals.
        """
        rng = self._range(h, l)
        if rng < 1e-10:
            return {'detected': False, 'strength': 0, 'direction': 'NEUTRAL', 'volume_confirmed': False}

        br = self._body_ratio(o, h, l, c)
        ls = self._lower_shadow(o, l, c) / rng
        us = self._upper_shadow(o, h, c) / rng

        # Bullish pin bar: long lower tail
        bullish_pin = (
            ls > self.PIN_BAR_TAIL_RATIO and
            br < self.SMALL_BODY_RATIO * 2 and
            us < 0.15 and
            self._is_in_downtrend(closes)
        )

        # Bearish pin bar: long upper tail
        bearish_pin = (
            us > self.PIN_BAR_TAIL_RATIO and
            br < self.SMALL_BODY_RATIO * 2 and
            ls < 0.15 and
            self._is_in_uptrend(closes)
        )

        detected = bullish_pin or bearish_pin
        direction = 'BULLISH' if bullish_pin else ('BEARISH' if bearish_pin else 'NEUTRAL')

        strength = 0.0
        if detected:
            tail = ls if bullish_pin else us
            strength = min(1.0, tail * 1.3 + (1 - br) * 0.2)
            if self._volume_confirmed(volumes[-1], self._avg_volume(volumes)):
                strength = min(1.0, strength + 0.15)

        return {
            'detected': detected,
            'strength': strength,
            'direction': direction,
            'volume_confirmed': detected and self._volume_confirmed(volumes[-1], self._avg_volume(volumes)),
        }

    # ═══════════════════════════════════════════════════════════
    # TWO-CANDLE PATTERNS
    # ═══════════════════════════════════════════════════════════

    def detect_bullish_engulfing(self, o, h, l, c, o1, h1, l1, c1, closes, volumes) -> Dict:
        """
        Bullish Engulfing: bearish candle followed by larger bullish candle that engulfs it.
        Strong bullish reversal.
        """
        rng = self._range(h, l)
        rng1 = self._range(h1, l1)
        if rng < 1e-10 or rng1 < 1e-10:
            return {'detected': False, 'strength': 0, 'direction': 'BULLISH', 'volume_confirmed': False}

        prev_bearish = self._is_bearish(o1, c1)
        curr_bullish = self._is_bullish(o, c)
        body_curr = self._body(o, c)
        body_prev = self._body(o1, c1)

        detected = (
            prev_bearish and
            curr_bullish and
            body_curr > body_prev * self.ENGULF_MIN_RATIO and  # Current body is larger
            o <= c1 and  # Current open at or below prev close
            c >= o1 and  # Current close at or above prev open
            self._is_in_downtrend(closes)  # Must be in downtrend context
        )

        strength = 0.0
        if detected:
            engulf_ratio = body_curr / (body_prev + 1e-10)
            strength = min(1.0, 0.5 + engulf_ratio * 0.15)
            if self._volume_confirmed(volumes[-1], self._avg_volume(volumes)):
                strength = min(1.0, strength + 0.15)

        return {
            'detected': detected,
            'strength': strength,
            'direction': 'BULLISH',
            'volume_confirmed': detected and self._volume_confirmed(volumes[-1], self._avg_volume(volumes)),
        }

    def detect_bearish_engulfing(self, o, h, l, c, o1, h1, l1, c1, closes, volumes) -> Dict:
        """
        Bearish Engulfing: bullish candle followed by larger bearish candle.
        Strong bearish reversal.
        """
        rng = self._range(h, l)
        rng1 = self._range(h1, l1)
        if rng < 1e-10 or rng1 < 1e-10:
            return {'detected': False, 'strength': 0, 'direction': 'BEARISH', 'volume_confirmed': False}

        prev_bullish = self._is_bullish(o1, c1)
        curr_bearish = self._is_bearish(o, c)
        body_curr = self._body(o, c)
        body_prev = self._body(o1, c1)

        detected = (
            prev_bullish and
            curr_bearish and
            body_curr > body_prev * self.ENGULF_MIN_RATIO and
            o >= c1 and  # Current open at or above prev close
            c <= o1 and  # Current close at or below prev open
            self._is_in_uptrend(closes)
        )

        strength = 0.0
        if detected:
            engulf_ratio = body_curr / (body_prev + 1e-10)
            strength = min(1.0, 0.5 + engulf_ratio * 0.15)
            if self._volume_confirmed(volumes[-1], self._avg_volume(volumes)):
                strength = min(1.0, strength + 0.15)

        return {
            'detected': detected,
            'strength': strength,
            'direction': 'BEARISH',
            'volume_confirmed': detected and self._volume_confirmed(volumes[-1], self._avg_volume(volumes)),
        }

    def detect_harami(self, o, h, l, c, o1, h1, l1, c1, closes, volumes) -> Dict:
        """
        Harami: large candle followed by small candle contained within it.
        Reversal signal — direction opposite to the large candle.
        """
        body_curr = self._body(o, c)
        body_prev = self._body(o1, c1)

        if body_prev < 1e-10:
            return {'detected': False, 'strength': 0, 'direction': 'NEUTRAL', 'volume_confirmed': False}

        # Current body must be inside previous body
        curr_body_inside = (
            max(o, c) <= max(o1, c1) and
            min(o, c) >= min(o1, c1) and
            body_curr < body_prev * 0.6  # Current body significantly smaller
        )

        detected = curr_body_inside

        direction = 'NEUTRAL'
        if detected:
            if self._is_bearish(o1, c1):
                direction = 'BULLISH'  # Bearish then small = potential reversal up
            elif self._is_bullish(o1, c1):
                direction = 'BEARISH'  # Bullish then small = potential reversal down

        strength = 0.0
        if detected:
            containment = 1 - (body_curr / (body_prev + 1e-10))
            strength = min(1.0, 0.4 + containment * 0.4)

        return {
            'detected': detected,
            'strength': strength,
            'direction': direction,
            'volume_confirmed': detected and self._volume_confirmed(volumes[-1], self._avg_volume(volumes)),
        }

    def detect_inside_bar(self, o, h, l, c, o1, h1, l1, c1, closes, volumes) -> Dict:
        """
        Inside Bar: current candle's HIGH and LOW are both within previous candle.
        Consolidation / breakout setup. Direction is 'NEUTRAL' — breakout decides.
        """
        detected = (h <= h1 and l >= l1)

        strength = 0.0
        direction = 'NEUTRAL'
        if detected:
            # Strength based on how tight the inside bar is
            prev_range = h1 - l1
            curr_range = h - l
            if prev_range > 0:
                compression = 1 - (curr_range / prev_range)
                strength = min(1.0, 0.3 + compression * 0.5)

            # Bias: if body is directional, slight bias
            if self._is_bullish(o, c) and self._body_ratio(o, h, l, c) > 0.3:
                direction = 'BULLISH'
            elif self._is_bearish(o, c) and self._body_ratio(o, h, l, c) > 0.3:
                direction = 'BEARISH'

        return {
            'detected': detected,
            'strength': strength,
            'direction': direction,
            'volume_confirmed': False,  # Inside bars should have LOW volume
        }

    # ═══════════════════════════════════════════════════════════
    # THREE-CANDLE PATTERNS
    # ═══════════════════════════════════════════════════════════

    def detect_morning_star(self, o, h, l, c, o1, h1, l1, c1, o2, h2, l2, c2,
                            closes, volumes) -> Dict:
        """
        Morning Star: 3-candle bullish reversal.
        1) Large bearish candle
        2) Small body candle (gap down, star)
        3) Large bullish candle closing into candle 1's body
        """
        body0 = self._body(o, c)
        body1 = self._body(o1, c1)
        body2 = self._body(o2, c2)
        rng2 = self._range(h2, l2)

        if rng2 < 1e-10 or body2 < 1e-10:
            return {'detected': False, 'strength': 0, 'direction': 'BULLISH', 'volume_confirmed': False}

        detected = (
            self._is_bearish(o2, c2) and  # Candle 1 (oldest): bearish
            body2 / rng2 > self.LARGE_BODY_RATIO * 0.7 and  # Large body
            self._body_ratio(o1, h1, l1, c1) < self.SMALL_BODY_RATIO * 2 and  # Star: small body
            max(o1, c1) < c2 and  # Star body below candle 1 close (gap)
            self._is_bullish(o, c) and  # Candle 3 (newest): bullish
            c > (o2 + c2) / 2  # Candle 3 closes above midpoint of candle 1
        )

        strength = 0.0
        if detected:
            # Quality: how far candle 3 closes into candle 1
            penetration = (c - c2) / (body2 + 1e-10)
            strength = min(1.0, 0.5 + penetration * 0.3)
            if self._volume_confirmed(volumes[-1], self._avg_volume(volumes)):
                strength = min(1.0, strength + 0.15)

        return {
            'detected': detected,
            'strength': strength,
            'direction': 'BULLISH',
            'volume_confirmed': detected and self._volume_confirmed(volumes[-1], self._avg_volume(volumes)),
        }

    def detect_evening_star(self, o, h, l, c, o1, h1, l1, c1, o2, h2, l2, c2,
                            closes, volumes) -> Dict:
        """
        Evening Star: 3-candle bearish reversal (mirror of Morning Star).
        """
        body0 = self._body(o, c)
        body1 = self._body(o1, c1)
        body2 = self._body(o2, c2)
        rng2 = self._range(h2, l2)

        if rng2 < 1e-10 or body2 < 1e-10:
            return {'detected': False, 'strength': 0, 'direction': 'BEARISH', 'volume_confirmed': False}

        detected = (
            self._is_bullish(o2, c2) and  # Candle 1 (oldest): bullish
            body2 / rng2 > self.LARGE_BODY_RATIO * 0.7 and  # Large body
            self._body_ratio(o1, h1, l1, c1) < self.SMALL_BODY_RATIO * 2 and  # Star: small
            min(o1, c1) > c2 and  # Star body above candle 1 close (gap up)
            self._is_bearish(o, c) and  # Candle 3: bearish
            c < (o2 + c2) / 2  # Candle 3 closes below midpoint of candle 1
        )

        strength = 0.0
        if detected:
            penetration = (c2 - c) / (body2 + 1e-10)
            strength = min(1.0, 0.5 + penetration * 0.3)
            if self._volume_confirmed(volumes[-1], self._avg_volume(volumes)):
                strength = min(1.0, strength + 0.15)

        return {
            'detected': detected,
            'strength': strength,
            'direction': 'BEARISH',
            'volume_confirmed': detected and self._volume_confirmed(volumes[-1], self._avg_volume(volumes)),
        }

    def detect_three_white_soldiers(self, o, h, l, c, o1, h1, l1, c1, o2, h2, l2, c2,
                                     closes, volumes) -> Dict:
        """
        Three White Soldiers: 3 consecutive bullish candles with higher closes.
        Strong bullish continuation/reversal.
        """
        all_bullish = (
            self._is_bullish(o, c) and
            self._is_bullish(o1, c1) and
            self._is_bullish(o2, c2)
        )

        higher_closes = c > c1 > c2
        higher_opens = o > o1 > o2

        # Each candle should have a decent body (not doji-like)
        decent_bodies = (
            self._body_ratio(o, h, l, c) > self.SMALL_BODY_RATIO and
            self._body_ratio(o1, h1, l1, c1) > self.SMALL_BODY_RATIO and
            self._body_ratio(o2, h2, l2, c2) > self.SMALL_BODY_RATIO
        )

        # Each opens within previous body (not gap up)
        opens_in_prev = (
            o <= c1 and o >= o1 and
            o1 <= c2 and o1 >= o2
        )

        detected = all_bullish and higher_closes and decent_bodies and opens_in_prev

        strength = 0.0
        if detected:
            avg_body = (self._body_ratio(o, h, l, c) +
                       self._body_ratio(o1, h1, l1, c1) +
                       self._body_ratio(o2, h2, l2, c2)) / 3
            strength = min(1.0, 0.5 + avg_body * 0.5)

        return {
            'detected': detected,
            'strength': strength,
            'direction': 'BULLISH',
            'volume_confirmed': detected and self._volume_confirmed(volumes[-1], self._avg_volume(volumes)),
        }

    def detect_three_black_crows(self, o, h, l, c, o1, h1, l1, c1, o2, h2, l2, c2,
                                  closes, volumes) -> Dict:
        """
        Three Black Crows: 3 consecutive bearish candles with lower closes.
        Strong bearish continuation/reversal.
        """
        all_bearish = (
            self._is_bearish(o, c) and
            self._is_bearish(o1, c1) and
            self._is_bearish(o2, c2)
        )

        lower_closes = c < c1 < c2
        lower_opens = o < o1 < o2

        decent_bodies = (
            self._body_ratio(o, h, l, c) > self.SMALL_BODY_RATIO and
            self._body_ratio(o1, h1, l1, c1) > self.SMALL_BODY_RATIO and
            self._body_ratio(o2, h2, l2, c2) > self.SMALL_BODY_RATIO
        )

        opens_in_prev = (
            o >= c1 and o <= o1 and
            o1 >= c2 and o1 <= o2
        )

        detected = all_bearish and lower_closes and decent_bodies and opens_in_prev

        strength = 0.0
        if detected:
            avg_body = (self._body_ratio(o, h, l, c) +
                       self._body_ratio(o1, h1, l1, c1) +
                       self._body_ratio(o2, h2, l2, c2)) / 3
            strength = min(1.0, 0.5 + avg_body * 0.5)

        return {
            'detected': detected,
            'strength': strength,
            'direction': 'BEARISH',
            'volume_confirmed': detected and self._volume_confirmed(volumes[-1], self._avg_volume(volumes)),
        }

    # ═══════════════════════════════════════════════════════════
    # MAIN API: DETECT ALL PATTERNS
    # ═══════════════════════════════════════════════════════════

    def detect_all(self, df) -> List[Dict]:
        """
        Run all pattern detectors on the latest candle(s).
        
        Args:
            df: DataFrame with columns ['open', 'high', 'low', 'close', 'volume']
                Must have at least 12 rows for trend context.
        
        Returns:
            List of dicts for each detected pattern.
        """
        if len(df) < 12:
            return []

        opens = df['open'].values.astype(float)
        highs = df['high'].values.astype(float)
        lows = df['low'].values.astype(float)
        closes = df['close'].values.astype(float)
        volumes = df['volume'].values.astype(float)

        # Current candle (index -1)
        o, h, l, c = opens[-1], highs[-1], lows[-1], closes[-1]
        v = volumes[-1]

        # Previous candle (index -2)
        o1, h1, l1, c1 = opens[-2], highs[-2], lows[-2], closes[-2]

        # Two candles ago (index -3)
        o2, h2, l2, c2 = opens[-3], highs[-3], lows[-3], closes[-3]

        detected = []

        # Single-candle patterns
        for name, func in [
            ('hammer', lambda: self.detect_hammer(o, h, l, c, closes, volumes)),
            ('inverted_hammer', lambda: self.detect_inverted_hammer(o, h, l, c, closes, volumes)),
            ('hanging_man', lambda: self.detect_hanging_man(o, h, l, c, closes, volumes)),
            ('shooting_star', lambda: self.detect_shooting_star(o, h, l, c, closes, volumes)),
            ('doji', lambda: self.detect_doji(o, h, l, c, closes, volumes)),
            ('pin_bar', lambda: self.detect_pin_bar(o, h, l, c, closes, volumes)),
        ]:
            result = func()
            result['pattern'] = name
            if result['detected']:
                detected.append(result)

        # Two-candle patterns
        for name, func in [
            ('bullish_engulfing', lambda: self.detect_bullish_engulfing(
                o, h, l, c, o1, h1, l1, c1, closes, volumes)),
            ('bearish_engulfing', lambda: self.detect_bearish_engulfing(
                o, h, l, c, o1, h1, l1, c1, closes, volumes)),
            ('harami', lambda: self.detect_harami(
                o, h, l, c, o1, h1, l1, c1, closes, volumes)),
            ('inside_bar', lambda: self.detect_inside_bar(
                o, h, l, c, o1, h1, l1, c1, closes, volumes)),
        ]:
            result = func()
            result['pattern'] = name
            if result['detected']:
                detected.append(result)

        # Three-candle patterns
        for name, func in [
            ('morning_star', lambda: self.detect_morning_star(
                o, h, l, c, o1, h1, l1, c1, o2, h2, l2, c2, closes, volumes)),
            ('evening_star', lambda: self.detect_evening_star(
                o, h, l, c, o1, h1, l1, c1, o2, h2, l2, c2, closes, volumes)),
            ('three_white_soldiers', lambda: self.detect_three_white_soldiers(
                o, h, l, c, o1, h1, l1, c1, o2, h2, l2, c2, closes, volumes)),
            ('three_black_crows', lambda: self.detect_three_black_crows(
                o, h, l, c, o1, h1, l1, c1, o2, h2, l2, c2, closes, volumes)),
        ]:
            result = func()
            result['pattern'] = name
            if result['detected']:
                detected.append(result)

        return detected

    # ═══════════════════════════════════════════════════════════
    # ML FEATURE EXTRACTION
    # ═══════════════════════════════════════════════════════════

    def extract_features(self, df) -> Dict[str, float]:
        """
        Extract candlestick pattern features for ML model input.
        
        Returns dict with features:
          - cp_bullish_count: Number of bullish patterns detected
          - cp_bearish_count: Number of bearish patterns detected
          - cp_max_bullish_strength: Strongest bullish pattern strength
          - cp_max_bearish_strength: Strongest bearish pattern strength
          - cp_net_direction: Net direction score (-1 to +1)
          - cp_volume_confirmations: Number of volume-confirmed patterns
          - cp_engulfing: +1 bullish, -1 bearish, 0 none
          - cp_star: +1 morning star, -1 evening star, 0 none
          - cp_pin_or_hammer: 1 if hammer/pin bar bullish, -1 bearish, 0 none
          - cp_three_candle: +1 three soldiers, -1 three crows, 0 none
          - cp_composite_score: Weighted composite entry quality score (-1 to +1)
        """
        features = {
            'cp_bullish_count': 0,
            'cp_bearish_count': 0,
            'cp_max_bullish_strength': 0.0,
            'cp_max_bearish_strength': 0.0,
            'cp_net_direction': 0.0,
            'cp_volume_confirmations': 0,
            'cp_engulfing': 0.0,
            'cp_star': 0.0,
            'cp_pin_or_hammer': 0.0,
            'cp_three_candle': 0.0,
            'cp_composite_score': 0.0,
        }

        if len(df) < 12:
            return features

        detected = self.detect_all(df)

        bullish_total = 0.0
        bearish_total = 0.0

        for p in detected:
            strength = p['strength']
            vol_bonus = 0.15 if p['volume_confirmed'] else 0.0

            if p['direction'] == 'BULLISH':
                features['cp_bullish_count'] += 1
                features['cp_max_bullish_strength'] = max(
                    features['cp_max_bullish_strength'], strength)
                bullish_total += strength + vol_bonus
            elif p['direction'] == 'BEARISH':
                features['cp_bearish_count'] += 1
                features['cp_max_bearish_strength'] = max(
                    features['cp_max_bearish_strength'], strength)
                bearish_total += strength + vol_bonus

            if p['volume_confirmed']:
                features['cp_volume_confirmations'] += 1

            # Specific pattern features
            name = p['pattern']
            if name == 'bullish_engulfing':
                features['cp_engulfing'] = strength
            elif name == 'bearish_engulfing':
                features['cp_engulfing'] = -strength
            elif name == 'morning_star':
                features['cp_star'] = strength
            elif name == 'evening_star':
                features['cp_star'] = -strength
            elif name in ('hammer', 'inverted_hammer', 'pin_bar') and p['direction'] == 'BULLISH':
                features['cp_pin_or_hammer'] = max(features['cp_pin_or_hammer'], strength)
            elif name in ('hanging_man', 'shooting_star', 'pin_bar') and p['direction'] == 'BEARISH':
                features['cp_pin_or_hammer'] = min(features['cp_pin_or_hammer'], -strength)
            elif name == 'three_white_soldiers':
                features['cp_three_candle'] = strength
            elif name == 'three_black_crows':
                features['cp_three_candle'] = -strength

        # Net direction score
        total = bullish_total + bearish_total
        if total > 0:
            features['cp_net_direction'] = (bullish_total - bearish_total) / total
        
        # Composite entry quality score (weighted by pattern reliability)
        # Weights based on crypto backtesting literature:
        # Engulfing (0.30) > Star (0.25) > Pin/Hammer (0.20) > Three-candle (0.15) > Others (0.10)
        features['cp_composite_score'] = (
            features['cp_engulfing'] * 0.30 +
            features['cp_star'] * 0.25 +
            features['cp_pin_or_hammer'] * 0.20 +
            features['cp_three_candle'] * 0.15 +
            features['cp_net_direction'] * 0.10
        )

        return features


# ═══════════════════════════════════════════════════════════
# CLI: Test pattern detection on real data
# ═══════════════════════════════════════════════════════════

if __name__ == '__main__':
    import sys
    import os
    sys.path.insert(0, os.path.dirname(__file__))

    from fetch_historical import fetch_ohlcv

    print("=" * 60)
    print("CANDLE PATTERN ENGINE — Test on Real BTC Data")
    print("=" * 60)

    engine = CandlePatternEngine()

    for tf in ['15m', '1h', '4h']:
        print(f"\n{'='*40}")
        print(f"  Timeframe: {tf}")
        print(f"{'='*40}")

        df = fetch_ohlcv('BTC/USDT', tf, days=10)
        if df is None or len(df) < 20:
            print(f"  ⚠️ Could not fetch data for {tf}")
            continue

        # Scan last 100 candles for patterns
        total_detected = 0
        pattern_counts = {}

        for i in range(max(12, len(df) - 100), len(df)):
            window = df.iloc[:i+1]
            patterns = engine.detect_all(window)
            for p in patterns:
                name = p['pattern']
                total_detected += 1
                if name not in pattern_counts:
                    pattern_counts[name] = {'count': 0, 'bullish': 0, 'bearish': 0,
                                           'vol_confirmed': 0, 'avg_strength': []}
                pattern_counts[name]['count'] += 1
                if p['direction'] == 'BULLISH':
                    pattern_counts[name]['bullish'] += 1
                elif p['direction'] == 'BEARISH':
                    pattern_counts[name]['bearish'] += 1
                if p['volume_confirmed']:
                    pattern_counts[name]['vol_confirmed'] += 1
                pattern_counts[name]['avg_strength'].append(p['strength'])

        print(f"\n  Total patterns detected in last 100 candles: {total_detected}")
        print(f"\n  {'Pattern':<24} {'Count':>5} {'Bull':>5} {'Bear':>5} {'VolConf':>7} {'AvgStr':>7}")
        print(f"  {'-'*55}")
        for name, stats in sorted(pattern_counts.items(), key=lambda x: -x[1]['count']):
            avg_str = np.mean(stats['avg_strength']) if stats['avg_strength'] else 0
            print(f"  {name:<24} {stats['count']:>5} {stats['bullish']:>5} {stats['bearish']:>5} "
                  f"{stats['vol_confirmed']:>7} {avg_str:>7.3f}")

        # Current candle features
        features = engine.extract_features(df)
        print(f"\n  Current candle ML features:")
        for k, v in features.items():
            if v != 0:
                print(f"    {k}: {v:.4f}")
        if all(v == 0 for v in features.values()):
            print(f"    (No patterns on current candle)")

    print(f"\n{'='*60}")
    print("Pattern engine test complete.")

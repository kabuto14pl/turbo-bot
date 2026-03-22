'use strict';
/**
 * @module CandlePatterns
 * @description Candlestick pattern recognition for trade entry confirmation.
 * Port of ml-service/candle_patterns.py for real-time Node.js usage.
 *
 * PATCH #54: Candlestick Formation Engine
 * Provides pattern-based confirmation for strategy signals.
 * Key patterns: Engulfing, Hammer, Pin Bar, Doji, Morning/Evening Star
 *
 * Usage:
 *   const cp = new CandlePatterns();
 *   const patterns = cp.detectAll(candles);    // last 12+ candles
 *   const score = cp.getEntryScore(candles);   // composite -1 to +1
 *   const confirmed = cp.confirmsEntry(candles, 'BUY'); // true/false
 */

class CandlePatterns {
    constructor() {
        // Thresholds calibrated for BTC 15m/1h candles
        this.DOJI_BODY_RATIO = 0.05;
        this.SMALL_BODY_RATIO = 0.15;
        this.LARGE_BODY_RATIO = 0.60;
        this.SHADOW_LONG_RATIO = 0.45;  // Shadow > 45% of range
        this.PIN_BAR_TAIL_RATIO = 0.66;
        this.VOLUME_SPIKE_RATIO = 1.5;
        this.ENGULF_MIN_RATIO = 1.05;
    }

    // ═══════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════

    _body(o, c) { return Math.abs(c - o); }
    _range(h, l) { return h - l; }
    _upperShadow(o, h, c) { return h - Math.max(o, c); }
    _lowerShadow(o, l, c) { return Math.min(o, c) - l; }
    _isBullish(o, c) { return c > o; }
    _isBearish(o, c) { return c < o; }

    _bodyRatio(o, h, l, c) {
        const rng = h - l;
        return rng > 1e-10 ? Math.abs(c - o) / rng : 0;
    }

    _isInDowntrend(closes, lookback = 10) {
        if (closes.length < lookback + 1) return false;
        return closes[closes.length - 1] < closes[closes.length - 1 - lookback];
    }

    _isInUptrend(closes, lookback = 10) {
        if (closes.length < lookback + 1) return false;
        return closes[closes.length - 1] > closes[closes.length - 1 - lookback];
    }

    _avgVolume(volumes, period = 20) {
        if (volumes.length === 0) return 1;
        const slice = volumes.slice(-period);
        return slice.reduce((s, v) => s + v, 0) / slice.length;
    }

    _volumeConfirmed(currentVol, avgVol) {
        return currentVol > avgVol * this.VOLUME_SPIKE_RATIO;
    }

    // ═══════════════════════════════════════════════════════
    // SINGLE-CANDLE PATTERNS
    // ═══════════════════════════════════════════════════════

    detectHammer(o, h, l, c, closes, volumes) {
        const rng = this._range(h, l);
        if (rng < 1e-10) return null;
        const br = this._bodyRatio(o, h, l, c);
        const ls = this._lowerShadow(o, l, c) / rng;
        const us = this._upperShadow(o, h, c) / rng;

        if (br < this.SMALL_BODY_RATIO * 2 && ls > this.SHADOW_LONG_RATIO && us < 0.15 && this._isInDowntrend(closes)) {
            const strength = Math.min(1, ls * 1.2 + (1 - br) * 0.3);
            return { pattern: 'hammer', direction: 'BULLISH', strength, volumeConfirmed: this._volumeConfirmed(volumes[volumes.length - 1], this._avgVolume(volumes)) };
        }
        return null;
    }

    detectShootingStar(o, h, l, c, closes, volumes) {
        const rng = this._range(h, l);
        if (rng < 1e-10) return null;
        const br = this._bodyRatio(o, h, l, c);
        const us = this._upperShadow(o, h, c) / rng;
        const ls = this._lowerShadow(o, l, c) / rng;

        if (br < this.SMALL_BODY_RATIO * 2 && us > this.SHADOW_LONG_RATIO && ls < 0.15 && this._isInUptrend(closes)) {
            const strength = Math.min(1, us * 1.1 + (1 - br) * 0.25);
            return { pattern: 'shooting_star', direction: 'BEARISH', strength, volumeConfirmed: this._volumeConfirmed(volumes[volumes.length - 1], this._avgVolume(volumes)) };
        }
        return null;
    }

    detectDoji(o, h, l, c, closes) {
        const rng = this._range(h, l);
        if (rng < 1e-10) return null;
        const br = this._bodyRatio(o, h, l, c);

        if (br < this.DOJI_BODY_RATIO) {
            let direction = 'NEUTRAL';
            if (this._isInUptrend(closes)) direction = 'BEARISH';
            else if (this._isInDowntrend(closes)) direction = 'BULLISH';
            const strength = Math.min(1, (1 - br / this.DOJI_BODY_RATIO) * 0.7 + 0.3);
            return { pattern: 'doji', direction, strength, volumeConfirmed: false };
        }
        return null;
    }

    detectPinBar(o, h, l, c, closes, volumes) {
        const rng = this._range(h, l);
        if (rng < 1e-10) return null;
        const br = this._bodyRatio(o, h, l, c);
        const ls = this._lowerShadow(o, l, c) / rng;
        const us = this._upperShadow(o, h, c) / rng;

        // Bullish pin bar
        if (ls > this.PIN_BAR_TAIL_RATIO && br < this.SMALL_BODY_RATIO * 2 && us < 0.15 && this._isInDowntrend(closes)) {
            return { pattern: 'pin_bar', direction: 'BULLISH', strength: Math.min(1, ls * 1.3), volumeConfirmed: this._volumeConfirmed(volumes[volumes.length - 1], this._avgVolume(volumes)) };
        }
        // Bearish pin bar
        if (us > this.PIN_BAR_TAIL_RATIO && br < this.SMALL_BODY_RATIO * 2 && ls < 0.15 && this._isInUptrend(closes)) {
            return { pattern: 'pin_bar', direction: 'BEARISH', strength: Math.min(1, us * 1.3), volumeConfirmed: this._volumeConfirmed(volumes[volumes.length - 1], this._avgVolume(volumes)) };
        }
        return null;
    }

    // ═══════════════════════════════════════════════════════
    // TWO-CANDLE PATTERNS
    // ═══════════════════════════════════════════════════════

    detectBullishEngulfing(o, h, l, c, o1, h1, l1, c1, closes, volumes) {
        const bodyCurr = this._body(o, c);
        const bodyPrev = this._body(o1, c1);
        if (bodyPrev < 1e-10) return null;

        if (this._isBearish(o1, c1) && this._isBullish(o, c) &&
            bodyCurr > bodyPrev * this.ENGULF_MIN_RATIO &&
            o <= c1 && c >= o1 && this._isInDowntrend(closes)) {
            const ratio = bodyCurr / bodyPrev;
            const strength = Math.min(1, 0.5 + ratio * 0.15);
            return { pattern: 'bullish_engulfing', direction: 'BULLISH', strength, volumeConfirmed: this._volumeConfirmed(volumes[volumes.length - 1], this._avgVolume(volumes)) };
        }
        return null;
    }

    detectBearishEngulfing(o, h, l, c, o1, h1, l1, c1, closes, volumes) {
        const bodyCurr = this._body(o, c);
        const bodyPrev = this._body(o1, c1);
        if (bodyPrev < 1e-10) return null;

        if (this._isBullish(o1, c1) && this._isBearish(o, c) &&
            bodyCurr > bodyPrev * this.ENGULF_MIN_RATIO &&
            o >= c1 && c <= o1 && this._isInUptrend(closes)) {
            const ratio = bodyCurr / bodyPrev;
            const strength = Math.min(1, 0.5 + ratio * 0.15);
            return { pattern: 'bearish_engulfing', direction: 'BEARISH', strength, volumeConfirmed: this._volumeConfirmed(volumes[volumes.length - 1], this._avgVolume(volumes)) };
        }
        return null;
    }

    detectInsideBar(o, h, l, c, _o1, h1, l1, _c1) {
        if (h <= h1 && l >= l1) {
            const prevRange = h1 - l1;
            const currRange = h - l;
            let direction = 'NEUTRAL';
            if (this._isBullish(o, c) && this._bodyRatio(o, h, l, c) > 0.3) direction = 'BULLISH';
            else if (this._isBearish(o, c) && this._bodyRatio(o, h, l, c) > 0.3) direction = 'BEARISH';
            const compression = prevRange > 0 ? 1 - (currRange / prevRange) : 0;
            return { pattern: 'inside_bar', direction, strength: Math.min(1, 0.3 + compression * 0.5), volumeConfirmed: false };
        }
        return null;
    }

    // ═══════════════════════════════════════════════════════
    // THREE-CANDLE PATTERNS
    // ═══════════════════════════════════════════════════════

    detectMorningStar(o, h, l, c, o1, h1, l1, c1, o2, h2, l2, c2, closes, volumes) {
        const body2 = this._body(o2, c2);
        const rng2 = this._range(h2, l2);
        if (rng2 < 1e-10 || body2 < 1e-10) return null;

        if (this._isBearish(o2, c2) && body2 / rng2 > this.LARGE_BODY_RATIO * 0.7 &&
            this._bodyRatio(o1, h1, l1, c1) < this.SMALL_BODY_RATIO * 2 &&
            Math.max(o1, c1) < c2 &&
            this._isBullish(o, c) && c > (o2 + c2) / 2) {
            const penetration = (c - c2) / body2;
            return { pattern: 'morning_star', direction: 'BULLISH', strength: Math.min(1, 0.5 + penetration * 0.3), volumeConfirmed: this._volumeConfirmed(volumes[volumes.length - 1], this._avgVolume(volumes)) };
        }
        return null;
    }

    detectEveningStar(o, h, l, c, o1, h1, l1, c1, o2, h2, l2, c2, closes, volumes) {
        const body2 = this._body(o2, c2);
        const rng2 = this._range(h2, l2);
        if (rng2 < 1e-10 || body2 < 1e-10) return null;

        if (this._isBullish(o2, c2) && body2 / rng2 > this.LARGE_BODY_RATIO * 0.7 &&
            this._bodyRatio(o1, h1, l1, c1) < this.SMALL_BODY_RATIO * 2 &&
            Math.min(o1, c1) > c2 &&
            this._isBearish(o, c) && c < (o2 + c2) / 2) {
            const penetration = (c2 - c) / body2;
            return { pattern: 'evening_star', direction: 'BEARISH', strength: Math.min(1, 0.5 + penetration * 0.3), volumeConfirmed: this._volumeConfirmed(volumes[volumes.length - 1], this._avgVolume(volumes)) };
        }
        return null;
    }

    // ═══════════════════════════════════════════════════════
    // MAIN API
    // ═══════════════════════════════════════════════════════

    /**
     * Detect all patterns on the latest candle(s).
     * @param {Array} candles - Array of {open, high, low, close, volume} (min 12)
     * @returns {Array} Detected patterns with direction, strength, volumeConfirmed
     */
    detectAll(candles) {
        if (!candles || candles.length < 12) return [];

        const closes = candles.map(c => c.close || c.c);
        const volumes = candles.map(c => c.volume || c.v || 0);

        const curr = candles[candles.length - 1];
        const prev = candles[candles.length - 2];
        const prev2 = candles[candles.length - 3];

        const o = curr.open || curr.o, h = curr.high || curr.h, l = curr.low || curr.l, c = curr.close || curr.c;
        const o1 = prev.open || prev.o, h1 = prev.high || prev.h, l1 = prev.low || prev.l, c1 = prev.close || prev.c;
        const o2 = prev2.open || prev2.o, h2 = prev2.high || prev2.h, l2 = prev2.low || prev2.l, c2 = prev2.close || prev2.c;

        const detected = [];

        // Single-candle
        const patterns1 = [
            this.detectHammer(o, h, l, c, closes, volumes),
            this.detectShootingStar(o, h, l, c, closes, volumes),
            this.detectDoji(o, h, l, c, closes),
            this.detectPinBar(o, h, l, c, closes, volumes),
        ];

        // Two-candle
        const patterns2 = [
            this.detectBullishEngulfing(o, h, l, c, o1, h1, l1, c1, closes, volumes),
            this.detectBearishEngulfing(o, h, l, c, o1, h1, l1, c1, closes, volumes),
            this.detectInsideBar(o, h, l, c, o1, h1, l1, c1),
        ];

        // Three-candle
        const patterns3 = [
            this.detectMorningStar(o, h, l, c, o1, h1, l1, c1, o2, h2, l2, c2, closes, volumes),
            this.detectEveningStar(o, h, l, c, o1, h1, l1, c1, o2, h2, l2, c2, closes, volumes),
        ];

        for (const p of [...patterns1, ...patterns2, ...patterns3]) {
            if (p) detected.push(p);
        }

        return detected;
    }

    /**
     * Get composite entry quality score.
     * @param {Array} candles - OHLCV candles (min 12)
     * @returns {number} Score from -1 (strong bearish) to +1 (strong bullish)
     */
    getEntryScore(candles) {
        const patterns = this.detectAll(candles);
        if (patterns.length === 0) return 0;

        let bullishTotal = 0, bearishTotal = 0;
        const weights = {
            'bullish_engulfing': 0.30, 'bearish_engulfing': 0.30,
            'morning_star': 0.25, 'evening_star': 0.25,
            'hammer': 0.20, 'shooting_star': 0.20, 'pin_bar': 0.20,
            'doji': 0.10, 'inside_bar': 0.05,
        };

        for (const p of patterns) {
            const w = weights[p.pattern] || 0.10;
            const bonus = p.volumeConfirmed ? 0.15 : 0;
            if (p.direction === 'BULLISH') bullishTotal += (p.strength + bonus) * w;
            else if (p.direction === 'BEARISH') bearishTotal += (p.strength + bonus) * w;
        }

        const total = bullishTotal + bearishTotal;
        if (total === 0) return 0;
        return (bullishTotal - bearishTotal) / Math.max(total, 0.01);
    }

    /**
     * Check if candle patterns confirm a directional entry.
     * Used by strategies for entry timing confirmation.
     *
     * @param {Array} candles - OHLCV candle array (min 12)
     * @param {string} direction - 'BUY' or 'SELL'
     * @param {number} minStrength - Minimum pattern strength to confirm (default 0.40)
     * @returns {{ confirmed: boolean, score: number, patterns: Array, boost: number }}
     */
    confirmsEntry(candles, direction, minStrength = 0.40) {
        const patterns = this.detectAll(candles);
        const score = this.getEntryScore(candles);

        const alignedDir = direction === 'BUY' ? 'BULLISH' : 'BEARISH';
        const oppositeDir = direction === 'BUY' ? 'BEARISH' : 'BULLISH';

        // Find patterns that align with the desired direction
        const aligned = patterns.filter(p => p.direction === alignedDir && p.strength >= minStrength);
        const opposing = patterns.filter(p => p.direction === oppositeDir && p.strength >= minStrength);

        // Confirmation: at least 1 aligned pattern AND no strong opposing
        const confirmed = aligned.length > 0 && opposing.length === 0;

        // Boost: how much confidence to add (0 to 0.15)
        let boost = 0;
        if (confirmed) {
            const maxStrength = Math.max(...aligned.map(p => p.strength));
            const hasVolConf = aligned.some(p => p.volumeConfirmed);
            boost = maxStrength * 0.10 + (hasVolConf ? 0.05 : 0);
        } else if (opposing.length > 0) {
            // Negative boost: patterns oppose the signal
            const maxOpp = Math.max(...opposing.map(p => p.strength));
            boost = -maxOpp * 0.08;
        }

        return {
            confirmed,
            score,
            boost: Math.max(-0.15, Math.min(0.15, boost)),
            patterns: patterns.map(p => p.pattern + ':' + p.direction),
            patternsCount: patterns.length,
        };
    }
}

module.exports = { CandlePatterns };

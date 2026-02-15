'use strict';
/**
 * @module MTFConfluence
 * @description Professional Multi-Timeframe Confluence Engine.
 *
 * PATCH #22: Top-Down Analysis
 *   D1 = Strategic direction (primary bias, weight 40%)
 *   H4 = Tactical confirmation (intermediate, weight 35%)
 *   H1 = Immediate context (recency, weight 25%)
 *   M15 = Execution timeframe only (not analyzed here)
 *
 * Output: MTF Bias Score (-100 to +100) + Trade Permission
 *   +100 = Strong BULLISH confluence (all TFs aligned up)
 *   -100 = Strong BEARISH confluence (all TFs aligned down)
 *   0    = NEUTRAL / Mixed (no clear bias)
 *
 * Pro-Trading Rules:
 *   1. NEVER trade against D1+H4 consensus
 *   2. H1 divergence = caution, reduce confidence
 *   3. All 3 aligned = maximum confidence boost
 *   4. All 3 conflict = HOLD ONLY, no trades
 */

const ind = require('./indicators');

class MTFConfluence {
    constructor() {
        this.lastBias = null;
        this.biasHistory = [];
        this.maxHistory = 50;
        // Weights: D1 heaviest (strategic), H4 medium, H1 lightest
        this.weights = { d1: 0.40, h4: 0.35, h1: 0.25 };
    }

    /**
     * Analyze a single timeframe and return trend assessment
     * @param {Array} candles - OHLCV candles for this timeframe
     * @param {string} tfName - Timeframe name (d1/h4/h1)
     * @returns {object} { direction: 'BULL'|'BEAR'|'NEUTRAL', strength: 0-100, details }
     */
    analyzeTF(candles, tfName) {
        if (!candles || candles.length < 30) {
            return { direction: 'NEUTRAL', strength: 0, details: { reason: 'insufficient_data' } };
        }

        const prices = candles.map(c => c.close);
        const latest = prices[prices.length - 1];

        // EMA Stack Analysis (most reliable trend indicator)
        const ema9 = ind.calculateEMA(prices, 9);
        const ema21 = ind.calculateEMA(prices, 21);
        const ema50 = ind.calculateEMA(prices, 50);
        let ema200 = null;
        if (prices.length >= 200) {
            ema200 = ind.calculateEMA(prices, 200);
        }

        // RSI for momentum context
        const rsi = ind.calculateRSI(prices, 14);

        // ADX for trend strength
        const adx = ind.calculateRealADX(candles, 14);

        // ATR for volatility context
        const atr = ind.calculateATR(candles, 14);

        // ROC for momentum direction
        const roc = ind.calculateROC(prices, 10);

        // ===== SCORING SYSTEM =====
        let bullScore = 0;
        let bearScore = 0;

        // 1. EMA Stack (0-35 points) - Most important
        // Perfect bull stack: Price > EMA9 > EMA21 > EMA50 (> EMA200)
        if (latest > ema9) bullScore += 6; else bearScore += 6;
        if (latest > ema21) bullScore += 6; else bearScore += 6;
        if (latest > ema50) bullScore += 8; else bearScore += 8;
        if (ema9 > ema21) bullScore += 5; else bearScore += 5;
        if (ema21 > ema50) bullScore += 5; else bearScore += 5;
        if (ema200 !== null) {
            if (latest > ema200) bullScore += 5; else bearScore += 5;
        }

        // 2. Momentum (0-25 points)
        // RSI zones
        if (rsi > 55 && rsi < 80) bullScore += 10;
        else if (rsi < 45 && rsi > 20) bearScore += 10;
        else if (rsi >= 80) { bearScore += 5; } // Overbought caution
        else if (rsi <= 20) { bullScore += 5; } // Oversold bounce potential

        // ROC momentum
        if (roc > 0.5) bullScore += 8;
        else if (roc > 0) bullScore += 4;
        else if (roc < -0.5) bearScore += 8;
        else if (roc < 0) bearScore += 4;

        // ADX trend strength bonus (only adds if trend exists)
        if (adx > 25) {
            // Strong trend - amplify whichever direction leads
            var amplify = Math.min(7, (adx - 25) / 5);
            if (bullScore > bearScore) bullScore += amplify;
            else if (bearScore > bullScore) bearScore += amplify;
        }

        // 3. Price action relative to key EMAs (0-10 points)
        var distFromEma50 = ((latest - ema50) / ema50) * 100;
        if (distFromEma50 > 1) bullScore += 5;
        else if (distFromEma50 < -1) bearScore += 5;

        // EMA slope (direction of EMA21)
        if (prices.length >= 25) {
            var ema21prev = ind.calculateEMA(prices.slice(0, -3), 21);
            if (ema21 > ema21prev) bullScore += 5;
            else if (ema21 < ema21prev) bearScore += 5;
        }

        // ===== FINAL DIRECTION =====
        var totalScore = bullScore + bearScore;
        var maxScore = Math.max(bullScore, bearScore, 1);
        var dominance = maxScore / Math.max(totalScore, 1);

        var direction = 'NEUTRAL';
        var strength = 0;

        if (bullScore > bearScore && dominance > 0.55) {
            direction = 'BULL';
            strength = Math.min(100, Math.round((bullScore / Math.max(totalScore, 1)) * 100));
        } else if (bearScore > bullScore && dominance > 0.55) {
            direction = 'BEAR';
            strength = Math.min(100, Math.round((bearScore / Math.max(totalScore, 1)) * 100));
        } else {
            direction = 'NEUTRAL';
            strength = Math.round(50 - Math.abs(bullScore - bearScore));
        }

        return {
            direction,
            strength,
            details: {
                bullScore, bearScore, dominance: dominance.toFixed(3),
                ema: { ema9, ema21, ema50, ema200, stack: this._emaStackLabel(latest, ema9, ema21, ema50) },
                rsi, adx, roc: roc.toFixed(3), atr,
                price: latest,
            }
        };
    }

    _emaStackLabel(price, e9, e21, e50) {
        if (price > e9 && e9 > e21 && e21 > e50) return 'PERFECT_BULL';
        if (price < e9 && e9 < e21 && e21 < e50) return 'PERFECT_BEAR';
        if (price > e21 && e21 > e50) return 'BULL';
        if (price < e21 && e21 < e50) return 'BEAR';
        return 'MIXED';
    }

    /**
     * Compute composite MTF bias from all timeframes
     * @param {object} cachedTfData - { d1, h4, h1 } candle arrays from data-pipeline
     * @returns {object} MTF Bias result
     */
    computeBias(cachedTfData) {
        var d1Analysis = this.analyzeTF(cachedTfData.d1, 'd1');
        var h4Analysis = this.analyzeTF(cachedTfData.h4, 'h4');
        var h1Analysis = this.analyzeTF(cachedTfData.h1, 'h1');

        // Convert direction to numeric: BULL=+1, BEAR=-1, NEUTRAL=0
        var dirToNum = function(d) { return d === 'BULL' ? 1 : (d === 'BEAR' ? -1 : 0); };
        var d1Dir = dirToNum(d1Analysis.direction);
        var h4Dir = dirToNum(h4Analysis.direction);
        var h1Dir = dirToNum(h1Analysis.direction);

        // Weighted composite score
        var rawScore = (d1Dir * d1Analysis.strength * this.weights.d1) +
                       (h4Dir * h4Analysis.strength * this.weights.h4) +
                       (h1Dir * h1Analysis.strength * this.weights.h1);

        // Clamp to -100..+100
        var biasScore = Math.max(-100, Math.min(100, Math.round(rawScore)));

        // Confluence assessment
        var allBull = d1Dir > 0 && h4Dir > 0 && h1Dir > 0;
        var allBear = d1Dir < 0 && h4Dir < 0 && h1Dir < 0;
        var d1h4Agree = d1Dir === h4Dir && d1Dir !== 0;
        var anyConflict = (d1Dir > 0 && h4Dir < 0) || (d1Dir < 0 && h4Dir > 0);

        // Determine trade permission
        var tradePermission = 'BOTH'; // Allow BUY and SELL
        var confidenceMultiplier = 1.0;
        var reason = '';

        if (allBull) {
            tradePermission = 'LONG_ONLY';
            confidenceMultiplier = 1.25; // 25% boost for full alignment
            reason = 'ALL_TF_BULLISH';
        } else if (allBear) {
            tradePermission = 'SHORT_ONLY';
            confidenceMultiplier = 1.25;
            reason = 'ALL_TF_BEARISH';
        } else if (d1h4Agree && d1Dir > 0) {
            tradePermission = 'PREFER_LONG';
            confidenceMultiplier = h1Dir >= 0 ? 1.15 : 0.85; // H1 divergence = caution
            reason = 'D1_H4_BULLISH' + (h1Dir < 0 ? '_H1_DIVERGENT' : '');
        } else if (d1h4Agree && d1Dir < 0) {
            tradePermission = 'PREFER_SHORT';
            confidenceMultiplier = h1Dir <= 0 ? 1.15 : 0.85;
            reason = 'D1_H4_BEARISH' + (h1Dir > 0 ? '_H1_DIVERGENT' : '');
        } else if (anyConflict) {
            tradePermission = 'CAUTION';
            confidenceMultiplier = 0.6; // 40% penalty for D1/H4 conflict
            reason = 'D1_H4_CONFLICT';
        } else {
            tradePermission = 'BOTH';
            confidenceMultiplier = 0.9;
            reason = 'MIXED_SIGNALS';
        }

        var bias = {
            score: biasScore,
            direction: biasScore > 15 ? 'BULLISH' : (biasScore < -15 ? 'BEARISH' : 'NEUTRAL'),
            tradePermission: tradePermission,
            confidenceMultiplier: confidenceMultiplier,
            reason: reason,
            confluence: {
                allAligned: allBull || allBear,
                d1h4Agree: d1h4Agree,
                anyConflict: anyConflict,
            },
            timeframes: {
                d1: { direction: d1Analysis.direction, strength: d1Analysis.strength,
                      emaStack: (d1Analysis.details.ema && d1Analysis.details.ema.stack) || 'N/A', rsi: d1Analysis.details.rsi, adx: d1Analysis.details.adx },
                h4: { direction: h4Analysis.direction, strength: h4Analysis.strength,
                      emaStack: (h4Analysis.details.ema && h4Analysis.details.ema.stack) || 'N/A', rsi: h4Analysis.details.rsi, adx: h4Analysis.details.adx },
                h1: { direction: h1Analysis.direction, strength: h1Analysis.strength,
                      emaStack: (h1Analysis.details.ema && h1Analysis.details.ema.stack) || 'N/A', rsi: h1Analysis.details.rsi, adx: h1Analysis.details.adx },
            },
            timestamp: Date.now(),
        };

        // Cache bias
        this.lastBias = bias;
        this.biasHistory.push(bias);
        if (this.biasHistory.length > this.maxHistory) {
            this.biasHistory = this.biasHistory.slice(-this.maxHistory);
        }

        return bias;
    }

    /**
     * Check if a proposed trade action is permitted by MTF bias
     * @param {string} action - 'BUY' or 'SELL'
     * @param {number} confidence - Original confidence 0-1
     * @returns {object} { allowed, adjustedConfidence, reason }
     */
    filterSignal(action, confidence) {
        if (!this.lastBias) {
            return { allowed: true, adjustedConfidence: confidence, reason: 'NO_MTF_DATA' };
        }

        var bias = this.lastBias;
        var allowed = true;
        var adjConf = confidence;
        var reason = '';

        if (action === 'BUY') {
            if (bias.tradePermission === 'SHORT_ONLY') {
                allowed = false;
                reason = 'BUY_BLOCKED_ALL_TF_BEARISH';
            } else if (bias.tradePermission === 'PREFER_SHORT') {
                adjConf *= 0.5; // Heavy penalty for counter-trend
                reason = 'BUY_PENALIZED_BEAR_BIAS';
                if (adjConf < 0.3) { allowed = false; reason = 'BUY_BLOCKED_LOW_CONF_BEAR_BIAS'; }
            } else if (bias.tradePermission === 'CAUTION') {
                adjConf *= bias.confidenceMultiplier;
                reason = 'BUY_CAUTION_D1H4_CONFLICT';
            } else if (bias.tradePermission === 'LONG_ONLY' || bias.tradePermission === 'PREFER_LONG') {
                adjConf *= bias.confidenceMultiplier; // Boost
                reason = 'BUY_BOOSTED_BULL_BIAS';
            }
        } else if (action === 'SELL') {
            if (bias.tradePermission === 'LONG_ONLY') {
                allowed = false;
                reason = 'SELL_BLOCKED_ALL_TF_BULLISH';
            } else if (bias.tradePermission === 'PREFER_LONG') {
                adjConf *= 0.5;
                reason = 'SELL_PENALIZED_BULL_BIAS';
                if (adjConf < 0.3) { allowed = false; reason = 'SELL_BLOCKED_LOW_CONF_BULL_BIAS'; }
            } else if (bias.tradePermission === 'CAUTION') {
                adjConf *= bias.confidenceMultiplier;
                reason = 'SELL_CAUTION_D1H4_CONFLICT';
            } else if (bias.tradePermission === 'SHORT_ONLY' || bias.tradePermission === 'PREFER_SHORT') {
                adjConf *= bias.confidenceMultiplier;
                reason = 'SELL_BOOSTED_BEAR_BIAS';
            }
        }

        // Clamp confidence
        adjConf = Math.max(0, Math.min(0.95, adjConf));

        return { allowed: allowed, adjustedConfidence: adjConf, reason: reason };
    }

    /** Get last computed bias (for logging) */
    getLastBias() { return this.lastBias; }

    /** Get bias history */
    getBiasHistory() { return this.biasHistory; }
}

module.exports = { MTFConfluence };

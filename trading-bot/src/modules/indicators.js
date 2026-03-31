'use strict';
/**
 * @module Indicators
 * @description Pure, stateless technical analysis functions.
 * No side effects. Easily unit-testable.
 */

function calculateSMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
}

function calculateRSI(prices, period) {
    if (prices.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) gains += change;
        else losses -= change;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateMACD(prices) {
    if (prices.length < 26) return { macd: 0, signal: 0, histogram: 0 };
    const m12 = 2 / 13, m26 = 2 / 27;
    let ema12 = prices[0], ema26 = prices[0];
    const macdLine = [];
    for (let i = 1; i < prices.length; i++) {
        ema12 = prices[i] * m12 + ema12 * (1 - m12);
        ema26 = prices[i] * m26 + ema26 * (1 - m26);
        if (i >= 25) macdLine.push(ema12 - ema26);
    }
    const macd = macdLine[macdLine.length - 1] || 0;
    let signal = macd;
    if (macdLine.length >= 9) signal = calculateEMA(macdLine, 9);
    return { macd, signal, histogram: macd - signal };
}

function calculateEMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    const m = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
        ema = prices[i] * m + ema * (1 - m);
    }
    return ema;
}

function calculateROC(prices, period) {
    if (period === undefined) period = 10;
    if (prices.length < period + 1) return 0;
    const current = prices[prices.length - 1];
    const previous = prices[prices.length - 1 - period];
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
}

function calculateATR(marketData, period) {
    if (period === undefined) period = 14;
    if (marketData.length < period + 1) {
        const lat = marketData[marketData.length - 1];
        return lat.high - lat.low;
    }
    const tr = [];
    for (let i = 1; i < marketData.length; i++) {
        const c = marketData[i], p = marketData[i - 1];
        tr.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
    }
    if (tr.length < period) return tr.reduce((a, b) => a + b, 0) / tr.length;
    const m = 2 / (period + 1);
    let atr = tr[0];
    for (let i = 1; i < tr.length; i++) atr = tr[i] * m + atr * (1 - m);
    return atr;
}

function calculateRealADX(marketData, period) {
    if (period === undefined) period = 14;
    if (!marketData || marketData.length < period + 1) return 25;
    const plusDM = [], minusDM = [], tr = [];
    for (let i = 1; i < marketData.length; i++) {
        const c = marketData[i], p = marketData[i - 1];
        const h = c.high || c.close * 1.005, l = c.low || c.close * 0.995;
        const ph = p.high || p.close * 1.005, pl = p.low || p.close * 0.995;
        tr.push(Math.max(h - l, Math.abs(h - p.close), Math.abs(l - p.close)));
        const up = h - ph, dn = pl - l;
        plusDM.push(up > dn && up > 0 ? up : 0);
        minusDM.push(dn > up && dn > 0 ? dn : 0);
    }
    if (tr.length < period) return 25;
    const smooth = (arr, p) => {
        let s = arr.slice(0, p).reduce((a, b) => a + b, 0);
        const r = [s];
        for (let i = p; i < arr.length; i++) { s = s - s / p + arr[i]; r.push(s); }
        return r;
    };
    const sTR = smooth(tr, period), sPD = smooth(plusDM, period), sMD = smooth(minusDM, period);
    const dx = [];
    for (let i = 0; i < sTR.length; i++) {
        if (sTR[i] === 0) { dx.push(0); continue; }
        const pdi = (sPD[i] / sTR[i]) * 100, mdi = (sMD[i] / sTR[i]) * 100;
        const sum = pdi + mdi;
        dx.push(sum > 0 ? (Math.abs(pdi - mdi) / sum) * 100 : 0);
    }
    if (dx.length < period) return 25;
    let adx = dx.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < dx.length; i++) adx = ((adx * (period - 1)) + dx[i]) / period;
    return Math.min(100, Math.max(0, adx));
}

function calculateBollingerBands(prices, period) {
    const sma = calculateSMA(prices, period);
    const variance = prices.slice(-period).reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / period;
    const std = Math.sqrt(variance);
    return { upper: sma + std * 2, middle: sma, lower: sma - std * 2 };
}

function calculateVolumeProfile(volumes) {
    if (volumes.length < 20) return 1;
    const avg = calculateSMA(volumes, 20);
    return volumes[volumes.length - 1] / avg;
}

function calculateCurrentVolatility(marketDataHistory, lookback) {
    if (lookback === undefined) lookback = 20;
    if (!marketDataHistory || marketDataHistory.length < lookback) return 0.01;
    const prices = marketDataHistory.slice(-lookback).map(d => d.close);
    const rets = [];
    for (let i = 1; i < prices.length; i++) rets.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance = rets.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / rets.length;
    return Math.sqrt(variance);
}

/**
 * P#216: Real SuperTrend indicator (replaces fake EMA50 proxy).
 * Uses Wilder ATR with upper/lower bands and direction tracking.
 * @param {Array} marketData — candles with {high, low, close}
 * @param {number} [period=10] — ATR period
 * @param {number} [multiplier=3] — ATR multiplier for bands
 * @returns {{value: number, direction: string}} — current SuperTrend value and 'buy'/'sell'
 */
function calculateSuperTrend(marketData, period, multiplier) {
    if (period === undefined) period = 10;
    if (multiplier === undefined) multiplier = 3;
    if (!marketData || marketData.length < period + 1) {
        const last = marketData && marketData.length > 0 ? marketData[marketData.length - 1] : null;
        const c = last ? last.close : 0;
        return { value: c, direction: 'buy' };
    }

    // Calculate ATR series using Wilder smoothing
    const tr = [];
    for (let i = 1; i < marketData.length; i++) {
        const cur = marketData[i], prev = marketData[i - 1];
        const h = cur.high || cur.close, l = cur.low || cur.close;
        tr.push(Math.max(h - l, Math.abs(h - prev.close), Math.abs(l - prev.close)));
    }

    // Wilder ATR (not EMA — uses 1/period smoothing)
    const atrArr = [tr.slice(0, period).reduce((a, b) => a + b, 0) / period];
    for (let i = period; i < tr.length; i++) {
        atrArr.push((atrArr[atrArr.length - 1] * (period - 1) + tr[i]) / period);
    }

    // SuperTrend calculation with direction flipping
    let direction = 1; // 1 = uptrend (buy), -1 = downtrend (sell)
    let superTrend = 0;
    let prevUpperBand = 0, prevLowerBand = 0;

    for (let i = period; i < marketData.length; i++) {
        const atrIdx = i - period;
        if (atrIdx >= atrArr.length) break;
        const atr = atrArr[atrIdx];
        const c = marketData[i];
        const h = c.high || c.close, l = c.low || c.close;
        const hl2 = (h + l) / 2;

        let upperBand = hl2 + multiplier * atr;
        let lowerBand = hl2 - multiplier * atr;

        // Band continuity: bands can only tighten, not widen against direction
        if (prevLowerBand > 0 && lowerBand < prevLowerBand && marketData[i - 1].close > prevLowerBand) {
            lowerBand = prevLowerBand;
        }
        if (prevUpperBand > 0 && upperBand > prevUpperBand && marketData[i - 1].close < prevUpperBand) {
            upperBand = prevUpperBand;
        }

        // Direction logic
        if (direction === 1) {
            superTrend = lowerBand;
            if (c.close < lowerBand) {
                direction = -1;
                superTrend = upperBand;
            }
        } else {
            superTrend = upperBand;
            if (c.close > upperBand) {
                direction = 1;
                superTrend = lowerBand;
            }
        }

        prevUpperBand = upperBand;
        prevLowerBand = lowerBand;
    }

    return { value: superTrend, direction: direction === 1 ? 'buy' : 'sell' };
}

module.exports = {
    calculateSMA, calculateRSI, calculateMACD, calculateEMA, calculateROC,
    calculateATR, calculateRealADX, calculateBollingerBands, calculateVolumeProfile,
    calculateCurrentVolatility, calculateSuperTrend,
};

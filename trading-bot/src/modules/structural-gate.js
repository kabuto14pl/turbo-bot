'use strict';

const ind = require('./indicators');

const STRUCTURAL_GATE_SETTINGS = {
    minHistory: 30,
    srWeight: 0.35,
    volumeWeight: 0.25,
    mtfWeight: 0.40,
    gateMinScore: 0.30,
    boostThreshold: 0.65,
};

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getCurrentCandle(history) {
    return history && history.length > 0 ? history[history.length - 1] : null;
}

function getCloseArray(history) {
    return (history || []).map((candle) => candle.close || 0);
}

function getVolumeArray(history) {
    return (history || []).map((candle) => candle.volume || 0);
}

function inferRoundStep(close) {
    if (close >= 10000) return 1000;
    if (close >= 1000) return 100;
    if (close >= 100) return 10;
    if (close >= 10) return 1;
    if (close >= 1) return 0.1;
    return 0.01;
}

function calculateCurrentIndicators(history) {
    const current = getCurrentCandle(history);
    const closes = getCloseArray(history);
    const volumes = getVolumeArray(history);
    const close = current ? current.close || 0 : 0;
    const atr = history && history.length >= 15
        ? ind.calculateATR(history, 14)
        : Math.max(close * 0.01, 1e-9);
    const ema21 = ind.calculateEMA(closes, 21);
    const ema50 = ind.calculateEMA(closes, 50);
    const ema200 = ind.calculateEMA(closes, 200);
    const sma200 = ind.calculateSMA(closes, 200);
    const adx = ind.calculateRealADX(history, 14);
    const avgVolume = volumes.length >= 20
        ? volumes.slice(-20).reduce((sum, value) => sum + value, 0) / 20
        : (volumes[volumes.length - 1] || 0);
    const volumeRatio = avgVolume > 0
        ? (volumes[volumes.length - 1] || 0) / avgVolume
        : 1.0;

    return {
        close,
        atr,
        ema21,
        ema50,
        ema200,
        sma200,
        adx,
        volumeRatio,
    };
}

function calculateSrLevels(history, close) {
    const supports = [];
    const resistances = [];
    const candles = history || [];

    if (candles.length >= 20) {
        const pivotSlice = candles.slice(-Math.min(96, candles.length));
        const highs = pivotSlice.map((candle) => candle.high || candle.close || 0);
        const lows = pivotSlice.map((candle) => candle.low || candle.close || 0);
        const dayHigh = Math.max(...highs);
        const dayLow = Math.min(...lows);
        const dayClose = pivotSlice[pivotSlice.length - 1].close || close;

        const pivot = (dayHigh + dayLow + dayClose) / 3;
        const r1 = 2 * pivot - dayLow;
        const s1 = 2 * pivot - dayHigh;
        const r2 = pivot + (dayHigh - dayLow);
        const s2 = pivot - (dayHigh - dayLow);

        for (const level of [s2, s1, pivot]) {
            if (level < close) supports.push(level);
            else resistances.push(level);
        }
        for (const level of [r1, r2]) {
            if (level > close) resistances.push(level);
            else supports.push(level);
        }
    }

    if (candles.length >= 50) {
        const fibSlice = candles.slice(-Math.min(100, candles.length));
        const highs = fibSlice.map((candle) => candle.high || candle.close || 0);
        const lows = fibSlice.map((candle) => candle.low || candle.close || 0);
        const swingHigh = Math.max(...highs);
        const swingLow = Math.min(...lows);
        const fibRange = swingHigh - swingLow;

        if (fibRange > 0) {
            const fibRatios = [0.236, 0.382, 0.5, 0.618, 0.786];
            for (const ratio of fibRatios) {
                const level = swingHigh - ratio * fibRange;
                if (level < close) supports.push(level);
                else resistances.push(level);
            }
        }
    }

    const step = inferRoundStep(close);
    const base = Math.floor(close / step) * step;
    for (const level of [base - step, base, base + step, base + step * 2]) {
        if (level <= 0) continue;
        if (level < close) supports.push(level);
        else if (level > close) resistances.push(level);
    }

    return {
        supports: Array.from(new Set(supports)).sort((a, b) => b - a).slice(0, 5),
        resistances: Array.from(new Set(resistances)).sort((a, b) => a - b).slice(0, 5),
    };
}

function evaluateSr(action, indicators, history) {
    const reasons = [];
    const close = indicators.close;
    const atr = indicators.atr;
    const levels = calculateSrLevels(history, close);

    if (levels.supports.length === 0 && levels.resistances.length === 0) {
        return { score: 0.5, reasons: ['S/R: no levels found'] };
    }

    let score = 0.5;
    const nearestSupport = levels.supports.length > 0 ? levels.supports[0] : null;
    const nearestResistance = levels.resistances.length > 0 ? levels.resistances[0] : null;

    if (action === 'BUY') {
        if (nearestSupport && Math.abs(close - nearestSupport) < 1.5 * atr) {
            const proximity = 1.0 - Math.abs(close - nearestSupport) / (1.5 * atr);
            score = 0.6 + proximity * 0.35;
            reasons.push(`S/R: BUY near support ${nearestSupport.toFixed(4)}`);
        } else if (nearestResistance && Math.abs(close - nearestResistance) < 0.8 * atr) {
            score = 0.20;
            reasons.push(`S/R: BUY at resistance ${nearestResistance.toFixed(4)}`);
        } else {
            reasons.push('S/R: BUY mid-range');
        }
    } else if (action === 'SELL') {
        if (nearestResistance && Math.abs(close - nearestResistance) < 1.5 * atr) {
            const proximity = 1.0 - Math.abs(close - nearestResistance) / (1.5 * atr);
            score = 0.6 + proximity * 0.35;
            reasons.push(`S/R: SELL near resistance ${nearestResistance.toFixed(4)}`);
        } else if (nearestSupport && Math.abs(close - nearestSupport) < 0.8 * atr) {
            score = 0.20;
            reasons.push(`S/R: SELL at support ${nearestSupport.toFixed(4)}`);
        } else {
            reasons.push('S/R: SELL mid-range');
        }
    }

    return { score: clamp(score, 0, 1), reasons };
}

function evaluateVolume(action, indicators, history) {
    const reasons = [];
    const close = indicators.close;
    const volumeRatio = indicators.volumeRatio;
    const atr = indicators.atr;
    const candles = history || [];

    let score = 0.5;
    if (volumeRatio >= 1.5) {
        score += 0.20;
        reasons.push(`VOL: strong volume (${volumeRatio.toFixed(1)}x avg)`);
    } else if (volumeRatio >= 1.2) {
        score += 0.10;
        reasons.push(`VOL: above-avg volume (${volumeRatio.toFixed(1)}x)`);
    } else if (volumeRatio < 0.6) {
        score -= 0.20;
        reasons.push(`VOL: weak volume (${volumeRatio.toFixed(1)}x)`);
    }

    if (candles.length >= 20) {
        const vwapSlice = candles.slice(-Math.min(96, candles.length));
        let totalVolume = 0;
        let weightedPrice = 0;
        for (const candle of vwapSlice) {
            const price = candle.close || 0;
            const volume = candle.volume || 0;
            totalVolume += volume;
            weightedPrice += price * volume;
        }
        const vwap = totalVolume > 0 ? weightedPrice / totalVolume : close;

        if (action === 'BUY') {
            if (close > vwap) {
                score += 0.10;
                reasons.push('VOL: above VWAP');
            } else if (close < vwap - 0.5 * atr) {
                score += 0.05;
                reasons.push('VOL: below VWAP mean-reversion');
            }
        } else if (action === 'SELL') {
            if (close < vwap) {
                score += 0.10;
                reasons.push('VOL: below VWAP');
            } else if (close > vwap + 0.5 * atr) {
                score += 0.05;
                reasons.push('VOL: above VWAP mean-reversion');
            }
        }
    }

    return { score: clamp(score, 0, 1), reasons };
}

function calculateHistoricalSma(closes, period, endExclusive) {
    if (endExclusive < period) return closes[Math.max(0, endExclusive - 1)] || 0;
    const slice = closes.slice(endExclusive - period, endExclusive);
    return slice.reduce((sum, value) => sum + value, 0) / period;
}

function evaluateMtf(action, indicators, history) {
    const reasons = [];
    const closes = getCloseArray(history);
    const close = indicators.close;
    const ema21 = indicators.ema21;
    const ema50 = indicators.ema50;
    const ema200 = indicators.ema200;
    const sma200 = indicators.sma200;
    const adx = indicators.adx;
    let alignmentCount = 0;

    if (closes.length >= 210) {
        const currentSma200 = calculateHistoricalSma(closes, 200, closes.length);
        const prevSma200 = calculateHistoricalSma(closes, 200, closes.length - 10);
        const slope = prevSma200 > 0 ? (currentSma200 - prevSma200) / prevSma200 : 0;

        if (action === 'BUY' && slope > 0.001) {
            alignmentCount += 1;
            reasons.push(`MTF: SMA200 rising (${(slope * 100).toFixed(2)}%)`);
        } else if (action === 'SELL' && slope < -0.001) {
            alignmentCount += 1;
            reasons.push(`MTF: SMA200 falling (${(slope * 100).toFixed(2)}%)`);
        } else if (action === 'BUY' && slope < -0.002) {
            alignmentCount -= 1;
            reasons.push('MTF: SMA200 strongly falling');
        } else if (action === 'SELL' && slope > 0.002) {
            alignmentCount -= 1;
            reasons.push('MTF: SMA200 strongly rising');
        }
    }

    if (ema50 > 0 && ema200 > 0) {
        if (action === 'BUY' && ema50 > ema200) {
            alignmentCount += 1;
            reasons.push('MTF: EMA50 > EMA200');
        } else if (action === 'SELL' && ema50 < ema200) {
            alignmentCount += 1;
            reasons.push('MTF: EMA50 < EMA200');
        } else if (action === 'BUY' && ema50 < ema200) {
            alignmentCount -= 1;
            reasons.push('MTF: counter-trend BUY');
        } else if (action === 'SELL' && ema50 > ema200) {
            alignmentCount -= 1;
            reasons.push('MTF: counter-trend SELL');
        }
    }

    if (sma200 > 0) {
        if (action === 'BUY' && close > sma200) alignmentCount += 1;
        else if (action === 'SELL' && close < sma200) alignmentCount += 1;
        else if (action === 'BUY' && close < sma200 * 0.98) {
            alignmentCount -= 1;
            reasons.push('MTF: price well below SMA200');
        }
    }

    if (adx > 30) {
        if (action === 'BUY' && close > ema21) {
            alignmentCount += 1;
            reasons.push(`MTF: strong trend ADX ${adx.toFixed(0)} + price > EMA21`);
        } else if (action === 'SELL' && close < ema21) {
            alignmentCount += 1;
            reasons.push(`MTF: strong trend ADX ${adx.toFixed(0)} + price < EMA21`);
        }
    }

    return {
        score: clamp(0.5 + alignmentCount * 0.125, 0, 1),
        reasons,
        alignmentCount,
    };
}

function evaluateStructuralGate({ action, history }) {
    if (action === 'HOLD') {
        return {
            pass: true,
            confidenceAdj: 1.0,
            score: 0.5,
            reasons: [],
            srScore: 0.5,
            volumeScore: 0.5,
            mtfScore: 0.5,
        };
    }

    if (!history || history.length < STRUCTURAL_GATE_SETTINGS.minHistory) {
        return {
            pass: true,
            confidenceAdj: 1.0,
            score: 0.5,
            reasons: ['STRUCT: insufficient history'],
            srScore: 0.5,
            volumeScore: 0.5,
            mtfScore: 0.5,
        };
    }

    const indicators = calculateCurrentIndicators(history);
    const sr = evaluateSr(action, indicators, history);
    const volume = evaluateVolume(action, indicators, history);
    const mtf = evaluateMtf(action, indicators, history);

    const composite = (
        sr.score * STRUCTURAL_GATE_SETTINGS.srWeight +
        volume.score * STRUCTURAL_GATE_SETTINGS.volumeWeight +
        mtf.score * STRUCTURAL_GATE_SETTINGS.mtfWeight
    ) / (
        STRUCTURAL_GATE_SETTINGS.srWeight +
        STRUCTURAL_GATE_SETTINGS.volumeWeight +
        STRUCTURAL_GATE_SETTINGS.mtfWeight
    );

    let confidenceAdj = 1.0;
    let pass = true;
    if (composite < STRUCTURAL_GATE_SETTINGS.gateMinScore) {
        confidenceAdj = 0.0;
        pass = false;
    } else if (composite < 0.40) {
        confidenceAdj = 0.80 + ((composite - STRUCTURAL_GATE_SETTINGS.gateMinScore) / (0.40 - STRUCTURAL_GATE_SETTINGS.gateMinScore)) * 0.15;
    } else if (composite >= STRUCTURAL_GATE_SETTINGS.boostThreshold) {
        confidenceAdj = Math.min(1.15, 1.05 + (composite - STRUCTURAL_GATE_SETTINGS.boostThreshold) * 0.30);
    } else {
        confidenceAdj = 0.95 + (composite - 0.40) * 0.40;
    }

    return {
        pass,
        confidenceAdj: Number(confidenceAdj.toFixed(3)),
        score: Number(composite.toFixed(3)),
        reasons: [...sr.reasons, ...volume.reasons, ...mtf.reasons],
        srScore: Number(sr.score.toFixed(3)),
        volumeScore: Number(volume.score.toFixed(3)),
        mtfScore: Number(mtf.score.toFixed(3)),
        alignmentCount: mtf.alignmentCount,
    };
}

module.exports = {
    STRUCTURAL_GATE_SETTINGS,
    calculateCurrentIndicators,
    calculateSrLevels,
    evaluateStructuralGate,
};
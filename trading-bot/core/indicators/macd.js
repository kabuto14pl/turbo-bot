"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateMACD = calculateMACD;
/**
 * Calculates the MACD (Moving Average Convergence Divergence) indicator.
 * @param closePrices - Array of closing prices.
 * @param fastPeriod - The period for the fast EMA (typically 12).
 * @param slowPeriod - The period for the slow EMA (typically 26).
 * @param signalPeriod - The period for the signal line EMA (typically 9).
 * @returns An array of MACD objects.
 */
function calculateMACD(closePrices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (closePrices.length < slowPeriod) {
        return Array(closePrices.length).fill({ macd: null, signal: null, histogram: null });
    }
    const emaFast = [];
    const emaSlow = [];
    const macdLine = [];
    const signalLine = [];
    const histogram = [];
    // Helper to calculate EMA on a growing series
    const calculateEmaForSeries = (data, period) => {
        const results = Array(data.length).fill(null);
        if (data.length < period)
            return results;
        let sma = 0;
        for (let i = 0; i < period; i++) {
            sma += data[i];
        }
        let prevEma = sma / period;
        results[period - 1] = prevEma;
        const k = 2 / (period + 1);
        for (let i = period; i < data.length; i++) {
            prevEma = (data[i] - prevEma) * k + prevEma;
            results[i] = prevEma;
        }
        return results;
    };
    const fastEmas = calculateEmaForSeries(closePrices, fastPeriod);
    const slowEmas = calculateEmaForSeries(closePrices, slowPeriod);
    for (let i = 0; i < closePrices.length; i++) {
        if (fastEmas[i] !== null && slowEmas[i] !== null) {
            const macd = fastEmas[i] - slowEmas[i];
            macdLine.push(macd);
        }
        else {
            macdLine.push(null);
        }
    }
    const macdValuesForSignal = macdLine.filter(v => v !== null);
    const signalEmas = calculateEmaForSeries(macdValuesForSignal, signalPeriod);
    // Align signal line with the main data
    const signalLineAligned = Array(closePrices.length).fill(null);
    let signalIndex = 0;
    for (let i = 0; i < closePrices.length; i++) {
        if (macdLine[i] !== null) {
            if (signalIndex < signalEmas.length) {
                signalLineAligned[i] = signalEmas[signalIndex];
                signalIndex++;
            }
        }
    }
    const results = [];
    for (let i = 0; i < closePrices.length; i++) {
        const macd = macdLine[i];
        const signal = signalLineAligned[i];
        if (macd !== null && signal !== null) {
            results.push({ macd, signal, histogram: macd - signal });
        }
        else {
            results.push({ macd: null, signal: null, histogram: null });
        }
    }
    return results;
}

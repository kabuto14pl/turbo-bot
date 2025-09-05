"use strict";
// ============================================================================
// helpers.ts - Utility Functions and Helper Methods
// Extracted from main.ts for better modularity and reusability
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.trade_events = exports.signal_events = void 0;
exports.record_signal = record_signal;
exports.record_trade = record_trade;
exports.toCsv = toCsv;
exports.calculateVolatility = calculateVolatility;
exports.determineTrend = determineTrend;
exports.validateCandles = validateCandles;
exports.formatTimestamp = formatTimestamp;
exports.getTimestampRange = getTimestampRange;
exports.calculateSharpeRatio = calculateSharpeRatio;
exports.calculateMaxDrawdown = calculateMaxDrawdown;
// --- GLOBAL EVENT STORAGE ---
exports.signal_events = [];
exports.trade_events = [];
// --- EVENT RECORDING FUNCTIONS ---
function record_signal(strategy, ts, type, price, extra = {}) {
    exports.signal_events.push({ strategy, ts, type, price, ...extra });
}
function record_trade(strategy, action, side, ts, price, size, sl, tp, pnl, extra = {}) {
    exports.trade_events.push({ strategy, action, side, ts, price, size, sl, tp, pnl, ...extra });
}
// --- CSV EXPORT UTILITIES ---
function toCsv(rows, columns) {
    const header = columns.join(',') + '\n';
    const csvRows = rows.map(row => columns
        .map(col => {
        let val = row[col];
        if (val === undefined || val === null)
            return '';
        if (typeof val === 'string' &&
            (val.includes(',') || val.includes('\n') || val.includes('"'))) {
            return '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
    })
        .join(','));
    return header + csvRows.join('\n');
}
// --- MARKET ANALYSIS FUNCTIONS ---
function calculateVolatility(prices) {
    if (prices.length < 2)
        return 0;
    const returns = prices.slice(1).map((price, i) => Math.log(price / prices[i]));
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
}
function determineTrend(prices) {
    if (prices.length < 3)
        return 'sideways';
    const first = prices[0];
    const last = prices[prices.length - 1];
    const change = (last - first) / first;
    if (change > 0.005)
        return 'bullish'; // > 0.5% change
    if (change < -0.005)
        return 'bearish'; // < -0.5% change
    return 'sideways';
}
// --- DATA VALIDATION ---
function validateCandles(candles) {
    if (!candles || candles.length === 0) {
        console.error('[VALIDATION] No candles provided');
        return false;
    }
    const requiredFields = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];
    const firstCandle = candles[0];
    for (const field of requiredFields) {
        if (!(field in firstCandle)) {
            console.error(`[VALIDATION] Missing required field: ${field}`);
            return false;
        }
    }
    return true;
}
// --- TIMESTAMP UTILITIES ---
function formatTimestamp(timestamp) {
    return new Date(timestamp).toISOString();
}
function getTimestampRange(candles) {
    if (candles.length === 0)
        return { start: 0, end: 0 };
    return {
        start: candles[0].timestamp,
        end: candles[candles.length - 1].timestamp
    };
}
// --- PERFORMANCE CALCULATION HELPERS ---
function calculateSharpeRatio(returns, riskFreeRate = 0) {
    if (returns.length === 0)
        return 0;
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const excessReturn = avgReturn - riskFreeRate;
    const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    return volatility === 0 ? 0 : excessReturn / volatility;
}
function calculateMaxDrawdown(equityCurve) {
    if (equityCurve.length === 0)
        return 0;
    let maxDrawdown = 0;
    let peak = equityCurve[0];
    for (const value of equityCurve) {
        if (value > peak) {
            peak = value;
        }
        const drawdown = (peak - value) / peak;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }
    return maxDrawdown;
}
// --- EXPORT ALL FUNCTIONS ---
exports.default = {
    signal_events: exports.signal_events,
    trade_events: exports.trade_events,
    record_signal,
    record_trade,
    toCsv,
    calculateVolatility,
    determineTrend,
    validateCandles,
    formatTimestamp,
    getTimestampRange,
    calculateSharpeRatio,
    calculateMaxDrawdown
};

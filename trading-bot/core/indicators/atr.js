"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateATR = calculateATR;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
function calculateATR(highs, lows, closes, period = 14) {
    const atr = [];
    const trs = [];
    for (let i = 1; i < closes.length; i++) {
        const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
        trs.push(tr);
    }
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += trs[i];
    }
    atr[period] = sum / period;
    for (let i = period + 1; i < trs.length; i++) {
        atr[i] = (atr[i - 1] * (period - 1) + trs[i]) / period;
    }
    return atr;
}

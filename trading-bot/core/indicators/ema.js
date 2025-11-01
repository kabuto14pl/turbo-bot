"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcEMA = calcEMA;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
function calcEMA(buf, period) {
    if (buf.length < period)
        return null;
    let k = 2 / (period + 1);
    // Inicjalizacja pierwszego EMA - można użyć prostej średniej kroczącej dla pierwszych 'period' świec
    let ema = buf.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period;
    for (let i = period; i < buf.length; i++) {
        ema = buf[i].close * k + ema * (1 - k);
    }
    return ema;
}

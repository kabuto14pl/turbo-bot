"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcRSI = calcRSI;
function calcRSI(buf, period) {
    if (buf.length < period + 1)
        return null;
    let gains = 0;
    let losses = 0;
    // Oblicz początkowe średnie zyski i straty
    for (let i = 1; i <= period; i++) {
        const diff = buf[i].close - buf[i - 1].close;
        if (diff > 0) {
            gains += diff;
        }
        else {
            losses -= diff;
        }
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    // Wygładzanie (RMA/SMMA) dla reszty danych
    for (let i = period + 1; i < buf.length; i++) {
        const diff = buf[i].close - buf[i - 1].close;
        if (diff > 0) {
            avgGain = (avgGain * (period - 1) + diff) / period;
            avgLoss = (avgLoss * (period - 1)) / period;
        }
        else {
            avgLoss = (avgLoss * (period - 1) - diff) / period;
            avgGain = (avgGain * (period - 1)) / period;
        }
    }
    if (avgLoss === 0) {
        return 100; // Uniknięcie dzielenia przez zero
    }
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
}

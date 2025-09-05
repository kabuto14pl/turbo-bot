"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RsiAbove = void 0;
class RsiAbove {
    constructor(value, period) {
        this.value = value;
        this.period = period;
    }
    get label() {
        return `RSI(${this.period}) > ${this.value}`;
    }
    evaluate(candle) {
        if (candle.rsi === undefined || candle.rsi === null) {
            return false;
        }
        return candle.rsi > this.value;
    }
}
exports.RsiAbove = RsiAbove;

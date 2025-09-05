"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RsiAbove = void 0;
class RsiAbove {
    constructor(threshold) {
        this.threshold = threshold;
        this.label = `RSI > ${this.threshold}`;
    }
    evaluate(c) {
        return c.rsi !== undefined && c.rsi > this.threshold;
    }
}
exports.RsiAbove = RsiAbove;

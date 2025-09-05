"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RsiBelow = void 0;
class RsiBelow {
    constructor(threshold) {
        this.threshold = threshold;
        this.label = `RSI < ${this.threshold}`;
    }
    evaluate(c) {
        return c.rsi !== undefined && c.rsi < this.threshold;
    }
}
exports.RsiBelow = RsiBelow;

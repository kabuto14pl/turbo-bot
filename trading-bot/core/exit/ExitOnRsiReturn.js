"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExitOnRsiReturn = void 0;
class ExitOnRsiReturn {
    constructor(lower, upper) {
        this.lower = lower;
        this.upper = upper;
    }
    evaluate(c) {
        if (c.rsi > this.lower && c.rsi < this.upper) {
            return { type: 'full', reason: 'RSI neutral' };
        }
        return null;
    }
}
exports.ExitOnRsiReturn = ExitOnRsiReturn;

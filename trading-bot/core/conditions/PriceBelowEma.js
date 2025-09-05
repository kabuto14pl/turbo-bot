"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceBelowEma = void 0;
class PriceBelowEma {
    constructor(emaField) {
        this.emaField = emaField;
        this.label = 'Price < EMA';
    }
    evaluate(c) {
        return c.close < c[this.emaField];
    }
}
exports.PriceBelowEma = PriceBelowEma;

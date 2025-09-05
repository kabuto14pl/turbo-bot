"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceAboveEma = void 0;
class PriceAboveEma {
    constructor(emaField) {
        this.emaField = emaField;
        this.label = 'Price > EMA';
    }
    evaluate(c) {
        return c.close > c[this.emaField];
    }
}
exports.PriceAboveEma = PriceAboveEma;

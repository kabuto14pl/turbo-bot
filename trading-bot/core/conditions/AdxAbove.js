"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdxAbove = void 0;
class AdxAbove {
    constructor(min) {
        this.min = min;
        this.label = `ADX > ${this.min}`;
    }
    evaluate(c) {
        return c.adx !== undefined && c.adx > this.min;
    }
}
exports.AdxAbove = AdxAbove;

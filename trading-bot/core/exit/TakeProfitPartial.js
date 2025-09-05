"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TakeProfitPartial = void 0;
class TakeProfitPartial {
    constructor(ratio) {
        this.ratio = ratio;
    }
    evaluate(c, entryPrice) {
        if (c.close >= entryPrice * this.ratio) {
            return { type: 'partial', percentage: 50, reason: 'TP Hit' };
        }
        return null;
    }
}
exports.TakeProfitPartial = TakeProfitPartial;

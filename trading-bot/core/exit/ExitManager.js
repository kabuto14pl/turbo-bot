"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExitManager = void 0;
const TakeProfitPartial_1 = require("./TakeProfitPartial");
class ExitManager {
    constructor(exits) {
        this.exits = exits;
    }
    evaluate(c, entryPrice) {
        for (const exit of this.exits) {
            const signal = exit instanceof TakeProfitPartial_1.TakeProfitPartial
                ? exit.evaluate(c, entryPrice)
                : exit.evaluate(c);
            if (signal)
                return signal;
        }
        return null;
    }
}
exports.ExitManager = ExitManager;

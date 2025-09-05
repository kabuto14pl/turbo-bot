"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AndGroup = void 0;
class AndGroup {
    constructor(conditions) {
        this.conditions = conditions;
        this.label = 'AND group';
    }
    evaluate(c) {
        return this.conditions.every(cond => cond.evaluate(c));
    }
}
exports.AndGroup = AndGroup;

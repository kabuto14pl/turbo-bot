"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CooldownManager = void 0;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
class CooldownManager {
    constructor(cooldownBars = 2) {
        this.cooldownDict = {};
        this.lastExecutionTime = 0;
        this.cooldownBars = cooldownBars;
    }
    set(strategyName, bar) {
        this.cooldownDict[strategyName] = bar;
    }
    isCooldown(strategyName, currentBar) {
        return strategyName in this.cooldownDict && (currentBar - this.cooldownDict[strategyName]) < this.cooldownBars;
    }
    canExecute() {
        const now = Date.now();
        return (now - this.lastExecutionTime) >= (this.cooldownBars * 60000); // 2 minutes per bar
    }
    updateLastExecution() {
        this.lastExecutionTime = Date.now();
    }
}
exports.CooldownManager = CooldownManager;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryCooldown = void 0;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
class RetryCooldown {
    constructor(cooldownBars) {
        this.cooldownBars = cooldownBars;
        this.lastFailedAttempt = -Infinity;
    }
    canRetry(currentBar) {
        return currentBar - this.lastFailedAttempt > this.cooldownBars;
    }
    recordFailure(currentBar) {
        this.lastFailedAttempt = currentBar;
    }
}
exports.RetryCooldown = RetryCooldown;

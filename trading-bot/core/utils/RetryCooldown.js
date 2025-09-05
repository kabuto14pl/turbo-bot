"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryCooldown = void 0;
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

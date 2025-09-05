"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskManager = void 0;
/**
 * Simple risk manager implementation
 */
class RiskManager {
    constructor(logger) {
        this.logger = logger;
    }
    validateOrder(order) {
        // Basic validation
        if (!order.quantity || order.quantity <= 0) {
            this.logger.warn('Invalid order quantity');
            return false;
        }
        if (!order.price || order.price <= 0) {
            this.logger.warn('Invalid order price');
            return false;
        }
        // Check for maximum order size (example: $1M limit)
        const orderValue = (order.quantity || 0) * order.price;
        if (orderValue > 1000000) {
            this.logger.warn(`Order value too large: $${orderValue}`);
            return false;
        }
        return true;
    }
    calculateRiskAmount(order) {
        if (!order.stopLoss || !order.price || !order.quantity) {
            return 0;
        }
        return Math.abs(order.price - order.stopLoss) * order.quantity;
    }
}
exports.RiskManager = RiskManager;

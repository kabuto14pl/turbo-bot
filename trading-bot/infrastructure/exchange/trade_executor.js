"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradeExecutor = void 0;
class TradeExecutor {
    constructor(logger, portfolioManager, riskManager, commission = 0.001, slippageMultiplier = 0.2) {
        this.logger = logger;
        this.portfolioManager = portfolioManager;
        this.riskManager = riskManager;
        this.commission = commission;
        this.slippageMultiplier = slippageMultiplier;
    }
    // Można tu zostawić wspólną logikę, np. do obliczeń, jeśli jest potrzebna
    _calculateSlippage(atr, size) {
        return atr * this.slippageMultiplier * Math.abs(size);
    }
    getRiskManager() {
        return this.riskManager;
    }
}
exports.TradeExecutor = TradeExecutor;

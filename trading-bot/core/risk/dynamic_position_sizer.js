"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicPositionSizer = void 0;
class DynamicPositionSizer {
    constructor(config = {
        baseRiskPercent: 0.01, // 1% base risk
        maxPositionSizePercent: 0.05, // 5% max position size
        volatilityAdjustment: true,
        confidenceMultiplier: true,
        regimeMultiplier: true
    }) {
        this.config = config;
    }
    calculate(equity, price, atr, confidence, regime, stopLossDistance) {
        // Base risk amount
        const baseRiskAmount = equity * this.config.baseRiskPercent;
        // Calculate stop loss distance if not provided
        const slDistance = stopLossDistance || (atr * 2);
        // Base position size
        const baseSize = baseRiskAmount / slDistance;
        // Volatility adjustment
        const volatilityAdjustment = this.config.volatilityAdjustment
            ? this.calculateVolatilityAdjustment(atr, price)
            : 1;
        // Confidence multiplier
        const confidenceMultiplier = this.config.confidenceMultiplier
            ? this.calculateConfidenceMultiplier(confidence)
            : 1;
        // Regime multiplier
        const regimeMultiplier = this.config.regimeMultiplier
            ? this.calculateRegimeMultiplier(regime)
            : 1;
        // Calculate final position size
        let finalSize = baseSize * volatilityAdjustment * confidenceMultiplier * regimeMultiplier;
        // Apply maximum position size limit
        const maxPositionSize = equity * this.config.maxPositionSizePercent / price;
        finalSize = Math.min(finalSize, maxPositionSize);
        // Ensure minimum position size
        const minPositionSize = 0.001; // Minimum 0.1% of equity
        finalSize = Math.max(finalSize, minPositionSize);
        return {
            size: finalSize,
            riskAmount: baseRiskAmount,
            confidence: confidence,
            volatilityAdjustment: volatilityAdjustment,
            regimeMultiplier: regimeMultiplier
        };
    }
    calculateVolatilityAdjustment(atr, price) {
        const volatility = atr / price;
        // Higher volatility = smaller position size
        if (volatility > 0.05)
            return 0.6; // High volatility
        if (volatility > 0.03)
            return 0.8; // Medium volatility
        if (volatility > 0.02)
            return 1.0; // Normal volatility
        if (volatility > 0.01)
            return 1.2; // Low volatility
        return 1.5; // Very low volatility
    }
    calculateConfidenceMultiplier(confidence) {
        // Higher confidence = larger position size
        if (confidence > 0.8)
            return 1.3;
        if (confidence > 0.6)
            return 1.1;
        if (confidence > 0.4)
            return 1.0;
        if (confidence > 0.2)
            return 0.8;
        return 0.5; // Low confidence
    }
    calculateRegimeMultiplier(regime) {
        switch (regime) {
            case 'trending_bull':
                return 1.2; // Larger positions in strong uptrends
            case 'trending_bear':
                return 0.8; // Smaller positions in downtrends
            case 'ranging_low_vol':
                return 1.0; // Normal positions in low volatility
            case 'ranging_high_vol':
                return 0.6; // Smaller positions in high volatility
            default:
                return 0.7; // Conservative in transitional periods
        }
    }
    // Kelly Criterion for position sizing
    calculateKellyFraction(winRate, avgWin, avgLoss) {
        if (avgLoss === 0)
            return 0;
        const kellyFraction = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
        // Limit Kelly fraction to reasonable bounds
        return Math.max(0, Math.min(kellyFraction, 0.25)); // Max 25% per trade
    }
    // Risk-adjusted position sizing based on Sharpe ratio
    calculateRiskAdjustedSize(equity, price, expectedReturn, volatility, riskFreeRate = 0.02) {
        const sharpeRatio = (expectedReturn - riskFreeRate) / volatility;
        // Higher Sharpe ratio = larger position
        const sharpeMultiplier = Math.max(0.5, Math.min(sharpeRatio, 2.0));
        const baseSize = equity * this.config.baseRiskPercent / price;
        return baseSize * sharpeMultiplier;
    }
    // Portfolio-aware position sizing
    calculatePortfolioAwareSize(equity, price, currentExposure, maxPortfolioExposure = 0.3) {
        const availableExposure = maxPortfolioExposure - currentExposure;
        if (availableExposure <= 0)
            return 0;
        const maxPositionValue = equity * availableExposure;
        return maxPositionValue / price;
    }
}
exports.DynamicPositionSizer = DynamicPositionSizer;

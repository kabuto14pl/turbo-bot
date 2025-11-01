/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { MarketRegime } from '../analysis/market_regime_detector';

export interface PositionSizeConfig {
    baseRiskPercent: number;
    maxPositionSizePercent: number;
    volatilityAdjustment: boolean;
    confidenceMultiplier: boolean;
    regimeMultiplier: boolean;
}

export interface PositionSizeResult {
    size: number;
    riskAmount: number;
    confidence: number;
    volatilityAdjustment: number;
    regimeMultiplier: number;
}

export class DynamicPositionSizer {
    private config: PositionSizeConfig;

    constructor(config: PositionSizeConfig = {
        baseRiskPercent: 0.01, // 1% base risk
        maxPositionSizePercent: 0.05, // 5% max position size
        volatilityAdjustment: true,
        confidenceMultiplier: true,
        regimeMultiplier: true
    }) {
        this.config = config;
    }

    calculate(
        equity: number,
        price: number,
        atr: number,
        confidence: number,
        regime: MarketRegime,
        stopLossDistance?: number
    ): PositionSizeResult {
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

    private calculateVolatilityAdjustment(atr: number, price: number): number {
        const volatility = atr / price;
        
        // Higher volatility = smaller position size
        if (volatility > 0.05) return 0.6; // High volatility
        if (volatility > 0.03) return 0.8; // Medium volatility
        if (volatility > 0.02) return 1.0; // Normal volatility
        if (volatility > 0.01) return 1.2; // Low volatility
        
        return 1.5; // Very low volatility
    }

    private calculateConfidenceMultiplier(confidence: number): number {
        // Higher confidence = larger position size
        if (confidence > 0.8) return 1.3;
        if (confidence > 0.6) return 1.1;
        if (confidence > 0.4) return 1.0;
        if (confidence > 0.2) return 0.8;
        
        return 0.5; // Low confidence
    }

    private calculateRegimeMultiplier(regime: MarketRegime): number {
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
    calculateKellyFraction(winRate: number, avgWin: number, avgLoss: number): number {
        if (avgLoss === 0) return 0;
        
        const kellyFraction = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
        
        // Limit Kelly fraction to reasonable bounds
        return Math.max(0, Math.min(kellyFraction, 0.25)); // Max 25% per trade
    }

    // Risk-adjusted position sizing based on Sharpe ratio
    calculateRiskAdjustedSize(
        equity: number,
        price: number,
        expectedReturn: number,
        volatility: number,
        riskFreeRate: number = 0.02
    ): number {
        const sharpeRatio = (expectedReturn - riskFreeRate) / volatility;
        
        // Higher Sharpe ratio = larger position
        const sharpeMultiplier = Math.max(0.5, Math.min(sharpeRatio, 2.0));
        
        const baseSize = equity * this.config.baseRiskPercent / price;
        return baseSize * sharpeMultiplier;
    }

    // Portfolio-aware position sizing
    calculatePortfolioAwareSize(
        equity: number,
        price: number,
        currentExposure: number,
        maxPortfolioExposure: number = 0.3
    ): number {
        const availableExposure = maxPortfolioExposure - currentExposure;
        
        if (availableExposure <= 0) return 0;
        
        const maxPositionValue = equity * availableExposure;
        return maxPositionValue / price;
    }
} 
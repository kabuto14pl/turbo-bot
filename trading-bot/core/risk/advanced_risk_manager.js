"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedRiskManager = void 0;
class AdvancedRiskManager {
    constructor() {
        this.maxTotalExposure = 0.3; // 30% max total exposure
        this.maxCorrelationRisk = 0.8; // 80% max correlation
        this.maxConcentrationRisk = 0.5; // 50% max concentration
        this.maxDrawdown = 0.15; // 15% max drawdown
        this.maxDailyDrawdown = 0.05; // 5% max daily drawdown
    }
    validatePortfolio(positions, equity, currentDrawdown, dailyDrawdown) {
        const totalExposure = this.calculateTotalExposure(positions, equity);
        const correlationRisk = this.calculateCorrelationRisk(positions);
        const concentrationRisk = this.calculateConcentrationRisk(positions, equity);
        const drawdownRisk = this.calculateDrawdownRisk(currentDrawdown, dailyDrawdown);
        const volatilityRisk = this.calculateVolatilityRisk(positions);
        const status = this.determineRiskStatus({
            totalExposure,
            correlationRisk,
            concentrationRisk,
            drawdownRisk,
            volatilityRisk
        });
        const recommendations = this.generateRecommendations({
            totalExposure,
            correlationRisk,
            concentrationRisk,
            drawdownRisk,
            volatilityRisk
        });
        return {
            status,
            reason: this.getRiskReason(status, {
                totalExposure,
                correlationRisk,
                concentrationRisk,
                drawdownRisk,
                volatilityRisk
            }),
            details: {
                totalExposure,
                correlationRisk,
                concentrationRisk,
                drawdownRisk,
                volatilityRisk
            },
            recommendations
        };
    }
    calculateTotalExposure(positions, equity) {
        if (equity === 0)
            return 0;
        const totalPositionValue = positions.reduce((sum, pos) => {
            return sum + (pos.size * pos.currentPrice);
        }, 0);
        return totalPositionValue / equity;
    }
    calculateCorrelationRisk(positions) {
        if (positions.length < 2)
            return 0;
        // Simplified correlation calculation based on position directions
        const longPositions = positions.filter(p => p.direction === 'long').length;
        const shortPositions = positions.filter(p => p.direction === 'short').length;
        const totalPositions = positions.length;
        // If all positions are in the same direction, correlation is high
        if (longPositions === totalPositions || shortPositions === totalPositions) {
            return 1.0;
        }
        // If positions are balanced, correlation is lower
        const balanceRatio = Math.abs(longPositions - shortPositions) / totalPositions;
        return balanceRatio;
    }
    calculateConcentrationRisk(positions, equity) {
        if (positions.length === 0 || equity === 0)
            return 0;
        const positionValues = positions.map(pos => pos.size * pos.currentPrice);
        const totalValue = positionValues.reduce((sum, val) => sum + val, 0);
        if (totalValue === 0)
            return 0;
        // Calculate Herfindahl-Hirschman Index (HHI) for concentration
        const hhi = positionValues.reduce((sum, value) => {
            const share = value / totalValue;
            return sum + (share * share);
        }, 0);
        return hhi;
    }
    calculateDrawdownRisk(currentDrawdown, dailyDrawdown) {
        const currentDrawdownRisk = currentDrawdown / this.maxDrawdown;
        const dailyDrawdownRisk = dailyDrawdown / this.maxDailyDrawdown;
        return Math.max(currentDrawdownRisk, dailyDrawdownRisk);
    }
    calculateVolatilityRisk(positions) {
        if (positions.length === 0)
            return 0;
        // Calculate portfolio volatility based on position sizes
        const totalValue = positions.reduce((sum, pos) => sum + (pos.size * pos.currentPrice), 0);
        if (totalValue === 0)
            return 0;
        // Simplified volatility calculation
        const weightedVolatility = positions.reduce((sum, pos) => {
            const weight = (pos.size * pos.currentPrice) / totalValue;
            // Assume higher volatility for larger positions
            return sum + (weight * weight);
        }, 0);
        return weightedVolatility;
    }
    determineRiskStatus(risks) {
        const { totalExposure, correlationRisk, concentrationRisk, drawdownRisk, volatilityRisk } = risks;
        // Critical risk conditions
        if (totalExposure > 0.5 || drawdownRisk > 1.0) {
            return 'critical';
        }
        // High risk conditions
        if (totalExposure > this.maxTotalExposure ||
            correlationRisk > this.maxCorrelationRisk ||
            concentrationRisk > this.maxConcentrationRisk ||
            drawdownRisk > 0.8) {
            return 'high_risk';
        }
        // Medium risk conditions
        if (totalExposure > 0.2 ||
            correlationRisk > 0.6 ||
            concentrationRisk > 0.3 ||
            drawdownRisk > 0.5) {
            return 'medium_risk';
        }
        return 'acceptable';
    }
    getRiskReason(status, risks) {
        switch (status) {
            case 'critical':
                if (risks.totalExposure > 0.5)
                    return 'Critical: Excessive total exposure';
                if (risks.drawdownRisk > 1.0)
                    return 'Critical: Maximum drawdown exceeded';
                return 'Critical: Multiple risk factors exceeded';
            case 'high_risk':
                if (risks.totalExposure > this.maxTotalExposure)
                    return 'High risk: Total exposure limit exceeded';
                if (risks.correlationRisk > this.maxCorrelationRisk)
                    return 'High risk: High correlation between positions';
                if (risks.concentrationRisk > this.maxConcentrationRisk)
                    return 'High risk: Position concentration too high';
                if (risks.drawdownRisk > 0.8)
                    return 'High risk: Approaching maximum drawdown';
                return 'High risk: Multiple risk factors elevated';
            case 'medium_risk':
                return 'Medium risk: Some risk factors elevated';
            default:
                return 'Acceptable: All risk factors within limits';
        }
    }
    generateRecommendations(risks) {
        const recommendations = [];
        if (risks.totalExposure > this.maxTotalExposure) {
            recommendations.push('Reduce total portfolio exposure');
        }
        if (risks.correlationRisk > this.maxCorrelationRisk) {
            recommendations.push('Diversify position directions');
        }
        if (risks.concentrationRisk > this.maxConcentrationRisk) {
            recommendations.push('Reduce position concentration');
        }
        if (risks.drawdownRisk > 0.8) {
            recommendations.push('Consider reducing risk or closing positions');
        }
        if (risks.volatilityRisk > 0.5) {
            recommendations.push('Consider reducing position sizes');
        }
        return recommendations;
    }
    // Validate individual trade
    validateTrade(newPosition, existingPositions, equity, regime) {
        // Check if trade would exceed limits
        const projectedPositions = [...existingPositions, newPosition];
        const riskAssessment = this.validatePortfolio(projectedPositions, equity, 0, 0);
        if (riskAssessment.status === 'critical') {
            return {
                isValid: false,
                reason: 'Trade would create critical risk level',
                riskScore: 1.0
            };
        }
        // Calculate risk score (0-1, where 1 is highest risk)
        const riskScore = this.calculateTradeRiskScore(newPosition, existingPositions, equity, regime);
        return {
            isValid: riskAssessment.status !== 'high_risk',
            reason: riskAssessment.reason,
            riskScore
        };
    }
    calculateTradeRiskScore(newPosition, existingPositions, equity, regime) {
        let riskScore = 0;
        // Position size risk
        const positionValue = newPosition.size * newPosition.currentPrice;
        const sizeRisk = positionValue / equity;
        riskScore += sizeRisk * 0.3;
        // Correlation risk
        const sameDirectionPositions = existingPositions.filter(p => p.direction === newPosition.direction);
        const correlationRisk = sameDirectionPositions.length / Math.max(existingPositions.length, 1);
        riskScore += correlationRisk * 0.2;
        // Regime risk
        const regimeRisk = this.getRegimeRiskMultiplier(regime);
        riskScore += regimeRisk * 0.2;
        // Concentration risk
        const totalValue = existingPositions.reduce((sum, p) => sum + (p.size * p.currentPrice), 0) + positionValue;
        const concentrationRisk = positionValue / Math.max(totalValue, 1);
        riskScore += concentrationRisk * 0.3;
        return Math.min(riskScore, 1.0);
    }
    getRegimeRiskMultiplier(regime) {
        const { indicators } = regime;
        const isHighVolatility = regime.type === 'HIGH_VOLATILITY' || indicators.volatility > 0.7;
        if (regime.type === 'BULL') {
            return isHighVolatility ? 0.4 : 0.3; // Lower risk in bull markets
        }
        else if (regime.type === 'BEAR') {
            return isHighVolatility ? 0.9 : 0.8; // Higher risk in bear markets
        }
        else if (regime.type === 'HIGH_VOLATILITY') {
            return 0.9; // High risk in volatile markets
        }
        else if (regime.type === 'LOW_VOLATILITY') {
            return 0.4; // Lower risk in stable markets
        }
        else { // SIDEWAYS
            return isHighVolatility ? 0.7 : 0.5; // Medium risk in ranging markets
        }
    }
}
exports.AdvancedRiskManager = AdvancedRiskManager;

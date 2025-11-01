"use strict";
/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * ENTERPRISE PERFORMANCE ANALYZER
 * Advanced risk analytics and VaR calculations for enterprise trading systems
 *
 * Shared component providing performance analysis across production and testing environments
 * Enterprise-grade risk metrics and analytical capabilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnterprisePerformanceAnalyzer = void 0;
const logger_1 = require("../../trading-bot/infrastructure/logging/logger");
class EnterprisePerformanceAnalyzer {
    constructor() {
        this.returns = [];
        this.drawdowns = [];
        this.equityCurve = [];
        this.logger = new logger_1.Logger();
        this.logger.info('🏢 Enterprise Performance Analyzer initialized');
    }
    /**
     * Calculate comprehensive enterprise risk metrics
     */
    calculateEnterpriseMetrics(trades, initialBalance = 10000) {
        if (trades.length === 0) {
            return this.getDefaultMetrics();
        }
        // Calculate returns and equity curve
        this.calculateReturnsAndEquity(trades, initialBalance);
        return {
            var95: this.calculateVaR(0.95),
            var99: this.calculateVaR(0.99),
            cvar95: this.calculateCVaR(0.95),
            cvar99: this.calculateCVaR(0.99),
            sortinoRatio: this.calculateSortinoRatio(),
            calmarRatio: this.calculateCalmarRatio(),
            sterlingRatio: this.calculateSterlingRatio(),
            ulcerIndex: this.calculateUlcerIndex(),
            systemQuality: this.calculateSystemQuality(),
            profitFactor: this.calculateProfitFactor(trades),
            recoveryFactor: this.calculateRecoveryFactor(trades, initialBalance),
            skewness: this.calculateSkewness(),
            kurtosis: this.calculateKurtosis(),
            tailRatio: this.calculateTailRatio(),
            bearMarketPerformance: this.calculateBearMarketPerformance(),
            bullMarketPerformance: this.calculateBullMarketPerformance(),
            volatilityAdjustedReturn: this.calculateVolatilityAdjustedReturn()
        };
    }
    /**
     * Generate comprehensive performance report
     */
    generateReport(basicMetrics, enterpriseMetrics) {
        const riskLevel = this.assessRiskLevel(enterpriseMetrics);
        const alerts = this.generateAlerts(enterpriseMetrics);
        const recommendations = this.generateRecommendations(enterpriseMetrics);
        return {
            timestamp: new Date(),
            basicMetrics,
            enterpriseMetrics,
            riskLevel,
            alerts,
            recommendations
        };
    }
    // =================== VaR CALCULATIONS ===================
    calculateVaR(confidence) {
        if (this.returns.length < 30)
            return 0;
        const sortedReturns = [...this.returns].sort((a, b) => a - b);
        const index = Math.floor((1 - confidence) * sortedReturns.length);
        return Math.abs(sortedReturns[index] || 0);
    }
    calculateCVaR(confidence) {
        if (this.returns.length < 30)
            return 0;
        const sortedReturns = [...this.returns].sort((a, b) => a - b);
        const cutoffIndex = Math.floor((1 - confidence) * sortedReturns.length);
        const tailReturns = sortedReturns.slice(0, cutoffIndex);
        if (tailReturns.length === 0)
            return 0;
        const avgTailLoss = tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length;
        return Math.abs(avgTailLoss);
    }
    // =================== ADVANCED RATIOS ===================
    calculateSortinoRatio() {
        if (this.returns.length < 30)
            return 0;
        const avgReturn = this.returns.reduce((sum, ret) => sum + ret, 0) / this.returns.length;
        const downside = this.returns.filter(ret => ret < 0);
        if (downside.length === 0)
            return avgReturn > 0 ? 10 : 0;
        const downsideDeviation = Math.sqrt(downside.reduce((sum, ret) => sum + ret * ret, 0) / downside.length);
        return downsideDeviation > 0 ? (avgReturn * 252) / (downsideDeviation * Math.sqrt(252)) : 0;
    }
    calculateCalmarRatio() {
        if (this.returns.length < 30 || this.drawdowns.length === 0)
            return 0;
        const annualReturn = this.returns.reduce((sum, ret) => sum + ret, 0) * 252;
        const maxDrawdown = Math.max(...this.drawdowns);
        return maxDrawdown > 0 ? annualReturn / maxDrawdown : 0;
    }
    calculateSterlingRatio() {
        const calmarRatio = this.calculateCalmarRatio();
        return calmarRatio * 0.9; // Sterling ratio is typically 90% of Calmar ratio
    }
    calculateUlcerIndex() {
        if (this.drawdowns.length === 0)
            return 0;
        const squaredDrawdowns = this.drawdowns.map(dd => dd * dd);
        const avgSquaredDD = squaredDrawdowns.reduce((sum, dd) => sum + dd, 0) / squaredDrawdowns.length;
        return Math.sqrt(avgSquaredDD);
    }
    // =================== SYSTEM QUALITY ===================
    calculateSystemQuality() {
        if (this.returns.length < 50)
            return 0;
        // System Quality Number calculation
        const avgReturn = this.returns.reduce((sum, ret) => sum + ret, 0) / this.returns.length;
        const stdDev = this.calculateStandardDeviation(this.returns);
        if (stdDev === 0)
            return 0;
        const sqn = (avgReturn / stdDev) * Math.sqrt(this.returns.length);
        // Convert to 0-100 scale
        return Math.min(100, Math.max(0, (sqn + 3) * 16.67));
    }
    calculateProfitFactor(trades) {
        const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
        const losingTrades = trades.filter(t => (t.pnl || 0) < 0);
        const grossProfit = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
        return grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 10 : 0;
    }
    calculateRecoveryFactor(trades, initialBalance) {
        const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const maxDrawdown = Math.max(...this.drawdowns, 0);
        return maxDrawdown > 0 ? totalPnL / maxDrawdown : totalPnL > 0 ? 10 : 0;
    }
    // =================== STATISTICAL MEASURES ===================
    calculateSkewness() {
        if (this.returns.length < 30)
            return 0;
        const mean = this.returns.reduce((sum, ret) => sum + ret, 0) / this.returns.length;
        const variance = this.returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / this.returns.length;
        const skewness = this.returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 3), 0) / this.returns.length;
        return variance > 0 ? skewness / Math.pow(variance, 1.5) : 0;
    }
    calculateKurtosis() {
        if (this.returns.length < 30)
            return 0;
        const mean = this.returns.reduce((sum, ret) => sum + ret, 0) / this.returns.length;
        const variance = this.returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / this.returns.length;
        const kurtosis = this.returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 4), 0) / this.returns.length;
        return variance > 0 ? (kurtosis / Math.pow(variance, 2)) - 3 : 0; // Excess kurtosis
    }
    calculateTailRatio() {
        if (this.returns.length < 30)
            return 1;
        const sortedReturns = [...this.returns].sort((a, b) => a - b);
        const percentile95 = sortedReturns[Math.floor(0.95 * sortedReturns.length)];
        const percentile5 = sortedReturns[Math.floor(0.05 * sortedReturns.length)];
        return percentile5 !== 0 ? Math.abs(percentile95 / percentile5) : 1;
    }
    // =================== REGIME ANALYSIS ===================
    calculateBearMarketPerformance() {
        // Simplified: negative returns periods
        const bearReturns = this.returns.filter(ret => ret < -0.01); // -1% threshold
        if (bearReturns.length === 0)
            return 0;
        return bearReturns.reduce((sum, ret) => sum + ret, 0) / bearReturns.length;
    }
    calculateBullMarketPerformance() {
        // Simplified: positive returns periods
        const bullReturns = this.returns.filter(ret => ret > 0.01); // +1% threshold
        if (bullReturns.length === 0)
            return 0;
        return bullReturns.reduce((sum, ret) => sum + ret, 0) / bullReturns.length;
    }
    calculateVolatilityAdjustedReturn() {
        if (this.returns.length < 30)
            return 0;
        const avgReturn = this.returns.reduce((sum, ret) => sum + ret, 0) / this.returns.length;
        const volatility = this.calculateStandardDeviation(this.returns);
        return volatility > 0 ? (avgReturn * 252) / (volatility * Math.sqrt(252)) : 0;
    }
    // =================== HELPER METHODS ===================
    calculateReturnsAndEquity(trades, initialBalance) {
        this.returns = [];
        this.drawdowns = [];
        this.equityCurve = [initialBalance];
        let currentBalance = initialBalance;
        let peak = initialBalance;
        for (const trade of trades) {
            const pnl = trade.pnl || 0;
            currentBalance += pnl;
            this.equityCurve.push(currentBalance);
            // Calculate return
            const dailyReturn = pnl / (currentBalance - pnl);
            this.returns.push(dailyReturn);
            // Calculate drawdown
            peak = Math.max(peak, currentBalance);
            const drawdown = peak > 0 ? (peak - currentBalance) / peak : 0;
            this.drawdowns.push(drawdown);
        }
    }
    calculateStandardDeviation(values) {
        if (values.length === 0)
            return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }
    assessRiskLevel(metrics) {
        let riskScore = 0;
        // VaR assessment
        if (metrics.var95 > 0.05)
            riskScore += 2;
        else if (metrics.var95 > 0.03)
            riskScore += 1;
        // Drawdown assessment
        if (metrics.ulcerIndex > 15)
            riskScore += 2;
        else if (metrics.ulcerIndex > 10)
            riskScore += 1;
        // System quality assessment
        if (metrics.systemQuality < 30)
            riskScore += 2;
        else if (metrics.systemQuality < 50)
            riskScore += 1;
        // Profit factor assessment
        if (metrics.profitFactor < 1)
            riskScore += 3;
        else if (metrics.profitFactor < 1.2)
            riskScore += 1;
        if (riskScore >= 6)
            return 'CRITICAL';
        if (riskScore >= 4)
            return 'HIGH';
        if (riskScore >= 2)
            return 'MEDIUM';
        return 'LOW';
    }
    generateAlerts(metrics) {
        const alerts = [];
        if (metrics.var95 > 0.05) {
            alerts.push(`🚨 HIGH RISK: Daily VaR 95% (${(metrics.var95 * 100).toFixed(2)}%) exceeds 5% threshold`);
        }
        if (metrics.systemQuality < 30) {
            alerts.push(`⚠️ POOR SYSTEM: System Quality (${metrics.systemQuality.toFixed(1)}) below acceptable threshold`);
        }
        if (metrics.profitFactor < 1) {
            alerts.push(`💰 UNPROFITABLE: Profit Factor (${metrics.profitFactor.toFixed(2)}) indicates net losses`);
        }
        if (metrics.ulcerIndex > 15) {
            alerts.push(`📉 HIGH DRAWDOWN: Ulcer Index (${metrics.ulcerIndex.toFixed(2)}) indicates excessive drawdowns`);
        }
        return alerts;
    }
    generateRecommendations(metrics) {
        const recommendations = [];
        if (metrics.var95 > 0.03) {
            recommendations.push('Consider reducing position sizes to lower risk exposure');
        }
        if (metrics.sortinoRatio < 1) {
            recommendations.push('Focus on strategies with better downside protection');
        }
        if (metrics.systemQuality < 50) {
            recommendations.push('Optimize strategy parameters to improve system quality');
        }
        if (metrics.profitFactor < 1.5) {
            recommendations.push('Review and improve trade entry/exit criteria');
        }
        return recommendations;
    }
    getDefaultMetrics() {
        return {
            var95: 0,
            var99: 0,
            cvar95: 0,
            cvar99: 0,
            sortinoRatio: 0,
            calmarRatio: 0,
            sterlingRatio: 0,
            ulcerIndex: 0,
            systemQuality: 0,
            profitFactor: 0,
            recoveryFactor: 0,
            skewness: 0,
            kurtosis: 0,
            tailRatio: 1,
            bearMarketPerformance: 0,
            bullMarketPerformance: 0,
            volatilityAdjustedReturn: 0
        };
    }
}
exports.EnterprisePerformanceAnalyzer = EnterprisePerformanceAnalyzer;

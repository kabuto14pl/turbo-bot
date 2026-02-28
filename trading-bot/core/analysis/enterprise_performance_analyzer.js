"use strict";
/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * ENTERPRISE PERFORMANCE TRACKER ENHANCEMENT V1.0
 * Turbo Bot Deva Trading Platform - Phase 1 Implementation
 *
 * This module extends the existing PerformanceTracker with additional
 * enterprise-grade metrics including VaR, CVaR, and advanced risk analytics.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnterprisePerformanceAnalyzer = void 0;
const logger_1 = require("../../infrastructure/logging/logger");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class EnterprisePerformanceAnalyzer {
    constructor(performanceTracker) {
        this.trades = [];
        this.equityCurve = [];
        this.riskFreeRate = 0.02; // 2% annual risk-free rate
        this.logger = new logger_1.Logger('EnterprisePerformanceAnalyzer');
        this.performanceTracker = performanceTracker;
        this.logger.info('🏗️ Enterprise Performance Analyzer initialized');
    }
    /**
     * Calculate comprehensive Value at Risk (VaR)
     */
    calculateVaR(returns, confidenceLevel = 0.95) {
        if (returns.length === 0)
            return 0;
        // Sort returns in ascending order
        const sortedReturns = [...returns].sort((a, b) => a - b);
        // Calculate VaR using historical simulation method
        const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
        const var95 = Math.abs(sortedReturns[index] || 0);
        this.logger.info(`📊 VaR ${(confidenceLevel * 100)}%: ${(var95 * 100).toFixed(2)}%`);
        return var95;
    }
    /**
     * Calculate Conditional Value at Risk (CVaR)
     */
    calculateCVaR(returns, confidenceLevel = 0.95) {
        if (returns.length === 0)
            return 0;
        const sortedReturns = [...returns].sort((a, b) => a - b);
        const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
        // CVaR is the average of returns below VaR threshold
        const tailReturns = sortedReturns.slice(0, index + 1);
        const cvar = Math.abs(tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length);
        this.logger.info(`📊 CVaR ${(confidenceLevel * 100)}%: ${(cvar * 100).toFixed(2)}%`);
        return cvar;
    }
    /**
     * Calculate Ulcer Index (drawdown-based risk measure)
     */
    calculateUlcerIndex(returns) {
        if (returns.length === 0)
            return 0;
        const cumulativeReturns = this.calculateCumulativeReturns(returns);
        const runningMax = [];
        let maxValue = cumulativeReturns[0];
        // Calculate running maximum
        for (let i = 0; i < cumulativeReturns.length; i++) {
            maxValue = Math.max(maxValue, cumulativeReturns[i]);
            runningMax.push(maxValue);
        }
        // Calculate drawdowns
        const drawdowns = cumulativeReturns.map((value, i) => ((runningMax[i] - value) / runningMax[i]) * 100);
        // Ulcer Index = sqrt(average of squared drawdowns)
        const squaredDrawdowns = drawdowns.map(dd => dd * dd);
        const avgSquaredDD = squaredDrawdowns.reduce((sum, dd) => sum + dd, 0) / squaredDrawdowns.length;
        return Math.sqrt(avgSquaredDD);
    }
    /**
     * Calculate Sortino Ratio (return/downside deviation)
     */
    calculateSortinoRatio(returns) {
        if (returns.length === 0)
            return 0;
        const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const downsideReturns = returns.filter(ret => ret < 0);
        if (downsideReturns.length === 0)
            return Infinity;
        const downsideDeviation = Math.sqrt(downsideReturns.reduce((sum, ret) => sum + ret * ret, 0) / downsideReturns.length);
        const annualizedReturn = avgReturn * 252; // Assuming daily returns
        const annualizedDownsideDeviation = downsideDeviation * Math.sqrt(252);
        return (annualizedReturn - this.riskFreeRate) / annualizedDownsideDeviation;
    }
    /**
     * Calculate Calmar Ratio (annual return/max drawdown)
     */
    calculateCalmarRatio(returns) {
        if (returns.length === 0)
            return 0;
        const annualizedReturn = this.calculateAnnualizedReturn(returns);
        const maxDrawdown = this.calculateMaxDrawdownFromReturns(returns);
        if (maxDrawdown === 0)
            return Infinity;
        return annualizedReturn / (maxDrawdown * 100);
    }
    /**
     * Calculate Information Ratio
     */
    calculateInformationRatio(returns, benchmarkReturns) {
        if (returns.length === 0 || benchmarkReturns.length === 0)
            return 0;
        const excessReturns = returns.map((ret, i) => ret - (benchmarkReturns[i] || 0));
        const avgExcessReturn = excessReturns.reduce((sum, ret) => sum + ret, 0) / excessReturns.length;
        const trackingError = this.calculateStandardDeviation(excessReturns);
        if (trackingError === 0)
            return 0;
        return (avgExcessReturn * 252) / (trackingError * Math.sqrt(252)); // Annualized
    }
    /**
     * Calculate comprehensive enterprise risk metrics
     */
    calculateEnterpriseRiskMetrics(trades) {
        this.logger.info('🔍 Calculating comprehensive enterprise risk metrics...');
        const returns = this.extractReturns(trades);
        const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
        const losingTrades = trades.filter(t => (t.pnl || 0) < 0);
        const var95 = this.calculateVaR(returns, 0.95);
        const var99 = this.calculateVaR(returns, 0.99);
        const cvar95 = this.calculateCVaR(returns, 0.95);
        const cvar99 = this.calculateCVaR(returns, 0.99);
        const grossProfit = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
        const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
        const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
        const metrics = {
            var95,
            var99,
            cvar95,
            cvar99,
            expectedShortfall: cvar95, // ES is equivalent to CVaR
            maxConsecutiveLosses: this.calculateMaxConsecutiveLosses(trades),
            maxConsecutiveWins: this.calculateMaxConsecutiveWins(trades),
            profitFactor: grossLoss > 0 ? grossProfit / grossLoss : 0,
            recoveryFactor: this.calculateRecoveryFactor(trades),
            payoffRatio: avgLoss > 0 ? avgWin / avgLoss : 0,
            avgTradeDuration: this.calculateAverageTradeDuration(trades),
            systemQuality: this.calculateSystemQuality(trades),
            ulcerIndex: this.calculateUlcerIndex(returns),
            calmarRatio: this.calculateCalmarRatio(returns),
            sortinoRatio: this.calculateSortinoRatio(returns),
            treynorRatio: this.calculateTreynorRatio(returns),
            informationRatio: this.calculateInformationRatio(returns, []), // TODO: Add benchmark
            trackingError: this.calculateStandardDeviation(returns) * Math.sqrt(252),
            skewness: this.calculateSkewness(returns),
            kurtosis: this.calculateKurtosis(returns),
            gainToPainRatio: grossLoss > 0 ? grossProfit / grossLoss : 0,
            sterlingRatio: this.calculateSterlingRatio(returns),
            burkeRatio: this.calculateBurkeRatio(returns)
        };
        this.logger.info('✅ Enterprise risk metrics calculated successfully');
        return metrics;
    }
    /**
     * Generate comprehensive performance report
     */
    async generateComprehensiveReport(trades, startDate, endDate) {
        this.logger.info('📊 Generating comprehensive performance report...');
        const returns = this.extractReturns(trades);
        const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
        const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const report = {
            timestamp: new Date(),
            period: {
                start: startDate,
                end: endDate,
                duration: (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            },
            basic: {
                totalReturn: totalPnL,
                annualizedReturn: this.calculateAnnualizedReturn(returns),
                sharpeRatio: this.calculateSharpeRatio(returns),
                maxDrawdown: this.calculateMaxDrawdownFromReturns(returns),
                winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
                totalTrades: trades.length
            },
            risk: this.calculateEnterpriseRiskMetrics(trades),
            equity: await this.generateEquityCurve(trades),
            trades: trades,
            recommendations: [],
            warnings: []
        };
        // Calculate metrics once and pass to recommendation/warning generators
        const riskMetrics = report.risk;
        report.recommendations = this.generateRecommendationsWithMetrics(trades, riskMetrics);
        report.warnings = this.generateWarningsWithMetrics(trades, riskMetrics);
        // Save report to file
        await this.saveReport(report);
        this.logger.info('✅ Comprehensive performance report generated');
        return report;
    }
    /**
     * Generate equity curve data
     */
    async generateEquityCurve(trades) {
        const equityCurve = [];
        let cumulativePnL = 0;
        let portfolioValue = 10000; // Starting capital
        const rollingWindow = 30; // 30-period rolling calculations
        for (let i = 0; i < trades.length; i++) {
            const trade = trades[i];
            cumulativePnL += trade.pnl || 0;
            portfolioValue += trade.pnl || 0;
            // Calculate rolling metrics
            const rollingTrades = trades.slice(Math.max(0, i - rollingWindow), i + 1);
            const rollingReturns = this.extractReturns(rollingTrades);
            const equityPoint = {
                timestamp: trade.exitTime || trade.entryTime,
                portfolioValue,
                unrealizedPnL: 0, // TODO: Calculate from open positions
                realizedPnL: cumulativePnL,
                drawdown: this.calculateDrawdownAtPoint(portfolioValue, equityCurve),
                returns: trade.pnl || 0,
                cumulativeReturns: cumulativePnL,
                rollingVaR95: this.calculateVaR(rollingReturns, 0.95),
                rollingVaR99: this.calculateVaR(rollingReturns, 0.99),
                rollingVolatility: this.calculateStandardDeviation(rollingReturns) * Math.sqrt(252),
                rollingSharpe: this.calculateSharpeRatio(rollingReturns)
            };
            equityCurve.push(equityPoint);
        }
        return equityCurve;
    }
    /**
     * Generate performance recommendations with pre-calculated metrics
     */
    generateRecommendationsWithMetrics(trades, metrics) {
        const recommendations = [];
        const returns = this.extractReturns(trades);
        const sharpeRatio = this.calculateSharpeRatio(returns);
        const maxDrawdown = this.calculateMaxDrawdownFromReturns(returns);
        if (sharpeRatio < 1.0) {
            recommendations.push('Consider improving risk-adjusted returns by optimizing strategy parameters');
        }
        if (maxDrawdown > 20) {
            recommendations.push('Implement stricter risk management to reduce maximum drawdown');
        }
        if (metrics.var95 > 0.05) {
            recommendations.push('Daily VaR exceeds 5% - consider reducing position sizes');
        }
        if (metrics.payoffRatio < 1.0) {
            recommendations.push('Improve win/loss ratio by optimizing exit strategies');
        }
        if (metrics.maxConsecutiveLosses > 5) {
            recommendations.push('Implement circuit breakers to limit consecutive losses');
        }
        return recommendations;
    }
    /**
     * Generate performance recommendations (legacy method for backward compatibility)
     */
    generateRecommendations(trades) {
        const metrics = this.calculateEnterpriseRiskMetrics(trades);
        return this.generateRecommendationsWithMetrics(trades, metrics);
    }
    /**
     * Generate performance warnings with pre-calculated metrics
     */
    generateWarningsWithMetrics(trades, metrics) {
        const warnings = [];
        const returns = this.extractReturns(trades);
        const sharpeRatio = this.calculateSharpeRatio(returns);
        const maxDrawdown = this.calculateMaxDrawdownFromReturns(returns);
        if (sharpeRatio < 0) {
            warnings.push('CRITICAL: Negative Sharpe ratio indicates poor risk-adjusted performance');
        }
        if (maxDrawdown > 50) {
            warnings.push('CRITICAL: Maximum drawdown exceeds 50% - severe risk detected');
        }
        if (metrics.var99 > 0.10) {
            warnings.push('HIGH RISK: 99% VaR exceeds 10% - extreme tail risk detected');
        }
        if (trades.length < 30) {
            warnings.push('WARNING: Insufficient trade sample size for statistical significance');
        }
        return warnings;
    }
    /**
     * Generate performance warnings (legacy method for backward compatibility)
     */
    generateWarnings(trades) {
        const metrics = this.calculateEnterpriseRiskMetrics(trades);
        return this.generateWarningsWithMetrics(trades, metrics);
    }
    /**
     * Save performance report to file
     */
    async saveReport(report) {
        const reportsDir = './reports/performance';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `performance_report_${timestamp}.json`;
        const filepath = path.join(reportsDir, filename);
        try {
            // Ensure directory exists
            await fs.mkdir(reportsDir, { recursive: true });
            // Save report
            await fs.writeFile(filepath, JSON.stringify(report, null, 2));
            this.logger.info(`📊 Performance report saved: ${filepath}`);
        }
        catch (error) {
            this.logger.error('Failed to save performance report:', error);
        }
    }
    // Helper methods for calculations
    extractReturns(trades) {
        return trades.map(t => t.pnl || 0).filter(pnl => pnl !== 0);
    }
    calculateCumulativeReturns(returns) {
        const cumulative = [];
        let sum = 0;
        for (const ret of returns) {
            sum += ret;
            cumulative.push(sum);
        }
        return cumulative;
    }
    calculateAnnualizedReturn(returns) {
        if (returns.length === 0)
            return 0;
        const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        return avgReturn * 252; // Assuming daily returns
    }
    calculateSharpeRatio(returns) {
        if (returns.length === 0)
            return 0;
        const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const stdDev = this.calculateStandardDeviation(returns);
        if (stdDev === 0)
            return 0;
        const annualizedReturn = avgReturn * 252;
        const annualizedStdDev = stdDev * Math.sqrt(252);
        return (annualizedReturn - this.riskFreeRate) / annualizedStdDev;
    }
    calculateStandardDeviation(returns) {
        if (returns.length === 0)
            return 0;
        const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }
    calculateMaxDrawdownFromReturns(returns) {
        if (returns.length === 0)
            return 0;
        const cumulative = this.calculateCumulativeReturns(returns);
        let maxDrawdown = 0;
        let peak = cumulative[0];
        for (const value of cumulative) {
            if (value > peak) {
                peak = value;
            }
            const drawdown = (peak - value) / peak;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        }
        return maxDrawdown * 100; // Return as percentage
    }
    calculateMaxConsecutiveWins(trades) {
        let maxConsecutive = 0;
        let currentConsecutive = 0;
        for (const trade of trades) {
            if ((trade.pnl || 0) > 0) {
                currentConsecutive++;
                maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
            }
            else {
                currentConsecutive = 0;
            }
        }
        return maxConsecutive;
    }
    calculateRecoveryFactor(trades) {
        const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const returns = this.extractReturns(trades);
        const maxDrawdown = this.calculateMaxDrawdownFromReturns(returns);
        if (maxDrawdown === 0)
            return Infinity;
        return totalPnL / (maxDrawdown / 100);
    }
    calculateAverageTradeDuration(trades) {
        const durations = trades
            .filter(t => t.exitTime && t.entryTime)
            .map(t => (t.exitTime.getTime() - t.entryTime.getTime()) / (1000 * 60 * 60)); // Hours
        if (durations.length === 0)
            return 0;
        return durations.reduce((sum, d) => sum + d, 0) / durations.length;
    }
    calculateMaxConsecutiveLosses(trades) {
        if (trades.length === 0)
            return 0;
        let maxConsecutive = 0;
        let currentConsecutive = 0;
        for (const trade of trades) {
            if ((trade.pnl || 0) < 0) {
                currentConsecutive++;
                maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
            }
            else {
                currentConsecutive = 0;
            }
        }
        return maxConsecutive;
    }
    calculateSystemQuality(trades) {
        // Comprehensive system quality score (0-100)
        const returns = this.extractReturns(trades);
        const sharpeRatio = this.calculateSharpeRatio(returns);
        const maxDrawdown = this.calculateMaxDrawdownFromReturns(returns);
        let score = 0;
        // Sharpe ratio component (0-30 points)
        score += Math.min(30, Math.max(0, sharpeRatio * 10));
        // Win rate component (0-20 points)
        const winRate = trades.length > 0 ?
            (trades.filter(t => (t.pnl || 0) > 0).length / trades.length) * 100 : 0;
        score += Math.min(20, winRate / 5);
        // Profit factor component (0-20 points) - calculate directly
        const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
        const losingTrades = trades.filter(t => (t.pnl || 0) < 0);
        const grossProfit = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
        score += Math.min(20, profitFactor * 10);
        // Drawdown component (0-15 points, inverse relationship)
        score += Math.max(0, 15 - (maxDrawdown / 2));
        // Consistency component (0-15 points) - calculate directly
        const maxConsecutiveLosses = this.calculateMaxConsecutiveLosses(trades);
        const consistencyScore = 100 / (1 + maxConsecutiveLosses);
        score += Math.min(15, consistencyScore);
        return Math.round(score);
    }
    calculateTreynorRatio(returns) {
        // Simplified Treynor ratio (would need market beta for proper calculation)
        const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const annualizedReturn = avgReturn * 252;
        // Using volatility as proxy for beta (1.0)
        const beta = 1.0; // TODO: Calculate actual beta vs market
        return (annualizedReturn - this.riskFreeRate) / beta;
    }
    calculateSkewness(returns) {
        if (returns.length < 3)
            return 0;
        const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const stdDev = this.calculateStandardDeviation(returns);
        if (stdDev === 0)
            return 0;
        const skewness = returns.reduce((sum, ret) => {
            return sum + Math.pow((ret - mean) / stdDev, 3);
        }, 0) / returns.length;
        return skewness;
    }
    calculateKurtosis(returns) {
        if (returns.length < 4)
            return 0;
        const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const stdDev = this.calculateStandardDeviation(returns);
        if (stdDev === 0)
            return 0;
        const kurtosis = returns.reduce((sum, ret) => {
            return sum + Math.pow((ret - mean) / stdDev, 4);
        }, 0) / returns.length;
        return kurtosis - 3; // Excess kurtosis
    }
    calculateSterlingRatio(returns) {
        const annualizedReturn = this.calculateAnnualizedReturn(returns);
        const avgDrawdown = this.calculateAverageDrawdown(returns);
        if (avgDrawdown === 0)
            return Infinity;
        return annualizedReturn / avgDrawdown;
    }
    calculateBurkeRatio(returns) {
        const annualizedReturn = this.calculateAnnualizedReturn(returns);
        const drawdownSqrt = Math.sqrt(this.calculateAverageDrawdown(returns));
        if (drawdownSqrt === 0)
            return Infinity;
        return annualizedReturn / drawdownSqrt;
    }
    calculateAverageDrawdown(returns) {
        const cumulative = this.calculateCumulativeReturns(returns);
        const drawdowns = [];
        let peak = cumulative[0];
        for (const value of cumulative) {
            if (value > peak) {
                peak = value;
            }
            const drawdown = (peak - value) / peak * 100;
            if (drawdown > 0) {
                drawdowns.push(drawdown);
            }
        }
        if (drawdowns.length === 0)
            return 0;
        return drawdowns.reduce((sum, dd) => sum + dd, 0) / drawdowns.length;
    }
    calculateDrawdownAtPoint(currentValue, equityCurve) {
        if (equityCurve.length === 0)
            return 0;
        const maxValue = Math.max(...equityCurve.map(point => point.portfolioValue), currentValue);
        return ((maxValue - currentValue) / maxValue) * 100;
    }
}
exports.EnterprisePerformanceAnalyzer = EnterprisePerformanceAnalyzer;

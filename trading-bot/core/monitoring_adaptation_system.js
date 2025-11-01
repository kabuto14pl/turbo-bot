"use strict";
/**
 * 🚀 [PRODUCTION-OPERATIONAL]
 * Production monitoring component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * Continuous Monitoring and Adaptation System - Phase 4.1
 *
 * Implementuje zaawansowany system ciągłego ulepszania strategii:
 * - Monitorowanie wydajności w czasie rzeczywistym
 * - Automatyczna adaptacja parametrów
 * - System alertów i degradacji
 * - Feedback loop optimization
 * - Performance tracking i analytics
 *
 * @author Turbo Bot Deva
 * @version 4.1.0
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
exports.MonitoringAndAdaptationSystem = exports.StrategyHealthAnalyzer = exports.AdaptiveParameterOptimizer = exports.PerformanceTracker = void 0;
const fs = __importStar(require("fs"));
const events_1 = require("events");
// ============================================================================
// PERFORMANCE TRACKER
// ============================================================================
class PerformanceTracker extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.metrics = new Map();
        this.marketConditions = [];
        this.config = config;
    }
    /**
     * Dodaje nowe metryki wydajności dla strategii
     */
    addMetrics(strategyId, metrics) {
        if (!this.metrics.has(strategyId)) {
            this.metrics.set(strategyId, []);
        }
        const strategyMetrics = this.metrics.get(strategyId);
        strategyMetrics.push(metrics);
        // Limit history size
        if (strategyMetrics.length > this.config.performanceHistorySize) {
            strategyMetrics.shift();
        }
        this.emit('metricsAdded', { strategyId, metrics });
        this.checkAlerts(strategyId, metrics);
    }
    /**
     * Aktualizuje stan rynku
     */
    updateMarketCondition(condition) {
        this.marketConditions.push(condition);
        // Limit history
        const maxHistory = this.config.lookbackPeriod * 24 * 60; // Assuming 1-minute updates
        if (this.marketConditions.length > maxHistory) {
            this.marketConditions.shift();
        }
        this.emit('marketConditionUpdated', condition);
    }
    /**
     * Oblicza degradację wydajności strategii
     */
    calculatePerformanceDegradation(strategyId) {
        const metrics = this.metrics.get(strategyId);
        if (!metrics || metrics.length < 2)
            return 0;
        const recentMetrics = metrics.slice(-10); // Last 10 periods
        const baselineMetrics = metrics.slice(0, Math.min(metrics.length, 50)); // First 50 periods
        const recentReturn = recentMetrics.reduce((sum, m) => sum + m.totalReturn, 0) / recentMetrics.length;
        const baselineReturn = baselineMetrics.reduce((sum, m) => sum + m.totalReturn, 0) / baselineMetrics.length;
        const recentSharpe = recentMetrics.reduce((sum, m) => sum + m.sharpeRatio, 0) / recentMetrics.length;
        const baselineSharpe = baselineMetrics.reduce((sum, m) => sum + m.sharpeRatio, 0) / baselineMetrics.length;
        // Calculate degradation as weighted combination of return and Sharpe decline
        const returnDegradation = Math.max(0, (baselineReturn - recentReturn) / Math.abs(baselineReturn));
        const sharpeDegradation = Math.max(0, (baselineSharpe - recentSharpe) / Math.abs(baselineSharpe));
        return (returnDegradation * 0.6 + sharpeDegradation * 0.4);
    }
    /**
     * Sprawdza alerty dla strategii
     */
    checkAlerts(strategyId, metrics) {
        const alerts = this.config.alertConfig;
        if (!alerts.enabled)
            return;
        const alertsTriggered = [];
        // Performance alerts
        if (metrics.maxDrawdown > alerts.maxDrawdownThreshold) {
            alertsTriggered.push(`Max drawdown exceeded: ${(metrics.maxDrawdown * 100).toFixed(2)}%`);
        }
        if (metrics.sharpeRatio < alerts.sharpeDeclineThreshold) {
            alertsTriggered.push(`Sharpe ratio below threshold: ${metrics.sharpeRatio.toFixed(2)}`);
        }
        if (metrics.totalReturn < alerts.returnDeclineThreshold) {
            alertsTriggered.push(`Return below threshold: ${(metrics.totalReturn * 100).toFixed(2)}%`);
        }
        // Risk alerts
        if (metrics.volatility > alerts.volatilityIncreaseThreshold) {
            alertsTriggered.push(`Volatility spike: ${(metrics.volatility * 100).toFixed(2)}%`);
        }
        if (metrics.var95 < -alerts.var95ExceedanceThreshold) {
            alertsTriggered.push(`VaR 95% exceeded: ${(metrics.var95 * 100).toFixed(2)}%`);
        }
        // Emit alerts
        if (alertsTriggered.length > 0) {
            this.emit('alertTriggered', {
                strategyId,
                timestamp: Date.now(),
                alerts: alertsTriggered,
                severity: this.calculateAlertSeverity(alertsTriggered),
                metrics
            });
        }
    }
    calculateAlertSeverity(alerts) {
        if (alerts.some(alert => alert.includes('Max drawdown') && alert.includes('30')))
            return 'critical';
        if (alerts.some(alert => alert.includes('VaR') || alert.includes('Volatility spike')))
            return 'high';
        if (alerts.length >= 3)
            return 'high';
        if (alerts.length >= 2)
            return 'medium';
        return 'low';
    }
    /**
     * Zwraca najnowsze metryki dla strategii
     */
    getLatestMetrics(strategyId) {
        const metrics = this.metrics.get(strategyId);
        return metrics && metrics.length > 0 ? metrics[metrics.length - 1] : null;
    }
    /**
     * Zwraca historię metryk dla strategii
     */
    getMetricsHistory(strategyId, limit) {
        const metrics = this.metrics.get(strategyId) || [];
        return limit ? metrics.slice(-limit) : metrics;
    }
    /**
     * Zwraca obecny stan rynku
     */
    getCurrentMarketCondition() {
        return this.marketConditions.length > 0 ? this.marketConditions[this.marketConditions.length - 1] : null;
    }
}
exports.PerformanceTracker = PerformanceTracker;
// ============================================================================
// ADAPTIVE PARAMETER OPTIMIZER
// ============================================================================
class AdaptiveParameterOptimizer extends events_1.EventEmitter {
    constructor(tracker, config) {
        super();
        this.lastAdaptations = new Map();
        this.adaptationHistory = new Map();
        this.tracker = tracker;
        this.config = config;
    }
    /**
     * Sprawdza czy strategia wymaga adaptacji i wykonuje ją
     */
    async checkAndAdapt(strategyId, currentParameters) {
        if (!this.config.adaptationEnabled)
            return null;
        // Check cooldown period
        const lastAdaptation = this.lastAdaptations.get(strategyId) || 0;
        const cooldownMs = this.config.cooldownPeriod * 60 * 1000;
        if (Date.now() - lastAdaptation < cooldownMs) {
            return null;
        }
        // Check daily adaptation limit
        const today = new Date().toDateString();
        const todayAdaptations = this.getTodayAdaptations(strategyId);
        if (todayAdaptations >= this.config.maxAdaptationsPerDay) {
            return null;
        }
        // Analyze if adaptation is needed
        const adaptationNeed = await this.analyzeAdaptationNeed(strategyId);
        if (adaptationNeed.score < this.config.adaptationSensitivity) {
            return null;
        }
        // Perform adaptation
        const adaptation = await this.performAdaptation(strategyId, currentParameters, adaptationNeed);
        if (adaptation) {
            this.recordAdaptation(strategyId, adaptation);
            this.lastAdaptations.set(strategyId, Date.now());
            this.emit('adaptationPerformed', adaptation);
        }
        return adaptation;
    }
    /**
     * Analizuje czy strategia potrzebuje adaptacji
     */
    async analyzeAdaptationNeed(strategyId) {
        const metrics = this.tracker.getMetricsHistory(strategyId, 20);
        const marketCondition = this.tracker.getCurrentMarketCondition();
        if (metrics.length < 5) {
            return { score: 0, reasons: ['Insufficient data'], urgency: 'low', recommendedActions: [] };
        }
        let adaptationScore = 0;
        const reasons = [];
        const recommendedActions = [];
        // Performance degradation analysis
        const degradation = this.tracker.calculatePerformanceDegradation(strategyId);
        if (degradation > 0.2) {
            adaptationScore += 0.4;
            reasons.push(`Performance degradation: ${(degradation * 100).toFixed(1)}%`);
            recommendedActions.push('Adjust risk parameters');
        }
        // Recent performance analysis
        const recentMetrics = metrics.slice(-5);
        const avgRecentSharpe = recentMetrics.reduce((sum, m) => sum + m.sharpeRatio, 0) / recentMetrics.length;
        const avgRecentDrawdown = recentMetrics.reduce((sum, m) => sum + m.currentDrawdown, 0) / recentMetrics.length;
        if (avgRecentSharpe < 0.5) {
            adaptationScore += 0.3;
            reasons.push(`Low recent Sharpe ratio: ${avgRecentSharpe.toFixed(2)}`);
            recommendedActions.push('Optimize entry/exit conditions');
        }
        if (avgRecentDrawdown > 0.1) {
            adaptationScore += 0.25;
            reasons.push(`High recent drawdown: ${(avgRecentDrawdown * 100).toFixed(1)}%`);
            recommendedActions.push('Tighten stop losses');
        }
        // Market regime change analysis
        if (marketCondition) {
            const historicalRegimes = metrics.map(m => m.marketRegime);
            const recentRegime = marketCondition.regime;
            const regimeStability = this.calculateRegimeStability(historicalRegimes);
            if (regimeStability < 0.5) {
                adaptationScore += 0.2;
                reasons.push(`Market regime instability: ${recentRegime}`);
                recommendedActions.push('Adjust for market regime');
            }
        }
        // Volatility change analysis
        const recentVolatility = recentMetrics.reduce((sum, m) => sum + m.volatility, 0) / recentMetrics.length;
        const historicalVolatility = metrics.slice(0, -5).reduce((sum, m) => sum + m.volatility, 0) / Math.max(1, metrics.length - 5);
        const volatilityChange = Math.abs(recentVolatility - historicalVolatility) / historicalVolatility;
        if (volatilityChange > 0.3) {
            adaptationScore += 0.15;
            reasons.push(`Volatility regime change: ${(volatilityChange * 100).toFixed(1)}%`);
            recommendedActions.push('Adjust position sizing');
        }
        // Determine urgency
        let urgency = 'low';
        if (adaptationScore > 0.8)
            urgency = 'critical';
        else if (adaptationScore > 0.6)
            urgency = 'high';
        else if (adaptationScore > 0.4)
            urgency = 'medium';
        return {
            score: adaptationScore,
            reasons,
            urgency,
            recommendedActions
        };
    }
    /**
     * Wykonuje adaptację parametrów strategii
     */
    async performAdaptation(strategyId, currentParameters, adaptationNeed) {
        const metrics = this.tracker.getLatestMetrics(strategyId);
        const marketCondition = this.tracker.getCurrentMarketCondition();
        if (!metrics || !marketCondition)
            return null;
        // Create new parameters based on adaptation need
        const newParameters = this.generateAdaptedParameters(currentParameters, adaptationNeed, marketCondition);
        const adaptation = {
            timestamp: Date.now(),
            strategyId,
            actionType: this.determineActionType(adaptationNeed),
            reason: adaptationNeed.reasons.join('; '),
            confidence: this.calculateAdaptationConfidence(adaptationNeed),
            oldParameters: { ...currentParameters },
            oldPerformance: metrics,
            newParameters,
            expectedImprovement: this.estimateImprovement(adaptationNeed),
            marketCondition,
            triggerThreshold: this.config.adaptationSensitivity,
            adaptationStrength: adaptationNeed.score
        };
        return adaptation;
    }
    /**
     * Generuje nowe parametry na podstawie potrzeb adaptacji
     */
    generateAdaptedParameters(currentParams, adaptationNeed, marketCondition) {
        const newParams = { ...currentParams };
        // Adapt based on market regime
        if (marketCondition.regime === 'volatile') {
            // Increase position sizing caution in volatile markets
            if (typeof newParams.positionSize === 'number') {
                newParams.positionSize *= 0.8;
            }
            if (typeof newParams.stopLoss === 'number') {
                newParams.stopLoss *= 1.2; // Wider stops
            }
        }
        else if (marketCondition.regime === 'bull') {
            // More aggressive in bull markets
            if (typeof newParams.positionSize === 'number') {
                newParams.positionSize *= 1.1;
            }
        }
        else if (marketCondition.regime === 'bear') {
            // More conservative in bear markets
            if (typeof newParams.positionSize === 'number') {
                newParams.positionSize *= 0.7;
            }
            if (typeof newParams.stopLoss === 'number') {
                newParams.stopLoss *= 0.9; // Tighter stops
            }
        }
        // Adapt RSI parameters if present
        if (typeof newParams.rsiPeriod === 'number') {
            if (marketCondition.volatility > 0.03) {
                newParams.rsiPeriod = Math.min(25, newParams.rsiPeriod + 2); // Longer period for high volatility
            }
            else {
                newParams.rsiPeriod = Math.max(10, newParams.rsiPeriod - 1); // Shorter for low volatility
            }
        }
        // Adapt MACD parameters if present
        if (typeof newParams.macdFast === 'number' && typeof newParams.macdSlow === 'number') {
            if (marketCondition.trend > 0.02) {
                // Strong trend - use faster MACD
                newParams.macdFast = Math.max(8, newParams.macdFast - 1);
                newParams.macdSlow = Math.max(20, newParams.macdSlow - 2);
            }
            else {
                // Weak trend - use slower MACD
                newParams.macdFast = Math.min(16, newParams.macdFast + 1);
                newParams.macdSlow = Math.min(30, newParams.macdSlow + 2);
            }
        }
        return newParams;
    }
    determineActionType(adaptationNeed) {
        if (adaptationNeed.urgency === 'critical')
            return 'emergency_stop';
        if (adaptationNeed.score > 0.7)
            return 'strategy_replacement';
        if (adaptationNeed.score > 0.5)
            return 'weight_rebalancing';
        return 'parameter_adjustment';
    }
    calculateAdaptationConfidence(adaptationNeed) {
        return Math.min(adaptationNeed.score * 1.2, 1.0);
    }
    estimateImprovement(adaptationNeed) {
        return adaptationNeed.score * 0.1; // Estimated 10% improvement per adaptation score point
    }
    calculateRegimeStability(regimes) {
        if (regimes.length < 2)
            return 1.0;
        let changes = 0;
        for (let i = 1; i < regimes.length; i++) {
            if (regimes[i] !== regimes[i - 1])
                changes++;
        }
        return 1.0 - (changes / (regimes.length - 1));
    }
    getTodayAdaptations(strategyId) {
        const today = new Date().toDateString();
        const history = this.adaptationHistory.get(strategyId) || [];
        return history.filter(a => new Date(a.timestamp).toDateString() === today).length;
    }
    recordAdaptation(strategyId, adaptation) {
        if (!this.adaptationHistory.has(strategyId)) {
            this.adaptationHistory.set(strategyId, []);
        }
        const history = this.adaptationHistory.get(strategyId);
        history.push(adaptation);
        // Limit history size
        if (history.length > 100) {
            history.shift();
        }
    }
    /**
     * Zwraca historię adaptacji dla strategii
     */
    getAdaptationHistory(strategyId) {
        return this.adaptationHistory.get(strategyId) || [];
    }
}
exports.AdaptiveParameterOptimizer = AdaptiveParameterOptimizer;
// ============================================================================
// STRATEGY HEALTH ANALYZER
// ============================================================================
class StrategyHealthAnalyzer extends events_1.EventEmitter {
    constructor(tracker, optimizer) {
        super();
        this.tracker = tracker;
        this.optimizer = optimizer;
    }
    /**
     * Generuje kompleksowy raport zdrowia strategii
     */
    async generateHealthReport(strategyId) {
        const metrics = this.tracker.getMetricsHistory(strategyId, 50);
        const latestMetrics = this.tracker.getLatestMetrics(strategyId);
        const adaptationHistory = this.optimizer.getAdaptationHistory(strategyId);
        if (!latestMetrics || metrics.length < 2) {
            // Return default report for strategies with insufficient data
            return this.generateDefaultHealthReport(strategyId, latestMetrics);
        }
        const performanceScore = this.calculatePerformanceScore(metrics);
        const stabilityScore = this.calculateStabilityScore(metrics);
        const riskScore = this.calculateRiskScore(metrics);
        const adaptabilityScore = this.calculateAdaptabilityScore(adaptationHistory);
        const healthScore = (performanceScore * 0.35 + stabilityScore * 0.25 + riskScore * 0.25 + adaptabilityScore * 0.15);
        const trend = this.analyzeTrend(metrics);
        const recommendations = await this.generateRecommendations(metrics, healthScore, trend);
        const predictions = this.generatePredictions(metrics);
        const report = {
            strategyId,
            timestamp: Date.now(),
            healthScore: Math.round(healthScore),
            performanceScore: Math.round(performanceScore),
            stabilityScore: Math.round(stabilityScore),
            riskScore: Math.round(riskScore),
            adaptabilityScore: Math.round(adaptabilityScore),
            performanceTrend: trend.direction,
            trendConfidence: trend.confidence,
            recommendations,
            predictedPerformance: predictions
        };
        this.emit('healthReportGenerated', report);
        return report;
    }
    /**
     * Generuje domyślny raport zdrowia dla strategii z niewystarczającymi danymi
     */
    generateDefaultHealthReport(strategyId, latestMetrics) {
        const now = Date.now();
        // Default scores for insufficient data
        const defaultHealthScore = 50; // Neutral score
        const defaultPerformanceScore = latestMetrics ? Math.min(100, Math.max(0, (latestMetrics.totalReturn + 0.2) * 250)) : 50;
        const defaultStabilityScore = 50;
        const defaultRiskScore = 50;
        const defaultAdaptabilityScore = 70; // Neutral for no adaptations
        return {
            strategyId,
            timestamp: now,
            healthScore: defaultHealthScore,
            performanceScore: Math.round(defaultPerformanceScore),
            stabilityScore: defaultStabilityScore,
            riskScore: defaultRiskScore,
            adaptabilityScore: defaultAdaptabilityScore,
            performanceTrend: 'stable',
            trendConfidence: 0.1, // Low confidence due to insufficient data
            recommendations: [{
                    action: 'continue',
                    confidence: 0.3,
                    reason: 'Insufficient historical data for comprehensive analysis',
                    urgency: 'low'
                }],
            predictedPerformance: {
                nextPeriod: latestMetrics?.totalReturn || 0,
                confidence: 0.1,
                scenarios: {
                    optimistic: (latestMetrics?.totalReturn || 0) * 1.1,
                    realistic: latestMetrics?.totalReturn || 0,
                    pessimistic: (latestMetrics?.totalReturn || 0) * 0.9
                }
            }
        };
    }
    calculatePerformanceScore(metrics) {
        const recentMetrics = metrics.slice(-10);
        const avgReturn = recentMetrics.reduce((sum, m) => sum + m.totalReturn, 0) / recentMetrics.length;
        const avgSharpe = recentMetrics.reduce((sum, m) => sum + m.sharpeRatio, 0) / recentMetrics.length;
        const avgWinRate = recentMetrics.reduce((sum, m) => sum + m.winRate, 0) / recentMetrics.length;
        // Normalize to 0-100 scale
        const returnScore = Math.min(100, Math.max(0, (avgReturn + 0.2) * 250)); // -20% to +20% mapped to 0-100
        const sharpeScore = Math.min(100, Math.max(0, avgSharpe * 33.33)); // 0 to 3 Sharpe mapped to 0-100
        const winRateScore = avgWinRate * 100;
        return (returnScore * 0.4 + sharpeScore * 0.4 + winRateScore * 0.2);
    }
    calculateStabilityScore(metrics) {
        if (metrics.length < 2)
            return 50;
        const returns = metrics.map(m => m.totalReturn);
        const sharpes = metrics.map(m => m.sharpeRatio);
        const returnStd = this.calculateStandardDeviation(returns);
        const sharpeStd = this.calculateStandardDeviation(sharpes);
        // Lower standard deviation = higher stability
        const returnStability = Math.max(0, 100 - (returnStd * 500));
        const sharpeStability = Math.max(0, 100 - (sharpeStd * 50));
        return (returnStability + sharpeStability) / 2;
    }
    calculateRiskScore(metrics) {
        const recentMetrics = metrics.slice(-10);
        const avgDrawdown = recentMetrics.reduce((sum, m) => sum + m.maxDrawdown, 0) / recentMetrics.length;
        const avgVolatility = recentMetrics.reduce((sum, m) => sum + m.volatility, 0) / recentMetrics.length;
        const avgVaR = recentMetrics.reduce((sum, m) => sum + Math.abs(m.var95), 0) / recentMetrics.length;
        // Lower risk = higher score
        const drawdownScore = Math.max(0, 100 - (avgDrawdown * 500)); // 20% drawdown = 0 score
        const volatilityScore = Math.max(0, 100 - (avgVolatility * 400)); // 25% volatility = 0 score
        const varScore = Math.max(0, 100 - (avgVaR * 1000)); // 10% VaR = 0 score
        return (drawdownScore * 0.4 + volatilityScore * 0.3 + varScore * 0.3);
    }
    calculateAdaptabilityScore(adaptationHistory) {
        if (adaptationHistory.length === 0)
            return 70; // Neutral score for no adaptations
        const recentAdaptations = adaptationHistory.slice(-10);
        const successfulAdaptations = recentAdaptations.filter(a => a.expectedImprovement > 0).length;
        const adaptationFrequency = recentAdaptations.length;
        // Score based on successful adaptations and appropriate frequency
        const successRate = successfulAdaptations / Math.max(1, recentAdaptations.length);
        const frequencyScore = Math.min(100, Math.max(0, 100 - Math.abs(adaptationFrequency - 5) * 10)); // Optimal ~5 adaptations
        return (successRate * 100 * 0.7 + frequencyScore * 0.3);
    }
    analyzeTrend(metrics) {
        if (metrics.length < 5) {
            return { direction: 'stable', confidence: 0.1 };
        }
        const recentPeriod = metrics.slice(-5);
        const previousPeriod = metrics.slice(-10, -5);
        if (previousPeriod.length === 0) {
            return { direction: 'stable', confidence: 0.3 };
        }
        const recentAvgReturn = recentPeriod.reduce((sum, m) => sum + m.totalReturn, 0) / recentPeriod.length;
        const previousAvgReturn = previousPeriod.reduce((sum, m) => sum + m.totalReturn, 0) / previousPeriod.length;
        const recentAvgSharpe = recentPeriod.reduce((sum, m) => sum + m.sharpeRatio, 0) / recentPeriod.length;
        const previousAvgSharpe = previousPeriod.reduce((sum, m) => sum + m.sharpeRatio, 0) / previousPeriod.length;
        const returnChange = (recentAvgReturn - previousAvgReturn) / Math.abs(previousAvgReturn);
        const sharpeChange = (recentAvgSharpe - previousAvgSharpe) / Math.abs(previousAvgSharpe);
        const overallChange = (returnChange + sharpeChange) / 2;
        let direction;
        if (overallChange > 0.1)
            direction = 'improving';
        else if (overallChange < -0.2)
            direction = 'critical';
        else if (overallChange < -0.05)
            direction = 'declining';
        else
            direction = 'stable';
        const confidence = Math.min(1.0, Math.abs(overallChange) * 2);
        return { direction, confidence };
    }
    async generateRecommendations(metrics, healthScore, trend) {
        const recommendations = [];
        if (healthScore < 30) {
            recommendations.push({
                action: 'stop',
                confidence: 0.9,
                reason: 'Critical health score indicating potential strategy failure',
                urgency: 'critical'
            });
        }
        else if (healthScore < 50) {
            recommendations.push({
                action: 'replace',
                confidence: 0.7,
                reason: 'Low health score suggests strategy replacement needed',
                urgency: 'high'
            });
        }
        else if (trend.direction === 'declining' && trend.confidence > 0.6) {
            recommendations.push({
                action: 'adjust',
                confidence: 0.8,
                reason: 'Declining performance trend detected',
                urgency: 'medium'
            });
        }
        else if (healthScore > 80 && trend.direction === 'improving') {
            recommendations.push({
                action: 'continue',
                confidence: 0.9,
                reason: 'Excellent health score with improving trend',
                urgency: 'low'
            });
        }
        else {
            recommendations.push({
                action: 'continue',
                confidence: 0.6,
                reason: 'Stable performance within acceptable range',
                urgency: 'low'
            });
        }
        return recommendations;
    }
    generatePredictions(metrics) {
        const recentMetrics = metrics.slice(-10);
        const avgReturn = recentMetrics.reduce((sum, m) => sum + m.totalReturn, 0) / recentMetrics.length;
        const returnStd = this.calculateStandardDeviation(recentMetrics.map(m => m.totalReturn));
        // Simple prediction based on recent performance
        const realistic = avgReturn;
        const optimistic = avgReturn + returnStd;
        const pessimistic = avgReturn - returnStd;
        return {
            nextPeriod: realistic,
            confidence: Math.max(0.1, Math.min(0.9, 1 - returnStd * 2)),
            scenarios: {
                optimistic,
                realistic,
                pessimistic
            }
        };
    }
    calculateStandardDeviation(values) {
        if (values.length === 0)
            return 0;
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }
}
exports.StrategyHealthAnalyzer = StrategyHealthAnalyzer;
// ============================================================================
// MAIN MONITORING AND ADAPTATION SYSTEM
// ============================================================================
class MonitoringAndAdaptationSystem extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.monitoringInterval = null;
        this.activeStrategies = new Set();
        this.config = config;
        this.tracker = new PerformanceTracker(config);
        this.optimizer = new AdaptiveParameterOptimizer(this.tracker, config);
        this.analyzer = new StrategyHealthAnalyzer(this.tracker, this.optimizer);
        this.setupEventForwarding();
    }
    /**
     * Rozpoczyna monitorowanie strategii
     */
    startMonitoring() {
        if (this.monitoringInterval) {
            this.stopMonitoring();
        }
        this.monitoringInterval = setInterval(async () => {
            await this.performMonitoringCycle();
        }, this.config.updateFrequency);
        this.emit('monitoringStarted', {
            frequency: this.config.updateFrequency,
            strategies: Array.from(this.activeStrategies)
        });
    }
    /**
     * Zatrzymuje monitorowanie
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.emit('monitoringStopped');
    }
    /**
     * Dodaje strategię do monitorowania
     */
    addStrategy(strategyId) {
        this.activeStrategies.add(strategyId);
        this.emit('strategyAdded', { strategyId });
    }
    /**
     * Usuwa strategię z monitorowania
     */
    removeStrategy(strategyId) {
        this.activeStrategies.delete(strategyId);
        this.emit('strategyRemoved', { strategyId });
    }
    /**
     * Aktualizuje metryki wydajności strategii
     */
    updateStrategyMetrics(strategyId, metrics) {
        this.tracker.addMetrics(strategyId, metrics);
    }
    /**
     * Aktualizuje warunki rynkowe
     */
    updateMarketCondition(condition) {
        this.tracker.updateMarketCondition(condition);
    }
    /**
     * Wykonuje pełny cykl monitorowania i adaptacji
     */
    async performMonitoringCycle() {
        try {
            this.emit('monitoringCycleStart');
            for (const strategyId of this.activeStrategies) {
                await this.processStrategy(strategyId);
            }
            this.emit('monitoringCycleComplete');
        }
        catch (error) {
            this.emit('monitoringCycleError', { error });
        }
    }
    /**
     * Przetwarza pojedynczą strategię w cyklu monitorowania
     */
    async processStrategy(strategyId) {
        try {
            // Generate health report (now handles insufficient data gracefully)
            const healthReport = await this.analyzer.generateHealthReport(strategyId);
            // Check for adaptation needs only if we have sufficient data
            const latestMetrics = this.tracker.getLatestMetrics(strategyId);
            const metricsHistory = this.tracker.getMetricsHistory(strategyId);
            if (latestMetrics && metricsHistory.length >= 3) {
                // Mock current parameters - in real implementation would come from strategy state
                const currentParameters = {
                    rsiPeriod: 14,
                    macdFast: 12,
                    macdSlow: 26,
                    positionSize: 0.02,
                    stopLoss: 0.02
                };
                const adaptation = await this.optimizer.checkAndAdapt(strategyId, currentParameters);
                if (adaptation) {
                    this.emit('adaptationRecommended', {
                        strategyId,
                        adaptation,
                        healthReport
                    });
                }
            }
            // Emit health report
            this.emit('healthReportReady', { strategyId, healthReport });
        }
        catch (error) {
            this.emit('strategyProcessingError', { strategyId, error });
        }
    }
    /**
     * Generuje kompleksowy raport zdrowia dla strategii
     */
    async generateStrategyReport(strategyId) {
        return await this.analyzer.generateHealthReport(strategyId);
    }
    /**
     * Zwraca historię adaptacji dla strategii
     */
    getAdaptationHistory(strategyId) {
        return this.optimizer.getAdaptationHistory(strategyId);
    }
    /**
     * Zwraca najnowsze metryki dla strategii
     */
    getLatestMetrics(strategyId) {
        return this.tracker.getLatestMetrics(strategyId);
    }
    /**
     * Zwraca historię metryk dla strategii
     */
    getMetricsHistory(strategyId, limit) {
        return this.tracker.getMetricsHistory(strategyId, limit);
    }
    /**
     * Zwraca obecny stan rynku
     */
    getCurrentMarketCondition() {
        return this.tracker.getCurrentMarketCondition();
    }
    /**
     * Zapisuje raport do pliku
     */
    async saveReport(report, outputPath) {
        const reportData = {
            generated: new Date().toISOString(),
            report,
            metadata: {
                version: '4.1.0',
                system: 'MonitoringAndAdaptationSystem'
            }
        };
        await fs.promises.writeFile(outputPath, JSON.stringify(reportData, null, 2));
        this.emit('reportSaved', { path: outputPath, strategyId: report.strategyId });
    }
    setupEventForwarding() {
        // Forward events from child components
        this.tracker.on('alertTriggered', (data) => this.emit('alertTriggered', data));
        this.tracker.on('metricsAdded', (data) => this.emit('metricsAdded', data));
        this.tracker.on('marketConditionUpdated', (data) => this.emit('marketConditionUpdated', data));
        this.optimizer.on('adaptationPerformed', (data) => this.emit('adaptationPerformed', data));
        this.analyzer.on('healthReportGenerated', (data) => this.emit('healthReportGenerated', data));
    }
}
exports.MonitoringAndAdaptationSystem = MonitoringAndAdaptationSystem;
exports.default = MonitoringAndAdaptationSystem;

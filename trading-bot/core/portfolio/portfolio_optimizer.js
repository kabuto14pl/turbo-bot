"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortfolioOptimizer = void 0;
class PortfolioOptimizer {
    constructor(config = {}, logger) {
        this.lastUpdate = 0;
        this.performanceHistory = new Map();
        this.logger = logger;
        this.config = {
            rollingWindowDays: 30,
            minWeight: 0.1,
            maxWeight: 0.4,
            updateIntervalHours: 6,
            volatilityThreshold: 2.0,
            liquidityThreshold: 1000000, // $1M min daily volume
            ...config
        };
    }
    async optimizeWeights(currentPerformances, regime, marketConditions) {
        // Sprawdź czy potrzebna aktualizacja
        const shouldUpdate = this.shouldUpdateWeights(marketConditions);
        if (!shouldUpdate) {
            return this.getCurrentWeights();
        }
        // Aktualizuj historię wyników
        this.updatePerformanceHistory(currentPerformances);
        // Oblicz metryki ryzyko-skorygowane
        const riskAdjustedMetrics = this.calculateRiskAdjustedMetrics();
        // Optymalizuj wagi
        const weights = await this.optimizeWeightDistribution(riskAdjustedMetrics, regime, marketConditions);
        // Zapisz i zaloguj wyniki
        this.lastUpdate = marketConditions.timestamp;
        this.logOptimizationResults(weights, riskAdjustedMetrics);
        return weights;
    }
    shouldUpdateWeights(marketConditions) {
        const timeSinceLastUpdate = marketConditions.timestamp - this.lastUpdate;
        const baseInterval = this.config.updateIntervalHours * 60 * 60 * 1000;
        // Przyspiesz aktualizacje przy wysokiej zmienności
        if (marketConditions.volatility > this.config.volatilityThreshold) {
            return timeSinceLastUpdate >= baseInterval / 2;
        }
        return timeSinceLastUpdate >= baseInterval;
    }
    updatePerformanceHistory(currentPerformances) {
        const cutoffTime = Date.now() - (this.config.rollingWindowDays * 24 * 60 * 60 * 1000);
        for (const [strategyId, performance] of Array.from(currentPerformances.entries())) {
            if (!this.performanceHistory.has(strategyId)) {
                this.performanceHistory.set(strategyId, []);
            }
            const history = this.performanceHistory.get(strategyId);
            history.push(performance);
            // Usuń stare wyniki
            while (history.length > 0 && history[0].timestamp < cutoffTime) {
                history.shift();
            }
        }
    }
    calculateRiskAdjustedMetrics() {
        const metrics = new Map();
        for (const [strategyId, history] of Array.from(this.performanceHistory.entries())) {
            const returns = history.map(p => p.return);
            const volumes = history.map(p => p.volume);
            metrics.set(strategyId, {
                sharpeRatio: this.calculateSharpeRatio(returns),
                sortinoRatio: this.calculateSortinoRatio(returns),
                calmarRatio: this.calculateCalmarRatio(returns, history.map(p => p.drawdown)),
                averageVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length
            });
        }
        return metrics;
    }
    async optimizeWeightDistribution(metrics, regime, marketConditions) {
        const weights = new Map();
        let totalWeight = 0;
        // Oblicz bazowe wagi na podstawie metryk
        for (const [strategyId, strategyMetrics] of Array.from(metrics.entries())) {
            let weight = this.calculateBaseWeight(strategyMetrics);
            // Dostosuj do reżimu rynkowego
            weight *= this.getRegimeMultiplier(regime, strategyId);
            // Dostosuj do płynności
            if (strategyMetrics.averageVolume < this.config.liquidityThreshold) {
                weight *= 0.5;
            }
            // Zastosuj ograniczenia
            weight = Math.max(this.config.minWeight, Math.min(this.config.maxWeight, weight));
            weights.set(strategyId, weight);
            totalWeight += weight;
        }
        // Normalizuj wagi
        for (const [strategyId, weight] of Array.from(weights.entries())) {
            weights.set(strategyId, weight / totalWeight);
        }
        return weights;
    }
    calculateBaseWeight(metrics) {
        // Użyj kombinacji metryk do obliczenia wagi
        const sharpeComponent = Math.max(0, metrics.sharpeRatio) * 0.4;
        const sortinoComponent = Math.max(0, metrics.sortinoRatio) * 0.4;
        const calmarComponent = Math.max(0, metrics.calmarRatio) * 0.2;
        return sharpeComponent + sortinoComponent + calmarComponent;
    }
    getRegimeMultiplier(regime, strategyId) {
        // Dostosuj mnożnik w zależności od reżimu i typu strategii
        const regimeMultipliers = {
            STRONG_UPTREND: {
                momentum: 1.2,
                meanReversion: 0.8,
                trend: 1.3
            },
            STRONG_DOWNTREND: {
                momentum: 1.1,
                meanReversion: 0.9,
                trend: 1.2
            },
            RANGING: {
                momentum: 0.8,
                meanReversion: 1.3,
                trend: 0.7
            },
            MIXED: {
                momentum: 1.0,
                meanReversion: 1.0,
                trend: 1.0
            }
        };
        // Określ typ strategii na podstawie ID
        const strategyType = this.getStrategyType(strategyId);
        // Sprawdź czy reżim istnieje
        if (!(regime in regimeMultipliers)) {
            return 1.0; // Domyślny mnożnik dla nieznanego reżimu
        }
        return regimeMultipliers[regime][strategyType];
    }
    getStrategyType(strategyId) {
        if (strategyId.includes('RSI') || strategyId.includes('MeanReversion')) {
            return 'meanReversion';
        }
        if (strategyId.includes('Momentum') || strategyId.includes('MACD')) {
            return 'momentum';
        }
        return 'trend';
    }
    calculateSharpeRatio(returns) {
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        return mean / stdDev;
    }
    calculateSortinoRatio(returns) {
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const negativeReturns = returns.filter(r => r < 0);
        const downside = Math.sqrt(negativeReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / negativeReturns.length);
        return mean / downside;
    }
    calculateCalmarRatio(returns, drawdowns) {
        const annualizedReturn = returns.reduce((a, b) => a + b, 0) * (365 / returns.length);
        const maxDrawdown = Math.min(...drawdowns);
        return annualizedReturn / Math.abs(maxDrawdown);
    }
    getCurrentWeights() {
        // Zwróć ostatnio obliczone wagi
        return new Map(Array.from(this.performanceHistory.keys()).map(strategyId => [strategyId, 1 / this.performanceHistory.size]));
    }
    logOptimizationResults(weights, metrics) {
        this.logger.info('Optymalizacja wag strategii', {
            timestamp: new Date().toISOString(),
            weights: Object.fromEntries(weights),
            metrics: Object.fromEntries(metrics)
        });
    }
}
exports.PortfolioOptimizer = PortfolioOptimizer;

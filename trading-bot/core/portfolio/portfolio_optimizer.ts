import { Logger } from '../../infrastructure/logging/logger';
import { StrategyPerformance } from '../types/strategy';

interface OptimizationConfig {
    rollingWindowDays: number;
    minWeight: number;
    maxWeight: number;
    updateIntervalHours: number;
    volatilityThreshold: number;
    liquidityThreshold: number;
}

export class PortfolioOptimizer {
    private readonly config: OptimizationConfig;
    private readonly logger: Logger;
    private lastUpdate: number = 0;
    private performanceHistory: Map<string, StrategyPerformance[]> = new Map();

    constructor(
        config: Partial<OptimizationConfig> = {},
        logger: Logger
    ) {
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

    async optimizeWeights(
        currentPerformances: Map<string, StrategyPerformance>,
        regime: string,
        marketConditions: {
            volume24h: number;
            volatility: number;
            timestamp: number;
        }
    ): Promise<Map<string, number>> {
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
        const weights = await this.optimizeWeightDistribution(
            riskAdjustedMetrics,
            regime,
            marketConditions
        );

        // Zapisz i zaloguj wyniki
        this.lastUpdate = marketConditions.timestamp;
        this.logOptimizationResults(weights, riskAdjustedMetrics);

        return weights;
    }

    private shouldUpdateWeights(marketConditions: { timestamp: number; volatility: number }): boolean {
        const timeSinceLastUpdate = marketConditions.timestamp - this.lastUpdate;
        const baseInterval = this.config.updateIntervalHours * 60 * 60 * 1000;

        // Przyspiesz aktualizacje przy wysokiej zmienności
        if (marketConditions.volatility > this.config.volatilityThreshold) {
            return timeSinceLastUpdate >= baseInterval / 2;
        }

        return timeSinceLastUpdate >= baseInterval;
    }

    private updatePerformanceHistory(currentPerformances: Map<string, StrategyPerformance>): void {
        const cutoffTime = Date.now() - (this.config.rollingWindowDays * 24 * 60 * 60 * 1000);

        for (const [strategyId, performance] of Array.from(currentPerformances.entries())) {
            if (!this.performanceHistory.has(strategyId)) {
                this.performanceHistory.set(strategyId, []);
            }

            const history = this.performanceHistory.get(strategyId)!;
            history.push(performance);

            // Usuń stare wyniki
            while (history.length > 0 && history[0].timestamp < cutoffTime) {
                history.shift();
            }
        }
    }

    private calculateRiskAdjustedMetrics(): Map<string, {
        sharpeRatio: number;
        sortinoRatio: number;
        calmarRatio: number;
        averageVolume: number;
    }> {
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

    private async optimizeWeightDistribution(
        metrics: Map<string, any>,
        regime: string,
        marketConditions: { volume24h: number; volatility: number }
    ): Promise<Map<string, number>> {
        const weights = new Map<string, number>();
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

    private calculateBaseWeight(metrics: {
        sharpeRatio: number;
        sortinoRatio: number;
        calmarRatio: number;
    }): number {
        // Użyj kombinacji metryk do obliczenia wagi
        const sharpeComponent = Math.max(0, metrics.sharpeRatio) * 0.4;
        const sortinoComponent = Math.max(0, metrics.sortinoRatio) * 0.4;
        const calmarComponent = Math.max(0, metrics.calmarRatio) * 0.2;

        return sharpeComponent + sortinoComponent + calmarComponent;
    }

    private getRegimeMultiplier(regime: string, strategyId: string): number {
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
        } as const;

        // Określ typ strategii na podstawie ID
        const strategyType = this.getStrategyType(strategyId);

        // Sprawdź czy reżim istnieje
        if (!(regime in regimeMultipliers)) {
            return 1.0;  // Domyślny mnożnik dla nieznanego reżimu
        }

        return regimeMultipliers[regime as keyof typeof regimeMultipliers][strategyType];
    }

    private getStrategyType(strategyId: string): 'momentum' | 'meanReversion' | 'trend' {
        if (strategyId.includes('RSI') || strategyId.includes('MeanReversion')) {
            return 'meanReversion';
        }
        if (strategyId.includes('Momentum') || strategyId.includes('MACD')) {
            return 'momentum';
        }
        return 'trend';
    }

    private calculateSharpeRatio(returns: number[]): number {
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        return mean / stdDev;
    }

    private calculateSortinoRatio(returns: number[]): number {
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const negativeReturns = returns.filter(r => r < 0);
        const downside = Math.sqrt(
            negativeReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / negativeReturns.length
        );
        return mean / downside;
    }

    private calculateCalmarRatio(returns: number[], drawdowns: number[]): number {
        const annualizedReturn = returns.reduce((a, b) => a + b, 0) * (365 / returns.length);
        const maxDrawdown = Math.min(...drawdowns);
        return annualizedReturn / Math.abs(maxDrawdown);
    }

    private getCurrentWeights(): Map<string, number> {
        // Zwróć ostatnio obliczone wagi
        return new Map(Array.from(this.performanceHistory.keys()).map(
            strategyId => [strategyId, 1 / this.performanceHistory.size]
        ));
    }

    private logOptimizationResults(
        weights: Map<string, number>,
        metrics: Map<string, any>
    ): void {
        this.logger.info('Optymalizacja wag strategii', {
            timestamp: new Date().toISOString(),
            weights: Object.fromEntries(weights),
            metrics: Object.fromEntries(metrics)
        });
    }
} 
// ============================================================================
//  dynamic_rebalancer.ts – ADVANCED PORTFOLIO REBALANCING ENGINE
//  Rolling window (30 dni) z daily rebalance, anti-overfitting protection
//  Unikanie nadmiernej reakcji na jednorazowe outliery
// ============================================================================

import { Logger } from '../../infrastructure/logging/logger';

interface StrategyPerformance {
    strategyId: string;
    returns: number[];
    timestamps: number[];
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    lastUpdate: number;
}

interface RebalanceConfig {
    rollingWindowDays: number;
    rebalanceFrequencyHours: number; // Daily = 24h, Weekly = 168h
    minDataPoints: number;
    maxWeightChange: number; // Max change per rebalance (e.g., 0.1 = 10%)
    outlierFilterPercentile: number; // Remove extreme outliers (e.g., 95th percentile)
    minWeight: number; // Minimum weight per strategy
    maxWeight: number; // Maximum weight per strategy
    volatilityAdjustment: boolean;
    momentumFactor: number; // 0.0-1.0, higher = more momentum-based
}

interface WeightAdjustment {
    strategyId: string;
    oldWeight: number;
    newWeight: number;
    changeReason: string;
    confidence: number;
}

export class DynamicRebalancer {
    private logger: Logger;
    private config: RebalanceConfig;
    private strategyPerformances: Map<string, StrategyPerformance> = new Map();
    private currentWeights: Map<string, number> = new Map();
    private lastRebalanceTime: number = 0;
    private performanceHistory: Array<{
        timestamp: number;
        weights: Map<string, number>;
        totalReturn: number;
    }> = [];

    constructor(config: RebalanceConfig, logger: Logger) {
        this.config = config;
        this.logger = logger;
    }

    /**
     * MAIN REBALANCING METHOD
     * Wywołaj codziennie lub co rebalanceFrequencyHours
     */
    async rebalanceWeights(currentTimestamp: number): Promise<Map<string, number>> {
        // Check if rebalancing is due
        const timeSinceLastRebalance = currentTimestamp - this.lastRebalanceTime;
        const rebalanceInterval = this.config.rebalanceFrequencyHours * 60 * 60 * 1000;

        if (timeSinceLastRebalance < rebalanceInterval) {
            return this.currentWeights;
        }

        this.logger.info('🔄 Starting portfolio rebalancing...');

        // 1. Update performance data
        await this.updatePerformanceMetrics(currentTimestamp);

        // 2. Calculate new weights
        const newWeights = this.calculateOptimalWeights(currentTimestamp);

        // 3. Apply constraints and smoothing
        const adjustedWeights = this.applyRebalanceConstraints(newWeights);

        // 4. Log changes
        this.logWeightChanges(adjustedWeights);

        // 5. Update internal state
        this.currentWeights = adjustedWeights;
        this.lastRebalanceTime = currentTimestamp;

        // 6. Record performance history
        this.recordRebalanceHistory(currentTimestamp, adjustedWeights);

        return adjustedWeights;
    }

    /**
     * UPDATE STRATEGY PERFORMANCE DATA
     * Rolling window - tylko ostatnie 30 dni
     */
    private async updatePerformanceMetrics(currentTimestamp: number): Promise<void> {
        const cutoffTime = currentTimestamp - (this.config.rollingWindowDays * 24 * 60 * 60 * 1000);

        for (const [strategyId, performance] of this.strategyPerformances) {
            // Filter to rolling window
            const recentIndices = performance.timestamps
                .map((timestamp, index) => ({ timestamp, index }))
                .filter(item => item.timestamp >= cutoffTime)
                .map(item => item.index);

            if (recentIndices.length < this.config.minDataPoints) {
                this.logger.warn(`Insufficient data for ${strategyId}: ${recentIndices.length} points`);
                continue;
            }

            const recentReturns = recentIndices.map(i => performance.returns[i]);
            const recentTimestamps = recentIndices.map(i => performance.timestamps[i]);

            // Filter outliers
            const filteredReturns = this.filterOutliers(recentReturns);

            // Recalculate metrics
            performance.sharpeRatio = this.calculateSharpeRatio(filteredReturns);
            performance.maxDrawdown = this.calculateMaxDrawdown(filteredReturns);
            performance.winRate = this.calculateWinRate(filteredReturns);
            performance.profitFactor = this.calculateProfitFactor(filteredReturns);
            performance.lastUpdate = currentTimestamp;

            // Update arrays to rolling window
            performance.returns = recentReturns;
            performance.timestamps = recentTimestamps;
        }
    }

    /**
     * CALCULATE OPTIMAL WEIGHTS
     * Advanced scoring z anti-overfitting protection
     */
    private calculateOptimalWeights(currentTimestamp: number): Map<string, number> {
        const scores = new Map<string, number>();
        const adjustments: WeightAdjustment[] = [];

        // 1. Calculate base scores
        for (const [strategyId, performance] of this.strategyPerformances) {
            const baseScore = this.calculateStrategyScore(performance);
            scores.set(strategyId, baseScore);
        }

        // 2. Apply momentum adjustment
        if (this.config.momentumFactor > 0) {
            this.applyMomentumAdjustment(scores);
        }

        // 3. Volatility adjustment
        if (this.config.volatilityAdjustment) {
            this.applyVolatilityAdjustment(scores);
        }

        // 4. Normalize to weights (sum = 1.0)
        const totalScore = Array.from(scores.values()).reduce((sum, score) => sum + score, 0);
        const newWeights = new Map<string, number>();

        for (const [strategyId, score] of scores) {
            const weight = score / totalScore;
            newWeights.set(strategyId, weight);
        }

        return newWeights;
    }

    /**
     * STRATEGY SCORING ALGORITHM
     * Multi-factor model z risk adjustment
     */
    private calculateStrategyScore(performance: StrategyPerformance): number {
        if (performance.returns.length < this.config.minDataPoints) {
            return 0.1; // Minimum score for strategies with insufficient data
        }

        // Base components
        const sharpeWeight = 0.4;
        const returnWeight = 0.3;
        const drawdownWeight = 0.2;
        const consistencyWeight = 0.1;

        // Normalize Sharpe ratio (0-1 scale)
        const normalizedSharpe = Math.max(0, Math.min(1, (performance.sharpeRatio + 2) / 4));
        
        // Average return (annualized)
        const avgReturn = performance.returns.reduce((sum, ret) => sum + ret, 0) / performance.returns.length;
        const annualizedReturn = avgReturn * 365; // Assuming daily returns
        const normalizedReturn = Math.max(0, Math.min(1, (annualizedReturn + 0.5) / 1.0));

        // Drawdown penalty (inverse - lower drawdown = higher score)
        const normalizedDrawdown = Math.max(0, 1 - Math.abs(performance.maxDrawdown) / 0.5);

        // Consistency (inverse of volatility)
        const returnVolatility = this.calculateVolatility(performance.returns);
        const normalizedConsistency = Math.max(0, 1 - returnVolatility / 0.1);

        // Weighted score
        const score = (
            sharpeWeight * normalizedSharpe +
            returnWeight * normalizedReturn +
            drawdownWeight * normalizedDrawdown +
            consistencyWeight * normalizedConsistency
        );

        return Math.max(0.05, score); // Minimum 5% score
    }

    /**
     * APPLY MOMENTUM ADJUSTMENT
     * Recent performance boost
     */
    private applyMomentumAdjustment(scores: Map<string, number>): void {
        for (const [strategyId, performance] of this.strategyPerformances) {
            if (performance.returns.length < 7) continue; // Need at least 1 week

            // Recent 7-day performance
            const recentReturns = performance.returns.slice(-7);
            const recentPerformance = recentReturns.reduce((sum, ret) => sum + ret, 0);
            
            // Momentum multiplier
            const momentumMultiplier = 1 + (this.config.momentumFactor * recentPerformance);
            const currentScore = scores.get(strategyId) || 0;
            scores.set(strategyId, currentScore * momentumMultiplier);
        }
    }

    /**
     * APPLY VOLATILITY ADJUSTMENT
     * Lower volatility = higher weight
     */
    private applyVolatilityAdjustment(scores: Map<string, number>): void {
        const volatilities = new Map<string, number>();
        
        // Calculate volatilities
        for (const [strategyId, performance] of this.strategyPerformances) {
            const vol = this.calculateVolatility(performance.returns);
            volatilities.set(strategyId, vol);
        }

        // Adjust scores based on relative volatility
        const avgVolatility = Array.from(volatilities.values()).reduce((sum, vol) => sum + vol, 0) / volatilities.size;
        
        for (const [strategyId, vol] of volatilities) {
            const volAdjustment = avgVolatility / Math.max(vol, 0.001); // Prevent division by zero
            const currentScore = scores.get(strategyId) || 0;
            scores.set(strategyId, currentScore * Math.sqrt(volAdjustment)); // Square root to dampen effect
        }
    }

    /**
     * APPLY REBALANCE CONSTRAINTS
     * Anti-whipsaw protection, min/max weights
     */
    private applyRebalanceConstraints(newWeights: Map<string, number>): Map<string, number> {
        const constrainedWeights = new Map<string, number>();

        for (const [strategyId, newWeight] of newWeights) {
            const currentWeight = this.currentWeights.get(strategyId) || (1 / newWeights.size);
            
            // Limit maximum change per rebalance
            const maxChange = this.config.maxWeightChange;
            const weightChange = newWeight - currentWeight;
            const limitedChange = Math.sign(weightChange) * Math.min(Math.abs(weightChange), maxChange);
            let adjustedWeight = currentWeight + limitedChange;

            // Apply min/max constraints
            adjustedWeight = Math.max(this.config.minWeight, adjustedWeight);
            adjustedWeight = Math.min(this.config.maxWeight, adjustedWeight);

            constrainedWeights.set(strategyId, adjustedWeight);
        }

        // Normalize to sum = 1.0
        const totalWeight = Array.from(constrainedWeights.values()).reduce((sum, weight) => sum + weight, 0);
        for (const [strategyId, weight] of constrainedWeights) {
            constrainedWeights.set(strategyId, weight / totalWeight);
        }

        return constrainedWeights;
    }

    /**
     * OUTLIER FILTERING
     * Remove extreme values that could skew calculations
     */
    private filterOutliers(returns: number[]): number[] {
        if (returns.length < 10) return returns; // Not enough data for outlier detection

        const sorted = [...returns].sort((a, b) => a - b);
        const percentileIndex = Math.floor(returns.length * this.config.outlierFilterPercentile / 100);
        const lowerBound = sorted[Math.floor(returns.length * 0.05)]; // 5th percentile
        const upperBound = sorted[percentileIndex];

        return returns.filter(ret => ret >= lowerBound && ret <= upperBound);
    }

    /**
     * UTILITY CALCULATIONS
     */
    private calculateSharpeRatio(returns: number[]): number {
        if (returns.length < 2) return 0;
        
        const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        
        return stdDev === 0 ? 0 : avgReturn / stdDev;
    }

    private calculateMaxDrawdown(returns: number[]): number {
        let maxDrawdown = 0;
        let peak = 0;
        let cumulative = 0;

        for (const ret of returns) {
            cumulative += ret;
            peak = Math.max(peak, cumulative);
            const drawdown = peak - cumulative;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        }

        return maxDrawdown;
    }

    private calculateWinRate(returns: number[]): number {
        const wins = returns.filter(ret => ret > 0).length;
        return returns.length === 0 ? 0 : wins / returns.length;
    }

    private calculateProfitFactor(returns: number[]): number {
        const profits = returns.filter(ret => ret > 0).reduce((sum, ret) => sum + ret, 0);
        const losses = Math.abs(returns.filter(ret => ret < 0).reduce((sum, ret) => sum + ret, 0));
        return losses === 0 ? (profits > 0 ? 10 : 1) : profits / losses;
    }

    private calculateVolatility(returns: number[]): number {
        if (returns.length < 2) return 0;
        
        const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }

    /**
     * LOGGING AND MONITORING
     */
    private logWeightChanges(newWeights: Map<string, number>): void {
        this.logger.info('📊 Portfolio Rebalancing Results:');
        
        for (const [strategyId, newWeight] of newWeights) {
            const oldWeight = this.currentWeights.get(strategyId) || 0;
            const change = newWeight - oldWeight;
            const changePercent = (change * 100).toFixed(1);
            const changePct = parseFloat(changePercent);
            
            this.logger.info(`   ${strategyId}: ${(oldWeight * 100).toFixed(1)}% → ${(newWeight * 100).toFixed(1)}% (${changePct > 0 ? '+' : ''}${changePercent}%)`);
        }
    }

    private recordRebalanceHistory(timestamp: number, weights: Map<string, number>): void {
        // Calculate total portfolio return since last rebalance
        let totalReturn = 0;
        for (const [strategyId, weight] of weights) {
            const performance = this.strategyPerformances.get(strategyId);
            if (performance && performance.returns.length > 0) {
                const recentReturn = performance.returns[performance.returns.length - 1];
                totalReturn += weight * recentReturn;
            }
        }

        this.performanceHistory.push({
            timestamp,
            weights: new Map(weights),
            totalReturn
        });

        // Keep only recent history (rolling window)
        const cutoffTime = timestamp - (this.config.rollingWindowDays * 2 * 24 * 60 * 60 * 1000); // 2x rolling window
        this.performanceHistory = this.performanceHistory.filter(record => record.timestamp >= cutoffTime);
    }

    /**
     * PUBLIC METHODS FOR EXTERNAL INTEGRATION
     */
    
    updateStrategyPerformance(strategyId: string, return_: number, timestamp: number): void {
        let performance = this.strategyPerformances.get(strategyId);
        
        if (!performance) {
            performance = {
                strategyId,
                returns: [],
                timestamps: [],
                sharpeRatio: 0,
                maxDrawdown: 0,
                winRate: 0,
                profitFactor: 1,
                lastUpdate: timestamp
            };
            this.strategyPerformances.set(strategyId, performance);
        }

        performance.returns.push(return_);
        performance.timestamps.push(timestamp);
        performance.lastUpdate = timestamp;

        // Limit data to rolling window + buffer
        const cutoffTime = timestamp - (this.config.rollingWindowDays * 1.5 * 24 * 60 * 60 * 1000);
        const validIndices = performance.timestamps
            .map((ts, index) => ({ ts, index }))
            .filter(item => item.ts >= cutoffTime)
            .map(item => item.index);

        performance.returns = validIndices.map(i => performance!.returns[i]);
        performance.timestamps = validIndices.map(i => performance!.timestamps[i]);
    }

    getCurrentWeights(): Map<string, number> {
        return new Map(this.currentWeights);
    }

    getPerformanceHistory(): Array<{ timestamp: number; weights: Map<string, number>; totalReturn: number }> {
        return [...this.performanceHistory];
    }

    // Initialize with equal weights
    initializeWeights(strategyIds: string[]): void {
        const equalWeight = 1.0 / strategyIds.length;
        for (const strategyId of strategyIds) {
            this.currentWeights.set(strategyId, equalWeight);
        }
        this.logger.info(`Initialized ${strategyIds.length} strategies with equal weights (${(equalWeight * 100).toFixed(1)}% each)`);
    }
}

/**
 * FACTORY FUNCTIONS
 */
export function createProductionRebalancer(logger: Logger): DynamicRebalancer {
    const config: RebalanceConfig = {
        rollingWindowDays: 30,
        rebalanceFrequencyHours: 24, // Daily rebalancing
        minDataPoints: 10,
        maxWeightChange: 0.15, // Max 15% change per day
        outlierFilterPercentile: 95,
        minWeight: 0.05, // Min 5% per strategy
        maxWeight: 0.50, // Max 50% per strategy
        volatilityAdjustment: true,
        momentumFactor: 0.2 // 20% momentum influence
    };

    return new DynamicRebalancer(config, logger);
}

export function createConservativeRebalancer(logger: Logger): DynamicRebalancer {
    const config: RebalanceConfig = {
        rollingWindowDays: 60, // Longer window
        rebalanceFrequencyHours: 168, // Weekly rebalancing
        minDataPoints: 20,
        maxWeightChange: 0.10, // Max 10% change per week
        outlierFilterPercentile: 90,
        minWeight: 0.10, // Min 10% per strategy
        maxWeight: 0.40, // Max 40% per strategy
        volatilityAdjustment: true,
        momentumFactor: 0.1 // Less momentum influence
    };

    return new DynamicRebalancer(config, logger);
} 
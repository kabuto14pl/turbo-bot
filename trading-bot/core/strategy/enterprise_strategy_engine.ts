/**
 * 🎯 POINT 3: ENTERPRISE STRATEGY ENGINE
 * Advanced strategy management, orchestration, and signal generation system
 */

import { EventEmitter } from 'events';
import { AbstractStrategy } from './abstract_strategy';
import { BotState } from '../types/bot_state';
import { StrategySignal } from '../types/strategy';
import { Regime } from '../types/regime';
import { Logger } from '../utils/logger';

// ============================================================================
// 🎯 STRATEGY ENGINE INTERFACES
// ============================================================================

export interface StrategyEngineConfig {
    enableParallelExecution: boolean;
    maxConcurrentStrategies: number;
    signalAggregationMethod: 'weighted_average' | 'consensus' | 'confidence_weighted' | 'adaptive';
    conflictResolution: 'highest_confidence' | 'weighted_majority' | 'strategy_tier';
    performanceTracking: boolean;
    adaptiveWeighting: boolean;
    riskFiltering: boolean;
    executionTimeout: number; // milliseconds
    healthMonitoring: boolean;
}

export interface StrategyMetrics {
    strategyId: string;
    name: string;
    totalSignals: number;
    successfulSignals: number;
    winRate: number;
    avgConfidence: number;
    avgExecutionTime: number;
    totalPnL: number;
    sharpeRatio: number;
    maxDrawdown: number;
    lastExecuted: Date;
    errors: number;
    isHealthy: boolean;
    currentWeight: number;
    adaptedWeight: number;
}

export interface EnterpriseStrategyMetadata {
    strategy: string;
    timeframe: string;
    regime: Regime;
    aggregationMethod?: string;
    sourceStrategies?: string[];
    sourceCount?: number;
    [key: string]: any;
}

export interface StrategySignalExtended extends StrategySignal {
    strategyId: string;
    timestamp: number;
    weight: number;
    timeframe: string;
    source: string;
    symbol: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    quantity: number;
    riskScore?: number;
    metadata?: EnterpriseStrategyMetadata;
    extendedMetadata: {
        [key: string]: any;
    };
}

export interface EnginePerformance {
    totalExecutions: number;
    avgExecutionTime: number;
    signalsGenerated: number;
    signalsExecuted: number;
    avgConfidence: number;
    overallWinRate: number;
    strategyCoverage: number;
    systemHealth: number;
}

// ============================================================================
// 🔄 STRATEGY SIGNAL AGGREGATOR
// ============================================================================

export class StrategySignalAggregator {
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Aggregate signals from multiple strategies into final trading decisions
     */
    aggregateSignals(
        signals: StrategySignalExtended[],
        method: string,
        strategies: Map<string, AbstractStrategy>
    ): StrategySignalExtended[] {
        if (signals.length === 0) return [];

        this.logger.info(`🔄 Aggregating ${signals.length} signals using ${method} method`);

        switch (method) {
            case 'weighted_average':
                return this.weightedAverageAggregation(signals, strategies);
            case 'consensus':
                return this.consensusAggregation(signals, strategies);
            case 'confidence_weighted':
                return this.confidenceWeightedAggregation(signals, strategies);
            case 'adaptive':
                return this.adaptiveAggregation(signals, strategies);
            default:
                return this.weightedAverageAggregation(signals, strategies);
        }
    }

    private weightedAverageAggregation(
        signals: StrategySignalExtended[],
        strategies: Map<string, AbstractStrategy>
    ): StrategySignalExtended[] {
        const aggregated: Map<string, StrategySignalExtended[]> = new Map();

        // Group signals by action type
        signals.forEach(signal => {
            const key = `${signal.action}_${signal.symbol}`;
            if (!aggregated.has(key)) {
                aggregated.set(key, []);
            }
            aggregated.get(key)!.push(signal);
        });

        const result: StrategySignalExtended[] = [];

        // Aggregate each group
        aggregated.forEach((groupSignals, key) => {
            if (groupSignals.length === 1) {
                result.push(groupSignals[0]);
                return;
            }

            let totalWeight = 0;
            let weightedConfidence = 0;
            let weightedPrice = 0;
            let weightedQuantity = 0;

            groupSignals.forEach(signal => {
                const strategy = strategies.get(signal.strategyId);
                const weight = strategy?.getWeight() || 1;
                
                totalWeight += weight;
                weightedConfidence += signal.confidence * weight;
                weightedPrice += signal.price * weight;
                weightedQuantity += signal.quantity * weight;
            });

            const aggregatedSignal: StrategySignalExtended = {
                ...groupSignals[0],
                confidence: weightedConfidence / totalWeight,
                price: weightedPrice / totalWeight,
                quantity: weightedQuantity / totalWeight,
                strategyId: 'AGGREGATED',
                metadata: {
                    ...groupSignals[0].metadata,
                    aggregationMethod: 'weighted_average',
                    sourceStrategies: groupSignals.map(s => s.strategyId),
                    sourceCount: groupSignals.length
                }
            };

            result.push(aggregatedSignal);
        });

        return result;
    }

    private consensusAggregation(
        signals: StrategySignalExtended[],
        strategies: Map<string, AbstractStrategy>
    ): StrategySignalExtended[] {
        const actionCounts: Map<string, StrategySignalExtended[]> = new Map();

        signals.forEach(signal => {
            const key = `${signal.action}_${signal.symbol}`;
            if (!actionCounts.has(key)) {
                actionCounts.set(key, []);
            }
            actionCounts.get(key)!.push(signal);
        });

        const result: StrategySignalExtended[] = [];
        const minConsensus = Math.ceil(strategies.size * 0.6); // 60% consensus required

        actionCounts.forEach((groupSignals, key) => {
            if (groupSignals.length >= minConsensus) {
                const avgConfidence = groupSignals.reduce((sum, s) => sum + s.confidence, 0) / groupSignals.length;
                const consensusSignal: StrategySignalExtended = {
                    ...groupSignals[0],
                    confidence: avgConfidence * (groupSignals.length / strategies.size), // Boost confidence by consensus
                    strategyId: 'CONSENSUS',
                    metadata: {
                        ...groupSignals[0].metadata,
                        aggregationMethod: 'consensus',
                        consensusRatio: groupSignals.length / strategies.size,
                        sourceStrategies: groupSignals.map(s => s.strategyId)
                    }
                };
                result.push(consensusSignal);
            }
        });

        return result;
    }

    private confidenceWeightedAggregation(
        signals: StrategySignalExtended[],
        strategies: Map<string, AbstractStrategy>
    ): StrategySignalExtended[] {
        const grouped: Map<string, StrategySignalExtended[]> = new Map();

        signals.forEach(signal => {
            const key = `${signal.action}_${signal.symbol}`;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key)!.push(signal);
        });

        const result: StrategySignalExtended[] = [];

        grouped.forEach((groupSignals, key) => {
            // Sort by confidence descending
            groupSignals.sort((a, b) => b.confidence - a.confidence);

            let totalConfidenceWeight = 0;
            let weightedPrice = 0;
            let weightedQuantity = 0;
            let finalConfidence = 0;

            groupSignals.forEach(signal => {
                const confWeight = signal.confidence * signal.confidence; // Square confidence for more weight
                totalConfidenceWeight += confWeight;
                weightedPrice += signal.price * confWeight;
                weightedQuantity += signal.quantity * confWeight;
                finalConfidence += signal.confidence * confWeight;
            });

            const aggregatedSignal: StrategySignalExtended = {
                ...groupSignals[0],
                confidence: finalConfidence / totalConfidenceWeight,
                price: weightedPrice / totalConfidenceWeight,
                quantity: weightedQuantity / totalConfidenceWeight,
                strategyId: 'CONFIDENCE_WEIGHTED',
                metadata: {
                    ...groupSignals[0].metadata,
                    aggregationMethod: 'confidence_weighted',
                    topConfidence: groupSignals[0].confidence,
                    sourceStrategies: groupSignals.map(s => s.strategyId)
                }
            };

            result.push(aggregatedSignal);
        });

        return result;
    }

    private adaptiveAggregation(
        signals: StrategySignalExtended[],
        strategies: Map<string, AbstractStrategy>
    ): StrategySignalExtended[] {
        // Adaptive aggregation considers recent performance of strategies
        const performanceWeights: Map<string, number> = new Map();

        strategies.forEach((strategy, id) => {
            const metrics = (strategy as any).getMetrics?.() || {};
            const winRate = metrics.winRate || 0.5;
            const sharpeRatio = metrics.sharpeRatio || 0;
            const recentPerformance = Math.max(0.1, winRate + (sharpeRatio * 0.1)); // Minimum 0.1 weight
            performanceWeights.set(id, recentPerformance);
        });

        const grouped: Map<string, StrategySignalExtended[]> = new Map();

        signals.forEach(signal => {
            const key = `${signal.action}_${signal.symbol}`;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key)!.push(signal);
        });

        const result: StrategySignalExtended[] = [];

        grouped.forEach((groupSignals, key) => {
            let totalAdaptiveWeight = 0;
            let weightedConfidence = 0;
            let weightedPrice = 0;
            let weightedQuantity = 0;

            groupSignals.forEach(signal => {
                const baseWeight = strategies.get(signal.strategyId)?.getWeight() || 1;
                const performanceWeight = performanceWeights.get(signal.strategyId) || 0.5;
                const adaptiveWeight = baseWeight * performanceWeight * signal.confidence;

                totalAdaptiveWeight += adaptiveWeight;
                weightedConfidence += signal.confidence * adaptiveWeight;
                weightedPrice += signal.price * adaptiveWeight;
                weightedQuantity += signal.quantity * adaptiveWeight;
            });

            const aggregatedSignal: StrategySignalExtended = {
                ...groupSignals[0],
                confidence: weightedConfidence / totalAdaptiveWeight,
                price: weightedPrice / totalAdaptiveWeight,
                quantity: weightedQuantity / totalAdaptiveWeight,
                strategyId: 'ADAPTIVE',
                metadata: {
                    ...groupSignals[0].metadata,
                    aggregationMethod: 'adaptive',
                    adaptiveWeights: Object.fromEntries(
                        groupSignals.map(s => [s.strategyId, performanceWeights.get(s.strategyId) || 0.5])
                    ),
                    sourceStrategies: groupSignals.map(s => s.strategyId)
                }
            };

            result.push(aggregatedSignal);
        });

        return result;
    }
}

// ============================================================================
// 🎯 ENTERPRISE STRATEGY ENGINE
// ============================================================================

export class EnterpriseStrategyEngine extends EventEmitter {
    private strategies: Map<string, AbstractStrategy> = new Map();
    private strategyMetrics: Map<string, StrategyMetrics> = new Map();
    private signalAggregator: StrategySignalAggregator;
    private config: StrategyEngineConfig;
    private logger: Logger;
    private isRunning: boolean = false;
    private enginePerformance: EnginePerformance;
    private healthCheckInterval?: NodeJS.Timeout;

    constructor(config: StrategyEngineConfig, logger: Logger) {
        super();
        this.config = config;
        this.logger = logger;
        this.signalAggregator = new StrategySignalAggregator(logger);
        this.enginePerformance = this.initializePerformance();
    }

    private initializePerformance(): EnginePerformance {
        return {
            totalExecutions: 0,
            avgExecutionTime: 0,
            signalsGenerated: 0,
            signalsExecuted: 0,
            avgConfidence: 0,
            overallWinRate: 0,
            strategyCoverage: 0,
            systemHealth: 1.0
        };
    }

    /**
     * Register a strategy with the engine
     */
    registerStrategy(strategy: AbstractStrategy): void {
        this.strategies.set(strategy.name, strategy);
        this.strategyMetrics.set(strategy.name, this.initializeStrategyMetrics(strategy));
        this.logger.info(`📈 Registered strategy: ${strategy.name}`);
        this.emit('strategy_registered', { name: strategy.name });
    }

    private initializeStrategyMetrics(strategy: AbstractStrategy): StrategyMetrics {
        return {
            strategyId: strategy.name,
            name: strategy.name,
            totalSignals: 0,
            successfulSignals: 0,
            winRate: 0.5,
            avgConfidence: 0.5,
            avgExecutionTime: 0,
            totalPnL: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
            lastExecuted: new Date(),
            errors: 0,
            isHealthy: true,
            currentWeight: strategy.getWeight(),
            adaptedWeight: strategy.getWeight()
        };
    }

    /**
     * Execute all registered strategies and generate aggregated signals
     */
    async executeStrategies(state: BotState): Promise<StrategySignalExtended[]> {
        if (!this.isRunning) {
            throw new Error('Strategy engine is not running');
        }

        const startTime = Date.now();
        const allSignals: StrategySignalExtended[] = [];
        const executionPromises: Promise<void>[] = [];

        this.logger.info(`🎯 Executing ${this.strategies.size} strategies`);

        // Execute strategies in parallel or sequential based on config
        for (const [name, strategy] of this.strategies) {
            const promise = this.executeStrategy(strategy, state, allSignals);
            
            if (this.config.enableParallelExecution) {
                executionPromises.push(promise);
                if (executionPromises.length >= this.config.maxConcurrentStrategies) {
                    await Promise.all(executionPromises);
                    executionPromises.length = 0;
                }
            } else {
                await promise;
            }
        }

        // Wait for remaining parallel executions
        if (executionPromises.length > 0) {
            await Promise.all(executionPromises);
        }

        // Aggregate signals
        const aggregatedSignals = this.signalAggregator.aggregateSignals(
            allSignals,
            this.config.signalAggregationMethod,
            this.strategies
        );

        // Apply risk filtering if enabled
        const finalSignals = this.config.riskFiltering
            ? this.applyRiskFiltering(aggregatedSignals, state)
            : aggregatedSignals;

        // Update performance metrics
        this.updateEnginePerformance(startTime, allSignals.length, finalSignals.length);

        this.logger.info(`✅ Strategy execution complete: ${allSignals.length} → ${finalSignals.length} signals`);
        this.emit('strategies_executed', { signals: finalSignals, metrics: this.enginePerformance });

        return finalSignals;
    }

    private async executeStrategy(
        strategy: AbstractStrategy,
        state: BotState,
        allSignals: StrategySignalExtended[]
    ): Promise<void> {
        const strategyStartTime = Date.now();
        
        try {
            // Execute strategy with timeout
            const timeoutPromise = new Promise<StrategySignal[]>((_, reject) =>
                setTimeout(() => reject(new Error('Strategy execution timeout')), this.config.executionTimeout)
            );

            const signals = await Promise.race([
                strategy.run(state),
                timeoutPromise
            ]);

            const executionTime = Date.now() - strategyStartTime;

            // Enhance signals with metadata
            const enhancedSignals: StrategySignalExtended[] = signals.map(signal => ({
                ...signal,
                executionTime,
                strategyMetrics: this.strategyMetrics.get(strategy.name),
                riskScore: this.calculateRiskScore(signal, state)
            }));

            allSignals.push(...enhancedSignals);

            // Update strategy metrics
            this.updateStrategyMetrics(strategy.name, enhancedSignals, executionTime, true);

            this.logger.debug(`📊 ${strategy.name}: ${signals.length} signals in ${executionTime}ms`);

        } catch (error) {
            this.logger.error(`❌ Strategy ${strategy.name} failed:`, error);
            this.updateStrategyMetrics(strategy.name, [], Date.now() - strategyStartTime, false);
            this.emit('strategy_error', { name: strategy.name, error });
        }
    }

    private calculateRiskScore(signal: StrategySignal, state: BotState): number {
        // Simple risk scoring based on market conditions and signal properties
        let riskScore = 0.5; // Base risk

        // Adjust for market volatility
        if (state.regime?.volatility > 0.8) riskScore += 0.2;
        if (state.regime?.volatility < 0.3) riskScore -= 0.1;

        // Adjust for signal confidence
        riskScore += (1 - signal.confidence) * 0.3;

        // Adjust for portfolio exposure
        const currentExposure = state.positions.reduce((sum, pos) => sum + Math.abs(pos.size), 0);
        if (currentExposure > 10000) riskScore += 0.1; // High exposure

        return Math.max(0, Math.min(1, riskScore));
    }

    private applyRiskFiltering(
        signals: StrategySignalExtended[],
        state: BotState
    ): StrategySignalExtended[] {
        return signals.filter(signal => {
            // Filter based on risk score
            if (signal.riskScore && signal.riskScore > 0.8) {
                this.logger.warn(`🚫 Signal filtered due to high risk: ${signal.symbol} (${signal.riskScore})`);
                return false;
            }

            // Filter based on confidence threshold
            if (signal.confidence < 0.6) {
                this.logger.warn(`🚫 Signal filtered due to low confidence: ${signal.symbol} (${signal.confidence})`);
                return false;
            }

            // Filter based on current portfolio exposure
            const symbol = signal.symbol;
            const existingPosition = state.positions.find(p => p.symbol === symbol);
            
            if (existingPosition && signal.action.includes('ENTER')) {
                this.logger.warn(`🚫 Signal filtered due to existing position: ${symbol}`);
                return false;
            }

            return true;
        });
    }

    private updateStrategyMetrics(
        strategyName: string,
        signals: StrategySignalExtended[],
        executionTime: number,
        success: boolean
    ): void {
        const metrics = this.strategyMetrics.get(strategyName);
        if (!metrics) return;

        metrics.totalSignals += signals.length;
        metrics.lastExecuted = new Date();

        if (success) {
            metrics.successfulSignals++;
            metrics.avgExecutionTime = (metrics.avgExecutionTime + executionTime) / 2;
            
            if (signals.length > 0) {
                const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
                metrics.avgConfidence = (metrics.avgConfidence + avgConfidence) / 2;
            }
        } else {
            metrics.errors++;
            metrics.isHealthy = metrics.errors < 5; // Mark unhealthy after 5 consecutive errors
        }

        // Update adaptive weight if enabled
        if (this.config.adaptiveWeighting) {
            this.updateAdaptiveWeight(strategyName, metrics);
        }

        this.strategyMetrics.set(strategyName, metrics);
    }

    private updateAdaptiveWeight(strategyName: string, metrics: StrategyMetrics): void {
        const strategy = this.strategies.get(strategyName);
        if (!strategy) return;

        const baseWeight = metrics.currentWeight;
        const performanceFactor = metrics.winRate * metrics.avgConfidence;
        const healthFactor = metrics.isHealthy ? 1 : 0.5;
        
        const adaptedWeight = baseWeight * performanceFactor * healthFactor;
        metrics.adaptedWeight = Math.max(0.1, Math.min(2.0, adaptedWeight)); // Clamp between 0.1 and 2.0
        
        strategy.setWeight(metrics.adaptedWeight);
    }

    private updateEnginePerformance(startTime: number, rawSignals: number, finalSignals: number): void {
        const executionTime = Date.now() - startTime;
        
        this.enginePerformance.totalExecutions++;
        this.enginePerformance.avgExecutionTime = 
            (this.enginePerformance.avgExecutionTime + executionTime) / 2;
        this.enginePerformance.signalsGenerated += rawSignals;
        this.enginePerformance.signalsExecuted += finalSignals;
        
        // Calculate coverage (how many strategies generated signals)
        const activeStrategies = Array.from(this.strategyMetrics.values())
            .filter(m => m.lastExecuted.getTime() > Date.now() - 60000).length; // Active in last minute
        this.enginePerformance.strategyCoverage = activeStrategies / this.strategies.size;

        // Calculate system health
        const healthyStrategies = Array.from(this.strategyMetrics.values())
            .filter(m => m.isHealthy).length;
        this.enginePerformance.systemHealth = healthyStrategies / this.strategies.size;
    }

    /**
     * Start the strategy engine
     */
    async start(): Promise<void> {
        if (this.isRunning) return;

        this.isRunning = true;
        this.logger.info('🎯 Starting Enterprise Strategy Engine');

        if (this.config.healthMonitoring) {
            this.startHealthMonitoring();
        }

        this.emit('engine_started');
    }

    /**
     * Stop the strategy engine
     */
    async stop(): Promise<void> {
        if (!this.isRunning) return;

        this.isRunning = false;
        
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        this.logger.info('🛑 Stopping Enterprise Strategy Engine');
        this.emit('engine_stopped');
    }

    private startHealthMonitoring(): void {
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, 30000); // Check every 30 seconds
    }

    private performHealthCheck(): void {
        const unhealthyStrategies = Array.from(this.strategyMetrics.entries())
            .filter(([_, metrics]) => !metrics.isHealthy);

        if (unhealthyStrategies.length > 0) {
            this.logger.warn(`⚠️ Unhealthy strategies detected: ${unhealthyStrategies.map(([name]) => name).join(', ')}`);
            this.emit('health_alert', { unhealthyStrategies: unhealthyStrategies.map(([name]) => name) });
        }

        // Auto-recovery for strategies with temporary issues
        for (const [name, metrics] of unhealthyStrategies) {
            if (metrics.errors >= 5 && Date.now() - metrics.lastExecuted.getTime() > 300000) { // 5 minutes
                this.logger.info(`🔄 Attempting auto-recovery for strategy: ${name}`);
                metrics.errors = 0;
                metrics.isHealthy = true;
                this.strategyMetrics.set(name, metrics);
            }
        }
    }

    /**
     * Get current engine status and metrics
     */
    getEngineStatus(): {
        isRunning: boolean;
        strategies: number;
        performance: EnginePerformance;
        strategyMetrics: StrategyMetrics[];
    } {
        return {
            isRunning: this.isRunning,
            strategies: this.strategies.size,
            performance: this.enginePerformance,
            strategyMetrics: Array.from(this.strategyMetrics.values())
        };
    }

    /**
     * Get detailed strategy metrics
     */
    getStrategyMetrics(strategyName?: string): StrategyMetrics | StrategyMetrics[] {
        if (strategyName) {
            return this.strategyMetrics.get(strategyName) || null;
        }
        return Array.from(this.strategyMetrics.values());
    }

    /**
     * Update strategy weight dynamically
     */
    updateStrategyWeight(strategyName: string, newWeight: number): boolean {
        const strategy = this.strategies.get(strategyName);
        if (!strategy) return false;

        strategy.setWeight(newWeight);
        const metrics = this.strategyMetrics.get(strategyName);
        if (metrics) {
            metrics.currentWeight = newWeight;
            this.strategyMetrics.set(strategyName, metrics);
        }

        this.logger.info(`⚖️ Updated weight for ${strategyName}: ${newWeight}`);
        this.emit('weight_updated', { strategy: strategyName, weight: newWeight });
        return true;
    }
}

// ============================================================================
// 🎯 DEFAULT ENTERPRISE CONFIGURATION
// ============================================================================

export const defaultEnterpriseStrategyConfig: StrategyEngineConfig = {
    enableParallelExecution: true,
    maxConcurrentStrategies: 5,
    signalAggregationMethod: 'adaptive',
    conflictResolution: 'highest_confidence',
    performanceTracking: true,
    adaptiveWeighting: true,
    riskFiltering: true,
    executionTimeout: 5000, // 5 seconds
    healthMonitoring: true
};

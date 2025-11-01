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
 * 🎯 POINT 3: ENTERPRISE STRATEGY ENGINE
 * Advanced strategy management, orchestration, and signal generation system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultEnterpriseStrategyConfig = exports.EnterpriseStrategyEngine = exports.StrategySignalAggregator = void 0;
const events_1 = require("events");
// ============================================================================
// 🔄 STRATEGY SIGNAL AGGREGATOR
// ============================================================================
class StrategySignalAggregator {
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Aggregate signals from multiple strategies into final trading decisions
     */
    aggregateSignals(signals, method, strategies) {
        if (signals.length === 0)
            return [];
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
    weightedAverageAggregation(signals, strategies) {
        const aggregated = new Map();
        // Group signals by action type
        signals.forEach(signal => {
            const key = `${signal.action}_${signal.symbol}`;
            if (!aggregated.has(key)) {
                aggregated.set(key, []);
            }
            aggregated.get(key).push(signal);
        });
        const result = [];
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
            const aggregatedSignal = {
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
    consensusAggregation(signals, strategies) {
        const actionCounts = new Map();
        signals.forEach(signal => {
            const key = `${signal.action}_${signal.symbol}`;
            if (!actionCounts.has(key)) {
                actionCounts.set(key, []);
            }
            actionCounts.get(key).push(signal);
        });
        const result = [];
        const minConsensus = Math.ceil(strategies.size * 0.6); // 60% consensus required
        actionCounts.forEach((groupSignals, key) => {
            if (groupSignals.length >= minConsensus) {
                const avgConfidence = groupSignals.reduce((sum, s) => sum + s.confidence, 0) / groupSignals.length;
                const consensusSignal = {
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
    confidenceWeightedAggregation(signals, strategies) {
        const grouped = new Map();
        signals.forEach(signal => {
            const key = `${signal.action}_${signal.symbol}`;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(signal);
        });
        const result = [];
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
            const aggregatedSignal = {
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
    adaptiveAggregation(signals, strategies) {
        // Adaptive aggregation considers recent performance of strategies
        const performanceWeights = new Map();
        strategies.forEach((strategy, id) => {
            const metrics = strategy.getMetrics?.() || {};
            const winRate = metrics.winRate || 0.5;
            const sharpeRatio = metrics.sharpeRatio || 0;
            const recentPerformance = Math.max(0.1, winRate + (sharpeRatio * 0.1)); // Minimum 0.1 weight
            performanceWeights.set(id, recentPerformance);
        });
        const grouped = new Map();
        signals.forEach(signal => {
            const key = `${signal.action}_${signal.symbol}`;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(signal);
        });
        const result = [];
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
            const aggregatedSignal = {
                ...groupSignals[0],
                confidence: weightedConfidence / totalAdaptiveWeight,
                price: weightedPrice / totalAdaptiveWeight,
                quantity: weightedQuantity / totalAdaptiveWeight,
                strategyId: 'ADAPTIVE',
                metadata: {
                    ...groupSignals[0].metadata,
                    aggregationMethod: 'adaptive',
                    adaptiveWeights: Object.fromEntries(groupSignals.map(s => [s.strategyId, performanceWeights.get(s.strategyId) || 0.5])),
                    sourceStrategies: groupSignals.map(s => s.strategyId)
                }
            };
            result.push(aggregatedSignal);
        });
        return result;
    }
}
exports.StrategySignalAggregator = StrategySignalAggregator;
// ============================================================================
// 🎯 ENTERPRISE STRATEGY ENGINE
// ============================================================================
class EnterpriseStrategyEngine extends events_1.EventEmitter {
    constructor(config, logger) {
        super();
        this.strategies = new Map();
        this.strategyMetrics = new Map();
        this.isRunning = false;
        this.config = config;
        this.logger = logger;
        this.signalAggregator = new StrategySignalAggregator(logger);
        this.enginePerformance = this.initializePerformance();
    }
    initializePerformance() {
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
    registerStrategy(strategy) {
        this.strategies.set(strategy.name, strategy);
        this.strategyMetrics.set(strategy.name, this.initializeStrategyMetrics(strategy));
        this.logger.info(`📈 Registered strategy: ${strategy.name}`);
        this.emit('strategy_registered', { name: strategy.name });
    }
    initializeStrategyMetrics(strategy) {
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
    async executeStrategies(state) {
        if (!this.isRunning) {
            throw new Error('Strategy engine is not running');
        }
        const startTime = Date.now();
        const allSignals = [];
        const executionPromises = [];
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
            }
            else {
                await promise;
            }
        }
        // Wait for remaining parallel executions
        if (executionPromises.length > 0) {
            await Promise.all(executionPromises);
        }
        // Aggregate signals
        const aggregatedSignals = this.signalAggregator.aggregateSignals(allSignals, this.config.signalAggregationMethod, this.strategies);
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
    async executeStrategy(strategy, state, allSignals) {
        const strategyStartTime = Date.now();
        try {
            // Execute strategy with timeout
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Strategy execution timeout')), this.config.executionTimeout));
            const signals = await Promise.race([
                strategy.run(state),
                timeoutPromise
            ]);
            const executionTime = Date.now() - strategyStartTime;
            // Enhance signals with metadata
            const enhancedSignals = signals.map(signal => ({
                ...signal,
                executionTime,
                strategyMetrics: this.strategyMetrics.get(strategy.name),
                riskScore: this.calculateRiskScore(signal, state)
            }));
            allSignals.push(...enhancedSignals);
            // Update strategy metrics
            this.updateStrategyMetrics(strategy.name, enhancedSignals, executionTime, true);
            this.logger.debug(`📊 ${strategy.name}: ${signals.length} signals in ${executionTime}ms`);
        }
        catch (error) {
            this.logger.error(`❌ Strategy ${strategy.name} failed:`, error);
            this.updateStrategyMetrics(strategy.name, [], Date.now() - strategyStartTime, false);
            this.emit('strategy_error', { name: strategy.name, error });
        }
    }
    calculateRiskScore(signal, state) {
        // Simple risk scoring based on market conditions and signal properties
        let riskScore = 0.5; // Base risk
        // Adjust for market volatility
        if (state.regime?.volatility > 0.8)
            riskScore += 0.2;
        if (state.regime?.volatility < 0.3)
            riskScore -= 0.1;
        // Adjust for signal confidence
        riskScore += (1 - signal.confidence) * 0.3;
        // Adjust for portfolio exposure
        const currentExposure = state.positions.reduce((sum, pos) => sum + Math.abs(pos.size), 0);
        if (currentExposure > 10000)
            riskScore += 0.1; // High exposure
        return Math.max(0, Math.min(1, riskScore));
    }
    applyRiskFiltering(signals, state) {
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
    updateStrategyMetrics(strategyName, signals, executionTime, success) {
        const metrics = this.strategyMetrics.get(strategyName);
        if (!metrics)
            return;
        metrics.totalSignals += signals.length;
        metrics.lastExecuted = new Date();
        if (success) {
            metrics.successfulSignals++;
            metrics.avgExecutionTime = (metrics.avgExecutionTime + executionTime) / 2;
            if (signals.length > 0) {
                const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
                metrics.avgConfidence = (metrics.avgConfidence + avgConfidence) / 2;
            }
        }
        else {
            metrics.errors++;
            metrics.isHealthy = metrics.errors < 5; // Mark unhealthy after 5 consecutive errors
        }
        // Update adaptive weight if enabled
        if (this.config.adaptiveWeighting) {
            this.updateAdaptiveWeight(strategyName, metrics);
        }
        this.strategyMetrics.set(strategyName, metrics);
    }
    updateAdaptiveWeight(strategyName, metrics) {
        const strategy = this.strategies.get(strategyName);
        if (!strategy)
            return;
        const baseWeight = metrics.currentWeight;
        const performanceFactor = metrics.winRate * metrics.avgConfidence;
        const healthFactor = metrics.isHealthy ? 1 : 0.5;
        const adaptedWeight = baseWeight * performanceFactor * healthFactor;
        metrics.adaptedWeight = Math.max(0.1, Math.min(2.0, adaptedWeight)); // Clamp between 0.1 and 2.0
        strategy.setWeight(metrics.adaptedWeight);
    }
    updateEnginePerformance(startTime, rawSignals, finalSignals) {
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
    async start() {
        if (this.isRunning)
            return;
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
    async stop() {
        if (!this.isRunning)
            return;
        this.isRunning = false;
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        this.logger.info('🛑 Stopping Enterprise Strategy Engine');
        this.emit('engine_stopped');
    }
    startHealthMonitoring() {
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, 30000); // Check every 30 seconds
    }
    performHealthCheck() {
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
    getEngineStatus() {
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
    getStrategyMetrics(strategyName) {
        if (strategyName) {
            return this.strategyMetrics.get(strategyName) || null;
        }
        return Array.from(this.strategyMetrics.values());
    }
    /**
     * Update strategy weight dynamically
     */
    updateStrategyWeight(strategyName, newWeight) {
        const strategy = this.strategies.get(strategyName);
        if (!strategy)
            return false;
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
exports.EnterpriseStrategyEngine = EnterpriseStrategyEngine;
// ============================================================================
// 🎯 DEFAULT ENTERPRISE CONFIGURATION
// ============================================================================
exports.defaultEnterpriseStrategyConfig = {
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

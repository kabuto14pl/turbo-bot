/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🎯 POINT 3: ENTERPRISE STRATEGY ENGINE V2
 * Finalna wersja enterprise-grade strategy management system
 */

import { EventEmitter } from 'events';
import { BotState } from '../types/bot_state';
import { StrategySignal, Strategy } from '../types/strategy';
import { Regime } from '../types/regime';
import { Logger } from '../utils/logger';

// ============================================================================
// 🎯 ENTERPRISE STRATEGY INTERFACES
// ============================================================================

export interface EnterpriseStrategyConfig {
    maxStrategies: number;
    aggregationMethod: 'weighted' | 'consensus' | 'confidence' | 'adaptive';
    riskThreshold: number;
    signalTimeout: number;
    performanceWindow: number;
    enableMetrics: boolean;
    enableRiskFiltering: boolean;
}

export interface StrategyMetrics {
    strategyId: string;
    winRate: number;
    avgReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    totalTrades: number;
    lastExecutionTime: number;
    successfulSignals: number;
    failedSignals: number;
    avgConfidence: number;
    riskScore: number;
}

export interface EnterpriseStrategySignal extends StrategySignal {
    strategyId: string;
    timestamp: number;
    weight: number;
    timeframe: string;
    symbol: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    quantity: number;
    riskScore?: number;
    executionTime?: number;
    strategyMetrics?: StrategyMetrics;
}

export interface AggregatedSignal {
    type: 'ENTER_LONG' | 'ENTER_SHORT' | 'EXIT_LONG' | 'EXIT_SHORT';
    price: number;
    confidence: number;
    quantity: number;
    stopLoss?: number;
    takeProfit?: number;
    metadata: {
        strategy: string;
        timeframe: string;
        regime: Regime;
        aggregationMethod: string;
        sourceStrategies: string[];
        sourceCount: number;
    };
    indicators: { [key: string]: number };
}

export interface StrategyPerformance {
    strategyId: string;
    period: string;
    returns: number[];
    trades: number;
    winRate: number;
    sharpeRatio: number;
    maxDrawdown: number;
    volatility: number;
    lastUpdate: number;
}

// ============================================================================
// 🏗️ ENTERPRISE STRATEGY ENGINE
// ============================================================================

export class EnterpriseStrategyEngine extends EventEmitter {
    private strategies: Map<string, Strategy> = new Map();
    private strategyMetrics: Map<string, StrategyMetrics> = new Map();
    private strategyPerformance: Map<string, StrategyPerformance> = new Map();
    private signalHistory: EnterpriseStrategySignal[] = [];
    private config: EnterpriseStrategyConfig;
    private logger: Logger;
    private isActive: boolean = false;

    constructor(config: Partial<EnterpriseStrategyConfig> = {}, logger?: Logger) {
        super();
        
        this.config = {
            maxStrategies: 10,
            aggregationMethod: 'adaptive',
            riskThreshold: 0.8,
            signalTimeout: 30000, // 30 seconds
            performanceWindow: 100, // last 100 trades
            enableMetrics: true,
            enableRiskFiltering: true,
            ...config
        };

        this.logger = logger || new Logger();
        this.logger.info('🏗️ Enterprise Strategy Engine initialized', this.config);
    }

    // ========================================================================
    // 🔧 STRATEGY MANAGEMENT
    // ========================================================================

    async registerStrategy(strategy: Strategy, weight: number = 1.0): Promise<void> {
        if (this.strategies.size >= this.config.maxStrategies) {
            throw new Error(`Maximum strategies limit reached: ${this.config.maxStrategies}`);
        }

        this.strategies.set(strategy.name, strategy);
        
        // Initialize metrics
        this.strategyMetrics.set(strategy.name, {
            strategyId: strategy.name,
            winRate: 0,
            avgReturn: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
            totalTrades: 0,
            lastExecutionTime: 0,
            successfulSignals: 0,
            failedSignals: 0,
            avgConfidence: 0,
            riskScore: 0
        });

        this.logger.info(`✅ Strategy registered: ${strategy.name} (weight: ${weight})`);
        this.emit('strategyRegistered', { name: strategy.name, weight });
    }

    async unregisterStrategy(strategyName: string): Promise<void> {
        if (!this.strategies.has(strategyName)) {
            throw new Error(`Strategy not found: ${strategyName}`);
        }

        this.strategies.delete(strategyName);
        this.strategyMetrics.delete(strategyName);
        this.strategyPerformance.delete(strategyName);

        this.logger.info(`🗑️ Strategy unregistered: ${strategyName}`);
        this.emit('strategyUnregistered', { name: strategyName });
    }

    getRegisteredStrategies(): string[] {
        return Array.from(this.strategies.keys());
    }

    getStrategyMetrics(strategyName: string): StrategyMetrics | null {
        return this.strategyMetrics.get(strategyName) || null;
    }

    // ========================================================================
    // 🎯 SIGNAL GENERATION & AGGREGATION
    // ========================================================================

    async generateAggregatedSignals(state: BotState): Promise<AggregatedSignal[]> {
        if (!this.isActive) {
            return [];
        }

        const startTime = Date.now();
        const rawSignals: EnterpriseStrategySignal[] = [];

        // Generate signals from all strategies
        for (const [strategyName, strategy] of this.strategies) {
            try {
                const signalStartTime = Date.now();
                const signal = strategy.generateSignal(state);
                
                if (signal) {
                    const enhancedSignal: EnterpriseStrategySignal = {
                        ...signal,
                        strategyId: strategyName,
                        timestamp: Date.now(),
                        weight: strategy.defaultWeight || 1.0,
                        timeframe: state.marketContext?.timeframe || 'm15',
                        symbol: state.marketContext?.symbol || 'BTCUSDT',
                        action: this.mapSignalTypeToAction(signal.type),
                        quantity: signal.size || 0.1,
                        executionTime: Date.now() - signalStartTime,
                        strategyMetrics: this.strategyMetrics.get(strategyName)
                    };

                    // Calculate risk score
                    enhancedSignal.riskScore = this.calculateRiskScore(enhancedSignal, state);
                    
                    rawSignals.push(enhancedSignal);
                }
            } catch (error) {
                this.logger.error(`❌ Strategy ${strategyName} signal generation failed:`, error);
                this.updateStrategyMetrics(strategyName, { failedSignals: 1 });
            }
        }

        // Apply risk filtering
        const filteredSignals = this.config.enableRiskFiltering 
            ? this.applyRiskFiltering(rawSignals, state)
            : rawSignals;

        // Aggregate signals
        const aggregatedSignals = await this.aggregateSignals(filteredSignals, state);

        // Update signal history
        this.signalHistory.push(...filteredSignals);
        this.trimSignalHistory();

        const executionTime = Date.now() - startTime;
        this.logger.info(`🎯 Generated ${aggregatedSignals.length} aggregated signals from ${rawSignals.length} raw signals (${executionTime}ms)`);

        this.emit('signalsGenerated', {
            rawSignals: rawSignals.length,
            filteredSignals: filteredSignals.length,
            aggregatedSignals: aggregatedSignals.length,
            executionTime
        });

        return aggregatedSignals;
    }

    private async aggregateSignals(signals: EnterpriseStrategySignal[], state: BotState): Promise<AggregatedSignal[]> {
        if (signals.length === 0) return [];

        switch (this.config.aggregationMethod) {
            case 'weighted':
                return this.aggregateByWeight(signals, state);
            case 'consensus':
                return this.aggregateByConsensus(signals, state);
            case 'confidence':
                return this.aggregateByConfidence(signals, state);
            case 'adaptive':
                return this.aggregateAdaptive(signals, state);
            default:
                return this.aggregateByWeight(signals, state);
        }
    }

    private aggregateByWeight(signals: EnterpriseStrategySignal[], state: BotState): AggregatedSignal[] {
        const groupedSignals = this.groupSignalsByAction(signals);
        const aggregated: AggregatedSignal[] = [];

        for (const [action, groupSignals] of groupedSignals) {
            if (groupSignals.length === 0) continue;

            let totalWeight = 0;
            let weightedConfidence = 0;
            let weightedPrice = 0;
            let weightedQuantity = 0;

            groupSignals.forEach(signal => {
                const weight = signal.weight;
                totalWeight += weight;
                weightedConfidence += signal.confidence * weight;
                weightedPrice += signal.price * weight;
                weightedQuantity += signal.quantity * weight;
            });

            aggregated.push({
                type: this.mapActionToSignalType(action),
                price: weightedPrice / totalWeight,
                confidence: weightedConfidence / totalWeight,
                quantity: weightedQuantity / totalWeight,
                stopLoss: groupSignals[0].stopLoss,
                takeProfit: groupSignals[0].takeProfit,
                metadata: {
                    strategy: 'weighted_aggregation',
                    timeframe: 'multi',
                    regime: state.regime,
                    aggregationMethod: 'weighted',
                    sourceStrategies: groupSignals.map(s => s.strategyId),
                    sourceCount: groupSignals.length
                },
                indicators: this.mergeIndicators(groupSignals)
            });
        }

        return aggregated;
    }

    private aggregateByConsensus(signals: EnterpriseStrategySignal[], state: BotState): AggregatedSignal[] {
        const groupedSignals = this.groupSignalsByAction(signals);
        const aggregated: AggregatedSignal[] = [];
        const consensusThreshold = 0.6; // 60% consensus required

        for (const [action, groupSignals] of groupedSignals) {
            const consensusRatio = groupSignals.length / signals.length;
            
            if (consensusRatio >= consensusThreshold) {
                const avgConfidence = groupSignals.reduce((sum, s) => sum + s.confidence, 0) / groupSignals.length;
                const avgPrice = groupSignals.reduce((sum, s) => sum + s.price, 0) / groupSignals.length;
                const avgQuantity = groupSignals.reduce((sum, s) => sum + s.quantity, 0) / groupSignals.length;

                aggregated.push({
                    type: this.mapActionToSignalType(action),
                    price: avgPrice,
                    confidence: avgConfidence * consensusRatio, // Boost confidence by consensus
                    quantity: avgQuantity,
                    stopLoss: groupSignals[0].stopLoss,
                    takeProfit: groupSignals[0].takeProfit,
                    metadata: {
                        strategy: 'consensus_aggregation',
                        timeframe: 'multi',
                        regime: state.regime,
                        aggregationMethod: 'consensus',
                        sourceStrategies: groupSignals.map(s => s.strategyId),
                        sourceCount: groupSignals.length
                    },
                    indicators: this.mergeIndicators(groupSignals)
                });
            }
        }

        return aggregated;
    }

    private aggregateByConfidence(signals: EnterpriseStrategySignal[], state: BotState): AggregatedSignal[] {
        const groupedSignals = this.groupSignalsByAction(signals);
        const aggregated: AggregatedSignal[] = [];

        for (const [action, groupSignals] of groupedSignals) {
            if (groupSignals.length === 0) continue;

            // Sort by confidence and take top performers
            const sortedSignals = groupSignals.sort((a, b) => b.confidence - a.confidence);
            const topSignals = sortedSignals.slice(0, Math.ceil(sortedSignals.length * 0.7)); // Top 70%

            let totalConfidence = 0;
            let weightedPrice = 0;
            let weightedQuantity = 0;

            topSignals.forEach(signal => {
                const confWeight = signal.confidence;
                totalConfidence += confWeight;
                weightedPrice += signal.price * confWeight;
                weightedQuantity += signal.quantity * confWeight;
            });

            const topConfidence = topSignals[0].confidence;

            aggregated.push({
                type: this.mapActionToSignalType(action),
                price: weightedPrice / totalConfidence,
                confidence: topConfidence,
                quantity: weightedQuantity / totalConfidence,
                stopLoss: topSignals[0].stopLoss,
                takeProfit: topSignals[0].takeProfit,
                metadata: {
                    strategy: 'confidence_aggregation',
                    timeframe: 'multi',
                    regime: state.regime,
                    aggregationMethod: 'confidence',
                    sourceStrategies: topSignals.map(s => s.strategyId),
                    sourceCount: topSignals.length
                },
                indicators: this.mergeIndicators(topSignals)
            });
        }

        return aggregated;
    }

    private aggregateAdaptive(signals: EnterpriseStrategySignal[], state: BotState): AggregatedSignal[] {
        const groupedSignals = this.groupSignalsByAction(signals);
        const aggregated: AggregatedSignal[] = [];

        for (const [action, groupSignals] of groupedSignals) {
            if (groupSignals.length === 0) continue;

            // Calculate adaptive weights based on recent performance
            const adaptiveWeights: { [key: string]: number } = {};
            let totalAdaptiveWeight = 0;

            groupSignals.forEach(signal => {
                const metrics = this.strategyMetrics.get(signal.strategyId);
                const performanceScore = metrics ? (metrics.winRate * 0.4 + metrics.sharpeRatio * 0.3 + (1 - metrics.riskScore) * 0.3) : 0.5;
                const recentPerformanceBoost = this.getRecentPerformanceBoost(signal.strategyId);
                
                adaptiveWeights[signal.strategyId] = Math.max(0.1, performanceScore * recentPerformanceBoost);
                totalAdaptiveWeight += adaptiveWeights[signal.strategyId];
            });

            let weightedConfidence = 0;
            let weightedPrice = 0;
            let weightedQuantity = 0;

            groupSignals.forEach(signal => {
                const adaptiveWeight = adaptiveWeights[signal.strategyId] / totalAdaptiveWeight;
                weightedConfidence += signal.confidence * adaptiveWeight;
                weightedPrice += signal.price * adaptiveWeight;
                weightedQuantity += signal.quantity * adaptiveWeight;
            });

            aggregated.push({
                type: this.mapActionToSignalType(action),
                price: weightedPrice,
                confidence: weightedConfidence,
                quantity: weightedQuantity,
                stopLoss: groupSignals[0].stopLoss,
                takeProfit: groupSignals[0].takeProfit,
                metadata: {
                    strategy: 'adaptive_aggregation',
                    timeframe: 'multi',
                    regime: state.regime,
                    aggregationMethod: 'adaptive',
                    sourceStrategies: groupSignals.map(s => s.strategyId),
                    sourceCount: groupSignals.length
                },
                indicators: this.mergeIndicators(groupSignals)
            });
        }

        return aggregated;
    }

    // ========================================================================
    // 🛡️ RISK MANAGEMENT & FILTERING
    // ========================================================================

    private applyRiskFiltering(signals: EnterpriseStrategySignal[], state: BotState): EnterpriseStrategySignal[] {
        const filteredSignals: EnterpriseStrategySignal[] = [];
        const currentExposure = state.positions.reduce((sum, pos) => sum + Math.abs(pos.size), 0);

        for (const signal of signals) {
            // Risk score filtering
            if (signal.riskScore && signal.riskScore > this.config.riskThreshold) {
                this.logger.warn(`🚫 Signal filtered due to high risk: ${signal.symbol} (${signal.riskScore})`);
                continue;
            }

            // Position size validation
            if (currentExposure + signal.quantity > state.portfolio.totalValue * 0.95) {
                this.logger.warn(`🚫 Signal filtered due to position size limit: ${signal.symbol}`);
                continue;
            }

            // Strategy performance filtering
            const metrics = this.strategyMetrics.get(signal.strategyId);
            if (metrics && metrics.winRate < 0.3 && metrics.totalTrades > 20) {
                this.logger.warn(`🚫 Signal filtered due to poor strategy performance: ${signal.strategyId}`);
                continue;
            }

            filteredSignals.push(signal);
        }

        return filteredSignals;
    }

    private calculateRiskScore(signal: EnterpriseStrategySignal, state: BotState): number {
        let riskScore = 0;

        // Confidence risk (low confidence = high risk)
        riskScore += (1 - signal.confidence) * 0.3;

        // Volatility risk
        const volatility = state.regime.volatility;
        riskScore += volatility * 0.3;

        // Position size risk
        const portfolioRisk = (signal.quantity * signal.price) / state.portfolio.totalValue;
        riskScore += Math.min(portfolioRisk * 2, 1) * 0.2;

        // Strategy performance risk
        const metrics = this.strategyMetrics.get(signal.strategyId);
        if (metrics && metrics.totalTrades > 5) {
            riskScore += (1 - metrics.winRate) * 0.2;
        }

        return Math.min(Math.max(riskScore, 0), 1);
    }

    // ========================================================================
    // 📊 PERFORMANCE TRACKING & METRICS
    // ========================================================================

    updateStrategyMetrics(strategyId: string, update: Partial<StrategyMetrics>): void {
        const existing = this.strategyMetrics.get(strategyId);
        if (existing) {
            const updated = { ...existing, ...update, lastExecutionTime: Date.now() };
            this.strategyMetrics.set(strategyId, updated);
            
            this.emit('metricsUpdated', { strategyId, metrics: updated });
        }
    }

    getPerformanceReport(): StrategyPerformance[] {
        return Array.from(this.strategyPerformance.values());
    }

    getDetailedMetrics(): { [strategyId: string]: StrategyMetrics } {
        const metrics: { [strategyId: string]: StrategyMetrics } = {};
        for (const [id, metric] of this.strategyMetrics) {
            metrics[id] = metric;
        }
        return metrics;
    }

    // ========================================================================
    // 🔧 UTILITY METHODS
    // ========================================================================

    private mapSignalTypeToAction(type: string): 'BUY' | 'SELL' | 'HOLD' {
        if (type.includes('ENTER_LONG') || type.includes('BUY')) return 'BUY';
        if (type.includes('ENTER_SHORT') || type.includes('SELL')) return 'SELL';
        return 'HOLD';
    }

    private mapActionToSignalType(action: string): 'ENTER_LONG' | 'ENTER_SHORT' | 'EXIT_LONG' | 'EXIT_SHORT' {
        switch (action) {
            case 'BUY': return 'ENTER_LONG';
            case 'SELL': return 'ENTER_SHORT';
            default: return 'ENTER_LONG';
        }
    }

    private groupSignalsByAction(signals: EnterpriseStrategySignal[]): Map<string, EnterpriseStrategySignal[]> {
        const groups = new Map<string, EnterpriseStrategySignal[]>();
        
        signals.forEach(signal => {
            const action = signal.action;
            if (!groups.has(action)) {
                groups.set(action, []);
            }
            groups.get(action)!.push(signal);
        });

        return groups;
    }

    private mergeIndicators(signals: EnterpriseStrategySignal[]): { [key: string]: number } {
        const merged: { [key: string]: number } = {};
        const indicatorCounts: { [key: string]: number } = {};

        signals.forEach(signal => {
            Object.entries(signal.indicators).forEach(([key, value]) => {
                if (typeof value === 'number') {
                    merged[key] = (merged[key] || 0) + value;
                    indicatorCounts[key] = (indicatorCounts[key] || 0) + 1;
                }
            });
        });

        // Average the indicators
        Object.keys(merged).forEach(key => {
            merged[key] = merged[key] / indicatorCounts[key];
        });

        return merged;
    }

    private getRecentPerformanceBoost(strategyId: string): number {
        // Simple recent performance boost calculation
        // In production, this would analyze recent trades
        return 1.0; // Neutral boost for now
    }

    private trimSignalHistory(): void {
        const maxHistory = 1000;
        if (this.signalHistory.length > maxHistory) {
            this.signalHistory = this.signalHistory.slice(-maxHistory);
        }
    }

    // ========================================================================
    // 🎮 LIFECYCLE MANAGEMENT
    // ========================================================================

    async start(): Promise<void> {
        if (this.isActive) {
            this.logger.warn('⚠️ Strategy Engine is already active');
            return;
        }

        this.isActive = true;
        this.logger.info('🚀 Enterprise Strategy Engine started');
        this.emit('started');
    }

    async stop(): Promise<void> {
        if (!this.isActive) {
            this.logger.warn('⚠️ Strategy Engine is not active');
            return;
        }

        this.isActive = false;
        this.logger.info('🛑 Enterprise Strategy Engine stopped');
        this.emit('stopped');
    }

    getStatus(): {
        isActive: boolean;
        strategiesCount: number;
        lastSignalTime: number;
        config: EnterpriseStrategyConfig;
    } {
        return {
            isActive: this.isActive,
            strategiesCount: this.strategies.size,
            lastSignalTime: this.signalHistory.length > 0 ? this.signalHistory[this.signalHistory.length - 1].timestamp : 0,
            config: this.config
        };
    }
}

// ============================================================================
// 🎯 ENTERPRISE STRATEGY MANAGER
// ============================================================================

export class EnterpriseStrategyManager {
    private engine: EnterpriseStrategyEngine;
    private logger: Logger;

    constructor(config?: Partial<EnterpriseStrategyConfig>, logger?: Logger) {
        this.logger = logger || new Logger();
        this.engine = new EnterpriseStrategyEngine(config, this.logger);
        
        this.setupEventHandlers();
        this.logger.info('🏗️ Enterprise Strategy Manager initialized');
    }

    private setupEventHandlers(): void {
        this.engine.on('signalsGenerated', (data) => {
            this.logger.info(`📊 Signals: ${data.rawSignals} raw → ${data.filteredSignals} filtered → ${data.aggregatedSignals} aggregated (${data.executionTime}ms)`);
        });

        this.engine.on('strategyRegistered', (data) => {
            this.logger.info(`✅ Strategy registered: ${data.name}`);
        });

        this.engine.on('metricsUpdated', (data) => {
            this.logger.debug(`📈 Metrics updated for ${data.strategyId}: WinRate=${(data.metrics.winRate * 100).toFixed(1)}%`);
        });
    }

    async registerStrategy(strategy: Strategy, weight: number = 1.0): Promise<void> {
        return this.engine.registerStrategy(strategy, weight);
    }

    async generateSignals(state: BotState): Promise<AggregatedSignal[]> {
        return this.engine.generateAggregatedSignals(state);
    }

    getEngine(): EnterpriseStrategyEngine {
        return this.engine;
    }

    async start(): Promise<void> {
        return this.engine.start();
    }

    async stop(): Promise<void> {
        return this.engine.stop();
    }

    getStatus(): any {
        return this.engine.getStatus();
    }
}

export default EnterpriseStrategyEngine;

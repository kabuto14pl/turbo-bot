/**
 * 🎯 ENTERPRISE STRATEGY MANAGER
 * High-level strategy orchestration and management system
 */

import { EventEmitter } from 'events';
import { EnterpriseStrategyEngine, StrategyEngineConfig, defaultEnterpriseStrategyConfig } from './enterprise_strategy_engine';
import { AbstractStrategy } from './abstract_strategy';
import { Logger } from '../../infrastructure/logging/logger';
import { BotState, StrategySignal } from '../types/strategy';

// Import existing strategies
import { EnhancedRSITurboStrategy } from './enhanced_rsi_turbo';
import { SuperTrendStrategy } from './supertrend';
import { MACrossoverStrategy } from './ma_crossover';
import { MomentumProStrategy } from './momentum_pro';
import { AdvancedAdaptiveStrategyFixed } from './advanced_adaptive_strategy_fixed';

// ============================================================================
// 🎯 STRATEGY MANAGER INTERFACES
// ============================================================================

export interface StrategyManagerConfig {
    autoLoadStrategies: boolean;
    enableTierSystem: boolean;
    dynamicAllocation: boolean;
    performanceBasedSelection: boolean;
    maxActiveStrategies: number;
    minConfidenceThreshold: number;
    riskBudgetPerStrategy: number;
    rebalanceInterval: number; // milliseconds
    monitoringEnabled: boolean;
}

export interface StrategyTier {
    tier: 'S' | 'A' | 'B' | 'C';
    name: string;
    strategies: string[];
    allocation: number; // Percentage of total capital
    riskLimit: number;
    description: string;
}

export interface StrategyAllocation {
    strategyName: string;
    tier: string;
    allocation: number;
    riskLimit: number;
    isActive: boolean;
    performance: number;
    confidence: number;
}

export interface MarketRegime {
    trend: 'bullish' | 'bearish' | 'sideways';
    volatility: 'low' | 'medium' | 'high';
    volume: 'low' | 'medium' | 'high';
    sentiment: 'positive' | 'neutral' | 'negative';
}

// ============================================================================
// 🏆 STRATEGY TIER SYSTEM
// ============================================================================

export class StrategyTierSystem {
    private tiers: Map<string, StrategyTier> = new Map();
    private strategyTierMapping: Map<string, string> = new Map();
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
        this.initializeDefaultTiers();
    }

    private initializeDefaultTiers(): void {
        // Tier S - Elite production strategies (highest allocation)
        this.tiers.set('S', {
            tier: 'S',
            name: 'Elite Production',
            strategies: ['RSITurbo', 'SuperTrend'],
            allocation: 50, // 50% of capital
            riskLimit: 0.05, // 5% max risk per trade
            description: 'Top-performing, battle-tested strategies'
        });

        // Tier A - Active trading strategies
        this.tiers.set('A', {
            tier: 'A',
            name: 'Active Trading',
            strategies: ['MACrossover', 'MomentumPro'],
            allocation: 30, // 30% of capital
            riskLimit: 0.03, // 3% max risk per trade
            description: 'Proven strategies with good performance'
        });

        // Tier B - Backup and experimental strategies
        this.tiers.set('B', {
            tier: 'B',
            name: 'Backup & Experimental',
            strategies: ['AdvancedAdaptive'],
            allocation: 15, // 15% of capital
            riskLimit: 0.02, // 2% max risk per trade
            description: 'Backup strategies and new experiments'
        });

        // Tier C - Research and development
        this.tiers.set('C', {
            tier: 'C',
            name: 'Research & Development',
            strategies: [],
            allocation: 5, // 5% of capital
            riskLimit: 0.01, // 1% max risk per trade
            description: 'Experimental and research strategies'
        });

        // Map strategies to tiers
        this.mapStrategiesToTiers();
    }

    private mapStrategiesToTiers(): void {
        this.tiers.forEach((tier, tierName) => {
            tier.strategies.forEach(strategyName => {
                this.strategyTierMapping.set(strategyName, tierName);
            });
        });
    }

    getStrategyTier(strategyName: string): string {
        return this.strategyTierMapping.get(strategyName) || 'C';
    }

    getTierConfig(tierName: string): StrategyTier | null {
        return this.tiers.get(tierName) || null;
    }

    getAllTiers(): StrategyTier[] {
        return Array.from(this.tiers.values());
    }

    moveStrategyToTier(strategyName: string, newTier: string): boolean {
        // Remove from current tier
        const currentTier = this.getStrategyTier(strategyName);
        const currentTierConfig = this.tiers.get(currentTier);
        if (currentTierConfig) {
            currentTierConfig.strategies = currentTierConfig.strategies.filter(s => s !== strategyName);
        }

        // Add to new tier
        const newTierConfig = this.tiers.get(newTier);
        if (newTierConfig) {
            newTierConfig.strategies.push(strategyName);
            this.strategyTierMapping.set(strategyName, newTier);
            this.logger.info(`📊 Moved strategy ${strategyName} from Tier ${currentTier} to Tier ${newTier}`);
            return true;
        }

        return false;
    }

    calculateTierAllocation(totalCapital: number): Map<string, number> {
        const allocations = new Map<string, number>();
        
        this.tiers.forEach((tier, tierName) => {
            const tierCapital = (totalCapital * tier.allocation) / 100;
            allocations.set(tierName, tierCapital);
        });

        return allocations;
    }
}

// ============================================================================
// 🎯 STRATEGY PERFORMANCE ANALYZER
// ============================================================================

export class StrategyPerformanceAnalyzer {
    private performanceHistory: Map<string, number[]> = new Map();
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    recordPerformance(strategyName: string, performance: number): void {
        if (!this.performanceHistory.has(strategyName)) {
            this.performanceHistory.set(strategyName, []);
        }
        
        const history = this.performanceHistory.get(strategyName)!;
        history.push(performance);
        
        // Keep only last 100 records
        if (history.length > 100) {
            history.shift();
        }
    }

    getPerformanceScore(strategyName: string): number {
        const history = this.performanceHistory.get(strategyName);
        if (!history || history.length === 0) return 0.5;

        // Calculate weighted average with more weight on recent performance
        let weightedSum = 0;
        let totalWeight = 0;

        for (let i = 0; i < history.length; i++) {
            const weight = Math.pow(1.1, i); // Exponential weight increase for recent data
            weightedSum += history[i] * weight;
            totalWeight += weight;
        }

        return weightedSum / totalWeight;
    }

    getTopPerformingStrategies(count: number = 3): string[] {
        const scores = new Map<string, number>();
        
        this.performanceHistory.forEach((_, strategyName) => {
            scores.set(strategyName, this.getPerformanceScore(strategyName));
        });

        return Array.from(scores.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, count)
            .map(([name]) => name);
    }

    shouldPromoteStrategy(strategyName: string): boolean {
        const score = this.getPerformanceScore(strategyName);
        const history = this.performanceHistory.get(strategyName);
        
        return score > 0.7 && (history?.length || 0) >= 10; // Good performance with enough data
    }

    shouldDemoteStrategy(strategyName: string): boolean {
        const score = this.getPerformanceScore(strategyName);
        const history = this.performanceHistory.get(strategyName);
        
        return score < 0.3 && (history?.length || 0) >= 10; // Poor performance with enough data
    }
}

// ============================================================================
// 🎯 ENTERPRISE STRATEGY MANAGER
// ============================================================================

export class EnterpriseStrategyManager extends EventEmitter {
    private strategyEngine: EnterpriseStrategyEngine;
    private tierSystem: StrategyTierSystem;
    private performanceAnalyzer: StrategyPerformanceAnalyzer;
    private config: StrategyManagerConfig;
    private logger: Logger;
    private isRunning: boolean = false;
    private rebalanceTimer?: NodeJS.Timeout;
    private currentAllocations: Map<string, StrategyAllocation> = new Map();

    constructor(
        config: StrategyManagerConfig,
        engineConfig: StrategyEngineConfig = defaultEnterpriseStrategyConfig,
        logger: Logger
    ) {
        super();
        this.config = config;
        this.logger = logger;
        this.strategyEngine = new EnterpriseStrategyEngine(engineConfig, logger);
        this.tierSystem = new StrategyTierSystem(logger);
        this.performanceAnalyzer = new StrategyPerformanceAnalyzer(logger);

        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        this.strategyEngine.on('strategies_executed', (data) => {
            this.handleStrategiesExecuted(data);
        });

        this.strategyEngine.on('strategy_error', (data) => {
            this.handleStrategyError(data);
        });

        this.strategyEngine.on('health_alert', (data) => {
            this.handleHealthAlert(data);
        });
    }

    /**
     * Initialize and start the strategy manager
     */
    async initialize(): Promise<void> {
        if (this.config.autoLoadStrategies) {
            await this.loadDefaultStrategies();
        }

        await this.strategyEngine.start();
        this.isRunning = true;

        if (this.config.dynamicAllocation && this.config.rebalanceInterval > 0) {
            this.startRebalancing();
        }

        this.logger.info('🎯 Enterprise Strategy Manager initialized');
        this.emit('manager_initialized');
    }

    /**
     * Load default strategies into the engine
     */
    private async loadDefaultStrategies(): Promise<void> {
        this.logger.info('📚 Loading default strategies...');

        const strategies: AbstractStrategy[] = [
            new EnhancedRSITurboStrategy(this.logger),
            new SuperTrendStrategy(this.logger),
            new MACrossoverStrategy(this.logger),
            new MomentumProStrategy(this.logger),
            new AdvancedAdaptiveStrategyFixed(this.logger)
        ];

        for (const strategy of strategies) {
            this.registerStrategy(strategy);
        }

        this.logger.info(`✅ Loaded ${strategies.length} default strategies`);
    }

    /**
     * Register a new strategy with tier assignment
     */
    registerStrategy(strategy: AbstractStrategy): void {
        this.strategyEngine.registerStrategy(strategy);
        
        const tier = this.tierSystem.getStrategyTier(strategy.name);
        const tierConfig = this.tierSystem.getTierConfig(tier);
        
        if (tierConfig) {
            const allocation: StrategyAllocation = {
                strategyName: strategy.name,
                tier: tier,
                allocation: tierConfig.allocation / tierConfig.strategies.length,
                riskLimit: tierConfig.riskLimit,
                isActive: true,
                performance: 0.5,
                confidence: 0.5
            };
            
            this.currentAllocations.set(strategy.name, allocation);
            this.logger.info(`📈 Registered ${strategy.name} in Tier ${tier} with ${allocation.allocation}% allocation`);
        }

        this.emit('strategy_registered', { name: strategy.name, tier });
    }

    /**
     * Execute strategies with market regime awareness
     */
    async executeStrategies(state: BotState): Promise<StrategySignal[]> {
        if (!this.isRunning) {
            throw new Error('Strategy manager is not running');
        }

        // Analyze current market regime
        const marketRegime = this.analyzeMarketRegime(state);
        
        // Adapt strategy selection based on market conditions
        this.adaptStrategiesForRegime(marketRegime);

        // Execute strategies through the engine
        const signals = await this.strategyEngine.executeStrategies(state);

        // Post-process signals with manager-level logic
        return this.postProcessSignals(signals, state, marketRegime);
    }

    private analyzeMarketRegime(state: BotState): MarketRegime {
        // Simple market regime analysis based on available data
        const volatility = state.regime?.volatility || 0.5;
        const trend = state.regime?.trend || 0;
        
        let volatilityLevel: 'low' | 'medium' | 'high' = 'medium';
        if (volatility < 0.3) volatilityLevel = 'low';
        else if (volatility > 0.7) volatilityLevel = 'high';

        let trendDirection: 'bullish' | 'bearish' | 'sideways' = 'sideways';
        if (trend > 0.6) trendDirection = 'bullish';
        else if (trend < -0.6) trendDirection = 'bearish';

        return {
            trend: trendDirection,
            volatility: volatilityLevel,
            volume: 'medium', // Default since we don't have volume analysis yet
            sentiment: 'neutral' // Default since we don't have sentiment analysis yet
        };
    }

    private adaptStrategiesForRegime(regime: MarketRegime): void {
        // Adjust strategy weights based on market regime
        this.currentAllocations.forEach((allocation, strategyName) => {
            let weightMultiplier = 1.0;

            // RSI strategies perform better in ranging markets
            if (strategyName.includes('RSI') && regime.trend === 'sideways') {
                weightMultiplier = 1.2;
            }

            // Trend-following strategies perform better in trending markets
            if (strategyName.includes('SuperTrend') && regime.trend !== 'sideways') {
                weightMultiplier = 1.3;
            }

            // Reduce weights in high volatility for conservative strategies
            if (regime.volatility === 'high') {
                weightMultiplier *= 0.8;
            }

            // Update strategy weight
            this.strategyEngine.updateStrategyWeight(strategyName, allocation.allocation * weightMultiplier / 100);
        });
    }

    private postProcessSignals(
        signals: StrategySignal[],
        state: BotState,
        regime: MarketRegime
    ): StrategySignal[] {
        // Apply manager-level filtering and enhancement
        return signals.filter(signal => {
            // Filter based on current allocations
            const allocation = this.currentAllocations.get(signal.strategyId);
            if (!allocation || !allocation.isActive) return false;

            // Enhanced confidence filtering based on market regime
            let minConfidence = this.config.minConfidenceThreshold;
            
            if (regime.volatility === 'high') {
                minConfidence += 0.1; // Require higher confidence in volatile markets
            }

            return signal.confidence >= minConfidence;
        }).map(signal => {
            // Enhance signals with allocation-based position sizing
            const allocation = this.currentAllocations.get(signal.strategyId);
            if (allocation) {
                signal.quantity *= (allocation.allocation / 100); // Scale by allocation
            }
            
            return signal;
        });
    }

    private handleStrategiesExecuted(data: any): void {
        // Update performance metrics for each strategy
        const engineStatus = this.strategyEngine.getEngineStatus();
        
        engineStatus.strategyMetrics.forEach(metrics => {
            // Record performance
            const performanceScore = metrics.winRate * metrics.avgConfidence;
            this.performanceAnalyzer.recordPerformance(metrics.strategyId, performanceScore);

            // Update allocation performance
            const allocation = this.currentAllocations.get(metrics.strategyId);
            if (allocation) {
                allocation.performance = performanceScore;
                allocation.confidence = metrics.avgConfidence;
                this.currentAllocations.set(metrics.strategyId, allocation);
            }
        });

        // Check for tier promotions/demotions
        if (this.config.performanceBasedSelection) {
            this.evaluateTierChanges();
        }

        this.emit('performance_updated', { metrics: engineStatus.strategyMetrics });
    }

    private handleStrategyError(data: any): void {
        this.logger.error(`Strategy error from ${data.name}:`, data.error);
        
        // Temporarily disable problematic strategy
        const allocation = this.currentAllocations.get(data.name);
        if (allocation) {
            allocation.isActive = false;
            this.currentAllocations.set(data.name, allocation);
            this.logger.warn(`🚫 Temporarily disabled strategy: ${data.name}`);
        }

        this.emit('strategy_disabled', { name: data.name, reason: data.error });
    }

    private handleHealthAlert(data: any): void {
        this.logger.warn('Health alert received:', data);
        this.emit('health_alert', data);
    }

    private evaluateTierChanges(): void {
        this.currentAllocations.forEach((allocation, strategyName) => {
            // Check for promotion
            if (this.performanceAnalyzer.shouldPromoteStrategy(strategyName)) {
                const currentTier = allocation.tier;
                const newTier = this.getPromotionTier(currentTier);
                
                if (newTier && newTier !== currentTier) {
                    this.promoteStrategy(strategyName, newTier);
                }
            }
            
            // Check for demotion
            if (this.performanceAnalyzer.shouldDemoteStrategy(strategyName)) {
                const currentTier = allocation.tier;
                const newTier = this.getDemotionTier(currentTier);
                
                if (newTier && newTier !== currentTier) {
                    this.demoteStrategy(strategyName, newTier);
                }
            }
        });
    }

    private getPromotionTier(currentTier: string): string | null {
        const promotions: { [key: string]: string } = {
            'C': 'B',
            'B': 'A',
            'A': 'S'
        };
        return promotions[currentTier] || null;
    }

    private getDemotionTier(currentTier: string): string | null {
        const demotions: { [key: string]: string } = {
            'S': 'A',
            'A': 'B',
            'B': 'C'
        };
        return demotions[currentTier] || null;
    }

    private promoteStrategy(strategyName: string, newTier: string): void {
        if (this.tierSystem.moveStrategyToTier(strategyName, newTier)) {
            const allocation = this.currentAllocations.get(strategyName);
            if (allocation) {
                const tierConfig = this.tierSystem.getTierConfig(newTier);
                if (tierConfig) {
                    allocation.tier = newTier;
                    allocation.allocation = tierConfig.allocation / tierConfig.strategies.length;
                    allocation.riskLimit = tierConfig.riskLimit;
                    this.currentAllocations.set(strategyName, allocation);
                    
                    this.logger.info(`🎉 Promoted strategy ${strategyName} to Tier ${newTier}`);
                    this.emit('strategy_promoted', { name: strategyName, newTier });
                }
            }
        }
    }

    private demoteStrategy(strategyName: string, newTier: string): void {
        if (this.tierSystem.moveStrategyToTier(strategyName, newTier)) {
            const allocation = this.currentAllocations.get(strategyName);
            if (allocation) {
                const tierConfig = this.tierSystem.getTierConfig(newTier);
                if (tierConfig) {
                    allocation.tier = newTier;
                    allocation.allocation = tierConfig.allocation / tierConfig.strategies.length;
                    allocation.riskLimit = tierConfig.riskLimit;
                    this.currentAllocations.set(strategyName, allocation);
                    
                    this.logger.warn(`📉 Demoted strategy ${strategyName} to Tier ${newTier}`);
                    this.emit('strategy_demoted', { name: strategyName, newTier });
                }
            }
        }
    }

    private startRebalancing(): void {
        this.rebalanceTimer = setInterval(() => {
            this.rebalanceAllocations();
        }, this.config.rebalanceInterval);
    }

    private rebalanceAllocations(): void {
        this.logger.info('🔄 Rebalancing strategy allocations...');
        
        // Get top performing strategies
        const topStrategies = this.performanceAnalyzer.getTopPerformingStrategies(this.config.maxActiveStrategies);
        
        // Temporarily boost allocation for top performers
        this.currentAllocations.forEach((allocation, strategyName) => {
            if (topStrategies.includes(strategyName)) {
                allocation.allocation *= 1.1; // 10% boost
            } else {
                allocation.allocation *= 0.95; // 5% reduction
            }
            
            // Ensure allocations don't go below minimum or above maximum
            allocation.allocation = Math.max(1, Math.min(50, allocation.allocation));
            this.currentAllocations.set(strategyName, allocation);
        });

        this.emit('allocations_rebalanced', { allocations: Array.from(this.currentAllocations.values()) });
    }

    /**
     * Get current manager status
     */
    getManagerStatus(): {
        isRunning: boolean;
        engineStatus: any;
        allocations: StrategyAllocation[];
        tiers: StrategyTier[];
        topPerformers: string[];
    } {
        return {
            isRunning: this.isRunning,
            engineStatus: this.strategyEngine.getEngineStatus(),
            allocations: Array.from(this.currentAllocations.values()),
            tiers: this.tierSystem.getAllTiers(),
            topPerformers: this.performanceAnalyzer.getTopPerformingStrategies(5)
        };
    }

    /**
     * Stop the strategy manager
     */
    async stop(): Promise<void> {
        this.isRunning = false;
        
        if (this.rebalanceTimer) {
            clearInterval(this.rebalanceTimer);
        }

        await this.strategyEngine.stop();
        this.logger.info('🛑 Enterprise Strategy Manager stopped');
        this.emit('manager_stopped');
    }
}

// ============================================================================
// 🎯 DEFAULT CONFIGURATION
// ============================================================================

export const defaultStrategyManagerConfig: StrategyManagerConfig = {
    autoLoadStrategies: true,
    enableTierSystem: true,
    dynamicAllocation: true,
    performanceBasedSelection: true,
    maxActiveStrategies: 5,
    minConfidenceThreshold: 0.6,
    riskBudgetPerStrategy: 0.02, // 2% risk per strategy
    rebalanceInterval: 300000, // 5 minutes
    monitoringEnabled: true
};

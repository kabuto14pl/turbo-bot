/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * PHASE C.2 - Advanced Strategy Orchestration Engine
 * Enterprise Trading Bot - Multi-Strategy Coordination System
 * 
 * Features:
 * - Multi-strategy coordination and execution
 * - Dynamic strategy switching based on market regime
 * - Memory optimization integration (Phase B)
 * - Performance monitoring and tracking
 * - Signal aggregation across multiple timeframes
 * - Risk management and position sizing
 */

import { EventEmitter } from 'events';
import type { NormalizedMarketData } from '../integration/real_time_market_data_engine';

// Import existing strategies
interface BaseStrategy {
    name: string;
    timeframe: string;
    enabled: boolean;
    priority: number;
    riskLevel: 'low' | 'medium' | 'high';
    marketRegimes: string[];
    generateSignal(data: NormalizedMarketData): Promise<TradingSignal>;
    getPerformanceMetrics(): StrategyPerformance;
    updateParameters(params: any): void;
}

interface TradingSignal {
    strategy: string;
    symbol: string;
    action: 'buy' | 'sell' | 'hold';
    strength: number; // 0-100
    confidence: number; // 0-100
    timeframe: string;
    timestamp: number;
    reasoning: string;
    metadata: {
        entry_price?: number;
        stop_loss?: number;
        take_profit?: number;
        position_size?: number;
        risk_score?: number;
    };
}

interface StrategyPerformance {
    name: string;
    totalSignals: number;
    successfulSignals: number;
    failedSignals: number;
    winRate: number;
    avgLatency: number;
    memoryUsage: number;
    errorRate: number;
    lastExecutionTime: number;
    profitLoss: number;
}

interface MarketRegime {
    name: string;
    confidence: number;
    indicators: {
        volatility: number;
        trend: 'bullish' | 'bearish' | 'sideways';
        volume: number;
        momentum: number;
    };
    timestamp: number;
}

interface OrchestrationConfig {
    strategies: BaseStrategy[];
    maxConcurrentStrategies: number;
    signalAggregationMethod: 'weighted' | 'consensus' | 'priority';
    marketRegimeDetection: boolean;
    memoryOptimization: boolean;
    performanceMonitoring: boolean;
    riskManagement: {
        maxRiskPerTrade: number;
        maxPortfolioRisk: number;
        stopLossEnabled: boolean;
        positionSizingMethod: 'fixed' | 'dynamic' | 'risk_based';
    };
    switchingThresholds: {
        performanceDelta: number;
        confidenceThreshold: number;
        latencyThreshold: number;
    };
}

interface AggregatedSignal {
    symbol: string;
    finalAction: 'buy' | 'sell' | 'hold';
    confidence: number;
    strength: number;
    contributingStrategies: string[];
    riskScore: number;
    positionSize: number;
    timestamp: number;
    reasoning: string;
    metadata: {
        signals: TradingSignal[];
        marketRegime: MarketRegime;
        performanceMetrics: StrategyPerformance[];
    };
}

interface MemoryStats {
    heapUsed: number;
    heapTotal: number;
    external: number;
    strategiesMemory: number;
    cacheMemory: number;
    gcActivity: {
        collections: number;
        pauseTime: number;
    };
}

export class AdvancedStrategyOrchestrator extends EventEmitter {
    private strategies: Map<string, BaseStrategy> = new Map();
    private activeStrategies: Set<string> = new Set();
    private signalHistory: TradingSignal[] = [];
    private performanceMetrics: Map<string, StrategyPerformance> = new Map();
    private currentMarketRegime: MarketRegime | null = null;
    private memoryMonitor: NodeJS.Timeout | null = null;
    private performanceTimer: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;
    private startTime: number = 0;

    // Memory optimization integration (Phase B)
    private memoryOptimizer: any = null;
    private cacheService: any = null;

    // Performance tracking
    private stats = {
        totalSignalsProcessed: 0,
        signalsPerSecond: 0,
        averageLatency: 0,
        memoryUsage: 0,
        strategySwitches: 0,
        lastSwitchTime: 0,
        uptime: 0
    };

    constructor(private config: OrchestrationConfig) {
        super();
        this.validateConfig();
        this.initializeStrategies();
        this.setupMemoryOptimization();
        this.setupPerformanceMonitoring();
        
        console.log('[STRATEGY ORCHESTRATOR] Advanced Strategy Orchestrator initialized');
        console.log(`[STRATEGY ORCHESTRATOR] Strategies loaded: ${this.strategies.size}`);
        console.log(`[STRATEGY ORCHESTRATOR] Max concurrent: ${this.config.maxConcurrentStrategies}`);
        console.log(`[STRATEGY ORCHESTRATOR] Aggregation method: ${this.config.signalAggregationMethod}`);
    }

    // ==================== STRATEGY MANAGEMENT ====================

    public async start(): Promise<void> {
        if (this.isRunning) {
            throw new Error('Orchestrator is already running');
        }

        console.log('[STRATEGY ORCHESTRATOR] Starting orchestration engine...');
        this.isRunning = true;
        this.startTime = Date.now();

        // Start memory monitoring
        if (this.config.memoryOptimization) {
            this.startMemoryMonitoring();
        }

        // Start performance monitoring
        if (this.config.performanceMonitoring) {
            this.startPerformanceMonitoring();
        }

        // Initialize market regime detection
        if (this.config.marketRegimeDetection) {
            await this.initializeMarketRegimeDetection();
        }

        // Activate initial strategies
        await this.activateStrategies();

        this.emit('started');
        console.log('[STRATEGY ORCHESTRATOR] Orchestration engine started successfully');
        console.log(`[STRATEGY ORCHESTRATOR] Active strategies: ${Array.from(this.activeStrategies).join(', ')}`);
    }

    public async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        console.log('[STRATEGY ORCHESTRATOR] Stopping orchestration engine...');
        this.isRunning = false;

        // Stop all monitoring
        if (this.memoryMonitor) {
            clearInterval(this.memoryMonitor);
            this.memoryMonitor = null;
        }

        if (this.performanceTimer) {
            clearInterval(this.performanceTimer);
            this.performanceTimer = null;
        }

        // Deactivate all strategies
        await this.deactivateAllStrategies();

        this.emit('stopped');
        console.log('[STRATEGY ORCHESTRATOR] Orchestration engine stopped');
    }

    public registerStrategy(strategy: BaseStrategy): void {
        if (this.strategies.has(strategy.name)) {
            throw new Error(`Strategy ${strategy.name} already registered`);
        }

        this.strategies.set(strategy.name, strategy);
        this.performanceMetrics.set(strategy.name, {
            name: strategy.name,
            totalSignals: 0,
            successfulSignals: 0,
            failedSignals: 0,
            winRate: 0,
            avgLatency: 0,
            memoryUsage: 0,
            errorRate: 0,
            lastExecutionTime: 0,
            profitLoss: 0
        });

        console.log(`[STRATEGY ORCHESTRATOR] Strategy registered: ${strategy.name}`);
        this.emit('strategyRegistered', strategy.name);
    }

    public unregisterStrategy(strategyName: string): void {
        if (!this.strategies.has(strategyName)) {
            throw new Error(`Strategy ${strategyName} not found`);
        }

        // Deactivate if active
        if (this.activeStrategies.has(strategyName)) {
            this.deactivateStrategy(strategyName);
        }

        this.strategies.delete(strategyName);
        this.performanceMetrics.delete(strategyName);

        console.log(`[STRATEGY ORCHESTRATOR] Strategy unregistered: ${strategyName}`);
        this.emit('strategyUnregistered', strategyName);
    }

    // ==================== SIGNAL PROCESSING ====================

    public async processMarketData(data: NormalizedMarketData): Promise<AggregatedSignal | null> {
        if (!this.isRunning) {
            return null;
        }

        const startTime = Date.now();
        
        try {
            // Update market regime
            await this.updateMarketRegime(data);

            // Check for strategy switching needs
            await this.evaluateStrategySwitching();

            // Generate signals from active strategies
            const signals = await this.generateSignalsFromActiveStrategies(data);

            // Aggregate signals
            const aggregatedSignal = await this.aggregateSignals(signals, data.symbol);

            // Update performance metrics
            await this.updatePerformanceMetrics(signals, aggregatedSignal);

            // Cache signal if cache service available
            if (this.cacheService && aggregatedSignal) {
                try {
                    await this.cacheService.set(
                        `signal:${data.symbol}:${Date.now()}`,
                        aggregatedSignal,
                        30000 // 30 seconds TTL
                    );
                } catch (error) {
                    console.warn('[STRATEGY ORCHESTRATOR] Cache set error:', error);
                }
            }

            this.stats.totalSignalsProcessed++;
            this.stats.averageLatency = (this.stats.averageLatency + (Date.now() - startTime)) / 2;

            this.emit('signalGenerated', aggregatedSignal);
            return aggregatedSignal;

        } catch (error) {
            console.error('[STRATEGY ORCHESTRATOR] Error processing market data:', error);
            this.emit('error', { type: 'signalProcessing', error, data });
            return null;
        }
    }

    private async generateSignalsFromActiveStrategies(data: NormalizedMarketData): Promise<TradingSignal[]> {
        const signals: TradingSignal[] = [];
        const promises: Promise<TradingSignal | null>[] = [];

        for (const strategyName of this.activeStrategies) {
            const strategy = this.strategies.get(strategyName);
            if (!strategy || !strategy.enabled) continue;

            // Check if strategy supports current market regime
            if (this.currentMarketRegime && 
                !strategy.marketRegimes.includes(this.currentMarketRegime.name)) {
                continue;
            }

            promises.push(
                strategy.generateSignal(data)
                    .then(signal => signal)
                    .catch(error => {
                        console.error(`[STRATEGY ORCHESTRATOR] Strategy ${strategyName} error:`, error);
                        this.updateStrategyError(strategyName);
                        return null;
                    })
            );
        }

        const results = await Promise.allSettled(promises);
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                signals.push(result.value);
            }
        });

        return signals;
    }

    private async aggregateSignals(signals: TradingSignal[], symbol: string): Promise<AggregatedSignal | null> {
        if (signals.length === 0) {
            return null;
        }

        let finalAction: 'buy' | 'sell' | 'hold' = 'hold';
        let totalConfidence = 0;
        let totalStrength = 0;
        let riskScore = 0;

        switch (this.config.signalAggregationMethod) {
            case 'weighted':
                finalAction = this.calculateWeightedAction(signals);
                break;
            case 'consensus':
                finalAction = this.calculateConsensusAction(signals);
                break;
            case 'priority':
                finalAction = this.calculatePriorityAction(signals);
                break;
        }

        // Calculate aggregate metrics
        totalConfidence = signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length;
        totalStrength = signals.reduce((sum, signal) => sum + signal.strength, 0) / signals.length;
        riskScore = signals.reduce((sum, signal) => sum + (signal.metadata.risk_score || 0), 0) / signals.length;

        // Calculate position size based on risk management
        const positionSize = this.calculatePositionSize(finalAction, riskScore, totalConfidence);

        return {
            symbol,
            finalAction,
            confidence: totalConfidence,
            strength: totalStrength,
            contributingStrategies: signals.map(s => s.strategy),
            riskScore,
            positionSize,
            timestamp: Date.now(),
            reasoning: this.generateReasoningText(signals, finalAction),
            metadata: {
                signals,
                marketRegime: this.currentMarketRegime!,
                performanceMetrics: Array.from(this.performanceMetrics.values())
            }
        };
    }

    // ==================== STRATEGY SWITCHING ====================

    private async evaluateStrategySwitching(): Promise<void> {
        if (!this.config.marketRegimeDetection) return;

        const switchingNeeded = await this.shouldSwitchStrategies();
        
        if (switchingNeeded) {
            console.log('[STRATEGY ORCHESTRATOR] Strategy switching triggered');
            const switchStart = Date.now();
            
            await this.performStrategySwitching();
            
            const switchDuration = Date.now() - switchStart;
            this.stats.strategySwitches++;
            this.stats.lastSwitchTime = Date.now(); // Update to current time, not duration
            
            console.log(`[STRATEGY ORCHESTRATOR] Strategy switch completed in ${switchDuration}ms`);
            this.emit('strategySwitched', {
                duration: switchDuration,
                newActiveStrategies: Array.from(this.activeStrategies),
                marketRegime: this.currentMarketRegime
            });
        }
    }

    private async shouldSwitchStrategies(): Promise<boolean> {
        // Throttle switching to prevent too frequent switches
        const timeSinceLastSwitch = Date.now() - this.stats.lastSwitchTime;
        if (timeSinceLastSwitch < 5000) { // Wait at least 5 seconds between switches
            return false;
        }

        // Performance-based switching
        const poorPerformers = this.identifyPoorPerformingStrategies();
        if (poorPerformers.length > 0) {
            return true;
        }

        // Market regime-based switching
        if (this.currentMarketRegime) {
            const suitableStrategies = this.getStrategiesForRegime(this.currentMarketRegime.name);
            const activeSuitable = Array.from(this.activeStrategies)
                .filter(name => suitableStrategies.includes(name));
            
            if (activeSuitable.length < suitableStrategies.length / 2) {
                return true;
            }
        }

        return false;
    }

    private async performStrategySwitching(): Promise<void> {
        const currentActive = Array.from(this.activeStrategies);
        
        // Determine optimal strategy set
        const optimalStrategies = this.determineOptimalStrategies();
        
        // Deactivate non-optimal strategies
        for (const strategyName of currentActive) {
            if (!optimalStrategies.includes(strategyName)) {
                await this.deactivateStrategy(strategyName);
            }
        }

        // Activate optimal strategies
        for (const strategyName of optimalStrategies) {
            if (!this.activeStrategies.has(strategyName)) {
                await this.activateStrategy(strategyName);
            }
        }
    }

    // ==================== MEMORY OPTIMIZATION INTEGRATION ====================

    private setupMemoryOptimization(): void {
        if (!this.config.memoryOptimization) return;

        try {
            // Try to integrate with Phase B memory optimization
            const { MemoryOptimizer } = require('../../memory/memory_optimizer');
            this.memoryOptimizer = new MemoryOptimizer({
                gcThreshold: 0.8,
                heapSnapshot: false,
                monitoring: true
            });
            console.log('[STRATEGY ORCHESTRATOR] Memory optimization integrated');
        } catch (error: any) {
            console.warn('[STRATEGY ORCHESTRATOR] Memory optimizer not available:', error?.message || error);
        }

        // Try to integrate cache service
        try {
            const { InMemoryCacheService } = require('../../../trading-bot/core/cache/in_memory_cache_service');
            this.cacheService = new InMemoryCacheService();
            console.log('[STRATEGY ORCHESTRATOR] Cache service integrated');
        } catch (error: any) {
            console.warn('[STRATEGY ORCHESTRATOR] Cache service not available:', error?.message || error);
        }
    }

    private startMemoryMonitoring(): void {
        this.memoryMonitor = setInterval(() => {
            const memStats = this.getMemoryStats();
            this.stats.memoryUsage = memStats.heapUsed;

            // Trigger GC if memory usage is high
            if (this.memoryOptimizer && memStats.heapUsed > 400 * 1024 * 1024) { // 400MB
                this.memoryOptimizer.forceGC();
            }

            // Emit memory stats
            this.emit('memoryStats', memStats);

            // Check memory threshold
            if (memStats.heapUsed > 500 * 1024 * 1024) { // 500MB threshold
                console.warn(`[STRATEGY ORCHESTRATOR] High memory usage: ${Math.round(memStats.heapUsed / 1024 / 1024)}MB`);
                this.emit('memoryWarning', memStats);
            }

        }, 5000); // Every 5 seconds
    }

    private getMemoryStats(): MemoryStats {
        const memUsage = process.memoryUsage();
        return {
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            strategiesMemory: this.estimateStrategiesMemory(),
            cacheMemory: this.estimateCacheMemory(),
            gcActivity: {
                collections: 0, // Would need gc-stats module
                pauseTime: 0
            }
        };
    }

    // ==================== PERFORMANCE MONITORING ====================

    private setupPerformanceMonitoring(): void {
        if (!this.config.performanceMonitoring) return;

        console.log('[STRATEGY ORCHESTRATOR] Performance monitoring enabled');
    }

    private startPerformanceMonitoring(): void {
        this.performanceTimer = setInterval(() => {
            this.updatePerformanceStats();
            this.emit('performanceUpdate', {
                stats: this.stats,
                strategies: Array.from(this.performanceMetrics.values())
            });
        }, 10000); // Every 10 seconds
    }

    private updatePerformanceStats(): void {
        this.stats.uptime = Date.now() - this.startTime;
        this.stats.signalsPerSecond = this.stats.totalSignalsProcessed / (this.stats.uptime / 1000);

        // Update strategy performance metrics
        for (const [name, strategy] of this.strategies) {
            const metrics = strategy.getPerformanceMetrics();
            this.performanceMetrics.set(name, metrics);
        }
    }

    // ==================== HELPER METHODS ====================

    private validateConfig(): void {
        if (!this.config.strategies || this.config.strategies.length === 0) {
            throw new Error('At least one strategy must be provided');
        }

        if (this.config.maxConcurrentStrategies < 1) {
            throw new Error('maxConcurrentStrategies must be at least 1');
        }

        if (this.config.maxConcurrentStrategies > this.config.strategies.length) {
            this.config.maxConcurrentStrategies = this.config.strategies.length;
        }
    }

    private initializeStrategies(): void {
        for (const strategy of this.config.strategies) {
            this.registerStrategy(strategy);
        }
    }

    private async activateStrategies(): Promise<void> {
        const strategies = Array.from(this.strategies.keys())
            .slice(0, this.config.maxConcurrentStrategies);

        for (const strategyName of strategies) {
            await this.activateStrategy(strategyName);
        }
    }

    private async activateStrategy(strategyName: string): Promise<void> {
        if (!this.strategies.has(strategyName)) {
            throw new Error(`Strategy ${strategyName} not found`);
        }

        this.activeStrategies.add(strategyName);
        console.log(`[STRATEGY ORCHESTRATOR] Strategy activated: ${strategyName}`);
        this.emit('strategyActivated', strategyName);
    }

    private async deactivateStrategy(strategyName: string): Promise<void> {
        this.activeStrategies.delete(strategyName);
        console.log(`[STRATEGY ORCHESTRATOR] Strategy deactivated: ${strategyName}`);
        this.emit('strategyDeactivated', strategyName);
    }

    private async deactivateAllStrategies(): Promise<void> {
        const activeList = Array.from(this.activeStrategies);
        for (const strategyName of activeList) {
            await this.deactivateStrategy(strategyName);
        }
    }

    // ==================== GETTERS ====================

    public getActiveStrategies(): string[] {
        return Array.from(this.activeStrategies);
    }

    public getStrategyPerformance(strategyName: string): StrategyPerformance | undefined {
        return this.performanceMetrics.get(strategyName);
    }

    public getAllPerformanceMetrics(): StrategyPerformance[] {
        return Array.from(this.performanceMetrics.values());
    }

    public getStats() {
        return { ...this.stats };
    }

    public getCurrentMarketRegime(): MarketRegime | null {
        return this.currentMarketRegime;
    }

    public isStrategyActive(strategyName: string): boolean {
        return this.activeStrategies.has(strategyName);
    }

    // ==================== PLACEHOLDER METHODS ====================
    // These would be implemented based on specific strategy requirements

    private async initializeMarketRegimeDetection(): Promise<void> {
        console.log('[STRATEGY ORCHESTRATOR] Market regime detection initialized');
    }

    private async updateMarketRegime(data: NormalizedMarketData): Promise<void> {
        // Placeholder for market regime detection logic
        this.currentMarketRegime = {
            name: 'trending',
            confidence: 0.8,
            indicators: {
                volatility: data.price * 0.02,
                trend: 'bullish',
                volume: data.volume || 1000,
                momentum: 0.7
            },
            timestamp: Date.now()
        };
    }

    private calculateWeightedAction(signals: TradingSignal[]): 'buy' | 'sell' | 'hold' {
        let buyWeight = 0, sellWeight = 0, holdWeight = 0;
        
        signals.forEach(signal => {
            const weight = signal.confidence * signal.strength / 10000;
            switch (signal.action) {
                case 'buy': buyWeight += weight; break;
                case 'sell': sellWeight += weight; break;
                case 'hold': holdWeight += weight; break;
            }
        });

        if (buyWeight > sellWeight && buyWeight > holdWeight) return 'buy';
        if (sellWeight > buyWeight && sellWeight > holdWeight) return 'sell';
        return 'hold';
    }

    private calculateConsensusAction(signals: TradingSignal[]): 'buy' | 'sell' | 'hold' {
        const counts = { buy: 0, sell: 0, hold: 0 };
        signals.forEach(signal => counts[signal.action]++);
        
        const maxCount = Math.max(counts.buy, counts.sell, counts.hold);
        if (counts.buy === maxCount) return 'buy';
        if (counts.sell === maxCount) return 'sell';
        return 'hold';
    }

    private calculatePriorityAction(signals: TradingSignal[]): 'buy' | 'sell' | 'hold' {
        const sortedSignals = signals.sort((a, b) => {
            const strategyA = this.strategies.get(a.strategy);
            const strategyB = this.strategies.get(b.strategy);
            return (strategyB?.priority || 0) - (strategyA?.priority || 0);
        });
        
        return sortedSignals[0]?.action || 'hold';
    }

    private calculatePositionSize(action: string, riskScore: number, confidence: number): number {
        if (action === 'hold') return 0;
        
        const baseSize = 0.1; // 10% base position
        const riskAdjustment = 1 - (riskScore / 100);
        const confidenceAdjustment = confidence / 100;
        
        return baseSize * riskAdjustment * confidenceAdjustment;
    }

    private generateReasoningText(signals: TradingSignal[], action: string): string {
        const strategies = signals.map(s => s.strategy).join(', ');
        const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
        
        return `${action.toUpperCase()} signal from ${signals.length} strategies (${strategies}) with ${avgConfidence.toFixed(1)}% confidence`;
    }

    private identifyPoorPerformingStrategies(): string[] {
        const threshold = this.config.switchingThresholds.performanceDelta;
        return Array.from(this.performanceMetrics.entries())
            .filter(([_, metrics]) => metrics.winRate < threshold)
            .map(([name, _]) => name);
    }

    private getStrategiesForRegime(regime: string): string[] {
        return Array.from(this.strategies.values())
            .filter(strategy => strategy.marketRegimes.includes(regime))
            .map(strategy => strategy.name);
    }

    private determineOptimalStrategies(): string[] {
        // Simple implementation - select top performing strategies
        return Array.from(this.performanceMetrics.entries())
            .sort(([_, a], [__, b]) => b.winRate - a.winRate)
            .slice(0, this.config.maxConcurrentStrategies)
            .map(([name, _]) => name);
    }

    private updateStrategyError(strategyName: string): void {
        const metrics = this.performanceMetrics.get(strategyName);
        if (metrics) {
            metrics.failedSignals++;
            metrics.errorRate = metrics.failedSignals / (metrics.totalSignals || 1);
        }
    }

    private async updatePerformanceMetrics(signals: TradingSignal[], aggregatedSignal: AggregatedSignal | null): Promise<void> {
        signals.forEach(signal => {
            const metrics = this.performanceMetrics.get(signal.strategy);
            if (metrics) {
                metrics.totalSignals++;
                metrics.lastExecutionTime = Date.now();
                // Additional performance tracking would be implemented here
            }
        });
    }

    private estimateStrategiesMemory(): number {
        return this.strategies.size * 1024 * 1024; // Rough estimate: 1MB per strategy
    }

    private estimateCacheMemory(): number {
        return this.signalHistory.length * 1024; // Rough estimate: 1KB per signal
    }
}

// Default configuration for production use
export const DefaultOrchestrationConfig: OrchestrationConfig = {
    strategies: [], // Will be populated with actual strategies
    maxConcurrentStrategies: 5,
    signalAggregationMethod: 'weighted',
    marketRegimeDetection: true,
    memoryOptimization: true,
    performanceMonitoring: true,
    riskManagement: {
        maxRiskPerTrade: 0.02, // 2%
        maxPortfolioRisk: 0.1,  // 10%
        stopLossEnabled: true,
        positionSizingMethod: 'risk_based'
    },
    switchingThresholds: {
        performanceDelta: 0.6, // 60% win rate threshold
        confidenceThreshold: 0.7, // 70% confidence threshold
        latencyThreshold: 1000 // 1 second
    }
};

export type {
    BaseStrategy,
    TradingSignal,
    StrategyPerformance,
    MarketRegime,
    OrchestrationConfig,
    AggregatedSignal,
    MemoryStats
};

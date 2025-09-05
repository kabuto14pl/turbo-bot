"use strict";
/**
 * 🎯 ENTERPRISE STRATEGY MANAGER
 * High-level strategy orchestration and management system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultStrategyManagerConfig = exports.EnterpriseStrategyManager = exports.StrategyPerformanceAnalyzer = exports.StrategyTierSystem = void 0;
const events_1 = require("events");
const enterprise_strategy_engine_1 = require("./enterprise_strategy_engine");
// Import existing strategies
const enhanced_rsi_turbo_1 = require("./enhanced_rsi_turbo");
const supertrend_1 = require("./supertrend");
const ma_crossover_1 = require("./ma_crossover");
const momentum_pro_1 = require("./momentum_pro");
const advanced_adaptive_strategy_fixed_1 = require("./advanced_adaptive_strategy_fixed");
// ============================================================================
// 🏆 STRATEGY TIER SYSTEM
// ============================================================================
class StrategyTierSystem {
    constructor(logger) {
        this.tiers = new Map();
        this.strategyTierMapping = new Map();
        this.logger = logger;
        this.initializeDefaultTiers();
    }
    initializeDefaultTiers() {
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
    mapStrategiesToTiers() {
        this.tiers.forEach((tier, tierName) => {
            tier.strategies.forEach(strategyName => {
                this.strategyTierMapping.set(strategyName, tierName);
            });
        });
    }
    getStrategyTier(strategyName) {
        return this.strategyTierMapping.get(strategyName) || 'C';
    }
    getTierConfig(tierName) {
        return this.tiers.get(tierName) || null;
    }
    getAllTiers() {
        return Array.from(this.tiers.values());
    }
    moveStrategyToTier(strategyName, newTier) {
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
    calculateTierAllocation(totalCapital) {
        const allocations = new Map();
        this.tiers.forEach((tier, tierName) => {
            const tierCapital = (totalCapital * tier.allocation) / 100;
            allocations.set(tierName, tierCapital);
        });
        return allocations;
    }
}
exports.StrategyTierSystem = StrategyTierSystem;
// ============================================================================
// 🎯 STRATEGY PERFORMANCE ANALYZER
// ============================================================================
class StrategyPerformanceAnalyzer {
    constructor(logger) {
        this.performanceHistory = new Map();
        this.logger = logger;
    }
    recordPerformance(strategyName, performance) {
        if (!this.performanceHistory.has(strategyName)) {
            this.performanceHistory.set(strategyName, []);
        }
        const history = this.performanceHistory.get(strategyName);
        history.push(performance);
        // Keep only last 100 records
        if (history.length > 100) {
            history.shift();
        }
    }
    getPerformanceScore(strategyName) {
        const history = this.performanceHistory.get(strategyName);
        if (!history || history.length === 0)
            return 0.5;
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
    getTopPerformingStrategies(count = 3) {
        const scores = new Map();
        this.performanceHistory.forEach((_, strategyName) => {
            scores.set(strategyName, this.getPerformanceScore(strategyName));
        });
        return Array.from(scores.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, count)
            .map(([name]) => name);
    }
    shouldPromoteStrategy(strategyName) {
        const score = this.getPerformanceScore(strategyName);
        const history = this.performanceHistory.get(strategyName);
        return score > 0.7 && (history?.length || 0) >= 10; // Good performance with enough data
    }
    shouldDemoteStrategy(strategyName) {
        const score = this.getPerformanceScore(strategyName);
        const history = this.performanceHistory.get(strategyName);
        return score < 0.3 && (history?.length || 0) >= 10; // Poor performance with enough data
    }
}
exports.StrategyPerformanceAnalyzer = StrategyPerformanceAnalyzer;
// ============================================================================
// 🎯 ENTERPRISE STRATEGY MANAGER
// ============================================================================
class EnterpriseStrategyManager extends events_1.EventEmitter {
    constructor(config, engineConfig = enterprise_strategy_engine_1.defaultEnterpriseStrategyConfig, logger) {
        super();
        this.isRunning = false;
        this.currentAllocations = new Map();
        this.config = config;
        this.logger = logger;
        this.strategyEngine = new enterprise_strategy_engine_1.EnterpriseStrategyEngine(engineConfig, logger);
        this.tierSystem = new StrategyTierSystem(logger);
        this.performanceAnalyzer = new StrategyPerformanceAnalyzer(logger);
        this.setupEventHandlers();
    }
    setupEventHandlers() {
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
    async initialize() {
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
    async loadDefaultStrategies() {
        this.logger.info('📚 Loading default strategies...');
        const strategies = [
            new enhanced_rsi_turbo_1.EnhancedRSITurboStrategy(this.logger),
            new supertrend_1.SuperTrendStrategy(this.logger),
            new ma_crossover_1.MACrossoverStrategy(this.logger),
            new momentum_pro_1.MomentumProStrategy(this.logger),
            new advanced_adaptive_strategy_fixed_1.AdvancedAdaptiveStrategyFixed(this.logger)
        ];
        for (const strategy of strategies) {
            this.registerStrategy(strategy);
        }
        this.logger.info(`✅ Loaded ${strategies.length} default strategies`);
    }
    /**
     * Register a new strategy with tier assignment
     */
    registerStrategy(strategy) {
        this.strategyEngine.registerStrategy(strategy);
        const tier = this.tierSystem.getStrategyTier(strategy.name);
        const tierConfig = this.tierSystem.getTierConfig(tier);
        if (tierConfig) {
            const allocation = {
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
    async executeStrategies(state) {
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
    analyzeMarketRegime(state) {
        // Simple market regime analysis based on available data
        const volatility = state.regime?.volatility || 0.5;
        const trend = state.regime?.trend || 0;
        let volatilityLevel = 'medium';
        if (volatility < 0.3)
            volatilityLevel = 'low';
        else if (volatility > 0.7)
            volatilityLevel = 'high';
        let trendDirection = 'sideways';
        if (trend > 0.6)
            trendDirection = 'bullish';
        else if (trend < -0.6)
            trendDirection = 'bearish';
        return {
            trend: trendDirection,
            volatility: volatilityLevel,
            volume: 'medium', // Default since we don't have volume analysis yet
            sentiment: 'neutral' // Default since we don't have sentiment analysis yet
        };
    }
    adaptStrategiesForRegime(regime) {
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
    postProcessSignals(signals, state, regime) {
        // Apply manager-level filtering and enhancement
        return signals.filter(signal => {
            // Filter based on current allocations
            const allocation = this.currentAllocations.get(signal.strategyId);
            if (!allocation || !allocation.isActive)
                return false;
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
    handleStrategiesExecuted(data) {
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
    handleStrategyError(data) {
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
    handleHealthAlert(data) {
        this.logger.warn('Health alert received:', data);
        this.emit('health_alert', data);
    }
    evaluateTierChanges() {
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
    getPromotionTier(currentTier) {
        const promotions = {
            'C': 'B',
            'B': 'A',
            'A': 'S'
        };
        return promotions[currentTier] || null;
    }
    getDemotionTier(currentTier) {
        const demotions = {
            'S': 'A',
            'A': 'B',
            'B': 'C'
        };
        return demotions[currentTier] || null;
    }
    promoteStrategy(strategyName, newTier) {
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
    demoteStrategy(strategyName, newTier) {
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
    startRebalancing() {
        this.rebalanceTimer = setInterval(() => {
            this.rebalanceAllocations();
        }, this.config.rebalanceInterval);
    }
    rebalanceAllocations() {
        this.logger.info('🔄 Rebalancing strategy allocations...');
        // Get top performing strategies
        const topStrategies = this.performanceAnalyzer.getTopPerformingStrategies(this.config.maxActiveStrategies);
        // Temporarily boost allocation for top performers
        this.currentAllocations.forEach((allocation, strategyName) => {
            if (topStrategies.includes(strategyName)) {
                allocation.allocation *= 1.1; // 10% boost
            }
            else {
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
    getManagerStatus() {
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
    async stop() {
        this.isRunning = false;
        if (this.rebalanceTimer) {
            clearInterval(this.rebalanceTimer);
        }
        await this.strategyEngine.stop();
        this.logger.info('🛑 Enterprise Strategy Manager stopped');
        this.emit('manager_stopped');
    }
}
exports.EnterpriseStrategyManager = EnterpriseStrategyManager;
// ============================================================================
// 🎯 DEFAULT CONFIGURATION
// ============================================================================
exports.defaultStrategyManagerConfig = {
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

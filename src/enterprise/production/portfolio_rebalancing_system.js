"use strict";
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
 * PHASE C.4 - Portfolio Rebalancing Automation
 *
 * Intelligent portfolio rebalancing system that automatically adjusts
 * position sizes based on strategy signals, risk metrics, and market conditions.
 *
 * Integrates with:
 * - Phase A: Cache for performance optimization
 * - Phase B: Memory optimization for large calculations
 * - Phase C.2: Strategy orchestrator for signals
 * - Phase C.3: Monitoring system for real-time alerts
 * - Real-Time VaR Monitor for risk assessment
 * - Emergency Stop System for safety controls
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortfolioRebalancingSystem = void 0;
const events_1 = require("events");
/**
 * Portfolio Rebalancing Automation System
 *
 * Provides intelligent portfolio rebalancing with:
 * - Multi-factor optimization
 * - Risk-aware allocation adjustments
 * - Smart order execution
 * - Real-time monitoring integration
 * - Performance tracking
 */
class PortfolioRebalancingSystem extends events_1.EventEmitter {
    constructor(config, cacheService, monitoringSystem, strategyOrchestrator, varMonitor, orderExecutor, marketDataProvider) {
        super();
        this.currentPortfolioState = null;
        this.rebalancingHistory = [];
        this.activeOrders = new Map();
        this.rebalancingMetrics = {
            totalRebalancings: 0,
            successRate: 0,
            averageExecutionTime: 0,
            averageTurnover: 0,
            averageSlippage: 0,
            totalCosts: 0,
            riskReduction: 0,
            performanceImpact: 0,
            lastRebalancing: null
        };
        this.isRebalancing = false;
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.lastOptimization = null;
        this.config = config;
        this.cacheService = cacheService;
        this.monitoringSystem = monitoringSystem;
        this.strategyOrchestrator = strategyOrchestrator;
        this.varMonitor = varMonitor;
        this.orderExecutor = orderExecutor;
        this.marketDataProvider = marketDataProvider;
        this.initializeRebalancingMetrics();
        this.validateConfiguration();
    }
    /**
     * Initialize Portfolio Rebalancing System
     */
    async initialize() {
        try {
            console.log('🔄 Initializing Portfolio Rebalancing System...');
            // Load historical data and metrics
            await this.loadRebalancingHistory();
            // Initialize current portfolio state
            await this.updatePortfolioState();
            // Setup monitoring infrastructure
            await this.setupRebalancingMonitoring();
            console.log('✅ Portfolio Rebalancing System initialized successfully');
            this.monitoringSystem.recordMetric('rebalancing_system.initialization', 1, {
                config_version: '1.0',
                timestamp: new Date().toISOString()
            });
            this.emit('initialized');
        }
        catch (error) {
            console.error('❌ Failed to initialize Portfolio Rebalancing System:', error);
            await this.monitoringSystem.sendAlert({
                level: 'critical',
                message: `Portfolio Rebalancing System initialization failed: ${error.message}`,
                component: 'PortfolioRebalancingSystem'
            });
            throw error;
        }
    }
    /**
     * Start Automated Rebalancing
     */
    async startRebalancing() {
        if (this.isMonitoring) {
            console.log('⚠️ Rebalancing monitoring is already active');
            return;
        }
        try {
            console.log('🔄 Starting automated portfolio rebalancing...');
            this.isMonitoring = true;
            // Start monitoring loop
            this.monitoringInterval = setInterval(async () => {
                await this.checkRebalancingTriggers();
            }, this.config.triggers.timeBasedInterval);
            // Perform initial rebalancing check
            await this.checkRebalancingTriggers();
            console.log(`✅ Automated rebalancing started (interval: ${this.config.triggers.timeBasedInterval}ms)`);
            this.monitoringSystem.recordMetric('rebalancing_system.start', 1);
            this.emit('rebalancing_started');
        }
        catch (error) {
            console.error('❌ Failed to start rebalancing:', error);
            this.isMonitoring = false;
            await this.monitoringSystem.sendAlert({
                level: 'error',
                message: `Rebalancing start failed: ${error.message}`,
                component: 'PortfolioRebalancingSystem'
            });
            throw error;
        }
    }
    /**
     * Stop Automated Rebalancing
     */
    stopRebalancing() {
        if (!this.isMonitoring) {
            console.log('⚠️ Rebalancing monitoring is not active');
            return;
        }
        console.log('🛑 Stopping automated rebalancing...');
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        console.log('✅ Automated rebalancing stopped');
        this.monitoringSystem.recordMetric('rebalancing_system.stop', 1);
        this.emit('rebalancing_stopped');
    }
    /**
     * Execute Manual Rebalancing
     */
    async executeManualRebalancing(reason, customAllocations) {
        if (this.isRebalancing) {
            throw new Error('Rebalancing is already in progress');
        }
        try {
            console.log(`🔄 Executing manual rebalancing: ${reason}`);
            // Use custom allocations or optimize new ones
            const targetAllocations = customAllocations || await this.optimizePortfolioAllocations();
            // Execute rebalancing
            const rebalancingEvent = await this.executeRebalancing('manual', reason, targetAllocations);
            console.log(`✅ Manual rebalancing completed: ${rebalancingEvent.id}`);
            return rebalancingEvent;
        }
        catch (error) {
            console.error('❌ Manual rebalancing failed:', error);
            throw error;
        }
    }
    /**
     * Optimize Portfolio Allocations
     */
    async optimizePortfolioAllocations() {
        try {
            console.log('🧮 Optimizing portfolio allocations...');
            const startTime = Date.now();
            // Get strategy signals and weights
            const strategySignals = await this.strategyOrchestrator.getStrategySignals();
            const strategyWeights = await this.strategyOrchestrator.getStrategyWeights();
            // Get current portfolio risk
            const portfolioRisk = this.varMonitor.getCurrentPortfolioRisk();
            // Perform multi-factor optimization
            const optimizationResult = await this.performMultiFactorOptimization(strategySignals, strategyWeights, portfolioRisk);
            const optimizationTime = Date.now() - startTime;
            this.lastOptimization = new Date();
            console.log(`✅ Portfolio optimization completed (${optimizationTime}ms)`);
            console.log(`   Expected VaR: ${(optimizationResult.expectedVaR * 100).toFixed(2)}%`);
            console.log(`   Expected Return: ${(optimizationResult.expectedReturn * 100).toFixed(2)}%`);
            console.log(`   Sharpe Ratio: ${optimizationResult.sharpeRatio.toFixed(2)}`);
            this.monitoringSystem.recordMetric('rebalancing_system.optimization', 1, {
                optimization_time: optimizationTime.toString(),
                expected_var: optimizationResult.expectedVaR.toString(),
                expected_return: optimizationResult.expectedReturn.toString(),
                sharpe_ratio: optimizationResult.sharpeRatio.toString()
            });
            // Cache optimization result
            await this.cacheService.set('portfolio_optimization', optimizationResult, 1800); // 30 minutes
            this.emit('optimization_completed', optimizationResult);
            return optimizationResult.targetAllocations;
        }
        catch (error) {
            console.error('❌ Portfolio optimization failed:', error);
            await this.monitoringSystem.sendAlert({
                level: 'warning',
                message: `Portfolio optimization failed: ${error.message}`,
                component: 'PortfolioRebalancingSystem'
            });
            throw error;
        }
    }
    /**
     * Get Current Portfolio State
     */
    getCurrentPortfolioState() {
        return this.currentPortfolioState;
    }
    /**
     * Get Rebalancing Metrics
     */
    getRebalancingMetrics() {
        return { ...this.rebalancingMetrics };
    }
    /**
     * Get Rebalancing History
     */
    getRebalancingHistory(limit) {
        const history = [...this.rebalancingHistory].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        return limit ? history.slice(0, limit) : history;
    }
    /**
     * Get Active Rebalancing Orders
     */
    getActiveOrders() {
        return Array.from(this.activeOrders.values());
    }
    // Private Implementation Methods
    initializeRebalancingMetrics() {
        this.rebalancingMetrics = {
            totalRebalancings: 0,
            successRate: 0,
            averageExecutionTime: 0,
            averageTurnover: 0,
            averageSlippage: 0,
            totalCosts: 0,
            riskReduction: 0,
            performanceImpact: 0,
            lastRebalancing: null
        };
    }
    validateConfiguration() {
        if (this.config.triggers.driftThreshold <= 0 || this.config.triggers.driftThreshold > 1) {
            throw new Error('Drift threshold must be between 0 and 1');
        }
        if (this.config.constraints.maxPositionSize <= this.config.constraints.minPositionSize) {
            throw new Error('Max position size must be greater than min position size');
        }
        if (this.config.execution.slippageLimit <= 0) {
            throw new Error('Slippage limit must be positive');
        }
        console.log('✅ Rebalancing configuration validated');
    }
    async loadRebalancingHistory() {
        try {
            const cached = await this.cacheService.get('rebalancing_history');
            if (cached && Array.isArray(cached)) {
                this.rebalancingHistory = cached;
                console.log(`📈 Loaded ${cached.length} rebalancing events from cache`);
            }
            // Load metrics
            const cachedMetrics = await this.cacheService.get('rebalancing_metrics');
            if (cachedMetrics) {
                this.rebalancingMetrics = { ...this.rebalancingMetrics, ...cachedMetrics };
                console.log('📊 Loaded rebalancing metrics from cache');
            }
        }
        catch (error) {
            console.error('❌ Failed to load rebalancing history:', error);
        }
    }
    async updatePortfolioState() {
        try {
            // Get current positions (would be provided by production engine)
            const positions = await this.getCurrentPositions();
            // Calculate portfolio metrics
            const totalValue = positions.reduce((sum, pos) => sum + pos.size * pos.currentPrice, 0);
            // Get current allocations
            const currentAllocations = this.calculateCurrentAllocations(positions, totalValue);
            // Get target allocations (from cache or optimization)
            const targetAllocations = await this.getTargetAllocations();
            // Calculate drift
            const drift = this.calculatePortfolioDrift(currentAllocations, targetAllocations);
            // Get risk metrics
            const portfolioRisk = this.varMonitor.getCurrentPortfolioRisk();
            this.currentPortfolioState = {
                totalValue,
                availableCash: totalValue * 0.05, // Simplified - 5% cash buffer
                positions,
                targetAllocations,
                currentDrift: drift,
                rebalancingNeeded: drift > this.config.triggers.driftThreshold,
                lastRebalancing: this.rebalancingMetrics.lastRebalancing,
                riskMetrics: {
                    portfolioVaR: portfolioRisk?.totalVaR || 0,
                    correlationRisk: portfolioRisk?.concentrationRisk || 0,
                    concentrationRisk: portfolioRisk?.concentrationRisk || 0,
                    liquidityRisk: 0.02 // Simplified
                }
            };
            // Cache portfolio state
            await this.cacheService.set('portfolio_state', this.currentPortfolioState, 300);
        }
        catch (error) {
            console.error('❌ Failed to update portfolio state:', error);
        }
    }
    async setupRebalancingMonitoring() {
        console.log('🔧 Setting up rebalancing monitoring...');
        // Register rebalancing metrics
        this.monitoringSystem.recordMetric('rebalancing_system.setup', 1, {
            drift_threshold: this.config.triggers.driftThreshold.toString(),
            max_position_size: this.config.constraints.maxPositionSize.toString()
        });
        console.log('✅ Rebalancing monitoring infrastructure ready');
    }
    async checkRebalancingTriggers() {
        if (this.isRebalancing) {
            return; // Skip if already rebalancing
        }
        try {
            await this.updatePortfolioState();
            if (!this.currentPortfolioState) {
                return;
            }
            const triggers = await this.evaluateRebalancingTriggers();
            if (triggers.length > 0) {
                console.log(`🔔 Rebalancing triggered: ${triggers.join(', ')}`);
                const targetAllocations = await this.optimizePortfolioAllocations();
                await this.executeRebalancing('automatic', triggers.join(', '), targetAllocations);
            }
        }
        catch (error) {
            console.error('❌ Rebalancing trigger check failed:', error);
            await this.monitoringSystem.sendAlert({
                level: 'warning',
                message: `Rebalancing trigger check failed: ${error.message}`,
                component: 'PortfolioRebalancingSystem'
            });
        }
    }
    async evaluateRebalancingTriggers() {
        const triggers = [];
        if (!this.currentPortfolioState) {
            return triggers;
        }
        // Check drift trigger
        if (this.currentPortfolioState.currentDrift > this.config.triggers.driftThreshold) {
            triggers.push(`drift_${(this.currentPortfolioState.currentDrift * 100).toFixed(1)}%`);
        }
        // Check VaR trigger
        if (this.config.riskManagement.enableVaRConstraints) {
            const varRatio = this.currentPortfolioState.riskMetrics.portfolioVaR / this.config.triggers.riskLimitThreshold;
            if (varRatio > 1.0) {
                triggers.push(`var_breach_${(varRatio * 100).toFixed(1)}%`);
            }
        }
        // Check volatility trigger
        const volatilityChange = await this.checkVolatilityChange();
        if (volatilityChange > this.config.triggers.volatilityThreshold) {
            triggers.push(`volatility_${(volatilityChange * 100).toFixed(1)}%`);
        }
        // Check signal strength trigger
        const signalStrength = await this.checkSignalStrength();
        if (signalStrength > this.config.triggers.signalStrengthThreshold) {
            triggers.push(`signal_${(signalStrength * 100).toFixed(1)}%`);
        }
        return triggers;
    }
    async executeRebalancing(type, reason, targetAllocations) {
        this.isRebalancing = true;
        const startTime = Date.now();
        try {
            const rebalancingEvent = {
                id: `rebalancing_${Date.now()}`,
                timestamp: new Date(),
                type: type === 'automatic' ? 'scheduled' : 'signal',
                trigger: reason,
                portfolioValueBefore: this.currentPortfolioState?.totalValue || 0,
                portfolioValueAfter: 0,
                orders: [],
                executionTime: 0,
                success: false,
                turnover: 0,
                costBasis: 0,
                slippage: 0,
                riskImpact: {
                    varBefore: this.currentPortfolioState?.riskMetrics.portfolioVaR || 0,
                    varAfter: 0,
                    riskChange: 0
                }
            };
            console.log(`🔄 Executing rebalancing: ${rebalancingEvent.id}`);
            // Generate rebalancing orders
            const orders = await this.generateRebalancingOrders(targetAllocations);
            rebalancingEvent.orders = orders;
            // Execute orders
            await this.executeRebalancingOrders(orders);
            // Update portfolio state
            await this.updatePortfolioState();
            // Calculate execution metrics
            const executionTime = Date.now() - startTime;
            rebalancingEvent.executionTime = executionTime;
            rebalancingEvent.portfolioValueAfter = this.currentPortfolioState?.totalValue || 0;
            rebalancingEvent.success = orders.every(order => order.status === 'filled');
            rebalancingEvent.turnover = this.calculateTurnover(orders);
            rebalancingEvent.slippage = this.calculateAverageSlippage(orders);
            rebalancingEvent.riskImpact.varAfter = this.currentPortfolioState?.riskMetrics.portfolioVaR || 0;
            rebalancingEvent.riskImpact.riskChange =
                rebalancingEvent.riskImpact.varAfter - rebalancingEvent.riskImpact.varBefore;
            // Update metrics
            this.updateRebalancingMetrics(rebalancingEvent);
            // Save to history
            this.rebalancingHistory.push(rebalancingEvent);
            await this.cacheService.set('rebalancing_history', this.rebalancingHistory, 86400); // 24 hours
            console.log(`✅ Rebalancing completed: ${rebalancingEvent.id} (${executionTime}ms)`);
            console.log(`   Turnover: ${(rebalancingEvent.turnover * 100).toFixed(2)}%`);
            console.log(`   Slippage: ${(rebalancingEvent.slippage * 100).toFixed(3)}%`);
            console.log(`   VaR Change: ${(rebalancingEvent.riskImpact.riskChange * 100).toFixed(2)}%`);
            this.monitoringSystem.recordMetric('rebalancing_system.execution', 1, {
                type,
                execution_time: executionTime.toString(),
                turnover: rebalancingEvent.turnover.toString(),
                success: rebalancingEvent.success.toString()
            });
            this.emit('rebalancing_completed', rebalancingEvent);
            return rebalancingEvent;
        }
        catch (error) {
            console.error('❌ Rebalancing execution failed:', error);
            await this.monitoringSystem.sendAlert({
                level: 'error',
                message: `Rebalancing execution failed: ${error.message}`,
                component: 'PortfolioRebalancingSystem'
            });
            throw error;
        }
        finally {
            this.isRebalancing = false;
        }
    }
    async performMultiFactorOptimization(strategySignals, strategyWeights, portfolioRisk) {
        const startTime = Date.now();
        try {
            // Aggregate signals by symbol
            const aggregatedSignals = this.aggregateStrategySignals(strategySignals, strategyWeights);
            // Apply risk constraints
            const riskAdjustedAllocations = await this.applyRiskConstraints(aggregatedSignals, portfolioRisk);
            // Apply position size constraints
            const constrainedAllocations = this.applyPositionConstraints(riskAdjustedAllocations);
            // Get current weights for comparison
            const currentAllocations = this.currentPortfolioState ?
                this.calculateCurrentAllocations(this.currentPortfolioState.positions, this.currentPortfolioState.totalValue) : {};
            // Create target allocations
            const targetAllocations = constrainedAllocations.map(allocation => {
                const currentWeight = currentAllocations[allocation.symbol] || 0;
                return {
                    symbol: allocation.symbol,
                    targetWeight: allocation.weight,
                    currentWeight,
                    drift: Math.abs(allocation.weight - currentWeight),
                    confidence: allocation.confidence,
                    strategy: allocation.strategy,
                    lastUpdated: new Date()
                };
            });
            // Calculate optimization metrics
            const expectedVaR = await this.calculateExpectedVaR(targetAllocations);
            const expectedReturn = this.calculateExpectedReturn(targetAllocations, strategySignals);
            const sharpeRatio = expectedReturn / (expectedVaR || 0.01);
            const turnover = this.calculateExpectedTurnover(targetAllocations);
            const optimizationTime = Date.now() - startTime;
            return {
                targetAllocations,
                expectedVaR,
                expectedReturn,
                sharpeRatio,
                turnover,
                confidence: this.calculateOptimizationConfidence(targetAllocations),
                optimizationTime
            };
        }
        catch (error) {
            console.error('❌ Multi-factor optimization failed:', error);
            throw error;
        }
    }
    // Helper methods for optimization and execution
    aggregateStrategySignals(signals, weights) {
        const aggregated = new Map();
        for (const signal of signals) {
            const strategyWeight = weights[signal.strategy] || 0;
            const signalWeight = signal.strength * signal.confidence * strategyWeight;
            if (aggregated.has(signal.symbol)) {
                const existing = aggregated.get(signal.symbol);
                existing.weight += signalWeight;
                existing.confidence = Math.max(existing.confidence, signal.confidence);
                existing.strategies.push(signal.strategy);
            }
            else {
                aggregated.set(signal.symbol, {
                    weight: signalWeight,
                    confidence: signal.confidence,
                    strategies: [signal.strategy]
                });
            }
        }
        // Normalize weights
        const totalWeight = Array.from(aggregated.values()).reduce((sum, item) => sum + item.weight, 0);
        return Array.from(aggregated.entries()).map(([symbol, data]) => ({
            symbol,
            weight: totalWeight > 0 ? data.weight / totalWeight : 0,
            confidence: data.confidence,
            strategy: data.strategies.join(',')
        }));
    }
    async applyRiskConstraints(allocations, portfolioRisk) {
        // Apply VaR constraints
        if (this.config.riskManagement.enableVaRConstraints && portfolioRisk) {
            // Reduce allocations if VaR is too high
            const riskReduction = Math.min(0.2, Math.max(0, portfolioRisk.totalVaR - 0.02) / 0.02);
            return allocations.map(allocation => ({
                ...allocation,
                weight: allocation.weight * (1 - riskReduction)
            }));
        }
        return allocations;
    }
    applyPositionConstraints(allocations) {
        return allocations.map(allocation => ({
            ...allocation,
            weight: Math.min(this.config.constraints.maxPositionSize, Math.max(this.config.constraints.minPositionSize, allocation.weight))
        }));
    }
    async generateRebalancingOrders(targetAllocations) {
        const orders = [];
        if (!this.currentPortfolioState) {
            return orders;
        }
        for (const target of targetAllocations) {
            if (Math.abs(target.drift) < 0.01)
                continue; // Skip small adjustments
            const currentPrice = await this.marketDataProvider.getCurrentPrice(target.symbol);
            const targetValue = this.currentPortfolioState.totalValue * target.targetWeight;
            const currentValue = this.currentPortfolioState.totalValue * target.currentWeight;
            const valueChange = targetValue - currentValue;
            const quantity = Math.abs(valueChange / currentPrice);
            if (quantity > 0) {
                const order = {
                    id: `rebalance_${Date.now()}_${target.symbol}`,
                    symbol: target.symbol,
                    side: valueChange > 0 ? 'buy' : 'sell',
                    quantity,
                    orderType: 'adaptive',
                    priority: this.calculateOrderPriority(target.drift),
                    reason: `Rebalance to ${(target.targetWeight * 100).toFixed(1)}% (drift: ${(target.drift * 100).toFixed(1)}%)`,
                    status: 'pending',
                    metadata: {
                        targetWeight: target.targetWeight,
                        currentWeight: target.currentWeight,
                        drift: target.drift,
                        strategy: target.strategy
                    }
                };
                orders.push(order);
            }
        }
        // Sort orders by priority
        orders.sort((a, b) => {
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
        return orders;
    }
    async executeRebalancingOrders(orders) {
        console.log(`📋 Executing ${orders.length} rebalancing orders...`);
        // Execute orders in batches
        const batchSize = this.config.execution.batchSize;
        for (let i = 0; i < orders.length; i += batchSize) {
            const batch = orders.slice(i, i + batchSize);
            // Execute batch
            await Promise.all(batch.map(order => this.executeRebalancingOrder(order)));
            // Delay between batches
            if (i + batchSize < orders.length) {
                await new Promise(resolve => setTimeout(resolve, this.config.execution.delayBetweenBatches));
            }
        }
        console.log(`✅ All rebalancing orders executed`);
    }
    async executeRebalancingOrder(order) {
        try {
            order.status = 'submitted';
            order.submittedAt = new Date();
            this.activeOrders.set(order.id, order);
            const result = await this.orderExecutor.executeOrder({
                symbol: order.symbol,
                side: order.side,
                quantity: order.quantity,
                type: order.orderType === 'adaptive' ? 'market' : order.orderType,
                limitPrice: order.limitPrice
            });
            order.status = 'filled';
            order.filledAt = new Date();
            order.executedPrice = result.price;
            order.slippage = this.calculateOrderSlippage(order, result.price);
            console.log(`✅ Order filled: ${order.side} ${order.quantity} ${order.symbol} @ ${result.price}`);
        }
        catch (error) {
            order.status = 'failed';
            console.error(`❌ Order failed: ${order.symbol}`, error);
        }
        finally {
            this.activeOrders.delete(order.id);
        }
    }
    // Helper calculation methods
    async getCurrentPositions() {
        // Get current positions from cache (would be updated by production engine)
        const cached = await this.cacheService.get('current_positions');
        return cached || [];
    }
    calculateCurrentAllocations(positions, totalValue) {
        const allocations = {};
        for (const position of positions) {
            const positionValue = position.size * position.currentPrice;
            allocations[position.symbol] = positionValue / totalValue;
        }
        return allocations;
    }
    async getTargetAllocations() {
        const cached = await this.cacheService.get('target_allocations');
        return cached || [];
    }
    calculatePortfolioDrift(current, targets) {
        let maxDrift = 0;
        for (const target of targets) {
            const currentWeight = current[target.symbol] || 0;
            const drift = Math.abs(target.targetWeight - currentWeight);
            maxDrift = Math.max(maxDrift, drift);
        }
        return maxDrift;
    }
    async checkVolatilityChange() {
        // Simplified volatility change calculation
        return 0.05; // 5% volatility change
    }
    async checkSignalStrength() {
        const signals = await this.strategyOrchestrator.getStrategySignals();
        const averageStrength = signals.reduce((sum, signal) => sum + signal.strength, 0) / signals.length;
        return averageStrength || 0;
    }
    calculateTurnover(orders) {
        // Calculate portfolio turnover as percentage of total value
        const totalTradeValue = orders.reduce((sum, order) => {
            return sum + (order.quantity * (order.executedPrice || 0));
        }, 0);
        return this.currentPortfolioState ?
            totalTradeValue / this.currentPortfolioState.totalValue : 0;
    }
    calculateAverageSlippage(orders) {
        const filledOrders = orders.filter(order => order.status === 'filled' && order.slippage !== undefined);
        if (filledOrders.length === 0)
            return 0;
        const totalSlippage = filledOrders.reduce((sum, order) => sum + (order.slippage || 0), 0);
        return totalSlippage / filledOrders.length;
    }
    calculateOrderSlippage(order, executedPrice) {
        // Simplified slippage calculation - would use actual market price at order time
        const marketPrice = executedPrice; // Would get actual market price
        return Math.abs(executedPrice - marketPrice) / marketPrice;
    }
    calculateOrderPriority(drift) {
        if (drift > 0.1)
            return 'urgent';
        if (drift > 0.05)
            return 'high';
        if (drift > 0.02)
            return 'medium';
        return 'low';
    }
    async calculateExpectedVaR(allocations) {
        // Simplified VaR calculation for expected allocations
        return 0.015; // 1.5% expected VaR
    }
    calculateExpectedReturn(allocations, signals) {
        // Simplified expected return calculation
        let weightedReturn = 0;
        for (const allocation of allocations) {
            const signal = signals.find(s => s.symbol === allocation.symbol);
            const expectedReturn = signal ? signal.strength * 0.1 : 0.05; // Simplified
            weightedReturn += allocation.targetWeight * expectedReturn;
        }
        return weightedReturn;
    }
    calculateExpectedTurnover(allocations) {
        return allocations.reduce((sum, allocation) => sum + allocation.drift, 0);
    }
    calculateOptimizationConfidence(allocations) {
        const avgConfidence = allocations.reduce((sum, allocation) => sum + allocation.confidence, 0) / allocations.length;
        return avgConfidence || 0;
    }
    updateRebalancingMetrics(event) {
        this.rebalancingMetrics.totalRebalancings++;
        this.rebalancingMetrics.lastRebalancing = event.timestamp;
        // Update success rate
        const successfulRebalancings = this.rebalancingHistory.filter(e => e.success).length + (event.success ? 1 : 0);
        this.rebalancingMetrics.successRate = successfulRebalancings / this.rebalancingMetrics.totalRebalancings;
        // Update averages
        this.rebalancingMetrics.averageExecutionTime =
            (this.rebalancingMetrics.averageExecutionTime + event.executionTime) / 2;
        this.rebalancingMetrics.averageTurnover =
            (this.rebalancingMetrics.averageTurnover + event.turnover) / 2;
        this.rebalancingMetrics.averageSlippage =
            (this.rebalancingMetrics.averageSlippage + event.slippage) / 2;
        // Cache updated metrics
        this.cacheService.set('rebalancing_metrics', this.rebalancingMetrics, 86400);
    }
}
exports.PortfolioRebalancingSystem = PortfolioRebalancingSystem;
exports.default = PortfolioRebalancingSystem;

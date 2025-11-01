"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🛡️ AUTO-HEDGING ENGINE V1.0
 *
 * Advanced automatic hedging system for risk mitigation and portfolio protection.
 * Features: Real-time hedge execution, delta-neutral strategies, correlation-based hedging,
 * position-specific hedging, and intelligent hedge instrument selection.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoHedgingEngine = exports.HedgeStatus = exports.HedgeType = void 0;
const events_1 = require("events");
// =====================================================
// AUTO-HEDGING INTERFACES & TYPES
// =====================================================
var HedgeType;
(function (HedgeType) {
    HedgeType["DELTA_NEUTRAL"] = "DELTA_NEUTRAL";
    HedgeType["CORRELATION_BASED"] = "CORRELATION_BASED";
    HedgeType["PAIRS_TRADING"] = "PAIRS_TRADING";
    HedgeType["VOLATILITY_HEDGE"] = "VOLATILITY_HEDGE";
    HedgeType["CURRENCY_HEDGE"] = "CURRENCY_HEDGE";
    HedgeType["SECTOR_HEDGE"] = "SECTOR_HEDGE";
})(HedgeType || (exports.HedgeType = HedgeType = {}));
var HedgeStatus;
(function (HedgeStatus) {
    HedgeStatus["ACTIVE"] = "ACTIVE";
    HedgeStatus["INACTIVE"] = "INACTIVE";
    HedgeStatus["PENDING"] = "PENDING";
    HedgeStatus["EXPIRED"] = "EXPIRED";
    HedgeStatus["FAILED"] = "FAILED";
})(HedgeStatus || (exports.HedgeStatus = HedgeStatus = {}));
// =====================================================
// AUTO-HEDGING ENGINE IMPLEMENTATION
// =====================================================
class AutoHedgingEngine extends events_1.EventEmitter {
    constructor(logger, config, executionEngine) {
        super();
        this.hedgePositions = new Map();
        this.hedgeStrategies = new Map();
        this.activeHedges = new Map(); // positionId -> hedgeIds[]
        this.marketData = new Map();
        this.correlationMatrix = new Map();
        this.isRunning = false;
        this.logger = logger;
        this.executionEngine = executionEngine;
        this.config = {
            enabled: true,
            maxHedgeRatio: 1.0,
            minEffectiveness: 0.7,
            rebalanceInterval: 15, // 15 minutes
            hedgeExpiry: 24, // 24 hours
            emergencyHedging: true,
            allowedHedgeTypes: [
                HedgeType.DELTA_NEUTRAL,
                HedgeType.CORRELATION_BASED,
                HedgeType.PAIRS_TRADING
            ],
            riskLimits: {
                maxPortfolioHedgeRatio: 0.5,
                maxPositionHedgeRatio: 1.0,
                maxHedgingCost: 0.02 // 2% of position value
            },
            correlationThresholds: {
                strong: 0.8,
                moderate: 0.6,
                weak: 0.4
            },
            ...config
        };
        this.initializeDefaultStrategies();
        this.setupEventHandlers();
    }
    // =====================================================
    // CORE HEDGING METHODS
    // =====================================================
    /**
     * Execute hedge for a specific trigger
     */
    async executeHedge(trigger) {
        const startTime = Date.now();
        try {
            if (!this.config.enabled) {
                return {
                    success: false,
                    errorMessage: 'Auto-hedging is disabled',
                    executionTime: Date.now() - startTime
                };
            }
            this.logger.info(`🛡️ Executing hedge for trigger: ${trigger.triggerId}`);
            // 1. Analyze the trigger and determine hedge strategy
            const hedgeStrategy = await this.selectHedgeStrategy(trigger);
            if (!hedgeStrategy) {
                return {
                    success: false,
                    errorMessage: 'No suitable hedge strategy found',
                    executionTime: Date.now() - startTime
                };
            }
            // 2. Calculate optimal hedge parameters
            const hedgeCalculation = await this.calculateOptimalHedge(trigger, hedgeStrategy);
            if (hedgeCalculation.expectedEffectiveness < this.config.minEffectiveness) {
                return {
                    success: false,
                    errorMessage: `Hedge effectiveness too low: ${hedgeCalculation.expectedEffectiveness}`,
                    executionTime: Date.now() - startTime
                };
            }
            // 3. Create hedge position
            const hedgePosition = await this.createHedgePosition(trigger, hedgeCalculation, hedgeStrategy);
            // 4. Execute the hedge order
            const executionResult = await this.executeHedgeOrder(hedgePosition);
            if (!executionResult.success) {
                return {
                    success: false,
                    errorMessage: executionResult.errorMessage,
                    executionTime: Date.now() - startTime
                };
            }
            // 5. Track and monitor the hedge
            this.trackHedgePosition(hedgePosition);
            this.logger.info(`✅ Hedge executed successfully: ${hedgePosition.hedgeId}`);
            this.emit('hedge_executed', { hedgePosition, trigger });
            return {
                success: true,
                hedgeId: hedgePosition.hedgeId,
                hedgePosition,
                executionTime: Date.now() - startTime,
                hedgeEffectiveness: hedgeCalculation.expectedEffectiveness
            };
        }
        catch (error) {
            this.logger.error(`❌ Hedge execution failed: ${error}`);
            return {
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                executionTime: Date.now() - startTime
            };
        }
    }
    /**
     * Calculate optimal hedge ratio for a position
     */
    async calculateHedgeRatio(basePosition, hedgeSymbol) {
        try {
            const baseSymbol = basePosition.symbol;
            // Get correlation between base and hedge instruments
            const correlation = this.getCorrelation(baseSymbol, hedgeSymbol);
            if (Math.abs(correlation) < this.config.correlationThresholds.weak) {
                return 0; // No hedge if correlation is too weak
            }
            // Get price data for both instruments
            const baseData = this.marketData.get(baseSymbol);
            const hedgeData = this.marketData.get(hedgeSymbol);
            if (!baseData || !hedgeData) {
                throw new Error('Insufficient market data for hedge calculation');
            }
            // Calculate beta (sensitivity of base to hedge instrument)
            const beta = this.calculateBeta(baseSymbol, hedgeSymbol);
            // Calculate optimal hedge ratio using minimum variance approach
            const volatilityBase = this.calculateVolatility(baseSymbol);
            const volatilityHedge = this.calculateVolatility(hedgeSymbol);
            const optimalRatio = (correlation * volatilityBase) / volatilityHedge;
            // Apply constraints
            const constrainedRatio = Math.min(Math.max(optimalRatio, -this.config.maxHedgeRatio), this.config.maxHedgeRatio);
            this.logger.debug(`📊 Calculated hedge ratio for ${baseSymbol}/${hedgeSymbol}: ${constrainedRatio}`);
            return constrainedRatio;
        }
        catch (error) {
            this.logger.error(`❌ Failed to calculate hedge ratio: ${error}`);
            return 0;
        }
    }
    /**
     * Select the best hedge instrument for a given symbol
     */
    async selectHedgeInstrument(baseSymbol) {
        try {
            const availableInstruments = this.getAvailableHedgeInstruments(baseSymbol);
            if (availableInstruments.length === 0) {
                return null;
            }
            let bestInstrument = null;
            let bestScore = -1;
            for (const instrument of availableInstruments) {
                const score = await this.scoreHedgeInstrument(baseSymbol, instrument);
                if (score > bestScore) {
                    bestScore = score;
                    bestInstrument = instrument;
                }
            }
            if (bestScore < 0.3) { // Minimum acceptable score
                return null;
            }
            this.logger.debug(`🎯 Selected hedge instrument for ${baseSymbol}: ${bestInstrument} (score: ${bestScore})`);
            return bestInstrument;
        }
        catch (error) {
            this.logger.error(`❌ Failed to select hedge instrument: ${error}`);
            return null;
        }
    }
    // =====================================================
    // HEDGE STRATEGY MANAGEMENT
    // =====================================================
    /**
     * Select appropriate hedge strategy for a trigger
     */
    async selectHedgeStrategy(trigger) {
        const availableStrategies = Array.from(this.hedgeStrategies.values())
            .filter(strategy => strategy.enabled);
        if (availableStrategies.length === 0) {
            return null;
        }
        // Score strategies based on trigger type and severity
        let bestStrategy = null;
        let bestScore = -1;
        for (const strategy of availableStrategies) {
            const score = this.scoreHedgeStrategy(strategy, trigger);
            if (score > bestScore) {
                bestScore = score;
                bestStrategy = strategy;
            }
        }
        return bestStrategy;
    }
    /**
     * Score hedge strategy suitability
     */
    scoreHedgeStrategy(strategy, trigger) {
        let score = 0;
        // Base score for strategy type
        switch (trigger.triggerType) {
            case 'RISK_LIMIT':
                if (strategy.hedgeType === HedgeType.DELTA_NEUTRAL)
                    score += 0.8;
                else if (strategy.hedgeType === HedgeType.CORRELATION_BASED)
                    score += 0.6;
                break;
            case 'VOLATILITY_SPIKE':
                if (strategy.hedgeType === HedgeType.VOLATILITY_HEDGE)
                    score += 0.9;
                else if (strategy.hedgeType === HedgeType.DELTA_NEUTRAL)
                    score += 0.7;
                break;
            case 'CORRELATION_BREAK':
                if (strategy.hedgeType === HedgeType.PAIRS_TRADING)
                    score += 0.9;
                break;
            case 'DRAWDOWN_LIMIT':
                if (strategy.hedgeType === HedgeType.DELTA_NEUTRAL)
                    score += 0.8;
                break;
        }
        // Adjust for trigger severity
        const severityMultiplier = {
            'LOW': 0.5,
            'MEDIUM': 0.7,
            'HIGH': 0.9,
            'CRITICAL': 1.0
        }[trigger.severity] || 0.5;
        score *= severityMultiplier;
        return score;
    }
    // =====================================================
    // HEDGE CALCULATION & OPTIMIZATION
    // =====================================================
    /**
     * Calculate optimal hedge parameters
     */
    async calculateOptimalHedge(trigger, strategy) {
        // This is a simplified implementation
        // In practice, this would involve complex mathematical optimization
        const baseSymbol = this.extractSymbolFromTrigger(trigger);
        const hedgeInstrument = await this.selectHedgeInstrument(baseSymbol);
        if (!hedgeInstrument) {
            throw new Error('No suitable hedge instrument found');
        }
        const optimalRatio = await this.calculateHedgeRatio({ symbol: baseSymbol }, hedgeInstrument);
        const correlation = Math.abs(this.getCorrelation(baseSymbol, hedgeInstrument));
        const expectedEffectiveness = correlation * 0.9; // Simplified calculation
        return {
            optimalRatio,
            hedgeInstrument,
            expectedEffectiveness,
            cost: Math.abs(optimalRatio) * 0.001, // 0.1% cost estimate
            riskReduction: expectedEffectiveness * 0.8,
            confidence: correlation
        };
    }
    /**
     * Create hedge position object
     */
    async createHedgePosition(trigger, calculation, strategy) {
        const hedgeId = `hedge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const currentPrice = this.getCurrentPrice(calculation.hedgeInstrument);
        return {
            hedgeId,
            basePositionId: trigger.sourcePositionId,
            hedgeSymbol: calculation.hedgeInstrument,
            hedgeSize: Math.abs(calculation.optimalRatio),
            hedgeRatio: calculation.optimalRatio,
            hedgeType: strategy.hedgeType,
            entryPrice: currentPrice,
            currentPrice,
            unrealizedPnL: 0,
            effectiveness: calculation.expectedEffectiveness,
            status: HedgeStatus.PENDING,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            expiresAt: Date.now() + (this.config.hedgeExpiry * 60 * 60 * 1000),
            metadata: {
                triggerId: trigger.triggerId,
                strategyId: strategy.strategyId,
                triggerType: trigger.triggerType,
                calculation
            }
        };
    }
    // =====================================================
    // MARKET DATA & CORRELATION MANAGEMENT
    // =====================================================
    /**
     * Update market data for hedge calculations
     */
    updateMarketData(symbol, data) {
        this.marketData.set(symbol, data);
        this.updateCorrelations(symbol, data);
        this.emit('market_data_updated', { symbol, data });
    }
    /**
     * Calculate correlation between two instruments
     */
    getCorrelation(symbol1, symbol2) {
        const correlations1 = this.correlationMatrix.get(symbol1);
        if (!correlations1)
            return 0;
        return correlations1.get(symbol2) || 0;
    }
    /**
     * Update correlation matrix
     */
    updateCorrelations(symbol, data) {
        // Simplified correlation calculation
        // In practice, this would use historical price data and rolling windows
        if (!this.correlationMatrix.has(symbol)) {
            this.correlationMatrix.set(symbol, new Map());
        }
        // For demo purposes, set some sample correlations
        const sampleCorrelations = {
            'BTC/USDT': { 'ETH/USDT': 0.85, 'BNB/USDT': 0.7, 'ADA/USDT': 0.6 },
            'ETH/USDT': { 'BTC/USDT': 0.85, 'BNB/USDT': 0.75, 'ADA/USDT': 0.65 },
            'BNB/USDT': { 'BTC/USDT': 0.7, 'ETH/USDT': 0.75, 'ADA/USDT': 0.5 }
        };
        const correlations = this.correlationMatrix.get(symbol);
        const symbolCorrelations = sampleCorrelations[symbol];
        if (symbolCorrelations) {
            Object.entries(symbolCorrelations).forEach(([otherSymbol, correlation]) => {
                correlations.set(otherSymbol, correlation);
            });
        }
    }
    // =====================================================
    // UTILITY METHODS
    // =====================================================
    /**
     * Initialize default hedge strategies
     */
    initializeDefaultStrategies() {
        const strategies = [
            {
                strategyId: 'delta_neutral_btc',
                name: 'BTC Delta Neutral Hedging',
                hedgeType: HedgeType.DELTA_NEUTRAL,
                targetSymbols: ['BTC/USDT'],
                hedgeInstruments: ['ETH/USDT', 'BNB/USDT'],
                minEffectiveness: 0.7,
                maxHedgeRatio: 1.0,
                rebalanceFrequency: 15,
                enabled: true,
                config: {}
            },
            {
                strategyId: 'correlation_hedge',
                name: 'Correlation-Based Hedging',
                hedgeType: HedgeType.CORRELATION_BASED,
                targetSymbols: ['BTC/USDT', 'ETH/USDT'],
                hedgeInstruments: ['ETH/USDT', 'BTC/USDT', 'BNB/USDT'],
                minEffectiveness: 0.6,
                maxHedgeRatio: 0.8,
                rebalanceFrequency: 30,
                enabled: true,
                config: {}
            }
        ];
        strategies.forEach(strategy => {
            this.hedgeStrategies.set(strategy.strategyId, strategy);
        });
    }
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Listen for risk management hedge requests
        this.on('auto_hedge_requested', async (event) => {
            const trigger = {
                triggerId: `trigger_${Date.now()}`,
                sourcePositionId: event.positionId || 'unknown',
                triggerType: 'RISK_LIMIT',
                triggerValue: event.riskValue || 0,
                timestamp: Date.now(),
                severity: event.severity || 'MEDIUM'
            };
            await this.executeHedge(trigger);
        });
    }
    // Helper methods (simplified implementations)
    calculateBeta(baseSymbol, hedgeSymbol) {
        return this.getCorrelation(baseSymbol, hedgeSymbol) * 0.9; // Simplified
    }
    calculateVolatility(symbol) {
        return 0.02; // 2% daily volatility (simplified)
    }
    getAvailableHedgeInstruments(baseSymbol) {
        const instruments = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT'];
        return instruments.filter(inst => inst !== baseSymbol);
    }
    async scoreHedgeInstrument(baseSymbol, hedgeSymbol) {
        const correlation = Math.abs(this.getCorrelation(baseSymbol, hedgeSymbol));
        const liquidity = 0.8; // Simplified liquidity score
        return correlation * 0.7 + liquidity * 0.3;
    }
    extractSymbolFromTrigger(trigger) {
        return trigger.metadata?.symbol || 'BTC/USDT'; // Default
    }
    getCurrentPrice(symbol) {
        const data = this.marketData.get(symbol);
        return data?.price || 50000; // Default price
    }
    /**
     * Set execution engine for live hedge order execution
     */
    setExecutionEngine(executionEngine) {
        this.executionEngine = executionEngine;
        this.logger.info('🔗 Auto-hedging engine connected to execution engine');
    }
    async executeHedgeOrder(hedgePosition) {
        try {
            this.logger.info(`🔄 Executing hedge order: ${hedgePosition.hedgeSymbol} size: ${hedgePosition.hedgeSize}`);
            if (!this.executionEngine) {
                this.logger.warn('⚠️ No execution engine configured, simulating hedge execution');
                return this.simulateHedgeExecution(hedgePosition);
            }
            // Create order request for hedge execution
            const hedgeOrderRequest = {
                symbol: hedgePosition.hedgeSymbol,
                side: hedgePosition.hedgeSize > 0 ? 'buy' : 'sell',
                type: 'market',
                quantity: Math.abs(hedgePosition.hedgeSize),
                strategyId: `hedge_${hedgePosition.hedgeId}`
            };
            // Execute hedge order via real API
            const executedOrder = await this.executionEngine.placeOrder(hedgeOrderRequest);
            if (executedOrder && executedOrder.status === 'filled') {
                hedgePosition.status = HedgeStatus.ACTIVE;
                hedgePosition.executedPrice = executedOrder.executedPrice;
                hedgePosition.orderId = executedOrder.id;
                hedgePosition.executionTime = Date.now();
                this.logger.info(`✅ Hedge order executed successfully: ${executedOrder.id} at price ${executedOrder.executedPrice}`);
                // Emit hedge execution event
                this.emit('hedge_executed', {
                    hedgeId: hedgePosition.hedgeId,
                    orderId: executedOrder.id,
                    symbol: hedgePosition.hedgeSymbol,
                    size: hedgePosition.hedgeSize,
                    price: executedOrder.executedPrice
                });
                return { success: true };
            }
            else {
                hedgePosition.status = HedgeStatus.FAILED;
                const errorMsg = 'Order not filled or execution failed';
                this.logger.error(`❌ Hedge order execution failed: ${errorMsg}`);
                return { success: false, errorMessage: errorMsg };
            }
        }
        catch (error) {
            hedgePosition.status = HedgeStatus.FAILED;
            const errorMsg = `Hedge execution error: ${error.message}`;
            this.logger.error(`❌ ${errorMsg}`);
            // Emit hedge execution error event
            this.emit('hedge_execution_error', {
                hedgeId: hedgePosition.hedgeId,
                error: errorMsg,
                hedgePosition
            });
            return { success: false, errorMessage: errorMsg };
        }
    }
    /**
     * Fallback simulation when no execution engine is available
     */
    async simulateHedgeExecution(hedgePosition) {
        this.logger.info(`🎭 Simulating hedge execution for ${hedgePosition.hedgeSymbol}`);
        // Simulate execution delay
        await new Promise(resolve => setTimeout(resolve, 100));
        // 95% success rate for simulation
        if (Math.random() > 0.05) {
            hedgePosition.status = HedgeStatus.ACTIVE;
            hedgePosition.executedPrice = this.getCurrentPrice(hedgePosition.hedgeSymbol);
            hedgePosition.executionTime = Date.now();
            this.logger.info(`✅ Hedge order simulated successfully at price ${hedgePosition.executedPrice}`);
            return { success: true };
        }
        else {
            hedgePosition.status = HedgeStatus.FAILED;
            const errorMsg = 'Simulated order execution failed';
            this.logger.warn(`⚠️ ${errorMsg}`);
            return { success: false, errorMessage: errorMsg };
        }
    }
    trackHedgePosition(hedgePosition) {
        this.hedgePositions.set(hedgePosition.hedgeId, hedgePosition);
        const basePositionId = hedgePosition.basePositionId;
        if (!this.activeHedges.has(basePositionId)) {
            this.activeHedges.set(basePositionId, []);
        }
        this.activeHedges.get(basePositionId).push(hedgePosition.hedgeId);
        this.logger.info(`📊 Tracking hedge position: ${hedgePosition.hedgeId}`);
    }
    // =====================================================
    // PUBLIC API METHODS
    // =====================================================
    /**
     * Start the auto-hedging engine
     */
    start() {
        if (this.isRunning) {
            this.logger.warn('⚠️ Auto-hedging engine is already running');
            return;
        }
        // Clear any existing rebalance interval before starting a new one
        if (this.rebalanceInterval) {
            clearInterval(this.rebalanceInterval);
            this.rebalanceInterval = undefined;
        }
        this.isRunning = true;
        this.startRebalanceLoop();
        this.logger.info('🚀 Auto-hedging engine started');
        this.emit('engine_started');
    }
    /**
     * Stop the auto-hedging engine
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        if (this.rebalanceInterval) {
            clearInterval(this.rebalanceInterval);
        }
        this.logger.info('🛑 Auto-hedging engine stopped');
        this.emit('engine_stopped');
    }
    /**
     * Get all active hedge positions
     */
    getActiveHedges() {
        return Array.from(this.hedgePositions.values())
            .filter(hedge => hedge.status === HedgeStatus.ACTIVE);
    }
    /**
     * Get hedge effectiveness report
     */
    getHedgeEffectivenessReport() {
        const activeHedges = this.getActiveHedges();
        const totalEffectiveness = activeHedges.reduce((sum, hedge) => sum + hedge.effectiveness, 0);
        const avgEffectiveness = activeHedges.length > 0 ? totalEffectiveness / activeHedges.length : 0;
        return {
            totalActiveHedges: activeHedges.length,
            averageEffectiveness: avgEffectiveness,
            totalHedgeValue: activeHedges.reduce((sum, hedge) => sum + Math.abs(hedge.hedgeSize * hedge.currentPrice), 0),
            hedgesByType: this.groupHedgesByType(activeHedges),
            timestamp: Date.now()
        };
    }
    groupHedgesByType(hedges) {
        const grouped = {};
        hedges.forEach(hedge => {
            grouped[hedge.hedgeType] = (grouped[hedge.hedgeType] || 0) + 1;
        });
        return grouped;
    }
    /**
     * Start rebalance loop
     */
    startRebalanceLoop() {
        this.rebalanceInterval = setInterval(async () => {
            if (!this.isRunning)
                return;
            try {
                await this.rebalanceHedges();
            }
            catch (error) {
                this.logger.error(`❌ Rebalance error: ${error}`);
            }
        }, this.config.rebalanceInterval * 60 * 1000);
    }
    /**
     * Rebalance existing hedges
     */
    async rebalanceHedges() {
        const activeHedges = this.getActiveHedges();
        // Only log when there are actual hedges to rebalance, not spam on empty hedge list
        if (activeHedges.length > 0) {
            this.logger.debug(`🔄 Rebalancing ${activeHedges.length} active hedges`);
        }
        for (const hedge of activeHedges) {
            try {
                await this.rebalanceSingleHedge(hedge);
            }
            catch (error) {
                this.logger.error(`❌ Failed to rebalance hedge ${hedge.hedgeId}: ${error}`);
            }
        }
    }
    /**
     * Rebalance a single hedge position
     */
    async rebalanceSingleHedge(hedge) {
        // Update current price and P&L
        const currentPrice = this.getCurrentPrice(hedge.hedgeSymbol);
        hedge.currentPrice = currentPrice;
        hedge.unrealizedPnL = (currentPrice - hedge.entryPrice) * hedge.hedgeSize;
        hedge.updatedAt = Date.now();
        // Check if hedge is still effective
        const currentEffectiveness = await this.calculateCurrentEffectiveness(hedge);
        hedge.effectiveness = currentEffectiveness;
        // If effectiveness is too low, consider closing or adjusting
        if (currentEffectiveness < this.config.minEffectiveness) {
            this.logger.warn(`⚠️ Hedge ${hedge.hedgeId} effectiveness below threshold: ${currentEffectiveness}`);
            this.emit('hedge_effectiveness_low', { hedge });
        }
        // Check expiry
        if (hedge.expiresAt && Date.now() > hedge.expiresAt) {
            hedge.status = HedgeStatus.EXPIRED;
            this.logger.info(`⏰ Hedge ${hedge.hedgeId} expired`);
            this.emit('hedge_expired', { hedge });
        }
    }
    /**
     * Calculate current effectiveness of a hedge
     */
    async calculateCurrentEffectiveness(hedge) {
        // Simplified effectiveness calculation
        // In practice, this would analyze the correlation and P&L offset
        const baseSymbol = this.extractSymbolFromHedgePosition(hedge);
        const correlation = Math.abs(this.getCorrelation(baseSymbol, hedge.hedgeSymbol));
        return correlation * 0.9; // Simplified
    }
    extractSymbolFromHedgePosition(hedge) {
        return hedge.metadata?.baseSymbol || 'BTC/USDT'; // Default
    }
}
exports.AutoHedgingEngine = AutoHedgingEngine;
// =====================================================
// EXPORT
// =====================================================
exports.default = AutoHedgingEngine;

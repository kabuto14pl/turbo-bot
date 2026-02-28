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
 * 🔄 DELTA-NEUTRAL MANAGER V1.0
 *
 * Advanced delta-neutral strategy manager for maintaining portfolio neutrality.
 * Features: Real-time delta calculation, automatic rebalancing, multi-asset delta hedging,
 * and intelligent position sizing for market-neutral strategies.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeltaNeutralManager = void 0;
const events_1 = require("events");
// =====================================================
// DELTA-NEUTRAL MANAGER IMPLEMENTATION
// =====================================================
class DeltaNeutralManager extends events_1.EventEmitter {
    constructor(logger, portfolio, hedgingEngine, config) {
        super();
        this.currentMetrics = null;
        this.isRunning = false;
        this.marketPrices = new Map();
        this.deltaHistory = [];
        this.maxHistorySize = 1000;
        this.logger = logger;
        this.portfolio = portfolio;
        this.hedgingEngine = hedgingEngine;
        this.config = {
            enabled: true,
            targetDelta: 0.0,
            deltaThreshold: 0.1, // 10% delta threshold
            rebalanceFrequency: 5, // 5 minutes
            maxAdjustmentSize: 0.25, // 25% max adjustment
            neutralityTarget: 0.95,
            hedgingPreference: 'MIXED',
            autoRebalance: true,
            emergencyRebalance: true,
            riskLimits: {
                maxPortfolioDelta: 0.2, // 20% max portfolio delta
                maxAssetDelta: 0.3, // 30% max single asset delta
                maxRebalanceCost: 0.01 // 1% max rebalance cost
            },
            ...config
        };
        this.setupEventHandlers();
    }
    // =====================================================
    // CORE DELTA CALCULATION METHODS
    // =====================================================
    /**
     * Calculate comprehensive portfolio delta metrics
     */
    async calculatePortfolioDelta() {
        try {
            const positions = this.portfolio.getPositions();
            const assetDeltas = new Map();
            let portfolioDelta = 0;
            let totalExposure = 0;
            // Calculate delta for each position
            for (const position of positions) {
                const delta = await this.calculatePositionDelta(position);
                const exposure = Math.abs(position.size * position.entryPrice);
                assetDeltas.set(position.symbol, delta);
                portfolioDelta += delta * exposure;
                totalExposure += exposure;
            }
            // Normalize portfolio delta by total exposure
            const normalizedPortfolioDelta = totalExposure > 0 ? portfolioDelta / totalExposure : 0;
            // Calculate neutrality score (1 = perfectly neutral, 0 = highly directional)
            const neutralityScore = Math.max(0, 1 - Math.abs(normalizedPortfolioDelta) * 2);
            // Generate required adjustments
            const requiredAdjustments = await this.generateDeltaAdjustments(normalizedPortfolioDelta, assetDeltas, totalExposure);
            const metrics = {
                portfolioDelta: normalizedPortfolioDelta,
                assetDeltas,
                totalExposure,
                neutralityScore,
                lastCalculated: Date.now(),
                requiredAdjustments
            };
            this.currentMetrics = metrics;
            this.addToHistory(metrics);
            this.logger.debug(`📊 Portfolio Delta: ${normalizedPortfolioDelta.toFixed(4)}, Neutrality: ${neutralityScore.toFixed(3)}`);
            this.emit('delta_calculated', metrics);
            return metrics;
        }
        catch (error) {
            this.logger.error(`❌ Failed to calculate portfolio delta: ${error}`);
            throw error;
        }
    }
    /**
     * Calculate delta for a single position
     */
    async calculatePositionDelta(position) {
        try {
            const symbol = position.symbol;
            const price = this.marketPrices.get(symbol) || position.entryPrice;
            // For spot positions, delta is simply the position direction
            // For derivatives, this would be more complex
            let delta = position.direction === 'long' ? 1.0 : -1.0;
            // Adjust delta based on position size and market conditions
            const sizeAdjustment = Math.min(1.0, Math.abs(position.size) / 100); // Simplified
            delta *= sizeAdjustment;
            // Apply volatility adjustment
            const volatilityAdjustment = await this.calculateVolatilityAdjustment(symbol);
            delta *= volatilityAdjustment;
            return delta;
        }
        catch (error) {
            this.logger.error(`❌ Failed to calculate position delta for ${position.symbol}: ${error}`);
            return 0;
        }
    }
    /**
     * Generate delta adjustment recommendations
     */
    async generateDeltaAdjustments(portfolioDelta, assetDeltas, totalExposure) {
        const adjustments = [];
        // Check if portfolio delta is within acceptable range
        if (Math.abs(portfolioDelta - this.config.targetDelta) <= this.config.deltaThreshold) {
            return adjustments; // No adjustments needed
        }
        // Calculate required portfolio delta adjustment
        const requiredDeltaChange = this.config.targetDelta - portfolioDelta;
        // Find assets with highest delta contribution
        const sortedAssets = Array.from(assetDeltas.entries())
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
        let remainingDeltaToAdjust = requiredDeltaChange;
        for (const [symbol, currentDelta] of sortedAssets) {
            if (Math.abs(remainingDeltaToAdjust) < 0.01)
                break;
            const position = this.portfolio.getPosition(symbol);
            if (!position)
                continue;
            // Calculate optimal adjustment for this asset
            const adjustmentSize = Math.min(Math.abs(remainingDeltaToAdjust) * 0.5, // Take 50% of remaining adjustment
            this.config.maxAdjustmentSize);
            if (adjustmentSize > 0.01) { // Only create adjustment if significant
                const targetDelta = currentDelta - (remainingDeltaToAdjust > 0 ? adjustmentSize : -adjustmentSize);
                const adjustment = {
                    adjustmentId: `adj_${Date.now()}_${symbol}`,
                    symbol,
                    currentDelta,
                    targetDelta,
                    requiredAction: this.determineAdjustmentAction(currentDelta, targetDelta),
                    adjustmentSize,
                    priority: this.calculateAdjustmentPriority(Math.abs(portfolioDelta)),
                    estimatedCost: this.estimateAdjustmentCost(symbol, adjustmentSize),
                    confidence: this.calculateAdjustmentConfidence(symbol, adjustmentSize)
                };
                adjustments.push(adjustment);
                remainingDeltaToAdjust -= (targetDelta - currentDelta);
            }
        }
        return adjustments;
    }
    // =====================================================
    // DELTA-NEUTRAL REBALANCING
    // =====================================================
    /**
     * Maintain delta neutrality through automatic rebalancing
     */
    async maintainDeltaNeutrality() {
        const startTime = Date.now();
        try {
            if (!this.config.enabled) {
                return {
                    success: false,
                    adjustmentsMade: 0,
                    deltaImprovement: 0,
                    totalCost: 0,
                    neutralityImprovement: 0,
                    errorMessage: 'Delta-neutral management is disabled',
                    executionTime: Date.now() - startTime,
                    details: []
                };
            }
            this.logger.info('🔄 Starting delta neutrality maintenance...');
            // Calculate current delta metrics
            const currentMetrics = await this.calculatePortfolioDelta();
            const initialDelta = Math.abs(currentMetrics.portfolioDelta);
            const initialNeutrality = currentMetrics.neutralityScore;
            // Check if rebalancing is needed
            if (currentMetrics.neutralityScore >= this.config.neutralityTarget) {
                this.logger.debug('✅ Portfolio already sufficiently neutral');
                return {
                    success: true,
                    adjustmentsMade: 0,
                    deltaImprovement: 0,
                    totalCost: 0,
                    neutralityImprovement: 0,
                    executionTime: Date.now() - startTime,
                    details: []
                };
            }
            // Execute required adjustments
            const rebalanceResult = await this.executeRebalance(currentMetrics.requiredAdjustments);
            // Recalculate delta after rebalancing
            const newMetrics = await this.calculatePortfolioDelta();
            const finalDelta = Math.abs(newMetrics.portfolioDelta);
            const finalNeutrality = newMetrics.neutralityScore;
            const result = {
                success: rebalanceResult.success,
                adjustmentsMade: rebalanceResult.adjustmentsMade,
                deltaImprovement: initialDelta - finalDelta,
                totalCost: rebalanceResult.totalCost,
                neutralityImprovement: finalNeutrality - initialNeutrality,
                executionTime: Date.now() - startTime,
                details: rebalanceResult.details,
                errorMessage: rebalanceResult.errorMessage
            };
            this.logger.info(`✅ Delta neutrality maintenance completed. Neutrality improved by ${(result.neutralityImprovement * 100).toFixed(2)}%`);
            this.emit('neutrality_maintained', result);
            return result;
        }
        catch (error) {
            this.logger.error(`❌ Failed to maintain delta neutrality: ${error}`);
            return {
                success: false,
                adjustmentsMade: 0,
                deltaImprovement: 0,
                totalCost: 0,
                neutralityImprovement: 0,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                executionTime: Date.now() - startTime,
                details: []
            };
        }
    }
    /**
     * Execute rebalancing adjustments
     */
    async executeRebalance(adjustments) {
        const details = [];
        let totalCost = 0;
        let successfulAdjustments = 0;
        // Sort adjustments by priority
        const sortedAdjustments = adjustments.sort((a, b) => {
            const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
        for (const adjustment of sortedAdjustments) {
            try {
                const detail = await this.executeAdjustment(adjustment);
                details.push(detail);
                if (detail.success) {
                    successfulAdjustments++;
                    totalCost += detail.cost;
                }
                // Check cost limits
                if (totalCost > this.config.riskLimits.maxRebalanceCost) {
                    this.logger.warn('⚠️ Rebalancing cost limit reached, stopping further adjustments');
                    break;
                }
            }
            catch (error) {
                this.logger.error(`❌ Failed to execute adjustment for ${adjustment.symbol}: ${error}`);
                details.push({
                    symbol: adjustment.symbol,
                    action: adjustment.requiredAction,
                    size: adjustment.adjustmentSize,
                    cost: 0,
                    deltaChange: 0,
                    success: false
                });
            }
        }
        return {
            success: successfulAdjustments > 0,
            adjustmentsMade: successfulAdjustments,
            totalCost,
            details,
            errorMessage: successfulAdjustments === 0 ? 'No adjustments were successful' : undefined
        };
    }
    /**
     * Execute a single delta adjustment
     */
    async executeAdjustment(adjustment) {
        this.logger.info(`🔧 Executing delta adjustment for ${adjustment.symbol}: ${adjustment.requiredAction} ${adjustment.adjustmentSize}`);
        try {
            let success = false;
            let cost = 0;
            let deltaChange = 0;
            switch (adjustment.requiredAction) {
                case 'BUY':
                case 'SELL':
                    // Execute position adjustment
                    const orderResult = await this.executePositionAdjustment(adjustment);
                    success = orderResult.success;
                    cost = orderResult.cost;
                    deltaChange = orderResult.deltaChange;
                    break;
                case 'HEDGE':
                    // Execute hedge through hedging engine
                    const hedgeResult = await this.executeHedgeAdjustment(adjustment);
                    success = hedgeResult.success;
                    cost = hedgeResult.cost;
                    deltaChange = hedgeResult.deltaChange;
                    break;
            }
            return {
                symbol: adjustment.symbol,
                action: adjustment.requiredAction,
                size: adjustment.adjustmentSize,
                cost,
                deltaChange,
                success
            };
        }
        catch (error) {
            this.logger.error(`❌ Failed to execute adjustment: ${error}`);
            return {
                symbol: adjustment.symbol,
                action: adjustment.requiredAction,
                size: adjustment.adjustmentSize,
                cost: 0,
                deltaChange: 0,
                success: false
            };
        }
    }
    /**
     * Execute position-based adjustment
     */
    async executePositionAdjustment(adjustment) {
        // Mock implementation - in practice, this would integrate with execution engine
        const price = this.marketPrices.get(adjustment.symbol) || 50000;
        const cost = adjustment.adjustmentSize * price * 0.001; // 0.1% fee
        // Simulate 90% success rate
        const success = Math.random() > 0.1;
        const deltaChange = success ? adjustment.targetDelta - adjustment.currentDelta : 0;
        this.logger.debug(`💱 Position adjustment ${adjustment.symbol}: ${success ? 'SUCCESS' : 'FAILED'}`);
        return { success, cost, deltaChange };
    }
    /**
     * Execute hedge-based adjustment
     */
    async executeHedgeAdjustment(adjustment) {
        try {
            // Create hedge trigger for the adjustment
            const hedgeTrigger = {
                triggerId: `delta_adj_${adjustment.adjustmentId}`,
                sourcePositionId: adjustment.symbol,
                triggerType: 'RISK_LIMIT',
                triggerValue: Math.abs(adjustment.currentDelta),
                timestamp: Date.now(),
                severity: adjustment.priority === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM',
                metadata: {
                    adjustmentType: 'DELTA_NEUTRALITY',
                    targetDelta: adjustment.targetDelta,
                    symbol: adjustment.symbol
                }
            };
            // Execute hedge through hedging engine
            const hedgeResult = await this.hedgingEngine.executeHedge(hedgeTrigger);
            const cost = adjustment.estimatedCost;
            const deltaChange = hedgeResult.success ? adjustment.targetDelta - adjustment.currentDelta : 0;
            return {
                success: hedgeResult.success,
                cost,
                deltaChange
            };
        }
        catch (error) {
            this.logger.error(`❌ Hedge adjustment failed: ${error}`);
            return { success: false, cost: 0, deltaChange: 0 };
        }
    }
    // =====================================================
    // UTILITY METHODS
    // =====================================================
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Listen for portfolio changes - Portfolio may not emit events
        // Instead, we'll rely on periodic monitoring via rebalanceInterval
        // Listen for emergency situations
        this.on('emergency_delta_breach', async (event) => {
            if (this.config.emergencyRebalance) {
                this.logger.warn('🚨 Emergency delta breach detected, executing immediate rebalance');
                await this.maintainDeltaNeutrality();
            }
        });
    }
    /**
     * Update market price for delta calculations
     */
    updateMarketPrice(symbol, price) {
        this.marketPrices.set(symbol, price);
        this.emit('price_updated', { symbol, price });
    }
    /**
     * Add metrics to history
     */
    addToHistory(metrics) {
        this.deltaHistory.push(metrics);
        // Maintain history size limit
        if (this.deltaHistory.length > this.maxHistorySize) {
            this.deltaHistory.shift();
        }
    }
    /**
     * Calculate volatility adjustment for delta
     */
    async calculateVolatilityAdjustment(symbol) {
        // Simplified volatility adjustment
        // In practice, this would use historical volatility data
        return 1.0; // No adjustment for now
    }
    /**
     * Determine the required action for an adjustment
     */
    determineAdjustmentAction(currentDelta, targetDelta) {
        const deltaChange = targetDelta - currentDelta;
        if (Math.abs(deltaChange) > 0.2) {
            return 'HEDGE'; // Large changes are better handled with hedges
        }
        return deltaChange > 0 ? 'BUY' : 'SELL';
    }
    /**
     * Calculate adjustment priority
     */
    calculateAdjustmentPriority(portfolioDelta) {
        if (portfolioDelta > this.config.riskLimits.maxPortfolioDelta) {
            return 'CRITICAL';
        }
        else if (portfolioDelta > this.config.deltaThreshold * 2) {
            return 'HIGH';
        }
        else if (portfolioDelta > this.config.deltaThreshold) {
            return 'MEDIUM';
        }
        else {
            return 'LOW';
        }
    }
    /**
     * Estimate adjustment cost
     */
    estimateAdjustmentCost(symbol, adjustmentSize) {
        const price = this.marketPrices.get(symbol) || 50000;
        return adjustmentSize * price * 0.001; // 0.1% estimated cost
    }
    /**
     * Calculate adjustment confidence
     */
    calculateAdjustmentConfidence(symbol, adjustmentSize) {
        // Higher confidence for smaller adjustments
        return Math.max(0.5, 1 - adjustmentSize);
    }
    // =====================================================
    // PUBLIC API METHODS
    // =====================================================
    /**
     * Start delta-neutral management
     */
    start() {
        if (this.isRunning) {
            this.logger.warn('⚠️ Delta-neutral manager is already running');
            return;
        }
        this.isRunning = true;
        this.startRebalanceLoop();
        this.logger.info('🚀 Delta-neutral manager started');
        this.emit('manager_started');
    }
    /**
     * Stop delta-neutral management
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        if (this.rebalanceInterval) {
            clearInterval(this.rebalanceInterval);
        }
        this.logger.info('🛑 Delta-neutral manager stopped');
        this.emit('manager_stopped');
    }
    /**
     * Get current delta metrics
     */
    getCurrentMetrics() {
        return this.currentMetrics;
    }
    /**
     * Get delta history
     */
    getDeltaHistory() {
        return [...this.deltaHistory];
    }
    /**
     * Force immediate rebalance
     */
    async forceRebalance() {
        this.logger.info('🔧 Force rebalancing delta neutrality');
        return await this.maintainDeltaNeutrality();
    }
    /**
     * Get neutrality score
     */
    getNeutralityScore() {
        return this.currentMetrics?.neutralityScore || 0;
    }
    /**
     * Start automatic rebalance loop
     */
    startRebalanceLoop() {
        this.rebalanceInterval = setInterval(async () => {
            if (!this.isRunning)
                return;
            try {
                if (this.config.autoRebalance) {
                    await this.maintainDeltaNeutrality();
                }
            }
            catch (error) {
                this.logger.error(`❌ Automatic rebalance error: ${error}`);
            }
        }, this.config.rebalanceFrequency * 60 * 1000);
    }
}
exports.DeltaNeutralManager = DeltaNeutralManager;
// =====================================================
// EXPORT
// =====================================================
exports.default = DeltaNeutralManager;

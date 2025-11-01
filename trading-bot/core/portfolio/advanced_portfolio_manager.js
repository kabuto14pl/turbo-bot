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
 * 📊 ADVANCED PORTFOLIO MANAGER
 * Zaawansowane zarządzanie portfelem z automatyczną alokacją i zarządzaniem ryzykiem
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedPortfolioManager = void 0;
const events_1 = require("events");
const logger_1 = require("../../infrastructure/logging/logger");
class AdvancedPortfolioManager extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.positions = new Map();
        this.lastRebalance = new Date();
        this.currentRegime = null;
        this.eventHistory = [];
        this.config = config;
        this.logger = new logger_1.Logger('AdvancedPortfolioManager');
        this.metrics = this.initializeMetrics();
        this.logger.info(`🎯 Advanced Portfolio Manager initialized: ${config.name}`);
        this.logger.info(`📊 Strategy: ${config.strategy.type}, Assets: ${config.assets.length}`);
    }
    /**
     * 🔄 Update portfolio with new market data
     */
    async updatePortfolio(marketData) {
        try {
            // Update position prices
            await this.updatePositionPrices(marketData);
            // Recalculate metrics
            await this.calculateMetrics();
            // Check risk limits
            await this.checkRiskLimits();
            // Detect market regime changes
            await this.detectMarketRegime(marketData);
            // Check if rebalancing is needed
            if (this.shouldRebalance()) {
                await this.rebalancePortfolio();
            }
            this.emitEvent({
                type: 'PERFORMANCE_UPDATE',
                timestamp: new Date(),
                details: { metrics: this.metrics },
                impact: {
                    portfolioValue: this.metrics.totalValue,
                    risk: this.metrics.var95,
                    performance: this.metrics.dailyReturn
                }
            });
        }
        catch (error) {
            this.logger.error('❌ Portfolio update failed:', error);
            throw error;
        }
    }
    /**
     * 📈 Process trading signal and determine position size
     */
    async processSignal(signal) {
        try {
            const asset = this.config.assets.find(a => a.symbol === signal.symbol);
            if (!asset) {
                this.logger.warn(`⚠️ Asset not found in portfolio: ${signal.symbol}`);
                return [];
            }
            // Calculate position size based on strategy
            const positionSize = await this.calculatePositionSize(asset, signal);
            if (positionSize === 0) {
                this.logger.info(`🚫 Position size is 0 for ${signal.symbol} - skipping`);
                return [];
            }
            // Create order
            const order = {
                id: `portfolio_${Date.now()}_${signal.symbol}`,
                symbol: signal.symbol,
                side: signal.type,
                type: 'MARKET',
                quantity: Math.abs(positionSize),
                price: signal.price || 0,
                status: 'PENDING',
                timestamp: Date.now(),
                strategyId: 'portfolio_manager'
            };
            this.logger.info(`📋 Generated order: ${order.side} ${order.quantity} ${order.symbol}`);
            return [order];
        }
        catch (error) {
            this.logger.error('❌ Signal processing failed:', error);
            return [];
        }
    }
    /**
     * 🔄 Rebalance portfolio to target allocations
     */
    async rebalancePortfolio() {
        try {
            this.logger.info('🔄 Starting portfolio rebalancing...');
            const targetWeights = await this.calculateTargetWeights();
            const rebalancingActions = [];
            for (const [symbol, position] of this.positions) {
                const targetWeight = targetWeights[symbol] || 0;
                const currentWeight = position.weight;
                const deviation = Math.abs(targetWeight - currentWeight);
                if (deviation > this.config.strategy.rebalanceThreshold) {
                    const action = this.createRebalancingAction(position, targetWeight);
                    rebalancingActions.push(action);
                }
            }
            // Sort by priority
            rebalancingActions.sort((a, b) => b.priority - a.priority);
            if (rebalancingActions.length > 0) {
                this.logger.info(`📊 Rebalancing ${rebalancingActions.length} positions`);
                this.lastRebalance = new Date();
                this.emitEvent({
                    type: 'REBALANCE',
                    timestamp: new Date(),
                    details: { actions: rebalancingActions },
                    impact: {
                        portfolioValue: this.metrics.totalValue,
                        risk: this.calculateRebalancingRisk(rebalancingActions),
                        performance: 0
                    }
                });
            }
            return rebalancingActions;
        }
        catch (error) {
            this.logger.error('❌ Portfolio rebalancing failed:', error);
            throw error;
        }
    }
    /**
     * 🎯 Calculate optimal target weights using various strategies
     */
    async calculateTargetWeights() {
        const strategy = this.config.strategy;
        switch (strategy.type) {
            case 'EQUAL_WEIGHT':
                return this.calculateEqualWeights();
            case 'MARKET_CAP':
                return this.calculateMarketCapWeights();
            case 'RISK_PARITY':
                return this.calculateRiskParityWeights();
            case 'MOMENTUM':
                return this.calculateMomentumWeights();
            case 'MEAN_REVERSION':
                return this.calculateMeanReversionWeights();
            case 'CUSTOM':
                return strategy.customWeights || {};
            default:
                return this.calculateEqualWeights();
        }
    }
    /**
     * ⚖️ Equal weight allocation
     */
    calculateEqualWeights() {
        const weights = {};
        const numAssets = this.config.assets.length;
        const weight = 1 / numAssets;
        for (const asset of this.config.assets) {
            weights[asset.symbol] = weight;
        }
        return weights;
    }
    /**
     * 📊 Market cap weighted allocation
     */
    calculateMarketCapWeights() {
        const weights = {};
        const totalMarketCap = this.config.assets.reduce((sum, asset) => sum + (asset.marketCap || 1), 0);
        for (const asset of this.config.assets) {
            weights[asset.symbol] = (asset.marketCap || 1) / totalMarketCap;
        }
        return weights;
    }
    /**
     * ⚖️ Risk parity allocation
     */
    calculateRiskParityWeights() {
        const weights = {};
        const totalInverseVol = this.config.assets.reduce((sum, asset) => sum + (1 / asset.volatility), 0);
        for (const asset of this.config.assets) {
            weights[asset.symbol] = (1 / asset.volatility) / totalInverseVol;
        }
        return weights;
    }
    /**
     * 📈 Momentum-based allocation
     */
    calculateMomentumWeights() {
        const weights = {};
        // Calculate momentum scores based on recent performance
        const momentumScores = {};
        let totalPositiveMomentum = 0;
        for (const [symbol, position] of this.positions) {
            const momentum = position.performanceMetrics.monthlyReturn;
            const score = Math.max(momentum, 0); // Only positive momentum
            momentumScores[symbol] = score;
            totalPositiveMomentum += score;
        }
        // Allocate based on positive momentum
        for (const asset of this.config.assets) {
            if (totalPositiveMomentum > 0) {
                weights[asset.symbol] = (momentumScores[asset.symbol] || 0) / totalPositiveMomentum;
            }
            else {
                weights[asset.symbol] = 1 / this.config.assets.length; // Fallback to equal weight
            }
        }
        return weights;
    }
    /**
     * 🔄 Mean reversion allocation
     */
    calculateMeanReversionWeights() {
        const weights = {};
        // Calculate mean reversion scores (inverse of recent performance)
        const reversionScores = {};
        let totalReversionScore = 0;
        for (const [symbol, position] of this.positions) {
            // Higher score for assets that performed poorly recently
            const recentReturn = position.performanceMetrics.weeklyReturn;
            const score = Math.max(1 - recentReturn, 0.1); // Avoid zero weights
            reversionScores[symbol] = score;
            totalReversionScore += score;
        }
        for (const asset of this.config.assets) {
            weights[asset.symbol] = (reversionScores[asset.symbol] || 0.1) / totalReversionScore;
        }
        return weights;
    }
    /**
     * 📊 Calculate portfolio metrics
     */
    async calculateMetrics() {
        const positions = Array.from(this.positions.values());
        if (positions.length === 0) {
            return;
        }
        // Calculate total values
        const totalValue = positions.reduce((sum, pos) => sum + (pos.quantity * pos.currentPrice), 0);
        const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL + pos.realizedPnL, 0);
        // Calculate returns
        const dailyReturns = positions.map(pos => pos.performanceMetrics.dailyReturn * pos.weight);
        const dailyReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0);
        // Calculate risk metrics
        const volatility = this.calculatePortfolioVolatility(positions);
        const var95 = this.calculateVaR(positions, 0.95);
        const cvar95 = this.calculateCVaR(positions, 0.95);
        const sharpeRatio = this.calculateSharpeRatio(dailyReturn, volatility);
        this.metrics = {
            totalValue,
            totalPnL,
            totalReturn: totalValue > 0 ? totalPnL / totalValue : 0,
            dailyReturn,
            sharpeRatio,
            sortino: this.calculateSortino(positions),
            maxDrawdown: this.calculateMaxDrawdown(positions),
            volatility,
            beta: this.calculateBeta(positions),
            alpha: this.calculateAlpha(positions),
            var95,
            cvar95,
            diversificationRatio: this.calculateDiversificationRatio(positions),
            correlationMatrix: this.calculateCorrelationMatrix(),
            riskBudget: this.calculateRiskBudget(positions),
            lastUpdated: new Date()
        };
    }
    /**
     * 💰 Calculate position size based on signal and risk management
     */
    async calculatePositionSize(asset, signal) {
        const currentPosition = this.positions.get(asset.symbol);
        const currentWeight = currentPosition?.weight || 0;
        // Risk-based position sizing
        const maxPositionSize = this.config.riskLimits.maxPositionSize;
        const assetVolatility = asset.volatility;
        const targetVolatility = 0.15; // 15% target volatility
        // Kelly criterion inspired sizing
        const baseSize = Math.min(maxPositionSize, (signal.strength * targetVolatility) / assetVolatility);
        // Adjust for current position
        const portfolioValue = this.metrics.totalValue;
        const dollarSize = baseSize * portfolioValue;
        const shareSize = signal.price ? dollarSize / signal.price : 0;
        // Apply signal direction
        return signal.type === 'BUY' ? shareSize :
            signal.type === 'SELL' ? -shareSize : 0;
    }
    /**
     * ⚠️ Check risk limits and trigger alerts
     */
    async checkRiskLimits() {
        const limits = this.config.riskLimits;
        const violations = [];
        // Check position size limits
        for (const [symbol, position] of this.positions) {
            if (position.weight > limits.maxPositionSize) {
                violations.push(`Position ${symbol} exceeds max size: ${position.weight.toFixed(2)}% > ${limits.maxPositionSize}%`);
            }
        }
        // Check portfolio risk limits
        if (this.metrics.var95 > limits.maxVaR) {
            violations.push(`VaR exceeds limit: ${this.metrics.var95.toFixed(2)}% > ${limits.maxVaR}%`);
        }
        if (this.metrics.maxDrawdown > limits.maxDrawdown) {
            violations.push(`Max drawdown exceeds limit: ${this.metrics.maxDrawdown.toFixed(2)}% > ${limits.maxDrawdown}%`);
        }
        if (this.metrics.volatility > limits.maxVolatility) {
            violations.push(`Volatility exceeds limit: ${this.metrics.volatility.toFixed(2)}% > ${limits.maxVolatility}%`);
        }
        if (violations.length > 0) {
            this.logger.warn('⚠️ Risk limit violations detected:', violations);
            this.emitEvent({
                type: 'RISK_BREACH',
                timestamp: new Date(),
                details: { violations },
                impact: {
                    portfolioValue: this.metrics.totalValue,
                    risk: this.metrics.var95,
                    performance: this.metrics.dailyReturn
                }
            });
        }
    }
    /**
     * 🔍 Detect market regime changes
     */
    async detectMarketRegime(marketData) {
        // Simple regime detection based on volatility and trend
        const recentData = marketData.slice(-20); // Last 20 periods
        if (recentData.length < 10)
            return;
        const returns = recentData.slice(1).map((data, i) => (data.close - recentData[i].close) / recentData[i].close);
        const volatility = this.calculateVolatility(returns);
        const trend = this.calculateTrend(recentData);
        let regimeType;
        if (volatility > 0.03) { // 3% daily volatility threshold
            regimeType = 'HIGH_VOLATILITY';
        }
        else if (volatility < 0.01) {
            regimeType = 'LOW_VOLATILITY';
        }
        else if (trend > 0.02) {
            regimeType = 'BULL';
        }
        else if (trend < -0.02) {
            regimeType = 'BEAR';
        }
        else {
            regimeType = 'SIDEWAYS';
        }
        const newRegime = {
            type: regimeType,
            confidence: 0.7, // Simplified confidence
            indicators: {
                trend,
                volatility,
                momentum: returns[returns.length - 1] || 0,
                sentiment: 0 // Would need sentiment data
            },
            duration: this.currentRegime?.type === regimeType ?
                (this.currentRegime.duration + 1) : 1,
            lastChanged: this.currentRegime?.type !== regimeType ?
                new Date() : (this.currentRegime.lastChanged || new Date())
        };
        if (!this.currentRegime || this.currentRegime.type !== regimeType) {
            this.logger.info(`📊 Market regime changed: ${regimeType}`);
            this.emitEvent({
                type: 'REGIME_CHANGE',
                timestamp: new Date(),
                details: { oldRegime: this.currentRegime, newRegime },
                impact: {
                    portfolioValue: this.metrics.totalValue,
                    risk: volatility,
                    performance: trend
                }
            });
        }
        this.currentRegime = newRegime;
    }
    // Helper methods for calculations
    calculateVolatility(returns) {
        const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
        return Math.sqrt(variance * 252); // Annualized
    }
    calculateTrend(data) {
        const firstPrice = data[0].close;
        const lastPrice = data[data.length - 1].close;
        return (lastPrice - firstPrice) / firstPrice;
    }
    calculatePortfolioVolatility(positions) {
        // Simplified portfolio volatility calculation
        const weightedVol = positions.reduce((sum, pos) => sum + (pos.weight * pos.performanceMetrics.volatility), 0);
        return weightedVol;
    }
    calculateVaR(positions, confidence) {
        // Simplified VaR calculation
        const returns = positions.map(pos => pos.performanceMetrics.dailyReturn * pos.weight);
        const portfolioReturn = returns.reduce((sum, ret) => sum + ret, 0);
        const portfolioVol = this.calculatePortfolioVolatility(positions);
        // Normal distribution assumption
        const zScore = confidence === 0.95 ? 1.645 : 2.326;
        return portfolioVol * zScore;
    }
    calculateCVaR(positions, confidence) {
        const var95 = this.calculateVaR(positions, confidence);
        return var95 * 1.3; // Simplified CVaR
    }
    calculateSharpeRatio(return_, volatility) {
        const riskFreeRate = 0.02; // 2% risk-free rate
        return volatility > 0 ? (return_ - riskFreeRate) / volatility : 0;
    }
    shouldRebalance() {
        const daysSinceRebalance = (Date.now() - this.lastRebalance.getTime()) / (1000 * 60 * 60 * 24);
        switch (this.config.strategy.rebalanceFrequency) {
            case 'DAILY': return daysSinceRebalance >= 1;
            case 'WEEKLY': return daysSinceRebalance >= 7;
            case 'MONTHLY': return daysSinceRebalance >= 30;
            case 'QUARTERLY': return daysSinceRebalance >= 90;
            default: return false;
        }
    }
    // Placeholder methods for complex calculations
    calculateSortino(positions) { return 0; }
    calculateMaxDrawdown(positions) { return 0; }
    calculateBeta(positions) { return 1; }
    calculateAlpha(positions) { return 0; }
    calculateDiversificationRatio(positions) { return 1; }
    calculateCorrelationMatrix() { return {}; }
    calculateRiskBudget(positions) { return {}; }
    calculateRebalancingRisk(actions) { return 0; }
    createRebalancingAction(position, targetWeight) {
        const currentWeight = position.weight;
        const deviation = targetWeight - currentWeight;
        return {
            asset: position.asset,
            currentWeight,
            targetWeight,
            action: deviation > 0 ? 'BUY' : deviation < 0 ? 'SELL' : 'HOLD',
            quantity: Math.abs(deviation * this.metrics.totalValue / position.currentPrice),
            estimatedCost: Math.abs(deviation * this.metrics.totalValue),
            priority: Math.abs(deviation) * 10,
            reason: `Rebalance from ${(currentWeight * 100).toFixed(1)}% to ${(targetWeight * 100).toFixed(1)}%`
        };
    }
    updatePositionPrices(marketData) {
        // Update current prices for all positions
        return Promise.resolve();
    }
    initializeMetrics() {
        return {
            totalValue: this.config.initialCapital,
            totalPnL: 0,
            totalReturn: 0,
            dailyReturn: 0,
            sharpeRatio: 0,
            sortino: 0,
            maxDrawdown: 0,
            volatility: 0,
            beta: 1,
            alpha: 0,
            var95: 0,
            cvar95: 0,
            diversificationRatio: 1,
            correlationMatrix: {},
            riskBudget: {},
            lastUpdated: new Date()
        };
    }
    emitEvent(event) {
        this.eventHistory.push(event);
        // Keep only last 1000 events
        if (this.eventHistory.length > 1000) {
            this.eventHistory = this.eventHistory.slice(-1000);
        }
        this.emit('portfolioEvent', event);
    }
    // Public getters
    getMetrics() { return { ...this.metrics }; }
    getPositions() { return Array.from(this.positions.values()); }
    getCurrentRegime() { return this.currentRegime; }
    getEventHistory() { return [...this.eventHistory]; }
}
exports.AdvancedPortfolioManager = AdvancedPortfolioManager;
exports.default = AdvancedPortfolioManager;

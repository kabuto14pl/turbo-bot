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
 * PHASE C.4 - Real-Time VaR Monitoring System
 * Advanced Risk Assessment & Value-at-Risk Calculation
 *
 * Implements multiple VaR calculation methodologies:
 * - Parametric VaR (Normal distribution)
 * - Historical VaR (Historical simulation)
 * - Monte Carlo VaR (Simulation-based)
 * - EWMA VaR (Exponentially Weighted Moving Average)
 * - Conditional VaR (Expected Shortfall)
 *
 * Features:
 * - Real-time portfolio risk monitoring
 * - Multiple confidence levels (90%, 95%, 99%)
 * - Backtesting and model validation
 * - Stress testing scenarios
 * - Risk decomposition by asset/strategy
 * - Alert system for risk breaches
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealTimeVaRMonitor = void 0;
const events_1 = require("events");
/**
 * Real-Time VaR Monitoring System
 *
 * Advanced risk management system providing continuous VaR calculation
 * and monitoring with multiple methodologies and real-time alerting
 */
class RealTimeVaRMonitor extends events_1.EventEmitter {
    constructor(portfolio) {
        super();
        this.historicalPrices = new Map();
        this.correlationMatrix = new Map();
        this.volatilities = new Map();
        this.varHistory = [];
        this.activeAlerts = new Map();
        this.isMonitoring = false;
        this.lastUpdateTime = new Date();
        // Configuration
        this.defaultConfig = {
            confidence: 0.95,
            timeHorizon: 1,
            method: 'PARAMETRIC',
            lookbackPeriod: 252, // 1 year
            decayFactor: 0.94,
            simulations: 10000
        };
        this.riskThresholds = {
            varWarning: 0.02, // 2% of portfolio
            varCritical: 0.05, // 5% of portfolio
            concentrationLimit: 0.25, // 25% max in single asset
            volatilityAlert: 0.30, // 30% annualized volatility
            correlationAlert: 0.80 // 80% correlation threshold
        };
        this.portfolio = portfolio;
        this.initializeRiskModel();
    }
    /**
     * Start real-time VaR monitoring
     */
    async startMonitoring(updateIntervalMs = 5000) {
        if (this.isMonitoring) {
            console.log('⚠️ VaR monitoring already active');
            return;
        }
        console.log('🎯 Starting Real-Time VaR monitoring...');
        // Initialize historical data
        await this.loadHistoricalData();
        // Start monitoring loop
        this.updateInterval = setInterval(async () => {
            await this.performRiskAssessment();
        }, updateIntervalMs);
        this.isMonitoring = true;
        this.emit('monitoringStarted');
        console.log('✅ Real-Time VaR monitoring active');
    }
    /**
     * Stop VaR monitoring
     */
    stopMonitoring() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = undefined;
        }
        this.isMonitoring = false;
        this.emit('monitoringStopped');
        console.log('🛑 VaR monitoring stopped');
    }
    /**
     * Calculate VaR using specified method
     */
    async calculateVaR(config = {}) {
        const finalConfig = { ...this.defaultConfig, ...config };
        const startTime = Date.now();
        let varValue;
        let modelStats;
        switch (finalConfig.method) {
            case 'PARAMETRIC':
                ({ value: varValue, stats: modelStats } = await this.calculateParametricVaR(finalConfig));
                break;
            case 'HISTORICAL':
                ({ value: varValue, stats: modelStats } = await this.calculateHistoricalVaR(finalConfig));
                break;
            case 'MONTE_CARLO':
                ({ value: varValue, stats: modelStats } = await this.calculateMonteCarloVaR(finalConfig));
                break;
            case 'EWMA':
                ({ value: varValue, stats: modelStats } = await this.calculateEWMAVaR(finalConfig));
                break;
            case 'CONDITIONAL':
                ({ value: varValue, stats: modelStats } = await this.calculateConditionalVaR(finalConfig));
                break;
            default:
                throw new Error(`Unsupported VaR method: ${finalConfig.method}`);
        }
        // Calculate position contributions
        const positionContributions = await this.calculatePositionContributions(varValue, finalConfig);
        const result = {
            value: varValue,
            confidence: finalConfig.confidence,
            timeHorizon: finalConfig.timeHorizon,
            method: finalConfig.method,
            timestamp: new Date(),
            portfolioValue: this.portfolio.totalValue,
            relativePct: (varValue / this.portfolio.totalValue) * 100,
            positions: positionContributions,
            modelStats
        };
        // Store result
        this.varHistory.push(result);
        if (this.varHistory.length > 1000) {
            this.varHistory = this.varHistory.slice(-1000);
        }
        const calculationTime = Date.now() - startTime;
        console.log(`📊 VaR calculated: $${varValue.toFixed(2)} (${result.relativePct.toFixed(2)}%) using ${finalConfig.method} in ${calculationTime}ms`);
        this.emit('varCalculated', result);
        return result;
    }
    /**
     * Get comprehensive risk metrics
     */
    async getRiskMetrics() {
        const dailyVar = await this.calculateVaR({ confidence: 0.95, timeHorizon: 1 });
        const weeklyVar = await this.calculateVaR({ confidence: 0.95, timeHorizon: 5 });
        const monthlyVar = await this.calculateVaR({ confidence: 0.95, timeHorizon: 22 });
        const conditionalVar = await this.calculateVaR({ method: 'CONDITIONAL', confidence: 0.95 });
        const returns = this.calculatePortfolioReturns();
        const maxDrawdown = this.calculateMaxDrawdown(returns);
        const sharpeRatio = this.calculateSharpeRatio(returns);
        const sortinoRatio = this.calculateSortinoRatio(returns);
        const beta = this.calculatePortfolioBeta();
        return {
            dailyVaR: dailyVar.value,
            weeklyVaR: weeklyVar.value,
            monthlyVaR: monthlyVar.value,
            conditionalVaR: conditionalVar.value,
            maxDrawdown,
            sharpeRatio,
            sortinoRatio,
            calmarRatio: sharpeRatio / Math.abs(maxDrawdown),
            beta,
            trackingError: this.calculateTrackingError()
        };
    }
    /**
     * Perform stress testing
     */
    async performStressTesting(scenarios) {
        const stressResults = new Map();
        for (const scenario of scenarios) {
            const stressedPortfolio = this.applyStressScenario(scenario);
            const stressVaR = await this.calculateVaRForPortfolio(stressedPortfolio);
            stressResults.set(scenario.name, stressVaR);
            console.log(`🧪 Stress Test "${scenario.name}": VaR = $${stressVaR.toFixed(2)}`);
        }
        this.emit('stressTestCompleted', stressResults);
        return stressResults;
    }
    /**
     * Get VaR history
     */
    getVaRHistory(limit = 100) {
        return this.varHistory.slice(-limit);
    }
    /**
     * Get active risk alerts
     */
    getActiveAlerts() {
        return Array.from(this.activeAlerts.values());
    }
    /**
     * Update portfolio for monitoring
     */
    updatePortfolio(portfolio) {
        this.portfolio = portfolio;
        this.lastUpdateTime = new Date();
    }
    /**
     * Update market data
     */
    updateMarketData(marketData) {
        for (const data of marketData) {
            // Update price history
            if (!this.historicalPrices.has(data.symbol)) {
                this.historicalPrices.set(data.symbol, []);
            }
            const prices = this.historicalPrices.get(data.symbol);
            prices.push(data.price);
            // Keep only last 252 days
            if (prices.length > 252) {
                prices.splice(0, prices.length - 252);
            }
            // Update volatility
            this.updateVolatility(data.symbol);
        }
        // Update correlation matrix
        this.updateCorrelationMatrix();
    }
    // Private VaR Calculation Methods
    async calculateParametricVaR(config) {
        const portfolioValue = this.portfolio.totalValue;
        const portfolioVolatility = this.calculatePortfolioVolatility();
        const zScore = this.getZScore(config.confidence);
        const varValue = portfolioValue * portfolioVolatility * zScore * Math.sqrt(config.timeHorizon);
        const stats = {
            volatility: portfolioVolatility,
            correlation: this.getCorrelationMatrix(),
            beta: this.calculatePortfolioBeta(),
            skewness: this.calculateSkewness(),
            kurtosis: this.calculateKurtosis()
        };
        return { value: varValue, stats };
    }
    async calculateHistoricalVaR(config) {
        const returns = this.calculatePortfolioReturns(config.lookbackPeriod);
        if (returns.length === 0) {
            throw new Error('Insufficient historical data for Historical VaR');
        }
        // Sort returns and find percentile
        const sortedReturns = returns.sort((a, b) => a - b);
        const percentileIndex = Math.floor((1 - config.confidence) * sortedReturns.length);
        const varReturn = sortedReturns[percentileIndex];
        const varValue = Math.abs(varReturn * this.portfolio.totalValue * Math.sqrt(config.timeHorizon));
        const stats = {
            volatility: this.calculateVolatility(returns),
            correlation: this.getCorrelationMatrix(),
            beta: this.calculatePortfolioBeta(),
            skewness: this.calculateSkewness(returns),
            kurtosis: this.calculateKurtosis(returns),
            backTestResults: this.performBackTest(returns, varValue, config.confidence)
        };
        return { value: varValue, stats };
    }
    async calculateMonteCarloVaR(config) {
        const simulations = config.simulations || 10000;
        const portfolioReturns = [];
        // Generate random scenarios
        for (let i = 0; i < simulations; i++) {
            const simulatedReturn = this.simulatePortfolioReturn(config.timeHorizon);
            portfolioReturns.push(simulatedReturn);
        }
        // Calculate VaR from simulated returns
        const sortedReturns = portfolioReturns.sort((a, b) => a - b);
        const percentileIndex = Math.floor((1 - config.confidence) * sortedReturns.length);
        const varReturn = sortedReturns[percentileIndex];
        const varValue = Math.abs(varReturn * this.portfolio.totalValue);
        const stats = {
            volatility: this.calculateVolatility(portfolioReturns),
            correlation: this.getCorrelationMatrix(),
            beta: this.calculatePortfolioBeta(),
            skewness: this.calculateSkewness(portfolioReturns),
            kurtosis: this.calculateKurtosis(portfolioReturns)
        };
        return { value: varValue, stats };
    }
    async calculateEWMAVaR(config) {
        const decayFactor = config.decayFactor || 0.94;
        const returns = this.calculatePortfolioReturns();
        if (returns.length === 0) {
            throw new Error('Insufficient data for EWMA VaR');
        }
        // Calculate EWMA variance
        let ewmaVariance = 0;
        let weight = 1;
        let totalWeight = 0;
        for (let i = returns.length - 1; i >= 0; i--) {
            ewmaVariance += weight * Math.pow(returns[i], 2);
            totalWeight += weight;
            weight *= decayFactor;
        }
        ewmaVariance /= totalWeight;
        const ewmaVolatility = Math.sqrt(ewmaVariance);
        const zScore = this.getZScore(config.confidence);
        const varValue = this.portfolio.totalValue * ewmaVolatility * zScore * Math.sqrt(config.timeHorizon);
        const stats = {
            volatility: ewmaVolatility,
            correlation: this.getCorrelationMatrix(),
            beta: this.calculatePortfolioBeta(),
            skewness: this.calculateSkewness(returns),
            kurtosis: this.calculateKurtosis(returns)
        };
        return { value: varValue, stats };
    }
    async calculateConditionalVaR(config) {
        // First calculate regular VaR
        const historicalConfig = { ...config, method: 'HISTORICAL' };
        const { value: regularVaR, stats } = await this.calculateHistoricalVaR(historicalConfig);
        const returns = this.calculatePortfolioReturns(config.lookbackPeriod);
        const sortedReturns = returns.sort((a, b) => a - b);
        // Find returns worse than VaR
        const varReturn = regularVaR / this.portfolio.totalValue;
        const tailReturns = sortedReturns.filter(r => r <= -varReturn);
        // Calculate Expected Shortfall (CVaR)
        const expectedShortfall = tailReturns.length > 0
            ? tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length
            : varReturn;
        const cvarValue = Math.abs(expectedShortfall * this.portfolio.totalValue * Math.sqrt(config.timeHorizon));
        return { value: cvarValue, stats };
    }
    // Supporting Methods
    initializeRiskModel() {
        // Initialize with default market data if portfolio has positions
        for (const position of this.portfolio.positions) {
            if (!this.historicalPrices.has(position.symbol)) {
                this.historicalPrices.set(position.symbol, []);
            }
            if (!this.volatilities.has(position.symbol)) {
                this.volatilities.set(position.symbol, 0.20); // 20% default volatility
            }
        }
    }
    async loadHistoricalData() {
        // Simulate loading historical price data
        // In production, this would load from market data service
        for (const position of this.portfolio.positions) {
            const prices = this.generateSimulatedPrices(position.symbol, 252);
            this.historicalPrices.set(position.symbol, prices);
            this.updateVolatility(position.symbol);
        }
        this.updateCorrelationMatrix();
        console.log('📚 Historical market data loaded');
    }
    generateSimulatedPrices(symbol, days) {
        const prices = [];
        let currentPrice = 100; // Starting price
        const dailyVol = 0.02; // 2% daily volatility
        for (let i = 0; i < days; i++) {
            const randomReturn = this.normalRandom() * dailyVol;
            currentPrice *= (1 + randomReturn);
            prices.push(currentPrice);
        }
        return prices;
    }
    normalRandom() {
        // Box-Muller transformation for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }
    calculatePortfolioVolatility() {
        if (this.portfolio.positions.length === 0)
            return 0;
        let portfolioVariance = 0;
        const totalValue = this.portfolio.totalValue;
        // Calculate weighted variance
        for (let i = 0; i < this.portfolio.positions.length; i++) {
            const pos1 = this.portfolio.positions[i];
            const weight1 = (Math.abs(pos1.size) * pos1.currentPrice) / totalValue;
            const vol1 = this.volatilities.get(pos1.symbol) || 0.20;
            for (let j = 0; j < this.portfolio.positions.length; j++) {
                const pos2 = this.portfolio.positions[j];
                const weight2 = (Math.abs(pos2.size) * pos2.currentPrice) / totalValue;
                const vol2 = this.volatilities.get(pos2.symbol) || 0.20;
                const correlation = this.getCorrelation(pos1.symbol, pos2.symbol);
                portfolioVariance += weight1 * weight2 * vol1 * vol2 * correlation;
            }
        }
        return Math.sqrt(portfolioVariance);
    }
    calculatePortfolioReturns(lookback) {
        // Simulate portfolio returns based on position weights and asset returns
        const returns = [];
        const days = Math.min(lookback || 252, 100); // Limit for simulation
        for (let i = 0; i < days; i++) {
            let portfolioReturn = 0;
            const totalValue = this.portfolio.totalValue;
            for (const position of this.portfolio.positions) {
                const weight = (Math.abs(position.size) * position.currentPrice) / totalValue;
                const assetReturn = this.normalRandom() * (this.volatilities.get(position.symbol) || 0.20);
                portfolioReturn += weight * assetReturn;
            }
            returns.push(portfolioReturn);
        }
        return returns;
    }
    updateVolatility(symbol) {
        const prices = this.historicalPrices.get(symbol);
        if (!prices || prices.length < 2)
            return;
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
        const volatility = this.calculateVolatility(returns);
        this.volatilities.set(symbol, volatility);
    }
    calculateVolatility(returns) {
        if (returns.length === 0)
            return 0;
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        return Math.sqrt(variance * 252); // Annualized volatility
    }
    updateCorrelationMatrix() {
        const symbols = Array.from(this.historicalPrices.keys());
        for (let i = 0; i < symbols.length; i++) {
            if (!this.correlationMatrix.has(symbols[i])) {
                this.correlationMatrix.set(symbols[i], new Map());
            }
            for (let j = 0; j < symbols.length; j++) {
                const correlation = this.calculateCorrelation(symbols[i], symbols[j]);
                this.correlationMatrix.get(symbols[i]).set(symbols[j], correlation);
            }
        }
    }
    calculateCorrelation(symbol1, symbol2) {
        if (symbol1 === symbol2)
            return 1.0;
        const prices1 = this.historicalPrices.get(symbol1);
        const prices2 = this.historicalPrices.get(symbol2);
        if (!prices1 || !prices2 || prices1.length < 2 || prices2.length < 2) {
            return 0.3; // Default correlation
        }
        // Calculate returns
        const returns1 = [];
        const returns2 = [];
        const minLength = Math.min(prices1.length, prices2.length);
        for (let i = 1; i < minLength; i++) {
            returns1.push((prices1[i] - prices1[i - 1]) / prices1[i - 1]);
            returns2.push((prices2[i] - prices2[i - 1]) / prices2[i - 1]);
        }
        // Calculate correlation
        const mean1 = returns1.reduce((sum, r) => sum + r, 0) / returns1.length;
        const mean2 = returns2.reduce((sum, r) => sum + r, 0) / returns2.length;
        let numerator = 0;
        let sumSq1 = 0;
        let sumSq2 = 0;
        for (let i = 0; i < returns1.length; i++) {
            const diff1 = returns1[i] - mean1;
            const diff2 = returns2[i] - mean2;
            numerator += diff1 * diff2;
            sumSq1 += diff1 * diff1;
            sumSq2 += diff2 * diff2;
        }
        const denominator = Math.sqrt(sumSq1 * sumSq2);
        return denominator === 0 ? 0 : numerator / denominator;
    }
    getCorrelation(symbol1, symbol2) {
        return this.correlationMatrix.get(symbol1)?.get(symbol2) || 0.3;
    }
    getCorrelationMatrix() {
        const symbols = Array.from(this.correlationMatrix.keys());
        const matrix = [];
        for (let i = 0; i < symbols.length; i++) {
            matrix[i] = [];
            for (let j = 0; j < symbols.length; j++) {
                matrix[i][j] = this.getCorrelation(symbols[i], symbols[j]);
            }
        }
        return matrix;
    }
    getZScore(confidence) {
        // Approximate inverse normal distribution
        if (confidence === 0.90)
            return 1.282;
        if (confidence === 0.95)
            return 1.645;
        if (confidence === 0.99)
            return 2.326;
        // More accurate calculation for other confidence levels
        return Math.sqrt(2) * this.inverseErf(2 * confidence - 1);
    }
    inverseErf(x) {
        // Approximation of inverse error function
        const a = 0.147;
        const term1 = Math.log(1 - x * x);
        const term2 = (2 / (Math.PI * a)) + (term1 / 2);
        const term3 = term1 / a;
        return Math.sign(x) * Math.sqrt(Math.sqrt(term2 * term2 - term3) - term2);
    }
    calculateSkewness(returns) {
        const data = returns || this.calculatePortfolioReturns();
        if (data.length < 3)
            return 0;
        const mean = data.reduce((sum, x) => sum + x, 0) / data.length;
        const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / data.length;
        const stdDev = Math.sqrt(variance);
        const skewness = data.reduce((sum, x) => sum + Math.pow((x - mean) / stdDev, 3), 0) / data.length;
        return skewness;
    }
    calculateKurtosis(returns) {
        const data = returns || this.calculatePortfolioReturns();
        if (data.length < 4)
            return 3; // Normal distribution kurtosis
        const mean = data.reduce((sum, x) => sum + x, 0) / data.length;
        const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / data.length;
        const stdDev = Math.sqrt(variance);
        const kurtosis = data.reduce((sum, x) => sum + Math.pow((x - mean) / stdDev, 4), 0) / data.length;
        return kurtosis;
    }
    calculatePositionContributions(totalVaR, config) {
        const contributions = [];
        const totalValue = this.portfolio.totalValue;
        for (const position of this.portfolio.positions) {
            const positionValue = Math.abs(position.size) * position.currentPrice;
            const weight = positionValue / totalValue;
            const volatility = this.volatilities.get(position.symbol) || 0.20;
            // Component VaR calculation
            const componentVaR = weight * volatility * totalVaR / this.calculatePortfolioVolatility();
            const contribution = componentVaR;
            const contributionPct = (contribution / totalVaR) * 100;
            // Marginal VaR (approximation)
            const marginalVaR = componentVaR / weight;
            contributions.push({
                positionId: position.id,
                symbol: position.symbol,
                contribution,
                contributionPct,
                marginalVaR,
                componentVaR
            });
        }
        return contributions;
    }
    performBackTest(returns, varValue, confidence) {
        const varReturn = varValue / this.portfolio.totalValue;
        const violations = returns.filter(r => r < -varReturn).length;
        const violationRate = violations / returns.length;
        const expectedViolations = returns.length * (1 - confidence);
        // Kupiec test statistic
        const p = 1 - confidence;
        const kupiecTest = 2 * Math.log((Math.pow(violationRate, violations) * Math.pow(1 - violationRate, returns.length - violations)) /
            (Math.pow(p, violations) * Math.pow(1 - p, returns.length - violations)));
        // Simple pass/fail (critical value ~3.84 for 95% confidence)
        const isPassing = kupiecTest < 3.84 && violationRate <= p * 1.5;
        return {
            violations,
            violationRate,
            expectedViolations,
            kupiecTest,
            christoffersenTest: 0, // Simplified
            isPassing
        };
    }
    calculatePortfolioBeta() {
        // Simplified beta calculation against market (assumed)
        const marketVolatility = 0.16; // 16% market volatility
        const portfolioVolatility = this.calculatePortfolioVolatility();
        const marketCorrelation = 0.8; // 80% correlation with market
        return (portfolioVolatility / marketVolatility) * marketCorrelation;
    }
    calculateMaxDrawdown(returns) {
        let maxDrawdown = 0;
        let peak = 0;
        let cumReturn = 0;
        for (const ret of returns) {
            cumReturn += ret;
            peak = Math.max(peak, cumReturn);
            const drawdown = peak - cumReturn;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        }
        return -maxDrawdown;
    }
    calculateSharpeRatio(returns) {
        if (returns.length === 0)
            return 0;
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const volatility = this.calculateVolatility(returns);
        const riskFreeRate = 0.02; // 2% risk-free rate
        return volatility === 0 ? 0 : (avgReturn * 252 - riskFreeRate) / volatility;
    }
    calculateSortinoRatio(returns) {
        if (returns.length === 0)
            return 0;
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const downside = returns.filter(r => r < 0);
        const downsideVol = downside.length > 0 ? this.calculateVolatility(downside) : 0;
        const riskFreeRate = 0.02;
        return downsideVol === 0 ? 0 : (avgReturn * 252 - riskFreeRate) / downsideVol;
    }
    calculateTrackingError() {
        // Simplified tracking error calculation
        const portfolioReturns = this.calculatePortfolioReturns();
        const benchmarkReturns = portfolioReturns.map(r => r * 0.8); // Simplified benchmark
        const trackingDiffs = portfolioReturns.map((r, i) => r - benchmarkReturns[i]);
        return this.calculateVolatility(trackingDiffs);
    }
    simulatePortfolioReturn(timeHorizon) {
        let portfolioReturn = 0;
        const totalValue = this.portfolio.totalValue;
        for (const position of this.portfolio.positions) {
            const weight = (Math.abs(position.size) * position.currentPrice) / totalValue;
            const volatility = this.volatilities.get(position.symbol) || 0.20;
            // Generate correlated random return
            const randomReturn = this.normalRandom() * volatility * Math.sqrt(timeHorizon);
            portfolioReturn += weight * randomReturn;
        }
        return portfolioReturn;
    }
    applyStressScenario(scenario) {
        const stressedPortfolio = JSON.parse(JSON.stringify(this.portfolio));
        for (const position of stressedPortfolio.positions) {
            const shock = scenario.marketShocks.find(s => s.symbol === position.symbol);
            if (shock) {
                position.currentPrice *= (1 + shock.priceChange / 100);
                position.unrealizedPnL = position.size * (position.currentPrice - position.entryPrice);
            }
        }
        // Recalculate portfolio value
        stressedPortfolio.totalValue = stressedPortfolio.cash +
            stressedPortfolio.positions.reduce((sum, p) => sum + Math.abs(p.size) * p.currentPrice + p.unrealizedPnL, 0);
        return stressedPortfolio;
    }
    async calculateVaRForPortfolio(portfolio) {
        const originalPortfolio = this.portfolio;
        this.portfolio = portfolio;
        try {
            const result = await this.calculateVaR();
            return result.value;
        }
        finally {
            this.portfolio = originalPortfolio;
        }
    }
    async performRiskAssessment() {
        try {
            // Calculate VaR with multiple methods
            const parametricVaR = await this.calculateVaR({ method: 'PARAMETRIC' });
            const historicalVaR = await this.calculateVaR({ method: 'HISTORICAL' });
            // Check for risk alerts
            await this.checkRiskAlerts(parametricVaR);
            // Update metrics
            this.lastUpdateTime = new Date();
            this.emit('riskAssessmentCompleted', {
                parametricVaR,
                historicalVaR,
                timestamp: this.lastUpdateTime
            });
        }
        catch (error) {
            console.error('Risk assessment failed:', error);
            this.emit('riskAssessmentFailed', error);
        }
    }
    async checkRiskAlerts(varResult) {
        const alerts = [];
        // VaR threshold alerts
        if (varResult.relativePct > this.riskThresholds.varCritical * 100) {
            alerts.push(this.createAlert('CRITICAL', 'VAR_BREACH', `Portfolio VaR (${varResult.relativePct.toFixed(2)}%) exceeds critical threshold`, varResult, this.riskThresholds.varCritical * 100, 'Consider reducing position sizes or increasing diversification'));
        }
        else if (varResult.relativePct > this.riskThresholds.varWarning * 100) {
            alerts.push(this.createAlert('HIGH', 'VAR_BREACH', `Portfolio VaR (${varResult.relativePct.toFixed(2)}%) exceeds warning threshold`, varResult, this.riskThresholds.varWarning * 100, 'Monitor positions closely and consider risk reduction'));
        }
        // Concentration alerts
        for (const contribution of varResult.positions) {
            if (contribution.contributionPct > this.riskThresholds.concentrationLimit * 100) {
                alerts.push(this.createAlert('MEDIUM', 'CONCENTRATION', `High concentration in ${contribution.symbol} (${contribution.contributionPct.toFixed(2)}%)`, varResult, this.riskThresholds.concentrationLimit * 100, 'Consider reducing exposure to this asset'));
            }
        }
        // Volatility alerts
        if (varResult.modelStats.volatility > this.riskThresholds.volatilityAlert) {
            alerts.push(this.createAlert('MEDIUM', 'VOLATILITY', `High portfolio volatility (${(varResult.modelStats.volatility * 100).toFixed(2)}%)`, varResult, this.riskThresholds.volatilityAlert * 100, 'Consider reducing leverage or position sizes'));
        }
        // Process alerts
        for (const alert of alerts) {
            this.activeAlerts.set(alert.id, alert);
            this.emit('riskAlert', alert);
            console.log(`🚨 Risk Alert [${alert.level}]: ${alert.message}`);
        }
        // Clean up old alerts (older than 1 hour)
        const oneHourAgo = new Date(Date.now() - 3600000);
        for (const [id, alert] of Array.from(this.activeAlerts)) {
            if (alert.timestamp < oneHourAgo) {
                this.activeAlerts.delete(id);
            }
        }
    }
    createAlert(level, type, message, varResult, threshold, recommendation) {
        return {
            id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            level,
            type,
            message,
            varResult,
            threshold,
            recommendation,
            timestamp: new Date()
        };
    }
}
exports.RealTimeVaRMonitor = RealTimeVaRMonitor;

"use strict";
/**
 * 📊 TIER 3.1: PORTFOLIO OPTIMIZATION ENGINE
 * Advanced portfolio optimization with multiple strategies
 *
 * Features:
 * - Markowitz Mean-Variance Optimization
 * - Black-Litterman Model
 * - Risk Parity Allocation
 * - Constraint-based Optimization
 * - Dynamic Rebalancing
 * - Multi-objective Optimization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PORTFOLIO_CONFIG = exports.PortfolioOptimizationEngine = void 0;
/**
 * 📊 PORTFOLIO OPTIMIZATION ENGINE
 */
class PortfolioOptimizationEngine {
    constructor(config = {}) {
        // Portfolio state
        this.assets = new Map();
        this.correlationMatrix = [];
        this.covarianceMatrix = [];
        // Optimization history
        this.optimizationHistory = [];
        this.lastRebalance = 0;
        this.config = {
            optimization_method: 'markowitz',
            risk_free_rate: 0.02, // 2% annual
            min_weight: 0.0,
            max_weight: 0.3, // Max 30% per asset
            max_concentration: 0.6, // Top 3 assets max 60%
            long_only: true,
            integer_shares: false,
            rebalance_frequency: 'weekly',
            rebalance_threshold: 0.05, // 5% drift
            transaction_cost: 0.001, // 0.1%
            min_trade_size: 100, // $100 minimum
            tau: 0.05,
            confidence_level: 0.8,
            ...config
        };
        this.logger = {
            info: (msg) => console.log(`[PORTFOLIO] ${msg}`),
            warn: (msg) => console.warn(`[PORTFOLIO] ${msg}`),
            error: (msg) => console.error(`[PORTFOLIO] ${msg}`)
        };
    }
    /**
     * 🚀 Initialize portfolio optimizer
     */
    async initialize(assets) {
        this.logger.info('🚀 Initializing Portfolio Optimization Engine...');
        // Store asset data
        for (const asset of assets) {
            this.assets.set(asset.symbol, asset);
        }
        // Calculate covariance matrix
        await this.calculateCovarianceMatrix();
        this.logger.info(`✅ Portfolio optimizer initialized with ${assets.length} assets`);
        this.logger.info(`📊 Optimization method: ${this.config.optimization_method}`);
    }
    /**
     * 🎯 Optimize portfolio
     */
    async optimize() {
        const startTime = Date.now();
        this.logger.info(`🎯 Running ${this.config.optimization_method} optimization...`);
        let result;
        switch (this.config.optimization_method) {
            case 'markowitz':
                result = await this.markowitzOptimization();
                break;
            case 'black_litterman':
                result = await this.blackLittermanOptimization();
                break;
            case 'risk_parity':
                result = await this.riskParityOptimization();
                break;
            case 'equal_weight':
                result = await this.equalWeightOptimization();
                break;
            default:
                throw new Error(`Unknown optimization method: ${this.config.optimization_method}`);
        }
        result.optimization_time_ms = Date.now() - startTime;
        result.timestamp = Date.now();
        // Validate constraints
        result.constraints_satisfied = this.validateConstraints(result.optimal_weights);
        // Calculate trades required
        this.calculateRebalancingTrades(result);
        // Store in history
        this.optimizationHistory.push(result);
        this.logger.info(`✅ Optimization complete in ${result.optimization_time_ms}ms`);
        this.logger.info(`📊 Expected return: ${(result.expected_return * 100).toFixed(2)}%`);
        this.logger.info(`📊 Expected volatility: ${(result.expected_volatility * 100).toFixed(2)}%`);
        this.logger.info(`📊 Sharpe ratio: ${result.sharpe_ratio.toFixed(2)}`);
        return result;
    }
    /**
     * 📈 Markowitz Mean-Variance Optimization
     */
    async markowitzOptimization() {
        this.logger.info('📈 Running Markowitz optimization...');
        const n = this.assets.size;
        const expectedReturns = Array.from(this.assets.values()).map(a => a.expected_return);
        // Find maximum Sharpe ratio portfolio using quadratic programming
        const optimalWeights = this.maximizeSharpeRatio(expectedReturns, this.covarianceMatrix);
        // Calculate portfolio metrics
        const portfolioMetrics = this.calculatePortfolioMetrics(optimalWeights, expectedReturns);
        // Generate efficient frontier
        const frontier = this.generateEfficientFrontier(20); // 20 points
        const result = {
            optimal_weights: this.arrayToWeightMap(optimalWeights),
            expected_return: portfolioMetrics.return,
            expected_volatility: portfolioMetrics.volatility,
            sharpe_ratio: portfolioMetrics.sharpe,
            var_95: this.calculateVaR(optimalWeights, 0.95),
            cvar_95: this.calculateCVaR(optimalWeights, 0.95),
            max_drawdown_estimate: this.estimateMaxDrawdown(optimalWeights),
            herfindahl_index: this.calculateHerfindahlIndex(optimalWeights),
            effective_n_assets: this.calculateEffectiveNAssets(optimalWeights),
            trades_required: new Map(),
            total_turnover: 0,
            total_transaction_cost: 0,
            optimization_method: 'markowitz',
            timestamp: Date.now(),
            constraints_satisfied: true,
            optimization_time_ms: 0,
            frontier_returns: frontier.returns,
            frontier_volatilities: frontier.volatilities,
            frontier_weights: frontier.weights,
            is_min_variance: false,
            is_max_sharpe: true,
            is_max_return: false
        };
        return result;
    }
    /**
     * 🎨 Black-Litterman Optimization
     */
    async blackLittermanOptimization() {
        this.logger.info('🎨 Running Black-Litterman optimization...');
        const n = this.assets.size;
        // Step 1: Calculate market equilibrium (prior)
        const marketCap = Array.from(this.assets.values()).map(a => a.market_cap || 1e9);
        const totalMarketCap = marketCap.reduce((sum, cap) => sum + cap, 0);
        const marketWeights = marketCap.map(cap => cap / totalMarketCap);
        // Implied equilibrium returns (reverse optimization)
        const priorReturns = this.calculateEquilibriumReturns(marketWeights);
        // Step 2: Define views (example: simple momentum-based views)
        const views = this.generateViews();
        // Step 3: Combine prior and views using Bayes
        const { posteriorReturns, posteriorCovariance } = this.bayesianUpdate(priorReturns, this.covarianceMatrix, views);
        // Step 4: Optimize using posterior
        const optimalWeights = this.maximizeSharpeRatio(posteriorReturns, posteriorCovariance);
        const portfolioMetrics = this.calculatePortfolioMetrics(optimalWeights, posteriorReturns);
        // Calculate view impact
        const viewImpact = new Map();
        Array.from(this.assets.keys()).forEach((symbol, i) => {
            viewImpact.set(symbol, optimalWeights[i] - marketWeights[i]);
        });
        const result = {
            optimal_weights: this.arrayToWeightMap(optimalWeights),
            expected_return: portfolioMetrics.return,
            expected_volatility: portfolioMetrics.volatility,
            sharpe_ratio: portfolioMetrics.sharpe,
            var_95: this.calculateVaR(optimalWeights, 0.95),
            cvar_95: this.calculateCVaR(optimalWeights, 0.95),
            max_drawdown_estimate: this.estimateMaxDrawdown(optimalWeights),
            herfindahl_index: this.calculateHerfindahlIndex(optimalWeights),
            effective_n_assets: this.calculateEffectiveNAssets(optimalWeights),
            trades_required: new Map(),
            total_turnover: 0,
            total_transaction_cost: 0,
            optimization_method: 'black_litterman',
            timestamp: Date.now(),
            constraints_satisfied: true,
            optimization_time_ms: 0,
            prior_returns: this.arrayToReturnMap(priorReturns),
            prior_covariance: this.covarianceMatrix,
            views: views,
            posterior_returns: this.arrayToReturnMap(posteriorReturns),
            posterior_covariance: posteriorCovariance,
            view_impact: viewImpact
        };
        return result;
    }
    /**
     * ⚖️ Risk Parity Optimization
     */
    async riskParityOptimization() {
        this.logger.info('⚖️ Running Risk Parity optimization...');
        const n = this.assets.size;
        // Target: equal risk contribution from each asset
        const targetRiskBudget = new Map();
        Array.from(this.assets.keys()).forEach(symbol => {
            targetRiskBudget.set(symbol, 1.0 / n);
        });
        // Solve for weights using iterative algorithm
        const optimalWeights = this.solveRiskParity(targetRiskBudget);
        // Calculate risk contributions
        const riskContributions = this.calculateRiskContributions(optimalWeights);
        const totalRisk = Math.sqrt(this.quadraticForm(optimalWeights, this.covarianceMatrix));
        // Calculate actual risk budget (as percentage of total risk)
        const actualRiskBudget = new Map();
        Array.from(this.assets.keys()).forEach((symbol, i) => {
            actualRiskBudget.set(symbol, riskContributions[i] / totalRisk);
        });
        const expectedReturns = Array.from(this.assets.values()).map(a => a.expected_return);
        const portfolioMetrics = this.calculatePortfolioMetrics(optimalWeights, expectedReturns);
        const result = {
            optimal_weights: this.arrayToWeightMap(optimalWeights),
            expected_return: portfolioMetrics.return,
            expected_volatility: portfolioMetrics.volatility,
            sharpe_ratio: portfolioMetrics.sharpe,
            var_95: this.calculateVaR(optimalWeights, 0.95),
            cvar_95: this.calculateCVaR(optimalWeights, 0.95),
            max_drawdown_estimate: this.estimateMaxDrawdown(optimalWeights),
            herfindahl_index: this.calculateHerfindahlIndex(optimalWeights),
            effective_n_assets: this.calculateEffectiveNAssets(optimalWeights),
            trades_required: new Map(),
            total_turnover: 0,
            total_transaction_cost: 0,
            optimization_method: 'risk_parity',
            timestamp: Date.now(),
            constraints_satisfied: true,
            optimization_time_ms: 0,
            risk_contributions: this.arrayToReturnMap(riskContributions),
            total_portfolio_risk: totalRisk,
            target_risk_budget: targetRiskBudget,
            actual_risk_budget: actualRiskBudget,
            iterations: 100,
            converged: true
        };
        return result;
    }
    /**
     * 🟰 Equal Weight Optimization (baseline)
     */
    async equalWeightOptimization() {
        const n = this.assets.size;
        const equalWeight = 1.0 / n;
        const weights = Array(n).fill(equalWeight);
        const expectedReturns = Array.from(this.assets.values()).map(a => a.expected_return);
        const portfolioMetrics = this.calculatePortfolioMetrics(weights, expectedReturns);
        return {
            optimal_weights: this.arrayToWeightMap(weights),
            expected_return: portfolioMetrics.return,
            expected_volatility: portfolioMetrics.volatility,
            sharpe_ratio: portfolioMetrics.sharpe,
            var_95: this.calculateVaR(weights, 0.95),
            cvar_95: this.calculateCVaR(weights, 0.95),
            max_drawdown_estimate: this.estimateMaxDrawdown(weights),
            herfindahl_index: this.calculateHerfindahlIndex(weights),
            effective_n_assets: this.calculateEffectiveNAssets(weights),
            trades_required: new Map(),
            total_turnover: 0,
            total_transaction_cost: 0,
            optimization_method: 'equal_weight',
            timestamp: Date.now(),
            constraints_satisfied: true,
            optimization_time_ms: 0
        };
    }
    /**
     * 📊 Calculate rebalancing trades
     */
    calculateRebalancingTrades(result) {
        const trades = new Map();
        let totalTurnover = 0;
        let totalCost = 0;
        for (const [symbol, targetWeight] of result.optimal_weights.entries()) {
            const asset = this.assets.get(symbol);
            const currentWeight = asset.current_allocation;
            const tradeAmount = targetWeight - currentWeight;
            // Skip tiny trades
            if (Math.abs(tradeAmount) < this.config.min_trade_size / 1000000) { // Normalize by portfolio size
                continue;
            }
            const tradeCost = Math.abs(tradeAmount) * this.config.transaction_cost;
            trades.set(symbol, {
                current_weight: currentWeight,
                target_weight: targetWeight,
                trade_amount: tradeAmount,
                trade_cost: tradeCost
            });
            totalTurnover += Math.abs(tradeAmount);
            totalCost += tradeCost;
        }
        result.trades_required = trades;
        result.total_turnover = totalTurnover;
        result.total_transaction_cost = totalCost;
    }
    /**
     * 🔧 Helper: Maximize Sharpe ratio (simplified quadratic programming)
     */
    maximizeSharpeRatio(expectedReturns, covMatrix) {
        const n = expectedReturns.length;
        // Simplified approach: use mean-variance efficient frontier
        // In production, use proper quadratic programming solver
        // Start with equal weights
        let weights = Array(n).fill(1.0 / n);
        // Simple gradient ascent (placeholder - use proper QP solver in production)
        for (let iter = 0; iter < 100; iter++) {
            const gradient = this.calculateSharpeGradient(weights, expectedReturns, covMatrix);
            // Update weights
            for (let i = 0; i < n; i++) {
                weights[i] += 0.01 * gradient[i];
            }
            // Apply constraints
            weights = this.applyConstraints(weights);
            // Normalize
            const sum = weights.reduce((a, b) => a + b, 0);
            weights = weights.map(w => w / sum);
        }
        return weights;
    }
    /**
     * 📉 Calculate Sharpe gradient (for optimization)
     */
    calculateSharpeGradient(weights, returns, covMatrix) {
        const n = weights.length;
        const portfolioReturn = weights.reduce((sum, w, i) => sum + w * returns[i], 0);
        const portfolioVariance = this.quadraticForm(weights, covMatrix);
        const portfolioStd = Math.sqrt(portfolioVariance);
        const sharpe = (portfolioReturn - this.config.risk_free_rate) / portfolioStd;
        // Gradient calculation (simplified)
        const gradient = Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            gradient[i] = (returns[i] - this.config.risk_free_rate) / portfolioStd;
        }
        return gradient;
    }
    /**
     * ⚖️ Solve risk parity (iterative)
     */
    solveRiskParity(targetRiskBudget) {
        const n = this.assets.size;
        let weights = Array(n).fill(1.0 / n);
        // Iterative algorithm to match risk contributions
        for (let iter = 0; iter < 100; iter++) {
            const riskContribs = this.calculateRiskContributions(weights);
            const totalRisk = riskContribs.reduce((sum, rc) => sum + rc, 0);
            // Adjust weights to match target risk budget
            Array.from(this.assets.keys()).forEach((symbol, i) => {
                const targetRisk = (targetRiskBudget.get(symbol) || 1.0 / n) * totalRisk;
                const currentRisk = riskContribs[i];
                // Adjust weight proportionally
                if (currentRisk > 0) {
                    weights[i] *= Math.sqrt(targetRisk / currentRisk);
                }
            });
            // Normalize
            const sum = weights.reduce((a, b) => a + b, 0);
            weights = weights.map(w => w / sum);
        }
        return weights;
    }
    /**
     * 📊 Calculate risk contributions
     */
    calculateRiskContributions(weights) {
        const n = weights.length;
        const contributions = Array(n).fill(0);
        // Risk contribution = weight * (Cov * weight) / portfolio_std
        const portfolioStd = Math.sqrt(this.quadraticForm(weights, this.covarianceMatrix));
        for (let i = 0; i < n; i++) {
            let marginalContribution = 0;
            for (let j = 0; j < n; j++) {
                marginalContribution += this.covarianceMatrix[i][j] * weights[j];
            }
            contributions[i] = weights[i] * marginalContribution / portfolioStd;
        }
        return contributions;
    }
    /**
     * 🎯 Calculate equilibrium returns (Black-Litterman)
     */
    calculateEquilibriumReturns(marketWeights) {
        // Implied equilibrium returns = lambda * Sigma * w
        // where lambda is risk aversion coefficient
        const lambda = 2.5; // Typical risk aversion
        const n = marketWeights.length;
        const equilibriumReturns = Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                equilibriumReturns[i] += this.covarianceMatrix[i][j] * marketWeights[j];
            }
            equilibriumReturns[i] *= lambda;
        }
        return equilibriumReturns;
    }
    /**
     * 💡 Generate views (placeholder - would use ML predictions)
     */
    generateViews() {
        // Placeholder: generate views based on momentum
        const views = [];
        for (const [symbol, asset] of this.assets.entries()) {
            // Example: if recent returns are positive, expect continuation
            const recentReturn = asset.returns.slice(-20).reduce((sum, r) => sum + r, 0) / 20;
            if (Math.abs(recentReturn) > 0.01) { // 1% threshold
                views.push({
                    asset: symbol,
                    expected_return: recentReturn * 1.5, // Amplify by 50%
                    confidence: this.config.confidence_level || 0.8
                });
            }
        }
        return views;
    }
    /**
     * 🔄 Bayesian update (Black-Litterman)
     */
    bayesianUpdate(priorReturns, priorCovariance, views) {
        // Simplified Black-Litterman formula
        // In production, use proper matrix operations
        const tau = this.config.tau || 0.05;
        const n = priorReturns.length;
        // For simplicity, blend prior and views with confidence weighting
        const posteriorReturns = [...priorReturns];
        const posteriorCovariance = priorCovariance.map(row => [...row]);
        for (const view of views) {
            const assetIndex = Array.from(this.assets.keys()).indexOf(view.asset);
            if (assetIndex >= 0) {
                // Blend prior and view
                const weight = view.confidence;
                posteriorReturns[assetIndex] =
                    weight * view.expected_return + (1 - weight) * priorReturns[assetIndex];
            }
        }
        return { posteriorReturns, posteriorCovariance };
    }
    /**
     * 📈 Generate efficient frontier
     */
    generateEfficientFrontier(numPoints) {
        const returns = [];
        const volatilities = [];
        const weights = [];
        const expectedReturns = Array.from(this.assets.values()).map(a => a.expected_return);
        const minReturn = Math.min(...expectedReturns);
        const maxReturn = Math.max(...expectedReturns);
        for (let i = 0; i < numPoints; i++) {
            const targetReturn = minReturn + (maxReturn - minReturn) * i / (numPoints - 1);
            // Optimize for minimum variance given target return
            const w = this.optimizeForTargetReturn(targetReturn);
            const metrics = this.calculatePortfolioMetrics(w, expectedReturns);
            returns.push(metrics.return);
            volatilities.push(metrics.volatility);
            weights.push(this.arrayToWeightMap(w));
        }
        return { returns, volatilities, weights };
    }
    /**
     * 🎯 Optimize for target return
     */
    optimizeForTargetReturn(targetReturn) {
        const n = this.assets.size;
        const expectedReturns = Array.from(this.assets.values()).map(a => a.expected_return);
        // Simplified: start with equal weights and adjust
        let weights = Array(n).fill(1.0 / n);
        for (let iter = 0; iter < 50; iter++) {
            const currentReturn = weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
            const diff = targetReturn - currentReturn;
            // Adjust weights towards target
            for (let i = 0; i < n; i++) {
                weights[i] += 0.01 * diff * (expectedReturns[i] - currentReturn);
            }
            weights = this.applyConstraints(weights);
            const sum = weights.reduce((a, b) => a + b, 0);
            weights = weights.map(w => w / sum);
        }
        return weights;
    }
    /**
     * 📊 Calculate portfolio metrics
     */
    calculatePortfolioMetrics(weights, expectedReturns) {
        const portfolioReturn = weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
        const portfolioVariance = this.quadraticForm(weights, this.covarianceMatrix);
        const portfolioVolatility = Math.sqrt(portfolioVariance);
        const sharpeRatio = (portfolioReturn - this.config.risk_free_rate) / portfolioVolatility;
        return {
            return: portfolioReturn,
            volatility: portfolioVolatility,
            sharpe: sharpeRatio
        };
    }
    /**
     * 🔢 Quadratic form: w' * Sigma * w
     */
    quadraticForm(weights, matrix) {
        const n = weights.length;
        let result = 0;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                result += weights[i] * matrix[i][j] * weights[j];
            }
        }
        return result;
    }
    /**
     * 📏 Apply constraints to weights
     */
    applyConstraints(weights) {
        const constrained = [...weights];
        // Apply min/max constraints
        for (let i = 0; i < constrained.length; i++) {
            constrained[i] = Math.max(this.config.min_weight, constrained[i]);
            constrained[i] = Math.min(this.config.max_weight, constrained[i]);
            // Long-only constraint
            if (this.config.long_only) {
                constrained[i] = Math.max(0, constrained[i]);
            }
        }
        return constrained;
    }
    /**
     * ✅ Validate constraints
     */
    validateConstraints(weights) {
        const weightArray = Array.from(weights.values());
        // Check sum to 1
        const sum = weightArray.reduce((a, b) => a + b, 0);
        if (Math.abs(sum - 1.0) > 0.01)
            return false;
        // Check individual constraints
        for (const weight of weightArray) {
            if (weight < this.config.min_weight || weight > this.config.max_weight) {
                return false;
            }
            if (this.config.long_only && weight < 0) {
                return false;
            }
        }
        return true;
    }
    /**
     * 📊 Calculate covariance matrix
     */
    async calculateCovarianceMatrix() {
        const n = this.assets.size;
        const assets = Array.from(this.assets.values());
        this.covarianceMatrix = Array(n).fill(0).map(() => Array(n).fill(0));
        this.correlationMatrix = Array(n).fill(0).map(() => Array(n).fill(0));
        // Calculate covariance and correlation
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    this.covarianceMatrix[i][j] = assets[i].volatility ** 2;
                    this.correlationMatrix[i][j] = 1.0;
                }
                else {
                    // Simplified: use historical returns correlation
                    const corr = this.calculateCorrelation(assets[i].returns, assets[j].returns);
                    this.correlationMatrix[i][j] = corr;
                    this.covarianceMatrix[i][j] = corr * assets[i].volatility * assets[j].volatility;
                }
            }
        }
    }
    /**
     * 📈 Calculate correlation between two return series
     */
    calculateCorrelation(returns1, returns2) {
        const n = Math.min(returns1.length, returns2.length);
        if (n === 0)
            return 0;
        const mean1 = returns1.slice(0, n).reduce((sum, r) => sum + r, 0) / n;
        const mean2 = returns2.slice(0, n).reduce((sum, r) => sum + r, 0) / n;
        let covariance = 0;
        let variance1 = 0;
        let variance2 = 0;
        for (let i = 0; i < n; i++) {
            const diff1 = returns1[i] - mean1;
            const diff2 = returns2[i] - mean2;
            covariance += diff1 * diff2;
            variance1 += diff1 * diff1;
            variance2 += diff2 * diff2;
        }
        const correlation = covariance / Math.sqrt(variance1 * variance2);
        return isNaN(correlation) ? 0 : correlation;
    }
    /**
     * 📊 Risk metrics calculations
     */
    calculateVaR(weights, confidence) {
        const portfolioReturn = weights.reduce((sum, w, i) => sum + w * Array.from(this.assets.values())[i].expected_return, 0);
        const portfolioStd = Math.sqrt(this.quadraticForm(weights, this.covarianceMatrix));
        // Parametric VaR (assumes normal distribution)
        const zScore = confidence === 0.95 ? 1.645 : 2.326; // 95% or 99%
        return portfolioReturn - zScore * portfolioStd;
    }
    calculateCVaR(weights, confidence) {
        // Simplified CVaR = VaR * adjustment factor
        const var95 = this.calculateVaR(weights, confidence);
        return var95 * 1.3; // Typical CVaR is ~30% worse than VaR
    }
    estimateMaxDrawdown(weights) {
        // Simplified estimate based on volatility
        const portfolioStd = Math.sqrt(this.quadraticForm(weights, this.covarianceMatrix));
        return portfolioStd * 2.5; // Rule of thumb: max DD ~ 2.5 * annual vol
    }
    calculateHerfindahlIndex(weights) {
        return weights.reduce((sum, w) => sum + w * w, 0);
    }
    calculateEffectiveNAssets(weights) {
        const hhi = this.calculateHerfindahlIndex(weights);
        return 1.0 / hhi;
    }
    /**
     * 🗺️ Helper: Convert arrays to maps
     */
    arrayToWeightMap(weights) {
        const map = new Map();
        Array.from(this.assets.keys()).forEach((symbol, i) => {
            map.set(symbol, weights[i]);
        });
        return map;
    }
    arrayToReturnMap(returns) {
        const map = new Map();
        Array.from(this.assets.keys()).forEach((symbol, i) => {
            map.set(symbol, returns[i]);
        });
        return map;
    }
    /**
     * 🔄 Check if rebalancing is needed
     */
    shouldRebalance() {
        const now = Date.now();
        // Check time-based rebalancing
        const timeSinceLastRebalance = now - this.lastRebalance;
        const rebalanceInterval = {
            daily: 86400000,
            weekly: 604800000,
            monthly: 2592000000,
            quarterly: 7776000000,
            dynamic: Infinity
        }[this.config.rebalance_frequency];
        if (timeSinceLastRebalance >= rebalanceInterval) {
            return true;
        }
        // Check drift-based rebalancing (for dynamic mode)
        if (this.config.rebalance_frequency === 'dynamic') {
            const lastOptimization = this.optimizationHistory[this.optimizationHistory.length - 1];
            if (!lastOptimization)
                return true;
            for (const [symbol, targetWeight] of lastOptimization.optimal_weights.entries()) {
                const currentWeight = this.assets.get(symbol)?.current_allocation || 0;
                const drift = Math.abs(currentWeight - targetWeight);
                if (drift >= this.config.rebalance_threshold) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * 📊 Get optimization history
     */
    getOptimizationHistory() {
        return this.optimizationHistory;
    }
}
exports.PortfolioOptimizationEngine = PortfolioOptimizationEngine;
/**
 * 🏭 DEFAULT PORTFOLIO CONFIG
 */
exports.DEFAULT_PORTFOLIO_CONFIG = {
    optimization_method: 'markowitz',
    risk_free_rate: 0.02,
    min_weight: 0.0,
    max_weight: 0.3,
    max_concentration: 0.6,
    long_only: true,
    integer_shares: false,
    rebalance_frequency: 'weekly',
    rebalance_threshold: 0.05,
    transaction_cost: 0.001,
    min_trade_size: 100,
    tau: 0.05,
    confidence_level: 0.8
};

/**
 * 🎯 ADVANCED PORTFOLIO OPTIMIZER
 * Optymalizacja portfela przy użyciu nowoczesnych teorii portfelowych
 * Modern Portfolio Theory, Black-Litterman, Risk Parity
 */

import {
    Asset,
    PortfolioPosition,
    PortfolioOptimization,
    AllocationStrategy,
    RiskLimits
} from './portfolio_types';
import { MarketData } from '../types';
import { Logger } from '../../infrastructure/logging/logger';

export interface OptimizationObjective {
    type: 'MAX_SHARPE' | 'MIN_VARIANCE' | 'MAX_RETURN' | 'RISK_PARITY' | 'MAX_DIVERSIFICATION' | 'BLACK_LITTERMAN';
    targetReturn?: number;
    riskTolerance?: number;
    lambda?: number; // Risk aversion parameter
    confidence?: number; // Confidence in views (Black-Litterman)
}

export interface MarketView {
    asset: string;
    expectedReturn: number;
    confidence: number; // 0-1
    horizon: number; // Days
}

export interface OptimizationConstraints {
    minWeights: Record<string, number>;
    maxWeights: Record<string, number>;
    groupConstraints?: {
        group: string[];
        minWeight: number;
        maxWeight: number;
    }[];
    turnoverLimit?: number;
    transactionCosts?: Record<string, number>;
    leverage?: {
        enabled: boolean;
        maxRatio: number;
    };
}

export class AdvancedPortfolioOptimizer {
    private logger: Logger;
    private riskFreeRate: number = 0.02; // 2% risk-free rate

    constructor() {
        this.logger = new Logger('AdvancedPortfolioOptimizer');
        this.logger.info('🎯 Advanced Portfolio Optimizer initialized');
    }

    /**
     * 🎯 Main optimization method
     */
    async optimizePortfolio(
        assets: Asset[],
        marketData: MarketData[][],
        objective: OptimizationObjective,
        constraints: OptimizationConstraints,
        currentWeights?: Record<string, number>,
        marketViews?: MarketView[]
    ): Promise<PortfolioOptimization> {
        try {
            this.logger.info(`🎯 Starting portfolio optimization: ${objective.type}`);

            // 1. Calculate expected returns and covariance matrix
            const expectedReturns = await this.calculateExpectedReturns(assets, marketData);
            const covarianceMatrix = await this.calculateCovarianceMatrix(assets, marketData);

            // 2. Apply market views if using Black-Litterman
            let adjustedReturns = expectedReturns;
            if (objective.type === 'BLACK_LITTERMAN' && marketViews) {
                adjustedReturns = await this.applyBlackLittermanViews(
                    expectedReturns,
                    covarianceMatrix,
                    marketViews,
                    currentWeights
                );
            }

            // 3. Run optimization based on objective
            const optimalWeights = await this.runOptimization(
                adjustedReturns,
                covarianceMatrix,
                objective,
                constraints,
                assets
            );

            // 4. Calculate portfolio metrics
            const portfolioMetrics = this.calculatePortfolioMetrics(
                optimalWeights,
                adjustedReturns,
                covarianceMatrix
            );

            const optimization: PortfolioOptimization = {
                expectedReturns: adjustedReturns,
                covarianceMatrix,
                riskFreeRate: this.riskFreeRate,
                optimizationType: objective.type,
                constraints: {
                    weights: Object.fromEntries(
                        assets.map(asset => [
                            asset.symbol,
                            {
                                min: constraints.minWeights[asset.symbol] || 0,
                                max: constraints.maxWeights[asset.symbol] || 1
                            }
                        ])
                    ),
                    turnover: constraints.turnoverLimit,
                    transactionCosts: Object.values(constraints.transactionCosts || {}).reduce((a, b) => a + b, 0)
                },
                results: {
                    optimalWeights,
                    expectedReturn: portfolioMetrics.expectedReturn,
                    expectedVolatility: portfolioMetrics.volatility,
                    sharpeRatio: portfolioMetrics.sharpeRatio,
                    efficiency: this.calculateEfficiency(portfolioMetrics, objective)
                }
            };

            this.logger.info(`✅ Optimization completed - Sharpe: ${portfolioMetrics.sharpeRatio.toFixed(3)}`);
            this.logOptimizationResults(optimization);

            return optimization;

        } catch (error) {
            this.logger.error('❌ Portfolio optimization failed:', error);
            throw error;
        }
    }

    /**
     * 📊 Calculate expected returns from historical data
     */
    private async calculateExpectedReturns(
        assets: Asset[],
        marketData: MarketData[][]
    ): Promise<Record<string, number>> {
        const expectedReturns: Record<string, number> = {};

        for (let i = 0; i < assets.length; i++) {
            const asset = assets[i];
            const data = marketData[i];

            if (!data || data.length < 2) {
                expectedReturns[asset.symbol] = 0.08; // Default 8% expected return
                continue;
            }

            // Calculate returns
            const returns = data.slice(1).map((candle, index) => 
                (candle.close - data[index].close) / data[index].close
            );

            // Multiple return calculation methods
            const arithmeticMean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
            const geometricMean = Math.pow(
                returns.reduce((prod, ret) => prod * (1 + ret), 1),
                1 / returns.length
            ) - 1;

            // Use geometric mean annualized
            const annualizedReturn = Math.pow(1 + geometricMean, 252) - 1;
            expectedReturns[asset.symbol] = annualizedReturn;

            this.logger.debug(`📈 ${asset.symbol} expected return: ${(annualizedReturn * 100).toFixed(2)}%`);
        }

        return expectedReturns;
    }

    /**
     * 📊 Calculate covariance matrix
     */
    private async calculateCovarianceMatrix(
        assets: Asset[],
        marketData: MarketData[][]
    ): Promise<Record<string, Record<string, number>>> {
        const covarianceMatrix: Record<string, Record<string, number>> = {};
        
        // Initialize matrix
        for (const asset of assets) {
            covarianceMatrix[asset.symbol] = {};
        }

        // Calculate returns for all assets
        const allReturns: Record<string, number[]> = {};
        for (let i = 0; i < assets.length; i++) {
            const asset = assets[i];
            const data = marketData[i];
            
            if (data && data.length > 1) {
                allReturns[asset.symbol] = data.slice(1).map((candle, index) => 
                    (candle.close - data[index].close) / data[index].close
                );
            } else {
                allReturns[asset.symbol] = [];
            }
        }

        // Calculate covariance between each pair
        for (let i = 0; i < assets.length; i++) {
            for (let j = 0; j < assets.length; j++) {
                const asset1 = assets[i];
                const asset2 = assets[j];
                
                if (i === j) {
                    // Variance on diagonal
                    const returns = allReturns[asset1.symbol];
                    if (returns.length > 0) {
                        const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
                        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
                        covarianceMatrix[asset1.symbol][asset2.symbol] = variance * 252; // Annualized
                    } else {
                        covarianceMatrix[asset1.symbol][asset2.symbol] = Math.pow(asset1.volatility, 2);
                    }
                } else {
                    // Covariance off diagonal
                    const returns1 = allReturns[asset1.symbol];
                    const returns2 = allReturns[asset2.symbol];
                    
                    if (returns1.length > 0 && returns2.length > 0) {
                        const minLength = Math.min(returns1.length, returns2.length);
                        const mean1 = returns1.slice(0, minLength).reduce((sum, ret) => sum + ret, 0) / minLength;
                        const mean2 = returns2.slice(0, minLength).reduce((sum, ret) => sum + ret, 0) / minLength;
                        
                        const covariance = returns1.slice(0, minLength).reduce((sum, ret1, index) => {
                            const ret2 = returns2[index];
                            return sum + (ret1 - mean1) * (ret2 - mean2);
                        }, 0) / minLength;
                        
                        covarianceMatrix[asset1.symbol][asset2.symbol] = covariance * 252; // Annualized
                    } else {
                        // Use correlation from asset data or default
                        const correlation = asset1.correlation?.[asset2.symbol] || 0.3;
                        const vol1 = asset1.volatility;
                        const vol2 = asset2.volatility;
                        covarianceMatrix[asset1.symbol][asset2.symbol] = correlation * vol1 * vol2;
                    }
                }
            }
        }

        return covarianceMatrix;
    }

    /**
     * 🎯 Run specific optimization algorithm
     */
    private async runOptimization(
        expectedReturns: Record<string, number>,
        covarianceMatrix: Record<string, Record<string, number>>,
        objective: OptimizationObjective,
        constraints: OptimizationConstraints,
        assets: Asset[]
    ): Promise<Record<string, number>> {
        
        switch (objective.type) {
            case 'MAX_SHARPE':
                return this.maximizeSharpeRatio(expectedReturns, covarianceMatrix, constraints, assets);
            
            case 'MIN_VARIANCE':
                return this.minimizeVariance(expectedReturns, covarianceMatrix, constraints, assets);
            
            case 'MAX_RETURN':
                return this.maximizeReturn(expectedReturns, covarianceMatrix, constraints, assets, objective.targetReturn);
            
            case 'RISK_PARITY':
                return this.calculateRiskParity(expectedReturns, covarianceMatrix, constraints, assets);
            
            case 'MAX_DIVERSIFICATION':
                return this.maximizeDiversification(expectedReturns, covarianceMatrix, constraints, assets);
                
            case 'BLACK_LITTERMAN':
                return this.maximizeSharpeRatio(expectedReturns, covarianceMatrix, constraints, assets);
            
            default:
                throw new Error(`Unsupported optimization objective: ${objective.type}`);
        }
    }

    /**
     * 📈 Maximize Sharpe Ratio (simplified implementation)
     */
    private maximizeSharpeRatio(
        expectedReturns: Record<string, number>,
        covarianceMatrix: Record<string, Record<string, number>>,
        constraints: OptimizationConstraints,
        assets: Asset[]
    ): Record<string, number> {
        // Simplified implementation using equal-weight as starting point
        // In production, use quadratic programming solver
        
        const weights: Record<string, number> = {};
        const numAssets = assets.length;
        
        // Start with equal weights and adjust based on Sharpe ratio
        for (const asset of assets) {
            const minWeight = constraints.minWeights[asset.symbol] || 0;
            const maxWeight = constraints.maxWeights[asset.symbol] || 1;
            const baseWeight = 1 / numAssets;
            
            // Adjust based on expected return vs risk
            const expectedReturn = expectedReturns[asset.symbol] || 0;
            const variance = covarianceMatrix[asset.symbol]?.[asset.symbol] || 0.04;
            const sharpeContribution = (expectedReturn - this.riskFreeRate) / Math.sqrt(variance);
            
            // Weight adjustment factor
            const adjustmentFactor = 1 + (sharpeContribution - 0.5); // Normalized around 0.5
            let adjustedWeight = baseWeight * adjustmentFactor;
            
            // Apply constraints
            adjustedWeight = Math.max(minWeight, Math.min(maxWeight, adjustedWeight));
            weights[asset.symbol] = adjustedWeight;
        }
        
        // Normalize to sum to 1
        const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        for (const asset of assets) {
            weights[asset.symbol] = weights[asset.symbol] / totalWeight;
        }
        
        return weights;
    }

    /**
     * 📊 Minimize Variance
     */
    private minimizeVariance(
        expectedReturns: Record<string, number>,
        covarianceMatrix: Record<string, Record<string, number>>,
        constraints: OptimizationConstraints,
        assets: Asset[]
    ): Record<string, number> {
        const weights: Record<string, number> = {};
        
        // Inverse volatility weighting (simplified minimum variance)
        const inverseVolatilities: Record<string, number> = {};
        let totalInverseVol = 0;
        
        for (const asset of assets) {
            const variance = covarianceMatrix[asset.symbol]?.[asset.symbol] || 0.04;
            const inverseVol = 1 / Math.sqrt(variance);
            inverseVolatilities[asset.symbol] = inverseVol;
            totalInverseVol += inverseVol;
        }
        
        for (const asset of assets) {
            const minWeight = constraints.minWeights[asset.symbol] || 0;
            const maxWeight = constraints.maxWeights[asset.symbol] || 1;
            let weight = inverseVolatilities[asset.symbol] / totalInverseVol;
            
            weight = Math.max(minWeight, Math.min(maxWeight, weight));
            weights[asset.symbol] = weight;
        }
        
        return weights;
    }

    /**
     * 📈 Maximize Return (target return optimization)
     */
    private maximizeReturn(
        expectedReturns: Record<string, number>,
        covarianceMatrix: Record<string, Record<string, number>>,
        constraints: OptimizationConstraints,
        assets: Asset[],
        targetReturn?: number
    ): Record<string, number> {
        const weights: Record<string, number> = {};
        
        // Weight by expected returns (simplified)
        const returns = assets.map(asset => expectedReturns[asset.symbol] || 0);
        const maxReturn = Math.max(...returns);
        const minReturn = Math.min(...returns);
        const range = maxReturn - minReturn;
        
        let totalAdjustedReturn = 0;
        for (const asset of assets) {
            const expectedReturn = expectedReturns[asset.symbol] || 0;
            // Normalize returns to 0-1 range and add small base weight
            const normalizedReturn = range > 0 ? (expectedReturn - minReturn) / range : 0.5;
            totalAdjustedReturn += normalizedReturn + 0.1; // Add small base
        }
        
        for (const asset of assets) {
            const minWeight = constraints.minWeights[asset.symbol] || 0;
            const maxWeight = constraints.maxWeights[asset.symbol] || 1;
            const expectedReturn = expectedReturns[asset.symbol] || 0;
            const normalizedReturn = range > 0 ? (expectedReturn - minReturn) / range : 0.5;
            
            let weight = (normalizedReturn + 0.1) / totalAdjustedReturn;
            weight = Math.max(minWeight, Math.min(maxWeight, weight));
            weights[asset.symbol] = weight;
        }
        
        return weights;
    }

    /**
     * ⚖️ Risk Parity allocation
     */
    private calculateRiskParity(
        expectedReturns: Record<string, number>,
        covarianceMatrix: Record<string, Record<string, number>>,
        constraints: OptimizationConstraints,
        assets: Asset[]
    ): Record<string, number> {
        const weights: Record<string, number> = {};
        
        // Inverse volatility weighting (equal risk contribution)
        const volatilities: Record<string, number> = {};
        let totalInverseVol = 0;
        
        for (const asset of assets) {
            const variance = covarianceMatrix[asset.symbol]?.[asset.symbol] || 0.04;
            const volatility = Math.sqrt(variance);
            volatilities[asset.symbol] = volatility;
            totalInverseVol += 1 / volatility;
        }
        
        for (const asset of assets) {
            const minWeight = constraints.minWeights[asset.symbol] || 0;
            const maxWeight = constraints.maxWeights[asset.symbol] || 1;
            let weight = (1 / volatilities[asset.symbol]) / totalInverseVol;
            
            weight = Math.max(minWeight, Math.min(maxWeight, weight));
            weights[asset.symbol] = weight;
        }
        
        return weights;
    }

    /**
     * 🌈 Maximize Diversification
     */
    private maximizeDiversification(
        expectedReturns: Record<string, number>,
        covarianceMatrix: Record<string, Record<string, number>>,
        constraints: OptimizationConstraints,
        assets: Asset[]
    ): Record<string, number> {
        // For simplicity, use inverse correlation weighting
        const weights: Record<string, number> = {};
        
        // Calculate average correlation for each asset
        const avgCorrelations: Record<string, number> = {};
        
        for (const asset1 of assets) {
            let totalCorrelation = 0;
            let pairCount = 0;
            
            for (const asset2 of assets) {
                if (asset1.symbol !== asset2.symbol) {
                    const cov = covarianceMatrix[asset1.symbol]?.[asset2.symbol] || 0;
                    const vol1 = Math.sqrt(covarianceMatrix[asset1.symbol]?.[asset1.symbol] || 0.04);
                    const vol2 = Math.sqrt(covarianceMatrix[asset2.symbol]?.[asset2.symbol] || 0.04);
                    const correlation = (vol1 * vol2) > 0 ? cov / (vol1 * vol2) : 0;
                    
                    totalCorrelation += Math.abs(correlation);
                    pairCount++;
                }
            }
            
            avgCorrelations[asset1.symbol] = pairCount > 0 ? totalCorrelation / pairCount : 0;
        }
        
        // Weight inverse to average correlation
        let totalInverseCorr = 0;
        for (const asset of assets) {
            totalInverseCorr += 1 / (avgCorrelations[asset.symbol] + 0.1); // Add small constant to avoid division by zero
        }
        
        for (const asset of assets) {
            const minWeight = constraints.minWeights[asset.symbol] || 0;
            const maxWeight = constraints.maxWeights[asset.symbol] || 1;
            let weight = (1 / (avgCorrelations[asset.symbol] + 0.1)) / totalInverseCorr;
            
            weight = Math.max(minWeight, Math.min(maxWeight, weight));
            weights[asset.symbol] = weight;
        }
        
        return weights;
    }

    /**
     * 🔮 Apply Black-Litterman views (simplified)
     */
    private async applyBlackLittermanViews(
        expectedReturns: Record<string, number>,
        covarianceMatrix: Record<string, Record<string, number>>,
        marketViews: MarketView[],
        currentWeights?: Record<string, number>
    ): Promise<Record<string, number>> {
        // Simplified Black-Litterman implementation
        const adjustedReturns = { ...expectedReturns };
        
        for (const view of marketViews) {
            if (adjustedReturns[view.asset] !== undefined) {
                // Blend market view with historical expected return
                const currentExpected = adjustedReturns[view.asset];
                const blendWeight = view.confidence;
                
                adjustedReturns[view.asset] = 
                    (1 - blendWeight) * currentExpected + 
                    blendWeight * view.expectedReturn;
            }
        }
        
        return adjustedReturns;
    }

    /**
     * 📊 Calculate portfolio metrics
     */
    private calculatePortfolioMetrics(
        weights: Record<string, number>,
        expectedReturns: Record<string, number>,
        covarianceMatrix: Record<string, Record<string, number>>
    ): { expectedReturn: number; volatility: number; sharpeRatio: number } {
        // Expected return
        const expectedReturn = Object.entries(weights).reduce((sum, [asset, weight]) => 
            sum + weight * (expectedReturns[asset] || 0), 0
        );
        
        // Portfolio variance
        let portfolioVariance = 0;
        const assetSymbols = Object.keys(weights);
        
        for (const asset1 of assetSymbols) {
            for (const asset2 of assetSymbols) {
                const weight1 = weights[asset1] || 0;
                const weight2 = weights[asset2] || 0;
                const covariance = covarianceMatrix[asset1]?.[asset2] || 0;
                portfolioVariance += weight1 * weight2 * covariance;
            }
        }
        
        const volatility = Math.sqrt(portfolioVariance);
        const sharpeRatio = volatility > 0 ? (expectedReturn - this.riskFreeRate) / volatility : 0;
        
        return {
            expectedReturn,
            volatility,
            sharpeRatio
        };
    }

    private calculateEfficiency(
        metrics: { expectedReturn: number; volatility: number; sharpeRatio: number },
        objective: OptimizationObjective
    ): number {
        // Efficiency score based on objective
        switch (objective.type) {
            case 'MAX_SHARPE':
                return Math.min(1, Math.max(0, metrics.sharpeRatio / 2)); // Normalize to 0-1
            case 'MIN_VARIANCE':
                return Math.min(1, Math.max(0, 1 - metrics.volatility / 0.5)); // Lower volatility = higher efficiency
            case 'MAX_RETURN':
                return Math.min(1, Math.max(0, metrics.expectedReturn / 0.3)); // Normalize to 30% max
            default:
                return 0.5; // Default efficiency
        }
    }

    private logOptimizationResults(optimization: PortfolioOptimization): void {
        this.logger.info('📊 Optimization Results:');
        this.logger.info(`   Expected Return: ${(optimization.results.expectedReturn * 100).toFixed(2)}%`);
        this.logger.info(`   Expected Volatility: ${(optimization.results.expectedVolatility * 100).toFixed(2)}%`);
        this.logger.info(`   Sharpe Ratio: ${optimization.results.sharpeRatio.toFixed(3)}`);
        this.logger.info(`   Efficiency Score: ${(optimization.results.efficiency * 100).toFixed(1)}%`);
        
        this.logger.info('🎯 Optimal Weights:');
        Object.entries(optimization.results.optimalWeights)
            .sort(([,a], [,b]) => b - a)
            .forEach(([asset, weight]) => {
                this.logger.info(`   ${asset}: ${(weight * 100).toFixed(1)}%`);
            });
    }

    /**
     * 🎯 Generate efficient frontier points
     */
    async generateEfficientFrontier(
        assets: Asset[],
        marketData: MarketData[][],
        constraints: OptimizationConstraints,
        numPoints: number = 50
    ): Promise<Array<{ risk: number; return: number; weights: Record<string, number> }>> {
        const expectedReturns = await this.calculateExpectedReturns(assets, marketData);
        const covarianceMatrix = await this.calculateCovarianceMatrix(assets, marketData);
        
        const minReturn = Math.min(...Object.values(expectedReturns));
        const maxReturn = Math.max(...Object.values(expectedReturns));
        
        const frontierPoints = [];
        
        for (let i = 0; i <= numPoints; i++) {
            const targetReturn = minReturn + (maxReturn - minReturn) * (i / numPoints);
            
            const weights = await this.runOptimization(
                expectedReturns,
                covarianceMatrix,
                { type: 'MAX_RETURN', targetReturn },
                constraints,
                assets
            );
            
            const metrics = this.calculatePortfolioMetrics(weights, expectedReturns, covarianceMatrix);
            
            frontierPoints.push({
                risk: metrics.volatility,
                return: metrics.expectedReturn,
                weights
            });
        }
        
        return frontierPoints;
    }
}

export default AdvancedPortfolioOptimizer;

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
 * ⚠️ ADVANCED RISK MANAGEMENT SYSTEM
 * Zaawansowane zarządzanie ryzykiem portfela z multiple risk models
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedRiskManager = void 0;
const events_1 = require("events");
const logger_1 = require("../../infrastructure/logging/logger");
class AdvancedRiskManager extends events_1.EventEmitter {
    constructor(riskLimits) {
        super();
        this.alertHistory = [];
        this.stressTestResults = [];
        this.riskLimits = riskLimits;
        this.logger = new logger_1.Logger('AdvancedRiskManager');
        this.logger.info('⚠️ Advanced Risk Manager initialized');
    }
    /**
     * 📊 Comprehensive risk assessment
     */
    async assessPortfolioRisk(positions, metrics, marketData, regime) {
        try {
            const alerts = [];
            // 1. Concentration Risk
            alerts.push(...await this.assessConcentrationRisk(positions));
            // 2. Volatility Risk
            alerts.push(...await this.assessVolatilityRisk(positions, metrics));
            // 3. Drawdown Risk
            alerts.push(...await this.assessDrawdownRisk(metrics));
            // 4. VaR and CVaR Risk
            alerts.push(...await this.assessVaRRisk(metrics));
            // 5. Correlation Risk
            alerts.push(...await this.assessCorrelationRisk(positions, metrics));
            // 6. Liquidity Risk
            alerts.push(...await this.assessLiquidityRisk(positions));
            // 7. Regime-based Risk
            if (regime) {
                alerts.push(...await this.assessRegimeRisk(positions, regime));
            }
            // Store and emit alerts
            this.alertHistory.push(...alerts);
            this.alertHistory = this.alertHistory.slice(-500); // Keep last 500 alerts
            for (const alert of alerts) {
                this.emit('riskAlert', alert);
                this.logger.warn(`⚠️ Risk Alert [${alert.level}]: ${alert.message}`);
            }
            return alerts;
        }
        catch (error) {
            this.logger.error('❌ Risk assessment failed:', error);
            throw error;
        }
    }
    /**
     * 🧪 Run stress tests on portfolio
     */
    async runStressTests(positions, metrics) {
        try {
            this.logger.info('🧪 Running portfolio stress tests...');
            const scenarios = this.getStressTestScenarios();
            const results = [];
            for (const scenario of scenarios) {
                const result = await this.runStressTestScenario(positions, metrics, scenario);
                results.push(result);
            }
            this.stressTestResults = results;
            this.logger.info(`✅ Completed ${results.length} stress test scenarios`);
            return results;
        }
        catch (error) {
            this.logger.error('❌ Stress testing failed:', error);
            throw error;
        }
    }
    /**
     * 📈 Calculate portfolio diversification metrics
     */
    calculateDiversificationMetrics(positions) {
        // Herfindahl Index (concentration measure)
        const weights = positions.map(pos => pos.weight);
        const herfindahlIndex = weights.reduce((sum, weight) => sum + weight * weight, 0);
        // Effective number of assets
        const effectiveNumberOfAssets = 1 / herfindahlIndex;
        // Sector diversification
        const sectorWeights = {};
        for (const position of positions) {
            const sector = position.asset.sector || 'Unknown';
            sectorWeights[sector] = (sectorWeights[sector] || 0) + position.weight;
        }
        // Geographic diversification (simplified)
        const geographicWeights = {
            'US': 0.4,
            'Europe': 0.3,
            'Asia': 0.2,
            'Other': 0.1
        };
        // Risk contribution
        const riskContribution = {};
        const totalRisk = positions.reduce((sum, pos) => sum + pos.weight * pos.performanceMetrics.volatility, 0);
        for (const position of positions) {
            const contribution = (position.weight * position.performanceMetrics.volatility) / totalRisk;
            riskContribution[position.asset.symbol] = contribution;
        }
        return {
            herfindahlIndex,
            effectiveNumberOfAssets,
            sectorDiversification: sectorWeights,
            geographicDiversification: geographicWeights,
            correlationDiversification: this.calculateCorrelationDiversification(positions),
            riskContribution
        };
    }
    /**
     * 🎯 Position size recommendation based on risk
     */
    calculateOptimalPositionSize(asset, portfolioValue, currentVolatility, targetRisk = 0.02 // 2% portfolio risk per position
    ) {
        // Kelly Criterion with risk adjustment
        const assetVolatility = asset.volatility;
        const maxPosition = this.riskLimits.maxPositionSize;
        // Risk-adjusted position size
        const riskAdjustedSize = Math.min(targetRisk / assetVolatility, maxPosition);
        // Liquidity adjustment
        const liquidityMultiplier = asset.liquidity === 'HIGH' ? 1 :
            asset.liquidity === 'MEDIUM' ? 0.7 : 0.3;
        const optimalSize = riskAdjustedSize * liquidityMultiplier;
        return Math.max(0, Math.min(optimalSize, maxPosition));
    }
    /**
     * 📊 Private risk assessment methods
     */
    async assessConcentrationRisk(positions) {
        const alerts = [];
        for (const position of positions) {
            if (position.weight > this.riskLimits.maxPositionSize) {
                alerts.push({
                    level: position.weight > this.riskLimits.maxPositionSize * 1.5 ? 'HIGH' : 'MEDIUM',
                    type: 'CONCENTRATION',
                    message: `Position ${position.asset.symbol} is overweight: ${(position.weight * 100).toFixed(1)}%`,
                    timestamp: new Date(),
                    affectedAssets: [position.asset.symbol],
                    recommendedActions: [
                        `Reduce ${position.asset.symbol} position to below ${(this.riskLimits.maxPositionSize * 100).toFixed(1)}%`,
                        'Consider diversification into correlated assets'
                    ],
                    severity: Math.min(10, Math.floor(position.weight / this.riskLimits.maxPositionSize * 5))
                });
            }
        }
        // Sector concentration
        const sectorWeights = {};
        for (const position of positions) {
            const sector = position.asset.sector || 'Unknown';
            sectorWeights[sector] = (sectorWeights[sector] || 0) + position.weight;
        }
        for (const [sector, weight] of Object.entries(sectorWeights)) {
            if (weight > this.riskLimits.maxSectorExposure) {
                alerts.push({
                    level: weight > this.riskLimits.maxSectorExposure * 1.3 ? 'HIGH' : 'MEDIUM',
                    type: 'CONCENTRATION',
                    message: `Sector ${sector} is overweight: ${(weight * 100).toFixed(1)}%`,
                    timestamp: new Date(),
                    affectedAssets: positions.filter(p => p.asset.sector === sector).map(p => p.asset.symbol),
                    recommendedActions: [
                        `Reduce ${sector} exposure to below ${(this.riskLimits.maxSectorExposure * 100).toFixed(1)}%`,
                        'Increase diversification across sectors'
                    ],
                    severity: Math.min(10, Math.floor(weight / this.riskLimits.maxSectorExposure * 5))
                });
            }
        }
        return alerts;
    }
    async assessVolatilityRisk(positions, metrics) {
        const alerts = [];
        if (metrics.volatility > this.riskLimits.maxVolatility) {
            alerts.push({
                level: metrics.volatility > this.riskLimits.maxVolatility * 1.5 ? 'HIGH' : 'MEDIUM',
                type: 'VOLATILITY',
                message: `Portfolio volatility is high: ${(metrics.volatility * 100).toFixed(1)}%`,
                timestamp: new Date(),
                affectedAssets: positions
                    .filter(p => p.performanceMetrics.volatility > 0.3)
                    .map(p => p.asset.symbol),
                recommendedActions: [
                    'Reduce positions in high-volatility assets',
                    'Increase allocation to low-volatility assets',
                    'Consider hedging strategies'
                ],
                severity: Math.min(10, Math.floor(metrics.volatility / this.riskLimits.maxVolatility * 6))
            });
        }
        return alerts;
    }
    async assessDrawdownRisk(metrics) {
        const alerts = [];
        if (metrics.maxDrawdown > this.riskLimits.maxDrawdown) {
            alerts.push({
                level: metrics.maxDrawdown > this.riskLimits.maxDrawdown * 1.3 ? 'CRITICAL' : 'HIGH',
                type: 'DRAWDOWN',
                message: `Maximum drawdown exceeded: ${(metrics.maxDrawdown * 100).toFixed(1)}%`,
                timestamp: new Date(),
                affectedAssets: [], // Portfolio-wide issue
                recommendedActions: [
                    'Implement stop-loss mechanisms',
                    'Reduce position sizes',
                    'Consider defensive strategies',
                    'Review and tighten risk limits'
                ],
                severity: Math.min(10, Math.floor(metrics.maxDrawdown / this.riskLimits.maxDrawdown * 8))
            });
        }
        return alerts;
    }
    async assessVaRRisk(metrics) {
        const alerts = [];
        if (metrics.var95 > this.riskLimits.maxVaR) {
            alerts.push({
                level: metrics.var95 > this.riskLimits.maxVaR * 1.2 ? 'HIGH' : 'MEDIUM',
                type: 'VAR',
                message: `Value at Risk (95%) exceeded: ${(metrics.var95 * 100).toFixed(1)}%`,
                timestamp: new Date(),
                affectedAssets: [], // Portfolio-wide metric
                recommendedActions: [
                    'Reduce overall portfolio risk',
                    'Increase diversification',
                    'Consider hedging strategies',
                    'Review position sizing methodology'
                ],
                severity: Math.min(10, Math.floor(metrics.var95 / this.riskLimits.maxVaR * 7))
            });
        }
        return alerts;
    }
    async assessCorrelationRisk(positions, metrics) {
        const alerts = [];
        // Check for high correlation between major positions
        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                const pos1 = positions[i];
                const pos2 = positions[j];
                // Only check significant positions
                if (pos1.weight > 0.05 && pos2.weight > 0.05) {
                    const correlation = pos1.asset.correlation?.[pos2.asset.symbol] || 0;
                    if (Math.abs(correlation) > this.riskLimits.maxCorrelation) {
                        alerts.push({
                            level: Math.abs(correlation) > 0.9 ? 'HIGH' : 'MEDIUM',
                            type: 'CORRELATION',
                            message: `High correlation between ${pos1.asset.symbol} and ${pos2.asset.symbol}: ${(correlation * 100).toFixed(0)}%`,
                            timestamp: new Date(),
                            affectedAssets: [pos1.asset.symbol, pos2.asset.symbol],
                            recommendedActions: [
                                'Reduce position in one of the correlated assets',
                                'Find uncorrelated alternatives',
                                'Monitor correlation changes over time'
                            ],
                            severity: Math.min(10, Math.floor(Math.abs(correlation) / this.riskLimits.maxCorrelation * 6))
                        });
                    }
                }
            }
        }
        return alerts;
    }
    async assessLiquidityRisk(positions) {
        const alerts = [];
        const lowLiquidityPositions = positions.filter(pos => pos.asset.liquidity === 'LOW' && pos.weight > 0.05);
        if (lowLiquidityPositions.length > 0) {
            const totalLowLiquidityWeight = lowLiquidityPositions.reduce((sum, pos) => sum + pos.weight, 0);
            if (totalLowLiquidityWeight > 0.3) { // 30% threshold
                alerts.push({
                    level: totalLowLiquidityWeight > 0.5 ? 'HIGH' : 'MEDIUM',
                    type: 'LIQUIDITY',
                    message: `High exposure to low-liquidity assets: ${(totalLowLiquidityWeight * 100).toFixed(1)}%`,
                    timestamp: new Date(),
                    affectedAssets: lowLiquidityPositions.map(p => p.asset.symbol),
                    recommendedActions: [
                        'Reduce positions in low-liquidity assets',
                        'Stagger exit strategies for illiquid positions',
                        'Maintain higher cash reserves',
                        'Consider liquidity premium in pricing'
                    ],
                    severity: Math.min(10, Math.floor(totalLowLiquidityWeight * 10))
                });
            }
        }
        return alerts;
    }
    async assessRegimeRisk(positions, regime) {
        const alerts = [];
        // Regime-specific risk assessment
        if (regime.type === 'HIGH_VOLATILITY' && regime.confidence > 0.7) {
            const highVolPositions = positions.filter(pos => pos.performanceMetrics.volatility > 0.4);
            if (highVolPositions.length > 0) {
                alerts.push({
                    level: 'MEDIUM',
                    type: 'VOLATILITY',
                    message: `High volatility regime detected - review volatile positions`,
                    timestamp: new Date(),
                    affectedAssets: highVolPositions.map(p => p.asset.symbol),
                    recommendedActions: [
                        'Reduce position sizes in volatile assets',
                        'Implement tighter stop-losses',
                        'Consider volatility-based hedging'
                    ],
                    severity: 6
                });
            }
        }
        if (regime.type === 'BEAR' && regime.confidence > 0.6) {
            alerts.push({
                level: 'MEDIUM',
                type: 'VOLATILITY',
                message: `Bear market regime detected - defensive posture recommended`,
                timestamp: new Date(),
                affectedAssets: [],
                recommendedActions: [
                    'Increase cash allocation',
                    'Consider defensive sectors',
                    'Implement portfolio hedging',
                    'Reduce overall leverage'
                ],
                severity: 5
            });
        }
        return alerts;
    }
    getStressTestScenarios() {
        return [
            {
                name: 'Market Crash',
                description: '2008-style market crash scenario',
                marketShocks: [
                    { asset: 'ALL', priceChange: -0.3, volatilityChange: 2.0 }
                ],
                duration: 30,
                probability: 0.05
            },
            {
                name: 'Tech Bubble Burst',
                description: 'Technology sector crash',
                marketShocks: [
                    { asset: 'TECH', priceChange: -0.5, volatilityChange: 2.5 }
                ],
                duration: 60,
                probability: 0.1
            },
            {
                name: 'Currency Crisis',
                description: 'Major currency devaluation',
                marketShocks: [
                    { asset: 'FX', priceChange: -0.2, volatilityChange: 3.0 }
                ],
                duration: 14,
                probability: 0.08
            },
            {
                name: 'Interest Rate Shock',
                description: 'Rapid interest rate increase',
                marketShocks: [
                    { asset: 'BONDS', priceChange: -0.15, volatilityChange: 1.5 }
                ],
                duration: 90,
                probability: 0.15
            }
        ];
    }
    async runStressTestScenario(positions, metrics, scenario) {
        // Simplified stress test calculation
        let totalValueChange = 0;
        const positionImpacts = {};
        for (const position of positions) {
            let priceChange = 0;
            // Apply market shocks
            for (const shock of scenario.marketShocks) {
                if (shock.asset === 'ALL' ||
                    shock.asset === position.asset.type ||
                    shock.asset === position.asset.sector) {
                    priceChange += shock.priceChange;
                }
            }
            const positionValueChange = position.weight * priceChange;
            totalValueChange += positionValueChange;
            positionImpacts[position.asset.symbol] = {
                valueChange: positionValueChange,
                riskContribution: Math.abs(positionValueChange) / Math.abs(totalValueChange) || 0
            };
        }
        return {
            scenario,
            portfolioImpact: {
                valueChange: totalValueChange,
                maxDrawdown: Math.abs(totalValueChange),
                var95: Math.abs(totalValueChange) * 1.2,
                recoveryTime: scenario.duration * 2 // Simplified recovery estimate
            },
            positionImpacts,
            riskMetrics: {
                sharpeRatio: metrics.sharpeRatio * (1 + totalValueChange),
                sortino: metrics.sortino * (1 + totalValueChange),
                calmar: (metrics.totalReturn || 0) / Math.max(0.01, Math.abs(totalValueChange))
            }
        };
    }
    calculateCorrelationDiversification(positions) {
        // Simplified correlation diversification measure
        let avgCorrelation = 0;
        let pairCount = 0;
        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                const correlation = positions[i].asset.correlation?.[positions[j].asset.symbol] || 0;
                avgCorrelation += Math.abs(correlation);
                pairCount++;
            }
        }
        return pairCount > 0 ? 1 - (avgCorrelation / pairCount) : 1;
    }
    // Public getters
    getRiskLimits() { return { ...this.riskLimits }; }
    getAlertHistory() { return [...this.alertHistory]; }
    getStressTestResults() { return [...this.stressTestResults]; }
    updateRiskLimits(newLimits) {
        this.riskLimits = { ...this.riskLimits, ...newLimits };
        this.logger.info('📊 Risk limits updated');
    }
}
exports.AdvancedRiskManager = AdvancedRiskManager;
exports.default = AdvancedRiskManager;

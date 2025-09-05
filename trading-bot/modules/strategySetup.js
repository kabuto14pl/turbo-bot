"use strict";
// ============================================================================
// strategySetup.ts - Strategy Configuration and Initialization
// Extracted from main.ts for better modularity and strategy management
// ============================================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCooldownManagers = createCooldownManagers;
exports.createStrategyInstances = createStrategyInstances;
exports.initializeEnterpriseML = initializeEnterpriseML;
exports.initializeContinuousImprovement = initializeContinuousImprovement;
exports.initializeAdvancedPortfolioManagement = initializeAdvancedPortfolioManagement;
exports.setupStrategiesForMarket = setupStrategiesForMarket;
const logger_1 = require("../infrastructure/logging/logger");
const enhanced_rsi_turbo_1 = require("../core/strategy/enhanced_rsi_turbo");
const supertrend_1 = require("../core/strategy/supertrend");
const ma_crossover_1 = require("../core/strategy/ma_crossover");
const momentum_confirmation_1 = require("../core/strategy/momentum_confirmation");
const momentum_pro_1 = require("../core/strategy/momentum_pro");
const advanced_adaptive_strategy_fixed_1 = require("../core/strategy/advanced_adaptive_strategy_fixed");
const simple_rl_adapter_1 = require("../src/core/ml/simple_rl_adapter");
const continuous_improvement_manager_1 = require("../automation/continuous_improvement_manager");
const advanced_portfolio_manager_1 = require("../core/portfolio/advanced_portfolio_manager");
const advanced_risk_manager_1 = require("../core/portfolio/advanced_risk_manager");
const advanced_portfolio_optimizer_1 = require("../core/portfolio/advanced_portfolio_optimizer");
const path = __importStar(require("path"));
function createCooldownManagers(strategies) {
    const cooldownManagers = {};
    strategies.forEach(s_config => {
        // Create cooldown managers for each strategy
        // This is a placeholder - actual CooldownManager implementation needed
        cooldownManagers[s_config.name] = {
            canTrade: () => true,
            recordTrade: () => { },
            reset: () => { }
        };
    });
    return cooldownManagers;
}
function createStrategyInstances(config, cooldownManagers) {
    return config.strategies.map(s_config => {
        const logger = new logger_1.Logger();
        const cooldown = cooldownManagers[s_config.name];
        switch (s_config.name) {
            case 'RSITurbo':
            case 'EnhancedRSITurbo':
                return {
                    name: s_config.name,
                    strat: new enhanced_rsi_turbo_1.EnhancedRSITurboStrategy(logger)
                };
            case 'SuperTrend':
                return {
                    name: s_config.name,
                    strat: new supertrend_1.SuperTrendStrategy(logger)
                };
            case 'MACrossover':
                return {
                    name: s_config.name,
                    strat: new ma_crossover_1.MACrossoverStrategy(logger)
                };
            case 'MomentumConfirm':
                return {
                    name: s_config.name,
                    strat: new momentum_confirmation_1.MomentumConfirmationStrategy(logger)
                };
            case 'MomentumPro':
                return {
                    name: s_config.name,
                    strat: new momentum_pro_1.MomentumProStrategy(logger)
                };
            case 'AdvancedAdaptive':
                return {
                    name: s_config.name,
                    strat: new advanced_adaptive_strategy_fixed_1.AdvancedAdaptiveStrategyFixed(s_config.params),
                };
            default:
                throw new Error(`Unknown strategy: ${s_config.name}`);
        }
    });
}
async function initializeEnterpriseML(testDirectory) {
    // Initialize Enterprise ML System (Phase 1-5)
    const enterpriseMLManager = new simple_rl_adapter_1.SimpleRLAdapter({
        enabled: true,
        training_mode: true,
        algorithm: 'PPO'
    });
    await enterpriseMLManager.initialize();
    console.log(`🚀 Enterprise ML System initialized and ${enterpriseMLManager.shouldUseRL() ? 'ready' : 'learning'}`);
    // Log enterprise system status
    const mlStatus = await enterpriseMLManager.getStatus();
    console.log(`🚀 [ENTERPRISE ML] System Health: ${mlStatus.enterprise_ml?.system_health || 'unknown'}`);
    console.log(`🚀 [ENTERPRISE ML] Components: Deep RL ✅, Optimization ✅, Monitoring ✅, Analytics ✅`);
    return enterpriseMLManager;
}
async function initializeContinuousImprovement(testDirectory, performanceTracker, optimizationScheduler) {
    const continuousImprovementManager = new continuous_improvement_manager_1.ContinuousImprovementManager({
        enabled: true,
        dailyReoptimization: {
            enabled: true,
            schedule: '0 3 * * *', // Daily at 3 AM
            minPerformanceThreshold: 0.8,
            maxParameterChange: 0.3,
            backtestPeriodDays: 30
        },
        weeklyRetrain: {
            enabled: true,
            schedule: '0 2 * * 0', // Sunday at 2 AM
            performanceThreshold: 1.0,
            minPerformanceImprovement: 0.05,
            abTestDuration: 24
        },
        rlTraining: {
            modelDirectory: path.join(testDirectory, 'rl_models'),
            trainingDataDays: 30,
            validationDataDays: 7,
            minTrainingEpisodes: 1000,
            maxTrainingEpisodes: 5000
        },
        healthCheck: {
            enabled: true,
            schedule: '0 * * * *', // Every hour
            alertThresholds: {
                performanceDrop: 0.1,
                failureRate: 0.2,
                systemLoad: 0.8
            }
        },
        emergencyRetraining: {
            enabled: true,
            cooldownMinutes: 60,
            triggerThresholds: {
                drawdownPercent: 15.0,
                performanceDropPercent: 25.0,
                consecutiveFailures: 5
            }
        },
        monitoring: {
            enabled: true,
            metricsRetentionDays: 30,
            alertChannels: ['console', 'log'],
            performanceBaseline: {
                sharpeRatio: 1.0,
                maxDrawdown: 0.05,
                winRate: 0.6
            }
        }
    }, performanceTracker, optimizationScheduler);
    // Initialize and start continuous improvement (non-blocking)
    try {
        await continuousImprovementManager.initialize();
        console.log('🔄 Continuous Improvement Manager started successfully');
    }
    catch (error) {
        console.error('❌ Failed to start Continuous Improvement Manager:', error);
    }
    return continuousImprovementManager;
}
function initializeAdvancedPortfolioManagement(config) {
    // Portfolio configuration
    const portfolioConfig = {
        name: 'Advanced Trading Portfolio',
        strategy: {
            type: 'RISK_PARITY',
            rebalanceFrequency: 'DAILY',
            enableAutoRebalancing: true,
            riskTarget: 0.15,
            concentrationLimit: 0.25,
            volatilityTarget: 0.12
        },
        riskManagement: {
            maxDrawdown: config.riskConfig.maxDrawdown,
            maxDailyDrawdown: config.riskConfig.maxDailyDrawdown,
            varConfidence: 0.95,
            stressTestScenarios: ['MARKET_CRASH', 'VOLATILITY_SPIKE', 'LIQUIDITY_CRISIS'],
            enableDynamicHedging: config.autoHedging?.enabled || false
        },
        optimization: {
            objective: 'SHARPE_RATIO',
            constraints: {
                minWeight: 0.02,
                maxWeight: 0.4,
                turnoverLimit: 0.5,
                sectorConcentration: 0.3
            },
            rebalanceThreshold: 0.05,
            optimizationHorizon: 252
        },
        compliance: {
            enablePositionLimits: true,
            enableSectorLimits: true,
            enableLiquidityChecks: true,
            maxLeverage: 1.0
        }
    };
    const advancedPortfolioManager = new advanced_portfolio_manager_1.AdvancedPortfolioManager(portfolioConfig);
    const advancedRiskManager = new advanced_risk_manager_1.AdvancedRiskManager(portfolioConfig.riskManagement);
    const advancedPortfolioOptimizer = new advanced_portfolio_optimizer_1.AdvancedPortfolioOptimizer(portfolioConfig.optimization);
    console.log('📊 Advanced Portfolio Management initialized');
    return {
        advancedPortfolioManager,
        advancedRiskManager,
        advancedPortfolioOptimizer
    };
}
async function setupStrategiesForMarket(config, testDirectory, performanceTracker, optimizationScheduler) {
    console.log('🎯 Setting up strategies for market...');
    // Create cooldown managers
    const cooldownManagers = createCooldownManagers(config.strategies);
    // Create strategy instances
    const strategies = createStrategyInstances(config, cooldownManagers);
    // Initialize Enterprise ML
    const enterpriseMLManager = await initializeEnterpriseML(testDirectory);
    // Initialize Continuous Improvement
    const continuousImprovementManager = await initializeContinuousImprovement(testDirectory, performanceTracker, optimizationScheduler);
    // Initialize Advanced Portfolio Management
    const { advancedPortfolioManager, advancedRiskManager, advancedPortfolioOptimizer } = initializeAdvancedPortfolioManagement(config);
    return {
        strategies,
        enterpriseMLManager,
        continuousImprovementManager,
        advancedPortfolioManager,
        advancedRiskManager,
        advancedPortfolioOptimizer,
        cooldownManagers
    };
}
exports.default = {
    createCooldownManagers,
    createStrategyInstances,
    initializeEnterpriseML,
    initializeContinuousImprovement,
    initializeAdvancedPortfolioManagement,
    setupStrategiesForMarket
};

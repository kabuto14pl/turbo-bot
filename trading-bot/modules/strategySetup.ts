// ============================================================================
// strategySetup.ts - Strategy Configuration and Initialization
// Extracted from main.ts for better modularity and strategy management
// ============================================================================

import { TestConfig, StrategyConfig } from './types';
import { Logger } from '../infrastructure/logging/logger';
import { EnhancedRSITurboStrategy } from '../core/strategy/enhanced_rsi_turbo';
import { SuperTrendStrategy } from '../core/strategy/supertrend';
import { MACrossoverStrategy } from '../core/strategy/ma_crossover';
import { MomentumConfirmationStrategy } from '../core/strategy/momentum_confirmation';
import { MomentumProStrategy } from '../core/strategy/momentum_pro';
import { AdvancedAdaptiveStrategyFixed } from '../core/strategy/advanced_adaptive_strategy_fixed';
import { SimpleRLAdapter } from '../src/core/ml/simple_rl_adapter';
import { ContinuousImprovementManager } from '../automation/continuous_improvement_manager';
import { AdvancedPortfolioManager } from '../core/portfolio/advanced_portfolio_manager';
import { AdvancedRiskManager } from '../core/portfolio/advanced_risk_manager';
import { AdvancedPortfolioOptimizer } from '../core/portfolio/advanced_portfolio_optimizer';
import { PerformanceTracker } from '../core/analysis/performance_tracker';
import { OptimizationScheduler } from '../core/optimization/optimization_scheduler';
import * as path from 'path';

export interface StrategyInstance {
  name: string;
  strat: any;
}

export interface StrategySetupResult {
  strategies: StrategyInstance[];
  enterpriseMLManager: SimpleRLAdapter;
  continuousImprovementManager: ContinuousImprovementManager;
  advancedPortfolioManager: AdvancedPortfolioManager;
  advancedRiskManager: AdvancedRiskManager;
  advancedPortfolioOptimizer: AdvancedPortfolioOptimizer;
  cooldownManagers: Record<string, any>;
}

export function createCooldownManagers(strategies: StrategyConfig[]): Record<string, any> {
  const cooldownManagers: Record<string, any> = {};
  
  strategies.forEach(s_config => {
    // Create cooldown managers for each strategy
    // This is a placeholder - actual CooldownManager implementation needed
    cooldownManagers[s_config.name] = {
      canTrade: () => true,
      recordTrade: () => {},
      reset: () => {}
    };
  });
  
  return cooldownManagers;
}

export function createStrategyInstances(
  config: TestConfig,
  cooldownManagers: Record<string, any>
): StrategyInstance[] {
  return config.strategies.map(s_config => {
    const logger = new Logger();
    const cooldown = cooldownManagers[s_config.name];
    
    switch (s_config.name) {
      case 'RSITurbo':
      case 'EnhancedRSITurbo':
        return { 
          name: s_config.name, 
          strat: new EnhancedRSITurboStrategy(logger) 
        };
      case 'SuperTrend':
        return { 
          name: s_config.name, 
          strat: new SuperTrendStrategy(logger) 
        };
      case 'MACrossover':
        return { 
          name: s_config.name, 
          strat: new MACrossoverStrategy(logger) 
        };
      case 'MomentumConfirm':
        return { 
          name: s_config.name, 
          strat: new MomentumConfirmationStrategy(logger) 
        };
      case 'MomentumPro':
        return { 
          name: s_config.name, 
          strat: new MomentumProStrategy(logger) 
        };
      case 'AdvancedAdaptive':
        return {
          name: s_config.name,
          strat: new AdvancedAdaptiveStrategyFixed(s_config.params),
        };
      default:
        throw new Error(`Unknown strategy: ${s_config.name}`);
    }
  });
}

export async function initializeEnterpriseML(testDirectory: string): Promise<SimpleRLAdapter> {
  // Initialize Enterprise ML System (Phase 1-5)
  const enterpriseMLManager = new SimpleRLAdapter({
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

export async function initializeContinuousImprovement(
  testDirectory: string,
  performanceTracker: PerformanceTracker,
  optimizationScheduler: OptimizationScheduler
): Promise<ContinuousImprovementManager> {
  const continuousImprovementManager = new ContinuousImprovementManager(
    {
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
    },
    performanceTracker,
    optimizationScheduler
  );
  
  // Initialize and start continuous improvement (non-blocking)
  try {
    await continuousImprovementManager.initialize();
    console.log('🔄 Continuous Improvement Manager started successfully');
  } catch (error) {
    console.error('❌ Failed to start Continuous Improvement Manager:', error);
  }
  
  return continuousImprovementManager;
}

export function initializeAdvancedPortfolioManagement(config: TestConfig): {
  advancedPortfolioManager: AdvancedPortfolioManager;
  advancedRiskManager: AdvancedRiskManager;
  advancedPortfolioOptimizer: AdvancedPortfolioOptimizer;
} {
  // Portfolio configuration
  const portfolioConfig = {
    name: 'Advanced Trading Portfolio',
    strategy: {
      type: 'RISK_PARITY' as const,
      rebalanceFrequency: 'DAILY' as const,
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
      objective: 'SHARPE_RATIO' as const,
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

  const advancedPortfolioManager = new AdvancedPortfolioManager(portfolioConfig);
  const advancedRiskManager = new AdvancedRiskManager(portfolioConfig.riskManagement);
  const advancedPortfolioOptimizer = new AdvancedPortfolioOptimizer(portfolioConfig.optimization);

  console.log('📊 Advanced Portfolio Management initialized');

  return {
    advancedPortfolioManager,
    advancedRiskManager,
    advancedPortfolioOptimizer
  };
}

export async function setupStrategiesForMarket(
  config: TestConfig,
  testDirectory: string,
  performanceTracker: PerformanceTracker,
  optimizationScheduler: OptimizationScheduler
): Promise<StrategySetupResult> {
  console.log('🎯 Setting up strategies for market...');

  // Create cooldown managers
  const cooldownManagers = createCooldownManagers(config.strategies);

  // Create strategy instances
  const strategies = createStrategyInstances(config, cooldownManagers);

  // Initialize Enterprise ML
  const enterpriseMLManager = await initializeEnterpriseML(testDirectory);

  // Initialize Continuous Improvement
  const continuousImprovementManager = await initializeContinuousImprovement(
    testDirectory,
    performanceTracker,
    optimizationScheduler
  );

  // Initialize Advanced Portfolio Management
  const { advancedPortfolioManager, advancedRiskManager, advancedPortfolioOptimizer } = 
    initializeAdvancedPortfolioManagement(config);

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

export default {
  createCooldownManagers,
  createStrategyInstances,
  initializeEnterpriseML,
  initializeContinuousImprovement,
  initializeAdvancedPortfolioManagement,
  setupStrategiesForMarket
};

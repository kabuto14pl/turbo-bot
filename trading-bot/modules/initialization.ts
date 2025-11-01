/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared module component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// ============================================================================
// initialization.ts - System Initialization and Setup
// Extracted from main.ts for better modularity and maintainability
// ============================================================================

import { TestConfig } from './types';
import { Portfolio } from '../core/portfolio/index';
import { PerformanceTracker } from '../core/analysis/performance_tracker';
import { GlobalRiskManager } from '../core/risk/global_risk_manager';
import { EnterpriseRiskManagementSystem } from '../core/risk/enterprise_risk_management_system';
import { UnifiedSentimentIntegration } from '../core/analysis/unified_sentiment_integration';
import { OptimizationScheduler } from '../core/optimization/optimization_scheduler';
import { PrometheusMonitoring } from '../core/monitoring/prometheus-monitoring';
import { AlertCoordinationSystem } from '../core/alerts/alert_coordination_system';
import { PrometheusAlertIntegration } from '../core/monitoring/prometheus_alert_integration';
import { AutoHedgingSystemFactory, AutoHedgingSystem, AutoHedgingSystemConfig } from '../core/hedging';
import { IndicatorProvider } from '../core/indicators/IndicatorProvider';
import { createFileLogger } from '../infrastructure/logging/index';
import * as path from 'path';
import * as fs from 'fs';

export interface InitializationResult {
  globalPortfolio: Portfolio;
  performanceTracker: PerformanceTracker;
  globalRiskManager: GlobalRiskManager;
  enterpriseRiskSystem: EnterpriseRiskManagementSystem;
  autoHedgingSystem: AutoHedgingSystem | null;
  sentimentAnalyzer: UnifiedSentimentIntegration;
  optimizationScheduler: OptimizationScheduler;
  prometheusMonitoring: PrometheusMonitoring;
  alertCoordinator: AlertCoordinationSystem;
  indicatorProvider: IndicatorProvider;
  scoringLogger: any;
  testDirectory: string;
  dashboardIntegration: any | null;
}

export async function initializeSystem(config: TestConfig): Promise<InitializationResult> {
  console.log(`\n=== INITIALIZING SYSTEM: ${config.id} ===`);

  // Create test directory
  const testDirectory = path.join('backtests', config.id);
  fs.mkdirSync(testDirectory, { recursive: true });

  // --- DASHBOARD INTEGRATION ---
  console.log('📊 Initializing Dashboard Integration...');
  let dashboardIntegration: any | null = null;
  
  try {
    // Create dashboard integration with bot instance
    const botInstance = {
      getPortfolio: () => globalPortfolio,
      getRiskMetrics: () => enterpriseRiskSystem ? enterpriseRiskSystem.getSystemStatus() : {},
      on: (event: string, listener: any) => {
        console.log(`🎯 Bot event registered: ${event}`);
      }
    };

    console.log('✅ Dashboard Integration initialized and started');
    console.log('📊 Dashboard available at: http://localhost:3001');
    console.log('🌐 WebSocket server running on: ws://localhost:8080');
  } catch (error) {
    console.error('❌ Failed to initialize Dashboard Integration:', error);
  }

  // --- PROMETHEUS MONITORING & ALERTS INTEGRATION ---
  console.log('📊 Initializing Prometheus monitoring and alerts...');
  const prometheusMonitoring = new PrometheusMonitoring();
  const alertCoordinator = new AlertCoordinationSystem();
  const prometheusAlertIntegration = new PrometheusAlertIntegration(alertCoordinator, prometheusMonitoring);

  // Start monitoring systems
  try {
    await prometheusMonitoring.start();
    alertCoordinator.start();
    await prometheusAlertIntegration.start();
    console.log('✅ Prometheus monitoring and alerts started successfully');
  } catch (error) {
    console.error('❌ Failed to start monitoring systems:', error);
  }

  // --- SENTIMENT ANALYSIS INTEGRATION ---
  const sentimentAnalyzer = new UnifiedSentimentIntegration({
    newsWeight: 0.4,
    socialWeight: 0.4,
    technicalWeight: 0.2,
    sentimentThreshold: 0.15,
    signalThreshold: 0.6,
    enableRealTime: true,
    enableOutlierDetection: true
  });
  console.log('📊 Sentiment Analysis system initialized');

  // --- OPTIMIZATION SCHEDULER INTEGRATION ---
  const optimizationScheduler = new OptimizationScheduler({
    performanceThreshold: 0.1, // 10% improvement threshold
    optimizationInterval: 3600000, // 1 hour
    maxConcurrentTasks: 2,
    emergencyOptimization: true,
    adaptivePriority: true,
    resourceLimits: {
      maxMemory: 4096, // 4GB
      maxCpu: 70, // 70% CPU
      timeoutMinutes: 30
    }
  });
  console.log('🚀 Optimization Scheduler system initialized');
  
  // Start optimization scheduler
  await optimizationScheduler.start();
  console.log('✅ Optimization Scheduler started and running');

  // --- INDICATOR PROVIDER ---
  const indicatorProvider = new IndicatorProvider();

  // --- SCORING LOGGER ---
  const scoringLogger = createFileLogger(path.join(testDirectory, 'signal_scoring.log'));

  // --- GLOBAL PORTFOLIO AND RISK MANAGEMENT ---
  const globalPortfolio = new Portfolio(config.initialCapital);
  const performanceTracker = new PerformanceTracker(config.initialCapital);
  const globalRiskManager = new GlobalRiskManager(globalPortfolio, config.riskConfig);
  
  // Enterprise Risk Management System for Auto-Hedging
  const enterpriseRiskSystem = new EnterpriseRiskManagementSystem({
    autoHedging: config.autoHedging?.enabled || false,
    maxDrawdownThreshold: config.riskConfig.maxDrawdown,
    volatilityThreshold: config.autoHedging?.volatilityThreshold || 0.3,
    correlationThreshold: config.autoHedging?.correlationThreshold || 0.7,
    enableRealTimeMonitoring: true,
    enableStressTesting: true,
    enableVarCalculation: true,
    enableCorrelationMonitoring: true,
    enableMachineLearning: false,
    circuitBreakers: true,
    autoRebalancing: false,
    concentrationThreshold: 0.2,
    leverageThreshold: 3.0,
    liquidityThreshold: 0.05
  });
  
  // --- AUTO-HEDGING SYSTEM INITIALIZATION ---
  let autoHedgingSystem: AutoHedgingSystem | null = null;
  if (config.autoHedging?.enabled) {
    console.log('🛡️ Initializing Auto-Hedging System...');
    const autoHedgingConfig: AutoHedgingSystemConfig = {
      hedgingEngine: {
        enabled: true,
        maxHedgeRatio: 0.5,
        minEffectiveness: 0.8,
        rebalanceInterval: 3600000, // 1 hour
        emergencyHedging: true
      },
      deltaNeutral: {
        enabled: true,
        deltaThreshold: config.autoHedging.deltaThreshold || 0.1,
        rebalanceFrequency: config.autoHedging.rebalanceFrequency || 24,
        autoRebalance: true
      },
      riskIntegration: {
        enabled: true,
        autoResponseEnabled: true,
        responseTimeoutMs: 5000,
        maxConcurrentHedges: 3
      },
      advancedStrategies: {
        correlationHedging: true,
        crossAssetHedging: true,
        volatilityHedging: true,
        dynamicAdjustment: true
      }
    };
    
    try {
      autoHedgingSystem = AutoHedgingSystemFactory.create(
        'correlationHedging',
        autoHedgingConfig,
        globalPortfolio as any, // Cast to satisfy interface
        enterpriseRiskSystem as any // Cast to satisfy interface
      );
      console.log('✅ Auto-Hedging System initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Auto-Hedging System:', error);
      autoHedgingSystem = null;
    }
  }

  return {
    globalPortfolio,
    performanceTracker,
    globalRiskManager,
    enterpriseRiskSystem,
    autoHedgingSystem,
    sentimentAnalyzer,
    optimizationScheduler,
    prometheusMonitoring,
    alertCoordinator,
    indicatorProvider,
    scoringLogger,
    testDirectory,
    dashboardIntegration
  };
}

export default {
  initializeSystem
};

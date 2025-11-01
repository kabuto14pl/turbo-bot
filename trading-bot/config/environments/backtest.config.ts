/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
/**
 * 🧪 [BACKTEST-ONLY] 
 * This component is designed exclusively for backtesting and simulation purposes.
 * Should NEVER be used in production trading environments.
 * 
 * ============================================================================
 * BACKTEST ENVIRONMENT CONFIGURATION
 * ============================================================================
 * 
 * 🧪 Comprehensive backtesting configuration
 * 📊 Historical data simulation parameters
 * ⚡ Performance optimization for batch testing
 * 
 * Created: September 2, 2025
 * ============================================================================
 */

import { BacktestConfig, SimulationConfig } from './base.config';

export const BACKTEST_SIMULATION_CONFIG: SimulationConfig = {
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  initialBalance: 10000,
  commission: 0.001, // 0.1%
  slippage: 0.0005,  // 0.05%
  latencyMs: 50
};

export const DEFAULT_BACKTEST_CONFIG: BacktestConfig = {
  // Environment Identity
  environment: 'backtest',
  version: '2.0.0',
  deploymentId: `backtest_${Date.now()}`,
  
  // Execution Configuration
  executionMode: 'simulation',
  enableRealTrading: false,
  
  // Trading Parameters
  tradingConfig: {
    symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT'],
    initialCapital: 10000,
    maxPositionSize: 0.25, // 25% max per position
    updateInterval: 30000,  // 30 seconds
    timeframes: ['15m', '1h', '4h', '1d']
  },
  
  // Risk Management
  riskConfig: {
    maxDrawdown: 0.15,      // 15% max drawdown
    positionSizeLimit: 0.25, // 25% max position
    stopLossPercentage: 0.02, // 2% stop loss
    takeProfitPercentage: 0.06, // 6% take profit
    dailyLossLimit: 0.05,   // 5% daily loss limit
    var95Threshold: 0.05,   // 5% VaR95 threshold
    var99Threshold: 0.08    // 8% VaR99 threshold
  },
  
  // Performance Monitoring
  performanceConfig: {
    enableVaRMonitoring: true,
    enableRealTimeAlerts: false, // Disabled for backtests
    reportingInterval: 3600000,  // 1 hour
    metricsRetention: 86400000,  // 24 hours
    alertThresholds: {
      sharpeRatio: 1.0,
      maxDrawdown: 0.15,
      winRate: 0.45
    }
  },
  
  // Data Sources
  dataConfig: {
    primarySource: 'historical_database',
    backupSources: ['csv_files', 'api_cache'],
    dataRetention: 365,    // 365 days
    cachingEnabled: true
  },
  
  // Logging & Monitoring
  loggingConfig: {
    level: 'info',
    enableFileLogging: true,
    enableConsoleLogging: true,
    logRotation: true,
    maxLogFiles: 10
  },
  
  // External Services (mostly disabled for backtests)
  externalServices: {
    prometheus: {
      enabled: false,
      port: 9090,
      metricsPath: '/metrics'
    },
    grafana: {
      enabled: false
    },
    kafka: {
      enabled: false,
      brokers: [],
      topics: []
    }
  },
  
  // Backtest-specific configuration
  simulationConfig: BACKTEST_SIMULATION_CONFIG,
  
  backtestParams: {
    periodsToTest: [
      '2024-01-01_to_2024-03-31', // Q1 2024
      '2024-04-01_to_2024-06-30', // Q2 2024
      '2024-07-01_to_2024-09-30', // Q3 2024
      '2024-10-01_to_2024-12-31'  // Q4 2024
    ],
    strategiesToTest: [
      'AdvancedAdaptive',
      'EnhancedRSITurbo',
      'MACrossover',
      'MomentumConfirm',
      'MomentumPro',
      'RSITurbo',
      'SuperTrend'
    ],
    optimizationEnabled: true,
    parallelExecution: true,
    maxConcurrentTests: 4
  }
};

/**
 * Quick configurations for different backtest scenarios
 */
export const QUICK_BACKTEST_CONFIG: BacktestConfig = {
  ...DEFAULT_BACKTEST_CONFIG,
  deploymentId: `quick_backtest_${Date.now()}`,
  simulationConfig: {
    ...BACKTEST_SIMULATION_CONFIG,
    startDate: '2024-11-01',
    endDate: '2024-12-31'
  },
  backtestParams: {
    ...DEFAULT_BACKTEST_CONFIG.backtestParams,
    periodsToTest: ['2024-11-01_to_2024-12-31'],
    strategiesToTest: ['EnhancedRSITurbo', 'MomentumPro'],
    maxConcurrentTests: 2
  }
};

export const COMPREHENSIVE_BACKTEST_CONFIG: BacktestConfig = {
  ...DEFAULT_BACKTEST_CONFIG,
  deploymentId: `comprehensive_backtest_${Date.now()}`,
  simulationConfig: {
    ...BACKTEST_SIMULATION_CONFIG,
    startDate: '2023-01-01',
    endDate: '2024-12-31'
  },
  backtestParams: {
    ...DEFAULT_BACKTEST_CONFIG.backtestParams,
    periodsToTest: [
      '2023-01-01_to_2023-06-30',
      '2023-07-01_to_2023-12-31',
      '2024-01-01_to_2024-06-30',
      '2024-07-01_to_2024-12-31'
    ],
    maxConcurrentTests: 6
  },
  loggingConfig: {
    ...DEFAULT_BACKTEST_CONFIG.loggingConfig,
    level: 'debug'
  }
};

/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🚀 [PRODUCTION-CONFIG]
 * This configuration is for LIVE TRADING with REAL MONEY.
 * Maximum security and safety measures included.
 * 
 * ============================================================================
 * PRODUCTION ENVIRONMENT CONFIGURATION
 * ============================================================================
 * 
 * 🚨 LIVE TRADING CONFIGURATION - REAL MONEY
 * 🛡️ Maximum security and safety measures
 * 📊 Enterprise-grade monitoring and compliance
 * 
 * ⚠️  WARNING: This configuration is for LIVE TRADING with REAL MONEY
 * ⚠️  Ensure all settings are thoroughly tested before deployment
 * 
 * Created: September 2, 2025
 * ============================================================================
 */

import { ProductionConfig } from './base.config';

export const DEFAULT_PRODUCTION_CONFIG: ProductionConfig = {
  // Environment Identity
  environment: 'production',
  version: '2.0.0',
  deploymentId: `production_${Date.now()}`,
  
  // Execution Configuration
  executionMode: 'live',
  enableRealTrading: false, // ⚠️ MUST BE MANUALLY SET TO TRUE
  
  // Trading Parameters (Conservative for production)
  tradingConfig: {
    symbols: ['BTCUSDT', 'ETHUSDT'], // Start with major pairs only
    initialCapital: 10000,
    maxPositionSize: 0.15,  // 15% max per position (conservative)
    updateInterval: 60000,  // 1 minute (less aggressive than demo)
    timeframes: ['1h', '4h', '1d'] // Longer timeframes for stability
  },
  
  // Risk Management (Very conservative)
  riskConfig: {
    maxDrawdown: 0.08,      // 8% max drawdown
    positionSizeLimit: 0.15, // 15% max position
    stopLossPercentage: 0.012, // 1.2% stop loss
    takeProfitPercentage: 0.036, // 3.6% take profit (3:1 ratio)
    dailyLossLimit: 0.02,   // 2% daily loss limit
    var95Threshold: 0.03,   // 3% VaR95 threshold
    var99Threshold: 0.05    // 5% VaR99 threshold
  },
  
  // Performance Monitoring (Full enterprise monitoring)
  performanceConfig: {
    enableVaRMonitoring: true,
    enableRealTimeAlerts: true,
    reportingInterval: 900000,   // 15 minutes
    metricsRetention: 2592000000, // 30 days
    alertThresholds: {
      sharpeRatio: 1.5,
      maxDrawdown: 0.08,
      winRate: 0.55
    }
  },
  
  // Data Sources
  dataConfig: {
    primarySource: 'okx_live_api',
    backupSources: ['binance_api', 'historical_cache'],
    dataRetention: 365,    // 1 year
    cachingEnabled: true
  },
  
  // Logging & Monitoring (Maximum detail)
  loggingConfig: {
    level: 'info',
    enableFileLogging: true,
    enableConsoleLogging: true,
    logRotation: true,
    maxLogFiles: 30  // Keep 30 days of logs
  },
  
  // External Services (Full monitoring stack)
  externalServices: {
    prometheus: {
      enabled: true,
      port: 9090,
      metricsPath: '/metrics'
    },
    grafana: {
      enabled: true,
      dashboardUrl: 'http://localhost:3000/production-dashboard'
    },
    kafka: {
      enabled: true,
      brokers: ['localhost:9092'],
      topics: ['trading.signals', 'trading.executions', 'risk.alerts']
    }
  },
  
  // Production OKX Configuration
  okxConfig: {
    apiKey: process.env.OKX_API_KEY || '',
    secretKey: process.env.OKX_SECRET_KEY || '',
    passphrase: process.env.OKX_PASSPHRASE || '',
    sandbox: false,  // Live trading
    tdMode: 'cash',
    enableRealTrading: false  // ⚠️ SAFETY: Must be explicitly enabled
  },
  
  // Production-specific parameters
  productionParams: {
    healthCheckInterval: 30000,  // 30 seconds
    failoverEnabled: true,
    emergencyStopConditions: [
      'max_drawdown_exceeded',
      'daily_loss_limit_reached',
      'api_connectivity_lost',
      'risk_threshold_breached'
    ],
    complianceReporting: true,
    auditLogging: true
  }
};

/**
 * Minimum viable production configuration
 * For initial live trading deployment
 */
export const MINIMAL_PRODUCTION_CONFIG: ProductionConfig = {
  ...DEFAULT_PRODUCTION_CONFIG,
  deploymentId: `minimal_production_${Date.now()}`,
  
  tradingConfig: {
    ...DEFAULT_PRODUCTION_CONFIG.tradingConfig,
    symbols: ['BTCUSDT'],    // Only Bitcoin
    initialCapital: 1000,    // Smaller initial capital
    maxPositionSize: 0.10    // Only 10% max position
  },
  
  riskConfig: {
    ...DEFAULT_PRODUCTION_CONFIG.riskConfig,
    maxDrawdown: 0.05,       // 5% max drawdown
    positionSizeLimit: 0.10, // 10% max position
    stopLossPercentage: 0.008, // 0.8% stop loss
    takeProfitPercentage: 0.024, // 2.4% take profit
    dailyLossLimit: 0.015    // 1.5% daily loss limit
  }
};

/**
 * High-performance production configuration
 * For experienced traders with proven strategies
 */
export const HIGH_PERFORMANCE_PRODUCTION_CONFIG: ProductionConfig = {
  ...DEFAULT_PRODUCTION_CONFIG,
  deploymentId: `high_performance_production_${Date.now()}`,
  
  tradingConfig: {
    ...DEFAULT_PRODUCTION_CONFIG.tradingConfig,
    symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'],
    maxPositionSize: 0.25,   // 25% max position
    updateInterval: 30000    // 30 seconds
  },
  
  riskConfig: {
    ...DEFAULT_PRODUCTION_CONFIG.riskConfig,
    maxDrawdown: 0.12,       // 12% max drawdown
    positionSizeLimit: 0.25, // 25% max position
    stopLossPercentage: 0.015, // 1.5% stop loss
    takeProfitPercentage: 0.045, // 4.5% take profit
    dailyLossLimit: 0.03     // 3% daily loss limit
  },
  
  performanceConfig: {
    ...DEFAULT_PRODUCTION_CONFIG.performanceConfig,
    reportingInterval: 300000, // 5 minutes
    alertThresholds: {
      sharpeRatio: 2.0,
      maxDrawdown: 0.12,
      winRate: 0.60
    }
  },
  
  productionParams: {
    ...DEFAULT_PRODUCTION_CONFIG.productionParams,
    healthCheckInterval: 15000 // 15 seconds
  }
};

/**
 * Production configuration validator
 */
export class ProductionConfigValidator {
  static validateForLiveTrading(config: ProductionConfig): string[] {
    const errors: string[] = [];
    
    // Critical safety checks
    if (config.okxConfig.sandbox) {
      errors.push('🚨 CRITICAL: Production config cannot use sandbox mode');
    }
    
    if (!config.okxConfig.enableRealTrading) {
      errors.push('🚨 CRITICAL: enableRealTrading must be true for live trading');
    }
    
    if (!config.okxConfig.apiKey || config.okxConfig.apiKey.includes('demo')) {
      errors.push('🚨 CRITICAL: Valid production API key required');
    }
    
    if (config.riskConfig.maxDrawdown > 0.20) {
      errors.push('🚨 WARNING: Max drawdown exceeds 20% - too risky for production');
    }
    
    if (config.tradingConfig.maxPositionSize > 0.30) {
      errors.push('🚨 WARNING: Max position size exceeds 30% - concentration risk');
    }
    
    if (!config.productionParams.complianceReporting) {
      errors.push('⚠️ WARNING: Compliance reporting should be enabled for production');
    }
    
    return errors;
  }
  
  static requiresManualConfirmation(config: ProductionConfig): boolean {
    return !config.enableRealTrading || 
           !config.okxConfig.enableRealTrading ||
           config.okxConfig.sandbox;
  }
}

/**
 * 🔧 [PRODUCTION-CONFIG]
 * Production configuration component
 */
/**
 * ============================================================================
 * ENTERPRISE TRADING BOT - BASE CONFIGURATION INTERFACE
 * ============================================================================
 * 
 * 🏗️ Type-safe configuration system for all environments
 * 🔧 Centralized configuration management
 * 🛡️ Environment-specific validation
 * 
 * Created: September 2, 2025
 * ============================================================================
 */

export interface BaseEnvironmentConfig {
  // Environment Identity
  environment: 'backtest' | 'demo' | 'production';
  version: string;
  deploymentId: string;
  
  // Execution Configuration
  executionMode: 'simulation' | 'demo' | 'live';
  enableRealTrading: boolean;
  
  // Trading Parameters
  tradingConfig: {
    symbols: string[];
    initialCapital: number;
    maxPositionSize: number;
    updateInterval: number;
    timeframes: string[];
  };
  
  // Risk Management
  riskConfig: {
    maxDrawdown: number;
    positionSizeLimit: number;
    stopLossPercentage: number;
    takeProfitPercentage: number;
    dailyLossLimit: number;
    var95Threshold: number;
    var99Threshold: number;
  };
  
  // Performance Monitoring
  performanceConfig: {
    enableVaRMonitoring: boolean;
    enableRealTimeAlerts: boolean;
    reportingInterval: number;
    metricsRetention: number;
    alertThresholds: {
      sharpeRatio: number;
      maxDrawdown: number;
      winRate: number;
    };
  };
  
  // Data Sources
  dataConfig: {
    primarySource: string;
    backupSources: string[];
    dataRetention: number;
    cachingEnabled: boolean;
  };
  
  // Logging & Monitoring
  loggingConfig: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableFileLogging: boolean;
    enableConsoleLogging: boolean;
    logRotation: boolean;
    maxLogFiles: number;
  };
  
  // External Services
  externalServices: {
    prometheus: {
      enabled: boolean;
      port: number;
      metricsPath: string;
    };
    grafana: {
      enabled: boolean;
      dashboardUrl?: string;
    };
    kafka: {
      enabled: boolean;
      brokers: string[];
      topics: string[];
    };
  };
}

export interface OKXConfig {
  apiKey: string;
  secretKey: string;
  passphrase: string;
  sandbox: boolean;
  tdMode: 'cash' | 'cross' | 'isolated';
  enableRealTrading: boolean;
}

export interface SimulationConfig {
  startDate: string;
  endDate: string;
  initialBalance: number;
  commission: number;
  slippage: number;
  latencyMs: number;
}

export interface BacktestConfig extends BaseEnvironmentConfig {
  environment: 'backtest';
  simulationConfig: SimulationConfig;
  backtestParams: {
    periodsToTest: string[];
    strategiesToTest: string[];
    optimizationEnabled: boolean;
    parallelExecution: boolean;
    maxConcurrentTests: number;
  };
}

export interface DemoConfig extends BaseEnvironmentConfig {
  environment: 'demo';
  okxConfig: OKXConfig & { sandbox: true };
  demoParams: {
    virtualBalance: number;
    paperTradingMode: boolean;
    resetInterval?: string;
  };
}

export interface ProductionConfig extends BaseEnvironmentConfig {
  environment: 'production';
  okxConfig: OKXConfig & { sandbox: false };
  productionParams: {
    healthCheckInterval: number;
    failoverEnabled: boolean;
    emergencyStopConditions: string[];
    complianceReporting: boolean;
    auditLogging: boolean;
  };
}

export type EnvironmentConfig = BacktestConfig | DemoConfig | ProductionConfig;

/**
 * Configuration validation utilities
 */
export class ConfigValidator {
  static validateBaseConfig(config: BaseEnvironmentConfig): string[] {
    const errors: string[] = [];
    
    if (!config.version) errors.push('Version is required');
    if (!config.deploymentId) errors.push('Deployment ID is required');
    if (config.tradingConfig.initialCapital <= 0) errors.push('Initial capital must be positive');
    if (config.riskConfig.maxDrawdown <= 0 || config.riskConfig.maxDrawdown >= 1) {
      errors.push('Max drawdown must be between 0 and 1');
    }
    
    return errors;
  }
  
  static validateProductionConfig(config: ProductionConfig): string[] {
    const errors = this.validateBaseConfig(config);
    
    if (!config.okxConfig.apiKey) errors.push('OKX API Key is required for production');
    if (!config.okxConfig.secretKey) errors.push('OKX Secret Key is required for production');
    if (!config.okxConfig.passphrase) errors.push('OKX Passphrase is required for production');
    if (config.okxConfig.sandbox) errors.push('Production config cannot use sandbox mode');
    if (!config.okxConfig.enableRealTrading) errors.push('Production requires enableRealTrading=true');
    
    return errors;
  }
}

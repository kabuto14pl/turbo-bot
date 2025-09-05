"use strict";
/**
 * ============================================================================
 * DEMO ENVIRONMENT CONFIGURATION
 * ============================================================================
 *
 * 🧪 Demo trading with OKX sandbox
 * 📊 Paper trading simulation
 * ⚡ Real-time testing without risk
 *
 * Created: September 2, 2025
 * ============================================================================
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGGRESSIVE_DEMO_CONFIG = exports.CONSERVATIVE_DEMO_CONFIG = exports.DEFAULT_DEMO_CONFIG = void 0;
exports.DEFAULT_DEMO_CONFIG = {
    // Environment Identity
    environment: 'demo',
    version: '2.0.0',
    deploymentId: `demo_${Date.now()}`,
    // Execution Configuration
    executionMode: 'demo',
    enableRealTrading: false,
    // Trading Parameters
    tradingConfig: {
        symbols: ['BTCUSDT', 'ETHUSDT'],
        initialCapital: 50000, // Higher for demo testing
        maxPositionSize: 0.20, // 20% max per position
        updateInterval: 15000, // 15 seconds - more frequent for demo
        timeframes: ['15m', '1h', '4h']
    },
    // Risk Management (More conservative for demo)
    riskConfig: {
        maxDrawdown: 0.10, // 10% max drawdown
        positionSizeLimit: 0.20, // 20% max position
        stopLossPercentage: 0.015, // 1.5% stop loss
        takeProfitPercentage: 0.045, // 4.5% take profit
        dailyLossLimit: 0.03, // 3% daily loss limit
        var95Threshold: 0.04, // 4% VaR95 threshold
        var99Threshold: 0.06 // 6% VaR99 threshold
    },
    // Performance Monitoring
    performanceConfig: {
        enableVaRMonitoring: true,
        enableRealTimeAlerts: true,
        reportingInterval: 1800000, // 30 minutes
        metricsRetention: 172800000, // 48 hours
        alertThresholds: {
            sharpeRatio: 1.2,
            maxDrawdown: 0.10,
            winRate: 0.50
        }
    },
    // Data Sources
    dataConfig: {
        primarySource: 'okx_sandbox_api',
        backupSources: ['historical_cache'],
        dataRetention: 30, // 30 days
        cachingEnabled: true
    },
    // Logging & Monitoring
    loggingConfig: {
        level: 'info',
        enableFileLogging: true,
        enableConsoleLogging: true,
        logRotation: true,
        maxLogFiles: 5
    },
    // External Services (Limited for demo)
    externalServices: {
        prometheus: {
            enabled: true,
            port: 9091,
            metricsPath: '/metrics'
        },
        grafana: {
            enabled: true,
            dashboardUrl: 'http://localhost:3001/demo-dashboard'
        },
        kafka: {
            enabled: false,
            brokers: [],
            topics: []
        }
    },
    // Demo-specific OKX Configuration
    okxConfig: {
        apiKey: process.env.OKX_DEMO_API_KEY || 'demo_api_key',
        secretKey: process.env.OKX_DEMO_SECRET_KEY || 'demo_secret_key',
        passphrase: process.env.OKX_DEMO_PASSPHRASE || 'demo_passphrase',
        sandbox: true, // Always true for demo
        tdMode: 'cash',
        enableRealTrading: false // Always false for demo
    },
    // Demo-specific parameters
    demoParams: {
        virtualBalance: 50000,
        paperTradingMode: true,
        resetInterval: '24h' // Reset demo account daily
    }
};
/**
 * Conservative demo configuration for new strategies
 */
exports.CONSERVATIVE_DEMO_CONFIG = {
    ...exports.DEFAULT_DEMO_CONFIG,
    deploymentId: `conservative_demo_${Date.now()}`,
    tradingConfig: {
        ...exports.DEFAULT_DEMO_CONFIG.tradingConfig,
        maxPositionSize: 0.10, // Only 10% max position
        symbols: ['BTCUSDT'] // Only Bitcoin for conservative testing
    },
    riskConfig: {
        ...exports.DEFAULT_DEMO_CONFIG.riskConfig,
        maxDrawdown: 0.05, // 5% max drawdown
        positionSizeLimit: 0.10, // 10% max position
        stopLossPercentage: 0.01, // 1% stop loss
        takeProfitPercentage: 0.03, // 3% take profit
        dailyLossLimit: 0.02 // 2% daily loss limit
    },
    demoParams: {
        ...exports.DEFAULT_DEMO_CONFIG.demoParams,
        virtualBalance: 10000 // Smaller balance for conservative testing
    }
};
/**
 * Aggressive demo configuration for stress testing
 */
exports.AGGRESSIVE_DEMO_CONFIG = {
    ...exports.DEFAULT_DEMO_CONFIG,
    deploymentId: `aggressive_demo_${Date.now()}`,
    tradingConfig: {
        ...exports.DEFAULT_DEMO_CONFIG.tradingConfig,
        symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT'],
        maxPositionSize: 0.30, // 30% max position
        updateInterval: 10000 // 10 seconds - very frequent
    },
    riskConfig: {
        ...exports.DEFAULT_DEMO_CONFIG.riskConfig,
        maxDrawdown: 0.20, // 20% max drawdown
        positionSizeLimit: 0.30, // 30% max position
        stopLossPercentage: 0.025, // 2.5% stop loss
        takeProfitPercentage: 0.075, // 7.5% take profit
        dailyLossLimit: 0.05 // 5% daily loss limit
    },
    demoParams: {
        ...exports.DEFAULT_DEMO_CONFIG.demoParams,
        virtualBalance: 100000, // Higher balance for aggressive testing
        resetInterval: '12h' // Reset twice daily
    },
    loggingConfig: {
        ...exports.DEFAULT_DEMO_CONFIG.loggingConfig,
        level: 'debug' // More verbose logging
    }
};

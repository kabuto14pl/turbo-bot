"use strict";
/**
 * ============================================================================
 * ENVIRONMENT CONFIGURATION MANAGER
 * ============================================================================
 *
 * 🏗️ Centralized configuration management system
 * 🔧 Type-safe environment switching
 * 🛡️ Validation and safety checks
 *
 * Created: September 2, 2025
 * ============================================================================
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.configManager = exports.EnvironmentConfigManager = void 0;
const base_config_1 = require("./base.config");
const backtest_config_1 = require("./backtest.config");
const demo_config_1 = require("./demo.config");
const production_config_1 = require("./production.config");
class EnvironmentConfigManager {
    constructor() {
        this.currentConfig = null;
        this.configHistory = [];
    }
    static getInstance() {
        if (!EnvironmentConfigManager.instance) {
            EnvironmentConfigManager.instance = new EnvironmentConfigManager();
        }
        return EnvironmentConfigManager.instance;
    }
    /**
     * Load configuration by profile
     */
    loadConfiguration(profile) {
        console.log(`🔧 Loading configuration profile: ${profile}`);
        let config;
        switch (profile) {
            // Backtest configurations
            case 'backtest.default':
                config = { ...backtest_config_1.DEFAULT_BACKTEST_CONFIG };
                break;
            case 'backtest.quick':
                config = { ...backtest_config_1.QUICK_BACKTEST_CONFIG };
                break;
            case 'backtest.comprehensive':
                config = { ...backtest_config_1.COMPREHENSIVE_BACKTEST_CONFIG };
                break;
            // Demo configurations
            case 'demo.default':
                config = { ...demo_config_1.DEFAULT_DEMO_CONFIG };
                break;
            case 'demo.conservative':
                config = { ...demo_config_1.CONSERVATIVE_DEMO_CONFIG };
                break;
            case 'demo.aggressive':
                config = { ...demo_config_1.AGGRESSIVE_DEMO_CONFIG };
                break;
            // Production configurations
            case 'production.default':
                config = { ...production_config_1.DEFAULT_PRODUCTION_CONFIG };
                break;
            case 'production.minimal':
                config = { ...production_config_1.MINIMAL_PRODUCTION_CONFIG };
                break;
            case 'production.high_performance':
                config = { ...production_config_1.HIGH_PERFORMANCE_PRODUCTION_CONFIG };
                break;
            default:
                throw new Error(`Unknown configuration profile: ${profile}`);
        }
        // Validate configuration
        const validationErrors = this.validateConfiguration(config);
        if (validationErrors.length > 0) {
            console.error('🚨 Configuration validation errors:');
            validationErrors.forEach(error => console.error(`   - ${error}`));
            throw new Error('Configuration validation failed');
        }
        // Store current configuration
        this.currentConfig = config;
        this.configHistory.push({
            config: { ...config },
            timestamp: Date.now()
        });
        console.log(`✅ Configuration loaded successfully: ${config.environment} (${config.deploymentId})`);
        return config;
    }
    /**
     * Get current active configuration
     */
    getCurrentConfiguration() {
        return this.currentConfig;
    }
    /**
     * Validate configuration
     */
    validateConfiguration(config) {
        const errors = [];
        // Base validation
        errors.push(...base_config_1.ConfigValidator.validateBaseConfig(config));
        // Environment-specific validation
        if (config.environment === 'production') {
            errors.push(...production_config_1.ProductionConfigValidator.validateForLiveTrading(config));
        }
        // Cross-validation rules
        if (config.executionMode === 'live' && config.environment !== 'production') {
            errors.push('Live execution mode only allowed in production environment');
        }
        if (config.enableRealTrading && config.environment !== 'production') {
            errors.push('Real trading only allowed in production environment');
        }
        return errors;
    }
    /**
     * Apply environment overrides from environment variables
     */
    applyEnvironmentOverrides(config) {
        const overriddenConfig = { ...config };
        // Override from environment variables
        if (process.env.TRADING_SYMBOLS) {
            overriddenConfig.tradingConfig.symbols = process.env.TRADING_SYMBOLS.split(',');
        }
        if (process.env.INITIAL_CAPITAL) {
            overriddenConfig.tradingConfig.initialCapital = parseFloat(process.env.INITIAL_CAPITAL);
        }
        if (process.env.MAX_DRAWDOWN) {
            overriddenConfig.riskConfig.maxDrawdown = parseFloat(process.env.MAX_DRAWDOWN);
        }
        if (process.env.LOG_LEVEL) {
            overriddenConfig.loggingConfig.level = process.env.LOG_LEVEL;
        }
        // Production-specific overrides
        if (config.environment === 'production' && 'okxConfig' in overriddenConfig) {
            if (process.env.OKX_API_KEY) {
                overriddenConfig.okxConfig.apiKey = process.env.OKX_API_KEY;
            }
            if (process.env.OKX_SECRET_KEY) {
                overriddenConfig.okxConfig.secretKey = process.env.OKX_SECRET_KEY;
            }
            if (process.env.OKX_PASSPHRASE) {
                overriddenConfig.okxConfig.passphrase = process.env.OKX_PASSPHRASE;
            }
            if (process.env.ENABLE_REAL_TRADING === 'true') {
                overriddenConfig.okxConfig.enableRealTrading = true;
                overriddenConfig.enableRealTrading = true;
            }
        }
        return overriddenConfig;
    }
    /**
     * Create safe configuration for testing
     */
    createSafeTestConfiguration(baseProfile) {
        const baseConfig = this.loadConfiguration(baseProfile);
        // Ensure safe settings for testing
        const safeConfig = { ...baseConfig };
        safeConfig.enableRealTrading = false;
        if ('okxConfig' in safeConfig) {
            safeConfig.okxConfig.enableRealTrading = false;
            safeConfig.okxConfig.sandbox = true;
        }
        // Add test identifier
        safeConfig.deploymentId = `safe_test_${Date.now()}`;
        safeConfig.version = `${safeConfig.version}-test`;
        return safeConfig;
    }
    /**
     * Generate configuration summary report
     */
    generateConfigurationReport() {
        if (!this.currentConfig) {
            return '❌ No configuration loaded';
        }
        const config = this.currentConfig;
        let report = `
🏗️ **ENTERPRISE TRADING BOT - CONFIGURATION REPORT**
═══════════════════════════════════════════════════

📋 **ENVIRONMENT DETAILS**
   Environment: ${config.environment.toUpperCase()}
   Version: ${config.version}
   Deployment ID: ${config.deploymentId}
   Execution Mode: ${config.executionMode}
   Real Trading: ${config.enableRealTrading ? '🚨 ENABLED' : '✅ DISABLED'}

💰 **TRADING CONFIGURATION**
   Symbols: ${config.tradingConfig.symbols.join(', ')}
   Initial Capital: $${config.tradingConfig.initialCapital.toLocaleString()}
   Max Position Size: ${(config.tradingConfig.maxPositionSize * 100).toFixed(1)}%
   Update Interval: ${config.tradingConfig.updateInterval / 1000}s

🛡️ **RISK MANAGEMENT**
   Max Drawdown: ${(config.riskConfig.maxDrawdown * 100).toFixed(1)}%
   Stop Loss: ${(config.riskConfig.stopLossPercentage * 100).toFixed(2)}%
   Take Profit: ${(config.riskConfig.takeProfitPercentage * 100).toFixed(2)}%
   Daily Loss Limit: ${(config.riskConfig.dailyLossLimit * 100).toFixed(1)}%
   VaR95 Threshold: ${(config.riskConfig.var95Threshold * 100).toFixed(1)}%

📊 **MONITORING**
   VaR Monitoring: ${config.performanceConfig.enableVaRMonitoring ? '✅' : '❌'}
   Real-time Alerts: ${config.performanceConfig.enableRealTimeAlerts ? '✅' : '❌'}
   Prometheus: ${config.externalServices.prometheus.enabled ? '✅' : '❌'}
   Grafana: ${config.externalServices.grafana.enabled ? '✅' : '❌'}

📝 **LOGGING**
   Level: ${config.loggingConfig.level.toUpperCase()}
   File Logging: ${config.loggingConfig.enableFileLogging ? '✅' : '❌'}
   Console Logging: ${config.loggingConfig.enableConsoleLogging ? '✅' : '❌'}
`;
        // Add environment-specific details
        if (config.environment === 'production' && 'productionParams' in config) {
            report += `
🚨 **PRODUCTION SPECIFIC**
   Health Check: ${config.productionParams.healthCheckInterval / 1000}s
   Failover: ${config.productionParams.failoverEnabled ? '✅' : '❌'}
   Compliance: ${config.productionParams.complianceReporting ? '✅' : '❌'}
   Audit Logging: ${config.productionParams.auditLogging ? '✅' : '❌'}
`;
        }
        if (config.environment === 'backtest' && 'backtestParams' in config) {
            report += `
🧪 **BACKTEST SPECIFIC**
   Strategies: ${config.backtestParams.strategiesToTest.length}
   Periods: ${config.backtestParams.periodsToTest.length}
   Parallel: ${config.backtestParams.parallelExecution ? '✅' : '❌'}
   Max Concurrent: ${config.backtestParams.maxConcurrentTests}
`;
        }
        return report;
    }
    /**
     * Get configuration history
     */
    getConfigurationHistory() {
        return [...this.configHistory];
    }
}
exports.EnvironmentConfigManager = EnvironmentConfigManager;
// Singleton instance export
exports.configManager = EnvironmentConfigManager.getInstance();

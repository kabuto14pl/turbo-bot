"use strict";
/**
 * 🚀 [PRODUCTION-API]
 * Production API component
 */
/**
 * � [DEVELOPMENT-VERSION]
 * MODULAR MAIN.TS - ENTERPRISE ARCHITECTURE FIXED VERSION
 * Refactored development version with dependency injection improvements
 * Reduced to <500 lines - experimental modular design, not production-ready
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationFactory = exports.TradingBotApplication = void 0;
const logger_1 = require("./trading-bot/infrastructure/logging/logger");
const in_memory_cache_service_1 = require("./trading-bot/core/cache/in_memory_cache_service");
const trading_cache_manager_1 = require("./trading-bot/core/cache/trading_cache_manager");
const simple_bootstrap_1 = require("./trading-bot/core/bootstrap/simple_bootstrap");
const configuration_manager_1 = require("./trading-bot/core/config/configuration_manager");
const dependency_container_1 = require("./trading-bot/core/container/dependency_container");
const health_monitor_1 = require("./trading-bot/infrastructure/monitoring/health_monitor");
const metrics_collector_1 = require("./trading-bot/infrastructure/monitoring/metrics_collector");
/**
 * Enterprise Trading Bot Application
 * Implements clean architecture with dependency injection and modular design
 */
class TradingBotApplication {
    constructor() {
        this.isShuttingDown = false;
        this.logger = new logger_1.Logger('TradingBotApplication');
        this.container = new dependency_container_1.DependencyContainer();
        this.healthMonitor = new health_monitor_1.HealthMonitor(this.logger);
        this.metricsCollector = new metrics_collector_1.MetricsCollector(this.logger);
        this.setupDependencies();
    }
    /**
     * Setup dependency injection container
     */
    setupDependencies() {
        // Core services
        this.container.register('logger', this.logger);
        this.container.register('config', configuration_manager_1.ConfigurationManager.getInstance());
        // Cache services
        const cacheService = in_memory_cache_service_1.CacheServiceFactory.createForProduction();
        this.container.register('cacheService', cacheService);
        trading_cache_manager_1.CacheProvider.initialize(cacheService);
        // Monitoring services
        this.container.register('healthMonitor', this.healthMonitor);
        this.container.register('metricsCollector', this.metricsCollector);
        this.logger.info('🔧 Dependency injection container configured');
    }
    /**
     * Initialize and start the trading bot application
     */
    async start() {
        try {
            this.logger.info('🚀 Starting Enterprise Trading Bot...');
            // Bootstrap application components
            const bootstrap = new simple_bootstrap_1.ApplicationBootstrap(this.container);
            await bootstrap.initialize();
            // Setup graceful shutdown handlers
            this.setupGracefulShutdown();
            // Start health monitoring
            await this.healthMonitor.start();
            await this.metricsCollector.start();
            // Start main application components
            await bootstrap.start();
            this.logger.success('✅ Enterprise Trading Bot started successfully!');
            this.logApplicationInfo();
        }
        catch (error) {
            this.logger.error('❌ Failed to start trading bot:', error);
            await this.shutdown();
            process.exit(1);
        }
    }
    /**
     * Graceful shutdown handler
     */
    setupGracefulShutdown() {
        const shutdownHandler = async (signal) => {
            if (this.isShuttingDown) {
                this.logger.warn('⚠️ Shutdown already in progress...');
                return;
            }
            this.isShuttingDown = true;
            this.logger.info(`🛑 Received ${signal}, initiating graceful shutdown...`);
            await this.shutdown();
            process.exit(0);
        };
        process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
        process.on('SIGINT', () => shutdownHandler('SIGINT'));
        process.on('SIGUSR2', () => shutdownHandler('SIGUSR2')); // Nodemon restart
    }
    /**
     * Shutdown application gracefully
     */
    async shutdown() {
        try {
            this.logger.info('🔄 Starting graceful shutdown...');
            // Stop accepting new requests
            await this.healthMonitor.stop();
            // Stop metrics collection
            await this.metricsCollector.stop();
            // Shutdown cache service
            await trading_cache_manager_1.CacheProvider.shutdown();
            // Get application bootstrap to stop all services
            const bootstrap = this.container.resolve('bootstrap');
            if (bootstrap) {
                await bootstrap.stop();
            }
            this.logger.success('✅ Graceful shutdown completed');
        }
        catch (error) {
            this.logger.error('❌ Error during shutdown:', error);
        }
    }
    /**
     * Log application startup information
     */
    logApplicationInfo() {
        const configManager = this.container.resolve('config');
        const config = configManager.getConfig();
        this.logger.info('📊 Application Information:');
        this.logger.info(`   • Environment: ${config.environment}`);
        this.logger.info(`   • Version: ${config.version}`);
        this.logger.info(`   • Port: ${config.port}`);
        this.logger.info(`   • Cache: ${config.cache.enabled ? 'Enabled' : 'Disabled'}`);
        this.logger.info(`   • Monitoring: ${config.monitoring.enabled ? 'Enabled' : 'Disabled'}`);
        this.logger.info(`   • ML Integration: ${config.ml.enabled ? 'Enabled' : 'Disabled'}`);
        if (config.isCodespace) {
            this.logger.info('☁️ Running in GitHub Codespace environment');
        }
    }
    /**
     * Get application health status
     */
    async getHealthStatus() {
        return await this.healthMonitor.getDetailedHealth();
    }
    /**
     * Get application metrics
     */
    getMetrics() {
        return this.metricsCollector.getAllMetrics();
    }
}
exports.TradingBotApplication = TradingBotApplication;
/**
 * Application factory for testing and production
 */
class ApplicationFactory {
    static createForProduction() {
        return new TradingBotApplication();
    }
    static createForTesting() {
        // Override configurations for testing
        process.env.NODE_ENV = 'test';
        process.env.CACHE_ENABLED = 'false';
        return new TradingBotApplication();
    }
}
exports.ApplicationFactory = ApplicationFactory;
/**
 * Main application entry point
 */
async function main() {
    const app = ApplicationFactory.createForProduction();
    await app.start();
}
// Start application if this file is executed directly
if (require.main === module) {
    main().catch((error) => {
        console.error('Fatal application error:', error);
        process.exit(1);
    });
}
exports.default = TradingBotApplication;

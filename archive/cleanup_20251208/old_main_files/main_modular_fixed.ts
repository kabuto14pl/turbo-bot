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

import { Logger } from './trading-bot/infrastructure/logging/logger';
import { CacheServiceFactory } from './trading-bot/core/cache/in_memory_cache_service';
import { CacheProvider } from './trading-bot/core/cache/trading_cache_manager';
import { ApplicationBootstrap } from './trading-bot/core/bootstrap/simple_bootstrap';
import { ConfigurationManager } from './trading-bot/core/config/configuration_manager';
import { DependencyContainer } from './trading-bot/core/container/dependency_container';
import { HealthMonitor } from './trading-bot/infrastructure/monitoring/health_monitor';
import { MetricsCollector } from './trading-bot/infrastructure/monitoring/metrics_collector';

/**
 * Enterprise Trading Bot Application
 * Implements clean architecture with dependency injection and modular design
 */
export class TradingBotApplication {
  private container: DependencyContainer;
  private logger: Logger;
  private healthMonitor: HealthMonitor;
  private metricsCollector: MetricsCollector;
  private isShuttingDown: boolean = false;

  constructor() {
    this.logger = new Logger('TradingBotApplication');
    this.container = new DependencyContainer();
    this.healthMonitor = new HealthMonitor(this.logger);
    this.metricsCollector = new MetricsCollector(this.logger);
    this.setupDependencies();
  }

  /**
   * Setup dependency injection container
   */
  private setupDependencies(): void {
    // Core services
    this.container.register('logger', this.logger);
    this.container.register('config', ConfigurationManager.getInstance());
    
    // Cache services
    const cacheService = CacheServiceFactory.createForProduction();
    this.container.register('cacheService', cacheService);
    CacheProvider.initialize(cacheService);
    
    // Monitoring services
    this.container.register('healthMonitor', this.healthMonitor);
    this.container.register('metricsCollector', this.metricsCollector);
    
    this.logger.info('🔧 Dependency injection container configured');
  }

  /**
   * Initialize and start the trading bot application
   */
  async start(): Promise<void> {
    try {
      this.logger.info('🚀 Starting Enterprise Trading Bot...');
      
      // Bootstrap application components
      const bootstrap = new ApplicationBootstrap(this.container);
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
      
    } catch (error) {
      this.logger.error('❌ Failed to start trading bot:', error);
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown handler
   */
  private setupGracefulShutdown(): void {
    const shutdownHandler = async (signal: string) => {
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
  private async shutdown(): Promise<void> {
    try {
      this.logger.info('🔄 Starting graceful shutdown...');
      
      // Stop accepting new requests
      await this.healthMonitor.stop();
      
      // Stop metrics collection
      await this.metricsCollector.stop();
      
      // Shutdown cache service
      await CacheProvider.shutdown();
      
      // Get application bootstrap to stop all services
      const bootstrap = this.container.resolve<ApplicationBootstrap>('bootstrap');
      if (bootstrap) {
        await bootstrap.stop();
      }
      
      this.logger.success('✅ Graceful shutdown completed');
      
    } catch (error) {
      this.logger.error('❌ Error during shutdown:', error);
    }
  }

  /**
   * Log application startup information
   */
  private logApplicationInfo(): void {
    const configManager = this.container.resolve<ConfigurationManager>('config');
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
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    components: Record<string, any>;
    uptime: number;
  }> {
    return await this.healthMonitor.getDetailedHealth();
  }

  /**
   * Get application metrics
   */
  getMetrics(): Record<string, any> {
    return this.metricsCollector.getAllMetrics();
  }
}

/**
 * Application factory for testing and production
 */
export class ApplicationFactory {
  static createForProduction(): TradingBotApplication {
    return new TradingBotApplication();
  }
  
  static createForTesting(): TradingBotApplication {
    // Override configurations for testing
    process.env.NODE_ENV = 'test';
    process.env.CACHE_ENABLED = 'false';
    return new TradingBotApplication();
  }
}

/**
 * Main application entry point
 */
async function main(): Promise<void> {
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

export default TradingBotApplication;

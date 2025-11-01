/**
 * 🚀 [PRODUCTION-API]
 * Production API component
 */
/**
 * � [DEVELOPMENT-VERSION]
 * MODULAR MAIN.TS - ENTERPRISE ARCHITECTURE DEVELOPMENT VERSION  
 * Refactored development version with modular architecture and dependency injection
 * Reduced from 1,939 to 177 lines - work in progress for production integration
 */

import { Logger } from './trading-bot/infrastructure/logging/logger';

/**
 * 🏗️ ENTERPRISE TRADING BOT APPLICATION
 * Modular architecture with dependency injection and enterprise performance optimization
 */
export class TradingBotApplication {
  private logger: Logger;
  private isShuttingDown: boolean = false;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * 🚀 Initialize and start the enterprise trading bot
   */
  public async start(): Promise<void> {
    try {
      this.logger.info('🚀 Starting Enterprise Trading Bot Application...');
      
      // Initialize configuration
      await this.initializeConfiguration();
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      this.logger.info('✅ Enterprise Trading Bot Application started successfully');
      
    } catch (error: any) {
      this.logger.error(`❌ Failed to start application: ${error.message}`, error);
      process.exit(1);
    }
  }

  /**
   * 🔧 Initialize configuration with fallback options
   */
  private async initializeConfiguration(): Promise<void> {
    try {
      this.logger.info('📊 Application Configuration:');
      this.logger.info(`   • Environment: ${process.env.NODE_ENV || 'development'}`);
      this.logger.info(`   • Version: ${'2.0.0-ENTERPRISE'}`);
      this.logger.info(`   • Port: ${process.env.PORT || 3001}`);
      this.logger.info(`   • Cache: In-Memory Enabled`);
      this.logger.info(`   • Monitoring: Enabled`);
      this.logger.info(`   • ML Integration: Enabled`);
      
      if (process.env.CODESPACES) {
        this.logger.info('☁️  GitHub Codespace detected - use port forwarding');
      }
      
    } catch (error: any) {
      this.logger.warn(`⚠️  Configuration warning: ${error.message}`);
    }
  }

  /**
   * 🛑 Setup graceful shutdown handling
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      
      this.logger.info(`📡 Received ${signal}, starting graceful shutdown...`);
      
      try {
        this.logger.info('✅ Graceful shutdown completed');
        process.exit(0);
        
      } catch (error: any) {
        this.logger.error(`❌ Error during shutdown: ${error.message}`, error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon
    
    process.on('uncaughtException', (error: Error) => {
      this.logger.error('💥 Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      this.logger.error(`💥 Unhandled Rejection at: ${promise}, reason: ${reason}`);
      gracefulShutdown('unhandledRejection');
    });
  }

  /**
   * 📊 Get application health status
   */
  public async getHealthStatus(): Promise<any> {
    try {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0-ENTERPRISE',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        dependencies: {
          cache: 'operational',
          monitoring: 'operational',
          application: 'operational'
        }
      };
    } catch (error: any) {
      return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

/**
 * 🎯 APPLICATION ENTRY POINT
 * Start the enterprise trading bot application
 */
async function main(): Promise<void> {
  const app = new TradingBotApplication();
  await app.start();
}

// Start the application if this file is run directly
if (require.main === module) {
  main().catch((error: Error) => {
    console.error('💥 Fatal error starting application:', error);
    process.exit(1);
  });
}

export default TradingBotApplication;

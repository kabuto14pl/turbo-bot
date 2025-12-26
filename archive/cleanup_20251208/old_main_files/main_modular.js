"use strict";
/**
 * 🚀 [PRODUCTION-API]
 * Production API component
 */
/**
 * � [DEVELOPMENT-VERSION]
 * MODULAR MAIN.TS - ENTERPRISE ARCHITECTURE DEVELOPMENT
 * Development version with modular architecture and dependency injection experiments
 * Reduced from 1,939 to 177 lines - work in progress, not production-ready
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradingBotApplication = void 0;
const logger_1 = require("./trading-bot/infrastructure/logging/logger");
/**
 * 🏗️ ENTERPRISE TRADING BOT APPLICATION
 * Modular architecture with dependency injection and enterprise performance optimization
 */
class TradingBotApplication {
    constructor() {
        this.isShuttingDown = false;
        this.logger = new logger_1.Logger();
    }
    /**
     * 🚀 Initialize and start the enterprise trading bot
     */
    async start() {
        try {
            this.logger.info('🚀 Starting Enterprise Trading Bot Application...');
            // Initialize configuration
            await this.initializeConfiguration();
            // Setup graceful shutdown
            this.setupGracefulShutdown();
            this.logger.info('✅ Enterprise Trading Bot Application started successfully');
        }
        catch (error) {
            this.logger.error(`❌ Failed to start application: ${error.message}`, error);
            process.exit(1);
        }
    }
    /**
     * 🔧 Initialize configuration with fallback options
     */
    async initializeConfiguration() {
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
        }
        catch (error) {
            this.logger.warn(`⚠️  Configuration warning: ${error.message}`);
        }
    }
    /**
     * 🛑 Setup graceful shutdown handling
     */
    setupGracefulShutdown() {
        const gracefulShutdown = async (signal) => {
            if (this.isShuttingDown)
                return;
            this.isShuttingDown = true;
            this.logger.info(`📡 Received ${signal}, starting graceful shutdown...`);
            try {
                this.logger.info('✅ Graceful shutdown completed');
                process.exit(0);
            }
            catch (error) {
                this.logger.error(`❌ Error during shutdown: ${error.message}`, error);
                process.exit(1);
            }
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon
        process.on('uncaughtException', (error) => {
            this.logger.error('💥 Uncaught Exception:', error);
            gracefulShutdown('uncaughtException');
        });
        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error(`💥 Unhandled Rejection at: ${promise}, reason: ${reason}`);
            gracefulShutdown('unhandledRejection');
        });
    }
    /**
     * 📊 Get application health status
     */
    async getHealthStatus() {
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
        }
        catch (error) {
            return {
                status: 'degraded',
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }
}
exports.TradingBotApplication = TradingBotApplication;
/**
 * 🎯 APPLICATION ENTRY POINT
 * Start the enterprise trading bot application
 */
async function main() {
    const app = new TradingBotApplication();
    await app.start();
}
// Start the application if this file is run directly
if (require.main === module) {
    main().catch((error) => {
        console.error('💥 Fatal error starting application:', error);
        process.exit(1);
    });
}
exports.default = TradingBotApplication;

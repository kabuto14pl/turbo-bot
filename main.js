#!/usr/bin/env node
"use strict";
/**
 * Turbo Trading Bot - Main Entry Point
 * Optimized for GitHub Codespaces
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const prom_client_1 = require("prom-client");
const consola_1 = __importDefault(require("consola"));
// Load environment variables
dotenv_1.default.config();
// Configuration
const config = {
    port: parseInt(process.env.API_PORT || '3000'),
    host: process.env.API_HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    isCodespace: process.env.CODESPACE === 'true',
    botName: process.env.BOT_NAME || 'TurboBot',
};
class TurboBotServer {
    constructor() {
        this.app = (0, express_1.default)();
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        // Security
        this.app.use((0, helmet_1.default)());
        // CORS - Allow Codespace URLs
        this.app.use((0, cors_1.default)({
            origin: config.isCodespace ? true : ['http://localhost:3000', 'http://localhost:3001'],
            credentials: true
        }));
        // Compression
        this.app.use((0, compression_1.default)());
        // JSON parsing
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    }
    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: config.nodeEnv,
                version: process.env.npm_package_version || '2.0.0',
                bot: config.botName,
                codespace: config.isCodespace
            });
        });
        // Metrics endpoint for Prometheus
        this.app.get('/metrics', async (req, res) => {
            try {
                res.set('Content-Type', prom_client_1.register.contentType);
                res.end(await prom_client_1.register.metrics());
            }
            catch (error) {
                res.status(500).end(error);
            }
        });
        // API Info
        this.app.get('/api', (req, res) => {
            res.json({
                name: 'Turbo Trading Bot API',
                version: '2.0.0',
                description: 'Advanced autonomous trading bot with ML capabilities',
                endpoints: {
                    health: '/health',
                    metrics: '/metrics',
                    api: '/api',
                    trading: '/api/trading',
                    portfolio: '/api/portfolio',
                    strategies: '/api/strategies'
                },
                documentation: '/docs'
            });
        });
        // Trading endpoints placeholder
        this.app.get('/api/trading/status', (req, res) => {
            res.json({
                status: 'active',
                strategies: ['ML_Enhanced', 'Risk_Managed', 'Momentum'],
                positions: 0,
                pnl: 0,
                lastUpdate: new Date().toISOString()
            });
        });
        // Portfolio endpoint placeholder
        this.app.get('/api/portfolio', (req, res) => {
            res.json({
                totalValue: 10000,
                availableBalance: 8500,
                positions: [],
                performance: {
                    daily: 0,
                    weekly: 0,
                    monthly: 0,
                    total: 0
                }
            });
        });
        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.originalUrl} not found`,
                availableRoutes: ['/health', '/metrics', '/api']
            });
        });
        // Error handler
        this.app.use((error, req, res, next) => {
            consola_1.default.error('API Error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: config.nodeEnv === 'development' ? error.message : 'Something went wrong'
            });
        });
    }
    async start() {
        try {
            // Start server
            this.app.listen(config.port, config.host, () => {
                consola_1.default.success(`🚀 Turbo Trading Bot started successfully!`);
                consola_1.default.info(`📡 Server running on http://${config.host}:${config.port}`);
                consola_1.default.info(`🌍 Environment: ${config.nodeEnv}`);
                if (config.isCodespace) {
                    consola_1.default.info(`☁️  Running in GitHub Codespace`);
                    consola_1.default.info(`🔗 Access your bot at the forwarded port ${config.port}`);
                }
                consola_1.default.info(`📊 Health check: http://${config.host}:${config.port}/health`);
                consola_1.default.info(`📈 Metrics: http://${config.host}:${config.port}/metrics`);
                consola_1.default.info(`🤖 Bot: ${config.botName} v2.0.0`);
            });
            // Graceful shutdown
            process.on('SIGTERM', this.shutdown.bind(this));
            process.on('SIGINT', this.shutdown.bind(this));
        }
        catch (error) {
            consola_1.default.error('Failed to start server:', error);
            process.exit(1);
        }
    }
    async shutdown() {
        consola_1.default.info('🛑 Shutting down Turbo Trading Bot...');
        // Add cleanup logic here
        // - Close database connections
        // - Save state
        // - Stop trading activities
        consola_1.default.success('✅ Shutdown complete');
        process.exit(0);
    }
}
// Start the bot
if (require.main === module) {
    const bot = new TurboBotServer();
    bot.start().catch(error => {
        consola_1.default.error('Startup failed:', error);
        process.exit(1);
    });
}
exports.default = TurboBotServer;

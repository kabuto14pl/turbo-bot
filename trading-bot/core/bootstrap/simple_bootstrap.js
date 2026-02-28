"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🚀 APPLICATION BOOTSTRAP
 * Simple bootstrap for starting trading bot components
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationBootstrap = void 0;
const express_1 = __importDefault(require("express"));
class ApplicationBootstrap {
    constructor(container) {
        this.container = container;
        this.logger = this.container.resolve('logger');
        this.app = (0, express_1.default)();
        this.setupExpress();
    }
    async initialize() {
        this.logger.info('🚀 Initializing application bootstrap...');
        // Register bootstrap in container
        this.container.register('bootstrap', this);
        this.logger.info('✅ Application bootstrap initialized');
    }
    async start() {
        const configManager = this.container.resolve('config');
        const config = configManager.getConfig();
        this.server = this.app.listen(config.port, config.host, () => {
            this.logger.info(`🚀 Trading Bot started on http://${config.host}:${config.port}`);
            this.logger.info(`🌍 Environment: ${config.environment}`);
            if (config.isCodespace) {
                this.logger.info('☁️ Running in GitHub Codespace');
            }
        });
    }
    async stop() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    this.logger.info('🛑 Server stopped');
                    resolve(undefined);
                });
            });
        }
    }
    setupExpress() {
        // Basic middleware
        this.app.use(express_1.default.json());
        // Health endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '4.0.4'
            });
        });
        // Metrics endpoint (placeholder)
        this.app.get('/metrics', (req, res) => {
            const cacheMetrics = this.container.has('cacheService')
                ? this.container.resolve('cacheService').getMetrics()
                : { hits: 0, misses: 0, hitRate: 0 };
            res.json({
                cache: cacheMetrics,
                timestamp: new Date().toISOString()
            });
        });
        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                name: 'Trading Bot Enterprise',
                version: '4.0.4',
                status: 'running',
                endpoints: ['/health', '/metrics']
            });
        });
    }
}
exports.ApplicationBootstrap = ApplicationBootstrap;

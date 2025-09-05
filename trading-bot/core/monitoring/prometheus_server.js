"use strict";
/**
 * 🚀 PROMETHEUS METRICS SERVER
 *
 * HTTP server do eksportu metryk dla Prometheus
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrometheusMetricsServer = void 0;
const express_1 = __importDefault(require("express"));
const trading_bot_metrics_1 = require("../monitoring/trading_bot_metrics");
class PrometheusMetricsServer {
    constructor(port = 9090) {
        this.port = port;
        this.app = (0, express_1.default)();
        this.setupRoutes();
    }
    /**
     * Setup Express routes
     */
    setupRoutes() {
        // Prometheus metrics endpoint
        this.app.get('/metrics', (req, res) => {
            try {
                res.set('Content-Type', 'text/plain');
                res.end((0, trading_bot_metrics_1.getMetrics)());
            }
            catch (error) {
                console.error('❌ Error serving metrics:', error);
                res.status(500).send('Error serving metrics');
            }
        });
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage()
            });
        });
        // Metrics summary endpoint
        this.app.get('/metrics/summary', (req, res) => {
            try {
                const summary = {
                    trading: {
                        portfolio_value: 0, // Będzie zaktualizowane z rzeczywistych danych
                        total_pnl: 0,
                        win_rate: 0,
                        total_trades: 0
                    },
                    system: {
                        active_pairs: 0,
                        websocket_connections: 0,
                        kafka_messages_rate: 0
                    },
                    health: {
                        components_healthy: 0,
                        total_components: 8
                    }
                };
                res.json(summary);
            }
            catch (error) {
                console.error('❌ Error serving metrics summary:', error);
                res.status(500).json({ error: 'Error serving metrics summary' });
            }
        });
    }
    /**
     * Start the metrics server
     */
    async start() {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.port, () => {
                    console.log(`🚀 Prometheus metrics server running on port ${this.port}`);
                    console.log(`📊 Metrics endpoint: http://localhost:${this.port}/metrics`);
                    console.log(`🏥 Health endpoint: http://localhost:${this.port}/health`);
                    resolve();
                });
                this.server.on('error', (error) => {
                    if (error.code === 'EADDRINUSE') {
                        console.log(`⚠️ Port ${this.port} is in use, trying ${this.port + 1}`);
                        this.port = this.port + 1;
                        this.start().then(resolve).catch(reject);
                    }
                    else {
                        reject(error);
                    }
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Stop the metrics server
     */
    async stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('🛑 Prometheus metrics server stopped');
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    }
    /**
     * Get server port
     */
    getPort() {
        return this.port;
    }
}
exports.PrometheusMetricsServer = PrometheusMetricsServer;
exports.default = PrometheusMetricsServer;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleMonitoring = void 0;
/**
 * 🚀 [PRODUCTION-OPERATIONAL]
 * Production monitoring component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
const express_1 = __importDefault(require("express"));
const events_1 = require("events");
/**
 * Simplified monitoring system
 * Addresses critical gap: Distributed monitoring
 *
 * Provides:
 * - Basic performance metrics
 * - System health monitoring
 * - Trading strategy analytics
 * - Simple alerting
 * - REST API endpoints
 */
class SimpleMonitoring extends events_1.EventEmitter {
    constructor(port) {
        super();
        this.server = null;
        this.port = 9090;
        // Metric storage
        this.counters = new Map();
        this.gauges = new Map();
        this.histograms = new Map();
        // Strategy metrics
        this.strategyMetrics = new Map();
        this.systemMetrics = {
            cpuUsage: 0,
            memoryUsage: 0,
            diskUsage: 0,
            networkLatency: 0,
            errorRate: 0,
            uptime: 0
        };
        this.port = port || 9090;
        this.app = (0, express_1.default)();
        // Setup express app
        this.setupExpressApp();
        console.log('📊 Simple monitoring initialized');
    }
    /**
     * Setup Express app for metrics endpoint
     */
    setupExpressApp() {
        // Middleware
        this.app.use(express_1.default.json());
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: Date.now(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: '1.0.0'
            });
        });
        // Metrics endpoint (Prometheus-like format)
        this.app.get('/metrics', (req, res) => {
            try {
                const metrics = this.generatePrometheusFormat();
                res.set('Content-Type', 'text/plain');
                res.end(metrics);
            }
            catch (error) {
                console.error('❌ Error generating metrics:', error);
                res.status(500).end('Error generating metrics');
            }
        });
        // Custom metrics endpoint (JSON format)
        this.app.get('/metrics/json', (req, res) => {
            try {
                const metrics = {
                    counters: Object.fromEntries(this.counters),
                    gauges: Object.fromEntries(this.gauges),
                    histograms: this.getHistogramSummaries(),
                    strategies: Object.fromEntries(this.strategyMetrics),
                    system: this.systemMetrics,
                    timestamp: Date.now()
                };
                res.json(metrics);
            }
            catch (error) {
                console.error('❌ Error generating JSON metrics:', error);
                res.status(500).json({ error: 'Error generating metrics' });
            }
        });
        // Strategy metrics endpoint
        this.app.get('/metrics/strategies', (req, res) => {
            res.json(Object.fromEntries(this.strategyMetrics));
        });
        // System metrics endpoint
        this.app.get('/metrics/system', (req, res) => {
            res.json(this.systemMetrics);
        });
        // Reset metrics endpoint (for testing)
        this.app.post('/metrics/reset', (req, res) => {
            this.resetMetrics();
            res.json({ status: 'Metrics reset successfully' });
        });
    }
    /**
     * Start the monitoring server
     */
    async start() {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.port, () => {
                    console.log(`📊 Monitoring server started on port ${this.port}`);
                    console.log(`📈 Metrics endpoint: http://localhost:${this.port}/metrics`);
                    console.log(`🏥 Health endpoint: http://localhost:${this.port}/health`);
                    // Start collecting system metrics
                    this.startSystemMetricsCollection();
                    this.emit('started');
                    resolve();
                });
                this.server.on('error', (error) => {
                    console.error('❌ Monitoring server error:', error);
                    reject(error);
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Stop the monitoring server
     */
    async stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('📊 Monitoring server stopped');
                    this.emit('stopped');
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    }
    /**
     * Increment a counter metric
     */
    incrementCounter(name, value = 1, labels) {
        const key = this.buildMetricKey(name, labels);
        const current = this.counters.get(key) || 0;
        this.counters.set(key, current + value);
    }
    /**
     * Set a gauge metric
     */
    setGauge(name, value, labels) {
        const key = this.buildMetricKey(name, labels);
        this.gauges.set(key, {
            value,
            timestamp: Date.now(),
            labels
        });
    }
    /**
     * Record a histogram value
     */
    recordHistogram(name, value, labels) {
        const key = this.buildMetricKey(name, labels);
        if (!this.histograms.has(key)) {
            this.histograms.set(key, []);
        }
        this.histograms.get(key).push(value);
        // Keep only last 1000 values to prevent memory issues
        const values = this.histograms.get(key);
        if (values.length > 1000) {
            values.splice(0, values.length - 1000);
        }
    }
    /**
     * Record strategy signal generation
     */
    recordStrategySignal(strategy, signalType, symbol) {
        this.incrementCounter('strategy_signals_total', 1, { strategy, signal_type: signalType, symbol });
    }
    /**
     * Record strategy execution
     */
    recordStrategyExecution(strategy, side, symbol, status, executionTime) {
        this.incrementCounter('strategy_executions_total', 1, { strategy, side, symbol, status });
        this.recordHistogram('trade_execution_time_seconds', executionTime, { strategy, symbol });
    }
    /**
     * Update strategy performance metrics
     */
    updateStrategyMetrics(metrics) {
        this.strategyMetrics.set(metrics.strategyName, metrics);
        // Also update individual gauge metrics
        this.setGauge('strategy_profit_loss', metrics.profitLoss, { strategy: metrics.strategyName });
        this.setGauge('strategy_sharpe_ratio', metrics.sharpeRatio, { strategy: metrics.strategyName });
        this.setGauge('strategy_max_drawdown', metrics.maxDrawdown, { strategy: metrics.strategyName });
        this.setGauge('strategy_win_rate', metrics.winRate, { strategy: metrics.strategyName });
    }
    /**
     * Update system health metrics
     */
    updateSystemHealth(metrics) {
        this.systemMetrics = { ...metrics };
        // Update gauge metrics
        this.setGauge('system_cpu_usage_percent', metrics.cpuUsage);
        this.setGauge('system_memory_usage_bytes', metrics.memoryUsage);
        this.setGauge('system_uptime_seconds', metrics.uptime);
    }
    /**
     * Record system error
     */
    recordError(component, errorType, severity) {
        this.incrementCounter('system_errors_total', 1, { component, error_type: errorType, severity });
    }
    /**
     * Record market data latency
     */
    recordMarketDataLatency(exchange, symbol, feedType, latency) {
        this.recordHistogram('market_data_latency_seconds', latency, { exchange, symbol, feed_type: feedType });
    }
    /**
     * Record alert
     */
    recordAlert(type, severity, component) {
        this.incrementCounter('alerts_total', 1, { type, severity, component });
        if (severity === 'critical') {
            this.incrementCounter('critical_alerts_total', 1, { component, alert_type: type });
        }
    }
    /**
     * Build metric key with labels
     */
    buildMetricKey(name, labels) {
        if (!labels || Object.keys(labels).length === 0) {
            return name;
        }
        const labelStr = Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}="${value}"`)
            .join(',');
        return `${name}{${labelStr}}`;
    }
    /**
     * Generate Prometheus-compatible format
     */
    generatePrometheusFormat() {
        const lines = [];
        // Add counters
        for (const [key, value] of this.counters) {
            lines.push(`${key} ${value}`);
        }
        // Add gauges
        for (const [key, metric] of this.gauges) {
            lines.push(`${key} ${metric.value}`);
        }
        // Add histogram summaries
        for (const [key, values] of this.histograms) {
            if (values.length > 0) {
                const sum = values.reduce((a, b) => a + b, 0);
                const count = values.length;
                lines.push(`${key}_sum ${sum}`);
                lines.push(`${key}_count ${count}`);
                // Add percentiles
                const sorted = [...values].sort((a, b) => a - b);
                const p50 = sorted[Math.floor(sorted.length * 0.5)];
                const p95 = sorted[Math.floor(sorted.length * 0.95)];
                const p99 = sorted[Math.floor(sorted.length * 0.99)];
                lines.push(`${key}_p50 ${p50 || 0}`);
                lines.push(`${key}_p95 ${p95 || 0}`);
                lines.push(`${key}_p99 ${p99 || 0}`);
            }
        }
        return lines.join('\n') + '\n';
    }
    /**
     * Get histogram summaries
     */
    getHistogramSummaries() {
        const summaries = {};
        for (const [key, values] of this.histograms) {
            if (values.length > 0) {
                const sorted = [...values].sort((a, b) => a - b);
                summaries[key] = {
                    count: values.length,
                    sum: values.reduce((a, b) => a + b, 0),
                    min: sorted[0],
                    max: sorted[sorted.length - 1],
                    avg: values.reduce((a, b) => a + b, 0) / values.length,
                    p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
                    p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
                    p99: sorted[Math.floor(sorted.length * 0.99)] || 0
                };
            }
        }
        return summaries;
    }
    /**
     * Start automatic system metrics collection
     */
    startSystemMetricsCollection() {
        setInterval(() => {
            // Collect Node.js metrics
            const memUsage = process.memoryUsage();
            const uptime = process.uptime();
            this.updateSystemHealth({
                cpuUsage: 0, // Would need external library for real CPU usage
                memoryUsage: memUsage.heapUsed,
                diskUsage: 0, // Would need external library for disk usage
                networkLatency: 0, // Would be measured during network operations
                errorRate: 0, // Calculated from error counters
                uptime: uptime
            });
        }, 5000); // Collect every 5 seconds
    }
    /**
     * Reset all metrics
     */
    resetMetrics() {
        this.counters.clear();
        this.gauges.clear();
        this.histograms.clear();
        this.strategyMetrics.clear();
        console.log('🧹 All metrics reset');
    }
    /**
     * Get monitoring status
     */
    getStatus() {
        return {
            running: this.server !== null,
            port: this.port,
            metricsCount: this.counters.size + this.gauges.size + this.histograms.size,
            endpoints: [
                `http://localhost:${this.port}/health`,
                `http://localhost:${this.port}/metrics`,
                `http://localhost:${this.port}/metrics/json`,
                `http://localhost:${this.port}/metrics/strategies`,
                `http://localhost:${this.port}/metrics/system`
            ]
        };
    }
}
exports.SimpleMonitoring = SimpleMonitoring;
// Export default instance
exports.default = new SimpleMonitoring();

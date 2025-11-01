"use strict";
/**
 * 🚀 [PRODUCTION-OPERATIONAL]
 * Production monitoring component
 */
/**
 * 📊 METRICS COLLECTOR
 * Enterprise metrics collection and reporting system
 * Collects application, business, and system metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCollector = void 0;
/**
 * Metrics collection service
 */
class MetricsCollector {
    constructor(logger) {
        this.logger = logger;
        this.metrics = new Map();
        this.counters = new Map();
        this.gauges = new Map();
        this.histograms = new Map();
        this.timers = new Map();
        this.isRunning = false;
        this.logger.info('📊 Metrics Collector initialized');
    }
    /**
     * Start metrics collection
     */
    async start() {
        if (this.isRunning) {
            return;
        }
        this.isRunning = true;
        // Start collecting system metrics every 10 seconds
        this.collectInterval = setInterval(() => {
            this.collectSystemMetrics();
        }, 10000);
        this.logger.info('✅ Metrics collection started');
    }
    /**
     * Stop metrics collection
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        if (this.collectInterval) {
            clearInterval(this.collectInterval);
            this.collectInterval = undefined;
        }
        this.logger.info('🛑 Metrics collection stopped');
    }
    /**
     * Increment a counter metric
     */
    incrementCounter(name, value = 1, tags) {
        const current = this.counters.get(name) || 0;
        this.counters.set(name, current + value);
        this.recordMetric({
            name,
            value: current + value,
            timestamp: new Date(),
            tags,
            type: 'counter'
        });
    }
    /**
     * Set a gauge metric
     */
    setGauge(name, value, tags) {
        this.gauges.set(name, value);
        this.recordMetric({
            name,
            value,
            timestamp: new Date(),
            tags,
            type: 'gauge'
        });
    }
    /**
     * Record a histogram value
     */
    recordHistogram(name, value, tags) {
        const values = this.histograms.get(name) || [];
        values.push(value);
        this.histograms.set(name, values);
        this.recordMetric({
            name,
            value,
            timestamp: new Date(),
            tags,
            type: 'histogram'
        });
    }
    /**
     * Record a timer value
     */
    recordTimer(name, duration, tags) {
        const times = this.timers.get(name) || [];
        times.push(duration);
        this.timers.set(name, times);
        this.recordMetric({
            name,
            value: duration,
            timestamp: new Date(),
            tags,
            type: 'timer'
        });
    }
    /**
     * Time a function execution
     */
    timeFunction(name, fn, tags) {
        const start = process.hrtime.bigint();
        try {
            const result = fn();
            const duration = Number(process.hrtime.bigint() - start) / 1e6; // Convert to ms
            this.recordTimer(name, duration, tags);
            return result;
        }
        catch (error) {
            const duration = Number(process.hrtime.bigint() - start) / 1e6;
            this.recordTimer(name, duration, { ...tags, error: 'true' });
            throw error;
        }
    }
    /**
     * Time an async function execution
     */
    async timeAsyncFunction(name, fn, tags) {
        const start = process.hrtime.bigint();
        try {
            const result = await fn();
            const duration = Number(process.hrtime.bigint() - start) / 1e6;
            this.recordTimer(name, duration, tags);
            return result;
        }
        catch (error) {
            const duration = Number(process.hrtime.bigint() - start) / 1e6;
            this.recordTimer(name, duration, { ...tags, error: 'true' });
            throw error;
        }
    }
    /**
     * Get all metrics summary
     */
    getAllMetrics() {
        const counters = {};
        for (const [name, value] of this.counters) {
            counters[name] = value;
        }
        const gauges = {};
        for (const [name, value] of this.gauges) {
            gauges[name] = value;
        }
        const histograms = {};
        for (const [name, values] of this.histograms) {
            const sum = values.reduce((a, b) => a + b, 0);
            histograms[name] = {
                count: values.length,
                sum,
                avg: values.length > 0 ? sum / values.length : 0
            };
        }
        const timers = {};
        for (const [name, times] of this.timers) {
            const totalTime = times.reduce((a, b) => a + b, 0);
            timers[name] = {
                count: times.length,
                totalTime,
                avgTime: times.length > 0 ? totalTime / times.length : 0
            };
        }
        return { counters, gauges, histograms, timers };
    }
    /**
     * Get metrics for specific type
     */
    getMetrics(type) {
        switch (type) {
            case 'counter':
                return Object.fromEntries(this.counters);
            case 'gauge':
                return Object.fromEntries(this.gauges);
            case 'histogram':
                const histograms = {};
                for (const [name, values] of this.histograms) {
                    const sum = values.reduce((a, b) => a + b, 0);
                    histograms[name] = {
                        count: values.length,
                        sum,
                        avg: values.length > 0 ? sum / values.length : 0,
                        min: values.length > 0 ? Math.min(...values) : 0,
                        max: values.length > 0 ? Math.max(...values) : 0
                    };
                }
                return histograms;
            case 'timer':
                const timers = {};
                for (const [name, times] of this.timers) {
                    const totalTime = times.reduce((a, b) => a + b, 0);
                    timers[name] = {
                        count: times.length,
                        totalTime,
                        avgTime: times.length > 0 ? totalTime / times.length : 0,
                        minTime: times.length > 0 ? Math.min(...times) : 0,
                        maxTime: times.length > 0 ? Math.max(...times) : 0
                    };
                }
                return timers;
            default:
                return {};
        }
    }
    /**
     * Clear all metrics (useful for testing)
     */
    clear() {
        this.metrics.clear();
        this.counters.clear();
        this.gauges.clear();
        this.histograms.clear();
        this.timers.clear();
    }
    /**
     * Export metrics in Prometheus format
     */
    toPrometheusFormat() {
        const lines = [];
        // Export counters
        for (const [name, value] of this.counters) {
            lines.push(`# TYPE ${name} counter`);
            lines.push(`${name} ${value}`);
        }
        // Export gauges
        for (const [name, value] of this.gauges) {
            lines.push(`# TYPE ${name} gauge`);
            lines.push(`${name} ${value}`);
        }
        // Export histograms
        for (const [name, values] of this.histograms) {
            const sum = values.reduce((a, b) => a + b, 0);
            lines.push(`# TYPE ${name} histogram`);
            lines.push(`${name}_sum ${sum}`);
            lines.push(`${name}_count ${values.length}`);
        }
        return lines.join('\n');
    }
    /**
     * Record a metric internally
     */
    recordMetric(metric) {
        const metrics = this.metrics.get(metric.name) || [];
        metrics.push(metric);
        // Keep only last 1000 metrics per name to prevent memory leaks
        if (metrics.length > 1000) {
            metrics.splice(0, metrics.length - 1000);
        }
        this.metrics.set(metric.name, metrics);
    }
    /**
     * Collect system metrics
     */
    collectSystemMetrics() {
        // Memory metrics
        const memUsage = process.memoryUsage();
        this.setGauge('system.memory.heap_used', memUsage.heapUsed);
        this.setGauge('system.memory.heap_total', memUsage.heapTotal);
        this.setGauge('system.memory.external', memUsage.external);
        this.setGauge('system.memory.rss', memUsage.rss);
        // Process metrics
        this.setGauge('system.process.uptime', process.uptime());
        this.setGauge('system.process.cpu_usage', process.cpuUsage().user / 1000000); // Convert to seconds
        // Event loop lag
        const start = process.hrtime.bigint();
        setImmediate(() => {
            const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to ms
            this.setGauge('system.event_loop.lag', lag);
        });
    }
}
exports.MetricsCollector = MetricsCollector;

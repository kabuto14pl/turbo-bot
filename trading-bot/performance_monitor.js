"use strict";
/**
 * Performance Monitor - Stub Implementation
 * Monitors system performance metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = void 0;
class PerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.isMonitoring = false;
        this.interval = null;
        // Initialize monitor
    }
    start() {
        this.isMonitoring = true;
        this.interval = setInterval(() => {
            this.recordMetrics();
        }, 1000);
    }
    stop() {
        this.isMonitoring = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    recordMetrics() {
        this.metrics.push({
            timestamp: Date.now(),
            cpuUsage: 0,
            memoryUsage: 0,
            latency: 0,
            throughput: 0
        });
        // Keep only last 1000 metrics
        if (this.metrics.length > 1000) {
            this.metrics.shift();
        }
    }
    getMetrics() {
        return [...this.metrics];
    }
    getCurrentMetrics() {
        return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
    }
    getAverageMetrics() {
        if (this.metrics.length === 0)
            return {};
        const sum = this.metrics.reduce((acc, m) => ({
            cpuUsage: acc.cpuUsage + m.cpuUsage,
            memoryUsage: acc.memoryUsage + m.memoryUsage,
            latency: acc.latency + m.latency,
            throughput: acc.throughput + m.throughput
        }), { cpuUsage: 0, memoryUsage: 0, latency: 0, throughput: 0 });
        return {
            cpuUsage: sum.cpuUsage / this.metrics.length,
            memoryUsage: sum.memoryUsage / this.metrics.length,
            latency: sum.latency / this.metrics.length,
            throughput: sum.throughput / this.metrics.length
        };
    }
    clear() {
        this.metrics = [];
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
exports.default = PerformanceMonitor;

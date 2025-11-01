"use strict";
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Enterprise testing component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * Enterprise Load Testing Framework
 * Comprehensive stress testing for trading bot with high-frequency data simulation
 * Features: Concurrent strategy testing, market data simulation, performance benchmarking
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadTestConfigs = exports.EnterpriseLoadTester = void 0;
const events_1 = require("events");
const cluster = __importStar(require("cluster"));
const os = __importStar(require("os"));
class EnterpriseLoadTester extends events_1.EventEmitter {
    constructor(maxWorkers = os.cpus().length) {
        super();
        this.maxWorkers = maxWorkers;
        this.workers = [];
        this.results = [];
        this.currentTest = null;
        this.startTime = 0;
        this.metrics = new Map();
        this.setupClusterEvents();
    }
    setupClusterEvents() {
        // Use isPrimary for newer Node.js versions, isMaster for compatibility
        const isPrimary = cluster.isPrimary !== undefined ? cluster.isPrimary : cluster.isMaster;
        if (isPrimary) {
            cluster.on('exit', (worker, code, signal) => {
                console.log(`[LOAD TESTER] Worker ${worker.process.pid} died (${signal || code})`);
                this.workers = this.workers.filter(w => w.id !== worker.id);
            });
            cluster.on('message', (worker, message) => {
                this.handleWorkerMessage(worker, message);
            });
        }
    }
    handleWorkerMessage(worker, message) {
        switch (message.type) {
            case 'metrics':
                this.aggregateMetrics(message.data);
                break;
            case 'error':
                this.handleWorkerError(message.data);
                break;
            case 'completed':
                this.handleWorkerCompletion(worker, message.data);
                break;
        }
    }
    async runLoadTest(config) {
        console.log(`[LOAD TESTER] Starting load test: ${config.name}`);
        console.log(`[LOAD TESTER] Config: ${config.concurrency} workers, ${config.duration}s duration, ${config.targetTPS} TPS`);
        this.currentTest = config;
        this.startTime = Date.now();
        this.metrics.clear();
        // Start monitoring
        const monitoringInterval = this.startMonitoring();
        try {
            // Spawn worker processes
            await this.spawnWorkers(config);
            // Wait for test completion
            await this.waitForCompletion(config.duration);
            // Collect results
            const result = await this.collectResults();
            clearInterval(monitoringInterval);
            await this.cleanup();
            console.log(`[LOAD TESTER] Load test completed: ${result.testName}`);
            this.logResults(result);
            return result;
        }
        catch (error) {
            clearInterval(monitoringInterval);
            await this.cleanup();
            throw error;
        }
    }
    async spawnWorkers(config) {
        const workerCount = Math.min(config.concurrency, this.maxWorkers);
        const rampUpDelay = (config.rampUpTime * 1000) / workerCount;
        for (let i = 0; i < workerCount; i++) {
            // Ramp up workers gradually
            await new Promise(resolve => setTimeout(resolve, rampUpDelay));
            const worker = cluster.fork({
                LOAD_TEST_CONFIG: JSON.stringify(config),
                WORKER_ID: i.toString(),
                WORKER_COUNT: workerCount.toString()
            });
            this.workers.push(worker);
            console.log(`[LOAD TESTER] Spawned worker ${worker.process.pid} (${i + 1}/${workerCount})`);
        }
    }
    startMonitoring() {
        return setInterval(() => {
            const memUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            this.recordMetric('memory.heapUsed', memUsage.heapUsed);
            this.recordMetric('memory.rss', memUsage.rss);
            this.recordMetric('cpu.user', cpuUsage.user);
            this.recordMetric('cpu.system', cpuUsage.system);
        }, 1000); // Every second
    }
    recordMetric(name, value) {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        this.metrics.get(name).push(value);
    }
    aggregateMetrics(data) {
        Object.keys(data).forEach(key => {
            this.recordMetric(`worker.${key}`, data[key]);
        });
    }
    handleWorkerError(error) {
        console.error(`[LOAD TESTER] Worker error: ${error.message}`);
        this.emit('error', error);
    }
    handleWorkerCompletion(worker, data) {
        console.log(`[LOAD TESTER] Worker ${worker.process.pid} completed`);
        this.emit('workerCompleted', data);
    }
    async waitForCompletion(duration) {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`[LOAD TESTER] Test duration completed (${duration}s)`);
                resolve();
            }, duration * 1000);
        });
    }
    async collectResults() {
        const endTime = Date.now();
        const duration = (endTime - this.startTime) / 1000;
        // Calculate aggregated metrics
        const totalRequests = this.getMetricSum('worker.requests') || 0;
        const successfulRequests = this.getMetricSum('worker.success') || 0;
        const failedRequests = totalRequests - successfulRequests;
        const responseTimes = this.getAllMetricValues('worker.responseTime');
        const result = {
            testName: this.currentTest.name,
            startTime: this.startTime,
            endTime,
            duration,
            totalRequests,
            successfulRequests,
            failedRequests,
            averageResponseTime: this.calculateAverage(responseTimes),
            p95ResponseTime: this.calculatePercentile(responseTimes, 95),
            p99ResponseTime: this.calculatePercentile(responseTimes, 99),
            maxResponseTime: Math.max(...responseTimes, 0),
            throughput: totalRequests / duration,
            errorRate: (failedRequests / totalRequests) * 100 || 0,
            memoryUsage: this.calculateMemoryMetrics(),
            cpuUsage: this.calculateCpuMetrics(),
            validationResults: this.validateResults(),
            errors: [] // Will be populated by workers
        };
        this.results.push(result);
        return result;
    }
    getMetricSum(name) {
        const values = this.metrics.get(name) || [];
        return values.reduce((sum, val) => sum + val, 0);
    }
    getAllMetricValues(prefix) {
        const values = [];
        this.metrics.forEach((metricValues, key) => {
            if (key.startsWith(prefix)) {
                values.push(...metricValues);
            }
        });
        return values;
    }
    calculateAverage(values) {
        if (values.length === 0)
            return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    calculatePercentile(values, percentile) {
        if (values.length === 0)
            return 0;
        const sorted = values.sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }
    calculateMemoryMetrics() {
        const heapValues = this.metrics.get('memory.heapUsed') || [];
        const rssValues = this.metrics.get('memory.rss') || [];
        return {
            peakHeapUsed: Math.max(...heapValues, 0),
            peakRSS: Math.max(...rssValues, 0),
            averageHeapUsed: this.calculateAverage(heapValues),
            gcCount: this.getMetricSum('worker.gcCount'),
            gcDuration: this.getMetricSum('worker.gcDuration')
        };
    }
    calculateCpuMetrics() {
        const userValues = this.metrics.get('cpu.user') || [];
        const systemValues = this.metrics.get('cpu.system') || [];
        const totalCpu = userValues.map((user, i) => user + (systemValues[i] || 0));
        return {
            peakCpuUsage: Math.max(...totalCpu, 0),
            averageCpuUsage: this.calculateAverage(totalCpu),
            systemLoad: os.loadavg()
        };
    }
    validateResults() {
        const results = [];
        if (!this.currentTest)
            return results;
        this.currentTest.scenarios.forEach(scenario => {
            scenario.validation.forEach(rule => {
                const actualValue = this.getValidationValue(rule.metric);
                const passed = this.evaluateValidationRule(rule, actualValue);
                results.push({
                    rule,
                    passed,
                    actualValue,
                    message: passed ? 'Validation passed' : `Validation failed: ${rule.metric} ${rule.operator} ${rule.value}`
                });
            });
        });
        return results;
    }
    getValidationValue(metric) {
        switch (metric) {
            case 'errorRate':
                return this.getMetricSum('worker.failed') / this.getMetricSum('worker.requests') * 100;
            case 'averageResponseTime':
                return this.calculateAverage(this.getAllMetricValues('worker.responseTime'));
            case 'throughput':
                const duration = (Date.now() - this.startTime) / 1000;
                return this.getMetricSum('worker.requests') / duration;
            case 'peakMemory':
                return Math.max(...(this.metrics.get('memory.heapUsed') || []), 0);
            default:
                return 0;
        }
    }
    evaluateValidationRule(rule, actualValue) {
        switch (rule.operator) {
            case 'gt': return actualValue > rule.value;
            case 'lt': return actualValue < rule.value;
            case 'eq': return actualValue === rule.value;
            case 'gte': return actualValue >= rule.value;
            case 'lte': return actualValue <= rule.value;
            default: return false;
        }
    }
    async cleanup() {
        console.log('[LOAD TESTER] Cleaning up workers...');
        const killPromises = this.workers.map(worker => {
            return new Promise((resolve) => {
                worker.once('exit', () => resolve());
                worker.kill('SIGTERM');
                // Force kill after 5 seconds
                setTimeout(() => {
                    if (!worker.isDead()) {
                        worker.kill('SIGKILL');
                        resolve();
                    }
                }, 5000);
            });
        });
        await Promise.all(killPromises);
        this.workers = [];
    }
    logResults(result) {
        console.log('\n=== LOAD TEST RESULTS ===');
        console.log(`Test: ${result.testName}`);
        console.log(`Duration: ${result.duration.toFixed(2)}s`);
        console.log(`Total Requests: ${result.totalRequests.toLocaleString()}`);
        console.log(`Successful: ${result.successfulRequests.toLocaleString()} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%)`);
        console.log(`Failed: ${result.failedRequests.toLocaleString()} (${result.errorRate.toFixed(2)}%)`);
        console.log(`Throughput: ${result.throughput.toFixed(2)} req/s`);
        console.log(`Response Times:`);
        console.log(`  Average: ${result.averageResponseTime.toFixed(2)}ms`);
        console.log(`  95th percentile: ${result.p95ResponseTime.toFixed(2)}ms`);
        console.log(`  99th percentile: ${result.p99ResponseTime.toFixed(2)}ms`);
        console.log(`  Max: ${result.maxResponseTime.toFixed(2)}ms`);
        console.log(`Memory:`);
        console.log(`  Peak Heap: ${(result.memoryUsage.peakHeapUsed / 1024 / 1024).toFixed(2)}MB`);
        console.log(`  Peak RSS: ${(result.memoryUsage.peakRSS / 1024 / 1024).toFixed(2)}MB`);
        console.log(`CPU:`);
        console.log(`  Peak Usage: ${result.cpuUsage.peakCpuUsage.toFixed(2)}`);
        console.log(`  Average Usage: ${result.cpuUsage.averageCpuUsage.toFixed(2)}`);
        console.log('========================\n');
    }
    getResults() {
        return [...this.results];
    }
    exportResults(filename) {
        const fs = require('fs');
        const path = require('path');
        const exportFile = filename || `load-test-results-${Date.now()}.json`;
        const exportPath = path.join(process.cwd(), 'monitoring', 'load_test_results', exportFile);
        // Ensure directory exists
        const dir = path.dirname(exportPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(exportPath, JSON.stringify(this.results, null, 2));
        console.log(`[LOAD TESTER] Results exported: ${exportPath}`);
        return exportPath;
    }
}
exports.EnterpriseLoadTester = EnterpriseLoadTester;
// Predefined load test configurations
exports.LoadTestConfigs = {
    // Light load test for development
    development: {
        name: 'Development Load Test',
        duration: 60,
        concurrency: 5,
        rampUpTime: 10,
        targetTPS: 10,
        dataFrequency: 1,
        scenarios: [
            {
                name: 'Basic Trading Operations',
                weight: 100,
                actions: [
                    { type: 'market_data', params: { symbol: 'BTCUSDT' } },
                    { type: 'portfolio_check', params: {} },
                    { type: 'strategy_signal', params: { strategy: 'AdvancedAdaptive' } }
                ],
                validation: [
                    { metric: 'errorRate', operator: 'lt', value: 5, severity: 'error' },
                    { metric: 'averageResponseTime', operator: 'lt', value: 100, severity: 'warning' }
                ]
            }
        ]
    },
    // Production-like load test
    production: {
        name: 'Production Load Test',
        duration: 300,
        concurrency: 50,
        rampUpTime: 60,
        targetTPS: 100,
        dataFrequency: 10,
        scenarios: [
            {
                name: 'High Frequency Trading',
                weight: 70,
                actions: [
                    { type: 'market_data', params: { symbol: 'BTCUSDT' } },
                    { type: 'strategy_signal', params: { strategy: 'AdvancedAdaptive' } },
                    { type: 'place_order', params: { type: 'market', side: 'buy' } }
                ],
                validation: [
                    { metric: 'errorRate', operator: 'lt', value: 1, severity: 'error' },
                    { metric: 'averageResponseTime', operator: 'lt', value: 50, severity: 'error' },
                    { metric: 'throughput', operator: 'gt', value: 80, severity: 'warning' }
                ]
            },
            {
                name: 'Portfolio Management',
                weight: 30,
                actions: [
                    { type: 'portfolio_check', params: {} },
                    { type: 'cancel_order', params: { orderId: 'test' } }
                ],
                validation: [
                    { metric: 'errorRate', operator: 'lt', value: 2, severity: 'warning' }
                ]
            }
        ]
    },
    // Stress test to find breaking point
    stress: {
        name: 'Stress Test',
        duration: 600,
        concurrency: 200,
        rampUpTime: 120,
        targetTPS: 500,
        dataFrequency: 50,
        scenarios: [
            {
                name: 'Maximum Load Scenario',
                weight: 100,
                actions: [
                    { type: 'market_data', params: { symbol: 'BTCUSDT' } },
                    { type: 'strategy_signal', params: { strategy: 'AdvancedAdaptive' } },
                    { type: 'portfolio_check', params: {} },
                    { type: 'place_order', params: { type: 'limit', side: 'buy' } }
                ],
                validation: [
                    { metric: 'errorRate', operator: 'lt', value: 10, severity: 'warning' },
                    { metric: 'averageResponseTime', operator: 'lt', value: 200, severity: 'warning' },
                    { metric: 'peakMemory', operator: 'lt', value: 2000000000, severity: 'error' } // 2GB
                ]
            }
        ]
    }
};

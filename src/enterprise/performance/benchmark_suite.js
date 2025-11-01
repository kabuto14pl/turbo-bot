"use strict";
/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * Enterprise Performance Benchmarking Suite
 * Comprehensive latency measurement, throughput analysis, and regression testing
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
exports.EnterpriseBenchmarkSuite = void 0;
const events_1 = require("events");
const perf_hooks_1 = require("perf_hooks");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class EnterpriseBenchmarkSuite extends events_1.EventEmitter {
    constructor() {
        super();
        this.results = new Map();
        this.baselines = new Map();
        this.currentBaseline = null;
        this.performanceObserver = null;
        this.setupPerformanceObserver();
    }
    setupPerformanceObserver() {
        try {
            if (typeof perf_hooks_1.PerformanceObserver !== 'undefined') {
                this.performanceObserver = new perf_hooks_1.PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    for (const entry of entries) {
                        if (entry.entryType === 'measure') {
                            this.emit('measure', {
                                name: entry.name,
                                duration: entry.duration,
                                startTime: entry.startTime
                            });
                        }
                    }
                });
                this.performanceObserver.observe({ entryTypes: ['measure'] });
            }
            else {
                console.warn('PerformanceObserver not available in this environment');
            }
        }
        catch (error) {
            console.warn('Failed to setup PerformanceObserver:', error);
        }
    }
    async runBenchmark(name, testFunction, config = {}) {
        const fullConfig = {
            name,
            iterations: 1000,
            warmupIterations: 100,
            concurrency: 1,
            timeout: 30000,
            tags: [],
            ...config
        };
        console.log(`[BENCHMARK] Starting benchmark: ${name}`);
        console.log(`[BENCHMARK] Config: ${fullConfig.iterations} iterations, ${fullConfig.concurrency} concurrency`);
        const result = await this.executeBenchmark(testFunction, fullConfig);
        // Store result
        if (!this.results.has(name)) {
            this.results.set(name, []);
        }
        this.results.get(name).push(result);
        // Perform regression analysis
        result.regressionAnalysis = this.analyzeRegression(name, result);
        console.log(`[BENCHMARK] Completed: ${name}`);
        this.logBenchmarkResult(result);
        this.emit('benchmarkCompleted', result);
        return result;
    }
    async executeBenchmark(testFunction, config) {
        const measurements = [];
        const memorySnapshots = [];
        let successfulIterations = 0;
        let failedIterations = 0;
        let gcEvents = 0;
        let gcDuration = 0;
        // Setup GC monitoring
        const gcObserver = new perf_hooks_1.PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
                if (entry.entryType === 'gc') {
                    gcEvents++;
                    gcDuration += entry.duration;
                }
            });
        });
        gcObserver.observe({ entryTypes: ['gc'] });
        const initialMemory = process.memoryUsage();
        let peakMemory = initialMemory.heapUsed;
        const startTime = perf_hooks_1.performance.now();
        const initialCpuUsage = process.cpuUsage();
        // Warmup phase
        console.log(`[BENCHMARK] Warming up (${config.warmupIterations} iterations)...`);
        for (let i = 0; i < config.warmupIterations; i++) {
            try {
                await testFunction();
            }
            catch (error) {
                // Ignore warmup errors
            }
        }
        // Main benchmark phase
        console.log(`[BENCHMARK] Running main benchmark (${config.iterations} iterations)...`);
        if (config.concurrency === 1) {
            // Sequential execution
            for (let i = 0; i < config.iterations; i++) {
                const iterationStart = perf_hooks_1.performance.now();
                try {
                    await testFunction();
                    const iterationEnd = perf_hooks_1.performance.now();
                    measurements.push(iterationEnd - iterationStart);
                    successfulIterations++;
                }
                catch (error) {
                    failedIterations++;
                }
                // Track memory usage
                const currentMemory = process.memoryUsage().heapUsed;
                memorySnapshots.push(currentMemory);
                if (currentMemory > peakMemory) {
                    peakMemory = currentMemory;
                }
                // Progress reporting
                if ((i + 1) % Math.max(1, Math.floor(config.iterations / 10)) === 0) {
                    const progress = ((i + 1) / config.iterations * 100).toFixed(1);
                    console.log(`[BENCHMARK] Progress: ${progress}% (${i + 1}/${config.iterations})`);
                }
            }
        }
        else {
            // Concurrent execution
            const concurrentPromises = [];
            const semaphore = new Array(config.concurrency).fill(null);
            for (let i = 0; i < config.iterations; i++) {
                const promise = this.executeConcurrentIteration(testFunction, measurements, i);
                concurrentPromises.push(promise);
                if (concurrentPromises.length >= config.concurrency) {
                    await Promise.race(concurrentPromises);
                    // Remove completed promises
                    for (let j = concurrentPromises.length - 1; j >= 0; j--) {
                        if (await this.isPromiseResolved(concurrentPromises[j])) {
                            concurrentPromises.splice(j, 1);
                        }
                    }
                }
            }
            // Wait for remaining promises
            await Promise.all(concurrentPromises);
            successfulIterations = measurements.length;
            failedIterations = config.iterations - successfulIterations;
        }
        const endTime = perf_hooks_1.performance.now();
        const finalCpuUsage = process.cpuUsage(initialCpuUsage);
        const finalMemory = process.memoryUsage();
        gcObserver.disconnect();
        // Calculate metrics
        const totalDuration = endTime - startTime;
        const metrics = this.calculateMetrics(measurements, totalDuration);
        const memoryProfile = this.calculateMemoryProfile(initialMemory, finalMemory, memorySnapshots, peakMemory, gcEvents, gcDuration);
        const cpuMetrics = this.calculateCpuMetrics(finalCpuUsage, totalDuration);
        const percentiles = this.calculatePercentiles(measurements);
        return {
            name: config.name,
            config,
            startTime,
            endTime,
            totalDuration,
            iterations: config.iterations,
            successfulIterations,
            failedIterations,
            metrics: {
                ...metrics,
                cpuUsage: cpuMetrics
            },
            memoryProfile,
            regressionAnalysis: {
                isRegression: false,
                baselineComparison: null,
                regressionSeverity: 'none',
                affectedMetrics: []
            },
            percentiles
        };
    }
    async executeConcurrentIteration(testFunction, measurements, index) {
        const start = perf_hooks_1.performance.now();
        try {
            await testFunction();
            const end = perf_hooks_1.performance.now();
            measurements.push(end - start);
        }
        catch (error) {
            // Error will be counted in failed iterations
        }
    }
    async isPromiseResolved(promise) {
        try {
            await Promise.race([promise, new Promise(resolve => setTimeout(resolve, 0))]);
            return true;
        }
        catch {
            return true; // Consider rejected promises as resolved for counting purposes
        }
    }
    calculateMetrics(measurements, totalDuration) {
        if (measurements.length === 0) {
            return {
                averageLatency: 0,
                medianLatency: 0,
                minLatency: 0,
                maxLatency: 0,
                standardDeviation: 0,
                throughput: 0,
                errorRate: 100
            };
        }
        const sorted = [...measurements].sort((a, b) => a - b);
        const sum = measurements.reduce((a, b) => a + b, 0);
        const average = sum / measurements.length;
        const median = sorted[Math.floor(sorted.length / 2)];
        const variance = measurements.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / measurements.length;
        const standardDeviation = Math.sqrt(variance);
        return {
            averageLatency: average,
            medianLatency: median,
            minLatency: Math.min(...measurements),
            maxLatency: Math.max(...measurements),
            standardDeviation,
            throughput: (measurements.length / totalDuration) * 1000, // ops per second
            errorRate: 0 // Will be calculated by caller
        };
    }
    calculateMemoryProfile(initial, final, snapshots, peak, gcEvents, gcDuration) {
        const average = snapshots.length > 0 ? snapshots.reduce((a, b) => a + b, 0) / snapshots.length : initial.heapUsed;
        return {
            initialHeap: initial.heapUsed,
            finalHeap: final.heapUsed,
            peakHeap: peak,
            averageHeap: average,
            heapGrowth: final.heapUsed - initial.heapUsed,
            gcEvents,
            gcDuration
        };
    }
    calculateCpuMetrics(cpuUsage, duration) {
        const totalCpuTime = cpuUsage.user + cpuUsage.system;
        const cpuUsagePercent = (totalCpuTime / (duration * 1000)) * 100; // Convert to percentage
        return {
            averageUsage: cpuUsagePercent,
            peakUsage: cpuUsagePercent, // Simplified - would need continuous monitoring
            userTime: cpuUsage.user,
            systemTime: cpuUsage.system
        };
    }
    calculatePercentiles(measurements) {
        if (measurements.length === 0) {
            return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, p999: 0 };
        }
        const sorted = [...measurements].sort((a, b) => a - b);
        const getPercentile = (p) => {
            const index = Math.ceil((p / 100) * sorted.length) - 1;
            return sorted[Math.max(0, index)];
        };
        return {
            p50: getPercentile(50),
            p75: getPercentile(75),
            p90: getPercentile(90),
            p95: getPercentile(95),
            p99: getPercentile(99),
            p999: getPercentile(99.9)
        };
    }
    analyzeRegression(name, result) {
        const baseline = this.baselines.get(name);
        if (!baseline) {
            return {
                isRegression: false,
                baselineComparison: null,
                regressionSeverity: 'none',
                affectedMetrics: []
            };
        }
        const latencyChange = ((result.metrics.averageLatency - baseline.metrics.averageLatency) / baseline.metrics.averageLatency) * 100;
        const throughputChange = ((result.metrics.throughput - baseline.metrics.throughput) / baseline.metrics.throughput) * 100;
        const memoryChange = ((result.memoryProfile.averageHeap - baseline.memoryProfile.averageHeap) / baseline.memoryProfile.averageHeap) * 100;
        const cpuChange = ((result.metrics.cpuUsage.averageUsage - baseline.metrics.cpuUsage.averageUsage) / baseline.metrics.cpuUsage.averageUsage) * 100;
        const comparison = {
            baselineDate: new Date(baseline.startTime).toISOString(),
            latencyChange,
            throughputChange,
            memoryChange,
            cpuChange
        };
        const affectedMetrics = [];
        let isRegression = false;
        let severity = 'none';
        // Define regression thresholds
        if (latencyChange > 20) {
            affectedMetrics.push('latency');
            isRegression = true;
            severity = latencyChange > 50 ? 'severe' : 'moderate';
        }
        if (throughputChange < -15) {
            affectedMetrics.push('throughput');
            isRegression = true;
            if (severity === 'none')
                severity = throughputChange < -30 ? 'severe' : 'moderate';
        }
        if (memoryChange > 25) {
            affectedMetrics.push('memory');
            isRegression = true;
            if (severity === 'none')
                severity = memoryChange > 50 ? 'severe' : 'moderate';
        }
        if (cpuChange > 20) {
            affectedMetrics.push('cpu');
            isRegression = true;
            if (severity === 'none')
                severity = cpuChange > 40 ? 'severe' : 'moderate';
        }
        // Minor regression if any metric is slightly degraded
        if (!isRegression && (latencyChange > 10 || throughputChange < -10 || memoryChange > 15 || cpuChange > 15)) {
            isRegression = true;
            severity = 'minor';
        }
        return {
            isRegression,
            baselineComparison: comparison,
            regressionSeverity: severity,
            affectedMetrics
        };
    }
    setBaseline(name, result) {
        if (result) {
            this.baselines.set(name, result);
        }
        else {
            const results = this.results.get(name);
            if (results && results.length > 0) {
                this.baselines.set(name, results[results.length - 1]);
            }
        }
        console.log(`[BENCHMARK] Baseline set for: ${name}`);
    }
    loadBaseline(filePath) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            const baselines = JSON.parse(data);
            Object.keys(baselines).forEach(name => {
                this.baselines.set(name, baselines[name]);
            });
            console.log(`[BENCHMARK] Loaded baselines from: ${filePath}`);
        }
        catch (error) {
            console.error(`[BENCHMARK] Failed to load baseline: ${error}`);
        }
    }
    saveBaseline(filePath) {
        try {
            const baselineData = {};
            this.baselines.forEach((result, name) => {
                baselineData[name] = result;
            });
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, JSON.stringify(baselineData, null, 2));
            console.log(`[BENCHMARK] Saved baselines to: ${filePath}`);
        }
        catch (error) {
            console.error(`[BENCHMARK] Failed to save baseline: ${error}`);
        }
    }
    async runBenchmarkSuite(suite) {
        console.log(`[BENCHMARK SUITE] Starting suite: ${suite.name}`);
        if (suite.baselineFile) {
            this.loadBaseline(suite.baselineFile);
        }
        const results = [];
        for (const benchmark of suite.benchmarks) {
            try {
                if (benchmark.setup) {
                    await benchmark.setup();
                }
                const result = await this.runBenchmark(benchmark.name, benchmark.test, benchmark.config);
                results.push(result);
                if (benchmark.teardown) {
                    await benchmark.teardown();
                }
            }
            catch (error) {
                console.error(`[BENCHMARK SUITE] Failed to run ${benchmark.name}:`, error);
            }
        }
        console.log(`[BENCHMARK SUITE] Completed suite: ${suite.name}`);
        this.generateSuiteReport(suite.name, results);
        return results;
    }
    generateSuiteReport(suiteName, results) {
        const reportPath = path.join(process.cwd(), 'monitoring', 'benchmark_reports', `${suiteName}-${Date.now()}.json`);
        const report = {
            suiteName,
            timestamp: new Date().toISOString(),
            totalBenchmarks: results.length,
            summary: this.generateSummary(results),
            results,
            regressions: results.filter(r => r.regressionAnalysis.isRegression)
        };
        const dir = path.dirname(reportPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`[BENCHMARK SUITE] Report saved: ${reportPath}`);
    }
    generateSummary(results) {
        const totalIterations = results.reduce((sum, r) => sum + r.iterations, 0);
        const avgLatency = results.reduce((sum, r) => sum + r.metrics.averageLatency, 0) / results.length;
        const avgThroughput = results.reduce((sum, r) => sum + r.metrics.throughput, 0) / results.length;
        const regressions = results.filter(r => r.regressionAnalysis.isRegression);
        return {
            totalIterations,
            averageLatency: avgLatency,
            averageThroughput: avgThroughput,
            regressionsFound: regressions.length,
            severeRegressions: regressions.filter(r => r.regressionAnalysis.regressionSeverity === 'severe').length
        };
    }
    logBenchmarkResult(result) {
        console.log('\n=== BENCHMARK RESULT ===');
        console.log(`Name: ${result.name}`);
        console.log(`Iterations: ${result.iterations} (${result.successfulIterations} successful)`);
        console.log(`Duration: ${result.totalDuration.toFixed(2)}ms`);
        console.log(`Average Latency: ${result.metrics.averageLatency.toFixed(2)}ms`);
        console.log(`Median Latency: ${result.metrics.medianLatency.toFixed(2)}ms`);
        console.log(`95th Percentile: ${result.percentiles.p95.toFixed(2)}ms`);
        console.log(`99th Percentile: ${result.percentiles.p99.toFixed(2)}ms`);
        console.log(`Throughput: ${result.metrics.throughput.toFixed(2)} ops/sec`);
        console.log(`Memory Growth: ${(result.memoryProfile.heapGrowth / 1024 / 1024).toFixed(2)}MB`);
        console.log(`GC Events: ${result.memoryProfile.gcEvents}`);
        if (result.regressionAnalysis.isRegression) {
            console.log(`⚠️  REGRESSION DETECTED (${result.regressionAnalysis.regressionSeverity})`);
            console.log(`Affected metrics: ${result.regressionAnalysis.affectedMetrics.join(', ')}`);
        }
        console.log('========================\n');
    }
    getResults(benchmarkName) {
        if (benchmarkName) {
            return this.results.get(benchmarkName) || [];
        }
        const allResults = [];
        this.results.forEach(results => {
            allResults.push(...results);
        });
        return allResults;
    }
    clearResults() {
        this.results.clear();
    }
    disconnect() {
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
            this.performanceObserver = null;
        }
    }
}
exports.EnterpriseBenchmarkSuite = EnterpriseBenchmarkSuite;

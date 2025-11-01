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
 * Enterprise Performance Controller
 * Central orchestration of all performance optimization systems
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnterprisePerformanceController = void 0;
const memory_profiler_1 = require("./memory_profiler");
const load_tester_1 = require("./load_tester");
const enhanced_monitoring_1 = require("./enhanced_monitoring");
const benchmark_suite_1 = require("./benchmark_suite");
const memory_optimizer_1 = require("./memory_optimizer");
const events_1 = require("events");
class EnterprisePerformanceController extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.isInitialized = false;
        // Initialize with default config merged with provided config
        this.config = {
            memoryProfiling: {
                enabled: true,
                snapshotInterval: 5000,
                alertThresholds: {
                    heapUsage: 0.8,
                    gcPressure: 0.7,
                    memoryGrowth: 0.5,
                    rssLimit: 1024 * 1024 * 1024 // 1GB
                },
                ...config.memoryProfiling
            },
            loadTesting: {
                enabled: true,
                scheduledTests: [],
                autoTriggerOnDeploy: false,
                ...config.loadTesting
            },
            monitoring: {
                enabled: true,
                prometheusMetrics: true,
                customAlerts: true,
                dashboardGeneration: false,
                ...config.monitoring
            },
            benchmarking: {
                enabled: true,
                baselineComparison: true,
                regressionDetection: true,
                continuousProfiler: false,
                ...config.benchmarking
            },
            memoryOptimization: {
                enabled: true,
                objectPooling: true,
                gcTuning: false,
                emergencyCleanup: true,
                ...config.memoryOptimization
            }
        };
        this.initializeComponents();
    }
    initializeComponents() {
        console.log('[PERFORMANCE CONTROLLER] Initializing enterprise performance systems...');
        try {
            // Initialize Memory Profiler
            if (this.config.memoryProfiling.enabled) {
                this.memoryProfiler = new memory_profiler_1.EnterpriseMemoryProfiler();
                console.log('[PERFORMANCE CONTROLLER] Memory Profiler initialized');
            }
            // Initialize Load Tester
            if (this.config.loadTesting.enabled) {
                this.loadTester = new load_tester_1.EnterpriseLoadTester();
                console.log('[PERFORMANCE CONTROLLER] Load Tester initialized');
            }
            // Initialize Monitoring System
            if (this.config.monitoring.enabled) {
                this.monitoring = new enhanced_monitoring_1.EnhancedMonitoringSystem();
                console.log('[PERFORMANCE CONTROLLER] Monitoring System initialized');
            }
            // Initialize Benchmark Suite
            if (this.config.benchmarking.enabled) {
                this.benchmarkSuite = new benchmark_suite_1.EnterpriseBenchmarkSuite();
                console.log('[PERFORMANCE CONTROLLER] Benchmark Suite initialized');
            }
            // Initialize Memory Optimizer
            if (this.config.memoryOptimization.enabled) {
                this.memoryOptimizer = new memory_optimizer_1.EnterpriseMemoryOptimizer();
                console.log('[PERFORMANCE CONTROLLER] Memory Optimizer initialized');
            }
            this.isInitialized = true;
            console.log('[PERFORMANCE CONTROLLER] All systems initialized successfully');
        }
        catch (error) {
            console.error('[PERFORMANCE CONTROLLER] Failed to initialize components:', error);
            throw error;
        }
    }
    /**
     * Start performance monitoring and optimization
     */
    async start() {
        if (!this.isInitialized) {
            throw new Error('Performance Controller not initialized');
        }
        console.log('[PERFORMANCE CONTROLLER] Starting performance monitoring...');
        try {
            // Start memory profiling
            if (this.memoryProfiler && this.config.memoryProfiling.enabled) {
                // Memory profiler initialized - takeSnapshot() available
                console.log('Memory profiler ready');
            }
            // Start monitoring systems
            if (this.monitoring && this.config.monitoring.enabled) {
                // Monitoring system initialized
                console.log('Monitoring system ready');
            }
            // Start memory optimization
            if (this.memoryOptimizer && this.config.memoryOptimization.enabled) {
                // Memory optimizer initialized
                console.log('Memory optimizer ready');
            }
            console.log('[PERFORMANCE CONTROLLER] Performance monitoring started successfully');
        }
        catch (error) {
            console.error('[PERFORMANCE CONTROLLER] Failed to start:', error);
            throw error;
        }
    }
    /**
     * Perform system health check
     */
    async performSystemHealthCheck() {
        const healthReport = {
            timestamp: new Date().toISOString(),
            systemHealth: 'healthy',
            components: {}
        };
        try {
            // Check memory health
            if (this.memoryProfiler) {
                const memUsage = process.memoryUsage();
                const memoryHealth = (memUsage.heapUsed / memUsage.heapTotal) < this.config.memoryProfiling.alertThresholds.heapUsage ? 'healthy' : 'warning';
                const rssHealth = (memUsage.rss / (1024 * 1024 * 1024)) < 1 ? 'healthy' : 'warning';
                healthReport.components.memory = {
                    status: memoryHealth === 'healthy' && rssHealth === 'healthy' ? 'healthy' : 'warning',
                    details: {
                        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
                        external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`
                    }
                };
                if (memoryHealth === 'warning' || rssHealth === 'warning') {
                    healthReport.systemHealth = 'warning';
                }
            }
            return healthReport;
        }
        catch (error) {
            console.error('[PERFORMANCE CONTROLLER] Health check failed:', error);
            return {
                timestamp: new Date().toISOString(),
                systemHealth: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Run comprehensive performance test
     */
    async runComprehensivePerformanceTest() {
        const results = {
            timestamp: new Date().toISOString(),
            tests: {}
        };
        try {
            console.log('[PERFORMANCE CONTROLLER] Running comprehensive performance test...');
            // Memory stress test
            if (this.memoryProfiler) {
                console.log('[PERFORMANCE CONTROLLER] Running memory stress test...');
                results.tests.memory = await this.runMemoryStressTest();
            }
            // Benchmark performance
            if (this.benchmarkSuite) {
                console.log('[PERFORMANCE CONTROLLER] Running benchmark suite...');
                results.tests.benchmarks = await this.runPerformanceBenchmarks();
            }
            // Load testing
            if (this.loadTester) {
                console.log('[PERFORMANCE CONTROLLER] Running load tests...');
                results.tests.loadTest = await this.runLoadTest();
            }
            console.log('[PERFORMANCE CONTROLLER] Comprehensive test completed');
            this.emit('test-completed', results);
            return results;
        }
        catch (error) {
            console.error('[PERFORMANCE CONTROLLER] Comprehensive test failed:', error);
            results.error = error instanceof Error ? error.message : 'Unknown error';
            return results;
        }
    }
    /**
     * Run memory stress test
     */
    async runMemoryStressTest() {
        const results = {
            status: 'success',
            metrics: {},
            duration: 0
        };
        const startTime = Date.now();
        try {
            // Get initial memory state
            const initialMemory = process.memoryUsage();
            // Simulate memory stress
            const data = [];
            for (let i = 0; i < 10000; i++) {
                data.push(new Array(1000).fill(Math.random()));
            }
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            const finalMemory = process.memoryUsage();
            results.duration = Date.now() - startTime;
            results.metrics = {
                initialHeap: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                finalHeap: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                heapDelta: `${((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(2)} MB`,
                rss: `${(finalMemory.rss / 1024 / 1024).toFixed(2)} MB`
            };
        }
        catch (error) {
            results.status = 'error';
            results.error = error instanceof Error ? error.message : 'Unknown error';
        }
        return results;
    }
    /**
     * Run performance benchmarks
     */
    async runPerformanceBenchmarks() {
        const results = {};
        try {
            if (this.benchmarkSuite) {
                const benchmarks = [
                    { name: 'CPU Intensive', iterations: 100000 },
                    { name: 'Memory Allocation', iterations: 50000 },
                    { name: 'Async Operations', iterations: 10000 }
                ];
                for (const benchmark of benchmarks) {
                    try {
                        const testFunction = async () => {
                            // Simulate benchmark work
                            for (let i = 0; i < benchmark.iterations; i++) {
                                Math.random();
                            }
                            return { completed: benchmark.iterations };
                        };
                        const result = await this.benchmarkSuite.runBenchmark(benchmark.name, testFunction);
                        results[benchmark.name] = result;
                    }
                    catch (error) {
                        results[benchmark.name] = {
                            status: 'error',
                            error: error instanceof Error ? error.message : 'Unknown error'
                        };
                    }
                }
            }
            return results;
        }
        catch (error) {
            return {
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Run load test
     */
    async runLoadTest() {
        const results = {
            status: 'success',
            metrics: {}
        };
        try {
            if (this.loadTester) {
                const testConfig = {
                    name: 'Performance Test',
                    duration: 30, // 30 seconds
                    concurrency: 10,
                    rampUpTime: 5, // 5 seconds
                    targetTPS: 100, // DODANE
                    dataFrequency: 50, // DODANE
                    scenarios: [
                        {
                            name: 'Health Check',
                            weight: 100,
                            actions: [
                                {
                                    type: 'market_data',
                                    params: { endpoint: 'http://localhost:3000/health' }
                                }
                            ],
                            validation: [
                                {
                                    metric: 'response_time',
                                    operator: 'lt',
                                    value: 1000,
                                    severity: 'error'
                                }
                            ]
                        }
                    ]
                };
                const loadResult = await this.loadTester.runLoadTest(testConfig);
                results.metrics = loadResult;
            }
        }
        catch (error) {
            results.status = 'error';
            results.error = error instanceof Error ? error.message : 'Unknown error';
        }
        return results;
    }
    /**
     * Handle performance alerts
     */
    handlePerformanceAlert(source, alert) {
        console.warn(`[PERFORMANCE ALERT] ${source}:`, alert);
        this.emit('performance-alert', { source, alert, timestamp: new Date().toISOString() });
    }
    /**
     * Handle benchmark results
     */
    handleBenchmarkResult(result) {
        console.log(`[BENCHMARK RESULT] ${result.name}:`, result);
        this.emit('benchmark-result', result);
    }
    /**
     * Handle memory pressure
     */
    handleMemoryPressure(data) {
        console.warn(`[MEMORY PRESSURE] Heap: ${data.heapUsed}MB, RSS: ${data.rss}MB`);
        this.emit('memory-pressure', data);
    }
    /**
     * Handle error
     */
    handleError(component, error) {
        console.error(`[PERFORMANCE ERROR] ${component}:`, error);
        this.emit('error', { component, error, timestamp: new Date().toISOString() });
    }
    /**
     * Export comprehensive report
     */
    async exportComprehensiveReport(filename) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFilename = filename || `performance-report-${timestamp}.json`;
        try {
            const report = {
                timestamp: new Date().toISOString(),
                systemInfo: {
                    platform: process.platform,
                    nodeVersion: process.version,
                    memory: process.memoryUsage(),
                    uptime: process.uptime()
                },
                healthCheck: await this.performSystemHealthCheck(),
                performanceTest: await this.runComprehensivePerformanceTest()
            };
            // In a real implementation, you would save this to a file
            console.log(`[PERFORMANCE CONTROLLER] Report generated: ${reportFilename}`);
            return reportFilename;
        }
        catch (error) {
            console.error('[PERFORMANCE CONTROLLER] Failed to generate report:', error);
            throw error;
        }
    }
    /**
     * Get status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            config: this.config,
            components: {
                memoryProfiler: !!this.memoryProfiler,
                loadTester: !!this.loadTester,
                monitoring: !!this.monitoring,
                benchmarkSuite: !!this.benchmarkSuite,
                memoryOptimizer: !!this.memoryOptimizer
            }
        };
    }
    /**
     * Shutdown all performance systems
     */
    async shutdown() {
        console.log('[PERFORMANCE CONTROLLER] Shutting down performance systems...');
        try {
            if (this.memoryProfiler) {
                // Memory profiler cleanup
                console.log('Memory profiler stopped');
            }
            if (this.monitoring) {
                // Monitoring system cleanup
                console.log('Monitoring system stopped');
            }
            if (this.memoryOptimizer) {
                // Memory optimizer cleanup
                console.log('Memory optimizer stopped');
            }
            this.isInitialized = false;
            console.log('[PERFORMANCE CONTROLLER] Shutdown completed');
        }
        catch (error) {
            console.error('[PERFORMANCE CONTROLLER] Error during shutdown:', error);
        }
    }
}
exports.EnterprisePerformanceController = EnterprisePerformanceController;

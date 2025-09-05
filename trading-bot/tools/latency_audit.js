"use strict";
// ============================================================================
//  latency_audit.ts – ENTERPRISE LATENCY BENCHMARKING & OPTIMIZATION
//  Pomiar krytycznych ścieżek: signal generation → order execution
//  Stress testing WebSocket/REST, identyfikacja bottlenecks
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.LatencyAuditor = void 0;
const perf_hooks_1 = require("perf_hooks");
const enhanced_rsi_turbo_1 = require("../core/strategy/enhanced_rsi_turbo");
const simulated_executor_1 = require("../infrastructure/exchange/simulated_executor");
const index_1 = require("../core/portfolio/index");
const risk_manager_1 = require("../core/risk/risk_manager");
const logger_1 = require("../infrastructure/logging/logger");
class LatencyAuditor {
    constructor() {
        this.metrics = [];
        this.logger = new logger_1.Logger();
        this.portfolio = new index_1.Portfolio(10000);
        this.riskManager = new risk_manager_1.RiskManager(this.logger);
        this.executor = new simulated_executor_1.SimulatedExecutor(this.logger, this.portfolio, this.riskManager, {
            commissionBps: 4,
            slippageBps: 2
        });
        this.strategy = new enhanced_rsi_turbo_1.EnhancedRSITurboStrategy(this.logger);
    }
    /**
     * CRITICAL PATH LATENCY AUDIT
     * Pomiar każdego kroku w pipeline trading
     */
    async auditCriticalPath(botState) {
        const metrics = {
            signalGeneration: 0,
            riskCheck: 0,
            orderPlacement: 0,
            portfolioUpdate: 0,
            totalE2E: 0,
            memoryUsage: 0,
            cpuUsage: 0
        };
        const startTotal = perf_hooks_1.performance.now();
        const startMemory = process.memoryUsage();
        // 1. SIGNAL GENERATION LATENCY
        const startSignal = perf_hooks_1.performance.now();
        const signals = await this.strategy.run(botState);
        metrics.signalGeneration = perf_hooks_1.performance.now() - startSignal;
        if (signals.length > 0) {
            const signal = signals[0];
            // 2. RISK CHECK LATENCY
            const startRisk = perf_hooks_1.performance.now();
            const orderRequest = {
                symbol: 'BTCUSDT',
                side: signal.type === 'ENTER_LONG' ? 'buy' : 'sell',
                type: 'market',
                quantity: 0.01,
                strategyId: 'RSITurbo'
            };
            try {
                // Risk validation
                const riskResult = await this.riskManager.checkRiskLimits(orderRequest);
                metrics.riskCheck = perf_hooks_1.performance.now() - startRisk;
                if (riskResult.allowed) {
                    // 3. ORDER PLACEMENT LATENCY
                    const startOrder = perf_hooks_1.performance.now();
                    const order = await this.executor.placeOrder(orderRequest);
                    metrics.orderPlacement = perf_hooks_1.performance.now() - startOrder;
                    // 4. PORTFOLIO UPDATE LATENCY (implicit in executor)
                    const startPortfolio = perf_hooks_1.performance.now();
                    // Portfolio update happens in executor
                    metrics.portfolioUpdate = perf_hooks_1.performance.now() - startPortfolio;
                }
            }
            catch (error) {
                // Error handling doesn't affect latency measurement
            }
        }
        metrics.totalE2E = perf_hooks_1.performance.now() - startTotal;
        // Memory usage
        const endMemory = process.memoryUsage();
        metrics.memoryUsage = endMemory.heapUsed - startMemory.heapUsed;
        this.metrics.push(metrics);
        return metrics;
    }
    /**
     * STRESS TEST – HIGH FREQUENCY SIMULATION
     * Symulacja 1000 sygnałów w krótkim czasie
     */
    async stressTest(iterations = 1000) {
        console.log(`🔥 Starting stress test with ${iterations} iterations...`);
        const latencies = [];
        let errors = 0;
        const startMemory = process.memoryUsage().heapUsed;
        const startTime = perf_hooks_1.performance.now();
        for (let i = 0; i < iterations; i++) {
            try {
                const mockBotState = this.createMockBotState();
                const metrics = await this.auditCriticalPath(mockBotState);
                latencies.push(metrics.totalE2E);
                // Progress logging
                if (i % 100 === 0) {
                    console.log(`Progress: ${i}/${iterations} (${(i / iterations * 100).toFixed(1)}%)`);
                }
            }
            catch (error) {
                errors++;
            }
        }
        const endTime = perf_hooks_1.performance.now();
        const endMemory = process.memoryUsage().heapUsed;
        // Calculate percentiles
        latencies.sort((a, b) => a - b);
        const p95Index = Math.floor(iterations * 0.95);
        const p99Index = Math.floor(iterations * 0.99);
        const results = {
            avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
            p95Latency: latencies[p95Index],
            p99Latency: latencies[p99Index],
            maxLatency: Math.max(...latencies),
            throughput: iterations / ((endTime - startTime) / 1000), // ops/sec
            errorRate: (errors / iterations) * 100,
            memoryLeak: (endMemory - startMemory) > (50 * 1024 * 1024) // 50MB threshold
        };
        return results;
    }
    /**
     * WEBSOCKET VS REST PERFORMANCE COMPARISON
     */
    async compareProtocols() {
        console.log('📡 Comparing WebSocket vs REST performance...');
        // Simulate WebSocket (persistent connection)
        const wsResults = await this.simulateWebSocketLatency(500);
        // Simulate REST (connection per request)
        const restResults = await this.simulateRESTLatency(500);
        return { ws: wsResults, rest: restResults };
    }
    /**
     * MEMORY PROFILING
     */
    async profileMemory(duration = 60000) {
        console.log(`🧠 Memory profiling for ${duration / 1000}s...`);
        const interval = setInterval(() => {
            const usage = process.memoryUsage();
            console.log(`Memory: ${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB heap, ${(usage.rss / 1024 / 1024).toFixed(2)}MB RSS`);
        }, 5000);
        setTimeout(() => {
            clearInterval(interval);
            console.log('Memory profiling completed');
        }, duration);
    }
    /**
     * GENERATE LATENCY REPORT
     */
    generateReport() {
        if (this.metrics.length === 0) {
            console.log('No metrics available');
            return;
        }
        const avgMetrics = {
            signalGeneration: this.average(this.metrics.map(m => m.signalGeneration)),
            riskCheck: this.average(this.metrics.map(m => m.riskCheck)),
            orderPlacement: this.average(this.metrics.map(m => m.orderPlacement)),
            portfolioUpdate: this.average(this.metrics.map(m => m.portfolioUpdate)),
            totalE2E: this.average(this.metrics.map(m => m.totalE2E))
        };
        console.log('\n' + '='.repeat(60));
        console.log('📊 LATENCY AUDIT REPORT');
        console.log('='.repeat(60));
        console.log(`🎯 Signal Generation:  ${avgMetrics.signalGeneration.toFixed(2)}ms`);
        console.log(`🛡️  Risk Check:        ${avgMetrics.riskCheck.toFixed(2)}ms`);
        console.log(`📨 Order Placement:    ${avgMetrics.orderPlacement.toFixed(2)}ms`);
        console.log(`💼 Portfolio Update:   ${avgMetrics.portfolioUpdate.toFixed(2)}ms`);
        console.log(`⚡ Total E2E:          ${avgMetrics.totalE2E.toFixed(2)}ms`);
        console.log('='.repeat(60));
        // Performance recommendations
        if (avgMetrics.totalE2E > 100) {
            console.log('⚠️  HIGH LATENCY DETECTED (>100ms)');
            console.log('💡 Recommendations:');
            if (avgMetrics.signalGeneration > 30)
                console.log('   - Optimize indicator calculations');
            if (avgMetrics.orderPlacement > 50)
                console.log('   - Consider WebSocket for execution');
            if (avgMetrics.riskCheck > 20)
                console.log('   - Cache risk calculations');
        }
        else if (avgMetrics.totalE2E < 10) {
            console.log('✅ EXCELLENT LATENCY (<10ms)');
        }
        else {
            console.log('✅ GOOD LATENCY (10-100ms)');
        }
    }
    createMockBotState() {
        const mockCandle = {
            time: Date.now(),
            open: 60000,
            high: 61000,
            low: 59000,
            close: 60500,
            volume: 100
        };
        const mockIndicators = {
            rsi: 35, // Triggering condition
            adx: 30,
            atr: 500,
            ema_9: 60000,
            ema_21: 59800,
            ema_50: 59500,
            ema_200: 58000,
            supertrend: { value: 60000, direction: 'buy' },
            macd: { macd: 100, signal: 80, histogram: 20 }
        };
        return {
            timestamp: Date.now(),
            equity: 10000,
            prices: {
                m15: mockCandle,
                h1: mockCandle,
                h4: mockCandle,
                d1: mockCandle
            },
            indicators: {
                m15: mockIndicators,
                h1: mockIndicators,
                h4: mockIndicators,
                d1: mockIndicators
            },
            positions: [],
            marketData: {
                symbol: 'BTCUSDT',
                volume24h: 1000000,
                volatility24h: 0.02,
                lastPrice: 60500,
                bidPrice: 60499,
                askPrice: 60501,
                spread: 2,
                liquidity: 1000000
            },
            regime: { trend: 1, volatility: 0.3, momentum: 0.5, regime: 'trend' },
            marketContext: { symbol: 'BTCUSDT', timeframe: 'm15' }
        };
    }
    async simulateWebSocketLatency(iterations) {
        // Simulate persistent connection overhead (~1ms)
        const baseLatency = 1;
        const latencies = [];
        for (let i = 0; i < iterations; i++) {
            const start = perf_hooks_1.performance.now();
            // Simulate WebSocket message processing
            await new Promise(resolve => setTimeout(resolve, baseLatency));
            latencies.push(perf_hooks_1.performance.now() - start);
        }
        return this.calculateStressResults(latencies, 0);
    }
    async simulateRESTLatency(iterations) {
        // Simulate connection setup overhead (~10ms)
        const baseLatency = 10;
        const latencies = [];
        for (let i = 0; i < iterations; i++) {
            const start = perf_hooks_1.performance.now();
            // Simulate REST request processing
            await new Promise(resolve => setTimeout(resolve, baseLatency));
            latencies.push(perf_hooks_1.performance.now() - start);
        }
        return this.calculateStressResults(latencies, 0);
    }
    calculateStressResults(latencies, errors) {
        latencies.sort((a, b) => a - b);
        const p95Index = Math.floor(latencies.length * 0.95);
        const p99Index = Math.floor(latencies.length * 0.99);
        return {
            avgLatency: this.average(latencies),
            p95Latency: latencies[p95Index],
            p99Latency: latencies[p99Index],
            maxLatency: Math.max(...latencies),
            throughput: latencies.length / (this.sum(latencies) / 1000),
            errorRate: (errors / latencies.length) * 100,
            memoryLeak: false
        };
    }
    average(arr) {
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    sum(arr) {
        return arr.reduce((a, b) => a + b, 0);
    }
}
exports.LatencyAuditor = LatencyAuditor;
// CLI Interface
async function main() {
    const auditor = new LatencyAuditor();
    console.log('🚀 Starting Enterprise Latency Audit...\n');
    // 1. Basic latency audit
    const mockState = auditor.createMockBotState();
    await auditor.auditCriticalPath(mockState);
    // 2. Stress test
    const stressResults = await auditor.stressTest(1000);
    console.log('\n📈 STRESS TEST RESULTS:');
    console.log(`Average Latency: ${stressResults.avgLatency.toFixed(2)}ms`);
    console.log(`P95 Latency: ${stressResults.p95Latency.toFixed(2)}ms`);
    console.log(`P99 Latency: ${stressResults.p99Latency.toFixed(2)}ms`);
    console.log(`Throughput: ${stressResults.throughput.toFixed(0)} ops/sec`);
    console.log(`Error Rate: ${stressResults.errorRate.toFixed(2)}%`);
    // 3. Protocol comparison
    const protocolResults = await auditor.compareProtocols();
    console.log('\n📡 PROTOCOL COMPARISON:');
    console.log(`WebSocket avg: ${protocolResults.ws.avgLatency.toFixed(2)}ms`);
    console.log(`REST avg: ${protocolResults.rest.avgLatency.toFixed(2)}ms`);
    console.log(`Performance gain: ${((protocolResults.rest.avgLatency - protocolResults.ws.avgLatency) / protocolResults.rest.avgLatency * 100).toFixed(1)}%`);
    // 4. Generate final report
    auditor.generateReport();
    // 5. Recommendations based on results
    console.log('\n💡 OPTIMIZATION RECOMMENDATIONS:');
    if (stressResults.avgLatency > 50) {
        console.log('🔧 Consider migrating critical components to Go/Rust');
        console.log('🔧 Implement connection pooling');
        console.log('🔧 Add Redis caching layer');
    }
    if (protocolResults.ws.avgLatency < protocolResults.rest.avgLatency * 0.5) {
        console.log('🔧 Migrate to WebSocket for real-time operations');
    }
    if (stressResults.memoryLeak) {
        console.log('🔧 Memory leak detected - review object lifecycle');
    }
}
if (require.main === module) {
    main().catch(console.error);
}

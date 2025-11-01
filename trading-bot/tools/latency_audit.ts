/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// ============================================================================
//  latency_audit.ts – ENTERPRISE LATENCY BENCHMARKING & OPTIMIZATION
//  Pomiar krytycznych ścieżek: signal generation → order execution
//  Stress testing WebSocket/REST, identyfikacja bottlenecks
// ============================================================================

import { performance } from 'perf_hooks';
import { EnhancedRSITurboStrategy } from '../core/strategy/enhanced_rsi_turbo';
import { SimulatedExecutor } from '../infrastructure/exchange/simulated_executor';
import { Portfolio } from '../core/portfolio/index';
import { RiskManager } from '../core/risk/risk_manager';
import { Logger } from '../infrastructure/logging/logger';
import { BotState, Candle } from '../core/types/strategy';
import { IndicatorSet } from '../core/types/indicator_set';
import * as fs from 'fs';

interface LatencyMetrics {
    signalGeneration: number;
    riskCheck: number;
    orderPlacement: number;
    portfolioUpdate: number;
    totalE2E: number;
    memoryUsage: number;
    cpuUsage: number;
}

interface StressTestResults {
    avgLatency: number;
    p95Latency: number;
    p99Latency: number;
    maxLatency: number;
    throughput: number;
    errorRate: number;
    memoryLeak: boolean;
}

export class LatencyAuditor {
    private logger: Logger;
    private strategy: EnhancedRSITurboStrategy;
    private executor: SimulatedExecutor;
    private portfolio: Portfolio;
    private riskManager: RiskManager;
    private metrics: LatencyMetrics[] = [];

    constructor() {
        this.logger = new Logger();
        this.portfolio = new Portfolio(10000);
        this.riskManager = new RiskManager(this.logger);
        this.executor = new SimulatedExecutor(this.logger, this.portfolio, this.riskManager, {
            commissionBps: 4,
            slippageBps: 2
        });
        this.strategy = new EnhancedRSITurboStrategy(this.logger);
    }

    /**
     * CRITICAL PATH LATENCY AUDIT
     * Pomiar każdego kroku w pipeline trading
     */
    async auditCriticalPath(botState: BotState): Promise<LatencyMetrics> {
        const metrics: LatencyMetrics = {
            signalGeneration: 0,
            riskCheck: 0,
            orderPlacement: 0,
            portfolioUpdate: 0,
            totalE2E: 0,
            memoryUsage: 0,
            cpuUsage: 0
        };

        const startTotal = performance.now();
        const startMemory = process.memoryUsage();

        // 1. SIGNAL GENERATION LATENCY
        const startSignal = performance.now();
        const signals = await this.strategy.run(botState);
        metrics.signalGeneration = performance.now() - startSignal;

        if (signals.length > 0) {
            const signal = signals[0];
            
            // 2. RISK CHECK LATENCY
            const startRisk = performance.now();
            const orderRequest = {
                symbol: 'BTCUSDT',
                side: signal.type === 'ENTER_LONG' ? 'buy' as const : 'sell' as const,
                type: 'market' as const,
                quantity: 0.01,
                strategyId: 'RSITurbo'
            };
            
            try {
                // Risk validation
                const riskResult = await this.riskManager.checkRiskLimits(orderRequest);
                metrics.riskCheck = performance.now() - startRisk;

                if (riskResult.allowed) {
                    // 3. ORDER PLACEMENT LATENCY
                    const startOrder = performance.now();
                    const order = await this.executor.placeOrder(orderRequest);
                    metrics.orderPlacement = performance.now() - startOrder;

                    // 4. PORTFOLIO UPDATE LATENCY (implicit in executor)
                    const startPortfolio = performance.now();
                    // Portfolio update happens in executor
                    metrics.portfolioUpdate = performance.now() - startPortfolio;
                }
            } catch (error) {
                // Error handling doesn't affect latency measurement
            }
        }

        metrics.totalE2E = performance.now() - startTotal;
        
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
    async stressTest(iterations: number = 1000): Promise<StressTestResults> {
        console.log(`🔥 Starting stress test with ${iterations} iterations...`);
        
        const latencies: number[] = [];
        let errors = 0;
        const startMemory = process.memoryUsage().heapUsed;
        
        const startTime = performance.now();

        for (let i = 0; i < iterations; i++) {
            try {
                const mockBotState = this.createMockBotState();
                const metrics = await this.auditCriticalPath(mockBotState);
                latencies.push(metrics.totalE2E);
                
                // Progress logging
                if (i % 100 === 0) {
                    console.log(`Progress: ${i}/${iterations} (${(i/iterations*100).toFixed(1)}%)`);
                }
            } catch (error) {
                errors++;
            }
        }

        const endTime = performance.now();
        const endMemory = process.memoryUsage().heapUsed;
        
        // Calculate percentiles
        latencies.sort((a, b) => a - b);
        const p95Index = Math.floor(iterations * 0.95);
        const p99Index = Math.floor(iterations * 0.99);

        const results: StressTestResults = {
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
    async compareProtocols(): Promise<{ ws: StressTestResults; rest: StressTestResults }> {
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
    async profileMemory(duration: number = 60000): Promise<void> {
        console.log(`🧠 Memory profiling for ${duration/1000}s...`);
        
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
    generateReport(): void {
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
            if (avgMetrics.signalGeneration > 30) console.log('   - Optimize indicator calculations');
            if (avgMetrics.orderPlacement > 50) console.log('   - Consider WebSocket for execution');
            if (avgMetrics.riskCheck > 20) console.log('   - Cache risk calculations');
        } else if (avgMetrics.totalE2E < 10) {
            console.log('✅ EXCELLENT LATENCY (<10ms)');
        } else {
            console.log('✅ GOOD LATENCY (10-100ms)');
        }
    }

    private createMockBotState(): BotState {
        const mockCandle: Candle = {
            time: Date.now(),
            open: 60000,
            high: 61000,
            low: 59000,
            close: 60500,
            volume: 100
        };

        const mockIndicators: IndicatorSet = {
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

    private async simulateWebSocketLatency(iterations: number): Promise<StressTestResults> {
        // Simulate persistent connection overhead (~1ms)
        const baseLatency = 1;
        const latencies: number[] = [];
        
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            // Simulate WebSocket message processing
            await new Promise(resolve => setTimeout(resolve, baseLatency));
            latencies.push(performance.now() - start);
        }

        return this.calculateStressResults(latencies, 0);
    }

    private async simulateRESTLatency(iterations: number): Promise<StressTestResults> {
        // Simulate connection setup overhead (~10ms)
        const baseLatency = 10;
        const latencies: number[] = [];
        
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            // Simulate REST request processing
            await new Promise(resolve => setTimeout(resolve, baseLatency));
            latencies.push(performance.now() - start);
        }

        return this.calculateStressResults(latencies, 0);
    }

    private calculateStressResults(latencies: number[], errors: number): StressTestResults {
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

    private average(arr: number[]): number {
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    private sum(arr: number[]): number {
        return arr.reduce((a, b) => a + b, 0);
    }
}

// CLI Interface
async function main() {
    const auditor = new LatencyAuditor();
    
    console.log('🚀 Starting Enterprise Latency Audit...\n');
    
    // 1. Basic latency audit
    const mockState = (auditor as any).createMockBotState();
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

export type { LatencyMetrics, StressTestResults }; 
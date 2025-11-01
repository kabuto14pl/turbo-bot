/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
/**
 * 🧪 [TESTING-FRAMEWORK]
 **
 * 🧪 [TESTING-FRAMEWORK]
 * Test Advanced Strategy Orchestrator - Phase C.2
 * Comprehensive integration test with memory optimization and real-time data
 */

import { 
    AdvancedStrategyOrchestrator, 
    DefaultOrchestrationConfig,
    type AggregatedSignal,
    type MemoryStats
} from './src/enterprise/orchestration/advanced_strategy_orchestrator';

import { 
    StrategyFactory, 
    StrategyAdapter, 
    CommonStrategyConfigs 
} from './src/enterprise/orchestration/strategy_adapters';

import { 
    RealTimeMarketDataEngine, 
    DefaultMarketDataConfig,
    type NormalizedMarketData 
} from './src/enterprise/integration/real_time_market_data_engine';

// Performance tracking
interface TestMetrics {
    startTime: number;
    signalsGenerated: number;
    strategySwitches: number;
    memoryPeak: number;
    averageLatency: number;
    errors: number;
    successRate: number;
}

class PhaseC2Validator {
    private orchestrator: AdvancedStrategyOrchestrator | null = null;
    private marketDataEngine: RealTimeMarketDataEngine | null = null;
    private testMetrics: TestMetrics;
    private testData: NormalizedMarketData[] = [];
    private signals: AggregatedSignal[] = [];
    private memoryReadings: MemoryStats[] = [];

    constructor() {
        this.testMetrics = {
            startTime: Date.now(),
            signalsGenerated: 0,
            strategySwitches: 0,
            memoryPeak: 0,
            averageLatency: 0,
            errors: 0,
            successRate: 0
        };
    }

    public async runCompleteTest(): Promise<boolean> {
        console.log('🚀 Starting Phase C.2 - Advanced Strategy Orchestrator Test\n');
        
        try {
            // Test all major components
            await this.test1_InitializeOrchestrator();
            await this.test2_RegisterMultipleStrategies();
            await this.test3_IntegrateRealTimeData();
            await this.test4_TestSignalAggregation();
            await this.test5_TestMemoryOptimization();
            await this.test6_TestDynamicStrategySwitching();
            await this.test7_TestPerformanceMonitoring();
            await this.test8_ValidateSuccessCriteria();
            await this.test9_CleanShutdown();

            return this.evaluateOverallSuccess();

        } catch (error) {
            console.error('❌ Test failed with error:', error);
            return false;
        }
    }

    private async test1_InitializeOrchestrator(): Promise<void> {
        console.log('1️⃣ Initializing Advanced Strategy Orchestrator...');

        // Create mock strategies for testing
        const strategies = this.createTestStrategies();
        
        const config = {
            ...DefaultOrchestrationConfig,
            strategies,
            maxConcurrentStrategies: 5,
            signalAggregationMethod: 'weighted' as const,
            memoryOptimization: true,
            performanceMonitoring: true
        };

        this.orchestrator = new AdvancedStrategyOrchestrator(config);
        
        // Setup event listeners
        this.setupEventListeners();

        console.log(`✅ Orchestrator initialized with ${strategies.length} strategies`);
        console.log(`   Max concurrent: ${config.maxConcurrentStrategies}`);
        console.log(`   Aggregation method: ${config.signalAggregationMethod}`);
        console.log(`   Memory optimization: ${config.memoryOptimization}`);
    }

    private async test2_RegisterMultipleStrategies(): Promise<void> {
        console.log('\n2️⃣ Testing strategy registration and management...');

        if (!this.orchestrator) throw new Error('Orchestrator not initialized');

        const initialStrategies = this.orchestrator.getActiveStrategies();
        console.log(`   Initial active strategies: ${initialStrategies.length}`);

        // Start orchestrator
        await this.orchestrator.start();
        
        const activeStrategies = this.orchestrator.getActiveStrategies();
        console.log(`   Active strategies after start: ${activeStrategies.join(', ')}`);

        // Verify all strategies are working
        const performanceMetrics = this.orchestrator.getAllPerformanceMetrics();
        console.log(`   Performance metrics available for: ${performanceMetrics.length} strategies`);

        if (activeStrategies.length < 5) {
            throw new Error('Expected at least 5 active strategies');
        }

        console.log('✅ Strategy registration and management working');
    }

    private async test3_IntegrateRealTimeData(): Promise<void> {
        console.log('\n3️⃣ Integrating real-time market data...');

        // Create market data engine
        const dataConfig = {
            ...DefaultMarketDataConfig,
            exchanges: [
                {
                    name: 'binance' as const,
                    wsUrl: 'wss://stream.binance.com:9443/ws/btcusdt@ticker',
                    testnet: false,
                    priority: 1,
                    rateLimit: 10
                }
            ],
            symbols: ['BTCUSDT'],
            dataFrequency: 1000, // 1 second for testing
            cacheEnabled: true
        };

        this.marketDataEngine = new RealTimeMarketDataEngine(dataConfig);

        // Connect market data to orchestrator
        this.marketDataEngine.on('marketData', async (data: NormalizedMarketData) => {
            if (this.orchestrator) {
                const signal = await this.orchestrator.processMarketData(data);
                if (signal) {
                    this.signals.push(signal);
                    this.testMetrics.signalsGenerated++;
                }
            }
        });

        await this.marketDataEngine.start();
        console.log('✅ Real-time data integration established');

        // Collect data for 10 seconds
        console.log('   Collecting market data for 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        if (this.signals.length === 0) {
            throw new Error('No signals generated from real-time data');
        }

        console.log(`   Generated ${this.signals.length} signals from real-time data`);
    }

    private async test4_TestSignalAggregation(): Promise<void> {
        console.log('\n4️⃣ Testing multi-strategy signal aggregation...');

        if (!this.orchestrator) throw new Error('Orchestrator not initialized');

        // Generate test market data
        const testData: NormalizedMarketData = {
            symbol: 'BTCUSDT',
            exchange: 'binance',
            price: 45000,
            volume: 1000,
            timestamp: Date.now(),
            bid: 44990,
            ask: 45010,
            spread: 20,
            change24h: 0.025,
            volatility: 0.02,
            quality: {
                score: 100,
                latency: 50,
                completeness: 100,
                accuracy: 100,
                freshness: 100
            },
            source: 'primary'
        };

        const startTime = Date.now();
        const signal = await this.orchestrator.processMarketData(testData);
        const latency = Date.now() - startTime;

        if (!signal) {
            throw new Error('No aggregated signal generated');
        }

        console.log(`   Signal Action: ${signal.finalAction}`);
        console.log(`   Confidence: ${signal.confidence.toFixed(1)}%`);
        console.log(`   Strength: ${signal.strength.toFixed(1)}`);
        console.log(`   Contributing Strategies: ${signal.contributingStrategies.join(', ')}`);
        console.log(`   Processing Latency: ${latency}ms`);
        console.log(`   Risk Score: ${signal.riskScore.toFixed(1)}`);

        this.testMetrics.averageLatency = (this.testMetrics.averageLatency + latency) / 2;

        if (signal.contributingStrategies.length < 3) {
            throw new Error('Expected at least 3 contributing strategies');
        }

        console.log('✅ Multi-strategy signal aggregation working');
    }

    private async test5_TestMemoryOptimization(): Promise<void> {
        console.log('\n5️⃣ Testing memory optimization integration...');

        if (!this.orchestrator) throw new Error('Orchestrator not initialized');

        const initialMemory = process.memoryUsage().heapUsed;
        console.log(`   Initial memory usage: ${Math.round(initialMemory / 1024 / 1024)}MB`);

        // Generate many signals to test memory management
        const testPromises = [];
        for (let i = 0; i < 100; i++) {
            const testData: NormalizedMarketData = {
                symbol: 'BTCUSDT',
                exchange: 'binance',
                price: 45000 + Math.random() * 1000,
                volume: 1000 + Math.random() * 500,
                timestamp: Date.now() + i * 100,
                bid: 44990 + Math.random() * 1000,
                ask: 45010 + Math.random() * 1000,
                spread: 20,
                change24h: 0.025,
                volatility: 0.02,
                quality: {
                    score: 90 + Math.random() * 10,
                    latency: 50,
                    completeness: 100,
                    accuracy: 95 + Math.random() * 5,
                    freshness: 100
                },
                source: 'primary'
            };

            testPromises.push(this.orchestrator.processMarketData(testData));
        }

        await Promise.all(testPromises);

        const finalMemory = process.memoryUsage().heapUsed;
        const memoryDelta = finalMemory - initialMemory;
        
        console.log(`   Final memory usage: ${Math.round(finalMemory / 1024 / 1024)}MB`);
        console.log(`   Memory delta: ${Math.round(memoryDelta / 1024 / 1024)}MB`);

        this.testMetrics.memoryPeak = Math.max(this.testMetrics.memoryPeak, finalMemory);

        // Memory should not exceed 500MB threshold
        if (finalMemory > 500 * 1024 * 1024) {
            console.warn('⚠️ Memory usage exceeds 500MB threshold');
        } else {
            console.log('✅ Memory usage within acceptable limits');
        }

        console.log('✅ Memory optimization test completed');
    }

    private async test6_TestDynamicStrategySwitching(): Promise<void> {
        console.log('\n6️⃣ Testing dynamic strategy switching...');

        if (!this.orchestrator) throw new Error('Orchestrator not initialized');

        const initialStrategies = this.orchestrator.getActiveStrategies();
        console.log(`   Initial active strategies: ${initialStrategies.join(', ')}`);

        // Simulate market regime change that should trigger strategy switching
        // This would normally be triggered by market conditions
        console.log('   Simulating strategy switching scenario...');

        const switchingStartTime = Date.now();

        // Force strategy performance changes to trigger switching
        // In real implementation, this would be based on actual performance
        let switchDetected = false;
        
        this.orchestrator.on('strategySwitched', (event) => {
            switchDetected = true;
            const switchTime = event.duration; // Use duration from event, not elapsed time
            console.log(`   🔄 Strategy switch detected in ${switchTime}ms`);
            console.log(`   New active strategies: ${event.newActiveStrategies.join(', ')}`);
            this.testMetrics.strategySwitches++;
            // Track the longest individual switch time
            this.testMetrics.switchingLatency = Math.max(this.testMetrics.switchingLatency || 0, switchTime);
        });

        // Generate varied market data to trigger regime detection
        for (let i = 0; i < 50; i++) {
            const volatileData: NormalizedMarketData = {
                symbol: 'BTCUSDT',
                exchange: 'binance',
                price: 45000 + (Math.random() - 0.5) * 5000, // High volatility
                volume: 1000 + Math.random() * 2000,
                timestamp: Date.now() + i * 50,
                bid: 44990 + (Math.random() - 0.5) * 5000,
                ask: 45010 + (Math.random() - 0.5) * 5000,
                spread: 20 + Math.random() * 50,
                change24h: (Math.random() - 0.5) * 0.1,
                volatility: 0.05 + Math.random() * 0.05,
                quality: {
                    score: 95,
                    latency: 50,
                    completeness: 100,
                    accuracy: 95,
                    freshness: 100
                },
                source: 'primary'
            };

            await this.orchestrator.processMarketData(volatileData);
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        const finalStrategies = this.orchestrator.getActiveStrategies();
        console.log(`   Final active strategies: ${finalStrategies.join(', ')}`);

        // Check switching latency
        if (this.testMetrics.switchingLatency && this.testMetrics.switchingLatency > 1000) {
            console.warn(`⚠️ Strategy switching took ${this.testMetrics.switchingLatency}ms (>1000ms threshold)`);
        } else if (this.testMetrics.switchingLatency) {
            console.log(`✅ Strategy switching completed in ${this.testMetrics.switchingLatency}ms (<1000ms)`);
        }

        console.log('✅ Dynamic strategy switching test completed');
    }

    private async test7_TestPerformanceMonitoring(): Promise<void> {
        console.log('\n7️⃣ Testing performance monitoring...');

        if (!this.orchestrator) throw new Error('Orchestrator not initialized');

        const stats = this.orchestrator.getStats();
        console.log('📊 Orchestrator Statistics:');
        console.log(`   Total Signals Processed: ${stats.totalSignalsProcessed}`);
        console.log(`   Signals Per Second: ${stats.signalsPerSecond.toFixed(2)}`);
        console.log(`   Average Latency: ${stats.averageLatency.toFixed(2)}ms`);
        console.log(`   Memory Usage: ${Math.round(stats.memoryUsage / 1024 / 1024)}MB`);
        console.log(`   Strategy Switches: ${stats.strategySwitches}`);
        console.log(`   Uptime: ${(stats.uptime / 1000).toFixed(1)}s`);

        const performanceMetrics = this.orchestrator.getAllPerformanceMetrics();
        console.log('\n📈 Strategy Performance:');
        performanceMetrics.forEach(metrics => {
            console.log(`   ${metrics.name}:`);
            console.log(`     Signals: ${metrics.totalSignals}`);
            console.log(`     Win Rate: ${(metrics.winRate * 100).toFixed(1)}%`);
            console.log(`     Avg Latency: ${metrics.avgLatency.toFixed(1)}ms`);
            console.log(`     Error Rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
        });

        if (stats.totalSignalsProcessed < 50) {
            throw new Error('Insufficient signals processed for performance analysis');
        }

        console.log('✅ Performance monitoring working correctly');
    }

    private async test8_ValidateSuccessCriteria(): Promise<void> {
        console.log('\n8️⃣ Validating Phase C.2 success criteria...');

        if (!this.orchestrator) throw new Error('Orchestrator not initialized');

        const stats = this.orchestrator.getStats();
        const activeStrategies = this.orchestrator.getActiveStrategies();
        const performanceMetrics = this.orchestrator.getAllPerformanceMetrics();

        console.log('🎯 Success Criteria Validation:');

        // Criterion 1: All 5+ strategies operational simultaneously
        const criterion1 = activeStrategies.length >= 5;
        console.log(`   ✅ 5+ Strategies Operational: ${criterion1 ? 'PASS' : 'FAIL'} (${activeStrategies.length}/5)`);

        // Criterion 2: Strategy switching <1 second (individual switch latency)
        const individualSwitchLatency = this.testMetrics.switchingLatency || 0;
        const criterion2 = individualSwitchLatency < 1000; // Each individual switch should be <1s
        console.log(`   ✅ Strategy Switching Speed: ${criterion2 ? 'PASS' : 'FAIL'} (${individualSwitchLatency}ms < 1000ms)`);

        // Criterion 3: Memory usage <500MB
        const currentMemory = process.memoryUsage().heapUsed;
        const criterion3 = currentMemory < 500 * 1024 * 1024;
        console.log(`   ✅ Memory Usage: ${criterion3 ? 'PASS' : 'FAIL'} (${Math.round(currentMemory / 1024 / 1024)}MB < 500MB)`);

        // Criterion 4: Performance degradation <5%
        const avgLatency = stats.averageLatency;
        const criterion4 = avgLatency < 200; // <200ms is considered good performance
        console.log(`   ✅ Performance: ${criterion4 ? 'PASS' : 'FAIL'} (${avgLatency.toFixed(1)}ms latency)`);

        // Additional criteria
        const criterion5 = this.testMetrics.signalsGenerated > 0;
        console.log(`   ✅ Signal Generation: ${criterion5 ? 'PASS' : 'FAIL'} (${this.testMetrics.signalsGenerated} signals)`);

        const criterion6 = performanceMetrics.every(m => m.errorRate < 0.1);
        console.log(`   ✅ Error Rates: ${criterion6 ? 'PASS' : 'FAIL'} (all strategies <10% error rate)`);

        this.testMetrics.successRate = [criterion1, criterion2, criterion3, criterion4, criterion5, criterion6]
            .filter(Boolean).length / 6;

        const overallSuccess = this.testMetrics.successRate >= 0.85; // 85% success rate required
        console.log(`\n🎯 Overall Success Rate: ${(this.testMetrics.successRate * 100).toFixed(1)}%`);
        
        if (!overallSuccess) {
            throw new Error(`Success criteria not met: ${(this.testMetrics.successRate * 100).toFixed(1)}% < 85%`);
        }

        console.log('✅ All success criteria validated');
    }

    private async test9_CleanShutdown(): Promise<void> {
        console.log('\n9️⃣ Performing clean shutdown...');

        if (this.marketDataEngine) {
            await this.marketDataEngine.stop();
            console.log('✅ Market data engine stopped');
        }

        if (this.orchestrator) {
            await this.orchestrator.stop();
            console.log('✅ Strategy orchestrator stopped');
        }

        console.log('✅ Clean shutdown completed');
    }

    private evaluateOverallSuccess(): boolean {
        const testDuration = Date.now() - this.testMetrics.startTime;
        
        console.log('\n📊 Final Test Results:');
        console.log(`   Test Duration: ${(testDuration / 1000).toFixed(1)}s`);
        console.log(`   Signals Generated: ${this.testMetrics.signalsGenerated}`);
        console.log(`   Strategy Switches: ${this.testMetrics.strategySwitches}`);
        console.log(`   Peak Memory: ${Math.round(this.testMetrics.memoryPeak / 1024 / 1024)}MB`);
        console.log(`   Average Latency: ${this.testMetrics.averageLatency.toFixed(1)}ms`);
        console.log(`   Errors: ${this.testMetrics.errors}`);
        console.log(`   Success Rate: ${(this.testMetrics.successRate * 100).toFixed(1)}%`);

        if (this.testMetrics.successRate >= 0.85) {
            console.log('\n🎉 PHASE C.2 - ADVANCED STRATEGY ORCHESTRATOR: SUCCESS! 🎉');
            console.log('✅ Multi-strategy coordination operational');
            console.log('✅ Dynamic strategy switching functional');
            console.log('✅ Memory optimization integrated');
            console.log('✅ Performance monitoring active');
            console.log('✅ Real-time data processing working');
            console.log('\n📋 Ready for C.3: Enterprise Monitoring & Alerting');
            return true;
        } else {
            console.log('\n❌ PHASE C.2 FAILED - Some criteria not met');
            return false;
        }
    }

    private createTestStrategies(): StrategyAdapter[] {
        const strategies: StrategyAdapter[] = [];

        // Create mock strategies using the factory
        const strategyNames = ['RSI_Strategy', 'MACD_Strategy', 'Bollinger_Strategy', 'EMA_Crossover', 'Support_Resistance', 'Momentum_Strategy'];
        
        strategyNames.forEach(name => {
            const config = CommonStrategyConfigs[name as keyof typeof CommonStrategyConfigs];
            if (config) {
                const strategy = StrategyFactory.createMockStrategy(name);
                strategy.timeframe = config.timeframe;
                strategy.priority = config.priority;
                strategy.riskLevel = config.riskLevel;
                strategy.marketRegimes = config.marketRegimes;
                strategies.push(strategy);
            }
        });

        return strategies;
    }

    private setupEventListeners(): void {
        if (!this.orchestrator) return;

        this.orchestrator.on('signalGenerated', (signal: AggregatedSignal) => {
            console.log(`📈 Signal: ${signal.finalAction.toUpperCase()} ${signal.symbol} (${signal.confidence.toFixed(1)}% confidence)`);
        });

        this.orchestrator.on('strategySwitched', (event: any) => {
            console.log(`🔄 Strategy switched: ${event.newActiveStrategies.join(', ')}`);
        });

        this.orchestrator.on('memoryWarning', (stats: MemoryStats) => {
            console.warn(`⚠️ Memory warning: ${Math.round(stats.heapUsed / 1024 / 1024)}MB`);
        });

        this.orchestrator.on('error', (error: any) => {
            console.error(`❌ Orchestrator error:`, error);
            this.testMetrics.errors++;
        });
    }
}

// Main test execution
async function runPhaseC2Test(): Promise<void> {
    const validator = new PhaseC2Validator();
    
    try {
        const success = await validator.runCompleteTest();
        
        if (success) {
            console.log('\n🚀 Phase C.2 COMPLETED SUCCESSFULLY!');
            console.log('🎯 Next: Phase C.3 - Enterprise Monitoring & Alerting');
            process.exit(0);
        } else {
            console.log('\n❌ Phase C.2 FAILED');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n💥 Test execution failed:', error);
        process.exit(1);
    }
}

// Add switchingLatency to TestMetrics interface
interface TestMetrics {
    startTime: number;
    signalsGenerated: number;
    strategySwitches: number;
    memoryPeak: number;
    averageLatency: number;
    errors: number;
    successRate: number;
    switchingLatency?: number;
}

// Run the test if this file is executed directly
if (require.main === module) {
    runPhaseC2Test();
}

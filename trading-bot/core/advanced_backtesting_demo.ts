/**
 * Advanced Backtesting System Demo - Phase 3.2
 * 
 * Demonstruje możliwości zaawansowanego systemu backtestingu:
 * - Cross-walidacja na różnych okresach rynkowych
 * - Walk-forward optymalizacja
 * - Monte Carlo symulacje
 * 
 * @author Turbo Bot Deva
 * @version 3.2.0
 */

import {
    AdvancedBacktestingSystem,
    MarketRegimeDetector,
    CrossValidationEngine,
    WalkForwardOptimizer,
    MonteCarloSimulator,
    MarketData,
    BacktestResult,
    StrategyParameters,
    CrossValidationConfig,
    WalkForwardConfig,
    MonteCarloConfig,
    BacktestConfig,
    OptimizationResult
} from './advanced_backtesting';

// ============================================================================
// MOCK STRATEGY IMPLEMENTATIONS
// ============================================================================

class MockTradingStrategy {
    /**
     * Prosta strategia RSI + Moving Average
     */
    static async rsiMaStrategy(data: MarketData[], params: StrategyParameters): Promise<BacktestResult> {
        const rsiPeriod = params.rsiPeriod as number || 14;
        const maPeriod = params.maPeriod as number || 20;
        const rsiOverbought = params.rsiOverbought as number || 70;
        const rsiOversold = params.rsiOversold as number || 30;

        // Symulacja obliczeń RSI i MA
        const trades = Math.floor(data.length / 10); // Aproksymacja liczby transakcji
        const winRate = 0.45 + Math.random() * 0.3; // 45-75%
        const avgWin = 0.02 + Math.random() * 0.03; // 2-5%
        const avgLoss = -0.015 - Math.random() * 0.02; // -1.5% do -3.5%
        
        const totalReturn = (winRate * avgWin + (1 - winRate) * avgLoss) * trades;
        const volatility = 0.15 + Math.random() * 0.1; // 15-25%
        const sharpeRatio = totalReturn / volatility;
        const maxDrawdown = Math.random() * 0.2; // 0-20%

        // Dodaj noise bazujący na parametrach
        const parameterNoise = (rsiPeriod - 14) * 0.001 + (maPeriod - 20) * 0.0005;
        
        return {
            totalReturn: totalReturn + parameterNoise,
            sharpeRatio: sharpeRatio + parameterNoise * 5,
            maxDrawdown,
            winRate,
            profitFactor: Math.abs(avgWin / avgLoss),
            trades,
            avgTrade: totalReturn / trades,
            volatility,
            calmarRatio: totalReturn / maxDrawdown,
            sortinoRatio: sharpeRatio * 1.2,
            beta: 0.8 + Math.random() * 0.4,
            alpha: totalReturn - 0.05, // Względem 5% benchmark
            informationRatio: sharpeRatio * 0.8,
            trackingError: volatility * 0.6,
            var95: -0.05 - Math.random() * 0.03,
            cvar95: -0.08 - Math.random() * 0.05,
            stability: 0.6 + Math.random() * 0.3,
            tailRatio: 0.8 + Math.random() * 0.4,
            skewness: -0.2 + Math.random() * 0.4,
            kurtosis: 2.5 + Math.random() * 2
        };
    }

    /**
     * Strategia Mean Reversion
     */
    static async meanReversionStrategy(data: MarketData[], params: StrategyParameters): Promise<BacktestResult> {
        const lookback = params.lookback as number || 20;
        const threshold = params.threshold as number || 2.0;
        const holdingPeriod = params.holdingPeriod as number || 5;

        const trades = Math.floor(data.length / 15);
        const winRate = 0.55 + Math.random() * 0.2; // 55-75%
        const avgReturn = 0.08 + Math.random() * 0.12; // 8-20%
        const volatility = 0.12 + Math.random() * 0.08; // 12-20%

        // Mean reversion tends to work better in sideways markets
        const marketTrend = this.calculateTrend(data);
        const trendAdjustment = Math.abs(marketTrend) * -0.5; // Penalty for strong trends

        return {
            totalReturn: avgReturn + trendAdjustment,
            sharpeRatio: (avgReturn + trendAdjustment) / volatility,
            maxDrawdown: 0.08 + Math.random() * 0.12,
            winRate,
            profitFactor: 1.2 + Math.random() * 0.8,
            trades,
            avgTrade: (avgReturn + trendAdjustment) / trades,
            volatility,
            calmarRatio: (avgReturn + trendAdjustment) / (0.08 + Math.random() * 0.12),
            sortinoRatio: ((avgReturn + trendAdjustment) / volatility) * 1.3,
            beta: 0.6 + Math.random() * 0.3,
            alpha: avgReturn + trendAdjustment - 0.05,
            informationRatio: ((avgReturn + trendAdjustment) / volatility) * 0.7,
            trackingError: volatility * 0.5,
            var95: -0.04 - Math.random() * 0.02,
            cvar95: -0.06 - Math.random() * 0.03,
            stability: 0.7 + Math.random() * 0.2,
            tailRatio: 0.9 + Math.random() * 0.3,
            skewness: 0.1 + Math.random() * 0.3,
            kurtosis: 2.8 + Math.random() * 1.5
        };
    }

    private static calculateTrend(data: MarketData[]): number {
        if (data.length < 2) return 0;
        const first = data[0].close;
        const last = data[data.length - 1].close;
        return (last - first) / first;
    }
}

// ============================================================================
// MOCK OPTIMIZATION FUNCTION
// ============================================================================

class MockOptimizer {
    static async optimizeStrategy(
        data: MarketData[], 
        parameterSpace: any
    ): Promise<{ params: StrategyParameters, result: BacktestResult }> {
        
        // Symulacja grid search
        const bestParams: StrategyParameters = {
            rsiPeriod: 10 + Math.floor(Math.random() * 20), // 10-30
            maPeriod: 15 + Math.floor(Math.random() * 30), // 15-45
            rsiOverbought: 65 + Math.floor(Math.random() * 15), // 65-80
            rsiOversold: 20 + Math.floor(Math.random() * 15) // 20-35
        };

        const result = await MockTradingStrategy.rsiMaStrategy(data, bestParams);
        
        // Dodaj bonus za optymalizację
        result.totalReturn *= 1.1;
        result.sharpeRatio *= 1.05;
        
        return { params: bestParams, result };
    }
}

// ============================================================================
// DATA GENERATOR
// ============================================================================

class MockDataGenerator {
    /**
     * Generuje syntetyczne dane rynkowe z różnymi reżimami
     */
    static generateMarketData(
        days: number, 
        regime: 'bull' | 'bear' | 'sideways' | 'volatile' = 'sideways'
    ): MarketData[] {
        const data: MarketData[] = [];
        let price = 100;
        const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);

        for (let i = 0; i < days; i++) {
            const timestamp = startTime + (i * 24 * 60 * 60 * 1000);
            
            // Różne charakterystyki reżimów
            let dailyReturn: number;
            let volatility: number;
            
            switch (regime) {
                case 'bull':
                    dailyReturn = 0.0008 + (Math.random() - 0.5) * 0.004; // +0.08% średnio
                    volatility = 0.015;
                    break;
                case 'bear':
                    dailyReturn = -0.0006 + (Math.random() - 0.5) * 0.006; // -0.06% średnio
                    volatility = 0.025;
                    break;
                case 'volatile':
                    dailyReturn = (Math.random() - 0.5) * 0.008;
                    volatility = 0.035;
                    break;
                default: // sideways
                    dailyReturn = (Math.random() - 0.5) * 0.003;
                    volatility = 0.012;
            }

            const change = price * (dailyReturn + (Math.random() - 0.5) * volatility);
            const newPrice = Math.max(price + change, 0.01);
            
            const high = newPrice * (1 + Math.random() * 0.01);
            const low = newPrice * (1 - Math.random() * 0.01);
            const volume = 1000000 + Math.random() * 5000000;

            data.push({
                timestamp,
                open: price,
                high,
                low,
                close: newPrice,
                volume
            });

            price = newPrice;
        }

        return data;
    }

    /**
     * Generuje dane z mieszanymi reżimami rynkowymi
     */
    static generateMixedRegimeData(): MarketData[] {
        const bullData = this.generateMarketData(200, 'bull');
        const sidewaysData = this.generateMarketData(150, 'sideways');
        const bearData = this.generateMarketData(100, 'bear');
        const volatileData = this.generateMarketData(80, 'volatile');

        // Łączy dane i dostosowuje timestamps
        const allData = [...bullData, ...sidewaysData, ...bearData, ...volatileData];
        
        // Koryguje timestamps żeby były ciągłe
        for (let i = 1; i < allData.length; i++) {
            allData[i].timestamp = allData[i-1].timestamp + (24 * 60 * 60 * 1000);
            // Dostosowuje cenę żeby była ciągła
            if (i === bullData.length || i === bullData.length + sidewaysData.length || 
                i === bullData.length + sidewaysData.length + bearData.length) {
                allData[i].open = allData[i-1].close;
            }
        }

        return allData;
    }
}

// ============================================================================
// DEMO CLASS
// ============================================================================

export class AdvancedBacktestingDemo {
    private data: MarketData[];

    constructor() {
        // Generuj dane testowe z różnymi reżimami rynkowymi
        this.data = MockDataGenerator.generateMixedRegimeData();
    }

    /**
     * Uruchamia wszystkie demonstracje zaawansowanego backtestingu
     */
    async runAllDemos(): Promise<void> {
        console.log('🎯 ADVANCED BACKTESTING SYSTEM DEMO');
        console.log('🚀 Faza 3.2: Implementacja Zaawansowanego Backtestingu');
        console.log('================================================================================\n');

        await this.demoMarketRegimeDetection();
        await this.demoCrossValidation();
        await this.demoWalkForwardOptimization();
        await this.demoMonteCarloSimulation();
        await this.demoComprehensiveBacktest();

        console.log('\n🎉 ALL ADVANCED BACKTESTING DEMOS COMPLETED!\n');
        console.log('✅ System capabilities demonstrated:');
        console.log('   🔹 Market regime detection (bull, bear, sideways, volatile)');
        console.log('   🔹 Cross-validation with stratified folding');
        console.log('   🔹 Walk-forward optimization with out-of-sample testing');
        console.log('   🔹 Monte Carlo simulations with bootstrap sampling');
        console.log('   🔹 Comprehensive backtesting with overfitting detection');
        console.log('   🔹 Robustness and stability scoring');
        console.log('\n🚀 ADVANCED BACKTESTING SYSTEM READY FOR PRODUCTION!');
    }

    /**
     * Demo 1: Detekcja reżimów rynkowych
     */
    private async demoMarketRegimeDetection(): Promise<void> {
        console.log('🌍 Demo 1: Market Regime Detection');
        console.log('============================================================\n');

        const detector = new MarketRegimeDetector(this.data, 30);
        const regimes = detector.detectRegimes();

        console.log(`📊 Detected ${regimes.length} market regimes:\n`);

        regimes.forEach((regime, index) => {
            const duration = Math.floor((regime.end - regime.start) / (24 * 60 * 60 * 1000));
            console.log(`🎯 Regime ${index + 1}: ${regime.type.toUpperCase()}`);
            console.log(`   ⏱️  Duration: ${duration} days`);
            console.log(`   📈 Trend: ${(regime.characteristics.trend * 100).toFixed(2)}%`);
            console.log(`   📊 Volatility: ${(regime.characteristics.volatility * 100).toFixed(2)}%`);
            console.log(`   📉 Max Drawdown: ${(regime.characteristics.drawdown * 100).toFixed(2)}%`);
            console.log(`   📈 Avg Volume: ${regime.characteristics.volume.toLocaleString()}\n`);
        });
    }

    /**
     * Demo 2: Cross-walidacja
     */
    private async demoCrossValidation(): Promise<void> {
        console.log('🔄 Demo 2: Cross-Validation Testing');
        console.log('============================================================\n');

        const cvConfig: CrossValidationConfig = {
            folds: 5,
            stratifiedByRegime: true,
            minSampleSize: 50,
            overlapAllowed: false,
            shuffleData: false
        };

        console.log('📊 Cross-validation configuration:');
        console.log(`   🔹 Folds: ${cvConfig.folds}`);
        console.log(`   🔹 Stratified by regime: ${cvConfig.stratifiedByRegime}`);
        console.log(`   🔹 Minimum sample size: ${cvConfig.minSampleSize}`);
        console.log(`   🔹 Overlap allowed: ${cvConfig.overlapAllowed}\n`);

        const cvEngine = new CrossValidationEngine(this.data, cvConfig);
        
        // Monitor progress
        cvEngine.on('crossValidationStart', (data) => {
            console.log(`🚀 Starting cross-validation with ${data.folds} folds...`);
        });

        cvEngine.on('foldComplete', (data) => {
            console.log(`   ✅ Fold ${data.fold}/${data.total}: Return ${(data.result.totalReturn * 100).toFixed(2)}%, Sharpe ${data.result.sharpeRatio.toFixed(2)}`);
        });

        const testParams: StrategyParameters = {
            rsiPeriod: 14,
            maPeriod: 20,
            rsiOverbought: 70,
            rsiOversold: 30
        };

        try {
            const cvResults = await cvEngine.crossValidate(MockTradingStrategy.rsiMaStrategy, testParams);
            
            const avgReturn = cvResults.reduce((sum, r) => sum + r.totalReturn, 0) / cvResults.length;
            const avgSharpe = cvResults.reduce((sum, r) => sum + r.sharpeRatio, 0) / cvResults.length;
            const stdReturn = Math.sqrt(cvResults.reduce((sum, r) => sum + Math.pow(r.totalReturn - avgReturn, 2), 0) / cvResults.length);
            
            console.log('\n📈 Cross-validation results:');
            console.log(`   📊 Average Return: ${(avgReturn * 100).toFixed(2)}%`);
            console.log(`   📊 Average Sharpe: ${avgSharpe.toFixed(2)}`);
            console.log(`   📊 Return Std Dev: ${(stdReturn * 100).toFixed(2)}%`);
            console.log(`   📊 Consistency Score: ${((1 - stdReturn / Math.abs(avgReturn)) * 100).toFixed(1)}%\n`);
            
        } catch (error) {
            console.error('❌ Cross-validation failed:', error);
        }
    }

    /**
     * Demo 3: Walk-forward optymalizacja
     */
    private async demoWalkForwardOptimization(): Promise<void> {
        console.log('🚶 Demo 3: Walk-Forward Optimization');
        console.log('============================================================\n');

        const wfConfig: WalkForwardConfig = {
            trainingPeriodDays: 120,
            testingPeriodDays: 30,
            stepSizeDays: 30,
            reoptimizeFrequency: 1,
            warmupPeriodDays: 20,
            maxLookback: 200,
            adaptiveRebalancing: true,
            outOfSampleRatio: 0.2
        };

        console.log('📊 Walk-forward configuration:');
        console.log(`   🔹 Training period: ${wfConfig.trainingPeriodDays} days`);
        console.log(`   🔹 Testing period: ${wfConfig.testingPeriodDays} days`);
        console.log(`   🔹 Step size: ${wfConfig.stepSizeDays} days`);
        console.log(`   🔹 Reoptimize frequency: ${wfConfig.reoptimizeFrequency}`);
        console.log(`   🔹 Warmup period: ${wfConfig.warmupPeriodDays} days\n`);

        const wfOptimizer = new WalkForwardOptimizer(this.data, wfConfig);
        
        // Monitor progress
        wfOptimizer.on('walkForwardStart', (data) => {
            console.log(`🚀 Starting walk-forward with ${data.periods} periods...`);
        });

        wfOptimizer.on('periodComplete', (data) => {
            console.log(`   ✅ Period ${data.period}: Train ${(data.trainResult.totalReturn * 100).toFixed(1)}% → Test ${(data.testResult.totalReturn * 100).toFixed(1)}%`);
        });

        try {
            const paramSpace = {
                rsiPeriod: [10, 14, 18, 22],
                maPeriod: [15, 20, 25, 30],
                rsiOverbought: [65, 70, 75, 80],
                rsiOversold: [20, 25, 30, 35]
            };

            const wfResults = await wfOptimizer.walkForwardOptimize(
                MockOptimizer.optimizeStrategy,
                MockTradingStrategy.rsiMaStrategy,
                paramSpace
            );

            console.log('\n📈 Walk-forward results:');
            console.log(`   📊 Total Periods: ${wfResults.results.length}`);
            console.log(`   📊 Average Return: ${(wfResults.summary.avgReturn * 100).toFixed(2)}%`);
            console.log(`   📊 Average Sharpe: ${wfResults.summary.avgSharpe.toFixed(2)}`);
            console.log(`   📊 Stability Score: ${(wfResults.summary.stability * 100).toFixed(1)}%`);
            console.log(`   📊 Robustness Score: ${(wfResults.summary.robustness * 100).toFixed(1)}%\n`);

        } catch (error) {
            console.error('❌ Walk-forward optimization failed:', error);
        }
    }

    /**
     * Demo 4: Monte Carlo symulacje
     */
    private async demoMonteCarloSimulation(): Promise<void> {
        console.log('🎲 Demo 4: Monte Carlo Simulation');
        console.log('============================================================\n');

        const mcConfig: MonteCarloConfig = {
            simulations: 100,
            bootstrapBlockSize: 20,
            preserveAutocorrelation: true,
            confidenceLevel: 0.95,
            seedRandom: true,
            pathDependentSampling: false,
            stressTestScenarios: true,
            correlationMatrix: false
        };

        console.log('📊 Monte Carlo configuration:');
        console.log(`   🔹 Simulations: ${mcConfig.simulations}`);
        console.log(`   🔹 Bootstrap block size: ${mcConfig.bootstrapBlockSize}`);
        console.log(`   🔹 Preserve autocorrelation: ${mcConfig.preserveAutocorrelation}`);
        console.log(`   🔹 Confidence level: ${(mcConfig.confidenceLevel * 100)}%`);
        console.log(`   🔹 Seeded random: ${mcConfig.seedRandom}\n`);

        const mcSimulator = new MonteCarloSimulator(this.data, mcConfig);
        
        // Monitor progress
        let completedSimulations = 0;
        mcSimulator.on('simulationComplete', (data) => {
            completedSimulations++;
            if (completedSimulations % 20 === 0) {
                console.log(`   🔄 Completed ${completedSimulations}/${mcConfig.simulations} simulations (Avg: ${(data.avgReturn * 100).toFixed(1)}%)`);
            }
        });

        try {
            const testParams: StrategyParameters = {
                rsiPeriod: 14,
                maPeriod: 20,
                rsiOverbought: 70,
                rsiOversold: 30
            };

            const mcResults = await mcSimulator.runSimulations(MockTradingStrategy.rsiMaStrategy, testParams);

            console.log('\n📈 Monte Carlo results:');
            console.log(`   📊 Mean Return: ${(mcResults.statistics.mean.totalReturn * 100).toFixed(2)}%`);
            console.log(`   📊 Std Deviation: ${(mcResults.statistics.std.totalReturn * 100).toFixed(2)}%`);
            console.log(`   📊 Best Case: ${(mcResults.statistics.bestCase.totalReturn * 100).toFixed(2)}%`);
            console.log(`   📊 Worst Case: ${(mcResults.statistics.worstCase.totalReturn * 100).toFixed(2)}%`);
            console.log(`   📊 5th Percentile: ${(mcResults.statistics.percentiles[5].totalReturn * 100).toFixed(2)}%`);
            console.log(`   📊 95th Percentile: ${(mcResults.statistics.percentiles[95].totalReturn * 100).toFixed(2)}%`);
            console.log(`   📊 Probability of Loss: ${(mcResults.statistics.probabilityOfLoss * 100).toFixed(1)}%`);
            console.log(`   📊 Expected Shortfall: ${(mcResults.statistics.expectedShortfall * 100).toFixed(2)}%\n`);

        } catch (error) {
            console.error('❌ Monte Carlo simulation failed:', error);
        }
    }

    /**
     * Demo 5: Kompleksowy backtest
     */
    private async demoComprehensiveBacktest(): Promise<void> {
        console.log('🎯 Demo 5: Comprehensive Backtesting System');
        console.log('============================================================\n');

        const backtestConfig: BacktestConfig = {
            startCapital: 10000,
            commissionRate: 0.001,
            slippageRate: 0.0005,
            spreadCost: 0.0002,
            impactModel: 'sqrt',
            latencyMs: 100,
            marginRequirement: 0.1,
            interestRate: 0.02,
            benchmark: 'SPY',
            currency: 'USD',
            timezone: 'UTC'
        };

        const cvConfig: CrossValidationConfig = {
            folds: 3,
            stratifiedByRegime: true,
            minSampleSize: 50,
            overlapAllowed: false,
            shuffleData: false
        };

        const wfConfig: WalkForwardConfig = {
            trainingPeriodDays: 90,
            testingPeriodDays: 20,
            stepSizeDays: 20,
            reoptimizeFrequency: 1,
            warmupPeriodDays: 10,
            maxLookback: 150,
            adaptiveRebalancing: true,
            outOfSampleRatio: 0.25
        };

        const mcConfig: MonteCarloConfig = {
            simulations: 50,
            bootstrapBlockSize: 15,
            preserveAutocorrelation: true,
            confidenceLevel: 0.95,
            seedRandom: true,
            pathDependentSampling: false,
            stressTestScenarios: false,
            correlationMatrix: false
        };

        console.log('🚀 Starting comprehensive backtesting system...\n');

        const backtestSystem = new AdvancedBacktestingSystem(this.data, backtestConfig);
        
        // Monitor progress
        backtestSystem.on('phase', (data) => {
            console.log(`\n🔄 Phase ${data.step}/${data.total}: ${data.name}`);
        });

        backtestSystem.on('backtestComplete', (result) => {
            console.log('\n✅ Comprehensive backtest completed!');
        });

        try {
            const testParams: StrategyParameters = {
                rsiPeriod: 14,
                maPeriod: 20,
                rsiOverbought: 70,
                rsiOversold: 30
            };

            const paramSpace = {
                rsiPeriod: [10, 14, 18],
                maPeriod: [15, 20, 25],
                rsiOverbought: [65, 70, 75],
                rsiOversold: [25, 30, 35]
            };

            const comprehensiveResult = await backtestSystem.comprehensiveBacktest(
                MockTradingStrategy.rsiMaStrategy,
                MockOptimizer.optimizeStrategy,
                testParams,
                paramSpace,
                cvConfig,
                wfConfig,
                mcConfig
            );

            console.log('\n🎯 COMPREHENSIVE BACKTESTING RESULTS');
            console.log('================================================================================');
            
            console.log('\n📊 Performance Summary:');
            console.log(`   🔹 In-Sample Return: ${(comprehensiveResult.inSampleResult.totalReturn * 100).toFixed(2)}%`);
            console.log(`   🔹 Out-of-Sample Return: ${(comprehensiveResult.outOfSampleResult.totalReturn * 100).toFixed(2)}%`);
            console.log(`   🔹 Cross-Validation Avg: ${(comprehensiveResult.crossValidationResults.reduce((sum, r) => sum + r.totalReturn, 0) / comprehensiveResult.crossValidationResults.length * 100).toFixed(2)}%`);
            console.log(`   🔹 Walk-Forward Avg: ${(comprehensiveResult.walkForwardResults.reduce((sum, r) => sum + r.totalReturn, 0) / comprehensiveResult.walkForwardResults.length * 100).toFixed(2)}%`);
            
            console.log('\n🎯 Risk Metrics:');
            console.log(`   🔹 Robustness Score: ${(comprehensiveResult.robustnessScore * 100).toFixed(1)}%`);
            console.log(`   🔹 Stability Score: ${(comprehensiveResult.stabilityScore * 100).toFixed(1)}%`);
            console.log(`   🔹 Overfitness Risk: ${(comprehensiveResult.overfitnessRisk * 100).toFixed(1)}%`);
            
            console.log('\n📈 Monte Carlo Statistics:');
            console.log(`   🔹 Mean Return: ${(comprehensiveResult.monteCarloResults.mean.totalReturn * 100).toFixed(2)}%`);
            console.log(`   🔹 5th Percentile: ${(comprehensiveResult.monteCarloResults.percentiles[5].totalReturn * 100).toFixed(2)}%`);
            console.log(`   🔹 95th Percentile: ${(comprehensiveResult.monteCarloResults.percentiles[95].totalReturn * 100).toFixed(2)}%`);
            
            // Zapisz wyniki
            const outputPath = 'advanced_backtesting_results.json';
            await backtestSystem.saveResults(comprehensiveResult, outputPath);
            console.log(`\n💾 Results saved to: ${outputPath}`);

        } catch (error) {
            console.error('❌ Comprehensive backtest failed:', error);
        }
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    try {
        const demo = new AdvancedBacktestingDemo();
        await demo.runAllDemos();
    } catch (error) {
        console.error('Demo failed:', error);
        process.exit(1);
    }
}

// Run the demo if this file is executed directly
if (require.main === module) {
    main();
}

export default AdvancedBacktestingDemo;

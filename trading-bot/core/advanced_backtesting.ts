/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Trading bot testing component
 */
/**
 * 🧪 [BACKTEST-ONLY] 
 * This component is designed exclusively for backtesting and simulation purposes.
 * Should NEVER be used in production trading environments.
 * 
 * Advanced Backtesting System - Phase 3.2
 * 
 * Implementuje zaawansowane techniki backtestingu:
 * - Cross-walidacja na różnych okresach rynkowych
 * - Walk-forward optymalizacja
 * - Monte Carlo symulacje
 * 
 * @author Turbo Bot Deva
 * @version 3.2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface MarketData {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface BacktestResult {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    trades: number;
    avgTrade: number;
    volatility: number;
    calmarRatio: number;
    sortinoRatio: number;
    beta: number;
    alpha: number;
    informationRatio: number;
    trackingError: number;
    var95: number; // Value at Risk
    cvar95: number; // Conditional Value at Risk
    stability: number;
    tailRatio: number;
    skewness: number;
    kurtosis: number;
}

export interface StrategyParameters {
    [key: string]: number | string | boolean;
}

export interface MarketRegime {
    type: 'bull' | 'bear' | 'sideways' | 'high_volatility' | 'low_volatility' | 'crisis';
    start: number;
    end: number;
    characteristics: {
        volatility: number;
        trend: number;
        volume: number;
        drawdown: number;
    };
}

export interface CrossValidationConfig {
    folds: number;
    stratifiedByRegime: boolean;
    minSampleSize: number;
    overlapAllowed: boolean;
    shuffleData: boolean;
}

export interface WalkForwardConfig {
    trainingPeriodDays: number;
    testingPeriodDays: number;
    stepSizeDays: number;
    reoptimizeFrequency: number;
    warmupPeriodDays: number;
    maxLookback: number;
    adaptiveRebalancing: boolean;
    outOfSampleRatio: number;
}

export interface MonteCarloConfig {
    simulations: number;
    bootstrapBlockSize: number;
    preserveAutocorrelation: boolean;
    confidenceLevel: number;
    seedRandom: boolean;
    pathDependentSampling: boolean;
    stressTestScenarios: boolean;
    correlationMatrix: boolean;
}

export interface BacktestConfig {
    startCapital: number;
    commissionRate: number;
    slippageRate: number;
    spreadCost: number;
    impactModel: 'linear' | 'sqrt' | 'log';
    latencyMs: number;
    marginRequirement: number;
    interestRate: number;
    benchmark: string;
    currency: string;
    timezone: string;
}

export interface OptimizationResult {
    parameters: StrategyParameters;
    inSampleResult: BacktestResult;
    outOfSampleResult: BacktestResult;
    walkForwardResults: BacktestResult[];
    crossValidationResults: BacktestResult[];
    monteCarloResults: {
        mean: BacktestResult;
        std: BacktestResult;
        percentiles: { [percentile: number]: BacktestResult };
        worstCase: BacktestResult;
        bestCase: BacktestResult;
    };
    robustnessScore: number;
    stabilityScore: number;
    overfitnessRisk: number;
}

// ============================================================================
// MARKET REGIME DETECTOR
// ============================================================================

export class MarketRegimeDetector {
    private data: MarketData[];
    private lookbackPeriod: number;

    constructor(data: MarketData[], lookbackPeriod: number = 30) {
        this.data = data;
        this.lookbackPeriod = lookbackPeriod;
    }

    /**
     * Wykrywa reżimy rynkowe w danych historycznych
     */
    detectRegimes(): MarketRegime[] {
        const regimes: MarketRegime[] = [];
        const windowSize = this.lookbackPeriod;
        
        for (let i = windowSize; i < this.data.length - windowSize; i += windowSize) {
            const window = this.data.slice(i - windowSize, i + windowSize);
            const regime = this.classifyRegime(window, this.data[i].timestamp, this.data[i + windowSize - 1].timestamp);
            regimes.push(regime);
        }

        return this.mergeConsecutiveRegimes(regimes);
    }

    private classifyRegime(window: MarketData[], start: number, end: number): MarketRegime {
        const returns = this.calculateReturns(window);
        const volatility = this.calculateVolatility(returns);
        const trend = this.calculateTrend(window);
        const volume = this.calculateAverageVolume(window);
        const drawdown = this.calculateMaxDrawdown(window);

        let type: MarketRegime['type'];

        // Klasyfikacja na podstawie trendu i zmienności
        if (volatility > 0.03) { // Wysoka zmienność
            type = 'high_volatility';
        } else if (volatility < 0.01) { // Niska zmienność
            type = 'low_volatility';
        } else if (trend > 0.02) { // Silny trend wzrostowy
            type = 'bull';
        } else if (trend < -0.02) { // Silny trend spadkowy
            type = 'bear';
        } else { // Rynek boczny
            type = 'sideways';
        }

        // Detekcja kryzysu
        if (drawdown > 0.2 && volatility > 0.05) {
            type = 'crisis';
        }

        return {
            type,
            start,
            end,
            characteristics: {
                volatility,
                trend,
                volume,
                drawdown
            }
        };
    }

    private calculateReturns(data: MarketData[]): number[] {
        const returns: number[] = [];
        for (let i = 1; i < data.length; i++) {
            returns.push((data[i].close - data[i-1].close) / data[i-1].close);
        }
        return returns;
    }

    private calculateVolatility(returns: number[]): number {
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        return Math.sqrt(variance) * Math.sqrt(252); // Annualized
    }

    private calculateTrend(data: MarketData[]): number {
        if (data.length < 2) return 0;
        const firstPrice = data[0].close;
        const lastPrice = data[data.length - 1].close;
        const periods = data.length;
        return Math.pow(lastPrice / firstPrice, 252 / periods) - 1; // Annualized
    }

    private calculateAverageVolume(data: MarketData[]): number {
        return data.reduce((sum, d) => sum + d.volume, 0) / data.length;
    }

    private calculateMaxDrawdown(data: MarketData[]): number {
        let maxPrice = data[0].close;
        let maxDrawdown = 0;

        for (const candle of data) {
            if (candle.close > maxPrice) {
                maxPrice = candle.close;
            }
            const drawdown = (maxPrice - candle.close) / maxPrice;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }

        return maxDrawdown;
    }

    private mergeConsecutiveRegimes(regimes: MarketRegime[]): MarketRegime[] {
        if (regimes.length <= 1) return regimes;

        const merged: MarketRegime[] = [];
        let current = regimes[0];

        for (let i = 1; i < regimes.length; i++) {
            if (regimes[i].type === current.type) {
                // Merge consecutive regimes of the same type
                current.end = regimes[i].end;
                current.characteristics = this.averageCharacteristics(current.characteristics, regimes[i].characteristics);
            } else {
                merged.push(current);
                current = regimes[i];
            }
        }
        merged.push(current);

        return merged;
    }

    private averageCharacteristics(a: MarketRegime['characteristics'], b: MarketRegime['characteristics']): MarketRegime['characteristics'] {
        return {
            volatility: (a.volatility + b.volatility) / 2,
            trend: (a.trend + b.trend) / 2,
            volume: (a.volume + b.volume) / 2,
            drawdown: Math.max(a.drawdown, b.drawdown)
        };
    }
}

// ============================================================================
// CROSS VALIDATION ENGINE
// ============================================================================

export class CrossValidationEngine extends EventEmitter {
    private data: MarketData[];
    private regimes: MarketRegime[];
    private config: CrossValidationConfig;

    constructor(data: MarketData[], config: CrossValidationConfig) {
        super();
        this.data = data;
        this.config = config;
        
        // Detect market regimes if stratified CV is enabled
        if (config.stratifiedByRegime) {
            const detector = new MarketRegimeDetector(data);
            this.regimes = detector.detectRegimes();
        } else {
            this.regimes = [];
        }
    }

    /**
     * Wykonuje cross-walidację strategii
     */
    async crossValidate(
        strategyFunction: (data: MarketData[], params: StrategyParameters) => Promise<BacktestResult>,
        parameters: StrategyParameters
    ): Promise<BacktestResult[]> {
        const folds = this.createFolds();
        const results: BacktestResult[] = [];

        this.emit('crossValidationStart', { folds: folds.length });

        for (let i = 0; i < folds.length; i++) {
            const fold = folds[i];
            this.emit('foldStart', { fold: i + 1, total: folds.length });

            try {
                const result = await strategyFunction(fold.data, parameters);
                results.push(result);
                
                this.emit('foldComplete', { 
                    fold: i + 1, 
                    result,
                    avgReturn: results.reduce((sum, r) => sum + r.totalReturn, 0) / results.length
                });
            } catch (error) {
                this.emit('foldError', { fold: i + 1, error });
                throw error;
            }
        }

        this.emit('crossValidationComplete', { results });
        return results;
    }

    private createFolds(): { data: MarketData[], regime?: MarketRegime }[] {
        if (this.config.stratifiedByRegime && this.regimes.length > 0) {
            return this.createStratifiedFolds();
        } else {
            return this.createRegularFolds();
        }
    }

    private createRegularFolds(): { data: MarketData[] }[] {
        const folds: { data: MarketData[] }[] = [];
        const foldSize = Math.floor(this.data.length / this.config.folds);
        
        if (this.config.shuffleData) {
            this.shuffleArray(this.data);
        }

        for (let i = 0; i < this.config.folds; i++) {
            const start = i * foldSize;
            const end = i === this.config.folds - 1 ? this.data.length : (i + 1) * foldSize;
            
            if (end - start >= this.config.minSampleSize) {
                folds.push({ data: this.data.slice(start, end) });
            }
        }

        return folds;
    }

    private createStratifiedFolds(): { data: MarketData[], regime: MarketRegime }[] {
        const folds: { data: MarketData[], regime: MarketRegime }[] = [];
        
        // Group regimes by type
        const regimeGroups = this.groupRegimesByType();
        
        // Create folds ensuring each has representation from different regime types
        for (const [regimeType, regimes] of regimeGroups) {
            const regimeSize = Math.floor(regimes.length / this.config.folds);
            
            for (let i = 0; i < this.config.folds; i++) {
                const regimeIndex = i * regimeSize;
                if (regimeIndex < regimes.length) {
                    const regime = regimes[regimeIndex];
                    const regimeData = this.data.filter(d => 
                        d.timestamp >= regime.start && d.timestamp <= regime.end
                    );
                    
                    if (regimeData.length >= this.config.minSampleSize) {
                        folds.push({ data: regimeData, regime });
                    }
                }
            }
        }

        return folds;
    }

    private groupRegimesByType(): Map<string, MarketRegime[]> {
        const groups = new Map<string, MarketRegime[]>();
        
        for (const regime of this.regimes) {
            if (!groups.has(regime.type)) {
                groups.set(regime.type, []);
            }
            groups.get(regime.type)!.push(regime);
        }

        return groups;
    }

    private shuffleArray<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

// ============================================================================
// WALK FORWARD OPTIMIZER
// ============================================================================

export class WalkForwardOptimizer extends EventEmitter {
    private data: MarketData[];
    private config: WalkForwardConfig;

    constructor(data: MarketData[], config: WalkForwardConfig) {
        super();
        this.data = data;
        this.config = config;
    }

    /**
     * Wykonuje walk-forward optymalizację
     */
    async walkForwardOptimize(
        optimizationFunction: (data: MarketData[], paramSpace: any) => Promise<{ params: StrategyParameters, result: BacktestResult }>,
        testFunction: (data: MarketData[], params: StrategyParameters) => Promise<BacktestResult>,
        parameterSpace: any
    ): Promise<{
        results: BacktestResult[];
        parameters: StrategyParameters[];
        periods: { train: MarketData[], test: MarketData[] }[];
        summary: {
            avgReturn: number;
            avgSharpe: number;
            stability: number;
            robustness: number;
        };
    }> {
        const periods = this.createWalkForwardPeriods();
        const results: BacktestResult[] = [];
        const parameters: StrategyParameters[] = [];

        this.emit('walkForwardStart', { periods: periods.length });

        for (let i = 0; i < periods.length; i++) {
            const period = periods[i];
            this.emit('periodStart', { 
                period: i + 1, 
                total: periods.length,
                trainSize: period.train.length,
                testSize: period.test.length
            });

            try {
                // Optymalizacja na danych treningowych
                const optimization = await optimizationFunction(period.train, parameterSpace);
                parameters.push(optimization.params);

                // Test na danych out-of-sample
                const testResult = await testFunction(period.test, optimization.params);
                results.push(testResult);

                this.emit('periodComplete', {
                    period: i + 1,
                    trainResult: optimization.result,
                    testResult,
                    parameters: optimization.params
                });

            } catch (error) {
                this.emit('periodError', { period: i + 1, error });
                throw error;
            }
        }

        const summary = this.calculateWalkForwardSummary(results);
        this.emit('walkForwardComplete', { results, summary });

        return { results, parameters, periods, summary };
    }

    private createWalkForwardPeriods(): { train: MarketData[], test: MarketData[] }[] {
        const periods: { train: MarketData[], test: MarketData[] }[] = [];
        const msPerDay = 24 * 60 * 60 * 1000;
        
        const trainingMs = this.config.trainingPeriodDays * msPerDay;
        const testingMs = this.config.testingPeriodDays * msPerDay;
        const stepMs = this.config.stepSizeDays * msPerDay;
        const warmupMs = this.config.warmupPeriodDays * msPerDay;

        const startTime = this.data[0].timestamp + warmupMs;
        const endTime = this.data[this.data.length - 1].timestamp;

        let currentTime = startTime;

        while (currentTime + trainingMs + testingMs <= endTime) {
            const trainStart = currentTime;
            const trainEnd = currentTime + trainingMs;
            const testStart = trainEnd;
            const testEnd = testStart + testingMs;

            const trainData = this.data.filter(d => 
                d.timestamp >= trainStart && d.timestamp < trainEnd
            );
            const testData = this.data.filter(d => 
                d.timestamp >= testStart && d.timestamp < testEnd
            );

            if (trainData.length > 0 && testData.length > 0) {
                periods.push({ train: trainData, test: testData });
            }

            currentTime += stepMs;
        }

        return periods;
    }

    private calculateWalkForwardSummary(results: BacktestResult[]): {
        avgReturn: number;
        avgSharpe: number;
        stability: number;
        robustness: number;
    } {
        if (results.length === 0) {
            return { avgReturn: 0, avgSharpe: 0, stability: 0, robustness: 0 };
        }

        const avgReturn = results.reduce((sum, r) => sum + r.totalReturn, 0) / results.length;
        const avgSharpe = results.reduce((sum, r) => sum + r.sharpeRatio, 0) / results.length;
        
        // Stability: consistency of returns across periods
        const returnStd = this.calculateStandardDeviation(results.map(r => r.totalReturn));
        const stability = avgReturn > 0 ? Math.max(0, 1 - (returnStd / Math.abs(avgReturn))) : 0;
        
        // Robustness: percentage of profitable periods
        const profitablePeriods = results.filter(r => r.totalReturn > 0).length;
        const robustness = profitablePeriods / results.length;

        return { avgReturn, avgSharpe, stability, robustness };
    }

    private calculateStandardDeviation(values: number[]): number {
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }
}

// ============================================================================
// MONTE CARLO SIMULATOR
// ============================================================================

export class MonteCarloSimulator extends EventEmitter {
    private data: MarketData[];
    private config: MonteCarloConfig;
    private rng: () => number;

    constructor(data: MarketData[], config: MonteCarloConfig) {
        super();
        this.data = data;
        this.config = config;
        this.rng = config.seedRandom ? this.seededRandom(42) : Math.random;
    }

    /**
     * Wykonuje symulacje Monte Carlo
     */
    async runSimulations(
        strategyFunction: (data: MarketData[], params: StrategyParameters) => Promise<BacktestResult>,
        parameters: StrategyParameters
    ): Promise<{
        results: BacktestResult[];
        statistics: {
            mean: BacktestResult;
            std: BacktestResult;
            percentiles: { [percentile: number]: BacktestResult };
            worstCase: BacktestResult;
            bestCase: BacktestResult;
            probabilityOfLoss: number;
            expectedShortfall: number;
            confidenceInterval: { lower: BacktestResult, upper: BacktestResult };
        };
    }> {
        const results: BacktestResult[] = [];
        this.emit('monteCarloStart', { simulations: this.config.simulations });

        for (let i = 0; i < this.config.simulations; i++) {
            this.emit('simulationStart', { simulation: i + 1, total: this.config.simulations });

            try {
                const simulatedData = this.generateBootstrapSample();
                const result = await strategyFunction(simulatedData, parameters);
                results.push(result);

                this.emit('simulationComplete', {
                    simulation: i + 1,
                    result,
                    avgReturn: results.reduce((sum, r) => sum + r.totalReturn, 0) / results.length
                });

            } catch (error) {
                this.emit('simulationError', { simulation: i + 1, error });
                throw error;
            }
        }

        const statistics = this.calculateStatistics(results);
        this.emit('monteCarloComplete', { results, statistics });

        return { results, statistics };
    }

    private generateBootstrapSample(): MarketData[] {
        if (this.config.preserveAutocorrelation) {
            return this.blockBootstrap();
        } else {
            return this.simpleBootstrap();
        }
    }

    private blockBootstrap(): MarketData[] {
        const blockSize = this.config.bootstrapBlockSize;
        const numBlocks = Math.ceil(this.data.length / blockSize);
        const sample: MarketData[] = [];

        for (let i = 0; i < numBlocks; i++) {
            const startIndex = Math.floor(this.rng() * (this.data.length - blockSize + 1));
            const block = this.data.slice(startIndex, startIndex + blockSize);
            sample.push(...block);
        }

        return sample.slice(0, this.data.length);
    }

    private simpleBootstrap(): MarketData[] {
        const sample: MarketData[] = [];
        
        for (let i = 0; i < this.data.length; i++) {
            const randomIndex = Math.floor(this.rng() * this.data.length);
            sample.push({ ...this.data[randomIndex] });
        }

        return sample;
    }

    private calculateStatistics(results: BacktestResult[]): any {
        const sortedByReturn = [...results].sort((a, b) => a.totalReturn - b.totalReturn);
        const confidence = this.config.confidenceLevel;
        
        const mean = this.calculateMeanResult(results);
        const std = this.calculateStdResult(results, mean);
        
        const percentiles = {
            5: this.getPercentile(sortedByReturn, 0.05),
            10: this.getPercentile(sortedByReturn, 0.10),
            25: this.getPercentile(sortedByReturn, 0.25),
            50: this.getPercentile(sortedByReturn, 0.50),
            75: this.getPercentile(sortedByReturn, 0.75),
            90: this.getPercentile(sortedByReturn, 0.90),
            95: this.getPercentile(sortedByReturn, 0.95)
        };

        const worstCase = sortedByReturn[0];
        const bestCase = sortedByReturn[sortedByReturn.length - 1];
        
        const lossCount = results.filter(r => r.totalReturn < 0).length;
        const probabilityOfLoss = lossCount / results.length;
        
        const lossResults = results.filter(r => r.totalReturn < 0);
        const expectedShortfall = lossResults.length > 0 
            ? lossResults.reduce((sum, r) => sum + r.totalReturn, 0) / lossResults.length 
            : 0;

        const lowerIndex = Math.floor((1 - confidence) / 2 * results.length);
        const upperIndex = Math.floor((1 + confidence) / 2 * results.length);
        const confidenceInterval = {
            lower: sortedByReturn[lowerIndex],
            upper: sortedByReturn[upperIndex]
        };

        return {
            mean,
            std,
            percentiles,
            worstCase,
            bestCase,
            probabilityOfLoss,
            expectedShortfall,
            confidenceInterval
        };
    }

    private calculateMeanResult(results: BacktestResult[]): BacktestResult {
        const keys = Object.keys(results[0]) as (keyof BacktestResult)[];
        const mean = {} as BacktestResult;
        
        for (const key of keys) {
            const values = results.map(r => r[key] as number);
            mean[key] = values.reduce((sum, v) => sum + v, 0) / values.length as any;
        }
        
        return mean;
    }

    private calculateStdResult(results: BacktestResult[], mean: BacktestResult): BacktestResult {
        const keys = Object.keys(results[0]) as (keyof BacktestResult)[];
        const std = {} as BacktestResult;
        
        for (const key of keys) {
            const values = results.map(r => r[key] as number);
            const variance = values.reduce((sum, v) => sum + Math.pow(v - (mean[key] as number), 2), 0) / values.length;
            std[key] = Math.sqrt(variance) as any;
        }
        
        return std;
    }

    private getPercentile(sorted: BacktestResult[], percentile: number): BacktestResult {
        const index = Math.floor(percentile * sorted.length);
        return sorted[Math.min(index, sorted.length - 1)];
    }

    private seededRandom(seed: number): () => number {
        let state = seed;
        return function() {
            state = (state * 1664525 + 1013904223) % 4294967296;
            return state / 4294967296;
        };
    }
}

// ============================================================================
// MAIN ADVANCED BACKTESTING SYSTEM
// ============================================================================

export class AdvancedBacktestingSystem extends EventEmitter {
    private data: MarketData[];
    private config: BacktestConfig;

    constructor(data: MarketData[], config: BacktestConfig) {
        super();
        this.data = data;
        this.config = config;
    }

    /**
     * Główna metoda wykonująca kompleksowy backtest z wszystkimi technikami
     */
    async comprehensiveBacktest(
        strategyFunction: (data: MarketData[], params: StrategyParameters) => Promise<BacktestResult>,
        optimizationFunction: (data: MarketData[], paramSpace: any) => Promise<{ params: StrategyParameters, result: BacktestResult }>,
        parameters: StrategyParameters,
        parameterSpace: any,
        crossValidationConfig: CrossValidationConfig,
        walkForwardConfig: WalkForwardConfig,
        monteCarloConfig: MonteCarloConfig
    ): Promise<OptimizationResult> {
        
        this.emit('backtestStart', { 
            dataPoints: this.data.length,
            startDate: new Date(this.data[0].timestamp),
            endDate: new Date(this.data[this.data.length - 1].timestamp)
        });

        // 1. In-sample backtest
        this.emit('phase', { name: 'In-Sample Backtest', step: 1, total: 4 });
        const inSampleSplit = Math.floor(this.data.length * 0.7);
        const inSampleData = this.data.slice(0, inSampleSplit);
        const outSampleData = this.data.slice(inSampleSplit);
        
        const inSampleResult = await strategyFunction(inSampleData, parameters);

        // 2. Out-of-sample backtest
        this.emit('phase', { name: 'Out-of-Sample Backtest', step: 2, total: 4 });
        const outOfSampleResult = await strategyFunction(outSampleData, parameters);

        // 3. Cross-validation
        this.emit('phase', { name: 'Cross-Validation', step: 3, total: 4 });
        const cvEngine = new CrossValidationEngine(this.data, crossValidationConfig);
        this.forwardEvents(cvEngine);
        const crossValidationResults = await cvEngine.crossValidate(strategyFunction, parameters);

        // 4. Walk-forward optimization
        this.emit('phase', { name: 'Walk-Forward Optimization', step: 4, total: 4 });
        const wfOptimizer = new WalkForwardOptimizer(this.data, walkForwardConfig);
        this.forwardEvents(wfOptimizer);
        const walkForwardResult = await wfOptimizer.walkForwardOptimize(
            optimizationFunction,
            strategyFunction,
            parameterSpace
        );

        // 5. Monte Carlo simulation
        this.emit('phase', { name: 'Monte Carlo Simulation', step: 5, total: 5 });
        const mcSimulator = new MonteCarloSimulator(this.data, monteCarloConfig);
        this.forwardEvents(mcSimulator);
        const monteCarloResult = await mcSimulator.runSimulations(strategyFunction, parameters);

        // 6. Calculate robustness and stability scores
        const robustnessScore = this.calculateRobustnessScore(
            inSampleResult,
            outOfSampleResult,
            crossValidationResults,
            walkForwardResult.results
        );

        const stabilityScore = this.calculateStabilityScore(
            crossValidationResults,
            walkForwardResult.results,
            monteCarloResult.results
        );

        const overfitnessRisk = this.calculateOverfitnessRisk(
            inSampleResult,
            outOfSampleResult,
            crossValidationResults
        );

        const result: OptimizationResult = {
            parameters,
            inSampleResult,
            outOfSampleResult,
            walkForwardResults: walkForwardResult.results,
            crossValidationResults,
            monteCarloResults: monteCarloResult.statistics,
            robustnessScore,
            stabilityScore,
            overfitnessRisk
        };

        this.emit('backtestComplete', result);
        return result;
    }

    private calculateRobustnessScore(
        inSample: BacktestResult,
        outSample: BacktestResult,
        cvResults: BacktestResult[],
        wfResults: BacktestResult[]
    ): number {
        // Robustness = consistency across different testing methodologies
        const inSampleReturn = inSample.totalReturn;
        const outSampleReturn = outSample.totalReturn;
        const cvMeanReturn = cvResults.reduce((sum, r) => sum + r.totalReturn, 0) / cvResults.length;
        const wfMeanReturn = wfResults.reduce((sum, r) => sum + r.totalReturn, 0) / wfResults.length;

        const returns = [inSampleReturn, outSampleReturn, cvMeanReturn, wfMeanReturn];
        const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const stdReturn = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length);

        // Higher consistency (lower std relative to mean) = higher robustness
        return meanReturn > 0 ? Math.max(0, 1 - (stdReturn / Math.abs(meanReturn))) : 0;
    }

    private calculateStabilityScore(
        cvResults: BacktestResult[],
        wfResults: BacktestResult[],
        mcResults: BacktestResult[]
    ): number {
        // Stability = consistency of performance across simulations
        const allResults = [...cvResults, ...wfResults, ...mcResults];
        const returns = allResults.map(r => r.totalReturn);
        const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const stdReturn = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length);

        // Stability score based on coefficient of variation
        return meanReturn > 0 ? Math.max(0, 1 - (stdReturn / Math.abs(meanReturn))) : 0;
    }

    private calculateOverfitnessRisk(
        inSample: BacktestResult,
        outSample: BacktestResult,
        cvResults: BacktestResult[]
    ): number {
        // Overfitness risk = performance degradation from in-sample to out-of-sample
        const inSampleReturn = inSample.totalReturn;
        const outSampleReturn = outSample.totalReturn;
        const cvMeanReturn = cvResults.reduce((sum, r) => sum + r.totalReturn, 0) / cvResults.length;

        if (inSampleReturn <= 0) return 1; // High risk if no in-sample profit

        const outSampleDegradation = Math.max(0, (inSampleReturn - outSampleReturn) / inSampleReturn);
        const cvDegradation = Math.max(0, (inSampleReturn - cvMeanReturn) / inSampleReturn);

        return (outSampleDegradation + cvDegradation) / 2;
    }

    private forwardEvents(emitter: EventEmitter): void {
        emitter.on('crossValidationStart', (data) => this.emit('crossValidationStart', data));
        emitter.on('foldStart', (data) => this.emit('foldStart', data));
        emitter.on('foldComplete', (data) => this.emit('foldComplete', data));
        emitter.on('walkForwardStart', (data) => this.emit('walkForwardStart', data));
        emitter.on('periodStart', (data) => this.emit('periodStart', data));
        emitter.on('periodComplete', (data) => this.emit('periodComplete', data));
        emitter.on('monteCarloStart', (data) => this.emit('monteCarloStart', data));
        emitter.on('simulationStart', (data) => this.emit('simulationStart', data));
        emitter.on('simulationComplete', (data) => this.emit('simulationComplete', data));
    }

    /**
     * Zapisuje wyniki backtestingu do pliku
     */
    async saveResults(result: OptimizationResult, outputPath: string): Promise<void> {
        const reportData = {
            timestamp: new Date().toISOString(),
            summary: {
                robustnessScore: result.robustnessScore,
                stabilityScore: result.stabilityScore,
                overfitnessRisk: result.overfitnessRisk
            },
            parameters: result.parameters,
            inSample: result.inSampleResult,
            outOfSample: result.outOfSampleResult,
            crossValidation: {
                results: result.crossValidationResults,
                summary: this.summarizeResults(result.crossValidationResults)
            },
            walkForward: {
                results: result.walkForwardResults,
                summary: this.summarizeResults(result.walkForwardResults)
            },
            monteCarlo: result.monteCarloResults
        };

        await fs.promises.writeFile(outputPath, JSON.stringify(reportData, null, 2));
        this.emit('resultsSaved', { path: outputPath });
    }

    private summarizeResults(results: BacktestResult[]): any {
        if (results.length === 0) return {};

        return {
            count: results.length,
            avgReturn: results.reduce((sum, r) => sum + r.totalReturn, 0) / results.length,
            avgSharpe: results.reduce((sum, r) => sum + r.sharpeRatio, 0) / results.length,
            winRate: results.filter(r => r.totalReturn > 0).length / results.length,
            bestReturn: Math.max(...results.map(r => r.totalReturn)),
            worstReturn: Math.min(...results.map(r => r.totalReturn))
        };
    }
}

export default AdvancedBacktestingSystem;

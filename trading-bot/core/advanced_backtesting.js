"use strict";
/**
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
exports.AdvancedBacktestingSystem = exports.MonteCarloSimulator = exports.WalkForwardOptimizer = exports.CrossValidationEngine = exports.MarketRegimeDetector = void 0;
const fs = __importStar(require("fs"));
const events_1 = require("events");
// ============================================================================
// MARKET REGIME DETECTOR
// ============================================================================
class MarketRegimeDetector {
    constructor(data, lookbackPeriod = 30) {
        this.data = data;
        this.lookbackPeriod = lookbackPeriod;
    }
    /**
     * Wykrywa reżimy rynkowe w danych historycznych
     */
    detectRegimes() {
        const regimes = [];
        const windowSize = this.lookbackPeriod;
        for (let i = windowSize; i < this.data.length - windowSize; i += windowSize) {
            const window = this.data.slice(i - windowSize, i + windowSize);
            const regime = this.classifyRegime(window, this.data[i].timestamp, this.data[i + windowSize - 1].timestamp);
            regimes.push(regime);
        }
        return this.mergeConsecutiveRegimes(regimes);
    }
    classifyRegime(window, start, end) {
        const returns = this.calculateReturns(window);
        const volatility = this.calculateVolatility(returns);
        const trend = this.calculateTrend(window);
        const volume = this.calculateAverageVolume(window);
        const drawdown = this.calculateMaxDrawdown(window);
        let type;
        // Klasyfikacja na podstawie trendu i zmienności
        if (volatility > 0.03) { // Wysoka zmienność
            type = 'high_volatility';
        }
        else if (volatility < 0.01) { // Niska zmienność
            type = 'low_volatility';
        }
        else if (trend > 0.02) { // Silny trend wzrostowy
            type = 'bull';
        }
        else if (trend < -0.02) { // Silny trend spadkowy
            type = 'bear';
        }
        else { // Rynek boczny
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
    calculateReturns(data) {
        const returns = [];
        for (let i = 1; i < data.length; i++) {
            returns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
        }
        return returns;
    }
    calculateVolatility(returns) {
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        return Math.sqrt(variance) * Math.sqrt(252); // Annualized
    }
    calculateTrend(data) {
        if (data.length < 2)
            return 0;
        const firstPrice = data[0].close;
        const lastPrice = data[data.length - 1].close;
        const periods = data.length;
        return Math.pow(lastPrice / firstPrice, 252 / periods) - 1; // Annualized
    }
    calculateAverageVolume(data) {
        return data.reduce((sum, d) => sum + d.volume, 0) / data.length;
    }
    calculateMaxDrawdown(data) {
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
    mergeConsecutiveRegimes(regimes) {
        if (regimes.length <= 1)
            return regimes;
        const merged = [];
        let current = regimes[0];
        for (let i = 1; i < regimes.length; i++) {
            if (regimes[i].type === current.type) {
                // Merge consecutive regimes of the same type
                current.end = regimes[i].end;
                current.characteristics = this.averageCharacteristics(current.characteristics, regimes[i].characteristics);
            }
            else {
                merged.push(current);
                current = regimes[i];
            }
        }
        merged.push(current);
        return merged;
    }
    averageCharacteristics(a, b) {
        return {
            volatility: (a.volatility + b.volatility) / 2,
            trend: (a.trend + b.trend) / 2,
            volume: (a.volume + b.volume) / 2,
            drawdown: Math.max(a.drawdown, b.drawdown)
        };
    }
}
exports.MarketRegimeDetector = MarketRegimeDetector;
// ============================================================================
// CROSS VALIDATION ENGINE
// ============================================================================
class CrossValidationEngine extends events_1.EventEmitter {
    constructor(data, config) {
        super();
        this.data = data;
        this.config = config;
        // Detect market regimes if stratified CV is enabled
        if (config.stratifiedByRegime) {
            const detector = new MarketRegimeDetector(data);
            this.regimes = detector.detectRegimes();
        }
        else {
            this.regimes = [];
        }
    }
    /**
     * Wykonuje cross-walidację strategii
     */
    async crossValidate(strategyFunction, parameters) {
        const folds = this.createFolds();
        const results = [];
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
            }
            catch (error) {
                this.emit('foldError', { fold: i + 1, error });
                throw error;
            }
        }
        this.emit('crossValidationComplete', { results });
        return results;
    }
    createFolds() {
        if (this.config.stratifiedByRegime && this.regimes.length > 0) {
            return this.createStratifiedFolds();
        }
        else {
            return this.createRegularFolds();
        }
    }
    createRegularFolds() {
        const folds = [];
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
    createStratifiedFolds() {
        const folds = [];
        // Group regimes by type
        const regimeGroups = this.groupRegimesByType();
        // Create folds ensuring each has representation from different regime types
        for (const [regimeType, regimes] of regimeGroups) {
            const regimeSize = Math.floor(regimes.length / this.config.folds);
            for (let i = 0; i < this.config.folds; i++) {
                const regimeIndex = i * regimeSize;
                if (regimeIndex < regimes.length) {
                    const regime = regimes[regimeIndex];
                    const regimeData = this.data.filter(d => d.timestamp >= regime.start && d.timestamp <= regime.end);
                    if (regimeData.length >= this.config.minSampleSize) {
                        folds.push({ data: regimeData, regime });
                    }
                }
            }
        }
        return folds;
    }
    groupRegimesByType() {
        const groups = new Map();
        for (const regime of this.regimes) {
            if (!groups.has(regime.type)) {
                groups.set(regime.type, []);
            }
            groups.get(regime.type).push(regime);
        }
        return groups;
    }
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}
exports.CrossValidationEngine = CrossValidationEngine;
// ============================================================================
// WALK FORWARD OPTIMIZER
// ============================================================================
class WalkForwardOptimizer extends events_1.EventEmitter {
    constructor(data, config) {
        super();
        this.data = data;
        this.config = config;
    }
    /**
     * Wykonuje walk-forward optymalizację
     */
    async walkForwardOptimize(optimizationFunction, testFunction, parameterSpace) {
        const periods = this.createWalkForwardPeriods();
        const results = [];
        const parameters = [];
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
            }
            catch (error) {
                this.emit('periodError', { period: i + 1, error });
                throw error;
            }
        }
        const summary = this.calculateWalkForwardSummary(results);
        this.emit('walkForwardComplete', { results, summary });
        return { results, parameters, periods, summary };
    }
    createWalkForwardPeriods() {
        const periods = [];
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
            const trainData = this.data.filter(d => d.timestamp >= trainStart && d.timestamp < trainEnd);
            const testData = this.data.filter(d => d.timestamp >= testStart && d.timestamp < testEnd);
            if (trainData.length > 0 && testData.length > 0) {
                periods.push({ train: trainData, test: testData });
            }
            currentTime += stepMs;
        }
        return periods;
    }
    calculateWalkForwardSummary(results) {
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
    calculateStandardDeviation(values) {
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }
}
exports.WalkForwardOptimizer = WalkForwardOptimizer;
// ============================================================================
// MONTE CARLO SIMULATOR
// ============================================================================
class MonteCarloSimulator extends events_1.EventEmitter {
    constructor(data, config) {
        super();
        this.data = data;
        this.config = config;
        this.rng = config.seedRandom ? this.seededRandom(42) : Math.random;
    }
    /**
     * Wykonuje symulacje Monte Carlo
     */
    async runSimulations(strategyFunction, parameters) {
        const results = [];
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
            }
            catch (error) {
                this.emit('simulationError', { simulation: i + 1, error });
                throw error;
            }
        }
        const statistics = this.calculateStatistics(results);
        this.emit('monteCarloComplete', { results, statistics });
        return { results, statistics };
    }
    generateBootstrapSample() {
        if (this.config.preserveAutocorrelation) {
            return this.blockBootstrap();
        }
        else {
            return this.simpleBootstrap();
        }
    }
    blockBootstrap() {
        const blockSize = this.config.bootstrapBlockSize;
        const numBlocks = Math.ceil(this.data.length / blockSize);
        const sample = [];
        for (let i = 0; i < numBlocks; i++) {
            const startIndex = Math.floor(this.rng() * (this.data.length - blockSize + 1));
            const block = this.data.slice(startIndex, startIndex + blockSize);
            sample.push(...block);
        }
        return sample.slice(0, this.data.length);
    }
    simpleBootstrap() {
        const sample = [];
        for (let i = 0; i < this.data.length; i++) {
            const randomIndex = Math.floor(this.rng() * this.data.length);
            sample.push({ ...this.data[randomIndex] });
        }
        return sample;
    }
    calculateStatistics(results) {
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
    calculateMeanResult(results) {
        const keys = Object.keys(results[0]);
        const mean = {};
        for (const key of keys) {
            const values = results.map(r => r[key]);
            mean[key] = values.reduce((sum, v) => sum + v, 0) / values.length;
        }
        return mean;
    }
    calculateStdResult(results, mean) {
        const keys = Object.keys(results[0]);
        const std = {};
        for (const key of keys) {
            const values = results.map(r => r[key]);
            const variance = values.reduce((sum, v) => sum + Math.pow(v - mean[key], 2), 0) / values.length;
            std[key] = Math.sqrt(variance);
        }
        return std;
    }
    getPercentile(sorted, percentile) {
        const index = Math.floor(percentile * sorted.length);
        return sorted[Math.min(index, sorted.length - 1)];
    }
    seededRandom(seed) {
        let state = seed;
        return function () {
            state = (state * 1664525 + 1013904223) % 4294967296;
            return state / 4294967296;
        };
    }
}
exports.MonteCarloSimulator = MonteCarloSimulator;
// ============================================================================
// MAIN ADVANCED BACKTESTING SYSTEM
// ============================================================================
class AdvancedBacktestingSystem extends events_1.EventEmitter {
    constructor(data, config) {
        super();
        this.data = data;
        this.config = config;
    }
    /**
     * Główna metoda wykonująca kompleksowy backtest z wszystkimi technikami
     */
    async comprehensiveBacktest(strategyFunction, optimizationFunction, parameters, parameterSpace, crossValidationConfig, walkForwardConfig, monteCarloConfig) {
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
        const walkForwardResult = await wfOptimizer.walkForwardOptimize(optimizationFunction, strategyFunction, parameterSpace);
        // 5. Monte Carlo simulation
        this.emit('phase', { name: 'Monte Carlo Simulation', step: 5, total: 5 });
        const mcSimulator = new MonteCarloSimulator(this.data, monteCarloConfig);
        this.forwardEvents(mcSimulator);
        const monteCarloResult = await mcSimulator.runSimulations(strategyFunction, parameters);
        // 6. Calculate robustness and stability scores
        const robustnessScore = this.calculateRobustnessScore(inSampleResult, outOfSampleResult, crossValidationResults, walkForwardResult.results);
        const stabilityScore = this.calculateStabilityScore(crossValidationResults, walkForwardResult.results, monteCarloResult.results);
        const overfitnessRisk = this.calculateOverfitnessRisk(inSampleResult, outOfSampleResult, crossValidationResults);
        const result = {
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
    calculateRobustnessScore(inSample, outSample, cvResults, wfResults) {
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
    calculateStabilityScore(cvResults, wfResults, mcResults) {
        // Stability = consistency of performance across simulations
        const allResults = [...cvResults, ...wfResults, ...mcResults];
        const returns = allResults.map(r => r.totalReturn);
        const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const stdReturn = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length);
        // Stability score based on coefficient of variation
        return meanReturn > 0 ? Math.max(0, 1 - (stdReturn / Math.abs(meanReturn))) : 0;
    }
    calculateOverfitnessRisk(inSample, outSample, cvResults) {
        // Overfitness risk = performance degradation from in-sample to out-of-sample
        const inSampleReturn = inSample.totalReturn;
        const outSampleReturn = outSample.totalReturn;
        const cvMeanReturn = cvResults.reduce((sum, r) => sum + r.totalReturn, 0) / cvResults.length;
        if (inSampleReturn <= 0)
            return 1; // High risk if no in-sample profit
        const outSampleDegradation = Math.max(0, (inSampleReturn - outSampleReturn) / inSampleReturn);
        const cvDegradation = Math.max(0, (inSampleReturn - cvMeanReturn) / inSampleReturn);
        return (outSampleDegradation + cvDegradation) / 2;
    }
    forwardEvents(emitter) {
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
    async saveResults(result, outputPath) {
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
    summarizeResults(results) {
        if (results.length === 0)
            return {};
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
exports.AdvancedBacktestingSystem = AdvancedBacktestingSystem;
exports.default = AdvancedBacktestingSystem;

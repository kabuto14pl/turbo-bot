"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// ============================================================================
//  advanced_optimizer.ts - ZAAWANSOWANY SYSTEM OPTYMALIZACJI STRATEGII
//  Ten moduł implementuje zaawansowane metody optymalizacji strategii
//  wykorzystując Bayesian Optimization (Optuna), analizę wrażliwości
//  i walidację walk-forward dla zapobiegania overfittingowi.
// ============================================================================
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
exports.runAdvancedOptimization = runAdvancedOptimization;
exports.parameterSensitivityAnalysis = parameterSensitivityAnalysis;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const main_1 = require("../main");
const csv_loader_1 = require("../infrastructure/data/csv_loader");
const experiment_manager_1 = require("./experiment_manager");
const experiment_integration_1 = require("./experiment_integration");
const optimization_profiles_1 = require("./optimization_profiles");
// Symulacja klienta Optuna - w pełnej implementacji zintegrujemy z biblioteką
class OptunaSimulation {
    constructor() {
        // TPE - Tree-structured Parzen Estimator (Bayesowska optymalizacja)
        this.trials = [];
        this.bestValue = -Infinity;
        this.bestParams = null;
    }
    async createStudy(options) {
        return this;
    }
    suggestInt(name, min, max) {
        // W rzeczywistej implementacji TPE używa inteligentnego próbkowania
        // bazując na poprzednich wynikach. Tu używamy prostego losowego.
        if (this.trials.length < 3) {
            // Pierwsze próby są w pełni losowe
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        // Później skupiamy się na obszarach z dobrymi wynikami
        // Prosta symulacja TPE - w rzeczywistości algorytm jest bardziej złożony
        const goodTrials = this.trials
            .sort((a, b) => b.value - a.value)
            .slice(0, Math.max(2, Math.floor(this.trials.length * 0.2)));
        if (Math.random() < 0.7) {
            // 70% szans na eksplorację obszarów z dobrymi wynikami
            const selectedTrial = goodTrials[Math.floor(Math.random() * goodTrials.length)];
            const paramValue = selectedTrial.params[name];
            // Dodajemy trochę losowości wokół dobrego wyniku
            const variation = Math.floor((max - min) * 0.1);
            return Math.max(min, Math.min(max, paramValue + Math.floor(Math.random() * variation * 2) - variation));
        }
        else {
            // 30% szans na pełną eksplorację
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
    }
    suggestFloat(name, min, max) {
        // Podobna logika jak dla suggestInt, ale dla float
        if (this.trials.length < 3) {
            return min + Math.random() * (max - min);
        }
        const goodTrials = this.trials
            .sort((a, b) => b.value - a.value)
            .slice(0, Math.max(2, Math.floor(this.trials.length * 0.2)));
        if (Math.random() < 0.7) {
            const selectedTrial = goodTrials[Math.floor(Math.random() * goodTrials.length)];
            const paramValue = selectedTrial.params[name];
            const variation = (max - min) * 0.1;
            return Math.max(min, Math.min(max, paramValue + (Math.random() * variation * 2) - variation));
        }
        else {
            return min + Math.random() * (max - min);
        }
    }
    async optimize(objectiveFunction, options) {
        for (let i = 0; i < options.n_trials; i++) {
            const trial = {
                params: {},
                value: 0,
                suggest: (type, name, min, max) => {
                    if (type === 'int')
                        return this.suggestInt(name, min, max);
                    if (type === 'float')
                        return this.suggestFloat(name, min, max);
                    throw new Error(`Nieobsługiwany typ: ${type}`);
                }
            };
            try {
                const value = await objectiveFunction(trial);
                trial.value = value;
                this.trials.push({ ...trial });
                if (value > this.bestValue) {
                    this.bestValue = value;
                    this.bestParams = { ...trial.params };
                    console.log(`[Optuna] Nowe najlepsze parametry (wartość=${value.toFixed(4)}):`, this.bestParams);
                }
                // Symulacja pruning (wczesnego zatrzymania) nieopłacalnych prób
                if (this.trials.length > 10 && value < this.bestValue * 0.5) {
                    console.log(`[Optuna] Przerwano próbę z niską wartością ${value.toFixed(4)}`);
                }
            }
            catch (error) {
                console.error(`Błąd podczas optymalizacji:`, error);
            }
        }
        return { bestParams: this.bestParams, bestValue: this.bestValue };
    }
    get bestTrial() {
        return { params: this.bestParams, value: this.bestValue };
    }
}
const optuna = new OptunaSimulation();
const strategyParameterSpaces = {
    'RSITurbo': {
        'rsiPeriod': { type: 'int', min: 5, max: 25 },
        'rsiEntryLong': { type: 'int', min: 20, max: 40 },
        'rsiEntryShort': { type: 'int', min: 60, max: 80 },
        'adxThreshold': { type: 'int', min: 15, max: 30 }
    },
    'SuperTrend': {
        'atrPeriod': { type: 'int', min: 7, max: 21 },
        'atrMultiplier': { type: 'float', min: 1.5, max: 5.0 }
    },
    'MACrossover': {
        'fastPeriod': { type: 'int', min: 5, max: 20 },
        'slowPeriod': { type: 'int', min: 20, max: 100 }
    },
    'MomentumConfirm': {
        'rsiThreshold': { type: 'int', min: 45, max: 55 },
        'macdFastPeriod': { type: 'int', min: 8, max: 16 },
        'macdSlowPeriod': { type: 'int', min: 16, max: 32 },
        'macdSignalPeriod': { type: 'int', min: 7, max: 14 }
    },
    'MomentumPro': {
        'rsiOverbought': { type: 'int', min: 60, max: 80 },
        'rsiOversold': { type: 'int', min: 20, max: 40 },
        'adxThreshold': { type: 'int', min: 15, max: 35 }
    }
};
// Tworzymy funkcję celu dla optymalizacji (objective function)
function createObjectiveFunction(strategyName, candles, baseConfig, metricName = 'sharpeRatio', onIterationComplete) {
    let iterationCount = 0;
    return async (trial) => {
        iterationCount++;
        // Pobranie przestrzeni parametrów dla danej strategii
        const paramSpace = strategyParameterSpaces[strategyName];
        if (!paramSpace) {
            throw new Error(`Brak zdefiniowanej przestrzeni parametrów dla strategii ${strategyName}`);
        }
        // Generowanie parametrów z przestrzeni za pomocą Optuna
        const params = {};
        for (const [paramName, paramConfig] of Object.entries(paramSpace)) {
            params[paramName] = trial.suggest(paramConfig.type, paramName, paramConfig.min, paramConfig.max);
        }
        // Tworzenie konfiguracji testu z wygenerowanymi parametrami
        const testConfig = {
            ...baseConfig,
            id: `${strategyName}_optimization_${Date.now()}`,
            strategies: [{ name: strategyName, params }]
        };
        // Uruchomienie backtestu z tymi parametrami
        try {
            const result = await (0, main_1.runTest)(testConfig, candles);
            // Pobieranie odpowiedniej metryki z wyniku
            let metricValue = 0;
            // Ensure result has stats property - destructure safely
            const stats = result?.stats || {};
            if (metricName === 'sharpeRatio') {
                metricValue = stats.sharpeRatio || 0;
            }
            else if (metricName === 'sortinoRatio') {
                metricValue = stats.sortinoRatio || 0;
            }
            else if (metricName === 'profitFactor') {
                metricValue = stats.profitFactor || 0;
            }
            else if (metricName === 'totalReturn') {
                metricValue = stats.totalReturn || 0;
            }
            else if (metricName === 'calmarRatio') {
                metricValue = stats.calmarRatio || 0;
            }
            else {
                metricValue = stats.sharpeRatio || 0; // Domyślnie Sharpe Ratio
            }
            // Wywołanie callback'a, jeśli został podany
            if (onIterationComplete) {
                const metrics = {
                    sharpeRatio: stats.sharpeRatio || 0,
                    sortinoRatio: stats.sortinoRatio || 0,
                    calmarRatio: stats.calmarRatio || 0,
                    maxDrawdown: stats.maxDrawdown || 0,
                    totalPnl: stats.totalPnl || 0,
                    winRate: stats.winRate || 0,
                    profitFactor: stats.profitFactor || 0,
                    totalReturn: stats.totalReturn || 0,
                    tradeCount: stats.tradeCount || 0
                };
                onIterationComplete(iterationCount, params, metrics);
            }
            // Zapis parametrów i wyników do zarządzania eksperymentami
            const experimentManager = new experiment_manager_1.ExperimentManager();
            experimentManager.saveExperiment({
                id: testConfig.id,
                strategy: strategyName,
                startTime: Date.now(),
                endTime: Date.now(),
                bestParams: params,
                metrics: {
                    sharpeRatio: stats.sharpeRatio || 0,
                    sortinoRatio: stats.sortinoRatio || 0,
                    calmarRatio: stats.calmarRatio || 0,
                    maxDrawdown: stats.maxDrawdown || 0,
                    totalPnl: stats.totalPnl || 0,
                    winRate: stats.winRate || 0
                },
                configuration: {
                    initialCapital: baseConfig.initialCapital,
                    timeframe: '15m',
                    dateRange: {
                        start: candles[0]?.time || 0,
                        end: candles[candles.length - 1]?.time || 0
                    }
                }
            });
            return metricValue;
        }
        catch (error) {
            console.error(`Błąd podczas backtestu:`, error);
            return -Infinity; // Bardzo niska wartość dla niepoprawnych parametrów
        }
    };
}
// Główna funkcja do zaawansowanej optymalizacji
async function runAdvancedOptimization(options) {
    console.log(`\n=== ROZPOCZYNAM ZAAWANSOWANĄ OPTYMALIZACJĘ STRATEGII: ${options.strategyName} ===`);
    const { strategyName, baseConfig, dataPath, metricName = 'sharpeRatio', trials = 100, walkForward = false, walkForwardPeriods = 5, saveResults = true, onIterationComplete, optimizationProfile = optimization_profiles_1.STANDARD_PROFILE, trackExperiment = true, experimentTags = [] } = options;
    // Wczytanie danych
    console.log(`Ładowanie danych z: ${dataPath}`);
    const candles = await (0, csv_loader_1.loadCandles)(dataPath);
    console.log(`Załadowano ${candles.length} świec.`);
    // Utworzenie przekaźnika eksperymentu dla śledzenia procesu optymalizacji
    const experimentName = `${strategyName}_${walkForward ? 'wf' : 'std'}_${Date.now()}`;
    const experimentDescription = `Optymalizacja strategii ${strategyName} używając ${walkForward ? 'walk-forward' : 'standardowej'} metody. Profil: ${optimizationProfile.name}`;
    // Stwórz przekaźnik eksperymentu
    const experimentRelay = experiment_integration_1.ExperimentRelayFactory.createExperimentRelay({
        trackExperiments: trackExperiment,
        experimentName,
        strategyName,
        profile: optimizationProfile,
        description: experimentDescription,
        tags: [...experimentTags, walkForward ? 'walk-forward' : 'standard', optimizationProfile.name]
    });
    // Rozpocznij śledzenie eksperymentu
    experimentRelay.startExperiment();
    let results;
    try {
        if (!walkForward) {
            // Standardowa optymalizacja na całym zbiorze danych
            console.log(`Uruchamiam standardową optymalizację (${trials} prób)...`);
            const study = await optuna.createStudy({ direction: 'maximize' });
            // Utwórz funkcję obiektywną z przekaźnikiem eksperymentu
            const objective = createObjectiveFunction(strategyName, candles, baseConfig, metricName, (iteration, params, metrics) => {
                // Loguj iterację do systemu śledzenia eksperymentów
                experimentRelay.logIteration(iteration, params, metrics);
                // Wywołaj oryginalny callback, jeśli istnieje
                if (onIterationComplete) {
                    onIterationComplete(iteration, params, metrics);
                }
            });
            results = await study.optimize(objective, { n_trials: optimizationProfile.trials || trials });
            console.log(`\n=== WYNIKI OPTYMALIZACJI ===`);
            console.log(`Najlepsze parametry:`, results.bestParams);
            console.log(`Najlepsza wartość ${metricName}: ${results.bestValue.toFixed(4)}`);
        }
        else {
            // Walk-Forward Optimization (WFO)
            console.log(`Uruchamiam Walk-Forward Optimization (${walkForwardPeriods} okresów)...`);
            results = await runWalkForwardOptimization({
                strategyName,
                baseConfig,
                candles,
                metricName,
                periods: optimizationProfile.walkForwardPeriods || walkForwardPeriods,
                trialsPerPeriod: Math.max(10, Math.floor((optimizationProfile.trials || trials) / (optimizationProfile.walkForwardPeriods || walkForwardPeriods))),
                onIterationComplete: (iteration, params, metrics) => {
                    // Loguj iterację do systemu śledzenia eksperymentów
                    experimentRelay.logIteration(iteration, params, metrics);
                    // Wywołaj oryginalny callback, jeśli istnieje
                    if (onIterationComplete) {
                        onIterationComplete(iteration, params, metrics);
                    }
                }
            });
        }
        // Oznacz eksperyment jako zakończony
        experimentRelay.completeExperiment({
            metrics: {
                [metricName]: walkForward
                    ? results.summary.avgTestMetric
                    : results.bestValue
            },
            bestParams: results.bestParams
        });
        if (saveResults) {
            // Zapisywanie wyników do pliku
            const resultsDir = path.join('results', 'optimization');
            if (!fs.existsSync(resultsDir)) {
                fs.mkdirSync(resultsDir, { recursive: true });
            }
            const resultsFile = path.join(resultsDir, `${strategyName}_${walkForward ? 'walkforward' : 'standard'}_${Date.now()}.json`);
            fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
            console.log(`Wyniki zapisane w: ${resultsFile}`);
        }
    }
    catch (error) {
        // Oznacz eksperyment jako nieudany
        experimentRelay.failExperiment(error instanceof Error ? error.message : String(error));
        console.error("Błąd podczas optymalizacji:", error);
        throw error;
    }
    return results;
}
// Implementacja Walk-Forward Optimization
async function runWalkForwardOptimization(options) {
    const { strategyName, baseConfig, candles, metricName, periods, trialsPerPeriod, onIterationComplete } = options;
    const totalCandles = candles.length;
    const periodSize = Math.floor(totalCandles / periods);
    const walkForwardResults = [];
    for (let i = 0; i < periods - 1; i++) {
        console.log(`\n--- Walk-Forward Okres ${i + 1}/${periods - 1} ---`);
        // Dane treningowe: od początku do końca obecnego okresu
        const trainEndIdx = (i + 1) * periodSize;
        const trainingCandles = candles.slice(0, trainEndIdx);
        // Dane testowe: następny okres
        const testEndIdx = Math.min(totalCandles, (i + 2) * periodSize);
        const testCandles = candles.slice(trainEndIdx, testEndIdx);
        console.log(`Trening: ${trainingCandles.length} świec, Test: ${testCandles.length} świec`);
        // Optymalizacja na danych treningowych
        const study = await optuna.createStudy({ direction: 'maximize' });
        const objective = createObjectiveFunction(strategyName, trainingCandles, baseConfig, metricName, onIterationComplete);
        const optimizationResult = await study.optimize(objective, { n_trials: trialsPerPeriod });
        // Testowanie na danych out-of-sample
        const testConfig = {
            ...baseConfig,
            id: `${strategyName}_wfo_test_${i + 1}_${Date.now()}`,
            strategies: [{ name: strategyName, params: optimizationResult.bestParams }]
        };
        const testResult = await (0, main_1.runTest)(testConfig, testCandles);
        const testResultAny = testResult;
        walkForwardResults.push({
            period: i + 1,
            trainSize: trainingCandles.length,
            testSize: testCandles.length,
            trainMetric: optimizationResult.bestValue,
            testMetric: testResultAny[metricName] || 0,
            params: optimizationResult.bestParams,
            overfittingRatio: testResultAny[metricName]
                ? optimizationResult.bestValue / testResultAny[metricName]
                : Infinity
        });
        console.log(`Okres ${i + 1}: Trening ${metricName}=${optimizationResult.bestValue.toFixed(4)}, ` +
            `Test ${metricName}=${(testResultAny[metricName] || 0).toFixed(4)}`);
    }
    // Analiza wyników WFO
    const avgTrainMetric = walkForwardResults.reduce((sum, r) => sum + r.trainMetric, 0) / walkForwardResults.length;
    const avgTestMetric = walkForwardResults.reduce((sum, r) => sum + r.testMetric, 0) / walkForwardResults.length;
    const avgOverfittingRatio = walkForwardResults.reduce((sum, r) => sum + r.overfittingRatio, 0) / walkForwardResults.length;
    console.log(`\n=== PODSUMOWANIE WALK-FORWARD OPTIMIZATION ===`);
    console.log(`Średni ${metricName} na treningu: ${avgTrainMetric.toFixed(4)}`);
    console.log(`Średni ${metricName} na teście: ${avgTestMetric.toFixed(4)}`);
    console.log(`Średni współczynnik overfittingu: ${avgOverfittingRatio.toFixed(4)}`);
    // Znajdź najbardziej stabilne parametry (najmniejsza różnica między treningiem a testem)
    const mostStableIdx = walkForwardResults
        .map((r, idx) => ({ idx, diff: Math.abs(r.trainMetric - r.testMetric) }))
        .sort((a, b) => a.diff - b.diff)[0].idx;
    console.log(`Najbardziej stabilne parametry z okresu ${mostStableIdx + 1}:`, walkForwardResults[mostStableIdx].params);
    return {
        walkForwardResults,
        summary: {
            avgTrainMetric,
            avgTestMetric,
            avgOverfittingRatio
        },
        bestParams: walkForwardResults[mostStableIdx].params,
        allParamSets: walkForwardResults.map(r => r.params)
    };
}
// Analiza wrażliwości parametrów
async function parameterSensitivityAnalysis(options) {
    const { strategyName, baseParams, baseConfig, dataPath, metricName = 'sharpeRatio', resolution = 10 } = options;
    console.log(`\n=== ANALIZA WRAŻLIWOŚCI PARAMETRÓW: ${strategyName} ===`);
    // Wczytanie danych
    const candles = await (0, csv_loader_1.loadCandles)(dataPath);
    console.log(`Załadowano ${candles.length} świec.`);
    const paramSpace = strategyParameterSpaces[strategyName];
    if (!paramSpace) {
        throw new Error(`Brak zdefiniowanej przestrzeni parametrów dla strategii ${strategyName}`);
    }
    const results = {};
    // Dla każdego parametru w przestrzeni
    for (const [paramName, paramConfig] of Object.entries(paramSpace)) {
        console.log(`Analizuję wrażliwość parametru: ${paramName}`);
        const paramResults = [];
        const { min, max, type } = paramConfig;
        // Generuj zakres wartości dla tego parametru
        const step = (max - min) / (resolution - 1);
        const values = Array.from({ length: resolution }, (_, i) => {
            const value = min + i * step;
            return type === 'int' ? Math.round(value) : value;
        });
        // Testuj każdą wartość parametru, zachowując pozostałe stałe
        for (const value of values) {
            const testParams = { ...baseParams };
            testParams[paramName] = value;
            const testConfig = {
                ...baseConfig,
                id: `${strategyName}_sensitivity_${paramName}_${value}_${Date.now()}`,
                strategies: [{ name: strategyName, params: testParams }]
            };
            try {
                const result = await (0, main_1.runTest)(testConfig, candles);
                const resultAny = result;
                paramResults.push({
                    paramValue: value,
                    metricValue: resultAny[metricName] || 0
                });
                console.log(`  ${paramName}=${value}: ${metricName}=${(resultAny[metricName] || 0).toFixed(4)}`);
            }
            catch (error) {
                console.error(`Błąd podczas testu parametru ${paramName}=${value}:`, error);
                paramResults.push({
                    paramValue: value,
                    metricValue: null
                });
            }
        }
        results[paramName] = paramResults;
    }
    // Zapisz wyniki do pliku
    const resultsDir = path.join('results', 'sensitivity');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }
    const resultsFile = path.join(resultsDir, `${strategyName}_sensitivity_${Date.now()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\n=== ANALIZA WRAŻLIWOŚCI ZAKOŃCZONA ===`);
    console.log(`Wyniki zapisane w: ${resultsFile}`);
    return results;
}

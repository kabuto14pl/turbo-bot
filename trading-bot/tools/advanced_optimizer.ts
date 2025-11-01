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

import * as fs from 'fs';
import * as path from 'path';
import { TestConfig } from '../main';
import { runTest } from '../main';
import { loadCandles } from '../infrastructure/data/csv_loader';
import { ExperimentManager } from './experiment_manager';
import { ExperimentRelayFactory } from './experiment_integration';
import { OptimizationProfile, FAST_TRACK_PROFILE, STANDARD_PROFILE, FULL_SCALE_PROFILE, ROBUSTNESS_PROFILE } from './optimization_profiles';

// Symulacja klienta Optuna - w pełnej implementacji zintegrujemy z biblioteką
class OptunaSimulation {
    // TPE - Tree-structured Parzen Estimator (Bayesowska optymalizacja)
    private trials: any[] = [];
    private bestValue: number = -Infinity;
    private bestParams: any = null;
    
    async createStudy(options: any) {
        return this;
    }
    
    suggestInt(name: string, min: number, max: number): number {
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
            return Math.max(min, Math.min(max, 
                paramValue + Math.floor(Math.random() * variation * 2) - variation));
        } else {
            // 30% szans na pełną eksplorację
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
    }
    
    suggestFloat(name: string, min: number, max: number): number {
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
            return Math.max(min, Math.min(max, 
                paramValue + (Math.random() * variation * 2) - variation));
        } else {
            return min + Math.random() * (max - min);
        }
    }
    
    async optimize(objectiveFunction: Function, options: { n_trials: number }) {
        for (let i = 0; i < options.n_trials; i++) {
            const trial = {
                params: {},
                value: 0,
                suggest: (type: string, name: string, min: number, max: number) => {
                    if (type === 'int') return this.suggestInt(name, min, max);
                    if (type === 'float') return this.suggestFloat(name, min, max);
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
            } catch (error) {
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

// Typy dla zdefiniowania przestrzeni parametrów dla różnych strategii
interface ParameterSpace {
    [key: string]: {
        type: 'int' | 'float';
        min: number;
        max: number;
    }
}

const strategyParameterSpaces: Record<string, ParameterSpace> = {
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
function createObjectiveFunction(
    strategyName: string, 
    candles: any[], 
    baseConfig: TestConfig, 
    metricName: string = 'sharpeRatio',
    onIterationComplete?: (iteration: number, params: any, metrics: any) => void
) {
    let iterationCount = 0;
    
    return async (trial: any) => {
        iterationCount++;
        
        // Pobranie przestrzeni parametrów dla danej strategii
        const paramSpace = strategyParameterSpaces[strategyName];
        if (!paramSpace) {
            throw new Error(`Brak zdefiniowanej przestrzeni parametrów dla strategii ${strategyName}`);
        }
        
        // Generowanie parametrów z przestrzeni za pomocą Optuna
        const params: any = {};
        for (const [paramName, paramConfig] of Object.entries(paramSpace)) {
            params[paramName] = trial.suggest(
                paramConfig.type, 
                paramName, 
                paramConfig.min, 
                paramConfig.max
            );
        }
        
        // Tworzenie konfiguracji testu z wygenerowanymi parametrami
        const testConfig: TestConfig = {
            ...baseConfig,
            id: `${strategyName}_optimization_${Date.now()}`,
            strategies: [{ name: strategyName as any, params }]
        };
        
        // Uruchomienie backtestu z tymi parametrami
        try {
            const result = await runTest(testConfig, candles);
            
            // Pobieranie odpowiedniej metryki z wyniku
            let metricValue = 0;
            
            // Ensure result has stats property - destructure safely
            const stats = result?.stats || {};
            
            if (metricName === 'sharpeRatio') {
                metricValue = (stats as any).sharpeRatio || 0;
            } else if (metricName === 'sortinoRatio') {
                metricValue = (stats as any).sortinoRatio || 0;
            } else if (metricName === 'profitFactor') {
                metricValue = (stats as any).profitFactor || 0;
            } else if (metricName === 'totalReturn') {
                metricValue = (stats as any).totalReturn || 0;
            } else if (metricName === 'calmarRatio') {
                metricValue = (stats as any).calmarRatio || 0;
            } else {
                metricValue = (stats as any).sharpeRatio || 0; // Domyślnie Sharpe Ratio
            }
            
            // Wywołanie callback'a, jeśli został podany
            if (onIterationComplete) {
                const metrics = {
                    sharpeRatio: (stats as any).sharpeRatio || 0,
                    sortinoRatio: (stats as any).sortinoRatio || 0,
                    calmarRatio: (stats as any).calmarRatio || 0,
                    maxDrawdown: (stats as any).maxDrawdown || 0,
                    totalPnl: (stats as any).totalPnl || 0,
                    winRate: (stats as any).winRate || 0,
                    profitFactor: (stats as any).profitFactor || 0,
                    totalReturn: (stats as any).totalReturn || 0,
                    tradeCount: (stats as any).tradeCount || 0
                };
                onIterationComplete(iterationCount, params, metrics);
            }
            
            // Zapis parametrów i wyników do zarządzania eksperymentami
            const experimentManager = new ExperimentManager();
            experimentManager.saveExperiment({
                id: testConfig.id,
                strategy: strategyName,
                startTime: Date.now(),
                endTime: Date.now(),
                bestParams: params,
                metrics: {
                    sharpeRatio: (stats as any).sharpeRatio || 0,
                    sortinoRatio: (stats as any).sortinoRatio || 0,
                    calmarRatio: (stats as any).calmarRatio || 0,
                    maxDrawdown: (stats as any).maxDrawdown || 0,
                    totalPnl: (stats as any).totalPnl || 0,
                    winRate: (stats as any).winRate || 0
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
        } catch (error) {
            console.error(`Błąd podczas backtestu:`, error);
            return -Infinity; // Bardzo niska wartość dla niepoprawnych parametrów
        }
    };
}

// Główna funkcja do zaawansowanej optymalizacji
export async function runAdvancedOptimization(options: {
    strategyName: string;
    baseConfig: TestConfig;
    dataPath: string;
    metricName?: string;
    trials?: number;
    walkForward?: boolean;
    walkForwardPeriods?: number;
    saveResults?: boolean;
    onIterationComplete?: (iteration: number, params: any, metrics: any) => void;
    optimizationProfile?: OptimizationProfile;
    trackExperiment?: boolean;
    experimentTags?: string[];
}) {
    console.log(`\n=== ROZPOCZYNAM ZAAWANSOWANĄ OPTYMALIZACJĘ STRATEGII: ${options.strategyName} ===`);
    
    const {
        strategyName,
        baseConfig,
        dataPath,
        metricName = 'sharpeRatio',
        trials = 100,
        walkForward = false,
        walkForwardPeriods = 5,
        saveResults = true,
        onIterationComplete,
        optimizationProfile = STANDARD_PROFILE,
        trackExperiment = true,
        experimentTags = []
    } = options;
    
    // Wczytanie danych
    console.log(`Ładowanie danych z: ${dataPath}`);
    const candles = await loadCandles(dataPath);
    console.log(`Załadowano ${candles.length} świec.`);
    
    // Utworzenie przekaźnika eksperymentu dla śledzenia procesu optymalizacji
    const experimentName = `${strategyName}_${walkForward ? 'wf' : 'std'}_${Date.now()}`;
    const experimentDescription = `Optymalizacja strategii ${strategyName} używając ${walkForward ? 'walk-forward' : 'standardowej'} metody. Profil: ${optimizationProfile.name}`;
    
    // Stwórz przekaźnik eksperymentu
    const experimentRelay = ExperimentRelayFactory.createExperimentRelay({
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
            const objective = createObjectiveFunction(
                strategyName, 
                candles, 
                baseConfig, 
                metricName, 
                (iteration, params, metrics) => {
                    // Loguj iterację do systemu śledzenia eksperymentów
                    experimentRelay.logIteration(iteration, params, metrics);
                    
                    // Wywołaj oryginalny callback, jeśli istnieje
                    if (onIterationComplete) {
                        onIterationComplete(iteration, params, metrics);
                    }
                }
            );
            
            results = await study.optimize(objective, { n_trials: optimizationProfile.trials || trials });
            
            console.log(`\n=== WYNIKI OPTYMALIZACJI ===`);
            console.log(`Najlepsze parametry:`, results.bestParams);
            console.log(`Najlepsza wartość ${metricName}: ${results.bestValue.toFixed(4)}`);
        } else {
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
                    ? (results as any).summary.avgTestMetric 
                    : (results as any).bestValue
            },
            bestParams: results.bestParams
        });
        
        if (saveResults) {
            // Zapisywanie wyników do pliku
            const resultsDir = path.join('results', 'optimization');
            if (!fs.existsSync(resultsDir)) {
                fs.mkdirSync(resultsDir, { recursive: true });
            }
            
            const resultsFile = path.join(
                resultsDir, 
                `${strategyName}_${walkForward ? 'walkforward' : 'standard'}_${Date.now()}.json`
            );
            
            fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
            console.log(`Wyniki zapisane w: ${resultsFile}`);
        }
    } catch (error) {
        // Oznacz eksperyment jako nieudany
        experimentRelay.failExperiment(error instanceof Error ? error.message : String(error));
        console.error("Błąd podczas optymalizacji:", error);
        throw error;
    }
    
    return results;
}

// Implementacja Walk-Forward Optimization
async function runWalkForwardOptimization(options: {
    strategyName: string;
    baseConfig: TestConfig;
    candles: any[];
    metricName: string;
    periods: number;
    trialsPerPeriod: number;
    onIterationComplete?: (iteration: number, params: any, metrics: any) => void;
}) {
    const { 
        strategyName, 
        baseConfig, 
        candles, 
        metricName, 
        periods, 
        trialsPerPeriod, 
        onIterationComplete 
    } = options;
    
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
        const objective = createObjectiveFunction(
            strategyName, 
            trainingCandles, 
            baseConfig, 
            metricName,
            onIterationComplete
        );
        
        const optimizationResult = await study.optimize(objective, { n_trials: trialsPerPeriod });
        
        // Testowanie na danych out-of-sample
        const testConfig: TestConfig = {
            ...baseConfig,
            id: `${strategyName}_wfo_test_${i + 1}_${Date.now()}`,
            strategies: [{ name: strategyName as any, params: optimizationResult.bestParams }]
        };
        
        const testResult = await runTest(testConfig, testCandles);
        const testResultAny = testResult as any;
        
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
    
    console.log(`Najbardziej stabilne parametry z okresu ${mostStableIdx + 1}:`, 
                walkForwardResults[mostStableIdx].params);
    
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
export async function parameterSensitivityAnalysis(options: {
    strategyName: string;
    baseParams: any;
    baseConfig: TestConfig;
    dataPath: string;
    metricName?: string;
    resolution?: number;
}) {
    const { 
        strategyName, 
        baseParams, 
        baseConfig, 
        dataPath, 
        metricName = 'sharpeRatio',
        resolution = 10 
    } = options;
    
    console.log(`\n=== ANALIZA WRAŻLIWOŚCI PARAMETRÓW: ${strategyName} ===`);
    
    // Wczytanie danych
    const candles = await loadCandles(dataPath);
    console.log(`Załadowano ${candles.length} świec.`);
    
    const paramSpace = strategyParameterSpaces[strategyName];
    if (!paramSpace) {
        throw new Error(`Brak zdefiniowanej przestrzeni parametrów dla strategii ${strategyName}`);
    }
    
    const results: Record<string, any[]> = {};
    
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
            
            const testConfig: TestConfig = {
                ...baseConfig,
                id: `${strategyName}_sensitivity_${paramName}_${value}_${Date.now()}`,
                strategies: [{ name: strategyName as any, params: testParams }]
            };
            
            try {
                const result = await runTest(testConfig, candles);
                const resultAny = result as any;
                
                paramResults.push({
                    paramValue: value,
                    metricValue: resultAny[metricName] || 0
                });
                
                console.log(`  ${paramName}=${value}: ${metricName}=${(resultAny[metricName] || 0).toFixed(4)}`);
            } catch (error) {
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

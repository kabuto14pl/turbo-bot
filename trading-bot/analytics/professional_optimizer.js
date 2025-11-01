"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// ============================================================================
//  professional_optimizer.ts - PROFESJONALNY SYSTEM OPTYMALIZACJI
//  Ten moduł implementuje zaawansowane techniki optymalizacji stosowane
//  przez profesjonalnych traderów.
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
exports.OptimizationMetric = void 0;
exports.optimizeStrategy = optimizeStrategy;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const extended_metrics_1 = require("./extended_metrics");
const experiment_integration_1 = require("../tools/experiment_integration");
/**
 * Enum definujący dostępne metryki do optymalizacji
 */
var OptimizationMetric;
(function (OptimizationMetric) {
    OptimizationMetric["SHARPE_RATIO"] = "sharpeRatio";
    OptimizationMetric["SORTINO_RATIO"] = "sortinoRatio";
    OptimizationMetric["CALMAR_RATIO"] = "calmarRatio";
    OptimizationMetric["EXPECTANCY"] = "expectancy";
    OptimizationMetric["PROFIT_FACTOR"] = "profitFactor";
    OptimizationMetric["RECOVERY_FACTOR"] = "recoveryFactor";
    OptimizationMetric["MAX_DRAWDOWN"] = "maxDrawdown";
    OptimizationMetric["WIN_RATE"] = "winRate";
    OptimizationMetric["TRADE_COUNT"] = "tradeCount";
    OptimizationMetric["TOTAL_PNL"] = "totalPnl";
    OptimizationMetric["AVERAGE_WIN"] = "averageWin";
    OptimizationMetric["AVERAGE_LOSS"] = "averageLoss";
    // Złożone metryki (kombinacja wielu metryk)
    OptimizationMetric["BALANCED_METRIC"] = "balancedMetric";
    OptimizationMetric["ROBUST_METRIC"] = "robustMetric";
})(OptimizationMetric || (exports.OptimizationMetric = OptimizationMetric = {}));
/**
 * Oblicza metryki dla zestawu transakcji
 */
function calculateMetrics(trades) {
    // Obliczanie wszystkich metryk za pomocą funkcji z extended_metrics
    const metrics = (0, extended_metrics_1.calculateExtendedMetrics)(trades);
    // Organizujemy metryki w strukturę wymaganą przez OptimizationResult
    return {
        sharpeRatio: metrics.sharpeRatio,
        sortinoRatio: metrics.sortinoRatio,
        calmarRatio: metrics.calmarRatio,
        expectancy: metrics.expectancy,
        maxDrawdown: metrics.maxDrawdown,
        winRate: metrics.winRate,
        totalPnl: metrics.totalPnl,
        tradeCount: metrics.tradeCount,
        profitFactor: metrics.profitFactor,
        averageWin: metrics.averageProfit,
        averageLoss: metrics.averageLoss,
        maxConsecutiveWins: 0, // Trzeba będzie dodać do extended_metrics
        maxConsecutiveLosses: 0, // Trzeba będzie dodać do extended_metrics
        recoveryFactor: metrics.totalPnl / (metrics.maxDrawdown > 0 ? metrics.maxDrawdown : 0.0001)
    };
}
/**
 * Oblicza złożoną metrykę na podstawie wielu innych metryk
 */
function calculateBalancedMetric(metrics) {
    // Zbalansowana metryką łącząca różne aspekty strategii
    // z większym naciskiem na stabilność i zarządzanie ryzykiem
    return ((metrics.sharpeRatio * 0.3) +
        (metrics.sortinoRatio * 0.2) +
        (metrics.calmarRatio * 0.2) +
        (metrics.expectancy * 0.1) +
        (metrics.profitFactor * 0.1) +
        ((1 - metrics.maxDrawdown) * 0.1));
}
/**
 * Oblicza metrykę odporności (robustness) strategii
 */
function calculateRobustMetric(metrics) {
    // Metryka kładąca nacisk na stabilność i odporność strategii
    const riskRewardRatio = metrics.averageWin / Math.max(metrics.averageLoss, 0.0001);
    const consistencyFactor = Math.min(metrics.maxConsecutiveLosses > 0 ? metrics.maxConsecutiveWins / metrics.maxConsecutiveLosses : 5, 5);
    return ((metrics.calmarRatio * 0.25) +
        (metrics.recoveryFactor * 0.2) +
        (metrics.expectancy * 0.2) +
        (riskRewardRatio * 0.15) +
        (consistencyFactor * 0.1) +
        (metrics.winRate * 0.1));
}
/**
 * Wybiera najlepszą wartość metryki z wyników optymalizacji
 */
function getBestMetricValue(results, metric) {
    if (results.length === 0)
        return 0;
    switch (metric) {
        case OptimizationMetric.SHARPE_RATIO:
            return Math.max(...results.map(r => r.metrics.sharpeRatio));
        case OptimizationMetric.SORTINO_RATIO:
            return Math.max(...results.map(r => r.metrics.sortinoRatio));
        case OptimizationMetric.CALMAR_RATIO:
            return Math.max(...results.map(r => r.metrics.calmarRatio));
        case OptimizationMetric.EXPECTANCY:
            return Math.max(...results.map(r => r.metrics.expectancy));
        case OptimizationMetric.PROFIT_FACTOR:
            return Math.max(...results.map(r => r.metrics.profitFactor));
        case OptimizationMetric.RECOVERY_FACTOR:
            return Math.max(...results.map(r => r.metrics.recoveryFactor));
        case OptimizationMetric.BALANCED_METRIC:
            return Math.max(...results.map(r => calculateBalancedMetric(r.metrics)));
        case OptimizationMetric.ROBUST_METRIC:
            return Math.max(...results.map(r => calculateRobustMetric(r.metrics)));
        default:
            return Math.max(...results.map(r => r.metrics.sharpeRatio));
    }
}
/**
 * Sortuje wyniki optymalizacji według wybranej metryki
 */
function sortResultsByMetric(results, metric) {
    return [...results].sort((a, b) => {
        let aValue, bValue;
        switch (metric) {
            case OptimizationMetric.SHARPE_RATIO:
                aValue = a.metrics.sharpeRatio;
                bValue = b.metrics.sharpeRatio;
                break;
            case OptimizationMetric.SORTINO_RATIO:
                aValue = a.metrics.sortinoRatio;
                bValue = b.metrics.sortinoRatio;
                break;
            case OptimizationMetric.CALMAR_RATIO:
                aValue = a.metrics.calmarRatio;
                bValue = b.metrics.calmarRatio;
                break;
            case OptimizationMetric.EXPECTANCY:
                aValue = a.metrics.expectancy;
                bValue = b.metrics.expectancy;
                break;
            case OptimizationMetric.PROFIT_FACTOR:
                aValue = a.metrics.profitFactor;
                bValue = b.metrics.profitFactor;
                break;
            case OptimizationMetric.RECOVERY_FACTOR:
                aValue = a.metrics.recoveryFactor;
                bValue = b.metrics.recoveryFactor;
                break;
            case OptimizationMetric.BALANCED_METRIC:
                aValue = calculateBalancedMetric(a.metrics);
                bValue = calculateBalancedMetric(b.metrics);
                break;
            case OptimizationMetric.ROBUST_METRIC:
                aValue = calculateRobustMetric(a.metrics);
                bValue = calculateRobustMetric(b.metrics);
                break;
            default:
                aValue = a.metrics.sharpeRatio;
                bValue = b.metrics.sharpeRatio;
        }
        return bValue - aValue; // Sortowanie malejąco
    });
}
/**
 * Przeprowadza zaawansowaną optymalizację strategii
 */
async function optimizeStrategy(config) {
    const { strategyName, parameterSpace, primaryMetric, secondaryMetrics = [], walkForward, monteCarloSimulations, backtestFn, maxIterations, resultsDir, experimentRelay = new experiment_integration_1.NullExperimentRelay() } = config;
    try {
        // Utworzenie katalogu wyników
        const optimizationDir = path.join(resultsDir, `optimization_${strategyName}_${Date.now()}`);
        if (!fs.existsSync(optimizationDir)) {
            fs.mkdirSync(optimizationDir, { recursive: true });
        }
        console.log(`Rozpoczynam zaawansowaną optymalizację dla strategii: ${strategyName}`);
        console.log(`Metryka główna: ${primaryMetric}`);
        console.log(`Optymalizacja wykorzystuje ${maxIterations} iteracji`);
        // Uruchamiamy śledzenie eksperymentu
        experimentRelay.startExperiment();
        const results = [];
        // Tworzymy parametry początkowe
        const initialParams = {};
        for (const [key, range] of Object.entries(parameterSpace)) {
            initialParams[key] = range.min + Math.random() * (range.max - range.min);
        }
        // Pomocnicza funkcja do modyfikacji parametrów wokół obecnych wartości
        const generateParameterVariation = (currentParams, explorationFactor, parameterSpaceLocal) => {
            const newParams = {};
            for (const [key, range] of Object.entries(parameterSpaceLocal)) {
                const currentValue = currentParams[key];
                const rangeSize = (range.max - range.min) * explorationFactor;
                // Generujemy nową wartość w okolicy obecnej
                let newValue = currentValue + (Math.random() * 2 - 1) * rangeSize;
                // Upewniamy się, że nowa wartość mieści się w zakresie
                newValue = Math.max(range.min, Math.min(range.max, newValue));
                // Zaokrąglamy do kroków, jeśli krok jest większy niż 0
                if (range.step > 0) {
                    newValue = range.min + Math.round((newValue - range.min) / range.step) * range.step;
                }
                newParams[key] = newValue;
            }
            return newParams;
        };
        // Główna pętla optymalizacji
        for (let i = 0; i < maxIterations; i++) {
            // Generowanie parametrów dla tej iteracji
            // Początkowo eksplorujemy szeroko, później skupiamy się na najlepszych regionach
            const explorationFactor = 1 - (i / maxIterations) * 0.8; // Od 1.0 do 0.2
            // Wybieramy bazowy zestaw parametrów
            // Z 30% prawdopodobieństwem używamy najlepszych dotychczasowych parametrów,
            // w przeciwnym razie wybieramy losowe parametry z dotychczasowych wyników
            const useTopParams = Math.random() < 0.3 || results.length === 0;
            const baseParams = useTopParams
                ? results.length > 0
                    ? sortResultsByMetric(results, primaryMetric)[0].params
                    : initialParams
                : results[Math.floor(Math.random() * results.length)].params;
            // Generujemy nowy zestaw parametrów
            const params = generateParameterVariation(baseParams, explorationFactor, parameterSpace);
            console.log(`Iteracja ${i + 1}/${maxIterations}: Testowanie parametrów`, params);
            try {
                // Wykonujemy backtesting dla tych parametrów
                const backtestResults = await backtestFn(params);
                const trades = backtestResults.trades || [];
                // Obliczamy metryki dla tych parametrów
                const metrics = calculateMetrics(trades);
                // Dodajemy wynik do listy
                results.push({
                    params,
                    metrics,
                    trades
                });
                // Zapisujemy informacje o iteracji w systemie śledzenia eksperymentów
                experimentRelay.logIteration(i + 1, params, {
                    ...metrics,
                    balancedMetric: calculateBalancedMetric(metrics),
                    robustMetric: calculateRobustMetric(metrics)
                });
                // Logujemy aktualny najlepszy wynik
                if (results.length % 5 === 0 || i === maxIterations - 1) {
                    const bestResult = sortResultsByMetric(results, primaryMetric)[0];
                    console.log(`Najlepszy wynik po ${i + 1} iteracjach:`);
                    console.log(`${primaryMetric}: ${getBestMetricValue(results, primaryMetric).toFixed(4)}`);
                    console.log('Parametry:', bestResult.params);
                    console.log('-----------------------------------------------');
                }
            }
            catch (error) {
                console.error(`Błąd podczas testowania parametrów w iteracji ${i + 1}:`, error);
            }
        }
        // Sortujemy wyniki według głównej metryki
        const sortedResults = sortResultsByMetric(results, primaryMetric);
        // Zapisujemy wyniki
        const resultsData = {
            strategyName,
            primaryMetric,
            secondaryMetrics,
            bestParams: sortedResults[0].params,
            bestMetrics: sortedResults[0].metrics,
            allResults: sortedResults.map(r => ({
                params: r.params,
                metrics: r.metrics
            }))
        };
        fs.writeFileSync(path.join(optimizationDir, 'optimization_results.json'), JSON.stringify(resultsData, null, 2));
        // Zapisujemy transakcje dla najlepszego wyniku
        fs.writeFileSync(path.join(optimizationDir, 'best_trades.json'), JSON.stringify(sortedResults[0].trades, null, 2));
        console.log(`Optymalizacja zakończona. Wyniki zapisane w: ${optimizationDir}`);
        console.log(`Najlepsze parametry:`, sortedResults[0].params);
        console.log(`${primaryMetric}: ${getBestMetricValue([sortedResults[0]], primaryMetric).toFixed(4)}`);
        // Oznaczamy eksperyment jako zakończony w systemie śledzenia
        experimentRelay.completeExperiment({
            metrics: {
                ...sortedResults[0].metrics,
                balancedMetric: calculateBalancedMetric(sortedResults[0].metrics),
                robustMetric: calculateRobustMetric(sortedResults[0].metrics)
            },
            bestParams: sortedResults[0].params
        });
        // Generujemy wizualizacje wyników
        await generateOptimizationVisualizations(resultsData, optimizationDir);
    }
    catch (error) {
        console.error("Błąd podczas optymalizacji:", error);
        // Oznaczamy eksperyment jako nieudany
        experimentRelay.failExperiment(error instanceof Error ? error.message : String(error));
    }
}
/**
 * Generuje wizualizacje wyników optymalizacji
 */
async function generateOptimizationVisualizations(results, outputDir) {
    try {
        // Importujemy moduł wizualizacji
        const { generateOptimizationVisualizations } = require('./optimization_visualizer');
        // Generujemy wizualizacje
        generateOptimizationVisualizations(results, outputDir, results.strategyName);
        console.log(`Wizualizacje zapisane w: ${outputDir}`);
    }
    catch (error) {
        console.error('Błąd podczas generowania wizualizacji:', error);
    }
}

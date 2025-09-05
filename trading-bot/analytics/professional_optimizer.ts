// ============================================================================
//  professional_optimizer.ts - PROFESJONALNY SYSTEM OPTYMALIZACJI
//  Ten moduł implementuje zaawansowane techniki optymalizacji stosowane
//  przez profesjonalnych traderów.
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { Trade } from '../core/types';
import { calculateExtendedMetrics } from './extended_metrics';
import { ExperimentRelay, NullExperimentRelay } from '../tools/experiment_integration';

interface OptimizationResult {
    params: Record<string, any>;
    metrics: {
        sharpeRatio: number;
        sortinoRatio: number;
        calmarRatio: number;
        expectancy: number;
        maxDrawdown: number;
        winRate: number;
        totalPnl: number;
        tradeCount: number;
        profitFactor: number;
        averageWin: number;
        averageLoss: number;
        maxConsecutiveWins: number;
        maxConsecutiveLosses: number;
        recoveryFactor: number;
    };
    trades: Trade[];
}

interface ParameterSpace {
    [key: string]: {
        min: number;
        max: number;
        step: number;
    };
}

/**
 * Enum definujący dostępne metryki do optymalizacji
 */
export enum OptimizationMetric {
    SHARPE_RATIO = 'sharpeRatio',
    SORTINO_RATIO = 'sortinoRatio',
    CALMAR_RATIO = 'calmarRatio',
    EXPECTANCY = 'expectancy',
    PROFIT_FACTOR = 'profitFactor',
    RECOVERY_FACTOR = 'recoveryFactor',
    MAX_DRAWDOWN = 'maxDrawdown',
    WIN_RATE = 'winRate',
    TRADE_COUNT = 'tradeCount',
    TOTAL_PNL = 'totalPnl',
    AVERAGE_WIN = 'averageWin',
    AVERAGE_LOSS = 'averageLoss',
    // Złożone metryki (kombinacja wielu metryk)
    BALANCED_METRIC = 'balancedMetric',
    ROBUST_METRIC = 'robustMetric'
}

/**
 * Konfiguracja zaawansowanej optymalizacji
 */
interface AdvancedOptimizationConfig {
    strategyName: string;
    parameterSpace: ParameterSpace;
    primaryMetric: OptimizationMetric;
    secondaryMetrics?: OptimizationMetric[];
    walkForward?: {
        enabled: boolean;
        inSampleSize: number; // w dniach
        outSampleSize: number; // w dniach
        windowCount: number;
    };
    monteCarloSimulations?: {
        enabled: boolean;
        iterations: number;
    };
    backtestFn: (params: any) => Promise<{
        trades: Trade[];
        [key: string]: any;
    }>;
    maxIterations: number;
    resultsDir: string;
    experimentRelay?: ExperimentRelay; // Dodajemy przekaźnik eksperymentów
}

/**
 * Oblicza metryki dla zestawu transakcji
 */
function calculateMetrics(trades: Trade[]): OptimizationResult['metrics'] {
    // Obliczanie wszystkich metryk za pomocą funkcji z extended_metrics
    const metrics = calculateExtendedMetrics(trades);
    
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
function calculateBalancedMetric(metrics: OptimizationResult['metrics']): number {
    // Zbalansowana metryką łącząca różne aspekty strategii
    // z większym naciskiem na stabilność i zarządzanie ryzykiem
    return (
        (metrics.sharpeRatio * 0.3) +
        (metrics.sortinoRatio * 0.2) +
        (metrics.calmarRatio * 0.2) +
        (metrics.expectancy * 0.1) +
        (metrics.profitFactor * 0.1) +
        ((1 - metrics.maxDrawdown) * 0.1)
    );
}

/**
 * Oblicza metrykę odporności (robustness) strategii
 */
function calculateRobustMetric(metrics: OptimizationResult['metrics']): number {
    // Metryka kładąca nacisk na stabilność i odporność strategii
    const riskRewardRatio = metrics.averageWin / Math.max(metrics.averageLoss, 0.0001);
    const consistencyFactor = Math.min(
        metrics.maxConsecutiveLosses > 0 ? metrics.maxConsecutiveWins / metrics.maxConsecutiveLosses : 5, 
        5
    );
    
    return (
        (metrics.calmarRatio * 0.25) +
        (metrics.recoveryFactor * 0.2) +
        (metrics.expectancy * 0.2) +
        (riskRewardRatio * 0.15) +
        (consistencyFactor * 0.1) +
        (metrics.winRate * 0.1)
    );
}

/**
 * Wybiera najlepszą wartość metryki z wyników optymalizacji
 */
function getBestMetricValue(
    results: OptimizationResult[],
    metric: OptimizationMetric
): number {
    if (results.length === 0) return 0;
    
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
function sortResultsByMetric(
    results: OptimizationResult[],
    metric: OptimizationMetric
): OptimizationResult[] {
    return [...results].sort((a, b) => {
        let aValue: number, bValue: number;
        
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
export async function optimizeStrategy(
    config: AdvancedOptimizationConfig
): Promise<void> {
    const { 
        strategyName, 
        parameterSpace, 
        primaryMetric,
        secondaryMetrics = [],
        walkForward,
        monteCarloSimulations,
        backtestFn,
        maxIterations,
        resultsDir,
        experimentRelay = new NullExperimentRelay()
    } = config;
    
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
    
    const results: OptimizationResult[] = [];
    
    // Tworzymy parametry początkowe
    const initialParams: Record<string, any> = {};
    for (const [key, range] of Object.entries(parameterSpace)) {
        initialParams[key] = range.min + Math.random() * (range.max - range.min);
    }
    
    // Pomocnicza funkcja do modyfikacji parametrów wokół obecnych wartości
    function generateParameterVariation(
        currentParams: Record<string, any>,
        explorationFactor: number
    ): Record<string, any> {
        const newParams: Record<string, any> = {};
        
        for (const [key, range] of Object.entries(parameterSpace)) {
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
    }
    
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
        const params = generateParameterVariation(baseParams, explorationFactor);
        
        console.log(`Iteracja ${i+1}/${maxIterations}: Testowanie parametrów`, params);
        
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
            experimentRelay.logIteration(i+1, params, {
                ...metrics,
                balancedMetric: calculateBalancedMetric(metrics),
                robustMetric: calculateRobustMetric(metrics)
            });
            
            // Logujemy aktualny najlepszy wynik
            if (results.length % 5 === 0 || i === maxIterations - 1) {
                const bestResult = sortResultsByMetric(results, primaryMetric)[0];
                console.log(`Najlepszy wynik po ${i+1} iteracjach:`);
                console.log(`${primaryMetric}: ${getBestMetricValue(results, primaryMetric).toFixed(4)}`);
                console.log('Parametry:', bestResult.params);
                console.log('-----------------------------------------------');
            }
        } catch (error) {
            console.error(`Błąd podczas testowania parametrów w iteracji ${i+1}:`, error);
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
    
    fs.writeFileSync(
        path.join(optimizationDir, 'optimization_results.json'),
        JSON.stringify(resultsData, null, 2)
    );
    
    // Zapisujemy transakcje dla najlepszego wyniku
    fs.writeFileSync(
        path.join(optimizationDir, 'best_trades.json'),
        JSON.stringify(sortedResults[0].trades, null, 2)
    );
    
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
    } catch (error) {
        console.error("Błąd podczas optymalizacji:", error);
        // Oznaczamy eksperyment jako nieudany
        experimentRelay.failExperiment(error instanceof Error ? error.message : String(error));
    }
}

/**
 * Generuje wizualizacje wyników optymalizacji
 */
async function generateOptimizationVisualizations(
    results: any,
    outputDir: string
): Promise<void> {
    try {
        // Importujemy moduł wizualizacji
        const { generateOptimizationVisualizations } = require('./optimization_visualizer');
        
        // Generujemy wizualizacje
        generateOptimizationVisualizations(results, outputDir, results.strategyName);
        
        console.log(`Wizualizacje zapisane w: ${outputDir}`);
    } catch (error) {
        console.error('Błąd podczas generowania wizualizacji:', error);
    }
}

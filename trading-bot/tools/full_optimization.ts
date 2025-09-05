// ============================================================================
//  full_optimization.ts - PEŁNA OPTYMALIZACJA WSZYSTKICH STRATEGII
//  Ten skrypt przeprowadza optymalizację wszystkich dostępnych strategii
//  w systemie, zapisując wyniki i najlepsze parametry dla każdej z nich.
// ============================================================================

import { TestConfig, runTest } from '../main';
import { loadCandles } from '../infrastructure/data/csv_loader';
import * as path from 'path';
import * as fs from 'fs';

// Typy parametrów dla każdej strategii
interface StrategyParams {
    [key: string]: {
        paramRanges: {
            [key: string]: number[] | boolean[]
        },
        description: string
    }
}

// Definicje zakresów parametrów dla wszystkich strategii
const strategyParams: StrategyParams = {
    "RSITurbo": {
        paramRanges: {
            rsiPeriod: [8, 10, 14, 20],
            rsiEntryLong: [20, 25, 30, 35],
            rsiEntryShort: [65, 70, 75, 80],
            adxThreshold: [15, 20, 25, 30]
        },
        description: "Strategia wykorzystująca RSI z filtrem ADX i EMA200"
    },
    "SuperTrend": {
        paramRanges: {
            period: [7, 10, 14, 21],
            multiplier: [1.5, 2.0, 2.5, 3.0, 3.5],
            useEma200Filter: [true, false]
        },
        description: "Strategia oparta na indykatorze SuperTrend"
    },
    "MACrossover": {
        paramRanges: {
            fastPeriod: [5, 9, 12, 21],
            slowPeriod: [21, 50, 100, 200],
            useAdxFilter: [true, false],
            adxThreshold: [15, 20, 25, 30]
        },
        description: "Strategia przecięć średnich kroczących"
    },
    "MomentumConfirm": {
        paramRanges: {
            rsiPeriod: [8, 14, 21],
            macdFastPeriod: [8, 12, 16],
            macdSlowPeriod: [21, 26, 32],
            macdSignalPeriod: [5, 9, 12],
            confirmationPeriods: [1, 2, 3]
        },
        description: "Strategia momentum z potwierdzeniami"
    },
    "MomentumPro": {
        paramRanges: {
            rsiPeriod: [8, 14, 21],
            rsiOverbought: [65, 70, 75, 80],
            rsiOversold: [20, 25, 30, 35],
            adxThreshold: [15, 20, 25, 30],
            rocPeriod: [5, 9, 14]
        },
        description: "Zaawansowana strategia momentum z ROC"
    }
};

// Funkcja generująca wszystkie kombinacje parametrów
function generateCombinations(paramRanges: {[key: string]: any[]}) {
    const keys = Object.keys(paramRanges);
    if (keys.length === 0) return [{}];
    
    // Rekurencyjne generowanie wszystkich kombinacji
    const result: any[] = [];
    const generateHelper = (index: number, current: any) => {
        if (index === keys.length) {
            result.push({...current});
            return;
        }
        
        const key = keys[index];
        const values = paramRanges[key];
        
        for (const value of values) {
            current[key] = value;
            generateHelper(index + 1, current);
        }
    };
    
    generateHelper(0, {});
    return result;
}

// Funkcja do optymalizacji pojedynczej strategii
async function optimizeStrategy(
    strategyName: string, 
    candles: any[],
    maxCombinations: number = 100
) {
    console.log(`\n=== ROZPOCZYNAM OPTYMALIZACJĘ STRATEGII: ${strategyName} ===`);
    console.log(strategyParams[strategyName].description);
    
    // Generowanie wszystkich kombinacji parametrów
    const paramRanges = strategyParams[strategyName].paramRanges;
    let allCombinations = generateCombinations(paramRanges);
    
    // Ograniczenie liczby kombinacji, jeśli jest ich zbyt wiele
    if (allCombinations.length > maxCombinations) {
        console.log(`Wygenerowano ${allCombinations.length} kombinacji, ograniczam do ${maxCombinations}`);
        // Losowe wybranie podzestawu kombinacji
        allCombinations = allCombinations
            .sort(() => Math.random() - 0.5)
            .slice(0, maxCombinations);
    }
    
    console.log(`Testuję ${allCombinations.length} kombinacji parametrów...`);
    
    // Tablica wyników
    const results: any[] = [];
    
    // Folder na wyniki
    const optimizationId = `${strategyName}_optimization_${Date.now()}`;
    const outputDir = path.join('results', 'optimization', optimizationId);
    fs.mkdirSync(outputDir, { recursive: true });
    
    // Testowanie każdej kombinacji
    for (let i = 0; i < allCombinations.length; i++) {
        const params = allCombinations[i];
        const testConfig: TestConfig = {
            id: `${strategyName}_test_${i}_${Date.now()}`,
            initialCapital: 10000,
            riskConfig: {
                maxDrawdown: 0.20,
                maxDailyDrawdown: 0.10,
            },
            simulationConfig: {
                commissionBps: 4,
                slippageBps: 2,
            },
            strategies: [
                {
                    name: strategyName as any, // UWAGA: Wymuszamy typ
                    params
                }
            ],
            symbols: ['BTCUSDT'],
        };
        
        // Wyświetlenie parametrów
        console.log(`\nTest ${i+1}/${allCombinations.length}: ${strategyName} z parametrami:`, params);
        
        // Uruchomienie testu
        try {
            const stats = await runTest(testConfig, candles);
            
            // Zapisanie wyników
            results.push({
                params,
                stats
            });
            
            // Wyświetlenie wyników testu
            console.log(`Wynik: Sharpe=${stats.sharpeRatio?.toFixed(4) || 'N/A'}, PnL=${stats.totalPnl?.toFixed(2) || 'N/A'}, WinRate=${(stats.winRate * 100)?.toFixed(1) || 'N/A'}%`);
        } catch (error) {
            console.error(`Błąd podczas testu: ${error}`);
        }
    }
    
    // Sortowanie wyników po Sharpe Ratio (od najlepszego)
    results.sort((a, b) => (b.stats.sharpeRatio || 0) - (a.stats.sharpeRatio || 0));
    
    // Zapisanie wszystkich wyników do CSV
    const columns = [...Object.keys(paramRanges), 'sharpeRatio', 'sortinoRatio', 'calmarRatio', 'totalPnl', 'winRate', 'tradeCount', 'maxDrawdown'];
    const csvHeader = columns.join(',') + '\n';
    const csvRows = results.map(r => {
        const paramValues = Object.keys(paramRanges).map(key => r.params[key]);
        const statValues = ['sharpeRatio', 'sortinoRatio', 'calmarRatio', 'totalPnl', 'winRate', 'tradeCount', 'maxDrawdown']
            .map(key => r.stats[key] !== undefined ? r.stats[key] : '');
        return [...paramValues, ...statValues].join(',');
    });
    fs.writeFileSync(path.join(outputDir, 'all_results.csv'), csvHeader + csvRows.join('\n'));
    
    // Zapisanie najlepszych parametrów
    const bestParams = results.length > 0 ? results[0].params : null;
    const bestStats = results.length > 0 ? results[0].stats : null;
    
    if (bestParams && bestStats) {
        console.log(`\n=== NAJLEPSZE PARAMETRY DLA ${strategyName} ===`);
        console.log(bestParams);
        console.log(`Sharpe Ratio: ${bestStats.sharpeRatio?.toFixed(4)}`);
        console.log(`Całkowity PnL: ${bestStats.totalPnl?.toFixed(2)}`);
        console.log(`Win Rate: ${(bestStats.winRate * 100)?.toFixed(1)}%`);
        console.log(`Liczba transakcji: ${bestStats.tradeCount}`);
        
        // Zapisanie najlepszych parametrów do JSON
        fs.writeFileSync(
            path.join(outputDir, 'best_params.json'), 
            JSON.stringify({strategy: strategyName, params: bestParams, stats: bestStats}, null, 2)
        );
    } else {
        console.log(`\nNie znaleziono działających parametrów dla ${strategyName}`);
    }
    
    console.log(`\n=== OPTYMALIZACJA ${strategyName} ZAKOŃCZONA ===`);
    console.log(`Wyniki zapisane w katalogu: ${outputDir}`);
    
    return { strategyName, bestParams, bestStats };
}

// Główna funkcja do pełnej optymalizacji wszystkich strategii
async function runFullOptimization() {
    console.log('=== ROZPOCZYNAM PEŁNĄ OPTYMALIZACJĘ WSZYSTKICH STRATEGII ===');
    
    // Ładowanie danych
    console.log('Ładowanie danych świecowych...');
    const candles = await loadCandles('./data/BTCUSDT/15m.csv');
    console.log(`Załadowano ${candles.length} świec 15-minutowych.`);
    
    // Ograniczenie danych do testów (opcjonalne)
    const testCandleLimit = 10000; // Używamy więcej danych niż w standardowym teście
    const testCandles = candles.length > testCandleLimit ? 
        candles.slice(0, testCandleLimit) : candles;
    
    if (candles.length > testCandleLimit) {
        console.log(`Ograniczono dane do ${testCandleLimit} świec dla przyspieszenia testów.`);
    }
    
    // Folder na podsumowanie
    const summaryDir = path.join('results', 'optimization', `full_summary_${Date.now()}`);
    fs.mkdirSync(summaryDir, { recursive: true });
    
    // Tablica na wyniki wszystkich strategii
    const allResults: any[] = [];
    
    // Optymalizacja każdej strategii
    for (const strategyName of Object.keys(strategyParams)) {
        try {
            const result = await optimizeStrategy(strategyName, testCandles);
            allResults.push(result);
        } catch (error) {
            console.error(`Błąd podczas optymalizacji ${strategyName}: ${error}`);
        }
    }
    
    // Zapisanie podsumowania wszystkich strategii
    fs.writeFileSync(
        path.join(summaryDir, 'optimization_summary.json'),
        JSON.stringify(allResults, null, 2)
    );
    
    // Podsumowanie w formacie CSV
    const summaryHeader = 'strategy,sharpeRatio,sortinoRatio,totalPnl,winRate,tradeCount,maxDrawdown\n';
    const summaryRows = allResults.map(r => {
        if (!r.bestStats) return `${r.strategyName},,,,,`;
        
        const s = r.bestStats;
        return `${r.strategyName},${s.sharpeRatio || ''},${s.sortinoRatio || ''},${s.totalPnl || ''},${s.winRate || ''},${s.tradeCount || ''},${s.maxDrawdown || ''}`;
    });
    fs.writeFileSync(path.join(summaryDir, 'strategies_comparison.csv'), summaryHeader + summaryRows.join('\n'));
    
    // Ranking strategii według Sharpe Ratio
    console.log('\n=== RANKING STRATEGII (według Sharpe Ratio) ===');
    allResults
        .filter(r => r.bestStats && r.bestStats.sharpeRatio)
        .sort((a, b) => (b.bestStats.sharpeRatio || 0) - (a.bestStats.sharpeRatio || 0))
        .forEach((r, i) => {
            console.log(`${i+1}. ${r.strategyName}: Sharpe=${r.bestStats.sharpeRatio.toFixed(4)}, PnL=${r.bestStats.totalPnl.toFixed(2)}`);
        });
    
    console.log('\n=== PEŁNA OPTYMALIZACJA ZAKOŃCZONA ===');
    console.log(`Podsumowanie zapisane w katalogu: ${summaryDir}`);
    
    return allResults;
}

// Uruchomienie pełnej optymalizacji
runFullOptimization().catch(console.error);

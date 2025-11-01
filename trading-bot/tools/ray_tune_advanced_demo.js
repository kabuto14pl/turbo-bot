"use strict";
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
// ============================================================================
//  RAY TUNE ADVANCED DEMO - Zaawansowane demo integracji z Ray Tune
//  🚀 Faza 1.2: Implementacja Mostka TypeScript-Python
//  ✅ Kompatybilny z Linux/WSL Python 3.10.18
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
exports.demoMathOptimization = demoMathOptimization;
exports.demoTradingStrategyOptimization = demoTradingStrategyOptimization;
exports.demoAlgorithmComparison = demoAlgorithmComparison;
const ray_tune_optimizer_1 = require("./ray_tune_optimizer");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Funkcja do logowania z czasem
function logWithTime(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}
// DEMO 1: Optymalizacja prostej funkcji matematycznej
async function demoMathOptimization() {
    logWithTime('🧮 DEMO 1: Optymalizacja funkcji matematycznej');
    // Konfiguracja Ray Tune - NAPRAWIONA Z GLOBALNYM TIMEOUT
    const config = {
        experimentName: 'math_optimization_demo',
        metric: 'score',
        mode: 'min',
        numSamples: 10, // ✅ Zmniejszone dla szybszego testu
        maxConcurrentTrials: 2,
        cpusPerTrial: 1,
        timeoutPerTrial: 30, // ✅ Timeout 30 sekund na trial
        maxFailures: 3, // ✅ Maksymalnie 3 nieudane próby
        verbose: true,
        globalTimeout: 600 // ✅ NOWE: 10 minut globalny timeout (600 sekund)
    };
    // Przestrzeń parametrów
    const parameterSpace = {
        x: { type: 'uniform', min: -10, max: 10 },
        y: { type: 'uniform', min: -10, max: 10 },
        alpha: { type: 'loguniform', min: 0.001, max: 1.0 },
        method: { type: 'choice', values: ['quadratic', 'exponential', 'sine'] }
    };
    // Funkcja obiektywna (minimalizujemy) - NAPRAWIONA
    async function objectiveFunction(params) {
        const { x, y, alpha, method } = params;
        logWithTime(`🔄 [STEP] Rozpoczynam evaluację: x=${x.toFixed(3)}, y=${y.toFixed(3)}, α=${alpha.toFixed(4)}, method=${method}`);
        let result;
        switch (method) {
            case 'quadratic':
                // Minimalizujemy funkcję kwadratową z centrum w (2, 3)
                result = alpha * ((x - 2) ** 2 + (y - 3) ** 2);
                break;
            case 'exponential':
                // Funkcja eksponencjalna
                result = alpha * Math.exp(0.1 * (x ** 2 + y ** 2));
                break;
            case 'sine':
                // Funkcja sinusoidalna z lokalnymi minimami
                result = alpha * (Math.sin(x) ** 2 + Math.cos(y) ** 2) + 0.1 * (x ** 2 + y ** 2);
                break;
            default:
                result = Infinity;
        }
        // Symulacja czasu obliczeniowego (skrócona)
        await new Promise(resolve => setTimeout(resolve, 20));
        logWithTime(`✅ [RESULT] Zakończono evaluację: score=${result.toFixed(4)}`);
        return result;
    }
    // Uruchom optymalizację
    const optimizer = new ray_tune_optimizer_1.RayTuneOptimizer(config);
    try {
        const results = await optimizer.optimize(objectiveFunction, parameterSpace);
        logWithTime('✅ Optymalizacja zakończona pomyślnie!');
        logWithTime(`🏆 Najlepszy wynik: ${results.bestScore.toFixed(6)}`);
        logWithTime(`🎯 Najlepsze parametry:`);
        console.log(JSON.stringify(results.bestParameters, null, 2));
        // Zapisz wyniki demo
        const demoResultsPath = path.resolve(__dirname, 'demo_results_math.json');
        fs.writeFileSync(demoResultsPath, JSON.stringify(results, null, 2));
        logWithTime(`📄 Wyniki zapisane do: ${demoResultsPath}`);
        return results;
    }
    catch (error) {
        logWithTime(`❌ Błąd podczas optymalizacji: ${error}`);
        throw error;
    }
    finally {
        optimizer.cleanup();
    }
}
// DEMO 2: Optymalizacja strategii handlowej (symulowana)
async function demoTradingStrategyOptimization() {
    logWithTime('📈 DEMO 2: Optymalizacja strategii handlowej');
    // Symulowane dane cenowe BTC (uproszczone)
    const generatePriceData = (days) => {
        const prices = [];
        let price = 50000; // Cena początkowa
        for (let i = 0; i < days; i++) {
            // Symulacja ruchu cen z trendem i noise
            const trend = Math.sin(i * 0.02) * 0.001;
            const noise = (Math.random() - 0.5) * 0.02;
            price *= (1 + trend + noise);
            prices.push(price);
        }
        return prices;
    };
    const prices = generatePriceData(1000);
    // Konfiguracja Ray Tune dla strategii handlowej
    const config = {
        experimentName: 'trading_strategy_demo',
        metric: 'score',
        mode: 'max', // Maksymalizujemy zysk
        numSamples: 30,
        maxConcurrentTrials: 3,
        cpusPerTrial: 1,
        verbose: true,
        globalTimeout: 600 // ✅ NOWE: 10 minut globalny timeout
    };
    // Przestrzeń parametrów strategii
    const parameterSpace = {
        shortMaPeriod: { type: 'randint', min: 5, max: 20 },
        longMaPeriod: { type: 'randint', min: 20, max: 100 },
        rsiPeriod: { type: 'randint', min: 10, max: 30 },
        rsiOverbought: { type: 'uniform', min: 70, max: 90 },
        rsiOversold: { type: 'uniform', min: 10, max: 30 },
        stopLoss: { type: 'uniform', min: 0.01, max: 0.05 },
        takeProfit: { type: 'uniform', min: 0.02, max: 0.10 },
        volumeFilter: { type: 'choice', values: ['true', 'false'] }
    };
    // Funkcja obiektywna - symulacja backtestingu strategii
    async function strategyObjective(params) {
        const { shortMaPeriod, longMaPeriod, rsiPeriod, rsiOverbought, rsiOversold, stopLoss, takeProfit, volumeFilter } = params;
        // Walidacja parametrów
        if (shortMaPeriod >= longMaPeriod) {
            return -1000; // Penalizacja za nieprawidłowe parametry
        }
        // Symulacja obliczeń MA
        const calculateMA = (prices, period, index) => {
            if (index < period - 1)
                return null;
            const sum = prices.slice(index - period + 1, index + 1).reduce((a, b) => a + b, 0);
            return sum / period;
        };
        // Symulacja RSI
        const calculateRSI = (prices, period, index) => {
            if (index < period)
                return 50; // Domyślna wartość
            return 30 + Math.random() * 40; // Symulacja RSI 30-70
        };
        // Symulacja backtestingu
        let balance = 1000; // Kapitał początkowy
        let position = 0; // 0 = brak pozycji, 1 = long, -1 = short
        let entryPrice = 0;
        let totalTrades = 0;
        let winningTrades = 0;
        for (let i = Math.max(longMaPeriod, rsiPeriod); i < prices.length - 1; i++) {
            const currentPrice = prices[i];
            const shortMA = calculateMA(prices, shortMaPeriod, i);
            const longMA = calculateMA(prices, longMaPeriod, i);
            const rsi = calculateRSI(prices, rsiPeriod, i);
            if (!shortMA || !longMA)
                continue;
            // Sygnały kupna/sprzedaży
            const bullishSignal = shortMA > longMA && rsi < rsiOversold;
            const bearishSignal = shortMA < longMA && rsi > rsiOverbought;
            // Zarządzanie pozycjami
            if (position === 0) {
                // Brak pozycji - szukamy sygnału wejścia
                if (bullishSignal) {
                    position = 1;
                    entryPrice = currentPrice;
                }
                else if (bearishSignal) {
                    position = -1;
                    entryPrice = currentPrice;
                }
            }
            else {
                // Mamy pozycję - sprawdzamy wyjście
                const priceChange = (currentPrice - entryPrice) / entryPrice;
                const pnl = position * priceChange;
                // Stop loss / take profit
                const shouldExit = pnl <= -stopLoss ||
                    pnl >= takeProfit ||
                    (position === 1 && bearishSignal) ||
                    (position === -1 && bullishSignal);
                if (shouldExit) {
                    balance *= (1 + pnl);
                    totalTrades++;
                    if (pnl > 0)
                        winningTrades++;
                    position = 0;
                }
            }
        }
        // Oblicz metryki wydajności
        const totalReturn = (balance - 1000) / 1000;
        const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
        const score = totalReturn * 0.7 + winRate * 0.3; // Ważona ocena
        // Symulacja czasu obliczeniowego
        await new Promise(resolve => setTimeout(resolve, 100));
        logWithTime(`   Strategia: MA(${shortMaPeriod},${longMaPeriod}), RSI(${rsiPeriod}), SL=${(stopLoss * 100).toFixed(1)}%, TP=${(takeProfit * 100).toFixed(1)}% → score=${score.toFixed(4)} (${totalTrades} trades, ${(winRate * 100).toFixed(1)}% win)`);
        return score;
    }
    // Uruchom optymalizację
    const optimizer = new ray_tune_optimizer_1.RayTuneOptimizer(config);
    try {
        const results = await optimizer.optimize(strategyObjective, parameterSpace);
        logWithTime('✅ Optymalizacja strategii zakończona!');
        logWithTime(`🏆 Najlepszy wynik: ${results.bestScore.toFixed(6)}`);
        logWithTime(`🎯 Najlepsze parametry strategii:`);
        console.log(JSON.stringify(results.bestParameters, null, 2));
        // Zapisz wyniki demo
        const demoResultsPath = path.resolve(__dirname, 'demo_results_trading.json');
        fs.writeFileSync(demoResultsPath, JSON.stringify(results, null, 2));
        logWithTime(`📄 Wyniki zapisane do: ${demoResultsPath}`);
        return results;
    }
    catch (error) {
        logWithTime(`❌ Błąd podczas optymalizacji: ${error}`);
        throw error;
    }
    finally {
        optimizer.cleanup();
    }
}
// DEMO 3: Test różnych algorytmów optymalizacji
async function demoAlgorithmComparison() {
    logWithTime('⚙️ DEMO 3: Porównanie algorytmów optymalizacji');
    // Funkcja do testowania różnych konfiguracji
    const testConfiguration = async (configName, config) => {
        logWithTime(`🧪 Testowanie konfiguracji: ${configName}`);
        const parameterSpace = {
            a: { type: 'uniform', min: -5, max: 5 },
            b: { type: 'uniform', min: -5, max: 5 },
            c: { type: 'choice', values: [0.1, 0.5, 1.0, 2.0] }
        };
        // Funkcja Rosenbrock (trudna do optymalizacji)
        async function rosenbrockFunction(params) {
            const { a, b, c } = params;
            const result = c * (100 * (b - a ** 2) ** 2 + (1 - a) ** 2);
            await new Promise(resolve => setTimeout(resolve, 30));
            return result;
        }
        const optimizer = new ray_tune_optimizer_1.RayTuneOptimizer(config);
        try {
            const startTime = Date.now();
            const results = await optimizer.optimize(rosenbrockFunction, parameterSpace);
            const duration = Date.now() - startTime;
            logWithTime(`   ${configName}: wynik=${results.bestScore.toFixed(4)}, czas=${duration}ms, próby=${results.allTrials.length}`);
            return {
                configName,
                bestScore: results.bestScore,
                duration,
                trials: results.allTrials.length,
                bestParams: results.bestParameters
            };
        }
        catch (error) {
            logWithTime(`   ❌ ${configName}: błąd - ${error}`);
            return null;
        }
        finally {
            optimizer.cleanup();
        }
    };
    // Testuj różne konfiguracje
    const configs = [
        {
            name: 'Szybka (10 próby)',
            config: {
                experimentName: 'fast_test',
                metric: 'score',
                mode: 'min',
                numSamples: 10,
                maxConcurrentTrials: 2,
                cpusPerTrial: 1,
                verbose: false
            }
        },
        {
            name: 'Standardowa (20 próby)',
            config: {
                experimentName: 'standard_test',
                metric: 'score',
                mode: 'min',
                numSamples: 20,
                maxConcurrentTrials: 3,
                cpusPerTrial: 1,
                verbose: false
            }
        },
        {
            name: 'Dokładna (40 próby)',
            config: {
                experimentName: 'thorough_test',
                metric: 'score',
                mode: 'min',
                numSamples: 40,
                maxConcurrentTrials: 4,
                cpusPerTrial: 1,
                verbose: false
            }
        }
    ];
    const results = [];
    for (const { name, config } of configs) {
        const result = await testConfiguration(name, config);
        if (result)
            results.push(result);
    }
    // Podsumowanie wyników
    logWithTime('📊 PODSUMOWANIE PORÓWNANIA:');
    results.forEach(result => {
        logWithTime(`   ${result.configName}: score=${result.bestScore.toFixed(4)}, czas=${result.duration}ms`);
    });
    // Zapisz wyniki porównania
    const comparisonPath = path.resolve(__dirname, 'demo_results_comparison.json');
    fs.writeFileSync(comparisonPath, JSON.stringify(results, null, 2));
    logWithTime(`📄 Porównanie zapisane do: ${comparisonPath}`);
    return results;
}
// Główna funkcja demo
async function main() {
    logWithTime('🚀 URUCHAMIANIE KOMPLEKSOWEGO DEMO RAY TUNE');
    logWithTime('================================================');
    try {
        // Demo 1: Funkcja matematyczna
        logWithTime('');
        await demoMathOptimization();
        // Demo 2: Strategia handlowa
        logWithTime('');
        await demoTradingStrategyOptimization();
        // Demo 3: Porównanie algorytmów
        logWithTime('');
        await demoAlgorithmComparison();
        logWithTime('');
        logWithTime('🎉 WSZYSTKIE DEMO ZAKOŃCZONE POMYŚLNIE!');
        logWithTime('✅ Ray Tune działa poprawnie i jest gotowy do użycia');
        logWithTime('📁 Sprawdź pliki demo_results_*.json dla szczegółowych wyników');
    }
    catch (error) {
        logWithTime(`❌ Błąd podczas wykonywania demo: ${error}`);
        process.exit(1);
    }
}
// Uruchom demo jeśli wywołane bezpośrednio
if (require.main === module) {
    main();
}

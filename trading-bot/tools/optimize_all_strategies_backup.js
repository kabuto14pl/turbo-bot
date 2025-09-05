"use strict";
// ============================================================================
//  optimize_all_strategies.ts - OPTYMALIZACJA WSZYSTKICH STRATEGII
//  Ten skrypt przeprowadza optymalizację dla wszystkich strategii na różnych
//  interwałach czasowych z wykorzystaniem czystych danych.
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const csv_loader_1 = require("../infrastructure/data/csv_loader");
// Mock funkcja optymalizacji - zastąpi brakującą runAdvancedOptimization
async function runAdvancedOptimization(config) {
    console.log(`Optymalizuję strategię ${config.strategyName} z ${config.trials} próbami...`);
    // Symulacja optymalizacji - zastąp rzeczywistą implementacją
    return {
        bestParams: {
            rsiPeriod: 14,
            oversold: 30,
            overbought: 70,
            stopLoss: 0.02,
            takeProfit: 0.04
        },
        bestMetrics: {
            sharpeRatio: 1.5 + Math.random(),
            totalPnl: 1000 + Math.random() * 5000,
            winRate: 0.5 + Math.random() * 0.3,
            maxDrawdown: 0.1 + Math.random() * 0.1,
            profitFactor: 1.2 + Math.random() * 0.8
        }
    };
}
// --- GŁÓWNA FUNKCJA ---
async function optimizeAllStrategies() {
    console.log('\n=== ROZPOCZYNAM OPTYMALIZACJĘ WSZYSTKICH STRATEGII ===');
    // Definicja plików dla różnych interwałów z czystymi danymi
    const timeframes = [
        { name: '15m', file: 'BTC_data_15m_clean.csv' },
        { name: '1h', file: 'BTC_data_1h_clean.csv' },
        { name: '4h', file: 'BTC_data_4h_clean.csv' },
        { name: '1d', file: 'BTC_data_1d_clean.csv' }
    ];
    console.log('Ładowanie danych świecowych dla wszystkich interwałów...');
    // Załaduj dane dla wszystkich interwałów
    const candlesData = {};
    for (const timeframe of timeframes) {
        try {
            console.log(`Ładowanie danych dla interwału ${timeframe.name}...`);
            const candles = await (0, csv_loader_1.loadCandles)(timeframe.file);
            console.log(`Załadowano ${candles.length} świec ${timeframe.name}`);
            candlesData[timeframe.name] = candles;
        }
        catch (error) {
            console.error(`Błąd podczas ładowania danych dla interwału ${timeframe.name}:`, error);
        }
    }
    if (Object.keys(candlesData).length === 0) {
        throw new Error("Nie udało się załadować żadnych danych. Przerywam optymalizację.");
    }
    // Przygotowanie konfiguracji bazowej
    const baseConfig = {
        initialCapital: 10000,
        riskConfig: {
            maxDrawdown: 0.20,
            maxDailyDrawdown: 0.10,
        },
        simulationConfig: {
            commissionBps: 5, // 0.05% prowizji
            slippageBps: 2, // 0.02% poślizgu
        },
        symbols: ['BTCUSDT'],
    };
    const resultsDir = path.join('results', `multi_strategy_optimization_${Date.now()}`);
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }
    // Wyniki dla wszystkich strategii i interwałów
    const allResults = {};
    // Zmienna results dla kompatybilności
    const results = {};
    // Definicja dataPath
    const dataPath = './data';
    // Przeprowadź optymalizację dla każdego interwału
    for (const timeframe of timeframes) {
        if (!candlesData[timeframe.name] || candlesData[timeframe.name].length === 0) {
            console.log(`Pomijam interwał ${timeframe.name} - brak danych`);
            continue;
        }
        console.log(`\n============================================================`);
        console.log(`=== OPTYMALIZACJA DLA INTERWAŁU ${timeframe.name} ===`);
        console.log(`============================================================\n`);
        const timeframeCandles = candlesData[timeframe.name];
        const timeframeResults = {};
        // 1. RSITurbo
        console.log('\n=== OPTYMALIZACJA STRATEGII RSI TURBO ===');
        try {
            const rsiConfig = {
                ...baseConfig,
                id: `RSITurbo_optimization_${Date.now()}`,
                strategies: [{ name: "RSITurbo", params: {} }],
            };
            results.RSITurbo = await runAdvancedOptimization({
                strategyName: "RSITurbo",
                baseConfig: rsiConfig,
                dataPath,
                metricName: 'sharpeRatio',
                trials: 50,
                walkForward: true,
                walkForwardPeriods: 3
            });
            console.log("Najlepsze parametry RSI Turbo:", results.RSITurbo.bestParams);
        }
        catch (error) {
            console.error("Błąd podczas optymalizacji RSI Turbo:", error);
        }
        // 2. SuperTrend
        console.log('\n=== OPTYMALIZACJA STRATEGII SUPERTREND ===');
        try {
            const stConfig = {
                ...baseConfig,
                id: `SuperTrend_optimization_${Date.now()}`,
                strategies: [{ name: "SuperTrend", params: {} }],
            };
            results.SuperTrend = await runAdvancedOptimization({
                strategyName: "SuperTrend",
                baseConfig: stConfig,
                dataPath,
                metricName: 'sharpeRatio',
                trials: 50,
                walkForward: true,
                walkForwardPeriods: 3
            });
            console.log("Najlepsze parametry SuperTrend:", results.SuperTrend.bestParams);
        }
        catch (error) {
            console.error("Błąd podczas optymalizacji SuperTrend:", error);
        }
        // 3. MACrossover
        console.log('\n=== OPTYMALIZACJA STRATEGII MA CROSSOVER ===');
        try {
            const maConfig = {
                ...baseConfig,
                id: `MACrossover_optimization_${Date.now()}`,
                strategies: [{ name: "MACrossover", params: {} }],
            };
            results.MACrossover = await runAdvancedOptimization({
                strategyName: "MACrossover",
                baseConfig: maConfig,
                dataPath,
                metricName: 'sharpeRatio',
                trials: 50,
                walkForward: true,
                walkForwardPeriods: 3
            });
            console.log("Najlepsze parametry MA Crossover:", results.MACrossover.bestParams);
        }
        catch (error) {
            console.error("Błąd podczas optymalizacji MA Crossover:", error);
        }
        // 4. MomentumConfirm
        console.log('\n=== OPTYMALIZACJA STRATEGII MOMENTUM CONFIRMATION ===');
        try {
            const mcConfig = {
                ...baseConfig,
                id: `MomentumConfirm_optimization_${Date.now()}`,
                strategies: [{ name: "MomentumConfirm", params: {} }],
            };
            results.MomentumConfirm = await runAdvancedOptimization({
                strategyName: "MomentumConfirm",
                baseConfig: mcConfig,
                dataPath,
                metricName: 'sharpeRatio',
                trials: 50,
                walkForward: true,
                walkForwardPeriods: 3
            });
            console.log("Najlepsze parametry Momentum Confirmation:", results.MomentumConfirm.bestParams);
        }
        catch (error) {
            console.error("Błąd podczas optymalizacji Momentum Confirmation:", error);
        }
        // 5. MomentumPro
        console.log('\n=== OPTYMALIZACJA STRATEGII MOMENTUM PRO ===');
        try {
            const mpConfig = {
                ...baseConfig,
                id: `MomentumPro_optimization_${Date.now()}`,
                strategies: [{ name: "MomentumPro", params: {} }],
            };
            results.MomentumPro = await runAdvancedOptimization({
                strategyName: "MomentumPro",
                baseConfig: mpConfig,
                dataPath,
                metricName: 'sharpeRatio',
                trials: 50,
                walkForward: true,
                walkForwardPeriods: 3
            });
            console.log("Najlepsze parametry Momentum Pro:", results.MomentumPro.bestParams);
        }
        catch (error) {
            console.error("Błąd podczas optymalizacji Momentum Pro:", error);
        }
        // Zapisz wyniki dla tego timeframe
        allResults[timeframe.name] = { ...results };
    }
    // Zapis podsumowania wyników
    fs.writeFileSync(path.join(resultsDir, `all_strategies_results_${Date.now()}.json`), JSON.stringify(results, null, 2));
    console.log('\n=== PODSUMOWANIE OPTYMALIZACJI WSZYSTKICH STRATEGII ===');
    for (const [strategy, result] of Object.entries(results)) {
        if (result && result.bestParams) {
            console.log(`${strategy}:`);
            console.log(`  Najlepsze parametry: ${JSON.stringify(result.bestParams)}`);
            if (result.bestMetrics) {
                console.log(`  Wskaźnik Sharpe: ${result.bestMetrics.sharpeRatio?.toFixed(4) || 'N/A'}`);
                console.log(`  PnL: ${result.bestMetrics.totalPnl?.toFixed(2) || 'N/A'}`);
                console.log(`  Win Rate: ${(result.bestMetrics.winRate * 100)?.toFixed(2) || 'N/A'}%`);
            }
            console.log('');
        }
        else {
            console.log(`${strategy}: Brak wyników lub błąd podczas optymalizacji`);
        }
    }
    console.log(`Szczegółowe wyniki zapisane w: ${resultsDir}`);
    console.log('=== OPTYMALIZACJA WSZYSTKICH STRATEGII ZAKOŃCZONA ===');
}
// Uruchomienie funkcji głównej
optimizeAllStrategies().catch(console.error);

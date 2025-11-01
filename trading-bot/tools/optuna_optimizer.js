"use strict";
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
exports.runOptunaBayesianOptimization = runOptunaBayesianOptimization;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
const optuna_ts_1 = require("optuna-ts");
const main_1 = require("../main");
const csv_loader_1 = require("../infrastructure/data/csv_loader");
const fs = __importStar(require("fs"));
// Lista strategii i ich domyślnych parametrów do optymalizacji
const strategies = [
    {
        name: 'RSITurbo',
        paramSpace: (trial) => ({
            rsiPeriod: trial.suggestInt('rsiPeriod', 10, 20),
            overbought: trial.suggestInt('overbought', 60, 80),
            oversold: trial.suggestInt('oversold', 20, 40),
            atrMultiplier: trial.suggestFloat('atrMultiplier', 1.0, 3.0),
            stopLossAtr: trial.suggestFloat('stopLossAtr', 1.0, 2.5),
        })
    },
    {
        name: 'SuperTrend',
        paramSpace: (trial) => ({
            period: trial.suggestInt('period', 7, 20),
            multiplier: trial.suggestFloat('multiplier', 1.0, 5.0),
            atrMultiplier: trial.suggestFloat('atrMultiplier', 1.0, 3.0),
        })
    },
    {
        name: 'MACrossover',
        paramSpace: (trial) => ({
            fastPeriod: trial.suggestInt('fastPeriod', 5, 20),
            slowPeriod: trial.suggestInt('slowPeriod', 21, 100),
        })
    },
    {
        name: 'MomentumConfirm',
        paramSpace: (trial) => ({
            macdFast: trial.suggestInt('macdFast', 8, 20),
            macdSlow: trial.suggestInt('macdSlow', 21, 50),
            macdSignal: trial.suggestInt('macdSignal', 5, 15),
        })
    },
    {
        name: 'MomentumPro',
        paramSpace: (trial) => ({
            rocPeriod: trial.suggestInt('rocPeriod', 5, 20),
            rsiPeriod: trial.suggestInt('rsiPeriod', 10, 20),
            overbought: trial.suggestInt('overbought', 60, 80),
            oversold: trial.suggestInt('oversold', 20, 40),
        })
    },
    {
        name: 'EnhancedRSITurbo',
        paramSpace: (trial) => ({
            rsiPeriod: trial.suggestInt('rsiPeriod', 10, 20),
            overbought: trial.suggestInt('overbought', 60, 80),
            oversold: trial.suggestInt('oversold', 20, 40),
            rsiSmoothing: trial.suggestInt('rsiSmoothing', 1, 5),
            trendFilter: trial.suggestInt('trendFilter', 0, 2),
        })
    },
    {
        name: 'AdvancedAdaptive',
        paramSpace: (trial) => ({
            rsiPeriod: trial.suggestInt('rsiPeriod', 10, 20),
            rsiOversold: trial.suggestInt('rsiOversold', 20, 40),
            rsiOverbought: trial.suggestInt('rsiOverbought', 60, 80),
            emaShortPeriod: trial.suggestInt('emaShortPeriod', 10, 50),
            emaLongPeriod: trial.suggestInt('emaLongPeriod', 100, 300),
            adxPeriod: trial.suggestInt('adxPeriod', 10, 20),
            atrPeriod: trial.suggestInt('atrPeriod', 10, 20),
            atrMultiplier: trial.suggestFloat('atrMultiplier', 1.0, 3.0),
        })
    }
];
const intervals = [
    { name: 'm15', file: 'data/BTCUSDT/15m.csv' },
    { name: '1h', file: 'data/BTCUSDT/1h.csv' },
    { name: '4h', file: 'data/BTCUSDT/4h.csv' },
    { name: '1d', file: 'data/BTCUSDT/1d.csv' },
];
const resultsSummary = [];
async function objectiveFactory(strategyName, paramSpace, candles, interval) {
    return async (trial) => {
        const params = paramSpace(trial);
        const testConfig = {
            id: `optuna_${strategyName}_${interval}_${Date.now()}`,
            strategies: [
                {
                    name: strategyName,
                    params: params
                }
            ],
            initialCapital: 10000,
            riskConfig: {
                maxDrawdown: 0.2,
                maxDailyDrawdown: 0.1
            },
            simulationConfig: {
                commissionBps: 2,
                slippageBps: 1
            },
            symbols: ['BTCUSDT']
        };
        const stats = await (0, main_1.runTest)(testConfig, candles);
        // Zwracamy Sharpe Ratio jako metrykę optymalizacji
        return stats.sharpeRatio || 0;
    };
}
async function runOptunaBayesianOptimization() {
    for (const strategy of strategies) {
        for (const interval of intervals) {
            console.log(`\n=== Optymalizacja: ${strategy.name} | Interwał: ${interval.name} ===`);
            const candles = await (0, csv_loader_1.loadCandles)(interval.file);
            const study = await (0, optuna_ts_1.createStudy)({
                direction: 'maximize',
                sampler: 'TPESampler',
                pruner: 'MedianPruner',
            });
            const objective = await objectiveFactory(strategy.name, strategy.paramSpace, candles, interval.name);
            await study.optimize(objective, 100, 2); // np. 100 prób, 2 równolegle
            // Po optymalizacji pobierz najlepsze parametry i statystyki
            const bestParams = study.bestParams;
            // Uruchom test z najlepszymi parametrami, by zebrać podsumowanie
            const testConfig = {
                id: `summary_${strategy.name}_${interval.name}_${Date.now()}`,
                strategies: [
                    {
                        name: strategy.name,
                        params: bestParams
                    }
                ],
                initialCapital: 10000,
                riskConfig: {
                    maxDrawdown: 0.2,
                    maxDailyDrawdown: 0.1
                },
                simulationConfig: {
                    commissionBps: 2,
                    slippageBps: 1
                },
                symbols: ['BTCUSDT']
            };
            const stats = await (0, main_1.runTest)(testConfig, candles);
            resultsSummary.push({
                strategy: strategy.name,
                interval: interval.name,
                bestParams,
                initialCapital: testConfig.initialCapital,
                profit: stats.netProfit || 0,
                trades: stats.trades || 0,
                sharpe: stats.sharpeRatio || 0
            });
            console.log(`Najlepsze parametry:`, bestParams);
            console.log(`Podsumowanie: Kapitał startowy: ${testConfig.initialCapital}, Zysk: ${stats.netProfit}, Liczba transakcji: ${stats.trades}, Sharpe: ${stats.sharpeRatio}`);
        }
    }
    // Zapisz zbiorcze podsumowanie do pliku JSON
    fs.writeFileSync('optuna_summary.json', JSON.stringify(resultsSummary, null, 2), 'utf-8');
    console.log('\n=== Zbiorcze podsumowanie zapisane do optuna_summary.json ===');
}

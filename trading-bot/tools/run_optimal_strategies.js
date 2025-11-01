"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// ============================================================================
//  run_optimal_strategies.ts - Uruchamianie optymalnych strategii
//  Ten skrypt uruchamia wszystkie strategie z optymalnymi parametrami
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
const rsi_1 = require("../core/indicators/rsi");
const csv_loader_1 = require("../infrastructure/data/csv_loader");
const ema_1 = require("../core/indicators/ema");
const supertrend_1 = require("../core/indicators/supertrend");
const adx_1 = require("../core/indicators/adx");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ============================================================================
// Strategie
// ============================================================================
// RSI Turbo
function runRSITurboStrategy(candles, params) {
    const { rsiPeriod, oversold, overbought, adxThreshold } = params;
    // Obliczamy wskaźniki
    const rsiValues = [];
    const adxValues = [];
    const ema200Values = [];
    const signals = [];
    const trades = [];
    // Przygotuj dane wskaźników
    for (let i = 0; i < candles.length; i++) {
        const buffer = candles.slice(Math.max(0, i - 49), i + 1);
        const rsi = (0, rsi_1.calcRSI)(buffer, rsiPeriod) ?? 50;
        rsiValues.push(rsi);
        if (i >= 200) {
            const ema200Buffer = candles.slice(i - 199, i + 1);
            ema200Values.push((0, ema_1.calcEMA)(ema200Buffer, 200) ?? candles[i].close);
        }
        else {
            ema200Values.push(candles[i].close); // Placeholder gdy nie ma wystarczająco danych
        }
    }
    // Oblicz ADX dla całego zestawu danych
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);
    const adxResult = (0, adx_1.calculateADX)(highs, lows, closes);
    // Strategia
    let inPosition = false;
    let positionType = null;
    let entryPrice = 0;
    let entryTime = 0;
    for (let i = Math.max(rsiPeriod, 14, 200); i < candles.length; i++) {
        const rsi = rsiValues[i];
        const adx = adxResult[i] || 0;
        const ema200 = ema200Values[i];
        const price = candles[i].close;
        const time = candles[i].time;
        if (!inPosition) {
            // Logika wejścia
            if (rsi <= oversold && adx >= adxThreshold && price > ema200) {
                // Sygnał long
                inPosition = true;
                positionType = 'long';
                entryPrice = price;
                entryTime = time;
                signals.push({ time, price, type: 'buy' });
            }
            else if (rsi >= overbought && adx >= adxThreshold && price < ema200) {
                // Sygnał short
                inPosition = true;
                positionType = 'short';
                entryPrice = price;
                entryTime = time;
                signals.push({ time, price, type: 'sell' });
            }
        }
        else {
            // Logika wyjścia
            if (positionType === 'long') {
                if (rsi >= overbought) {
                    // Zamykamy long
                    inPosition = false;
                    const pnl = price - entryPrice;
                    trades.push({
                        direction: positionType,
                        entryPrice,
                        exitPrice: price,
                        entryTime,
                        exitTime: time,
                        pnl
                    });
                    signals.push({ time, price, type: 'sell' });
                    positionType = null;
                }
            }
            else if (positionType === 'short') {
                if (rsi <= oversold) {
                    // Zamykamy short
                    inPosition = false;
                    const pnl = entryPrice - price;
                    trades.push({
                        direction: positionType,
                        entryPrice,
                        exitPrice: price,
                        entryTime,
                        exitTime: time,
                        pnl
                    });
                    signals.push({ time, price, type: 'buy' });
                    positionType = null;
                }
            }
        }
    }
    // Obliczanie statystyk
    const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const winTrades = trades.filter(trade => trade.pnl > 0);
    const winRate = winTrades.length / (trades.length || 1);
    // Obliczenie Sharpe Ratio
    const returns = trades.map(t => t.pnl / (t.entryPrice || 1));
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / (returns.length || 1);
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (returns.length || 1));
    const sharpeRatio = meanReturn / (stdDev || 1);
    // Obliczenie maksymalnego drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnl = 0;
    for (const trade of trades) {
        runningPnl += trade.pnl;
        if (runningPnl > peak) {
            peak = runningPnl;
        }
        const drawdown = peak - runningPnl;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }
    // Obliczenie profit factor
    const wins = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const losses = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = losses > 0 ? wins / losses : wins > 0 ? Infinity : 0;
    return {
        strategy: 'RSITurbo',
        trades,
        signals,
        stats: {
            tradeCount: trades.length,
            winCount: winTrades.length,
            winRate,
            totalPnl,
            finalEquity: 10000 + totalPnl, // Zakładamy kapitał początkowy 10000
            sharpeRatio,
            maxDrawdown,
            profitFactor
        }
    };
}
// SuperTrend Strategy
function runSuperTrendStrategy(candles, params) {
    const { period, multiplier, useEma200Filter } = params;
    // Przygotuj dane
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);
    // Oblicz SuperTrend
    const supertrend = (0, supertrend_1.calculateSuperTrend)(highs, lows, closes, period, multiplier);
    // Oblicz EMA200 jeśli potrzebne
    const ema200Values = [];
    if (useEma200Filter) {
        for (let i = 0; i < candles.length; i++) {
            if (i >= 200) {
                const buffer = candles.slice(i - 199, i + 1);
                ema200Values.push((0, ema_1.calcEMA)(buffer, 200) ?? candles[i].close);
            }
            else {
                ema200Values.push(candles[i].close);
            }
        }
    }
    // Zmienne do śledzenia pozycji
    let inPosition = false;
    let positionType = null;
    let entryPrice = 0;
    let entryTime = 0;
    const signals = [];
    const trades = [];
    // Strategia
    for (let i = Math.max(period, useEma200Filter ? 200 : 0); i < candles.length; i++) {
        const price = candles[i].close;
        const time = candles[i].time;
        const stValue = supertrend[i];
        if (!stValue)
            continue;
        const isBullish = stValue.direction === 'buy';
        const isBearish = stValue.direction === 'sell';
        const passesEma200Filter = !useEma200Filter ||
            (isBullish && price > ema200Values[i]) ||
            (isBearish && price < ema200Values[i]);
        if (!inPosition) {
            // Logika wejścia
            if (isBullish && passesEma200Filter) {
                // Sygnał long
                inPosition = true;
                positionType = 'long';
                entryPrice = price;
                entryTime = time;
                signals.push({ time, price, type: 'buy' });
            }
            else if (isBearish && passesEma200Filter) {
                // Sygnał short
                inPosition = true;
                positionType = 'short';
                entryPrice = price;
                entryTime = time;
                signals.push({ time, price, type: 'sell' });
            }
        }
        else {
            // Logika wyjścia
            if (positionType === 'long' && isBearish) {
                // Zamykamy long
                inPosition = false;
                const pnl = price - entryPrice;
                trades.push({
                    direction: positionType,
                    entryPrice,
                    exitPrice: price,
                    entryTime,
                    exitTime: time,
                    pnl
                });
                signals.push({ time, price, type: 'sell' });
                positionType = null;
            }
            else if (positionType === 'short' && isBullish) {
                // Zamykamy short
                inPosition = false;
                const pnl = entryPrice - price;
                trades.push({
                    direction: positionType,
                    entryPrice,
                    exitPrice: price,
                    entryTime,
                    exitTime: time,
                    pnl
                });
                signals.push({ time, price, type: 'buy' });
                positionType = null;
            }
        }
    }
    // Obliczanie statystyk
    const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const winTrades = trades.filter(trade => trade.pnl > 0);
    const winRate = winTrades.length / (trades.length || 1);
    // Obliczenie Sharpe Ratio
    const returns = trades.map(t => t.pnl / (t.entryPrice || 1));
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / (returns.length || 1);
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (returns.length || 1));
    const sharpeRatio = meanReturn / (stdDev || 1);
    // Obliczenie maksymalnego drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnl = 0;
    for (const trade of trades) {
        runningPnl += trade.pnl;
        if (runningPnl > peak) {
            peak = runningPnl;
        }
        const drawdown = peak - runningPnl;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }
    // Obliczenie profit factor
    const wins = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const losses = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = losses > 0 ? wins / losses : wins > 0 ? Infinity : 0;
    return {
        strategy: 'SuperTrend',
        trades,
        signals,
        stats: {
            tradeCount: trades.length,
            winCount: winTrades.length,
            winRate,
            totalPnl,
            finalEquity: 10000 + totalPnl, // Zakładamy kapitał początkowy 10000
            sharpeRatio,
            maxDrawdown,
            profitFactor
        }
    };
}
// MA Crossover Strategy
function runMACrossoverStrategy(candles, params) {
    const { fastPeriod, slowPeriod, useEma200Filter } = params;
    // Przygotuj dane wskaźników
    const fastValues = [];
    const slowValues = [];
    const ema200Values = [];
    for (let i = 0; i < candles.length; i++) {
        // Oblicz MA dla fast i slow
        if (i >= fastPeriod - 1) {
            const buffer = candles.slice(i - fastPeriod + 1, i + 1);
            fastValues.push((0, ema_1.calcEMA)(buffer, fastPeriod) ?? candles[i].close);
        }
        else {
            fastValues.push(candles[i].close);
        }
        if (i >= slowPeriod - 1) {
            const buffer = candles.slice(i - slowPeriod + 1, i + 1);
            slowValues.push((0, ema_1.calcEMA)(buffer, slowPeriod) ?? candles[i].close);
        }
        else {
            slowValues.push(candles[i].close);
        }
        // Oblicz EMA200 jeśli potrzebne
        if (useEma200Filter) {
            if (i >= 200) {
                const buffer = candles.slice(i - 199, i + 1);
                ema200Values.push((0, ema_1.calcEMA)(buffer, 200) ?? candles[i].close);
            }
            else {
                ema200Values.push(candles[i].close);
            }
        }
    }
    // Zmienne do śledzenia pozycji
    let inPosition = false;
    let positionType = null;
    let entryPrice = 0;
    let entryTime = 0;
    const signals = [];
    const trades = [];
    // Strategia
    for (let i = Math.max(fastPeriod, slowPeriod, useEma200Filter ? 200 : 0); i < candles.length; i++) {
        const price = candles[i].close;
        const time = candles[i].time;
        const fastValue = fastValues[i];
        const slowValue = slowValues[i];
        const crossoverUp = fastValues[i] > slowValues[i] && fastValues[i - 1] <= slowValues[i - 1];
        const crossoverDown = fastValues[i] < slowValues[i] && fastValues[i - 1] >= slowValues[i - 1];
        const passesEma200Filter = !useEma200Filter ||
            (crossoverUp && price > ema200Values[i]) ||
            (crossoverDown && price < ema200Values[i]);
        if (!inPosition) {
            // Logika wejścia
            if (crossoverUp && passesEma200Filter) {
                // Sygnał long
                inPosition = true;
                positionType = 'long';
                entryPrice = price;
                entryTime = time;
                signals.push({ time, price, type: 'buy' });
            }
            else if (crossoverDown && passesEma200Filter) {
                // Sygnał short
                inPosition = true;
                positionType = 'short';
                entryPrice = price;
                entryTime = time;
                signals.push({ time, price, type: 'sell' });
            }
        }
        else {
            // Logika wyjścia
            if (positionType === 'long' && crossoverDown) {
                // Zamykamy long
                inPosition = false;
                const pnl = price - entryPrice;
                trades.push({
                    direction: positionType,
                    entryPrice,
                    exitPrice: price,
                    entryTime,
                    exitTime: time,
                    pnl
                });
                signals.push({ time, price, type: 'sell' });
                positionType = null;
            }
            else if (positionType === 'short' && crossoverUp) {
                // Zamykamy short
                inPosition = false;
                const pnl = entryPrice - price;
                trades.push({
                    direction: positionType,
                    entryPrice,
                    exitPrice: price,
                    entryTime,
                    exitTime: time,
                    pnl
                });
                signals.push({ time, price, type: 'buy' });
                positionType = null;
            }
        }
    }
    // Obliczanie statystyk
    const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const winTrades = trades.filter(trade => trade.pnl > 0);
    const winRate = winTrades.length / (trades.length || 1);
    // Obliczenie Sharpe Ratio
    const returns = trades.map(t => t.pnl / (t.entryPrice || 1));
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / (returns.length || 1);
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (returns.length || 1));
    const sharpeRatio = meanReturn / (stdDev || 1);
    // Obliczenie maksymalnego drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnl = 0;
    for (const trade of trades) {
        runningPnl += trade.pnl;
        if (runningPnl > peak) {
            peak = runningPnl;
        }
        const drawdown = peak - runningPnl;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }
    // Obliczenie profit factor
    const wins = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const losses = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = losses > 0 ? wins / losses : wins > 0 ? Infinity : 0;
    return {
        strategy: 'MACrossover',
        trades,
        signals,
        stats: {
            tradeCount: trades.length,
            winCount: winTrades.length,
            winRate,
            totalPnl,
            finalEquity: 10000 + totalPnl,
            sharpeRatio,
            maxDrawdown,
            profitFactor
        }
    };
}
// Funkcja do zapisu wyników
function saveResults(results, directory) {
    // Zapisz wyniki
    fs.writeFileSync(path.join(directory, `${results.strategy}_results.json`), JSON.stringify(results.stats, null, 2));
    // Zapisz trades
    fs.writeFileSync(path.join(directory, `${results.strategy}_trades.json`), JSON.stringify(results.trades, null, 2));
    // Zapisz sygnały
    fs.writeFileSync(path.join(directory, `${results.strategy}_signals.json`), JSON.stringify(results.signals, null, 2));
}
// Główna funkcja
async function main() {
    console.log('=== URUCHAMIAM WSZYSTKIE STRATEGIE Z OPTYMALNYMI PARAMETRAMI ===');
    // Ładowanie danych
    console.log('Ładowanie danych świecowych...');
    const candles = await (0, csv_loader_1.loadCandles)('BTC_data_clean.csv');
    console.log(`Załadowano ${candles.length} świec 15-minutowych.`);
    // Utworzenie katalogu na wyniki
    const timestamp = Date.now();
    const resultsDir = path.join(__dirname, '../results/optimal_strategies_' + timestamp);
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }
    // Parametry optymalne dla każdej strategii
    // 1. RSI Turbo
    const rsiParams = {
        rsiPeriod: 20,
        oversold: 30,
        overbought: 70,
        adxThreshold: 15
    };
    // 2. SuperTrend
    const superTrendParams = {
        period: 10,
        multiplier: 2.5,
        useEma200Filter: true
    };
    // 3. MA Crossover
    const maCrossoverParams = {
        fastPeriod: 9,
        slowPeriod: 21,
        useEma200Filter: true
    };
    try {
        // 1. Uruchom RSI Turbo
        console.log('\nUruchamiam strategię RSI Turbo z optymalnymi parametrami...');
        const rsiResults = runRSITurboStrategy(candles, rsiParams);
        saveResults(rsiResults, resultsDir);
        // 2. Uruchom SuperTrend
        console.log('\nUruchamiam strategię SuperTrend z optymalnymi parametrami...');
        const stResults = runSuperTrendStrategy(candles, superTrendParams);
        saveResults(stResults, resultsDir);
        // 3. Uruchom MA Crossover
        console.log('\nUruchamiam strategię MA Crossover z optymalnymi parametrami...');
        const maResults = runMACrossoverStrategy(candles, maCrossoverParams);
        saveResults(maResults, resultsDir);
        // Raport podsumowujący
        console.log('\n=== PODSUMOWANIE WYNIKÓW ===');
        console.log('| Strategia   | PnL       | Trades | WinRate | Sharpe  | Max DD  | Profit Factor |');
        console.log('|-------------|-----------|--------|---------|---------|---------|---------------|');
        const strategies = [rsiResults, stResults, maResults];
        for (const result of strategies) {
            console.log(`| ${result.strategy.padEnd(11)} | ${result.stats.totalPnl.toFixed(2).padStart(9)} | ${result.stats.tradeCount.toString().padStart(6)} | ${(result.stats.winRate * 100).toFixed(2).padStart(6)}% | ${result.stats.sharpeRatio.toFixed(4).padStart(7)} | ${result.stats.maxDrawdown.toFixed(2).padStart(7)} | ${result.stats.profitFactor.toFixed(2).padStart(13)} |`);
        }
        // Zapisz podsumowanie
        const summary = strategies.map(result => ({
            strategy: result.strategy,
            pnl: result.stats.totalPnl,
            trades: result.stats.tradeCount,
            winRate: result.stats.winRate,
            sharpe: result.stats.sharpeRatio,
            maxDrawdown: result.stats.maxDrawdown,
            profitFactor: result.stats.profitFactor
        }));
        fs.writeFileSync(path.join(resultsDir, 'strategy_summary.json'), JSON.stringify(summary, null, 2));
        // Generowanie raportu HTML
        const htmlReport = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Raport Backtestów Strategii</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #333; }
                table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                th { background-color: #f2f2f2; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .positive { color: green; }
                .negative { color: red; }
                .strategy-name { text-align: left; font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>Raport Backtestów Strategii</h1>
            <p>Data wygenerowania: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
            
            <h2>Podsumowanie Wyników</h2>
            <table>
                <tr>
                    <th>Strategia</th>
                    <th>PnL</th>
                    <th>Liczba Transakcji</th>
                    <th>Win Rate</th>
                    <th>Sharpe Ratio</th>
                    <th>Max Drawdown</th>
                    <th>Profit Factor</th>
                </tr>
                ${strategies.map(result => `
                <tr>
                    <td class="strategy-name">${result.strategy}</td>
                    <td class="${result.stats.totalPnl >= 0 ? 'positive' : 'negative'}">${result.stats.totalPnl.toFixed(2)}</td>
                    <td>${result.stats.tradeCount}</td>
                    <td>${(result.stats.winRate * 100).toFixed(2)}%</td>
                    <td>${result.stats.sharpeRatio.toFixed(4)}</td>
                    <td>${result.stats.maxDrawdown.toFixed(2)}</td>
                    <td>${result.stats.profitFactor.toFixed(2)}</td>
                </tr>
                `).join('')}
            </table>
            
            <h2>Parametry Strategii</h2>
            <h3>RSI Turbo</h3>
            <pre>${JSON.stringify(rsiParams, null, 2)}</pre>
            
            <h3>SuperTrend</h3>
            <pre>${JSON.stringify(superTrendParams, null, 2)}</pre>
            
            <h3>MA Crossover</h3>
            <pre>${JSON.stringify(maCrossoverParams, null, 2)}</pre>
        </body>
        </html>
        `;
        fs.writeFileSync(path.join(resultsDir, 'report.html'), htmlReport);
        console.log(`\nWyniki zapisane w katalogu: ${resultsDir}`);
        console.log(`Wygenerowano raport HTML: ${path.join(resultsDir, 'report.html')}`);
    }
    catch (error) {
        console.error('Wystąpił błąd:', error);
    }
}
// Uruchom główną funkcję
main().catch(console.error);

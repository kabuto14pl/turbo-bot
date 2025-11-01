"use strict";
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
// ============================================================================
//  optimal_rsi_test.ts - Test optymalnych parametrów RSI
//  Ten skrypt przeprowadza test dla optymalnych parametrów RSI znalezionych
//  podczas procesu optymalizacji
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
const adx_1 = require("../core/indicators/adx");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Funkcja generująca sygnały RSI z dodatkowym filtrem ADX
function generateRSISignals(candles, rsiPeriod, oversold, overbought, adxThreshold) {
    const signals = [];
    const trades = [];
    // Przygotowujemy dane
    const prices = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    // Liczymy wskaźniki
    const adxValues = (0, adx_1.calculateADX)(highs, lows, prices);
    // Pętla po świecach
    let currentPosition = null;
    let entryPrice = 0;
    let entryTime = 0;
    for (let i = rsiPeriod + 1; i < candles.length; i++) {
        // Pobieramy bufor dla RSI
        const priceBuffer = candles.slice(Math.max(0, i - rsiPeriod - 10), i + 1);
        const rsiValue = (0, rsi_1.calcRSI)(priceBuffer, rsiPeriod);
        const adxValue = adxValues[i] || 0;
        // Jeśli RSI lub ADX nie są dostępne, pomijamy
        if (rsiValue === null || isNaN(rsiValue) || adxValue === null || isNaN(adxValue)) {
            continue;
        }
        const candle = candles[i];
        const prevCandle = candles[i - 1];
        const price = candle.close;
        // 1. Sygnały kupna (RSI poniżej oversold + ADX powyżej progu)
        if (rsiValue <= oversold && adxValue >= adxThreshold) {
            if (currentPosition !== 'long') {
                // Jeśli mamy pozycję short, zamykamy ją
                if (currentPosition === 'short') {
                    const exitPrice = price;
                    const pnl = entryPrice - exitPrice; // dla short: entry - exit
                    trades.push({
                        direction: 'short',
                        entryPrice,
                        exitPrice,
                        entryTime,
                        exitTime: candle.time,
                        pnl
                    });
                }
                // Otwieramy pozycję long
                signals.push({
                    time: candle.time,
                    price,
                    type: 'buy'
                });
                currentPosition = 'long';
                entryPrice = price;
                entryTime = candle.time;
            }
        }
        // 2. Sygnały sprzedaży (RSI powyżej overbought + ADX powyżej progu)
        else if (rsiValue >= overbought && adxValue >= adxThreshold) {
            if (currentPosition !== 'short') {
                // Jeśli mamy pozycję long, zamykamy ją
                if (currentPosition === 'long') {
                    const exitPrice = price;
                    const pnl = exitPrice - entryPrice; // dla long: exit - entry
                    trades.push({
                        direction: 'long',
                        entryPrice,
                        exitPrice,
                        entryTime,
                        exitTime: candle.time,
                        pnl
                    });
                }
                // Otwieramy pozycję short
                signals.push({
                    time: candle.time,
                    price,
                    type: 'sell'
                });
                currentPosition = 'short';
                entryPrice = price;
                entryTime = candle.time;
            }
        }
    }
    // Zamykamy ostatnią pozycję (jeśli istnieje) po ostatniej świecy
    if (currentPosition && candles.length > 0) {
        const lastCandle = candles[candles.length - 1];
        const exitPrice = lastCandle.close;
        if (currentPosition === 'long') {
            const pnl = exitPrice - entryPrice;
            trades.push({
                direction: 'long',
                entryPrice,
                exitPrice,
                entryTime,
                exitTime: lastCandle.time,
                pnl
            });
        }
        else {
            const pnl = entryPrice - exitPrice;
            trades.push({
                direction: 'short',
                entryPrice,
                exitPrice,
                entryTime,
                exitTime: lastCandle.time,
                pnl
            });
        }
    }
    // Liczymy statystyki
    let totalPnl = 0;
    let winCount = 0;
    for (const trade of trades) {
        totalPnl += trade.pnl;
        if (trade.pnl > 0) {
            winCount++;
        }
    }
    const winRate = trades.length > 0 ? winCount / trades.length : 0;
    const finalEquity = 10000 + totalPnl; // Zakładamy kapitał początkowy 10000
    // Obliczamy Sharpe Ratio (w uproszczony sposób)
    const returns = trades.map(t => t.pnl);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDeviation = returns.length > 0 ?
        Math.sqrt(returns.map(r => Math.pow(r - avgReturn, 2)).reduce((a, b) => a + b, 0) / returns.length) : 1;
    const sharpeRatio = stdDeviation !== 0 ? avgReturn / stdDeviation : 0;
    return {
        signals,
        trades,
        stats: {
            tradeCount: trades.length,
            winCount,
            winRate,
            totalPnl,
            finalEquity,
            sharpeRatio
        }
    };
}
async function runOptimalRSITest() {
    console.log('Ładowanie danych świecowych...');
    const candles = await (0, csv_loader_1.loadCandles)('./data/BTCUSDT/15m.csv');
    console.log(`Załadowano ${candles.length} świec 15-minutowych.`);
    // Ograniczamy dane do 10000 świec dla realistycznego testu
    const testCandles = candles.slice(0, 10000);
    // Tablica na wyniki
    const results = [];
    // Używamy optymalnych parametrów z poprzedniej optymalizacji
    const optimalParameters = [
        { rsiPeriod: 14, oversold: 20, overbought: 75, adxThreshold: 15 },
        { rsiPeriod: 20, oversold: 25, overbought: 70, adxThreshold: 15 },
        { rsiPeriod: 20, oversold: 30, overbought: 65, adxThreshold: 15 },
        { rsiPeriod: 20, oversold: 30, overbought: 70, adxThreshold: 15 },
        { rsiPeriod: 10, oversold: 20, overbought: 80, adxThreshold: 15 }
    ];
    console.log(`\n=== ROZPOCZYNAM TESTY RSI Z OPTYMALNYMI PARAMETRAMI ===`);
    console.log(`Testuję ${optimalParameters.length} zestawów optymalnych parametrów.`);
    // Testujemy optymalne parametry
    for (const params of optimalParameters) {
        const { rsiPeriod, oversold, overbought, adxThreshold } = params;
        console.log(`Testuję: RSI(${rsiPeriod}) Oversold(${oversold}) Overbought(${overbought}) ADX(${adxThreshold})`);
        // Generujemy sygnały i obliczamy wyniki
        const result = generateRSISignals(testCandles, rsiPeriod, oversold, overbought, adxThreshold);
        // Dodajemy parametry do wyniku
        const fullResult = {
            params: { rsiPeriod, oversold, overbought, adxThreshold },
            ...result
        };
        results.push(fullResult);
        // Wyświetlamy podsumowanie tego testu
        console.log(`Wynik: PnL=${fullResult.stats.totalPnl.toFixed(2)}, Transakcje=${fullResult.stats.tradeCount}, WinRate=${(fullResult.stats.winRate * 100).toFixed(1)}%`);
    }
    // Sortujemy wyniki po PnL (od najlepszego)
    results.sort((a, b) => b.stats.totalPnl - a.stats.totalPnl);
    // Zapisujemy wyniki do pliku
    const outputDir = path.join('results', `rsi_optimal_test_${Date.now()}`);
    fs.mkdirSync(outputDir, { recursive: true });
    // Zapisujemy CSV z wynikami
    const csvHeader = 'rsiPeriod,oversold,overbought,adxThreshold,totalPnl,tradeCount,winRate,sharpeRatio\n';
    const csvRows = results.map(r => {
        const { rsiPeriod, oversold, overbought, adxThreshold } = r.params;
        const s = r.stats;
        return `${rsiPeriod},${oversold},${overbought},${adxThreshold},${s.totalPnl},${s.tradeCount},${s.winRate},${s.sharpeRatio}`;
    });
    fs.writeFileSync(path.join(outputDir, 'rsi_optimal_results.csv'), csvHeader + csvRows.join('\n'));
    // Wyświetlamy wszystkie konfiguracje od najlepszej
    console.log('\n=== RANKING OPTYMALNYCH KONFIGURACJI ===');
    for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const { rsiPeriod, oversold, overbought, adxThreshold } = r.params;
        const s = r.stats;
        console.log(`${i + 1}. RSI(${rsiPeriod}) Oversold(${oversold}) Overbought(${overbought}) ADX(${adxThreshold}) - PnL: ${s.totalPnl.toFixed(2)}, Trades: ${s.tradeCount}, WinRate: ${(s.winRate * 100).toFixed(1)}%, Sharpe: ${s.sharpeRatio.toFixed(4)}`);
    }
    // Zapisujemy pełne dane najlepszej konfiguracji
    const bestResult = results[0];
    fs.writeFileSync(path.join(outputDir, 'best_signals.json'), JSON.stringify(bestResult.signals, null, 2));
    fs.writeFileSync(path.join(outputDir, 'best_trades.json'), JSON.stringify(bestResult.trades, null, 2));
    console.log(`\n=== TEST ZAKOŃCZONY ===`);
    console.log(`Wyniki zapisane w katalogu: ${outputDir}`);
    return bestResult;
}
// Uruchom test
runOptimalRSITest().catch(console.error);

"use strict";
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
// ============================================================================
//  quick_test_rsi.ts - Prosty test pojedynczej strategii RSITurbo
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
const csv_loader_1 = require("../infrastructure/data/csv_loader");
const rsi_1 = require("../core/indicators/rsi");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Uproszczona funkcja sygnałów RSI
function generateRSISignals(candles, rsiPeriod = 14, oversold = 30, overbought = 70) {
    const signals = [];
    let position = null; // null = brak pozycji, 'long' = pozycja długa, 'short' = pozycja krótka
    let entryPrice = 0;
    let trades = [];
    let equity = 10000;
    let tradeSize = 1000;
    // Obliczamy RSI dla wszystkich świec
    const rsiValues = [];
    for (let i = 0; i < candles.length; i++) {
        const buffer = candles.slice(Math.max(0, i - 49), i + 1);
        const rsi = (0, rsi_1.calcRSI)(buffer, rsiPeriod) ?? 50; // Domyślna wartość, jeśli null
        rsiValues.push(rsi);
    }
    // Przeglądamy wszystkie świece i podejmujemy decyzje
    for (let i = rsiPeriod + 1; i < candles.length; i++) {
        const candle = candles[i];
        const rsi = rsiValues[i];
        // Generujemy sygnały
        if (position === null) {
            // Brak pozycji - szukamy wejść
            if (rsi < oversold) {
                // Sygnał kupna (RSI poniżej progu wyprzedania)
                position = 'long';
                entryPrice = candle.close;
                signals.push({
                    time: candle.time,
                    type: 'buy',
                    price: candle.close,
                    rsi
                });
            }
            else if (rsi > overbought) {
                // Sygnał sprzedaży (RSI powyżej progu wykupienia)
                position = 'short';
                entryPrice = candle.close;
                signals.push({
                    time: candle.time,
                    type: 'sell',
                    price: candle.close,
                    rsi
                });
            }
        }
        else if (position === 'long') {
            // Mamy pozycję długą - szukamy wyjścia
            if (rsi > overbought) {
                // Zamykamy pozycję długą
                const pnl = (candle.close - entryPrice) * tradeSize / entryPrice;
                equity += pnl;
                trades.push({
                    entry: entryPrice,
                    exit: candle.close,
                    pnl,
                    type: 'long',
                    entryTime: candle.time - (rsiPeriod + 1) * 15 * 60 * 1000,
                    exitTime: candle.time
                });
                // Sygnał zamknięcia
                signals.push({
                    time: candle.time,
                    type: 'close_long',
                    price: candle.close,
                    rsi,
                    pnl
                });
                position = null;
            }
        }
        else if (position === 'short') {
            // Mamy pozycję krótką - szukamy wyjścia
            if (rsi < oversold) {
                // Zamykamy pozycję krótką
                const pnl = (entryPrice - candle.close) * tradeSize / entryPrice;
                equity += pnl;
                trades.push({
                    entry: entryPrice,
                    exit: candle.close,
                    pnl,
                    type: 'short',
                    entryTime: candle.time - (rsiPeriod + 1) * 15 * 60 * 1000,
                    exitTime: candle.time
                });
                // Sygnał zamknięcia
                signals.push({
                    time: candle.time,
                    type: 'close_short',
                    price: candle.close,
                    rsi,
                    pnl
                });
                position = null;
            }
        }
    }
    // Statystyki
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const winRate = winningTrades.length / trades.length;
    return {
        signals,
        trades,
        stats: {
            initialEquity: 10000,
            finalEquity: equity,
            totalPnl,
            tradeCount: trades.length,
            winCount: winningTrades.length,
            loseCount: losingTrades.length,
            winRate
        }
    };
}
// Główna funkcja testu
async function runRSITest() {
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
        for (const overbought of overboughtLevels) {
            console.log(`Testuję: RSI(${rsiPeriod}) Oversold(${oversold}) Overbought(${overbought})`);
            // Generujemy sygnały i obliczamy wyniki
            const result = generateRSISignals(testCandles, rsiPeriod, oversold, overbought);
            // Dodajemy parametry do wyniku
            const fullResult = {
                params: { rsiPeriod, oversold, overbought },
                ...result
            };
            results.push(fullResult);
            // Wyświetlamy podsumowanie tego testu
            console.log(`Wynik: PnL=${fullResult.stats.totalPnl.toFixed(2)}, Transakcje=${fullResult.stats.tradeCount}, WinRate=${(fullResult.stats.winRate * 100).toFixed(1)}%`);
        }
    }
}
// Sortujemy wyniki po PnL (od najlepszego)
results.sort((a, b) => b.stats.totalPnl - a.stats.totalPnl);
// Zapisujemy wyniki do pliku
const outputDir = path.join('results', `rsi_test_${Date.now()}`);
fs.mkdirSync(outputDir, { recursive: true });
// Zapisujemy CSV z wynikami
const csvHeader = 'rsiPeriod,oversold,overbought,totalPnl,tradeCount,winRate\n';
const csvRows = results.map(r => {
    const { rsiPeriod, oversold, overbought } = r.params;
    const s = r.stats;
    return `${rsiPeriod},${oversold},${overbought},${s.totalPnl},${s.tradeCount},${s.winRate}`;
});
fs.writeFileSync(path.join(outputDir, 'rsi_results.csv'), csvHeader + csvRows.join('\n'));
// Wyświetlamy top 5 najlepszych konfiguracji
console.log('\n=== TOP 5 NAJLEPSZYCH KONFIGURACJI ===');
for (let i = 0; i < Math.min(5, results.length); i++) {
    const r = results[i];
    const { rsiPeriod, oversold, overbought } = r.params;
    const s = r.stats;
    console.log(`${i + 1}. RSI(${rsiPeriod}) Oversold(${oversold}) Overbought(${overbought}) - PnL: ${s.totalPnl.toFixed(2)}, Trades: ${s.tradeCount}, WinRate: ${(s.winRate * 100).toFixed(1)}%`);
}
// Zapisujemy pełne dane najlepszej konfiguracji
const bestResult = results[0];
fs.writeFileSync(path.join(outputDir, 'best_signals.json'), JSON.stringify(bestResult.signals, null, 2));
fs.writeFileSync(path.join(outputDir, 'best_trades.json'), JSON.stringify(bestResult.trades, null, 2));
console.log(`\n=== TEST ZAKOŃCZONY ===`);
console.log(`Wyniki zapisane w katalogu: ${outputDir}`);
return bestResult;
// Uruchamiamy test
runRSITest().catch(console.error);

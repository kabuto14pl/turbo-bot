import * as fs from 'fs';
import * as path from 'path';
import { calcRSI } from '../core/indicators/rsi';
import { loadCandles } from '../infrastructure/data/csv_loader';
import { calcEMA } from '../core/indicators/ema';
import { calculateSuperTrend } from '../core/indicators/supertrend';
import { calculateADX } from '../core/indicators/adx';

// Interfejsy
interface OHLCVWithTimestamp {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface Trade {
    direction: 'long' | 'short';
    entryPrice: number;
    exitPrice: number;
    entryTime: number;
    exitTime: number;
    pnl: number;
}

interface TestResult {
    trades: Trade[];
    signals: any[];
    stats: {
        tradeCount: number;
        winCount: number;
        winRate: number;
        totalPnl: number;
        finalEquity: number;
        sharpeRatio: number;
    };
}

// Funkcja RSI Turbo Strategy - oparta na zoptymalizowanych parametrach
function runRSITurboStrategy(
    candles: OHLCVWithTimestamp[],
    params: {
        rsiPeriod: number;
        oversold: number;
        overbought: number;
        adxThreshold: number;
    }
): TestResult {
    const { rsiPeriod, oversold, overbought, adxThreshold } = params;
    
    // Obliczamy wskaźniki
    const rsiValues: number[] = [];
    const adxValues: number[] = [];
    const ema200Values: number[] = [];
    const signals: any[] = [];
    const trades: Trade[] = [];
    
    // Przygotuj dane wskaźników
    for (let i = 0; i < candles.length; i++) {
        const buffer = candles.slice(Math.max(0, i - 49), i + 1);
        const rsi = calcRSI(buffer, rsiPeriod) ?? 50;
        rsiValues.push(rsi);
        
        if (i >= 200) {
            const ema200Buffer = candles.slice(i - 199, i + 1);
            ema200Values.push(calcEMA(ema200Buffer, 200) ?? candles[i].close);
        } else {
            ema200Values.push(candles[i].close); // Placeholder gdy nie ma wystarczająco danych
        }
    }
    
    // Oblicz ADX dla całego zestawu danych
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);
    const adxResult = calculateADX(highs, lows, closes);
    
    // Strategia
    let inPosition = false;
    let positionType: 'long' | 'short' | null = null;
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
            } else if (rsi >= overbought && adx >= adxThreshold && price < ema200) {
                // Sygnał short
                inPosition = true;
                positionType = 'short';
                entryPrice = price;
                entryTime = time;
                signals.push({ time, price, type: 'sell' });
            }
        } else {
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
            } else if (positionType === 'short') {
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
    const returns = trades.map(t => t.pnl / entryPrice);
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / (returns.length || 1);
    const stdDev = Math.sqrt(
        returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (returns.length || 1)
    );
    const sharpeRatio = meanReturn / (stdDev || 1);
    
    return {
        trades,
        signals,
        stats: {
            tradeCount: trades.length,
            winCount: winTrades.length,
            winRate,
            totalPnl,
            finalEquity: 10000 + totalPnl, // Zakładamy kapitał początkowy 10000
            sharpeRatio
        }
    };
}

// Funkcja SuperTrend Strategy - oparta na zoptymalizowanych parametrach
function runSuperTrendStrategy(
    candles: OHLCVWithTimestamp[],
    params: {
        period: number;
        multiplier: number;
        useEma200Filter: boolean;
    }
): TestResult {
    const { period, multiplier, useEma200Filter } = params;
    
    // Przygotuj dane
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);
    
    // Oblicz SuperTrend
    const supertrend = calculateSuperTrend(highs, lows, closes, period, multiplier);
    
    // Oblicz EMA200 jeśli potrzebne
    const ema200Values: number[] = [];
    if (useEma200Filter) {
        for (let i = 0; i < candles.length; i++) {
            if (i >= 200) {
                const buffer = candles.slice(i - 199, i + 1);
                ema200Values.push(calcEMA(buffer, 200) ?? candles[i].close);
            } else {
                ema200Values.push(candles[i].close);
            }
        }
    }
    
    // Zmienne do śledzenia pozycji
    let inPosition = false;
    let positionType: 'long' | 'short' | null = null;
    let entryPrice = 0;
    let entryTime = 0;
    
    const signals: any[] = [];
    const trades: Trade[] = [];
    
    // Strategia
    for (let i = Math.max(period, useEma200Filter ? 200 : 0); i < candles.length; i++) {
        const price = candles[i].close;
        const time = candles[i].time;
        const stValue = supertrend[i];
        
        if (!stValue) continue;
        
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
            } else if (isBearish && passesEma200Filter) {
                // Sygnał short
                inPosition = true;
                positionType = 'short';
                entryPrice = price;
                entryTime = time;
                signals.push({ time, price, type: 'sell' });
            }
        } else {
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
            } else if (positionType === 'short' && isBullish) {
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
    const returns = trades.map(t => t.pnl / entryPrice);
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / (returns.length || 1);
    const stdDev = Math.sqrt(
        returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (returns.length || 1)
    );
    const sharpeRatio = meanReturn / (stdDev || 1);
    
    return {
        trades,
        signals,
        stats: {
            tradeCount: trades.length,
            winCount: winTrades.length,
            winRate,
            totalPnl,
            finalEquity: 10000 + totalPnl, // Zakładamy kapitał początkowy 10000
            sharpeRatio
        }
    };
}

// Funkcja do zapisu wyników
function saveResults(results: TestResult, strategyName: string, params: any) {
    const timestamp = Date.now();
    const dir = path.join(__dirname, '../results/optimal_backtest_' + timestamp);
    
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    // Zapisz wyniki
    fs.writeFileSync(
        path.join(dir, `${strategyName}_results.json`),
        JSON.stringify(results, null, 2)
    );
    
    // Zapisz parametry
    fs.writeFileSync(
        path.join(dir, `${strategyName}_params.json`),
        JSON.stringify(params, null, 2)
    );
    
    // Zapisz trades
    fs.writeFileSync(
        path.join(dir, `${strategyName}_trades.json`),
        JSON.stringify(results.trades, null, 2)
    );
    
    // Zapisz sygnały
    fs.writeFileSync(
        path.join(dir, `${strategyName}_signals.json`),
        JSON.stringify(results.signals, null, 2)
    );
    
    console.log(`Wyniki zapisane w katalogu: ${dir}`);
    return dir;
}

// Główna funkcja
async function main() {
    console.log('=== URUCHAMIAM BACKTEST DLA OPTYMALNYCH PARAMETRÓW ===');
    
    // Ładowanie danych
    console.log('Ładowanie danych świecowych...');
    const candles = await loadCandles('BTC_data_15m.csv');
    console.log(`Załadowano ${candles.length} świec 15-minutowych.`);
    
    // Najlepsze parametry dla RSI Turbo z naszych testów
    const rsiParams = {
        rsiPeriod: 20,
        oversold: 30,
        overbought: 70,
        adxThreshold: 15
    };
    
    // Najlepsze parametry dla SuperTrend (z poprzednich testów)
    const superTrendParams = {
        period: 10,
        multiplier: 2.5,
        useEma200Filter: true
    };
    
    try {
        // Uruchom backtest dla RSI Turbo
        console.log('Uruchamiam RSI Turbo z optymalnymi parametrami...');
        const rsiResults = runRSITurboStrategy(candles, rsiParams);
        const rsiDir = saveResults(rsiResults, 'RSITurbo', rsiParams);
        
        // Wypisz statystyki RSI
        console.log('\n=== WYNIKI RSI TURBO ===');
        console.log(`Total PnL: ${rsiResults.stats.totalPnl.toFixed(2)} USD`);
        console.log(`Liczba transakcji: ${rsiResults.stats.tradeCount}`);
        console.log(`Win Rate: ${(rsiResults.stats.winRate * 100).toFixed(2)}%`);
        console.log(`Sharpe Ratio: ${rsiResults.stats.sharpeRatio.toFixed(4)}`);
        
        // Uruchom backtest dla SuperTrend
        console.log('\nUruchamiam SuperTrend z optymalnymi parametrami...');
        const stResults = runSuperTrendStrategy(candles, superTrendParams);
        const stDir = saveResults(stResults, 'SuperTrend', superTrendParams);
        
        // Wypisz statystyki SuperTrend
        console.log('\n=== WYNIKI SUPERTREND ===');
        console.log(`Total PnL: ${stResults.stats.totalPnl.toFixed(2)} USD`);
        console.log(`Liczba transakcji: ${stResults.stats.tradeCount}`);
        console.log(`Win Rate: ${(stResults.stats.winRate * 100).toFixed(2)}%`);
        console.log(`Sharpe Ratio: ${stResults.stats.sharpeRatio.toFixed(4)}`);
        
        console.log('\n=== PORÓWNANIE STRATEGII ===');
        console.log('| Strategia | PnL | Trades | WinRate | Sharpe |');
        console.log('|-----------|-----|--------|---------|--------|');
        console.log(`| RSI Turbo | ${rsiResults.stats.totalPnl.toFixed(2)} | ${rsiResults.stats.tradeCount} | ${(rsiResults.stats.winRate * 100).toFixed(2)}% | ${rsiResults.stats.sharpeRatio.toFixed(4)} |`);
        console.log(`| SuperTrend | ${stResults.stats.totalPnl.toFixed(2)} | ${stResults.stats.tradeCount} | ${(stResults.stats.winRate * 100).toFixed(2)}% | ${stResults.stats.sharpeRatio.toFixed(4)} |`);
        
    } catch (error) {
        console.error('Wystąpił błąd:', error);
    }
}

// Uruchom główną funkcję
main().catch(console.error);

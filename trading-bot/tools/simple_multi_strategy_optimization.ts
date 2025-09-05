// ============================================================================
//  simple_multi_strategy_optimization.ts - Prosta optymalizacja wielu strategii
//  Ten skrypt przeprowadza optymalizację dla każdej strategii osobno
// ============================================================================

import { calcRSI } from '../core/indicators/rsi';
import { loadCandles } from '../infrastructure/data/csv_loader';
import { calcEMA } from '../core/indicators/ema';
import { calculateSuperTrend } from '../core/indicators/supertrend';
import { calculateADX } from '../core/indicators/adx';
import { calculateROC } from '../core/indicators/roc';
import { calculateMACD } from '../core/indicators/macd';
import * as fs from 'fs';
import * as path from 'path';

// Prosty model ceny
interface OHLCVWithTimestamp {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// ============================================================================
// Interfejsy dla typów
// ============================================================================

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
    stats: {
        tradeCount: number;
        winCount: number;
        winRate: number;
        totalPnl: number;
        finalEquity: number;
        sharpeRatio: number;
    };
}

interface OptimizationResult {
    params: any;
    stats: {
        tradeCount: number;
        winCount: number;
        winRate: number;
        totalPnl: number;
        finalEquity: number;
        sharpeRatio: number;
    };
}

// ============================================================================
// Strategie
// ============================================================================

// ============================================================================
// Strategie
// ============================================================================

// RSI Turbo
function testRSITurboStrategy(
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
        
        // Uproszczone ADX dla testów
        if (i > 14) {
            const adxBuffer = candles.slice(i - 14, i + 1);
            const adxValue = calculateADX(
                adxBuffer.map(c => c.high),
                adxBuffer.map(c => c.low),
                adxBuffer.map(c => c.close)
            )[adxBuffer.length - 1] ?? 20;
            adxValues.push(adxValue);
        } else {
            adxValues.push(20); // Wartość domyślna gdy nie ma wystarczająco danych
        }
    }
    
    // Testowanie strategii
    let position: null | 'long' | 'short' = null;
    let entryPrice = 0;
    let trades: any[] = [];
    let equity = 10000;
    let tradeSize = 1000;
    
    for (let i = Math.max(rsiPeriod, 200) + 1; i < candles.length; i++) {
        const candle = candles[i];
        const rsi = rsiValues[i];
        const adx = adxValues[i];
        const ema200 = ema200Values[i];
        
        // Logika strategii RSI Turbo
        if (position === null) {
            // Warunki wejścia LONG
            if (rsi < oversold && adx > adxThreshold && candle.close > ema200) {
                position = 'long';
                entryPrice = candle.close;
                trades.push({
                    type: 'entry',
                    direction: 'long',
                    price: candle.close,
                    time: candle.time,
                    equity
                });
            }
            // Warunki wejścia SHORT
            else if (rsi > overbought && adx > adxThreshold && candle.close < ema200) {
                position = 'short';
                entryPrice = candle.close;
                trades.push({
                    type: 'entry',
                    direction: 'short',
                    price: candle.close,
                    time: candle.time,
                    equity
                });
            }
        } 
        // Warunki wyjścia LONG
        else if (position === 'long') {
            if (rsi > overbought) {
                const pnl = (candle.close - entryPrice) * tradeSize / entryPrice;
                equity += pnl;
                trades.push({
                    type: 'exit',
                    direction: 'long',
                    price: candle.close,
                    time: candle.time,
                    pnl,
                    equity
                });
                position = null;
            }
        }
        // Warunki wyjścia SHORT
        else if (position === 'short') {
            if (rsi < oversold) {
                const pnl = (entryPrice - candle.close) * tradeSize / entryPrice;
                equity += pnl;
                trades.push({
                    type: 'exit',
                    direction: 'short',
                    price: candle.close,
                    time: candle.time,
                    pnl,
                    equity
                });
                position = null;
            }
        }
    }
    
    // Obliczanie statystyk
    const closedTrades: Trade[] = [];
    for (let i = 0; i < trades.length; i += 2) {
        if (i + 1 < trades.length) {
            const entry = trades[i];
            const exit = trades[i + 1];
            closedTrades.push({
                direction: entry.direction,
                entryPrice: entry.price,
                exitPrice: exit.price,
                entryTime: entry.time,
                exitTime: exit.time,
                pnl: exit.pnl
            });
        }
    }
    
    const winningTrades = closedTrades.filter(t => t.pnl > 0);
    const totalPnl = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
    const winRate = winningTrades.length / closedTrades.length || 0;
    
    // Obliczanie dodatkowych metryk
    const returns = closedTrades.map(t => t.pnl / tradeSize);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length || 0;
    const stdDevReturn = Math.sqrt(
        returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length || 1
    );
    const sharpeRatio = avgReturn / stdDevReturn * Math.sqrt(252); // Annualized
    
    return {
        trades: closedTrades,
        stats: {
            tradeCount: closedTrades.length,
            winCount: winningTrades.length,
            winRate,
            totalPnl,
            finalEquity: equity,
            sharpeRatio: sharpeRatio || 0
        }
    };
}

// SuperTrend Strategy
function testSuperTrendStrategy(
    candles: OHLCVWithTimestamp[],
    params: {
        period: number;
        multiplier: number;
        useEma200Filter: boolean;
    }
): TestResult {
    const { period, multiplier, useEma200Filter } = params;
    
    // Obliczamy wskaźniki
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);
    
    // Kalkulacja SuperTrend - obsługa w zależności od API
    const stResult = calculateSuperTrend(highs, lows, closes, period, multiplier);
    
    // Konwersja wyniku na bardziej przydatny format
    const supertrend: number[] = [];
    const direction: number[] = [];
    
    // Upraszczamy obsługę API (niezależnie czy zwraca tablicę obiektów czy pojedynczy obiekt)
    if (Array.isArray(stResult)) {
        for (let i = 0; i < stResult.length; i++) {
            // Sprawdzamy różne możliwe formaty wyniku
            if (typeof stResult[i] === 'object') {
                // Format obiektu z właściwościami
                const st = stResult[i] as any;
                supertrend.push(st.value || st.supertrend || 0);
                direction.push(typeof st.direction === 'string' ? 
                    (st.direction === 'up' || st.direction === 'buy' ? 1 : -1) : 
                    (st.direction || 0));
            } else {
                // Format liczby (wartość SuperTrend)
                supertrend.push(stResult[i] as any || 0);
                // W tym przypadku musimy określić kierunek na podstawie ceny i wartości SuperTrend
                direction.push(closes[i] > (stResult[i] as any) ? 1 : -1);
            }
        }
    } else {
        // Zakładamy, że mamy pojedynczy obiekt z dwoma tablicami
        const st = stResult as any;
        for (let i = 0; i < closes.length; i++) {
            supertrend.push(st.supertrend?.[i] || st.values?.[i] || 0);
            if (st.direction && Array.isArray(st.direction)) {
                direction.push(typeof st.direction[i] === 'string' ? 
                    (st.direction[i] === 'up' || st.direction[i] === 'buy' ? 1 : -1) : 
                    (st.direction[i] || 0));
            } else {
                direction.push(closes[i] > supertrend[i] ? 1 : -1);
            }
        }
    }
    
    const ema200Values: number[] = [];
    for (let i = 0; i < candles.length; i++) {
        if (i >= 200) {
            const ema200Buffer = candles.slice(i - 199, i + 1);
            ema200Values.push(calcEMA(ema200Buffer, 200) ?? candles[i].close);
        } else {
            ema200Values.push(candles[i].close); // Placeholder gdy nie ma wystarczająco danych
        }
    }
    
    // Testowanie strategii
    let position: null | 'long' | 'short' = null;
    let entryPrice = 0;
    let trades: any[] = [];
    let equity = 10000;
    let tradeSize = 1000;
    
    for (let i = Math.max(period, 200) + 1; i < candles.length; i++) {
        const candle = candles[i];
        const st = supertrend[i];
        const prevSt = supertrend[i-1];
        const dir = direction[i];
        const prevDir = direction[i-1];
        const ema200 = ema200Values[i];
        
        // Zmiana trendu - potencjalny sygnał
        const trendChanged = dir !== prevDir;
        
        // Logika strategii SuperTrend
        if (position === null) {
            // Warunki wejścia LONG
            if (dir === 1 && trendChanged) {
                // Filtr EMA200 jeśli włączony
                if (!useEma200Filter || candle.close > ema200) {
                    position = 'long';
                    entryPrice = candle.close;
                    trades.push({
                        type: 'entry',
                        direction: 'long',
                        price: candle.close,
                        time: candle.time,
                        equity
                    });
                }
            }
            // Warunki wejścia SHORT
            else if (dir === -1 && trendChanged) {
                // Filtr EMA200 jeśli włączony
                if (!useEma200Filter || candle.close < ema200) {
                    position = 'short';
                    entryPrice = candle.close;
                    trades.push({
                        type: 'entry',
                        direction: 'short',
                        price: candle.close,
                        time: candle.time,
                        equity
                    });
                }
            }
        } 
        // Warunki wyjścia LONG
        else if (position === 'long') {
            if (dir === -1 && trendChanged) {
                const pnl = (candle.close - entryPrice) * tradeSize / entryPrice;
                equity += pnl;
                trades.push({
                    type: 'exit',
                    direction: 'long',
                    price: candle.close,
                    time: candle.time,
                    pnl,
                    equity
                });
                position = null;
            }
        }
        // Warunki wyjścia SHORT
        else if (position === 'short') {
            if (dir === 1 && trendChanged) {
                const pnl = (entryPrice - candle.close) * tradeSize / entryPrice;
                equity += pnl;
                trades.push({
                    type: 'exit',
                    direction: 'short',
                    price: candle.close,
                    time: candle.time,
                    pnl,
                    equity
                });
                position = null;
            }
        }
    }
    
    // Obliczanie statystyk
    const closedTrades: Trade[] = [];
    for (let i = 0; i < trades.length; i += 2) {
        if (i + 1 < trades.length) {
            const entry = trades[i];
            const exit = trades[i + 1];
            closedTrades.push({
                direction: entry.direction,
                entryPrice: entry.price,
                exitPrice: exit.price,
                entryTime: entry.time,
                exitTime: exit.time,
                pnl: exit.pnl
            });
        }
    }
    
    const winningTrades = closedTrades.filter(t => t.pnl > 0);
    const totalPnl = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
    const winRate = winningTrades.length / closedTrades.length || 0;
    
    // Obliczanie dodatkowych metryk
    const returns = closedTrades.map(t => t.pnl / tradeSize);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length || 0;
    const stdDevReturn = Math.sqrt(
        returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length || 1
    );
    const sharpeRatio = avgReturn / stdDevReturn * Math.sqrt(252); // Annualized
    
    return {
        trades: closedTrades,
        stats: {
            tradeCount: closedTrades.length,
            winCount: winningTrades.length,
            winRate,
            totalPnl,
            finalEquity: equity,
            sharpeRatio: sharpeRatio || 0
        }
    };
}

// Funkcja generująca wszystkie kombinacje parametrów
function generateCombinations<T extends Record<string, any[]>>(paramRanges: T): Array<{[K in keyof T]: T[K][number]}> {
    const keys = Object.keys(paramRanges) as Array<keyof T>;
    if (keys.length === 0) return [{}] as Array<{[K in keyof T]: T[K][number]}>;
    
    // Rekurencyjne generowanie wszystkich kombinacji
    const result: Array<{[K in keyof T]: T[K][number]}> = [];
    const generateHelper = (index: number, current: Partial<{[K in keyof T]: T[K][number]}>) => {
        if (index === keys.length) {
            result.push({...current} as {[K in keyof T]: T[K][number]});
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

// Funkcja do optymalizacji RSI Turbo
async function optimizeRSITurbo(candles: OHLCVWithTimestamp[]): Promise<OptimizationResult> {
    console.log("\n=== OPTYMALIZACJA STRATEGII RSI TURBO ===");
    
    // Zakresy parametrów
    const paramRanges = {
        rsiPeriod: [8, 10, 14, 20],
        oversold: [20, 25, 30, 35],
        overbought: [65, 70, 75, 80],
        adxThreshold: [15, 20, 25, 30]
    };
    
    // Generowanie kombinacji
    const combinations = generateCombinations(paramRanges);
    console.log(`Testuję ${combinations.length} kombinacji parametrów...`);
    
    // Testowanie każdej kombinacji
    const results: OptimizationResult[] = [];
    for (const params of combinations) {
        const result = testRSITurboStrategy(candles, params);
        
        results.push({
            params,
            stats: result.stats
        });
        
        // Log tylko co 10 kombinacji, aby nie zaśmiecać konsoli
        if (results.length % 10 === 0 || results.length === combinations.length) {
            console.log(`Postęp: ${results.length}/${combinations.length} kombinacji przetestowanych.`);
        }
    }
    
    // Sortowanie wyników po Sharpe Ratio
    results.sort((a, b) => b.stats.sharpeRatio - a.stats.sharpeRatio);
    
    // Folder na wyniki
    const outputDir = path.join('results', 'optimization', `RSITurbo_${Date.now()}`);
    fs.mkdirSync(outputDir, { recursive: true });
    
    // Zapisanie wyników do CSV
    const csvHeader = 'rsiPeriod,oversold,overbought,adxThreshold,tradeCount,winRate,totalPnl,sharpeRatio\n';
    const csvRows = results.map(r => {
        const p = r.params;
        const s = r.stats;
        return `${p.rsiPeriod},${p.oversold},${p.overbought},${p.adxThreshold},${s.tradeCount},${s.winRate},${s.totalPnl},${s.sharpeRatio}`;
    });
    fs.writeFileSync(path.join(outputDir, 'results.csv'), csvHeader + csvRows.join('\n'));
    
    // Wyświetlenie najlepszych 5 kombinacji
    console.log("\n=== NAJLEPSZE WYNIKI RSI TURBO ===");
    for (let i = 0; i < Math.min(5, results.length); i++) {
        const r = results[i];
        const p = r.params;
        const s = r.stats;
        console.log(`${i+1}. RSI(${p.rsiPeriod}) Oversold(${p.oversold}) Overbought(${p.overbought}) ADX(${p.adxThreshold}) - Sharpe: ${s.sharpeRatio.toFixed(4)}, PnL: ${s.totalPnl.toFixed(2)}, WinRate: ${(s.winRate * 100).toFixed(1)}%`);
    }
    
    // Zapisanie najlepszych parametrów
    if (results.length > 0) {
        fs.writeFileSync(
            path.join(outputDir, 'best_params.json'),
            JSON.stringify({
                strategy: "RSITurbo",
                params: results[0].params,
                stats: results[0].stats
            }, null, 2)
        );
    }
    
    console.log(`Wyniki zapisane w: ${outputDir}`);
    
    return results[0];
}

// Funkcja do optymalizacji SuperTrend
async function optimizeSuperTrend(candles: OHLCVWithTimestamp[]): Promise<OptimizationResult> {
    console.log("\n=== OPTYMALIZACJA STRATEGII SUPERTREND ===");
    
    // Zakresy parametrów
    const paramRanges = {
        period: [7, 10, 14, 21],
        multiplier: [1.5, 2.0, 2.5, 3.0, 3.5],
        useEma200Filter: [true, false]
    };
    
    // Generowanie kombinacji
    const combinations = generateCombinations(paramRanges);
    console.log(`Testuję ${combinations.length} kombinacji parametrów...`);
    
    // Testowanie każdej kombinacji
    const results: OptimizationResult[] = [];
    for (const params of combinations) {
        const result = testSuperTrendStrategy(candles, params);
        
        results.push({
            params,
            stats: result.stats
        });
        
        // Log tylko co 5 kombinacji, aby nie zaśmiecać konsoli
        if (results.length % 5 === 0 || results.length === combinations.length) {
            console.log(`Postęp: ${results.length}/${combinations.length} kombinacji przetestowanych.`);
        }
    }
    
    // Sortowanie wyników po Sharpe Ratio
    results.sort((a, b) => b.stats.sharpeRatio - a.stats.sharpeRatio);
    
    // Folder na wyniki
    const outputDir = path.join('results', 'optimization', `SuperTrend_${Date.now()}`);
    fs.mkdirSync(outputDir, { recursive: true });
    
    // Zapisanie wyników do CSV
    const csvHeader = 'period,multiplier,useEma200Filter,tradeCount,winRate,totalPnl,sharpeRatio\n';
    const csvRows = results.map(r => {
        const p = r.params;
        const s = r.stats;
        return `${p.period},${p.multiplier},${p.useEma200Filter},${s.tradeCount},${s.winRate},${s.totalPnl},${s.sharpeRatio}`;
    });
    fs.writeFileSync(path.join(outputDir, 'results.csv'), csvHeader + csvRows.join('\n'));
    
    // Wyświetlenie najlepszych 5 kombinacji
    console.log("\n=== NAJLEPSZE WYNIKI SUPERTREND ===");
    for (let i = 0; i < Math.min(5, results.length); i++) {
        const r = results[i];
        const p = r.params;
        const s = r.stats;
        console.log(`${i+1}. Period(${p.period}) Multiplier(${p.multiplier}) EMA200Filter(${p.useEma200Filter}) - Sharpe: ${s.sharpeRatio.toFixed(4)}, PnL: ${s.totalPnl.toFixed(2)}, WinRate: ${(s.winRate * 100).toFixed(1)}%`);
    }
    
    // Zapisanie najlepszych parametrów
    if (results.length > 0) {
        fs.writeFileSync(
            path.join(outputDir, 'best_params.json'),
            JSON.stringify({
                strategy: "SuperTrend",
                params: results[0].params,
                stats: results[0].stats
            }, null, 2)
        );
    }
    
    console.log(`Wyniki zapisane w: ${outputDir}`);
    
    return results[0];
}

// Główna funkcja do uruchomienia optymalizacji
async function runMultiStrategyOptimization() {
    console.log("=== ROZPOCZYNAM PEŁNĄ OPTYMALIZACJĘ WIELU STRATEGII ===");
    
    // Ładowanie danych
    console.log("Ładowanie danych świecowych...");
    let candles = await loadCandles('./data/BTCUSDT/15m.csv');
    console.log(`Załadowano ${candles.length} świec 15-minutowych.`);
    
    // Ograniczenie danych dla szybszych testów
    const testLimit = 10000; // Używamy więcej danych niż w podstawowych testach
    if (candles.length > testLimit) {
        console.log(`Ograniczam dane do ${testLimit} świec dla przyspieszenia testów.`);
        candles = candles.slice(0, testLimit);
    }
    
    // Folder na podsumowanie
    const summaryDir = path.join('results', 'optimization', `multi_strategy_summary_${Date.now()}`);
    fs.mkdirSync(summaryDir, { recursive: true });
    
    // Optymalizacja strategii
    console.log("\nUruchamiam optymalizację dla każdej strategii...");
    
    const rsiTurboResult = await optimizeRSITurbo(candles);
    const superTrendResult = await optimizeSuperTrend(candles);
    
    // Podsumowanie
    console.log("\n=== PODSUMOWANIE OPTYMALIZACJI ===");
    console.log("Najlepsze parametry RSI Turbo:");
    console.log(rsiTurboResult.params);
    console.log(`Sharpe: ${rsiTurboResult.stats.sharpeRatio.toFixed(4)}, PnL: ${rsiTurboResult.stats.totalPnl.toFixed(2)}`);
    
    console.log("\nNajlepsze parametry SuperTrend:");
    console.log(superTrendResult.params);
    console.log(`Sharpe: ${superTrendResult.stats.sharpeRatio.toFixed(4)}, PnL: ${superTrendResult.stats.totalPnl.toFixed(2)}`);
    
    // Zapisanie podsumowania
    fs.writeFileSync(
        path.join(summaryDir, 'optimization_summary.json'),
        JSON.stringify({
            rsiTurbo: {
                params: rsiTurboResult.params,
                stats: rsiTurboResult.stats
            },
            superTrend: {
                params: superTrendResult.params,
                stats: superTrendResult.stats
            }
        }, null, 2)
    );
    
    console.log(`\nPodsumowanie zapisane w: ${summaryDir}`);
    console.log("=== OPTYMALIZACJA ZAKOŃCZONA ===");
}

// Uruchomienie optymalizacji
runMultiStrategyOptimization().catch(console.error);

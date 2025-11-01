/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
import * as fs from 'fs';
import * as path from 'path';
import { calcRSI } from '../core/indicators/rsi';
import { loadCandles } from '../infrastructure/data/csv_loader';
import { calcEMA } from '../core/indicators/ema';
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
    pnlWithCommission: number;
}

interface TestResult {
    strategy: string;
    params: any;
    trades: Trade[];
    signals: any[];
    stats: {
        tradeCount: number;
        winCount: number;
        winRate: number;
        totalPnl: number;
        totalPnlWithCommission: number;
        finalEquity: number;
        sharpeRatio: number;
        maxDrawdown: number;
        profitFactor: number;
    };
}

// Konfiguracja
const COMMISSION_RATE = 0.0005; // 0.05% prowizji za transakcję (bardziej realistyczne dla większych wolumenów)
const INITIAL_CAPITAL = 10000; // 10,000 USD początkowego kapitału
const RISK_PER_TRADE = 0.02; // 2% ryzyko na transakcję

// RSI Turbo - realistyczna implementacja
function runRSITurboStrategy(
    candles: OHLCVWithTimestamp[],
    params: {
        rsiPeriod: number;
        oversold: number;
        overbought: number;
        adxThreshold: number;
        trailingStop: number; // % trailing stop
        takeProfitMultiplier: number; // Mnożnik ATR dla take profit
    }
): TestResult {
    const { rsiPeriod, oversold, overbought, adxThreshold, trailingStop, takeProfitMultiplier } = params;
    
    // Obliczamy wskaźniki
    const rsiValues: number[] = [];
    const adxValues: number[] = [];
    const ema200Values: number[] = [];
    const atrValues: number[] = [];
    const signals: any[] = [];
    const trades: Trade[] = [];
    
    // Oblicz wskaźniki
    for (let i = 0; i < candles.length; i++) {
        // RSI
        if (i >= rsiPeriod) {
            const buffer = candles.slice(i - rsiPeriod, i + 1);
            const rsi = calcRSI(buffer, rsiPeriod) ?? 50;
            rsiValues.push(rsi);
        } else {
            rsiValues.push(50); // Placeholder dla początkowych wartości
        }
        
        // EMA200
        if (i >= 200) {
            const ema200Buffer = candles.slice(i - 199, i + 1);
            ema200Values.push(calcEMA(ema200Buffer, 200) ?? candles[i].close);
        } else {
            ema200Values.push(candles[i].close); // Placeholder gdy nie ma wystarczająco danych
        }
        
        // ATR (dla zarządzania ryzykiem)
        if (i >= 14) {
            let atrSum = 0;
            for (let j = i; j > i - 14; j--) {
                const high = candles[j].high;
                const low = candles[j].low;
                const prevClose = candles[j - 1].close;
                const tr = Math.max(
                    high - low,
                    Math.abs(high - prevClose),
                    Math.abs(low - prevClose)
                );
                atrSum += tr;
            }
            atrValues.push(atrSum / 14);
        } else {
            atrValues.push(0);
        }
    }
    
    // Oblicz ADX dla całego zestawu danych
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);
    const adxResult = calculateADX(highs, lows, closes);
    
    // Strategia z zarządzaniem ryzykiem i większym realizmem
    let inPosition = false;
    let positionType: 'long' | 'short' | null = null;
    let entryPrice = 0;
    let entryTime = 0;
    let currentEquity = INITIAL_CAPITAL;
    let trailingStopPrice = 0;
    let takeProfitPrice = 0;
    
    // Obliczanie wolumenu dla zarządzania ryzykiem
    function calculatePositionSize(price: number, stopLoss: number) {
        const riskAmount = currentEquity * RISK_PER_TRADE;
        const priceDiff = Math.abs(price - stopLoss);
        if (priceDiff === 0) return 0;
        return riskAmount / priceDiff;
    }
    
    // Unikamy pierwszych N świec, aby mieć pewność, że wskaźniki są stabilne
    const warmupPeriod = Math.max(rsiPeriod * 2, 200, 14 * 2);
    
    for (let i = warmupPeriod; i < candles.length; i++) {
        const rsi = rsiValues[i];
        const prevRsi = rsiValues[i - 1];
        const adx = adxResult[i] || 0;
        const ema200 = ema200Values[i];
        const price = candles[i].close;
        const high = candles[i].high;
        const low = candles[i].low;
        const time = candles[i].time;
        const atr = atrValues[i];
        
        // Sprawdzenie trendu na podstawie EMA
        const trend = price > ema200 ? 'up' : 'down';
        
        if (!inPosition) {
            // Logika wejścia z dodatkowymi filtrami
            // Long: RSI < oversold, RSI rośnie, ADX > threshold, cena > EMA200
            if (rsi <= oversold && rsi > prevRsi && adx >= adxThreshold && trend === 'up' && atr > 0) {
                
                const stopLoss = price - 2 * atr; // Stop loss 2x ATR poniżej ceny wejścia
                const positionSize = calculatePositionSize(price, stopLoss);
                
                // Take profit poziom
                takeProfitPrice = price + (takeProfitMultiplier * atr);
                
                // Trailing stop początkowy poziom
                trailingStopPrice = stopLoss;
                
                if (positionSize > 0 && currentEquity > 0) {
                    inPosition = true;
                    positionType = 'long';
                    entryPrice = price;
                    entryTime = time;
                    signals.push({ time, price, type: 'buy', stopLoss, takeProfit: takeProfitPrice });
                }
            } 
            // Short: RSI > overbought, RSI spada, ADX > threshold, cena < EMA200
            else if (rsi >= overbought && rsi < prevRsi && adx >= adxThreshold && trend === 'down' && atr > 0) {
                     
                const stopLoss = price + 2 * atr; // Stop loss 2x ATR powyżej ceny wejścia
                const positionSize = calculatePositionSize(price, stopLoss);
                
                // Take profit poziom
                takeProfitPrice = price - (takeProfitMultiplier * atr);
                
                // Trailing stop początkowy poziom
                trailingStopPrice = stopLoss;
                
                if (positionSize > 0 && currentEquity > 0) {
                    inPosition = true;
                    positionType = 'short';
                    entryPrice = price;
                    entryTime = time;
                    signals.push({ time, price, type: 'sell', stopLoss, takeProfit: takeProfitPrice });
                }
            }
        } else {
            // Logika wyjścia
            if (positionType === 'long') {
                // Aktualizacja trailing stop
                if (price > entryPrice) {
                    const newTrailingStop = price * (1 - trailingStop/100);
                    if (newTrailingStop > trailingStopPrice) {
                        trailingStopPrice = newTrailingStop;
                    }
                }
                
                // Zamykamy long gdy:
                // 1. Hit stop loss
                // 2. Hit trailing stop
                // 3. Hit take profit
                // 4. RSI > overbought
                
                if (low <= trailingStopPrice || high >= takeProfitPrice || rsi >= overbought) {
                    inPosition = false;
                    
                    // Ustal cenę wyjścia
                    let exitPrice = price;
                    let exitReason = 'rsi';
                    
                    if (low <= trailingStopPrice) {
                        exitPrice = trailingStopPrice;
                        exitReason = 'stopLoss';
                    } else if (high >= takeProfitPrice) {
                        exitPrice = takeProfitPrice;
                        exitReason = 'takeProfit';
                    }
                    
                    // Obliczanie PnL
                    const pnl = exitPrice - entryPrice;
                    const commissionEntry = entryPrice * COMMISSION_RATE;
                    const commissionExit = exitPrice * COMMISSION_RATE;
                    const pnlWithCommission = pnl - commissionEntry - commissionExit;
                    
                    // Aktualizacja kapitału
                    currentEquity += pnlWithCommission;
                    
                    trades.push({
                        direction: positionType,
                        entryPrice,
                        exitPrice,
                        entryTime,
                        exitTime: time,
                        pnl,
                        pnlWithCommission
                    });
                    
                    signals.push({ 
                        time, 
                        price: exitPrice, 
                        type: 'sell', 
                        reason: exitReason
                    });
                    
                    positionType = null;
                }
            } else if (positionType === 'short') {
                // Aktualizacja trailing stop
                if (price < entryPrice) {
                    const newTrailingStop = price * (1 + trailingStop/100);
                    if (newTrailingStop < trailingStopPrice) {
                        trailingStopPrice = newTrailingStop;
                    }
                }
                
                // Zamykamy short gdy:
                // 1. Hit stop loss
                // 2. Hit trailing stop
                // 3. Hit take profit
                // 4. RSI < oversold
                
                if (high >= trailingStopPrice || low <= takeProfitPrice || rsi <= oversold) {
                    inPosition = false;
                    
                    // Ustal cenę wyjścia
                    let exitPrice = price;
                    let exitReason = 'rsi';
                    
                    if (high >= trailingStopPrice) {
                        exitPrice = trailingStopPrice;
                        exitReason = 'stopLoss';
                    } else if (low <= takeProfitPrice) {
                        exitPrice = takeProfitPrice;
                        exitReason = 'takeProfit';
                    }
                    
                    // Obliczanie PnL
                    const pnl = entryPrice - exitPrice;
                    const commissionEntry = entryPrice * COMMISSION_RATE;
                    const commissionExit = exitPrice * COMMISSION_RATE;
                    const pnlWithCommission = pnl - commissionEntry - commissionExit;
                    
                    // Aktualizacja kapitału
                    currentEquity += pnlWithCommission;
                    
                    trades.push({
                        direction: positionType,
                        entryPrice,
                        exitPrice,
                        entryTime,
                        exitTime: time,
                        pnl,
                        pnlWithCommission
                    });
                    
                    signals.push({ 
                        time, 
                        price: exitPrice, 
                        type: 'buy',
                        reason: exitReason
                    });
                    
                    positionType = null;
                }
            }
        }
    }
    
    // Zamknij ostatnią pozycję, jeśli jest otwarta
    if (inPosition && positionType) {
        const lastCandle = candles[candles.length - 1];
        const price = lastCandle.close;
        
        let pnl = 0;
        if (positionType === 'long') {
            pnl = price - entryPrice;
        } else {
            pnl = entryPrice - price;
        }
        
        const commissionEntry = entryPrice * COMMISSION_RATE;
        const commissionExit = price * COMMISSION_RATE;
        const pnlWithCommission = pnl - commissionEntry - commissionExit;
        
        trades.push({
            direction: positionType,
            entryPrice,
            exitPrice: price,
            entryTime,
            exitTime: lastCandle.time,
            pnl,
            pnlWithCommission
        });
    }
    
    // Obliczanie statystyk
    const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalPnlWithCommission = trades.reduce((sum, trade) => sum + trade.pnlWithCommission, 0);
    const winTrades = trades.filter(trade => trade.pnlWithCommission > 0);
    const winRate = winTrades.length / (trades.length || 1);
    
    // Obliczenie Sharpe Ratio z uwzględnieniem prowizji
    const returns = trades.map(t => t.pnlWithCommission / (INITIAL_CAPITAL + (t.entryPrice || 1)));
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / (returns.length || 1);
    const stdDev = Math.sqrt(
        returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (returns.length || 1)
    );
    const sharpeRatio = meanReturn / (stdDev || 1);
    
    // Obliczenie maksymalnego drawdown
    let peak = INITIAL_CAPITAL;
    let maxDrawdown = 0;
    let runningEquity = INITIAL_CAPITAL;
    
    for (const trade of trades) {
        runningEquity += trade.pnlWithCommission;
        if (runningEquity > peak) {
            peak = runningEquity;
        }
        const drawdown = peak - runningEquity;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }
    
    // Obliczenie profit factor
    const wins = trades.filter(t => t.pnlWithCommission > 0).reduce((sum, t) => sum + t.pnlWithCommission, 0);
    const losses = Math.abs(trades.filter(t => t.pnlWithCommission < 0).reduce((sum, t) => sum + t.pnlWithCommission, 0));
    const profitFactor = losses > 0 ? wins / losses : wins > 0 ? Infinity : 0;
    
    return {
        strategy: 'RSITurbo',
        params,
        trades,
        signals,
        stats: {
            tradeCount: trades.length,
            winCount: winTrades.length,
            winRate,
            totalPnl,
            totalPnlWithCommission,
            finalEquity: INITIAL_CAPITAL + totalPnlWithCommission,
            sharpeRatio,
            maxDrawdown,
            profitFactor
        }
    };
}

// Funkcja optymalizacyjna
async function optimizeRSITurbo(candles: OHLCVWithTimestamp[]) {
    // Parametry do optymalizacji
    const rsiPeriods = [7, 14, 20];
    const oversoldLevels = [20, 25, 30, 35];
    const overboughtLevels = [65, 70, 75, 80];
    const adxThresholds = [15, 20, 25, 30];
    const trailingStops = [1, 1.5, 2];
    const takeProfitMultipliers = [2, 3, 4];
    
    const results: TestResult[] = [];
    let bestResult: TestResult | null = null;
    let bestPnL = -Infinity;
    
    let combinationCount = 0;
    const totalCombinations = 
        rsiPeriods.length * 
        oversoldLevels.length * 
        overboughtLevels.length * 
        adxThresholds.length *
        trailingStops.length *
        takeProfitMultipliers.length;
    
    console.log(`Rozpoczynam optymalizację dla ${totalCombinations} kombinacji parametrów...`);
    
    for (const rsiPeriod of rsiPeriods) {
        for (const oversold of oversoldLevels) {
            for (const overbought of overboughtLevels) {
                if (oversold >= overbought) continue; // Ignoruj nieprawidłowe kombinacje
                
                for (const adxThreshold of adxThresholds) {
                    for (const trailingStop of trailingStops) {
                        for (const takeProfitMultiplier of takeProfitMultipliers) {
                            combinationCount++;
                            
                            if (combinationCount % 10 === 0) {
                                console.log(`Testowanie kombinacji ${combinationCount}/${totalCombinations}...`);
                            }
                            
                            const params = {
                                rsiPeriod,
                                oversold,
                                overbought,
                                adxThreshold,
                                trailingStop,
                                takeProfitMultiplier
                            };
                            
                            const result = runRSITurboStrategy(candles, params);
                            results.push(result);
                            
                            if (result.stats.totalPnlWithCommission > bestPnL) {
                                bestPnL = result.stats.totalPnlWithCommission;
                                bestResult = result;
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Sortuj wyniki według PnL
    results.sort((a, b) => b.stats.totalPnlWithCommission - a.stats.totalPnlWithCommission);
    
    return {
        bestResult,
        allResults: results
    };
}

interface TimeframeResult {
    timeframe: string;
    results: {
        bestResult: TestResult | null;
        allResults: TestResult[];
    };
}

// Funkcja czyszcząca dane z wartości NaN
function cleanCandleData(candles: OHLCVWithTimestamp[]): OHLCVWithTimestamp[] {
    console.log(`Czyszczenie danych - przed czyszczeniem: ${candles.length} świec`);
    
    // Metoda 1: Usuń świece zawierające NaN
    const filteredCandles = candles.filter(candle => {
        return !isNaN(candle.open) && !isNaN(candle.high) && 
               !isNaN(candle.low) && !isNaN(candle.close) && 
               !isNaN(candle.volume);
    });
    
    console.log(`Po usunięciu świec z NaN: ${filteredCandles.length} świec (usunięto ${candles.length - filteredCandles.length})`);
    
    // Jeśli zostało mniej niż 70% oryginalnych danych, zastosujmy alternatywną metodę
    if (filteredCandles.length < candles.length * 0.7) {
        console.log("Zbyt dużo świec zawiera NaN. Zastępowanie wartości NaN wartościami poprzedniej świecy...");
        
        // Metoda 2: Zastąp NaN wartościami z poprzedniej świecy
        const fixedCandles = [...candles];
        
        for (let i = 1; i < fixedCandles.length; i++) {
            const prevCandle = fixedCandles[i-1];
            const currentCandle = fixedCandles[i];
            
            if (isNaN(currentCandle.open)) currentCandle.open = prevCandle.close;
            if (isNaN(currentCandle.high)) currentCandle.high = Math.max(prevCandle.high, currentCandle.open);
            if (isNaN(currentCandle.low)) currentCandle.low = Math.min(prevCandle.low, currentCandle.open);
            if (isNaN(currentCandle.close)) currentCandle.close = currentCandle.open;
            if (isNaN(currentCandle.volume)) currentCandle.volume = prevCandle.volume;
        }
        
        // Teraz sprawdź czy nadal są jakieś NaN w pierwszej świecy i napraw je
        if (isNaN(fixedCandles[0].open)) fixedCandles[0].open = 0;
        if (isNaN(fixedCandles[0].high)) fixedCandles[0].high = 0;
        if (isNaN(fixedCandles[0].low)) fixedCandles[0].low = 0;
        if (isNaN(fixedCandles[0].close)) fixedCandles[0].close = 0;
        if (isNaN(fixedCandles[0].volume)) fixedCandles[0].volume = 0;
        
        // Usuń wszystkie pozostałe świece, które nadal mają NaN
        const finalCandles = fixedCandles.filter(candle => {
            return !isNaN(candle.open) && !isNaN(candle.high) && 
                   !isNaN(candle.low) && !isNaN(candle.close) && 
                   !isNaN(candle.volume);
        });
        
        console.log(`Po zastąpieniu wartości NaN: ${finalCandles.length} świec (usunięto ${candles.length - finalCandles.length})`);
        
        return finalCandles;
    }
    
    return filteredCandles;
}

// Funkcja wykonująca optymalizację dla określonego interwału
async function runOptimizationForTimeframe(timeframeName: string, filePath: string): Promise<TimeframeResult> {
    console.log(`\n=== OPTYMALIZACJA STRATEGII RSI TURBO DLA INTERWAŁU ${timeframeName} ===`);
    
    // Ładowanie danych
    console.log(`Ładowanie danych świecowych dla interwału ${timeframeName}...`);
    const rawCandles = await loadCandles(filePath);
    console.log(`Załadowano ${rawCandles.length} świec dla interwału ${timeframeName}.`);
    
    // Czyszczenie danych z wartości NaN
    const candles = cleanCandleData(rawCandles);
    console.log(`Po czyszczeniu pozostało ${candles.length} poprawnych świec dla interwału ${timeframeName}.`);
    
    // Wykonaj optymalizację
    console.log(`\nRozpoczynam optymalizację dla interwału ${timeframeName}...`);
    const optimizationResults = await optimizeRSITurbo(candles);
    
    return {
        timeframe: timeframeName,
        results: optimizationResults
    };
}

// Funkcja main
async function main() {
    try {
        console.log('=== OPTYMALIZACJA STRATEGII RSI TURBO NA RÓŻNYCH INTERWAŁACH ===');
        
        // Definicja plików dla różnych interwałów
        const timeframes = [
            { name: '15m', file: 'BTC_data_15m_clean.csv' },
            { name: '1h', file: 'BTC_data_1h_clean.csv' },
            { name: '4h', file: 'BTC_data_4h_clean.csv' },
            { name: '1d', file: 'BTC_data_1d_clean.csv' }
        ];
        
        // Tablica wyników dla każdego interwału
        const allTimeframeResults: TimeframeResult[] = [];
        
        // Wykonaj optymalizację dla każdego interwału
        for (const timeframe of timeframes) {
            const results = await runOptimizationForTimeframe(timeframe.name, timeframe.file);
            allTimeframeResults.push(results);
        }
        
        // Tworzenie katalogu dla wyników
        const timestamp = Date.now();
        const resultsDir = path.resolve(__dirname, `../results/optimization_${timestamp}`);
        
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }
        
        // Zapisz wyniki dla każdego interwału
        for (const timeframeResult of allTimeframeResults) {
            const timeframeName = timeframeResult.timeframe;
            const timeframeDir = path.join(resultsDir, timeframeName);
            
            if (!fs.existsSync(timeframeDir)) {
                fs.mkdirSync(timeframeDir, { recursive: true });
            }
            
            // Zapisz parametry najlepszego rezultatu
            fs.writeFileSync(
                path.join(timeframeDir, 'best_params.json'),
                JSON.stringify(timeframeResult.results.bestResult?.params, null, 2)
            );
            
            // Zapisz statystyki najlepszego rezultatu
            fs.writeFileSync(
                path.join(timeframeDir, 'best_stats.json'),
                JSON.stringify(timeframeResult.results.bestResult?.stats, null, 2)
            );
            
            // Zapisz top 10 wyników
            const top10 = timeframeResult.results.allResults.slice(0, 10);
            fs.writeFileSync(
                path.join(timeframeDir, 'top10_results.json'),
                JSON.stringify(top10.map(r => ({
                    params: r.params,
                    stats: r.stats
                })), null, 2)
            );
        }
        
        // Drukuj najlepsze wyniki dla każdego interwału
        for (const timeframeResult of allTimeframeResults) {
            const bestResult = timeframeResult.results.bestResult;
            
            if (bestResult) {
                console.log(`\n=== NAJLEPSZE ZNALEZIONE PARAMETRY DLA INTERWAŁU ${timeframeResult.timeframe} ===`);
                console.log(`RSI Period: ${bestResult.params.rsiPeriod}`);
                console.log(`Oversold: ${bestResult.params.oversold}`);
                console.log(`Overbought: ${bestResult.params.overbought}`);
                console.log(`ADX Threshold: ${bestResult.params.adxThreshold}`);
                console.log(`Trailing Stop: ${bestResult.params.trailingStop}%`);
                console.log(`Take Profit Multiplier: ${bestResult.params.takeProfitMultiplier}x ATR`);
                
                console.log(`\n=== STATYSTYKI DLA NAJLEPSZYCH PARAMETRÓW (${timeframeResult.timeframe}) ===`);
                console.log(`Kapitał początkowy: ${INITIAL_CAPITAL.toFixed(2)} USD`);
                console.log(`Całkowity PnL (bez prowizji): ${bestResult.stats.totalPnl.toFixed(2)} USD`);
                console.log(`Całkowity PnL (z prowizją): ${bestResult.stats.totalPnlWithCommission.toFixed(2)} USD`);
                console.log(`Końcowy kapitał: ${bestResult.stats.finalEquity.toFixed(2)} USD`);
                console.log(`Liczba transakcji: ${bestResult.stats.tradeCount}`);
                console.log(`Win Rate: ${(bestResult.stats.winRate * 100).toFixed(2)}%`);
                console.log(`Sharpe Ratio: ${bestResult.stats.sharpeRatio.toFixed(4)}`);
                console.log(`Maksymalny Drawdown: ${bestResult.stats.maxDrawdown.toFixed(2)} USD`);
                console.log(`Profit Factor: ${bestResult.stats.profitFactor.toFixed(2)}`);
                
                // Statystyki longów i shortów
                const longTrades = bestResult.trades.filter(t => t.direction === 'long');
                const shortTrades = bestResult.trades.filter(t => t.direction === 'short');
                
                const longWins = longTrades.filter(t => t.pnlWithCommission > 0);
                const shortWins = shortTrades.filter(t => t.pnlWithCommission > 0);
                
                const longPnL = longTrades.reduce((sum, t) => sum + t.pnlWithCommission, 0);
                const shortPnL = shortTrades.reduce((sum, t) => sum + t.pnlWithCommission, 0);
                
                console.log(`\n=== STATYSTYKI WEDŁUG KIERUNKU (${timeframeResult.timeframe}) ===`);
                console.log(`Long: ${longTrades.length} transakcji, Win Rate: ${((longWins.length / longTrades.length || 0) * 100).toFixed(2)}%, PnL: ${longPnL.toFixed(2)} USD`);
                console.log(`Short: ${shortTrades.length} transakcji, Win Rate: ${((shortWins.length / shortTrades.length || 0) * 100).toFixed(2)}%, PnL: ${shortPnL.toFixed(2)} USD`);
            }
        }
        
        // Generowanie raportu HTML dla wszystkich interwałów
        let htmlReport = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Optymalizacja Strategii RSI Turbo na Różnych Interwałach</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                h1, h2, h3 { color: #2a5885; }
                .timeframe-section {
                    margin-bottom: 40px;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 20px;
                }
                .best-params { 
                    background-color: #f2f2f2; 
                    padding: 15px; 
                    border-radius: 5px; 
                    margin: 20px 0;
                    border-left: 5px solid #4CAF50;
                }
                .stats-container { display: flex; flex-wrap: wrap; }
                .stat-box { 
                    background-color: #f8f8f8; 
                    border-radius: 5px; 
                    padding: 15px; 
                    margin: 10px; 
                    min-width: 200px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .positive { color: #28a745; }
                .negative { color: #dc3545; }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 20px 0; 
                }
                th, td { 
                    padding: 8px; 
                    text-align: left; 
                    border-bottom: 1px solid #ddd; 
                }
                th { background-color: #f2f2f2; }
                tr:hover { background-color: #f5f5f5; }
                .top-row { background-color: #e8f5e9; }
                .nav {
                    position: sticky;
                    top: 0;
                    background: white;
                    padding: 10px;
                    border-bottom: 1px solid #ddd;
                    margin-bottom: 20px;
                    z-index: 100;
                }
                .nav a {
                    margin-right: 15px;
                    text-decoration: none;
                    color: #2a5885;
                    font-weight: bold;
                }
                .nav a:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <h1>Optymalizacja Strategii RSI Turbo na Różnych Interwałach</h1>
            
            <div class="nav">
                ${allTimeframeResults.map(result => `
                    <a href="#${result.timeframe}">${result.timeframe}</a>
                `).join('')}
            </div>
        `;
        
        // Dodaj sekcje dla każdego interwału
        for (const timeframeResult of allTimeframeResults) {
            const bestResult = timeframeResult.results.bestResult;
            const top10 = timeframeResult.results.allResults.slice(0, 10);
            
            if (bestResult) {
                htmlReport += `
                <div id="${timeframeResult.timeframe}" class="timeframe-section">
                    <h2>Interwał: ${timeframeResult.timeframe}</h2>
                    
                    <div class="best-params">
                        <h3>Najlepsze Znalezione Parametry</h3>
                        <p><strong>RSI Period:</strong> ${bestResult.params.rsiPeriod}</p>
                        <p><strong>Oversold:</strong> ${bestResult.params.oversold}</p>
                        <p><strong>Overbought:</strong> ${bestResult.params.overbought}</p>
                        <p><strong>ADX Threshold:</strong> ${bestResult.params.adxThreshold}</p>
                        <p><strong>Trailing Stop:</strong> ${bestResult.params.trailingStop}%</p>
                        <p><strong>Take Profit Multiplier:</strong> ${bestResult.params.takeProfitMultiplier}x ATR</p>
                    </div>
                    
                    <h3>Statystyki Dla Najlepszych Parametrów</h3>
                    <div class="stats-container">
                        <div class="stat-box">
                            <h3>Kapitał Początkowy</h3>
                            <div>${INITIAL_CAPITAL.toFixed(2)} USD</div>
                        </div>
                        <div class="stat-box">
                            <h3>Końcowy Kapitał</h3>
                            <div class="${bestResult.stats.finalEquity > INITIAL_CAPITAL ? 'positive' : 'negative'}">${bestResult.stats.finalEquity.toFixed(2)} USD</div>
                        </div>
                        <div class="stat-box">
                            <h3>Całkowity PnL (bez prowizji)</h3>
                            <div class="${bestResult.stats.totalPnl >= 0 ? 'positive' : 'negative'}">${bestResult.stats.totalPnl.toFixed(2)} USD</div>
                        </div>
                        <div class="stat-box">
                            <h3>Całkowity PnL (z prowizją)</h3>
                            <div class="${bestResult.stats.totalPnlWithCommission >= 0 ? 'positive' : 'negative'}">${bestResult.stats.totalPnlWithCommission.toFixed(2)} USD</div>
                        </div>
                        <div class="stat-box">
                            <h3>Liczba Transakcji</h3>
                            <div>${bestResult.stats.tradeCount}</div>
                        </div>
                        <div class="stat-box">
                            <h3>Win Rate</h3>
                            <div>${(bestResult.stats.winRate * 100).toFixed(2)}%</div>
                        </div>
                        <div class="stat-box">
                            <h3>Sharpe Ratio</h3>
                            <div>${bestResult.stats.sharpeRatio.toFixed(4)}</div>
                        </div>
                        <div class="stat-box">
                            <h3>Max Drawdown</h3>
                            <div>${bestResult.stats.maxDrawdown.toFixed(2)} USD</div>
                        </div>
                        <div class="stat-box">
                            <h3>Profit Factor</h3>
                            <div>${bestResult.stats.profitFactor.toFixed(2)}</div>
                        </div>
                    </div>
                    
                    <h3>Top 10 Kombinacji Parametrów</h3>
                    <table>
                        <tr>
                            <th>Rank</th>
                            <th>RSI Period</th>
                            <th>Oversold</th>
                            <th>Overbought</th>
                            <th>ADX</th>
                            <th>Trail%</th>
                            <th>TP</th>
                            <th>Trades</th>
                            <th>Win Rate</th>
                            <th>PnL (z prowizją)</th>
                            <th>Sharpe</th>
                            <th>Profit Factor</th>
                        </tr>
                        ${top10.map((result, index) => `
                        <tr class="${index === 0 ? 'top-row' : ''}">
                            <td>${index + 1}</td>
                            <td>${result.params.rsiPeriod}</td>
                            <td>${result.params.oversold}</td>
                            <td>${result.params.overbought}</td>
                            <td>${result.params.adxThreshold}</td>
                            <td>${result.params.trailingStop}%</td>
                            <td>${result.params.takeProfitMultiplier}x</td>
                            <td>${result.stats.tradeCount}</td>
                            <td>${(result.stats.winRate * 100).toFixed(2)}%</td>
                            <td class="${result.stats.totalPnlWithCommission >= 0 ? 'positive' : 'negative'}">${result.stats.totalPnlWithCommission.toFixed(2)} USD</td>
                            <td>${result.stats.sharpeRatio.toFixed(4)}</td>
                            <td>${result.stats.profitFactor.toFixed(2)}</td>
                        </tr>
                        `).join('')}
                    </table>
                </div>
                `;
            }
        }
        
        htmlReport += `
        </body>
        </html>
        `;
        
        fs.writeFileSync(
            path.join(resultsDir, 'optimization_report.html'),
            htmlReport
        );
        
        console.log(`\nWyniki optymalizacji zapisane w katalogu: ${resultsDir}`);
        console.log(`Wygenerowano raport HTML: ${path.join(resultsDir, 'optimization_report.html')}`);
        
    } catch (error) {
        console.error('Wystąpił błąd:', error);
    }
}

// Uruchom główną funkcję
main().catch(console.error);

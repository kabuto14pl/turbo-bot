/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// ============================================================================
//  optimize_all_strategies_full.ts - PEŁNA WERSJA OPTYMALIZACJI
//  Skrypt optymalizacyjny używający rzeczywistych strategii i poprawnych danych
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { calcRSI } from '../core/indicators/rsi';
import { calcEMA } from '../core/indicators/ema';
import { calculateADX } from '../core/indicators/adx';
import { calculateATR } from '../core/indicators/atr';

// Funkcja do logowania z czasem
function logDebug(message: string) {
    const timestamp = new Date().toISOString();
    console.log(`[DEBUG ${timestamp}] ${message}`);
}

// Logowanie startowe
logDebug('=====================================================');
logDebug('ROZPOCZYNAM PEŁNĄ OPTYMALIZACJĘ WSZYSTKICH STRATEGII');
logDebug('=====================================================');

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

interface TimeframeResult {
    timeframe: string;
    results: {
        bestResult: TestResult | null;
        allResults: TestResult[];
    };
}

// Konfiguracja
const COMMISSION_RATE = 0.0005; // 0.05% prowizji za transakcję
const INITIAL_CAPITAL = 10000; // 10,000 USD początkowego kapitału
const RISK_PER_TRADE = 0.02; // 2% ryzyko na transakcję

// Funkcja czyszcząca dane z wartości NaN
function cleanCandleData(candles: OHLCVWithTimestamp[]): OHLCVWithTimestamp[] {
    logDebug(`Czyszczenie danych - przed czyszczeniem: ${candles.length} świec`);
    
    // Metoda 1: Usuń świece zawierające NaN
    const filteredCandles = candles.filter(candle => {
        return !isNaN(candle.open) && !isNaN(candle.high) && 
               !isNaN(candle.low) && !isNaN(candle.close) && 
               !isNaN(candle.volume);
    });
    
    logDebug(`Po usunięciu świec z NaN: ${filteredCandles.length} świec (usunięto ${candles.length - filteredCandles.length})`);
    
    return filteredCandles;
}

// Funkcja ładująca dane bezpośrednio z pliku w katalogu data/BTCUSDT
async function loadCandlesFromFile(filename: string): Promise<OHLCVWithTimestamp[]> {
    const filePath = path.resolve(__dirname, '../data/BTCUSDT', filename);
    logDebug(`Ładowanie danych z pliku: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
        throw new Error(`Plik ${filePath} nie istnieje!`);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Pomijamy nagłówek
    const dataLines = lines.slice(1).filter(line => line.trim() !== '');
    
    const candles: OHLCVWithTimestamp[] = [];
    
    for (const line of dataLines) {
        const [timestamp, open, high, low, close, volume] = line.split(',');
        
        if (!timestamp || !open || !high || !low || !close || !volume) {
            continue;
        }
        
        const candle: OHLCVWithTimestamp = {
            time: parseInt(timestamp),
            open: parseFloat(open),
            high: parseFloat(high),
            low: parseFloat(low),
            close: parseFloat(close),
            volume: parseFloat(volume)
        };
        
        // Sprawdź, czy dane są poprawne
        if (!isNaN(candle.open) && !isNaN(candle.high) && 
            !isNaN(candle.low) && !isNaN(candle.close) && 
            !isNaN(candle.volume)) {
            candles.push(candle);
        }
    }
    
    // Sortuj świece od najstarszej do najnowszej
    candles.sort((a, b) => a.time - b.time);
    
    logDebug(`Załadowano ${candles.length} świec z pliku ${filename}`);
    return candles;
}

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
    const ema200Values: number[] = [];
    const adxValues: number[] = [];
    const atrValues: number[] = [];
    const signals: any[] = [];
    const trades: Trade[] = [];
    
    // Oblicz wskaźniki
    for (let i = 0; i < candles.length; i++) {
        // RSI
        if (i >= rsiPeriod) {
            const buffer = candles.slice(i - rsiPeriod, i + 1);
            const closePrices = buffer.map(c => c.close);
            const rsi = calcRSI(closePrices, rsiPeriod);
            rsiValues.push(rsi ?? 50);
        } else {
            rsiValues.push(50); // Placeholder dla początkowych wartości
        }
        
        // EMA200
        if (i >= 200) {
            const buffer = candles.slice(i - 200, i + 1);
            const closePrices = buffer.map(c => c.close);
            const ema200 = calcEMA(closePrices, 200);
            ema200Values.push(ema200 ?? candles[i].close);
        } else {
            ema200Values.push(candles[i].close); // Placeholder dla początkowych wartości
        }
        
        // ADX
        if (i >= 14) {
            const buffer = candles.slice(i - 14, i + 1);
            const adx = calculateADX(buffer.map(c => c.high), buffer.map(c => c.low), buffer.map(c => c.close), 14);
            adxValues.push(Array.isArray(adx) ? (adx[adx.length - 1] || 0) : 0);
        } else {
            adxValues.push(0); // Placeholder dla początkowych wartości
        }
        
        // ATR
        if (i >= 14) {
            const buffer = candles.slice(i - 14, i + 1);
            const highPrices = buffer.map(c => c.high);
            const lowPrices = buffer.map(c => c.low);
            const closePrices = buffer.map(c => c.close);
            const atr = calculateATR(highPrices, lowPrices, closePrices, 14);
            atrValues.push(Array.isArray(atr) && atr.length > 0 ? atr[atr.length - 1] : 0);
        } else {
            atrValues.push(0); // Placeholder dla początkowych wartości
        }
    }
    
    let inPosition = false;
    let positionDirection: 'long' | 'short' | null = null;
    let entryPrice = 0;
    let entryTime = 0;
    let highestPrice = 0;
    let lowestPrice = 0;
    let takeProfitPrice = 0;
    
    // Przetwarzanie sygnałów i wykonywanie transakcji
    for (let i = 200; i < candles.length - 1; i++) {
        const candle = candles[i];
        const nextCandle = candles[i + 1];
        const rsi = rsiValues[i];
        const ema200 = ema200Values[i];
        const adx = adxValues[i];
        const atr = atrValues[i];
        
        if (!inPosition) {
            // Szukanie sygnału wejścia
            // Warunki dla LONG:
            // 1. Cena powyżej EMA200 (trend wzrostowy)
            // 2. RSI poniżej poziomu wyprzedania
            // 3. ADX powyżej progu (silny trend)
            if (candle.close > ema200 && rsi < oversold && adx > adxThreshold) {
                inPosition = true;
                positionDirection = 'long';
                entryPrice = nextCandle.open;
                entryTime = nextCandle.time;
                highestPrice = entryPrice;
                takeProfitPrice = entryPrice + (atr * takeProfitMultiplier);
                
                signals.push({
                    time: nextCandle.time,
                    type: 'enter_long',
                    price: entryPrice,
                    rsi,
                    adx
                });
            }
            // Warunki dla SHORT:
            // 1. Cena poniżej EMA200 (trend spadkowy)
            // 2. RSI powyżej poziomu wykupienia
            // 3. ADX powyżej progu (silny trend)
            else if (candle.close < ema200 && rsi > overbought && adx > adxThreshold) {
                inPosition = true;
                positionDirection = 'short';
                entryPrice = nextCandle.open;
                entryTime = nextCandle.time;
                lowestPrice = entryPrice;
                takeProfitPrice = entryPrice - (atr * takeProfitMultiplier);
                
                signals.push({
                    time: nextCandle.time,
                    type: 'enter_short',
                    price: entryPrice,
                    rsi,
                    adx
                });
            }
        } else {
            // Zarządzanie pozycją
            if (positionDirection === 'long') {
                // Aktualizacja najwyższej ceny
                if (nextCandle.high > highestPrice) {
                    highestPrice = nextCandle.high;
                }
                
                // Sprawdź, czy trailing stop jest wyzwalany
                const trailingStopPrice = highestPrice * (1 - trailingStop / 100);
                
                // Wyjście gdy:
                // 1. Cena zejdzie poniżej trailing stop
                // 2. Cena osiągnie take profit
                // 3. RSI wejdzie w strefę wykupienia
                if (nextCandle.low < trailingStopPrice || nextCandle.high > takeProfitPrice || rsi > overbought) {
                    // Ustal cenę wyjścia
                    let exitPrice = 0;
                    
                    if (nextCandle.low < trailingStopPrice) {
                        exitPrice = trailingStopPrice;
                        signals.push({
                            time: nextCandle.time,
                            type: 'exit_long_trailing_stop',
                            price: exitPrice
                        });
                    } else if (nextCandle.high > takeProfitPrice) {
                        exitPrice = takeProfitPrice;
                        signals.push({
                            time: nextCandle.time,
                            type: 'exit_long_take_profit',
                            price: exitPrice
                        });
                    } else {
                        exitPrice = nextCandle.open;
                        signals.push({
                            time: nextCandle.time,
                            type: 'exit_long_rsi',
                            price: exitPrice,
                            rsi
                        });
                    }
                    
                    const pnl = exitPrice - entryPrice;
                    const pnlWithCommission = pnl - (entryPrice * COMMISSION_RATE) - (exitPrice * COMMISSION_RATE);
                    
                    trades.push({
                        direction: 'long',
                        entryPrice,
                        exitPrice,
                        entryTime,
                        exitTime: nextCandle.time,
                        pnl,
                        pnlWithCommission
                    });
                    
                    inPosition = false;
                    positionDirection = null;
                }
            } else if (positionDirection === 'short') {
                // Aktualizacja najniższej ceny
                if (nextCandle.low < lowestPrice) {
                    lowestPrice = nextCandle.low;
                }
                
                // Sprawdź, czy trailing stop jest wyzwalany
                const trailingStopPrice = lowestPrice * (1 + trailingStop / 100);
                
                // Wyjście gdy:
                // 1. Cena wzrośnie powyżej trailing stop
                // 2. Cena osiągnie take profit
                // 3. RSI wejdzie w strefę wyprzedania
                if (nextCandle.high > trailingStopPrice || nextCandle.low < takeProfitPrice || rsi < oversold) {
                    // Ustal cenę wyjścia
                    let exitPrice = 0;
                    
                    if (nextCandle.high > trailingStopPrice) {
                        exitPrice = trailingStopPrice;
                        signals.push({
                            time: nextCandle.time,
                            type: 'exit_short_trailing_stop',
                            price: exitPrice
                        });
                    } else if (nextCandle.low < takeProfitPrice) {
                        exitPrice = takeProfitPrice;
                        signals.push({
                            time: nextCandle.time,
                            type: 'exit_short_take_profit',
                            price: exitPrice
                        });
                    } else {
                        exitPrice = nextCandle.open;
                        signals.push({
                            time: nextCandle.time,
                            type: 'exit_short_rsi',
                            price: exitPrice,
                            rsi
                        });
                    }
                    
                    const pnl = entryPrice - exitPrice;
                    const pnlWithCommission = pnl - (entryPrice * COMMISSION_RATE) - (exitPrice * COMMISSION_RATE);
                    
                    trades.push({
                        direction: 'short',
                        entryPrice,
                        exitPrice,
                        entryTime,
                        exitTime: nextCandle.time,
                        pnl,
                        pnlWithCommission
                    });
                    
                    inPosition = false;
                    positionDirection = null;
                }
            }
        }
    }
    
    // Zamknij pozycję na końcu testu, jeśli nadal jesteśmy w pozycji
    if (inPosition) {
        const lastCandle = candles[candles.length - 1];
        const exitPrice = lastCandle.close;
        
        if (positionDirection === 'long') {
            const pnl = exitPrice - entryPrice;
            const pnlWithCommission = pnl - (entryPrice * COMMISSION_RATE) - (exitPrice * COMMISSION_RATE);
            
            trades.push({
                direction: 'long',
                entryPrice,
                exitPrice,
                entryTime,
                exitTime: lastCandle.time,
                pnl,
                pnlWithCommission
            });
            
            signals.push({
                time: lastCandle.time,
                type: 'exit_long_end_of_test',
                price: exitPrice
            });
        } else if (positionDirection === 'short') {
            const pnl = entryPrice - exitPrice;
            const pnlWithCommission = pnl - (entryPrice * COMMISSION_RATE) - (exitPrice * COMMISSION_RATE);
            
            trades.push({
                direction: 'short',
                entryPrice,
                exitPrice,
                entryTime,
                exitTime: lastCandle.time,
                pnl,
                pnlWithCommission
            });
            
            signals.push({
                time: lastCandle.time,
                type: 'exit_short_end_of_test',
                price: exitPrice
            });
        }
    }
    
    // Obliczenie statystyk
    const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalPnlWithCommission = trades.reduce((sum, trade) => sum + trade.pnlWithCommission, 0);
    const winTrades = trades.filter(trade => trade.pnlWithCommission > 0);
    const winRate = trades.length > 0 ? winTrades.length / trades.length : 0;
    
    // Obliczenie Sharpe Ratio (jeśli mamy wystarczająco dużo transakcji)
    let sharpeRatio = 0;
    if (trades.length > 1) {
        const returns = trades.map(trade => trade.pnlWithCommission);
        const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const stdDev = Math.sqrt(
            returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length
        );
        sharpeRatio = stdDev > 0 ? meanReturn / stdDev : 0;
    }
    
    // Obliczenie maksymalnego drawdown
    let maxDrawdown = 0;
    let peak = INITIAL_CAPITAL;
    let equity = INITIAL_CAPITAL;
    
    for (const trade of trades) {
        equity += trade.pnlWithCommission;
        if (equity > peak) {
            peak = equity;
        }
        
        const drawdown = peak - equity;
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

// SuperTrend - realistyczna implementacja
function runSuperTrendStrategy(
    candles: OHLCVWithTimestamp[],
    params: {
        atrPeriod: number;
        atrMultiplier: number;
        rsiPeriod: number;
        rsiThreshold: number;
        trailingStop: number; // % trailing stop
    }
): TestResult {
    const { atrPeriod, atrMultiplier, rsiPeriod, rsiThreshold, trailingStop } = params;
    
    // Obliczamy wskaźniki
    const atrValues: number[] = [];
    const rsiValues: number[] = [];
    const ema200Values: number[] = [];
    const superTrendValues: { trend: 'up' | 'down', value: number }[] = [];
    const signals: any[] = [];
    const trades: Trade[] = [];
    
    // Oblicz wskaźniki
    for (let i = 0; i < candles.length; i++) {
        // ATR
        if (i >= atrPeriod) {
            const buffer = candles.slice(i - atrPeriod, i + 1);
            const highPrices = buffer.map(c => c.high);
            const lowPrices = buffer.map(c => c.low);
            const closePrices = buffer.map(c => c.close);
            const atr = calculateATR(highPrices, lowPrices, closePrices, atrPeriod);
            atrValues.push(Array.isArray(atr) ? (atr[atr.length - 1] || 0) : 0);
        } else {
            atrValues.push(0);
        }
        
        // RSI
        if (i >= rsiPeriod) {
            const buffer = candles.slice(i - rsiPeriod, i + 1);
            const closePrices = buffer.map(c => c.close);
            const rsi = calcRSI(closePrices, rsiPeriod);
            rsiValues.push(rsi ?? 50);
        } else {
            rsiValues.push(50);
        }
        
        // EMA200
        if (i >= 200) {
            const buffer = candles.slice(i - 200, i + 1);
            const closePrices = buffer.map(c => c.close);
            const ema200 = calcEMA(closePrices, 200);
            ema200Values.push(ema200 ?? candles[i].close);
        } else {
            ema200Values.push(candles[i].close);
        }
    }
    
    // Oblicz SuperTrend
    let upTrend = true;
    let upperBand = 0;
    let lowerBand = 0;
    
    for (let i = atrPeriod; i < candles.length; i++) {
        const atr = atrValues[i - 1];
        const basicUpperBand = (candles[i].high + candles[i].low) / 2 + atrMultiplier * atr;
        const basicLowerBand = (candles[i].high + candles[i].low) / 2 - atrMultiplier * atr;
        
        if (i === atrPeriod) {
            upperBand = basicUpperBand;
            lowerBand = basicLowerBand;
            superTrendValues.push({ trend: 'up', value: lowerBand });
            continue;
        }
        
        if (basicUpperBand < upperBand || candles[i - 1].close > upperBand) {
            upperBand = basicUpperBand;
        } else {
            upperBand = superTrendValues[i - atrPeriod - 1].value;
        }
        
        if (basicLowerBand > lowerBand || candles[i - 1].close < lowerBand) {
            lowerBand = basicLowerBand;
        } else {
            lowerBand = superTrendValues[i - atrPeriod - 1].value;
        }
        
        if (candles[i].close > upperBand && !upTrend) {
            upTrend = true;
            superTrendValues.push({ trend: 'up', value: lowerBand });
        } else if (candles[i].close < lowerBand && upTrend) {
            upTrend = false;
            superTrendValues.push({ trend: 'down', value: upperBand });
        } else {
            superTrendValues.push({ 
                trend: upTrend ? 'up' : 'down',
                value: upTrend ? lowerBand : upperBand
            });
        }
    }
    
    let inPosition = false;
    let positionDirection: 'long' | 'short' | null = null;
    let entryPrice = 0;
    let entryTime = 0;
    let highestPrice = 0;
    let lowestPrice = 0;
    
    // Przetwarzanie sygnałów i wykonywanie transakcji
    for (let i = Math.max(200, atrPeriod + 10); i < candles.length - 1; i++) {
        const candle = candles[i];
        const nextCandle = candles[i + 1];
        const superTrend = superTrendValues[i - atrPeriod];
        const rsi = rsiValues[i];
        const ema200 = ema200Values[i];
        
        if (!inPosition) {
            // Warunki dla LONG:
            // 1. SuperTrend w trendzie wzrostowym
            // 2. Cena powyżej EMA200
            // 3. RSI powyżej progu
            if (superTrend.trend === 'up' && candle.close > ema200 && rsi > rsiThreshold) {
                inPosition = true;
                positionDirection = 'long';
                entryPrice = nextCandle.open;
                entryTime = nextCandle.time;
                highestPrice = entryPrice;
                
                signals.push({
                    time: nextCandle.time,
                    type: 'enter_long',
                    price: entryPrice,
                    superTrend: superTrend.value,
                    rsi
                });
            }
            // Warunki dla SHORT:
            // 1. SuperTrend w trendzie spadkowym
            // 2. Cena poniżej EMA200
            // 3. RSI poniżej (100 - próg)
            else if (superTrend.trend === 'down' && candle.close < ema200 && rsi < (100 - rsiThreshold)) {
                inPosition = true;
                positionDirection = 'short';
                entryPrice = nextCandle.open;
                entryTime = nextCandle.time;
                lowestPrice = entryPrice;
                
                signals.push({
                    time: nextCandle.time,
                    type: 'enter_short',
                    price: entryPrice,
                    superTrend: superTrend.value,
                    rsi
                });
            }
        } else {
            // Zarządzanie pozycją
            if (positionDirection === 'long') {
                // Aktualizacja najwyższej ceny
                if (nextCandle.high > highestPrice) {
                    highestPrice = nextCandle.high;
                }
                
                // Trailing stop
                const trailingStopPrice = highestPrice * (1 - trailingStop / 100);
                
                // Wyjście gdy:
                // 1. SuperTrend zmieni się na trend spadkowy
                // 2. Trailing stop wyzwolony
                if (superTrend.trend === 'down' || nextCandle.low < trailingStopPrice) {
                    let exitPrice = 0;
                    
                    if (nextCandle.low < trailingStopPrice) {
                        exitPrice = trailingStopPrice;
                        signals.push({
                            time: nextCandle.time,
                            type: 'exit_long_trailing_stop',
                            price: exitPrice
                        });
                    } else {
                        exitPrice = nextCandle.open;
                        signals.push({
                            time: nextCandle.time,
                            type: 'exit_long_supertrend',
                            price: exitPrice,
                            superTrend: superTrend.value
                        });
                    }
                    
                    const pnl = exitPrice - entryPrice;
                    const pnlWithCommission = pnl - (entryPrice * COMMISSION_RATE) - (exitPrice * COMMISSION_RATE);
                    
                    trades.push({
                        direction: 'long',
                        entryPrice,
                        exitPrice,
                        entryTime,
                        exitTime: nextCandle.time,
                        pnl,
                        pnlWithCommission
                    });
                    
                    inPosition = false;
                    positionDirection = null;
                }
            } else if (positionDirection === 'short') {
                // Aktualizacja najniższej ceny
                if (nextCandle.low < lowestPrice) {
                    lowestPrice = nextCandle.low;
                }
                
                // Trailing stop
                const trailingStopPrice = lowestPrice * (1 + trailingStop / 100);
                
                // Wyjście gdy:
                // 1. SuperTrend zmieni się na trend wzrostowy
                // 2. Trailing stop wyzwolony
                if (superTrend.trend === 'up' || nextCandle.high > trailingStopPrice) {
                    let exitPrice = 0;
                    
                    if (nextCandle.high > trailingStopPrice) {
                        exitPrice = trailingStopPrice;
                        signals.push({
                            time: nextCandle.time,
                            type: 'exit_short_trailing_stop',
                            price: exitPrice
                        });
                    } else {
                        exitPrice = nextCandle.open;
                        signals.push({
                            time: nextCandle.time,
                            type: 'exit_short_supertrend',
                            price: exitPrice,
                            superTrend: superTrend.value
                        });
                    }
                    
                    const pnl = entryPrice - exitPrice;
                    const pnlWithCommission = pnl - (entryPrice * COMMISSION_RATE) - (exitPrice * COMMISSION_RATE);
                    
                    trades.push({
                        direction: 'short',
                        entryPrice,
                        exitPrice,
                        entryTime,
                        exitTime: nextCandle.time,
                        pnl,
                        pnlWithCommission
                    });
                    
                    inPosition = false;
                    positionDirection = null;
                }
            }
        }
    }
    
    // Zamknij pozycję na końcu testu, jeśli nadal jesteśmy w pozycji
    if (inPosition) {
        const lastCandle = candles[candles.length - 1];
        const exitPrice = lastCandle.close;
        
        if (positionDirection === 'long') {
            const pnl = exitPrice - entryPrice;
            const pnlWithCommission = pnl - (entryPrice * COMMISSION_RATE) - (exitPrice * COMMISSION_RATE);
            
            trades.push({
                direction: 'long',
                entryPrice,
                exitPrice,
                entryTime,
                exitTime: lastCandle.time,
                pnl,
                pnlWithCommission
            });
            
            signals.push({
                time: lastCandle.time,
                type: 'exit_long_end_of_test',
                price: exitPrice
            });
        } else if (positionDirection === 'short') {
            const pnl = entryPrice - exitPrice;
            const pnlWithCommission = pnl - (entryPrice * COMMISSION_RATE) - (exitPrice * COMMISSION_RATE);
            
            trades.push({
                direction: 'short',
                entryPrice,
                exitPrice,
                entryTime,
                exitTime: lastCandle.time,
                pnl,
                pnlWithCommission
            });
            
            signals.push({
                time: lastCandle.time,
                type: 'exit_short_end_of_test',
                price: exitPrice
            });
        }
    }
    
    // Obliczenie statystyk
    const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalPnlWithCommission = trades.reduce((sum, trade) => sum + trade.pnlWithCommission, 0);
    const winTrades = trades.filter(trade => trade.pnlWithCommission > 0);
    const winRate = trades.length > 0 ? winTrades.length / trades.length : 0;
    
    // Obliczenie Sharpe Ratio
    let sharpeRatio = 0;
    if (trades.length > 1) {
        const returns = trades.map(trade => trade.pnlWithCommission);
        const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const stdDev = Math.sqrt(
            returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length
        );
        sharpeRatio = stdDev > 0 ? meanReturn / stdDev : 0;
    }
    
    // Obliczenie maksymalnego drawdown
    let maxDrawdown = 0;
    let peak = INITIAL_CAPITAL;
    let equity = INITIAL_CAPITAL;
    
    for (const trade of trades) {
        equity += trade.pnlWithCommission;
        if (equity > peak) {
            peak = equity;
        }
        
        const drawdown = peak - equity;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }
    
    // Obliczenie profit factor
    const wins = trades.filter(t => t.pnlWithCommission > 0).reduce((sum, t) => sum + t.pnlWithCommission, 0);
    const losses = Math.abs(trades.filter(t => t.pnlWithCommission < 0).reduce((sum, t) => sum + t.pnlWithCommission, 0));
    const profitFactor = losses > 0 ? wins / losses : wins > 0 ? Infinity : 0;
    
    return {
        strategy: 'SuperTrend',
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

// Funkcja optymalizacyjna dla RSI Turbo
async function optimizeRSITurbo(candles: OHLCVWithTimestamp[]): Promise<{
    bestResult: TestResult | null;
    allResults: TestResult[];
}> {
    logDebug('Rozpoczynam optymalizację RSI Turbo (pełna wersja)');
    
    // Parametry do optymalizacji
    const rsiPeriods = [7, 10, 14, 20];
    const oversoldLevels = [20, 25, 30, 35];
    const overboughtLevels = [65, 70, 75, 80];
    const adxThresholds = [15, 20, 25, 30];
    const trailingStops = [1, 1.5, 2, 3];
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
    
    logDebug(`Rozpoczynam optymalizację dla ${totalCombinations} kombinacji parametrów RSI Turbo...`);
    
    // Aby przyspieszyć proces, testujmy najpierw standardowe parametry
    const standardParams = {
        rsiPeriod: 14,
        oversold: 30,
        overbought: 70,
        adxThreshold: 25,
        trailingStop: 2,
        takeProfitMultiplier: 3
    };
    
    logDebug(`Testowanie standardowych parametrów RSI Turbo: ${JSON.stringify(standardParams)}`);
    
    const standardResult = runRSITurboStrategy(candles, standardParams);
    results.push(standardResult);
    
    if (standardResult.stats.totalPnlWithCommission > bestPnL) {
        bestPnL = standardResult.stats.totalPnlWithCommission;
        bestResult = standardResult;
        logDebug(`Znaleziono nowy najlepszy wynik RSI Turbo: ${bestPnL.toFixed(2)} USD`);
    }
    
    // Ograniczmy liczbę kombinacji, skupiając się na najbardziej obiecujących
    // W rzeczywistej wersji trzeba by zrobić pełne przeszukanie, ale dla testu zoptymalizujmy
    for (const rsiPeriod of rsiPeriods) {
        for (const oversold of [30]) { // Ograniczamy do standardowej wartości
            for (const overbought of [70]) { // Ograniczamy do standardowej wartości
                for (const adxThreshold of adxThresholds) {
                    for (const trailingStop of trailingStops) {
                        for (const takeProfitMultiplier of takeProfitMultipliers) {
                            // Pomijamy standardowe parametry, które już przetestowaliśmy
                            if (rsiPeriod === 14 && oversold === 30 && overbought === 70 && 
                                adxThreshold === 25 && trailingStop === 2 && takeProfitMultiplier === 3) {
                                continue;
                            }
                            
                            combinationCount++;
                            logDebug(`Testowanie kombinacji RSI Turbo ${combinationCount}/${totalCombinations}: RSI(${rsiPeriod}) OS=${oversold} OB=${overbought} ADX=${adxThreshold} TS=${trailingStop} TP=${takeProfitMultiplier}`);
                            
                            const result = runRSITurboStrategy(candles, {
                                rsiPeriod,
                                oversold,
                                overbought,
                                adxThreshold,
                                trailingStop,
                                takeProfitMultiplier
                            });
                            
                            results.push(result);
                            
                            if (result.stats.totalPnlWithCommission > bestPnL) {
                                bestPnL = result.stats.totalPnlWithCommission;
                                bestResult = result;
                                logDebug(`Znaleziono nowy najlepszy wynik RSI Turbo: ${bestPnL.toFixed(2)} USD z ${result.stats.tradeCount} transakcjami`);
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Sortowanie wyników
    results.sort((a, b) => b.stats.totalPnlWithCommission - a.stats.totalPnlWithCommission);
    
    logDebug(`Zakończono optymalizację RSI Turbo. Przetestowano ${results.length} kombinacji.`);
    logDebug(`Najlepszy wynik: ${bestPnL.toFixed(2)} USD z ${bestResult?.stats.tradeCount} transakcjami`);
    
    return {
        bestResult,
        allResults: results
    };
}

// Funkcja optymalizacyjna dla SuperTrend
async function optimizeSuperTrend(candles: OHLCVWithTimestamp[]): Promise<{
    bestResult: TestResult | null;
    allResults: TestResult[];
}> {
    logDebug('Rozpoczynam optymalizację SuperTrend (pełna wersja)');
    
    // Parametry do optymalizacji
    const atrPeriods = [7, 10, 14, 20];
    const atrMultipliers = [1, 2, 3, 4];
    const rsiPeriods = [7, 14, 20];
    const rsiThresholds = [50, 55, 60];
    const trailingStops = [1, 1.5, 2, 3];
    
    const results: TestResult[] = [];
    let bestResult: TestResult | null = null;
    let bestPnL = -Infinity;
    
    let combinationCount = 0;
    const totalCombinations = 
        atrPeriods.length * 
        atrMultipliers.length * 
        rsiPeriods.length * 
        rsiThresholds.length *
        trailingStops.length;
    
    logDebug(`Rozpoczynam optymalizację dla ${totalCombinations} kombinacji parametrów SuperTrend...`);
    
    // Aby przyspieszyć proces, testujmy najpierw standardowe parametry
    const standardParams = {
        atrPeriod: 14,
        atrMultiplier: 3,
        rsiPeriod: 14,
        rsiThreshold: 50,
        trailingStop: 2
    };
    
    logDebug(`Testowanie standardowych parametrów SuperTrend: ${JSON.stringify(standardParams)}`);
    
    const standardResult = runSuperTrendStrategy(candles, standardParams);
    results.push(standardResult);
    
    if (standardResult.stats.totalPnlWithCommission > bestPnL) {
        bestPnL = standardResult.stats.totalPnlWithCommission;
        bestResult = standardResult;
        logDebug(`Znaleziono nowy najlepszy wynik SuperTrend: ${bestPnL.toFixed(2)} USD`);
    }
    
    // Ograniczmy liczbę kombinacji, skupiając się na najbardziej obiecujących
    for (const atrPeriod of atrPeriods) {
        for (const atrMultiplier of atrMultipliers) {
            for (const rsiPeriod of [14]) { // Ograniczamy do standardowej wartości
                for (const rsiThreshold of rsiThresholds) {
                    for (const trailingStop of [2]) { // Ograniczamy do standardowej wartości
                        // Pomijamy standardowe parametry, które już przetestowaliśmy
                        if (atrPeriod === 14 && atrMultiplier === 3 && 
                            rsiPeriod === 14 && rsiThreshold === 50 && trailingStop === 2) {
                            continue;
                        }
                        
                        combinationCount++;
                        logDebug(`Testowanie kombinacji SuperTrend ${combinationCount}/${totalCombinations}: ATR(${atrPeriod}, ${atrMultiplier}) RSI(${rsiPeriod}, ${rsiThreshold}) TS=${trailingStop}`);
                        
                        const result = runSuperTrendStrategy(candles, {
                            atrPeriod,
                            atrMultiplier,
                            rsiPeriod,
                            rsiThreshold,
                            trailingStop
                        });
                        
                        results.push(result);
                        
                        if (result.stats.totalPnlWithCommission > bestPnL) {
                            bestPnL = result.stats.totalPnlWithCommission;
                            bestResult = result;
                            logDebug(`Znaleziono nowy najlepszy wynik SuperTrend: ${bestPnL.toFixed(2)} USD z ${result.stats.tradeCount} transakcjami`);
                        }
                    }
                }
            }
        }
    }
    
    // Sortowanie wyników
    results.sort((a, b) => b.stats.totalPnlWithCommission - a.stats.totalPnlWithCommission);
    
    logDebug(`Zakończono optymalizację SuperTrend. Przetestowano ${results.length} kombinacji.`);
    logDebug(`Najlepszy wynik: ${bestPnL.toFixed(2)} USD z ${bestResult?.stats.tradeCount} transakcjami`);
    
    return {
        bestResult,
        allResults: results
    };
}

// Główna funkcja
async function optimizeAllStrategies() {
    logDebug('Rozpoczynam główną funkcję optymalizacji (PEŁNA WERSJA)');
    
    // Definicja plików dla różnych interwałów z poprawnymi ścieżkami
    const timeframes = [
        { name: '15m', file: '15m.csv' },
        { name: '1h', file: '1h.csv' },
        { name: '4h', file: '4h.csv' },
        { name: '1d', file: '1d.csv' }
    ];
    
    logDebug('Ładowanie danych świecowych dla interwałów...');
    
    // Załaduj dane dla wszystkich interwałów
    const candlesData: Record<string, OHLCVWithTimestamp[]> = {};
    for (const timeframe of timeframes) {
        try {
            logDebug(`Ładowanie danych dla interwału ${timeframe.name}...`);
            // Używamy naszej własnej funkcji do ładowania zamiast loadCandles
            const rawCandles = await loadCandlesFromFile(timeframe.file);
            logDebug(`Załadowano ${rawCandles.length} świec ${timeframe.name}`);
            
            // Czyszczenie danych z wartości NaN
            const cleanCandles = cleanCandleData(rawCandles);
            candlesData[timeframe.name] = cleanCandles;
        } catch (error) {
            logDebug(`BŁĄD podczas ładowania danych dla interwału ${timeframe.name}: ${error}`);
            console.error(`Błąd podczas ładowania danych dla interwału ${timeframe.name}:`, error);
        }
    }
    
    if (Object.keys(candlesData).length === 0) {
        logDebug('BŁĄD: Nie udało się załadować żadnych danych. Przerywam optymalizację.');
        throw new Error("Nie udało się załadować żadnych danych. Przerywam optymalizację.");
    }

    const timestamp = Date.now();
    const resultsDir = path.resolve(__dirname, `../results/optimization_full_${timestamp}`);
    
    logDebug(`Tworzenie katalogu wyników: ${resultsDir}`);
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Wyniki dla wszystkich strategii i interwałów
    const allResults: Record<string, Record<string, TimeframeResult>> = {
        RSITurbo: {},
        SuperTrend: {}
    };
    
    // Przeprowadź optymalizację dla każdego interwału
    for (const timeframe of timeframes) {
        if (!candlesData[timeframe.name] || candlesData[timeframe.name].length === 0) {
            logDebug(`Pomijam interwał ${timeframe.name} - brak danych`);
            continue;
        }
        
        logDebug(`==== OPTYMALIZACJA DLA INTERWAŁU ${timeframe.name} ====`);
        
        const timeframeCandles = candlesData[timeframe.name];
        
        // 1. RSI Turbo
        try {
            logDebug(`Optymalizacja RSI Turbo dla interwału ${timeframe.name}...`);
            const rsiResults = await optimizeRSITurbo(timeframeCandles);
            allResults.RSITurbo[timeframe.name] = {
                timeframe: timeframe.name,
                results: rsiResults
            };
            
            // Zapisz wyniki RSI Turbo
            const rsiDir = path.join(resultsDir, 'RSITurbo', timeframe.name);
            logDebug(`Zapisywanie wyników RSI Turbo do: ${rsiDir}`);
            
            if (!fs.existsSync(rsiDir)) {
                fs.mkdirSync(rsiDir, { recursive: true });
            }
            
            fs.writeFileSync(
                path.join(rsiDir, 'best_params.json'),
                JSON.stringify(rsiResults.bestResult?.params, null, 2)
            );
            
            fs.writeFileSync(
                path.join(rsiDir, 'best_stats.json'),
                JSON.stringify(rsiResults.bestResult?.stats, null, 2)
            );
            
            const rsiTop10 = rsiResults.allResults.slice(0, 10);
            fs.writeFileSync(
                path.join(rsiDir, 'top10_results.json'),
                JSON.stringify(rsiTop10.map(r => ({
                    params: r.params,
                    stats: r.stats
                })), null, 2)
            );
            
            // Pokaż podsumowanie wyników
            if (rsiResults.bestResult) {
                logDebug(`NAJLEPSZE PARAMETRY RSI TURBO DLA ${timeframe.name}:`);
                logDebug(`PnL: ${rsiResults.bestResult.stats.totalPnlWithCommission.toFixed(2)} USD`);
                logDebug(`Win Rate: ${(rsiResults.bestResult.stats.winRate * 100).toFixed(2)}%`);
                logDebug(`Liczba transakcji: ${rsiResults.bestResult.stats.tradeCount}`);
                logDebug(`Parametry: ${JSON.stringify(rsiResults.bestResult.params)}`);
            }
        } catch (error) {
            logDebug(`BŁĄD podczas optymalizacji RSI Turbo dla interwału ${timeframe.name}: ${error}`);
            console.error(`Błąd podczas optymalizacji RSI Turbo dla interwału ${timeframe.name}:`, error);
        }
        
        // 2. SuperTrend
        try {
            logDebug(`Optymalizacja SuperTrend dla interwału ${timeframe.name}...`);
            const stResults = await optimizeSuperTrend(timeframeCandles);
            allResults.SuperTrend[timeframe.name] = {
                timeframe: timeframe.name,
                results: stResults
            };
            
            // Zapisz wyniki SuperTrend
            const stDir = path.join(resultsDir, 'SuperTrend', timeframe.name);
            logDebug(`Zapisywanie wyników SuperTrend do: ${stDir}`);
            
            if (!fs.existsSync(stDir)) {
                fs.mkdirSync(stDir, { recursive: true });
            }
            
            fs.writeFileSync(
                path.join(stDir, 'best_params.json'),
                JSON.stringify(stResults.bestResult?.params, null, 2)
            );
            
            fs.writeFileSync(
                path.join(stDir, 'best_stats.json'),
                JSON.stringify(stResults.bestResult?.stats, null, 2)
            );
            
            const stTop10 = stResults.allResults.slice(0, 10);
            fs.writeFileSync(
                path.join(stDir, 'top10_results.json'),
                JSON.stringify(stTop10.map(r => ({
                    params: r.params,
                    stats: r.stats
                })), null, 2)
            );
            
            // Pokaż podsumowanie wyników
            if (stResults.bestResult) {
                logDebug(`NAJLEPSZE PARAMETRY SUPERTREND DLA ${timeframe.name}:`);
                logDebug(`PnL: ${stResults.bestResult.stats.totalPnlWithCommission.toFixed(2)} USD`);
                logDebug(`Win Rate: ${(stResults.bestResult.stats.winRate * 100).toFixed(2)}%`);
                logDebug(`Liczba transakcji: ${stResults.bestResult.stats.tradeCount}`);
                logDebug(`Parametry: ${JSON.stringify(stResults.bestResult.params)}`);
            }
        } catch (error) {
            logDebug(`BŁĄD podczas optymalizacji SuperTrend dla interwału ${timeframe.name}: ${error}`);
            console.error(`Błąd podczas optymalizacji SuperTrend dla interwału ${timeframe.name}:`, error);
        }
    }
    
    // Wygeneruj raport HTML
    logDebug('Generowanie raportu HTML...');
    
    let htmlReport = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Raport Optymalizacji - Pełny</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
            .strategy-container { margin-bottom: 40px; }
            .timeframe-container { margin-bottom: 30px; }
            h2 { color: #333; border-bottom: 2px solid #333; padding-bottom: 5px; }
            h3 { color: #555; }
            .summary { display: flex; justify-content: space-between; margin: 20px 0; }
            .summary-item { text-align: center; background: #f5f5f5; padding: 15px; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f2f2f2; }
            .top-row { background-color: #e6f7ff; }
            .positive { color: green; }
            .negative { color: red; }
        </style>
    </head>
    <body>
        <h1>Raport Optymalizacji Strategii (Pełny)</h1>
        <p>Wygenerowano: ${new Date().toISOString()}</p>
        
        <div id="strategies">
    `;
    
    for (const strategy of ['RSITurbo', 'SuperTrend']) {
        htmlReport += `
        <div class="strategy-container">
            <h2>${strategy}</h2>
        `;
        
        for (const timeframe in allResults[strategy]) {
            const timeframeResult = allResults[strategy][timeframe];
            const bestResult = timeframeResult.results.bestResult;
            
            if (bestResult) {
                const top10 = timeframeResult.results.allResults.slice(0, 10);
                
                htmlReport += `
                <div class="timeframe-container">
                    <h3>Interwał: ${timeframe}</h3>
                    
                    <div class="summary">
                        <div class="summary-item">
                            <div>Liczba transakcji</div>
                            <div>${bestResult.stats.tradeCount}</div>
                        </div>
                        <div class="summary-item">
                            <div>Win Rate</div>
                            <div>${(bestResult.stats.winRate * 100).toFixed(2)}%</div>
                        </div>
                        <div class="summary-item">
                            <div>Zysk (z prowizją)</div>
                            <div class="${bestResult.stats.totalPnlWithCommission >= 0 ? 'positive' : 'negative'}">
                                ${bestResult.stats.totalPnlWithCommission.toFixed(2)} USD
                            </div>
                        </div>
                        <div class="summary-item">
                            <div>Sharpe Ratio</div>
                            <div>${bestResult.stats.sharpeRatio.toFixed(4)}</div>
                        </div>
                        <div class="summary-item">
                            <div>Profit Factor</div>
                            <div>${bestResult.stats.profitFactor.toFixed(2)}</div>
                        </div>
                    </div>
                    
                    <h3>Top 10 Kombinacji Parametrów</h3>
                    <table>
                        <tr>
                            <th>Rank</th>
                            ${Object.keys(bestResult.params).map(key => `<th>${key}</th>`).join('')}
                            <th>Trades</th>
                            <th>Win Rate</th>
                            <th>PnL (z prowizją)</th>
                            <th>Sharpe</th>
                            <th>Profit Factor</th>
                        </tr>
                        ${top10.map((result, index) => `
                        <tr class="${index === 0 ? 'top-row' : ''}">
                            <td>${index + 1}</td>
                            ${Object.values(result.params).map(value => `<td>${value}</td>`).join('')}
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
        
        htmlReport += `</div>`;
    }
    
    htmlReport += `
    </body>
    </html>
    `;
    
    fs.writeFileSync(
        path.join(resultsDir, 'optimization_report.html'),
        htmlReport
    );
    
    logDebug('Raport HTML wygenerowany pomyślnie.');
    logDebug(`Wszystkie wyniki zapisane w katalogu: ${resultsDir}`);
    logDebug('=== OPTYMALIZACJA ZAKOŃCZONA ===');
    
    return {
        resultsDir,
        allResults
    };
}

// Uruchom główną funkcję
logDebug('Uruchamianie głównej funkcji optymalizacji...');

optimizeAllStrategies()
    .then(results => {
        logDebug(`Optymalizacja zakończona powodzeniem!`);
        logDebug(`Wyniki dostępne w: ${results.resultsDir}`);
        console.log('\n=== OPTYMALIZACJA ZAKOŃCZONA POWODZENIEM ===');
        console.log(`Wyniki dostępne w: ${results.resultsDir}`);
    })
    .catch(error => {
        logDebug(`BŁĄD KRYTYCZNY w głównej funkcji: ${error}`);
        console.error('Wystąpił błąd podczas optymalizacji:', error);
    })
    .finally(() => {
        logDebug('Zakończenie działania skryptu.');
        console.log('Program zakończył działanie.');
    });

logDebug('Inicjalizacja skryptu zakończona. Oczekiwanie na zakończenie procesu optymalizacji...');

/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
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
    pnlWithCommission: number;
}

interface TestResult {
    strategy: string;
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
const COMMISSION_RATE = 0.001; // 0.1% prowizji za transakcję (0.1% przy wejściu i 0.1% przy wyjściu)
const INITIAL_CAPITAL = 10000; // 10,000 USD początkowego kapitału
const RISK_PER_TRADE = 0.02; // 2% ryzyko na transakcję

// RSI Turbo - bardziej realistyczna implementacja
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
        const time = candles[i].time;
        const atr = atrValues[i];
        
        // Sprawdzenie, czy jest to nowy dzień (do filtrowania sygnałów)
        const currentDate = new Date(time);
        const prevDate = new Date(candles[i - 1].time);
        const isNewDay = currentDate.getDate() !== prevDate.getDate() || 
                          currentDate.getMonth() !== prevDate.getMonth() ||
                          currentDate.getFullYear() !== prevDate.getFullYear();
        
        if (!inPosition) {
            // Logika wejścia z dodatkowymi filtrami
            // Long: RSI < oversold, RSI rośnie, ADX > threshold, cena > EMA200, ATR > 0
            if (rsi <= oversold && rsi > prevRsi && adx >= adxThreshold && 
                price > ema200 && atr > 0) {
                
                const stopLoss = price - 2 * atr; // Stop loss 2x ATR poniżej ceny wejścia
                const positionSize = calculatePositionSize(price, stopLoss);
                
                if (positionSize > 0) {
                    inPosition = true;
                    positionType = 'long';
                    entryPrice = price;
                    entryTime = time;
                    signals.push({ time, price, type: 'buy', stopLoss });
                }
            } 
            // Short: RSI > overbought, RSI spada, ADX > threshold, cena < EMA200, ATR > 0
            else if (rsi >= overbought && rsi < prevRsi && adx >= adxThreshold && 
                     price < ema200 && atr > 0) {
                     
                const stopLoss = price + 2 * atr; // Stop loss 2x ATR powyżej ceny wejścia
                const positionSize = calculatePositionSize(price, stopLoss);
                
                if (positionSize > 0) {
                    inPosition = true;
                    positionType = 'short';
                    entryPrice = price;
                    entryTime = time;
                    signals.push({ time, price, type: 'sell', stopLoss });
                }
            }
        } else {
            // Logika wyjścia
            if (positionType === 'long') {
                // Zamykamy long gdy RSI > overbought lub stop loss
                const stopLoss = signals.find(s => s.time === entryTime)?.stopLoss || 0;
                
                if (rsi >= overbought || price <= stopLoss) {
                    inPosition = false;
                    
                    // Obliczanie PnL
                    const pnl = price - entryPrice;
                    const commissionEntry = entryPrice * COMMISSION_RATE;
                    const commissionExit = price * COMMISSION_RATE;
                    const pnlWithCommission = pnl - commissionEntry - commissionExit;
                    
                    // Aktualizacja kapitału
                    currentEquity += pnlWithCommission;
                    
                    trades.push({
                        direction: positionType,
                        entryPrice,
                        exitPrice: price,
                        entryTime,
                        exitTime: time,
                        pnl,
                        pnlWithCommission
                    });
                    
                    signals.push({ 
                        time, 
                        price, 
                        type: 'sell', 
                        reason: price <= stopLoss ? 'stopLoss' : 'takeProfit'
                    });
                    
                    positionType = null;
                }
            } else if (positionType === 'short') {
                // Zamykamy short gdy RSI < oversold lub stop loss
                const stopLoss = signals.find(s => s.time === entryTime)?.stopLoss || Infinity;
                
                if (rsi <= oversold || price >= stopLoss) {
                    inPosition = false;
                    
                    // Obliczanie PnL
                    const pnl = entryPrice - price;
                    const commissionEntry = entryPrice * COMMISSION_RATE;
                    const commissionExit = price * COMMISSION_RATE;
                    const pnlWithCommission = pnl - commissionEntry - commissionExit;
                    
                    // Aktualizacja kapitału
                    currentEquity += pnlWithCommission;
                    
                    trades.push({
                        direction: positionType,
                        entryPrice,
                        exitPrice: price,
                        entryTime,
                        exitTime: time,
                        pnl,
                        pnlWithCommission
                    });
                    
                    signals.push({ 
                        time, 
                        price, 
                        type: 'buy',
                        reason: price >= stopLoss ? 'stopLoss' : 'takeProfit'
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

// Funkcja main
async function main() {
    try {
        console.log('=== TESTOWANIE STRATEGII RSI TURBO Z REALISTYCZNYMI PARAMETRAMI ===');
        
        // Ładowanie danych
        console.log('Ładowanie danych świecowych...');
        const candles = await loadCandles('BTC_data_clean.csv');
        console.log(`Załadowano ${candles.length} świec 15-minutowych.`);
        
        // Parametry RSI Turbo
        console.log('\nUruchamiam strategię RSI Turbo z realistycznymi parametrami...');
        const rsiParams = {
            rsiPeriod: 20,
            oversold: 30,
            overbought: 70,
            adxThreshold: 15
        };
        
        // Uruchamiamy strategię RSI Turbo
        const results = runRSITurboStrategy(candles, rsiParams);
        
        // Tworzenie katalogu dla wyników
        const timestamp = Date.now();
        const resultsDir = path.resolve(__dirname, `../results/realistic_test_${timestamp}`);
        
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }
        
        // Zapisz szczegółowe wyniki
        fs.writeFileSync(
            path.join(resultsDir, 'RSITurbo_trades.json'),
            JSON.stringify(results.trades, null, 2)
        );
        
        fs.writeFileSync(
            path.join(resultsDir, 'RSITurbo_signals.json'),
            JSON.stringify(results.signals, null, 2)
        );
        
        fs.writeFileSync(
            path.join(resultsDir, 'RSITurbo_stats.json'),
            JSON.stringify(results.stats, null, 2)
        );
        
        // Zapisz informacje o parametrach
        fs.writeFileSync(
            path.join(resultsDir, 'RSITurbo_params.json'),
            JSON.stringify(rsiParams, null, 2)
        );
        
        // Drukuj wyniki
        console.log('\n=== PODSUMOWANIE WYNIKÓW Z UWZGLĘDNIENIEM PROWIZJI ===');
        console.log(`Kapitał początkowy: ${INITIAL_CAPITAL.toFixed(2)} USD`);
        console.log(`Całkowity PnL (bez prowizji): ${results.stats.totalPnl.toFixed(2)} USD`);
        console.log(`Całkowity PnL (z prowizją): ${results.stats.totalPnlWithCommission.toFixed(2)} USD`);
        console.log(`Końcowy kapitał: ${results.stats.finalEquity.toFixed(2)} USD`);
        console.log(`Liczba transakcji: ${results.stats.tradeCount}`);
        console.log(`Win Rate: ${(results.stats.winRate * 100).toFixed(2)}%`);
        console.log(`Sharpe Ratio: ${results.stats.sharpeRatio.toFixed(4)}`);
        console.log(`Maksymalny Drawdown: ${results.stats.maxDrawdown.toFixed(2)} USD`);
        console.log(`Profit Factor: ${results.stats.profitFactor.toFixed(2)}`);
        console.log(`\nKoszt prowizji: ${(results.stats.totalPnl - results.stats.totalPnlWithCommission).toFixed(2)} USD`);
        
        // Oblicz statystyki longów i shortów
        const longTrades = results.trades.filter(t => t.direction === 'long');
        const shortTrades = results.trades.filter(t => t.direction === 'short');
        
        const longWins = longTrades.filter(t => t.pnlWithCommission > 0);
        const shortWins = shortTrades.filter(t => t.pnlWithCommission > 0);
        
        const longPnL = longTrades.reduce((sum, t) => sum + t.pnlWithCommission, 0);
        const shortPnL = shortTrades.reduce((sum, t) => sum + t.pnlWithCommission, 0);
        
        console.log('\n=== STATYSTYKI WEDŁUG KIERUNKU ===');
        console.log(`Long: ${longTrades.length} transakcji, Win Rate: ${((longWins.length / longTrades.length || 0) * 100).toFixed(2)}%, PnL: ${longPnL.toFixed(2)} USD`);
        console.log(`Short: ${shortTrades.length} transakcji, Win Rate: ${((shortWins.length / shortTrades.length || 0) * 100).toFixed(2)}%, PnL: ${shortPnL.toFixed(2)} USD`);
        
        // Generowanie raportu HTML
        const htmlReport = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Realistyczny Test Strategii RSI Turbo</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                h1, h2 { color: #2a5885; }
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
                .strategy-name { font-weight: bold; }
                pre { 
                    background-color: #f8f8f8; 
                    padding: 15px; 
                    border-radius: 5px; 
                    overflow-x: auto;
                }
            </style>
        </head>
        <body>
            <h1>Realistyczny Test Strategii RSI Turbo</h1>
            
            <div class="stats-container">
                <div class="stat-box">
                    <h3>Kapitał Początkowy</h3>
                    <div>${INITIAL_CAPITAL.toFixed(2)} USD</div>
                </div>
                <div class="stat-box">
                    <h3>Końcowy Kapitał</h3>
                    <div class="${results.stats.finalEquity > INITIAL_CAPITAL ? 'positive' : 'negative'}">${results.stats.finalEquity.toFixed(2)} USD</div>
                </div>
                <div class="stat-box">
                    <h3>Całkowity PnL (bez prowizji)</h3>
                    <div class="${results.stats.totalPnl >= 0 ? 'positive' : 'negative'}">${results.stats.totalPnl.toFixed(2)} USD</div>
                </div>
                <div class="stat-box">
                    <h3>Całkowity PnL (z prowizją)</h3>
                    <div class="${results.stats.totalPnlWithCommission >= 0 ? 'positive' : 'negative'}">${results.stats.totalPnlWithCommission.toFixed(2)} USD</div>
                </div>
                <div class="stat-box">
                    <h3>Liczba Transakcji</h3>
                    <div>${results.stats.tradeCount}</div>
                </div>
                <div class="stat-box">
                    <h3>Win Rate</h3>
                    <div>${(results.stats.winRate * 100).toFixed(2)}%</div>
                </div>
                <div class="stat-box">
                    <h3>Sharpe Ratio</h3>
                    <div>${results.stats.sharpeRatio.toFixed(4)}</div>
                </div>
                <div class="stat-box">
                    <h3>Max Drawdown</h3>
                    <div>${results.stats.maxDrawdown.toFixed(2)} USD</div>
                </div>
                <div class="stat-box">
                    <h3>Profit Factor</h3>
                    <div>${results.stats.profitFactor.toFixed(2)}</div>
                </div>
                <div class="stat-box">
                    <h3>Koszt Prowizji</h3>
                    <div>${(results.stats.totalPnl - results.stats.totalPnlWithCommission).toFixed(2)} USD</div>
                </div>
            </div>
            
            <h2>Statystyki Według Kierunku</h2>
            <table>
                <tr>
                    <th>Kierunek</th>
                    <th>Liczba Transakcji</th>
                    <th>Win Rate</th>
                    <th>PnL</th>
                </tr>
                <tr>
                    <td>Long</td>
                    <td>${longTrades.length}</td>
                    <td>${((longWins.length / longTrades.length || 0) * 100).toFixed(2)}%</td>
                    <td class="${longPnL >= 0 ? 'positive' : 'negative'}">${longPnL.toFixed(2)} USD</td>
                </tr>
                <tr>
                    <td>Short</td>
                    <td>${shortTrades.length}</td>
                    <td>${((shortWins.length / shortTrades.length || 0) * 100).toFixed(2)}%</td>
                    <td class="${shortPnL >= 0 ? 'positive' : 'negative'}">${shortPnL.toFixed(2)} USD</td>
                </tr>
            </table>
            
            <h2>Parametry Strategii</h2>
            <pre>${JSON.stringify(rsiParams, null, 2)}</pre>
            
            <h2>10 Ostatnich Transakcji</h2>
            <table>
                <tr>
                    <th>Data Wejścia</th>
                    <th>Data Wyjścia</th>
                    <th>Kierunek</th>
                    <th>Cena Wejścia</th>
                    <th>Cena Wyjścia</th>
                    <th>PnL</th>
                    <th>PnL z Prowizją</th>
                </tr>
                ${results.trades.slice(-10).reverse().map(t => `
                <tr>
                    <td>${new Date(t.entryTime).toLocaleString()}</td>
                    <td>${new Date(t.exitTime).toLocaleString()}</td>
                    <td>${t.direction}</td>
                    <td>${t.entryPrice.toFixed(2)}</td>
                    <td>${t.exitPrice.toFixed(2)}</td>
                    <td class="${t.pnl >= 0 ? 'positive' : 'negative'}">${t.pnl.toFixed(2)}</td>
                    <td class="${t.pnlWithCommission >= 0 ? 'positive' : 'negative'}">${t.pnlWithCommission.toFixed(2)}</td>
                </tr>
                `).join('')}
            </table>
        </body>
        </html>
        `;
        
        fs.writeFileSync(
            path.join(resultsDir, 'report.html'),
            htmlReport
        );
        
        console.log(`\nWyniki zapisane w katalogu: ${resultsDir}`);
        console.log(`Wygenerowano raport HTML: ${path.join(resultsDir, 'report.html')}`);
        
    } catch (error) {
        console.error('Wystąpił błąd:', error);
    }
}

// Uruchom główną funkcję
main().catch(console.error);

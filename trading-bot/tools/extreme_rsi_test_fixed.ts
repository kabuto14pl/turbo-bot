/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
// extreme_rsi_test_fixed.ts
// Script to test a very basic RSI strategy on Bitcoin data with fixed CSV parsing

import * as fs from 'fs';
import * as path from 'path';
import { calcRSI } from '../core/indicators/rsi';

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

// Function to load the first N candles from a file
function loadLimitedCandlesFromFile(filepath: string, limit: number = 5000): OHLCVWithTimestamp[] {
    console.log(`Loading data from: ${filepath} (limited to ${limit} candles)`);
    
    if (!fs.existsSync(filepath)) {
        console.error(`File ${filepath} does not exist!`);
        return [];
    }
    
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n');
    
    // Skip header
    const dataLines = lines.slice(1, limit + 1).filter(line => line.trim() !== '');
    
    const candles: OHLCVWithTimestamp[] = [];
    
    for (const line of dataLines) {
        const parts = line.split(',');
        if (parts.length < 7) continue;
        
        // Format: Unix,Date,Symbol,Open,High,Low,Close,Volume BTC,Volume USDT,tradecount
        const timestamp = parseInt(parts[0]);
        const open = parseFloat(parts[3]);
        const high = parseFloat(parts[4]);
        const low = parseFloat(parts[5]);
        const close = parseFloat(parts[6]);
        const volume = parseFloat(parts[7]);
        
        if (!isNaN(timestamp) && !isNaN(open) && !isNaN(high) && 
            !isNaN(low) && !isNaN(close) && !isNaN(volume)) {
            candles.push({
                time: timestamp,
                open,
                high,
                low,
                close,
                volume
            });
        }
    }
    
    // Sort candles from oldest to newest (reverse order since the file is newest first)
    candles.sort((a, b) => a.time - b.time);
    
    return candles;
}

// Very simple RSI strategy with extreme values
function runExtremeRsiStrategy(candles: OHLCVWithTimestamp[]): {
    trades: Trade[];
    totalPnl: number;
    winRate: number;
} {
    console.log("Running Extreme RSI Strategy test...");
    
    const trades: Trade[] = [];
    const rsiPeriod = 7;  // Using a shorter period for more sensitivity
    
    // Calculate RSI values
    const rsiValues: number[] = [];
    
    for (let i = 0; i < candles.length; i++) {
        if (i >= rsiPeriod) {
            // Get array of candle objects for RSI calculation
            const candleSlice = candles.slice(i - rsiPeriod, i + 1);
            const rsi = calcRSI(candleSlice, rsiPeriod);
            rsiValues.push(rsi ?? 50);
        } else {
            rsiValues.push(50); // Placeholder
        }
    }
    
    // Print RSI statistics for debugging
    const validRsiValues = rsiValues.filter(rsi => !isNaN(rsi));
    const minRsi = Math.min(...validRsiValues);
    const maxRsi = Math.max(...validRsiValues);
    const sumRsi = validRsiValues.reduce((sum, val) => sum + val, 0);
    const avgRsi = sumRsi / validRsiValues.length;
    
    console.log(`RSI Statistics - Min: ${minRsi.toFixed(2)}, Max: ${maxRsi.toFixed(2)}, Avg: ${avgRsi.toFixed(2)}`);
    console.log(`Total valid RSI values: ${validRsiValues.length} out of ${rsiValues.length}`);
    
    // Count RSI distribution
    const belowThirty = validRsiValues.filter(rsi => rsi < 30).length;
    const belowForty = validRsiValues.filter(rsi => rsi < 40).length;
    const aboveSixty = validRsiValues.filter(rsi => rsi > 60).length;
    const aboveSeventy = validRsiValues.filter(rsi => rsi > 70).length;
    
    console.log(`RSI Distribution:`);
    console.log(`- Below 30: ${belowThirty} (${((belowThirty/validRsiValues.length)*100).toFixed(2)}%)`);
    console.log(`- Below 40: ${belowForty} (${((belowForty/validRsiValues.length)*100).toFixed(2)}%)`);
    console.log(`- Above 60: ${aboveSixty} (${((aboveSixty/validRsiValues.length)*100).toFixed(2)}%)`);
    console.log(`- Above 70: ${aboveSeventy} (${((aboveSeventy/validRsiValues.length)*100).toFixed(2)}%)`);
    
    // Strategy parameters - optimized for RSI(7)
    const extremelyOversold = 40; // Entry for long positions
    const extremelyOverbought = 60; // Entry for short positions
    
    // Trading logic
    let inPosition = false;
    let positionDirection: 'long' | 'short' | null = null;
    let entryPrice = 0;
    let entryTime = 0;
    
    for (let i = rsiPeriod; i < candles.length - 1; i++) {
        const rsi = rsiValues[i];
        const nextCandle = candles[i + 1];
        
        if (!inPosition) {
            // Entry conditions (extremely oversold/overbought)
            if (rsi <= extremelyOversold) {
                // Enter long on extremely oversold
                inPosition = true;
                positionDirection = 'long';
                entryPrice = nextCandle.open;
                entryTime = nextCandle.time;
                console.log(`${new Date(entryTime).toISOString()} - LONG entry at ${entryPrice}, RSI: ${rsi.toFixed(2)}`);
            } else if (rsi >= extremelyOverbought) {
                // Enter short on extremely overbought
                inPosition = true;
                positionDirection = 'short';
                entryPrice = nextCandle.open;
                entryTime = nextCandle.time;
                console.log(`${new Date(entryTime).toISOString()} - SHORT entry at ${entryPrice}, RSI: ${rsi.toFixed(2)}`);
            }
        } else {
            // Exit conditions - optimized for RSI(7)
            if (positionDirection === 'long' && (rsi >= 50 || i - trades.length >= 20)) {
                // Exit long when RSI returns above neutral or after 20 bars
                const exitPrice = nextCandle.open;
                const pnl = exitPrice - entryPrice;
                
                trades.push({
                    direction: 'long',
                    entryPrice,
                    exitPrice,
                    entryTime,
                    exitTime: nextCandle.time,
                    pnl
                });
                
                console.log(`${new Date(nextCandle.time).toISOString()} - LONG exit at ${exitPrice}, RSI: ${rsi.toFixed(2)}, PnL: ${pnl.toFixed(2)}`);
                
                inPosition = false;
                positionDirection = null;
            } else if (positionDirection === 'short' && (rsi <= 50 || i - trades.length >= 20)) {
                // Exit short when RSI returns below neutral or after 20 bars
                const exitPrice = nextCandle.open;
                const pnl = entryPrice - exitPrice;
                
                trades.push({
                    direction: 'short',
                    entryPrice,
                    exitPrice,
                    entryTime,
                    exitTime: nextCandle.time,
                    pnl
                });
                
                console.log(`${new Date(nextCandle.time).toISOString()} - SHORT exit at ${exitPrice}, RSI: ${rsi.toFixed(2)}, PnL: ${pnl.toFixed(2)}`);
                
                inPosition = false;
                positionDirection = null;
            }
        }
    }
    
    // Close any open position at the end
    if (inPosition) {
        const lastCandle = candles[candles.length - 1];
        
        if (positionDirection === 'long') {
            const exitPrice = lastCandle.close;
            const pnl = exitPrice - entryPrice;
            
            trades.push({
                direction: 'long',
                entryPrice,
                exitPrice,
                entryTime,
                exitTime: lastCandle.time,
                pnl
            });
            
            console.log(`${new Date(lastCandle.time).toISOString()} - LONG exit at end of test: ${exitPrice}, PnL: ${pnl.toFixed(2)}`);
        } else if (positionDirection === 'short') {
            const exitPrice = lastCandle.close;
            const pnl = entryPrice - exitPrice;
            
            trades.push({
                direction: 'short',
                entryPrice,
                exitPrice,
                entryTime,
                exitTime: lastCandle.time,
                pnl
            });
            
            console.log(`${new Date(lastCandle.time).toISOString()} - SHORT exit at end of test: ${exitPrice}, PnL: ${pnl.toFixed(2)}`);
        }
    }
    
    // Calculate stats
    const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const winTrades = trades.filter(trade => trade.pnl > 0);
    const winRate = trades.length > 0 ? winTrades.length / trades.length : 0;
    
    return {
        trades,
        totalPnl,
        winRate
    };
}

// Function to create a simple HTML report
function createHtmlReport(result: {
    trades: Trade[];
    totalPnl: number;
    winRate: number;
}): string {
    const { trades, totalPnl, winRate } = result;
    
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Optimized RSI(7) Strategy Results</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1, h2 { color: #333; }
            .summary { display: flex; justify-content: space-between; margin: 20px 0; }
            .summary-item { text-align: center; background: #f5f5f5; padding: 15px; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f2f2f2; }
            .positive { color: green; }
            .negative { color: red; }
        </style>
    </head>
    <body>
        <h1>Optimized RSI(7) Strategy Test Results</h1>
        
        <div class="summary">
            <div class="summary-item">
                <div>Total Trades</div>
                <div>${trades.length}</div>
            </div>
            <div class="summary-item">
                <div>Win Rate</div>
                <div>${(winRate * 100).toFixed(2)}%</div>
            </div>
            <div class="summary-item">
                <div>Total PnL</div>
                <div class="${totalPnl >= 0 ? 'positive' : 'negative'}">${totalPnl.toFixed(2)}</div>
            </div>
        </div>
        
        <h2>Trade Details</h2>
        <table>
            <tr>
                <th>#</th>
                <th>Direction</th>
                <th>Entry Time</th>
                <th>Entry Price</th>
                <th>Exit Time</th>
                <th>Exit Price</th>
                <th>PnL</th>
            </tr>
    `;
    
    trades.forEach((trade, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${trade.direction.toUpperCase()}</td>
                <td>${new Date(trade.entryTime).toISOString()}</td>
                <td>${trade.entryPrice.toFixed(2)}</td>
                <td>${new Date(trade.exitTime).toISOString()}</td>
                <td>${trade.exitPrice.toFixed(2)}</td>
                <td class="${trade.pnl >= 0 ? 'positive' : 'negative'}">${trade.pnl.toFixed(2)}</td>
            </tr>
        `;
    });
    
    html += `
        </table>
    </body>
    </html>
    `;
    
    return html;
}

// Main function
async function main() {
    console.log("=== OPTIMIZED RSI(7) STRATEGY TEST ===");
    
    // Use the full dataset but limit to 5000 candles to avoid memory issues
    const btcDataFile = path.join(__dirname, '../BTC_data.csv');
    const candles = loadLimitedCandlesFromFile(btcDataFile, 5000);
    
    if (candles.length === 0) {
        console.error("No data loaded. Exiting.");
        return;
    }
    
    console.log(`Loaded ${candles.length} candles from ${btcDataFile}`);
    console.log(`Data range: ${new Date(candles[0].time).toISOString()} to ${new Date(candles[candles.length - 1].time).toISOString()}`);
    
    // Run the extreme RSI strategy
    const result = runExtremeRsiStrategy(candles);
    
    // Print results
    console.log("\n=== STRATEGY RESULTS ===");
    console.log(`Total trades: ${result.trades.length}`);
    console.log(`Win rate: ${(result.winRate * 100).toFixed(2)}%`);
    console.log(`Total PnL: ${result.totalPnl.toFixed(2)}`);
    
    // Print individual trade results
    console.log("\n=== INDIVIDUAL TRADES ===");
    result.trades.forEach((trade, index) => {
        console.log(`Trade ${index + 1}: ${trade.direction.toUpperCase()} from ${new Date(trade.entryTime).toISOString()} to ${new Date(trade.exitTime).toISOString()}, PnL: ${trade.pnl.toFixed(2)}`);
    });
    
    // Generate and save HTML report
    const html = createHtmlReport(result);
    const reportPath = path.join(__dirname, '../results/optimized_rsi7_report.html');
    
    // Create directory if it doesn't exist
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, html);
    console.log(`\nHTML report saved to: ${reportPath}`);
}

main().catch(error => {
    console.error("Error:", error);
});

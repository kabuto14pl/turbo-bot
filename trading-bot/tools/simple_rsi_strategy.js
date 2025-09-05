"use strict";
// simple_rsi_strategy.ts
// A simple RSI-based trading strategy for BTC data
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Simple RSI calculation function
function calcRSI(prices, period) {
    if (prices.length < period + 1)
        return null;
    let gains = 0;
    let losses = 0;
    // Calculate initial gains and losses
    for (let i = 1; i <= period; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff > 0) {
            gains += diff;
        }
        else {
            losses -= diff;
        }
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    // For the rest of the data (SMA/Wilder's smoothing)
    for (let i = period + 1; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff > 0) {
            avgGain = (avgGain * (period - 1) + diff) / period;
            avgLoss = (avgLoss * (period - 1)) / period;
        }
        else {
            avgLoss = (avgLoss * (period - 1) - diff) / period;
            avgGain = (avgGain * (period - 1)) / period;
        }
    }
    if (avgLoss === 0) {
        return 100; // Avoid division by zero
    }
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
}
// Function to load the first N candles from a file
function loadLimitedCandlesFromFile(filepath, limit = 5000) {
    console.log(`Loading data from: ${filepath} (limited to ${limit} candles)`);
    if (!fs.existsSync(filepath)) {
        console.error(`File ${filepath} does not exist!`);
        return [];
    }
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n');
    // Skip header
    const dataLines = lines.slice(1, limit + 1).filter(line => line.trim() !== '');
    const candles = [];
    for (const line of dataLines) {
        const parts = line.split(',');
        if (parts.length < 7)
            continue;
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
    // Sort candles from oldest to newest
    candles.sort((a, b) => a.time - b.time);
    console.log(`Successfully loaded ${candles.length} candles`);
    // Print a sample of the data to verify
    if (candles.length > 0) {
        console.log("\nSample candle data:");
        console.log(`First candle: ${new Date(candles[0].time).toISOString()}, Close: ${candles[0].close}`);
        console.log(`Last candle: ${new Date(candles[candles.length - 1].time).toISOString()}, Close: ${candles[candles.length - 1].close}`);
    }
    return candles;
}
// Function to backtest a simple RSI strategy
function backtestSimpleRSIStrategy(candles, rsiPeriod = 14, oversoldThreshold = 30, overboughtThreshold = 70, maxHoldBars = 20) {
    console.log(`\nBacktesting Simple RSI Strategy (RSI${rsiPeriod}, OS=${oversoldThreshold}, OB=${overboughtThreshold}, MaxBars=${maxHoldBars})`);
    const trades = [];
    let currentTrade = null;
    // Calculate all RSI values
    const closePrices = candles.map(c => c.close);
    const rsiValues = [];
    console.log("Calculating RSI values...");
    // Calculate RSI for each position in the array
    for (let i = 0; i < closePrices.length; i++) {
        if (i < rsiPeriod) {
            rsiValues.push(null); // Not enough data yet
        }
        else {
            const prices = closePrices.slice(i - rsiPeriod, i + 1);
            const rsi = calcRSI(prices, rsiPeriod);
            rsiValues.push(rsi);
        }
    }
    // Log some RSI values to verify
    console.log("\nSample RSI values:");
    for (let i = rsiPeriod; i < Math.min(rsiPeriod + 10, rsiValues.length); i++) {
        console.log(`${new Date(candles[i].time).toISOString()}: RSI = ${rsiValues[i]?.toFixed(2) || 'N/A'}`);
    }
    // Find trading signals
    console.log("\nFinding trading signals...");
    // EXTREMELY relaxed conditions to try to get ANY signals
    for (let i = rsiPeriod + 1; i < candles.length; i++) {
        const rsi = rsiValues[i];
        const prevRsi = rsiValues[i - 1];
        if (rsi === null || prevRsi === null)
            continue;
        // Only track one position at a time
        if (currentTrade === null) {
            // Extremely relaxed entry conditions (enter on ANY RSI below 40 or above 60)
            if (rsi <= 40) {
                // Go long on oversold
                currentTrade = {
                    entryTime: candles[i].time,
                    entryPrice: candles[i].close,
                    exitTime: null,
                    exitPrice: null,
                    direction: 'long',
                    profit: null,
                    profitPercent: null,
                    rsiAtEntry: rsi,
                    bars: 0
                };
                console.log(`LONG entry at ${new Date(candles[i].time).toISOString()}, Price: ${candles[i].close}, RSI: ${rsi.toFixed(2)}`);
            }
            else if (rsi >= 60) {
                // Go short on overbought
                currentTrade = {
                    entryTime: candles[i].time,
                    entryPrice: candles[i].close,
                    exitTime: null,
                    exitPrice: null,
                    direction: 'short',
                    profit: null,
                    profitPercent: null,
                    rsiAtEntry: rsi,
                    bars: 0
                };
                console.log(`SHORT entry at ${new Date(candles[i].time).toISOString()}, Price: ${candles[i].close}, RSI: ${rsi.toFixed(2)}`);
            }
        }
        else {
            // Increment bar count for current trade
            currentTrade.bars++;
            // Check for exit conditions (extremely relaxed)
            let shouldExit = false;
            let exitReason = "";
            if (currentTrade.direction === 'long') {
                // Exit long if RSI moves above 45 (profit) or below 30 (stop) or after max bars
                if (rsi >= 45) {
                    shouldExit = true;
                    exitReason = "RSI profit target";
                }
                else if (rsi <= 30) {
                    shouldExit = true;
                    exitReason = "RSI stop loss";
                }
                else if (currentTrade.bars >= maxHoldBars) {
                    shouldExit = true;
                    exitReason = "Max bars held";
                }
            }
            else { // short
                // Exit short if RSI moves below 55 (profit) or above 70 (stop) or after max bars
                if (rsi <= 55) {
                    shouldExit = true;
                    exitReason = "RSI profit target";
                }
                else if (rsi >= 70) {
                    shouldExit = true;
                    exitReason = "RSI stop loss";
                }
                else if (currentTrade.bars >= maxHoldBars) {
                    shouldExit = true;
                    exitReason = "Max bars held";
                }
            }
            if (shouldExit) {
                currentTrade.exitTime = candles[i].time;
                currentTrade.exitPrice = candles[i].close;
                // Calculate profit
                if (currentTrade.direction === 'long') {
                    currentTrade.profit = currentTrade.exitPrice - currentTrade.entryPrice;
                    currentTrade.profitPercent = (currentTrade.profit / currentTrade.entryPrice) * 100;
                }
                else {
                    currentTrade.profit = currentTrade.entryPrice - currentTrade.exitPrice;
                    currentTrade.profitPercent = (currentTrade.profit / currentTrade.entryPrice) * 100;
                }
                console.log(`${currentTrade.direction.toUpperCase()} exit at ${new Date(candles[i].time).toISOString()}, Price: ${candles[i].close}, RSI: ${rsi.toFixed(2)}, Reason: ${exitReason}, Profit: ${currentTrade.profit.toFixed(2)} (${currentTrade.profitPercent.toFixed(2)}%), Bars: ${currentTrade.bars}`);
                trades.push(currentTrade);
                currentTrade = null;
            }
        }
    }
    // If there's still an open trade at the end, close it
    if (currentTrade !== null) {
        const lastCandle = candles[candles.length - 1];
        currentTrade.exitTime = lastCandle.time;
        currentTrade.exitPrice = lastCandle.close;
        // Calculate profit
        if (currentTrade.direction === 'long') {
            currentTrade.profit = currentTrade.exitPrice - currentTrade.entryPrice;
            currentTrade.profitPercent = (currentTrade.profit / currentTrade.entryPrice) * 100;
        }
        else {
            currentTrade.profit = currentTrade.entryPrice - currentTrade.exitPrice;
            currentTrade.profitPercent = (currentTrade.profit / currentTrade.entryPrice) * 100;
        }
        console.log(`${currentTrade.direction.toUpperCase()} exit at end of data: ${new Date(lastCandle.time).toISOString()}, Price: ${lastCandle.close}, Profit: ${currentTrade.profit.toFixed(2)} (${currentTrade.profitPercent.toFixed(2)}%), Bars: ${currentTrade.bars}`);
        trades.push(currentTrade);
    }
    // Print performance summary
    console.log("\nPerformance Summary:");
    console.log(`Total trades: ${trades.length}`);
    if (trades.length > 0) {
        const totalProfit = trades.reduce((sum, trade) => sum + (trade.profit || 0), 0);
        const winningTrades = trades.filter(t => (t.profit || 0) > 0);
        const losingTrades = trades.filter(t => (t.profit || 0) <= 0);
        console.log(`Winning trades: ${winningTrades.length} (${((winningTrades.length / trades.length) * 100).toFixed(2)}%)`);
        console.log(`Losing trades: ${losingTrades.length} (${((losingTrades.length / trades.length) * 100).toFixed(2)}%)`);
        console.log(`Total profit: ${totalProfit.toFixed(2)}`);
        if (winningTrades.length > 0) {
            const avgWin = winningTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0) / winningTrades.length;
            console.log(`Average winning trade: ${avgWin.toFixed(2)}`);
        }
        if (losingTrades.length > 0) {
            const avgLoss = losingTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0) / losingTrades.length;
            console.log(`Average losing trade: ${avgLoss.toFixed(2)}`);
        }
    }
    return trades;
}
// Main function
async function main() {
    console.log("=== SIMPLE RSI STRATEGY TEST ===");
    // Use the full dataset but limit to 5000 candles to avoid memory issues
    const btcDataFile = path.join(__dirname, '../BTC_data.csv');
    const candles = loadLimitedCandlesFromFile(btcDataFile, 5000);
    if (candles.length === 0) {
        console.error("No data loaded. Exiting.");
        return;
    }
    console.log(`Loaded ${candles.length} candles from ${btcDataFile}`);
    console.log(`Data range: ${new Date(candles[0].time).toISOString()} to ${new Date(candles[candles.length - 1].time).toISOString()}`);
    // Test with extremely relaxed parameters to try to get ANY trades
    backtestSimpleRSIStrategy(candles, 7, 30, 70, 20);
    // Try even more extreme parameters
    backtestSimpleRSIStrategy(candles, 7, 40, 60, 10);
}
main().catch(error => {
    console.error("Error:", error);
});

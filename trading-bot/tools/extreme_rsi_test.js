"use strict";
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
// extreme_rsi_test.ts
// Script to test a very basic RSI strategy on Bitcoin data
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
const rsi_1 = require("../core/indicators/rsi");
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
        const [timestamp, open, high, low, close, volume] = line.split(',');
        if (!timestamp || !open || !high || !low || !close || !volume) {
            continue;
        }
        const candle = {
            time: parseInt(timestamp),
            open: parseFloat(open),
            high: parseFloat(high),
            low: parseFloat(low),
            close: parseFloat(close),
            volume: parseFloat(volume)
        };
        if (!isNaN(candle.time) && !isNaN(candle.open) && !isNaN(candle.high) &&
            !isNaN(candle.low) && !isNaN(candle.close) && !isNaN(candle.volume)) {
            candles.push(candle);
        }
    }
    // Sort candles from oldest to newest
    candles.sort((a, b) => a.time - b.time);
    return candles;
}
// Very simple RSI strategy with extreme values
function runExtremeRsiStrategy(candles) {
    console.log("Running Extreme RSI Strategy test...");
    const trades = [];
    const rsiPeriod = 14;
    // Calculate RSI values
    const rsiValues = [];
    for (let i = 0; i < candles.length; i++) {
        if (i >= rsiPeriod) {
            const closePrices = candles.slice(i - rsiPeriod, i + 1).map(c => c.close);
            const rsi = (0, rsi_1.calcRSI)(closePrices, rsiPeriod);
            rsiValues.push(rsi ?? 50);
        }
        else {
            rsiValues.push(50); // Placeholder
        }
    }
    // Strategy parameters
    const extremelyOversold = 20; // Extremely oversold level
    const extremelyOverbought = 80; // Extremely overbought level
    // Trading logic
    let inPosition = false;
    let positionDirection = null;
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
            }
            else if (rsi >= extremelyOverbought) {
                // Enter short on extremely overbought
                inPosition = true;
                positionDirection = 'short';
                entryPrice = nextCandle.open;
                entryTime = nextCandle.time;
                console.log(`${new Date(entryTime).toISOString()} - SHORT entry at ${entryPrice}, RSI: ${rsi.toFixed(2)}`);
            }
        }
        else {
            // Exit conditions
            if (positionDirection === 'long' && rsi >= 50) {
                // Exit long when RSI returns to neutral
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
            }
            else if (positionDirection === 'short' && rsi <= 50) {
                // Exit short when RSI returns to neutral
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
        }
        else if (positionDirection === 'short') {
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
// Main function
async function main() {
    console.log("=== EXTREME RSI STRATEGY TEST ===");
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
}
main().catch(error => {
    console.error("Error:", error);
});

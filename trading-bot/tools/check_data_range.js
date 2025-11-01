"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// check_data_range.ts
// Script to examine the date range and properties of data files
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
// Function to load candles from file
function loadCandlesFromFile(filepath) {
    console.log(`Loading data from: ${filepath}`);
    if (!fs.existsSync(filepath)) {
        console.error(`File ${filepath} does not exist!`);
        return [];
    }
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n');
    // Skip header
    const dataLines = lines.slice(1).filter(line => line.trim() !== '');
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
        candles.push(candle);
    }
    // Sort candles from oldest to newest
    candles.sort((a, b) => a.time - b.time);
    return candles;
}
// Function to analyze candles and print statistics
function analyzeCandles(candles, filename) {
    if (candles.length === 0) {
        console.log(`No data found in ${filename}`);
        return;
    }
    const firstCandle = candles[0];
    const lastCandle = candles[candles.length - 1];
    const startDate = new Date(firstCandle.time);
    const endDate = new Date(lastCandle.time);
    console.log(`\n=== Analysis for ${filename} ===`);
    console.log(`Total candles: ${candles.length}`);
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`Duration: ${Math.floor((lastCandle.time - firstCandle.time) / (1000 * 60 * 60 * 24))} days`);
    // Price range
    const allPrices = candles.flatMap(c => [c.open, c.high, c.low, c.close]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    console.log(`Price range: ${minPrice} to ${maxPrice} (${((maxPrice - minPrice) / minPrice * 100).toFixed(2)}% change)`);
    // Volatility (using ATR-like measure)
    let totalRanges = 0;
    for (const candle of candles) {
        totalRanges += candle.high - candle.low;
    }
    const avgRange = totalRanges / candles.length;
    const avgPrice = allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length;
    console.log(`Average candle range: ${avgRange.toFixed(2)} (${(avgRange / avgPrice * 100).toFixed(2)}% of avg price)`);
    // Check for extreme RSI periods
    // We'll just check for significant price moves that would create RSI extremes
    let significantDrops = 0;
    let significantRises = 0;
    for (let i = 1; i < candles.length; i++) {
        const prevClose = candles[i - 1].close;
        const currClose = candles[i].close;
        const percentChange = (currClose - prevClose) / prevClose * 100;
        if (percentChange < -3) {
            significantDrops++;
        }
        else if (percentChange > 3) {
            significantRises++;
        }
    }
    console.log(`Significant price drops (>3%): ${significantDrops} (${(significantDrops / candles.length * 100).toFixed(2)}% of candles)`);
    console.log(`Significant price rises (>3%): ${significantRises} (${(significantRises / candles.length * 100).toFixed(2)}% of candles)`);
    // Calculate some pseudo-RSI values to check for potential trading opportunities
    let rsiBelow30Count = 0;
    let rsiAbove70Count = 0;
    // Simple pseudo-RSI calculation
    const gains = [];
    const losses = [];
    const period = 14;
    for (let i = 1; i < candles.length; i++) {
        const change = candles[i].close - candles[i - 1].close;
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
        if (i >= period) {
            const avgGain = gains.slice(i - period, i).reduce((sum, val) => sum + val, 0) / period;
            const avgLoss = losses.slice(i - period, i).reduce((sum, val) => sum + val, 0) / period;
            if (avgLoss === 0)
                continue;
            const rs = avgGain / avgLoss;
            const rsi = 100 - (100 / (1 + rs));
            if (rsi < 30)
                rsiBelow30Count++;
            if (rsi > 70)
                rsiAbove70Count++;
        }
    }
    console.log(`Estimated RSI below 30 count: ${rsiBelow30Count} (${(rsiBelow30Count / (candles.length - period) * 100).toFixed(2)}% of periods)`);
    console.log(`Estimated RSI above 70 count: ${rsiAbove70Count} (${(rsiAbove70Count / (candles.length - period) * 100).toFixed(2)}% of periods)`);
}
// Main function
async function main() {
    console.log("=== DATA ANALYSIS TOOL ===");
    const dataDir = path.join(__dirname, '../data/BTCUSDT');
    const rootDir = path.join(__dirname, '..');
    // Check files in BTCUSDT directory
    if (fs.existsSync(dataDir)) {
        const files = fs.readdirSync(dataDir);
        for (const file of files) {
            if (file.endsWith('.csv')) {
                const candles = loadCandlesFromFile(path.join(dataDir, file));
                analyzeCandles(candles, file);
            }
        }
    }
    else {
        console.log(`Directory ${dataDir} does not exist.`);
    }
    // Check files in root directory
    const rootFiles = fs.readdirSync(rootDir);
    for (const file of rootFiles) {
        if (file.startsWith('BTC_data') && file.endsWith('.csv')) {
            const candles = loadCandlesFromFile(path.join(rootDir, file));
            analyzeCandles(candles, file);
        }
    }
}
main().catch(error => {
    console.error("Error:", error);
});

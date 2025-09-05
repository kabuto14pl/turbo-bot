// rsi_diagnostic_fixed.ts
// Script to examine RSI values in the Bitcoin data - FIXED VERSION

import * as fs from 'fs';
import * as path from 'path';

interface OHLCVWithTimestamp {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// Simple RSI calculation function
function calcRSI(prices: number[], period: number): number | null {
    if (prices.length < period + 1) return null;

    let gains = 0;
    let losses = 0;

    // Calculate initial gains and losses
    for (let i = 1; i <= period; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff > 0) {
            gains += diff;
        } else {
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
        } else {
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
    
    // Sort candles from oldest to newest
    candles.sort((a, b) => a.time - b.time);
    
    console.log(`Successfully loaded ${candles.length} candles`);
    
    // Print a sample of the data to verify
    if (candles.length > 0) {
        console.log("\nSample candle data:");
        console.log(`First candle: ${new Date(candles[0].time).toISOString()}, Close: ${candles[0].close}`);
        console.log(`Last candle: ${new Date(candles[candles.length-1].time).toISOString()}, Close: ${candles[candles.length-1].close}`);
        
        // Show a few prices in sequence to check for continuity
        console.log("\nPrice sequence (first 10 close prices):");
        for (let i = 0; i < Math.min(10, candles.length); i++) {
            console.log(`${new Date(candles[i].time).toISOString()}: ${candles[i].close}`);
        }
    }
    
    return candles;
}

// Function to analyze RSI values
function analyzeRSI(candles: OHLCVWithTimestamp[]) {
    console.log("\nAnalyzing RSI values...");
    
    const rsiPeriods = [7, 14];
    
    for (const period of rsiPeriods) {
        console.log(`\n=== RSI(${period}) Analysis ===`);
        
        // Extract close prices
        const closePrices = candles.map(c => c.close);
        
        // Calculate RSI values
        const rsiValues: number[] = [];
        
        for (let i = period; i < closePrices.length; i++) {
            const prices = closePrices.slice(i - period, i + 1);
            const rsi = calcRSI(prices, period);
            rsiValues.push(rsi ?? NaN);
        }
        
        // Filter out NaN values for statistics
        const validRSIs = rsiValues.filter(val => !isNaN(val));
        
        if (validRSIs.length === 0) {
            console.log("No valid RSI values calculated!");
            continue;
        }
        
        // Basic statistics
        const min = Math.min(...validRSIs);
        const max = Math.max(...validRSIs);
        const avg = validRSIs.reduce((sum, val) => sum + val, 0) / validRSIs.length;
        
        console.log(`Min RSI: ${min.toFixed(2)}`);
        console.log(`Max RSI: ${max.toFixed(2)}`);
        console.log(`Average RSI: ${avg.toFixed(2)}`);
        
        // Count occurrences in different ranges
        const ranges = [
            { min: 0, max: 20 },
            { min: 20, max: 30 },
            { min: 30, max: 40 },
            { min: 40, max: 50 },
            { min: 50, max: 60 },
            { min: 60, max: 70 },
            { min: 70, max: 80 },
            { min: 80, max: 100 }
        ];
        
        for (const range of ranges) {
            const count = validRSIs.filter(rsi => rsi >= range.min && rsi < range.max).length;
            const percentage = (count / validRSIs.length) * 100;
            console.log(`RSI ${range.min}-${range.max}: ${count} (${percentage.toFixed(2)}%)`);
        }
        
        // Find occurrences of RSI crossing the 30/70 thresholds
        let oversoldCrossings = 0;
        let overboughtCrossings = 0;
        
        for (let i = 1; i < validRSIs.length; i++) {
            if (validRSIs[i-1] > 30 && validRSIs[i] <= 30) {
                oversoldCrossings++;
            }
            if (validRSIs[i-1] < 70 && validRSIs[i] >= 70) {
                overboughtCrossings++;
            }
        }
        
        console.log(`\nRSI crossing below 30: ${oversoldCrossings} times`);
        console.log(`RSI crossing above 70: ${overboughtCrossings} times`);
        
        // Print some actual RSI values at regular intervals
        console.log("\nSample RSI values:");
        const step = Math.max(1, Math.floor(validRSIs.length / 10));
        for (let i = 0; i < validRSIs.length; i += step) {
            if (i < validRSIs.length) {
                const candle = candles[i + period]; // Adjust index to match the candle
                const date = new Date(candle.time);
                console.log(`${date.toISOString()}: RSI = ${validRSIs[i].toFixed(2)}`);
            }
        }
    }
}

// Main function
async function main() {
    console.log("=== RSI DIAGNOSTIC TOOL (FIXED) ===");
    
    // Use the full dataset but limit to 5000 candles to avoid memory issues
    const btcDataFile = path.join(__dirname, '../BTC_data.csv');
    const candles = loadLimitedCandlesFromFile(btcDataFile, 5000);
    
    if (candles.length === 0) {
        console.error("No data loaded. Exiting.");
        return;
    }
    
    console.log(`Loaded ${candles.length} candles from ${btcDataFile}`);
    console.log(`Data range: ${new Date(candles[0].time).toISOString()} to ${new Date(candles[candles.length - 1].time).toISOString()}`);
    
    // Analyze RSI values
    analyzeRSI(candles);
}

main().catch(error => {
    console.error("Error:", error);
});

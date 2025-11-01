/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// rsi_diagnostic.ts
// Script to examine RSI values in the Bitcoin data

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

// Function to analyze RSI values
function analyzeRSI(candles: OHLCVWithTimestamp[]) {
    console.log("Analyzing RSI values...");
    
    const rsiPeriods = [7, 14];
    
    for (const period of rsiPeriods) {
        console.log(`\n=== RSI(${period}) Analysis ===`);
        
        // Calculate RSI values
        const rsiValues: number[] = [];
        
        for (let i = 0; i < candles.length; i++) {
            if (i >= period) {
                const closePrices = candles.slice(i - period, i + 1).map(c => c.close);
                const rsi = calcRSI(closePrices, period) ?? 50;
                rsiValues.push(rsi);
            } else {
                rsiValues.push(50); // Placeholder
            }
        }
        
        // Basic statistics
        const min = Math.min(...rsiValues.slice(period));
        const max = Math.max(...rsiValues.slice(period));
        const avg = rsiValues.slice(period).reduce((sum, val) => sum + val, 0) / (rsiValues.length - period);
        
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
            const count = rsiValues.filter(rsi => rsi >= range.min && rsi < range.max).length;
            const percentage = (count / rsiValues.length) * 100;
            console.log(`RSI ${range.min}-${range.max}: ${count} (${percentage.toFixed(2)}%)`);
        }
        
        // Find occurrences of RSI crossing the 30/70 thresholds
        let oversoldCrossings = 0;
        let overboughtCrossings = 0;
        
        for (let i = period + 1; i < rsiValues.length; i++) {
            if (rsiValues[i-1] > 30 && rsiValues[i] <= 30) {
                oversoldCrossings++;
            }
            if (rsiValues[i-1] < 70 && rsiValues[i] >= 70) {
                overboughtCrossings++;
            }
        }
        
        console.log(`\nRSI crossing below 30: ${oversoldCrossings} times`);
        console.log(`RSI crossing above 70: ${overboughtCrossings} times`);
        
        // Print some actual RSI values at regular intervals
        console.log("\nSample RSI values:");
        for (let i = period; i < rsiValues.length; i += 500) {
            if (i < rsiValues.length) {
                const date = new Date(candles[i].time);
                console.log(`${date.toISOString()}: RSI = ${rsiValues[i].toFixed(2)}`);
            }
        }
    }
}

// Main function
async function main() {
    console.log("=== RSI DIAGNOSTIC TOOL ===");
    
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

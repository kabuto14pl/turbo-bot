/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const timeframes = ['15m', '1h', '4h', '1d'];

async function checkNaNInFile(filePath: string): Promise<{ hasNaN: boolean, nanCount: number, totalRows: number }> {
    return new Promise((resolve, reject) => {
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let lineCount = 0;
        let nanCount = 0;
        let firstLine = true;
        let nanLines: number[] = [];

        rl.on('line', (line) => {
            if (firstLine) {
                firstLine = false;
                return; // Skip header
            }
            
            lineCount++;
            const values = line.split(',');
            
            // Check each column for NaN or empty values
            for (let i = 0; i < values.length; i++) {
                const value = values[i].trim();
                if (value === 'NaN' || value === '' || value === 'undefined' || isNaN(Number(value))) {
                    nanCount++;
                    nanLines.push(lineCount);
                    break; // Only count a row once even if it has multiple NaN values
                }
            }
        });

        rl.on('close', () => {
            console.log(`Checked ${lineCount} rows in ${path.basename(filePath)}`);
            if (nanLines.length > 0) {
                console.log(`Found ${nanLines.length} rows with NaN values.`);
                if (nanLines.length <= 10) {
                    console.log(`NaN values found in rows: ${nanLines.join(', ')}`);
                } else {
                    console.log(`First 10 rows with NaN values: ${nanLines.slice(0, 10).join(', ')}...`);
                }
            }
            
            resolve({
                hasNaN: nanCount > 0,
                nanCount: nanCount,
                totalRows: lineCount
            });
        });

        fileStream.on('error', (error) => {
            reject(error);
        });
    });
}

async function main() {
    console.log('Checking for NaN values in timeframe CSV files...');
    
    for (const timeframe of timeframes) {
        const filePath = path.resolve(__dirname, `../BTC_data_${timeframe}_clean.csv`);
        
        if (fs.existsSync(filePath)) {
            console.log(`\nAnalyzing ${timeframe} timeframe file:`);
            try {
                const result = await checkNaNInFile(filePath);
                if (result.hasNaN) {
                    console.log(`❌ File contains ${result.nanCount} NaN values out of ${result.totalRows} rows.`);
                } else {
                    console.log(`✅ No NaN values found in ${result.totalRows} rows.`);
                }
            } catch (error) {
                console.error(`Error checking file ${filePath}:`, error);
            }
        } else {
            console.log(`⚠️ File not found: ${filePath}`);
        }
    }
}

main().catch(console.error);

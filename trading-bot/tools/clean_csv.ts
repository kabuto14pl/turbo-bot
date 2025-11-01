/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
import * as fs from 'fs';
import * as csv from 'csv-parse/sync';
import * as stringify from 'csv-stringify/sync';

// Ścieżki plików
const inputPath = 'trading-bot/BTC_data.csv';
const outputPath = 'trading-bot/BTC_data_clean.csv';

// Wczytaj plik CSV
const fileContent = fs.readFileSync(inputPath, 'utf-8');
const records = csv.parse(fileContent, { columns: true, skip_empty_lines: true });

// Przetwórz dane: wybierz i przemapuj kolumny
const cleaned = records.map((row: any) => ({
    Unix: Math.floor(Number(row['Unix']) / 1000),
    open: row['Open'],
    high: row['High'],
    low: row['Low'],
    close: row['Close'],
    volume: row['Volume USDT'],
}));

// Zapisz do nowego pliku CSV
const output = stringify.stringify(cleaned, { header: true, columns: ['Unix', 'open', 'high', 'low', 'close', 'volume'] });
fs.writeFileSync(outputPath, output, 'utf-8');

console.log(`Zapisano ${cleaned.length} wierszy do ${outputPath}`); 
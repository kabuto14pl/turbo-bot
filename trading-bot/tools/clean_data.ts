import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';

// Ścieżka do pliku źródłowego
const inputFile = path.resolve(__dirname, '../BTC_data.csv');
// Ścieżka do pliku wyjściowego
const outputFile = path.resolve(__dirname, '../BTC_data_clean.csv');

interface RawData {
    Unix: string;
    Date: string;
    Symbol: string;
    Open: string;
    High: string;
    Low: string;
    Close: string;
    'Volume BTC': string;
    'Volume USDT': string;
    tradecount: string;
}

interface CleanData {
    timestamp: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
}

const cleanData: CleanData[] = [];

console.log('Rozpoczynam czyszczenie danych...');

fs.createReadStream(inputFile)
    .pipe(csvParser())
    .on('data', (data: RawData) => {
        // Sprawdź czy wartości są liczbami
        const open = parseFloat(data.Open);
        const high = parseFloat(data.High);
        const low = parseFloat(data.Low);
        const close = parseFloat(data.Close);
        const volume = parseFloat(data['Volume USDT']);

        // Sprawdź czy któraś z wartości jest NaN
        if (!isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close) && !isNaN(volume)) {
            cleanData.push({
                timestamp: data.Unix,
                open: open.toString(),
                high: high.toString(),
                low: low.toString(),
                close: close.toString(),
                volume: volume.toString()
            });
        }
    })
    .on('end', () => {
        // Zapisz oczyszczone dane do nowego pliku CSV
        const csvWriter = createObjectCsvWriter({
            path: outputFile,
            header: [
                { id: 'timestamp', title: 'timestamp' },
                { id: 'open', title: 'open' },
                { id: 'high', title: 'high' },
                { id: 'low', title: 'low' },
                { id: 'close', title: 'close' },
                { id: 'volume', title: 'volume' }
            ]
        });

        csvWriter.writeRecords(cleanData)
            .then(() => {
                console.log(`Zapisano ${cleanData.length} wierszy do pliku ${outputFile}`);
                console.log('Czyszczenie danych zakończone pomyślnie!');
            });
    });

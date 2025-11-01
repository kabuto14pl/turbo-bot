/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// UWAGA: Brak obsługi ETHUSDT/SOLUSDT – agregacja dotyczy tylko symboli, dla których są dostępne dane (np. BTCUSDT).
import * as fs from 'fs';
import * as csv from 'csv-parse/sync';
import * as stringify from 'csv-stringify/sync';

export interface Candle {
  Unix?: number; // sekundy od epoch, opcjonalnie dla agregacji
  time: number; // ms od epoch
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function aggregateCandles(candles: Candle[], intervalMinutes: number): Candle[] {
  const result: Candle[] = [];
  let bucket: Candle[] = [];
  for (const candle of candles) {
    if (bucket.length === 0) {
      bucket.push(candle);
      continue;
    }
    const bucketStart = Math.floor(bucket[0].time / 60000 / intervalMinutes);
    const candleStart = Math.floor(candle.time / 60000 / intervalMinutes);
    if (bucketStart === candleStart) {
      bucket.push(candle);
    } else {
      result.push({
        Unix: Math.floor(bucket[0].time / 1000), // sekundy od epoch
        time: bucket[0].time,
        open: bucket[0].open,
        high: Math.max(...bucket.map(c => c.high)),
        low: Math.min(...bucket.map(c => c.low)),
        close: bucket[bucket.length - 1].close,
        volume: bucket.reduce((sum, c) => sum + c.volume, 0),
      });
      bucket = [candle];
    }
  }
  if (bucket.length > 0) {
    result.push({
      Unix: Math.floor(bucket[0].time / 1000),
      time: bucket[0].time,
      open: bucket[0].open,
      high: Math.max(...bucket.map(c => c.high)),
      low: Math.min(...bucket.map(c => c.low)),
      close: bucket[bucket.length - 1].close,
      volume: bucket.reduce((sum, c) => sum + c.volume, 0),
    });
  }
  return result;
}

function main() {
  const inputPath = process.argv[2];
  const interval = Number(process.argv[3]); // np. 15, 60, 240, 1440
  const outputPath = process.argv[4];
  if (!inputPath || !interval || !outputPath) {
    console.error('Użycie: ts-node tools/aggregate_csv.ts <input.csv> <interwał_minuty> <output.csv>');
    process.exit(1);
  }
  const fileContent = fs.readFileSync(inputPath, 'utf-8');
  const records = csv.parse(fileContent, { columns: true, skip_empty_lines: true });
  const candles: Candle[] = records.map((row: any) => {
    // Użyj 'Unix' jako głównego źródła czasu, jeśli istnieje.
    // Zapewnia kompatybilność z różnymi formatami danych wejściowych.
    const timestampSeconds = row.Unix ? parseInt(row.Unix, 10) : Math.floor(parseInt(row.time, 10) / 1000);
    if (isNaN(timestampSeconds)) {
        // Pomiń wiersze, w których nie można ustalić prawidłowego czasu
        console.warn(`Pominięto wiersz z nieprawidłowym znacznikiem czasu:`, row);
        return null;
    }
    return {
      time: timestampSeconds * 1000, // Konwertuj na milisekundy dla logiki wewnętrznej
      open: parseFloat(row.open),
      high: parseFloat(row.high),
      low: parseFloat(row.low),
      close: parseFloat(row.close),
      volume: parseFloat(row.volume),
    };
  }).filter((c: Candle | null): c is Candle => c !== null); // Odfiltruj nieprawidłowe wiersze

  const aggregated = aggregateCandles(candles, interval);

  // Przygotuj dane do zapisu, zmieniając nazwę 'time' na 'timestamp'
  const outputData = aggregated.map(c => ({
    timestamp: Math.floor(c.time / 1000), // Zapisz jako sekundy
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume
  }));

  // Zapisz do CSV z poprawnymi nagłówkami
  const output = stringify.stringify(outputData, { header: true, columns: ['timestamp', 'open', 'high', 'low', 'close', 'volume'] });
  fs.writeFileSync(outputPath, output, 'utf-8');
  console.log(`Zapisano ${aggregated.length} świec do ${outputPath}`);
}

if (require.main === module) {
  main();
}

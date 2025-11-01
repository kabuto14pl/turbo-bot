"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const csv_parser_1 = __importDefault(require("csv-parser"));
// Funkcja do agregacji świec do wyższych timeframe'ów
function aggregateCandles(candles, interval) {
    const aggregatedCandles = [];
    // Upewnij się, że świece są posortowane według czasu
    candles.sort((a, b) => a.time - b.time);
    // Dla każdej świecy sprawdź, czy zaczyna nowy agregowany przedział
    let currentGroup = [];
    if (candles.length === 0) {
        console.log("Brak świec do zagregowania!");
        return [];
    }
    let startTime = Math.floor(candles[0].time / (interval * 60 * 1000)) * (interval * 60 * 1000);
    for (const candle of candles) {
        const candleIntervalStart = Math.floor(candle.time / (interval * 60 * 1000)) * (interval * 60 * 1000);
        // Jeśli świeca należy do nowego przedziału, stwórz nową zagregowaną świecę
        if (candleIntervalStart > startTime) {
            if (currentGroup.length > 0) {
                // Stwórz zagregowaną świecę z aktualnej grupy
                const aggregated = createAggregatedCandle(currentGroup, startTime);
                aggregatedCandles.push(aggregated);
            }
            // Zresetuj grupę i czas startu
            currentGroup = [candle];
            startTime = candleIntervalStart;
        }
        else {
            // Dodaj świecę do bieżącej grupy
            currentGroup.push(candle);
        }
    }
    // Dodaj ostatnią grupę, jeśli istnieje
    if (currentGroup.length > 0) {
        const aggregated = createAggregatedCandle(currentGroup, startTime);
        aggregatedCandles.push(aggregated);
    }
    return aggregatedCandles;
}
// Funkcja tworząca zagregowaną świecę z grupy świec
function createAggregatedCandle(candles, startTime) {
    const open = candles[0].open;
    const close = candles[candles.length - 1].close;
    const high = Math.max(...candles.map(c => c.high));
    const low = Math.min(...candles.map(c => c.low));
    const volume = candles.reduce((sum, c) => sum + c.volume, 0);
    return {
        time: startTime,
        open,
        high,
        low,
        close,
        volume
    };
}
// Funkcja ładująca dane z CSV
async function loadCandlesFromCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe((0, csv_parser_1.default)())
            .on('data', (data) => {
            // Konwertuj dane do odpowiedniego formatu
            const candle = {
                time: parseInt(data.Unix),
                open: parseFloat(data.Open),
                high: parseFloat(data.High),
                low: parseFloat(data.Low),
                close: parseFloat(data.Close),
                volume: parseFloat(data['Volume USDT'])
            };
            // Sprawdź czy wszystkie wartości są poprawne
            if (!isNaN(candle.time) &&
                !isNaN(candle.open) &&
                !isNaN(candle.high) &&
                !isNaN(candle.low) &&
                !isNaN(candle.close) &&
                !isNaN(candle.volume)) {
                results.push(candle);
            }
        })
            .on('end', () => {
            console.log(`Załadowano ${results.length} ważnych świec z pliku.`);
            resolve(results);
        })
            .on('error', (error) => {
            reject(error);
        });
    });
}
// Funkcja zapisująca świece do CSV
async function saveCandlesToCSV(candles, filePath) {
    const header = 'time,open,high,low,close,volume\n';
    const rows = candles.map(candle => `${candle.time},${candle.open},${candle.high},${candle.low},${candle.close},${candle.volume}`).join('\n');
    fs.writeFileSync(filePath, header + rows);
    console.log(`Zapisano ${candles.length} świec do pliku ${filePath}`);
}
// Główna funkcja
async function main() {
    try {
        console.log('=== AGREGACJA DANYCH DO RÓŻNYCH INTERWAŁÓW ===');
        // Ścieżka do pliku źródłowego
        const sourceFilePath = path.resolve(__dirname, '../BTC_data.csv');
        // Ładowanie danych źródłowych
        console.log(`Ładowanie danych z pliku ${sourceFilePath}...`);
        const sourceCandles = await loadCandlesFromCSV(sourceFilePath);
        console.log(`Załadowano ${sourceCandles.length} poprawnych świec.`);
        // Definiujemy interwały do agregacji (w minutach)
        const intervals = [
            { name: '15m', minutes: 15 },
            { name: '1h', minutes: 60 },
            { name: '4h', minutes: 240 },
            { name: '1d', minutes: 1440 }
        ];
        // Agregacja i zapisywanie dla każdego interwału
        for (const interval of intervals) {
            console.log(`\nAgregacja do interwału ${interval.name}...`);
            const aggregatedCandles = aggregateCandles(sourceCandles, interval.minutes);
            console.log(`Wygenerowano ${aggregatedCandles.length} świec dla interwału ${interval.name}.`);
            const outputFilePath = path.resolve(__dirname, `../BTC_data_${interval.name}_clean.csv`);
            await saveCandlesToCSV(aggregatedCandles, outputFilePath);
        }
        console.log('\n=== AGREGACJA ZAKOŃCZONA SUKCESEM ===');
    }
    catch (error) {
        console.error('Wystąpił błąd podczas agregacji danych:', error);
    }
}
// Uruchomienie głównej funkcji
main().catch(console.error);

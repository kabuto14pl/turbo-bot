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
const csv_writer_1 = require("csv-writer");
// Ścieżka do pliku źródłowego
const inputFile = path.resolve(__dirname, '../BTC_data.csv');
// Ścieżka do pliku wyjściowego
const outputFile = path.resolve(__dirname, '../BTC_data_clean.csv');
const cleanData = [];
console.log('Rozpoczynam czyszczenie danych...');
fs.createReadStream(inputFile)
    .pipe((0, csv_parser_1.default)())
    .on('data', (data) => {
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
    const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
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

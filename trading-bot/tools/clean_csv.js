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
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
const fs = __importStar(require("fs"));
const csv = __importStar(require("csv-parse/sync"));
const stringify = __importStar(require("csv-stringify/sync"));
// Ścieżki plików
const inputPath = 'trading-bot/BTC_data.csv';
const outputPath = 'trading-bot/BTC_data_clean.csv';
// Wczytaj plik CSV
const fileContent = fs.readFileSync(inputPath, 'utf-8');
const records = csv.parse(fileContent, { columns: true, skip_empty_lines: true });
// Przetwórz dane: wybierz i przemapuj kolumny
const cleaned = records.map((row) => ({
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

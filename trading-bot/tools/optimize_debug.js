"use strict";
// ============================================================================
//  optimize_debug.ts - DEBUG VERSION OF OPTIMIZATION SCRIPT
//  Testowa wersja skryptu do śledzenia wykonania
// ============================================================================
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
console.log('POCZĄTEK SKRYPTU - REJESTRUJĘ WSZYSTKIE ETAPY DZIAŁANIA');
// Dodatkowa funkcja do śledzenia działania
function logDebug(message) {
    const timestamp = new Date().toISOString();
    console.log(`[DEBUG ${timestamp}] ${message}`);
}
logDebug('Skrypt startuje - importowanie modułów...');
// Faktyczny kod skryptu zaczyna się tutaj
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
logDebug('Moduły zaimportowane pomyślnie');
// Główna funkcja
async function runDebugTest() {
    logDebug('Funkcja runDebugTest uruchomiona');
    try {
        // Testowe operacje
        logDebug('Sprawdzanie dostępu do katalogów');
        const baseDir = path.resolve(__dirname, '..');
        logDebug(`Katalog bazowy: ${baseDir}`);
        const resultsDir = path.resolve(baseDir, 'results', `debug_test_${Date.now()}`);
        logDebug(`Tworzenie katalogu: ${resultsDir}`);
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
            logDebug('Katalog utworzony pomyślnie');
        }
        // Zapisz plik testowy
        const testFilePath = path.join(resultsDir, 'debug_output.txt');
        logDebug(`Zapisywanie pliku testowego: ${testFilePath}`);
        fs.writeFileSync(testFilePath, `Test zapisu pliku: ${new Date().toISOString()}\n`);
        logDebug('Plik zapisany pomyślnie');
        // Symulacja dłuższego procesu
        for (let i = 1; i <= 5; i++) {
            logDebug(`Iteracja testowa ${i} z 5`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Symulacja operacji
        }
        logDebug('Wszystkie operacje zakończone powodzeniem');
        return 'Test zakończony sukcesem';
    }
    catch (error) {
        logDebug(`BŁĄD: ${error}`);
        console.error('Wystąpił błąd:', error);
        throw error;
    }
}
// Uruchom test i obsłuż wynik
logDebug('Uruchamianie funkcji testowej...');
runDebugTest()
    .then(result => {
    logDebug(`Wynik testu: ${result}`);
    console.log('Test zakończony powodzeniem:', result);
})
    .catch(error => {
    logDebug(`Test zakończony błędem: ${error}`);
    console.error('Test zakończony błędem:', error);
})
    .finally(() => {
    logDebug('KONIEC SKRYPTU');
    console.log('KONIEC SKRYPTU TESTOWEGO');
});
logDebug('Inicjalizacja skryptu zakończona - oczekiwanie na wyniki...');

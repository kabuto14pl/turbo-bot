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
const path = __importStar(require("path"));
// Ścieżka do folderu z wynikami
const resultsDir = path.join(__dirname, '../results/rsi_optimal_test_1753628933052');
// Wczytanie danych
const csvFile = path.join(resultsDir, 'rsi_optimal_results.csv');
const csvData = fs.readFileSync(csvFile, 'utf-8');
const lines = csvData.split('\n').filter(line => line.trim());
const headers = lines[0].split(',');
const data = lines.slice(1).map(line => {
    const values = line.split(',');
    const result = {};
    headers.forEach((header, index) => {
        result[header] = isNaN(Number(values[index])) ? values[index] : Number(values[index]);
    });
    return result;
});
// Wczytanie transakcji dla najlepszej konfiguracji
const tradesFile = path.join(resultsDir, 'best_trades.json');
const trades = JSON.parse(fs.readFileSync(tradesFile, 'utf-8'));
// Wyliczenie statystyk
function calculateStats(trades) {
    const pnls = trades.map(t => t.pnl);
    const totalPnl = pnls.reduce((sum, pnl) => sum + pnl, 0);
    const avgPnl = totalPnl / trades.length;
    const winTrades = trades.filter(t => t.pnl > 0);
    const lossTrades = trades.filter(t => t.pnl < 0);
    const winRate = winTrades.length / trades.length;
    const avgWin = winTrades.length > 0
        ? winTrades.reduce((sum, t) => sum + t.pnl, 0) / winTrades.length
        : 0;
    const avgLoss = lossTrades.length > 0
        ? lossTrades.reduce((sum, t) => sum + t.pnl, 0) / lossTrades.length
        : 0;
    const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;
    return {
        totalTrades: trades.length,
        winTrades: winTrades.length,
        lossTrades: lossTrades.length,
        winRate: winRate * 100,
        avgWin,
        avgLoss,
        profitFactor,
        totalPnl,
        avgPnl
    };
}
// Obliczenie statystyk dla najlepszej konfiguracji
const bestConfig = data[0];
const stats = calculateStats(trades);
// Generowanie raportu
console.log('=== RAPORT SZCZEGÓŁOWY DLA NAJLEPSZEJ KONFIGURACJI ===');
console.log(`Parametry: RSI(${bestConfig.rsiPeriod}) Oversold(${bestConfig.oversold}) Overbought(${bestConfig.overbought}) ADX(${bestConfig.adxThreshold})`);
console.log(`\nWYNIKI FINANSOWE:`);
console.log(`Total PnL: ${stats.totalPnl.toFixed(2)} USD`);
console.log(`Średni zysk na transakcję: ${stats.avgPnl.toFixed(2)} USD`);
console.log(`Sharpe Ratio: ${bestConfig.sharpeRatio.toFixed(4)}`);
console.log(`\nSTATYSTYKI TRANSAKCJI:`);
console.log(`Liczba transakcji: ${stats.totalTrades}`);
console.log(`Udane transakcje: ${stats.winTrades} (${stats.winRate.toFixed(2)}%)`);
console.log(`Nieudane transakcje: ${stats.lossTrades} (${(100 - stats.winRate).toFixed(2)}%)`);
console.log(`Średni zysk na udanej transakcji: ${stats.avgWin.toFixed(2)} USD`);
console.log(`Średnia strata na nieudanej transakcji: ${stats.avgLoss.toFixed(2)} USD`);
console.log(`Współczynnik zysku (Profit Factor): ${stats.profitFactor.toFixed(2)}`);
// Generowanie analizy dystrybucji zysków
const pnlValues = trades.map((t) => t.pnl);
const pnlGroups = {
    '< -1000': pnlValues.filter((p) => p <= -1000).length,
    '-1000 to -500': pnlValues.filter((p) => p > -1000 && p <= -500).length,
    '-500 to 0': pnlValues.filter((p) => p > -500 && p <= 0).length,
    '0 to 500': pnlValues.filter((p) => p > 0 && p <= 500).length,
    '500 to 1000': pnlValues.filter((p) => p > 500 && p <= 1000).length,
    '> 1000': pnlValues.filter((p) => p > 1000).length
};
console.log(`\nDYSTRYBUCJA ZYSKÓW/STRAT:`);
Object.entries(pnlGroups).forEach(([range, count]) => {
    const percent = (count / trades.length * 100).toFixed(2);
    console.log(`${range}: ${count} transakcji (${percent}%)`);
});
// Porównanie wszystkich konfiguracji
console.log(`\nPORÓWNANIE WSZYSTKICH TESTOWANYCH KONFIGURACJI:`);
console.log('| RSI | Oversold | Overbought | ADX | PnL | Trades | WinRate | Sharpe |');
console.log('|-----|----------|------------|-----|-----|--------|---------|--------|');
data.forEach(cfg => {
    console.log(`| ${cfg.rsiPeriod} | ${cfg.oversold} | ${cfg.overbought} | ${cfg.adxThreshold} | ${cfg.totalPnl.toFixed(2)} | ${cfg.tradeCount} | ${(cfg.winRate * 100).toFixed(2)}% | ${cfg.sharpeRatio.toFixed(4)} |`);
});
// Zapisanie raportu do pliku
const reportContent = [
    '=== RAPORT SZCZEGÓŁOWY DLA NAJLEPSZEJ KONFIGURACJI ===',
    `Parametry: RSI(${bestConfig.rsiPeriod}) Oversold(${bestConfig.oversold}) Overbought(${bestConfig.overbought}) ADX(${bestConfig.adxThreshold})`,
    `\nWYNIKI FINANSOWE:`,
    `Total PnL: ${stats.totalPnl.toFixed(2)} USD`,
    `Średni zysk na transakcję: ${stats.avgPnl.toFixed(2)} USD`,
    `Sharpe Ratio: ${bestConfig.sharpeRatio.toFixed(4)}`,
    `\nSTATYSTYKI TRANSAKCJI:`,
    `Liczba transakcji: ${stats.totalTrades}`,
    `Udane transakcje: ${stats.winTrades} (${stats.winRate.toFixed(2)}%)`,
    `Nieudane transakcje: ${stats.lossTrades} (${(100 - stats.winRate).toFixed(2)}%)`,
    `Średni zysk na udanej transakcji: ${stats.avgWin.toFixed(2)} USD`,
    `Średnia strata na nieudanej transakcji: ${stats.avgLoss.toFixed(2)} USD`,
    `Współczynnik zysku (Profit Factor): ${stats.profitFactor.toFixed(2)}`,
    `\nDYSTRYBUCJA ZYSKÓW/STRAT:`,
    ...Object.entries(pnlGroups).map(([range, count]) => {
        const percent = (count / trades.length * 100).toFixed(2);
        return `${range}: ${count} transakcji (${percent}%)`;
    }),
    `\nPORÓWNANIE WSZYSTKICH TESTOWANYCH KONFIGURACJI:`,
    '| RSI | Oversold | Overbought | ADX | PnL | Trades | WinRate | Sharpe |',
    '|-----|----------|------------|-----|-----|--------|---------|--------|',
    ...data.map(cfg => `| ${cfg.rsiPeriod} | ${cfg.oversold} | ${cfg.overbought} | ${cfg.adxThreshold} | ${cfg.totalPnl.toFixed(2)} | ${cfg.tradeCount} | ${(cfg.winRate * 100).toFixed(2)}% | ${cfg.sharpeRatio.toFixed(4)} |`)
].join('\n');
fs.writeFileSync(path.join(resultsDir, 'detailed_report.md'), reportContent);
console.log(`\nRaport został zapisany do pliku: ${path.join(resultsDir, 'detailed_report.md')}`);

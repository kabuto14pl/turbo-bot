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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const csv_writer_1 = require("csv-writer");
const resultsDir = path.resolve(__dirname, '../results/optimal_strategies_1753629637384');
const summaryPath = path.join(resultsDir, 'strategy_summary.json');
let summary = [];
if (fs.existsSync(summaryPath)) {
    summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
}
const rsiTradesPath = path.join(resultsDir, 'RSITurbo_trades.json');
let rsiTrades = [];
if (fs.existsSync(rsiTradesPath)) {
    rsiTrades = JSON.parse(fs.readFileSync(rsiTradesPath, 'utf8'));
}
const rsiTurboData = summary.find((s) => s.strategy === 'RSITurbo');
if (!rsiTurboData && rsiTrades.length === 0) {
    console.error('Nie znaleziono danych strategii RSI Turbo');
    process.exit(1);
}
const equityCurve = [];
let equity = 10000;
for (const trade of rsiTrades) {
    equity += trade.pnl;
    equityCurve.push({
        date: new Date(trade.exitTime).toISOString(),
        equity: equity,
        pnl: trade.pnl,
        direction: trade.direction
    });
}
const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
    path: path.join(resultsDir, 'equity_curve.csv'),
    header: [
        { id: 'date', title: 'Date' },
        { id: 'equity', title: 'Equity' },
        { id: 'pnl', title: 'PnL' },
        { id: 'direction', title: 'Direction' }
    ]
});
csvWriter.writeRecords(equityCurve)
    .then(() => {
    console.log('Zapisano dane krzywej kapitału do CSV');
});
const totalPnL = rsiTurboData?.pnl || rsiTrades.reduce((sum, t) => sum + t.pnl, 0);
const totalTrades = rsiTurboData?.trades || rsiTrades.length;
const winRate = rsiTurboData?.winRate || (rsiTrades.filter(t => t.pnl > 0).length / rsiTrades.length);
const sharpeRatio = rsiTurboData?.sharpe || 0;
const maxDrawdown = rsiTurboData?.maxDrawdown || 0;
const profitFactor = rsiTurboData?.profitFactor || 0;
const longTrades = rsiTrades.filter(t => t.direction === 'long');
const shortTrades = rsiTrades.filter(t => t.direction === 'short');
const longWins = longTrades.filter(t => t.pnl > 0).length;
const shortWins = shortTrades.filter(t => t.pnl > 0).length;
function generateHTML() {
    const equityDataString = JSON.stringify(equityCurve);
    const tradeDataString = JSON.stringify(rsiTrades);
    let html = '';
    html += '<!DOCTYPE html>\n';
    html += '<html>\n<head>\n';
    html += '<title>Raport RSI Turbo - Wizualizacja</title>\n';
    html += '<meta charset="UTF-8">\n';
    html += '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n';
    html += '<style>\n';
    html += 'body { font-family: Arial, sans-serif; margin: 20px; color: #333; background-color: #f4f4f4; }\n';
    html += '.container { max-width: 1200px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }\n';
    html += '.stats-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }\n';
    html += '.stat-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }\n';
    html += '.stat-box h3 { margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }\n';
    html += '.stat-value { font-size: 24px; font-weight: bold; }\n';
    html += '.positive { color: #4CAF50; }\n';
    html += '.negative { color: #f44336; }\n';
    html += '.chart-container { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }\n';
    html += '.trade-analysis { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }\n';
    html += '.trade-type { text-align: center; padding: 10px; background-color: #f8f9fa; border-radius: 8px; }\n';
    html += '</style>\n</head>\n<body>\n';
    html += '<div class="container">\n';
    html += '<h1>Raport RSI Turbo - Analiza Wyników</h1>\n';
    html += '<div class="stats-container">\n';
    html += '<div class="stat-box">\n<h3>Całkowity PnL</h3>\n';
    html += '<div class="stat-value ' + (totalPnL >= 0 ? 'positive' : 'negative') + '">$' + totalPnL.toFixed(2) + '</div>\n';
    html += '</div>\n';
    html += '<div class="stat-box">\n<h3>Liczba Transakcji</h3>\n';
    html += '<div class="stat-value">' + totalTrades + '</div>\n</div>\n';
    html += '<div class="stat-box">\n<h3>Win Rate</h3>\n';
    html += '<div class="stat-value">' + (winRate * 100).toFixed(2) + '%</div>\n</div>\n';
    html += '<div class="stat-box">\n<h3>Sharpe Ratio</h3>\n';
    html += '<div class="stat-value">' + sharpeRatio.toFixed(4) + '</div>\n</div>\n';
    html += '<div class="stat-box">\n<h3>Max Drawdown</h3>\n';
    html += '<div class="stat-value">$' + Math.abs(maxDrawdown).toFixed(2) + '</div>\n</div>\n';
    html += '<div class="stat-box">\n<h3>Profit Factor</h3>\n';
    html += '<div class="stat-value">' + profitFactor.toFixed(2) + '</div>\n</div>\n';
    html += '</div>\n';
    html += '<div class="chart-container">\n<h2>Krzywa Kapitału</h2>\n';
    html += '<canvas id="equityChart" width="400" height="200"></canvas>\n</div>\n';
    html += '<div class="chart-container">\n<h2>PnL per Transakcja</h2>\n';
    html += '<canvas id="pnlChart" width="400" height="200"></canvas>\n</div>\n';
    html += '<div class="trade-analysis">\n';
    html += '<div class="trade-type">\n<h3>Transakcje Long</h3>\n';
    html += '<p>Liczba: ' + longTrades.length + '</p>\n';
    html += '<p>Win Rate: ' + (longTrades.length > 0 ? ((longWins / longTrades.length) * 100).toFixed(2) : 0) + '%</p>\n';
    html += '<p>PnL: $' + longTrades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2) + '</p>\n';
    html += '</div>\n';
    html += '<div class="trade-type">\n<h3>Transakcje Short</h3>\n';
    html += '<p>Liczba: ' + shortTrades.length + '</p>\n';
    html += '<p>Win Rate: ' + (shortTrades.length > 0 ? ((shortWins / shortTrades.length) * 100).toFixed(2) : 0) + '%</p>\n';
    html += '<p>PnL: $' + shortTrades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2) + '</p>\n';
    html += '</div>\n</div>\n';
    html += '<script>\n';
    html += 'const equityData = ' + equityDataString + ';\n';
    html += 'const tradeData = ' + tradeDataString + ';\n';
    html += 'const equityCtx = document.getElementById("equityChart").getContext("2d");\n';
    html += 'new Chart(equityCtx, {\n';
    html += 'type: "line",\n';
    html += 'data: {\n';
    html += 'labels: equityData.map(d => new Date(d.date).toLocaleDateString()),\n';
    html += 'datasets: [{\n';
    html += 'label: "Kapitał",\n';
    html += 'data: equityData.map(d => d.equity),\n';
    html += 'borderColor: "rgb(75, 192, 192)",\n';
    html += 'backgroundColor: "rgba(75, 192, 192, 0.2)",\n';
    html += 'tension: 0.1\n';
    html += '}]\n},\n';
    html += 'options: {\n';
    html += 'responsive: true,\n';
    html += 'scales: {\n';
    html += 'y: { beginAtZero: false, title: { display: true, text: "Kapitał (USD)" } },\n';
    html += 'x: { title: { display: true, text: "Data" } }\n';
    html += '}\n}\n});\n';
    html += 'const pnlCtx = document.getElementById("pnlChart").getContext("2d");\n';
    html += 'new Chart(pnlCtx, {\n';
    html += 'type: "bar",\n';
    html += 'data: {\n';
    html += 'labels: tradeData.map((_, index) => "T" + (index + 1)),\n';
    html += 'datasets: [{\n';
    html += 'label: "PnL",\n';
    html += 'data: tradeData.map(d => d.pnl),\n';
    html += 'backgroundColor: tradeData.map(d => d.pnl > 0 ? "rgba(75, 192, 192, 0.5)" : "rgba(255, 99, 132, 0.5)"),\n';
    html += 'borderColor: tradeData.map(d => d.pnl > 0 ? "rgb(75, 192, 192)" : "rgb(255, 99, 132)"),\n';
    html += 'borderWidth: 1\n';
    html += '}]\n},\n';
    html += 'options: {\n';
    html += 'responsive: true,\n';
    html += 'scales: {\n';
    html += 'y: { beginAtZero: true, title: { display: true, text: "PnL (USD)" } },\n';
    html += 'x: { title: { display: true, text: "Transakcje" } }\n';
    html += '}\n}\n});\n';
    html += '</script>\n</div>\n</body>\n</html>';
    return html;
}
const htmlReport = generateHTML();
fs.writeFileSync(path.join(resultsDir, 'visual_report.html'), htmlReport);
console.log('Wygenerowano raport wizualny: ' + path.join(resultsDir, 'visual_report.html'));

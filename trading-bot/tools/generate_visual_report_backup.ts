/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

// Ścieżka do folderu z wynikami
const resultsDir = path.resolve(__dirname, '../results/optimal_strategies_1753629637384');

// Wczytaj dane z podsumowania strategii
const summaryPath = path.join(resultsDir, 'strategy_summary.json');
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

// Znajdź RSI Turbo
const rsiTurboData = summary.find((s: any) => s.strategy === 'RSITurbo');

if (!rsiTurboData) {
    console.error('Nie znaleziono danych strategii RSI Turbo');
    process.exit(1);
}

// Wczytaj szczegółowe dane transakcji RSI Turbo
const rsiTradesPath = path.join(resultsDir, 'RSITurbo_trades.json');
const rsiTrades = JSON.parse(fs.readFileSync(rsiTradesPath, 'utf8'));

// Przygotuj dane do wizualizacji
const equityCurve = [];
let equity = 10000; // Założenie: początkowy kapitał 10000 USD

for (const trade of rsiTrades) {
    equity += trade.pnl;
    equityCurve.push({
        date: new Date(trade.exitTime).toISOString(),
        equity: equity,
        pnl: trade.pnl,
        direction: trade.direction
    });
}

// Zapisz dane do CSV dla łatwiejszej wizualizacji
const csvWriter = createObjectCsvWriter({
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

// Utwórz raport HTML z wykresami (używając Chart.js)
const htmlReport = `
<!DOCTYPE html>
<html>
<head>
    <title>Raport RSI Turbo - Wizualizacja</title>
    <meta charset="UTF-8">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
        }
        h1, h2 {
            color: #2a5885;
        }
        .chart-container {
            width: 90%;
            margin: 20px auto;
            height: 400px;
        }
        .stats-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-around;
            margin: 20px 0;
        }
        .stat-box {
            background-color: #f8f8f8;
            border-radius: 5px;
            padding: 15px;
            margin: 10px;
            min-width: 200px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0;
        }
        .positive {
            color: #28a745;
        }
        .negative {
            color: #dc3545;
        }
        .trade-distribution {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
        }
        .trade-type {
            text-align: center;
            padding: 10px;
        }
    </style>
</head>
<body>
    <h1>Raport RSI Turbo - Analiza Wyników</h1>
    
    <div class="stats-container">
        <div class="stat-box">
            <h3>Całkowity PnL</h3>
            <div class="stat-value ${rsiTurboData.pnl >= 0 ? 'positive' : 'negative'}">$${rsiTurboData.pnl.toFixed(2)}</div>
        </div>
        <div class="stat-box">
            <h3>Liczba Transakcji</h3>
            <div class="stat-value">${rsiTurboData.trades}</div>
        </div>
        <div class="stat-box">
            <h3>Win Rate</h3>
            <div class="stat-value">${(rsiTurboData.winRate * 100).toFixed(2)}%</div>
        </div>
        <div class="stat-box">
            <h3>Sharpe Ratio</h3>
            <div class="stat-value">${rsiTurboData.sharpe.toFixed(4)}</div>
        </div>
        <div class="stat-box">
            <h3>Max Drawdown</h3>
            <div class="stat-value">$${rsiTurboData.maxDrawdown.toFixed(2)}</div>
        </div>
        <div class="stat-box">
            <h3>Profit Factor</h3>
            <div class="stat-value">${rsiTurboData.profitFactor.toFixed(2)}</div>
        </div>
    </div>
    
    <h2>Krzywa Kapitału</h2>
    <div class="chart-container">
        <canvas id="equityChart"></canvas>
    </div>
    
    <h2>Rozkład PnL</h2>
    <div class="chart-container">
        <canvas id="pnlDistribution"></canvas>
    </div>
    
    <h2>Analiza Kierunków Transakcji</h2>
    <div class="trade-distribution">
        <div class="trade-type">
            <h3>Long</h3>
            <canvas id="longChart" width="200" height="200"></canvas>
            <div id="longStats"></div>
        </div>
        <div class="trade-type">
            <h3>Short</h3>
            <canvas id="shortChart" width="200" height="200"></canvas>
            <div id="shortStats"></div>
        </div>
    </div>
    
    <script>
        // Dane z transakcji
        const trades = ${JSON.stringify(rsiTrades)};
        const equityCurve = ${JSON.stringify(equityCurve)};
        
        // Przygotowanie danych do wykresów
        const dates = equityCurve.map(entry => entry.date);
        const equityValues = equityCurve.map(entry => entry.equity);
        const pnlValues = trades.map(trade => trade.pnl);
        
        // Podział na transakcje long i short
        const longTrades = trades.filter(trade => trade.direction === 'long');
        const shortTrades = trades.filter(trade => trade.direction === 'short');
        
        const longWins = longTrades.filter(trade => trade.pnl > 0).length;
        const longLosses = longTrades.filter(trade => trade.pnl <= 0).length;
        const shortWins = shortTrades.filter(trade => trade.pnl > 0).length;
        const shortLosses = shortTrades.filter(trade => trade.pnl <= 0).length;
        
        // Wykres krzywej kapitału
        const equityCtx = document.getElementById('equityChart').getContext('2d');
        new Chart(equityCtx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Kapitał',
                    data: equityValues,
                    borderColor: '#4e73df',
                    backgroundColor: 'rgba(78, 115, 223, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Data'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Kapitał (USD)'
                        }
                    }
                }
            }
        });
        
        // Histogram PnL
        const pnlCtx = document.getElementById('pnlDistribution').getContext('2d');
        
        // Grupowanie PnL do bucketów
        const min = Math.min(...pnlValues);
        const max = Math.max(...pnlValues);
        const range = max - min;
        const bucketSize = range / 20; // 20 buckets
        
        const buckets = Array(20).fill(0);
        pnlValues.forEach(pnl => {
            const bucketIndex = Math.min(19, Math.floor((pnl - min) / bucketSize));
            buckets[bucketIndex]++;
        });
        
        const bucketLabels = Array(20).fill(0).map((_, i) => 
            (min + i * bucketSize).toFixed(2) + ' to ' + (min + (i + 1) * bucketSize).toFixed(2)
        );
        
        new Chart(pnlCtx, {
            type: 'bar',
            data: {
                labels: bucketLabels,
                datasets: [{
                    label: 'Liczba transakcji',
                    data: buckets,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'PnL (USD)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Liczba transakcji'
                        }
                    }
                }
            }
        });
        
        // Wykresy kołowe dla long/short
        const longCtx = document.getElementById('longChart').getContext('2d');
        new Chart(longCtx, {
            type: 'pie',
            data: {
                labels: ['Zyski', 'Straty'],
                datasets: [{
                    data: [longWins, longLosses],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(255, 99, 132, 0.6)'
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 99, 132, 1)'
                    ],
                    borderWidth: 1
                }]
            }
        });
        
        const shortCtx = document.getElementById('shortChart').getContext('2d');
        new Chart(shortCtx, {
            type: 'pie',
            data: {
                labels: ['Zyski', 'Straty'],
                datasets: [{
                    data: [shortWins, shortLosses],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(255, 99, 132, 0.6)'
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 99, 132, 1)'
                    ],
                    borderWidth: 1
                }]
            }
        });
        
        // Statystyki dla long/short
        document.getElementById('longStats').innerHTML = 
            '<p>Całkowita liczba: ' + longTrades.length + '</p>' +
            '<p>Win Rate: ' + ((longWins / longTrades.length) * 100).toFixed(2) + '%</p>' +
            '<p>PnL: $' + longTrades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2) + '</p>';
        
        document.getElementById('shortStats').innerHTML = 
            '<p>Całkowita liczba: ' + shortTrades.length + '</p>' +
            '<p>Win Rate: ' + ((shortWins / shortTrades.length) * 100).toFixed(2) + '%</p>' +
            '<p>PnL: $' + shortTrades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2) + '</p>';
    </script>
</body>
</html>
`;

// Zapisz raport HTML
fs.writeFileSync(path.join(resultsDir, 'visual_report.html'), htmlReport);
console.log(`Wygenerowano raport wizualny: ${path.join(resultsDir, 'visual_report.html')}`);

/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

// Ścieżka do folderu z wynikami
const resultsDir = path.resolve(__dirname, '../results/optimal_strategies_1753629637384');

// Typy danych dla podsumowania strategii
interface StrategySummary {
    strategy: string;
    pnl: number;
    trades: number;
    winRate: number;
    sharpe: number;
    maxDrawdown: number;
    profitFactor: number;
}

// Wczytaj dane z podsumowania strategii
const summaryPath = path.join(resultsDir, 'strategy_summary.json');
let summary: StrategySummary[] = [];
if (fs.existsSync(summaryPath)) {
    summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8')) as StrategySummary[];
}

// Wczytaj szczegółowe dane transakcji RSI Turbo
interface Trade {
    exitTime: string;
    pnl: number;
    direction: string;
    // dodaj inne pola jeśli występują w pliku JSON
}
const rsiTradesPath = path.join(resultsDir, 'RSITurbo_trades.json');
let rsiTrades: Trade[] = [];
if (fs.existsSync(rsiTradesPath)) {
    rsiTrades = JSON.parse(fs.readFileSync(rsiTradesPath, 'utf8')) as Trade[];
}

// Znajdź RSI Turbo
const rsiTurboData = summary.find((s: StrategySummary) => s.strategy === 'RSITurbo');

if (!rsiTurboData && rsiTrades.length === 0) {
    console.error('Nie znaleziono danych strategii RSI Turbo');
    process.exit(1);
}

// Przygotuj dane do wizualizacji
const equityCurve: { date: string; equity: number; pnl: number; direction: string; }[] = [];
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
function generateHTML(): string {
    // Przygotuj statystyki
    const totalPnL = rsiTurboData?.pnl || rsiTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalTrades = rsiTurboData?.trades || rsiTrades.length;
    const winRate = rsiTurboData?.winRate || (rsiTrades.filter(t => t.pnl > 0).length / rsiTrades.length);
    const sharpeRatio = rsiTurboData?.sharpe || 0;
    const maxDrawdown = rsiTurboData?.maxDrawdown || 0;

    const htmlContent = `<!DOCTYPE html>
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
        .stats-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-box h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
        }
        .positive {
            color: #4CAF50;
        }
        .negative {
            color: #f44336;
        }
        .chart-container {
            background-color: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .trade-analysis {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 20px;
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
            <div class="stat-value ${totalPnL >= 0 ? 'positive' : 'negative'}">$${totalPnL.toFixed(2)}</div>
        </div>
        <div class="stat-box">
            <h3>Liczba Transakcji</h3>
            <div class="stat-value">${totalTrades}</div>
        </div>
        <div class="stat-box">
            <h3>Win Rate</h3>
            <div class="stat-value">${(winRate * 100).toFixed(2)}%</div>
        </div>
        <div class="stat-box">
            <h3>Sharpe Ratio</h3>
            <div class="stat-value">${sharpeRatio.toFixed(4)}</div>
        </div>
        <div class="stat-box">
            <h3>Max Drawdown</h3>
            <div class="stat-value">${maxDrawdown.toFixed(2)}</div>
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
    <div class="trade-analysis">
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
        const equityCurveData = ${JSON.stringify(equityCurve)};
        
        // Przygotowanie danych do wykresów
        const dates = equityCurveData.map(entry => entry.date);
        const equityValues = equityCurveData.map(entry => entry.equity);
        const pnlValues = trades.map(trade => trade.pnl);
        
        // Podział na transakcje long i short
        const longTrades = trades.filter(trade => trade.direction === 'long');
        const shortTrades = trades.filter(trade => trade.direction === 'short');
        
        const longWins = longTrades.filter(trade => trade.pnl > 0).length;
        const longLosses = longTrades.filter(trade => trade.pnl <= 0).length;
        const shortWins = shortTrades.filter(trade => trade.pnl > 0).length;
        const shortLosses = shortTrades.filter(trade => trade.pnl <= 0).length;
        
        // Wykres krzywej kapitału
        if (document.getElementById('equityChart')) {
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
        }
        
        // Histogram PnL
        if (document.getElementById('pnlDistribution')) {
            const pnlCtx = document.getElementById('pnlDistribution').getContext('2d');
            
            // Grupowanie PnL do bucketów
            const min = Math.min(...pnlValues);
            const max = Math.max(...pnlValues);
            const range = max - min;
            const bucketSize = range / 20;
            
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
        }
        
        // Wykresy kołowe dla long/short
        if (document.getElementById('longChart')) {
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
        }
        
        if (document.getElementById('shortChart')) {
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
        }
        
        // Statystyki dla long/short
        if (document.getElementById('longStats')) {
            document.getElementById('longStats').innerHTML = 
                '<p>Całkowita liczba: ' + longTrades.length + '</p>' +
                '<p>Win Rate: ' + ((longWins / longTrades.length) * 100).toFixed(2) + '%</p>' +
                '<p>PnL: $' + longTrades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2) + '</p>';
        }
        
        if (document.getElementById('shortStats')) {
            document.getElementById('shortStats').innerHTML = 
                '<p>Całkowita liczba: ' + shortTrades.length + '</p>' +
                '<p>Win Rate: ' + ((shortWins / shortTrades.length) * 100).toFixed(2) + '%</p>' +
                '<p>PnL: $' + shortTrades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2) + '</p>';
        }
    </script>
</body>
</html>`;

    return htmlContent;
}

const htmlReport = generateHTML();

// Zapisz raport HTML
fs.writeFileSync(path.join(resultsDir, 'visual_report.html'), htmlReport);
console.log('Wygenerowano raport wizualny: ' + path.join(resultsDir, 'visual_report.html'));

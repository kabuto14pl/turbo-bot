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

// Wczytaj szczegółowe dane transakcji RSI Turbo
interface Trade {
    exitTime: string;
    pnl: number;
    direction: string;
    entryPrice?: number;
    exitPrice?: number;
    entryTime?: string;
}

async function generateVisualReport() {
    try {
        // Sprawdź czy folder istnieje
        if (!fs.existsSync(resultsDir)) {
            console.error(`Folder wyników nie istnieje: ${resultsDir}`);
            process.exit(1);
        }

        // Wczytaj dane podsumowania (jeśli istnieją)
        let summary: StrategySummary[] = [];
        const summaryPath = path.join(resultsDir, 'strategy_summary.json');
        if (fs.existsSync(summaryPath)) {
            summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8')) as StrategySummary[];
        }

        // Wczytaj szczegółowe dane transakcji RSI Turbo
        const rsiTradesPath = path.join(resultsDir, 'RSITurbo_trades.json');
        let rsiTrades: Trade[] = [];
        
        if (fs.existsSync(rsiTradesPath)) {
            rsiTrades = JSON.parse(fs.readFileSync(rsiTradesPath, 'utf8')) as Trade[];
        } else {
            console.warn('Nie znaleziono pliku z transakcjami RSI Turbo');
        }

        // Znajdź RSI Turbo w podsumowaniu
        const rsiTurboData = summary.find((s: StrategySummary) => s.strategy === 'RSITurbo');

        // Przygotuj dane do wizualizacji
        const equityCurve: { date: string; equity: number; pnl: number; direction: string }[] = [];
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
        if (equityCurve.length > 0) {
            const csvWriter = createObjectCsvWriter({
                path: path.join(resultsDir, 'equity_curve.csv'),
                header: [
                    { id: 'date', title: 'Date' },
                    { id: 'equity', title: 'Equity' },
                    { id: 'pnl', title: 'PnL' },
                    { id: 'direction', title: 'Direction' }
                ]
            });

            await csvWriter.writeRecords(equityCurve);
            console.log('Zapisano dane krzywej kapitału do CSV');
        }

        // Przygotuj statystyki dla transakcji
        const longTrades = rsiTrades.filter((t: Trade) => t.direction === 'long');
        const shortTrades = rsiTrades.filter((t: Trade) => t.direction === 'short');
        const longWins = longTrades.filter((t: Trade) => t.pnl > 0).length;
        const shortWins = shortTrades.filter((t: Trade) => t.pnl > 0).length;

        const longPnL = longTrades.reduce((sum: number, t: Trade) => sum + t.pnl, 0);
        const shortPnL = shortTrades.reduce((sum: number, t: Trade) => sum + t.pnl, 0);

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
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            margin: 10px;
            min-width: 200px;
            text-align: center;
        }
        .stat-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #2a5885;
        }
        .positive { color: #28a745; }
        .negative { color: #dc3545; }
        .section {
            margin: 40px 0;
            padding: 20px;
            border: 1px solid #eee;
            border-radius: 10px;
        }
    </style>
</head>
<body>
    <h1>📊 Raport Strategii RSI Turbo - Wizualizacja Wyników</h1>
    
    <div class="stats-container">
        <div class="stat-box">
            <h3>Całkowity PnL</h3>
            <div class="stat-value ${rsiTurboData ? (rsiTurboData.pnl > 0 ? 'positive' : 'negative') : ''}">${rsiTurboData ? rsiTurboData.pnl.toFixed(2) : 'N/A'} USD</div>
        </div>
        <div class="stat-box">
            <h3>Liczba Transakcji</h3>
            <div class="stat-value">${rsiTrades.length}</div>
        </div>
        <div class="stat-box">
            <h3>Win Rate</h3>
            <div class="stat-value">${rsiTurboData ? (rsiTurboData.winRate * 100).toFixed(2) : 'N/A'}%</div>
        </div>
        <div class="stat-box">
            <h3>Sharpe Ratio</h3>
            <div class="stat-value">${rsiTurboData ? rsiTurboData.sharpe.toFixed(3) : 'N/A'}</div>
        </div>
        <div class="stat-box">
            <h3>Max Drawdown</h3>
            <div class="stat-value negative">${rsiTurboData ? (rsiTurboData.maxDrawdown * 100).toFixed(2) : 'N/A'}%</div>
        </div>
        <div class="stat-box">
            <h3>Profit Factor</h3>
            <div class="stat-value">${rsiTurboData ? rsiTurboData.profitFactor.toFixed(2) : 'N/A'}</div>
        </div>
    </div>

    <div class="section">
        <h2>📈 Krzywa Kapitału</h2>
        <div class="chart-container">
            <canvas id="equityChart"></canvas>
        </div>
    </div>

    <div class="section">
        <h2>📊 Rozkład PnL Transakcji</h2>
        <div class="chart-container">
            <canvas id="pnlChart"></canvas>
        </div>
    </div>

    <div class="section">
        <h2>⚖️ Statystyki Long vs Short</h2>
        <div class="stats-container">
            <div class="stat-box">
                <h3>Long Trades</h3>
                <div id="longStats">
                    <p>Całkowita liczba: ${longTrades.length}</p>
                    <p>Win Rate: ${longTrades.length > 0 ? ((longWins / longTrades.length) * 100).toFixed(2) : '0.00'}%</p>
                    <p>PnL: ${longPnL.toFixed(2)} USD</p>
                </div>
            </div>
            <div class="stat-box">
                <h3>Short Trades</h3>
                <div id="shortStats">
                    <p>Całkowita liczba: ${shortTrades.length}</p>
                    <p>Win Rate: ${shortTrades.length > 0 ? ((shortWins / shortTrades.length) * 100).toFixed(2) : '0.00'}%</p>
                    <p>PnL: ${shortPnL.toFixed(2)} USD</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Dane dla wykresów
        const equityData = ${JSON.stringify(equityCurve)};
        const pnlData = ${JSON.stringify(rsiTrades.map((t: Trade) => t.pnl))};
        
        // Krzywa kapitału
        const equityCtx = document.getElementById('equityChart').getContext('2d');
        new Chart(equityCtx, {
            type: 'line',
            data: {
                labels: equityData.map(d => new Date(d.date).toLocaleDateString()),
                datasets: [{
                    label: 'Kapitał',
                    data: equityData.map(d => d.equity),
                    borderColor: '#2a5885',
                    backgroundColor: 'rgba(42, 88, 133, 0.1)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Kapitał (USD)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Data'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Krzywa Kapitału w Czasie'
                    }
                }
            }
        });
        
        // Histogram PnL
        const pnlCtx = document.getElementById('pnlChart').getContext('2d');
        const bins = 20;
        const minPnl = Math.min(...pnlData);
        const maxPnl = Math.max(...pnlData);
        const binWidth = (maxPnl - minPnl) / bins;
        
        const histogram = new Array(bins).fill(0);
        const binLabels = [];
        
        for (let i = 0; i < bins; i++) {
            const binStart = minPnl + i * binWidth;
            const binEnd = binStart + binWidth;
            binLabels.push(\`\${binStart.toFixed(0)} - \${binEnd.toFixed(0)}\`);
            
            for (const pnl of pnlData) {
                if (pnl >= binStart && pnl < binEnd) {
                    histogram[i]++;
                }
            }
        }
        
        new Chart(pnlCtx, {
            type: 'bar',
            data: {
                labels: binLabels,
                datasets: [{
                    label: 'Liczba Transakcji',
                    data: histogram,
                    backgroundColor: pnlData.map(p => p > 0 ? 'rgba(40, 167, 69, 0.7)' : 'rgba(220, 53, 69, 0.7)'),
                    borderColor: pnlData.map(p => p > 0 ? '#28a745' : '#dc3545'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Liczba Transakcji'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'PnL (USD)'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Rozkład Zysków/Strat z Transakcji'
                    }
                }
            }
        });
    </script>
</body>
</html>
`;

        // Zapisz raport HTML
        fs.writeFileSync(path.join(resultsDir, 'visual_report.html'), htmlReport);
        console.log(`✅ Wygenerowano raport wizualny: ${path.join(resultsDir, 'visual_report.html')}`);

    } catch (error) {
        console.error('❌ Błąd podczas generowania raportu:', error);
        process.exit(1);
    }
}

// Uruchom funkcję generowania raportu
generateVisualReport();

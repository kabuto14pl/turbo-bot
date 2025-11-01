/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// ============================================================================
//  cross_validation.ts - WALIDACJA KRZYŻOWA STRATEGII
//  Ten moduł implementuje metody walidacji krzyżowej dla strategii tradingowych,
//  aby wykrywać i zapobiegać overfittingowi.
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { Trade } from '../core/types';

/**
 * Reprezentuje pojedynczy okres w walidacji krzyżowej
 */
interface TimeWindow {
    startDate: Date;
    endDate: Date;
    label: string;
}

/**
 * Konfiguracja walidacji krzyżowej
 */
interface CrossValidationConfig {
    startDate: Date;  // Data początkowa całego okresu
    endDate: Date;    // Data końcowa całego okresu
    folds: number;    // Liczba podziałów (foldów) czasu
    strategyName: string;
    strategyParams: Record<string, any>;
    backtestFn: (params: any, startDate: Date, endDate: Date) => Promise<any>;
}

/**
 * Wyniki walidacji krzyżowej
 */
interface CrossValidationResults {
    strategyName: string;
    params: Record<string, any>;
    folds: Array<{
        trainWindow: TimeWindow;
        testWindow: TimeWindow;
        trainResults: any;
        testResults: any;
        stability: {
            sharpeRatioDiff: number;
            winRateDiff: number;
            pnlDiff: number;
        };
    }>;
    summary: {
        averageTrainSharpe: number;
        averageTestSharpe: number;
        sharpeRatioStability: number;
        winRateStability: number;
        pnlStability: number;
        overfittingScore: number;
    };
}

/**
 * Dzieli przedział czasowy na podprzedziały (foldy) do walidacji krzyżowej
 */
function createTimeWindows(startDate: Date, endDate: Date, folds: number): TimeWindow[] {
    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const windowSize = Math.floor(totalDays / folds);
    
    const windows: TimeWindow[] = [];
    for (let i = 0; i < folds; i++) {
        const foldStart = new Date(startDate.getTime() + i * windowSize * 24 * 60 * 60 * 1000);
        const foldEnd = new Date(Math.min(
            foldStart.getTime() + windowSize * 24 * 60 * 60 * 1000,
            endDate.getTime()
        ));
        
        windows.push({
            startDate: foldStart,
            endDate: foldEnd,
            label: `Fold ${i+1}: ${foldStart.toISOString().slice(0, 10)} - ${foldEnd.toISOString().slice(0, 10)}`
        });
    }
    
    return windows;
}

/**
 * Przeprowadza pełną walidację krzyżową dla strategii
 */
export async function performCrossValidation(
    config: CrossValidationConfig
): Promise<CrossValidationResults> {
    const { startDate, endDate, folds, strategyName, strategyParams, backtestFn } = config;
    
    // Tworzenie przedziałów czasowych (foldów)
    const timeWindows = createTimeWindows(startDate, endDate, folds);
    
    const results: CrossValidationResults = {
        strategyName,
        params: strategyParams,
        folds: [],
        summary: {
            averageTrainSharpe: 0,
            averageTestSharpe: 0,
            sharpeRatioStability: 0,
            winRateStability: 0,
            pnlStability: 0,
            overfittingScore: 0
        }
    };
    
    let totalTrainSharpe = 0;
    let totalTestSharpe = 0;
    let totalSharpeRatioDiff = 0;
    let totalWinRateDiff = 0;
    let totalPnlDiff = 0;
    
    // Wykonanie walidacji krzyżowej dla każdego foldu
    for (let i = 0; i < folds - 1; i++) {
        console.log(`Wykonywanie walidacji krzyżowej dla ${strategyName} - fold ${i + 1}/${folds - 1}`);
        
        // Fold treningowy i testowy
        const trainWindow = timeWindows[i];
        const testWindow = timeWindows[i + 1];
        
        // Wykonanie backtestów na zbiorze treningowym
        const trainResults = await backtestFn(
            strategyParams, 
            trainWindow.startDate, 
            trainWindow.endDate
        );
        
        // Wykonanie backtestów na zbiorze testowym z tymi samymi parametrami
        const testResults = await backtestFn(
            strategyParams, 
            testWindow.startDate, 
            testWindow.endDate
        );
        
        // Obliczenie różnic między wynikami
        const sharpeRatioDiff = Math.abs(
            (testResults.sharpeRatio || 0) - (trainResults.sharpeRatio || 0)
        );
        
        const winRateDiff = Math.abs(
            (testResults.winRate || 0) - (trainResults.winRate || 0)
        );
        
        const pnlDiff = Math.abs(
            ((testResults.totalPnl || 0) - (trainResults.totalPnl || 0)) / 
            Math.max(Math.abs(trainResults.totalPnl || 1), 1)
        );
        
        totalTrainSharpe += trainResults.sharpeRatio || 0;
        totalTestSharpe += testResults.sharpeRatio || 0;
        totalSharpeRatioDiff += sharpeRatioDiff;
        totalWinRateDiff += winRateDiff;
        totalPnlDiff += pnlDiff;
        
        results.folds.push({
            trainWindow,
            testWindow,
            trainResults,
            testResults,
            stability: {
                sharpeRatioDiff,
                winRateDiff,
                pnlDiff
            }
        });
    }
    
    // Obliczenie statystyk podsumowujących
    const numFolds = folds - 1;
    results.summary.averageTrainSharpe = totalTrainSharpe / numFolds;
    results.summary.averageTestSharpe = totalTestSharpe / numFolds;
    results.summary.sharpeRatioStability = 1 - (totalSharpeRatioDiff / numFolds);
    results.summary.winRateStability = 1 - (totalWinRateDiff / numFolds);
    results.summary.pnlStability = 1 - (totalPnlDiff / numFolds);
    
    // Obliczenie ogólnego wyniku overfittingu (niższy = lepszy)
    results.summary.overfittingScore = 
        (results.summary.averageTrainSharpe - results.summary.averageTestSharpe) / 
        Math.max(Math.abs(results.summary.averageTrainSharpe), 0.01);
    
    return results;
}

/**
 * Generuje wizualizację wyników walidacji krzyżowej
 */
export function generateCrossValidationVisualization(
    results: CrossValidationResults,
    outputDir: string
): void {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Walidacja krzyżowa - ${results.strategyName}</title>
        <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
            }
            .chart-container { 
                width: 100%; 
                height: 400px; 
                margin-bottom: 30px; 
            }
            .metrics-container {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                margin-bottom: 30px;
            }
            .metric-card {
                background-color: #f8f9fa;
                border-radius: 8px;
                padding: 15px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                text-align: center;
            }
            .metric-value {
                font-size: 24px;
                font-weight: bold;
                margin: 10px 0;
            }
            .metric-label {
                color: #666;
                font-size: 14px;
            }
            .good {
                color: #28a745;
            }
            .bad {
                color: #dc3545;
            }
            .neutral {
                color: #007bff;
            }
            h1, h2 { 
                color: #333; 
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            th {
                background-color: #f2f2f2;
            }
            tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            .params-container {
                background-color: #f8f9fa;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 20px;
            }
            .params-title {
                font-weight: bold;
                margin-bottom: 10px;
            }
            .params-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 10px;
            }
            .param-item {
                display: flex;
                justify-content: space-between;
            }
            .param-name {
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <h1>Raport walidacji krzyżowej - ${results.strategyName}</h1>
        
        <div class="params-container">
            <div class="params-title">Parametry strategii:</div>
            <div class="params-grid">
                ${Object.entries(results.params).map(([key, value]) => `
                <div class="param-item">
                    <span class="param-name">${key}:</span>
                    <span>${value}</span>
                </div>
                `).join('')}
            </div>
        </div>
        
        <div class="metrics-container">
            <div class="metric-card">
                <div class="metric-label">Średni Sharpe Ratio (treningowy)</div>
                <div class="metric-value neutral">${results.summary.averageTrainSharpe.toFixed(4)}</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Średni Sharpe Ratio (testowy)</div>
                <div class="metric-value neutral">${results.summary.averageTestSharpe.toFixed(4)}</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Wynik overfittingu</div>
                <div class="metric-value ${results.summary.overfittingScore < 0.2 ? 'good' : results.summary.overfittingScore > 0.5 ? 'bad' : 'neutral'}">
                    ${results.summary.overfittingScore.toFixed(4)}
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Stabilność Sharpe Ratio</div>
                <div class="metric-value ${results.summary.sharpeRatioStability > 0.8 ? 'good' : results.summary.sharpeRatioStability < 0.5 ? 'bad' : 'neutral'}">
                    ${(results.summary.sharpeRatioStability * 100).toFixed(1)}%
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Stabilność Win Rate</div>
                <div class="metric-value ${results.summary.winRateStability > 0.8 ? 'good' : results.summary.winRateStability < 0.5 ? 'bad' : 'neutral'}">
                    ${(results.summary.winRateStability * 100).toFixed(1)}%
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Stabilność PnL</div>
                <div class="metric-value ${results.summary.pnlStability > 0.7 ? 'good' : results.summary.pnlStability < 0.4 ? 'bad' : 'neutral'}">
                    ${(results.summary.pnlStability * 100).toFixed(1)}%
                </div>
            </div>
        </div>
        
        <h2>Porównanie Sharpe Ratio (trening vs test)</h2>
        <div id="sharpe-comparison-chart" class="chart-container"></div>
        
        <h2>Porównanie Win Rate (trening vs test)</h2>
        <div id="winrate-comparison-chart" class="chart-container"></div>
        
        <h2>Porównanie PnL (trening vs test)</h2>
        <div id="pnl-comparison-chart" class="chart-container"></div>
        
        <h2>Szczegółowe wyniki dla każdego foldu</h2>
        <table>
            <thead>
                <tr>
                    <th>Fold</th>
                    <th>Okres treningowy</th>
                    <th>Okres testowy</th>
                    <th>Sharpe (trening)</th>
                    <th>Sharpe (test)</th>
                    <th>Win Rate (trening)</th>
                    <th>Win Rate (test)</th>
                    <th>PnL (trening)</th>
                    <th>PnL (test)</th>
                </tr>
            </thead>
            <tbody>
                ${results.folds.map((fold, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td>${fold.trainWindow.startDate.toISOString().slice(0, 10)} - ${fold.trainWindow.endDate.toISOString().slice(0, 10)}</td>
                    <td>${fold.testWindow.startDate.toISOString().slice(0, 10)} - ${fold.testWindow.endDate.toISOString().slice(0, 10)}</td>
                    <td>${(fold.trainResults.sharpeRatio || 0).toFixed(4)}</td>
                    <td>${(fold.testResults.sharpeRatio || 0).toFixed(4)}</td>
                    <td>${((fold.trainResults.winRate || 0) * 100).toFixed(1)}%</td>
                    <td>${((fold.testResults.winRate || 0) * 100).toFixed(1)}%</td>
                    <td>${(fold.trainResults.totalPnl || 0).toFixed(2)}</td>
                    <td>${(fold.testResults.totalPnl || 0).toFixed(2)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        
        <script>
            // Dane do wykresów
            const foldLabels = ${JSON.stringify(results.folds.map((_, i) => `Fold ${i+1}`))};
            const trainSharpe = ${JSON.stringify(results.folds.map(fold => fold.trainResults.sharpeRatio || 0))};
            const testSharpe = ${JSON.stringify(results.folds.map(fold => fold.testResults.sharpeRatio || 0))};
            const trainWinRate = ${JSON.stringify(results.folds.map(fold => (fold.trainResults.winRate || 0) * 100))};
            const testWinRate = ${JSON.stringify(results.folds.map(fold => (fold.testResults.winRate || 0) * 100))};
            const trainPnl = ${JSON.stringify(results.folds.map(fold => fold.trainResults.totalPnl || 0))};
            const testPnl = ${JSON.stringify(results.folds.map(fold => fold.testResults.totalPnl || 0))};
            
            // Wykres porównania Sharpe Ratio
            const sharpeData = [
                {
                    x: foldLabels,
                    y: trainSharpe,
                    type: 'bar',
                    name: 'Trening',
                    marker: { color: 'rgba(55, 128, 191, 0.7)' }
                },
                {
                    x: foldLabels,
                    y: testSharpe,
                    type: 'bar',
                    name: 'Test',
                    marker: { color: 'rgba(219, 64, 82, 0.7)' }
                }
            ];
            
            const sharpeLayout = {
                barmode: 'group',
                title: 'Sharpe Ratio: Trening vs Test',
                xaxis: { title: 'Fold' },
                yaxis: { title: 'Sharpe Ratio' }
            };
            
            Plotly.newPlot('sharpe-comparison-chart', sharpeData, sharpeLayout);
            
            // Wykres porównania Win Rate
            const winrateData = [
                {
                    x: foldLabels,
                    y: trainWinRate,
                    type: 'bar',
                    name: 'Trening',
                    marker: { color: 'rgba(55, 128, 191, 0.7)' }
                },
                {
                    x: foldLabels,
                    y: testWinRate,
                    type: 'bar',
                    name: 'Test',
                    marker: { color: 'rgba(219, 64, 82, 0.7)' }
                }
            ];
            
            const winrateLayout = {
                barmode: 'group',
                title: 'Win Rate: Trening vs Test',
                xaxis: { title: 'Fold' },
                yaxis: { title: 'Win Rate (%)' }
            };
            
            Plotly.newPlot('winrate-comparison-chart', winrateData, winrateLayout);
            
            // Wykres porównania PnL
            const pnlData = [
                {
                    x: foldLabels,
                    y: trainPnl,
                    type: 'bar',
                    name: 'Trening',
                    marker: { color: 'rgba(55, 128, 191, 0.7)' }
                },
                {
                    x: foldLabels,
                    y: testPnl,
                    type: 'bar',
                    name: 'Test',
                    marker: { color: 'rgba(219, 64, 82, 0.7)' }
                }
            ];
            
            const pnlLayout = {
                barmode: 'group',
                title: 'PnL: Trening vs Test',
                xaxis: { title: 'Fold' },
                yaxis: { title: 'PnL' }
            };
            
            Plotly.newPlot('pnl-comparison-chart', pnlData, pnlLayout);
        </script>
    </body>
    </html>
    `;
    
    fs.writeFileSync(
        path.join(outputDir, `cross_validation_${results.strategyName}.html`), 
        htmlContent
    );
    
    console.log(`Wizualizacja walidacji krzyżowej zapisana w: ${outputDir}`);
}

/**
 * Wykonuje i wizualizuje walidację krzyżową dla strategii
 */
export async function runCrossValidation(
    config: CrossValidationConfig, 
    outputDir: string
): Promise<CrossValidationResults> {
    const results = await performCrossValidation(config);
    generateCrossValidationVisualization(results, outputDir);
    return results;
}

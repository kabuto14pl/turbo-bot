"use strict";
// ============================================================================
//  parameter_sensitivity.ts - ANALIZA WRAŻLIWOŚCI PARAMETRÓW
//  Ten moduł analizuje wpływ zmian poszczególnych parametrów na wyniki strategii.
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
exports.analyzeParameterSensitivity = analyzeParameterSensitivity;
exports.generateSensitivityVisualization = generateSensitivityVisualization;
exports.analyzeMultipleParameters = analyzeMultipleParameters;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Wykonuje analizę wrażliwości dla pojedynczego parametru
 * Testuje różne wartości parametru przy stałych wartościach pozostałych parametrów
 */
async function analyzeParameterSensitivity(config) {
    const { paramName, range, otherParams, strategyName, backtestFn } = config;
    const paramValues = [];
    const sharpeRatios = [];
    const winRates = [];
    const totalPnls = [];
    const maxDrawdowns = [];
    const tradeCounts = [];
    // Generowanie wartości parametru w zadanym zakresie
    const steps = Math.floor((range.max - range.min) / range.step) + 1;
    for (let i = 0; i < steps; i++) {
        const paramValue = range.min + i * range.step;
        paramValues.push(paramValue);
        // Tworzenie zestawu parametrów z aktualną wartością testowanego parametru
        const params = { ...otherParams, [paramName]: paramValue };
        console.log(`Testowanie ${strategyName} z ${paramName} = ${paramValue}`);
        // Uruchomienie backtestów dla tego zestawu parametrów
        const result = await backtestFn(params);
        // Zapisanie wyników
        sharpeRatios.push(result.sharpeRatio || 0);
        winRates.push(result.winRate || 0);
        totalPnls.push(result.totalPnl || 0);
        maxDrawdowns.push(result.maxDrawdown || 0);
        tradeCounts.push(result.tradeCount || 0);
    }
    return {
        paramName,
        paramValues,
        metricValues: {
            sharpeRatio: sharpeRatios,
            winRate: winRates,
            totalPnl: totalPnls,
            maxDrawdown: maxDrawdowns,
            tradeCount: tradeCounts
        }
    };
}
/**
 * Generuje wizualizację analizy wrażliwości dla parametru
 */
function generateSensitivityVisualization(result, outputDir, strategyName) {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Analiza wrażliwości - ${result.paramName} - ${strategyName}</title>
        <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .chart-container { width: 100%; height: 400px; margin-bottom: 30px; }
            h1, h2 { color: #333; }
            .grid-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
            }
        </style>
    </head>
    <body>
        <h1>Analiza wrażliwości parametru ${result.paramName} - ${strategyName}</h1>
        
        <div class="grid-container">
            <div>
                <h2>Sharpe Ratio</h2>
                <div id="chart-sharpe" class="chart-container"></div>
            </div>
            
            <div>
                <h2>Win Rate</h2>
                <div id="chart-winrate" class="chart-container"></div>
            </div>
            
            <div>
                <h2>Total PnL</h2>
                <div id="chart-pnl" class="chart-container"></div>
            </div>
            
            <div>
                <h2>Max Drawdown</h2>
                <div id="chart-drawdown" class="chart-container"></div>
            </div>
        </div>
        
        <h2>Liczba transakcji</h2>
        <div id="chart-trades" class="chart-container"></div>
        
        <script>
            // Dane z analizy wrażliwości
            const paramValues = ${JSON.stringify(result.paramValues)};
            const sharpeRatios = ${JSON.stringify(result.metricValues.sharpeRatio)};
            const winRates = ${JSON.stringify(result.metricValues.winRate)};
            const totalPnls = ${JSON.stringify(result.metricValues.totalPnl)};
            const maxDrawdowns = ${JSON.stringify(result.metricValues.maxDrawdown)};
            const tradeCounts = ${JSON.stringify(result.metricValues.tradeCount)};
            
            // Funkcja do tworzenia wykresu liniowego
            function createLineChart(divId, xValues, yValues, title, yAxisTitle, color) {
                const data = [{
                    x: xValues,
                    y: yValues,
                    type: 'scatter',
                    mode: 'lines+markers',
                    line: {
                        color: color,
                        width: 2
                    },
                    marker: {
                        color: color,
                        size: 8
                    }
                }];
                
                const layout = {
                    title: title,
                    xaxis: { 
                        title: '${result.paramName}'
                    },
                    yaxis: { 
                        title: yAxisTitle
                    },
                    margin: { t: 50, r: 50, b: 50, l: 50 }
                };
                
                Plotly.newPlot(divId, data, layout);
            }
            
            // Tworzenie wykresów
            createLineChart('chart-sharpe', paramValues, sharpeRatios, 'Wpływ na Sharpe Ratio', 'Sharpe Ratio', '#1f77b4');
            createLineChart('chart-winrate', paramValues, winRates.map(wr => wr * 100), 'Wpływ na Win Rate', 'Win Rate (%)', '#2ca02c');
            createLineChart('chart-pnl', paramValues, totalPnls, 'Wpływ na Total PnL', 'PnL', '#ff7f0e');
            createLineChart('chart-drawdown', paramValues, maxDrawdowns.map(dd => dd * 100), 'Wpływ na Max Drawdown', 'Max Drawdown (%)', '#d62728');
            createLineChart('chart-trades', paramValues, tradeCounts, 'Wpływ na liczbę transakcji', 'Liczba transakcji', '#9467bd');
        </script>
    </body>
    </html>
    `;
    fs.writeFileSync(path.join(outputDir, `sensitivity_${result.paramName}_${strategyName}.html`), htmlContent);
    console.log(`Wizualizacja analizy wrażliwości dla ${result.paramName} zapisana w: ${outputDir}`);
}
/**
 * Wykonuje analizę wrażliwości dla wielu parametrów strategii
 */
async function analyzeMultipleParameters(paramConfigs, outputDir) {
    // Utworzenie katalogu wyjściowego, jeśli nie istnieje
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    // Wykonanie analizy wrażliwości dla każdego parametru
    const results = [];
    for (const config of paramConfigs) {
        console.log(`Rozpoczynam analizę wrażliwości dla ${config.paramName} w strategii ${config.strategyName}`);
        const result = await analyzeParameterSensitivity(config);
        results.push(result);
        // Generowanie wizualizacji dla pojedynczego parametru
        generateSensitivityVisualization(result, outputDir, config.strategyName);
    }
    // Generowanie głównego raportu łączącego wszystkie analizy
    generateSensitivitySummaryReport(results, outputDir);
}
/**
 * Generuje raport podsumowujący analizę wrażliwości dla wielu parametrów
 */
function generateSensitivitySummaryReport(results, outputDir) {
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Raport analizy wrażliwości parametrów</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1, h2 { color: #333; }
            .report-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 20px;
                margin-top: 20px;
            }
            .report-card {
                border: 1px solid #ddd;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .report-card-header {
                background-color: #f5f5f5;
                padding: 10px 15px;
                font-weight: bold;
                border-bottom: 1px solid #ddd;
            }
            .report-card-body {
                padding: 15px;
            }
            .report-link {
                display: block;
                background-color: #4CAF50;
                color: white;
                text-align: center;
                padding: 10px;
                text-decoration: none;
                border-radius: 4px;
                margin-top: 10px;
                font-weight: bold;
            }
            .report-link:hover {
                background-color: #45a049;
            }
        </style>
    </head>
    <body>
        <h1>Raport analizy wrażliwości parametrów</h1>
        <p>Wygenerowano: ${new Date().toLocaleString()}</p>
        
        <div class="report-grid">
            ${results.map(result => {
        const fileName = `sensitivity_${result.paramName}_${result.paramName.includes('_') ? result.paramName.split('_')[0] : 'strategy'}.html`;
        return `
                <div class="report-card">
                    <div class="report-card-header">
                        Parametr: ${result.paramName}
                    </div>
                    <div class="report-card-body">
                        <p>Zakres wartości: ${Math.min(...result.paramValues)} - ${Math.max(...result.paramValues)}</p>
                        <p>Najlepszy Sharpe Ratio: ${Math.max(...result.metricValues.sharpeRatio).toFixed(4)}</p>
                        <p>Optymalną wartość: ${result.paramValues[result.metricValues.sharpeRatio.indexOf(Math.max(...result.metricValues.sharpeRatio))]}</p>
                        <a href="${fileName}" class="report-link" target="_blank">Zobacz szczegóły</a>
                    </div>
                </div>
                `;
    }).join('')}
        </div>
    </body>
    </html>
    `;
    fs.writeFileSync(path.join(outputDir, 'sensitivity_analysis_summary.html'), htmlContent);
    console.log(`Raport podsumowujący analizę wrażliwości zapisany w: ${outputDir}`);
}

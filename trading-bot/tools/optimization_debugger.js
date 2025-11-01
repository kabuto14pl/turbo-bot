"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// ============================================================================
//  optimization_debugger.ts - NARZĘDZIE DO DEBUGOWANIA PROCESU OPTYMALIZACJI
//  Ten plik zawiera funkcje do monitorowania i debugowania procesu optymalizacji
//  strategii tradingowych, logując szczegółowe informacje na każdym etapie.
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
exports.optimizationDebugger = exports.OptimizationDebugger = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Klasa do debugowania procesu optymalizacji
 */
class OptimizationDebugger {
    constructor(options = {}) {
        this.iterationResults = {};
        this.currentStrategy = '';
        this.currentIteration = 0;
        this.totalIterations = 0;
        this.bestResults = {};
        // Domyślne opcje
        this.options = {
            logToConsole: true,
            logToFile: true,
            logDirectory: './debug_logs',
            logLevel: 'detailed',
            saveIntermediateResults: true,
            parameterSteps: true,
            visualizeProgress: true,
            ...options
        };
        // Tworzenie katalogu logów jeśli nie istnieje
        if (this.options.logToFile && !fs.existsSync(this.options.logDirectory)) {
            fs.mkdirSync(this.options.logDirectory, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.logFilePath = path.join(this.options.logDirectory, `optimization_debug_${timestamp}.log`);
        this.startTime = Date.now();
        // Inicjalizacja pliku logu
        if (this.options.logToFile) {
            fs.writeFileSync(this.logFilePath, `=== DEBUGOWANIE PROCESU OPTYMALIZACJI - ${new Date().toLocaleString()} ===\n\n`, 'utf8');
        }
        this.log('Debugger zainicjalizowany', 'basic');
    }
    /**
     * Loguje wiadomość z określonym poziomem szczegółowości
     */
    log(message, level = 'basic') {
        // Sprawdzenie czy ten poziom logowania jest włączony
        const levelPriority = { 'basic': 0, 'detailed': 1, 'verbose': 2 };
        if (levelPriority[level] > levelPriority[this.options.logLevel]) {
            return;
        }
        const timestamp = new Date().toLocaleString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        // Logowanie do konsoli
        if (this.options.logToConsole) {
            console.log(logMessage);
        }
        // Logowanie do pliku
        if (this.options.logToFile) {
            fs.appendFileSync(this.logFilePath, logMessage + '\n', 'utf8');
        }
    }
    /**
     * Rozpoczyna debugowanie nowej strategii
     */
    startStrategyOptimization(strategyName, config, trials) {
        this.currentStrategy = strategyName;
        this.currentIteration = 0;
        this.totalIterations = trials;
        this.iterationResults[strategyName] = [];
        this.log(`=== ROZPOCZĘCIE OPTYMALIZACJI STRATEGII: ${strategyName} ===`, 'basic');
        this.log(`Konfiguracja: ${JSON.stringify(config, null, 2)}`, 'detailed');
        this.log(`Liczba prób: ${trials}`, 'basic');
        // Zapisz początkową konfigurację
        if (this.options.saveIntermediateResults) {
            const configDir = path.join(this.options.logDirectory, 'configs');
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            fs.writeFileSync(path.join(configDir, `${strategyName}_config.json`), JSON.stringify(config, null, 2), 'utf8');
        }
    }
    /**
     * Loguje informacje o iteracji optymalizacji
     */
    logIteration(iteration, params, metrics) {
        this.currentIteration = iteration;
        const progress = Math.round((iteration / this.totalIterations) * 100);
        const elapsedTime = this.formatTime(Date.now() - this.startTime);
        this.log(`Iteracja ${iteration}/${this.totalIterations} (${progress}%) - Czas: ${elapsedTime}`, 'basic');
        if (this.options.parameterSteps) {
            this.log(`Parametry: ${JSON.stringify(params)}`, 'detailed');
        }
        const metricsStr = Object.entries(metrics)
            .map(([key, value]) => `${key}: ${typeof value === 'number' ? value.toFixed(4) : value}`)
            .join(', ');
        this.log(`Metryki: ${metricsStr}`, 'detailed');
        // Zapisz wyniki iteracji
        this.iterationResults[this.currentStrategy].push({
            iteration,
            params,
            metrics,
            timestamp: Date.now()
        });
        // Aktualizuj najlepszy wynik jeśli to potrzebne
        this.updateBestResult(params, metrics);
        // Wizualizuj postęp co 10 iteracji
        if (this.options.visualizeProgress && iteration % 10 === 0) {
            this.visualizeProgress();
        }
    }
    /**
     * Aktualizuje informacje o najlepszym wyniku
     */
    updateBestResult(params, metrics) {
        if (!this.bestResults[this.currentStrategy] ||
            (metrics.sharpeRatio > this.bestResults[this.currentStrategy].metrics.sharpeRatio)) {
            this.bestResults[this.currentStrategy] = {
                params,
                metrics,
                iteration: this.currentIteration,
                timestamp: Date.now()
            };
            this.log(`NOWY NAJLEPSZY WYNIK - Sharpe: ${metrics.sharpeRatio.toFixed(4)}`, 'basic');
            this.log(`Parametry: ${JSON.stringify(params)}`, 'basic');
        }
    }
    /**
     * Kończy debugowanie strategii i zapisuje podsumowanie
     */
    finishStrategyOptimization(finalResult) {
        const elapsedTime = this.formatTime(Date.now() - this.startTime);
        this.log(`=== ZAKOŃCZENIE OPTYMALIZACJI STRATEGII: ${this.currentStrategy} ===`, 'basic');
        this.log(`Całkowity czas: ${elapsedTime}`, 'basic');
        this.log(`Najlepszy wynik: ${JSON.stringify(finalResult.bestMetrics, null, 2)}`, 'basic');
        this.log(`Najlepsze parametry: ${JSON.stringify(finalResult.bestParams, null, 2)}`, 'basic');
        // Zapisz podsumowanie
        if (this.options.saveIntermediateResults) {
            const resultsDir = path.join(this.options.logDirectory, 'results');
            if (!fs.existsSync(resultsDir)) {
                fs.mkdirSync(resultsDir, { recursive: true });
            }
            // Zapisz wszystkie iteracje
            fs.writeFileSync(path.join(resultsDir, `${this.currentStrategy}_all_iterations.json`), JSON.stringify(this.iterationResults[this.currentStrategy], null, 2), 'utf8');
            // Zapisz najlepszy wynik
            fs.writeFileSync(path.join(resultsDir, `${this.currentStrategy}_best_result.json`), JSON.stringify(finalResult, null, 2), 'utf8');
        }
        // Generuj pełną wizualizację
        if (this.options.visualizeProgress) {
            this.generateFinalVisualization();
        }
    }
    /**
     * Loguje błąd podczas optymalizacji
     */
    logError(error, iteration, params) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const stackTrace = error instanceof Error ? error.stack : '';
        this.log(`BŁĄD w iteracji ${iteration || 'nieznanej'}:`, 'basic');
        this.log(`Wiadomość: ${errorMessage}`, 'basic');
        if (params) {
            this.log(`Parametry: ${JSON.stringify(params)}`, 'basic');
        }
        if (stackTrace) {
            this.log(`Stack trace: ${stackTrace}`, 'verbose');
        }
        // Zapisz błąd do specjalnego pliku błędów
        if (this.options.logToFile) {
            const errorsDir = path.join(this.options.logDirectory, 'errors');
            if (!fs.existsSync(errorsDir)) {
                fs.mkdirSync(errorsDir, { recursive: true });
            }
            const errorFilePath = path.join(errorsDir, `error_${this.currentStrategy}_iteration_${iteration || 'unknown'}_${Date.now()}.log`);
            fs.writeFileSync(errorFilePath, `ERROR: ${errorMessage}\n\nParams: ${JSON.stringify(params, null, 2)}\n\nStack Trace: ${stackTrace}`, 'utf8');
        }
    }
    /**
     * Generuje wizualizację postępu optymalizacji
     */
    visualizeProgress() {
        if (!this.options.visualizeProgress)
            return;
        const visualsDir = path.join(this.options.logDirectory, 'visualizations');
        if (!fs.existsSync(visualsDir)) {
            fs.mkdirSync(visualsDir, { recursive: true });
        }
        // Generowanie prostego HTML z wykresem postępu
        const iterations = this.iterationResults[this.currentStrategy];
        const sharpeValues = iterations.map(it => it.metrics.sharpeRatio || 0);
        const pnlValues = iterations.map(it => it.metrics.totalPnl || 0);
        const winRateValues = iterations.map(it => it.metrics.winRate || 0);
        const iterationNumbers = iterations.map(it => it.iteration);
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Postęp optymalizacji - ${this.currentStrategy}</title>
            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .chart { width: 100%; height: 400px; }
                h2 { color: #333; }
            </style>
        </head>
        <body>
            <h1>Postęp optymalizacji - ${this.currentStrategy} (Iteracja ${this.currentIteration}/${this.totalIterations})</h1>
            
            <h2>Sharpe Ratio</h2>
            <div id="sharpeChart" class="chart"></div>
            
            <h2>PnL</h2>
            <div id="pnlChart" class="chart"></div>
            
            <h2>Win Rate</h2>
            <div id="winRateChart" class="chart"></div>
            
            <script>
                // Sharpe Ratio Chart
                var sharpeData = [{
                    x: ${JSON.stringify(iterationNumbers)},
                    y: ${JSON.stringify(sharpeValues)},
                    mode: 'lines+markers',
                    type: 'scatter',
                    marker: { size: 6 }
                }];
                
                var sharpeLayout = {
                    title: 'Sharpe Ratio per Iteration',
                    xaxis: { title: 'Iteration' },
                    yaxis: { title: 'Sharpe Ratio' }
                };
                
                Plotly.newPlot('sharpeChart', sharpeData, sharpeLayout);
                
                // PnL Chart
                var pnlData = [{
                    x: ${JSON.stringify(iterationNumbers)},
                    y: ${JSON.stringify(pnlValues)},
                    mode: 'lines+markers',
                    type: 'scatter',
                    marker: { size: 6 }
                }];
                
                var pnlLayout = {
                    title: 'Total PnL per Iteration',
                    xaxis: { title: 'Iteration' },
                    yaxis: { title: 'PnL' }
                };
                
                Plotly.newPlot('pnlChart', pnlData, pnlLayout);
                
                // Win Rate Chart
                var winRateData = [{
                    x: ${JSON.stringify(iterationNumbers)},
                    y: ${JSON.stringify(winRateValues.map(v => v * 100))},
                    mode: 'lines+markers',
                    type: 'scatter',
                    marker: { size: 6 }
                }];
                
                var winRateLayout = {
                    title: 'Win Rate per Iteration',
                    xaxis: { title: 'Iteration' },
                    yaxis: { title: 'Win Rate (%)' }
                };
                
                Plotly.newPlot('winRateChart', winRateData, winRateLayout);
            </script>
        </body>
        </html>
        `;
        fs.writeFileSync(path.join(visualsDir, `progress_${this.currentStrategy}_iteration_${this.currentIteration}.html`), htmlContent, 'utf8');
        this.log(`Wygenerowano wizualizację postępu dla iteracji ${this.currentIteration}`, 'detailed');
    }
    /**
     * Generuje końcową wizualizację wyników optymalizacji
     */
    generateFinalVisualization() {
        if (!this.options.visualizeProgress)
            return;
        const visualsDir = path.join(this.options.logDirectory, 'visualizations');
        if (!fs.existsSync(visualsDir)) {
            fs.mkdirSync(visualsDir, { recursive: true });
        }
        // Generowanie bardziej zaawansowanego raportu HTML
        const iterations = this.iterationResults[this.currentStrategy];
        // Przygotowanie danych do wykresów parametrów
        const paramNames = Object.keys(iterations[0].params);
        const paramData = paramNames.map(param => ({
            name: param,
            values: iterations.map(it => it.params[param])
        }));
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Raport optymalizacji - ${this.currentStrategy}</title>
            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .chart { width: 100%; height: 400px; margin-bottom: 40px; }
                h2 { color: #333; margin-top: 30px; }
                .summary { 
                    background-color: #f5f5f5; 
                    padding: 15px; 
                    border-radius: 5px;
                    margin-bottom: 20px;
                }
                .best-params {
                    background-color: #e6f7ff;
                    padding: 15px;
                    border-radius: 5px;
                    border-left: 5px solid #1890ff;
                }
                .metric-value {
                    font-weight: bold;
                    font-size: 18px;
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
                .param-charts {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
                    gap: 20px;
                }
            </style>
        </head>
        <body>
            <h1>Raport końcowy optymalizacji - ${this.currentStrategy}</h1>
            
            <div class="summary">
                <h2>Podsumowanie</h2>
                <p>Liczba iteracji: <span class="metric-value">${this.totalIterations}</span></p>
                <p>Czas trwania: <span class="metric-value">${this.formatTime(Date.now() - this.startTime)}</span></p>
            </div>
            
            <div class="best-params">
                <h2>Najlepszy wynik</h2>
                <p>Sharpe Ratio: <span class="metric-value">${this.bestResults[this.currentStrategy].metrics.sharpeRatio.toFixed(4)}</span></p>
                <p>PnL: <span class="metric-value">${this.bestResults[this.currentStrategy].metrics.totalPnl?.toFixed(2) || 'N/A'}</span></p>
                <p>Win Rate: <span class="metric-value">${(this.bestResults[this.currentStrategy].metrics.winRate * 100).toFixed(2)}%</span></p>
                <p>Parametry:</p>
                <table>
                    <tr>
                        <th>Parametr</th>
                        <th>Wartość</th>
                    </tr>
                    ${Object.entries(this.bestResults[this.currentStrategy].params)
            .map(([key, value]) => `<tr><td>${key}</td><td>${value}</td></tr>`)
            .join('')}
                </table>
            </div>
            
            <h2>Postęp optymalizacji</h2>
            <div id="progressChart" class="chart"></div>
            
            <h2>Wpływ parametrów na Sharpe Ratio</h2>
            <div class="param-charts">
                ${paramNames.map(param => `
                    <div>
                        <h3>Parametr: ${param}</h3>
                        <div id="param_${param}_chart" class="chart"></div>
                    </div>
                `).join('')}
            </div>
            
            <h2>Top 10 najlepszych wyników</h2>
            <table>
                <tr>
                    <th>Rank</th>
                    <th>Sharpe Ratio</th>
                    <th>PnL</th>
                    <th>Win Rate</th>
                    ${paramNames.map(param => `<th>${param}</th>`).join('')}
                </tr>
                ${iterations
            .sort((a, b) => (b.metrics.sharpeRatio || 0) - (a.metrics.sharpeRatio || 0))
            .slice(0, 10)
            .map((it, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td>${it.metrics.sharpeRatio?.toFixed(4) || 'N/A'}</td>
                            <td>${it.metrics.totalPnl?.toFixed(2) || 'N/A'}</td>
                            <td>${(it.metrics.winRate * 100)?.toFixed(2) || 'N/A'}%</td>
                            ${paramNames.map(param => `<td>${it.params[param]}</td>`).join('')}
                        </tr>
                    `).join('')}
            </table>
            
            <script>
                // Progress Chart
                var progressData = [{
                    x: ${JSON.stringify(iterations.map(it => it.iteration))},
                    y: ${JSON.stringify(iterations.map(it => it.metrics.sharpeRatio || 0))},
                    mode: 'lines+markers',
                    type: 'scatter',
                    name: 'Sharpe Ratio',
                    marker: { size: 6, color: '#1890ff' }
                }];
                
                var progressLayout = {
                    title: 'Postęp optymalizacji - Sharpe Ratio',
                    xaxis: { title: 'Iteracja' },
                    yaxis: { title: 'Sharpe Ratio' }
                };
                
                Plotly.newPlot('progressChart', progressData, progressLayout);
                
                // Parameter Charts
                ${paramNames.map(param => `
                    var ${param}Data = [{
                        x: ${JSON.stringify(iterations.map(it => it.params[param]))},
                        y: ${JSON.stringify(iterations.map(it => it.metrics.sharpeRatio || 0))},
                        mode: 'markers',
                        type: 'scatter',
                        marker: { 
                            size: 8,
                            color: ${JSON.stringify(iterations.map(it => it.metrics.sharpeRatio || 0))},
                            colorscale: 'Viridis',
                            colorbar: {title: 'Sharpe Ratio'}
                        }
                    }];
                    
                    var ${param}Layout = {
                        title: 'Wpływ ${param} na Sharpe Ratio',
                        xaxis: { title: '${param}' },
                        yaxis: { title: 'Sharpe Ratio' },
                        hovermode: 'closest'
                    };
                    
                    Plotly.newPlot('param_${param}_chart', ${param}Data, ${param}Layout);
                `).join('')}
            </script>
        </body>
        </html>
        `;
        fs.writeFileSync(path.join(visualsDir, `final_report_${this.currentStrategy}.html`), htmlContent, 'utf8');
        this.log(`Wygenerowano końcowy raport optymalizacji dla strategii ${this.currentStrategy}`, 'basic');
    }
    /**
     * Formatuje czas w milisekundach do postaci czytelnej dla człowieka
     */
    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    /**
     * Generuje raport podsumowujący cały proces optymalizacji
     * @param outputDir Katalog do zapisania raportu
     */
    generateSummaryReport(outputDir) {
        const timestamp = Date.now();
        const reportDir = path.join(outputDir, `optimization_debug_report_${timestamp}`);
        // Utwórz katalog raportu
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        // Zapisz podstawowe informacje o debugowaniu
        const summaryData = {
            debugStartTime: this.startTime,
            debugEndTime: Date.now(),
            totalDuration: (Date.now() - this.startTime) / 1000,
            strategies: Object.keys(this.bestResults),
            bestResults: this.bestResults,
            iterationCounts: Object.fromEntries(Object.entries(this.iterationResults).map(([strategy, results]) => [strategy, results.length]))
        };
        fs.writeFileSync(path.join(reportDir, 'debug_summary.json'), JSON.stringify(summaryData, null, 2));
        // Generuj raport HTML
        this.generateHtmlReport(reportDir, summaryData);
        this.log('Podsumowanie debugowania', 'basic');
        console.log(`Wygenerowano raport debugowania w: ${reportDir}`);
    }
    /**
     * Generuje raport HTML z informacjami o debugowaniu
     */
    generateHtmlReport(reportDir, summaryData) {
        // Przygotuj dane do wykresów
        const chartData = Object.entries(this.iterationResults).map(([strategy, iterations]) => {
            const metrics = iterations.map(iteration => iteration.metrics);
            // Oblicz średnie, min, max dla kluczowych metryk
            const sharpeValues = metrics.map(m => m.sharpeRatio).filter(v => !isNaN(v));
            const pnlValues = metrics.map(m => m.totalPnl).filter(v => !isNaN(v));
            const winRateValues = metrics.map(m => m.winRate).filter(v => !isNaN(v));
            return {
                strategy,
                iterations: iterations.length,
                metrics: {
                    sharpeRatio: {
                        avg: this.average(sharpeValues),
                        min: Math.min(...sharpeValues),
                        max: Math.max(...sharpeValues)
                    },
                    totalPnl: {
                        avg: this.average(pnlValues),
                        min: Math.min(...pnlValues),
                        max: Math.max(...pnlValues)
                    },
                    winRate: {
                        avg: this.average(winRateValues),
                        min: Math.min(...winRateValues),
                        max: Math.max(...winRateValues)
                    }
                },
                bestResult: this.bestResults[strategy]
            };
        });
        // Wygeneruj HTML
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Raport Debugowania Optymalizacji</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .container { max-width: 1200px; margin: 0 auto; }
                .summary-box { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                .strategy-box { background-color: #eef6ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                h1, h2, h3 { color: #333; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .metric-highlight { font-weight: bold; color: #0066cc; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Raport Debugowania Optymalizacji</h1>
                
                <div class="summary-box">
                    <h2>Podsumowanie</h2>
                    <p>Czas rozpoczęcia: ${new Date(this.startTime).toLocaleString()}</p>
                    <p>Czas zakończenia: ${new Date().toLocaleString()}</p>
                    <p>Całkowity czas: ${((Date.now() - this.startTime) / 60000).toFixed(2)} minut</p>
                    <p>Liczba strategii: ${Object.keys(this.bestResults).length}</p>
                </div>
                
                ${chartData.map(data => `
                <div class="strategy-box">
                    <h2>Strategia: ${data.strategy}</h2>
                    <p>Liczba iteracji: ${data.iterations}</p>
                    
                    <h3>Metryki</h3>
                    <table>
                        <tr>
                            <th>Metryka</th>
                            <th>Średnia</th>
                            <th>Minimum</th>
                            <th>Maximum</th>
                            <th>Najlepsza wartość</th>
                        </tr>
                        <tr>
                            <td>Sharpe Ratio</td>
                            <td>${data.metrics.sharpeRatio.avg.toFixed(4)}</td>
                            <td>${data.metrics.sharpeRatio.min.toFixed(4)}</td>
                            <td>${data.metrics.sharpeRatio.max.toFixed(4)}</td>
                            <td class="metric-highlight">${data.bestResult?.metrics?.sharpeRatio?.toFixed(4) || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td>Total PnL</td>
                            <td>${data.metrics.totalPnl.avg.toFixed(2)}</td>
                            <td>${data.metrics.totalPnl.min.toFixed(2)}</td>
                            <td>${data.metrics.totalPnl.max.toFixed(2)}</td>
                            <td class="metric-highlight">${data.bestResult?.metrics?.totalPnl?.toFixed(2) || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td>Win Rate</td>
                            <td>${(data.metrics.winRate.avg * 100).toFixed(2)}%</td>
                            <td>${(data.metrics.winRate.min * 100).toFixed(2)}%</td>
                            <td>${(data.metrics.winRate.max * 100).toFixed(2)}%</td>
                            <td class="metric-highlight">${(data.bestResult?.metrics?.winRate * 100)?.toFixed(2) || 'N/A'}%</td>
                        </tr>
                    </table>
                    
                    <h3>Najlepsze parametry</h3>
                    <pre>${JSON.stringify(data.bestResult?.params || {}, null, 2)}</pre>
                </div>
                `).join('')}
            </div>
        </body>
        </html>
        `;
        fs.writeFileSync(path.join(reportDir, 'debug_report.html'), html);
    }
    /**
     * Pomocnicza metoda do obliczania średniej wartości z tablicy
     */
    average(values) {
        if (values.length === 0)
            return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
}
exports.OptimizationDebugger = OptimizationDebugger;
// Eksport instancji debuggera z domyślnymi opcjami
exports.optimizationDebugger = new OptimizationDebugger();

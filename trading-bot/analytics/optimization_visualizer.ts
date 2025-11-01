/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// ============================================================================
//  optimization_visualizer.ts - WIZUALIZACJA WYNIKÓW OPTYMALIZACJI
//  Ten moduł generuje wykresy i wizualizacje dla lepszego zrozumienia 
//  wyników optymalizacji strategii tradingowych.
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

/**
 * Generuje pliki HTML z interaktywnymi wykresami dla wyników optymalizacji.
 * @param results Wyniki optymalizacji
 * @param outputDir Katalog wyjściowy na wykresy
 * @param strategyName Nazwa strategii
 */
export function generateOptimizationVisualizations(
    results: any, 
    outputDir: string, 
    strategyName: string
): void {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Przygotowanie danych do wykresów
    const paramData = prepareParameterImportanceData(results);
    const metricData = prepareMetricsData(results);
    
    // Generowanie wykresu rozrzutu wartości parametrów
    generateParameterScatterPlots(paramData, outputDir, strategyName);
    
    // Generowanie wykresu ważności parametrów
    generateParameterImportanceChart(paramData, outputDir, strategyName);
    
    // Generowanie wykresu porównania metryk
    generateMetricsComparisonChart(metricData, outputDir, strategyName);
    
    // Generowanie tablicy wyników (top 10)
    generateResultsTable(results, outputDir, strategyName);
    
    // Generowanie głównego raportu HTML
    generateMainReport(outputDir, strategyName, [
        `parameter_scatter_${strategyName}.html`,
        `parameter_importance_${strategyName}.html`,
        `metrics_comparison_${strategyName}.html`,
        `results_table_${strategyName}.html`
    ]);
    
    console.log(`Wizualizacje wyników optymalizacji zapisane w: ${outputDir}`);
}

/**
 * Przygotowuje dane do analizy ważności parametrów
 */
function prepareParameterImportanceData(results: any): any {
    // Przykładowa implementacja, należy dostosować do struktury wyników
    const trials = results.trials || [];
    const paramNames = trials.length > 0 ? Object.keys(trials[0].params || {}) : [];
    
    const paramData = paramNames.map(paramName => {
        const values = trials.map((trial: any) => ({
            value: trial.params[paramName],
            metric: trial.value || 0
        }));
        
        return {
            name: paramName,
            values: values,
            correlation: calculateCorrelation(
                values.map((v: any) => v.value), 
                values.map((v: any) => v.metric)
            )
        };
    });
    
    return paramData;
}

/**
 * Przygotowuje dane dla wykresów metryk
 */
function prepareMetricsData(results: any): any {
    // Przykładowa implementacja, należy dostosować do struktury wyników
    const trials = results.trials || [];
    
    return trials.map((trial: any, index: number) => ({
        trialNumber: index + 1,
        params: trial.params || {},
        sharpeRatio: trial.value || 0,
        pnl: trial.metrics?.totalPnl || 0,
        winRate: trial.metrics?.winRate || 0,
        maxDrawdown: trial.metrics?.maxDrawdown || 0
    }));
}

/**
 * Oblicza współczynnik korelacji Pearsona
 */
function calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
    const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Generuje wykresy rozrzutu dla każdego parametru
 */
function generateParameterScatterPlots(
    paramData: any[], 
    outputDir: string, 
    strategyName: string
): void {
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Analiza parametrów - ${strategyName}</title>
        <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .chart-container { width: 100%; height: 400px; margin-bottom: 30px; }
            h1, h2 { color: #333; }
        </style>
    </head>
    <body>
        <h1>Analiza wpływu parametrów na wyniki - ${strategyName}</h1>
        
        <div class="charts">
            ${paramData.map(param => `
                <h2>Parametr: ${param.name} (korelacja: ${param.correlation.toFixed(4)})</h2>
                <div id="chart-${param.name}" class="chart-container"></div>
                <script>
                    var data = [{
                        x: ${JSON.stringify(param.values.map((v: any) => v.value))},
                        y: ${JSON.stringify(param.values.map((v: any) => v.metric))},
                        mode: 'markers',
                        type: 'scatter',
                        marker: {
                            size: 8,
                            color: '#1f77b4',
                            opacity: 0.7
                        },
                        name: '${param.name}'
                    }];
                    
                    var layout = {
                        title: 'Wpływ ${param.name} na Sharpe Ratio',
                        xaxis: { title: '${param.name}' },
                        yaxis: { title: 'Sharpe Ratio' },
                        hovermode: 'closest'
                    };
                    
                    Plotly.newPlot('chart-${param.name}', data, layout);
                </script>
            `).join('')}
        </div>
    </body>
    </html>
    `;
    
    fs.writeFileSync(
        path.join(outputDir, `parameter_scatter_${strategyName}.html`), 
        htmlContent
    );
}

/**
 * Generuje wykres ważności parametrów
 */
function generateParameterImportanceChart(
    paramData: any[], 
    outputDir: string, 
    strategyName: string
): void {
    // Sortujemy parametry według wartości bezwzględnej korelacji
    const sortedParams = [...paramData].sort(
        (a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)
    );
    
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ważność parametrów - ${strategyName}</title>
        <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .chart-container { width: 100%; height: 500px; margin-bottom: 30px; }
            h1 { color: #333; }
        </style>
    </head>
    <body>
        <h1>Ważność parametrów - ${strategyName}</h1>
        
        <div id="importance-chart" class="chart-container"></div>
        
        <script>
            var data = [{
                y: ${JSON.stringify(sortedParams.map(p => p.name))},
                x: ${JSON.stringify(sortedParams.map(p => Math.abs(p.correlation)))},
                type: 'bar',
                orientation: 'h',
                marker: {
                    color: ${JSON.stringify(sortedParams.map(p => 
                        p.correlation > 0 ? 'rgba(50, 171, 96, 0.7)' : 'rgba(219, 64, 82, 0.7)'
                    ))},
                    line: {
                        color: ${JSON.stringify(sortedParams.map(p => 
                            p.correlation > 0 ? 'rgba(50, 171, 96, 1.0)' : 'rgba(219, 64, 82, 1.0)'
                        ))},
                        width: 1
                    }
                }
            }];
            
            var layout = {
                title: 'Ważność parametrów (według korelacji z Sharpe Ratio)',
                xaxis: { 
                    title: 'Bezwzględna wartość korelacji',
                    range: [0, 1]
                },
                yaxis: { 
                    title: 'Parametr'
                },
                margin: {
                    l: 150,
                    r: 50,
                    t: 50,
                    b: 50
                }
            };
            
            Plotly.newPlot('importance-chart', data, layout);
        </script>
    </body>
    </html>
    `;
    
    fs.writeFileSync(
        path.join(outputDir, `parameter_importance_${strategyName}.html`), 
        htmlContent
    );
}

/**
 * Generuje wykres porównania różnych metryk
 */
function generateMetricsComparisonChart(
    metricData: any[], 
    outputDir: string, 
    strategyName: string
): void {
    // Sortujemy wyniki według Sharpe Ratio
    const sortedData = [...metricData].sort((a, b) => b.sharpeRatio - a.sharpeRatio);
    const top20 = sortedData.slice(0, 20);
    
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Porównanie metryk - ${strategyName}</title>
        <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .chart-container { width: 100%; height: 500px; margin-bottom: 30px; }
            h1 { color: #333; }
        </style>
    </head>
    <body>
        <h1>Porównanie metryk dla najlepszych zestawów parametrów - ${strategyName}</h1>
        
        <div id="metrics-chart" class="chart-container"></div>
        
        <script>
            var trace1 = {
                x: ${JSON.stringify(top20.map(d => d.trialNumber))},
                y: ${JSON.stringify(top20.map(d => d.sharpeRatio))},
                name: 'Sharpe Ratio',
                type: 'bar'
            };
            
            var trace2 = {
                x: ${JSON.stringify(top20.map(d => d.trialNumber))},
                y: ${JSON.stringify(top20.map(d => d.winRate * 100))},
                name: 'Win Rate (%)',
                yaxis: 'y2',
                type: 'scatter',
                mode: 'lines+markers'
            };
            
            var trace3 = {
                x: ${JSON.stringify(top20.map(d => d.trialNumber))},
                y: ${JSON.stringify(top20.map(d => d.maxDrawdown * 100))},
                name: 'Max Drawdown (%)',
                yaxis: 'y3',
                type: 'scatter',
                mode: 'lines+markers'
            };
            
            var data = [trace1, trace2, trace3];
            
            var layout = {
                title: 'Porównanie metryk dla top 20 zestawów parametrów',
                grid: {
                    rows: 3,
                    columns: 1,
                    pattern: 'independent',
                    roworder: 'top to bottom'
                },
                xaxis: {title: 'Numer próby'},
                yaxis: {title: 'Sharpe Ratio'},
                yaxis2: {title: 'Win Rate (%)'},
                yaxis3: {title: 'Max Drawdown (%)'},
            };
            
            Plotly.newPlot('metrics-chart', data, layout);
        </script>
    </body>
    </html>
    `;
    
    fs.writeFileSync(
        path.join(outputDir, `metrics_comparison_${strategyName}.html`), 
        htmlContent
    );
}

/**
 * Generuje tabelę z najlepszymi wynikami optymalizacji
 */
function generateResultsTable(
    results: any, 
    outputDir: string, 
    strategyName: string
): void {
    const trials = results.trials || [];
    const sortedTrials = [...trials].sort((a, b) => (b.value || 0) - (a.value || 0));
    const top10 = sortedTrials.slice(0, 10);
    
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Najlepsze wyniki - ${strategyName}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
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
                font-weight: bold;
            }
            tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            tr:hover {
                background-color: #f1f1f1;
            }
            .metric-good {
                color: green;
                font-weight: bold;
            }
            .metric-bad {
                color: red;
            }
        </style>
    </head>
    <body>
        <h1>Top 10 najlepszych wyników - ${strategyName}</h1>
        
        <table>
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Sharpe Ratio</th>
                    <th>PnL</th>
                    <th>Win Rate</th>
                    <th>Liczba transakcji</th>
                    <th>Max Drawdown</th>
                    ${Object.keys(top10[0]?.params || {}).map(param => `<th>${param}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${top10.map((trial, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td class="metric-good">${(trial.value || 0).toFixed(4)}</td>
                    <td>${(trial.metrics?.totalPnl || 0).toFixed(2)}</td>
                    <td>${((trial.metrics?.winRate || 0) * 100).toFixed(1)}%</td>
                    <td>${trial.metrics?.tradeCount || 0}</td>
                    <td class="metric-bad">${((trial.metrics?.maxDrawdown || 0) * 100).toFixed(2)}%</td>
                    ${Object.values(trial.params || {}).map(val => `<td>${val}</td>`).join('')}
                </tr>
                `).join('')}
            </tbody>
        </table>
    </body>
    </html>
    `;
    
    fs.writeFileSync(
        path.join(outputDir, `results_table_${strategyName}.html`), 
        htmlContent
    );
}

/**
 * Generuje główny raport HTML łączący wszystkie wizualizacje
 */
function generateMainReport(
    outputDir: string, 
    strategyName: string, 
    reportFiles: string[]
): void {
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Raport optymalizacji - ${strategyName}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
            header { 
                background-color: #2c3e50; 
                color: white; 
                padding: 20px;
                text-align: center;
            }
            nav {
                background-color: #34495e;
                overflow: hidden;
            }
            nav a {
                float: left;
                display: block;
                color: white;
                text-align: center;
                padding: 14px 16px;
                text-decoration: none;
            }
            nav a:hover {
                background-color: #ddd;
                color: black;
            }
            .content {
                padding: 20px;
            }
            iframe {
                width: 100%;
                height: 800px;
                border: none;
            }
        </style>
    </head>
    <body>
        <header>
            <h1>Raport optymalizacji strategii ${strategyName}</h1>
            <p>Wygenerowano: ${new Date().toLocaleString()}</p>
        </header>
        
        <nav>
            ${reportFiles.map((file, i) => `
                <a href="#" onclick="showReport(${i})">${getReportTitle(file)}</a>
            `).join('')}
        </nav>
        
        <div class="content">
            <iframe id="report-frame" src="${reportFiles[0]}"></iframe>
        </div>
        
        <script>
            const reports = ${JSON.stringify(reportFiles)};
            
            function showReport(index) {
                document.getElementById('report-frame').src = reports[index];
                return false;
            }
        </script>
    </body>
    </html>
    `;
    
    fs.writeFileSync(
        path.join(outputDir, `optimization_report_${strategyName}.html`), 
        htmlContent
    );
}

/**
 * Zwraca czytelny tytuł raportu na podstawie nazwy pliku
 */
function getReportTitle(filename: string): string {
    if (filename.includes('parameter_scatter')) return 'Wykresy parametrów';
    if (filename.includes('parameter_importance')) return 'Ważność parametrów';
    if (filename.includes('metrics_comparison')) return 'Porównanie metryk';
    if (filename.includes('results_table')) return 'Najlepsze wyniki';
    return filename;
}

// ============================================================================
//  parameter_visualization.ts - WIZUALIZACJE ANALIZY PARAMETRÓW
//  Ten moduł implementuje funkcje do generowania wizualizacji dla analizy
//  wrażliwości parametrów, ich stabilności w czasie oraz wyników strategii.
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

// W pełnej implementacji użylibyśmy biblioteki do generowania wykresów
// takiej jak Chart.js, plotly lub d3.js. W tej symulacji generujemy
// dane do wizualizacji, które mogą być później użyte przez zewnętrzne narzędzia.

// Generowanie danych do wykresu wrażliwości parametru
export function generateSensitivityChartData(
    paramName: string, 
    paramValues: number[], 
    metricValues: number[]
) {
    // Upewnij się, że obie tablice mają taką samą długość
    const length = Math.min(paramValues.length, metricValues.length);
    
    const chartData = {
        paramName,
        data: Array.from({ length }, (_, i) => ({
            paramValue: paramValues[i],
            metricValue: metricValues[i]
        }))
    };
    
    return chartData;
}

// Zapisywanie danych do pliku CSV
export function saveChartDataToCsv(
    chartData: any, 
    outputDir: string, 
    fileName: string
) {
    // Utwórz katalog, jeśli nie istnieje
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filePath = path.join(outputDir, fileName);
    
    // Jeśli to dane wrażliwości parametru
    if (chartData.paramName && chartData.data) {
        const header = `${chartData.paramName},metricValue\n`;
        const rows = chartData.data.map((point: any) => 
            `${point.paramValue},${point.metricValue}`
        ).join('\n');
        
        fs.writeFileSync(filePath, header + rows);
    } 
    // Jeśli to dane stabilności parametrów w czasie
    else if (chartData.timeline && chartData.parameters) {
        const paramNames = Object.keys(chartData.parameters);
        const header = ['timestamp', ...paramNames].join(',') + '\n';
        
        const rows = chartData.timeline.map((time: number, i: number) => {
            const values = paramNames.map(param => chartData.parameters[param][i]);
            return [time, ...values].join(',');
        }).join('\n');
        
        fs.writeFileSync(filePath, header + rows);
    }
    // Jeśli to dane krzywej kapitału
    else if (chartData.timestamps && chartData.navValues) {
        const header = 'timestamp,nav\n';
        const rows = chartData.timestamps.map((time: number, i: number) => 
            `${time},${chartData.navValues[i]}`
        ).join('\n');
        
        fs.writeFileSync(filePath, header + rows);
    }
    
    console.log(`Dane wykresu zapisane w: ${filePath}`);
    
    return filePath;
}

// Generowanie danych do wykresu stabilności parametrów w czasie
export function generateParameterStabilityChartData(
    experimentResults: any[]
) {
    if (experimentResults.length === 0) return null;
    
    // Sortuj eksperymenty według czasu
    const sortedResults = [...experimentResults].sort((a, b) => a.startTime - b.startTime);
    
    // Zbierz wszystkie unikalne nazwy parametrów
    const allParamNames = new Set<string>();
    sortedResults.forEach(result => {
        Object.keys(result.bestParams || {}).forEach(paramName => {
            allParamNames.add(paramName);
        });
    });
    
    // Przygotuj dane do wykresu
    const timeline = sortedResults.map(result => result.startTime);
    const parameters: Record<string, number[]> = {};
    
    allParamNames.forEach(paramName => {
        parameters[paramName] = sortedResults.map(result => 
            result.bestParams ? result.bestParams[paramName] : null
        );
    });
    
    return { timeline, parameters };
}

// Generowanie danych do wykresu krzywej kapitału dla wielu eksperymentów
export function generateComparisonEquityCurveData(
    equityCurves: Array<{ 
        id: string, 
        data: Array<{ timestamp: number, nav: number }> 
    }>
) {
    if (equityCurves.length === 0) return null;
    
    // Znajdź wspólny zakres czasowy dla wszystkich krzywych
    const startTimes = equityCurves.map(curve => curve.data[0].timestamp);
    const endTimes = equityCurves.map(curve => curve.data[curve.data.length - 1].timestamp);
    
    const commonStartTime = Math.max(...startTimes);
    const commonEndTime = Math.min(...endTimes);
    
    // Przygotuj dane do wykresu
    const result: Record<string, any> = {
        timeRange: { start: commonStartTime, end: commonEndTime },
        curves: {}
    };
    
    equityCurves.forEach(curve => {
        // Filtruj punkty tylko z wspólnego zakresu czasowego
        const filteredData = curve.data.filter(point => 
            point.timestamp >= commonStartTime && point.timestamp <= commonEndTime
        );
        
        // Normalizuj wartości NAV, aby wszystkie krzywe zaczynały się od 100
        const initialNav = filteredData.length > 0 ? filteredData[0].nav : 1;
        const normalizedData = filteredData.map(point => ({
            timestamp: point.timestamp,
            nav: (point.nav / initialNav) * 100
        }));
        
        result.curves[curve.id] = {
            timestamps: normalizedData.map(point => point.timestamp),
            navValues: normalizedData.map(point => point.nav)
        };
    });
    
    return result;
}

// Generowanie raportów HTML z wizualizacjami
export function generateHtmlReport(
    reportData: any,
    outputDir: string,
    reportName: string
) {
    // Upewnij się, że katalog istnieje
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const htmlPath = path.join(outputDir, `${reportName}.html`);
    
    // W pełnej implementacji, generowalibyśmy rzeczywisty plik HTML
    // z interaktywnymi wykresami. Na potrzeby symulacji, tworzymy
    // prosty raport z linkami do plików CSV.
    
    // Dane do raportu zależą od typu raportu
    let reportContent = '';
    
    // Dla wrażliwości parametrów
    if (reportData.paramName && reportData.data) {
        reportContent = `
            <h2>Analiza wrażliwości parametru: ${reportData.paramName}</h2>
            <p>Ten raport pokazuje, jak zmiana wartości parametru ${reportData.paramName} wpływa na wyniki strategii.</p>
            <div id="sensitivity-chart"></div>
            <table>
                <tr>
                    <th>Wartość parametru</th>
                    <th>Wartość metryki</th>
                </tr>
                ${reportData.data.map((point: any) => `
                    <tr>
                        <td>${point.paramValue}</td>
                        <td>${point.metricValue !== null ? point.metricValue.toFixed(4) : 'N/A'}</td>
                    </tr>
                `).join('')}
            </table>
        `;
    }
    // Dla stabilności parametrów
    else if (reportData.timeline && reportData.parameters) {
        const paramNames = Object.keys(reportData.parameters);
        reportContent = `
            <h2>Analiza stabilności parametrów w czasie</h2>
            <p>Ten raport pokazuje, jak zmieniały się optymalne wartości parametrów w czasie.</p>
            <div id="stability-chart"></div>
            <table>
                <tr>
                    <th>Data</th>
                    ${paramNames.map(name => `<th>${name}</th>`).join('')}
                </tr>
                ${reportData.timeline.map((time: number, i: number) => `
                    <tr>
                        <td>${new Date(time).toLocaleDateString()}</td>
                        ${paramNames.map(param => `
                            <td>${reportData.parameters[param][i] !== null ? reportData.parameters[param][i] : 'N/A'}</td>
                        `).join('')}
                    </tr>
                `).join('')}
            </table>
        `;
    }
    // Dla porównania krzywych kapitału
    else if (reportData.curves) {
        const curveIds = Object.keys(reportData.curves);
        reportContent = `
            <h2>Porównanie krzywych kapitału</h2>
            <p>Ten raport porównuje wyniki różnych strategii lub zestawów parametrów.</p>
            <div id="equity-comparison-chart"></div>
            <p>Zakres czasowy: ${new Date(reportData.timeRange.start).toLocaleDateString()} - ${new Date(reportData.timeRange.end).toLocaleDateString()}</p>
            <table>
                <tr>
                    <th>ID</th>
                    <th>Początkowa wartość</th>
                    <th>Końcowa wartość</th>
                    <th>Zmiana</th>
                </tr>
                ${curveIds.map(id => {
                    const curve = reportData.curves[id];
                    const startNav = curve.navValues[0];
                    const endNav = curve.navValues[curve.navValues.length - 1];
                    const change = ((endNav - startNav) / startNav) * 100;
                    return `
                        <tr>
                            <td>${id}</td>
                            <td>100.00</td>
                            <td>${endNav.toFixed(2)}</td>
                            <td>${change.toFixed(2)}%</td>
                        </tr>
                    `;
                }).join('')}
            </table>
        `;
    }
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${reportName}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1, h2 { color: #333; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
    </head>
    <body>
        <h1>${reportName}</h1>
        ${reportContent}
        <p><i>Raport wygenerowany: ${new Date().toLocaleString()}</i></p>
    </body>
    </html>
    `;
    
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`Raport HTML wygenerowany: ${htmlPath}`);
    
    return htmlPath;
}

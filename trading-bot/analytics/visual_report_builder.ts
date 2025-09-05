import * as fs from 'fs';
import * as path from 'path';

// Główna funkcja do generowania raportu wizualnego z historii NAV
export function generateNavChart(navHistory: { timestamp: number, nav: number }[], outputDir: string) {
    const chartData = navHistory.map(p => ({ x: p.timestamp / 1000, y: p.nav }));

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Equity Curve</title>
        <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background-color: #f4f4f9; color: #333; }
            h1 { color: #444; text-align: center; }
            .chart { border: 1px solid #ddd; box-shadow: 0 2px 5px rgba(0,0,0,0.1); background-color: white; }
        </style>
    </head>
    <body>
        <h1>Equity Curve (NAV)</h1>
        <div id="equityChart" class="chart"></div>
        <script>
            const equityData = [{
                x: ${JSON.stringify(chartData.map(d => new Date(d.x * 1000)))},
                y: ${JSON.stringify(chartData.map(d => d.y))},
                type: 'scatter',
                mode: 'lines',
                name: 'NAV',
                line: { color: '#17BECF', width: 2 }
            }];

            const layout = {
                title: 'Portfolio Net Asset Value (NAV) Over Time',
                xaxis: { title: 'Date' },
                yaxis: { title: 'Net Asset Value ($)' }
            };

            Plotly.newPlot('equityChart', equityData, layout);
        </script>
    </body>
    </html>
    `;

    fs.writeFileSync(path.join(outputDir, 'equity_curve_nav.html'), htmlContent, 'utf-8');
}

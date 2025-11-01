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
exports.generateNavChart = generateNavChart;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Główna funkcja do generowania raportu wizualnego z historii NAV
function generateNavChart(navHistory, outputDir) {
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

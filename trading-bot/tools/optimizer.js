"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runOptimization = runOptimization;
const optuna_optimizer_1 = require("./optuna_optimizer");
/**
 * Generuje wszystkie możliwe kombinacje parametrów.
 */
function generateParamCombinations(ranges) {
    const keys = Object.keys(ranges);
    if (keys.length === 0)
        return [{}];
    const combinations = [];
    const firstKey = keys[0];
    const firstValues = ranges[firstKey];
    const remainingRanges = { ...ranges };
    delete remainingRanges[firstKey];
    const remainingCombinations = generateParamCombinations(remainingRanges);
    for (const value of firstValues) {
        for (const combination of remainingCombinations) {
            combinations.push({ [firstKey]: value, ...combination });
        }
    }
    return combinations;
}
/**
 * Uruchamia optymalizację strategii, testując różne kombinacje parametrów.
 */
async function runOptimization(config, candles) {
    console.log('Starting Bayesian optimization (Optuna)...');
    await (0, optuna_optimizer_1.runOptunaBayesianOptimization)();
    console.log('Optimization completed.');
}
/**
 * Generuje raport HTML podsumowujący wyniki optymalizacji.
 */
function generateOptimizationReport(results, outputDir) {
    const reportPath = path.join(outputDir, 'optimization_summary.html');
    let tableRows = results
        .sort((a, b) => (b.stats.netProfit ?? 0) - (a.stats.netProfit ?? 0)) // Sortuj od najlepszego wyniku
        .map(res => {
        const params = JSON.stringify(res.params);
        const stats = res.stats;
        return `
            <tr>
                <td><code>${params}</code></td>
                <td>${stats.netProfit?.toFixed(2) ?? 'N/A'}</td>
                <td>${stats.totalTrades ?? 'N/A'}</td>
                <td>${stats.winRate?.toFixed(2) ?? 'N/A'}%</td>
                <td>${stats.profitFactor?.toFixed(2) ?? 'N/A'}</td>
                <td>${stats.maxDrawdown?.toFixed(2) ?? 'N/A'}%</td>
            </tr>
        `;
    }).join('');
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Optimization Summary</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background-color: #f9f9f9; }
            h1 { text-align: center; color: #333; }
            table { width: 100%; border-collapse: collapse; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            th, td { padding: 12px 15px; border: 1px solid #ddd; text-align: left; }
            thead { background-color: #4CAF50; color: white; }
            tbody tr:nth-child(even) { background-color: #f2f2f2; }
            tbody tr:hover { background-color: #ddd; }
            code { background-color: #eee; padding: 2px 5px; border-radius: 3px; }
        </style>
    </head>
    <body>
        <h1>Optimization Summary</h1>
        <table>
            <thead>
                <tr>
                    <th>Parameters</th>
                    <th>Net Profit ($)</th>
                    <th>Total Trades</th>
                    <th>Win Rate (%)</th>
                    <th>Profit Factor</th>
                    <th>Max Drawdown (%)</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    </body>
    </html>
    `;
    fs.writeFileSync(reportPath, htmlContent, 'utf-8');
    console.log(`\nRaport podsumowujący optymalizację został zapisany w: ${reportPath}`);
}

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
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const STRATEGIES = [
    "RSITurbo",
    "SuperTrend",
    "MACrossover",
    "MomentumConfirm",
    "MomentumPro",
    "EnhancedRSITurbo",
    "AdvancedAdaptive"
];
const INTERVALS = ["m15", "1h", "4h", "1d"];
function runOptunaPythonForStrategyInterval(strategy, interval) {
    const cmd = `python optimize.py ${strategy} ${interval}`;
    const stdout = (0, child_process_1.execSync)(cmd, { encoding: 'utf-8' }).trim();
    return JSON.parse(stdout);
}
function generateExtendedTable(results) {
    const header = `| Strategy | Interval | Sharpe | Net Profit | Trades | Win Trades | Loss Trades | Avg Profit | Avg Loss | Max Profit | Max Loss | PF | EV | Skew | Kurtosis |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|`;
    const rows = results.map(r => `| ${r.strategy} | ${r.interval} | ${r.best_sharpe.toFixed(2)} | $${r.net_profit.toFixed(2)} | ${r.total_trades} | ${r.winning_trades} | ${r.losing_trades} | $${r.avg_profit.toFixed(2)} | $${r.avg_loss.toFixed(2)} | $${r.max_profit.toFixed(2)} | $${r.max_loss.toFixed(2)} | ${r.profit_factor.toFixed(2)} | ${r.expectancy.toFixed(2)} | ${r.skew.toFixed(2)} | ${r.kurtosis.toFixed(2)} |`).join('\n');
    return header + '\n' + rows;
}
function generateTopTradesSection(res) {
    const profitRows = res.top_profit_trades.map(t => `| ${t.date} | ${t.entry_price.toFixed(2)} | ${t.exit_price.toFixed(2)} | +$${t.pnl.toFixed(2)} |`).join('\n');
    const lossRows = res.top_loss_trades.map(t => `| ${t.date} | ${t.entry_price.toFixed(2)} | ${t.exit_price.toFixed(2)} | $${t.pnl.toFixed(2)} |`).join('\n');
    return `
### Top 5 zyskownych transakcji
| Date | Entry Price | Exit Price | P&L |
|------|-------------|------------|-----|
${profitRows}

### Top 5 stratnych transakcji
| Date | Entry Price | Exit Price | P&L |
|------|-------------|------------|-----|
${lossRows}
`;
}
function generateMarkdownReport(res) {
    return `
# 📈 Optuna Optimization Report (${res.strategy} - ${res.interval})

**Sharpe Ratio (optimize target):** ${res.best_sharpe.toFixed(3)}

## 🔧 Best Parameters
${Object.entries(res.best_params)
        .map(([k, v]) => `- **${k}**: ${v}`)
        .join('\n')}

---

## 🧮 Detailed Backtest Stats

| Metric             | Value               |
|--------------------|---------------------|
| Net Profit         | $${res.net_profit.toFixed(2)}         |
| Total Trades       | ${res.total_trades}                     |
| Winning Trades     | ${res.winning_trades}                  |
| Losing Trades      | ${res.losing_trades}                   |
| Win Rate           | ${(res.winning_trades / res.total_trades * 100).toFixed(1)}% |
| Average Profit     | $${res.avg_profit.toFixed(2)}          |
| Average Loss       | $${res.avg_loss.toFixed(2)}           |
| Max Profit         | $${res.max_profit.toFixed(2)}          |
| Max Loss           | $${res.max_loss.toFixed(2)}           |
| Profit Factor      | ${res.profit_factor.toFixed(2)}        |
| Expectancy (EV)    | ${res.expectancy.toFixed(2)}           |
| Skew               | ${res.skew.toFixed(2)}                 |
| Kurtosis           | ${res.kurtosis.toFixed(2)}             |

${generateTopTradesSection(res)}
`;
}
function saveReport(markdown, outputDir, filename) {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const reportPath = path.join(outputDir, filename);
    fs.writeFileSync(reportPath, markdown, 'utf-8');
    console.log(`Raport zapisany do ${reportPath}`);
}
function generateSummaryTable(results) {
    const header = `| Strategy | Interval | Sharpe | Net Profit | Trades | Win Rate | Profit Factor | EV |
|----------|----------|--------|------------|--------|----------|---------------|----|`;
    const rows = results.map(res => `| ${res.strategy} | ${res.interval} | ${res.best_sharpe.toFixed(2)} | $${res.net_profit.toFixed(2)} | ${res.total_trades} | ${(res.winning_trades / res.total_trades * 100).toFixed(1)}% | ${res.profit_factor.toFixed(2)} | ${res.expectancy.toFixed(2)} |`);
    return [header, ...rows].join('\n');
}
function main() {
    const allResults = [];
    for (const strategy of STRATEGIES) {
        for (const interval of INTERVALS) {
            console.log(`=== Optymalizacja dla strategii: ${strategy}, interwał: ${interval} ===`);
            const result = runOptunaPythonForStrategyInterval(strategy, interval);
            allResults.push(result);
            const md = generateMarkdownReport(result);
            saveReport(md, path.resolve(__dirname, '../reports'), `${strategy}_${interval}_optuna_report.md`);
        }
    }
    // Skumulowany raport
    const summaryMd = `# 📊 Skumulowany raport Optuna (wszystkie strategie i interwały)

${generateExtendedTable(allResults)}
`;
    saveReport(summaryMd, path.resolve(__dirname, '../reports'), 'optuna_summary_report.md');
}
main();

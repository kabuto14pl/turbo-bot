import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface Trade {
  date: string;
  entry_price: number;
  exit_price: number;
  pnl: number;
}

interface OptunaResult {
  strategy: string;
  interval: string;
  best_params: Record<string, number>;
  best_sharpe: number;
  net_profit: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  avg_profit: number;
  avg_loss: number;
  max_profit: number;
  max_loss: number;
  profit_factor: number;
  expectancy: number;
  skew: number;
  kurtosis: number;
  top_profit_trades: Trade[];
  top_loss_trades: Trade[];
}

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

function runOptunaPythonForStrategyInterval(strategy: string, interval: string): OptunaResult {
  const cmd = `python optimize.py ${strategy} ${interval}`;
  const stdout = execSync(cmd, { encoding: 'utf-8' }).trim();
  return JSON.parse(stdout) as OptunaResult;
}

function generateExtendedTable(results: OptunaResult[]) {
  const header = `| Strategy | Interval | Sharpe | Net Profit | Trades | Win Trades | Loss Trades | Avg Profit | Avg Loss | Max Profit | Max Loss | PF | EV | Skew | Kurtosis |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|`;
  const rows = results.map(r =>
    `| ${r.strategy} | ${r.interval} | ${r.best_sharpe.toFixed(2)} | $${r.net_profit.toFixed(2)} | ${r.total_trades} | ${r.winning_trades} | ${r.losing_trades} | $${r.avg_profit.toFixed(2)} | $${r.avg_loss.toFixed(2)} | $${r.max_profit.toFixed(2)} | $${r.max_loss.toFixed(2)} | ${r.profit_factor.toFixed(2)} | ${r.expectancy.toFixed(2)} | ${r.skew.toFixed(2)} | ${r.kurtosis.toFixed(2)} |`
  ).join('\n');
  return header + '\n' + rows;
}

function generateTopTradesSection(res: OptunaResult): string {
  const profitRows = res.top_profit_trades.map(t =>
    `| ${t.date} | ${t.entry_price.toFixed(2)} | ${t.exit_price.toFixed(2)} | +$${t.pnl.toFixed(2)} |`
  ).join('\n');
  const lossRows = res.top_loss_trades.map(t =>
    `| ${t.date} | ${t.entry_price.toFixed(2)} | ${t.exit_price.toFixed(2)} | $${t.pnl.toFixed(2)} |`
  ).join('\n');
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

function generateMarkdownReport(res: OptunaResult): string {
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

function saveReport(markdown: string, outputDir: string, filename: string) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const reportPath = path.join(outputDir, filename);
  fs.writeFileSync(reportPath, markdown, 'utf-8');
  console.log(`Raport zapisany do ${reportPath}`);
}

function generateSummaryTable(results: OptunaResult[]): string {
  const header = `| Strategy | Interval | Sharpe | Net Profit | Trades | Win Rate | Profit Factor | EV |
|----------|----------|--------|------------|--------|----------|---------------|----|`;
  const rows = results.map(res =>
    `| ${res.strategy} | ${res.interval} | ${res.best_sharpe.toFixed(2)} | $${res.net_profit.toFixed(2)} | ${res.total_trades} | ${(res.winning_trades / res.total_trades * 100).toFixed(1)}% | ${res.profit_factor.toFixed(2)} | ${res.expectancy.toFixed(2)} |`
  );
  return [header, ...rows].join('\n');
}

function main() {
  const allResults: OptunaResult[] = [];
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
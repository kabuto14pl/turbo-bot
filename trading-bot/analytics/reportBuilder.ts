import { generateEquityCurve, calculateStats } from './stats';
import { generateEquityCurveHtml } from './charts';
import * as fs from 'fs';
import * as path from 'path';
import { PortfolioAnalytics } from '../core/portfolio/portfolio_analytics';
import { generateExtendedMetricsReport } from './advanced_metrics';

export function buildReport(trades: { pnl: number }[], outputDir: string, analytics?: PortfolioAnalytics, initialCapital: number = 10000) {
  const curve = generateEquityCurve(trades);
  const stats = calculateStats(trades, analytics);
  fs.mkdirSync(outputDir, { recursive: true });
  generateEquityCurveHtml(curve, path.join(outputDir, 'equity_curve.html'));
  fs.writeFileSync(path.join(outputDir, 'stats.json'), JSON.stringify(stats, null, 2), 'utf-8');
  
  // Generowanie rozszerzonych metryk, jeśli dostępna historia NAV
  if (analytics && analytics.getNavHistory) {
    const navHistory = analytics.getNavHistory();
    const extendedMetrics = generateExtendedMetricsReport(
      trades as any[],
      navHistory,
      initialCapital,
      outputDir
    );
    
    // Dodajemy rozszerzone metryki do zwracanych statystyk
    return {
      ...stats,
      sortinoRatio: extendedMetrics.sortinoRatio,
      calmarRatio: extendedMetrics.calmarRatio,
      ulcerIndex: extendedMetrics.ulcerIndex,
      recoveryFactor: extendedMetrics.recoveryFactor,
      expectancy: extendedMetrics.expectancy
    };
  }
  
  // Dodaj generowanie kolejnych wykresów/raportów
  return stats;
}

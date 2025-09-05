import { PortfolioAnalytics } from '../core/portfolio/portfolio_analytics';

export function generateEquityCurve(trades: { pnl: number }[], startBalance = 10000): number[] {
  let balance = startBalance;
  const curve = [];
  for (const trade of trades) {
    balance += trade.pnl;
    curve.push(balance);
  }
  return curve;
}

export function calculateStats(trades: { pnl: number }[], analytics?: PortfolioAnalytics): Record<string, any> {
  const totalProfit = trades.reduce((acc, t) => acc + t.pnl, 0);
  const winTrades = trades.filter(t => t.pnl > 0).length;
  const lossTrades = trades.filter(t => t.pnl < 0).length;
  const winRate = trades.length ? winTrades / trades.length : 0;
  // Dodaj kolejne metryki: max drawdown, sharpe, sortino, CAGR, itp.
  const stats: Record<string, any> = {
    totalProfit,
    winRate,
    trades: trades.length,
    winTrades,
    lossTrades
  };
  if (analytics) {
    const calmar = analytics.getCalmarRatio();
    const rollingCalmar = analytics.getRollingCalmar();
    stats.calmar = calmar;
    stats.rollingCalmar = rollingCalmar;
  }
  return stats;
}

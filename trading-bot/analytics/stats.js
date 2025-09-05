"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEquityCurve = generateEquityCurve;
exports.calculateStats = calculateStats;
function generateEquityCurve(trades, startBalance = 10000) {
    let balance = startBalance;
    const curve = [];
    for (const trade of trades) {
        balance += trade.pnl;
        curve.push(balance);
    }
    return curve;
}
function calculateStats(trades, analytics) {
    const totalProfit = trades.reduce((acc, t) => acc + t.pnl, 0);
    const winTrades = trades.filter(t => t.pnl > 0).length;
    const lossTrades = trades.filter(t => t.pnl < 0).length;
    const winRate = trades.length ? winTrades / trades.length : 0;
    // Dodaj kolejne metryki: max drawdown, sharpe, sortino, CAGR, itp.
    const stats = {
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

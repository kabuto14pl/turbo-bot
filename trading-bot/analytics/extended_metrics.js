"use strict";
/**
 * 🚀 [PRODUCTION-OPERATIONAL]
 * Production monitoring component
 */
// ============================================================================
//  extended_metrics.ts - ROZSZERZONE METRYKI DO OCENY STRATEGII
//  Ten moduł implementuje dodatkowe metryki do oceny jakości strategii
//  inwestycyjnych poza standardowym Sharpe Ratio.
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateExtendedMetrics = calculateExtendedMetrics;
/**
 * Oblicza rozszerzone metryki na podstawie historii transakcji
 * @param trades Lista transakcji do analizy
 * @param initialCapital Początkowy kapitał
 * @param riskFreeRate Stopa wolna od ryzyka (domyślnie 0)
 * @returns Obiekt z rozszerzonymi metrykami
 */
function calculateExtendedMetrics(trades, initialCapital = 10000, riskFreeRate = 0) {
    if (!trades || trades.length === 0) {
        return createEmptyMetrics();
    }
    // Normalizujemy transakcje: ustawiamy domyślne wartości dla pól które
    // mogą być undefined aby uniknąć błędów typów przy dalszych obliczeniach.
    const normalizedTrades = trades.map(t => ({
        ...t,
        pnl: t.pnl ?? 0,
        entryTime: t.entryTime ?? t.timestamp,
        exitTime: t.exitTime ?? t.timestamp
    }));
    // --- Podstawowe statystyki ---
    const tradeCount = normalizedTrades.length;
    const winningTrades = normalizedTrades.filter(t => (t.pnl ?? 0) > 0);
    const losingTrades = normalizedTrades.filter(t => (t.pnl ?? 0) <= 0);
    const winCount = winningTrades.length;
    const winRate = tradeCount > 0 ? winCount / tradeCount : 0;
    const totalPnl = normalizedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    // --- Analiza zwrotów ---
    const returns = normalizedTrades.map(t => (t.pnl ?? 0) / initialCapital);
    const negativeReturns = returns.filter(r => r < 0);
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const returnsVariance = returns.length > 0 ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length : 1;
    const returnsStdDev = Math.sqrt(returnsVariance);
    // Odchylenie standardowe ujemnych zwrotów (do Sortino)
    const negativeReturnsVariance = negativeReturns.length > 0
        ? negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length
        : 0.0001; // Zapobiegamy dzieleniu przez zero
    const returnsNegativeStdDev = Math.sqrt(negativeReturnsVariance);
    // --- Analiza drawdownu ---
    let peak = initialCapital;
    let currentDrawdown = 0;
    let maxDrawdown = 0;
    let maxDrawdownAbs = 0;
    let drawdownSum = 0;
    let drawdownCount = 0;
    let drawdownDuration = 0;
    let currentDrawdownDuration = 0;
    let equity = initialCapital;
    for (const trade of normalizedTrades) {
        equity += (trade.pnl ?? 0);
        if (equity > peak) {
            // Nowy szczyt - resetujemy drawdown
            if (currentDrawdown > 0) {
                drawdownSum += currentDrawdown;
                drawdownCount++;
                drawdownDuration += currentDrawdownDuration;
            }
            peak = equity;
            currentDrawdown = 0;
            currentDrawdownDuration = 0;
        }
        else {
            // Jesteśmy w drawdownie
            const drawdownValue = peak - equity;
            const drawdownPercent = drawdownValue / peak;
            currentDrawdown = drawdownPercent;
            currentDrawdownDuration++;
            if (drawdownPercent > maxDrawdown) {
                maxDrawdown = drawdownPercent;
                maxDrawdownAbs = drawdownValue;
            }
        }
    }
    // Dodajemy ostatni drawdown, jeśli istnieje
    if (currentDrawdown > 0) {
        drawdownSum += currentDrawdown;
        drawdownCount++;
        drawdownDuration += currentDrawdownDuration;
    }
    const averageDrawdown = drawdownCount > 0 ? drawdownSum / drawdownCount : 0;
    const avgDrawdownDuration = drawdownCount > 0 ? drawdownDuration / drawdownCount : 0;
    // --- Wskaźniki zysku do ryzyka ---
    const totalGain = winningTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0) || 0.0001;
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)) || 0.0001;
    const profitFactor = totalGain / totalLoss;
    const annualizedReturn = totalPnl / initialCapital; // Uproszczone, powinno uwzględniać czas
    // Sharpe Ratio: (Średni zwrot - stopa wolna od ryzyka) / Odchylenie standardowe zwrotów
    const sharpeRatio = returnsStdDev > 0 ? (avgReturn - riskFreeRate) / returnsStdDev : 0;
    // Sortino Ratio: (Średni zwrot - stopa wolna od ryzyka) / Odchylenie standardowe ujemnych zwrotów
    const sortinoRatio = returnsNegativeStdDev > 0 ? (avgReturn - riskFreeRate) / returnsNegativeStdDev : 0;
    // Calmar Ratio: Annualized Return / Maximum Drawdown
    const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;
    // --- Analiza transakcji ---
    const averageProfit = winningTrades.length > 0
        ? winningTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / winningTrades.length
        : 0;
    const averageLoss = losingTrades.length > 0
        ? losingTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / losingTrades.length
        : 0;
    // Expectancy: (Win Rate * Average Win) + (Loss Rate * Average Loss)
    const expectancy = (winRate * averageProfit) + ((1 - winRate) * averageLoss);
    // Średni czas utrzymywania pozycji (w jednostkach czasu)
    const holdingTimes = normalizedTrades.map(t => ((t.exitTime ?? t.timestamp) - (t.entryTime ?? t.timestamp)) / (1000 * 60)); // w minutach
    const averageHoldingTime = holdingTimes.length > 0 ? holdingTimes.reduce((sum, v) => sum + v, 0) / holdingTimes.length : 0;
    // Tail Risk (95% VaR) - 5% najgorszych zwrotów
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor(sortedReturns.length * 0.05);
    const tailRisk = sortedReturns.length > 0 ? sortedReturns[varIndex] : 0;
    return {
        // Podstawowe metryki
        tradeCount,
        winCount,
        winRate,
        totalPnl,
        // Metryki ryzyka
        maxDrawdown,
        maxDrawdownAbs,
        averageDrawdown,
        drawdownDuration: avgDrawdownDuration,
        // Metryki relacji zysku do ryzyka
        sharpeRatio,
        sortinoRatio,
        calmarRatio,
        profitFactor,
        // Analiza transakcji
        averageProfit,
        averageLoss,
        expectancy,
        averageHoldingTime,
        // Metryki stabilności
        returnsStdDev,
        returnsNegativeStdDev,
        tailRisk
    };
}
/**
 * Tworzy pusty obiekt metryk
 */
function createEmptyMetrics() {
    return {
        tradeCount: 0,
        winCount: 0,
        winRate: 0,
        totalPnl: 0,
        maxDrawdown: 0,
        maxDrawdownAbs: 0,
        averageDrawdown: 0,
        drawdownDuration: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        calmarRatio: 0,
        profitFactor: 0,
        averageProfit: 0,
        averageLoss: 0,
        expectancy: 0,
        averageHoldingTime: 0,
        returnsStdDev: 0,
        returnsNegativeStdDev: 0,
        tailRisk: 0
    };
}

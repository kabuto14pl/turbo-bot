"use strict";
/**
 * 🚀 [PRODUCTION-OPERATIONAL]
 * Production monitoring component
 */
// ============================================================================
//  advanced_metrics.ts - ROZSZERZONE METRYKI OCENY STRATEGII
//  Ten moduł implementuje zaawansowane metryki oceny strategii inwestycyjnych,
//  wykraczające poza standardowy Sharpe Ratio.
// ============================================================================
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
exports.calculateSortinoRatio = calculateSortinoRatio;
exports.calculateCalmarRatio = calculateCalmarRatio;
exports.calculateUlcerIndex = calculateUlcerIndex;
exports.calculateProfitFactor = calculateProfitFactor;
exports.calculateRecoveryFactor = calculateRecoveryFactor;
exports.calculateExpectancy = calculateExpectancy;
exports.calculateAllMetrics = calculateAllMetrics;
exports.generateExtendedMetricsReport = generateExtendedMetricsReport;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Klucz funkcji: ryzyko = zmienność zwrotów TYLKO W DÓŁ
// Podobnie jak Sharpe, ale uwzględnia tylko negatywne zwroty w mianowniku
function calculateSortinoRatio(returns, riskFreeRate = 0) {
    if (returns.length === 0)
        return 0;
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const excessReturn = avgReturn - riskFreeRate;
    // Zmienność tylko zwrotów ujemnych (downside deviation)
    const negativeReturns = returns.filter(r => r < 0);
    if (negativeReturns.length === 0)
        return Infinity; // Idealny przypadek - brak strat
    const downsideDeviation = Math.sqrt(negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length);
    return excessReturn / downsideDeviation;
}
// Klucz funkcji: ryzyko = maksymalne obsunięcie kapitału
// Roczny zwrot podzielony przez maksymalne obsunięcie kapitału
function calculateCalmarRatio(equityCurve, annualFactor = 365) {
    if (equityCurve.length < 2)
        return 0;
    // Oblicz roczny zwrot
    const startNAV = equityCurve[0].nav;
    const endNAV = equityCurve[equityCurve.length - 1].nav;
    const daysElapsed = (equityCurve[equityCurve.length - 1].timestamp - equityCurve[0].timestamp) / (24 * 60 * 60 * 1000);
    const annualReturn = Math.pow(endNAV / startNAV, annualFactor / daysElapsed) - 1;
    // Oblicz maksymalne obsunięcie
    let maxDrawdown = 0;
    let peak = equityCurve[0].nav;
    for (const point of equityCurve) {
        if (point.nav > peak) {
            peak = point.nav;
        }
        const drawdown = (peak - point.nav) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    if (maxDrawdown === 0)
        return Infinity; // Nie było obsunięcia
    return annualReturn / maxDrawdown;
}
// Ulcer Index - miara głębokości i czasu trwania obsunięć
function calculateUlcerIndex(equityCurve) {
    if (equityCurve.length < 2)
        return 0;
    let peak = equityCurve[0].nav;
    let sumSquaredDrawdowns = 0;
    for (const point of equityCurve) {
        if (point.nav > peak) {
            peak = point.nav;
        }
        const percentDrawdown = (peak - point.nav) / peak * 100;
        sumSquaredDrawdowns += Math.pow(percentDrawdown, 2);
    }
    return Math.sqrt(sumSquaredDrawdowns / equityCurve.length);
}
// Współczynnik zysku - stosunek łącznych zysków do łącznych strat
function calculateProfitFactor(trades) {
    if (trades.length === 0)
        return 0;
    const grossProfit = trades
        .filter(t => t.pnl > 0)
        .reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(trades
        .filter(t => t.pnl < 0)
        .reduce((sum, t) => sum + t.pnl, 0));
    if (grossLoss === 0)
        return Infinity; // Nie było strat
    return grossProfit / grossLoss;
}
// Recovery Factor - stosunek zysku do maksymalnego obsunięcia
function calculateRecoveryFactor(totalReturn, maxDrawdown) {
    if (maxDrawdown === 0)
        return Infinity;
    return totalReturn / maxDrawdown;
}
// Expectancy - średni zysk/strata na transakcję w jednostkach R
// gdzie R to wielkość ryzyka na transakcję
function calculateExpectancy(trades) {
    if (trades.length === 0)
        return 0;
    const winRate = trades.filter(t => t.pnl > 0).length / trades.length;
    // Średni zysk w jednostkach R (zakładamy, że stop loss to 1R)
    const avgWin = trades
        .filter(t => t.pnl > 0)
        .reduce((sum, t) => {
        // Jeśli mamy informację o stop loss, używamy jej
        const riskPerTrade = t.initialStopLoss
            ? Math.abs(t.entryPrice - t.initialStopLoss)
            : t.entryPrice * 0.01; // Domyślnie 1%
        return sum + (t.pnl / riskPerTrade);
    }, 0) / (trades.filter(t => t.pnl > 0).length || 1);
    // Średnia strata w jednostkach R
    const avgLoss = trades
        .filter(t => t.pnl < 0)
        .reduce((sum, t) => {
        const riskPerTrade = t.initialStopLoss
            ? Math.abs(t.entryPrice - t.initialStopLoss)
            : t.entryPrice * 0.01;
        return sum + (Math.abs(t.pnl) / riskPerTrade);
    }, 0) / (trades.filter(t => t.pnl < 0).length || 1);
    return (winRate * avgWin) - ((1 - winRate) * avgLoss);
}
// Funkcja obliczająca wszystkie metryki na raz
function calculateAllMetrics(trades, equityCurve, initialCapital) {
    // Jeśli brak krzywej kapitału, tworzymy ją
    if (!equityCurve || equityCurve.length === 0) {
        equityCurve = simulateNavHistoryFromTrades(trades, initialCapital);
    }
    // Obliczenie zwrotów procentowych dla każdej transakcji
    const returns = trades.map(t => (t.pnl || 0) / initialCapital);
    // Całkowity zwrot
    const totalReturn = equityCurve.length > 0
        ? (equityCurve[equityCurve.length - 1].nav / equityCurve[0].nav) - 1
        : 0;
    // Dzienne zwroty (do obliczeń Sharpe Ratio)
    const dailyReturns = [];
    for (let i = 1; i < equityCurve.length; i++) {
        const prevDay = equityCurve[i - 1];
        const currDay = equityCurve[i];
        const dailyReturn = (currDay.nav / prevDay.nav) - 1;
        dailyReturns.push(dailyReturn);
    }
    // Obliczenie średniego zwrotu i odchylenia standardowego
    const avgDailyReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / dailyReturns.length;
    const stdDev = Math.sqrt(variance);
    // Sharpe Ratio (zakładamy stopę wolną od ryzyka = 0)
    const annualFactor = 365; // Liczba dni w roku
    const sharpeRatio = stdDev > 0
        ? (avgDailyReturn * Math.sqrt(annualFactor)) / stdDev
        : 0;
    // Obliczenie maksymalnego obsunięcia
    let maxDrawdown = 0;
    let peak = equityCurve[0].nav;
    for (const point of equityCurve) {
        if (point.nav > peak) {
            peak = point.nav;
        }
        const drawdown = (peak - point.nav) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    // Wartości wygrane/przegrane
    const winCount = trades.filter(t => t.pnl > 0).length;
    const lossCount = trades.filter(t => t.pnl < 0).length;
    const winRate = trades.length > 0 ? winCount / trades.length : 0;
    // Inne metryki
    const sortinoRatio = calculateSortinoRatio(returns);
    const calmarRatio = calculateCalmarRatio(equityCurve);
    const ulcerIndex = calculateUlcerIndex(equityCurve);
    const profitFactor = calculateProfitFactor(trades);
    const recoveryFactor = calculateRecoveryFactor(totalReturn, maxDrawdown);
    const expectancy = calculateExpectancy(trades);
    return {
        totalReturn,
        sharpeRatio,
        sortinoRatio,
        calmarRatio,
        ulcerIndex,
        maxDrawdown,
        profitFactor,
        recoveryFactor,
        expectancy,
        winRate,
        winCount,
        lossCount,
        totalTrades: trades.length,
        avgReturn: avgDailyReturn * 100 // jako procent
    };
}
// Symuluje historię NAV na podstawie transakcji
function simulateNavHistoryFromTrades(trades, initialCapital) {
    if (trades.length === 0)
        return [{ timestamp: Date.now(), nav: initialCapital }];
    // Sortuj transakcje po czasie
    const sortedTrades = [...trades].sort((a, b) => {
        const timeA = a.ts || a.timestamp || a.time || 0;
        const timeB = b.ts || b.timestamp || b.time || 0;
        return timeA - timeB;
    });
    const navHistory = [];
    let currentNav = initialCapital;
    // Dodaj punkt początkowy
    navHistory.push({
        timestamp: sortedTrades[0].ts || sortedTrades[0].timestamp || sortedTrades[0].time || 0,
        nav: currentNav
    });
    // Dodaj punkty dla każdej transakcji
    for (const trade of sortedTrades) {
        const pnl = trade.pnl || 0;
        currentNav += pnl;
        navHistory.push({
            timestamp: trade.ts || trade.timestamp || trade.time || 0,
            nav: currentNav
        });
    }
    return navHistory;
}
// Funkcja generująca pełny raport metryk
function generateExtendedMetricsReport(trades, navHistory, initialCapital, outputDir) {
    // Jeśli brak historii NAV, tworzymy prostą symulację na podstawie transakcji
    if (!navHistory || navHistory.length === 0) {
        navHistory = simulateNavHistoryFromTrades(trades, initialCapital);
    }
    // Oblicz wszystkie metryki
    const metrics = calculateAllMetrics(trades, navHistory, initialCapital);
    // Utwórz katalog, jeśli nie istnieje
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    // Zapisz metryki do pliku JSON
    const metricsFile = path.join(outputDir, 'extended_metrics.json');
    fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
    // Zapisz również raport tekstowy dla czytelności
    const textReport = `
=============================================
RAPORT ROZSZERZONYCH METRYK STRATEGII
=============================================

PODSTAWOWE WSKAŹNIKI:
- Całkowity zwrot: ${(metrics.totalReturn * 100).toFixed(2)}%
- Liczba transakcji: ${metrics.totalTrades}
- Win rate: ${(metrics.winRate * 100).toFixed(2)}%
- Maksymalne obsunięcie: ${(metrics.maxDrawdown * 100).toFixed(2)}%

METRYKI RYZYKA:
- Sharpe Ratio: ${metrics.sharpeRatio.toFixed(4)}
- Sortino Ratio: ${metrics.sortinoRatio.toFixed(4)}
- Calmar Ratio: ${metrics.calmarRatio.toFixed(4)}
- Ulcer Index: ${metrics.ulcerIndex.toFixed(4)}

WSKAŹNIKI EFEKTYWNOŚCI:
- Profit Factor: ${metrics.profitFactor.toFixed(4)}
- Recovery Factor: ${metrics.recoveryFactor.toFixed(4)}
- Expectancy (R-Multiple): ${metrics.expectancy.toFixed(4)}

STATYSTYKI TRANSAKCJI:
- Wygrane transakcje: ${metrics.winCount}
- Przegrane transakcje: ${metrics.lossCount}
- Średni dzienny zwrot: ${metrics.avgReturn.toFixed(4)}%

=============================================
`;
    const textReportFile = path.join(outputDir, 'extended_metrics_report.txt');
    fs.writeFileSync(textReportFile, textReport);
    console.log(`Raport rozszerzonych metryk zapisany w: ${outputDir}`);
    return metrics;
}

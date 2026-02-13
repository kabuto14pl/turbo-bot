"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalRiskManager = void 0;
class GlobalRiskManager {
    constructor(portfolio, config) {
        this.isTradingHalted = false;
        // Adaptacyjne zarządzanie ryzykiem
        this.navHistory = [];
        this.riskMultiplier = 1.0;
        this.maxMultiplier = 1.0;
        this.streakLoss = 0;
        this.streakWin = 0;
        this.lastTradePnl = null;
        this.portfolio = portfolio;
        this.config = config;
        const initialNav = portfolio.getNetAssetValue({});
        this.historicalMaxNav = initialNav;
        this.todayNavStart = initialNav;
        this.todayTimestampStart = 0; // Zostanie ustawione przy pierwszej aktualizacji
        this.rollingWindow = config.rollingWindowBars || 100;
        this.minMultiplier = config.reducedMultiplier || 0.5;
        this.streakThreshold = config.streakThreshold || 5;
        this.recoveryThreshold = config.recoveryThreshold || 3;
    }
    update(timestamp, marketPrices) {
        const currentNav = this.portfolio.getNetAssetValue(marketPrices);
        this.navHistory.push(currentNav);
        if (this.navHistory.length > this.rollingWindow) {
            this.navHistory.shift();
        }
        // Reset dziennego drawdownu na początku nowego dnia
        if (new Date(timestamp).setHours(0, 0, 0, 0) > new Date(this.todayTimestampStart).setHours(0, 0, 0, 0)) {
            this.todayTimestampStart = timestamp;
            this.todayNavStart = currentNav;
        }
        // Aktualizuj historyczny szczyt NAV
        if (currentNav > this.historicalMaxNav) {
            this.historicalMaxNav = currentNav;
        }
        // Sprawdź ogólny drawdown
        const drawdown = (this.historicalMaxNav - currentNav) / this.historicalMaxNav;
        if (drawdown > this.config.maxDrawdown) {
            this.isTradingHalted = true;
            console.warn(`[GLOBAL RISK] HALT! Całkowity drawdown (${(drawdown * 100).toFixed(2)}%) przekroczył limit.`);
        }
        // Sprawdź dzienny drawdown
        const dailyDrawdown = (this.todayNavStart - currentNav) / this.todayNavStart;
        if (dailyDrawdown > this.config.maxDailyDrawdown) {
            this.isTradingHalted = true;
            console.warn(`[GLOBAL RISK] HALT! Dzienny drawdown (${(dailyDrawdown * 100).toFixed(2)}%) przekroczył limit.`);
        }
        // --- Adaptacyjne zarządzanie ryzykiem ---
        // Rolling drawdown na oknie
        const maxNav = Math.max(...this.navHistory);
        const rollingDrawdown = (maxNav - currentNav) / maxNav;
        // Zmiana mnożnika przy rolling drawdown > 50% maxDrawdown
        if (rollingDrawdown > (this.config.maxDrawdown * 0.5) && this.riskMultiplier !== this.minMultiplier) {
            this.riskMultiplier = this.minMultiplier;
            console.warn(`[ADAPTIVE RISK] Rolling drawdown przekroczył próg, zmniejszam riskMultiplier do ${this.riskMultiplier}`);
        }
        // Przywrócenie mnożnika jeśli rolling drawdown spadnie
        if (rollingDrawdown < (this.config.maxDrawdown * 0.2) && this.riskMultiplier !== this.maxMultiplier) {
            this.riskMultiplier = this.maxMultiplier;
            console.info(`[ADAPTIVE RISK] Rolling drawdown wrócił do normy, przywracam riskMultiplier do ${this.riskMultiplier}`);
        }
    }
    // Wywołuj po każdej zamkniętej transakcji (przekaż PnL)
    onTradeClosed(pnl) {
        if (pnl < 0) {
            this.streakLoss++;
            this.streakWin = 0;
        }
        else if (pnl > 0) {
            this.streakWin++;
            this.streakLoss = 0;
        }
        // Zmniejsz mnożnik po serii strat
        if (this.streakLoss >= this.streakThreshold && this.riskMultiplier !== this.minMultiplier) {
            this.riskMultiplier = this.minMultiplier;
            console.warn(`[ADAPTIVE RISK] Seria ${this.streakLoss} strat! Zmniejszam riskMultiplier do ${this.riskMultiplier}`);
        }
        // Przywróć mnożnik po serii zysków
        if (this.streakWin >= this.recoveryThreshold && this.riskMultiplier !== this.maxMultiplier) {
            this.riskMultiplier = this.maxMultiplier;
            console.info(`[ADAPTIVE RISK] Seria ${this.streakWin} zysków! Przywracam riskMultiplier do ${this.riskMultiplier}`);
        }
    }
    canOpenPosition() {
        if (this.isTradingHalted) {
            console.log(`[GLOBAL RISK] Otwieranie nowych pozycji zablokowane z powodu przekroczenia limitu ryzyka.`);
        }
        return !this.isTradingHalted;
    }
    getRiskMultiplier() {
        return this.riskMultiplier;
    }
    // ========================================================================
    // 🚀 TIER 2.1: ADVANCED RISK ANALYTICS - VaR, Kelly, Monte Carlo
    // ========================================================================
    /**
     * Calculate Value at Risk (VaR) using multiple methods
     * VaR represents the maximum expected loss over a given time period at a specified confidence level
     */
    calculateVaR(confidence = 0.95, timeHorizon = 1) {
        const confidenceLevel = this.config.varConfidence || confidence;
        const horizon = this.config.varTimeHorizon || timeHorizon;
        // 1. PARAMETRIC VaR (Variance-Covariance Method)
        const returns = this.calculateReturns(this.navHistory);
        const meanReturn = this.mean(returns);
        const stdDevReturn = this.stdDev(returns);
        // Z-score for confidence level (95% = 1.645, 99% = 2.326)
        const zScore = this.getZScore(confidenceLevel);
        const parametricVaR = -(meanReturn - zScore * stdDevReturn) * Math.sqrt(horizon);
        // 2. HISTORICAL VaR (Empirical Quantile)
        const sortedReturns = [...returns].sort((a, b) => a - b);
        const percentileIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
        const historicalVaR = -sortedReturns[percentileIndex] * Math.sqrt(horizon);
        // 3. MONTE CARLO VaR (Simulation-Based)
        const mcSimulations = this.config.monteCarloSimulations || 1000;
        const simulatedReturns = this.runMonteCarloSimulation(meanReturn, stdDevReturn, mcSimulations, horizon);
        const sortedSimulated = simulatedReturns.sort((a, b) => a - b);
        const mcPercentileIndex = Math.floor((1 - confidenceLevel) * sortedSimulated.length);
        const monteCarloVaR = -sortedSimulated[mcPercentileIndex];
        return {
            parametric: parametricVaR,
            historical: historicalVaR,
            monteCarlo: monteCarloVaR,
            confidence: confidenceLevel,
            timeHorizon: horizon,
            timestamp: Date.now()
        };
    }
    /**
     * Calculate Kelly Criterion for optimal position sizing
     * Kelly Formula: f* = (p * b - q) / b
     * Where: p = win probability, q = loss probability, b = avg win / avg loss ratio
     */
    calculateKellyCriterion(tradeHistory) {
        if (tradeHistory.length < 10) {
            // Not enough data - return conservative estimate
            return {
                optimalFraction: 0.01,
                winRate: 0.5,
                avgWin: 0,
                avgLoss: 0,
                adjustedFraction: 0.01,
                safetyFactor: this.config.kellySafetyFactor || 0.25
            };
        }
        // Separate winning and losing trades
        const wins = tradeHistory.filter(t => t.pnl > 0).map(t => t.pnl);
        const losses = tradeHistory.filter(t => t.pnl < 0).map(t => Math.abs(t.pnl));
        const totalTrades = tradeHistory.length;
        const winCount = wins.length;
        const lossCount = losses.length;
        const winRate = winCount / totalTrades;
        const lossRate = lossCount / totalTrades;
        const avgWin = wins.length > 0 ? this.mean(wins) : 0;
        const avgLoss = losses.length > 0 ? this.mean(losses) : 1;
        // Kelly formula: f* = (p * b - q) / b
        const b = avgWin / avgLoss; // Win/Loss ratio
        const kellyFraction = (winRate * b - lossRate) / b;
        // Apply safety factor (typically 0.25 = quarter Kelly for safety)
        const safetyFactor = this.config.kellySafetyFactor || 0.25;
        const adjustedFraction = Math.max(0, Math.min(1, kellyFraction * safetyFactor));
        return {
            optimalFraction: Math.max(0, Math.min(1, kellyFraction)),
            winRate,
            avgWin,
            avgLoss,
            adjustedFraction,
            safetyFactor
        };
    }
    /**
     * Run Monte Carlo simulation for portfolio risk assessment
     * Simulates thousands of possible future paths to estimate risk metrics
     */
    runMonteCarloAnalysis(simulations = 10000, timeSteps = 252) {
        const returns = this.calculateReturns(this.navHistory);
        const meanReturn = this.mean(returns);
        const stdDevReturn = this.stdDev(returns);
        const finalReturns = [];
        const allDrawdowns = [];
        for (let i = 0; i < simulations; i++) {
            let cumulativeReturn = 0;
            let peak = 0;
            let maxDrawdown = 0;
            for (let t = 0; t < timeSteps; t++) {
                // Simulate random return using normal distribution
                const randomReturn = this.randomNormal(meanReturn, stdDevReturn);
                cumulativeReturn += randomReturn;
                // Track drawdown
                if (cumulativeReturn > peak) {
                    peak = cumulativeReturn;
                }
                const drawdown = peak - cumulativeReturn;
                if (drawdown > maxDrawdown) {
                    maxDrawdown = drawdown;
                }
            }
            finalReturns.push(cumulativeReturn);
            allDrawdowns.push(maxDrawdown);
        }
        // Sort returns for percentile calculation
        const sortedReturns = [...finalReturns].sort((a, b) => a - b);
        // Calculate VaR and CVaR
        const var95Index = Math.floor(0.05 * sortedReturns.length);
        const var99Index = Math.floor(0.01 * sortedReturns.length);
        const var95 = -sortedReturns[var95Index];
        const var99 = -sortedReturns[var99Index];
        // CVaR (Conditional VaR / Expected Shortfall) - average of worst 5% outcomes
        const worstReturns = sortedReturns.slice(0, var95Index);
        const cvar95 = -this.mean(worstReturns);
        return {
            meanReturn: this.mean(finalReturns),
            stdDev: this.stdDev(finalReturns),
            var95,
            var99,
            cvar95,
            maxDrawdown: Math.max(...allDrawdowns),
            paths: simulations,
            timestamp: Date.now()
        };
    }
    // ========================================================================
    // 🚀 TIER 2.1: HELPER METHODS FOR STATISTICAL CALCULATIONS
    // ========================================================================
    calculateReturns(navSeries) {
        const returns = [];
        for (let i = 1; i < navSeries.length; i++) {
            const ret = (navSeries[i] - navSeries[i - 1]) / navSeries[i - 1];
            returns.push(ret);
        }
        return returns;
    }
    mean(values) {
        if (values.length === 0)
            return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    stdDev(values) {
        if (values.length < 2)
            return 0;
        const avg = this.mean(values);
        const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / (values.length - 1);
        return Math.sqrt(variance);
    }
    getZScore(confidence) {
        // Approximation of Z-scores for common confidence levels
        if (confidence >= 0.99)
            return 2.326;
        if (confidence >= 0.95)
            return 1.645;
        if (confidence >= 0.90)
            return 1.282;
        return 1.645; // Default to 95%
    }
    runMonteCarloSimulation(mean, stdDev, simulations, horizon) {
        const results = [];
        for (let i = 0; i < simulations; i++) {
            let cumulativeReturn = 0;
            for (let t = 0; t < horizon; t++) {
                cumulativeReturn += this.randomNormal(mean, stdDev);
            }
            results.push(cumulativeReturn);
        }
        return results;
    }
    randomNormal(mean = 0, stdDev = 1) {
        // Box-Muller transform for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return z0 * stdDev + mean;
    }
    // Metoda do resetowania stanu (np. przed nowym testem)
    reset() {
        const initialNav = this.portfolio.getNetAssetValue({});
        this.historicalMaxNav = initialNav;
        this.todayNavStart = initialNav;
        this.todayTimestampStart = 0;
        this.isTradingHalted = false;
        this.navHistory = [];
        this.riskMultiplier = 1.0;
        this.streakLoss = 0;
        this.streakWin = 0;
        this.lastTradePnl = null;
    }
}
exports.GlobalRiskManager = GlobalRiskManager;

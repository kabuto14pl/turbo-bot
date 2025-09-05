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

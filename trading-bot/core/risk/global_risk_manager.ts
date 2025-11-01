/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { Portfolio } from '../portfolio';

export interface GlobalRiskManagerConfig {
    maxDrawdown: number; // np. 0.15 dla 15%
    maxDailyDrawdown: number; // np. 0.05 dla 5%
    rollingWindowBars?: number; // ile barów do rolling drawdown
    streakThreshold?: number; // ile strat z rzędu do zmiany mnożnika
    reducedMultiplier?: number; // np. 0.5
    recoveryThreshold?: number; // ile zysków z rzędu do przywrócenia mnożnika
}

export class GlobalRiskManager {
    private portfolio: Portfolio;
    private config: GlobalRiskManagerConfig;
    private historicalMaxNav: number;
    private todayNavStart: number;
    private todayTimestampStart: number;
    private isTradingHalted: boolean = false;

    // Adaptacyjne zarządzanie ryzykiem
    private navHistory: number[] = [];
    private rollingWindow: number;
    private riskMultiplier: number = 1.0;
    private minMultiplier: number;
    private maxMultiplier: number = 1.0;
    private streakLoss: number = 0;
    private streakWin: number = 0;
    private streakThreshold: number;
    private recoveryThreshold: number;
    private lastTradePnl: number | null = null;

    constructor(portfolio: Portfolio, config: GlobalRiskManagerConfig) {
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

    update(timestamp: number, marketPrices: { [symbol: string]: number }): void {
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
    onTradeClosed(pnl: number) {
        if (pnl < 0) {
            this.streakLoss++;
            this.streakWin = 0;
        } else if (pnl > 0) {
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

    canOpenPosition(): boolean {
        if (this.isTradingHalted) {
            console.log(`[GLOBAL RISK] Otwieranie nowych pozycji zablokowane z powodu przekroczenia limitu ryzyka.`);
        }
        return !this.isTradingHalted;
    }

    getRiskMultiplier(): number {
        return this.riskMultiplier;
    }

    // Metoda do resetowania stanu (np. przed nowym testem)
    reset(): void {
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

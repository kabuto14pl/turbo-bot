import * as fs from 'fs';
import { Position } from '../types/position';
import { Order } from '../types/order';

export class Portfolio {
    private cash: number; // Gotówka w portfelu
    private initialCapital: number; // Kapitał początkowy do obliczeń statystyk
    private positions: Map<string, Position>; // Otwarte pozycje, klucz to symbol
    private tradeHistory: any[];
    private netAssetValueHistory: { timestamp: number, nav: number }[] = [];

    constructor(initialCapital: number = 10000) {
        this.initialCapital = initialCapital;
        this.cash = initialCapital;
        this.positions = new Map();
        this.tradeHistory = [];
        this.netAssetValueHistory.push({ timestamp: Date.now(), nav: this.getNetAssetValue({}) });
    }

    // Zwraca aktualną wartość całego portfela (NAV)
    getNetAssetValue(marketPrices: { [symbol: string]: number }): number {
        const unrealizedPnl = this.getUnrealizedPnl(marketPrices);
        return this.cash + this.getTotalMargin() + unrealizedPnl;
    }

    getCash(): number {
        return this.cash;
    }

    debit(amount: number): void {
        this.cash -= amount;
    }

    // Oblicza niezrealizowany zysk/stratę dla wszystkich otwartych pozycji
    getUnrealizedPnl(marketPrices: { [symbol: string]: number }): number {
        let totalPnl = 0;
        for (const [symbol, position] of Array.from(this.positions.entries())) {
            const currentPrice = marketPrices[symbol] || position.entryPrice;
            const pnl = position.direction === 'long'
                ? (currentPrice - position.entryPrice) * position.size
                : (position.entryPrice - currentPrice) * position.size;
            totalPnl += pnl;
        }
        return totalPnl;
    }

    // Zwraca całkowity kapitał zablokowany jako margin
    getTotalMargin(): number {
        let totalMargin = 0;
        for (const position of Array.from(this.positions.values())) {
            totalMargin += position.margin;
        }
        return totalMargin;
    }

    // Zwraca całkowitą ekspozycję (wartość wszystkich pozycji)
    getTotalExposure(marketPrices: { [symbol: string]: number }): number {
        let totalExposure = 0;
        for (const [symbol, position] of Array.from(this.positions.entries())) {
            const currentPrice = marketPrices[symbol] || position.entryPrice;
            totalExposure += currentPrice * position.size;
        }
        return totalExposure;
    }

    // Rejestruje nową pozycję
    openPosition(position: Position): void {
        if (this.cash < position.margin) {
            console.error(`[PORTFOLIO] Niewystarczająca gotówka (${this.cash}) do otwarcia pozycji z marginem ${position.margin}`);
            return;
        }

        if (this.positions.has(position.symbol)) {
            console.error(`[PORTFOLIO] Próba otwarcia nowej pozycji dla ${position.symbol}, podczas gdy istnieje już otwarta.`);
            return;
        }

        this.cash -= position.margin;
        this.positions.set(position.symbol, position);
        this.tradeHistory.push({ event: 'open', ...position });
        this.updateNavHistory(position.timestamp, {}); // Aktualizacja NAV po zmianie
    }

    // Zamyka istniejącą pozycję
    closePosition(symbol: string, executionPrice: number, timestamp: number): number | null {
        const pos = this.positions.get(symbol);
        if (pos) {
            const pnl = (pos.direction === 'long' ? executionPrice - pos.entryPrice : pos.entryPrice - executionPrice) * pos.size;
            
            // Zwróć margin i dodaj zrealizowany PnL do gotówki
            this.cash += pos.margin + pnl;
            
            this.tradeHistory.push({ ...pos, event: 'close', closePrice: executionPrice, pnl, closeTime: timestamp });
            this.positions.delete(symbol);
            this.updateNavHistory(timestamp, {}); // Aktualizacja NAV po zmianie
            return pnl;
        }
        return null;
    }

    // Aktualizuje historię NAV, aby móc śledzić drawdown
    updateNavHistory(timestamp: number, marketPrices: { [symbol: string]: number }): void {
        const nav = this.getNetAssetValue(marketPrices);
        this.netAssetValueHistory.push({ timestamp, nav });
    }

    // --- Pozostałe metody pomocnicze ---

    getPosition(symbol: string): Position | undefined {
        return this.positions.get(symbol);
    }

    getPositions(): Map<string, Position> {
        return this.positions;
    }

    getTradeHistory() {
        return this.tradeHistory;
    }

    getNavHistory() {
        return this.netAssetValueHistory;
    }

    addOrderToPosition(symbol: string, order: Order): void {
        const position = this.positions.get(symbol);
        if (position) {
            position.orders.push(order);
        } else {
            // Don't warn, as this is expected for closing orders where the position is already removed.
        }
    }

    // Balance management methods for simulated executor
    private balances: Map<string, number> = new Map();

    async getBalance(asset: string): Promise<number> {
        if (asset === 'USDT') {
            return this.cash;
        }
        return this.balances.get(asset) || 0;
    }

    async updateBalance(asset: string, amount: number): Promise<void> {
        if (asset === 'USDT') {
            this.cash = amount;
        }
        this.balances.set(asset, amount);
    }
}
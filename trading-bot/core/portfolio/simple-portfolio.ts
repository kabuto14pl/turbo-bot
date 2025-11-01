/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { Position, Order, Logger } from '../types';

/**
 * Simple portfolio implementation for compatibility
 */
export class Portfolio {
    private positions: Map<string, Position> = new Map();
    private balance: number = 100000; // Starting with $100k
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    getPositions(): Position[] {
        return Array.from(this.positions.values());
    }

    getPosition(symbol: string): Position | undefined {
        return this.positions.get(symbol);
    }

    addPosition(position: Position): void {
        this.positions.set(position.symbol, position);
        this.logger.info(`Added position: ${position.symbol}`);
    }

    removePosition(symbol: string): void {
        this.positions.delete(symbol);
        this.logger.info(`Removed position: ${symbol}`);
    }

    updatePosition(symbol: string, updates: Partial<Position>): void {
        const position = this.positions.get(symbol);
        if (position) {
            Object.assign(position, updates);
            this.logger.info(`Updated position: ${symbol}`);
        }
    }

    getBalance(): number {
        return this.balance;
    }

    updateBalance(amount: number): void {
        this.balance += amount;
        this.logger.info(`Balance updated: ${this.balance}`);
    }

    getTotalValue(): number {
        let totalValue = this.balance;
        
        for (const position of this.positions.values()) {
            if (position.size && position.currentPrice !== undefined && position.entryPrice !== undefined) {
                const currentValue = position.size * (position.currentPrice || position.entryPrice);
                totalValue += currentValue;
            }
        }

        return totalValue;
    }
}

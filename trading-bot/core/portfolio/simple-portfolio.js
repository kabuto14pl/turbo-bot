"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Portfolio = void 0;
/**
 * Simple portfolio implementation for compatibility
 */
class Portfolio {
    constructor(logger) {
        this.positions = new Map();
        this.balance = 100000; // Starting with $100k
        this.logger = logger;
    }
    getPositions() {
        return Array.from(this.positions.values());
    }
    getPosition(symbol) {
        return this.positions.get(symbol);
    }
    addPosition(position) {
        this.positions.set(position.symbol, position);
        this.logger.info(`Added position: ${position.symbol}`);
    }
    removePosition(symbol) {
        this.positions.delete(symbol);
        this.logger.info(`Removed position: ${symbol}`);
    }
    updatePosition(symbol, updates) {
        const position = this.positions.get(symbol);
        if (position) {
            Object.assign(position, updates);
            this.logger.info(`Updated position: ${symbol}`);
        }
    }
    getBalance() {
        return this.balance;
    }
    updateBalance(amount) {
        this.balance += amount;
        this.logger.info(`Balance updated: ${this.balance}`);
    }
    getTotalValue() {
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
exports.Portfolio = Portfolio;

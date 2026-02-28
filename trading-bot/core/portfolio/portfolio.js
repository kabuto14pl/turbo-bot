"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Portfolio = void 0;
class Portfolio {
    constructor(logger, initialCash = 10000) {
        this.positions = [];
        this.balances = new Map();
        this.logger = logger;
        this.balances.set('USDT', initialCash);
    }
    addPosition(position) {
        this.positions.push(position);
        this.balances.set(position.symbol.replace('USDT', ''), (this.balances.get(position.symbol.replace('USDT', '')) || 0) + position.size);
        this.logger.info(`Added position: ${position.direction} ${position.size} ${position.symbol} @ ${position.entryPrice}`);
    }
    removePosition(symbol) {
        const position = this.getPosition(symbol);
        if (position) {
            this.positions = this.positions.filter(p => p.symbol !== symbol);
            this.balances.set(position.symbol.replace('USDT', ''), (this.balances.get(position.symbol.replace('USDT', '')) || 0) - position.size);
            this.logger.info(`Removed position: ${position.direction} ${position.size} ${position.symbol}`);
        }
    }
    getPosition(symbol) {
        return this.positions.find(p => p.symbol === symbol);
    }
    getPositions() {
        return [...this.positions];
    }
    getCash() {
        return this.balances.get('USDT') || 0;
    }
    getEquity() {
        const positionsValue = this.positions.reduce((sum, pos) => sum + pos.margin, 0);
        return this.getCash() + positionsValue;
    }
    async getBalance(asset) {
        return this.balances.get(asset) || 0;
    }
    async updateBalance(asset, newBalance) {
        this.balances.set(asset, newBalance);
        this.logger.info(`Updated ${asset} balance to ${newBalance}`);
    }
    updatePosition(symbol, price) {
        const position = this.getPosition(symbol);
        if (position) {
            const pnl = position.direction === 'long' ?
                (price - position.entryPrice) * position.size :
                (position.entryPrice - price) * position.size;
            this.logger.info(`Updated position ${symbol}: PnL = ${pnl}`);
        }
    }
    getNetAssetValue(prices) {
        let nav = this.balances.get('USDT') || 0;
        for (const position of this.positions) {
            const price = prices[position.symbol] || 0;
            const positionValue = position.size * price;
            nav += positionValue;
        }
        return nav;
    }
}
exports.Portfolio = Portfolio;

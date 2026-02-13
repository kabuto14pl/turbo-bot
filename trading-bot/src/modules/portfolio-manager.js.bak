'use strict';
/**
 * @module PortfolioManager
 * @description Portfolio state, balance, PnL, positions, drawdown.
 */

class PortfolioManager {
    constructor(config) {
        this.config = config;
        this.portfolio = {
            totalValue: config.initialCapital, unrealizedPnL: 0, realizedPnL: 0,
            drawdown: 0, peakValue: config.initialCapital, sharpeRatio: 0,
            winRate: 0, totalTrades: 0, successfulTrades: 0, failedTrades: 0,
            avgTradeReturn: 0, maxDrawdownValue: 0,
        };
        this.balance = {
            usdtBalance: config.initialCapital, btcBalance: 0,
            totalValue: config.initialCapital, lockedInPositions: 0,
        };
        this.positions = new Map();
        this.trades = [];
    }

    getPortfolio() { return { ...this.portfolio }; }
    getBalance() { return { ...this.balance }; }
    getPositions() { return this.positions; }
    hasPosition(symbol) { return this.positions.has(symbol); }
    getPosition(symbol) { return this.positions.get(symbol); }
    getTrades() { return this.trades; }
    get positionCount() { return this.positions.size; }

    openPosition(symbol, data) {
        const position = {
            symbol, side: 'LONG', entryPrice: data.entryPrice,
            quantity: data.quantity, entryTime: Date.now(),
            value: data.entryPrice * data.quantity,
            stopLoss: data.stopLoss, takeProfit: data.takeProfit,
            atrAtEntry: data.atrAtEntry || 0, _partialTpDone: false,
        };
        this.positions.set(symbol, position);
        const val = position.entryPrice * position.quantity;
        this.balance.usdtBalance -= val;
        this.balance.btcBalance += position.quantity;
        this.balance.lockedInPositions += val;
        return position;
    }

    closePosition(symbol, exitPrice, quantity, reason, strategy) {
        if (!reason) reason = 'SELL';
        if (!strategy) strategy = 'Manual';
        const pos = this.positions.get(symbol);
        if (!pos) return null;
        const closeQty = quantity || pos.quantity;
        const exitValue = exitPrice * closeQty;
        const entryValue = pos.entryPrice * closeQty;
        const grossPnL = exitValue - entryValue;
        const fees = exitValue * this.config.tradingFeeRate;
        const netPnL = grossPnL - fees;
        this.balance.usdtBalance += exitValue - fees;
        this.balance.btcBalance -= closeQty;
        this.balance.lockedInPositions -= pos.entryPrice * closeQty;
        this.portfolio.realizedPnL += netPnL;
        this.portfolio.totalTrades++;
        if (netPnL > 0) this.portfolio.successfulTrades++;
        else this.portfolio.failedTrades++;
        this.portfolio.winRate = this.portfolio.totalTrades > 0
            ? this.portfolio.successfulTrades / this.portfolio.totalTrades : 0;
        this.portfolio.avgTradeReturn = this.portfolio.totalTrades > 0
            ? this.portfolio.realizedPnL / this.portfolio.totalTrades : 0;
        const trade = {
            id: this.config.instanceId + '-' + reason + '-' + Date.now(),
            timestamp: Date.now(), symbol, action: 'SELL', price: exitPrice,
            quantity: closeQty, pnl: netPnL, strategy,
            instanceId: this.config.instanceId, entryPrice: pos.entryPrice, fees,
        };
        this.trades.push(trade);
        if (this.trades.length > 1000) this.trades = this.trades.slice(-500);
        if (closeQty >= pos.quantity) this.positions.delete(symbol);
        else { pos.quantity -= closeQty; pos.value = pos.entryPrice * pos.quantity; }
        return trade;
    }

    markPartialTpDone(symbol) { const p = this.positions.get(symbol); if (p) p._partialTpDone = true; }

    updateStopLoss(symbol, newSL) {
        const p = this.positions.get(symbol);
        if (p && newSL > p.stopLoss) p.stopLoss = newSL;
    }

    updateUnrealizedPnL(currentPrices) {
        let total = 0;
        for (const [sym, pos] of this.positions) {
            const price = currentPrices.get(sym) || pos.entryPrice;
            total += (price - pos.entryPrice) * pos.quantity;
        }
        this.portfolio.unrealizedPnL = total;
    }

    updateMetrics() {
        const posVal = Array.from(this.positions.values()).reduce((s, p) => s + p.value, 0);
        this.portfolio.totalValue = this.balance.usdtBalance + posVal + this.portfolio.unrealizedPnL;
        this.balance.totalValue = this.portfolio.totalValue;
        if (this.portfolio.totalValue > this.portfolio.peakValue) this.portfolio.peakValue = this.portfolio.totalValue;
        this.portfolio.drawdown = this.portfolio.peakValue > 0
            ? (this.portfolio.peakValue - this.portfolio.totalValue) / this.portfolio.peakValue : 0;
        if (this.portfolio.drawdown > this.portfolio.maxDrawdownValue) this.portfolio.maxDrawdownValue = this.portfolio.drawdown;
    }

    restoreState(state) {
        if (state.portfolio) this.portfolio = { ...this.portfolio, ...state.portfolio };
        if (state.portfolioBalance) this.balance = state.portfolioBalance;
        if (state.positions && state.positions.length > 0) this.positions = new Map(state.positions);
        if (state.trades) this.trades = state.trades;
    }

    exportState() {
        return {
            portfolio: this.portfolio, portfolioBalance: this.balance,
            positions: Array.from(this.positions.entries()), trades: this.trades.slice(-100),
        };
    }
}

module.exports = { PortfolioManager };

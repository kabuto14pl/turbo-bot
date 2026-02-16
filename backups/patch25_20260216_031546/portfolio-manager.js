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
        const side = data.side || 'LONG';
        const position = {
            symbol, side, entryPrice: data.entryPrice,
            quantity: data.quantity, entryTime: Date.now(),
            value: data.entryPrice * data.quantity,
            stopLoss: data.stopLoss, takeProfit: data.takeProfit,
            atrAtEntry: data.atrAtEntry || 0, _partialTpDone: false,
            _pyramidLevel: data.pyramidLevel || 0,
            _qpmManaged: false,
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
        const grossPnL = pos.side === 'SHORT' ? (entryValue - exitValue) : (exitValue - entryValue);
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
            // PATCH #21: Clear unrealizedPnL when no more positions
            if (this.positions.size === 0) {
                this.portfolio.unrealizedPnL = 0;
            }
        else { pos.quantity -= closeQty; pos.value = pos.entryPrice * pos.quantity; }
        return trade;
    }

    markPartialTpDone(symbol) { const p = this.positions.get(symbol); if (p) p._partialTpDone = true; }

    updateStopLoss(symbol, newSL) {
        const p = this.positions.get(symbol);
        if (!p) return;
        if (p.side === 'SHORT') {
            if (newSL < p.stopLoss) p.stopLoss = newSL;
        } else {
            if (newSL > p.stopLoss) p.stopLoss = newSL;
        }
    }

    updateTakeProfit(symbol, newTP) {
        const p = this.positions.get(symbol);
        if (!p || !newTP || newTP <= 0) return;
        if (p.side === 'SHORT') {
            if (newTP < p.entryPrice) p.takeProfit = newTP;
        } else {
            if (newTP > p.entryPrice) p.takeProfit = newTP;
        }
    }

    addToPosition(symbol, price, quantity, atrAtEntry) {
        const p = this.positions.get(symbol);
        if (!p) return null;
        const oldQty = p.quantity;
        const oldVal = p.entryPrice * oldQty;
        const addVal = price * quantity;
        const newQty = oldQty + quantity;
        p.entryPrice = (oldVal + addVal) / newQty;
        p.quantity = newQty;
        p.value = p.entryPrice * newQty;
        p._pyramidLevel = (p._pyramidLevel || 0) + 1;
        if (atrAtEntry) p.atrAtEntry = atrAtEntry;
        this.balance.usdtBalance -= addVal;
        this.balance.btcBalance += quantity;
        this.balance.lockedInPositions += addVal;
        console.log('[PYRAMID] Added ' + quantity.toFixed(6) + ' to ' + symbol +
            ' @ $' + price.toFixed(2) + ' | New avg: $' + p.entryPrice.toFixed(2) +
            ' | Level: ' + p._pyramidLevel + ' | Total qty: ' + newQty.toFixed(6));
        return p;
    }

    updateUnrealizedPnL(currentPrices) {
        let total = 0;
        for (const [sym, pos] of this.positions) {
            const price = currentPrices.get(sym) || pos.entryPrice;
            if (pos.side === 'SHORT') {
                total += (pos.entryPrice - price) * pos.quantity;
            } else {
                total += (price - pos.entryPrice) * pos.quantity;
            }
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

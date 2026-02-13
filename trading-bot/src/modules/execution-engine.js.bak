'use strict';
/**
 * @module ExecutionEngine
 * @description Trade execution (BUY/SELL), SL/TP monitoring,
 * trailing stop-loss, partial take-profit, time-based exits.
 */
const ind = require('./indicators');

class ExecutionEngine {
    constructor(config, portfolioManager, riskManager, mlIntegration) {
        this.config = config;
        this.pm = portfolioManager;
        this.risk = riskManager;
        this.ml = mlIntegration || null;
        this.advancedPositionManager = null;
        this.monitoringSystem = null;
    }

    setAdvancedPositionManager(apm) { this.advancedPositionManager = apm; }
    setMonitoringSystem(ms) { this.monitoringSystem = ms; }

    /**
     * Monitor open positions: trailing SL, partial TP, time exits, SL/TP checks
     * @param {function} getCurrentPrice - async(symbol) => price
     * @param {Array} marketDataHistory
     */
    async monitorPositions(getCurrentPrice, marketDataHistory) {
        const positions = this.pm.getPositions();
        if (positions.size === 0) return;

        for (const [sym, pos] of positions) {
            try {
                const price = await getCurrentPrice(sym);
                if (!price) continue;

                // TRAILING SL
                if (pos.atrAtEntry && pos.atrAtEntry > 0) {
                    const profit = price - pos.entryPrice;
                    const atrMult = profit / pos.atrAtEntry;

                    if (atrMult >= 2.0) { const sl = pos.entryPrice + 1.0 * pos.atrAtEntry; if (sl > pos.stopLoss) { console.log('[TRAILING SL] ' + atrMult.toFixed(1) + 'x ATR ??? SL to +1x: $' + sl.toFixed(2)); this.pm.updateStopLoss(sym, sl); } }
                    else if (atrMult >= 1.5) { const sl = pos.entryPrice + 0.5 * pos.atrAtEntry; if (sl > pos.stopLoss) { console.log('[TRAILING SL] ' + atrMult.toFixed(1) + 'x ATR ??? SL to +0.5x: $' + sl.toFixed(2)); this.pm.updateStopLoss(sym, sl); } }
                    else if (atrMult >= 1.0) { const sl = pos.entryPrice + 0.001 * pos.entryPrice; if (sl > pos.stopLoss) { console.log('[TRAILING SL] ' + atrMult.toFixed(1) + 'x ATR ??? breakeven'); this.pm.updateStopLoss(sym, sl); } }

                    // PARTIAL TP at 1.5x ATR
                    if (atrMult >= 1.5 && !pos._partialTpDone) {
                        const halfQty = pos.quantity * 0.5;
                        const trade = this.pm.closePosition(sym, price, halfQty, 'PARTIAL_TP_1.5ATR', 'PARTIAL_TP');
                        if (trade) {
                            this.pm.markPartialTpDone(sym);
                            this.pm.updateStopLoss(sym, pos.entryPrice + 0.001 * pos.entryPrice);
                            console.log('[PARTIAL TP] 50% @ ' + atrMult.toFixed(1) + 'x ATR: ' + halfQty.toFixed(6) + ' | PnL: $' + trade.pnl.toFixed(2));
                            if (this.ml) this.ml.learnFromTrade(trade.pnl, Date.now() - (pos.entryTime || Date.now()), marketDataHistory);
                        }
                    }
                }

                // TIME EXIT
                const hours = (Date.now() - (pos.entryTime || Date.now())) / 3600000;
                let timeExit = false;
                if (hours >= 72) { console.log('[TIME EXIT] ' + sym + ' ' + hours.toFixed(1) + 'h ??? EMERGENCY'); timeExit = true; }
                else if (hours >= 48) {
                    const minProfit = pos.atrAtEntry ? pos.atrAtEntry * 0.5 : pos.entryPrice * 0.005;
                    if ((price - pos.entryPrice) < minProfit) { console.log('[TIME EXIT] ' + sym + ' ' + hours.toFixed(1) + 'h weak'); timeExit = true; }
                }

                // SL/TP/TIME check
                let close = false, reason = '';
                if (timeExit) { close = true; reason = 'TIME_EXIT'; }
                else if (price <= pos.stopLoss) { close = true; reason = 'STOP_LOSS'; }
                else if (price >= pos.takeProfit) { close = true; reason = 'TAKE_PROFIT'; }

                if (close) {
                    const trade = this.pm.closePosition(sym, price, null, reason, reason);
                    if (trade) {
                        const e = reason === 'TAKE_PROFIT' ? '[TP]' : reason === 'STOP_LOSS' ? '[SL]' : '[TIME]';
                        console.log(e + ' ' + sym + ': $' + pos.entryPrice.toFixed(2) + ' ??? $' + price.toFixed(2) + ' | PnL: ' + (trade.pnl >= 0 ? '+' : '') + '$' + trade.pnl.toFixed(2));
                        this.risk.recordTradeResult(trade.pnl);
                        if (this.ml) this.ml.learnFromTrade(trade.pnl, Date.now() - (pos.entryTime || Date.now()), marketDataHistory);
                        // Sync APM
                        if (this.advancedPositionManager) {
                            try { const ap = this.advancedPositionManager.activePositions;
                                if (ap) { for (const [pid, p] of ap) { if (p && p.symbol === sym) { await this.advancedPositionManager.closePosition(pid, reason); break; } } }
                            } catch(e) {}
                        }
                    }
                }
            } catch (err) { console.error('[SL/TP] Error ' + sym + ':', err.message); }
        }
    }

    /**
     * Execute a consensus signal (BUY or SELL)
     * @param {object} signal
     * @param {object} dataPipeline - for fetching recent candles
     */
    async executeTradeSignal(signal, dataPipeline) {
        try {
            const valid = this._validateSignal(signal);
            if (!valid.valid) { console.log('?????? Trade rejected: ' + valid.reason); return; }

            console.log('???? Executing ' + signal.action + ' for ' + signal.symbol + ' (conf: ' + (signal.confidence * 100).toFixed(1) + '%)');

            // Get ATR for dynamic risk
            let atrValue, dynamicRisk = this.config.riskPerTrade;
            const candles = dataPipeline ? await dataPipeline.getRecentCandles(signal.symbol, 50) : null;
            if (candles && candles.length >= 20) {
                const candleData = candles.map(c => ({ symbol: signal.symbol, timestamp: Date.now(), open: c.open || c.close, high: c.high, low: c.low, close: c.close, volume: c.volume || 0 }));
                atrValue = ind.calculateATR(candleData, 14);
                dynamicRisk = this.risk.calculateDynamicRisk(signal.symbol, atrValue, signal.price);
                console.log('??????? [DYNAMIC RISK] ATR=' + (atrValue/signal.price*100).toFixed(2) + '% ??? Risk=' + (dynamicRisk*100).toFixed(2) + '%');
            } else {
                const vol = this.risk.calculateMarketVolatility(dataPipeline ? dataPipeline.getMarketDataHistory() : []);
                dynamicRisk = this.risk.calculateDynamicRiskLegacy(vol);
            }

            if (dynamicRisk === 0) { console.log('???? [CIRCUIT BREAKER] Risk=0 ??? blocked'); return; }

            await this._sleep(Math.random() * 40 + 10);
            const quantity = signal.quantity || this.risk.calculateOptimalQuantity(signal.price, signal.confidence, atrValue, signal.symbol);
            const fees = signal.price * quantity * this.config.tradingFeeRate;

            const trade = {
                id: this.config.instanceId + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                timestamp: signal.timestamp, symbol: signal.symbol, action: signal.action,
                price: signal.price, quantity, pnl: 0, strategy: signal.strategy,
                instanceId: this.config.instanceId, executionTime: 0, fees,
            };

            if (signal.action === 'BUY') {
                let sl, tp;
                if (atrValue && atrValue > 0) { sl = signal.price - 2.0 * atrValue; tp = signal.price + 3.0 * atrValue; }
                else { sl = signal.price * 0.98; tp = signal.price * 1.03; }
                this.pm.openPosition(signal.symbol, { entryPrice: signal.price, quantity, stopLoss: sl, takeProfit: tp, atrAtEntry: atrValue || 0 });
                console.log('???? [BUY] ' + quantity.toFixed(6) + ' @ $' + signal.price.toFixed(2));
                console.log('??????? SL: $' + sl.toFixed(2) + ' | TP: $' + tp.toFixed(2));
                trade.pnl = -fees;
                trade.entryPrice = signal.price;
                // APM registration
                if (this.advancedPositionManager) {
                    try { const pid = signal.symbol + '-' + Date.now();
                        await this.advancedPositionManager.openPosition(pid, signal.symbol, 'long', signal.price, quantity, signal.strategy, 2.0);
                    } catch(e) {}
                }
            } else if (signal.action === 'SELL') {
                const pos = this.pm.getPosition(signal.symbol);
                if (!pos) { console.error('??? SELL: No position for ' + signal.symbol); return; }
                const result = this.pm.closePosition(signal.symbol, signal.price, null, 'SELL', signal.strategy);
                if (result) {
                    trade.pnl = result.pnl; trade.entryPrice = pos.entryPrice; trade.quantity = pos.quantity;
                    const emoji = result.pnl >= 0 ? '???' : '???';
                    console.log('???? [SELL] $' + pos.entryPrice.toFixed(2) + ' ??? $' + signal.price.toFixed(2) + ' | ' + emoji + ' PnL: $' + result.pnl.toFixed(2));
                    if (this.ml) this.ml.learnFromTrade(result.pnl, Date.now() - (pos.entryTime || Date.now()), dataPipeline ? dataPipeline.getMarketDataHistory() : []);
                    this.risk.recordTradeResult(result.pnl);
                    // APM sync
                    if (this.advancedPositionManager) {
                        try { const ap = this.advancedPositionManager.activePositions;
                            if (ap) for (const [pid, p] of ap) { if (p && p.symbol === signal.symbol) { await this.advancedPositionManager.closePosition(pid, 'BOT_SELL'); break; } }
                        } catch(e) {}
                    }
                }
            }

            // Push trade + update portfolio
            this.pm.trades.push(trade);
            this.pm.portfolio.totalTrades++;
            if (this.pm.trades.length > 1000) this.pm.trades = this.pm.trades.slice(-1000);
            this.pm.balance.totalValue = this.pm.balance.usdtBalance + this.pm.balance.btcBalance * signal.price;
            this.pm.portfolio.totalValue = this.pm.balance.totalValue;
            this.pm.portfolio.realizedPnL += trade.pnl;
            if (trade.pnl > 0) this.pm.portfolio.successfulTrades++;
            else if (trade.pnl < 0 && signal.action === 'SELL') this.pm.portfolio.failedTrades++;
            const completed = this.pm.portfolio.successfulTrades + this.pm.portfolio.failedTrades;
            this.pm.portfolio.winRate = completed > 0 ? (this.pm.portfolio.successfulTrades / completed) * 100 : 0;

            // Record for circuit breaker (SELL only)
            if (signal.action === 'SELL') this.risk.recordTradeResult(trade.pnl);

            console.log('??? Trade: ' + trade.action + ' ' + trade.quantity.toFixed(4) + ' ' + trade.symbol + ' @ $' + trade.price.toFixed(2) + ' | PnL: $' + trade.pnl.toFixed(2));
        } catch (err) {
            console.error('??? Trade execution failed:', err.message);
        }
    }

    _validateSignal(signal) {
        if (!signal || !signal.action || !signal.price) return { valid: false, reason: 'Invalid signal' };
        if (signal.action === 'BUY' && this.pm.hasPosition(signal.symbol)) return { valid: false, reason: 'Position already open' };
        if (signal.action === 'SELL' && !this.pm.hasPosition(signal.symbol)) return { valid: false, reason: 'No position to sell' };
        if (signal.action === 'BUY') {
            const maxPos = this.pm.getPortfolio().totalValue * 0.15;
            if (signal.price * (signal.quantity || 0.001) > maxPos) return { valid: false, reason: 'Exceeds max position' };
        }
        return { valid: true };
    }

    _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

module.exports = { ExecutionEngine };

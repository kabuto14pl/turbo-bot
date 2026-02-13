'use strict';
/**
 * @module ExecutionEngine
 * @description Trade execution (BUY/SELL), advanced SL/TP monitoring,
 * ATR-based Chandelier trailing stop, 3-level partial take-profit,
 * time-based exits, break-even with buffer.
 * 
 * PATCH #14 fixes:
 * - Removed double recordTradeResult on SELL
 * - Added continuous ATR trailing above 2x (Chandelier Exit)
 * - 3-level partial TP (25% at 1.5x, 25% at 2.5x, 50% runner)
 * - Breakeven buffer = 0.3% (not 0.1%)
 * - Volatility-adaptive SL tightening
 * - SL tightened to 1.5x ATR (from 2.0x), TP widened to 4.0x (from 3.0x)
 * - 24h underwater exit for losing positions
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
     * Monitor open positions: Chandelier trailing SL, 3-level partial TP, time exits
     * @param {function} getCurrentPrice - async(symbol) => price
     * @param {Array} marketDataHistory - recent candle array
     */
    async monitorPositions(getCurrentPrice, marketDataHistory) {
        const positions = this.pm.getPositions();
        if (positions.size === 0) return;

        for (const [sym, pos] of positions) {
            try {
                const price = await getCurrentPrice(sym);
                if (!price) continue;

                // Track highest price seen (for Chandelier trailing)
                if (!pos._highestPrice || price > pos._highestPrice) {
                    pos._highestPrice = price;
                }

                const atr = pos.atrAtEntry;
                const profit = price - pos.entryPrice;
                const atrMult = atr > 0 ? profit / atr : 0;

                // ============================================
                // CHANDELIER TRAILING STOP-LOSS (ATR-based)
                // Continuous trailing from highest price minus N*ATR
                // ============================================
                if (atr > 0) {
                    let newSL = pos.stopLoss;

                    // Calculate current ATR from recent data for volatility-adaptive SL
                    let currentATR = atr;
                    if (marketDataHistory && marketDataHistory.length >= 20) {
                        const candleData = marketDataHistory.slice(-20).map(c => ({
                            symbol: sym, timestamp: Date.now(),
                            open: c.open || c.close, high: c.high, low: c.low,
                            close: c.close, volume: c.volume || 0
                        }));
                        const liveATR = ind.calculateATR(candleData, 14);
                        if (liveATR > 0) currentATR = liveATR;
                    }

                    // Phase 1: Below 1.0x ATR profit - hold initial SL
                    // Phase 2: 1.0x-1.5x ATR - move to breakeven + buffer (0.3%)
                    if (atrMult >= 1.0 && atrMult < 1.5) {
                        const beBuffer = pos.entryPrice * 0.003; // 0.3% buffer above entry
                        newSL = pos.entryPrice + beBuffer;
                    }
                    // Phase 3: 1.5x-2.0x ATR - lock 0.5x ATR profit
                    else if (atrMult >= 1.5 && atrMult < 2.0) {
                        newSL = pos.entryPrice + 0.5 * atr;
                    }
                    // Phase 4: 2.0x-3.0x ATR - lock 1.0x ATR profit
                    else if (atrMult >= 2.0 && atrMult < 3.0) {
                        newSL = pos.entryPrice + 1.0 * atr;
                    }
                    // Phase 5: 3.0x+ ATR - CHANDELIER EXIT: highest price - 1.5x current ATR
                    // This continuously trails from the high, using LIVE ATR for vol-adaptation
                    if (atrMult >= 3.0) {
                        const chandelierSL = pos._highestPrice - 1.5 * currentATR;
                        // Chandelier must be at least 1.5x ATR profit locked
                        const minChandelier = pos.entryPrice + 1.5 * atr;
                        newSL = Math.max(chandelierSL, minChandelier);
                    }

                    // SL can only move UP, never down
                    if (newSL > pos.stopLoss) {
                        const phase = atrMult >= 3.0 ? 'CHANDELIER' : atrMult >= 2.0 ? 'LOCK_1x' : atrMult >= 1.5 ? 'LOCK_0.5x' : 'BREAKEVEN';
                        console.log(`[TRAILING SL] ${phase} ${atrMult.toFixed(1)}x ATR | SL: $${pos.stopLoss.toFixed(2)} -> $${newSL.toFixed(2)} | High: $${(pos._highestPrice || price).toFixed(2)}`);
                        this.pm.updateStopLoss(sym, newSL);
                    }

                    // ============================================
                    // 3-LEVEL PARTIAL TAKE-PROFIT
                    // Level 1: 25% at 1.5x ATR
                    // Level 2: 25% at 2.5x ATR
                    // Level 3: 50% runner (full TP or Chandelier exit)
                    // ============================================

                    // PARTIAL TP LEVEL 1: 25% at 1.5x ATR
                    if (atrMult >= 1.5 && !pos._partialTp1Done && pos.quantity > 0) {
                        const closeQty = pos.quantity * 0.25;
                        if (closeQty > 0.000001) {
                            const trade = this.pm.closePosition(sym, price, closeQty, 'PARTIAL_TP_L1_1.5ATR', 'PARTIAL_TP');
                            if (trade) {
                                pos._partialTp1Done = true;
                                // Move SL to breakeven + buffer after first TP
                                const beSL = pos.entryPrice + pos.entryPrice * 0.003;
                                if (beSL > pos.stopLoss) this.pm.updateStopLoss(sym, beSL);
                                console.log(`[PARTIAL TP L1] 25% @ ${atrMult.toFixed(1)}x ATR: ${closeQty.toFixed(6)} | PnL: $${trade.pnl.toFixed(2)}`);
                                if (this.ml) this.ml.learnFromTrade(trade.pnl, Date.now() - (pos.entryTime || Date.now()), marketDataHistory);
                            }
                        }
                    }

                    // PARTIAL TP LEVEL 2: 25% at 2.5x ATR
                    if (atrMult >= 2.5 && !pos._partialTp2Done && pos.quantity > 0) {
                        const closeQty = pos.quantity * 0.333; // 25% of original = 33% of remaining 75%
                        if (closeQty > 0.000001) {
                            const trade = this.pm.closePosition(sym, price, closeQty, 'PARTIAL_TP_L2_2.5ATR', 'PARTIAL_TP');
                            if (trade) {
                                pos._partialTp2Done = true;
                                // Lock 1x ATR profit on remainder
                                const lockSL = pos.entryPrice + 1.0 * atr;
                                if (lockSL > pos.stopLoss) this.pm.updateStopLoss(sym, lockSL);
                                console.log(`[PARTIAL TP L2] 25% @ ${atrMult.toFixed(1)}x ATR: ${closeQty.toFixed(6)} | PnL: $${trade.pnl.toFixed(2)}`);
                                if (this.ml) this.ml.learnFromTrade(trade.pnl, Date.now() - (pos.entryTime || Date.now()), marketDataHistory);
                            }
                        }
                    }
                    // Level 3 (remaining 50%) runs as a "runner" - exits via TP, Chandelier SL, or time
                }

                // ============================================
                // TIME-BASED EXIT with severity levels
                // ============================================
                const hours = (Date.now() - (pos.entryTime || Date.now())) / 3600000;
                let timeExit = false;
                if (hours >= 72) {
                    console.log(`[TIME EXIT] ${sym} ${hours.toFixed(1)}h EMERGENCY`);
                    timeExit = true;
                } else if (hours >= 48) {
                    const minProfit = atr > 0 ? atr * 0.5 : pos.entryPrice * 0.005;
                    if (profit < minProfit) {
                        console.log(`[TIME EXIT] ${sym} ${hours.toFixed(1)}h weak profit`);
                        timeExit = true;
                    }
                } else if (hours >= 24 && profit < 0) {
                    // After 24h underwater by more than 0.5x ATR — cut early
                    if (atr > 0 && profit < -0.5 * atr) {
                        console.log(`[TIME EXIT] ${sym} ${hours.toFixed(1)}h underwater >0.5x ATR`);
                        timeExit = true;
                    }
                }

                // ============================================
                // SL / TP / TIME CHECK - execute close
                // ============================================
                let close = false, reason = '';
                if (timeExit) { close = true; reason = 'TIME_EXIT'; }
                else if (price <= pos.stopLoss) { close = true; reason = 'STOP_LOSS'; }
                else if (price >= pos.takeProfit) { close = true; reason = 'TAKE_PROFIT'; }

                if (close) {
                    const trade = this.pm.closePosition(sym, price, null, reason, reason);
                    if (trade) {
                        const e = reason === 'TAKE_PROFIT' ? '[TP]' : reason === 'STOP_LOSS' ? '[SL]' : '[TIME]';
                        console.log(`${e} ${sym}: $${pos.entryPrice.toFixed(2)} -> $${price.toFixed(2)} | PnL: ${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}`);
                        this.risk.recordTradeResult(trade.pnl);
                        if (this.ml) this.ml.learnFromTrade(trade.pnl, Date.now() - (pos.entryTime || Date.now()), marketDataHistory);
                        // Sync APM
                        if (this.advancedPositionManager) {
                            try {
                                const ap = this.advancedPositionManager.activePositions;
                                if (ap) {
                                    for (const [pid, p] of ap) {
                                        if (p && p.symbol === sym) {
                                            await this.advancedPositionManager.closePosition(pid, reason);
                                            break;
                                        }
                                    }
                                }
                            } catch(e) { /* APM sync non-critical */ }
                        }
                    }
                }
            } catch (err) {
                console.error(`[SL/TP] Error ${sym}:`, err.message);
            }
        }
    }

    /**
     * Execute a consensus signal (BUY or SELL)
     * PATCH #14: Removed duplicate recordTradeResult for SELL;
     *            Risk manager always drives position sizing
     */
    async executeTradeSignal(signal, dataPipeline) {
        try {
            const valid = this._validateSignal(signal);
            if (!valid.valid) { console.log(`[TRADE REJECTED] ${valid.reason}`); return; }

            console.log(`[EXEC] ${signal.action} ${signal.symbol} (conf: ${(signal.confidence * 100).toFixed(1)}%)`);

            // Get ATR for dynamic risk
            let atrValue, dynamicRisk = this.config.riskPerTrade;
            const candles = dataPipeline ? await dataPipeline.getRecentCandles(signal.symbol, 50) : null;
            if (candles && candles.length >= 20) {
                const candleData = candles.map(c => ({
                    symbol: signal.symbol, timestamp: Date.now(),
                    open: c.open || c.close, high: c.high, low: c.low,
                    close: c.close, volume: c.volume || 0
                }));
                atrValue = ind.calculateATR(candleData, 14);
                dynamicRisk = this.risk.calculateDynamicRisk(signal.symbol, atrValue, signal.price);
            } else {
                const vol = this.risk.calculateMarketVolatility(dataPipeline ? dataPipeline.getMarketDataHistory() : []);
                dynamicRisk = this.risk.calculateDynamicRiskLegacy(vol);
            }

            if (dynamicRisk === 0) { console.log('[CIRCUIT BREAKER] Risk=0 blocked'); return; }

            // Execution jitter (simulate realistic latency)
            await this._sleep(Math.random() * 40 + 10);

            // PATCH #14: Always use risk manager for quantity (ignores signal.quantity from ensemble)
            const quantity = this.risk.calculateOptimalQuantity(signal.price, signal.confidence, atrValue, signal.symbol);
            if (quantity <= 0) { console.log('[EXEC] Quantity=0, skipping'); return; }

            const fees = signal.price * quantity * this.config.tradingFeeRate;

            const trade = {
                id: this.config.instanceId + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                timestamp: signal.timestamp, symbol: signal.symbol, action: signal.action,
                price: signal.price, quantity, pnl: 0, strategy: signal.strategy,
                instanceId: this.config.instanceId, executionTime: 0, fees,
            };

            if (signal.action === 'BUY') {
                let sl, tp;
                if (atrValue && atrValue > 0) {
                    // SL: 1.5x ATR (tighter than old 2x - better R:R with trailing)
                    // TP: 4x ATR (wider - let runners run with partial TP levels)
                    sl = signal.price - 1.5 * atrValue;
                    tp = signal.price + 4.0 * atrValue;
                } else {
                    sl = signal.price * 0.985;
                    tp = signal.price * 1.04;
                }
                this.pm.openPosition(signal.symbol, {
                    entryPrice: signal.price, quantity,
                    stopLoss: sl, takeProfit: tp,
                    atrAtEntry: atrValue || 0
                });
                console.log(`[BUY] ${quantity.toFixed(6)} @ $${signal.price.toFixed(2)}`);
                console.log(`[RISK] SL: $${sl.toFixed(2)} (-${atrValue ? '1.5x ATR' : '1.5%'}) | TP: $${tp.toFixed(2)} (+${atrValue ? '4x ATR' : '4%'})`);
                trade.pnl = -fees;
                trade.entryPrice = signal.price;

                // APM registration
                if (this.advancedPositionManager) {
                    try {
                        const pid = signal.symbol + '-' + Date.now();
                        await this.advancedPositionManager.openPosition(pid, signal.symbol, 'long', signal.price, quantity, signal.strategy, 2.0);
                    } catch(e) { /* APM registration non-critical */ }
                }
            } else if (signal.action === 'SELL') {
                const pos = this.pm.getPosition(signal.symbol);
                if (!pos) { console.error(`[SELL] No position for ${signal.symbol}`); return; }
                const result = this.pm.closePosition(signal.symbol, signal.price, null, 'SELL', signal.strategy);
                if (result) {
                    trade.pnl = result.pnl;
                    trade.entryPrice = pos.entryPrice;
                    trade.quantity = pos.quantity;
                    const emoji = result.pnl >= 0 ? 'WIN' : 'LOSS';
                    console.log(`[SELL] $${pos.entryPrice.toFixed(2)} -> $${signal.price.toFixed(2)} | ${emoji} PnL: $${result.pnl.toFixed(2)}`);
                    if (this.ml) this.ml.learnFromTrade(result.pnl, Date.now() - (pos.entryTime || Date.now()), dataPipeline ? dataPipeline.getMarketDataHistory() : []);
                    // PATCH #14: recordTradeResult ONCE here only — removed duplicate at bottom
                    this.risk.recordTradeResult(result.pnl);
                    // APM sync
                    if (this.advancedPositionManager) {
                        try {
                            const ap = this.advancedPositionManager.activePositions;
                            if (ap) {
                                for (const [pid, p] of ap) {
                                    if (p && p.symbol === signal.symbol) {
                                        await this.advancedPositionManager.closePosition(pid, 'BOT_SELL');
                                        break;
                                    }
                                }
                            }
                        } catch(e) { /* APM sync non-critical */ }
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

            // PATCH #14: NO duplicate recordTradeResult here (this was the double-count bug)

            console.log(`[EXEC DONE] ${trade.action} ${trade.quantity.toFixed(4)} ${trade.symbol} @ $${trade.price.toFixed(2)} | PnL: $${trade.pnl.toFixed(2)}`);
        } catch (err) {
            console.error(`[EXEC ERROR] ${err.message}`);
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

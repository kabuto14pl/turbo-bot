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

                // Track highest/lowest price seen (for Chandelier trailing)
                if (!pos._highestPrice || price > pos._highestPrice) {
                    pos._highestPrice = price;
                }
                if (!pos._lowestPrice || price < pos._lowestPrice) {
                    pos._lowestPrice = price;
                }

                const atr = pos.atrAtEntry;
                const isShort = pos.side === 'SHORT';
                const profit = isShort ? (pos.entryPrice - price) : (price - pos.entryPrice);
                const atrMult = atr > 0 ? profit / atr : 0;

                // QPM COORDINATION (PATCH #19)
                const qpmManaged = pos._qpmManaged || false;

                // ============================================
                // CHANDELIER TRAILING STOP-LOSS (ATR-based)
                // Active only for LONG positions without QPM management.
                // ============================================
                // PATCH #23: SHORT trailing stop-loss
                if (atr > 0 && !qpmManaged && isShort) {
                    let newShortSL = pos.stopLoss;
                    const shortProfit = pos.entryPrice - price;
                    const shortAtrMult = atr > 0 ? shortProfit / atr : 0;
                    
                    if (shortAtrMult >= 1.0 && shortAtrMult < 1.5) {
                        newShortSL = pos.entryPrice - pos.entryPrice * 0.003;
                    } else if (shortAtrMult >= 1.5 && shortAtrMult < 2.0) {
                        newShortSL = pos.entryPrice - 0.5 * atr;
                    } else if (shortAtrMult >= 2.0 && shortAtrMult < 3.0) {
                        newShortSL = pos.entryPrice - 1.0 * atr;
                    }
                    if (shortAtrMult >= 3.0 && pos._lowestPrice) {
                        var chandelierShortSL = pos._lowestPrice + 1.5 * atr;
                        var minChanShort = pos.entryPrice - 1.5 * atr;
                        newShortSL = Math.min(chandelierShortSL, minChanShort);
                    }
                    
                    if (newShortSL < pos.stopLoss) {
                        var shortPhase = shortAtrMult >= 3.0 ? 'CHANDELIER' : shortAtrMult >= 2.0 ? 'LOCK_1x' : shortAtrMult >= 1.5 ? 'LOCK_0.5x' : 'BREAKEVEN';
                        console.log('[SHORT TRAIL] ' + shortPhase + ' ' + shortAtrMult.toFixed(1) + 'x ATR | SL: $' + pos.stopLoss.toFixed(2) + ' -> $' + newShortSL.toFixed(2));
                        this.pm.updateStopLoss(sym, newShortSL);
                    }
                    
                    if (shortAtrMult >= 1.5 && !pos._partialTp1Done && pos.quantity > 0) {
                        var closeQtyS1 = pos.quantity * 0.25;
                        if (closeQtyS1 > 0.000001) {
                            var tradeS1 = this.pm.closePosition(sym, price, closeQtyS1, 'SHORT_TP_L1', 'PARTIAL_TP');
                            if (tradeS1) {
                                pos._partialTp1Done = true;
                                console.log('[SHORT TP L1] 25% @ ' + shortAtrMult.toFixed(1) + 'x ATR | PnL: $' + tradeS1.pnl.toFixed(2));
                                if (this.ml) this.ml.learnFromTrade(tradeS1.pnl, Date.now() - (pos.entryTime || Date.now()), marketDataHistory);
                            }
                        }
                    }
                    if (shortAtrMult >= 2.5 && !pos._partialTp2Done && pos.quantity > 0) {
                        var closeQtyS2 = pos.quantity * 0.333;
                        if (closeQtyS2 > 0.000001) {
                            var tradeS2 = this.pm.closePosition(sym, price, closeQtyS2, 'SHORT_TP_L2', 'PARTIAL_TP');
                            if (tradeS2) {
                                pos._partialTp2Done = true;
                                console.log('[SHORT TP L2] 25% @ ' + shortAtrMult.toFixed(1) + 'x ATR | PnL: $' + tradeS2.pnl.toFixed(2));
                                if (this.ml) this.ml.learnFromTrade(tradeS2.pnl, Date.now() - (pos.entryTime || Date.now()), marketDataHistory);
                            }
                        }
                    }
                }
                if (atr > 0 && !qpmManaged && !isShort) {
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

                    // PATCH #26: Minimum hold time — first 15 min, only allow SL if loss > 2.5x ATR
                // Analysis showed <5min trades have only 20% win rate (noise trading)
                const holdMinutes = (Date.now() - (pos.entryTime || Date.now())) / 60000;
                if (holdMinutes < 15 && atrMult < 1.0) {
                    // During first 15 min, DON'T tighten SL — let position breathe
                    // Only trail after minimum hold period or if already profitable > 1x ATR
                }

                // SL can only move UP, never down
                    if (newSL > pos.stopLoss && (holdMinutes >= 15 || atrMult >= 1.0)) {
                        const phase = atrMult >= 3.0 ? 'CHANDELIER' : atrMult >= 2.0 ? 'LOCK_1x' : atrMult >= 1.5 ? 'LOCK_0.5x' : 'BREAKEVEN';
                        console.log(`[TRAILING SL] ${phase} ${atrMult.toFixed(1)}x ATR | SL: $${pos.stopLoss.toFixed(2)} -> $${newSL.toFixed(2)} | High: $${(pos._highestPrice || price).toFixed(2)}`);
                        this.pm.updateStopLoss(sym, newSL);
                    }

                    // ============================================
                    // 3-LEVEL PARTIAL TAKE-PROFIT
                    // Level 1: 25% at 2.0x ATR (P27: adjusted for 2.5x SL, ~0.8R)
                    // Level 2: 25% at 3.75x ATR (P27: 1:1.5 RR with 2.5x SL)
                    // Level 3: 50% runner (full TP or Chandelier exit)
                    // ============================================

                    // PARTIAL TP LEVEL 1: 25% at 2.0x ATR — 0.8R with 2.5x ATR SL (P27)
                    if (atrMult >= 2.0 && !pos._partialTp1Done && pos.quantity > 0) {
                        const closeQty = pos.quantity * 0.25;
                        if (closeQty > 0.000001) {
                            const trade = this.pm.closePosition(sym, price, closeQty, 'PARTIAL_TP_L1_2.0ATR', 'PARTIAL_TP');
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

                    // PARTIAL TP LEVEL 2: 25% at 3.75x ATR — 1:1.5 RR with 2.5x ATR SL (P27)
                    if (atrMult >= 3.75 && !pos._partialTp2Done && pos.quantity > 0) {
                        const closeQty = pos.quantity * 0.333; // 25% of original = 33% of remaining 75%
                        if (closeQty > 0.000001) {
                            const trade = this.pm.closePosition(sym, price, closeQty, 'PARTIAL_TP_L2_3.75ATR', 'PARTIAL_TP');
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
                // SL / TP / TIME CHECK - execute close (direction-aware)
                // ============================================
                // PATCH #26: Minimum hold time gate for SL — during first 10 min, only emergency SL
                const holdMin = (Date.now() - (pos.entryTime || Date.now())) / 60000;
                const isEmergencySL = atr > 0 ? Math.abs(profit) > 2.5 * atr : Math.abs(profit / pos.entryPrice) > 0.04;

                let close = false, reason = '';
                if (timeExit) { close = true; reason = 'TIME_EXIT'; }
                else if (isShort) {
                    if (price >= pos.stopLoss) {
                        // PATCH #26: During first 10 min, only close on emergency SL
                        if (holdMin >= 10 || isEmergencySL) {
                            close = true; reason = 'STOP_LOSS';
                        } else {
                            console.log('[HOLD GATE] ' + sym + ' SL hit at ' + holdMin.toFixed(1) + 'min — holding (min 10min rule), loss: $' + Math.abs(profit).toFixed(2));
                        }
                    }
                    else if (pos.takeProfit && price <= pos.takeProfit) {
                        // PATCH #26: During first 15 min, require wider TP margin (let it run more)
                        if (holdMin >= 15 || Math.abs(profit) > 1.5 * (atr || pos.entryPrice * 0.02)) {
                            close = true; reason = 'TAKE_PROFIT';
                        }
                    }
                } else {
                    if (price <= pos.stopLoss) {
                        if (holdMin >= 10 || isEmergencySL) {
                            close = true; reason = 'STOP_LOSS';
                        } else {
                            console.log('[HOLD GATE] ' + sym + ' SL hit at ' + holdMin.toFixed(1) + 'min — holding (min 10min rule), loss: $' + Math.abs(profit).toFixed(2));
                        }
                    }
                    else if (price >= pos.takeProfit) {
                        if (holdMin >= 15 || profit > 1.5 * (atr || pos.entryPrice * 0.02)) {
                            close = true; reason = 'TAKE_PROFIT';
                        }
                    }
                }

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

            // PATCH #26: Anti-scalping cooldown check — minimum 3 min between new entries
            if ((signal.action === 'BUY' || signal.action === 'SELL') && this.risk && this.risk.checkTradeCooldown) {
                if (!this.risk.checkTradeCooldown()) {
                    console.log('[EXEC P26] Trade BLOCKED by anti-scalping cooldown');
                    return;
                }
            }
            console.log('[EXEC] ' + signal.action + ' ' + signal.symbol + ' (conf: ' + (signal.confidence * 100).toFixed(1) + '%)');

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
                    // PATCH #26: SL widened to 2.0x ATR to reduce premature SL hits
                    // (analysis showed 9 SL exits = -$60.55, SL too tight)
                    // TP widened to 5.0x ATR for better RR (target 1:2.5)
                    sl = signal.price - 2.5 * atrValue; // P27: SL widened 2.0->2.5x ATR for fewer premature stops
                    tp = signal.price + 5.0 * atrValue;
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
                if (!pos) {
                    // PATCH #23+#26: SHORT with wider SL (2.0x ATR) and TP (5.0x ATR)
                    let shortSL, shortTP;
                    if (atrValue && atrValue > 0) {
                        shortSL = signal.price + 2.5 * atrValue; // P27: SL widened 2.0->2.5x ATR
                        shortTP = signal.price - 5.0 * atrValue;
                    } else {
                        shortSL = signal.price * 1.015;
                        shortTP = signal.price * 0.96;
                    }
                    this.pm.openPosition(signal.symbol, {
                        entryPrice: signal.price, quantity,
                        stopLoss: shortSL, takeProfit: shortTP,
                        atrAtEntry: atrValue || 0, side: 'SHORT'
                    });
                    console.log('[NEURON AI] SHORT OPEN: ' + quantity.toFixed(6) + ' ' + signal.symbol + ' @ $' + signal.price.toFixed(2));
                    console.log('[RISK] SL: $' + shortSL.toFixed(2) + ' (+' + (atrValue ? '1.5x ATR' : '1.5%') + ') | TP: $' + shortTP.toFixed(2) + ' (-' + (atrValue ? '4x ATR' : '4%') + ')');
                    trade.pnl = -fees;
                    trade.entryPrice = signal.price;
                    trade.action = 'SHORT';
                    if (this.advancedPositionManager) {
                        try {
                            const pid = signal.symbol + '-SHORT-' + Date.now();
                            await this.advancedPositionManager.openPosition(pid, signal.symbol, 'short', signal.price, quantity, signal.strategy, 2.0);
                        } catch(eApmShort) { /* APM non-critical */ }
                    }
                    this.pm.trades.push(trade);
                    if (this.pm.trades.length > 1000) this.pm.trades = this.pm.trades.slice(-1000);
                    this.pm.balance.totalValue = this.pm.balance.usdtBalance + Math.abs(this.pm.balance.btcBalance) * signal.price;
                    this.pm.portfolio.totalValue = this.pm.balance.totalValue;
                    console.log('[EXEC DONE] SHORT ' + trade.quantity.toFixed(4) + ' ' + trade.symbol + ' @ $' + trade.price.toFixed(2) + ' | Fees: $' + fees.toFixed(2));
                    return;
                }
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

            // PATCH #26: Mark trade timestamp for anti-scalping cooldown
            if (this.risk && this.risk.markTradeExecuted) {
                this.risk.markTradeExecuted();
            }
            console.log('[EXEC DONE] ' + trade.action + ' ' + trade.quantity.toFixed(4) + ' ' + trade.symbol + ' @ $' + trade.price.toFixed(2) + ' | PnL: $' + trade.pnl.toFixed(2));
        } catch (err) {
            console.error('[EXEC ERROR] ' + err.message);
        }
    }

    // PATCH #25: Multi-position support — removed hasPosition BUY block
    _validateSignal(signal) {
        if (!signal || !signal.action || !signal.price) return { valid: false, reason: 'Invalid signal' };
        // PATCH #25: Allow BUY even when position exists (multi-position)
        // Limit: max 5 simultaneous positions per symbol
        if (signal.action === 'BUY') {
            const currentCount = this.pm.getPositionCountForSymbol
                ? this.pm.getPositionCountForSymbol(signal.symbol)
                : (this.pm.hasPosition(signal.symbol) ? 1 : 0);
            if (currentCount >= 5) {
                return { valid: false, reason: 'Max 5 positions for ' + signal.symbol };
            }
            // Max position value check: 20% of portfolio per position
            const maxPos = this.pm.getPortfolio().totalValue * 0.20;
            if (signal.price * (signal.quantity || 0.001) > maxPos) return { valid: false, reason: 'Exceeds max position' };
        }
        // PATCH #23: SELL without position = open SHORT
        return { valid: true };
    }

    _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

module.exports = { ExecutionEngine };

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
 *
 * PATCH #44: SKYNET PRIME fixes:
 * - [P0-A] Fee Gate: reject trades where expected profit < 1.5× fees
 * - [P0-B] learnFromTrade dedup: single learn point in bot.js
 * - [P0-C] Min-hold cooldown: 15min between close and re-open
 * - [P0-E] SHORT trailing SL: 5-phase Chandelier for SHORT positions
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
        this.megatron = null; // PATCH #36: Megatron reference for activity logging
        // PATCH #44: Min-hold cooldown tracking
        this._lastCloseTime = 0;
        // P#214: OKX live execution engine (null = paper trading)
        this._okxEngine = null;
        this._liveMode = false;
    }

    setAdvancedPositionManager(apm) { this.advancedPositionManager = apm; }
    setMonitoringSystem(ms) { this.monitoringSystem = ms; }
    // PATCH #36: Allow bot.js to set Megatron reference for SL/TP/TIME activity logs
    setMegatron(megatron) { this.megatron = megatron; }

    /**
     * P#214: Set OKX execution engine for live/demo trading.
     * When set AND config.enableLiveTrading=true AND config.paperTrading=false,
     * orders are sent to OKX API before updating in-memory portfolio.
     */
    setOKXEngine(okxEngine) {
        this._okxEngine = okxEngine;
        this._liveMode = !!(okxEngine && this.config.enableLiveTrading && !this.config.paperTrading);
        console.log('[EXEC] Mode: ' + (this._liveMode ? 'LIVE (OKX API)' : 'PAPER (in-memory)'));
    }

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
                // Direction-aware profit calculation: positive = favorable move
                const profit = isShort ? (pos.entryPrice - price) : (price - pos.entryPrice);
                const atrMult = atr > 0 ? profit / atr : 0;

                // ============================================
                // QPM COORDINATION (PATCH #19)
                // When Quantum Position Manager is actively managing
                // this position's SL/TP via quantum-adjusted algorithms
                // (VQC regime + QRA risk + QMC scenarios), skip classical
                // trailing phases to avoid conflicting adjustments.
                // SHORT positions are also deferred to QPM for full
                // direction-aware quantum management.
                // ============================================
                const qpmManaged = pos._qpmManaged || false;

                // ============================================
                // CHANDELIER TRAILING STOP-LOSS (ATR-based)
                // Continuous trailing from highest price minus N*ATR
                // Active only for LONG positions without QPM management.
                // SHORT trailing and QPM-managed positions use quantum SL.
                // ============================================
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

                    // SL can only move UP, never down
                    if (newSL > pos.stopLoss) {
                        const phase = atrMult >= 3.0 ? 'CHANDELIER' : atrMult >= 2.0 ? 'LOCK_1x' : atrMult >= 1.5 ? 'LOCK_0.5x' : 'BREAKEVEN';
                        console.log(`[TRAILING SL] ${phase} ${atrMult.toFixed(1)}x ATR | SL: $${pos.stopLoss.toFixed(2)} -> $${newSL.toFixed(2)} | High: $${(pos._highestPrice || price).toFixed(2)}`);
                        this.pm.updateStopLoss(sym, newSL);
                    }

                    // ============================================
                    // 3-LEVEL PARTIAL TAKE-PROFIT
                    // P#216: Widened levels for wider TP (4.0x ATR)
                    // Level 1: 25% at 2.0x ATR (was 1.5x)
                    // Level 2: 25% at 3.0x ATR (was 2.5x)
                    // Level 3: 50% runner (full TP or Chandelier exit)
                    // ============================================

                    // PARTIAL TP LEVEL 1: 25% at 2.0x ATR
                    if (atrMult >= 2.0 && !pos._partialTp1Done && pos.quantity > 0) {
                        const closeQty = pos.quantity * 0.25;
                        if (closeQty > 0.000001) {
                            const trade = this.pm.closePosition(sym, price, closeQty, 'PARTIAL_TP_L1_1.5ATR', 'PARTIAL_TP');
                            if (trade) {
                                pos._partialTp1Done = true;
                                // Move SL to breakeven + buffer after first TP
                                const beSL = pos.entryPrice + pos.entryPrice * 0.003;
                                if (beSL > pos.stopLoss) this.pm.updateStopLoss(sym, beSL);
                                console.log(`[PARTIAL TP L1] 25% @ ${atrMult.toFixed(1)}x ATR: ${closeQty.toFixed(6)} | PnL: $${trade.pnl.toFixed(2)}`);
                                // PATCH #44B: learnFromTrade removed — single learn point in bot.js _detectAndLearnFromCloses()
                            }
                        }
                    }

                    // PARTIAL TP LEVEL 2: 25% at 3.0x ATR (P#216: was 2.5x)
                    if (atrMult >= 3.0 && !pos._partialTp2Done && pos.quantity > 0) {
                        const closeQty = pos.quantity * 0.333; // 25% of original = 33% of remaining 75%
                        if (closeQty > 0.000001) {
                            const trade = this.pm.closePosition(sym, price, closeQty, 'PARTIAL_TP_L2_2.5ATR', 'PARTIAL_TP');
                            if (trade) {
                                pos._partialTp2Done = true;
                                // Lock 1x ATR profit on remainder
                                const lockSL = pos.entryPrice + 1.0 * atr;
                                if (lockSL > pos.stopLoss) this.pm.updateStopLoss(sym, lockSL);
                                console.log(`[PARTIAL TP L2] 25% @ ${atrMult.toFixed(1)}x ATR: ${closeQty.toFixed(6)} | PnL: $${trade.pnl.toFixed(2)}`);
                                // PATCH #44B: learnFromTrade removed — single learn point in bot.js _detectAndLearnFromCloses()
                            }
                        }
                    }
                    // Level 3 (remaining 50%) runs as a "runner" - exits via TP, Chandelier SL, or time
                }

                // ============================================
                // PATCH #44E: SHORT TRAILING STOP-LOSS (ATR-based)
                // Mirror of LONG 5-phase trailing but tracking
                // _lowestPrice and moving SL DOWN (tighter).
                // Fallback when QPM is not managing the position.
                // ============================================
                if (atr > 0 && !qpmManaged && isShort) {
                    let newSL = pos.stopLoss;

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

                    // SHORT Phase 2: 1.0x-1.5x ATR — move SL to breakeven - buffer
                    if (atrMult >= 1.0 && atrMult < 1.5) {
                        const beBuffer = pos.entryPrice * 0.003;
                        newSL = pos.entryPrice - beBuffer;
                    }
                    // SHORT Phase 3: 1.5x-2.0x ATR — lock 0.5x ATR profit
                    else if (atrMult >= 1.5 && atrMult < 2.0) {
                        newSL = pos.entryPrice - 0.5 * atr;
                    }
                    // SHORT Phase 4: 2.0x-3.0x ATR — lock 1.0x ATR profit
                    else if (atrMult >= 2.0 && atrMult < 3.0) {
                        newSL = pos.entryPrice - 1.0 * atr;
                    }
                    // SHORT Phase 5: 3.0x+ — Chandelier from lowest price + 1.5x ATR
                    if (atrMult >= 3.0) {
                        const chandelierSL = pos._lowestPrice + 1.5 * currentATR;
                        const minChandelier = pos.entryPrice - 1.5 * atr;
                        newSL = Math.min(chandelierSL, minChandelier);
                    }

                    // SHORT: SL can only move DOWN (tighter)
                    if (newSL > 0 && newSL < pos.stopLoss) {
                        const phase = atrMult >= 3.0 ? 'CHANDELIER' : atrMult >= 2.0 ? 'LOCK_1x' : atrMult >= 1.5 ? 'LOCK_0.5x' : 'BREAKEVEN';
                        console.log('[SHORT TRAILING SL] ' + phase + ' ' + atrMult.toFixed(1) + 'x ATR | SL: $' + pos.stopLoss.toFixed(2) + ' -> $' + newSL.toFixed(2) + ' | Low: $' + (pos._lowestPrice || price).toFixed(2));
                        this.pm.updateStopLoss(sym, newSL);
                    }
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
                // Direction-aware: LONG SL below entry, SHORT SL above entry
                // ============================================
                let close = false, reason = '';
                if (timeExit) { close = true; reason = 'TIME_EXIT'; }
                else if (isShort) {
                    // SHORT: SL is above entry (price rises beyond stop = loss)
                    // SHORT: TP is below entry (price falls to target = profit)
                    if (price >= pos.stopLoss) { close = true; reason = 'STOP_LOSS'; }
                    else if (pos.takeProfit && price <= pos.takeProfit) { close = true; reason = 'TAKE_PROFIT'; }
                } else {
                    // LONG: SL is below entry (price falls below stop = loss)
                    // LONG: TP is above entry (price rises to target = profit)
                    if (price <= pos.stopLoss) { close = true; reason = 'STOP_LOSS'; }
                    else if (price >= pos.takeProfit) { close = true; reason = 'TAKE_PROFIT'; }
                }

                if (close) {
                    const trade = this.pm.closePosition(sym, price, null, reason, reason);
                    if (trade) {
                        const e = reason === 'TAKE_PROFIT' ? '[TP]' : reason === 'STOP_LOSS' ? '[SL]' : '[TIME]';
                        console.log(`${e} ${sym}: $${pos.entryPrice.toFixed(2)} -> $${price.toFixed(2)} | PnL: ${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}`);
                        this.risk.recordTradeResult(trade.pnl);
                        // PATCH #44B: learnFromTrade removed — single learn point in bot.js _detectAndLearnFromCloses()
                        // PATCH #44C: Track close time for min-hold cooldown
                        this._lastCloseTime = Date.now();
                        // PATCH #36: Log SL/TP/TIME close to Megatron activity feed (P1-5)
                        if (this.megatron) {
                            const icon = reason === 'TAKE_PROFIT' ? '🎯' : reason === 'STOP_LOSS' ? '🛑' : '⏰';
                            const pnlStr = (trade.pnl >= 0 ? '+' : '') + '$' + trade.pnl.toFixed(2);
                            const severity = trade.pnl >= 0 ? 'normal' : 'high';
                            this.megatron.logActivity('TRADE', icon + ' ' + reason.replace('_', ' ') + ': ' + sym,
                                pnlStr + ' | Entry: $' + pos.entryPrice.toFixed(2) + ' → Exit: $' + price.toFixed(2) +
                                ' | Duration: ' + ((Date.now() - (pos.entryTime || Date.now())) / 3600000).toFixed(1) + 'h',
                                { reason, pnl: trade.pnl, entryPrice: pos.entryPrice, exitPrice: price }, severity);
                        }
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
            const quantity = this.risk.calculateOptimalQuantity(signal.price, signal.confidence, atrValue, signal.symbol, signal.regime || null);
            if (quantity <= 0) { console.log('[EXEC] Quantity=0, skipping'); return; }

            const fees = signal.price * quantity * this.config.tradingFeeRate;

            // ═══════════════════════════════════════════════════════
            // P#216: FEE GATE — reject trades where expected
            // profit < 2.0× round-trip fees (was 1.5×). Prevents fee-burning.
            // ═══════════════════════════════════════════════════════
            if (signal.action === 'BUY') {
                const roundTripFees = fees * 2; // entry + exit
                const expectedMinMove = atrValue ? atrValue * 1.5 : signal.price * 0.015;
                const expectedProfit = expectedMinMove * quantity;
                if (expectedProfit < roundTripFees * 2.0) {
                    console.log('[FEE GATE] REJECTED: Expected $' + expectedProfit.toFixed(2) +
                        ' < 2.0x fees $' + (roundTripFees * 2.0).toFixed(2) +
                        ' | ATR: ' + (atrValue ? atrValue.toFixed(2) : 'N/A'));
                    return;
                }
            }

            // ═══════════════════════════════════════════════════════
            // P#213: MIN-HOLD COOLDOWN reduced 15min → 5min
            // 15min was too restrictive — blocked re-entry on valid signals
            // after quick SL exits. 5min prevents churning, allows recovery.
            // ═══════════════════════════════════════════════════════════
            if (signal.action === 'BUY' && this._lastCloseTime > 0) {
                const MIN_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes (was 15)
                const elapsed = Date.now() - this._lastCloseTime;
                if (elapsed < MIN_COOLDOWN_MS) {
                    console.log('[MIN HOLD] BUY rejected — cooldown ' +
                        ((MIN_COOLDOWN_MS - elapsed) / 60000).toFixed(1) + 'min remaining');
                    return;
                }
            }

            const trade = {
                id: this.config.instanceId + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                timestamp: Date.now(), symbol: signal.symbol, action: signal.action,
                signalTimestamp: signal.timestamp,  // P#207a: Keep original candle time for reference
                price: signal.price, quantity, pnl: 0, strategy: signal.strategy,
                instanceId: this.config.instanceId, executionTime: 0, fees,
            };

            if (signal.action === 'BUY') {
                let sl, tp;
                if (atrValue && atrValue > 0) {
                    // P#232: SL/TP from config (env var per pair). Defaults: SL 1.5x, TP 4.0x
                    let slMult = this.config.slAtrMultiplier || 1.5;
                    let tpMult = this.config.tpAtrMultiplier || 4.0;

                    // P#233: Adaptive regime-based SL/TP adjustment (mirrors Python VQC_REGIME_SL/TP_ADJUST)
                    // Uses ADX from candles to classify regime and scale multipliers
                    if (candles && candles.length >= 20) {
                        const adx = ind.calculateRealADX(candles.map(c => ({
                            high: c.high, low: c.low, close: c.close
                        })), 14);
                        const recentPrices = candles.slice(-20).map(c => c.close);
                        const ema9 = ind.calculateEMA(recentPrices, 9);
                        const ema21 = ind.calculateEMA(recentPrices, 21);
                        const lastClose = recentPrices[recentPrices.length - 1];

                        let regime = 'RANGING';
                        if (adx > 25) {
                            regime = (lastClose > ema21 && ema9 > ema21) ? 'TRENDING_UP' : 'TRENDING_DOWN';
                        } else if (atrValue / lastClose > 0.02) {
                            regime = 'HIGH_VOLATILITY';
                        }

                        // Regime multipliers matching Python config VQC_REGIME_SL/TP_ADJUST
                        const REGIME_SL = { TRENDING_UP: 1.10, TRENDING_DOWN: 1.10, RANGING: 0.85, HIGH_VOLATILITY: 1.15 };
                        const REGIME_TP = { TRENDING_UP: 1.30, TRENDING_DOWN: 1.30, RANGING: 0.75, HIGH_VOLATILITY: 0.85 };
                        slMult *= (REGIME_SL[regime] || 1.0);
                        tpMult *= (REGIME_TP[regime] || 1.0);
                        console.log(`[REGIME] ${regime} (ADX=${adx.toFixed(1)}) → SL=${slMult.toFixed(2)}x TP=${tpMult.toFixed(2)}x`);
                    }

                    sl = signal.price - slMult * atrValue;
                    tp = signal.price + tpMult * atrValue;
                } else {
                    sl = signal.price * 0.985;
                    tp = signal.price * 1.040; // P#216: 4% (was 2.5%)
                }

                // ═══════════════════════════════════════════════════════
                // P#214: OKX LIVE EXECUTION — send real order to exchange
                // before updating in-memory portfolio. If OKX rejects,
                // abort the trade. Paper mode skips this entirely.
                // ═══════════════════════════════════════════════════════
                if (this._liveMode && this._okxEngine) {
                    try {
                        const okxResult = await this._okxEngine.executeOrder({
                            symbol: signal.symbol,
                            side: 'BUY',
                            type: 'market',
                            quantity: quantity,
                            price: signal.price,
                        });
                        if (!okxResult.success) {
                            console.log('[OKX REJECTED] BUY ' + signal.symbol + ': ' + (okxResult.error || 'unknown'));
                            if (this.megatron) this.megatron.logActivity('TRADE', 'OKX Order Rejected',
                                'BUY ' + signal.symbol + ': ' + (okxResult.error || 'unknown'), {}, 'critical');
                            return;
                        }
                        console.log('[OKX FILLED] BUY ' + signal.symbol + ' orderId: ' + okxResult.orderId);
                    } catch (okxErr) {
                        console.error('[OKX ERROR] BUY ' + signal.symbol + ':', okxErr.message);
                        if (this.megatron) this.megatron.logActivity('TRADE', 'OKX Error',
                            'BUY ' + signal.symbol + ': ' + okxErr.message, {}, 'critical');
                        return; // Do NOT update portfolio if exchange order failed
                    }
                }

                this.pm.openPosition(signal.symbol, {
                    entryPrice: signal.price, quantity,
                    stopLoss: sl, takeProfit: tp,
                    atrAtEntry: atrValue || 0
                });
                console.log(`[BUY] ${quantity.toFixed(6)} @ $${signal.price.toFixed(2)}`);
                console.log(`[RISK] SL: $${sl.toFixed(2)} | TP: $${tp.toFixed(2)}`);
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

                // P#214: OKX LIVE SELL — send real sell order before updating portfolio
                if (this._liveMode && this._okxEngine) {
                    try {
                        const okxResult = await this._okxEngine.executeOrder({
                            symbol: signal.symbol,
                            side: 'SELL',
                            type: 'market',
                            quantity: pos.quantity,
                            price: signal.price,
                        });
                        if (!okxResult.success) {
                            console.log('[OKX REJECTED] SELL ' + signal.symbol + ': ' + (okxResult.error || 'unknown'));
                            if (this.megatron) this.megatron.logActivity('TRADE', 'OKX Sell Rejected',
                                'SELL ' + signal.symbol + ': ' + (okxResult.error || 'unknown'), {}, 'critical');
                            return;
                        }
                        console.log('[OKX FILLED] SELL ' + signal.symbol + ' orderId: ' + okxResult.orderId);
                    } catch (okxErr) {
                        console.error('[OKX ERROR] SELL ' + signal.symbol + ':', okxErr.message);
                        if (this.megatron) this.megatron.logActivity('TRADE', 'OKX Sell Error',
                            'SELL ' + signal.symbol + ': ' + okxErr.message, {}, 'critical');
                        return; // Do NOT update portfolio if exchange order failed
                    }
                }

                const result = this.pm.closePosition(signal.symbol, signal.price, null, 'SELL', signal.strategy);
                if (result) {
                    trade.pnl = result.pnl;
                    trade.entryPrice = pos.entryPrice;
                    trade.quantity = pos.quantity;
                    const emoji = result.pnl >= 0 ? 'WIN' : 'LOSS';
                    console.log(`[SELL] $${pos.entryPrice.toFixed(2)} -> $${signal.price.toFixed(2)} | ${emoji} PnL: $${result.pnl.toFixed(2)}`);
                    // PATCH #44B: learnFromTrade removed — single learn point in bot.js _detectAndLearnFromCloses()
                    // PATCH #44C: Track close time for min-hold cooldown
                    this._lastCloseTime = Date.now();
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
            // PATCH #36: Only push trade for BUY — SELL is already recorded by pm.closePosition() (P2-4)
            if (signal.action === 'BUY') {
                this.pm.trades.push(trade);
                this.pm.portfolio.totalTrades++;
                if (this.pm.trades.length > 1000) this.pm.trades = this.pm.trades.slice(-1000);
                this.pm.portfolio.realizedPnL += trade.pnl; // BUY pnl = -fees only
            }
            this.pm.balance.totalValue = this.pm.balance.usdtBalance + this.pm.balance.btcBalance * signal.price;
            this.pm.portfolio.totalValue = this.pm.balance.totalValue;

            // PATCH #14: NO duplicate recordTradeResult here (this was the double-count bug)

            console.log(`[EXEC DONE] ${trade.action} ${trade.quantity.toFixed(4)} ${trade.symbol} @ $${trade.price.toFixed(2)} | PnL: $${trade.pnl.toFixed(2)}`);
        } catch (err) {
            console.error(`[EXEC ERROR] ${err.message}`);
        }
    }

    /**
     * PATCH #20: Fixed validation — works with risk manager sizing (quantity=0 from ensemble).
     * Uses portfolio value + risk manager for actual sizing validation, not signal.quantity.
     */
    _validateSignal(signal) {
        if (!signal || !signal.action || !signal.price) return { valid: false, reason: 'Invalid signal' };
        if (signal.action === 'BUY' && this.pm.hasPosition(signal.symbol)) return { valid: false, reason: 'Position already open' };
        if (signal.action === 'SELL' && !this.pm.hasPosition(signal.symbol)) return { valid: false, reason: 'No position to sell' };
        if (signal.action === 'BUY') {
            const portfolio = this.pm.getPortfolio();
            const maxPositionValue = portfolio.totalValue * 0.20; // 20% max from risk config
            // Check available balance, not signal.quantity (which is 0 from ensemble)
            if (this.pm.balance.usdtBalance < signal.price * 0.001) {
                return { valid: false, reason: 'Insufficient balance' };
            }
            // Validate total exposure won't exceed limits
            const currentExposure = this.pm.balance.btcBalance * signal.price;
            if (currentExposure >= maxPositionValue) {
                return { valid: false, reason: 'Max position value exceeded ($' + maxPositionValue.toFixed(0) + ')' };
            }
        }
        return { valid: true };
    }

    _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

module.exports = { ExecutionEngine };

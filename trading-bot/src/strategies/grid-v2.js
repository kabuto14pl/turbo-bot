'use strict';
/**
 * @module GridV2Strategy
 * @description P#171: Live JS implementation of Grid V2 mean-reversion strategy.
 * Ported from ml-service/backtest_pipeline/grid_v2.py (P#71/P#72).
 *
 * RANGING-only (ADX < threshold), BB%B + RSI mean-reversion.
 * BYPASSES ensemble voting — operates independently.
 *
 * TARGET PAIRS: BNBUSDT ($3800), XRPUSDT ($1000)
 */

// ============================================================================
// GRID V2 PARAMETERS (P#211: updated from Python backtest, calibrated)
// ============================================================================

const GRID_ADX_THRESHOLD = 20;        // Max ADX for grid activation
const GRID_BB_LOWER_ENTRY = 0.12;     // P#200c: Relaxed from 0.08 — more entries
const GRID_BB_UPPER_ENTRY = 0.88;     // P#200c: Relaxed from 0.92
const GRID_RSI_OVERSOLD = 36;         // RSI below → BUY confirmation
const GRID_RSI_OVERBOUGHT = 64;       // RSI above → SELL confirmation
const GRID_SL_ATR = 0.70;             // SL 0.7× ATR (tight)
const GRID_TP_ATR = 1.50;             // P#211b: widened from 1.20 — fee economics require bigger TP
const GRID_COOLDOWN_MS = 5 * 3600000; // 5h between grid trades
const GRID_MAX_TRADES_DAY = 8;        // max grid trades per day
const GRID_RISK_PER_TRADE = 0.006;    // 0.6% risk per grid trade (overridden per-pair in bot.js)
const GRID_MIN_BB_WIDTH = 0.008;      // min BB width (avoid dead periods)

class GridV2Strategy {
    /**
     * @param {string} symbol — e.g. 'BNBUSDT'
     * @param {Object} [opts] — override defaults
     */
    constructor(symbol, opts = {}) {
        this.symbol = symbol;
        this.enabled = true;

        // Configurable parameters
        this.adxThreshold = opts.adxThreshold || GRID_ADX_THRESHOLD;
        this.bbLowerEntry = opts.bbLowerEntry || GRID_BB_LOWER_ENTRY;
        this.bbUpperEntry = opts.bbUpperEntry || GRID_BB_UPPER_ENTRY;
        this.rsiOversold = opts.rsiOversold || GRID_RSI_OVERSOLD;
        this.rsiOverbought = opts.rsiOverbought || GRID_RSI_OVERBOUGHT;
        this.slAtr = opts.slAtr || GRID_SL_ATR;
        this.tpAtr = opts.tpAtr || GRID_TP_ATR;
        this.cooldownMs = opts.cooldownMs || GRID_COOLDOWN_MS;
        this.maxTradesDay = opts.maxTradesDay || GRID_MAX_TRADES_DAY;
        this.riskPerTrade = opts.riskPerTrade || GRID_RISK_PER_TRADE;
        this.minBbWidth = opts.minBbWidth || GRID_MIN_BB_WIDTH;

        // State
        this._lastGridTradeTime = 0;
        this._gridTradesToday = 0;
        this._dayResetTime = Date.now();
        this._consecutiveLosses = 0;
        this._consecutiveWins = 0;

        // Tracking
        this.gridWins = 0;
        this.gridLosses = 0;
        this.gridPnL = 0;
        this.totalGridFees = 0;
        this.totalGridTrades = 0;
        this.maxConsecutiveWins = 0;

        // P#72: Adaptive base values
        this._baseCooldownMs = this.cooldownMs;
        this._baseBbLower = this.bbLowerEntry;
        this._baseBbUpper = this.bbUpperEntry;
    }

    /**
     * Evaluate whether a grid trade should be taken.
     * BYPASSES ensemble — generates independent signals.
     *
     * @param {Object} params
     * @param {number} params.currentPrice
     * @param {Object} params.indicators — { rsi, adx, bb_pctb, bb_upper, bb_lower, atr, volume_ratio }
     * @param {string} params.regime — current market regime
     * @param {boolean} params.hasPosition — whether bot already has a position
     * @returns {Object|null} — { action, confidence, sl, tp, riskPerTrade, reason, isGrid } or null
     */
    evaluate(params) {
        const { currentPrice, indicators, regime, hasPosition } = params;

        if (!this.enabled) return null;
        if (hasPosition) return null;

        // Daily trade limit
        if (Date.now() - this._dayResetTime > 86400000) {
            this._gridTradesToday = 0;
            this._dayResetTime = Date.now();
        }
        if (this._gridTradesToday >= this.maxTradesDay) return null;

        // Cooldown check
        if (Date.now() - this._lastGridTradeTime < this.cooldownMs) return null;

        // === REGIME GATE: ADX-based (P#216: removed strict RANGING requirement) ===
        // Grid works on ANY regime where ADX is low (mean-reverting conditions).
        // Previously required NeuralAI regime='RANGING' which often returned 'UNKNOWN'.
        const adx = indicators.adx || 30;
        if (adx > this.adxThreshold) return null;
        // Only block during strong trending (TRENDING_UP/DOWN with high ADX confirmed)
        if ((regime === 'TRENDING_UP' || regime === 'TRENDING_DOWN') && adx > 15) return null;

        // === BOLLINGER BAND ANALYSIS ===
        const bbPctb = indicators.bb_pctb;
        if (typeof bbPctb !== 'number') return null;

        const bbUpper = indicators.bb_upper || currentPrice * 1.02;
        const bbLower = indicators.bb_lower || currentPrice * 0.98;

        // BB width check — avoid flat/dead periods
        const bbWidth = currentPrice > 0 ? (bbUpper - bbLower) / currentPrice : 0;
        if (bbWidth < this.minBbWidth) return null;

        // === RSI CONFIRMATION ===
        const rsi = indicators.rsi || 50;

        // === SIGNAL GENERATION ===
        let action = null;
        let confidence = 0;
        let reason = '';
        const atr = indicators.atr || currentPrice * 0.01;

        // BUY zone: price near BB lower + RSI oversold
        if (bbPctb < this.bbLowerEntry && rsi < this.rsiOversold) {
            action = 'BUY';
            const depth = (this.bbLowerEntry - bbPctb) / this.bbLowerEntry;
            const rsiStrength = (this.rsiOversold - rsi) / this.rsiOversold;
            confidence = 0.30 + depth * 0.30 + rsiStrength * 0.20;
            reason = 'Grid BUY: BB%B=' + bbPctb.toFixed(2) + ' RSI=' + rsi.toFixed(0) + ' ADX=' + adx.toFixed(0);
        }
        // SELL zone: price near BB upper + RSI overbought
        else if (bbPctb > this.bbUpperEntry && rsi > this.rsiOverbought) {
            action = 'SELL';
            const depth = (bbPctb - this.bbUpperEntry) / (1 - this.bbUpperEntry);
            const rsiStrength = (rsi - this.rsiOverbought) / (100 - this.rsiOverbought);
            confidence = 0.30 + depth * 0.30 + rsiStrength * 0.20;
            reason = 'Grid SELL: BB%B=' + bbPctb.toFixed(2) + ' RSI=' + rsi.toFixed(0) + ' ADX=' + adx.toFixed(0);
        }

        if (!action) return null;

        // Clamp confidence
        confidence = Math.max(0.20, Math.min(0.75, confidence));

        // Volume confirmation bonus
        const volRatio = indicators.volume_ratio || 1.0;
        if (volRatio > 1.3) {
            confidence += 0.05;
            reason += ' Vol=' + volRatio.toFixed(1) + 'x';
        }

        // Streak bonus
        if (this._consecutiveWins >= 3) confidence += 0.03;

        confidence = Math.max(0.20, Math.min(0.80, confidence));

        // Calculate SL/TP from ATR
        const sl = action === 'BUY'
            ? currentPrice - this.slAtr * atr
            : currentPrice + this.slAtr * atr;
        const tp = action === 'BUY'
            ? currentPrice + this.tpAtr * atr
            : Math.max(0.0000001, currentPrice - this.tpAtr * atr);

        return {
            action,
            confidence,
            sl,
            tp,
            riskPerTrade: this.riskPerTrade,
            reason,
            isGrid: true,
            strategy: 'GridV2',
        };
    }

    /**
     * Record result of a completed grid trade.
     * @param {number} pnl — profit/loss
     * @param {number} [fees] — fees paid
     */
    recordTradeResult(pnl, fees = 0) {
        this.totalGridTrades++;
        this.gridPnL += pnl;
        this.totalGridFees += fees;
        this._gridTradesToday++;
        this._lastGridTradeTime = Date.now();

        if (pnl > 0) {
            this.gridWins++;
            this._consecutiveWins++;
            this._consecutiveLosses = 0;
            this.maxConsecutiveWins = Math.max(this.maxConsecutiveWins, this._consecutiveWins);

            // P#72 Adaptive: relax cooldown after 3 consecutive wins
            if (this._consecutiveWins >= 3) {
                this.cooldownMs = Math.max(this._baseCooldownMs - 3600000, 2 * 3600000); // min 2h
            }
        } else {
            this.gridLosses++;
            this._consecutiveWins = 0;
            this._consecutiveLosses++;

            // P#72 Adaptive: tighten after 2+ consecutive losses
            // P#237: FIXED — after losses, TIGHTEN entries (higher bbLower = need MORE oversold, lower bbUpper = need MORE overbought)
            if (this._consecutiveLosses >= 2) {
                this.cooldownMs = Math.min(this._baseCooldownMs + 2 * 3600000, 12 * 3600000); // max 12h
                this.bbLowerEntry = Math.min(this._baseBbLower + 0.02, 0.25);
                this.bbUpperEntry = Math.max(this._baseBbUpper - 0.02, 0.75);
            }
            // Reset after single loss
            if (this._consecutiveLosses === 1) {
                this.cooldownMs = this._baseCooldownMs;
                this.bbLowerEntry = this._baseBbLower;
                this.bbUpperEntry = this._baseBbUpper;
            }
        }
    }

    getStats() {
        const winRate = this.totalGridTrades > 0
            ? (this.gridWins / this.totalGridTrades * 100) : 0;

        return {
            enabled: this.enabled,
            totalTrades: this.totalGridTrades,
            wins: this.gridWins,
            losses: this.gridLosses,
            winRate: Math.round(winRate * 10) / 10,
            netPnL: Math.round(this.gridPnL * 10000) / 10000,
            totalFees: Math.round(this.totalGridFees * 10000) / 10000,
            maxConsecutiveWins: this.maxConsecutiveWins,
            adxThreshold: this.adxThreshold,
            currentlyOpen: false, // grid doesn't track its own position (bot does)
        };
    }

    exportState() {
        return {
            gridV2: {
                _lastGridTradeTime: this._lastGridTradeTime,
                _gridTradesToday: this._gridTradesToday,
                _dayResetTime: this._dayResetTime,
                _consecutiveLosses: this._consecutiveLosses,
                _consecutiveWins: this._consecutiveWins,
                gridWins: this.gridWins,
                gridLosses: this.gridLosses,
                gridPnL: this.gridPnL,
                totalGridFees: this.totalGridFees,
                totalGridTrades: this.totalGridTrades,
                maxConsecutiveWins: this.maxConsecutiveWins,
                cooldownMs: this.cooldownMs,
                bbLowerEntry: this.bbLowerEntry,
                bbUpperEntry: this.bbUpperEntry,
            },
        };
    }

    restoreState(data) {
        if (!data || !data.gridV2) return;
        const s = data.gridV2;
        this._lastGridTradeTime = s._lastGridTradeTime || 0;
        this._gridTradesToday = s._gridTradesToday || 0;
        this._dayResetTime = s._dayResetTime || Date.now();
        this._consecutiveLosses = s._consecutiveLosses || 0;
        this._consecutiveWins = s._consecutiveWins || 0;
        this.gridWins = s.gridWins || 0;
        this.gridLosses = s.gridLosses || 0;
        this.gridPnL = s.gridPnL || 0;
        this.totalGridFees = s.totalGridFees || 0;
        this.totalGridTrades = s.totalGridTrades || 0;
        this.maxConsecutiveWins = s.maxConsecutiveWins || 0;
        if (s.cooldownMs) this.cooldownMs = s.cooldownMs;
        if (s.bbLowerEntry) this.bbLowerEntry = s.bbLowerEntry;
        if (s.bbUpperEntry) this.bbUpperEntry = s.bbUpperEntry;
    }
}

module.exports = { GridV2Strategy };

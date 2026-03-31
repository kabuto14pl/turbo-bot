'use strict';
/**
 * @module MomentumHTFLTF
 * @description P#172: Momentum Higher-Timeframe / Lower-Timeframe Strategy.
 *
 * Core concept (from @thesoupedtrader):
 * - HTF (H4/D1) determines trend direction
 * - LTF (5m/15m) provides precision entry timing
 * - "Second LTF Candle + HTF Wick Execution" entry rule
 * - Only trade WITH the HTF trend
 *
 * TARGET PAIR: BTCUSDT ($1000 capital, 10% allocation)
 *
 * RULES:
 * 1. HTF trend must be established (SMA alignment + ADX > 20 on H4 data)
 * 2. Wait for LTF pullback into HTF key zone (50% retracement or EMA)
 * 3. Enter on SECOND confirming LTF candle (not the first reaction)
 * 4. SL below HTF wick low/high
 * 5. TP at previous HTF swing high/low or 3× risk
 */

// ============================================================================
// STRATEGY PARAMETERS
// ============================================================================
const MTF_ADX_MIN = 20;                // ADX must be above this for trending
const MTF_SMA_FAST = 20;               // Fast SMA period
const MTF_SMA_SLOW = 50;               // Slow SMA period
const MTF_SMA_TREND = 200;             // Trend SMA period
const MTF_ENTRY_RSI_OVERSOLD = 40;     // LTF RSI for pullback entry (LONG)
const MTF_ENTRY_RSI_OVERBOUGHT = 60;   // LTF RSI for pullback entry (SHORT)
const MTF_MIN_RR = 2.5;               // Minimum Risk:Reward ratio
const MTF_SL_ATR = 2.0;               // SL distance in ATR units
const MTF_TP_ATR = 5.0;               // TP distance in ATR units
const MTF_COOLDOWN_MS = 6 * 3600000;   // 6h between trades
const MTF_MAX_TRADES_DAY = 3;          // Quality over quantity
const MTF_MIN_CANDLES = 50;           // P#216: Data warmup (was 200 — unreachable with 100-200 candle fetch)

class MomentumHTFLTF {
    /**
     * @param {string} symbol — e.g. 'BTCUSDT'
     * @param {Object} [opts] — override defaults
     */
    constructor(symbol, opts = {}) {
        this.symbol = symbol;
        this.enabled = true;

        // HTF state (derived from SMA alignment on main timeframe data)
        this.htfTrend = 'NEUTRAL'; // 'BULLISH', 'BEARISH', 'NEUTRAL'
        this.htfTrendStrength = 0;  // 0-100

        // LTF pullback tracking
        this._pullbackDetected = false;
        this._pullbackDirection = null; // 'LONG' or 'SHORT'
        this._pullbackCandleCount = 0;  // count confirming candles
        this._pullbackEntryZone = { low: 0, high: 0 };

        // Trade management
        this._lastTradeTime = 0;
        this._tradesToday = 0;
        this._dayResetTime = Date.now();

        // Configurable
        this.adxMin = opts.adxMin || MTF_ADX_MIN;
        this.slAtr = opts.slAtr || MTF_SL_ATR;
        this.tpAtr = opts.tpAtr || MTF_TP_ATR;
        this.cooldownMs = opts.cooldownMs || MTF_COOLDOWN_MS;
        this.maxTradesDay = opts.maxTradesDay || MTF_MAX_TRADES_DAY;

        // Stats
        this.totalTrades = 0;
        this.wins = 0;
        this.losses = 0;
        this.totalPnL = 0;
    }

    /**
     * Main evaluation — called every cycle by the bot.
     *
     * @param {Object} params
     * @param {number} params.currentPrice
     * @param {Object} params.indicators — { rsi, adx, atr, sma20, sma50, sma200, macd_histogram, volume_ratio }
     * @param {string} params.regime — current regime
     * @param {boolean} params.hasPosition
     * @param {Array} params.history — recent candles (for pullback detection)
     * @returns {Object|null} — { action, confidence, sl, tp, reason, strategy } or null
     */
    evaluate(params) {
        const { currentPrice, indicators, regime, hasPosition, history } = params;

        if (!this.enabled || hasPosition) return null;
        if (!history || history.length < MTF_MIN_CANDLES) return null;

        // Daily trade limit
        if (Date.now() - this._dayResetTime > 86400000) {
            this._tradesToday = 0;
            this._dayResetTime = Date.now();
        }
        if (this._tradesToday >= this.maxTradesDay) return null;

        // Cooldown
        if (Date.now() - this._lastTradeTime < this.cooldownMs) return null;

        // === STEP 1: Determine HTF trend from SMA alignment ===
        const sma20 = indicators.sma20 || 0;
        const sma50 = indicators.sma50 || 0;
        const sma200 = indicators.sma200 || 0;
        const adx = indicators.adx || 0;

        if (adx < this.adxMin) {
            // Not trending — no momentum trade
            this.htfTrend = 'NEUTRAL';
            this._pullbackDetected = false;
            return null;
        }

        // Determine trend
        if (currentPrice > sma20 && sma20 > sma50 && sma50 > sma200) {
            this.htfTrend = 'BULLISH';
            this.htfTrendStrength = Math.min(100, adx * 2);
        } else if (currentPrice < sma20 && sma20 < sma50 && sma50 < sma200) {
            this.htfTrend = 'BEARISH';
            this.htfTrendStrength = Math.min(100, adx * 2);
        } else if (currentPrice > sma50 && sma20 > sma50) {
            this.htfTrend = 'BULLISH';
            this.htfTrendStrength = Math.min(60, adx);
        } else if (currentPrice < sma50 && sma20 < sma50) {
            this.htfTrend = 'BEARISH';
            this.htfTrendStrength = Math.min(60, adx);
        } else {
            this.htfTrend = 'NEUTRAL';
            this._pullbackDetected = false;
            return null;
        }

        // === STEP 2: Detect LTF pullback into HTF zone ===
        const rsi = indicators.rsi || 50;
        const atr = indicators.atr || currentPrice * 0.01;
        const macdHist = indicators.macd_histogram || 0;

        // Get recent price action for pullback detection
        const recentCandles = history.slice(-10);
        const recentHighs = recentCandles.map(c => c.high);
        const recentLows = recentCandles.map(c => c.low);
        const swingHigh = Math.max(...recentHighs);
        const swingLow = Math.min(...recentLows);

        if (this.htfTrend === 'BULLISH') {
            // Look for pullback to SMA20 zone + oversold RSI
            const pullbackToSMA = currentPrice <= sma20 * 1.005 && currentPrice >= sma50 * 0.995;
            const rsiPullback = rsi < MTF_ENTRY_RSI_OVERSOLD;

            if (pullbackToSMA || rsiPullback) {
                if (!this._pullbackDetected || this._pullbackDirection !== 'LONG') {
                    // First candle of pullback — don't enter yet
                    this._pullbackDetected = true;
                    this._pullbackDirection = 'LONG';
                    this._pullbackCandleCount = 1;
                    this._pullbackEntryZone = { low: swingLow, high: sma20 };
                    return null; // Wait for second confirming candle
                }

                this._pullbackCandleCount++;

                // Second candle: price must show recovery (close > open, bullish)
                const lastCandle = recentCandles[recentCandles.length - 1];
                const prevCandle = recentCandles[recentCandles.length - 2];

                if (this._pullbackCandleCount >= 2) {
                    const isBullishCandle = lastCandle && lastCandle.close > lastCandle.open;
                    const isRecovering = lastCandle && prevCandle && lastCandle.close > prevCandle.close;
                    const macdTurning = macdHist > 0 || (macdHist > -0.5 * atr && prevCandle);

                    if (isBullishCandle && (isRecovering || macdTurning)) {
                        // === ENTRY: LONG ===
                        const sl = currentPrice - this.slAtr * atr;
                        const tp = currentPrice + this.tpAtr * atr;
                        const riskDist = currentPrice - sl;
                        const rewardDist = tp - currentPrice;
                        const rr = riskDist > 0 ? rewardDist / riskDist : 0;

                        if (rr < MTF_MIN_RR) return null;

                        let confidence = 0.40;
                        // Boost for strong trend
                        if (this.htfTrendStrength > 60) confidence += 0.10;
                        // Boost for volume
                        const volRatio = indicators.volume_ratio || 1.0;
                        if (volRatio > 1.2) confidence += 0.05;
                        // Boost for deep RSI pullback
                        if (rsi < 35) confidence += 0.05;

                        confidence = Math.max(0.30, Math.min(0.80, confidence));

                        this._pullbackDetected = false;
                        this._pullbackCandleCount = 0;

                        return {
                            action: 'BUY',
                            confidence,
                            sl,
                            tp,
                            reason: 'Momentum LONG: HTF=' + this.htfTrend + '(' + this.htfTrendStrength +
                                ') RSI=' + rsi.toFixed(0) + ' ADX=' + adx.toFixed(0) +
                                ' RR=' + rr.toFixed(1) + ' 2ndCandle',
                            strategy: 'MomentumHTFLTF',
                            isGrid: false,
                        };
                    }
                }
            } else {
                // Price not in pullback zone — reset
                if (this._pullbackDirection === 'LONG') {
                    this._pullbackDetected = false;
                    this._pullbackCandleCount = 0;
                }
            }

        } else if (this.htfTrend === 'BEARISH') {
            // Look for pullback up to SMA20 zone + overbought RSI
            const pullbackToSMA = currentPrice >= sma20 * 0.995 && currentPrice <= sma50 * 1.005;
            const rsiPullback = rsi > MTF_ENTRY_RSI_OVERBOUGHT;

            if (pullbackToSMA || rsiPullback) {
                if (!this._pullbackDetected || this._pullbackDirection !== 'SHORT') {
                    this._pullbackDetected = true;
                    this._pullbackDirection = 'SHORT';
                    this._pullbackCandleCount = 1;
                    this._pullbackEntryZone = { low: sma20, high: swingHigh };
                    return null;
                }

                this._pullbackCandleCount++;

                const lastCandle = recentCandles[recentCandles.length - 1];
                const prevCandle = recentCandles[recentCandles.length - 2];

                if (this._pullbackCandleCount >= 2) {
                    const isBearishCandle = lastCandle && lastCandle.close < lastCandle.open;
                    const isDeclining = lastCandle && prevCandle && lastCandle.close < prevCandle.close;
                    const macdTurning = macdHist < 0 || (macdHist < 0.5 * atr && prevCandle);

                    if (isBearishCandle && (isDeclining || macdTurning)) {
                        // === ENTRY: SHORT ===
                        const sl = currentPrice + this.slAtr * atr;
                        const tp = Math.max(0.0000001, currentPrice - this.tpAtr * atr);
                        const riskDist = sl - currentPrice;
                        const rewardDist = currentPrice - tp;
                        const rr = riskDist > 0 ? rewardDist / riskDist : 0;

                        if (rr < MTF_MIN_RR) return null;

                        let confidence = 0.40;
                        if (this.htfTrendStrength > 60) confidence += 0.10;
                        const volRatio = indicators.volume_ratio || 1.0;
                        if (volRatio > 1.2) confidence += 0.05;
                        if (rsi > 65) confidence += 0.05;

                        confidence = Math.max(0.30, Math.min(0.80, confidence));

                        this._pullbackDetected = false;
                        this._pullbackCandleCount = 0;

                        return {
                            action: 'SELL',
                            confidence,
                            sl,
                            tp,
                            reason: 'Momentum SHORT: HTF=' + this.htfTrend + '(' + this.htfTrendStrength +
                                ') RSI=' + rsi.toFixed(0) + ' ADX=' + adx.toFixed(0) +
                                ' RR=' + rr.toFixed(1) + ' 2ndCandle',
                            strategy: 'MomentumHTFLTF',
                            isGrid: false,
                        };
                    }
                }
            } else {
                if (this._pullbackDirection === 'SHORT') {
                    this._pullbackDetected = false;
                    this._pullbackCandleCount = 0;
                }
            }
        }

        return null;
    }

    recordTradeResult(pnl) {
        this.totalTrades++;
        this.totalPnL += pnl;
        this._tradesToday++;
        this._lastTradeTime = Date.now();
        if (pnl > 0) this.wins++;
        else this.losses++;
    }

    getStats() {
        const winRate = this.totalTrades > 0 ? (this.wins / this.totalTrades * 100) : 0;
        return {
            enabled: this.enabled,
            totalTrades: this.totalTrades,
            wins: this.wins,
            losses: this.losses,
            winRate: Math.round(winRate * 10) / 10,
            netPnL: Math.round(this.totalPnL * 10000) / 10000,
            htfTrend: this.htfTrend,
            htfTrendStrength: this.htfTrendStrength,
            pullbackActive: this._pullbackDetected,
        };
    }

    exportState() {
        return {
            momentumHTFLTF: {
                _lastTradeTime: this._lastTradeTime,
                _tradesToday: this._tradesToday,
                _dayResetTime: this._dayResetTime,
                totalTrades: this.totalTrades,
                wins: this.wins,
                losses: this.losses,
                totalPnL: this.totalPnL,
            },
        };
    }

    restoreState(data) {
        if (!data || !data.momentumHTFLTF) return;
        const s = data.momentumHTFLTF;
        this._lastTradeTime = s._lastTradeTime || 0;
        this._tradesToday = s._tradesToday || 0;
        this._dayResetTime = s._dayResetTime || Date.now();
        this.totalTrades = s.totalTrades || 0;
        this.wins = s.wins || 0;
        this.losses = s.losses || 0;
        this.totalPnL = s.totalPnL || 0;
    }
}

module.exports = { MomentumHTFLTF };

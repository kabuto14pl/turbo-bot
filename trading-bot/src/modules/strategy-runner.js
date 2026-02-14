'use strict';
/**
 * @module StrategyRunner
 * @description Manages all trading strategies (2 inline + 3 class-based).
 * Runs analysis and returns signals.
 * 
 * PATCH #14:
 * - Removed noisy fallback BUY/SELL signals from SuperTrend and MACrossover
 *   (when strategy class returns no signal, we return HOLD, not a weak directional signal)
 * - RSITurbo: eliminated premature SELL at RSI 65 in non-downtrend
 * - AdvancedAdaptive: requires minimum 3 confirmations (was 2)
 */
const ind = require('./indicators');

class StrategyRunner {
    /**
     * @param {object} config
     * @param {object} riskManager
     * @param {object} dataPipeline
     */
    constructor(config, riskManager, dataPipeline) {
        this.config = config;
        this.risk = riskManager;
        this.dp = dataPipeline;
        this.strategies = new Map();
        this.lastSignals = new Map();
    }

    getStrategies() { return this.strategies; }
    getLastSignals() { return this.lastSignals; }

    /**
     * Initialize all 5 strategies
     * @param {object} deps - {SuperTrendStrategy, MACrossoverStrategy, MomentumProStrategy, Logger}
     */
    initialize(deps) {
        const logger = deps.Logger ? new deps.Logger('logs/strategies.log') : null;

        // 1. AdvancedAdaptive (inline) — PATCH #14: requires 3+ confirmations
        this.strategies.set('AdvancedAdaptive', {
            name: 'AdvancedAdaptive',
            analyze: (marketData) => {
                if (marketData.length < 50) return this._hold(marketData);
                const prices = marketData.map(d => d.close);
                const volumes = marketData.map(d => d.volume);
                const sma20 = ind.calculateSMA(prices, 20), sma50 = ind.calculateSMA(prices, 50);
                const rsi = ind.calculateRSI(prices, 14), macd = ind.calculateMACD(prices);
                const bb = ind.calculateBollingerBands(prices, 20);
                const vp = ind.calculateVolumeProfile(volumes);
                const cur = prices[prices.length - 1];
                let bull = 0, bear = 0;
                // Trend alignment
                if (cur > sma20 && sma20 > sma50) bull++;
                if (cur < sma20 && sma20 < sma50) bear++;
                // RSI extremes
                if (rsi < 30) bull++;
                if (rsi > 70) bear++;
                // MACD momentum
                if (macd.signal > 0 && macd.histogram > 0) bull++;
                if (macd.signal < 0 && macd.histogram < 0) bear++;
                // Bollinger extremes
                if (cur < bb.lower) bull++;
                if (cur > bb.upper) bear++;
                // Volume confirmation
                if (vp > 1.2) { if (bull > bear) bull++; if (bear > bull) bear++; }
                // H1 Multi-TF trend filter
                let h1Bull = false, h1Bear = false;
                try {
                    const h1 = this.dp.getCachedTimeframeData().h1;
                    if (h1 && h1.length >= 50) {
                        const h1P = h1.map(c => c.close);
                        const h1E20 = ind.calculateEMA(h1P, 20), h1E50 = ind.calculateEMA(h1P, 50);
                        const h1L = h1P[h1P.length - 1];
                        h1Bull = h1L > h1E20 && h1E20 > h1E50;
                        h1Bear = h1L < h1E20 && h1E20 < h1E50;
                    }
                } catch(e) {}
                let action = 'HOLD', conf = 0.5;
                // PATCH #14: require 3+ confirmations (was 2) for stronger signals
                if (bull >= 3 && bull > bear) {
                    action = 'BUY'; conf = Math.min(0.95, 0.55 + bull * 0.1);
                    if (h1Bull) conf = Math.min(0.95, conf + 0.05);
                    else if (h1Bear) { conf *= 0.7; action = 'HOLD'; }
                } else if (bear >= 3 && bear > bull) {
                    action = 'SELL'; conf = Math.min(0.95, 0.55 + bear * 0.1);
                    if (h1Bear) conf = Math.min(0.95, conf + 0.05);
                    else if (h1Bull) { conf *= 0.7; action = 'HOLD'; }
                }
                return { symbol: this.config.symbol, action, confidence: conf, price: cur,
                    timestamp: Date.now(), strategy: 'AdvancedAdaptive',
                    riskLevel: this.risk.calculateRiskLevel(conf),
                    quantity: this.risk.calculateOptimalQuantity(cur, conf) };
            }
        });

        // 2. RSITurbo (inline) — PATCH #14: removed premature SELL at RSI 65 in non-downtrend
        this.strategies.set('RSITurbo', {
            name: 'RSITurbo',
            analyze: (marketData) => {
                if (marketData.length < 14) return this._hold(marketData);
                const prices = marketData.map(d => d.close);
                const rsi = ind.calculateRSI(prices, 14);
                const rsiValues = [];
                for (let i = 4; i >= 0; i--) {
                    const end = prices.length - i;
                    if (end >= 15) rsiValues.push(ind.calculateRSI(prices.slice(0, end), 14));
                }
                const rsiMA = rsiValues.length >= 3 ? rsiValues.reduce((a,b)=>a+b,0)/rsiValues.length : rsi;
                const sma20 = ind.calculateSMA(prices, 20), sma50 = ind.calculateSMA(prices, 50);
                const cur = prices[prices.length - 1];
                const uptrend = cur > sma20 && sma20 > sma50;
                const downtrend = cur < sma20 && sma20 < sma50;
                let action = 'HOLD', conf = 0.5;
                // Strong oversold: BUY
                if (rsi < 35 && rsi > rsiMA) {
                    action = 'BUY'; conf = Math.min(0.9, 0.65 + (35 - rsi) * 0.015);
                }
                // Strong overbought: SELL
                else if (rsi > 75 && rsi < rsiMA) {
                    action = 'SELL'; conf = Math.min(0.9, 0.65 + (rsi - 75) * 0.02);
                }
                // PATCH #14: Only SELL at RSI 65-75 when in confirmed DOWNTREND (was: also sold in no-trend)
                else if (rsi > 65 && rsi < rsiMA && downtrend) {
                    action = 'SELL'; conf = Math.min(0.8, 0.55 + (rsi - 65) * 0.015);
                }
                // Pullback BUY in uptrend
                else if (rsi < 50 && rsi > 40 && rsi > rsiMA && uptrend) {
                    action = 'BUY'; conf = 0.55;
                }
                // Deep oversold recovery
                else if (rsi < 45 && rsi > rsiMA && rsiMA < 40) {
                    action = 'BUY'; conf = 0.6;
                }
                // High RSI weakening in downtrend
                else if (rsi > 55 && rsi < rsiMA && rsiMA > 60 && downtrend) {
                    action = 'SELL'; conf = 0.6;
                }
                return { symbol: this.config.symbol, action, confidence: conf, price: cur,
                    timestamp: Date.now(), strategy: 'RSITurbo',
                    riskLevel: this.risk.calculateRiskLevel(conf),
                    quantity: this.risk.calculateOptimalQuantity(cur, conf) };
            }
        });

        // 3-5: Class-based strategies
        const stStrategy = deps.SuperTrendStrategy ? new deps.SuperTrendStrategy(logger) : null;
        const macStrategy = deps.MACrossoverStrategy ? new deps.MACrossoverStrategy(logger) : null;
        const mpStrategy = deps.MomentumProStrategy ? new deps.MomentumProStrategy(logger) : null;

        // PATCH #14: SuperTrend — NO fallback BUY/SELL when strategy returns empty
        if (stStrategy) {
            this.strategies.set('SuperTrend', { name: 'SuperTrend', analyze: async (md) => {
                const bs = this.dp.convertMarketDataToBotState(md, this._getPortfolioData());
                const sigs = await stStrategy.run(bs);
                if (sigs.length === 0) {
                    // PATCH #14: Return HOLD instead of noisy fallback signal at 0.35 confidence
                    return this._hold(md);
                }
                return this.dp.convertStrategySignalToTradingSignal(sigs[0], md, this.risk);
            }});
        }

        // PATCH #14: MACrossover — NO fallback BUY/SELL when strategy returns empty
        if (macStrategy) {
            this.strategies.set('MACrossover', { name: 'MACrossover', analyze: async (md) => {
                const bs = this.dp.convertMarketDataToBotState(md, this._getPortfolioData());
                const sigs = await macStrategy.run(bs);
                if (sigs.length === 0) {
                    // PATCH #14: Return HOLD instead of noisy fallback signal at 0.32 confidence
                    return this._hold(md);
                }
                return this.dp.convertStrategySignalToTradingSignal(sigs[0], md, this.risk);
            }});
        }

        if (mpStrategy) {
            this.strategies.set('MomentumPro', { name: 'MomentumPro', analyze: async (md) => {
                const bs = this.dp.convertMarketDataToBotState(md, this._getPortfolioData());
                const sigs = await mpStrategy.run(bs);
                if (sigs.length === 0) return this._hold(md);
                return this.dp.convertStrategySignalToTradingSignal(sigs[0], md, this.risk);
            }});
        }

        console.log('[STRATEGIES] Initialized: ' + this.strategies.size + ' strategies');
    }

    /** Set portfolio data getter for BotState conversion */
    setPortfolioDataGetter(fn) { this._getPortfolioData = fn; }

    /**
     * Run ALL strategies and collect signals
     * @param {Array} marketData
     * @returns {Map<string, object>} signal map
     */
    async runAll(marketData) {
        const signals = new Map();
        for (const [name, strategy] of this.strategies) {
            try {
                const signal = await strategy.analyze(marketData);
                if (signal) {
                    signals.set(name, signal);
                    this.lastSignals.set(name, signal);
                    // PATCH #21: Guard NaN confidence
                    if (typeof signal.confidence !== 'number' || isNaN(signal.confidence)) signal.confidence = 0.5;
                    console.log('   [' + name + '] ' + signal.action + ' (conf: ' + (signal.confidence * 100).toFixed(1) + '%)');
                } else {
                    console.log('   [' + name + '] null signal');
                }
            } catch (e) {
                console.error('   [' + name + ' ERROR] ' + e.message);
            }
        }
        return signals;
    }

    _hold(md) { return this.dp.createHoldSignal(md && md[0] ? md[0].symbol : this.config.symbol); }
}

module.exports = { StrategyRunner };

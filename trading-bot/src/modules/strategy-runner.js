'use strict';
/**
 * @module StrategyRunner
 * @description Manages all trading strategies (2 inline + 3 class-based).
 * Runs analysis and returns signals.
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

        // 1. AdvancedAdaptive (inline)
        this.strategies.set('AdvancedAdaptive', {
            name: 'AdvancedAdaptive',
            analyze: (marketData) => {
                if (marketData.length < 20) return this._hold(marketData);
                const prices = marketData.map(d => d.close);
                const volumes = marketData.map(d => d.volume);
                const sma20 = ind.calculateSMA(prices, 20), sma50 = ind.calculateSMA(prices, 50);
                const rsi = ind.calculateRSI(prices, 14), macd = ind.calculateMACD(prices);
                const bb = ind.calculateBollingerBands(prices, 20);
                const vp = ind.calculateVolumeProfile(volumes);
                const cur = prices[prices.length - 1];
                let bull = 0, bear = 0;
                if (cur > sma20 && sma20 > sma50) bull++;
                if (cur < sma20 && sma20 < sma50) bear++;
                if (rsi < 30) bull++;
                if (rsi > 70) bear++;
                if (macd.signal > 0 && macd.histogram > 0) bull++;
                if (macd.signal < 0 && macd.histogram < 0) bear++;
                if (cur < bb.lower) bull++;
                if (cur > bb.upper) bear++;
                if (vp > 1.2) { if (bull > bear) bull++; if (bear > bull) bear++; }
                // H5: Multi-TF trend filter
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
                if (bull >= 2 && bull > bear) {
                    action = 'BUY'; conf = Math.min(0.95, 0.55 + bull * 0.1);
                    if (h1Bull) conf = Math.min(0.95, conf + 0.05);
                    else if (h1Bear) { conf *= 0.7; action = 'HOLD'; }
                } else if (bear >= 2 && bear > bull) {
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

        // 2. RSITurbo (inline)
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
                if (rsi < 35 && rsi > rsiMA) { action = 'BUY'; conf = Math.min(0.9, 0.65 + (35 - rsi) * 0.015); }
                else if (rsi > 75 && rsi < rsiMA) { action = 'SELL'; conf = Math.min(0.9, 0.65 + (rsi - 75) * 0.02); }
                else if (rsi > 65 && rsi < rsiMA && downtrend) { action = 'SELL'; conf = Math.min(0.8, 0.55 + (rsi - 65) * 0.015); }
                else if (rsi > 65 && rsi < rsiMA && uptrend) { action = 'HOLD'; conf = 0.5; }
                else if (rsi > 65 && rsi < rsiMA) { action = 'SELL'; conf = Math.min(0.7, 0.55 + (rsi - 65) * 0.01); }
                else if (rsi < 50 && rsi > 40 && rsi > rsiMA && uptrend) { action = 'BUY'; conf = 0.55; }
                else if (rsi < 45 && rsi > rsiMA && rsiMA < 40) { action = 'BUY'; conf = 0.6; }
                else if (rsi > 55 && rsi < rsiMA && rsiMA > 60 && !uptrend) { action = 'SELL'; conf = 0.6; }
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

        if (stStrategy) {
            this.strategies.set('SuperTrend', { name: 'SuperTrend', analyze: async (md) => {
                const bs = this.dp.convertMarketDataToBotState(md, this._getPortfolioData());
                const sigs = await stStrategy.run(bs);
                if (sigs.length === 0) {
                    const p = md.map(d => d.close);
                    const e50 = ind.calculateEMA(p, 50), e200 = ind.calculateEMA(p, 200);
                    const c = p[p.length - 1], atrPct = (ind.calculateATR(md, 14) / c) * 100;
                    if (c > e50 && e50 > e200 && atrPct < 2.0) return { symbol: this.config.symbol, action:'BUY', confidence:0.35, price:c, timestamp:Date.now(), strategy:'SuperTrend', riskLevel:2, quantity:this.risk.calculateOptimalQuantity(c,0.35) };
                    if (c < e50 && e50 < e200 && atrPct < 2.0) return { symbol: this.config.symbol, action:'SELL', confidence:0.35, price:c, timestamp:Date.now(), strategy:'SuperTrend', riskLevel:2, quantity:this.risk.calculateOptimalQuantity(c,0.35) };
                    return this._hold(md);
                }
                return this.dp.convertStrategySignalToTradingSignal(sigs[0], md, this.risk);
            }});
        }

        if (macStrategy) {
            this.strategies.set('MACrossover', { name: 'MACrossover', analyze: async (md) => {
                const bs = this.dp.convertMarketDataToBotState(md, this._getPortfolioData());
                const sigs = await macStrategy.run(bs);
                if (sigs.length === 0) {
                    const p = md.map(d => d.close);
                    const e9 = ind.calculateEMA(p,9), e21 = ind.calculateEMA(p,21), e50 = ind.calculateEMA(p,50);
                    const c = p[p.length-1], gap = ((e9-e21)/e21)*100;
                    if (e9>e21 && e21>e50 && gap>0.05 && gap<1.5) return { symbol:this.config.symbol, action:'BUY', confidence:0.32, price:c, timestamp:Date.now(), strategy:'MACrossover', riskLevel:2, quantity:this.risk.calculateOptimalQuantity(c,0.32) };
                    if (e9<e21 && e21<e50 && gap<-0.05 && gap>-1.5) return { symbol:this.config.symbol, action:'SELL', confidence:0.32, price:c, timestamp:Date.now(), strategy:'MACrossover', riskLevel:2, quantity:this.risk.calculateOptimalQuantity(c,0.32) };
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
                    console.log('   ??? ' + name + ': ' + signal.action + ' (conf: ' + (signal.confidence * 100).toFixed(1) + '%)');
                } else {
                    console.log('   ?????? ' + name + ': null signal');
                }
            } catch (e) {
                console.error('   ??? ' + name + ' error:', e.message);
            }
        }
        return signals;
    }

    _hold(md) { return this.dp.createHoldSignal(md && md[0] ? md[0].symbol : this.config.symbol); }
}

module.exports = { StrategyRunner };

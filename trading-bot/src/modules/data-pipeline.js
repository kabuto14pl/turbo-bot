'use strict';
/**
 * @module DataPipeline
 * @description Market data fetching (OKX live / WebSocket / mock),
 * multi-timeframe caching, BotState conversion.
 */
const ind = require('./indicators');

class DataPipeline {
    constructor(config) {
        this.config = config;
        this.okxClient = null;
        this.wsAggregator = null;
        this.wsEnabled = false;
        this.liveDataEnabled = false;
        this.cachedTimeframeData = {};
        this.marketDataHistory = [];
        this._wsOhlcCache = null;
        this._wsOhlcCacheTime = 0;
        this.wsUpdateCount = 0;
        // Mock data state
        this.lastMockClose = 68000;
        this.mockTrendPhase = 0;
    }

    /** Set OKX live data client */
    setOkxClient(client) { this.okxClient = client; this.liveDataEnabled = !!client; }

    /** Set WebSocket aggregator */
    setWsAggregator(agg) { this.wsAggregator = agg; this.wsEnabled = !!agg; }

    /** Get cached timeframe data */
    getCachedTimeframeData() { return this.cachedTimeframeData; }

    /** Get market data history */
    getMarketDataHistory() { return this.marketDataHistory; }

    /**
     * Fetch market data: WS hybrid ??? OKX REST ??? Mock
     * @returns {Array} candles
     */
    async getMarketData() {
        // PRIORITY 1: WebSocket + OKX hybrid
        if (this.wsEnabled && this.wsAggregator) {
            try {
                const latest = this.wsAggregator.getLatestPrice(this.config.symbol);
                if (latest && (Date.now() - latest.timestamp < 10000)) {
                    let hybrid = null;
                    if (this.liveDataEnabled && this.okxClient) {
                        const cacheAge = this._wsOhlcCacheTime ? Date.now() - this._wsOhlcCacheTime : Infinity;
                        if (!this._wsOhlcCache || cacheAge > 30000) {
                            try {
                                const multi = await this.fetchMultipleTimeframes(this.config.symbol);
                                this._wsOhlcCache = multi.m15;
                                this._wsOhlcCacheTime = Date.now();
                                this.cachedTimeframeData = { m5: multi.m5, m15: multi.m15, m30: multi.m30, h1: multi.h1, h4: multi.h4 };
                            } catch (e) { console.warn('[WS HYBRID] Cache refresh failed:', e.message); }
                        }
                        hybrid = this._wsOhlcCache ? [...this._wsOhlcCache] : null;
                    }
                    if (hybrid && hybrid.length > 0) {
                        const last = hybrid.length - 1;
                        hybrid[last] = { ...hybrid[last], close: latest.price,
                            high: Math.max(hybrid[last].high, latest.price),
                            low: Math.min(hybrid[last].low, latest.price),
                            timestamp: latest.timestamp };
                        this.wsUpdateCount++;
                        if (this.wsUpdateCount % 100 === 1)
                            console.log('[WS+OKX HYBRID] ' + this.config.symbol + ': $' + latest.price.toFixed(2) + ' | ' + hybrid.length + ' candles');
                        return hybrid;
                    }
                }
            } catch (e) { console.error('[WS] Data error:', e.message); }
        }
        // PRIORITY 2: OKX REST multi-timeframe
        if (this.liveDataEnabled && this.okxClient) {
            try {
                const multi = await this.fetchMultipleTimeframes(this.config.symbol);
                this.cachedTimeframeData = { m5: multi.m5, m15: multi.m15, m30: multi.m30, h1: multi.h1, h4: multi.h4 };
                const lat = multi.m15[multi.m15.length - 1];
                console.log('[LIVE DATA] ' + this.config.symbol + ': $' + lat.close.toFixed(2) +
                    ' | 5m:' + multi.m5.length + ' 15m:' + multi.m15.length + ' 1h:' + multi.h1.length + ' 4h:' + multi.h4.length);
                return multi.m15;
            } catch (e) { console.error('[OKX] Fetch failed:', e.message); }
        }
        // PRIORITY 3: Mock
        return this.generateMockMarketData();
    }

    async fetchMultipleTimeframes(symbol) {
        if (!this.okxClient) throw new Error('OKX client not initialized');
        const [c5, c15, c30, c1h, c4h] = await Promise.all([
            this.okxClient.getCandles(symbol, '5m', 200),
            this.okxClient.getCandles(symbol, '15m', 200),
            this.okxClient.getCandles(symbol, '30m', 100),
            this.okxClient.getCandles(symbol, '1H', 100),
            this.okxClient.getCandles(symbol, '4H', 50),
        ]);
        const conv = (candles, tf) => candles.map(c => ({
            symbol, timestamp: c.timestamp, open: c.open, high: c.high,
            low: c.low, close: c.close, volume: c.volume, timeframe: tf,
        }));
        return { m5: conv(c5,'5m'), m15: conv(c15,'15m'), m30: conv(c30,'30m'), h1: conv(c1h,'1h'), h4: conv(c4h,'4h') };
    }

    generateMockMarketData() {
        const ts = Date.now();
        this.mockTrendPhase += 0.0001;
        const trend = Math.sin(this.mockTrendPhase) * 0.005;
        const mom = (Math.random() - 0.5) * 0.003;
        const noise = (Math.random() - 0.5) * 0.002;
        const spike = (Math.random() < 0.05) ? (Math.random() - 0.5) * 0.01 : 0;
        const total = trend + mom + noise + spike;
        const open = this.lastMockClose * (1 + total);
        const vol = 0.001 + Math.random() * 0.002;
        const high = open * (1 + vol * Math.random());
        const low = open * (1 - vol * Math.random());
        const close = low + (high - low) * Math.random();
        this.lastMockClose = close;
        return [{ symbol: this.config.symbol, timestamp: ts, open, high, low, close,
            volume: 1000000 * (1 + Math.abs(total) * 100) * (0.5 + Math.random()) }];
    }

    /**
     * Push new data to history, keep last 200
     * @param {Array} marketData
     */
    appendHistory(marketData) {
        this.marketDataHistory.push(...marketData);
        if (this.marketDataHistory.length > 200) this.marketDataHistory = this.marketDataHistory.slice(-200);
    }

    /**
     * Fetch recent candles for a symbol (for ATR/risk calc)
     * @param {string} symbol
     * @param {number} count
     * @returns {Array}
     */
    async getRecentCandles(symbol, count) {
        if (this.okxClient) {
            try {
                return await this.okxClient.getCandles(symbol, '15m', count);
            } catch(e) { /* fallback */ }
        }
        return this.marketDataHistory.slice(-count);
    }

    /**
     * Convert market data to BotState for class-based strategies
     * @param {Array} marketData
     * @param {object} portfolioData - {cash, btc, totalValue, unrealizedPnL, realizedPnL, avgEntry}
     * @returns {object} BotState
     */
    convertMarketDataToBotState(marketData, portfolioData) {
        if (!marketData || marketData.length === 0) throw new Error('Empty market data');
        const latest = marketData[marketData.length - 1];
        const prices = marketData.map(d => d.close);
        const rsi = ind.calculateRSI(prices, 14);
        const atr = ind.calculateATR(marketData, 14);
        const ema9 = ind.calculateEMA(prices, 9);
        const ema21 = ind.calculateEMA(prices, 21);
        const ema50 = ind.calculateEMA(prices, 50);
        const ema200 = ind.calculateEMA(prices, 200);
        const roc = ind.calculateROC(prices, 10);

        const calcTFIndicators = (raw) => {
            if (!raw || raw.length === 0) return null;
            const cls = raw.map(c => c.close);
            const lat = raw[raw.length - 1];
            return {
                indicators: {
                    rsi: ind.calculateRSI(cls, 14), atr: ind.calculateATR(raw, 14),
                    ema_9: ind.calculateEMA(cls, 9), ema_21: ind.calculateEMA(cls, 21),
                    ema_50: ind.calculateEMA(cls, 50), ema_200: ind.calculateEMA(cls, 200),
                    roc: ind.calculateROC(cls, 10), adx: ind.calculateRealADX(raw, 14),
                    supertrend: { value: ind.calculateEMA(cls, 50), direction: lat.close > ind.calculateEMA(cls, 50) ? 'buy' : 'sell' }
                },
                prices: { time: lat.timestamp, open: lat.open, high: lat.high, low: lat.low, close: lat.close, volume: lat.volume }
            };
        };

        const h1 = calcTFIndicators(this.cachedTimeframeData.h1);
        const h4 = calcTFIndicators(this.cachedTimeframeData.h4);

        // Fallback logic: h1 ??? m15, h4 ??? h1 ??? m15
        const m15Ind = {
            rsi, atr, ema_9: ema9, ema_21: ema21, ema_50: ema50, ema_200: ema200,
            roc, adx: ind.calculateRealADX(marketData, 14),
            supertrend: { value: ema50, direction: latest.close > ema50 ? 'buy' : 'sell' }
        };
        const m15Prices = { time: latest.timestamp, open: latest.open, high: latest.high, low: latest.low, close: latest.close, volume: latest.volume };

        const h1Ind = h1 ? h1.indicators : m15Ind;
        const h1Prices = h1 ? h1.prices : m15Prices;
        const h4Ind = h4 ? h4.indicators : (h1 ? h1.indicators : m15Ind);
        const h4Prices = h4 ? h4.prices : (h1 ? h1.prices : m15Prices);

        if (!h1) console.warn('[BOTSTATE FALLBACK] h1 missing, using m15');
        if (!h4) console.warn('[BOTSTATE FALLBACK] h4 missing, using ' + (h1 ? 'h1' : 'm15'));

        return {
            portfolio: portfolioData || { cash: 0, btc: 0, totalValue: 0, unrealizedPnL: 0, realizedPnL: 0, averageEntryPrice: latest.close },
            timestamp: latest.timestamp, equity: portfolioData ? portfolioData.totalValue : 0,
            prices: { m15: m15Prices, h1: h1Prices, h4: h4Prices, d1: null },
            indicators: { m15: m15Ind, h1: h1Ind, h4: h4Ind, d1: null },
            positions: [], marketData: { symbol: latest.symbol, timestamp: latest.timestamp,
                open: latest.open, high: latest.high, low: latest.low, close: latest.close, volume: latest.volume, interval: 'm15' },
            regime: { name: 'NORMAL', volatility: Math.min(1.0, (atr / latest.close) * 10),
                trend: Math.max(-1, Math.min(1, (ema9 - ema21) / Math.max(1, ema21) * 100)) },
            marketContext: { symbol: latest.symbol, timeframe: 'm15' }
        };
    }

    convertStrategySignalToTradingSignal(signal, marketData, riskManager) {
        if (!signal) return this.createHoldSignal(marketData[0]?.symbol || this.config.symbol);
        const latest = marketData[marketData.length - 1];
        let action = 'HOLD';
        if (signal.type === 'ENTER_LONG') action = 'BUY';
        else if (signal.type === 'ENTER_SHORT' || signal.type === 'EXIT_LONG') action = 'SELL';
        return {
            symbol: latest.symbol, action, confidence: signal.confidence || 0.5,
            price: signal.price || latest.close, timestamp: Date.now(),
            strategy: signal.metadata?.strategy || 'Unknown',
            riskLevel: riskManager ? riskManager.calculateRiskLevel(signal.confidence || 0.5) : 0.5,
            quantity: 0,
        };
    }

    createHoldSignal(symbol) {
        return { symbol: symbol || this.config.symbol, action: 'HOLD', confidence: 0, price: 0,
            timestamp: Date.now(), strategy: 'HOLD', riskLevel: 0, quantity: 0 };
    }
}

module.exports = { DataPipeline };

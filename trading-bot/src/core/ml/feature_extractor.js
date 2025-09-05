"use strict";
/**
 * 🔄 ADVANCED FEATURE EXTRACTOR
 * Transforms market data into 500+ feature vector for Deep RL
 * Replaces simple 4-feature input from SimpleRLAgent
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedFeatureExtractor = void 0;
const logger_1 = require("../../../core/utils/logger");
const types_1 = require("./types");
class AdvancedFeatureExtractor {
    constructor() {
        this.featureCache = new Map();
        this.normalizationStats = new Map();
        this.logger = new logger_1.Logger();
        this.initializeNormalizationStats();
    }
    /**
     * Main feature extraction - converts market state to 500+ dimensional vector
     */
    async extractFeatures(marketState) {
        const startTime = Date.now();
        // Check cache first
        const cacheKey = this.generateCacheKey(marketState);
        const cached = this.featureCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const features = new Float32Array(types_1.FEATURE_DIMENSIONS);
        let idx = 0;
        try {
            // 1. Basic price/volume features (10 features)
            idx = this.extractBasicFeatures(features, idx, marketState);
            // 2. Technical indicators (200 features)
            idx = this.extractTechnicalIndicators(features, idx, marketState);
            // 3. Market microstructure (100 features)
            idx = this.extractMicrostructureFeatures(features, idx, marketState);
            // 4. Cross-asset features (100 features)
            idx = this.extractCrossAssetFeatures(features, idx, marketState);
            // 5. Sentiment features (50 features)
            idx = this.extractSentimentFeatures(features, idx, marketState);
            // 6. Temporal features (40 features)
            idx = this.extractTemporalFeatures(features, idx, marketState);
            // Normalize features
            this.normalizeFeatures(features);
            // Cache result
            this.featureCache.set(cacheKey, features);
            const extractionTime = Date.now() - startTime;
            if (extractionTime > 50) { // Log if extraction takes too long
                this.logger.warn(`Feature extraction took ${extractionTime}ms - consider optimization`);
            }
            return features;
        }
        catch (error) {
            this.logger.error('Feature extraction failed:', error);
            return this.getDefaultFeatures();
        }
    }
    /**
     * Extract basic price and volume features
     */
    extractBasicFeatures(features, idx, state) {
        // Price features
        features[idx++] = state.price;
        features[idx++] = Math.log(state.price); // Log price for stability
        features[idx++] = state.volume;
        features[idx++] = Math.log(Math.max(state.volume, 1)); // Log volume
        // Price changes (requires historical data - placeholder for now)
        features[idx++] = 0; // price_change_1m
        features[idx++] = 0; // price_change_5m  
        features[idx++] = 0; // price_change_1h
        features[idx++] = 0; // price_change_4h
        features[idx++] = 0; // price_change_1d
        features[idx++] = 0; // volatility_realized
        return idx;
    }
    /**
     * Extract technical indicator features
     */
    extractTechnicalIndicators(features, idx, state) {
        const indicators = state.indicators;
        // RSI family (10 features)
        features[idx++] = indicators.rsi_14 / 100.0; // Normalize 0-1
        features[idx++] = indicators.rsi_21 / 100.0;
        features[idx++] = indicators.rsi_30 / 100.0;
        features[idx++] = (indicators.rsi_14 - 50) / 50; // Centered RSI
        features[idx++] = Math.sin(indicators.rsi_14 * Math.PI / 100); // Cyclical RSI
        features[idx++] = indicators.rsi_14 > 70 ? 1 : 0; // Overbought flag
        features[idx++] = indicators.rsi_14 < 30 ? 1 : 0; // Oversold flag
        features[idx++] = 0; // RSI divergence (requires implementation)
        features[idx++] = 0; // RSI momentum
        features[idx++] = 0; // RSI smoothed
        // Moving Averages (20 features)
        features[idx++] = indicators.ema_9;
        features[idx++] = indicators.ema_21;
        features[idx++] = indicators.ema_50;
        features[idx++] = indicators.ema_200;
        features[idx++] = indicators.sma_20;
        features[idx++] = indicators.sma_50;
        features[idx++] = indicators.sma_200;
        // MA relationships
        features[idx++] = state.price > indicators.ema_9 ? 1 : 0; // Above EMA9
        features[idx++] = state.price > indicators.ema_21 ? 1 : 0; // Above EMA21
        features[idx++] = state.price > indicators.ema_50 ? 1 : 0; // Above EMA50
        features[idx++] = state.price > indicators.ema_200 ? 1 : 0; // Above EMA200
        features[idx++] = indicators.ema_9 > indicators.ema_21 ? 1 : 0; // EMA9 > EMA21
        features[idx++] = indicators.ema_21 > indicators.ema_50 ? 1 : 0; // EMA21 > EMA50
        features[idx++] = indicators.ema_50 > indicators.ema_200 ? 1 : 0; // EMA50 > EMA200
        // MA slopes and distances
        features[idx++] = (state.price - indicators.ema_21) / indicators.ema_21; // Distance from EMA21
        features[idx++] = (state.price - indicators.ema_50) / indicators.ema_50; // Distance from EMA50
        features[idx++] = (indicators.ema_9 - indicators.ema_21) / indicators.ema_21; // EMA slope
        features[idx++] = 0; // EMA9 slope (requires historical data)
        features[idx++] = 0; // EMA21 slope
        features[idx++] = 0; // EMA50 slope
        // MACD family (10 features)
        features[idx++] = indicators.macd;
        features[idx++] = indicators.macd_signal;
        features[idx++] = indicators.macd_histogram;
        features[idx++] = indicators.macd > indicators.macd_signal ? 1 : 0; // MACD > Signal
        features[idx++] = indicators.macd_histogram > 0 ? 1 : 0; // Positive histogram
        features[idx++] = 0; // MACD divergence
        features[idx++] = 0; // MACD momentum
        features[idx++] = 0; // MACD zero-line cross
        features[idx++] = 0; // MACD signal-line cross
        features[idx++] = 0; // MACD histogram expansion/contraction
        // Bollinger Bands (15 features)
        features[idx++] = indicators.bollinger_upper;
        features[idx++] = indicators.bollinger_middle;
        features[idx++] = indicators.bollinger_lower;
        // Bollinger position and squeeze
        const bb_position = (state.price - indicators.bollinger_lower) /
            (indicators.bollinger_upper - indicators.bollinger_lower);
        features[idx++] = Math.max(0, Math.min(1, bb_position)); // %B indicator
        const bb_width = (indicators.bollinger_upper - indicators.bollinger_lower) / indicators.bollinger_middle;
        features[idx++] = bb_width; // Bollinger Band width
        features[idx++] = bb_width < 0.1 ? 1 : 0; // Squeeze indicator
        features[idx++] = state.price > indicators.bollinger_upper ? 1 : 0; // Above upper band
        features[idx++] = state.price < indicators.bollinger_lower ? 1 : 0; // Below lower band
        features[idx++] = 0; // Band walk up
        features[idx++] = 0; // Band walk down
        features[idx++] = 0; // Band expansion
        features[idx++] = 0; // Band contraction
        features[idx++] = 0; // BB mean reversion signal
        features[idx++] = 0; // BB breakout signal
        features[idx++] = 0; // BB trend continuation
        // Momentum indicators (15 features)
        features[idx++] = indicators.adx / 100.0; // ADX strength
        features[idx++] = indicators.adx > 25 ? 1 : 0; // Strong trend
        features[idx++] = indicators.atr;
        features[idx++] = indicators.stochastic_k / 100.0;
        features[idx++] = indicators.stochastic_d / 100.0;
        features[idx++] = indicators.stochastic_k > indicators.stochastic_d ? 1 : 0; // Stoch cross
        features[idx++] = indicators.williams_r / 100.0;
        features[idx++] = indicators.cci / 200.0; // Normalize CCI
        features[idx++] = indicators.momentum;
        features[idx++] = indicators.roc;
        features[idx++] = 0; // Momentum divergence
        features[idx++] = 0; // ROC signal
        features[idx++] = 0; // CCI extreme readings
        features[idx++] = 0; // Williams %R extreme readings
        features[idx++] = 0; // Combined momentum score
        // Volatility indicators (20 features)
        features[idx++] = indicators.volatility_1h;
        features[idx++] = indicators.volatility_4h;
        features[idx++] = indicators.volatility_1d;
        features[idx++] = indicators.realized_volatility;
        // Volatility regimes
        features[idx++] = indicators.volatility_1h > indicators.volatility_4h ? 1 : 0; // Rising volatility
        features[idx++] = indicators.volatility_1d > 0.02 ? 1 : 0; // High volatility regime
        features[idx++] = indicators.volatility_1d < 0.01 ? 1 : 0; // Low volatility regime
        features[idx++] = 0; // Volatility breakout
        features[idx++] = 0; // Volatility compression
        features[idx++] = 0; // Volatility expansion
        features[idx++] = 0; // Volatility mean reversion
        features[idx++] = 0; // Volatility trend
        features[idx++] = 0; // Volatility oscillator
        features[idx++] = 0; // Volatility premium
        features[idx++] = 0; // Volatility forecast
        features[idx++] = 0; // Volatility regime change
        features[idx++] = 0; // Volatility clustering
        features[idx++] = 0; // Volatility smile
        features[idx++] = 0; // Volatility surface
        features[idx++] = 0; // Volatility-adjusted momentum
        // Volume indicators (20 features)
        features[idx++] = indicators.volume_sma_20;
        features[idx++] = indicators.volume_weighted_price;
        features[idx++] = indicators.on_balance_volume;
        features[idx++] = indicators.accumulation_distribution;
        // Volume analysis
        features[idx++] = state.volume > indicators.volume_sma_20 ? 1 : 0; // Above average volume
        features[idx++] = state.volume / indicators.volume_sma_20; // Volume ratio
        features[idx++] = 0; // Volume breakout
        features[idx++] = 0; // Volume climax
        features[idx++] = 0; // Volume distribution
        features[idx++] = 0; // Volume momentum
        features[idx++] = 0; // Volume oscillator
        features[idx++] = 0; // Volume-price trend
        features[idx++] = 0; // Volume rate of change
        features[idx++] = 0; // Volume accumulation
        features[idx++] = 0; // Volume distribution
        features[idx++] = 0; // Volume profile
        features[idx++] = 0; // Volume-weighted indicators
        features[idx++] = 0; // Volume seasonality
        features[idx++] = 0; // Volume anomalies
        features[idx++] = 0; // Volume confirmation
        // Pattern recognition (20 features)
        features[idx++] = indicators.doji ? 1 : 0;
        features[idx++] = indicators.hammer ? 1 : 0;
        features[idx++] = indicators.shooting_star ? 1 : 0;
        features[idx++] = indicators.engulfing_bullish ? 1 : 0;
        features[idx++] = indicators.engulfing_bearish ? 1 : 0;
        // Additional patterns (placeholders)
        for (let i = 0; i < 15; i++) {
            features[idx++] = 0; // More candlestick patterns, chart patterns, etc.
        }
        // Advanced technical analysis (70 more features)
        for (let i = 0; i < 70; i++) {
            features[idx++] = 0; // Ichimoku, Elliott Wave, Fibonacci, etc.
        }
        return idx;
    }
    /**
     * Extract market microstructure features
     */
    extractMicrostructureFeatures(features, idx, state) {
        const micro = state.microstructure;
        // Order book features (20 features)
        features[idx++] = micro.bidAskSpread;
        features[idx++] = micro.orderBookImbalance;
        features[idx++] = micro.liquidity;
        features[idx++] = micro.marketImpact;
        features[idx++] = micro.tickSize;
        // Order flow (15 features)
        features[idx++] = micro.buyVolume;
        features[idx++] = micro.sellVolume;
        features[idx++] = micro.aggressiveBuys;
        features[idx++] = micro.aggressiveSells;
        features[idx++] = micro.buyVolume / (micro.buyVolume + micro.sellVolume); // Buy ratio
        features[idx++] = (micro.buyVolume - micro.sellVolume) / (micro.buyVolume + micro.sellVolume); // Order flow imbalance
        // Additional order flow features (placeholders)
        for (let i = 0; i < 9; i++) {
            features[idx++] = 0; // VWAP, order flow momentum, etc.
        }
        // Market depth (25 features)
        // Bid levels
        for (let i = 0; i < Math.min(5, micro.bidLevels.length); i++) {
            features[idx++] = micro.bidLevels[i];
        }
        for (let i = micro.bidLevels.length; i < 5; i++) {
            features[idx++] = 0; // Padding
        }
        // Ask levels  
        for (let i = 0; i < Math.min(5, micro.askLevels.length); i++) {
            features[idx++] = micro.askLevels[i];
        }
        for (let i = micro.askLevels.length; i < 5; i++) {
            features[idx++] = 0; // Padding
        }
        // Support/Resistance levels
        for (let i = 0; i < Math.min(10, micro.supportResistance.length); i++) {
            features[idx++] = micro.supportResistance[i];
        }
        for (let i = micro.supportResistance.length; i < 10; i++) {
            features[idx++] = 0; // Padding
        }
        // Volume profile (20 features)
        for (let i = 0; i < Math.min(20, micro.volumeProfile.length); i++) {
            features[idx++] = micro.volumeProfile[i];
        }
        for (let i = micro.volumeProfile.length; i < 20; i++) {
            features[idx++] = 0; // Padding
        }
        // Advanced microstructure (20 features)
        for (let i = 0; i < 20; i++) {
            features[idx++] = 0; // Trade size distribution, latency arbitrage indicators, etc.
        }
        return idx;
    }
    /**
     * Extract cross-asset features
     */
    extractCrossAssetFeatures(features, idx, state) {
        const cross = state.crossAsset;
        // Traditional correlations (20 features)
        features[idx++] = cross.btcEthCorrelation;
        features[idx++] = cross.dollarIndex / 100.0; // Normalize DXY
        features[idx++] = cross.bondYields / 10.0; // Normalize yields
        features[idx++] = cross.vixLevel / 100.0; // Normalize VIX
        features[idx++] = cross.goldPrice / 2000.0; // Normalize gold
        features[idx++] = cross.oilPrice / 100.0; // Normalize oil
        features[idx++] = cross.sp500 / 5000.0; // Normalize S&P 500
        features[idx++] = cross.nasdaq / 15000.0; // Normalize NASDAQ
        features[idx++] = cross.eur_usd;
        features[idx++] = cross.gbp_usd;
        // Additional traditional markets (placeholders)
        for (let i = 0; i < 10; i++) {
            features[idx++] = 0; // More forex pairs, commodities, indices
        }
        // Crypto ecosystem (30 features)
        features[idx++] = cross.defiTvl / 100000000000.0; // Normalize DeFi TVL
        features[idx++] = cross.stablecoinSupply / 100000000000.0; // Normalize stablecoin supply
        features[idx++] = cross.exchangeInflows;
        features[idx++] = cross.exchangeOutflows;
        features[idx++] = (cross.exchangeInflows - cross.exchangeOutflows) / (cross.exchangeInflows + cross.exchangeOutflows); // Net flow
        // Additional crypto features (placeholders)
        for (let i = 0; i < 25; i++) {
            features[idx++] = 0; // Mining metrics, on-chain metrics, DeFi metrics, etc.
        }
        // Risk factors (25 features)
        for (let i = 0; i < 25; i++) {
            features[idx++] = 0; // Interest rate factors, credit spreads, volatility factors, etc.
        }
        // Economic indicators (25 features)
        for (let i = 0; i < 25; i++) {
            features[idx++] = 0; // GDP, inflation, employment, PMI, etc.
        }
        return idx;
    }
    /**
     * Extract sentiment features
     */
    extractSentimentFeatures(features, idx, state) {
        const sentiment = state.sentiment;
        // News and social sentiment (15 features)
        features[idx++] = sentiment.newssentiment;
        features[idx++] = sentiment.socialSentiment;
        features[idx++] = sentiment.fearGreedIndex / 100.0; // Normalize 0-1
        features[idx++] = sentiment.redditMentions / 1000.0; // Normalize mentions
        features[idx++] = sentiment.twitterSentiment;
        features[idx++] = sentiment.googleTrends / 100.0; // Normalize trends
        // Additional sentiment sources (placeholders)
        for (let i = 0; i < 9; i++) {
            features[idx++] = 0; // YouTube, TikTok, Discord, Telegram, etc.
        }
        // On-chain sentiment (15 features)
        features[idx++] = sentiment.hodlerSentiment;
        features[idx++] = sentiment.whaleActivity;
        features[idx++] = sentiment.exchangeSentiment;
        // Additional on-chain sentiment (placeholders)
        for (let i = 0; i < 12; i++) {
            features[idx++] = 0; // Wallet distributions, transaction patterns, etc.
        }
        // Sentiment derivatives (20 features)
        for (let i = 0; i < 20; i++) {
            features[idx++] = 0; // Sentiment momentum, sentiment divergences, etc.
        }
        return idx;
    }
    /**
     * Extract temporal features
     */
    extractTemporalFeatures(features, idx, state) {
        const temporal = state.temporal;
        // Basic time features (10 features)
        features[idx++] = temporal.hourOfDay / 24.0; // Normalize 0-1
        features[idx++] = temporal.dayOfWeek / 7.0; // Normalize 0-1
        features[idx++] = temporal.monthOfYear / 12.0; // Normalize 0-1
        features[idx++] = temporal.seasonality;
        features[idx++] = temporal.isWeekend ? 1 : 0;
        features[idx++] = temporal.isHoliday ? 1 : 0;
        // Market session encoding
        features[idx++] = temporal.marketSession === 'asian' ? 1 : 0;
        features[idx++] = temporal.marketSession === 'european' ? 1 : 0;
        features[idx++] = temporal.marketSession === 'american' ? 1 : 0;
        features[idx++] = temporal.marketSession === 'overlap' ? 1 : 0;
        // Session timing (10 features)
        features[idx++] = temporal.timeToClose / (24 * 60); // Normalize to 0-1
        features[idx++] = temporal.timeToOpen / (24 * 60); // Normalize to 0-1
        features[idx++] = temporal.sessionVolatility;
        // Additional temporal features (placeholders)
        for (let i = 0; i < 7; i++) {
            features[idx++] = 0; // Economic calendar events, earnings seasons, etc.
        }
        // Cyclical encodings (10 features)
        features[idx++] = Math.sin(2 * Math.PI * temporal.hourOfDay / 24); // Hour sine
        features[idx++] = Math.cos(2 * Math.PI * temporal.hourOfDay / 24); // Hour cosine
        features[idx++] = Math.sin(2 * Math.PI * temporal.dayOfWeek / 7); // Day sine
        features[idx++] = Math.cos(2 * Math.PI * temporal.dayOfWeek / 7); // Day cosine
        features[idx++] = Math.sin(2 * Math.PI * temporal.monthOfYear / 12); // Month sine
        features[idx++] = Math.cos(2 * Math.PI * temporal.monthOfYear / 12); // Month cosine
        // Additional cyclical features (placeholders)
        for (let i = 0; i < 4; i++) {
            features[idx++] = 0; // Quarter cycles, lunar cycles, etc.
        }
        // Economic calendar (10 features)
        for (let i = 0; i < 10; i++) {
            features[idx++] = 0; // Upcoming events, event importance, etc.
        }
        return idx;
    }
    /**
     * Normalize features using stored statistics
     */
    normalizeFeatures(features) {
        for (let i = 0; i < features.length; i++) {
            const stats = this.normalizationStats.get(`feature_${i}`);
            if (stats && stats.std > 0) {
                features[i] = (features[i] - stats.mean) / stats.std;
            }
            // Clip extreme values
            features[i] = Math.max(-5, Math.min(5, features[i]));
        }
    }
    /**
     * Generate cache key for features
     */
    generateCacheKey(state) {
        return `${state.timestamp}_${state.price}_${state.volume}_${state.indicators.rsi_14}`;
    }
    /**
     * Get default feature vector for error cases
     */
    getDefaultFeatures() {
        return new Float32Array(types_1.FEATURE_DIMENSIONS);
    }
    /**
     * Initialize normalization statistics (placeholder)
     */
    initializeNormalizationStats() {
        // TODO: Load from historical data or online learning
        for (let i = 0; i < types_1.FEATURE_DIMENSIONS; i++) {
            this.normalizationStats.set(`feature_${i}`, { mean: 0, std: 1 });
        }
    }
    /**
     * Update normalization statistics online
     */
    updateNormalizationStats(features) {
        // Online updating of mean and std for each feature
        for (let i = 0; i < features.length; i++) {
            const key = `feature_${i}`;
            const stats = this.normalizationStats.get(key) || { mean: 0, std: 1 };
            // Exponential moving average update
            const alpha = 0.001; // Learning rate
            stats.mean = (1 - alpha) * stats.mean + alpha * features[i];
            stats.std = Math.sqrt((1 - alpha) * stats.std * stats.std + alpha * (features[i] - stats.mean) ** 2);
            this.normalizationStats.set(key, stats);
        }
    }
    /**
     * Clear feature cache (for memory management)
     */
    clearCache() {
        this.featureCache.clear();
    }
    /**
     * Get feature importance (placeholder for analysis)
     */
    getFeatureImportance() {
        const importance = new Map();
        // Basic features
        importance.set('price', 0.15);
        importance.set('rsi_14', 0.12);
        importance.set('ema_21', 0.10);
        importance.set('volume', 0.08);
        importance.set('macd', 0.07);
        // ... more features
        return importance;
    }
}
exports.AdvancedFeatureExtractor = AdvancedFeatureExtractor;

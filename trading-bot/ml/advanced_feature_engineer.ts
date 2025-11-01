/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔬 ADVANCED FEATURE ENGINEERING SYSTEM
 * Zaawansowany system inżynierii cech dla modeli ML
 */

import { EventEmitter } from 'events';
import { Candle } from '../core/types/strategy';
import { Logger } from '../infrastructure/logging/logger';

export interface FeatureConfig {
    name: string;
    type: 'technical' | 'statistical' | 'temporal' | 'market_structure' | 'sentiment' | 'macro';
    parameters: Record<string, any>;
    enabled: boolean;
    priority: number;
    dependencies?: string[];
}

export interface FeatureSet {
    id: string;
    timestamp: number;
    features: Record<string, number>;
    metadata: {
        symbol: string;
        timeframe: string;
        version: string;
        quality_score: number;
    };
}

export interface FeatureStatistics {
    name: string;
    mean: number;
    std: number;
    min: number;
    max: number;
    missing_count: number;
    outlier_count: number;
    correlation_with_target?: number;
    importance_score?: number;
}

export class AdvancedFeatureEngineer extends EventEmitter {
    private logger: Logger;
    private featureConfigs: Map<string, FeatureConfig> = new Map();
    private featureStats: Map<string, FeatureStatistics> = new Map();
    private rollingWindows: Map<string, number[]> = new Map();
    private isInitialized: boolean = false;

    constructor() {
        super();
        this.logger = new Logger('AdvancedFeatureEngineer');
        this.initializeDefaultFeatures();
    }

    /**
     * 🏗️ Initialize default feature configurations
     */
    private initializeDefaultFeatures(): void {
        const defaultFeatures: FeatureConfig[] = [
            // Technical Indicators
            {
                name: 'rsi_14',
                type: 'technical',
                parameters: { period: 14 },
                enabled: true,
                priority: 1
            },
            {
                name: 'rsi_7',
                type: 'technical',
                parameters: { period: 7 },
                enabled: true,
                priority: 1
            },
            {
                name: 'ema_12',
                type: 'technical',
                parameters: { period: 12 },
                enabled: true,
                priority: 1
            },
            {
                name: 'ema_26',
                type: 'technical',
                parameters: { period: 26 },
                enabled: true,
                priority: 1
            },
            {
                name: 'macd_signal',
                type: 'technical',
                parameters: { fast: 12, slow: 26, signal: 9 },
                enabled: true,
                priority: 1
            },
            {
                name: 'bollinger_position',
                type: 'technical',
                parameters: { period: 20, std_dev: 2 },
                enabled: true,
                priority: 1
            },
            {
                name: 'atr_14',
                type: 'technical',
                parameters: { period: 14 },
                enabled: true,
                priority: 1
            },
            {
                name: 'stochastic_k',
                type: 'technical',
                parameters: { k_period: 14, d_period: 3 },
                enabled: true,
                priority: 1
            },

            // Statistical Features
            {
                name: 'price_momentum_5',
                type: 'statistical',
                parameters: { period: 5 },
                enabled: true,
                priority: 2
            },
            {
                name: 'price_momentum_20',
                type: 'statistical',
                parameters: { period: 20 },
                enabled: true,
                priority: 2
            },
            {
                name: 'volatility_10',
                type: 'statistical',
                parameters: { period: 10 },
                enabled: true,
                priority: 2
            },
            {
                name: 'volatility_30',
                type: 'statistical',
                parameters: { period: 30 },
                enabled: true,
                priority: 2
            },
            {
                name: 'skewness_20',
                type: 'statistical',
                parameters: { period: 20 },
                enabled: true,
                priority: 2
            },
            {
                name: 'kurtosis_20',
                type: 'statistical',
                parameters: { period: 20 },
                enabled: true,
                priority: 2
            },

            // Temporal Features
            {
                name: 'hour_of_day',
                type: 'temporal',
                parameters: {},
                enabled: true,
                priority: 3
            },
            {
                name: 'day_of_week',
                type: 'temporal',
                parameters: {},
                enabled: true,
                priority: 3
            },
            {
                name: 'day_of_month',
                type: 'temporal',
                parameters: {},
                enabled: true,
                priority: 3
            },
            {
                name: 'time_since_market_open',
                type: 'temporal',
                parameters: {},
                enabled: true,
                priority: 3
            },

            // Market Structure Features
            {
                name: 'volume_profile',
                type: 'market_structure',
                parameters: { period: 20 },
                enabled: true,
                priority: 2
            },
            {
                name: 'support_resistance_distance',
                type: 'market_structure',
                parameters: { lookback: 50 },
                enabled: true,
                priority: 2
            },
            {
                name: 'trend_strength',
                type: 'market_structure',
                parameters: { period: 20 },
                enabled: true,
                priority: 2
            },
            {
                name: 'market_regime',
                type: 'market_structure',
                parameters: { period: 50 },
                enabled: true,
                priority: 1
            }
        ];

        defaultFeatures.forEach(config => {
            this.featureConfigs.set(config.name, config);
        });

        this.isInitialized = true;
        this.logger.info(`🔬 Feature Engineer initialized with ${defaultFeatures.length} features`);
    }

    /**
     * 🔧 Extract comprehensive feature set from candle data
     */
    public async extractFeatures(candles: Candle[], symbol: string, timeframe: string): Promise<FeatureSet> {
        if (!this.isInitialized) {
            throw new Error('Feature Engineer not initialized');
        }

        if (candles.length < 50) {
            throw new Error('Insufficient data for feature extraction (minimum 50 candles required)');
        }

        const latestCandle = candles[candles.length - 1];
        const features: Record<string, number> = {};

        // Extract features by category
        const technicalFeatures = await this.extractTechnicalFeatures(candles);
        const statisticalFeatures = await this.extractStatisticalFeatures(candles);
        const temporalFeatures = await this.extractTemporalFeatures(latestCandle);
        const marketStructureFeatures = await this.extractMarketStructureFeatures(candles);

        // Combine all features
        Object.assign(features, technicalFeatures, statisticalFeatures, temporalFeatures, marketStructureFeatures);

        // Calculate quality score
        const qualityScore = this.calculateQualityScore(features);

        const featureSet: FeatureSet = {
            id: `features_${symbol}_${timeframe}_${latestCandle.time}`,
            timestamp: latestCandle.time,
            features,
            metadata: {
                symbol,
                timeframe,
                version: '1.0.0',
                quality_score: qualityScore
            }
        };

        // Update feature statistics
        this.updateFeatureStatistics(features);

        this.emit('features_extracted', featureSet);
        return featureSet;
    }

    /**
     * 📊 Extract technical indicator features
     */
    private async extractTechnicalFeatures(candles: Candle[]): Promise<Record<string, number>> {
        const features: Record<string, number> = {};
        const prices = candles.map(c => c.close);
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const volumes = candles.map(c => c.volume);

        try {
            // RSI Features
            features.rsi_14 = this.calculateRSI(prices, 14);
            features.rsi_7 = this.calculateRSI(prices, 7);
            features.rsi_divergence = this.calculateRSIDivergence(prices, 14);

            // EMA Features
            features.ema_12 = this.calculateEMA(prices, 12);
            features.ema_26 = this.calculateEMA(prices, 26);
            features.ema_crossover = features.ema_12 > features.ema_26 ? 1 : 0;
            features.price_above_ema12 = prices[prices.length - 1] > features.ema_12 ? 1 : 0;

            // MACD Features
            const macd = this.calculateMACD(prices, 12, 26, 9);
            features.macd_line = macd.macdLine;
            features.macd_signal = macd.signalLine;
            features.macd_histogram = macd.histogram;
            features.macd_bullish = macd.macdLine > macd.signalLine ? 1 : 0;

            // Bollinger Bands
            const bb = this.calculateBollingerBands(prices, 20, 2);
            features.bollinger_position = (prices[prices.length - 1] - bb.lower) / (bb.upper - bb.lower);
            features.bollinger_squeeze = (bb.upper - bb.lower) / bb.middle;

            // ATR
            features.atr_14 = this.calculateATR(highs, lows, prices, 14);
            features.atr_normalized = features.atr_14 / prices[prices.length - 1];

            // Stochastic
            const stoch = this.calculateStochastic(highs, lows, prices, 14, 3);
            features.stochastic_k = stoch.k;
            features.stochastic_d = stoch.d;
            features.stochastic_overbought = stoch.k > 80 ? 1 : 0;
            features.stochastic_oversold = stoch.k < 20 ? 1 : 0;

            // Volume features
            features.volume_sma_20 = this.calculateSMA(volumes, 20);
            features.volume_ratio = volumes[volumes.length - 1] / features.volume_sma_20;

        } catch (error) {
            this.logger.error('❌ Error extracting technical features:', error);
        }

        return features;
    }

    /**
     * 📈 Extract statistical features
     */
    private async extractStatisticalFeatures(candles: Candle[]): Promise<Record<string, number>> {
        const features: Record<string, number> = {};
        const prices = candles.map(c => c.close);
        const returns = this.calculateReturns(prices);

        try {
            // Momentum features
            features.price_momentum_5 = this.calculateMomentum(prices, 5);
            features.price_momentum_20 = this.calculateMomentum(prices, 20);
            features.momentum_acceleration = features.price_momentum_5 - features.price_momentum_20;

            // Volatility features
            features.volatility_10 = this.calculateVolatility(returns, 10);
            features.volatility_30 = this.calculateVolatility(returns, 30);
            features.volatility_ratio = features.volatility_10 / features.volatility_30;

            // Higher order moments
            features.skewness_20 = this.calculateSkewness(returns.slice(-20));
            features.kurtosis_20 = this.calculateKurtosis(returns.slice(-20));

            // Price distribution features
            features.price_percentile_rank = this.calculatePercentileRank(prices, prices[prices.length - 1]);
            features.price_z_score = this.calculateZScore(prices, 20);

            // Trend features
            features.trend_direction = this.calculateTrendDirection(prices, 20);
            features.trend_strength = this.calculateTrendStrength(prices, 20);

        } catch (error) {
            this.logger.error('❌ Error extracting statistical features:', error);
        }

        return features;
    }

    /**
     * ⏰ Extract temporal features
     */
    private async extractTemporalFeatures(candle: Candle): Promise<Record<string, number>> {
        const features: Record<string, number> = {};
        const date = new Date(candle.time);

        try {
            // Time-based features
            features.hour_of_day = date.getHours();
            features.day_of_week = date.getDay();
            features.day_of_month = date.getDate();
            features.month_of_year = date.getMonth() + 1;

            // Cyclical encoding for time features
            features.hour_sin = Math.sin(2 * Math.PI * features.hour_of_day / 24);
            features.hour_cos = Math.cos(2 * Math.PI * features.hour_of_day / 24);
            features.day_sin = Math.sin(2 * Math.PI * features.day_of_week / 7);
            features.day_cos = Math.cos(2 * Math.PI * features.day_of_week / 7);

            // Market session features
            features.is_market_open = this.isMarketOpen(date) ? 1 : 0;
            features.time_since_market_open = this.getTimeSinceMarketOpen(date);
            features.time_until_market_close = this.getTimeUntilMarketClose(date);

            // Special periods
            features.is_weekend = (features.day_of_week === 0 || features.day_of_week === 6) ? 1 : 0;
            features.is_end_of_month = date.getDate() > 25 ? 1 : 0;
            features.is_beginning_of_month = date.getDate() <= 5 ? 1 : 0;

        } catch (error) {
            this.logger.error('❌ Error extracting temporal features:', error);
        }

        return features;
    }

    /**
     * 🏗️ Extract market structure features
     */
    private async extractMarketStructureFeatures(candles: Candle[]): Promise<Record<string, number>> {
        const features: Record<string, number> = {};
        const prices = candles.map(c => c.close);
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const volumes = candles.map(c => c.volume);

        try {
            // Support/Resistance levels
            const sr = this.findSupportResistance(highs, lows, 50);
            features.support_distance = (prices[prices.length - 1] - sr.support) / prices[prices.length - 1];
            features.resistance_distance = (sr.resistance - prices[prices.length - 1]) / prices[prices.length - 1];

            // Market regime detection
            features.market_regime = this.detectMarketRegime(prices, 50);
            features.regime_strength = this.calculateRegimeStrength(prices, 20);

            // Volume profile features
            features.volume_profile_poc = this.calculateVolumeProfilePOC(candles.slice(-20));
            features.volume_imbalance = this.calculateVolumeImbalance(volumes, 10);

            // Pattern recognition features
            features.double_top_pattern = this.detectDoubleTop(highs, 20) ? 1 : 0;
            features.double_bottom_pattern = this.detectDoubleBottom(lows, 20) ? 1 : 0;
            features.triangle_pattern = this.detectTrianglePattern(highs, lows, 20);

            // Fibonacci levels
            const fib = this.calculateFibonacciLevels(highs, lows, 50);
            features.fib_retracement_level = this.getFibonacciLevel(prices[prices.length - 1], fib);

        } catch (error) {
            this.logger.error('❌ Error extracting market structure features:', error);
        }

        return features;
    }

    // === CALCULATION METHODS ===

    private calculateRSI(prices: number[], period: number): number {
        if (prices.length < period + 1) return 50;
        
        const gains: number[] = [];
        const losses: number[] = [];
        
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }
        
        const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
        
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    private calculateRSIDivergence(prices: number[], period: number): number {
        // Simplified RSI divergence calculation
        if (prices.length < period * 2) return 0;
        
        const rsi1 = this.calculateRSI(prices.slice(0, -period), period);
        const rsi2 = this.calculateRSI(prices, period);
        const price1 = prices[prices.length - period - 1];
        const price2 = prices[prices.length - 1];
        
        const rsiChange = rsi2 - rsi1;
        const priceChange = price2 - price1;
        
        // Bullish divergence: price down, RSI up
        if (priceChange < 0 && rsiChange > 0) return 1;
        // Bearish divergence: price up, RSI down
        if (priceChange > 0 && rsiChange < 0) return -1;
        
        return 0;
    }

    private calculateEMA(prices: number[], period: number): number {
        if (prices.length === 0) return 0;
        
        const multiplier = 2 / (period + 1);
        let ema = prices[0];
        
        for (let i = 1; i < prices.length; i++) {
            ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
        }
        
        return ema;
    }

    private calculateSMA(values: number[], period: number): number {
        if (values.length < period) return values[values.length - 1] || 0;
        
        const slice = values.slice(-period);
        return slice.reduce((a, b) => a + b, 0) / period;
    }

    private calculateMACD(prices: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number): {
        macdLine: number;
        signalLine: number;
        histogram: number;
    } {
        const emaFast = this.calculateEMA(prices, fastPeriod);
        const emaSlow = this.calculateEMA(prices, slowPeriod);
        const macdLine = emaFast - emaSlow;
        
        // For simplicity, use SMA for signal line
        const signalLine = macdLine; // Would need historical MACD values for proper EMA
        const histogram = macdLine - signalLine;
        
        return { macdLine, signalLine, histogram };
    }

    private calculateBollingerBands(prices: number[], period: number, stdDev: number): {
        upper: number;
        middle: number;
        lower: number;
    } {
        const sma = this.calculateSMA(prices, period);
        const slice = prices.slice(-period);
        const variance = slice.reduce((acc, price) => acc + Math.pow(price - sma, 2), 0) / period;
        const std = Math.sqrt(variance);
        
        return {
            upper: sma + (std * stdDev),
            middle: sma,
            lower: sma - (std * stdDev)
        };
    }

    private calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
        if (highs.length < period + 1) return 0;
        
        const trueRanges: number[] = [];
        
        for (let i = 1; i < highs.length; i++) {
            const tr1 = highs[i] - lows[i];
            const tr2 = Math.abs(highs[i] - closes[i - 1]);
            const tr3 = Math.abs(lows[i] - closes[i - 1]);
            trueRanges.push(Math.max(tr1, tr2, tr3));
        }
        
        return this.calculateSMA(trueRanges, period);
    }

    private calculateStochastic(highs: number[], lows: number[], closes: number[], kPeriod: number, dPeriod: number): {
        k: number;
        d: number;
    } {
        if (highs.length < kPeriod) return { k: 50, d: 50 };
        
        const recentHighs = highs.slice(-kPeriod);
        const recentLows = lows.slice(-kPeriod);
        const currentClose = closes[closes.length - 1];
        
        const highestHigh = Math.max(...recentHighs);
        const lowestLow = Math.min(...recentLows);
        
        const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
        const d = k; // Simplified - would need historical %K values for proper SMA
        
        return { k, d };
    }

    private calculateReturns(prices: number[]): number[] {
        const returns: number[] = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
        return returns;
    }

    private calculateMomentum(prices: number[], period: number): number {
        if (prices.length < period + 1) return 0;
        
        const currentPrice = prices[prices.length - 1];
        const pastPrice = prices[prices.length - 1 - period];
        
        return (currentPrice - pastPrice) / pastPrice;
    }

    private calculateVolatility(returns: number[], period: number): number {
        if (returns.length < period) return 0;
        
        const recentReturns = returns.slice(-period);
        const mean = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
        const variance = recentReturns.reduce((acc, ret) => acc + Math.pow(ret - mean, 2), 0) / recentReturns.length;
        
        return Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility
    }

    private calculateSkewness(values: number[]): number {
        if (values.length < 3) return 0;
        
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const std = Math.sqrt(values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length);
        
        if (std === 0) return 0;
        
        const skewness = values.reduce((acc, val) => acc + Math.pow((val - mean) / std, 3), 0) / values.length;
        return skewness;
    }

    private calculateKurtosis(values: number[]): number {
        if (values.length < 4) return 0;
        
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const std = Math.sqrt(values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length);
        
        if (std === 0) return 0;
        
        const kurtosis = values.reduce((acc, val) => acc + Math.pow((val - mean) / std, 4), 0) / values.length;
        return kurtosis - 3; // Excess kurtosis
    }

    private calculatePercentileRank(values: number[], target: number): number {
        const sorted = [...values].sort((a, b) => a - b);
        const index = sorted.findIndex(val => val >= target);
        return index === -1 ? 1 : index / sorted.length;
    }

    private calculateZScore(prices: number[], period: number): number {
        if (prices.length < period) return 0;
        
        const recentPrices = prices.slice(-period);
        const mean = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
        const std = Math.sqrt(recentPrices.reduce((acc, price) => acc + Math.pow(price - mean, 2), 0) / recentPrices.length);
        
        if (std === 0) return 0;
        
        return (prices[prices.length - 1] - mean) / std;
    }

    private calculateTrendDirection(prices: number[], period: number): number {
        if (prices.length < period) return 0;
        
        const recentPrices = prices.slice(-period);
        const firstPrice = recentPrices[0];
        const lastPrice = recentPrices[recentPrices.length - 1];
        
        return lastPrice > firstPrice ? 1 : -1;
    }

    private calculateTrendStrength(prices: number[], period: number): number {
        if (prices.length < period) return 0;
        
        const recentPrices = prices.slice(-period);
        let upCount = 0;
        let downCount = 0;
        
        for (let i = 1; i < recentPrices.length; i++) {
            if (recentPrices[i] > recentPrices[i - 1]) upCount++;
            else if (recentPrices[i] < recentPrices[i - 1]) downCount++;
        }
        
        const totalMoves = upCount + downCount;
        if (totalMoves === 0) return 0;
        
        return Math.abs(upCount - downCount) / totalMoves;
    }

    private isMarketOpen(date: Date): boolean {
        const hour = date.getHours();
        const day = date.getDay();
        
        // Simple check for weekdays 9-17
        return day >= 1 && day <= 5 && hour >= 9 && hour <= 17;
    }

    private getTimeSinceMarketOpen(date: Date): number {
        const marketOpen = new Date(date);
        marketOpen.setHours(9, 0, 0, 0);
        
        if (date < marketOpen) return 0;
        
        return (date.getTime() - marketOpen.getTime()) / (1000 * 60 * 60); // Hours
    }

    private getTimeUntilMarketClose(date: Date): number {
        const marketClose = new Date(date);
        marketClose.setHours(17, 0, 0, 0);
        
        if (date > marketClose) return 0;
        
        return (marketClose.getTime() - date.getTime()) / (1000 * 60 * 60); // Hours
    }

    private findSupportResistance(highs: number[], lows: number[], period: number): {
        support: number;
        resistance: number;
    } {
        const recentHighs = highs.slice(-period);
        const recentLows = lows.slice(-period);
        
        // Simplified S/R calculation
        const resistance = Math.max(...recentHighs);
        const support = Math.min(...recentLows);
        
        return { support, resistance };
    }

    private detectMarketRegime(prices: number[], period: number): number {
        if (prices.length < period) return 0;
        
        const recentPrices = prices.slice(-period);
        const sma = this.calculateSMA(recentPrices, period);
        const currentPrice = prices[prices.length - 1];
        
        // Simple regime: 1 = trending up, -1 = trending down, 0 = sideways
        if (currentPrice > sma * 1.02) return 1;
        if (currentPrice < sma * 0.98) return -1;
        return 0;
    }

    private calculateRegimeStrength(prices: number[], period: number): number {
        const regime = this.detectMarketRegime(prices, period);
        if (regime === 0) return 0;
        
        return Math.abs(this.calculateTrendStrength(prices, period));
    }

    private calculateVolumeProfilePOC(candles: Candle[]): number {
        // Point of Control - price level with highest volume
        const volumeByPrice = new Map<number, number>();
        
        candles.forEach(candle => {
            const price = Math.round(candle.close);
            volumeByPrice.set(price, (volumeByPrice.get(price) || 0) + candle.volume);
        });
        
        let maxVolume = 0;
        let poc = 0;
        
        volumeByPrice.forEach((volume, price) => {
            if (volume > maxVolume) {
                maxVolume = volume;
                poc = price;
            }
        });
        
        return poc;
    }

    private calculateVolumeImbalance(volumes: number[], period: number): number {
        if (volumes.length < period) return 0;
        
        const recentVolumes = volumes.slice(-period);
        const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
        const currentVolume = volumes[volumes.length - 1];
        
        return (currentVolume - avgVolume) / avgVolume;
    }

    private detectDoubleTop(highs: number[], period: number): boolean {
        // Simplified double top detection
        if (highs.length < period) return false;
        
        const recentHighs = highs.slice(-period);
        const maxHigh = Math.max(...recentHighs);
        const maxIndex = recentHighs.lastIndexOf(maxHigh);
        
        // Look for another high within 95% of max high
        for (let i = 0; i < maxIndex - 5; i++) {
            if (recentHighs[i] >= maxHigh * 0.95) {
                return true;
            }
        }
        
        return false;
    }

    private detectDoubleBottom(lows: number[], period: number): boolean {
        // Simplified double bottom detection
        if (lows.length < period) return false;
        
        const recentLows = lows.slice(-period);
        const minLow = Math.min(...recentLows);
        const minIndex = recentLows.lastIndexOf(minLow);
        
        // Look for another low within 105% of min low
        for (let i = 0; i < minIndex - 5; i++) {
            if (recentLows[i] <= minLow * 1.05) {
                return true;
            }
        }
        
        return false;
    }

    private detectTrianglePattern(highs: number[], lows: number[], period: number): number {
        // Simplified triangle pattern detection
        // Returns: 1 = ascending, -1 = descending, 0 = symmetric/none
        if (highs.length < period || lows.length < period) return 0;
        
        const recentHighs = highs.slice(-period);
        const recentLows = lows.slice(-period);
        
        const highTrend = this.calculateTrendDirection(recentHighs, period);
        const lowTrend = this.calculateTrendDirection(recentLows, period);
        
        if (highTrend === 1 && lowTrend === 1) return 1; // Ascending triangle
        if (highTrend === -1 && lowTrend === -1) return -1; // Descending triangle
        
        return 0; // Symmetric or no pattern
    }

    private calculateFibonacciLevels(highs: number[], lows: number[], period: number): {
        high: number;
        low: number;
        levels: Record<string, number>;
    } {
        const recentHighs = highs.slice(-period);
        const recentLows = lows.slice(-period);
        
        const high = Math.max(...recentHighs);
        const low = Math.min(...recentLows);
        const range = high - low;
        
        const levels = {
            '0': high,
            '23.6': high - (range * 0.236),
            '38.2': high - (range * 0.382),
            '50': high - (range * 0.5),
            '61.8': high - (range * 0.618),
            '100': low
        };
        
        return { high, low, levels };
    }

    private getFibonacciLevel(price: number, fib: { levels: Record<string, number> }): number {
        // Find closest Fibonacci level
        let closestLevel = 0;
        let minDistance = Infinity;
        
        Object.values(fib.levels).forEach(level => {
            const distance = Math.abs(price - level);
            if (distance < minDistance) {
                minDistance = distance;
                closestLevel = level;
            }
        });
        
        return (price - closestLevel) / price; // Normalized distance
    }

    private calculateQualityScore(features: Record<string, number>): number {
        let score = 1.0;
        let featureCount = 0;
        
        for (const [name, value] of Object.entries(features)) {
            featureCount++;
            
            // Penalize for NaN or infinite values
            if (!isFinite(value)) {
                score -= 0.1;
                continue;
            }
            
            // Penalize for extreme outliers
            if (Math.abs(value) > 100) {
                score -= 0.05;
            }
        }
        
        // Bonus for having many features
        if (featureCount > 50) score += 0.1;
        
        return Math.max(0, Math.min(1, score));
    }

    private updateFeatureStatistics(features: Record<string, number>): void {
        for (const [name, value] of Object.entries(features)) {
            if (!isFinite(value)) continue;
            
            let stats = this.featureStats.get(name);
            if (!stats) {
                stats = {
                    name,
                    mean: value,
                    std: 0,
                    min: value,
                    max: value,
                    missing_count: 0,
                    outlier_count: 0
                };
                this.featureStats.set(name, stats);
            } else {
                // Update running statistics
                stats.min = Math.min(stats.min, value);
                stats.max = Math.max(stats.max, value);
                
                // Simple running mean update (would be better with proper online algorithm)
                stats.mean = (stats.mean + value) / 2;
            }
        }
    }

    /**
     * 📊 Get feature statistics
     */
    public getFeatureStatistics(): FeatureStatistics[] {
        return Array.from(this.featureStats.values());
    }

    /**
     * 🔧 Configure feature
     */
    public configureFeature(name: string, config: Partial<FeatureConfig>): void {
        const existing = this.featureConfigs.get(name);
        if (existing) {
            this.featureConfigs.set(name, { ...existing, ...config });
        } else {
            this.featureConfigs.set(name, {
                name,
                type: 'technical',
                parameters: {},
                enabled: true,
                priority: 1,
                ...config
            });
        }
        
        this.logger.info(`🔧 Feature ${name} configured`);
    }

    /**
     * 📋 Get enabled features
     */
    public getEnabledFeatures(): FeatureConfig[] {
        return Array.from(this.featureConfigs.values()).filter(config => config.enabled);
    }

    /**
     * 🧹 Cleanup
     */
    public cleanup(): void {
        this.featureConfigs.clear();
        this.featureStats.clear();
        this.rollingWindows.clear();
        this.logger.info('🧹 Feature Engineer cleaned up');
    }
}

export default AdvancedFeatureEngineer;

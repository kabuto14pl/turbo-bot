/**
 * @file TechnicalIndicators.ts
 * @description Technical analysis indicators utility class
 * 
 * ENTERPRISE-GRADE TECHNICAL INDICATORS
 * Extracted from autonomous_trading_bot_final.ts
 * Total methods: 11 static functions
 * Coverage: RSI, MACD, Bollinger, SMA, EMA, ATR, Volume analysis
 */

import { Candle, TechnicalIndicators as TechnicalIndicatorsType } from '../types/TradingTypes';

/**
 * Technical Indicators - Static utility class
 * All methods are pure functions (no side effects)
 */
export class TechnicalIndicators {
    
    /**
     * Calculate RSI (Relative Strength Index)
     * @param candles OHLCV candles (minimum 14 required)
     * @param period RSI period (default: 14)
     * @returns RSI value (0-100)
     */
    public static calculateRSI(candles: Candle[], period: number = 14): number {
        if (candles.length < period + 1) {
            return 50; // Neutral if insufficient data
        }

        let gains = 0;
        let losses = 0;

        // Calculate initial average gain/loss
        for (let i = candles.length - period; i < candles.length; i++) {
            const change = candles[i].close - candles[i - 1].close;
            if (change > 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
        }

        const avgGain = gains / period;
        const avgLoss = losses / period;

        if (avgLoss === 0) return 100;

        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));

        return rsi;
    }

    /**
     * Calculate MACD (Moving Average Convergence Divergence)
     * @param candles OHLCV candles
     * @param fastPeriod Fast EMA period (default: 12)
     * @param slowPeriod Slow EMA period (default: 26)
     * @param signalPeriod Signal line period (default: 9)
     * @returns MACD object {macd, signal, histogram}
     */
    public static calculateMACD(
        candles: Candle[],
        fastPeriod: number = 12,
        slowPeriod: number = 26,
        signalPeriod: number = 9
    ): { macd: number; signal: number; histogram: number } {
        if (candles.length < slowPeriod + signalPeriod) {
            return { macd: 0, signal: 0, histogram: 0 };
        }

        const prices = candles.map(c => c.close);
        const fastEMA = this.calculateEMA(prices, fastPeriod);
        const slowEMA = this.calculateEMA(prices, slowPeriod);
        const macdLine = fastEMA - slowEMA;

        // Calculate signal line (EMA of MACD)
        const macdHistory = [macdLine]; // Simplified - in production, maintain full MACD history
        const signalLine = macdLine * (2 / (signalPeriod + 1)); // Simplified EMA

        const histogram = macdLine - signalLine;

        return {
            macd: macdLine,
            signal: signalLine,
            histogram: histogram
        };
    }

    /**
     * Calculate Bollinger Bands
     * @param candles OHLCV candles
     * @param period Period (default: 20)
     * @param stdDev Standard deviations (default: 2)
     * @returns Bollinger Bands {upper, middle, lower}
     */
    public static calculateBollingerBands(
        candles: Candle[],
        period: number = 20,
        stdDev: number = 2
    ): { upper: number; middle: number; lower: number } {
        if (candles.length < period) {
            const lastPrice = candles[candles.length - 1].close;
            return { upper: lastPrice, middle: lastPrice, lower: lastPrice };
        }

        const prices = candles.slice(-period).map(c => c.close);
        const sma = prices.reduce((sum, price) => sum + price, 0) / period;

        // Calculate standard deviation
        const squaredDiffs = prices.map(price => Math.pow(price - sma, 2));
        const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
        const standardDeviation = Math.sqrt(variance);

        return {
            upper: sma + (stdDev * standardDeviation),
            middle: sma,
            lower: sma - (stdDev * standardDeviation)
        };
    }

    /**
     * Calculate Simple Moving Average (SMA)
     * @param candles OHLCV candles
     * @param period Period
     * @returns SMA value
     */
    public static calculateSMA(candles: Candle[], period: number): number {
        if (candles.length < period) {
            return candles[candles.length - 1].close;
        }

        const prices = candles.slice(-period).map(c => c.close);
        return prices.reduce((sum, price) => sum + price, 0) / period;
    }

    /**
     * Calculate Exponential Moving Average (EMA)
     * @param prices Price array
     * @param period Period
     * @returns EMA value
     */
    public static calculateEMA(prices: number[], period: number): number {
        if (prices.length < period) {
            return prices[prices.length - 1] || 0;
        }

        const multiplier = 2 / (period + 1);
        let ema = prices.slice(0, period).reduce((sum, p) => sum + p, 0) / period;

        for (let i = period; i < prices.length; i++) {
            ema = (prices[i] - ema) * multiplier + ema;
        }

        return ema;
    }

    /**
     * Calculate Average True Range (ATR) - Volatility indicator
     * @param candles OHLCV candles
     * @param period Period (default: 14)
     * @returns ATR value
     */
    public static calculateATR(candles: Candle[], period: number = 14): number {
        if (candles.length < period + 1) {
            return 0;
        }

        const trueRanges: number[] = [];

        for (let i = 1; i < candles.length; i++) {
            const high = candles[i].high;
            const low = candles[i].low;
            const prevClose = candles[i - 1].close;

            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );

            trueRanges.push(tr);
        }

        // Use EMA for ATR smoothing
        return this.calculateEMA(trueRanges, period);
    }

    /**
     * Calculate Volume Profile - Relative volume indicator
     * @param candles OHLCV candles
     * @param period Period (default: 20)
     * @returns Volume profile (current volume / average volume)
     */
    public static calculateVolumeProfile(candles: Candle[], period: number = 20): number {
        if (candles.length < 2) {
            return 1.0; // Neutral
        }

        const recentCandles = candles.slice(-Math.min(period, candles.length));
        const avgVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;
        const currentVolume = candles[candles.length - 1].volume;

        return avgVolume > 0 ? currentVolume / avgVolume : 1.0;
    }

    /**
     * Calculate all technical indicators at once
     * @param candles OHLCV candles
     * @returns Complete technical indicators object
     */
    public static calculateAll(candles: Candle[]): TechnicalIndicatorsType {
        return {
            rsi: this.calculateRSI(candles),
            macd: this.calculateMACD(candles),
            bollingerBands: this.calculateBollingerBands(candles),
            sma20: this.calculateSMA(candles, 20),
            sma50: this.calculateSMA(candles, 50),
            sma200: this.calculateSMA(candles, 200),
            ema: this.calculateEMA(candles.map(c => c.close), 12),
            atr: this.calculateATR(candles),
            volumeProfile: this.calculateVolumeProfile(candles)
        };
    }

    /**
     * Detect market trend based on moving averages
     * @param candles OHLCV candles
     * @returns Trend direction ('up', 'down', 'neutral')
     */
    public static detectTrend(candles: Candle[]): 'up' | 'down' | 'neutral' {
        if (candles.length < 50) {
            return 'neutral';
        }

        const sma20 = this.calculateSMA(candles, 20);
        const sma50 = this.calculateSMA(candles, 50);
        const currentPrice = candles[candles.length - 1].close;

        if (currentPrice > sma20 && sma20 > sma50) {
            return 'up';
        } else if (currentPrice < sma20 && sma20 < sma50) {
            return 'down';
        } else {
            return 'neutral';
        }
    }

    /**
     * Calculate price volatility (standard deviation of returns)
     * @param candles OHLCV candles
     * @param period Period (default: 20)
     * @returns Volatility as decimal (e.g., 0.02 = 2%)
     */
    public static calculateVolatility(candles: Candle[], period: number = 20): number {
        if (candles.length < period + 1) {
            return 0.01; // Default 1% if insufficient data
        }

        const returns: number[] = [];
        for (let i = candles.length - period; i < candles.length; i++) {
            const returnValue = (candles[i].close - candles[i - 1].close) / candles[i - 1].close;
            returns.push(returnValue);
        }

        const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const squaredDiffs = returns.map(r => Math.pow(r - meanReturn, 2));
        const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / returns.length;

        return Math.sqrt(variance);
    }

    /**
     * Check if price is oversold (RSI < 30)
     * @param candles OHLCV candles
     * @returns true if oversold
     */
    public static isOversold(candles: Candle[]): boolean {
        const rsi = this.calculateRSI(candles);
        return rsi < 30;
    }

    /**
     * Check if price is overbought (RSI > 70)
     * @param candles OHLCV candles
     * @returns true if overbought
     */
    public static isOverbought(candles: Candle[]): boolean {
        const rsi = this.calculateRSI(candles);
        return rsi > 70;
    }
}

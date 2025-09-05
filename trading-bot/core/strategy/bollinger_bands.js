"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BollingerBandsStrategy = void 0;
const simple_error_manager_1 = require("../error-handling/simple-error-manager");
/**
 * Bollinger Bands Strategy
 * Mean reversion strategy using statistical bands
 */
class BollingerBandsStrategy {
    constructor(config) {
        this.prices = [];
        // Strategy parameters
        this.period = 20;
        this.standardDeviations = 2;
        this.oversoldThreshold = 0.1; // Lower band proximity
        this.overboughtThreshold = 0.9; // Upper band proximity
        this.errorManager = new simple_error_manager_1.SimpleErrorManager();
        if (config) {
            this.period = config.period || this.period;
            this.standardDeviations = config.standardDeviations || this.standardDeviations;
            this.oversoldThreshold = config.oversoldThreshold || this.oversoldThreshold;
            this.overboughtThreshold = config.overboughtThreshold || this.overboughtThreshold;
        }
    }
    async execute(data) {
        try {
            this.prices.push(data.close);
            // Keep only recent data
            if (this.prices.length > this.period * 2) {
                this.prices = this.prices.slice(-this.period * 2);
            }
            if (this.prices.length < this.period) {
                return {
                    signals: [],
                    metadata: {
                        strategy: 'bollinger_bands',
                        timestamp: Date.now(),
                        status: 'warming_up'
                    }
                };
            }
            // Calculate Bollinger Bands
            const recentPrices = this.prices.slice(-this.period);
            const sma = recentPrices.reduce((a, b) => a + b, 0) / this.period;
            const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / this.period;
            const stdDev = Math.sqrt(variance);
            const upperBand = sma + (this.standardDeviations * stdDev);
            const lowerBand = sma - (this.standardDeviations * stdDev);
            const currentPrice = data.close;
            const bandPosition = (currentPrice - lowerBand) / (upperBand - lowerBand);
            const signals = [];
            // Generate signals based on band position
            if (bandPosition <= this.oversoldThreshold) {
                // Price near lower band - potential buy
                signals.push({
                    type: 'BUY',
                    symbol: data.symbol,
                    timestamp: Date.now(),
                    strength: Math.max(0.1, 1 - bandPosition * 2), // Stronger signal closer to lower band
                    price: currentPrice,
                    reason: `Bollinger oversold: price at ${(bandPosition * 100).toFixed(1)}% of band range`,
                    metadata: {
                        strategy_type: 'mean_reversion',
                        band_position: bandPosition,
                        upper_band: upperBand,
                        lower_band: lowerBand,
                        sma: sma
                    }
                });
            }
            else if (bandPosition >= this.overboughtThreshold) {
                // Price near upper band - potential sell
                signals.push({
                    type: 'SELL',
                    symbol: data.symbol,
                    timestamp: Date.now(),
                    strength: Math.max(0.1, (bandPosition - 0.5) * 2), // Stronger signal closer to upper band
                    price: currentPrice,
                    reason: `Bollinger overbought: price at ${(bandPosition * 100).toFixed(1)}% of band range`,
                    metadata: {
                        strategy_type: 'mean_reversion',
                        band_position: bandPosition,
                        upper_band: upperBand,
                        lower_band: lowerBand,
                        sma: sma
                    }
                });
            }
            return {
                signals,
                metadata: {
                    strategy: 'bollinger_bands',
                    timestamp: Date.now(),
                    band_position: bandPosition,
                    upper_band: upperBand,
                    lower_band: lowerBand,
                    sma: sma,
                    current_price: currentPrice,
                    band_width: (upperBand - lowerBand) / sma
                }
            };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error('Bollinger Bands strategy error:', errorMsg);
            throw error;
        }
    }
    getConfig() {
        return {
            period: this.period,
            standardDeviations: this.standardDeviations,
            oversoldThreshold: this.oversoldThreshold,
            overboughtThreshold: this.overboughtThreshold
        };
    }
}
exports.BollingerBandsStrategy = BollingerBandsStrategy;
exports.default = new BollingerBandsStrategy({
    period: 20,
    standardDeviations: 2,
    oversoldThreshold: 0.1,
    overboughtThreshold: 0.9
});

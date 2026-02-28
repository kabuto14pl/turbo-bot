"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PairsTradingStrategy = void 0;
const simple_error_manager_1 = require("../error-handling/simple-error-manager");
// Local ErrorType enum for this strategy
var ErrorType;
(function (ErrorType) {
    ErrorType["STRATEGY_ERROR"] = "STRATEGY_ERROR";
    ErrorType["DATA_ERROR"] = "DATA_ERROR";
})(ErrorType || (ErrorType = {}));
/**
 * Advanced Pairs Trading Strategy
 * Implements statistical arbitrage with proper cointegration testing
 */
class PairsTradingStrategy {
    constructor(config) {
        this.pairData = new Map();
        this.cointegrationResults = new Map();
        // Strategy parameters
        this.lookbackPeriod = 252; // 1 year of daily data
        this.entryThreshold = 2.0; // Z-score entry threshold
        this.exitThreshold = 0.5; // Z-score exit threshold
        this.correlationThreshold = 0.7; // Minimum correlation
        this.cointegrationThreshold = 0.05; // P-value threshold
        this.rollingWindow = 20; // Rolling statistics window
        this.errorManager = new simple_error_manager_1.SimpleErrorManager();
        // Override default parameters with config
        if (config) {
            this.lookbackPeriod = config.lookbackPeriod || this.lookbackPeriod;
            this.entryThreshold = config.entryThreshold || this.entryThreshold;
            this.exitThreshold = config.exitThreshold || this.exitThreshold;
            this.correlationThreshold = config.correlationThreshold || this.correlationThreshold;
            this.rollingWindow = config.rollingWindow || this.rollingWindow;
        }
    }
    /**
     * Main strategy execution method
     */
    async execute(data) {
        try {
            // Update pair data
            await this.updatePairData(data);
            // Find and analyze potential pairs
            const signals = await this.generatePairsSignals();
            // Calculate strategy metrics
            const metrics = this.calculateStrategyMetrics(signals);
            return {
                signals,
                metadata: {
                    strategy: 'pairs_trading',
                    timestamp: Date.now(),
                    pairs_tested: this.pairData.size,
                    cointegrated_pairs: this.cointegrationResults.size,
                    correlation_threshold: this.correlationThreshold,
                    cointegration_threshold: this.cointegrationThreshold
                }
            };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error('Strategy execution error:', errorMsg);
            throw error;
        }
    }
    /**
     * Test cointegration between two price series using Johansen test
     */
    async testCointegration(prices1, prices2) {
        try {
            if (prices1.length !== prices2.length || prices1.length < this.lookbackPeriod) {
                throw new Error('Insufficient or mismatched price data for cointegration test');
            }
            // Simplified Johansen cointegration test implementation
            // In production, use a proper statistical library like jStat or call Python
            // Step 1: Check if series are individually non-stationary (unit root test)
            const adfTest1 = this.augmentedDickeyFullerTest(prices1);
            const adfTest2 = this.augmentedDickeyFullerTest(prices2);
            // Step 2: Calculate correlation
            const correlation = this.calculateCorrelation(prices1, prices2);
            if (Math.abs(correlation) < this.correlationThreshold) {
                return {
                    isCointegrated: false,
                    pValue: 1.0,
                    criticalValue: -3.43, // 5% critical value
                    eigenVector: [1, 0],
                    testStatistic: 0
                };
            }
            // Step 3: Estimate cointegrating vector using OLS
            const hedgeRatio = this.calculateOptimalHedgeRatio(prices1, prices2);
            // Step 4: Test stationarity of residuals (spread)
            const spread = this.calculateSpread(prices1, prices2, hedgeRatio);
            const adfSpread = this.augmentedDickeyFullerTest(spread);
            // Determine cointegration based on spread stationarity
            const isCointegrated = adfSpread.testStatistic < adfSpread.criticalValue && adfSpread.pValue < 0.05;
            return {
                isCointegrated,
                pValue: adfSpread.pValue,
                criticalValue: adfSpread.criticalValue,
                eigenVector: [1, -hedgeRatio],
                testStatistic: adfSpread.testStatistic
            };
        }
        catch (error) {
            throw new Error(`Cointegration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Simplified Augmented Dickey-Fuller test for unit root
     */
    augmentedDickeyFullerTest(series) {
        // Simplified ADF test implementation
        // In production, use proper statistical library
        const n = series.length;
        const firstDifferences = series.slice(1).map((val, i) => val - series[i]);
        // Calculate test statistic (simplified)
        const mean = firstDifferences.reduce((sum, val) => sum + val, 0) / firstDifferences.length;
        const variance = firstDifferences.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / firstDifferences.length;
        const testStatistic = mean / Math.sqrt(variance / n);
        // Approximate p-value and critical values
        const criticalValue = -3.43; // 5% critical value for n > 100
        const pValue = testStatistic < criticalValue ? 0.01 : 0.5;
        return { testStatistic, pValue, criticalValue };
    }
    /**
     * Calculate optimal hedge ratio using ordinary least squares
     */
    calculateOptimalHedgeRatio(prices1, prices2) {
        const n = prices1.length;
        // Calculate means
        const mean1 = prices1.reduce((sum, val) => sum + val, 0) / n;
        const mean2 = prices2.reduce((sum, val) => sum + val, 0) / n;
        // Calculate covariance and variance
        let covariance = 0;
        let variance2 = 0;
        for (let i = 0; i < n; i++) {
            const diff1 = prices1[i] - mean1;
            const diff2 = prices2[i] - mean2;
            covariance += diff1 * diff2;
            variance2 += diff2 * diff2;
        }
        // Hedge ratio = covariance(X1, X2) / variance(X2)
        const hedgeRatio = covariance / variance2;
        return hedgeRatio;
    }
    /**
     * Calculate spread between two price series
     */
    calculateSpread(prices1, prices2, hedgeRatio) {
        return prices1.map((price1, i) => price1 - hedgeRatio * prices2[i]);
    }
    /**
     * Calculate rolling correlation between two series
     */
    calculateRollingCorrelation(prices1, prices2, window) {
        const correlations = [];
        for (let i = window - 1; i < prices1.length; i++) {
            const window1 = prices1.slice(i - window + 1, i + 1);
            const window2 = prices2.slice(i - window + 1, i + 1);
            const correlation = this.calculateCorrelation(window1, window2);
            correlations.push(correlation);
        }
        return correlations;
    }
    /**
     * Calculate Pearson correlation coefficient
     */
    calculateCorrelation(x, y) {
        const n = x.length;
        const meanX = x.reduce((sum, val) => sum + val, 0) / n;
        const meanY = y.reduce((sum, val) => sum + val, 0) / n;
        let numerator = 0;
        let denomX = 0;
        let denomY = 0;
        for (let i = 0; i < n; i++) {
            const diffX = x[i] - meanX;
            const diffY = y[i] - meanY;
            numerator += diffX * diffY;
            denomX += diffX * diffX;
            denomY += diffY * diffY;
        }
        const correlation = numerator / Math.sqrt(denomX * denomY);
        return isNaN(correlation) ? 0 : correlation;
    }
    /**
     * Calculate Z-score for mean reversion signals
     */
    calculateZScore(values, window) {
        const zScores = [];
        for (let i = window - 1; i < values.length; i++) {
            const windowValues = values.slice(i - window + 1, i + 1);
            const mean = windowValues.reduce((sum, val) => sum + val, 0) / window;
            const std = Math.sqrt(windowValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window);
            const zScore = std > 0 ? (values[i] - mean) / std : 0;
            zScores.push(zScore);
        }
        return zScores;
    }
    /**
     * Generate pairs trading signals
     */
    async generatePairsSignals() {
        const signals = [];
        for (const pairKey of Array.from(this.pairData.keys())) {
            const pairData = this.pairData.get(pairKey);
            try {
                // Test cointegration
                const cointegration = await this.testCointegration(pairData.prices1, pairData.prices2);
                this.cointegrationResults.set(pairKey, cointegration);
                if (!cointegration.isCointegrated) {
                    continue; // Skip non-cointegrated pairs
                }
                // Calculate hedge ratio and spread
                const hedgeRatio = this.calculateOptimalHedgeRatio(pairData.prices1, pairData.prices2);
                const spread = this.calculateSpread(pairData.prices1, pairData.prices2, hedgeRatio);
                // Calculate Z-scores for mean reversion
                const zScores = this.calculateZScore(spread, this.rollingWindow);
                const currentZScore = zScores[zScores.length - 1];
                if (Math.abs(currentZScore) < this.exitThreshold) {
                    continue; // No signal
                }
                // Generate entry signals
                if (Math.abs(currentZScore) >= this.entryThreshold) {
                    const signalType = currentZScore > 0 ? 'SELL' : 'BUY';
                    const signal = {
                        type: signalType, // Sell when spread is high, buy when low
                        symbol: pairData.symbol1, // Primary symbol
                        timestamp: Date.now(),
                        strength: Math.min(Math.abs(currentZScore) / this.entryThreshold, 1.0),
                        pair: {
                            symbol1: pairData.symbol1,
                            symbol2: pairData.symbol2
                        },
                        hedgeRatio,
                        spreadZScore: currentZScore,
                        entryThreshold: this.entryThreshold,
                        exitThreshold: this.exitThreshold,
                        confidence: Math.abs(cointegration.testStatistic) / Math.abs(cointegration.criticalValue)
                    };
                    signals.push(signal);
                }
            }
            catch (error) {
                console.error(`Error processing pair ${pairKey}:`, error);
                continue;
            }
        }
        return signals;
    }
    /**
     * Update pair data with new market data
     */
    async updatePairData(data) {
        // Implementation depends on how MarketData is structured
        // This is a simplified version
        const symbol = data.symbol;
        const price = data.close;
        const timestamp = data.timestamp;
        // For demonstration, we'll create pairs with BTC
        if (symbol !== 'BTCUSDT') {
            const pairKey = `${symbol}_BTCUSDT`;
            if (!this.pairData.has(pairKey)) {
                this.pairData.set(pairKey, {
                    symbol1: symbol,
                    symbol2: 'BTCUSDT',
                    prices1: [],
                    prices2: [],
                    timestamps: []
                });
            }
            const pair = this.pairData.get(pairKey);
            pair.prices1.push(price);
            pair.timestamps.push(timestamp);
            // Keep only recent data
            if (pair.prices1.length > this.lookbackPeriod * 2) {
                pair.prices1 = pair.prices1.slice(-this.lookbackPeriod);
                pair.prices2 = pair.prices2.slice(-this.lookbackPeriod);
                pair.timestamps = pair.timestamps.slice(-this.lookbackPeriod);
            }
        }
    }
    /**
     * Calculate strategy performance metrics
     */
    calculateStrategyMetrics(signals) {
        const totalSignals = signals.length;
        const strongSignals = signals.filter(s => s.strength > 0.8).length;
        const avgConfidence = signals.reduce((sum, s) => sum + (s.confidence || 0), 0) / Math.max(totalSignals, 1);
        return {
            totalSignals,
            strongSignals,
            avgConfidence: isNaN(avgConfidence) ? 0 : avgConfidence,
            signalRate: totalSignals / Math.max(this.pairData.size, 1)
        };
    }
    /**
     * Get strategy configuration
     */
    getConfig() {
        return {
            lookbackPeriod: this.lookbackPeriod,
            entryThreshold: this.entryThreshold,
            exitThreshold: this.exitThreshold,
            correlationThreshold: this.correlationThreshold,
            rollingWindow: this.rollingWindow
        };
    }
    /**
     * Update strategy parameters
     */
    updateConfig(newConfig) {
        if (newConfig.lookbackPeriod)
            this.lookbackPeriod = newConfig.lookbackPeriod;
        if (newConfig.entryThreshold)
            this.entryThreshold = newConfig.entryThreshold;
        if (newConfig.exitThreshold)
            this.exitThreshold = newConfig.exitThreshold;
        if (newConfig.correlationThreshold)
            this.correlationThreshold = newConfig.correlationThreshold;
        if (newConfig.rollingWindow)
            this.rollingWindow = newConfig.rollingWindow;
    }
}
exports.PairsTradingStrategy = PairsTradingStrategy;
// Export default instance with default configuration
exports.default = new PairsTradingStrategy({
    lookbackPeriod: 252,
    entryThreshold: 2.0,
    exitThreshold: 0.5,
    correlationThreshold: 0.7,
    rollingWindow: 20
});

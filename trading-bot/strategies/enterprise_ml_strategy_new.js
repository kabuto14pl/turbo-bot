"use strict";
/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🔄 [DEVELOPMENT-VERSION]
 * Enterprise ML Strategy - New Development Version
 *
 * Experimental new version of ML strategy with Enterprise Infrastructure integration
 * Development version for testing new ML approaches and configurations
 * Work in progress - not production-ready
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnterpriseMLStrategy = void 0;
const enterprise_ml_integration_manager_1 = require("../../src/enterprise_ml_integration_manager");
class EnterpriseMLStrategy {
    constructor(logger, config) {
        this.lastSignal = null;
        this.signalHistory = [];
        this.logger = logger;
        this.mlManager = enterprise_ml_integration_manager_1.EnterpriseMLIntegrationManager.getInstance();
        this.config = {
            confidenceThreshold: 0.65,
            mlWeight: 0.7,
            technicalIndicatorWeight: 0.3,
            ensembleVoting: true,
            riskAdjustment: true,
            marketRegimeAdaptation: true,
            ...config
        };
    }
    async run(botState) {
        try {
            // 1. Extract market data from bot state
            const marketData = this.extractMarketData(botState);
            // 2. Get ML prediction
            const mlPrediction = await this.mlManager.performMLInference(marketData);
            // 3. Get technical analysis signals
            const technicalSignals = this.getTechnicalSignals(botState.indicators);
            // 4. Ensemble decision
            if (this.config.ensembleVoting) {
                const finalSignal = await this.makeEnsembleDecision(mlPrediction, technicalSignals, botState);
                if (finalSignal) {
                    // Apply risk adjustment
                    const adjustedSignal = this.applyRiskAdjustment(finalSignal, botState);
                    // Apply market regime adaptation
                    const adaptedSignal = this.adaptToMarketRegime(adjustedSignal, botState);
                    this.lastSignal = adaptedSignal;
                    this.signalHistory.push(adaptedSignal);
                    return [adaptedSignal];
                }
            }
            return [];
        }
        catch (error) {
            this.logger.error('[EnterpriseML] Strategy execution error:', error);
            return [];
        }
    }
    extractMarketData(botState) {
        // Get the latest candle data if available
        const candles = botState.candles || [];
        const latestCandle = candles[candles.length - 1];
        return {
            symbol: 'BTCUSDT', // Default symbol
            price: latestCandle?.close || botState.marketData?.lastPrice || 50000,
            volume: latestCandle?.volume || 0,
            timestamp: Date.now(),
            features: {
                rsi: botState.indicators?.m15?.rsi || 50,
                macd: botState.indicators?.m15?.macd?.histogram || 0,
                supertrend: botState.indicators?.m15?.supertrend?.direction === 'buy' ? 1 : -1
            }
        };
    }
    getTechnicalSignals(indicators) {
        // Use m15 timeframe indicators as default
        const m15Indicators = indicators?.m15;
        if (!m15Indicators) {
            return {
                signal: 'HOLD',
                confidence: 0.5,
                components: {}
            };
        }
        const rsi = m15Indicators.rsi || 50;
        let rsiSignal = 'HOLD';
        if (rsi < 30)
            rsiSignal = 'BUY';
        else if (rsi > 70)
            rsiSignal = 'SELL';
        const macdHistogram = m15Indicators.macd?.histogram || 0;
        let macdSignal = 'HOLD';
        if (macdHistogram > 0)
            macdSignal = 'BUY';
        else if (macdHistogram < 0)
            macdSignal = 'SELL';
        const supertrendDirection = m15Indicators.supertrend?.direction || 'neutral';
        let supertrendSignal = 'HOLD';
        if (supertrendDirection === 'buy')
            supertrendSignal = 'BUY';
        else if (supertrendDirection === 'sell')
            supertrendSignal = 'SELL';
        // Combine signals
        const buySignals = [rsiSignal, macdSignal, supertrendSignal].filter(s => s === 'BUY').length;
        const sellSignals = [rsiSignal, macdSignal, supertrendSignal].filter(s => s === 'SELL').length;
        let technicalSignal = 'HOLD';
        let technicalConfidence = 0.5;
        if (buySignals >= 2) {
            technicalSignal = 'BUY';
            technicalConfidence = Math.min(0.9, 0.5 + (buySignals * 0.15));
        }
        else if (sellSignals >= 2) {
            technicalSignal = 'SELL';
            technicalConfidence = Math.min(0.9, 0.5 + (sellSignals * 0.15));
        }
        return {
            signal: technicalSignal,
            confidence: technicalConfidence,
            components: {
                rsi: { signal: rsiSignal, value: rsi },
                macd: { signal: macdSignal, value: macdHistogram },
                supertrend: { signal: supertrendSignal, direction: supertrendDirection }
            }
        };
    }
    async makeEnsembleDecision(mlPrediction, technicalSignals, botState) {
        // Weighted ensemble decision
        const mlWeight = this.config.mlWeight;
        const techWeight = this.config.technicalIndicatorWeight;
        let finalSignal = 'HOLD';
        let finalConfidence = 0;
        // Convert ML signal to score
        let mlScore = 0;
        if (mlPrediction.signal === 'BUY')
            mlScore = 1;
        else if (mlPrediction.signal === 'SELL')
            mlScore = -1;
        // Convert technical signal to score
        let techScore = 0;
        if (technicalSignals.signal === 'BUY')
            techScore = 1;
        else if (technicalSignals.signal === 'SELL')
            techScore = -1;
        // Weighted ensemble score
        const ensembleScore = (mlScore * mlWeight) + (techScore * techWeight);
        // Decision thresholds
        const buyThreshold = 0.3;
        const sellThreshold = -0.3;
        if (ensembleScore > buyThreshold) {
            finalSignal = 'ENTER_LONG';
            finalConfidence = Math.min(0.9, (mlPrediction.confidence * mlWeight) + (technicalSignals.confidence * techWeight));
        }
        else if (ensembleScore < sellThreshold) {
            finalSignal = 'ENTER_SHORT';
            finalConfidence = Math.min(0.9, (mlPrediction.confidence * mlWeight) + (technicalSignals.confidence * techWeight));
        }
        else {
            // No strong signal
            return null;
        }
        // Get current price
        const candles = botState.candles || [];
        const latestCandle = candles[candles.length - 1];
        const currentPrice = latestCandle?.close || botState.marketData?.lastPrice || 50000;
        return {
            type: finalSignal,
            price: currentPrice,
            confidence: finalConfidence,
            indicators: {
                rsi: botState.indicators?.m15?.rsi || 50,
                macd: botState.indicators?.m15?.macd?.histogram || 0,
                supertrend: botState.indicators?.m15?.supertrend?.direction === 'buy' ? 1 : -1,
                mlScore: mlScore,
                techScore: techScore,
                ensembleScore: ensembleScore
            },
            metadata: {
                strategy: 'EnterpriseML',
                timeframe: '1m',
                regime: 'NORMAL'
            },
            size: this.calculatePositionSize(finalConfidence, botState)
        };
    }
    applyRiskAdjustment(signal, botState) {
        if (!this.config.riskAdjustment)
            return signal;
        // Adjust position size based on recent performance
        const recentSignals = this.signalHistory.slice(-10);
        const successRate = this.calculateSuccessRate(recentSignals);
        // Reduce size if recent performance is poor
        let sizeAdjustment = 1.0;
        if (successRate < 0.4) {
            sizeAdjustment = 0.5; // Reduce size by half
        }
        else if (successRate > 0.7) {
            sizeAdjustment = 1.2; // Increase size slightly
        }
        return {
            ...signal,
            size: (signal.size || 0.001) * sizeAdjustment,
            confidence: signal.confidence * (successRate > 0.5 ? 1.0 : 0.8)
        };
    }
    adaptToMarketRegime(signal, botState) {
        if (!this.config.marketRegimeAdaptation)
            return signal;
        // Simple volatility-based regime detection
        const candles = botState.candles || [];
        const recentCandles = candles.slice(-20);
        if (recentCandles.length < 5)
            return signal;
        const volatilities = recentCandles.map((c) => (c.high - c.low) / c.close);
        const avgVolatility = volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length;
        // High volatility regime - reduce confidence
        if (avgVolatility > 0.03) {
            return {
                ...signal,
                confidence: signal.confidence * 0.8,
                size: (signal.size || 0.001) * 0.7
            };
        }
        // Low volatility regime - maintain confidence
        return signal;
    }
    calculatePositionSize(confidence, botState) {
        // Base size adjusted by confidence
        const baseSize = 0.001; // 0.1% of portfolio
        const confidenceMultiplier = Math.max(0.5, Math.min(2.0, confidence * 2));
        return baseSize * confidenceMultiplier;
    }
    calculateSuccessRate(signals) {
        if (signals.length === 0)
            return 0.5;
        // Simple mock success rate calculation
        // In production, this would analyze actual trade outcomes
        const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
        return Math.max(0.2, Math.min(0.8, avgConfidence));
    }
    getStrategyName() {
        return 'EnterpriseML';
    }
    getConfiguration() {
        return { ...this.config };
    }
    updateConfiguration(config) {
        this.config = { ...this.config, ...config };
        this.logger.info('[EnterpriseML] Configuration updated:', config);
    }
    getPerformanceMetrics() {
        return {
            totalSignals: this.signalHistory.length,
            lastSignal: this.lastSignal,
            averageConfidence: this.signalHistory.length > 0
                ? this.signalHistory.reduce((sum, s) => sum + s.confidence, 0) / this.signalHistory.length
                : 0,
            config: this.config
        };
    }
}
exports.EnterpriseMLStrategy = EnterpriseMLStrategy;

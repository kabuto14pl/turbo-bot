"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseStrategyFixed = void 0;
const logger_1 = require("../../infrastructure/logging/logger");
class BaseStrategyFixed {
    constructor(name, description, defaultWeight, config, logger) {
        this.name = name;
        this.description = description;
        this.defaultWeight = defaultWeight;
        this.weight = defaultWeight;
        this.config = config;
        this.logger = logger || new logger_1.Logger();
    }
    setWeight(weight) {
        this.weight = Math.max(0, Math.min(1, weight));
    }
    getWeight() {
        return this.weight;
    }
    getConfig() {
        return { ...this.config };
    }
    /**
     * 📊 SENTIMENT DATA PROCESSING
     * Process sentiment data to enhance trading signals
     */
    processSentiment(state) {
        if (!state.sentiment) {
            return {
                sentimentMultiplier: 1.0,
                riskAdjustment: 1.0,
                signalConfidence: 0.5,
                shouldTrade: true
            };
        }
        const sentiment = state.sentiment;
        // Calculate sentiment multiplier based on overall sentiment and confidence
        const sentimentStrength = Math.abs(sentiment.overall) * sentiment.confidence;
        const sentimentMultiplier = 0.8 + (sentimentStrength * 0.4); // Range: 0.8 to 1.2
        // Risk adjustment based on sentiment confidence and risk level
        let riskAdjustment = 1.0;
        switch (sentiment.riskLevel) {
            case 'low':
                riskAdjustment = 1.2; // Increase position size
                break;
            case 'medium':
                riskAdjustment = 1.0; // Normal position size
                break;
            case 'high':
                riskAdjustment = 0.7; // Reduce position size
                break;
        }
        // Signal confidence enhancement
        const signalConfidence = Math.min(1.0, 0.5 + (sentiment.confidence * 0.3) + (sentiment.signalConfidence * 0.2));
        // Trading decision based on sentiment signal
        const shouldTrade = sentiment.tradingSignal !== 'hold' && sentiment.confidence > 0.3;
        return { sentimentMultiplier, riskAdjustment, signalConfidence, shouldTrade };
    }
    /**
     * 🎯 ENHANCED SIGNAL GENERATION WITH SENTIMENT
     * Apply sentiment weighting to trading signals
     */
    enhanceSignalWithSentiment(baseSignal, state) {
        const sentimentData = this.processSentiment(state);
        if (!state.sentiment) {
            return {
                type: baseSignal.type,
                price: baseSignal.price,
                confidence: baseSignal.confidence,
                stopLoss: baseSignal.stopLoss,
                takeProfit: baseSignal.takeProfit,
                size: baseSignal.size,
                indicators: baseSignal.indicators,
                sentiment: {
                    influenced: false,
                    multiplier: 1.0,
                    riskAdjustment: 1.0,
                    conflictDetected: false
                }
            };
        }
        // Apply sentiment multiplier to confidence
        let enhancedConfidence = Math.min(1.0, baseSignal.confidence * sentimentData.sentimentMultiplier * sentimentData.signalConfidence);
        // Adjust size based on sentiment risk assessment
        const adjustedSize = baseSignal.size ? baseSignal.size * sentimentData.riskAdjustment : undefined;
        // Check for sentiment conflicts
        let conflictDetected = false;
        // Override signal type based on strong sentiment signals
        if (state.sentiment.tradingSignal === 'strong_buy' && baseSignal.type === 'ENTER_LONG') {
            enhancedConfidence *= 1.2; // Boost confidence for aligned signals
        }
        else if (state.sentiment.tradingSignal === 'strong_sell' && baseSignal.type === 'ENTER_SHORT') {
            enhancedConfidence *= 1.2;
        }
        else if ((state.sentiment.tradingSignal === 'sell' || state.sentiment.tradingSignal === 'strong_sell') &&
            (baseSignal.type === 'ENTER_LONG')) {
            enhancedConfidence *= 0.7; // Reduce confidence for conflicting signals
            conflictDetected = true;
        }
        else if ((state.sentiment.tradingSignal === 'buy' || state.sentiment.tradingSignal === 'strong_buy') &&
            (baseSignal.type === 'ENTER_SHORT')) {
            enhancedConfidence *= 0.7;
            conflictDetected = true;
        }
        return {
            type: baseSignal.type,
            price: baseSignal.price,
            confidence: Math.max(0.1, Math.min(1.0, enhancedConfidence)),
            stopLoss: baseSignal.stopLoss,
            takeProfit: baseSignal.takeProfit,
            size: adjustedSize,
            indicators: baseSignal.indicators,
            sentiment: {
                influenced: true,
                multiplier: sentimentData.sentimentMultiplier,
                riskAdjustment: sentimentData.riskAdjustment,
                conflictDetected
            }
        };
    }
    /**
     * 🚀 SENTIMENT-ENHANCED STRATEGY EXECUTION
     * Main strategy execution with sentiment integration
     */
    async executeWithSentiment(state) {
        if (!this.validateState(state)) {
            throw new Error('Invalid state for strategy execution');
        }
        // Get base trading signal from legacy run method
        const baseSignals = await this.run(state);
        // Take the first signal (most strategies return single signal in array)
        const baseSignal = Array.isArray(baseSignals) && baseSignals.length > 0
            ? baseSignals[0]
            : null;
        // If no signal, return HOLD
        if (!baseSignal) {
            return {
                type: 'HOLD',
                confidence: 0.5,
                reason: 'No signal generated'
            };
        }
        // Enhance signal with sentiment analysis
        const enhancedSignal = this.enhanceSignalWithSentiment(baseSignal, state);
        // Check if sentiment allows trading
        const sentimentData = this.processSentiment(state);
        if (!sentimentData.shouldTrade && enhancedSignal.type !== 'EXIT_LONG' && enhancedSignal.type !== 'EXIT_SHORT') {
            return {
                type: 'HOLD',
                confidence: 0.5,
                reason: `Sentiment analysis suggests holding: ${state.sentiment?.tradingSignal || 'low confidence'}`
            };
        }
        return enhancedSignal;
    }
    // Strategy interface implementation
    generateSignal(state) {
        return this.run(state);
    }
    validateConfig() {
        return true;
    }
    validateState(state) {
        if (!state || !state.prices || !state.indicators) {
            this.logger.error('Invalid state: missing required data structure');
            return false;
        }
        if (!state.prices.m15 || !state.indicators.m15) {
            this.logger.error('Invalid state: missing m15 timeframe data');
            return false;
        }
        return true;
    }
    getRequiredIndicators() {
        return ['rsi', 'atr', 'ema_9', 'ema_21', 'ema_50'];
    }
    getRequiredTimeframes() {
        return ['m15', 'h1', 'h4'];
    }
    getName() {
        return this.name;
    }
}
exports.BaseStrategyFixed = BaseStrategyFixed;

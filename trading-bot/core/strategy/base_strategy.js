"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseStrategy = void 0;
class BaseStrategy {
    constructor(name, description, defaultWeight, config, logger) {
        this.name = name;
        this.description = description;
        this.defaultWeight = defaultWeight;
        this.weight = defaultWeight;
        this.config = config;
        this.logger = logger;
    }
    setWeight(weight) {
        this.weight = weight;
    }
    getWeight() {
        return this.weight;
    }
    generateSignal(state) {
        // Default implementation delegates to run method
        return this.run(state);
    }
    validateConfig() {
        return true;
    }
    getRequiredIndicators() {
        return Object.keys(this.config.indicators || {});
    }
    getRequiredTimeframes() {
        return this.config.timeframes;
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
    /**
     * 🚀 Record sentiment-enhanced trade for performance tracking
     */
    recordSentimentTrade(signal, state, performanceTracker // PerformanceTracker instance
    ) {
        if (!performanceTracker)
            return;
        const sentimentData = this.processSentiment(state);
        // If trade was blocked by sentiment
        if (!sentimentData.shouldTrade && signal.type !== 'HOLD') {
            performanceTracker.recordBlockedTrade('BTCUSDT', // Default symbol, could be passed as parameter
            signal.type === 'ENTER_LONG' || signal.type === 'EXIT_SHORT' ? 'BUY' : 'SELL', signal.size || 0.1, state.prices.m15?.close || 0, state.sentiment?.overall || 0.5, state.sentiment?.tradingSignal || 'low confidence', this.name);
            this.logger.info(`🛡️ Sentiment blocked ${signal.type} signal - recorded for tracking`);
        }
    }
    /**
     * 🚀 Enhanced execution with performance tracking integration
     */
    async executeWithSentimentTracking(state, performanceTracker) {
        const signal = await this.executeWithSentiment(state);
        // Record sentiment trade data for performance analysis
        this.recordSentimentTrade(signal, state, performanceTracker);
        return signal;
    }
    /**
     * 🎯 LEGACY RUN METHOD
     * Each strategy implements its own signal generation logic
     */
    // abstract run(state: BotState): Promise<StrategySignal[]>;
    validateState(state) {
        // Sprawdź czy wszystkie wymagane timeframe'y są dostępne
        for (const timeframe of this.getRequiredTimeframes()) {
            if (!state.prices[timeframe]) {
                this.logger.warn(`Missing price data for timeframe ${timeframe}`);
                return false;
            }
            if (!state.indicators[timeframe]) {
                this.logger.warn(`Missing indicators for timeframe ${timeframe}`);
                return false;
            }
        }
        // Sprawdź czy wszystkie wymagane wskaźniki są dostępne
        const requiredIndicators = this.getRequiredIndicators();
        const m15Indicators = state.indicators.m15;
        for (const indicator of requiredIndicators) {
            if (!this.hasIndicator(m15Indicators, indicator)) {
                this.logger.warn(`Missing indicator ${indicator}`);
                return false;
            }
        }
        return true;
    }
    hasIndicator(indicators, indicator) {
        switch (indicator) {
            case 'rsi': return typeof indicators.rsi === 'number';
            case 'adx': return typeof indicators.adx === 'number';
            case 'atr': return typeof indicators.atr === 'number';
            case 'ema': return typeof indicators.ema_9 === 'number' &&
                typeof indicators.ema_21 === 'number' &&
                typeof indicators.ema_50 === 'number' &&
                typeof indicators.ema_200 === 'number';
            case 'macd': return indicators.macd &&
                typeof indicators.macd.macd === 'number' &&
                typeof indicators.macd.signal === 'number' &&
                typeof indicators.macd.histogram === 'number';
            case 'supertrend': return indicators.supertrend &&
                typeof indicators.supertrend.value === 'number' &&
                typeof indicators.supertrend.direction === 'string';
            case 'roc': return typeof indicators.roc === 'number';
            default: return false;
        }
    }
    calculateConfidence(primarySignal, secondarySignal, volatility, trend) {
        // Normalizuj sygnały do zakresu 0-1
        const normalizedPrimary = Math.min(Math.abs(primarySignal), 1);
        const normalizedSecondary = Math.min(Math.abs(secondarySignal), 1);
        // Wagi dla różnych komponentów
        const weights = {
            primary: 0.4,
            secondary: 0.3,
            volatility: 0.15,
            trend: 0.15
        };
        // Oblicz ważoną sumę
        const confidence = (normalizedPrimary * weights.primary +
            normalizedSecondary * weights.secondary +
            (1 - volatility) * weights.volatility +
            Math.abs(trend) * weights.trend);
        // Zwróć wartość z zakresu 0-1
        return Math.min(Math.max(confidence, 0), 1);
    }
    createSignal(type, price, confidence, state, indicators = {}) {
        return {
            type,
            price,
            confidence,
            indicators,
            metadata: {
                strategy: this.name,
                timeframe: state.marketContext?.timeframe || 'm15',
                regime: state.regime
            }
        };
    }
    shouldExitPosition(position, state, stopLoss, takeProfit) {
        const currentPrice = state.marketData.lastPrice;
        if (position.direction === 'long') {
            // Wyjście z long pozycji
            if (currentPrice <= stopLoss) {
                this.logger.info('Exiting long position - Stop Loss hit');
                return true;
            }
            if (currentPrice >= takeProfit) {
                this.logger.info('Exiting long position - Take Profit hit');
                return true;
            }
        }
        else {
            // Wyjście z short pozycji
            if (currentPrice >= stopLoss) {
                this.logger.info('Exiting short position - Stop Loss hit');
                return true;
            }
            if (currentPrice <= takeProfit) {
                this.logger.info('Exiting short position - Take Profit hit');
                return true;
            }
        }
        return false;
    }
}
exports.BaseStrategy = BaseStrategy;

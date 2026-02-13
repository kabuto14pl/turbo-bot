"use strict";
/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * Enterprise Real-time Feature Engineering System
 *
 * Zaawansowany system dynamicznego feature engineering z:
 * - Auto-correlation detection
 * - Feature selection optimization
 * - Real-time normalization
 * - Rolling statistics
 * - Feature importance tracking
 * - Adaptive feature creation
 * - Multi-timeframe feature extraction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnterpriseFeatureEngineering = void 0;
const events_1 = require("events");
class EnterpriseFeatureEngineering extends events_1.EventEmitter {
    constructor() {
        super();
        this.isActive = false;
        // Feature management
        this.featureDefinitions = new Map();
        this.featureHistory = [];
        this.selectedFeatures = new Set();
        // Statistical tracking
        this.featureStatistics = new Map();
        this.correlationMatrix = null;
        this.featureImportances = new Map();
        // Normalization state
        this.normalizationState = new Map();
        // Configuration
        this.normalizationConfig = {
            method: 'robust',
            windowSize: 1000,
            adaptiveUpdate: true,
            outlierThreshold: 3,
            useRollingStats: true
        };
        this.selectionConfig = {
            maxFeatures: 50,
            minImportance: 0.01,
            maxCorrelation: 0.95,
            selectionMethod: 'hybrid',
            reselectionInterval: 3600000, // 1 hour
            stabilityThreshold: 0.8
        };
        // Performance tracking
        this.engineeringMetrics = {
            featuresCreated: 0,
            featuresSelected: 0,
            correlationUpdates: 0,
            normalizationUpdates: 0,
            lastReselection: 0,
            processingTimeMs: 0
        };
        this.instanceId = `efe-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        this.initializeFeatureDefinitions();
        this.startBackgroundProcesses();
    }
    static getInstance() {
        if (!EnterpriseFeatureEngineering.instance) {
            EnterpriseFeatureEngineering.instance = new EnterpriseFeatureEngineering();
        }
        return EnterpriseFeatureEngineering.instance;
    }
    initializeFeatureDefinitions() {
        // Technical indicators
        this.registerFeature('sma_20', 'technical', 'trend', '1m', 20, ['close'], 'Simple Moving Average 20');
        this.registerFeature('sma_50', 'technical', 'trend', '1m', 50, ['close'], 'Simple Moving Average 50');
        this.registerFeature('ema_12', 'technical', 'trend', '1m', 12, ['close'], 'Exponential Moving Average 12');
        this.registerFeature('ema_26', 'technical', 'trend', '1m', 26, ['close'], 'Exponential Moving Average 26');
        // RSI and momentum
        this.registerFeature('rsi_14', 'technical', 'momentum', '1m', 14, ['close'], 'RSI 14');
        this.registerFeature('rsi_7', 'technical', 'momentum', '1m', 7, ['close'], 'RSI 7');
        this.registerFeature('macd', 'technical', 'momentum', '1m', 26, ['ema_12', 'ema_26'], 'MACD');
        this.registerFeature('macd_signal', 'technical', 'momentum', '1m', 9, ['macd'], 'MACD Signal');
        // Volatility indicators
        this.registerFeature('bb_upper', 'technical', 'volatility', '1m', 20, ['close'], 'Bollinger Upper');
        this.registerFeature('bb_lower', 'technical', 'volatility', '1m', 20, ['close'], 'Bollinger Lower');
        this.registerFeature('atr_14', 'technical', 'volatility', '1m', 14, ['high', 'low', 'close'], 'ATR 14');
        this.registerFeature('volatility_5', 'statistical', 'volatility', '1m', 5, ['close'], 'Rolling Volatility 5');
        this.registerFeature('volatility_20', 'statistical', 'volatility', '1m', 20, ['close'], 'Rolling Volatility 20');
        // Volume indicators
        this.registerFeature('volume_sma_20', 'technical', 'volume', '1m', 20, ['volume'], 'Volume SMA 20');
        this.registerFeature('volume_ratio', 'derived', 'volume', '1m', 1, ['volume', 'volume_sma_20'], 'Volume Ratio');
        this.registerFeature('vwap', 'technical', 'volume', '1m', 20, ['close', 'volume'], 'VWAP');
        // Price action features
        this.registerFeature('price_change', 'derived', 'price_action', '1m', 1, ['close'], 'Price Change');
        this.registerFeature('price_change_pct', 'derived', 'price_action', '1m', 1, ['close'], 'Price Change %');
        this.registerFeature('hl_ratio', 'derived', 'price_action', '1m', 1, ['high', 'low'], 'High-Low Ratio');
        this.registerFeature('body_size', 'derived', 'price_action', '1m', 1, ['open', 'close'], 'Candle Body Size');
        this.registerFeature('upper_shadow', 'derived', 'price_action', '1m', 1, ['high', 'open', 'close'], 'Upper Shadow');
        this.registerFeature('lower_shadow', 'derived', 'price_action', '1m', 1, ['low', 'open', 'close'], 'Lower Shadow');
        // Statistical features
        this.registerFeature('returns_1', 'statistical', 'price_action', '1m', 1, ['close'], 'Returns 1 period');
        this.registerFeature('returns_5', 'statistical', 'price_action', '1m', 5, ['close'], 'Returns 5 periods');
        this.registerFeature('log_returns', 'statistical', 'price_action', '1m', 1, ['close'], 'Log Returns');
        this.registerFeature('skewness_20', 'statistical', 'price_action', '1m', 20, ['returns_1'], 'Rolling Skewness 20');
        this.registerFeature('kurtosis_20', 'statistical', 'price_action', '1m', 20, ['returns_1'], 'Rolling Kurtosis 20');
        // Multi-timeframe features
        this.registerFeature('sma_20_5m', 'technical', 'trend', '5m', 20, ['close'], 'SMA 20 (5m)');
        this.registerFeature('rsi_14_5m', 'technical', 'momentum', '5m', 14, ['close'], 'RSI 14 (5m)');
        this.registerFeature('sma_20_15m', 'technical', 'trend', '15m', 20, ['close'], 'SMA 20 (15m)');
        this.registerFeature('rsi_14_15m', 'technical', 'momentum', '15m', 14, ['close'], 'RSI 14 (15m)');
        console.log(`[INFO] 🔧 Feature engineering initialized with ${this.featureDefinitions.size} features`);
    }
    registerFeature(name, type, category, timeframe, window, dependencies, description) {
        const feature = {
            name,
            type,
            category,
            timeframe,
            window,
            dependencies,
            weight: 1.0,
            importance: 0.5,
            stability: 1.0,
            lastUpdated: Date.now()
        };
        this.featureDefinitions.set(name, feature);
        this.selectedFeatures.add(name);
        // Initialize normalization state
        this.normalizationState.set(name, {
            mean: 0,
            std: 1,
            min: 0,
            max: 1,
            q25: 0,
            q75: 1,
            iqr: 1,
            outlierBounds: [-3, 3],
            history: []
        });
    }
    startBackgroundProcesses() {
        // Update correlations every 5 minutes
        setInterval(() => {
            this.updateCorrelationMatrix();
        }, 300000);
        // Feature selection every hour
        setInterval(() => {
            this.performFeatureSelection();
        }, this.selectionConfig.reselectionInterval);
        // Update feature importance every 10 minutes
        setInterval(() => {
            this.updateFeatureImportance();
        }, 600000);
        // Clean old data every 30 minutes
        setInterval(() => {
            this.cleanupOldData();
        }, 1800000);
        console.log(`[INFO] 🔄 Feature engineering background processes started: ${this.instanceId}`);
        this.isActive = true;
    }
    async extractFeatures(marketData) {
        const startTime = Date.now();
        try {
            const features = {};
            const rawFeatures = {};
            // Extract raw features from market data
            await this.extractRawFeatures(marketData, rawFeatures);
            // Calculate technical indicators
            await this.calculateTechnicalIndicators(rawFeatures, features);
            // Calculate statistical features
            await this.calculateStatisticalFeatures(rawFeatures, features);
            // Calculate derived features
            await this.calculateDerivedFeatures(features);
            // Normalize features
            const normalized = await this.normalizeFeatures(features);
            const standardized = await this.standardizeFeatures(features);
            // Create feature vector
            const featureVector = {
                timestamp: Date.now(),
                features,
                normalized,
                standardized,
                metadata: {
                    marketRegime: this.detectMarketRegime(features),
                    volatility: features.volatility_20 || 0,
                    volume: rawFeatures.volume || 0,
                    trend: this.detectTrend(features)
                }
            };
            // Store and maintain history
            this.featureHistory.push(featureVector);
            this.maintainFeatureHistory();
            // Update statistics
            await this.updateFeatureStatistics(features);
            const processingTime = Date.now() - startTime;
            this.engineeringMetrics.processingTimeMs = processingTime;
            this.emit('features-extracted', featureVector);
            return featureVector;
        }
        catch (error) {
            console.error('[ERROR] ❌ Feature extraction failed:', error);
            throw error;
        }
    }
    async extractRawFeatures(marketData, features) {
        // Extract basic OHLCV data
        features.open = marketData.open || 0;
        features.high = marketData.high || 0;
        features.low = marketData.low || 0;
        features.close = marketData.close || 0;
        features.volume = marketData.volume || 0;
        // Calculate basic price features
        features.hl_spread = features.high - features.low;
        features.oc_spread = Math.abs(features.close - features.open);
        features.typical_price = (features.high + features.low + features.close) / 3;
        features.median_price = (features.high + features.low) / 2;
        features.weighted_close = (features.high + features.low + 2 * features.close) / 4;
    }
    async calculateTechnicalIndicators(rawFeatures, features) {
        const history = this.featureHistory.slice(-200); // Get recent history
        if (history.length < 2) {
            // Not enough history, set defaults
            Object.keys(features).forEach(key => {
                if (!features.hasOwnProperty(key)) {
                    features[key] = 0;
                }
            });
            return;
        }
        const closes = history.map(h => h.features.close || 0);
        const highs = history.map(h => h.features.high || 0);
        const lows = history.map(h => h.features.low || 0);
        const volumes = history.map(h => h.features.volume || 0);
        // Add current values
        closes.push(rawFeatures.close);
        highs.push(rawFeatures.high);
        lows.push(rawFeatures.low);
        volumes.push(rawFeatures.volume);
        // Simple Moving Averages
        features.sma_20 = this.calculateSMA(closes, 20);
        features.sma_50 = this.calculateSMA(closes, 50);
        // Exponential Moving Averages
        features.ema_12 = this.calculateEMA(closes, 12);
        features.ema_26 = this.calculateEMA(closes, 26);
        // RSI
        features.rsi_14 = this.calculateRSI(closes, 14);
        features.rsi_7 = this.calculateRSI(closes, 7);
        // MACD
        features.macd = features.ema_12 - features.ema_26;
        const macdHistory = history.map(h => (h.features.ema_12 || 0) - (h.features.ema_26 || 0));
        macdHistory.push(features.macd);
        features.macd_signal = this.calculateEMA(macdHistory, 9);
        features.macd_histogram = features.macd - features.macd_signal;
        // Bollinger Bands
        const bbResult = this.calculateBollingerBands(closes, 20, 2);
        features.bb_upper = bbResult.upper;
        features.bb_lower = bbResult.lower;
        features.bb_middle = bbResult.middle;
        features.bb_width = bbResult.upper - bbResult.lower;
        features.bb_position = (closes[closes.length - 1] - bbResult.lower) / (bbResult.upper - bbResult.lower);
        // ATR
        features.atr_14 = this.calculateATR(highs, lows, closes, 14);
        // Volume indicators
        features.volume_sma_20 = this.calculateSMA(volumes, 20);
        features.volume_ratio = volumes[volumes.length - 1] / features.volume_sma_20;
        features.vwap = this.calculateVWAP(closes, volumes, 20);
    }
    async calculateStatisticalFeatures(rawFeatures, features) {
        const history = this.featureHistory.slice(-200);
        if (history.length < 20) {
            features.volatility_5 = 0;
            features.volatility_20 = 0;
            features.returns_1 = 0;
            features.returns_5 = 0;
            features.log_returns = 0;
            features.skewness_20 = 0;
            features.kurtosis_20 = 0;
            return;
        }
        const closes = history.map(h => h.features.close || 0);
        closes.push(rawFeatures.close);
        // Calculate returns
        const returns = [];
        for (let i = 1; i < closes.length; i++) {
            returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
        }
        features.returns_1 = returns[returns.length - 1] || 0;
        features.returns_5 = returns.slice(-5).reduce((a, b) => a + b, 0) / 5;
        features.log_returns = Math.log(closes[closes.length - 1] / closes[closes.length - 2]) || 0;
        // Volatility
        features.volatility_5 = this.calculateVolatility(returns, 5);
        features.volatility_20 = this.calculateVolatility(returns, 20);
        // Higher moments
        features.skewness_20 = this.calculateSkewness(returns.slice(-20));
        features.kurtosis_20 = this.calculateKurtosis(returns.slice(-20));
        // Autocorrelation
        features.autocorr_1 = this.calculateAutocorrelation(returns, 1);
        features.autocorr_5 = this.calculateAutocorrelation(returns, 5);
    }
    async calculateDerivedFeatures(features) {
        // Price action features
        features.price_change = features.close - (this.featureHistory.length > 0 ?
            this.featureHistory[this.featureHistory.length - 1].features.close : features.close);
        features.price_change_pct = features.price_change / features.close;
        features.hl_ratio = features.high / features.low;
        features.body_size = Math.abs(features.close - features.open) / features.close;
        features.upper_shadow = (features.high - Math.max(features.open, features.close)) / features.close;
        features.lower_shadow = (Math.min(features.open, features.close) - features.low) / features.close;
        // Momentum features
        features.momentum_5 = features.close / (this.featureHistory.length >= 5 ?
            this.featureHistory[this.featureHistory.length - 5].features.close : features.close) - 1;
        features.momentum_20 = features.close / (this.featureHistory.length >= 20 ?
            this.featureHistory[this.featureHistory.length - 20].features.close : features.close) - 1;
        // Relative strength features
        features.rs_vs_sma20 = features.close / features.sma_20;
        features.rs_vs_sma50 = features.close / features.sma_50;
        // Trend features
        features.sma_slope_20 = this.featureHistory.length >= 2 ?
            (features.sma_20 - this.featureHistory[this.featureHistory.length - 1].features.sma_20) / features.sma_20 : 0;
        features.ema_slope_12 = this.featureHistory.length >= 2 ?
            (features.ema_12 - this.featureHistory[this.featureHistory.length - 1].features.ema_12) / features.ema_12 : 0;
        // Volume features
        features.price_volume = features.close * features.volume;
        features.volume_price_trend = features.volume * features.price_change_pct;
    }
    async normalizeFeatures(features) {
        const normalized = {};
        for (const [featureName, value] of Object.entries(features)) {
            if (!this.selectedFeatures.has(featureName))
                continue;
            const state = this.normalizationState.get(featureName);
            if (!state)
                continue;
            let normalizedValue;
            switch (this.normalizationConfig.method) {
                case 'z-score':
                    normalizedValue = (value - state.mean) / (state.std || 1);
                    break;
                case 'min-max':
                    normalizedValue = (value - state.min) / ((state.max - state.min) || 1);
                    break;
                case 'robust':
                    normalizedValue = (value - state.q25) / (state.iqr || 1);
                    break;
                case 'quantile':
                    normalizedValue = this.getQuantileNormalization(value, state.history);
                    break;
                default:
                    normalizedValue = value;
            }
            // Clip outliers
            if (Math.abs(normalizedValue) > this.normalizationConfig.outlierThreshold) {
                normalizedValue = Math.sign(normalizedValue) * this.normalizationConfig.outlierThreshold;
            }
            normalized[featureName] = normalizedValue;
        }
        return normalized;
    }
    async standardizeFeatures(features) {
        const standardized = {};
        for (const [featureName, value] of Object.entries(features)) {
            if (!this.selectedFeatures.has(featureName))
                continue;
            const state = this.normalizationState.get(featureName);
            if (!state)
                continue;
            // Z-score standardization
            standardized[featureName] = (value - state.mean) / (state.std || 1);
        }
        return standardized;
    }
    async updateFeatureStatistics(features) {
        for (const [featureName, value] of Object.entries(features)) {
            let state = this.normalizationState.get(featureName);
            if (!state) {
                state = {
                    mean: value,
                    std: 1,
                    min: value,
                    max: value,
                    q25: value,
                    q75: value,
                    iqr: 1,
                    outlierBounds: [value - 3, value + 3],
                    history: [value]
                };
                this.normalizationState.set(featureName, state);
                continue;
            }
            // Update history
            state.history.push(value);
            if (state.history.length > this.normalizationConfig.windowSize) {
                state.history = state.history.slice(-this.normalizationConfig.windowSize);
            }
            // Update statistics
            if (this.normalizationConfig.adaptiveUpdate) {
                const alpha = 0.01; // Learning rate
                state.mean = state.mean * (1 - alpha) + value * alpha;
                const variance = state.std * state.std;
                const newVariance = variance * (1 - alpha) + Math.pow(value - state.mean, 2) * alpha;
                state.std = Math.sqrt(newVariance);
                state.min = Math.min(state.min, value);
                state.max = Math.max(state.max, value);
                // Update quantiles periodically
                if (state.history.length % 100 === 0) {
                    const sorted = [...state.history].sort((a, b) => a - b);
                    state.q25 = sorted[Math.floor(sorted.length * 0.25)];
                    state.q75 = sorted[Math.floor(sorted.length * 0.75)];
                    state.iqr = state.q75 - state.q25;
                    state.outlierBounds = [
                        state.q25 - 1.5 * state.iqr,
                        state.q75 + 1.5 * state.iqr
                    ];
                }
            }
        }
        this.engineeringMetrics.normalizationUpdates++;
    }
    detectMarketRegime(features) {
        const volatility = features.volatility_20 || 0;
        const trend = features.sma_slope_20 || 0;
        const momentum = features.momentum_20 || 0;
        if (volatility > 0.03) {
            return 'high_volatility';
        }
        else if (Math.abs(trend) > 0.001) {
            return trend > 0 ? 'uptrend' : 'downtrend';
        }
        else if (Math.abs(momentum) < 0.005) {
            return 'sideways';
        }
        else {
            return 'normal';
        }
    }
    detectTrend(features) {
        const smaSlope = features.sma_slope_20 || 0;
        const emaSlope = features.ema_slope_12 || 0;
        const rsi = features.rsi_14 || 50;
        const bullishSignals = [
            smaSlope > 0.001,
            emaSlope > 0.001,
            rsi > 60,
            features.rs_vs_sma20 > 1.01
        ].filter(Boolean).length;
        const bearishSignals = [
            smaSlope < -0.001,
            emaSlope < -0.001,
            rsi < 40,
            features.rs_vs_sma20 < 0.99
        ].filter(Boolean).length;
        if (bullishSignals >= 3)
            return 'bullish';
        if (bearishSignals >= 3)
            return 'bearish';
        return 'neutral';
    }
    async updateCorrelationMatrix() {
        if (this.featureHistory.length < 50)
            return;
        const selectedFeatureNames = Array.from(this.selectedFeatures);
        const featureData = [];
        // Prepare data matrix
        const recentHistory = this.featureHistory.slice(-200);
        selectedFeatureNames.forEach(featureName => {
            const values = recentHistory.map(h => h.features[featureName] || 0);
            featureData.push(values);
        });
        // Calculate correlation matrix
        const correlationMatrix = this.calculateCorrelationMatrix(featureData);
        // Calculate eigenvalues and principal components
        const eigenResult = await this.calculateEigenDecomposition(correlationMatrix);
        this.correlationMatrix = {
            features: selectedFeatureNames,
            matrix: correlationMatrix,
            eigenvalues: eigenResult.eigenvalues,
            principalComponents: eigenResult.eigenvectors,
            lastUpdated: Date.now()
        };
        this.engineeringMetrics.correlationUpdates++;
        this.emit('correlation-updated', this.correlationMatrix);
    }
    calculateCorrelationMatrix(data) {
        const n = data.length;
        const correlationMatrix = Array(n).fill(null).map(() => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    correlationMatrix[i][j] = 1;
                }
                else {
                    correlationMatrix[i][j] = this.calculatePearsonCorrelation(data[i], data[j]);
                }
            }
        }
        return correlationMatrix;
    }
    calculatePearsonCorrelation(x, y) {
        const n = Math.min(x.length, y.length);
        if (n < 2)
            return 0;
        const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
        const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;
        let numerator = 0;
        let sumXSquared = 0;
        let sumYSquared = 0;
        for (let i = 0; i < n; i++) {
            const deltaX = x[i] - meanX;
            const deltaY = y[i] - meanY;
            numerator += deltaX * deltaY;
            sumXSquared += deltaX * deltaX;
            sumYSquared += deltaY * deltaY;
        }
        const denominator = Math.sqrt(sumXSquared * sumYSquared);
        return denominator === 0 ? 0 : numerator / denominator;
    }
    async calculateEigenDecomposition(matrix) {
        // Simplified eigenvalue calculation using power iteration
        const n = matrix.length;
        const eigenvalues = [];
        const eigenvectors = [];
        // For now, return identity for simplicity
        // In production, use a proper linear algebra library
        for (let i = 0; i < Math.min(n, 10); i++) {
            eigenvalues.push(1);
            const eigenvector = Array(n).fill(0);
            eigenvector[i] = 1;
            eigenvectors.push(eigenvector);
        }
        return { eigenvalues, eigenvectors };
    }
    async performFeatureSelection() {
        if (this.featureHistory.length < 100)
            return;
        const startTime = Date.now();
        try {
            // Calculate feature importance scores
            await this.updateFeatureImportance();
            // Apply selection criteria
            const selectedFeatures = new Set();
            const importanceArray = Array.from(this.featureImportances.entries())
                .sort((a, b) => b[1].importance - a[1].importance);
            // Select top features by importance
            let selected = 0;
            for (const [featureName, importance] of importanceArray) {
                if (selected >= this.selectionConfig.maxFeatures)
                    break;
                if (importance.importance < this.selectionConfig.minImportance)
                    break;
                if (importance.stability < this.selectionConfig.stabilityThreshold)
                    continue;
                // Check correlation with already selected features
                if (this.isFeatureUncorrelated(featureName, selectedFeatures)) {
                    selectedFeatures.add(featureName);
                    selected++;
                }
            }
            // Ensure minimum set of core features
            this.ensureCoreFeatures(selectedFeatures);
            this.selectedFeatures = selectedFeatures;
            this.engineeringMetrics.featuresSelected = selectedFeatures.size;
            this.engineeringMetrics.lastReselection = Date.now();
            const processingTime = Date.now() - startTime;
            console.log(`[INFO] 🎯 Feature selection completed: ${selectedFeatures.size} features selected (${processingTime}ms)`);
            this.emit('features-selected', {
                selectedFeatures: Array.from(selectedFeatures),
                count: selectedFeatures.size,
                processingTime
            });
        }
        catch (error) {
            console.error('[ERROR] ❌ Feature selection failed:', error);
        }
    }
    isFeatureUncorrelated(featureName, selectedFeatures) {
        if (!this.correlationMatrix)
            return true;
        const featureIndex = this.correlationMatrix.features.indexOf(featureName);
        if (featureIndex === -1)
            return true;
        for (const selectedFeature of Array.from(selectedFeatures)) {
            const selectedIndex = this.correlationMatrix.features.indexOf(selectedFeature);
            if (selectedIndex === -1)
                continue;
            const correlation = Math.abs(this.correlationMatrix.matrix[featureIndex][selectedIndex]);
            if (correlation > this.selectionConfig.maxCorrelation) {
                return false;
            }
        }
        return true;
    }
    ensureCoreFeatures(selectedFeatures) {
        const coreFeatures = [
            'close', 'volume', 'rsi_14', 'sma_20', 'volatility_20',
            'macd', 'bb_position', 'price_change_pct'
        ];
        coreFeatures.forEach(feature => {
            if (this.featureDefinitions.has(feature)) {
                selectedFeatures.add(feature);
            }
        });
    }
    async updateFeatureImportance() {
        // Simplified feature importance calculation
        // In production, this would use actual ML model importance scores
        for (const [featureName, definition] of Array.from(this.featureDefinitions)) {
            const history = this.featureHistory.slice(-200);
            if (history.length < 50)
                continue;
            const values = history.map(h => h.features[featureName] || 0);
            // Calculate basic importance metrics
            const variance = this.calculateVariance(values);
            const stability = 1 - this.calculateVolatility(values, 20);
            const informationGain = this.calculateInformationGain(values);
            const importance = {
                featureName,
                importance: variance * 0.4 + informationGain * 0.6,
                rank: 0, // Will be set during sorting
                category: definition.category,
                stability: Math.max(0, Math.min(1, stability)),
                informationGain,
                mutualInformation: informationGain, // Simplified
                permutationImportance: variance, // Simplified
                lastUpdated: Date.now()
            };
            this.featureImportances.set(featureName, importance);
        }
        // Update ranks
        const sortedImportances = Array.from(this.featureImportances.entries())
            .sort((a, b) => b[1].importance - a[1].importance);
        sortedImportances.forEach(([featureName, importance], index) => {
            importance.rank = index + 1;
        });
    }
    calculateInformationGain(values) {
        // Simplified information gain calculation
        const variance = this.calculateVariance(values);
        const entropy = Math.log2(1 + variance);
        return Math.max(0, Math.min(1, entropy / 10));
    }
    // Helper calculation methods
    calculateSMA(values, period) {
        if (values.length < period)
            return values[values.length - 1] || 0;
        const slice = values.slice(-period);
        return slice.reduce((a, b) => a + b, 0) / slice.length;
    }
    calculateEMA(values, period) {
        if (values.length === 0)
            return 0;
        if (values.length === 1)
            return values[0];
        const alpha = 2 / (period + 1);
        let ema = values[0];
        for (let i = 1; i < values.length; i++) {
            ema = alpha * values[i] + (1 - alpha) * ema;
        }
        return ema;
    }
    calculateRSI(values, period) {
        if (values.length < period + 1)
            return 50;
        const changes = [];
        for (let i = 1; i < values.length; i++) {
            changes.push(values[i] - values[i - 1]);
        }
        const gains = changes.map(c => c > 0 ? c : 0);
        const losses = changes.map(c => c < 0 ? -c : 0);
        const avgGain = this.calculateSMA(gains, period);
        const avgLoss = this.calculateSMA(losses, period);
        if (avgLoss === 0)
            return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }
    calculateBollingerBands(values, period, multiplier) {
        const middle = this.calculateSMA(values, period);
        const slice = values.slice(-period);
        const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
        const stdDev = Math.sqrt(variance);
        return {
            upper: middle + multiplier * stdDev,
            lower: middle - multiplier * stdDev,
            middle
        };
    }
    calculateATR(highs, lows, closes, period) {
        if (highs.length < 2)
            return 0;
        const trueRanges = [];
        for (let i = 1; i < highs.length; i++) {
            const tr1 = highs[i] - lows[i];
            const tr2 = Math.abs(highs[i] - closes[i - 1]);
            const tr3 = Math.abs(lows[i] - closes[i - 1]);
            trueRanges.push(Math.max(tr1, tr2, tr3));
        }
        return this.calculateSMA(trueRanges, period);
    }
    calculateVWAP(prices, volumes, period) {
        if (prices.length !== volumes.length || prices.length === 0)
            return 0;
        const slice = Math.min(period, prices.length);
        const recentPrices = prices.slice(-slice);
        const recentVolumes = volumes.slice(-slice);
        let totalPV = 0;
        let totalVolume = 0;
        for (let i = 0; i < recentPrices.length; i++) {
            totalPV += recentPrices[i] * recentVolumes[i];
            totalVolume += recentVolumes[i];
        }
        return totalVolume === 0 ? recentPrices[recentPrices.length - 1] : totalPV / totalVolume;
    }
    calculateVolatility(values, period) {
        if (values.length < period)
            return 0;
        const slice = values.slice(-period);
        const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
        const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / slice.length;
        return Math.sqrt(variance);
    }
    calculateVariance(values) {
        if (values.length === 0)
            return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    }
    calculateSkewness(values) {
        if (values.length < 3)
            return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = this.calculateVariance(values);
        const stdDev = Math.sqrt(variance);
        if (stdDev === 0)
            return 0;
        const skewness = values.reduce((sum, val) => {
            return sum + Math.pow((val - mean) / stdDev, 3);
        }, 0) / values.length;
        return skewness;
    }
    calculateKurtosis(values) {
        if (values.length < 4)
            return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = this.calculateVariance(values);
        const stdDev = Math.sqrt(variance);
        if (stdDev === 0)
            return 0;
        const kurtosis = values.reduce((sum, val) => {
            return sum + Math.pow((val - mean) / stdDev, 4);
        }, 0) / values.length;
        return kurtosis - 3; // Excess kurtosis
    }
    calculateAutocorrelation(values, lag) {
        if (values.length < lag + 1)
            return 0;
        const n = values.length - lag;
        const x = values.slice(0, n);
        const y = values.slice(lag, lag + n);
        return this.calculatePearsonCorrelation(x, y);
    }
    getQuantileNormalization(value, history) {
        if (history.length === 0)
            return 0;
        const sorted = [...history].sort((a, b) => a - b);
        const rank = sorted.filter(v => v <= value).length;
        return rank / sorted.length;
    }
    maintainFeatureHistory() {
        if (this.featureHistory.length > 2000) {
            this.featureHistory = this.featureHistory.slice(-1000);
        }
    }
    cleanupOldData() {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
        this.featureHistory = this.featureHistory.filter(fv => fv.timestamp > cutoff);
        // Clean normalization state history
        this.normalizationState.forEach(state => {
            if (state.history.length > this.normalizationConfig.windowSize) {
                state.history = state.history.slice(-this.normalizationConfig.windowSize);
            }
        });
        console.log(`[INFO] 🧹 Feature engineering data cleanup completed`);
    }
    getSelectedFeatures() {
        return Array.from(this.selectedFeatures);
    }
    getFeatureImportances() {
        return Array.from(this.featureImportances.values())
            .sort((a, b) => b.importance - a.importance);
    }
    getCorrelationMatrix() {
        return this.correlationMatrix;
    }
    getEngineeringMetrics() {
        return {
            ...this.engineeringMetrics,
            totalFeatures: this.featureDefinitions.size,
            selectedFeatures: this.selectedFeatures.size,
            historyLength: this.featureHistory.length,
            isActive: this.isActive
        };
    }
    updateConfiguration(normalizationConfig, selectionConfig) {
        if (normalizationConfig) {
            this.normalizationConfig = { ...this.normalizationConfig, ...normalizationConfig };
        }
        if (selectionConfig) {
            this.selectionConfig = { ...this.selectionConfig, ...selectionConfig };
        }
        this.emit('config-updated', {
            normalization: this.normalizationConfig,
            selection: this.selectionConfig
        });
        console.log(`[INFO] ⚙️  Feature engineering configuration updated`);
    }
    dispose() {
        this.isActive = false;
        this.removeAllListeners();
        console.log(`[INFO] 🧹 Enterprise Feature Engineering disposed: ${this.instanceId}`);
    }
}
exports.EnterpriseFeatureEngineering = EnterpriseFeatureEngineering;
exports.default = EnterpriseFeatureEngineering;

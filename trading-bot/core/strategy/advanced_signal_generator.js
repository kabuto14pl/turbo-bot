"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🎯 ADVANCED SIGNAL GENERATOR
 * Enterprise-grade signal generation with ML enhancement and risk filtering
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSignalGeneratorConfig = exports.AdvancedSignalGenerator = exports.AdvancedRiskFilter = exports.MLSignalEnhancementEngine = void 0;
const events_1 = require("events");
const enterprise_strategy_manager_1 = require("./enterprise_strategy_manager");
const multi_timeframe_analyzer_1 = require("./multi_timeframe_analyzer");
// ============================================================================
// 🤖 ML SIGNAL ENHANCEMENT ENGINE
// ============================================================================
class MLSignalEnhancementEngine {
    constructor(logger) {
        this.confidenceModel = new Map();
        this.performanceHistory = new Map();
        this.logger = logger;
        this.initializeMLModels();
    }
    initializeMLModels() {
        // Initialize mock ML models for signal enhancement
        // In production, this would load actual trained models
        this.logger.info('🤖 Initializing ML Signal Enhancement Engine');
    }
    /**
     * Enhance signal confidence using ML predictions
     */
    async enhanceSignal(signal, marketContext) {
        try {
            // Simulate ML processing
            const mlStartTime = Date.now();
            // Feature extraction
            const features = this.extractFeatures(signal, marketContext);
            // ML prediction
            const mlConfidence = this.predictSignalSuccess(features);
            // Context-aware adjustment
            const contextualAdjustment = this.calculateContextualAdjustment(signal, marketContext);
            // Final enhancement
            const enhancement = mlConfidence * contextualAdjustment;
            const processingTime = Date.now() - mlStartTime;
            this.logger.debug(`🤖 ML enhancement: ${enhancement.toFixed(3)} (${processingTime}ms)`);
            return Math.max(0, Math.min(1, enhancement));
        }
        catch (error) {
            this.logger.error('❌ ML enhancement failed:', error);
            return 0; // No enhancement on error
        }
    }
    extractFeatures(signal, marketContext) {
        // Extract numerical features for ML model
        return [
            signal.confidence,
            signal.quantity || signal.size || 0,
            marketContext.regime?.volatility || 0.5,
            marketContext.regime?.trend || 0,
            marketContext.marketData.lastPrice / 50000, // Normalized price
            marketContext.positions.length / 10, // Normalized position count
            Date.now() % 86400000 / 86400000, // Time of day normalized
        ];
    }
    predictSignalSuccess(features) {
        // Simple linear model for demonstration
        // In production, this would use a trained neural network or ensemble
        const weights = [0.3, 0.1, -0.2, 0.4, 0.05, -0.1, 0.1];
        const bias = 0.5;
        let prediction = bias;
        for (let i = 0; i < Math.min(features.length, weights.length); i++) {
            prediction += features[i] * weights[i];
        }
        // Apply sigmoid activation
        return 1 / (1 + Math.exp(-prediction));
    }
    calculateContextualAdjustment(signal, marketContext) {
        let adjustment = 1.0;
        // Market volatility adjustment
        const volatility = marketContext.regime?.volatility || 0.5;
        if (volatility > 0.8) {
            adjustment *= 0.8; // Reduce confidence in high volatility
        }
        else if (volatility < 0.3) {
            adjustment *= 1.1; // Boost confidence in low volatility
        }
        // Trend alignment adjustment
        const trend = marketContext.regime?.trend || 0;
        if (signal.action === 'ENTER_LONG' && trend > 0.5) {
            adjustment *= 1.2; // Boost long signals in uptrend
        }
        else if (signal.action === 'ENTER_SHORT' && trend < -0.5) {
            adjustment *= 1.2; // Boost short signals in downtrend
        }
        else if ((signal.action === 'ENTER_LONG' && trend < -0.5) ||
            (signal.action === 'ENTER_SHORT' && trend > 0.5)) {
            adjustment *= 0.7; // Penalize counter-trend signals
        }
        return adjustment;
    }
    /**
     * Learn from signal performance
     */
    updatePerformance(signalId, actualPerformance) {
        if (!this.performanceHistory.has(signalId)) {
            this.performanceHistory.set(signalId, []);
        }
        const history = this.performanceHistory.get(signalId);
        history.push(actualPerformance);
        // Keep only last 50 performances
        if (history.length > 50) {
            history.shift();
        }
        // Update model confidence
        const avgPerformance = history.reduce((sum, p) => sum + p, 0) / history.length;
        this.confidenceModel.set(signalId, avgPerformance);
    }
}
exports.MLSignalEnhancementEngine = MLSignalEnhancementEngine;
// ============================================================================
// 🛡️ ADVANCED RISK FILTER
// ============================================================================
class AdvancedRiskFilter {
    constructor(logger) {
        this.positionLimits = new Map();
        this.correlationMatrix = new Map();
        this.logger = logger;
    }
    /**
     * Filter signals based on risk criteria
     */
    filterSignals(signals, marketContext) {
        const filtered = [];
        for (const signal of signals) {
            const riskScore = this.calculateRiskScore(signal, marketContext);
            if (this.passesRiskFilter(signal, riskScore, marketContext)) {
                // Adjust quantity based on risk
                signal.riskAdjustedQuantity = this.calculateRiskAdjustedQuantity(signal, riskScore);
                filtered.push(signal);
            }
            else {
                this.logger.debug(`🚫 Signal filtered due to risk: ${signal.symbol} (risk: ${riskScore.toFixed(3)})`);
            }
        }
        return filtered;
    }
    calculateRiskScore(signal, marketContext) {
        let riskScore = 0;
        // Base risk from signal uncertainty
        riskScore += (1 - signal.confidence) * 0.3;
        // Market volatility risk
        const volatility = marketContext.regime?.volatility || 0.5;
        riskScore += volatility * 0.2;
        // Position concentration risk
        const existingPosition = marketContext.positions.find(p => p.symbol === signal.symbol);
        if (existingPosition) {
            riskScore += 0.2; // Higher risk for existing positions
        }
        // Portfolio correlation risk
        const correlationRisk = this.calculateCorrelationRisk(signal, marketContext);
        riskScore += correlationRisk * 0.3;
        return Math.max(0, Math.min(1, riskScore));
    }
    calculateCorrelationRisk(signal, marketContext) {
        // Simplified correlation risk calculation
        const sameActionPositions = marketContext.positions.filter(p => (signal.action === 'ENTER_LONG' && p.quantity > 0) ||
            (signal.action === 'ENTER_SHORT' && p.quantity < 0));
        return Math.min(1, sameActionPositions.length / 5); // Risk increases with similar positions
    }
    passesRiskFilter(signal, riskScore, marketContext) {
        // Maximum risk threshold
        if (riskScore > 0.8)
            return false;
        // Minimum confidence after risk adjustment
        if (signal.confidence * (1 - riskScore) < 0.4)
            return false;
        // Position size limits
        const maxPositionSize = 10000; // USD
        const quantity = signal.quantity || signal.size || 0;
        if (quantity * signal.price > maxPositionSize)
            return false;
        // Maximum positions per symbol
        const existingPositions = marketContext.positions.filter(p => p.symbol === signal.symbol);
        if (existingPositions.length >= 2)
            return false; // Max 2 positions per symbol
        return true;
    }
    calculateRiskAdjustedQuantity(signal, riskScore) {
        const baseQuantity = signal.quantity || signal.size || 0;
        const riskAdjustment = 1 - (riskScore * 0.5); // Reduce quantity by up to 50% based on risk
        return baseQuantity * riskAdjustment;
    }
}
exports.AdvancedRiskFilter = AdvancedRiskFilter;
// ============================================================================
// 🎯 ADVANCED SIGNAL GENERATOR
// ============================================================================
class AdvancedSignalGenerator extends events_1.EventEmitter {
    constructor(config, logger) {
        super();
        this.isRunning = false;
        this.performanceMetrics = new Map();
        this.config = config;
        this.logger = logger;
        // Initialize components
        this.strategyManager = new enterprise_strategy_manager_1.EnterpriseStrategyManager(enterprise_strategy_manager_1.defaultStrategyManagerConfig, undefined, logger);
        this.multiTimeframeAnalyzer = new multi_timeframe_analyzer_1.MultiTimeframeStrategyAnalyzer(logger);
        this.mlEnhancementEngine = new MLSignalEnhancementEngine(logger);
        this.riskFilter = new AdvancedRiskFilter(logger);
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.strategyManager.on('performance_updated', (data) => {
            this.handlePerformanceUpdate(data);
        });
        this.multiTimeframeAnalyzer.on('analyzer_started', () => {
            this.logger.info('📊 Multi-timeframe analyzer started');
        });
    }
    /**
     * Initialize and start the signal generator
     */
    async initialize() {
        this.logger.info('🎯 Initializing Advanced Signal Generator');
        await this.strategyManager.initialize();
        if (this.config.enableMultiTimeframe) {
            await this.multiTimeframeAnalyzer.start();
        }
        this.isRunning = true;
        this.logger.info('✅ Advanced Signal Generator initialized');
        this.emit('generator_initialized');
    }
    /**
     * Generate enhanced signals from all sources
     */
    async generateSignals(state) {
        if (!this.isRunning) {
            throw new Error('Signal generator is not initialized');
        }
        const startTime = Date.now();
        const report = {
            timestamp: new Date(),
            totalSignalsGenerated: 0,
            signalsAfterFiltering: 0,
            averageConfidence: 0,
            averageQualityScore: 0,
            topStrategies: [],
            riskMetrics: {
                averageRisk: 0,
                maxRisk: 0,
                riskAdjustedSignals: 0
            },
            performanceMetrics: {
                executionTime: 0,
                mlProcessingTime: 0,
                multiTimeframeTime: 0,
                filteringTime: 0
            }
        };
        try {
            // Step 1: Generate base signals from strategies
            const baseSignals = await this.strategyManager.executeStrategies(state);
            report.totalSignalsGenerated = baseSignals.length;
            // Step 2: Multi-timeframe analysis (if enabled)
            let consolidatedSignals = baseSignals;
            if (this.config.enableMultiTimeframe) {
                const mtfStartTime = Date.now();
                const timeframeAnalysis = this.multiTimeframeAnalyzer.analyzeMultiTimeframe(state);
                // Group signals by timeframe and consolidate
                const timeframeSignals = new Map();
                baseSignals.forEach(signal => {
                    const timeframe = signal.metadata?.timeframe || 'h1';
                    if (!timeframeSignals.has(timeframe)) {
                        timeframeSignals.set(timeframe, []);
                    }
                    timeframeSignals.get(timeframe).push(signal);
                });
                const mtfSignals = this.multiTimeframeAnalyzer.generateConsolidatedSignals(timeframeSignals, state);
                consolidatedSignals = mtfSignals.length > 0 ? mtfSignals : baseSignals;
                report.performanceMetrics.multiTimeframeTime = Date.now() - mtfStartTime;
            }
            // Step 3: Enhance signals with ML (if enabled)
            const enhancedSignals = [];
            const mlStartTime = Date.now();
            for (const signal of consolidatedSignals) {
                const enhanced = await this.enhanceSignal(signal, state);
                enhancedSignals.push(enhanced);
            }
            report.performanceMetrics.mlProcessingTime = Date.now() - mlStartTime;
            // Step 4: Apply risk filtering (if enabled)
            const filterStartTime = Date.now();
            const finalSignals = this.config.enableRiskFiltering
                ? this.riskFilter.filterSignals(enhancedSignals, state)
                : enhancedSignals;
            report.performanceMetrics.filteringTime = Date.now() - filterStartTime;
            // Step 5: Final quality filtering
            const qualityFiltered = this.applyQualityFilter(finalSignals);
            // Step 6: Generate report
            this.updateReport(report, qualityFiltered, startTime);
            this.logger.info(`🎯 Generated ${qualityFiltered.length} enhanced signals from ${baseSignals.length} base signals`);
            this.emit('signals_generated', { signals: qualityFiltered, report });
            return { signals: qualityFiltered, report };
        }
        catch (error) {
            this.logger.error('❌ Signal generation failed:', error);
            throw error;
        }
    }
    async enhanceSignal(signal, state) {
        const enhanced = {
            ...signal,
            qualityScore: 0,
            executionPriority: 0,
            enhancementMetadata: {
                mlProcessed: false,
                riskFiltered: false,
                sentimentAdjusted: false,
                volatilityAdjusted: false,
                multiTimeframeAnalyzed: 'sourceTimeframes' in signal,
                correlationChecked: false,
                originalConfidence: signal.confidence,
                enhancementFactors: []
            }
        };
        // ML Enhancement
        if (this.config.enableMLEnhancement) {
            enhanced.mlConfidenceBoost = await this.mlEnhancementEngine.enhanceSignal(signal, state);
            enhanced.confidence = Math.min(1, enhanced.confidence + enhanced.mlConfidenceBoost * 0.2);
            enhanced.enhancementMetadata.mlProcessed = true;
            enhanced.enhancementMetadata.enhancementFactors.push('ML_Enhancement');
        }
        // Sentiment Adjustment
        if (this.config.enableSentimentAnalysis) {
            enhanced.sentimentScore = this.calculateSentimentScore(state);
            enhanced.confidence *= (1 + enhanced.sentimentScore * 0.1);
            enhanced.enhancementMetadata.sentimentAdjusted = true;
            enhanced.enhancementMetadata.enhancementFactors.push('Sentiment_Analysis');
        }
        // Volatility Adjustment
        if (this.config.enableVolatilityAdjustment) {
            enhanced.volatilityAdjustment = this.calculateVolatilityAdjustment(state);
            enhanced.quantity *= enhanced.volatilityAdjustment;
            enhanced.enhancementMetadata.volatilityAdjusted = true;
            enhanced.enhancementMetadata.enhancementFactors.push('Volatility_Adjustment');
        }
        // Multi-timeframe alignment bonus
        if ('timeframeAlignment' in signal) {
            enhanced.timeframeAlignment = signal.alignmentScore;
            enhanced.confidence *= (1 + enhanced.timeframeAlignment * 0.15);
            enhanced.enhancementMetadata.enhancementFactors.push('Timeframe_Alignment');
        }
        // Calculate quality score
        enhanced.qualityScore = this.calculateQualityScore(enhanced);
        enhanced.executionPriority = this.calculateExecutionPriority(enhanced);
        return enhanced;
    }
    calculateSentimentScore(state) {
        // Simplified sentiment calculation
        // In production, this would integrate with news APIs, social media, etc.
        return 0; // Neutral sentiment for now
    }
    calculateVolatilityAdjustment(state) {
        const volatility = state.regime?.volatility || 0.5;
        // Reduce position size in high volatility
        if (volatility > 0.8)
            return 0.7;
        if (volatility > 0.6)
            return 0.85;
        if (volatility < 0.3)
            return 1.2; // Increase in low volatility
        return 1.0;
    }
    calculateQualityScore(signal) {
        let score = signal.confidence * 0.4;
        // Add bonuses for enhancements
        if (signal.mlConfidenceBoost)
            score += signal.mlConfidenceBoost * 0.2;
        if (signal.timeframeAlignment)
            score += signal.timeframeAlignment * 0.2;
        if (signal.enhancementMetadata.enhancementFactors.length > 2)
            score += 0.1;
        // Penalty for high risk
        const baseQuantity = signal.quantity || signal.size || 0;
        const riskPenalty = (signal.riskAdjustedQuantity && baseQuantity > 0 && signal.riskAdjustedQuantity < baseQuantity) ? 0.1 : 0;
        score -= riskPenalty;
        return Math.max(0, Math.min(1, score));
    }
    calculateExecutionPriority(signal) {
        // Higher quality and confidence = higher priority
        return signal.qualityScore * signal.confidence;
    }
    applyQualityFilter(signals) {
        return signals
            .filter(signal => signal.confidence >= this.config.minSignalConfidence)
            .filter(signal => signal.qualityScore >= 0.5)
            .sort((a, b) => b.executionPriority - a.executionPriority) // Sort by priority
            .slice(0, this.config.maxSignalsPerSymbol * 10); // Limit total signals
    }
    updateReport(report, signals, startTime) {
        report.signalsAfterFiltering = signals.length;
        report.averageConfidence = signals.length > 0
            ? signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length
            : 0;
        report.averageQualityScore = signals.length > 0
            ? signals.reduce((sum, s) => sum + s.qualityScore, 0) / signals.length
            : 0;
        report.performanceMetrics.executionTime = Date.now() - startTime;
        // Get top strategies from strategy manager
        const managerStatus = this.strategyManager.getManagerStatus();
        report.topStrategies = managerStatus.topPerformers.slice(0, 3);
        // Calculate risk metrics
        const riskScores = signals.map(s => {
            const baseQuantity = s.quantity || s.size || 0;
            return (s.riskAdjustedQuantity && baseQuantity > 0) ? 1 - (s.riskAdjustedQuantity / baseQuantity) : 0;
        });
        report.riskMetrics.averageRisk = riskScores.length > 0
            ? riskScores.reduce((sum, r) => sum + r, 0) / riskScores.length
            : 0;
        report.riskMetrics.maxRisk = riskScores.length > 0 ? Math.max(...riskScores) : 0;
        report.riskMetrics.riskAdjustedSignals = signals.filter(s => {
            const baseQuantity = s.quantity || s.size || 0;
            return s.riskAdjustedQuantity && baseQuantity > 0 && s.riskAdjustedQuantity < baseQuantity;
        }).length;
    }
    handlePerformanceUpdate(data) {
        // Update internal performance tracking
        this.emit('performance_updated', data);
    }
    /**
     * Get generator status
     */
    getGeneratorStatus() {
        return {
            isRunning: this.isRunning,
            config: this.config,
            strategyManagerStatus: this.strategyManager.getManagerStatus(),
            multiTimeframeStatus: this.multiTimeframeAnalyzer.getAnalyzerStatus()
        };
    }
    /**
     * Stop the signal generator
     */
    async stop() {
        this.isRunning = false;
        await this.strategyManager.stop();
        if (this.config.enableMultiTimeframe) {
            await this.multiTimeframeAnalyzer.stop();
        }
        this.logger.info('🛑 Advanced Signal Generator stopped');
        this.emit('generator_stopped');
    }
}
exports.AdvancedSignalGenerator = AdvancedSignalGenerator;
// ============================================================================
// 🎯 DEFAULT CONFIGURATION
// ============================================================================
exports.defaultSignalGeneratorConfig = {
    enableMLEnhancement: true,
    enableRiskFiltering: true,
    enableMultiTimeframe: true,
    enableSentimentAnalysis: false, // Disabled until sentiment integration
    enableVolatilityAdjustment: true,
    minSignalConfidence: 0.6,
    maxSignalsPerSymbol: 3,
    signalTimeout: 30000, // 30 seconds
    correlationThreshold: 0.8,
    diversificationEnabled: true,
    adaptiveLearning: true
};

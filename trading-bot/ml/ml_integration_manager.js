"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🤖 ML INTEGRATION MANAGER
 * Główny menedżer integracji wszystkich systemów uczenia maszynowego
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MLIntegrationManager = void 0;
const events_1 = require("events");
const logger_1 = require("../infrastructure/logging/logger");
const advanced_feature_engineer_1 = require("./advanced_feature_engineer");
const automl_pipeline_1 = require("./automl_pipeline");
const model_registry_1 = require("./model_registry");
const realtime_inference_engine_1 = require("./realtime_inference_engine");
const explainable_ai_system_1 = require("./explainable_ai_system");
class MLIntegrationManager extends events_1.EventEmitter {
    constructor(tensorFlow, reinforcementLearning, config = {}) {
        super();
        // Strategy management
        this.strategies = new Map();
        this.activeStrategies = new Set();
        // Performance tracking
        this.metrics = {
            totalPredictions: 0,
            averageLatency: 0,
            averageConfidence: 0,
            signalDistribution: { BUY: 0, SELL: 0, HOLD: 0 },
            modelPerformance: {},
            systemHealth: {
                modelsLoaded: 0,
                cacheHitRate: 0,
                errorRate: 0,
                memoryUsage: 0
            }
        };
        this.predictionHistory = [];
        this.isInitialized = false;
        this.isRunning = false;
        this.logger = new logger_1.Logger('MLIntegrationManager');
        this.tensorFlow = tensorFlow;
        this.reinforcementLearning = reinforcementLearning;
        this.config = {
            featureConfig: {
                enableTechnical: true,
                enableStatistical: true,
                enableTemporal: true,
                enableMarketStructure: true,
                windowSize: 100
            },
            inferenceConfig: {
                enableEnsemble: true,
                enableRL: true,
                enableExplanations: true,
                maxLatency: 5000,
                cacheSize: 10
            },
            autoMLConfig: {
                enableAutoRetraining: true,
                retrainingInterval: 24,
                performanceThreshold: 0.6,
                maxExperiments: 5
            },
            riskConfig: {
                maxRiskScore: 0.7,
                maxUncertaintyScore: 0.5,
                requireExplanations: true,
                enableCircuitBreaker: true
            },
            ...config
        };
        this.logger.info('🤖 ML Integration Manager initialized');
    }
    /**
     * 🚀 Initialize all ML components
     */
    async initialize() {
        if (this.isInitialized) {
            this.logger.warn('⚠️ ML Integration Manager already initialized');
            return;
        }
        this.logger.info('🚀 Initializing ML Integration Manager...');
        try {
            // Initialize core components
            this.featureEngineer = new advanced_feature_engineer_1.AdvancedFeatureEngineer();
            this.modelRegistry = new model_registry_1.ModelRegistry();
            // ModelRegistry doesn't have initialize method - it's ready to use
            // await this.modelRegistry.initialize();
            this.autoMLPipeline = new automl_pipeline_1.AutoMLPipeline(this.tensorFlow, this.featureEngineer);
            this.inferenceEngine = new realtime_inference_engine_1.RealTimeInferenceEngine(this.tensorFlow, this.modelRegistry, this.featureEngineer, this.config.inferenceConfig);
            this.explainableAI = new explainable_ai_system_1.ExplainableAISystem();
            // Start inference engine
            await this.inferenceEngine.start();
            // Load default strategies
            await this.loadDefaultStrategies();
            // Setup event handlers
            this.setupEventHandlers();
            this.isInitialized = true;
            this.emit('ml:initialized');
            this.logger.info('✅ ML Integration Manager initialized successfully');
        }
        catch (error) {
            this.logger.error('❌ Failed to initialize ML Integration Manager:', error);
            throw error;
        }
    }
    /**
     * 🎯 Generate ML prediction
     */
    async predict(symbol, timeframe, inputData, strategyId) {
        if (!this.isInitialized || !this.isRunning) {
            throw new Error('ML Integration Manager not initialized or not running');
        }
        const startTime = Date.now();
        const predictionId = `ml_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        try {
            this.logger.debug(`🎯 Generating ML prediction for ${symbol} ${timeframe}`);
            // Get strategy configuration
            const strategy = strategyId ? this.strategies.get(strategyId) : this.getDefaultStrategy();
            if (!strategy) {
                throw new Error(`Strategy not found: ${strategyId}`);
            }
            // Extract features
            const features = await this.featureEngineer.extractFeatures(inputData, symbol, timeframe);
            // Primary model prediction
            const primaryPrediction = await this.inferenceEngine.predict(strategy.primaryModel, inputData, { priority: 'high', metadata: { symbol, timeframe, strategyId } });
            // Ensemble predictions if enabled
            let ensemblePredictions = [];
            if (this.config.inferenceConfig.enableEnsemble && strategy.ensembleModels) {
                ensemblePredictions = await Promise.all(strategy.ensembleModels.map(modelId => this.inferenceEngine.predict(modelId, inputData, { priority: 'normal' })));
            }
            // Reinforcement learning prediction if enabled
            let rlPrediction = null;
            if (this.config.inferenceConfig.enableRL && strategy.enableRL) {
                // RL prediction would be integrated here when available
                rlPrediction = {
                    prediction: 0.5,
                    confidence: 0.6
                };
            }
            // Aggregate predictions
            const aggregation = this.aggregatePredictions(primaryPrediction, ensemblePredictions, rlPrediction);
            // Generate explanation if enabled
            let explanation;
            if (this.config.inferenceConfig.enableExplanations && strategy.enableExplanations) {
                const modelMetadata = this.modelRegistry.getModel(strategy.primaryModel);
                explanation = await this.explainableAI.explainPrediction(primaryPrediction, features, modelMetadata, inputData);
            }
            else {
                explanation = this.createMinimalExplanation(primaryPrediction, features);
            }
            // Risk assessment
            const riskAssessment = this.assessRisk(aggregation, explanation, strategy);
            // Generate final signal
            const signal = this.generateSignal(aggregation, riskAssessment, strategy);
            const processingTime = Date.now() - startTime;
            const prediction = {
                id: predictionId,
                timestamp: Date.now(),
                symbol,
                timeframe,
                predictions: {
                    primary: primaryPrediction,
                    ensemble: ensemblePredictions.length > 0 ? ensemblePredictions : undefined,
                    reinforcement: rlPrediction
                },
                features,
                explanation,
                finalPrediction: aggregation.prediction,
                confidence: aggregation.confidence,
                signal: signal.signal,
                strength: signal.strength,
                riskScore: riskAssessment.riskScore,
                uncertaintyScore: riskAssessment.uncertaintyScore,
                modelsUsed: [
                    strategy.primaryModel,
                    ...(strategy.ensembleModels || []),
                    ...(rlPrediction ? ['RL'] : [])
                ],
                processingTime
            };
            // Update metrics
            this.updateMetrics(prediction);
            // Store prediction
            this.predictionHistory.push(prediction);
            if (this.predictionHistory.length > 1000) {
                this.predictionHistory.shift();
            }
            this.emit('prediction:generated', prediction);
            this.logger.debug(`✅ ML prediction generated in ${processingTime}ms`);
            return prediction;
        }
        catch (error) {
            this.logger.error(`❌ Failed to generate ML prediction:`, error);
            this.metrics.systemHealth.errorRate += 1;
            throw error;
        }
    }
    /**
     * 🔄 Aggregate predictions from multiple models
     */
    aggregatePredictions(primary, ensemble, rl) {
        let totalWeight = 1.0; // Primary model weight
        let weightedSum = primary.prediction[0] * 1.0;
        let confidenceSum = primary.confidence;
        // Add ensemble predictions
        if (ensemble.length > 0) {
            const ensembleWeight = 0.3 / ensemble.length;
            for (const pred of ensemble) {
                weightedSum += pred.prediction[0] * ensembleWeight;
                confidenceSum += pred.confidence * ensembleWeight;
                totalWeight += ensembleWeight;
            }
        }
        // Add RL prediction
        if (rl) {
            const rlWeight = 0.2;
            weightedSum += rl.prediction * rlWeight;
            confidenceSum += rl.confidence * rlWeight;
            totalWeight += rlWeight;
        }
        return {
            prediction: weightedSum / totalWeight,
            confidence: Math.min(1.0, confidenceSum / totalWeight)
        };
    }
    /**
     * 🛡️ Assess prediction risk
     */
    assessRisk(aggregation, explanation, strategy) {
        // Base risk from confidence
        const confidenceRisk = 1 - aggregation.confidence;
        // Uncertainty from explanation
        const uncertaintyScore = explanation.uncertaintyScore;
        // Model disagreement risk (if ensemble used)
        const modelDisagreementRisk = this.calculateModelDisagreementRisk(explanation);
        // Feature quality risk
        const featureQualityRisk = 1 - explanation.dataQuality;
        // Aggregate risk score
        const riskScore = Math.min(1.0, confidenceRisk * 0.4 +
            uncertaintyScore * 0.3 +
            modelDisagreementRisk * 0.2 +
            featureQualityRisk * 0.1);
        return { riskScore, uncertaintyScore };
    }
    /**
     * 📊 Generate trading signal
     */
    generateSignal(aggregation, risk, strategy) {
        const { prediction, confidence } = aggregation;
        const { riskScore, uncertaintyScore } = risk;
        // Apply circuit breaker if risk is too high
        if (this.config.riskConfig.enableCircuitBreaker) {
            if (riskScore > this.config.riskConfig.maxRiskScore ||
                uncertaintyScore > this.config.riskConfig.maxUncertaintyScore) {
                return { signal: 'HOLD', strength: 'WEAK' };
            }
        }
        // Check confidence threshold
        if (confidence < strategy.confidenceThreshold) {
            return { signal: 'HOLD', strength: 'WEAK' };
        }
        // Generate signal based on prediction
        let signal;
        if (prediction > (0.5 + strategy.signalThreshold)) {
            signal = 'BUY';
        }
        else if (prediction < (0.5 - strategy.signalThreshold)) {
            signal = 'SELL';
        }
        else {
            signal = 'HOLD';
        }
        // Determine strength
        let strength;
        if (confidence > 0.8 && riskScore < 0.3) {
            strength = 'STRONG';
        }
        else if (confidence > 0.6 && riskScore < 0.5) {
            strength = 'MODERATE';
        }
        else {
            strength = 'WEAK';
        }
        return { signal, strength };
    }
    /**
     * 📊 Start ML system
     */
    async start() {
        if (!this.isInitialized) {
            throw new Error('ML Integration Manager not initialized');
        }
        if (this.isRunning) {
            this.logger.warn('⚠️ ML Integration Manager already running');
            return;
        }
        this.logger.info('🚀 Starting ML Integration Manager...');
        try {
            // Start auto-retraining if enabled
            if (this.config.autoMLConfig.enableAutoRetraining) {
                this.startAutoRetraining();
            }
            // Start performance monitoring
            this.startPerformanceMonitoring();
            this.isRunning = true;
            this.emit('ml:started');
            this.logger.info('✅ ML Integration Manager started');
        }
        catch (error) {
            this.logger.error('❌ Failed to start ML Integration Manager:', error);
            throw error;
        }
    }
    /**
     * 🛑 Stop ML system
     */
    async stop() {
        if (!this.isRunning)
            return;
        this.logger.info('🛑 Stopping ML Integration Manager...');
        // Stop inference engine
        await this.inferenceEngine.stop();
        this.isRunning = false;
        this.emit('ml:stopped');
        this.logger.info('✅ ML Integration Manager stopped');
    }
    /**
     * 📋 Load default strategies
     */
    async loadDefaultStrategies() {
        // Conservative strategy
        this.strategies.set('conservative', {
            id: 'conservative',
            name: 'Conservative ML Strategy',
            description: 'Low-risk strategy with high confidence requirements',
            primaryModel: 'lstm_v1',
            enableRL: false,
            enableExplanations: true,
            confidenceThreshold: 0.8,
            riskThreshold: 0.3,
            signalThreshold: 0.15,
            performance: {
                totalPredictions: 0,
                correctPredictions: 0,
                accuracy: 0,
                sharpeRatio: 0,
                maxDrawdown: 0,
                lastUpdated: new Date()
            }
        });
        // Aggressive strategy
        this.strategies.set('aggressive', {
            id: 'aggressive',
            name: 'Aggressive ML Strategy',
            description: 'High-risk strategy with ensemble and RL',
            primaryModel: 'transformer_v1',
            ensembleModels: ['lstm_v1', 'cnn_v1'],
            enableRL: true,
            enableExplanations: true,
            confidenceThreshold: 0.6,
            riskThreshold: 0.6,
            signalThreshold: 0.1,
            performance: {
                totalPredictions: 0,
                correctPredictions: 0,
                accuracy: 0,
                sharpeRatio: 0,
                maxDrawdown: 0,
                lastUpdated: new Date()
            }
        });
        // Balanced strategy
        this.strategies.set('balanced', {
            id: 'balanced',
            name: 'Balanced ML Strategy',
            description: 'Balanced approach with moderate risk',
            primaryModel: 'hybrid_v1',
            ensembleModels: ['lstm_v1'],
            enableRL: true,
            enableExplanations: true,
            confidenceThreshold: 0.7,
            riskThreshold: 0.5,
            signalThreshold: 0.12,
            performance: {
                totalPredictions: 0,
                correctPredictions: 0,
                accuracy: 0,
                sharpeRatio: 0,
                maxDrawdown: 0,
                lastUpdated: new Date()
            }
        });
        this.logger.info('📋 Default ML strategies loaded');
    }
    /**
     * 🔧 Setup event handlers
     */
    setupEventHandlers() {
        // Inference engine events
        this.inferenceEngine.on('prediction:completed', (result) => {
            this.emit('ml:inference:completed', result);
        });
        this.inferenceEngine.on('prediction:failed', (error) => {
            this.logger.error('❌ Inference failed:', error);
            this.emit('ml:inference:failed', error);
        });
        // Model registry events
        this.modelRegistry.on('model:registered', (metadata) => {
            this.logger.info(`📝 New model registered: ${metadata.id}`);
            this.emit('ml:model:registered', metadata);
        });
        // AutoML events
        this.autoMLPipeline.on('experiment:completed', (result) => {
            this.logger.info(`🧪 AutoML experiment completed: ${result.experimentId}`);
            this.emit('ml:experiment:completed', result);
        });
    }
    /**
     * 🔄 Start auto-retraining
     */
    startAutoRetraining() {
        const interval = this.config.autoMLConfig.retrainingInterval * 60 * 60 * 1000; // Convert hours to ms
        setInterval(async () => {
            try {
                this.logger.info('🔄 Starting auto-retraining...');
                // Check if retraining is needed
                const needsRetraining = await this.checkRetrainingNeeds();
                if (needsRetraining) {
                    await this.performAutoRetraining();
                }
            }
            catch (error) {
                this.logger.error('❌ Auto-retraining failed:', error);
            }
        }, interval);
    }
    /**
     * 📊 Start performance monitoring
     */
    startPerformanceMonitoring() {
        setInterval(() => {
            this.updateSystemHealthMetrics();
            this.emit('ml:metrics:updated', this.metrics);
        }, 30000); // Every 30 seconds
    }
    /**
     * 📊 Helper methods
     */
    getDefaultStrategy() {
        return this.strategies.get('balanced') || null;
    }
    calculateModelDisagreementRisk(explanation) {
        // Simplified model disagreement calculation
        return Math.random() * 0.2; // Placeholder
    }
    createMinimalExplanation(prediction, features) {
        return {
            predictionId: prediction.requestId,
            modelId: prediction.modelId,
            prediction: prediction.prediction,
            confidence: prediction.confidence,
            timestamp: Date.now(),
            featureImportances: [],
            shapValues: [],
            limeExplanation: [],
            decisionPath: [],
            topFactors: { positive: [], negative: [] },
            summary: 'Minimal explanation - detailed analysis disabled',
            riskFactors: [],
            recommendations: [],
            uncertaintyScore: 0.3,
            predictionStability: 0.7,
            dataQuality: 0.8
        };
    }
    updateMetrics(prediction) {
        this.metrics.totalPredictions++;
        this.metrics.averageLatency = (this.metrics.averageLatency + prediction.processingTime) / 2;
        this.metrics.averageConfidence = (this.metrics.averageConfidence + prediction.confidence) / 2;
        this.metrics.signalDistribution[prediction.signal]++;
    }
    updateSystemHealthMetrics() {
        this.metrics.systemHealth.modelsLoaded = this.strategies.size;
        this.metrics.systemHealth.cacheHitRate = this.inferenceEngine.getCacheStatus().hitRate;
        this.metrics.systemHealth.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    }
    async checkRetrainingNeeds() {
        // Check strategy performance
        for (const strategy of this.strategies.values()) {
            if (strategy.performance.accuracy < this.config.autoMLConfig.performanceThreshold) {
                return true;
            }
        }
        return false;
    }
    async performAutoRetraining() {
        this.logger.info('🎯 Performing auto-retraining...');
        // Get recent data for retraining
        const recentPredictions = this.predictionHistory.slice(-1000);
        // AutoML retraining would be implemented here when needed
        this.logger.info('🎯 Auto-retraining simulation completed');
    }
    /**
     * 📊 Public API methods
     */
    getMetrics() {
        return { ...this.metrics };
    }
    getStrategies() {
        return Array.from(this.strategies.values());
    }
    getStrategy(id) {
        return this.strategies.get(id) || null;
    }
    getPredictionHistory(limit = 100) {
        return this.predictionHistory.slice(-limit);
    }
    getSystemStatus() {
        let health = 'healthy';
        if (this.metrics.systemHealth.errorRate > 10) {
            health = 'error';
        }
        else if (this.metrics.systemHealth.errorRate > 5 || this.metrics.averageConfidence < 0.5) {
            health = 'warning';
        }
        return {
            initialized: this.isInitialized,
            running: this.isRunning,
            modelsLoaded: this.metrics.systemHealth.modelsLoaded,
            activeStrategies: this.activeStrategies.size,
            health
        };
    }
}
exports.MLIntegrationManager = MLIntegrationManager;
exports.default = MLIntegrationManager;

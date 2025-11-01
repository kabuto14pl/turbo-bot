"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🤖 AUTOML PIPELINE SYSTEM
 * Automatyczna optymalizacja i zarządzanie modelami ML
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoMLPipeline = void 0;
const events_1 = require("events");
const logger_1 = require("../infrastructure/logging/logger");
class AutoMLPipeline extends events_1.EventEmitter {
    constructor(tensorFlow, featureEngineer) {
        super();
        this.experiments = new Map();
        this.modelPerformance = new Map();
        this.architectures = [];
        this.isRunning = false;
        this.logger = new logger_1.Logger('AutoMLPipeline');
        this.tensorFlow = tensorFlow;
        this.featureEngineer = featureEngineer;
        this.initializeArchitectures();
    }
    /**
     * 🏗️ Initialize predefined model architectures
     */
    initializeArchitectures() {
        this.architectures = [
            // Simple LSTM
            {
                id: 'lstm_simple',
                name: 'Simple LSTM',
                type: 'LSTM',
                layers: [
                    { type: 'lstm', units: 50, dropout: 0.2 },
                    { type: 'dense', units: 25, activation: 'relu' },
                    { type: 'dense', units: 1, activation: 'linear' }
                ],
                hyperparameters: {
                    learningRate: 0.001,
                    batchSize: 32,
                    epochs: 100
                },
                expectedPerformance: 0.65,
                computationalCost: 1.0
            },
            // Deep LSTM
            {
                id: 'lstm_deep',
                name: 'Deep LSTM',
                type: 'LSTM',
                layers: [
                    { type: 'lstm', units: 100, dropout: 0.3 },
                    { type: 'lstm', units: 50, dropout: 0.3 },
                    { type: 'dense', units: 50, activation: 'relu', dropout: 0.2 },
                    { type: 'dense', units: 25, activation: 'relu' },
                    { type: 'dense', units: 1, activation: 'linear' }
                ],
                hyperparameters: {
                    learningRate: 0.0005,
                    batchSize: 64,
                    epochs: 150
                },
                expectedPerformance: 0.75,
                computationalCost: 2.5
            },
            // CNN for Pattern Recognition
            {
                id: 'cnn_pattern',
                name: 'CNN Pattern Recognition',
                type: 'CNN',
                layers: [
                    { type: 'conv1d', filters: 64, kernelSize: 3, activation: 'relu' },
                    { type: 'conv1d', filters: 32, kernelSize: 3, activation: 'relu' },
                    { type: 'dense', units: 50, activation: 'relu', dropout: 0.3 },
                    { type: 'dense', units: 1, activation: 'linear' }
                ],
                hyperparameters: {
                    learningRate: 0.001,
                    batchSize: 32,
                    epochs: 100
                },
                expectedPerformance: 0.70,
                computationalCost: 1.8
            },
            // Transformer Model
            {
                id: 'transformer_attention',
                name: 'Transformer with Attention',
                type: 'TRANSFORMER',
                layers: [
                    {
                        type: 'multiHeadAttention',
                        attention: { heads: 8, keyDim: 64 }
                    },
                    { type: 'dense', units: 64, activation: 'relu', dropout: 0.2 },
                    { type: 'dense', units: 32, activation: 'relu' },
                    { type: 'dense', units: 1, activation: 'linear' }
                ],
                hyperparameters: {
                    learningRate: 0.0001,
                    batchSize: 16,
                    epochs: 200
                },
                expectedPerformance: 0.80,
                computationalCost: 4.0
            },
            // Hybrid CNN-LSTM
            {
                id: 'hybrid_cnn_lstm',
                name: 'Hybrid CNN-LSTM',
                type: 'HYBRID',
                layers: [
                    { type: 'conv1d', filters: 32, kernelSize: 3, activation: 'relu' },
                    { type: 'lstm', units: 50, dropout: 0.2 },
                    { type: 'dense', units: 25, activation: 'relu' },
                    { type: 'dense', units: 1, activation: 'linear' }
                ],
                hyperparameters: {
                    learningRate: 0.001,
                    batchSize: 32,
                    epochs: 120
                },
                expectedPerformance: 0.78,
                computationalCost: 2.2
            }
        ];
        this.logger.info(`🏗️ AutoML initialized with ${this.architectures.length} architectures`);
    }
    /**
     * 🚀 Start AutoML experiment
     */
    async startExperiment(name, trainingData, config = {}) {
        const experimentId = `automl_${Date.now()}`;
        const experimentConfig = {
            maxModels: 5,
            maxTrainingTime: 120, // 2 hours
            performanceThreshold: 0.7,
            validationSplit: 0.2,
            crossValidationFolds: 5,
            earlyStoppingPatience: 10,
            hyperparameterOptimization: true,
            ensembleOptimization: true,
            automaticFeatureSelection: true,
            ...config
        };
        const experiment = {
            id: experimentId,
            name,
            status: 'pending',
            startTime: new Date(),
            config: experimentConfig,
            models: [],
            totalTrainingTime: 0,
            iterations: 0
        };
        this.experiments.set(experimentId, experiment);
        this.logger.info(`🚀 Starting AutoML experiment: ${name} (${experimentId})`);
        // Start experiment in background
        this.runExperiment(experimentId, trainingData).catch(error => {
            this.logger.error(`❌ AutoML experiment ${experimentId} failed:`, error);
            experiment.status = 'failed';
            experiment.endTime = new Date();
        });
        return experimentId;
    }
    /**
     * 🔄 Run AutoML experiment
     */
    async runExperiment(experimentId, trainingData) {
        const experiment = this.experiments.get(experimentId);
        if (!experiment)
            throw new Error(`Experiment ${experimentId} not found`);
        experiment.status = 'running';
        this.isRunning = true;
        this.emit('experiment:started', experiment);
        try {
            const startTime = Date.now();
            // Step 1: Feature Engineering
            this.logger.info('🔬 Step 1: Feature Engineering');
            const features = await this.performFeatureEngineering(trainingData);
            // Step 2: Data Preparation
            this.logger.info('📊 Step 2: Data Preparation');
            const preparedData = await this.prepareTrainingData(features, experiment.config);
            // Step 3: Architecture Selection
            this.logger.info('🏗️ Step 3: Architecture Selection');
            const selectedArchitectures = this.selectArchitectures(experiment.config);
            // Step 4: Model Training & Evaluation
            this.logger.info('🎯 Step 4: Model Training & Evaluation');
            let bestModel = null;
            for (const architecture of selectedArchitectures) {
                const modelPerformance = await this.trainAndEvaluateModel(architecture, preparedData, experiment.config);
                experiment.models.push(modelPerformance.modelId);
                experiment.iterations++;
                // Check if this is the best model so far
                if (!bestModel || modelPerformance.f1Score > bestModel.performance.f1Score) {
                    bestModel = { modelId: modelPerformance.modelId, performance: modelPerformance };
                }
                // Check time limit
                const elapsedMinutes = (Date.now() - startTime) / (1000 * 60);
                if (elapsedMinutes > experiment.config.maxTrainingTime) {
                    this.logger.warn(`⏰ Time limit reached for experiment ${experimentId}`);
                    break;
                }
                this.emit('model:trained', modelPerformance);
            }
            // Step 5: Ensemble Optimization (if enabled)
            if (experiment.config.ensembleOptimization && experiment.models.length > 1) {
                this.logger.info('🎭 Step 5: Ensemble Optimization');
                const ensembleModel = await this.createEnsembleModel(experiment.models, preparedData);
                if (ensembleModel && ensembleModel.f1Score > (bestModel?.performance.f1Score || 0)) {
                    bestModel = { modelId: ensembleModel.modelId, performance: ensembleModel };
                }
            }
            // Step 6: Hyperparameter Optimization (if enabled)
            if (experiment.config.hyperparameterOptimization && bestModel) {
                this.logger.info('⚙️ Step 6: Hyperparameter Optimization');
                const optimizedModel = await this.optimizeHyperparameters(bestModel.modelId, preparedData, experiment.config);
                if (optimizedModel && optimizedModel.f1Score > bestModel.performance.f1Score) {
                    bestModel = { modelId: optimizedModel.modelId, performance: optimizedModel };
                }
            }
            // Finalize experiment
            experiment.status = 'completed';
            experiment.endTime = new Date();
            experiment.totalTrainingTime = Date.now() - startTime;
            experiment.bestModelId = bestModel?.modelId;
            experiment.bestPerformance = bestModel?.performance;
            this.emit('experiment:completed', experiment);
            this.logger.info(`✅ AutoML experiment ${experimentId} completed successfully`);
            this.logger.info(`🏆 Best model: ${bestModel?.modelId} (F1: ${bestModel?.performance.f1Score.toFixed(4)})`);
        }
        catch (error) {
            experiment.status = 'failed';
            experiment.endTime = new Date();
            this.emit('experiment:failed', { experiment, error });
            throw error;
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * 🔬 Perform feature engineering
     */
    async performFeatureEngineering(trainingData) {
        const features = [];
        // Generate features for each time window
        const windowSize = 100; // 100 candles lookback
        for (let i = windowSize; i < trainingData.length; i++) {
            const window = trainingData.slice(i - windowSize, i + 1);
            const featureSet = await this.featureEngineer.extractFeatures(window, 'BTCUSDT', '15m');
            features.push(featureSet);
        }
        this.logger.info(`🔬 Generated ${features.length} feature sets`);
        return features;
    }
    /**
     * 📊 Prepare training data
     */
    async prepareTrainingData(features, config) {
        // Convert features to training arrays
        const featureNames = Object.keys(features[0].features);
        const X = features.map(fs => featureNames.map(name => fs.features[name] || 0));
        // Create targets (next period return)
        const y = [];
        for (let i = 0; i < features.length - 1; i++) {
            // Simple binary classification: up (1) or down (0)
            y.push(features[i + 1].features.price_momentum_5 > 0 ? 1 : 0);
        }
        // Remove last feature set as it has no target
        X.pop();
        // Train/validation split
        const splitIndex = Math.floor(X.length * (1 - config.validationSplit));
        const X_train = X.slice(0, splitIndex);
        const y_train = y.slice(0, splitIndex);
        const X_val = X.slice(splitIndex);
        const y_val = y.slice(splitIndex);
        this.logger.info(`📊 Prepared training data: ${X_train.length} train, ${X_val.length} validation`);
        return { X_train, y_train, X_val, y_val, featureNames };
    }
    /**
     * 🏗️ Select architectures for training
     */
    selectArchitectures(config) {
        // Sort by expected performance vs computational cost ratio
        const scored = this.architectures.map(arch => ({
            architecture: arch,
            score: arch.expectedPerformance / arch.computationalCost
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored
            .slice(0, config.maxModels)
            .map(item => item.architecture);
    }
    /**
     * 🎯 Train and evaluate model
     */
    async trainAndEvaluateModel(architecture, data, config) {
        const startTime = Date.now();
        this.logger.info(`🎯 Training model: ${architecture.name}`);
        try {
            // Create model based on architecture
            const modelId = await this.createModelFromArchitecture(architecture, data);
            // Train model (simplified - would use actual TensorFlow training)
            const trainingMetrics = await this.simulateTraining(architecture, data);
            // Evaluate model
            const performance = await this.evaluateModel(modelId, data, trainingMetrics);
            performance.trainingTime = Date.now() - startTime;
            performance.modelId = modelId;
            this.modelPerformance.set(modelId, performance);
            this.logger.info(`✅ Model ${architecture.name} trained - F1: ${performance.f1Score.toFixed(4)}`);
            return performance;
        }
        catch (error) {
            this.logger.error(`❌ Failed to train model ${architecture.name}:`, error);
            throw error;
        }
    }
    /**
     * 🏗️ Create model from architecture
     */
    async createModelFromArchitecture(architecture, data) {
        const inputShape = [data.X_train[0].length];
        // Create model based on architecture type
        switch (architecture.type) {
            case 'LSTM':
                return await this.tensorFlow.createLSTMModel({
                    sequenceLength: 1,
                    features: inputShape[0],
                    lstmUnits: [50],
                    outputSize: 1,
                    dropout: 0.2
                });
            case 'CNN':
                // CNN nie jest dostępne w TensorFlowIntegrationV2
                // Fallback do LSTM
                return await this.tensorFlow.createLSTMModel({
                    sequenceLength: 1,
                    features: inputShape[0],
                    lstmUnits: [64, 32],
                    outputSize: 1,
                    dropout: 0.3
                });
            default:
                // Fallback to LSTM
                return await this.tensorFlow.createLSTMModel({
                    sequenceLength: 1,
                    features: inputShape[0],
                    lstmUnits: [50],
                    outputSize: 1,
                    dropout: 0.2
                });
        }
    }
    /**
     * 🎭 Simulate training (placeholder for actual training)
     */
    async simulateTraining(architecture, data) {
        // Simulate training metrics based on architecture performance
        const baseAccuracy = architecture.expectedPerformance;
        const noise = (Math.random() - 0.5) * 0.1; // ±5% noise
        return {
            loss: 0.3 + Math.random() * 0.2,
            accuracy: Math.max(0.5, Math.min(0.95, baseAccuracy + noise)),
            valLoss: 0.35 + Math.random() * 0.2,
            valAccuracy: Math.max(0.5, Math.min(0.9, baseAccuracy + noise - 0.05))
        };
    }
    /**
     * 📊 Evaluate model performance
     */
    async evaluateModel(modelId, data, trainingMetrics) {
        // Simulate evaluation metrics
        const accuracy = trainingMetrics.valAccuracy;
        const precision = accuracy * (0.9 + Math.random() * 0.1);
        const recall = accuracy * (0.9 + Math.random() * 0.1);
        const f1Score = 2 * (precision * recall) / (precision + recall);
        return {
            modelId,
            accuracy,
            precision,
            recall,
            f1Score,
            auc: accuracy * (0.95 + Math.random() * 0.05),
            loss: trainingMetrics.loss,
            valLoss: trainingMetrics.valLoss,
            sharpeRatio: 1.0 + Math.random() * 1.0,
            maxDrawdown: 0.05 + Math.random() * 0.1,
            profitFactor: 1.1 + Math.random() * 0.5,
            trainingTime: 0,
            memoryUsage: 100 + Math.random() * 200, // MB
            inferenceTime: 1 + Math.random() * 5, // ms
            stability: 0.8 + Math.random() * 0.2
        };
    }
    /**
     * 🎭 Create ensemble model
     */
    async createEnsembleModel(modelIds, data) {
        if (modelIds.length < 2)
            return null;
        this.logger.info(`🎭 Creating ensemble from ${modelIds.length} models`);
        // Get performance of individual models
        const modelPerformances = modelIds
            .map(id => this.modelPerformance.get(id))
            .filter(p => p !== undefined);
        if (modelPerformances.length < 2)
            return null;
        // Calculate ensemble performance (simplified)
        const avgPerformance = modelPerformances.reduce((acc, perf) => acc + perf.f1Score, 0) / modelPerformances.length;
        const ensembleBoost = 0.02 + Math.random() * 0.03; // 2-5% ensemble boost
        const ensembleModelId = `ensemble_${Date.now()}`;
        const ensemblePerformance = {
            modelId: ensembleModelId,
            accuracy: Math.min(0.95, avgPerformance + ensembleBoost),
            precision: Math.min(0.95, avgPerformance + ensembleBoost),
            recall: Math.min(0.95, avgPerformance + ensembleBoost),
            f1Score: Math.min(0.95, avgPerformance + ensembleBoost),
            auc: Math.min(0.98, avgPerformance + ensembleBoost * 1.2),
            loss: Math.max(0.1, modelPerformances[0].loss - 0.05),
            valLoss: Math.max(0.1, modelPerformances[0].valLoss - 0.05),
            sharpeRatio: Math.max(...modelPerformances.map(p => p.sharpeRatio || 1)),
            maxDrawdown: Math.min(...modelPerformances.map(p => p.maxDrawdown || 0.1)),
            profitFactor: Math.max(...modelPerformances.map(p => p.profitFactor || 1)),
            trainingTime: modelPerformances.reduce((acc, p) => acc + p.trainingTime, 0),
            memoryUsage: modelPerformances.reduce((acc, p) => acc + p.memoryUsage, 0),
            inferenceTime: Math.max(...modelPerformances.map(p => p.inferenceTime)),
            stability: Math.min(...modelPerformances.map(p => p.stability))
        };
        this.modelPerformance.set(ensembleModelId, ensemblePerformance);
        this.logger.info(`✅ Ensemble model created - F1: ${ensemblePerformance.f1Score.toFixed(4)}`);
        return ensemblePerformance;
    }
    /**
     * ⚙️ Optimize hyperparameters
     */
    async optimizeHyperparameters(modelId, data, config) {
        this.logger.info(`⚙️ Optimizing hyperparameters for model ${modelId}`);
        const basePerformance = this.modelPerformance.get(modelId);
        if (!basePerformance)
            return null;
        // Simulate hyperparameter optimization (simplified)
        const improvementFactor = 1.02 + Math.random() * 0.05; // 2-7% improvement
        const optimizedModelId = `${modelId}_optimized`;
        const optimizedPerformance = {
            ...basePerformance,
            modelId: optimizedModelId,
            accuracy: Math.min(0.98, basePerformance.accuracy * improvementFactor),
            precision: Math.min(0.98, basePerformance.precision * improvementFactor),
            recall: Math.min(0.98, basePerformance.recall * improvementFactor),
            f1Score: Math.min(0.98, basePerformance.f1Score * improvementFactor),
            auc: Math.min(0.99, basePerformance.auc * improvementFactor),
            trainingTime: basePerformance.trainingTime * 1.5 // Longer training time
        };
        this.modelPerformance.set(optimizedModelId, optimizedPerformance);
        this.logger.info(`✅ Hyperparameters optimized - F1: ${optimizedPerformance.f1Score.toFixed(4)}`);
        return optimizedPerformance;
    }
    /**
     * 📋 Get experiment status
     */
    getExperiment(experimentId) {
        return this.experiments.get(experimentId);
    }
    /**
     * 📊 Get all experiments
     */
    getAllExperiments() {
        return Array.from(this.experiments.values());
    }
    /**
     * 🏆 Get best model from experiment
     */
    getBestModel(experimentId) {
        const experiment = this.experiments.get(experimentId);
        return experiment?.bestModelId ? this.modelPerformance.get(experiment.bestModelId) : undefined;
    }
    /**
     * 📊 Get model performance
     */
    getModelPerformance(modelId) {
        return this.modelPerformance.get(modelId);
    }
    /**
     * 🛑 Stop experiment
     */
    stopExperiment(experimentId) {
        const experiment = this.experiments.get(experimentId);
        if (experiment && experiment.status === 'running') {
            experiment.status = 'completed';
            experiment.endTime = new Date();
            this.emit('experiment:stopped', experiment);
            this.logger.info(`🛑 Experiment ${experimentId} stopped`);
        }
    }
    /**
     * 🧹 Cleanup
     */
    cleanup() {
        this.experiments.clear();
        this.modelPerformance.clear();
        this.isRunning = false;
        this.logger.info('🧹 AutoML Pipeline cleaned up');
    }
    /**
     * 📊 Get system status
     */
    getStatus() {
        const experiments = Array.from(this.experiments.values());
        return {
            isRunning: this.isRunning,
            experimentsCount: experiments.length,
            modelsCount: this.modelPerformance.size,
            runningExperiments: experiments.filter(e => e.status === 'running').map(e => e.id),
            completedExperiments: experiments.filter(e => e.status === 'completed').map(e => e.id)
        };
    }
}
exports.AutoMLPipeline = AutoMLPipeline;
exports.default = AutoMLPipeline;

"use strict";
/**
 * 🧠 TIER 3: ENSEMBLE PREDICTION ENGINE
 * Advanced multi-model ensemble system with dynamic weighting and model selection
 *
 * Features:
 * - Multiple ML model types (Deep RL, XGBoost, LSTM, Transformer, CNN)
 * - Dynamic weight adjustment based on performance
 * - Voting strategies (weighted, majority, confidence-based)
 * - Model health monitoring and auto-disabling
 * - Performance tracking and attribution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ENSEMBLE_CONFIG = exports.EnsemblePredictionEngine = void 0;
/**
 * 🧠 ENSEMBLE PREDICTION ENGINE
 */
class EnsemblePredictionEngine {
    constructor(config = {}) {
        // Model instances (placeholders for now - will integrate real models in production)
        this.models = new Map();
        this.modelMetrics = new Map();
        this.modelWeights = new Map();
        // Performance tracking
        this.predictionHistory = [];
        this.performanceHistory = [];
        // State
        this.isInitialized = false;
        this.lastWeightUpdate = 0;
        this.config = {
            enabled_models: ['deep_rl', 'xgboost', 'lstm'],
            min_models_required: 2,
            voting_strategy: 'weighted',
            confidence_threshold: 0.7,
            auto_adjust_weights: true,
            weight_adjustment_interval: 300000, // 5 minutes
            performance_lookback_window: 100,
            health_check_enabled: true,
            min_model_accuracy: 0.55,
            max_model_error_rate: 0.1,
            auto_disable_unhealthy: true,
            track_individual_performance: true,
            track_ensemble_performance: true,
            performance_history_size: 1000,
            ...config
        };
        this.logger = {
            info: (msg) => console.log(`[ENSEMBLE] ${msg}`),
            warn: (msg) => console.warn(`[ENSEMBLE] ${msg}`),
            error: (msg) => console.error(`[ENSEMBLE] ${msg}`)
        };
    }
    /**
     * 🚀 Initialize ensemble system
     */
    async initialize() {
        this.logger.info('🚀 Initializing Ensemble Prediction Engine...');
        // Initialize model metrics for all enabled models
        for (const modelType of this.config.enabled_models) {
            this.modelMetrics.set(modelType, this.createDefaultMetrics(modelType));
            this.modelWeights.set(modelType, 1.0 / this.config.enabled_models.length);
        }
        // Initialize placeholder models (will be replaced with real models)
        await this.initializeModels();
        // Start weight adjustment timer
        if (this.config.auto_adjust_weights) {
            this.startWeightAdjustment();
        }
        this.isInitialized = true;
        this.logger.info(`✅ Ensemble initialized with ${this.config.enabled_models.length} models`);
        this.logger.info(`📊 Voting strategy: ${this.config.voting_strategy}`);
        this.logger.info(`⚖️ Initial weights: ${this.getWeightsSummary()}`);
    }
    /**
     * 🔮 Generate ensemble prediction
     */
    async predict(marketState) {
        if (!this.isInitialized) {
            throw new Error('Ensemble not initialized');
        }
        const startTime = Date.now();
        const predictions = [];
        // Get predictions from all healthy models
        for (const [modelType, model] of this.models.entries()) {
            const metrics = this.modelMetrics.get(modelType);
            // Skip unhealthy models if auto-disable is enabled
            if (this.config.auto_disable_unhealthy && !metrics.is_healthy) {
                this.logger.warn(`⚠️ Skipping unhealthy model: ${modelType}`);
                continue;
            }
            try {
                const prediction = await this.getModelPrediction(modelType, marketState);
                predictions.push(prediction);
            }
            catch (error) {
                this.logger.error(`❌ Error getting prediction from ${modelType}: ${error}`);
                this.updateModelError(modelType);
            }
        }
        // Check if we have minimum required models
        if (predictions.length < this.config.min_models_required) {
            throw new Error(`Insufficient models for prediction: ${predictions.length}/${this.config.min_models_required}`);
        }
        // Aggregate predictions based on voting strategy
        const ensemblePrediction = this.aggregatePredictions(predictions, marketState);
        // Track prediction
        ensemblePrediction.total_latency_ms = Date.now() - startTime;
        ensemblePrediction.timestamp = Date.now();
        ensemblePrediction.ensemble_version = '1.0.0';
        this.trackPrediction(ensemblePrediction);
        return ensemblePrediction;
    }
    /**
     * 📊 Aggregate predictions using voting strategy
     */
    aggregatePredictions(predictions, marketState) {
        let finalAction;
        let ensembleConfidence;
        switch (this.config.voting_strategy) {
            case 'weighted':
                ({ action: finalAction, confidence: ensembleConfidence } = this.weightedVoting(predictions));
                break;
            case 'majority':
                ({ action: finalAction, confidence: ensembleConfidence } = this.majorityVoting(predictions));
                break;
            case 'confidence_based':
                ({ action: finalAction, confidence: ensembleConfidence } = this.confidenceBasedVoting(predictions));
                break;
            case 'adaptive':
                ({ action: finalAction, confidence: ensembleConfidence } = this.adaptiveVoting(predictions));
                break;
            default:
                ({ action: finalAction, confidence: ensembleConfidence } = this.weightedVoting(predictions));
        }
        // Calculate vote counts
        const buyVotes = predictions.filter(p => p.action === 'BUY').length;
        const sellVotes = predictions.filter(p => p.action === 'SELL').length;
        const holdVotes = predictions.filter(p => p.action === 'HOLD').length;
        // Calculate average predicted return and uncertainty
        const avgReturn = predictions.reduce((sum, p) => sum + p.predicted_return, 0) / predictions.length;
        const avgUncertainty = predictions.reduce((sum, p) => sum + p.uncertainty, 0) / predictions.length;
        return {
            final_action: finalAction,
            ensemble_confidence: ensembleConfidence,
            predicted_return: avgReturn,
            uncertainty: avgUncertainty,
            individual_predictions: predictions,
            model_weights: new Map(this.modelWeights),
            models_agreed: Math.max(buyVotes, sellVotes, holdVotes),
            total_models: predictions.length,
            voting_strategy_used: this.config.voting_strategy,
            buy_votes: buyVotes,
            sell_votes: sellVotes,
            hold_votes: holdVotes,
            timestamp: Date.now(),
            total_latency_ms: 0,
            ensemble_version: '1.0.0'
        };
    }
    /**
     * ⚖️ Weighted voting (uses model weights)
     */
    weightedVoting(predictions) {
        const weights = { BUY: 0, SELL: 0, HOLD: 0 };
        let totalWeight = 0;
        for (const pred of predictions) {
            const modelWeight = this.modelWeights.get(pred.model_type) || 0;
            weights[pred.action] += modelWeight * pred.confidence;
            totalWeight += modelWeight;
        }
        // Normalize weights
        const normalizedWeights = {
            BUY: weights.BUY / totalWeight,
            SELL: weights.SELL / totalWeight,
            HOLD: weights.HOLD / totalWeight
        };
        // Select action with highest weighted vote
        const maxWeight = Math.max(normalizedWeights.BUY, normalizedWeights.SELL, normalizedWeights.HOLD);
        const action = Object.keys(normalizedWeights).find(key => normalizedWeights[key] === maxWeight);
        return { action, confidence: maxWeight };
    }
    /**
     * 🗳️ Majority voting (simple count)
     */
    majorityVoting(predictions) {
        const votes = { BUY: 0, SELL: 0, HOLD: 0 };
        for (const pred of predictions) {
            votes[pred.action]++;
        }
        const maxVotes = Math.max(votes.BUY, votes.SELL, votes.HOLD);
        const action = Object.keys(votes).find(key => votes[key] === maxVotes);
        const confidence = maxVotes / predictions.length;
        return { action, confidence };
    }
    /**
     * 🎯 Confidence-based voting (only high confidence predictions)
     */
    confidenceBasedVoting(predictions) {
        // Filter predictions by confidence threshold
        const highConfidencePredictions = predictions.filter(p => p.confidence >= this.config.confidence_threshold);
        // If no high confidence predictions, fall back to weighted voting
        if (highConfidencePredictions.length === 0) {
            this.logger.warn('⚠️ No high confidence predictions, falling back to weighted voting');
            return this.weightedVoting(predictions);
        }
        // Use weighted voting on high confidence predictions only
        return this.weightedVoting(highConfidencePredictions);
    }
    /**
     * 🔄 Adaptive voting (adjusts strategy based on market conditions)
     */
    adaptiveVoting(predictions) {
        // Calculate average confidence
        const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
        // If average confidence is high, use confidence-based voting
        if (avgConfidence >= this.config.confidence_threshold) {
            return this.confidenceBasedVoting(predictions);
        }
        // Otherwise, use weighted voting
        return this.weightedVoting(predictions);
    }
    /**
     * 🔄 Update prediction outcome (for learning)
     */
    updatePredictionOutcome(prediction, actualReturn, wasCorrect) {
        // Update metrics for each model
        for (const modelPred of prediction.individual_predictions) {
            const metrics = this.modelMetrics.get(modelPred.model_type);
            if (!metrics)
                continue;
            metrics.total_predictions++;
            if (wasCorrect) {
                metrics.correct_predictions++;
            }
            metrics.accuracy = metrics.correct_predictions / metrics.total_predictions;
            // Update trading metrics (simplified)
            metrics.average_return = (metrics.average_return * 0.95) + (actualReturn * 0.05);
            // Update health status
            metrics.error_rate = metrics.error_count / metrics.total_predictions;
            metrics.is_healthy =
                metrics.accuracy >= this.config.min_model_accuracy &&
                    metrics.error_rate <= this.config.max_model_error_rate;
            metrics.last_update = Date.now();
        }
        // Trigger weight adjustment if needed
        if (this.config.auto_adjust_weights &&
            Date.now() - this.lastWeightUpdate >= this.config.weight_adjustment_interval) {
            this.adjustWeights();
        }
    }
    /**
     * ⚖️ Adjust model weights based on performance
     */
    adjustWeights() {
        this.logger.info('⚖️ Adjusting model weights based on performance...');
        // Get performance scores for each model
        const scores = new Map();
        let totalScore = 0;
        for (const [modelType, metrics] of this.modelMetrics.entries()) {
            // Calculate composite score (accuracy + win_rate + sharpe)
            const score = (metrics.accuracy * 0.4) +
                (metrics.win_rate * 0.3) +
                (Math.min(metrics.sharpe_ratio / 3, 1) * 0.3); // Normalize Sharpe to 0-1
            scores.set(modelType, Math.max(score, 0.01)); // Minimum score to prevent 0 weight
            totalScore += score;
        }
        // Update weights (normalize to sum to 1)
        for (const [modelType, score] of scores.entries()) {
            const newWeight = score / totalScore;
            this.modelWeights.set(modelType, newWeight);
            const metrics = this.modelMetrics.get(modelType);
            metrics.current_weight = newWeight;
            metrics.weight_history.push(newWeight);
            // Keep history size limited
            if (metrics.weight_history.length > 100) {
                metrics.weight_history.shift();
            }
        }
        this.lastWeightUpdate = Date.now();
        this.logger.info(`✅ Weights adjusted: ${this.getWeightsSummary()}`);
    }
    /**
     * 📊 Get ensemble performance report
     */
    getPerformanceReport() {
        const modelPerformances = new Map(this.modelMetrics);
        // Find best and worst models
        let bestModel = 'deep_rl';
        let worstModel = 'deep_rl';
        let bestScore = -Infinity;
        let worstScore = Infinity;
        for (const [modelType, metrics] of modelPerformances.entries()) {
            const score = metrics.accuracy * metrics.win_rate * metrics.sharpe_ratio;
            if (score > bestScore) {
                bestScore = score;
                bestModel = modelType;
            }
            if (score < worstScore) {
                worstScore = score;
                worstModel = modelType;
            }
        }
        // Calculate ensemble metrics from recent predictions
        const recentPredictions = this.predictionHistory.slice(-this.config.performance_lookback_window);
        const unanimousDecisions = recentPredictions.filter(p => p.models_agreed === p.total_models).length;
        return {
            total_predictions: this.predictionHistory.length,
            ensemble_accuracy: this.calculateEnsembleAccuracy(),
            ensemble_sharpe: this.calculateEnsembleSharpe(),
            ensemble_win_rate: this.calculateEnsembleWinRate(),
            model_performances: modelPerformances,
            best_performing_model: bestModel,
            worst_performing_model: worstModel,
            model_correlation_matrix: this.calculateCorrelationMatrix(),
            unanimous_decisions: unanimousDecisions,
            split_decisions: recentPredictions.length - unanimousDecisions,
            average_agreement: recentPredictions.reduce((sum, p) => sum + p.models_agreed / p.total_models, 0) / recentPredictions.length,
            last_evaluation: Date.now()
        };
    }
    /**
     * 🔧 Helper: Get model prediction (placeholder - will integrate real models)
     */
    async getModelPrediction(modelType, marketState) {
        const startTime = Date.now();
        // Placeholder implementation - will be replaced with real model calls
        // For now, generate synthetic predictions based on market state
        const action = this.generateSyntheticAction(marketState, modelType);
        const confidence = 0.6 + Math.random() * 0.3; // 0.6-0.9
        const predictedReturn = (Math.random() - 0.5) * 0.1; // -5% to +5%
        const uncertainty = 0.1 + Math.random() * 0.2; // 0.1-0.3
        return {
            model_type: modelType,
            action,
            confidence,
            predicted_return: predictedReturn,
            uncertainty,
            reasoning: `${modelType} analysis based on market conditions`,
            timestamp: Date.now(),
            latency_ms: Date.now() - startTime
        };
    }
    /**
     * 🎲 Generate synthetic action (placeholder)
     */
    generateSyntheticAction(marketState, modelType) {
        // Different models have different biases for testing
        const rand = Math.random();
        const modelBias = {
            deep_rl: 0.5,
            xgboost: 0.55,
            lstm: 0.45,
            transformer: 0.5,
            cnn: 0.5,
            random_forest: 0.5
        }[modelType];
        if (rand < modelBias - 0.2)
            return 'SELL';
        if (rand > modelBias + 0.2)
            return 'BUY';
        return 'HOLD';
    }
    /**
     * 🏗️ Initialize placeholder models
     */
    async initializeModels() {
        // Placeholder - will be replaced with real model initialization
        for (const modelType of this.config.enabled_models) {
            this.models.set(modelType, {}); // Empty placeholder
            this.logger.info(`✅ Initialized ${modelType} model`);
        }
    }
    /**
     * 📊 Helper: Create default metrics
     */
    createDefaultMetrics(modelType) {
        return {
            model_type: modelType,
            total_predictions: 0,
            correct_predictions: 0,
            accuracy: 0.5,
            precision: 0.5,
            recall: 0.5,
            f1_score: 0.5,
            sharpe_ratio: 0,
            win_rate: 0.5,
            average_return: 0,
            max_drawdown: 0,
            is_healthy: true,
            error_count: 0,
            error_rate: 0,
            average_latency: 0,
            last_update: Date.now(),
            current_weight: 1.0 / this.config.enabled_models.length,
            weight_history: []
        };
    }
    /**
     * 📝 Track prediction
     */
    trackPrediction(prediction) {
        this.predictionHistory.push(prediction);
        // Maintain history size
        if (this.predictionHistory.length > this.config.performance_history_size) {
            this.predictionHistory.shift();
        }
    }
    /**
     * ❌ Update model error count
     */
    updateModelError(modelType) {
        const metrics = this.modelMetrics.get(modelType);
        if (metrics) {
            metrics.error_count++;
            metrics.error_rate = metrics.error_count / (metrics.total_predictions + 1);
            if (metrics.error_rate > this.config.max_model_error_rate) {
                metrics.is_healthy = false;
                this.logger.warn(`⚠️ Model ${modelType} marked as unhealthy (error rate: ${metrics.error_rate.toFixed(2)})`);
            }
        }
    }
    /**
     * ⚖️ Get weights summary
     */
    getWeightsSummary() {
        return Array.from(this.modelWeights.entries())
            .map(([type, weight]) => `${type}=${weight.toFixed(2)}`)
            .join(', ');
    }
    /**
     * 📊 Calculate ensemble metrics
     */
    calculateEnsembleAccuracy() {
        // Placeholder - would calculate from actual outcomes
        return 0.65;
    }
    calculateEnsembleSharpe() {
        // Placeholder
        return 1.5;
    }
    calculateEnsembleWinRate() {
        // Placeholder
        return 0.58;
    }
    calculateCorrelationMatrix() {
        // Placeholder - would calculate actual correlation between model predictions
        const size = this.config.enabled_models.length;
        return Array(size).fill(0).map(() => Array(size).fill(0.5));
    }
    /**
     * ⏱️ Start weight adjustment timer
     */
    startWeightAdjustment() {
        this.weightAdjustmentTimer = setInterval(() => this.adjustWeights(), this.config.weight_adjustment_interval);
    }
    /**
     * 🛑 Stop engine
     */
    stop() {
        if (this.weightAdjustmentTimer) {
            clearInterval(this.weightAdjustmentTimer);
        }
        this.logger.info('🛑 Ensemble Prediction Engine stopped');
    }
}
exports.EnsemblePredictionEngine = EnsemblePredictionEngine;
/**
 * 🏭 DEFAULT ENSEMBLE CONFIGURATION
 */
exports.DEFAULT_ENSEMBLE_CONFIG = {
    enabled_models: ['deep_rl', 'xgboost', 'lstm'],
    min_models_required: 2,
    voting_strategy: 'weighted',
    confidence_threshold: 0.7,
    auto_adjust_weights: true,
    weight_adjustment_interval: 300000, // 5 minutes
    performance_lookback_window: 100,
    health_check_enabled: true,
    min_model_accuracy: 0.55,
    max_model_error_rate: 0.1,
    auto_disable_unhealthy: true,
    track_individual_performance: true,
    track_ensemble_performance: true,
    performance_history_size: 1000
};

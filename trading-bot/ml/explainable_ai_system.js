"use strict";
/**
 * 🔍 EXPLAINABLE AI SYSTEM
 * System wyjaśnialnej sztucznej inteligencji dla interpretacji modeli ML
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExplainableAISystem = void 0;
const events_1 = require("events");
const logger_1 = require("../infrastructure/logging/logger");
class ExplainableAISystem extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        // Cache for explanations
        this.explanationCache = new Map();
        this.modelInterpretations = new Map();
        // Feature descriptions
        this.featureDescriptions = new Map();
        this.logger = new logger_1.Logger('ExplainableAI');
        this.config = {
            enableSHAP: true,
            enableLIME: true,
            enableCounterfactual: true,
            topFeaturesCount: 10,
            perturbationSamples: 1000,
            confidenceThreshold: 0.7,
            generateSummary: true,
            cacheExplanations: true,
            ...config
        };
        this.initializeFeatureDescriptions();
        this.logger.info('🔍 Explainable AI System initialized');
    }
    /**
     * 📊 Generate comprehensive explanation for prediction
     */
    async explainPrediction(predictionResult, features, modelMetadata, inputData) {
        const startTime = Date.now();
        try {
            this.logger.debug(`🔍 Generating explanation for prediction: ${predictionResult.requestId}`);
            // Check cache
            const cacheKey = this.generateCacheKey(predictionResult, features);
            if (this.config.cacheExplanations && this.explanationCache.has(cacheKey)) {
                this.logger.debug('📋 Returning cached explanation');
                return this.explanationCache.get(cacheKey);
            }
            // Generate feature importances
            const featureImportances = await this.calculateFeatureImportances(features, predictionResult, modelMetadata);
            // Generate SHAP values if enabled
            let shapValues = [];
            if (this.config.enableSHAP) {
                shapValues = await this.calculateSHAPValues(features, predictionResult);
            }
            // Generate LIME explanation if enabled
            let limeExplanation = [];
            if (this.config.enableLIME) {
                limeExplanation = await this.generateLIMEExplanation(features, predictionResult);
            }
            // Generate decision path
            const decisionPath = this.generateDecisionPath(features, predictionResult);
            // Identify top factors
            const topFactors = this.identifyTopFactors(featureImportances);
            // Calculate uncertainty and stability
            const uncertaintyScore = this.calculateUncertaintyScore(predictionResult, features);
            const predictionStability = this.calculatePredictionStability(features, predictionResult);
            const dataQuality = this.assessDataQuality(features, inputData);
            // Generate summary and recommendations
            const summary = this.generateSummary(predictionResult, topFactors, uncertaintyScore);
            const riskFactors = this.identifyRiskFactors(topFactors, uncertaintyScore);
            const recommendations = this.generateRecommendations(topFactors, predictionResult);
            const explanation = {
                predictionId: predictionResult.requestId,
                modelId: predictionResult.modelId,
                prediction: predictionResult.prediction,
                confidence: predictionResult.confidence,
                timestamp: Date.now(),
                featureImportances,
                shapValues,
                limeExplanation,
                decisionPath,
                topFactors,
                summary,
                riskFactors,
                recommendations,
                uncertaintyScore,
                predictionStability,
                dataQuality
            };
            // Cache explanation
            if (this.config.cacheExplanations) {
                this.explanationCache.set(cacheKey, explanation);
            }
            const processingTime = Date.now() - startTime;
            this.logger.debug(`✅ Explanation generated in ${processingTime}ms`);
            this.emit('explanation:generated', explanation);
            return explanation;
        }
        catch (error) {
            this.logger.error('❌ Failed to generate explanation:', error);
            throw error;
        }
    }
    /**
     * 🎯 Calculate feature importances using multiple methods
     */
    async calculateFeatureImportances(features, prediction, modelMetadata) {
        const importances = [];
        // Calculate importances for each feature
        for (const [featureName, value] of Object.entries(features.features)) {
            // Permutation importance approximation
            const importance = await this.calculatePermutationImportance(featureName, features, prediction);
            // Determine impact direction
            const impact = this.determineFeatureImpact(featureName, value, prediction);
            // Get feature category and description
            const category = this.getFeatureCategory(featureName);
            const description = this.featureDescriptions.get(featureName) || featureName;
            importances.push({
                feature: featureName,
                importance: Math.abs(importance),
                impact,
                confidence: this.calculateImportanceConfidence(importance, prediction.confidence),
                description,
                category
            });
        }
        // Sort by importance
        return importances.sort((a, b) => b.importance - a.importance);
    }
    /**
     * 🎯 Calculate SHAP values (simplified implementation)
     */
    async calculateSHAPValues(features, prediction) {
        const shapValues = [];
        const baseValue = 0.5; // Baseline prediction
        const totalContribution = prediction.prediction[0] - baseValue;
        // Calculate relative contributions
        const featureValues = Object.entries(features.features);
        const totalAbsValues = featureValues.reduce((sum, [_, value]) => sum + Math.abs(value), 0);
        for (const [featureName, value] of featureValues) {
            const relativeMagnitude = Math.abs(value) / totalAbsValues;
            const contribution = totalContribution * relativeMagnitude * Math.sign(value);
            shapValues.push({
                feature: featureName,
                value,
                baseValue,
                shapValue: contribution,
                contribution: contribution / totalContribution
            });
        }
        return shapValues.sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue));
    }
    /**
     * 🎯 Generate LIME explanation
     */
    async generateLIMEExplanation(features, prediction) {
        const explanations = [];
        // Simplified local linear approximation
        for (const [featureName, value] of Object.entries(features.features)) {
            // Calculate local linear coefficient
            const coefficient = this.calculateLocalCoefficient(featureName, value, prediction);
            const localImportance = Math.abs(coefficient * value);
            explanations.push({
                feature: featureName,
                coefficient,
                localImportance,
                confidence: this.calculateLocalConfidence(coefficient, prediction.confidence),
                interpretation: this.generateFeatureInterpretation(featureName, coefficient, value)
            });
        }
        return explanations.sort((a, b) => b.localImportance - a.localImportance);
    }
    /**
     * 🌳 Generate decision path
     */
    generateDecisionPath(features, prediction) {
        const path = [];
        const sortedFeatures = Object.entries(features.features)
            .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
            .slice(0, 5); // Top 5 features
        for (let i = 0; i < sortedFeatures.length; i++) {
            const [featureName, value] = sortedFeatures[i];
            const threshold = this.getFeatureThreshold(featureName);
            path.push({
                step: i + 1,
                feature: featureName,
                condition: value > threshold ? `${featureName} > ${threshold.toFixed(4)}` : `${featureName} <= ${threshold.toFixed(4)}`,
                threshold,
                decision: value > threshold ? 'right' : 'left',
                samples: Math.floor(Math.random() * 1000) + 100, // Simulated
                value,
                probability: this.calculateStepProbability(value, threshold)
            });
        }
        return path;
    }
    /**
     * 🎯 Identify top positive and negative factors
     */
    identifyTopFactors(importances) {
        const positive = importances
            .filter(f => f.impact === 'positive')
            .slice(0, this.config.topFeaturesCount / 2);
        const negative = importances
            .filter(f => f.impact === 'negative')
            .slice(0, this.config.topFeaturesCount / 2);
        return { positive, negative };
    }
    /**
     * 📝 Generate human-readable summary
     */
    generateSummary(prediction, topFactors, uncertaintyScore) {
        if (!this.config.generateSummary)
            return '';
        const predictionValue = prediction.prediction[0];
        const confidence = prediction.confidence;
        let summary = `Prediction: ${predictionValue > 0.5 ? 'BUY' : 'SELL'} signal with ${(confidence * 100).toFixed(1)}% confidence. `;
        if (topFactors.positive.length > 0) {
            const topPositive = topFactors.positive[0];
            summary += `Primary supporting factor: ${topPositive.description} (${(topPositive.importance * 100).toFixed(1)}% importance). `;
        }
        if (topFactors.negative.length > 0) {
            const topNegative = topFactors.negative[0];
            summary += `Main concern: ${topNegative.description} (${(topNegative.importance * 100).toFixed(1)}% importance). `;
        }
        if (uncertaintyScore > 0.3) {
            summary += 'Caution: Higher uncertainty detected in this prediction. ';
        }
        if (confidence < this.config.confidenceThreshold) {
            summary += 'Note: Prediction confidence is below threshold - consider additional analysis.';
        }
        return summary;
    }
    /**
     * ⚠️ Identify risk factors
     */
    identifyRiskFactors(topFactors, uncertaintyScore) {
        const risks = [];
        if (uncertaintyScore > 0.4) {
            risks.push('High uncertainty in prediction - market conditions may be unstable');
        }
        if (topFactors.negative.length > 0) {
            const strongNegative = topFactors.negative.filter(f => f.importance > 0.15);
            if (strongNegative.length > 0) {
                risks.push(`Strong opposing signals detected: ${strongNegative.map(f => f.feature).join(', ')}`);
            }
        }
        // Check for conflicting signals
        if (topFactors.positive.length > 0 && topFactors.negative.length > 0) {
            const topPositiveImportance = topFactors.positive[0].importance;
            const topNegativeImportance = topFactors.negative[0].importance;
            if (Math.abs(topPositiveImportance - topNegativeImportance) < 0.05) {
                risks.push('Conflicting signals with similar strength - consider waiting for clearer direction');
            }
        }
        return risks;
    }
    /**
     * 💡 Generate actionable recommendations
     */
    generateRecommendations(topFactors, prediction) {
        const recommendations = [];
        // Based on confidence level
        if (prediction.confidence > 0.8) {
            recommendations.push('High confidence prediction - suitable for normal position sizing');
        }
        else if (prediction.confidence > 0.6) {
            recommendations.push('Moderate confidence - consider reduced position sizing');
        }
        else {
            recommendations.push('Low confidence - wait for stronger signals or use minimal position size');
        }
        // Based on top factors
        if (topFactors.positive.length > 0) {
            const categories = [...new Set(topFactors.positive.slice(0, 3).map(f => f.category))];
            recommendations.push(`Monitor ${categories.join(', ')} indicators for signal continuation`);
        }
        // Pattern-based recommendations
        const patternFeatures = topFactors.positive.filter(f => f.category === 'pattern');
        if (patternFeatures.length > 0) {
            recommendations.push('Technical patterns detected - watch for confirmation on next few candles');
        }
        return recommendations;
    }
    /**
     * 📊 Generate counterfactual analysis
     */
    async generateCounterfactualAnalysis(features, prediction) {
        const originalPrediction = prediction.prediction[0];
        const targetPrediction = originalPrediction > 0.5 ? 0.3 : 0.7; // Flip decision
        const changedFeatures = [];
        const minimalChanges = [];
        // Find features that would change the prediction
        const sortedFeatures = Object.entries(features.features)
            .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a));
        for (const [featureName, value] of sortedFeatures.slice(0, 10)) {
            // Calculate required change to flip prediction
            const sensitivity = this.calculateFeatureSensitivity(featureName, value);
            const requiredChange = (targetPrediction - originalPrediction) / sensitivity;
            changedFeatures.push({
                feature: featureName,
                originalValue: value,
                counterfactualValue: value + requiredChange,
                change: requiredChange,
                impact: Math.abs(requiredChange * sensitivity)
            });
            minimalChanges.push({
                feature: featureName,
                requiredChange: Math.abs(requiredChange),
                feasibility: this.assessChangeFeasibility(featureName, requiredChange)
            });
        }
        // Sort by minimal changes
        minimalChanges.sort((a, b) => a.requiredChange - b.requiredChange);
        return {
            originalPrediction,
            counterfactualPrediction: targetPrediction,
            changedFeatures: changedFeatures.slice(0, 5),
            minimalChanges: minimalChanges.slice(0, 5)
        };
    }
    /**
     * 🔧 Helper methods
     */
    calculatePermutationImportance(featureName, features, prediction) {
        // Simplified permutation importance
        const originalValue = features.features[featureName];
        const perturbedValue = originalValue + (Math.random() - 0.5) * Math.abs(originalValue) * 0.1;
        // Estimate impact (simplified)
        const impact = (perturbedValue - originalValue) * this.getFeatureWeight(featureName);
        return impact;
    }
    determineFeatureImpact(featureName, value, prediction) {
        const correlation = this.getFeatureCorrelation(featureName, prediction.prediction[0]);
        if (Math.abs(correlation) < 0.1)
            return 'neutral';
        return correlation > 0 ? 'positive' : 'negative';
    }
    getFeatureCategory(featureName) {
        if (featureName.includes('rsi') || featureName.includes('ema') || featureName.includes('macd')) {
            return 'technical';
        }
        if (featureName.includes('mean') || featureName.includes('std') || featureName.includes('skew')) {
            return 'statistical';
        }
        if (featureName.includes('hour') || featureName.includes('day') || featureName.includes('trend')) {
            return 'temporal';
        }
        if (featureName.includes('support') || featureName.includes('resistance') || featureName.includes('level')) {
            return 'market_structure';
        }
        return 'pattern';
    }
    calculateImportanceConfidence(importance, predictionConfidence) {
        return Math.min(1.0, Math.abs(importance) * predictionConfidence);
    }
    calculateLocalCoefficient(featureName, value, prediction) {
        // Simplified local linear approximation
        return this.getFeatureWeight(featureName) * Math.sign(value);
    }
    calculateLocalConfidence(coefficient, predictionConfidence) {
        return Math.min(1.0, Math.abs(coefficient) * predictionConfidence);
    }
    generateFeatureInterpretation(featureName, coefficient, value) {
        const impact = coefficient > 0 ? 'supports' : 'opposes';
        const strength = Math.abs(coefficient) > 0.5 ? 'strongly' : Math.abs(coefficient) > 0.2 ? 'moderately' : 'weakly';
        return `${featureName} ${strength} ${impact} the prediction (value: ${value.toFixed(4)})`;
    }
    getFeatureThreshold(featureName) {
        // Return predefined or calculated thresholds
        const thresholds = {
            'rsi': 50,
            'rsi_oversold': 30,
            'rsi_overbought': 70,
            'volume_ratio': 1.0,
            'price_momentum': 0
        };
        return thresholds[featureName] || 0;
    }
    calculateStepProbability(value, threshold) {
        const distance = Math.abs(value - threshold);
        return Math.min(0.95, 0.5 + distance * 0.1);
    }
    calculateUncertaintyScore(prediction, features) {
        // Based on prediction confidence and feature variance
        const baseUncertainty = 1 - prediction.confidence;
        const featureVariance = this.calculateFeatureVariance(features);
        return Math.min(1.0, baseUncertainty + featureVariance * 0.3);
    }
    calculatePredictionStability(features, prediction) {
        // Estimate how stable the prediction would be to small perturbations
        return Math.max(0.1, prediction.confidence - this.calculateFeatureVariance(features) * 0.2);
    }
    assessDataQuality(features, inputData) {
        // Assess data quality based on completeness and consistency
        const featureValues = Object.values(features.features);
        const validFeatures = featureValues.filter(v => isFinite(v) && !isNaN(v)).length;
        const completeness = validFeatures / featureValues.length;
        const dataConsistency = this.calculateDataConsistency(inputData);
        return (completeness + dataConsistency) / 2;
    }
    calculateFeatureVariance(features) {
        const values = Object.values(features.features);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance) / values.length; // Normalized
    }
    calculateDataConsistency(inputData) {
        // Check for gaps, outliers, etc.
        let consistency = 1.0;
        for (let i = 1; i < inputData.length; i++) {
            const timeGap = inputData[i].time - inputData[i - 1].time;
            const expectedGap = 15 * 60 * 1000; // 15 minutes
            if (Math.abs(timeGap - expectedGap) > expectedGap * 0.1) {
                consistency -= 0.1;
            }
        }
        return Math.max(0.1, consistency);
    }
    getFeatureWeight(featureName) {
        // Predefined feature weights based on domain knowledge
        const weights = {
            'rsi': 0.8,
            'ema_short': 0.7,
            'macd_signal': 0.6,
            'volume_ratio': 0.5,
            'price_momentum': 0.9
        };
        return weights[featureName] || 0.3;
    }
    getFeatureCorrelation(featureName, prediction) {
        // Simplified correlation calculation
        return (Math.random() - 0.5) * 2; // Random for demonstration
    }
    calculateFeatureSensitivity(featureName, value) {
        // How much the prediction changes per unit change in feature
        return this.getFeatureWeight(featureName) * (1 + Math.abs(value) * 0.1);
    }
    assessChangeFeasibility(featureName, requiredChange) {
        const absChange = Math.abs(requiredChange);
        if (absChange < 0.1)
            return 'easy';
        if (absChange < 0.5)
            return 'moderate';
        if (absChange < 2.0)
            return 'difficult';
        return 'impossible';
    }
    generateCacheKey(prediction, features) {
        // Generate unique cache key based on prediction and features
        const featureHash = this.hashFeatures(features);
        return `${prediction.modelId}_${featureHash}_${prediction.prediction[0].toFixed(6)}`;
    }
    hashFeatures(features) {
        const values = Object.values(features.features).map(v => v.toFixed(4)).join('');
        return Buffer.from(values).toString('base64').slice(0, 16);
    }
    initializeFeatureDescriptions() {
        // Initialize human-readable descriptions for features
        this.featureDescriptions.set('rsi', 'Relative Strength Index - momentum oscillator (0-100)');
        this.featureDescriptions.set('rsi_oversold', 'RSI oversold condition (RSI < 30)');
        this.featureDescriptions.set('rsi_overbought', 'RSI overbought condition (RSI > 70)');
        this.featureDescriptions.set('ema_short', 'Short-term Exponential Moving Average');
        this.featureDescriptions.set('ema_long', 'Long-term Exponential Moving Average');
        this.featureDescriptions.set('macd_line', 'MACD Line (EMA12 - EMA26)');
        this.featureDescriptions.set('macd_signal', 'MACD Signal Line');
        this.featureDescriptions.set('macd_histogram', 'MACD Histogram');
        this.featureDescriptions.set('bollinger_upper', 'Bollinger Band Upper');
        this.featureDescriptions.set('bollinger_lower', 'Bollinger Band Lower');
        this.featureDescriptions.set('volume_ratio', 'Volume ratio to average volume');
        this.featureDescriptions.set('price_momentum', 'Price momentum indicator');
        this.featureDescriptions.set('volatility', 'Price volatility measure');
        this.featureDescriptions.set('trend_strength', 'Trend strength indicator');
        // Add more descriptions as needed
    }
    /**
     * 📊 Get model interpretation
     */
    getModelInterpretation(modelId) {
        return this.modelInterpretations.get(modelId) || null;
    }
    /**
     * 🔧 Clear explanation cache
     */
    clearCache() {
        this.explanationCache.clear();
        this.logger.info('🔧 Explanation cache cleared');
    }
    /**
     * 📊 Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.explanationCache.size,
            hitRate: 0.8 // Simplified
        };
    }
}
exports.ExplainableAISystem = ExplainableAISystem;
exports.default = ExplainableAISystem;

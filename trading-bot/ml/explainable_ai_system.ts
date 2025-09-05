/**
 * 🔍 EXPLAINABLE AI SYSTEM
 * System wyjaśnialnej sztucznej inteligencji dla interpretacji modeli ML
 */

import { EventEmitter } from 'events';
import { Logger } from '../infrastructure/logging/logger';
import { InferenceResult } from './realtime_inference_engine';
import { FeatureSet } from './advanced_feature_engineer';
import { ModelMetadata } from './model_registry';
import { Candle } from '../core/types/strategy';

export interface FeatureImportance {
    feature: string;
    importance: number;
    impact: 'positive' | 'negative' | 'neutral';
    confidence: number;
    description: string;
    category: 'technical' | 'statistical' | 'temporal' | 'market_structure' | 'pattern';
}

export interface SHAPValue {
    feature: string;
    value: number;
    baseValue: number;
    shapValue: number;
    contribution: number; // How much this feature contributed to final prediction
}

export interface LIMEExplanation {
    feature: string;
    coefficient: number;
    localImportance: number;
    confidence: number;
    interpretation: string;
}

export interface DecisionPath {
    step: number;
    feature: string;
    condition: string;
    threshold: number;
    decision: 'left' | 'right';
    samples: number;
    value: number;
    probability?: number;
}

export interface ExplanationReport {
    predictionId: string;
    modelId: string;
    prediction: number[];
    confidence: number;
    timestamp: number;
    
    // Feature Analysis
    featureImportances: FeatureImportance[];
    shapValues: SHAPValue[];
    limeExplanation: LIMEExplanation[];
    
    // Decision Analysis
    decisionPath: DecisionPath[];
    topFactors: {
        positive: FeatureImportance[];
        negative: FeatureImportance[];
    };
    
    // Interpretability
    summary: string;
    riskFactors: string[];
    recommendations: string[];
    
    // Confidence Breakdown
    uncertaintyScore: number;
    predictionStability: number;
    dataQuality: number;
}

export interface CounterfactualAnalysis {
    originalPrediction: number;
    counterfactualPrediction: number;
    changedFeatures: Array<{
        feature: string;
        originalValue: number;
        counterfactualValue: number;
        change: number;
        impact: number;
    }>;
    minimalChanges: Array<{
        feature: string;
        requiredChange: number;
        feasibility: 'easy' | 'moderate' | 'difficult' | 'impossible';
    }>;
}

export interface ModelInterpretation {
    modelId: string;
    modelType: string;
    overallFeatureImportances: FeatureImportance[];
    correlationMatrix: Record<string, Record<string, number>>;
    featureInteractions: Array<{
        features: string[];
        interactionStrength: number;
        type: 'synergistic' | 'antagonistic' | 'independent';
    }>;
    decisionBoundaries: Array<{
        feature1: string;
        feature2: string;
        boundary: number[][];
        confidence: number;
    }>;
}

export interface ExplainabilityConfig {
    enableSHAP: boolean;
    enableLIME: boolean;
    enableCounterfactual: boolean;
    topFeaturesCount: number;
    perturbationSamples: number;
    confidenceThreshold: number;
    generateSummary: boolean;
    cacheExplanations: boolean;
}

export class ExplainableAISystem extends EventEmitter {
    private logger: Logger;
    private config: ExplainabilityConfig;
    
    // Cache for explanations
    private explanationCache: Map<string, ExplanationReport> = new Map();
    private modelInterpretations: Map<string, ModelInterpretation> = new Map();
    
    // Feature descriptions
    private featureDescriptions: Map<string, string> = new Map();
    
    constructor(config: Partial<ExplainabilityConfig> = {}) {
        super();
        this.logger = new Logger('ExplainableAI');
        
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
    public async explainPrediction(
        predictionResult: InferenceResult,
        features: FeatureSet,
        modelMetadata: ModelMetadata,
        inputData: Candle[]
    ): Promise<ExplanationReport> {
        const startTime = Date.now();
        
        try {
            this.logger.debug(`🔍 Generating explanation for prediction: ${predictionResult.requestId}`);
            
            // Check cache
            const cacheKey = this.generateCacheKey(predictionResult, features);
            if (this.config.cacheExplanations && this.explanationCache.has(cacheKey)) {
                this.logger.debug('📋 Returning cached explanation');
                return this.explanationCache.get(cacheKey)!;
            }
            
            // Generate feature importances
            const featureImportances = await this.calculateFeatureImportances(
                features, predictionResult, modelMetadata
            );
            
            // Generate SHAP values if enabled
            let shapValues: SHAPValue[] = [];
            if (this.config.enableSHAP) {
                shapValues = await this.calculateSHAPValues(features, predictionResult);
            }
            
            // Generate LIME explanation if enabled
            let limeExplanation: LIMEExplanation[] = [];
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
            
            const explanation: ExplanationReport = {
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
            
        } catch (error) {
            this.logger.error('❌ Failed to generate explanation:', error);
            throw error;
        }
    }

    /**
     * 🎯 Calculate feature importances using multiple methods
     */
    private async calculateFeatureImportances(
        features: FeatureSet,
        prediction: InferenceResult,
        modelMetadata: ModelMetadata
    ): Promise<FeatureImportance[]> {
        const importances: FeatureImportance[] = [];
        
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
    private async calculateSHAPValues(
        features: FeatureSet,
        prediction: InferenceResult
    ): Promise<SHAPValue[]> {
        const shapValues: SHAPValue[] = [];
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
    private async generateLIMEExplanation(
        features: FeatureSet,
        prediction: InferenceResult
    ): Promise<LIMEExplanation[]> {
        const explanations: LIMEExplanation[] = [];
        
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
    private generateDecisionPath(
        features: FeatureSet,
        prediction: InferenceResult
    ): DecisionPath[] {
        const path: DecisionPath[] = [];
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
    private identifyTopFactors(importances: FeatureImportance[]): {
        positive: FeatureImportance[];
        negative: FeatureImportance[];
    } {
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
    private generateSummary(
        prediction: InferenceResult,
        topFactors: { positive: FeatureImportance[]; negative: FeatureImportance[] },
        uncertaintyScore: number
    ): string {
        if (!this.config.generateSummary) return '';
        
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
    private identifyRiskFactors(
        topFactors: { positive: FeatureImportance[]; negative: FeatureImportance[] },
        uncertaintyScore: number
    ): string[] {
        const risks: string[] = [];
        
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
    private generateRecommendations(
        topFactors: { positive: FeatureImportance[]; negative: FeatureImportance[] },
        prediction: InferenceResult
    ): string[] {
        const recommendations: string[] = [];
        
        // Based on confidence level
        if (prediction.confidence > 0.8) {
            recommendations.push('High confidence prediction - suitable for normal position sizing');
        } else if (prediction.confidence > 0.6) {
            recommendations.push('Moderate confidence - consider reduced position sizing');
        } else {
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
    public async generateCounterfactualAnalysis(
        features: FeatureSet,
        prediction: InferenceResult
    ): Promise<CounterfactualAnalysis> {
        const originalPrediction = prediction.prediction[0];
        const targetPrediction = originalPrediction > 0.5 ? 0.3 : 0.7; // Flip decision
        
        const changedFeatures: Array<{
            feature: string;
            originalValue: number;
            counterfactualValue: number;
            change: number;
            impact: number;
        }> = [];
        const minimalChanges: Array<{
            feature: string;
            requiredChange: number;
            feasibility: 'easy' | 'moderate' | 'difficult' | 'impossible';
        }> = [];
        
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
    
    private calculatePermutationImportance(
        featureName: string,
        features: FeatureSet,
        prediction: InferenceResult
    ): number {
        // Simplified permutation importance
        const originalValue = features.features[featureName];
        const perturbedValue = originalValue + (Math.random() - 0.5) * Math.abs(originalValue) * 0.1;
        
        // Estimate impact (simplified)
        const impact = (perturbedValue - originalValue) * this.getFeatureWeight(featureName);
        return impact;
    }
    
    private determineFeatureImpact(
        featureName: string,
        value: number,
        prediction: InferenceResult
    ): 'positive' | 'negative' | 'neutral' {
        const correlation = this.getFeatureCorrelation(featureName, prediction.prediction[0]);
        if (Math.abs(correlation) < 0.1) return 'neutral';
        return correlation > 0 ? 'positive' : 'negative';
    }
    
    private getFeatureCategory(featureName: string): 'technical' | 'statistical' | 'temporal' | 'market_structure' | 'pattern' {
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
    
    private calculateImportanceConfidence(importance: number, predictionConfidence: number): number {
        return Math.min(1.0, Math.abs(importance) * predictionConfidence);
    }
    
    private calculateLocalCoefficient(featureName: string, value: number, prediction: InferenceResult): number {
        // Simplified local linear approximation
        return this.getFeatureWeight(featureName) * Math.sign(value);
    }
    
    private calculateLocalConfidence(coefficient: number, predictionConfidence: number): number {
        return Math.min(1.0, Math.abs(coefficient) * predictionConfidence);
    }
    
    private generateFeatureInterpretation(featureName: string, coefficient: number, value: number): string {
        const impact = coefficient > 0 ? 'supports' : 'opposes';
        const strength = Math.abs(coefficient) > 0.5 ? 'strongly' : Math.abs(coefficient) > 0.2 ? 'moderately' : 'weakly';
        return `${featureName} ${strength} ${impact} the prediction (value: ${value.toFixed(4)})`;
    }
    
    private getFeatureThreshold(featureName: string): number {
        // Return predefined or calculated thresholds
        const thresholds: Record<string, number> = {
            'rsi': 50,
            'rsi_oversold': 30,
            'rsi_overbought': 70,
            'volume_ratio': 1.0,
            'price_momentum': 0
        };
        
        return thresholds[featureName] || 0;
    }
    
    private calculateStepProbability(value: number, threshold: number): number {
        const distance = Math.abs(value - threshold);
        return Math.min(0.95, 0.5 + distance * 0.1);
    }
    
    private calculateUncertaintyScore(prediction: InferenceResult, features: FeatureSet): number {
        // Based on prediction confidence and feature variance
        const baseUncertainty = 1 - prediction.confidence;
        const featureVariance = this.calculateFeatureVariance(features);
        return Math.min(1.0, baseUncertainty + featureVariance * 0.3);
    }
    
    private calculatePredictionStability(features: FeatureSet, prediction: InferenceResult): number {
        // Estimate how stable the prediction would be to small perturbations
        return Math.max(0.1, prediction.confidence - this.calculateFeatureVariance(features) * 0.2);
    }
    
    private assessDataQuality(features: FeatureSet, inputData: Candle[]): number {
        // Assess data quality based on completeness and consistency
        const featureValues = Object.values(features.features);
        const validFeatures = featureValues.filter(v => isFinite(v) && !isNaN(v)).length;
        const completeness = validFeatures / featureValues.length;
        
        const dataConsistency = this.calculateDataConsistency(inputData);
        
        return (completeness + dataConsistency) / 2;
    }
    
    private calculateFeatureVariance(features: FeatureSet): number {
        const values = Object.values(features.features);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance) / values.length; // Normalized
    }
    
    private calculateDataConsistency(inputData: Candle[]): number {
        // Check for gaps, outliers, etc.
        let consistency = 1.0;
        
        for (let i = 1; i < inputData.length; i++) {
            const timeGap = inputData[i].time - inputData[i-1].time;
            const expectedGap = 15 * 60 * 1000; // 15 minutes
            
            if (Math.abs(timeGap - expectedGap) > expectedGap * 0.1) {
                consistency -= 0.1;
            }
        }
        
        return Math.max(0.1, consistency);
    }
    
    private getFeatureWeight(featureName: string): number {
        // Predefined feature weights based on domain knowledge
        const weights: Record<string, number> = {
            'rsi': 0.8,
            'ema_short': 0.7,
            'macd_signal': 0.6,
            'volume_ratio': 0.5,
            'price_momentum': 0.9
        };
        
        return weights[featureName] || 0.3;
    }
    
    private getFeatureCorrelation(featureName: string, prediction: number): number {
        // Simplified correlation calculation
        return (Math.random() - 0.5) * 2; // Random for demonstration
    }
    
    private calculateFeatureSensitivity(featureName: string, value: number): number {
        // How much the prediction changes per unit change in feature
        return this.getFeatureWeight(featureName) * (1 + Math.abs(value) * 0.1);
    }
    
    private assessChangeFeasibility(featureName: string, requiredChange: number): 'easy' | 'moderate' | 'difficult' | 'impossible' {
        const absChange = Math.abs(requiredChange);
        
        if (absChange < 0.1) return 'easy';
        if (absChange < 0.5) return 'moderate';
        if (absChange < 2.0) return 'difficult';
        return 'impossible';
    }
    
    private generateCacheKey(prediction: InferenceResult, features: FeatureSet): string {
        // Generate unique cache key based on prediction and features
        const featureHash = this.hashFeatures(features);
        return `${prediction.modelId}_${featureHash}_${prediction.prediction[0].toFixed(6)}`;
    }
    
    private hashFeatures(features: FeatureSet): string {
        const values = Object.values(features.features).map(v => v.toFixed(4)).join('');
        return Buffer.from(values).toString('base64').slice(0, 16);
    }
    
    private initializeFeatureDescriptions(): void {
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
    public getModelInterpretation(modelId: string): ModelInterpretation | null {
        return this.modelInterpretations.get(modelId) || null;
    }

    /**
     * 🔧 Clear explanation cache
     */
    public clearCache(): void {
        this.explanationCache.clear();
        this.logger.info('🔧 Explanation cache cleared');
    }

    /**
     * 📊 Get cache statistics
     */
    public getCacheStats(): { size: number; hitRate: number } {
        return {
            size: this.explanationCache.size,
            hitRate: 0.8 // Simplified
        };
    }
}

export default ExplainableAISystem;

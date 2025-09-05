// ============================================================================
//  meta_optimization_system.ts – PHASE 4.3 META-OPTYMALIZACJA
//  Optymalizacja samego procesu optymalizacji (meta-parametry)
//  Adaptacja algorytmów optymalizacyjnych na podstawie ich skuteczności
//  System rekomendacji najlepszych podejść optymalizacyjnych dla różnych typów strategii
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../infrastructure/logging/logger';

// ============================================================================
// TYPY I INTERFEJSY META-OPTYMALIZACJI
// ============================================================================

/**
 * Typy algorytmów optymalizacyjnych
 */
export enum OptimizationAlgorithm {
    GRID_SEARCH = 'grid_search',
    RANDOM_SEARCH = 'random_search',
    BAYESIAN_OPTIMIZATION = 'bayesian_optimization',
    GENETIC_ALGORITHM = 'genetic_algorithm',
    SIMULATED_ANNEALING = 'simulated_annealing',
    PARTICLE_SWARM = 'particle_swarm',
    DIFFERENTIAL_EVOLUTION = 'differential_evolution',
    HYPERBAND = 'hyperband',
    OPTUNA_TPE = 'optuna_tpe',
    RAY_TUNE = 'ray_tune'
}

/**
 * Typy strategii tradingowych
 */
export enum StrategyType {
    TREND_FOLLOWING = 'trend_following',
    MEAN_REVERSION = 'mean_reversion',
    MOMENTUM = 'momentum',
    BREAKOUT = 'breakout',
    SCALPING = 'scalping',
    SWING = 'swing',
    ARBITRAGE = 'arbitrage',
    HYBRID = 'hybrid'
}

/**
 * Charakterystyki rynku
 */
export enum MarketRegime {
    BULL = 'bull',
    BEAR = 'bear',
    SIDEWAYS = 'sideways',
    HIGH_VOLATILITY = 'high_volatility',
    LOW_VOLATILITY = 'low_volatility',
    TRENDING = 'trending',
    RANGING = 'ranging',
    CRISIS = 'crisis'
}

/**
 * Meta-parametry algorytmów optymalizacyjnych
 */
export interface OptimizationMetaParameters {
    algorithm: OptimizationAlgorithm;
    trialCount: number;
    timeoutMinutes: number;
    populationSize?: number;
    crossoverRate?: number;
    mutationRate?: number;
    coolingRate?: number;
    convergenceThreshold: number;
    parallelization: boolean;
    randomSeed?: number;
    samplingStrategy?: string;
    pruningEnabled: boolean;
    warmupTrials?: number;
    metricToleranceRatio: number;
}

/**
 * Kontekst optymalizacji
 */
export interface OptimizationContext {
    strategyType: StrategyType;
    marketRegime: MarketRegime;
    dataSize: number;
    parameterSpaceSize: number;
    timeConstraint: number;
    resourceConstraint: number;
    accuracyRequirement: number;
    stabilityRequirement: number;
}

/**
 * Wyniki meta-optymalizacji
 */
export interface MetaOptimizationResult {
    algorithm: OptimizationAlgorithm;
    metaParameters: OptimizationMetaParameters;
    context: OptimizationContext;
    performance: {
        bestMetricValue: number;
        convergenceTime: number;
        trialsUsed: number;
        efficiency: number;
        stability: number;
        reproducibility: number;
    };
    timestamp: Date;
    confidence: number;
}

/**
 * Historia adaptacji algorytmów
 */
export interface AlgorithmAdaptationHistory {
    algorithm: OptimizationAlgorithm;
    adaptationEvents: {
        timestamp: Date;
        context: OptimizationContext;
        oldParameters: OptimizationMetaParameters;
        newParameters: OptimizationMetaParameters;
        reasonForChange: string;
        improvementAchieved: number;
    }[];
    currentEffectiveness: number;
    learningRate: number;
}

/**
 * Profil rekomendacji algorytmu
 */
export interface AlgorithmRecommendationProfile {
    algorithm: OptimizationAlgorithm;
    strategyTypeFitness: Record<StrategyType, number>;
    marketRegimeFitness: Record<MarketRegime, number>;
    contextualPreferences: {
        minDataSize: number;
        maxDataSize: number;
        minParameterSpace: number;
        maxParameterSpace: number;
        timeEfficiency: number;
        accuracyPotential: number;
        stabilityScore: number;
    };
    recommendationConfidence: number;
    lastUpdated: Date;
}

// ============================================================================
// META-OPTIMIZER ENGINE
// ============================================================================

/**
 * Silnik meta-optymalizacji - optymalizuje procesy optymalizacji
 */
export class MetaOptimizationEngine {
    private logger: Logger;
    private adaptationHistory: Map<OptimizationAlgorithm, AlgorithmAdaptationHistory>;
    private algorithmProfiles: Map<OptimizationAlgorithm, AlgorithmRecommendationProfile>;
    private performanceDatabase: MetaOptimizationResult[];
    private learningEnabled: boolean;

    constructor() {
        this.logger = new Logger('./logs/meta_optimization.log');
        this.adaptationHistory = new Map();
        this.algorithmProfiles = new Map();
        this.performanceDatabase = [];
        this.learningEnabled = true;
        this.initializeAlgorithmProfiles();
    }

    /**
     * Inicjalizuje profile algorytmów z domyślnymi wartościami
     */
    private initializeAlgorithmProfiles(): void {
        const algorithms = Object.values(OptimizationAlgorithm);
        
        for (const algorithm of algorithms) {
            const profile: AlgorithmRecommendationProfile = {
                algorithm,
                strategyTypeFitness: this.initializeStrategyTypeFitness(algorithm),
                marketRegimeFitness: this.initializeMarketRegimeFitness(algorithm),
                contextualPreferences: this.initializeContextualPreferences(algorithm),
                recommendationConfidence: 0.5, // Start with moderate confidence
                lastUpdated: new Date()
            };
            
            this.algorithmProfiles.set(algorithm, profile);
        }
    }

    /**
     * Inicjalizuje fitness dla typów strategii
     */
    private initializeStrategyTypeFitness(algorithm: OptimizationAlgorithm): Record<StrategyType, number> {
        const fitness: Record<StrategyType, number> = {} as Record<StrategyType, number>;
        
        // Domyślne wartości na podstawie charakterystyk algorytmów
        switch (algorithm) {
            case OptimizationAlgorithm.BAYESIAN_OPTIMIZATION:
                fitness[StrategyType.TREND_FOLLOWING] = 0.9;
                fitness[StrategyType.MOMENTUM] = 0.8;
                fitness[StrategyType.MEAN_REVERSION] = 0.7;
                fitness[StrategyType.BREAKOUT] = 0.8;
                fitness[StrategyType.SWING] = 0.8;
                fitness[StrategyType.SCALPING] = 0.6;
                fitness[StrategyType.ARBITRAGE] = 0.7;
                fitness[StrategyType.HYBRID] = 0.9;
                break;
                
            case OptimizationAlgorithm.GENETIC_ALGORITHM:
                fitness[StrategyType.TREND_FOLLOWING] = 0.8;
                fitness[StrategyType.MOMENTUM] = 0.9;
                fitness[StrategyType.MEAN_REVERSION] = 0.8;
                fitness[StrategyType.BREAKOUT] = 0.9;
                fitness[StrategyType.SWING] = 0.7;
                fitness[StrategyType.SCALPING] = 0.8;
                fitness[StrategyType.ARBITRAGE] = 0.6;
                fitness[StrategyType.HYBRID] = 0.9;
                break;
                
            case OptimizationAlgorithm.GRID_SEARCH:
                fitness[StrategyType.TREND_FOLLOWING] = 0.6;
                fitness[StrategyType.MOMENTUM] = 0.5;
                fitness[StrategyType.MEAN_REVERSION] = 0.7;
                fitness[StrategyType.BREAKOUT] = 0.5;
                fitness[StrategyType.SWING] = 0.6;
                fitness[StrategyType.SCALPING] = 0.4;
                fitness[StrategyType.ARBITRAGE] = 0.8;
                fitness[StrategyType.HYBRID] = 0.4;
                break;
                
            default:
                // Domyślne moderate values
                Object.values(StrategyType).forEach(type => {
                    fitness[type] = 0.6;
                });
        }
        
        return fitness;
    }

    /**
     * Inicjalizuje fitness dla reżimów rynkowych
     */
    private initializeMarketRegimeFitness(algorithm: OptimizationAlgorithm): Record<MarketRegime, number> {
        const fitness: Record<MarketRegime, number> = {} as Record<MarketRegime, number>;
        
        switch (algorithm) {
            case OptimizationAlgorithm.BAYESIAN_OPTIMIZATION:
                fitness[MarketRegime.BULL] = 0.9;
                fitness[MarketRegime.BEAR] = 0.8;
                fitness[MarketRegime.SIDEWAYS] = 0.7;
                fitness[MarketRegime.HIGH_VOLATILITY] = 0.8;
                fitness[MarketRegime.LOW_VOLATILITY] = 0.9;
                fitness[MarketRegime.TRENDING] = 0.9;
                fitness[MarketRegime.RANGING] = 0.7;
                fitness[MarketRegime.CRISIS] = 0.6;
                break;
                
            case OptimizationAlgorithm.GENETIC_ALGORITHM:
                fitness[MarketRegime.BULL] = 0.8;
                fitness[MarketRegime.BEAR] = 0.9;
                fitness[MarketRegime.SIDEWAYS] = 0.8;
                fitness[MarketRegime.HIGH_VOLATILITY] = 0.9;
                fitness[MarketRegime.LOW_VOLATILITY] = 0.7;
                fitness[MarketRegime.TRENDING] = 0.8;
                fitness[MarketRegime.RANGING] = 0.8;
                fitness[MarketRegime.CRISIS] = 0.9;
                break;
                
            default:
                Object.values(MarketRegime).forEach(regime => {
                    fitness[regime] = 0.6;
                });
        }
        
        return fitness;
    }

    /**
     * Inicjalizuje preferencje kontekstowe algorytmu
     */
    private initializeContextualPreferences(algorithm: OptimizationAlgorithm): AlgorithmRecommendationProfile['contextualPreferences'] {
        switch (algorithm) {
            case OptimizationAlgorithm.BAYESIAN_OPTIMIZATION:
                return {
                    minDataSize: 1000,
                    maxDataSize: 50000,
                    minParameterSpace: 5,
                    maxParameterSpace: 100,
                    timeEfficiency: 0.8,
                    accuracyPotential: 0.9,
                    stabilityScore: 0.8
                };
                
            case OptimizationAlgorithm.GENETIC_ALGORITHM:
                return {
                    minDataSize: 500,
                    maxDataSize: 100000,
                    minParameterSpace: 10,
                    maxParameterSpace: 1000,
                    timeEfficiency: 0.6,
                    accuracyPotential: 0.8,
                    stabilityScore: 0.7
                };
                
            case OptimizationAlgorithm.GRID_SEARCH:
                return {
                    minDataSize: 100,
                    maxDataSize: 10000,
                    minParameterSpace: 2,
                    maxParameterSpace: 20,
                    timeEfficiency: 0.4,
                    accuracyPotential: 0.7,
                    stabilityScore: 0.9
                };
                
            case OptimizationAlgorithm.RANDOM_SEARCH:
                return {
                    minDataSize: 100,
                    maxDataSize: 50000,
                    minParameterSpace: 5,
                    maxParameterSpace: 200,
                    timeEfficiency: 0.7,
                    accuracyPotential: 0.6,
                    stabilityScore: 0.6
                };
                
            default:
                return {
                    minDataSize: 500,
                    maxDataSize: 20000,
                    minParameterSpace: 5,
                    maxParameterSpace: 50,
                    timeEfficiency: 0.6,
                    accuracyPotential: 0.7,
                    stabilityScore: 0.7
                };
        }
    }

    /**
     * Rekomenduje najlepszy algorytm optymalizacji dla danego kontekstu
     */
    public recommendOptimizationAlgorithm(context: OptimizationContext): {
        primaryRecommendation: OptimizationAlgorithm;
        alternativeRecommendations: OptimizationAlgorithm[];
        metaParameters: OptimizationMetaParameters;
        confidence: number;
        reasoning: string;
    } {
        this.logger.info('🔍 Analizuję kontekst dla rekomendacji algorytmu optymalizacji...');
        
        const algorithmScores = new Map<OptimizationAlgorithm, number>();
        const reasoningParts: string[] = [];
        
        // Oceniaj każdy algorytm
        for (const [algorithm, profile] of Array.from(this.algorithmProfiles.entries())) {
            let score = 0;
            let algorithmReasonParts: string[] = [];
            
            // 1. Fitness dla typu strategii (waga: 25%)
            const strategyFitness = profile.strategyTypeFitness[context.strategyType] || 0.5;
            score += strategyFitness * 0.25;
            algorithmReasonParts.push(`Strategy type fitness: ${(strategyFitness * 100).toFixed(1)}%`);
            
            // 2. Fitness dla reżimu rynkowego (waga: 20%)
            const marketFitness = profile.marketRegimeFitness[context.marketRegime] || 0.5;
            score += marketFitness * 0.20;
            algorithmReasonParts.push(`Market regime fitness: ${(marketFitness * 100).toFixed(1)}%`);
            
            // 3. Kompatybilność z rozmiarem danych (waga: 15%)
            const dataSizeScore = this.calculateDataSizeCompatibility(context.dataSize, profile.contextualPreferences);
            score += dataSizeScore * 0.15;
            algorithmReasonParts.push(`Data size compatibility: ${(dataSizeScore * 100).toFixed(1)}%`);
            
            // 4. Kompatybilność z przestrzenią parametrów (waga: 15%)
            const paramSpaceScore = this.calculateParameterSpaceCompatibility(context.parameterSpaceSize, profile.contextualPreferences);
            score += paramSpaceScore * 0.15;
            algorithmReasonParts.push(`Parameter space compatibility: ${(paramSpaceScore * 100).toFixed(1)}%`);
            
            // 5. Efektywność czasowa (waga: 10%)
            const timeEfficiencyScore = this.calculateTimeEfficiency(context.timeConstraint, profile.contextualPreferences);
            score += timeEfficiencyScore * 0.10;
            algorithmReasonParts.push(`Time efficiency: ${(timeEfficiencyScore * 100).toFixed(1)}%`);
            
            // 6. Wymagania dokładności (waga: 10%)
            const accuracyScore = this.calculateAccuracyMatch(context.accuracyRequirement, profile.contextualPreferences);
            score += accuracyScore * 0.10;
            algorithmReasonParts.push(`Accuracy match: ${(accuracyScore * 100).toFixed(1)}%`);
            
            // 7. Stabilność (waga: 5%)
            const stabilityScore = this.calculateStabilityMatch(context.stabilityRequirement, profile.contextualPreferences);
            score += stabilityScore * 0.05;
            algorithmReasonParts.push(`Stability match: ${(stabilityScore * 100).toFixed(1)}%`);
            
            algorithmScores.set(algorithm, score);
            reasoningParts.push(`${algorithm}: ${(score * 100).toFixed(1)}% (${algorithmReasonParts.join(', ')})`);
        }
        
        // Sortuj algorytmy według wyniku
        const sortedAlgorithms = Array.from(algorithmScores.entries())
            .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);
        
        const primaryRecommendation = sortedAlgorithms[0][0];
        const primaryScore = sortedAlgorithms[0][1];
        const alternativeRecommendations = sortedAlgorithms.slice(1, 4).map(([algorithm]) => algorithm);
        
        // Generuj meta-parametry dla zalecanego algorytmu
        const metaParameters = this.generateMetaParameters(primaryRecommendation, context);
        
        const confidence = Math.min(primaryScore * 1.2, 0.95); // Cap at 95%
        
        const reasoning = `Based on context analysis:\n${reasoningParts.join('\n')}`;
        
        this.logger.info(`✅ Recommended ${primaryRecommendation} with ${(confidence * 100).toFixed(1)}% confidence`);
        
        return {
            primaryRecommendation,
            alternativeRecommendations,
            metaParameters,
            confidence,
            reasoning
        };
    }

    /**
     * Oblicza kompatybilność z rozmiarem danych
     */
    private calculateDataSizeCompatibility(dataSize: number, preferences: AlgorithmRecommendationProfile['contextualPreferences']): number {
        if (dataSize >= preferences.minDataSize && dataSize <= preferences.maxDataSize) {
            return 1.0;
        }
        
        if (dataSize < preferences.minDataSize) {
            const ratio = dataSize / preferences.minDataSize;
            return Math.max(0, ratio);
        } else {
            const excess = dataSize - preferences.maxDataSize;
            const penalty = excess / preferences.maxDataSize;
            return Math.max(0, 1 - penalty * 0.5);
        }
    }

    /**
     * Oblicza kompatybilność z przestrzenią parametrów
     */
    private calculateParameterSpaceCompatibility(paramSpaceSize: number, preferences: AlgorithmRecommendationProfile['contextualPreferences']): number {
        if (paramSpaceSize >= preferences.minParameterSpace && paramSpaceSize <= preferences.maxParameterSpace) {
            return 1.0;
        }
        
        if (paramSpaceSize < preferences.minParameterSpace) {
            const ratio = paramSpaceSize / preferences.minParameterSpace;
            return Math.max(0, ratio);
        } else {
            const excess = paramSpaceSize - preferences.maxParameterSpace;
            const penalty = excess / preferences.maxParameterSpace;
            return Math.max(0, 1 - penalty * 0.3);
        }
    }

    /**
     * Oblicza efektywność czasową
     */
    private calculateTimeEfficiency(timeConstraint: number, preferences: AlgorithmRecommendationProfile['contextualPreferences']): number {
        // Normalizuj constraint czasowy (1 = bardzo ograniczony, 5 = bez ograniczeń)
        const normalizedConstraint = Math.max(1, Math.min(5, timeConstraint)) / 5;
        
        // Jeśli czas jest ograniczony, preferuj algorytmy o wysokiej efektywności czasowej
        if (normalizedConstraint < 0.4) {
            return preferences.timeEfficiency;
        } else {
            return 0.5 + preferences.timeEfficiency * 0.5;
        }
    }

    /**
     * Oblicza dopasowanie do wymagań dokładności
     */
    private calculateAccuracyMatch(accuracyRequirement: number, preferences: AlgorithmRecommendationProfile['contextualPreferences']): number {
        const normalizedRequirement = Math.max(1, Math.min(5, accuracyRequirement)) / 5;
        
        const accuracyDifference = Math.abs(normalizedRequirement - preferences.accuracyPotential);
        return Math.max(0, 1 - accuracyDifference);
    }

    /**
     * Oblicza dopasowanie do wymagań stabilności
     */
    private calculateStabilityMatch(stabilityRequirement: number, preferences: AlgorithmRecommendationProfile['contextualPreferences']): number {
        const normalizedRequirement = Math.max(1, Math.min(5, stabilityRequirement)) / 5;
        
        const stabilityDifference = Math.abs(normalizedRequirement - preferences.stabilityScore);
        return Math.max(0, 1 - stabilityDifference);
    }

    /**
     * Generuje meta-parametry dla wybranego algorytmu
     */
    private generateMetaParameters(algorithm: OptimizationAlgorithm, context: OptimizationContext): OptimizationMetaParameters {
        const baseParams: OptimizationMetaParameters = {
            algorithm,
            trialCount: this.calculateOptimalTrialCount(context),
            timeoutMinutes: this.calculateOptimalTimeout(context),
            convergenceThreshold: 0.001,
            parallelization: context.resourceConstraint >= 3,
            pruningEnabled: true,
            metricToleranceRatio: 0.05
        };

        // Dopasuj parametry specyficzne dla algorytmu
        switch (algorithm) {
            case OptimizationAlgorithm.GENETIC_ALGORITHM:
                baseParams.populationSize = Math.max(20, Math.min(200, Math.floor(context.parameterSpaceSize * 2)));
                baseParams.crossoverRate = 0.8;
                baseParams.mutationRate = 0.1;
                break;
                
            case OptimizationAlgorithm.SIMULATED_ANNEALING:
                baseParams.coolingRate = 0.95;
                baseParams.convergenceThreshold = 0.0001;
                break;
                
            case OptimizationAlgorithm.BAYESIAN_OPTIMIZATION:
                baseParams.warmupTrials = Math.max(10, Math.floor(baseParams.trialCount * 0.1));
                baseParams.samplingStrategy = 'tpe';
                break;
                
            case OptimizationAlgorithm.HYPERBAND:
                baseParams.trialCount = Math.floor(baseParams.trialCount * 1.5); // Hyperband needs more trials
                break;
        }

        return baseParams;
    }

    /**
     * Oblicza optymalną liczbę prób
     */
    private calculateOptimalTrialCount(context: OptimizationContext): number {
        let baseTrials = Math.max(50, Math.min(500, context.parameterSpaceSize * 5));
        
        // Dostosuj na podstawie ograniczeń czasowych
        if (context.timeConstraint < 3) {
            baseTrials = Math.floor(baseTrials * 0.5);
        } else if (context.timeConstraint > 4) {
            baseTrials = Math.floor(baseTrials * 1.5);
        }
        
        // Dostosuj na podstawie wymagań dokładności
        if (context.accuracyRequirement > 4) {
            baseTrials = Math.floor(baseTrials * 1.3);
        }
        
        return Math.max(20, Math.min(1000, baseTrials));
    }

    /**
     * Oblicza optymalny timeout
     */
    private calculateOptimalTimeout(context: OptimizationContext): number {
        let baseTimeout = Math.max(30, Math.min(480, context.dataSize / 100)); // minutes
        
        if (context.timeConstraint < 3) {
            baseTimeout = Math.floor(baseTimeout * 0.5);
        } else if (context.timeConstraint > 4) {
            baseTimeout = Math.floor(baseTimeout * 2);
        }
        
        return Math.max(15, Math.min(720, baseTimeout));
    }

    /**
     * Uczy się z wyników optymalizacji i adaptuje algorytmy
     */
    public async learnFromOptimizationResult(result: MetaOptimizationResult): Promise<void> {
        if (!this.learningEnabled) return;
        
        this.logger.info(`📚 Learning from optimization result: ${result.algorithm}`);
        
        // Dodaj do bazy danych wydajności
        this.performanceDatabase.push(result);
        
        // Aktualizuj profil algorytmu
        await this.updateAlgorithmProfile(result);
        
        // Aktualizuj historię adaptacji
        await this.updateAdaptationHistory(result);
        
        // Trigger algorithm evolution jeśli trzeba
        if (this.shouldEvolveAlgorithm(result)) {
            await this.evolveAlgorithmParameters(result);
        }
        
        this.logger.info('✅ Learning completed');
    }

    /**
     * Aktualizuje profil algorytmu na podstawie wyniku
     */
    private async updateAlgorithmProfile(result: MetaOptimizationResult): Promise<void> {
        const profile = this.algorithmProfiles.get(result.algorithm);
        if (!profile) return;
        
        const learningRate = 0.1;
        const performanceScore = this.calculateNormalizedPerformanceScore(result);
        
        // Aktualizuj fitness dla typu strategii
        const currentStrategyFitness = profile.strategyTypeFitness[result.context.strategyType];
        profile.strategyTypeFitness[result.context.strategyType] = 
            currentStrategyFitness + learningRate * (performanceScore - currentStrategyFitness);
        
        // Aktualizuj fitness dla reżimu rynkowego
        const currentMarketFitness = profile.marketRegimeFitness[result.context.marketRegime];
        profile.marketRegimeFitness[result.context.marketRegime] = 
            currentMarketFitness + learningRate * (performanceScore - currentMarketFitness);
        
        // Aktualizuj confidence
        profile.recommendationConfidence = Math.min(0.95, profile.recommendationConfidence + 0.05);
        profile.lastUpdated = new Date();
        
        this.algorithmProfiles.set(result.algorithm, profile);
    }

    /**
     * Oblicza znormalizowany wynik wydajności
     */
    private calculateNormalizedPerformanceScore(result: MetaOptimizationResult): number {
        const efficiency = Math.min(1, result.performance.efficiency);
        const stability = Math.min(1, result.performance.stability);
        const reproducibility = Math.min(1, result.performance.reproducibility);
        
        return (efficiency * 0.5 + stability * 0.3 + reproducibility * 0.2);
    }

    /**
     * Aktualizuje historię adaptacji
     */
    private async updateAdaptationHistory(result: MetaOptimizationResult): Promise<void> {
        let history = this.adaptationHistory.get(result.algorithm);
        if (!history) {
            history = {
                algorithm: result.algorithm,
                adaptationEvents: [],
                currentEffectiveness: 0.5,
                learningRate: 0.1
            };
            this.adaptationHistory.set(result.algorithm, history);
        }
        
        // Aktualizuj skuteczność
        const performanceScore = this.calculateNormalizedPerformanceScore(result);
        history.currentEffectiveness = 
            history.currentEffectiveness + history.learningRate * (performanceScore - history.currentEffectiveness);
        
        // Zmniejsz learning rate z czasem
        history.learningRate = Math.max(0.01, history.learningRate * 0.99);
    }

    /**
     * Sprawdza czy algorytm powinien ewoluować
     */
    private shouldEvolveAlgorithm(result: MetaOptimizationResult): boolean {
        const recentResults = this.performanceDatabase
            .filter(r => r.algorithm === result.algorithm)
            .slice(-10); // Last 10 results
        
        if (recentResults.length < 5) return false;
        
        const avgEfficiency = recentResults.reduce((sum, r) => sum + r.performance.efficiency, 0) / recentResults.length;
        
        return avgEfficiency < 0.6; // Evolve if efficiency is below 60%
    }

    /**
     * Ewoluuje parametry algorytmu
     */
    private async evolveAlgorithmParameters(result: MetaOptimizationResult): Promise<void> {
        this.logger.info(`🧬 Evolving parameters for ${result.algorithm}`);
        
        const history = this.adaptationHistory.get(result.algorithm);
        if (!history) return;
        
        const oldParams = result.metaParameters;
        const newParams = { ...oldParams };
        
        // Mutuj parametry na podstawie wydajności
        if (result.performance.efficiency < 0.5) {
            newParams.trialCount = Math.floor(newParams.trialCount * 1.2);
            newParams.convergenceThreshold *= 0.8;
        }
        
        if (result.performance.stability < 0.6) {
            newParams.metricToleranceRatio *= 1.1;
            newParams.warmupTrials = Math.floor((newParams.warmupTrials || 10) * 1.3);
        }
        
        // Zapisz event adaptacji
        history.adaptationEvents.push({
            timestamp: new Date(),
            context: result.context,
            oldParameters: oldParams,
            newParameters: newParams,
            reasonForChange: `Low efficiency (${result.performance.efficiency.toFixed(3)}) triggered evolution`,
            improvementAchieved: 0 // Will be measured in future runs
        });
        
        this.logger.info('✅ Algorithm parameters evolved');
    }

    /**
     * Eksportuje knowledge base do pliku
     */
    public async exportKnowledgeBase(): Promise<string> {
        const knowledgeBase = {
            algorithmProfiles: Array.from(this.algorithmProfiles.entries()),
            adaptationHistory: Array.from(this.adaptationHistory.entries()),
            performanceDatabase: this.performanceDatabase,
            exportTimestamp: new Date(),
            totalOptimizations: this.performanceDatabase.length
        };
        
        const filename = `meta_optimization_knowledge_${Date.now()}.json`;
        const filepath = path.join('./results', filename);
        
        await fs.promises.writeFile(filepath, JSON.stringify(knowledgeBase, null, 2));
        
        this.logger.info(`📊 Knowledge base exported to: ${filepath}`);
        return filepath;
    }

    /**
     * Pobiera statystyki meta-optymalizacji
     */
    public getMetaOptimizationStats(): {
        totalOptimizations: number;
        algorithmUsageStats: Record<string, number>;
        averageEfficiency: number;
        bestPerformingAlgorithm: OptimizationAlgorithm;
        learningProgress: number;
    } {
        const totalOptimizations = this.performanceDatabase.length;
        
        const algorithmUsageStats: Record<string, number> = {};
        let totalEfficiency = 0;
        
        for (const result of this.performanceDatabase) {
            algorithmUsageStats[result.algorithm] = (algorithmUsageStats[result.algorithm] || 0) + 1;
            totalEfficiency += result.performance.efficiency;
        }
        
        const averageEfficiency = totalOptimizations > 0 ? totalEfficiency / totalOptimizations : 0;
        
        const algorithmEfficiencies = new Map<OptimizationAlgorithm, number>();
        for (const algorithm of Object.values(OptimizationAlgorithm)) {
            const algorithmResults = this.performanceDatabase.filter(r => r.algorithm === algorithm);
            if (algorithmResults.length > 0) {
                const avgEff = algorithmResults.reduce((sum, r) => sum + r.performance.efficiency, 0) / algorithmResults.length;
                algorithmEfficiencies.set(algorithm, avgEff);
            }
        }
        
        const bestPerformingAlgorithm = Array.from(algorithmEfficiencies.entries())
            .sort(([, effA], [, effB]) => effB - effA)[0]?.[0] || OptimizationAlgorithm.BAYESIAN_OPTIMIZATION;
        
        const learningProgress = Math.min(1, totalOptimizations / 100); // 100 optimizations = full learning
        
        return {
            totalOptimizations,
            algorithmUsageStats,
            averageEfficiency,
            bestPerformingAlgorithm,
            learningProgress
        };
    }
}

// ============================================================================
// META-OPTIMIZATION SYSTEM
// ============================================================================

/**
 * Główny system meta-optymalizacji
 */
export class MetaOptimizationSystem {
    private engine: MetaOptimizationEngine;
    private logger: Logger;
    private isEnabled: boolean;

    constructor() {
        this.engine = new MetaOptimizationEngine();
        this.logger = new Logger('./logs/meta_optimization_system.log');
        this.isEnabled = true;
    }

    /**
     * Uruchamia meta-optymalizację dla danego kontekstu
     */
    public async runMetaOptimization(context: OptimizationContext): Promise<{
        recommendation: ReturnType<MetaOptimizationEngine['recommendOptimizationAlgorithm']>;
        executionPlan: OptimizationExecutionPlan;
        monitoringSetup: OptimizationMonitoringSetup;
    }> {
        this.logger.info('🚀 Starting meta-optimization process...');
        
        // 1. Pobierz rekomendację algorytmu
        const recommendation = this.engine.recommendOptimizationAlgorithm(context);
        
        // 2. Stwórz plan wykonania
        const executionPlan = this.createExecutionPlan(recommendation, context);
        
        // 3. Skonfiguruj monitoring
        const monitoringSetup = this.createMonitoringSetup(recommendation, context);
        
        this.logger.info(`✅ Meta-optimization completed: ${recommendation.primaryRecommendation} recommended`);
        
        return {
            recommendation,
            executionPlan,
            monitoringSetup
        };
    }

    /**
     * Tworzy plan wykonania optymalizacji
     */
    private createExecutionPlan(
        recommendation: ReturnType<MetaOptimizationEngine['recommendOptimizationAlgorithm']>,
        context: OptimizationContext
    ): OptimizationExecutionPlan {
        return {
            primaryAlgorithm: recommendation.primaryRecommendation,
            fallbackAlgorithms: recommendation.alternativeRecommendations,
            metaParameters: recommendation.metaParameters,
            executionSteps: [
                {
                    step: 1,
                    action: 'initialize_algorithm',
                    algorithm: recommendation.primaryRecommendation,
                    parameters: recommendation.metaParameters,
                    estimatedDuration: 2
                },
                {
                    step: 2,
                    action: 'run_optimization',
                    algorithm: recommendation.primaryRecommendation,
                    parameters: recommendation.metaParameters,
                    estimatedDuration: recommendation.metaParameters.timeoutMinutes
                },
                {
                    step: 3,
                    action: 'evaluate_results',
                    algorithm: recommendation.primaryRecommendation,
                    parameters: recommendation.metaParameters,
                    estimatedDuration: 5
                },
                {
                    step: 4,
                    action: 'trigger_learning',
                    algorithm: recommendation.primaryRecommendation,
                    parameters: recommendation.metaParameters,
                    estimatedDuration: 1
                }
            ],
            fallbackTriggers: {
                lowPerformance: 0.3,
                timeoutExceeded: 1.5,
                convergenceFailure: true
            },
            expectedDuration: recommendation.metaParameters.timeoutMinutes + 10,
            confidence: recommendation.confidence
        };
    }

    /**
     * Tworzy konfigurację monitoringu
     */
    private createMonitoringSetup(
        recommendation: ReturnType<MetaOptimizationEngine['recommendOptimizationAlgorithm']>,
        context: OptimizationContext
    ): OptimizationMonitoringSetup {
        return {
            metricsToTrack: [
                'convergence_rate',
                'efficiency_score',
                'stability_measure',
                'resource_utilization',
                'progress_rate'
            ],
            samplingInterval: 30, // seconds
            alertThresholds: {
                lowProgress: 0.1,
                highResourceUsage: 0.9,
                convergenceStall: 300, // seconds
                performanceDrop: 0.2
            },
            adaptiveBehavior: {
                enableParameterAdjustment: true,
                enableAlgorithmSwitching: true,
                enableResourceScaling: context.resourceConstraint >= 4
            },
            reportingFrequency: 300, // seconds
            autoShutdownConditions: {
                noProgressFor: 600, // seconds
                performanceBelowThreshold: 0.1,
                resourceExhaustion: true
            }
        };
    }

    /**
     * Uruchamia uczenie z wyników optymalizacji
     */
    public async processOptimizationResult(result: MetaOptimizationResult): Promise<void> {
        await this.engine.learnFromOptimizationResult(result);
    }

    /**
     * Eksportuje knowledge base
     */
    public async exportKnowledgeBase(): Promise<string> {
        return await this.engine.exportKnowledgeBase();
    }

    /**
     * Pobiera statystyki systemu
     */
    public getSystemStats(): ReturnType<MetaOptimizationEngine['getMetaOptimizationStats']> {
        return this.engine.getMetaOptimizationStats();
    }

    /**
     * Włącza/wyłącza system
     */
    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        this.logger.info(`Meta-optimization system ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// ============================================================================
// DODATKOWE INTERFEJSY
// ============================================================================

interface OptimizationExecutionPlan {
    primaryAlgorithm: OptimizationAlgorithm;
    fallbackAlgorithms: OptimizationAlgorithm[];
    metaParameters: OptimizationMetaParameters;
    executionSteps: {
        step: number;
        action: string;
        algorithm: OptimizationAlgorithm;
        parameters: OptimizationMetaParameters;
        estimatedDuration: number;
    }[];
    fallbackTriggers: {
        lowPerformance: number;
        timeoutExceeded: number;
        convergenceFailure: boolean;
    };
    expectedDuration: number;
    confidence: number;
}

interface OptimizationMonitoringSetup {
    metricsToTrack: string[];
    samplingInterval: number;
    alertThresholds: {
        lowProgress: number;
        highResourceUsage: number;
        convergenceStall: number;
        performanceDrop: number;
    };
    adaptiveBehavior: {
        enableParameterAdjustment: boolean;
        enableAlgorithmSwitching: boolean;
        enableResourceScaling: boolean;
    };
    reportingFrequency: number;
    autoShutdownConditions: {
        noProgressFor: number;
        performanceBelowThreshold: number;
        resourceExhaustion: boolean;
    };
}

export {
    OptimizationExecutionPlan,
    OptimizationMonitoringSetup
};

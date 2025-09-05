"use strict";
// ============================================================================
//  meta_optimization_system.ts – PHASE 4.3 META-OPTYMALIZACJA
//  Optymalizacja samego procesu optymalizacji (meta-parametry)
//  Adaptacja algorytmów optymalizacyjnych na podstawie ich skuteczności
//  System rekomendacji najlepszych podejść optymalizacyjnych dla różnych typów strategii
// ============================================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaOptimizationSystem = exports.MetaOptimizationEngine = exports.MarketRegime = exports.StrategyType = exports.OptimizationAlgorithm = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("../infrastructure/logging/logger");
// ============================================================================
// TYPY I INTERFEJSY META-OPTYMALIZACJI
// ============================================================================
/**
 * Typy algorytmów optymalizacyjnych
 */
var OptimizationAlgorithm;
(function (OptimizationAlgorithm) {
    OptimizationAlgorithm["GRID_SEARCH"] = "grid_search";
    OptimizationAlgorithm["RANDOM_SEARCH"] = "random_search";
    OptimizationAlgorithm["BAYESIAN_OPTIMIZATION"] = "bayesian_optimization";
    OptimizationAlgorithm["GENETIC_ALGORITHM"] = "genetic_algorithm";
    OptimizationAlgorithm["SIMULATED_ANNEALING"] = "simulated_annealing";
    OptimizationAlgorithm["PARTICLE_SWARM"] = "particle_swarm";
    OptimizationAlgorithm["DIFFERENTIAL_EVOLUTION"] = "differential_evolution";
    OptimizationAlgorithm["HYPERBAND"] = "hyperband";
    OptimizationAlgorithm["OPTUNA_TPE"] = "optuna_tpe";
    OptimizationAlgorithm["RAY_TUNE"] = "ray_tune";
})(OptimizationAlgorithm || (exports.OptimizationAlgorithm = OptimizationAlgorithm = {}));
/**
 * Typy strategii tradingowych
 */
var StrategyType;
(function (StrategyType) {
    StrategyType["TREND_FOLLOWING"] = "trend_following";
    StrategyType["MEAN_REVERSION"] = "mean_reversion";
    StrategyType["MOMENTUM"] = "momentum";
    StrategyType["BREAKOUT"] = "breakout";
    StrategyType["SCALPING"] = "scalping";
    StrategyType["SWING"] = "swing";
    StrategyType["ARBITRAGE"] = "arbitrage";
    StrategyType["HYBRID"] = "hybrid";
})(StrategyType || (exports.StrategyType = StrategyType = {}));
/**
 * Charakterystyki rynku
 */
var MarketRegime;
(function (MarketRegime) {
    MarketRegime["BULL"] = "bull";
    MarketRegime["BEAR"] = "bear";
    MarketRegime["SIDEWAYS"] = "sideways";
    MarketRegime["HIGH_VOLATILITY"] = "high_volatility";
    MarketRegime["LOW_VOLATILITY"] = "low_volatility";
    MarketRegime["TRENDING"] = "trending";
    MarketRegime["RANGING"] = "ranging";
    MarketRegime["CRISIS"] = "crisis";
})(MarketRegime || (exports.MarketRegime = MarketRegime = {}));
// ============================================================================
// META-OPTIMIZER ENGINE
// ============================================================================
/**
 * Silnik meta-optymalizacji - optymalizuje procesy optymalizacji
 */
class MetaOptimizationEngine {
    constructor() {
        this.logger = new logger_1.Logger('./logs/meta_optimization.log');
        this.adaptationHistory = new Map();
        this.algorithmProfiles = new Map();
        this.performanceDatabase = [];
        this.learningEnabled = true;
        this.initializeAlgorithmProfiles();
    }
    /**
     * Inicjalizuje profile algorytmów z domyślnymi wartościami
     */
    initializeAlgorithmProfiles() {
        const algorithms = Object.values(OptimizationAlgorithm);
        for (const algorithm of algorithms) {
            const profile = {
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
    initializeStrategyTypeFitness(algorithm) {
        const fitness = {};
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
    initializeMarketRegimeFitness(algorithm) {
        const fitness = {};
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
    initializeContextualPreferences(algorithm) {
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
    recommendOptimizationAlgorithm(context) {
        this.logger.info('🔍 Analizuję kontekst dla rekomendacji algorytmu optymalizacji...');
        const algorithmScores = new Map();
        const reasoningParts = [];
        // Oceniaj każdy algorytm
        for (const [algorithm, profile] of Array.from(this.algorithmProfiles.entries())) {
            let score = 0;
            let algorithmReasonParts = [];
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
    calculateDataSizeCompatibility(dataSize, preferences) {
        if (dataSize >= preferences.minDataSize && dataSize <= preferences.maxDataSize) {
            return 1.0;
        }
        if (dataSize < preferences.minDataSize) {
            const ratio = dataSize / preferences.minDataSize;
            return Math.max(0, ratio);
        }
        else {
            const excess = dataSize - preferences.maxDataSize;
            const penalty = excess / preferences.maxDataSize;
            return Math.max(0, 1 - penalty * 0.5);
        }
    }
    /**
     * Oblicza kompatybilność z przestrzenią parametrów
     */
    calculateParameterSpaceCompatibility(paramSpaceSize, preferences) {
        if (paramSpaceSize >= preferences.minParameterSpace && paramSpaceSize <= preferences.maxParameterSpace) {
            return 1.0;
        }
        if (paramSpaceSize < preferences.minParameterSpace) {
            const ratio = paramSpaceSize / preferences.minParameterSpace;
            return Math.max(0, ratio);
        }
        else {
            const excess = paramSpaceSize - preferences.maxParameterSpace;
            const penalty = excess / preferences.maxParameterSpace;
            return Math.max(0, 1 - penalty * 0.3);
        }
    }
    /**
     * Oblicza efektywność czasową
     */
    calculateTimeEfficiency(timeConstraint, preferences) {
        // Normalizuj constraint czasowy (1 = bardzo ograniczony, 5 = bez ograniczeń)
        const normalizedConstraint = Math.max(1, Math.min(5, timeConstraint)) / 5;
        // Jeśli czas jest ograniczony, preferuj algorytmy o wysokiej efektywności czasowej
        if (normalizedConstraint < 0.4) {
            return preferences.timeEfficiency;
        }
        else {
            return 0.5 + preferences.timeEfficiency * 0.5;
        }
    }
    /**
     * Oblicza dopasowanie do wymagań dokładności
     */
    calculateAccuracyMatch(accuracyRequirement, preferences) {
        const normalizedRequirement = Math.max(1, Math.min(5, accuracyRequirement)) / 5;
        const accuracyDifference = Math.abs(normalizedRequirement - preferences.accuracyPotential);
        return Math.max(0, 1 - accuracyDifference);
    }
    /**
     * Oblicza dopasowanie do wymagań stabilności
     */
    calculateStabilityMatch(stabilityRequirement, preferences) {
        const normalizedRequirement = Math.max(1, Math.min(5, stabilityRequirement)) / 5;
        const stabilityDifference = Math.abs(normalizedRequirement - preferences.stabilityScore);
        return Math.max(0, 1 - stabilityDifference);
    }
    /**
     * Generuje meta-parametry dla wybranego algorytmu
     */
    generateMetaParameters(algorithm, context) {
        const baseParams = {
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
    calculateOptimalTrialCount(context) {
        let baseTrials = Math.max(50, Math.min(500, context.parameterSpaceSize * 5));
        // Dostosuj na podstawie ograniczeń czasowych
        if (context.timeConstraint < 3) {
            baseTrials = Math.floor(baseTrials * 0.5);
        }
        else if (context.timeConstraint > 4) {
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
    calculateOptimalTimeout(context) {
        let baseTimeout = Math.max(30, Math.min(480, context.dataSize / 100)); // minutes
        if (context.timeConstraint < 3) {
            baseTimeout = Math.floor(baseTimeout * 0.5);
        }
        else if (context.timeConstraint > 4) {
            baseTimeout = Math.floor(baseTimeout * 2);
        }
        return Math.max(15, Math.min(720, baseTimeout));
    }
    /**
     * Uczy się z wyników optymalizacji i adaptuje algorytmy
     */
    async learnFromOptimizationResult(result) {
        if (!this.learningEnabled)
            return;
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
    async updateAlgorithmProfile(result) {
        const profile = this.algorithmProfiles.get(result.algorithm);
        if (!profile)
            return;
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
    calculateNormalizedPerformanceScore(result) {
        const efficiency = Math.min(1, result.performance.efficiency);
        const stability = Math.min(1, result.performance.stability);
        const reproducibility = Math.min(1, result.performance.reproducibility);
        return (efficiency * 0.5 + stability * 0.3 + reproducibility * 0.2);
    }
    /**
     * Aktualizuje historię adaptacji
     */
    async updateAdaptationHistory(result) {
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
    shouldEvolveAlgorithm(result) {
        const recentResults = this.performanceDatabase
            .filter(r => r.algorithm === result.algorithm)
            .slice(-10); // Last 10 results
        if (recentResults.length < 5)
            return false;
        const avgEfficiency = recentResults.reduce((sum, r) => sum + r.performance.efficiency, 0) / recentResults.length;
        return avgEfficiency < 0.6; // Evolve if efficiency is below 60%
    }
    /**
     * Ewoluuje parametry algorytmu
     */
    async evolveAlgorithmParameters(result) {
        this.logger.info(`🧬 Evolving parameters for ${result.algorithm}`);
        const history = this.adaptationHistory.get(result.algorithm);
        if (!history)
            return;
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
    async exportKnowledgeBase() {
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
    getMetaOptimizationStats() {
        const totalOptimizations = this.performanceDatabase.length;
        const algorithmUsageStats = {};
        let totalEfficiency = 0;
        for (const result of this.performanceDatabase) {
            algorithmUsageStats[result.algorithm] = (algorithmUsageStats[result.algorithm] || 0) + 1;
            totalEfficiency += result.performance.efficiency;
        }
        const averageEfficiency = totalOptimizations > 0 ? totalEfficiency / totalOptimizations : 0;
        const algorithmEfficiencies = new Map();
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
exports.MetaOptimizationEngine = MetaOptimizationEngine;
// ============================================================================
// META-OPTIMIZATION SYSTEM
// ============================================================================
/**
 * Główny system meta-optymalizacji
 */
class MetaOptimizationSystem {
    constructor() {
        this.engine = new MetaOptimizationEngine();
        this.logger = new logger_1.Logger('./logs/meta_optimization_system.log');
        this.isEnabled = true;
    }
    /**
     * Uruchamia meta-optymalizację dla danego kontekstu
     */
    async runMetaOptimization(context) {
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
    createExecutionPlan(recommendation, context) {
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
    createMonitoringSetup(recommendation, context) {
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
    async processOptimizationResult(result) {
        await this.engine.learnFromOptimizationResult(result);
    }
    /**
     * Eksportuje knowledge base
     */
    async exportKnowledgeBase() {
        return await this.engine.exportKnowledgeBase();
    }
    /**
     * Pobiera statystyki systemu
     */
    getSystemStats() {
        return this.engine.getMetaOptimizationStats();
    }
    /**
     * Włącza/wyłącza system
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        this.logger.info(`Meta-optimization system ${enabled ? 'enabled' : 'disabled'}`);
    }
}
exports.MetaOptimizationSystem = MetaOptimizationSystem;

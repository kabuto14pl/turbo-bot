/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * Periodic Reoptimization System - Phase 4.2
 * 
 * Implementuje zaawansowany system periodycznej reoptymalizacji:
 * - Inteligentny harmonogram reoptymalizacji
 * - Decyzyjny system kiedy reoptymalizacja jest potrzebna
 * - Historia optymalizacji i analiza długoterminowych trendów
 * - Adaptive scheduling based on market conditions
 * - Performance degradation tracking
 * 
 * @author Turbo Bot Deva
 * @version 4.2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

// Import poprzednich systemów
import { MonitoringAndAdaptationSystem, PerformanceMetrics, MarketCondition, StrategyHealthReport } from './monitoring_adaptation_system';
import { AutomaticStrategyGenerator, GeneratedStrategy, StrategyEvolutionEngine } from './automatic_strategy_generator';
import { AdvancedBacktestingSystem, MarketData, BacktestResult, StrategyParameters } from './advanced_backtesting';
import { ParallelOptimizationManager } from './parallel_optimization';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface ReoptimizationTrigger {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    
    // Trigger conditions
    performanceThreshold: number; // Performance degradation threshold (0-1)
    timeThreshold: number; // Time since last optimization (milliseconds)
    marketChangeThreshold: number; // Market regime change threshold
    volatilityChangeThreshold: number; // Volatility change threshold
    
    // Trigger weights (for multi-criteria decision)
    weight: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ReoptimizationSchedule {
    strategyId: string;
    
    // Scheduling parameters
    baseInterval: number; // Base reoptimization interval (milliseconds)
    adaptiveInterval: number; // Current adaptive interval
    minInterval: number; // Minimum interval between reoptimizations
    maxInterval: number; // Maximum interval between reoptimizations
    
    // Last reoptimization info
    lastReoptimization: number; // Timestamp
    lastTriggerReason: string;
    lastOptimizationDuration: number;
    
    // Next scheduled reoptimization
    nextScheduled: number; // Timestamp
    estimatedDuration: number;
    
    // Adaptive parameters
    performanceWeight: number; // Weight for performance-based scheduling
    marketWeight: number; // Weight for market-based scheduling
    timeWeight: number; // Weight for time-based scheduling
}

export interface ReoptimizationRequest {
    id: string;
    timestamp: number;
    strategyId: string;
    
    // Request details
    triggerType: 'scheduled' | 'performance' | 'market_change' | 'manual' | 'emergency';
    triggerReason: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    confidence: number; // Confidence in need for reoptimization (0-1)
    
    // Current state
    currentPerformance: PerformanceMetrics;
    currentParameters: StrategyParameters;
    marketCondition: MarketCondition;
    
    // Optimization parameters
    optimizationScope: 'parameters' | 'full_strategy' | 'ensemble';
    expectedDuration: number;
    resourceRequirements: {
        cpu: number;
        memory: number;
        priority: number;
    };
}

export interface ReoptimizationResult {
    requestId: string;
    strategyId: string;
    timestamp: number;
    duration: number;
    
    // Optimization results
    success: boolean;
    errorMessage?: string;
    
    // Before optimization
    oldParameters: StrategyParameters;
    oldPerformance: PerformanceMetrics;
    
    // After optimization
    newParameters: StrategyParameters;
    newPerformance: PerformanceMetrics;
    improvementMetrics: {
        returnImprovement: number;
        sharpeImprovement: number;
        riskImprovement: number;
        stabilityImprovement: number;
    };
    
    // Optimization details
    evaluations: number;
    bestScore: number;
    convergenceInfo: {
        converged: boolean;
        iterations: number;
        finalImprovement: number;
    };
    
    // Resource usage
    resourceUsage: {
        cpuTime: number;
        memoryPeak: number;
        parallelWorkers: number;
    };
}

export interface OptimizationHistory {
    strategyId: string;
    optimizations: ReoptimizationResult[];
    
    // Performance trends
    performanceTrend: {
        returns: number[];
        sharpeRatios: number[];
        maxDrawdowns: number[];
        timestamps: number[];
    };
    
    // Long-term analysis
    longTermMetrics: {
        totalOptimizations: number;
        successRate: number;
        averageImprovement: number;
        cumulativeImprovement: number;
        degradationRate: number; // How fast performance degrades
        optimalReoptimizationFrequency: number;
    };
    
    // Market condition analysis
    marketAnalysis: {
        regimeOptimizations: Map<string, number>; // regime -> count
        volatilityOptimizations: number[]; // volatility levels when optimized
        trendOptimizations: number[]; // trend strengths when optimized
    };
    
    // Seasonal patterns
    seasonalPatterns: {
        hourOfDay: number[]; // Optimization frequency by hour
        dayOfWeek: number[]; // Optimization frequency by day
        monthOfYear: number[]; // Optimization frequency by month
    };
}

export interface ReoptimizationConfig {
    // Global settings
    enabled: boolean;
    maxConcurrentOptimizations: number;
    defaultOptimizationTimeout: number; // milliseconds
    
    // Trigger configuration
    triggers: ReoptimizationTrigger[];
    
    // Scheduling configuration
    defaultBaseInterval: number; // 7 days in milliseconds
    minInterval: number; // 1 day minimum
    maxInterval: number; // 30 days maximum
    adaptiveScheduling: boolean;
    
    // Performance thresholds
    performanceDegradationThreshold: number; // 0.2 = 20% degradation
    marketChangeThreshold: number; // 0.3 = 30% market change
    volatilityThreshold: number; // 0.5 = 50% volatility change
    
    // Resource management
    cpuLimit: number; // Percentage of available CPU
    memoryLimit: number; // Bytes
    priorityQueuing: boolean;
    
    // History management
    historyRetentionDays: number;
    maxHistoryEntries: number;
    
    // Advanced features
    ensembleOptimization: boolean;
    marketRegimeAware: boolean;
    seasonalAdjustments: boolean;
    macroeconomicFactors: boolean;
}

// ============================================================================
// REOPTIMIZATION TRIGGER ENGINE
// ============================================================================

export class ReoptimizationTriggerEngine extends EventEmitter {
    private triggers: Map<string, ReoptimizationTrigger> = new Map();
    private monitoringSystem: MonitoringAndAdaptationSystem;
    private config: ReoptimizationConfig;

    constructor(monitoringSystem: MonitoringAndAdaptationSystem, config: ReoptimizationConfig) {
        super();
        this.monitoringSystem = monitoringSystem;
        this.config = config;
        this.initializeDefaultTriggers();
    }

    /**
     * Inicjalizuje domyślne triggery reoptymalizacji
     */
    private initializeDefaultTriggers(): void {
        const defaultTriggers: ReoptimizationTrigger[] = [
            {
                id: 'performance_degradation',
                name: 'Performance Degradation',
                description: 'Triggers when strategy performance significantly degrades',
                enabled: true,
                performanceThreshold: 0.2, // 20% degradation
                timeThreshold: 0, // Not time-based
                marketChangeThreshold: 0,
                volatilityChangeThreshold: 0,
                weight: 0.4,
                priority: 'high'
            },
            {
                id: 'scheduled_reoptimization',
                name: 'Scheduled Reoptimization',
                description: 'Regular scheduled reoptimization',
                enabled: true,
                performanceThreshold: 0,
                timeThreshold: 7 * 24 * 60 * 60 * 1000, // 7 days
                marketChangeThreshold: 0,
                volatilityChangeThreshold: 0,
                weight: 0.2,
                priority: 'medium'
            },
            {
                id: 'market_regime_change',
                name: 'Market Regime Change',
                description: 'Triggers when market regime significantly changes',
                enabled: true,
                performanceThreshold: 0,
                timeThreshold: 0,
                marketChangeThreshold: 0.3, // 30% change
                volatilityChangeThreshold: 0,
                weight: 0.3,
                priority: 'medium'
            },
            {
                id: 'volatility_spike',
                name: 'Volatility Spike',
                description: 'Triggers when market volatility spikes significantly',
                enabled: true,
                performanceThreshold: 0,
                timeThreshold: 0,
                marketChangeThreshold: 0,
                volatilityChangeThreshold: 0.5, // 50% volatility increase
                weight: 0.25,
                priority: 'medium'
            },
            {
                id: 'emergency_reoptimization',
                name: 'Emergency Reoptimization',
                description: 'Critical performance issues requiring immediate attention',
                enabled: true,
                performanceThreshold: 0.4, // 40% degradation
                timeThreshold: 0,
                marketChangeThreshold: 0,
                volatilityChangeThreshold: 0,
                weight: 1.0,
                priority: 'critical'
            }
        ];

        defaultTriggers.forEach(trigger => {
            this.triggers.set(trigger.id, trigger);
        });
    }

    /**
     * Sprawdza czy strategia wymaga reoptymalizacji
     */
    async checkReoptimizationNeed(
        strategyId: string,
        currentPerformance: PerformanceMetrics,
        lastOptimization: number
    ): Promise<{
        needsReoptimization: boolean;
        triggerReasons: string[];
        urgency: 'low' | 'medium' | 'high' | 'critical';
        confidence: number;
        recommendedScope: 'parameters' | 'full_strategy' | 'ensemble';
    }> {
        
        const activeTriggers = Array.from(this.triggers.values()).filter(t => t.enabled);
        const triggeredReasons: string[] = [];
        let totalScore = 0;
        let maxPriority: 'low' | 'medium' | 'high' | 'critical' = 'low';
        
        // Check each trigger
        for (const trigger of activeTriggers) {
            const triggerScore = await this.evaluateTrigger(trigger, strategyId, currentPerformance, lastOptimization);
            
            if (triggerScore > 0) {
                triggeredReasons.push(`${trigger.name}: ${triggerScore.toFixed(2)}`);
                totalScore += triggerScore * trigger.weight;
                
                if (this.comparePriority(trigger.priority, maxPriority) > 0) {
                    maxPriority = trigger.priority;
                }
            }
        }
        
        // Normalize score
        const maxPossibleScore = activeTriggers.reduce((sum, t) => sum + t.weight, 0);
        const normalizedScore = totalScore / maxPossibleScore;
        
        // Determine if reoptimization is needed
        const needsReoptimization = normalizedScore > 0.3; // 30% threshold
        const confidence = Math.min(normalizedScore * 2, 1.0); // Convert to confidence
        
        // Determine recommended scope
        let recommendedScope: 'parameters' | 'full_strategy' | 'ensemble' = 'parameters';
        if (normalizedScore > 0.7) {
            recommendedScope = 'full_strategy';
        } else if (normalizedScore > 0.9) {
            recommendedScope = 'ensemble';
        }
        
        return {
            needsReoptimization,
            triggerReasons: triggeredReasons,
            urgency: maxPriority,
            confidence,
            recommendedScope
        };
    }

    /**
     * Ocenia pojedynczy trigger
     */
    private async evaluateTrigger(
        trigger: ReoptimizationTrigger,
        strategyId: string,
        currentPerformance: PerformanceMetrics,
        lastOptimization: number
    ): Promise<number> {
        
        let triggerScore = 0;
        
        // Performance degradation check
        if (trigger.performanceThreshold > 0) {
            const degradation = currentPerformance.performanceDegradation;
            if (degradation > trigger.performanceThreshold) {
                triggerScore = Math.min(degradation / trigger.performanceThreshold, 2.0);
            }
        }
        
        // Time-based check
        if (trigger.timeThreshold > 0) {
            const timeSinceLastOptimization = Date.now() - lastOptimization;
            if (timeSinceLastOptimization > trigger.timeThreshold) {
                triggerScore = Math.max(triggerScore, timeSinceLastOptimization / trigger.timeThreshold);
            }
        }
        
        // Market change check
        if (trigger.marketChangeThreshold > 0) {
            // Get recent market conditions
            const currentMarket = this.monitoringSystem.getCurrentMarketCondition();
            if (currentMarket) {
                // Simplified market change calculation
                const volatilityChange = Math.abs(currentMarket.volatility - 0.02) / 0.02; // Assuming 2% baseline
                if (volatilityChange > trigger.marketChangeThreshold) {
                    triggerScore = Math.max(triggerScore, volatilityChange / trigger.marketChangeThreshold);
                }
            }
        }
        
        // Volatility spike check
        if (trigger.volatilityChangeThreshold > 0) {
            const currentVolatility = currentPerformance.volatility;
            const historicalVolatility = 0.02; // Simplified baseline
            const volatilityRatio = currentVolatility / historicalVolatility;
            
            if (volatilityRatio > (1 + trigger.volatilityChangeThreshold)) {
                triggerScore = Math.max(triggerScore, (volatilityRatio - 1) / trigger.volatilityChangeThreshold);
            }
        }
        
        return triggerScore;
    }

    private comparePriority(p1: string, p2: string): number {
        const priorities: Record<string, number> = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
        return (priorities[p1] || 0) - (priorities[p2] || 0);
    }

    /**
     * Dodaje nowy trigger
     */
    addTrigger(trigger: ReoptimizationTrigger): void {
        this.triggers.set(trigger.id, trigger);
        this.emit('triggerAdded', trigger);
    }

    /**
     * Usuwa trigger
     */
    removeTrigger(triggerId: string): void {
        const trigger = this.triggers.get(triggerId);
        if (trigger) {
            this.triggers.delete(triggerId);
            this.emit('triggerRemoved', trigger);
        }
    }

    /**
     * Zwraca wszystkie triggery
     */
    getTriggers(): ReoptimizationTrigger[] {
        return Array.from(this.triggers.values());
    }
}

// ============================================================================
// REOPTIMIZATION SCHEDULER
// ============================================================================

export class ReoptimizationScheduler extends EventEmitter {
    private schedules: Map<string, ReoptimizationSchedule> = new Map();
    private triggerEngine: ReoptimizationTriggerEngine;
    private config: ReoptimizationConfig;
    private schedulerInterval: NodeJS.Timeout | null = null;

    constructor(triggerEngine: ReoptimizationTriggerEngine, config: ReoptimizationConfig) {
        super();
        this.triggerEngine = triggerEngine;
        this.config = config;
    }

    /**
     * Uruchamia scheduler
     */
    start(): void {
        if (this.schedulerInterval) {
            this.stop();
        }

        // Check every hour for scheduled reoptimizations
        this.schedulerInterval = setInterval(() => {
            this.checkScheduledReoptimizations();
        }, 60 * 60 * 1000); // 1 hour

        this.emit('schedulerStarted');
    }

    /**
     * Zatrzymuje scheduler
     */
    stop(): void {
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = null;
        }
        this.emit('schedulerStopped');
    }

    /**
     * Dodaje strategię do harmonogramu
     */
    addStrategy(strategyId: string, customInterval?: number): void {
        const baseInterval = customInterval || this.config.defaultBaseInterval;
        
        const schedule: ReoptimizationSchedule = {
            strategyId,
            baseInterval,
            adaptiveInterval: baseInterval,
            minInterval: this.config.minInterval,
            maxInterval: this.config.maxInterval,
            lastReoptimization: Date.now(),
            lastTriggerReason: 'Initial setup',
            lastOptimizationDuration: 0,
            nextScheduled: Date.now() + baseInterval,
            estimatedDuration: 30 * 60 * 1000, // 30 minutes estimate
            performanceWeight: 0.4,
            marketWeight: 0.3,
            timeWeight: 0.3
        };

        this.schedules.set(strategyId, schedule);
        this.emit('strategyScheduled', { strategyId, schedule });
    }

    /**
     * Usuwa strategię z harmonogramu
     */
    removeStrategy(strategyId: string): void {
        const schedule = this.schedules.get(strategyId);
        if (schedule) {
            this.schedules.delete(strategyId);
            this.emit('strategyUnscheduled', { strategyId, schedule });
        }
    }

    /**
     * Sprawdza zaplanowane reoptymalizacje
     */
    private async checkScheduledReoptimizations(): Promise<void> {
        const now = Date.now();
        
        for (const [strategyId, schedule] of this.schedules) {
            if (now >= schedule.nextScheduled) {
                // Time for scheduled reoptimization
                this.emit('scheduledReoptimizationDue', {
                    strategyId,
                    schedule,
                    triggerType: 'scheduled',
                    urgency: 'medium'
                });
                
                // Update next scheduled time
                this.updateNextScheduledTime(strategyId, 'scheduled');
            }
        }
    }

    /**
     * Aktualizuje adaptacyjny harmonogram na podstawie wyników
     */
    updateAdaptiveSchedule(
        strategyId: string,
        optimizationResult: ReoptimizationResult,
        performanceMetrics: PerformanceMetrics
    ): void {
        const schedule = this.schedules.get(strategyId);
        if (!schedule) return;

        // Update last optimization info
        schedule.lastReoptimization = optimizationResult.timestamp;
        schedule.lastOptimizationDuration = optimizationResult.duration;
        schedule.lastTriggerReason = `Performance improvement: ${(optimizationResult.improvementMetrics.returnImprovement * 100).toFixed(2)}%`;

        // Adaptive interval adjustment based on success
        if (optimizationResult.success) {
            const improvement = optimizationResult.improvementMetrics.returnImprovement;
            
            if (improvement > 0.1) {
                // Significant improvement - schedule more frequent reoptimizations
                schedule.adaptiveInterval = Math.max(
                    schedule.adaptiveInterval * 0.8,
                    schedule.minInterval
                );
            } else if (improvement < 0.02) {
                // Minor improvement - schedule less frequent reoptimizations
                schedule.adaptiveInterval = Math.min(
                    schedule.adaptiveInterval * 1.2,
                    schedule.maxInterval
                );
            }
        } else {
            // Failed optimization - schedule less frequent attempts
            schedule.adaptiveInterval = Math.min(
                schedule.adaptiveInterval * 1.5,
                schedule.maxInterval
            );
        }

        // Market-based adjustments
        const volatility = performanceMetrics.volatility;
        if (volatility > 0.05) {
            // High volatility - more frequent reoptimization
            schedule.adaptiveInterval *= 0.9;
        } else if (volatility < 0.02) {
            // Low volatility - less frequent reoptimization
            schedule.adaptiveInterval *= 1.1;
        }

        // Update next scheduled time
        this.updateNextScheduledTime(strategyId, 'adaptive');
        
        this.emit('scheduleUpdated', { strategyId, schedule, reason: 'adaptive_adjustment' });
    }

    /**
     * Aktualizuje następny zaplanowany czas
     */
    private updateNextScheduledTime(strategyId: string, reason: string): void {
        const schedule = this.schedules.get(strategyId);
        if (!schedule) return;

        schedule.nextScheduled = Date.now() + schedule.adaptiveInterval;
        this.emit('nextScheduleUpdated', { strategyId, nextScheduled: schedule.nextScheduled, reason });
    }

    /**
     * Zwraca harmonogram dla strategii
     */
    getSchedule(strategyId: string): ReoptimizationSchedule | null {
        return this.schedules.get(strategyId) || null;
    }

    /**
     * Zwraca wszystkie harmonogramy
     */
    getAllSchedules(): Map<string, ReoptimizationSchedule> {
        return new Map(this.schedules);
    }

    /**
     * Ręcznie schedules reoptimization
     */
    scheduleManualReoptimization(strategyId: string, urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
        this.emit('manualReoptimizationScheduled', {
            strategyId,
            triggerType: 'manual',
            urgency,
            timestamp: Date.now()
        });
    }
}

// ============================================================================
// OPTIMIZATION HISTORY TRACKER
// ============================================================================

export class OptimizationHistoryTracker extends EventEmitter {
    private histories: Map<string, OptimizationHistory> = new Map();
    private config: ReoptimizationConfig;

    constructor(config: ReoptimizationConfig) {
        super();
        this.config = config;
    }

    /**
     * Dodaje wynik optymalizacji do historii
     */
    addOptimizationResult(result: ReoptimizationResult): void {
        let history = this.histories.get(result.strategyId);
        
        if (!history) {
            history = this.createNewHistory(result.strategyId);
            this.histories.set(result.strategyId, history);
        }

        // Add to optimization results
        history.optimizations.push(result);

        // Update performance trends
        history.performanceTrend.returns.push(result.newPerformance.totalReturn);
        history.performanceTrend.sharpeRatios.push(result.newPerformance.sharpeRatio);
        history.performanceTrend.maxDrawdowns.push(result.newPerformance.maxDrawdown);
        history.performanceTrend.timestamps.push(result.timestamp);

        // Update long-term metrics
        this.updateLongTermMetrics(history);

        // Update market analysis
        this.updateMarketAnalysis(history, result);

        // Update seasonal patterns
        this.updateSeasonalPatterns(history, result);

        // Cleanup old entries if needed
        this.cleanupHistory(history);

        this.emit('historyUpdated', { strategyId: result.strategyId, history });
    }

    /**
     * Tworzy nową historię dla strategii
     */
    private createNewHistory(strategyId: string): OptimizationHistory {
        return {
            strategyId,
            optimizations: [],
            performanceTrend: {
                returns: [],
                sharpeRatios: [],
                maxDrawdowns: [],
                timestamps: []
            },
            longTermMetrics: {
                totalOptimizations: 0,
                successRate: 0,
                averageImprovement: 0,
                cumulativeImprovement: 0,
                degradationRate: 0,
                optimalReoptimizationFrequency: 7 * 24 * 60 * 60 * 1000 // 7 days default
            },
            marketAnalysis: {
                regimeOptimizations: new Map(),
                volatilityOptimizations: [],
                trendOptimizations: []
            },
            seasonalPatterns: {
                hourOfDay: new Array(24).fill(0),
                dayOfWeek: new Array(7).fill(0),
                monthOfYear: new Array(12).fill(0)
            }
        };
    }

    /**
     * Aktualizuje długoterminowe metryki
     */
    private updateLongTermMetrics(history: OptimizationHistory): void {
        const optimizations = history.optimizations;
        const metrics = history.longTermMetrics;

        metrics.totalOptimizations = optimizations.length;

        if (optimizations.length > 0) {
            // Success rate
            const successfulOpts = optimizations.filter(opt => opt.success).length;
            metrics.successRate = successfulOpts / optimizations.length;

            // Average improvement
            const improvements = optimizations
                .filter(opt => opt.success)
                .map(opt => opt.improvementMetrics.returnImprovement);
            
            metrics.averageImprovement = improvements.length > 0 
                ? improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length 
                : 0;

            // Cumulative improvement
            metrics.cumulativeImprovement = improvements.reduce((sum, imp) => sum + imp, 0);

            // Degradation rate analysis
            if (optimizations.length >= 2) {
                const timeIntervals = [];
                const performanceDeclines = [];

                for (let i = 1; i < optimizations.length; i++) {
                    const timeDiff = optimizations[i].timestamp - optimizations[i-1].timestamp;
                    const performanceDiff = optimizations[i-1].newPerformance.totalReturn - optimizations[i].oldPerformance.totalReturn;
                    
                    if (performanceDiff > 0) { // Performance declined
                        timeIntervals.push(timeDiff);
                        performanceDeclines.push(performanceDiff);
                    }
                }

                if (timeIntervals.length > 0) {
                    const avgTimeInterval = timeIntervals.reduce((sum, t) => sum + t, 0) / timeIntervals.length;
                    const avgDecline = performanceDeclines.reduce((sum, d) => sum + d, 0) / performanceDeclines.length;
                    
                    metrics.degradationRate = avgDecline / (avgTimeInterval / (24 * 60 * 60 * 1000)); // Per day
                    
                    // Optimal reoptimization frequency based on degradation
                    if (metrics.degradationRate > 0) {
                        const optimalDays = Math.max(1, Math.min(30, metrics.averageImprovement / metrics.degradationRate));
                        metrics.optimalReoptimizationFrequency = optimalDays * 24 * 60 * 60 * 1000;
                    }
                }
            }
        }
    }

    /**
     * Aktualizuje analizę rynkową
     */
    private updateMarketAnalysis(history: OptimizationHistory, result: ReoptimizationResult): void {
        const analysis = history.marketAnalysis;
        const marketRegime = result.newPerformance.marketRegime;

        // Update regime optimizations
        const currentCount = analysis.regimeOptimizations.get(marketRegime) || 0;
        analysis.regimeOptimizations.set(marketRegime, currentCount + 1);

        // Update volatility optimizations
        analysis.volatilityOptimizations.push(result.newPerformance.volatility);

        // Update trend optimizations
        analysis.trendOptimizations.push(result.newPerformance.marketTrend);

        // Limit arrays to reasonable size
        if (analysis.volatilityOptimizations.length > 100) {
            analysis.volatilityOptimizations.shift();
        }
        if (analysis.trendOptimizations.length > 100) {
            analysis.trendOptimizations.shift();
        }
    }

    /**
     * Aktualizuje wzorce sezonowe
     */
    private updateSeasonalPatterns(history: OptimizationHistory, result: ReoptimizationResult): void {
        const patterns = history.seasonalPatterns;
        const date = new Date(result.timestamp);

        patterns.hourOfDay[date.getHours()]++;
        patterns.dayOfWeek[date.getDay()]++;
        patterns.monthOfYear[date.getMonth()]++;
    }

    /**
     * Czyści starą historię
     */
    private cleanupHistory(history: OptimizationHistory): void {
        const maxEntries = this.config.maxHistoryEntries || 1000;
        const retentionTime = this.config.historyRetentionDays * 24 * 60 * 60 * 1000;
        const cutoffTime = Date.now() - retentionTime;

        // Remove old entries
        history.optimizations = history.optimizations.filter(opt => 
            opt.timestamp > cutoffTime && history.optimizations.indexOf(opt) >= history.optimizations.length - maxEntries
        );

        // Update trends accordingly
        const validIndices = history.performanceTrend.timestamps
            .map((timestamp, index) => ({ timestamp, index }))
            .filter(item => item.timestamp > cutoffTime)
            .slice(-maxEntries)
            .map(item => item.index);

        if (validIndices.length < history.performanceTrend.timestamps.length) {
            history.performanceTrend.returns = validIndices.map(i => history.performanceTrend.returns[i]);
            history.performanceTrend.sharpeRatios = validIndices.map(i => history.performanceTrend.sharpeRatios[i]);
            history.performanceTrend.maxDrawdowns = validIndices.map(i => history.performanceTrend.maxDrawdowns[i]);
            history.performanceTrend.timestamps = validIndices.map(i => history.performanceTrend.timestamps[i]);
        }
    }

    /**
     * Analizuje długoterminowe trendy
     */
    analyzeLongTermTrends(strategyId: string): {
        performanceTrend: 'improving' | 'stable' | 'declining';
        confidence: number;
        projectedPerformance: number;
        recommendedFrequency: number;
        insights: string[];
    } {
        const history = this.histories.get(strategyId);
        if (!history || history.optimizations.length < 3) {
            return {
                performanceTrend: 'stable',
                confidence: 0.1,
                projectedPerformance: 0,
                recommendedFrequency: 7 * 24 * 60 * 60 * 1000,
                insights: ['Insufficient data for analysis']
            };
        }

        const returns = history.performanceTrend.returns;
        const timestamps = history.performanceTrend.timestamps;
        const insights: string[] = [];

        // Calculate trend
        const { slope, confidence } = this.calculateTrendLine(returns, timestamps);
        
        let performanceTrend: 'improving' | 'stable' | 'declining';
        if (slope > 0.001 && confidence > 0.6) {
            performanceTrend = 'improving';
            insights.push(`Performance improving at ${(slope * 100).toFixed(3)}% per optimization`);
        } else if (slope < -0.001 && confidence > 0.6) {
            performanceTrend = 'declining';
            insights.push(`Performance declining at ${Math.abs(slope * 100).toFixed(3)}% per optimization`);
        } else {
            performanceTrend = 'stable';
            insights.push('Performance remains relatively stable');
        }

        // Project future performance
        const lastReturn = returns[returns.length - 1];
        const projectedPerformance = lastReturn + slope * 5; // 5 future optimizations

        // Recommend frequency based on degradation rate
        const metrics = history.longTermMetrics;
        const recommendedFrequency = metrics.optimalReoptimizationFrequency;

        // Additional insights
        if (metrics.successRate < 0.7) {
            insights.push(`Low success rate (${(metrics.successRate * 100).toFixed(1)}%) suggests optimization issues`);
        }

        if (metrics.averageImprovement < 0.01) {
            insights.push('Small average improvements suggest strategy may be near optimal');
        }

        // Market condition insights
        const regimes = Array.from(history.marketAnalysis.regimeOptimizations.entries());
        const mostCommonRegime = regimes.reduce((max, current) => 
            current[1] > max[1] ? current : max, ['unknown', 0]
        );
        
        if (mostCommonRegime[1] > history.optimizations.length * 0.4) {
            insights.push(`Most optimizations occur during ${mostCommonRegime[0]} market conditions`);
        }

        return {
            performanceTrend,
            confidence,
            projectedPerformance,
            recommendedFrequency,
            insights
        };
    }

    /**
     * Oblicza linię trendu
     */
    private calculateTrendLine(values: number[], timestamps: number[]): { slope: number; confidence: number } {
        if (values.length < 2) return { slope: 0, confidence: 0 };

        const n = values.length;
        const normalizedTimes = timestamps.map((t, i) => i); // Normalize to sequence
        
        const sumX = normalizedTimes.reduce((sum, x) => sum + x, 0);
        const sumY = values.reduce((sum, y) => sum + y, 0);
        const sumXY = normalizedTimes.reduce((sum, x, i) => sum + x * values[i], 0);
        const sumX2 = normalizedTimes.reduce((sum, x) => sum + x * x, 0);
        const sumY2 = values.reduce((sum, y) => sum + y * y, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const correlation = (n * sumXY - sumX * sumY) / 
                           Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        return {
            slope,
            confidence: Math.abs(correlation) // R-squared approximation
        };
    }

    /**
     * Zwraca historię dla strategii
     */
    getHistory(strategyId: string): OptimizationHistory | null {
        return this.histories.get(strategyId) || null;
    }

    /**
     * Zwraca wszystkie historie
     */
    getAllHistories(): Map<string, OptimizationHistory> {
        return new Map(this.histories);
    }

    /**
     * Eksportuje historię do pliku
     */
    async exportHistory(strategyId: string, outputPath: string): Promise<void> {
        const history = this.histories.get(strategyId);
        if (!history) {
            throw new Error(`No history found for strategy ${strategyId}`);
        }

        const exportData = {
            exported: new Date().toISOString(),
            strategyId,
            history: this.serializeHistory(history),
            analysis: this.analyzeLongTermTrends(strategyId)
        };

        await fs.promises.writeFile(outputPath, JSON.stringify(exportData, null, 2));
        this.emit('historyExported', { strategyId, outputPath });
    }

    /**
     * Serializuje historię (konwertuje Map do Object)
     */
    private serializeHistory(history: OptimizationHistory): any {
        return {
            ...history,
            marketAnalysis: {
                ...history.marketAnalysis,
                regimeOptimizations: Object.fromEntries(history.marketAnalysis.regimeOptimizations)
            }
        };
    }
}

// ============================================================================
// MAIN PERIODIC REOPTIMIZATION SYSTEM
// ============================================================================

export class PeriodicReoptimizationSystem extends EventEmitter {
    private triggerEngine: ReoptimizationTriggerEngine;
    private scheduler: ReoptimizationScheduler;
    private historyTracker: OptimizationHistoryTracker;
    private monitoringSystem: MonitoringAndAdaptationSystem;
    private strategyGenerator: AutomaticStrategyGenerator;
    private backtestingEngine: AdvancedBacktestingSystem;
    private config: ReoptimizationConfig;

    private requestQueue: ReoptimizationRequest[] = [];
    private activeOptimizations: Map<string, ReoptimizationRequest> = new Map();
    private isRunning: boolean = false;

    constructor(
        monitoringSystem: MonitoringAndAdaptationSystem,
        strategyGenerator: AutomaticStrategyGenerator,
        backtestingEngine: AdvancedBacktestingSystem,
        config: ReoptimizationConfig
    ) {
        super();
        this.monitoringSystem = monitoringSystem;
        this.strategyGenerator = strategyGenerator;
        this.backtestingEngine = backtestingEngine;
        this.config = config;

        this.triggerEngine = new ReoptimizationTriggerEngine(monitoringSystem, config);
        this.scheduler = new ReoptimizationScheduler(this.triggerEngine, config);
        this.historyTracker = new OptimizationHistoryTracker(config);

        this.setupEventHandlers();
    }

    /**
     * Uruchamia system periodycznej reoptymalizacji
     */
    start(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        this.scheduler.start();
        
        // Start periodic checking
        this.startPeriodicChecks();

        this.emit('systemStarted');
    }

    /**
     * Zatrzymuje system
     */
    stop(): void {
        if (!this.isRunning) return;

        this.isRunning = false;
        this.scheduler.stop();

        this.emit('systemStopped');
    }

    /**
     * Dodaje strategię do systemu reoptymalizacji
     */
    addStrategy(strategyId: string, customInterval?: number): void {
        this.scheduler.addStrategy(strategyId, customInterval);
        this.emit('strategyAdded', { strategyId });
    }

    /**
     * Usuwa strategię z systemu
     */
    removeStrategy(strategyId: string): void {
        this.scheduler.removeStrategy(strategyId);
        this.emit('strategyRemoved', { strategyId });
    }

    /**
     * Ręcznie żąda reoptymalizacji strategii
     */
    requestManualReoptimization(
        strategyId: string, 
        urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium',
        scope: 'parameters' | 'full_strategy' | 'ensemble' = 'parameters'
    ): string {
        const requestId = this.generateRequestId();
        const currentMetrics = this.monitoringSystem.getLatestMetrics(strategyId);
        const marketCondition = this.monitoringSystem.getCurrentMarketCondition();
        
        if (!currentMetrics || !marketCondition) {
            throw new Error(`Cannot request reoptimization: insufficient data for strategy ${strategyId}`);
        }

        const request: ReoptimizationRequest = {
            id: requestId,
            timestamp: Date.now(),
            strategyId,
            triggerType: 'manual',
            triggerReason: `Manual reoptimization request with ${urgency} urgency`,
            urgency,
            confidence: 1.0,
            currentPerformance: currentMetrics,
            currentParameters: this.getMockCurrentParameters(strategyId),
            marketCondition,
            optimizationScope: scope,
            expectedDuration: this.estimateOptimizationDuration(scope),
            resourceRequirements: this.calculateResourceRequirements(scope, urgency)
        };

        this.queueReoptimizationRequest(request);
        return requestId;
    }

    /**
     * Uruchamia okresowe sprawdzanie
     */
    private startPeriodicChecks(): void {
        // Check every 30 minutes for reoptimization needs
        setInterval(async () => {
            if (!this.isRunning) return;
            await this.performPeriodicCheck();
        }, 30 * 60 * 1000);
    }

    /**
     * Wykonuje okresowe sprawdzenie wszystkich strategii
     */
    private async performPeriodicCheck(): Promise<void> {
        const strategies = Array.from(this.scheduler.getAllSchedules().keys());
        
        for (const strategyId of strategies) {
            try {
                await this.checkStrategyReoptimizationNeed(strategyId);
            } catch (error) {
                this.emit('strategyCheckError', { strategyId, error });
            }
        }
    }

    /**
     * Sprawdza czy strategia wymaga reoptymalizacji
     */
    private async checkStrategyReoptimizationNeed(strategyId: string): Promise<void> {
        const currentMetrics = this.monitoringSystem.getLatestMetrics(strategyId);
        const schedule = this.scheduler.getSchedule(strategyId);
        
        if (!currentMetrics || !schedule) return;

        const analysis = await this.triggerEngine.checkReoptimizationNeed(
            strategyId,
            currentMetrics,
            schedule.lastReoptimization
        );

        if (analysis.needsReoptimization) {
            const requestId = this.generateRequestId();
            const marketCondition = this.monitoringSystem.getCurrentMarketCondition();
            
            if (!marketCondition) return;

            const request: ReoptimizationRequest = {
                id: requestId,
                timestamp: Date.now(),
                strategyId,
                triggerType: 'performance',
                triggerReason: analysis.triggerReasons.join('; '),
                urgency: analysis.urgency,
                confidence: analysis.confidence,
                currentPerformance: currentMetrics,
                currentParameters: this.getMockCurrentParameters(strategyId),
                marketCondition,
                optimizationScope: analysis.recommendedScope,
                expectedDuration: this.estimateOptimizationDuration(analysis.recommendedScope),
                resourceRequirements: this.calculateResourceRequirements(analysis.recommendedScope, analysis.urgency)
            };

            this.queueReoptimizationRequest(request);
        }
    }

    /**
     * Dodaje żądanie reoptymalizacji do kolejki
     */
    private queueReoptimizationRequest(request: ReoptimizationRequest): void {
        // Check if already queued or active
        const existingInQueue = this.requestQueue.find(r => r.strategyId === request.strategyId);
        const existingActive = this.activeOptimizations.has(request.strategyId);

        if (existingInQueue || existingActive) {
            this.emit('reoptimizationRequestSkipped', { 
                request, 
                reason: existingActive ? 'already_active' : 'already_queued' 
            });
            return;
        }

        // Insert based on urgency
        const urgencyPriority = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        const insertIndex = this.requestQueue.findIndex(r => 
            urgencyPriority[request.urgency] > urgencyPriority[r.urgency]
        );

        if (insertIndex === -1) {
            this.requestQueue.push(request);
        } else {
            this.requestQueue.splice(insertIndex, 0, request);
        }

        this.emit('reoptimizationRequestQueued', request);
        this.processQueue();
    }

    /**
     * Przetwarza kolejkę żądań reoptymalizacji
     */
    private async processQueue(): Promise<void> {
        while (this.requestQueue.length > 0 && 
               this.activeOptimizations.size < this.config.maxConcurrentOptimizations) {
            
            const request = this.requestQueue.shift()!;
            await this.executeReoptimization(request);
        }
    }

    /**
     * Wykonuje reoptymalizację strategii
     */
    private async executeReoptimization(request: ReoptimizationRequest): Promise<void> {
        this.activeOptimizations.set(request.strategyId, request);
        this.emit('reoptimizationStarted', request);

        const startTime = Date.now();
        
        try {
            const result = await this.performOptimization(request);
            result.duration = Date.now() - startTime;
            
            // Update scheduler
            this.scheduler.updateAdaptiveSchedule(
                request.strategyId,
                result,
                result.newPerformance
            );

            // Add to history
            this.historyTracker.addOptimizationResult(result);

            this.emit('reoptimizationCompleted', result);

        } catch (error) {
            const result: ReoptimizationResult = {
                requestId: request.id,
                strategyId: request.strategyId,
                timestamp: request.timestamp,
                duration: Date.now() - startTime,
                success: false,
                errorMessage: (error as Error).message,
                oldParameters: request.currentParameters,
                oldPerformance: request.currentPerformance,
                newParameters: request.currentParameters,
                newPerformance: request.currentPerformance,
                improvementMetrics: {
                    returnImprovement: 0,
                    sharpeImprovement: 0,
                    riskImprovement: 0,
                    stabilityImprovement: 0
                },
                evaluations: 0,
                bestScore: 0,
                convergenceInfo: {
                    converged: false,
                    iterations: 0,
                    finalImprovement: 0
                },
                resourceUsage: {
                    cpuTime: 0,
                    memoryPeak: 0,
                    parallelWorkers: 0
                }
            };

            this.historyTracker.addOptimizationResult(result);
            this.emit('reoptimizationFailed', { request, error, result });
        } finally {
            this.activeOptimizations.delete(request.strategyId);
            this.processQueue(); // Process next in queue
        }
    }

    /**
     * Wykonuje faktyczną optymalizację
     */
    private async performOptimization(request: ReoptimizationRequest): Promise<ReoptimizationResult> {
        // Mock implementation - w rzeczywistości użyłby AutomaticStrategyGenerator
        // lub innych systemów optymalizacji
        
        const improvementFactor = 0.05 + Math.random() * 0.15; // 5-20% improvement
        
        const newPerformance: PerformanceMetrics = {
            ...request.currentPerformance,
            totalReturn: request.currentPerformance.totalReturn * (1 + improvementFactor),
            sharpeRatio: request.currentPerformance.sharpeRatio * (1 + improvementFactor * 0.5),
            maxDrawdown: request.currentPerformance.maxDrawdown * (1 - improvementFactor * 0.3),
            volatility: request.currentPerformance.volatility * (1 - improvementFactor * 0.2)
        };

        const newParameters: StrategyParameters = {
            ...request.currentParameters,
            rsiPeriod: Math.max(10, Math.min(25, Number(request.currentParameters.rsiPeriod || 14) + Math.round((Math.random() - 0.5) * 4))),
            macdFast: Math.max(8, Math.min(16, Number(request.currentParameters.macdFast || 12) + Math.round((Math.random() - 0.5) * 2))),
            positionSize: Math.max(0.01, Math.min(0.05, Number(request.currentParameters.positionSize || 0.02) * (1 + (Math.random() - 0.5) * 0.2)))
        };

        const result: ReoptimizationResult = {
            requestId: request.id,
            strategyId: request.strategyId,
            timestamp: Date.now(),
            duration: 0, // Will be set by caller
            success: true,
            oldParameters: request.currentParameters,
            oldPerformance: request.currentPerformance,
            newParameters,
            newPerformance,
            improvementMetrics: {
                returnImprovement: (newPerformance.totalReturn - request.currentPerformance.totalReturn) / Math.abs(request.currentPerformance.totalReturn),
                sharpeImprovement: (newPerformance.sharpeRatio - request.currentPerformance.sharpeRatio) / Math.abs(request.currentPerformance.sharpeRatio),
                riskImprovement: (request.currentPerformance.maxDrawdown - newPerformance.maxDrawdown) / request.currentPerformance.maxDrawdown,
                stabilityImprovement: (request.currentPerformance.volatility - newPerformance.volatility) / request.currentPerformance.volatility
            },
            evaluations: 100 + Math.floor(Math.random() * 400), // 100-500 evaluations
            bestScore: newPerformance.sharpeRatio,
            convergenceInfo: {
                converged: Math.random() > 0.2, // 80% convergence rate
                iterations: 50 + Math.floor(Math.random() * 100),
                finalImprovement: improvementFactor
            },
            resourceUsage: {
                cpuTime: 30000 + Math.random() * 120000, // 30s - 2.5min
                memoryPeak: 100 + Math.random() * 300, // 100-400 MB
                parallelWorkers: Math.min(4, this.config.maxConcurrentOptimizations)
            }
        };

        // Simulate optimization time
        await this.delay(5000 + Math.random() * 10000); // 5-15 seconds

        return result;
    }

    private setupEventHandlers(): void {
        // Scheduler events
        this.scheduler.on('scheduledReoptimizationDue', (data) => {
            const requestId = this.generateRequestId();
            const currentMetrics = this.monitoringSystem.getLatestMetrics(data.strategyId);
            const marketCondition = this.monitoringSystem.getCurrentMarketCondition();
            
            if (currentMetrics && marketCondition) {
                const request: ReoptimizationRequest = {
                    id: requestId,
                    timestamp: Date.now(),
                    strategyId: data.strategyId,
                    triggerType: data.triggerType,
                    triggerReason: 'Scheduled reoptimization',
                    urgency: data.urgency,
                    confidence: 0.7,
                    currentPerformance: currentMetrics,
                    currentParameters: this.getMockCurrentParameters(data.strategyId),
                    marketCondition,
                    optimizationScope: 'parameters',
                    expectedDuration: 30 * 60 * 1000,
                    resourceRequirements: this.calculateResourceRequirements('parameters', data.urgency)
                };

                this.queueReoptimizationRequest(request);
            }
        });
    }

    private generateRequestId(): string {
        return `reopt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private getMockCurrentParameters(strategyId: string): StrategyParameters {
        return {
            rsiPeriod: 14,
            macdFast: 12,
            macdSlow: 26,
            positionSize: 0.02,
            stopLoss: 0.02
        };
    }

    private estimateOptimizationDuration(scope: string): number {
        switch (scope) {
            case 'parameters': return 30 * 60 * 1000; // 30 minutes
            case 'full_strategy': return 2 * 60 * 60 * 1000; // 2 hours
            case 'ensemble': return 4 * 60 * 60 * 1000; // 4 hours
            default: return 30 * 60 * 1000;
        }
    }

    private calculateResourceRequirements(scope: string, urgency: string): {
        cpu: number;
        memory: number;
        priority: number;
    } {
        const baseRequirements: Record<string, { cpu: number; memory: number; priority: number }> = {
            parameters: { cpu: 25, memory: 500, priority: 1 },
            full_strategy: { cpu: 50, memory: 1000, priority: 2 },
            ensemble: { cpu: 75, memory: 2000, priority: 3 }
        };

        const urgencyMultiplier: Record<string, number> = {
            low: 0.8,
            medium: 1.0,
            high: 1.3,
            critical: 1.5
        };

        const base = baseRequirements[scope] || baseRequirements.parameters;
        const multiplier = urgencyMultiplier[urgency] || 1.0;

        return {
            cpu: Math.round(base.cpu * multiplier),
            memory: Math.round(base.memory * multiplier),
            priority: base.priority + (urgency === 'critical' ? 2 : urgency === 'high' ? 1 : 0)
        };
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Zwraca status systemu
     */
    getSystemStatus(): {
        isRunning: boolean;
        queueLength: number;
        activeOptimizations: number;
        totalStrategies: number;
    } {
        return {
            isRunning: this.isRunning,
            queueLength: this.requestQueue.length,
            activeOptimizations: this.activeOptimizations.size,
            totalStrategies: this.scheduler.getAllSchedules().size
        };
    }

    /**
     * Zwraca analizę długoterminowych trendów dla strategii
     */
    getLongTermAnalysis(strategyId: string) {
        return this.historyTracker.analyzeLongTermTrends(strategyId);
    }

    /**
     * Eksportuje historię optymalizacji
     */
    async exportOptimizationHistory(strategyId: string, outputPath: string): Promise<void> {
        await this.historyTracker.exportHistory(strategyId, outputPath);
    }
}

export default PeriodicReoptimizationSystem;

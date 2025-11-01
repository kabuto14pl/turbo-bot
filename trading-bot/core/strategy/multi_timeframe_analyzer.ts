/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🎯 MULTI-TIMEFRAME STRATEGY ANALYZER V2
 * Enterprise system for analyzing strategies across multiple timeframes
 */

import { EventEmitter } from 'events';
import { BotState } from '../types/bot_state';
import { StrategySignal } from '../types/strategy';
import { Regime } from '../types/regime';
import { Logger } from '../utils/logger';

// ============================================================================
// 🎯 TIMEFRAME ANALYSIS INTERFACES
// ============================================================================

export interface TimeframeConfig {
    timeframe: string;
    weight: number;
    enabled: boolean;
    lookbackPeriods: number;
    minConfidence: number;
}

export interface TimeframeSignal {
    timeframe: string;
    signal: StrategySignal;
    strength: number;
    trend: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    timestamp: number;
}

export interface MultiTimeframeSignal extends StrategySignal {
    sourceTimeframes: string[];
    alignmentScore: number;
    conflictScore: number;
    dominantTimeframe: string;
}

export interface MultiTimeframeAnalysis {
    overallSignal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    timeframeSignals: TimeframeSignal[];
    conflictScore: number; // 0-1, higher = more conflict between timeframes
    trendAlignment: number; // 0-1, higher = better alignment
    strengthScore: number; // 0-1, overall signal strength
    recommendations: {
        action: string;
        reasoning: string[];
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    };
}

export interface TimeframeTrend {
    timeframe: string;
    direction: 'UP' | 'DOWN' | 'SIDEWAYS';
    strength: number; // 0-1
    duration: number; // periods
    confidence: number; // 0-1
    momentum: number; // -1 to 1
}

export interface MarketRegimeAnalysis {
    currentRegime: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'BREAKOUT';
    regimeStrength: number; // 0-1
    timeframeConsensus: number; // 0-1, agreement across timeframes
    expectedDuration: number; // estimated periods until regime change
    supportedActions: ('BUY' | 'SELL' | 'HOLD')[];
}

// ============================================================================
// 🏗️ MULTI-TIMEFRAME STRATEGY ANALYZER
// ============================================================================

export class MultiTimeframeStrategyAnalyzer extends EventEmitter {
    private timeframeConfigs: Map<string, TimeframeConfig> = new Map();
    private timeframeSignals: Map<string, TimeframeSignal[]> = new Map();
    private trendCache: Map<string, TimeframeTrend> = new Map();
    private regimeHistory: MarketRegimeAnalysis[] = [];
    private logger: Logger;
    private maxHistorySize: number = 1000;

    constructor(logger?: Logger) {
        super();
        this.logger = logger || new Logger();

        // Initialize default timeframe configurations
        this.initializeDefaultTimeframes();

        this.logger.info('🎯 Multi-Timeframe Strategy Analyzer initialized');
    }

    private initializeDefaultTimeframes(): void {
        const defaultTimeframes: TimeframeConfig[] = [
            { timeframe: 'm15', weight: 0.2, enabled: true, lookbackPeriods: 50, minConfidence: 0.4 },
            { timeframe: 'h1', weight: 0.3, enabled: true, lookbackPeriods: 100, minConfidence: 0.5 },
            { timeframe: 'h4', weight: 0.3, enabled: true, lookbackPeriods: 50, minConfidence: 0.6 },
            { timeframe: 'd1', weight: 0.2, enabled: true, lookbackPeriods: 30, minConfidence: 0.7 }
        ];

        defaultTimeframes.forEach(config => {
            this.timeframeConfigs.set(config.timeframe, config);
            this.timeframeSignals.set(config.timeframe, []);
        });
    }

    // ========================================================================
    // 🎯 TIMEFRAME CONFIGURATION
    // ========================================================================

    configureTimeframe(timeframe: string, config: Partial<TimeframeConfig>): void {
        const existing = this.timeframeConfigs.get(timeframe) || {
            timeframe,
            weight: 0.25,
            enabled: true,
            lookbackPeriods: 50,
            minConfidence: 0.5
        };

        const updated = { ...existing, ...config };
        this.timeframeConfigs.set(timeframe, updated);

        if (!this.timeframeSignals.has(timeframe)) {
            this.timeframeSignals.set(timeframe, []);
        }

        this.logger.info(`⚙️ Timeframe ${timeframe} configured:`, updated);
    }

    getTimeframeConfig(timeframe: string): TimeframeConfig | null {
        return this.timeframeConfigs.get(timeframe) || null;
    }

    getEnabledTimeframes(): string[] {
        return Array.from(this.timeframeConfigs.entries())
            .filter(([_, config]) => config.enabled)
            .map(([timeframe, _]) => timeframe);
    }

    // ========================================================================
    // 🎯 SIGNAL ANALYSIS
    // ========================================================================

    async analyzeMultiTimeframe(
        strategies: Map<string, any>,
        state: BotState
    ): Promise<MultiTimeframeAnalysis> {
        const timeframeSignals: TimeframeSignal[] = [];

        // Generate signals for each enabled timeframe
        for (const [timeframe, config] of this.timeframeConfigs) {
            if (!config.enabled) continue;

            const tfSignals = await this.generateTimeframeSignals(
                strategies,
                state,
                timeframe,
                config
            );

            timeframeSignals.push(...tfSignals);
        }

        // Store signals for history
        this.updateSignalHistory(timeframeSignals);

        // Analyze signal conflicts and alignment
        const conflictScore = this.calculateConflictScore(timeframeSignals);
        const trendAlignment = this.calculateTrendAlignment(timeframeSignals);
        const strengthScore = this.calculateStrengthScore(timeframeSignals);

        // Generate overall signal
        const overallSignal = this.generateOverallSignal(timeframeSignals);
        const confidence = this.calculateOverallConfidence(timeframeSignals, conflictScore, trendAlignment);

        // Generate recommendations
        const recommendations = this.generateRecommendations(
            overallSignal,
            timeframeSignals,
            conflictScore,
            trendAlignment
        );

        const analysis: MultiTimeframeAnalysis = {
            overallSignal,
            confidence,
            timeframeSignals,
            conflictScore,
            trendAlignment,
            strengthScore,
            recommendations
        };

        this.logger.info(`🎯 Multi-timeframe analysis: ${overallSignal} (confidence: ${(confidence * 100).toFixed(1)}%)`);
        this.emit('analysisComplete', analysis);

        return analysis;
    }

    private async generateTimeframeSignals(
        strategies: Map<string, any>,
        state: BotState,
        timeframe: string,
        config: TimeframeConfig
    ): Promise<TimeframeSignal[]> {
        const signals: TimeframeSignal[] = [];

        // Create timeframe-specific state
        const tfState = this.createTimeframeState(state, timeframe);

        for (const [strategyName, strategy] of strategies) {
            try {
                const signal = strategy.generateSignal(tfState);

                if (signal && signal.confidence >= config.minConfidence) {
                    const tfSignal: TimeframeSignal = {
                        timeframe,
                        signal,
                        strength: signal.confidence,
                        trend: this.determineTrend(signal, tfState),
                        confidence: signal.confidence,
                        timestamp: Date.now()
                    };

                    signals.push(tfSignal);
                }
            } catch (error) {
                this.logger.warn(`⚠️ Strategy ${strategyName} failed for timeframe ${timeframe}:`, error);
            }
        }

        return signals;
    }

    private createTimeframeState(state: BotState, timeframe: string): BotState {
        // Create a modified state for the specific timeframe
        const tfState = { ...state };

        // Use the appropriate timeframe data
        switch (timeframe) {
            case 'm15':
                tfState.prices = { ...state.prices, m15: state.prices.m15 };
                tfState.indicators = { ...state.indicators, m15: state.indicators.m15 };
                break;
            case 'h1':
                if (state.prices.h1) {
                    tfState.prices = { ...state.prices, m15: state.prices.h1, h1: state.prices.h1 };
                    tfState.indicators = { ...state.indicators, m15: state.indicators.h1 || state.indicators.m15 };
                }
                break;
            case 'h4':
                if (state.prices.h4) {
                    tfState.prices = { ...state.prices, m15: state.prices.h4, h4: state.prices.h4 };
                    tfState.indicators = { ...state.indicators, m15: state.indicators.h4 || state.indicators.m15 };
                }
                break;
            case 'd1':
                if (state.prices.d1) {
                    tfState.prices = { ...state.prices, m15: state.prices.d1, d1: state.prices.d1 };
                    tfState.indicators = { ...state.indicators, m15: state.indicators.d1 || state.indicators.m15 };
                }
                break;
        }

        // Add timeframe context
        tfState.marketContext = {
            symbol: tfState.marketContext?.symbol || 'BTCUSDT',
            timeframe,
            calendar: tfState.marketContext?.calendar,
            sessionManager: tfState.marketContext?.sessionManager
        };

        return tfState;
    }

    // ========================================================================
    // 🎯 TREND ANALYSIS
    // ========================================================================

    analyzeTrends(state: BotState): Map<string, TimeframeTrend> {
        const trends = new Map<string, TimeframeTrend>();

        for (const timeframe of this.getEnabledTimeframes()) {
            const trend = this.analyzeTimeframeTrend(state, timeframe);
            trends.set(timeframe, trend);
            this.trendCache.set(timeframe, trend);
        }

        this.logger.debug(`📈 Trend analysis complete for ${trends.size} timeframes`);
        return trends;
    }

    private analyzeTimeframeTrend(state: BotState, timeframe: string): TimeframeTrend {
        // Get price data for the timeframe
        let priceData = state.prices.m15; // Default
        let indicators = state.indicators.m15; // Default

        switch (timeframe) {
            case 'h1':
                priceData = state.prices.h1 || state.prices.m15;
                indicators = state.indicators.h1 || state.indicators.m15;
                break;
            case 'h4':
                priceData = state.prices.h4 || state.prices.m15;
                indicators = state.indicators.h4 || state.indicators.m15;
                break;
            case 'd1':
                priceData = state.prices.d1 || state.prices.m15;
                indicators = state.indicators.d1 || state.indicators.m15;
                break;
        }

        // Analyze trend using moving averages
        const shortEMA = indicators.ema_9;
        const mediumEMA = indicators.ema_21;
        const longEMA = indicators.ema_50;
        const currentPrice = priceData.close;

        // Determine direction
        let direction: 'UP' | 'DOWN' | 'SIDEWAYS' = 'SIDEWAYS';
        let strength = 0;
        let momentum = 0;

        if (shortEMA > mediumEMA && mediumEMA > longEMA && currentPrice > shortEMA) {
            direction = 'UP';
            strength = Math.min((currentPrice - longEMA) / longEMA * 10, 1);
            momentum = (shortEMA - longEMA) / longEMA;
        } else if (shortEMA < mediumEMA && mediumEMA < longEMA && currentPrice < shortEMA) {
            direction = 'DOWN';
            strength = Math.min((longEMA - currentPrice) / longEMA * 10, 1);
            momentum = (shortEMA - longEMA) / longEMA;
        } else {
            // Sideways/ranging
            const range = Math.abs(shortEMA - longEMA) / longEMA;
            strength = Math.max(0, 1 - range * 20); // Lower strength for ranging
            momentum = (shortEMA - longEMA) / longEMA;
        }

        // Calculate confidence based on RSI and trend alignment
        const rsi = indicators.rsi;
        let confidence = 0.5;

        if (direction === 'UP' && rsi > 30 && rsi < 80) {
            confidence = Math.min(0.9, 0.5 + strength * 0.4 + (80 - rsi) / 100);
        } else if (direction === 'DOWN' && rsi > 20 && rsi < 70) {
            confidence = Math.min(0.9, 0.5 + strength * 0.4 + rsi / 100);
        }

        return {
            timeframe,
            direction,
            strength: Math.max(0, Math.min(1, strength)),
            duration: 0, // Would need historical data to calculate
            confidence: Math.max(0, Math.min(1, confidence)),
            momentum: Math.max(-1, Math.min(1, momentum))
        };
    }

    // ========================================================================
    // 🎯 MARKET REGIME ANALYSIS
    // ========================================================================

    analyzeMarketRegime(state: BotState): MarketRegimeAnalysis {
        const trends = this.analyzeTrends(state);
        const volatility = state.regime.volatility;
        const overallTrend = state.regime.trend;

        // Determine regime based on trend alignment and volatility
        let currentRegime: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'BREAKOUT' = 'RANGING';
        let regimeStrength = 0;
        let timeframeConsensus = 0;

        // Calculate trend consensus
        const trendDirections = Array.from(trends.values()).map(t => t.direction);
        const upTrends = trendDirections.filter(d => d === 'UP').length;
        const downTrends = trendDirections.filter(d => d === 'DOWN').length;
        const totalTrends = trendDirections.length;

        timeframeConsensus = Math.max(upTrends, downTrends) / totalTrends;

        // Determine regime
        if (volatility > 0.7) {
            currentRegime = 'VOLATILE';
            regimeStrength = volatility;
        } else if (timeframeConsensus > 0.7) {
            currentRegime = 'TRENDING';
            regimeStrength = timeframeConsensus;
        } else if (Math.abs(overallTrend) > 0.6) {
            currentRegime = 'BREAKOUT';
            regimeStrength = Math.abs(overallTrend);
        } else {
            currentRegime = 'RANGING';
            regimeStrength = 1 - timeframeConsensus;
        }

        // Determine supported actions
        const supportedActions: ('BUY' | 'SELL' | 'HOLD')[] = [];

        switch (currentRegime) {
            case 'TRENDING':
                if (upTrends > downTrends) {
                    supportedActions.push('BUY');
                } else {
                    supportedActions.push('SELL');
                }
                break;
            case 'RANGING':
                supportedActions.push('BUY', 'SELL'); // Both buy low, sell high
                break;
            case 'VOLATILE':
                supportedActions.push('HOLD'); // Wait for clarity
                break;
            case 'BREAKOUT':
                if (overallTrend > 0) {
                    supportedActions.push('BUY');
                } else {
                    supportedActions.push('SELL');
                }
                break;
        }

        const analysis: MarketRegimeAnalysis = {
            currentRegime,
            regimeStrength,
            timeframeConsensus,
            expectedDuration: 0, // Would need ML model to predict
            supportedActions
        };

        this.regimeHistory.push(analysis);
        this.trimRegimeHistory();

        this.logger.info(`🔍 Market Regime: ${currentRegime} (strength: ${(regimeStrength * 100).toFixed(1)}%)`);
        this.emit('regimeAnalysis', analysis);

        return analysis;
    }

    // ========================================================================
    // 🎯 SIGNAL CALCULATION METHODS
    // ========================================================================

    private calculateConflictScore(signals: TimeframeSignal[]): number {
        if (signals.length <= 1) return 0;

        const buySignals = signals.filter(s => s.signal.type.includes('ENTER_LONG')).length;
        const sellSignals = signals.filter(s => s.signal.type.includes('ENTER_SHORT')).length;
        const holdSignals = signals.length - buySignals - sellSignals;

        const total = signals.length;
        const maxAgreement = Math.max(buySignals, sellSignals, holdSignals);

        return 1 - (maxAgreement / total);
    }

    private calculateTrendAlignment(signals: TimeframeSignal[]): number {
        if (signals.length === 0) return 0;

        const trendCounts = { bullish: 0, bearish: 0, neutral: 0 };
        signals.forEach(s => trendCounts[s.trend]++);

        const maxAlignment = Math.max(trendCounts.bullish, trendCounts.bearish, trendCounts.neutral);
        return maxAlignment / signals.length;
    }

    private calculateStrengthScore(signals: TimeframeSignal[]): number {
        if (signals.length === 0) return 0;

        const weightedStrength = signals.reduce((sum, signal) => {
            const config = this.timeframeConfigs.get(signal.timeframe);
            const weight = config ? config.weight : 0.25;
            return sum + (signal.strength * weight);
        }, 0);

        const totalWeight = signals.reduce((sum, signal) => {
            const config = this.timeframeConfigs.get(signal.timeframe);
            return sum + (config ? config.weight : 0.25);
        }, 0);

        return totalWeight > 0 ? weightedStrength / totalWeight : 0;
    }

    private generateOverallSignal(signals: TimeframeSignal[]): 'BUY' | 'SELL' | 'HOLD' {
        if (signals.length === 0) return 'HOLD';

        let buyScore = 0;
        let sellScore = 0;

        signals.forEach(signal => {
            const config = this.timeframeConfigs.get(signal.timeframe);
            const weight = config ? config.weight : 0.25;
            const strength = signal.strength * weight;

            if (signal.signal.type.includes('ENTER_LONG')) {
                buyScore += strength;
            } else if (signal.signal.type.includes('ENTER_SHORT')) {
                sellScore += strength;
            }
        });

        const threshold = 0.1; // Minimum score difference for action
        if (buyScore > sellScore + threshold) return 'BUY';
        if (sellScore > buyScore + threshold) return 'SELL';
        return 'HOLD';
    }

    private calculateOverallConfidence(
        signals: TimeframeSignal[],
        conflictScore: number,
        trendAlignment: number
    ): number {
        if (signals.length === 0) return 0;

        const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
        const alignmentBonus = trendAlignment * 0.2;
        const conflictPenalty = conflictScore * 0.3;

        return Math.max(0, Math.min(1, avgConfidence + alignmentBonus - conflictPenalty));
    }

    private generateRecommendations(
        overallSignal: 'BUY' | 'SELL' | 'HOLD',
        signals: TimeframeSignal[],
        conflictScore: number,
        trendAlignment: number
    ): { action: string; reasoning: string[]; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' } {
        const reasoning: string[] = [];
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';

        // Action recommendation
        let action = '';
        switch (overallSignal) {
            case 'BUY':
                action = 'Consider opening long position';
                reasoning.push(`${signals.filter(s => s.signal.type.includes('ENTER_LONG')).length} timeframes suggest buying`);
                break;
            case 'SELL':
                action = 'Consider opening short position';
                reasoning.push(`${signals.filter(s => s.signal.type.includes('ENTER_SHORT')).length} timeframes suggest selling`);
                break;
            case 'HOLD':
                action = 'Hold current position or wait for better setup';
                reasoning.push('Mixed signals across timeframes suggest waiting');
                break;
        }

        // Risk assessment
        if (conflictScore > 0.7) {
            riskLevel = 'HIGH';
            reasoning.push('High conflict between timeframes increases risk');
        } else if (trendAlignment > 0.8) {
            riskLevel = 'LOW';
            reasoning.push('Strong alignment across timeframes reduces risk');
        }

        // Trend analysis
        if (trendAlignment > 0.7) {
            reasoning.push(`Strong trend alignment (${(trendAlignment * 100).toFixed(0)}%)`);
        }

        if (conflictScore < 0.3) {
            reasoning.push('Low conflict between timeframe signals');
        }

        return { action, reasoning, riskLevel };
    }

    private determineTrend(signal: StrategySignal, state: BotState): 'bullish' | 'bearish' | 'neutral' {
        if (signal.type.includes('ENTER_LONG')) return 'bullish';
        if (signal.type.includes('ENTER_SHORT')) return 'bearish';
        return 'neutral';
    }

    // ========================================================================
    // 🔧 UTILITY METHODS
    // ========================================================================

    private updateSignalHistory(signals: TimeframeSignal[]): void {
        signals.forEach(signal => {
            const timeframeSignals = this.timeframeSignals.get(signal.timeframe) || [];
            timeframeSignals.push(signal);

            // Trim history
            if (timeframeSignals.length > this.maxHistorySize) {
                timeframeSignals.splice(0, timeframeSignals.length - this.maxHistorySize);
            }

            this.timeframeSignals.set(signal.timeframe, timeframeSignals);
        });
    }

    private trimRegimeHistory(): void {
        if (this.regimeHistory.length > 100) {
            this.regimeHistory = this.regimeHistory.slice(-100);
        }
    }

    getSignalHistory(timeframe?: string): TimeframeSignal[] {
        if (timeframe) {
            return this.timeframeSignals.get(timeframe) || [];
        }

        const allSignals: TimeframeSignal[] = [];
        for (const signals of this.timeframeSignals.values()) {
            allSignals.push(...signals);
        }

        return allSignals.sort((a, b) => b.timestamp - a.timestamp);
    }

    getStatus(): {
        enabledTimeframes: string[];
        totalSignals: number;
        recentRegime: MarketRegimeAnalysis | null;
        trendCache: { [timeframe: string]: TimeframeTrend };
    } {
        const trendCache: { [timeframe: string]: TimeframeTrend } = {};
        for (const [tf, trend] of this.trendCache) {
            trendCache[tf] = trend;
        }

        return {
            enabledTimeframes: this.getEnabledTimeframes(),
            totalSignals: Array.from(this.timeframeSignals.values()).reduce((sum, signals) => sum + signals.length, 0),
            recentRegime: this.regimeHistory.length > 0 ? this.regimeHistory[this.regimeHistory.length - 1] : null,
            trendCache
        };
    }

    async start(): Promise<void> {
        this.logger.info('🚀 Multi-timeframe analyzer started');
        this.emit('analyzer_started');
    }

    async stop(): Promise<void> {
        this.logger.info('🛑 Multi-timeframe analyzer stopped');
        this.emit('analyzer_stopped');
    }

    generateConsolidatedSignals(timeframeSignals: Map<string, StrategySignal[]>, state: BotState): MultiTimeframeSignal[] {
        const consolidated: MultiTimeframeSignal[] = [];

        // Group by symbol
        const signalsBySymbol = new Map<string, { timeframe: string; signal: StrategySignal }[]>();

        for (const [timeframe, signals] of timeframeSignals) {
            for (const signal of signals) {
                const symbol = signal.symbol || 'default';
                if (!signalsBySymbol.has(symbol)) {
                    signalsBySymbol.set(symbol, []);
                }
                signalsBySymbol.get(symbol)!.push({ timeframe, signal });
            }
        }

        // Consolidate each symbol's signals
        for (const [symbol, tfSignals] of signalsBySymbol) {
            if (tfSignals.length === 0) continue;

            // Calculate alignment score
            const buySignals = tfSignals.filter(s => s.signal.action === 'ENTER_LONG');
            const sellSignals = tfSignals.filter(s => s.signal.action === 'ENTER_SHORT');

            const alignmentScore = Math.abs(buySignals.length - sellSignals.length) / tfSignals.length;
            const conflictScore = 1 - alignmentScore;

            // Determine dominant signal
            let dominantSignal: StrategySignal;
            let dominantTimeframe: string;

            if (buySignals.length > sellSignals.length) {
                const weighted = buySignals.sort((a, b) => (b.signal.confidence || 0) - (a.signal.confidence || 0))[0];
                dominantSignal = weighted.signal;
                dominantTimeframe = weighted.timeframe;
            } else if (sellSignals.length > buySignals.length) {
                const weighted = sellSignals.sort((a, b) => (b.signal.confidence || 0) - (a.signal.confidence || 0))[0];
                dominantSignal = weighted.signal;
                dominantTimeframe = weighted.timeframe;
            } else {
                // Neutral or no clear direction
                continue;
            }

            // Create consolidated signal
            const multiSignal: MultiTimeframeSignal = {
                ...dominantSignal,
                sourceTimeframes: tfSignals.map(s => s.timeframe),
                alignmentScore,
                conflictScore,
                dominantTimeframe,
                symbol,
            };

            consolidated.push(multiSignal);
        }

        return consolidated;
    }

    getAnalyzerStatus(): {
        isRunning: boolean;
        enabledTimeframes: string[];
        totalSignals: number;
    } {
        return {
            isRunning: true,
            enabledTimeframes: this.getEnabledTimeframes(),
            totalSignals: Array.from(this.timeframeSignals.values()).reduce((sum, signals) => sum + signals.length, 0),
        };
    }
}

export default MultiTimeframeStrategyAnalyzer;

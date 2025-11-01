/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { Strategy, StrategySignal, BotState } from '../types/strategy';
import { Logger } from '../../infrastructure/logging/logger';
import { MarketRegimeDetector } from '../analysis/market_regime_detector';
import { PortfolioOptimizer } from '../portfolio/portfolio_optimizer';
import { RiskManager } from '../risk/risk_manager';
import { KellyCalculator } from '../risk/kelly_calculator';
import { MarketCalendar } from '../analysis/market_calendar';
import { SessionManager } from '../analysis/session_manager';
import { MetaModel } from './meta_model';

interface MetaStrategyConfig {
    minSignalConfidence: number;
    maxCorrelation: number;
    maxPortfolioAllocation: number;
    rebalanceInterval: number;
    useKellyCriterion: boolean;
    useMetaModel: boolean;
}

export class MetaStrategySystem {
    private readonly config: MetaStrategyConfig;
    private readonly logger: Logger;
    private readonly strategies: Strategy[];
    private readonly regimeDetector: MarketRegimeDetector;
    private readonly portfolioOptimizer: PortfolioOptimizer;
    private readonly riskManager: RiskManager;
    private readonly kellyCalculator: KellyCalculator;
    private readonly marketCalendar: MarketCalendar;
    private readonly sessionManager: SessionManager;
    private readonly metaModel: MetaModel;

    constructor(
        strategies: Strategy[],
        config: Partial<MetaStrategyConfig> = {},
        logger: Logger
    ) {
        this.logger = logger;
        this.strategies = strategies;
        this.config = {
            minSignalConfidence: 0.2,
            maxCorrelation: 0.7,
            maxPortfolioAllocation: 0.3,
            rebalanceInterval: 6 * 60 * 60 * 1000,
            useKellyCriterion: true,
            useMetaModel: true,
            ...config
        };

        this.regimeDetector = new MarketRegimeDetector({}, logger);
        this.portfolioOptimizer = new PortfolioOptimizer({}, logger);
        this.riskManager = new RiskManager(logger);
        this.kellyCalculator = new KellyCalculator({}, logger);
        this.marketCalendar = new MarketCalendar({}, logger);
        this.sessionManager = new SessionManager({}, logger);
        this.metaModel = new MetaModel({}, logger);
    }

    async run(state: BotState): Promise<StrategySignal[]> {
        // Sprawdź warunki makro i sesyjne
        if (!this.shouldTrade(state)) {
            return [];
        }

        // Aktualizuj reżim i wagi
        const regime = this.regimeDetector.detectRegime(state);
        const weights = await this.portfolioOptimizer.optimizeWeights(
            this.getStrategyPerformances(),
            regime,
            {
                volume24h: state.marketData.volume24h,
                volatility: state.marketData.volatility24h,
                timestamp: state.timestamp
            }
        );

        // Zbierz i normalizuj sygnały
        const normalizedSignals = await this.collectAndNormalizeSignals(state);
        
        // Agreguj sygnały
        const aggregatedSignals = this.aggregateSignals(normalizedSignals, weights, state);

        // Zastosuj meta-model jeśli włączony
        const finalSignals = this.config.useMetaModel
            ? await this.applyMetaModel(aggregatedSignals, state)
            : aggregatedSignals;

        // Zarządzaj pozycjami i ryzykiem
        return this.managePositionsAndRisk(finalSignals, state);
    }

    private shouldTrade(state: BotState): boolean {
        // Sprawdź kalendarz ekonomiczny
        const calendar = state.marketContext?.calendar;
        if (calendar) {
            const event = calendar.getNextEvent();
            if (event && event.timestamp - state.timestamp < 15 * 60 * 1000) {
                this.logger.info('Trading wstrzymany - zbliżające się wydarzenie', event);
                return false;
            }
        }

        // Sprawdź sesję handlową
        const sessionManager = state.marketContext?.sessionManager;
        if (sessionManager) {
            const session = sessionManager.getCurrentSession();
            if (!session?.isActive) {
                this.logger.info('Trading wstrzymany - nieaktywna sesja', session);
                return false;
            }
        }

        return true;
    }

    private async collectAndNormalizeSignals(state: BotState): Promise<StrategySignal[]> {
        const allSignals = await Promise.all(
            this.strategies.map(strategy => strategy.generateSignal
                ? strategy.generateSignal(state)
                : Promise.resolve([]))
        );

        return allSignals
            .flat()
            .filter(signal => signal.confidence >= this.config.minSignalConfidence)
            .map(signal => ({
                ...signal,
                confidence: this.normalizeConfidence(signal.confidence)
            }));
    }

    private normalizeConfidence(confidence: number): number {
        // Normalizuj do przedziału [-1, 1]
        return Math.max(-1, Math.min(1, confidence * 2 - 1));
    }

    private aggregateSignals(
        signals: StrategySignal[],
        weights: Map<string, number>,
        state: BotState
    ): StrategySignal[] {
        const aggregated = new Map<string, StrategySignal>();

        for (const signal of signals) {
            const key = `${signal.type}_${signal.metadata?.strategy}`;
            const weight = weights.get(signal.metadata?.strategy || '') || 0;

            if (!aggregated.has(key)) {
                aggregated.set(key, {
                    ...signal,
                    confidence: signal.confidence * weight
                });
            } else {
                const existing = aggregated.get(key)!;
                existing.confidence += signal.confidence * weight;
            }
        }

        return Array.from(aggregated.values())
            .filter(signal => Math.abs(signal.confidence) >= this.config.minSignalConfidence);
    }

    private async applyMetaModel(
        signals: StrategySignal[],
        state: BotState
    ): Promise<StrategySignal[]> {
        const features = this.prepareMetaModelFeatures(signals, state);
        const predictions = await this.metaModel.predict(features);

        return signals.map((signal, i) => ({
            ...signal,
            confidence: predictions[i]
        }));
    }

    private prepareMetaModelFeatures(
        signals: StrategySignal[],
        state: BotState
    ): number[][] {
        return signals.map(signal => [
            signal.confidence,
            signal.indicators.rsi || 0,
            signal.indicators.adx || 0,
            signal.indicators.atr || 0,
            state.marketData.volume24h,
            state.marketData.volatility24h
        ]);
    }

    private managePositionsAndRisk(
        signals: StrategySignal[],
        state: BotState
    ): StrategySignal[] {
        const finalSignals: StrategySignal[] = [];
        let totalRisk = 0;

        for (const signal of signals) {
            // Oblicz optymalną wielkość pozycji
            const size = this.calculatePositionSize(signal, state);
            if (size <= 0) continue;

            // Sprawdź korelacje i limity alokacji
            if (!this.checkCorrelationAndAllocation(signal, finalSignals, state)) {
                continue;
            }

            // Dostosuj stop-loss i take-profit
            const { stopLoss, takeProfit } = this.calculateExitLevels(signal, state);

            finalSignals.push({
                ...signal,
                size,
                stopLoss,
                takeProfit,
                orderType: 'OCO'  // One-Cancels-Other order
            });

            totalRisk += this.calculateSignalRisk(signal, state);
        }

        return finalSignals;
    }

    private calculatePositionSize(
        signal: StrategySignal,
        state: BotState
    ): number {
        if (this.config.useKellyCriterion) {
            return this.kellyCalculator.calculateSize(
                signal,
                state,
                state.indicators.m15.atr || 0
            );
        }

        // Fixed-fraction based on ATR
        const atr = state.indicators.m15.atr || 0;
        const riskPerTrade = state.equity * 0.01; // 1% risk
        return (riskPerTrade / atr) * state.prices.m15.close;
    }

    private checkCorrelationAndAllocation(
        signal: StrategySignal,
        existingSignals: StrategySignal[],
        state: BotState
    ): boolean {
        // Sprawdź korelację z istniejącymi pozycjami
        for (const existing of existingSignals) {
            const correlation = this.calculateCorrelation(signal, existing);
            if (correlation > this.config.maxCorrelation) {
                const totalAllocation = this.calculateTotalAllocation(existingSignals, state);
                if (totalAllocation > this.config.maxPortfolioAllocation) {
                    return false;
                }
            }
        }

        return true;
    }

    private calculateCorrelation(signal1: StrategySignal, signal2: StrategySignal): number {
        // Implementacja obliczania korelacji między sygnałami
        // na podstawie ich indykatorów i historycznych zachowań
        return 0.5; // Przykładowa wartość
    }

    private calculateTotalAllocation(
        signals: StrategySignal[],
        state: BotState
    ): number {
        return signals.reduce((total, signal) => 
            total + (signal.size || 0) * state.prices.m15.close / state.equity,
            0
        );
    }

    private calculateExitLevels(
        signal: StrategySignal,
        state: BotState
    ): { stopLoss: number; takeProfit: number } {
        const atr = state.indicators.m15.atr || 0;
        const price = signal.price;

        if (signal.type === 'ENTER_LONG') {
            return {
                stopLoss: price - (atr * 2),
                takeProfit: price + (atr * 3)
            };
        } else {
            return {
                stopLoss: price + (atr * 2),
                takeProfit: price - (atr * 3)
            };
        }
    }

    private calculateSignalRisk(signal: StrategySignal, state: BotState): number {
        const stopLossRisk = Math.abs(
            (signal.stopLoss! - signal.price) / signal.price
        );
        return (signal.size! * stopLossRisk) / state.equity;
    }

    private getStrategyPerformances() {
        // TODO: Implementacja zbierania historycznych wyników strategii
        return new Map();
    }
} 
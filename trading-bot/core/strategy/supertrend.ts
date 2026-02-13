/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { BaseStrategy } from './base_strategy';
import { BotState, StrategySignal, StrategyConfig } from '../types/strategy';
import { Logger } from '../../infrastructure/logging/logger';

export class SuperTrendStrategy extends BaseStrategy {
    private previousDirection: 'buy' | 'sell' | null = null;

    constructor(logger: Logger) {
        super(
            'SuperTrend',
            'Strategia oparta o wskaźnik SuperTrend z adaptacyjnymi parametrami',
            0.25,  // Domyślna waga
            {
                name: 'SuperTrend',
                timeframes: ['m15'],  // 🚀 FAZA 1.2: Używamy tylko m15 (h1/h4 usunięte)
                indicators: {
                    supertrend: {
                        period: 10,
                        multiplier: 3
                    },
                    atr: {
                        period: 14,
                        multiplier: 2
                    }
                },
                riskManagement: {
                    maxPositionSize: 0.1,
                    riskPerTrade: 0.01,
                    maxDrawdown: 0.1,
                    stopLossAtrMultiplier: 2,
                    takeProfitAtrMultiplier: 3
                }
            },
            logger
        );
    }

    async run(state: BotState): Promise<StrategySignal[]> {
        if (!this.validateState(state)) {
            return [];
        }

        const signals: StrategySignal[] = [];
        const m15 = state.indicators.m15;
        const supertrend = m15.supertrend;
        const currentDirection = supertrend.direction;

        // 🚀 FAZA 1.2: Dodatkowe warunki dla większej aktywności
        const strongTrend = m15.adx > 25;  // ADX > 25 = silny trend
        const volatilityOk = m15.atr > 0;   // Podstawowa walidacja ATR

        // Sprawdź czy mamy poprzedni kierunek
        if (this.previousDirection !== null) {
            // Sygnał long - zmiana kierunku na buy
            if (this.previousDirection === 'sell' && currentDirection === 'buy') {
                const confidence = this.calculateConfidence(
                    (state.marketData.lastPrice - supertrend.value) / supertrend.value,
                    m15.adx / 100,
                    state.regime.volatility,
                    state.regime.trend
                );

                signals.push(this.createSignal(
                    'ENTER_LONG',
                    state.marketData.lastPrice,
                    confidence,
                    state,
                    {
                        supertrendValue: supertrend.value,
                        supertrendDirection: supertrend.direction === 'buy' ? 1 : -1,
                        adx: parseFloat(m15.adx as any) || 0,
                        atr: parseFloat(m15.atr as any) || 0,
                        triggerType: 1 // crossover
                    }
                ));
            }
            // Sygnał short - zmiana kierunku na sell
            else if (this.previousDirection === 'buy' && currentDirection === 'sell') {
                const confidence = this.calculateConfidence(
                    (supertrend.value - state.marketData.lastPrice) / supertrend.value,
                    m15.adx / 100,
                    state.regime.volatility,
                    state.regime.trend
                );

                signals.push(this.createSignal(
                    'ENTER_SHORT',
                    state.marketData.lastPrice,
                    confidence,
                    state,
                    {
                        supertrendValue: supertrend.value,
                        supertrendDirection: supertrend.direction === 'buy' ? 1 : -1,
                        adx: parseFloat(m15.adx as any) || 0,
                        atr: parseFloat(m15.atr as any) || 0,
                        triggerType: 1 // crossover
                    }
                ));
            }
            // 🚀 FAZA 1.2: NOWE - Trend continuation signals (strong trend bez crossover)
            else if (currentDirection === 'buy' && strongTrend && volatilityOk && state.positions.length === 0) {
                const confidence = this.calculateConfidence(
                    (state.marketData.lastPrice - supertrend.value) / supertrend.value,
                    m15.adx / 100,
                    state.regime.volatility,
                    state.regime.trend
                ) * 0.7;  // Reduced confidence for continuation

                signals.push(this.createSignal(
                    'ENTER_LONG',
                    state.marketData.lastPrice,
                    confidence,
                    state,
                    {
                        supertrendValue: supertrend.value,
                        supertrendDirection: 1,
                        adx: parseFloat(m15.adx as any) || 0,
                        atr: parseFloat(m15.atr as any) || 0,
                        trigger: 'continuation'  // Not crossover, just strong trend
                    }
                ));
            }
            else if (currentDirection === 'sell' && strongTrend && volatilityOk && state.positions.length === 0) {
                const confidence = this.calculateConfidence(
                    (supertrend.value - state.marketData.lastPrice) / supertrend.value,
                    m15.adx / 100,
                    state.regime.volatility,
                    state.regime.trend
                ) * 0.7;

                signals.push(this.createSignal(
                    'ENTER_SHORT',
                    state.marketData.lastPrice,
                    confidence,
                    state,
                    {
                        supertrendValue: supertrend.value,
                        supertrendDirection: -1,
                        adx: parseFloat(m15.adx as any) || 0,
                        atr: parseFloat(m15.atr as any) || 0,
                        trigger: 'continuation'
                    }
                ));
            }
        }

        // Aktualizuj poprzedni kierunek
        this.previousDirection = currentDirection;

        // Sprawdź czy mamy otwarte pozycje do zamknięcia
        for (const position of state.positions) {
            if (position.strategyId !== this.name) continue;

            const atr = m15.atr;
            const stopLoss = position.direction === 'long' ?
                position.entryPrice - (atr * this.config.riskManagement.stopLossAtrMultiplier) :
                position.entryPrice + (atr * this.config.riskManagement.stopLossAtrMultiplier);

            const takeProfit = position.direction === 'long' ?
                position.entryPrice + (atr * this.config.riskManagement.takeProfitAtrMultiplier) :
                position.entryPrice - (atr * this.config.riskManagement.takeProfitAtrMultiplier);

            if (this.shouldExitPosition(position, state, stopLoss, takeProfit)) {
                signals.push(this.createSignal(
                    position.direction === 'long' ? 'EXIT_LONG' : 'EXIT_SHORT',
                    state.marketData.lastPrice,
                    1,
                state,
                    {
                        supertrendValue: supertrend.value,
                        supertrendDirection: supertrend.direction === 'buy' ? 1 : -1,
                        adx: parseFloat(m15.adx as any) || 0,
                        atr: m15.atr
                    }
                ));
            }
        }

        return signals;
    }
}

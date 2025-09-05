import { BaseStrategy } from './base_strategy';
import { BotState, StrategySignal, StrategyConfig } from '../types/strategy';
import { Logger } from '../../infrastructure/logging/logger';

export class EnhancedRSITurboStrategy extends BaseStrategy {
    private previousRsi: number | null = null;

    constructor(logger: Logger) {
        super(
            'RSITurbo',
            'Ulepszona strategia RSI z adaptacyjnymi parametrami',
            0.25,  // Domyślna waga
            {
                name: 'RSITurbo',
                timeframes: ['m15', 'h1', 'h4'],
                indicators: {
                    rsi: {
                        period: 14,
                        overbought: 66,        // ⭐ ULTRA-OPTIMIZED: 70 → 66
                        oversold: 29           // ⭐ ULTRA-OPTIMIZED: 30 → 29
                    },
                    atr: {
                        period: 14,
                        multiplier: 2.4        // ⭐ ULTRA-OPTIMIZED: 2.0 → 2.4
                    }
                },
                riskManagement: {
                    maxPositionSize: 0.1,
                    riskPerTrade: 0.01,
                    maxDrawdown: 0.1,
                    stopLossAtrMultiplier: 1.6,  // ⭐ ULTRA-OPTIMIZED: 2.0 → 1.6
                    takeProfitAtrMultiplier: 3.5 // ⭐ ULTRA-OPTIMIZED: 3.0 → 3.5
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
        const currentRsi = m15.rsi;

        // Sprawdź czy mamy poprzednią wartość RSI
        if (this.previousRsi !== null) {
            // Sygnał long - RSI wychodzi ze strefy wyprzedania
            if (this.previousRsi < 30 && currentRsi > 30) {
                const confidence = this.calculateConfidence(
                    (currentRsi - 30) / 20,
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
                        rsi: currentRsi,
                        adx: m15.adx,
                        atr: m15.atr
                    }
                ));
            }
            // Sygnał short - RSI wchodzi w strefę wykupienia
            else if (this.previousRsi < 70 && currentRsi > 70) {
                const confidence = this.calculateConfidence(
                    (70 - currentRsi) / 20,
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
                        rsi: currentRsi,
                        adx: m15.adx,
                        atr: m15.atr
                    }
                ));
            }
        }

        // Aktualizuj poprzednią wartość RSI
        this.previousRsi = currentRsi;

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

            // Sprawdź warunki wyjścia (RSI ma priorytet nad SL/TP)
            if (position.direction === 'long' && currentRsi > 70) {
                signals.push(this.createSignal(
                    'EXIT_LONG',
                    state.marketData.lastPrice,
                    1,
                    state,
                    {
                        rsi: currentRsi,
                        adx: m15.adx,
                        atr: m15.atr
                    }
                ));
            }
            else if (position.direction === 'short' && currentRsi < 30) {
                signals.push(this.createSignal(
                    'EXIT_SHORT',
                    state.marketData.lastPrice,
                    1,
                    state,
                    {
                        rsi: currentRsi,
                        adx: m15.adx,
                        atr: m15.atr
                    }
                ));
            }
            else if (this.shouldExitPosition(position, state, stopLoss, takeProfit)) {
                signals.push(this.createSignal(
                    position.direction === 'long' ? 'EXIT_LONG' : 'EXIT_SHORT',
                    state.marketData.lastPrice,
                    1,
                    state,
                    {
                        rsi: currentRsi,
                        adx: m15.adx,
                        atr: m15.atr
                    }
                ));
            }
        }

        return signals;
    }
} 
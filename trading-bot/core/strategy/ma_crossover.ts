import { BaseStrategy } from './base_strategy';
import { BotState, StrategySignal, StrategyConfig } from '../types/strategy';
import { Logger } from '../../infrastructure/logging/logger';

export class MACrossoverStrategy extends BaseStrategy {
    private previousEma9: number | null = null;
    private previousEma21: number | null = null;

    constructor(logger: Logger) {
        super(
            'MACrossover',
            'Strategia oparta o przecięcia średnich kroczących z adaptacyjnymi parametrami',
            0.25,  // Domyślna waga
            {
                name: 'MACrossover',
                timeframes: ['m15', 'h1', 'h4'],
                indicators: {
                    ema: {
                        periods: [9, 21, 50, 200]
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
        const currentEma9 = m15.ema_9;
        const currentEma21 = m15.ema_21;

        // Sprawdź czy mamy poprzednie wartości
        if (this.previousEma9 !== null && this.previousEma21 !== null) {
            // Przecięcie EMA9 powyżej EMA21 (sygnał long)
            if (this.previousEma9 <= this.previousEma21 && currentEma9 > currentEma21) {
                const confidence = this.calculateConfidence(
                    (currentEma9 - currentEma21) / currentEma21,
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
                        ema9: currentEma9,
                        ema21: currentEma21,
                        adx: m15.adx,
                        atr: m15.atr
                    }
                ));
            }
            // Przecięcie EMA9 poniżej EMA21 (sygnał short)
            else if (this.previousEma9 >= this.previousEma21 && currentEma9 < currentEma21) {
                const confidence = this.calculateConfidence(
                    (currentEma21 - currentEma9) / currentEma21,
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
                        ema9: currentEma9,
                        ema21: currentEma21,
                        adx: m15.adx,
                        atr: m15.atr
                    }
                ));
            }
        }

        // Aktualizuj poprzednie wartości
        this.previousEma9 = currentEma9;
        this.previousEma21 = currentEma21;

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
                        ema9: currentEma9,
                        ema21: currentEma21,
                        adx: m15.adx,
                        atr: m15.atr
                    }
                ));
            }
        }

        return signals;
    }
}

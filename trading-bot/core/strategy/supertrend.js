"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperTrendStrategy = void 0;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
const base_strategy_1 = require("./base_strategy");
class SuperTrendStrategy extends base_strategy_1.BaseStrategy {
    constructor(logger) {
        super('SuperTrend', 'Strategia oparta o wskaźnik SuperTrend z adaptacyjnymi parametrami', 0.25, // Domyślna waga
        {
            name: 'SuperTrend',
            timeframes: ['m15', 'h1', 'h4'],
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
        }, logger);
        this.previousDirection = null;
    }
    async run(state) {
        if (!this.validateState(state)) {
            return [];
        }
        const signals = [];
        const m15 = state.indicators.m15;
        const supertrend = m15.supertrend;
        const currentDirection = supertrend.direction;
        // Sprawdź czy mamy poprzedni kierunek
        if (this.previousDirection !== null) {
            // Sygnał long - zmiana kierunku na buy
            if (this.previousDirection === 'sell' && currentDirection === 'buy') {
                const confidence = this.calculateConfidence((state.marketData.lastPrice - supertrend.value) / supertrend.value, m15.adx / 100, state.regime.volatility, state.regime.trend);
                signals.push(this.createSignal('ENTER_LONG', state.marketData.lastPrice, confidence, state, {
                    supertrendValue: supertrend.value,
                    supertrendDirection: supertrend.direction === 'buy' ? 1 : -1,
                    adx: m15.adx,
                    atr: m15.atr
                }));
            }
            // Sygnał short - zmiana kierunku na sell
            else if (this.previousDirection === 'buy' && currentDirection === 'sell') {
                const confidence = this.calculateConfidence((supertrend.value - state.marketData.lastPrice) / supertrend.value, m15.adx / 100, state.regime.volatility, state.regime.trend);
                signals.push(this.createSignal('ENTER_SHORT', state.marketData.lastPrice, confidence, state, {
                    supertrendValue: supertrend.value,
                    supertrendDirection: supertrend.direction === 'buy' ? 1 : -1,
                    adx: m15.adx,
                    atr: m15.atr
                }));
            }
        }
        // Aktualizuj poprzedni kierunek
        this.previousDirection = currentDirection;
        // Sprawdź czy mamy otwarte pozycje do zamknięcia
        for (const position of state.positions) {
            if (position.strategyId !== this.name)
                continue;
            const atr = m15.atr;
            const stopLoss = position.direction === 'long' ?
                position.entryPrice - (atr * this.config.riskManagement.stopLossAtrMultiplier) :
                position.entryPrice + (atr * this.config.riskManagement.stopLossAtrMultiplier);
            const takeProfit = position.direction === 'long' ?
                position.entryPrice + (atr * this.config.riskManagement.takeProfitAtrMultiplier) :
                position.entryPrice - (atr * this.config.riskManagement.takeProfitAtrMultiplier);
            if (this.shouldExitPosition(position, state, stopLoss, takeProfit)) {
                signals.push(this.createSignal(position.direction === 'long' ? 'EXIT_LONG' : 'EXIT_SHORT', state.marketData.lastPrice, 1, state, {
                    supertrendValue: supertrend.value,
                    supertrendDirection: supertrend.direction === 'buy' ? 1 : -1,
                    adx: m15.adx,
                    atr: m15.atr
                }));
            }
        }
        return signals;
    }
}
exports.SuperTrendStrategy = SuperTrendStrategy;

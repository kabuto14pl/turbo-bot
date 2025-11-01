"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MomentumProStrategy = void 0;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
const base_strategy_1 = require("./base_strategy");
class MomentumProStrategy extends base_strategy_1.BaseStrategy {
    constructor(logger) {
        super('MomentumPro', 'Strategia oparta o momentum z adaptacyjnymi parametrami', 0.25, // Domyślna waga
        {
            name: 'MomentumPro',
            timeframes: ['m15', 'h1', 'h4'],
            indicators: {
                rsi: {
                    period: 14,
                    overbought: 70,
                    oversold: 30
                },
                roc: {
                    period: 10
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
        this.previousRoc = null;
    }
    async run(state) {
        if (!this.validateState(state)) {
            return [];
        }
        const signals = [];
        const m15 = state.indicators.m15;
        const currentRoc = m15.roc || 0;
        // Sprawdź czy mamy poprzednią wartość ROC
        if (this.previousRoc !== null) {
            // Sygnał long - rosnący momentum
            if (this.previousRoc < 0 && currentRoc > 0) {
                const confidence = this.calculateConfidence(currentRoc, m15.rsi / 100, state.regime.volatility, state.regime.trend);
                signals.push(this.createSignal('ENTER_LONG', state.marketData.lastPrice, confidence, state, {
                    roc: currentRoc,
                    rsi: m15.rsi,
                    atr: m15.atr
                }));
            }
            // Sygnał short - malejący momentum
            else if (this.previousRoc > 0 && currentRoc < 0) {
                const confidence = this.calculateConfidence(-currentRoc, (100 - m15.rsi) / 100, state.regime.volatility, state.regime.trend);
                signals.push(this.createSignal('ENTER_SHORT', state.marketData.lastPrice, confidence, state, {
                    roc: currentRoc,
                    rsi: m15.rsi,
                    atr: m15.atr
                }));
            }
        }
        // Aktualizuj poprzednią wartość ROC
        this.previousRoc = currentRoc;
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
                    roc: currentRoc,
                    rsi: m15.rsi,
                    atr: m15.atr
                }));
            }
        }
        return signals;
    }
}
exports.MomentumProStrategy = MomentumProStrategy;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MomentumConfirmationStrategy = void 0;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
const base_strategy_1 = require("./base_strategy");
class MomentumConfirmationStrategy extends base_strategy_1.BaseStrategy {
    constructor(logger) {
        super('MomentumConfirmation', 'Strategia oparta o potwierdzenie momentum przez wiele wskaźników', 0.25, // Domyślna waga
        {
            name: 'MomentumConfirmation',
            timeframes: ['m15', 'h1', 'h4'],
            indicators: {
                rsi: {
                    period: 14,
                    overbought: 70,
                    oversold: 30
                },
                macd: {
                    fastPeriod: 12,
                    slowPeriod: 26,
                    signalPeriod: 9
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
        this.previousMacdHistogram = null;
    }
    async run(state) {
        if (!this.validateState(state)) {
            return [];
        }
        const signals = [];
        const m15 = state.indicators.m15;
        const macd = m15.macd;
        const rsi = m15.rsi;
        // Sprawdź czy mamy poprzednią wartość histogramu MACD
        if (this.previousMacdHistogram !== null && macd) {
            // Sygnał long - rosnący momentum
            if (this.isBullishSignal(rsi, macd)) {
                const confidence = this.calculateConfidence(macd.histogram, rsi / 100, state.regime.volatility, state.regime.trend);
                signals.push(this.createSignal('ENTER_LONG', state.marketData.lastPrice, confidence, state, {
                    rsi,
                    macd: macd.macd,
                    signal: macd.signal,
                    histogram: macd.histogram,
                    atr: m15.atr
                }));
            }
            // Sygnał short - malejący momentum
            else if (this.isBearishSignal(rsi, macd)) {
                const confidence = this.calculateConfidence(-macd.histogram, (100 - rsi) / 100, state.regime.volatility, state.regime.trend);
                signals.push(this.createSignal('ENTER_SHORT', state.marketData.lastPrice, confidence, state, {
                    rsi,
                    macd: macd.macd,
                    signal: macd.signal,
                    histogram: macd.histogram,
                    atr: m15.atr
                }));
            }
        }
        // Aktualizuj poprzednią wartość histogramu MACD
        this.previousMacdHistogram = macd?.histogram || null;
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
                    rsi,
                    macd: macd?.macd || 0,
                    signal: macd?.signal || 0,
                    histogram: macd?.histogram || 0,
                    atr: m15.atr
                }));
            }
        }
        return signals;
    }
    isBullishSignal(rsi, macd) {
        return (rsi > 50 && // RSI powyżej średniego poziomu
            this.previousMacdHistogram !== null && // Mamy poprzednią wartość histogramu
            this.previousMacdHistogram < 0 && // Poprzedni histogram był negatywny
            macd.histogram > 0 && // Obecny histogram jest pozytywny
            macd.macd > macd.signal // MACD powyżej linii sygnałowej
        );
    }
    isBearishSignal(rsi, macd) {
        return (rsi < 50 && // RSI poniżej średniego poziomu
            this.previousMacdHistogram !== null && // Mamy poprzednią wartość histogramu
            this.previousMacdHistogram > 0 && // Poprzedni histogram był pozytywny
            macd.histogram < 0 && // Obecny histogram jest negatywny
            macd.macd < macd.signal // MACD poniżej linii sygnałowej
        );
    }
}
exports.MomentumConfirmationStrategy = MomentumConfirmationStrategy;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MACrossoverStrategy = void 0;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
const base_strategy_1 = require("./base_strategy");
class MACrossoverStrategy extends base_strategy_1.BaseStrategy {
    constructor(logger) {
        super('MACrossover', 'Strategia oparta o przecięcia średnich kroczących z adaptacyjnymi parametrami', 0.25, // Domyślna waga
        {
            name: 'MACrossover',
            timeframes: ['m15'], // 🚀 FAZA 1.2: Używamy tylko m15 (h1/h4 usunięte)
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
        }, logger);
        this.previousEma9 = null;
        this.previousEma21 = null;
    }
    async run(state) {
        if (!this.validateState(state)) {
            return [];
        }
        const signals = [];
        const m15 = state.indicators.m15;
        const currentEma9 = m15.ema_9;
        const currentEma21 = m15.ema_21;
        // 🚀 FAZA 1.2: Dodatkowe warunki dla większej aktywności
        // 🔴 PROFITABILITY FIX 6: Lowered ADX threshold for continuation signals
        const strongTrend = m15.adx > 15; // Was 25, lowered to match fixed ADX formula
        const gapPercentage = Math.abs((currentEma9 - currentEma21) / currentEma21);
        // 🔴 PROFITABILITY FIX 6: Lowered gap requirement for more signals
        const significantGap = gapPercentage > 0.001; // 0.1% gap (was 0.2%)
        // Sprawdź czy mamy poprzednie wartości
        if (this.previousEma9 !== null && this.previousEma21 !== null) {
            // Przecięcie EMA9 powyżej EMA21 (sygnał long)
            if (this.previousEma9 <= this.previousEma21 && currentEma9 > currentEma21) {
                const confidence = this.calculateConfidence((currentEma9 - currentEma21) / currentEma21, m15.adx / 100, state.regime.volatility, state.regime.trend);
                signals.push(this.createSignal('ENTER_LONG', state.marketData.lastPrice, confidence, state, {
                    ema9: currentEma9,
                    ema21: currentEma21,
                    adx: Number(m15.adx) || 0,
                    atr: Number(m15.atr) || 0,
                    triggerType: 1 // crossover
                }));
            }
            // Przecięcie EMA9 poniżej EMA21 (sygnał short)
            else if (this.previousEma9 >= this.previousEma21 && currentEma9 < currentEma21) {
                const confidence = this.calculateConfidence((currentEma21 - currentEma9) / currentEma21, m15.adx / 100, state.regime.volatility, state.regime.trend);
                signals.push(this.createSignal('ENTER_SHORT', state.marketData.lastPrice, confidence, state, {
                    ema9: currentEma9,
                    ema21: currentEma21,
                    adx: Number(m15.adx) || 0,
                    atr: Number(m15.atr) || 0,
                    triggerType: 2 // crossunder
                }));
            }
            // 🚀 FAZA 1.2: NOWE - Trend continuation signals
            else if (currentEma9 > currentEma21 && strongTrend && significantGap && state.positions.length === 0) {
                const confidence = this.calculateConfidence(gapPercentage, m15.adx / 100, state.regime.volatility, state.regime.trend) * 0.65; // Lower confidence for non-crossover
                signals.push(this.createSignal('ENTER_LONG', state.marketData.lastPrice, confidence, state, {
                    ema9: currentEma9,
                    ema21: currentEma21,
                    adx: Number(m15.adx) || 0,
                    atr: Number(m15.atr) || 0,
                    triggerType: 3 // continuation
                }));
            }
            else if (currentEma9 < currentEma21 && strongTrend && significantGap && state.positions.length === 0) {
                const confidence = this.calculateConfidence(gapPercentage, m15.adx / 100, state.regime.volatility, state.regime.trend) * 0.65;
                signals.push(this.createSignal('ENTER_SHORT', state.marketData.lastPrice, confidence, state, {
                    ema9: currentEma9,
                    ema21: currentEma21,
                    adx: Number(m15.adx) || 0,
                    atr: Number(m15.atr) || 0,
                    triggerType: 4 // short continuation
                }));
            }
        }
        // Aktualizuj poprzednie wartości
        this.previousEma9 = currentEma9;
        this.previousEma21 = currentEma21;
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
                    ema9: currentEma9,
                    ema21: currentEma21,
                    adx: m15.adx,
                    atr: m15.atr
                }));
            }
        }
        // PATCH #22: MTF Confluence Filter
        if (signals.length > 0 && state.mtfBias) {
            var bias = state.mtfBias;
            var filtered = [];
            for (var si = 0; si < signals.length; si++) {
                var sig = signals[si];
                if (sig.type === 'ENTER_LONG') {
                    if (bias.tradePermission === 'SHORT_ONLY') continue;
                    else if (bias.tradePermission === 'PREFER_SHORT' || bias.tradePermission === 'CAUTION') sig.confidence *= bias.confidenceMultiplier;
                    else if (bias.tradePermission === 'LONG_ONLY' || bias.tradePermission === 'PREFER_LONG') sig.confidence = Math.min(0.95, sig.confidence * bias.confidenceMultiplier);
                } else if (sig.type === 'ENTER_SHORT') {
                    if (bias.tradePermission === 'LONG_ONLY') continue;
                    else if (bias.tradePermission === 'PREFER_LONG' || bias.tradePermission === 'CAUTION') sig.confidence *= bias.confidenceMultiplier;
                    else if (bias.tradePermission === 'SHORT_ONLY' || bias.tradePermission === 'PREFER_SHORT') sig.confidence = Math.min(0.95, sig.confidence * bias.confidenceMultiplier);
                }
                if (sig.type.startsWith('EXIT') || sig.confidence > 0.2) filtered.push(sig);
            }
            return filtered;
        }
        return signals;
    }
}
exports.MACrossoverStrategy = MACrossoverStrategy;

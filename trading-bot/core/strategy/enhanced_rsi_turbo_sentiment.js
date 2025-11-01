"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedRSITurboStrategySentiment = void 0;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
const base_strategy_1 = require("./base_strategy");
class EnhancedRSITurboStrategySentiment extends base_strategy_1.BaseStrategy {
    constructor(logger) {
        super('RSITurboSentiment', 'Sentiment-Enhanced RSI Turbo Strategy', 0.25, {
            name: 'RSITurboSentiment',
            timeframes: ['m15', 'h1', 'h4'],
            indicators: {
                rsi: {
                    period: 14,
                    overbought: 66,
                    oversold: 29
                },
                atr: {
                    period: 14,
                    multiplier: 2.4
                }
            },
            riskManagement: {
                maxPositionSize: 0.1,
                riskPerTrade: 0.02,
                maxDrawdown: 0.15,
                stopLossAtrMultiplier: 2.4,
                takeProfitAtrMultiplier: 4.8
            }
        }, logger);
        this.previousRsi = null;
    }
    async run(state) {
        // Use the correct BotState structure
        const currentPrice = state.prices.m15;
        const indicators = state.indicators.m15;
        if (!indicators?.rsi || !indicators?.atr) {
            return [];
        }
        const rsi = indicators.rsi;
        const atr = indicators.atr;
        const price = currentPrice.close;
        // RSI-based signal logic
        const signals = [];
        const oversold = 29; // Fixed values for simplicity
        const overbought = 66;
        const atrMultiplier = 2.4;
        if (rsi < oversold) {
            // Oversold - potential buy signal
            signals.push({
                type: 'ENTER_LONG',
                price: price,
                confidence: Math.min(0.9, (oversold - rsi) / 10),
                stopLoss: price - (atr * atrMultiplier),
                takeProfit: price + (atr * atrMultiplier * 2),
                indicators: {
                    rsi: rsi,
                    atr: atr,
                    signal_strength: (oversold - rsi) / 10
                }
            });
        }
        else if (rsi > overbought) {
            // Overbought - potential sell signal
            signals.push({
                type: 'ENTER_SHORT',
                price: price,
                confidence: Math.min(0.9, (rsi - overbought) / 10),
                stopLoss: price + (atr * atrMultiplier),
                takeProfit: price - (atr * atrMultiplier * 2),
                indicators: {
                    rsi: rsi,
                    atr: atr,
                    signal_strength: (rsi - overbought) / 10
                }
            });
        }
        this.previousRsi = rsi;
        return signals;
    }
}
exports.EnhancedRSITurboStrategySentiment = EnhancedRSITurboStrategySentiment;

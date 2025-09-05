"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedAdaptiveStrategy = void 0;
const market_regime_detector_1 = require("../analysis/market_regime_detector");
const logger_1 = require("../../infrastructure/logging/logger");
class AdvancedAdaptiveStrategy {
    constructor(options, logger) {
        this.logger = logger || new logger_1.Logger();
        this.marketRegimeDetector = new market_regime_detector_1.MarketRegimeDetector({}, this.logger);
        this.options = {
            rsiPeriod: options.rsiPeriod || 14,
            rsiOversold: options.rsiOversold || 30,
            rsiOverbought: options.rsiOverbought || 70,
            emaShortPeriod: options.emaShortPeriod || 50,
            emaLongPeriod: options.emaLongPeriod || 200,
            adxPeriod: options.adxPeriod || 14,
            atrPeriod: options.atrPeriod || 14,
            atrMultiplier: options.atrMultiplier || 2
        };
    }
    run(state) {
        const signals = [];
        // Pobierz wskaźniki z 15-minutowego interwału
        const indicators = state.indicators.m15;
        if (!indicators) {
            this.logger.warn('[AdvancedAdaptive] Brak wskaźników m15');
            return signals;
        }
        const { rsi, ema_50, ema_200, adx, atr } = indicators;
        const currentPrice = state.prices.m15.close;
        if (!currentPrice || !rsi || !ema_50 || !ema_200 || !adx || !atr) {
            this.logger.warn('[AdvancedAdaptive] Brak wymaganych wskaźników');
            return signals;
        }
        // Generuj sygnały na podstawie wskaźników
        if (rsi < this.options.rsiOversold && currentPrice > ema_200 && adx > 25) {
            signals.push({
                type: 'ENTER_LONG',
                orderRequest: {
                    symbol: state.marketContext?.symbol || 'BTCUSDT',
                    side: 'buy',
                    type: 'market',
                    size: 1
                },
                reason: 'RSI oversold with strong trend'
            });
        }
        else if (rsi > this.options.rsiOverbought && currentPrice < ema_200 && adx > 25) {
            signals.push({
                type: 'ENTER_SHORT',
                orderRequest: {
                    symbol: state.marketContext?.symbol || 'BTCUSDT',
                    side: 'sell',
                    type: 'market',
                    size: 1
                },
                reason: 'RSI overbought with strong downtrend'
            });
        }
        return signals;
    }
}
exports.AdvancedAdaptiveStrategy = AdvancedAdaptiveStrategy;

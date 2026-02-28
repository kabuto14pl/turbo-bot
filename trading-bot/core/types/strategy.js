"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_STRATEGY_CONFIG = void 0;
// Standardowe wartości dla wszystkich strategii
exports.DEFAULT_STRATEGY_CONFIG = {
    indicators: {
        rsi: {
            period: 14,
            overbought: 70,
            oversold: 30
        },
        ema: {
            periods: [9, 21, 50, 200]
        },
        atr: {
            period: 14,
            multiplier: 2
        },
        adx: {
            period: 14,
            threshold: 25
        },
        macd: {
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9
        },
        supertrend: {
            period: 10,
            multiplier: 3
        },
        roc: {
            period: 10
        }
    },
    riskManagement: {
        maxPositionSize: 0.1, // 10% kapitału
        riskPerTrade: 0.02, // 2% ryzyko
        maxDrawdown: 0.15, // 15% drawdown
        stopLossAtrMultiplier: 2,
        takeProfitAtrMultiplier: 3
    }
};

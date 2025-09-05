"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HIGH_VOLATILITY_SCENARIO = exports.RANGING_SCENARIO = exports.STRONG_UPTREND_SCENARIO = void 0;
// Scenariusz 1: Silny trend wzrostowy z wysoką zmiennością
exports.STRONG_UPTREND_SCENARIO = {
    timestamp: Date.now(),
    prices: {
        m15: {
            time: Date.now(),
            open: 42000,
            high: 42200,
            low: 41800,
            close: 42100,
            volume: 1000
        },
        h1: {
            time: Date.now(),
            open: 41500,
            high: 42200,
            low: 41400,
            close: 42100,
            volume: 4000
        },
        h4: {
            time: Date.now(),
            open: 40800,
            high: 42200,
            low: 40700,
            close: 42100,
            volume: 12000
        },
        d1: {
            time: Date.now(),
            open: 40000,
            high: 42200,
            low: 39800,
            close: 42100,
            volume: 50000
        }
    },
    indicators: {
        m15: {
            rsi: 72, // Wykupienie
            adx: 35, // Silny trend
            atr: 150, // Wysoka zmienność
            ema_9: 41900,
            ema_21: 41700,
            ema_50: 41200,
            ema_200: 40000,
            supertrend: {
                value: 41800,
                direction: 'buy'
            },
            macd: {
                macd: 100,
                signal: 80,
                histogram: 20
            }
        },
        h1: {
            rsi: 68,
            adx: 32,
            atr: 300,
            ema_50: 41000,
            ema_200: 39500
        },
        h4: {
            rsi: 65,
            adx: 30,
            atr: 500
        },
        d1: {
            rsi: 60,
            adx: 28,
            atr: 800
        }
    },
    equity: 100000,
    marketData: {
        volume24h: 5000000,
        volatility: 0.02
    },
    regime: 'STRONG_UPTREND',
    marketContext: {
        symbol: 'BTCUSDT',
        timeframe: 'm15'
    }
};
// Scenariusz 2: Konsolidacja z niską zmiennością
exports.RANGING_SCENARIO = {
    timestamp: Date.now(),
    prices: {
        m15: {
            time: Date.now(),
            open: 41000,
            high: 41100,
            low: 40900,
            close: 41050,
            volume: 500
        },
        h1: {
            time: Date.now(),
            open: 41020,
            high: 41200,
            low: 40800,
            close: 41050,
            volume: 2000
        },
        h4: {
            time: Date.now(),
            open: 40900,
            high: 41300,
            low: 40700,
            close: 41050,
            volume: 6000
        },
        d1: {
            time: Date.now(),
            open: 41100,
            high: 41500,
            low: 40500,
            close: 41050,
            volume: 25000
        }
    },
    indicators: {
        m15: {
            rsi: 45, // Neutralny
            adx: 15, // Słaby trend
            atr: 50, // Niska zmienność
            ema_9: 41030,
            ema_21: 41040,
            ema_50: 41050,
            ema_200: 41000,
            supertrend: {
                value: 41000,
                direction: 'sell'
            },
            macd: {
                macd: 10,
                signal: 12,
                histogram: -2
            }
        },
        h1: {
            rsi: 48,
            adx: 14,
            atr: 100,
            ema_50: 41020,
            ema_200: 41000
        },
        h4: {
            rsi: 50,
            adx: 12,
            atr: 200
        },
        d1: {
            rsi: 52,
            adx: 10,
            atr: 300
        }
    },
    equity: 100000,
    marketData: {
        volume24h: 3000000,
        volatility: 0.008
    },
    regime: 'RANGING',
    marketContext: {
        symbol: 'BTCUSDT',
        timeframe: 'm15'
    }
};
// Scenariusz 3: Nagły spadek z wysoką zmiennością podczas wydarzenia makro
exports.HIGH_VOLATILITY_SCENARIO = {
    timestamp: Date.now(),
    prices: {
        m15: {
            time: Date.now(),
            open: 42000,
            high: 42000,
            low: 40000,
            close: 40500,
            volume: 2000
        },
        h1: {
            time: Date.now(),
            open: 42500,
            high: 42500,
            low: 40000,
            close: 40500,
            volume: 8000
        },
        h4: {
            time: Date.now(),
            open: 43000,
            high: 43000,
            low: 40000,
            close: 40500,
            volume: 24000
        },
        d1: {
            time: Date.now(),
            open: 43500,
            high: 43500,
            low: 40000,
            close: 40500,
            volume: 100000
        }
    },
    indicators: {
        m15: {
            rsi: 20, // Wyprzedanie
            adx: 45, // Bardzo silny trend
            atr: 300, // Ekstremalna zmienność
            ema_9: 41500,
            ema_21: 42000,
            ema_50: 42500,
            ema_200: 43000,
            supertrend: {
                value: 41000,
                direction: 'sell'
            },
            macd: {
                macd: -200,
                signal: -150,
                histogram: -50
            }
        },
        h1: {
            rsi: 25,
            adx: 42,
            atr: 600,
            ema_50: 42800,
            ema_200: 43200
        },
        h4: {
            rsi: 30,
            adx: 40,
            atr: 1000
        },
        d1: {
            rsi: 35,
            adx: 38,
            atr: 1500
        }
    },
    equity: 100000,
    marketData: {
        volume24h: 10000000,
        volatility: 0.05
    },
    regime: 'STRONG_DOWNTREND',
    marketContext: {
        symbol: 'BTCUSDT',
        timeframe: 'm15'
    }
};

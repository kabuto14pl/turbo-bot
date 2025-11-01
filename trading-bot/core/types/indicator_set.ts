/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
export interface SuperTrendOutput {
    value: number;
    direction: 'buy' | 'sell';
}

export interface MACDOutput {
    macd: number;
    signal: number;
    histogram: number;
}

export interface IndicatorSet {
    sma20?: number;
    sma50?: number;
    sma200?: number;
    bb?: {
        upper: number;
        middle: number;
        lower: number;
    };
    // Podstawowe wskaźniki
    rsi: number;
    adx: number;
    atr: number;

    // Średnie kroczące
    ema_9: number;
    ema_21: number;
    ema_50: number;
    ema_200: number;

    // Złożone wskaźniki
    supertrend: SuperTrendOutput;
    macd: MACDOutput;

    // Momentum i trend
    roc?: number;
    momentum?: number;
    trend_strength?: number;

    // Zmienność
    volatility?: number;
    volume_ma?: number;
} 
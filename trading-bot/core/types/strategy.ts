/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { Regime } from './regime';
import { IndicatorSet } from './indicator_set';
import { Position } from './position';
import { MarketData } from './market_data';
import { BotState, TimeframeData } from './bot_state';

// Re-export BotState for strategy usage
export { BotState, TimeframeData };

export interface Candle {
    time: number;
    timestamp?: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface SuperTrendOutput {
    value: number;
    direction: 'buy' | 'sell';
}

export interface Indicators {
    rsi?: number;
    adx?: number;
    atr?: number;
    ema_9?: number;
    ema_21?: number;
    ema_50?: number;
    ema_200?: number;
    supertrend?: SuperTrendOutput;
    macd?: {
        macd: number;
        signal: number;
        histogram: number;
    };
}



export interface StrategySignal {
    type: 'ENTER_LONG' | 'ENTER_SHORT' | 'EXIT_LONG' | 'EXIT_SHORT';
    price: number;
    confidence: number;
    stopLoss?: number;
    takeProfit?: number;
    size?: number;
    quantity?: number; // Added for compatibility
    action?: 'ENTER_LONG' | 'ENTER_SHORT' | 'EXIT_LONG' | 'EXIT_SHORT'; // Added for compatibility
    symbol?: string; // Added for compatibility
    strategyId?: string; // Added for compatibility
    indicators: {
        [key: string]: number;
    };
    metadata?: {
        strategy: string;
        timeframe: string;
        regime: Regime;
    };
    orderType?: string;
    trailingStops?: Array<{
        type: string;
        stopLoss: number;
        takeProfit: number;
    }>;
}

export interface Strategy {
    generateSignal(state: BotState): any;
    readonly name: string;
    readonly description: string;
    readonly defaultWeight: number;
    run(state: BotState): Promise<StrategySignal[]>;
    validateConfig(): boolean;
    getRequiredIndicators(): string[];
    getRequiredTimeframes(): string[];
    getConfig(): StrategyConfig;
}

export interface StrategyConfig {
    name: string;
    timeframes: string[];
    indicators: {
        rsi?: {
            period: number;
            overbought: number;
            oversold: number;
        };
        ema?: {
            periods: number[];
        };
        atr?: {
            period: number;
            multiplier: number;
        };
        adx?: {
            period: number;
            threshold: number;
        };
        macd?: {
            fastPeriod: number;
            slowPeriod: number;
            signalPeriod: number;
        };
        supertrend?: {
            period: number;
            multiplier: number;
        };
        roc?: {
            period: number;
        };
        // ⭐ ULTRA-OPTIMIZED FEATURES (NEW!)
        rsiSmoothing?: number;           // RSI noise reduction
        trendFilter?: number;            // EMA trend filter (0=off, 1=EMA50, 2=EMA200)
        volumeFilter?: boolean;          // Volume confirmation
        volatilityAdjustment?: boolean;  // Dynamic volatility adaptation
    };
    riskManagement: {
        maxPositionSize: number;
        riskPerTrade: number;
        maxDrawdown: number;
        stopLossAtrMultiplier: number;
        takeProfitAtrMultiplier: number;
    };
}

export interface StrategyPerformance {
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    lastUpdate: number;
    return: number;
    volume: number;
    drawdown: number;
    timestamp: number;
}

// Standardowe wartości dla wszystkich strategii
export const DEFAULT_STRATEGY_CONFIG: Partial<StrategyConfig> = {
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
        maxPositionSize: 0.1,    // 10% kapitału
        riskPerTrade: 0.02,      // 2% ryzyko
        maxDrawdown: 0.15,       // 15% drawdown
        stopLossAtrMultiplier: 2,
        takeProfitAtrMultiplier: 3
    }
};

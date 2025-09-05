import { MACDOutput } from './macd';
import { SuperTrendOutput } from './supertrend';
import { SupportResistanceLevel } from './support_resistance_detector';

/**
 * Zestaw wskaźników dla pojedynczego interwału czasowego.
 */
export interface SingleTimeframeIndicators {
    rsi?: number;
    ema_9?: number;
    ema_21?: number;
    ema_50?: number;
    ema_200?: number;
    atr?: number;
    adx?: number;
    roc?: number;
    macd?: MACDOutput;
    supertrend?: SuperTrendOutput;
    supportLevels?: SupportResistanceLevel[];
    resistanceLevels?: SupportResistanceLevel[];
}

/**
 * Główny, silnie typowany kontener na wszystkie wskaźniki
 * używane w systemie, pochodzące z różnych interwałów czasowych.
 * Zastępuje to słabo typowany obiekt ` { [key: string]: any } `.
 */
export interface IndicatorSet {
    m15: SingleTimeframeIndicators;
    h1: SingleTimeframeIndicators;
    h4: SingleTimeframeIndicators;
    d1: {
        atr?: number;
        atrAvg?: number;
    };
} 
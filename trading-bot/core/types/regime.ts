/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
export interface Regime {
    trend: number;      // -1 do 1, gdzie -1 to silny trend spadkowy, 1 to silny trend wzrostowy
    volatility: number; // 0 do 1, gdzie 0 to niska zmienność, 1 to wysoka zmienność
    momentum: number;   // -1 do 1, gdzie -1 to silny momentum spadkowy, 1 to silny momentum wzrostowy
    regime: 'trend' | 'range' | 'breakout' | 'reversal';
} 
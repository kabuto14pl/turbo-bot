import { Candle } from './multi_timeframe_synchronizer';

export type IndicatorName = 'ema' | 'rsi' | 'atr' | 'macd' | 'supertrend';

export interface IndicatorOutput {
    [key: string]: number;
}

export class IndicatorProvider {
    // symbol -> timeframe -> indicator -> barIndex -> value
    private cache: Map<string, Map<string, Map<string, Map<number, number | IndicatorOutput>>>> = new Map();

    constructor() {}

    /**
     * Pobiera wartość wskaźnika z cache lub liczy, jeśli nie ma.
     */
    getIndicator(symbol: string, timeframe: string, indicator: IndicatorName, bar: number, candles: Candle[]): number | IndicatorOutput | undefined {
        if (!this.cache.has(symbol)) this.cache.set(symbol, new Map());
        const tfMap = this.cache.get(symbol)!;
        if (!tfMap.has(timeframe)) tfMap.set(timeframe, new Map());
        const indMap = tfMap.get(timeframe)!;
        if (!indMap.has(indicator)) indMap.set(indicator, new Map());
        const barMap = indMap.get(indicator)!;
        if (barMap.has(bar)) return barMap.get(bar);
        // Jeśli nie ma w cache, licz i zapisz
        const value = this.computeIndicator(indicator, candles, bar);
        if (value !== undefined) {
            barMap.set(bar, value);
        }
        return value;
    }

    /**
     * Liczy wskaźnik na podstawie świec i indeksu.
     * (Szkielet – do rozbudowy o konkretne wskaźniki)
     */
    private computeIndicator(indicator: IndicatorName, candles: Candle[], bar: number): number | IndicatorOutput | undefined {
        switch (indicator) {
            case 'ema':
                return this.computeEMA(candles, bar, 21); // domyślnie EMA21, można rozbudować o parametr
            case 'rsi':
                return this.computeRSI(candles, bar, 14);
            case 'atr':
                return this.computeATR(candles, bar, 14);
            case 'macd':
                return this.computeMACD(candles, bar);
            case 'supertrend':
                return this.computeSuperTrend(candles, bar);
            default:
                return undefined;
        }
    }

    // --- EMA ---
    private computeEMA(candles: Candle[], bar: number, period: number): number | undefined {
        if (bar < period - 1) return undefined;
        const k = 2 / (period + 1);
        let ema = candles[bar - period + 1].close;
        for (let i = bar - period + 2; i <= bar; ++i) {
            ema = candles[i].close * k + ema * (1 - k);
        }
        return ema;
    }

    // --- RSI ---
    private computeRSI(candles: Candle[], bar: number, period: number): number | undefined {
        if (bar < period) return undefined;
        let gain = 0, loss = 0;
        for (let i = bar - period + 1; i <= bar; ++i) {
            const diff = candles[i].close - candles[i - 1].close;
            if (diff > 0) gain += diff; else loss -= diff;
        }
        if (gain + loss === 0) return 50;
        const rs = gain / (loss === 0 ? 1 : loss);
        return 100 - 100 / (1 + rs);
    }

    // --- ATR ---
    private computeATR(candles: Candle[], bar: number, period: number): number | undefined {
        if (bar < period) return undefined;
        let sum = 0;
        for (let i = bar - period + 1; i <= bar; ++i) {
            const high = candles[i].high;
            const low = candles[i].low;
            const prevClose = candles[i - 1].close;
            const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
            sum += tr;
        }
        return sum / period;
    }

    // --- MACD ---
    private computeMACD(candles: Candle[], bar: number): IndicatorOutput | undefined {
        // Standard: EMA12, EMA26, signal=9
        const ema12 = this.computeEMA(candles, bar, 12);
        const ema26 = this.computeEMA(candles, bar, 26);
        if (ema12 === undefined || ema26 === undefined) return undefined;
        const macd = ema12 - ema26;
        // Signal line
        let signal = macd;
        if (bar >= 34) { // 26+9-1
            let emaSignal = 0;
            for (let i = bar - 8; i <= bar; ++i) {
                const e12 = this.computeEMA(candles, i, 12);
                const e26 = this.computeEMA(candles, i, 26);
                if (e12 === undefined || e26 === undefined) return undefined;
                emaSignal += e12 - e26;
            }
            signal = emaSignal / 9;
        }
        return { macd, signal, histogram: macd - signal };
    }

    // --- SuperTrend (uproszczony) ---
    private computeSuperTrend(candles: Candle[], bar: number, period: number = 10, multiplier: number = 3): IndicatorOutput | undefined {
        if (bar < period) return undefined;
        // ATR
        const atr = this.computeATR(candles, bar, period);
        if (atr === undefined) return undefined;
        const hl2 = (candles[bar].high + candles[bar].low) / 2;
        const upper = hl2 + multiplier * atr;
        const lower = hl2 - multiplier * atr;
        // Prosta wersja: nie trzymamy stanu trendu, tylko sygnał na podstawie zamknięcia
        const close = candles[bar].close;
        const trend = close > upper ? 1 : close < lower ? -1 : 0;
        return { value: trend, upper, lower, atr };
    }

    /**
     * Precompute all indicators for dany symbol/timeframe (optymalizacja batchowa)
     */
    precomputeAll(symbol: string, timeframe: string, candles: Candle[], indicators: IndicatorName[]): void {
        for (const indicator of indicators) {
            for (let bar = 0; bar < candles.length; ++bar) {
                this.getIndicator(symbol, timeframe, indicator, bar, candles);
            }
        }
    }
} 
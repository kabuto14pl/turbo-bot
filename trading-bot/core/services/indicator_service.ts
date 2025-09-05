import { calcEMA } from '../indicators/ema';
import { calcRSI } from '../indicators/rsi';
import { calculateMACD } from '../indicators/macd';
import { calculateADX } from '../indicators/adx';
import { calculateATR } from '../indicators/atr';
import { calculateROC } from '../indicators/roc';
import { calculateSuperTrend } from '../indicators/supertrend';
import { IndicatorSet, SingleTimeframeIndicators } from '../indicators/indicator_set';
import { Candle } from '../indicators/multi_timeframe_synchronizer';
import { SupportResistanceDetector, SupportResistanceLevel } from '../indicators/support_resistance_detector';

/**
 * Wyspecjalizowany serwis do obliczania wskaźników technicznych.
 * Zastępuje bezpośrednie obliczenia w main.ts i zapewnia centralizację logiki wskaźników.
 */
export class IndicatorService {
    
    /**
     * Oblicza wszystkie wskaźniki dla danego zestawu świec.
     */
    calculateAllIndicators(
        m15Candles: Candle[],
        h1Candles: Candle[],
        h4Candles: Candle[],
        d1Candles: Candle[]
    ): IndicatorSet {
        const m15_closes = m15Candles.map(c => c.close);
        const m15_highs = m15Candles.map(c => c.high);
        const m15_lows = m15Candles.map(c => c.low);
        
        return {
            m15: this.calculateM15Indicators(m15Candles, m15_highs, m15_lows, m15_closes),
            h1: this.calculateH1Indicators(h1Candles),
            h4: this.calculateH4Indicators(h4Candles),
            d1: this.calculateD1Indicators(d1Candles)
        };
    }

    /**
     * Oblicza wskaźniki dla timeframe'u 15-minutowego.
     */
    private calculateM15Indicators(
        candles: Candle[],
        highs: number[],
        lows: number[],
        closes: number[]
    ): SingleTimeframeIndicators {
        // Obliczanie wskaźników dla każdej świecy
        const rsi: number[] = [];
        const ema9: number[] = [];
        const ema21: number[] = [];
        const ema50: number[] = [];
        const ema200: number[] = [];
        
        for (let i = 0; i < candles.length; i++) {
            const slice = candles.slice(0, i + 1);
            rsi.push(calcRSI(slice, 14) || 0);
            ema9.push(calcEMA(slice, 9) || 0);
            ema21.push(calcEMA(slice, 21) || 0);
            ema50.push(calcEMA(slice, 50) || 0);
            ema200.push(calcEMA(slice, 200) || 0);
        }
        
        // Obliczanie wskaźników bazujących na całej serii danych
        const atrResult = calculateATR(highs, lows, closes, 14);
        const adxResult = calculateADX(highs, lows, closes, 14);
        const rocResult = calculateROC(closes, 14);
        const macdResult = calculateMACD(closes);
        const supertrendResult = calculateSuperTrend(highs, lows, closes, 10, 3);

        // --- INTEGRACJA ROLLING WSPARĆ/OPORÓW ---
        const levels = SupportResistanceDetector.detectLevelsRolling(candles, 5);
        const supportLevels = levels.filter(l => l.type === 'support');
        const resistanceLevels = levels.filter(l => l.type === 'resistance');
        // ---

        return {
            rsi: rsi[rsi.length - 1], // Najnowsza wartość
            ema_9: ema9[ema9.length - 1],
            ema_21: ema21[ema21.length - 1],
            ema_50: ema50[ema50.length - 1],
            ema_200: ema200[ema200.length - 1],
            atr: atrResult[atrResult.length - 1],
            adx: adxResult ? adxResult[adxResult.length - 1] ?? 0 : 0,
            roc: rocResult ? rocResult[rocResult.length - 1] ?? 0 : 0,
            macd: macdResult ? macdResult[macdResult.length - 1] : undefined,
            supertrend: supertrendResult ? supertrendResult[supertrendResult.length - 1] : undefined,
            supportLevels,
            resistanceLevels
        };
    }

    /**
     * Oblicza wskaźniki dla timeframe'u 1-godzinnego.
     */
    private calculateH1Indicators(candles: Candle[]): SingleTimeframeIndicators {
        const rsi: number[] = [];
        const ema_fast: number[] = [];
        const ema_slow: number[] = [];
        
        for (let i = 0; i < candles.length; i++) {
            const slice = candles.slice(0, i + 1);
            rsi.push(calcRSI(slice, 14) || 0);
            ema_fast.push(calcEMA(slice, 8) || 0);
            ema_slow.push(calcEMA(slice, 21) || 0);
        }
        
        return {
            rsi: rsi[rsi.length - 1],
            ema_9: ema_fast[ema_fast.length - 1],
            ema_21: ema_slow[ema_slow.length - 1]
        };
    }

    /**
     * Oblicza wskaźniki dla timeframe'u 4-godzinnego.
     */
    private calculateH4Indicators(candles: Candle[]): SingleTimeframeIndicators {
        // Na razie puste, można dodać specyficzne wskaźniki H4
        return {};
    }

    /**
     * Oblicza wskaźniki dla timeframe'u 1-dniowego.
     */
    private calculateD1Indicators(candles: Candle[]): { atr?: number; atrAvg?: number } {
        if (candles.length === 0) return {};
        
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const closes = candles.map(c => c.close);
        
        const atrResult = calculateATR(highs, lows, closes, 14);
        const atr = atrResult[atrResult.length - 1];
        const atrAvg = atrResult.reduce((sum, val) => sum + val, 0) / atrResult.length;
        
        return { atr, atrAvg };
    }

    /**
     * Pobiera wartość wskaźnika dla konkretnego indeksu (dla analizy historycznej).
     */
    getIndicatorValue(
        indicatorSet: IndicatorSet,
        timeframe: 'm15' | 'h1' | 'h4' | 'd1',
        indicatorName: string
    ): number | undefined {
        const timeframeIndicators = indicatorSet[timeframe];
        return (timeframeIndicators as any)[indicatorName] as number | undefined;
    }
} 
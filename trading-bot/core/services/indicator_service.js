"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndicatorService = void 0;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
const ema_1 = require("../indicators/ema");
const rsi_1 = require("../indicators/rsi");
const macd_1 = require("../indicators/macd");
const adx_1 = require("../indicators/adx");
const atr_1 = require("../indicators/atr");
const roc_1 = require("../indicators/roc");
const supertrend_1 = require("../indicators/supertrend");
const support_resistance_detector_1 = require("../indicators/support_resistance_detector");
/**
 * Wyspecjalizowany serwis do obliczania wskaźników technicznych.
 * Zastępuje bezpośrednie obliczenia w main.ts i zapewnia centralizację logiki wskaźników.
 */
class IndicatorService {
    /**
     * Oblicza wszystkie wskaźniki dla danego zestawu świec.
     */
    calculateAllIndicators(m15Candles, h1Candles, h4Candles, d1Candles) {
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
    calculateM15Indicators(candles, highs, lows, closes) {
        // Obliczanie wskaźników dla każdej świecy
        const rsi = [];
        const ema9 = [];
        const ema21 = [];
        const ema50 = [];
        const ema200 = [];
        for (let i = 0; i < candles.length; i++) {
            const slice = candles.slice(0, i + 1);
            rsi.push((0, rsi_1.calcRSI)(slice, 14) || 0);
            ema9.push((0, ema_1.calcEMA)(slice, 9) || 0);
            ema21.push((0, ema_1.calcEMA)(slice, 21) || 0);
            ema50.push((0, ema_1.calcEMA)(slice, 50) || 0);
            ema200.push((0, ema_1.calcEMA)(slice, 200) || 0);
        }
        // Obliczanie wskaźników bazujących na całej serii danych
        const atrResult = (0, atr_1.calculateATR)(highs, lows, closes, 14);
        const adxResult = (0, adx_1.calculateADX)(highs, lows, closes, 14);
        const rocResult = (0, roc_1.calculateROC)(closes, 14);
        const macdResult = (0, macd_1.calculateMACD)(closes);
        const supertrendResult = (0, supertrend_1.calculateSuperTrend)(highs, lows, closes, 10, 3);
        // --- INTEGRACJA ROLLING WSPARĆ/OPORÓW ---
        const levels = support_resistance_detector_1.SupportResistanceDetector.detectLevelsRolling(candles, 5);
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
    calculateH1Indicators(candles) {
        const rsi = [];
        const ema_fast = [];
        const ema_slow = [];
        for (let i = 0; i < candles.length; i++) {
            const slice = candles.slice(0, i + 1);
            rsi.push((0, rsi_1.calcRSI)(slice, 14) || 0);
            ema_fast.push((0, ema_1.calcEMA)(slice, 8) || 0);
            ema_slow.push((0, ema_1.calcEMA)(slice, 21) || 0);
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
    calculateH4Indicators(candles) {
        // Na razie puste, można dodać specyficzne wskaźniki H4
        return {};
    }
    /**
     * Oblicza wskaźniki dla timeframe'u 1-dniowego.
     */
    calculateD1Indicators(candles) {
        if (candles.length === 0)
            return {};
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const closes = candles.map(c => c.close);
        const atrResult = (0, atr_1.calculateATR)(highs, lows, closes, 14);
        const atr = atrResult[atrResult.length - 1];
        const atrAvg = atrResult.reduce((sum, val) => sum + val, 0) / atrResult.length;
        return { atr, atrAvg };
    }
    /**
     * Pobiera wartość wskaźnika dla konkretnego indeksu (dla analizy historycznej).
     */
    getIndicatorValue(indicatorSet, timeframe, indicatorName) {
        const timeframeIndicators = indicatorSet[timeframe];
        return timeframeIndicators[indicatorName];
    }
}
exports.IndicatorService = IndicatorService;

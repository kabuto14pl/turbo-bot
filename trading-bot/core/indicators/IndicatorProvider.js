"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndicatorProvider = void 0;
const ema_1 = require("./ema");
const rsi_1 = require("./rsi");
const atr_1 = require("./atr");
const macd_1 = require("./macd");
const supertrend_1 = require("./supertrend");
function cacheKeyToString(key) {
    return `${key.type}|${key.symbol}|${key.timeframe}|${key.params}`;
}
/**
 * IndicatorProvider - centralny provider wskaźników z cache'owaniem i typowaniem.
 * Umożliwia pobieranie wskaźników dla dowolnego instrumentu, timeframe i parametrów.
 */
class IndicatorProvider {
    constructor() {
        this.cache = new Map();
    }
    /**
     * Pobiera wskaźnik według typu, parametrów, instrumentu i timeframe.
     * Automatycznie korzysta z cache.
     */
    getIndicator(request) {
        const key = {
            type: request.type,
            symbol: request.symbol,
            timeframe: request.timeframe,
            params: JSON.stringify(request.params),
        };
        const cacheKey = cacheKeyToString(key);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        let result;
        switch (request.type) {
            case 'EMA':
                if (typeof request.params.period !== 'number')
                    throw new Error('Brak parametru period dla EMA');
                result = (0, ema_1.calcEMA)(request.candles, request.params.period);
                break;
            case 'RSI':
                if (typeof request.params.period !== 'number')
                    throw new Error('Brak parametru period dla RSI');
                result = (0, rsi_1.calcRSI)(request.candles, request.params.period);
                break;
            case 'ATR':
                // ATR wymaga tablic highs, lows, closes
                if (typeof request.params.period !== 'number')
                    throw new Error('Brak parametru period dla ATR');
                const highs = request.candles.map(c => c.high);
                const lows = request.candles.map(c => c.low);
                const closes = request.candles.map(c => c.close);
                result = (0, atr_1.calculateATR)(highs, lows, closes, request.params.period);
                break;
            case 'MACD':
                // MACD wymaga tablicy closes i parametrów fast, slow, signal
                const closesMacd = request.candles.map(c => c.close);
                result = (0, macd_1.calculateMACD)(closesMacd, request.params.fastPeriod ?? 12, request.params.slowPeriod ?? 26, request.params.signalPeriod ?? 9);
                break;
            case 'SuperTrend':
                // SuperTrend wymaga tablic highs, lows, closes, period, multiplier
                const highsSt = request.candles.map(c => c.high);
                const lowsSt = request.candles.map(c => c.low);
                const closesSt = request.candles.map(c => c.close);
                result = (0, supertrend_1.calculateSuperTrend)(highsSt, lowsSt, closesSt, request.params.period ?? 10, request.params.multiplier ?? 3);
                break;
            default:
                throw new Error(`Nieznany typ wskaźnika: ${request.type}`);
        }
        this.cache.set(cacheKey, result);
        return result;
    }
    /**
     * Batch liczenie i cache’owanie wskaźników dla wielu świec, parametrów, symboli, timeframe’ów.
     * Przyjmuje tablicę IndicatorRequest i dla każdego wywołuje getIndicator dla wszystkich indeksów świec.
     */
    precomputeAll(requests) {
        for (const req of requests) {
            for (let i = 0; i < req.candles.length; ++i) {
                // Tworzymy request dla każdego indeksu świecy (np. rolling EMA/RSI)
                const indexedReq = { ...req, params: { ...req.params, bar: i } };
                this.getIndicator({ ...req, candles: req.candles.slice(0, i + 1) });
            }
        }
    }
    /**
     * Czyści cache wskaźników (np. po zmianie danych wejściowych).
     */
    clearCache() {
        this.cache.clear();
    }
}
exports.IndicatorProvider = IndicatorProvider;

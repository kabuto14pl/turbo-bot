import { calcEMA } from './ema';
import { calcRSI } from './rsi';
import { calculateATR } from './atr';
import { calculateMACD, MACDOutput } from './macd';
import { calculateSuperTrend, SuperTrendOutput } from './supertrend';
import { Candle } from './multi_timeframe_synchronizer';

export type IndicatorType = 'EMA' | 'RSI' | 'ATR' | 'MACD' | 'SuperTrend';

export interface IndicatorRequest {
  type: IndicatorType;
  params: Record<string, any>;
  candles: Candle[];
  symbol: string;
  timeframe: string;
}

export type IndicatorResult = number | number[] | MACDOutput[] | SuperTrendOutput[] | null;

interface CacheKey {
  type: IndicatorType;
  symbol: string;
  timeframe: string;
  params: string; // JSON.stringify(params)
}

function cacheKeyToString(key: CacheKey): string {
  return `${key.type}|${key.symbol}|${key.timeframe}|${key.params}`;
}

/**
 * IndicatorProvider - centralny provider wskaźników z cache'owaniem i typowaniem.
 * Umożliwia pobieranie wskaźników dla dowolnego instrumentu, timeframe i parametrów.
 */
export class IndicatorProvider {
  private cache: Map<string, IndicatorResult> = new Map();

  /**
   * Pobiera wskaźnik według typu, parametrów, instrumentu i timeframe.
   * Automatycznie korzysta z cache.
   */
  public getIndicator(request: IndicatorRequest): IndicatorResult {
    const key: CacheKey = {
      type: request.type,
      symbol: request.symbol,
      timeframe: request.timeframe,
      params: JSON.stringify(request.params),
    };
    const cacheKey = cacheKeyToString(key);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    let result: IndicatorResult;
    switch (request.type) {
      case 'EMA':
        if (typeof request.params.period !== 'number') throw new Error('Brak parametru period dla EMA');
        result = calcEMA(request.candles, request.params.period);
        break;
      case 'RSI':
        if (typeof request.params.period !== 'number') throw new Error('Brak parametru period dla RSI');
        result = calcRSI(request.candles, request.params.period);
        break;
      case 'ATR':
        // ATR wymaga tablic highs, lows, closes
        if (typeof request.params.period !== 'number') throw new Error('Brak parametru period dla ATR');
        const highs = request.candles.map(c => c.high);
        const lows = request.candles.map(c => c.low);
        const closes = request.candles.map(c => c.close);
        result = calculateATR(highs, lows, closes, request.params.period);
        break;
      case 'MACD':
        // MACD wymaga tablicy closes i parametrów fast, slow, signal
        const closesMacd = request.candles.map(c => c.close);
        result = calculateMACD(
          closesMacd,
          request.params.fastPeriod ?? 12,
          request.params.slowPeriod ?? 26,
          request.params.signalPeriod ?? 9
        );
        break;
      case 'SuperTrend':
        // SuperTrend wymaga tablic highs, lows, closes, period, multiplier
        const highsSt = request.candles.map(c => c.high);
        const lowsSt = request.candles.map(c => c.low);
        const closesSt = request.candles.map(c => c.close);
        result = calculateSuperTrend(
          highsSt,
          lowsSt,
          closesSt,
          request.params.period ?? 10,
          request.params.multiplier ?? 3
        );
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
  public precomputeAll(requests: IndicatorRequest[]): void {
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
  public clearCache() {
    this.cache.clear();
  }
} 
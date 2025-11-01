/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { Candle } from '../indicators/multi_timeframe_synchronizer';

export interface MarketContext {
  symbol: string;
  candles: Candle[]; // 15m
  h1: Candle[];
  h4: Candle[];
  d1: Candle[];
}

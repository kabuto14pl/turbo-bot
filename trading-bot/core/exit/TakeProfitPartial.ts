/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { Candle } from '../indicators/multi_timeframe_synchronizer';
import { ExitSignal } from './ExitOnRsiReturn';

export class TakeProfitPartial {
  constructor(private ratio: number) {}
  evaluate(c: Candle, entryPrice: number): ExitSignal | null {
    if (c.close >= entryPrice * this.ratio) {
      return { type: 'partial', percentage: 50, reason: 'TP Hit' };
    }
    return null;
  }
}

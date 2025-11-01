/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { Candle } from '../indicators/multi_timeframe_synchronizer';
import { EntryCondition } from './EntryCondition';

export class RsiBelow implements EntryCondition {
  label: string;
  constructor(private threshold: number) {
    this.label = `RSI < ${this.threshold}`;
  }
  evaluate(c: Candle) {
    return c.rsi !== undefined && c.rsi < this.threshold;
  }
}

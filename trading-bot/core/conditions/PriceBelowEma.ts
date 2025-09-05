import { Candle } from '../indicators/multi_timeframe_synchronizer';
import { EntryCondition } from './EntryCondition';

export class PriceBelowEma implements EntryCondition {
  label = 'Price < EMA';
  constructor(private emaField: keyof Candle) {}
  evaluate(c: Candle) {
    return c.close < (c[this.emaField] as number);
  }
}

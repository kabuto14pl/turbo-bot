import { Candle } from '../indicators/multi_timeframe_synchronizer';
import { EntryCondition } from './EntryCondition';

export class RsiAbove implements EntryCondition {
  label: string;
  constructor(private threshold: number) {
    this.label = `RSI > ${this.threshold}`;
  }
  evaluate(c: Candle): boolean {
    return c.rsi !== undefined && c.rsi > this.threshold;
  }
}

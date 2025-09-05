import { Candle } from '../indicators/multi_timeframe_synchronizer';
import { EntryCondition } from './EntryCondition';

export class AdxAbove implements EntryCondition {
  label: string;
  constructor(private min: number) {
    this.label = `ADX > ${this.min}`;
  }
  evaluate(c: Candle) {
    return c.adx !== undefined && c.adx > this.min;
  }
}

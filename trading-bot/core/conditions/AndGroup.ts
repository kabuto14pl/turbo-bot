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

export class AndGroup implements EntryCondition {
  label = 'AND group';
  constructor(private conditions: EntryCondition[]) {}
  evaluate(c: Candle): boolean {
    return this.conditions.every(cond => cond.evaluate(c));
  }
}

/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { EntryCondition } from '../../conditions/EntryCondition';

export class RsiAbove implements EntryCondition {
  constructor(private value: number, private period: number) {}

  get label(): string {
    return `RSI(${this.period}) > ${this.value}`;
  }

  evaluate(candle: any): boolean {
    if (candle.rsi === undefined || candle.rsi === null) {
      return false;
    }
    return candle.rsi > this.value;
  }
}

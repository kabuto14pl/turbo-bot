import { Candle } from '../indicators/multi_timeframe_synchronizer';
import { ExitSignal } from './ExitOnRsiReturn';
import { TakeProfitPartial } from './TakeProfitPartial';
import { ExitOnRsiReturn } from './ExitOnRsiReturn';

export class ExitManager {
  constructor(private exits: (ExitOnRsiReturn | TakeProfitPartial)[])
  {}
  evaluate(c: Candle, entryPrice: number): ExitSignal | null {
    for (const exit of this.exits) {
      const signal = exit instanceof TakeProfitPartial
        ? exit.evaluate(c, entryPrice)
        : exit.evaluate(c);
      if (signal) return signal;
    }
    return null;
  }
}

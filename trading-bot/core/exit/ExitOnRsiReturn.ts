import { Candle } from '../indicators/multi_timeframe_synchronizer';

export type ExitType = 'partial' | 'full';
export interface ExitSignal {
  type: ExitType;
  percentage?: number;
  reason: string;
}

export class ExitOnRsiReturn {
  constructor(private lower: number, private upper: number) {}
  evaluate(c: Candle): ExitSignal | null {
    if (c.rsi > this.lower && c.rsi < this.upper) {
      return { type: 'full', reason: 'RSI neutral' };
    }
    return null;
  }
}

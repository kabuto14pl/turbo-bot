import { Candle } from '../indicators/multi_timeframe_synchronizer';

export interface EntryCondition {
  label: string;
  evaluate(candle: Candle): boolean;
}

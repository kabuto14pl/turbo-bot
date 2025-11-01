/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { NewOrderRequest } from './order';

export type TradeSignalType = 'entry' | 'exit' | 'hold' | 'ENTER_LONG' | 'ENTER_SHORT' | 'EXIT_LONG' | 'EXIT_SHORT';

export interface TradeSignal {
  type: TradeSignalType;
  orderRequest?: NewOrderRequest; // Zmieniono nazwę dla jasności
  reason?: string;
  confidence?: number; // Dodane dla meta strategy system
}

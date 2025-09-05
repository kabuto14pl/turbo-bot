import { Candle } from './multi_timeframe_synchronizer';
import * as fs from 'fs';

export type LevelType = 'support' | 'resistance';

export interface SupportResistanceLevel {
  timestamp: number;
  price: number;
  type: LevelType;
  strength: number; // liczba potwierdzeń/testów
}

export class SupportResistanceDetector {
  /**
   * Rolling detekcja pivot high/low (swingów) jako wsparcia/opory
   * window - liczba świec do przodu i do tyłu do potwierdzenia pivotu
   */
  static detectLevelsRolling(candles: Candle[], window: number = 5): SupportResistanceLevel[] {
    const levels: SupportResistanceLevel[] = [];
    for (let i = window; i < candles.length - window; i++) {
      const pivotHigh = candles.slice(i - window, i + window + 1).every((c, idx, arr) => {
        if (idx === window) return true;
        return c.high < arr[window].high;
      });
      if (pivotHigh) {
        levels.push({
          timestamp: candles[i].time,
          price: candles[i].high,
          type: 'resistance',
          strength: 1 // można rozbudować o liczbę testów
        });
      }
      const pivotLow = candles.slice(i - window, i + window + 1).every((c, idx, arr) => {
        if (idx === window) return true;
        return c.low > arr[window].low;
      });
      if (pivotLow) {
        levels.push({
          timestamp: candles[i].time,
          price: candles[i].low,
          type: 'support',
          strength: 1
        });
      }
    }
    return levels;
  }

  /**
   * Eksportuje rolling poziomy wsparcia/oporu do CSV
   */
  static exportLevelsToCSV(levels: SupportResistanceLevel[], outputPath: string) {
    const header = 'timestamp,price,type,strength';
    const lines = [header];
    for (const l of levels) {
      lines.push(`${l.timestamp},${l.price},${l.type},${l.strength}`);
    }
    fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
  }

  /**
   * Pobiera najbliższy poziom wsparcia/oporu dla danej świecy
   * direction: 'support' (szukaj poniżej ceny) lub 'resistance' (szukaj powyżej ceny)
   */
  static getNearestLevel(
    levels: SupportResistanceLevel[],
    price: number,
    direction: LevelType
  ): SupportResistanceLevel | null {
    const filtered = levels.filter(l => l.type === direction && (
      direction === 'support' ? l.price <= price : l.price >= price
    ));
    if (filtered.length === 0) return null;
    if (direction === 'support') {
      return filtered.reduce((a, b) => (a.price > b.price ? a : b));
    } else {
      return filtered.reduce((a, b) => (a.price < b.price ? a : b));
    }
  }
} 
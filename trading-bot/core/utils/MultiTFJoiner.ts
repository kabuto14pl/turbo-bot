/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { Candle } from '../indicators/multi_timeframe_synchronizer';

export interface MultiTimeframeCandleSet {
  m15: Candle;
  h1: Candle;
  h4: Candle;
  d1: Candle;
}

export function joinCandlesByTimestamp(
  m15: Candle[],
  h1: Candle[],
  h4: Candle[],
  d1: Candle[]
): MultiTimeframeCandleSet[] {
  console.log(`[SYNC][INFO] Liczba świec: M15=${m15.length}, H1=${h1.length}, H4=${h4.length}, D1=${d1.length}`);
  const sets: MultiTimeframeCandleSet[] = [];
  let h1Index = 0;
  let h4Index = 0;
  let d1Index = 0;

  for (let i = 0; i < m15.length; i++) {
    const c15 = m15[i];

    while (h1[h1Index + 1] && h1[h1Index + 1].time <= c15.time) {
      h1Index++;
    }
    while (h4[h4Index + 1] && h4[h4Index + 1].time <= c15.time) {
      h4Index++;
    }
    while (d1[d1Index + 1] && d1[d1Index + 1].time <= c15.time) {
      d1Index++;
    }

    const h1c = h1[h1Index];
    const h4c = h4[h4Index];
    const d1c = d1[d1Index];

    if (h1c && h4c && d1c) {
      sets.push({
        m15: c15,
        h1: h1c,
        h4: h4c,
        d1: d1c,
      });
    } else {
      if (i < 20) {
        console.warn(`[SYNC][WARN] Brak świecy w TF na i=${i}, ts=${c15.time}: H1=${!!h1c}, H4=${!!h4c}, D1=${!!d1c}`);
      }
    }
  }

  const result = sets;
  console.log(`[SYNC][INFO] Liczba zsynchronizowanych zestawów: ${result.length}`);
  return result;
}

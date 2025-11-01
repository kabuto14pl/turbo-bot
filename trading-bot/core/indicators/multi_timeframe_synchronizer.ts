/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
export type Candle = {
  time: number; // timestamp (ms od epoch)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  [key: string]: any; // wskaźniki, np. ema200, adx, rsi, itp.
};

export type MultiTfBar = {
  base: Candle;   // M15
  tf1h: Candle;   // 1H
  tf4h: Candle;   // 4H
  tf1d: Candle;   // 1D
};

export class MultiTimeframeSynchronizer {
  constructor(
    private baseCandles: Candle[],
    private tf1h: Candle[],
    private tf4h: Candle[],
    private tf1d: Candle[]
  ) {}

  public synchronize(): MultiTfBar[] {
    const result: MultiTfBar[] = [];
    let idx1h = 0, idx4h = 0, idx1d = 0;

    for (let i = 0; i < this.baseCandles.length; i++) {
      const base = this.baseCandles[i];
      while (idx1h + 1 < this.tf1h.length && this.tf1h[idx1h + 1].time <= base.time) idx1h++;
      while (idx4h + 1 < this.tf4h.length && this.tf4h[idx4h + 1].time <= base.time) idx4h++;
      while (idx1d + 1 < this.tf1d.length && this.tf1d[idx1d + 1].time <= base.time) idx1d++;
      // Log co 100 barów długości buforów i dopasowanie
      if (i % 100 === 0) {
        console.log(`[SYNC] i=${i}, base.time=${base.time}, H1.len=${this.tf1h.length}, H4.len=${this.tf4h.length}, D1.len=${this.tf1d.length}, idx1h=${idx1h}, idx4h=${idx4h}, idx1d=${idx1d}`);
      }
      // Log brak dopasowania
      if (!this.tf1h[idx1h] || !this.tf4h[idx4h] || !this.tf1d[idx1d]) {
        console.warn(`[SYNC][WARN] Brak dopasowania TF dla base.time=${base.time}: H1=${!!this.tf1h[idx1h]}, H4=${!!this.tf4h[idx4h]}, D1=${!!this.tf1d[idx1d]}`);
      }
      result.push({
        base,
        tf1h: this.tf1h[idx1h],
        tf4h: this.tf4h[idx4h],
        tf1d: this.tf1d[idx1d],
      });
    }
    return result;
  }
}

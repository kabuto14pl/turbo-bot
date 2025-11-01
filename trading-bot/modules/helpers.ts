/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared module component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// ============================================================================
// helpers.ts - Utility Functions and Helper Methods
// Extracted from main.ts for better modularity and reusability
// ============================================================================

import { SignalEvent, TradeEvent } from './types';
import { OrderRequest } from '../core/types/order';

// --- GLOBAL EVENT STORAGE ---
export const signal_events: SignalEvent[] = [];
export const trade_events: TradeEvent[] = [];

// --- EVENT RECORDING FUNCTIONS ---
export function record_signal(
  strategy: string, 
  ts: number, 
  type: string, 
  price: number, 
  extra: any = {}
): void {
  signal_events.push({ strategy, ts, type, price, ...extra });
}

export function record_trade(
  strategy: string,
  action: string,
  side: OrderRequest['side'],
  ts: number,
  price: number,
  size: number,
  sl: number | null,
  tp: number | null,
  pnl: number | null,
  extra: any = {}
): void {
  trade_events.push({ strategy, action, side, ts, price, size, sl, tp, pnl, ...extra });
}

// --- CSV EXPORT UTILITIES ---
export function toCsv(rows: any[], columns: string[]): string {
  const header = columns.join(',') + '\n';
  const csvRows = rows.map(row =>
    columns
      .map(col => {
        let val = row[col];
        if (val === undefined || val === null) return '';
        if (
          typeof val === 'string' &&
          (val.includes(',') || val.includes('\n') || val.includes('"'))
        ) {
          return '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
      })
      .join(',')
  );
  return header + csvRows.join('\n');
}

// --- MARKET ANALYSIS FUNCTIONS ---
export function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  
  const returns = prices.slice(1).map((price, i) => 
    Math.log(price / prices[i])
  );
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance);
}

export function determineTrend(prices: number[]): 'bullish' | 'bearish' | 'sideways' {
  if (prices.length < 3) return 'sideways';
  
  const first = prices[0];
  const last = prices[prices.length - 1];
  const change = (last - first) / first;
  
  if (change > 0.005) return 'bullish';    // > 0.5% change
  if (change < -0.005) return 'bearish';   // < -0.5% change
  return 'sideways';
}

// --- DATA VALIDATION ---
export function validateCandles(candles: any[]): boolean {
  if (!candles || candles.length === 0) {
    console.error('[VALIDATION] No candles provided');
    return false;
  }

  const requiredFields = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];
  const firstCandle = candles[0];
  
  for (const field of requiredFields) {
    if (!(field in firstCandle)) {
      console.error(`[VALIDATION] Missing required field: ${field}`);
      return false;
    }
  }

  return true;
}

// --- TIMESTAMP UTILITIES ---
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

export function getTimestampRange(candles: any[]): { start: number; end: number } {
  if (candles.length === 0) return { start: 0, end: 0 };
  
  return {
    start: candles[0].timestamp,
    end: candles[candles.length - 1].timestamp
  };
}

// --- PERFORMANCE CALCULATION HELPERS ---
export function calculateSharpeRatio(returns: number[], riskFreeRate: number = 0): number {
  if (returns.length === 0) return 0;
  
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const excessReturn = avgReturn - riskFreeRate;
  
  const variance = returns.reduce((acc, ret) => 
    acc + Math.pow(ret - avgReturn, 2), 0
  ) / returns.length;
  
  const volatility = Math.sqrt(variance);
  
  return volatility === 0 ? 0 : excessReturn / volatility;
}

export function calculateMaxDrawdown(equityCurve: number[]): number {
  if (equityCurve.length === 0) return 0;
  
  let maxDrawdown = 0;
  let peak = equityCurve[0];
  
  for (const value of equityCurve) {
    if (value > peak) {
      peak = value;
    }
    
    const drawdown = (peak - value) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
}

// --- EXPORT ALL FUNCTIONS ---
export default {
  signal_events,
  trade_events,
  record_signal,
  record_trade,
  toCsv,
  calculateVolatility,
  determineTrend,
  validateCandles,
  formatTimestamp,
  getTimestampRange,
  calculateSharpeRatio,
  calculateMaxDrawdown
};

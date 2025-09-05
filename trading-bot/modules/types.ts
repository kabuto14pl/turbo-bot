// ============================================================================
// types.ts - Bot Configuration Types and Interfaces
// Extracted from main.ts for better modularity and maintainability
// ============================================================================

import { OrderRequest } from '../core/types/order';

// --- STRATEGY TYPES ---
export type StrategyName =
  | 'RSITurbo'
  | 'SuperTrend'
  | 'MACrossover'
  | 'MomentumConfirm'
  | 'MomentumPro'
  | 'EnhancedRSITurbo'
  | 'AdvancedAdaptive';

export interface StrategyConfig {
  name: StrategyName;
  params: any; // e.g., { rsiPeriod: 14 } or { stMultiplier: 3 }
}

// --- MAIN TEST CONFIGURATION ---
export interface TestConfig {
  id: string;
  initialCapital: number;
  riskConfig: {
    maxDrawdown: number;
    maxDailyDrawdown: number;
  };
  simulationConfig: {
    commissionBps: number;
    slippageBps: number;
  };
  strategies: StrategyConfig[];
  symbols: string[];
  autoHedging?: {
    enabled: boolean;
    deltaThreshold: number;
    correlationThreshold: number;
    volatilityThreshold: number;
    rebalanceFrequency: number;
  };
  executionMode?: 'simulation' | 'demo' | 'live';
  okxConfig?: {
    apiKey: string;
    secretKey: string;
    passphrase: string;
    sandbox: boolean;
    tdMode: 'cash' | 'cross' | 'isolated';
    enableRealTrading: boolean;
  };
}

// --- EVENT RECORDING TYPES ---
export interface SignalEvent {
  strategy: string;
  ts: number;
  type: string;
  price: number;
  [key: string]: any;
}

export interface TradeEvent {
  strategy: string;
  action: string;
  side: OrderRequest['side'];
  ts: number;
  price: number;
  size: number;
  sl: number | null;
  tp: number | null;
  pnl: number | null;
  [key: string]: any;
}

// --- RUNTIME STATE TYPES ---
export interface BotRuntimeState {
  signalEvents: SignalEvent[];
  tradeEvents: TradeEvent[];
  startTime: number;
  isRunning: boolean;
  mode: 'backtest' | 'demo' | 'production';
}

// --- PERFORMANCE METRICS ---
export interface PerformanceMetrics {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  var95: number;
  cvar95: number;
}

// --- MODULE EXPORT ---
export default {
  StrategyName,
  StrategyConfig,
  TestConfig,
  SignalEvent,
  TradeEvent,
  BotRuntimeState,
  PerformanceMetrics
};

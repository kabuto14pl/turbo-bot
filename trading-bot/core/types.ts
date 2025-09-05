/**
 * Core type definitions for the trading bot
 */

export interface MarketData {
    symbol: string;
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    price: number; // Add price property for compatibility
    volume: number;
    interval?: string;
}

export interface Signal {
    type: 'BUY' | 'SELL' | 'HOLD';
    symbol: string;
    timestamp: number;
    strength: number; // 0-1
    price?: number;
    quantity?: number;
    reason?: string;
    metadata?: any;
    confidence?: number;
}

export interface StrategyResult {
    strategy?: string;
    signals: Signal[];
    performance?: {
        totalReturn?: number;
        sharpeRatio?: number;
        maxDrawdown?: number;
        winRate?: number;
        totalTrades?: number;
        [key: string]: any;
    };
    metadata: {
        strategy: string;
        timestamp: number;
        [key: string]: any;
    };
}

export interface ParameterConfig {
    type: 'integer' | 'float' | 'number' | 'categorical' | 'boolean';
    min?: number;
    max?: number;
    values?: any[];
    step?: number;
    default?: any;
}

export interface OptimizationConfig {
    strategyName: string;
    parameters: Record<string, ParameterConfig>;
    numTrials: number;
    optimizationMetric?: string; // Make optional to fix missing property error
    optimizationMode?: 'max' | 'min';
    numWorkers?: number;
    outputDir?: string;
    timeoutSeconds?: number;
}

export interface OptimizationResult {
    bestParameters: Record<string, any>;
    bestMetrics: Record<string, number>;
    allTrials?: any[];
    completedTrials: number;
    runtimeSeconds: number;
    executionTime?: number; // Add for compatibility
    timestamp: number;
    strategyName: string;
}

export enum ErrorType {
    OPTIMIZATION_FAILURE = 'OPTIMIZATION_FAILURE',
    STRATEGY_ERROR = 'STRATEGY_ERROR',
    DATA_ERROR = 'DATA_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR'
}

export interface IOptimizer {
    runOptimization(config: OptimizationConfig): Promise<OptimizationResult>;
}

// Additional types for compatibility
export interface Position {
    id?: string;
    symbol: string;
    quantity: number;
    averagePrice: number;
    currentPrice: number;
    unrealizedPnL: number;
    side: 'LONG' | 'SHORT';
    size?: number;
    entryPrice?: number;
    timestamp?: number;
}

export interface Order {
    id: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';
    quantity: number;
    price: number;
    stopLoss?: number;
    takeProfit?: number;
    status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
    timestamp: number;
    executedAt?: number;
    executedPrice?: number;
    size?: number;
    pnl?: number;
    strategyId: string;
}

export type OrderDirection = 'BUY' | 'SELL';
export type PositionDirection = 'LONG' | 'SHORT';

// Logger interface for compatibility
export interface Logger {
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
}

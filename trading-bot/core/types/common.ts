/**
 * 📋 COMMON TYPE DEFINITIONS
 * 
 * Shared types used across the trading bot system
 */

// =====================================================
// MARKET DATA TYPES
// =====================================================

export interface Candle {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface Signal {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    timestamp: number;
    price?: number;
    source: string;
    metadata?: Record<string, any>;
}

export interface Position {
    symbol: string;
    side: 'LONG' | 'SHORT';
    size: number;
    entryPrice: number;
    currentPrice: number;
    unrealizedPnl: number;
    realizedPnl: number;
    timestamp: number;
}

// =====================================================
// STRATEGY TYPES
// =====================================================

export interface StrategyConfig {
    id: string;
    name: string;
    enabled: boolean;
    parameters: Record<string, any>;
    riskParams?: {
        maxPositionSize?: number;
        stopLoss?: number;
        takeProfit?: number;
    };
    timeframe?: string;
    symbols?: string[];
}

export interface StrategyResult {
    signal: Signal;
    confidence: number;
    metadata?: Record<string, any>;
    timing: {
        processedAt: number;
        executionTime: number;
    };
}

export interface StrategyStatus {
    id: string;
    name: string;
    status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'PAUSED';
    lastUpdate: number;
    performance?: {
        totalTrades: number;
        winRate: number;
        pnl: number;
        sharpeRatio?: number;
    };
    errors?: string[];
}

// =====================================================
// PORTFOLIO & RISK TYPES
// =====================================================

export interface PortfolioStatus {
    totalValue: number;
    cash: number;
    positions: Position[];
    unrealizedPnl: number;
    realizedPnl: number;
    dailyPnl: number;
    exposure: number;
    lastUpdate: number;
    performance: {
        totalReturn: number;
        sharpeRatio: number;
        maxDrawdown: number;
        winRate: number;
    };
}

export interface RiskMetrics {
    currentDrawdown: number;
    maxDrawdown: number;
    var95: number;
    var99: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    volatility: number;
    beta: number;
    exposure: number;
    concentration: number;
    leverageRatio: number;
    liquidityRisk: number;
    correlationRisk: number;
}

// =====================================================
// SYSTEM TYPES
// =====================================================

export interface SystemStatus {
    timestamp: number;
    uptime: number;
    status: 'RUNNING' | 'STOPPED' | 'ERROR' | 'MAINTENANCE';
    components: Record<string, ComponentStatus>;
    performance: {
        cpuUsage: number;
        memoryUsage: number;
        diskUsage: number;
        networkLatency: number;
    };
}

export interface ComponentStatus {
    name: string;
    status: 'HEALTHY' | 'DEGRADED' | 'FAILED';
    lastCheck: number;
    uptime: number;
    errors?: string[];
    metrics?: Record<string, number>;
}

// =====================================================
// EXCHANGE & EXECUTION TYPES
// =====================================================

export interface ExchangeCredentials {
    apiKey: string;
    secretKey: string;
    passphrase?: string;
    sandbox?: boolean;
    baseURL?: string;
}

export interface OrderResult {
    success: boolean;
    orderId?: string;
    timestamp: number;
    price?: number;
    quantity?: number;
    error?: string;
    fees?: number;
    executionTime?: number;
}

// =====================================================
// UTILITY TYPES
// =====================================================

export type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

export type OrderSide = 'BUY' | 'SELL';

export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';

export interface TimestampedData {
    timestamp: number;
    [key: string]: any;
}

export interface DataRange {
    start: number;
    end: number;
}

// =====================================================
// ERROR TYPES
// =====================================================

export interface TradingError {
    code: string;
    message: string;
    timestamp: number;
    context?: Record<string, any>;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

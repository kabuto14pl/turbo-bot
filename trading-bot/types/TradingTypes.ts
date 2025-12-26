/**
 * @file TradingTypes.ts
 * @description Core TypeScript interfaces and types for the trading bot
 * 
 * ENTERPRISE-GRADE TYPE DEFINITIONS
 * Extracted from autonomous_trading_bot_final.ts (lines 100-650)
 * Total interfaces: 25+
 * Coverage: All trading, portfolio, ML, and monitoring types
 */

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface TradingConfig {
    symbol: string;
    symbols?: string[];
    timeframe: string;
    strategy: string;
    initialCapital: number;
    maxDrawdown: number;
    riskPerTrade: number;
    enableLiveTrading: boolean;
    enableAutoHedging: boolean;
    instanceId: string;
    healthCheckPort: number;
    prometheusPort: number;
    paperTrading?: boolean;
    enableWebSocket?: boolean;
    portfolioOptimizationEnabled?: boolean;
    rebalanceIntervalHours?: number;
    correlationThreshold?: number;
}

// ============================================================================
// MARKET DATA TYPES
// ============================================================================

export interface MarketData {
    symbol: string;
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface Candle {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface OHLCV {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// ============================================================================
// TRADING SIGNAL TYPES
// ============================================================================

export interface TradingSignal {
    symbol: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    price: number;
    timestamp: number;
    strategy: string;
    riskLevel: number;
    quantity?: number;
    reasoning?: string;
    metadata?: any;
    agreementPercent?: string;
}

export interface EnhancedStrategySignal {
    signal: 'buy' | 'sell' | 'hold';
    confidence: number;
    riskScore: number;
    reasoning: string;
    metadata?: any;
}

export interface MLPrediction {
    direction: 'up' | 'down' | 'neutral';
    confidence: number;
    features: any;
}

// ============================================================================
// PORTFOLIO TYPES
// ============================================================================

export interface PortfolioMetrics {
    totalValue: number;
    unrealizedPnL: number;
    realizedPnL: number;
    drawdown: number;
    sharpeRatio: number;
    winRate: number;
    totalTrades: number;
    successfulTrades: number;
    failedTrades: number;
    avgTradeReturn: number;
    maxDrawdownValue: number;
    mlLearningPhase?: 'WARMUP' | 'LEARNING' | 'AUTONOMOUS';
    mlConfidenceThreshold?: number;
    mlTradingCount?: number;
    mlAverageReward?: number;
    mlExplorationRate?: number;
    circuitBreakerTripped?: boolean;
    circuitBreakerTripCount?: number;
}

export interface PortfolioBalance {
    usdtBalance: number;
    btcBalance: number;
    totalValue: number;
    lockedInPositions: number;
}

export interface Position {
    symbol: string;
    side: 'LONG' | 'SHORT';
    entryPrice: number;
    quantity: number;
    entryTime: number;
    value: number;
}

// ============================================================================
// TRADE EXECUTION TYPES
// ============================================================================

export interface TradeExecution {
    id: string;
    timestamp: number;
    symbol: string;
    action: string;
    price: number;
    quantity: number;
    pnl: number;
    strategy: string;
    instanceId: string;
    executionTime: number;
    entryPrice?: number;
    fees?: number;
}

export interface Trade {
    id: string;
    timestamp: number;
    symbol: string;
    action: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    pnl: number;
    strategy: string;
    commission: number;
    status: 'FILLED' | 'PENDING' | 'CANCELLED';
}

// ============================================================================
// HEALTH & MONITORING TYPES
// ============================================================================

export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    lastUpdate: number;
    components: {
        database: boolean;
        strategies: boolean;
        monitoring: boolean;
        riskManager: boolean;
        portfolio: boolean;
        circuitBreaker: boolean;
    };
    metrics: PortfolioMetrics;
    version: string;
}

export interface CircuitBreaker {
    isTripped: boolean;
    consecutiveLosses: number;
    maxConsecutiveLosses: number;
    emergencyStopTriggered: boolean;
    lastResetTime: number;
    tripCount: number;
}

// ============================================================================
// BOT STATE TYPES
// ============================================================================

export interface BotState {
    currentPrice: number;
    lastPrice: number;
    priceChange: number;
    volume: number;
    timestamp: number;
    
    // Technical Indicators
    rsi?: number;
    macd?: {
        macd: number;
        signal: number;
        histogram: number;
    };
    bollingerBands?: {
        upper: number;
        middle: number;
        lower: number;
    };
    sma20?: number;
    sma50?: number;
    sma200?: number;
    ema?: number;
    atr?: number;
    
    // Portfolio State
    portfolioValue: number;
    cash: number;
    positions: Position[];
    
    // Market Context
    marketRegime?: 'bull' | 'bear' | 'sideways' | 'high_volatility';
    volatility?: number;
    trend?: 'up' | 'down' | 'neutral';
    
    // ML Predictions
    mlPrediction?: MLPrediction;
    ensemblePrediction?: any;
}

// ============================================================================
// TECHNICAL INDICATOR TYPES
// ============================================================================

export interface TechnicalIndicators {
    rsi: number;
    macd: {
        macd: number;
        signal: number;
        histogram: number;
    };
    bollingerBands: {
        upper: number;
        middle: number;
        lower: number;
    };
    sma20: number;
    sma50: number;
    sma200: number;
    ema: number;
    atr: number;
    volumeProfile?: number;
}

// ============================================================================
// ML & OPTIMIZATION TYPES
// ============================================================================

export interface MarketState {
    price: number;
    volume: number;
    volatility: number;
    trend: number;
    rsi: number;
    macd: number;
    indicators: TechnicalIndicators;
    historical_prices: number[];
    historical_volumes: number[];
    timestamp: number;
}

export interface EnsemblePrediction {
    direction: 'up' | 'down' | 'neutral';
    confidence: number;
    features: any;
    models_used: string[];
    voting_strategy: string;
}

export interface OptimizationResult {
    weights: Record<string, number>;
    expected_return: number;
    risk: number;
    sharpe: number;
    efficient_frontier?: any[];
}

// ============================================================================
// STRATEGY TYPES
// ============================================================================

export interface StrategyConfig {
    name: string;
    enabled: boolean;
    weight: number;
    parameters: Record<string, any>;
}

export interface StrategyPerformance {
    name: string;
    totalTrades: number;
    winRate: number;
    avgReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
}

// ============================================================================
// RISK MANAGEMENT TYPES
// ============================================================================

export interface RiskMetrics {
    var95: number;
    var99: number;
    cvar95: number;
    maxDrawdown: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
}

export interface KellyCriterion {
    optimalFraction: number;
    adjustedFraction: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    safetyFactor: number;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface PortfolioSnapshot {
    timestamp: number;
    total_value: number;
    unrealized_pnl: number;
    realized_pnl: number;
    drawdown: number;
    sharpe_ratio: number;
    win_rate: number;
    total_trades: number;
}

export interface DailyAnalytics {
    date: string;
    trades: number;
    pnl: number;
    winRate: number;
    bestTrade: number;
    worstTrade: number;
    avgTradeSize: number;
}

// ============================================================================
// WEBSOCKET TYPES
// ============================================================================

export interface WebSocketMessage {
    type: string;
    data: any;
    timestamp: number;
}

export interface MarketDataUpdate {
    exchange: string;
    symbol: string;
    price: number;
    volume: number;
    bid?: number;
    ask?: number;
    timestamp: number;
    type: 'ticker' | 'trade' | 'orderbook';
}

// ============================================================================
// API TYPES
// ============================================================================

export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: number;
}

export interface HealthCheckResponse {
    status: string;
    uptime: number;
    mode: string;
    version: string;
    components: Record<string, boolean>;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
    TradingConfig,
    MarketData,
    Candle,
    OHLCV,
    TradingSignal,
    EnhancedStrategySignal,
    MLPrediction,
    PortfolioMetrics,
    PortfolioBalance,
    Position,
    TradeExecution,
    Trade,
    HealthStatus,
    CircuitBreaker,
    BotState,
    TechnicalIndicators,
    MarketState,
    EnsemblePrediction,
    OptimizationResult,
    StrategyConfig,
    StrategyPerformance,
    RiskMetrics,
    KellyCriterion,
    PortfolioSnapshot,
    DailyAnalytics,
    WebSocketMessage,
    MarketDataUpdate,
    APIResponse,
    HealthCheckResponse
};

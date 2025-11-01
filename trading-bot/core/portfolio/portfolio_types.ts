/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 📊 ADVANCED PORTFOLIO MANAGEMENT TYPES
 * Definicje typów dla zaawansowanego zarządzania portfelem
 */

export interface Asset {
    symbol: string;
    name: string;
    type: 'CRYPTO' | 'STOCK' | 'FOREX' | 'COMMODITY';
    sector?: string;
    marketCap?: number;
    volatility: number;
    correlation?: Record<string, number>; // Correlation with other assets
    liquidity: 'HIGH' | 'MEDIUM' | 'LOW';
    tradingHours?: {
        start: string;
        end: string;
        timezone: string;
    };
}

export interface PortfolioPosition {
    asset: Asset;
    quantity: number;
    averageEntryPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
    realizedPnL: number;
    weight: number; // % of total portfolio
    targetWeight: number; // Desired % allocation
    lastRebalanced: Date;
    riskScore: number; // 1-10 risk assessment
    performanceMetrics: {
        totalReturn: number;
        dailyReturn: number;
        weeklyReturn: number;
        monthlyReturn: number;
        sharpeRatio: number;
        maxDrawdown: number;
        volatility: number;
    };
}

export interface PortfolioMetrics {
    totalValue: number;
    totalPnL: number;
    totalReturn: number;
    dailyReturn: number;
    sharpeRatio: number;
    sortino: number;
    maxDrawdown: number;
    volatility: number;
    beta: number;
    alpha: number;
    var95: number; // 95% Value at Risk
    cvar95: number; // 95% Conditional Value at Risk
    diversificationRatio: number;
    correlationMatrix: Record<string, Record<string, number>>;
    riskBudget: Record<string, number>;
    lastUpdated: Date;
}

export interface RiskLimits {
    maxPositionSize: number; // Max % of portfolio per position
    maxSectorExposure: number; // Max % per sector
    maxCorrelation: number; // Max allowed correlation between positions
    maxVaR: number; // Maximum Value at Risk
    maxDrawdown: number; // Maximum allowed drawdown
    maxVolatility: number; // Maximum portfolio volatility
    maxLeverage: number; // Maximum leverage ratio
    stopLossThreshold: number; // Auto stop-loss trigger
}

export interface AllocationStrategy {
    type: 'EQUAL_WEIGHT' | 'MARKET_CAP' | 'RISK_PARITY' | 'MOMENTUM' | 'MEAN_REVERSION' | 'CUSTOM';
    rebalanceFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
    rebalanceThreshold: number; // % deviation to trigger rebalance
    constraints: {
        minWeight: number; // Minimum allocation per asset
        maxWeight: number; // Maximum allocation per asset
        maxAssets: number; // Maximum number of assets
        allowShorts: boolean;
        allowLeverage: boolean;
    };
    customWeights?: Record<string, number>; // For CUSTOM strategy
}

export interface RebalancingAction {
    asset: Asset;
    currentWeight: number;
    targetWeight: number;
    action: 'BUY' | 'SELL' | 'HOLD';
    quantity: number;
    estimatedCost: number;
    priority: number; // 1-10, higher is more urgent
    reason: string;
}

export interface PortfolioOptimization {
    expectedReturns: Record<string, number>;
    covarianceMatrix: Record<string, Record<string, number>>;
    riskFreeRate: number;
    optimizationType: 'MAX_SHARPE' | 'MIN_VARIANCE' | 'MAX_RETURN' | 'RISK_PARITY' | 'MAX_DIVERSIFICATION' | 'BLACK_LITTERMAN';
    constraints: {
        weights: Record<string, { min: number; max: number }>;
        turnover?: number; // Maximum turnover
        transactionCosts?: number;
    };
    results: {
        optimalWeights: Record<string, number>;
        expectedReturn: number;
        expectedVolatility: number;
        sharpeRatio: number;
        efficiency: number;
    };
}

export interface MarketRegime {
    type: 'BULL' | 'BEAR' | 'SIDEWAYS' | 'HIGH_VOLATILITY' | 'LOW_VOLATILITY';
    confidence: number; // 0-1
    indicators: {
        trend: number; // -1 to 1
        volatility: number; // 0-1
        momentum: number; // -1 to 1
        sentiment: number; // -1 to 1
    };
    duration: number; // Days in current regime
    lastChanged: Date;
}

export interface DiversificationMetrics {
    herfindahlIndex: number; // Concentration measure
    effectiveNumberOfAssets: number;
    sectorDiversification: Record<string, number>;
    geographicDiversification: Record<string, number>;
    correlationDiversification: number;
    riskContribution: Record<string, number>;
}

export interface PortfolioEvent {
    type: 'REBALANCE' | 'POSITION_CHANGE' | 'RISK_BREACH' | 'PERFORMANCE_UPDATE' | 'REGIME_CHANGE';
    timestamp: Date;
    asset?: string;
    details: Record<string, any>;
    impact: {
        portfolioValue: number;
        risk: number;
        performance: number;
    };
}

export interface PortfolioConfig {
    name: string;
    strategy: AllocationStrategy;
    riskLimits: RiskLimits;
    assets: Asset[];
    baseCurrency: string;
    initialCapital: number;
    enableRebalancing: boolean;
    enableRiskManagement: boolean;
    enableOptimization: boolean;
    notifications: {
        rebalanceAlerts: boolean;
        riskAlerts: boolean;
        performanceAlerts: boolean;
    };
}

export type PortfolioEventHandler = (event: PortfolioEvent) => void | Promise<void>;
export type PositionSizer = (asset: Asset, signal: any, portfolio: PortfolioMetrics) => number;
export type RiskAssessor = (position: PortfolioPosition, portfolio: PortfolioMetrics) => number;

/**
 * 🚀 [PRODUCTION-API]
 * Production API component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
export type OrderType = 'market' | 'limit' | 'stop' | 'take_profit';
export type OrderStatus = 'open' | 'filled' | 'cancelled';
export type OrderDirection = 'buy' | 'sell';
export type PositionDirection = 'long' | 'short';

export type StrategyName = "RSITurbo" | "SuperTrend" | "MACrossover" | "MomentumConfirm" | "MomentumPro";

export interface Position {
    symbol: string;
    direction: PositionDirection;
    size: number;
    entryPrice: number;
    margin: number; // Depozyt zabezpieczający zablokowany dla tej pozycji
    timestamp: number;
    strategyId: string; // ID strategii, która otworzyła pozycję
    pnl?: number;
    orders: Order[]; // Zlecenia powiązane z tą pozycją
}

export interface BaseOrder {
    id: string;
    symbol: string;
    type: OrderType;
    side: OrderDirection;
    size: number;
    creationTime: number;
    status: OrderStatus;
    strategyId?: string;
}

export interface MarketOrder extends BaseOrder {
    type: 'market';
}

export interface LimitOrder extends BaseOrder {
    type: 'limit';
    price: number;
}

export interface StopLossOrder extends BaseOrder {
    type: 'stop';
    price: number;
}

export interface TakeProfitOrder extends BaseOrder {
    type: 'take_profit';
    price: number;
}

export type Order = (MarketOrder | LimitOrder | StopLossOrder | TakeProfitOrder) & {
    executedPrice?: number;
    executedAt?: number;
    pnl?: number;
    commission?: number;
};

export interface NewOrderRequest {
    symbol: string;
    type: OrderType;
    side: OrderDirection;
    size: number;
    limitPrice?: number;
    stopPrice?: number;
    takeProfit?: number;
    stopLoss?: number;
    strategyId?: string;
}

export interface Trade {
    strategy: string;
    action: 'open' | 'close';
    side: OrderDirection;
    ts: number;
    price: number;
    size: number;
    pnl: number | null;
    reason: string;
}

export * from './trade_signal';
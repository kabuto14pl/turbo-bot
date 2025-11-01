/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
export type OrderType = 'market' | 'limit' | 'stop' | 'take_profit';

// to, co podajemy do placeOrder(...)
export interface OrderRequest {
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop';
    quantity?: number;
    size?: number;      // Alternatywna nazwa dla quantity
    price?: number;      // required if type==='limit'
    stopPrice?: number;  // required if type==='stop'
    strategyId?: string;
    stopLoss?: number;   // for risk check
    takeProfit?: number; // optional
}

// pełny obiekt po stronie executora
export interface Order {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop';
    quantity: number;
    price?: number;
    stopPrice?: number;
    status: 'pending' | 'open' | 'filled' | 'cancelled';
    strategyId: string;
    executedPrice?: number;
    executionTime?: number;
    commission?: number;
    stopLoss?: number;
    takeProfit?: number;
    // Dodane brakujące pola
    size?: number;
    pnl?: number | null;
    executedAt?: number;
}

/**
 * Interfejs do tworzenia nowych zleceń przez strategie.
 */
export interface NewOrderRequest {
    symbol: string;
    type: OrderType;
    side: 'buy' | 'sell';
    size: number;
    limitPrice?: number; // Cena dla zleceń LIMIT
    stopPrice?: number; // Cena aktywacji dla zleceń STOP
    stopLoss?: number;
    takeProfit?: number;
    strategyId?: string; // ID strategii, która złożyła zlecenie
}

/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
export interface Position {
    symbol: string;
    direction: 'long' | 'short';
    size: number;
    quantity: number; // Alias for size for compatibility
    entryPrice: number;
    margin: number;
    timestamp: number;
    orders: any[];
    strategyId: string;
    stopLoss?: number;
    takeProfit?: number;
    trailingStop?: {
        activation: number;
        distance: number;
        lastUpdate: number;
    };
} 
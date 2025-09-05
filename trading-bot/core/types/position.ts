export interface Position {
    symbol: string;
    direction: 'long' | 'short';
    size: number;
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
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
export interface MarketData {
    symbol: string;
    volume24h: number;
    volatility24h: number;
    lastPrice: number;
    bidPrice: number;
    askPrice: number;
    spread: number;
    liquidity: number;
} 
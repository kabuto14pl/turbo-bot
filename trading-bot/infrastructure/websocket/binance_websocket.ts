/**
 * 🚀 TIER 2.4: Binance WebSocket Client
 * Real-time market data from Binance exchange
 * 
 * Channels:
 * - Trade stream (real-time trades)
 * - Ticker stream (24h stats)
 * - Depth stream (order book updates)
 * - Kline/candlestick stream
 */

import { WebSocketClientBase, WebSocketConfig, MarketDataUpdate } from './websocket_client_base';

export interface BinanceTradeData {
    e: string;      // Event type
    E: number;      // Event time
    s: string;      // Symbol
    t: number;      // Trade ID
    p: string;      // Price
    q: string;      // Quantity
    T: number;      // Trade time
    m: boolean;     // Is buyer maker
}

export interface BinanceTickerData {
    e: string;      // Event type
    E: number;      // Event time
    s: string;      // Symbol
    p: string;      // Price change
    P: string;      // Price change percent
    c: string;      // Last price
    Q: string;      // Last quantity
    o: string;      // Open price
    h: string;      // High price
    l: string;      // Low price
    v: string;      // Total traded volume
    q: string;      // Total traded quote volume
}

export interface BinanceDepthData {
    e: string;      // Event type
    E: number;      // Event time
    s: string;      // Symbol
    U: number;      // First update ID
    u: number;      // Final update ID
    b: string[][];  // Bids
    a: string[][];  // Asks
}

export class BinanceWebSocket extends WebSocketClientBase {
    private static readonly BASE_URL = 'wss://stream.binance.com:9443/ws';
    private static readonly TESTNET_URL = 'wss://testnet.binance.vision/ws';
    
    constructor(testnet: boolean = false) {
        const url = testnet ? BinanceWebSocket.TESTNET_URL : BinanceWebSocket.BASE_URL;
        
        super({
            url,
            reconnectDelay: 5000,
            maxReconnectAttempts: 10,
            heartbeatInterval: 60000, // Binance requires ping every 3 minutes
            connectionTimeout: 10000,
            rateLimit: 5 // Binance allows 5 messages/second
        });
    }

    protected getExchangeName(): string {
        return 'Binance';
    }

    protected onConnected(): void {
        console.log(`✅ [BINANCE] WebSocket connected successfully`);
    }

    protected onMessage(data: any): void {
        try {
            const message = JSON.parse(data.toString());
            
            // Handle different message types
            if (message.e === 'trade') {
                this.handleTradeUpdate(message as BinanceTradeData);
            } else if (message.e === '24hrTicker') {
                this.handleTickerUpdate(message as BinanceTickerData);
            } else if (message.e === 'depthUpdate') {
                this.handleDepthUpdate(message as BinanceDepthData);
            } else if (message.e === 'kline') {
                this.handleKlineUpdate(message);
            } else {
                // Generic message
                this.emit('message', message);
            }
            
        } catch (error: any) {
            console.error(`❌ [BINANCE] Message parse error:`, error.message);
        }
    }

    protected buildSubscribeMessage(channel: string, symbol: string): any {
        // Binance uses stream names in lowercase
        const streamSymbol = symbol.toLowerCase();
        
        let streamName: string;
        switch (channel) {
            case 'trade':
                streamName = `${streamSymbol}@trade`;
                break;
            case 'ticker':
                streamName = `${streamSymbol}@ticker`;
                break;
            case 'depth':
                streamName = `${streamSymbol}@depth`;
                break;
            case 'kline':
                streamName = `${streamSymbol}@kline_1m`;
                break;
            default:
                throw new Error(`Unknown channel: ${channel}`);
        }

        return {
            method: 'SUBSCRIBE',
            params: [streamName],
            id: Date.now()
        };
    }

    protected buildUnsubscribeMessage(channel: string, symbol: string): any {
        const streamSymbol = symbol.toLowerCase();
        
        let streamName: string;
        switch (channel) {
            case 'trade':
                streamName = `${streamSymbol}@trade`;
                break;
            case 'ticker':
                streamName = `${streamSymbol}@ticker`;
                break;
            case 'depth':
                streamName = `${streamSymbol}@depth`;
                break;
            case 'kline':
                streamName = `${streamSymbol}@kline_1m`;
                break;
            default:
                throw new Error(`Unknown channel: ${channel}`);
        }

        return {
            method: 'UNSUBSCRIBE',
            params: [streamName],
            id: Date.now()
        };
    }

    protected buildPingMessage(): any | null {
        // Binance doesn't require custom ping - uses WebSocket ping/pong
        return null;
    }

    protected parseMarketData(data: any): MarketDataUpdate | null {
        try {
            if (data.e === 'trade') {
                return {
                    exchange: 'binance',
                    symbol: data.s,
                    timestamp: data.T,
                    price: parseFloat(data.p),
                    volume: parseFloat(data.q),
                    type: 'trade',
                    raw: data
                };
            } else if (data.e === '24hrTicker') {
                return {
                    exchange: 'binance',
                    symbol: data.s,
                    timestamp: data.E,
                    price: parseFloat(data.c),
                    volume: parseFloat(data.v),
                    bid: parseFloat(data.b),
                    ask: parseFloat(data.a),
                    type: 'ticker',
                    raw: data
                };
            } else if (data.e === 'depthUpdate') {
                const bestBid = data.b.length > 0 ? parseFloat(data.b[0][0]) : 0;
                const bestAsk = data.a.length > 0 ? parseFloat(data.a[0][0]) : 0;
                
                return {
                    exchange: 'binance',
                    symbol: data.s,
                    timestamp: data.E,
                    price: (bestBid + bestAsk) / 2,
                    bid: bestBid,
                    ask: bestAsk,
                    type: 'orderbook',
                    raw: data
                };
            }
            
            return null;
        } catch (error: any) {
            console.error(`❌ [BINANCE] Parse error:`, error.message);
            return null;
        }
    }

    /**
     * Handle trade updates
     */
    private handleTradeUpdate(data: BinanceTradeData): void {
        const marketData = this.parseMarketData(data);
        if (marketData) {
            this.emit('trade', marketData);
            this.emit('marketData', marketData);
        }
    }

    /**
     * Handle ticker updates
     */
    private handleTickerUpdate(data: BinanceTickerData): void {
        const marketData = this.parseMarketData(data);
        if (marketData) {
            this.emit('ticker', marketData);
            this.emit('marketData', marketData);
        }
    }

    /**
     * Handle depth/orderbook updates
     */
    private handleDepthUpdate(data: BinanceDepthData): void {
        const marketData = this.parseMarketData(data);
        if (marketData) {
            this.emit('depth', marketData);
            this.emit('marketData', marketData);
        }
    }

    /**
     * Handle kline/candlestick updates
     */
    private handleKlineUpdate(data: any): void {
        this.emit('kline', data);
    }

    /**
     * Subscribe to ticker (24h stats)
     */
    public async subscribeTicker(symbol: string): Promise<void> {
        return this.subscribe('ticker', symbol);
    }

    /**
     * Subscribe to trade stream
     */
    public async subscribeTrades(symbol: string): Promise<void> {
        return this.subscribe('trade', symbol);
    }

    /**
     * Subscribe to order book depth
     */
    public async subscribeDepth(symbol: string): Promise<void> {
        return this.subscribe('depth', symbol);
    }

    /**
     * Subscribe to kline/candlestick
     */
    public async subscribeKline(symbol: string): Promise<void> {
        return this.subscribe('kline', symbol);
    }
}

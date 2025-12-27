/**
 * 🚀 TIER 2.4: OKX WebSocket Client
 * Real-time market data from OKX exchange
 * 
 * Channels:
 * - Trades channel
 * - Tickers channel
 * - Order books channel
 * - Candles channel
 */

import { WebSocketClientBase, WebSocketConfig, MarketDataUpdate } from './websocket_client_base';

export interface OKXTradeData {
    instId: string;
    tradeId: string;
    px: string;         // Price
    sz: string;         // Size
    side: string;       // buy/sell
    ts: string;         // Timestamp
}

export interface OKXTickerData {
    instId: string;
    last: string;       // Last price
    lastSz: string;     // Last size
    askPx: string;      // Best ask
    askSz: string;      // Best ask size
    bidPx: string;      // Best bid
    bidSz: string;      // Best bid size
    open24h: string;    // 24h open
    high24h: string;    // 24h high
    low24h: string;     // 24h low
    vol24h: string;     // 24h volume
    ts: string;         // Timestamp
}

export interface OKXDepthData {
    asks: string[][];   // [[price, size, deprecated, orders]]
    bids: string[][];   // [[price, size, deprecated, orders]]
    ts: string;         // Timestamp
}

export class OKXWebSocket extends WebSocketClientBase {
    private static readonly BASE_URL = 'wss://ws.okx.com:8443/ws/v5/public';
    private static readonly TESTNET_URL = 'wss://wspap.okx.com:8443/ws/v5/public?brokerId=9999';
    
    constructor(testnet: boolean = false) {
        const url = testnet ? OKXWebSocket.TESTNET_URL : OKXWebSocket.BASE_URL;
        
        super({
            url,
            reconnectDelay: 5000,
            maxReconnectAttempts: 10,
            heartbeatInterval: 25000, // OKX requires ping every 30 seconds
            connectionTimeout: 10000,
            rateLimit: 10 // OKX allows 10 messages/second
        });
    }

    protected getExchangeName(): string {
        return 'OKX';
    }

    protected onConnected(): void {
        console.log(`✅ [OKX] WebSocket connected successfully`);
    }

    protected onMessage(data: any): void {
        try {
            const message = JSON.parse(data.toString());
            
            // Handle pong response
            if (message.event === 'pong') {
                this.emit('pong');
                return;
            }

            // Handle subscription confirmation
            if (message.event === 'subscribe') {
                console.log(`✅ [OKX] Subscribed to ${message.arg?.channel}`);
                return;
            }

            // Handle error
            if (message.event === 'error') {
                console.error(`❌ [OKX] Error:`, message);
                this.emit('error', new Error(message.msg));
                return;
            }

            // Handle data updates
            if (message.data && message.arg) {
                const channel = message.arg.channel;
                const data = message.data[0]; // OKX sends array of data
                
                switch (channel) {
                    case 'trades':
                        this.handleTradeUpdate(data, message.arg.instId);
                        break;
                    case 'tickers':
                        this.handleTickerUpdate(data);
                        break;
                    case 'books':
                    case 'books5':
                        this.handleDepthUpdate(data, message.arg.instId);
                        break;
                    case 'candle1m':
                    case 'candle5m':
                        this.handleCandleUpdate(data, message.arg.instId);
                        break;
                    default:
                        this.emit('message', message);
                }
            }
            
        } catch (error: any) {
            console.error(`❌ [OKX] Message parse error:`, error.message);
        }
    }

    protected buildSubscribeMessage(channel: string, symbol: string): any {
        // OKX uses instId format (e.g., BTC-USDT)
        const instId = this.formatSymbol(symbol);
        
        let channelName: string;
        switch (channel) {
            case 'trade':
                channelName = 'trades';
                break;
            case 'ticker':
                channelName = 'tickers';
                break;
            case 'depth':
                channelName = 'books5'; // Top 5 levels
                break;
            case 'kline':
                channelName = 'candle1m';
                break;
            default:
                throw new Error(`Unknown channel: ${channel}`);
        }

        return {
            op: 'subscribe',
            args: [{
                channel: channelName,
                instId: instId
            }]
        };
    }

    protected buildUnsubscribeMessage(channel: string, symbol: string): any {
        const instId = this.formatSymbol(symbol);
        
        let channelName: string;
        switch (channel) {
            case 'trade':
                channelName = 'trades';
                break;
            case 'ticker':
                channelName = 'tickers';
                break;
            case 'depth':
                channelName = 'books5';
                break;
            case 'kline':
                channelName = 'candle1m';
                break;
            default:
                throw new Error(`Unknown channel: ${channel}`);
        }

        return {
            op: 'unsubscribe',
            args: [{
                channel: channelName,
                instId: instId
            }]
        };
    }

    protected buildPingMessage(): any {
        return 'ping'; // OKX uses simple string ping
    }

    protected parseMarketData(data: any): MarketDataUpdate | null {
        try {
            // Parse based on data structure
            if (data.tradeId) {
                // Trade data
                return {
                    exchange: 'okx',
                    symbol: data.instId,
                    timestamp: parseInt(data.ts),
                    price: parseFloat(data.px),
                    volume: parseFloat(data.sz),
                    type: 'trade',
                    raw: data
                };
            } else if (data.last) {
                // Ticker data
                return {
                    exchange: 'okx',
                    symbol: data.instId,
                    timestamp: parseInt(data.ts),
                    price: parseFloat(data.last),
                    volume: parseFloat(data.vol24h),
                    bid: parseFloat(data.bidPx),
                    ask: parseFloat(data.askPx),
                    type: 'ticker',
                    raw: data
                };
            } else if (data.asks && data.bids) {
                // Depth data
                const bestBid = data.bids.length > 0 ? parseFloat(data.bids[0][0]) : 0;
                const bestAsk = data.asks.length > 0 ? parseFloat(data.asks[0][0]) : 0;
                
                return {
                    exchange: 'okx',
                    symbol: data.instId || 'UNKNOWN',
                    timestamp: parseInt(data.ts),
                    price: (bestBid + bestAsk) / 2,
                    bid: bestBid,
                    ask: bestAsk,
                    type: 'orderbook',
                    raw: data
                };
            }
            
            return null;
        } catch (error: any) {
            console.error(`❌ [OKX] Parse error:`, error.message);
            return null;
        }
    }

    /**
     * Format symbol to OKX instId format (BTC-USDT)
     */
    private formatSymbol(symbol: string): string {
        // Convert BTCUSDT to BTC-USDT
        if (symbol.includes('-')) {
            return symbol;
        }
        
        // Assume last 4 chars are quote currency (USDT)
        if (symbol.endsWith('USDT')) {
            const base = symbol.slice(0, -4);
            return `${base}-USDT`;
        }
        
        return symbol;
    }

    /**
     * Handle trade updates
     */
    private handleTradeUpdate(data: OKXTradeData, instId: string): void {
        const marketData = this.parseMarketData({ ...data, instId });
        if (marketData) {
            this.emit('trade', marketData);
            this.emit('marketData', marketData);
        }
    }

    /**
     * Handle ticker updates
     */
    private handleTickerUpdate(data: OKXTickerData): void {
        const marketData = this.parseMarketData(data);
        if (marketData) {
            this.emit('ticker', marketData);
            this.emit('marketData', marketData);
        }
    }

    /**
     * Handle depth/orderbook updates
     */
    private handleDepthUpdate(data: OKXDepthData, instId: string): void {
        const marketData = this.parseMarketData({ ...data, instId });
        if (marketData) {
            this.emit('depth', marketData);
            this.emit('marketData', marketData);
        }
    }

    /**
     * Handle candle updates
     */
    private handleCandleUpdate(data: any, instId: string): void {
        this.emit('candle', { ...data, instId });
    }

    /**
     * Subscribe to ticker
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

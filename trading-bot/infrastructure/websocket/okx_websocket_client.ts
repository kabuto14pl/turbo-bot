/**
 * 🌐 OKX WebSocket Client
 * Real-time market data from OKX exchange
 * 
 * Features:
 * - Ticker channel (best bid/ask, 24h volume)
 * - Trades channel (real-time executions)
 * - Orderbook channel (L2 depth)
 * - Auto-reconnection with subscription recovery
 * - <200ms latency target
 * - Fallback to REST API on disconnection
 * 
 * @author Enterprise Trading Team
 * @date December 9, 2025
 */

import { WebSocketClientBase, WebSocketConfig, MarketDataUpdate } from './websocket_client_base';
import WebSocket from 'ws';

export interface OKXTickerData {
    instId: string;      // Instrument ID (e.g., "BTC-USDT")
    last: string;        // Last traded price
    lastSz: string;      // Last traded size
    askPx: string;       // Best ask price
    askSz: string;       // Best ask size
    bidPx: string;       // Best bid price
    bidSz: string;       // Best bid size
    open24h: string;     // 24h open price
    high24h: string;     // 24h high
    low24h: string;      // 24h low
    volCcy24h: string;   // 24h volume in currency
    vol24h: string;      // 24h volume in contracts
    ts: string;          // Timestamp
}

export interface OKXTradeData {
    instId: string;
    tradeId: string;
    px: string;          // Price
    sz: string;          // Size
    side: 'buy' | 'sell';
    ts: string;
}

export interface OKXOrderbookData {
    instId: string;
    asks: [string, string, string, string][]; // [price, size, liquidation_orders, order_count]
    bids: [string, string, string, string][];
    ts: string;
}

export interface OKXSubscribeRequest {
    op: 'subscribe' | 'unsubscribe';
    args: Array<{
        channel: string;
        instId: string;
    }>;
}

export interface OKXWebSocketMessage {
    event?: string;
    arg?: {
        channel: string;
        instId: string;
    };
    data?: any[];
    code?: string;
    msg?: string;
}

export class OKXWebSocketClient extends WebSocketClientBase {
    private static readonly WS_URL_PUBLIC = 'wss://ws.okx.com:8443/ws/v5/public';
    private static readonly WS_URL_PRIVATE = 'wss://ws.okx.com:8443/ws/v5/private';
    
    private symbols: string[] = [];
    private channels: Set<string> = new Set();
    private lastTickerUpdate: Map<string, OKXTickerData> = new Map();
    private lastTradeUpdate: Map<string, OKXTradeData> = new Map();
    private lastOrderbookUpdate: Map<string, OKXOrderbookData> = new Map();

    constructor(config: Partial<WebSocketConfig> & { symbols: string[] }) {
        super({
            url: OKXWebSocketClient.WS_URL_PUBLIC,
            reconnectDelay: 5000,
            maxReconnectAttempts: 10,
            heartbeatInterval: 25000, // OKX requires ping every 30s
            connectionTimeout: 10000,
            rateLimit: 10,
            ...config
        });

        this.symbols = config.symbols;
    }

    protected getExchangeName(): string {
        return 'OKX';
    }

    /**
     * Called when WebSocket connection is established
     */
    protected onConnected(): void {
        console.log(`✅ [OKX WS] Connected to public feed`);
        
        // Subscribe to all configured symbols and channels
        this.resubscribeAll();
    }

    /**
     * Handle incoming WebSocket messages
     */
    protected onMessage(data: WebSocket.Data): void {
        try {
            const message: OKXWebSocketMessage = JSON.parse(data.toString());

            // Handle connection events
            if (message.event === 'subscribe') {
                console.log(`✅ [OKX WS] Subscribed to ${message.arg?.channel} ${message.arg?.instId}`);
                return;
            }

            if (message.event === 'unsubscribe') {
                console.log(`📤 [OKX WS] Unsubscribed from ${message.arg?.channel} ${message.arg?.instId}`);
                return;
            }

            if (message.event === 'error') {
                console.error(`❌ [OKX WS] Error: ${message.msg} (code: ${message.code})`);
                this.emit('error', new Error(message.msg));
                return;
            }

            // Handle data updates
            if (message.data && message.arg) {
                const { channel, instId } = message.arg;

                switch (channel) {
                    case 'tickers':
                        this.handleTickerUpdate(instId, message.data[0]);
                        break;
                    case 'trades':
                        this.handleTradeUpdate(instId, message.data);
                        break;
                    case 'books5':
                    case 'books':
                        this.handleOrderbookUpdate(instId, message.data[0]);
                        break;
                    default:
                        console.warn(`⚠️ [OKX WS] Unknown channel: ${channel}`);
                }
            }

        } catch (error: any) {
            console.error(`❌ [OKX WS] Failed to parse message:`, error.message);
        }
    }

    /**
     * Handle ticker updates (best bid/ask, 24h stats)
     */
    private handleTickerUpdate(instId: string, data: OKXTickerData): void {
        this.lastTickerUpdate.set(instId, data);

        const update: MarketDataUpdate = {
            exchange: 'OKX',
            symbol: instId,
            timestamp: parseInt(data.ts),
            price: parseFloat(data.last),
            volume: parseFloat(data.vol24h),
            bid: parseFloat(data.bidPx),
            ask: parseFloat(data.askPx),
            type: 'ticker',
            raw: data
        };

        this.emit('ticker', update);
        this.emit('marketData', update);
    }

    /**
     * Handle trade updates (real-time executions)
     */
    private handleTradeUpdate(instId: string, trades: OKXTradeData[]): void {
        for (const trade of trades) {
            this.lastTradeUpdate.set(instId, trade);

            const update: MarketDataUpdate = {
                exchange: 'OKX',
                symbol: instId,
                timestamp: parseInt(trade.ts),
                price: parseFloat(trade.px),
                volume: parseFloat(trade.sz),
                type: 'trade',
                raw: trade
            };

            this.emit('trade', update);
            this.emit('marketData', update);
        }
    }

    /**
     * Handle orderbook updates (L2 depth)
     */
    private handleOrderbookUpdate(instId: string, data: OKXOrderbookData): void {
        this.lastOrderbookUpdate.set(instId, data);

        const update: MarketDataUpdate = {
            exchange: 'OKX',
            symbol: instId,
            timestamp: parseInt(data.ts),
            price: data.bids.length > 0 ? parseFloat(data.bids[0][0]) : 0,
            bid: data.bids.length > 0 ? parseFloat(data.bids[0][0]) : undefined,
            ask: data.asks.length > 0 ? parseFloat(data.asks[0][0]) : undefined,
            type: 'orderbook',
            raw: data
        };

        this.emit('orderbook', update);
        this.emit('marketData', update);
    }

    /**
     * Subscribe to ticker channel for symbol
     */
    public subscribeTicker(symbol: string): void {
        this.subscribeToChannel('tickers', symbol);
    }

    /**
     * Subscribe to trades channel for symbol
     */
    public subscribeTrades(symbol: string): void {
        this.subscribeToChannel('trades', symbol);
    }

    /**
     * Subscribe to orderbook channel for symbol
     */
    public subscribeOrderbook(symbol: string, depth: 5 | 400 = 5): void {
        const channel = depth === 5 ? 'books5' : 'books';
        this.subscribeToChannel(channel, symbol);
    }

    /**
     * Generic subscribe method (internal use)
     */
    private subscribeToChannel(channel: string, instId: string): void {
        if (!this.status.connected) {
            console.warn(`⚠️ [OKX WS] Not connected, queueing subscription: ${channel} ${instId}`);
            this.channels.add(`${channel}:${instId}`);
            return;
        }

        const request: OKXSubscribeRequest = {
            op: 'subscribe',
            args: [{
                channel,
                instId
            }]
        };

        this.send(request);
        this.channels.add(`${channel}:${instId}`);
        console.log(`📡 [OKX WS] Subscribing to ${channel} ${instId}`);
    }

    /**
     * Unsubscribe from channel (internal use)
     */
    private unsubscribeFromChannel(channel: string, instId: string): void {
        if (!this.status.connected) {
            console.warn(`⚠️ [OKX WS] Not connected, cannot unsubscribe`);
            return;
        }

        const request: OKXSubscribeRequest = {
            op: 'unsubscribe',
            args: [{
                channel,
                instId
            }]
        };

        this.send(request);
        this.channels.delete(`${channel}:${instId}`);
        console.log(`📤 [OKX WS] Unsubscribing from ${channel} ${instId}`);
    }

    /**
     * Resubscribe to all channels (after reconnection)
     */
    private resubscribeAll(): void {
        console.log(`🔄 [OKX WS] Resubscribing to ${this.channels.size} channels...`);

        for (const channelKey of this.channels) {
            const [channel, instId] = channelKey.split(':');
            
            const request: OKXSubscribeRequest = {
                op: 'subscribe',
                args: [{
                    channel,
                    instId
                }]
            };

            this.send(request);
        }
    }

    /**
     * Send message to WebSocket server
     */
    private send(data: any): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn(`⚠️ [OKX WS] Cannot send, connection not open`);
            return;
        }

        try {
            this.ws.send(JSON.stringify(data));
            this.status.messagesSent++;
        } catch (error: any) {
            console.error(`❌ [OKX WS] Send failed:`, error.message);
        }
    }

    /**
     * Get latest ticker data for symbol
     */
    public getLatestTicker(symbol: string): OKXTickerData | undefined {
        return this.lastTickerUpdate.get(symbol);
    }

    /**
     * Get latest trade for symbol
     */
    public getLatestTrade(symbol: string): OKXTradeData | undefined {
        return this.lastTradeUpdate.get(symbol);
    }

    /**
     * Get latest orderbook for symbol
     */
    public getLatestOrderbook(symbol: string): OKXOrderbookData | undefined {
        return this.lastOrderbookUpdate.get(symbol);
    }

    /**
     * Get connection statistics
     */
    public getStats(): {
        connected: boolean;
        lastConnected?: number;
        lastDisconnected?: number;
        reconnectAttempts: number;
        messagesReceived: number;
        messagesSent: number;
        latency?: number;
        tickerUpdates: number;
        tradeUpdates: number;
        orderbookUpdates: number;
    } {
        return {
            ...this.status,
            tickerUpdates: this.lastTickerUpdate.size,
            tradeUpdates: this.lastTradeUpdate.size,
            orderbookUpdates: this.lastOrderbookUpdate.size
        };
    }

    /**
     * Custom ping for OKX (uses 'ping' string)
     */
    protected sendHeartbeat(): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send('ping');
            this.lastPingTime = Date.now();
        }
    }
    
    // ========================================================================
    // ABSTRACT METHODS IMPLEMENTATION
    // ========================================================================
    
    /**
     * Build subscribe message for OKX
     */
    protected buildSubscribeMessage(channel: string, symbol: string): any {
        return {
            op: 'subscribe',
            args: [{
                channel,
                instId: symbol
            }]
        };
    }
    
    /**
     * Build unsubscribe message for OKX
     */
    protected buildUnsubscribeMessage(channel: string, symbol: string): any {
        return {
            op: 'unsubscribe',
            args: [{
                channel,
                instId: symbol
            }]
        };
    }
    
    /**
     * Build ping message (OKX uses string 'ping')
     */
    protected buildPingMessage(): any | null {
        return 'ping';
    }
    
    /**
     * Parse market data update (handled in onMessage, return null for generic)
     */
    protected parseMarketData(data: any): MarketDataUpdate | null {
        // Market data parsing is done in specific handlers (handleTickerUpdate, etc.)
        // This method satisfies abstract requirement but delegates to specialized methods
        return null;
    }
}

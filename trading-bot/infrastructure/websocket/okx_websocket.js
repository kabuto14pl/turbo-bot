"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OKXWebSocket = void 0;
const websocket_client_base_1 = require("./websocket_client_base");
class OKXWebSocket extends websocket_client_base_1.WebSocketClientBase {
    constructor(testnet = false) {
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
    getExchangeName() {
        return 'OKX';
    }
    onConnected() {
        console.log(`✅ [OKX] WebSocket connected successfully`);
    }
    onMessage(data) {
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
        }
        catch (error) {
            console.error(`❌ [OKX] Message parse error:`, error.message);
        }
    }
    buildSubscribeMessage(channel, symbol) {
        // OKX uses instId format (e.g., BTC-USDT)
        const instId = this.formatSymbol(symbol);
        let channelName;
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
    buildUnsubscribeMessage(channel, symbol) {
        const instId = this.formatSymbol(symbol);
        let channelName;
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
    buildPingMessage() {
        return 'ping'; // OKX uses simple string ping
    }
    parseMarketData(data) {
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
            }
            else if (data.last) {
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
            }
            else if (data.asks && data.bids) {
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
        }
        catch (error) {
            console.error(`❌ [OKX] Parse error:`, error.message);
            return null;
        }
    }
    /**
     * Format symbol to OKX instId format (BTC-USDT)
     */
    formatSymbol(symbol) {
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
    handleTradeUpdate(data, instId) {
        const marketData = this.parseMarketData({ ...data, instId });
        if (marketData) {
            this.emit('trade', marketData);
            this.emit('marketData', marketData);
        }
    }
    /**
     * Handle ticker updates
     */
    handleTickerUpdate(data) {
        const marketData = this.parseMarketData(data);
        if (marketData) {
            this.emit('ticker', marketData);
            this.emit('marketData', marketData);
        }
    }
    /**
     * Handle depth/orderbook updates
     */
    handleDepthUpdate(data, instId) {
        const marketData = this.parseMarketData({ ...data, instId });
        if (marketData) {
            this.emit('depth', marketData);
            this.emit('marketData', marketData);
        }
    }
    /**
     * Handle candle updates
     */
    handleCandleUpdate(data, instId) {
        this.emit('candle', { ...data, instId });
    }
    /**
     * Subscribe to ticker
     */
    async subscribeTicker(symbol) {
        return this.subscribe('ticker', symbol);
    }
    /**
     * Subscribe to trade stream
     */
    async subscribeTrades(symbol) {
        return this.subscribe('trade', symbol);
    }
    /**
     * Subscribe to order book depth
     */
    async subscribeDepth(symbol) {
        return this.subscribe('depth', symbol);
    }
    /**
     * Subscribe to kline/candlestick
     */
    async subscribeKline(symbol) {
        return this.subscribe('kline', symbol);
    }
}
exports.OKXWebSocket = OKXWebSocket;
OKXWebSocket.BASE_URL = 'wss://ws.okx.com:8443/ws/v5/public';
OKXWebSocket.TESTNET_URL = 'wss://wspap.okx.com:8443/ws/v5/public?brokerId=9999';

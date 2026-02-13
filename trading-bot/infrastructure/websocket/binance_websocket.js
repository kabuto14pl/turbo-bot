"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinanceWebSocket = void 0;
const websocket_client_base_1 = require("./websocket_client_base");
class BinanceWebSocket extends websocket_client_base_1.WebSocketClientBase {
    constructor(testnet = false) {
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
    getExchangeName() {
        return 'Binance';
    }
    onConnected() {
        console.log(`✅ [BINANCE] WebSocket connected successfully`);
    }
    onMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            // Handle different message types
            if (message.e === 'trade') {
                this.handleTradeUpdate(message);
            }
            else if (message.e === '24hrTicker') {
                this.handleTickerUpdate(message);
            }
            else if (message.e === 'depthUpdate') {
                this.handleDepthUpdate(message);
            }
            else if (message.e === 'kline') {
                this.handleKlineUpdate(message);
            }
            else {
                // Generic message
                this.emit('message', message);
            }
        }
        catch (error) {
            console.error(`❌ [BINANCE] Message parse error:`, error.message);
        }
    }
    buildSubscribeMessage(channel, symbol) {
        // Binance uses stream names in lowercase
        const streamSymbol = symbol.toLowerCase();
        let streamName;
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
    buildUnsubscribeMessage(channel, symbol) {
        const streamSymbol = symbol.toLowerCase();
        let streamName;
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
    buildPingMessage() {
        // Binance doesn't require custom ping - uses WebSocket ping/pong
        return null;
    }
    parseMarketData(data) {
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
            }
            else if (data.e === '24hrTicker') {
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
            }
            else if (data.e === 'depthUpdate') {
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
        }
        catch (error) {
            console.error(`❌ [BINANCE] Parse error:`, error.message);
            return null;
        }
    }
    /**
     * Handle trade updates
     */
    handleTradeUpdate(data) {
        const marketData = this.parseMarketData(data);
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
    handleDepthUpdate(data) {
        const marketData = this.parseMarketData(data);
        if (marketData) {
            this.emit('depth', marketData);
            this.emit('marketData', marketData);
        }
    }
    /**
     * Handle kline/candlestick updates
     */
    handleKlineUpdate(data) {
        this.emit('kline', data);
    }
    /**
     * Subscribe to ticker (24h stats)
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
exports.BinanceWebSocket = BinanceWebSocket;
BinanceWebSocket.BASE_URL = 'wss://stream.binance.com:9443/ws';
BinanceWebSocket.TESTNET_URL = 'wss://testnet.binance.vision/ws';

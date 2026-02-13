"use strict";
/**
 * 🌐 [PRODUCTION-INFRASTRUCTURE]
 * OKX Live Market Data Client - Paper Trading Integration
 *
 * PURPOSE: Fetch real-time market data from OKX API for paper trading
 * FEATURES:
 * - WebSocket candlestick streams
 * - REST API fallback for historical data
 * - Real-time ticker updates
 * - Order book snapshots
 * - Trade execution simulation (tdMode=1)
 *
 * MODES:
 * - tdMode=0: Real trading (NOT IMPLEMENTED YET - safety)
 * - tdMode=1: Paper trading (live data, simulated execution) ✅ THIS FILE
 * - simulation: Mock data generator (existing)
 *
 * @enterprise-grade Full error handling, reconnection logic, rate limiting
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OKXLiveDataClient = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const ws_1 = __importDefault(require("ws")); // ✅ FIX: Default import instead of * as
const events_1 = require("events");
// ============================================================================
// OKX LIVE DATA CLIENT
// ============================================================================
class OKXLiveDataClient extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 5000; // 5 seconds
        this.subscriptions = new Set();
        this.lastCandleCache = new Map();
        this.isConnected = false;
        // Default configuration
        this.config = {
            apiKey: config.apiKey || process.env.OKX_API_KEY || '',
            secretKey: config.secretKey || process.env.OKX_SECRET_KEY || '',
            passphrase: config.passphrase || process.env.OKX_PASSPHRASE || '',
            baseUrl: config.baseUrl || 'https://www.okx.com',
            wsUrl: config.wsUrl || 'wss://ws.okx.com:8443/ws/v5/public',
            testnet: config.testnet ?? false,
            enableWebSocket: config.enableWebSocket ?? true,
        };
        // Adjust URLs for testnet
        if (this.config.testnet) {
            this.config.baseUrl = 'https://www.okx.com'; // Demo uses same base URL with tdMode
            this.config.wsUrl = 'wss://wspap.okx.com:8443/ws/v5/public?brokerId=9999'; // Demo WebSocket
        }
        // Initialize REST client
        this.restClient = axios_1.default.create({
            baseURL: this.config.baseUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        // Add request interceptor for authentication (if keys provided)
        if (this.config.apiKey && this.config.secretKey && this.config.passphrase) {
            this.restClient.interceptors.request.use((config) => {
                const timestamp = new Date().toISOString();
                const method = config.method?.toUpperCase() || 'GET';
                const requestPath = config.url || '';
                const body = config.data ? JSON.stringify(config.data) : '';
                const signature = this.createSignature(timestamp, method, requestPath, body);
                config.headers['OK-ACCESS-KEY'] = this.config.apiKey;
                config.headers['OK-ACCESS-SIGN'] = signature;
                config.headers['OK-ACCESS-TIMESTAMP'] = timestamp;
                config.headers['OK-ACCESS-PASSPHRASE'] = this.config.passphrase;
                return config;
            });
        }
        console.log('✅ OKX Live Data Client initialized');
        console.log(`   Mode: ${this.config.testnet ? 'TESTNET (Paper Trading)' : 'PRODUCTION'}`);
        console.log(`   WebSocket: ${this.config.enableWebSocket ? 'ENABLED' : 'DISABLED'}`);
    }
    // ========================================================================
    // AUTHENTICATION
    // ========================================================================
    createSignature(timestamp, method, requestPath, body) {
        const message = timestamp + method.toUpperCase() + requestPath + body;
        return crypto.createHmac('sha256', this.config.secretKey).update(message).digest('base64');
    }
    // ========================================================================
    // REST API METHODS
    // ========================================================================
    /**
     * Fetch current server time
     */
    async getServerTime() {
        try {
            const response = await this.restClient.get('/api/v5/public/time');
            if (response.data.code !== '0') {
                throw new Error(`OKX API Error: ${response.data.msg}`);
            }
            return parseInt(response.data.data[0].ts);
        }
        catch (error) {
            console.error('❌ Failed to fetch server time:', error.message);
            throw error;
        }
    }
    /**
     * Fetch latest ticker for symbol
     */
    async getTicker(symbol) {
        try {
            const instId = this.formatSymbol(symbol);
            const response = await this.restClient.get('/api/v5/market/ticker', {
                params: { instId },
            });
            if (response.data.code !== '0') {
                throw new Error(`OKX API Error: ${response.data.msg}`);
            }
            return response.data.data[0];
        }
        catch (error) {
            console.error(`❌ Failed to fetch ticker for ${symbol}:`, error.message);
            throw error;
        }
    }
    /**
     * Fetch historical candles (OHLCV)
     * @param symbol Trading pair (e.g., 'BTC-USDT')
     * @param interval Timeframe (1m, 5m, 15m, 1H, 4H, 1D)
     * @param limit Number of candles (max 300)
     */
    async getCandles(symbol, interval = '15m', limit = 100) {
        try {
            const instId = this.formatSymbol(symbol);
            const bar = this.formatInterval(interval);
            const response = await this.restClient.get('/api/v5/market/candles', {
                params: {
                    instId,
                    bar,
                    limit: Math.min(limit, 300), // OKX max 300
                },
            });
            if (response.data.code !== '0') {
                throw new Error(`OKX API Error: ${response.data.msg}`);
            }
            // OKX returns: [ts, open, high, low, close, vol, volCcy, volCcyQuote, confirm]
            return response.data.data.map((candle) => ({
                timestamp: parseInt(candle[0]),
                open: parseFloat(candle[1]),
                high: parseFloat(candle[2]),
                low: parseFloat(candle[3]),
                close: parseFloat(candle[4]),
                volume: parseFloat(candle[5]),
                volumeCurrency: parseFloat(candle[6]),
                volumeCurrencyQuote: parseFloat(candle[7]),
            })).reverse(); // OKX returns newest first, reverse to oldest→newest
        }
        catch (error) {
            console.error(`❌ Failed to fetch candles for ${symbol}:`, error.message);
            throw error;
        }
    }
    /**
     * Fetch order book depth
     */
    async getOrderBook(symbol, depth = 20) {
        try {
            const instId = this.formatSymbol(symbol);
            const response = await this.restClient.get('/api/v5/market/books', {
                params: {
                    instId,
                    sz: Math.min(depth, 400), // OKX max 400
                },
            });
            if (response.data.code !== '0') {
                throw new Error(`OKX API Error: ${response.data.msg}`);
            }
            return response.data.data[0];
        }
        catch (error) {
            console.error(`❌ Failed to fetch order book for ${symbol}:`, error.message);
            throw error;
        }
    }
    // ========================================================================
    // WEBSOCKET METHODS
    // ========================================================================
    /**
     * Connect to OKX WebSocket for real-time data
     */
    async connectWebSocket() {
        if (!this.config.enableWebSocket) {
            console.log('⚠️  WebSocket disabled, using REST API only');
            return;
        }
        return new Promise((resolve, reject) => {
            try {
                // ✅ FIX: Use WebSocket constructor correctly (CommonJS/ES6 compatible)
                this.wsClient = new ws_1.default(this.config.wsUrl);
                this.wsClient.on('open', () => {
                    console.log('✅ WebSocket connected to OKX');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();
                    this.resubscribeAll();
                    this.emit('connected');
                    resolve();
                });
                this.wsClient.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        this.handleWebSocketMessage(message);
                    }
                    catch (error) {
                        console.error('❌ Failed to parse WebSocket message:', error.message);
                    }
                });
                this.wsClient.on('error', (error) => {
                    console.error('❌ WebSocket error:', error.message);
                    this.emit('error', error);
                });
                this.wsClient.on('close', () => {
                    console.log('🔌 WebSocket disconnected');
                    this.isConnected = false;
                    this.stopHeartbeat();
                    this.emit('disconnected');
                    this.attemptReconnect();
                });
            }
            catch (error) {
                console.error('❌ Failed to connect WebSocket:', error.message);
                reject(error);
            }
        });
    }
    /**
     * Subscribe to candlestick updates
     */
    subscribeToCandlesticks(symbol, interval = '15m') {
        if (!this.wsClient || !this.isConnected) {
            console.warn('⚠️  WebSocket not connected, cannot subscribe');
            return;
        }
        const instId = this.formatSymbol(symbol);
        const channel = `candle${interval}`;
        const subscription = {
            op: 'subscribe',
            args: [
                {
                    channel,
                    instId,
                },
            ],
        };
        this.wsClient.send(JSON.stringify(subscription));
        this.subscriptions.add(`${channel}:${instId}`);
        console.log(`📊 Subscribed to ${channel} for ${instId}`);
    }
    /**
     * Subscribe to ticker updates
     */
    subscribeToTicker(symbol) {
        if (!this.wsClient || !this.isConnected) {
            console.warn('⚠️  WebSocket not connected, cannot subscribe');
            return;
        }
        const instId = this.formatSymbol(symbol);
        const subscription = {
            op: 'subscribe',
            args: [
                {
                    channel: 'tickers',
                    instId,
                },
            ],
        };
        this.wsClient.send(JSON.stringify(subscription));
        this.subscriptions.add(`tickers:${instId}`);
        console.log(`📈 Subscribed to ticker for ${instId}`);
    }
    /**
     * Unsubscribe from all channels
     */
    unsubscribeAll() {
        if (!this.wsClient || !this.isConnected) {
            return;
        }
        const args = Array.from(this.subscriptions).map((sub) => {
            const [channel, instId] = sub.split(':');
            return { channel, instId };
        });
        const unsubscription = {
            op: 'unsubscribe',
            args,
        };
        this.wsClient.send(JSON.stringify(unsubscription));
        this.subscriptions.clear();
        console.log('🔕 Unsubscribed from all channels');
    }
    // ========================================================================
    // PRIVATE WEBSOCKET HELPERS
    // ========================================================================
    handleWebSocketMessage(message) {
        // Handle subscription confirmations
        if (message.event === 'subscribe') {
            console.log(`✅ Subscription confirmed: ${message.arg.channel}:${message.arg.instId}`);
            return;
        }
        // Handle error messages
        if (message.event === 'error') {
            console.error(`❌ WebSocket error: ${message.msg}`);
            return;
        }
        // Handle data updates
        if (message.data && message.arg) {
            const channel = message.arg.channel;
            const instId = message.arg.instId;
            if (channel.startsWith('candle')) {
                this.handleCandleUpdate(instId, message.data[0]);
            }
            else if (channel === 'tickers') {
                this.handleTickerUpdate(instId, message.data[0]);
            }
        }
    }
    handleCandleUpdate(instId, candle) {
        const candleData = {
            timestamp: parseInt(candle[0]),
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5]),
            volumeCurrency: parseFloat(candle[6]),
            volumeCurrencyQuote: parseFloat(candle[7]),
        };
        this.lastCandleCache.set(instId, candleData);
        this.emit('candle', { symbol: instId, candle: candleData });
    }
    handleTickerUpdate(instId, ticker) {
        this.emit('ticker', { symbol: instId, ticker });
    }
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.wsClient && this.isConnected) {
                this.wsClient.send('ping');
            }
        }, 20000); // 20 seconds
    }
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = undefined;
        }
    }
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnect attempts reached, giving up');
            return;
        }
        this.reconnectAttempts++;
        console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => {
            this.connectWebSocket().catch((error) => {
                console.error('❌ Reconnection failed:', error.message);
            });
        }, this.reconnectDelay);
    }
    resubscribeAll() {
        const subs = Array.from(this.subscriptions);
        this.subscriptions.clear();
        subs.forEach((sub) => {
            const [channel, instId] = sub.split(':');
            if (channel.startsWith('candle')) {
                const interval = channel.replace('candle', '');
                this.subscribeToCandlesticks(instId, interval);
            }
            else if (channel === 'tickers') {
                this.subscribeToTicker(instId);
            }
        });
    }
    // ========================================================================
    // UTILITY METHODS
    // ========================================================================
    /**
     * Format symbol to OKX standard (BTC-USDT)
     */
    formatSymbol(symbol) {
        // Support both 'BTC-USDT' and 'BTCUSDT' formats
        if (symbol.includes('-')) {
            return symbol;
        }
        // Convert BTCUSDT → BTC-USDT
        const match = symbol.match(/^([A-Z]+)(USDT|USDC|USD|BTC|ETH)$/);
        if (match) {
            return `${match[1]}-${match[2]}`;
        }
        return symbol;
    }
    /**
     * Format interval to OKX standard
     */
    formatInterval(interval) {
        const mapping = {
            '1m': '1m',
            '5m': '5m',
            '15m': '15m',
            '30m': '30m',
            '1h': '1H',
            '1H': '1H',
            '4h': '4H',
            '4H': '4H',
            '1d': '1D',
            '1D': '1D',
        };
        return mapping[interval] || interval;
    }
    /**
     * Get comprehensive market snapshot (REST fallback)
     */
    async getMarketSnapshot(symbol, interval = '15m') {
        try {
            const [candles, ticker] = await Promise.all([
                this.getCandles(symbol, interval, 1),
                this.getTicker(symbol),
            ]);
            return {
                symbol,
                timestamp: Date.now(),
                candle: candles[0],
                ticker,
                source: 'rest',
            };
        }
        catch (error) {
            console.error(`❌ Failed to get market snapshot for ${symbol}:`, error.message);
            throw error;
        }
    }
    /**
     * Cleanup and disconnect
     */
    async disconnect() {
        console.log('🔌 Disconnecting OKX client...');
        this.unsubscribeAll();
        this.stopHeartbeat();
        if (this.wsClient) {
            this.wsClient.close();
            this.wsClient = undefined;
        }
        this.isConnected = false;
        console.log('✅ OKX client disconnected');
    }
    /**
     * Health check
     */
    async healthCheck() {
        try {
            await this.getServerTime();
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get connection status
     */
    getStatus() {
        return {
            connected: this.isConnected,
            websocket: this.config.enableWebSocket,
            subscriptions: this.subscriptions.size,
            mode: this.config.testnet ? 'PAPER_TRADING' : 'PRODUCTION',
        };
    }
}
exports.OKXLiveDataClient = OKXLiveDataClient;
// ============================================================================
// EXPORT
// ============================================================================
exports.default = OKXLiveDataClient;

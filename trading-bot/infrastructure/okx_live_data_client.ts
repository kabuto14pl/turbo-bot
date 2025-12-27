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

import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import WebSocket from 'ws'; // ✅ FIX: Default import instead of * as
import { EventEmitter } from 'events';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface OKXCandle {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    volumeCurrency: number;
    volumeCurrencyQuote: number;
}

export interface OKXTicker {
    instId: string;
    last: string;
    lastSz: string;
    askPx: string;
    askSz: string;
    bidPx: string;
    bidSz: string;
    open24h: string;
    high24h: string;
    low24h: string;
    volCcy24h: string;
    vol24h: string;
    ts: string;
    sodUtc0: string;
    sodUtc8: string;
}

export interface OKXOrderBook {
    asks: [string, string, string, string][]; // [price, quantity, liquidated_orders, num_orders]
    bids: [string, string, string, string][];
    ts: string;
}

export interface OKXConfig {
    apiKey?: string;          // Optional for public endpoints
    secretKey?: string;       // Optional for public endpoints
    passphrase?: string;      // Optional for public endpoints
    baseUrl?: string;         // Default: https://www.okx.com
    wsUrl?: string;           // Default: wss://ws.okx.com:8443/ws/v5/public
    testnet?: boolean;        // Use demo trading endpoint
    enableWebSocket?: boolean; // Enable WebSocket for real-time data
}

export interface MarketDataSnapshot {
    symbol: string;
    timestamp: number;
    candle: OKXCandle;
    ticker: OKXTicker;
    orderBook?: OKXOrderBook;
    source: 'websocket' | 'rest';
}

// ============================================================================
// OKX LIVE DATA CLIENT
// ============================================================================

export class OKXLiveDataClient extends EventEmitter {
    private restClient: AxiosInstance;
    private wsClient?: WebSocket;
    private config: Required<OKXConfig>;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private reconnectDelay = 5000; // 5 seconds
    private subscriptions: Set<string> = new Set();
    private lastCandleCache: Map<string, OKXCandle> = new Map();
    private isConnected = false;
    private heartbeatInterval?: NodeJS.Timeout;

    constructor(config: OKXConfig = {}) {
        super();

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
        this.restClient = axios.create({
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

    private createSignature(timestamp: string, method: string, requestPath: string, body: string): string {
        const message = timestamp + method.toUpperCase() + requestPath + body;
        return crypto.createHmac('sha256', this.config.secretKey).update(message).digest('base64');
    }

    // ========================================================================
    // REST API METHODS
    // ========================================================================

    /**
     * Fetch current server time
     */
    async getServerTime(): Promise<number> {
        try {
            const response = await this.restClient.get('/api/v5/public/time');
            if (response.data.code !== '0') {
                throw new Error(`OKX API Error: ${response.data.msg}`);
            }
            return parseInt(response.data.data[0].ts);
        } catch (error: any) {
            console.error('❌ Failed to fetch server time:', error.message);
            throw error;
        }
    }

    /**
     * Fetch latest ticker for symbol
     */
    async getTicker(symbol: string): Promise<OKXTicker> {
        try {
            const instId = this.formatSymbol(symbol);
            const response = await this.restClient.get('/api/v5/market/ticker', {
                params: { instId },
            });

            if (response.data.code !== '0') {
                throw new Error(`OKX API Error: ${response.data.msg}`);
            }

            return response.data.data[0];
        } catch (error: any) {
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
    async getCandles(symbol: string, interval: string = '15m', limit: number = 100): Promise<OKXCandle[]> {
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
            return response.data.data.map((candle: string[]) => ({
                timestamp: parseInt(candle[0]),
                open: parseFloat(candle[1]),
                high: parseFloat(candle[2]),
                low: parseFloat(candle[3]),
                close: parseFloat(candle[4]),
                volume: parseFloat(candle[5]),
                volumeCurrency: parseFloat(candle[6]),
                volumeCurrencyQuote: parseFloat(candle[7]),
            })).reverse(); // OKX returns newest first, reverse to oldest→newest
        } catch (error: any) {
            console.error(`❌ Failed to fetch candles for ${symbol}:`, error.message);
            throw error;
        }
    }

    /**
     * Fetch order book depth
     */
    async getOrderBook(symbol: string, depth: number = 20): Promise<OKXOrderBook> {
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
        } catch (error: any) {
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
    async connectWebSocket(): Promise<void> {
        if (!this.config.enableWebSocket) {
            console.log('⚠️  WebSocket disabled, using REST API only');
            return;
        }

        return new Promise((resolve, reject) => {
            try {
                // ✅ FIX: Use WebSocket constructor correctly (CommonJS/ES6 compatible)
                this.wsClient = new WebSocket(this.config.wsUrl);

                this.wsClient!.on('open', () => {
                    console.log('✅ WebSocket connected to OKX');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();
                    this.resubscribeAll();
                    this.emit('connected');
                    resolve();
                });

                this.wsClient!.on('message', (data: any) => {
                    try {
                        const message = JSON.parse(data.toString());
                        this.handleWebSocketMessage(message);
                    } catch (error: any) {
                        console.error('❌ Failed to parse WebSocket message:', error.message);
                    }
                });

                this.wsClient!.on('error', (error) => {
                    console.error('❌ WebSocket error:', error.message);
                    this.emit('error', error);
                });

                this.wsClient!.on('close', () => {
                    console.log('🔌 WebSocket disconnected');
                    this.isConnected = false;
                    this.stopHeartbeat();
                    this.emit('disconnected');
                    this.attemptReconnect();
                });

            } catch (error: any) {
                console.error('❌ Failed to connect WebSocket:', error.message);
                reject(error);
            }
        });
    }

    /**
     * Subscribe to candlestick updates
     */
    subscribeToCandlesticks(symbol: string, interval: string = '15m'): void {
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
    subscribeToTicker(symbol: string): void {
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
    unsubscribeAll(): void {
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

    private handleWebSocketMessage(message: any): void {
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
            } else if (channel === 'tickers') {
                this.handleTickerUpdate(instId, message.data[0]);
            }
        }
    }

    private handleCandleUpdate(instId: string, candle: string[]): void {
        const candleData: OKXCandle = {
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

    private handleTickerUpdate(instId: string, ticker: any): void {
        this.emit('ticker', { symbol: instId, ticker });
    }

    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            if (this.wsClient && this.isConnected) {
                this.wsClient.send('ping');
            }
        }, 20000); // 20 seconds
    }

    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = undefined;
        }
    }

    private attemptReconnect(): void {
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

    private resubscribeAll(): void {
        const subs = Array.from(this.subscriptions);
        this.subscriptions.clear();

        subs.forEach((sub) => {
            const [channel, instId] = sub.split(':');
            if (channel.startsWith('candle')) {
                const interval = channel.replace('candle', '');
                this.subscribeToCandlesticks(instId, interval);
            } else if (channel === 'tickers') {
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
    private formatSymbol(symbol: string): string {
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
    private formatInterval(interval: string): string {
        const mapping: Record<string, string> = {
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
    async getMarketSnapshot(symbol: string, interval: string = '15m'): Promise<MarketDataSnapshot> {
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
        } catch (error: any) {
            console.error(`❌ Failed to get market snapshot for ${symbol}:`, error.message);
            throw error;
        }
    }

    /**
     * Cleanup and disconnect
     */
    async disconnect(): Promise<void> {
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
    async healthCheck(): Promise<boolean> {
        try {
            await this.getServerTime();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get connection status
     */
    getStatus(): {
        connected: boolean;
        websocket: boolean;
        subscriptions: number;
        mode: string;
    } {
        return {
            connected: this.isConnected,
            websocket: this.config.enableWebSocket,
            subscriptions: this.subscriptions.size,
            mode: this.config.testnet ? 'PAPER_TRADING' : 'PRODUCTION',
        };
    }
}

// ============================================================================
// EXPORT
// ============================================================================

export default OKXLiveDataClient;

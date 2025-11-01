/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * Phase C.1: Real-Time Market Data Integration Engine
 * Advanced WebSocket-based market data system with enterprise caching
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { TradingCacheManager } from '../../trading-bot/core/cache/trading_cache_manager';
import { InMemoryCacheService, CacheConfig } from '../../trading-bot/core/cache/in_memory_cache_service';

export interface MarketDataPoint {
    symbol: string;
    timestamp: number;
    price: number;
    volume: number;
    bid: number;
    ask: number;
    spread: number;
    change24h: number;
    volatility: number;
}

export interface DataQualityMetrics {
    uptime: number;
    latency: number;
    errorRate: number;
    completeness: number;
    cacheHitRate: number;
}

export interface ExchangeConfig {
    name: string;
    wsUrl: string;
    apiUrl: string;
    symbols: string[];
    reconnectInterval: number;
    maxReconnectAttempts: number;
    rateLimit: number;
}

export class RealTimeMarketDataEngine extends EventEmitter {
    private connections: Map<string, WebSocket> = new Map();
    private dataCache: TradingCacheManager;
    private reconnectAttempts: Map<string, number> = new Map();
    private dataQuality: DataQualityMetrics;
    private lastDataTimestamp: Map<string, number> = new Map();
    private isActive: boolean = false;
    
    private exchanges: ExchangeConfig[] = [
        {
            name: 'binance',
            wsUrl: 'wss://stream.binance.com:9443/ws',
            apiUrl: 'https://api.binance.com/api/v3',
            symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
            reconnectInterval: 5000,
            maxReconnectAttempts: 10,
            rateLimit: 1200 // requests per minute
        },
        {
            name: 'okx',
            wsUrl: 'wss://ws.okx.com:8443/ws/v5/public',
            apiUrl: 'https://www.okx.com/api/v5',
            symbols: ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'],
            reconnectInterval: 5000,
            maxReconnectAttempts: 10,
            rateLimit: 600
        }
    ];

    constructor() {
        super();
        const cacheConfig: CacheConfig = {
            defaultTTL: 300,
            keyPrefix: 'market-data:',
            maxSize: 10000
        };
        const cacheService = new InMemoryCacheService(cacheConfig);
        this.dataCache = new TradingCacheManager(cacheService);
        this.dataQuality = {
            uptime: 0,
            latency: 0,
            errorRate: 0,
            completeness: 0,
            cacheHitRate: 0
        };
        
        // Start quality monitoring
        this.startQualityMonitoring();
    }

    /**
     * Initialize real-time data streams
     */
    async initialize(): Promise<void> {
        console.log('🚀 Initializing Real-Time Market Data Engine...');
        
        try {
            // Connect to all exchanges
            for (const exchange of this.exchanges) {
                await this.connectToExchange(exchange);
            }
            
            this.isActive = true;
            console.log('✅ Real-Time Market Data Engine initialized successfully');
            this.emit('initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Real-Time Market Data Engine:', error);
            throw error;
        }
    }

    /**
     * Connect to a specific exchange
     */
    private async connectToExchange(config: ExchangeConfig): Promise<void> {
        console.log(`🔌 Connecting to ${config.name}...`);
        
        try {
            const ws = new WebSocket(config.wsUrl);
            
            ws.on('open', () => {
                console.log(`✅ Connected to ${config.name}`);
                this.subscribeToSymbols(ws, config);
                this.connections.set(config.name, ws);
                this.reconnectAttempts.set(config.name, 0);
            });
            
            ws.on('message', (data) => {
                this.handleMarketData(data, config.name);
            });
            
            ws.on('error', (error) => {
                console.error(`❌ ${config.name} WebSocket error:`, error);
                this.handleConnectionError(config);
            });
            
            ws.on('close', () => {
                console.warn(`🔌 ${config.name} connection closed`);
                this.handleConnectionClose(config);
            });
            
        } catch (error) {
            console.error(`❌ Failed to connect to ${config.name}:`, error);
            this.handleConnectionError(config);
        }
    }

    /**
     * Subscribe to market data streams
     */
    private subscribeToSymbols(ws: WebSocket, config: ExchangeConfig): void {
        if (config.name === 'binance') {
            // Binance subscription format
            const streams = config.symbols.map(symbol => 
                `${symbol.toLowerCase()}@ticker`
            ).join('/');
            
            const subscriptionMessage = {
                method: 'SUBSCRIBE',
                params: config.symbols.map(symbol => `${symbol.toLowerCase()}@ticker`),
                id: Date.now()
            };
            
            ws.send(JSON.stringify(subscriptionMessage));
            
        } else if (config.name === 'okx') {
            // OKX subscription format
            const subscriptionMessage = {
                op: 'subscribe',
                args: config.symbols.map(symbol => ({
                    channel: 'tickers',
                    instId: symbol
                }))
            };
            
            ws.send(JSON.stringify(subscriptionMessage));
        }
        
        console.log(`📡 Subscribed to ${config.symbols.length} symbols on ${config.name}`);
    }

    /**
     * Handle incoming market data
     */
    private async handleMarketData(data: any, exchange: string): Promise<void> {
        try {
            const parsedData = JSON.parse(data.toString());
            
            // Parse based on exchange format
            let marketData: MarketDataPoint | null = null;
            
            if (exchange === 'binance' && parsedData.data) {
                marketData = this.parseBinanceData(parsedData.data);
            } else if (exchange === 'okx' && parsedData.data) {
                marketData = this.parseOKXData(parsedData.data[0]);
            }
            
            if (marketData) {
                // Validate data quality
                if (this.validateDataQuality(marketData)) {
                    // Cache the data
                    await this.cacheMarketData(marketData);
                    
                    // Update quality metrics
                    this.updateDataQuality(marketData, exchange);
                    
                    // Emit to subscribers
                    this.emit('marketData', marketData);
                }
            }
            
        } catch (error) {
            console.error(`❌ Error parsing market data from ${exchange}:`, error);
            this.dataQuality.errorRate += 0.01;
        }
    }

    /**
     * Parse Binance market data
     */
    private parseBinanceData(data: any): MarketDataPoint {
        return {
            symbol: data.s,
            timestamp: parseInt(data.E),
            price: parseFloat(data.c),
            volume: parseFloat(data.v),
            bid: parseFloat(data.b),
            ask: parseFloat(data.a),
            spread: parseFloat(data.a) - parseFloat(data.b),
            change24h: parseFloat(data.P),
            volatility: Math.abs(parseFloat(data.P)) / 100
        };
    }

    /**
     * Parse OKX market data
     */
    private parseOKXData(data: any): MarketDataPoint {
        return {
            symbol: data.instId.replace('-', ''),
            timestamp: parseInt(data.ts),
            price: parseFloat(data.last),
            volume: parseFloat(data.vol24h),
            bid: parseFloat(data.bidPx),
            ask: parseFloat(data.askPx),
            spread: parseFloat(data.askPx) - parseFloat(data.bidPx),
            change24h: parseFloat(data.chgUtc) * 100,
            volatility: Math.abs(parseFloat(data.chgUtc))
        };
    }

    /**
     * Validate data quality
     */
    private validateDataQuality(data: MarketDataPoint): boolean {
        // Check for required fields
        if (!data.symbol || !data.timestamp || !data.price) {
            return false;
        }
        
        // Check for reasonable values
        if (data.price <= 0 || data.volume < 0) {
            return false;
        }
        
        // Check for data freshness (not older than 5 seconds)
        const age = Date.now() - data.timestamp;
        if (age > 5000) {
            return false;
        }
        
        return true;
    }

    /**
     * Cache market data
     */
    private async cacheMarketData(data: MarketDataPoint): Promise<void> {
        const cacheKey = `market_data_${data.symbol}`;
        // Convert MarketDataPoint to MarketData format
        const marketData = {
            symbol: data.symbol,
            volume24h: data.volume,
            volatility24h: data.volatility,
            lastPrice: data.price,
            bidPrice: data.bid,
            askPrice: data.ask,
            spread: data.spread,
            liquidity: data.volume
        };
        await this.dataCache.cacheMarketData(data.symbol, '1m', [marketData], 60);
        
        // Also cache latest price for quick access
        const priceKey = `latest_price_${data.symbol}`;
        // Cache price directly via cache service
        await this.dataCache['cacheService'].set(priceKey, data.price, 30);
    }

    /**
     * Update data quality metrics
     */
    private updateDataQuality(data: MarketDataPoint, exchange: string): void {
        const now = Date.now();
        const lastTime = this.lastDataTimestamp.get(exchange) || now;
        
        // Calculate latency
        this.dataQuality.latency = now - data.timestamp;
        
        // Update completeness
        this.dataQuality.completeness = Math.min(100, 
            ((now - lastTime) < 2000) ? 100 : 95
        );
        
        // Calculate cache hit rate
        this.dataQuality.cacheHitRate = this.dataCache['cacheService'].getMetrics().hitRate * 100;
        
        this.lastDataTimestamp.set(exchange, now);
    }

    /**
     * Handle connection errors
     */
    private handleConnectionError(config: ExchangeConfig): void {
        const attempts = this.reconnectAttempts.get(config.name) || 0;
        
        if (attempts < config.maxReconnectAttempts) {
            console.log(`🔄 Attempting to reconnect to ${config.name} (attempt ${attempts + 1})`);
            
            setTimeout(() => {
                this.reconnectAttempts.set(config.name, attempts + 1);
                this.connectToExchange(config);
            }, config.reconnectInterval);
        } else {
            console.error(`❌ Max reconnection attempts reached for ${config.name}`);
            this.emit('exchangeOffline', config.name);
        }
    }

    /**
     * Handle connection close
     */
    private handleConnectionClose(config: ExchangeConfig): void {
        this.connections.delete(config.name);
        this.handleConnectionError(config);
    }

    /**
     * Start quality monitoring
     */
    private startQualityMonitoring(): void {
        setInterval(() => {
            const connectedExchanges = this.connections.size;
            const totalExchanges = this.exchanges.length;
            
            this.dataQuality.uptime = (connectedExchanges / totalExchanges) * 100;
            
            // Emit quality metrics
            this.emit('qualityUpdate', this.dataQuality);
            
            // Log quality status
            if (this.dataQuality.uptime >= 99) {
                console.log('📊 Data Quality: EXCELLENT', this.dataQuality);
            } else if (this.dataQuality.uptime >= 95) {
                console.log('📊 Data Quality: GOOD', this.dataQuality);
            } else {
                console.warn('⚠️ Data Quality: DEGRADED', this.dataQuality);
            }
            
        }, 30000); // Every 30 seconds
    }

    /**
     * Get latest market data for symbol
     */
    async getLatestData(symbol: string): Promise<MarketDataPoint | null> {
        try {
            const cachedData = await this.dataCache.getMarketData(symbol, '1m');
            if (cachedData && cachedData.length > 0) {
                const marketData = cachedData[0];
                // Convert MarketData back to MarketDataPoint
                return {
                    symbol: marketData.symbol,
                    timestamp: Date.now(),
                    price: marketData.lastPrice,
                    volume: marketData.volume24h,
                    bid: marketData.bidPrice,
                    ask: marketData.askPrice,
                    spread: marketData.spread,
                    change24h: 0, // Not available in MarketData
                    volatility: marketData.volatility24h
                };
            }
            return null;
        } catch (error) {
            console.error(`❌ Error getting latest data for ${symbol}:`, error);
            return null;
        }
    }

    /**
     * Get data quality metrics
     */
    getDataQuality(): DataQualityMetrics {
        return { ...this.dataQuality };
    }

    /**
     * Get connection status
     */
    getConnectionStatus(): { [exchange: string]: boolean } {
        const status: { [exchange: string]: boolean } = {};
        
        for (const exchange of this.exchanges) {
            status[exchange.name] = this.connections.has(exchange.name);
        }
        
        return status;
    }

    /**
     * Shutdown the engine
     */
    async shutdown(): Promise<void> {
        console.log('🛑 Shutting down Real-Time Market Data Engine...');
        
        this.isActive = false;
        
        // Close all WebSocket connections
        for (const [exchange, ws] of this.connections) {
            console.log(`🔌 Closing ${exchange} connection`);
            ws.close();
        }
        
        this.connections.clear();
        console.log('✅ Real-Time Market Data Engine shutdown complete');
    }
}

export default RealTimeMarketDataEngine;

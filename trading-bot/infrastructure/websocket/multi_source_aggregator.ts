/**
 * 🚀 TIER 2.4: Multi-Source WebSocket Aggregator
 * Enterprise-grade market data aggregation with automatic failover
 * 
 * Features:
 * - Multiple exchange support (Binance, OKX, extensible)
 * - Automatic source failover
 * - Data normalization
 * - Conflict resolution
 * - Connection health monitoring
 * - Load balancing
 */

import { EventEmitter } from 'events';
import { BinanceWebSocket } from './binance_websocket';
import { OKXWebSocket } from './okx_websocket';
import { MarketDataUpdate } from './websocket_client_base';

export interface AggregatorConfig {
    exchanges: ('binance' | 'okx')[];
    primaryExchange: 'binance' | 'okx';
    enableFailover: boolean;
    healthCheckInterval: number;
    maxSourceLatency: number;
    conflictResolution: 'primary' | 'latest' | 'average';
}

export interface SourceStatus {
    exchange: string;
    connected: boolean;
    latency?: number;
    lastUpdate?: number;
    messagesReceived: number;
    errors: number;
}

export class MultiSourceWebSocketAggregator extends EventEmitter {
    private config: AggregatorConfig;
    private sources: Map<string, BinanceWebSocket | OKXWebSocket> = new Map();
    private activeSource?: string;
    private sourceStatuses: Map<string, SourceStatus> = new Map();
    private healthCheckTimer?: NodeJS.Timeout;
    private lastPriceBySymbol: Map<string, { price: number; timestamp: number; source: string }> = new Map();

    constructor(config?: Partial<AggregatorConfig>) {
        super();
        
        this.config = {
            exchanges: config?.exchanges || ['binance', 'okx'],
            primaryExchange: config?.primaryExchange || 'binance',
            enableFailover: config?.enableFailover !== false,
            healthCheckInterval: config?.healthCheckInterval || 10000,
            maxSourceLatency: config?.maxSourceLatency || 5000,
            conflictResolution: config?.conflictResolution || 'primary'
        };

        this.initialize();
    }

    /**
     * Initialize WebSocket sources
     */
    private initialize(): void {
        console.log(`🌐 [AGGREGATOR] Initializing multi-source aggregator...`);
        console.log(`   Primary: ${this.config.primaryExchange}`);
        console.log(`   Sources: ${this.config.exchanges.join(', ')}`);
        console.log(`   Failover: ${this.config.enableFailover ? 'ENABLED' : 'DISABLED'}`);

        for (const exchange of this.config.exchanges) {
            this.initializeSource(exchange);
        }

        this.activeSource = this.config.primaryExchange;
        this.startHealthCheck();
    }

    /**
     * Initialize individual WebSocket source
     */
    private initializeSource(exchange: 'binance' | 'okx'): void {
        let client: BinanceWebSocket | OKXWebSocket;

        switch (exchange) {
            case 'binance':
                client = new BinanceWebSocket(false);
                break;
            case 'okx':
                client = new OKXWebSocket(false);
                break;
            default:
                throw new Error(`Unsupported exchange: ${exchange}`);
        }

        // Setup event listeners
        client.on('connected', () => this.handleSourceConnected(exchange));
        client.on('disconnected', () => this.handleSourceDisconnected(exchange));
        client.on('marketData', (data: MarketDataUpdate) => this.handleMarketData(data));
        client.on('error', (error: Error) => this.handleSourceError(exchange, error));
        client.on('pong', (latency: number) => this.updateSourceLatency(exchange, latency));

        this.sources.set(exchange, client);
        this.sourceStatuses.set(exchange, {
            exchange,
            connected: false,
            messagesReceived: 0,
            errors: 0
        });
    }

    /**
     * Connect to all sources
     */
    public async connect(): Promise<void> {
        console.log(`🌐 [AGGREGATOR] Connecting to all sources...`);

        const connectionPromises: Promise<void>[] = [];

        for (const [exchange, client] of this.sources) {
            connectionPromises.push(
                client.connect()
                    .catch(err => {
                        console.error(`❌ [AGGREGATOR] Failed to connect to ${exchange}:`, err.message);
                        // Don't throw - continue with other sources
                    })
            );
        }

        await Promise.allSettled(connectionPromises);

        // Check if at least one source connected
        const connectedSources = Array.from(this.sourceStatuses.values())
            .filter(s => s.connected);

        if (connectedSources.length === 0) {
            throw new Error('Failed to connect to any data source');
        }

        console.log(`✅ [AGGREGATOR] Connected to ${connectedSources.length}/${this.sources.size} sources`);
    }

    /**
     * Disconnect from all sources
     */
    public disconnect(): void {
        console.log(`🛑 [AGGREGATOR] Disconnecting from all sources...`);

        this.stopHealthCheck();

        for (const [exchange, client] of this.sources) {
            client.disconnect();
        }

        this.emit('disconnected');
    }

    /**
     * Subscribe to market data across all sources
     */
    public async subscribe(symbol: string, channels: string[] = ['ticker']): Promise<void> {
        console.log(`📊 [AGGREGATOR] Subscribing to ${symbol} (${channels.join(', ')})...`);

        const subscribePromises: Promise<void>[] = [];

        for (const [exchange, client] of this.sources) {
            if (!this.sourceStatuses.get(exchange)?.connected) {
                continue;
            }

            for (const channel of channels) {
                subscribePromises.push(
                    client.subscribe(channel, symbol)
                        .catch(err => 
                            console.error(`❌ [AGGREGATOR] ${exchange} subscribe failed:`, err.message)
                        )
                );
            }
        }

        await Promise.allSettled(subscribePromises);
        console.log(`✅ [AGGREGATOR] Subscribed to ${symbol} on ${subscribePromises.length} channels`);
    }

    /**
     * Handle market data from any source
     */
    private handleMarketData(data: MarketDataUpdate): void {
        const status = this.sourceStatuses.get(data.exchange);
        if (status) {
            status.messagesReceived++;
            status.lastUpdate = Date.now();
        }

        // Apply conflict resolution strategy
        if (this.shouldProcessData(data)) {
            // Update last price tracking
            this.lastPriceBySymbol.set(data.symbol, {
                price: data.price,
                timestamp: data.timestamp,
                source: data.exchange
            });

            // Emit normalized market data
            this.emit('marketData', data);

            // Emit specific event types
            this.emit(data.type, data);
        }
    }

    /**
     * Determine if market data should be processed based on conflict resolution
     */
    private shouldProcessData(data: MarketDataUpdate): boolean {
        switch (this.config.conflictResolution) {
            case 'primary':
                // Only process data from active source
                return data.exchange === this.activeSource;

            case 'latest':
                // Always process latest data
                const lastPrice = this.lastPriceBySymbol.get(data.symbol);
                return !lastPrice || data.timestamp >= lastPrice.timestamp;

            case 'average':
                // Process all data (will be averaged by consumer)
                return true;

            default:
                return true;
        }
    }

    /**
     * Handle source connection
     */
    private handleSourceConnected(exchange: string): void {
        const status = this.sourceStatuses.get(exchange);
        if (status) {
            status.connected = true;
        }

        console.log(`✅ [AGGREGATOR] ${exchange} connected`);
        this.emit('sourceConnected', exchange);

        // If primary source reconnected, switch back
        if (exchange === this.config.primaryExchange && this.activeSource !== exchange) {
            this.switchToSource(exchange);
        }
    }

    /**
     * Handle source disconnection
     */
    private handleSourceDisconnected(exchange: string): void {
        const status = this.sourceStatuses.get(exchange);
        if (status) {
            status.connected = false;
        }

        console.log(`🔌 [AGGREGATOR] ${exchange} disconnected`);
        this.emit('sourceDisconnected', exchange);

        // Failover if this was the active source
        if (this.config.enableFailover && exchange === this.activeSource) {
            this.performFailover();
        }
    }

    /**
     * Handle source error
     */
    private handleSourceError(exchange: string, error: Error): void {
        const status = this.sourceStatuses.get(exchange);
        if (status) {
            status.errors++;
        }

        console.error(`❌ [AGGREGATOR] ${exchange} error:`, error.message);
        this.emit('sourceError', { exchange, error });
    }

    /**
     * Update source latency
     */
    private updateSourceLatency(exchange: string, latency: number): void {
        const status = this.sourceStatuses.get(exchange);
        if (status) {
            status.latency = latency;
        }
    }

    /**
     * Perform automatic failover to healthy source
     */
    private performFailover(): void {
        console.log(`🔄 [AGGREGATOR] Performing failover from ${this.activeSource}...`);

        // Find healthy alternative source
        for (const [exchange, status] of this.sourceStatuses) {
            if (exchange !== this.activeSource && 
                status.connected && 
                (!status.latency || status.latency < this.config.maxSourceLatency)) {
                
                this.switchToSource(exchange);
                return;
            }
        }

        console.error(`❌ [AGGREGATOR] No healthy source available for failover!`);
        this.emit('failover_failed');
    }

    /**
     * Switch active source
     */
    private switchToSource(exchange: string): void {
        const oldSource = this.activeSource;
        this.activeSource = exchange;

        console.log(`🔄 [AGGREGATOR] Switched from ${oldSource} to ${exchange}`);
        this.emit('sourceSwitch', { from: oldSource, to: exchange });
    }

    /**
     * Start health check monitoring
     */
    private startHealthCheck(): void {
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.config.healthCheckInterval);
    }

    /**
     * Stop health check
     */
    private stopHealthCheck(): void {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = undefined;
        }
    }

    /**
     * Perform health check on all sources
     */
    private performHealthCheck(): void {
        const now = Date.now();

        for (const [exchange, status] of this.sourceStatuses) {
            // Check if source is stale (no updates recently)
            if (status.connected && status.lastUpdate) {
                const timeSinceUpdate = now - status.lastUpdate;
                
                if (timeSinceUpdate > this.config.maxSourceLatency * 2) {
                    console.warn(`⚠️ [AGGREGATOR] ${exchange} appears stale (${timeSinceUpdate}ms since last update)`);
                    
                    // If this is active source, perform failover
                    if (this.config.enableFailover && exchange === this.activeSource) {
                        this.performFailover();
                    }
                }
            }

            // Check latency
            if (status.connected && status.latency && status.latency > this.config.maxSourceLatency) {
                console.warn(`⚠️ [AGGREGATOR] ${exchange} high latency: ${status.latency}ms`);
            }
        }
    }

    /**
     * Get current source statuses
     */
    public getSourceStatuses(): Map<string, SourceStatus> {
        return new Map(this.sourceStatuses);
    }

    /**
     * Get active source
     */
    public getActiveSource(): string | undefined {
        return this.activeSource;
    }

    /**
     * Get latest price for symbol
     */
    public getLatestPrice(symbol: string): { price: number; timestamp: number; source: string } | undefined {
        return this.lastPriceBySymbol.get(symbol);
    }

    /**
     * Get aggregator health status
     */
    public getHealthStatus(): {
        healthy: boolean;
        activeSource: string | undefined;
        connectedSources: number;
        totalSources: number;
        sources: SourceStatus[];
    } {
        const statuses = Array.from(this.sourceStatuses.values());
        const connectedSources = statuses.filter(s => s.connected).length;

        return {
            healthy: connectedSources > 0,
            activeSource: this.activeSource,
            connectedSources,
            totalSources: this.sources.size,
            sources: statuses
        };
    }
}

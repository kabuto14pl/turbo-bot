"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiSourceWebSocketAggregator = void 0;
const events_1 = require("events");
const binance_websocket_1 = require("./binance_websocket");
const okx_websocket_1 = require("./okx_websocket");
class MultiSourceWebSocketAggregator extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.sources = new Map();
        this.sourceStatuses = new Map();
        this.lastPriceBySymbol = new Map();
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
    initialize() {
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
    initializeSource(exchange) {
        let client;
        switch (exchange) {
            case 'binance':
                client = new binance_websocket_1.BinanceWebSocket(false);
                break;
            case 'okx':
                client = new okx_websocket_1.OKXWebSocket(false);
                break;
            default:
                throw new Error(`Unsupported exchange: ${exchange}`);
        }
        // Setup event listeners
        client.on('connected', () => this.handleSourceConnected(exchange));
        client.on('disconnected', () => this.handleSourceDisconnected(exchange));
        client.on('marketData', (data) => this.handleMarketData(data));
        client.on('error', (error) => this.handleSourceError(exchange, error));
        client.on('pong', (latency) => this.updateSourceLatency(exchange, latency));
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
    async connect() {
        console.log(`🌐 [AGGREGATOR] Connecting to all sources...`);
        const connectionPromises = [];
        for (const [exchange, client] of this.sources) {
            connectionPromises.push(client.connect()
                .catch(err => {
                console.error(`❌ [AGGREGATOR] Failed to connect to ${exchange}:`, err.message);
                // Don't throw - continue with other sources
            }));
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
    disconnect() {
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
    async subscribe(symbol, channels = ['ticker']) {
        console.log(`📊 [AGGREGATOR] Subscribing to ${symbol} (${channels.join(', ')})...`);
        const subscribePromises = [];
        for (const [exchange, client] of this.sources) {
            if (!this.sourceStatuses.get(exchange)?.connected) {
                continue;
            }
            for (const channel of channels) {
                subscribePromises.push(client.subscribe(channel, symbol)
                    .catch(err => console.error(`❌ [AGGREGATOR] ${exchange} subscribe failed:`, err.message)));
            }
        }
        await Promise.allSettled(subscribePromises);
        console.log(`✅ [AGGREGATOR] Subscribed to ${symbol} on ${subscribePromises.length} channels`);
    }
    /**
     * Handle market data from any source
     */
    handleMarketData(data) {
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
    shouldProcessData(data) {
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
    handleSourceConnected(exchange) {
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
    handleSourceDisconnected(exchange) {
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
    handleSourceError(exchange, error) {
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
    updateSourceLatency(exchange, latency) {
        const status = this.sourceStatuses.get(exchange);
        if (status) {
            status.latency = latency;
        }
    }
    /**
     * Perform automatic failover to healthy source
     */
    performFailover() {
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
    switchToSource(exchange) {
        const oldSource = this.activeSource;
        this.activeSource = exchange;
        console.log(`🔄 [AGGREGATOR] Switched from ${oldSource} to ${exchange}`);
        this.emit('sourceSwitch', { from: oldSource, to: exchange });
    }
    /**
     * Start health check monitoring
     */
    startHealthCheck() {
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.config.healthCheckInterval);
    }
    /**
     * Stop health check
     */
    stopHealthCheck() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = undefined;
        }
    }
    /**
     * Perform health check on all sources
     */
    performHealthCheck() {
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
    getSourceStatuses() {
        return new Map(this.sourceStatuses);
    }
    /**
     * Get active source
     */
    getActiveSource() {
        return this.activeSource;
    }
    /**
     * Get latest price for symbol
     */
    getLatestPrice(symbol) {
        return this.lastPriceBySymbol.get(symbol);
    }
    /**
     * Get aggregator health status
     */
    getHealthStatus() {
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
exports.MultiSourceWebSocketAggregator = MultiSourceWebSocketAggregator;

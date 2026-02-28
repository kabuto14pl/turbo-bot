"use strict";
/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * Real-Time Market Data Engine - Phase C.1
 * Enterprise-grade market data integration with WebSocket connections
 * Features: Multi-exchange support, data validation, cache integration, failover
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketManager = exports.DefaultMarketDataConfig = exports.RealTimeMarketDataEngine = void 0;
const events_1 = require("events");
const ws_1 = __importDefault(require("ws"));
class WebSocketManager extends events_1.EventEmitter {
    constructor(config, symbols) {
        super();
        this.config = config;
        this.symbols = symbols;
        this.ws = null;
        this.reconnectTimer = null;
        this.pingInterval = null;
        this.stats = {
            connected: false,
            uptime: 0,
            reconnectCount: 0,
            messageCount: 0,
            errorCount: 0,
            lastMessageTime: 0,
            avgLatency: 0
        };
    }
    async connect() {
        try {
            console.log(`[WS MANAGER] Connecting to ${this.config.name}: ${this.config.wsUrl}`);
            this.ws = new ws_1.default(this.config.wsUrl);
            this.ws.on('open', () => this.handleOpen());
            this.ws.on('message', (data) => this.handleMessage(data));
            this.ws.on('error', (error) => this.handleError(error));
            this.ws.on('close', (code, reason) => this.handleClose(code, reason));
        }
        catch (error) {
            console.error(`[WS MANAGER] Connection error for ${this.config.name}:`, error);
            this.scheduleReconnect();
        }
    }
    handleOpen() {
        console.log(`[WS MANAGER] Connected to ${this.config.name}`);
        this.stats.connected = true;
        this.stats.uptime = Date.now();
        // Subscribe to symbols
        this.subscribeToSymbols();
        // Start ping/pong for connection health
        this.startPingPong();
        this.emit('connected', this.config.name);
    }
    handleMessage(data) {
        try {
            const messageText = typeof data === 'string' ? data : data.toString();
            const message = JSON.parse(messageText);
            this.stats.messageCount++;
            this.stats.lastMessageTime = Date.now();
            // Calculate latency if timestamp available
            if (message.timestamp) {
                const latency = Date.now() - message.timestamp;
                this.updateLatency(latency);
            }
            // Parse exchange-specific format
            const normalizedData = this.normalizeMessage(message);
            if (normalizedData) {
                this.emit('marketData', normalizedData);
            }
        }
        catch (error) {
            console.error(`[WS MANAGER] Message parsing error for ${this.config.name}:`, error);
            this.stats.errorCount++;
        }
    }
    handleError(error) {
        console.error(`[WS MANAGER] WebSocket error for ${this.config.name}:`, error);
        this.stats.errorCount++;
        this.emit('error', { exchange: this.config.name, error });
    }
    handleClose(code, reason) {
        console.log(`[WS MANAGER] Connection closed for ${this.config.name}: ${code} - ${reason.toString()}`);
        this.stats.connected = false;
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        this.emit('disconnected', this.config.name);
        this.scheduleReconnect();
    }
    subscribeToSymbols() {
        if (!this.ws || this.ws.readyState !== ws_1.default.OPEN)
            return;
        this.symbols.forEach(symbol => {
            const subscription = this.createSubscription(symbol);
            this.ws.send(JSON.stringify(subscription));
            console.log(`[WS MANAGER] Subscribed to ${symbol} on ${this.config.name}`);
        });
    }
    createSubscription(symbol) {
        // Exchange-specific subscription format
        switch (this.config.name) {
            case 'binance':
                return {
                    method: "SUBSCRIBE",
                    params: [
                        `${symbol.toLowerCase()}@ticker`,
                        `${symbol.toLowerCase()}@bookTicker`
                    ],
                    id: Date.now()
                };
            case 'okx':
                return {
                    op: "subscribe",
                    args: [
                        {
                            channel: "tickers",
                            instId: symbol
                        }
                    ]
                };
            default:
                return null;
        }
    }
    normalizeMessage(message) {
        try {
            switch (this.config.name) {
                case 'binance':
                    return this.normalizeBinanceData(message);
                case 'okx':
                    return this.normalizeOKXData(message);
                default:
                    return null;
            }
        }
        catch (error) {
            console.error(`[WS MANAGER] Data normalization error:`, error);
            return null;
        }
    }
    normalizeBinanceData(data) {
        if (!data.s || !data.c)
            return null; // Invalid ticker data
        return {
            symbol: data.s,
            exchange: 'binance',
            timestamp: data.E || Date.now(),
            price: parseFloat(data.c),
            volume: parseFloat(data.v) || 0,
            bid: parseFloat(data.b) || 0,
            ask: parseFloat(data.a) || 0,
            spread: parseFloat(data.a) - parseFloat(data.b) || 0,
            change24h: parseFloat(data.P) || 0,
            volatility: this.calculateVolatility(data),
            quality: this.assessDataQuality(data),
            source: this.config.priority === 1 ? 'primary' : 'fallback'
        };
    }
    normalizeOKXData(data) {
        if (!data.arg || !data.data || !data.data[0])
            return null;
        const ticker = data.data[0];
        return {
            symbol: ticker.instId,
            exchange: 'okx',
            timestamp: parseInt(ticker.ts) || Date.now(),
            price: parseFloat(ticker.last),
            volume: parseFloat(ticker.vol24h) || 0,
            bid: parseFloat(ticker.bidPx) || 0,
            ask: parseFloat(ticker.askPx) || 0,
            spread: parseFloat(ticker.askPx) - parseFloat(ticker.bidPx) || 0,
            change24h: parseFloat(ticker.changeRate) * 100 || 0,
            volatility: this.calculateVolatility(ticker),
            quality: this.assessDataQuality(ticker),
            source: this.config.priority === 1 ? 'primary' : 'fallback'
        };
    }
    calculateVolatility(data) {
        // Simple volatility calculation based on price change
        const change = Math.abs(parseFloat(data.P || data.changeRate || 0));
        return change / 100; // Convert to decimal
    }
    assessDataQuality(data) {
        const now = Date.now();
        const dataTime = data.E || data.ts || now;
        const latency = now - dataTime;
        // Calculate quality scores (0-100)
        const freshnessScore = Math.max(0, 100 - (latency / 1000)); // Penalize old data
        const completenessScore = this.calculateCompleteness(data);
        const accuracyScore = this.calculateAccuracy(data);
        const overallScore = (freshnessScore + completenessScore + accuracyScore) / 3;
        return {
            score: Math.round(overallScore),
            latency,
            completeness: completenessScore,
            accuracy: accuracyScore,
            freshness: freshnessScore
        };
    }
    calculateCompleteness(data) {
        const requiredFields = ['price', 'volume', 'timestamp'];
        const optionalFields = ['bid', 'ask', 'change24h'];
        let score = 0;
        let totalFields = requiredFields.length + optionalFields.length;
        // Required fields (weighted more heavily)
        requiredFields.forEach(field => {
            if (this.hasValidValue(data, field)) {
                score += 60 / requiredFields.length; // 60% for required fields
            }
        });
        // Optional fields
        optionalFields.forEach(field => {
            if (this.hasValidValue(data, field)) {
                score += 40 / optionalFields.length; // 40% for optional fields
            }
        });
        return Math.min(100, score);
    }
    calculateAccuracy(data) {
        // Basic accuracy checks
        let score = 100;
        // Check for reasonable price values
        const price = parseFloat(data.c || data.last || 0);
        if (price <= 0 || price > 1000000)
            score -= 50;
        // Check for reasonable volume
        const volume = parseFloat(data.v || data.vol24h || 0);
        if (volume < 0)
            score -= 25;
        // Check bid/ask spread reasonability
        const bid = parseFloat(data.b || data.bidPx || 0);
        const ask = parseFloat(data.a || data.askPx || 0);
        if (bid > 0 && ask > 0 && (ask < bid || (ask - bid) / bid > 0.1)) {
            score -= 25; // Suspicious spread
        }
        return Math.max(0, score);
    }
    hasValidValue(data, field) {
        const fieldMap = {
            price: ['c', 'last'],
            volume: ['v', 'vol24h'],
            timestamp: ['E', 'ts'],
            bid: ['b', 'bidPx'],
            ask: ['a', 'askPx'],
            change24h: ['P', 'changeRate']
        };
        const possibleFields = fieldMap[field] || [field];
        return possibleFields.some(f => {
            const value = data[f];
            return value !== undefined && value !== null && value !== '';
        });
    }
    updateLatency(latency) {
        // Simple moving average for latency
        this.stats.avgLatency = this.stats.avgLatency === 0
            ? latency
            : (this.stats.avgLatency * 0.9) + (latency * 0.1);
    }
    startPingPong() {
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === ws_1.default.OPEN) {
                this.ws.ping();
            }
        }, 30000); // Ping every 30 seconds
    }
    scheduleReconnect() {
        if (this.stats.reconnectCount >= 10) { // Max reconnect attempts
            console.error(`[WS MANAGER] Max reconnect attempts reached for ${this.config.name}`);
            this.emit('maxReconnectsReached', this.config.name);
            return;
        }
        const delay = Math.min(1000 * Math.pow(2, this.stats.reconnectCount), 30000); // Exponential backoff
        console.log(`[WS MANAGER] Scheduling reconnect for ${this.config.name} in ${delay}ms`);
        this.reconnectTimer = setTimeout(() => {
            this.stats.reconnectCount++;
            this.connect();
        }, delay);
    }
    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.stats.connected = false;
    }
    getStats() {
        return { ...this.stats };
    }
    isHealthy() {
        return this.stats.connected &&
            (Date.now() - this.stats.lastMessageTime) < 30000 && // Recent data
            this.stats.avgLatency < 1000; // Reasonable latency
    }
}
exports.WebSocketManager = WebSocketManager;
class RealTimeMarketDataEngine extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.wsManagers = new Map();
        this.dataCache = new Map();
        this.isRunning = false;
        // Statistics
        this.stats = {
            totalMessages: 0,
            validMessages: 0,
            invalidMessages: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageLatency: 0,
            startTime: 0
        };
        this.config = config;
        this.dataValidator = new DataValidator(config.validationRules);
    }
    setCacheService(cacheService) {
        this.cacheService = cacheService;
        console.log('[MARKET DATA ENGINE] Cache service integrated');
    }
    async start() {
        if (this.isRunning) {
            console.warn('[MARKET DATA ENGINE] Engine already running');
            return;
        }
        console.log('[MARKET DATA ENGINE] Starting real-time market data engine...');
        this.stats.startTime = Date.now();
        this.isRunning = true;
        // Initialize WebSocket managers for each exchange
        for (const exchangeConfig of this.config.exchanges) {
            await this.initializeExchange(exchangeConfig);
        }
        // Start health monitoring
        this.startHealthMonitoring();
        console.log('[MARKET DATA ENGINE] Engine started successfully');
        this.emit('started');
    }
    async initializeExchange(exchangeConfig) {
        const manager = new WebSocketManager(exchangeConfig, this.config.symbols);
        manager.on('connected', (exchange) => {
            console.log(`[MARKET DATA ENGINE] Exchange ${exchange} connected`);
            this.emit('exchangeConnected', exchange);
        });
        manager.on('disconnected', (exchange) => {
            console.log(`[MARKET DATA ENGINE] Exchange ${exchange} disconnected`);
            this.emit('exchangeDisconnected', exchange);
        });
        manager.on('marketData', (data) => {
            this.processMarketData(data);
        });
        manager.on('error', (error) => {
            console.error(`[MARKET DATA ENGINE] Exchange error:`, error);
            this.emit('error', error);
        });
        this.wsManagers.set(exchangeConfig.name, manager);
        await manager.connect();
    }
    processMarketData(data) {
        this.stats.totalMessages++;
        // Validate data quality
        const validationResult = this.dataValidator.validate(data);
        if (!validationResult.isValid) {
            this.stats.invalidMessages++;
            console.warn('[MARKET DATA ENGINE] Invalid data received:', validationResult.errors);
            return;
        }
        this.stats.validMessages++;
        this.updateLatencyStats(data.quality.latency);
        // Cache the data if enabled
        if (this.config.cacheEnabled && this.cacheService) {
            this.cacheMarketData(data);
        }
        // Store in memory cache
        this.storeInMemoryCache(data);
        // Emit processed data
        this.emit('marketData', data);
        this.emit(`marketData:${data.symbol}`, data);
    }
    async cacheMarketData(data) {
        try {
            const cacheKey = `market_data:${data.exchange}:${data.symbol}`;
            await this.cacheService.set(cacheKey, data, this.config.cacheTTL);
            this.stats.cacheHits++;
        }
        catch (error) {
            console.error('[MARKET DATA ENGINE] Cache error:', error);
            this.stats.cacheMisses++;
        }
    }
    storeInMemoryCache(data) {
        const key = `${data.exchange}:${data.symbol}`;
        if (!this.dataCache.has(key)) {
            this.dataCache.set(key, []);
        }
        const cache = this.dataCache.get(key);
        cache.push(data);
        // Keep only last 100 data points
        if (cache.length > 100) {
            cache.splice(0, cache.length - 100);
        }
    }
    updateLatencyStats(latency) {
        this.stats.averageLatency = this.stats.averageLatency === 0
            ? latency
            : (this.stats.averageLatency * 0.95) + (latency * 0.05);
    }
    startHealthMonitoring() {
        setInterval(() => {
            this.checkSystemHealth();
        }, 10000); // Check every 10 seconds
    }
    checkSystemHealth() {
        const healthStatus = {
            overall: true,
            exchanges: new Map(),
            stats: this.getStats()
        };
        for (const [exchange, manager] of this.wsManagers) {
            const isHealthy = manager.isHealthy();
            healthStatus.exchanges.set(exchange, isHealthy);
            if (!isHealthy) {
                healthStatus.overall = false;
                console.warn(`[MARKET DATA ENGINE] Exchange ${exchange} is unhealthy`);
            }
        }
        this.emit('healthCheck', healthStatus);
    }
    async getLatestData(symbol, exchange) {
        // Try cache first
        if (this.config.cacheEnabled && this.cacheService) {
            try {
                const cacheKey = exchange
                    ? `market_data:${exchange}:${symbol}`
                    : `market_data:*:${symbol}`;
                const cachedData = await this.cacheService.get(cacheKey);
                if (cachedData) {
                    this.stats.cacheHits++;
                    return cachedData;
                }
            }
            catch (error) {
                console.error('[MARKET DATA ENGINE] Cache retrieval error:', error);
            }
        }
        this.stats.cacheMisses++;
        // Try memory cache
        const keys = Array.from(this.dataCache.keys());
        const targetKey = exchange
            ? `${exchange}:${symbol}`
            : keys.find(k => k.endsWith(`:${symbol}`));
        if (targetKey && this.dataCache.has(targetKey)) {
            const cache = this.dataCache.get(targetKey);
            return cache[cache.length - 1] || null;
        }
        return null;
    }
    getHistoricalData(symbol, limit = 100, exchange) {
        const keys = Array.from(this.dataCache.keys());
        const targetKey = exchange
            ? `${exchange}:${symbol}`
            : keys.find(k => k.endsWith(`:${symbol}`));
        if (targetKey && this.dataCache.has(targetKey)) {
            const cache = this.dataCache.get(targetKey);
            return cache.slice(-limit);
        }
        return [];
    }
    getStats() {
        const uptime = this.isRunning ? Date.now() - this.stats.startTime : 0;
        const exchangeStats = new Map();
        for (const [exchange, manager] of this.wsManagers) {
            exchangeStats.set(exchange, manager.getStats());
        }
        return {
            ...this.stats,
            uptime,
            isRunning: this.isRunning,
            connectedExchanges: Array.from(this.wsManagers.keys()).filter(exchange => this.wsManagers.get(exchange)?.isHealthy()),
            exchangeStats: Object.fromEntries(exchangeStats),
            cacheHitRatio: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0,
            dataQualityRatio: this.stats.validMessages / this.stats.totalMessages || 0
        };
    }
    async stop() {
        if (!this.isRunning)
            return;
        console.log('[MARKET DATA ENGINE] Stopping market data engine...');
        this.isRunning = false;
        // Disconnect all exchanges
        for (const [exchange, manager] of this.wsManagers) {
            console.log(`[MARKET DATA ENGINE] Disconnecting from ${exchange}`);
            manager.disconnect();
        }
        this.wsManagers.clear();
        this.dataCache.clear();
        console.log('[MARKET DATA ENGINE] Engine stopped');
        this.emit('stopped');
    }
}
exports.RealTimeMarketDataEngine = RealTimeMarketDataEngine;
class DataValidator {
    constructor(rules) {
        this.rules = rules;
    }
    validate(data) {
        const errors = [];
        // Basic required field validation
        if (!data.symbol)
            errors.push('Symbol is required');
        if (!data.exchange)
            errors.push('Exchange is required');
        if (!data.timestamp)
            errors.push('Timestamp is required');
        if (data.price <= 0)
            errors.push('Price must be positive');
        // Quality score validation
        if (data.quality.score < 50) {
            errors.push('Data quality score too low');
        }
        // Latency validation
        if (data.quality.latency > 5000) {
            errors.push('Data latency too high');
        }
        // Custom rule validation
        for (const rule of this.rules) {
            const ruleError = this.validateRule(data, rule);
            if (ruleError)
                errors.push(ruleError);
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    validateRule(data, rule) {
        const value = data[rule.field];
        switch (rule.type) {
            case 'required':
                return value == null ? `${rule.field} is required` : null;
            case 'range':
                if (rule.params && (value < rule.params.min || value > rule.params.max)) {
                    return `${rule.field} must be between ${rule.params.min} and ${rule.params.max}`;
                }
                return null;
            case 'type':
                const expectedType = rule.params?.type || 'number';
                if (typeof value !== expectedType) {
                    return `${rule.field} must be of type ${expectedType}`;
                }
                return null;
            default:
                return null;
        }
    }
}
// Default configuration for production use
exports.DefaultMarketDataConfig = {
    exchanges: [
        {
            name: 'binance',
            wsUrl: 'wss://stream.binance.com:9443/ws/btcusdt@ticker',
            testnet: false,
            priority: 1,
            rateLimit: 10
        },
        {
            name: 'okx',
            wsUrl: 'wss://ws.okx.com:8443/ws/v5/public',
            testnet: false,
            priority: 2,
            rateLimit: 8
        }
    ],
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
    dataFrequency: 1000,
    reconnectDelay: 5000,
    maxReconnectAttempts: 10,
    cacheEnabled: true,
    cacheTTL: 30000, // 30 seconds
    validationRules: [
        { field: 'price', type: 'range', params: { min: 0.01, max: 1000000 } },
        { field: 'volume', type: 'range', params: { min: 0, max: Number.MAX_SAFE_INTEGER } }
    ]
};

"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🔧 CACHE INTEGRATION MODULE
 * Provides typed cache integration patterns for trading system components
 * Implements dependency injection and automatic cache invalidation strategies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheProvider = exports.TradingCacheManager = void 0;
exports.Cacheable = Cacheable;
const in_memory_cache_service_1 = require("./in_memory_cache_service");
const logger_1 = require("../../infrastructure/logging/logger");
/**
 * Trading-specific cache integration with automatic invalidation
 */
class TradingCacheManager {
    constructor(cacheService, logger) {
        this.cacheService = cacheService;
        this.invalidationRules = new Map();
        this.logger = logger || new logger_1.Logger('TradingCacheManager');
        this.setupInvalidationRules();
        this.logger.info('🔧 Trading Cache Manager initialized');
    }
    /**
     * Cache market data with symbol-specific TTL
     */
    async cacheMarketData(symbol, interval, data, ttl = 300) {
        const key = `market-data:${symbol}:${interval}`;
        return await this.cacheService.set(key, data, ttl, in_memory_cache_service_1.CacheStrategy.TTL);
    }
    /**
     * Retrieve cached market data
     */
    async getMarketData(symbol, interval) {
        const key = `market-data:${symbol}:${interval}`;
        return await this.cacheService.get(key);
    }
    /**
     * Cache trade signals with short TTL for real-time trading
     */
    async cacheTradeSignal(strategyId, symbol, signal, ttl = 60) {
        const timestamp = Date.now();
        const key = `signal:${strategyId}:${symbol}:${timestamp}`;
        const cached = await this.cacheService.set(key, signal, ttl, in_memory_cache_service_1.CacheStrategy.FIFO);
        // Set latest signal pointer for quick access
        const latestKey = `latest-signal:${strategyId}:${symbol}`;
        await this.cacheService.set(latestKey, key, ttl * 2);
        return cached;
    }
    /**
     * Get latest signal for strategy-symbol combination
     */
    async getLatestSignal(strategyId, symbol) {
        const latestKey = `latest-signal:${strategyId}:${symbol}`;
        const signalKey = await this.cacheService.get(latestKey);
        if (!signalKey) {
            return null;
        }
        return await this.cacheService.get(signalKey);
    }
    /**
     * Cache portfolio state with LRU strategy
     */
    async cachePortfolioState(accountId, portfolio, ttl = 300) {
        const key = `portfolio:${accountId}`;
        return await this.cacheService.set(key, portfolio, ttl, in_memory_cache_service_1.CacheStrategy.LRU);
    }
    /**
     * Get cached portfolio state
     */
    async getPortfolioState(accountId) {
        const key = `portfolio:${accountId}`;
        return await this.cacheService.get(key);
    }
    /**
     * Cache computed indicators with automatic invalidation on new data
     */
    async cacheIndicators(symbol, interval, indicators, ttl = 600) {
        const key = `indicators:${symbol}:${interval}`;
        return await this.cacheService.set(key, indicators, ttl, in_memory_cache_service_1.CacheStrategy.TTL);
    }
    /**
     * Get cached indicators
     */
    async getIndicators(symbol, interval) {
        const key = `indicators:${symbol}:${interval}`;
        return await this.cacheService.get(key);
    }
    /**
     * Cache backtest results with long TTL
     */
    async cacheBacktestResults(strategyId, parameters, results, ttl = 3600) {
        const paramHash = this.hashParameters(parameters);
        const key = `backtest:${strategyId}:${paramHash}`;
        return await this.cacheService.set(key, results, ttl, in_memory_cache_service_1.CacheStrategy.LFU);
    }
    /**
     * Get cached backtest results
     */
    async getBacktestResults(strategyId, parameters) {
        const paramHash = this.hashParameters(parameters);
        const key = `backtest:${strategyId}:${paramHash}`;
        return await this.cacheService.get(key);
    }
    /**
     * Cache optimization results
     */
    async cacheOptimizationResults(strategyId, optimizationType, results, ttl = 7200) {
        const key = `optimization:${strategyId}:${optimizationType}`;
        return await this.cacheService.set(key, results, ttl, in_memory_cache_service_1.CacheStrategy.LRU);
    }
    /**
     * Rate limiting cache for API calls
     */
    async checkRateLimit(endpoint, limit, windowSeconds) {
        const key = `rate-limit:${endpoint}`;
        const current = await this.cacheService.increment(key, 1, windowSeconds);
        const allowed = current <= limit;
        const remaining = Math.max(0, limit - current);
        const resetTime = Date.now() + (windowSeconds * 1000);
        return { allowed, remaining, resetTime };
    }
    /**
     * Cache ML model predictions
     */
    async cacheMLPrediction(modelId, inputHash, prediction, confidence, ttl = 300) {
        const key = `ml-prediction:${modelId}:${inputHash}`;
        const data = { prediction, confidence, timestamp: Date.now() };
        return await this.cacheService.set(key, data, ttl, in_memory_cache_service_1.CacheStrategy.TTL);
    }
    /**
     * Get cached ML prediction
     */
    async getMLPrediction(modelId, inputHash) {
        const key = `ml-prediction:${modelId}:${inputHash}`;
        return await this.cacheService.get(key);
    }
    /**
     * Invalidate cache based on triggers
     */
    async invalidateByTrigger(trigger) {
        let totalInvalidated = 0;
        for (const [pattern, rule] of this.invalidationRules) {
            if (rule.triggers.includes(trigger)) {
                const invalidated = await this.cacheService.flushPattern(pattern);
                totalInvalidated += invalidated;
                this.logger.info(`🗑️ Invalidated ${invalidated} cache entries for trigger: ${trigger}`);
            }
        }
        return totalInvalidated;
    }
    /**
     * Warm up cache with essential data
     */
    async warmUpCache(symbols, intervals) {
        this.logger.info('🔥 Starting cache warm-up...');
        const warmUpPromises = [];
        for (const symbol of symbols) {
            for (const interval of intervals) {
                // Placeholder for actual data fetching
                warmUpPromises.push(this.cacheService.set(`warm-up:${symbol}:${interval}`, { status: 'warming' }, 60));
            }
        }
        await Promise.all(warmUpPromises);
        this.logger.info('✅ Cache warm-up completed');
    }
    /**
     * Get cache statistics for monitoring
     */
    async getCacheStats() {
        const metrics = this.cacheService.getMetrics();
        // Note: In production, implement Redis INFO command parsing
        const keyCount = 0; // Placeholder
        const memoryUsage = '0 MB'; // Placeholder
        return {
            metrics,
            keyCount,
            memoryUsage,
            hitRate: metrics.hitRate
        };
    }
    /**
     * Setup automatic cache invalidation rules
     */
    setupInvalidationRules() {
        // Market data invalidation on new candle
        this.invalidationRules.set('market-data:*', {
            pattern: 'market-data:*',
            triggers: ['new-candle', 'market-open', 'market-close'],
            delay: 0
        });
        // Indicator invalidation on new market data
        this.invalidationRules.set('indicators:*', {
            pattern: 'indicators:*',
            triggers: ['new-candle', 'new-market-data'],
            delay: 5000 // 5 second delay to allow market data to settle
        });
        // Portfolio invalidation on trades
        this.invalidationRules.set('portfolio:*', {
            pattern: 'portfolio:*',
            triggers: ['trade-executed', 'position-closed', 'balance-update'],
            delay: 1000
        });
        // Signal invalidation on strategy updates
        this.invalidationRules.set('signal:*', {
            pattern: 'signal:*',
            triggers: ['strategy-update', 'parameter-change'],
            delay: 0
        });
    }
    /**
     * Generate hash for parameters to use as cache key
     */
    hashParameters(parameters) {
        const sorted = Object.keys(parameters)
            .sort()
            .reduce((result, key) => {
            result[key] = parameters[key];
            return result;
        }, {});
        // Simple hash implementation - in production use crypto.createHash
        return Buffer.from(JSON.stringify(sorted)).toString('base64');
    }
}
exports.TradingCacheManager = TradingCacheManager;
/**
 * Decorator for automatic caching of method results
 */
function Cacheable(options) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        descriptor.value = async function (...args) {
            // Note: This is a placeholder implementation
            // In production, this would integrate with the cache service
            return method.apply(this, args);
        };
    };
}
/**
 * Cache service provider for dependency injection
 */
class CacheProvider {
    static initialize(cacheService) {
        this.instance = new TradingCacheManager(cacheService);
    }
    static getInstance() {
        if (!this.instance) {
            throw new Error('CacheProvider not initialized. Call initialize() first.');
        }
        return this.instance;
    }
    static async shutdown() {
        if (this.instance) {
            // Graceful shutdown logic here
        }
    }
}
exports.CacheProvider = CacheProvider;

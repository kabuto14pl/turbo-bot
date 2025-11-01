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
 * 🗄️ IN-MEMORY CACHE SERVICE
 * Simplified cache implementation for testing without Redis dependency
 * Provides the same interface as Redis cache but uses in-memory storage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheServiceFactory = exports.InMemoryCacheService = exports.CacheStrategy = void 0;
const logger_1 = require("../../infrastructure/logging/logger");
var CacheStrategy;
(function (CacheStrategy) {
    CacheStrategy["TTL"] = "ttl";
    CacheStrategy["LRU"] = "lru";
    CacheStrategy["LFU"] = "lfu";
    CacheStrategy["FIFO"] = "fifo";
})(CacheStrategy || (exports.CacheStrategy = CacheStrategy = {}));
/**
 * In-memory cache service for testing and fallback
 */
class InMemoryCacheService {
    constructor(config, logger) {
        this.config = config;
        this.cache = new Map();
        this.logger = logger || new logger_1.Logger('InMemoryCacheService');
        this.metrics = {
            hits: 0,
            misses: 0,
            hitRate: 0,
            operations: 0,
            size: 0
        };
        // Cleanup expired entries every minute
        setInterval(() => this.cleanupExpired(), 60000);
        this.logger.info('🗄️ In-Memory Cache Service initialized');
    }
    /**
     * Store data in cache with TTL
     */
    async set(key, value, ttl, strategy = CacheStrategy.TTL) {
        try {
            const fullKey = this.buildKey(key);
            const serialized = JSON.stringify(value);
            const cacheTTL = ttl || this.config.defaultTTL;
            const expiry = Date.now() + (cacheTTL * 1000);
            // Check if we need to evict entries
            if (this.cache.size >= this.config.maxSize) {
                this.evictEntry(strategy);
            }
            this.cache.set(fullKey, {
                value: serialized,
                expiry,
                accessCount: 0,
                createdAt: Date.now()
            });
            this.updateMetrics('set');
            return true;
        }
        catch (error) {
            this.logger.error(`Cache set error for key ${key}:`, error);
            return false;
        }
    }
    /**
     * Retrieve data from cache
     */
    async get(key) {
        try {
            const fullKey = this.buildKey(key);
            const entry = this.cache.get(fullKey);
            if (!entry) {
                this.metrics.misses++;
                this.updateHitRate();
                return null;
            }
            // Check if expired
            if (entry.expiry < Date.now()) {
                this.cache.delete(fullKey);
                this.metrics.misses++;
                this.updateHitRate();
                return null;
            }
            // Update access count for LFU strategy
            entry.accessCount++;
            this.metrics.hits++;
            this.updateMetrics('get');
            return JSON.parse(entry.value);
        }
        catch (error) {
            this.logger.error(`Cache get error for key ${key}:`, error);
            this.metrics.misses++;
            this.updateHitRate();
            return null;
        }
    }
    /**
     * Multi-get for batch operations
     */
    async mget(keys) {
        const resultMap = new Map();
        for (const key of keys) {
            const value = await this.get(key);
            resultMap.set(key, value);
        }
        this.updateMetrics('mget');
        return resultMap;
    }
    /**
     * Delete cache entry
     */
    async del(key) {
        try {
            const fullKey = this.buildKey(key);
            const deleted = this.cache.delete(fullKey);
            this.updateMetrics('del');
            return deleted;
        }
        catch (error) {
            this.logger.error(`Cache delete error for key ${key}:`, error);
            return false;
        }
    }
    /**
     * Check if key exists
     */
    async exists(key) {
        try {
            const fullKey = this.buildKey(key);
            const entry = this.cache.get(fullKey);
            if (!entry) {
                return false;
            }
            // Check if expired
            if (entry.expiry < Date.now()) {
                this.cache.delete(fullKey);
                return false;
            }
            return true;
        }
        catch (error) {
            this.logger.error(`Cache exists error for key ${key}:`, error);
            return false;
        }
    }
    /**
     * Increment counter
     */
    async increment(key, value = 1, ttl) {
        try {
            const currentValue = await this.get(key) || 0;
            const newValue = currentValue + value;
            await this.set(key, newValue, ttl);
            this.updateMetrics('incr');
            return newValue;
        }
        catch (error) {
            this.logger.error(`Cache increment error for key ${key}:`, error);
            return 0;
        }
    }
    /**
     * Flush specific pattern
     */
    async flushPattern(pattern) {
        try {
            const fullPattern = this.buildKey(pattern.replace('*', ''));
            let deleted = 0;
            for (const key of this.cache.keys()) {
                if (key.includes(fullPattern)) {
                    this.cache.delete(key);
                    deleted++;
                }
            }
            this.updateMetrics('flush');
            return deleted;
        }
        catch (error) {
            this.logger.error(`Cache flush pattern error for pattern ${pattern}:`, error);
            return 0;
        }
    }
    /**
     * Get cache metrics
     */
    getMetrics() {
        this.metrics.size = this.cache.size;
        return { ...this.metrics };
    }
    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            hits: 0,
            misses: 0,
            hitRate: 0,
            operations: 0,
            size: this.cache.size
        };
    }
    /**
     * Graceful shutdown
     */
    async shutdown() {
        try {
            this.cache.clear();
            this.logger.info('✅ In-Memory cache service shutdown completed');
        }
        catch (error) {
            this.logger.error('❌ Cache service shutdown error:', error);
        }
    }
    // Private helper methods
    buildKey(key) {
        return `${this.config.keyPrefix}:${key}`;
    }
    updateMetrics(operation) {
        this.metrics.operations++;
        this.updateHitRate();
    }
    updateHitRate() {
        const total = this.metrics.hits + this.metrics.misses;
        this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
    }
    cleanupExpired() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiry < now) {
                this.cache.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            this.logger.debug(`🧹 Cleaned up ${cleaned} expired cache entries`);
        }
    }
    evictEntry(strategy) {
        if (this.cache.size === 0)
            return;
        let keyToEvict = null;
        switch (strategy) {
            case CacheStrategy.LRU:
                // Find least recently used (lowest accessCount)
                let lruAccessCount = Infinity;
                for (const [key, entry] of this.cache.entries()) {
                    if (entry.accessCount < lruAccessCount) {
                        lruAccessCount = entry.accessCount;
                        keyToEvict = key;
                    }
                }
                break;
            case CacheStrategy.LFU:
                // Find least frequently used
                let lfuAccessCount = Infinity;
                for (const [key, entry] of this.cache.entries()) {
                    if (entry.accessCount < lfuAccessCount) {
                        lfuAccessCount = entry.accessCount;
                        keyToEvict = key;
                    }
                }
                break;
            case CacheStrategy.FIFO:
                // Find oldest entry
                let oldestTime = Infinity;
                for (const [key, entry] of this.cache.entries()) {
                    if (entry.createdAt < oldestTime) {
                        oldestTime = entry.createdAt;
                        keyToEvict = key;
                    }
                }
                break;
            default:
                // Default: evict first entry
                const firstKey = this.cache.keys().next().value;
                keyToEvict = firstKey || null;
        }
        if (keyToEvict) {
            this.cache.delete(keyToEvict);
            this.logger.debug(`🗑️ Evicted cache entry: ${keyToEvict}`);
        }
    }
}
exports.InMemoryCacheService = InMemoryCacheService;
/**
 * Cache service factory for testing
 */
class CacheServiceFactory {
    static createForTesting() {
        const config = {
            defaultTTL: 300, // 5 minutes
            keyPrefix: 'test',
            maxSize: 1000
        };
        return new InMemoryCacheService(config);
    }
    static createForProduction() {
        const config = {
            defaultTTL: parseInt(process.env.CACHE_TTL || '3600'), // 1 hour
            keyPrefix: process.env.CACHE_PREFIX || 'trading-bot',
            maxSize: parseInt(process.env.CACHE_MAX_SIZE || '10000')
        };
        return new InMemoryCacheService(config);
    }
}
exports.CacheServiceFactory = CacheServiceFactory;

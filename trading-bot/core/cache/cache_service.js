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
 * 🗄️ ENTERPRISE CACHE SERVICE
 * High-performance Redis-based caching system with dependency injection
 * Supports multiple cache strategies and automatic invalidation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheServiceFactory = exports.CacheService = exports.CacheStrategy = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../../infrastructure/logging/logger");
var CacheStrategy;
(function (CacheStrategy) {
    CacheStrategy["TTL"] = "ttl";
    CacheStrategy["LRU"] = "lru";
    CacheStrategy["LFU"] = "lfu";
    CacheStrategy["FIFO"] = "fifo";
})(CacheStrategy || (exports.CacheStrategy = CacheStrategy = {}));
class CacheService {
    constructor(config, logger) {
        this.config = config;
        this.redis = null;
        this.fallbackCache = new Map();
        this.isRedisAvailable = false;
        this.logger = logger || new logger_1.Logger('CacheService');
        this.compressionEnabled = this.config.compressionThreshold > 0;
        this.metrics = {
            hits: 0,
            misses: 0,
            hitRate: 0,
            memory: 0,
            operations: 0
        };
        this.initializeRedis();
        this.logger.info('🗄️ Enterprise Cache Service initialized with fallback mode');
    }
    async initializeRedis() {
        try {
            this.redis = new ioredis_1.default({
                ...this.config.redis,
                lazyConnect: true,
                maxRetriesPerRequest: 3
            });
            this.setupEventHandlers();
            // Test connection
            await this.redis.ping();
            this.isRedisAvailable = true;
            this.logger.info('✅ Redis connected successfully');
        }
        catch (error) {
            this.logger.warn('⚠️ Redis unavailable, using in-memory fallback cache');
            this.isRedisAvailable = false;
            this.redis = null;
        }
    }
    setupEventHandlers() {
        if (!this.redis)
            return;
        this.redis.on('connect', () => this.logger.info('✅ Redis connected'));
        this.redis.on('error', (error) => {
            this.logger.error('❌ Redis error:', error);
            this.isRedisAvailable = false;
        });
        this.redis.on('ready', () => {
            this.logger.info('🚀 Redis ready');
            this.isRedisAvailable = true;
        });
        this.redis.on('close', () => {
            this.logger.warn('🔌 Redis connection closed');
            this.isRedisAvailable = false;
        });
    }
    /**
     * Store data in cache with automatic compression and TTL
     */
    async set(key, value, ttl, strategy = CacheStrategy.TTL) {
        try {
            const fullKey = this.buildKey(key);
            const serialized = this.serialize(value);
            const compressed = this.shouldCompress(serialized)
                ? await this.compress(serialized)
                : serialized;
            const cacheTTL = ttl || this.config.defaultTTL;
            // Use Redis if available
            if (this.isRedisAvailable && this.redis) {
                let result;
                switch (strategy) {
                    case CacheStrategy.TTL:
                        result = await this.redis.setex(fullKey, cacheTTL, compressed);
                        break;
                    case CacheStrategy.LRU:
                        await this.redis.set(fullKey, compressed);
                        await this.redis.expire(fullKey, cacheTTL);
                        result = 'OK';
                        break;
                    default:
                        result = await this.redis.setex(fullKey, cacheTTL, compressed);
                }
                this.updateMetrics('set');
                return result === 'OK';
            }
            else {
                // Fallback to in-memory cache
                const expiry = Date.now() + (cacheTTL * 1000);
                this.fallbackCache.set(fullKey, { value: compressed, expiry });
                this.cleanupExpiredFallbackEntries();
                this.updateMetrics('set');
                return true;
            }
        }
        catch (error) {
            this.logger.error(`Cache set error for key ${key}:`, error);
            return false;
        }
    }
    /**
     * Retrieve data from cache with automatic decompression
     */
    async get(key) {
        try {
            const fullKey = this.buildKey(key);
            // Use Redis if available
            if (this.isRedisAvailable && this.redis) {
                const cached = await this.redis.get(fullKey);
                if (cached === null) {
                    this.metrics.misses++;
                    this.updateHitRate();
                    return null;
                }
                this.metrics.hits++;
                this.updateMetrics('get');
                const decompressed = await this.decompress(cached);
                return this.deserialize(decompressed);
            }
            else {
                // Fallback to in-memory cache
                const cached = this.fallbackCache.get(fullKey);
                if (!cached || cached.expiry < Date.now()) {
                    if (cached) {
                        this.fallbackCache.delete(fullKey);
                    }
                    this.metrics.misses++;
                    this.updateHitRate();
                    return null;
                }
                this.metrics.hits++;
                this.updateMetrics('get');
                const decompressed = await this.decompress(cached.value);
                return this.deserialize(decompressed);
            }
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
        try {
            const fullKeys = keys.map(key => this.buildKey(key));
            const results = this.redis ? await this.redis.mget(...fullKeys) : [];
            const resultMap = new Map();
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const result = results[i];
                if (result === null) {
                    resultMap.set(key, null);
                    this.metrics.misses++;
                }
                else {
                    const decompressed = await this.decompress(result);
                    const deserialized = this.deserialize(decompressed);
                    resultMap.set(key, deserialized);
                    this.metrics.hits++;
                }
            }
            this.updateHitRate();
            this.updateMetrics('mget');
            return resultMap;
        }
        catch (error) {
            this.logger.error('Cache mget error:', error);
            return new Map();
        }
    }
    /**
     * Delete cache entry
     */
    async delete(key) {
        if (!this.isRedisAvailable) {
            return this.fallbackCache.delete(this.buildKey(key));
        }
        try {
            const fullKey = this.buildKey(key);
            const result = this.redis ? await this.redis.del(fullKey) : 0;
            this.updateMetrics('del');
            return result > 0;
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
            const result = this.redis ? await this.redis.exists(fullKey) : 0;
            return result === 1;
        }
        catch (error) {
            this.logger.error(`Cache exists error for key ${key}:`, error);
            return false;
        }
    }
    /**
     * Increment counter with optional TTL
     */
    async increment(key, value = 1, ttl) {
        try {
            const fullKey = this.buildKey(key);
            const result = this.redis ? await this.redis.incrby(fullKey, value) : 0;
            if (ttl && result === value && this.redis) {
                await this.redis.expire(fullKey, ttl);
            }
            this.updateMetrics('incr');
            return result;
        }
        catch (error) {
            this.logger.error(`Cache increment error for key ${key}:`, error);
            return 0;
        }
    }
    /**
     * Set with expiration at specific timestamp
     */
    async setWithExpirationAt(key, value, timestampMs) {
        try {
            const fullKey = this.buildKey(key);
            const serialized = this.serialize(value);
            const compressed = this.shouldCompress(serialized)
                ? await this.compress(serialized)
                : serialized;
            if (this.redis) {
                await this.redis.set(fullKey, compressed);
                const result = await this.redis.expireat(fullKey, Math.floor(timestampMs / 1000));
                this.updateMetrics('set');
                return result === 1;
            }
            return false;
        }
        catch (error) {
            this.logger.error(`Cache setWithExpirationAt error for key ${key}:`, error);
            return false;
        }
    }
    /**
     * Flush specific pattern
     */
    async flushPattern(pattern) {
        try {
            const fullPattern = this.buildKey(pattern);
            const keys = this.redis ? await this.redis.keys(fullPattern) : [];
            if (keys.length === 0) {
                return 0;
            }
            const result = this.redis ? await this.redis.del(...keys) : 0;
            this.updateMetrics('flush');
            return result;
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
            memory: 0,
            operations: 0
        };
    }
    /**
     * Graceful shutdown
     */
    async shutdown() {
        try {
            if (this.redis) {
                await this.redis.quit();
            }
            this.logger.info('✅ Cache service shutdown completed');
        }
        catch (error) {
            this.logger.error('❌ Cache service shutdown error:', error);
        }
    }
    // Private helper methods
    buildKey(key) {
        return `${this.config.keyPrefix}:${key}`;
    }
    serialize(value) {
        switch (this.config.serialization) {
            case 'json':
                return JSON.stringify(value);
            case 'msgpack':
                // Placeholder for msgpack implementation
                return JSON.stringify(value);
            default:
                return JSON.stringify(value);
        }
    }
    deserialize(value) {
        switch (this.config.serialization) {
            case 'json':
                return JSON.parse(value);
            case 'msgpack':
                // Placeholder for msgpack implementation
                return JSON.parse(value);
            default:
                return JSON.parse(value);
        }
    }
    shouldCompress(data) {
        return this.compressionEnabled && data.length > this.config.compressionThreshold;
    }
    async compress(data) {
        // Placeholder for compression implementation (zlib/gzip)
        return data;
    }
    async decompress(data) {
        // Placeholder for decompression implementation
        return data;
    }
    /**
     * Clean up expired entries from fallback cache
     */
    cleanupExpiredFallbackEntries() {
        const now = Date.now();
        for (const [key, entry] of this.fallbackCache.entries()) {
            if (entry.expiry <= now) {
                this.fallbackCache.delete(key);
            }
        }
    }
    updateMetrics(operation) {
        this.metrics.operations++;
        this.updateHitRate();
    }
    updateHitRate() {
        const total = this.metrics.hits + this.metrics.misses;
        this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
    }
}
exports.CacheService = CacheService;
/**
 * Cache service factory with environment-specific configurations
 */
class CacheServiceFactory {
    static createForTesting() {
        const config = {
            redis: {
                host: 'localhost',
                port: 6379,
                db: 15, // Testing database
                maxRetriesPerRequest: 3,
                lazyConnect: true
            },
            defaultTTL: 300, // 5 minutes
            keyPrefix: 'test',
            compressionThreshold: 1024,
            serialization: 'json'
        };
        return new CacheService(config);
    }
    static createForProduction() {
        const config = {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
                db: parseInt(process.env.REDIS_DB || '0'),
                maxRetriesPerRequest: 5,
                connectTimeout: 3000,
                enableReadyCheck: true
            },
            defaultTTL: parseInt(process.env.CACHE_TTL || '3600'), // 1 hour
            keyPrefix: process.env.CACHE_PREFIX || 'trading-bot',
            compressionThreshold: parseInt(process.env.CACHE_COMPRESSION_THRESHOLD || '2048'),
            serialization: process.env.CACHE_SERIALIZATION || 'json'
        };
        return new CacheService(config);
    }
}
exports.CacheServiceFactory = CacheServiceFactory;

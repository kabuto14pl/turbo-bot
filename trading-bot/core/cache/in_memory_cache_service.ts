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

import { Logger } from '../../infrastructure/logging/logger';

export interface CacheConfig {
  defaultTTL: number;
  keyPrefix: string;
  maxSize: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  operations: number;
  size: number;
}

export enum CacheStrategy {
  TTL = 'ttl',
  LRU = 'lru',
  LFU = 'lfu',
  FIFO = 'fifo'
}

interface CacheEntry {
  value: string;
  expiry: number;
  accessCount: number;
  createdAt: number;
}

/**
 * In-memory cache service for testing and fallback
 */
export class InMemoryCacheService {
  private cache = new Map<string, CacheEntry>();
  private logger: Logger;
  private metrics: CacheMetrics;

  constructor(
    private config: CacheConfig,
    logger?: Logger
  ) {
    this.logger = logger || new Logger('InMemoryCacheService');
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
  async set<T>(
    key: string, 
    value: T, 
    ttl?: number,
    strategy: CacheStrategy = CacheStrategy.TTL
  ): Promise<boolean> {
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
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Retrieve data from cache
   */
  async get<T>(key: string): Promise<T | null> {
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
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Multi-get for batch operations
   */
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const resultMap = new Map<string, T | null>();
    
    for (const key of keys) {
      const value = await this.get<T>(key);
      resultMap.set(key, value);
    }
    
    this.updateMetrics('mget');
    return resultMap;
  }

  /**
   * Delete cache entry
   */
  async del(key: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      const deleted = this.cache.delete(fullKey);
      this.updateMetrics('del');
      return deleted;
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
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
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment counter
   */
  async increment(key: string, value: number = 1, ttl?: number): Promise<number> {
    try {
      const currentValue = await this.get<number>(key) || 0;
      const newValue = currentValue + value;
      await this.set(key, newValue, ttl);
      this.updateMetrics('incr');
      return newValue;
    } catch (error) {
      this.logger.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Flush specific pattern
   */
  async flushPattern(pattern: string): Promise<number> {
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
    } catch (error) {
      this.logger.error(`Cache flush pattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    this.metrics.size = this.cache.size;
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
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
  async shutdown(): Promise<void> {
    try {
      this.cache.clear();
      this.logger.info('✅ In-Memory cache service shutdown completed');
    } catch (error) {
      this.logger.error('❌ Cache service shutdown error:', error);
    }
  }

  // Private helper methods
  private buildKey(key: string): string {
    return `${this.config.keyPrefix}:${key}`;
  }

  private updateMetrics(operation: string): void {
    this.metrics.operations++;
    this.updateHitRate();
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }

  private cleanupExpired(): void {
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

  private evictEntry(strategy: CacheStrategy): void {
    if (this.cache.size === 0) return;
    
    let keyToEvict: string | null = null;
    
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

/**
 * Cache service factory for testing
 */
export class CacheServiceFactory {
  static createForTesting(): InMemoryCacheService {
    const config: CacheConfig = {
      defaultTTL: 300, // 5 minutes
      keyPrefix: 'test',
      maxSize: 1000
    };
    
    return new InMemoryCacheService(config);
  }

  static createForProduction(): InMemoryCacheService {
    const config: CacheConfig = {
      defaultTTL: parseInt(process.env.CACHE_TTL || '3600'), // 1 hour
      keyPrefix: process.env.CACHE_PREFIX || 'trading-bot',
      maxSize: parseInt(process.env.CACHE_MAX_SIZE || '10000')
    };
    
    return new InMemoryCacheService(config);
  }
}

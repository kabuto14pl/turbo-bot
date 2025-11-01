/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🔧 PERFORMANCE CACHE MANAGER
 * Redis-based caching for reducing RAM usage and CPU load
 */

import Redis from 'ioredis';
import { EventEmitter } from 'events';

export interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  defaultTTL: number; // seconds
  maxMemoryMB: number; // MB limit for i3 hardware
  enableCompression: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
  keyCount: number;
  connectionsActive: number;
}

export class PerformanceCacheManager extends EventEmitter {
  private redis!: Redis;
  private config: CacheConfig;
  private stats: CacheStats;
  private compressionEnabled: boolean;

  constructor(config: CacheConfig) {
    super();
    this.config = config;
    this.compressionEnabled = config.enableCompression;
    
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      memoryUsage: 0,
      keyCount: 0,
      connectionsActive: 0
    };

    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private initializeRedis(): void {
    console.log('🔄 Initializing Redis cache...');
    
    this.redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.redis.on('connect', () => {
      console.log('✅ Redis cache connected');
      this.emit('connected');
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis cache error:', error);
      this.emit('error', error);
    });

    this.redis.on('ready', () => {
      console.log('🚀 Redis cache ready');
      this.setupMemoryLimits();
    });
  }

  /**
   * Setup memory limits for i3 hardware
   */
  private async setupMemoryLimits(): Promise<void> {
    try {
      // Set memory limit (convert MB to bytes)
      const maxMemoryBytes = this.config.maxMemoryMB * 1024 * 1024;
      await this.redis.config('SET', 'maxmemory', maxMemoryBytes.toString());
      await this.redis.config('SET', 'maxmemory-policy', 'allkeys-lru');
      
      console.log(`🔧 Redis memory limit set to ${this.config.maxMemoryMB}MB`);
    } catch (error) {
      console.error('❌ Failed to set Redis memory limits:', error);
    }
  }

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      
      if (value === null) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();

      // Decompress if enabled
      const data = this.compressionEnabled ? this.decompress(value) : value;
      
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`❌ Cache get error for key ${key}:`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set cached data
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      let data = JSON.stringify(value);
      
      // Compress if enabled
      if (this.compressionEnabled) {
        data = this.compress(data);
      }

      const finalTTL = ttl || this.config.defaultTTL;
      
      const result = await this.redis.setex(key, finalTTL, data);
      return result === 'OK';
    } catch (error) {
      console.error(`❌ Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set multiple keys at once (batch operation)
   */
  async mset(keyValuePairs: Array<{key: string, value: any, ttl?: number}>): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();
      
      for (const pair of keyValuePairs) {
        let data = JSON.stringify(pair.value);
        
        if (this.compressionEnabled) {
          data = this.compress(data);
        }
        
        const ttl = pair.ttl || this.config.defaultTTL;
        pipeline.setex(pair.key, ttl, data);
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('❌ Cache mset error:', error);
      return false;
    }
  }

  /**
   * Delete cached data
   */
  async del(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      console.error(`❌ Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`❌ Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all cache data
   */
  async clear(): Promise<boolean> {
    try {
      await this.redis.flushdb();
      console.log('🗑️ Cache cleared');
      return true;
    } catch (error) {
      console.error('❌ Cache clear error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;
      
      const keyCount = await this.redis.dbsize();
      
      this.stats.memoryUsage = Math.round(memoryUsage / 1024 / 1024); // Convert to MB
      this.stats.keyCount = keyCount;
      this.stats.connectionsActive = 1; // Single connection
      
      return { ...this.stats };
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      return this.stats;
    }
  }

  /**
   * Cache sentiment analysis data
   */
  async cacheSentimentData(symbol: string, data: any, ttl: number = 1800): Promise<boolean> {
    const key = `sentiment:${symbol}:${Date.now()}`;
    return this.set(key, data, ttl); // 30 minutes TTL
  }

  /**
   * Get cached sentiment data
   */
  async getCachedSentimentData(symbol: string): Promise<any | null> {
    const pattern = `sentiment:${symbol}:*`;
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return null;
      
      // Get the most recent
      const latestKey = keys.sort().pop();
      return latestKey ? this.get(latestKey) : null;
    } catch (error) {
      console.error('❌ Error getting cached sentiment data:', error);
      return null;
    }
  }

  /**
   * Cache indicator data
   */
  async cacheIndicatorData(symbol: string, timeframe: string, indicators: any): Promise<boolean> {
    const key = `indicators:${symbol}:${timeframe}`;
    return this.set(key, indicators, 300); // 5 minutes TTL
  }

  /**
   * Get cached indicator data
   */
  async getCachedIndicatorData(symbol: string, timeframe: string): Promise<any | null> {
    const key = `indicators:${symbol}:${timeframe}`;
    return this.get(key);
  }

  /**
   * Cache ML predictions
   */
  async cacheMLPrediction(modelId: string, inputHash: string, prediction: any): Promise<boolean> {
    const key = `ml:${modelId}:${inputHash}`;
    return this.set(key, prediction, 900); // 15 minutes TTL
  }

  /**
   * Get cached ML prediction
   */
  async getCachedMLPrediction(modelId: string, inputHash: string): Promise<any | null> {
    const key = `ml:${modelId}:${inputHash}`;
    return this.get(key);
  }

  /**
   * Simple compression (for demo - use proper compression library in production)
   */
  private compress(data: string): string {
    // Placeholder - implement actual compression
    return data;
  }

  /**
   * Simple decompression
   */
  private decompress(data: string): string {
    // Placeholder - implement actual decompression
    return data;
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Start periodic cleanup for memory optimization
   */
  startPeriodicCleanup(): void {
    // Clean up expired keys every 5 minutes
    setInterval(async () => {
      try {
        console.log('🧹 Running periodic cache cleanup...');
        const stats = await this.getStats();
        
        // If memory usage is high, force cleanup
        if (stats.memoryUsage > this.config.maxMemoryMB * 0.8) {
          console.log('⚠️ High memory usage detected, forcing cleanup');
          // Redis will automatically evict based on LRU policy
        }
        
        console.log(`📊 Cache stats: ${stats.keyCount} keys, ${stats.memoryUsage}MB used, ${stats.hitRate.toFixed(1)}% hit rate`);
      } catch (error) {
        console.error('❌ Periodic cleanup error:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    console.log('🔄 Disconnecting from Redis...');
    await this.redis.quit();
    console.log('✅ Redis disconnected');
  }
}

export default PerformanceCacheManager;

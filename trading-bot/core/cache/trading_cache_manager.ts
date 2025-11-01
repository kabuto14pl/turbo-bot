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

import { InMemoryCacheService, CacheStrategy } from './in_memory_cache_service';
import { Logger } from '../../infrastructure/logging/logger';
import { MarketData } from '../types/market_data';
import { TradeSignal } from '../types/trade_signal';
import { Position } from '../types/index';

// Define PortfolioState interface
export interface PortfolioState {
  accountId: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  positions: Position[];
  timestamp: number;
}

export interface CacheableData {
  key: string;
  ttl?: number;
  strategy?: CacheStrategy;
  tags?: string[];
}

export interface CacheInvalidationRule {
  pattern: string;
  triggers: string[];
  delay?: number;
}

/**
 * Trading-specific cache integration with automatic invalidation
 */
export class TradingCacheManager {
  private invalidationRules: Map<string, CacheInvalidationRule> = new Map();
  private logger: Logger;

  constructor(
    private cacheService: InMemoryCacheService,
    logger?: Logger
  ) {
    this.logger = logger || new Logger('TradingCacheManager');
    this.setupInvalidationRules();
    this.logger.info('🔧 Trading Cache Manager initialized');
  }

  /**
   * Cache market data with symbol-specific TTL
   */
  async cacheMarketData(
    symbol: string, 
    interval: string, 
    data: MarketData[], 
    ttl: number = 300
  ): Promise<boolean> {
    const key = `market-data:${symbol}:${interval}`;
    return await this.cacheService.set(key, data, ttl, CacheStrategy.TTL);
  }

  /**
   * Retrieve cached market data
   */
  async getMarketData(symbol: string, interval: string): Promise<MarketData[] | null> {
    const key = `market-data:${symbol}:${interval}`;
    return await this.cacheService.get<MarketData[]>(key);
  }

  /**
   * Cache trade signals with short TTL for real-time trading
   */
  async cacheTradeSignal(
    strategyId: string, 
    symbol: string, 
    signal: TradeSignal, 
    ttl: number = 60
  ): Promise<boolean> {
    const timestamp = Date.now();
    const key = `signal:${strategyId}:${symbol}:${timestamp}`;
    const cached = await this.cacheService.set(key, signal, ttl, CacheStrategy.FIFO);
    
    // Set latest signal pointer for quick access
    const latestKey = `latest-signal:${strategyId}:${symbol}`;
    await this.cacheService.set(latestKey, key, ttl * 2);
    
    return cached;
  }

  /**
   * Get latest signal for strategy-symbol combination
   */
  async getLatestSignal(strategyId: string, symbol: string): Promise<TradeSignal | null> {
    const latestKey = `latest-signal:${strategyId}:${symbol}`;
    const signalKey = await this.cacheService.get<string>(latestKey);
    
    if (!signalKey) {
      return null;
    }
    
    return await this.cacheService.get<TradeSignal>(signalKey);
  }

  /**
   * Cache portfolio state with LRU strategy
   */
  async cachePortfolioState(
    accountId: string, 
    portfolio: PortfolioState, 
    ttl: number = 300
  ): Promise<boolean> {
    const key = `portfolio:${accountId}`;
    return await this.cacheService.set(key, portfolio, ttl, CacheStrategy.LRU);
  }

  /**
   * Get cached portfolio state
   */
  async getPortfolioState(accountId: string): Promise<PortfolioState | null> {
    const key = `portfolio:${accountId}`;
    return await this.cacheService.get<PortfolioState>(key);
  }

  /**
   * Cache computed indicators with automatic invalidation on new data
   */
  async cacheIndicators(
    symbol: string, 
    interval: string, 
    indicators: Record<string, number[]>, 
    ttl: number = 600
  ): Promise<boolean> {
    const key = `indicators:${symbol}:${interval}`;
    return await this.cacheService.set(key, indicators, ttl, CacheStrategy.TTL);
  }

  /**
   * Get cached indicators
   */
  async getIndicators(
    symbol: string, 
    interval: string
  ): Promise<Record<string, number[]> | null> {
    const key = `indicators:${symbol}:${interval}`;
    return await this.cacheService.get<Record<string, number[]>>(key);
  }

  /**
   * Cache backtest results with long TTL
   */
  async cacheBacktestResults(
    strategyId: string, 
    parameters: Record<string, any>, 
    results: any, 
    ttl: number = 3600
  ): Promise<boolean> {
    const paramHash = this.hashParameters(parameters);
    const key = `backtest:${strategyId}:${paramHash}`;
    return await this.cacheService.set(key, results, ttl, CacheStrategy.LFU);
  }

  /**
   * Get cached backtest results
   */
  async getBacktestResults(
    strategyId: string, 
    parameters: Record<string, any>
  ): Promise<any | null> {
    const paramHash = this.hashParameters(parameters);
    const key = `backtest:${strategyId}:${paramHash}`;
    return await this.cacheService.get(key);
  }

  /**
   * Cache optimization results
   */
  async cacheOptimizationResults(
    strategyId: string, 
    optimizationType: string, 
    results: any, 
    ttl: number = 7200
  ): Promise<boolean> {
    const key = `optimization:${strategyId}:${optimizationType}`;
    return await this.cacheService.set(key, results, ttl, CacheStrategy.LRU);
  }

  /**
   * Rate limiting cache for API calls
   */
  async checkRateLimit(
    endpoint: string, 
    limit: number, 
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
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
  async cacheMLPrediction(
    modelId: string, 
    inputHash: string, 
    prediction: any, 
    confidence: number,
    ttl: number = 300
  ): Promise<boolean> {
    const key = `ml-prediction:${modelId}:${inputHash}`;
    const data = { prediction, confidence, timestamp: Date.now() };
    return await this.cacheService.set(key, data, ttl, CacheStrategy.TTL);
  }

  /**
   * Get cached ML prediction
   */
  async getMLPrediction(
    modelId: string, 
    inputHash: string
  ): Promise<{ prediction: any; confidence: number; timestamp: number } | null> {
    const key = `ml-prediction:${modelId}:${inputHash}`;
    return await this.cacheService.get(key);
  }

  /**
   * Invalidate cache based on triggers
   */
  async invalidateByTrigger(trigger: string): Promise<number> {
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
  async warmUpCache(symbols: string[], intervals: string[]): Promise<void> {
    this.logger.info('🔥 Starting cache warm-up...');
    
    const warmUpPromises: Promise<any>[] = [];
    
    for (const symbol of symbols) {
      for (const interval of intervals) {
        // Placeholder for actual data fetching
        warmUpPromises.push(
          this.cacheService.set(
            `warm-up:${symbol}:${interval}`, 
            { status: 'warming' }, 
            60
          )
        );
      }
    }
    
    await Promise.all(warmUpPromises);
    this.logger.info('✅ Cache warm-up completed');
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(): Promise<{
    metrics: any;
    keyCount: number;
    memoryUsage: string;
    hitRate: number;
  }> {
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
  private setupInvalidationRules(): void {
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
  private hashParameters(parameters: Record<string, any>): string {
    const sorted = Object.keys(parameters)
      .sort()
      .reduce((result, key) => {
        result[key] = parameters[key];
        return result;
      }, {} as Record<string, any>);
    
    // Simple hash implementation - in production use crypto.createHash
    return Buffer.from(JSON.stringify(sorted)).toString('base64');
  }
}

/**
 * Decorator for automatic caching of method results
 */
export function Cacheable(options: {
  ttl?: number;
  strategy?: CacheStrategy;
  keyGenerator?: (args: any[]) => string;
}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // Note: This is a placeholder implementation
      // In production, this would integrate with the cache service
      return method.apply(this, args);
    };
  };
}

/**
 * Cache service provider for dependency injection
 */
export class CacheProvider {
  private static instance: TradingCacheManager;
  
  static initialize(cacheService: InMemoryCacheService): void {
    this.instance = new TradingCacheManager(cacheService);
  }
  
  static getInstance(): TradingCacheManager {
    if (!this.instance) {
      throw new Error('CacheProvider not initialized. Call initialize() first.');
    }
    return this.instance;
  }
  
  static async shutdown(): Promise<void> {
    if (this.instance) {
      // Graceful shutdown logic here
    }
  }
}

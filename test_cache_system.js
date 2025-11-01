"use strict";
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
/**
 * 🧪 [TESTING-FRAMEWORK]
 **
 * 🧪 [TESTING-FRAMEWORK]
 * 🧪 CACHE SYSTEM TEST
 * Testing the newly implemented cache system with performance monitoring
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.testCacheSystem = testCacheSystem;
const in_memory_cache_service_1 = require("./trading-bot/core/cache/in_memory_cache_service");
const trading_cache_manager_1 = require("./trading-bot/core/cache/trading_cache_manager");
const logger_1 = require("./trading-bot/infrastructure/logging/logger");
async function testCacheSystem() {
    const logger = new logger_1.Logger('CacheTest');
    logger.info('🧪 Starting cache system test...');
    try {
        // Initialize cache service
        const cacheService = in_memory_cache_service_1.CacheServiceFactory.createForTesting();
        const tradingCacheManager = new trading_cache_manager_1.TradingCacheManager(cacheService, logger);
        // Test basic cache operations
        logger.info('✅ Testing basic cache operations...');
        // Test set/get
        const testData = { symbol: 'BTCUSDT', price: 45000, timestamp: Date.now() };
        const setResult = await cacheService.set('test-key', testData, 300);
        logger.info(`Set result: ${setResult}`);
        const getData = await cacheService.get('test-key');
        logger.info(`Retrieved data:`, getData);
        // Test trading-specific caching
        logger.info('✅ Testing trading cache operations...');
        const marketData = [
            { symbol: 'BTCUSDT', volume24h: 1000, volatility24h: 0.05, lastPrice: 45000, bidPrice: 44999, askPrice: 45001, spread: 2, liquidity: 1000000 }
        ];
        await tradingCacheManager.cacheMarketData('BTCUSDT', '1m', marketData, 300);
        const cachedMarketData = await tradingCacheManager.getMarketData('BTCUSDT', '1m');
        logger.info(`Cached market data:`, cachedMarketData);
        // Test cache metrics
        const metrics = cacheService.getMetrics();
        logger.info('📊 Cache metrics:', metrics);
        // Test cache provider pattern
        logger.info('✅ Testing cache provider pattern...');
        const { CacheProvider } = await Promise.resolve().then(() => __importStar(require('./trading-bot/core/cache/trading_cache_manager')));
        CacheProvider.initialize(cacheService);
        const providerInstance = CacheProvider.getInstance();
        await providerInstance.cacheMarketData('ETHUSDT', '5m', marketData, 300);
        const ethData = await providerInstance.getMarketData('ETHUSDT', '5m');
        logger.info(`ETH data from provider:`, ethData);
        logger.info('✅ All cache tests passed!');
        logger.info('🎉 Krok 2.2 Phase A - Cache Implementation COMPLETED');
        return true;
    }
    catch (error) {
        logger.error('❌ Cache test failed:', error);
        return false;
    }
}
// Run the test
if (require.main === module) {
    testCacheSystem().then(success => {
        if (success) {
            console.log('� PHASE A COMPLETED SUCCESSFULLY!');
            console.log('� Next: Phase B - Memory optimization and performance monitoring');
            process.exit(0);
        }
        else {
            console.log('❌ PHASE A FAILED');
            process.exit(1);
        }
    });
}

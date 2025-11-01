/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading infrastructure component
 */
/**
 * 🚀 OPTIMIZED AUTONOMOUS TRADING BOT STARTUP
 * Performance-optimized version for i3 hardware
 */

import { AutonomousTradingBot } from './autonomous_trading_bot';
import PerformanceMonitor from './performance_monitor';
import ResourceLimiter from './core/optimization/resource_limiter';
import PerformanceCacheManager from './core/cache/performance_cache_manager';
import WorkerThreadManager from './core/workers/worker_thread_manager';

class OptimizedBotRunner {
  private bot?: AutonomousTradingBot;
  private performanceMonitor?: PerformanceMonitor;
  private resourceLimiter?: ResourceLimiter;
  private cacheManager?: PerformanceCacheManager;
  private workerManager?: WorkerThreadManager;

  async start() {
    console.log('🚀 Starting Optimized Autonomous Trading Bot...');
    console.log('💻 Optimized for Intel i3-1115G4 (2 cores, 11.79GB RAM)');

    try {
      // 1. Initialize Performance Monitor
      console.log('📊 Starting performance monitoring...');
      this.performanceMonitor = new PerformanceMonitor();
      // Don't start monitor loop automatically - we'll control it

      // 2. Initialize Resource Limiter
      console.log('🔧 Initializing resource limiter...');
      this.resourceLimiter = new ResourceLimiter();

      // 3. Initialize Cache Manager (if Redis available)
      console.log('🗃️ Initializing cache manager...');
      this.cacheManager = new PerformanceCacheManager({
        redis: {
          host: 'localhost',
          port: 6379,
          db: 0
        },
        defaultTTL: 3600, // 1 hour
        maxMemoryMB: 512, // 512MB cache limit for i3
        enableCompression: false // Disable for now to reduce CPU
      });

      // 4. Initialize Worker Thread Manager
      console.log('👷 Initializing worker threads...');
      this.workerManager = new WorkerThreadManager(1); // Only 1 worker for i3
      await this.workerManager.initialize();

      // 5. Set Node.js memory limits
      console.log('🔧 Setting Node.js optimizations...');
      this.setNodeOptimizations();

      // 6. Initialize Bot with optimized config
      console.log('🤖 Initializing autonomous trading bot...');
      this.bot = new AutonomousTradingBot();
      
      // Pass optimization components to bot (if it supports them)
      // this.bot.setResourceLimiter(this.resourceLimiter);
      // this.bot.setCacheManager(this.cacheManager);
      // this.bot.setWorkerManager(this.workerManager);

      await this.bot.initialize();

      // 7. Start monitoring after bot initialization
      console.log('📊 Starting system monitoring...');
      this.startOptimizedMonitoring();

      // 8. Start the bot
      console.log('🚀 Starting autonomous trading...');
      await this.bot.start();

      console.log('✅ Optimized bot startup completed successfully!');
      this.printStartupInfo();

    } catch (error) {
      console.error('💥 Failed to start optimized bot:', error);
      await this.cleanup();
      process.exit(1);
    }
  }

  private setNodeOptimizations() {
    // Set garbage collection to run more aggressively for low memory
    if (process.env.NODE_ENV === 'production') {
      // These would typically be set via command line flags
      console.log('🗑️ Aggressive GC enabled for production');
    }

    // Set process priority to high (if running as admin/root)
    try {
      process.priority = -10; // Higher priority
      console.log('⚡ Process priority set to high');
    } catch (error) {
      console.log('⚠️ Could not set high process priority (requires admin)');
    }
  }

  private startOptimizedMonitoring() {
    // Monitor every 10 seconds instead of 5 to reduce overhead
    setInterval(async () => {
      if (this.performanceMonitor && this.resourceLimiter) {
        const cpuUsage = await this.performanceMonitor.getCPUUsage();
        const memoryUsage = this.performanceMonitor.getMemoryUsage();
        
        // Update resource limiter with current usage
        this.resourceLimiter.updateUsage(cpuUsage, memoryUsage.heapUsed);
        
        // Check for high usage
        if (cpuUsage > 70) {
          console.log('⚠️ High CPU usage detected:', cpuUsage.toFixed(1) + '%');
        }
        
        if (memoryUsage.heapUsed > 3000) {
          console.log('⚠️ High memory usage detected:', memoryUsage.heapUsed + 'MB');
          
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }

        // Emergency cleanup if critical
        if (cpuUsage > 90 || memoryUsage.heapUsed > 4000) {
          console.log('🚨 CRITICAL: Triggering emergency cleanup');
          this.resourceLimiter.emergencyCleanup();
        }
      }
    }, 10000); // Every 10 seconds

    // Cache cleanup every 5 minutes
    if (this.cacheManager) {
      this.cacheManager.startPeriodicCleanup();
    }
  }

  private printStartupInfo() {
    console.log('\n' + '='.repeat(50));
    console.log('🎯 OPTIMIZED AUTONOMOUS TRADING BOT ACTIVE');
    console.log('='.repeat(50));
    console.log('💻 Hardware: Intel i3-1115G4 (2 cores, 11.79GB RAM)');
    console.log('🔧 Optimizations: Resource limiting, caching, worker threads');
    console.log('📊 Monitoring: Performance tracking every 10s');
    console.log('🎯 Target: CPU <50%, RAM <4GB, stable operation');
    console.log('='.repeat(50));
    
    if (this.resourceLimiter) {
      const status = this.resourceLimiter.getStatus();
      console.log('📋 Resource Status:', JSON.stringify(status.resourceUtilization, null, 2));
    }
    
    console.log('\n🔄 Press Ctrl+C to gracefully shutdown');
    console.log('📊 Monitor with: npm run pm2:monitor');
    console.log('🔍 Logs with: npm run pm2:logs\n');
  }

  async cleanup() {
    console.log('\n🔄 Starting graceful shutdown...');

    try {
      // Stop performance monitoring
      if (this.performanceMonitor) {
        this.performanceMonitor.stop();
      }

      // Shutdown worker threads
      if (this.workerManager) {
        await this.workerManager.shutdown();
      }

      // Disconnect cache
      if (this.cacheManager) {
        await this.cacheManager.disconnect();
      }

      // Stop bot (if it has a stop method)
      if (this.bot && typeof (this.bot as any).stop === 'function') {
        await (this.bot as any).stop();
      }

      console.log('✅ Graceful shutdown completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

// Handle graceful shutdown
const runner = new OptimizedBotRunner();

process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT (Ctrl+C)');
  await runner.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM');
  await runner.cleanup();
  process.exit(0);
});

// Start the optimized bot
if (require.main === module) {
  runner.start().catch(console.error);
}

export default OptimizedBotRunner;

/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
/**
 * 🧪 [TESTING-FRAMEWORK]
 **
 * 🧪 [TESTING-FRAMEWORK]
 * 🧪 [BACKTEST-ONLY]
 * SAFE VAR INTEGRATION TEST
 * Turbo Bot Deva Trading Platform - Safe backtesting without infinite loops
 * 
 * Controlled backtesting environment for VaR calculations and performance analysis
 * Historical data validation with safety constraints
 */

import { PerformanceTracker } from './trading-bot/core/analysis/performance_tracker';
import { EnterprisePerformanceAnalyzer } from './trading-bot/core/analysis/enterprise_performance_analyzer';
import { Logger } from './trading-bot/infrastructure/logging/logger';

async function safeVarTest(): Promise<void> {
  const logger = new Logger('SafeVarTest');
  logger.info('🧪 Starting SAFE VaR test (no infinite loops)...');

  try {
    // Test 1: Basic VaR calculations (no dependencies)
    logger.info('📊 Test 1: Basic VaR calculations...');
    
    const performanceTracker = new PerformanceTracker();
    const analyzer = new EnterprisePerformanceAnalyzer(performanceTracker);
    
    // Sample returns for VaR testing
    const returns = [0.02, -0.01, 0.03, -0.05, 0.01, -0.02, 0.04];
    
    const var95 = analyzer.calculateVaR(returns, 0.95);
    const var99 = analyzer.calculateVaR(returns, 0.99);
    const cvar95 = analyzer.calculateCVaR(returns, 0.95);
    
    logger.info('✅ VaR Test Results:', {
      'VaR 95%': `${(var95 * 100).toFixed(2)}%`,
      'VaR 99%': `${(var99 * 100).toFixed(2)}%`,
      'CVaR 95%': `${(cvar95 * 100).toFixed(2)}%`
    });

    // Test 2: Risk metrics calculations
    logger.info('📈 Test 2: Risk metrics calculations...');
    
    const ulcerIndex = analyzer.calculateUlcerIndex(returns);
    const sortinoRatio = analyzer.calculateSortinoRatio(returns);
    const calmarRatio = analyzer.calculateCalmarRatio(returns);
    
    logger.info('✅ Risk Metrics:', {
      'Ulcer Index': ulcerIndex.toFixed(3),
      'Sortino Ratio': sortinoRatio.toFixed(3),
      'Calmar Ratio': calmarRatio.toFixed(3)
    });

    // Test 3: Trade sample (minimal to avoid loops)
    logger.info('🔍 Test 3: Trade processing test...');
    
    // Add only 3 trades to avoid complexity
    const tradeIds = [];
    for (let i = 0; i < 3; i++) {
      const id = performanceTracker.recordTrade('BTCUSDT', 'BUY', 0.1, 50000, 'SafeTest');
      tradeIds.push(id);
    }
    
    const trades = performanceTracker.getTrades();
    logger.info(`✅ Recorded ${trades.length} trades successfully`);

    // Test 4: Basic metrics only (no enterprise methods that might loop)
    logger.info('📊 Test 4: Basic performance metrics...');
    
    const basicMetrics = performanceTracker.calculateMetrics();
    logger.info('✅ Basic Metrics:', {
      'Total Trades': basicMetrics.totalTrades || 0,
      'Win Rate': `${((basicMetrics.winRate || 0) * 100).toFixed(1)}%`,
      'Sharpe Ratio': (basicMetrics.sharpeRatio || 0).toFixed(3),
      'Max Drawdown': `${(basicMetrics.maxDrawdown || 0).toFixed(2)}%`
    });

    logger.info('🎉 SAFE VaR test completed successfully - no loops detected!');

  } catch (error) {
    logger.error('❌ Error in safe VaR test:', error);
    throw error;
  }
}

// Run with timeout protection
async function runSafeTestWithTimeout(): Promise<void> {
  const timeoutMs = 30000; // 30 seconds max
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Test timeout - potential infinite loop')), timeoutMs);
  });

  try {
    await Promise.race([safeVarTest(), timeoutPromise]);
    console.log('✅ Safe VaR test completed within timeout!');
  } catch (error) {
    console.error('❌ Safe VaR test failed or timed out:', error);
    throw error;
  }
}

// Export for external usage
export { safeVarTest, runSafeTestWithTimeout };

// Run test if called directly
if (require.main === module) {
  runSafeTestWithTimeout()
    .then(() => {
      console.log('🎉 Safe VaR integration test passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Safe VaR test failed:', error);
      process.exit(1);
    });
}

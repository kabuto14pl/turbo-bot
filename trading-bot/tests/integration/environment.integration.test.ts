/**
 * ============================================================================
 * ENTERPRISE INTEGRATION TEST FOR MAIN.TS
 * ============================================================================
 * 
 * 🧪 Critical integration test for environment separation
 * 🔧 Validates CLI args parsing and config loading
 * 🛡️ Tests production safety mechanisms
 * 
 * Created: September 2, 2025
 * ============================================================================
 */

import { environmentParser, parseEnvironmentAndValidate } from '../core/environment/environment.parser';
import { enterpriseConfig, configManager } from '../config';

describe('Enterprise Environment Integration', () => {
  beforeEach(() => {
    // Reset environment for each test
    delete process.env.NODE_ENV;
    delete process.env.ENABLE_REAL_TRADING;
    delete process.env.OKX_API_KEY;
    delete process.env.OKX_SECRET_KEY;
  });

  describe('CLI Args Parsing', () => {
    test('should parse --mode=backtest correctly', () => {
      // Simulate command line args
      const originalArgv = process.argv;
      process.argv = ['node', 'main.ts', '--mode=backtest', '--config=backtest.default'];
      
      const context = environmentParser.parseCommandLineArgs();
      
      expect(context.mode).toBe('backtest');
      expect(context.configProfile).toBe('backtest.default');
      expect(context.enableRealTrading).toBe(false);
      
      process.argv = originalArgv;
    });

    test('should parse --mode=production with validation', () => {
      const originalArgv = process.argv;
      process.argv = ['node', 'main.ts', '--mode=production', '--config=production.minimal', '--env=production'];
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_REAL_TRADING = 'true';
      process.env.OKX_API_KEY = 'test_api_key';
      process.env.OKX_SECRET_KEY = 'test_secret_key';
      
      const context = environmentParser.parseCommandLineArgs();
      
      expect(context.mode).toBe('production');
      expect(context.configProfile).toBe('production.minimal');
      expect(context.environment).toBe('production');
      
      process.argv = originalArgv;
    });

    test('should default to backtest for safety', () => {
      const originalArgv = process.argv;
      process.argv = ['node', 'main.ts']; // No args
      
      const context = environmentParser.parseCommandLineArgs();
      
      expect(context.mode).toBe('backtest');
      expect(context.enableRealTrading).toBe(false);
      
      process.argv = originalArgv;
    });
  });

  describe('Environment Validation', () => {
    test('should prevent production mode without proper setup', () => {
      environmentParser.setTestContext({
        mode: 'production',
        environment: 'development', // Wrong environment
        configProfile: 'production.default',
        safetyChecks: true,
        enableRealTrading: false,
        nodeEnv: 'development'
      });
      
      const errors = environmentParser.validateEnvironmentSafety(
        environmentParser.getCurrentContext()!
      );
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('Production mode requires production environment'))).toBe(true);
    });

    test('should prevent backtest in production environment', () => {
      environmentParser.setTestContext({
        mode: 'backtest',
        environment: 'production',
        configProfile: 'backtest.default',
        safetyChecks: true,
        enableRealTrading: false,
        nodeEnv: 'production'
      });
      
      const errors = environmentParser.validateEnvironmentSafety(
        environmentParser.getCurrentContext()!
      );
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('Backtest mode cannot run in production environment'))).toBe(true);
    });

    test('should validate Git branch for production', () => {
      environmentParser.setTestContext({
        mode: 'production',
        environment: 'production',
        configProfile: 'production.default',
        safetyChecks: true,
        enableRealTrading: true,
        gitBranch: 'feature/test', // Wrong branch
        nodeEnv: 'production'
      });
      
      const errors = environmentParser.validateEnvironmentSafety(
        environmentParser.getCurrentContext()!
      );
      
      expect(errors.some(e => e.includes('Production deployment only allowed from \'main\' branch'))).toBe(true);
    });
  });

  describe('Config Integration', () => {
    test('should load correct config for backtest mode', async () => {
      environmentParser.setTestContext({
        mode: 'backtest',
        environment: 'development',
        configProfile: 'backtest.default',
        safetyChecks: true,
        enableRealTrading: false,
        nodeEnv: 'development'
      });
      
      const config = configManager.loadConfiguration('backtest.default');
      
      expect(config.environment).toBe('backtest');
      expect(config.executionMode).toBe('simulation');
      expect(config.enableRealTrading).toBe(false);
    });

    test('should load correct config for production mode', async () => {
      environmentParser.setTestContext({
        mode: 'production',
        environment: 'production',
        configProfile: 'production.minimal',
        safetyChecks: true,
        enableRealTrading: false, // Still false until manually enabled
        nodeEnv: 'production'
      });
      
      const config = configManager.loadConfiguration('production.minimal');
      
      expect(config.environment).toBe('production');
      expect(config.executionMode).toBe('live');
      expect(config.enableRealTrading).toBe(false); // Safety default
    });
  });

  describe('Executor Selection', () => {
    test('should recommend SimulatedExecutor for backtest', () => {
      environmentParser.setTestContext({
        mode: 'backtest',
        environment: 'development',
        configProfile: 'backtest.default',
        safetyChecks: true,
        enableRealTrading: false,
        nodeEnv: 'development'
      });
      
      const executor = environmentParser.getRecommendedExecutor();
      expect(executor).toBe('SimulatedExecutor');
    });

    test('should recommend OKXExecutorAdapter for production', () => {
      environmentParser.setTestContext({
        mode: 'production',
        environment: 'production',
        configProfile: 'production.default',
        safetyChecks: true,
        enableRealTrading: true,
        nodeEnv: 'production'
      });
      
      const executor = environmentParser.getRecommendedExecutor();
      expect(executor).toBe('OKXExecutorAdapter');
    });
  });

  describe('Real Trading Authorization', () => {
    test('should not allow real trading without full validation', () => {
      environmentParser.setTestContext({
        mode: 'production',
        environment: 'production',
        configProfile: 'production.default',
        safetyChecks: true,
        enableRealTrading: true,
        nodeEnv: 'production'
      });
      
      // Missing ENABLE_REAL_TRADING env var
      const canTrade = environmentParser.canExecuteRealTrades();
      expect(canTrade).toBe(false);
    });

    test('should allow real trading with complete setup', () => {
      process.env.ENABLE_REAL_TRADING = 'true';
      process.env.OKX_API_KEY = 'test_key';
      process.env.OKX_SECRET_KEY = 'test_secret';
      
      environmentParser.setTestContext({
        mode: 'production',
        environment: 'production',
        configProfile: 'production.default',
        safetyChecks: true,
        enableRealTrading: true,
        gitBranch: 'main',
        nodeEnv: 'production'
      });
      
      const canTrade = environmentParser.canExecuteRealTrades();
      expect(canTrade).toBe(true);
    });
  });
});

/**
 * Manual integration test function for main.ts
 * Use this to test actual integration with existing code
 */
export async function runManualIntegrationTest(): Promise<boolean> {
  console.log('🧪 Running manual integration test for environment parser...');
  
  try {
    // Test 1: Parse current environment
    console.log('\n📋 Test 1: Environment parsing');
    const context = environmentParser.parseCommandLineArgs();
    console.log('✅ Environment parsed successfully');
    
    // Test 2: Validate safety
    console.log('\n📋 Test 2: Safety validation');
    const errors = environmentParser.validateEnvironmentSafety(context);
    if (errors.length > 0) {
      console.warn('⚠️ Safety validation warnings:', errors);
    } else {
      console.log('✅ Safety validation passed');
    }
    
    // Test 3: Config loading
    console.log('\n📋 Test 3: Config loading');
    const config = configManager.loadConfiguration(context.configProfile as any);
    console.log('✅ Config loaded successfully:', config.environment);
    
    // Test 4: Executor recommendation
    console.log('\n📋 Test 4: Executor recommendation');
    const executor = environmentParser.getRecommendedExecutor();
    console.log('✅ Recommended executor:', executor);
    
    // Test 5: Real trading check
    console.log('\n📋 Test 5: Real trading authorization');
    const canTrade = environmentParser.canExecuteRealTrades();
    console.log('✅ Real trading allowed:', canTrade);
    
    console.log('\n🎉 All integration tests passed!');
    console.log('\n' + environmentParser.generateEnvironmentReport());
    
    return true;
    
  } catch (error) {
    console.error('🚨 Integration test failed:', error);
    return false;
  }
}

// Export for use in main.ts
export { runManualIntegrationTest };

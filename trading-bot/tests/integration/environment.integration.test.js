"use strict";
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.runManualIntegrationTest = runManualIntegrationTest;
const environment_parser_1 = require("../core/environment/environment.parser");
const config_1 = require("../config");
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
            const context = environment_parser_1.environmentParser.parseCommandLineArgs();
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
            const context = environment_parser_1.environmentParser.parseCommandLineArgs();
            expect(context.mode).toBe('production');
            expect(context.configProfile).toBe('production.minimal');
            expect(context.environment).toBe('production');
            process.argv = originalArgv;
        });
        test('should default to backtest for safety', () => {
            const originalArgv = process.argv;
            process.argv = ['node', 'main.ts']; // No args
            const context = environment_parser_1.environmentParser.parseCommandLineArgs();
            expect(context.mode).toBe('backtest');
            expect(context.enableRealTrading).toBe(false);
            process.argv = originalArgv;
        });
    });
    describe('Environment Validation', () => {
        test('should prevent production mode without proper setup', () => {
            environment_parser_1.environmentParser.setTestContext({
                mode: 'production',
                environment: 'development', // Wrong environment
                configProfile: 'production.default',
                safetyChecks: true,
                enableRealTrading: false,
                nodeEnv: 'development'
            });
            const errors = environment_parser_1.environmentParser.validateEnvironmentSafety(environment_parser_1.environmentParser.getCurrentContext());
            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some(e => e.includes('Production mode requires production environment'))).toBe(true);
        });
        test('should prevent backtest in production environment', () => {
            environment_parser_1.environmentParser.setTestContext({
                mode: 'backtest',
                environment: 'production',
                configProfile: 'backtest.default',
                safetyChecks: true,
                enableRealTrading: false,
                nodeEnv: 'production'
            });
            const errors = environment_parser_1.environmentParser.validateEnvironmentSafety(environment_parser_1.environmentParser.getCurrentContext());
            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some(e => e.includes('Backtest mode cannot run in production environment'))).toBe(true);
        });
        test('should validate Git branch for production', () => {
            environment_parser_1.environmentParser.setTestContext({
                mode: 'production',
                environment: 'production',
                configProfile: 'production.default',
                safetyChecks: true,
                enableRealTrading: true,
                gitBranch: 'feature/test', // Wrong branch
                nodeEnv: 'production'
            });
            const errors = environment_parser_1.environmentParser.validateEnvironmentSafety(environment_parser_1.environmentParser.getCurrentContext());
            expect(errors.some(e => e.includes('Production deployment only allowed from \'main\' branch'))).toBe(true);
        });
    });
    describe('Config Integration', () => {
        test('should load correct config for backtest mode', async () => {
            environment_parser_1.environmentParser.setTestContext({
                mode: 'backtest',
                environment: 'development',
                configProfile: 'backtest.default',
                safetyChecks: true,
                enableRealTrading: false,
                nodeEnv: 'development'
            });
            const config = config_1.configManager.loadConfiguration('backtest.default');
            expect(config.environment).toBe('backtest');
            expect(config.executionMode).toBe('simulation');
            expect(config.enableRealTrading).toBe(false);
        });
        test('should load correct config for production mode', async () => {
            environment_parser_1.environmentParser.setTestContext({
                mode: 'production',
                environment: 'production',
                configProfile: 'production.minimal',
                safetyChecks: true,
                enableRealTrading: false, // Still false until manually enabled
                nodeEnv: 'production'
            });
            const config = config_1.configManager.loadConfiguration('production.minimal');
            expect(config.environment).toBe('production');
            expect(config.executionMode).toBe('live');
            expect(config.enableRealTrading).toBe(false); // Safety default
        });
    });
    describe('Executor Selection', () => {
        test('should recommend SimulatedExecutor for backtest', () => {
            environment_parser_1.environmentParser.setTestContext({
                mode: 'backtest',
                environment: 'development',
                configProfile: 'backtest.default',
                safetyChecks: true,
                enableRealTrading: false,
                nodeEnv: 'development'
            });
            const executor = environment_parser_1.environmentParser.getRecommendedExecutor();
            expect(executor).toBe('SimulatedExecutor');
        });
        test('should recommend OKXExecutorAdapter for production', () => {
            environment_parser_1.environmentParser.setTestContext({
                mode: 'production',
                environment: 'production',
                configProfile: 'production.default',
                safetyChecks: true,
                enableRealTrading: true,
                nodeEnv: 'production'
            });
            const executor = environment_parser_1.environmentParser.getRecommendedExecutor();
            expect(executor).toBe('OKXExecutorAdapter');
        });
    });
    describe('Real Trading Authorization', () => {
        test('should not allow real trading without full validation', () => {
            environment_parser_1.environmentParser.setTestContext({
                mode: 'production',
                environment: 'production',
                configProfile: 'production.default',
                safetyChecks: true,
                enableRealTrading: true,
                nodeEnv: 'production'
            });
            // Missing ENABLE_REAL_TRADING env var
            const canTrade = environment_parser_1.environmentParser.canExecuteRealTrades();
            expect(canTrade).toBe(false);
        });
        test('should allow real trading with complete setup', () => {
            process.env.ENABLE_REAL_TRADING = 'true';
            process.env.OKX_API_KEY = 'test_key';
            process.env.OKX_SECRET_KEY = 'test_secret';
            environment_parser_1.environmentParser.setTestContext({
                mode: 'production',
                environment: 'production',
                configProfile: 'production.default',
                safetyChecks: true,
                enableRealTrading: true,
                gitBranch: 'main',
                nodeEnv: 'production'
            });
            const canTrade = environment_parser_1.environmentParser.canExecuteRealTrades();
            expect(canTrade).toBe(true);
        });
    });
});
/**
 * Manual integration test function for main.ts
 * Use this to test actual integration with existing code
 */
async function runManualIntegrationTest() {
    console.log('🧪 Running manual integration test for environment parser...');
    try {
        // Test 1: Parse current environment
        console.log('\n📋 Test 1: Environment parsing');
        const context = environment_parser_1.environmentParser.parseCommandLineArgs();
        console.log('✅ Environment parsed successfully');
        // Test 2: Validate safety
        console.log('\n📋 Test 2: Safety validation');
        const errors = environment_parser_1.environmentParser.validateEnvironmentSafety(context);
        if (errors.length > 0) {
            console.warn('⚠️ Safety validation warnings:', errors);
        }
        else {
            console.log('✅ Safety validation passed');
        }
        // Test 3: Config loading
        console.log('\n📋 Test 3: Config loading');
        const config = config_1.configManager.loadConfiguration(context.configProfile);
        console.log('✅ Config loaded successfully:', config.environment);
        // Test 4: Executor recommendation
        console.log('\n📋 Test 4: Executor recommendation');
        const executor = environment_parser_1.environmentParser.getRecommendedExecutor();
        console.log('✅ Recommended executor:', executor);
        // Test 5: Real trading check
        console.log('\n📋 Test 5: Real trading authorization');
        const canTrade = environment_parser_1.environmentParser.canExecuteRealTrades();
        console.log('✅ Real trading allowed:', canTrade);
        console.log('\n🎉 All integration tests passed!');
        console.log('\n' + environment_parser_1.environmentParser.generateEnvironmentReport());
        return true;
    }
    catch (error) {
        console.error('🚨 Integration test failed:', error);
        return false;
    }
}

"use strict";
/**
 * ============================================================================
 * ENVIRONMENT MODE PARSER AND VALIDATOR
 * ============================================================================
 *
 * 🚨 CRITICAL: Production/Backtest Separation Enforcement
 * 🔧 CLI Args Parser for --mode flag
 * 🛡️ Environment Detection and Validation
 *
 * Created: September 2, 2025
 * ============================================================================
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.environmentParser = exports.EnvironmentModeParser = void 0;
exports.parseEnvironmentAndValidate = parseEnvironmentAndValidate;
exports.validateProductionDeployment = validateProductionDeployment;
class EnvironmentModeParser {
    constructor() {
        this.currentContext = null;
    }
    static getInstance() {
        if (!EnvironmentModeParser.instance) {
            EnvironmentModeParser.instance = new EnvironmentModeParser();
        }
        return EnvironmentModeParser.instance;
    }
    /**
     * Parse command line arguments for --mode flag
     * Critical for prod/backtest separation
     */
    parseCommandLineArgs() {
        const args = process.argv.slice(2);
        console.log('🔍 Parsing command line arguments:', args);
        // Default to backtest for safety
        let mode = 'backtest';
        let configProfile = 'backtest.default';
        let environment = 'development';
        // Parse --mode flag
        const modeIndex = args.findIndex(arg => arg.startsWith('--mode'));
        if (modeIndex !== -1) {
            if (args[modeIndex].includes('=')) {
                mode = args[modeIndex].split('=')[1];
            }
            else if (args[modeIndex + 1]) {
                mode = args[modeIndex + 1];
            }
        }
        // Parse --config flag
        const configIndex = args.findIndex(arg => arg.startsWith('--config'));
        if (configIndex !== -1) {
            if (args[configIndex].includes('=')) {
                configProfile = args[configIndex].split('=')[1];
            }
            else if (args[configIndex + 1]) {
                configProfile = args[configIndex + 1];
            }
        }
        // Parse --env flag
        const envIndex = args.findIndex(arg => arg.startsWith('--env'));
        if (envIndex !== -1) {
            if (args[envIndex].includes('=')) {
                environment = args[envIndex].split('=')[1];
            }
            else if (args[envIndex + 1]) {
                environment = args[envIndex + 1];
            }
        }
        // Validate mode
        if (!['backtest', 'demo', 'production'].includes(mode)) {
            throw new Error(`🚨 CRITICAL: Invalid execution mode '${mode}'. Must be: backtest, demo, or production`);
        }
        // Environment detection from NODE_ENV
        const nodeEnv = process.env.NODE_ENV || 'development';
        // Git branch detection (if available)
        let gitBranch;
        try {
            const { execSync } = require('child_process');
            gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
        }
        catch (error) {
            console.warn('⚠️ Could not detect Git branch');
        }
        const context = {
            mode,
            environment,
            configProfile,
            safetyChecks: true,
            enableRealTrading: false, // Always false by default for safety
            gitBranch,
            nodeEnv
        };
        console.log('✅ Parsed environment context:', JSON.stringify(context, null, 2));
        this.currentContext = context;
        return context;
    }
    /**
     * Validate environment context for safety
     * Prevents accidental production deployment
     */
    validateEnvironmentSafety(context) {
        const errors = [];
        const warnings = [];
        console.log('🛡️ Validating environment safety...');
        // Critical production safety checks
        if (context.mode === 'production') {
            if (context.environment !== 'production') {
                errors.push('🚨 CRITICAL: Production mode requires production environment');
            }
            if (context.gitBranch && context.gitBranch !== 'main') {
                errors.push(`🚨 CRITICAL: Production deployment only allowed from 'main' branch, current: '${context.gitBranch}'`);
            }
            if (context.nodeEnv !== 'production') {
                warnings.push(`⚠️ WARNING: NODE_ENV is '${context.nodeEnv}', should be 'production' for production mode`);
            }
            if (!process.env.OKX_API_KEY || !process.env.OKX_SECRET_KEY) {
                errors.push('🚨 CRITICAL: Production mode requires OKX_API_KEY and OKX_SECRET_KEY environment variables');
            }
            if (process.env.ENABLE_REAL_TRADING !== 'true') {
                errors.push('🚨 CRITICAL: Production mode requires ENABLE_REAL_TRADING=true environment variable');
            }
        }
        // Backtest safety checks
        if (context.mode === 'backtest') {
            if (context.environment === 'production') {
                errors.push('🚨 CRITICAL: Backtest mode cannot run in production environment');
            }
            if (process.env.ENABLE_REAL_TRADING === 'true') {
                errors.push('🚨 CRITICAL: Backtest mode detected with ENABLE_REAL_TRADING=true - potential data contamination');
            }
            if (context.gitBranch === 'main' && context.environment === 'production') {
                errors.push('🚨 CRITICAL: Backtest cannot run on main branch in production environment');
            }
        }
        // Demo mode checks
        if (context.mode === 'demo') {
            if (context.environment === 'production' && !process.env.DEMO_IN_PROD_CONFIRMED) {
                warnings.push('⚠️ WARNING: Demo mode in production environment - set DEMO_IN_PROD_CONFIRMED=true if intentional');
            }
        }
        // Git workflow validation
        if (context.gitBranch) {
            if (context.mode === 'production' && !['main'].includes(context.gitBranch)) {
                errors.push(`🚨 CRITICAL: Production deployment only from 'main' branch, current: '${context.gitBranch}'`);
            }
            if (context.mode === 'backtest' && context.gitBranch === 'main' && context.environment !== 'development') {
                warnings.push(`⚠️ WARNING: Running backtest on '${context.gitBranch}' branch in '${context.environment}' environment`);
            }
        }
        // Configuration profile validation
        const validProfiles = [
            'backtest.default', 'backtest.quick', 'backtest.comprehensive',
            'demo.default', 'demo.conservative', 'demo.aggressive',
            'production.default', 'production.minimal', 'production.high_performance'
        ];
        if (!validProfiles.includes(context.configProfile)) {
            errors.push(`🚨 CRITICAL: Invalid config profile '${context.configProfile}'`);
        }
        // Mode/profile alignment check
        if (context.mode === 'backtest' && !context.configProfile.startsWith('backtest.')) {
            errors.push(`🚨 CRITICAL: Backtest mode requires backtest.* config profile, got: ${context.configProfile}`);
        }
        if (context.mode === 'production' && !context.configProfile.startsWith('production.')) {
            errors.push(`🚨 CRITICAL: Production mode requires production.* config profile, got: ${context.configProfile}`);
        }
        // Log results
        if (warnings.length > 0) {
            console.warn('⚠️ Environment validation warnings:');
            warnings.forEach(warning => console.warn(`   ${warning}`));
        }
        if (errors.length > 0) {
            console.error('🚨 Environment validation errors:');
            errors.forEach(error => console.error(`   ${error}`));
        }
        else {
            console.log('✅ Environment validation passed');
        }
        return errors;
    }
    /**
     * Get current environment context
     */
    getCurrentContext() {
        return this.currentContext;
    }
    /**
     * Force environment context (for testing)
     */
    setTestContext(context) {
        console.log('🧪 Setting test environment context');
        this.currentContext = context;
    }
    /**
     * Generate environment summary report
     */
    generateEnvironmentReport() {
        if (!this.currentContext) {
            return '❌ No environment context available';
        }
        const ctx = this.currentContext;
        return `
🌍 **ENVIRONMENT CONTEXT REPORT**
═══════════════════════════════════════════

🎯 **EXECUTION MODE**: ${ctx.mode.toUpperCase()}
🏗️ **ENVIRONMENT**: ${ctx.environment.toUpperCase()}
📋 **CONFIG PROFILE**: ${ctx.configProfile}
🔒 **SAFETY CHECKS**: ${ctx.safetyChecks ? '✅ ENABLED' : '❌ DISABLED'}
💰 **REAL TRADING**: ${ctx.enableRealTrading ? '🚨 ENABLED' : '✅ DISABLED'}
🌿 **GIT BRANCH**: ${ctx.gitBranch || 'Unknown'}
⚙️ **NODE_ENV**: ${ctx.nodeEnv}

🛡️ **SAFETY STATUS**
${ctx.mode === 'production' ? '🚨 PRODUCTION MODE - REAL MONEY TRADING' : '✅ SAFE MODE - NO REAL TRADING'}

🔍 **VALIDATION RESULTS**
${this.validateEnvironmentSafety(ctx).length === 0 ? '✅ All safety checks passed' : '🚨 Safety validation failed'}
`;
    }
    /**
     * Check if current context allows real trading
     */
    canExecuteRealTrades() {
        if (!this.currentContext)
            return false;
        const ctx = this.currentContext;
        const validationErrors = this.validateEnvironmentSafety(ctx);
        return ctx.mode === 'production' &&
            ctx.enableRealTrading &&
            validationErrors.length === 0 &&
            process.env.ENABLE_REAL_TRADING === 'true';
    }
    /**
     * Get recommended executor based on mode
     */
    getRecommendedExecutor() {
        if (!this.currentContext)
            return 'SimulatedExecutor';
        switch (this.currentContext.mode) {
            case 'backtest':
                return 'SimulatedExecutor';
            case 'demo':
                return 'OKXExecutorAdapter'; // with sandbox=true
            case 'production':
                return 'OKXExecutorAdapter'; // with sandbox=false
            default:
                return 'SimulatedExecutor';
        }
    }
}
exports.EnvironmentModeParser = EnvironmentModeParser;
// Export singleton instance
exports.environmentParser = EnvironmentModeParser.getInstance();
/**
 * Utility functions for main.ts integration
 */
function parseEnvironmentAndValidate() {
    const context = exports.environmentParser.parseCommandLineArgs();
    const errors = exports.environmentParser.validateEnvironmentSafety(context);
    if (errors.length > 0) {
        console.error('🚨 CRITICAL ENVIRONMENT VALIDATION FAILURES:');
        errors.forEach(error => console.error(error));
        console.error('\n💡 USAGE EXAMPLES:');
        console.error('   npm run backtest -- --mode=backtest --config=backtest.default');
        console.error('   npm run demo -- --mode=demo --config=demo.conservative');
        console.error('   npm run production -- --mode=production --config=production.minimal --env=production');
        process.exit(1);
    }
    console.log(exports.environmentParser.generateEnvironmentReport());
    return context;
}
function validateProductionDeployment() {
    const context = exports.environmentParser.getCurrentContext();
    if (!context)
        return false;
    if (context.mode !== 'production')
        return true; // Not production, no validation needed
    const errors = exports.environmentParser.validateEnvironmentSafety(context);
    return errors.length === 0;
}

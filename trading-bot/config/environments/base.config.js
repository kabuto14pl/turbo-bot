"use strict";
/**
 * ============================================================================
 * ENTERPRISE TRADING BOT - BASE CONFIGURATION INTERFACE
 * ============================================================================
 *
 * 🏗️ Type-safe configuration system for all environments
 * 🔧 Centralized configuration management
 * 🛡️ Environment-specific validation
 *
 * Created: September 2, 2025
 * ============================================================================
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigValidator = void 0;
/**
 * Configuration validation utilities
 */
class ConfigValidator {
    static validateBaseConfig(config) {
        const errors = [];
        if (!config.version)
            errors.push('Version is required');
        if (!config.deploymentId)
            errors.push('Deployment ID is required');
        if (config.tradingConfig.initialCapital <= 0)
            errors.push('Initial capital must be positive');
        if (config.riskConfig.maxDrawdown <= 0 || config.riskConfig.maxDrawdown >= 1) {
            errors.push('Max drawdown must be between 0 and 1');
        }
        return errors;
    }
    static validateProductionConfig(config) {
        const errors = this.validateBaseConfig(config);
        if (!config.okxConfig.apiKey)
            errors.push('OKX API Key is required for production');
        if (!config.okxConfig.secretKey)
            errors.push('OKX Secret Key is required for production');
        if (!config.okxConfig.passphrase)
            errors.push('OKX Passphrase is required for production');
        if (config.okxConfig.sandbox)
            errors.push('Production config cannot use sandbox mode');
        if (!config.okxConfig.enableRealTrading)
            errors.push('Production requires enableRealTrading=true');
        return errors;
    }
}
exports.ConfigValidator = ConfigValidator;

"use strict";
/**
 * 🔧 [PRODUCTION-CONFIG]
 * Production configuration component
 */
/**
 * ============================================================================
 * ENTERPRISE CONFIGURATION INDEX
 * ============================================================================
 *
 * 🚀 Central export point for all configuration modules
 * 🔧 Type-safe configuration system
 * 📊 Integrated VaR and risk management
 *
 * Created: September 2, 2025
 * ============================================================================
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskProfileManager = exports.strategyManager = exports.configManager = exports.enterpriseConfig = exports.EnterpriseConfigCoordinator = void 0;
exports.setupBeginnerConfiguration = setupBeginnerConfiguration;
exports.setupExperiencedTraderConfiguration = setupExperiencedTraderConfiguration;
exports.setupProfessionalConfiguration = setupProfessionalConfiguration;
exports.setupResearchConfiguration = setupResearchConfiguration;
exports.setupQuickTestConfiguration = setupQuickTestConfiguration;
// Environment Configuration Exports
__exportStar(require("./environments/base.config"), exports);
__exportStar(require("./environments/backtest.config"), exports);
__exportStar(require("./environments/demo.config"), exports);
__exportStar(require("./environments/production.config"), exports);
__exportStar(require("./environments/config.manager"), exports);
// Strategy Configuration Exports
__exportStar(require("./strategies/strategy.definitions"), exports);
// Risk Management Exports
__exportStar(require("./risk/risk.profiles"), exports);
// Main Configuration Manager Class
const config_manager_1 = require("./environments/config.manager");
Object.defineProperty(exports, "configManager", { enumerable: true, get: function () { return config_manager_1.configManager; } });
const strategy_definitions_1 = require("./strategies/strategy.definitions");
Object.defineProperty(exports, "strategyManager", { enumerable: true, get: function () { return strategy_definitions_1.strategyManager; } });
const risk_profiles_1 = require("./risk/risk.profiles");
Object.defineProperty(exports, "riskProfileManager", { enumerable: true, get: function () { return risk_profiles_1.riskProfileManager; } });
/**
 * Enterprise Configuration Coordinator
 * Centralized management of all configuration aspects
 */
class EnterpriseConfigCoordinator {
    constructor() {
        this.configManager = config_manager_1.configManager;
        this.strategyManager = strategy_definitions_1.strategyManager;
        this.riskProfileManager = risk_profiles_1.riskProfileManager;
    }
    static getInstance() {
        if (!EnterpriseConfigCoordinator.instance) {
            EnterpriseConfigCoordinator.instance = new EnterpriseConfigCoordinator();
        }
        return EnterpriseConfigCoordinator.instance;
    }
    /**
     * Initialize complete configuration setup
     */
    async initializeConfiguration(environmentProfile, riskProfile, activeStrategies) {
        try {
            console.log('🚀 Initializing Enterprise Configuration System...');
            // 1. Load environment configuration
            const envConfig = this.configManager.loadConfiguration(environmentProfile);
            console.log(`✅ Environment configuration loaded: ${envConfig.environment}`);
            // 2. Set risk profile
            const riskProfileSet = this.riskProfileManager.setCurrentProfile(riskProfile);
            if (!riskProfileSet) {
                throw new Error(`Failed to set risk profile: ${riskProfile}`);
            }
            console.log(`✅ Risk profile set: ${riskProfile}`);
            // 3. Activate strategies
            activeStrategies.forEach(strategy => {
                const activated = this.strategyManager.setStrategyEnabled(strategy, true);
                if (!activated) {
                    console.warn(`⚠️ Warning: Failed to activate strategy ${strategy}`);
                }
                else {
                    console.log(`✅ Strategy activated: ${strategy}`);
                }
            });
            // 4. Generate comprehensive configuration report
            console.log('\n' + this.generateComprehensiveReport());
            console.log('🎉 Enterprise Configuration System initialized successfully!');
            return true;
        }
        catch (error) {
            console.error('🚨 Failed to initialize configuration system:', error);
            return false;
        }
    }
    /**
     * Generate comprehensive configuration report
     */
    generateComprehensiveReport() {
        const envReport = this.configManager.generateConfigurationReport();
        const riskReport = this.riskProfileManager.generateRiskSummary();
        const activeStrategies = this.strategyManager.getActiveStrategies();
        return `
${envReport}

${riskReport}

🎯 **ACTIVE STRATEGIES**
   Count: ${activeStrategies.length}
   Strategies: ${activeStrategies.join(', ')}

⚡ **SYSTEM STATUS**
   Configuration System: ✅ ACTIVE
   VaR Integration: ✅ ENABLED
   Risk Monitoring: ✅ ENABLED
   Strategy Management: ✅ ACTIVE

═══════════════════════════════════════════
🚀 ENTERPRISE TRADING BOT - READY FOR OPERATION
`;
    }
    /**
     * Validate complete system configuration
     */
    validateSystemConfiguration() {
        const errors = [];
        // Check environment configuration
        const currentConfig = this.configManager.getCurrentConfiguration();
        if (!currentConfig) {
            errors.push('No environment configuration loaded');
            return errors;
        }
        // Check risk profile
        const currentRiskProfile = this.riskProfileManager.getCurrentProfile();
        if (!currentRiskProfile) {
            errors.push('No risk profile selected');
        }
        // Check active strategies
        const activeStrategies = this.strategyManager.getActiveStrategies();
        if (activeStrategies.length === 0) {
            errors.push('No strategies activated');
        }
        // Validate strategy-risk alignment
        if (currentRiskProfile && activeStrategies.length > 0) {
            const riskCategory = currentRiskProfile.category;
            activeStrategies.forEach(strategyName => {
                const strategy = this.strategyManager.getStrategyConfig(strategyName);
                if (strategy) {
                    // Check if strategy risk profile matches
                    if (riskCategory === 'ultra_conservative' && strategy.riskProfile === 'aggressive') {
                        errors.push(`Strategy ${strategyName} (${strategy.riskProfile}) incompatible with ${riskCategory} risk profile`);
                    }
                    if (riskCategory === 'conservative' && strategy.riskProfile === 'aggressive') {
                        errors.push(`Strategy ${strategyName} (${strategy.riskProfile}) may be too aggressive for ${riskCategory} risk profile`);
                    }
                }
            });
        }
        return errors;
    }
    /**
     * Get recommended configurations for different use cases
     */
    getRecommendedConfigurations() {
        return {
            'beginner_trader': {
                environment: 'demo.conservative',
                riskProfile: 'ultra_conservative',
                strategies: ['MACrossover'],
                description: 'Safe configuration for new traders'
            },
            'experienced_trader': {
                environment: 'demo.default',
                riskProfile: 'moderate',
                strategies: ['EnhancedRSITurbo', 'MACrossover', 'SuperTrend'],
                description: 'Balanced configuration for experienced traders'
            },
            'professional_trader': {
                environment: 'production.default',
                riskProfile: 'aggressive',
                strategies: ['AdvancedAdaptive', 'EnhancedRSITurbo', 'MomentumPro'],
                description: 'Advanced configuration for professional trading'
            },
            'research_mode': {
                environment: 'backtest.comprehensive',
                riskProfile: 'moderate',
                strategies: ['AdvancedAdaptive', 'EnhancedRSITurbo', 'MACrossover', 'SuperTrend', 'MomentumPro'],
                description: 'Comprehensive backtesting for strategy research'
            },
            'quick_test': {
                environment: 'backtest.quick',
                riskProfile: 'moderate',
                strategies: ['EnhancedRSITurbo', 'MomentumPro'],
                description: 'Quick strategy validation'
            }
        };
    }
    /**
     * Apply recommended configuration
     */
    async applyRecommendedConfiguration(configName) {
        const configs = this.getRecommendedConfigurations();
        const config = configs[configName];
        if (!config) {
            console.error(`Unknown configuration: ${configName}`);
            return false;
        }
        console.log(`🔧 Applying recommended configuration: ${configName}`);
        console.log(`📝 Description: ${config.description}`);
        return await this.initializeConfiguration(config.environment, config.riskProfile, config.strategies);
    }
}
exports.EnterpriseConfigCoordinator = EnterpriseConfigCoordinator;
// Export singleton instance
exports.enterpriseConfig = EnterpriseConfigCoordinator.getInstance();
// Quick setup functions
async function setupBeginnerConfiguration() {
    return await exports.enterpriseConfig.applyRecommendedConfiguration('beginner_trader');
}
async function setupExperiencedTraderConfiguration() {
    return await exports.enterpriseConfig.applyRecommendedConfiguration('experienced_trader');
}
async function setupProfessionalConfiguration() {
    return await exports.enterpriseConfig.applyRecommendedConfiguration('professional_trader');
}
async function setupResearchConfiguration() {
    return await exports.enterpriseConfig.applyRecommendedConfiguration('research_mode');
}
async function setupQuickTestConfiguration() {
    return await exports.enterpriseConfig.applyRecommendedConfiguration('quick_test');
}

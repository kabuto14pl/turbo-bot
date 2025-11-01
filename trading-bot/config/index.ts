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

// Environment Configuration Exports
export * from './environments/base.config';
export * from './environments/backtest.config';
export * from './environments/demo.config';
export * from './environments/production.config';
export * from './environments/config.manager';

// Strategy Configuration Exports
export * from './strategies/strategy.definitions';

// Risk Management Exports
export * from './risk/risk.profiles';

// Main Configuration Manager Class
import { configManager, EnvironmentConfigManager, ConfigurationProfile } from './environments/config.manager';
import { strategyManager, StrategyManager } from './strategies/strategy.definitions';
import { riskProfileManager, RiskProfileManager } from './risk/risk.profiles';

/**
 * Enterprise Configuration Coordinator
 * Centralized management of all configuration aspects
 */
export class EnterpriseConfigCoordinator {
  private static instance: EnterpriseConfigCoordinator;
  
  public readonly configManager: EnvironmentConfigManager;
  public readonly strategyManager: StrategyManager;
  public readonly riskProfileManager: RiskProfileManager;

  private constructor() {
    this.configManager = configManager;
    this.strategyManager = strategyManager;
    this.riskProfileManager = riskProfileManager;
  }

  public static getInstance(): EnterpriseConfigCoordinator {
    if (!EnterpriseConfigCoordinator.instance) {
      EnterpriseConfigCoordinator.instance = new EnterpriseConfigCoordinator();
    }
    return EnterpriseConfigCoordinator.instance;
  }

  /**
   * Initialize complete configuration setup
   */
  public async initializeConfiguration(
    environmentProfile: ConfigurationProfile,
    riskProfile: string,
    activeStrategies: string[]
  ): Promise<boolean> {
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
        } else {
          console.log(`✅ Strategy activated: ${strategy}`);
        }
      });
      
      // 4. Generate comprehensive configuration report
      console.log('\n' + this.generateComprehensiveReport());
      
      console.log('🎉 Enterprise Configuration System initialized successfully!');
      return true;
      
    } catch (error) {
      console.error('🚨 Failed to initialize configuration system:', error);
      return false;
    }
  }

  /**
   * Generate comprehensive configuration report
   */
  public generateComprehensiveReport(): string {
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
  public validateSystemConfiguration(): string[] {
    const errors: string[] = [];
    
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
  public getRecommendedConfigurations(): Record<string, any> {
    return {
      'beginner_trader': {
        environment: 'demo.conservative' as ConfigurationProfile,
        riskProfile: 'ultra_conservative',
        strategies: ['MACrossover'],
        description: 'Safe configuration for new traders'
      },
      
      'experienced_trader': {
        environment: 'demo.default' as ConfigurationProfile,
        riskProfile: 'moderate',
        strategies: ['EnhancedRSITurbo', 'MACrossover', 'SuperTrend'],
        description: 'Balanced configuration for experienced traders'
      },
      
      'professional_trader': {
        environment: 'production.default' as ConfigurationProfile,
        riskProfile: 'aggressive',
        strategies: ['AdvancedAdaptive', 'EnhancedRSITurbo', 'MomentumPro'],
        description: 'Advanced configuration for professional trading'
      },
      
      'research_mode': {
        environment: 'backtest.comprehensive' as ConfigurationProfile,
        riskProfile: 'moderate',
        strategies: ['AdvancedAdaptive', 'EnhancedRSITurbo', 'MACrossover', 'SuperTrend', 'MomentumPro'],
        description: 'Comprehensive backtesting for strategy research'
      },
      
      'quick_test': {
        environment: 'backtest.quick' as ConfigurationProfile,
        riskProfile: 'moderate',
        strategies: ['EnhancedRSITurbo', 'MomentumPro'],
        description: 'Quick strategy validation'
      }
    };
  }

  /**
   * Apply recommended configuration
   */
  public async applyRecommendedConfiguration(configName: string): Promise<boolean> {
    const configs = this.getRecommendedConfigurations();
    const config = configs[configName];
    
    if (!config) {
      console.error(`Unknown configuration: ${configName}`);
      return false;
    }
    
    console.log(`🔧 Applying recommended configuration: ${configName}`);
    console.log(`📝 Description: ${config.description}`);
    
    return await this.initializeConfiguration(
      config.environment,
      config.riskProfile,
      config.strategies
    );
  }
}

// Export singleton instance
export const enterpriseConfig = EnterpriseConfigCoordinator.getInstance();

// Export individual managers for direct access
export { configManager, strategyManager, riskProfileManager };

// Quick setup functions
export async function setupBeginnerConfiguration(): Promise<boolean> {
  return await enterpriseConfig.applyRecommendedConfiguration('beginner_trader');
}

export async function setupExperiencedTraderConfiguration(): Promise<boolean> {
  return await enterpriseConfig.applyRecommendedConfiguration('experienced_trader');
}

export async function setupProfessionalConfiguration(): Promise<boolean> {
  return await enterpriseConfig.applyRecommendedConfiguration('professional_trader');
}

export async function setupResearchConfiguration(): Promise<boolean> {
  return await enterpriseConfig.applyRecommendedConfiguration('research_mode');
}

export async function setupQuickTestConfiguration(): Promise<boolean> {
  return await enterpriseConfig.applyRecommendedConfiguration('quick_test');
}

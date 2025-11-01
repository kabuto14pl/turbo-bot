/**
 * 🔧 [PRODUCTION-CONFIG]
 * Production configuration component
 */
/**
 * ============================================================================
 * RISK MANAGEMENT PROFILES CONFIGURATION
 * ============================================================================
 * 
 * 🛡️ Comprehensive risk management profiles
 * 📊 VaR integration and monitoring
 * ⚡ Dynamic risk adjustment capabilities
 * 
 * Created: September 2, 2025
 * ============================================================================
 */

export interface RiskProfile {
  name: string;
  displayName: string;
  description: string;
  category: 'ultra_conservative' | 'conservative' | 'moderate' | 'aggressive' | 'high_risk';
  
  // Position Sizing
  positionSizing: {
    maxPositionSize: number;        // Maximum position size as % of portfolio
    maxTotalExposure: number;       // Maximum total exposure across all positions
    positionSizeMethod: 'fixed' | 'kelly' | 'volatility_adjusted' | 'var_based';
    kellyMultiplier?: number;       // Kelly criterion multiplier (if using Kelly)
    volatilityLookback?: number;    // Days for volatility calculation
  };
  
  // Risk Limits
  riskLimits: {
    maxDrawdown: number;            // Maximum allowed drawdown
    dailyLossLimit: number;         // Daily loss limit as % of portfolio
    monthlyLossLimit: number;       // Monthly loss limit as % of portfolio
    maxConsecutiveLosses: number;   // Max consecutive losing trades
    stopTradingDrawdown: number;    // Drawdown level to stop trading
  };
  
  // VaR Configuration
  varConfig: {
    var95Threshold: number;         // VaR 95% threshold
    var99Threshold: number;         // VaR 99% threshold
    cvarThreshold: number;          // Conditional VaR threshold
    varLookbackDays: number;        // Days for VaR calculation
    varMonitoringEnabled: boolean;  // Enable real-time VaR monitoring
    varAlertThreshold: number;      // VaR level to trigger alerts
  };
  
  // Stop Loss and Take Profit
  exitRules: {
    stopLossMethod: 'fixed' | 'atr' | 'volatility' | 'var_based';
    stopLossPercentage: number;     // Fixed stop loss percentage
    atrMultiplier?: number;         // ATR multiplier for stop loss
    trailingStopEnabled: boolean;   // Enable trailing stops
    trailingStopDistance: number;   // Trailing stop distance
    
    takeProfitMethod: 'fixed' | 'rr_ratio' | 'volatility' | 'adaptive';
    takeProfitPercentage: number;   // Fixed take profit percentage
    riskRewardRatio?: number;       // Risk/reward ratio for TP
    partialProfitLevels?: number[]; // Levels for partial profit taking
  };
  
  // Portfolio Correlation
  correlationLimits: {
    maxCorrelation: number;         // Maximum correlation between positions
    correlationLookback: number;    // Days for correlation calculation
    maxSectorExposure: number;      // Maximum exposure per sector/category
    rebalanceThreshold: number;     // Correlation threshold for rebalancing
  };
  
  // Market Condition Adjustments
  marketAdjustments: {
    enableVolatilityAdjustment: boolean;  // Adjust for market volatility
    volatilityThreshold: number;          // Volatility threshold for adjustments
    bearMarketMultiplier: number;         // Position size multiplier in bear markets
    highVolatilityMultiplier: number;     // Position size multiplier in high vol
    
    enableRegimeDetection: boolean;       // Enable market regime detection
    regimeAdjustmentEnabled: boolean;     // Adjust strategy based on regime
  };
  
  // Alert Configuration
  alertConfig: {
    enableRealTimeAlerts: boolean;  // Enable real-time risk alerts
    alertMethods: string[];         // ['email', 'sms', 'discord', 'telegram']
    criticalThresholds: {
      drawdown: number;             // Drawdown level for critical alerts
      var95: number;                // VaR95 level for critical alerts
      dailyLoss: number;            // Daily loss for critical alerts
    };
  };
}

/**
 * Ultra Conservative Risk Profile
 * For new traders or minimal risk tolerance
 */
export const ULTRA_CONSERVATIVE_RISK_PROFILE: RiskProfile = {
  name: 'ultra_conservative',
  displayName: 'Ultra Conservative',
  description: 'Minimal risk profile for capital preservation with very limited exposure',
  category: 'ultra_conservative',
  
  positionSizing: {
    maxPositionSize: 0.05,          // 5% max position
    maxTotalExposure: 0.20,         // 20% total exposure
    positionSizeMethod: 'var_based',
    volatilityLookback: 30
  },
  
  riskLimits: {
    maxDrawdown: 0.03,              // 3% max drawdown
    dailyLossLimit: 0.01,           // 1% daily loss limit
    monthlyLossLimit: 0.05,         // 5% monthly loss limit
    maxConsecutiveLosses: 3,
    stopTradingDrawdown: 0.025      // Stop at 2.5% drawdown
  },
  
  varConfig: {
    var95Threshold: 0.02,           // 2% VaR95
    var99Threshold: 0.03,           // 3% VaR99
    cvarThreshold: 0.035,           // 3.5% CVaR
    varLookbackDays: 30,
    varMonitoringEnabled: true,
    varAlertThreshold: 0.015        // Alert at 1.5% VaR
  },
  
  exitRules: {
    stopLossMethod: 'fixed',
    stopLossPercentage: 0.005,      // 0.5% stop loss
    trailingStopEnabled: true,
    trailingStopDistance: 0.003,    // 0.3% trailing stop
    
    takeProfitMethod: 'rr_ratio',
    takeProfitPercentage: 0.015,    // 1.5% take profit
    riskRewardRatio: 3.0            // 1:3 risk/reward
  },
  
  correlationLimits: {
    maxCorrelation: 0.3,            // 30% max correlation
    correlationLookback: 30,
    maxSectorExposure: 0.10,        // 10% max sector exposure
    rebalanceThreshold: 0.25
  },
  
  marketAdjustments: {
    enableVolatilityAdjustment: true,
    volatilityThreshold: 0.15,
    bearMarketMultiplier: 0.5,      // Reduce positions by 50% in bear market
    highVolatilityMultiplier: 0.3,  // Reduce positions by 70% in high vol
    
    enableRegimeDetection: true,
    regimeAdjustmentEnabled: true
  },
  
  alertConfig: {
    enableRealTimeAlerts: true,
    alertMethods: ['email', 'discord'],
    criticalThresholds: {
      drawdown: 0.02,               // Alert at 2% drawdown
      var95: 0.015,                 // Alert at 1.5% VaR95
      dailyLoss: 0.008              // Alert at 0.8% daily loss
    }
  }
};

/**
 * Conservative Risk Profile
 * For risk-averse traders focused on steady growth
 */
export const CONSERVATIVE_RISK_PROFILE: RiskProfile = {
  name: 'conservative',
  displayName: 'Conservative',
  description: 'Low-risk profile focused on capital preservation with steady growth',
  category: 'conservative',
  
  positionSizing: {
    maxPositionSize: 0.10,          // 10% max position
    maxTotalExposure: 0.40,         // 40% total exposure
    positionSizeMethod: 'volatility_adjusted',
    volatilityLookback: 21
  },
  
  riskLimits: {
    maxDrawdown: 0.06,              // 6% max drawdown
    dailyLossLimit: 0.02,           // 2% daily loss limit
    monthlyLossLimit: 0.08,         // 8% monthly loss limit
    maxConsecutiveLosses: 4,
    stopTradingDrawdown: 0.05       // Stop at 5% drawdown
  },
  
  varConfig: {
    var95Threshold: 0.04,           // 4% VaR95
    var99Threshold: 0.06,           // 6% VaR99
    cvarThreshold: 0.07,            // 7% CVaR
    varLookbackDays: 21,
    varMonitoringEnabled: true,
    varAlertThreshold: 0.03         // Alert at 3% VaR
  },
  
  exitRules: {
    stopLossMethod: 'atr',
    stopLossPercentage: 0.01,       // 1% stop loss
    atrMultiplier: 1.5,
    trailingStopEnabled: true,
    trailingStopDistance: 0.006,    // 0.6% trailing stop
    
    takeProfitMethod: 'rr_ratio',
    takeProfitPercentage: 0.025,    // 2.5% take profit
    riskRewardRatio: 2.5            // 1:2.5 risk/reward
  },
  
  correlationLimits: {
    maxCorrelation: 0.5,            // 50% max correlation
    correlationLookback: 21,
    maxSectorExposure: 0.20,        // 20% max sector exposure
    rebalanceThreshold: 0.4
  },
  
  marketAdjustments: {
    enableVolatilityAdjustment: true,
    volatilityThreshold: 0.20,
    bearMarketMultiplier: 0.6,      // Reduce positions by 40% in bear market
    highVolatilityMultiplier: 0.4,  // Reduce positions by 60% in high vol
    
    enableRegimeDetection: true,
    regimeAdjustmentEnabled: true
  },
  
  alertConfig: {
    enableRealTimeAlerts: true,
    alertMethods: ['email', 'discord'],
    criticalThresholds: {
      drawdown: 0.04,               // Alert at 4% drawdown
      var95: 0.03,                  // Alert at 3% VaR95
      dailyLoss: 0.015              // Alert at 1.5% daily loss
    }
  }
};

/**
 * Moderate Risk Profile
 * Balanced approach for experienced traders
 */
export const MODERATE_RISK_PROFILE: RiskProfile = {
  name: 'moderate',
  displayName: 'Moderate',
  description: 'Balanced risk profile for experienced traders seeking growth with managed risk',
  category: 'moderate',
  
  positionSizing: {
    maxPositionSize: 0.15,          // 15% max position
    maxTotalExposure: 0.60,         // 60% total exposure
    positionSizeMethod: 'kelly',
    kellyMultiplier: 0.25,
    volatilityLookback: 14
  },
  
  riskLimits: {
    maxDrawdown: 0.10,              // 10% max drawdown
    dailyLossLimit: 0.03,           // 3% daily loss limit
    monthlyLossLimit: 0.12,         // 12% monthly loss limit
    maxConsecutiveLosses: 5,
    stopTradingDrawdown: 0.08       // Stop at 8% drawdown
  },
  
  varConfig: {
    var95Threshold: 0.06,           // 6% VaR95
    var99Threshold: 0.09,           // 9% VaR99
    cvarThreshold: 0.11,            // 11% CVaR
    varLookbackDays: 14,
    varMonitoringEnabled: true,
    varAlertThreshold: 0.05         // Alert at 5% VaR
  },
  
  exitRules: {
    stopLossMethod: 'atr',
    stopLossPercentage: 0.015,      // 1.5% stop loss
    atrMultiplier: 2.0,
    trailingStopEnabled: true,
    trailingStopDistance: 0.01,     // 1% trailing stop
    
    takeProfitMethod: 'adaptive',
    takeProfitPercentage: 0.035,    // 3.5% take profit
    riskRewardRatio: 2.0,           // 1:2 risk/reward
    partialProfitLevels: [0.02, 0.035, 0.05]
  },
  
  correlationLimits: {
    maxCorrelation: 0.6,            // 60% max correlation
    correlationLookback: 14,
    maxSectorExposure: 0.30,        // 30% max sector exposure
    rebalanceThreshold: 0.5
  },
  
  marketAdjustments: {
    enableVolatilityAdjustment: true,
    volatilityThreshold: 0.25,
    bearMarketMultiplier: 0.7,      // Reduce positions by 30% in bear market
    highVolatilityMultiplier: 0.6,  // Reduce positions by 40% in high vol
    
    enableRegimeDetection: true,
    regimeAdjustmentEnabled: true
  },
  
  alertConfig: {
    enableRealTimeAlerts: true,
    alertMethods: ['email', 'discord', 'telegram'],
    criticalThresholds: {
      drawdown: 0.07,               // Alert at 7% drawdown
      var95: 0.05,                  // Alert at 5% VaR95
      dailyLoss: 0.025              // Alert at 2.5% daily loss
    }
  }
};

/**
 * Aggressive Risk Profile
 * For experienced traders seeking high returns
 */
export const AGGRESSIVE_RISK_PROFILE: RiskProfile = {
  name: 'aggressive',
  displayName: 'Aggressive',
  description: 'High-risk profile for experienced traders seeking maximum returns',
  category: 'aggressive',
  
  positionSizing: {
    maxPositionSize: 0.25,          // 25% max position
    maxTotalExposure: 0.80,         // 80% total exposure
    positionSizeMethod: 'kelly',
    kellyMultiplier: 0.5,
    volatilityLookback: 10
  },
  
  riskLimits: {
    maxDrawdown: 0.15,              // 15% max drawdown
    dailyLossLimit: 0.05,           // 5% daily loss limit
    monthlyLossLimit: 0.18,         // 18% monthly loss limit
    maxConsecutiveLosses: 6,
    stopTradingDrawdown: 0.12       // Stop at 12% drawdown
  },
  
  varConfig: {
    var95Threshold: 0.10,           // 10% VaR95
    var99Threshold: 0.15,           // 15% VaR99
    cvarThreshold: 0.18,            // 18% CVaR
    varLookbackDays: 10,
    varMonitoringEnabled: true,
    varAlertThreshold: 0.08         // Alert at 8% VaR
  },
  
  exitRules: {
    stopLossMethod: 'volatility',
    stopLossPercentage: 0.025,      // 2.5% stop loss
    atrMultiplier: 2.5,
    trailingStopEnabled: true,
    trailingStopDistance: 0.015,    // 1.5% trailing stop
    
    takeProfitMethod: 'adaptive',
    takeProfitPercentage: 0.05,     // 5% take profit
    riskRewardRatio: 1.8,           // 1:1.8 risk/reward
    partialProfitLevels: [0.03, 0.05, 0.08]
  },
  
  correlationLimits: {
    maxCorrelation: 0.7,            // 70% max correlation
    correlationLookback: 10,
    maxSectorExposure: 0.40,        // 40% max sector exposure
    rebalanceThreshold: 0.6
  },
  
  marketAdjustments: {
    enableVolatilityAdjustment: true,
    volatilityThreshold: 0.30,
    bearMarketMultiplier: 0.8,      // Reduce positions by 20% in bear market
    highVolatilityMultiplier: 0.7,  // Reduce positions by 30% in high vol
    
    enableRegimeDetection: true,
    regimeAdjustmentEnabled: false  // Less adjustment for aggressive profile
  },
  
  alertConfig: {
    enableRealTimeAlerts: true,
    alertMethods: ['email', 'discord', 'telegram', 'sms'],
    criticalThresholds: {
      drawdown: 0.12,               // Alert at 12% drawdown
      var95: 0.08,                  // Alert at 8% VaR95
      dailyLoss: 0.04               // Alert at 4% daily loss
    }
  }
};

/**
 * Risk Profile Registry
 */
export const RISK_PROFILE_REGISTRY: Record<string, RiskProfile> = {
  'ultra_conservative': ULTRA_CONSERVATIVE_RISK_PROFILE,
  'conservative': CONSERVATIVE_RISK_PROFILE,
  'moderate': MODERATE_RISK_PROFILE,
  'aggressive': AGGRESSIVE_RISK_PROFILE
};

/**
 * Risk Profile Manager
 */
export class RiskProfileManager {
  private static instance: RiskProfileManager;
  private currentProfile: RiskProfile | null = null;

  private constructor() {}

  public static getInstance(): RiskProfileManager {
    if (!RiskProfileManager.instance) {
      RiskProfileManager.instance = new RiskProfileManager();
    }
    return RiskProfileManager.instance;
  }

  /**
   * Get risk profile by name
   */
  public getRiskProfile(profileName: string): RiskProfile | null {
    return RISK_PROFILE_REGISTRY[profileName] || null;
  }

  /**
   * Set current risk profile
   */
  public setCurrentProfile(profileName: string): boolean {
    const profile = this.getRiskProfile(profileName);
    if (!profile) return false;
    
    this.currentProfile = profile;
    console.log(`🛡️ Risk profile set to: ${profile.displayName}`);
    return true;
  }

  /**
   * Get current risk profile
   */
  public getCurrentProfile(): RiskProfile | null {
    return this.currentProfile;
  }

  /**
   * Calculate position size based on current risk profile
   */
  public calculatePositionSize(
    portfolioValue: number,
    entryPrice: number,
    stopLoss: number,
    confidence: number = 1.0
  ): number {
    if (!this.currentProfile) return 0;

    const profile = this.currentProfile;
    const riskPerTrade = Math.abs(entryPrice - stopLoss) / entryPrice;
    
    let positionSize = 0;
    
    switch (profile.positionSizing.positionSizeMethod) {
      case 'fixed':
        positionSize = profile.positionSizing.maxPositionSize;
        break;
        
      case 'kelly':
        // Simplified Kelly calculation
        const winRate = confidence;
        const avgWin = profile.exitRules.takeProfitPercentage;
        const avgLoss = riskPerTrade;
        const kellyPercent = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
        positionSize = Math.max(0, kellyPercent * (profile.positionSizing.kellyMultiplier || 0.25));
        break;
        
      case 'volatility_adjusted':
        // Adjust position size based on volatility
        const volatilityAdjustment = Math.min(1, 0.02 / riskPerTrade); // Target 2% risk
        positionSize = profile.positionSizing.maxPositionSize * volatilityAdjustment;
        break;
        
      case 'var_based':
        // Position size based on VaR limits
        const varLimit = profile.varConfig.var95Threshold;
        positionSize = Math.min(profile.positionSizing.maxPositionSize, varLimit / riskPerTrade);
        break;
    }
    
    // Apply maximum limits
    positionSize = Math.min(positionSize, profile.positionSizing.maxPositionSize);
    
    return Math.max(0, positionSize);
  }

  /**
   * Check if trade meets risk criteria
   */
  public validateTrade(tradeRisk: number, currentDrawdown: number): boolean {
    if (!this.currentProfile) return false;

    const profile = this.currentProfile;
    
    // Check drawdown limit
    if (currentDrawdown >= profile.riskLimits.maxDrawdown) {
      return false;
    }
    
    // Check daily loss limit
    if (tradeRisk > profile.riskLimits.dailyLossLimit) {
      return false;
    }
    
    return true;
  }

  /**
   * Generate risk profile summary
   */
  public generateRiskSummary(): string {
    if (!this.currentProfile) return 'No risk profile selected';

    const profile = this.currentProfile;
    
    return `
🛡️ **RISK PROFILE: ${profile.displayName.toUpperCase()}**
═══════════════════════════════════════════

📊 **POSITION SIZING**
   Max Position: ${(profile.positionSizing.maxPositionSize * 100).toFixed(1)}%
   Max Exposure: ${(profile.positionSizing.maxTotalExposure * 100).toFixed(1)}%
   Method: ${profile.positionSizing.positionSizeMethod}

🚨 **RISK LIMITS**
   Max Drawdown: ${(profile.riskLimits.maxDrawdown * 100).toFixed(1)}%
   Daily Loss Limit: ${(profile.riskLimits.dailyLossLimit * 100).toFixed(1)}%
   Stop Trading DD: ${(profile.riskLimits.stopTradingDrawdown * 100).toFixed(1)}%

📈 **VAR CONFIGURATION**
   VaR95 Threshold: ${(profile.varConfig.var95Threshold * 100).toFixed(1)}%
   VaR99 Threshold: ${(profile.varConfig.var99Threshold * 100).toFixed(1)}%
   CVaR Threshold: ${(profile.varConfig.cvarThreshold * 100).toFixed(1)}%

🎯 **EXIT RULES**
   Stop Loss: ${(profile.exitRules.stopLossPercentage * 100).toFixed(2)}%
   Take Profit: ${(profile.exitRules.takeProfitPercentage * 100).toFixed(2)}%
   Risk/Reward: 1:${profile.exitRules.riskRewardRatio?.toFixed(1) || 'N/A'}
`;
  }
}

// Singleton instance export
export const riskProfileManager = RiskProfileManager.getInstance();

"use strict";
/**
 * ============================================================================
 * TRADING STRATEGIES CONFIGURATION
 * ============================================================================
 *
 * 📊 Centralized strategy definitions and parameters
 * ⚡ Type-safe strategy configuration management
 * 🎯 Strategy-specific optimization parameters
 *
 * Created: September 2, 2025
 * ============================================================================
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategyManager = exports.StrategyManager = exports.STRATEGY_OPTIMIZATION_CONFIGS = exports.STRATEGY_REGISTRY = exports.MOMENTUM_PRO_CONFIG = exports.SUPERTREND_CONFIG = exports.MA_CROSSOVER_CONFIG = exports.ADVANCED_ADAPTIVE_CONFIG = exports.ENHANCED_RSI_TURBO_CONFIG = void 0;
/**
 * Enhanced RSI Turbo Strategy Configuration
 */
exports.ENHANCED_RSI_TURBO_CONFIG = {
    name: 'EnhancedRSITurbo',
    displayName: 'Enhanced RSI Turbo',
    description: 'Advanced RSI-based strategy with turbo signals and adaptive parameters',
    category: 'momentum',
    timeframes: ['15m', '1h', '4h'],
    riskProfile: 'moderate',
    enabled: true,
    version: '2.1.0',
    parameters: {
        rsiPeriod: {
            name: 'RSI Period',
            type: 'number',
            defaultValue: 14,
            min: 10,
            max: 30,
            step: 1,
            description: 'Period for RSI calculation',
            optimizable: true
        },
        overboughtLevel: {
            name: 'Overbought Level',
            type: 'number',
            defaultValue: 70,
            min: 65,
            max: 85,
            step: 1,
            description: 'RSI overbought threshold',
            optimizable: true
        },
        oversoldLevel: {
            name: 'Oversold Level',
            type: 'number',
            defaultValue: 30,
            min: 15,
            max: 35,
            step: 1,
            description: 'RSI oversold threshold',
            optimizable: true
        },
        turboMultiplier: {
            name: 'Turbo Multiplier',
            type: 'number',
            defaultValue: 1.5,
            min: 1.0,
            max: 3.0,
            step: 0.1,
            description: 'Multiplier for turbo signals',
            optimizable: true
        },
        enableAdaptive: {
            name: 'Enable Adaptive',
            type: 'boolean',
            defaultValue: true,
            description: 'Enable adaptive parameter adjustment',
            optimizable: false
        }
    }
};
/**
 * Advanced Adaptive Strategy Configuration
 */
exports.ADVANCED_ADAPTIVE_CONFIG = {
    name: 'AdvancedAdaptive',
    displayName: 'Advanced Adaptive',
    description: 'ML-enhanced adaptive strategy with dynamic parameter optimization',
    category: 'ml',
    timeframes: ['1h', '4h', '1d'],
    riskProfile: 'aggressive',
    enabled: true,
    version: '3.0.0',
    parameters: {
        adaptationPeriod: {
            name: 'Adaptation Period',
            type: 'number',
            defaultValue: 50,
            min: 20,
            max: 100,
            step: 5,
            description: 'Period for strategy adaptation',
            optimizable: true
        },
        learningRate: {
            name: 'Learning Rate',
            type: 'number',
            defaultValue: 0.01,
            min: 0.001,
            max: 0.1,
            step: 0.001,
            description: 'ML model learning rate',
            optimizable: true
        },
        confidenceThreshold: {
            name: 'Confidence Threshold',
            type: 'number',
            defaultValue: 0.7,
            min: 0.5,
            max: 0.95,
            step: 0.05,
            description: 'Minimum confidence for signal generation',
            optimizable: true
        },
        enableEnsemble: {
            name: 'Enable Ensemble',
            type: 'boolean',
            defaultValue: true,
            description: 'Use ensemble of models',
            optimizable: false
        }
    }
};
/**
 * Moving Average Crossover Strategy Configuration
 */
exports.MA_CROSSOVER_CONFIG = {
    name: 'MACrossover',
    displayName: 'MA Crossover',
    description: 'Classic moving average crossover strategy with trend confirmation',
    category: 'trend',
    timeframes: ['1h', '4h', '1d'],
    riskProfile: 'conservative',
    enabled: true,
    version: '1.2.0',
    parameters: {
        fastPeriod: {
            name: 'Fast MA Period',
            type: 'number',
            defaultValue: 12,
            min: 5,
            max: 25,
            step: 1,
            description: 'Period for fast moving average',
            optimizable: true
        },
        slowPeriod: {
            name: 'Slow MA Period',
            type: 'number',
            defaultValue: 26,
            min: 15,
            max: 50,
            step: 1,
            description: 'Period for slow moving average',
            optimizable: true
        },
        maType: {
            name: 'MA Type',
            type: 'string',
            defaultValue: 'EMA',
            options: ['SMA', 'EMA', 'WMA'],
            description: 'Type of moving average',
            optimizable: true
        },
        confirmationPeriod: {
            name: 'Confirmation Period',
            type: 'number',
            defaultValue: 3,
            min: 1,
            max: 10,
            step: 1,
            description: 'Periods to wait for confirmation',
            optimizable: true
        }
    }
};
/**
 * SuperTrend Strategy Configuration
 */
exports.SUPERTREND_CONFIG = {
    name: 'SuperTrend',
    displayName: 'SuperTrend',
    description: 'SuperTrend indicator-based strategy with ATR bands',
    category: 'trend',
    timeframes: ['15m', '1h', '4h'],
    riskProfile: 'moderate',
    enabled: true,
    version: '1.5.0',
    parameters: {
        atrPeriod: {
            name: 'ATR Period',
            type: 'number',
            defaultValue: 10,
            min: 7,
            max: 21,
            step: 1,
            description: 'Period for ATR calculation',
            optimizable: true
        },
        atrMultiplier: {
            name: 'ATR Multiplier',
            type: 'number',
            defaultValue: 3.0,
            min: 1.5,
            max: 5.0,
            step: 0.1,
            description: 'Multiplier for ATR bands',
            optimizable: true
        },
        trendConfirmation: {
            name: 'Trend Confirmation',
            type: 'number',
            defaultValue: 2,
            min: 1,
            max: 5,
            step: 1,
            description: 'Periods for trend confirmation',
            optimizable: true
        }
    }
};
/**
 * Momentum Pro Strategy Configuration
 */
exports.MOMENTUM_PRO_CONFIG = {
    name: 'MomentumPro',
    displayName: 'Momentum Pro',
    description: 'Professional momentum strategy with multiple indicators',
    category: 'momentum',
    timeframes: ['15m', '1h', '4h'],
    riskProfile: 'aggressive',
    enabled: true,
    version: '2.0.0',
    parameters: {
        momentumPeriod: {
            name: 'Momentum Period',
            type: 'number',
            defaultValue: 14,
            min: 10,
            max: 25,
            step: 1,
            description: 'Period for momentum calculation',
            optimizable: true
        },
        stochPeriod: {
            name: 'Stochastic Period',
            type: 'number',
            defaultValue: 14,
            min: 10,
            max: 21,
            step: 1,
            description: 'Period for stochastic oscillator',
            optimizable: true
        },
        macdFast: {
            name: 'MACD Fast',
            type: 'number',
            defaultValue: 12,
            min: 8,
            max: 16,
            step: 1,
            description: 'MACD fast period',
            optimizable: true
        },
        macdSlow: {
            name: 'MACD Slow',
            type: 'number',
            defaultValue: 26,
            min: 20,
            max: 35,
            step: 1,
            description: 'MACD slow period',
            optimizable: true
        },
        signalSmoothing: {
            name: 'Signal Smoothing',
            type: 'number',
            defaultValue: 9,
            min: 5,
            max: 15,
            step: 1,
            description: 'Signal line smoothing period',
            optimizable: true
        }
    }
};
/**
 * All available strategies registry
 */
exports.STRATEGY_REGISTRY = {
    'EnhancedRSITurbo': exports.ENHANCED_RSI_TURBO_CONFIG,
    'AdvancedAdaptive': exports.ADVANCED_ADAPTIVE_CONFIG,
    'MACrossover': exports.MA_CROSSOVER_CONFIG,
    'SuperTrend': exports.SUPERTREND_CONFIG,
    'MomentumPro': exports.MOMENTUM_PRO_CONFIG,
    // Add more strategies as they are implemented
    'MomentumConfirm': {
        ...exports.MOMENTUM_PRO_CONFIG,
        name: 'MomentumConfirm',
        displayName: 'Momentum Confirm',
        description: 'Momentum strategy with confirmation signals',
        riskProfile: 'moderate'
    },
    'RSITurbo': {
        ...exports.ENHANCED_RSI_TURBO_CONFIG,
        name: 'RSITurbo',
        displayName: 'RSI Turbo',
        description: 'Basic RSI turbo strategy',
        version: '1.0.0'
    }
};
/**
 * Default optimization configurations for each strategy
 */
exports.STRATEGY_OPTIMIZATION_CONFIGS = {
    'EnhancedRSITurbo': {
        strategy: 'EnhancedRSITurbo',
        method: 'bayesian',
        trials: 100,
        timeout: 3600, // 1 hour
        objectives: ['sharpe_ratio', 'total_return', 'max_drawdown'],
        constraints: {
            max_drawdown: 0.15,
            min_trades: 10
        }
    },
    'AdvancedAdaptive': {
        strategy: 'AdvancedAdaptive',
        method: 'bayesian',
        trials: 200,
        timeout: 7200, // 2 hours
        objectives: ['sharpe_ratio', 'sortino_ratio', 'calmar_ratio'],
        constraints: {
            max_drawdown: 0.20,
            min_confidence: 0.6
        }
    },
    'MACrossover': {
        strategy: 'MACrossover',
        method: 'grid_search',
        trials: 150,
        timeout: 1800, // 30 minutes
        objectives: ['sharpe_ratio', 'win_rate'],
        constraints: {
            max_drawdown: 0.12,
            min_trades: 20
        }
    }
};
/**
 * Strategy Manager Class
 */
class StrategyManager {
    constructor() {
        this.activeStrategies = new Set();
    }
    static getInstance() {
        if (!StrategyManager.instance) {
            StrategyManager.instance = new StrategyManager();
        }
        return StrategyManager.instance;
    }
    /**
     * Get strategy configuration by name
     */
    getStrategyConfig(strategyName) {
        return exports.STRATEGY_REGISTRY[strategyName] || null;
    }
    /**
     * Get all available strategies
     */
    getAllStrategies() {
        return Object.values(exports.STRATEGY_REGISTRY);
    }
    /**
     * Get strategies by category
     */
    getStrategiesByCategory(category) {
        return Object.values(exports.STRATEGY_REGISTRY).filter(s => s.category === category);
    }
    /**
     * Get strategies by risk profile
     */
    getStrategiesByRiskProfile(riskProfile) {
        return Object.values(exports.STRATEGY_REGISTRY).filter(s => s.riskProfile === riskProfile);
    }
    /**
     * Enable/disable strategy
     */
    setStrategyEnabled(strategyName, enabled) {
        const strategy = exports.STRATEGY_REGISTRY[strategyName];
        if (!strategy)
            return false;
        strategy.enabled = enabled;
        if (enabled) {
            this.activeStrategies.add(strategyName);
        }
        else {
            this.activeStrategies.delete(strategyName);
        }
        return true;
    }
    /**
     * Get active strategies
     */
    getActiveStrategies() {
        return Array.from(this.activeStrategies);
    }
    /**
     * Validate strategy parameters
     */
    validateStrategyParameters(strategyName, parameters) {
        const strategy = this.getStrategyConfig(strategyName);
        if (!strategy)
            return [`Strategy ${strategyName} not found`];
        const errors = [];
        Object.entries(parameters).forEach(([paramName, value]) => {
            const paramConfig = strategy.parameters[paramName];
            if (!paramConfig) {
                errors.push(`Unknown parameter: ${paramName}`);
                return;
            }
            // Type validation
            if (paramConfig.type === 'number' && typeof value !== 'number') {
                errors.push(`Parameter ${paramName} must be a number`);
            }
            // Range validation
            if (paramConfig.type === 'number') {
                if (paramConfig.min !== undefined && value < paramConfig.min) {
                    errors.push(`Parameter ${paramName} must be >= ${paramConfig.min}`);
                }
                if (paramConfig.max !== undefined && value > paramConfig.max) {
                    errors.push(`Parameter ${paramName} must be <= ${paramConfig.max}`);
                }
            }
            // Options validation
            if (paramConfig.options && !paramConfig.options.includes(value)) {
                errors.push(`Parameter ${paramName} must be one of: ${paramConfig.options.join(', ')}`);
            }
        });
        return errors;
    }
}
exports.StrategyManager = StrategyManager;
// Singleton instance export
exports.strategyManager = StrategyManager.getInstance();

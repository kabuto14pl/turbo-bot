"use strict";
/**
 * 🎛️ RL SYSTEM CONFIGURATION
 *
 * Complete configuration for RL Learning system
 * Includes agent configs, hyperparameters, and system settings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MARKET_CONDITION_CONFIGS = exports.DEVELOPMENT_RL_CONFIG = exports.PRODUCTION_RL_CONFIG = exports.DEFAULT_RL_CONFIG = void 0;
exports.getRLConfig = getRLConfig;
exports.getAdaptiveRLConfig = getAdaptiveRLConfig;
exports.validateRLConfig = validateRLConfig;
exports.createOptimizedRLConfig = createOptimizedRLConfig;
exports.DEFAULT_RL_CONFIG = {
    enabled: true,
    model_save_path: './models/rl_agents',
    training_enabled: true,
    training_frequency: 100, // Train every 100 episodes
    performance_threshold: 0.6, // Minimum score to use RL strategy
    max_agents: 3,
    reward_config: {
        profit_weight: 1.0,
        risk_weight: 0.5,
        consistency_weight: 0.3,
        drawdown_penalty: 2.0,
        trade_frequency_penalty: 0.1,
        win_rate_bonus: 0.5,
        sharpe_ratio_bonus: 0.3,
    },
    agent_configs: [
        {
            id: 'ppo_conservative',
            name: 'Conservative PPO Agent',
            hyperparameters: {
                learning_rate: 0.0003,
                clip_epsilon: 0.2,
                epochs: 4,
                batch_size: 64,
                gamma: 0.95, // Lower gamma for more conservative approach
                lambda: 0.95,
                value_loss_coef: 0.5,
                entropy_coef: 0.01,
            },
        },
        {
            id: 'ppo_aggressive',
            name: 'Aggressive PPO Agent',
            hyperparameters: {
                learning_rate: 0.0005,
                clip_epsilon: 0.3,
                epochs: 6,
                batch_size: 32,
                gamma: 0.99, // Higher gamma for long-term rewards
                lambda: 0.9,
                value_loss_coef: 0.3,
                entropy_coef: 0.02, // Higher entropy for more exploration
            },
        },
        {
            id: 'ppo_balanced',
            name: 'Balanced PPO Agent',
            hyperparameters: {
                learning_rate: 0.0004,
                clip_epsilon: 0.25,
                epochs: 5,
                batch_size: 48,
                gamma: 0.97,
                lambda: 0.93,
                value_loss_coef: 0.4,
                entropy_coef: 0.015,
            },
        },
    ],
};
exports.PRODUCTION_RL_CONFIG = {
    ...exports.DEFAULT_RL_CONFIG,
    training_enabled: false, // Disable training in production
    training_frequency: 1000,
    performance_threshold: 0.7, // Higher threshold for production
    agent_configs: [
        {
            id: 'ppo_production',
            name: 'Production PPO Agent',
            hyperparameters: {
                learning_rate: 0.0002, // Lower learning rate for stability
                clip_epsilon: 0.15, // Lower clip for more conservative updates
                epochs: 3,
                batch_size: 64,
                gamma: 0.95,
                lambda: 0.95,
                value_loss_coef: 0.5,
                entropy_coef: 0.005, // Lower entropy for less exploration
            },
        },
    ],
};
exports.DEVELOPMENT_RL_CONFIG = {
    ...exports.DEFAULT_RL_CONFIG,
    training_frequency: 50, // More frequent training for development
    performance_threshold: 0.4, // Lower threshold for testing
    agent_configs: [
        {
            id: 'ppo_dev_fast',
            name: 'Development Fast Agent',
            hyperparameters: {
                learning_rate: 0.001, // Higher learning rate for faster learning
                clip_epsilon: 0.4,
                epochs: 8,
                batch_size: 16,
                gamma: 0.9,
                lambda: 0.8,
                value_loss_coef: 0.3,
                entropy_coef: 0.05, // High entropy for exploration
            },
        },
    ],
};
/**
 * Environment-specific RL configurations
 */
function getRLConfig(environment = 'development') {
    switch (environment) {
        case 'production':
            return exports.PRODUCTION_RL_CONFIG;
        case 'development':
            return exports.DEVELOPMENT_RL_CONFIG;
        case 'testing':
            return {
                ...exports.DEFAULT_RL_CONFIG,
                enabled: true,
                training_enabled: true,
                training_frequency: 10, // Very frequent for testing
                performance_threshold: 0.2,
                agent_configs: [
                    {
                        id: 'ppo_test',
                        name: 'Test PPO Agent',
                        hyperparameters: {
                            learning_rate: 0.01, // Very high for fast testing
                            clip_epsilon: 0.5,
                            epochs: 2,
                            batch_size: 8,
                            gamma: 0.8,
                            lambda: 0.7,
                            value_loss_coef: 0.2,
                            entropy_coef: 0.1,
                        },
                    },
                ],
            };
        default:
            return exports.DEFAULT_RL_CONFIG;
    }
}
/**
 * Market condition specific configurations
 */
exports.MARKET_CONDITION_CONFIGS = {
    BULL_MARKET: {
        reward_config: {
            profit_weight: 1.2, // Higher profit focus in bull market
            risk_weight: 0.3, // Lower risk aversion
            consistency_weight: 0.2,
            drawdown_penalty: 1.5,
            trade_frequency_penalty: 0.05, // Less penalty for frequent trading
            win_rate_bonus: 0.4,
            sharpe_ratio_bonus: 0.4,
        },
    },
    BEAR_MARKET: {
        reward_config: {
            profit_weight: 0.8,
            risk_weight: 1.0, // Higher risk aversion in bear market
            consistency_weight: 0.5, // More focus on consistency
            drawdown_penalty: 3.0, // Heavy penalty for drawdowns
            trade_frequency_penalty: 0.2, // Penalty for overtrading
            win_rate_bonus: 0.6,
            sharpe_ratio_bonus: 0.2,
        },
    },
    SIDEWAYS_MARKET: {
        reward_config: {
            profit_weight: 1.0,
            risk_weight: 0.6,
            consistency_weight: 0.8, // High focus on consistency
            drawdown_penalty: 2.0,
            trade_frequency_penalty: 0.3, // Higher penalty for frequent trading
            win_rate_bonus: 0.7, // High bonus for winning trades
            sharpe_ratio_bonus: 0.3,
        },
    },
};
/**
 * Adaptive configuration based on market conditions
 */
function getAdaptiveRLConfig(baseConfig, marketCondition) {
    const adaptiveConfig = { ...baseConfig };
    const conditionConfig = exports.MARKET_CONDITION_CONFIGS[marketCondition + '_MARKET'];
    if (conditionConfig) {
        adaptiveConfig.reward_config = {
            ...adaptiveConfig.reward_config,
            ...conditionConfig.reward_config,
        };
    }
    return adaptiveConfig;
}
/**
 * Configuration validation
 */
function validateRLConfig(config) {
    const errors = [];
    // Check required fields
    if (!config.model_save_path) {
        errors.push('model_save_path is required');
    }
    if (config.max_agents <= 0) {
        errors.push('max_agents must be greater than 0');
    }
    if (config.agent_configs.length === 0) {
        errors.push('At least one agent configuration is required');
    }
    if (config.agent_configs.length > config.max_agents) {
        errors.push('Number of agent configs exceeds max_agents limit');
    }
    // Validate agent configurations
    for (const agentConfig of config.agent_configs) {
        if (!agentConfig.id || !agentConfig.name) {
            errors.push(`Agent config missing id or name: ${JSON.stringify(agentConfig)}`);
        }
        if (agentConfig.hyperparameters) {
            const hp = agentConfig.hyperparameters;
            if (hp.learning_rate && (hp.learning_rate <= 0 || hp.learning_rate > 1)) {
                errors.push(`Invalid learning_rate for agent ${agentConfig.id}: ${hp.learning_rate}`);
            }
            if (hp.clip_epsilon && (hp.clip_epsilon <= 0 || hp.clip_epsilon > 1)) {
                errors.push(`Invalid clip_epsilon for agent ${agentConfig.id}: ${hp.clip_epsilon}`);
            }
            if (hp.gamma && (hp.gamma <= 0 || hp.gamma > 1)) {
                errors.push(`Invalid gamma for agent ${agentConfig.id}: ${hp.gamma}`);
            }
        }
    }
    // Validate reward config
    const rc = config.reward_config;
    if (rc.profit_weight < 0 || rc.risk_weight < 0 || rc.consistency_weight < 0) {
        errors.push('Reward weights cannot be negative');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Create optimized configuration for specific use case
 */
function createOptimizedRLConfig(useCase, riskTolerance) {
    const baseConfig = { ...exports.DEFAULT_RL_CONFIG };
    // Adjust based on use case
    switch (useCase) {
        case 'day_trading':
            baseConfig.training_frequency = 20; // More frequent training
            baseConfig.reward_config.trade_frequency_penalty = 0.05; // Less penalty for frequent trades
            break;
        case 'swing_trading':
            baseConfig.training_frequency = 100;
            baseConfig.reward_config.consistency_weight = 0.5; // Higher consistency focus
            break;
        case 'position_trading':
            baseConfig.training_frequency = 200; // Less frequent training
            baseConfig.reward_config.profit_weight = 1.5; // Higher profit focus
            baseConfig.reward_config.drawdown_penalty = 3.0; // Higher drawdown penalty
            break;
    }
    // Adjust based on risk tolerance
    switch (riskTolerance) {
        case 'low':
            baseConfig.reward_config.risk_weight = 1.0;
            baseConfig.reward_config.drawdown_penalty = 3.0;
            baseConfig.performance_threshold = 0.7;
            break;
        case 'medium':
            baseConfig.reward_config.risk_weight = 0.6;
            baseConfig.reward_config.drawdown_penalty = 2.0;
            baseConfig.performance_threshold = 0.6;
            break;
        case 'high':
            baseConfig.reward_config.risk_weight = 0.3;
            baseConfig.reward_config.drawdown_penalty = 1.0;
            baseConfig.performance_threshold = 0.5;
            break;
    }
    return baseConfig;
}

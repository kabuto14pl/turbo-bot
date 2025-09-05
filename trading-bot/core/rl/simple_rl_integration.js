"use strict";
/**
 * 🎯 SIMPLIFIED RL INTEGRATION TEST
 *
 * Basic test to verify RL integration works in main.ts
 * Focuses on getting the core system working without complex portfolio integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SIMPLE_RL_CONFIG = exports.SimpleRLManager = exports.SimpleRLAgent = void 0;
const logger_1 = require("../../infrastructure/logging/logger");
/**
 * 🧠 SIMPLE RL AGENT FOR INITIAL TESTING
 * Basic implementation to validate RL integration in main trading loop
 */
class SimpleRLAgent {
    constructor(config) {
        this.episodeCount = 0;
        this.totalReward = 0;
        this.actionHistory = [];
        this.config = config;
        this.logger = new logger_1.Logger('SimpleRLAgent');
        this.logger.info('Simple RL Agent initialized');
    }
    /**
     * Generate trading action based on current market state
     */
    async generateAction(state) {
        // Simple rule-based approach for now (will be replaced with actual RL)
        let action;
        if (state.rsi < 30 && state.trend === 'DOWN') {
            action = {
                type: 'BUY',
                confidence: 0.7,
                reasoning: 'Oversold RSI + downtrend reversal opportunity'
            };
        }
        else if (state.rsi > 70 && state.trend === 'UP') {
            action = {
                type: 'SELL',
                confidence: 0.7,
                reasoning: 'Overbought RSI + uptrend exhaustion'
            };
        }
        else {
            action = {
                type: 'HOLD',
                confidence: 0.5,
                reasoning: 'No clear signal'
            };
        }
        // Add exploration noise
        if (Math.random() < this.config.exploration_rate) {
            const randomActions = ['BUY', 'SELL', 'HOLD'];
            action.type = randomActions[Math.floor(Math.random() * randomActions.length)];
            action.confidence *= 0.5; // Reduce confidence for random actions
            action.reasoning += ' (exploration)';
        }
        // Store state-action pair for learning
        this.actionHistory.push({ state, action });
        this.logger.debug(`RL Action: ${action.type} (conf: ${action.confidence.toFixed(3)}) - ${action.reasoning}`);
        return action;
    }
    /**
     * Learn from trade result
     */
    async learn(reward) {
        this.totalReward += reward;
        this.episodeCount++;
        // Update last action with reward
        if (this.actionHistory.length > 0) {
            this.actionHistory[this.actionHistory.length - 1].reward = reward;
        }
        // Simple learning: adjust exploration rate based on performance
        const avgReward = this.totalReward / this.episodeCount;
        if (avgReward > this.config.reward_threshold) {
            this.config.exploration_rate *= 0.95; // Reduce exploration if performing well
        }
        else {
            this.config.exploration_rate = Math.min(0.3, this.config.exploration_rate * 1.05); // Increase exploration if performing poorly
        }
        this.logger.debug(`RL Learning: reward=${reward.toFixed(4)}, avg_reward=${avgReward.toFixed(4)}, exploration=${this.config.exploration_rate.toFixed(3)}`);
    }
    /**
     * Get performance metrics
     */
    getPerformance() {
        return {
            totalReward: this.totalReward,
            avgReward: this.episodeCount > 0 ? this.totalReward / this.episodeCount : 0,
            episodes: this.episodeCount,
            explorationRate: this.config.exploration_rate,
        };
    }
    /**
     * Check if agent is performing well enough to be used
     */
    isPerforming() {
        if (this.episodeCount < 10)
            return false; // Need minimum episodes
        const avgReward = this.totalReward / this.episodeCount;
        return avgReward > this.config.reward_threshold;
    }
    /**
     * Reset agent state
     */
    reset() {
        this.episodeCount = 0;
        this.totalReward = 0;
        this.actionHistory = [];
        this.config.exploration_rate = 0.2; // Reset exploration rate
        this.logger.info('RL Agent reset');
    }
}
exports.SimpleRLAgent = SimpleRLAgent;
/**
 * 🎯 SIMPLE RL INTEGRATION MANAGER
 * Manages the simple RL agent for integration testing
 */
class SimpleRLManager {
    constructor(config) {
        this.enabled = config.enabled;
        this.agent = new SimpleRLAgent(config);
        this.logger = new logger_1.Logger('SimpleRLManager');
        if (this.enabled) {
            this.logger.info('Simple RL Manager initialized and enabled');
        }
        else {
            this.logger.info('Simple RL Manager initialized but disabled');
        }
    }
    /**
     * Process trading step
     */
    async processStep(price, rsi, volume) {
        if (!this.enabled)
            return null;
        try {
            // Determine trend (simplified)
            const trend = this.determineTrend(rsi);
            const state = {
                price,
                rsi,
                volume,
                trend,
            };
            const action = await this.agent.generateAction(state);
            return action;
        }
        catch (error) {
            this.logger.error(`RL processing error: ${error}`);
            return null;
        }
    }
    /**
     * Learn from trade result
     */
    async learnFromResult(profit) {
        if (!this.enabled)
            return;
        // Simple reward calculation: normalize profit to [-1, 1] range
        const reward = Math.tanh(profit / 100); // Assuming $100 is a significant profit
        await this.agent.learn(reward);
    }
    /**
     * Get agent performance
     */
    getPerformance() {
        return this.agent.getPerformance();
    }
    /**
     * Check if RL should be used for trading
     */
    shouldUseRL() {
        return this.enabled && this.agent.isPerforming();
    }
    /**
     * Enable/disable RL system
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.logger.info(`RL system ${enabled ? 'enabled' : 'disabled'}`);
    }
    determineTrend(rsi) {
        if (rsi > 60)
            return 'UP';
        if (rsi < 40)
            return 'DOWN';
        return 'SIDEWAYS';
    }
}
exports.SimpleRLManager = SimpleRLManager;
/**
 * Default configuration for testing
 */
exports.DEFAULT_SIMPLE_RL_CONFIG = {
    enabled: true,
    learning_rate: 0.01,
    exploration_rate: 0.2,
    reward_threshold: 0.1,
};

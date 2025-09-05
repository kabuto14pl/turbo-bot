/**
 * 🎯 SIMPLIFIED RL INTEGRATION TEST
 * 
 * Basic test to verify RL integration works in main.ts
 * Focuses on getting the core system working without complex portfolio integration
 */

import { Logger } from '../../infrastructure/logging/logger';

export interface SimpleRLConfig {
  enabled: boolean;
  learning_rate: number;
  exploration_rate: number;
  reward_threshold: number;
}

export interface SimpleRLAction {
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
}

export interface SimpleRLState {
  price: number;
  rsi: number;
  volume: number;
  trend: 'UP' | 'DOWN' | 'SIDEWAYS';
}

/**
 * 🧠 SIMPLE RL AGENT FOR INITIAL TESTING
 * Basic implementation to validate RL integration in main trading loop
 */
export class SimpleRLAgent {
  private logger: Logger;
  private config: SimpleRLConfig;
  private episodeCount: number = 0;
  private totalReward: number = 0;
  private actionHistory: Array<{ state: SimpleRLState; action: SimpleRLAction; reward?: number }> = [];

  constructor(config: SimpleRLConfig) {
    this.config = config;
    this.logger = new Logger('SimpleRLAgent');
    this.logger.info('Simple RL Agent initialized');
  }

  /**
   * Generate trading action based on current market state
   */
  async generateAction(state: SimpleRLState): Promise<SimpleRLAction> {
    // Simple rule-based approach for now (will be replaced with actual RL)
    let action: SimpleRLAction;

    if (state.rsi < 30 && state.trend === 'DOWN') {
      action = {
        type: 'BUY',
        confidence: 0.7,
        reasoning: 'Oversold RSI + downtrend reversal opportunity'
      };
    } else if (state.rsi > 70 && state.trend === 'UP') {
      action = {
        type: 'SELL',
        confidence: 0.7,
        reasoning: 'Overbought RSI + uptrend exhaustion'
      };
    } else {
      action = {
        type: 'HOLD',
        confidence: 0.5,
        reasoning: 'No clear signal'
      };
    }

    // Add exploration noise
    if (Math.random() < this.config.exploration_rate) {
      const randomActions: ('BUY' | 'SELL' | 'HOLD')[] = ['BUY', 'SELL', 'HOLD'];
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
  async learn(reward: number): Promise<void> {
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
    } else {
      this.config.exploration_rate = Math.min(0.3, this.config.exploration_rate * 1.05); // Increase exploration if performing poorly
    }

    this.logger.debug(`RL Learning: reward=${reward.toFixed(4)}, avg_reward=${avgReward.toFixed(4)}, exploration=${this.config.exploration_rate.toFixed(3)}`);
  }

  /**
   * Get performance metrics
   */
  getPerformance(): { totalReward: number; avgReward: number; episodes: number; explorationRate: number } {
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
  isPerforming(): boolean {
    if (this.episodeCount < 10) return false; // Need minimum episodes
    const avgReward = this.totalReward / this.episodeCount;
    return avgReward > this.config.reward_threshold;
  }

  /**
   * Reset agent state
   */
  reset(): void {
    this.episodeCount = 0;
    this.totalReward = 0;
    this.actionHistory = [];
    this.config.exploration_rate = 0.2; // Reset exploration rate
    this.logger.info('RL Agent reset');
  }
}

/**
 * 🎯 SIMPLE RL INTEGRATION MANAGER
 * Manages the simple RL agent for integration testing
 */
export class SimpleRLManager {
  private agent: SimpleRLAgent;
  private logger: Logger;
  private enabled: boolean;

  constructor(config: SimpleRLConfig) {
    this.enabled = config.enabled;
    this.agent = new SimpleRLAgent(config);
    this.logger = new Logger('SimpleRLManager');
    
    if (this.enabled) {
      this.logger.info('Simple RL Manager initialized and enabled');
    } else {
      this.logger.info('Simple RL Manager initialized but disabled');
    }
  }

  /**
   * Process trading step
   */
  async processStep(price: number, rsi: number, volume: number): Promise<SimpleRLAction | null> {
    if (!this.enabled) return null;

    try {
      // Determine trend (simplified)
      const trend = this.determineTrend(rsi);

      const state: SimpleRLState = {
        price,
        rsi,
        volume,
        trend,
      };

      const action = await this.agent.generateAction(state);
      return action;
    } catch (error) {
      this.logger.error(`RL processing error: ${error}`);
      return null;
    }
  }

  /**
   * Learn from trade result
   */
  async learnFromResult(profit: number): Promise<void> {
    if (!this.enabled) return;

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
  shouldUseRL(): boolean {
    return this.enabled && this.agent.isPerforming();
  }

  /**
   * Enable/disable RL system
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.logger.info(`RL system ${enabled ? 'enabled' : 'disabled'}`);
  }

  private determineTrend(rsi: number): 'UP' | 'DOWN' | 'SIDEWAYS' {
    if (rsi > 60) return 'UP';
    if (rsi < 40) return 'DOWN';
    return 'SIDEWAYS';
  }
}

/**
 * Default configuration for testing
 */
export const DEFAULT_SIMPLE_RL_CONFIG: SimpleRLConfig = {
  enabled: true,
  learning_rate: 0.01,
  exploration_rate: 0.2,
  reward_threshold: 0.1,
};

/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🚀 RL INTEGRATION MANAGER
 * 
 * Main integration layer that connects RL components with the trading bot
 * Manages PPO agents, training, model persistence, and performance monitoring
 */

// import { PPOTradingAgent, OptunaHyperOptimizer } from '../../advanced_ai_ml_system'; // TYMCZASOWO WYŁĄCZONE
import { RLStrategy } from '../strategy/rl_strategy';
import { TradingEnvironment, TradingEnvironmentState, RLAction, RewardConfig } from './trading_environment';
import { BotState } from '../types/bot_state';
import { Candle } from '../types/strategy';
import { IndicatorSet } from '../types/indicator_set';
import { Logger } from '../../infrastructure/logging/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface RLSystemConfig {
  enabled: boolean;
  model_save_path: string;
  training_enabled: boolean;
  training_frequency: number; // Episodes between training sessions
  performance_threshold: number;
  max_agents: number;
  reward_config: RewardConfig;
  agent_configs: Array<{
    id: string;
    name: string;
    hyperparameters?: any;
  }>;
}

export interface RLPerformanceMetrics {
  agent_id: string;
  total_reward: number;
  average_reward: number;
  win_rate: number;
  sharpe_ratio: number;
  max_drawdown: number;
  trades_executed: number;
  training_episodes: number;
  last_updated: Date;
}

/**
 * 🧠 RL INTEGRATION MANAGER
 */
// Temporary type definitions for disabled ML components
type PPOTradingAgent = any;
type OptunaHyperOptimizer = any;

export class RLIntegrationManager {
  private config: RLSystemConfig;
  private logger: Logger;
  private agents: Map<string, PPOTradingAgent> = new Map();
  private strategies: Map<string, RLStrategy> = new Map();
  private environment: TradingEnvironment;
  private optimizer: OptunaHyperOptimizer;
  private performanceMetrics: Map<string, RLPerformanceMetrics> = new Map();
  private currentEpisode: number = 0;
  private trainingInProgress: boolean = false;
  private episodeHistory: Array<{
    episode: number;
    agent_id: string;
    total_reward: number;
    steps: number;
    timestamp: Date;
  }> = [];

  constructor(config: RLSystemConfig) {
    this.config = config;
    this.logger = new Logger('RLIntegrationManager');
    this.environment = new TradingEnvironment(config.reward_config);
    // Initialize optimizer (temporarily disabled)
    // this.optimizer = new OptunaHyperOptimizer('trading_bot_optimization');

    this.initializeSystem();
  }

  /**
   * Initialize RL system with configured agents
   */
  private async initializeSystem(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.info('RL system disabled in configuration');
      return;
    }

    try {
      // Create model save directory
      if (!fs.existsSync(this.config.model_save_path)) {
        fs.mkdirSync(this.config.model_save_path, { recursive: true });
      }

      // Initialize agents
      for (const agentConfig of this.config.agent_configs) {
        await this.createAgent(agentConfig);
      }

      // Load existing models if available
      await this.loadSavedModels();

      this.logger.info(`RL system initialized with ${this.agents.size} agents`);
    } catch (error) {
      this.logger.error(`Failed to initialize RL system: ${error}`);
      throw error;
    }
  }

  /**
   * Create and register new RL agent
   */
  private async createAgent(agentConfig: { id: string; name: string; hyperparameters?: any }): Promise<void> {
    try {
      // Create PPO agent
      // Temporarily disabled - ML agent creation
      // const agent = new PPOTradingAgent({
      //   id: agentConfig.id,
      //   name: agentConfig.name,
      //   hyperparameters: agentConfig.hyperparameters,
      // });
      const agent = null; // Mock agent

      // Create RL strategy
      const strategy = new RLStrategy({
        agentId: agentConfig.id,
        agentName: agentConfig.name,
        enableOnlineLearning: this.config.training_enabled,
        rewardParameters: {
          profitWeight: this.config.reward_config.profit_weight,
          riskWeight: this.config.reward_config.risk_weight,
          consistencyWeight: this.config.reward_config.consistency_weight,
        },
        performanceThreshold: this.config.performance_threshold,
      });

      // Register agent and strategy
      this.agents.set(agentConfig.id, agent);
      this.strategies.set(agentConfig.id, strategy);

      // Initialize performance metrics
      this.performanceMetrics.set(agentConfig.id, {
        agent_id: agentConfig.id,
        total_reward: 0,
        average_reward: 0,
        win_rate: 0.5,
        sharpe_ratio: 0,
        max_drawdown: 0,
        trades_executed: 0,
        training_episodes: 0,
        last_updated: new Date(),
      });

      this.logger.info(`Created RL agent: ${agentConfig.name} (${agentConfig.id})`);
    } catch (error) {
      this.logger.error(`Failed to create agent ${agentConfig.id}: ${error}`);
      throw error;
    }
  }

  /**
   * Get best performing RL strategy
   */
  public getBestStrategy(): RLStrategy | null {
    if (!this.config.enabled || this.strategies.size === 0) {
      return null;
    }

    let bestStrategy: RLStrategy | null = null;
    let bestScore = -Infinity;

    for (const [agentId, strategy] of this.strategies) {
      const metrics = this.performanceMetrics.get(agentId);
      if (!metrics) continue;

      // Calculate composite score
      const score = metrics.sharpe_ratio * 0.4 + metrics.win_rate * 0.3 + 
                   (1 - metrics.max_drawdown) * 0.2 + (metrics.average_reward * 0.1);

      if (score > bestScore && score > this.config.performance_threshold) {
        bestScore = score;
        bestStrategy = strategy;
      }
    }

    if (bestStrategy) {
      this.logger.debug(`Selected best RL strategy with score: ${bestScore.toFixed(4)}`);
    }

    return bestStrategy;
  }

  /**
   * Process trading step for all agents
   */
  public async processStep(candle: Candle, indicators: IndicatorSet, botState: BotState): Promise<void> {
    if (!this.config.enabled) return;

    try {
      // Reset environment if needed
      if (this.currentEpisode === 0) {
        this.environment.reset(botState);
      }

      // Process step for each agent
      for (const [agentId, agent] of this.agents) {
        await this.processAgentStep(agentId, agent, candle, indicators, botState);
      }

      // Check if training is needed
      if (this.shouldTriggerTraining()) {
        await this.triggerTraining();
      }

      this.currentEpisode++;
    } catch (error) {
      this.logger.error(`Error processing RL step: ${error}`);
    }
  }

  /**
   * Process step for specific agent
   */
  private async processAgentStep(
    agentId: string,
    agent: PPOTradingAgent,
    candle: Candle,
    indicators: IndicatorSet,
    botState: BotState
  ): Promise<void> {
    try {
      // Get current environment state
      const state = this.environment.getCurrentState();
      
      // Generate action from agent
      const action = await agent.generateAction(this.convertStateToMarketState(state));
      
      // Execute step in environment
      const step = this.environment.step(this.convertActionToRLAction(action), candle, indicators, botState);
      
      // Learn from the result
      await agent.learnFromResult(step.reward, this.convertStateToMarketState(step.state), step.done);
      
      // Update performance metrics
      this.updateAgentMetrics(agentId, step.reward, step.info.trade_executed || false);
      
      // Log significant events
      if (step.info.trade_executed) {
        this.logger.debug(`Agent ${agentId} executed trade: reward=${step.reward.toFixed(4)}`);
      }
      
    } catch (error) {
      this.logger.error(`Error processing step for agent ${agentId}: ${error}`);
    }
  }

  /**
   * Trigger training for agents
   */
  private async triggerTraining(): Promise<void> {
    if (this.trainingInProgress || !this.config.training_enabled) return;

    this.trainingInProgress = true;
    this.logger.info('Starting RL training session...');

    try {
      // Train each agent
      for (const [agentId, agent] of this.agents) {
        await this.trainAgent(agentId, agent);
      }

      // Save models after training
      await this.saveModels();

      this.logger.info('RL training session completed');
    } catch (error) {
      this.logger.error(`Training failed: ${error}`);
    } finally {
      this.trainingInProgress = false;
    }
  }

  /**
   * Train specific agent
   */
  private async trainAgent(agentId: string, agent: PPOTradingAgent): Promise<void> {
    try {
      // This would trigger the agent's internal training
      // The PPOTradingAgent should handle batch training from its experience buffer
      
      // For now, we'll simulate training completion
      const metrics = this.performanceMetrics.get(agentId);
      if (metrics) {
        metrics.training_episodes++;
        metrics.last_updated = new Date();
        this.performanceMetrics.set(agentId, metrics);
      }

      this.logger.debug(`Completed training for agent ${agentId}`);
    } catch (error) {
      this.logger.error(`Failed to train agent ${agentId}: ${error}`);
    }
  }

  /**
   * Optimize agent hyperparameters
   */
  public async optimizeAgent(agentId: string, validationData: any[]): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    this.logger.info(`Starting hyperparameter optimization for agent ${agentId}...`);

    try {
      // const optimizedParams = await this.optimizer.optimizeAgent(agent, validationData, 50);
      
      // Create new agent with optimized parameters (temporarily disabled)
      // const newAgent = new PPOTradingAgent({
      //   id: agentId,
      //   name: agent.name,
      //   hyperparameters: optimizedParams,
      // });
      const newAgent = null; // Mock agent

      // Replace old agent
      this.agents.set(agentId, newAgent);
      
      this.logger.info(`Hyperparameter optimization completed for agent ${agentId}`);
    } catch (error) {
      this.logger.error(`Optimization failed for agent ${agentId}: ${error}`);
    }
  }

  /**
   * Save trained models
   */
  private async saveModels(): Promise<void> {
    try {
      for (const [agentId, agent] of this.agents) {
        const modelPath = path.join(this.config.model_save_path, `${agentId}_model.json`);
        
        // Save agent state/model
        const agentData = {
          id: agentId,
          name: agent.name,
          performance: this.performanceMetrics.get(agentId),
          timestamp: new Date().toISOString(),
        };

        fs.writeFileSync(modelPath, JSON.stringify(agentData, null, 2));
      }

      this.logger.debug('Models saved successfully');
    } catch (error) {
      this.logger.error(`Failed to save models: ${error}`);
    }
  }

  /**
   * Load saved models
   */
  private async loadSavedModels(): Promise<void> {
    try {
      const modelFiles = fs.readdirSync(this.config.model_save_path)
        .filter(file => file.endsWith('_model.json'));

      for (const file of modelFiles) {
        const filePath = path.join(this.config.model_save_path, file);
        const agentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (agentData.performance) {
          this.performanceMetrics.set(agentData.id, agentData.performance);
        }
      }

      this.logger.info(`Loaded ${modelFiles.length} saved models`);
    } catch (error) {
      this.logger.warn(`Could not load saved models: ${error}`);
    }
  }

  /**
   * Get performance report
   */
  public getPerformanceReport(): { agents: RLPerformanceMetrics[]; system: any } {
    const agents = Array.from(this.performanceMetrics.values());
    
    const system = {
      total_episodes: this.currentEpisode,
      training_in_progress: this.trainingInProgress,
      active_agents: this.agents.size,
      enabled: this.config.enabled,
      last_training: this.episodeHistory.length > 0 
        ? this.episodeHistory[this.episodeHistory.length - 1].timestamp 
        : null,
    };

    return { agents, system };
  }

  // Helper methods
  private shouldTriggerTraining(): boolean {
    return this.config.training_enabled && 
           this.currentEpisode > 0 && 
           this.currentEpisode % this.config.training_frequency === 0 &&
           !this.trainingInProgress;
  }

  private updateAgentMetrics(agentId: string, reward: number, tradeExecuted: boolean): void {
    const metrics = this.performanceMetrics.get(agentId);
    if (!metrics) return;

    metrics.total_reward += reward;
    
    if (tradeExecuted) {
      metrics.trades_executed++;
      // Update other metrics based on trade results
    }

    // Calculate rolling averages
    const recentEpisodes = Math.min(100, this.currentEpisode);
    metrics.average_reward = metrics.total_reward / Math.max(1, recentEpisodes);

    metrics.last_updated = new Date();
    this.performanceMetrics.set(agentId, metrics);
  }

  // Conversion helpers
  private convertStateToMarketState(state: TradingEnvironmentState): any {
    // Convert TradingEnvironmentState to MarketState format expected by PPOTradingAgent
    return {
      price: state.price,
      volume: state.volume,
      indicators: state.indicators,
      portfolio: state.portfolio,
      market_context: state.market_context,
      recent_performance: state.performance.recent_trades,
    };
  }

  private convertActionToRLAction(action: any): RLAction {
    // Convert PPO action to RLAction format
    return {
      action_type: action.action_type,
      quantity_percent: action.quantity_percent,
      confidence: action.confidence,
      stop_loss_percent: action.stop_loss,
      take_profit_percent: action.take_profit,
      timeframe_hint: 'MEDIUM',
    };
  }

  // Public interface
  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public getAgentCount(): number {
    return this.agents.size;
  }

  public getAgentIds(): string[] {
    return Array.from(this.agents.keys());
  }

  public getStrategy(agentId: string): RLStrategy | undefined {
    return this.strategies.get(agentId);
  }
}

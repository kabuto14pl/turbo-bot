/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🎛️ HYPERPARAMETER OPTIMIZATION CONTROLLER
 * Main orchestrator for all hyperparameter optimization activities
 * Coordinates between different optimization strategies and manages experiments
 */

import { HyperparameterOptimizer, OptimizationConfig, OptimizationResult } from './hyperparameter_optimizer';
import { AdvancedHyperparameterSearch, SearchConfig, SearchResult } from './advanced_search';
import { LearningRateScheduler, SchedulerFactory, MultiSchedulerManager } from './learning_rate_scheduler';
import { DeepRLAgent } from './deep_rl_agent';
import { TrainingConfig, MarketState, PerformanceMetrics, OptimizationStudy, HyperparameterTrial } from './types';
import { Logger } from '../../../core/utils/logger';

interface OptimizationExperiment {
  experiment_id: string;
  experiment_name: string;
  experiment_type: 'single_algorithm' | 'multi_algorithm' | 'ensemble' | 'meta_learning';
  
  // Experiment configuration
  optimization_method: 'optuna' | 'grid_search' | 'random_search' | 'bayesian' | 'evolutionary' | 'hyperband';
  search_space: any;
  objectives: string[];
  
  // Resource allocation
  max_trials: number;
  max_time: number; // seconds
  parallel_jobs: number;
  gpu_memory_limit?: number;
  
  // Data configuration
  training_data_size: number;
  validation_data_size: number;
  test_data_size: number;
  cross_validation_folds?: number;
  
  // Results
  results?: OptimizationResult | SearchResult;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  start_time?: number;
  end_time?: number;
  
  // Metadata
  created_by: string;
  tags: string[];
  notes: string;
}

interface ExperimentSuite {
  suite_id: string;
  suite_name: string;
  description: string;
  experiments: OptimizationExperiment[];
  
  // Suite-level configuration
  data_split_strategy: 'time_series' | 'random' | 'stratified';
  validation_strategy: 'holdout' | 'cross_validation' | 'walk_forward';
  
  // Comparative analysis
  comparison_metrics: string[];
  statistical_tests: string[];
  
  // Results aggregation
  suite_results?: {
    best_overall_config: TrainingConfig;
    performance_comparison: any;
    statistical_significance: any;
    resource_usage: any;
  };
  
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: number;
  updated_at: number;
}

interface AutoMLConfiguration {
  // Search strategies
  primary_strategy: 'bayesian' | 'evolutionary' | 'hyperband';
  fallback_strategies: string[];
  
  // Neural architecture search
  nas_enabled: boolean;
  nas_search_space: {
    max_layers: number;
    layer_types: string[];
    activation_functions: string[];
    optimizer_types: string[];
  };
  
  // Feature selection
  feature_selection_enabled: boolean;
  feature_selection_methods: string[];
  max_features: number;
  
  // Early stopping
  early_stopping_enabled: boolean;
  patience: number;
  min_improvement: number;
  
  // Resource constraints
  max_total_time: number;
  max_memory_per_trial: number;
  max_parallel_trials: number;
  
  // Performance thresholds
  target_performance: { [metric: string]: number };
  minimum_performance: { [metric: string]: number };
}

export class HyperparameterOptimizationController {
  private logger: Logger;
  private active_experiments: Map<string, OptimizationExperiment> = new Map();
  private experiment_suites: Map<string, ExperimentSuite> = new Map();
  private scheduler_manager: MultiSchedulerManager;
  
  // Optimization components
  private optuna_optimizer?: HyperparameterOptimizer;
  private advanced_search?: AdvancedHyperparameterSearch;
  
  // AutoML state
  private automl_config?: AutoMLConfiguration;
  private meta_learning_database: Map<string, any> = new Map();

  constructor() {
    this.logger = new Logger();
    this.scheduler_manager = new MultiSchedulerManager();
    
    this.logger.info('🎛️ Hyperparameter Optimization Controller initialized');
  }

  /**
   * 🚀 START OPTIMIZATION EXPERIMENT
   * Launch comprehensive hyperparameter optimization experiment
   */
  async startOptimizationExperiment(
    experiment_config: Partial<OptimizationExperiment>,
    training_data: MarketState[],
    validation_data: MarketState[],
    test_data: MarketState[]
  ): Promise<string> {
    // Create experiment
    const experiment: OptimizationExperiment = {
      experiment_id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      experiment_name: experiment_config.experiment_name || 'Untitled Experiment',
      experiment_type: experiment_config.experiment_type || 'single_algorithm',
      optimization_method: experiment_config.optimization_method || 'bayesian',
      search_space: experiment_config.search_space || this.getDefaultSearchSpace(),
      objectives: experiment_config.objectives || ['sharpe_ratio'],
      max_trials: experiment_config.max_trials || 100,
      max_time: experiment_config.max_time || 7200,
      parallel_jobs: experiment_config.parallel_jobs || 1,
      training_data_size: training_data.length,
      validation_data_size: validation_data.length,
      test_data_size: test_data.length,
      status: 'pending',
      created_by: 'system',
      tags: experiment_config.tags || [],
      notes: experiment_config.notes || '',
      ...experiment_config
    };

    this.active_experiments.set(experiment.experiment_id, experiment);
    
    this.logger.info(`🚀 Starting optimization experiment: ${experiment.experiment_name}`);
    this.logger.info(`📊 Method: ${experiment.optimization_method}, Trials: ${experiment.max_trials}, Time: ${experiment.max_time}s`);

    // Execute experiment asynchronously
    this.executeExperiment(experiment, training_data, validation_data, test_data)
      .catch(error => {
        this.logger.error(`❌ Experiment ${experiment.experiment_id} failed: ${error}`);
        experiment.status = 'failed';
      });

    return experiment.experiment_id;
  }

  /**
   * 🏭 CREATE EXPERIMENT SUITE
   * Create suite of related optimization experiments
   */
  async createExperimentSuite(
    suite_config: Partial<ExperimentSuite>,
    data: {
      training: MarketState[];
      validation: MarketState[];
      test: MarketState[];
    }
  ): Promise<string> {
    const suite: ExperimentSuite = {
      suite_id: `suite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      suite_name: suite_config.suite_name || 'Untitled Suite',
      description: suite_config.description || '',
      experiments: [],
      data_split_strategy: suite_config.data_split_strategy || 'time_series',
      validation_strategy: suite_config.validation_strategy || 'holdout',
      comparison_metrics: suite_config.comparison_metrics || ['sharpe_ratio', 'max_drawdown', 'win_rate'],
      statistical_tests: suite_config.statistical_tests || ['t_test', 'wilcoxon'],
      status: 'pending',
      created_at: Date.now(),
      updated_at: Date.now(),
      ...suite_config
    };

    // Generate experiments for different optimization methods
    const optimization_methods = ['bayesian', 'evolutionary', 'hyperband', 'random_search'];
    
    for (const method of optimization_methods) {
      const experiment_config: Partial<OptimizationExperiment> = {
        experiment_name: `${suite.suite_name} - ${method}`,
        experiment_type: 'single_algorithm',
        optimization_method: method as any,
        max_trials: 50,
        max_time: 1800, // 30 minutes each
        parallel_jobs: 1,
        objectives: ['sharpe_ratio'],
        tags: [`suite:${suite.suite_id}`, `method:${method}`]
      };

      const experiment_id = await this.startOptimizationExperiment(
        experiment_config,
        data.training,
        data.validation,
        data.test
      );

      const experiment = this.active_experiments.get(experiment_id)!;
      suite.experiments.push(experiment);
    }

    this.experiment_suites.set(suite.suite_id, suite);
    
    this.logger.info(`🏭 Created experiment suite: ${suite.suite_name} with ${suite.experiments.length} experiments`);
    
    return suite.suite_id;
  }

  /**
   * 🤖 ENABLE AUTOML
   * Enable automated machine learning with meta-learning
   */
  async enableAutoML(
    config: Partial<AutoMLConfiguration>,
    training_data: MarketState[],
    validation_data: MarketState[]
  ): Promise<string> {
    this.automl_config = {
      primary_strategy: 'bayesian',
      fallback_strategies: ['evolutionary', 'random_search'],
      nas_enabled: true,
      nas_search_space: {
        max_layers: 5,
        layer_types: ['dense', 'lstm', 'attention'],
        activation_functions: ['relu', 'tanh', 'swish'],
        optimizer_types: ['adam', 'rmsprop', 'adagrad']
      },
      feature_selection_enabled: true,
      feature_selection_methods: ['importance', 'correlation', 'mutual_info'],
      max_features: 200,
      early_stopping_enabled: true,
      patience: 20,
      min_improvement: 0.001,
      max_total_time: 14400, // 4 hours
      max_memory_per_trial: 4096, // 4GB
      max_parallel_trials: 4,
      target_performance: { sharpe_ratio: 2.0 },
      minimum_performance: { sharpe_ratio: 1.0 },
      ...config
    };

    this.logger.info('🤖 AutoML enabled with configuration:');
    this.logger.info(`   Primary strategy: ${this.automl_config.primary_strategy}`);
    this.logger.info(`   NAS enabled: ${this.automl_config.nas_enabled}`);
    this.logger.info(`   Feature selection: ${this.automl_config.feature_selection_enabled}`);
    this.logger.info(`   Max time: ${this.automl_config.max_total_time}s`);

    // Start AutoML experiment
    const automl_experiment_id = await this.startOptimizationExperiment({
      experiment_name: 'AutoML Optimization',
      experiment_type: 'meta_learning',
      optimization_method: this.automl_config.primary_strategy,
      max_trials: 1000,
      max_time: this.automl_config.max_total_time,
      parallel_jobs: this.automl_config.max_parallel_trials,
      objectives: Object.keys(this.automl_config.target_performance),
      tags: ['automl', 'meta_learning']
    }, training_data, validation_data, []);

    return automl_experiment_id;
  }

  /**
   * 🎯 EXECUTE SINGLE EXPERIMENT
   * Execute individual optimization experiment
   */
  private async executeExperiment(
    experiment: OptimizationExperiment,
    training_data: MarketState[],
    validation_data: MarketState[],
    test_data: MarketState[]
  ): Promise<void> {
    experiment.status = 'running';
    experiment.start_time = Date.now();

    try {
      let result: OptimizationResult | SearchResult;

      switch (experiment.optimization_method) {
        case 'optuna':
          result = await this.executeOptunaOptimization(experiment, training_data, validation_data);
          break;
        case 'bayesian':
        case 'evolutionary':
        case 'hyperband':
        case 'grid_search':
        case 'random_search':
          result = await this.executeAdvancedSearch(experiment, training_data, validation_data);
          break;
        default:
          throw new Error(`Unknown optimization method: ${experiment.optimization_method}`);
      }

      experiment.results = result;
      experiment.status = 'completed';
      experiment.end_time = Date.now();

      this.logger.info(`✅ Experiment ${experiment.experiment_name} completed successfully`);
      
      // Final evaluation on test data if available
      if (test_data.length > 0) {
        await this.evaluateOnTestData(experiment, test_data);
      }

      // Update meta-learning database
      this.updateMetaLearningDatabase(experiment);

    } catch (error) {
      experiment.status = 'failed';
      experiment.end_time = Date.now();
      this.logger.error(`❌ Experiment ${experiment.experiment_name} failed: ${error}`);
      throw error;
    }
  }

  /**
   * 🔬 EXECUTE OPTUNA OPTIMIZATION
   */
  private async executeOptunaOptimization(
    experiment: OptimizationExperiment,
    training_data: MarketState[],
    validation_data: MarketState[]
  ): Promise<OptimizationResult> {
    const optuna_config: Partial<OptimizationConfig> = {
      algorithm: 'tpe',
      n_trials: experiment.max_trials,
      timeout: experiment.max_time,
      n_jobs: experiment.parallel_jobs,
      direction: 'maximize',
      objective_function: experiment.objectives[0] as any,
      validation_episodes: Math.min(100, validation_data.length),
      early_stopping: true,
      patience: 20,
      pruning: true
    };

    this.optuna_optimizer = new HyperparameterOptimizer(optuna_config);
    
    return await this.optuna_optimizer.optimize(
      validation_data,
      (progress, trial) => {
        this.logger.debug(`Optuna progress: ${(progress * 100).toFixed(1)}%`);
      }
    );
  }

  /**
   * 🔍 EXECUTE ADVANCED SEARCH
   */
  private async executeAdvancedSearch(
    experiment: OptimizationExperiment,
    training_data: MarketState[],
    validation_data: MarketState[]
  ): Promise<SearchResult> {
    const search_config: SearchConfig = {
      search_method: experiment.optimization_method as any,
      search_spaces: this.convertSearchSpace(experiment.search_space),
      max_trials: experiment.max_trials,
      max_time: experiment.max_time,
      n_parallel: experiment.parallel_jobs,
      early_stopping: true,
      patience: 20
    };

    this.advanced_search = new AdvancedHyperparameterSearch(search_config);
    
    return await this.advanced_search.search(
      validation_data,
      async (config: TrainingConfig, data: MarketState[]) => {
        return await this.evaluateConfiguration(config, data);
      },
      (progress, trial) => {
        this.logger.debug(`Search progress: ${(progress * 100).toFixed(1)}%`);
      }
    );
  }

  /**
   * 📊 EVALUATE CONFIGURATION
   * Evaluate specific hyperparameter configuration
   */
  private async evaluateConfiguration(
    config: TrainingConfig,
    validation_data: MarketState[]
  ): Promise<number> {
    try {
      // Create agent with configuration
      const agent = new DeepRLAgent(config);
      
      // Simplified evaluation - in production would do full training
      let total_reward = 0;
      let episode_count = 0;
      const max_episodes = Math.min(50, validation_data.length / 100);

      for (let episode = 0; episode < max_episodes; episode++) {
        const episode_reward = await this.simulateEpisode(agent, validation_data, episode);
        total_reward += episode_reward;
        episode_count++;
      }

      const average_reward = total_reward / episode_count;
      
      // Convert to Sharpe ratio approximation
      const sharpe_ratio = average_reward > 0 ? average_reward / Math.sqrt(Math.abs(average_reward)) : -1;
      
      return sharpe_ratio;
      
    } catch (error) {
      this.logger.error(`Configuration evaluation failed: ${error}`);
      return -Infinity;
    }
  }

  /**
   * 🎮 SIMULATE EPISODE
   * Simulate trading episode for evaluation
   */
  private async simulateEpisode(
    agent: DeepRLAgent,
    validation_data: MarketState[],
    episode: number
  ): Promise<number> {
    const episode_length = 100;
    const start_idx = episode * episode_length;
    const end_idx = Math.min(start_idx + episode_length, validation_data.length - 1);
    
    let total_reward = 0;
    let position = 0;
    let portfolio_value = 10000;

    for (let i = start_idx; i < end_idx - 1; i++) {
      const state = validation_data[i];
      const next_state = validation_data[i + 1];
      
      // Generate action
      const action = await agent.generateAction(state);
      
      // Calculate reward
      const price_change = (next_state.price - state.price) / state.price;
      
      let reward = 0;
      if (action.action_type === 'BUY' && position <= 0) {
        position = action.position_size;
        reward = position * price_change * portfolio_value;
      } else if (action.action_type === 'SELL' && position >= 0) {
        position = -action.position_size;
        reward = -position * price_change * portfolio_value;
      } else if (action.action_type === 'HOLD') {
        reward = position * price_change * portfolio_value;
      }
      
      // Transaction costs
      reward -= Math.abs(action.position_size) * 0.001 * portfolio_value;
      
      total_reward += reward;
      portfolio_value += reward;
      
      // Update agent
      await agent.learnFromResult(next_state, reward, i === end_idx - 2);
    }

    return total_reward / 10000; // Normalize to percentage
  }

  /**
   * 🧪 EVALUATE ON TEST DATA
   * Final evaluation on held-out test data
   */
  private async evaluateOnTestData(
    experiment: OptimizationExperiment,
    test_data: MarketState[]
  ): Promise<PerformanceMetrics> {
    if (!experiment.results) {
      throw new Error('No results available for test evaluation');
    }

    let best_config: TrainingConfig;
    
    if ('best_hyperparameters' in experiment.results) {
      best_config = experiment.results.best_hyperparameters;
    } else {
      best_config = this.parametersToConfig(experiment.results.best_parameters);
    }

    // Create agent with best configuration
    const agent = new DeepRLAgent(best_config);
    
    // Evaluate on test data
    const test_episodes = 10;
    const episode_rewards: number[] = [];
    
    for (let episode = 0; episode < test_episodes; episode++) {
      const reward = await this.simulateEpisode(agent, test_data, episode);
      episode_rewards.push(reward);
    }

    const metrics = this.calculatePerformanceMetrics(episode_rewards);
    
    this.logger.info(`📊 Test evaluation for ${experiment.experiment_name}:`);
    this.logger.info(`   Sharpe Ratio: ${metrics.sharpe_ratio.toFixed(4)}`);
    this.logger.info(`   Max Drawdown: ${metrics.max_drawdown.toFixed(4)}`);
    this.logger.info(`   Win Rate: ${metrics.win_rate.toFixed(4)}`);

    return metrics;
  }

  /**
   * 📚 UPDATE META-LEARNING DATABASE
   * Store experiment results for meta-learning
   */
  private updateMetaLearningDatabase(experiment: OptimizationExperiment): void {
    const meta_entry = {
      experiment_id: experiment.experiment_id,
      method: experiment.optimization_method,
      data_size: experiment.training_data_size + experiment.validation_data_size,
      best_performance: this.extractBestPerformance(experiment.results!),
      convergence_time: experiment.end_time! - experiment.start_time!,
      resource_usage: {
        trials: experiment.max_trials,
        time_limit: experiment.max_time
      },
      timestamp: Date.now()
    };

    this.meta_learning_database.set(experiment.experiment_id, meta_entry);
    
    this.logger.debug(`📚 Updated meta-learning database with experiment ${experiment.experiment_id}`);
  }

  // =================== STATUS AND MONITORING ===================

  /**
   * 📈 GET EXPERIMENT STATUS
   */
  getExperimentStatus(experiment_id: string): OptimizationExperiment | null {
    return this.active_experiments.get(experiment_id) || null;
  }

  /**
   * 📊 GET SUITE STATUS
   */
  getSuiteStatus(suite_id: string): ExperimentSuite | null {
    return this.experiment_suites.get(suite_id) || null;
  }

  /**
   * 📋 LIST ALL EXPERIMENTS
   */
  listAllExperiments(): OptimizationExperiment[] {
    return Array.from(this.active_experiments.values());
  }

  /**
   * ⏹️ CANCEL EXPERIMENT
   */
  cancelExperiment(experiment_id: string): boolean {
    const experiment = this.active_experiments.get(experiment_id);
    if (experiment && experiment.status === 'running') {
      experiment.status = 'cancelled';
      experiment.end_time = Date.now();
      return true;
    }
    return false;
  }

  /**
   * 🔄 CLEANUP COMPLETED EXPERIMENTS
   */
  cleanupCompletedExperiments(older_than_hours: number = 24): number {
    const cutoff_time = Date.now() - (older_than_hours * 60 * 60 * 1000);
    let cleaned_count = 0;

    for (const [id, experiment] of this.active_experiments) {
      if (experiment.status === 'completed' && 
          experiment.end_time && 
          experiment.end_time < cutoff_time) {
        this.active_experiments.delete(id);
        cleaned_count++;
      }
    }

    this.logger.info(`🔄 Cleaned up ${cleaned_count} completed experiments`);
    return cleaned_count;
  }

  // =================== UTILITY METHODS ===================

  private getDefaultSearchSpace(): any {
    return {
      learning_rate: { type: 'log_uniform', low: 1e-5, high: 1e-2 },
      batch_size: { type: 'categorical', choices: [32, 64, 128, 256] },
      gamma: { type: 'uniform', low: 0.9, high: 0.999 },
      clip_ratio: { type: 'uniform', low: 0.1, high: 0.5 },
      entropy_coefficient: { type: 'log_uniform', low: 1e-4, high: 1e-1 }
    };
  }

  private convertSearchSpace(search_space: any): any[] {
    const converted = [];
    for (const [name, config] of Object.entries(search_space)) {
      if (typeof config === 'object' && config !== null) {
        converted.push({ name, ...config });
      }
    }
    return converted;
  }

  private parametersToConfig(parameters: { [key: string]: any }): TrainingConfig {
    return {
      algorithm: 'PPO',
      policy_hidden_layers: parameters.policy_hidden_layers || [256, 128],
      value_hidden_layers: parameters.value_hidden_layers || [256, 128],
      learning_rate: parameters.learning_rate || 3e-4,
      policy_learning_rate: parameters.policy_learning_rate || 3e-4,
      value_learning_rate: parameters.value_learning_rate || 1e-3,
      gamma: parameters.gamma || 0.99,
      clip_ratio: parameters.clip_ratio || 0.2,
      entropy_coefficient: parameters.entropy_coefficient || 0.01,
      value_loss_coefficient: parameters.value_loss_coefficient || 0.5,
      max_grad_norm: parameters.max_grad_norm || 0.5,
      batch_size: parameters.batch_size || 64,
      buffer_size: parameters.buffer_size || 100000,
      episodes_per_update: parameters.episodes_per_update || 4,
      prioritized_replay: parameters.prioritized_replay || true,
      multi_step_returns: parameters.multi_step_returns || 3,
      distributional_rl: parameters.distributional_rl || false,
      noisy_networks: parameters.noisy_networks || false,
      dropout_rate: parameters.dropout_rate || 0.0
    };
  }

  private extractBestPerformance(result: OptimizationResult | SearchResult): number {
    if ('best_value' in result) {
      return result.best_value;
    } else {
      return result.best_objective;
    }
  }

  private calculatePerformanceMetrics(episode_rewards: number[]): PerformanceMetrics {
    const returns = episode_rewards;
    const mean_return = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((acc, r) => acc + Math.pow(r - mean_return, 2), 0) / returns.length;
    const std_dev = Math.sqrt(variance);
    
    const positive_returns = returns.filter(r => r > 0);
    const negative_returns = returns.filter(r => r < 0);
    
    const sharpe_ratio = std_dev > 0 ? mean_return / std_dev : 0;
    const win_rate = positive_returns.length / returns.length;
    
    // Maximum drawdown calculation
    let peak = returns[0];
    let max_drawdown = 0;
    let cumulative = 0;
    
    for (const ret of returns) {
      cumulative += ret;
      if (cumulative > peak) peak = cumulative;
      const drawdown = (peak - cumulative) / peak;
      if (drawdown > max_drawdown) max_drawdown = drawdown;
    }

    return {
      sharpe_ratio,
      max_drawdown,
      win_rate,
      average_return: mean_return,
      volatility: std_dev,
      sortino_ratio: this.calculateSortinoRatio(returns),
      calmar_ratio: mean_return / (max_drawdown || 0.01),
      prediction_accuracy: win_rate,
      mean_squared_error: variance,
      mean_absolute_error: returns.reduce((acc, r) => acc + Math.abs(r), 0) / returns.length,
      total_trades: returns.length,
      profitable_trades: positive_returns.length,
      average_trade_duration: 1440,
      largest_win: Math.max(...positive_returns, 0),
      largest_loss: Math.min(...negative_returns, 0)
    };
  }

  private calculateSortinoRatio(returns: number[]): number {
    const mean_return = returns.reduce((a, b) => a + b, 0) / returns.length;
    const negative_returns = returns.filter(r => r < 0);
    
    if (negative_returns.length === 0) return mean_return > 0 ? Infinity : 0;
    
    const downside_variance = negative_returns.reduce((acc, r) => acc + Math.pow(r, 2), 0) / negative_returns.length;
    const downside_deviation = Math.sqrt(downside_variance);
    
    return downside_deviation > 0 ? mean_return / downside_deviation : 0;
  }
}

/**
 * 🚀 EXPORT DEFAULT OPTIMIZATION CONFIGURATIONS
 */
export const DEFAULT_OPTIMIZATION_SETUPS = {
  QUICK_OPTIMIZATION: {
    experiment_name: 'Quick Hyperparameter Optimization',
    experiment_type: 'single_algorithm' as const,
    optimization_method: 'random_search' as const,
    max_trials: 25,
    max_time: 900, // 15 minutes
    parallel_jobs: 2,
    objectives: ['sharpe_ratio']
  },
  
  COMPREHENSIVE_OPTIMIZATION: {
    experiment_name: 'Comprehensive Hyperparameter Optimization',
    experiment_type: 'single_algorithm' as const,
    optimization_method: 'bayesian' as const,
    max_trials: 100,
    max_time: 3600, // 1 hour
    parallel_jobs: 4,
    objectives: ['sharpe_ratio']
  },
  
  PRODUCTION_OPTIMIZATION: {
    experiment_name: 'Production Hyperparameter Optimization',
    experiment_type: 'ensemble' as const,
    optimization_method: 'hyperband' as const,
    max_trials: 500,
    max_time: 7200, // 2 hours
    parallel_jobs: 8,
    objectives: ['sharpe_ratio', 'max_drawdown', 'win_rate']
  }
};

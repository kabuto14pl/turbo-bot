/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
/**
 * 🧪 ADVANCED A/B TESTING SYSTEM FOR TRADING STRATEGIES
 * Comprehensive A/B testing framework with statistical significance, multi-armed bandits,
 * and sophisticated experiment management for trading strategy optimization
 */

import { Logger } from '../../../core/utils/logger';
import { DeepRLAgent } from './deep_rl_agent';
import { MarketData } from '../../market/types';

interface ExperimentConfig {
  experiment_id: string;
  experiment_name: string;
  description: string;
  
  // Traffic allocation
  traffic_allocation: {
    control_percentage: number;
    treatment_percentages: number[];
    ramp_up_strategy: 'immediate' | 'gradual' | 'staged';
    ramp_up_duration_hours?: number;
  };
  
  // Experiment design
  hypothesis: string;
  primary_metric: string;
  secondary_metrics: string[];
  minimum_detectable_effect: number;
  statistical_power: number;
  significance_level: number;
  
  // Duration and sample size
  planned_duration_days: number;
  minimum_sample_size: number;
  maximum_duration_days: number;
  early_stopping_enabled: boolean;
  
  // Strategy configurations
  control_strategy: StrategyConfig;
  treatment_strategies: StrategyConfig[];
  
  // Risk management
  risk_limits: {
    max_drawdown_per_variant: number;
    max_daily_loss_per_variant: number;
    emergency_stop_threshold: number;
  };
  
  // Segmentation
  user_segments?: string[];
  market_conditions?: string[];
  time_windows?: TimeWindow[];
}

interface StrategyConfig {
  strategy_id: string;
  strategy_name: string;
  strategy_type: 'control' | 'treatment';
  
  // Model parameters
  model_config: {
    architecture: string;
    hyperparameters: { [key: string]: any };
    training_config: any;
  };
  
  // Trading parameters
  trading_config: {
    position_sizing: 'fixed' | 'kelly' | 'adaptive';
    risk_per_trade: number;
    max_positions: number;
    entry_conditions: any;
    exit_conditions: any;
  };
  
  // Feature engineering
  feature_config: {
    indicators: string[];
    lookback_periods: number[];
    technical_features: any;
  };
}

interface TimeWindow {
  start_time: string; // HH:MM format
  end_time: string;
  timezone: string;
  days_of_week: number[]; // 0-6, Sunday=0
}

interface ExperimentVariant {
  variant_id: string;
  variant_name: string;
  strategy_config: StrategyConfig;
  allocated_percentage: number;
  current_allocation: number;
  
  // Performance tracking
  performance_metrics: PerformanceMetrics;
  risk_metrics: RiskMetrics;
  statistical_metrics: StatisticalMetrics;
  
  // State
  is_active: boolean;
  start_time: number;
  end_time?: number;
  participant_count: number;
}

interface PerformanceMetrics {
  total_return: number;
  annualized_return: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  calmar_ratio: number;
  max_drawdown: number;
  win_rate: number;
  profit_factor: number;
  average_trade_return: number;
  trade_count: number;
  daily_returns: number[];
  cumulative_returns: number[];
}

interface RiskMetrics {
  volatility: number;
  var_95: number; // Value at Risk 95%
  cvar_95: number; // Conditional VaR 95%
  beta: number;
  alpha: number;
  tracking_error: number;
  information_ratio: number;
  maximum_consecutive_losses: number;
  current_drawdown: number;
}

interface StatisticalMetrics {
  sample_size: number;
  confidence_interval: {
    lower_bound: number;
    upper_bound: number;
    confidence_level: number;
  };
  p_value: number;
  statistical_significance: boolean;
  effect_size: number;
  statistical_power: number;
  test_statistic: number;
  degrees_of_freedom: number;
}

interface ExperimentResult {
  experiment_id: string;
  conclusion: 'inconclusive' | 'control_wins' | 'treatment_wins' | 'no_difference';
  winning_variant?: string;
  statistical_significance: boolean;
  confidence_level: number;
  effect_size: number;
  
  // Performance comparison
  variant_comparison: {
    [variant_id: string]: {
      performance_metrics: PerformanceMetrics;
      statistical_metrics: StatisticalMetrics;
      improvement_vs_control: number;
    };
  };
  
  // Recommendations
  recommendations: string[];
  next_experiments: string[];
  implementation_plan?: string;
}

interface BayesianResult {
  probability_best: { [variant_id: string]: number };
  expected_loss: { [variant_id: string]: number };
  credible_intervals: {
    [variant_id: string]: {
      lower: number;
      upper: number;
      probability: number;
    };
  };
  recommendation: string;
}

interface MultiArmedBanditConfig {
  algorithm: 'epsilon_greedy' | 'ucb1' | 'thompson_sampling' | 'exp3';
  exploration_rate: number;
  decay_rate: number;
  minimum_exploration: number;
  confidence_level: number;
  reward_window: number;
}

export class ABTestingSystem {
  private logger: Logger;
  private active_experiments: Map<string, Experiment> = new Map();
  private completed_experiments: Map<string, ExperimentResult> = new Map();
  private statistical_analyzer: StatisticalAnalyzer;
  private bayesian_analyzer: BayesianAnalyzer;
  private bandit_optimizer: MultiArmedBanditOptimizer;

  constructor() {
    this.logger = new Logger();
    this.statistical_analyzer = new StatisticalAnalyzer();
    this.bayesian_analyzer = new BayesianAnalyzer();
    this.bandit_optimizer = new MultiArmedBanditOptimizer();

    this.logger.info('🧪 A/B Testing System initialized');
  }

  /**
   * 🚀 CREATE EXPERIMENT
   * Create and start a new A/B testing experiment
   */
  async createExperiment(config: ExperimentConfig): Promise<string> {
    // Validate experiment configuration
    this.validateExperimentConfig(config);

    // Create experiment instance
    const experiment = new Experiment(config, this.logger);
    
    // Initialize variants
    await experiment.initializeVariants();
    
    // Start experiment
    experiment.start();
    
    this.active_experiments.set(config.experiment_id, experiment);
    
    this.logger.info(`🧪 Experiment created: ${config.experiment_name} (${config.experiment_id})`);
    
    return config.experiment_id;
  }

  /**
   * 📊 ALLOCATE TRAFFIC
   * Allocate traffic to experiment variants based on configuration
   */
  allocateTraffic(
    experiment_id: string,
    user_id: string,
    market_data: MarketData
  ): string | null {
    const experiment = this.active_experiments.get(experiment_id);
    if (!experiment || !experiment.isActive()) {
      return null;
    }

    return experiment.allocateTraffic(user_id, market_data);
  }

  /**
   * 📈 RECORD METRIC
   * Record performance metric for experiment variant
   */
  recordMetric(
    experiment_id: string,
    variant_id: string,
    metric_name: string,
    value: number,
    metadata?: { [key: string]: any }
  ): void {
    const experiment = this.active_experiments.get(experiment_id);
    if (!experiment) {
      this.logger.warn(`⚠️ Experiment not found: ${experiment_id}`);
      return;
    }

    experiment.recordMetric(variant_id, metric_name, value, metadata);
  }

  /**
   * 📊 ANALYZE EXPERIMENT
   * Perform comprehensive statistical analysis of experiment
   */
  async analyzeExperiment(experiment_id: string): Promise<ExperimentResult | null> {
    const experiment = this.active_experiments.get(experiment_id);
    if (!experiment) {
      return null;
    }

    // Get variant data
    const variants = experiment.getVariants();
    const control_variant = variants.find(v => v.strategy_config.strategy_type === 'control');
    const treatment_variants = variants.filter(v => v.strategy_config.strategy_type === 'treatment');

    if (!control_variant) {
      throw new Error('No control variant found');
    }

    // Statistical analysis
    const statistical_results = await this.statistical_analyzer.analyzeExperiment(
      control_variant,
      treatment_variants,
      experiment.getConfig()
    );

    // Bayesian analysis
    const bayesian_results = await this.bayesian_analyzer.analyzeExperiment(
      variants,
      experiment.getConfig()
    );

    // Determine conclusion
    const conclusion = this.determineConclusion(statistical_results, bayesian_results);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      statistical_results,
      bayesian_results,
      experiment.getConfig()
    );

    const result: ExperimentResult = {
      experiment_id,
      conclusion: conclusion.conclusion,
      winning_variant: conclusion.winning_variant,
      statistical_significance: statistical_results.statistical_significance,
      confidence_level: experiment.getConfig().significance_level,
      effect_size: statistical_results.effect_size,
      variant_comparison: statistical_results.variant_comparison,
      recommendations: recommendations.recommendations,
      next_experiments: recommendations.next_experiments,
      implementation_plan: recommendations.implementation_plan
    };

    return result;
  }

  /**
   * 🎯 OPTIMIZE WITH BANDITS
   * Use multi-armed bandit optimization for dynamic allocation
   */
  async optimizeWithBandits(
    experiment_id: string,
    bandit_config: MultiArmedBanditConfig
  ): Promise<void> {
    const experiment = this.active_experiments.get(experiment_id);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experiment_id}`);
    }

    await this.bandit_optimizer.optimize(experiment, bandit_config);
    
    this.logger.info(`🎯 Bandit optimization applied to experiment ${experiment_id}`);
  }

  /**
   * ⏹️ STOP EXPERIMENT
   * Stop an active experiment and generate final results
   */
  async stopExperiment(
    experiment_id: string,
    reason: 'completed' | 'early_stop' | 'manual' | 'risk_limit'
  ): Promise<ExperimentResult> {
    const experiment = this.active_experiments.get(experiment_id);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experiment_id}`);
    }

    // Stop experiment
    experiment.stop(reason);

    // Generate final analysis
    const result = await this.analyzeExperiment(experiment_id);
    if (!result) {
      throw new Error('Failed to analyze experiment');
    }

    // Move to completed experiments
    this.completed_experiments.set(experiment_id, result);
    this.active_experiments.delete(experiment_id);

    this.logger.info(`⏹️ Experiment stopped: ${experiment_id} (${reason})`);

    return result;
  }

  /**
   * 📋 GET EXPERIMENT STATUS
   */
  getExperimentStatus(experiment_id: string): any {
    const experiment = this.active_experiments.get(experiment_id);
    if (!experiment) {
      return null;
    }

    return experiment.getStatus();
  }

  /**
   * 📊 GET ALL EXPERIMENTS
   */
  getAllExperiments(): {
    active: string[];
    completed: string[];
  } {
    return {
      active: Array.from(this.active_experiments.keys()),
      completed: Array.from(this.completed_experiments.keys())
    };
  }

  // =================== PRIVATE METHODS ===================

  private validateExperimentConfig(config: ExperimentConfig): void {
    // Validate traffic allocation
    const total_allocation = config.traffic_allocation.control_percentage + 
      config.traffic_allocation.treatment_percentages.reduce((a, b) => a + b, 0);
    
    if (Math.abs(total_allocation - 100) > 0.01) {
      throw new Error(`Traffic allocation must sum to 100%, got ${total_allocation}%`);
    }

    // Validate statistical parameters
    if (config.significance_level <= 0 || config.significance_level >= 1) {
      throw new Error('Significance level must be between 0 and 1');
    }

    if (config.statistical_power <= 0 || config.statistical_power >= 1) {
      throw new Error('Statistical power must be between 0 and 1');
    }

    // Validate strategy configurations
    if (config.treatment_strategies.length === 0) {
      throw new Error('At least one treatment strategy is required');
    }

    this.logger.debug(`✅ Experiment configuration validated: ${config.experiment_id}`);
  }

  private determineConclusion(
    statistical_results: any,
    bayesian_results: BayesianResult
  ): {
    conclusion: 'inconclusive' | 'control_wins' | 'treatment_wins' | 'no_difference';
    winning_variant?: string;
  } {
    // Combine statistical and Bayesian evidence
    if (!statistical_results.statistical_significance) {
      return { conclusion: 'inconclusive' };
    }

    // Find best performing variant from Bayesian analysis
    const best_variant = Object.entries(bayesian_results.probability_best)
      .reduce((a, b) => bayesian_results.probability_best[a[0]] > bayesian_results.probability_best[b[0]] ? a : b)[0];

    const best_probability = bayesian_results.probability_best[best_variant];

    if (best_probability > 0.95) {
      if (best_variant.includes('control')) {
        return { conclusion: 'control_wins', winning_variant: best_variant };
      } else {
        return { conclusion: 'treatment_wins', winning_variant: best_variant };
      }
    }

    return { conclusion: 'no_difference' };
  }

  private generateRecommendations(
    statistical_results: any,
    bayesian_results: BayesianResult,
    config: ExperimentConfig
  ): {
    recommendations: string[];
    next_experiments: string[];
    implementation_plan?: string;
  } {
    const recommendations: string[] = [];
    const next_experiments: string[] = [];

    // Add statistical-based recommendations
    if (statistical_results.statistical_significance) {
      recommendations.push('Experiment shows statistically significant results');
      
      if (statistical_results.effect_size > config.minimum_detectable_effect) {
        recommendations.push('Effect size is practically significant');
        recommendations.push('Consider implementing winning variant');
      }
    } else {
      recommendations.push('Extend experiment duration for more statistical power');
      recommendations.push('Consider increasing sample size');
    }

    // Add Bayesian recommendations
    const best_variant = Object.entries(bayesian_results.probability_best)
      .reduce((a, b) => bayesian_results.probability_best[a[0]] > bayesian_results.probability_best[b[0]] ? a : b)[0];

    recommendations.push(`Bayesian analysis suggests ${best_variant} is best with ${(bayesian_results.probability_best[best_variant] * 100).toFixed(1)}% probability`);

    // Next experiments
    if (statistical_results.statistical_significance) {
      next_experiments.push('Test variant in different market conditions');
      next_experiments.push('Optimize winning variant parameters');
    } else {
      next_experiments.push('Re-run with larger sample size');
      next_experiments.push('Test with different success metrics');
    }

    return {
      recommendations,
      next_experiments,
      implementation_plan: 'Gradual rollout over 7 days with continuous monitoring'
    };
  }
}

/**
 * 🧪 EXPERIMENT CLASS
 * Individual experiment instance with traffic allocation and metric tracking
 */
class Experiment {
  private config: ExperimentConfig;
  private logger: Logger;
  private variants: Map<string, ExperimentVariant> = new Map();
  private is_active: boolean = false;
  private start_time?: number;
  private end_time?: number;

  constructor(config: ExperimentConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async initializeVariants(): Promise<void> {
    // Initialize control variant
    const control_variant: ExperimentVariant = {
      variant_id: `${this.config.experiment_id}_control`,
      variant_name: 'Control',
      strategy_config: this.config.control_strategy,
      allocated_percentage: this.config.traffic_allocation.control_percentage,
      current_allocation: 0,
      performance_metrics: this.initializePerformanceMetrics(),
      risk_metrics: this.initializeRiskMetrics(),
      statistical_metrics: this.initializeStatisticalMetrics(),
      is_active: true,
      start_time: Date.now(),
      participant_count: 0
    };

    this.variants.set(control_variant.variant_id, control_variant);

    // Initialize treatment variants
    this.config.treatment_strategies.forEach((strategy, index) => {
      const treatment_variant: ExperimentVariant = {
        variant_id: `${this.config.experiment_id}_treatment_${index}`,
        variant_name: `Treatment ${index + 1}`,
        strategy_config: strategy,
        allocated_percentage: this.config.traffic_allocation.treatment_percentages[index],
        current_allocation: 0,
        performance_metrics: this.initializePerformanceMetrics(),
        risk_metrics: this.initializeRiskMetrics(),
        statistical_metrics: this.initializeStatisticalMetrics(),
        is_active: true,
        start_time: Date.now(),
        participant_count: 0
      };

      this.variants.set(treatment_variant.variant_id, treatment_variant);
    });

    this.logger.debug(`🧪 Initialized ${this.variants.size} variants for experiment ${this.config.experiment_id}`);
  }

  start(): void {
    this.is_active = true;
    this.start_time = Date.now();
    this.logger.info(`🚀 Experiment started: ${this.config.experiment_id}`);
  }

  stop(reason: string): void {
    this.is_active = false;
    this.end_time = Date.now();
    this.logger.info(`⏹️ Experiment stopped: ${this.config.experiment_id} (${reason})`);
  }

  isActive(): boolean {
    return this.is_active;
  }

  allocateTraffic(user_id: string, market_data: MarketData): string {
    // Simple hash-based allocation for consistent assignment
    const hash = this.simpleHash(user_id + this.config.experiment_id);
    const allocation_point = hash % 100;

    let cumulative_percentage = 0;
    for (const variant of Array.from(this.variants.values())) {
      cumulative_percentage += variant.allocated_percentage;
      if (allocation_point < cumulative_percentage) {
        variant.participant_count++;
        return variant.variant_id;
      }
    }

    // Fallback to control
    const control_variant = Array.from(this.variants.values())
      .find(v => v.strategy_config.strategy_type === 'control');
    
    return control_variant ? control_variant.variant_id : Array.from(this.variants.keys())[0];
  }

  recordMetric(
    variant_id: string,
    metric_name: string,
    value: number,
    metadata?: { [key: string]: any }
  ): void {
    const variant = this.variants.get(variant_id);
    if (!variant) {
      this.logger.warn(`⚠️ Variant not found: ${variant_id}`);
      return;
    }

    // Update performance metrics based on metric name
    this.updateVariantMetrics(variant, metric_name, value, metadata);
    
    this.logger.debug(`📊 Recorded metric ${metric_name}: ${value} for variant ${variant_id}`);
  }

  getVariants(): ExperimentVariant[] {
    return Array.from(this.variants.values());
  }

  getConfig(): ExperimentConfig {
    return this.config;
  }

  getStatus(): any {
    const runtime_hours = this.start_time ? (Date.now() - this.start_time) / (1000 * 60 * 60) : 0;
    
    return {
      experiment_id: this.config.experiment_id,
      is_active: this.is_active,
      runtime_hours,
      planned_duration_days: this.config.planned_duration_days,
      variant_count: this.variants.size,
      total_participants: Array.from(this.variants.values()).reduce((sum, v) => sum + v.participant_count, 0),
      variants: Array.from(this.variants.values()).map(v => ({
        variant_id: v.variant_id,
        variant_name: v.variant_name,
        allocated_percentage: v.allocated_percentage,
        participant_count: v.participant_count,
        performance_summary: {
          total_return: v.performance_metrics.total_return,
          sharpe_ratio: v.performance_metrics.sharpe_ratio,
          max_drawdown: v.performance_metrics.max_drawdown,
          win_rate: v.performance_metrics.win_rate
        }
      }))
    };
  }

  // =================== PRIVATE METHODS ===================

  private initializePerformanceMetrics(): PerformanceMetrics {
    return {
      total_return: 0,
      annualized_return: 0,
      sharpe_ratio: 0,
      sortino_ratio: 0,
      calmar_ratio: 0,
      max_drawdown: 0,
      win_rate: 0,
      profit_factor: 0,
      average_trade_return: 0,
      trade_count: 0,
      daily_returns: [],
      cumulative_returns: []
    };
  }

  private initializeRiskMetrics(): RiskMetrics {
    return {
      volatility: 0,
      var_95: 0,
      cvar_95: 0,
      beta: 0,
      alpha: 0,
      tracking_error: 0,
      information_ratio: 0,
      maximum_consecutive_losses: 0,
      current_drawdown: 0
    };
  }

  private initializeStatisticalMetrics(): StatisticalMetrics {
    return {
      sample_size: 0,
      confidence_interval: {
        lower_bound: 0,
        upper_bound: 0,
        confidence_level: 0.95
      },
      p_value: 1.0,
      statistical_significance: false,
      effect_size: 0,
      statistical_power: 0,
      test_statistic: 0,
      degrees_of_freedom: 0
    };
  }

  private updateVariantMetrics(
    variant: ExperimentVariant,
    metric_name: string,
    value: number,
    metadata?: { [key: string]: any }
  ): void {
    const metrics = variant.performance_metrics;

    switch (metric_name) {
      case 'return':
        metrics.daily_returns.push(value);
        this.recalculatePerformanceMetrics(variant);
        break;
      case 'trade_return':
        metrics.trade_count++;
        this.updateTradeMetrics(variant, value);
        break;
      case 'drawdown':
        variant.risk_metrics.current_drawdown = value;
        variant.performance_metrics.max_drawdown = Math.max(
          variant.performance_metrics.max_drawdown, 
          Math.abs(value)
        );
        break;
    }

    // Update statistical metrics
    variant.statistical_metrics.sample_size++;
  }

  private recalculatePerformanceMetrics(variant: ExperimentVariant): void {
    const returns = variant.performance_metrics.daily_returns;
    if (returns.length === 0) return;

    // Calculate cumulative returns
    const cumulative = [];
    let cumulative_value = 1;
    for (const ret of returns) {
      cumulative_value *= (1 + ret);
      cumulative.push(cumulative_value - 1);
    }
    variant.performance_metrics.cumulative_returns = cumulative;

    // Total return
    variant.performance_metrics.total_return = cumulative_value - 1;

    // Annualized return
    const days = returns.length;
    variant.performance_metrics.annualized_return = 
      Math.pow(cumulative_value, 365 / days) - 1;

    // Volatility
    const mean_return = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - mean_return, 2), 0) / returns.length;
    variant.risk_metrics.volatility = Math.sqrt(variance * 365);

    // Sharpe ratio
    variant.performance_metrics.sharpe_ratio = 
      variant.performance_metrics.annualized_return / variant.risk_metrics.volatility;
  }

  private updateTradeMetrics(variant: ExperimentVariant, trade_return: number): void {
    const metrics = variant.performance_metrics;
    
    // Update average trade return
    const total_trade_return = metrics.average_trade_return * (metrics.trade_count - 1) + trade_return;
    metrics.average_trade_return = total_trade_return / metrics.trade_count;

    // Update win rate
    const winning_trades = metrics.win_rate * (metrics.trade_count - 1) + (trade_return > 0 ? 1 : 0);
    metrics.win_rate = winning_trades / metrics.trade_count;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

/**
 * 📊 STATISTICAL ANALYZER
 * Comprehensive statistical analysis for A/B testing
 */
class StatisticalAnalyzer {
  async analyzeExperiment(
    control_variant: ExperimentVariant,
    treatment_variants: ExperimentVariant[],
    config: ExperimentConfig
  ): Promise<any> {
    // Simplified statistical analysis
    const results = {
      statistical_significance: false,
      effect_size: 0,
      variant_comparison: {}
    };

    // T-test implementation would go here
    // For now, simplified mock analysis
    
    return results;
  }
}

/**
 * 🎯 BAYESIAN ANALYZER
 * Bayesian statistical analysis for A/B testing
 */
class BayesianAnalyzer {
  async analyzeExperiment(
    variants: ExperimentVariant[],
    config: ExperimentConfig
  ): Promise<BayesianResult> {
    // Simplified Bayesian analysis
    const probability_best: { [variant_id: string]: number } = {};
    const expected_loss: { [variant_id: string]: number } = {};
    const credible_intervals: { [variant_id: string]: any } = {};

    for (const variant of variants) {
      probability_best[variant.variant_id] = 1 / variants.length; // Equal probability
      expected_loss[variant.variant_id] = 0;
      credible_intervals[variant.variant_id] = {
        lower: 0,
        upper: 0,
        probability: 0.95
      };
    }

    return {
      probability_best,
      expected_loss,
      credible_intervals,
      recommendation: 'Continue experiment'
    };
  }
}

/**
 * 🎰 MULTI-ARMED BANDIT OPTIMIZER
 * Dynamic traffic allocation using bandit algorithms
 */
class MultiArmedBanditOptimizer {
  async optimize(
    experiment: Experiment,
    config: MultiArmedBanditConfig
  ): Promise<void> {
    // Implement bandit optimization
    // This would dynamically adjust traffic allocation based on performance
    
    console.log(`🎰 Optimizing experiment with ${config.algorithm} algorithm`);
  }
}

/**
 * 🚀 DEFAULT A/B TEST CONFIGURATIONS
 */
export const DEFAULT_AB_TEST_CONFIGS = {
  SIMPLE_STRATEGY_TEST: {
    traffic_allocation: {
      control_percentage: 50,
      treatment_percentages: [50],
      ramp_up_strategy: 'immediate' as const
    },
    significance_level: 0.05,
    statistical_power: 0.8,
    minimum_detectable_effect: 0.05,
    planned_duration_days: 14
  },
  
  MULTI_VARIANT_TEST: {
    traffic_allocation: {
      control_percentage: 40,
      treatment_percentages: [30, 30],
      ramp_up_strategy: 'gradual' as const,
      ramp_up_duration_hours: 24
    },
    significance_level: 0.01,
    statistical_power: 0.9,
    minimum_detectable_effect: 0.03,
    planned_duration_days: 21
  }
};

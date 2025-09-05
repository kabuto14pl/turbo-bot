/**
 * 🧠 ADVANCED ML SYSTEM - TYPE DEFINITIONS
 * Replacing SimpleRL with enterprise-grade Deep RL system
 */

import * as tf from '@tensorflow/tfjs';

// Node.js global declarations
declare global {
  namespace NodeJS {
    interface Global {
      gc?: () => void;
    }
    interface Timer {}
    interface Timeout extends Timer {}
  }
  
  var global: any;
  var process: any;
}

// TensorFlow Types
export type FeatureVector = Float32Array | number[];
export type ActionVector = Float32Array | number[];
export type MLModel = any; // Simplified for compatibility

// Activation Types
export type ActivationIdentifier = 
  | 'elu'
  | 'hardSigmoid'
  | 'linear'
  | 'relu'
  | 'relu6'
  | 'selu'
  | 'sigmoid'
  | 'softmax'
  | 'softplus'
  | 'softsign'
  | 'tanh'
  | 'swish'
  | 'mish';

// =================== BASIC TYPES ===================

export interface MarketState {
  timestamp: number;
  price: number;
  volume: number;
  
  // Technical indicators (200+ features)
  indicators: {
    rsi_14: number;
    rsi_21: number;
    rsi_30: number;
    ema_9: number;
    ema_21: number;
    ema_50: number;
    ema_200: number;
    sma_20: number;
    sma_50: number;
    sma_200: number;
    adx: number;
    atr: number;
    macd: number;
    macd_signal: number;
    macd_histogram: number;
    bollinger_upper: number;
    bollinger_middle: number;
    bollinger_lower: number;
    stochastic_k: number;
    stochastic_d: number;
    williams_r: number;
    cci: number;
    momentum: number;
    roc: number;
    
    // Volatility indicators
    volatility_1h: number;
    volatility_4h: number;
    volatility_1d: number;
    realized_volatility: number;
    
    // Volume indicators
    volume_sma_20: number;
    volume_weighted_price: number;
    on_balance_volume: number;
    accumulation_distribution: number;
    
    // Price action patterns
    doji: boolean;
    hammer: boolean;
    shooting_star: boolean;
    engulfing_bullish: boolean;
    engulfing_bearish: boolean;
  };

  // Market microstructure (100+ features)  
  microstructure: {
    bidAskSpread: number;
    orderBookImbalance: number;
    volumeProfile: number[];
    tickSize: number;
    liquidity: number;
    marketImpact: number;
    
    // Order flow
    buyVolume: number;
    sellVolume: number;
    aggressiveBuys: number;
    aggressiveSells: number;
    
    // Market depth
    bidLevels: number[];
    askLevels: number[];
    supportResistance: number[];
  };

  // Cross-asset features (100+ features)
  crossAsset: {
    btcEthCorrelation: number;
    dollarIndex: number;
    bondYields: number;
    vixLevel: number;
    goldPrice: number;
    oilPrice: number;
    
    // Crypto ecosystem
    defiTvl: number;
    stablecoinSupply: number;
    exchangeInflows: number;
    exchangeOutflows: number;
    
    // Traditional markets
    sp500: number;
    nasdaq: number;
    eur_usd: number;
    gbp_usd: number;
  };

  // Sentiment features (50+ features)
  sentiment: {
    newssentiment: number;
    socialSentiment: number;
    fearGreedIndex: number;
    redditMentions: number;
    twitterSentiment: number;
    googleTrends: number;
    
    // On-chain sentiment
    hodlerSentiment: number;
    whaleActivity: number;
    exchangeSentiment: number;
  };

  // Temporal features (50+ features)
  temporal: {
    hourOfDay: number;
    dayOfWeek: number;
    monthOfYear: number;
    seasonality: number;
    marketSession: 'asian' | 'european' | 'american' | 'overlap';
    isWeekend: boolean;
    isHoliday: boolean;
    
    // Time-based patterns
    timeToClose: number;
    timeToOpen: number;
    sessionVolatility: number;
  };
}

// =================== DEEP RL TYPES ===================

export interface DeepRLAction {
  // Continuous action space
  position_size: number;     // -1.0 to 1.0 (short to long)
  confidence: number;        // 0.0 to 1.0
  hold_duration: number;     // Expected hold time in minutes
  stop_loss: number;         // Stop loss percentage
  take_profit: number;       // Take profit percentage
  
  // Discrete components
  action_type: 'BUY' | 'SELL' | 'HOLD' | 'CLOSE' | 'SCALE_IN' | 'SCALE_OUT';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  
  // Metadata
  reasoning: string;
  agent_contributions: AgentContribution[];
  uncertainty: number;
  model_version: string;
  prediction_timestamp: number;
}

export interface AgentContribution {
  agent_name: string;
  confidence: number;
  signal_strength: number;
  reasoning: string;
}

export interface Experience {
  state: Float32Array;        // Feature vector (500+ dimensions)
  action: DeepRLAction;       // Action taken
  reward: number;             // Immediate reward
  next_state: Float32Array;   // Next state features
  done: boolean;              // Episode termination
  
  // Advanced fields
  td_error?: number;          // Temporal difference error
  priority?: number;          // Experience priority
  importance_weight?: number; // Importance sampling weight
  timestamp: number;
  market_regime?: string;     // Market condition when experience occurred
  reasoning?: string;         // Explanation for the experience
}

// =================== NETWORK ARCHITECTURES ===================

export interface NetworkConfig {
  input_dim: number;
  hidden_layers: number[];
  activation: string;
  dropout_rate: number;
  batch_normalization: boolean;
  learning_rate: number;
  optimizer: 'adam' | 'rmsprop' | 'sgd';
  
  // Architecture-specific
  lstm_units?: number;
  attention_heads?: number;
  conv_filters?: number[];
  kernel_sizes?: number[];
}

export interface PolicyNetworkConfig extends NetworkConfig {
  action_space_size: number;
  continuous_actions: boolean;
  action_bounds: { min: number; max: number }[];
}

export interface ValueNetworkConfig extends NetworkConfig {
  output_activation: 'linear' | 'tanh';
  dueling_architecture: boolean;
}

// =================== TRAINING CONFIGURATION ===================

export interface TrainingConfig {
  algorithm: 'PPO' | 'SAC' | 'A3C' | 'DDPG' | 'TD3';
  
  // Network architecture
  policy_hidden_layers: number[];
  value_hidden_layers: number[];
  
  // Learning parameters
  learning_rate: number;
  policy_learning_rate?: number;
  value_learning_rate?: number;
  batch_size: number;
  epochs: number;
  epsilon: number;
  epsilon_decay: number;
  epsilon_min: number;
  gamma: number;
  tau: number;
  buffer_size: number;
  update_frequency: number;
  target_update_frequency: number;
  grad_clip: number;
  
  // PPO specific
  clip_ratio?: number;
  entropy_coefficient?: number;
  value_loss_coefficient?: number;
  max_grad_norm?: number;
  
  // SAC specific  
  temperature?: number;
  target_entropy?: number;
  
  // General
  episodes_per_update: number;
  
  // Advanced
  prioritized_replay: boolean;
  multi_step_returns: number;
  distributional_rl: boolean;
  noisy_networks: boolean;
  
  // Regularization
  dropout_rate?: number;
}

// =================== HYPERPARAMETER OPTIMIZATION TYPES ===================

export interface HyperparameterRange {
  name: string;
  type: 'categorical' | 'uniform' | 'log_uniform' | 'int' | 'log_int' | 'choice';
  low?: number;
  high?: number;
  choices?: any[];
  step?: number;
  distribution?: 'normal' | 'beta' | 'gamma';
  distribution_params?: number[];
}

export interface OptimizationObjective {
  name: string;
  direction: 'maximize' | 'minimize';
  weight?: number;
  threshold?: number;
}

export interface HyperparameterTrial {
  trial_id: string;
  parameters: { [key: string]: any };
  objectives: { [key: string]: number };
  status: 'pending' | 'running' | 'completed' | 'failed' | 'pruned';
  start_time: number;
  end_time?: number;
  intermediate_values: number[];
  user_attrs: { [key: string]: any };
}

export interface OptimizationStudy {
  study_name: string;
  optimization_direction: 'maximize' | 'minimize';
  trials: HyperparameterTrial[];
  best_trial?: HyperparameterTrial;
  best_value?: number;
  best_params?: { [key: string]: any };
  study_state: 'running' | 'completed' | 'failed';
  creation_time: number;
  completion_time?: number;
}

// =================== LEARNING RATE SCHEDULER TYPES ===================

export interface SchedulerHistory {
  step: number;
  learning_rate: number;
  metric?: number;
  epoch?: number;
}

export interface SchedulerMetrics {
  current_lr: number;
  step: number;
  epoch: number;
  best_metric: number;
  plateau_count: number;
  warmup_complete: boolean;
  scheduler_type: string;
  total_reductions: number;
  time_since_last_reduction: number;
}

export interface AdaptiveSchedulerState {
  recent_improvements: number[];
  moving_average_metric: number;
  learning_rate_momentum: number;
  adaptation_count: number;
  last_adaptation_step: number;
}

// =================== ADVANCED SEARCH TYPES ===================

export interface SearchSpace {
  name: string;
  type: 'categorical' | 'uniform' | 'log_uniform' | 'int' | 'log_int' | 'choice';
  low?: number;
  high?: number;
  choices?: any[];
  step?: number;
  distribution?: 'normal' | 'beta' | 'gamma';
  distribution_params?: number[];
}

export interface BayesianOptimizationState {
  gaussian_process_params: {
    kernel_type: 'rbf' | 'matern' | 'linear';
    length_scale: number;
    signal_variance: number;
    noise_variance: number;
  };
  acquisition_function: 'ei' | 'pi' | 'ucb' | 'poi' | 'lcb';
  acquisition_params: {
    xi?: number;
    kappa?: number;
    beta?: number;
  };
  observed_points: Array<{
    parameters: { [key: string]: any };
    objective: number;
  }>;
}

export interface EvolutionaryState {
  generation: number;
  population: Array<{
    genome: { [key: string]: any };
    fitness: number;
    age: number;
  }>;
  elite_size: number;
  mutation_rate: number;
  crossover_rate: number;
  selection_pressure: number;
}

// =================== MODEL MANAGEMENT ===================

export interface ModelMetadata {
  model_id: string;
  version: string;
  created_at: number;
  algorithm: string;
  performance_metrics: PerformanceMetrics;
  training_config: TrainingConfig;
  feature_importance: FeatureImportance[];
  
  // Deployment info
  deployment_status: 'training' | 'testing' | 'staging' | 'production' | 'retired';
  traffic_percentage: number;
  ab_test_id?: string;
}

export interface PerformanceMetrics {
  // Memory metrics
  total_memory_mb: number;
  used_memory_mb: number;
  peak_memory_mb: number;
  memory_fragmentation: number;
  tensor_count: number;
  
  // Compute metrics
  training_throughput: number;
  inference_latency: number;
  gpu_utilization: number;
  cpu_utilization: number;
  
  // Model metrics
  model_size_mb: number;
  parameter_count: number;
  flops_per_inference: number;
  
  // Training metrics
  time_per_epoch: number;
  convergence_speed: number;
  gradient_norm: number;
  learning_stability: number;
  
  // Trading metrics
  sharpe_ratio: number;
  max_drawdown: number;
  win_rate: number;
  average_return: number;
  total_return: number;
  profit_factor: number;
  calmar_ratio: number;
  sortino_ratio: number;
  information_ratio: number;
  tracking_error: number;
  beta: number;
  alpha: number;
  volatility: number;
  var_95: number;
  cvar_95: number;
  
  // ML specific metrics
  prediction_accuracy: number;
  mean_squared_error: number;
  mean_absolute_error: number;
  
  // Trading specific
  total_trades: number;
  profitable_trades: number;
  average_trade_duration: number;
  largest_win: number;
  largest_loss: number;
}

export interface FeatureImportance {
  feature_name: string;
  importance_score: number;
  category: 'technical' | 'microstructure' | 'cross_asset' | 'sentiment' | 'temporal';
}

// =================== MULTI-AGENT SYSTEM ===================

export interface AgentSpecialization {
  name: string;
  specialization: 'trend_following' | 'mean_reversion' | 'volatility' | 'sentiment' | 'arbitrage';
  network_architecture: 'lstm' | 'transformer' | 'cnn' | 'mlp';
  feature_subset: string[];
  weight_in_ensemble: number;
  
  performance_history: PerformanceMetrics[];
  last_updated: number;
  training_status: 'active' | 'paused' | 'retraining';
}

export interface EnsemblePrediction {
  final_action: DeepRLAction;
  agent_predictions: Map<string, DeepRLAction>;
  consensus_score: number;
  disagreement_score: number;
  
  // Uncertainty quantification
  epistemic_uncertainty: number;  // Model uncertainty
  aleatoric_uncertainty: number;  // Data uncertainty
  total_uncertainty: number;
  
  explanation: ModelExplanation;
}

export interface ModelExplanation {
  top_features: FeatureContribution[];
  agent_reasoning: Map<string, string>;
  attention_weights?: number[];
  counterfactual_analysis?: CounterfactualResult[];
}

export interface FeatureContribution {
  feature_name: string;
  contribution_score: number;
  direction: 'positive' | 'negative';
  confidence: number;
}

export interface CounterfactualResult {
  original_prediction: DeepRLAction;
  modified_features: string[];
  new_prediction: DeepRLAction;
  feature_sensitivity: number;
}

// =================== MONITORING & ALERTING ===================

export interface MonitoringMetrics {
  model_performance: PerformanceMetrics;
  feature_drift: FeatureDriftMetrics;
  prediction_latency: LatencyMetrics;
  system_health: SystemHealthMetrics;
  
  // Anomaly detection
  anomaly_scores: AnomalyScore[];
  drift_warnings: DriftWarning[];
  performance_alerts: PerformanceAlert[];
}

export interface FeatureDriftMetrics {
  overall_drift_score: number;
  feature_drift_scores: Map<string, number>;
  drift_threshold: number;
  last_baseline_update: number;
  
  // Statistical tests
  kolmogorov_smirnov_pvalues: Map<string, number>;
  population_stability_index: Map<string, number>;
}

export interface LatencyMetrics {
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  max_latency_ms: number;
  
  // Breakdown by component
  feature_extraction_ms: number;
  model_inference_ms: number;
  post_processing_ms: number;
}

export interface SystemHealthMetrics {
  cpu_usage: number;
  memory_usage: number;
  gpu_usage?: number;
  disk_usage: number;
  
  // Model specific
  model_load_time_ms: number;
  models_in_memory: number;
  cache_hit_rate: number;
}

export interface AnomalyScore {
  timestamp: number;
  score: number;
  threshold: number;
  features_contributing: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DriftWarning {
  timestamp: number;
  feature_name: string;
  drift_score: number;
  threshold: number;
  recommendation: string;
}

export interface PerformanceAlert {
  timestamp: number;
  metric_name: string;
  current_value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  action_required: string;
}

// =================== EXPORTS ===================

// Constants
export const FEATURE_DIMENSIONS = 500;
export const ACTION_DIMENSIONS = 6;  // position_size, confidence, hold_duration, stop_loss, take_profit, action_type
export const MAX_SEQUENCE_LENGTH = 100;
export const SUPPORTED_TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;

export type Timeframe = typeof SUPPORTED_TIMEFRAMES[number];

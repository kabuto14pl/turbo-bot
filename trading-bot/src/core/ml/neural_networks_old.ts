/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🧠 DEEP RL NEURAL NETWORKS
 * Real TensorFlow.js neural networks replacing SimpleRL's hardcoded if/else logic
 * Implements Policy Network (Actor) and Value Network (Critic) for PPO/SAC algorithms
 */

import * as tf from '@tensorflow/tfjs';
import {
  PolicyNetworkConfig,
  ValueNetworkConfig,
  DeepRLAction,
  FeatureVector,
  FEATURE_DIMENSIONS,
  ACTION_DIMENSIONS
} from './types';
import { Logger } from '../../../core/utils/logger';

interface NetworkTrainingMetrics {
  loss: number;
  accuracy?: number;
  gradientNorm: number;
  learningRate: number;
  epoch: number;
  timestamp: number;
}

export class PolicyNetwork {
  private model!: tf.LayersModel;
  private optimizer!: tf.Optimizer;
  private logger: Logger;
  private config!: PolicyNetworkConfig;
  private trainingMetrics: NetworkTrainingMetrics[] = [];
  private policyNetwork?: any; // Changed from MLModel (undefined type)
  private valueNetwork?: any; // Changed from MLModel (undefined type)
  private targetPolicyNetwork?: any; // Changed from MLModel (undefined type)
  private targetValueNetwork?: any; // Changed from MLModel (undefined type)

  // Training components
  private policyOptimizer?: tf.Optimizer;
  private valueOptimizer?: tf.Optimizer;
  private isInitialized: boolean = false;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Initialize all neural networks
   */
  async initialize(
    policyConfig: PolicyNetworkConfig,
    valueConfig: ValueNetworkConfig
  ): Promise<void> {
    try {
      this.logger.info('Initializing Deep RL Neural Networks...');

      // 1. Initialize Policy Network (Actor)
      await this.initializePolicyNetwork(policyConfig);

      // 2. Initialize Value Network (Critic)
      await this.initializeValueNetwork(valueConfig);

      // 3. Initialize target networks (for stable training)
      await this.initializeTargetNetworks();

      // 4. Initialize optimizers
      this.initializeOptimizers(policyConfig, valueConfig);

      this.isInitialized = true;
      this.logger.info('✅ Deep RL Neural Networks initialized successfully');

      // Log network summaries
      this.logNetworkInfo();

    } catch (error) {
      this.logger.error('Failed to initialize neural networks:', error);
      throw error;
    }
  }

  /**
   * Create Policy Network (Actor) - generates actions
   */
  private async initializePolicyNetwork(config: PolicyNetworkConfig): Promise<void> {
    this.logger.info('Creating Policy Network (Actor)...');

    const inputs = tf.input({ shape: [FEATURE_DIMENSIONS], name: 'state_input' });

    // Input normalization layer
    let x = tf.layers.batchNormalization({ name: 'input_norm' }).apply(inputs) as tf.SymbolicTensor;

    // Hidden layers with residual connections
    for (let i = 0; i < config.hidden_layers.length; i++) {
      const units = config.hidden_layers[i];

      // Dense layer
      const dense = tf.layers.dense({
        units: units,
        activation: config.activation,
        kernelInitializer: 'glorotUniform',
        name: `policy_dense_${i}`
      }).apply(x) as tf.SymbolicTensor;

      // Dropout for regularization
      const dropout = tf.layers.dropout({
        rate: config.dropout_rate,
        name: `policy_dropout_${i}`
      }).apply(dense) as tf.SymbolicTensor;

      // Batch normalization
      const batchNorm = tf.layers.batchNormalization({
        name: `policy_batch_norm_${i}`
      }).apply(dropout) as tf.SymbolicTensor;

      // Residual connection (if dimensions match)
      if (i > 0 && config.hidden_layers[i] === config.hidden_layers[i - 1]) {
        x = tf.layers.add({ name: `policy_residual_${i}` }).apply([x, batchNorm]) as tf.SymbolicTensor;
      } else {
        x = batchNorm;
      }
    }

    // LSTM layer for temporal patterns
    if (config.lstm_units && config.lstm_units > 0) {
      // Reshape for LSTM (add sequence dimension)
      const reshaped = tf.layers.reshape({
        targetShape: [1, config.hidden_layers[config.hidden_layers.length - 1]],
        name: 'policy_lstm_reshape'
      }).apply(x) as tf.SymbolicTensor;

      x = tf.layers.lstm({
        units: config.lstm_units,
        returnSequences: false,
        dropout: config.dropout_rate,
        recurrentDropout: config.dropout_rate,
        name: 'policy_lstm'
      }).apply(reshaped) as tf.SymbolicTensor;
    }

    // Attention mechanism (if specified)
    if (config.attention_heads && config.attention_heads > 0) {
      x = this.createAttentionLayer(x, config.attention_heads, 'policy_attention');
    }

    // Output layers
    if (config.continuous_actions) {
      // Continuous action space (position_size, confidence, etc.)
      const actionMeans = tf.layers.dense({
        units: ACTION_DIMENSIONS,
        activation: 'tanh',
        name: 'action_means'
      }).apply(x) as tf.SymbolicTensor;

      const actionStds = tf.layers.dense({
        units: ACTION_DIMENSIONS,
        activation: 'softplus',
        name: 'action_stds'
      }).apply(x) as tf.SymbolicTensor;

      // Combine means and stds
      const policyOutput = tf.layers.concatenate({
        name: 'policy_output'
      }).apply([actionMeans, actionStds]) as tf.SymbolicTensor;

      this.policyNetwork = tf.model({
        inputs: inputs,
        outputs: policyOutput,
        name: 'PolicyNetwork'
      });

    } else {
      // Discrete action space (BUY/SELL/HOLD)
      const actionProbs = tf.layers.dense({
        units: config.action_space_size,
        activation: 'softmax',
        name: 'action_probabilities'
      }).apply(x) as tf.SymbolicTensor;

      this.policyNetwork = tf.model({
        inputs: inputs,
        outputs: actionProbs,
        name: 'PolicyNetwork'
      });
    }
  }

  /**
   * Create Value Network (Critic) - estimates state values
   */
  private async initializeValueNetwork(config: ValueNetworkConfig): Promise<void> {
    this.logger.info('Creating Value Network (Critic)...');

    const inputs = tf.input({ shape: [FEATURE_DIMENSIONS], name: 'state_input' });

    // Input normalization
    let x = tf.layers.batchNormalization({ name: 'value_input_norm' }).apply(inputs) as tf.SymbolicTensor;

    // Hidden layers
    for (let i = 0; i < config.hidden_layers.length; i++) {
      const units = config.hidden_layers[i];

      x = tf.layers.dense({
        units: units,
        activation: config.activation,
        kernelInitializer: 'glorotUniform',
        name: `value_dense_${i}`
      }).apply(x) as tf.SymbolicTensor;

      if (config.dropout_rate > 0) {
        x = tf.layers.dropout({
          rate: config.dropout_rate,
          name: `value_dropout_${i}`
        }).apply(x) as tf.SymbolicTensor;
      }

      if (config.batch_normalization) {
        x = tf.layers.batchNormalization({
          name: `value_batch_norm_${i}`
        }).apply(x) as tf.SymbolicTensor;
      }
    }

    // Dueling architecture (if enabled)
    if (config.dueling_architecture) {
      // State value stream
      const stateValue = tf.layers.dense({
        units: 1,
        activation: config.output_activation,
        name: 'state_value'
      }).apply(x) as tf.SymbolicTensor;

      // Advantage stream
      const advantage = tf.layers.dense({
        units: 1,
        activation: config.output_activation,
        name: 'advantage'
      }).apply(x) as tf.SymbolicTensor;

      // Combine: Q(s,a) = V(s) + A(s,a) - mean(A(s,a))
      const qValue = tf.layers.add({ name: 'q_value' }).apply([stateValue, advantage]) as tf.SymbolicTensor;

      this.valueNetwork = tf.model({
        inputs: inputs,
        outputs: qValue,
        name: 'ValueNetwork'
      });

    } else {
      // Standard value network
      const valueOutput = tf.layers.dense({
        units: 1,
        activation: config.output_activation,
        name: 'value_output'
      }).apply(x) as tf.SymbolicTensor;

      this.valueNetwork = tf.model({
        inputs: inputs,
        outputs: valueOutput,
        name: 'ValueNetwork'
      });
    }
  }

  /**
   * Initialize target networks for stable training
   */
  private async initializeTargetNetworks(): Promise<void> {
    if (!this.policyNetwork || !this.valueNetwork) {
      throw new Error('Main networks must be initialized before target networks');
    }

    this.logger.info('Creating target networks...');

    // Clone main networks
    this.targetPolicyNetwork = tf.models.modelFromJSON(this.policyNetwork.toJSON()) as any;
    this.targetValueNetwork = tf.models.modelFromJSON(this.valueNetwork.toJSON()) as any;

    // Copy weights
    this.updateTargetNetworks(1.0); // Full copy initially
  }

  /**
   * Initialize optimizers
   */
  private initializeOptimizers(policyConfig: PolicyNetworkConfig, valueConfig: ValueNetworkConfig): void {
    this.policyOptimizer = tf.train.adam(policyConfig.learning_rate);
    this.valueOptimizer = tf.train.adam(valueConfig.learning_rate);
  }

  /**
   * Create attention layer
   */
  private createAttentionLayer(
    input: tf.SymbolicTensor,
    numHeads: number,
    name: string
  ): tf.SymbolicTensor {
    // Simplified multi-head attention (TensorFlow.js doesn't have built-in transformer layers)
    const dim = input.shape[input.shape.length - 1] as number;
    const headDim = Math.floor(dim / numHeads);

    let attention = input;

    // Query, Key, Value projections
    const query = tf.layers.dense({
      units: dim,
      name: `${name}_query`
    }).apply(attention) as tf.SymbolicTensor;

    const key = tf.layers.dense({
      units: dim,
      name: `${name}_key`
    }).apply(attention) as tf.SymbolicTensor;

    const value = tf.layers.dense({
      units: dim,
      name: `${name}_value`
    }).apply(attention) as tf.SymbolicTensor;

    // Simplified attention computation (placeholder)
    // In full implementation, would include proper multi-head attention
    attention = tf.layers.add({ name: `${name}_output` }).apply([query, value]) as tf.SymbolicTensor;

    return attention;
  }

  /**
   * Generate action from policy network
   */
  async generateAction(state: FeatureVector): Promise<any> {
    if (!this.isInitialized || !this.policyNetwork) {
      throw new Error('Networks not initialized');
    }

    const stateTensor = tf.tensor2d([Array.from(state)]);

    try {
      const prediction = this.policyNetwork.predict(stateTensor) as tf.Tensor;
      const actionData = await prediction.data();

      // Convert to ActionVector
      const action = new Float32Array(ACTION_DIMENSIONS);
      for (let i = 0; i < ACTION_DIMENSIONS; i++) {
        action[i] = actionData[i];
      }

      return action;

    } finally {
      stateTensor.dispose();
    }
  }

  /**
   * Estimate value from value network
   */
  async estimateValue(state: FeatureVector): Promise<number> {
    if (!this.isInitialized || !this.valueNetwork) {
      throw new Error('Networks not initialized');
    }

    const stateTensor = tf.tensor2d([Array.from(state)]);

    try {
      const prediction = this.valueNetwork.predict(stateTensor) as tf.Tensor;
      const valueData = await prediction.data();
      return valueData[0];

    } finally {
      stateTensor.dispose();
    }
  }

  /**
   * Update target networks (soft update)
   */
  updateTargetNetworks(tau: number = 0.005): void {
    if (!this.targetPolicyNetwork || !this.targetValueNetwork) {
      return;
    }

    // Soft update: target = tau * main + (1 - tau) * target
    this.softUpdateNetwork(this.policyNetwork!, this.targetPolicyNetwork, tau);
    this.softUpdateNetwork(this.valueNetwork!, this.targetValueNetwork, tau);
  }

  /**
   * Soft update helper
   */
  private softUpdateNetwork(source: any, target: any, tau: number): void {
    const sourceWeights = source.getWeights();
    const targetWeights = target.getWeights();

    const updatedWeights = sourceWeights.map((sourceWeight: any, i: number) => {
      const targetWeight = targetWeights[i];
      return sourceWeight.mul(tau).add(targetWeight.mul(1 - tau));
    });

    target.setWeights(updatedWeights);

    // Dispose temporary tensors
    sourceWeights.forEach((w: any) => w.dispose());
    targetWeights.forEach((w: any) => w.dispose());
    updatedWeights.forEach((w: any) => w.dispose());
  }

  /**
   * Save networks to files
   */
  async saveNetworks(basePath: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Networks not initialized');
    }

    await this.policyNetwork!.save(`file://${basePath}/policy_network`);
    await this.valueNetwork!.save(`file://${basePath}/value_network`);

    this.logger.info(`Networks saved to ${basePath}`);
  }

  /**
   * Load networks from files
   */
  async loadNetworks(basePath: string): Promise<void> {
    try {
      this.policyNetwork = await tf.loadLayersModel(`file://${basePath}/policy_network/model.json`) as any;
      this.valueNetwork = await tf.loadLayersModel(`file://${basePath}/value_network/model.json`) as any;

      // Reinitialize target networks
      await this.initializeTargetNetworks();

      this.isInitialized = true;
      this.logger.info(`Networks loaded from ${basePath}`);

    } catch (error) {
      this.logger.error('Failed to load networks:', error);
      throw error;
    }
  }

  /**
   * Get network information
   */
  private logNetworkInfo(): void {
    if (this.policyNetwork && this.valueNetwork) {
      const policyParams = this.policyNetwork.countParams();
      const valueParams = this.valueNetwork.countParams();

      this.logger.info(`Policy Network: ${policyParams} parameters`);
      this.logger.info(`Value Network: ${valueParams} parameters`);
      this.logger.info(`Total Parameters: ${policyParams + valueParams}`);
    }
  }

  /**
   * Dispose networks and free memory
   */
  dispose(): void {
    this.policyNetwork?.dispose();
    this.valueNetwork?.dispose();
    this.targetPolicyNetwork?.dispose();
    this.targetValueNetwork?.dispose();
    this.policyOptimizer?.dispose();
    this.valueOptimizer?.dispose();

    this.isInitialized = false;
    this.logger.info('Neural networks disposed');
  }

  /**
   * Get current networks (for training)
   */
  getNetworks(): {
    policy: any;
    value: any;
    targetPolicy: any;
    targetValue: any;
    policyOptimizer: tf.Optimizer;
    valueOptimizer: tf.Optimizer;
  } {
    if (!this.isInitialized) {
      throw new Error('Networks not initialized');
    }

    return {
      policy: this.policyNetwork!,
      value: this.valueNetwork!,
      targetPolicy: this.targetPolicyNetwork!,
      targetValue: this.targetValueNetwork!,
      policyOptimizer: this.policyOptimizer!,
      valueOptimizer: this.valueOptimizer!
    };
  }

  /**
   * Get memory usage information
   */
  getMemoryInfo(): { numTensors: number; numBytes: number } {
    return tf.memory();
  }
}

/**
 * 🧠 DEEP RL NEURAL NETWORKS - FIXED VERSION
 * Real TensorFlow.js neural networks replacing SimpleRL's hardcoded if/else logic
 */

import * as tf from '@tensorflow/tfjs';
import { 
  PolicyNetworkConfig, 
  ValueNetworkConfig, 
  DeepRLAction, 
  FeatureVector,
  FEATURE_DIMENSIONS
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
  private model: tf.LayersModel | null = null;
  private optimizer: tf.Optimizer | null = null;
  private logger: Logger;
  private config: PolicyNetworkConfig;
  private trainingMetrics: NetworkTrainingMetrics[] = [];

  constructor(config: PolicyNetworkConfig) {
    this.config = config;
    this.logger = new Logger();
    this.initializeNetwork();
    this.initializeOptimizer();
  }

  /**
   * Initialize the Policy Network architecture
   */
  private initializeNetwork(): void {
    const inputs = tf.input({ shape: [FEATURE_DIMENSIONS] });
    
    // First hidden layer
    let x = tf.layers.dense({ 
      units: this.config.hidden_layers[0], 
      activation: 'relu',
      kernelInitializer: 'glorotUniform'
    }).apply(inputs) as tf.SymbolicTensor;

    if (this.config.batch_normalization) {
      x = tf.layers.batchNormalization().apply(x) as tf.SymbolicTensor;
    }
    
    x = tf.layers.dropout({ rate: this.config.dropout_rate }).apply(x) as tf.SymbolicTensor;

    // Additional hidden layers
    for (let i = 1; i < this.config.hidden_layers.length; i++) {
      x = tf.layers.dense({ 
        units: this.config.hidden_layers[i], 
        activation: 'relu',
        kernelInitializer: 'glorotUniform'
      }).apply(x) as tf.SymbolicTensor;
      
      if (this.config.batch_normalization) {
        x = tf.layers.batchNormalization().apply(x) as tf.SymbolicTensor;
      }
      
      x = tf.layers.dropout({ rate: this.config.dropout_rate }).apply(x) as tf.SymbolicTensor;
    }

    // Output layers for different action components
    const actionTypeOutput = tf.layers.dense({ 
      units: 3, // BUY, SELL, HOLD
      activation: 'softmax',
      name: 'action_type'
    }).apply(x) as tf.SymbolicTensor;

    const positionSizeOutput = tf.layers.dense({ 
      units: 1, 
      activation: 'tanh',
      name: 'position_size'
    }).apply(x) as tf.SymbolicTensor;

    const confidenceOutput = tf.layers.dense({ 
      units: 1, 
      activation: 'sigmoid',
      name: 'confidence'
    }).apply(x) as tf.SymbolicTensor;

    const holdDurationOutput = tf.layers.dense({ 
      units: 1, 
      activation: 'relu',
      name: 'hold_duration'
    }).apply(x) as tf.SymbolicTensor;

    const stopLossOutput = tf.layers.dense({ 
      units: 1, 
      activation: 'sigmoid',
      name: 'stop_loss'
    }).apply(x) as tf.SymbolicTensor;

    const takeProfitOutput = tf.layers.dense({ 
      units: 1, 
      activation: 'sigmoid',
      name: 'take_profit'
    }).apply(x) as tf.SymbolicTensor;

    this.model = tf.model({ 
      inputs: inputs, 
      outputs: [
        actionTypeOutput,
        positionSizeOutput,
        confidenceOutput,
        holdDurationOutput,
        stopLossOutput,
        takeProfitOutput
      ]
    });

    this.logger.info(`Policy Network initialized with ${this.model.countParams()} parameters`);
  }

  /**
   * Initialize optimizer
   */
  private initializeOptimizer(): void {
    switch (this.config.optimizer) {
      case 'adam':
        this.optimizer = tf.train.adam(this.config.learning_rate);
        break;
      case 'rmsprop':
        this.optimizer = tf.train.rmsprop(this.config.learning_rate);
        break;
      case 'sgd':
        this.optimizer = tf.train.sgd(this.config.learning_rate);
        break;
      default:
        this.optimizer = tf.train.adam(this.config.learning_rate);
    }
  }

  /**
   * Generate action from features using the policy network
   */
  async predict(features: FeatureVector): Promise<DeepRLAction> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    return tf.tidy(() => {
      const input = tf.tensor2d([Array.from(features)]);
      const predictions = this.model!.predict(input) as tf.Tensor[];

      // Extract predictions
      const actionTypeProbs = predictions[0].dataSync() as Float32Array;
      const positionSize = predictions[1].dataSync()[0];
      const confidence = predictions[2].dataSync()[0];
      const holdDuration = predictions[3].dataSync()[0];
      const stopLoss = predictions[4].dataSync()[0];
      const takeProfit = predictions[5].dataSync()[0];

      // Sample action type from probability distribution
      const actionTypes: ('BUY' | 'SELL' | 'HOLD')[] = ['BUY', 'SELL', 'HOLD'];
      const sampledActionType = this.sampleFromProbs(actionTypeProbs, actionTypes);

      return {
        position_size: positionSize,
        confidence: confidence,
        hold_duration: holdDuration * 1440, // Convert to minutes
        stop_loss: stopLoss * 0.1, // Convert to percentage
        take_profit: takeProfit * 0.2, // Convert to percentage
        action_type: sampledActionType,
        priority: confidence > 0.8 ? 'HIGH' : confidence > 0.6 ? 'MEDIUM' : 'LOW',
        reasoning: `Neural network prediction with ${(confidence * 100).toFixed(1)}% confidence`,
        agent_contributions: [],
        uncertainty: 1 - confidence,
        model_version: 'PolicyNetwork_v1.0',
        prediction_timestamp: Date.now()
      };
    });
  }

  /**
   * Sample action from probability distribution
   */
  private sampleFromProbs<T>(probs: Float32Array, actions: T[]): T {
    const rand = Math.random();
    let cumSum = 0;
    
    for (let i = 0; i < probs.length; i++) {
      cumSum += probs[i];
      if (rand < cumSum) {
        return actions[i];
      }
    }
    
    return actions[actions.length - 1];
  }

  /**
   * Train the policy network using PPO
   */
  async trainPPO(
    states: FeatureVector[], 
    actions: DeepRLAction[], 
    advantages: number[],
    oldLogProbs: number[],
    clipRatio: number = 0.2
  ): Promise<NetworkTrainingMetrics> {
    if (!this.model || !this.optimizer) {
      throw new Error('Model or optimizer not initialized');
    }

    const startTime = Date.now();
    
    return tf.tidy(() => {
      const statesTensor = tf.tensor2d(states.map(s => Array.from(s)));
      const advantagesTensor = tf.tensor1d(advantages);
      const oldLogProbsTensor = tf.tensor1d(oldLogProbs);

      // Forward pass
      const predictions = this.model!.predict(statesTensor) as tf.Tensor[];
      
      // Calculate ratio for PPO clipping
      const newLogProbs = this.calculateLogProbs(predictions, actions);
      const ratio = tf.exp(tf.sub(newLogProbs, oldLogProbsTensor));
      
      // PPO clipped objective
      const clippedRatio = tf.clipByValue(ratio, 1 - clipRatio, 1 + clipRatio);
      const surrogate1 = tf.mul(ratio, advantagesTensor);
      const surrogate2 = tf.mul(clippedRatio, advantagesTensor);
      const policyLoss = tf.neg(tf.mean(tf.minimum(surrogate1, surrogate2)));
      
      // Entropy bonus for exploration
      const entropy = this.calculateEntropy(predictions);
      const entropyBonus = tf.mul(entropy, 0.01);
      
      // Total loss
      const totalLoss = tf.sub(policyLoss, entropyBonus);
      
      // Backward pass
      const grads = tf.grad(() => totalLoss)(this.model!.trainableWeights);
      this.optimizer!.applyGradients(grads);
      
      const metrics: NetworkTrainingMetrics = {
        loss: totalLoss.dataSync()[0],
        gradientNorm: this.calculateGradientNorm(grads),
        learningRate: this.config.learning_rate,
        epoch: this.trainingMetrics.length + 1,
        timestamp: Date.now()
      };
      
      this.trainingMetrics.push(metrics);
      this.logger.info(`PPO training completed in ${Date.now() - startTime}ms, loss: ${metrics.loss.toFixed(6)}`);
      
      return metrics;
    });
  }

  /**
   * Calculate log probabilities for actions
   */
  private calculateLogProbs(predictions: tf.Tensor[], actions: DeepRLAction[]): tf.Tensor {
    const actionTypeProbs = predictions[0];
    const logProbs = tf.log(tf.add(actionTypeProbs, 1e-8));
    return tf.mean(logProbs, 1);
  }

  /**
   * Calculate entropy for exploration
   */
  private calculateEntropy(predictions: tf.Tensor[]): tf.Tensor {
    const probs = predictions[0];
    const logProbs = tf.log(tf.add(probs, 1e-8));
    return tf.neg(tf.sum(tf.mul(probs, logProbs), 1));
  }

  /**
   * Calculate gradient norm for monitoring
   */
  private calculateGradientNorm(grads: Array<tf.Tensor | null>): number {
    let totalNorm = 0;
    grads.forEach(grad => {
      if (grad) {
        const norm = tf.norm(grad).dataSync()[0];
        totalNorm += norm * norm;
      }
    });
    return Math.sqrt(totalNorm);
  }

  /**
   * Save model to file
   */
  async saveModel(path: string): Promise<void> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }
    await this.model.save(`file://${path}`);
    this.logger.info(`Policy network saved to ${path}`);
  }

  /**
   * Load model from file
   */
  async loadModel(path: string): Promise<void> {
    this.model = await tf.loadLayersModel(`file://${path}`);
    this.logger.info(`Policy network loaded from ${path}`);
  }

  /**
   * Dispose model and free memory
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
    }
    if (this.optimizer) {
      this.optimizer.dispose();
    }
    this.logger.info('Policy network disposed');
  }
}

export class ValueNetwork {
  private model: tf.LayersModel | null = null;
  private optimizer: tf.Optimizer | null = null;
  private logger: Logger;
  private config: ValueNetworkConfig;
  private trainingMetrics: NetworkTrainingMetrics[] = [];

  constructor(config: ValueNetworkConfig) {
    this.config = config;
    this.logger = new Logger();
    this.initializeNetwork();
    this.initializeOptimizer();
  }

  /**
   * Initialize the Value Network architecture
   */
  private initializeNetwork(): void {
    const inputs = tf.input({ shape: [FEATURE_DIMENSIONS] });
    
    let x = tf.layers.dense({ 
      units: this.config.hidden_layers[0], 
      activation: 'relu',
      kernelInitializer: 'glorotUniform'
    }).apply(inputs) as tf.SymbolicTensor;

    if (this.config.batch_normalization) {
      x = tf.layers.batchNormalization().apply(x) as tf.SymbolicTensor;
    }
    
    x = tf.layers.dropout({ rate: this.config.dropout_rate }).apply(x) as tf.SymbolicTensor;

    // Hidden layers
    for (let i = 1; i < this.config.hidden_layers.length; i++) {
      x = tf.layers.dense({ 
        units: this.config.hidden_layers[i], 
        activation: 'relu'
      }).apply(x) as tf.SymbolicTensor;
      
      if (this.config.batch_normalization) {
        x = tf.layers.batchNormalization().apply(x) as tf.SymbolicTensor;
      }
      
      x = tf.layers.dropout({ rate: this.config.dropout_rate }).apply(x) as tf.SymbolicTensor;
    }

    // Output layer
    const output = tf.layers.dense({ 
      units: 1, 
      activation: 'linear'
    }).apply(x) as tf.SymbolicTensor;
    
    this.model = tf.model({ inputs: inputs, outputs: output });
    this.logger.info(`Value Network initialized with ${this.model.countParams()} parameters`);
  }

  /**
   * Initialize optimizer
   */
  private initializeOptimizer(): void {
    switch (this.config.optimizer) {
      case 'adam':
        this.optimizer = tf.train.adam(this.config.learning_rate);
        break;
      case 'rmsprop':
        this.optimizer = tf.train.rmsprop(this.config.learning_rate);
        break;
      case 'sgd':
        this.optimizer = tf.train.sgd(this.config.learning_rate);
        break;
      default:
        this.optimizer = tf.train.adam(this.config.learning_rate);
    }
  }

  /**
   * Predict state value
   */
  async predict(features: FeatureVector): Promise<number> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    return tf.tidy(() => {
      const input = tf.tensor2d([Array.from(features)]);
      const prediction = this.model!.predict(input) as tf.Tensor;
      return prediction.dataSync()[0];
    });
  }

  /**
   * Predict batch of state values
   */
  async predictBatch(features: FeatureVector[]): Promise<number[]> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    return tf.tidy(() => {
      const input = tf.tensor2d(features.map(f => Array.from(f)));
      const predictions = this.model!.predict(input) as tf.Tensor;
      return Array.from(predictions.dataSync());
    });
  }

  /**
   * Train the value network
   */
  async train(states: FeatureVector[], targets: number[]): Promise<NetworkTrainingMetrics> {
    if (!this.model || !this.optimizer) {
      throw new Error('Model or optimizer not initialized');
    }

    const startTime = Date.now();
    
    return tf.tidy(() => {
      const statesTensor = tf.tensor2d(states.map(s => Array.from(s)));
      const targetsTensor = tf.tensor1d(targets);

      // Calculate loss and gradients
      const lossFn = () => {
        const predictions = this.model!.predict(statesTensor) as tf.Tensor;
        return tf.losses.meanSquaredError(targetsTensor, predictions);
      };

      const { value: loss, grads } = tf.variableGrads(lossFn);
      
      // Apply gradients
      this.optimizer!.applyGradients(grads);
      
      const metrics: NetworkTrainingMetrics = {
        loss: loss.dataSync()[0],
        gradientNorm: this.calculateGradientNorm(Object.values(grads)),
        learningRate: this.config.learning_rate,
        epoch: this.trainingMetrics.length + 1,
        timestamp: Date.now()
      };
      
      this.trainingMetrics.push(metrics);
      this.logger.info(`Value network training completed in ${Date.now() - startTime}ms, loss: ${metrics.loss.toFixed(6)}`);
      
      return metrics;
    });
  }

  /**
   * Calculate gradient norm
   */
  private calculateGradientNorm(grads: tf.Tensor[]): number {
    let totalNorm = 0;
    grads.forEach(grad => {
      const norm = tf.norm(grad).dataSync()[0];
      totalNorm += norm * norm;
    });
    return Math.sqrt(totalNorm);
  }

  /**
   * Save model
   */
  async saveModel(path: string): Promise<void> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }
    await this.model.save(`file://${path}`);
    this.logger.info(`Value network saved to ${path}`);
  }

  /**
   * Load model
   */
  async loadModel(path: string): Promise<void> {
    this.model = await tf.loadLayersModel(`file://${path}`);
    this.logger.info(`Value network loaded from ${path}`);
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
    }
    if (this.optimizer) {
      this.optimizer.dispose();
    }
    this.logger.info('Value network disposed');
  }
}

/**
 * Factory functions to create default network configurations
 */
export function createDefaultPolicyConfig(): PolicyNetworkConfig {
  return {
    input_dim: FEATURE_DIMENSIONS,
    hidden_layers: [512, 256, 128],
    activation: 'relu',
    dropout_rate: 0.3,
    batch_normalization: true,
    learning_rate: 0.0003,
    optimizer: 'adam',
    action_space_size: 3,
    continuous_actions: true,
    action_bounds: [
      { min: -1, max: 1 }, // position_size
      { min: 0, max: 1 },  // confidence
      { min: 1, max: 1440 }, // hold_duration
      { min: 0, max: 0.1 }, // stop_loss
      { min: 0, max: 0.2 }  // take_profit
    ]
  };
}

export function createDefaultValueConfig(): ValueNetworkConfig {
  return {
    input_dim: FEATURE_DIMENSIONS,
    hidden_layers: [512, 256, 128],
    activation: 'relu',
    dropout_rate: 0.3,
    batch_normalization: true,
    learning_rate: 0.001,
    optimizer: 'adam',
    output_activation: 'linear',
    dueling_architecture: false
  };
}

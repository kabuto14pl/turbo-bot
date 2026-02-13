/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🏢 ENTERPRISE NEURAL NETWORK MANAGER SINGLETON
 * Thread-safe singleton pattern for managing all neural network instances
 * Ensures single point of control for TensorFlow.js resources and lifecycle
 */

import * as tf from '@tensorflow/tfjs';
import { 
  PolicyNetworkConfig, 
  ValueNetworkConfig, 
  DeepRLAction, 
  FeatureVector,
  ActionVector,
  MLModel,
  FEATURE_DIMENSIONS,
  ACTION_DIMENSIONS 
} from './types';
import { Logger } from '../../../core/utils/logger';
import { EnterpriseTensorFlowManager } from './enterprise_tensorflow_manager';

interface NetworkTrainingMetrics {
  loss: number;
  accuracy?: number;
  gradientNorm: number;
  learningRate: number;
  epoch: number;
  timestamp: number;
}

interface NetworkHealth {
  isInitialized: boolean;
  lastHealthCheck: number;
  memoryUsage: number;
  errorCount: number;
  status: 'healthy' | 'degraded' | 'failed';
}

/**
 * Enterprise-grade Singleton NeuralNetworkManager
 * Manages all neural network instances with proper resource management
 */
export class EnterpriseNeuralNetworkManager {
  private static instance: EnterpriseNeuralNetworkManager;
  private static isInitializing: boolean = false;
  private static initializationPromise: Promise<EnterpriseNeuralNetworkManager> | null = null;

  private readonly logger: Logger;
  private readonly instanceId: string;
  private readonly creationTimestamp: number;
  private readonly tensorFlowManager: EnterpriseTensorFlowManager;

  // Core neural networks
  private policyNetwork?: MLModel;
  private valueNetwork?: MLModel;
  private targetPolicyNetwork?: MLModel;
  private targetValueNetwork?: MLModel;

  // Training components
  private policyOptimizer?: tf.Optimizer;
  private valueOptimizer?: tf.Optimizer;
  private isInitialized: boolean = false;
  private algorithmType?: string;

  // Enterprise features
  private health: NetworkHealth;
  private disposalCallbacks: (() => void)[] = [];
  private retryAttempts: number = 0;
  private maxRetryAttempts: number = 3;

  /**
   * Private constructor enforces singleton pattern
   */
  private constructor() {
    this.logger = new Logger();
    this.instanceId = `nnm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.creationTimestamp = Date.now();
    this.tensorFlowManager = EnterpriseTensorFlowManager.getInstance();
    
    this.health = {
      isInitialized: false,
      lastHealthCheck: Date.now(),
      memoryUsage: 0,
      errorCount: 0,
      status: 'healthy'
    };

    this.logger.info(`🏢 Enterprise NeuralNetworkManager created: ${this.instanceId}`);
    
    // Setup graceful shutdown handlers
    this.setupShutdownHandlers();
  }

  /**
   * Thread-safe singleton instance getter with lazy initialization
   */
  public static async getInstance(): Promise<EnterpriseNeuralNetworkManager> {
    if (EnterpriseNeuralNetworkManager.instance) {
      return EnterpriseNeuralNetworkManager.instance;
    }

    if (EnterpriseNeuralNetworkManager.isInitializing) {
      if (EnterpriseNeuralNetworkManager.initializationPromise) {
        return EnterpriseNeuralNetworkManager.initializationPromise;
      }
    }

    EnterpriseNeuralNetworkManager.isInitializing = true;
    EnterpriseNeuralNetworkManager.initializationPromise = new Promise((resolve, reject) => {
      try {
        const instance = new EnterpriseNeuralNetworkManager();
        EnterpriseNeuralNetworkManager.instance = instance;
        EnterpriseNeuralNetworkManager.isInitializing = false;
        resolve(instance);
      } catch (error) {
        EnterpriseNeuralNetworkManager.isInitializing = false;
        EnterpriseNeuralNetworkManager.initializationPromise = null;
        reject(error);
      }
    });

    return EnterpriseNeuralNetworkManager.initializationPromise;
  }

  /**
   * Initialize neural networks with enterprise-grade error handling
   */
  public async initializeNetworks(
    policyConfig: PolicyNetworkConfig,
    valueConfig: ValueNetworkConfig,
    algorithmType?: string
  ): Promise<void> {
    const startTime = Date.now();
    this.logger.info(`🚀 Initializing Enterprise Neural Networks (Algorithm: ${algorithmType})`);
    this.logger.info(`🔍 Instance ID: ${this.instanceId}`);

    try {
      // 0. Initialize TensorFlow Backend for maximum performance
      await this.initializeTensorFlowBackend();
      
      this.algorithmType = algorithmType;

      // 1. Initialize Policy Network (Actor)
      await this.retryOperation(
        () => this.initializePolicyNetwork(policyConfig),
        'Policy Network Initialization'
      );
      
      // 2. Initialize Value Network (Critic)
      await this.retryOperation(
        () => this.initializeValueNetwork(valueConfig),
        'Value Network Initialization'
      );
      
      // 3. Initialize target networks ONLY for algorithms that require them
      if (algorithmType === 'SAC' || algorithmType === 'DDPG') {
        this.logger.info(`🎯 Target networks required for ${algorithmType}`);
        await this.retryOperation(
          () => this.initializeTargetNetworks(),
          'Target Networks Initialization'
        );
      } else {
        this.logger.info(`✅ Skipping target networks for ${algorithmType || 'PPO'} (not required)`);
      }
      
      // 4. Initialize optimizers
      this.initializeOptimizers(policyConfig, valueConfig);

      this.isInitialized = true;
      this.health.isInitialized = true;
      this.health.status = 'healthy';
      
      const duration = Date.now() - startTime;
      this.logger.info(`✅ Enterprise Neural Networks initialized successfully in ${duration}ms`);
      
      // Log network summaries
      this.logNetworkInfo();
      
    } catch (error) {
      this.health.status = 'failed';
      this.health.errorCount++;
      this.logger.error('❌ Failed to initialize Enterprise Neural Networks:', error);
      throw new Error(`Neural network initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Initialize TensorFlow Backend for maximum performance
   */
  private async initializeTensorFlowBackend(): Promise<void> {
    try {
      await this.tensorFlowManager.initializeBackend({
        enableNodeBackend: true,
        numThreads: 4, // Optimal for most systems
        enableCpuFallback: true,
        memoryGrowth: true,
        debugMode: false,
        enableProfiling: true,
        optimizeMemory: true,
        enableGPU: false
      });

      // Log performance metrics
      const metrics = this.tensorFlowManager.getPerformanceMetrics();
      this.logger.info(`🚀 TensorFlow Backend: ${metrics.backendName}`);
      this.logger.info(`💾 Memory: ${metrics.memoryUsage.numTensors} tensors, ${(metrics.memoryUsage.numBytes / 1024 / 1024).toFixed(2)} MB`);
      
      if (metrics.benchmarkResults) {
        this.logger.info(`⚡ Performance: Inference ${metrics.benchmarkResults.inferenceLatencyMs}ms`);
      }
      
    } catch (error) {
      this.logger.warn('⚠️  TensorFlow backend initialization failed, continuing with default:', error);
    }
  }

  /**
   * Enterprise-grade retry mechanism with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    for (let attempt = 1; attempt <= this.maxRetryAttempts; attempt++) {
      try {
        this.logger.info(`🔄 ${operationName} - Attempt ${attempt}/${this.maxRetryAttempts}`);
        const result = await operation();
        if (attempt > 1) {
          this.logger.info(`✅ ${operationName} succeeded on retry ${attempt}`);
        }
        return result;
      } catch (error) {
        this.logger.warn(`⚠️  ${operationName} failed on attempt ${attempt}: ${error instanceof Error ? error.message : String(error)}`);
        
        if (attempt === this.maxRetryAttempts) {
          throw error;
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        this.logger.info(`⏳ Retrying ${operationName} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error(`${operationName} failed after ${this.maxRetryAttempts} attempts`);
  }

  /**
   * Create Policy Network (Actor) with comprehensive error handling
   */
  private async initializePolicyNetwork(config: PolicyNetworkConfig): Promise<void> {
    this.logger.info('🎭 Creating Policy Network (Actor)...');

    try {
      const inputs = tf.input({ shape: [FEATURE_DIMENSIONS], name: 'policy_state_input' });
      
      // Input normalization layer
      let x = tf.layers.batchNormalization({ 
        name: 'policy_input_norm',
        center: true,
        scale: true
      }).apply(inputs) as tf.SymbolicTensor;
      
      // Hidden layers with residual connections
      for (let i = 0; i < config.hidden_layers.length; i++) {
        const units = config.hidden_layers[i];
        
        // Dense layer with proper initialization + L2 regularization
        const dense = tf.layers.dense({
          units: units,
          activation: config.activation as any,
          kernelInitializer: 'glorotUniform',
          biasInitializer: 'zeros',
          kernelRegularizer: tf.regularizers.l2({ l2: config.l2_regularization || 0.01 }),  // 🚀 FAZA 1.1: L2 weight decay
          name: `policy_dense_${i}`
        }).apply(x) as tf.SymbolicTensor;
        
        // Dropout for regularization
        const dropout = tf.layers.dropout({ 
          rate: config.dropout_rate, 
          name: `policy_dropout_${i}` 
        }).apply(dense) as tf.SymbolicTensor;
        
        // Batch normalization
        const batchNorm = tf.layers.batchNormalization({
          name: `policy_batch_norm_${i}`,
          center: true,
          scale: true
        }).apply(dropout) as tf.SymbolicTensor;
        
        // Residual connection (if dimensions match)
        if (i > 0 && config.hidden_layers[i] === config.hidden_layers[i-1]) {
          x = tf.layers.add({ 
            name: `policy_residual_${i}` 
          }).apply([x, batchNorm]) as tf.SymbolicTensor;
        } else {
          x = batchNorm;
        }
      }

      // Output layer based on action space type
      let policyOutput: tf.SymbolicTensor;
      
      if (config.continuous_actions) {
        // Continuous action space - single output for each action dimension
        policyOutput = tf.layers.dense({
          units: ACTION_DIMENSIONS,
          activation: 'tanh',  // Output between -1 and 1
          kernelInitializer: 'glorotUniform',
          name: 'continuous_actions_output'
        }).apply(x) as tf.SymbolicTensor;
      } else {
        // Discrete action space
        policyOutput = tf.layers.dense({
          units: config.action_space_size,
          activation: 'softmax',
          kernelInitializer: 'glorotUniform',
          name: 'discrete_actions_output'
        }).apply(x) as tf.SymbolicTensor;
      }

      this.policyNetwork = tf.model({
        inputs: inputs,
        outputs: policyOutput,
        name: 'EnterprisePolicy'
      });

      this.logger.info(`✅ Policy Network created: ${FEATURE_DIMENSIONS} → [${config.hidden_layers.join(', ')}] → ${config.continuous_actions ? ACTION_DIMENSIONS : config.action_space_size}`);
      
    } catch (error) {
      this.logger.error('❌ Policy Network creation failed:', error);
      throw error;
    }
  }

  /**
   * Create Value Network (Critic) with comprehensive error handling
   */
  private async initializeValueNetwork(config: ValueNetworkConfig): Promise<void> {
    this.logger.info('🏆 Creating Value Network (Critic)...');

    try {
      const inputs = tf.input({ shape: [FEATURE_DIMENSIONS], name: 'value_state_input' });
      
      // Input normalization
      let x = tf.layers.batchNormalization({ 
        name: 'value_input_norm',
        center: true,
        scale: true
      }).apply(inputs) as tf.SymbolicTensor;
      
      // Hidden layers with L2 regularization
      for (let i = 0; i < config.hidden_layers.length; i++) {
        const units = config.hidden_layers[i];
        
        x = tf.layers.dense({
          units: units,
          activation: config.activation as any,
          kernelInitializer: 'glorotUniform',
          biasInitializer: 'zeros',
          kernelRegularizer: tf.regularizers.l2({ l2: config.l2_regularization || 0.01 }),  // 🚀 FAZA 1.1: L2 weight decay
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
            name: `value_batch_norm_${i}`,
            center: true,
            scale: true
          }).apply(x) as tf.SymbolicTensor;
        }
      }

      // Dueling architecture (if enabled)
      let valueOutput: tf.SymbolicTensor;
      
      if (config.dueling_architecture) {
        // State value stream
        const stateValue = tf.layers.dense({
          units: 1,
          activation: config.output_activation as any,
          kernelInitializer: 'glorotUniform',
          name: 'state_value'
        }).apply(x) as tf.SymbolicTensor;

        // Advantage stream
        const advantage = tf.layers.dense({
          units: 1,
          activation: config.output_activation as any,
          kernelInitializer: 'glorotUniform',
          name: 'advantage'
        }).apply(x) as tf.SymbolicTensor;

        // Combine: Q(s,a) = V(s) + A(s,a) - mean(A(s,a))
        valueOutput = tf.layers.add({
          name: 'dueling_output'
        }).apply([stateValue, advantage]) as tf.SymbolicTensor;
      } else {
        // Standard value output
        valueOutput = tf.layers.dense({
          units: 1,
          activation: config.output_activation as any,
          kernelInitializer: 'glorotUniform',
          name: 'value_output'
        }).apply(x) as tf.SymbolicTensor;
      }

      this.valueNetwork = tf.model({
        inputs: inputs,
        outputs: valueOutput,
        name: 'EnterpriseValue'
      });

      this.logger.info(`✅ Value Network created: ${FEATURE_DIMENSIONS} → [${config.hidden_layers.join(', ')}] → 1`);
      
    } catch (error) {
      this.logger.error('❌ Value Network creation failed:', error);
      throw error;
    }
  }

  /**
   * Initialize target networks for stable training (SAC/DDPG only)
   */
  private async initializeTargetNetworks(): Promise<void> {
    if (!this.policyNetwork || !this.valueNetwork) {
      throw new Error('Main networks must be initialized before target networks');
    }

    this.logger.info('🎯 Creating target networks for stable training...');

    try {
      // Clone network architectures (not weights)
      const policyConfig = this.createPolicyConfig();
      const valueConfig = this.createValueConfig();
      
      // Create target policy network
      const policyInputs = tf.input({ shape: [FEATURE_DIMENSIONS], name: 'target_policy_input' });
      let px = tf.layers.batchNormalization({ name: 'target_policy_norm' }).apply(policyInputs) as tf.SymbolicTensor;
      
      for (let i = 0; i < policyConfig.hidden_layers.length; i++) {
        px = tf.layers.dense({
          units: policyConfig.hidden_layers[i],
          activation: 'relu',
          name: `target_policy_dense_${i}`
        }).apply(px) as tf.SymbolicTensor;
      }
      
      const policyOut = tf.layers.dense({
        units: policyConfig.continuous_actions ? ACTION_DIMENSIONS : policyConfig.action_space_size,
        activation: policyConfig.continuous_actions ? 'tanh' : 'softmax',
        name: 'target_policy_output'
      }).apply(px) as tf.SymbolicTensor;

      this.targetPolicyNetwork = tf.model({
        inputs: policyInputs,
        outputs: policyOut,
        name: 'TargetPolicy'
      });

      // Create target value network
      const valueInputs = tf.input({ shape: [FEATURE_DIMENSIONS], name: 'target_value_input' });
      let vx = tf.layers.batchNormalization({ name: 'target_value_norm' }).apply(valueInputs) as tf.SymbolicTensor;
      
      for (let i = 0; i < valueConfig.hidden_layers.length; i++) {
        vx = tf.layers.dense({
          units: valueConfig.hidden_layers[i],
          activation: 'relu',
          name: `target_value_dense_${i}`
        }).apply(vx) as tf.SymbolicTensor;
      }
      
      const valueOut = tf.layers.dense({
        units: 1,
        activation: 'linear',
        name: 'target_value_output'
      }).apply(vx) as tf.SymbolicTensor;

      this.targetValueNetwork = tf.model({
        inputs: valueInputs,
        outputs: valueOut,
        name: 'TargetValue'
      });

      this.logger.info('✅ Target networks created successfully');
      
    } catch (error) {
      this.logger.error('❌ Target network creation failed:', error);
      throw error;
    }
  }

  /**
   * Initialize optimizers with enterprise configuration
   */
  private initializeOptimizers(policyConfig: PolicyNetworkConfig, valueConfig: ValueNetworkConfig): void {
    try {
      this.policyOptimizer = tf.train.adam(policyConfig.learning_rate);
      this.valueOptimizer = tf.train.adam(valueConfig.learning_rate);
      
      this.logger.info(`✅ Optimizers initialized - Policy LR: ${policyConfig.learning_rate}, Value LR: ${valueConfig.learning_rate}`);
    } catch (error) {
      this.logger.error('❌ Optimizer initialization failed:', error);
      throw error;
    }
  }

  /**
   * Generate action from feature vector
   */
  public async generateAction(features: FeatureVector): Promise<ActionVector> {
    if (!this.isInitialized || !this.policyNetwork) {
      throw new Error('Networks not initialized for action generation');
    }

    try {
      const input = tf.tensor2d([Array.from(features)]);
      const prediction = this.policyNetwork.predict(input) as tf.Tensor;
      const actionData = await prediction.data();
      
      input.dispose();
      prediction.dispose();
      
      return new Float32Array(actionData);
    } catch (error) {
      this.health.errorCount++;
      this.logger.error('Action generation failed:', error);
      throw error;
    }
  }

  /**
   * PPO Training implementation
   */
  public async trainPPO(
    states: tf.Tensor,
    actions: tf.Tensor,
    oldLogProbs: tf.Tensor,
    advantages: tf.Tensor,
    returns: tf.Tensor,
    clipRatio: number = 0.2,
    entropyCoeff: number = 0.01
  ): Promise<{ policyLoss: number; entropy: number }> {
    if (!this.isInitialized || !this.policyNetwork || !this.policyOptimizer) {
      throw new Error('Networks not initialized for PPO training');
    }

    try {
      let policyLoss = 0;
      let entropy = 0;

      const policyLossInfo = this.policyOptimizer.minimize(() => {
        const newLogProbs = this.policyNetwork!.predict(states) as tf.Tensor;
        const ratio = tf.exp(tf.sub(newLogProbs, oldLogProbs));
        
        const clippedRatio = tf.clipByValue(ratio, 1 - clipRatio, 1 + clipRatio);
        const surrogate1 = tf.mul(ratio, advantages);
        const surrogate2 = tf.mul(clippedRatio, advantages);
        
        const policyLossValue = tf.neg(tf.mean(tf.minimum(surrogate1, surrogate2)));
        const entropyValue = tf.mul(entropyCoeff, tf.mean(tf.neg(tf.mul(newLogProbs, tf.log(tf.add(newLogProbs, 1e-8))))));
        
        return tf.add(policyLossValue, tf.neg(entropyValue)) as tf.Scalar;
      });

      return { policyLoss, entropy };
    } catch (error) {
      this.health.errorCount++;
      this.logger.error('PPO training failed:', error);
      throw error;
    }
  }

  /**
   * SAC Training implementation
   */
  public async trainSAC(
    states: tf.Tensor,
    actions: tf.Tensor,
    nextStates: tf.Tensor,
    rewards: tf.Tensor,
    dones: tf.Tensor,
    alpha: number = 0.2,
    gamma: number = 0.99
  ): Promise<{ policyLoss: number; valueLoss: number; entropy: number }> {
    if (!this.isInitialized || !this.policyNetwork || !this.valueNetwork) {
      throw new Error('Networks not initialized for SAC training');
    }

    try {
      let policyLoss = 0;
      let valueLoss = 0;
      let entropy = 0;

      // Value network training
      if (this.valueOptimizer) {
        const valueLossInfo = this.valueOptimizer.minimize(() => {
          const currentValues = this.valueNetwork!.predict(states) as tf.Tensor;
          const targetValues = tf.add(rewards, tf.mul(gamma, tf.mul(tf.sub(1, dones), this.valueNetwork!.predict(nextStates) as tf.Tensor)));
          return tf.mean(tf.square(tf.sub(currentValues, targetValues))) as tf.Scalar;
        });
      }

      // Policy network training
      if (this.policyOptimizer) {
        const policyLossInfo = this.policyOptimizer.minimize(() => {
          const actions = this.policyNetwork!.predict(states) as tf.Tensor;
          const values = this.valueNetwork!.predict(states) as tf.Tensor;
          const logProbs = tf.log(tf.add(actions, 1e-8));
          const entropyValue = tf.neg(tf.sum(tf.mul(actions, logProbs)));
          return tf.sub(tf.mul(alpha, tf.mean(logProbs)), tf.mean(values)) as tf.Scalar;
        });
      }

      return { policyLoss, valueLoss, entropy };
    } catch (error) {
      this.health.errorCount++;
      this.logger.error('SAC training failed:', error);
      throw error;
    }
  }

  /**
   * Value Network Training
   */
  public async trainValueNetwork(
    states: tf.Tensor,
    targets: tf.Tensor
  ): Promise<{ valueLoss: number }> {
    if (!this.isInitialized || !this.valueNetwork || !this.valueOptimizer) {
      throw new Error('Value network not initialized for training');
    }

    try {
      let valueLoss = 0;

      const lossInfo = this.valueOptimizer.minimize(() => {
        const predictions = this.valueNetwork!.predict(states) as tf.Tensor;
        const loss = tf.mean(tf.square(tf.sub(predictions, targets)));
        return loss as tf.Scalar;
      });

      return { valueLoss };
    } catch (error) {
      this.health.errorCount++;
      this.logger.error('Value network training failed:', error);
      throw error;
    }
  }

  /**
   * Estimate state value
   */
  public async estimateValue(features: FeatureVector): Promise<number> {
    if (!this.isInitialized || !this.valueNetwork) {
      throw new Error('Networks not initialized for value estimation');
    }

    try {
      const input = tf.tensor2d([Array.from(features)]);
      const prediction = this.valueNetwork.predict(input) as tf.Tensor;
      const valueData = await prediction.data();
      
      input.dispose();
      prediction.dispose();
      
      return valueData[0];
    } catch (error) {
      this.health.errorCount++;
      this.logger.error('Value estimation failed:', error);
      throw error;
    }
  }

  /**
   * Health check and monitoring
   */
  public getHealth(): NetworkHealth {
    this.health.lastHealthCheck = Date.now();
    this.health.memoryUsage = tf.memory().numBytes;
    return { ...this.health };
  }

  /**
   * Enterprise logging of network information
   */
  private logNetworkInfo(): void {
    if (this.policyNetwork && this.valueNetwork) {
      this.logger.info('📊 Neural Network Architecture Summary:');
      this.logger.info(`  🎭 Policy Network: ${this.policyNetwork.countParams()} parameters`);
      this.logger.info(`  🏆 Value Network: ${this.valueNetwork.countParams()} parameters`);
      
      if (this.targetPolicyNetwork && this.targetValueNetwork) {
        this.logger.info(`  🎯 Target Policy: ${this.targetPolicyNetwork.countParams()} parameters`);
        this.logger.info(`  🎯 Target Value: ${this.targetValueNetwork.countParams()} parameters`);
      }
      
      const totalParams = this.policyNetwork.countParams() + this.valueNetwork.countParams() +
                         (this.targetPolicyNetwork?.countParams() || 0) + (this.targetValueNetwork?.countParams() || 0);
      
      this.logger.info(`  💯 Total Parameters: ${totalParams.toLocaleString()}`);
      
      // Get TensorFlow performance metrics
      const tfMetrics = this.tensorFlowManager.getPerformanceMetrics();
      this.logger.info(`  🧠 TensorFlow Backend: ${tfMetrics.backendName}`);
      this.logger.info(`  💾 Memory Usage: ${(tfMetrics.memoryUsage.numBytes / 1024 / 1024).toFixed(2)} MB`);
      this.logger.info(`  🧵 Threads: ${tfMetrics.numThreads}`);
      this.logger.info(`  ⚡ Algorithm: ${this.algorithmType || 'Unknown'}`);
      
      if (tfMetrics.benchmarkResults) {
        this.logger.info(`  🚀 Inference Speed: ${tfMetrics.benchmarkResults.inferenceLatencyMs}ms`);
      }
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const gracefulShutdown = () => {
      this.logger.info('🔄 Graceful shutdown initiated...');
      this.dispose();
      process.exit(0);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception:', error);
      this.dispose();
      process.exit(1);
    });
  }

  /**
   * Helper methods for configuration
   */
  private createPolicyConfig(): PolicyNetworkConfig {
    return {
      input_dim: FEATURE_DIMENSIONS,
      hidden_layers: [512, 256, 128],
      activation: 'relu',
      dropout_rate: 0.3,
      batch_normalization: true,
      l2_regularization: 0.0001,
      learning_rate: 0.0003,
      optimizer: 'adam',
      action_space_size: 3,
      continuous_actions: true,
      action_bounds: [
        { min: -1, max: 1 },
        { min: 0, max: 1 },
        { min: 1, max: 1440 },
        { min: 0, max: 0.1 },
        { min: 0, max: 0.2 }
      ]
    };
  }

  private createValueConfig(): ValueNetworkConfig {
    return {
      input_dim: FEATURE_DIMENSIONS,
      hidden_layers: [512, 256, 128],
      activation: 'relu',
      dropout_rate: 0.3,
      batch_normalization: true,
      l2_regularization: 0.0001,
      learning_rate: 0.001,
      optimizer: 'adam',
      output_activation: 'linear',
      dueling_architecture: false
    };
  }

  /**
   * Enterprise-grade disposal with comprehensive cleanup
   */
  public dispose(): void {
    this.logger.info(`🔄 Disposing Enterprise NeuralNetworkManager: ${this.instanceId}`);

    try {
      // Execute disposal callbacks
      this.disposalCallbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          this.logger.warn('Disposal callback failed:', error);
        }
      });

      // Dispose TensorFlow models
      if (this.policyNetwork) {
        this.policyNetwork.dispose();
        this.policyNetwork = undefined;
      }

      if (this.valueNetwork) {
        this.valueNetwork.dispose();
        this.valueNetwork = undefined;
      }

      if (this.targetPolicyNetwork) {
        this.targetPolicyNetwork.dispose();
        this.targetPolicyNetwork = undefined;
      }

      if (this.targetValueNetwork) {
        this.targetValueNetwork.dispose();
        this.targetValueNetwork = undefined;
      }

      // Dispose optimizers
      if (this.policyOptimizer) {
        this.policyOptimizer.dispose();
        this.policyOptimizer = undefined;
      }

      if (this.valueOptimizer) {
        this.valueOptimizer.dispose();
        this.valueOptimizer = undefined;
      }

      this.isInitialized = false;
      this.health.status = 'failed';
      
      this.logger.info('✅ Enterprise NeuralNetworkManager disposed successfully');
      
    } catch (error) {
      this.logger.error('❌ Error during disposal:', error);
    }
  }

  /**
   * Add disposal callback for external cleanup
   */
  public addDisposalCallback(callback: () => void): void {
    this.disposalCallbacks.push(callback);
  }

  /**
   * Reset singleton instance (for testing purposes)
   */
  public static resetInstance(): void {
    if (EnterpriseNeuralNetworkManager.instance) {
      EnterpriseNeuralNetworkManager.instance.dispose();
    }
    EnterpriseNeuralNetworkManager.instance = null as any;
    EnterpriseNeuralNetworkManager.isInitializing = false;
    EnterpriseNeuralNetworkManager.initializationPromise = null;
  }

  // Getters for debugging and monitoring
  public get instanceInfo() {
    return {
      id: this.instanceId,
      created: this.creationTimestamp,
      algorithm: this.algorithmType,
      initialized: this.isInitialized
    };
  }
}

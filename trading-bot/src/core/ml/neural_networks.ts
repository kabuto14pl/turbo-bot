/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * ENTERPRISE DEEP RL NEURAL NETWORKS
 * Advanced neural network architectures with shared management system
 * 
 * Shared component providing neural network capabilities across environments
 * Eliminates duplicate network instantiation and TensorFlow conflicts
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
import { EnterpriseNeuralNetworkManager } from './enterprise_neural_network_manager';

interface NetworkTrainingMetrics {
  loss: number;
  accuracy?: number;
  gradientNorm: number;
  learningRate: number;
  epoch: number;
  timestamp: number;
}

/**
 * 🎭 ENTERPRISE POLICY NETWORK (ACTOR)
 * Uses shared EnterpriseNeuralNetworkManager singleton for consistent state management
 */
export class PolicyNetwork {
  private networkManager?: EnterpriseNeuralNetworkManager;
  private logger: Logger;
  private isInitialized: boolean = false;
  private readonly networkId: string;

  constructor() {
    this.logger = new Logger();
    this.networkId = `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.logger.info(`🎭 Enterprise PolicyNetwork instance created: ${this.networkId}`);
  }

  /**
   * Initialize with shared network manager instance
   */
  async initialize(
    policyConfig?: PolicyNetworkConfig, 
    valueConfig?: ValueNetworkConfig, 
    algorithmType?: string
  ): Promise<void> {
    try {
      this.logger.info(`🚀 Initializing PolicyNetwork ${this.networkId}...`);
      
      // Get shared singleton instance
      this.networkManager = await EnterpriseNeuralNetworkManager.getInstance();
      
      // Only initialize networks once per singleton
      if (!this.networkManager.getHealth().isInitialized) {
        const defaultPolicyConfig = createDefaultPolicyConfig();
        const defaultValueConfig = createDefaultValueConfig();
        
        await this.networkManager.initializeNetworks(
          policyConfig || defaultPolicyConfig, 
          valueConfig || defaultValueConfig,
          algorithmType
        );
      } else {
        this.logger.info('✅ Using already initialized EnterpriseNeuralNetworkManager');
      }

      this.isInitialized = true;
      this.logger.info(`✅ PolicyNetwork ${this.networkId} ready`);
      
    } catch (error) {
      this.logger.error(`❌ PolicyNetwork ${this.networkId} initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Generate action prediction using shared network manager
   */
  async predict(input: tf.Tensor): Promise<tf.Tensor> {
    if (!this.isInitialized || !this.networkManager) {
      throw new Error(`PolicyNetwork ${this.networkId} not initialized`);
    }

    try {
      const data = await input.data();
      const featureVector = new Float32Array(data);
      const actionVector = await this.networkManager.generateAction(featureVector);
      return tf.tensor1d(Array.from(actionVector));
    } catch (error) {
      this.logger.error(`❌ PolicyNetwork ${this.networkId} prediction failed:`, error);
      throw error;
    }
  }

  /**
   * PPO training (delegated to shared network manager)
   */
  async trainPPO(
    states: tf.Tensor,
    actions: tf.Tensor,
    oldLogProbs: tf.Tensor,
    advantages: tf.Tensor,
    returns: tf.Tensor,
    clipRatio?: number,
    entropyCoeff?: number
  ): Promise<{ policyLoss: number; entropy: number }> {
    if (!this.networkManager) {
      throw new Error(`PolicyNetwork ${this.networkId} not initialized`);
    }
    return this.networkManager.trainPPO(states, actions, oldLogProbs, advantages, returns, clipRatio, entropyCoeff);
  }

  /**
   * SAC training (delegated to shared network manager)
   */
  async trainSAC(
    states: tf.Tensor,
    actions: tf.Tensor,
    nextStates: tf.Tensor,
    rewards: tf.Tensor,
    dones: tf.Tensor,
    alpha?: number,
    gamma?: number
  ): Promise<{ policyLoss: number; valueLoss: number; entropy: number }> {
    if (!this.networkManager) {
      throw new Error(`PolicyNetwork ${this.networkId} not initialized`);
    }
    return this.networkManager.trainSAC(states, actions, nextStates, rewards, dones, alpha, gamma);
  }

  /**
   * Model persistence
   */
  async saveModel(path: string): Promise<void> {
    this.logger.info(`🔄 Saving policy model to ${path}`);
    // Implementation would delegate to shared network manager
  }

  async loadModel(path: string): Promise<void> {
    this.logger.info(`🔄 Loading policy model from ${path}`);
    // Implementation would delegate to shared network manager
  }

  /**
   * Cleanup - does NOT dispose shared singleton
   */
  dispose(): void {
    this.logger.info(`🔄 Disposing PolicyNetwork ${this.networkId} (keeping shared manager)`);
    this.isInitialized = false;
    this.networkManager = undefined;
  }

  /**
   * Get network health information
   */
  getHealth() {
    return this.networkManager?.getHealth() || {
      isInitialized: false,
      lastHealthCheck: Date.now(),
      memoryUsage: 0,
      errorCount: 0,
      status: 'failed' as const
    };
  }
}

/**
 * 🏆 ENTERPRISE VALUE NETWORK (CRITIC)
 * Uses shared EnterpriseNeuralNetworkManager singleton for consistent state management
 */
export class ValueNetwork {
  private networkManager?: EnterpriseNeuralNetworkManager;
  private logger: Logger;
  private isInitialized: boolean = false;
  private readonly networkId: string;
  
  constructor() {
    this.logger = new Logger();
    this.networkId = `value-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.logger.info(`🏆 Enterprise ValueNetwork instance created: ${this.networkId}`);
  }

  /**
   * Initialize with shared network manager instance
   */
  async initialize(valueConfig?: ValueNetworkConfig, algorithmType?: string): Promise<void> {
    try {
      this.logger.info(`🚀 Initializing ValueNetwork ${this.networkId}...`);
      
      // Get shared singleton instance
      this.networkManager = await EnterpriseNeuralNetworkManager.getInstance();
      
      // Only initialize networks once per singleton
      if (!this.networkManager.getHealth().isInitialized) {
        const defaultPolicyConfig = createDefaultPolicyConfig();
        const defaultValueConfig = createDefaultValueConfig();
        
        await this.networkManager.initializeNetworks(
          defaultPolicyConfig, 
          valueConfig || defaultValueConfig, 
          algorithmType
        );
      } else {
        this.logger.info('✅ Using already initialized EnterpriseNeuralNetworkManager');
      }

      this.isInitialized = true;
      this.logger.info(`✅ ValueNetwork ${this.networkId} ready`);
      
    } catch (error) {
      this.logger.error(`❌ ValueNetwork ${this.networkId} initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Value prediction using shared network manager
   */
  async predict(input: tf.Tensor): Promise<tf.Tensor> {
    if (!this.isInitialized || !this.networkManager) {
      throw new Error(`ValueNetwork ${this.networkId} not initialized`);
    }

    try {
      const data = await input.data();
      const featureVector = new Float32Array(data);
      const value = await this.networkManager.estimateValue(featureVector);
      return tf.tensor1d([value]);
    } catch (error) {
      this.logger.error(`❌ ValueNetwork ${this.networkId} prediction failed:`, error);
      throw error;
    }
  }

  /**
   * Value network training (delegated to shared network manager)
   */
  async fit(states: tf.Tensor, targets: tf.Tensor, options: any): Promise<any> {
    if (!this.networkManager) {
      throw new Error(`ValueNetwork ${this.networkId} not initialized`);
    }
    
    try {
      const results = await this.networkManager.trainValueNetwork(states, targets);
      return {
        history: {
          loss: [results.valueLoss]
        }
      };
    } catch (error) {
      this.logger.error(`❌ ValueNetwork ${this.networkId} training failed:`, error);
      throw error;
    }
  }

  /**
   * Model persistence
   */
  async saveModel(path: string): Promise<void> {
    this.logger.info(`🔄 Saving value model to ${path}`);
    // Implementation would delegate to shared network manager
  }

  async loadModel(path: string): Promise<void> {
    this.logger.info(`🔄 Loading value model from ${path}`);
    // Implementation would delegate to shared network manager
  }

  /**
   * Cleanup - does NOT dispose shared singleton
   */
  dispose(): void {
    this.logger.info(`🔄 Disposing ValueNetwork ${this.networkId} (keeping shared manager)`);
    this.isInitialized = false;
    this.networkManager = undefined;
  }

  /**
   * Get network health information
   */
  getHealth() {
    return this.networkManager?.getHealth() || {
      isInitialized: false,
      lastHealthCheck: Date.now(),
      memoryUsage: 0,
      errorCount: 0,
      status: 'failed' as const
    };
  }
}

// =================== CONFIGURATION EXPORTS ===================

/**
 * Default configuration creators for enterprise neural networks
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
      { min: -1, max: 1 },
      { min: 0, max: 1 },
      { min: 1, max: 1440 },
      { min: 0, max: 0.1 },
      { min: 0, max: 0.2 }
    ]
  };
}

export function createDefaultValueConfig(): ValueNetworkConfig {
  return {
    input_dim: FEATURE_DIMENSIONS,
    hidden_layers: [512, 256, 128],
    activation: 'relu',
    dropout_rate: 0.3,  // 30% dropout as per PLAN
    l2_regularization: 0.01,  // 🚀 FAZA 1.1: L2 weight decay
    batch_normalization: true,
    learning_rate: 0.001,
    optimizer: 'adam',
    output_activation: 'linear',
    dueling_architecture: false
  };
}

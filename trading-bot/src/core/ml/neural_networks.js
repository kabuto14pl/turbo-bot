"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValueNetwork = exports.PolicyNetwork = void 0;
exports.createDefaultPolicyConfig = createDefaultPolicyConfig;
exports.createDefaultValueConfig = createDefaultValueConfig;
const tf = __importStar(require("@tensorflow/tfjs"));
const types_1 = require("./types");
const logger_1 = require("../../../core/utils/logger");
const enterprise_neural_network_manager_1 = require("./enterprise_neural_network_manager");
/**
 * 🎭 ENTERPRISE POLICY NETWORK (ACTOR)
 * Uses shared EnterpriseNeuralNetworkManager singleton for consistent state management
 */
class PolicyNetwork {
    constructor() {
        this.isInitialized = false;
        this.logger = new logger_1.Logger();
        this.networkId = `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.logger.info(`🎭 Enterprise PolicyNetwork instance created: ${this.networkId}`);
    }
    /**
     * Initialize with shared network manager instance
     */
    async initialize(policyConfig, valueConfig, algorithmType) {
        try {
            this.logger.info(`🚀 Initializing PolicyNetwork ${this.networkId}...`);
            // Get shared singleton instance
            this.networkManager = await enterprise_neural_network_manager_1.EnterpriseNeuralNetworkManager.getInstance();
            // Only initialize networks once per singleton
            if (!this.networkManager.getHealth().isInitialized) {
                const defaultPolicyConfig = createDefaultPolicyConfig();
                const defaultValueConfig = createDefaultValueConfig();
                await this.networkManager.initializeNetworks(policyConfig || defaultPolicyConfig, valueConfig || defaultValueConfig, algorithmType);
            }
            else {
                this.logger.info('✅ Using already initialized EnterpriseNeuralNetworkManager');
            }
            this.isInitialized = true;
            this.logger.info(`✅ PolicyNetwork ${this.networkId} ready`);
        }
        catch (error) {
            this.logger.error(`❌ PolicyNetwork ${this.networkId} initialization failed:`, error);
            throw error;
        }
    }
    /**
     * Generate action prediction using shared network manager
     */
    async predict(input) {
        if (!this.isInitialized || !this.networkManager) {
            throw new Error(`PolicyNetwork ${this.networkId} not initialized`);
        }
        try {
            const data = await input.data();
            const featureVector = new Float32Array(data);
            const actionVector = await this.networkManager.generateAction(featureVector);
            return tf.tensor1d(Array.from(actionVector));
        }
        catch (error) {
            this.logger.error(`❌ PolicyNetwork ${this.networkId} prediction failed:`, error);
            throw error;
        }
    }
    /**
     * PPO training (delegated to shared network manager)
     */
    async trainPPO(states, actions, oldLogProbs, advantages, returns, clipRatio, entropyCoeff) {
        if (!this.networkManager) {
            throw new Error(`PolicyNetwork ${this.networkId} not initialized`);
        }
        return this.networkManager.trainPPO(states, actions, oldLogProbs, advantages, returns, clipRatio, entropyCoeff);
    }
    /**
     * SAC training (delegated to shared network manager)
     */
    async trainSAC(states, actions, nextStates, rewards, dones, alpha, gamma) {
        if (!this.networkManager) {
            throw new Error(`PolicyNetwork ${this.networkId} not initialized`);
        }
        return this.networkManager.trainSAC(states, actions, nextStates, rewards, dones, alpha, gamma);
    }
    /**
     * Model persistence
     */
    async saveModel(path) {
        this.logger.info(`🔄 Saving policy model to ${path}`);
        // Implementation would delegate to shared network manager
    }
    async loadModel(path) {
        this.logger.info(`🔄 Loading policy model from ${path}`);
        // Implementation would delegate to shared network manager
    }
    /**
     * Cleanup - does NOT dispose shared singleton
     */
    dispose() {
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
            status: 'failed'
        };
    }
}
exports.PolicyNetwork = PolicyNetwork;
/**
 * 🏆 ENTERPRISE VALUE NETWORK (CRITIC)
 * Uses shared EnterpriseNeuralNetworkManager singleton for consistent state management
 */
class ValueNetwork {
    constructor() {
        this.isInitialized = false;
        this.logger = new logger_1.Logger();
        this.networkId = `value-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.logger.info(`🏆 Enterprise ValueNetwork instance created: ${this.networkId}`);
    }
    /**
     * Initialize with shared network manager instance
     */
    async initialize(valueConfig, algorithmType) {
        try {
            this.logger.info(`🚀 Initializing ValueNetwork ${this.networkId}...`);
            // Get shared singleton instance
            this.networkManager = await enterprise_neural_network_manager_1.EnterpriseNeuralNetworkManager.getInstance();
            // Only initialize networks once per singleton
            if (!this.networkManager.getHealth().isInitialized) {
                const defaultPolicyConfig = createDefaultPolicyConfig();
                const defaultValueConfig = createDefaultValueConfig();
                await this.networkManager.initializeNetworks(defaultPolicyConfig, valueConfig || defaultValueConfig, algorithmType);
            }
            else {
                this.logger.info('✅ Using already initialized EnterpriseNeuralNetworkManager');
            }
            this.isInitialized = true;
            this.logger.info(`✅ ValueNetwork ${this.networkId} ready`);
        }
        catch (error) {
            this.logger.error(`❌ ValueNetwork ${this.networkId} initialization failed:`, error);
            throw error;
        }
    }
    /**
     * Value prediction using shared network manager
     */
    async predict(input) {
        if (!this.isInitialized || !this.networkManager) {
            throw new Error(`ValueNetwork ${this.networkId} not initialized`);
        }
        try {
            const data = await input.data();
            const featureVector = new Float32Array(data);
            const value = await this.networkManager.estimateValue(featureVector);
            return tf.tensor1d([value]);
        }
        catch (error) {
            this.logger.error(`❌ ValueNetwork ${this.networkId} prediction failed:`, error);
            throw error;
        }
    }
    /**
     * Value network training (delegated to shared network manager)
     */
    async fit(states, targets, options) {
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
        }
        catch (error) {
            this.logger.error(`❌ ValueNetwork ${this.networkId} training failed:`, error);
            throw error;
        }
    }
    /**
     * Model persistence
     */
    async saveModel(path) {
        this.logger.info(`🔄 Saving value model to ${path}`);
        // Implementation would delegate to shared network manager
    }
    async loadModel(path) {
        this.logger.info(`🔄 Loading value model from ${path}`);
        // Implementation would delegate to shared network manager
    }
    /**
     * Cleanup - does NOT dispose shared singleton
     */
    dispose() {
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
            status: 'failed'
        };
    }
}
exports.ValueNetwork = ValueNetwork;
// =================== CONFIGURATION EXPORTS ===================
/**
 * Default configuration creators for enterprise neural networks
 */
function createDefaultPolicyConfig() {
    return {
        input_dim: types_1.FEATURE_DIMENSIONS,
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
function createDefaultValueConfig() {
    return {
        input_dim: types_1.FEATURE_DIMENSIONS,
        hidden_layers: [512, 256, 128],
        activation: 'relu',
        dropout_rate: 0.3, // 30% dropout as per PLAN
        l2_regularization: 0.01, // 🚀 FAZA 1.1: L2 weight decay
        batch_normalization: true,
        learning_rate: 0.001,
        optimizer: 'adam',
        output_activation: 'linear',
        dueling_architecture: false
    };
}

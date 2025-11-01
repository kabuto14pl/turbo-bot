"use strict";
/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🏢 ENTERPRISE NEURAL NETWORK MANAGER SINGLETON
 * Thread-safe singleton pattern for managing all neural network instances
 * Ensures single point of control for TensorFlow.js resources and lifecycle
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
exports.EnterpriseNeuralNetworkManager = void 0;
const tf = __importStar(require("@tensorflow/tfjs"));
const types_1 = require("./types");
const logger_1 = require("../../../core/utils/logger");
const enterprise_tensorflow_manager_1 = require("./enterprise_tensorflow_manager");
/**
 * Enterprise-grade Singleton NeuralNetworkManager
 * Manages all neural network instances with proper resource management
 */
class EnterpriseNeuralNetworkManager {
    /**
     * Private constructor enforces singleton pattern
     */
    constructor() {
        this.isInitialized = false;
        this.disposalCallbacks = [];
        this.retryAttempts = 0;
        this.maxRetryAttempts = 3;
        this.logger = new logger_1.Logger();
        this.instanceId = `nnm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.creationTimestamp = Date.now();
        this.tensorFlowManager = enterprise_tensorflow_manager_1.EnterpriseTensorFlowManager.getInstance();
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
    static async getInstance() {
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
            }
            catch (error) {
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
    async initializeNetworks(policyConfig, valueConfig, algorithmType) {
        const startTime = Date.now();
        this.logger.info(`🚀 Initializing Enterprise Neural Networks (Algorithm: ${algorithmType})`);
        this.logger.info(`🔍 Instance ID: ${this.instanceId}`);
        try {
            // 0. Initialize TensorFlow Backend for maximum performance
            await this.initializeTensorFlowBackend();
            this.algorithmType = algorithmType;
            // 1. Initialize Policy Network (Actor)
            await this.retryOperation(() => this.initializePolicyNetwork(policyConfig), 'Policy Network Initialization');
            // 2. Initialize Value Network (Critic)
            await this.retryOperation(() => this.initializeValueNetwork(valueConfig), 'Value Network Initialization');
            // 3. Initialize target networks ONLY for algorithms that require them
            if (algorithmType === 'SAC' || algorithmType === 'DDPG') {
                this.logger.info(`🎯 Target networks required for ${algorithmType}`);
                await this.retryOperation(() => this.initializeTargetNetworks(), 'Target Networks Initialization');
            }
            else {
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
        }
        catch (error) {
            this.health.status = 'failed';
            this.health.errorCount++;
            this.logger.error('❌ Failed to initialize Enterprise Neural Networks:', error);
            throw new Error(`Neural network initialization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Initialize TensorFlow Backend for maximum performance
     */
    async initializeTensorFlowBackend() {
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
        }
        catch (error) {
            this.logger.warn('⚠️  TensorFlow backend initialization failed, continuing with default:', error);
        }
    }
    /**
     * Enterprise-grade retry mechanism with exponential backoff
     */
    async retryOperation(operation, operationName) {
        for (let attempt = 1; attempt <= this.maxRetryAttempts; attempt++) {
            try {
                this.logger.info(`🔄 ${operationName} - Attempt ${attempt}/${this.maxRetryAttempts}`);
                const result = await operation();
                if (attempt > 1) {
                    this.logger.info(`✅ ${operationName} succeeded on retry ${attempt}`);
                }
                return result;
            }
            catch (error) {
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
    async initializePolicyNetwork(config) {
        this.logger.info('🎭 Creating Policy Network (Actor)...');
        try {
            const inputs = tf.input({ shape: [types_1.FEATURE_DIMENSIONS], name: 'policy_state_input' });
            // Input normalization layer
            let x = tf.layers.batchNormalization({
                name: 'policy_input_norm',
                center: true,
                scale: true
            }).apply(inputs);
            // Hidden layers with residual connections
            for (let i = 0; i < config.hidden_layers.length; i++) {
                const units = config.hidden_layers[i];
                // Dense layer with proper initialization
                const dense = tf.layers.dense({
                    units: units,
                    activation: config.activation,
                    kernelInitializer: 'glorotUniform',
                    biasInitializer: 'zeros',
                    name: `policy_dense_${i}`
                }).apply(x);
                // Dropout for regularization
                const dropout = tf.layers.dropout({
                    rate: config.dropout_rate,
                    name: `policy_dropout_${i}`
                }).apply(dense);
                // Batch normalization
                const batchNorm = tf.layers.batchNormalization({
                    name: `policy_batch_norm_${i}`,
                    center: true,
                    scale: true
                }).apply(dropout);
                // Residual connection (if dimensions match)
                if (i > 0 && config.hidden_layers[i] === config.hidden_layers[i - 1]) {
                    x = tf.layers.add({
                        name: `policy_residual_${i}`
                    }).apply([x, batchNorm]);
                }
                else {
                    x = batchNorm;
                }
            }
            // Output layer based on action space type
            let policyOutput;
            if (config.continuous_actions) {
                // Continuous action space - single output for each action dimension
                policyOutput = tf.layers.dense({
                    units: types_1.ACTION_DIMENSIONS,
                    activation: 'tanh', // Output between -1 and 1
                    kernelInitializer: 'glorotUniform',
                    name: 'continuous_actions_output'
                }).apply(x);
            }
            else {
                // Discrete action space
                policyOutput = tf.layers.dense({
                    units: config.action_space_size,
                    activation: 'softmax',
                    kernelInitializer: 'glorotUniform',
                    name: 'discrete_actions_output'
                }).apply(x);
            }
            this.policyNetwork = tf.model({
                inputs: inputs,
                outputs: policyOutput,
                name: 'EnterprisePolicy'
            });
            this.logger.info(`✅ Policy Network created: ${types_1.FEATURE_DIMENSIONS} → [${config.hidden_layers.join(', ')}] → ${config.continuous_actions ? types_1.ACTION_DIMENSIONS : config.action_space_size}`);
        }
        catch (error) {
            this.logger.error('❌ Policy Network creation failed:', error);
            throw error;
        }
    }
    /**
     * Create Value Network (Critic) with comprehensive error handling
     */
    async initializeValueNetwork(config) {
        this.logger.info('🏆 Creating Value Network (Critic)...');
        try {
            const inputs = tf.input({ shape: [types_1.FEATURE_DIMENSIONS], name: 'value_state_input' });
            // Input normalization
            let x = tf.layers.batchNormalization({
                name: 'value_input_norm',
                center: true,
                scale: true
            }).apply(inputs);
            // Hidden layers
            for (let i = 0; i < config.hidden_layers.length; i++) {
                const units = config.hidden_layers[i];
                x = tf.layers.dense({
                    units: units,
                    activation: config.activation,
                    kernelInitializer: 'glorotUniform',
                    biasInitializer: 'zeros',
                    name: `value_dense_${i}`
                }).apply(x);
                if (config.dropout_rate > 0) {
                    x = tf.layers.dropout({
                        rate: config.dropout_rate,
                        name: `value_dropout_${i}`
                    }).apply(x);
                }
                if (config.batch_normalization) {
                    x = tf.layers.batchNormalization({
                        name: `value_batch_norm_${i}`,
                        center: true,
                        scale: true
                    }).apply(x);
                }
            }
            // Dueling architecture (if enabled)
            let valueOutput;
            if (config.dueling_architecture) {
                // State value stream
                const stateValue = tf.layers.dense({
                    units: 1,
                    activation: config.output_activation,
                    kernelInitializer: 'glorotUniform',
                    name: 'state_value'
                }).apply(x);
                // Advantage stream
                const advantage = tf.layers.dense({
                    units: 1,
                    activation: config.output_activation,
                    kernelInitializer: 'glorotUniform',
                    name: 'advantage'
                }).apply(x);
                // Combine: Q(s,a) = V(s) + A(s,a) - mean(A(s,a))
                valueOutput = tf.layers.add({
                    name: 'dueling_output'
                }).apply([stateValue, advantage]);
            }
            else {
                // Standard value output
                valueOutput = tf.layers.dense({
                    units: 1,
                    activation: config.output_activation,
                    kernelInitializer: 'glorotUniform',
                    name: 'value_output'
                }).apply(x);
            }
            this.valueNetwork = tf.model({
                inputs: inputs,
                outputs: valueOutput,
                name: 'EnterpriseValue'
            });
            this.logger.info(`✅ Value Network created: ${types_1.FEATURE_DIMENSIONS} → [${config.hidden_layers.join(', ')}] → 1`);
        }
        catch (error) {
            this.logger.error('❌ Value Network creation failed:', error);
            throw error;
        }
    }
    /**
     * Initialize target networks for stable training (SAC/DDPG only)
     */
    async initializeTargetNetworks() {
        if (!this.policyNetwork || !this.valueNetwork) {
            throw new Error('Main networks must be initialized before target networks');
        }
        this.logger.info('🎯 Creating target networks for stable training...');
        try {
            // Clone network architectures (not weights)
            const policyConfig = this.createPolicyConfig();
            const valueConfig = this.createValueConfig();
            // Create target policy network
            const policyInputs = tf.input({ shape: [types_1.FEATURE_DIMENSIONS], name: 'target_policy_input' });
            let px = tf.layers.batchNormalization({ name: 'target_policy_norm' }).apply(policyInputs);
            for (let i = 0; i < policyConfig.hidden_layers.length; i++) {
                px = tf.layers.dense({
                    units: policyConfig.hidden_layers[i],
                    activation: 'relu',
                    name: `target_policy_dense_${i}`
                }).apply(px);
            }
            const policyOut = tf.layers.dense({
                units: policyConfig.continuous_actions ? types_1.ACTION_DIMENSIONS : policyConfig.action_space_size,
                activation: policyConfig.continuous_actions ? 'tanh' : 'softmax',
                name: 'target_policy_output'
            }).apply(px);
            this.targetPolicyNetwork = tf.model({
                inputs: policyInputs,
                outputs: policyOut,
                name: 'TargetPolicy'
            });
            // Create target value network
            const valueInputs = tf.input({ shape: [types_1.FEATURE_DIMENSIONS], name: 'target_value_input' });
            let vx = tf.layers.batchNormalization({ name: 'target_value_norm' }).apply(valueInputs);
            for (let i = 0; i < valueConfig.hidden_layers.length; i++) {
                vx = tf.layers.dense({
                    units: valueConfig.hidden_layers[i],
                    activation: 'relu',
                    name: `target_value_dense_${i}`
                }).apply(vx);
            }
            const valueOut = tf.layers.dense({
                units: 1,
                activation: 'linear',
                name: 'target_value_output'
            }).apply(vx);
            this.targetValueNetwork = tf.model({
                inputs: valueInputs,
                outputs: valueOut,
                name: 'TargetValue'
            });
            this.logger.info('✅ Target networks created successfully');
        }
        catch (error) {
            this.logger.error('❌ Target network creation failed:', error);
            throw error;
        }
    }
    /**
     * Initialize optimizers with enterprise configuration
     */
    initializeOptimizers(policyConfig, valueConfig) {
        try {
            this.policyOptimizer = tf.train.adam(policyConfig.learning_rate);
            this.valueOptimizer = tf.train.adam(valueConfig.learning_rate);
            this.logger.info(`✅ Optimizers initialized - Policy LR: ${policyConfig.learning_rate}, Value LR: ${valueConfig.learning_rate}`);
        }
        catch (error) {
            this.logger.error('❌ Optimizer initialization failed:', error);
            throw error;
        }
    }
    /**
     * Generate action from feature vector
     */
    async generateAction(features) {
        if (!this.isInitialized || !this.policyNetwork) {
            throw new Error('Networks not initialized for action generation');
        }
        try {
            const input = tf.tensor2d([Array.from(features)]);
            const prediction = this.policyNetwork.predict(input);
            const actionData = await prediction.data();
            input.dispose();
            prediction.dispose();
            return new Float32Array(actionData);
        }
        catch (error) {
            this.health.errorCount++;
            this.logger.error('Action generation failed:', error);
            throw error;
        }
    }
    /**
     * PPO Training implementation
     */
    async trainPPO(states, actions, oldLogProbs, advantages, returns, clipRatio = 0.2, entropyCoeff = 0.01) {
        if (!this.isInitialized || !this.policyNetwork || !this.policyOptimizer) {
            throw new Error('Networks not initialized for PPO training');
        }
        try {
            let policyLoss = 0;
            let entropy = 0;
            const policyLossInfo = this.policyOptimizer.minimize(() => {
                const newLogProbs = this.policyNetwork.predict(states);
                const ratio = tf.exp(tf.sub(newLogProbs, oldLogProbs));
                const clippedRatio = tf.clipByValue(ratio, 1 - clipRatio, 1 + clipRatio);
                const surrogate1 = tf.mul(ratio, advantages);
                const surrogate2 = tf.mul(clippedRatio, advantages);
                const policyLossValue = tf.neg(tf.mean(tf.minimum(surrogate1, surrogate2)));
                const entropyValue = tf.mul(entropyCoeff, tf.mean(tf.neg(tf.mul(newLogProbs, tf.log(tf.add(newLogProbs, 1e-8))))));
                return tf.add(policyLossValue, tf.neg(entropyValue));
            });
            return { policyLoss, entropy };
        }
        catch (error) {
            this.health.errorCount++;
            this.logger.error('PPO training failed:', error);
            throw error;
        }
    }
    /**
     * SAC Training implementation
     */
    async trainSAC(states, actions, nextStates, rewards, dones, alpha = 0.2, gamma = 0.99) {
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
                    const currentValues = this.valueNetwork.predict(states);
                    const targetValues = tf.add(rewards, tf.mul(gamma, tf.mul(tf.sub(1, dones), this.valueNetwork.predict(nextStates))));
                    return tf.mean(tf.square(tf.sub(currentValues, targetValues)));
                });
            }
            // Policy network training
            if (this.policyOptimizer) {
                const policyLossInfo = this.policyOptimizer.minimize(() => {
                    const actions = this.policyNetwork.predict(states);
                    const values = this.valueNetwork.predict(states);
                    const logProbs = tf.log(tf.add(actions, 1e-8));
                    const entropyValue = tf.neg(tf.sum(tf.mul(actions, logProbs)));
                    return tf.sub(tf.mul(alpha, tf.mean(logProbs)), tf.mean(values));
                });
            }
            return { policyLoss, valueLoss, entropy };
        }
        catch (error) {
            this.health.errorCount++;
            this.logger.error('SAC training failed:', error);
            throw error;
        }
    }
    /**
     * Value Network Training
     */
    async trainValueNetwork(states, targets) {
        if (!this.isInitialized || !this.valueNetwork || !this.valueOptimizer) {
            throw new Error('Value network not initialized for training');
        }
        try {
            let valueLoss = 0;
            const lossInfo = this.valueOptimizer.minimize(() => {
                const predictions = this.valueNetwork.predict(states);
                const loss = tf.mean(tf.square(tf.sub(predictions, targets)));
                return loss;
            });
            return { valueLoss };
        }
        catch (error) {
            this.health.errorCount++;
            this.logger.error('Value network training failed:', error);
            throw error;
        }
    }
    /**
     * Estimate state value
     */
    async estimateValue(features) {
        if (!this.isInitialized || !this.valueNetwork) {
            throw new Error('Networks not initialized for value estimation');
        }
        try {
            const input = tf.tensor2d([Array.from(features)]);
            const prediction = this.valueNetwork.predict(input);
            const valueData = await prediction.data();
            input.dispose();
            prediction.dispose();
            return valueData[0];
        }
        catch (error) {
            this.health.errorCount++;
            this.logger.error('Value estimation failed:', error);
            throw error;
        }
    }
    /**
     * Health check and monitoring
     */
    getHealth() {
        this.health.lastHealthCheck = Date.now();
        this.health.memoryUsage = tf.memory().numBytes;
        return { ...this.health };
    }
    /**
     * Enterprise logging of network information
     */
    logNetworkInfo() {
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
    setupShutdownHandlers() {
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
    createPolicyConfig() {
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
    createValueConfig() {
        return {
            input_dim: types_1.FEATURE_DIMENSIONS,
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
    /**
     * Enterprise-grade disposal with comprehensive cleanup
     */
    dispose() {
        this.logger.info(`🔄 Disposing Enterprise NeuralNetworkManager: ${this.instanceId}`);
        try {
            // Execute disposal callbacks
            this.disposalCallbacks.forEach(callback => {
                try {
                    callback();
                }
                catch (error) {
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
        }
        catch (error) {
            this.logger.error('❌ Error during disposal:', error);
        }
    }
    /**
     * Add disposal callback for external cleanup
     */
    addDisposalCallback(callback) {
        this.disposalCallbacks.push(callback);
    }
    /**
     * Reset singleton instance (for testing purposes)
     */
    static resetInstance() {
        if (EnterpriseNeuralNetworkManager.instance) {
            EnterpriseNeuralNetworkManager.instance.dispose();
        }
        EnterpriseNeuralNetworkManager.instance = null;
        EnterpriseNeuralNetworkManager.isInitializing = false;
        EnterpriseNeuralNetworkManager.initializationPromise = null;
    }
    // Getters for debugging and monitoring
    get instanceInfo() {
        return {
            id: this.instanceId,
            created: this.creationTimestamp,
            algorithm: this.algorithmType,
            initialized: this.isInitialized
        };
    }
}
exports.EnterpriseNeuralNetworkManager = EnterpriseNeuralNetworkManager;
EnterpriseNeuralNetworkManager.isInitializing = false;
EnterpriseNeuralNetworkManager.initializationPromise = null;

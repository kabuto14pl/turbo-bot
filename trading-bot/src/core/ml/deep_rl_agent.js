"use strict";
/**
 * 🤖 DEEP RL AGENT SYSTEM
 * Enterprise-grade Deep Reinforcement Learning Agent
 * Replaces SimpleRLAgent with real neural networks and advanced algorithms
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
exports.DeepRLAgent = void 0;
exports.createConservativeAgent = createConservativeAgent;
exports.createAggressiveAgent = createAggressiveAgent;
exports.createBalancedAgent = createBalancedAgent;
const tf = __importStar(require("@tensorflow/tfjs"));
const feature_extractor_1 = require("./feature_extractor");
const neural_networks_1 = require("./neural_networks");
const experience_buffer_1 = require("./experience_buffer");
const logger_1 = require("../../../core/utils/logger");
class DeepRLAgent {
    constructor(config = {}) {
        // Training state
        this.episodeCount = 0;
        this.totalSteps = 0;
        this.lastUpdateStep = 0;
        this.trainingActive = false;
        // Performance tracking
        this.episodeRewards = [];
        this.config = {
            algorithm: config.algorithm,
            policy_hidden_layers: config.policy_hidden_layers || [256, 128, 64],
            value_hidden_layers: config.value_hidden_layers || [256, 128, 64],
            learning_rate: config.learning_rate,
            policy_learning_rate: config.policy_learning_rate,
            value_learning_rate: config.value_learning_rate,
            batch_size: config.batch_size,
            epochs: config.epochs,
            epsilon: config.epsilon,
            epsilon_decay: config.epsilon_decay,
            epsilon_min: config.epsilon_min,
            gamma: config.gamma,
            tau: config.tau,
            buffer_size: config.buffer_size,
            update_frequency: config.update_frequency,
            target_update_frequency: config.target_update_frequency,
            grad_clip: config.grad_clip,
            prioritized_replay: config.prioritized_replay,
            multi_step_returns: config.multi_step_returns,
            distributional_rl: config.distributional_rl,
            noisy_networks: config.noisy_networks,
            dropout_rate: config.dropout_rate,
            episodes_per_update: config.episodes_per_update
        };
        this.logger = new logger_1.Logger();
        this.logger.info(`🧠 Deep RL Agent initialized with ${this.config.algorithm} algorithm`);
        // Initialize components asynchronously
        this.initializeAsync();
    }
    /**
     * Async initialization wrapper
     */
    async initializeAsync() {
        await this.initializeComponents();
    }
    /**
     * Initialize all components
     */
    async initializeComponents() {
        // Feature extraction
        this.featureExtractor = new feature_extractor_1.AdvancedFeatureExtractor();
        // Neural networks
        const policyConfig = (0, neural_networks_1.createDefaultPolicyConfig)();
        policyConfig.learning_rate = this.config.learning_rate;
        this.policyNetwork = new neural_networks_1.PolicyNetwork();
        await this.policyNetwork.initialize(policyConfig);
        const valueConfig = (0, neural_networks_1.createDefaultValueConfig)();
        valueConfig.learning_rate = this.config.learning_rate;
        this.valueNetwork = new neural_networks_1.ValueNetwork();
        await this.valueNetwork.initialize(valueConfig);
        // Target networks for stable learning
        if (this.config.algorithm === 'SAC' || this.config.algorithm === 'DDPG') {
            await this.createTargetNetworks();
        }
        // Experience buffer
        this.experienceBuffer = new experience_buffer_1.AdvancedExperienceBuffer({
            maxSize: this.config.buffer_size,
            prioritizedReplay: this.config.prioritized_replay,
            alpha: 0.6,
            beta: 0.4
        });
        // Initialize performance metrics
        this.performanceMetrics = {
            // Trading performance metrics
            sharpe_ratio: 0,
            max_drawdown: 0,
            win_rate: 0,
            average_return: 0,
            volatility: 0,
            sortino_ratio: 0,
            calmar_ratio: 0,
            prediction_accuracy: 0,
            mean_squared_error: 0,
            mean_absolute_error: 0, // Add missing field
            profit_factor: 0,
            total_trades: 0,
            profitable_trades: 0,
            largest_win: 0,
            largest_loss: 0,
            // Technical performance metrics
            total_memory_mb: 0,
            used_memory_mb: 0,
            peak_memory_mb: 0,
            memory_fragmentation: 0,
            tensor_count: 0,
            training_throughput: 0,
            inference_latency: 0,
            gpu_utilization: 0,
            cpu_utilization: 0,
            model_size_mb: 0,
            parameter_count: 0,
            flops_per_inference: 0,
            time_per_epoch: 0,
            convergence_speed: 0,
            gradient_norm: 0,
            learning_stability: 0,
            total_return: 0,
            information_ratio: 0,
            tracking_error: 0,
            beta: 0,
            alpha: 0,
            var_95: 0,
            cvar_95: 0,
            average_trade_duration: 0
        };
    }
    /**
     * Create target networks for stable training
     */
    async createTargetNetworks() {
        // Target networks are copies that update slowly for stable training
        const policyConfig = (0, neural_networks_1.createDefaultPolicyConfig)();
        this.targetPolicyNetwork = new neural_networks_1.PolicyNetwork();
        await this.targetPolicyNetwork.initialize(policyConfig);
        const valueConfig = (0, neural_networks_1.createDefaultValueConfig)();
        this.targetValueNetwork = new neural_networks_1.ValueNetwork();
        await this.targetValueNetwork.initialize(valueConfig);
    }
    /**
     * Generate action from market state
     */
    async generateAction(marketState) {
        try {
            // Extract features
            const features = await this.featureExtractor.extractFeatures(marketState);
            // Store current state
            this.lastState = features;
            // Convert features to tensor and generate action
            const featuresTensor = tf.tensor2d([Array.from(features)]);
            const actionTensor = await this.policyNetwork.predict(featuresTensor);
            const actionData = await actionTensor.data();
            // Convert tensor output to DeepRLAction
            const sigmoid = (x) => 1 / (1 + Math.exp(-x));
            const action = {
                position_size: Math.tanh(actionData[0]), // [-1, 1]
                confidence: sigmoid(actionData[1]), // [0, 1]
                hold_duration: Math.max(1, Math.floor(actionData[2] * 1440)), // 1-1440 minutes
                stop_loss: Math.max(0.001, Math.abs(actionData[3]) * 0.1), // 0.1-10%
                take_profit: Math.max(0.002, Math.abs(actionData[4]) * 0.2), // 0.2-20%
                action_type: actionData[0] > 0.1 ? 'BUY' : actionData[0] < -0.1 ? 'SELL' : 'HOLD',
                priority: actionData[1] > 0.7 ? 'HIGH' : actionData[1] > 0.4 ? 'MEDIUM' : 'LOW',
                reasoning: `Neural network decision based on ${features.length} features`,
                agent_contributions: [{
                        agent_name: 'DeepRLAgent',
                        confidence: sigmoid(actionData[1]),
                        signal_strength: Math.abs(actionData[0]),
                        reasoning: 'Deep RL policy network prediction'
                    }],
                uncertainty: 1 - sigmoid(actionData[1]),
                model_version: 'DeepRLAgent_v2.0',
                prediction_timestamp: Date.now()
            };
            // Store action for learning
            this.lastAction = action;
            // Cleanup tensors
            featuresTensor.dispose();
            actionTensor.dispose();
            this.totalSteps++;
            this.logger.debug(`🤖 Generated action: ${action.action_type} with confidence ${action.confidence.toFixed(3)}`);
            return action;
        }
        catch (error) {
            this.logger.error(`Error generating action: ${error}`);
            // Return safe default action
            return {
                position_size: 0,
                confidence: 0.1,
                hold_duration: 60,
                stop_loss: 0.02,
                take_profit: 0.04,
                action_type: 'HOLD',
                priority: 'LOW',
                reasoning: 'Error in neural network - default safe action',
                agent_contributions: [],
                uncertainty: 0.9,
                model_version: 'DeepRLAgent_v1.0_fallback',
                prediction_timestamp: Date.now()
            };
        }
    }
    /**
     * Learn from trading results
     */
    async learnFromResult(marketState, reward, done = false) {
        if (!this.lastState || !this.lastAction) {
            this.logger.warn('Cannot learn: no previous state/action available');
            return;
        }
        try {
            // Extract features from new state
            const nextFeatures = await this.featureExtractor.extractFeatures(marketState);
            // Create experience
            const experience = {
                state: new Float32Array(this.lastState), // Convert to Float32Array
                action: this.lastAction,
                reward: reward,
                next_state: new Float32Array(nextFeatures), // Convert to Float32Array
                done: done,
                timestamp: Date.now(),
                market_regime: this.determineMarketRegime(marketState)
            };
            // Add to experience buffer
            this.experienceBuffer.addExperience(experience);
            // Update episode tracking
            this.episodeRewards.push(reward);
            if (done) {
                this.episodeCount++;
                this.logger.info(`Episode ${this.episodeCount} completed with reward ${reward.toFixed(4)}`);
            }
            // Train if enough experiences and time for update
            if (this.shouldTrain()) {
                await this.trainNetworks();
            }
            // Update performance metrics
            this.updatePerformanceMetrics(reward);
        }
        catch (error) {
            this.logger.error(`Error in learning: ${error}`);
        }
    }
    /**
     * Determine if it's time to train the networks
     */
    shouldTrain() {
        const bufferSize = this.experienceBuffer.getStatus().size;
        const stepsSinceUpdate = this.totalSteps - this.lastUpdateStep;
        return (bufferSize >= this.config.batch_size * 2 && // Enough experiences
            stepsSinceUpdate >= this.config.episodes_per_update && // Enough steps
            !this.trainingActive // Not already training
        );
    }
    /**
     * Train the neural networks
     */
    async trainNetworks() {
        if (this.trainingActive)
            return;
        this.trainingActive = true;
        const startTime = Date.now();
        try {
            // Sample batch from experience buffer
            const { experiences, indices, importanceWeights } = this.experienceBuffer.sampleBatch(this.config.batch_size);
            const weights = Array.from(importanceWeights);
            if (this.config.algorithm === 'PPO') {
                await this.trainPPO(experiences, indices, weights);
            }
            else if (this.config.algorithm === 'SAC') {
                await this.trainSAC(experiences, indices, weights);
            }
            this.lastUpdateStep = this.totalSteps;
            const duration = Date.now() - startTime;
            this.logger.info(`🎓 Training completed in ${duration}ms`);
        }
        catch (error) {
            this.logger.error(`Training error: ${error}`);
        }
        finally {
            this.trainingActive = false;
        }
    }
    /**
     * Train using PPO algorithm
     */
    async trainPPO(experiences, indices, weights) {
        try {
            // Convert experiences to tensors
            const statesArray = experiences.map(exp => Array.from(exp.state));
            const actionsArray = experiences.map(exp => [
                exp.action.position_size,
                exp.action.confidence,
                exp.action.hold_duration / 1440, // Normalize to [0,1]
                exp.action.stop_loss,
                exp.action.take_profit
            ]);
            const rewards = experiences.map(exp => exp.reward);
            const nextStates = experiences.map(exp => Array.from(exp.next_state));
            const dones = experiences.map(exp => exp.done ? 1 : 0);
            // Create tensors
            const statesTensor = tf.tensor2d(statesArray);
            const actionsTensor = tf.tensor2d(actionsArray);
            const rewardsTensor = tf.tensor1d(rewards);
            const nextStatesTensor = tf.tensor2d(nextStates);
            const donesTensor = tf.tensor1d(dones);
            // Get current values
            const currentValues = await this.valueNetwork.predict(statesTensor);
            const nextValues = await this.valueNetwork.predict(nextStatesTensor);
            // Calculate advantages and returns
            const gamma = this.config.gamma;
            const targetValues = tf.add(rewardsTensor, tf.mul(tf.sub(tf.scalar(1), donesTensor), tf.mul(gamma, nextValues)));
            const advantages = tf.sub(targetValues, currentValues);
            // Get old log probabilities (simplified)
            const oldLogits = await this.policyNetwork.predict(statesTensor);
            const oldActionProbs = tf.softmax(oldLogits);
            const oldLogProbs = tf.log(tf.sum(tf.mul(oldActionProbs, actionsTensor), 1));
            // Train networks using new PPO implementation
            const results = await this.policyNetwork.trainPPO(statesTensor, actionsTensor, oldLogProbs, advantages, targetValues, this.config.clip_ratio, this.config.entropy_coefficient);
            this.logger.info(`🎯 PPO Training - Policy Loss: ${results.policyLoss.toFixed(4)}, Entropy: ${results.entropy.toFixed(4)}`);
            // Cleanup tensors
            statesTensor.dispose();
            actionsTensor.dispose();
            rewardsTensor.dispose();
            nextStatesTensor.dispose();
            donesTensor.dispose();
            currentValues.dispose();
            nextValues.dispose();
            targetValues.dispose();
            advantages.dispose();
            oldLogits.dispose();
            oldActionProbs.dispose();
            oldLogProbs.dispose();
        }
        catch (error) {
            this.logger.error(`PPO training error: ${error}`);
            throw error;
        }
    }
    /**
     * Train using SAC algorithm
     */
    async trainSAC(experiences, indices, weights) {
        try {
            // Convert experiences to tensors
            const statesArray = experiences.map(exp => Array.from(exp.state));
            const actionsArray = experiences.map(exp => [
                exp.action.position_size,
                exp.action.confidence,
                exp.action.hold_duration / 1440, // Normalize to [0,1]
                exp.action.stop_loss,
                exp.action.take_profit
            ]);
            const rewards = experiences.map(exp => exp.reward);
            const nextStates = experiences.map(exp => Array.from(exp.next_state));
            const dones = experiences.map(exp => exp.done ? 1 : 0);
            // Create tensors
            const statesTensor = tf.tensor2d(statesArray);
            const actionsTensor = tf.tensor2d(actionsArray);
            const rewardsTensor = tf.tensor1d(rewards);
            const nextStatesTensor = tf.tensor2d(nextStates);
            const donesTensor = tf.tensor1d(dones);
            // Train networks using new SAC implementation
            const results = await this.policyNetwork.trainSAC(statesTensor, actionsTensor, nextStatesTensor, rewardsTensor, donesTensor, this.config.temperature, this.config.gamma);
            this.logger.info(`🎯 SAC Training - Policy Loss: ${results.policyLoss.toFixed(4)}, Value Loss: ${results.valueLoss.toFixed(4)}, Entropy: ${results.entropy.toFixed(4)}`);
            // Cleanup tensors
            statesTensor.dispose();
            actionsTensor.dispose();
            rewardsTensor.dispose();
            nextStatesTensor.dispose();
            donesTensor.dispose();
        }
        catch (error) {
            this.logger.error(`SAC training error: ${error}`);
            throw error;
        }
    }
    /**
     * Calculate advantages using GAE (Generalized Advantage Estimation)
     */
    calculateAdvantages(rewards, values, nextValues, dones) {
        const advantages = [];
        const lambda = 0.95; // GAE parameter
        let gae = 0;
        for (let i = rewards.length - 1; i >= 0; i--) {
            const delta = rewards[i] + this.config.gamma * nextValues[i] * (1 - (dones[i] ? 1 : 0)) - values[i];
            gae = delta + this.config.gamma * lambda * gae * (1 - (dones[i] ? 1 : 0));
            advantages[i] = gae;
        }
        // Normalize advantages
        const mean = advantages.reduce((a, b) => a + b, 0) / advantages.length;
        const std = Math.sqrt(advantages.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / advantages.length);
        return advantages.map(adv => (adv - mean) / (std + 1e-8));
    }
    /**
     * Determine market regime
     */
    determineMarketRegime(marketState) {
        const volatility = marketState.indicators.volatility_1h;
        const volume = marketState.volume;
        const price = marketState.price;
        if (volatility > 0.05)
            return 'high_volatility';
        if (volatility < 0.01)
            return 'low_volatility';
        if (volume > 1000000)
            return 'high_volume';
        return 'normal';
    }
    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(reward) {
        this.performanceMetrics.total_trades++;
        if (reward > 0) {
            this.performanceMetrics.profitable_trades++;
            this.performanceMetrics.largest_win = Math.max(this.performanceMetrics.largest_win, reward);
        }
        else {
            this.performanceMetrics.largest_loss = Math.min(this.performanceMetrics.largest_loss, reward);
        }
        this.performanceMetrics.win_rate = this.performanceMetrics.profitable_trades / this.performanceMetrics.total_trades;
        this.performanceMetrics.average_return = this.episodeRewards.reduce((a, b) => a + b, 0) / this.episodeRewards.length;
        // Calculate Sharpe ratio (simplified)
        if (this.episodeRewards.length > 30) {
            const returns = this.episodeRewards.slice(-30);
            const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
            const std = Math.sqrt(returns.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / returns.length);
            this.performanceMetrics.sharpe_ratio = std > 0 ? mean / std : 0;
            this.performanceMetrics.volatility = std;
        }
    }
    /**
     * Get current performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }
    /**
     * Get training status
     */
    getTrainingStatus() {
        const bufferStatus = { size: this.experienceBuffer.size(), capacity: 10000 };
        return {
            episodeCount: this.episodeCount,
            totalSteps: this.totalSteps,
            bufferSize: bufferStatus.size,
            isTraining: this.trainingActive,
            lastReward: this.episodeRewards.length > 0 ? this.episodeRewards[this.episodeRewards.length - 1] : 0,
            averageReward: this.episodeRewards.length > 0 ?
                this.episodeRewards.reduce((a, b) => a + b, 0) / this.episodeRewards.length : 0
        };
    }
    /**
     * Save the trained models
     */
    async saveModels(basePath) {
        await this.policyNetwork.saveModel(`${basePath}/policy`);
        await this.valueNetwork.saveModel(`${basePath}/value`);
        this.logger.info(`🌿 Models saved to ${basePath}`);
    }
    /**
     * Load pre-trained models
     */
    async loadModels(basePath) {
        await this.policyNetwork.loadModel(`${basePath}/policy`);
        await this.valueNetwork.loadModel(`${basePath}/value`);
        this.logger.info(`📖 Models loaded from ${basePath}`);
    }
    /**
     * Export experiences for analysis
     */
    exportExperiences() {
        return this.experienceBuffer.exportExperiences();
    }
    /**
     * Reset the agent
     */
    reset() {
        this.experienceBuffer.reset();
        this.episodeCount = 0;
        this.totalSteps = 0;
        this.lastUpdateStep = 0;
        this.episodeRewards = [];
        this.lastAction = undefined;
        this.lastState = undefined;
        this.logger.info('🔄 Deep RL Agent reset completed');
    }
    /**
     * Dispose and cleanup
     */
    dispose() {
        this.policyNetwork.dispose();
        this.valueNetwork.dispose();
        if (this.targetPolicyNetwork) {
            this.targetPolicyNetwork.dispose();
        }
        if (this.targetValueNetwork) {
            this.targetValueNetwork.dispose();
        }
        this.logger.info('🗑️ Deep RL Agent disposed');
    }
}
exports.DeepRLAgent = DeepRLAgent;
/**
 * Factory function to create different agent configurations
 */
function createConservativeAgent() {
    return new DeepRLAgent({
        algorithm: 'PPO',
        learning_rate: 0.0001,
        clip_ratio: 0.1,
        entropy_coefficient: 0.005,
        batch_size: 32
    });
}
function createAggressiveAgent() {
    return new DeepRLAgent({
        algorithm: 'SAC',
        learning_rate: 0.001,
        entropy_coefficient: 0.02,
        batch_size: 128
    });
}
function createBalancedAgent() {
    return new DeepRLAgent({
        algorithm: 'PPO',
        learning_rate: 0.0003,
        clip_ratio: 0.2,
        entropy_coefficient: 0.01,
        batch_size: 64
    });
}

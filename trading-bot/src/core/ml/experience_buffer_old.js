"use strict";
/**
 * � ADVANCED EXPERIENCE REPLAY BUFFER
 * Sophisticated memory system for Deep RL training
 * Replaces SimpleRL's primitive actionHistory with enterprise-grade experience management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedExperienceBuffer = void 0;
const logger_1 = require("../../../core/utils/logger");
class AdvancedExperienceBuffer {
    constructor(config = {}) {
        this.buffer = [];
        this.currentIndex = 0;
        this.maxPriority = 1.0;
        // Statistics tracking
        this.totalSamples = 0;
        this.sumPriorities = 0;
        this.rewardHistory = [];
        this.tdErrorHistory = [];
        this.isFull = false;
        // Prioritized Experience Replay parameters
        this.alpha = 0.6; // Prioritization exponent
        this.beta = 0.4; // Importance sampling exponent
        this.epsilon = 1e-6; // Small constant for numerical stability
        // Performance tracking
        this.addCount = 0;
        this.sampleCount = 0;
        this.config = {
            maxSize: 100000,
            prioritizedReplay: true,
            alpha: 0.6,
            beta: 0.4,
            epsilon: 1e-6,
            enableHER: true,
            enablePER: true,
            enableER: true,
            filterByMarketRegime: true,
            filterByPerformance: false,
            minRewardThreshold: -1.0,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            ...config
        };
        this.maxSize = this.config.maxSize;
        this.priorities = new Float32Array(this.config.maxSize);
        this.priorityWeights = new Float32Array(this.config.maxSize);
        this.logger = new logger_1.Logger();
        this.logger.info(`Experience buffer initialized with capacity: ${this.maxSize}`);
    }
    /**
     * Add new experience with automatic prioritization
     */
    addExperience(experience) {
        try {
            // Calculate initial priority based on TD error or use maximum
            let priority = this.calculateInitialPriority(experience);
            // Store experience
            if (this.isFull) {
                // Override oldest experience
                this.buffer[this.currentIndex] = experience;
            }
            else {
                this.buffer.push(experience);
            }
            // Store priority
            this.priorityWeights[this.currentIndex] = priority;
            // Update indices
            this.currentIndex = (this.currentIndex + 1) % this.maxSize;
            if (!this.isFull && this.buffer.length >= this.maxSize) {
                this.isFull = true;
            }
            this.addCount++;
            // Periodic logging
            if (this.addCount % 10000 === 0) {
                this.logger.info(`Added ${this.addCount} experiences. Buffer size: ${this.size()}`);
            }
        }
        catch (error) {
            this.logger.error('Failed to add experience:', error);
        }
    }
    /**
     * Sample batch with prioritized experience replay
     */
    sampleBatch(batchSize) {
        if (this.size() < batchSize) {
            throw new Error(`Not enough experiences. Have ${this.size()}, need ${batchSize}`);
        }
        const experiences = [];
        const indices = [];
        const importanceWeights = new Float32Array(batchSize);
        // Calculate sampling probabilities
        const priorities = this.getPriorities();
        const probabilities = this.calculateSamplingProbabilities(priorities);
        // Sample experiences
        for (let i = 0; i < batchSize; i++) {
            const index = this.sampleIndex(probabilities);
            experiences.push(this.buffer[index]);
            indices.push(index);
            // Calculate importance sampling weight
            const probability = probabilities[index];
            const weight = Math.pow(this.size() * probability, -this.beta);
            importanceWeights[i] = weight;
        }
        // Normalize importance weights
        const maxWeight = Math.max(...Array.from(importanceWeights));
        for (let i = 0; i < batchSize; i++) {
            importanceWeights[i] /= maxWeight;
        }
        this.sampleCount++;
        return { experiences, indices, importanceWeights };
    }
    /**
     * Update priorities based on TD errors
     */
    updatePriorities(indices, tdErrors) {
        if (indices.length !== tdErrors.length) {
            throw new Error('Indices and TD errors arrays must have same length');
        }
        for (let i = 0; i < indices.length; i++) {
            const index = indices[i];
            if (index >= 0 && index < this.size()) {
                // Priority = |TD error| + epsilon
                const priority = Math.abs(tdErrors[i]) + this.epsilon;
                this.priorityWeights[index] = Math.pow(priority, this.alpha);
                // Update TD error in experience
                if (this.buffer[index]) {
                    this.buffer[index].td_error = tdErrors[i];
                }
            }
        }
    }
    /**
     * Sample uniformly (for comparison with prioritized sampling)
     */
    sampleUniform(batchSize) {
        if (this.size() < batchSize) {
            throw new Error(`Not enough experiences. Have ${this.size()}, need ${batchSize}`);
        }
        const experiences = [];
        const size = this.size();
        for (let i = 0; i < batchSize; i++) {
            const index = Math.floor(Math.random() * size);
            experiences.push(this.buffer[index]);
        }
        return experiences;
    }
    /**
     * Get recent experiences (for online learning)
     */
    getRecentExperiences(count) {
        const size = this.size();
        if (size === 0)
            return [];
        const actualCount = Math.min(count, size);
        const experiences = [];
        for (let i = 0; i < actualCount; i++) {
            const index = (this.currentIndex - 1 - i + this.maxSize) % this.maxSize;
            if (index < size) {
                experiences.push(this.buffer[index]);
            }
        }
        return experiences.reverse(); // Return in chronological order
    }
    /**
     * Filter experiences by criteria
     */
    filterExperiences(predicate) {
        return this.buffer.slice(0, this.size()).filter(predicate);
    }
    /**
     * Get experiences by market regime
     */
    getExperiencesByRegime(regime) {
        return this.filterExperiences(exp => exp.market_regime === regime);
    }
    /**
     * Get high-reward experiences
     */
    getHighRewardExperiences(threshold) {
        return this.filterExperiences(exp => exp.reward > threshold);
    }
    /**
     * Calculate statistics
     */
    getStatistics() {
        const size = this.size();
        if (size === 0) {
            return {
                size: 0,
                averageReward: 0,
                rewardStd: 0,
                averageTDError: 0,
                priorityDistribution: { min: 0, max: 0, mean: 0 }
            };
        }
        const experiences = this.buffer.slice(0, size);
        const rewards = experiences.map(exp => exp.reward);
        const tdErrors = experiences.map(exp => exp.td_error || 0);
        const priorities = Array.from(this.priorityWeights.slice(0, size));
        const averageReward = rewards.reduce((a, b) => a + b, 0) / size;
        const rewardVariance = rewards.reduce((acc, r) => acc + Math.pow(r - averageReward, 2), 0) / size;
        const rewardStd = Math.sqrt(rewardVariance);
        const averageTDError = tdErrors.reduce((a, b) => a + Math.abs(b), 0) / size;
        const minPriority = Math.min(...priorities);
        const maxPriority = Math.max(...priorities);
        const meanPriority = priorities.reduce((a, b) => a + b, 0) / size;
        return {
            size,
            averageReward,
            rewardStd,
            averageTDError,
            priorityDistribution: {
                min: minPriority,
                max: maxPriority,
                mean: meanPriority
            }
        };
    }
    /**
     * Clear buffer
     */
    clear() {
        this.buffer = [];
        this.priorityWeights.fill(this.epsilon);
        this.currentIndex = 0;
        this.isFull = false;
        this.addCount = 0;
        this.sampleCount = 0;
        this.logger.info('Experience buffer cleared');
    }
    /**
     * Get buffer size
     */
    size() {
        return this.isFull ? this.maxSize : this.buffer.length;
    }
    /**
     * Check if buffer has enough experiences for training
     */
    isReady(minExperiences = 1000) {
        return this.size() >= minExperiences;
    }
    /**
     * Save buffer to file (for persistence)
     */
    async saveToFile(filePath) {
        try {
            const data = {
                experiences: this.buffer.slice(0, this.size()),
                priorities: Array.from(this.priorityWeights.slice(0, this.size())),
                metadata: {
                    maxSize: this.maxSize,
                    currentIndex: this.currentIndex,
                    isFull: this.isFull,
                    addCount: this.addCount,
                    sampleCount: this.sampleCount,
                    alpha: this.alpha,
                    beta: this.beta
                }
            };
            // In a real implementation, would use proper file I/O
            // For now, just log that we would save
            this.logger.info(`Would save ${data.experiences.length} experiences to ${filePath}`);
        }
        catch (error) {
            this.logger.error('Failed to save buffer:', error);
            throw error;
        }
    }
    /**
     * Load buffer from file
     */
    async loadFromFile(filePath) {
        try {
            // In a real implementation, would load from file
            this.logger.info(`Would load experiences from ${filePath}`);
        }
        catch (error) {
            this.logger.error('Failed to load buffer:', error);
            throw error;
        }
    }
    // =================== PRIVATE METHODS ===================
    /**
     * Calculate initial priority for new experience
     */
    calculateInitialPriority(experience) {
        // If TD error is available, use it
        if (experience.td_error !== undefined) {
            return Math.pow(Math.abs(experience.td_error) + this.epsilon, this.alpha);
        }
        // Otherwise, use maximum priority to ensure new experiences are sampled
        const currentPriorities = this.priorityWeights.slice(0, this.size());
        const maxPriority = currentPriorities.length > 0 ? Math.max(...Array.from(currentPriorities)) : 1.0;
        return maxPriority;
    }
    /**
     * Get priorities for current experiences
     */
    getPriorities() {
        return this.priorityWeights.slice(0, this.size());
    }
    /**
     * Calculate sampling probabilities from priorities
     */
    calculateSamplingProbabilities(priorities) {
        const size = priorities.length;
        const probabilities = new Float32Array(size);
        // Sum of all priorities
        const totalPriority = Array.from(priorities).reduce((sum, p) => sum + p, 0);
        // Calculate probabilities
        for (let i = 0; i < size; i++) {
            probabilities[i] = priorities[i] / totalPriority;
        }
        return probabilities;
    }
    /**
     * Sample index based on probabilities
     */
    sampleIndex(probabilities) {
        const random = Math.random();
        let cumulativeProbability = 0;
        for (let i = 0; i < probabilities.length; i++) {
            cumulativeProbability += probabilities[i];
            if (random <= cumulativeProbability) {
                return i;
            }
        }
        // Fallback to last index
        return probabilities.length - 1;
    }
    /**
     * Update beta parameter for importance sampling (should increase over training)
     */
    updateBeta(newBeta) {
        this.beta = Math.min(1.0, newBeta);
    }
    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        const size = this.size();
        const priorities = this.priorityWeights.slice(0, size);
        const averagePriority = size > 0 ? Array.from(priorities).reduce((a, b) => a + b, 0) / size : 0;
        return {
            addRate: this.addCount / (Date.now() / 1000), // Rough rate estimation
            sampleRate: this.sampleCount / (Date.now() / 1000),
            memoryUsage: size * 1000, // Rough memory estimation in bytes
            averagePriority
        };
    }
}
exports.AdvancedExperienceBuffer = AdvancedExperienceBuffer;

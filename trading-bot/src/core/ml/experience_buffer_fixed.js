"use strict";
/**
 * 💾 ADVANCED EXPERIENCE REPLAY BUFFER - FIXED
 * Sophisticated memory system for Deep RL training
 * Replaces SimpleRL's primitive actionHistory
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedExperienceBuffer = void 0;
const logger_1 = require("../../../core/utils/logger");
class AdvancedExperienceBuffer {
    constructor(config = {}) {
        this.buffer = [];
        this.maxPriority = 1.0;
        this.totalSamples = 0;
        this.sumPriorities = 0;
        this.rewardHistory = [];
        this.tdErrorHistory = [];
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
            maxAge: 7 * 24 * 60 * 60 * 1000,
            ...config
        };
        this.priorities = new Float32Array(this.config.maxSize);
        this.logger = new logger_1.Logger();
        this.logger.info(`Advanced Experience Buffer initialized with capacity ${this.config.maxSize}`);
    }
    /**
     * Add new experience to the buffer
     */
    addExperience(experience) {
        if (!this.validateExperience(experience)) {
            this.logger.warn('Invalid experience rejected');
            return;
        }
        if (!this.passesFilters(experience)) {
            return;
        }
        const priority = this.calculateInitialPriority(experience);
        if (this.buffer.length >= this.config.maxSize) {
            this.evictOldestExperience();
        }
        const index = this.buffer.length;
        this.buffer.push(experience);
        this.priorities[index] = priority;
        this.updateStatistics(experience, priority);
        if (this.config.enableHER) {
            this.applyHER(experience);
        }
        this.logger.debug(`Experience added at index ${index} with priority ${priority.toFixed(4)}`);
    }
    /**
     * Sample a batch of experiences
     */
    sampleBatch(batchSize) {
        if (this.buffer.length === 0) {
            throw new Error('Cannot sample from empty buffer');
        }
        batchSize = Math.min(batchSize, this.buffer.length);
        if (this.config.prioritizedReplay && this.config.enablePER) {
            return this.samplePrioritized(batchSize);
        }
        else {
            return this.sampleUniform(batchSize);
        }
    }
    /**
     * Sample with prioritized experience replay
     */
    samplePrioritized(batchSize) {
        const experiences = [];
        const indices = [];
        const weights = [];
        const probabilities = this.calculateProbabilities();
        const segmentSize = this.sumPriorities / batchSize;
        for (let i = 0; i < batchSize; i++) {
            const segmentStart = segmentSize * i;
            const segmentEnd = segmentSize * (i + 1);
            const sample = Math.random() * (segmentEnd - segmentStart) + segmentStart;
            let cumulativeSum = 0;
            let selectedIndex = 0;
            for (let j = 0; j < this.buffer.length; j++) {
                cumulativeSum += probabilities[j];
                if (cumulativeSum >= sample) {
                    selectedIndex = j;
                    break;
                }
            }
            const probability = probabilities[selectedIndex];
            const weight = Math.pow(this.buffer.length * probability, -this.config.beta);
            const normalizedWeight = weight / this.getMaxWeight();
            experiences.push(this.buffer[selectedIndex]);
            indices.push(selectedIndex);
            weights.push(normalizedWeight);
        }
        this.totalSamples += batchSize;
        return { experiences, indices, weights };
    }
    /**
     * Sample uniformly
     */
    sampleUniform(batchSize) {
        const experiences = [];
        const indices = [];
        const weights = new Array(batchSize).fill(1.0);
        for (let i = 0; i < batchSize; i++) {
            const index = Math.floor(Math.random() * this.buffer.length);
            experiences.push(this.buffer[index]);
            indices.push(index);
        }
        this.totalSamples += batchSize;
        return { experiences, indices, weights };
    }
    /**
     * Update priorities after training
     */
    updatePriorities(indices, tdErrors) {
        if (!this.config.prioritizedReplay)
            return;
        for (let i = 0; i < indices.length; i++) {
            const index = indices[i];
            const tdError = Math.abs(tdErrors[i]);
            if (this.buffer[index]) {
                this.buffer[index].td_error = tdError;
            }
            const priority = Math.pow(tdError + this.config.epsilon, this.config.alpha);
            this.priorities[index] = priority;
            this.maxPriority = Math.max(this.maxPriority, priority);
            this.tdErrorHistory.push(tdError);
            if (this.tdErrorHistory.length > 10000) {
                this.tdErrorHistory.shift();
            }
        }
        this.recalculateSumPriorities();
    }
    /**
     * Get buffer status
     */
    getStatus() {
        return {
            size: this.buffer.length,
            capacity: this.config.maxSize,
            utilizationPercent: (this.buffer.length / this.config.maxSize) * 100,
            totalSamples: this.totalSamples,
            avgPriority: this.buffer.length > 0 ? this.sumPriorities / this.buffer.length : 0,
            config: this.config
        };
    }
    /**
     * Export experiences for analysis
     */
    exportExperiences() {
        return [...this.buffer];
    }
    /**
     * Reset buffer completely
     */
    reset() {
        this.buffer = [];
        this.priorities = new Float32Array(this.config.maxSize);
        this.maxPriority = 1.0;
        this.sumPriorities = 0;
        this.totalSamples = 0;
        this.rewardHistory = [];
        this.tdErrorHistory = [];
        this.logger.info('Experience buffer reset completed');
    }
    // Private helper methods
    validateExperience(experience) {
        if (!experience.state || !experience.action || experience.reward === undefined) {
            return false;
        }
        if (experience.state.length !== 500) {
            this.logger.warn(`Invalid state dimension: ${experience.state.length}, expected 500`);
            return false;
        }
        if (experience.state.some(val => isNaN(val)) || isNaN(experience.reward)) {
            this.logger.warn('Experience contains NaN values');
            return false;
        }
        if (Math.abs(experience.reward) > 100) {
            this.logger.warn(`Extreme reward value: ${experience.reward}`);
            return false;
        }
        return true;
    }
    passesFilters(experience) {
        const age = Date.now() - experience.timestamp;
        if (age > this.config.maxAge) {
            return false;
        }
        if (this.config.filterByPerformance && experience.reward < this.config.minRewardThreshold) {
            return false;
        }
        if (this.config.filterByMarketRegime && experience.market_regime === 'extreme_volatility') {
            return false;
        }
        return true;
    }
    calculateInitialPriority(experience) {
        let priority = this.maxPriority;
        if (Math.abs(experience.reward) > 0.1) {
            priority *= 1.5;
        }
        if (experience.market_regime === 'high_volatility') {
            priority *= 1.2;
        }
        return priority;
    }
    evictOldestExperience() {
        let evictIndex = 0;
        if (this.config.prioritizedReplay) {
            let minPriority = this.priorities[0];
            for (let i = 1; i < this.buffer.length; i++) {
                if (this.priorities[i] < minPriority) {
                    minPriority = this.priorities[i];
                    evictIndex = i;
                }
            }
        }
        this.buffer.splice(evictIndex, 1);
        for (let i = evictIndex; i < this.buffer.length; i++) {
            this.priorities[i] = this.priorities[i + 1];
        }
    }
    calculateProbabilities() {
        const probabilities = new Float32Array(this.buffer.length);
        for (let i = 0; i < this.buffer.length; i++) {
            probabilities[i] = this.priorities[i] / this.sumPriorities;
        }
        return probabilities;
    }
    recalculateSumPriorities() {
        this.sumPriorities = 0;
        for (let i = 0; i < this.buffer.length; i++) {
            this.sumPriorities += this.priorities[i];
        }
    }
    getMaxWeight() {
        const minProbability = Math.min(...Array.from(this.calculateProbabilities()));
        return Math.pow(this.buffer.length * minProbability, -this.config.beta);
    }
    updateStatistics(experience, priority) {
        this.rewardHistory.push(experience.reward);
        if (this.rewardHistory.length > 10000) {
            this.rewardHistory.shift();
        }
        this.sumPriorities += priority;
    }
    applyHER(experience) {
        if (experience.reward < 0) {
            const hindsightExperience = {
                ...experience,
                reward: 1.0,
                reasoning: `Hindsight experience: learned from achieving state ${experience.next_state[0].toFixed(4)}`
            };
            const index = this.buffer.length;
            if (index < this.config.maxSize) {
                this.buffer.push(hindsightExperience);
                this.priorities[index] = this.maxPriority * 0.5;
            }
        }
    }
}
exports.AdvancedExperienceBuffer = AdvancedExperienceBuffer;

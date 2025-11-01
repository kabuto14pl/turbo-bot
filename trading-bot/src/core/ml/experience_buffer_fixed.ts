/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 💾 ADVANCED EXPERIENCE REPLAY BUFFER - FIXED
 * Sophisticated memory system for Deep RL training
 * Replaces SimpleRL's primitive actionHistory
 */

import { Experience, FeatureVector, DeepRLAction } from './types';
import { Logger } from '../../../core/utils/logger';

interface ExperienceBufferConfig {
  maxSize: number;
  prioritizedReplay: boolean;
  alpha: number;
  beta: number;
  epsilon: number;
  enableHER: boolean;
  enablePER: boolean;
  enableER: boolean;
  filterByMarketRegime: boolean;
  filterByPerformance: boolean;
  minRewardThreshold: number;
  maxAge: number;
}

export class AdvancedExperienceBuffer {
  private buffer: Experience[] = [];
  private priorities: Float32Array;
  private maxPriority: number = 1.0;
  private config: ExperienceBufferConfig;
  private logger: Logger;
  private totalSamples: number = 0;
  private sumPriorities: number = 0;
  private rewardHistory: number[] = [];
  private tdErrorHistory: number[] = [];

  constructor(config: Partial<ExperienceBufferConfig> = {}) {
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
    this.logger = new Logger();
    
    this.logger.info(`Advanced Experience Buffer initialized with capacity ${this.config.maxSize}`);
  }

  /**
   * Add new experience to the buffer
   */
  addExperience(experience: Experience): void {
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
  sampleBatch(batchSize: number): { 
    experiences: Experience[]; 
    indices: number[]; 
    weights: number[] 
  } {
    if (this.buffer.length === 0) {
      throw new Error('Cannot sample from empty buffer');
    }

    batchSize = Math.min(batchSize, this.buffer.length);
    
    if (this.config.prioritizedReplay && this.config.enablePER) {
      return this.samplePrioritized(batchSize);
    } else {
      return this.sampleUniform(batchSize);
    }
  }

  /**
   * Sample with prioritized experience replay
   */
  private samplePrioritized(batchSize: number): {
    experiences: Experience[];
    indices: number[];
    weights: number[];
  } {
    const experiences: Experience[] = [];
    const indices: number[] = [];
    const weights: number[] = [];

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
  private sampleUniform(batchSize: number): {
    experiences: Experience[];
    indices: number[];
    weights: number[];
  } {
    const experiences: Experience[] = [];
    const indices: number[] = [];
    const weights: number[] = new Array(batchSize).fill(1.0);

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
  updatePriorities(indices: number[], tdErrors: number[]): void {
    if (!this.config.prioritizedReplay) return;

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
  getStatus(): {
    size: number;
    capacity: number;
    utilizationPercent: number;
    totalSamples: number;
    avgPriority: number;
    config: ExperienceBufferConfig;
  } {
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
  exportExperiences(): Experience[] {
    return [...this.buffer];
  }

  /**
   * Reset buffer completely
   */
  reset(): void {
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
  private validateExperience(experience: Experience): boolean {
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

  private passesFilters(experience: Experience): boolean {
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

  private calculateInitialPriority(experience: Experience): number {
    let priority = this.maxPriority;
    
    if (Math.abs(experience.reward) > 0.1) {
      priority *= 1.5;
    }
    
    if (experience.market_regime === 'high_volatility') {
      priority *= 1.2;
    }

    return priority;
  }

  private evictOldestExperience(): void {
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

  private calculateProbabilities(): Float32Array {
    const probabilities = new Float32Array(this.buffer.length);
    
    for (let i = 0; i < this.buffer.length; i++) {
      probabilities[i] = this.priorities[i] / this.sumPriorities;
    }
    
    return probabilities;
  }

  private recalculateSumPriorities(): void {
    this.sumPriorities = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      this.sumPriorities += this.priorities[i];
    }
  }

  private getMaxWeight(): number {
    const minProbability = Math.min(...Array.from(this.calculateProbabilities()));
    return Math.pow(this.buffer.length * minProbability, -this.config.beta);
  }

  private updateStatistics(experience: Experience, priority: number): void {
    this.rewardHistory.push(experience.reward);
    if (this.rewardHistory.length > 10000) {
      this.rewardHistory.shift();
    }

    this.sumPriorities += priority;
  }

  private applyHER(experience: Experience): void {
    if (experience.reward < 0) {
      const hindsightExperience: Experience = {
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

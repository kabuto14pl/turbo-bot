/**
 * � ADVANCED EXPERIENCE REPLAY BUFFER
 * Sophisticated memory system for Deep RL training
 * Replaces SimpleRL's primitive actionHistory with enterprise-grade experience management
 */

import { Experience, FeatureVector, DeepRLAction } from './types';
import { Logger } from '../../../core/utils/logger';

interface ExperienceBufferConfig {
  maxSize: number;
  prioritizedReplay: boolean;
  alpha: number; // Priority exponent
  beta: number;  // Importance sampling exponent
  epsilon: number; // Small constant for numerical stability
  
  // Advanced features
  enableHER: boolean; // Hindsight Experience Replay
  enablePER: boolean; // Prioritized Experience Replay
  enableER: boolean;  // Experience Replay
  
  // Filtering options
  filterByMarketRegime: boolean;
  filterByPerformance: boolean;
  minRewardThreshold: number;
  maxAge: number; // Maximum age of experiences in milliseconds
}

export class AdvancedExperienceBuffer {
  private buffer: Experience[] = [];
  private priorities: Float32Array;
  private priorityWeights: Float32Array;
  private currentIndex: number = 0;
  private maxPriority: number = 1.0;
  private config: ExperienceBufferConfig;
  private logger: Logger;
  
  // Statistics tracking
  private totalSamples: number = 0;
  private sumPriorities: number = 0;
  private rewardHistory: number[] = [];
  private tdErrorHistory: number[] = [];
  private maxSize: number;
  private isFull: boolean = false;
  
  // Prioritized Experience Replay parameters
  private alpha: number = 0.6; // Prioritization exponent
  private beta: number = 0.4; // Importance sampling exponent
  private epsilon: number = 1e-6; // Small constant for numerical stability
  
  // Performance tracking
  private addCount: number = 0;
  private sampleCount: number = 0;

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
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      ...config
    };

    this.maxSize = this.config.maxSize;
    this.priorities = new Float32Array(this.config.maxSize);
    this.priorityWeights = new Float32Array(this.config.maxSize);
    this.logger = new Logger();
    
    this.logger.info(`Experience buffer initialized with capacity: ${this.maxSize}`);
  }

  /**
   * Add new experience with automatic prioritization
   */
  addExperience(experience: Experience): void {
    try {
      // Calculate initial priority based on TD error or use maximum
      let priority = this.calculateInitialPriority(experience);
      
      // Store experience
      if (this.isFull) {
        // Override oldest experience
        this.buffer[this.currentIndex] = experience;
      } else {
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
      
    } catch (error) {
      this.logger.error('Failed to add experience:', error);
    }
  }

  /**
   * Sample batch with prioritized experience replay
   */
  sampleBatch(batchSize: number): { 
    experiences: Experience[]; 
    indices: number[]; 
    importanceWeights: Float32Array 
  } {
    if (this.size() < batchSize) {
      throw new Error(`Not enough experiences. Have ${this.size()}, need ${batchSize}`);
    }

    const experiences: Experience[] = [];
    const indices: number[] = [];
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
  updatePriorities(indices: number[], tdErrors: Float32Array): void {
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
  sampleUniform(batchSize: number): Experience[] {
    if (this.size() < batchSize) {
      throw new Error(`Not enough experiences. Have ${this.size()}, need ${batchSize}`);
    }

    const experiences: Experience[] = [];
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
  getRecentExperiences(count: number): Experience[] {
    const size = this.size();
    if (size === 0) return [];
    
    const actualCount = Math.min(count, size);
    const experiences: Experience[] = [];
    
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
  filterExperiences(predicate: (exp: Experience) => boolean): Experience[] {
    return this.buffer.slice(0, this.size()).filter(predicate);
  }

  /**
   * Get experiences by market regime
   */
  getExperiencesByRegime(regime: string): Experience[] {
    return this.filterExperiences(exp => exp.market_regime === regime);
  }

  /**
   * Get high-reward experiences
   */
  getHighRewardExperiences(threshold: number): Experience[] {
    return this.filterExperiences(exp => exp.reward > threshold);
  }

  /**
   * Calculate statistics
   */
  getStatistics(): {
    size: number;
    averageReward: number;
    rewardStd: number;
    averageTDError: number;
    priorityDistribution: { min: number; max: number; mean: number };
  } {
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
    const priorities = Array.from(this.priorityWeights.slice(0, size)) as number[];

    const averageReward = rewards.reduce((a, b) => a + b, 0) / size;
    const rewardVariance = rewards.reduce((acc, r) => acc + Math.pow(r - averageReward, 2), 0) / size;
    const rewardStd = Math.sqrt(rewardVariance);
    
    const averageTDError = tdErrors.reduce((a, b) => a + Math.abs(b), 0) / size;
    
    const minPriority = Math.min(...priorities);
    const maxPriority = Math.max(...priorities);
    const meanPriority = priorities.reduce((a: number, b: number) => a + b, 0) / size;

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
  clear(): void {
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
  size(): number {
    return this.isFull ? this.maxSize : this.buffer.length;
  }

  /**
   * Check if buffer has enough experiences for training
   */
  isReady(minExperiences: number = 1000): boolean {
    return this.size() >= minExperiences;
  }

  /**
   * Save buffer to file (for persistence)
   */
  async saveToFile(filePath: string): Promise<void> {
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
      
    } catch (error) {
      this.logger.error('Failed to save buffer:', error);
      throw error;
    }
  }

  /**
   * Load buffer from file
   */
  async loadFromFile(filePath: string): Promise<void> {
    try {
      // In a real implementation, would load from file
      this.logger.info(`Would load experiences from ${filePath}`);
      
    } catch (error) {
      this.logger.error('Failed to load buffer:', error);
      throw error;
    }
  }

  // =================== PRIVATE METHODS ===================

  /**
   * Calculate initial priority for new experience
   */
  private calculateInitialPriority(experience: Experience): number {
    // If TD error is available, use it
    if (experience.td_error !== undefined) {
      return Math.pow(Math.abs(experience.td_error) + this.epsilon, this.alpha);
    }
    
    // Otherwise, use maximum priority to ensure new experiences are sampled
    const currentPriorities = this.priorityWeights.slice(0, this.size());
    const maxPriority = currentPriorities.length > 0 ? Math.max(...Array.from(currentPriorities) as number[]) : 1.0;
    
    return maxPriority;
  }

  /**
   * Get priorities for current experiences
   */
  private getPriorities(): Float32Array {
    return this.priorityWeights.slice(0, this.size());
  }

  /**
   * Calculate sampling probabilities from priorities
   */
  private calculateSamplingProbabilities(priorities: Float32Array): Float32Array {
    const size = priorities.length;
    const probabilities = new Float32Array(size);
    
    // Sum of all priorities
    const totalPriority = Array.from(priorities).reduce((sum: number, p: number) => sum + p, 0);
    
    // Calculate probabilities
    for (let i = 0; i < size; i++) {
      probabilities[i] = priorities[i] / totalPriority;
    }
    
    return probabilities;
  }

  /**
   * Sample index based on probabilities
   */
  private sampleIndex(probabilities: Float32Array): number {
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
  updateBeta(newBeta: number): void {
    this.beta = Math.min(1.0, newBeta);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    addRate: number;
    sampleRate: number;
    memoryUsage: number;
    averagePriority: number;
  } {
    const size = this.size();
    const priorities = this.priorityWeights.slice(0, size);
    const averagePriority = size > 0 ? Array.from(priorities).reduce((a: number, b: number) => a + b, 0) / size : 0;
    
    return {
      addRate: this.addCount / (Date.now() / 1000), // Rough rate estimation
      sampleRate: this.sampleCount / (Date.now() / 1000),
      memoryUsage: size * 1000, // Rough memory estimation in bytes
      averagePriority
    };
  }
}

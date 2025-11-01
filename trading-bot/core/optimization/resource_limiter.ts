/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🔧 RESOURCE LIMITER FOR i3 HARDWARE
 * Limits ML/Optimization resources for stable operation
 */

export interface ResourceLimits {
  ml: {
    maxBatchSize: number;
    maxEpochs: number;
    maxConcurrentModels: number;
    cpuThreads: number;
    memoryLimitMB: number;
  };
  optimization: {
    maxTrials: number;
    maxConcurrentOptimizations: number;
    timeoutMinutes: number;
    populationSize: number;
  };
  general: {
    maxCpuUsage: number; // percentage
    maxMemoryUsage: number; // MB
    throttleDelayMs: number;
  };
}

export class ResourceLimiter {
  private limits: ResourceLimits;
  private currentUsage: {
    cpu: number;
    memory: number;
    activeMLJobs: number;
    activeOptimizations: number;
  };

  constructor() {
    // Optimized for Intel i3-1115G4 (2 cores, 11.79GB RAM)
    this.limits = {
      ml: {
        maxBatchSize: 16,        // Reduced from typical 32/64
        maxEpochs: 5,           // Reduced from typical 10/20
        maxConcurrentModels: 1,  // Only 1 model at a time
        cpuThreads: 1,          // Use only 1 thread for ML
        memoryLimitMB: 2048     // 2GB limit for ML operations
      },
      optimization: {
        maxTrials: 5,           // Reduced from typical 10/20
        maxConcurrentOptimizations: 1, // Only 1 optimization at a time
        timeoutMinutes: 10,     // Shorter timeout
        populationSize: 10      // Smaller population for genetic algorithms
      },
      general: {
        maxCpuUsage: 50,        // Never exceed 50% on i3
        maxMemoryUsage: 4096,   // 4GB max total usage
        throttleDelayMs: 100    // Add delays between operations
      }
    };

    this.currentUsage = {
      cpu: 0,
      memory: 0,
      activeMLJobs: 0,
      activeOptimizations: 0
    };

    console.log('🔧 Resource Limiter initialized for i3 hardware');
    console.log('📊 Limits:', this.limits);
  }

  /**
   * Check if ML operation is allowed
   */
  canStartMLOperation(): boolean {
    if (this.currentUsage.activeMLJobs >= this.limits.ml.maxConcurrentModels) {
      console.log('⛔ ML operation blocked: max concurrent models reached');
      return false;
    }

    if (this.currentUsage.cpu > this.limits.general.maxCpuUsage) {
      console.log('⛔ ML operation blocked: CPU usage too high');
      return false;
    }

    if (this.currentUsage.memory > this.limits.general.maxMemoryUsage) {
      console.log('⛔ ML operation blocked: memory usage too high');
      return false;
    }

    return true;
  }

  /**
   * Check if optimization operation is allowed
   */
  canStartOptimization(): boolean {
    if (this.currentUsage.activeOptimizations >= this.limits.optimization.maxConcurrentOptimizations) {
      console.log('⛔ Optimization blocked: max concurrent optimizations reached');
      return false;
    }

    if (this.currentUsage.cpu > this.limits.general.maxCpuUsage) {
      console.log('⛔ Optimization blocked: CPU usage too high');
      return false;
    }

    return true;
  }

  /**
   * Get TensorFlow configuration for i3 hardware
   */
  getTensorFlowConfig(): any {
    return {
      // CPU-only configuration (no GPU for i3)
      cpu: {
        numThreads: this.limits.ml.cpuThreads,
        blockingKernels: false // Non-blocking for better responsiveness
      },
      // Memory optimization
      memory: {
        memoryLimitBytes: this.limits.ml.memoryLimitMB * 1024 * 1024,
        allowGrowth: true,
        virtualGpuMemoryFraction: 0 // No GPU
      },
      // Training configuration
      training: {
        batchSize: this.limits.ml.maxBatchSize,
        epochs: this.limits.ml.maxEpochs,
        validationSplit: 0.2,
        shuffle: true,
        verbose: 0 // Reduce logging overhead
      }
    };
  }

  /**
   * Get Ray Tune configuration for i3 hardware
   */
  getRayTuneConfig(): any {
    return {
      num_samples: this.limits.optimization.maxTrials,
      max_concurrent_trials: this.limits.optimization.maxConcurrentOptimizations,
      timeout: this.limits.optimization.timeoutMinutes * 60, // Convert to seconds
      resources_per_trial: {
        cpu: 1,
        gpu: 0 // No GPU
      },
      config: {
        population_size: this.limits.optimization.populationSize
      }
    };
  }

  /**
   * Start ML operation (tracking)
   */
  startMLOperation(operationId: string): boolean {
    if (!this.canStartMLOperation()) {
      return false;
    }

    this.currentUsage.activeMLJobs++;
    console.log(`🚀 ML operation ${operationId} started (${this.currentUsage.activeMLJobs}/${this.limits.ml.maxConcurrentModels})`);
    return true;
  }

  /**
   * End ML operation (tracking)
   */
  endMLOperation(operationId: string): void {
    this.currentUsage.activeMLJobs = Math.max(0, this.currentUsage.activeMLJobs - 1);
    console.log(`✅ ML operation ${operationId} completed (${this.currentUsage.activeMLJobs}/${this.limits.ml.maxConcurrentModels})`);
  }

  /**
   * Start optimization operation (tracking)
   */
  startOptimization(optimizationId: string): boolean {
    if (!this.canStartOptimization()) {
      return false;
    }

    this.currentUsage.activeOptimizations++;
    console.log(`🚀 Optimization ${optimizationId} started (${this.currentUsage.activeOptimizations}/${this.limits.optimization.maxConcurrentOptimizations})`);
    return true;
  }

  /**
   * End optimization operation (tracking)
   */
  endOptimization(optimizationId: string): void {
    this.currentUsage.activeOptimizations = Math.max(0, this.currentUsage.activeOptimizations - 1);
    console.log(`✅ Optimization ${optimizationId} completed (${this.currentUsage.activeOptimizations}/${this.limits.optimization.maxConcurrentOptimizations})`);
  }

  /**
   * Add throttling delay for CPU relief
   */
  async throttle(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.limits.general.throttleDelayMs));
  }

  /**
   * Update current resource usage
   */
  updateUsage(cpu: number, memoryMB: number): void {
    this.currentUsage.cpu = cpu;
    this.currentUsage.memory = memoryMB;
  }

  /**
   * Get current status
   */
  getStatus(): any {
    return {
      limits: this.limits,
      currentUsage: this.currentUsage,
      canStartML: this.canStartMLOperation(),
      canStartOptimization: this.canStartOptimization(),
      resourceUtilization: {
        cpu: `${this.currentUsage.cpu.toFixed(1)}%`,
        memory: `${this.currentUsage.memory}MB`,
        mlJobs: `${this.currentUsage.activeMLJobs}/${this.limits.ml.maxConcurrentModels}`,
        optimizations: `${this.currentUsage.activeOptimizations}/${this.limits.optimization.maxConcurrentOptimizations}`
      }
    };
  }

  /**
   * Force wait for resources to be available
   */
  async waitForResources(type: 'ml' | 'optimization', timeoutMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const canStart = type === 'ml' ? this.canStartMLOperation() : this.canStartOptimization();
      
      if (canStart) {
        return true;
      }
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`⏰ Timeout waiting for ${type} resources`);
    return false;
  }

  /**
   * Emergency resource cleanup
   */
  emergencyCleanup(): void {
    console.log('🚨 Emergency resource cleanup triggered');
    
    // Reset all counters (this would force stop active operations in real implementation)
    this.currentUsage.activeMLJobs = 0;
    this.currentUsage.activeOptimizations = 0;
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log('🗑️ Forced garbage collection');
    }
    
    console.log('✅ Emergency cleanup completed');
  }
}

export default ResourceLimiter;

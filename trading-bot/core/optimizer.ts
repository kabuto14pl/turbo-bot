/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * Parameter configuration for optimization
 */
export interface ParameterConfig {
    /** Type of parameter */
    type: 'integer' | 'float' | 'number' | 'categorical';
    /** Minimum value (for numeric types) */
    min?: number;
    /** Maximum value (for numeric types) */
    max?: number;
    /** Possible values (for categorical type) */
    values?: any[];
    /** Default value */
    default?: any;
}

/**
 * Configuration for optimization
 */
export interface OptimizationConfig {
    /** Name of the strategy to optimize */
    strategyName: string;
    /** Parameters to optimize */
    parameters: Record<string, ParameterConfig>;
    /** Number of trials to run */
    numTrials?: number;
    /** Metric to optimize */
    optimizationMetric?: string;
    /** Optimization mode ('max' or 'min') */
    optimizationMode?: 'max' | 'min';
    /** Number of parallel workers */
    numWorkers?: number;
    /** Output directory for results */
    outputDir?: string;
}

/**
 * Metrics from an optimization trial
 */
export interface OptimizationMetrics {
    [key: string]: number;
}

/**
 * Parameters from an optimization trial
 */
export interface OptimizationParameters {
    [key: string]: any;
}

/**
 * A single optimization trial
 */
export interface OptimizationTrial {
    /** Parameters used for the trial */
    parameters: OptimizationParameters;
    /** Metrics achieved by the trial */
    metrics: OptimizationMetrics;
    /** Trial ID */
    trial_id: number | string;
}

/**
 * Results from an optimization run
 */
export interface OptimizationResult {
    /** Best parameters found */
    bestParameters: OptimizationParameters;
    /** Metrics achieved by the best parameters */
    bestMetrics: OptimizationMetrics;
    /** All trials */
    allTrials: OptimizationTrial[];
    /** Number of completed trials */
    completedTrials: number;
    /** Runtime in seconds */
    runtimeSeconds: number;
    /** Timestamp of when the optimization was completed */
    timestamp: number;
    /** Name of the strategy that was optimized */
    strategyName: string;
}

/**
 * Interface for optimization implementations
 */
export interface IOptimizer {
    /**
     * Run optimization with the given configuration
     * @param config Optimization configuration
     * @returns Promise resolving to optimization results
     */
    runOptimization(config: OptimizationConfig): Promise<OptimizationResult>;
}

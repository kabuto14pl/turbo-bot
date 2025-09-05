/**
 * 🚀 OPTIMIZATION CONFIGURATION SYSTEM
 * Centralized configuration for Ray Tune and Optuna optimization
 */

export interface OptimizationConfig {
    backend?: 'ray' | 'optuna' | 'hybrid';
    ray: {
        pythonPath: string;
        maxConcurrentTrials: number;
        timeoutMinutes: number;
        searchAlgorithm: 'random' | 'grid' | 'bayesian' | 'asha';
        tuneConfig: {
            numSamples: number;
            maxT: number;
            gracePeriod: number;
            reductionFactor: number;
        };
        resources: {
            cpuPerTrial: number;
            gpuPerTrial: number;
            memoryMb: number;
        };
    };
    optuna: {
        studyName: string;
        storageUrl: string;
        sampler: 'TPE' | 'Random' | 'CmaEs' | 'PartialFixed';
        pruner: 'MedianPruner' | 'SuccessiveHalvingPruner' | 'HyperbandPruner';
        nTrials: number;
        timeoutSeconds: number;
        nJobs: number;
    };
    hybrid: {
        useRayFirst: boolean;
        fallbackToOptuna: boolean;
        parallelExecution: boolean;
        convergenceThreshold: number;
        maxIterations: number;
    };
    performance: {
        metrics: string[];
        primaryMetric: string;
        optimizationMode: 'min' | 'max';
        convergencePatience: number;
        minTrialsForConvergence: number;
    };
    resources: {
        maxMemoryMb: number;
        maxCpuCores: number;
        timeoutMinutes: number;
        enableGpu: boolean;
    };
    strategies: {
        [strategyName: string]: {
            parameters: Record<string, ParameterConfig>;
            priority: number;
            optimizationFrequency: number;
        };
    };
}

export interface ParameterConfig {
    type: 'float' | 'int' | 'categorical' | 'discrete';
    range?: [number, number];
    values?: any[];
    default: any;
    importance: 'low' | 'medium' | 'high';
    distribution?: 'uniform' | 'log_uniform' | 'normal';
}

export interface SchedulerConfig {
    performanceThreshold: number;
    optimizationInterval: number;
    maxConcurrentTasks: number;
    emergencyOptimization: boolean;
    adaptivePriority: boolean;
    resourceLimits: {
        maxMemory: number;
        maxCpu: number;
        timeoutMinutes: number;
    };
    adaptiveConfig: {
        performanceWindowSize: number;
        improvementThreshold: number;
        autoOptimizationTrigger: boolean;
        resourceScaling: boolean;
    };
}

// Default configuration for Ray Tune optimization
export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
    backend: 'ray',
    ray: {
        pythonPath: process.env.PYTHON_PATH || 'python3',
        maxConcurrentTrials: 4,
        timeoutMinutes: 30,
        searchAlgorithm: 'bayesian',
        tuneConfig: {
            numSamples: 100,
            maxT: 100,
            gracePeriod: 10,
            reductionFactor: 2
        },
        resources: {
            cpuPerTrial: 1,
            gpuPerTrial: 0,
            memoryMb: 2048
        }
    },
    optuna: {
        studyName: 'trading_bot_optimization',
        storageUrl: 'sqlite:///optimization.db',
        sampler: 'TPE',
        pruner: 'MedianPruner',
        nTrials: 100,
        timeoutSeconds: 1800, // 30 minutes
        nJobs: 4
    },
    hybrid: {
        useRayFirst: true,
        fallbackToOptuna: true,
        parallelExecution: false,
        convergenceThreshold: 0.01,
        maxIterations: 200
    },
    performance: {
        metrics: ['sharpe_ratio', 'total_return', 'max_drawdown', 'win_rate'],
        primaryMetric: 'sharpe_ratio',
        optimizationMode: 'max',
        convergencePatience: 10,
        minTrialsForConvergence: 20
    },
    resources: {
        maxMemoryMb: 8192,
        maxCpuCores: 8,
        timeoutMinutes: 60,
        enableGpu: false
    },
    strategies: {
        'RSI_Strategy': {
            parameters: {
                rsiPeriod: {
                    type: 'int',
                    range: [5, 50],
                    default: 14,
                    importance: 'high',
                    distribution: 'uniform'
                },
                overboughtLevel: {
                    type: 'float',
                    range: [65, 85],
                    default: 70,
                    importance: 'medium',
                    distribution: 'uniform'
                },
                oversoldLevel: {
                    type: 'float',
                    range: [15, 35],
                    default: 30,
                    importance: 'medium',
                    distribution: 'uniform'
                }
            },
            priority: 1,
            optimizationFrequency: 7 // days
        },
        'MACD_Strategy': {
            parameters: {
                fastPeriod: {
                    type: 'int',
                    range: [8, 16],
                    default: 12,
                    importance: 'high',
                    distribution: 'uniform'
                },
                slowPeriod: {
                    type: 'int',
                    range: [20, 35],
                    default: 26,
                    importance: 'high',
                    distribution: 'uniform'
                },
                signalPeriod: {
                    type: 'int',
                    range: [5, 15],
                    default: 9,
                    importance: 'medium',
                    distribution: 'uniform'
                }
            },
            priority: 1,
            optimizationFrequency: 7
        },
        'Bollinger_Bands': {
            parameters: {
                period: {
                    type: 'int',
                    range: [10, 30],
                    default: 20,
                    importance: 'high',
                    distribution: 'uniform'
                },
                multiplier: {
                    type: 'float',
                    range: [1.5, 3.0],
                    default: 2.0,
                    importance: 'medium',
                    distribution: 'uniform'
                }
            },
            priority: 2,
            optimizationFrequency: 14
        }
    }
};

// Scheduler configuration
export const SCHEDULER_CONFIG: SchedulerConfig = {
    performanceThreshold: 0.1, // 10% improvement threshold
    optimizationInterval: 3600000, // 1 hour in milliseconds
    maxConcurrentTasks: 3,
    emergencyOptimization: true,
    adaptivePriority: true,
    resourceLimits: {
        maxMemory: 6144, // 6GB
        maxCpu: 80, // 80% CPU utilization
        timeoutMinutes: 45
    },
    adaptiveConfig: {
        performanceWindowSize: 100, // last 100 trades
        improvementThreshold: 0.05, // 5%
        autoOptimizationTrigger: true,
        resourceScaling: true
    }
};

// Strategy-specific optimization profiles
export const STRATEGY_OPTIMIZATION_PROFILES = {
    conservative: {
        maxTrials: 50,
        timeoutMinutes: 15,
        convergenceThreshold: 0.02
    },
    moderate: {
        maxTrials: 100,
        timeoutMinutes: 30,
        convergenceThreshold: 0.01
    },
    aggressive: {
        maxTrials: 200,
        timeoutMinutes: 60,
        convergenceThreshold: 0.005
    }
};

// Parameter space definitions for different strategy types
export const PARAMETER_SPACES = {
    trend_following: {
        lookback_period: { type: 'int', range: [5, 50] },
        momentum_threshold: { type: 'float', range: [0.1, 0.5] },
        stop_loss: { type: 'float', range: [0.02, 0.10] }
    },
    mean_reversion: {
        reversion_period: { type: 'int', range: [10, 100] },
        deviation_threshold: { type: 'float', range: [1.0, 3.0] },
        position_size: { type: 'float', range: [0.1, 1.0] }
    },
    momentum: {
        momentum_period: { type: 'int', range: [5, 25] },
        acceleration_factor: { type: 'float', range: [0.01, 0.1] },
        volatility_filter: { type: 'float', range: [0.5, 2.0] }
    }
};

export default {
    DEFAULT_OPTIMIZATION_CONFIG,
    SCHEDULER_CONFIG,
    STRATEGY_OPTIMIZATION_PROFILES,
    PARAMETER_SPACES
};

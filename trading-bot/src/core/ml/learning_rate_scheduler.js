"use strict";
/**
 * 📅 LEARNING RATE SCHEDULER SYSTEM
 * Advanced learning rate scheduling for optimal Deep RL training
 * Implements multiple scheduling strategies with adaptive mechanisms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SCHEDULER_CONFIGS = exports.MultiSchedulerManager = exports.SchedulerFactory = exports.LearningRateScheduler = void 0;
const logger_1 = require("../../../core/utils/logger");
class LearningRateScheduler {
    constructor(config) {
        this.initial_metric = -Infinity;
        this.config = {
            // Default values
            T_max: 1000,
            eta_min: 1e-6,
            decay_rate: 0.96,
            decay_steps: 100,
            step_size: 100,
            gamma: 0.1,
            power: 1.0,
            end_lr: 1e-6,
            base_lr: 1e-5,
            max_lr: 1e-2,
            step_size_up: 2000,
            step_size_down: 2000,
            mode: 'triangular',
            warmup_steps: 1000,
            warmup_init_lr: 1e-7,
            patience: 10,
            factor: 0.5,
            threshold: 1e-4,
            cooldown: 0,
            min_lr: 1e-7,
            adaptive_window: 50,
            improvement_threshold: 0.01,
            increase_factor: 1.1,
            decrease_factor: 0.9,
            ...config
        };
        this.state = {
            current_lr: this.config.initial_lr,
            step: 0,
            epoch: 0,
            best_metric: -Infinity,
            plateau_count: 0,
            cooldown_count: 0,
            cycle_position: 0,
            warmup_complete: false,
            lr_history: [this.config.initial_lr],
            metric_history: [],
            step_history: [0],
            recent_improvements: [],
            moving_average_metric: 0,
            learning_rate_momentum: 0
        };
        this.logger = new logger_1.Logger();
        this.logger.info(`📅 Learning Rate Scheduler initialized: ${this.config.scheduler_type}`);
    }
    /**
     * 🔄 UPDATE LEARNING RATE
     * Main function to update learning rate based on scheduler type
     */
    updateLearningRate(metric) {
        this.state.step++;
        // Update metric history
        if (metric !== undefined) {
            this.state.metric_history.push(metric);
            this.updateAdaptiveState(metric);
        }
        // Calculate new learning rate based on scheduler type
        let new_lr;
        switch (this.config.scheduler_type) {
            case 'cosine':
                new_lr = this.cosineAnnealing();
                break;
            case 'exponential':
                new_lr = this.exponentialDecay();
                break;
            case 'step':
                new_lr = this.stepDecay();
                break;
            case 'polynomial':
                new_lr = this.polynomialDecay();
                break;
            case 'cyclic':
                new_lr = this.cyclicLearningRate();
                break;
            case 'warmup_cosine':
                new_lr = this.warmupCosineAnnealing();
                break;
            case 'plateau':
                new_lr = this.plateauReduction(metric);
                break;
            case 'adaptive':
                new_lr = this.adaptiveScheduling(metric);
                break;
            default:
                new_lr = this.config.initial_lr;
        }
        // Apply bounds
        new_lr = Math.max(this.config.min_lr || 1e-7, Math.min(new_lr, this.config.max_lr || 1));
        this.state.current_lr = new_lr;
        this.state.lr_history.push(new_lr);
        this.state.step_history.push(this.state.step);
        // Log significant changes
        if (this.state.lr_history.length > 1) {
            const prev_lr = this.state.lr_history[this.state.lr_history.length - 2];
            const change_ratio = Math.abs(new_lr - prev_lr) / prev_lr;
            if (change_ratio > 0.1) {
                this.logger.info(`📅 Learning rate updated: ${prev_lr.toExponential(3)} → ${new_lr.toExponential(3)}`);
            }
        }
        return new_lr;
    }
    /**
     * 🌊 COSINE ANNEALING
     * Cosine annealing learning rate schedule
     */
    cosineAnnealing() {
        const T_cur = this.state.step % this.config.T_max;
        const lr = this.config.eta_min +
            (this.config.initial_lr - this.config.eta_min) *
                (1 + Math.cos(Math.PI * T_cur / this.config.T_max)) / 2;
        return lr;
    }
    /**
     * 📉 EXPONENTIAL DECAY
     * Exponential learning rate decay
     */
    exponentialDecay() {
        const decay_factor = Math.pow(this.config.decay_rate, Math.floor(this.state.step / this.config.decay_steps));
        return this.config.initial_lr * decay_factor;
    }
    /**
     * 📊 STEP DECAY
     * Step-wise learning rate decay
     */
    stepDecay() {
        const step_factor = Math.pow(this.config.gamma, Math.floor(this.state.step / this.config.step_size));
        return this.config.initial_lr * step_factor;
    }
    /**
     * 📈 POLYNOMIAL DECAY
     * Polynomial learning rate decay
     */
    polynomialDecay() {
        if (this.state.step >= this.config.T_max) {
            return this.config.end_lr;
        }
        const decay_factor = Math.pow(1 - this.state.step / this.config.T_max, this.config.power);
        return (this.config.initial_lr - this.config.end_lr) * decay_factor + this.config.end_lr;
    }
    /**
     * 🔄 CYCLIC LEARNING RATE
     * Cyclic learning rate with triangular, triangular2, or exponential modes
     */
    cyclicLearningRate() {
        const cycle_length = this.config.step_size_up + this.config.step_size_down;
        const cycle_position = this.state.step % cycle_length;
        let lr;
        if (cycle_position <= this.config.step_size_up) {
            // Ascending phase
            const x = cycle_position / this.config.step_size_up;
            switch (this.config.mode) {
                case 'triangular':
                    lr = this.config.base_lr + (this.config.max_lr - this.config.base_lr) * x;
                    break;
                case 'triangular2':
                    lr = this.config.base_lr +
                        (this.config.max_lr - this.config.base_lr) * x /
                            Math.pow(2, Math.floor(this.state.step / cycle_length));
                    break;
                case 'exp_range':
                    lr = this.config.base_lr +
                        (this.config.max_lr - this.config.base_lr) * x *
                            Math.pow(this.config.gamma, this.state.step);
                    break;
                default:
                    lr = this.config.base_lr + (this.config.max_lr - this.config.base_lr) * x;
            }
        }
        else {
            // Descending phase
            const x = (cycle_length - cycle_position) / this.config.step_size_down;
            switch (this.config.mode) {
                case 'triangular':
                    lr = this.config.base_lr + (this.config.max_lr - this.config.base_lr) * x;
                    break;
                case 'triangular2':
                    lr = this.config.base_lr +
                        (this.config.max_lr - this.config.base_lr) * x /
                            Math.pow(2, Math.floor(this.state.step / cycle_length));
                    break;
                case 'exp_range':
                    lr = this.config.base_lr +
                        (this.config.max_lr - this.config.base_lr) * x *
                            Math.pow(this.config.gamma, this.state.step);
                    break;
                default:
                    lr = this.config.base_lr + (this.config.max_lr - this.config.base_lr) * x;
            }
        }
        return lr;
    }
    /**
     * 🔥 WARMUP COSINE ANNEALING
     * Cosine annealing with linear warmup
     */
    warmupCosineAnnealing() {
        if (this.state.step < this.config.warmup_steps) {
            // Linear warmup phase
            const warmup_lr = this.config.warmup_init_lr +
                (this.config.initial_lr - this.config.warmup_init_lr) *
                    this.state.step / this.config.warmup_steps;
            return warmup_lr;
        }
        else {
            // Cosine annealing phase
            if (!this.state.warmup_complete) {
                this.state.warmup_complete = true;
                this.logger.info('🔥 Warmup phase completed, starting cosine annealing');
            }
            const T_cur = (this.state.step - this.config.warmup_steps) %
                (this.config.T_max - this.config.warmup_steps);
            const T_max_adjusted = this.config.T_max - this.config.warmup_steps;
            const lr = this.config.eta_min +
                (this.config.initial_lr - this.config.eta_min) *
                    (1 + Math.cos(Math.PI * T_cur / T_max_adjusted)) / 2;
            return lr;
        }
    }
    /**
     * 📉 PLATEAU REDUCTION
     * Reduce learning rate on metric plateau
     */
    plateauReduction(metric) {
        if (metric === undefined) {
            return this.state.current_lr;
        }
        // Check for improvement
        const is_better = metric > this.state.best_metric + this.config.threshold;
        if (is_better) {
            this.state.best_metric = metric;
            this.state.plateau_count = 0;
        }
        else {
            this.state.plateau_count++;
        }
        // Handle cooldown
        if (this.state.cooldown_count > 0) {
            this.state.cooldown_count--;
            return this.state.current_lr;
        }
        // Check if plateau reached
        if (this.state.plateau_count >= this.config.patience) {
            const new_lr = this.state.current_lr * this.config.factor;
            const bounded_lr = Math.max(new_lr, this.config.min_lr);
            if (bounded_lr < this.state.current_lr) {
                this.state.plateau_count = 0;
                this.state.cooldown_count = this.config.cooldown;
                this.logger.info(`📉 Plateau detected, reducing learning rate: ${this.state.current_lr.toExponential(3)} → ${bounded_lr.toExponential(3)}`);
                return bounded_lr;
            }
        }
        return this.state.current_lr;
    }
    /**
     * 🧠 ADAPTIVE SCHEDULING
     * Adaptive learning rate based on training dynamics
     */
    adaptiveScheduling(metric) {
        if (metric === undefined) {
            return this.state.current_lr;
        }
        // Update moving average
        if (this.state.metric_history.length === 1) {
            this.state.moving_average_metric = metric;
        }
        else {
            const alpha = 0.1; // Smoothing factor
            this.state.moving_average_metric = alpha * metric + (1 - alpha) * this.state.moving_average_metric;
        }
        // Calculate recent improvement
        const window_size = Math.min(this.config.adaptive_window, this.state.metric_history.length);
        if (window_size < 5) {
            return this.state.current_lr; // Not enough data
        }
        const recent_metrics = this.state.metric_history.slice(-window_size);
        const improvement = (recent_metrics[recent_metrics.length - 1] - recent_metrics[0]) / window_size;
        this.state.recent_improvements.push(improvement);
        if (this.state.recent_improvements.length > window_size) {
            this.state.recent_improvements.shift();
        }
        // Calculate improvement trend
        const avg_improvement = this.state.recent_improvements.reduce((a, b) => a + b, 0) / this.state.recent_improvements.length;
        // Adaptive decision
        let lr_adjustment = 1.0;
        if (avg_improvement > this.config.improvement_threshold) {
            // Good progress, potentially increase learning rate
            lr_adjustment = this.config.increase_factor;
            this.logger.debug(`🚀 Good progress detected, increasing learning rate`);
        }
        else if (avg_improvement < -this.config.improvement_threshold) {
            // Poor progress, decrease learning rate
            lr_adjustment = this.config.decrease_factor;
            this.logger.debug(`🐌 Poor progress detected, decreasing learning rate`);
        }
        // Apply momentum to learning rate changes
        this.state.learning_rate_momentum = 0.9 * this.state.learning_rate_momentum + 0.1 * lr_adjustment;
        const new_lr = this.state.current_lr * this.state.learning_rate_momentum;
        return new_lr;
    }
    /**
     * 📊 UPDATE ADAPTIVE STATE
     * Update internal state for adaptive scheduling
     */
    updateAdaptiveState(metric) {
        // Track best metric
        if (metric > this.state.best_metric) {
            this.state.best_metric = metric;
        }
        // Initialize first metric
        if (this.initial_metric === -Infinity) {
            this.initial_metric = metric;
        }
    }
    /**
     * 📈 GET SCHEDULER STATUS
     * Get current status and statistics
     */
    getStatus() {
        const total_steps = this.config.T_max || 1000;
        const progress = Math.min(this.state.step / total_steps, 1.0);
        return {
            current_lr: this.state.current_lr,
            step: this.state.step,
            scheduler_type: this.config.scheduler_type,
            progress,
            stats: {
                lr_min: Math.min(...this.state.lr_history),
                lr_max: Math.max(...this.state.lr_history),
                lr_variance: this.calculateVariance(this.state.lr_history),
                best_metric: this.state.best_metric,
                plateau_count: this.state.plateau_count,
                warmup_complete: this.state.warmup_complete,
                moving_average_metric: this.state.moving_average_metric
            }
        };
    }
    /**
     * 📊 GET LEARNING RATE HISTORY
     * Return learning rate history for visualization
     */
    getLearningRateHistory() {
        return {
            steps: [...this.state.step_history],
            learning_rates: [...this.state.lr_history],
            metrics: [...this.state.metric_history]
        };
    }
    /**
     * 🎯 RESET SCHEDULER
     * Reset scheduler to initial state
     */
    reset() {
        this.state = {
            current_lr: this.config.initial_lr,
            step: 0,
            epoch: 0,
            best_metric: -Infinity,
            plateau_count: 0,
            cooldown_count: 0,
            cycle_position: 0,
            warmup_complete: false,
            lr_history: [this.config.initial_lr],
            metric_history: [],
            step_history: [0],
            recent_improvements: [],
            moving_average_metric: 0,
            learning_rate_momentum: 0
        };
        this.initial_metric = -Infinity;
        this.logger.info('🔄 Learning rate scheduler reset');
    }
    /**
     * 💾 SAVE SCHEDULER STATE
     * Save current scheduler state
     */
    saveState() {
        return {
            config: this.config,
            state: this.state,
            initial_metric: this.initial_metric
        };
    }
    /**
     * 📁 LOAD SCHEDULER STATE
     * Load scheduler state from saved data
     */
    loadState(saved_state) {
        this.config = saved_state.config;
        this.state = saved_state.state;
        this.initial_metric = saved_state.initial_metric;
        this.logger.info('📁 Learning rate scheduler state loaded');
    }
    // =================== UTILITY METHODS ===================
    calculateVariance(values) {
        if (values.length < 2)
            return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
        return variance;
    }
}
exports.LearningRateScheduler = LearningRateScheduler;
/**
 * 🏭 SCHEDULER FACTORY
 * Factory for creating different types of schedulers
 */
class SchedulerFactory {
    /**
     * Create cosine annealing scheduler
     */
    static createCosineScheduler(initial_lr, T_max, eta_min = 1e-6) {
        return new LearningRateScheduler({
            scheduler_type: 'cosine',
            initial_lr,
            T_max,
            eta_min
        });
    }
    /**
     * Create exponential decay scheduler
     */
    static createExponentialScheduler(initial_lr, decay_rate = 0.96, decay_steps = 100) {
        return new LearningRateScheduler({
            scheduler_type: 'exponential',
            initial_lr,
            decay_rate,
            decay_steps
        });
    }
    /**
     * Create cyclic learning rate scheduler
     */
    static createCyclicScheduler(base_lr, max_lr, step_size_up = 2000, mode = 'triangular') {
        return new LearningRateScheduler({
            scheduler_type: 'cyclic',
            initial_lr: base_lr,
            base_lr,
            max_lr,
            step_size_up,
            step_size_down: step_size_up,
            mode
        });
    }
    /**
     * Create warmup cosine scheduler
     */
    static createWarmupCosineScheduler(initial_lr, warmup_steps, T_max, eta_min = 1e-6, warmup_init_lr = 1e-7) {
        return new LearningRateScheduler({
            scheduler_type: 'warmup_cosine',
            initial_lr,
            warmup_steps,
            T_max,
            eta_min,
            warmup_init_lr
        });
    }
    /**
     * Create plateau scheduler
     */
    static createPlateauScheduler(initial_lr, patience = 10, factor = 0.5, threshold = 1e-4, min_lr = 1e-7) {
        return new LearningRateScheduler({
            scheduler_type: 'plateau',
            initial_lr,
            patience,
            factor,
            threshold,
            min_lr
        });
    }
    /**
     * Create adaptive scheduler
     */
    static createAdaptiveScheduler(initial_lr, adaptive_window = 50, improvement_threshold = 0.01, increase_factor = 1.1, decrease_factor = 0.9) {
        return new LearningRateScheduler({
            scheduler_type: 'adaptive',
            initial_lr,
            adaptive_window,
            improvement_threshold,
            increase_factor,
            decrease_factor
        });
    }
}
exports.SchedulerFactory = SchedulerFactory;
/**
 * 📊 MULTI-SCHEDULER MANAGER
 * Manages multiple schedulers for different components
 */
class MultiSchedulerManager {
    constructor() {
        this.schedulers = new Map();
        this.logger = new logger_1.Logger();
        this.logger.info('📊 Multi-Scheduler Manager initialized');
    }
    /**
     * Add scheduler for specific component
     */
    addScheduler(name, scheduler) {
        this.schedulers.set(name, scheduler);
        this.logger.info(`📅 Added scheduler for ${name}`);
    }
    /**
     * Update all schedulers
     */
    updateAll(metrics) {
        const learning_rates = {};
        for (const [name, scheduler] of this.schedulers) {
            const metric = metrics?.[name];
            const lr = scheduler.updateLearningRate(metric);
            learning_rates[name] = lr;
        }
        return learning_rates;
    }
    /**
     * Get all current learning rates
     */
    getCurrentLearningRates() {
        const learning_rates = {};
        for (const [name, scheduler] of this.schedulers) {
            const status = scheduler.getStatus();
            learning_rates[name] = status.current_lr;
        }
        return learning_rates;
    }
    /**
     * Get status of all schedulers
     */
    getAllStatus() {
        const statuses = {};
        for (const [name, scheduler] of this.schedulers) {
            statuses[name] = scheduler.getStatus();
        }
        return statuses;
    }
    /**
     * Reset all schedulers
     */
    resetAll() {
        for (const [name, scheduler] of this.schedulers) {
            scheduler.reset();
        }
        this.logger.info('🔄 All schedulers reset');
    }
}
exports.MultiSchedulerManager = MultiSchedulerManager;
/**
 * 🚀 DEFAULT SCHEDULER CONFIGURATIONS
 */
exports.DEFAULT_SCHEDULER_CONFIGS = {
    POLICY_SCHEDULER: {
        scheduler_type: 'warmup_cosine',
        initial_lr: 3e-4,
        warmup_steps: 1000,
        T_max: 50000,
        eta_min: 1e-6,
        warmup_init_lr: 1e-7
    },
    VALUE_SCHEDULER: {
        scheduler_type: 'cosine',
        initial_lr: 1e-3,
        T_max: 50000,
        eta_min: 1e-6
    },
    ADAPTIVE_SCHEDULER: {
        scheduler_type: 'adaptive',
        initial_lr: 3e-4,
        adaptive_window: 100,
        improvement_threshold: 0.01,
        increase_factor: 1.05,
        decrease_factor: 0.95
    }
};

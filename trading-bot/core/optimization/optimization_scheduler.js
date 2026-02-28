"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🚀 COMPREHENSIVE OPTIMIZATION SCHEDULER
 * Centralizes Ray Tune and Optuna optimization management
 * Implements adaptive optimization cycles with performance-based triggers
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
exports.OptimizationScheduler = void 0;
const events_1 = require("events");
const path = __importStar(require("path"));
const perf_hooks_1 = require("perf_hooks");
const logger_1 = require("../utils/logger");
const performance_tracker_1 = require("../analysis/performance_tracker");
const optimization_tools_adapter_1 = require("./optimization_tools_adapter");
const optimization_config_1 = require("./optimization_config");
class OptimizationScheduler extends events_1.EventEmitter {
    constructor(adaptiveConfig = {}, performanceTracker) {
        super();
        this.taskQueue = [];
        this.runningTasks = new Map();
        this.completedTasks = [];
        this.isRunning = false;
        this.logger = new logger_1.Logger();
        this.performanceTracker = performanceTracker || new performance_tracker_1.PerformanceTracker();
        this.toolsPath = path.join(process.cwd(), 'tools');
        this.toolsAdapter = new optimization_tools_adapter_1.OptimizationToolsAdapter(this.toolsPath);
        // Initialize adaptive configuration with defaults from config
        this.adaptiveConfig = {
            ...optimization_config_1.SCHEDULER_CONFIG,
            ...adaptiveConfig
        };
        // Initialize metrics
        this.metrics = {
            totalOptimizations: 0,
            successfulOptimizations: 0,
            averageImprovement: 0,
            totalExecutionTime: 0,
            resourceUtilization: {
                cpu: 0,
                memory: 0
            }
        };
        this.setupEventHandlers();
    }
    /**
     * Start the optimization scheduler
     */
    async start() {
        if (this.isRunning) {
            this.logger.warn('Optimization scheduler is already running');
            return;
        }
        this.logger.info('Starting optimization scheduler...');
        this.isRunning = true;
        // Start main scheduler loop
        this.schedulerInterval = setInterval(() => {
            this.processTaskQueue().catch(error => {
                this.logger.error('Error in scheduler loop:', error);
            });
        }, 5000); // Check every 5 seconds
        // Start performance monitoring
        this.performanceMonitor = setInterval(() => {
            this.monitorPerformance().catch(error => {
                this.logger.error('Error in performance monitoring:', error);
            });
        }, this.adaptiveConfig.optimizationInterval);
        this.emit('started');
        this.logger.info('Optimization scheduler started successfully');
    }
    /**
     * Stop the optimization scheduler
     */
    async stop() {
        if (!this.isRunning) {
            this.logger.warn('Optimization scheduler is not running');
            return;
        }
        this.logger.info('Stopping optimization scheduler...');
        this.isRunning = false;
        // Clear intervals
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = undefined;
        }
        if (this.performanceMonitor) {
            clearInterval(this.performanceMonitor);
            this.performanceMonitor = undefined;
        }
        // Stop running tasks gracefully
        await this.stopAllTasks();
        this.emit('stopped');
        this.logger.info('Optimization scheduler stopped');
    }
    /**
     * Schedule optimization task
     */
    async scheduleOptimization(strategy, type = 'hybrid', parameters = {}, priority = 5) {
        const task = {
            id: this.generateTaskId(),
            type,
            strategy,
            parameters: { ...optimization_config_1.DEFAULT_OPTIMIZATION_CONFIG, ...parameters },
            status: 'pending',
            priority,
            createdAt: new Date()
        };
        // Insert task in priority order
        const insertIndex = this.taskQueue.findIndex(t => t.priority < priority);
        if (insertIndex === -1) {
            this.taskQueue.push(task);
        }
        else {
            this.taskQueue.splice(insertIndex, 0, task);
        }
        this.logger.info(`Scheduled ${type} optimization for ${strategy} (Priority: ${priority})`);
        this.emit('taskScheduled', task);
        return task.id;
    }
    /**
     * Process task queue
     */
    async processTaskQueue() {
        if (!this.isRunning || this.taskQueue.length === 0)
            return;
        // Check concurrent task limit
        if (this.runningTasks.size >= this.adaptiveConfig.maxConcurrentTasks) {
            return;
        }
        // Get next high-priority pending task
        const taskIndex = this.taskQueue.findIndex(t => t.status === 'pending');
        if (taskIndex === -1)
            return;
        const task = this.taskQueue[taskIndex];
        this.taskQueue.splice(taskIndex, 1);
        try {
            await this.executeTask(task);
        }
        catch (error) {
            this.logger.error(`Failed to execute task ${task.id}:`, error);
            task.status = 'failed';
            this.emit('taskFailed', { task, error });
        }
    }
    /**
     * Execute optimization task
     */
    async executeTask(task) {
        task.status = 'running';
        task.startedAt = new Date();
        this.logger.info(`Executing ${task.type} optimization for ${task.strategy}`);
        this.emit('taskStarted', task);
        const startTime = perf_hooks_1.performance.now();
        try {
            // Execute through tools adapter
            const adapterTask = {
                id: task.id,
                type: task.type,
                strategy: task.strategy,
                parameters: task.parameters,
                config: {
                    ...optimization_config_1.DEFAULT_OPTIMIZATION_CONFIG,
                    ...task.parameters,
                    backend: task.type
                },
                priority: task.priority,
                createdAt: task.createdAt
            };
            const result = await this.toolsAdapter.executeRayOptimization(adapterTask);
            // Update task with results (using result directly from adapter)
            task.result = {
                ...result,
                executionTime: perf_hooks_1.performance.now() - startTime
            };
            task.status = 'completed';
            task.completedAt = new Date();
            // Update metrics
            this.updateMetrics(task);
            this.completedTasks.push(task);
            this.emit('taskCompleted', task);
            this.logger.info(`Optimization completed for ${task.strategy}: ` +
                `Score=${task.result.bestScore}, Time=${Math.round(task.result.executionTime)}ms`);
        }
        catch (error) {
            task.status = 'failed';
            task.completedAt = new Date();
            this.logger.error(`Optimization failed for ${task.strategy}:`, error);
            this.emit('taskFailed', { task, error });
            throw error;
        }
    }
    /**
     * Monitor performance and trigger adaptive optimizations
     */
    async monitorPerformance() {
        try {
            const currentPerformance = await this.performanceTracker.calculateMetrics();
            if (!currentPerformance)
                return;
            // Check if performance dropped below threshold
            const sharpeRatio = currentPerformance.sharpeRatio || 0;
            if (sharpeRatio < this.adaptiveConfig.performanceThreshold) {
                this.logger.warn(`Performance below threshold: ${sharpeRatio} < ${this.adaptiveConfig.performanceThreshold}`);
                if (this.adaptiveConfig.emergencyOptimization) {
                    await this.triggerEmergencyOptimization(currentPerformance);
                }
            }
            // Adaptive priority adjustment
            if (this.adaptiveConfig.adaptivePriority) {
                this.adjustTaskPriorities(currentPerformance);
            }
        }
        catch (error) {
            this.logger.error('Error in performance monitoring:', error);
        }
    }
    /**
     * Trigger emergency optimization
     */
    async triggerEmergencyOptimization(performanceMetrics) {
        this.logger.warn('Triggering emergency optimization...');
        // Schedule high-priority optimization for underperforming strategies
        const strategies = ['macd', 'rsi', 'bollinger_bands', 'stochastic'];
        for (const strategy of strategies) {
            await this.scheduleOptimization(strategy, 'hybrid', {}, 10); // Max priority
        }
        this.emit('emergencyOptimization', { strategies, performance: performanceMetrics });
    }
    /**
     * Adjust task priorities based on performance
     */
    adjustTaskPriorities(performanceMetrics) {
        this.taskQueue.forEach(task => {
            // Increase priority for strategies that might improve current weaknesses
            if (performanceMetrics.sharpeRatio < 1.0 && task.strategy === 'macd') {
                task.priority = Math.min(10, task.priority + 2);
            }
            if (performanceMetrics.maxDrawdown > 0.2 && task.strategy === 'rsi') {
                task.priority = Math.min(10, task.priority + 1);
            }
        });
        // Re-sort queue by priority
        this.taskQueue.sort((a, b) => b.priority - a.priority);
    }
    /**
     * Stop all running tasks
     */
    async stopAllTasks() {
        const stopPromises = Array.from(this.runningTasks.entries()).map(([taskId, process]) => {
            return new Promise((resolve) => {
                process.on('exit', () => resolve());
                process.kill('SIGTERM');
                // Force kill after timeout
                setTimeout(() => {
                    if (!process.killed) {
                        process.kill('SIGKILL');
                    }
                    resolve();
                }, 5000);
            });
        });
        await Promise.all(stopPromises);
        this.runningTasks.clear();
    }
    /**
     * Update metrics after task completion
     */
    updateMetrics(task) {
        this.metrics.totalOptimizations++;
        if (task.status === 'completed' && task.result) {
            this.metrics.successfulOptimizations++;
            this.metrics.totalExecutionTime += task.result.executionTime;
            // Update average improvement
            const currentAvg = this.metrics.averageImprovement;
            const newImprovement = task.result.convergenceMetrics.improvement;
            this.metrics.averageImprovement =
                (currentAvg * (this.metrics.successfulOptimizations - 1) + newImprovement) /
                    this.metrics.successfulOptimizations;
        }
        // Update resource utilization (simplified)
        this.metrics.resourceUtilization.cpu = this.runningTasks.size * 20; // Estimate
        this.metrics.resourceUtilization.memory = this.runningTasks.size * 512; // MB estimate
    }
    /**
     * Get optimization metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Get current task status
     */
    getTaskStatus() {
        const pending = this.taskQueue.filter(t => t.status === 'pending').length;
        const running = this.taskQueue.filter(t => t.status === 'running').length;
        const completed = this.completedTasks.filter(t => t.status === 'completed').length;
        const failed = this.completedTasks.filter(t => t.status === 'failed').length;
        return { pending, running, completed, failed };
    }
    /**
     * Clear completed tasks (for memory management)
     */
    clearCompletedTasks() {
        this.completedTasks = [];
        this.logger.info('Cleared completed tasks from memory');
    }
    /**
     * Generate unique task ID
     */
    generateTaskId() {
        return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        this.on('taskCompleted', (task) => {
            this.logger.info(`Optimization completed for ${task.strategy} with score: ${task.result?.bestScore}`);
        });
        this.on('taskFailed', ({ task, error }) => {
            this.logger.error(`Optimization failed for ${task.strategy}:`, error.message);
        });
        this.on('emergencyOptimization', ({ strategies, performance }) => {
            this.logger.warn(`Emergency optimization initiated for strategies: ${strategies.join(', ')}`);
        });
    }
}
exports.OptimizationScheduler = OptimizationScheduler;
exports.default = OptimizationScheduler;

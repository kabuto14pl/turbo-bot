"use strict";
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
exports.OptimizationTask = exports.AutoScaler = exports.ResourceMonitor = exports.ParallelOptimizationManager = exports.RayLikeWorkerPool = void 0;
const worker_threads_1 = require("worker_threads");
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Enhanced task for parallel optimization
 */
class OptimizationTask {
    constructor(id, objectiveFunction, // Serialized function
    parameterSpace, algorithm, iterations, priority = 1, timeout = 300000 // 5 minutes default
    ) {
        this.id = id;
        this.objectiveFunction = objectiveFunction;
        this.parameterSpace = parameterSpace;
        this.algorithm = algorithm;
        this.iterations = iterations;
        this.priority = priority;
        this.timeout = timeout;
    }
}
exports.OptimizationTask = OptimizationTask;
/**
 * Worker pool manager with Ray-like functionality
 */
class RayLikeWorkerPool {
    constructor(config = {}) {
        this.workers = new Map();
        this.taskQueue = [];
        this.runningTasks = new Map();
        this.results = new Map();
        this.config = {
            maxWorkers: config.maxWorkers || os.cpus().length,
            autoScale: config.autoScale || true,
            resourceLimits: config.resourceLimits || {
                maxCpuPercent: 80,
                maxMemoryMB: 1024,
                maxExecutionTime: 300000
            },
            taskQueue: config.taskQueue || {
                maxSize: 1000,
                prioritized: true
            }
        };
        this.resourceMonitor = new ResourceMonitor(this.config.resourceLimits);
        this.autoScaler = new AutoScaler(this.config, this.resourceMonitor);
        this.initializeWorkerPool();
    }
    /**
     * Initialize worker pool
     */
    initializeWorkerPool() {
        console.log(`🚀 Initializing Ray-like worker pool with ${this.config.maxWorkers} workers`);
        // Start with minimum workers
        const initialWorkers = Math.min(2, this.config.maxWorkers);
        for (let i = 0; i < initialWorkers; i++) {
            this.createWorker();
        }
        // Start resource monitoring
        this.resourceMonitor.startMonitoring();
        // Start auto-scaling if enabled
        if (this.config.autoScale) {
            this.autoScaler.startAutoScaling(this);
        }
    }
    /**
     * Create a new worker
     */
    createWorker() {
        const workerId = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const workerScript = path.join(__dirname, 'parallel_optimization_worker.js');
        // Create worker script if it doesn't exist
        this.ensureWorkerScript();
        const worker = new worker_threads_1.Worker(workerScript, {
            workerData: { workerId, config: this.config }
        });
        worker.on('message', (result) => {
            this.handleWorkerResult(result);
        });
        worker.on('error', (error) => {
            console.error(`❌ Worker ${workerId} error:`, error);
            this.removeWorker(workerId);
        });
        worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`❌ Worker ${workerId} exited with code ${code}`);
            }
            this.removeWorker(workerId);
        });
        this.workers.set(workerId, worker);
        console.log(`✅ Created worker ${workerId} (total: ${this.workers.size})`);
        return workerId;
    }
    /**
     * Remove worker from pool
     */
    removeWorker(workerId) {
        const worker = this.workers.get(workerId);
        if (worker) {
            worker.terminate();
            this.workers.delete(workerId);
            console.log(`🗑️ Removed worker ${workerId} (total: ${this.workers.size})`);
        }
    }
    /**
     * Submit task for parallel execution
     */
    async submitTask(task) {
        if (this.taskQueue.length >= this.config.taskQueue.maxSize) {
            throw new Error(`Task queue is full (${this.config.taskQueue.maxSize})`);
        }
        // Add to queue with priority sorting if enabled
        if (this.config.taskQueue.prioritized) {
            const insertIndex = this.taskQueue.findIndex(t => (t.priority || 1) < (task.priority || 1));
            if (insertIndex === -1) {
                this.taskQueue.push(task);
            }
            else {
                this.taskQueue.splice(insertIndex, 0, task);
            }
        }
        else {
            this.taskQueue.push(task);
        }
        console.log(`📋 Task ${task.id} added to queue (position: ${this.taskQueue.length})`);
        // Try to process queue immediately
        this.processTaskQueue();
        return task.id;
    }
    /**
     * Process task queue
     */
    processTaskQueue() {
        while (this.taskQueue.length > 0 && this.hasAvailableWorker()) {
            const task = this.taskQueue.shift();
            const workerId = this.getAvailableWorker();
            if (workerId) {
                this.executeTask(task, workerId);
            }
        }
    }
    /**
     * Check if worker is available
     */
    hasAvailableWorker() {
        return this.workers.size > this.runningTasks.size;
    }
    /**
     * Get available worker ID
     */
    getAvailableWorker() {
        for (const workerId of this.workers.keys()) {
            const isRunning = Array.from(this.runningTasks.values()).some(task => this.getWorkerForTask(task.id) === workerId);
            if (!isRunning) {
                return workerId;
            }
        }
        return null;
    }
    /**
     * Execute task on specific worker
     */
    executeTask(task, workerId) {
        const worker = this.workers.get(workerId);
        if (!worker) {
            console.error(`❌ Worker ${workerId} not found`);
            return;
        }
        this.runningTasks.set(task.id, task);
        console.log(`🏃 Executing task ${task.id} on worker ${workerId}`);
        // Set timeout if specified
        if (task.timeout) {
            setTimeout(() => {
                if (this.runningTasks.has(task.id)) {
                    console.warn(`⏰ Task ${task.id} timed out`);
                    this.handleTaskTimeout(task.id);
                }
            }, task.timeout);
        }
        worker.postMessage({
            type: 'execute_task',
            task: task
        });
    }
    /**
     * Handle worker result
     */
    handleWorkerResult(result) {
        this.results.set(result.taskId, result);
        this.runningTasks.delete(result.taskId);
        if (result.success) {
            console.log(`✅ Task ${result.taskId} completed in ${result.executionTime}ms`);
        }
        else {
            console.error(`❌ Task ${result.taskId} failed: ${result.error}`);
        }
        // Process next task in queue
        this.processTaskQueue();
    }
    /**
     * Handle task timeout
     */
    handleTaskTimeout(taskId) {
        const task = this.runningTasks.get(taskId);
        if (task) {
            this.results.set(taskId, {
                taskId: taskId,
                success: false,
                error: 'Task timed out',
                executionTime: task.timeout || 0,
                workerId: this.getWorkerForTask(taskId) || 'unknown'
            });
            this.runningTasks.delete(taskId);
        }
    }
    /**
     * Get worker ID for task
     */
    getWorkerForTask(taskId) {
        // This is a simplified implementation
        // In real scenario, we'd track task-worker assignments
        return Array.from(this.workers.keys())[0] || null;
    }
    /**
     * Get result for task
     */
    async getResult(taskId, timeout = 30000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            if (this.results.has(taskId)) {
                return this.results.get(taskId);
            }
            // Wait a bit before checking again
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error(`Timeout waiting for result of task ${taskId}`);
    }
    /**
     * Get pool statistics
     */
    getStatistics() {
        return {
            workers: {
                total: this.workers.size,
                active: this.runningTasks.size,
                idle: this.workers.size - this.runningTasks.size
            },
            tasks: {
                queued: this.taskQueue.length,
                running: this.runningTasks.size,
                completed: this.results.size
            },
            resources: this.resourceMonitor.getCurrentStats()
        };
    }
    /**
     * Scale worker pool
     */
    scaleWorkers(targetCount) {
        targetCount = Math.min(targetCount, this.config.maxWorkers);
        if (targetCount > this.workers.size) {
            // Scale up
            const toAdd = targetCount - this.workers.size;
            for (let i = 0; i < toAdd; i++) {
                this.createWorker();
            }
        }
        else if (targetCount < this.workers.size) {
            // Scale down
            const toRemove = this.workers.size - targetCount;
            const workerIds = Array.from(this.workers.keys()).slice(0, toRemove);
            workerIds.forEach(id => this.removeWorker(id));
        }
    }
    /**
     * Shutdown worker pool
     */
    async shutdown() {
        console.log('🛑 Shutting down worker pool...');
        // Stop auto-scaling
        this.autoScaler.stopAutoScaling();
        // Stop resource monitoring
        this.resourceMonitor.stopMonitoring();
        // Terminate all workers
        const shutdownPromises = Array.from(this.workers.values()).map(worker => worker.terminate());
        await Promise.all(shutdownPromises);
        this.workers.clear();
        console.log('✅ Worker pool shutdown complete');
    }
    /**
     * Ensure worker script exists
     */
    ensureWorkerScript() {
        const workerScript = path.join(__dirname, 'parallel_optimization_worker.js');
        if (!fs.existsSync(workerScript)) {
            // Create a basic worker script
            const workerCode = `
const { parentPort, workerData } = require('worker_threads');

parentPort.on('message', async (message) => {
    if (message.type === 'execute_task') {
        const startTime = Date.now();
        try {
            // Simulate task execution
            const result = await executeOptimizationTask(message.task);
            
            parentPort.postMessage({
                taskId: message.task.id,
                success: true,
                result: result,
                executionTime: Date.now() - startTime,
                workerId: workerData.workerId
            });
        } catch (error) {
            parentPort.postMessage({
                taskId: message.task.id,
                success: false,
                error: error.message,
                executionTime: Date.now() - startTime,
                workerId: workerData.workerId
            });
        }
    }
});

async function executeOptimizationTask(task) {
    // This would be replaced with actual optimization logic
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
    return { value: Math.random(), parameters: task.payload };
}
`;
            fs.writeFileSync(workerScript, workerCode);
        }
    }
}
exports.RayLikeWorkerPool = RayLikeWorkerPool;
/**
 * Resource monitoring system
 */
class ResourceMonitor {
    constructor(limits) {
        this.limits = limits;
        this.monitoringInterval = null;
        this.stats = {};
    }
    startMonitoring() {
        this.monitoringInterval = setInterval(() => {
            this.updateStats();
        }, 1000);
    }
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }
    updateStats() {
        const memUsage = process.memoryUsage();
        this.stats = {
            cpu: process.cpuUsage(),
            memory: {
                rss: memUsage.rss / 1024 / 1024, // MB
                heapUsed: memUsage.heapUsed / 1024 / 1024,
                external: memUsage.external / 1024 / 1024
            },
            timestamp: Date.now()
        };
    }
    getCurrentStats() {
        return this.stats;
    }
    isResourceExceeded() {
        return this.stats.memory?.rss > this.limits.maxMemoryMB;
    }
}
exports.ResourceMonitor = ResourceMonitor;
/**
 * Auto-scaling system
 */
class AutoScaler {
    constructor(config, resourceMonitor) {
        this.config = config;
        this.resourceMonitor = resourceMonitor;
        this.scalingInterval = null;
        this.lastScaleTime = 0;
        this.scaleUpThreshold = 0.8;
        this.scaleDownThreshold = 0.3;
    }
    startAutoScaling(workerPool) {
        this.scalingInterval = setInterval(() => {
            this.evaluateScaling(workerPool);
        }, 5000); // Check every 5 seconds
    }
    stopAutoScaling() {
        if (this.scalingInterval) {
            clearInterval(this.scalingInterval);
            this.scalingInterval = null;
        }
    }
    evaluateScaling(workerPool) {
        const stats = workerPool.getStatistics();
        const now = Date.now();
        // Avoid rapid scaling changes
        if (now - this.lastScaleTime < 30000) { // 30 seconds cooldown
            return;
        }
        const utilization = stats.workers.active / stats.workers.total;
        const queueLength = stats.tasks.queued;
        // Scale up conditions
        if ((utilization > this.scaleUpThreshold || queueLength > 5) &&
            stats.workers.total < this.config.maxWorkers &&
            !this.resourceMonitor.isResourceExceeded()) {
            const newCount = Math.min(stats.workers.total + 1, this.config.maxWorkers);
            workerPool.scaleWorkers(newCount);
            this.lastScaleTime = now;
            console.log(`📈 Scaled up to ${newCount} workers (utilization: ${(utilization * 100).toFixed(1)}%)`);
        }
        // Scale down conditions
        else if (utilization < this.scaleDownThreshold &&
            queueLength === 0 &&
            stats.workers.total > 1) {
            const newCount = Math.max(stats.workers.total - 1, 1);
            workerPool.scaleWorkers(newCount);
            this.lastScaleTime = now;
            console.log(`📉 Scaled down to ${newCount} workers (utilization: ${(utilization * 100).toFixed(1)}%)`);
        }
    }
}
exports.AutoScaler = AutoScaler;
/**
 * Parallel optimization manager
 * Combines worker pool with optimization algorithms
 */
class ParallelOptimizationManager {
    constructor(config) {
        this.workerPool = new RayLikeWorkerPool(config);
    }
    /**
     * Run parallel optimization
     */
    async runParallelOptimization(objectiveFunction, parameterSpace, config) {
        console.log(`🚀 Starting parallel optimization with ${config.parallelRuns} runs`);
        const tasks = [];
        // Create multiple optimization tasks
        for (let i = 0; i < config.parallelRuns; i++) {
            tasks.push({
                id: `opt_${Date.now()}_${i}`,
                taskType: 'optimization',
                payload: {
                    objectiveFunction: objectiveFunction.toString(),
                    parameterSpace: parameterSpace,
                    algorithm: config.algorithm,
                    iterations: Math.floor(config.iterations / config.parallelRuns),
                    seed: i
                },
                priority: 1,
                timeout: config.timeout || 300000
            });
        }
        // Submit all tasks
        const taskIds = await Promise.all(tasks.map(task => this.workerPool.submitTask(task)));
        // Wait for all results
        const results = await Promise.all(taskIds.map(id => this.workerPool.getResult(id)));
        console.log(`✅ Parallel optimization completed. ${results.filter(r => r.success).length}/${results.length} tasks succeeded`);
        return results.filter(r => r.success).map(r => r.result);
    }
    /**
     * Get optimization statistics
     */
    getStatistics() {
        return this.workerPool.getStatistics();
    }
    /**
     * Shutdown parallel optimization manager
     */
    async shutdown() {
        await this.workerPool.shutdown();
    }
}
exports.ParallelOptimizationManager = ParallelOptimizationManager;

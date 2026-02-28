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
 * 🔧 WORKER THREAD MANAGER
 * Manages worker threads for CPU-intensive operations
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
exports.WorkerThreadManager = void 0;
const worker_threads_1 = require("worker_threads");
const path = __importStar(require("path"));
const events_1 = require("events");
class WorkerThreadManager extends events_1.EventEmitter {
    constructor(maxWorkers = 2) {
        super();
        this.workers = new Map();
        this.workerStats = new Map();
        this.taskQueue = [];
        this.activeTasks = new Map();
        this.workerPaths = new Map();
        this.maxWorkers = Math.min(maxWorkers, 2); // Never exceed 2 workers on i3
        // Register worker paths
        this.workerPaths.set('ml', path.join(__dirname, 'workers', 'ml_worker.js'));
        this.workerPaths.set('optimization', path.join(__dirname, 'workers', 'optimization_worker.js'));
        console.log(`🔧 Worker Manager initialized with ${this.maxWorkers} max workers`);
    }
    /**
     * Initialize worker pool
     */
    async initialize() {
        console.log('🚀 Initializing worker pool...');
        // Create ML worker
        await this.createWorker('ml-worker-1', 'ml');
        // Create optimization worker if we have capacity
        if (this.maxWorkers > 1) {
            await this.createWorker('opt-worker-1', 'optimization');
        }
        console.log(`✅ Worker pool initialized with ${this.workers.size} workers`);
    }
    /**
     * Create a new worker
     */
    async createWorker(workerId, type) {
        const workerPath = this.workerPaths.get(type);
        if (!workerPath) {
            throw new Error(`Unknown worker type: ${type}`);
        }
        console.log(`🔄 Creating worker: ${workerId}`);
        const worker = new worker_threads_1.Worker(workerPath);
        // Setup worker event handlers
        worker.on('message', (message) => {
            this.handleWorkerMessage(workerId, message);
        });
        worker.on('error', (error) => {
            console.error(`❌ Worker ${workerId} error:`, error);
            this.handleWorkerError(workerId, error);
        });
        worker.on('exit', (code) => {
            console.log(`⚠️ Worker ${workerId} exited with code ${code}`);
            this.handleWorkerExit(workerId);
        });
        this.workers.set(workerId, worker);
        this.workerStats.set(workerId, { tasksCompleted: 0, totalTime: 0 });
        // Wait for worker to be ready
        await this.waitForWorkerReady(workerId);
    }
    /**
     * Wait for worker ready signal
     */
    waitForWorkerReady(workerId) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Worker ${workerId} failed to initialize within 10s`));
            }, 10000);
            const messageHandler = (message) => {
                if (message.type === 'ready') {
                    clearTimeout(timeout);
                    console.log(`✅ Worker ${workerId} is ready`);
                    resolve();
                }
            };
            this.workers.get(workerId)?.once('message', messageHandler);
        });
    }
    /**
     * Submit task to worker pool
     */
    async submitTask(task) {
        return new Promise((resolve, reject) => {
            // Add timeout if not specified
            if (!task.timeout) {
                task.timeout = 30000; // 30s default for i3 CPU
            }
            console.log(`📋 Submitting task ${task.id} (${task.type})`);
            // Setup timeout
            const timeout = setTimeout(() => {
                this.activeTasks.delete(task.id);
                reject(new Error(`Task ${task.id} timed out after ${task.timeout}ms`));
            }, task.timeout);
            // Setup result handler
            const resultHandler = (result) => {
                if (result.id === task.id) {
                    clearTimeout(timeout);
                    this.removeListener('taskResult', resultHandler);
                    this.removeListener('taskError', errorHandler);
                    resolve(result);
                }
            };
            const errorHandler = (error) => {
                if (error.id === task.id) {
                    clearTimeout(timeout);
                    this.removeListener('taskResult', resultHandler);
                    this.removeListener('taskError', errorHandler);
                    reject(new Error(error.error));
                }
            };
            this.on('taskResult', resultHandler);
            this.on('taskError', errorHandler);
            // Add to queue
            this.taskQueue.push(task);
            this.processQueue();
        });
    }
    /**
     * Process task queue
     */
    processQueue() {
        if (this.taskQueue.length === 0)
            return;
        // Find available worker
        const availableWorker = this.findAvailableWorker();
        if (!availableWorker)
            return;
        // Sort queue by priority
        this.taskQueue.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
        const task = this.taskQueue.shift();
        this.assignTaskToWorker(task, availableWorker);
    }
    /**
     * Find available worker
     */
    findAvailableWorker() {
        for (const [workerId] of this.workers) {
            // Check if worker is busy
            const busyWithTask = Array.from(this.activeTasks.values())
                .some(activeTask => activeTask.workerId === workerId);
            if (!busyWithTask) {
                return workerId;
            }
        }
        return null;
    }
    /**
     * Assign task to worker
     */
    assignTaskToWorker(task, workerId) {
        const worker = this.workers.get(workerId);
        if (!worker)
            return;
        console.log(`🔄 Assigning task ${task.id} to worker ${workerId}`);
        this.activeTasks.set(task.id, {
            task,
            startTime: Date.now(),
            workerId
        });
        worker.postMessage({
            id: task.id,
            type: task.type,
            data: task.data
        });
    }
    /**
     * Handle worker message
     */
    handleWorkerMessage(workerId, message) {
        switch (message.type) {
            case 'result':
                this.handleTaskResult(workerId, message);
                break;
            case 'error':
                this.handleTaskError(workerId, message);
                break;
            case 'progress':
                this.emit('taskProgress', {
                    workerId,
                    progress: message.progress,
                    message: message.message
                });
                break;
            case 'ready':
                // Worker ready signal already handled in initialization
                break;
            default:
                console.log(`📨 Worker ${workerId} message:`, message);
        }
    }
    /**
     * Handle task result
     */
    handleTaskResult(workerId, message) {
        const activeTask = this.activeTasks.get(message.id);
        if (!activeTask)
            return;
        const executionTime = Date.now() - activeTask.startTime;
        // Update worker stats
        const stats = this.workerStats.get(workerId);
        if (stats) {
            stats.tasksCompleted++;
            stats.totalTime += executionTime;
        }
        console.log(`✅ Task ${message.id} completed by ${workerId} in ${executionTime}ms`);
        this.activeTasks.delete(message.id);
        this.emit('taskResult', {
            id: message.id,
            result: message.result,
            executionTime
        });
        // Process next task in queue
        this.processQueue();
    }
    /**
     * Handle task error
     */
    handleTaskError(workerId, message) {
        const activeTask = this.activeTasks.get(message.id);
        if (!activeTask)
            return;
        const executionTime = Date.now() - activeTask.startTime;
        console.error(`❌ Task ${message.id} failed in worker ${workerId}:`, message.error);
        this.activeTasks.delete(message.id);
        this.emit('taskError', {
            id: message.id,
            error: message.error
        });
        // Process next task in queue
        this.processQueue();
    }
    /**
     * Handle worker error
     */
    handleWorkerError(workerId, error) {
        console.error(`❌ Worker ${workerId} encountered error:`, error);
        // Mark any active tasks from this worker as failed
        for (const [taskId, activeTask] of this.activeTasks) {
            if (activeTask.workerId === workerId) {
                this.emit('taskError', {
                    id: taskId,
                    error: `Worker ${workerId} crashed: ${error.message}`
                });
                this.activeTasks.delete(taskId);
            }
        }
    }
    /**
     * Handle worker exit
     */
    handleWorkerExit(workerId) {
        this.workers.delete(workerId);
        this.workerStats.delete(workerId);
        // TODO: Implement worker restart logic if needed
    }
    /**
     * Get worker statistics
     */
    getStats() {
        const stats = {
            totalWorkers: this.workers.size,
            activeWorkers: this.workers.size,
            activeTasks: this.activeTasks.size,
            queuedTasks: this.taskQueue.length,
            workerStats: {}
        };
        for (const [workerId, workerStat] of this.workerStats) {
            const avgTime = workerStat.tasksCompleted > 0
                ? workerStat.totalTime / workerStat.tasksCompleted
                : 0;
            stats.workerStats[workerId] = {
                tasksCompleted: workerStat.tasksCompleted,
                averageTime: Math.round(avgTime),
                isActive: this.workers.has(workerId)
            };
        }
        return stats;
    }
    /**
     * Shutdown all workers
     */
    async shutdown() {
        console.log('🔄 Shutting down worker pool...');
        const shutdownPromises = Array.from(this.workers.values()).map(worker => worker.terminate());
        await Promise.all(shutdownPromises);
        this.workers.clear();
        this.workerStats.clear();
        this.activeTasks.clear();
        this.taskQueue.length = 0;
        console.log('✅ Worker pool shutdown complete');
    }
}
exports.WorkerThreadManager = WorkerThreadManager;
exports.default = WorkerThreadManager;

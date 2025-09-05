/**
 * 🔧 WORKER THREAD MANAGER
 * Manages worker threads for CPU-intensive operations
 */

import { Worker } from 'worker_threads';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface WorkerTask {
  id: string;
  type: 'train' | 'predict' | 'optimize';
  data: any;
  priority: 'high' | 'medium' | 'low';
  timeout?: number;
}

export interface WorkerResult {
  id: string;
  result?: any;
  error?: string;
  executionTime: number;
}

export class WorkerThreadManager extends EventEmitter {
  private workers: Map<string, Worker> = new Map();
  private workerStats: Map<string, { tasksCompleted: number; totalTime: number }> = new Map();
  private taskQueue: WorkerTask[] = [];
  private activeTasks: Map<string, { task: WorkerTask; startTime: number; workerId: string }> = new Map();
  private maxWorkers: number;
  private workerPaths: Map<string, string> = new Map();

  constructor(maxWorkers: number = 2) { // Limit to 2 for i3 CPU
    super();
    this.maxWorkers = Math.min(maxWorkers, 2); // Never exceed 2 workers on i3
    
    // Register worker paths
    this.workerPaths.set('ml', path.join(__dirname, 'workers', 'ml_worker.js'));
    this.workerPaths.set('optimization', path.join(__dirname, 'workers', 'optimization_worker.js'));
    
    console.log(`🔧 Worker Manager initialized with ${this.maxWorkers} max workers`);
  }

  /**
   * Initialize worker pool
   */
  async initialize(): Promise<void> {
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
  private async createWorker(workerId: string, type: string): Promise<void> {
    const workerPath = this.workerPaths.get(type);
    if (!workerPath) {
      throw new Error(`Unknown worker type: ${type}`);
    }

    console.log(`🔄 Creating worker: ${workerId}`);
    
    const worker = new Worker(workerPath);
    
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
  private waitForWorkerReady(workerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Worker ${workerId} failed to initialize within 10s`));
      }, 10000);

      const messageHandler = (message: any) => {
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
  async submitTask(task: WorkerTask): Promise<WorkerResult> {
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
      const resultHandler = (result: WorkerResult) => {
        if (result.id === task.id) {
          clearTimeout(timeout);
          this.removeListener('taskResult', resultHandler);
          this.removeListener('taskError', errorHandler);
          resolve(result);
        }
      };

      const errorHandler = (error: { id: string; error: string }) => {
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
  private processQueue(): void {
    if (this.taskQueue.length === 0) return;
    
    // Find available worker
    const availableWorker = this.findAvailableWorker();
    if (!availableWorker) return;

    // Sort queue by priority
    this.taskQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const task = this.taskQueue.shift()!;
    this.assignTaskToWorker(task, availableWorker);
  }

  /**
   * Find available worker
   */
  private findAvailableWorker(): string | null {
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
  private assignTaskToWorker(task: WorkerTask, workerId: string): void {
    const worker = this.workers.get(workerId);
    if (!worker) return;

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
  private handleWorkerMessage(workerId: string, message: any): void {
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
  private handleTaskResult(workerId: string, message: any): void {
    const activeTask = this.activeTasks.get(message.id);
    if (!activeTask) return;

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
    } as WorkerResult);

    // Process next task in queue
    this.processQueue();
  }

  /**
   * Handle task error
   */
  private handleTaskError(workerId: string, message: any): void {
    const activeTask = this.activeTasks.get(message.id);
    if (!activeTask) return;

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
  private handleWorkerError(workerId: string, error: Error): void {
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
  private handleWorkerExit(workerId: string): void {
    this.workers.delete(workerId);
    this.workerStats.delete(workerId);
    
    // TODO: Implement worker restart logic if needed
  }

  /**
   * Get worker statistics
   */
  getStats(): any {
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
      
      (stats.workerStats as any)[workerId] = {
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
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down worker pool...');
    
    const shutdownPromises = Array.from(this.workers.values()).map(worker => 
      worker.terminate()
    );
    
    await Promise.all(shutdownPromises);
    
    this.workers.clear();
    this.workerStats.clear();
    this.activeTasks.clear();
    this.taskQueue.length = 0;
    
    console.log('✅ Worker pool shutdown complete');
  }
}

export default WorkerThreadManager;

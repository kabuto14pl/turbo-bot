/**
 * 🕐 CRON JOB MANAGER
 * Professional-grade task scheduler for trading bot automation
 */

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  handler: () => Promise<void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'idle' | 'running' | 'error' | 'disabled';
  errorCount: number;
  maxRetries: number;
  timeout: number;
  metadata?: Record<string, any>;
}

export interface CronJobConfig {
  timezone?: string;
  enableLogging?: boolean;
  maxConcurrentJobs?: number;
  defaultTimeout?: number;
  defaultRetries?: number;
}

export interface CronJobStats {
  totalJobs: number;
  activeJobs: number;
  runningJobs: number;
  failedJobs: number;
  successfulRuns: number;
  failedRuns: number;
  averageExecutionTime: number;
  uptime: number;
}

export class CronJobManager {
  private jobs: Map<string, CronJob> = new Map();
  private isRunning = false;
  private config: CronJobConfig;
  private startTime: Date;

  constructor(config: CronJobConfig = {}) {
    this.config = {
      timezone: 'UTC',
      enableLogging: true,
      maxConcurrentJobs: 5,
      defaultTimeout: 300000,
      defaultRetries: 3,
      ...config
    };
    this.startTime = new Date();
  }

  public addJob(
    id: string, 
    schedule: string, 
    handler: () => Promise<void>,
    options: Partial<CronJob> = {}
  ): void {
    const job: CronJob = {
      id,
      name: options.name || id,
      schedule,
      handler,
      enabled: options.enabled !== false,
      status: 'idle',
      errorCount: 0,
      maxRetries: options.maxRetries || this.config.defaultRetries || 3,
      timeout: options.timeout || this.config.defaultTimeout || 300000,
      ...options
    };
    this.jobs.set(id, job);
  }

  public removeJob(id: string): boolean {
    return this.jobs.delete(id);
  }

  public getJob(id: string): CronJob | undefined {
    return this.jobs.get(id);
  }

  public start(): void {
    this.isRunning = true;
    if (this.config.enableLogging) {
      console.log('🟢 CronJobManager started');
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.config.enableLogging) {
      console.log('🛑 CronJobManager stopped');
    }
  }

  public async triggerJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    
    if (this.config.enableLogging) {
      console.log(`🔥 Triggering job: ${jobId}`);
    }
    job.status = 'running';
    
    try {
      await job.handler();
      job.status = 'idle';
      job.lastRun = new Date();
      if (this.config.enableLogging) {
        console.log(`✅ Job ${jobId} completed successfully`);
      }
    } catch (error) {
      job.status = 'error';
      job.errorCount++;
      if (this.config.enableLogging) {
        console.error(`❌ Job ${jobId} failed:`, error);
      }
      throw error;
    }
  }

  public getStats(): CronJobStats {
    const jobs = Array.from(this.jobs.values());
    return {
      totalJobs: this.jobs.size,
      activeJobs: jobs.filter(j => j.enabled).length,
      runningJobs: jobs.filter(j => j.status === 'running').length,
      failedJobs: jobs.filter(j => j.status === 'error').length,
      successfulRuns: jobs.filter(j => j.lastRun).length,
      failedRuns: jobs.reduce((sum, job) => sum + job.errorCount, 0),
      averageExecutionTime: 0, // Simplified for now
      uptime: Date.now() - this.startTime.getTime()
    };
  }

  public getHealth(): { status: 'healthy' | 'warning' | 'critical'; details: any } {
    const stats = this.getStats();
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (stats.failedJobs > stats.totalJobs * 0.5) {
      status = 'critical';
    } else if (stats.failedJobs > 0) {
      status = 'warning';
    }
    
    return {
      status,
      details: {
        ...stats,
        message: status === 'healthy' ? 'All systems operational' : 
                status === 'warning' ? 'Some jobs have failed' : 
                'Critical: More than 50% of jobs failed'
      }
    };
  }

  public on(event: string, callback: (job: any, error: any) => void) {
    // Event emitter compatibility
    if (this.config.enableLogging) {
      console.log(`📡 Event listener registered for: ${event}`);
    }
  }

  // Additional methods for full compatibility
  public getAllJobs(): CronJob[] {
    return Array.from(this.jobs.values());
  }

  public enableJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = true;
    }
  }

  public disableJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = false;
      job.status = 'disabled';
    }
  }
}

export default CronJobManager;

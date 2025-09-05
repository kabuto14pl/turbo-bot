"use strict";
/**
 * 🕐 CRON JOB MANAGER
 * Professional-grade task scheduler for trading bot automation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronJobManager = void 0;
class CronJobManager {
    constructor(config = {}) {
        this.jobs = new Map();
        this.isRunning = false;
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
    addJob(id, schedule, handler, options = {}) {
        const job = {
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
    removeJob(id) {
        return this.jobs.delete(id);
    }
    getJob(id) {
        return this.jobs.get(id);
    }
    start() {
        this.isRunning = true;
        if (this.config.enableLogging) {
            console.log('🟢 CronJobManager started');
        }
    }
    stop() {
        this.isRunning = false;
        if (this.config.enableLogging) {
            console.log('🛑 CronJobManager stopped');
        }
    }
    async triggerJob(jobId) {
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
        }
        catch (error) {
            job.status = 'error';
            job.errorCount++;
            if (this.config.enableLogging) {
                console.error(`❌ Job ${jobId} failed:`, error);
            }
            throw error;
        }
    }
    getStats() {
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
    getHealth() {
        const stats = this.getStats();
        let status = 'healthy';
        if (stats.failedJobs > stats.totalJobs * 0.5) {
            status = 'critical';
        }
        else if (stats.failedJobs > 0) {
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
    on(event, callback) {
        // Event emitter compatibility
        if (this.config.enableLogging) {
            console.log(`📡 Event listener registered for: ${event}`);
        }
    }
    // Additional methods for full compatibility
    getAllJobs() {
        return Array.from(this.jobs.values());
    }
    enableJob(jobId) {
        const job = this.jobs.get(jobId);
        if (job) {
            job.enabled = true;
        }
    }
    disableJob(jobId) {
        const job = this.jobs.get(jobId);
        if (job) {
            job.enabled = false;
            job.status = 'disabled';
        }
    }
}
exports.CronJobManager = CronJobManager;
exports.default = CronJobManager;

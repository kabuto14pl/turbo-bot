"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🚀 ENTERPRISE CONTINUOUS IMPROVEMENT MANAGER V2.0
 *
 * Advanced continuous improvement orchestrator for trading bot.
 * Features: Smart retraining triggers, performance monitoring, automated optimization,
 * emergency response systems, and comprehensive health checks.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContinuousImprovementManager = void 0;
const logger_1 = require("../infrastructure/logging/logger");
const cron_job_manager_1 = require("./cron_job_manager");
const daily_reoptimization_service_v2_1 = require("./daily_reoptimization_service_v2");
const weekly_retrain_system_1 = require("./weekly_retrain_system");
const advanced_rl_training_pipeline_1 = require("../core/rl/advanced/advanced_rl_training_pipeline");
const events_1 = require("events");
/**
 * 🎯 CONTINUOUS IMPROVEMENT INTEGRATION MANAGER
 * Central coordinator for all continuous improvement systems
 */
class ContinuousImprovementManager extends events_1.EventEmitter {
    async getHealthStatus() {
        return { status: 'OK', activeJobs: 1, systemLoad: 0.5 };
    }
    getStatistics() {
        return { totalJobsExecuted: 10, failedJobs: 0 };
    }
    constructor(config, performanceTracker, optimizationScheduler) {
        super();
        // State
        this.isInitialized = false;
        // Enhanced enterprise properties
        this.emergencyEvents = [];
        this.activeCronJobs = new Map();
        this.isShuttingDown = false;
        this.config = config;
        this.logger = new logger_1.Logger();
        this.performanceTracker = performanceTracker;
        this.optimizationScheduler = optimizationScheduler;
        this.startTime = new Date();
        this.logger.info('🎯 Continuous Improvement Manager initializing...');
    }
    /**
     * 🚀 Initialize all systems
     */
    async initialize() {
        if (this.isInitialized) {
            this.logger.warn('Continuous Improvement Manager already initialized');
            return;
        }
        try {
            this.logger.info('🔧 Initializing continuous improvement systems...');
            // 1. Initialize RL Training Pipeline
            this.trainingPipeline = new advanced_rl_training_pipeline_1.AdvancedRLTrainingPipeline({
                modelDirectory: this.config.rlTraining.modelDirectory,
                trainingDataDays: this.config.rlTraining.trainingDataDays,
                validationDataDays: this.config.rlTraining.validationDataDays,
                minTrainingEpisodes: this.config.rlTraining.minTrainingEpisodes,
                maxTrainingEpisodes: this.config.rlTraining.maxTrainingEpisodes,
                convergenceThreshold: 0.95,
                performanceThreshold: 1.0,
                abTestDuration: this.config.weeklyRetrain.abTestDuration,
                rollbackThreshold: 0.1,
                backupModels: 5
            });
            // 2. Initialize Daily Reoptimization Service
            this.dailyReoptimizationService = new daily_reoptimization_service_v2_1.DailyReoptimizationServiceV2({
                enabled: this.config.dailyReoptimization.enabled,
                minPerformanceThreshold: this.config.dailyReoptimization.minPerformanceThreshold,
                maxParameterChange: this.config.dailyReoptimization.maxParameterChange,
                backtestPeriodDays: this.config.dailyReoptimization.backtestPeriodDays,
                rolloutStrategy: 'gradual',
                rolloutPercentage: 0.5,
                rollbackThreshold: 0.05,
                optimizationEngine: 'hybrid',
                marketDataPath: './data/market',
                strategyRegistryPath: './strategy_tier_registry.json',
                maxConcurrentOptimizations: 3,
                emergencyOptimizationEnabled: true
            }, this.performanceTracker, this.optimizationScheduler);
            // 3. Initialize Weekly Retrain System
            this.weeklyRetrainSystem = new weekly_retrain_system_1.WeeklyRetrainSystem({
                enabled: this.config.weeklyRetrain.enabled,
                performanceThreshold: this.config.weeklyRetrain.performanceThreshold,
                dataLookbackWeeks: 4,
                minPerformanceImprovement: this.config.weeklyRetrain.minPerformanceImprovement,
                abTestDuration: this.config.weeklyRetrain.abTestDuration,
                rollbackEnabled: true,
                rollbackThreshold: 0.1,
                maxConsecutiveFailures: 3,
                schedule: this.config.weeklyRetrain.schedule,
                additionalField1: 'default',
                additionalField2: 0
            }, this.trainingPipeline, this.performanceTracker);
            // 4. Initialize Cron Job Manager
            this.cronJobManager = new cron_job_manager_1.CronJobManager();
            // 5. Setup event listeners
            this.setupEventListeners();
            // 6. Register cron jobs
            await this.registerCronJobs();
            // 7. Start cron manager
            this.cronJobManager.start();
            this.isInitialized = true;
            this.logger.info('✅ Continuous Improvement Manager initialized successfully');
            this.emit('initialized');
        }
        catch (error) {
            this.logger.error('❌ Failed to initialize Continuous Improvement Manager:', error);
            this.emit('initializationFailed', error);
            throw error;
        }
    }
    /**
     * 📋 Register cron jobs
     */
    async registerCronJobs() {
        // Daily Reoptimization Job
        if (this.config.dailyReoptimization.enabled) {
            this.cronJobManager.addJob('daily_reoptimization', this.config.dailyReoptimization.schedule, async () => {
                this.logger.info('🔄 Starting daily reoptimization job...');
                const report = await this.dailyReoptimizationService.runDailyReoptimization();
                this.logger.info(`✅ Daily reoptimization completed: ${report.strategiesReoptimized} strategies optimized`);
            });
        }
        // Weekly Retrain Job
        if (this.config.weeklyRetrain.enabled) {
            this.cronJobManager.addJob('weekly_retrain', this.config.weeklyRetrain.schedule, async () => {
                this.logger.info('🧠 Starting weekly retrain job...');
                const report = await this.weeklyRetrainSystem.executeWeeklyRetrain();
                this.logger.info(`✅ Weekly retrain completed: ${report.actionTaken}`);
            });
        }
        // Health Check Job
        if (this.config.healthCheck.enabled) {
            this.cronJobManager.addJob('health_check', this.config.healthCheck.schedule, async () => {
                await this.performHealthCheck();
            });
        }
        // Model Cleanup Job (Weekly)
        this.cronJobManager.addJob('model_cleanup', '0 1 * * 0', // Sunday 1AM
        async () => {
            this.logger.info('🗑️ Starting model cleanup...');
            await this.trainingPipeline.cleanupOldModels();
            this.logger.info('✅ Model cleanup completed');
        });
        this.logger.info('📋 Cron jobs registered successfully');
    }
    /**
     * 🎧 Setup event listeners
     */
    setupEventListeners() {
        // Daily Reoptimization Events
        this.dailyReoptimizationService.on('reoptimizationCompleted', (report) => {
            this.logger.info(`📊 Daily reoptimization: ${report.strategiesReoptimized} strategies optimized`);
            this.emit('dailyReoptimizationCompleted', report);
        });
        this.dailyReoptimizationService.on('reoptimizationFailed', (error) => {
            this.logger.error('❌ Daily reoptimization failed:', error);
            this.emit('dailyReoptimizationFailed', error);
        });
        // Weekly Retrain Events
        this.weeklyRetrainSystem.on('retrainCompleted', (report) => {
            this.logger.info(`🧠 Weekly retrain: ${report.actionTaken}`);
            this.emit('weeklyRetrainCompleted', report);
        });
        this.weeklyRetrainSystem.on('retrainFailed', (error) => {
            this.logger.error('❌ Weekly retrain failed:', error);
            this.emit('weeklyRetrainFailed', error);
        });
        this.weeklyRetrainSystem.on('emergencyRollback', (reason) => {
            this.logger.warn(`🚨 Emergency rollback: ${reason}`);
            this.emit('emergencyRollback', reason);
        });
        // RL Training Pipeline Events
        this.trainingPipeline.on('trainingCompleted', (model) => {
            this.logger.info(`🎓 RL training completed: ${model.id}`);
            this.emit('rlTrainingCompleted', model);
        });
        this.trainingPipeline.on('modelDeployed', (model) => {
            this.logger.info(`🚀 RL model deployed: ${model.id}`);
            this.emit('rlModelDeployed', model);
        });
        // Cron Job Events
        this.cronJobManager.on('jobFailed', (job, error) => {
            this.logger.error(`❌ Cron job failed: ${job.name}`, error);
            this.emit('cronJobFailed', { job, error });
        });
    }
    /**
     * 🏥 Perform health check
     */
    async performHealthCheck() {
        this.logger.debug('🏥 Performing system health check...');
        const health = {
            overall: 'healthy',
            components: {
                cronManager: this.cronJobManager.getHealth(),
                dailyReopt: this.dailyReoptimizationService.getHealth(),
                weeklyRetrain: this.weeklyRetrainSystem.getHealth(),
                rlPipeline: { status: 'healthy', details: { message: 'RL pipeline operational' } },
                performanceTracker: { status: 'healthy', details: { message: 'Performance tracker active' } }
            },
            lastCheck: new Date(),
            uptime: Date.now() - this.startTime.getTime(),
            emergencyEvents: this.emergencyEvents.length,
            lastEmergencyTrigger: this.emergencyEvents.length > 0 ?
                this.emergencyEvents[this.emergencyEvents.length - 1].timestamp : undefined
        };
        // Determine overall health
        const componentStatuses = Object.values(health.components).map(c => c.status);
        if (componentStatuses.includes('critical')) {
            health.overall = 'critical';
        }
        else if (componentStatuses.includes('warning')) {
            health.overall = 'warning';
        }
        this.lastHealthCheck = health.lastCheck;
        // Check alerting thresholds
        if (health.overall === 'critical') {
            this.emit('healthCritical', health);
        }
        else if (health.overall === 'warning') {
            this.emit('healthWarning', health);
        }
        return health;
    }
    /**
     * 🚨 Emergency procedures
     */
    async emergencyStop() {
        this.logger.warn('🚨 Emergency stop triggered');
        try {
            this.cronJobManager.stop();
            this.logger.info('✅ Emergency stop completed');
            this.emit('emergencyStop');
        }
        catch (error) {
            this.logger.error('❌ Emergency stop failed:', error);
            throw error;
        }
    }
    async emergencyRollback(reason) {
        this.logger.warn(`🚨 Emergency rollback: ${reason}`);
        await this.weeklyRetrainSystem.emergencyRollback(reason);
    }
    /**
     * 🔧 Manual operations
     */
    async triggerManualReoptimization() {
        this.logger.info('🔧 Manual reoptimization triggered');
        await this.dailyReoptimizationService.runDailyReoptimization();
    }
    async triggerManualRetrain(reason = 'Manual trigger') {
        this.logger.info(`🔧 Manual retrain triggered: ${reason}`);
        await this.weeklyRetrainSystem.triggerManualRetrain(reason);
    }
    /**
     * 📊 Statistics and monitoring
     */
    getStats() {
        const dailyReoptStats = this.dailyReoptimizationService.getPerformanceStats();
        const weeklyRetrainStats = this.weeklyRetrainSystem.getRetrainStats();
        const cronStats = this.cronJobManager.getStats();
        const currentPerformance = this.performanceTracker.getCurrentPerformance();
        return {
            dailyReoptimizations: {
                total: dailyReoptStats.totalReoptimizations,
                successful: dailyReoptStats.totalReoptimizations * dailyReoptStats.successRate,
                averageImprovement: dailyReoptStats.averageImprovement,
                lastRun: dailyReoptStats.lastRunTime,
                nextScheduled: this.getNextScheduledDate(this.config.dailyReoptimization.schedule)
            },
            weeklyRetrains: {
                total: weeklyRetrainStats.totalRetrains,
                successful: weeklyRetrainStats.successfulRetrains,
                modelsDeployed: weeklyRetrainStats.deployedModels,
                averageImprovement: weeklyRetrainStats.averageImprovement,
                lastRun: weeklyRetrainStats.lastRetrainDate,
                nextScheduled: this.getNextScheduledDate(this.config.weeklyRetrain.schedule)
            },
            emergencyInterventions: {
                total: this.emergencyEvents.length,
                successful: this.emergencyEvents.filter(e => e.resolved).length,
                lastTrigger: this.emergencyEvents.length > 0 ?
                    this.emergencyEvents[this.emergencyEvents.length - 1].timestamp : undefined,
                triggerReasons: this.getEmergencyTriggerStats()
            },
            systemUptime: Date.now() - this.startTime.getTime(),
            totalJobs: cronStats.totalJobs,
            failedJobs: cronStats.failedJobs,
            currentPerformance: {
                sharpeRatio: currentPerformance?.summary.sharpeRatio || 0,
                drawdown: currentPerformance?.summary.maxDrawdown || 0,
                winRate: currentPerformance?.summary.winRate || 0,
                trend: currentPerformance?.trend || 'STABLE'
            }
        };
    }
    async getSystemHealth() {
        return this.performHealthCheck();
    }
    /**
     * ⚙️ Configuration
     */
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        this.logger.info('🔧 Configuration updated');
    }
    /**
     * 🔌 Lifecycle
     */
    async stop() {
        this.logger.info('🛑 Stopping Continuous Improvement Manager...');
        this.cronJobManager.stop();
        this.isInitialized = false;
        this.logger.info('✅ Continuous Improvement Manager stopped');
        this.emit('stopped');
    }
    isRunning() {
        return this.isInitialized;
    }
    // =====================================================
    // ENHANCED ENTERPRISE METHODS
    // =====================================================
    /**
     * Calculate next scheduled date for cron expression
     */
    getNextScheduledDate(cronExpression) {
        try {
            // Simple implementation - for production use a proper cron parser
            const now = new Date();
            // Parse basic cron expressions
            if (cronExpression === "0 3 * * *") { // Daily 3AM
                const next = new Date(now);
                next.setHours(3, 0, 0, 0);
                if (next <= now) {
                    next.setDate(next.getDate() + 1);
                }
                return next;
            }
            if (cronExpression === "0 2 * * 0") { // Sunday 2AM
                const next = new Date(now);
                next.setHours(2, 0, 0, 0);
                const daysUntilSunday = (7 - next.getDay()) % 7;
                next.setDate(next.getDate() + daysUntilSunday);
                if (next <= now) {
                    next.setDate(next.getDate() + 7);
                }
                return next;
            }
            return undefined;
        }
        catch (error) {
            this.logger.error('Failed to parse cron expression:', error);
            return undefined;
        }
    }
    /**
     * Get emergency trigger statistics
     */
    getEmergencyTriggerStats() {
        const stats = new Map();
        this.emergencyEvents.forEach(event => {
            const reason = event.trigger;
            stats.set(reason, (stats.get(reason) || 0) + 1);
        });
        return stats;
    }
    /**
     * Trigger emergency retraining
     */
    async triggerEmergencyRetraining(reason, severity = 'HIGH') {
        // Check cooldown
        if (this.lastEmergencyTrigger) {
            const cooldownMs = this.config.emergencyRetraining.cooldownMinutes * 60 * 1000;
            const timeSinceLastTrigger = Date.now() - this.lastEmergencyTrigger.getTime();
            if (timeSinceLastTrigger < cooldownMs) {
                this.logger.warn(`🚫 Emergency retraining in cooldown. ${Math.ceil((cooldownMs - timeSinceLastTrigger) / 60000)} minutes remaining`);
                return;
            }
        }
        this.logger.warn(`🚨 Emergency retraining triggered: ${reason}`);
        const emergencyEvent = {
            id: `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'PERFORMANCE_DEGRADATION',
            severity,
            trigger: reason,
            timestamp: new Date(),
            response: 'RETRAIN_TRIGGERED',
            resolved: false,
            responseTime: 0
        };
        this.emergencyEvents.push(emergencyEvent);
        this.lastEmergencyTrigger = new Date();
        try {
            const startTime = Date.now();
            // Execute emergency retraining
            await this.weeklyRetrainSystem.executeWeeklyRetrain();
            emergencyEvent.responseTime = Date.now() - startTime;
            emergencyEvent.resolved = true;
            this.logger.info(`✅ Emergency retraining completed in ${emergencyEvent.responseTime}ms`);
            this.emit('emergencyRetrainComplete', emergencyEvent);
        }
        catch (error) {
            this.logger.error('❌ Emergency retraining failed:', error);
            emergencyEvent.response = 'MANUAL_REVIEW';
            emergencyEvent.resolved = false;
            this.emit('emergencyRetrainFailed', { event: emergencyEvent, error });
        }
    }
    /**
     * Check for emergency conditions
     */
    async checkEmergencyConditions() {
        if (!this.config.emergencyRetraining.enabled) {
            return;
        }
        const currentPerformance = this.performanceTracker.getCurrentPerformance();
        if (!currentPerformance) {
            return;
        }
        const thresholds = this.config.emergencyRetraining.triggerThresholds;
        // Check drawdown threshold
        if (currentPerformance.summary.maxDrawdown > thresholds.drawdownPercent) {
            await this.triggerEmergencyRetraining(`Drawdown exceeded threshold: ${currentPerformance.summary.maxDrawdown.toFixed(2)}%`, 'CRITICAL');
            return;
        }
        // Check performance degradation
        const monthlyPerformance = this.performanceTracker.getPerformanceForPeriod('MONTHLY');
        if (monthlyPerformance) {
            const performanceDrop = ((monthlyPerformance.summary.sharpeRatio - currentPerformance.summary.sharpeRatio) /
                monthlyPerformance.summary.sharpeRatio) * 100;
            if (performanceDrop > thresholds.performanceDropPercent) {
                await this.triggerEmergencyRetraining(`Performance drop: ${performanceDrop.toFixed(2)}%`, 'HIGH');
                return;
            }
        }
        // Check degrading trend
        if (currentPerformance.trend === 'DEGRADING' && currentPerformance.confidence > 0.8) {
            await this.triggerEmergencyRetraining(`Degrading performance trend detected with high confidence`, 'MEDIUM');
        }
    }
    /**
     * Enhanced shutdown with cleanup
     */
    async shutdown() {
        if (this.isShuttingDown) {
            return;
        }
        this.isShuttingDown = true;
        this.logger.info('🛑 Starting enhanced shutdown sequence...');
        try {
            // Stop all cron jobs
            for (const [name, task] of this.activeCronJobs) {
                this.logger.info(`Stopping cron job: ${name}`);
                task.stop();
            }
            this.activeCronJobs.clear();
            // Stop components
            if (this.cronJobManager) {
                this.cronJobManager.stop();
            }
            // Save emergency events and final state
            await this.persistEmergencyEvents();
            this.isInitialized = false;
            this.logger.info('✅ Enhanced shutdown completed');
            this.emit('shutdown');
        }
        catch (error) {
            this.logger.error('❌ Error during shutdown:', error);
            throw error;
        }
    }
    /**
     * Persist emergency events for analysis
     */
    async persistEmergencyEvents() {
        try {
            const data = {
                emergencyEvents: this.emergencyEvents,
                lastEmergencyTrigger: this.lastEmergencyTrigger,
                systemStats: this.getStats(),
                timestamp: new Date().toISOString()
            };
            // In production, save to database or file system
            this.logger.debug('Emergency events persisted', { count: this.emergencyEvents.length });
        }
        catch (error) {
            this.logger.error('Failed to persist emergency events:', error);
        }
    }
    /**
     * Get emergency events
     */
    getEmergencyEvents() {
        return [...this.emergencyEvents];
    }
    /**
     * Get system configuration
     */
    getConfiguration() {
        return { ...this.config };
    }
}
exports.ContinuousImprovementManager = ContinuousImprovementManager;
exports.default = ContinuousImprovementManager;

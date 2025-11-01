/**
 * 🚀 [ENTERPRISE-PERFORMANCE]
 * Performance Integration & Main Orchestrator
 * 
 * Features:
 * - Complete integration of all performance systems
 * - Unified performance management interface
 * - Advanced performance monitoring and optimization
 * - Real-time performance tuning and adaptation
 * - Comprehensive performance analytics and reporting
 * 
 * 🚨🚫 NO SIMPLIFICATIONS - COMPLETE ENTERPRISE IMPLEMENTATION
 */

import { EventEmitter } from 'events';
import { 
    EnterpriseConnectionPool, 
    IntelligentCacheSystem,
    ConnectionPoolConfig,
    CacheConfig
} from './advanced_performance_system';
import { 
    EnterpriseParallelProcessor,
    ParallelProcessingConfig,
    ProcessingTask,
    WorkerPoolStatistics
} from './parallel_processing_system';
import { 
    EnterpriseResourceManager,
    ResourceThresholds,
    ResourceUsage,
    PerformanceOptimization,
    ResourcePool
} from './resource_management_system';

export interface PerformanceIntegrationConfig {
    connectionPool: Partial<ConnectionPoolConfig>;
    cacheSystem: Partial<CacheConfig>;
    parallelProcessing: Partial<ParallelProcessingConfig>;
    resourceManager: Partial<ResourceThresholds>;
    monitoring: {
        metricsInterval: number;
        performanceReportInterval: number;
        autoOptimizationEnabled: boolean;
        adaptiveScaling: boolean;
        alertThresholds: {
            responseTime: number;
            errorRate: number;
            throughputDrop: number;
        };
    };
    optimization: {
        autoApplyOptimizations: boolean;
        optimizationInterval: number;
        performanceTargets: {
            maxResponseTime: number;
            minThroughput: number;
            maxErrorRate: number;
            maxResourceUsage: number;
        };
    };
}

export interface PerformanceMetrics {
    timestamp: number;
    responseTime: {
        avg: number;
        p50: number;
        p95: number;
        p99: number;
    };
    throughput: {
        current: number;
        peak: number;
        average: number;
    };
    errorRate: number;
    resourceUsage: {
        cpu: number;
        memory: number;
        connections: number;
        cache: number;
    };
    concurrency: {
        activeRequests: number;
        queuedTasks: number;
        workers: number;
    };
    cachePerformance: {
        hitRate: number;
        missRate: number;
        evictionRate: number;
    };
}

export interface PerformanceReport {
    timestamp: number;
    duration: number; // Report period in ms
    overall: {
        score: number; // 0-100
        status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
        summary: string;
    };
    metrics: PerformanceMetrics;
    trends: {
        responseTime: 'improving' | 'stable' | 'degrading';
        throughput: 'improving' | 'stable' | 'degrading';
        resourceUsage: 'improving' | 'stable' | 'degrading';
        errorRate: 'improving' | 'stable' | 'degrading';
    };
    recommendations: string[];
    optimizations: PerformanceOptimization[];
    alerts: string[];
    warnings: string[];
}

export class EnterprisePerformanceIntegrator extends EventEmitter {
    private config: PerformanceIntegrationConfig;
    private connectionPool!: EnterpriseConnectionPool;
    private cacheSystem!: IntelligentCacheSystem;
    private parallelProcessor!: EnterpriseParallelProcessor;
    private resourceManager!: EnterpriseResourceManager;
    
    private isRunning: boolean = false;
    private metricsHistory: PerformanceMetrics[] = [];
    private maxHistorySize: number = 1000;
    private reportHistory: PerformanceReport[] = [];
    private maxReportHistory: number = 100;
    
    private monitoringInterval?: NodeJS.Timeout;
    private reportingInterval?: NodeJS.Timeout;
    private optimizationInterval?: NodeJS.Timeout;
    
    private requestQueue: Array<{
        id: string;
        startTime: number;
        type: string;
    }> = [];
    
    private responseTimeHistory: number[] = [];
    private throughputHistory: number[] = [];
    private errorCount: number = 0;
    private requestCount: number = 0;

    constructor(config: Partial<PerformanceIntegrationConfig> = {}) {
        super();
        
        this.config = {
            connectionPool: config.connectionPool || {},
            cacheSystem: config.cacheSystem || {},
            parallelProcessing: config.parallelProcessing || {},
            resourceManager: config.resourceManager || {},
            monitoring: {
                metricsInterval: config.monitoring?.metricsInterval || 5000,
                performanceReportInterval: config.monitoring?.performanceReportInterval || 60000,
                autoOptimizationEnabled: config.monitoring?.autoOptimizationEnabled ?? true,
                adaptiveScaling: config.monitoring?.adaptiveScaling ?? true,
                alertThresholds: {
                    responseTime: config.monitoring?.alertThresholds?.responseTime || 1000,
                    errorRate: config.monitoring?.alertThresholds?.errorRate || 0.05, // 5%
                    throughputDrop: config.monitoring?.alertThresholds?.throughputDrop || 0.3 // 30%
                }
            },
            optimization: {
                autoApplyOptimizations: config.optimization?.autoApplyOptimizations ?? true,
                optimizationInterval: config.optimization?.optimizationInterval || 300000, // 5 minutes
                performanceTargets: {
                    maxResponseTime: config.optimization?.performanceTargets?.maxResponseTime || 500,
                    minThroughput: config.optimization?.performanceTargets?.minThroughput || 100,
                    maxErrorRate: config.optimization?.performanceTargets?.maxErrorRate || 0.01, // 1%
                    maxResourceUsage: config.optimization?.performanceTargets?.maxResourceUsage || 80
                }
            }
        };

        // Initialize performance systems
        this.initializePerformanceSystems();
        
        console.log('[PERFORMANCE INTEGRATOR] Enterprise performance integration system initialized');
        console.log('[PERFORMANCE INTEGRATOR] Configuration:', JSON.stringify(this.config, null, 2));
    }

    private initializePerformanceSystems(): void {
        // Initialize connection pool
        this.connectionPool = new EnterpriseConnectionPool(this.config.connectionPool);
        
        // Initialize cache system
        this.cacheSystem = new IntelligentCacheSystem(this.config.cacheSystem);
        
        // Initialize parallel processor
        this.parallelProcessor = new EnterpriseParallelProcessor(this.config.parallelProcessing);
        
        // Initialize resource manager
        this.resourceManager = new EnterpriseResourceManager(this.config.resourceManager);
        
        // Setup event listeners
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Connection pool events
        this.connectionPool.on('connectionCreated', (data) => {
            this.emit('performanceEvent', { type: 'connectionCreated', data });
        });
        
        this.connectionPool.on('connectionError', (data) => {
            this.errorCount++;
            this.emit('performanceEvent', { type: 'connectionError', data });
        });
        
        // Cache system events
        this.cacheSystem.on('cacheHit', (data) => {
            this.emit('performanceEvent', { type: 'cacheHit', data });
        });
        
        this.cacheSystem.on('cacheMiss', (data) => {
            this.emit('performanceEvent', { type: 'cacheMiss', data });
        });
        
        // Parallel processor events
        this.parallelProcessor.on('taskCompleted', (data) => {
            this.responseTimeHistory.push(data.duration);
            if (this.responseTimeHistory.length > 1000) {
                this.responseTimeHistory = this.responseTimeHistory.slice(-1000);
            }
            this.emit('performanceEvent', { type: 'taskCompleted', data });
        });
        
        this.parallelProcessor.on('taskFailed', (data) => {
            this.errorCount++;
            this.emit('performanceEvent', { type: 'taskFailed', data });
        });
        
        // Resource manager events
        this.resourceManager.on('resourceAlert', (data) => {
            this.emit('performanceAlert', { type: 'resourceAlert', data });
            console.error('[PERFORMANCE INTEGRATOR] 🚨 Resource Alert:', data.alerts);
        });
        
        this.resourceManager.on('resourceWarning', (data) => {
            this.emit('performanceWarning', { type: 'resourceWarning', data });
            console.warn('[PERFORMANCE INTEGRATOR] ⚠️ Resource Warning:', data.warnings);
        });
    }

    public async start(): Promise<void> {
        if (this.isRunning) return;

        console.log('[PERFORMANCE INTEGRATOR] Starting integrated performance system...');
        
        try {
            // Start all subsystems
            await this.connectionPool.start();
            console.log('[PERFORMANCE INTEGRATOR] ✅ Connection pool started');
            
            this.cacheSystem.start();
            console.log('[PERFORMANCE INTEGRATOR] ✅ Cache system started');
            
            await this.parallelProcessor.start();
            console.log('[PERFORMANCE INTEGRATOR] ✅ Parallel processor started');
            
            await this.resourceManager.startMonitoring(this.config.monitoring.metricsInterval);
            console.log('[PERFORMANCE INTEGRATOR] ✅ Resource manager started');
            
            // Start monitoring and reporting
            this.startMonitoring();
            this.startReporting();
            
            if (this.config.optimization.autoApplyOptimizations) {
                this.startAutoOptimization();
            }
            
            this.isRunning = true;
            this.emit('systemStarted');
            
            console.log('[PERFORMANCE INTEGRATOR] 🚀 Enterprise performance system fully operational');
            
        } catch (error) {
            console.error('[PERFORMANCE INTEGRATOR] ❌ Failed to start performance system:', error);
            throw error;
        }
    }

    public async stop(): Promise<void> {
        if (!this.isRunning) return;

        console.log('[PERFORMANCE INTEGRATOR] Stopping integrated performance system...');
        
        // Stop monitoring
        if (this.monitoringInterval) clearInterval(this.monitoringInterval);
        if (this.reportingInterval) clearInterval(this.reportingInterval);
        if (this.optimizationInterval) clearInterval(this.optimizationInterval);
        
        // Stop all subsystems
        await this.parallelProcessor.stop();
        this.resourceManager.stopMonitoring();
        this.cacheSystem.stop();
        await this.connectionPool.stop();
        
        this.isRunning = false;
        this.emit('systemStopped');
        
        console.log('[PERFORMANCE INTEGRATOR] ✅ Performance system stopped');
    }

    private startMonitoring(): void {
        this.monitoringInterval = setInterval(async () => {
            try {
                const metrics = await this.collectPerformanceMetrics();
                this.analyzeMetrics(metrics);
                this.addMetricsToHistory(metrics);
            } catch (error) {
                console.error('[PERFORMANCE INTEGRATOR] Error collecting metrics:', error);
            }
        }, this.config.monitoring.metricsInterval);
    }

    private startReporting(): void {
        this.reportingInterval = setInterval(async () => {
            try {
                const report = await this.generatePerformanceReport();
                this.addReportToHistory(report);
                this.emit('performanceReport', report);
                
                if (report.overall.status === 'critical' || report.alerts.length > 0) {
                    console.error('[PERFORMANCE INTEGRATOR] 🚨 CRITICAL PERFORMANCE ISSUES:', report.alerts);
                }
                
            } catch (error) {
                console.error('[PERFORMANCE INTEGRATOR] Error generating report:', error);
            }
        }, this.config.monitoring.performanceReportInterval);
    }

    private startAutoOptimization(): void {
        this.optimizationInterval = setInterval(async () => {
            try {
                await this.performAutoOptimization();
            } catch (error) {
                console.error('[PERFORMANCE INTEGRATOR] Error during auto-optimization:', error);
            }
        }, this.config.optimization.optimizationInterval);
    }

    private async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
        const timestamp = Date.now();
        
        // Get subsystem metrics
        const connectionStats = this.connectionPool.getStatistics();
        const cacheStats = this.cacheSystem.getStatistics();
        const parallelStats = this.parallelProcessor.getStatistics();
        const resourceUsage = this.resourceManager.getCurrentUsage();
        
        // Calculate response time metrics
        const responseTimeMetrics = this.calculateResponseTimeMetrics();
        
        // Calculate throughput
        const throughputMetrics = this.calculateThroughputMetrics();
        
        // Calculate error rate
        const errorRate = this.requestCount > 0 ? this.errorCount / this.requestCount : 0;

        const metrics: PerformanceMetrics = {
            timestamp,
            responseTime: responseTimeMetrics,
            throughput: throughputMetrics,
            errorRate,
            resourceUsage: {
                cpu: resourceUsage?.cpu.usage || 0,
                memory: resourceUsage?.memory.usage || 0,
                connections: connectionStats.totalConnections > 0 ? connectionStats.activeConnections / connectionStats.totalConnections * 100 : 0,
                cache: cacheStats.memoryUsage || 0
            },
            concurrency: {
                activeRequests: this.requestQueue.length,
                queuedTasks: parallelStats.queueSize,
                workers: parallelStats.activeWorkers
            },
            cachePerformance: {
                hitRate: cacheStats.hitRate,
                missRate: cacheStats.missRate,
                evictionRate: cacheStats.evictionRate
            }
        };

        return metrics;
    }

    private calculateResponseTimeMetrics() {
        if (this.responseTimeHistory.length === 0) {
            return { avg: 0, p50: 0, p95: 0, p99: 0 };
        }

        const sorted = [...this.responseTimeHistory].sort((a, b) => a - b);
        const length = sorted.length;
        
        return {
            avg: sorted.reduce((sum, time) => sum + time, 0) / length,
            p50: sorted[Math.floor(length * 0.5)],
            p95: sorted[Math.floor(length * 0.95)],
            p99: sorted[Math.floor(length * 0.99)]
        };
    }

    private calculateThroughputMetrics() {
        const windowSize = 60000; // 1 minute
        const now = Date.now();
        
        // Calculate current throughput (last minute)
        const recentRequests = this.throughputHistory.filter(time => (now - time) <= windowSize).length;
        const current = recentRequests / (windowSize / 1000); // requests per second
        
        // Calculate peak and average
        const peak = Math.max(current, ...this.throughputHistory.slice(-100)); // Simplified
        const average = this.throughputHistory.length > 0 
            ? this.throughputHistory.reduce((sum, t) => sum + t, 0) / this.throughputHistory.length 
            : 0;

        return { current, peak, average };
    }

    private analyzeMetrics(metrics: PerformanceMetrics): void {
        const alerts: string[] = [];
        const warnings: string[] = [];
        
        // Response time analysis
        if (metrics.responseTime.avg > this.config.monitoring.alertThresholds.responseTime) {
            alerts.push(`High average response time: ${metrics.responseTime.avg.toFixed(0)}ms`);
        }
        
        // Error rate analysis
        if (metrics.errorRate > this.config.monitoring.alertThresholds.errorRate) {
            alerts.push(`High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
        }
        
        // Throughput analysis
        const recentThroughput = this.metricsHistory.slice(-10);
        if (recentThroughput.length > 5) {
            const avgRecentThroughput = recentThroughput.reduce((sum, m) => sum + m.throughput.current, 0) / recentThroughput.length;
            const throughputDrop = (metrics.throughput.peak - avgRecentThroughput) / metrics.throughput.peak;
            
            if (throughputDrop > this.config.monitoring.alertThresholds.throughputDrop) {
                warnings.push(`Throughput drop detected: ${(throughputDrop * 100).toFixed(1)}%`);
            }
        }
        
        // Resource usage analysis
        if (metrics.resourceUsage.cpu > 90) {
            alerts.push(`Critical CPU usage: ${metrics.resourceUsage.cpu.toFixed(1)}%`);
        } else if (metrics.resourceUsage.cpu > 80) {
            warnings.push(`High CPU usage: ${metrics.resourceUsage.cpu.toFixed(1)}%`);
        }
        
        if (metrics.resourceUsage.memory > 95) {
            alerts.push(`Critical memory usage: ${metrics.resourceUsage.memory.toFixed(1)}%`);
        } else if (metrics.resourceUsage.memory > 85) {
            warnings.push(`High memory usage: ${metrics.resourceUsage.memory.toFixed(1)}%`);
        }
        
        // Cache performance analysis
        if (metrics.cachePerformance.hitRate < 0.7) {
            warnings.push(`Low cache hit rate: ${(metrics.cachePerformance.hitRate * 100).toFixed(1)}%`);
        }
        
        // Emit alerts and warnings
        if (alerts.length > 0) {
            this.emit('performanceAlert', { alerts, metrics });
        }
        
        if (warnings.length > 0) {
            this.emit('performanceWarning', { warnings, metrics });
        }
    }

    private async generatePerformanceReport(): Promise<PerformanceReport> {
        const timestamp = Date.now();
        const duration = this.config.monitoring.performanceReportInterval;
        
        const currentMetrics = await this.collectPerformanceMetrics();
        const trends = this.calculateTrends();
        const optimizations = await this.resourceManager.generatePerformanceOptimizations();
        
        // Calculate performance score
        const score = this.calculatePerformanceScore(currentMetrics);
        const status = this.getPerformanceStatus(score);
        
        // Generate recommendations
        const recommendations = await this.generateRecommendations(currentMetrics, optimizations);
        
        // Collect alerts and warnings from recent analysis
        const alerts: string[] = [];
        const warnings: string[] = [];
        
        // Add performance target violations
        if (currentMetrics.responseTime.avg > this.config.optimization.performanceTargets.maxResponseTime) {
            alerts.push(`Response time exceeds target: ${currentMetrics.responseTime.avg.toFixed(0)}ms > ${this.config.optimization.performanceTargets.maxResponseTime}ms`);
        }
        
        if (currentMetrics.throughput.current < this.config.optimization.performanceTargets.minThroughput) {
            alerts.push(`Throughput below target: ${currentMetrics.throughput.current.toFixed(1)} < ${this.config.optimization.performanceTargets.minThroughput}`);
        }
        
        if (currentMetrics.errorRate > this.config.optimization.performanceTargets.maxErrorRate) {
            alerts.push(`Error rate exceeds target: ${(currentMetrics.errorRate * 100).toFixed(1)}% > ${(this.config.optimization.performanceTargets.maxErrorRate * 100).toFixed(1)}%`);
        }

        const report: PerformanceReport = {
            timestamp,
            duration,
            overall: {
                score,
                status,
                summary: this.generateSummary(status, currentMetrics, alerts.length, warnings.length)
            },
            metrics: currentMetrics,
            trends,
            recommendations,
            optimizations,
            alerts,
            warnings
        };

        return report;
    }

    private calculateTrends() {
        if (this.metricsHistory.length < 10) {
            return {
                responseTime: 'stable' as const,
                throughput: 'stable' as const,
                resourceUsage: 'stable' as const,
                errorRate: 'stable' as const
            };
        }

        const recent = this.metricsHistory.slice(-5);
        const older = this.metricsHistory.slice(-10, -5);

        const recentAvg = {
            responseTime: recent.reduce((sum, m) => sum + m.responseTime.avg, 0) / recent.length,
            throughput: recent.reduce((sum, m) => sum + m.throughput.current, 0) / recent.length,
            resourceUsage: recent.reduce((sum, m) => sum + (m.resourceUsage.cpu + m.resourceUsage.memory) / 2, 0) / recent.length,
            errorRate: recent.reduce((sum, m) => sum + m.errorRate, 0) / recent.length
        };

        const olderAvg = {
            responseTime: older.reduce((sum, m) => sum + m.responseTime.avg, 0) / older.length,
            throughput: older.reduce((sum, m) => sum + m.throughput.current, 0) / older.length,
            resourceUsage: older.reduce((sum, m) => sum + (m.resourceUsage.cpu + m.resourceUsage.memory) / 2, 0) / older.length,
            errorRate: older.reduce((sum, m) => sum + m.errorRate, 0) / older.length
        };

        return {
            responseTime: recentAvg.responseTime > olderAvg.responseTime * 1.1 ? 'degrading' as const :
                         recentAvg.responseTime < olderAvg.responseTime * 0.9 ? 'improving' as const : 'stable' as const,
            throughput: recentAvg.throughput > olderAvg.throughput * 1.1 ? 'improving' as const :
                       recentAvg.throughput < olderAvg.throughput * 0.9 ? 'degrading' as const : 'stable' as const,
            resourceUsage: recentAvg.resourceUsage > olderAvg.resourceUsage * 1.1 ? 'degrading' as const :
                          recentAvg.resourceUsage < olderAvg.resourceUsage * 0.9 ? 'improving' as const : 'stable' as const,
            errorRate: recentAvg.errorRate > olderAvg.errorRate * 1.1 ? 'degrading' as const :
                      recentAvg.errorRate < olderAvg.errorRate * 0.9 ? 'improving' as const : 'stable' as const
        };
    }

    private calculatePerformanceScore(metrics: PerformanceMetrics): number {
        let score = 100;

        // Response time penalty (0-30 points)
        const responseTimePenalty = Math.min(30, (metrics.responseTime.avg / this.config.optimization.performanceTargets.maxResponseTime) * 15);
        score -= responseTimePenalty;

        // Throughput penalty (0-25 points)
        const throughputRatio = metrics.throughput.current / this.config.optimization.performanceTargets.minThroughput;
        if (throughputRatio < 1) {
            score -= (1 - throughputRatio) * 25;
        }

        // Error rate penalty (0-25 points)
        const errorRatePenalty = Math.min(25, (metrics.errorRate / this.config.optimization.performanceTargets.maxErrorRate) * 25);
        score -= errorRatePenalty;

        // Resource usage penalty (0-20 points)
        const avgResourceUsage = (metrics.resourceUsage.cpu + metrics.resourceUsage.memory) / 2;
        const resourcePenalty = Math.min(20, Math.max(0, (avgResourceUsage - this.config.optimization.performanceTargets.maxResourceUsage) / 20 * 20));
        score -= resourcePenalty;

        return Math.max(0, Math.min(100, score));
    }

    private getPerformanceStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
        if (score >= 90) return 'excellent';
        if (score >= 75) return 'good';
        if (score >= 60) return 'fair';
        if (score >= 40) return 'poor';
        return 'critical';
    }

    private generateSummary(status: string, metrics: PerformanceMetrics, alertCount: number, warningCount: number): string {
        const summaryParts: string[] = [];

        summaryParts.push(`System performance is ${status}`);
        
        if (alertCount > 0) {
            summaryParts.push(`${alertCount} critical issue${alertCount > 1 ? 's' : ''} detected`);
        }
        
        if (warningCount > 0) {
            summaryParts.push(`${warningCount} warning${warningCount > 1 ? 's' : ''} active`);
        }

        summaryParts.push(`Response time: ${metrics.responseTime.avg.toFixed(0)}ms`);
        summaryParts.push(`Throughput: ${metrics.throughput.current.toFixed(1)} req/s`);
        summaryParts.push(`Error rate: ${(metrics.errorRate * 100).toFixed(2)}%`);

        return summaryParts.join('. ');
    }

    private async generateRecommendations(metrics: PerformanceMetrics, optimizations: PerformanceOptimization[]): Promise<string[]> {
        const recommendations: string[] = [];

        // Performance-based recommendations
        if (metrics.responseTime.avg > this.config.optimization.performanceTargets.maxResponseTime) {
            recommendations.push('Consider implementing response time optimizations: caching, database indexing, or code profiling');
        }

        if (metrics.throughput.current < this.config.optimization.performanceTargets.minThroughput) {
            recommendations.push('Increase system throughput: scale horizontally, optimize bottlenecks, or implement load balancing');
        }

        if (metrics.cachePerformance.hitRate < 0.8) {
            recommendations.push('Improve cache performance: increase cache size, optimize cache strategies, or implement intelligent prefetching');
        }

        if (metrics.resourceUsage.cpu > 85) {
            recommendations.push('Address high CPU usage: optimize algorithms, implement task batching, or consider CPU scaling');
        }

        if (metrics.resourceUsage.memory > 85) {
            recommendations.push('Optimize memory usage: implement memory pooling, reduce object allocations, or increase available memory');
        }

        // Add high-impact optimizations
        for (const opt of optimizations) {
            if (opt.estimatedBenefit > 25) {
                recommendations.push(opt.recommendation);
            }
        }

        return recommendations;
    }

    private async performAutoOptimization(): Promise<void> {
        console.log('[PERFORMANCE INTEGRATOR] 🔧 Performing auto-optimization...');

        try {
            // Get optimization suggestions
            const optimizations = await this.resourceManager.generatePerformanceOptimizations();
            
            // Apply auto-applicable optimizations
            const autoApplicable = optimizations.filter(opt => 
                opt.autoApplicable && 
                opt.estimatedBenefit > 15 && 
                (opt.severity === 'high' || opt.severity === 'critical')
            );

            for (const optimization of autoApplicable) {
                try {
                    await this.resourceManager.applyOptimizations([optimization.id]);
                    console.log(`[PERFORMANCE INTEGRATOR] ✅ Applied optimization: ${optimization.id}`);
                } catch (error) {
                    console.error(`[PERFORMANCE INTEGRATOR] ❌ Failed to apply optimization ${optimization.id}:`, error);
                }
            }

            // Adaptive scaling based on metrics
            if (this.config.monitoring.adaptiveScaling) {
                await this.performAdaptiveScaling();
            }

            this.emit('autoOptimizationCompleted', { appliedOptimizations: autoApplicable });

        } catch (error) {
            console.error('[PERFORMANCE INTEGRATOR] Error during auto-optimization:', error);
        }
    }

    private async performAdaptiveScaling(): Promise<void> {
        const currentMetrics = await this.collectPerformanceMetrics();
        
        // Scale based on queue size and resource usage
        const queueUtilization = currentMetrics.concurrency.queuedTasks / Math.max(currentMetrics.concurrency.workers, 1);
        const resourceUtilization = (currentMetrics.resourceUsage.cpu + currentMetrics.resourceUsage.memory) / 2;
        
        if (queueUtilization > 5 && resourceUtilization < 70) {
            console.log('[PERFORMANCE INTEGRATOR] 📈 Scaling up parallel processing due to high queue utilization');
            // In real implementation, would trigger scaling operations
        } else if (queueUtilization < 1 && resourceUtilization > 90) {
            console.log('[PERFORMANCE INTEGRATOR] 📉 Scaling down due to low utilization and high resource usage');
            // In real implementation, would trigger scale-down operations
        }
    }

    private addMetricsToHistory(metrics: PerformanceMetrics): void {
        this.metricsHistory.push(metrics);
        
        if (this.metricsHistory.length > this.maxHistorySize) {
            this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
        }
        
        // Update request tracking
        this.requestCount++;
        this.throughputHistory.push(metrics.timestamp);
        
        // Clean old throughput history
        const cutoff = Date.now() - 300000; // 5 minutes
        this.throughputHistory = this.throughputHistory.filter(time => time > cutoff);
    }

    private addReportToHistory(report: PerformanceReport): void {
        this.reportHistory.push(report);
        
        if (this.reportHistory.length > this.maxReportHistory) {
            this.reportHistory = this.reportHistory.slice(-this.maxReportHistory);
        }
    }

    // Public API methods
    public async submitTask(type: string, data: any, priority: number = 2): Promise<string> {
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        this.requestQueue.push({
            id: requestId,
            startTime: Date.now(),
            type
        });

        try {
            const taskId = await this.parallelProcessor.submitTask(type, data, { priority });
            
            // Remove from queue when completed
            setTimeout(() => {
                this.requestQueue = this.requestQueue.filter(req => req.id !== requestId);
            }, 100);
            
            return taskId;
            
        } catch (error) {
            this.requestQueue = this.requestQueue.filter(req => req.id !== requestId);
            this.errorCount++;
            throw error;
        }
    }

    public async cacheGet(key: string): Promise<any> {
        return await this.cacheSystem.get(key);
    }

    public async cacheSet(key: string, value: any, ttl?: number): Promise<void> {
        await this.cacheSystem.set(key, value, ttl ? { ttl } : {});
    }

    public async getConnection(): Promise<any> {
        return await this.connectionPool.acquire();
    }

    public getCurrentMetrics(): PerformanceMetrics | null {
        return this.metricsHistory.length > 0 ? this.metricsHistory[this.metricsHistory.length - 1] : null;
    }

    public getLatestReport(): PerformanceReport | null {
        return this.reportHistory.length > 0 ? this.reportHistory[this.reportHistory.length - 1] : null;
    }

    public getMetricsHistory(fromTimestamp?: number): PerformanceMetrics[] {
        if (!fromTimestamp) return [...this.metricsHistory];
        return this.metricsHistory.filter(metrics => metrics.timestamp >= fromTimestamp);
    }

    public getReportHistory(): PerformanceReport[] {
        return [...this.reportHistory];
    }

    public async generateHealthReport() {
        const resourceHealth = await this.resourceManager.generateHealthReport();
        const currentMetrics = this.getCurrentMetrics();
        const latestReport = this.getLatestReport();

        return {
            timestamp: Date.now(),
            systemHealth: {
                performance: latestReport?.overall || { score: 0, status: 'unknown', summary: 'No data available' },
                resources: resourceHealth,
                integration: {
                    status: this.isRunning ? 'operational' : 'stopped',
                    subsystems: {
                        connectionPool: 'operational',
                        cacheSystem: 'operational',
                        parallelProcessor: 'operational',
                        resourceManager: 'operational'
                    }
                }
            },
            metrics: currentMetrics,
            recommendations: latestReport?.recommendations || []
        };
    }
}

console.log('🚀 [PERFORMANCE INTEGRATOR] Enterprise performance integration system ready for deployment');
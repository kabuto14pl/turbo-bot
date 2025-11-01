/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * Enterprise Memory Profiler
 * Advanced memory monitoring and profiling for trading bot
 * Features: Heap snapshots, leak detection, GC metrics, memory alerts
 */

import * as v8 from 'v8';
import * as fs from 'fs';
import * as path from 'path';

interface MemorySnapshot {
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
    rss: number;
    gc: GCMetrics;
    leaks: MemoryLeak[];
}

interface GCMetrics {
    totalGCTime: number;
    majorGCCount: number;
    minorGCCount: number;
    gcPressure: number;
    averageGCDuration: number;
}

interface MemoryLeak {
    type: string;
    size: number;
    growthRate: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    location?: string;
}

interface MemoryAlert {
    level: 'warning' | 'critical';
    message: string;
    metric: string;
    value: number;
    threshold: number;
    timestamp: number;
}

export class EnterpriseMemoryProfiler {
    private snapshots: MemorySnapshot[] = [];
    private gcStartTime: number = 0;
    private gcMetrics: GCMetrics = {
        totalGCTime: 0,
        majorGCCount: 0,
        minorGCCount: 0,
        gcPressure: 0,
        averageGCDuration: 0
    };
    private alerts: MemoryAlert[] = [];
    private thresholds = {
        heapUsage: 0.85, // 85% heap usage
        gcPressure: 0.3, // 30% time in GC
        memoryGrowth: 50 * 1024 * 1024, // 50MB growth per minute
        rssLimit: 2 * 1024 * 1024 * 1024 // 2GB RSS limit
    };

    constructor(
        private snapshotInterval: number = 30000, // 30 seconds
        private alertCallback?: (alert: MemoryAlert) => void
    ) {
        this.setupGCMonitoring();
        this.startProfiling();
    }

    private setupGCMonitoring(): void {
        // Monitor GC events using performance hooks
        const { PerformanceObserver, performance } = require('perf_hooks');
        
        const obs = new PerformanceObserver((list: any) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
                if (entry.entryType === 'gc') {
                    this.handleGCEvent(entry);
                }
            });
        });
        
        obs.observe({ entryTypes: ['gc'] });
    }

    private handleGCEvent(entry: any): void {
        this.gcMetrics.totalGCTime += entry.duration;
        
        if (entry.kind === 1) { // Minor GC
            this.gcMetrics.minorGCCount++;
        } else if (entry.kind === 2) { // Major GC
            this.gcMetrics.majorGCCount++;
        }

        // Calculate GC pressure (time spent in GC)
        const totalGCs = this.gcMetrics.majorGCCount + this.gcMetrics.minorGCCount;
        this.gcMetrics.averageGCDuration = this.gcMetrics.totalGCTime / totalGCs;
        this.gcMetrics.gcPressure = this.gcMetrics.totalGCTime / (performance.now() || 1);

        // Alert on high GC pressure
        if (this.gcMetrics.gcPressure > this.thresholds.gcPressure) {
            this.createAlert('critical', 'High GC pressure detected', 'gcPressure', 
                this.gcMetrics.gcPressure, this.thresholds.gcPressure);
        }
    }

    private startProfiling(): void {
        setInterval(() => {
            this.takeSnapshot();
        }, this.snapshotInterval);

        // Initial snapshot
        this.takeSnapshot();
    }

    public takeSnapshot(): MemorySnapshot {
        const memUsage = process.memoryUsage();
        const heapStats = v8.getHeapStatistics();
        
        const snapshot: MemorySnapshot = {
            timestamp: Date.now(),
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            arrayBuffers: memUsage.arrayBuffers,
            rss: memUsage.rss,
            gc: { ...this.gcMetrics },
            leaks: this.detectMemoryLeaks()
        };

        this.snapshots.push(snapshot);
        this.checkThresholds(snapshot);
        this.cleanupOldSnapshots();

        return snapshot;
    }

    private detectMemoryLeaks(): MemoryLeak[] {
        const leaks: MemoryLeak[] = [];
        
        if (this.snapshots.length < 2) return leaks;

        const recent = this.snapshots.slice(-5); // Last 5 snapshots
        const first = recent[0];
        const last = recent[recent.length - 1];
        
        const timeDiff = (last.timestamp - first.timestamp) / 1000 / 60; // minutes
        const heapGrowth = last.heapUsed - first.heapUsed;
        const growthRate = heapGrowth / timeDiff; // bytes per minute

        // Detect heap growth leak
        if (growthRate > this.thresholds.memoryGrowth) {
            leaks.push({
                type: 'heap_growth',
                size: heapGrowth,
                growthRate,
                severity: growthRate > this.thresholds.memoryGrowth * 2 ? 'critical' : 'high'
            });
        }

        // Detect external memory leak
        const externalGrowth = last.external - first.external;
        if (externalGrowth > this.thresholds.memoryGrowth * 0.5) {
            leaks.push({
                type: 'external_memory',
                size: externalGrowth,
                growthRate: externalGrowth / timeDiff,
                severity: externalGrowth > this.thresholds.memoryGrowth ? 'high' : 'medium'
            });
        }

        return leaks;
    }

    private checkThresholds(snapshot: MemorySnapshot): void {
        // Check heap usage
        const heapUsageRatio = snapshot.heapUsed / snapshot.heapTotal;
        if (heapUsageRatio > this.thresholds.heapUsage) {
            this.createAlert('warning', 'High heap usage', 'heapUsage', 
                heapUsageRatio, this.thresholds.heapUsage);
        }

        // Check RSS limit
        if (snapshot.rss > this.thresholds.rssLimit) {
            this.createAlert('critical', 'RSS memory limit exceeded', 'rss', 
                snapshot.rss, this.thresholds.rssLimit);
        }

        // Check for memory leaks
        snapshot.leaks.forEach(leak => {
            if (leak.severity === 'critical' || leak.severity === 'high') {
                this.createAlert('critical', `Memory leak detected: ${leak.type}`, 
                    leak.type, leak.size, this.thresholds.memoryGrowth);
            }
        });
    }

    private createAlert(level: 'warning' | 'critical', message: string, 
                       metric: string, value: number, threshold: number): void {
        const alert: MemoryAlert = {
            level,
            message,
            metric,
            value,
            threshold,
            timestamp: Date.now()
        };

        this.alerts.push(alert);
        
        if (this.alertCallback) {
            this.alertCallback(alert);
        }

        console.log(`[MEMORY ALERT] ${level.toUpperCase()}: ${message} (${metric}: ${value} > ${threshold})`);
    }

    public generateHeapSnapshot(filename?: string): string {
        const snapshotFile = filename || `heap-${Date.now()}.heapsnapshot`;
        const snapshotPath = path.join(process.cwd(), 'monitoring', 'heap_snapshots', snapshotFile);
        
        // Ensure directory exists
        const dir = path.dirname(snapshotPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const snapshot = v8.writeHeapSnapshot(snapshotPath);
        console.log(`[MEMORY PROFILER] Heap snapshot saved: ${snapshotPath}`);
        
        return snapshot;
    }

    public getMemoryReport(): any {
        const latest = this.snapshots[this.snapshots.length - 1];
        const alerts = this.alerts.slice(-10); // Last 10 alerts
        
        return {
            current: latest,
            trends: this.analyzeTrends(),
            alerts,
            recommendations: this.getOptimizationRecommendations(),
            gcMetrics: this.gcMetrics,
            thresholds: this.thresholds
        };
    }

    private analyzeTrends(): any {
        if (this.snapshots.length < 2) return null;

        const recent = this.snapshots.slice(-10);
        const first = recent[0];
        const last = recent[recent.length - 1];
        
        const timeDiff = (last.timestamp - first.timestamp) / 1000 / 60; // minutes
        
        return {
            heapGrowthRate: (last.heapUsed - first.heapUsed) / timeDiff,
            rssGrowthRate: (last.rss - first.rss) / timeDiff,
            avgHeapUsage: recent.reduce((sum, s) => sum + s.heapUsed, 0) / recent.length,
            avgGCDuration: this.gcMetrics.averageGCDuration,
            gcFrequency: (this.gcMetrics.majorGCCount + this.gcMetrics.minorGCCount) / timeDiff
        };
    }

    private getOptimizationRecommendations(): string[] {
        const recommendations: string[] = [];
        const latest = this.snapshots[this.snapshots.length - 1];

        if (!latest) return recommendations;

        // High heap usage
        if (latest.heapUsed / latest.heapTotal > 0.8) {
            recommendations.push('Consider increasing heap size or implementing object pooling');
        }

        // High GC pressure
        if (this.gcMetrics.gcPressure > 0.2) {
            recommendations.push('Reduce object allocation frequency and implement caching strategies');
        }

        // Memory leaks detected
        if (latest.leaks.length > 0) {
            recommendations.push('Memory leaks detected - review event listeners and circular references');
        }

        // High external memory
        if (latest.external > 100 * 1024 * 1024) { // 100MB
            recommendations.push('High external memory usage - review buffer and stream management');
        }

        return recommendations;
    }

    private cleanupOldSnapshots(): void {
        // Keep only last 100 snapshots
        if (this.snapshots.length > 100) {
            this.snapshots = this.snapshots.slice(-100);
        }

        // Keep only last 50 alerts
        if (this.alerts.length > 50) {
            this.alerts = this.alerts.slice(-50);
        }
    }

    public forceGC(): void {
        if (global.gc) {
            global.gc();
            console.log('[MEMORY PROFILER] Forced garbage collection');
        } else {
            console.warn('[MEMORY PROFILER] Garbage collection not exposed. Use --expose-gc flag');
        }
    }

    public exportReport(filename?: string): string {
        const reportFile = filename || `memory-report-${Date.now()}.json`;
        const reportPath = path.join(process.cwd(), 'monitoring', 'memory_reports', reportFile);
        
        // Ensure directory exists
        const dir = path.dirname(reportPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const report = this.getMemoryReport();
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`[MEMORY PROFILER] Memory report exported: ${reportPath}`);
        return reportPath;
    }
}

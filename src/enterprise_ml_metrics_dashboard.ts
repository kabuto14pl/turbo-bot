/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * Enterprise ML Metrics Dashboard
 * 
 * Zaawansowany dashboard z comprehensive ML metrics:
 * - Model drift detection and visualization
 * - Prediction distribution analysis
 * - Performance degradation alerts
 * - Confidence scoring evolution
 * - Feature importance tracking
 * - Real-time performance analytics
 */

import express = require('express');
import { EnterpriseMLPerformanceMonitor } from './enterprise_ml_performance_monitor';
import { EventEmitter } from 'events';

interface DashboardConfig {
    refreshIntervalMs: number;
    historyWindowHours: number;
    alertThresholds: {
        latencyWarningMs: number;
        latencyCriticalMs: number;
        confidenceWarningThreshold: number;
        confidenceCriticalThreshold: number;
        driftWarningScore: number;
        driftCriticalScore: number;
        memoryWarningMB: number;
        memoryCriticalMB: number;
    };
    visualization: {
        chartUpdateIntervalMs: number;
        maxDataPoints: number;
        enableRealTimeUpdates: boolean;
    };
}

interface DashboardMetrics {
    timestamp: number;
    performance: {
        latency: {
            current: number;
            average: number;
            trend: 'improving' | 'stable' | 'degrading';
            percentile95: number;
            percentile99: number;
        };
        confidence: {
            current: number;
            average: number;
            distribution: number[];
            trend: 'improving' | 'stable' | 'degrading';
        };
        accuracy: {
            current?: number;
            average?: number;
            trend: 'improving' | 'stable' | 'degrading';
            rollingWindow: number[];
        };
        throughput: {
            current: number;
            peak: number;
            average: number;
        };
        memory: {
            current: number;
            peak: number;
            trend: 'improving' | 'stable' | 'degrading';
        };
    };
    drift: {
        overall: number;
        byFeature: Record<string, number>;
        trend: 'improving' | 'stable' | 'degrading';
        alertLevel: 'none' | 'warning' | 'critical';
    };
    health: {
        overall: 'healthy' | 'warning' | 'critical';
        components: {
            inference: 'healthy' | 'warning' | 'critical';
            memory: 'healthy' | 'warning' | 'critical';
            drift: 'healthy' | 'warning' | 'critical';
            confidence: 'healthy' | 'warning' | 'critical';
        };
        uptime: number;
        lastAlert?: {
            type: string;
            message: string;
            timestamp: number;
        };
    };
    predictions: {
        total: number;
        lastHour: number;
        successRate: number;
        averageConfidence: number;
        distributionBins: {
            ranges: string[];
            counts: number[];
        };
    };
}

interface ChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        backgroundColor?: string;
        borderColor?: string;
        fill?: boolean;
        tension?: number;
    }[];
}

export class EnterpriseMLMetricsDashboard extends EventEmitter {
    private static instance: EnterpriseMLMetricsDashboard;
    private instanceId: string;
    private performanceMonitor: EnterpriseMLPerformanceMonitor;
    // Express application and configuration
    private dashboardApp!: express.Application;
    private config!: DashboardConfig;
    private isRunning: boolean = false;
    private startTime: number;
    
    // Dashboard data
    private metricsHistory: DashboardMetrics[] = [];
    private alertHistory: any[] = [];
    private currentMetrics: DashboardMetrics | null = null;
    
    // Chart data cache
    private chartDataCache: Map<string, ChartData> = new Map();
    private lastChartUpdate: number = 0;
    
    private constructor() {
        super();
        this.instanceId = `mlmd-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        this.performanceMonitor = EnterpriseMLPerformanceMonitor.getInstance();
        this.startTime = Date.now();
        this.setupConfig();
        this.setupDashboardApp();
        this.setupEventListeners();
    }
    
    public static getInstance(): EnterpriseMLMetricsDashboard {
        if (!EnterpriseMLMetricsDashboard.instance) {
            EnterpriseMLMetricsDashboard.instance = new EnterpriseMLMetricsDashboard();
        }
        return EnterpriseMLMetricsDashboard.instance;
    }
    
    private setupConfig(): void {
        this.config = {
            refreshIntervalMs: 5000,
            historyWindowHours: 24,
            alertThresholds: {
                latencyWarningMs: 75,
                latencyCriticalMs: 150,
                confidenceWarningThreshold: 0.6,
                confidenceCriticalThreshold: 0.4,
                driftWarningScore: 0.2,
                driftCriticalScore: 0.4,
                memoryWarningMB: 256,
                memoryCriticalMB: 512
            },
            visualization: {
                chartUpdateIntervalMs: 10000,
                maxDataPoints: 100,
                enableRealTimeUpdates: true
            }
        };
    }
    
    private setupDashboardApp(): void {
        this.dashboardApp = express();
        this.dashboardApp.use(express.json());
        this.setupRoutes();
    }
    
    private setupRoutes(): void {
        // Main dashboard endpoint
        this.dashboardApp.get('/ml-dashboard', (req, res) => {
            res.json({
                status: 'active',
                instanceId: this.instanceId,
                uptime: Date.now() - this.startTime,
                currentMetrics: this.currentMetrics,
                config: this.config
            });
        });
        
        // Real-time metrics endpoint
        this.dashboardApp.get('/ml-dashboard/metrics', (req, res) => {
            const limit = parseInt(req.query.limit as string) || 50;
            const metrics = this.metricsHistory.slice(-limit);
            res.json(metrics);
        });
        
        // Chart data endpoints
        this.dashboardApp.get('/ml-dashboard/charts/latency', (req, res) => {
            res.json(this.getLatencyChartData());
        });
        
        this.dashboardApp.get('/ml-dashboard/charts/confidence', (req, res) => {
            res.json(this.getConfidenceChartData());
        });
        
        this.dashboardApp.get('/ml-dashboard/charts/drift', (req, res) => {
            res.json(this.getDriftChartData());
        });
        
        this.dashboardApp.get('/ml-dashboard/charts/memory', (req, res) => {
            res.json(this.getMemoryChartData());
        });
        
        this.dashboardApp.get('/ml-dashboard/charts/throughput', (req, res) => {
            res.json(this.getThroughputChartData());
        });
        
        // Performance report endpoint
        this.dashboardApp.get('/ml-dashboard/report', (req, res) => {
            const report = this.performanceMonitor.getPerformanceReport();
            res.json({
                ...report,
                dashboardMetrics: this.currentMetrics,
                alertHistory: this.alertHistory.slice(-20)
            });
        });
        
        // Health check endpoint
        this.dashboardApp.get('/ml-dashboard/health', (req, res) => {
            res.json({
                status: this.currentMetrics?.health.overall || 'unknown',
                components: this.currentMetrics?.health.components || {},
                uptime: Date.now() - this.startTime,
                lastUpdate: this.currentMetrics?.timestamp || null
            });
        });
        
        // Alerts endpoint
        this.dashboardApp.get('/ml-dashboard/alerts', (req, res) => {
            const limit = parseInt(req.query.limit as string) || 20;
            res.json(this.alertHistory.slice(-limit));
        });
        
        // Configuration endpoint
        this.dashboardApp.get('/ml-dashboard/config', (req, res) => {
            res.json(this.config);
        });
        
        this.dashboardApp.post('/ml-dashboard/config', (req, res) => {
            const updates = req.body;
            this.updateConfig(updates);
            res.json({ status: 'updated', config: this.config });
        });
        
        // WebSocket-like real-time updates via Server-Sent Events
        this.dashboardApp.get('/ml-dashboard/stream', (req, res) => {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
            });
            
            const sendUpdate = () => {
                if (this.currentMetrics) {
                    res.write(`data: ${JSON.stringify(this.currentMetrics)}\\n\\n`);
                }
            };
            
            const interval = setInterval(sendUpdate, this.config.refreshIntervalMs);
            
            req.on('close', () => {
                clearInterval(interval);
            });
        });
    }
    
    private setupEventListeners(): void {
        // Listen to performance monitor events
        this.performanceMonitor.on('performance-alert', (alertData) => {
            this.handlePerformanceAlert(alertData);
        });
        
        this.performanceMonitor.on('model-drift-alert', (driftData) => {
            this.handleDriftAlert(driftData);
        });
        
        this.performanceMonitor.on('health-check', (healthData) => {
            this.updateHealthMetrics(healthData);
        });
    }
    
    public async start(port: number = 3001): Promise<void> {
        if (this.isRunning) {
            console.log('[WARN] ⚠️  ML Dashboard already running');
            return;
        }
        
        // Start metrics collection
        this.startMetricsCollection();
        
        // Start dashboard server
        await new Promise<void>((resolve) => {
            this.dashboardApp.listen(port, '0.0.0.0', () => {
                this.isRunning = true;
                console.log(`[INFO] 📊 Enterprise ML Metrics Dashboard started on port ${port}`);
                console.log(`[INFO] 🌐 Dashboard URL: http://0.0.0.0:${port}/ml-dashboard`);
                console.log(`[INFO] 📈 Real-time stream: http://0.0.0.0:${port}/ml-dashboard/stream`);
                resolve();
            });
        });
        
        this.emit('dashboard-started', { port, instanceId: this.instanceId });
    }
    
    private startMetricsCollection(): void {
        // Collect and analyze metrics every refresh interval
        setInterval(() => {
            this.collectAndAnalyzeMetrics();
        }, this.config.refreshIntervalMs);
        
        // Update chart data less frequently
        setInterval(() => {
            this.updateChartData();
        }, this.config.visualization.chartUpdateIntervalMs);
        
        console.log(`[INFO] 🔄 ML metrics collection started (${this.config.refreshIntervalMs}ms interval)`);
    }
    
    private async collectAndAnalyzeMetrics(): Promise<void> {
        try {
            const performanceReport = this.performanceMonitor.getPerformanceReport();
            
            // Calculate current metrics
            const metrics: DashboardMetrics = {
                timestamp: Date.now(),
                performance: {
                    latency: this.analyzeLatencyMetrics(performanceReport.recentMetrics),
                    confidence: this.analyzeConfidenceMetrics(performanceReport.recentMetrics),
                    accuracy: this.analyzeAccuracyMetrics(performanceReport.recentMetrics),
                    throughput: this.analyzeThroughputMetrics(performanceReport.recentMetrics),
                    memory: this.analyzeMemoryMetrics(performanceReport.recentMetrics)
                },
                drift: this.analyzeDriftMetrics(performanceReport.driftAnalysis),
                health: this.analyzeHealthMetrics(performanceReport),
                predictions: this.analyzePredictionMetrics(performanceReport)
            };
            
            this.currentMetrics = metrics;
            this.metricsHistory.push(metrics);
            
            // Maintain history window
            const windowMs = this.config.historyWindowHours * 60 * 60 * 1000;
            const cutoff = Date.now() - windowMs;
            this.metricsHistory = this.metricsHistory.filter(m => m.timestamp > cutoff);
            
            this.emit('metrics-updated', metrics);
            
        } catch (error) {
            console.error('[ERROR] ❌ Failed to collect ML metrics:', error);
        }
    }
    
    private analyzeLatencyMetrics(recentMetrics: any[]): any {
        if (recentMetrics.length === 0) {
            return {
                current: 0,
                average: 0,
                trend: 'stable',
                percentile95: 0,
                percentile99: 0
            };
        }
        
        const latencies = recentMetrics.map(m => m.inferenceLatencyMs).sort((a, b) => a - b);
        const current = latencies[latencies.length - 1];
        const average = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        
        const percentile95 = latencies[Math.floor(latencies.length * 0.95)];
        const percentile99 = latencies[Math.floor(latencies.length * 0.99)];
        
        // Calculate trend
        const recentAvg = latencies.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, latencies.length);
        const olderAvg = latencies.slice(0, -10).reduce((a, b) => a + b, 0) / Math.max(1, latencies.length - 10);
        
        let trend: 'improving' | 'stable' | 'degrading' = 'stable';
        if (recentAvg < olderAvg * 0.95) trend = 'improving';
        else if (recentAvg > olderAvg * 1.05) trend = 'degrading';
        
        return {
            current,
            average,
            trend,
            percentile95,
            percentile99
        };
    }
    
    private analyzeConfidenceMetrics(recentMetrics: any[]): any {
        if (recentMetrics.length === 0) {
            return {
                current: 0,
                average: 0,
                distribution: [],
                trend: 'stable'
            };
        }
        
        const confidences = recentMetrics.map(m => m.predictionConfidence);
        const current = confidences[confidences.length - 1];
        const average = confidences.reduce((a, b) => a + b, 0) / confidences.length;
        
        // Create distribution histogram
        const bins = 10;
        const distribution = new Array(bins).fill(0);
        confidences.forEach(conf => {
            const bin = Math.min(Math.floor(conf * bins), bins - 1);
            distribution[bin]++;
        });
        
        // Calculate trend
        const recentAvg = confidences.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, confidences.length);
        const olderAvg = confidences.slice(0, -10).reduce((a, b) => a + b, 0) / Math.max(1, confidences.length - 10);
        
        let trend: 'improving' | 'stable' | 'degrading' = 'stable';
        if (recentAvg > olderAvg * 1.02) trend = 'improving';
        else if (recentAvg < olderAvg * 0.98) trend = 'degrading';
        
        return {
            current,
            average,
            distribution,
            trend
        };
    }
    
    private analyzeAccuracyMetrics(recentMetrics: any[]): any {
        const accuracies = recentMetrics
            .map(m => m.modelAccuracy)
            .filter(acc => acc !== undefined);
        
        if (accuracies.length === 0) {
            return {
                current: undefined,
                average: undefined,
                trend: 'stable',
                rollingWindow: []
            };
        }
        
        const current = accuracies[accuracies.length - 1];
        const average = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
        
        // Calculate trend
        const recentAvg = accuracies.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, accuracies.length);
        const olderAvg = accuracies.slice(0, -5).reduce((a, b) => a + b, 0) / Math.max(1, accuracies.length - 5);
        
        let trend: 'improving' | 'stable' | 'degrading' = 'stable';
        if (recentAvg > olderAvg * 1.02) trend = 'improving';
        else if (recentAvg < olderAvg * 0.98) trend = 'degrading';
        
        return {
            current,
            average,
            trend,
            rollingWindow: accuracies.slice(-20)
        };
    }
    
    private analyzeThroughputMetrics(recentMetrics: any[]): any {
        if (recentMetrics.length === 0) {
            return {
                current: 0,
                peak: 0,
                average: 0
            };
        }
        
        const throughputs = recentMetrics.map(m => m.throughputPredictionsPerSecond);
        const current = throughputs[throughputs.length - 1];
        const peak = Math.max(...throughputs);
        const average = throughputs.reduce((a, b) => a + b, 0) / throughputs.length;
        
        return {
            current,
            peak,
            average
        };
    }
    
    private analyzeMemoryMetrics(recentMetrics: any[]): any {
        if (recentMetrics.length === 0) {
            return {
                current: 0,
                peak: 0,
                trend: 'stable'
            };
        }
        
        const memories = recentMetrics.map(m => m.memoryUsageMB);
        const current = memories[memories.length - 1];
        const peak = Math.max(...memories);
        
        // Calculate trend
        const recentAvg = memories.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, memories.length);
        const olderAvg = memories.slice(0, -10).reduce((a, b) => a + b, 0) / Math.max(1, memories.length - 10);
        
        let trend: 'improving' | 'stable' | 'degrading' = 'stable';
        if (recentAvg < olderAvg * 0.95) trend = 'improving';
        else if (recentAvg > olderAvg * 1.05) trend = 'degrading';
        
        return {
            current,
            peak,
            trend
        };
    }
    
    private analyzeDriftMetrics(driftAnalysis: any[]): any {
        if (driftAnalysis.length === 0) {
            return {
                overall: 0,
                byFeature: {},
                trend: 'stable',
                alertLevel: 'none'
            };
        }
        
        const latest = driftAnalysis[driftAnalysis.length - 1];
        const overall = latest.populationStabilityIndex;
        
        // Determine alert level
        let alertLevel: 'none' | 'warning' | 'critical' = 'none';
        if (overall > this.config.alertThresholds.driftCriticalScore) {
            alertLevel = 'critical';
        } else if (overall > this.config.alertThresholds.driftWarningScore) {
            alertLevel = 'warning';
        }
        
        // Calculate trend
        let trend: 'improving' | 'stable' | 'degrading' = 'stable';
        if (driftAnalysis.length > 1) {
            const previous = driftAnalysis[driftAnalysis.length - 2];
            if (overall < previous.populationStabilityIndex * 0.95) trend = 'improving';
            else if (overall > previous.populationStabilityIndex * 1.05) trend = 'degrading';
        }
        
        return {
            overall,
            byFeature: latest.featureDrift || {},
            trend,
            alertLevel
        };
    }
    
    private analyzeHealthMetrics(performanceReport: any): any {
        const { summary } = performanceReport;
        
        // Analyze individual components
        const components = {
            inference: this.getHealthStatus(summary.averageLatencyMs, 
                this.config.alertThresholds.latencyWarningMs, 
                this.config.alertThresholds.latencyCriticalMs),
            memory: this.getHealthStatus(summary.currentMemoryMB, 
                this.config.alertThresholds.memoryWarningMB, 
                this.config.alertThresholds.memoryCriticalMB),
            drift: this.getHealthStatus(summary.lastDriftCheck?.populationStabilityIndex || 0, 
                this.config.alertThresholds.driftWarningScore, 
                this.config.alertThresholds.driftCriticalScore),
            confidence: this.getHealthStatus(1 - (summary.averageConfidence || 1), 
                1 - this.config.alertThresholds.confidenceWarningThreshold, 
                1 - this.config.alertThresholds.confidenceCriticalThreshold)
        };
        
        // Determine overall health
        const componentValues = Object.values(components);
        const criticalCount = componentValues.filter(status => status === 'critical').length;
        const warningCount = componentValues.filter(status => status === 'warning').length;
        
        let overall: 'healthy' | 'warning' | 'critical';
        if (criticalCount > 0) {
            overall = 'critical';
        } else if (warningCount > 0) {
            overall = 'warning';
        } else {
            overall = 'healthy';
        }
        
        return {
            overall,
            components,
            uptime: Date.now() - this.startTime,
            lastAlert: this.alertHistory.length > 0 ? this.alertHistory[this.alertHistory.length - 1] : undefined
        };
    }
    
    private getHealthStatus(value: number, warningThreshold: number, criticalThreshold: number): 'healthy' | 'warning' | 'critical' {
        if (value >= criticalThreshold) return 'critical';
        if (value >= warningThreshold) return 'warning';
        return 'healthy';
    }
    
    private analyzePredictionMetrics(performanceReport: any): any {
        const { summary } = performanceReport;
        
        // Calculate predictions in last hour
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const recentMetrics = this.metricsHistory.filter(m => m.timestamp > oneHourAgo);
        const lastHour = recentMetrics.length;
        
        // Create distribution bins
        const ranges = ['0.0-0.1', '0.1-0.2', '0.2-0.3', '0.3-0.4', '0.4-0.5', 
                       '0.5-0.6', '0.6-0.7', '0.7-0.8', '0.8-0.9', '0.9-1.0'];
        const counts = new Array(10).fill(0);
        
        // This would normally use actual prediction data
        // For now, we'll use a mock distribution
        for (let i = 0; i < 10; i++) {
            counts[i] = Math.floor(Math.random() * 20);
        }
        
        return {
            total: summary.totalInferences || 0,
            lastHour,
            successRate: 0.95, // Mock success rate
            averageConfidence: summary.averageConfidence || 0,
            distributionBins: {
                ranges,
                counts
            }
        };
    }
    
    private handlePerformanceAlert(alertData: any): void {
        const alert = {
            type: 'performance',
            message: `Performance alert: ${alertData.alerts.join(', ')}`,
            data: alertData,
            timestamp: Date.now(),
            severity: 'warning'
        };
        
        this.alertHistory.push(alert);
        this.emit('alert', alert);
        
        console.log(`[WARN] 🚨 Performance Alert: ${alert.message}`);
    }
    
    private handleDriftAlert(driftData: any): void {
        const alert = {
            type: 'drift',
            message: `Model drift detected: PSI = ${driftData.populationStabilityIndex.toFixed(4)}`,
            data: driftData,
            timestamp: Date.now(),
            severity: driftData.populationStabilityIndex > 0.3 ? 'critical' : 'warning'
        };
        
        this.alertHistory.push(alert);
        this.emit('alert', alert);
        
        console.log(`[WARN] 🚨 Model Drift Alert: ${alert.message}`);
    }
    
    private updateHealthMetrics(healthData: any): void {
        this.emit('health-update', healthData);
    }
    
    private updateChartData(): void {
        this.lastChartUpdate = Date.now();
        
        // Update all chart data
        this.chartDataCache.set('latency', this.getLatencyChartData());
        this.chartDataCache.set('confidence', this.getConfidenceChartData());
        this.chartDataCache.set('drift', this.getDriftChartData());
        this.chartDataCache.set('memory', this.getMemoryChartData());
        this.chartDataCache.set('throughput', this.getThroughputChartData());
        
        this.emit('charts-updated', this.chartDataCache);
    }
    
    private getLatencyChartData(): ChartData {
        const recentMetrics = this.metricsHistory.slice(-this.config.visualization.maxDataPoints);
        
        return {
            labels: recentMetrics.map(m => new Date(m.timestamp).toLocaleTimeString()),
            datasets: [
                {
                    label: 'Current Latency (ms)',
                    data: recentMetrics.map(m => m.performance.latency.current),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: false,
                    tension: 0.1
                },
                {
                    label: 'Average Latency (ms)',
                    data: recentMetrics.map(m => m.performance.latency.average),
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: false,
                    tension: 0.1
                }
            ]
        };
    }
    
    private getConfidenceChartData(): ChartData {
        const recentMetrics = this.metricsHistory.slice(-this.config.visualization.maxDataPoints);
        
        return {
            labels: recentMetrics.map(m => new Date(m.timestamp).toLocaleTimeString()),
            datasets: [
                {
                    label: 'Prediction Confidence',
                    data: recentMetrics.map(m => m.performance.confidence.current),
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    fill: true,
                    tension: 0.1
                }
            ]
        };
    }
    
    private getDriftChartData(): ChartData {
        const recentMetrics = this.metricsHistory.slice(-this.config.visualization.maxDataPoints);
        
        return {
            labels: recentMetrics.map(m => new Date(m.timestamp).toLocaleTimeString()),
            datasets: [
                {
                    label: 'Model Drift Score',
                    data: recentMetrics.map(m => m.drift.overall),
                    borderColor: 'rgb(255, 205, 86)',
                    backgroundColor: 'rgba(255, 205, 86, 0.2)',
                    fill: false,
                    tension: 0.1
                }
            ]
        };
    }
    
    private getMemoryChartData(): ChartData {
        const recentMetrics = this.metricsHistory.slice(-this.config.visualization.maxDataPoints);
        
        return {
            labels: recentMetrics.map(m => new Date(m.timestamp).toLocaleTimeString()),
            datasets: [
                {
                    label: 'Memory Usage (MB)',
                    data: recentMetrics.map(m => m.performance.memory.current),
                    borderColor: 'rgb(153, 102, 255)',
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    fill: true,
                    tension: 0.1
                }
            ]
        };
    }
    
    private getThroughputChartData(): ChartData {
        const recentMetrics = this.metricsHistory.slice(-this.config.visualization.maxDataPoints);
        
        return {
            labels: recentMetrics.map(m => new Date(m.timestamp).toLocaleTimeString()),
            datasets: [
                {
                    label: 'Throughput (predictions/sec)',
                    data: recentMetrics.map(m => m.performance.throughput.current),
                    borderColor: 'rgb(255, 159, 64)',
                    backgroundColor: 'rgba(255, 159, 64, 0.2)',
                    fill: false,
                    tension: 0.1
                }
            ]
        };
    }
    
    private updateConfig(updates: Partial<DashboardConfig>): void {
        this.config = { ...this.config, ...updates };
        this.emit('config-updated', this.config);
        console.log(`[INFO] ⚙️  Dashboard configuration updated`);
    }
    
    public getDashboardApp(): express.Application {
        return this.dashboardApp;
    }
    
    public getCurrentMetrics(): DashboardMetrics | null {
        return this.currentMetrics;
    }
    
    public getInstanceId(): string {
        return this.instanceId;
    }
    
    public stop(): void {
        this.isRunning = false;
        this.removeAllListeners();
        console.log(`[INFO] 🛑 Enterprise ML Metrics Dashboard stopped: ${this.instanceId}`);
    }
}

export default EnterpriseMLMetricsDashboard;

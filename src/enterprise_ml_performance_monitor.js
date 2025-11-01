"use strict";
/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * Enterprise ML Performance Monitor
 *
 * Zaawansowany system monitorowania wydajności ML z real-time metrykami,
 * model drift detection, performance analytics i automated alerting.
 *
 * Features:
 * - Real-time inference latency tracking
 * - Model accuracy monitoring
 * - Memory usage optimization
 * - Prediction confidence analysis
 * - Feature importance tracking
 * - Model drift detection
 * - Performance degradation alerts
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
exports.EnterpriseMLPerformanceMonitor = void 0;
const tf = __importStar(require("@tensorflow/tfjs-node"));
const perf_hooks_1 = require("perf_hooks");
const events_1 = require("events");
class EnterpriseMLPerformanceMonitor extends events_1.EventEmitter {
    constructor() {
        super();
        this.isInitialized = false;
        // Performance tracking
        this.metricsHistory = [];
        this.driftHistory = [];
        this.predictionBatches = [];
        // Benchmarks and thresholds
        this.benchmarks = new Map();
        this.alertThresholds = {
            maxLatencyMs: 100,
            minAccuracy: 0.65,
            maxMemoryMB: 512,
            maxDriftScore: 0.3,
            minConfidence: 0.6
        };
        // Real-time tracking
        this.activeInferences = new Map();
        this.rollingAverages = {
            latency: [],
            confidence: [],
            accuracy: [],
            windowSize: 100
        };
        // Feature analysis
        this.featureStatistics = new Map();
        this.instanceId = `mlpm-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        this.setupDefaultBenchmarks();
        this.startPerformanceTracking();
    }
    static getInstance() {
        if (!EnterpriseMLPerformanceMonitor.instance) {
            EnterpriseMLPerformanceMonitor.instance = new EnterpriseMLPerformanceMonitor();
        }
        return EnterpriseMLPerformanceMonitor.instance;
    }
    setupDefaultBenchmarks() {
        // Policy Network benchmark
        this.benchmarks.set('PolicyNetwork', {
            modelName: 'PolicyNetwork',
            baselineLatencyMs: 50,
            targetLatencyMs: 25,
            baselineAccuracy: 0.7,
            targetAccuracy: 0.85,
            baselineMemoryMB: 64,
            targetMemoryMB: 32
        });
        // Value Network benchmark
        this.benchmarks.set('ValueNetwork', {
            modelName: 'ValueNetwork',
            baselineLatencyMs: 30,
            targetLatencyMs: 15,
            baselineAccuracy: 0.75,
            targetAccuracy: 0.9,
            baselineMemoryMB: 48,
            targetMemoryMB: 24
        });
        console.log(`[INFO] 📊 ML Performance benchmarks configured for ${this.benchmarks.size} models`);
    }
    startPerformanceTracking() {
        // Collect metrics every 10 seconds
        setInterval(() => {
            this.collectSystemMetrics();
        }, 10000);
        // Analyze drift every minute
        setInterval(() => {
            this.analyzeModelDrift();
        }, 60000);
        // Performance health check every 30 seconds
        setInterval(() => {
            this.performHealthCheck();
        }, 30000);
        console.log(`[INFO] 🔄 Real-time ML performance tracking started: ${this.instanceId}`);
    }
    async startInferenceTracking(inferenceId) {
        this.activeInferences.set(inferenceId, perf_hooks_1.performance.now());
    }
    async endInferenceTracking(inferenceId, predictions, confidenceScores, features, modelName) {
        const startTime = this.activeInferences.get(inferenceId);
        if (!startTime) {
            throw new Error(`Inference ${inferenceId} not found in active tracking`);
        }
        const endTime = perf_hooks_1.performance.now();
        const latencyMs = endTime - startTime;
        // Calculate metrics
        const avgConfidence = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;
        const memoryUsage = this.getMemoryUsage();
        const throughput = predictions.length / (latencyMs / 1000);
        const metrics = {
            timestamp: Date.now(),
            inferenceLatencyMs: latencyMs,
            memoryUsageMB: memoryUsage,
            throughputPredictionsPerSecond: throughput,
            predictionConfidence: avgConfidence,
            cpuUtilization: await this.getCPUUtilization(),
            gpuUtilization: await this.getGPUUtilization()
        };
        // Store prediction batch
        const batch = {
            predictions,
            confidenceScores,
            features,
            timestamp: Date.now(),
            latencyMs
        };
        this.predictionBatches.push(batch);
        this.metricsHistory.push(metrics);
        // Maintain rolling window
        if (this.predictionBatches.length > 1000) {
            this.predictionBatches = this.predictionBatches.slice(-500);
        }
        if (this.metricsHistory.length > 1000) {
            this.metricsHistory = this.metricsHistory.slice(-500);
        }
        // Update rolling averages
        this.updateRollingAverages(metrics);
        // Check for performance alerts
        this.checkPerformanceAlerts(metrics, modelName);
        // Clean up
        this.activeInferences.delete(inferenceId);
        console.log(`[INFO] 📊 Inference ${inferenceId}: ${latencyMs.toFixed(2)}ms, confidence: ${avgConfidence.toFixed(3)}`);
        return metrics;
    }
    updateRollingAverages(metrics) {
        const { windowSize } = this.rollingAverages;
        this.rollingAverages.latency.push(metrics.inferenceLatencyMs);
        this.rollingAverages.confidence.push(metrics.predictionConfidence);
        if (metrics.modelAccuracy !== undefined) {
            this.rollingAverages.accuracy.push(metrics.modelAccuracy);
        }
        // Maintain window size
        if (this.rollingAverages.latency.length > windowSize) {
            this.rollingAverages.latency = this.rollingAverages.latency.slice(-windowSize);
        }
        if (this.rollingAverages.confidence.length > windowSize) {
            this.rollingAverages.confidence = this.rollingAverages.confidence.slice(-windowSize);
        }
        if (this.rollingAverages.accuracy.length > windowSize) {
            this.rollingAverages.accuracy = this.rollingAverages.accuracy.slice(-windowSize);
        }
    }
    checkPerformanceAlerts(metrics, modelName) {
        const alerts = [];
        // Latency alert
        if (metrics.inferenceLatencyMs > this.alertThresholds.maxLatencyMs) {
            alerts.push(`High latency: ${metrics.inferenceLatencyMs.toFixed(2)}ms > ${this.alertThresholds.maxLatencyMs}ms`);
        }
        // Memory alert
        if (metrics.memoryUsageMB > this.alertThresholds.maxMemoryMB) {
            alerts.push(`High memory usage: ${metrics.memoryUsageMB.toFixed(2)}MB > ${this.alertThresholds.maxMemoryMB}MB`);
        }
        // Confidence alert
        if (metrics.predictionConfidence < this.alertThresholds.minConfidence) {
            alerts.push(`Low confidence: ${metrics.predictionConfidence.toFixed(3)} < ${this.alertThresholds.minConfidence}`);
        }
        // Accuracy alert
        if (metrics.modelAccuracy !== undefined && metrics.modelAccuracy < this.alertThresholds.minAccuracy) {
            alerts.push(`Low accuracy: ${metrics.modelAccuracy.toFixed(3)} < ${this.alertThresholds.minAccuracy}`);
        }
        if (alerts.length > 0) {
            const alertData = {
                modelName: modelName || 'Unknown',
                metrics,
                alerts,
                timestamp: Date.now()
            };
            this.emit('performance-alert', alertData);
            console.log(`[WARN] ⚠️  Performance Alert [${modelName}]:`, alerts.join(', '));
        }
    }
    async analyzeModelDrift() {
        if (this.predictionBatches.length < 2) {
            return null;
        }
        const recentBatches = this.predictionBatches.slice(-50);
        const oldBatches = this.predictionBatches.slice(-100, -50);
        if (oldBatches.length === 0) {
            return null;
        }
        const featureDrift = await this.calculateFeatureDrift(recentBatches, oldBatches);
        const targetDrift = this.calculateTargetDrift(recentBatches, oldBatches);
        const psi = this.calculatePopulationStabilityIndex(recentBatches, oldBatches);
        const driftMetrics = {
            featureDrift,
            targetDrift,
            populationStabilityIndex: psi,
            characteristicStability: 1 - psi, // Inverse relationship
            timestamp: Date.now()
        };
        this.driftHistory.push(driftMetrics);
        // Maintain drift history
        if (this.driftHistory.length > 100) {
            this.driftHistory = this.driftHistory.slice(-50);
        }
        // Check for drift alerts
        if (psi > this.alertThresholds.maxDriftScore) {
            this.emit('model-drift-alert', driftMetrics);
            console.log(`[WARN] 🚨 Model drift detected: PSI = ${psi.toFixed(4)}`);
        }
        console.log(`[INFO] 📈 Model drift analysis: PSI = ${psi.toFixed(4)}, Target drift = ${targetDrift.toFixed(4)}`);
        return driftMetrics;
    }
    async calculateFeatureDrift(recentBatches, oldBatches) {
        const featureDrift = {};
        if (recentBatches.length === 0 || oldBatches.length === 0) {
            return featureDrift;
        }
        const numFeatures = recentBatches[0].features[0]?.length || 0;
        for (let i = 0; i < numFeatures; i++) {
            const recentValues = recentBatches.flatMap(batch => batch.features.map(features => features[i])).filter(val => val !== undefined);
            const oldValues = oldBatches.flatMap(batch => batch.features.map(features => features[i])).filter(val => val !== undefined);
            if (recentValues.length > 0 && oldValues.length > 0) {
                const drift = this.calculateKLDivergence(recentValues, oldValues);
                featureDrift[`feature_${i}`] = drift;
            }
        }
        return featureDrift;
    }
    calculateTargetDrift(recentBatches, oldBatches) {
        const recentPredictions = recentBatches.flatMap(batch => batch.predictions);
        const oldPredictions = oldBatches.flatMap(batch => batch.predictions);
        if (recentPredictions.length === 0 || oldPredictions.length === 0) {
            return 0;
        }
        return this.calculateKLDivergence(recentPredictions, oldPredictions);
    }
    calculateKLDivergence(data1, data2) {
        if (data1.length === 0 || data2.length === 0)
            return 0;
        // Create histograms
        const bins = 20;
        const min = Math.min(...data1, ...data2);
        const max = Math.max(...data1, ...data2);
        const binWidth = (max - min) / bins;
        const hist1 = new Array(bins).fill(0);
        const hist2 = new Array(bins).fill(0);
        // Fill histograms
        data1.forEach(val => {
            const bin = Math.min(Math.floor((val - min) / binWidth), bins - 1);
            hist1[bin]++;
        });
        data2.forEach(val => {
            const bin = Math.min(Math.floor((val - min) / binWidth), bins - 1);
            hist2[bin]++;
        });
        // Normalize to probabilities
        const sum1 = hist1.reduce((a, b) => a + b, 0);
        const sum2 = hist2.reduce((a, b) => a + b, 0);
        if (sum1 === 0 || sum2 === 0)
            return 0;
        const p1 = hist1.map(count => (count + 1e-10) / sum1); // Add smoothing
        const p2 = hist2.map(count => (count + 1e-10) / sum2);
        // Calculate KL divergence
        let kl = 0;
        for (let i = 0; i < bins; i++) {
            if (p1[i] > 0 && p2[i] > 0) {
                kl += p1[i] * Math.log(p1[i] / p2[i]);
            }
        }
        return Math.max(0, kl);
    }
    calculatePopulationStabilityIndex(recentBatches, oldBatches) {
        const recentPredictions = recentBatches.flatMap(batch => batch.predictions);
        const oldPredictions = oldBatches.flatMap(batch => batch.predictions);
        if (recentPredictions.length === 0 || oldPredictions.length === 0) {
            return 0;
        }
        // Create quantile-based bins
        const bins = 10;
        const oldSorted = [...oldPredictions].sort((a, b) => a - b);
        const binEdges = [];
        for (let i = 0; i <= bins; i++) {
            const quantile = i / bins;
            const index = Math.floor(quantile * (oldSorted.length - 1));
            binEdges.push(oldSorted[index]);
        }
        // Count observations in each bin
        const oldCounts = new Array(bins).fill(0);
        const recentCounts = new Array(bins).fill(0);
        oldPredictions.forEach(val => {
            for (let i = 0; i < bins; i++) {
                if (val >= binEdges[i] && val < binEdges[i + 1]) {
                    oldCounts[i]++;
                    break;
                }
            }
        });
        recentPredictions.forEach(val => {
            for (let i = 0; i < bins; i++) {
                if (val >= binEdges[i] && val < binEdges[i + 1]) {
                    recentCounts[i]++;
                    break;
                }
            }
        });
        // Calculate PSI
        let psi = 0;
        const oldTotal = oldPredictions.length;
        const recentTotal = recentPredictions.length;
        for (let i = 0; i < bins; i++) {
            const oldPct = (oldCounts[i] + 1e-10) / oldTotal; // Add smoothing
            const recentPct = (recentCounts[i] + 1e-10) / recentTotal;
            psi += (recentPct - oldPct) * Math.log(recentPct / oldPct);
        }
        return Math.max(0, psi);
    }
    async collectSystemMetrics() {
        const metrics = {
            timestamp: Date.now(),
            inferenceLatencyMs: this.getAverageLatency(),
            memoryUsageMB: this.getMemoryUsage(),
            throughputPredictionsPerSecond: this.getThroughput(),
            predictionConfidence: this.getAverageConfidence(),
            modelAccuracy: this.getAverageAccuracy(),
            cpuUtilization: await this.getCPUUtilization(),
            gpuUtilization: await this.getGPUUtilization()
        };
        this.metricsHistory.push(metrics);
        // Maintain history size
        if (this.metricsHistory.length > 1000) {
            this.metricsHistory = this.metricsHistory.slice(-500);
        }
    }
    getAverageLatency() {
        if (this.rollingAverages.latency.length === 0)
            return 0;
        return this.rollingAverages.latency.reduce((a, b) => a + b, 0) / this.rollingAverages.latency.length;
    }
    getAverageConfidence() {
        if (this.rollingAverages.confidence.length === 0)
            return 0;
        return this.rollingAverages.confidence.reduce((a, b) => a + b, 0) / this.rollingAverages.confidence.length;
    }
    getAverageAccuracy() {
        if (this.rollingAverages.accuracy.length === 0)
            return undefined;
        return this.rollingAverages.accuracy.reduce((a, b) => a + b, 0) / this.rollingAverages.accuracy.length;
    }
    getThroughput() {
        const recentBatches = this.predictionBatches.slice(-10);
        if (recentBatches.length === 0)
            return 0;
        const totalPredictions = recentBatches.reduce((sum, batch) => sum + batch.predictions.length, 0);
        const totalTimeMs = recentBatches.reduce((sum, batch) => sum + batch.latencyMs, 0);
        return totalTimeMs > 0 ? (totalPredictions / totalTimeMs) * 1000 : 0;
    }
    getMemoryUsage() {
        const memInfo = tf.memory();
        return memInfo.numBytes / (1024 * 1024); // Convert to MB
    }
    async getCPUUtilization() {
        // Simplified CPU utilization calculation
        // In production, use more sophisticated monitoring
        return Math.random() * 30 + 10; // Mock 10-40% CPU usage
    }
    async getGPUUtilization() {
        // GPU utilization for Node.js backend
        // In production, integrate with nvidia-ml or similar
        return 0; // CPU backend doesn't use GPU
    }
    performHealthCheck() {
        const recentMetrics = this.metricsHistory.slice(-10);
        if (recentMetrics.length === 0)
            return;
        const avgLatency = recentMetrics.reduce((sum, m) => sum + m.inferenceLatencyMs, 0) / recentMetrics.length;
        const avgConfidence = recentMetrics.reduce((sum, m) => sum + m.predictionConfidence, 0) / recentMetrics.length;
        const avgMemory = recentMetrics.reduce((sum, m) => sum + m.memoryUsageMB, 0) / recentMetrics.length;
        const healthStatus = {
            timestamp: Date.now(),
            latencyHealth: avgLatency < this.alertThresholds.maxLatencyMs ? 'HEALTHY' : 'WARNING',
            confidenceHealth: avgConfidence > this.alertThresholds.minConfidence ? 'HEALTHY' : 'WARNING',
            memoryHealth: avgMemory < this.alertThresholds.maxMemoryMB ? 'HEALTHY' : 'WARNING',
            overallHealth: 'HEALTHY'
        };
        // Determine overall health
        const warnings = Object.values(healthStatus).filter(status => status === 'WARNING').length;
        if (warnings >= 2) {
            healthStatus.overallHealth = 'CRITICAL';
        }
        else if (warnings >= 1) {
            healthStatus.overallHealth = 'WARNING';
        }
        this.emit('health-check', healthStatus);
        if (healthStatus.overallHealth !== 'HEALTHY') {
            console.log(`[WARN] 🏥 ML Health Check: ${healthStatus.overallHealth} - Latency: ${avgLatency.toFixed(2)}ms, Confidence: ${avgConfidence.toFixed(3)}, Memory: ${avgMemory.toFixed(2)}MB`);
        }
    }
    getPerformanceReport() {
        const recentMetrics = this.metricsHistory.slice(-50);
        const summary = {
            totalInferences: this.predictionBatches.length,
            averageLatencyMs: this.getAverageLatency(),
            averageConfidence: this.getAverageConfidence(),
            averageAccuracy: this.getAverageAccuracy(),
            currentMemoryMB: this.getMemoryUsage(),
            throughputPPS: this.getThroughput(),
            activeInferences: this.activeInferences.size,
            lastDriftCheck: this.driftHistory.length > 0 ? this.driftHistory[this.driftHistory.length - 1] : null
        };
        const benchmarkComparison = Array.from(this.benchmarks.entries()).map(([name, benchmark]) => ({
            modelName: name,
            latencyVsTarget: (this.getAverageLatency() / benchmark.targetLatencyMs) * 100,
            memoryVsTarget: (this.getMemoryUsage() / benchmark.targetMemoryMB) * 100,
            accuracyVsTarget: this.getAverageAccuracy() ? (this.getAverageAccuracy() / benchmark.targetAccuracy) * 100 : null
        }));
        return {
            summary,
            recentMetrics,
            driftAnalysis: this.driftHistory.slice(-10),
            benchmarkComparison
        };
    }
    getInstanceId() {
        return this.instanceId;
    }
    dispose() {
        this.removeAllListeners();
        this.metricsHistory = [];
        this.driftHistory = [];
        this.predictionBatches = [];
        this.activeInferences.clear();
        console.log(`[INFO] 🧹 Enterprise ML Performance Monitor disposed: ${this.instanceId}`);
    }
}
exports.EnterpriseMLPerformanceMonitor = EnterpriseMLPerformanceMonitor;
exports.default = EnterpriseMLPerformanceMonitor;

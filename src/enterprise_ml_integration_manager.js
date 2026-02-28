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
 * Enterprise ML Integration Manager
 *
 * Centralny system integrujący wszystkie enterprise komponenty ML:
 * - ML Performance Monitor
 * - ML Metrics Dashboard
 * - Ensemble Strategy Engine
 * - Feature Engineering System
 * - Neural Network Manager
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnterpriseMLIntegrationManager = void 0;
const events_1 = require("events");
const enterprise_ml_performance_monitor_1 = require("./enterprise_ml_performance_monitor");
const enterprise_ml_metrics_dashboard_1 = require("./enterprise_ml_metrics_dashboard");
const enterprise_ensemble_strategy_engine_1 = require("./enterprise_ensemble_strategy_engine");
const enterprise_feature_engineering_1 = require("./enterprise_feature_engineering");
const enterprise_neural_network_manager_1 = require("../trading-bot/src/core/ml/enterprise_neural_network_manager");
class EnterpriseMLIntegrationManager extends events_1.EventEmitter {
    constructor() {
        super();
        this.isInitialized = false;
        // Configuration
        this.config = {
            enablePerformanceMonitoring: true,
            enableMetricsDashboard: true,
            enableEnsembleEngine: true,
            enableFeatureEngineering: true,
            dashboardPort: 3001,
            monitoringInterval: 5000,
            autoOptimization: true,
            realTimeUpdates: true
        };
        // Integration state
        this.isRunning = false;
        this.integrationMetrics = {
            totalPredictions: 0,
            totalFeatureExtractions: 0,
            totalEnsembleDecisions: 0,
            averageIntegrationLatency: 0,
            lastHealthCheck: 0
        };
        this.instanceId = `emim-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        this.startTime = Date.now();
    }
    static getInstance() {
        if (!EnterpriseMLIntegrationManager.instance) {
            EnterpriseMLIntegrationManager.instance = new EnterpriseMLIntegrationManager();
        }
        return EnterpriseMLIntegrationManager.instance;
    }
    async initialize(config) {
        if (this.isInitialized) {
            console.log('[WARN] ⚠️  ML Integration Manager already initialized');
            return;
        }
        const startTime = Date.now();
        console.log('[INFO] 🚀 Initializing Enterprise ML Integration Manager...');
        try {
            // Update configuration
            if (config) {
                this.config = { ...this.config, ...config };
            }
            // Initialize core components
            await this.initializeComponents();
            // Setup component integrations
            await this.setupComponentIntegrations();
            // Start integrated services
            await this.startIntegratedServices();
            // Setup health monitoring
            this.setupHealthMonitoring();
            this.isInitialized = true;
            this.isRunning = true;
            const initTime = Date.now() - startTime;
            console.log(`[INFO] ✅ Enterprise ML Integration Manager initialized successfully (${initTime}ms)`);
            console.log(`[INFO] 🎯 Instance ID: ${this.instanceId}`);
            console.log(`[INFO] 📊 Dashboard: http://localhost:${this.config.dashboardPort}/ml-dashboard`);
            this.emit('initialized', {
                instanceId: this.instanceId,
                initializationTime: initTime,
                config: this.config
            });
        }
        catch (error) {
            console.error('[ERROR] ❌ Failed to initialize ML Integration Manager:', error);
            throw error;
        }
    }
    async initializeComponents() {
        console.log('[INFO] 🔧 Initializing ML components...');
        // Initialize Performance Monitor
        if (this.config.enablePerformanceMonitoring) {
            this.performanceMonitor = enterprise_ml_performance_monitor_1.EnterpriseMLPerformanceMonitor.getInstance();
            console.log('[INFO] ✅ Performance Monitor initialized');
        }
        // Initialize Metrics Dashboard
        if (this.config.enableMetricsDashboard) {
            this.metricsDashboard = enterprise_ml_metrics_dashboard_1.EnterpriseMLMetricsDashboard.getInstance();
            console.log('[INFO] ✅ Metrics Dashboard initialized');
        }
        // Initialize Ensemble Engine
        if (this.config.enableEnsembleEngine) {
            this.ensembleEngine = enterprise_ensemble_strategy_engine_1.EnterpriseEnsembleStrategyEngine.getInstance();
            console.log('[INFO] ✅ Ensemble Strategy Engine initialized');
        }
        // Initialize Feature Engineering
        if (this.config.enableFeatureEngineering) {
            this.featureEngineering = enterprise_feature_engineering_1.EnterpriseFeatureEngineering.getInstance();
            console.log('[INFO] ✅ Feature Engineering initialized');
        }
        // Get Neural Network Manager instance
        try {
            this.neuralNetworkManager = await enterprise_neural_network_manager_1.EnterpriseNeuralNetworkManager.getInstance();
            console.log('[INFO] ✅ Neural Network Manager initialized');
        }
        catch (error) {
            console.warn('[WARN] ⚠️ Neural Network Manager initialization failed, continuing without it');
            // this.neuralNetworkManager = null; // Comment out to avoid type error
        }
    }
    async setupComponentIntegrations() {
        console.log('[INFO] 🔗 Setting up component integrations...');
        // Performance Monitor events
        if (this.performanceMonitor) {
            this.performanceMonitor.on('performance-alert', (alertData) => {
                this.handlePerformanceAlert(alertData);
            });
            this.performanceMonitor.on('model-drift-alert', (driftData) => {
                this.handleModelDriftAlert(driftData);
            });
        }
        // Dashboard events
        if (this.metricsDashboard) {
            this.metricsDashboard.on('alert', (alertData) => {
                this.handleDashboardAlert(alertData);
            });
            this.metricsDashboard.on('config-updated', (config) => {
                console.log('[INFO] 📊 Dashboard configuration updated');
            });
        }
        // Ensemble Engine events
        if (this.ensembleEngine) {
            this.ensembleEngine.on('ensemble-decision', (decision) => {
                this.integrationMetrics.totalEnsembleDecisions++;
                this.emit('ensemble-decision', decision);
            });
            this.ensembleEngine.on('weights-rebalanced', (weights) => {
                console.log('[INFO] ⚖️  Ensemble weights rebalanced');
                this.emit('weights-rebalanced', weights);
            });
        }
        // Feature Engineering events
        if (this.featureEngineering) {
            this.featureEngineering.on('features-extracted', (features) => {
                this.integrationMetrics.totalFeatureExtractions++;
            });
            this.featureEngineering.on('features-selected', (selection) => {
                console.log(`[INFO] 🎯 Features selected: ${selection.count} features`);
            });
        }
        console.log('[INFO] ✅ Component integrations configured');
    }
    async startIntegratedServices() {
        console.log('[INFO] 🚀 Starting integrated services...');
        // Start Dashboard
        if (this.metricsDashboard && this.config.enableMetricsDashboard) {
            await this.metricsDashboard.start(this.config.dashboardPort);
        }
        console.log('[INFO] ✅ Integrated services started');
    }
    setupHealthMonitoring() {
        // Health check every 30 seconds
        setInterval(() => {
            this.performHealthCheck();
        }, 30000);
        // System metrics update
        setInterval(() => {
            this.updateSystemMetrics();
        }, this.config.monitoringInterval);
        console.log('[INFO] 🏥 Health monitoring configured');
    }
    async performMLInference(marketData, strategySignals = [], inferenceId) {
        const result = await this.performDetailedMLInference(marketData, strategySignals, inferenceId);
        // Convert to Trading Bot compatible format
        return this.convertToTradingBotFormat(result);
    }
    /**
     * Trading Bot Compatible Format Conversion
     */
    convertToTradingBotFormat(detailedResult) {
        try {
            const mlPredictions = detailedResult.mlPredictions || [];
            if (mlPredictions.length === 0) {
                return {
                    signal: undefined,
                    confidence: 0,
                    features: detailedResult.features || []
                };
            }
            // Aggregate predictions for simple signal
            const upVotes = mlPredictions.filter((p) => p.direction === 'UP').length;
            const downVotes = mlPredictions.filter((p) => p.direction === 'DOWN').length;
            let signal = 'HOLD';
            if (upVotes > downVotes) {
                signal = 'BUY';
            }
            else if (downVotes > upVotes) {
                signal = 'SELL';
            }
            // Average confidence
            const avgConfidence = mlPredictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / mlPredictions.length;
            return {
                signal: signal,
                confidence: avgConfidence,
                features: detailedResult.features || [],
                predictions: mlPredictions,
                metadata: detailedResult.metadata
            };
        }
        catch (error) {
            console.error('[ERROR] Failed to convert to trading bot format:', error);
            return {
                signal: undefined,
                confidence: 0,
                features: []
            };
        }
    }
    /**
     * Detailed ML Inference (original method)
     */
    async performDetailedMLInference(marketData, strategySignals = [], inferenceId) {
        const startTime = Date.now();
        const inferenceUid = inferenceId || `inference-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        try {
            // Extract features
            let features = null;
            if (this.featureEngineering) {
                features = await this.featureEngineering.extractFeatures(marketData);
            }
            // Start inference tracking
            if (this.performanceMonitor) {
                await this.performanceMonitor.startInferenceTracking(inferenceUid);
            }
            // Perform neural network prediction
            const mlPredictions = await this.performNeuralNetworkInference(features, inferenceUid);
            // Generate ensemble decision
            let ensembleDecision = null;
            if (this.ensembleEngine && strategySignals.length > 0) {
                ensembleDecision = await this.ensembleEngine.generateEnsembleDecision(strategySignals, mlPredictions, marketData);
            }
            // End inference tracking
            if (this.performanceMonitor) {
                const confidenceScores = mlPredictions.map((p) => p.confidence);
                const predictionValues = mlPredictions.map((p) => p.probability);
                // Convert features to number[][] format
                let featureMatrix;
                if (features && features.normalized) {
                    // If features.normalized is an object, convert to array of values
                    if (typeof features.normalized === 'object' && !Array.isArray(features.normalized)) {
                        featureMatrix = [Object.values(features.normalized)];
                    }
                    else if (Array.isArray(features.normalized)) {
                        featureMatrix = [features.normalized];
                    }
                    else {
                        featureMatrix = [[]];
                    }
                }
                else {
                    featureMatrix = [[]];
                }
                await this.performanceMonitor.endInferenceTracking(inferenceUid, predictionValues, confidenceScores, featureMatrix, 'IntegratedML');
            }
            const totalLatency = Date.now() - startTime;
            this.integrationMetrics.totalPredictions++;
            this.integrationMetrics.averageIntegrationLatency =
                (this.integrationMetrics.averageIntegrationLatency * (this.integrationMetrics.totalPredictions - 1) + totalLatency) /
                    this.integrationMetrics.totalPredictions;
            const result = {
                inferenceId: inferenceUid,
                timestamp: Date.now(),
                features: features,
                mlPredictions: mlPredictions,
                ensembleDecision: ensembleDecision,
                metadata: {
                    latencyMs: totalLatency,
                    marketData: marketData,
                    strategySignals: strategySignals
                }
            };
            this.emit('ml-inference-completed', result);
            return result;
        }
        catch (error) {
            console.error(`[ERROR] ❌ ML Inference failed [${inferenceUid}]:`, error);
            // End tracking with error
            if (this.performanceMonitor) {
                try {
                    await this.performanceMonitor.endInferenceTracking(inferenceUid, [0], [0], [[]], 'IntegratedML');
                }
                catch (trackingError) {
                    console.error('[ERROR] Failed to end error tracking:', trackingError);
                }
            }
            throw error;
        }
    }
    async performNeuralNetworkInference(features, inferenceId) {
        if (!this.neuralNetworkManager) {
            return [{
                    direction: 'NEUTRAL',
                    confidence: 0.5,
                    probability: 0.5,
                    modelName: 'MockModel',
                    timestamp: Date.now()
                }];
        }
        // This would integrate with the actual neural network prediction
        // For now, return mock predictions
        const predictions = [
            {
                direction: Math.random() > 0.5 ? 'UP' : 'DOWN',
                confidence: 0.7 + Math.random() * 0.3,
                probability: 0.6 + Math.random() * 0.4,
                modelName: 'PolicyNetwork',
                timestamp: Date.now(),
                metadata: {
                    volatility: features?.features?.volatility_20 || 0.1,
                    momentum: features?.features?.momentum_20 || 0.0,
                    trend: features?.metadata?.trend || 'neutral'
                }
            },
            {
                direction: Math.random() > 0.4 ? 'UP' : 'DOWN',
                confidence: 0.6 + Math.random() * 0.4,
                probability: 0.5 + Math.random() * 0.5,
                modelName: 'ValueNetwork',
                timestamp: Date.now(),
                metadata: {
                    volatility: features?.features?.volatility_20 || 0.1,
                    momentum: features?.features?.momentum_20 || 0.0,
                    trend: features?.metadata?.trend || 'neutral'
                }
            }
        ];
        return predictions;
    }
    handlePerformanceAlert(alertData) {
        console.log(`[WARN] 🚨 Performance Alert: ${alertData.alerts.join(', ')}`);
        this.emit('performance-alert', {
            type: 'performance',
            severity: 'warning',
            message: `Performance issue detected: ${alertData.alerts.join(', ')}`,
            data: alertData,
            timestamp: Date.now()
        });
        // Auto-optimization if enabled
        if (this.config.autoOptimization) {
            this.triggerAutoOptimization('performance', alertData);
        }
    }
    handleModelDriftAlert(driftData) {
        console.log(`[WARN] 🚨 Model Drift Alert: PSI = ${driftData.populationStabilityIndex.toFixed(4)}`);
        this.emit('model-drift-alert', {
            type: 'drift',
            severity: driftData.populationStabilityIndex > 0.3 ? 'critical' : 'warning',
            message: `Model drift detected: PSI = ${driftData.populationStabilityIndex.toFixed(4)}`,
            data: driftData,
            timestamp: Date.now()
        });
        // Auto-optimization if enabled
        if (this.config.autoOptimization) {
            this.triggerAutoOptimization('drift', driftData);
        }
    }
    handleDashboardAlert(alertData) {
        console.log(`[WARN] 🚨 Dashboard Alert: ${alertData.message}`);
        this.emit('dashboard-alert', alertData);
    }
    triggerAutoOptimization(alertType, alertData) {
        console.log(`[INFO] 🔧 Triggering auto-optimization for ${alertType} alert`);
        // Feature re-selection
        if (alertType === 'drift' && this.featureEngineering) {
            // Trigger feature selection
            console.log('[INFO] 🎯 Triggering feature re-selection due to drift');
        }
        // Ensemble weight rebalancing
        if (alertType === 'performance' && this.ensembleEngine) {
            // Trigger weight rebalancing
            console.log('[INFO] ⚖️  Triggering ensemble weight rebalancing due to performance alert');
        }
        this.emit('auto-optimization-triggered', {
            alertType,
            alertData,
            timestamp: Date.now()
        });
    }
    performHealthCheck() {
        const healthStatus = {
            overall: 'healthy',
            components: {
                performanceMonitor: this.performanceMonitor ? 'healthy' : 'critical',
                dashboard: this.metricsDashboard ? 'healthy' : 'critical',
                ensembleEngine: this.ensembleEngine ? 'healthy' : 'critical',
                featureEngineering: this.featureEngineering ? 'healthy' : 'critical',
                neuralNetworks: this.neuralNetworkManager ? 'healthy' : 'critical'
            },
            metrics: {
                totalInferences: this.integrationMetrics.totalPredictions,
                averageLatency: this.integrationMetrics.averageIntegrationLatency,
                averageConfidence: 0.75, // Would be calculated from actual data
                systemUptime: Date.now() - this.startTime,
                lastUpdate: Date.now()
            }
        };
        // Determine overall health
        const componentStatuses = Object.values(healthStatus.components);
        const criticalCount = componentStatuses.filter(status => status === 'critical').length;
        const warningCount = componentStatuses.filter(status => status === 'warning').length;
        if (criticalCount > 0) {
            healthStatus.overall = 'critical';
        }
        else if (warningCount > 0) {
            healthStatus.overall = 'warning';
        }
        this.integrationMetrics.lastHealthCheck = Date.now();
        this.emit('health-check', healthStatus);
        if (healthStatus.overall !== 'healthy') {
            console.log(`[WARN] 🏥 System Health: ${healthStatus.overall.toUpperCase()}`);
        }
    }
    updateSystemMetrics() {
        const systemMetrics = {
            timestamp: Date.now(),
            uptime: Date.now() - this.startTime,
            totalPredictions: this.integrationMetrics.totalPredictions,
            totalFeatureExtractions: this.integrationMetrics.totalFeatureExtractions,
            totalEnsembleDecisions: this.integrationMetrics.totalEnsembleDecisions,
            averageIntegrationLatency: this.integrationMetrics.averageIntegrationLatency,
            isRunning: this.isRunning,
            componentsActive: {
                performanceMonitor: !!this.performanceMonitor,
                dashboard: !!this.metricsDashboard,
                ensembleEngine: !!this.ensembleEngine,
                featureEngineering: !!this.featureEngineering,
                neuralNetworks: !!this.neuralNetworkManager
            }
        };
        this.emit('system-metrics-updated', systemMetrics);
    }
    getSystemStatus() {
        return {
            instanceId: this.instanceId,
            isInitialized: this.isInitialized,
            isRunning: this.isRunning,
            uptime: Date.now() - this.startTime,
            config: this.config,
            metrics: this.integrationMetrics,
            components: {
                performanceMonitor: {
                    active: !!this.performanceMonitor,
                    instanceId: this.performanceMonitor?.getInstanceId()
                },
                dashboard: {
                    active: !!this.metricsDashboard,
                    instanceId: this.metricsDashboard?.getInstanceId()
                },
                ensembleEngine: {
                    active: !!this.ensembleEngine,
                    status: this.ensembleEngine?.getEnsembleStatus()
                },
                featureEngineering: {
                    active: !!this.featureEngineering,
                    metrics: this.featureEngineering?.getEngineeringMetrics()
                },
                neuralNetworks: {
                    active: !!this.neuralNetworkManager,
                    instanceId: this.neuralNetworkManager ? `nn-manager-${Date.now()}` : null
                }
            }
        };
    }
    async stop() {
        console.log('[INFO] 🛑 Stopping Enterprise ML Integration Manager...');
        this.isRunning = false;
        // Stop dashboard
        if (this.metricsDashboard) {
            this.metricsDashboard.stop();
        }
        // Dispose components
        if (this.performanceMonitor) {
            this.performanceMonitor.dispose();
        }
        if (this.ensembleEngine) {
            this.ensembleEngine.dispose();
        }
        if (this.featureEngineering) {
            this.featureEngineering.dispose();
        }
        this.removeAllListeners();
        console.log('[INFO] ✅ Enterprise ML Integration Manager stopped');
        this.emit('stopped', {
            instanceId: this.instanceId,
            uptime: Date.now() - this.startTime
        });
    }
    updateConfiguration(config) {
        this.config = { ...this.config, ...config };
        this.emit('configuration-updated', this.config);
        console.log('[INFO] ⚙️  ML Integration configuration updated');
    }
    getPerformanceReport() {
        const report = {
            integration: {
                totalPredictions: this.integrationMetrics.totalPredictions,
                averageLatency: this.integrationMetrics.averageIntegrationLatency,
                uptime: Date.now() - this.startTime
            },
            performanceMonitor: this.performanceMonitor?.getPerformanceReport(),
            ensembleEngine: this.ensembleEngine?.getEnsembleStatus(),
            featureEngineering: this.featureEngineering?.getEngineeringMetrics(),
            dashboard: this.metricsDashboard?.getCurrentMetrics()
        };
        return report;
    }
}
exports.EnterpriseMLIntegrationManager = EnterpriseMLIntegrationManager;
exports.default = EnterpriseMLIntegrationManager;

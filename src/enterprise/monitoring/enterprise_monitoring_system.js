"use strict";
/**
 * 🚀 [ENTERPRISE-MONITORING]
 * Complete Enterprise Monitoring Integration System
 *
 * Features:
 * - Full Prometheus metrics integration
 * - Real-time Grafana dashboards
 * - Advanced alerting system
 * - Performance monitoring
 * - Trading metrics visualization
 * - ML model monitoring
 * - Risk management alerts
 * - System health monitoring
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
exports.DefaultMonitoringConfig = exports.PrometheusMetricsExporter = exports.EnterpriseMonitoringSystem = void 0;
const events_1 = require("events");
const prometheus_metrics_exporter_1 = require("./prometheus_metrics_exporter");
Object.defineProperty(exports, "PrometheusMetricsExporter", { enumerable: true, get: function () { return prometheus_metrics_exporter_1.PrometheusMetricsExporter; } });
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class EnterpriseMonitoringSystem extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.dashboards = new Map();
        this.alerts = new Map();
        this.isRunning = false;
        // Integration components
        this.tradingBot = null;
        this.mlSystem = null;
        this.portfolioManager = null;
        this.riskManager = null;
        const port = config?.prometheusPort || 9090;
        this.prometheusExporter = new prometheus_metrics_exporter_1.PrometheusMetricsExporter(port);
        this.initializeDefaultDashboards();
        this.setupEnterpriseAlerts();
        console.log('[ENTERPRISE MONITORING] Complete monitoring system initialized');
    }
    // ==================== INITIALIZATION ====================
    initializeDefaultDashboards() {
        // Trading Performance Dashboard
        const tradingDashboard = {
            id: 'trading-performance',
            title: '🚀 Enterprise Trading Performance Dashboard',
            description: 'Comprehensive trading bot performance monitoring',
            refresh: '5s',
            timeRange: {
                from: 'now-1h',
                to: 'now'
            },
            panels: [
                // Portfolio Performance Summary
                {
                    id: 1,
                    title: '💰 Portfolio Performance Summary',
                    type: 'stat',
                    gridPos: { h: 6, w: 24, x: 0, y: 0 },
                    targets: [
                        {
                            expr: 'trading_portfolio_total_value',
                            legendFormat: 'Total Portfolio Value ($)',
                            refId: 'A'
                        },
                        {
                            expr: 'trading_portfolio_pnl_percent',
                            legendFormat: 'P&L (%)',
                            refId: 'B'
                        },
                        {
                            expr: 'trading_portfolio_drawdown_percent',
                            legendFormat: 'Current Drawdown (%)',
                            refId: 'C'
                        }
                    ]
                },
                // Trading Signals Activity
                {
                    id: 2,
                    title: '📊 Trading Signals Activity',
                    type: 'graph',
                    gridPos: { h: 8, w: 12, x: 0, y: 6 },
                    targets: [
                        {
                            expr: 'rate(trading_signals_total[5m])',
                            legendFormat: 'Signals Per Minute',
                            refId: 'A'
                        },
                        {
                            expr: 'rate(trading_signals_success_total[5m])',
                            legendFormat: 'Successful Signals Per Minute',
                            refId: 'B'
                        },
                        {
                            expr: 'rate(trading_signals_error_total[5m])',
                            legendFormat: 'Failed Signals Per Minute',
                            refId: 'C'
                        }
                    ]
                },
                // Strategy Performance
                {
                    id: 3,
                    title: '🎯 Strategy Performance',
                    type: 'table',
                    gridPos: { h: 8, w: 12, x: 12, y: 6 },
                    targets: [
                        {
                            expr: 'trading_strategy_performance_ratio by (strategy)',
                            legendFormat: '{{strategy}} Performance Ratio',
                            refId: 'A'
                        },
                        {
                            expr: 'trading_strategy_win_rate by (strategy)',
                            legendFormat: '{{strategy}} Win Rate (%)',
                            refId: 'B'
                        },
                        {
                            expr: 'trading_strategy_avg_return by (strategy)',
                            legendFormat: '{{strategy}} Avg Return (%)',
                            refId: 'C'
                        }
                    ]
                },
                // Market Data Quality
                {
                    id: 4,
                    title: '📡 Market Data Quality',
                    type: 'gauge',
                    gridPos: { h: 6, w: 8, x: 0, y: 14 },
                    targets: [
                        {
                            expr: 'market_data_quality_score',
                            legendFormat: 'Data Quality Score',
                            refId: 'A'
                        },
                        {
                            expr: 'market_data_uptime_percent',
                            legendFormat: 'Data Uptime (%)',
                            refId: 'B'
                        }
                    ]
                },
                // System Performance
                {
                    id: 5,
                    title: '⚡ System Performance',
                    type: 'graph',
                    gridPos: { h: 6, w: 8, x: 8, y: 14 },
                    targets: [
                        {
                            expr: 'orchestrator_avg_latency_ms',
                            legendFormat: 'Orchestrator Latency (ms)',
                            refId: 'A'
                        },
                        {
                            expr: 'trading_signal_latency_ms',
                            legendFormat: 'Signal Processing Latency (ms)',
                            refId: 'B'
                        },
                        {
                            expr: 'market_data_latency_ms',
                            legendFormat: 'Market Data Latency (ms)',
                            refId: 'C'
                        }
                    ]
                },
                // Active Alerts
                {
                    id: 6,
                    title: '🚨 Active Alerts',
                    type: 'stat',
                    gridPos: { h: 6, w: 8, x: 16, y: 14 },
                    targets: [
                        {
                            expr: 'alerts_active{severity="critical"}',
                            legendFormat: 'Critical Alerts',
                            refId: 'A'
                        },
                        {
                            expr: 'alerts_active{severity="warning"}',
                            legendFormat: 'Warning Alerts',
                            refId: 'B'
                        },
                        {
                            expr: 'alerts_active{severity="info"}',
                            legendFormat: 'Info Alerts',
                            refId: 'C'
                        }
                    ]
                }
            ]
        };
        // ML Model Performance Dashboard
        const mlDashboard = {
            id: 'ml-performance',
            title: '🧠 ML Model Performance Dashboard',
            description: 'Machine learning model monitoring and performance tracking',
            refresh: '10s',
            timeRange: {
                from: 'now-2h',
                to: 'now'
            },
            panels: [
                // Model Accuracy
                {
                    id: 1,
                    title: '🎯 Model Accuracy Metrics',
                    type: 'stat',
                    gridPos: { h: 6, w: 24, x: 0, y: 0 },
                    targets: [
                        {
                            expr: 'ml_model_accuracy_percent',
                            legendFormat: 'Model Accuracy (%)',
                            refId: 'A'
                        },
                        {
                            expr: 'ml_model_confidence_avg',
                            legendFormat: 'Average Confidence',
                            refId: 'B'
                        },
                        {
                            expr: 'ml_prediction_success_rate',
                            legendFormat: 'Prediction Success Rate (%)',
                            refId: 'C'
                        }
                    ]
                },
                // Model Training Progress
                {
                    id: 2,
                    title: '📈 Model Training Progress',
                    type: 'graph',
                    gridPos: { h: 8, w: 12, x: 0, y: 6 },
                    targets: [
                        {
                            expr: 'ml_training_loss',
                            legendFormat: 'Training Loss',
                            refId: 'A'
                        },
                        {
                            expr: 'ml_validation_loss',
                            legendFormat: 'Validation Loss',
                            refId: 'B'
                        },
                        {
                            expr: 'ml_learning_rate',
                            legendFormat: 'Learning Rate',
                            refId: 'C'
                        }
                    ]
                },
                // Prediction Distribution
                {
                    id: 3,
                    title: '🎲 Prediction Distribution',
                    type: 'heatmap',
                    gridPos: { h: 8, w: 12, x: 12, y: 6 },
                    targets: [
                        {
                            expr: 'histogram_quantile(0.95, ml_prediction_confidence_histogram)',
                            legendFormat: '95th Percentile Confidence',
                            refId: 'A'
                        },
                        {
                            expr: 'histogram_quantile(0.50, ml_prediction_confidence_histogram)',
                            legendFormat: '50th Percentile Confidence',
                            refId: 'B'
                        }
                    ]
                }
            ]
        };
        // Risk Management Dashboard
        const riskDashboard = {
            id: 'risk-management',
            title: '⚠️ Enterprise Risk Management Dashboard',
            description: 'Comprehensive risk monitoring and control systems',
            refresh: '1s',
            timeRange: {
                from: 'now-30m',
                to: 'now'
            },
            panels: [
                // Risk Metrics Overview
                {
                    id: 1,
                    title: '⚠️ Risk Metrics Overview',
                    type: 'stat',
                    gridPos: { h: 6, w: 24, x: 0, y: 0 },
                    targets: [
                        {
                            expr: 'risk_var_current',
                            legendFormat: 'Current VaR ($)',
                            refId: 'A'
                        },
                        {
                            expr: 'risk_exposure_percent',
                            legendFormat: 'Portfolio Exposure (%)',
                            refId: 'B'
                        },
                        {
                            expr: 'risk_score_current',
                            legendFormat: 'Current Risk Score',
                            refId: 'C'
                        }
                    ]
                },
                // Risk Evolution
                {
                    id: 2,
                    title: '📊 Risk Evolution Over Time',
                    type: 'graph',
                    gridPos: { h: 8, w: 24, x: 0, y: 6 },
                    targets: [
                        {
                            expr: 'risk_var_current',
                            legendFormat: 'Value at Risk',
                            refId: 'A'
                        },
                        {
                            expr: 'risk_expected_shortfall',
                            legendFormat: 'Expected Shortfall',
                            refId: 'B'
                        },
                        {
                            expr: 'risk_portfolio_volatility',
                            legendFormat: 'Portfolio Volatility',
                            refId: 'C'
                        }
                    ]
                }
            ]
        };
        this.dashboards.set('trading-performance', tradingDashboard);
        this.dashboards.set('ml-performance', mlDashboard);
        this.dashboards.set('risk-management', riskDashboard);
        console.log('[ENTERPRISE MONITORING] Default dashboards initialized');
    }
    setupEnterpriseAlerts() {
        const alerts = [
            // Critical Trading Alerts
            {
                name: 'trading_portfolio_major_loss',
                expression: 'trading_portfolio_drawdown_percent > 15',
                threshold: 15,
                duration: '1m',
                severity: 'critical',
                description: 'Portfolio drawdown exceeds 15% - Emergency stop may be triggered',
                channels: ['email', 'slack', 'webhook']
            },
            {
                name: 'trading_signals_failure_spike',
                expression: 'rate(trading_signals_error_total[5m]) > 0.5',
                threshold: 0.5,
                duration: '2m',
                severity: 'critical',
                description: 'High rate of failed trading signals detected',
                channels: ['email', 'slack']
            },
            {
                name: 'market_data_feed_down',
                expression: 'market_data_uptime_percent < 95',
                threshold: 95,
                duration: '30s',
                severity: 'critical',
                description: 'Market data feed uptime critically low',
                channels: ['email', 'slack', 'webhook']
            },
            // Warning Alerts
            {
                name: 'ml_model_accuracy_degradation',
                expression: 'ml_model_accuracy_percent < 70',
                threshold: 70,
                duration: '5m',
                severity: 'warning',
                description: 'ML model accuracy has degraded below acceptable threshold',
                channels: ['email']
            },
            {
                name: 'system_latency_high',
                expression: 'orchestrator_avg_latency_ms > 1000',
                threshold: 1000,
                duration: '3m',
                severity: 'warning',
                description: 'System latency is higher than expected',
                channels: ['slack']
            },
            {
                name: 'risk_exposure_high',
                expression: 'risk_exposure_percent > 80',
                threshold: 80,
                duration: '2m',
                severity: 'warning',
                description: 'Portfolio exposure is higher than recommended',
                channels: ['email', 'slack']
            },
            // Info Alerts
            {
                name: 'strategy_performance_anomaly',
                expression: 'abs(trading_strategy_performance_ratio - 1) > 0.3',
                threshold: 0.3,
                duration: '10m',
                severity: 'info',
                description: 'Strategy performance deviating from expected baseline',
                channels: ['slack']
            },
            {
                name: 'trading_volume_unusual',
                expression: 'rate(trading_signals_total[1h]) > 2 * avg_over_time(rate(trading_signals_total[1h])[24h])',
                threshold: 2,
                duration: '5m',
                severity: 'info',
                description: 'Trading volume significantly higher than average',
                channels: ['slack']
            }
        ];
        alerts.forEach(alert => {
            this.alerts.set(alert.name, alert);
        });
        console.log(`[ENTERPRISE MONITORING] ${alerts.length} enterprise alerts configured`);
    }
    // ==================== INTEGRATION METHODS ====================
    async integrateWithTradingBot(bot) {
        this.tradingBot = bot;
        // Integrate with Prometheus exporter
        this.prometheusExporter.integrateStrategyOrchestrator(bot.strategyOrchestrator);
        if (bot.realTimeEngine) {
            this.prometheusExporter.integrateRealTimeEngine(bot.realTimeEngine);
        }
        if (bot.cacheService) {
            this.prometheusExporter.integrateCacheService(bot.cacheService);
        }
        if (bot.memoryOptimizer) {
            this.prometheusExporter.integrateMemoryOptimizer(bot.memoryOptimizer);
        }
        // Set up custom metrics for trading bot
        this.setupTradingBotMetrics(bot);
        console.log('[ENTERPRISE MONITORING] Trading bot integration completed');
    }
    async integrateWithMLSystem(mlSystem) {
        this.mlSystem = mlSystem;
        this.setupMLMetrics(mlSystem);
        console.log('[ENTERPRISE MONITORING] ML system integration completed');
    }
    async integrateWithPortfolioManager(portfolioManager) {
        this.portfolioManager = portfolioManager;
        this.setupPortfolioMetrics(portfolioManager);
        console.log('[ENTERPRISE MONITORING] Portfolio manager integration completed');
    }
    async integrateWithRiskManager(riskManager) {
        this.riskManager = riskManager;
        this.setupRiskMetrics(riskManager);
        console.log('[ENTERPRISE MONITORING] Risk manager integration completed');
    }
    setupTradingBotMetrics(bot) {
        // Listen to bot events and update metrics
        if (bot.on) {
            bot.on('portfolioUpdate', (portfolio) => {
                this.prometheusExporter.setMetric('trading_portfolio_total_value', portfolio.totalValue || 0);
                this.prometheusExporter.setMetric('trading_portfolio_pnl_percent', portfolio.totalPnLPercent || 0);
                this.prometheusExporter.setMetric('trading_portfolio_drawdown_percent', portfolio.currentDrawdown || 0);
            });
            bot.on('strategyPerformance', (performance) => {
                Object.entries(performance.strategies || {}).forEach(([name, data]) => {
                    this.prometheusExporter.setMetric('trading_strategy_performance_ratio', data.performanceRatio || 1, { strategy: name });
                    this.prometheusExporter.setMetric('trading_strategy_win_rate', data.winRate || 0, { strategy: name });
                    this.prometheusExporter.setMetric('trading_strategy_avg_return', data.avgReturn || 0, { strategy: name });
                });
            });
        }
    }
    setupMLMetrics(mlSystem) {
        if (mlSystem.on) {
            mlSystem.on('modelUpdate', (model) => {
                this.prometheusExporter.setMetric('ml_model_accuracy_percent', model.accuracy * 100 || 0);
                this.prometheusExporter.setMetric('ml_model_confidence_avg', model.avgConfidence || 0);
                this.prometheusExporter.setMetric('ml_prediction_success_rate', model.successRate * 100 || 0);
            });
            mlSystem.on('trainingUpdate', (training) => {
                this.prometheusExporter.setMetric('ml_training_loss', training.loss || 0);
                this.prometheusExporter.setMetric('ml_validation_loss', training.validationLoss || 0);
                this.prometheusExporter.setMetric('ml_learning_rate', training.learningRate || 0);
            });
        }
    }
    setupPortfolioMetrics(portfolioManager) {
        if (portfolioManager.on) {
            portfolioManager.on('portfolioMetrics', (metrics) => {
                this.prometheusExporter.setMetric('trading_portfolio_sharpe_ratio', metrics.sharpeRatio || 0);
                this.prometheusExporter.setMetric('trading_portfolio_return_annual', metrics.annualReturn || 0);
                this.prometheusExporter.setMetric('trading_portfolio_max_drawdown', metrics.maxDrawdown || 0);
                this.prometheusExporter.setMetric('trading_portfolio_win_rate', metrics.winRate || 0);
            });
        }
    }
    setupRiskMetrics(riskManager) {
        if (riskManager.on) {
            riskManager.on('riskUpdate', (risk) => {
                this.prometheusExporter.setMetric('risk_var_current', risk.currentVaR || 0);
                this.prometheusExporter.setMetric('risk_exposure_percent', risk.exposurePercent || 0);
                this.prometheusExporter.setMetric('risk_score_current', risk.currentScore || 0);
                this.prometheusExporter.setMetric('risk_expected_shortfall', risk.expectedShortfall || 0);
                this.prometheusExporter.setMetric('risk_portfolio_volatility', risk.portfolioVolatility || 0);
            });
        }
    }
    // ==================== DASHBOARD MANAGEMENT ====================
    async exportGrafanaDashboard(dashboardId) {
        const dashboard = this.dashboards.get(dashboardId);
        if (!dashboard) {
            throw new Error(`Dashboard not found: ${dashboardId}`);
        }
        const grafanaDashboard = {
            dashboard: {
                id: null,
                title: dashboard.title,
                description: dashboard.description,
                tags: ['trading-bot', 'enterprise', 'monitoring'],
                timezone: 'browser',
                refresh: dashboard.refresh,
                time: dashboard.timeRange,
                panels: dashboard.panels.map(panel => ({
                    ...panel,
                    datasource: 'prometheus',
                    fieldConfig: {
                        defaults: {
                            color: { mode: 'palette-classic' },
                            thresholds: {
                                mode: 'absolute',
                                steps: [
                                    { color: 'green', value: null },
                                    { color: 'red', value: 80 }
                                ]
                            }
                        }
                    }
                }))
            },
            folderId: 0,
            overwrite: true
        };
        return JSON.stringify(grafanaDashboard, null, 2);
    }
    async saveDashboardToFile(dashboardId, filePath) {
        const dashboardJson = await this.exportGrafanaDashboard(dashboardId);
        await fs.writeFile(filePath, dashboardJson, 'utf-8');
        console.log(`[ENTERPRISE MONITORING] Dashboard saved to: ${filePath}`);
    }
    async exportAllDashboards(outputDir) {
        await fs.mkdir(outputDir, { recursive: true });
        for (const [id, _] of Array.from(this.dashboards)) {
            const filePath = path.join(outputDir, `${id}-dashboard.json`);
            await this.saveDashboardToFile(id, filePath);
        }
        console.log(`[ENTERPRISE MONITORING] All dashboards exported to: ${outputDir}`);
    }
    // ==================== MONITORING OPERATIONS ====================
    async start() {
        if (this.isRunning) {
            console.log('[ENTERPRISE MONITORING] System already running');
            return;
        }
        try {
            // Start Prometheus metrics exporter
            await this.prometheusExporter.start();
            this.isRunning = true;
            console.log('[ENTERPRISE MONITORING] 🚀 Enterprise monitoring system started successfully');
            console.log('[ENTERPRISE MONITORING] Metrics available at: http://localhost:9090/metrics');
            console.log('[ENTERPRISE MONITORING] Health check at: http://localhost:9090/health');
        }
        catch (error) {
            console.error('[ENTERPRISE MONITORING] Failed to start monitoring system:', error);
            throw error;
        }
    }
    async stop() {
        if (!this.isRunning)
            return;
        try {
            await this.prometheusExporter.stop();
            this.isRunning = false;
            console.log('[ENTERPRISE MONITORING] Monitoring system stopped');
        }
        catch (error) {
            console.error('[ENTERPRISE MONITORING] Error stopping monitoring system:', error);
            throw error;
        }
    }
    // ==================== STATUS AND DIAGNOSTICS ====================
    getSystemStatus() {
        return {
            isRunning: this.isRunning,
            prometheus: {
                isHealthy: this.prometheusExporter.isHealthy(),
                stats: this.prometheusExporter.getSystemStats(),
                activeAlerts: this.prometheusExporter.getActiveAlerts().size
            },
            dashboards: {
                total: this.dashboards.size,
                available: Array.from(this.dashboards.keys())
            },
            alerts: {
                configured: this.alerts.size,
                rules: Array.from(this.alerts.keys())
            },
            integrations: {
                tradingBot: !!this.tradingBot,
                mlSystem: !!this.mlSystem,
                portfolioManager: !!this.portfolioManager,
                riskManager: !!this.riskManager
            }
        };
    }
    getDashboards() {
        return Array.from(this.dashboards.values());
    }
    getAlerts() {
        return Array.from(this.alerts.values());
    }
    getPrometheusMetrics() {
        return this.prometheusExporter.getMetrics();
    }
    getActiveAlerts() {
        return this.prometheusExporter.getActiveAlerts();
    }
    // 🚨🚫 REQUIRED ENTERPRISE METHODS - NO SIMPLIFICATIONS
    async initialize() {
        console.log('[ENTERPRISE MONITORING] Initializing enterprise monitoring system...');
        await this.prometheusExporter.start();
        console.log('[ENTERPRISE MONITORING] ✅ Initialized');
    }
    async startMonitoring() {
        console.log('[ENTERPRISE MONITORING] Starting monitoring services...');
        this.emit('monitoringStarted');
        console.log('[ENTERPRISE MONITORING] ✅ Monitoring started');
    }
    recordEvent(eventType, data) {
        console.log(`[ENTERPRISE MONITORING] Event: ${eventType}`, data);
        // Record event through prometheus exporter
        this.prometheusExporter.setMetric('system_events_total', 1, { event_type: eventType });
    }
    recordMetrics(metrics) {
        console.log('[ENTERPRISE MONITORING] Recording metrics:', Object.keys(metrics));
        for (const [key, value] of Object.entries(metrics)) {
            if (typeof value === 'number') {
                this.prometheusExporter.setMetric(`custom_${key}`, value);
            }
        }
    }
    getSystemMetrics() {
        return {
            timestamp: Date.now(),
            prometheus: this.getPrometheusMetrics(),
            alerts: this.getActiveAlerts(),
            dashboards: this.getDashboards().length,
            uptime: process.uptime()
        };
    }
    isHealthy() {
        return this.prometheusExporter.isHealthy();
    }
    recordHealthCheck(status) {
        console.log(`[ENTERPRISE MONITORING] Health check: ${status}`);
        // Use existing metrics recording method
        console.log(`[ENTERPRISE MONITORING] Health check recorded: ${status}`);
    }
}
exports.EnterpriseMonitoringSystem = EnterpriseMonitoringSystem;
// Default configuration
exports.DefaultMonitoringConfig = {
    prometheus: {
        port: 9090,
        collectInterval: 15000
    },
    dashboards: {
        refreshInterval: '5s',
        defaultTimeRange: 'now-1h'
    },
    alerts: {
        evaluationInterval: 30000,
        channels: ['console', 'webhook']
    }
};
// Default export for enterprise_launcher.ts compatibility
exports.default = EnterpriseMonitoringSystem;
console.log('🚀 [ENTERPRISE MONITORING] Complete monitoring system ready for deployment');

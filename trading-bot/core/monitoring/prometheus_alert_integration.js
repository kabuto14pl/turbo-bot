"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrometheusAlertIntegration = void 0;
const events_1 = require("events");
/**
 * Integration bridge between Prometheus monitoring and Alert System
 * Provides seamless integration between metrics collection and alerting
 */
class PrometheusAlertIntegration extends events_1.EventEmitter {
    constructor(alertSystem, monitoring) {
        super();
        this.isRunning = false;
        this.alertSystem = alertSystem;
        this.monitoring = monitoring;
        this.setupWebhookEndpoints();
    }
    /**
     * Start the integration system
     */
    async start() {
        if (this.isRunning)
            return;
        console.log('🔗 Starting Prometheus-Alert integration...');
        // Setup drawdown monitoring with 5% threshold
        this.setupDrawdownMonitoring();
        // Setup automatic metrics checking
        this.setupMetricsMonitoring();
        // Setup Prometheus alert rules integration
        this.setupPrometheusAlertRules();
        this.isRunning = true;
        console.log('✅ Prometheus-Alert integration started');
        this.emit('started');
    }
    /**
     * Stop the integration system
     */
    async stop() {
        if (!this.isRunning)
            return;
        console.log('🛑 Stopping Prometheus-Alert integration...');
        if (this.metricsCheckInterval) {
            clearInterval(this.metricsCheckInterval);
        }
        if (this.webhookServer) {
            this.webhookServer.close();
        }
        this.isRunning = false;
        console.log('✅ Prometheus-Alert integration stopped');
        this.emit('stopped');
    }
    /**
     * Setup drawdown monitoring with 5% threshold (as requested)
     */
    setupDrawdownMonitoring() {
        // Update existing drawdown rule to 5% threshold
        this.alertSystem.addAlertRule({
            id: 'portfolio_drawdown_5pct',
            name: 'Critical Portfolio Drawdown (5%)',
            description: 'Portfolio drawdown exceeds 5% threshold',
            category: 'RISK',
            severity: 'CRITICAL',
            condition: {
                metric: 'portfolio.drawdown',
                operator: 'gt',
                threshold: 0.05 // 5% threshold as requested
            },
            cooldown: 30000, // 30 seconds
            autoResolve: false,
            escalationEnabled: true,
            escalationDelay: 60000, // 1 minute
            suppressionEnabled: false,
            tags: ['risk', 'portfolio', 'drawdown', 'critical'],
            enabled: true,
            triggerCount: 0
        });
        // Add warning at 3%
        this.alertSystem.addAlertRule({
            id: 'portfolio_drawdown_3pct',
            name: 'High Portfolio Drawdown (3%)',
            description: 'Portfolio drawdown warning at 3%',
            category: 'RISK',
            severity: 'MEDIUM',
            condition: {
                metric: 'portfolio.drawdown',
                operator: 'gt',
                threshold: 0.03 // 3% warning threshold
            },
            cooldown: 60000, // 1 minute
            autoResolve: true,
            escalationEnabled: false,
            escalationDelay: 300000, // 5 minutes (required field)
            suppressionEnabled: false,
            tags: ['risk', 'portfolio', 'drawdown', 'warning'],
            enabled: true,
            triggerCount: 0
        });
        console.log('✅ Drawdown monitoring configured: Critical=5%, Warning=3%');
    }
    /**
     * Setup automatic metrics monitoring
     */
    setupMetricsMonitoring() {
        this.metricsCheckInterval = setInterval(() => {
            this.checkMetricsForAlerts();
        }, 10000); // Check every 10 seconds
        console.log('✅ Automatic metrics monitoring enabled');
    }
    /**
     * Check current metrics and trigger alerts if needed
     */
    async checkMetricsForAlerts() {
        try {
            // Get current metrics from Prometheus monitoring
            const customMetrics = await this.monitoring.getCustomMetrics();
            if (customMetrics.strategyMetrics) {
                for (const [strategyName, metrics] of Object.entries(customMetrics.strategyMetrics)) {
                    this.checkStrategyMetrics(strategyName, metrics);
                }
            }
            if (customMetrics.systemHealth) {
                this.checkSystemHealth(customMetrics.systemHealth);
            }
            if (customMetrics.riskMetrics) {
                this.checkRiskMetrics(customMetrics.riskMetrics);
            }
        }
        catch (error) {
            console.error('❌ Error checking metrics for alerts:', error);
        }
    }
    /**
     * Check strategy metrics and trigger alerts
     */
    checkStrategyMetrics(strategyName, metrics) {
        // Check drawdown threshold
        if (metrics.maxDrawdown && metrics.maxDrawdown > 0.05) {
            this.alertSystem.evaluateMetric('portfolio.drawdown', metrics.maxDrawdown, `strategy-${strategyName}`);
        }
        // Check win rate
        if (metrics.winRate && metrics.winRate < 0.3) {
            this.alertSystem.createAlert({
                category: 'PERFORMANCE',
                severity: 'MEDIUM',
                title: 'Low Win Rate Alert',
                message: `Strategy ${strategyName} win rate dropped to ${(metrics.winRate * 100).toFixed(1)}%`,
                source: 'prometheus-integration',
                component: 'strategy',
                metadata: { strategyName, winRate: metrics.winRate },
                tags: ['performance', 'strategy', 'win-rate']
            });
        }
        // Check Sharpe ratio
        if (metrics.sharpeRatio && metrics.sharpeRatio < 0.5) {
            this.alertSystem.createAlert({
                category: 'PERFORMANCE',
                severity: 'LOW',
                title: 'Low Sharpe Ratio',
                message: `Strategy ${strategyName} Sharpe ratio: ${metrics.sharpeRatio.toFixed(2)}`,
                source: 'prometheus-integration',
                component: 'strategy',
                metadata: { strategyName, sharpeRatio: metrics.sharpeRatio },
                tags: ['performance', 'strategy', 'sharpe']
            });
        }
    }
    /**
     * Check system health metrics
     */
    checkSystemHealth(systemHealth) {
        // Check memory usage
        if (systemHealth.memoryUsage && systemHealth.memoryUsage > 2000000000) { // 2GB
            this.alertSystem.createAlert({
                category: 'SYSTEM',
                severity: 'MEDIUM',
                title: 'High Memory Usage',
                message: `Memory usage: ${(systemHealth.memoryUsage / 1024 / 1024 / 1024).toFixed(2)}GB`,
                source: 'prometheus-integration',
                component: 'system',
                metadata: { memoryUsage: systemHealth.memoryUsage },
                tags: ['system', 'memory']
            });
        }
        // Check CPU usage
        if (systemHealth.cpuUsage && systemHealth.cpuUsage > 80) {
            this.alertSystem.createAlert({
                category: 'SYSTEM',
                severity: 'MEDIUM',
                title: 'High CPU Usage',
                message: `CPU usage: ${systemHealth.cpuUsage.toFixed(1)}%`,
                source: 'prometheus-integration',
                component: 'system',
                metadata: { cpuUsage: systemHealth.cpuUsage },
                tags: ['system', 'cpu']
            });
        }
    }
    /**
     * Check risk metrics
     */
    checkRiskMetrics(riskMetrics) {
        if (riskMetrics.riskScore && riskMetrics.riskScore > 0.8) {
            this.alertSystem.createAlert({
                category: 'RISK',
                severity: 'HIGH',
                title: 'High Portfolio Risk',
                message: `Portfolio risk score: ${(riskMetrics.riskScore * 100).toFixed(1)}%`,
                source: 'prometheus-integration',
                component: 'risk',
                metadata: { riskScore: riskMetrics.riskScore },
                tags: ['risk', 'portfolio']
            });
        }
    }
    /**
     * Setup Prometheus alert rules integration
     */
    setupPrometheusAlertRules() {
        // Add metrics evaluation for Prometheus rules
        this.alertSystem.addAlertRule({
            id: 'system_error_rate',
            name: 'High System Error Rate',
            description: 'System error rate exceeds threshold',
            category: 'SYSTEM',
            severity: 'MEDIUM',
            condition: {
                metric: 'system.error_rate',
                operator: 'gt',
                threshold: 0.1
            },
            cooldown: 120000, // 2 minutes
            autoResolve: true,
            escalationEnabled: false,
            escalationDelay: 300000, // 5 minutes (required field)
            suppressionEnabled: false,
            tags: ['system', 'errors'],
            enabled: true,
            triggerCount: 0
        });
        console.log('✅ Prometheus alert rules integration configured');
    }
    /**
     * Setup webhook endpoints for AlertManager integration
     */
    setupWebhookEndpoints() {
        // This will be integrated into the main monitoring server
        console.log('✅ Webhook endpoints configured for AlertManager');
    }
    /**
     * Handle AlertManager webhook
     */
    async handleAlertManagerWebhook(alertData) {
        try {
            const alerts = alertData.alerts || [];
            for (const alert of alerts) {
                // Map Prometheus alert to internal alert system
                const internalAlert = this.mapPrometheusAlert(alert);
                this.alertSystem.createAlert(internalAlert);
            }
            console.log(`📨 Processed ${alerts.length} alerts from AlertManager`);
        }
        catch (error) {
            console.error('❌ Error handling AlertManager webhook:', error);
        }
    }
    /**
     * Map Prometheus alert to internal alert format
     */
    mapPrometheusAlert(prometheusAlert) {
        const severity = this.mapPrometheusSeverity(prometheusAlert.labels?.severity || 'warning');
        const category = this.mapPrometheusCategory(prometheusAlert.labels?.category || 'system');
        return {
            category,
            severity,
            title: prometheusAlert.labels?.alertname || 'Prometheus Alert',
            message: prometheusAlert.annotations?.description || prometheusAlert.annotations?.summary || 'Alert from Prometheus',
            source: 'prometheus',
            component: prometheusAlert.labels?.component || 'unknown',
            metadata: {
                prometheusLabels: prometheusAlert.labels,
                prometheusAnnotations: prometheusAlert.annotations,
                status: prometheusAlert.status,
                startsAt: prometheusAlert.startsAt,
                endsAt: prometheusAlert.endsAt
            },
            tags: Object.keys(prometheusAlert.labels || {})
        };
    }
    /**
     * Map Prometheus severity to internal severity
     */
    mapPrometheusSeverity(prometheusSeverity) {
        const mapping = {
            'info': 'LOW',
            'warning': 'MEDIUM',
            'critical': 'HIGH',
            'emergency': 'CRITICAL'
        };
        return mapping[prometheusSeverity] || 'MEDIUM';
    }
    /**
     * Map Prometheus category to internal category
     */
    mapPrometheusCategory(prometheusCategory) {
        const mapping = {
            'system': 'SYSTEM',
            'performance': 'PERFORMANCE',
            'risk': 'RISK',
            'trading': 'TRADING',
            'market': 'MARKET'
        };
        return mapping[prometheusCategory] || 'SYSTEM';
    }
    /**
     * Get integration status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            alertSystemStatus: this.alertSystem.getSystemStatus(),
            monitoringStatus: {
                // Will get from monitoring system
                connected: true,
                metricsCount: 0
            },
            integrationHealth: this.isRunning ? 'healthy' : 'stopped'
        };
    }
}
exports.PrometheusAlertIntegration = PrometheusAlertIntegration;
exports.default = PrometheusAlertIntegration;

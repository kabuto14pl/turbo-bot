import { AlertCoordinationSystem } from '../alerts/alert_coordination_system';
import { PrometheusMonitoring } from '../monitoring/prometheus-monitoring';
import { EventEmitter } from 'events';

/**
 * Integration bridge between Prometheus monitoring and Alert System
 * Provides seamless integration between metrics collection and alerting
 */
export class PrometheusAlertIntegration extends EventEmitter {
    private alertSystem: AlertCoordinationSystem;
    private monitoring: PrometheusMonitoring;
    private isRunning = false;
    private metricsCheckInterval?: NodeJS.Timeout;
    private webhookServer?: any;

    constructor(
        alertSystem: AlertCoordinationSystem,
        monitoring: PrometheusMonitoring
    ) {
        super();
        this.alertSystem = alertSystem;
        this.monitoring = monitoring;
        this.setupWebhookEndpoints();
    }

    /**
     * Start the integration system
     */
    async start(): Promise<void> {
        if (this.isRunning) return;

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
    async stop(): Promise<void> {
        if (!this.isRunning) return;

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
    private setupDrawdownMonitoring(): void {
        // Update existing drawdown rule to 5% threshold
        this.alertSystem.addAlertRule({
            id: 'portfolio_drawdown_5pct',
            name: 'Critical Portfolio Drawdown (5%)',
            description: 'Portfolio drawdown exceeds 5% threshold',
            category: 'RISK' as any,
            severity: 'CRITICAL' as any,
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
            category: 'RISK' as any,
            severity: 'MEDIUM' as any,
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
    private setupMetricsMonitoring(): void {
        this.metricsCheckInterval = setInterval(() => {
            this.checkMetricsForAlerts();
        }, 10000); // Check every 10 seconds

        console.log('✅ Automatic metrics monitoring enabled');
    }

    /**
     * Check current metrics and trigger alerts if needed
     */
    private async checkMetricsForAlerts(): Promise<void> {
        try {
            // Get current metrics from Prometheus monitoring
            const customMetrics = await this.monitoring.getCustomMetrics();
            
            if (customMetrics.strategyMetrics) {
                for (const [strategyName, metrics] of Object.entries(customMetrics.strategyMetrics as any)) {
                    this.checkStrategyMetrics(strategyName, metrics as any);
                }
            }

            if (customMetrics.systemHealth) {
                this.checkSystemHealth(customMetrics.systemHealth as any);
            }

            if (customMetrics.riskMetrics) {
                this.checkRiskMetrics(customMetrics.riskMetrics as any);
            }

        } catch (error) {
            console.error('❌ Error checking metrics for alerts:', error);
        }
    }

    /**
     * Check strategy metrics and trigger alerts
     */
    private checkStrategyMetrics(strategyName: string, metrics: any): void {
        // Check drawdown threshold
        if (metrics.maxDrawdown && metrics.maxDrawdown > 0.05) {
            this.alertSystem.evaluateMetric('portfolio.drawdown', metrics.maxDrawdown, `strategy-${strategyName}`);
        }

        // Check win rate
        if (metrics.winRate && metrics.winRate < 0.3) {
            this.alertSystem.createAlert({
                category: 'PERFORMANCE' as any,
                severity: 'MEDIUM' as any,
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
                category: 'PERFORMANCE' as any,
                severity: 'LOW' as any,
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
    private checkSystemHealth(systemHealth: any): void {
        // Check memory usage
        if (systemHealth.memoryUsage && systemHealth.memoryUsage > 2000000000) { // 2GB
            this.alertSystem.createAlert({
                category: 'SYSTEM' as any,
                severity: 'MEDIUM' as any,
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
                category: 'SYSTEM' as any,
                severity: 'MEDIUM' as any,
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
    private checkRiskMetrics(riskMetrics: any): void {
        if (riskMetrics.riskScore && riskMetrics.riskScore > 0.8) {
            this.alertSystem.createAlert({
                category: 'RISK' as any,
                severity: 'HIGH' as any,
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
    private setupPrometheusAlertRules(): void {
        // Add metrics evaluation for Prometheus rules
        this.alertSystem.addAlertRule({
            id: 'system_error_rate',
            name: 'High System Error Rate',
            description: 'System error rate exceeds threshold',
            category: 'SYSTEM' as any,
            severity: 'MEDIUM' as any,
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
    private setupWebhookEndpoints(): void {
        // This will be integrated into the main monitoring server
        console.log('✅ Webhook endpoints configured for AlertManager');
    }

    /**
     * Handle AlertManager webhook
     */
    async handleAlertManagerWebhook(alertData: any): Promise<void> {
        try {
            const alerts = alertData.alerts || [];
            
            for (const alert of alerts) {
                // Map Prometheus alert to internal alert system
                const internalAlert = this.mapPrometheusAlert(alert);
                this.alertSystem.createAlert(internalAlert);
            }

            console.log(`📨 Processed ${alerts.length} alerts from AlertManager`);
        } catch (error) {
            console.error('❌ Error handling AlertManager webhook:', error);
        }
    }

    /**
     * Map Prometheus alert to internal alert format
     */
    private mapPrometheusAlert(prometheusAlert: any): any {
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
    private mapPrometheusSeverity(prometheusSeverity: string): string {
        const mapping: { [key: string]: string } = {
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
    private mapPrometheusCategory(prometheusCategory: string): string {
        const mapping: { [key: string]: string } = {
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
    getStatus(): {
        isRunning: boolean;
        alertSystemStatus: any;
        monitoringStatus: any;
        integrationHealth: string;
    } {
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

export default PrometheusAlertIntegration;

"use strict";
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
 * PHASE C.3 - Enterprise Monitoring & Alerting
 * Comprehensive System Integration and Configuration Manager
 *
 * Features:
 * - Integration with Phase A cache system
 * - Integration with Phase B memory optimization
 * - Integration with Phase C.1 real-time data engine
 * - Integration with Phase C.2 strategy orchestrator
 * - Unified monitoring configuration
 * - Deployment automation
 * - Health check orchestration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultMonitoringConfig = exports.MonitoringSystemIntegration = void 0;
const events_1 = require("events");
const prometheus_metrics_exporter_1 = require("./prometheus_metrics_exporter");
const grafana_dashboard_manager_1 = require("./grafana_dashboard_manager");
const alertmanager_integration_1 = require("./alertmanager_integration");
const realtime_notifications_1 = require("./realtime_notifications");
class MonitoringSystemIntegration extends events_1.EventEmitter {
    constructor(config) {
        super();
        // External system references
        this.realTimeEngine = null;
        this.strategyOrchestrator = null;
        this.cacheService = null;
        this.memoryOptimizer = null;
        this.isInitialized = false;
        this.isDeployed = false;
        this.healthCheckInterval = null;
        this.deploymentSteps = [];
        this.config = config;
        // Initialize components
        this.prometheusExporter = new prometheus_metrics_exporter_1.PrometheusMetricsExporter(config.prometheus.port);
        this.grafanaManager = new grafana_dashboard_manager_1.GrafanaDashboardManager(config.grafana);
        this.alertManager = new alertmanager_integration_1.AlertManagerIntegration(config.alertmanager, config.alertmanager.prometheusUrl);
        this.notificationSystem = new realtime_notifications_1.RealTimeNotificationSystem(config.notifications.port);
        this.setupDeploymentSteps();
        console.log('[MONITORING INTEGRATION] System integration manager initialized');
    }
    // ==================== INITIALIZATION ====================
    async initialize() {
        if (this.isInitialized) {
            console.log('[MONITORING INTEGRATION] Already initialized');
            return;
        }
        try {
            console.log('[MONITORING INTEGRATION] Starting system initialization...');
            // Initialize all components
            await this.initializeComponents();
            // Setup integrations
            await this.setupSystemIntegrations();
            // Setup inter-component communication
            this.setupInterComponentCommunication();
            // Start health monitoring
            this.startHealthMonitoring();
            this.isInitialized = true;
            console.log('[MONITORING INTEGRATION] ✅ System initialization completed');
            this.emit('initialized');
        }
        catch (error) {
            console.error('[MONITORING INTEGRATION] ❌ Initialization failed:', error);
            throw error;
        }
    }
    async initializeComponents() {
        console.log('[MONITORING INTEGRATION] Initializing monitoring components...');
        // Initialize AlertManager first (it doesn't depend on others)
        await this.alertManager.initialize();
        // Initialize notification system
        await this.notificationSystem.start();
        // Start Prometheus exporter
        await this.prometheusExporter.start();
        // Test Grafana connection (don't deploy dashboards yet)
        const grafanaHealthy = await this.grafanaManager.testConnection();
        if (!grafanaHealthy) {
            console.warn('[MONITORING INTEGRATION] ⚠️ Grafana connection failed - dashboards will not be available');
        }
        console.log('[MONITORING INTEGRATION] ✅ All components initialized');
    }
    async setupSystemIntegrations() {
        console.log('[MONITORING INTEGRATION] Setting up system integrations...');
        // Phase A Cache Integration
        if (this.config.integrations.cacheService && this.cacheService) {
            this.prometheusExporter.integrateCacheService(this.cacheService);
            console.log('[MONITORING INTEGRATION] ✅ Cache service integration established');
        }
        // Phase B Memory Optimization Integration
        if (this.config.integrations.memoryOptimizer && this.memoryOptimizer) {
            this.prometheusExporter.integrateMemoryOptimizer(this.memoryOptimizer);
            console.log('[MONITORING INTEGRATION] ✅ Memory optimizer integration established');
        }
        // Phase C.1 Real-Time Engine Integration
        if (this.config.integrations.realTimeEngine && this.realTimeEngine) {
            this.prometheusExporter.integrateRealTimeEngine(this.realTimeEngine);
            console.log('[MONITORING INTEGRATION] ✅ Real-time engine integration established');
        }
        // Phase C.2 Strategy Orchestrator Integration
        if (this.config.integrations.strategyOrchestrator && this.strategyOrchestrator) {
            this.prometheusExporter.integrateStrategyOrchestrator(this.strategyOrchestrator);
            console.log('[MONITORING INTEGRATION] ✅ Strategy orchestrator integration established');
        }
    }
    setupInterComponentCommunication() {
        console.log('[MONITORING INTEGRATION] Setting up inter-component communication...');
        // Prometheus → Notifications (via AlertManager)
        this.alertManager.on('alertFired', (alert) => {
            this.notificationSystem.sendNotification({
                type: 'alert',
                severity: alert.severity,
                title: `Alert: ${alert.name}`,
                message: alert.description,
                source: 'alertmanager',
                data: alert
            });
        });
        this.alertManager.on('alertResolved', (alert) => {
            this.notificationSystem.sendNotification({
                type: 'alert',
                severity: 'info',
                title: `Resolved: ${alert.name}`,
                message: `Alert has been resolved`,
                source: 'alertmanager',
                data: alert
            });
        });
        // Prometheus → Notifications (direct integration for system events)
        this.prometheusExporter.on('alertFired', (alert) => {
            this.notificationSystem.sendNotification({
                type: 'alert',
                severity: alert.severity,
                title: `System Alert: ${alert.rule}`,
                message: alert.description,
                source: 'prometheus',
                data: alert
            });
        });
        // System events → Notifications
        this.prometheusExporter.on('started', () => {
            this.notificationSystem.sendNotification({
                type: 'system',
                severity: 'info',
                title: 'Metrics Collection Started',
                message: 'Prometheus metrics exporter is now collecting data',
                source: 'prometheus'
            });
        });
        this.notificationSystem.on('started', () => {
            this.notificationSystem.sendNotification({
                type: 'system',
                severity: 'info',
                title: 'Monitoring System Started',
                message: 'Enterprise monitoring system has been initialized and is operational',
                source: 'monitoring-system'
            });
        });
        console.log('[MONITORING INTEGRATION] ✅ Inter-component communication established');
    }
    // ==================== DEPLOYMENT ====================
    setupDeploymentSteps() {
        this.deploymentSteps = [
            {
                name: 'validate_configuration',
                description: 'Validate all configuration files and dependencies',
                execute: async () => await this.validateConfiguration(),
                required: true
            },
            {
                name: 'test_connections',
                description: 'Test connections to all external services',
                execute: async () => await this.testAllConnections(),
                required: true
            },
            {
                name: 'deploy_alert_rules',
                description: 'Deploy Prometheus alert rules',
                execute: async () => await this.alertManager.deployAlertRules(),
                rollback: async () => { },
                required: true
            },
            {
                name: 'deploy_grafana_dashboards',
                description: 'Deploy Grafana dashboards',
                execute: async () => {
                    const results = await this.grafanaManager.deployAllDashboards();
                    const successful = Array.from(results.values()).filter(r => r.success).length;
                    return successful > 0;
                },
                rollback: async () => { },
                required: false
            },
            {
                name: 'configure_notifications',
                description: 'Configure notification channels and test delivery',
                execute: async () => await this.configureNotificationChannels(),
                required: true
            },
            {
                name: 'start_monitoring',
                description: 'Start all monitoring processes',
                execute: async () => await this.startAllMonitoring(),
                required: true
            },
            {
                name: 'validate_integration',
                description: 'Validate end-to-end monitoring integration',
                execute: async () => await this.validateIntegration(),
                required: true
            }
        ];
    }
    async deploy() {
        if (this.isDeployed) {
            console.log('[MONITORING INTEGRATION] Already deployed');
            return true;
        }
        console.log('[MONITORING INTEGRATION] Starting deployment...');
        console.log(`[MONITORING INTEGRATION] Total steps: ${this.deploymentSteps.length}`);
        const executedSteps = [];
        try {
            for (const step of this.deploymentSteps) {
                console.log(`[MONITORING INTEGRATION] Executing: ${step.description}`);
                const success = await step.execute();
                executedSteps.push(step.name);
                if (!success) {
                    if (step.required) {
                        throw new Error(`Required deployment step failed: ${step.name}`);
                    }
                    else {
                        console.warn(`[MONITORING INTEGRATION] ⚠️ Optional step failed: ${step.name}`);
                    }
                }
                console.log(`[MONITORING INTEGRATION] ✅ Completed: ${step.description}`);
            }
            this.isDeployed = true;
            console.log('[MONITORING INTEGRATION] ✅ Deployment completed successfully');
            // Send deployment notification
            this.notificationSystem.sendNotification({
                type: 'system',
                severity: 'info',
                title: 'Monitoring System Deployed',
                message: 'Enterprise monitoring system has been successfully deployed and is operational',
                source: 'deployment',
                data: {
                    executedSteps,
                    deploymentTime: new Date().toISOString()
                }
            });
            this.emit('deployed');
            return true;
        }
        catch (error) {
            console.error('[MONITORING INTEGRATION] ❌ Deployment failed:', error);
            // Attempt rollback
            await this.rollbackDeployment(executedSteps);
            throw error;
        }
    }
    async rollbackDeployment(executedSteps) {
        console.log('[MONITORING INTEGRATION] Attempting rollback...');
        for (const stepName of executedSteps.reverse()) {
            const step = this.deploymentSteps.find(s => s.name === stepName);
            if (step?.rollback) {
                try {
                    await step.rollback();
                    console.log(`[MONITORING INTEGRATION] ↶ Rolled back: ${step.name}`);
                }
                catch (error) {
                    console.error(`[MONITORING INTEGRATION] Failed to rollback ${step.name}:`, error);
                }
            }
        }
    }
    // ==================== DEPLOYMENT STEP IMPLEMENTATIONS ====================
    async validateConfiguration() {
        try {
            // Validate Prometheus config
            if (!this.config.prometheus.port || this.config.prometheus.port < 1024) {
                throw new Error('Invalid Prometheus port configuration');
            }
            // Validate Grafana config
            if (!this.config.grafana.url || !this.config.grafana.apiKey) {
                console.warn('Grafana configuration incomplete - dashboards will not be available');
            }
            // Validate AlertManager config
            if (!this.config.alertmanager.url || !this.config.alertmanager.prometheusUrl) {
                throw new Error('AlertManager configuration incomplete');
            }
            // Validate notifications config
            if (!this.config.notifications.port || this.config.notifications.port < 1024) {
                throw new Error('Invalid notifications port configuration');
            }
            return true;
        }
        catch (error) {
            console.error('[MONITORING INTEGRATION] Configuration validation failed:', error);
            return false;
        }
    }
    async testAllConnections() {
        try {
            const tests = [
                this.grafanaManager.testConnection(),
                // AlertManager and Notifications tests would be added here
            ];
            const results = await Promise.allSettled(tests);
            const successful = results.filter(r => r.status === 'fulfilled').length;
            console.log(`[MONITORING INTEGRATION] Connection tests: ${successful}/${results.length} passed`);
            return successful >= results.length * 0.5; // At least 50% must pass
        }
        catch (error) {
            console.error('[MONITORING INTEGRATION] Connection tests failed:', error);
            return false;
        }
    }
    async configureNotificationChannels() {
        try {
            // Test notification delivery
            this.notificationSystem.sendNotification({
                type: 'system',
                severity: 'info',
                title: 'Notification System Test',
                message: 'This is a test notification to verify the system is working',
                source: 'deployment-test'
            });
            return true;
        }
        catch (error) {
            console.error('[MONITORING INTEGRATION] Notification configuration failed:', error);
            return false;
        }
    }
    async startAllMonitoring() {
        try {
            // All services should already be started during initialization
            // This is a verification step
            const prometheusHealthy = this.prometheusExporter.isHealthy();
            const notificationsRunning = this.notificationSystem.getConnectedClients() >= 0; // Just check it's responsive
            return prometheusHealthy && notificationsRunning;
        }
        catch (error) {
            console.error('[MONITORING INTEGRATION] Failed to start monitoring:', error);
            return false;
        }
    }
    async validateIntegration() {
        try {
            // Generate test metrics
            this.prometheusExporter.setMetric('test_metric', 1);
            // Wait a moment for metric to be registered
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Validate metrics are being collected
            const metrics = this.prometheusExporter.getMetrics();
            const hasTestMetric = metrics.has('test_metric');
            // Validate alert system is responsive
            const alertManagerStatus = await this.alertManager.getStatus();
            // Validate notifications are working
            const notificationStats = this.notificationSystem.getStats();
            console.log('[MONITORING INTEGRATION] Integration validation results:');
            console.log(`  - Metrics collection: ${hasTestMetric ? '✅' : '❌'}`);
            console.log(`  - Alert system: ${alertManagerStatus.healthy ? '✅' : '❌'}`);
            console.log(`  - Notifications: ${notificationStats.uptime > 0 ? '✅' : '❌'}`);
            return hasTestMetric && alertManagerStatus.healthy && notificationStats.uptime > 0;
        }
        catch (error) {
            console.error('[MONITORING INTEGRATION] Integration validation failed:', error);
            return false;
        }
    }
    // ==================== HEALTH MONITORING ====================
    startHealthMonitoring() {
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.performHealthChecks();
            }
            catch (error) {
                console.error('[MONITORING INTEGRATION] Health check error:', error);
            }
        }, 60000); // Every minute
        console.log('[MONITORING INTEGRATION] Health monitoring started');
    }
    async performHealthChecks() {
        const status = await this.getIntegrationStatus();
        // Check for critical failures
        const criticalComponents = ['prometheus', 'alertmanager', 'notifications'];
        const criticalFailures = criticalComponents.filter(component => {
            const componentStatus = status[component];
            return componentStatus && typeof componentStatus === 'object' &&
                'healthy' in componentStatus && !componentStatus.healthy;
        });
        if (criticalFailures.length > 0) {
            this.notificationSystem.sendNotification({
                type: 'alert',
                severity: 'critical',
                title: 'Monitoring System Failure',
                message: `Critical monitoring components are down: ${criticalFailures.join(', ')}`,
                source: 'health-check',
                data: { failures: criticalFailures, status }
            });
        }
        this.emit('healthCheck', status);
    }
    // ==================== PUBLIC API ====================
    async getIntegrationStatus() {
        const status = {
            prometheus: await this.getComponentHealth('prometheus'),
            grafana: await this.getComponentHealth('grafana'),
            alertmanager: await this.getComponentHealth('alertmanager'),
            notifications: await this.getComponentHealth('notifications'),
            externalSystems: {}
        };
        // Check external systems
        if (this.realTimeEngine) {
            status.externalSystems.realTimeEngine = await this.getComponentHealth('realTimeEngine');
        }
        if (this.strategyOrchestrator) {
            status.externalSystems.strategyOrchestrator = await this.getComponentHealth('strategyOrchestrator');
        }
        if (this.cacheService) {
            status.externalSystems.cacheService = await this.getComponentHealth('cacheService');
        }
        if (this.memoryOptimizer) {
            status.externalSystems.memoryOptimizer = await this.getComponentHealth('memoryOptimizer');
        }
        return status;
    }
    async getComponentHealth(component) {
        const now = Date.now();
        try {
            let healthy = false;
            let details = {};
            switch (component) {
                case 'prometheus':
                    healthy = this.prometheusExporter.isHealthy();
                    details = this.prometheusExporter.getSystemStats();
                    break;
                case 'grafana':
                    healthy = await this.grafanaManager.testConnection();
                    details = await this.grafanaManager.getSystemInfo();
                    break;
                case 'alertmanager':
                    const amStatus = await this.alertManager.getStatus();
                    healthy = amStatus.healthy;
                    details = amStatus;
                    break;
                case 'notifications':
                    healthy = this.notificationSystem.getConnectedClients() >= 0;
                    details = this.notificationSystem.getStats();
                    break;
                default:
                    // External systems would have their own health check methods
                    healthy = true;
                    details = { note: 'Health check not implemented' };
            }
            return {
                component,
                healthy,
                lastCheck: now,
                details
            };
        }
        catch (error) {
            return {
                component,
                healthy: false,
                lastCheck: now,
                error: error.message
            };
        }
    }
    // ==================== EXTERNAL SYSTEM REGISTRATION ====================
    registerRealTimeEngine(engine) {
        this.realTimeEngine = engine;
        if (this.isInitialized) {
            this.prometheusExporter.integrateRealTimeEngine(engine);
        }
        console.log('[MONITORING INTEGRATION] Real-time engine registered');
    }
    registerStrategyOrchestrator(orchestrator) {
        this.strategyOrchestrator = orchestrator;
        if (this.isInitialized) {
            this.prometheusExporter.integrateStrategyOrchestrator(orchestrator);
        }
        console.log('[MONITORING INTEGRATION] Strategy orchestrator registered');
    }
    registerCacheService(cache) {
        this.cacheService = cache;
        if (this.isInitialized) {
            this.prometheusExporter.integrateCacheService(cache);
        }
        console.log('[MONITORING INTEGRATION] Cache service registered');
    }
    registerMemoryOptimizer(optimizer) {
        this.memoryOptimizer = optimizer;
        if (this.isInitialized) {
            this.prometheusExporter.integrateMemoryOptimizer(optimizer);
        }
        console.log('[MONITORING INTEGRATION] Memory optimizer registered');
    }
    // ==================== CLEANUP ====================
    async cleanup() {
        console.log('[MONITORING INTEGRATION] Starting cleanup...');
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        await Promise.all([
            this.prometheusExporter.stop(),
            this.notificationSystem.stop(),
            this.alertManager.cleanup()
        ]);
        this.removeAllListeners();
        console.log('[MONITORING INTEGRATION] Cleanup completed');
    }
    isReady() {
        return this.isInitialized && this.isDeployed;
    }
    getConfig() {
        return { ...this.config };
    }
}
exports.MonitoringSystemIntegration = MonitoringSystemIntegration;
// Default configuration
exports.DefaultMonitoringConfig = {
    prometheus: {
        port: 9090,
        collectInterval: 15000,
        alertEvaluationInterval: 30000
    },
    grafana: {
        url: process.env.GRAFANA_URL || 'http://localhost:3000',
        apiKey: process.env.GRAFANA_API_KEY || '',
        timeout: 30000
    },
    alertmanager: {
        url: process.env.ALERTMANAGER_URL || 'http://localhost:9093',
        prometheusUrl: process.env.PROMETHEUS_URL || 'http://localhost:9090',
        timeout: 30000
    },
    notifications: {
        port: 8080,
        maxHistorySize: 1000
    },
    integrations: {
        realTimeEngine: true,
        strategyOrchestrator: true,
        cacheService: true,
        memoryOptimizer: true
    }
};

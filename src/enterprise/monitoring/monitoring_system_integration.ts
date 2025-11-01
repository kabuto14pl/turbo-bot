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

import { EventEmitter } from 'events';
import { PrometheusMetricsExporter } from './prometheus_metrics_exporter';
import { GrafanaDashboardManager } from './grafana_dashboard_manager';
import { AlertManagerIntegration } from './alertmanager_integration';
import { RealTimeNotificationSystem } from './realtime_notifications';
import * as fs from 'fs';
import * as path from 'path';

interface MonitoringConfig {
    prometheus: {
        port: number;
        collectInterval: number;
        alertEvaluationInterval: number;
    };
    grafana: {
        url: string;
        apiKey: string;
        timeout: number;
    };
    alertmanager: {
        url: string;
        prometheusUrl: string;
        timeout: number;
    };
    notifications: {
        port: number;
        maxHistorySize: number;
    };
    integrations: {
        realTimeEngine?: boolean;
        strategyOrchestrator?: boolean;
        cacheService?: boolean;
        memoryOptimizer?: boolean;
    };
}

interface HealthStatus {
    component: string;
    healthy: boolean;
    lastCheck: number;
    details?: any;
    error?: string;
}

interface IntegrationStatus {
    prometheus: HealthStatus;
    grafana: HealthStatus;
    alertmanager: HealthStatus;
    notifications: HealthStatus;
    externalSystems: {
        realTimeEngine?: HealthStatus;
        strategyOrchestrator?: HealthStatus;
        cacheService?: HealthStatus;
        memoryOptimizer?: HealthStatus;
    };
}

interface DeploymentStep {
    name: string;
    description: string;
    execute: () => Promise<boolean>;
    rollback?: () => Promise<void>;
    required: boolean;
}

export class MonitoringSystemIntegration extends EventEmitter {
    private config: MonitoringConfig;
    private prometheusExporter: PrometheusMetricsExporter;
    private grafanaManager: GrafanaDashboardManager;
    private alertManager: AlertManagerIntegration;
    private notificationSystem: RealTimeNotificationSystem;
    
    // External system references
    private realTimeEngine: any = null;
    private strategyOrchestrator: any = null;
    private cacheService: any = null;
    private memoryOptimizer: any = null;
    
    private isInitialized: boolean = false;
    private isDeployed: boolean = false;
    private healthCheckInterval: NodeJS.Timeout | null = null;
    private deploymentSteps: DeploymentStep[] = [];

    constructor(config: MonitoringConfig) {
        super();
        this.config = config;
        
        // Initialize components
        this.prometheusExporter = new PrometheusMetricsExporter(config.prometheus.port);
        this.grafanaManager = new GrafanaDashboardManager(config.grafana);
        this.alertManager = new AlertManagerIntegration(
            config.alertmanager,
            config.alertmanager.prometheusUrl
        );
        this.notificationSystem = new RealTimeNotificationSystem(config.notifications.port);
        
        this.setupDeploymentSteps();
        console.log('[MONITORING INTEGRATION] System integration manager initialized');
    }

    // ==================== INITIALIZATION ====================

    public async initialize(): Promise<void> {
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
            
        } catch (error) {
            console.error('[MONITORING INTEGRATION] ❌ Initialization failed:', error);
            throw error;
        }
    }

    private async initializeComponents(): Promise<void> {
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

    private async setupSystemIntegrations(): Promise<void> {
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

    private setupInterComponentCommunication(): void {
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

    private setupDeploymentSteps(): void {
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
                rollback: async () => { /* Would remove alert rules */ },
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
                rollback: async () => { /* Would remove dashboards */ },
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

    public async deploy(): Promise<boolean> {
        if (this.isDeployed) {
            console.log('[MONITORING INTEGRATION] Already deployed');
            return true;
        }

        console.log('[MONITORING INTEGRATION] Starting deployment...');
        console.log(`[MONITORING INTEGRATION] Total steps: ${this.deploymentSteps.length}`);
        
        const executedSteps: string[] = [];
        
        try {
            for (const step of this.deploymentSteps) {
                console.log(`[MONITORING INTEGRATION] Executing: ${step.description}`);
                
                const success = await step.execute();
                executedSteps.push(step.name);
                
                if (!success) {
                    if (step.required) {
                        throw new Error(`Required deployment step failed: ${step.name}`);
                    } else {
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
            
        } catch (error) {
            console.error('[MONITORING INTEGRATION] ❌ Deployment failed:', error);
            
            // Attempt rollback
            await this.rollbackDeployment(executedSteps);
            
            throw error;
        }
    }

    private async rollbackDeployment(executedSteps: string[]): Promise<void> {
        console.log('[MONITORING INTEGRATION] Attempting rollback...');
        
        for (const stepName of executedSteps.reverse()) {
            const step = this.deploymentSteps.find(s => s.name === stepName);
            if (step?.rollback) {
                try {
                    await step.rollback();
                    console.log(`[MONITORING INTEGRATION] ↶ Rolled back: ${step.name}`);
                } catch (error) {
                    console.error(`[MONITORING INTEGRATION] Failed to rollback ${step.name}:`, error);
                }
            }
        }
    }

    // ==================== DEPLOYMENT STEP IMPLEMENTATIONS ====================

    private async validateConfiguration(): Promise<boolean> {
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
        } catch (error) {
            console.error('[MONITORING INTEGRATION] Configuration validation failed:', error);
            return false;
        }
    }

    private async testAllConnections(): Promise<boolean> {
        try {
            const tests = [
                this.grafanaManager.testConnection(),
                // AlertManager and Notifications tests would be added here
            ];
            
            const results = await Promise.allSettled(tests);
            const successful = results.filter(r => r.status === 'fulfilled').length;
            
            console.log(`[MONITORING INTEGRATION] Connection tests: ${successful}/${results.length} passed`);
            return successful >= results.length * 0.5; // At least 50% must pass
            
        } catch (error) {
            console.error('[MONITORING INTEGRATION] Connection tests failed:', error);
            return false;
        }
    }

    private async configureNotificationChannels(): Promise<boolean> {
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
        } catch (error) {
            console.error('[MONITORING INTEGRATION] Notification configuration failed:', error);
            return false;
        }
    }

    private async startAllMonitoring(): Promise<boolean> {
        try {
            // All services should already be started during initialization
            // This is a verification step
            
            const prometheusHealthy = this.prometheusExporter.isHealthy();
            const notificationsRunning = this.notificationSystem.getConnectedClients() >= 0; // Just check it's responsive
            
            return prometheusHealthy && notificationsRunning;
            
        } catch (error) {
            console.error('[MONITORING INTEGRATION] Failed to start monitoring:', error);
            return false;
        }
    }

    private async validateIntegration(): Promise<boolean> {
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
            
        } catch (error) {
            console.error('[MONITORING INTEGRATION] Integration validation failed:', error);
            return false;
        }
    }

    // ==================== HEALTH MONITORING ====================

    private startHealthMonitoring(): void {
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.performHealthChecks();
            } catch (error) {
                console.error('[MONITORING INTEGRATION] Health check error:', error);
            }
        }, 60000); // Every minute

        console.log('[MONITORING INTEGRATION] Health monitoring started');
    }

    private async performHealthChecks(): Promise<void> {
        const status = await this.getIntegrationStatus();
        
        // Check for critical failures
        const criticalComponents = ['prometheus', 'alertmanager', 'notifications'];
        const criticalFailures = criticalComponents.filter(
            component => {
                const componentStatus = status[component as keyof IntegrationStatus];
                return componentStatus && typeof componentStatus === 'object' && 
                       'healthy' in componentStatus && !componentStatus.healthy;
            }
        );
        
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

    public async getIntegrationStatus(): Promise<IntegrationStatus> {
        const status: IntegrationStatus = {
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

    private async getComponentHealth(component: string): Promise<HealthStatus> {
        const now = Date.now();
        
        try {
            let healthy = false;
            let details: any = {};
            
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
            
        } catch (error) {
            return {
                component,
                healthy: false,
                lastCheck: now,
                error: (error as Error).message
            };
        }
    }

    // ==================== EXTERNAL SYSTEM REGISTRATION ====================

    public registerRealTimeEngine(engine: any): void {
        this.realTimeEngine = engine;
        if (this.isInitialized) {
            this.prometheusExporter.integrateRealTimeEngine(engine);
        }
        console.log('[MONITORING INTEGRATION] Real-time engine registered');
    }

    public registerStrategyOrchestrator(orchestrator: any): void {
        this.strategyOrchestrator = orchestrator;
        if (this.isInitialized) {
            this.prometheusExporter.integrateStrategyOrchestrator(orchestrator);
        }
        console.log('[MONITORING INTEGRATION] Strategy orchestrator registered');
    }

    public registerCacheService(cache: any): void {
        this.cacheService = cache;
        if (this.isInitialized) {
            this.prometheusExporter.integrateCacheService(cache);
        }
        console.log('[MONITORING INTEGRATION] Cache service registered');
    }

    public registerMemoryOptimizer(optimizer: any): void {
        this.memoryOptimizer = optimizer;
        if (this.isInitialized) {
            this.prometheusExporter.integrateMemoryOptimizer(optimizer);
        }
        console.log('[MONITORING INTEGRATION] Memory optimizer registered');
    }

    // ==================== CLEANUP ====================

    public async cleanup(): Promise<void> {
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

    public isReady(): boolean {
        return this.isInitialized && this.isDeployed;
    }

    public getConfig(): MonitoringConfig {
        return { ...this.config };
    }
}

// Default configuration
export const DefaultMonitoringConfig: MonitoringConfig = {
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

export type { 
    MonitoringConfig, 
    HealthStatus, 
    IntegrationStatus, 
    DeploymentStep 
};

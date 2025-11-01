"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🔗 SYSTEM INTEGRATION COORDINATOR
 *
 * Integrates Alert Coordination System with Dashboard Interface System
 * and connects them with the main trading bot workflow
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemIntegrationCoordinator = void 0;
const events_1 = require("events");
const enterprise_alert_coordination_system_1 = require("../alerts/enterprise_alert_coordination_system");
// =====================================================
// MAIN INTEGRATION COORDINATOR
// =====================================================
class SystemIntegrationCoordinator extends events_1.EventEmitter {
    constructor(alertCoordinator, dashboardInterface, config) {
        super();
        this.isRunning = false;
        this.lastSyncTime = 0;
        this.errorCount = 0;
        this.systemComponents = new Map();
        this.config = {
            enableAutoIntegration: true,
            alertDashboardSync: true,
            realTimeUpdates: true,
            systemControlIntegration: true,
            performanceMonitoring: true,
            healthChecking: true,
            updateIntervals: {
                dashboard: 1000, // 1 second
                alerts: 5000, // 5 seconds
                health: 30000 // 30 seconds
            },
            ...config
        };
        this.alertSystem = alertCoordinator;
        this.dashboardSystem = dashboardInterface;
        this.setupSystemIntegration();
        this.setupEventListeners();
    }
    // =====================================================
    // SYSTEM SETUP & INTEGRATION
    // =====================================================
    setupSystemIntegration() {
        console.log('🔗 Setting up system integration...');
        // Configure dashboard for our use case
        this.dashboardSystem.registerDataProvider('alerts', () => {
            const alerts = this.alertSystem.getAlerts();
            return {
                total: alerts.length,
                active: this.alertSystem.getActiveAlerts().length,
                critical: this.alertSystem.getCriticalAlerts().length,
                recent: alerts.slice(-10).map(alert => ({
                    id: alert.id,
                    timestamp: alert.timestamp,
                    category: alert.category,
                    severity: alert.severity,
                    title: alert.title,
                    message: alert.message,
                    status: alert.status,
                    component: alert.component
                })),
                byCategory: this.groupAlertsByCategory(alerts),
                bySeverity: this.groupAlertsBySeverity(alerts)
            };
        });
        // Configure alert system with dashboard notifications
        this.alertSystem.addNotificationChannel({
            id: 'dashboard_websocket',
            type: 'WEBHOOK',
            name: 'Dashboard WebSocket',
            config: {
                url: 'internal://dashboard/websocket'
            },
            enabled: this.config.alertDashboardSync,
            severityFilter: Object.values(enterprise_alert_coordination_system_1.AlertSeverity),
            categoryFilter: Object.values(enterprise_alert_coordination_system_1.AlertCategory),
            rateLimitMs: 0
        });
        console.log('✅ System integration setup complete');
    }
    setupEventListeners() {
        // Alert system events
        this.alertSystem.on('alert_created', (alert) => {
            this.handleAlertCreated(alert);
        });
        this.alertSystem.on('alert_acknowledged', (alert) => {
            this.handleAlertAcknowledged(alert);
        });
        this.alertSystem.on('alert_resolved', (alert) => {
            this.handleAlertResolved(alert);
        });
        this.alertSystem.on('alert_escalated', (alert) => {
            this.handleAlertEscalated(alert);
        });
        // Dashboard system events
        this.dashboardSystem.on('system_start_requested', () => {
            this.handleSystemStartRequest();
        });
        this.dashboardSystem.on('system_stop_requested', () => {
            this.handleSystemStopRequest();
        });
        this.dashboardSystem.on('system_restart_requested', () => {
            this.handleSystemRestartRequest();
        });
        this.dashboardSystem.on('alert_acknowledge_requested', (alertId) => {
            this.handleAlertAcknowledgeRequest(alertId);
        });
        this.dashboardSystem.on('alert_resolve_requested', (alertId) => {
            this.handleAlertResolveRequest(alertId);
        });
        this.dashboardSystem.on('strategy_start_requested', (strategyId) => {
            this.handleStrategyStartRequest(strategyId);
        });
        this.dashboardSystem.on('strategy_stop_requested', (strategyId) => {
            this.handleStrategyStopRequest(strategyId);
        });
        this.dashboardSystem.on('client_connected', (clientId) => {
            console.log(`🔌 Dashboard client connected: ${clientId}`);
            this.emit('dashboard_client_connected', clientId);
        });
        console.log('📡 Event listeners setup complete');
    }
    // =====================================================
    // ALERT EVENT HANDLERS
    // =====================================================
    handleAlertCreated(alert) {
        console.log(`🚨 Alert created: ${alert.title} (${alert.severity})`);
        if (this.config.alertDashboardSync) {
            // Update dashboard with new alert
            const alerts = this.alertSystem.getAlerts();
            this.dashboardSystem.updateAlerts(alerts);
        }
        // Create system-level notification for critical alerts
        if (alert.severity === enterprise_alert_coordination_system_1.AlertSeverity.CRITICAL || alert.severity === enterprise_alert_coordination_system_1.AlertSeverity.EMERGENCY) {
            this.createSystemAlert('CRITICAL_ALERT', `Critical alert triggered: ${alert.title}`, {
                originalAlert: alert,
                action: 'IMMEDIATE_ATTENTION_REQUIRED'
            });
        }
        this.emit('alert_created', alert);
    }
    handleAlertAcknowledged(alert) {
        console.log(`✅ Alert acknowledged: ${alert.title}`);
        if (this.config.alertDashboardSync) {
            const alerts = this.alertSystem.getAlerts();
            this.dashboardSystem.updateAlerts(alerts);
        }
        this.emit('alert_acknowledged', alert);
    }
    handleAlertEscalated(alert) {
        console.log(`🔺 Alert escalated: ${alert.title} (${alert.severity})`);
        // Create escalation notification
        this.createSystemAlert('ALERT_ESCALATED', `Alert escalated to ${alert.severity}: ${alert.title}`, {
            originalAlert: alert,
            action: 'ESCALATION_REVIEW_REQUIRED'
        });
        this.emit('alert_escalated', alert);
    }
    handleAlertResolved(alert) {
        console.log(`🔧 Alert resolved: ${alert.title}`);
        if (this.config.alertDashboardSync) {
            const alerts = this.alertSystem.getAlerts();
            this.dashboardSystem.updateAlerts(alerts);
        }
        this.emit('alert_resolved', alert);
    }
    // =====================================================
    // DASHBOARD EVENT HANDLERS
    // =====================================================
    handleSystemStartRequest() {
        console.log('🚀 System start requested from dashboard');
        this.emit('system_start_requested');
        this.createSystemAlert('SYSTEM_CONTROL', 'System start requested from dashboard', {
            action: 'START',
            source: 'dashboard'
        });
    }
    handleSystemStopRequest() {
        console.log('⏹️ System stop requested from dashboard');
        this.emit('system_stop_requested');
        this.createSystemAlert('SYSTEM_CONTROL', 'System stop requested from dashboard', {
            action: 'STOP',
            source: 'dashboard'
        });
    }
    handleSystemRestartRequest() {
        console.log('🔄 System restart requested from dashboard');
        this.emit('system_restart_requested');
        this.createSystemAlert('SYSTEM_CONTROL', 'System restart requested from dashboard', {
            action: 'RESTART',
            source: 'dashboard'
        });
    }
    handleAlertAcknowledgeRequest(alertId) {
        console.log(`✋ Alert acknowledge requested: ${alertId}`);
        const success = this.alertSystem.acknowledgeAlert(alertId, 'dashboard_user');
        if (success) {
            console.log(`✅ Alert ${alertId} acknowledged successfully`);
        }
        else {
            console.log(`❌ Failed to acknowledge alert ${alertId}`);
        }
        this.emit('alert_acknowledge_completed', alertId, success);
    }
    handleAlertResolveRequest(alertId) {
        console.log(`🔧 Alert resolve requested: ${alertId}`);
        const success = this.alertSystem.resolveAlert(alertId, 'dashboard_user');
        if (success) {
            console.log(`✅ Alert ${alertId} resolved successfully`);
        }
        else {
            console.log(`❌ Failed to resolve alert ${alertId}`);
        }
        this.emit('alert_resolve_completed', alertId, success);
    }
    handleStrategyStartRequest(strategyId) {
        console.log(`▶️ Strategy start requested: ${strategyId}`);
        this.emit('strategy_start_requested', strategyId);
        this.createSystemAlert('STRATEGY_CONTROL', `Strategy start requested: ${strategyId}`, {
            strategyId,
            action: 'START',
            source: 'dashboard'
        });
    }
    handleStrategyStopRequest(strategyId) {
        console.log(`⏹️ Strategy stop requested: ${strategyId}`);
        this.emit('strategy_stop_requested', strategyId);
        this.createSystemAlert('STRATEGY_CONTROL', `Strategy stop requested: ${strategyId}`, {
            strategyId,
            action: 'STOP',
            source: 'dashboard'
        });
    }
    // =====================================================
    // SYSTEM MONITORING & HEALTH
    // =====================================================
    performHealthCheck() {
        try {
            const alertSystemHealth = this.checkAlertSystemHealth();
            const dashboardSystemHealth = this.checkDashboardSystemHealth();
            const integrationHealth = this.checkIntegrationHealth();
            const overallHealth = {
                alerts: alertSystemHealth,
                dashboard: dashboardSystemHealth,
                integration: integrationHealth,
                timestamp: Date.now()
            };
            // Create alerts for unhealthy components
            if (!alertSystemHealth.healthy) {
                this.createSystemAlert('SYSTEM_HEALTH', 'Alert system health check failed', {
                    component: 'alert_system',
                    issues: alertSystemHealth.issues
                });
            }
            if (!dashboardSystemHealth.healthy) {
                this.createSystemAlert('SYSTEM_HEALTH', 'Dashboard system health check failed', {
                    component: 'dashboard_system',
                    issues: dashboardSystemHealth.issues
                });
            }
            if (!integrationHealth.healthy) {
                this.createSystemAlert('SYSTEM_HEALTH', 'Integration health check failed', {
                    component: 'integration',
                    issues: integrationHealth.issues
                });
            }
            this.emit('health_check_completed', overallHealth);
        }
        catch (error) {
            console.error('❌ Health check failed:', error);
            this.errorCount++;
        }
    }
    checkAlertSystemHealth() {
        const issues = [];
        try {
            const status = this.alertSystem.getSystemStatus();
            if (!status.running) {
                issues.push('Alert system is not running');
            }
            if (status.criticalAlerts > 10) {
                issues.push(`High number of critical alerts: ${status.criticalAlerts}`);
            }
            return { healthy: issues.length === 0, issues };
        }
        catch (error) {
            return { healthy: false, issues: [`Health check error: ${error}`] };
        }
    }
    checkDashboardSystemHealth() {
        const issues = [];
        try {
            if (!this.dashboardSystem.isActive()) {
                issues.push('Dashboard system is not running');
            }
            const clients = this.dashboardSystem.getConnectedClients();
            if (clients === 0) {
                issues.push('No clients connected to dashboard');
            }
            return { healthy: issues.length === 0, issues };
        }
        catch (error) {
            return { healthy: false, issues: [`Health check error: ${error}`] };
        }
    }
    checkIntegrationHealth() {
        const issues = [];
        if (!this.isRunning) {
            issues.push('Integration coordinator is not running');
        }
        if (this.errorCount > 5) {
            issues.push(`High error count: ${this.errorCount}`);
        }
        const timeSinceLastSync = Date.now() - this.lastSyncTime;
        if (timeSinceLastSync > this.config.updateIntervals.dashboard * 5) {
            issues.push('Integration sync is stale');
        }
        return { healthy: issues.length === 0, issues };
    }
    // =====================================================
    // COMPONENT REGISTRATION & MANAGEMENT
    // =====================================================
    registerComponent(name, component) {
        this.systemComponents.set(name, component);
        console.log(`📦 Component registered: ${name}`);
        // Set up component monitoring if it has the right interface
        if (component && typeof component.on === 'function') {
            component.on('error', (error) => {
                this.createSystemAlert('COMPONENT_ERROR', `Component error in ${name}: ${error.message}`, {
                    component: name,
                    error: error.message,
                    stack: error.stack
                });
            });
        }
        this.emit('component_registered', name, component);
    }
    unregisterComponent(name) {
        this.systemComponents.delete(name);
        console.log(`📦 Component unregistered: ${name}`);
        this.emit('component_unregistered', name);
    }
    getComponent(name) {
        return this.systemComponents.get(name);
    }
    updatePortfolioStatus(portfolio) {
        if (this.config.alertDashboardSync) {
            // Map to dashboard PortfolioStatus type, filling missing properties with defaults if necessary
            const mappedPortfolio = {
                ...portfolio,
                totalPnL: portfolio.totalPnL ?? 0,
                totalPnLPercentage: portfolio.totalPnLPercentage ?? 0,
                assets: portfolio.assets ?? [],
                allocation: portfolio.allocation ?? {},
                risk: portfolio.risk ?? {},
                positions: (portfolio.positions ?? []).map((pos) => ({
                    ...pos,
                    pnl: pos.pnl ?? 0,
                    pnlPercentage: pos.pnlPercentage ?? 0,
                    value: pos.value ?? 0
                }))
            };
            this.dashboardSystem.updatePortfolio(mappedPortfolio);
        }
        this.emit('portfolio_updated', portfolio);
    }
    updateStrategyStatus(strategies) {
        if (this.config.alertDashboardSync) {
            // Map to dashboard StrategyStatus type, filling missing properties with defaults if necessary
            const mappedStrategies = strategies.map((s) => ({
                ...s,
                allocation: s.allocation ?? 0,
                lastSignal: s.lastSignal ?? null,
                parameters: s.parameters ?? {}
            }));
            this.dashboardSystem.updateStrategies(mappedStrategies);
        }
        this.emit('strategies_updated', strategies);
    }
    // =====================================================
    // UTILITY METHODS
    // =====================================================
    createSystemAlert(category, message, metadata = {}) {
        this.alertSystem.createAlert({
            category: enterprise_alert_coordination_system_1.AlertCategory.SYSTEM,
            severity: enterprise_alert_coordination_system_1.AlertSeverity.WARNING,
            title: category,
            message,
            source: 'integration_coordinator',
            component: 'system_integration',
            metadata,
            tags: ['integration', 'system']
        });
    }
    groupAlertsByCategory(alerts) {
        return alerts.reduce((acc, alert) => {
            acc[alert.category] = (acc[alert.category] || 0) + 1;
            return acc;
        }, {});
    }
    groupAlertsBySeverity(alerts) {
        return alerts.reduce((acc, alert) => {
            acc[alert.severity] = (acc[alert.severity] || 0) + 1;
            return acc;
        }, {});
    }
    performSync() {
        try {
            // Sync alerts to dashboard
            if (this.config.alertDashboardSync) {
                const alerts = this.alertSystem.getAlerts();
                this.dashboardSystem.updateAlerts(alerts);
            }
            this.lastSyncTime = Date.now();
            this.emit('sync_completed');
        }
        catch (error) {
            this.errorCount++;
            console.error('❌ Sync failed:', error);
        }
    }
    // Add start and stop methods for coordinator lifecycle
    async start() {
        console.log('🔗 Starting System Integration Coordinator...');
        try {
            // Start alert system
            this.alertSystem.start();
            console.log('✅ Alert Coordination System started');
            // Start dashboard system
            await this.dashboardSystem.start();
            console.log('✅ Dashboard Interface System started');
            // Start integration intervals
            this.syncInterval = setInterval(() => {
                this.performSync();
            }, this.config.updateIntervals.dashboard);
            this.healthCheckInterval = setInterval(() => {
                this.performHealthCheck();
            }, this.config.updateIntervals.health);
            this.alertUpdateInterval = setInterval(() => {
                if (this.config.alertDashboardSync) {
                    const alerts = this.alertSystem.getAlerts();
                    this.dashboardSystem.updateAlerts(alerts);
                }
            }, this.config.updateIntervals.alerts);
            this.isRunning = true;
            this.lastSyncTime = Date.now();
            console.log('🔗 System Integration Coordinator started successfully');
            console.log(`   📍 Dashboard URL: ${this.dashboardSystem.getURL()}`);
            console.log(`   🚨 Alert system running with ${this.alertSystem.getRules().length} rules`);
            console.log(`   📊 Dashboard system running with ${this.dashboardSystem.getConnectedClients()} clients`);
            this.emit('integration_started');
        }
        catch (error) {
            console.error('❌ Failed to start System Integration Coordinator:', error);
            this.errorCount++;
        }
    }
    async stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        if (this.alertUpdateInterval) {
            clearInterval(this.alertUpdateInterval);
        }
        // Stop systems
        this.alertSystem.stop();
        await this.dashboardSystem.stop();
        this.isRunning = false;
        console.log('🔗 System Integration Coordinator stopped');
        this.emit('integration_stopped');
    }
    // =====================================================
    // STATUS & MONITORING
    // =====================================================
    getSystemStatus() {
        const alertStatus = this.alertSystem.getSystemStatus();
        return {
            alertSystem: {
                running: alertStatus.running,
                totalAlerts: alertStatus.alertsCount,
                activeAlerts: alertStatus.activeAlertsCount,
                criticalAlerts: alertStatus.criticalAlerts
            },
            dashboard: {
                running: this.dashboardSystem.isActive(),
                connectedClients: this.dashboardSystem.getConnectedClients(),
                url: this.dashboardSystem.getURL()
            },
            integration: {
                running: this.isRunning,
                syncStatus: this.errorCount > 5 ? 'ERROR' : this.errorCount > 0 ? 'WARNING' : 'HEALTHY',
                lastSync: this.lastSyncTime,
                errorCount: this.errorCount
            }
        };
    }
    getConfig() {
        return { ...this.config };
    }
    isActive() {
        return this.isRunning;
    }
    getRegisteredComponents() {
        return Array.from(this.systemComponents.keys());
    }
    // =====================================================
    // TESTING & DEMO METHODS
    // =====================================================
    createTestAlert(severity = enterprise_alert_coordination_system_1.AlertSeverity.WARNING) {
        this.alertSystem.createAlert({
            category: enterprise_alert_coordination_system_1.AlertCategory.SYSTEM,
            severity,
            title: 'Test Alert',
            message: `Test alert created at ${new Date().toISOString()}`,
            source: 'integration_test',
            component: 'test_component',
            metadata: { test: true, timestamp: Date.now() },
            tags: ['test', 'demo']
        });
    }
    simulateSystemLoad() {
        // Create multiple test alerts
        const categories = Object.values(enterprise_alert_coordination_system_1.AlertCategory);
        const severities = Object.values(enterprise_alert_coordination_system_1.AlertSeverity);
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const category = categories[Math.floor(Math.random() * categories.length)];
                const severity = severities[Math.floor(Math.random() * severities.length)];
                this.alertSystem.createAlert({
                    category,
                    severity,
                    title: `Simulated Alert ${i + 1}`,
                    message: `This is a simulated ${severity} alert for testing purposes`,
                    source: 'simulation',
                    component: `sim_component_${i}`,
                    metadata: { simulation: true, index: i },
                    tags: ['simulation', 'load_test']
                });
            }, i * 1000);
        }
    }
}
exports.SystemIntegrationCoordinator = SystemIntegrationCoordinator;
// =====================================================
// EXPORT DEFAULT SINGLETON INSTANCE
// =====================================================
// These would be initialized in the main application
// export const systemIntegrationCoordinator = new SystemIntegrationCoordinator(alertSystem, dashboardSystem);
// export default systemIntegrationCoordinator;

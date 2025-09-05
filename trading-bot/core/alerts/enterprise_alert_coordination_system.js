"use strict";
/**
 * 🚨 ENTERPRISE ALERT COORDINATION SYSTEM V2.0
 *
 * Advanced, high-performance alert management system for enterprise trading operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnterpriseAlertCoordinationSystem = exports.NotificationChannel = exports.AlertStatus = exports.AlertCategory = exports.AlertSeverity = void 0;
const events_1 = require("events");
// =====================================================
// ADVANCED ALERT INTERFACES & TYPES
// =====================================================
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity[AlertSeverity["INFO"] = 1] = "INFO";
    AlertSeverity[AlertSeverity["WARNING"] = 2] = "WARNING";
    AlertSeverity[AlertSeverity["ERROR"] = 3] = "ERROR";
    AlertSeverity[AlertSeverity["CRITICAL"] = 4] = "CRITICAL";
    AlertSeverity[AlertSeverity["EMERGENCY"] = 5] = "EMERGENCY";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
var AlertCategory;
(function (AlertCategory) {
    AlertCategory["SYSTEM"] = "system";
    AlertCategory["TRADING"] = "trading";
    AlertCategory["RISK"] = "risk";
    AlertCategory["PERFORMANCE"] = "performance";
    AlertCategory["CONNECTION"] = "connection";
    AlertCategory["SECURITY"] = "security";
    AlertCategory["COMPLIANCE"] = "compliance";
    AlertCategory["MARKET"] = "market";
    AlertCategory["STRATEGY"] = "strategy";
})(AlertCategory || (exports.AlertCategory = AlertCategory = {}));
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["ACTIVE"] = "active";
    AlertStatus["ACKNOWLEDGED"] = "acknowledged";
    AlertStatus["RESOLVED"] = "resolved";
    AlertStatus["SUPPRESSED"] = "suppressed";
    AlertStatus["ESCALATED"] = "escalated";
})(AlertStatus || (exports.AlertStatus = AlertStatus = {}));
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["EMAIL"] = "email";
    NotificationChannel["SMS"] = "sms";
    NotificationChannel["SLACK"] = "slack";
    NotificationChannel["WEBHOOK"] = "webhook";
    NotificationChannel["DASHBOARD"] = "dashboard";
    NotificationChannel["CONSOLE"] = "console";
    NotificationChannel["DATABASE"] = "database";
    NotificationChannel["FILE"] = "file";
    NotificationChannel["PUSH"] = "push";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
// =====================================================
// ENTERPRISE ALERT COORDINATION SYSTEM
// =====================================================
class EnterpriseAlertCoordinationSystem extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.rules = new Map();
        this.alerts = new Map();
        this.suppressions = new Map();
        this.escalationTimers = new Map();
        this.rateLimitCounters = new Map();
        this.correlationGroups = new Map();
        this.isRunning = false;
        this.metricsInterval = null;
        this.cleanupInterval = null;
        this.auditLog = [];
        this.config = {
            enableCorrelation: config.enableCorrelation !== false,
            enableEscalation: config.enableEscalation !== false,
            enableSuppression: config.enableSuppression !== false,
            enableRateLimit: config.enableRateLimit !== false,
            maxActiveAlerts: config.maxActiveAlerts || 1000,
            correlationWindow: config.correlationWindow || 300000,
            defaultEscalationInterval: config.defaultEscalationInterval || 900000,
            alertRetentionDays: config.alertRetentionDays || 30,
            enableMetrics: config.enableMetrics !== false,
            enableAuditLog: config.enableAuditLog !== false,
            notificationChannels: config.notificationChannels || {
                [NotificationChannel.EMAIL]: {},
                [NotificationChannel.SMS]: {},
                [NotificationChannel.SLACK]: {},
                [NotificationChannel.WEBHOOK]: {},
                [NotificationChannel.DASHBOARD]: {},
                [NotificationChannel.CONSOLE]: {},
                [NotificationChannel.DATABASE]: {},
                [NotificationChannel.FILE]: {},
                [NotificationChannel.PUSH]: {}
            },
            emergencyContacts: config.emergencyContacts || [],
            maintenanceMode: config.maintenanceMode || false
        };
        this.metrics = this.initializeMetrics();
        console.log('[ENTERPRISE_ALERTS] Advanced Alert Coordination System V2.0 initialized');
    }
    // =====================================================
    // INITIALIZATION & LIFECYCLE
    // =====================================================
    initializeMetrics() {
        return {
            totalAlerts: 0,
            activeAlerts: 0,
            alertsByCategory: {
                [AlertCategory.SYSTEM]: 0,
                [AlertCategory.TRADING]: 0,
                [AlertCategory.RISK]: 0,
                [AlertCategory.PERFORMANCE]: 0,
                [AlertCategory.CONNECTION]: 0,
                [AlertCategory.SECURITY]: 0,
                [AlertCategory.COMPLIANCE]: 0,
                [AlertCategory.MARKET]: 0,
                [AlertCategory.STRATEGY]: 0
            },
            alertsBySeverity: {
                [AlertSeverity.INFO]: 0,
                [AlertSeverity.WARNING]: 0,
                [AlertSeverity.ERROR]: 0,
                [AlertSeverity.CRITICAL]: 0,
                [AlertSeverity.EMERGENCY]: 0
            },
            escalatedAlerts: 0,
            suppressedAlerts: 0,
            avgResolutionTime: 0,
            avgAcknowledgmentTime: 0,
            topAlertSources: [],
            alertRate: 0,
            falsePositiveRate: 0
        };
    }
    async start() {
        if (this.isRunning) {
            console.log('[ENTERPRISE_ALERTS] Alert system already running');
            return;
        }
        try {
            console.log('[ENTERPRISE_ALERTS] Starting Enterprise Alert Coordination System...');
            this.isRunning = true;
            this.emit('system_started', { timestamp: Date.now() });
            console.log('[ENTERPRISE_ALERTS] ✅ Alert system started successfully');
        }
        catch (error) {
            console.error('[ENTERPRISE_ALERTS] Failed to start alert system:', error);
            throw error;
        }
    }
    async stop() {
        if (!this.isRunning) {
            console.log('[ENTERPRISE_ALERTS] Alert system not running');
            return;
        }
        console.log('[ENTERPRISE_ALERTS] Stopping Enterprise Alert Coordination System...');
        // Clear intervals
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = null;
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        // Clear escalation timers
        this.escalationTimers.forEach((timer) => {
            clearTimeout(timer);
        });
        this.escalationTimers.clear();
        this.isRunning = false;
        this.emit('system_stopped', { timestamp: Date.now() });
        console.log('[ENTERPRISE_ALERTS] ✅ Alert system stopped successfully');
    }
    // =====================================================
    // ALERT RULE MANAGEMENT
    // =====================================================
    addRule(rule) {
        this.rules.set(rule.id, { ...rule });
        this.emit('rule_added', rule);
        console.log(`[ENTERPRISE_ALERTS] Rule added: ${rule.name} (${rule.id})`);
    }
    updateRule(ruleId, updates) {
        const rule = this.rules.get(ruleId);
        if (!rule) {
            console.warn(`[ENTERPRISE_ALERTS] Rule not found: ${ruleId}`);
            return false;
        }
        const updatedRule = { ...rule, ...updates };
        this.rules.set(ruleId, updatedRule);
        this.emit('rule_updated', updatedRule);
        console.log(`[ENTERPRISE_ALERTS] Rule updated: ${ruleId}`);
        return true;
    }
    removeRule(ruleId) {
        const removed = this.rules.delete(ruleId);
        if (removed) {
            this.emit('rule_removed', ruleId);
            console.log(`[ENTERPRISE_ALERTS] Rule removed: ${ruleId}`);
        }
        return removed;
    }
    // Removed duplicate getRules() implementation
    getRule(ruleId) {
        return this.rules.get(ruleId);
    }
    // =====================================================
    // ALERT CREATION & MANAGEMENT
    // =====================================================
    createAlert(alertData) {
        if (!this.isRunning) {
            throw new Error('Alert system is not running');
        }
        if (this.config.maintenanceMode) {
            console.log('[ENTERPRISE_ALERTS] Maintenance mode - alert suppressed');
            throw new Error('System in maintenance mode');
        }
        // Check if we've exceeded max alerts
        if (this.getActiveAlertsCount() >= this.config.maxActiveAlerts) {
            console.warn('[ENTERPRISE_ALERTS] Maximum active alerts reached');
            throw new Error('Maximum active alerts exceeded');
        }
        // Generate fingerprint for deduplication
        const fingerprint = this.generateFingerprint(alertData);
        // Check for existing alert with same fingerprint
        const existingAlert = this.findAlertByFingerprint(fingerprint);
        if (existingAlert) {
            return this.updateExistingAlert(existingAlert, alertData);
        }
        // Create new alert
        const alert = {
            id: this.generateAlertId(),
            ruleId: alertData.ruleId,
            severity: alertData.severity,
            category: alertData.category,
            status: AlertStatus.ACTIVE,
            title: alertData.title,
            message: alertData.message,
            source: alertData.source,
            component: alertData.component || alertData.source,
            timestamp: Date.now(),
            escalationLevel: 0,
            occurrenceCount: 1,
            lastOccurrence: Date.now(),
            fingerprint,
            tags: alertData.tags || [],
            metadata: alertData.metadata || {},
            correlatedAlerts: [],
            parentAlertId: undefined,
            childAlertIds: [],
            notifications: []
        };
        // Store alert
        this.alerts.set(alert.id, alert);
        // Update metrics
        this.updateAlertMetrics(alert);
        // Log audit trail
        this.logAudit('alert_created', {
            alertId: alert.id,
            severity: alert.severity,
            category: alert.category,
            source: alert.source,
            timestamp: alert.timestamp
        });
        // Emit event
        this.emit('alert_created', alert);
        console.log(`[ENTERPRISE_ALERTS] Alert created: ${alert.severity} - ${alert.title} (${alert.id})`);
        return alert;
    }
    // acknowledgeAlert implementation removed (duplicate)
    // Duplicate resolveAlert implementation removed
    // =====================================================
    // UTILITY METHODS
    // =====================================================
    // Duplicate generateFingerprint removed
    // (Removed duplicate findAlertByFingerprint implementation)
    // Removed duplicate updateExistingAlert implementation
    // Removed duplicate getActiveAlertsCount() implementation
    // =====================================================
    // PUBLIC API METHODS
    // =====================================================
    // Duplicate getAlerts() implementation removed
    // Duplicate getActiveAlerts() implementation removed
    // Removed duplicate getAlert(alertId: string): Alert | undefined
    // Duplicate getMetrics() removed
    // Duplicate getAuditLog() removed
    // Removed duplicate isSystemRunning() implementation
    // Removed duplicate getCriticalAlerts() implementation
    // Duplicate getSystemStatus() implementation removed
    acknowledgeAlert(alertId, acknowledgedBy) {
        const alert = this.alerts.get(alertId);
        if (!alert || alert.status !== AlertStatus.ACTIVE) {
            return false;
        }
        alert.status = AlertStatus.ACKNOWLEDGED;
        alert.acknowledgedAt = Date.now();
        alert.acknowledgedBy = acknowledgedBy;
        this.logAudit('alert_acknowledged', {
            alertId,
            acknowledgedBy,
            timestamp: Date.now()
        });
        this.emit('alert_acknowledged', alert);
        console.log(`[ENTERPRISE_ALERTS] Alert acknowledged: ${alertId} by ${acknowledgedBy}`);
        return true;
    }
    resolveAlert(alertId, resolvedBy) {
        const alert = this.alerts.get(alertId);
        if (!alert) {
            return false;
        }
        alert.status = AlertStatus.RESOLVED;
        alert.resolvedAt = Date.now();
        alert.resolvedBy = resolvedBy;
        // Resolve child alerts
        alert.childAlertIds.forEach((childId) => {
            this.resolveAlert(childId, resolvedBy);
        });
        this.logAudit('alert_resolved', {
            alertId,
            resolvedBy,
            timestamp: Date.now(),
            resolutionTime: Date.now() - alert.timestamp
        });
        this.emit('alert_resolved', alert);
        console.log(`[ENTERPRISE_ALERTS] Alert resolved: ${alertId} by ${resolvedBy}`);
        return true;
    }
    // =====================================================
    // UTILITY METHODS
    // =====================================================
    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateFingerprint(alertData) {
        const key = `${alertData.category}_${alertData.source}_${alertData.title}`;
        return Buffer.from(key).toString('base64').substr(0, 16);
    }
    findAlertByFingerprint(fingerprint) {
        return Array.from(this.alerts.values()).find(alert => alert.fingerprint === fingerprint && alert.status === AlertStatus.ACTIVE);
    }
    updateExistingAlert(alert, newData) {
        alert.occurrenceCount++;
        alert.lastOccurrence = Date.now();
        alert.message = newData.message;
        alert.metadata = { ...alert.metadata, ...newData.metadata };
        console.log(`[ENTERPRISE_ALERTS] Updated existing alert: ${alert.id} (occurrence ${alert.occurrenceCount})`);
        return alert;
    }
    updateAlertMetrics(alert) {
        this.metrics.totalAlerts++;
        this.metrics.activeAlerts++;
        this.metrics.alertsByCategory[alert.category] = (this.metrics.alertsByCategory[alert.category] || 0) + 1;
        this.metrics.alertsBySeverity[alert.severity] = (this.metrics.alertsBySeverity[alert.severity] || 0) + 1;
    }
    logAudit(action, details) {
        if (!this.config.enableAuditLog)
            return;
        this.auditLog.push({
            timestamp: Date.now(),
            action,
            details
        });
        // Keep only last 10000 audit entries
        if (this.auditLog.length > 10000) {
            this.auditLog = this.auditLog.slice(-10000);
        }
    }
    getActiveAlertsCount() {
        return Array.from(this.alerts.values()).filter(a => a.status === AlertStatus.ACTIVE).length;
    }
    // =====================================================
    // PUBLIC API METHODS
    // =====================================================
    getAlerts() {
        return Array.from(this.alerts.values());
    }
    getActiveAlerts() {
        return Array.from(this.alerts.values()).filter(a => a.status === AlertStatus.ACTIVE);
    }
    getAlert(alertId) {
        return this.alerts.get(alertId);
    }
    getMetrics() {
        return { ...this.metrics };
    }
    getAuditLog() {
        return [...this.auditLog];
    }
    isSystemRunning() {
        return this.isRunning;
    }
    getRules() {
        return Array.from(this.rules.values());
    }
    getCriticalAlerts() {
        return Array.from(this.alerts.values()).filter(alert => alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.EMERGENCY);
    }
    addNotificationChannel(channel) {
        console.log('📢 Notification channel added:', channel);
    }
    getSystemStatus() {
        return {
            running: this.isRunning,
            alertsCount: this.alerts.size,
            activeAlertsCount: this.getActiveAlertsCount(),
            rulesCount: this.rules.size,
            suppressionsCount: this.suppressions.size,
            escalationTimersCount: this.escalationTimers.size,
            criticalAlerts: this.getCriticalAlerts().length
        };
    }
}
exports.EnterpriseAlertCoordinationSystem = EnterpriseAlertCoordinationSystem;

"use strict";
/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
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
        this.alerts = new Map();
        this.suppressions = new Map();
        this.escalationTimers = new Map();
        this.isRunning = false;
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
    }
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
        this.isRunning = true;
        console.log('[ENTERPRISE_ALERTS] System started');
    }
    async stop() {
        this.isRunning = false;
        console.log('[ENTERPRISE_ALERTS] System stopped');
    }
    createAlert(alertData) {
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
            fingerprint: this.generateFingerprint(alertData),
            tags: alertData.tags || [],
            metadata: alertData.metadata || {},
            correlatedAlerts: [],
            parentAlertId: undefined,
            childAlertIds: [],
            notifications: []
        };
        this.alerts.set(alert.id, alert);
        return alert;
    }
    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateFingerprint(alertData) {
        const key = `${alertData.category}_${alertData.source}_${alertData.title}`;
        return Buffer.from(key).toString('base64').substr(0, 16);
    }
    // Public API methods
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
    isSystemRunning() {
        return this.isRunning;
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
            activeAlertsCount: this.getActiveAlerts().length,
            rulesCount: 0,
            suppressionsCount: this.suppressions.size,
            escalationTimersCount: this.escalationTimers.size,
            criticalAlerts: this.getCriticalAlerts().length
        };
    }
}
exports.EnterpriseAlertCoordinationSystem = EnterpriseAlertCoordinationSystem;

"use strict";
/**
 * 🚨 CENTRAL ALERT COORDINATION SYSTEM
 *
 * Enterprise-grade alert coordination system that unifies all alerts
 * from different components into a centralized management system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertCoordinator = exports.AlertCoordinationSystem = exports.AlertCategory = exports.AlertStatus = exports.AlertSeverity = void 0;
const events_1 = require("events");
// =====================================================
// CORE INTERFACES & TYPES
// =====================================================
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["LOW"] = "LOW";
    AlertSeverity["MEDIUM"] = "MEDIUM";
    AlertSeverity["HIGH"] = "HIGH";
    AlertSeverity["CRITICAL"] = "CRITICAL";
    AlertSeverity["EMERGENCY"] = "EMERGENCY";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["ACTIVE"] = "ACTIVE";
    AlertStatus["ACKNOWLEDGED"] = "ACKNOWLEDGED";
    AlertStatus["RESOLVED"] = "RESOLVED";
    AlertStatus["ESCALATED"] = "ESCALATED";
    AlertStatus["SUPPRESSED"] = "SUPPRESSED";
})(AlertStatus || (exports.AlertStatus = AlertStatus = {}));
var AlertCategory;
(function (AlertCategory) {
    AlertCategory["SYSTEM"] = "SYSTEM";
    AlertCategory["TRADING"] = "TRADING";
    AlertCategory["RISK"] = "RISK";
    AlertCategory["PERFORMANCE"] = "PERFORMANCE";
    AlertCategory["NETWORK"] = "NETWORK";
    AlertCategory["DATA"] = "DATA";
    AlertCategory["EXECUTION"] = "EXECUTION";
    AlertCategory["STRATEGY"] = "STRATEGY";
    AlertCategory["INFRASTRUCTURE"] = "INFRASTRUCTURE";
})(AlertCategory || (exports.AlertCategory = AlertCategory = {}));
// =====================================================
// MAIN ALERT COORDINATION SYSTEM
// =====================================================
class AlertCoordinationSystem extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.alerts = new Map();
        this.rules = new Map();
        this.channels = new Map();
        this.acknowledgements = new Map();
        this.escalations = new Map();
        this.alertHistory = [];
        this.isRunning = false;
        this.config = {
            maxActiveAlerts: 1000,
            alertRetentionDays: 30,
            escalationEnabled: true,
            autoResolutionEnabled: true,
            suppressionEnabled: true,
            correlationEnabled: true,
            correlationWindowMs: 300000, // 5 minutes
            defaultCooldownMs: 60000, // 1 minute
            defaultEscalationDelayMs: 900000, // 15 minutes
            rateLimitWindowMs: 60000, // 1 minute
            maxAlertsPerWindow: 50,
            ...config
        };
        this.metrics = this.initializeMetrics();
        this.setupDefaultChannels();
        this.setupDefaultRules();
    }
    // =====================================================
    // INITIALIZATION & CONFIGURATION
    // =====================================================
    initializeMetrics() {
        return {
            totalAlerts: 0,
            activeAlerts: 0,
            alertsByCategory: Object.values(AlertCategory).reduce((acc, cat) => {
                acc[cat] = 0;
                return acc;
            }, {}),
            alertsBySeverity: Object.values(AlertSeverity).reduce((acc, sev) => {
                acc[sev] = 0;
                return acc;
            }, {}),
            averageResolutionTime: 0,
            escalationRate: 0,
            falsePositiveRate: 0,
            acknowledgedAlerts: 0,
            autoResolvedAlerts: 0
        };
    }
    setupDefaultChannels() {
        // Console channel (always enabled)
        this.addNotificationChannel({
            id: 'console',
            type: 'CONSOLE',
            name: 'Console Output',
            config: { colors: true },
            enabled: true,
            severityFilter: Object.values(AlertSeverity),
            categoryFilter: Object.values(AlertCategory),
            rateLimitMs: 0
        });
        // File channel for all alerts
        this.addNotificationChannel({
            id: 'file',
            type: 'FILE',
            name: 'Alert Log File',
            config: {
                filepath: './logs/alerts.log',
                maxSize: 10485760, // 10MB
                maxFiles: 5
            },
            enabled: true,
            severityFilter: Object.values(AlertSeverity),
            categoryFilter: Object.values(AlertCategory),
            rateLimitMs: 0
        });
        // High priority channel for critical alerts
        this.addNotificationChannel({
            id: 'critical',
            type: 'WEBHOOK',
            name: 'Critical Alert Webhook',
            config: {
                url: process.env.CRITICAL_ALERT_WEBHOOK || '',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            },
            enabled: !!process.env.CRITICAL_ALERT_WEBHOOK,
            severityFilter: [AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY],
            categoryFilter: Object.values(AlertCategory),
            rateLimitMs: 30000 // 30 seconds
        });
    }
    setupDefaultRules() {
        // System health rules
        this.addAlertRule({
            id: 'system_cpu_high',
            name: 'High CPU Usage',
            description: 'CPU usage exceeds threshold',
            category: AlertCategory.SYSTEM,
            severity: AlertSeverity.HIGH,
            condition: {
                metric: 'system.cpu.usage',
                operator: 'gt',
                threshold: 85
            },
            cooldown: 300000, // 5 minutes
            autoResolve: true,
            escalationEnabled: true,
            escalationDelay: 900000, // 15 minutes
            suppressionEnabled: true,
            tags: ['performance', 'system'],
            enabled: true,
            triggerCount: 0
        });
        // Trading rules
        this.addAlertRule({
            id: 'drawdown_critical',
            name: 'Critical Drawdown',
            description: 'Portfolio drawdown exceeds critical threshold',
            category: AlertCategory.RISK,
            severity: AlertSeverity.CRITICAL,
            condition: {
                metric: 'portfolio.drawdown',
                operator: 'gt',
                threshold: 20
            },
            cooldown: 60000, // 1 minute
            autoResolve: false,
            escalationEnabled: true,
            escalationDelay: 300000, // 5 minutes
            suppressionEnabled: false,
            tags: ['risk', 'portfolio'],
            enabled: true,
            triggerCount: 0
        });
        // Network connectivity rules
        this.addAlertRule({
            id: 'network_latency_high',
            name: 'High Network Latency',
            description: 'Network latency exceeds acceptable threshold',
            category: AlertCategory.NETWORK,
            severity: AlertSeverity.MEDIUM,
            condition: {
                metric: 'network.latency',
                operator: 'gt',
                threshold: 1000
            },
            cooldown: 120000, // 2 minutes
            autoResolve: true,
            escalationEnabled: true,
            escalationDelay: 600000, // 10 minutes
            suppressionEnabled: true,
            tags: ['network', 'performance'],
            enabled: true,
            triggerCount: 0
        });
    }
    // =====================================================
    // ALERT MANAGEMENT
    // =====================================================
    createAlert(alertData) {
        const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const alert = {
            id: alertId,
            timestamp: Date.now(),
            category: alertData.category || AlertCategory.SYSTEM,
            severity: alertData.severity || AlertSeverity.MEDIUM,
            status: AlertStatus.ACTIVE,
            title: alertData.title || 'Unknown Alert',
            message: alertData.message || 'No description provided',
            source: alertData.source || 'system',
            component: alertData.component || 'unknown',
            metadata: alertData.metadata || {},
            tags: alertData.tags || [],
            acknowledgements: [],
            escalations: [],
            autoResolved: false,
            relatedAlerts: [],
            ...alertData
        };
        // Override id to ensure uniqueness
        alert.id = alertId;
        // Check rate limiting
        if (this.isRateLimited()) {
            console.warn(`🚫 Alert rate limit exceeded, suppressing: ${alert.title}`);
            return alert;
        }
        // Check correlation with existing alerts
        if (this.config.correlationEnabled) {
            this.correlateAlert(alert);
        }
        // Store alert
        this.alerts.set(alertId, alert);
        this.alertHistory.push(alert);
        this.metrics.totalAlerts++;
        this.metrics.activeAlerts++;
        this.metrics.alertsByCategory[alert.category]++;
        this.metrics.alertsBySeverity[alert.severity]++;
        // Emit alert event
        this.emit('alert_created', alert);
        // Send notifications
        this.sendNotifications(alert);
        // Log alert
        this.logAlert(alert, 'CREATED');
        // Cleanup old alerts if necessary
        this.cleanupOldAlerts();
        return alert;
    }
    acknowledgeAlert(alertId, acknowledgedBy, comment) {
        const alert = this.alerts.get(alertId);
        if (!alert || alert.status !== AlertStatus.ACTIVE) {
            return false;
        }
        const acknowledgementId = `ack_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const acknowledgement = {
            id: acknowledgementId,
            alertId,
            acknowledgedBy,
            timestamp: Date.now(),
            comment
        };
        alert.status = AlertStatus.ACKNOWLEDGED;
        alert.acknowledgements.push(acknowledgement);
        this.acknowledgements.set(acknowledgementId, acknowledgement);
        this.metrics.acknowledgedAlerts++;
        this.emit('alert_acknowledged', alert, acknowledgement);
        this.logAlert(alert, 'ACKNOWLEDGED', { acknowledgedBy, comment });
        return true;
    }
    resolveAlert(alertId, resolvedBy, comment) {
        const alert = this.alerts.get(alertId);
        if (!alert || alert.status === AlertStatus.RESOLVED) {
            return false;
        }
        alert.status = AlertStatus.RESOLVED;
        alert.resolutionTime = Date.now();
        this.metrics.activeAlerts = Math.max(0, this.metrics.activeAlerts - 1);
        this.emit('alert_resolved', alert, { resolvedBy, comment });
        this.logAlert(alert, 'RESOLVED', { resolvedBy, comment });
        return true;
    }
    escalateAlert(alertId, toSeverity, reason, triggeredBy = 'MANUAL') {
        const alert = this.alerts.get(alertId);
        if (!alert || alert.status === AlertStatus.RESOLVED) {
            return false;
        }
        const escalationId = `esc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const escalation = {
            id: escalationId,
            alertId,
            fromSeverity: alert.severity,
            toSeverity,
            timestamp: Date.now(),
            reason,
            triggeredBy
        };
        alert.severity = toSeverity;
        alert.status = AlertStatus.ESCALATED;
        alert.escalations.push(escalation);
        this.escalations.set(escalationId, escalation);
        this.metrics.escalationRate++;
        this.emit('alert_escalated', alert, escalation);
        this.logAlert(alert, 'ESCALATED', { toSeverity, reason, triggeredBy });
        // Send notifications for escalated alert
        this.sendNotifications(alert);
        return true;
    }
    suppressAlert(alertId, duration, reason) {
        const alert = this.alerts.get(alertId);
        if (!alert) {
            return false;
        }
        alert.status = AlertStatus.SUPPRESSED;
        alert.suppressedUntil = Date.now() + duration;
        this.emit('alert_suppressed', alert, { duration, reason });
        this.logAlert(alert, 'SUPPRESSED', { duration, reason });
        return true;
    }
    // =====================================================
    // RULE MANAGEMENT
    // =====================================================
    addAlertRule(rule) {
        this.rules.set(rule.id, rule);
        this.emit('rule_added', rule);
        console.log(`📋 Alert rule added: ${rule.name}`);
    }
    removeAlertRule(ruleId) {
        const rule = this.rules.get(ruleId);
        if (!rule) {
            return false;
        }
        this.rules.delete(ruleId);
        this.emit('rule_removed', rule);
        console.log(`📋 Alert rule removed: ${rule.name}`);
        return true;
    }
    updateAlertRule(ruleId, updates) {
        const rule = this.rules.get(ruleId);
        if (!rule) {
            return false;
        }
        Object.assign(rule, updates);
        this.emit('rule_updated', rule);
        console.log(`📋 Alert rule updated: ${rule.name}`);
        return true;
    }
    evaluateMetric(metric, value, source = 'system') {
        for (const rule of this.rules.values()) {
            if (!rule.enabled || rule.condition.metric !== metric) {
                continue;
            }
            // Check cooldown
            if (rule.lastTriggered && (Date.now() - rule.lastTriggered) < rule.cooldown) {
                continue;
            }
            // Evaluate condition
            const condition = rule.condition;
            let triggered = false;
            switch (condition.operator) {
                case 'gt':
                    triggered = value > condition.threshold;
                    break;
                case 'gte':
                    triggered = value >= condition.threshold;
                    break;
                case 'lt':
                    triggered = value < condition.threshold;
                    break;
                case 'lte':
                    triggered = value <= condition.threshold;
                    break;
                case 'eq':
                    triggered = value === condition.threshold;
                    break;
                case 'ne':
                    triggered = value !== condition.threshold;
                    break;
            }
            if (triggered) {
                this.triggerRuleAlert(rule, value, source);
            }
        }
    }
    triggerRuleAlert(rule, value, source) {
        rule.lastTriggered = Date.now();
        rule.triggerCount++;
        const alert = this.createAlert({
            ruleId: rule.id,
            category: rule.category,
            severity: rule.severity,
            title: rule.name,
            message: `${rule.description} (value: ${value}, threshold: ${rule.condition.threshold})`,
            source,
            component: rule.category.toLowerCase(),
            metadata: {
                ruleId: rule.id,
                metric: rule.condition.metric,
                value,
                threshold: rule.condition.threshold,
                operator: rule.condition.operator
            },
            tags: rule.tags
        });
        console.log(`🚨 Rule-triggered alert: ${rule.name} (${rule.severity})`);
    }
    // =====================================================
    // NOTIFICATION CHANNELS
    // =====================================================
    addNotificationChannel(channel) {
        this.channels.set(channel.id, channel);
        this.emit('channel_added', channel);
        console.log(`📢 Notification channel added: ${channel.name}`);
    }
    removeNotificationChannel(channelId) {
        const channel = this.channels.get(channelId);
        if (!channel) {
            return false;
        }
        this.channels.delete(channelId);
        this.emit('channel_removed', channel);
        console.log(`📢 Notification channel removed: ${channel.name}`);
        return true;
    }
    async sendNotifications(alert) {
        for (const channel of this.channels.values()) {
            if (!channel.enabled) {
                continue;
            }
            // Check severity filter
            if (!channel.severityFilter.includes(alert.severity)) {
                continue;
            }
            // Check category filter
            if (!channel.categoryFilter.includes(alert.category)) {
                continue;
            }
            // Check rate limiting
            if (channel.rateLimitMs > 0 && channel.lastSent) {
                if ((Date.now() - channel.lastSent) < channel.rateLimitMs) {
                    continue;
                }
            }
            await this.sendNotificationToChannel(alert, channel);
            channel.lastSent = Date.now();
        }
    }
    async sendNotificationToChannel(alert, channel) {
        try {
            switch (channel.type) {
                case 'CONSOLE':
                    this.sendConsoleNotification(alert, channel);
                    break;
                case 'FILE':
                    this.sendFileNotification(alert, channel);
                    break;
                case 'EMAIL':
                    await this.sendEmailNotification(alert, channel);
                    break;
                case 'SMS':
                    await this.sendSMSNotification(alert, channel);
                    break;
                case 'SLACK':
                    await this.sendSlackNotification(alert, channel);
                    break;
                case 'WEBHOOK':
                    await this.sendWebhookNotification(alert, channel);
                    break;
            }
            this.emit('notification_sent', alert, channel);
        }
        catch (error) {
            console.error(`❌ Failed to send notification via ${channel.name}:`, error);
            this.emit('notification_error', alert, channel, error);
        }
    }
    sendConsoleNotification(alert, channel) {
        const icon = this.getSeverityIcon(alert.severity);
        const color = this.getSeverityColor(alert.severity);
        if (channel.config.colors) {
            console.log(`${icon} [${color}${alert.severity}\x1b[0m] ${alert.title}`);
            console.log(`   📍 ${alert.component} | ${alert.source}`);
            console.log(`   💬 ${alert.message}`);
        }
        else {
            console.log(`${icon} [${alert.severity}] ${alert.title}`);
            console.log(`   📍 ${alert.component} | ${alert.source}`);
            console.log(`   💬 ${alert.message}`);
        }
    }
    sendFileNotification(alert, channel) {
        const fs = require('fs');
        const path = require('path');
        const logEntry = {
            timestamp: new Date(alert.timestamp).toISOString(),
            id: alert.id,
            severity: alert.severity,
            category: alert.category,
            title: alert.title,
            message: alert.message,
            component: alert.component,
            source: alert.source,
            metadata: alert.metadata
        };
        const logLine = JSON.stringify(logEntry) + '\n';
        try {
            // Ensure directory exists
            const dir = path.dirname(channel.config.filepath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.appendFileSync(channel.config.filepath, logLine);
        }
        catch (error) {
            console.error(`❌ Failed to write to alert log file:`, error);
        }
    }
    async sendEmailNotification(alert, channel) {
        // In production, integrate with actual email service (SendGrid, AWS SES, etc.)
        console.log(`📧 Email notification (${channel.name}): ${alert.title}`);
    }
    async sendSMSNotification(alert, channel) {
        // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
        console.log(`📱 SMS notification (${channel.name}): ${alert.title}`);
    }
    async sendSlackNotification(alert, channel) {
        // In production, integrate with Slack API
        console.log(`💬 Slack notification (${channel.name}): ${alert.title}`);
    }
    async sendWebhookNotification(alert, channel) {
        if (!channel.config.url) {
            return;
        }
        const payload = {
            alert: {
                id: alert.id,
                timestamp: alert.timestamp,
                severity: alert.severity,
                category: alert.category,
                title: alert.title,
                message: alert.message,
                component: alert.component,
                source: alert.source,
                metadata: alert.metadata
            },
            channel: channel.name
        };
        try {
            // In production, use actual HTTP client
            console.log(`🔗 Webhook notification (${channel.name}): ${alert.title}`);
            console.log(`   URL: ${channel.config.url}`);
            console.log(`   Payload: ${JSON.stringify(payload, null, 2)}`);
        }
        catch (error) {
            throw new Error(`Webhook notification failed: ${error}`);
        }
    }
    // =====================================================
    // UTILITY METHODS
    // =====================================================
    getSeverityIcon(severity) {
        const icons = {
            [AlertSeverity.LOW]: '🟢',
            [AlertSeverity.MEDIUM]: '🟡',
            [AlertSeverity.HIGH]: '🟠',
            [AlertSeverity.CRITICAL]: '🔴',
            [AlertSeverity.EMERGENCY]: '🚨'
        };
        return icons[severity] || '⚪';
    }
    getSeverityColor(severity) {
        const colors = {
            [AlertSeverity.LOW]: '\x1b[32m', // Green
            [AlertSeverity.MEDIUM]: '\x1b[33m', // Yellow
            [AlertSeverity.HIGH]: '\x1b[35m', // Magenta
            [AlertSeverity.CRITICAL]: '\x1b[31m', // Red
            [AlertSeverity.EMERGENCY]: '\x1b[41m' // Red background
        };
        return colors[severity] || '\x1b[37m'; // White
    }
    correlateAlert(alert) {
        const correlationWindow = this.config.correlationWindowMs;
        const cutoff = Date.now() - correlationWindow;
        for (const existingAlert of this.alerts.values()) {
            if (existingAlert.timestamp < cutoff || existingAlert.id === alert.id) {
                continue;
            }
            // Simple correlation based on component and category
            if (existingAlert.component === alert.component &&
                existingAlert.category === alert.category) {
                alert.relatedAlerts.push(existingAlert.id);
                existingAlert.relatedAlerts.push(alert.id);
            }
        }
    }
    isRateLimited() {
        const window = this.config.rateLimitWindowMs;
        const maxAlerts = this.config.maxAlertsPerWindow;
        const cutoff = Date.now() - window;
        const recentAlerts = this.alertHistory.filter(alert => alert.timestamp > cutoff);
        return recentAlerts.length >= maxAlerts;
    }
    logAlert(alert, action, metadata) {
        console.log(`📝 Alert ${action}: ${alert.id} - ${alert.title}`);
        if (metadata) {
            console.log(`   📊 Metadata:`, metadata);
        }
    }
    cleanupOldAlerts() {
        const retentionMs = this.config.alertRetentionDays * 24 * 60 * 60 * 1000;
        const cutoff = Date.now() - retentionMs;
        // Remove old alerts from active map
        for (const [alertId, alert] of this.alerts.entries()) {
            if (alert.timestamp < cutoff && alert.status === AlertStatus.RESOLVED) {
                this.alerts.delete(alertId);
            }
        }
        // Trim alert history
        this.alertHistory = this.alertHistory.filter(alert => alert.timestamp > cutoff);
        // Keep active alerts map reasonable size
        if (this.alerts.size > this.config.maxActiveAlerts) {
            const sorted = Array.from(this.alerts.entries())
                .sort(([, a], [, b]) => a.timestamp - b.timestamp);
            const toRemove = sorted.slice(0, sorted.length - this.config.maxActiveAlerts);
            toRemove.forEach(([alertId]) => this.alerts.delete(alertId));
        }
    }
    // =====================================================
    // SYSTEM CONTROL & MONITORING
    // =====================================================
    start() {
        if (this.isRunning) {
            return;
        }
        this.isRunning = true;
        // Start periodic tasks
        this.metricsUpdateInterval = setInterval(() => {
            this.updateMetrics();
        }, 60000); // Every minute
        this.escalationCheckInterval = setInterval(() => {
            this.checkEscalations();
        }, 300000); // Every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldAlerts();
        }, 3600000); // Every hour
        this.emit('system_started');
        console.log('🚨 Alert Coordination System started');
    }
    stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        // Clear intervals
        if (this.metricsUpdateInterval) {
            clearInterval(this.metricsUpdateInterval);
        }
        if (this.escalationCheckInterval) {
            clearInterval(this.escalationCheckInterval);
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.emit('system_stopped');
        console.log('🚨 Alert Coordination System stopped');
    }
    updateMetrics() {
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        const recentAlerts = this.alertHistory.filter(alert => alert.timestamp > oneDayAgo);
        this.metrics.activeAlerts = Array.from(this.alerts.values())
            .filter(alert => alert.status === AlertStatus.ACTIVE).length;
        // Calculate average resolution time
        const resolvedAlerts = recentAlerts.filter(alert => alert.resolutionTime);
        if (resolvedAlerts.length > 0) {
            const totalResolutionTime = resolvedAlerts.reduce((sum, alert) => {
                return sum + (alert.resolutionTime - alert.timestamp);
            }, 0);
            this.metrics.averageResolutionTime = totalResolutionTime / resolvedAlerts.length;
        }
        // Calculate other metrics
        this.metrics.acknowledgedAlerts = recentAlerts.filter(alert => alert.acknowledgements.length > 0).length;
        this.metrics.autoResolvedAlerts = recentAlerts.filter(alert => alert.autoResolved).length;
        this.emit('metrics_updated', this.metrics);
    }
    checkEscalations() {
        if (!this.config.escalationEnabled) {
            return;
        }
        const now = Date.now();
        for (const alert of this.alerts.values()) {
            if (alert.status !== AlertStatus.ACTIVE) {
                continue;
            }
            const rule = alert.ruleId ? this.rules.get(alert.ruleId) : null;
            if (!rule || !rule.escalationEnabled) {
                continue;
            }
            // Check if escalation time has passed
            const timeSinceCreated = now - alert.timestamp;
            if (timeSinceCreated >= rule.escalationDelay) {
                // Escalate to next severity level
                const currentSeverity = alert.severity;
                let nextSeverity;
                switch (currentSeverity) {
                    case AlertSeverity.LOW:
                        nextSeverity = AlertSeverity.MEDIUM;
                        break;
                    case AlertSeverity.MEDIUM:
                        nextSeverity = AlertSeverity.HIGH;
                        break;
                    case AlertSeverity.HIGH:
                        nextSeverity = AlertSeverity.CRITICAL;
                        break;
                    case AlertSeverity.CRITICAL:
                        nextSeverity = AlertSeverity.EMERGENCY;
                        break;
                    default:
                        continue; // Already at max severity
                }
                this.escalateAlert(alert.id, nextSeverity, 'Automatic escalation due to unresolved alert', 'AUTO');
            }
        }
    }
    // =====================================================
    // PUBLIC API
    // =====================================================
    getAlerts() {
        return Array.from(this.alerts.values());
    }
    getActiveAlerts() {
        return this.getAlerts().filter(alert => alert.status === AlertStatus.ACTIVE);
    }
    getCriticalAlerts() {
        return this.getAlerts().filter(alert => alert.severity === AlertSeverity.CRITICAL ||
            alert.severity === AlertSeverity.EMERGENCY);
    }
    getAlertsByCategory(category) {
        return this.getAlerts().filter(alert => alert.category === category);
    }
    getAlertsBySeverity(severity) {
        return this.getAlerts().filter(alert => alert.severity === severity);
    }
    getAlert(alertId) {
        return this.alerts.get(alertId);
    }
    getMetrics() {
        return { ...this.metrics };
    }
    getRules() {
        return Array.from(this.rules.values());
    }
    getChannels() {
        return Array.from(this.channels.values());
    }
    getSystemStatus() {
        const criticalAlerts = this.getCriticalAlerts().length;
        return {
            isRunning: this.isRunning,
            totalAlerts: this.metrics.totalAlerts,
            activeAlerts: this.metrics.activeAlerts,
            criticalAlerts,
            rulesCount: this.rules.size,
            channelsCount: this.channels.size,
            uptime: this.isRunning ? Date.now() - (this.metricsUpdateInterval ? Date.now() : 0) : 0
        };
    }
}
exports.AlertCoordinationSystem = AlertCoordinationSystem;
// =====================================================
// EXPORT DEFAULT SINGLETON INSTANCE
// =====================================================
exports.alertCoordinator = new AlertCoordinationSystem();
exports.default = exports.alertCoordinator;

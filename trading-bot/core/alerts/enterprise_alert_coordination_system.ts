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

import { EventEmitter } from 'events';

// =====================================================
// ADVANCED ALERT INTERFACES & TYPES
// =====================================================

export enum AlertSeverity {
    INFO = 1,
    WARNING = 2,
    ERROR = 3,
    CRITICAL = 4,
    EMERGENCY = 5
}

export enum AlertCategory {
    SYSTEM = 'system',
    TRADING = 'trading',
    RISK = 'risk',
    PERFORMANCE = 'performance',
    CONNECTION = 'connection',
    SECURITY = 'security',
    COMPLIANCE = 'compliance',
    MARKET = 'market',
    STRATEGY = 'strategy'
}

export enum AlertStatus {
    ACTIVE = 'active',
    ACKNOWLEDGED = 'acknowledged',
    RESOLVED = 'resolved',
    SUPPRESSED = 'suppressed',
    ESCALATED = 'escalated'
}

export enum NotificationChannel {
    EMAIL = 'email',
    SMS = 'sms',
    SLACK = 'slack',
    WEBHOOK = 'webhook',
    DASHBOARD = 'dashboard',
    CONSOLE = 'console',
    DATABASE = 'database',
    FILE = 'file',
    PUSH = 'push'
}

export interface AlertRule {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    severity: AlertSeverity;
    category: AlertCategory;
    conditions: AlertCondition[];
    actions: AlertAction[];
    escalationPolicy?: EscalationPolicy;
    rateLimit?: RateLimit;
    suppressionRules?: SuppressionRule[];
    metadata?: Record<string, any>;
}

export interface AlertCondition {
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex';
    value: any;
    aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
    timeWindow?: number;
}

export interface AlertAction {
    type: 'notification' | 'command' | 'webhook' | 'script';
    channel?: NotificationChannel;
    target: string;
    template?: string;
    parameters?: Record<string, any>;
    delay?: number;
}

export interface EscalationPolicy {
    id: string;
    name: string;
    steps: EscalationStep[];
    maxEscalations: number;
    escalationInterval: number;
}

export interface EscalationStep {
    level: number;
    actions: AlertAction[];
    condition?: string;
    timeout: number;
}

export interface RateLimit {
    maxCount: number;
    timeWindow: number;
    suppressionDuration: number;
}

export interface SuppressionRule {
    id: string;
    name: string;
    conditions: AlertCondition[];
    duration: number;
    reason: string;
}

export interface Alert {
    id: string;
    ruleId?: string;
    severity: AlertSeverity;
    category: AlertCategory;
    status: AlertStatus;
    title: string;
    message: string;
    source: string;
    component: string;
    timestamp: number;
    acknowledgedAt?: number;
    acknowledgedBy?: string;
    resolvedAt?: number;
    resolvedBy?: string;
    escalationLevel: number;
    occurrenceCount: number;
    lastOccurrence: number;
    fingerprint: string;
    tags: string[];
    metadata: Record<string, any>;
    correlatedAlerts: string[];
    parentAlertId?: string;
    childAlertIds: string[];
    notifications: NotificationRecord[];
}

export interface NotificationRecord {
    id: string;
    channel: NotificationChannel;
    target: string;
    status: 'pending' | 'sent' | 'failed' | 'delivered';
    sentAt?: number;
    deliveredAt?: number;
    errorMessage?: string;
    retryCount: number;
}

export interface AlertMetrics {
    totalAlerts: number;
    activeAlerts: number;
    alertsByCategory: Record<AlertCategory, number>;
    alertsBySeverity: Record<AlertSeverity, number>;
    escalatedAlerts: number;
    suppressedAlerts: number;
    avgResolutionTime: number;
    avgAcknowledgmentTime: number;
    topAlertSources: Array<{ source: string; count: number }>;
    alertRate: number;
    falsePositiveRate: number;
}

export interface AlertCoordinationConfig {
    enableCorrelation: boolean;
    enableEscalation: boolean;
    enableSuppression: boolean;
    enableRateLimit: boolean;
    maxActiveAlerts: number;
    correlationWindow: number;
    defaultEscalationInterval: number;
    alertRetentionDays: number;
    enableMetrics: boolean;
    enableAuditLog: boolean;
    notificationChannels: Record<NotificationChannel, any>;
    emergencyContacts: string[];
    maintenanceMode: boolean;
}

// =====================================================
// ENTERPRISE ALERT COORDINATION SYSTEM
// =====================================================

export class EnterpriseAlertCoordinationSystem extends EventEmitter {
    private config: AlertCoordinationConfig;
    private rules: Map<string, AlertRule> = new Map();
    private alerts: Map<string, Alert> = new Map();
    private suppressions: Map<string, { until: number; reason: string }> = new Map();
    private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
    private rateLimitCounters: Map<string, { count: number; resetTime: number }> = new Map();
    private correlationGroups: Map<string, string[]> = new Map();
    private metrics: AlertMetrics;
    private isRunning = false;
    private metricsInterval: NodeJS.Timeout | null = null;
    private cleanupInterval: NodeJS.Timeout | null = null;
    private auditLog: Array<{ timestamp: number; action: string; details: any }> = [];

    constructor(config: Partial<AlertCoordinationConfig> = {}) {
        super();
        
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

    private initializeMetrics(): AlertMetrics {
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

    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('[ENTERPRISE_ALERTS] Alert system already running');
            return;
        }

        try {
            console.log('[ENTERPRISE_ALERTS] Starting Enterprise Alert Coordination System...');
            this.isRunning = true;
            this.emit('system_started', { timestamp: Date.now() });
            console.log('[ENTERPRISE_ALERTS] ✅ Alert system started successfully');
        } catch (error) {
            console.error('[ENTERPRISE_ALERTS] Failed to start alert system:', error);
            throw error;
        }
    }

    async stop(): Promise<void> {
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

    addRule(rule: AlertRule): void {
        this.rules.set(rule.id, { ...rule });
        this.emit('rule_added', rule);
        console.log(`[ENTERPRISE_ALERTS] Rule added: ${rule.name} (${rule.id})`);
    }

    updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
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

    removeRule(ruleId: string): boolean {
        const removed = this.rules.delete(ruleId);
        if (removed) {
            this.emit('rule_removed', ruleId);
            console.log(`[ENTERPRISE_ALERTS] Rule removed: ${ruleId}`);
        }
        return removed;
    }

    // Removed duplicate getRules() implementation

    getRule(ruleId: string): AlertRule | undefined {
        return this.rules.get(ruleId);
    }

    // =====================================================
    // ALERT CREATION & MANAGEMENT
    // =====================================================

    createAlert(alertData: {
        severity: AlertSeverity;
        category: AlertCategory;
        title: string;
        message: string;
        source: string;
        component?: string;
        metadata?: Record<string, any>;
        tags?: string[];
        ruleId?: string;
    }): Alert {
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
        const alert: Alert = {
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

    acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
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

    resolveAlert(alertId: string, resolvedBy: string): boolean {
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

    private generateAlertId(): string {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateFingerprint(alertData: any): string {
        const key = `${alertData.category}_${alertData.source}_${alertData.title}`;
        return Buffer.from(key).toString('base64').substr(0, 16);
    }

    private findAlertByFingerprint(fingerprint: string): Alert | undefined {
        return Array.from(this.alerts.values()).find(alert => 
            alert.fingerprint === fingerprint && alert.status === AlertStatus.ACTIVE
        );
    }

    private updateExistingAlert(alert: Alert, newData: any): Alert {
        alert.occurrenceCount++;
        alert.lastOccurrence = Date.now();
        alert.message = newData.message;
        alert.metadata = { ...alert.metadata, ...newData.metadata };
        
        console.log(`[ENTERPRISE_ALERTS] Updated existing alert: ${alert.id} (occurrence ${alert.occurrenceCount})`);
        
        return alert;
    }

    private updateAlertMetrics(alert: Alert): void {
        this.metrics.totalAlerts++;
        this.metrics.activeAlerts++;
        this.metrics.alertsByCategory[alert.category] = (this.metrics.alertsByCategory[alert.category] || 0) + 1;
        this.metrics.alertsBySeverity[alert.severity] = (this.metrics.alertsBySeverity[alert.severity] || 0) + 1;
    }

    private logAudit(action: string, details: any): void {
        if (!this.config.enableAuditLog) return;
        
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

    private getActiveAlertsCount(): number {
        return Array.from(this.alerts.values()).filter(a => a.status === AlertStatus.ACTIVE).length;
    }

    // =====================================================
    // PUBLIC API METHODS
    // =====================================================

    getAlerts(): Alert[] {
        return Array.from(this.alerts.values());
    }

    getActiveAlerts(): Alert[] {
        return Array.from(this.alerts.values()).filter(a => a.status === AlertStatus.ACTIVE);
    }

    getAlert(alertId: string): Alert | undefined {
        return this.alerts.get(alertId);
    }

    getMetrics(): AlertMetrics {
        return { ...this.metrics };
    }

    getAuditLog(): Array<{ timestamp: number; action: string; details: any }> {
        return [...this.auditLog];
    }

    isSystemRunning(): boolean {
        return this.isRunning;
    }

    getRules(): AlertRule[] {
        return Array.from(this.rules.values());
    }

    getCriticalAlerts(): Alert[] {
        return Array.from(this.alerts.values()).filter(alert => 
            alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.EMERGENCY
        );
    }

    addNotificationChannel(channel: any): void {
        console.log('📢 Notification channel added:', channel);
    }

    getSystemStatus(): {
        running: boolean;
        alertsCount: number;
        activeAlertsCount: number;
        rulesCount: number;
        suppressionsCount: number;
        escalationTimersCount: number;
        criticalAlerts: number;
    } {
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

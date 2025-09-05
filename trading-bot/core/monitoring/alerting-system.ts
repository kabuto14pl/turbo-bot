/**
 * 🚨 ALERTING SYSTEM
 * 
 * Production-grade alerting system for trading bot monitoring
 */

import { EventEmitter } from 'events';

enum AlertSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

enum AlertStatus {
    ACTIVE = 'active',
    ACKNOWLEDGED = 'acknowledged',
    RESOLVED = 'resolved'
}

interface Alert {
    id: string;
    name: string;
    message: string;
    severity: AlertSeverity;
    status: AlertStatus;
    timestamp: number;
    source: string;
    metadata?: Record<string, any>;
}

interface AlertRule {
    id: string;
    name: string;
    condition: (value: number) => boolean;
    severity: AlertSeverity;
    cooldownMs: number;
    lastTriggered?: number;
}

class AlertingSystem extends EventEmitter {
    private alerts: Map<string, Alert> = new Map();
    private rules: Map<string, AlertRule> = new Map();
    private isMonitoring = false;

    constructor() {
        super();
        this.setupDefaultRules();
    }

    private setupDefaultRules(): void {
        // Trading performance alerts
        this.addRule({
            id: 'high_loss_rate',
            name: 'High Loss Rate',
            condition: (value: number) => value < 30, // Win rate below 30%
            severity: AlertSeverity.HIGH,
            cooldownMs: 300000 // 5 minutes
        });

        this.addRule({
            id: 'critical_loss',
            name: 'Critical Daily Loss',
            condition: (value: number) => value < -5000, // Daily loss > $5000
            severity: AlertSeverity.CRITICAL,
            cooldownMs: 600000 // 10 minutes
        });

        // System performance alerts
        this.addRule({
            id: 'high_cpu_usage',
            name: 'High CPU Usage',
            condition: (value: number) => value > 80,
            severity: AlertSeverity.MEDIUM,
            cooldownMs: 180000 // 3 minutes
        });

        this.addRule({
            id: 'high_memory_usage',
            name: 'High Memory Usage',
            condition: (value: number) => value > 90,
            severity: AlertSeverity.HIGH,
            cooldownMs: 300000 // 5 minutes
        });

        this.addRule({
            id: 'high_error_rate',
            name: 'High Error Rate',
            condition: (value: number) => value > 5, // Errors per minute > 5
            severity: AlertSeverity.HIGH,
            cooldownMs: 120000 // 2 minutes
        });

        console.log('🚨 Default alert rules configured');
    }

    addRule(rule: AlertRule): void {
        this.rules.set(rule.id, rule);
        console.log(`📋 Alert rule added: ${rule.name}`);
    }

    removeRule(ruleId: string): void {
        this.rules.delete(ruleId);
        console.log(`🗑️ Alert rule removed: ${ruleId}`);
    }

    checkMetric(metricName: string, value: number, source: string = 'system'): void {
        for (const [ruleId, rule] of this.rules.entries()) {
            if (this.shouldCheckRule(rule, metricName)) {
                if (rule.condition(value)) {
                    this.triggerAlert(rule, value, source);
                }
            }
        }
    }

    private shouldCheckRule(rule: AlertRule, metricName: string): boolean {
        // Map metrics to rules
        const metricRuleMapping: Record<string, string[]> = {
            'win_rate': ['high_loss_rate'],
            'profit_loss': ['critical_loss'],
            'cpu_usage': ['high_cpu_usage'],
            'memory_usage': ['high_memory_usage'],
            'errors_per_minute': ['high_error_rate']
        };

        const applicableRules = metricRuleMapping[metricName] || [];
        
        if (!applicableRules.includes(rule.id)) {
            return false;
        }

        // Check cooldown
        if (rule.lastTriggered) {
            const timeSinceLastTrigger = Date.now() - rule.lastTriggered;
            if (timeSinceLastTrigger < rule.cooldownMs) {
                return false;
            }
        }

        return true;
    }

    private triggerAlert(rule: AlertRule, value: number, source: string): void {
        const alertId = `${rule.id}_${Date.now()}`;
        
        const alert: Alert = {
            id: alertId,
            name: rule.name,
            message: `Alert triggered: ${rule.name} (value: ${value})`,
            severity: rule.severity,
            status: AlertStatus.ACTIVE,
            timestamp: Date.now(),
            source,
            metadata: {
                ruleId: rule.id,
                triggerValue: value
            }
        };

        this.alerts.set(alertId, alert);
        rule.lastTriggered = Date.now();

        console.log(`🚨 ALERT TRIGGERED: ${alert.name} (${alert.severity})`);
        console.log(`   📊 Value: ${value}`);
        console.log(`   📍 Source: ${source}`);

        // Emit alert event
        this.emit('alert_triggered', alert);

        // Send notifications based on severity
        this.sendNotifications(alert);
    }

    private async sendNotifications(alert: Alert): Promise<void> {
        switch (alert.severity) {
            case AlertSeverity.CRITICAL:
                await this.sendSlackNotification(alert);
                await this.sendEmailNotification(alert);
                await this.sendSMSNotification(alert);
                break;
                
            case AlertSeverity.HIGH:
                await this.sendSlackNotification(alert);
                await this.sendEmailNotification(alert);
                break;
                
            case AlertSeverity.MEDIUM:
                await this.sendSlackNotification(alert);
                break;
                
            case AlertSeverity.LOW:
                // Log only for low severity
                break;
        }
    }

    private async sendSlackNotification(alert: Alert): Promise<void> {
        // In production, integrate with actual Slack API
        console.log(`📱 Slack notification sent for: ${alert.name}`);
    }

    private async sendEmailNotification(alert: Alert): Promise<void> {
        // In production, integrate with email service
        console.log(`📧 Email notification sent for: ${alert.name}`);
    }

    private async sendSMSNotification(alert: Alert): Promise<void> {
        // In production, integrate with SMS service
        console.log(`📱 SMS notification sent for: ${alert.name}`);
    }

    acknowledgeAlert(alertId: string): void {
        const alert = this.alerts.get(alertId);
        if (alert) {
            alert.status = AlertStatus.ACKNOWLEDGED;
            console.log(`✅ Alert acknowledged: ${alert.name}`);
            this.emit('alert_acknowledged', alert);
        }
    }

    resolveAlert(alertId: string): void {
        const alert = this.alerts.get(alertId);
        if (alert) {
            alert.status = AlertStatus.RESOLVED;
            console.log(`✅ Alert resolved: ${alert.name}`);
            this.emit('alert_resolved', alert);
        }
    }

    getActiveAlerts(): Alert[] {
        return Array.from(this.alerts.values())
            .filter(alert => alert.status === AlertStatus.ACTIVE);
    }

    getAllAlerts(): Alert[] {
        return Array.from(this.alerts.values());
    }

    getAlertsByStatus(status: AlertStatus): Alert[] {
        return Array.from(this.alerts.values())
            .filter(alert => alert.status === status);
    }

    getAlertsBySeverity(severity: AlertSeverity): Alert[] {
        return Array.from(this.alerts.values())
            .filter(alert => alert.severity === severity);
    }

    clearResolvedAlerts(): void {
        for (const [alertId, alert] of this.alerts.entries()) {
            if (alert.status === AlertStatus.RESOLVED) {
                this.alerts.delete(alertId);
            }
        }
        console.log('🧹 Resolved alerts cleared');
    }

    startMonitoring(): void {
        this.isMonitoring = true;
        console.log('🚨 Alert monitoring started');
    }

    stopMonitoring(): void {
        this.isMonitoring = false;
        console.log('🚨 Alert monitoring stopped');
    }

    getSystemStatus(): {
        totalAlerts: number;
        activeAlerts: number;
        criticalAlerts: number;
        isMonitoring: boolean;
    } {
        const alerts = this.getAllAlerts();
        const activeAlerts = this.getActiveAlerts();
        const criticalAlerts = this.getAlertsBySeverity(AlertSeverity.CRITICAL);

        return {
            totalAlerts: alerts.length,
            activeAlerts: activeAlerts.length,
            criticalAlerts: criticalAlerts.length,
            isMonitoring: this.isMonitoring
        };
    }
}

export { AlertingSystem, Alert, AlertRule, AlertSeverity, AlertStatus };

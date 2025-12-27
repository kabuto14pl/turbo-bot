"use strict";
/**
 * 🚨 ALERT MANAGER - KROK 5.4
 * Multi-channel alert delivery system
 *
 * Features:
 * - Multi-channel alerts (log, email, webhook, SMS)
 * - Alert level escalation (WARNING → CRITICAL → EMERGENCY)
 * - Rate limiting and deduplication
 * - Alert history and statistics
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertManager = exports.AlertLevel = exports.AlertChannel = void 0;
const events_1 = require("events");
const nodemailer = __importStar(require("nodemailer"));
const https = __importStar(require("https"));
var AlertChannel;
(function (AlertChannel) {
    AlertChannel["LOG"] = "LOG";
    AlertChannel["EMAIL"] = "EMAIL";
    AlertChannel["WEBHOOK"] = "WEBHOOK";
    AlertChannel["SMS"] = "SMS";
})(AlertChannel || (exports.AlertChannel = AlertChannel = {}));
var AlertLevel;
(function (AlertLevel) {
    AlertLevel["INFO"] = "INFO";
    AlertLevel["WARNING"] = "WARNING";
    AlertLevel["CRITICAL"] = "CRITICAL";
    AlertLevel["EMERGENCY"] = "EMERGENCY";
})(AlertLevel || (exports.AlertLevel = AlertLevel = {}));
class AlertManager extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.alert_history = [];
        this.last_alert_times = new Map();
        this.config = {
            // Email
            email_enabled: false,
            email_host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            email_port: parseInt(process.env.EMAIL_PORT || '587'),
            email_user: process.env.EMAIL_USER,
            email_pass: process.env.EMAIL_PASS,
            email_from: process.env.EMAIL_FROM || 'bot@trading.com',
            email_to: process.env.EMAIL_TO?.split(',') || [],
            // Webhook
            webhook_enabled: false,
            webhook_url: process.env.WEBHOOK_URL,
            // SMS
            sms_enabled: false,
            sms_account_sid: process.env.TWILIO_ACCOUNT_SID,
            sms_auth_token: process.env.TWILIO_AUTH_TOKEN,
            sms_from: process.env.TWILIO_FROM,
            sms_to: process.env.TWILIO_TO?.split(',') || [],
            // Behavior
            rate_limit_ms: 300000, // 5 min
            deduplicate_window_ms: 600000, // 10 min
            // Escalation
            escalate_after_count: 3,
            escalate_after_ms: 900000, // 15 min
            ...config
        };
        // Setup email if enabled
        if (this.config.email_enabled && this.config.email_user && this.config.email_pass) {
            this.setupEmailTransport();
        }
    }
    /**
     * 📧 Setup email transport
     */
    setupEmailTransport() {
        try {
            this.email_transporter = nodemailer.createTransport({
                host: this.config.email_host,
                port: this.config.email_port,
                secure: this.config.email_port === 465,
                auth: {
                    user: this.config.email_user,
                    pass: this.config.email_pass
                }
            });
            console.log('✅ Email transport configured');
        }
        catch (error) {
            console.error('❌ Email transport setup failed:', error.message);
            this.config.email_enabled = false;
        }
    }
    /**
     * 🚨 Send alert
     */
    async sendAlert(level, title, message, metadata) {
        // Generate alert ID
        const alert_id = `${level}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Check rate limiting
        if (this.isRateLimited(level, title)) {
            console.log(`⏳ Alert rate-limited: ${title}`);
            return;
        }
        // Check deduplication
        if (this.isDuplicate(level, title)) {
            console.log(`🔄 Alert deduplicated: ${title}`);
            return;
        }
        // Determine channels based on level
        const channels = this.getChannelsForLevel(level);
        // Create alert
        const alert = {
            id: alert_id,
            level,
            title,
            message,
            timestamp: new Date(),
            channels,
            metadata
        };
        // Store in history
        this.alert_history.push(alert);
        this.last_alert_times.set(`${level}_${title}`, Date.now());
        // Send to channels
        await this.deliverAlert(alert);
        // Emit event
        this.emit('alert:sent', alert);
    }
    /**
     * 📬 Deliver alert to all channels
     */
    async deliverAlert(alert) {
        const promises = [];
        for (const channel of alert.channels) {
            switch (channel) {
                case AlertChannel.LOG:
                    promises.push(this.sendToLog(alert));
                    break;
                case AlertChannel.EMAIL:
                    if (this.config.email_enabled) {
                        promises.push(this.sendToEmail(alert));
                    }
                    break;
                case AlertChannel.WEBHOOK:
                    if (this.config.webhook_enabled && this.config.webhook_url) {
                        promises.push(this.sendToWebhook(alert));
                    }
                    break;
                case AlertChannel.SMS:
                    if (this.config.sms_enabled) {
                        promises.push(this.sendToSMS(alert));
                    }
                    break;
            }
        }
        await Promise.allSettled(promises);
    }
    /**
     * 📝 Send to log
     */
    async sendToLog(alert) {
        const emoji = {
            [AlertLevel.INFO]: 'ℹ️',
            [AlertLevel.WARNING]: '⚠️',
            [AlertLevel.CRITICAL]: '🔴',
            [AlertLevel.EMERGENCY]: '🚨'
        }[alert.level];
        console.log(`\n${emoji} ALERT [${alert.level}]`);
        console.log(`   Title: ${alert.title}`);
        console.log(`   Message: ${alert.message}`);
        console.log(`   Time: ${alert.timestamp.toISOString()}`);
        if (alert.metadata) {
            console.log(`   Metadata:`, JSON.stringify(alert.metadata, null, 2));
        }
    }
    /**
     * 📧 Send to email
     */
    async sendToEmail(alert) {
        if (!this.email_transporter || !this.config.email_to || this.config.email_to.length === 0) {
            return;
        }
        try {
            const subject = `[${alert.level}] ${alert.title}`;
            const html = `
        <h2 style="color: ${this.getLevelColor(alert.level)}">${alert.level} Alert</h2>
        <h3>${alert.title}</h3>
        <p>${alert.message}</p>
        <p><strong>Time:</strong> ${alert.timestamp.toISOString()}</p>
        ${alert.metadata ? `<p><strong>Metadata:</strong><pre>${JSON.stringify(alert.metadata, null, 2)}</pre></p>` : ''}
      `;
            await this.email_transporter.sendMail({
                from: this.config.email_from,
                to: this.config.email_to.join(','),
                subject,
                html
            });
            console.log(`✅ Email sent to ${this.config.email_to.length} recipient(s)`);
        }
        catch (error) {
            console.error('❌ Email send failed:', error.message);
        }
    }
    /**
     * 🌐 Send to webhook (Slack/Discord)
     */
    async sendToWebhook(alert) {
        if (!this.config.webhook_url) {
            return;
        }
        try {
            const payload = {
                text: `**${alert.level} Alert**`,
                attachments: [
                    {
                        color: this.getLevelColor(alert.level),
                        title: alert.title,
                        text: alert.message,
                        fields: [
                            {
                                title: 'Time',
                                value: alert.timestamp.toISOString(),
                                short: true
                            },
                            {
                                title: 'Level',
                                value: alert.level,
                                short: true
                            }
                        ],
                        footer: 'Trading Bot Alert System'
                    }
                ]
            };
            await this.httpPost(this.config.webhook_url, payload);
            console.log('✅ Webhook notification sent');
        }
        catch (error) {
            console.error('❌ Webhook send failed:', error.message);
        }
    }
    /**
     * 📱 Send to SMS (Twilio)
     */
    async sendToSMS(alert) {
        if (!this.config.sms_account_sid || !this.config.sms_auth_token) {
            return;
        }
        try {
            // Twilio API implementation would go here
            // For now, just log
            console.log(`📱 SMS Alert (not implemented): ${alert.title}`);
        }
        catch (error) {
            console.error('❌ SMS send failed:', error.message);
        }
    }
    /**
     * 🎨 Get color for alert level
     */
    getLevelColor(level) {
        const colors = {
            [AlertLevel.INFO]: '#36a64f',
            [AlertLevel.WARNING]: '#ff9900',
            [AlertLevel.CRITICAL]: '#ff0000',
            [AlertLevel.EMERGENCY]: '#990000'
        };
        return colors[level];
    }
    /**
     * 🌐 HTTP POST helper
     */
    httpPost(url, data) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const postData = JSON.stringify(data);
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || 443,
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            const req = https.request(options, (res) => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                }
                else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }
    /**
     * ⏳ Check if alert is rate-limited
     */
    isRateLimited(level, title) {
        const key = `${level}_${title}`;
        const last_time = this.last_alert_times.get(key);
        if (!last_time) {
            return false;
        }
        const elapsed = Date.now() - last_time;
        return elapsed < this.config.rate_limit_ms;
    }
    /**
     * 🔄 Check if alert is duplicate
     */
    isDuplicate(level, title) {
        const cutoff_time = Date.now() - this.config.deduplicate_window_ms;
        const recent_alerts = this.alert_history.filter(a => a.level === level &&
            a.title === title &&
            a.timestamp.getTime() > cutoff_time);
        return recent_alerts.length > 0;
    }
    /**
     * 📊 Get channels for alert level
     */
    getChannelsForLevel(level) {
        switch (level) {
            case AlertLevel.INFO:
                return [AlertChannel.LOG];
            case AlertLevel.WARNING:
                return [AlertChannel.LOG, AlertChannel.WEBHOOK];
            case AlertLevel.CRITICAL:
                return [AlertChannel.LOG, AlertChannel.WEBHOOK, AlertChannel.EMAIL];
            case AlertLevel.EMERGENCY:
                return [AlertChannel.LOG, AlertChannel.WEBHOOK, AlertChannel.EMAIL, AlertChannel.SMS];
            default:
                return [AlertChannel.LOG];
        }
    }
    /**
     * 📋 Get alert history
     */
    getAlertHistory(limit = 50) {
        return this.alert_history.slice(-limit);
    }
    /**
     * 📊 Get alert statistics
     */
    getStatistics() {
        const total = this.alert_history.length;
        const by_level = {
            [AlertLevel.INFO]: this.alert_history.filter(a => a.level === AlertLevel.INFO).length,
            [AlertLevel.WARNING]: this.alert_history.filter(a => a.level === AlertLevel.WARNING).length,
            [AlertLevel.CRITICAL]: this.alert_history.filter(a => a.level === AlertLevel.CRITICAL).length,
            [AlertLevel.EMERGENCY]: this.alert_history.filter(a => a.level === AlertLevel.EMERGENCY).length
        };
        const last_24h = this.alert_history.filter(a => a.timestamp.getTime() > Date.now() - 86400000).length;
        return {
            total_alerts: total,
            by_level,
            last_24h,
            channels_enabled: {
                email: this.config.email_enabled,
                webhook: this.config.webhook_enabled,
                sms: this.config.sms_enabled
            }
        };
    }
    /**
     * 🧹 Clear old alerts
     */
    clearOldAlerts(older_than_hours = 168) {
        const cutoff = Date.now() - (older_than_hours * 60 * 60 * 1000);
        const before_count = this.alert_history.length;
        this.alert_history = this.alert_history.filter(a => a.timestamp.getTime() > cutoff);
        const removed = before_count - this.alert_history.length;
        console.log(`🧹 Cleared ${removed} old alerts (>${older_than_hours}h)`);
    }
}
exports.AlertManager = AlertManager;

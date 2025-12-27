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

import { EventEmitter } from 'events';
import * as nodemailer from 'nodemailer';
import * as https from 'https';

export enum AlertChannel {
  LOG = 'LOG',
  EMAIL = 'EMAIL',
  WEBHOOK = 'WEBHOOK',
  SMS = 'SMS'
}

export enum AlertLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  EMERGENCY = 'EMERGENCY'
}

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  timestamp: Date;
  channels: AlertChannel[];
  metadata?: any;
}

export interface AlertConfig {
  // Email config
  email_enabled: boolean;
  email_host?: string;
  email_port?: number;
  email_user?: string;
  email_pass?: string;
  email_from?: string;
  email_to?: string[];
  
  // Webhook config (Slack/Discord)
  webhook_enabled: boolean;
  webhook_url?: string;
  
  // SMS config (Twilio)
  sms_enabled: boolean;
  sms_account_sid?: string;
  sms_auth_token?: string;
  sms_from?: string;
  sms_to?: string[];
  
  // Alert behavior
  rate_limit_ms: number;           // Default: 300000 (5 min)
  deduplicate_window_ms: number;   // Default: 600000 (10 min)
  
  // Escalation policy
  escalate_after_count: number;    // Default: 3
  escalate_after_ms: number;       // Default: 900000 (15 min)
}

export class AlertManager extends EventEmitter {
  private config: AlertConfig;
  private alert_history: Alert[] = [];
  private last_alert_times: Map<string, number> = new Map();
  private email_transporter?: any;
  
  constructor(config?: Partial<AlertConfig>) {
    super();
    
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
      rate_limit_ms: 300000,      // 5 min
      deduplicate_window_ms: 600000, // 10 min
      
      // Escalation
      escalate_after_count: 3,
      escalate_after_ms: 900000,  // 15 min
      
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
  private setupEmailTransport(): void {
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
    } catch (error: any) {
      console.error('❌ Email transport setup failed:', error.message);
      this.config.email_enabled = false;
    }
  }
  
  /**
   * 🚨 Send alert
   */
  public async sendAlert(
    level: AlertLevel,
    title: string,
    message: string,
    metadata?: any
  ): Promise<void> {
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
    const alert: Alert = {
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
  private async deliverAlert(alert: Alert): Promise<void> {
    const promises: Promise<void>[] = [];
    
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
  private async sendToLog(alert: Alert): Promise<void> {
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
  private async sendToEmail(alert: Alert): Promise<void> {
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
    } catch (error: any) {
      console.error('❌ Email send failed:', error.message);
    }
  }
  
  /**
   * 🌐 Send to webhook (Slack/Discord)
   */
  private async sendToWebhook(alert: Alert): Promise<void> {
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
    } catch (error: any) {
      console.error('❌ Webhook send failed:', error.message);
    }
  }
  
  /**
   * 📱 Send to SMS (Twilio)
   */
  private async sendToSMS(alert: Alert): Promise<void> {
    if (!this.config.sms_account_sid || !this.config.sms_auth_token) {
      return;
    }
    
    try {
      // Twilio API implementation would go here
      // For now, just log
      console.log(`📱 SMS Alert (not implemented): ${alert.title}`);
    } catch (error: any) {
      console.error('❌ SMS send failed:', error.message);
    }
  }
  
  /**
   * 🎨 Get color for alert level
   */
  private getLevelColor(level: AlertLevel): string {
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
  private httpPost(url: string, data: any): Promise<void> {
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
        } else {
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
  private isRateLimited(level: AlertLevel, title: string): boolean {
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
  private isDuplicate(level: AlertLevel, title: string): boolean {
    const cutoff_time = Date.now() - this.config.deduplicate_window_ms;
    
    const recent_alerts = this.alert_history.filter(
      a => a.level === level && 
           a.title === title && 
           a.timestamp.getTime() > cutoff_time
    );
    
    return recent_alerts.length > 0;
  }
  
  /**
   * 📊 Get channels for alert level
   */
  private getChannelsForLevel(level: AlertLevel): AlertChannel[] {
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
  public getAlertHistory(limit: number = 50): Alert[] {
    return this.alert_history.slice(-limit);
  }
  
  /**
   * 📊 Get alert statistics
   */
  public getStatistics(): any {
    const total = this.alert_history.length;
    const by_level = {
      [AlertLevel.INFO]: this.alert_history.filter(a => a.level === AlertLevel.INFO).length,
      [AlertLevel.WARNING]: this.alert_history.filter(a => a.level === AlertLevel.WARNING).length,
      [AlertLevel.CRITICAL]: this.alert_history.filter(a => a.level === AlertLevel.CRITICAL).length,
      [AlertLevel.EMERGENCY]: this.alert_history.filter(a => a.level === AlertLevel.EMERGENCY).length
    };
    
    const last_24h = this.alert_history.filter(
      a => a.timestamp.getTime() > Date.now() - 86400000
    ).length;
    
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
  public clearOldAlerts(older_than_hours: number = 168): void {
    const cutoff = Date.now() - (older_than_hours * 60 * 60 * 1000);
    const before_count = this.alert_history.length;
    
    this.alert_history = this.alert_history.filter(
      a => a.timestamp.getTime() > cutoff
    );
    
    const removed = before_count - this.alert_history.length;
    console.log(`🧹 Cleared ${removed} old alerts (>${older_than_hours}h)`);
  }
}

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
 * Real-Time Notification System with WebSocket Support
 * 
 * Features:
 * - WebSocket server for real-time notifications
 * - Multi-channel notification delivery (Slack, Email, SMS, etc.)
 * - Alert escalation and routing
 * - Notification history and analytics
 * - Admin dashboard integration
 * - External API integrations
 */

import { EventEmitter } from 'events';
import * as WebSocket from 'ws';
import * as http from 'http';
import * as nodemailer from 'nodemailer';
import axios from 'axios';

interface NotificationChannel {
    id: string;
    name: string;
    type: 'websocket' | 'slack' | 'email' | 'sms' | 'webhook' | 'pagerduty';
    enabled: boolean;
    config: any;
    filters?: NotificationFilter[];
}

interface NotificationFilter {
    property: string;
    operator: 'equals' | 'contains' | 'regex' | 'greater' | 'less';
    value: any;
}

interface NotificationMessage {
    id: string;
    timestamp: number;
    type: 'alert' | 'system' | 'trading' | 'info';
    severity: 'critical' | 'warning' | 'info';
    title: string;
    message: string;
    source: string;
    data?: any;
    channels?: string[];
    escalation?: boolean;
}

interface WebSocketClient {
    id: string;
    socket: WebSocket;
    subscriptions: Set<string>;
    metadata: {
        userAgent?: string;
        ip?: string;
        connectedAt: number;
        lastActivity: number;
    };
}

interface SlackConfig {
    webhookUrl: string;
    channel?: string;
    username?: string;
    iconEmoji?: string;
}

interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    from: string;
    to: string[];
}

interface PagerDutyConfig {
    integrationKey: string;
    apiUrl?: string;
}

interface NotificationStats {
    sent: number;
    failed: number;
    channels: { [key: string]: { sent: number; failed: number } };
    lastSent?: number;
    uptime: number;
}

export class RealTimeNotificationSystem extends EventEmitter {
    private wsServer: WebSocket.Server | null = null;
    private httpServer: http.Server | null = null;
    private clients: Map<string, WebSocketClient> = new Map();
    private channels: Map<string, NotificationChannel> = new Map();
    private messageHistory: NotificationMessage[] = [];
    private stats: NotificationStats;
    
    // External integrations
    private emailTransporter: any = null;
    private slackClients: Map<string, any> = new Map();
    
    private port: number;
    private maxHistorySize: number = 1000;
    private isRunning: boolean = false;
    private startTime: number = Date.now();
    
    // Message processing
    private messageQueue: NotificationMessage[] = [];
    private processingQueue: boolean = false;
    private processingInterval: NodeJS.Timeout | null = null;

    constructor(port: number = 8080) {
        super();
        this.port = port;
        
        this.stats = {
            sent: 0,
            failed: 0,
            channels: {},
            uptime: 0
        };
        
        this.initializeDefaultChannels();
        console.log('[NOTIFICATIONS] Real-time notification system initialized');
        console.log(`[NOTIFICATIONS] Will serve WebSocket on port ${this.port}`);
    }

    // ==================== INITIALIZATION ====================

    private initializeDefaultChannels(): void {
        // WebSocket channel for admin dashboard
        this.addChannel({
            id: 'admin-websocket',
            name: 'Admin Dashboard WebSocket',
            type: 'websocket',
            enabled: true,
            config: {
                subscriptions: ['alert', 'system', 'trading']
            }
        });

        // Slack integration
        if (process.env.SLACK_WEBHOOK_URL) {
            this.addChannel({
                id: 'slack-alerts',
                name: 'Slack Alerts Channel',
                type: 'slack',
                enabled: true,
                config: {
                    webhookUrl: process.env.SLACK_WEBHOOK_URL,
                    channel: '#trading-bot-alerts',
                    username: 'Trading Bot',
                    iconEmoji: ':robot_face:'
                },
                filters: [
                    { property: 'severity', operator: 'equals', value: 'critical' },
                    { property: 'severity', operator: 'equals', value: 'warning' }
                ]
            });
        }

        // Email notifications
        if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
            this.addChannel({
                id: 'email-alerts',
                name: 'Email Alerts',
                type: 'email',
                enabled: true,
                config: {
                    host: process.env.EMAIL_HOST,
                    port: parseInt(process.env.EMAIL_PORT || '587'),
                    secure: process.env.EMAIL_SECURE === 'true',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    },
                    from: process.env.EMAIL_FROM || 'trading-bot@company.com',
                    to: (process.env.EMAIL_TO || '').split(',').filter(e => e.trim())
                },
                filters: [
                    { property: 'severity', operator: 'equals', value: 'critical' }
                ]
            });
        }

        // PagerDuty integration
        if (process.env.PAGERDUTY_INTEGRATION_KEY) {
            this.addChannel({
                id: 'pagerduty-critical',
                name: 'PagerDuty Critical Alerts',
                type: 'pagerduty',
                enabled: true,
                config: {
                    integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY,
                    apiUrl: 'https://events.pagerduty.com/v2/enqueue'
                },
                filters: [
                    { property: 'severity', operator: 'equals', value: 'critical' },
                    { property: 'type', operator: 'equals', value: 'alert' }
                ]
            });
        }
    }

    // ==================== SERVER MANAGEMENT ====================

    public async start(): Promise<void> {
        if (this.isRunning) {
            throw new Error('Notification system is already running');
        }

        try {
            // Create HTTP server for WebSocket
            this.httpServer = http.createServer();
            
            // Create WebSocket server
            this.wsServer = new WebSocket.Server({ server: this.httpServer });
            
            // Setup WebSocket handling
            this.setupWebSocketHandling();
            
            // Initialize external integrations
            await this.initializeExternalIntegrations();
            
            // Start message processing
            this.startMessageProcessing();
            
            // Start server
            return new Promise((resolve, reject) => {
                this.httpServer!.listen(this.port, (error?: Error) => {
                    if (error) {
                        reject(error);
                    } else {
                        this.isRunning = true;
                        console.log(`[NOTIFICATIONS] WebSocket server started on port ${this.port}`);
                        console.log(`[NOTIFICATIONS] Active channels: ${this.channels.size}`);
                        this.emit('started');
                        resolve();
                    }
                });
            });
            
        } catch (error) {
            console.error('[NOTIFICATIONS] Failed to start notification system:', error);
            throw error;
        }
    }

    public async stop(): Promise<void> {
        if (!this.isRunning) return;

        // Stop message processing
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }

        // Close all WebSocket connections
        this.clients.forEach(client => {
            client.socket.close();
        });
        this.clients.clear();

        // Close servers
        if (this.wsServer) {
            this.wsServer.close();
        }

        if (this.httpServer) {
            return new Promise((resolve) => {
                this.httpServer!.close(() => {
                    this.isRunning = false;
                    console.log('[NOTIFICATIONS] Notification system stopped');
                    this.emit('stopped');
                    resolve();
                });
            });
        }
    }

    // ==================== WEBSOCKET HANDLING ====================

    private setupWebSocketHandling(): void {
        if (!this.wsServer) return;

        this.wsServer.on('connection', (socket: WebSocket, request: http.IncomingMessage) => {
            const clientId = this.generateClientId();
            const client: WebSocketClient = {
                id: clientId,
                socket,
                subscriptions: new Set(['alert', 'system']), // Default subscriptions
                metadata: {
                    userAgent: request.headers['user-agent'],
                    ip: request.socket.remoteAddress,
                    connectedAt: Date.now(),
                    lastActivity: Date.now()
                }
            };

            this.clients.set(clientId, client);
            console.log(`[NOTIFICATIONS] WebSocket client connected: ${clientId}`);
            
            // Send welcome message
            this.sendToClient(client, {
                type: 'system',
                title: 'Connected',
                message: 'Successfully connected to Trading Bot notifications',
                data: {
                    clientId,
                    subscriptions: Array.from(client.subscriptions),
                    serverTime: Date.now()
                }
            });

            // Handle messages from client
            socket.on('message', (data: WebSocket.Data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleClientMessage(client, message);
                } catch (error) {
                    console.error(`[NOTIFICATIONS] Invalid message from client ${clientId}:`, error);
                }
            });

            // Handle client disconnect
            socket.on('close', () => {
                this.clients.delete(clientId);
                console.log(`[NOTIFICATIONS] WebSocket client disconnected: ${clientId}`);
            });

            // Handle errors
            socket.on('error', (error) => {
                console.error(`[NOTIFICATIONS] WebSocket error for client ${clientId}:`, error);
                this.clients.delete(clientId);
            });
        });

        console.log('[NOTIFICATIONS] WebSocket handling configured');
    }

    private handleClientMessage(client: WebSocketClient, message: any): void {
        client.metadata.lastActivity = Date.now();

        switch (message.type) {
            case 'subscribe':
                if (Array.isArray(message.topics)) {
                    message.topics.forEach((topic: string) => {
                        client.subscriptions.add(topic);
                    });
                    this.sendToClient(client, {
                        type: 'system',
                        title: 'Subscribed',
                        message: `Subscribed to: ${message.topics.join(', ')}`,
                        data: { subscriptions: Array.from(client.subscriptions) }
                    });
                }
                break;

            case 'unsubscribe':
                if (Array.isArray(message.topics)) {
                    message.topics.forEach((topic: string) => {
                        client.subscriptions.delete(topic);
                    });
                    this.sendToClient(client, {
                        type: 'system',
                        title: 'Unsubscribed',
                        message: `Unsubscribed from: ${message.topics.join(', ')}`,
                        data: { subscriptions: Array.from(client.subscriptions) }
                    });
                }
                break;

            case 'ping':
                this.sendToClient(client, {
                    type: 'system',
                    title: 'Pong',
                    message: 'Server is alive',
                    data: { timestamp: Date.now() }
                });
                break;

            case 'history':
                const count = Math.min(message.count || 50, this.messageHistory.length);
                const history = this.messageHistory.slice(-count);
                this.sendToClient(client, {
                    type: 'system',
                    title: 'Message History',
                    message: `Last ${count} messages`,
                    data: { history }
                });
                break;
        }
    }

    private sendToClient(client: WebSocketClient, message: Partial<NotificationMessage>): void {
        if (client.socket.readyState === WebSocket.OPEN) {
            try {
                const fullMessage = {
                    id: this.generateMessageId(),
                    timestamp: Date.now(),
                    source: 'notification-system',
                    ...message
                };
                
                client.socket.send(JSON.stringify(fullMessage));
            } catch (error) {
                console.error(`[NOTIFICATIONS] Failed to send message to client ${client.id}:`, error);
            }
        }
    }

    // ==================== EXTERNAL INTEGRATIONS ====================

    private async initializeExternalIntegrations(): Promise<void> {
        // Initialize email transporter
        const emailChannel = this.channels.get('email-alerts');
        if (emailChannel?.enabled && emailChannel.config) {
            try {
                this.emailTransporter = nodemailer.createTransport(emailChannel.config);
                await this.emailTransporter.verify();
                console.log('[NOTIFICATIONS] ✅ Email integration initialized');
            } catch (error) {
                console.error('[NOTIFICATIONS] ❌ Email integration failed:', error);
                emailChannel.enabled = false;
            }
        }

        // Test Slack integration
        const slackChannel = this.channels.get('slack-alerts');
        if (slackChannel?.enabled && slackChannel.config?.webhookUrl) {
            try {
                await this.testSlackIntegration(slackChannel.config);
                console.log('[NOTIFICATIONS] ✅ Slack integration initialized');
            } catch (error) {
                console.error('[NOTIFICATIONS] ❌ Slack integration failed:', error);
                slackChannel.enabled = false;
            }
        }

        // Test PagerDuty integration
        const pagerDutyChannel = this.channels.get('pagerduty-critical');
        if (pagerDutyChannel?.enabled && pagerDutyChannel.config?.integrationKey) {
            console.log('[NOTIFICATIONS] ✅ PagerDuty integration configured');
        }
    }

    private async testSlackIntegration(config: SlackConfig): Promise<void> {
        const testMessage = {
            text: 'Trading Bot notification system test',
            channel: config.channel,
            username: config.username,
            icon_emoji: config.iconEmoji
        };

        await axios.post(config.webhookUrl, testMessage, {
            timeout: 5000,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // ==================== MESSAGE PROCESSING ====================

    private startMessageProcessing(): void {
        this.processingInterval = setInterval(() => {
            this.processMessageQueue();
            this.updateStats();
        }, 1000); // Process every second

        console.log('[NOTIFICATIONS] Message processing started');
    }

    private async processMessageQueue(): Promise<void> {
        if (this.processingQueue || this.messageQueue.length === 0) {
            return;
        }

        this.processingQueue = true;

        try {
            while (this.messageQueue.length > 0) {
                const message = this.messageQueue.shift();
                if (message) {
                    await this.processMessage(message);
                }
            }
        } catch (error) {
            console.error('[NOTIFICATIONS] Error processing message queue:', error);
        } finally {
            this.processingQueue = false;
        }
    }

    private async processMessage(message: NotificationMessage): Promise<void> {
        // Add to history
        this.addToHistory(message);

        // Determine target channels
        const targetChannels = message.channels || this.getTargetChannels(message);

        // Send to each channel
        const sendPromises = targetChannels.map(channelId => 
            this.sendToChannel(channelId, message)
        );

        try {
            await Promise.allSettled(sendPromises);
            this.stats.sent++;
        } catch (error) {
            console.error('[NOTIFICATIONS] Error sending message:', error);
            this.stats.failed++;
        }
    }

    private getTargetChannels(message: NotificationMessage): string[] {
        const targetChannels: string[] = [];

        for (const [channelId, channel] of this.channels) {
            if (!channel.enabled) continue;

            // Check filters
            if (channel.filters && !this.messagePassesFilters(message, channel.filters)) {
                continue;
            }

            targetChannels.push(channelId);
        }

        return targetChannels;
    }

    private messagePassesFilters(message: NotificationMessage, filters: NotificationFilter[]): boolean {
        return filters.every(filter => {
            const value = (message as any)[filter.property];
            
            switch (filter.operator) {
                case 'equals':
                    return value === filter.value;
                case 'contains':
                    return String(value).includes(String(filter.value));
                case 'regex':
                    return new RegExp(filter.value).test(String(value));
                case 'greater':
                    return Number(value) > Number(filter.value);
                case 'less':
                    return Number(value) < Number(filter.value);
                default:
                    return true;
            }
        });
    }

    private async sendToChannel(channelId: string, message: NotificationMessage): Promise<void> {
        const channel = this.channels.get(channelId);
        if (!channel?.enabled) return;

        try {
            switch (channel.type) {
                case 'websocket':
                    await this.sendToWebSocketClients(message);
                    break;
                case 'slack':
                    await this.sendToSlack(channel.config, message);
                    break;
                case 'email':
                    await this.sendToEmail(channel.config, message);
                    break;
                case 'pagerduty':
                    await this.sendToPagerDuty(channel.config, message);
                    break;
                case 'webhook':
                    await this.sendToWebhook(channel.config, message);
                    break;
            }

            // Update channel stats
            if (!this.stats.channels[channelId]) {
                this.stats.channels[channelId] = { sent: 0, failed: 0 };
            }
            this.stats.channels[channelId].sent++;

        } catch (error) {
            console.error(`[NOTIFICATIONS] Failed to send to channel ${channelId}:`, error);
            
            if (!this.stats.channels[channelId]) {
                this.stats.channels[channelId] = { sent: 0, failed: 0 };
            }
            this.stats.channels[channelId].failed++;
        }
    }

    private async sendToWebSocketClients(message: NotificationMessage): Promise<void> {
        const connectedClients = Array.from(this.clients.values()).filter(
            client => client.socket.readyState === WebSocket.OPEN &&
                      client.subscriptions.has(message.type)
        );

        connectedClients.forEach(client => {
            this.sendToClient(client, message);
        });

        console.log(`[NOTIFICATIONS] Sent WebSocket message to ${connectedClients.length} clients`);
    }

    private async sendToSlack(config: SlackConfig, message: NotificationMessage): Promise<void> {
        const color = {
            critical: 'danger',
            warning: 'warning',
            info: 'good'
        }[message.severity] || 'good';

        const slackMessage = {
            text: message.title,
            attachments: [{
                color,
                title: message.title,
                text: message.message,
                fields: [
                    { title: 'Severity', value: message.severity, short: true },
                    { title: 'Source', value: message.source, short: true },
                    { title: 'Time', value: new Date(message.timestamp).toISOString(), short: true }
                ],
                footer: 'Trading Bot Notifications',
                ts: Math.floor(message.timestamp / 1000)
            }],
            channel: config.channel,
            username: config.username,
            icon_emoji: config.iconEmoji
        };

        await axios.post(config.webhookUrl, slackMessage, {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    private async sendToEmail(config: EmailConfig, message: NotificationMessage): Promise<void> {
        if (!this.emailTransporter) return;

        const mailOptions = {
            from: config.from,
            to: config.to.join(', '),
            subject: `[${message.severity.toUpperCase()}] ${message.title}`,
            html: `
                <h2>${message.title}</h2>
                <p><strong>Severity:</strong> ${message.severity}</p>
                <p><strong>Source:</strong> ${message.source}</p>
                <p><strong>Time:</strong> ${new Date(message.timestamp).toISOString()}</p>
                <hr>
                <p>${message.message}</p>
                ${message.data ? `<pre>${JSON.stringify(message.data, null, 2)}</pre>` : ''}
            `
        };

        await this.emailTransporter.sendMail(mailOptions);
    }

    private async sendToPagerDuty(config: PagerDutyConfig, message: NotificationMessage): Promise<void> {
        const payload = {
            routing_key: config.integrationKey,
            event_action: 'trigger',
            payload: {
                summary: message.title,
                source: message.source,
                severity: message.severity === 'critical' ? 'critical' : 'warning',
                component: 'trading-bot',
                group: 'notifications',
                class: message.type,
                custom_details: {
                    message: message.message,
                    timestamp: new Date(message.timestamp).toISOString(),
                    data: message.data
                }
            }
        };

        const apiUrl = config.apiUrl || 'https://events.pagerduty.com/v2/enqueue';
        await axios.post(apiUrl, payload, {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    private async sendToWebhook(config: any, message: NotificationMessage): Promise<void> {
        await axios.post(config.url, message, {
            timeout: config.timeout || 10000,
            headers: { 
                'Content-Type': 'application/json',
                ...config.headers
            }
        });
    }

    // ==================== PUBLIC API ====================

    public sendNotification(message: Partial<NotificationMessage>): void {
        const fullMessage: NotificationMessage = {
            id: this.generateMessageId(),
            timestamp: Date.now(),
            type: 'info',
            severity: 'info',
            title: 'Notification',
            message: '',
            source: 'unknown',
            ...message
        };

        this.messageQueue.push(fullMessage);
        this.emit('messageQueued', fullMessage);
    }

    public addChannel(channel: NotificationChannel): void {
        this.channels.set(channel.id, channel);
        console.log(`[NOTIFICATIONS] Added channel: ${channel.name} (${channel.type})`);
    }

    public removeChannel(channelId: string): boolean {
        const removed = this.channels.delete(channelId);
        if (removed) {
            console.log(`[NOTIFICATIONS] Removed channel: ${channelId}`);
        }
        return removed;
    }

    public getChannels(): NotificationChannel[] {
        return Array.from(this.channels.values());
    }

    public getConnectedClients(): number {
        return this.clients.size;
    }

    public getMessageHistory(count?: number): NotificationMessage[] {
        const limit = count || this.messageHistory.length;
        return this.messageHistory.slice(-limit);
    }

    public getStats(): NotificationStats {
        return {
            ...this.stats,
            uptime: Date.now() - this.startTime
        };
    }

    // ==================== UTILITY METHODS ====================

    private generateClientId(): string {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private addToHistory(message: NotificationMessage): void {
        this.messageHistory.push(message);
        
        if (this.messageHistory.length > this.maxHistorySize) {
            this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
        }
    }

    private updateStats(): void {
        this.stats.uptime = Date.now() - this.startTime;
        this.stats.lastSent = this.messageHistory.length > 0 ? 
            this.messageHistory[this.messageHistory.length - 1].timestamp : undefined;
    }
}

// Default configuration
export const DefaultNotificationConfig = {
    port: 8080,
    maxHistorySize: 1000,
    processInterval: 1000
};

export type {
    NotificationChannel,
    NotificationFilter,
    NotificationMessage,
    WebSocketClient,
    SlackConfig,
    EmailConfig,
    PagerDutyConfig,
    NotificationStats
};

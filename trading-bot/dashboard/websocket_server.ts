/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🌐 DASHBOARD WEBSOCKET SERVER
 * WebSocket server dla real-time komunikacji z dashboardem
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { AdvancedDashboardManager } from './advanced_dashboard_manager';
import { WebSocketMessage, DashboardEvent } from './dashboard_types';
import { Logger } from '../infrastructure/logging/logger';

export interface WebSocketClient {
    id: string;
    ws: WebSocket;
    userId?: string;
    layoutId?: string;
    subscribedFeeds: Set<string>;
    lastActivity: Date;
    ipAddress: string;
    userAgent: string;
}

export class DashboardWebSocketServer {
    private logger: Logger;
    private server!: WebSocketServer;
    private dashboardManager: AdvancedDashboardManager;
    private clients: Map<string, WebSocketClient> = new Map();
    private port: number;
    private heartbeatInterval: NodeJS.Timeout | null = null;

    constructor(port: number = 8080, dashboardManager: AdvancedDashboardManager) {
        this.port = port;
        this.dashboardManager = dashboardManager;
        this.logger = new Logger('DashboardWebSocketServer');
        
        this.initializeServer();
        this.setupEventHandlers();
        this.startHeartbeat();
        
        this.logger.info(`🌐 Dashboard WebSocket Server initialized on port ${port}`);
    }

    /**
     * 🚀 Initialize WebSocket server
     */
    private initializeServer(): void {
        this.server = new WebSocketServer({
            port: this.port,
            perMessageDeflate: {
                threshold: 1024,
                concurrencyLimit: 10
                // Removed memLevel as it's not supported in current version
            }
        });

        this.server.on('connection', this.handleConnection.bind(this));
        this.server.on('error', (error) => {
            this.logger.error('❌ WebSocket server error:', error);
        });

        this.logger.info(`🚀 WebSocket server started on port ${this.port}`);
    }

    /**
     * 🔗 Handle new WebSocket connection
     */
    private handleConnection(ws: WebSocket, request: IncomingMessage): void {
        const clientId = this.generateClientId();
        const ipAddress = request.socket.remoteAddress || 'unknown';
        const userAgent = request.headers['user-agent'] || 'unknown';

        const client: WebSocketClient = {
            id: clientId,
            ws,
            subscribedFeeds: new Set(),
            lastActivity: new Date(),
            ipAddress,
            userAgent
        };

        this.clients.set(clientId, client);
        this.dashboardManager.getDataProvider().addWebSocketClient(ws);

        this.logger.info(`🔗 New WebSocket connection: ${clientId} from ${ipAddress}`);

        // Setup client event handlers
        ws.on('message', (data) => this.handleMessage(clientId, data));
        ws.on('close', () => this.handleDisconnection(clientId));
        ws.on('error', (error) => this.handleError(clientId, error));
        ws.on('pong', () => this.handlePong(clientId));

        // Send welcome message
        this.sendMessage(clientId, {
            id: this.generateMessageId(),
            type: 'PING',
            data: {
                message: 'Welcome to Trading Dashboard',
                clientId,
                serverTime: new Date().toISOString()
            },
            timestamp: new Date()
        });
    }

    /**
     * 💬 Handle incoming message from client
     */
    private handleMessage(clientId: string, data: any): void {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.lastActivity = new Date();

        try {
            const message: WebSocketMessage = JSON.parse(data.toString());
            this.logger.debug(`📨 Message from ${clientId}: ${message.type}`);

            switch (message.type) {
                case 'SUBSCRIBE':
                    this.handleSubscribe(clientId, message);
                    break;
                case 'UNSUBSCRIBE':
                    this.handleUnsubscribe(clientId, message);
                    break;
                case 'PING':
                    this.handlePing(clientId, message);
                    break;
                case 'UPDATE':
                    this.handleUpdate(clientId, message);
                    break;
                default:
                    this.logger.warn(`⚠️ Unknown message type: ${message.type}`);
            }
        } catch (error) {
            this.logger.error(`❌ Error parsing message from ${clientId}:`, error);
            this.sendError(clientId, 'Invalid message format');
        }
    }

    /**
     * 📡 Handle subscription to data feed
     */
    private handleSubscribe(clientId: string, message: WebSocketMessage): void {
        const client = this.clients.get(clientId);
        if (!client || !message.channel) return;

        client.subscribedFeeds.add(message.channel);
        
        // Subscribe to dashboard data provider
        this.dashboardManager.getDataProvider().subscribeWidget(clientId, message.channel);

        this.logger.debug(`📡 Client ${clientId} subscribed to ${message.channel}`);

        // Send confirmation
        this.sendMessage(clientId, {
            id: this.generateMessageId(),
            type: 'UPDATE',
            channel: message.channel,
            data: { status: 'subscribed', channel: message.channel },
            timestamp: new Date()
        });

        // Send current data if available
        this.sendCurrentData(clientId, message.channel);
    }

    /**
     * 📡 Handle unsubscription from data feed
     */
    private handleUnsubscribe(clientId: string, message: WebSocketMessage): void {
        const client = this.clients.get(clientId);
        if (!client || !message.channel) return;

        client.subscribedFeeds.delete(message.channel);
        
        // Unsubscribe from dashboard data provider
        this.dashboardManager.getDataProvider().unsubscribeWidget(clientId, message.channel);

        this.logger.debug(`📡 Client ${clientId} unsubscribed from ${message.channel}`);

        // Send confirmation
        this.sendMessage(clientId, {
            id: this.generateMessageId(),
            type: 'UPDATE',
            channel: message.channel,
            data: { status: 'unsubscribed', channel: message.channel },
            timestamp: new Date()
        });
    }

    /**
     * 🏓 Handle ping message
     */
    private handlePing(clientId: string, message: WebSocketMessage): void {
        this.sendMessage(clientId, {
            id: this.generateMessageId(),
            type: 'PONG',
            data: { 
                timestamp: new Date().toISOString(),
                originalId: message.id 
            },
            timestamp: new Date()
        });
    }

    /**
     * 🔄 Handle update message
     */
    private handleUpdate(clientId: string, message: WebSocketMessage): void {
        // Handle client updates (e.g., widget configuration changes)
        if (message.data && message.data.type === 'widget_config') {
            const { widgetId, config } = message.data;
            this.dashboardManager.updateWidget(widgetId, { config });
            
            this.logger.debug(`🔄 Widget ${widgetId} updated by client ${clientId}`);
        }
    }

    /**
     * 🔗 Handle client disconnection
     */
    private handleDisconnection(clientId: string): void {
        const client = this.clients.get(clientId);
        if (!client) return;

        // Unsubscribe from all feeds
        client.subscribedFeeds.forEach(feedId => {
            this.dashboardManager.getDataProvider().unsubscribeWidget(clientId, feedId);
        });

        // Remove from data provider
        this.dashboardManager.getDataProvider().removeWebSocketClient(client.ws);

        // Remove client
        this.clients.delete(clientId);

        this.logger.info(`🔗 Client disconnected: ${clientId}`);
    }

    /**
     * ❌ Handle client error
     */
    private handleError(clientId: string, error: Error): void {
        this.logger.error(`❌ WebSocket error for client ${clientId}:`, error);
    }

    /**
     * 🏓 Handle pong response
     */
    private handlePong(clientId: string): void {
        const client = this.clients.get(clientId);
        if (client) {
            client.lastActivity = new Date();
        }
    }

    /**
     * 📤 Send message to specific client
     */
    private sendMessage(clientId: string, message: WebSocketMessage): void {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== WebSocket.OPEN) return;

        try {
            client.ws.send(JSON.stringify(message));
        } catch (error) {
            this.logger.error(`❌ Failed to send message to ${clientId}:`, error);
            this.handleDisconnection(clientId);
        }
    }

    /**
     * 📢 Broadcast message to all clients
     */
    public broadcastMessage(message: WebSocketMessage, excludeClientId?: string): void {
        this.clients.forEach((client, clientId) => {
            if (clientId !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
                this.sendMessage(clientId, message);
            }
        });
    }

    /**
     * 📢 Broadcast to clients subscribed to specific channel
     */
    public broadcastToChannel(channel: string, message: WebSocketMessage): void {
        this.clients.forEach((client, clientId) => {
            if (client.subscribedFeeds.has(channel) && client.ws.readyState === WebSocket.OPEN) {
                this.sendMessage(clientId, { ...message, channel });
            }
        });
    }

    /**
     * 📊 Send current data for channel
     */
    private sendCurrentData(clientId: string, channel: string): void {
        // Get current data from dashboard manager
        const dataProvider = this.dashboardManager.getDataProvider();
        
        switch (channel) {
            case 'portfolio_metrics':
                // Send current portfolio metrics
                break;
            case 'market_data':
                const chartData = dataProvider.getChartData('btc_price');
                if (chartData.length > 0) {
                    this.sendMessage(clientId, {
                        id: this.generateMessageId(),
                        type: 'UPDATE',
                        channel,
                        data: chartData.slice(-50), // Last 50 points
                        timestamp: new Date()
                    });
                }
                break;
        }
    }

    /**
     * ❌ Send error message to client
     */
    private sendError(clientId: string, errorMessage: string): void {
        this.sendMessage(clientId, {
            id: this.generateMessageId(),
            type: 'ERROR',
            data: { error: errorMessage },
            timestamp: new Date()
        });
    }

    /**
     * 🎧 Setup event handlers for dashboard events
     */
    private setupEventHandlers(): void {
        // Listen to dashboard updates
        this.dashboardManager.on('dashboardUpdate', (event: DashboardEvent) => {
            this.handleDashboardEvent(event);
        });

        // Listen to data provider updates
        this.dashboardManager.getDataProvider().on('dataUpdate', (event: DashboardEvent) => {
            this.handleDataProviderEvent(event);
        });
    }

    /**
     * 📊 Handle dashboard events
     */
    private handleDashboardEvent(event: DashboardEvent): void {
        const message: WebSocketMessage = {
            id: this.generateMessageId(),
            type: 'UPDATE',
            data: event,
            timestamp: new Date()
        };

        // Broadcast to all connected clients
        this.broadcastMessage(message);
    }

    /**
     * 📡 Handle data provider events
     */
    private handleDataProviderEvent(event: DashboardEvent): void {
        if (event.type === 'DATA_FEED_UPDATE') {
            const { feedId, data } = event as any;
            
            const message: WebSocketMessage = {
                id: this.generateMessageId(),
                type: 'UPDATE',
                channel: feedId,
                data: data,
                timestamp: new Date()
            };

            // Broadcast to clients subscribed to this feed
            this.broadcastToChannel(feedId, message);
        }
    }

    /**
     * 💓 Start heartbeat to keep connections alive
     */
    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            const now = Date.now();
            
            this.clients.forEach((client, clientId) => {
                const timeSinceActivity = now - client.lastActivity.getTime();
                
                if (timeSinceActivity > 60000) { // 1 minute timeout
                    this.logger.warn(`⏰ Client ${clientId} timed out`);
                    this.handleDisconnection(clientId);
                } else if (timeSinceActivity > 30000) { // Send ping after 30 seconds
                    if (client.ws.readyState === WebSocket.OPEN) {
                        client.ws.ping();
                    }
                }
            });
        }, 15000); // Check every 15 seconds
    }

    /**
     * 🔧 Generate unique client ID
     */
    private generateClientId(): string {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 🔧 Generate unique message ID
     */
    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 📊 Get server statistics
     */
    public getStatistics(): {
        connectedClients: number;
        totalMessages: number;
        uptime: number;
        memoryUsage: number;
    } {
        return {
            connectedClients: this.clients.size,
            totalMessages: 0, // Would track in production
            uptime: Date.now(),
            memoryUsage: process.memoryUsage().heapUsed
        };
    }

    /**
     * 👥 Get connected clients info
     */
    public getConnectedClients(): Array<{
        id: string;
        userId?: string;
        layoutId?: string;
        subscribedFeeds: string[];
        lastActivity: Date;
        ipAddress: string;
    }> {
        return Array.from(this.clients.values()).map(client => ({
            id: client.id,
            userId: client.userId,
            layoutId: client.layoutId,
            subscribedFeeds: Array.from(client.subscribedFeeds),
            lastActivity: client.lastActivity,
            ipAddress: client.ipAddress
        }));
    }

    /**
     * 🛑 Stop WebSocket server
     */
    public stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }

            // Close all client connections
            this.clients.forEach((client, clientId) => {
                client.ws.close(1000, 'Server shutting down');
                this.handleDisconnection(clientId);
            });

            // Close server
            this.server.close(() => {
                this.logger.info('🛑 WebSocket server stopped');
                resolve();
            });
        });
    }
}

export default DashboardWebSocketServer;

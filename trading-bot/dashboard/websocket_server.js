"use strict";
/**
 * 🌐 DASHBOARD WEBSOCKET SERVER
 * WebSocket server dla real-time komunikacji z dashboardem
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardWebSocketServer = void 0;
const ws_1 = require("ws");
const logger_1 = require("../infrastructure/logging/logger");
class DashboardWebSocketServer {
    constructor(port = 8080, dashboardManager) {
        this.clients = new Map();
        this.heartbeatInterval = null;
        this.port = port;
        this.dashboardManager = dashboardManager;
        this.logger = new logger_1.Logger('DashboardWebSocketServer');
        this.initializeServer();
        this.setupEventHandlers();
        this.startHeartbeat();
        this.logger.info(`🌐 Dashboard WebSocket Server initialized on port ${port}`);
    }
    /**
     * 🚀 Initialize WebSocket server
     */
    initializeServer() {
        this.server = new ws_1.WebSocketServer({
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
    handleConnection(ws, request) {
        const clientId = this.generateClientId();
        const ipAddress = request.socket.remoteAddress || 'unknown';
        const userAgent = request.headers['user-agent'] || 'unknown';
        const client = {
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
    handleMessage(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client)
            return;
        client.lastActivity = new Date();
        try {
            const message = JSON.parse(data.toString());
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
        }
        catch (error) {
            this.logger.error(`❌ Error parsing message from ${clientId}:`, error);
            this.sendError(clientId, 'Invalid message format');
        }
    }
    /**
     * 📡 Handle subscription to data feed
     */
    handleSubscribe(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || !message.channel)
            return;
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
    handleUnsubscribe(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || !message.channel)
            return;
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
    handlePing(clientId, message) {
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
    handleUpdate(clientId, message) {
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
    handleDisconnection(clientId) {
        const client = this.clients.get(clientId);
        if (!client)
            return;
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
    handleError(clientId, error) {
        this.logger.error(`❌ WebSocket error for client ${clientId}:`, error);
    }
    /**
     * 🏓 Handle pong response
     */
    handlePong(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            client.lastActivity = new Date();
        }
    }
    /**
     * 📤 Send message to specific client
     */
    sendMessage(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== ws_1.WebSocket.OPEN)
            return;
        try {
            client.ws.send(JSON.stringify(message));
        }
        catch (error) {
            this.logger.error(`❌ Failed to send message to ${clientId}:`, error);
            this.handleDisconnection(clientId);
        }
    }
    /**
     * 📢 Broadcast message to all clients
     */
    broadcastMessage(message, excludeClientId) {
        this.clients.forEach((client, clientId) => {
            if (clientId !== excludeClientId && client.ws.readyState === ws_1.WebSocket.OPEN) {
                this.sendMessage(clientId, message);
            }
        });
    }
    /**
     * 📢 Broadcast to clients subscribed to specific channel
     */
    broadcastToChannel(channel, message) {
        this.clients.forEach((client, clientId) => {
            if (client.subscribedFeeds.has(channel) && client.ws.readyState === ws_1.WebSocket.OPEN) {
                this.sendMessage(clientId, { ...message, channel });
            }
        });
    }
    /**
     * 📊 Send current data for channel
     */
    sendCurrentData(clientId, channel) {
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
    sendError(clientId, errorMessage) {
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
    setupEventHandlers() {
        // Listen to dashboard updates
        this.dashboardManager.on('dashboardUpdate', (event) => {
            this.handleDashboardEvent(event);
        });
        // Listen to data provider updates
        this.dashboardManager.getDataProvider().on('dataUpdate', (event) => {
            this.handleDataProviderEvent(event);
        });
    }
    /**
     * 📊 Handle dashboard events
     */
    handleDashboardEvent(event) {
        const message = {
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
    handleDataProviderEvent(event) {
        if (event.type === 'DATA_FEED_UPDATE') {
            const { feedId, data } = event;
            const message = {
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
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            const now = Date.now();
            this.clients.forEach((client, clientId) => {
                const timeSinceActivity = now - client.lastActivity.getTime();
                if (timeSinceActivity > 60000) { // 1 minute timeout
                    this.logger.warn(`⏰ Client ${clientId} timed out`);
                    this.handleDisconnection(clientId);
                }
                else if (timeSinceActivity > 30000) { // Send ping after 30 seconds
                    if (client.ws.readyState === ws_1.WebSocket.OPEN) {
                        client.ws.ping();
                    }
                }
            });
        }, 15000); // Check every 15 seconds
    }
    /**
     * 🔧 Generate unique client ID
     */
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * 🔧 Generate unique message ID
     */
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * 📊 Get server statistics
     */
    getStatistics() {
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
    getConnectedClients() {
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
    stop() {
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
exports.DashboardWebSocketServer = DashboardWebSocketServer;
exports.default = DashboardWebSocketServer;

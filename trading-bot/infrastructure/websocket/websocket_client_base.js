"use strict";
/**
 * 🚀 TIER 2.4: WebSocket Client Base Class
 * Enterprise-grade WebSocket connection management
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Heartbeat/ping-pong monitoring
 * - Connection pooling support
 * - Event-driven architecture
 * - Error recovery mechanisms
 * - Rate limiting protection
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketClientBase = void 0;
const ws_1 = __importDefault(require("ws"));
const events_1 = require("events");
class WebSocketClientBase extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.lastPingTime = 0;
        this.subscribedChannels = new Set();
        this.messageQueue = [];
        this.rateLimitQueue = [];
        this.config = {
            url: config.url,
            apiKey: config.apiKey || '',
            secretKey: config.secretKey || '',
            passphrase: config.passphrase || '',
            reconnectDelay: config.reconnectDelay || 5000,
            maxReconnectAttempts: config.maxReconnectAttempts || 10,
            heartbeatInterval: config.heartbeatInterval || 30000,
            connectionTimeout: config.connectionTimeout || 10000,
            rateLimit: config.rateLimit || 10 // 10 messages per second default
        };
        this.status = {
            connected: false,
            reconnectAttempts: 0,
            messagesReceived: 0,
            messagesSent: 0
        };
    }
    /**
     * Connect to WebSocket server
     */
    async connect() {
        return new Promise((resolve, reject) => {
            console.log(`🌐 [WS] Connecting to ${this.getExchangeName()}...`);
            try {
                this.ws = new ws_1.default(this.config.url);
                // Connection timeout
                this.connectionTimeout = setTimeout(() => {
                    if (!this.status.connected) {
                        console.error(`❌ [WS] Connection timeout for ${this.getExchangeName()}`);
                        this.ws?.terminate();
                        reject(new Error('Connection timeout'));
                    }
                }, this.config.connectionTimeout);
                this.ws.on('open', () => {
                    clearTimeout(this.connectionTimeout);
                    this.status.connected = true;
                    this.status.lastConnected = Date.now();
                    this.status.reconnectAttempts = 0;
                    console.log(`✅ [WS] Connected to ${this.getExchangeName()}`);
                    this.startHeartbeat();
                    this.onConnected();
                    this.emit('connected');
                    resolve();
                });
                this.ws.on('message', (data) => {
                    this.status.messagesReceived++;
                    this.onMessage(data);
                });
                this.ws.on('ping', (data) => {
                    this.ws?.pong(data);
                });
                this.ws.on('pong', () => {
                    const latency = Date.now() - this.lastPingTime;
                    this.status.latency = latency;
                    this.emit('pong', latency);
                });
                this.ws.on('close', (code, reason) => {
                    this.handleDisconnection(code, reason.toString());
                });
                this.ws.on('error', (error) => {
                    console.error(`❌ [WS] ${this.getExchangeName()} error:`, error.message);
                    this.emit('error', error);
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Disconnect from WebSocket
     */
    disconnect() {
        console.log(`🛑 [WS] Disconnecting from ${this.getExchangeName()}...`);
        this.stopHeartbeat();
        clearTimeout(this.reconnectTimer);
        clearTimeout(this.connectionTimeout);
        if (this.ws) {
            this.ws.close(1000, 'Normal closure');
            this.ws = undefined;
        }
        this.status.connected = false;
        this.status.lastDisconnected = Date.now();
        this.emit('disconnected');
    }
    /**
     * Subscribe to market data channel
     */
    async subscribe(channel, symbol) {
        const channelKey = `${channel}:${symbol}`;
        if (this.subscribedChannels.has(channelKey)) {
            console.log(`⚠️ [WS] Already subscribed to ${channelKey}`);
            return;
        }
        const subscribeMessage = this.buildSubscribeMessage(channel, symbol);
        await this.sendMessage(subscribeMessage);
        this.subscribedChannels.add(channelKey);
        console.log(`📊 [WS] Subscribed to ${this.getExchangeName()} ${channelKey}`);
    }
    /**
     * Unsubscribe from market data channel
     */
    async unsubscribe(channel, symbol) {
        const channelKey = `${channel}:${symbol}`;
        if (!this.subscribedChannels.has(channelKey)) {
            return;
        }
        const unsubscribeMessage = this.buildUnsubscribeMessage(channel, symbol);
        await this.sendMessage(unsubscribeMessage);
        this.subscribedChannels.delete(channelKey);
        console.log(`📊 [WS] Unsubscribed from ${this.getExchangeName()} ${channelKey}`);
    }
    /**
     * Send message with rate limiting
     */
    async sendMessage(message) {
        if (!this.ws || !this.status.connected) {
            throw new Error('WebSocket not connected');
        }
        // Rate limiting check
        if (!this.checkRateLimit()) {
            console.warn(`⚠️ [WS] Rate limit exceeded, queuing message`);
            this.messageQueue.push(message);
            return;
        }
        const jsonMessage = JSON.stringify(message);
        this.ws.send(jsonMessage);
        this.status.messagesSent++;
        // Track for rate limiting
        this.rateLimitQueue.push(Date.now());
    }
    /**
     * Check if rate limit allows sending
     */
    checkRateLimit() {
        const now = Date.now();
        const oneSecondAgo = now - 1000;
        // Remove messages older than 1 second
        this.rateLimitQueue = this.rateLimitQueue.filter(time => time > oneSecondAgo);
        return this.rateLimitQueue.length < this.config.rateLimit;
    }
    /**
     * Process queued messages
     */
    processMessageQueue() {
        if (this.messageQueue.length === 0) {
            return;
        }
        const message = this.messageQueue.shift();
        if (message && this.checkRateLimit()) {
            this.sendMessage(message).catch(err => console.error(`❌ [WS] Failed to send queued message:`, err));
        }
        // Continue processing if more messages
        if (this.messageQueue.length > 0) {
            setTimeout(() => this.processMessageQueue(), 100);
        }
    }
    /**
     * Start heartbeat/ping mechanism
     */
    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            if (this.ws && this.status.connected) {
                this.lastPingTime = Date.now();
                this.ws.ping();
                // Send custom ping if exchange requires it
                const pingMessage = this.buildPingMessage();
                if (pingMessage) {
                    this.sendMessage(pingMessage).catch(err => console.error(`❌ [WS] Ping failed:`, err));
                }
            }
        }, this.config.heartbeatInterval);
    }
    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = undefined;
        }
    }
    /**
     * Handle disconnection with auto-reconnect
     */
    handleDisconnection(code, reason) {
        console.log(`🔌 [WS] ${this.getExchangeName()} disconnected: code=${code}, reason=${reason}`);
        this.status.connected = false;
        this.status.lastDisconnected = Date.now();
        this.stopHeartbeat();
        this.emit('disconnected', { code, reason });
        // Auto-reconnect logic
        if (this.status.reconnectAttempts < this.config.maxReconnectAttempts) {
            const delay = this.calculateBackoff(this.status.reconnectAttempts);
            console.log(`🔄 [WS] Reconnecting in ${delay}ms (attempt ${this.status.reconnectAttempts + 1}/${this.config.maxReconnectAttempts})`);
            this.reconnectTimer = setTimeout(() => {
                this.status.reconnectAttempts++;
                this.connect()
                    .then(() => this.resubscribeChannels())
                    .catch(err => console.error(`❌ [WS] Reconnect failed:`, err));
            }, delay);
        }
        else {
            console.error(`❌ [WS] Max reconnection attempts reached for ${this.getExchangeName()}`);
            this.emit('max_reconnects_reached');
        }
    }
    /**
     * Calculate exponential backoff delay
     */
    calculateBackoff(attempt) {
        const baseDelay = this.config.reconnectDelay;
        const maxDelay = 60000; // 1 minute max
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        return delay;
    }
    /**
     * Re-subscribe to all channels after reconnection
     */
    async resubscribeChannels() {
        console.log(`🔄 [WS] Re-subscribing to ${this.subscribedChannels.size} channels...`);
        for (const channelKey of this.subscribedChannels) {
            const [channel, symbol] = channelKey.split(':');
            const subscribeMessage = this.buildSubscribeMessage(channel, symbol);
            await this.sendMessage(subscribeMessage);
        }
    }
    /**
     * Get connection status
     */
    getStatus() {
        return { ...this.status };
    }
    /**
     * Check if connected
     */
    isConnected() {
        return this.status.connected;
    }
}
exports.WebSocketClientBase = WebSocketClientBase;

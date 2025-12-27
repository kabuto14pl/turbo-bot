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

import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface WebSocketConfig {
    url: string;
    apiKey?: string;
    secretKey?: string;
    passphrase?: string;
    reconnectDelay?: number;
    maxReconnectAttempts?: number;
    heartbeatInterval?: number;
    connectionTimeout?: number;
    rateLimit?: number; // messages per second
}

export interface MarketDataUpdate {
    exchange: string;
    symbol: string;
    timestamp: number;
    price: number;
    volume?: number;
    bid?: number;
    ask?: number;
    type: 'trade' | 'ticker' | 'orderbook';
    raw?: any;
}

export interface ConnectionStatus {
    connected: boolean;
    lastConnected?: number;
    lastDisconnected?: number;
    reconnectAttempts: number;
    messagesReceived: number;
    messagesSent: number;
    latency?: number;
}

export abstract class WebSocketClientBase extends EventEmitter {
    protected ws?: WebSocket;
    protected config: Required<WebSocketConfig>;
    protected reconnectTimer?: NodeJS.Timeout;
    protected heartbeatTimer?: NodeJS.Timeout;
    protected connectionTimeout?: NodeJS.Timeout;
    protected status: ConnectionStatus;
    protected lastPingTime: number = 0;
    protected subscribedChannels: Set<string> = new Set();
    protected messageQueue: any[] = [];
    protected rateLimitQueue: number[] = [];

    constructor(config: WebSocketConfig) {
        super();
        
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
    public async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(`🌐 [WS] Connecting to ${this.getExchangeName()}...`);

            try {
                this.ws = new WebSocket(this.config.url);

                // Connection timeout
                this.connectionTimeout = setTimeout(() => {
                    if (!this.status.connected) {
                        console.error(`❌ [WS] Connection timeout for ${this.getExchangeName()}`);
                        this.ws?.terminate();
                        reject(new Error('Connection timeout'));
                    }
                }, this.config.connectionTimeout);

                this.ws.on('open', () => {
                    clearTimeout(this.connectionTimeout!);
                    this.status.connected = true;
                    this.status.lastConnected = Date.now();
                    this.status.reconnectAttempts = 0;
                    
                    console.log(`✅ [WS] Connected to ${this.getExchangeName()}`);
                    
                    this.startHeartbeat();
                    this.onConnected();
                    this.emit('connected');
                    
                    resolve();
                });

                this.ws.on('message', (data: WebSocket.Data) => {
                    this.status.messagesReceived++;
                    this.onMessage(data);
                });

                this.ws.on('ping', (data: Buffer) => {
                    this.ws?.pong(data);
                });

                this.ws.on('pong', () => {
                    const latency = Date.now() - this.lastPingTime;
                    this.status.latency = latency;
                    this.emit('pong', latency);
                });

                this.ws.on('close', (code: number, reason: string) => {
                    this.handleDisconnection(code, reason.toString());
                });

                this.ws.on('error', (error: Error) => {
                    console.error(`❌ [WS] ${this.getExchangeName()} error:`, error.message);
                    this.emit('error', error);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Disconnect from WebSocket
     */
    public disconnect(): void {
        console.log(`🛑 [WS] Disconnecting from ${this.getExchangeName()}...`);
        
        this.stopHeartbeat();
        clearTimeout(this.reconnectTimer!);
        clearTimeout(this.connectionTimeout!);
        
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
    public async subscribe(channel: string, symbol: string): Promise<void> {
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
    public async unsubscribe(channel: string, symbol: string): Promise<void> {
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
    protected async sendMessage(message: any): Promise<void> {
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
    protected checkRateLimit(): boolean {
        const now = Date.now();
        const oneSecondAgo = now - 1000;
        
        // Remove messages older than 1 second
        this.rateLimitQueue = this.rateLimitQueue.filter(time => time > oneSecondAgo);
        
        return this.rateLimitQueue.length < this.config.rateLimit;
    }

    /**
     * Process queued messages
     */
    protected processMessageQueue(): void {
        if (this.messageQueue.length === 0) {
            return;
        }

        const message = this.messageQueue.shift();
        if (message && this.checkRateLimit()) {
            this.sendMessage(message).catch(err => 
                console.error(`❌ [WS] Failed to send queued message:`, err)
            );
        }

        // Continue processing if more messages
        if (this.messageQueue.length > 0) {
            setTimeout(() => this.processMessageQueue(), 100);
        }
    }

    /**
     * Start heartbeat/ping mechanism
     */
    protected startHeartbeat(): void {
        this.heartbeatTimer = setInterval(() => {
            if (this.ws && this.status.connected) {
                this.lastPingTime = Date.now();
                this.ws.ping();
                
                // Send custom ping if exchange requires it
                const pingMessage = this.buildPingMessage();
                if (pingMessage) {
                    this.sendMessage(pingMessage).catch(err => 
                        console.error(`❌ [WS] Ping failed:`, err)
                    );
                }
            }
        }, this.config.heartbeatInterval);
    }

    /**
     * Stop heartbeat
     */
    protected stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = undefined;
        }
    }

    /**
     * Handle disconnection with auto-reconnect
     */
    protected handleDisconnection(code: number, reason: string): void {
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
        } else {
            console.error(`❌ [WS] Max reconnection attempts reached for ${this.getExchangeName()}`);
            this.emit('max_reconnects_reached');
        }
    }

    /**
     * Calculate exponential backoff delay
     */
    protected calculateBackoff(attempt: number): number {
        const baseDelay = this.config.reconnectDelay;
        const maxDelay = 60000; // 1 minute max
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        return delay;
    }

    /**
     * Re-subscribe to all channels after reconnection
     */
    protected async resubscribeChannels(): Promise<void> {
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
    public getStatus(): ConnectionStatus {
        return { ...this.status };
    }

    /**
     * Check if connected
     */
    public isConnected(): boolean {
        return this.status.connected;
    }

    // ========================================================================
    // ABSTRACT METHODS - To be implemented by exchange-specific classes
    // ========================================================================

    /**
     * Get exchange name
     */
    protected abstract getExchangeName(): string;

    /**
     * Called when connection is established
     */
    protected abstract onConnected(): void;

    /**
     * Process incoming message
     */
    protected abstract onMessage(data: WebSocket.Data): void;

    /**
     * Build subscribe message for specific exchange
     */
    protected abstract buildSubscribeMessage(channel: string, symbol: string): any;

    /**
     * Build unsubscribe message for specific exchange
     */
    protected abstract buildUnsubscribeMessage(channel: string, symbol: string): any;

    /**
     * Build ping message (if exchange requires custom ping)
     */
    protected abstract buildPingMessage(): any | null;

    /**
     * Parse market data update
     */
    protected abstract parseMarketData(data: any): MarketDataUpdate | null;
}

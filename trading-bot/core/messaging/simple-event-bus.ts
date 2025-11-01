/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { EventEmitter } from 'events';

/**
 * Message interface for events
 */
export interface TradingMessage {
    id: string;
    type: 'SIGNAL' | 'EXECUTION' | 'RISK_UPDATE' | 'PORTFOLIO_UPDATE' | 'MARKET_DATA' | 'ALERT';
    payload: any;
    timestamp: number;
    source: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Simple Event Bus configuration
 */
export interface EventBusConfig {
    maxQueueSize: number;
    maxRetries: number;
    retryDelay: number;
}

/**
 * Simplified Event Bus for message queuing
 * Addresses critical gap: Message queuing architecture
 * 
 * This is a fallback implementation that provides:
 * - In-memory message queuing
 * - Event-driven architecture
 * - Basic fault tolerance
 * - Priority-based processing
 */
export class SimpleEventBus extends EventEmitter {
    private messageQueue: Map<string, TradingMessage[]> = new Map();
    private isProcessing: boolean = false;
    private config: EventBusConfig;
    private messageCount: number = 0;
    private lastMessageTime: number = 0;

    /**
     * Default configuration
     */
    private readonly DEFAULT_CONFIG: EventBusConfig = {
        maxQueueSize: 10000,
        maxRetries: 3,
        retryDelay: 1000
    };

    /**
     * Topic names
     */
    private readonly TOPICS = {
        signals: 'trading-signals',
        executions: 'trade-executions',
        riskUpdates: 'risk-updates',
        portfolioUpdates: 'portfolio-updates',
        marketData: 'market-data',
        alerts: 'system-alerts'
    };

    constructor(config?: Partial<EventBusConfig>) {
        super();
        this.config = { ...this.DEFAULT_CONFIG, ...config };
        
        // Initialize topic queues
        Object.values(this.TOPICS).forEach(topic => {
            this.messageQueue.set(topic, []);
        });
        
        // Start message processing
        this.startProcessing();
    }

    /**
     * Initialize the event bus
     */
    async initialize(): Promise<void> {
        console.log('🚀 Initializing Simple Event Bus...');
        this.emit('connected');
        console.log('✅ Simple Event Bus initialized successfully');
    }

    /**
     * Disconnect the event bus
     */
    async disconnect(): Promise<void> {
        console.log('🔌 Disconnecting Simple Event Bus...');
        this.isProcessing = false;
        this.emit('disconnected');
        console.log('✅ Simple Event Bus disconnected');
    }

    /**
     * Publish a trading signal
     */
    async publishSignal(signal: any): Promise<void> {
        const message: TradingMessage = {
            id: this.generateMessageId(),
            type: 'SIGNAL',
            payload: signal,
            timestamp: Date.now(),
            source: 'trading-strategy',
            priority: signal.strength > 0.8 ? 'HIGH' : 'MEDIUM'
        };

        await this.publishMessage(this.TOPICS.signals, message);
    }

    /**
     * Publish execution result
     */
    async publishExecution(execution: any): Promise<void> {
        const message: TradingMessage = {
            id: this.generateMessageId(),
            type: 'EXECUTION',
            payload: execution,
            timestamp: Date.now(),
            source: 'execution-engine',
            priority: 'HIGH'
        };

        await this.publishMessage(this.TOPICS.executions, message);
    }

    /**
     * Publish risk update
     */
    async publishRiskUpdate(riskData: any): Promise<void> {
        const message: TradingMessage = {
            id: this.generateMessageId(),
            type: 'RISK_UPDATE',
            payload: riskData,
            timestamp: Date.now(),
            source: 'risk-manager',
            priority: riskData.severity === 'HIGH' ? 'CRITICAL' : 'MEDIUM'
        };

        await this.publishMessage(this.TOPICS.riskUpdates, message);
    }

    /**
     * Publish portfolio update
     */
    async publishPortfolioUpdate(portfolio: any): Promise<void> {
        const message: TradingMessage = {
            id: this.generateMessageId(),
            type: 'PORTFOLIO_UPDATE',
            payload: portfolio,
            timestamp: Date.now(),
            source: 'portfolio-manager',
            priority: 'MEDIUM'
        };

        await this.publishMessage(this.TOPICS.portfolioUpdates, message);
    }

    /**
     * Publish market data
     */
    async publishMarketData(marketData: any): Promise<void> {
        const message: TradingMessage = {
            id: this.generateMessageId(),
            type: 'MARKET_DATA',
            payload: marketData,
            timestamp: Date.now(),
            source: 'market-data-feed',
            priority: 'LOW'
        };

        await this.publishMessage(this.TOPICS.marketData, message);
    }

    /**
     * Publish system alert
     */
    async publishAlert(alert: any): Promise<void> {
        const message: TradingMessage = {
            id: this.generateMessageId(),
            type: 'ALERT',
            payload: alert,
            timestamp: Date.now(),
            source: 'system-monitor',
            priority: 'CRITICAL'
        };

        await this.publishMessage(this.TOPICS.alerts, message);
    }

    /**
     * Subscribe to a topic
     */
    subscribe(topic: string, handler: (message: TradingMessage) => void): void {
        this.on(`message:${topic}`, handler);
        console.log(`📥 Subscribed to topic: ${topic}`);
    }

    /**
     * Unsubscribe from a topic
     */
    unsubscribe(topic: string, handler: (message: TradingMessage) => void): void {
        this.off(`message:${topic}`, handler);
        console.log(`📤 Unsubscribed from topic: ${topic}`);
    }

    /**
     * Generic message publishing method
     */
    private async publishMessage(topic: string, message: TradingMessage): Promise<void> {
        try {
            const queue = this.messageQueue.get(topic);
            if (!queue) {
                throw new Error(`Unknown topic: ${topic}`);
            }

            // Check queue size limits
            if (queue.length >= this.config.maxQueueSize) {
                // Remove oldest message to make space
                queue.shift();
                console.warn(`⚠️ Queue ${topic} full, removed oldest message`);
            }

            // Add message to queue with priority sorting
            this.insertMessageByPriority(queue, message);

            this.messageCount++;
            this.lastMessageTime = Date.now();

            console.log(`📤 Published ${message.type} to ${topic} (queue size: ${queue.length})`);
            
            this.emit('messagePublished', { topic, message });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Failed to publish message:', errorMessage);
            this.emit('publishError', { topic, message, error: errorMessage });
            throw new Error(`Message publish failed: ${errorMessage}`);
        }
    }

    /**
     * Insert message into queue based on priority
     */
    private insertMessageByPriority(queue: TradingMessage[], message: TradingMessage): void {
        const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
        const messagePriority = priorityOrder[message.priority];
        
        let insertIndex = queue.length;
        for (let i = 0; i < queue.length; i++) {
            const queuedPriority = priorityOrder[queue[i].priority];
            if (messagePriority < queuedPriority) {
                insertIndex = i;
                break;
            }
        }
        
        queue.splice(insertIndex, 0, message);
    }

    /**
     * Start processing messages from queues
     */
    private startProcessing(): void {
        this.isProcessing = true;
        
        const processMessages = () => {
            if (!this.isProcessing) return;
            
            // Process messages from all queues
            for (const [topic, queue] of this.messageQueue) {
                while (queue.length > 0) {
                    const message = queue.shift()!;
                    this.processMessage(topic, message);
                }
            }
            
            // Schedule next processing cycle
            setTimeout(processMessages, 10); // Process every 10ms
        };
        
        processMessages();
        console.log('🎧 Started processing messages');
    }

    /**
     * Process individual message
     */
    private processMessage(topic: string, message: TradingMessage): void {
        try {
            console.log(`📥 Processing ${message.type} from ${topic}`);

            // Emit specific events based on message type
            switch (message.type) {
                case 'SIGNAL':
                    this.emit('signal', message.payload);
                    break;
                case 'EXECUTION':
                    this.emit('execution', message.payload);
                    break;
                case 'RISK_UPDATE':
                    this.emit('riskUpdate', message.payload);
                    break;
                case 'PORTFOLIO_UPDATE':
                    this.emit('portfolioUpdate', message.payload);
                    break;
                case 'MARKET_DATA':
                    this.emit('marketData', message.payload);
                    break;
                case 'ALERT':
                    this.emit('alert', message.payload);
                    break;
                default:
                    console.warn(`⚠️ Unknown message type: ${message.type}`);
            }

            // Emit generic message event
            this.emit(`message:${topic}`, message);
            this.emit('message', { topic, message });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error processing message:', errorMessage);
            this.emit('messageError', { topic, message, error: errorMessage });
        }
    }

    /**
     * Generate unique message ID
     */
    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get event bus status and metrics
     */
    getStatus(): {
        processing: boolean;
        messageCount: number;
        lastMessageTime: number;
        queueSizes: Record<string, number>;
        topics: string[];
    } {
        const queueSizes: Record<string, number> = {};
        for (const [topic, queue] of this.messageQueue) {
            queueSizes[topic] = queue.length;
        }

        return {
            processing: this.isProcessing,
            messageCount: this.messageCount,
            lastMessageTime: this.lastMessageTime,
            queueSizes,
            topics: Object.values(this.TOPICS)
        };
    }

    /**
     * Health check for event bus
     */
    async healthCheck(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        details: any;
    }> {
        try {
            const status = this.getStatus();
            
            // Check if processing is active
            if (!status.processing) {
                return {
                    status: 'unhealthy',
                    details: { error: 'Message processing stopped' }
                };
            }
            
            // Check queue sizes
            const totalQueueSize = Object.values(status.queueSizes).reduce((sum, size) => sum + size, 0);
            if (totalQueueSize > this.config.maxQueueSize * 0.8) {
                return {
                    status: 'degraded',
                    details: { 
                        warning: 'High queue sizes detected',
                        queueSizes: status.queueSizes
                    }
                };
            }

            return {
                status: 'healthy',
                details: {
                    messageCount: status.messageCount,
                    queueSizes: status.queueSizes,
                    uptime: Date.now() - (status.lastMessageTime || Date.now())
                }
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                details: { 
                    error: error instanceof Error ? error.message : 'Unknown error' 
                }
            };
        }
    }

    /**
     * Clear all queues
     */
    clearQueues(): void {
        for (const queue of this.messageQueue.values()) {
            queue.length = 0;
        }
        console.log('🧹 All queues cleared');
    }
}

// Export default instance
export default new SimpleEventBus();

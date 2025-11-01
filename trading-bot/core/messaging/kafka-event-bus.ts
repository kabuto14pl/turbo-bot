/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
// Simplified event bus - compatible without external dependencies
import { EventEmitter } from 'events';
import { SimpleErrorManager } from '../error-handling/simple-error-manager';

/**
 * Message interface for Kafka events
 */
export interface TradingMessage {
    id: string;
    type: 'SIGNAL' | 'EXECUTION' | 'RISK_UPDATE' | 'PORTFOLIO_UPDATE' | 'MARKET_DATA' | 'ALERT';
    payload: any;
    timestamp: number;
    source: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
    retryCount?: number;
    correlationId?: string;
}

/**
 * Kafka configuration interface
 */
export interface KafkaConfig {
    clientId: string;
    brokers: string[];
    groupId: string;
    topics: {
        signals: string;
        executions: string;
        risks: string;
        portfolio: string;
        marketData: string;
        alerts: string;
    };
    retentionTime?: number;
    compression?: 'gzip' | 'snappy' | 'lz4' | 'zstd';
}

/**
 * Simplified Event Bus with Kafka-compatible interface
 * Can be upgraded to use real Kafka when needed
 */
export class KafkaEventBus extends EventEmitter {
    private isConnected: boolean = false;
    private errorManager: SimpleErrorManager;
    private config: KafkaConfig;
    private messageCount: number = 0;
    private lastMessageTime: number = 0;
    private messageQueue: Map<string, TradingMessage[]> = new Map();

    /**
     * Default Kafka configuration for trading bot
     */
    private readonly DEFAULT_CONFIG: KafkaConfig = {
        clientId: 'trading-bot-kafka-client',
        brokers: [process.env.KAFKA_BROKERS || 'kafka:9092'],
        groupId: 'trading-bot-group',
        topics: {
            signals: 'trading.signals',
            executions: 'trading.executions',
            risks: 'trading.risks',
            portfolio: 'trading.portfolio',
            marketData: 'trading.market-data',
            alerts: 'trading.alerts'
        },
        retentionTime: 86400000, // 24 hours
        compression: 'gzip'
    };

    constructor(config?: Partial<KafkaConfig>) {
        super();
        this.config = { ...this.DEFAULT_CONFIG, ...config };
        this.errorManager = new SimpleErrorManager();
        
        console.log('📨 KafkaEventBus initialized with simplified implementation');
    }

    /**
     * Initialize the event bus
     */
    async initialize(): Promise<void> {
        try {
            console.log('🚀 Initializing Kafka Event Bus...');
            
            // Initialize message queues for each topic
            Object.values(this.config.topics).forEach(topic => {
                this.messageQueue.set(topic, []);
            });

            this.isConnected = true;
            console.log('✅ Kafka Event Bus connected (simplified mode)');
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('❌ Failed to initialize Kafka Event Bus:', errorMessage);
            throw error;
        }
    }

    /**
     * Publish a message to specified topic
     */
    async publishMessage(topic: string, message: TradingMessage): Promise<void> {
        try {
            if (!this.isConnected) {
                throw new Error('Event bus not connected');
            }

            // Add to queue
            const queue = this.messageQueue.get(topic) || [];
            queue.push(message);
            this.messageQueue.set(topic, queue);

            // Emit event
            this.emit('message', { topic, message });
            
            this.messageCount++;
            this.lastMessageTime = Date.now();

            console.log(`📤 Published message to ${topic}:`, message.type);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('❌ Failed to publish message:', errorMessage);
            throw error;
        }
    }

    /**
     * Subscribe to messages from specified topic
     */
    async subscribeToTopic(topic: string, handler: (message: TradingMessage) => Promise<void>): Promise<void> {
        try {
            if (!this.isConnected) {
                throw new Error('Event bus not connected');
            }

            this.on('message', async ({ topic: msgTopic, message }) => {
                if (msgTopic === topic) {
                    await handler(message);
                }
            });

            console.log(`📥 Subscribed to topic: ${topic}`);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('❌ Failed to subscribe to topic:', errorMessage);
            throw error;
        }
    }

    /**
     * Publish signal message
     */
    async publishSignal(signal: any): Promise<void> {
        const message: TradingMessage = {
            id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'SIGNAL',
            payload: signal,
            timestamp: Date.now(),
            source: 'strategy-engine',
            priority: 'HIGH'
        };

        await this.publishMessage(this.config.topics.signals, message);
    }

    /**
     * Publish execution message
     */
    async publishExecution(execution: any): Promise<void> {
        const message: TradingMessage = {
            id: `execution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'EXECUTION',
            payload: execution,
            timestamp: Date.now(),
            source: 'execution-engine',
            priority: 'CRITICAL'
        };

        await this.publishMessage(this.config.topics.executions, message);
    }

    /**
     * Publish risk update message
     */
    async publishRiskUpdate(riskData: any): Promise<void> {
        const message: TradingMessage = {
            id: `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'RISK_UPDATE',
            payload: riskData,
            timestamp: Date.now(),
            source: 'risk-manager',
            priority: 'HIGH'
        };

        await this.publishMessage(this.config.topics.risks, message);
    }

    /**
     * Publish portfolio update message
     */
    async publishPortfolioUpdate(portfolioData: any): Promise<void> {
        const message: TradingMessage = {
            id: `portfolio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'PORTFOLIO_UPDATE',
            payload: portfolioData,
            timestamp: Date.now(),
            source: 'portfolio-manager',
            priority: 'NORMAL'
        };

        await this.publishMessage(this.config.topics.portfolio, message);
    }

    /**
     * Publish market data message
     */
    async publishMarketData(marketData: any): Promise<void> {
        const message: TradingMessage = {
            id: `market_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'MARKET_DATA',
            payload: marketData,
            timestamp: Date.now(),
            source: 'market-data-feed',
            priority: 'NORMAL'
        };

        await this.publishMessage(this.config.topics.marketData, message);
    }

    /**
     * Publish alert message
     */
    async publishAlert(alert: any): Promise<void> {
        const message: TradingMessage = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'ALERT',
            payload: alert,
            timestamp: Date.now(),
            source: 'monitoring-system',
            priority: 'CRITICAL'
        };

        await this.publishMessage(this.config.topics.alerts, message);
    }

    /**
     * Get event bus statistics
     */
    getStats(): {
        connected: boolean;
        messageCount: number;
        lastMessageTime: number;
        queueSizes: Record<string, number>;
    } {
        const queueSizes: Record<string, number> = {};
        this.messageQueue.forEach((queue, topic) => {
            queueSizes[topic] = queue.length;
        });

        return {
            connected: this.isConnected,
            messageCount: this.messageCount,
            lastMessageTime: this.lastMessageTime,
            queueSizes
        };
    }

    /**
     * Disconnect from Kafka
     */
    async disconnect(): Promise<void> {
        try {
            this.isConnected = false;
            this.messageQueue.clear();
            this.removeAllListeners();
            
            console.log('✅ Kafka Event Bus disconnected');
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('❌ Error disconnecting Kafka Event Bus:', errorMessage);
            throw error;
        }
    }

    /**
     * Check if event bus is healthy
     */
    isHealthy(): boolean {
        return this.isConnected && (Date.now() - this.lastMessageTime < 60000); // Healthy if last message within 1 minute
    }
}

export default KafkaEventBus;

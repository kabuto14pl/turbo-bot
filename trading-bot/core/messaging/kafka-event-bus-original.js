"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaEventBus = void 0;
// Simplified event bus - compatible without external dependencies
const events_1 = require("events");
const simple_error_manager_1 = require("../error-handling/simple-error-manager");
const kafkajs_1 = require("kafkajs");
// Simplified Kafka client for compatibility
class SimpleKafkaClient {
    constructor(config) {
        console.log('Simple Kafka client initialized:', config.clientId);
    }
    producer() {
        return {
            send: async (record) => {
                console.log('Kafka send:', record.topic, record.messages.length, 'messages');
                return {};
            },
            disconnect: async () => {
                console.log('Kafka producer disconnected');
            }
        };
    }
    consumer(config) {
        return {
            subscribe: async (subscription) => {
                console.log('Kafka consumer subscribed to:', subscription.topic);
            },
            run: async (config) => {
                console.log('Kafka consumer running');
            },
            disconnect: async () => {
                console.log('Kafka consumer disconnected');
            },
            connect: async () => {
                console.log('Kafka consumer connected');
            }
        };
    }
}
/**
 * Event-driven architecture using Apache Kafka
 * Addresses critical gap: Message queuing architecture
 *
 * Provides:
 * - Fault-tolerant message delivery
 * - Event streaming capabilities
 * - Scalable distributed processing
 * - Real-time event processing
 */
class KafkaEventBus extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.producer = null;
        this.consumer = null;
        this.isConnected = false;
        this.messageCount = 0;
        this.lastMessageTime = 0;
        /**
         * Default Kafka configuration for trading bot
         */
        this.DEFAULT_CONFIG = {
            brokers: [process.env.KAFKA_BROKERS || 'kafka:9092'], // Use environment variable or Docker service name
            clientId: 'trading-bot-client',
            groupId: 'trading-bot-group',
            topics: {
                signals: 'trading-signals',
                executions: 'trade-executions',
                riskUpdates: 'risk-updates',
                portfolioUpdates: 'portfolio-updates',
                marketData: 'market-data',
                alerts: 'system-alerts'
            }
        };
        this.errorManager = new simple_error_manager_1.SimpleErrorManager();
        // Merge provided config with defaults
        this.config = {
            ...this.DEFAULT_CONFIG,
            ...config
        };
        // Initialize Kafka client
        this.kafka = new kafkajs_1.Kafka({
            clientId: this.config.clientId,
            brokers: this.config.brokers,
            logLevel: kafkajs_1.logLevel.WARN, // Reduce log noise
            connectionTimeout: 10000,
            requestTimeout: 30000,
            retry: {
                initialRetryTime: 100,
                retries: 8
            }
        });
    }
    /**
     * Initialize Kafka producer and consumer
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Kafka Event Bus...');
            // Create producer
            this.producer = this.kafka.producer();
            // Create consumer
            this.consumer = this.kafka.consumer({
                groupId: this.config.groupId,
                sessionTimeout: 30000,
                heartbeatInterval: 3000
            });
            // Connect producer
            if (this.producer) {
                await this.producer.connect();
                console.log('✅ Kafka producer connected');
            }
            // Connect consumer
            if (this.consumer) {
                await this.consumer.connect();
                console.log('✅ Kafka consumer connected');
            }
            // Subscribe to all topics
            await this.subscribeToTopics();
            // Start consuming messages
            await this.startConsumer();
            this.isConnected = true;
            this.emit('connected');
            console.log('🎉 Kafka Event Bus initialized successfully');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Failed to initialize Kafka Event Bus:', errorMessage);
            throw new Error(`Kafka initialization failed: ${errorMessage}`);
        }
    }
    /**
     * Disconnect from Kafka
     */
    async disconnect() {
        try {
            console.log('🔌 Disconnecting from Kafka...');
            if (this.consumer) {
                await this.consumer.disconnect();
                console.log('✅ Kafka consumer disconnected');
            }
            if (this.producer) {
                await this.producer.disconnect();
                console.log('✅ Kafka producer disconnected');
            }
            this.isConnected = false;
            this.emit('disconnected');
            console.log('🎉 Kafka Event Bus disconnected successfully');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error disconnecting from Kafka:', errorMessage);
            throw new Error(`Kafka disconnect failed: ${errorMessage}`);
        }
    }
    /**
     * Publish a trading signal to Kafka
     */
    async publishSignal(signal) {
        const message = {
            id: this.generateMessageId(),
            type: 'SIGNAL',
            payload: signal,
            timestamp: Date.now(),
            source: 'trading-strategy',
            priority: signal.strength > 0.8 ? 'HIGH' : 'MEDIUM'
        };
        await this.publishMessage(this.config.topics.signals, message);
    }
    /**
     * Publish execution result to Kafka
     */
    async publishExecution(execution) {
        const message = {
            id: this.generateMessageId(),
            type: 'EXECUTION',
            payload: execution,
            timestamp: Date.now(),
            source: 'execution-engine',
            priority: 'HIGH'
        };
        await this.publishMessage(this.config.topics.executions, message);
    }
    /**
     * Publish risk update to Kafka
     */
    async publishRiskUpdate(riskData) {
        const message = {
            id: this.generateMessageId(),
            type: 'RISK_UPDATE',
            payload: riskData,
            timestamp: Date.now(),
            source: 'risk-manager',
            priority: riskData.severity === 'HIGH' ? 'CRITICAL' : 'MEDIUM'
        };
        await this.publishMessage(this.config.topics.riskUpdates, message);
    }
    /**
     * Publish portfolio update to Kafka
     */
    async publishPortfolioUpdate(portfolio) {
        const message = {
            id: this.generateMessageId(),
            type: 'PORTFOLIO_UPDATE',
            payload: portfolio,
            timestamp: Date.now(),
            source: 'portfolio-manager',
            priority: 'MEDIUM'
        };
        await this.publishMessage(this.config.topics.portfolioUpdates, message);
    }
    /**
     * Publish market data to Kafka
     */
    async publishMarketData(marketData) {
        const message = {
            id: this.generateMessageId(),
            type: 'MARKET_DATA',
            payload: marketData,
            timestamp: Date.now(),
            source: 'market-data-feed',
            priority: 'LOW'
        };
        await this.publishMessage(this.config.topics.marketData, message);
    }
    /**
     * Publish system alert to Kafka
     */
    async publishAlert(alert) {
        const message = {
            id: this.generateMessageId(),
            type: 'ALERT',
            payload: alert,
            timestamp: Date.now(),
            source: 'system-monitor',
            priority: 'CRITICAL'
        };
        await this.publishMessage(this.config.topics.alerts, message);
    }
    /**
     * Generic message publishing method
     */
    async publishMessage(topic, message) {
        try {
            if (!this.producer || !this.isConnected) {
                throw new Error('Kafka producer not connected');
            }
            const result = await this.producer.send({
                topic,
                messages: [{
                        key: message.id,
                        value: JSON.stringify(message),
                        partition: this.getPartitionForMessage(message),
                        timestamp: message.timestamp.toString()
                    }]
            });
            this.messageCount++;
            this.lastMessageTime = Date.now();
            console.log(`📤 Published ${message.type} to ${topic} (partition: ${result[0].partition}, offset: ${result[0].baseOffset})`);
            this.emit('messagePublished', { topic, message, result });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Failed to publish message:', errorMessage);
            this.emit('publishError', { topic, message, error: errorMessage });
            throw new Error(`Message publish failed: ${errorMessage}`);
        }
    }
    /**
     * Subscribe to all configured topics
     */
    async subscribeToTopics() {
        if (!this.consumer) {
            throw new Error('Consumer not initialized');
        }
        const topics = Object.values(this.config.topics);
        for (const topic of topics) {
            await this.consumer.subscribe({ topic, fromBeginning: false });
            console.log(`📥 Subscribed to topic: ${topic}`);
        }
    }
    /**
     * Start consuming messages from Kafka
     */
    async startConsumer() {
        if (!this.consumer) {
            throw new Error('Consumer not initialized');
        }
        await this.consumer.run({
            eachMessage: async (payload) => {
                try {
                    await this.handleMessage(payload);
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.error('❌ Error handling message:', errorMessage);
                    this.emit('messageError', { payload, error: errorMessage });
                }
            }
        });
        console.log('🎧 Started consuming messages');
    }
    /**
     * Handle incoming Kafka messages
     */
    async handleMessage(payload) {
        try {
            const { topic, partition, message } = payload;
            if (!message.value) {
                console.warn('⚠️ Received empty message');
                return;
            }
            const tradingMessage = JSON.parse(message.value.toString());
            console.log(`📥 Received ${tradingMessage.type} from ${topic} (partition: ${partition}, offset: ${message.offset})`);
            // Emit specific events based on message type
            switch (tradingMessage.type) {
                case 'SIGNAL':
                    this.emit('signal', tradingMessage.payload);
                    break;
                case 'EXECUTION':
                    this.emit('execution', tradingMessage.payload);
                    break;
                case 'RISK_UPDATE':
                    this.emit('riskUpdate', tradingMessage.payload);
                    break;
                case 'PORTFOLIO_UPDATE':
                    this.emit('portfolioUpdate', tradingMessage.payload);
                    break;
                case 'MARKET_DATA':
                    this.emit('marketData', tradingMessage.payload);
                    break;
                case 'ALERT':
                    this.emit('alert', tradingMessage.payload);
                    break;
                default:
                    console.warn(`⚠️ Unknown message type: ${tradingMessage.type}`);
            }
            // Emit generic message event
            this.emit('message', { topic, message: tradingMessage });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error parsing message:', errorMessage);
            throw error;
        }
    }
    /**
     * Determine partition for message (for load balancing)
     */
    getPartitionForMessage(message) {
        // Simple partitioning strategy based on message priority
        switch (message.priority) {
            case 'CRITICAL':
                return 0; // High-priority partition
            case 'HIGH':
                return 1;
            case 'MEDIUM':
                return 2;
            case 'LOW':
                return 3;
            default:
                return 0;
        }
    }
    /**
     * Generate unique message ID
     */
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Get event bus status and metrics
     */
    getStatus() {
        return {
            connected: this.isConnected,
            messageCount: this.messageCount,
            lastMessageTime: this.lastMessageTime,
            topics: Object.values(this.config.topics),
            config: this.config
        };
    }
    /**
     * Health check for Kafka connection
     */
    async healthCheck() {
        try {
            if (!this.isConnected) {
                return {
                    status: 'unhealthy',
                    details: { error: 'Not connected to Kafka' }
                };
            }
            // Try to send a test message to check producer health
            const testMessage = {
                id: this.generateMessageId(),
                type: 'ALERT',
                payload: { type: 'health_check' },
                timestamp: Date.now(),
                source: 'health-monitor',
                priority: 'LOW'
            };
            await this.publishMessage(this.config.topics.alerts, testMessage);
            return {
                status: 'healthy',
                details: {
                    messageCount: this.messageCount,
                    lastMessageTime: this.lastMessageTime,
                    uptime: Date.now() - (this.lastMessageTime || Date.now())
                }
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            };
        }
    }
}
exports.KafkaEventBus = KafkaEventBus;
// Export default instance with default configuration
exports.default = new KafkaEventBus();

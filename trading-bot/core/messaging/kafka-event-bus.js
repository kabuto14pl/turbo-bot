"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaEventBus = void 0;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
// Simplified event bus - compatible without external dependencies
const events_1 = require("events");
const simple_error_manager_1 = require("../error-handling/simple-error-manager");
/**
 * Simplified Event Bus with Kafka-compatible interface
 * Can be upgraded to use real Kafka when needed
 */
class KafkaEventBus extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.isConnected = false;
        this.messageCount = 0;
        this.lastMessageTime = 0;
        this.messageQueue = new Map();
        /**
         * Default Kafka configuration for trading bot
         */
        this.DEFAULT_CONFIG = {
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
        this.config = { ...this.DEFAULT_CONFIG, ...config };
        this.errorManager = new simple_error_manager_1.SimpleErrorManager();
        console.log('📨 KafkaEventBus initialized with simplified implementation');
    }
    /**
     * Initialize the event bus
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Kafka Event Bus...');
            // Initialize message queues for each topic
            Object.values(this.config.topics).forEach(topic => {
                this.messageQueue.set(topic, []);
            });
            this.isConnected = true;
            console.log('✅ Kafka Event Bus connected (simplified mode)');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('❌ Failed to initialize Kafka Event Bus:', errorMessage);
            throw error;
        }
    }
    /**
     * Publish a message to specified topic
     */
    async publishMessage(topic, message) {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('❌ Failed to publish message:', errorMessage);
            throw error;
        }
    }
    /**
     * Subscribe to messages from specified topic
     */
    async subscribeToTopic(topic, handler) {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('❌ Failed to subscribe to topic:', errorMessage);
            throw error;
        }
    }
    /**
     * Publish signal message
     */
    async publishSignal(signal) {
        const message = {
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
    async publishExecution(execution) {
        const message = {
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
    async publishRiskUpdate(riskData) {
        const message = {
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
    async publishPortfolioUpdate(portfolioData) {
        const message = {
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
    async publishMarketData(marketData) {
        const message = {
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
    async publishAlert(alert) {
        const message = {
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
    getStats() {
        const queueSizes = {};
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
    async disconnect() {
        try {
            this.isConnected = false;
            this.messageQueue.clear();
            this.removeAllListeners();
            console.log('✅ Kafka Event Bus disconnected');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('❌ Error disconnecting Kafka Event Bus:', errorMessage);
            throw error;
        }
    }
    /**
     * Check if event bus is healthy
     */
    isHealthy() {
        return this.isConnected && (Date.now() - this.lastMessageTime < 60000); // Healthy if last message within 1 minute
    }
}
exports.KafkaEventBus = KafkaEventBus;
exports.default = KafkaEventBus;

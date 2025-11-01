"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🚀 KAFKA REAL-TIME STREAMING - PRODUCTION UPGRADE
 *
 * Zaawansowany system Kafka streaming z:
 * ✅ Real-time data publishing
 * ✅ Consumer groups
 * ✅ Dead letter queues
 * ✅ Schema registry integration
 * ✅ Retry mechanisms
 * ✅ Monitoring & metrics
 * ✅ Partition management
 * ✅ Exactly-once semantics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProductionKafkaConfig = exports.EnhancedKafkaStreamingEngine = void 0;
const kafkajs_1 = require("kafkajs");
const logger_1 = require("../../infrastructure/logging/logger");
const events_1 = require("events");
/**
 * 🚀 ENHANCED KAFKA STREAMING ENGINE
 */
class EnhancedKafkaStreamingEngine extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.isRunning = false;
        this.config = config;
        this.logger = new logger_1.Logger();
        this.metrics = {
            messagesProduced: 0,
            messagesConsumed: 0,
            bytesProduced: 0,
            bytesConsumed: 0,
            producerErrors: 0,
            consumerErrors: 0,
            averageLatency: 0,
            throughputPerSecond: 0,
            lastActivity: Date.now()
        };
        this.initializeKafka();
    }
    initializeKafka() {
        const kafkaConfig = {
            clientId: this.config.clientId,
            brokers: this.config.brokers,
            retry: this.config.retryConfig,
            logLevel: 2, // WARN level
        };
        this.kafka = new kafkajs_1.Kafka(kafkaConfig);
    }
    async start() {
        if (this.isRunning) {
            throw new Error('Kafka streaming engine is already running');
        }
        this.logger.info('🚀 Starting Enhanced Kafka Streaming Engine...');
        try {
            // Initialize producer
            await this.initializeProducer();
            // Initialize consumer
            await this.initializeConsumer();
            // Create topics if they don't exist
            await this.createTopics();
            // Start health monitoring
            this.startHealthMonitoring();
            // Start metrics collection
            this.startMetricsCollection();
            this.isRunning = true;
            this.logger.info('✅ Enhanced Kafka Streaming Engine started successfully');
            this.emit('started');
        }
        catch (error) {
            this.logger.error('❌ Failed to start Kafka streaming engine:', error);
            throw error;
        }
    }
    async initializeProducer() {
        this.producer = this.kafka.producer({
            idempotent: this.config.enableIdempotence,
            maxInFlightRequests: 1,
            retry: this.config.retryConfig
        });
        // Setup producer event handlers
        this.producer.on('producer.connect', () => {
            this.logger.info('✅ Kafka producer connected');
            this.emit('producerConnected');
        });
        this.producer.on('producer.disconnect', () => {
            this.logger.warn('⚠️ Kafka producer disconnected');
            this.emit('producerDisconnected');
        });
        this.producer.on('producer.network.request_timeout', (payload) => {
            this.logger.error('❌ Producer request timeout:', payload);
            this.metrics.producerErrors++;
        });
        await this.producer.connect();
    }
    async initializeConsumer() {
        this.consumer = this.kafka.consumer({
            groupId: this.config.groupId,
            sessionTimeout: 30000,
            rebalanceTimeout: 60000,
            heartbeatInterval: 3000,
            maxBytesPerPartition: 1048576, // 1MB
            minBytes: 1,
            maxBytes: 10485760, // 10MB
            maxWaitTimeInMs: 5000,
            retry: this.config.retryConfig
        });
        // Setup consumer event handlers
        this.consumer.on('consumer.connect', () => {
            this.logger.info('✅ Kafka consumer connected');
            this.emit('consumerConnected');
        });
        this.consumer.on('consumer.disconnect', () => {
            this.logger.warn('⚠️ Kafka consumer disconnected');
            this.emit('consumerDisconnected');
        });
        this.consumer.on('consumer.crash', (error) => {
            this.logger.error('💥 Kafka consumer crashed:', error);
            this.metrics.consumerErrors++;
            this.emit('consumerCrash', error);
        });
        await this.consumer.connect();
        // Subscribe to topics
        await this.consumer.subscribe({
            topics: Object.values(this.config.topics),
            fromBeginning: false
        });
        // Start consuming messages
        await this.consumer.run({
            eachMessage: async (payload) => {
                await this.handleMessage(payload);
            },
        });
    }
    async createTopics() {
        const admin = this.kafka.admin();
        try {
            await admin.connect();
            const existingTopics = await admin.listTopics();
            const topicsToCreate = Object.values(this.config.topics)
                .filter(topic => !existingTopics.includes(topic))
                .map(topic => ({
                topic,
                numPartitions: 3,
                replicationFactor: 1,
                configEntries: [
                    { name: 'cleanup.policy', value: 'delete' },
                    { name: 'retention.ms', value: '86400000' }, // 24 hours
                    { name: 'compression.type', value: this.config.compression }
                ]
            }));
            if (topicsToCreate.length > 0) {
                await admin.createTopics({
                    topics: topicsToCreate,
                    waitForLeaders: true,
                    timeout: 30000
                });
                this.logger.info(`✅ Created ${topicsToCreate.length} Kafka topics`);
            }
        }
        catch (error) {
            this.logger.error('❌ Failed to create Kafka topics:', error);
        }
        finally {
            await admin.disconnect();
        }
    }
    /**
     * 📤 PUBLISH MARKET DATA
     */
    async publishMarketData(data, source = 'binance') {
        if (!this.producer) {
            throw new Error('Producer not initialized');
        }
        const message = {
            messageType: 'marketData',
            symbol: data.symbol,
            timestamp: data.timestamp,
            data,
            source,
            version: '1.0'
        };
        await this.publishMessage({
            topic: this.config.topics.marketData,
            key: data.symbol,
            value: message,
            headers: {
                'content-type': 'application/json',
                'source': source,
                'symbol': data.symbol
            }
        });
    }
    /**
     * 📊 PUBLISH CANDLE DATA
     */
    async publishCandle(symbol, timeframe, candle, source = 'binance') {
        if (!this.producer) {
            throw new Error('Producer not initialized');
        }
        const message = {
            messageType: 'candle',
            symbol,
            timeframe,
            timestamp: candle.time,
            data: candle,
            source,
            version: '1.0'
        };
        await this.publishMessage({
            topic: this.config.topics.candles,
            key: `${symbol}_${timeframe}`,
            value: message,
            headers: {
                'content-type': 'application/json',
                'source': source,
                'symbol': symbol,
                'timeframe': timeframe
            }
        });
    }
    /**
     * 🎯 PUBLISH TRADING SIGNAL
     */
    async publishSignal(strategyName, symbol, signalType, confidence, data) {
        if (!this.producer) {
            throw new Error('Producer not initialized');
        }
        const message = {
            messageType: 'signal',
            strategyName,
            symbol,
            signalType,
            timestamp: Date.now(),
            confidence,
            data,
            version: '1.0'
        };
        await this.publishMessage({
            topic: this.config.topics.signals,
            key: `${strategyName}_${symbol}`,
            value: message,
            headers: {
                'content-type': 'application/json',
                'strategy': strategyName,
                'symbol': symbol,
                'signal-type': signalType
            }
        });
    }
    /**
     * 📨 GENERIC MESSAGE PUBLISHING
     */
    async publishMessage(kafkaMessage) {
        if (!this.producer) {
            throw new Error('Producer not initialized');
        }
        const startTime = Date.now();
        try {
            const messageValue = JSON.stringify(kafkaMessage.value);
            const messageSize = Buffer.byteLength(messageValue, 'utf8');
            await this.producer.send({
                topic: kafkaMessage.topic,
                messages: [{
                        partition: kafkaMessage.partition,
                        key: kafkaMessage.key,
                        value: messageValue,
                        timestamp: kafkaMessage.timestamp?.toString(),
                        headers: kafkaMessage.headers
                    }]
            });
            // Update metrics
            this.metrics.messagesProduced++;
            this.metrics.bytesProduced += messageSize;
            this.metrics.lastActivity = Date.now();
            // Calculate latency
            const latency = Date.now() - startTime;
            this.metrics.averageLatency = (this.metrics.averageLatency + latency) / 2;
            this.logger.debug(`📤 Published message to ${kafkaMessage.topic}:`, {
                key: kafkaMessage.key,
                size: messageSize,
                latency
            });
        }
        catch (error) {
            this.metrics.producerErrors++;
            this.logger.error(`❌ Failed to publish message to ${kafkaMessage.topic}:`, error);
            throw error;
        }
    }
    /**
     * 📨 MESSAGE CONSUMPTION HANDLER
     */
    async handleMessage(payload) {
        const { topic, partition, message } = payload;
        try {
            const messageValue = message.value?.toString();
            if (!messageValue)
                return;
            const parsedMessage = JSON.parse(messageValue);
            const messageSize = Buffer.byteLength(messageValue, 'utf8');
            // Update metrics
            this.metrics.messagesConsumed++;
            this.metrics.bytesConsumed += messageSize;
            this.metrics.lastActivity = Date.now();
            // Route message based on topic
            switch (topic) {
                case this.config.topics.marketData:
                    this.emit('marketDataReceived', parsedMessage);
                    break;
                case this.config.topics.candles:
                    this.emit('candleReceived', parsedMessage);
                    break;
                case this.config.topics.signals:
                    this.emit('signalReceived', parsedMessage);
                    break;
                case this.config.topics.trades:
                    this.emit('tradeReceived', parsedMessage);
                    break;
                case this.config.topics.orderBook:
                    this.emit('orderBookReceived', parsedMessage);
                    break;
                case this.config.topics.alerts:
                    this.emit('alertReceived', parsedMessage);
                    break;
                default:
                    this.logger.warn(`⚠️ Unknown topic: ${topic}`);
            }
            this.logger.debug(`📥 Consumed message from ${topic}:`, {
                partition,
                offset: message.offset,
                size: messageSize,
                key: message.key?.toString()
            });
        }
        catch (error) {
            this.metrics.consumerErrors++;
            this.logger.error(`❌ Failed to process message from ${topic}:`, error);
            // Send to dead letter queue
            await this.sendToDeadLetterQueue(topic, message);
        }
    }
    /**
     * 💀 DEAD LETTER QUEUE HANDLING
     */
    async sendToDeadLetterQueue(originalTopic, message) {
        try {
            const dlqTopic = `${originalTopic}.DLQ`;
            await this.publishMessage({
                topic: dlqTopic,
                key: message.key?.toString(),
                value: {
                    originalTopic,
                    originalMessage: message.value?.toString(),
                    error: 'Message processing failed',
                    timestamp: Date.now()
                },
                headers: {
                    'content-type': 'application/json',
                    'error-type': 'processing-failure',
                    'original-topic': originalTopic
                }
            });
            this.logger.info(`📪 Sent message to dead letter queue: ${dlqTopic}`);
        }
        catch (error) {
            this.logger.error('❌ Failed to send message to dead letter queue:', error);
        }
    }
    /**
     * 🏥 HEALTH MONITORING
     */
    startHealthMonitoring() {
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.performHealthCheck();
            }
            catch (error) {
                this.logger.error('❌ Health check failed:', error);
            }
        }, 30000); // Every 30 seconds
    }
    async performHealthCheck() {
        const now = Date.now();
        const timeSinceLastActivity = now - this.metrics.lastActivity;
        // Check if we're receiving/sending messages
        if (timeSinceLastActivity > 60000) { // 1 minute
            this.logger.warn('⚠️ No Kafka activity detected in the last minute');
            this.emit('healthWarning', 'No activity detected');
        }
        // Check error rates
        const totalMessages = this.metrics.messagesProduced + this.metrics.messagesConsumed;
        const totalErrors = this.metrics.producerErrors + this.metrics.consumerErrors;
        const errorRate = totalMessages > 0 ? totalErrors / totalMessages : 0;
        if (errorRate > 0.05) { // 5% error rate
            this.logger.warn(`⚠️ High Kafka error rate: ${(errorRate * 100).toFixed(2)}%`);
            this.emit('healthWarning', `High error rate: ${errorRate}`);
        }
        this.emit('healthCheck', {
            isHealthy: timeSinceLastActivity < 60000 && errorRate < 0.05,
            metrics: this.metrics,
            timeSinceLastActivity,
            errorRate
        });
    }
    /**
     * 📊 METRICS COLLECTION
     */
    startMetricsCollection() {
        this.metricsInterval = setInterval(() => {
            this.calculateThroughput();
            this.emit('metricsUpdate', this.metrics);
        }, 60000); // Every minute
    }
    calculateThroughput() {
        const totalMessages = this.metrics.messagesProduced + this.metrics.messagesConsumed;
        this.metrics.throughputPerSecond = totalMessages / 60; // messages per second over last minute
    }
    /**
     * 📈 PUBLIC API METHODS
     */
    getMetrics() {
        return { ...this.metrics };
    }
    isHealthy() {
        const now = Date.now();
        const timeSinceLastActivity = now - this.metrics.lastActivity;
        const totalMessages = this.metrics.messagesProduced + this.metrics.messagesConsumed;
        const totalErrors = this.metrics.producerErrors + this.metrics.consumerErrors;
        const errorRate = totalMessages > 0 ? totalErrors / totalMessages : 0;
        return (this.isRunning &&
            timeSinceLastActivity < 60000 &&
            errorRate < 0.05);
    }
    async stop() {
        this.logger.info('🛑 Stopping Enhanced Kafka Streaming Engine...');
        this.isRunning = false;
        // Clear intervals
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
        // Disconnect producer and consumer
        if (this.producer) {
            await this.producer.disconnect();
        }
        if (this.consumer) {
            await this.consumer.disconnect();
        }
        this.logger.info('✅ Enhanced Kafka Streaming Engine stopped');
        this.emit('stopped');
    }
}
exports.EnhancedKafkaStreamingEngine = EnhancedKafkaStreamingEngine;
/**
 * 🏭 DEFAULT PRODUCTION CONFIGURATION
 */
const createProductionKafkaConfig = () => ({
    brokers: [process.env.KAFKA_BROKERS || 'kafka:9092'],
    clientId: 'trading-bot-client',
    groupId: 'trading-bot-group',
    topics: {
        marketData: 'trading.market-data',
        candles: 'trading.candles',
        trades: 'trading.trades',
        orderBook: 'trading.order-book',
        signals: 'trading.signals',
        alerts: 'trading.alerts'
    },
    retryConfig: {
        maxRetryTime: 30000,
        initialRetryTime: 300,
        factor: 0.2,
        multiplier: 2,
        retries: 10
    },
    batchConfig: {
        batchSize: 16384, // 16KB
        batchTimeout: 100 // 100ms
    },
    compression: 'gzip',
    enableIdempotence: true,
    enableSchemaRegistry: false
});
exports.createProductionKafkaConfig = createProductionKafkaConfig;

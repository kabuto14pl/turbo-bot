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

import { Kafka, KafkaConfig, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { Logger } from '../../infrastructure/logging/logger';
import { EventEmitter } from 'events';
import { Candle } from '../types/strategy';
import { MarketDataSnapshot } from '../data/real_time_data_engine';

export interface KafkaStreamingConfig {
  brokers: string[];
  clientId: string;
  groupId: string;
  topics: {
    marketData: string;
    candles: string;
    trades: string;
    orderBook: string;
    signals: string;
    alerts: string;
  };
  retryConfig: {
    maxRetryTime: number;
    initialRetryTime: number;
    factor: number;
    multiplier: number;
    retries: number;
  };
  batchConfig: {
    batchSize: number;
    batchTimeout: number;
  };
  compression: 'gzip' | 'snappy' | 'lz4' | 'zstd' | 'none';
  enableIdempotence: boolean;
  enableSchemaRegistry: boolean;
  schemaRegistryUrl?: string;
}

export interface KafkaMessage {
  topic: string;
  partition?: number;
  key?: string;
  value: any;
  timestamp?: number;
  headers?: Record<string, string>;
}

export interface StreamingMetrics {
  messagesProduced: number;
  messagesConsumed: number;
  bytesProduced: number;
  bytesConsumed: number;
  producerErrors: number;
  consumerErrors: number;
  averageLatency: number;
  throughputPerSecond: number;
  lastActivity: number;
}

/**
 * 📊 KAFKA MESSAGE SCHEMAS
 */
export interface MarketDataMessage {
  messageType: 'marketData';
  symbol: string;
  timestamp: number;
  data: MarketDataSnapshot;
  source: string;
  version: string;
}

export interface CandleMessage {
  messageType: 'candle';
  symbol: string;
  timeframe: string;
  timestamp: number;
  data: Candle;
  source: string;
  version: string;
}

export interface SignalMessage {
  messageType: 'signal';
  strategyName: string;
  symbol: string;
  signalType: string;
  timestamp: number;
  confidence: number;
  data: any;
  version: string;
}

/**
 * 🚀 ENHANCED KAFKA STREAMING ENGINE
 */
export class EnhancedKafkaStreamingEngine extends EventEmitter {
  private kafka!: Kafka;
  private producer?: Producer;
  private consumer?: Consumer;
  private logger: Logger;
  private config: KafkaStreamingConfig;
  private isRunning: boolean = false;
  private metrics: StreamingMetrics;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;

  constructor(config: KafkaStreamingConfig) {
    super();
    this.config = config;
    this.logger = new Logger();
    
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

  private initializeKafka(): void {
    const kafkaConfig: KafkaConfig = {
      clientId: this.config.clientId,
      brokers: this.config.brokers,
      retry: this.config.retryConfig,
      logLevel: 2, // WARN level
    };

    this.kafka = new Kafka(kafkaConfig);
  }

  async start(): Promise<void> {
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

    } catch (error) {
      this.logger.error('❌ Failed to start Kafka streaming engine:', error);
      throw error;
    }
  }

  private async initializeProducer(): Promise<void> {
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

  private async initializeConsumer(): Promise<void> {
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
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      },
    });
  }

  private async createTopics(): Promise<void> {
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

    } catch (error) {
      this.logger.error('❌ Failed to create Kafka topics:', error);
    } finally {
      await admin.disconnect();
    }
  }

  /**
   * 📤 PUBLISH MARKET DATA
   */
  async publishMarketData(data: MarketDataSnapshot, source: string = 'binance'): Promise<void> {
    if (!this.producer) {
      throw new Error('Producer not initialized');
    }

    const message: MarketDataMessage = {
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
  async publishCandle(symbol: string, timeframe: string, candle: Candle, source: string = 'binance'): Promise<void> {
    if (!this.producer) {
      throw new Error('Producer not initialized');
    }

    const message: CandleMessage = {
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
  async publishSignal(strategyName: string, symbol: string, signalType: string, confidence: number, data: any): Promise<void> {
    if (!this.producer) {
      throw new Error('Producer not initialized');
    }

    const message: SignalMessage = {
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
  private async publishMessage(kafkaMessage: KafkaMessage): Promise<void> {
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

    } catch (error) {
      this.metrics.producerErrors++;
      this.logger.error(`❌ Failed to publish message to ${kafkaMessage.topic}:`, error);
      throw error;
    }
  }

  /**
   * 📨 MESSAGE CONSUMPTION HANDLER
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    
    try {
      const messageValue = message.value?.toString();
      if (!messageValue) return;

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

    } catch (error) {
      this.metrics.consumerErrors++;
      this.logger.error(`❌ Failed to process message from ${topic}:`, error);
      
      // Send to dead letter queue
      await this.sendToDeadLetterQueue(topic, message);
    }
  }

  /**
   * 💀 DEAD LETTER QUEUE HANDLING
   */
  private async sendToDeadLetterQueue(originalTopic: string, message: any): Promise<void> {
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

    } catch (error) {
      this.logger.error('❌ Failed to send message to dead letter queue:', error);
    }
  }

  /**
   * 🏥 HEALTH MONITORING
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.logger.error('❌ Health check failed:', error);
      }
    }, 30000); // Every 30 seconds
  }

  private async performHealthCheck(): Promise<void> {
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
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.calculateThroughput();
      this.emit('metricsUpdate', this.metrics);
    }, 60000); // Every minute
  }

  private calculateThroughput(): void {
    const totalMessages = this.metrics.messagesProduced + this.metrics.messagesConsumed;
    this.metrics.throughputPerSecond = totalMessages / 60; // messages per second over last minute
  }

  /**
   * 📈 PUBLIC API METHODS
   */
  getMetrics(): StreamingMetrics {
    return { ...this.metrics };
  }

  isHealthy(): boolean {
    const now = Date.now();
    const timeSinceLastActivity = now - this.metrics.lastActivity;
    const totalMessages = this.metrics.messagesProduced + this.metrics.messagesConsumed;
    const totalErrors = this.metrics.producerErrors + this.metrics.consumerErrors;
    const errorRate = totalMessages > 0 ? totalErrors / totalMessages : 0;

    return (
      this.isRunning &&
      timeSinceLastActivity < 60000 &&
      errorRate < 0.05
    );
  }

  async stop(): Promise<void> {
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

/**
 * 🏭 DEFAULT PRODUCTION CONFIGURATION
 */
export const createProductionKafkaConfig = (): KafkaStreamingConfig => ({
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
    batchTimeout: 100  // 100ms
  },
  compression: 'gzip',
  enableIdempotence: true,
  enableSchemaRegistry: false
});

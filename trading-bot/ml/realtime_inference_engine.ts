/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * ⚡ REAL-TIME INFERENCE ENGINE
 * Zoptymalizowany system inferencji ML w czasie rzeczywistym
 */

import { EventEmitter } from 'events';
import { Logger } from '../infrastructure/logging/logger';
import { TensorFlowIntegrationV2 } from '../core/ml/tensorflow_integration_v2';
import { ModelRegistry, ModelMetadata } from './model_registry';
import { AdvancedFeatureEngineer, FeatureSet } from './advanced_feature_engineer';
import { Candle } from '../core/types/strategy';

export interface InferenceRequest {
    id: string;
    modelId: string;
    inputData: Candle[];
    timestamp: number;
    priority: 'low' | 'normal' | 'high' | 'critical';
    timeout?: number; // ms
    metadata?: Record<string, any>;
}

export interface InferenceResult {
    requestId: string;
    modelId: string;
    prediction: number[];
    confidence: number;
    probability?: number[];
    features: Record<string, number>;
    processing_time: number;
    timestamp: number;
    status: 'success' | 'error' | 'timeout';
    error?: string;
    metadata?: Record<string, any>;
}

export interface ModelCache {
    modelId: string;
    model: any; // TensorFlow model
    metadata: ModelMetadata;
    lastUsed: Date;
    hitCount: number;
    loadTime: number;
    memoryUsage: number;
}

export interface InferenceMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatency: number;
    throughput: number; // requests per second
    cacheHitRate: number;
    memoryUsage: number;
    queueLength: number;
    activeModels: number;
}

export interface InferenceConfig {
    maxConcurrentRequests: number;
    defaultTimeout: number;
    cacheSize: number;
    batchSize: number;
    enableBatching: boolean;
    enableCache: boolean;
    enableMetrics: boolean;
    warmupModels: string[];
    priorityQueue: boolean;
}

export class RealTimeInferenceEngine extends EventEmitter {
    private logger: Logger;
    private tensorFlow: TensorFlowIntegrationV2;
    private modelRegistry: ModelRegistry;
    private featureEngineer: AdvancedFeatureEngineer;
    private config: InferenceConfig;
    
    // Model cache and queue
    private modelCache: Map<string, ModelCache> = new Map();
    private requestQueue: InferenceRequest[] = [];
    private activeRequests: Map<string, Promise<InferenceResult>> = new Map();
    
    // Metrics
    private metrics: InferenceMetrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        throughput: 0,
        cacheHitRate: 0,
        memoryUsage: 0,
        queueLength: 0,
        activeModels: 0
    };
    
    private latencyHistory: number[] = [];
    private isRunning: boolean = false;
    private processingInterval: NodeJS.Timeout | null = null;

    constructor(
        tensorFlow: TensorFlowIntegrationV2,
        modelRegistry: ModelRegistry,
        featureEngineer: AdvancedFeatureEngineer,
        config: Partial<InferenceConfig> = {}
    ) {
        super();
        this.logger = new Logger('RealTimeInferenceEngine');
        this.tensorFlow = tensorFlow;
        this.modelRegistry = modelRegistry;
        this.featureEngineer = featureEngineer;
        
        this.config = {
            maxConcurrentRequests: 10,
            defaultTimeout: 5000,
            cacheSize: 5,
            batchSize: 32,
            enableBatching: true,
            enableCache: true,
            enableMetrics: true,
            warmupModels: [],
            priorityQueue: true,
            ...config
        };
        
        this.logger.info('⚡ Real-time Inference Engine initialized');
    }

    /**
     * 🚀 Start inference engine
     */
    public async start(): Promise<void> {
        if (this.isRunning) {
            this.logger.warn('⚠️ Inference Engine already running');
            return;
        }

        this.logger.info('🚀 Starting Real-time Inference Engine...');
        
        try {
            // Warmup models if configured
            if (this.config.warmupModels.length > 0) {
                await this.warmupModels(this.config.warmupModels);
            }
            
            // Start processing queue
            this.startQueueProcessor();
            
            // Start metrics collection
            if (this.config.enableMetrics) {
                this.startMetricsCollection();
            }
            
            this.isRunning = true;
            this.emit('engine:started');
            this.logger.info('✅ Real-time Inference Engine started');
            
        } catch (error) {
            this.logger.error('❌ Failed to start Inference Engine:', error);
            throw error;
        }
    }

    /**
     * 🛑 Stop inference engine
     */
    public async stop(): Promise<void> {
        if (!this.isRunning) return;

        this.logger.info('🛑 Stopping Real-time Inference Engine...');
        
        this.isRunning = false;
        
        // Stop queue processor
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        
        // Wait for active requests to complete
        const activePromises = Array.from(this.activeRequests.values());
        if (activePromises.length > 0) {
            this.logger.info(`⏳ Waiting for ${activePromises.length} active requests to complete...`);
            await Promise.allSettled(activePromises);
        }
        
        // Clear cache
        this.modelCache.clear();
        this.requestQueue = [];
        
        this.emit('engine:stopped');
        this.logger.info('✅ Real-time Inference Engine stopped');
    }

    /**
     * 🎯 Submit inference request
     */
    public async predict(
        modelId: string,
        inputData: Candle[],
        options: {
            priority?: 'low' | 'normal' | 'high' | 'critical';
            timeout?: number;
            metadata?: Record<string, any>;
        } = {}
    ): Promise<InferenceResult> {
        if (!this.isRunning) {
            throw new Error('Inference Engine is not running');
        }

        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const request: InferenceRequest = {
            id: requestId,
            modelId,
            inputData,
            timestamp: Date.now(),
            priority: options.priority || 'normal',
            timeout: options.timeout || this.config.defaultTimeout,
            metadata: options.metadata
        };

        // Add to queue or process immediately
        if (this.config.priorityQueue) {
            this.addToQueue(request);
        } else {
            return await this.processRequest(request);
        }

        // Return promise that resolves when request is processed
        const processingPromise = new Promise<InferenceResult>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Inference request ${requestId} timed out`));
            }, request.timeout);

            this.processRequest(request).then(result => {
                clearTimeout(timeout);
                resolve(result);
            }).catch(error => {
                clearTimeout(timeout);
                reject(error);
            });
        });

        this.activeRequests.set(requestId, processingPromise);
        
        try {
            const result = await processingPromise;
            this.activeRequests.delete(requestId);
            return result;
        } catch (error) {
            this.activeRequests.delete(requestId);
            throw error;
        }
    }

    /**
     * 📋 Add request to priority queue
     */
    private addToQueue(request: InferenceRequest): void {
        // Insert based on priority
        const priorityOrder = { 'critical': 4, 'high': 3, 'normal': 2, 'low': 1 };
        const priority = priorityOrder[request.priority];
        
        let insertIndex = this.requestQueue.length;
        for (let i = 0; i < this.requestQueue.length; i++) {
            const existingPriority = priorityOrder[this.requestQueue[i].priority];
            if (priority > existingPriority) {
                insertIndex = i;
                break;
            }
        }
        
        this.requestQueue.splice(insertIndex, 0, request);
        this.metrics.queueLength = this.requestQueue.length;
    }

    /**
     * ⚙️ Start queue processor
     */
    private startQueueProcessor(): void {
        this.processingInterval = setInterval(async () => {
            if (this.requestQueue.length === 0) return;
            
            const activeCount = this.activeRequests.size;
            if (activeCount >= this.config.maxConcurrentRequests) return;
            
            // Process requests up to max concurrent limit
            const toProcess = Math.min(
                this.config.maxConcurrentRequests - activeCount,
                this.requestQueue.length
            );
            
            for (let i = 0; i < toProcess; i++) {
                const request = this.requestQueue.shift();
                if (request) {
                    this.processRequestAsync(request);
                }
            }
            
            this.metrics.queueLength = this.requestQueue.length;
            
        }, 10); // Check every 10ms
    }

    /**
     * 🔄 Process request asynchronously
     */
    private async processRequestAsync(request: InferenceRequest): Promise<void> {
        try {
            const result = await this.processRequest(request);
            this.emit('prediction:completed', result);
        } catch (error) {
            this.logger.error(`❌ Failed to process request ${request.id}:`, error);
            this.emit('prediction:failed', { requestId: request.id, error });
        }
    }

    /**
     * 🎯 Process individual inference request
     */
    private async processRequest(request: InferenceRequest): Promise<InferenceResult> {
        const startTime = Date.now();
        this.metrics.totalRequests++;
        
        try {
            this.logger.debug(`🎯 Processing inference request: ${request.id}`);
            
            // Load model (from cache or registry)
            const model = await this.loadModel(request.modelId);
            
            // Extract features
            const features = await this.extractFeatures(request.inputData);
            
            // Prepare input data
            const inputTensor = this.prepareInputData(features);
            
            // Run inference
            const prediction = await this.runInference(model, inputTensor);
            
            // Calculate confidence
            const confidence = this.calculateConfidence(prediction);
            
            const processingTime = Date.now() - startTime;
            this.updateLatencyMetrics(processingTime);
            
            const result: InferenceResult = {
                requestId: request.id,
                modelId: request.modelId,
                prediction: Array.isArray(prediction) ? prediction : [prediction],
                confidence,
                features: features.features,
                processing_time: processingTime,
                timestamp: Date.now(),
                status: 'success',
                metadata: request.metadata
            };
            
            this.metrics.successfulRequests++;
            this.emit('prediction:success', result);
            
            return result;
            
        } catch (error) {
            const processingTime = Date.now() - startTime;
            this.metrics.failedRequests++;
            
            const result: InferenceResult = {
                requestId: request.id,
                modelId: request.modelId,
                prediction: [],
                confidence: 0,
                features: {},
                processing_time: processingTime,
                timestamp: Date.now(),
                status: 'error',
                error: error instanceof Error ? error.message : String(error),
                metadata: request.metadata
            };
            
            this.emit('prediction:error', result);
            return result;
        }
    }

    /**
     * 📥 Load model (with caching)
     */
    private async loadModel(modelId: string): Promise<any> {
        // Check cache first
        if (this.config.enableCache && this.modelCache.has(modelId)) {
            const cached = this.modelCache.get(modelId)!;
            cached.lastUsed = new Date();
            cached.hitCount++;
            this.logger.debug(`📋 Model loaded from cache: ${modelId}`);
            return cached.model;
        }
        
        // Load from registry
        const metadata = this.modelRegistry.getModel(modelId);
        if (!metadata) {
            throw new Error(`Model ${modelId} not found in registry`);
        }
        
        if (metadata.status !== 'ready' && metadata.status !== 'deployed') {
            throw new Error(`Model ${modelId} is not ready (status: ${metadata.status})`);
        }
        
        const loadStartTime = Date.now();
        
        // Load model using TensorFlow
        const model = await this.tensorFlow.loadModel(metadata.artifacts.modelPath, modelId);
        
        const loadTime = Date.now() - loadStartTime;
        
        // Add to cache if enabled
        if (this.config.enableCache) {
            // Remove oldest if cache is full
            if (this.modelCache.size >= this.config.cacheSize) {
                const oldestKey = this.findOldestCacheEntry();
                if (oldestKey) {
                    this.modelCache.delete(oldestKey);
                }
            }
            
            this.modelCache.set(modelId, {
                modelId,
                model,
                metadata,
                lastUsed: new Date(),
                hitCount: 1,
                loadTime,
                memoryUsage: metadata.artifacts.size
            });
        }
        
        this.metrics.activeModels = this.modelCache.size;
        this.logger.debug(`📥 Model loaded: ${modelId} (${loadTime}ms)`);
        
        return model;
    }

    /**
     * 🔬 Extract features from input data
     */
    private async extractFeatures(inputData: Candle[]): Promise<FeatureSet> {
        if (inputData.length < 50) {
            throw new Error('Insufficient input data for feature extraction (minimum 50 candles)');
        }
        
        return await this.featureEngineer.extractFeatures(inputData, 'BTCUSDT', '15m');
    }

    /**
     * 📊 Prepare input data for model
     */
    private prepareInputData(features: FeatureSet): number[][] {
        const featureValues = Object.values(features.features);
        
        // Normalize features (simple min-max normalization)
        const normalized = featureValues.map(value => {
            if (!isFinite(value)) return 0;
            return Math.max(-5, Math.min(5, value)); // Clip to [-5, 5]
        });
        
        return [normalized]; // Batch of 1
    }

    /**
     * 🎯 Run model inference
     */
    private async runInference(model: any, inputData: number[][]): Promise<number | number[]> {
        // Use TensorFlow for prediction
        const predictionResults = await this.tensorFlow.predict(model, inputData);
        
        // Extract prediction from first result
        if (predictionResults.length > 0) {
            return predictionResults[0].prediction;
        }
        
        throw new Error('No prediction results returned');
    }

    /**
     * 📊 Calculate prediction confidence
     */
    private calculateConfidence(prediction: number | number[]): number {
        if (Array.isArray(prediction)) {
            // For multi-class, use max probability
            return Math.max(...prediction);
        } else {
            // For binary classification, distance from 0.5
            return Math.abs(prediction - 0.5) * 2;
        }
    }

    /**
     * 🔍 Find oldest cache entry
     */
    private findOldestCacheEntry(): string | null {
        let oldest: string | null = null;
        let oldestTime = Date.now();
        
        for (const [key, cache] of this.modelCache.entries()) {
            if (cache.lastUsed.getTime() < oldestTime) {
                oldestTime = cache.lastUsed.getTime();
                oldest = key;
            }
        }
        
        return oldest;
    }

    /**
     * 🔥 Warmup models
     */
    private async warmupModels(modelIds: string[]): Promise<void> {
        this.logger.info(`🔥 Warming up ${modelIds.length} models...`);
        
        for (const modelId of modelIds) {
            try {
                await this.loadModel(modelId);
                this.logger.debug(`🔥 Model warmed up: ${modelId}`);
            } catch (error) {
                this.logger.error(`❌ Failed to warmup model ${modelId}:`, error);
            }
        }
        
        this.logger.info(`✅ Model warmup completed`);
    }

    /**
     * 📊 Update latency metrics
     */
    private updateLatencyMetrics(latency: number): void {
        this.latencyHistory.push(latency);
        
        // Keep only last 1000 entries
        if (this.latencyHistory.length > 1000) {
            this.latencyHistory.shift();
        }
        
        // Calculate average latency
        this.metrics.averageLatency = this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;
    }

    /**
     * 📊 Start metrics collection
     */
    private startMetricsCollection(): void {
        setInterval(() => {
            // Calculate cache hit rate
            const totalHits = Array.from(this.modelCache.values()).reduce((acc, cache) => acc + cache.hitCount, 0);
            this.metrics.cacheHitRate = this.metrics.totalRequests > 0 ? totalHits / this.metrics.totalRequests : 0;
            
            // Calculate throughput (requests per second)
            this.metrics.throughput = this.metrics.totalRequests / ((Date.now() - (this as any).startTime) / 1000);
            
            // Calculate memory usage
            this.metrics.memoryUsage = Array.from(this.modelCache.values())
                .reduce((acc, cache) => acc + cache.memoryUsage, 0);
            
            this.emit('metrics:updated', this.metrics);
            
        }, 5000); // Update every 5 seconds
    }

    /**
     * 📊 Get inference metrics
     */
    public getMetrics(): InferenceMetrics {
        return { ...this.metrics };
    }

    /**
     * 📋 Get cache status
     */
    public getCacheStatus(): {
        size: number;
        capacity: number;
        hitRate: number;
        models: Array<{
            modelId: string;
            lastUsed: Date;
            hitCount: number;
            memoryUsage: number;
        }>;
    } {
        const models = Array.from(this.modelCache.values()).map(cache => ({
            modelId: cache.modelId,
            lastUsed: cache.lastUsed,
            hitCount: cache.hitCount,
            memoryUsage: cache.memoryUsage
        }));
        
        return {
            size: this.modelCache.size,
            capacity: this.config.cacheSize,
            hitRate: this.metrics.cacheHitRate,
            models
        };
    }

    /**
     * 🔧 Clear model cache
     */
    public clearCache(): void {
        this.modelCache.clear();
        this.metrics.activeModels = 0;
        this.logger.info('🔧 Model cache cleared');
    }

    /**
     * 🔧 Update configuration
     */
    public updateConfig(updates: Partial<InferenceConfig>): void {
        this.config = { ...this.config, ...updates };
        this.logger.info('🔧 Inference Engine configuration updated');
    }

    /**
     * 🧹 Cleanup
     */
    public cleanup(): void {
        this.stop();
        this.modelCache.clear();
        this.requestQueue = [];
        this.activeRequests.clear();
        this.latencyHistory = [];
        this.logger.info('🧹 Real-time Inference Engine cleaned up');
    }
}

export default RealTimeInferenceEngine;

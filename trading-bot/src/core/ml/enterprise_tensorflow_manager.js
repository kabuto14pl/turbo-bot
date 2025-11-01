"use strict";
/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🚀 ENTERPRISE TENSORFLOW BACKEND MANAGER
 * Configures TensorFlow.js Node backend for maximum performance
 * Provides 10-50x performance boost over CPU backend
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnterpriseTensorFlowManager = void 0;
const tf = __importStar(require("@tensorflow/tfjs"));
require("@tensorflow/tfjs-node"); // Import Node.js backend
const logger_1 = require("../../../core/utils/logger");
/**
 * Enterprise TensorFlow Backend Manager
 * Configures optimal backend for maximum ML performance
 */
class EnterpriseTensorFlowManager {
    constructor() {
        this.isInitialized = false;
        this.logger = new logger_1.Logger();
        this.config = this.createDefaultConfig();
        this.performanceMetrics = {
            backendName: 'unknown',
            isReady: false,
            numThreads: 0,
            memoryUsage: {
                numTensors: 0,
                numBytes: 0
            }
        };
    }
    /**
     * Singleton instance getter
     */
    static getInstance() {
        if (!EnterpriseTensorFlowManager.instance) {
            EnterpriseTensorFlowManager.instance = new EnterpriseTensorFlowManager();
        }
        return EnterpriseTensorFlowManager.instance;
    }
    /**
     * Initialize Enterprise TensorFlow Backend
     */
    async initializeBackend(config) {
        if (this.isInitialized) {
            this.logger.info('🚀 TensorFlow Backend already initialized');
            return;
        }
        try {
            this.logger.info('🚀 Initializing Enterprise TensorFlow Backend...');
            // Merge configuration
            if (config) {
                this.config = { ...this.config, ...config };
            }
            // Configure TensorFlow environment
            await this.configureTensorFlowEnvironment();
            // Initialize backend based on configuration
            if (this.config.enableNodeBackend) {
                await this.initializeNodeBackend();
            }
            else {
                this.logger.warn('⚠️  Node backend disabled, using CPU backend (slower)');
            }
            // Configure memory management
            this.configureMemoryManagement();
            // Collect performance metrics
            await this.collectPerformanceMetrics();
            // Run benchmark if enabled
            if (this.config.enableProfiling) {
                await this.runPerformanceBenchmark();
            }
            this.isInitialized = true;
            this.logInitializationSummary();
        }
        catch (error) {
            this.logger.error('❌ Failed to initialize TensorFlow Backend:', error);
            throw error;
        }
    }
    /**
     * Configure TensorFlow environment variables
     */
    async configureTensorFlowEnvironment() {
        this.logger.info('⚙️  Configuring TensorFlow environment...');
        // Set number of threads for optimal performance
        if (this.config.numThreads) {
            process.env.TF_NUM_INTEROP_THREADS = this.config.numThreads.toString();
            process.env.TF_NUM_INTRAOP_THREADS = this.config.numThreads.toString();
            this.logger.info(`🧵 Set TensorFlow threads: ${this.config.numThreads}`);
        }
        // Enable CPU optimizations
        process.env.TF_CPP_MIN_LOG_LEVEL = this.config.debugMode ? '0' : '2';
        // Memory optimization
        if (this.config.optimizeMemory) {
            process.env.TF_FORCE_GPU_ALLOW_GROWTH = 'true';
            this.logger.info('💾 Memory optimization enabled');
        }
        // Set SIMD and AVX optimizations (if available)
        process.env.TF_ENABLE_ONEDNN_OPTS = '1';
        this.logger.info('✅ TensorFlow environment configured');
    }
    /**
     * Initialize Node.js backend for maximum performance
     */
    async initializeNodeBackend() {
        try {
            this.logger.info('🚀 Initializing TensorFlow.js Node Backend...');
            // Ensure we're using the Node backend
            await tf.ready();
            const backend = tf.getBackend();
            this.logger.info(`🔧 Current backend: ${backend}`);
            if (backend === 'tensorflow') {
                this.logger.info('✅ TensorFlow.js Node Backend active');
                this.performanceMetrics.backendName = 'tensorflow';
            }
            else {
                this.logger.warn(`⚠️  Expected 'tensorflow' backend, got '${backend}'`);
                // Try to switch to node backend
                if (tf.findBackend('tensorflow')) {
                    await tf.setBackend('tensorflow');
                    this.logger.info('🔄 Switched to TensorFlow Node backend');
                    this.performanceMetrics.backendName = 'tensorflow';
                }
                else {
                    this.logger.error('❌ TensorFlow Node backend not available');
                    this.performanceMetrics.backendName = backend;
                }
            }
            // Verify backend is ready
            this.performanceMetrics.isReady = tf.getBackend() === 'tensorflow';
        }
        catch (error) {
            this.logger.error('❌ Node backend initialization failed:', error);
            if (this.config.enableCpuFallback) {
                this.logger.info('🔄 Falling back to CPU backend...');
                this.performanceMetrics.backendName = tf.getBackend();
                this.performanceMetrics.isReady = true;
            }
            else {
                throw error;
            }
        }
    }
    /**
     * Configure memory management for optimal performance
     */
    configureMemoryManagement() {
        this.logger.info('💾 Configuring memory management...');
        // Configure tensor disposal
        tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0.5);
        tf.env().set('WEBGL_FORCE_F16_TEXTURES', false);
        // Enable memory growth if configured
        if (this.config.memoryGrowth) {
            tf.env().set('WEBGL_MEMORY_GROWTH', true);
            this.logger.info('📈 Memory growth enabled');
        }
        // Set memory threshold for cleanup
        tf.env().set('WEBGL_MAX_TEXTURE_SIZE', 4096);
        this.logger.info('✅ Memory management configured');
    }
    /**
     * Collect comprehensive performance metrics
     */
    async collectPerformanceMetrics() {
        try {
            this.logger.info('📊 Collecting performance metrics...');
            // Get memory information
            const memoryInfo = tf.memory();
            this.performanceMetrics.memoryUsage = {
                numTensors: memoryInfo.numTensors,
                numBytes: memoryInfo.numBytes
            };
            // Get thread information
            this.performanceMetrics.numThreads = this.config.numThreads ||
                (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4) || 4;
            // Get CPU information (Node.js only)
            if (typeof process !== 'undefined') {
                const os = require('os');
                this.performanceMetrics.cpuInfo = {
                    model: os.cpus()[0]?.model || 'Unknown',
                    cores: os.cpus().length,
                    architecture: process.arch
                };
            }
            this.logger.info('✅ Performance metrics collected');
        }
        catch (error) {
            this.logger.warn('⚠️  Failed to collect some performance metrics:', error);
        }
    }
    /**
     * Run performance benchmark to measure backend speed
     */
    async runPerformanceBenchmark() {
        try {
            this.logger.info('🏃 Running performance benchmark...');
            const benchmarkResults = {
                matrixMultiplicationMs: 0,
                convolutionMs: 0,
                inferenceLatencyMs: 0
            };
            // Matrix multiplication benchmark
            const matrixStart = Date.now();
            const a = tf.randomNormal([1000, 1000]);
            const b = tf.randomNormal([1000, 1000]);
            const result = tf.matMul(a, b);
            await result.data(); // Force computation
            benchmarkResults.matrixMultiplicationMs = Date.now() - matrixStart;
            // Cleanup
            a.dispose();
            b.dispose();
            result.dispose();
            // Convolution benchmark
            const convStart = Date.now();
            const input = tf.randomNormal([1, 224, 224, 3]);
            const filter = tf.randomNormal([3, 3, 3, 32]);
            const conv = tf.conv2d(input, filter, 1, 'same');
            await conv.data(); // Force computation
            benchmarkResults.convolutionMs = Date.now() - convStart;
            // Cleanup
            input.dispose();
            filter.dispose();
            conv.dispose();
            // Simple inference benchmark
            const inferenceStart = Date.now();
            const testInput = tf.randomNormal([1, 100]);
            const weights = tf.randomNormal([100, 50]);
            const bias = tf.randomNormal([50]);
            const output = tf.add(tf.matMul(testInput, weights), bias);
            await output.data(); // Force computation
            benchmarkResults.inferenceLatencyMs = Date.now() - inferenceStart;
            // Cleanup
            testInput.dispose();
            weights.dispose();
            bias.dispose();
            output.dispose();
            this.performanceMetrics.benchmarkResults = benchmarkResults;
            this.logger.info('✅ Performance benchmark completed');
            this.logger.info(`⚡ Matrix Multiplication: ${benchmarkResults.matrixMultiplicationMs}ms`);
            this.logger.info(`🔄 Convolution: ${benchmarkResults.convolutionMs}ms`);
            this.logger.info(`🚀 Inference Latency: ${benchmarkResults.inferenceLatencyMs}ms`);
        }
        catch (error) {
            this.logger.warn('⚠️  Performance benchmark failed:', error);
        }
    }
    /**
     * Log comprehensive initialization summary
     */
    logInitializationSummary() {
        this.logger.info('🎯 === ENTERPRISE TENSORFLOW BACKEND SUMMARY ===');
        this.logger.info(`🔧 Backend: ${this.performanceMetrics.backendName}`);
        this.logger.info(`✅ Ready: ${this.performanceMetrics.isReady}`);
        this.logger.info(`🧵 Threads: ${this.performanceMetrics.numThreads}`);
        this.logger.info(`💾 Memory: ${this.performanceMetrics.memoryUsage.numTensors} tensors, ${(this.performanceMetrics.memoryUsage.numBytes / 1024 / 1024).toFixed(2)} MB`);
        if (this.performanceMetrics.cpuInfo) {
            this.logger.info(`💻 CPU: ${this.performanceMetrics.cpuInfo.cores} cores, ${this.performanceMetrics.cpuInfo.architecture}`);
        }
        if (this.performanceMetrics.benchmarkResults) {
            this.logger.info(`⚡ Performance: MatMul ${this.performanceMetrics.benchmarkResults.matrixMultiplicationMs}ms, Conv ${this.performanceMetrics.benchmarkResults.convolutionMs}ms, Inference ${this.performanceMetrics.benchmarkResults.inferenceLatencyMs}ms`);
        }
        this.logger.info('================================================');
    }
    /**
     * Create default configuration
     */
    createDefaultConfig() {
        const cpuCount = typeof process !== 'undefined' ?
            require('os').cpus().length : 4;
        return {
            enableNodeBackend: true,
            numThreads: Math.max(2, Math.min(cpuCount, 8)), // Optimal thread count
            enableCpuFallback: true,
            memoryGrowth: true,
            debugMode: false,
            enableProfiling: true,
            optimizeMemory: true,
            enableGPU: false // GPU support for future enhancement
        };
    }
    /**
     * Get current performance metrics
     */
    getPerformanceMetrics() {
        // Update memory usage
        const memoryInfo = tf.memory();
        this.performanceMetrics.memoryUsage = {
            numTensors: memoryInfo.numTensors,
            numBytes: memoryInfo.numBytes
        };
        return { ...this.performanceMetrics };
    }
    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Check if backend is properly initialized
     */
    isBackendReady() {
        return this.isInitialized && this.performanceMetrics.isReady;
    }
    /**
     * Dispose and cleanup
     */
    dispose() {
        this.logger.info('🔄 Disposing Enterprise TensorFlow Manager...');
        this.isInitialized = false;
        // Note: We don't dispose TensorFlow backend itself as it might be used by other components
        this.logger.info('✅ Enterprise TensorFlow Manager disposed');
    }
}
exports.EnterpriseTensorFlowManager = EnterpriseTensorFlowManager;

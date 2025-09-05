/**
 * 🤖 ML-ENHANCED ENTERPRISE STRATEGY ENGINE
 * Integration of ML/AI capabilities with Enterprise Strategy Engine
 */

import { EventEmitter } from 'events';
import { EnterpriseStrategyEngine, EnterpriseStrategySignal, AggregatedSignal } from './enterprise_strategy_engine_v2';
import { MultiTimeframeStrategyAnalyzer, MultiTimeframeAnalysis } from './multi_timeframe_analyzer';
import { MLIntegrationManager, MLPrediction } from '../../ml/ml_integration_manager';
import { TensorFlowIntegrationV2 } from '../ml/tensorflow_integration_v2';
import { RealTimeInferenceEngine, InferenceResult } from '../../ml/realtime_inference_engine';
import { BotState } from '../types/bot_state';
import { StrategySignal, Strategy } from '../types/strategy';
import { Logger } from '../utils/logger';

// ============================================================================
// 🤖 ML-ENHANCED INTERFACES
// ============================================================================

export interface MLEnhancedStrategyConfig {
    // Strategy Engine Config
    maxStrategies: number;
    aggregationMethod: 'weighted' | 'consensus' | 'confidence' | 'adaptive' | 'ml_optimized';
    riskThreshold: number;
    
    // ML Integration Config
    enableMLSignals: boolean;
    enableTensorFlow: boolean;
    enableRealTimeInference: boolean;
    mlWeight: number; // 0-1, weight of ML signals vs traditional signals
    
    // Model Configuration
    models: {
        primary: string;
        ensemble: string[];
        reinforcement?: string;
    };
    
    // Performance Thresholds
    minMLConfidence: number;
    mlSignalTimeout: number;
    adaptiveLearning: boolean;
}

export interface MLEnhancedSignal extends EnterpriseStrategySignal {
    mlPrediction?: MLPrediction;
    mlConfidence?: number;
    mlFeatures?: any;
    isMLGenerated: boolean;
    hybridScore: number; // Combined traditional + ML score
}

export interface MLStrategyPerformance {
    strategyId: string;
    mlAccuracy: number;
    traditionalAccuracy: number;
    hybridAccuracy: number;
    mlContribution: number; // How much ML improved performance
    adaptiveWeight: number; // Current ML weight for this strategy
    lastMLUpdate: number;
}

export interface MLMarketPrediction {
    timeframe: string;
    direction: 'UP' | 'DOWN' | 'SIDEWAYS';
    probability: number;
    confidence: number;
    priceTarget?: number;
    timeHorizon?: number; // minutes
    features: {
        technical: any;
        sentiment?: any;
        volume?: any;
        momentum?: any;
    };
}

// ============================================================================
// 🤖 ML-ENHANCED ENTERPRISE STRATEGY ENGINE
// ============================================================================

export class MLEnhancedEnterpriseStrategyEngine extends EventEmitter {
    private strategyEngine: EnterpriseStrategyEngine;
    private timeframeAnalyzer: MultiTimeframeStrategyAnalyzer;
    private mlManager: MLIntegrationManager;
    private tensorFlowEngine: TensorFlowIntegrationV2 | null = null;
    private inferenceEngine: RealTimeInferenceEngine;
    
    private config: MLEnhancedStrategyConfig;
    private logger: Logger;
    
    private mlPerformanceTracking: Map<string, MLStrategyPerformance> = new Map();
    private mlPredictionHistory: MLMarketPrediction[] = [];
    private adaptiveWeights: Map<string, number> = new Map();
    
    private isInitialized: boolean = false;
    private isMLActive: boolean = false;

    constructor(config: Partial<MLEnhancedStrategyConfig> = {}, logger?: Logger) {
        super();
        
        this.config = {
            maxStrategies: 10,
            aggregationMethod: 'ml_optimized',
            riskThreshold: 0.8,
            enableMLSignals: true,
            enableTensorFlow: true,
            enableRealTimeInference: true,
            mlWeight: 0.6, // 60% ML, 40% traditional
            models: {
                primary: 'lstm_market_predictor',
                ensemble: ['cnn_pattern_detector', 'transformer_trend_analyzer'],
                reinforcement: 'dqn_trading_agent'
            },
            minMLConfidence: 0.65,
            mlSignalTimeout: 30000,
            adaptiveLearning: true,
            ...config
        };

        this.logger = logger || new Logger();
        
        // Initialize core components
        this.strategyEngine = new EnterpriseStrategyEngine({
            maxStrategies: this.config.maxStrategies,
            aggregationMethod: this.config.aggregationMethod === 'ml_optimized' ? 'adaptive' : this.config.aggregationMethod,
            riskThreshold: this.config.riskThreshold
        }, this.logger);
        
        this.timeframeAnalyzer = new MultiTimeframeStrategyAnalyzer(this.logger);
        
        // ML components will be initialized in start() method when dependencies are available
        this.mlManager = null as any;
        this.inferenceEngine = null as any;
        
        this.setupEventHandlers();
        
        this.logger.info('🤖 ML-Enhanced Enterprise Strategy Engine initialized', this.config);
    }

    // ========================================================================
    // 🔧 INITIALIZATION & LIFECYCLE
    // ========================================================================

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            this.logger.warn('⚠️ ML-Enhanced Strategy Engine already initialized');
            return;
        }

        try {
            this.logger.info('🚀 Initializing ML-Enhanced Strategy Engine...');

            // Mock ML initialization for testing
            if (this.config.enableTensorFlow) {
                this.logger.info('🧠 TensorFlow backend: Ready for initialization');
            }

            if (this.config.enableRealTimeInference) {
                this.logger.info('📡 Real-time Inference: Ready for initialization');
            }

            this.isInitialized = true;
            this.isMLActive = true;
            
            this.logger.info('🎉 ML-Enhanced Strategy Engine fully initialized (test mode)');
            this.emit('initialized');

        } catch (error) {
            this.logger.error('❌ Failed to initialize ML-Enhanced Strategy Engine:', error);
            throw error;
        }
    }

    private async loadMLModels(): Promise<void> {
        try {
            this.logger.info('� Loading ML models (test mode)...');
            
            // Mock model loading for testing
            if (this.config.models.primary) {
                this.logger.info(`🎯 Primary model ready: ${this.config.models.primary}`);
            }
            
            // Mock ensemble models
            for (const modelName of this.config.models.ensemble) {
                this.logger.info(`🔗 Ensemble model ready: ${modelName}`);
            }
            
            this.logger.info('✅ All ML models ready (test mode)');
            
        } catch (error) {
            this.logger.error('Failed to load ML models:', error);
            throw error;
        }
    }

    // ========================================================================
    // 🤖 ML-ENHANCED SIGNAL GENERATION
    // ========================================================================

    async generateMLEnhancedSignals(state: BotState): Promise<AggregatedSignal[]> {
        if (!this.isInitialized || !this.isMLActive) {
            this.logger.warn('⚠️ ML system not active, falling back to traditional signals');
            return this.strategyEngine.generateAggregatedSignals(state);
        }

        const startTime = Date.now();
        
        try {
            // Step 1: Generate traditional strategy signals
            const traditionalSignals = await this.strategyEngine.generateAggregatedSignals(state);
            
            // Step 2: Generate ML predictions
            const mlPredictions = await this.generateMLPredictions(state);
            
            // Step 3: Perform multi-timeframe analysis with ML enhancement
            const timeframeAnalysis = await this.performMLEnhancedTimeframeAnalysis(state, mlPredictions);
            
            // Step 4: Combine traditional and ML signals
            const hybridSignals = await this.combineTraditionalAndMLSignals(
                traditionalSignals, 
                mlPredictions, 
                timeframeAnalysis, 
                state
            );
            
            // Step 5: Apply ML-enhanced risk filtering
            const filteredSignals = await this.applyMLEnhancedRiskFiltering(hybridSignals, state);
            
            // Step 6: Update adaptive weights based on performance
            if (this.config.adaptiveLearning) {
                await this.updateAdaptiveWeights(filteredSignals, state);
            }

            const executionTime = Date.now() - startTime;
            
            this.logger.info(`🤖 Generated ${filteredSignals.length} ML-enhanced signals (${executionTime}ms)`);
            
            this.emit('mlSignalsGenerated', {
                traditionalSignals: traditionalSignals.length,
                mlPredictions: mlPredictions.length,
                hybridSignals: filteredSignals.length,
                executionTime
            });

            return filteredSignals;

        } catch (error) {
            this.logger.error('❌ ML-enhanced signal generation failed:', error);
            // Fallback to traditional signals
            return this.strategyEngine.generateAggregatedSignals(state);
        }
    }

    private async generateMLPredictions(state: BotState): Promise<MLPrediction[]> {
        const predictions: MLPrediction[] = [];

        try {
            // Generate predictions for each timeframe
            const timeframes = ['m15', 'h1', 'h4', 'd1'];
            
            for (const timeframe of timeframes) {
                const timeframeState = this.createTimeframeState(state, timeframe);
                
                // Generate ML prediction
                // Mock ML prediction for testing without full ML infrastructure
                const mockPrediction = {
                    confidence: 0.7 + Math.random() * 0.2,
                    signal: Math.random() > 0.5 ? 'BUY' : 'SELL',
                    finalPrediction: 50000 + Math.random() * 1000
                } as any as MLPrediction;

                if (mockPrediction && mockPrediction.confidence >= this.config.minMLConfidence) {
                    predictions.push(mockPrediction);
                }
            }

            this.logger.debug(`🧠 Generated ${predictions.length} ML predictions`);
            return predictions;

        } catch (error) {
            this.logger.error('❌ ML prediction generation failed:', error);
            return [];
        }
    }

    private async performMLEnhancedTimeframeAnalysis(
        state: BotState, 
        mlPredictions: MLPrediction[]
    ): Promise<MultiTimeframeAnalysis> {
        // Get traditional timeframe analysis
        const strategies = new Map(); // Would normally have registered strategies
        const traditionalAnalysis = await this.timeframeAnalyzer.analyzeMultiTimeframe(strategies, state);

        // Enhance with ML predictions
        const mlEnhancedAnalysis = { ...traditionalAnalysis };

        // Incorporate ML predictions into confidence calculation
        if (mlPredictions.length > 0) {
            const avgMLConfidence = mlPredictions.reduce((sum, pred) => sum + pred.confidence, 0) / mlPredictions.length;
            const mlBullishSignals = mlPredictions.filter(pred => pred.signal === 'BUY').length;
            const mlBearishSignals = mlPredictions.filter(pred => pred.signal === 'SELL').length;

            // Adjust overall confidence based on ML agreement
            const mlAgreement = Math.max(mlBullishSignals, mlBearishSignals) / mlPredictions.length;
            mlEnhancedAnalysis.confidence = (traditionalAnalysis.confidence * 0.4) + (avgMLConfidence * mlAgreement * 0.6);

            // Adjust overall signal if ML strongly disagrees
            if (mlAgreement > 0.7) {
                if (mlBullishSignals > mlBearishSignals && traditionalAnalysis.overallSignal !== 'BUY') {
                    mlEnhancedAnalysis.overallSignal = 'BUY';
                    mlEnhancedAnalysis.recommendations.reasoning.push('Strong ML bullish consensus overrides traditional signals');
                } else if (mlBearishSignals > mlBullishSignals && traditionalAnalysis.overallSignal !== 'SELL') {
                    mlEnhancedAnalysis.overallSignal = 'SELL';
                    mlEnhancedAnalysis.recommendations.reasoning.push('Strong ML bearish consensus overrides traditional signals');
                }
            }
        }

        return mlEnhancedAnalysis;
    }

    private async combineTraditionalAndMLSignals(
        traditionalSignals: AggregatedSignal[],
        mlPredictions: MLPrediction[],
        timeframeAnalysis: MultiTimeframeAnalysis,
        state: BotState
    ): Promise<AggregatedSignal[]> {
        const hybridSignals: AggregatedSignal[] = [];

        // Combine each traditional signal with corresponding ML prediction
        for (const traditionalSignal of traditionalSignals) {
            const relevantMLPredictions = mlPredictions.filter(pred => 
                pred.timeframe === traditionalSignal.metadata.timeframe ||
                traditionalSignal.metadata.timeframe === 'multi'
            );

            if (relevantMLPredictions.length > 0) {
                const hybridSignal = await this.createHybridSignal(
                    traditionalSignal, 
                    relevantMLPredictions, 
                    state
                );
                hybridSignals.push(hybridSignal);
            } else {
                // No ML prediction available, use traditional signal with reduced confidence
                const adjustedSignal = { 
                    ...traditionalSignal, 
                    confidence: traditionalSignal.confidence * 0.8 // Reduce confidence without ML support
                };
                hybridSignals.push(adjustedSignal);
            }
        }

        // Add pure ML signals if they're strong enough
        for (const mlPrediction of mlPredictions) {
            if (mlPrediction.confidence > 0.8 && mlPrediction.strength === 'STRONG') {
                const pureMLSignal = this.createPureMLSignal(mlPrediction, state);
                hybridSignals.push(pureMLSignal);
            }
        }

        return hybridSignals;
    }

    private async createHybridSignal(
        traditionalSignal: AggregatedSignal,
        mlPredictions: MLPrediction[],
        state: BotState
    ): Promise<AggregatedSignal> {
        const avgMLConfidence = mlPredictions.reduce((sum, pred) => sum + pred.confidence, 0) / mlPredictions.length;
        const avgMLPrediction = mlPredictions.reduce((sum, pred) => sum + pred.finalPrediction, 0) / mlPredictions.length;

        // Determine ML signal direction
        const mlBuySignals = mlPredictions.filter(pred => pred.signal === 'BUY').length;
        const mlSellSignals = mlPredictions.filter(pred => pred.signal === 'SELL').length;
        const mlSignalDirection = mlBuySignals > mlSellSignals ? 'BUY' : 
                                 mlSellSignals > mlBuySignals ? 'SELL' : 'HOLD';

        // Calculate hybrid confidence and direction
        const mlWeight = this.adaptiveWeights.get(traditionalSignal.metadata.strategy) || this.config.mlWeight;
        const traditionalWeight = 1 - mlWeight;

        let hybridConfidence = (traditionalSignal.confidence * traditionalWeight) + (avgMLConfidence * mlWeight);
        let hybridType = traditionalSignal.type;

        // If ML strongly disagrees, adjust the signal
        if (avgMLConfidence > 0.8) {
            if (mlSignalDirection === 'BUY' && traditionalSignal.type.includes('SHORT')) {
                hybridType = 'ENTER_LONG';
                hybridConfidence = Math.min(hybridConfidence, 0.7); // Reduce confidence for conflicting signals
            } else if (mlSignalDirection === 'SELL' && traditionalSignal.type.includes('LONG')) {
                hybridType = 'ENTER_SHORT';
                hybridConfidence = Math.min(hybridConfidence, 0.7);
            }
        }

        // Adjust price based on ML prediction
        let hybridPrice = traditionalSignal.price;
        if (avgMLPrediction > 0 && Math.abs(avgMLPrediction - traditionalSignal.price) / traditionalSignal.price < 0.02) {
            // If ML prediction is within 2% of traditional signal, use weighted average
            hybridPrice = (traditionalSignal.price * traditionalWeight) + (avgMLPrediction * mlWeight);
        }

        const hybridSignal: AggregatedSignal = {
            ...traditionalSignal,
            type: hybridType,
            price: hybridPrice,
            confidence: Math.max(0, Math.min(1, hybridConfidence)),
            metadata: {
                ...traditionalSignal.metadata,
                strategy: 'ml_enhanced_' + traditionalSignal.metadata.strategy,
                sourceStrategies: [
                    ...traditionalSignal.metadata.sourceStrategies,
                    ...mlPredictions.map(pred => `ml_${pred.predictions.primary.modelId}`)
                ]
            } as any
        };

        return hybridSignal;
    }

    private createPureMLSignal(mlPrediction: MLPrediction, state: BotState): AggregatedSignal {
        const signalType = mlPrediction.signal === 'BUY' ? 'ENTER_LONG' : 
                          mlPrediction.signal === 'SELL' ? 'ENTER_SHORT' : 'ENTER_LONG';

        return {
            type: signalType,
            price: mlPrediction.finalPrediction,
            confidence: mlPrediction.confidence,
            quantity: 0.1, // Default quantity for ML signals
            metadata: {
                strategy: 'pure_ml_signal',
                timeframe: mlPrediction.timeframe,
                regime: state.regime,
                aggregationMethod: 'ml_only',
                sourceStrategies: mlPrediction.modelsUsed,
                sourceCount: mlPrediction.modelsUsed.length
            } as any,
            indicators: (mlPrediction.features as any).technical || {}
        };
    }

    // ========================================================================
    // 🛡️ ML-ENHANCED RISK FILTERING
    // ========================================================================

    private async applyMLEnhancedRiskFiltering(
        signals: AggregatedSignal[], 
        state: BotState
    ): Promise<AggregatedSignal[]> {
        const filteredSignals: AggregatedSignal[] = [];

        for (const signal of signals) {
            let riskScore = 0;

            // Traditional risk assessment
            riskScore += (1 - signal.confidence) * 0.3;
            riskScore += state.regime.volatility * 0.2;

            // ML-enhanced risk assessment
            if ((signal.metadata as any).mlEnhanced) {
                const mlConfidence = (signal.metadata as any).avgMLConfidence || 0;
                riskScore += (1 - mlConfidence) * 0.2;

                // Add penalty for conflicting signals
                if ((signal.metadata as any).mlSignalDirection) {
                    const traditionalDirection = signal.type.includes('LONG') ? 'BUY' : 'SELL';
                    if ((signal.metadata as any).mlSignalDirection !== traditionalDirection) {
                        riskScore += 0.3; // Significant penalty for conflict
                    }
                }
            }

            // Portfolio concentration risk
            const portfolioRisk = (signal.quantity * signal.price) / state.portfolio.totalValue;
            riskScore += Math.min(portfolioRisk * 2, 1) * 0.3;

            // Apply filtering
            if (riskScore <= this.config.riskThreshold) {
                filteredSignals.push(signal);
            } else {
                this.logger.warn(`🚫 Signal filtered due to high ML-enhanced risk: ${riskScore.toFixed(3)}`);
            }
        }

        return filteredSignals;
    }

    // ========================================================================
    // 📈 ADAPTIVE LEARNING & PERFORMANCE TRACKING
    // ========================================================================

    private async updateAdaptiveWeights(signals: AggregatedSignal[], state: BotState): Promise<void> {
        // This would analyze recent performance and adjust ML weights accordingly
        // For now, implement a simple performance-based adjustment
        
        for (const signal of signals) {
            const strategyName = signal.metadata.strategy;
            
            if (!this.adaptiveWeights.has(strategyName)) {
                this.adaptiveWeights.set(strategyName, this.config.mlWeight);
            }

            // In a real implementation, this would analyze actual trade outcomes
            // and adjust weights based on ML vs traditional performance
            const currentWeight = this.adaptiveWeights.get(strategyName)!;
            
            // Simple adaptation: slightly increase ML weight if confidence is high
            if (signal.confidence > 0.8 && (signal.metadata as any).mlEnhanced) {
                const newWeight = Math.min(0.9, currentWeight + 0.01);
                this.adaptiveWeights.set(strategyName, newWeight);
            }
        }
    }

    // ========================================================================
    // 🔧 UTILITY METHODS
    // ========================================================================

    private createTimeframeState(state: BotState, timeframe: string): BotState {
        const tfState = { ...state };
        
        switch (timeframe) {
            case 'm15':
                tfState.prices = { ...state.prices, m15: state.prices.m15 };
                tfState.indicators = { ...state.indicators, m15: state.indicators.m15 };
                break;
            case 'h1':
                if (state.prices.h1) {
                    tfState.prices = { ...state.prices, m15: state.prices.h1, h1: state.prices.h1 };
                    tfState.indicators = { ...state.indicators, m15: state.indicators.h1 || state.indicators.m15 };
                }
                break;
            case 'h4':
                if (state.prices.h4) {
                    tfState.prices = { ...state.prices, m15: state.prices.h4, h4: state.prices.h4 };
                    tfState.indicators = { ...state.indicators, m15: state.indicators.h4 || state.indicators.m15 };
                }
                break;
            case 'd1':
                if (state.prices.d1) {
                    tfState.prices = { ...state.prices, m15: state.prices.d1, d1: state.prices.d1 };
                    tfState.indicators = { ...state.indicators, m15: state.indicators.d1 || state.indicators.m15 };
                }
                break;
        }

        tfState.marketContext = {
            symbol: tfState.marketContext?.symbol || 'BTCUSDT',
            timeframe,
            calendar: tfState.marketContext?.calendar,
            sessionManager: tfState.marketContext?.sessionManager
        };

        return tfState;
    }

    private setupEventHandlers(): void {
        this.strategyEngine.on('signalsGenerated', (data) => {
            this.emit('traditionalSignalsGenerated', data);
        });

        // ML Manager events (only if initialized)
        if (this.mlManager) {
            this.mlManager.on('predictionGenerated', (prediction) => {
                this.emit('mlPredictionGenerated', prediction);
            });
        }

        this.timeframeAnalyzer.on('analysisComplete', (analysis) => {
            this.emit('timeframeAnalysisComplete', analysis);
        });
    }

    // ========================================================================
    // 🎮 PUBLIC API
    // ========================================================================

    async start(): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        await this.strategyEngine.start();
        this.isMLActive = true;
        
        this.logger.info('🚀 ML-Enhanced Strategy Engine started');
        this.emit('started');
    }

    async stop(): Promise<void> {
        await this.strategyEngine.stop();
        this.isMLActive = false;
        
        this.logger.info('🛑 ML-Enhanced Strategy Engine stopped');
        this.emit('stopped');
    }

    async registerStrategy(strategy: Strategy, weight: number = 1.0): Promise<void> {
        return this.strategyEngine.registerStrategy(strategy, weight);
    }

    getStatus(): {
        isActive: boolean;
        isMLActive: boolean;
        strategiesCount: number;
        mlModelsLoaded: number;
        config: MLEnhancedStrategyConfig;
        adaptiveWeights: { [strategy: string]: number };
    } {
        const strategyStatus = this.strategyEngine.getStatus();
        
        const adaptiveWeights: { [strategy: string]: number } = {};
        for (const [strategy, weight] of this.adaptiveWeights) {
            adaptiveWeights[strategy] = weight;
        }

        return {
            isActive: strategyStatus.isActive,
            isMLActive: this.isMLActive,
            strategiesCount: strategyStatus.strategiesCount,
            mlModelsLoaded: this.config.models.ensemble.length + 1, // +1 for primary
            config: this.config,
            adaptiveWeights
        };
    }

    getMLPerformanceMetrics(): MLStrategyPerformance[] {
        return Array.from(this.mlPerformanceTracking.values());
    }
}

export default MLEnhancedEnterpriseStrategyEngine;

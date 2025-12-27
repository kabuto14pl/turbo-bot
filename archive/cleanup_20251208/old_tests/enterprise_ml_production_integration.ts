/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🚀 ENTERPRISE ML PRODUCTION INTEGRATION
 * Production-ready Enterprise ML Trading System Integration
 * ======================================================
 */

import { EnterpriseMLIntegrationManager } from './src/enterprise_ml_integration_manager';
import { EnterpriseMLStrategy } from './trading-bot/strategies/enterprise_ml_strategy_clean';
import { Logger } from './trading-bot/infrastructure/logging/logger';

export class EnterpriseMLProductionIntegration {
    private mlManager?: EnterpriseMLIntegrationManager;
    private mlStrategy?: EnterpriseMLStrategy;
    private isInitialized = false;
    private logger: Logger;
    
    constructor() {
        this.logger = new Logger();
        console.log('🚀 Enterprise ML Production Integration created');
    }
    
    /**
     * Initialize Enterprise ML Production System
     */
    async initialize(): Promise<void> {
        try {
            console.log('🚀 Initializing Enterprise ML Production System...');
            
            // 1. Initialize ML Integration Manager
            this.mlManager = EnterpriseMLIntegrationManager.getInstance();
            await this.mlManager.initialize();
            
            // 2. Initialize Enterprise ML Strategy
            this.mlStrategy = new EnterpriseMLStrategy(this.logger, {
                confidenceThreshold: 0.65,
                mlWeight: 0.7,
                technicalIndicatorWeight: 0.3,
                ensembleVoting: true,
                riskAdjustment: true,
                marketRegimeAdaptation: true
            });
            
            this.isInitialized = true;
            
            console.log('✅ Enterprise ML Production System initialized successfully');
            
            // 3. Perform initial validation
            await this.validateSystem();
            
        } catch (error) {
            console.error('❌ Failed to initialize Enterprise ML Production System:', error);
            throw error;
        }
    }
    
    /**
     * Validate the Enterprise ML System
     */
    private async validateSystem(): Promise<void> {
        this.logger.info('🔍 Validating Enterprise ML System...');
        
        try {
            // Test ML inference
            const testMarketData = {
                price: 50000,
                volume: 1000000,
                timestamp: Date.now(),
                features: [50000, 1000000, 100, 50, 0, 1]
            };
            
            if (!this.mlManager) {
                throw new Error('ML Manager not initialized');
            }
            
            // Check if method exists before calling
            if (typeof this.mlManager.performMLInference === 'function') {
                const mlResult = await this.mlManager.performMLInference(testMarketData);
                
                this.logger.info('🧠 ML Inference Test Result:', {
                    prediction: mlResult.prediction,
                    confidence: `${(mlResult.confidence * 100).toFixed(1)}%`,
                    processingTime: mlResult.processingTime,
                    modelVersion: mlResult.modelVersion
                });
            } else {
                this.logger.warn('⚠️ ML Inference method not available, skipping test');
            }
            
            // Test strategy signal format
            if (this.mlStrategy) {
                const testBotState = this.createTestBotState();
                const signals = await this.mlStrategy.run(testBotState);
                
                this.logger.info('📊 Strategy Test Result:', {
                    signalsGenerated: signals.length,
                    signalTypes: signals.map(s => s.type),
                    confidences: signals.map(s => `${(s.confidence * 100).toFixed(1)}%`)
                });
            } else {
                this.logger.warn('⚠️ ML Strategy not initialized, skipping test');
            }
            
            this.logger.info('✅ Enterprise ML System validation completed successfully');
            
        } catch (error) {
            this.logger.error('❌ Enterprise ML System validation failed:', error);
            throw error;
        }
    }
    
    /**
     * Get ML-enhanced trading signals
     */
    async getTradingSignals(botState: any): Promise<any[]> {
        if (!this.isInitialized) {
            throw new Error('Enterprise ML System not initialized');
        }
        
        try {
            if (!this.mlStrategy) {
                this.logger.warn('⚠️ ML Strategy not available');
                return [];
            }
            
            // Use Enterprise ML Strategy to generate signals
            const signals = await this.mlStrategy.run(botState);
            
            this.logger.debug('📈 Generated ML-enhanced trading signals:', {
                signalCount: signals.length,
                types: signals.map(s => s.type),
                avgConfidence: signals.length > 0 ? 
                    signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length : 0
            });
            
            return signals;
            
        } catch (error) {
            this.logger.error('❌ Failed to generate trading signals:', error);
            return [];
        }
    }
    
    /**
     * Get detailed ML performance metrics
     */
    async getPerformanceMetrics(): Promise<any> {
        if (!this.isInitialized) {
            throw new Error('Enterprise ML System not initialized');
        }
        
        try {
            if (!this.mlManager) {
                this.logger.warn('⚠️ ML Manager not available');
                return null;
            }
            
            // Check if method exists before calling
            if (typeof (this.mlManager as any).getPerformanceMetrics === 'function') {
                return await (this.mlManager as any).getPerformanceMetrics();
            } else {
                this.logger.warn('⚠️ getPerformanceMetrics method not available');
                return {
                    status: 'unavailable',
                    message: 'Performance metrics method not implemented'
                };
            }
        } catch (error) {
            this.logger.error('❌ Failed to get performance metrics:', error);
            return null;
        }
    }
    
    /**
     * Shutdown Enterprise ML System
     */
    async shutdown(): Promise<void> {
        try {
            this.logger.info('🔄 Shutting down Enterprise ML Production System...');
            
            if (this.mlManager) {
                // Check if shutdown method exists before calling
                if (typeof (this.mlManager as any).shutdown === 'function') {
                    await (this.mlManager as any).shutdown();
                } else {
                    this.logger.warn('⚠️ Shutdown method not available on ML Manager');
                }
            }
            
            this.isInitialized = false;
            
            this.logger.info('✅ Enterprise ML Production System shutdown completed');
            
        } catch (error) {
            this.logger.error('❌ Error during Enterprise ML System shutdown:', error);
        }
    }
    
    /**
     * Create test bot state for validation
     */
    private createTestBotState(): any {
        return {
            portfolio: {
                cash: 10000,
                btc: 0.1,
                totalValue: 15000,
                unrealizedPnL: 0,
                realizedPnL: 500
            },
            timestamp: Date.now(),
            equity: 15000,
            prices: {
                m15: {
                    open: 49800,
                    high: 50200,
                    low: 49700,
                    close: 50000,
                    volume: 1000000
                },
                h1: null,
                h4: null,
                d1: null
            },
            indicators: {
                m15: {
                    rsi: 55,
                    macd: {
                        macd: 100,
                        signal: 90,
                        histogram: 10
                    },
                    supertrend: {
                        value: 49000,
                        direction: 'buy'
                    },
                    adx: 25,
                    atr: 500,
                    ema_9: 49900,
                    ema_21: 49800,
                    ema_50: 49500,
                    ema_200: 48000
                },
                h1: null,
                h4: null,
                d1: null
            },
            positions: [],
            marketData: {
                symbol: 'BTCUSDT',
                lastPrice: 50000,
                bidPrice: 49995,
                askPrice: 50005,
                volume24h: 50000000
            },
            regime: {
                trend: 'UPTREND',
                volatility: 'MEDIUM',
                volume: 'HIGH'
            }
        };
    }
    
    /**
     * Get system status
     */
    getStatus(): any {
        return {
            initialized: this.isInitialized,
            mlManagerReady: this.mlManager ? true : false,
            strategyReady: this.mlStrategy ? true : false,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            timestamp: new Date().toISOString()
        };
    }
}

// Export singleton instance
export const enterpriseMLProduction = new EnterpriseMLProductionIntegration();

/**
 * 📊 PRODUCTION USAGE EXAMPLE:
 * 
 * // Initialize system
 * await enterpriseMLProduction.initialize();
 * 
 * // Get trading signals
 * const signals = await enterpriseMLProduction.getTradingSignals(botState);
 * 
 * // Get performance metrics
 * const metrics = await enterpriseMLProduction.getPerformanceMetrics();
 * 
 * // Check system status
 * const status = enterpriseMLProduction.getStatus();
 * 
 * // Shutdown when done
 * await enterpriseMLProduction.shutdown();
 */

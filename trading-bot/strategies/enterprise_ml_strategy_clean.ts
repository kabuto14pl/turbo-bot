/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🔄 [DEVELOPMENT-VERSION]
 * Enterprise ML Strategy - Clean Development Version
 * 
 * Development version of advanced ML strategy integrating Enterprise ML Infrastructure
 * Work-in-progress clean implementation for testing and refinement
 * Not yet ready for production deployment
 */

import { StrategySignal } from '../core/types/strategy';
import { BotState } from '../core/types/bot_state';
import { Logger } from '../infrastructure/logging/logger';
import { EnterpriseMLIntegrationManager } from '../../src/enterprise_ml_integration_manager';

interface MLStrategyConfig {
    confidenceThreshold: number;
    mlWeight: number;
    technicalIndicatorWeight: number;
    ensembleVoting: boolean;
    riskAdjustment: boolean;
    marketRegimeAdaptation: boolean;
}

export class EnterpriseMLStrategy {
    private logger: Logger;
    private mlManager: EnterpriseMLIntegrationManager;
    private config: MLStrategyConfig;
    private lastSignal: StrategySignal | null = null;
    private signalHistory: StrategySignal[] = [];
    
    constructor(logger: Logger, config?: Partial<MLStrategyConfig>) {
        this.logger = logger;
        this.mlManager = EnterpriseMLIntegrationManager.getInstance();
        
        this.config = {
            confidenceThreshold: 0.65,
            mlWeight: 0.7,
            technicalIndicatorWeight: 0.3,
            ensembleVoting: true,
            riskAdjustment: true,
            marketRegimeAdaptation: true,
            ...config
        };
    }
    
    async run(botState: BotState): Promise<StrategySignal[]> {
        try {
            // 1. Extract market data from bot state
            const marketData = this.extractMarketData(botState);
            
            // 2. Get ML prediction
            const mlPrediction = await this.mlManager.performMLInference(marketData);
            
            // 3. Apply confidence threshold
            if (mlPrediction.confidence < this.config.confidenceThreshold) {
                this.logger.debug(`[EnterpriseML] Low confidence (${(mlPrediction.confidence * 100).toFixed(1)}%), skipping signal`);
                return [];
            }
            
            // 4. Get technical indicator signals
            const technicalSignals = this.analyzeTechnicalIndicators(botState);
            
            // 5. Ensemble decision making
            const finalSignal = await this.makeEnsembleDecision(
                mlPrediction,
                technicalSignals,
                botState
            );
            
            if (finalSignal) {
                // 6. Risk adjustment
                const adjustedSignal = this.applyRiskAdjustment(finalSignal, botState);
                
                // 7. Market regime adaptation
                const adaptedSignal = this.adaptToMarketRegime(adjustedSignal, botState);
                
                this.lastSignal = adaptedSignal;
                this.signalHistory.push(adaptedSignal);
                
                // Keep history limited
                if (this.signalHistory.length > 100) {
                    this.signalHistory = this.signalHistory.slice(-50);
                }
                
                this.logger.info(`[EnterpriseML] Generated signal: ${adaptedSignal.type} (confidence: ${(adaptedSignal.confidence * 100).toFixed(1)}%)`);
                
                return [adaptedSignal];
            }
            
            return [];
            
        } catch (error) {
            this.logger.error('[EnterpriseML] Strategy execution failed:', error);
            return [];
        }
    }
    
    private extractMarketData(botState: BotState): any {
        const latestPrice = botState.prices.m15;
        
        return {
            price: latestPrice?.close || botState.marketData?.lastPrice || 50000,
            volume: latestPrice?.volume || 1000000,
            timestamp: Date.now(),
            features: [
                latestPrice?.close || 50000,
                latestPrice?.volume || 1000000,
                latestPrice ? (latestPrice.high - latestPrice.low) : 100, // volatility
                botState.indicators?.m15?.rsi || 50,
                botState.indicators?.m15?.macd?.histogram || 0,
                botState.indicators?.m15?.supertrend?.direction === 'buy' ? 1 : -1
            ]
        };
    }
    
    private analyzeTechnicalIndicators(botState: BotState): any {
        const indicators = botState.indicators?.m15;
        
        let technicalSignal = 'NEUTRAL';
        let technicalConfidence = 0.5;
        
        // RSI Analysis
        const rsi = indicators?.rsi || 50;
        let rsiSignal = 'NEUTRAL';
        if (rsi < 30) rsiSignal = 'BUY';
        else if (rsi > 70) rsiSignal = 'SELL';
        
        // MACD Analysis
        const macdHistogram = indicators?.macd?.histogram || 0;
        let macdSignal = 'NEUTRAL';
        if (macdHistogram > 0) macdSignal = 'BUY';
        else if (macdHistogram < 0) macdSignal = 'SELL';
        
        // SuperTrend Analysis
        const supertrendDirection = indicators?.supertrend?.direction || 'neutral';
        let supertrendSignal = 'NEUTRAL';
        if (supertrendDirection === 'buy') supertrendSignal = 'BUY';
        else if (supertrendDirection === 'sell') supertrendSignal = 'SELL';
        
        // Ensemble technical signals
        const signals = [rsiSignal, macdSignal, supertrendSignal];
        const buyVotes = signals.filter(s => s === 'BUY').length;
        const sellVotes = signals.filter(s => s === 'SELL').length;
        
        if (buyVotes >= 2) {
            technicalSignal = 'BUY';
            technicalConfidence = buyVotes / 3;
        } else if (sellVotes >= 2) {
            technicalSignal = 'SELL';
            technicalConfidence = sellVotes / 3;
        }
        
        return {
            signal: technicalSignal,
            confidence: technicalConfidence,
            components: {
                rsi: { signal: rsiSignal, value: rsi },
                macd: { signal: macdSignal, value: macdHistogram },
                supertrend: { signal: supertrendSignal, direction: supertrendDirection }
            }
        };
    }
    
    private async makeEnsembleDecision(
        mlPrediction: any,
        technicalSignals: any,
        botState: BotState
    ): Promise<StrategySignal | null> {
        
        // Weighted ensemble decision
        const mlWeight = this.config.mlWeight;
        const techWeight = this.config.technicalIndicatorWeight;
        
        let finalSignal = 'HOLD';
        let finalConfidence = 0;
        
        // Convert ML signal to score
        let mlScore = 0;
        if (mlPrediction.signal === 'BUY') mlScore = 1;
        else if (mlPrediction.signal === 'SELL') mlScore = -1;
        
        // Convert technical signal to score
        let techScore = 0;
        if (technicalSignals.signal === 'BUY') techScore = 1;
        else if (technicalSignals.signal === 'SELL') techScore = -1;
        
        // Weighted ensemble score
        const ensembleScore = (mlScore * mlWeight) + (techScore * techWeight);
        
        // Decision thresholds
        const buyThreshold = 0.3;
        const sellThreshold = -0.3;
        
        if (ensembleScore > buyThreshold) {
            finalSignal = 'ENTER_LONG';
            finalConfidence = Math.min(0.9, (mlPrediction.confidence * mlWeight) + (technicalSignals.confidence * techWeight));
        } else if (ensembleScore < sellThreshold) {
            finalSignal = 'ENTER_SHORT';
            finalConfidence = Math.min(0.9, (mlPrediction.confidence * mlWeight) + (technicalSignals.confidence * techWeight));
        } else {
            // No strong signal
            return null;
        }
        
        const currentPrice = botState.prices.m15?.close || botState.marketData?.lastPrice || 50000;
        
        return {
            type: finalSignal as 'ENTER_LONG' | 'ENTER_SHORT',
            price: currentPrice,
            confidence: finalConfidence,
            indicators: {
                rsi: botState.indicators?.m15?.rsi || 50,
                macd: botState.indicators?.m15?.macd?.histogram || 0,
                supertrend: botState.indicators?.m15?.supertrend?.direction === 'buy' ? 1 : -1,
                mlScore: mlScore,
                techScore: techScore,
                ensembleScore: ensembleScore
            },
            metadata: {
                strategy: 'EnterpriseML',
                timeframe: '1m',
                regime: 'NORMAL' as any
            },
            size: this.calculatePositionSize(finalConfidence, botState)
        };
    }
    
    private applyRiskAdjustment(signal: StrategySignal, botState: BotState): StrategySignal {
        if (!this.config.riskAdjustment) return signal;
        
        // Adjust position size based on recent performance
        const recentSignals = this.signalHistory.slice(-10);
        const successRate = this.calculateSuccessRate(recentSignals);
        
        // Reduce size if recent performance is poor
        let sizeAdjustment = 1.0;
        if (successRate < 0.4) {
            sizeAdjustment = 0.5; // Reduce size by half
        } else if (successRate > 0.7) {
            sizeAdjustment = 1.2; // Increase size slightly
        }
        
        return {
            ...signal,
            size: (signal.size || 0.001) * sizeAdjustment,
            confidence: signal.confidence * (successRate > 0.5 ? 1.0 : 0.8)
        };
    }
    
    private adaptToMarketRegime(signal: StrategySignal, botState: BotState): StrategySignal {
        if (!this.config.marketRegimeAdaptation) return signal;
        
        // Simple volatility-based regime detection using prices
        const recentPrices = Object.values(botState.prices.m15 || {}).slice(-20);
        if (recentPrices.length < 5) return signal;
        
        const volatilities = recentPrices.map((price: any) => 
            price && price.high && price.low && price.close ? 
            (price.high - price.low) / price.close : 0.02
        );
        const avgVolatility = volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length;
        
        // High volatility regime - reduce confidence
        if (avgVolatility > 0.03) {
            return {
                ...signal,
                confidence: signal.confidence * 0.8,
                size: (signal.size || 0.001) * 0.7
            };
        }
        
        // Low volatility regime - maintain confidence
        return signal;
    }
    
    private calculatePositionSize(confidence: number, botState: BotState): number {
        // Base size adjusted by confidence
        const baseSize = 0.001; // 0.1% of portfolio
        const confidenceMultiplier = Math.max(0.5, Math.min(2.0, confidence * 2));
        
        return baseSize * confidenceMultiplier;
    }
    
    private calculateSuccessRate(signals: StrategySignal[]): number {
        if (signals.length === 0) return 0.5;
        
        // Simple mock success rate calculation
        // In production, this would analyze actual trade outcomes
        const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
        return Math.max(0.2, Math.min(0.8, avgConfidence));
    }
    
    getStrategyName(): string {
        return 'EnterpriseML';
    }
    
    getConfiguration(): MLStrategyConfig {
        return { ...this.config };
    }
    
    updateConfiguration(config: Partial<MLStrategyConfig>): void {
        this.config = { ...this.config, ...config };
        this.logger.info('[EnterpriseML] Configuration updated:', config);
    }
    
    getPerformanceMetrics(): any {
        return {
            totalSignals: this.signalHistory.length,
            lastSignal: this.lastSignal,
            averageConfidence: this.signalHistory.length > 0 
                ? this.signalHistory.reduce((sum, s) => sum + s.confidence, 0) / this.signalHistory.length
                : 0,
            config: this.config
        };
    }
}

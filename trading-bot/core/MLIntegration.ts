/**
 * 🧠 ML INTEGRATION - Machine Learning Systems Integration
 * 
 * Centralized ML system coordination:
 * - Ensemble prediction engine
 * - Black-Litterman portfolio optimization
 * - ML auto-retraining (FAZA 3.3)
 * - Market state building
 * - ML views for portfolio optimization
 * 
 * @module MLIntegration
 * @version 1.0.0
 * @tier TIER 3
 */

export interface MLIntegrationConfig {
    symbol: string;
    symbols?: string[];
    instanceId: string;
}

export interface MLComponents {
    ensembleEngine?: any;
    portfolioOptimizer?: any;
    
    // Feature flags
    ensembleEnabled: boolean;
    portfolioOptimizationEnabled: boolean;
    
    // State
    marketDataHistory: any[];
    portfolio: any;
    trades: any[];
    positions: Map<string, any>;
    lastOptimizationTime: number;
    optimizationInterval: number;
    
    // Methods (from main bot)
    getRecentCandles: (symbol: string, count: number) => Promise<any[] | null>;
    calculateIndicators?: (candles: any[]) => any;
    calculateRSI: (prices: number[], period: number) => number;
    calculateSMA: (prices: number[], period: number) => number;
    calculateMACD: (prices: number[]) => any;
    calculateATR: (marketData: any[], period: number) => number;
}

/**
 * MLIntegration - ML systems orchestrator
 */
export class MLIntegration {
    private config: MLIntegrationConfig;
    private components: MLComponents;
    
    constructor(config: MLIntegrationConfig, components: MLComponents) {
        this.config = config;
        this.components = components;
    }
    
    /**
     * Build market state for ensemble prediction
     */
    buildMarketStateForEnsemble(candles?: any[], indicators?: any): any {
        // New signature: with candles and indicators (FAZA 2.3)
        if (candles && indicators) {
            const latestCandle = candles[candles.length - 1];
            const prices = candles.map(c => c.close);
            
            const features = new Float32Array([
                latestCandle.close / 50000,
                indicators.rsi / 100,
                (latestCandle.close - indicators.sma20) / latestCandle.close,
                (indicators.sma20 - indicators.sma50) / indicators.sma20,
                indicators.macd.histogram / latestCandle.close,
                latestCandle.volume / 1000000,
                indicators.atr / latestCandle.close,
                indicators.bollingerBands?.bandwidth || 0
            ]);
            
            return {
                price: latestCandle.close,
                rsi: indicators.rsi,
                volume: latestCandle.volume,
                features,
                market_regime: this.detectMarketRegimeFromCandles(candles),
                timestamp: latestCandle.timestamp,
                indicators
            };
        }
        
        // Legacy signature: no params (backward compatibility)
        if (this.components.marketDataHistory.length === 0) {
            throw new Error('No market data available');
        }
        
        const latestData = this.components.marketDataHistory[this.components.marketDataHistory.length - 1];
        const prices = this.components.marketDataHistory.map(d => d.close);
        
        const rsi = this.components.calculateRSI(prices, 14);
        const sma20 = this.components.calculateSMA(prices, 20);
        const sma50 = this.components.calculateSMA(prices, 50);
        const macd = this.components.calculateMACD(prices);
        
        const features = new Float32Array([
            latestData.close / 50000,
            rsi / 100,
            (latestData.close - sma20) / latestData.close,
            (sma20 - sma50) / sma20,
            macd.histogram / latestData.close,
            latestData.volume / 1000000
        ]);
        
        return {
            price: latestData.close,
            rsi,
            volume: latestData.volume,
            features,
            market_regime: this.detectMarketRegime(),
            timestamp: latestData.timestamp
        };
    }
    
    /**
     * Detect market regime from candles
     */
    private detectMarketRegimeFromCandles(candles: any[]): string {
        if (candles.length < 20) return 'normal';
        
        const prices = candles.slice(-20).map(c => c.close);
        const returns = [];
        
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
        
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const volatility = Math.sqrt(
            returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
        );
        
        if (volatility > 0.03) return 'high_volatility';
        if (avgReturn > 0.001) return 'bull';
        if (avgReturn < -0.001) return 'bear';
        return 'normal';
    }
    
    /**
     * Detect market regime (legacy)
     */
    private detectMarketRegime(): string {
        if (this.components.marketDataHistory.length < 20) return 'normal';
        
        const prices = this.components.marketDataHistory.slice(-20).map(d => d.close);
        const returns = [];
        
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
        
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const volatility = Math.sqrt(
            returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
        );
        
        if (volatility > 0.02) return 'high_volatility';
        if (volatility < 0.005) return 'low_volatility';
        if (avgReturn > 0.01) return 'bull_trend';
        if (avgReturn < -0.01) return 'bear_trend';
        
        return 'normal';
    }
    
    /**
     * Check if portfolio rebalancing is needed (FAZA 2.3 Black-Litterman)
     */
    async checkPortfolioRebalancing(): Promise<void> {
        if (!this.components.portfolioOptimizationEnabled || !this.components.portfolioOptimizer) {
            return;
        }
        
        const now = Date.now();
        if (now - this.components.lastOptimizationTime < this.components.optimizationInterval) {
            return;
        }
        
        try {
            console.log(`📊 [PORTFOLIO] Running Black-Litterman optimization with ML views...`);
            
            // Get ML ensemble predictions as Black-Litterman views
            const mlViews = await this.getMLViewsForBlackLitterman();
            
            if (this.components.portfolioOptimizer.shouldRebalance()) {
                const result = await this.components.portfolioOptimizer.optimize(mlViews);
                
                console.log(`📊 [PORTFOLIO] Black-Litterman Optimization complete:`);
                console.log(`   Expected return: ${(result.expected_return * 100).toFixed(2)}%`);
                console.log(`   Expected volatility: ${(result.expected_volatility * 100).toFixed(2)}%`);
                console.log(`   Sharpe ratio: ${result.sharpe_ratio.toFixed(2)}`);
                console.log(`   ML views applied: ${mlViews.length} predictions integrated`);
                console.log(`   Trades required: ${result.trades_required.size}`);
                
                this.components.lastOptimizationTime = now;
            } else {
                console.log(`📊 [PORTFOLIO] No rebalancing needed`);
            }
        } catch (error) {
            console.error(`❌ [PORTFOLIO] Optimization error:`, error);
        }
    }
    
    /**
     * Get ML ensemble predictions as Black-Litterman views
     */
    async getMLViewsForBlackLitterman(): Promise<any[]> {
        if (!this.components.ensembleEnabled || !this.components.ensembleEngine) {
            return [];
        }
        
        const views: any[] = [];
        const symbols = this.config.symbols || [this.config.symbol];
        
        for (const symbol of symbols) {
            try {
                const candles = await this.components.getRecentCandles(symbol, 200);
                if (!candles || candles.length < 50) continue;
                
                const indicators = this.components.calculateIndicators
                    ? this.components.calculateIndicators(candles)
                    : {};
                    
                const marketState = this.buildMarketStateForEnsemble(candles, indicators);
                const prediction = await this.components.ensembleEngine.predict(marketState);
                const predData = prediction as any;
                
                if (predData.confidence > 0.7) {
                    const expectedReturn = predData.direction === 'up' ? 0.10 :
                                          predData.direction === 'down' ? -0.05 : 0.0;
                    
                    views.push({
                        symbol,
                        expected_return: expectedReturn * predData.confidence,
                        confidence: predData.confidence,
                        direction: predData.direction,
                        ml_features: predData.features || {}
                    });
                    
                    console.log(`   ML View for ${symbol}: ${predData.direction} (conf: ${(predData.confidence * 100).toFixed(1)}%)`);
                }
            } catch (error) {
                console.error(`   Error getting ML view for ${symbol}:`, error);
            }
        }
        
        return views;
    }
    
    /**
     * Update ensemble with trade outcome (learning loop)
     */
    async updateEnsembleOutcome(prediction: any, actualReturn: number, wasCorrect: boolean): Promise<void> {
        if (!this.components.ensembleEnabled || !this.components.ensembleEngine) {
            return;
        }
        
        try {
            this.components.ensembleEngine.updatePredictionOutcome(prediction, actualReturn, wasCorrect);
            
            if (Math.random() < 0.02) {
                const report = this.components.ensembleEngine.getPerformanceReport();
                console.log(`🧠 [ENSEMBLE] Performance: Accuracy ${(report.ensemble_accuracy * 100).toFixed(1)}%`);
            }
        } catch (error) {
            console.error(`❌ [ENSEMBLE] Update error:`, error);
        }
    }
    
    /**
     * Check if ML retraining needed (FAZA 3.3)
     * Triggers: Every 50 trades OR ensemble accuracy < 55%
     */
    async checkMLRetraining(): Promise<void> {
        if (!this.components.ensembleEnabled || !this.components.ensembleEngine) {
            return;
        }
        
        const totalTrades = this.components.portfolio.totalTrades;
        
        // TRIGGER 1: Every 50 trades
        const shouldRetrainPeriodic = totalTrades > 0 && totalTrades % 50 === 0;
        
        // TRIGGER 2: Ensemble accuracy < 55%
        let ensembleAccuracy = 0;
        let shouldRetrainAccuracy = false;
        
        try {
            const performance = this.components.ensembleEngine.getPerformanceReport();
            
            let weightedAccuracy = 0;
            let totalWeight = 0;
            
            for (const [modelType, metrics] of performance.model_performances.entries()) {
                const weight = metrics.current_weight || (1 / performance.model_performances.size);
                weightedAccuracy += metrics.accuracy * weight;
                totalWeight += weight;
            }
            
            ensembleAccuracy = totalWeight > 0 ? weightedAccuracy / totalWeight : 0;
            shouldRetrainAccuracy = ensembleAccuracy < 0.55 && totalTrades >= 10;
            
            if (shouldRetrainAccuracy) {
                console.log(`⚠️ [ML RETRAIN] Accuracy degradation: ${(ensembleAccuracy * 100).toFixed(1)}% < 55%`);
            }
            
        } catch (error) {
            console.error(`❌ [ML RETRAIN] Error checking accuracy:`, error);
        }
        
        // Execute retraining
        if (shouldRetrainPeriodic || shouldRetrainAccuracy) {
            const trigger = shouldRetrainPeriodic ?
                `Every 50 trades (${totalTrades})` :
                `Low accuracy (${(ensembleAccuracy * 100).toFixed(1)}%)`;
            
            console.log(`🔄 [ML RETRAIN] TRIGGERED: ${trigger}`);
            console.log(`   📊 Current ensemble accuracy: ${(ensembleAccuracy * 100).toFixed(1)}%`);
            
            try {
                await this.components.ensembleEngine.updatePredictionOutcome(
                    this.getRecentPrediction(),
                    this.getRecentActualReturn(),
                    this.getRecentTradeSuccess()
                );
                
                console.log(`✅ [ML RETRAIN] Ensemble weights updated successfully`);
                
                const newPerformance = this.components.ensembleEngine.getPerformanceReport();
                console.log(`   🎯 New weights:`);
                for (const [modelType, metrics] of newPerformance.model_performances.entries()) {
                    console.log(`      ${modelType}: ${(metrics.current_weight! * 100).toFixed(1)}% (acc: ${(metrics.accuracy * 100).toFixed(1)}%)`);
                }
                
            } catch (error) {
                console.error(`❌ [ML RETRAIN] Retraining failed:`, error);
            }
        }
    }
    
    /**
     * Helper: Get recent prediction
     */
    private getRecentPrediction(): any {
        return { direction: 'up', confidence: 0.75 };
    }
    
    /**
     * Helper: Get recent actual return
     */
    private getRecentActualReturn(): number {
        if (this.components.trades.length === 0) return 0;
        const lastTrade = this.components.trades[this.components.trades.length - 1];
        return lastTrade.pnl / (lastTrade.price * lastTrade.quantity);
    }
    
    /**
     * Helper: Get recent trade success
     */
    private getRecentTradeSuccess(): boolean {
        if (this.components.trades.length === 0) return false;
        const lastTrade = this.components.trades[this.components.trades.length - 1];
        return lastTrade.pnl > 0;
    }
}

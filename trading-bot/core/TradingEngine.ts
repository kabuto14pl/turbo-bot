/**
 * 🎯 TRADING ENGINE - Main Trading Cycle Execution
 * 
 * Centralized trading loop orchestration:
 * - Market data fetching (4-tier fallback: WebSocket → Kafka → OKX → Mock)
 * - Strategy execution & ensemble voting
 * - Trade signal execution
 * - Risk management integration
 * - Portfolio updates
 * 
 * @module TradingEngine
 * @version 1.0.0
 * @tier Core
 */

import { MarketData, TradingSignal, TradeExecution, BotState } from '../types/TradingTypes';

export interface TradingEngineConfig {
    symbol: string;
    symbols?: string[];
    instanceId: string;
    initialCapital: number;
    riskPerTrade: number;
    maxDrawdown: number;
    tradingInterval: number;
}

export interface TradingEngineComponents {
    strategies: Map<string, any>;
    wsAggregator?: any;
    kafkaEngine?: any;
    okxClient?: any;
    ensembleEngine?: any;
    
    // Feature flags
    wsEnabled: boolean;
    kafkaEnabled: boolean;
    liveDataEnabled: boolean;
    ensembleEnabled: boolean;
    ensembleVotingEnabled: boolean;
    
    // State
    marketDataHistory: MarketData[];
    cachedTimeframeData?: any;
    positions: Map<string, any>;
    portfolio: any;
    portfolioBalance: any;
    trades: TradeExecution[];
    lastSignals: Map<string, TradingSignal>;
    
    // Circuit breaker
    circuitBreaker: any;
    softPauseActive: boolean;
    consecutiveLossesForSoftPause: number;
    dailyTradeCount: number;
    lastTradeDayReset: number;
    
    // Methods
    checkCircuitBreaker: () => boolean;
    recordTradeResult: (pnl: number) => void;
    updateHealthStatus: () => void;
    calculateDynamicRisk: (symbol: string, atr: number, price: number) => number;
    calculateOptimalQuantity: (price: number, confidence: number, riskOverride?: number, atr?: number, symbol?: string) => number;
}

/**
 * TradingEngine - Main trading cycle orchestrator
 */
export class TradingEngine {
    private config: TradingEngineConfig;
    private components: TradingEngineComponents;
    private isRunning: boolean = false;
    private wsUpdateCount: number = 0;
    private tradingFeeRate: number = 0.001; // 0.1%
    
    constructor(config: TradingEngineConfig, components: TradingEngineComponents) {
        this.config = config;
        this.components = components;
    }
    
    /**
     * Main trading cycle execution
     */
    async executeTradingCycle(): Promise<void> {
        try {
            // Circuit breaker check
            if (this.components.checkCircuitBreaker()) {
                console.log(`🛑 [${this.config.instanceId}] Circuit breaker tripped - skipping cycle`);
                return;
            }
            
            console.log(`🔄 [${this.config.instanceId}] Starting trading cycle...`);
            
            // 1. Get market data (4-tier fallback)
            const marketData = await this.getMarketData();
            this.components.marketDataHistory.push(...marketData);
            
            // Keep last 200 data points
            if (this.components.marketDataHistory.length > 200) {
                this.components.marketDataHistory = this.components.marketDataHistory.slice(-200);
            }
            
            // 2. Collect signals from all strategies
            const allSignals: Map<string, TradingSignal> = new Map();
            
            for (const [name, strategy] of this.components.strategies) {
                try {
                    console.log(`\n🔍 [STRATEGY EXEC] Running ${name}...`);
                    
                    const signal = await strategy.analyze(this.components.marketDataHistory);
                    
                    if (!signal) {
                        console.log(`   ⚠️ ${name} returned NULL/UNDEFINED`);
                    } else {
                        console.log(`   ✅ ${name} returned ${signal.action} (conf: ${(signal.confidence * 100).toFixed(1)}%)`);
                        allSignals.set(name, signal);
                        this.components.lastSignals.set(name, signal);
                    }
                } catch (error) {
                    console.error(`❌ [${this.config.instanceId}] Strategy ${name} error:`, error);
                }
            }
            
            // 3. Ensemble voting (if enabled)
            if (this.components.ensembleVotingEnabled && allSignals.size > 0) {
                const consensusSignal = this.performEnsembleVoting(allSignals);
                
                if (consensusSignal && consensusSignal.action !== 'HOLD') {
                    console.log(`🎯 [ENSEMBLE] Consensus: ${consensusSignal.action} (confidence: ${(consensusSignal.confidence * 100).toFixed(1)}%)`);
                    await this.executeTradeSignal(consensusSignal);
                }
            }
            
            this.components.updateHealthStatus();
            console.log(`✅ [${this.config.instanceId}] Trading cycle completed`);
            
        } catch (error) {
            console.error(`❌ [${this.config.instanceId}] Trading cycle error:`, error);
            throw error;
        }
    }
    
    /**
     * Get market data with 4-tier fallback
     * Priority: WebSocket → Kafka → OKX → Mock
     */
    async getMarketData(): Promise<MarketData[]> {
        // PRIORITY 1: WebSocket Multi-Source
        if (this.components.wsEnabled && this.components.wsAggregator) {
            try {
                const latestPrice = this.components.wsAggregator.getLatestPrice(this.config.symbol);
                
                if (latestPrice && (Date.now() - latestPrice.timestamp < 10000)) {
                    const marketData: MarketData = {
                        symbol: this.config.symbol,
                        timestamp: latestPrice.timestamp,
                        open: latestPrice.price,
                        high: latestPrice.price * 1.001,
                        low: latestPrice.price * 0.999,
                        close: latestPrice.price,
                        volume: 1000
                    };
                    
                    this.wsUpdateCount++;
                    if (this.wsUpdateCount % 100 === 1) {
                        console.log(`🌐 [WEBSOCKET] ${this.config.symbol}: $${latestPrice.price.toFixed(2)}`);
                    }
                    
                    return [marketData];
                }
            } catch (error: any) {
                console.error(`❌ WebSocket error: ${error.message}`);
            }
        }
        
        // PRIORITY 2: Kafka Streaming
        if (this.components.kafkaEnabled && this.components.kafkaEngine) {
            try {
                const kafkaData = await this.getKafkaMarketData();
                if (kafkaData && kafkaData.length > 0) {
                    console.log(`🌐 [KAFKA] ${this.config.symbol}: Real-Time Stream`);
                    return kafkaData;
                }
            } catch (error: any) {
                console.error(`❌ Kafka error: ${error.message}`);
            }
        }
        
        // PRIORITY 3: OKX Live Data
        if (this.components.liveDataEnabled && this.components.okxClient) {
            try {
                const multiTF = await this.fetchMultipleTimeframes(this.config.symbol);
                
                this.components.cachedTimeframeData = {
                    m5: multiTF.m5,
                    m15: multiTF.m15,
                    m30: multiTF.m30,
                    h1: multiTF.h1,
                    h4: multiTF.h4
                };
                
                const latest = multiTF.m15[multiTF.m15.length - 1];
                console.log(`🌐 [LIVE DATA] ${this.config.symbol}: $${latest.close.toFixed(2)}`);
                
                return multiTF.m15;
            } catch (error: any) {
                console.error(`❌ OKX error: ${error.message}`);
            }
        }
        
        // PRIORITY 4: Mock Data
        return this.generateMockMarketData();
    }
    
    /**
     * Fetch multiple timeframes from OKX
     */
    private async fetchMultipleTimeframes(symbol: string): Promise<any> {
        if (!this.components.okxClient) {
            throw new Error('OKX client not initialized');
        }
        
        const [candles5m, candles15m, candles30m, candles1h, candles4h] = await Promise.all([
            this.components.okxClient.getCandles(symbol, '5m', 200),
            this.components.okxClient.getCandles(symbol, '15m', 200),
            this.components.okxClient.getCandles(symbol, '30m', 100),
            this.components.okxClient.getCandles(symbol, '1H', 100),
            this.components.okxClient.getCandles(symbol, '4H', 50)
        ]);
        
        const convertToMarketData = (candles: any[], tf: string): MarketData[] => {
            return candles.map(c => ({
                symbol,
                timestamp: c.timestamp,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume,
                timeframe: tf
            }));
        };
        
        return {
            m5: convertToMarketData(candles5m, '5m'),
            m15: convertToMarketData(candles15m, '15m'),
            m30: convertToMarketData(candles30m, '30m'),
            h1: convertToMarketData(candles1h, '1h'),
            h4: convertToMarketData(candles4h, '4h')
        };
    }
    
    /**
     * Get Kafka market data
     */
    private async getKafkaMarketData(): Promise<MarketData[]> {
        // Placeholder - would implement Kafka consumer logic
        return [];
    }
    
    /**
     * Generate mock market data
     */
    private generateMockMarketData(): MarketData[] {
        const basePrice = 87762; // Realistic BTC price
        const variation = (Math.random() - 0.5) * 1754;
        const open = basePrice + variation;
        const volatility = Math.random() * 0.005;
        
        const high = open * (1 + volatility);
        const low = open * (1 - volatility);
        const close = low + (high - low) * Math.random();
        const volume = 1000000 + Math.random() * 5000000;
        
        return [{
            symbol: this.config.symbol,
            timestamp: Date.now(),
            open,
            high,
            low,
            close,
            volume
        }];
    }
    
    /**
     * Ensemble voting system
     */
    private performEnsembleVoting(signals: Map<string, TradingSignal>): TradingSignal | null {
        console.log(`\n🗳️ [ENSEMBLE] Received ${signals.size} signals`);
        
        if (signals.size === 0) return null;
        
        // Weighted voting
        const weights: Record<string, number> = {
            'AdvancedAdaptive': 0.15,
            'RSITurbo': 0.12,
            'SuperTrend': 0.12,
            'MACrossover': 0.11,
            'MomentumPro': 0.10,
            'EnterpriseML': 0.40
        };
        
        const votes = { BUY: 0, SELL: 0, HOLD: 0 };
        const actionCounts = { BUY: 0, SELL: 0, HOLD: 0 };
        let totalConfidence = 0;
        let weightedConfidence = 0;
        
        for (const [strategyName, signal] of signals) {
            const weight = weights[strategyName] || 0.05;
            votes[signal.action] += weight;
            actionCounts[signal.action]++;
            totalConfidence += signal.confidence;
            weightedConfidence += signal.confidence * weight;
        }
        
        const maxVote = Math.max(votes.BUY, votes.SELL, votes.HOLD);
        const consensusPercent = maxVote / 1.0;
        
        let consensusAction: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        if (maxVote === votes.BUY) consensusAction = 'BUY';
        else if (maxVote === votes.SELL) consensusAction = 'SELL';
        
        // 50% consensus threshold
        if (consensusPercent < 0.50) {
            console.log(`⏸️ [ENSEMBLE] NO CONSENSUS (need >50%)`);
            return null;
        }
        
        // Overtrading protection
        if (!this.checkOvertradingLimit()) {
            console.log(`⛔ [ENSEMBLE] Overtrading limit reached`);
            return null;
        }
        
        const firstSignal = signals.values().next().value;
        
        return {
            timestamp: Date.now(),
            symbol: firstSignal?.symbol || this.config.symbol,
            action: consensusAction,
            price: firstSignal?.price || 0,
            quantity: firstSignal?.quantity || 0,
            confidence: weightedConfidence,
            strategy: 'EnsembleVoting',
            reasoning: `Consensus ${(consensusPercent * 100).toFixed(1)}%`,
            riskLevel: 1
        };
    }
    
    /**
     * Check overtrading limit (max 5 trades/day)
     */
    private checkOvertradingLimit(): boolean {
        const now = Date.now();
        const dayInMs = 86400000;
        
        if (now - this.components.lastTradeDayReset > dayInMs) {
            this.components.dailyTradeCount = 0;
            this.components.lastTradeDayReset = now;
        }
        
        return this.components.dailyTradeCount < 5;
    }
    
    /**
     * Execute trade signal
     */
    async executeTradeSignal(signal: TradingSignal): Promise<void> {
        try {
            // Validate trade
            const validationResult = this.validateTradeSignal(signal);
            if (!validationResult.valid) {
                console.log(`⚠️ [${this.config.instanceId}] Trade rejected: ${validationResult.reason}`);
                return;
            }
            
            console.log(`📈 [${this.config.instanceId}] Executing ${signal.action} - Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
            
            // Calculate dynamic risk
            const dynamicRiskPercent = this.config.riskPerTrade; // Simplified
            
            if (dynamicRiskPercent === 0) {
                console.log(`🛑 [CIRCUIT BREAKER] Risk = 0% - trade blocked`);
                return;
            }
            
            this.components.dailyTradeCount++;
            
            // Simulate execution
            const executionDelay = Math.random() * 1000 + 100;
            await this.sleep(executionDelay);
            
            const quantity = signal.quantity || this.components.calculateOptimalQuantity(
                signal.price,
                signal.confidence,
                dynamicRiskPercent
            );
            const fees = signal.price * quantity * this.tradingFeeRate;
            
            const trade: TradeExecution = {
                id: `${this.config.instanceId}-${Date.now()}`,
                timestamp: signal.timestamp,
                symbol: signal.symbol,
                action: signal.action,
                price: signal.price,
                quantity: quantity,
                pnl: 0,
                strategy: signal.strategy,
                instanceId: this.config.instanceId,
                executionTime: executionDelay,
                fees: fees
            };
            
            // Execute trade logic (BUY/SELL)
            if (signal.action === 'BUY') {
                const positionValue = signal.price * quantity;
                const totalCost = positionValue + fees;
                
                this.components.positions.set(signal.symbol, {
                    symbol: signal.symbol,
                    side: 'LONG',
                    entryPrice: signal.price,
                    quantity: quantity,
                    entryTime: Date.now(),
                    value: positionValue
                });
                
                this.components.portfolioBalance.usdtBalance -= totalCost;
                this.components.portfolioBalance.btcBalance += quantity;
                trade.pnl = -fees;
                
                console.log(`🟢 LONG opened: ${quantity.toFixed(6)} BTC @ $${signal.price.toFixed(2)}`);
                
            } else if (signal.action === 'SELL') {
                const position = this.components.positions.get(signal.symbol);
                if (!position) {
                    console.error(`❌ Cannot SELL - no position found!`);
                    return;
                }
                
                const exitValue = signal.price * position.quantity;
                const entryValue = position.entryPrice * position.quantity;
                const grossPnL = exitValue - entryValue;
                const netPnL = grossPnL - fees;
                
                this.components.portfolioBalance.usdtBalance += exitValue - fees;
                this.components.portfolioBalance.btcBalance -= position.quantity;
                
                trade.pnl = netPnL;
                trade.quantity = position.quantity;
                
                this.components.positions.delete(signal.symbol);
                
                const pnlSign = netPnL >= 0 ? '✅' : '❌';
                console.log(`🔴 LONG closed: ${pnlSign} P&L: $${netPnL.toFixed(2)}`);
            }
            
            this.components.trades.push(trade);
            this.components.portfolio.totalTrades++;
            this.components.portfolio.realizedPnL += trade.pnl;
            
            // Record trade result for circuit breaker
            this.components.recordTradeResult(trade.pnl);
            
        } catch (error) {
            console.error(`❌ [${this.config.instanceId}] Trade execution error:`, error);
        }
    }
    
    /**
     * Validate trade signal
     */
    private validateTradeSignal(signal: TradingSignal): { valid: boolean; reason?: string } {
        const currentPrice = signal.price;
        const quantity = signal.quantity || this.components.calculateOptimalQuantity(currentPrice, signal.confidence);
        
        if (signal.action === 'BUY') {
            const requiredUSDT = (currentPrice * quantity) * (1 + this.tradingFeeRate);
            
            if (this.components.portfolioBalance.usdtBalance < requiredUSDT) {
                return {
                    valid: false,
                    reason: `Insufficient USDT balance. Required: $${requiredUSDT.toFixed(2)}`
                };
            }
            
            if (this.components.positions.has(signal.symbol)) {
                return {
                    valid: false,
                    reason: `Position already open for ${signal.symbol}`
                };
            }
            
        } else if (signal.action === 'SELL') {
            const position = this.components.positions.get(signal.symbol);
            if (!position) {
                return {
                    valid: false,
                    reason: `No open position for ${signal.symbol}`
                };
            }
        }
        
        return { valid: true };
    }
    
    /**
     * Sleep helper
     */
    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Start trading loop
     */
    async start(tradingInterval: number = 30000): Promise<void> {
        this.isRunning = true;
        
        while (this.isRunning) {
            try {
                await this.executeTradingCycle();
                await this.sleep(tradingInterval);
            } catch (error) {
                console.error(`❌ Trading loop error:`, error);
                await this.sleep(5000);
            }
        }
    }
    
    /**
     * Stop trading loop
     */
    stop(): void {
        this.isRunning = false;
        console.log(`🛑 Trading engine stopped`);
    }
}

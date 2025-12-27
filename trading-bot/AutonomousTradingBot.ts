/**
 * 🤖 AUTONOMOUS TRADING BOT - Main Orchestrator
 * 
 * Entry point for the refactored modular trading bot.
 * Pure coordination layer - delegates all logic to specialized modules.
 * 
 * Architecture:
 * - SystemInitializer: All subsystem initialization
 * - APIRouter: REST API endpoints
 * - TradingEngine: Main trading cycle execution
 * - MLIntegration: Ensemble & portfolio optimization
 * - PortfolioRiskManager: Risk management & circuit breaker
 * 
 * @module AutonomousTradingBot
 * @version 4.1.3
 * @enterprise-grade
 */

import dotenv from 'dotenv';
import { SystemInitializer } from './initialization/SystemInitializer';
import { APIRouter } from './api/APIRouter';
import { TradingEngine } from './core/TradingEngine';
import { MLIntegration } from './core/MLIntegration';
import { PortfolioRiskManager } from './core/PortfolioRiskManager';
import { MarketData, TradingSignal, TradeExecution } from './types/TradingTypes';

dotenv.config();

export interface BotConfig {
    mode: 'simulation' | 'backtest' | 'live';
    symbol: string;
    symbols: string[];
    instanceId: string;
    initialCapital: number;
    riskPerTrade: number;
    maxDrawdown: number;
    tradingInterval: number;
    enableML: boolean;
    enableEnsemble: boolean;
    enablePortfolioOpt: boolean;
    enableWebSocket: boolean;
    enableKafka: boolean;
    enableDuckDB: boolean;
}

/**
 * AutonomousTradingBot - Main orchestrator class
 */
export class AutonomousTradingBot {
    private config: BotConfig;
    
    // Core modules
    private systemInitializer!: SystemInitializer;
    private apiRouter!: APIRouter;
    private tradingEngine!: TradingEngine;
    private mlIntegration!: MLIntegration;
    private riskManager!: PortfolioRiskManager;
    
    // Initialized systems (from SystemInitializer)
    private initializedSystems: any;
    
    // State
    private isRunning: boolean = false;
    private marketDataHistory: MarketData[] = [];
    private trades: TradeExecution[] = [];
    private positions: Map<string, any> = new Map();
    private lastSignals: Map<string, TradingSignal> = new Map();
    private startTime: number = 0;
    
    // Portfolio state
    private portfolio = {
        totalValue: 0,
        realizedPnL: 0,
        unrealizedPnL: 0,
        drawdown: 0,
        maxDrawdown: 0,
        totalTrades: 0,
        successfulTrades: 0,
        failedTrades: 0,
        winRate: 0,
        avgTradeReturn: 0
    };
    
    private portfolioBalance = {
        usdtBalance: 0,
        btcBalance: 0,
        lockedInPositions: 0
    };
    
    // Circuit breaker
    private circuitBreaker = {
        isTripped: false,
        consecutiveLosses: 0,
        maxConsecutiveLosses: 3,
        emergencyStopTriggered: false,
        tripCount: 0,
        lastResetTime: Date.now()
    };
    
    private softPauseActive: boolean = false;
    private consecutiveLossesForSoftPause: number = 0;
    private dailyTradeCount: number = 0;
    private lastTradeDayReset: number = Date.now();
    
    // Health status
    private healthStatus = {
        status: 'initializing' as 'healthy' | 'unhealthy' | 'initializing',
        uptime: 0,
        components: {
            strategies: false,
            ml: false,
            monitoring: false,
            portfolio: false,
            riskManager: false
        }
    };
    
    // Optimization
    private lastOptimizationTime: number = 0;
    private optimizationInterval: number = 12 * 60 * 60 * 1000; // 12 hours
    
    constructor(config?: Partial<BotConfig>) {
        this.config = this.buildConfig(config);
        this.startTime = Date.now();
    }
    
    /**
     * Build configuration from environment and overrides
     */
    private buildConfig(overrides?: Partial<BotConfig>): BotConfig {
        return {
            mode: (process.env.MODE as any) || 'simulation',
            symbol: process.env.SYMBOL || 'BTC-USDT',
            symbols: process.env.SYMBOLS?.split(',') || ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'BNB-USDT', 'ADA-USDT'],
            instanceId: `bot-${Date.now()}`,
            initialCapital: parseFloat(process.env.INITIAL_CAPITAL || '10000'),
            riskPerTrade: parseFloat(process.env.RISK_PER_TRADE || '0.02'),
            maxDrawdown: parseFloat(process.env.MAX_DRAWDOWN || '0.15'),
            tradingInterval: parseInt(process.env.TRADING_INTERVAL || '30000'),
            enableML: process.env.ENABLE_ML !== 'false',
            enableEnsemble: process.env.ENABLE_ENSEMBLE !== 'false',
            enablePortfolioOpt: process.env.ENABLE_PORTFOLIO_OPT !== 'false',
            enableWebSocket: process.env.ENABLE_WEBSOCKET !== 'false',
            enableKafka: process.env.ENABLE_KAFKA !== 'false',
            enableDuckDB: process.env.ENABLE_DUCKDB !== 'false',
            ...overrides
        };
    }
    
    /**
     * Initialize all systems
     */
    async initialize(): Promise<void> {
        console.log(`\n🚀 ========== AUTONOMOUS TRADING BOT ==========`);
        console.log(`📋 Instance ID: ${this.config.instanceId}`);
        console.log(`🎯 Mode: ${this.config.mode.toUpperCase()}`);
        console.log(`💰 Initial Capital: $${this.config.initialCapital.toFixed(2)}`);
        console.log(`📊 Primary Symbol: ${this.config.symbol}`);
        console.log(`📈 All Symbols: ${this.config.symbols.join(', ')}`);
        console.log(`⚡ Trading Interval: ${this.config.tradingInterval}ms`);
        console.log(`🧠 ML Enabled: ${this.config.enableML}`);
        console.log(`🎲 Ensemble Enabled: ${this.config.enableEnsemble}`);
        console.log(`📊 Portfolio Opt: ${this.config.enablePortfolioOpt}`);
        console.log(`🌐 WebSocket: ${this.config.enableWebSocket}`);
        console.log(`🚀 Kafka: ${this.config.enableKafka}`);
        console.log(`🦆 DuckDB: ${this.config.enableDuckDB}`);
        console.log(`===============================================\n`);
        
        // Initialize portfolio balance
        this.portfolio.totalValue = this.config.initialCapital;
        this.portfolioBalance.usdtBalance = this.config.initialCapital;
        
        // 1. Initialize all systems
        this.systemInitializer = new SystemInitializer(this.config as any);
        this.initializedSystems = await this.systemInitializer.initializeAllSystems();
        
        console.log(`✅ All systems initialized successfully`);
        
        // 2. Initialize Risk Manager
        this.riskManager = new PortfolioRiskManager(
            {
                instanceId: this.config.instanceId,
                maxDrawdown: this.config.maxDrawdown,
                riskPerTrade: this.config.riskPerTrade,
                initialCapital: this.config.initialCapital
            },
            {
                portfolio: this.portfolio,
                circuitBreaker: this.circuitBreaker,
                softPauseActive: this.softPauseActive,
                consecutiveLossesForSoftPause: this.consecutiveLossesForSoftPause,
                healthStatus: this.healthStatus
            }
        );
        
        console.log(`✅ Risk Manager initialized`);
        
        // 3. Initialize ML Integration
        this.mlIntegration = new MLIntegration(
            {
                symbol: this.config.symbol,
                symbols: this.config.symbols,
                instanceId: this.config.instanceId
            },
            {
                ensembleEngine: this.initializedSystems.tier3?.ensemble,
                portfolioOptimizer: this.initializedSystems.tier3?.optimizer,
                ensembleEnabled: this.config.enableEnsemble,
                portfolioOptimizationEnabled: this.config.enablePortfolioOpt,
                marketDataHistory: this.marketDataHistory,
                portfolio: this.portfolio,
                trades: this.trades,
                positions: this.positions,
                lastOptimizationTime: this.lastOptimizationTime,
                optimizationInterval: this.optimizationInterval,
                getRecentCandles: this.getRecentCandles.bind(this),
                calculateRSI: this.calculateRSI.bind(this),
                calculateSMA: this.calculateSMA.bind(this),
                calculateMACD: this.calculateMACD.bind(this),
                calculateATR: this.calculateATR.bind(this)
            }
        );
        
        console.log(`✅ ML Integration initialized`);
        
        // 4. Initialize Trading Engine
        this.tradingEngine = new TradingEngine(
            {
                symbol: this.config.symbol,
                symbols: this.config.symbols,
                instanceId: this.config.instanceId,
                initialCapital: this.config.initialCapital,
                riskPerTrade: this.config.riskPerTrade,
                maxDrawdown: this.config.maxDrawdown,
                tradingInterval: this.config.tradingInterval
            },
            {
                strategies: this.initializedSystems.strategies,
                wsAggregator: this.initializedSystems.infrastructure?.wsAggregator,
                kafkaEngine: this.initializedSystems.infrastructure?.kafkaEngine,
                okxClient: null, // TODO: Initialize OKX client
                ensembleEngine: this.initializedSystems.tier3?.ensemble,
                wsEnabled: this.config.enableWebSocket,
                kafkaEnabled: this.config.enableKafka,
                liveDataEnabled: this.config.mode === 'live',
                ensembleEnabled: this.config.enableEnsemble,
                ensembleVotingEnabled: this.config.enableEnsemble,
                marketDataHistory: this.marketDataHistory,
                positions: this.positions,
                portfolio: this.portfolio,
                portfolioBalance: this.portfolioBalance,
                trades: this.trades,
                lastSignals: this.lastSignals,
                circuitBreaker: this.circuitBreaker,
                softPauseActive: this.softPauseActive,
                consecutiveLossesForSoftPause: this.consecutiveLossesForSoftPause,
                dailyTradeCount: this.dailyTradeCount,
                lastTradeDayReset: this.lastTradeDayReset,
                checkCircuitBreaker: this.riskManager.checkCircuitBreaker.bind(this.riskManager),
                recordTradeResult: this.riskManager.recordTradeResult.bind(this.riskManager),
                updateHealthStatus: this.updateHealthStatus.bind(this),
                calculateDynamicRisk: this.riskManager.calculateDynamicRisk.bind(this.riskManager),
                calculateOptimalQuantity: this.riskManager.calculateOptimalQuantity.bind(this.riskManager)
            }
        );
        
        console.log(`✅ Trading Engine initialized`);
        
        // 5. Initialize API Router
        this.apiRouter = new APIRouter({
            instanceId: this.config.instanceId,
            healthCheckPort: parseInt(process.env.API_PORT || '3001'),
            version: '4.0.0'
        });
        
        // Register all API endpoints with components
        this.apiRouter.registerAllEndpoints({
            portfolio: this.portfolio,
            trades: this.trades,
            lastSignals: this.lastSignals,
            healthStatus: this.healthStatus,
            
            // TIER 3 Systems
            ensembleEngine: this.initializedSystems.tier3?.ensembleEngine,
            portfolioOptimizer: this.initializedSystems.tier3?.portfolioOptimizer,
            backtestEngine: this.initializedSystems.tier3?.backtestEngine,
            
            // Data Infrastructure
            wsAggregator: this.initializedSystems.infrastructure?.wsAggregator,
            duckdbIntegration: this.initializedSystems.infrastructure?.duckdbIntegration,
            queryBuilder: this.initializedSystems.infrastructure?.queryBuilder,
            monitoringSystem: this.initializedSystems.infrastructure?.monitoringSystem,
            
            // Feature Flags
            ensembleEnabled: !!this.initializedSystems.tier3?.ensembleEngine,
            portfolioOptimizationEnabled: !!this.initializedSystems.tier3?.portfolioOptimizer,
            wsEnabled: !!this.initializedSystems.infrastructure?.wsAggregator,
            
            // State
            lastOptimizationTime: 0,
            optimizationInterval: 3600000, // 1 hour
            wsUpdateCount: 0,
            wsLastUpdate: 0,
            
            // Methods
            getCircuitBreakerStatus: this.riskManager.getCircuitBreakerStatus.bind(this.riskManager),
            resetCircuitBreaker: this.riskManager.resetCircuitBreaker.bind(this.riskManager),
            getUptime: this.getUptime.bind(this),
            generatePrometheusMetrics: () => '# Prometheus metrics placeholder'
        });
        
        console.log(`✅ API Router initialized`);
        
        // Start API server
        await this.apiRouter.startServer();
        
        // Update health status
        this.healthStatus.status = 'healthy';
        this.healthStatus.components.strategies = true;
        this.healthStatus.components.ml = this.config.enableML;
        this.healthStatus.components.monitoring = true;
        this.healthStatus.components.portfolio = true;
        this.healthStatus.components.riskManager = true;
        
        console.log(`\n✅ ========== INITIALIZATION COMPLETE ==========\n`);
    }
    
    /**
     * Main trading loop
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            console.log(`⚠️ Bot already running`);
            return;
        }
        
        console.log(`\n🚀 Starting autonomous trading bot...`);
        this.isRunning = true;
        
        while (this.isRunning) {
            try {
                // Execute main trading cycle
                await this.tradingEngine.executeTradingCycle();
                
                // ML retraining check (FAZA 3.3)
                await this.mlIntegration.checkMLRetraining();
                
                // Portfolio rebalancing check (FAZA 2.3)
                await this.mlIntegration.checkPortfolioRebalancing();
                
                // Update portfolio metrics
                this.riskManager.updatePortfolioMetrics(this.trades);
                
                // Sleep before next cycle
                await this.sleep(this.config.tradingInterval);
                
            } catch (error) {
                console.error(`❌ Trading loop error:`, error);
                await this.sleep(5000);
            }
        }
    }
    
    /**
     * Stop the bot
     */
    async stop(): Promise<void> {
        console.log(`\n🛑 Stopping autonomous trading bot...`);
        this.isRunning = false;
        
        // Stop API server
        await this.apiRouter.stopServer();
        
        console.log(`✅ Bot stopped successfully\n`);
    }
    
    /**
     * Get uptime
     */
    private getUptime(): string {
        const uptime = Date.now() - this.startTime;
        const hours = Math.floor(uptime / 3600000);
        const minutes = Math.floor((uptime % 3600000) / 60000);
        const seconds = Math.floor((uptime % 60000) / 1000);
        return `${hours}h ${minutes}m ${seconds}s`;
    }
    
    /**
     * Update health status
     */
    private updateHealthStatus(): void {
        this.healthStatus.uptime = Date.now() - this.startTime;
        
        if (this.circuitBreaker.isTripped) {
            this.healthStatus.status = 'unhealthy';
        }
    }
    
    /**
     * Get recent candles (helper for ML Integration)
     */
    private async getRecentCandles(symbol: string, count: number): Promise<any[] | null> {
        // Try WebSocket aggregator first
        if (this.initializedSystems.infrastructure?.wsAggregator) {
            const wsCandles = this.initializedSystems.infrastructure.wsAggregator.getRecentCandles?.(symbol, count);
            if (wsCandles && wsCandles.length > 0) {
                return wsCandles;
            }
        }
        
        // Fallback to market data history
        if (this.marketDataHistory.length >= count) {
            return this.marketDataHistory.slice(-count);
        }
        
        return null;
    }
    
    /**
     * Calculate RSI
     */
    private calculateRSI(prices: number[], period: number = 14): number {
        if (prices.length < period + 1) return 50;
        
        let gains = 0;
        let losses = 0;
        
        for (let i = prices.length - period; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            if (change > 0) gains += change;
            else losses -= change;
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }
    
    /**
     * Calculate SMA
     */
    private calculateSMA(prices: number[], period: number): number {
        if (prices.length < period) return prices[prices.length - 1];
        
        const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
        return sum / period;
    }
    
    /**
     * Calculate MACD
     */
    private calculateMACD(prices: number[]): any {
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        const macd = ema12 - ema26;
        
        return {
            macd,
            signal: macd * 0.9,
            histogram: macd * 0.1
        };
    }
    
    /**
     * Calculate EMA
     */
    private calculateEMA(prices: number[], period: number): number {
        if (prices.length < period) return prices[prices.length - 1];
        
        const multiplier = 2 / (period + 1);
        let ema = prices[0];
        
        for (let i = 1; i < prices.length; i++) {
            ema = (prices[i] - ema) * multiplier + ema;
        }
        
        return ema;
    }
    
    /**
     * Calculate ATR
     */
    private calculateATR(marketData: any[], period: number = 14): number {
        if (marketData.length < period + 1) return 0.02 * marketData[marketData.length - 1].close;
        
        const trueRanges = [];
        
        for (let i = 1; i < marketData.length; i++) {
            const high = marketData[i].high;
            const low = marketData[i].low;
            const prevClose = marketData[i - 1].close;
            
            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );
            
            trueRanges.push(tr);
        }
        
        const atr = trueRanges.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
        return atr;
    }
    
    /**
     * Sleep helper
     */
    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Main entry point
 */
async function main() {
    const bot = new AutonomousTradingBot();
    
    try {
        await bot.initialize();
        await bot.start();
    } catch (error) {
        console.error(`❌ Fatal error:`, error);
        process.exit(1);
    }
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log(`\n🛑 Received SIGINT, shutting down...`);
        await bot.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log(`\n🛑 Received SIGTERM, shutting down...`);
        await bot.stop();
        process.exit(0);
    });
}

// Run if this is the main module
if (require.main === module) {
    main().catch(console.error);
}

export default AutonomousTradingBot;

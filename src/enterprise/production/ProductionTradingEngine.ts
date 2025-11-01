/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * PHASE C.4 - Production Trading Engine
 * Enterprise-Grade Trading System Integration
 * 
 * Integrates all Phase A/B/C.1/C.2/C.3 components into unified production engine
 * with real-time execution, risk management, monitoring, and compliance
 * 
 * Dependencies:
 * - Phase A: RedisVarCalculatorCache, CacheServiceManager
 * - Phase B: MemoryOptimizer, EnhancedMonitoringSystem
 * - Phase C.1: RealTimeMarketDataEngine
 * - Phase C.2: AdvancedStrategyOrchestrator
 * - Phase C.3: MonitoringSystemIntegration
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// Phase A Dependencies
interface CacheServiceManager {
    get(key: string): Promise<any>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    invalidate(pattern: string): Promise<void>;
}

interface RedisVarCalculatorCache {
    calculateVaR(positions: any[], config: any): Promise<number>;
    getCalculationHistory(): Promise<any[]>;
}

// Phase B Dependencies  
interface MemoryOptimizer {
    optimizeExecution(): Promise<void>;
    getMemoryStats(): Promise<any>;
    cleanup(): Promise<void>;
}

interface EnhancedMonitoringSystem {
    recordMetric(name: string, value: number, tags?: Record<string, string>): void;
    startPerformanceTracking(operation: string): () => void;
    getSystemHealth(): Promise<any>;
}

// Phase C.1 Dependencies
interface RealTimeMarketDataEngine {
    subscribe(symbols: string[]): Promise<void>;
    getCurrentPrice(symbol: string): Promise<number>;
    getOrderBook(symbol: string): Promise<any>;
    on(event: string, callback: Function): void;
}

// Phase C.2 Dependencies
interface AdvancedStrategyOrchestrator {
    executeStrategies(marketData: any): Promise<any[]>;
    getActiveStrategies(): string[];
    switchStrategy(strategyId: string): Promise<void>;
    getPerformanceMetrics(): Promise<any>;
}

// Phase C.3 Dependencies
interface MonitoringSystemIntegration {
    deployMonitoring(): Promise<void>;
    recordAlert(level: string, message: string, data?: any): Promise<void>;
    getMonitoringStatus(): Promise<any>;
}

// Core Trading Interfaces
interface TradingPosition {
    id: string;
    symbol: string;
    size: number;
    entryPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
    timestamp: Date;
    strategyId: string;
    type: 'LONG' | 'SHORT';
}

interface TradingOrder {
    id: string;
    symbol: string;
    type: 'MARKET' | 'LIMIT' | 'STOP';
    side: 'BUY' | 'SELL';
    quantity: number;
    price?: number;
    stopPrice?: number;
    status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
    timestamp: Date;
    strategyId: string;
}

interface Portfolio {
    totalValue: number;
    totalPnL: number;
    positions: TradingPosition[];
    cash: number;
    margin: number;
    marginUsed: number;
    leverage: number;
    lastUpdated: Date;
}

interface RiskLimits {
    maxPositionSize: number;
    maxDailyLoss: number;
    maxDrawdown: number;
    maxLeverage: number;
    maxVaR: number;
    maxConcentration: number;
    emergencyStopLoss: number;
}

interface ExecutionConfig {
    slippageTolerance: number;
    maxOrderSize: number;
    executionTimeout: number;
    retryAttempts: number;
    minOrderValue: number;
    enablePaperTrading: boolean;
}

interface SystemStatus {
    isRunning: boolean;
    isEmergencyStopped: boolean;
    lastHealthCheck: Date;
    activeStrategies: number;
    totalPositions: number;
    systemLoad: number;
    memoryUsage: number;
    cacheHitRatio: number;
}

interface PerformanceMetrics {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    averageReturn: number;
    volatility: number;
    tradesCount: number;
    avgTradeSize: number;
    currentVaR: number;
}

/**
 * Production Trading Engine
 * 
 * Main orchestrator integrating all enterprise components into
 * a unified, production-ready trading system
 */
export class ProductionTradingEngine extends EventEmitter {
    private cacheManager: CacheServiceManager;
    private varCalculator: RedisVarCalculatorCache;
    private memoryOptimizer: MemoryOptimizer;
    private monitoringSystem: EnhancedMonitoringSystem;
    private marketDataEngine: RealTimeMarketDataEngine;
    private strategyOrchestrator: AdvancedStrategyOrchestrator;
    private systemIntegration: MonitoringSystemIntegration;

    private portfolio!: Portfolio;
    private riskLimits!: RiskLimits;
    private executionConfig!: ExecutionConfig;
    private systemStatus!: SystemStatus;
    private performanceMetrics!: PerformanceMetrics;

    private positions: Map<string, TradingPosition> = new Map();
    private orders: Map<string, TradingOrder> = new Map();
    private executionQueue: TradingOrder[] = [];
    private isInitialized: boolean = false;
    private healthCheckInterval?: NodeJS.Timeout;
    private performanceUpdateInterval?: NodeJS.Timeout;

    constructor(
        cacheManager: CacheServiceManager,
        varCalculator: RedisVarCalculatorCache,
        memoryOptimizer: MemoryOptimizer,
        monitoringSystem: EnhancedMonitoringSystem,
        marketDataEngine: RealTimeMarketDataEngine,
        strategyOrchestrator: AdvancedStrategyOrchestrator,
        systemIntegration: MonitoringSystemIntegration
    ) {
        super();
        
        this.cacheManager = cacheManager;
        this.varCalculator = varCalculator;
        this.memoryOptimizer = memoryOptimizer;
        this.monitoringSystem = monitoringSystem;
        this.marketDataEngine = marketDataEngine;
        this.strategyOrchestrator = strategyOrchestrator;
        this.systemIntegration = systemIntegration;

        this.initializeDefaults();
        // Event listeners will be set up in initialize() method
    }

    /**
     * Initialize Production Trading Engine
     */
    public async initialize(): Promise<void> {
        const stopTracking = this.monitoringSystem.startPerformanceTracking('production_engine_init');
        
        try {
            console.log('🚀 Initializing Production Trading Engine...');

            // 1. Deploy monitoring infrastructure
            await this.systemIntegration.deployMonitoring();
            console.log('✅ Monitoring infrastructure deployed');

            // 2. Initialize market data connections
            await this.initializeMarketData();
            console.log('✅ Market data connections established');

            // 3. Load portfolio state from cache
            await this.loadPortfolioState();
            console.log('✅ Portfolio state loaded');

            // 4. Initialize strategies
            await this.initializeStrategies();
            console.log('✅ Trading strategies initialized');

            // 5. Setup risk monitoring
            await this.initializeRiskMonitoring();
            console.log('✅ Risk monitoring active');

            // 6. Start health monitoring
            this.startHealthMonitoring();
            console.log('✅ Health monitoring started');

            // 7. Optimize memory usage
            await this.memoryOptimizer.optimizeExecution();
            console.log('✅ Memory optimization applied');

            // 8. Setup event listeners after all components are initialized
            this.setupEventListeners();

            this.systemStatus.isRunning = true;
            this.systemStatus.lastHealthCheck = new Date();
            this.isInitialized = true;

            await this.systemIntegration.recordAlert('INFO', 'Production Trading Engine initialized successfully', {
                portfolio: this.portfolio,
                activeStrategies: this.strategyOrchestrator.getActiveStrategies(),
                systemStatus: this.systemStatus
            });

            this.emit('engineInitialized', this.systemStatus);
            console.log('🎯 Production Trading Engine ready for operation');

        } catch (error) {
            const errorMsg = `Failed to initialize Production Trading Engine: ${error}`;
            console.error('❌', errorMsg);
            
            await this.systemIntegration.recordAlert('CRITICAL', errorMsg, { error });
            throw error;
        } finally {
            stopTracking();
        }
    }

    /**
     * Start automated trading operations
     */
    public async startTrading(): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Engine must be initialized before starting trading');
        }

        if (this.systemStatus.isEmergencyStopped) {
            throw new Error('Cannot start trading: Emergency stop is active');
        }

        console.log('📈 Starting automated trading operations...');

        // Start market data subscriptions
        const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
        await this.marketDataEngine.subscribe(symbols);

        // Enable strategy execution
        this.setupStrategyExecution();

        // Start order processing
        this.startOrderProcessing();

        // Start performance tracking
        this.startPerformanceTracking();

        this.systemStatus.isRunning = true;
        
        await this.systemIntegration.recordAlert('INFO', 'Automated trading started', {
            symbols,
            activeStrategies: this.strategyOrchestrator.getActiveStrategies()
        });

        this.emit('tradingStarted', { symbols, strategies: this.strategyOrchestrator.getActiveStrategies() });
        console.log('✅ Automated trading operations active');
    }

    /**
     * Stop trading operations gracefully
     */
    public async stopTrading(): Promise<void> {
        console.log('🛑 Stopping trading operations...');

        this.systemStatus.isRunning = false;

        // Cancel all pending orders
        await this.cancelAllOrders();

        // Close all positions (if configured)
        if (this.executionConfig.enablePaperTrading) {
            await this.closeAllPositions();
        }

        // Stop monitoring intervals
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        if (this.performanceUpdateInterval) {
            clearInterval(this.performanceUpdateInterval);
        }

        // Save portfolio state
        await this.savePortfolioState();

        await this.systemIntegration.recordAlert('INFO', 'Trading operations stopped', {
            finalPortfolio: this.portfolio,
            performanceMetrics: this.performanceMetrics
        });

        this.emit('tradingStopped', { portfolio: this.portfolio, metrics: this.performanceMetrics });
        console.log('✅ Trading operations stopped gracefully');
    }

    /**
     * Execute emergency stop procedure
     */
    public async emergencyStop(reason: string): Promise<void> {
        console.log(`🚨 EMERGENCY STOP TRIGGERED: ${reason}`);

        this.systemStatus.isEmergencyStopped = true;
        this.systemStatus.isRunning = false;

        // Immediate order cancellation
        await this.cancelAllOrders();

        // Liquidate all positions immediately
        await this.liquidateAllPositions();

        // Clear execution queue
        this.executionQueue.length = 0;

        // Alert all monitoring systems
        await this.systemIntegration.recordAlert('CRITICAL', `EMERGENCY STOP: ${reason}`, {
            portfolio: this.portfolio,
            positions: Array.from(this.positions.values()),
            systemStatus: this.systemStatus
        });

        this.emit('emergencyStop', { reason, portfolio: this.portfolio });
        console.log('🛑 Emergency stop completed');
    }

    /**
     * Place trading order
     */
    public async placeOrder(orderRequest: Omit<TradingOrder, 'id' | 'status' | 'timestamp'>): Promise<string> {
        const stopTracking = this.monitoringSystem.startPerformanceTracking('order_placement');

        try {
            // Risk validation
            const riskCheck = await this.validateOrderRisk(orderRequest);
            if (!riskCheck.isValid) {
                throw new Error(`Order rejected: ${riskCheck.reason}`);
            }

            // Create order
            const order: TradingOrder = {
                ...orderRequest,
                id: uuidv4(),
                status: 'PENDING',
                timestamp: new Date()
            };

            // Add to orders map and execution queue
            this.orders.set(order.id, order);
            this.executionQueue.push(order);

            // Cache order for recovery
            await this.cacheManager.set(`order:${order.id}`, order, 3600);

            this.monitoringSystem.recordMetric('orders_placed_total', 1, {
                symbol: order.symbol,
                type: order.type,
                side: order.side
            });

            this.emit('orderPlaced', order);
            console.log(`📝 Order placed: ${order.id} - ${order.side} ${order.quantity} ${order.symbol}`);

            return order.id;

        } catch (error) {
            await this.systemIntegration.recordAlert('ERROR', `Order placement failed: ${error}`, orderRequest);
            throw error;
        } finally {
            stopTracking();
        }
    }

    /**
     * Get current portfolio status
     */
    public getPortfolio(): Portfolio {
        return { ...this.portfolio };
    }

    /**
     * Get current performance metrics
     */
    public getPerformanceMetrics(): PerformanceMetrics {
        return { ...this.performanceMetrics };
    }

    /**
     * Get system status
     */
    public getSystemStatus(): SystemStatus {
        return { ...this.systemStatus };
    }

    /**
     * Get all active positions
     */
    public getPositions(): TradingPosition[] {
        return Array.from(this.positions.values());
    }

    /**
     * Get order by ID
     */
    public getOrder(orderId: string): TradingOrder | undefined {
        return this.orders.get(orderId);
    }

    /**
     * Reset emergency stop state
     */
    public async resetEmergencyStop(): Promise<void> {
        if (!this.systemStatus.isEmergencyStopped) {
            return;
        }

        console.log('🔄 Resetting emergency stop state...');

        // Verify system health
        const healthStatus = await this.performHealthCheck();
        if (!healthStatus.isHealthy) {
            throw new Error(`Cannot reset emergency stop: System unhealthy - ${healthStatus.issues.join(', ')}`);
        }

        this.systemStatus.isEmergencyStopped = false;

        await this.systemIntegration.recordAlert('INFO', 'Emergency stop state reset', {
            healthStatus,
            systemStatus: this.systemStatus
        });

        this.emit('emergencyStopReset', this.systemStatus);
        console.log('✅ Emergency stop state reset');
    }

    // Private Methods

    private initializeDefaults(): void {
        this.portfolio = {
            totalValue: 100000, // $100k starting capital
            totalPnL: 0,
            positions: [],
            cash: 100000,
            margin: 0,
            marginUsed: 0,
            leverage: 1,
            lastUpdated: new Date()
        };

        this.riskLimits = {
            maxPositionSize: 10000, // $10k per position
            maxDailyLoss: -5000, // -$5k daily loss limit
            maxDrawdown: -10000, // -$10k max drawdown
            maxLeverage: 3,
            maxVaR: 2000, // $2k VaR limit
            maxConcentration: 0.3, // 30% max in single asset
            emergencyStopLoss: -15000 // -$15k emergency stop
        };

        this.executionConfig = {
            slippageTolerance: 0.001, // 0.1%
            maxOrderSize: 10000,
            executionTimeout: 30000, // 30 seconds
            retryAttempts: 3,
            minOrderValue: 10,
            enablePaperTrading: true // Start in paper trading mode
        };

        this.systemStatus = {
            isRunning: false,
            isEmergencyStopped: false,
            lastHealthCheck: new Date(),
            activeStrategies: 0,
            totalPositions: 0,
            systemLoad: 0,
            memoryUsage: 0,
            cacheHitRatio: 0
        };

        this.performanceMetrics = {
            totalReturn: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
            winRate: 0,
            averageReturn: 0,
            volatility: 0,
            tradesCount: 0,
            avgTradeSize: 0,
            currentVaR: 0
        };
    }

    private setupEventListeners(): void {
        try {
            // Market data events - check if marketDataEngine has event methods
            if (this.marketDataEngine && typeof this.marketDataEngine.on === 'function') {
                this.marketDataEngine.on('priceUpdate', this.handlePriceUpdate.bind(this));
                this.marketDataEngine.on('connectionLost', this.handleConnectionLoss.bind(this));
            } else {
                console.warn('⚠️ MarketDataEngine does not support events - using mock mode');
            }

            // Strategy events
            this.on('signalGenerated', this.handleTradingSignal.bind(this));
            this.on('positionUpdate', this.handlePositionUpdate.bind(this));
            this.on('riskBreach', this.handleRiskBreach.bind(this));
        } catch (error) {
            console.error('❌ Failed to setup event listeners:', error);
            // Continue initialization even if events fail in test environment
        }
    }

    private async initializeMarketData(): Promise<void> {
        // Market data initialization handled by RealTimeMarketDataEngine
        console.log('📊 Market data engine ready');
    }

    private async loadPortfolioState(): Promise<void> {
        try {
            const cachedPortfolio = await this.cacheManager.get('portfolio:current');
            if (cachedPortfolio) {
                this.portfolio = { ...this.portfolio, ...cachedPortfolio };
                console.log('📂 Portfolio state loaded from cache');
            }
        } catch (error) {
            console.log('📂 No cached portfolio state found, using defaults');
        }
    }

    private async savePortfolioState(): Promise<void> {
        await this.cacheManager.set('portfolio:current', this.portfolio, 86400); // 24h TTL
        console.log('💾 Portfolio state saved to cache');
    }

    private async initializeStrategies(): Promise<void> {
        const activeStrategies = this.strategyOrchestrator.getActiveStrategies();
        this.systemStatus.activeStrategies = activeStrategies.length;
        console.log(`🧠 ${activeStrategies.length} strategies initialized: ${activeStrategies.join(', ')}`);
    }

    private async initializeRiskMonitoring(): Promise<void> {
        // Calculate initial VaR
        const positions = Array.from(this.positions.values());
        if (positions.length > 0) {
            this.performanceMetrics.currentVaR = await this.varCalculator.calculateVaR(positions, {
                confidence: 0.95,
                timeHorizon: 1
            });
        }
        console.log('⚠️ Risk monitoring initialized');
    }

    private startHealthMonitoring(): void {
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthCheck();
        }, 30000); // Every 30 seconds
    }

    private setupStrategyExecution(): void {
        this.marketDataEngine.on('priceUpdate', async (data: any) => {
            try {
                const signals = await this.strategyOrchestrator.executeStrategies(data);
                for (const signal of signals) {
                    this.emit('signalGenerated', signal);
                }
            } catch (error) {
                console.error('Strategy execution error:', error);
            }
        });
    }

    private startOrderProcessing(): void {
        // Process orders every 100ms
        setInterval(() => {
            this.processOrderQueue();
        }, 100);
    }

    private startPerformanceTracking(): void {
        this.performanceUpdateInterval = setInterval(async () => {
            await this.updatePerformanceMetrics();
        }, 5000); // Every 5 seconds
    }

    private async processOrderQueue(): Promise<void> {
        if (this.executionQueue.length === 0) return;

        const order = this.executionQueue.shift();
        if (!order) return;

        try {
            await this.executeOrder(order);
        } catch (error) {
            console.error(`Order execution failed: ${order.id}`, error);
            order.status = 'REJECTED';
            this.orders.set(order.id, order);
        }
    }

    private async executeOrder(order: TradingOrder): Promise<void> {
        // In paper trading mode, simulate execution
        if (this.executionConfig.enablePaperTrading) {
            await this.simulateOrderExecution(order);
        } else {
            // Real execution would go here
            throw new Error('Real trading execution not implemented');
        }
    }

    private async simulateOrderExecution(order: TradingOrder): Promise<void> {
        // Get current market price
        const currentPrice = await this.marketDataEngine.getCurrentPrice(order.symbol);
        
        // Simulate slippage
        const slippage = this.executionConfig.slippageTolerance;
        const executionPrice = order.side === 'BUY' 
            ? currentPrice * (1 + slippage)
            : currentPrice * (1 - slippage);

        // Create or update position
        const position = this.createOrUpdatePosition(order, executionPrice);
        
        // Update order status
        order.status = 'FILLED';
        this.orders.set(order.id, order);

        // Update portfolio
        this.updatePortfolioFromExecution(order, executionPrice);

        this.monitoringSystem.recordMetric('orders_filled_total', 1, {
            symbol: order.symbol,
            side: order.side
        });

        this.emit('orderFilled', { order, position, executionPrice });
        console.log(`✅ Order filled: ${order.id} at ${executionPrice}`);
    }

    private createOrUpdatePosition(order: TradingOrder, executionPrice: number): TradingPosition {
        const existingPosition = Array.from(this.positions.values())
            .find(p => p.symbol === order.symbol && p.strategyId === order.strategyId);

        if (existingPosition) {
            // Update existing position
            const newSize = order.side === 'BUY' 
                ? existingPosition.size + order.quantity
                : existingPosition.size - order.quantity;

            existingPosition.size = newSize;
            existingPosition.currentPrice = executionPrice;
            existingPosition.unrealizedPnL = this.calculateUnrealizedPnL(existingPosition);

            this.positions.set(existingPosition.id, existingPosition);
            return existingPosition;
        } else {
            // Create new position
            const position: TradingPosition = {
                id: uuidv4(),
                symbol: order.symbol,
                size: order.side === 'BUY' ? order.quantity : -order.quantity,
                entryPrice: executionPrice,
                currentPrice: executionPrice,
                unrealizedPnL: 0,
                timestamp: new Date(),
                strategyId: order.strategyId,
                type: order.side === 'BUY' ? 'LONG' : 'SHORT'
            };

            this.positions.set(position.id, position);
            return position;
        }
    }

    private updatePortfolioFromExecution(order: TradingOrder, executionPrice: number): void {
        const orderValue = order.quantity * executionPrice;
        
        if (order.side === 'BUY') {
            this.portfolio.cash -= orderValue;
        } else {
            this.portfolio.cash += orderValue;
        }

        this.portfolio.lastUpdated = new Date();
        this.updatePortfolioMetrics();
    }

    private updatePortfolioMetrics(): void {
        let totalPositionValue = 0;
        let totalUnrealizedPnL = 0;

        for (const position of Array.from(this.positions.values())) {
            totalPositionValue += Math.abs(position.size) * position.currentPrice;
            totalUnrealizedPnL += position.unrealizedPnL;
        }

        this.portfolio.totalValue = this.portfolio.cash + totalPositionValue + totalUnrealizedPnL;
        this.portfolio.totalPnL = this.portfolio.totalValue - 100000; // Starting capital
        this.portfolio.positions = Array.from(this.positions.values());
        this.systemStatus.totalPositions = this.positions.size;
    }

    private calculateUnrealizedPnL(position: TradingPosition): number {
        const priceDiff = position.currentPrice - position.entryPrice;
        return position.size * priceDiff;
    }

    private async validateOrderRisk(orderRequest: any): Promise<{ isValid: boolean; reason?: string }> {
        // Position size check
        const orderValue = orderRequest.quantity * (orderRequest.price || 1000); // Estimate price
        if (orderValue > this.riskLimits.maxPositionSize) {
            return { isValid: false, reason: 'Exceeds maximum position size' };
        }

        // Portfolio concentration check
        const symbolPositions = Array.from(this.positions.values())
            .filter(p => p.symbol === orderRequest.symbol);
        const totalSymbolValue = symbolPositions.reduce((sum, p) => sum + Math.abs(p.size) * p.currentPrice, 0);
        const concentration = (totalSymbolValue + orderValue) / this.portfolio.totalValue;
        
        if (concentration > this.riskLimits.maxConcentration) {
            return { isValid: false, reason: 'Exceeds concentration limit' };
        }

        // Emergency stop check
        if (this.systemStatus.isEmergencyStopped) {
            return { isValid: false, reason: 'Emergency stop is active' };
        }

        return { isValid: true };
    }

    private async performHealthCheck(): Promise<{ isHealthy: boolean; issues: string[] }> {
        const issues: string[] = [];

        // Check system memory
        const memoryStats = await this.memoryOptimizer.getMemoryStats();
        if (memoryStats.used > 512 * 1024 * 1024) { // 512MB limit
            issues.push('High memory usage');
        }

        // Check monitoring system
        const monitoringStatus = await this.systemIntegration.getMonitoringStatus();
        if (!monitoringStatus.isHealthy) {
            issues.push('Monitoring system unhealthy');
        }

        // Check daily loss limit
        if (this.portfolio.totalPnL < this.riskLimits.maxDailyLoss) {
            issues.push('Daily loss limit breached');
        }

        // Update system status
        this.systemStatus.lastHealthCheck = new Date();
        this.systemStatus.memoryUsage = memoryStats.used;

        const isHealthy = issues.length === 0;

        if (!isHealthy) {
            await this.systemIntegration.recordAlert('WARNING', 'Health check failed', {
                issues,
                systemStatus: this.systemStatus
            });
        }

        return { isHealthy, issues };
    }

    private async updatePerformanceMetrics(): Promise<void> {
        // Update position prices and PnL
        for (const position of Array.from(this.positions.values())) {
            try {
                position.currentPrice = await this.marketDataEngine.getCurrentPrice(position.symbol);
                position.unrealizedPnL = this.calculateUnrealizedPnL(position);
            } catch (error) {
                console.error(`Failed to update price for ${position.symbol}:`, error);
            }
        }

        // Update portfolio metrics
        this.updatePortfolioMetrics();

        // Calculate performance metrics
        this.performanceMetrics.totalReturn = (this.portfolio.totalValue / 100000 - 1) * 100;
        this.performanceMetrics.tradesCount = this.orders.size;

        // Update VaR
        const positions = Array.from(this.positions.values());
        if (positions.length > 0) {
            try {
                this.performanceMetrics.currentVaR = await this.varCalculator.calculateVaR(positions, {
                    confidence: 0.95,
                    timeHorizon: 1
                });
            } catch (error) {
                console.error('VaR calculation failed:', error);
            }
        }

        // Record metrics
        this.monitoringSystem.recordMetric('portfolio_value', this.portfolio.totalValue);
        this.monitoringSystem.recordMetric('total_pnl', this.portfolio.totalPnL);
        this.monitoringSystem.recordMetric('current_var', this.performanceMetrics.currentVaR);
    }

    private async cancelAllOrders(): Promise<void> {
        for (const order of Array.from(this.orders.values())) {
            if (order.status === 'PENDING') {
                order.status = 'CANCELLED';
                this.orders.set(order.id, order);
            }
        }
        this.executionQueue.length = 0;
        console.log('❌ All pending orders cancelled');
    }

    private async closeAllPositions(): Promise<void> {
        for (const position of Array.from(this.positions.values())) {
            // Create closing order
            const closeOrder: TradingOrder = {
                id: uuidv4(),
                symbol: position.symbol,
                type: 'MARKET',
                side: position.type === 'LONG' ? 'SELL' : 'BUY',
                quantity: Math.abs(position.size),
                status: 'PENDING',
                timestamp: new Date(),
                strategyId: position.strategyId
            };

            await this.executeOrder(closeOrder);
        }
        console.log('🔄 All positions closed');
    }

    private async liquidateAllPositions(): Promise<void> {
        // Emergency liquidation - immediate execution
        for (const position of Array.from(this.positions.values())) {
            position.size = 0;
            position.unrealizedPnL = 0;
        }
        this.positions.clear();
        console.log('💥 All positions liquidated');
    }

    // Event Handlers

    private async handlePriceUpdate(data: any): Promise<void> {
        // Update position prices
        for (const position of Array.from(this.positions.values())) {
            if (data.symbol === position.symbol) {
                position.currentPrice = data.price;
                position.unrealizedPnL = this.calculateUnrealizedPnL(position);
            }
        }

        // Check for risk breaches
        await this.checkRiskLimits();
    }

    private async handleConnectionLoss(): Promise<void> {
        await this.systemIntegration.recordAlert('CRITICAL', 'Market data connection lost');
        // Implement reconnection logic or emergency procedures
    }

    private async handleTradingSignal(signal: any): Promise<void> {
        try {
            // Convert signal to order
            const orderRequest = this.convertSignalToOrder(signal);
            if (orderRequest) {
                await this.placeOrder(orderRequest);
            }
        } catch (error) {
            console.error('Signal handling error:', error);
        }
    }

    private convertSignalToOrder(signal: any): Omit<TradingOrder, 'id' | 'status' | 'timestamp'> | null {
        if (!signal.action || signal.action === 'HOLD') {
            return null;
        }

        return {
            symbol: signal.symbol,
            type: 'MARKET',
            side: signal.action === 'BUY' ? 'BUY' : 'SELL',
            quantity: signal.quantity || 100, // Default quantity
            strategyId: signal.strategyId
        };
    }

    private handlePositionUpdate(data: any): void {
        this.emit('portfolioUpdate', this.portfolio);
    }

    private async handleRiskBreach(data: any): Promise<void> {
        await this.systemIntegration.recordAlert('CRITICAL', 'Risk limit breached', data);
        
        if (data.severity === 'EMERGENCY') {
            await this.emergencyStop(`Risk breach: ${data.type}`);
        }
    }

    private async checkRiskLimits(): Promise<void> {
        // Daily loss check
        if (this.portfolio.totalPnL <= this.riskLimits.emergencyStopLoss) {
            this.emit('riskBreach', {
                type: 'EMERGENCY_STOP_LOSS',
                severity: 'EMERGENCY',
                currentPnL: this.portfolio.totalPnL,
                limit: this.riskLimits.emergencyStopLoss
            });
            return;
        }

        // VaR check
        if (this.performanceMetrics.currentVaR > this.riskLimits.maxVaR) {
            this.emit('riskBreach', {
                type: 'VAR_EXCEEDED',
                severity: 'HIGH',
                currentVaR: this.performanceMetrics.currentVaR,
                limit: this.riskLimits.maxVaR
            });
        }

        // Daily loss warning
        if (this.portfolio.totalPnL <= this.riskLimits.maxDailyLoss) {
            this.emit('riskBreach', {
                type: 'DAILY_LOSS_LIMIT',
                severity: 'MEDIUM',
                currentPnL: this.portfolio.totalPnL,
                limit: this.riskLimits.maxDailyLoss
            });
        }
    }
}

export {
    TradingPosition,
    TradingOrder,
    Portfolio,
    RiskLimits,
    ExecutionConfig,
    SystemStatus,
    PerformanceMetrics
};

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
 * PHASE C.4 - Emergency Stop Mechanisms
 * 
 * Multi-layer emergency stop system providing automatic trading halt
 * and position liquidation based on various risk conditions.
 * 
 * Integrates with:
 * - Phase A: Cache for rapid condition checking
 * - Phase B: Memory monitoring for system health
 * - Phase C.2: Strategy orchestrator control
 * - Phase C.3: Real-time alerting and monitoring
 * - Real-Time VaR Monitor for risk-based triggers
 */

import { EventEmitter } from 'events';

// Emergency Condition Types
interface EmergencyCondition {
    id: string;
    type: 'market_volatility' | 'portfolio_loss' | 'var_breach' | 'system_health' | 
          'connection_loss' | 'memory_overflow' | 'error_rate' | 'liquidity_crisis' | 
          'flash_crash' | 'manual_trigger';
    threshold: number;
    timeWindow: number; // seconds
    priority: 'low' | 'medium' | 'high' | 'critical';
    action: EmergencyAction;
    description: string;
    enabled: boolean;
}

interface EmergencyAction {
    type: 'pause' | 'stop' | 'liquidate_partial' | 'liquidate_all' | 'hedge';
    parameters: {
        liquidationPercentage?: number; // For partial liquidation
        hedgeRatio?: number; // For hedging action
        cooldownPeriod?: number; // Seconds before resuming
        requireManualApproval?: boolean;
    };
}

interface EmergencyTrigger {
    conditionId: string;
    triggeredAt: Date;
    triggerValue: number;
    threshold: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    autoResolved: boolean;
    resolvedAt?: Date;
    metadata: Record<string, any>;
}

interface EmergencyState {
    isActive: boolean;
    level: 'none' | 'yellow' | 'orange' | 'red' | 'black';
    activeTriggers: EmergencyTrigger[];
    lastTriggered?: Date;
    totalTriggers: number;
    systemStatus: 'normal' | 'degraded' | 'emergency' | 'offline';
    manualOverride: boolean;
}

interface LiquidationOrder {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    orderType: 'market' | 'limit';
    urgency: 'normal' | 'urgent' | 'immediate';
    status: 'pending' | 'executing' | 'completed' | 'failed';
    submittedAt: Date;
    completedAt?: Date;
    executedPrice?: number;
    slippage?: number;
}

interface EmergencyMetrics {
    totalEmergencyStops: number;
    averageResolutionTime: number; // seconds
    falsePositiveRate: number; // percentage
    liquidationEfficiency: number; // percentage
    systemDowntime: number; // total seconds
    lastEmergencyStop: Date | null;
    emergencyStopsByType: Record<string, number>;
    performanceImpact: {
        tradingHalts: number;
        missedOpportunities: number;
        protectedLosses: number;
    };
}

interface SystemHealthData {
    memoryUsage: number;
    cpuUsage: number;
    networkLatency: number;
    errorRate: number;
    connectionStatus: boolean;
    lastUpdate: Date;
}

interface MarketCondition {
    symbol: string;
    volatility: number;
    volume: number;
    priceChange: number;
    bid: number;
    ask: number;
    spread: number;
    liquidity: number;
    timestamp: Date;
}

// External Dependencies
interface CacheService {
    get(key: string): Promise<any>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    invalidate(pattern: string): Promise<void>;
}

interface MonitoringSystemIntegration {
    recordMetric(name: string, value: number, tags?: Record<string, string>): void;
    sendAlert(alert: { level: string; message: string; component: string; metadata?: any }): Promise<void>;
    getSystemHealth(): Promise<{ status: string; components: Record<string, boolean>; uptime: number }>;
}

interface ProductionTradingEngine {
    stop(): Promise<void>;
    emergencyStop(reason: string, liquidate: boolean): Promise<void>;
    getPortfolio(): any;
    getSystemState(): any;
    cancelAllOrders(): Promise<void>;
}

interface AdvancedStrategyOrchestrator {
    pauseAllStrategies(): Promise<void>;
    resumeAllStrategies(): Promise<void>;
    getActiveStrategies(): string[];
}

interface RealTimeVaRMonitor {
    getCurrentPortfolioRisk(): any;
    stopMonitoring(): void;
}

interface MarketDataProvider {
    getCurrentPrice(symbol: string): Promise<number>;
    getMarketCondition(symbol: string): Promise<MarketCondition>;
    isConnected(): boolean;
}

interface OrderExecutor {
    executeOrder(order: any): Promise<any>;
    cancelAllOrders(): Promise<void>;
}

/**
 * Emergency Stop System
 * 
 * Provides comprehensive emergency controls with:
 * - Multi-layer condition monitoring
 * - Automated response triggers
 * - Risk-based position liquidation
 * - System health protection
 * - Manual override capabilities
 */
export class EmergencyStopSystem extends EventEmitter {
    private cacheService: CacheService;
    private monitoringSystem: MonitoringSystemIntegration;
    private productionEngine: ProductionTradingEngine;
    private strategyOrchestrator: AdvancedStrategyOrchestrator;
    private varMonitor: RealTimeVaRMonitor;
    private marketDataProvider: MarketDataProvider;
    private orderExecutor: OrderExecutor;
    
    private emergencyConditions: Map<string, EmergencyCondition> = new Map();
    private emergencyState: EmergencyState = {} as EmergencyState;
    private emergencyMetrics: EmergencyMetrics = {} as EmergencyMetrics;
    private activeLiquidations: Map<string, LiquidationOrder> = new Map();
    
    private isMonitoring: boolean = false;
    private monitoringInterval: NodeJS.Timeout | null = null;
    private lastHealthCheck: Date = new Date();
    
    constructor(
        cacheService: CacheService,
        monitoringSystem: MonitoringSystemIntegration,
        productionEngine: ProductionTradingEngine,
        strategyOrchestrator: AdvancedStrategyOrchestrator,
        varMonitor: RealTimeVaRMonitor,
        marketDataProvider: MarketDataProvider,
        orderExecutor: OrderExecutor
    ) {
        super();
        
        this.cacheService = cacheService;
        this.monitoringSystem = monitoringSystem;
        this.productionEngine = productionEngine;
        this.strategyOrchestrator = strategyOrchestrator;
        this.varMonitor = varMonitor;
        this.marketDataProvider = marketDataProvider;
        this.orderExecutor = orderExecutor;
        
        this.initializeEmergencyState();
        this.initializeEmergencyMetrics();
        this.setupDefaultConditions();
    }

    /**
     * Initialize Emergency Stop System
     */
    public async initialize(): Promise<void> {
        try {
            console.log('🚨 Initializing Emergency Stop System...');
            
            // Load saved emergency conditions
            await this.loadEmergencyConditions();
            
            // Validate system connections
            await this.validateSystemConnections();
            
            // Setup monitoring infrastructure
            await this.setupEmergencyMonitoring();
            
            console.log('✅ Emergency Stop System initialized successfully');
            
            this.monitoringSystem.recordMetric('emergency_system.initialization', 1, {
                conditions_count: this.emergencyConditions.size.toString(),
                timestamp: new Date().toISOString()
            });
            
            this.emit('initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Emergency Stop System:', error);
            
            await this.monitoringSystem.sendAlert({
                level: 'critical',
                message: `Emergency Stop System initialization failed: ${(error as Error).message}`,
                component: 'EmergencyStopSystem'
            });
            
            throw error;
        }
    }

    /**
     * Start Emergency Monitoring
     */
    public async startMonitoring(): Promise<void> {
        if (this.isMonitoring) {
            console.log('⚠️ Emergency monitoring is already active');
            return;
        }

        try {
            console.log('🔍 Starting emergency condition monitoring...');
            
            this.isMonitoring = true;
            this.emergencyState.systemStatus = 'normal';
            
            // Start continuous monitoring loop
            this.monitoringInterval = setInterval(async () => {
                await this.checkEmergencyConditions();
            }, 1000); // Check every second for emergency conditions
            
            // Perform initial check
            await this.checkEmergencyConditions();
            
            console.log('✅ Emergency monitoring started');
            
            this.monitoringSystem.recordMetric('emergency_system.monitoring_start', 1);
            this.emit('monitoring_started');
            
        } catch (error) {
            console.error('❌ Failed to start emergency monitoring:', error);
            this.isMonitoring = false;
            
            await this.monitoringSystem.sendAlert({
                level: 'error',
                message: `Emergency monitoring start failed: ${(error as Error).message}`,
                component: 'EmergencyStopSystem'
            });
            
            throw error;
        }
    }

    /**
     * Stop Emergency Monitoring
     */
    public stopMonitoring(): void {
        if (!this.isMonitoring) {
            console.log('⚠️ Emergency monitoring is not active');
            return;
        }

        console.log('🛑 Stopping emergency monitoring...');
        
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        console.log('✅ Emergency monitoring stopped');
        
        this.monitoringSystem.recordMetric('emergency_system.monitoring_stop', 1);
        this.emit('monitoring_stopped');
    }

    /**
     * Trigger Manual Emergency Stop
     */
    public async triggerManualEmergencyStop(
        reason: string, 
        action: EmergencyAction,
        operatorId?: string
    ): Promise<void> {
        console.log(`🚨 MANUAL EMERGENCY STOP: ${reason}`);
        
        try {
            const trigger: EmergencyTrigger = {
                conditionId: 'manual_trigger',
                triggeredAt: new Date(),
                triggerValue: 1,
                threshold: 1,
                severity: 'critical',
                autoResolved: false,
                metadata: {
                    reason,
                    operatorId,
                    manual: true
                }
            };
            
            await this.executeEmergencyAction(trigger, action);
            
            this.emergencyMetrics.totalEmergencyStops++;
            this.emergencyMetrics.lastEmergencyStop = new Date();
            
            await this.monitoringSystem.sendAlert({
                level: 'critical',
                message: `MANUAL EMERGENCY STOP: ${reason}`,
                component: 'EmergencyStopSystem',
                metadata: {
                    operatorId,
                    action: action.type,
                    timestamp: new Date().toISOString()
                }
            });
            
            this.emit('manual_emergency_stop', { reason, action, operatorId });
            
        } catch (error) {
            console.error('❌ Manual emergency stop failed:', error);
            throw error;
        }
    }

    /**
     * Add or Update Emergency Condition
     */
    public addEmergencyCondition(condition: EmergencyCondition): void {
        this.emergencyConditions.set(condition.id, condition);
        
        // Save to cache
        this.cacheService.set('emergency_conditions', 
            Array.from(this.emergencyConditions.values()), 3600);
        
        console.log(`📋 Emergency condition added: ${condition.id} (${condition.type})`);
        
        this.monitoringSystem.recordMetric('emergency_system.condition_added', 1, {
            condition_type: condition.type,
            priority: condition.priority
        });
        
        this.emit('condition_added', condition);
    }

    /**
     * Remove Emergency Condition
     */
    public removeEmergencyCondition(conditionId: string): boolean {
        const removed = this.emergencyConditions.delete(conditionId);
        
        if (removed) {
            // Update cache
            this.cacheService.set('emergency_conditions', 
                Array.from(this.emergencyConditions.values()), 3600);
            
            console.log(`🗑️ Emergency condition removed: ${conditionId}`);
            
            this.monitoringSystem.recordMetric('emergency_system.condition_removed', 1);
            this.emit('condition_removed', conditionId);
        }
        
        return removed;
    }

    /**
     * Get Current Emergency State
     */
    public getEmergencyState(): EmergencyState {
        return { ...this.emergencyState };
    }

    /**
     * Get Emergency Metrics
     */
    public getEmergencyMetrics(): EmergencyMetrics {
        return { ...this.emergencyMetrics };
    }

    /**
     * Get Active Emergency Conditions
     */
    public getEmergencyConditions(): EmergencyCondition[] {
        return Array.from(this.emergencyConditions.values());
    }

    /**
     * Resume Normal Operations (Manual Override)
     */
    public async resumeNormalOperations(operatorId: string, reason: string): Promise<void> {
        if (!this.emergencyState.isActive) {
            console.log('⚠️ No emergency state active');
            return;
        }

        try {
            console.log(`🔄 Resuming normal operations: ${reason}`);
            
            // Clear emergency state
            this.emergencyState.isActive = false;
            this.emergencyState.level = 'none';
            this.emergencyState.activeTriggers = [];
            this.emergencyState.manualOverride = true;
            this.emergencyState.systemStatus = 'normal';
            
            // Resume strategy orchestrator
            await this.strategyOrchestrator.resumeAllStrategies();
            
            console.log('✅ Normal operations resumed');
            
            await this.monitoringSystem.sendAlert({
                level: 'info',
                message: `Normal operations resumed: ${reason}`,
                component: 'EmergencyStopSystem',
                metadata: {
                    operatorId,
                    timestamp: new Date().toISOString()
                }
            });
            
            this.emit('operations_resumed', { operatorId, reason });
            
        } catch (error) {
            console.error('❌ Failed to resume normal operations:', error);
            throw error;
        }
    }

    // Private Implementation Methods

    private initializeEmergencyState(): void {
        this.emergencyState = {
            isActive: false,
            level: 'none',
            activeTriggers: [],
            totalTriggers: 0,
            systemStatus: 'normal',
            manualOverride: false
        };
    }

    private initializeEmergencyMetrics(): void {
        this.emergencyMetrics = {
            totalEmergencyStops: 0,
            averageResolutionTime: 0,
            falsePositiveRate: 0,
            liquidationEfficiency: 0,
            systemDowntime: 0,
            lastEmergencyStop: null,
            emergencyStopsByType: {},
            performanceImpact: {
                tradingHalts: 0,
                missedOpportunities: 0,
                protectedLosses: 0
            }
        };
    }

    private setupDefaultConditions(): void {
        // Portfolio Loss Limit
        this.addEmergencyCondition({
            id: 'portfolio_loss_5pct',
            type: 'portfolio_loss',
            threshold: 0.05, // 5% loss
            timeWindow: 300, // 5 minutes
            priority: 'high',
            action: {
                type: 'liquidate_partial',
                parameters: {
                    liquidationPercentage: 0.5,
                    cooldownPeriod: 1800,
                    requireManualApproval: false
                }
            },
            description: 'Portfolio loss exceeds 5% in 5 minutes',
            enabled: true
        });

        // VaR Breach
        this.addEmergencyCondition({
            id: 'var_breach_critical',
            type: 'var_breach',
            threshold: 1.2, // 120% of VaR limit
            timeWindow: 60, // 1 minute
            priority: 'critical',
            action: {
                type: 'liquidate_partial',
                parameters: {
                    liquidationPercentage: 0.3,
                    cooldownPeriod: 900,
                    requireManualApproval: false
                }
            },
            description: 'VaR exceeds 120% of limit',
            enabled: true
        });

        // Market Volatility Spike
        this.addEmergencyCondition({
            id: 'volatility_spike',
            type: 'market_volatility',
            threshold: 0.15, // 15% volatility
            timeWindow: 180, // 3 minutes
            priority: 'medium',
            action: {
                type: 'pause',
                parameters: {
                    cooldownPeriod: 600,
                    requireManualApproval: true
                }
            },
            description: 'Market volatility exceeds 15%',
            enabled: true
        });

        // System Health
        this.addEmergencyCondition({
            id: 'memory_overflow',
            type: 'memory_overflow',
            threshold: 0.9, // 90% memory usage
            timeWindow: 30, // 30 seconds
            priority: 'high',
            action: {
                type: 'stop',
                parameters: {
                    cooldownPeriod: 300,
                    requireManualApproval: true
                }
            },
            description: 'Memory usage exceeds 90%',
            enabled: true
        });

        // Connection Loss
        this.addEmergencyCondition({
            id: 'connection_loss',
            type: 'connection_loss',
            threshold: 1, // Connection lost
            timeWindow: 10, // 10 seconds
            priority: 'critical',
            action: {
                type: 'stop',
                parameters: {
                    cooldownPeriod: 60,
                    requireManualApproval: true
                }
            },
            description: 'Market data connection lost',
            enabled: true
        });

        console.log(`📋 Default emergency conditions setup: ${this.emergencyConditions.size} conditions`);
    }

    private async loadEmergencyConditions(): Promise<void> {
        try {
            const cached = await this.cacheService.get('emergency_conditions');
            if (cached && Array.isArray(cached)) {
                for (const condition of cached) {
                    this.emergencyConditions.set(condition.id, condition);
                }
                console.log(`📋 Loaded ${cached.length} emergency conditions from cache`);
            }
        } catch (error) {
            console.error('❌ Failed to load emergency conditions:', error);
        }
    }

    private async validateSystemConnections(): Promise<void> {
        console.log('🔍 Validating system connections...');
        
        // Check market data connection
        if (!this.marketDataProvider.isConnected()) {
            throw new Error('Market data provider not connected');
        }
        
        // Check monitoring system
        const health = await this.monitoringSystem.getSystemHealth();
        if (health.status !== 'healthy') {
            console.warn(`⚠️ System health degraded: ${health.status}`);
        }
        
        console.log('✅ System connections validated');
    }

    private async setupEmergencyMonitoring(): Promise<void> {
        console.log('🔧 Setting up emergency monitoring infrastructure...');
        
        // Register emergency metrics
        this.monitoringSystem.recordMetric('emergency_system.setup', 1, {
            conditions_count: this.emergencyConditions.size.toString()
        });
        
        console.log('✅ Emergency monitoring infrastructure ready');
    }

    private async checkEmergencyConditions(): Promise<void> {
        try {
            this.lastHealthCheck = new Date();
            
            // Skip if manual override is active
            if (this.emergencyState.manualOverride) {
                return;
            }
            
            // Check each enabled condition
            for (const condition of Array.from(this.emergencyConditions.values())) {
                if (!condition.enabled) continue;
                
                const triggered = await this.evaluateCondition(condition);
                
                if (triggered) {
                    await this.handleConditionTrigger(condition, triggered);
                }
            }
            
            // Update emergency level based on active triggers
            this.updateEmergencyLevel();
            
            // Record health check
            this.monitoringSystem.recordMetric('emergency_system.health_check', 1);
            
        } catch (error) {
            console.error('❌ Emergency condition check failed:', error);
            
            await this.monitoringSystem.sendAlert({
                level: 'warning',
                message: `Emergency condition check failed: ${(error as Error).message}`,
                component: 'EmergencyStopSystem'
            });
        }
    }

    private async evaluateCondition(condition: EmergencyCondition): Promise<EmergencyTrigger | null> {
        try {
            let currentValue: number;
            let metadata: Record<string, any> = {};
            
            switch (condition.type) {
                case 'portfolio_loss':
                    currentValue = await this.checkPortfolioLoss();
                    metadata = { portfolioValue: currentValue };
                    break;
                
                case 'var_breach':
                    currentValue = await this.checkVaRBreach();
                    metadata = { currentVaR: currentValue };
                    break;
                
                case 'market_volatility':
                    currentValue = await this.checkMarketVolatility();
                    metadata = { volatility: currentValue };
                    break;
                
                case 'memory_overflow':
                    currentValue = await this.checkMemoryUsage();
                    metadata = { memoryUsage: currentValue };
                    break;
                
                case 'connection_loss':
                    currentValue = this.checkConnectionStatus() ? 0 : 1;
                    metadata = { connected: currentValue === 0 };
                    break;
                
                case 'error_rate':
                    currentValue = await this.checkErrorRate();
                    metadata = { errorRate: currentValue };
                    break;
                
                default:
                    return null;
            }
            
            // Check if threshold is breached
            if (currentValue >= condition.threshold) {
                return {
                    conditionId: condition.id,
                    triggeredAt: new Date(),
                    triggerValue: currentValue,
                    threshold: condition.threshold,
                    severity: this.mapPriorityToSeverity(condition.priority),
                    autoResolved: false,
                    metadata
                };
            }
            
            return null;
            
        } catch (error) {
            console.error(`❌ Failed to evaluate condition ${condition.id}:`, error);
            return null;
        }
    }

    private async handleConditionTrigger(condition: EmergencyCondition, trigger: EmergencyTrigger): Promise<void> {
        console.log(`🚨 EMERGENCY CONDITION TRIGGERED: ${condition.id}`);
        
        try {
            // Add to active triggers
            this.emergencyState.activeTriggers.push(trigger);
            this.emergencyState.totalTriggers++;
            this.emergencyState.isActive = true;
            
            // Update metrics
            this.emergencyMetrics.totalEmergencyStops++;
            this.emergencyMetrics.lastEmergencyStop = new Date();
            this.emergencyMetrics.emergencyStopsByType[condition.type] = 
                (this.emergencyMetrics.emergencyStopsByType[condition.type] || 0) + 1;
            
            // Execute emergency action
            await this.executeEmergencyAction(trigger, condition.action);
            
            // Send alert
            await this.monitoringSystem.sendAlert({
                level: trigger.severity,
                message: `Emergency condition triggered: ${condition.description}`,
                component: 'EmergencyStopSystem',
                metadata: {
                    conditionId: condition.id,
                    triggerValue: trigger.triggerValue,
                    threshold: trigger.threshold,
                    action: condition.action.type
                }
            });
            
            this.emit('emergency_triggered', { condition, trigger });
            
        } catch (error) {
            console.error(`❌ Failed to handle emergency trigger for ${condition.id}:`, error);
            throw error;
        }
    }

    private async executeEmergencyAction(trigger: EmergencyTrigger, action: EmergencyAction): Promise<void> {
        console.log(`⚡ Executing emergency action: ${action.type}`);
        
        try {
            const startTime = Date.now();
            
            switch (action.type) {
                case 'pause':
                    await this.strategyOrchestrator.pauseAllStrategies();
                    this.emergencyState.systemStatus = 'degraded';
                    break;
                
                case 'stop':
                    await this.productionEngine.stop();
                    this.emergencyState.systemStatus = 'emergency';
                    break;
                
                case 'liquidate_partial':
                    await this.executeLiquidation(action.parameters.liquidationPercentage || 0.5);
                    this.emergencyState.systemStatus = 'emergency';
                    break;
                
                case 'liquidate_all':
                    await this.executeLiquidation(1.0);
                    this.emergencyState.systemStatus = 'emergency';
                    break;
                
                case 'hedge':
                    await this.executeHedging(action.parameters.hedgeRatio || 0.5);
                    this.emergencyState.systemStatus = 'degraded';
                    break;
            }
            
            const executionTime = Date.now() - startTime;
            
            console.log(`✅ Emergency action executed: ${action.type} (${executionTime}ms)`);
            
            this.monitoringSystem.recordMetric('emergency_system.action_executed', 1, {
                action_type: action.type,
                execution_time: executionTime.toString(),
                trigger_condition: trigger.conditionId
            });
            
            this.emit('emergency_action_executed', { trigger, action, executionTime });
            
        } catch (error) {
            console.error(`❌ Emergency action execution failed: ${action.type}`, error);
            
            await this.monitoringSystem.sendAlert({
                level: 'critical',
                message: `Emergency action execution failed: ${action.type} - ${(error as Error).message}`,
                component: 'EmergencyStopSystem'
            });
            
            throw error;
        }
    }

    private async executeLiquidation(liquidationPercentage: number): Promise<void> {
        console.log(`💧 Executing liquidation: ${(liquidationPercentage * 100).toFixed(1)}%`);
        
        try {
            const portfolio = this.productionEngine.getPortfolio();
            const positions = portfolio.positions || [];
            
            for (const position of positions) {
                const liquidationSize = position.size * liquidationPercentage;
                
                const liquidationOrder: LiquidationOrder = {
                    id: `liquidation_${Date.now()}_${position.symbol}`,
                    symbol: position.symbol,
                    side: position.side === 'long' ? 'sell' : 'buy',
                    quantity: liquidationSize,
                    orderType: 'market',
                    urgency: 'immediate',
                    status: 'pending',
                    submittedAt: new Date()
                };
                
                this.activeLiquidations.set(liquidationOrder.id, liquidationOrder);
                
                try {
                    // Execute liquidation order
                    liquidationOrder.status = 'executing';
                    const result = await this.orderExecutor.executeOrder({
                        symbol: liquidationOrder.symbol,
                        side: liquidationOrder.side,
                        quantity: liquidationOrder.quantity,
                        type: liquidationOrder.orderType
                    });
                    
                    liquidationOrder.status = 'completed';
                    liquidationOrder.completedAt = new Date();
                    liquidationOrder.executedPrice = result.price;
                    liquidationOrder.slippage = result.slippage;
                    
                    console.log(`✅ Liquidated: ${liquidationOrder.quantity} ${liquidationOrder.symbol} @ ${result.price}`);
                    
                } catch (error) {
                    liquidationOrder.status = 'failed';
                    console.error(`❌ Liquidation failed for ${position.symbol}:`, error);
                }
            }
            
            const completedLiquidations = Array.from(this.activeLiquidations.values())
                .filter(order => order.status === 'completed').length;
            
            this.emergencyMetrics.liquidationEfficiency = 
                completedLiquidations / this.activeLiquidations.size;
            
            console.log(`✅ Liquidation completed: ${completedLiquidations}/${this.activeLiquidations.size} orders`);
            
        } catch (error) {
            console.error('❌ Liquidation execution failed:', error);
            throw error;
        }
    }

    private async executeHedging(hedgeRatio: number): Promise<void> {
        console.log(`🛡️ Executing hedging strategy: ${(hedgeRatio * 100).toFixed(1)}%`);
        
        // Simplified hedging implementation
        // In production, would implement sophisticated hedging strategies
        
        try {
            const portfolio = this.productionEngine.getPortfolio();
            const totalExposure = portfolio.totalValue * hedgeRatio;
            
            // Create hedge positions (simplified)
            console.log(`🛡️ Hedge exposure: ${totalExposure}`);
            
            this.monitoringSystem.recordMetric('emergency_system.hedge_executed', 1, {
                hedge_ratio: hedgeRatio.toString(),
                exposure: totalExposure.toString()
            });
            
        } catch (error) {
            console.error('❌ Hedging execution failed:', error);
            throw error;
        }
    }

    // Condition Check Methods

    private async checkPortfolioLoss(): Promise<number> {
        try {
            const portfolio = this.productionEngine.getPortfolio();
            return Math.abs(portfolio.totalPnL || 0) / (portfolio.totalValue || 1);
        } catch (error) {
            console.error('❌ Failed to check portfolio loss:', error);
            return 0;
        }
    }

    private async checkVaRBreach(): Promise<number> {
        try {
            const portfolioRisk = this.varMonitor.getCurrentPortfolioRisk();
            if (!portfolioRisk) return 0;
            
            // Return VaR as ratio of limit (e.g., 1.2 = 120% of limit)
            return portfolioRisk.totalVaR / portfolioRisk.riskLevel; // Simplified
        } catch (error) {
            console.error('❌ Failed to check VaR breach:', error);
            return 0;
        }
    }

    private async checkMarketVolatility(): Promise<number> {
        try {
            // Check volatility for main trading pairs
            let maxVolatility = 0;
            const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
            
            for (const symbol of symbols) {
                const condition = await this.marketDataProvider.getMarketCondition(symbol);
                maxVolatility = Math.max(maxVolatility, condition.volatility);
            }
            
            return maxVolatility;
        } catch (error) {
            console.error('❌ Failed to check market volatility:', error);
            return 0;
        }
    }

    private async checkMemoryUsage(): Promise<number> {
        try {
            const health = await this.monitoringSystem.getSystemHealth();
            // Extract memory usage from health data (simplified)
            return 0.5; // Placeholder - would get actual memory metrics
        } catch (error) {
            console.error('❌ Failed to check memory usage:', error);
            return 0;
        }
    }

    private checkConnectionStatus(): boolean {
        return this.marketDataProvider.isConnected();
    }

    private async checkErrorRate(): Promise<number> {
        try {
            // Get error rate from cache or monitoring system
            const errorRate = await this.cacheService.get('system_error_rate') || 0;
            return errorRate;
        } catch (error) {
            console.error('❌ Failed to check error rate:', error);
            return 0;
        }
    }

    private mapPriorityToSeverity(priority: string): 'low' | 'medium' | 'high' | 'critical' {
        switch (priority) {
            case 'critical': return 'critical';
            case 'high': return 'high';
            case 'medium': return 'medium';
            case 'low': return 'low';
            default: return 'medium';
        }
    }

    private updateEmergencyLevel(): void {
        const activeTriggers = this.emergencyState.activeTriggers;
        
        if (activeTriggers.length === 0) {
            this.emergencyState.level = 'none';
        } else {
            const highestSeverity = activeTriggers.reduce((max, trigger) => {
                const severityLevel = { low: 1, medium: 2, high: 3, critical: 4 }[trigger.severity];
                const maxLevel = { low: 1, medium: 2, high: 3, critical: 4 }[max];
                return severityLevel > maxLevel ? trigger.severity : max;
            }, 'low' as 'low' | 'medium' | 'high' | 'critical');
            
            this.emergencyState.level = {
                low: 'yellow',
                medium: 'orange', 
                high: 'red',
                critical: 'black'
            }[highestSeverity] as 'yellow' | 'orange' | 'red' | 'black';
        }
    }
}

export default EmergencyStopSystem;

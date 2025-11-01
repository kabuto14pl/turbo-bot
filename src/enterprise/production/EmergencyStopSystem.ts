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
 * PHASE C.4 - Emergency Stop System
 * Multi-Level Circuit Breaker & Risk Management
 * 
 * Implements comprehensive emergency stop mechanisms with:
 * - Multi-level circuit breakers (Level 1-3)
 * - Automatic position liquidation
 * - Risk threshold monitoring
 * - Emergency alert broadcasting
 * - Recovery procedures
 * - Regulatory compliance
 * 
 * Features:
 * - Real-time risk monitoring
 * - Cascading stop mechanisms
 * - Position-level stops
 * - Portfolio-level stops
 * - System-wide emergency halt
 * - Automatic recovery validation
 */

import { EventEmitter } from 'events';
import { TradingPosition, Portfolio, RiskLimits } from './ProductionTradingEngine';
import { RiskAlert, VaRResult } from './RealTimeVaRMonitor';

interface CircuitBreakerLevel {
    level: 1 | 2 | 3;
    name: string;
    description: string;
    triggers: CircuitBreakerTrigger[];
    actions: EmergencyAction[];
    resetConditions: ResetCondition[];
    cooldownPeriod: number; // milliseconds
    isActive: boolean;
    lastTriggered?: Date;
    triggerCount: number;
}

interface CircuitBreakerTrigger {
    type: 'LOSS_PCT' | 'VAR_BREACH' | 'POSITION_SIZE' | 'DRAWDOWN' | 'VOLATILITY' | 'CORRELATION' | 'LIQUIDITY' | 'MANUAL';
    threshold: number;
    timeWindow?: number; // milliseconds
    description: string;
    isEnabled: boolean;
}

interface EmergencyAction {
    type: 'HALT_TRADING' | 'LIQUIDATE_POSITIONS' | 'CANCEL_ORDERS' | 'REDUCE_LEVERAGE' | 'ALERT_COMPLIANCE' | 'NOTIFY_RISK';
    priority: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    isAutomated: boolean;
    requiresConfirmation: boolean;
}

interface ResetCondition {
    type: 'TIME_ELAPSED' | 'MANUAL_RESET' | 'RISK_NORMALIZED' | 'MARKET_STABLE' | 'COMPLIANCE_APPROVAL';
    criteria: string;
    isRequired: boolean;
}

interface EmergencyEvent {
    id: string;
    timestamp: Date;
    level: 1 | 2 | 3;
    triggerType: string;
    triggerValue: number;
    threshold: number;
    description: string;
    actionsTriggered: string[];
    portfolioState: Portfolio;
    riskMetrics: any;
    isResolved: boolean;
    resolutionTime?: Date;
    resolutionMethod?: string;
}

interface LiquidationOrder {
    id: string;
    positionId: string;
    symbol: string;
    quantity: number;
    urgency: 'IMMEDIATE' | 'FAST' | 'NORMAL';
    status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
    timestamp: Date;
    executionTime?: Date;
    liquidationPrice?: number;
}

interface SystemState {
    isEmergencyStopped: boolean;
    activeLevel: number;
    stopReason: string;
    lastStopTime: Date;
    canResume: boolean;
    emergencyEventsCount: number;
    totalLiquidationValue: number;
    recoveryProgress: number; // 0-100%
}

interface RecoveryValidation {
    riskNormalized: boolean;
    marketStable: boolean;
    systemHealthy: boolean;
    complianceCleared: boolean;
    manualApproval: boolean;
    cooldownElapsed: boolean;
    overallValid: boolean;
    issues: string[];
}

/**
 * Emergency Stop System
 * 
 * Comprehensive risk management system with multi-level circuit breakers
 * and automated emergency response procedures
 */
export class EmergencyStopSystem extends EventEmitter {
    private portfolio: Portfolio;
    private riskLimits: RiskLimits;
    private circuitBreakers: Map<number, CircuitBreakerLevel> = new Map();
    private emergencyEvents: EmergencyEvent[] = [];
    private liquidationQueue: LiquidationOrder[] = [];
    private systemState!: SystemState; // Initialized in initializeSystemState() called from constructor
    
    private monitoringInterval?: NodeJS.Timeout;
    private isMonitoring: boolean = false;
    private lastRiskAssessment?: VaRResult;
    
    // Configuration
    private readonly config = {
        maxEmergencyEvents: 1000,
        maxLiquidationRetries: 3,
        riskMonitoringInterval: 1000, // 1 second
        recoveryValidationInterval: 5000, // 5 seconds
        complianceNotificationTimeout: 30000, // 30 seconds
        emergencyLiquidationSlippage: 0.05 // 5% max slippage for emergency liquidation
    };

    constructor(portfolio: Portfolio, riskLimits: RiskLimits) {
        super();
        this.portfolio = portfolio;
        this.riskLimits = riskLimits;
        
        this.initializeSystemState();
        this.initializeCircuitBreakers();
        this.setupEventHandlers();
    }

    /**
     * Start emergency stop monitoring
     */
    public startMonitoring(): void {
        if (this.isMonitoring) {
            console.log('⚠️ Emergency stop monitoring already active');
            return;
        }

        console.log('🛡️ Starting Emergency Stop monitoring...');

        this.monitoringInterval = setInterval(() => {
            this.performRiskMonitoring();
        }, this.config.riskMonitoringInterval);

        this.isMonitoring = true;
        this.emit('monitoringStarted');
        console.log('✅ Emergency Stop monitoring active');
    }

    /**
     * Stop monitoring
     */
    public stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
        }

        this.isMonitoring = false;
        this.emit('monitoringStopped');
        console.log('🛑 Emergency Stop monitoring stopped');
    }

    /**
     * Trigger emergency stop manually
     */
    public async triggerEmergencyStop(level: 1 | 2 | 3, reason: string, manualOperator?: string): Promise<EmergencyEvent> {
        console.log(`🚨 MANUAL EMERGENCY STOP TRIGGERED - Level ${level}: ${reason}`);

        const event = await this.executeEmergencyStop(level, 'MANUAL', 0, 0, reason, {
            operator: manualOperator,
            manual: true
        });

        console.log(`🛑 Manual emergency stop Level ${level} executed by ${manualOperator || 'system'}`);
        return event;
    }

    /**
     * Test circuit breaker without actual execution
     */
    public testCircuitBreaker(level: 1 | 2 | 3, triggerType: string): boolean {
        const breaker = this.circuitBreakers.get(level);
        if (!breaker) {
            console.log(`❌ Circuit breaker Level ${level} not found`);
            return false;
        }

        const trigger = breaker.triggers.find(t => t.type === triggerType);
        if (!trigger) {
            console.log(`❌ Trigger type '${triggerType}' not found in Level ${level}`);
            return false;
        }

        console.log(`✅ Circuit breaker test passed - Level ${level}, Trigger: ${triggerType}`);
        console.log(`   Actions that would execute: ${breaker.actions.map(a => a.type).join(', ')}`);
        
        return true;
    }

    /**
     * Attempt to reset emergency stop
     */
    public async attemptRecovery(manualOverride: boolean = false): Promise<RecoveryValidation> {
        console.log('🔄 Attempting emergency stop recovery...');

        if (!this.systemState.isEmergencyStopped) {
            throw new Error('System is not in emergency stop state');
        }

        const validation = await this.validateRecoveryConditions(manualOverride);
        
        if (validation.overallValid) {
            await this.executeRecovery();
            console.log('✅ Emergency stop recovery successful');
            this.emit('recoveryCompleted', validation);
        } else {
            console.log('❌ Recovery validation failed:', validation.issues);
            this.emit('recoveryFailed', validation);
        }

        return validation;
    }

    /**
     * Get current system state
     */
    public getSystemState(): SystemState {
        return { ...this.systemState };
    }

    /**
     * Get emergency events history
     */
    public getEmergencyEvents(limit: number = 50): EmergencyEvent[] {
        return this.emergencyEvents.slice(-limit);
    }

    /**
     * Get active liquidation orders
     */
    public getLiquidationQueue(): LiquidationOrder[] {
        return this.liquidationQueue.filter(order => order.status !== 'COMPLETED' && order.status !== 'FAILED');
    }

    /**
     * Get circuit breaker status
     */
    public getCircuitBreakerStatus(): CircuitBreakerLevel[] {
        return Array.from(this.circuitBreakers.values());
    }

    /**
     * Update portfolio for monitoring
     */
    public updatePortfolio(portfolio: Portfolio): void {
        this.portfolio = portfolio;
    }

    /**
     * Update risk assessment
     */
    public updateRiskAssessment(varResult: VaRResult): void {
        this.lastRiskAssessment = varResult;
    }

    /**
     * Update risk limits
     */
    public updateRiskLimits(riskLimits: RiskLimits): void {
        this.riskLimits = riskLimits;
        this.updateCircuitBreakerThresholds();
    }

    /**
     * Force liquidate specific position
     */
    public async forceLiquidatePosition(positionId: string, urgency: 'IMMEDIATE' | 'FAST' | 'NORMAL' = 'FAST'): Promise<LiquidationOrder> {
        const position = this.portfolio.positions.find(p => p.id === positionId);
        if (!position) {
            throw new Error(`Position ${positionId} not found`);
        }

        const liquidationOrder: LiquidationOrder = {
            id: `liq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            positionId,
            symbol: position.symbol,
            quantity: Math.abs(position.size),
            urgency,
            status: 'PENDING',
            timestamp: new Date()
        };

        this.liquidationQueue.push(liquidationOrder);
        await this.executeLiquidation(liquidationOrder);

        console.log(`💥 Force liquidation initiated: ${position.symbol} (${liquidationOrder.quantity})`);
        this.emit('forceLiquidationStarted', liquidationOrder);

        return liquidationOrder;
    }

    // Private Methods

    private initializeSystemState(): void {
        this.systemState = {
            isEmergencyStopped: false,
            activeLevel: 0,
            stopReason: '',
            lastStopTime: new Date(),
            canResume: true,
            emergencyEventsCount: 0,
            totalLiquidationValue: 0,
            recoveryProgress: 100
        };
    }

    private initializeCircuitBreakers(): void {
        // Level 1: Warning Level - Monitoring and Alerts
        this.circuitBreakers.set(1, {
            level: 1,
            name: 'Risk Warning',
            description: 'Early warning system for elevated risk',
            triggers: [
                {
                    type: 'LOSS_PCT',
                    threshold: 2.0, // 2% portfolio loss
                    timeWindow: 300000, // 5 minutes
                    description: '2% portfolio loss in 5 minutes',
                    isEnabled: true
                },
                {
                    type: 'VAR_BREACH',
                    threshold: 1.5, // 1.5x VaR limit
                    description: 'VaR exceeds 1.5x limit',
                    isEnabled: true
                },
                {
                    type: 'VOLATILITY',
                    threshold: 0.35, // 35% volatility
                    description: 'Portfolio volatility exceeds 35%',
                    isEnabled: true
                }
            ],
            actions: [
                {
                    type: 'ALERT_COMPLIANCE',
                    priority: 'HIGH',
                    description: 'Alert compliance team',
                    isAutomated: true,
                    requiresConfirmation: false
                },
                {
                    type: 'NOTIFY_RISK',
                    priority: 'HIGH',
                    description: 'Notify risk management',
                    isAutomated: true,
                    requiresConfirmation: false
                }
            ],
            resetConditions: [
                {
                    type: 'RISK_NORMALIZED',
                    criteria: 'Risk metrics return to normal levels',
                    isRequired: true
                },
                {
                    type: 'TIME_ELAPSED',
                    criteria: '15 minutes elapsed',
                    isRequired: false
                }
            ],
            cooldownPeriod: 900000, // 15 minutes
            isActive: false,
            triggerCount: 0
        });

        // Level 2: Defensive Action - Position Reduction
        this.circuitBreakers.set(2, {
            level: 2,
            name: 'Risk Mitigation',
            description: 'Defensive actions to reduce risk exposure',
            triggers: [
                {
                    type: 'LOSS_PCT',
                    threshold: 5.0, // 5% portfolio loss
                    timeWindow: 600000, // 10 minutes
                    description: '5% portfolio loss in 10 minutes',
                    isEnabled: true
                },
                {
                    type: 'VAR_BREACH',
                    threshold: 2.0, // 2x VaR limit
                    description: 'VaR exceeds 2x limit',
                    isEnabled: true
                },
                {
                    type: 'DRAWDOWN',
                    threshold: this.riskLimits.maxDrawdown * 0.8, // 80% of max drawdown
                    description: 'Approaching maximum drawdown',
                    isEnabled: true
                }
            ],
            actions: [
                {
                    type: 'CANCEL_ORDERS',
                    priority: 'IMMEDIATE',
                    description: 'Cancel all pending orders',
                    isAutomated: true,
                    requiresConfirmation: false
                },
                {
                    type: 'REDUCE_LEVERAGE',
                    priority: 'HIGH',
                    description: 'Reduce portfolio leverage',
                    isAutomated: true,
                    requiresConfirmation: false
                },
                {
                    type: 'ALERT_COMPLIANCE',
                    priority: 'IMMEDIATE',
                    description: 'Immediate compliance notification',
                    isAutomated: true,
                    requiresConfirmation: false
                }
            ],
            resetConditions: [
                {
                    type: 'RISK_NORMALIZED',
                    criteria: 'Risk metrics normalized for 30 minutes',
                    isRequired: true
                },
                {
                    type: 'MANUAL_RESET',
                    criteria: 'Manual approval from risk manager',
                    isRequired: true
                }
            ],
            cooldownPeriod: 1800000, // 30 minutes
            isActive: false,
            triggerCount: 0
        });

        // Level 3: Emergency Stop - Full Liquidation
        this.circuitBreakers.set(3, {
            level: 3,
            name: 'Emergency Stop',
            description: 'Full system shutdown and position liquidation',
            triggers: [
                {
                    type: 'LOSS_PCT',
                    threshold: 10.0, // 10% portfolio loss
                    timeWindow: 1800000, // 30 minutes
                    description: '10% portfolio loss in 30 minutes',
                    isEnabled: true
                },
                {
                    type: 'VAR_BREACH',
                    threshold: 3.0, // 3x VaR limit
                    description: 'VaR exceeds 3x limit',
                    isEnabled: true
                },
                {
                    type: 'DRAWDOWN',
                    threshold: this.riskLimits.emergencyStopLoss,
                    description: 'Emergency stop loss reached',
                    isEnabled: true
                },
                {
                    type: 'MANUAL',
                    threshold: 0,
                    description: 'Manual emergency stop',
                    isEnabled: true
                }
            ],
            actions: [
                {
                    type: 'HALT_TRADING',
                    priority: 'IMMEDIATE',
                    description: 'Halt all trading operations',
                    isAutomated: true,
                    requiresConfirmation: false
                },
                {
                    type: 'LIQUIDATE_POSITIONS',
                    priority: 'IMMEDIATE',
                    description: 'Liquidate all positions',
                    isAutomated: true,
                    requiresConfirmation: false
                },
                {
                    type: 'CANCEL_ORDERS',
                    priority: 'IMMEDIATE',
                    description: 'Cancel all orders',
                    isAutomated: true,
                    requiresConfirmation: false
                },
                {
                    type: 'ALERT_COMPLIANCE',
                    priority: 'IMMEDIATE',
                    description: 'Emergency compliance notification',
                    isAutomated: true,
                    requiresConfirmation: false
                }
            ],
            resetConditions: [
                {
                    type: 'COMPLIANCE_APPROVAL',
                    criteria: 'Compliance team approval required',
                    isRequired: true
                },
                {
                    type: 'MANUAL_RESET',
                    criteria: 'Senior management approval',
                    isRequired: true
                },
                {
                    type: 'MARKET_STABLE',
                    criteria: 'Market conditions normalized',
                    isRequired: true
                }
            ],
            cooldownPeriod: 3600000, // 1 hour
            isActive: false,
            triggerCount: 0
        });
    }

    private setupEventHandlers(): void {
        this.on('emergencyStop', this.handleEmergencyStop.bind(this));
        this.on('liquidationCompleted', this.handleLiquidationCompleted.bind(this));
        this.on('riskAlert', this.handleRiskAlert.bind(this));
    }

    private performRiskMonitoring(): void {
        if (this.systemState.isEmergencyStopped) {
            return; // Skip monitoring during emergency stop
        }

        try {
            // Check each circuit breaker level
            for (const [level, breaker] of Array.from(this.circuitBreakers)) {
                if (breaker.isActive) {
                    continue; // Skip if already active
                }

                for (const trigger of breaker.triggers) {
                    if (!trigger.isEnabled) continue;

                    const shouldTrigger = this.evaluateTrigger(trigger);
                    if (shouldTrigger.triggered) {
                        this.executeEmergencyStop(level as 1 | 2 | 3, trigger.type, shouldTrigger.value, trigger.threshold, trigger.description);
                        return; // Stop checking once triggered
                    }
                }
            }
        } catch (error) {
            console.error('Risk monitoring error:', error);
            this.emit('monitoringError', error);
        }
    }

    private evaluateTrigger(trigger: CircuitBreakerTrigger): { triggered: boolean; value: number } {
        switch (trigger.type) {
            case 'LOSS_PCT':
                return this.evaluateLossPercentage(trigger);
            case 'VAR_BREACH':
                return this.evaluateVaRBreach(trigger);
            case 'POSITION_SIZE':
                return this.evaluatePositionSize(trigger);
            case 'DRAWDOWN':
                return this.evaluateDrawdown(trigger);
            case 'VOLATILITY':
                return this.evaluateVolatility(trigger);
            case 'CORRELATION':
                return this.evaluateCorrelation(trigger);
            case 'LIQUIDITY':
                return this.evaluateLiquidity(trigger);
            default:
                return { triggered: false, value: 0 };
        }
    }

    private evaluateLossPercentage(trigger: CircuitBreakerTrigger): { triggered: boolean; value: number } {
        const currentPnLPct = (this.portfolio.totalPnL / 100000) * 100; // Assuming 100k starting capital
        const lossPct = Math.abs(Math.min(0, currentPnLPct));
        
        return { triggered: lossPct >= trigger.threshold, value: lossPct };
    }

    private evaluateVaRBreach(trigger: CircuitBreakerTrigger): { triggered: boolean; value: number } {
        if (!this.lastRiskAssessment) {
            return { triggered: false, value: 0 };
        }

        const varLimit = this.riskLimits.maxVaR;
        const currentVaR = this.lastRiskAssessment.value;
        const multiplier = currentVaR / varLimit;

        return { triggered: multiplier >= trigger.threshold, value: multiplier };
    }

    private evaluatePositionSize(trigger: CircuitBreakerTrigger): { triggered: boolean; value: number } {
        const maxPositionValue = Math.max(...this.portfolio.positions.map(p => 
            Math.abs(p.size) * p.currentPrice
        ));
        const maxPositionPct = (maxPositionValue / this.portfolio.totalValue) * 100;

        return { triggered: maxPositionPct >= trigger.threshold, value: maxPositionPct };
    }

    private evaluateDrawdown(trigger: CircuitBreakerTrigger): { triggered: boolean; value: number } {
        const currentDrawdown = Math.min(0, this.portfolio.totalPnL);
        
        return { triggered: currentDrawdown <= trigger.threshold, value: currentDrawdown };
    }

    private evaluateVolatility(trigger: CircuitBreakerTrigger): { triggered: boolean; value: number } {
        const portfolioVolatility = this.lastRiskAssessment?.modelStats.volatility || 0;
        
        return { triggered: portfolioVolatility >= trigger.threshold, value: portfolioVolatility };
    }

    private evaluateCorrelation(trigger: CircuitBreakerTrigger): { triggered: boolean; value: number } {
        // Calculate average correlation between positions
        const correlations = this.lastRiskAssessment?.modelStats.correlation || [];
        let avgCorrelation = 0;
        let count = 0;

        for (let i = 0; i < correlations.length; i++) {
            for (let j = i + 1; j < correlations[i].length; j++) {
                avgCorrelation += Math.abs(correlations[i][j]);
                count++;
            }
        }

        avgCorrelation = count > 0 ? avgCorrelation / count : 0;
        
        return { triggered: avgCorrelation >= trigger.threshold, value: avgCorrelation };
    }

    private evaluateLiquidity(trigger: CircuitBreakerTrigger): { triggered: boolean; value: number } {
        // Simplified liquidity check - would need real market data
        const totalPositionValue = this.portfolio.positions.reduce((sum, p) => 
            sum + Math.abs(p.size) * p.currentPrice, 0
        );
        const liquidityRatio = this.portfolio.cash / totalPositionValue;

        return { triggered: liquidityRatio <= trigger.threshold, value: liquidityRatio };
    }

    private async executeEmergencyStop(level: 1 | 2 | 3, triggerType: string, triggerValue: number, 
                                     threshold: number, description: string, metadata?: any): Promise<EmergencyEvent> {
        const breaker = this.circuitBreakers.get(level);
        if (!breaker) {
            throw new Error(`Circuit breaker Level ${level} not found`);
        }

        console.log(`🚨 EMERGENCY STOP LEVEL ${level} TRIGGERED: ${description}`);
        console.log(`   Trigger: ${triggerType}, Value: ${triggerValue}, Threshold: ${threshold}`);

        // Create emergency event
        const event: EmergencyEvent = {
            id: `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            level,
            triggerType,
            triggerValue,
            threshold,
            description,
            actionsTriggered: breaker.actions.map(a => a.type),
            portfolioState: JSON.parse(JSON.stringify(this.portfolio)),
            riskMetrics: this.lastRiskAssessment || {},
            isResolved: false,
            ...metadata
        };

        // Update system state
        this.systemState.isEmergencyStopped = level >= 2; // Level 2+ stops trading
        this.systemState.activeLevel = level;
        this.systemState.stopReason = description;
        this.systemState.lastStopTime = new Date();
        this.systemState.emergencyEventsCount++;

        // Activate circuit breaker
        breaker.isActive = true;
        breaker.lastTriggered = new Date();
        breaker.triggerCount++;

        // Execute actions
        for (const action of breaker.actions) {
            await this.executeEmergencyAction(action, event);
        }

        // Store event
        this.emergencyEvents.push(event);
        if (this.emergencyEvents.length > this.config.maxEmergencyEvents) {
            this.emergencyEvents = this.emergencyEvents.slice(-this.config.maxEmergencyEvents);
        }

        this.emit('emergencyStop', event);
        console.log(`🛑 Emergency stop Level ${level} executed successfully`);

        return event;
    }

    private async executeEmergencyAction(action: EmergencyAction, event: EmergencyEvent): Promise<void> {
        console.log(`⚡ Executing emergency action: ${action.type} (${action.priority})`);

        try {
            switch (action.type) {
                case 'HALT_TRADING':
                    await this.haltTrading();
                    break;
                case 'LIQUIDATE_POSITIONS':
                    await this.liquidateAllPositions(event.level === 3 ? 'IMMEDIATE' : 'FAST');
                    break;
                case 'CANCEL_ORDERS':
                    await this.cancelAllOrders();
                    break;
                case 'REDUCE_LEVERAGE':
                    await this.reduceLeverage();
                    break;
                case 'ALERT_COMPLIANCE':
                    await this.alertCompliance(event);
                    break;
                case 'NOTIFY_RISK':
                    await this.notifyRiskManagement(event);
                    break;
            }

            console.log(`✅ Emergency action completed: ${action.type}`);
        } catch (error) {
            console.error(`❌ Emergency action failed: ${action.type}`, error);
            this.emit('actionFailed', { action, error, event });
        }
    }

    private async haltTrading(): Promise<void> {
        // Signal to halt all trading operations
        this.emit('tradingHalted', { timestamp: new Date() });
    }

    private async liquidateAllPositions(urgency: 'IMMEDIATE' | 'FAST' | 'NORMAL'): Promise<void> {
        console.log(`💥 Liquidating all positions (${urgency})...`);

        for (const position of this.portfolio.positions) {
            if (Math.abs(position.size) > 0) {
                const liquidationOrder: LiquidationOrder = {
                    id: `liq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    positionId: position.id,
                    symbol: position.symbol,
                    quantity: Math.abs(position.size),
                    urgency,
                    status: 'PENDING',
                    timestamp: new Date()
                };

                this.liquidationQueue.push(liquidationOrder);
                // Execute liquidation immediately for emergency stops
                if (urgency === 'IMMEDIATE') {
                    setImmediate(() => this.executeLiquidation(liquidationOrder));
                }
            }
        }

        console.log(`📋 ${this.liquidationQueue.length} liquidation orders created`);
    }

    private async cancelAllOrders(): Promise<void> {
        // Signal to cancel all pending orders
        this.emit('cancelAllOrders', { timestamp: new Date() });
        console.log('❌ All pending orders cancelled');
    }

    private async reduceLeverage(): Promise<void> {
        // Calculate positions to close to reduce leverage
        const targetLeverage = Math.min(this.riskLimits.maxLeverage * 0.5, 2.0); // Reduce to 50% of max or 2x
        const currentLeverage = this.calculateCurrentLeverage();

        if (currentLeverage > targetLeverage) {
            const reductionNeeded = (currentLeverage - targetLeverage) / currentLeverage;
            console.log(`📉 Reducing leverage from ${currentLeverage.toFixed(2)}x to ${targetLeverage.toFixed(2)}x`);

            // Close positions starting with largest
            const sortedPositions = [...this.portfolio.positions]
                .sort((a, b) => (Math.abs(b.size) * b.currentPrice) - (Math.abs(a.size) * a.currentPrice));

            let totalReduced = 0;
            const targetReduction = this.portfolio.totalValue * reductionNeeded;

            for (const position of sortedPositions) {
                if (totalReduced >= targetReduction) break;

                const positionValue = Math.abs(position.size) * position.currentPrice;
                const reductionSize = Math.min(positionValue, targetReduction - totalReduced);
                const reductionQuantity = reductionSize / position.currentPrice;

                await this.forceLiquidatePosition(position.id, 'FAST');
                totalReduced += reductionSize;
            }
        }
    }

    private async alertCompliance(event: EmergencyEvent): Promise<void> {
        const alert = {
            level: 'CRITICAL',
            type: 'EMERGENCY_STOP',
            message: `Emergency Stop Level ${event.level} triggered: ${event.description}`,
            event,
            timestamp: new Date(),
            requiresResponse: event.level >= 3
        };

        this.emit('complianceAlert', alert);
        console.log(`📢 Compliance alert sent for Level ${event.level} emergency`);
    }

    private async notifyRiskManagement(event: EmergencyEvent): Promise<void> {
        const notification = {
            urgency: event.level >= 3 ? 'CRITICAL' : 'HIGH',
            event,
            portfolioSnapshot: this.portfolio,
            riskMetrics: this.lastRiskAssessment,
            timestamp: new Date()
        };

        this.emit('riskNotification', notification);
        console.log(`📨 Risk management notification sent for Level ${event.level}`);
    }

    private async executeLiquidation(liquidationOrder: LiquidationOrder): Promise<void> {
        liquidationOrder.status = 'EXECUTING';
        liquidationOrder.executionTime = new Date();

        try {
            // Simulate liquidation execution
            // In production, this would integrate with exchange APIs
            const slippage = liquidationOrder.urgency === 'IMMEDIATE' 
                ? this.config.emergencyLiquidationSlippage 
                : 0.001;

            const position = this.portfolio.positions.find(p => p.id === liquidationOrder.positionId);
            if (!position) {
                throw new Error(`Position ${liquidationOrder.positionId} not found`);
            }

            // Calculate liquidation price with slippage
            liquidationOrder.liquidationPrice = position.currentPrice * (1 - slippage);
            
            // Update position
            position.size = 0;
            position.unrealizedPnL = 0;

            // Update system state
            this.systemState.totalLiquidationValue += liquidationOrder.quantity * liquidationOrder.liquidationPrice;

            liquidationOrder.status = 'COMPLETED';
            
            console.log(`✅ Liquidation completed: ${liquidationOrder.symbol} @ $${liquidationOrder.liquidationPrice?.toFixed(2)}`);
            this.emit('liquidationCompleted', liquidationOrder);

        } catch (error) {
            liquidationOrder.status = 'FAILED';
            console.error(`❌ Liquidation failed: ${liquidationOrder.symbol}`, error);
            this.emit('liquidationFailed', { liquidationOrder, error });
        }
    }

    private calculateCurrentLeverage(): number {
        const totalPositionValue = this.portfolio.positions.reduce((sum, p) => 
            sum + Math.abs(p.size) * p.currentPrice, 0
        );
        return totalPositionValue / this.portfolio.totalValue;
    }

    private async validateRecoveryConditions(manualOverride: boolean): Promise<RecoveryValidation> {
        const activeBreaker = this.circuitBreakers.get(this.systemState.activeLevel);
        if (!activeBreaker) {
            throw new Error('No active circuit breaker found');
        }

        const validation: RecoveryValidation = {
            riskNormalized: false,
            marketStable: false,
            systemHealthy: false,
            complianceCleared: false,
            manualApproval: false,
            cooldownElapsed: false,
            overallValid: false,
            issues: []
        };

        // Check each reset condition
        for (const condition of activeBreaker.resetConditions) {
            switch (condition.type) {
                case 'RISK_NORMALIZED':
                    validation.riskNormalized = this.checkRiskNormalized();
                    if (!validation.riskNormalized && condition.isRequired) {
                        validation.issues.push('Risk metrics not normalized');
                    }
                    break;

                case 'MARKET_STABLE':
                    validation.marketStable = this.checkMarketStability();
                    if (!validation.marketStable && condition.isRequired) {
                        validation.issues.push('Market conditions unstable');
                    }
                    break;

                case 'COMPLIANCE_APPROVAL':
                    validation.complianceCleared = manualOverride; // Simplified
                    if (!validation.complianceCleared && condition.isRequired) {
                        validation.issues.push('Compliance approval required');
                    }
                    break;

                case 'MANUAL_RESET':
                    validation.manualApproval = manualOverride;
                    if (!validation.manualApproval && condition.isRequired) {
                        validation.issues.push('Manual approval required');
                    }
                    break;

                case 'TIME_ELAPSED':
                    const elapsed = Date.now() - activeBreaker.lastTriggered!.getTime();
                    validation.cooldownElapsed = elapsed >= activeBreaker.cooldownPeriod;
                    if (!validation.cooldownElapsed && condition.isRequired) {
                        validation.issues.push(`Cooldown period not elapsed (${Math.ceil((activeBreaker.cooldownPeriod - elapsed) / 60000)} min remaining)`);
                    }
                    break;
            }
        }

        // System health check
        validation.systemHealthy = this.checkSystemHealth();
        if (!validation.systemHealthy) {
            validation.issues.push('System health check failed');
        }

        // Overall validation
        validation.overallValid = validation.issues.length === 0;

        return validation;
    }

    private checkRiskNormalized(): boolean {
        if (!this.lastRiskAssessment) return false;

        const varOk = this.lastRiskAssessment.value <= this.riskLimits.maxVaR;
        const drawdownOk = this.portfolio.totalPnL >= this.riskLimits.maxDailyLoss;
        const volatilityOk = this.lastRiskAssessment.modelStats.volatility <= 0.25;

        return varOk && drawdownOk && volatilityOk;
    }

    private checkMarketStability(): boolean {
        // Simplified market stability check
        // In production, would check market volatility indices, spreads, etc.
        return this.lastRiskAssessment?.modelStats?.volatility ? this.lastRiskAssessment.modelStats.volatility < 0.20 : true;
    }

    private checkSystemHealth(): boolean {
        // Simplified system health check
        return !this.systemState.isEmergencyStopped || this.systemState.recoveryProgress >= 95;
    }

    private async executeRecovery(): Promise<void> {
        console.log('🔄 Executing emergency stop recovery...');

        // Reset system state
        this.systemState.isEmergencyStopped = false;
        this.systemState.activeLevel = 0;
        this.systemState.stopReason = '';
        this.systemState.canResume = true;
        this.systemState.recoveryProgress = 100;

        // Deactivate circuit breakers
        for (const breaker of Array.from(this.circuitBreakers.values())) {
            breaker.isActive = false;
        }

        // Clear liquidation queue
        this.liquidationQueue = this.liquidationQueue.filter(order => 
            order.status === 'EXECUTING' || order.status === 'PENDING'
        );

        // Mark latest emergency event as resolved
        const latestEvent = this.emergencyEvents[this.emergencyEvents.length - 1];
        if (latestEvent && !latestEvent.isResolved) {
            latestEvent.isResolved = true;
            latestEvent.resolutionTime = new Date();
            latestEvent.resolutionMethod = 'RECOVERY_VALIDATION';
        }

        this.emit('emergencyRecovered', this.systemState);
        console.log('✅ Emergency stop recovery completed');
    }

    private updateCircuitBreakerThresholds(): void {
        // Update Level 2 drawdown trigger
        const level2 = this.circuitBreakers.get(2);
        if (level2) {
            const drawdownTrigger = level2.triggers.find(t => t.type === 'DRAWDOWN');
            if (drawdownTrigger) {
                drawdownTrigger.threshold = this.riskLimits.maxDrawdown * 0.8;
            }
        }

        // Update Level 3 emergency stop trigger
        const level3 = this.circuitBreakers.get(3);
        if (level3) {
            const emergencyTrigger = level3.triggers.find(t => t.type === 'DRAWDOWN');
            if (emergencyTrigger) {
                emergencyTrigger.threshold = this.riskLimits.emergencyStopLoss;
            }
        }
    }

    // Event Handlers

    private handleEmergencyStop(event: EmergencyEvent): void {
        console.log(`🔥 Emergency stop event handled: Level ${event.level}`);
    }

    private handleLiquidationCompleted(order: LiquidationOrder): void {
        console.log(`💰 Liquidation completed: ${order.symbol} - $${order.liquidationPrice?.toFixed(2)}`);
    }

    private handleRiskAlert(alert: RiskAlert): void {
        // Check if alert should trigger emergency action
        if (alert.level === 'CRITICAL') {
            console.log(`⚠️ Critical risk alert received: ${alert.message}`);
        }
    }
}

export {
    CircuitBreakerLevel,
    CircuitBreakerTrigger,
    EmergencyAction,
    ResetCondition,
    EmergencyEvent,
    LiquidationOrder,
    SystemState,
    RecoveryValidation
};

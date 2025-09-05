/**
 * 🛡️ AUTO-HEDGING SYSTEM V1.0 - MAIN INDEX
 * 
 * Complete auto-hedging system for trading bot with enterprise-grade features.
 * Provides: Automatic hedge execution, delta-neutral management, risk integration,
 * and advanced hedging strategies for comprehensive portfolio protection.
 */

// =====================================================
// CORE HEDGING EXPORTS
// =====================================================

export { 
    AutoHedgingEngine,
    HedgeExecutionEngine,
    HedgeType,
    HedgeStatus,
    HedgeTrigger,
    HedgePosition,
    HedgeStrategy,
    HedgeResult,
    HedgeCalculation,
    AutoHedgingConfig
} from './auto_hedging_engine';

export {
    DeltaNeutralManager,
    DeltaMetrics,
    DeltaAdjustment,
    DeltaNeutralConfig,
    RebalanceResult,
    RebalanceDetail
} from './delta_neutral_manager';

export {
    HedgingRiskIntegration,
    HedgeRiskEvent,
    HedgeResponse,
    HedgeMonitoringMetrics,
    HedgeAlert,
    HedgeIntegrationConfig
} from './hedging_risk_integration';

export {
    AdvancedHedgingStrategies,
    CorrelationHedgeStrategy,
    CrossAssetHedgeConfig,
    VolatilityHedgeConfig,
    DynamicHedgeAdjustment,
    HedgeOptimizationResult,
    HedgeImplementationStep
} from './advanced_hedging_strategies';

export {
    HedgeExecutionAdapter,
    GenericExecutor
} from './hedge_execution_adapter';

// =====================================================
// HEDGING SYSTEM FACTORY
// =====================================================

import { Logger } from '../../infrastructure/logging/logger';
import { Portfolio } from '../portfolio/portfolio';
import { EnterpriseRiskManagementSystem } from '../risk/enterprise_risk_management_system';
import { AutoHedgingEngine, HedgeExecutionEngine } from './auto_hedging_engine';
import { DeltaNeutralManager } from './delta_neutral_manager';
import { HedgingRiskIntegration } from './hedging_risk_integration';
import { AdvancedHedgingStrategies } from './advanced_hedging_strategies';

/**
 * Complete Auto-Hedging System Configuration
 */
export interface AutoHedgingSystemConfig {
    hedgingEngine?: {
        enabled?: boolean;
        maxHedgeRatio?: number;
        minEffectiveness?: number;
        rebalanceInterval?: number;
        hedgeExpiry?: number;
        emergencyHedging?: boolean;
    };
    deltaNeutral?: {
        enabled?: boolean;
        targetDelta?: number;
        deltaThreshold?: number;
        rebalanceFrequency?: number;
        neutralityTarget?: number;
        autoRebalance?: boolean;
    };
    riskIntegration?: {
        enabled?: boolean;
        autoResponseEnabled?: boolean;
        responseTimeoutMs?: number;
        maxConcurrentHedges?: number;
        monitoringInterval?: number;
    };
    advancedStrategies?: {
        correlationHedging?: boolean;
        crossAssetHedging?: boolean;
        volatilityHedging?: boolean;
        dynamicAdjustment?: boolean;
    };
}

/**
 * Complete Auto-Hedging System Status
 */
export interface AutoHedgingSystemStatus {
    isActive: boolean;
    timestamp: number;
    components: {
        hedgingEngine: {
            active: boolean;
            activeHedges: number;
            averageEffectiveness: number;
        };
        deltaNeutral: {
            active: boolean;
            portfolioDelta: number;
            neutralityScore: number;
        };
        riskIntegration: {
            active: boolean;
            eventQueueSize: number;
            responseRate: number;
        };
        advancedStrategies: {
            active: boolean;
            correlationStrategies: number;
            lastOptimization: number;
        };
    };
    metrics: {
        totalHedgeValue: number;
        portfolioCoverage: number;
        riskReduction: number;
        hedgingCost: number;
    };
    alerts: Array<{
        type: string;
        severity: string;
        message: string;
        timestamp: number;
    }>;
}

/**
 * Complete Auto-Hedging System Factory
 */
export class AutoHedgingSystemFactory {
    /**
     * Create complete auto-hedging system with all components
     */
    static create(
        logger: Logger,
        portfolio: Portfolio,
        riskManagement: EnterpriseRiskManagementSystem,
        config?: AutoHedgingSystemConfig,
        executionEngine?: HedgeExecutionEngine
    ): AutoHedgingSystem {
        return new AutoHedgingSystem(logger, portfolio, riskManagement, config, executionEngine);
    }
}

/**
 * Complete Auto-Hedging System Orchestrator
 */
export class AutoHedgingSystem {
    private logger: Logger;
    private portfolio: Portfolio;
    private riskManagement: EnterpriseRiskManagementSystem;
    private config: AutoHedgingSystemConfig;
    private executionEngine?: HedgeExecutionEngine;

    // Core components
    private hedgingEngine!: AutoHedgingEngine;
    private deltaNeutralManager!: DeltaNeutralManager;
    private riskIntegration!: HedgingRiskIntegration;
    private advancedStrategies!: AdvancedHedgingStrategies;

    // System state
    private isSystemActive: boolean = false;
    private startTime: number = 0;

    constructor(
        logger: Logger,
        portfolio: Portfolio,
        riskManagement: EnterpriseRiskManagementSystem,
        config?: AutoHedgingSystemConfig,
        executionEngine?: HedgeExecutionEngine
    ) {
        this.logger = logger;
        this.portfolio = portfolio;
        this.riskManagement = riskManagement;
        this.config = config || {};
        this.executionEngine = executionEngine;

        this.initializeComponents();
        this.setupSystemIntegration();
    }

    // =====================================================
    // EXECUTION ENGINE INTEGRATION
    // =====================================================

    /**
     * Set execution engine for live hedge trading
     */
    setExecutionEngine(executionEngine: HedgeExecutionEngine): void {
        this.executionEngine = executionEngine;
        this.hedgingEngine.setExecutionEngine(executionEngine);
        this.logger.info('🔗 Auto-hedging system connected to live execution engine');
    }

    /**
     * Get current execution mode
     */
    getExecutionMode(): 'live' | 'simulation' {
        return this.executionEngine ? 'live' : 'simulation';
    }

    // =====================================================
    // SYSTEM LIFECYCLE
    // =====================================================

    /**
     * Start the complete auto-hedging system
     */
    async start(): Promise<void> {
        if (this.isSystemActive) {
            this.logger.warn('⚠️ Auto-hedging system is already active');
            return;
        }

        try {
            this.logger.info('🚀 Starting Auto-Hedging System V1.0...');
            this.startTime = Date.now();

            // Start core components in order
            this.hedgingEngine.start();
            this.logger.info('✅ Hedging Engine started');

            this.deltaNeutralManager.start();
            this.logger.info('✅ Delta-Neutral Manager started');

            this.riskIntegration.start();
            this.logger.info('✅ Risk Integration started');

            this.advancedStrategies.start();
            this.logger.info('✅ Advanced Strategies started');

            this.isSystemActive = true;

            this.logger.info('🎯 Auto-Hedging System fully operational!');
            this.logSystemStatus();

        } catch (error) {
            this.logger.error(`❌ Failed to start auto-hedging system: ${error}`);
            await this.stop(); // Cleanup on failure
            throw error;
        }
    }

    /**
     * Stop the complete auto-hedging system
     */
    async stop(): Promise<void> {
        if (!this.isSystemActive) {
            return;
        }

        try {
            this.logger.info('🛑 Stopping Auto-Hedging System...');

            // Stop components in reverse order
            this.advancedStrategies.stop();
            this.riskIntegration.stop();
            this.deltaNeutralManager.stop();
            this.hedgingEngine.stop();

            this.isSystemActive = false;

            const uptime = Date.now() - this.startTime;
            this.logger.info(`✅ Auto-Hedging System stopped. Total uptime: ${this.formatUptime(uptime)}`);

        } catch (error) {
            this.logger.error(`❌ Error stopping auto-hedging system: ${error}`);
        }
    }

    /**
     * Restart the auto-hedging system
     */
    async restart(): Promise<void> {
        this.logger.info('🔄 Restarting Auto-Hedging System...');
        await this.stop();
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        await this.start();
    }

    // =====================================================
    // SYSTEM STATUS & MONITORING
    // =====================================================

    /**
     * Get comprehensive system status
     */
    getSystemStatus(): AutoHedgingSystemStatus {
        const activeHedges = this.hedgingEngine.getActiveHedges();
        const deltaMetrics = this.deltaNeutralManager.getCurrentMetrics();
        const integrationMetrics = this.riskIntegration.getCurrentMetrics();
        const queueStatus = this.riskIntegration.getEventQueueStatus();

        // Calculate metrics
        const totalHedgeValue = activeHedges.reduce((sum, hedge) => 
            sum + Math.abs(hedge.hedgeSize * hedge.currentPrice), 0
        );

        const averageEffectiveness = activeHedges.length > 0 ? 
            activeHedges.reduce((sum, hedge) => sum + hedge.effectiveness, 0) / activeHedges.length : 0;

        const portfolioCoverage = integrationMetrics?.hedgeCoverage || 0;
        const riskReduction = integrationMetrics?.riskReduction || 0;
        const hedgingCost = integrationMetrics?.hedgingCost || 0;

        // Collect alerts
        const alerts: Array<{ type: string; severity: string; message: string; timestamp: number }> = [];
        
        if (integrationMetrics?.alerts) {
            integrationMetrics.alerts.forEach(alert => {
                alerts.push({
                    type: alert.alertType,
                    severity: alert.severity,
                    message: alert.message,
                    timestamp: alert.timestamp
                });
            });
        }

        return {
            isActive: this.isSystemActive,
            timestamp: Date.now(),
            components: {
                hedgingEngine: {
                    active: this.isSystemActive,
                    activeHedges: activeHedges.length,
                    averageEffectiveness
                },
                deltaNeutral: {
                    active: this.isSystemActive,
                    portfolioDelta: deltaMetrics?.portfolioDelta || 0,
                    neutralityScore: deltaMetrics?.neutralityScore || 0
                },
                riskIntegration: {
                    active: this.isSystemActive,
                    eventQueueSize: queueStatus.unprocessedEvents,
                    responseRate: 0.95 // Mock response rate
                },
                advancedStrategies: {
                    active: this.isSystemActive,
                    correlationStrategies: 2, // Mock count
                    lastOptimization: Date.now() - 3600000 // 1 hour ago
                }
            },
            metrics: {
                totalHedgeValue,
                portfolioCoverage,
                riskReduction,
                hedgingCost
            },
            alerts
        };
    }

    /**
     * Get system performance metrics
     */
    getPerformanceMetrics(): {
        uptime: number;
        hedgesExecuted: number;
        effectivenessHistory: number[];
        costEfficiency: number;
        systemReliability: number;
    } {
        const uptime = this.isSystemActive ? Date.now() - this.startTime : 0;
        const activeHedges = this.hedgingEngine.getActiveHedges();
        
        return {
            uptime,
            hedgesExecuted: activeHedges.length, // Simplified
            effectivenessHistory: [0.75, 0.78, 0.82, 0.79, 0.81], // Mock history
            costEfficiency: 0.85, // Mock efficiency
            systemReliability: 0.99 // Mock reliability
        };
    }

    // =====================================================
    // PUBLIC API METHODS
    // =====================================================

    /**
     * Execute manual hedge
     */
    async executeManualHedge(
        symbol: string,
        hedgeType: 'DELTA_NEUTRAL' | 'CORRELATION_BASED' | 'VOLATILITY_HEDGE',
        size: number
    ): Promise<any> {
        this.logger.info(`🔧 Executing manual hedge: ${symbol} (${hedgeType})`);

        const trigger = {
            triggerId: `manual_${Date.now()}`,
            sourcePositionId: symbol,
            triggerType: 'RISK_LIMIT' as const,
            triggerValue: size,
            timestamp: Date.now(),
            severity: 'MEDIUM' as const,
            metadata: {
                manual: true,
                requestedHedgeType: hedgeType
            }
        };

        return await this.hedgingEngine.executeHedge(trigger);
    }

    /**
     * Force delta rebalance
     */
    async forceDeltaRebalance(): Promise<any> {
        this.logger.info('🔄 Forcing delta rebalance...');
        return await this.deltaNeutralManager.forceRebalance();
    }

    /**
     * Optimize hedge portfolio
     */
    async optimizeHedgePortfolio(): Promise<any> {
        this.logger.info('🎯 Optimizing hedge portfolio...');
        return await this.advancedStrategies.optimizeHedgePortfolio();
    }

    /**
     * Get hedge effectiveness report
     */
    getHedgeEffectivenessReport(): any {
        return this.hedgingEngine.getHedgeEffectivenessReport();
    }

    /**
     * Check if system is running
     */
    isRunning(): boolean {
        return this.isSystemActive;
    }

    /**
     * Evaluate if hedging is needed based on current market data
     */
    async evaluateHedgeNeed(marketData: any): Promise<{
        shouldHedge: boolean;
        reason: string;
        trigger?: any;
    }> {
        try {
            // Get current portfolio state
            const deltaMetrics = await this.deltaNeutralManager.calculatePortfolioDelta();
            const portfolioDelta = deltaMetrics.portfolioDelta;
            const deltaThreshold = this.config.deltaNeutral?.deltaThreshold || 0.1;
            
            // Check delta neutrality
            if (Math.abs(portfolioDelta) > deltaThreshold) {
                return {
                    shouldHedge: true,
                    reason: `Portfolio delta imbalance: ${portfolioDelta.toFixed(4)} (threshold: ${deltaThreshold})`,
                    trigger: {
                        triggerId: `delta_${Date.now()}`,
                        sourcePositionId: marketData.symbol,
                        triggerType: 'DELTA_NEUTRAL',
                        triggerValue: Math.abs(portfolioDelta),
                        timestamp: Date.now(),
                        severity: Math.abs(portfolioDelta) > deltaThreshold * 2 ? 'HIGH' : 'MEDIUM',
                        metadata: {
                            currentDelta: portfolioDelta,
                            threshold: deltaThreshold,
                            marketPrice: marketData.price
                        }
                    }
                };
            }

            // Check volatility spike
            const volatilityThreshold = this.config.hedgingEngine?.minEffectiveness || 0.3;
            if (marketData.volatility > volatilityThreshold) {
                return {
                    shouldHedge: true,
                    reason: `Volatility spike detected: ${(marketData.volatility * 100).toFixed(1)}% (threshold: ${(volatilityThreshold * 100).toFixed(1)}%)`,
                    trigger: {
                        triggerId: `volatility_${Date.now()}`,
                        sourcePositionId: marketData.symbol,
                        triggerType: 'VOLATILITY_HEDGE',
                        triggerValue: marketData.volatility,
                        timestamp: Date.now(),
                        severity: marketData.volatility > volatilityThreshold * 1.5 ? 'HIGH' : 'MEDIUM',
                        metadata: {
                            currentVolatility: marketData.volatility,
                            threshold: volatilityThreshold,
                            marketPrice: marketData.price
                        }
                    }
                };
            }

            return {
                shouldHedge: false,
                reason: 'No hedge triggers detected'
            };
        } catch (error) {
            this.logger.error(`Error evaluating hedge need: ${error}`);
            return {
                shouldHedge: false,
                reason: `Evaluation error: ${error}`
            };
        }
    }

    /**
     * Execute hedge based on trigger
     */
    async executeHedge(trigger: any): Promise<{
        success: boolean;
        hedgeId?: string;
        hedgeDirection?: 'buy' | 'sell';
        hedgeSize?: number;
        effectiveness?: number;
        error?: string;
    }> {
        try {
            const hedgeResult = await this.hedgingEngine.executeHedge(trigger);
            
            if (hedgeResult && hedgeResult.success) {
                return {
                    success: true,
                    hedgeId: hedgeResult.hedgeId || `hedge_${Date.now()}`,
                    hedgeDirection: (hedgeResult.hedgePosition?.hedgeSize || 0) > 0 ? 'buy' : 'sell',
                    hedgeSize: Math.abs(hedgeResult.hedgePosition?.hedgeSize || 0),
                    effectiveness: hedgeResult.hedgeEffectiveness || 0.85
                };
            } else {
                return {
                    success: false,
                    error: hedgeResult?.errorMessage || 'Hedge execution returned unsuccessful result'
                };
            }
        } catch (error) {
            this.logger.error(`Hedge execution failed: ${error}`);
            return {
                success: false,
                error: `Execution error: ${error}`
            };
        }
    }

    /**
     * Update market data for all components
     */
    updateMarketData(symbol: string, data: any): void {
        this.hedgingEngine.updateMarketData(symbol, data);
        this.deltaNeutralManager.updateMarketPrice(symbol, data.price);
        this.advancedStrategies.updateMarketData(symbol, data);
    }

    // =====================================================
    // COMPONENT ACCESS
    // =====================================================

    /**
     * Get hedging engine instance
     */
    getHedgingEngine(): AutoHedgingEngine {
        return this.hedgingEngine;
    }

    /**
     * Get delta-neutral manager instance
     */
    getDeltaNeutralManager(): DeltaNeutralManager {
        return this.deltaNeutralManager;
    }

    /**
     * Get risk integration instance
     */
    getRiskIntegration(): HedgingRiskIntegration {
        return this.riskIntegration;
    }

    /**
     * Get advanced strategies instance
     */
    getAdvancedStrategies(): AdvancedHedgingStrategies {
        return this.advancedStrategies;
    }

    // =====================================================
    // PRIVATE METHODS
    // =====================================================

    /**
     * Initialize all hedging components
     */
    private initializeComponents(): void {
        this.logger.info('🔧 Initializing auto-hedging components...');

        // Create hedging engine with execution engine
        this.hedgingEngine = new AutoHedgingEngine(
            this.logger, 
            this.config.hedgingEngine, 
            this.executionEngine
        );

        // Create delta-neutral manager
        this.deltaNeutralManager = new DeltaNeutralManager(
            this.logger,
            this.portfolio,
            this.hedgingEngine,
            this.config.deltaNeutral
        );

        // Create risk integration
        this.riskIntegration = new HedgingRiskIntegration(
            this.logger,
            this.riskManagement,
            this.hedgingEngine,
            this.deltaNeutralManager,
            this.config.riskIntegration
        );

        // Create advanced strategies
        this.advancedStrategies = new AdvancedHedgingStrategies(
            this.logger,
            this.hedgingEngine,
            this.deltaNeutralManager
        );

        this.logger.info('✅ All hedging components initialized');
        
        if (this.executionEngine) {
            this.logger.info('🔗 Auto-hedging system connected to live execution engine');
        } else {
            this.logger.warn('⚠️ Auto-hedging system running in simulation mode');
        }
    }

    /**
     * Setup integration between components
     */
    private setupSystemIntegration(): void {
        this.logger.info('🔗 Setting up component integration...');

        // Connect hedging engine events
        this.hedgingEngine.on('hedge_executed', (event) => {
            this.logger.debug(`🛡️ Hedge executed: ${event.hedgePosition.hedgeId}`);
        });

        // Connect delta manager events
        this.deltaNeutralManager.on('neutrality_maintained', (result) => {
            this.logger.debug(`⚖️ Delta neutrality maintained: ${result.adjustmentsMade} adjustments`);
        });

        // Connect risk integration events
        this.riskIntegration.on('hedge_response_completed', (event) => {
            this.logger.debug(`🔗 Risk integration response: ${event.response.action}`);
        });

        // Connect advanced strategies events
        this.advancedStrategies.on('correlation_hedging_completed', (event) => {
            this.logger.debug(`🎯 Correlation hedging completed for ${event.symbol}`);
        });

        this.logger.info('✅ Component integration setup complete');
    }

    /**
     * Log current system status
     */
    private logSystemStatus(): void {
        const status = this.getSystemStatus();
        
        this.logger.info('📊 Auto-Hedging System Status:');
        this.logger.info(`   🛡️ Active Hedges: ${status.components.hedgingEngine.activeHedges}`);
        this.logger.info(`   ⚖️ Portfolio Delta: ${status.components.deltaNeutral.portfolioDelta.toFixed(4)}`);
        this.logger.info(`   🎯 Neutrality Score: ${(status.components.deltaNeutral.neutralityScore * 100).toFixed(1)}%`);
        this.logger.info(`   💰 Hedge Value: $${status.metrics.totalHedgeValue.toLocaleString()}`);
        this.logger.info(`   📈 Portfolio Coverage: ${(status.metrics.portfolioCoverage * 100).toFixed(1)}%`);
        
        if (status.alerts.length > 0) {
            this.logger.info(`   🚨 Active Alerts: ${status.alerts.length}`);
        }
    }

    /**
     * Format uptime duration
     */
    private formatUptime(milliseconds: number): string {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Cleanup the auto-hedging system
     */
    async cleanup(): Promise<void> {
        this.logger.info('🧹 Cleaning up Auto-Hedging System...');
        
        try {
            // Stop the system if it's running
            if (this.isSystemActive) {
                await this.stop();
            }

            // Final cleanup of any resources
            this.logger.info('✅ Auto-Hedging System cleanup completed');
            
        } catch (error) {
            this.logger.error(`❌ Error during auto-hedging cleanup: ${error}`);
            throw error;
        }
    }
}

// =====================================================
// DEFAULT EXPORT
// =====================================================

export default AutoHedgingSystem;

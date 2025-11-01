"use strict";
/**
 * 🚀 [PRODUCTION-API]
 * Production API component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🛡️ AUTO-HEDGING SYSTEM V1.0 - MAIN INDEX
 *
 * Complete auto-hedging system for trading bot with enterprise-grade features.
 * Provides: Automatic hedge execution, delta-neutral management, risk integration,
 * and advanced hedging strategies for comprehensive portfolio protection.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoHedgingSystem = exports.AutoHedgingSystemFactory = exports.HedgeExecutionAdapter = exports.AdvancedHedgingStrategies = exports.HedgingRiskIntegration = exports.DeltaNeutralManager = exports.HedgeStatus = exports.HedgeType = exports.AutoHedgingEngine = void 0;
// =====================================================
// CORE HEDGING EXPORTS
// =====================================================
var auto_hedging_engine_1 = require("./auto_hedging_engine");
Object.defineProperty(exports, "AutoHedgingEngine", { enumerable: true, get: function () { return auto_hedging_engine_1.AutoHedgingEngine; } });
Object.defineProperty(exports, "HedgeType", { enumerable: true, get: function () { return auto_hedging_engine_1.HedgeType; } });
Object.defineProperty(exports, "HedgeStatus", { enumerable: true, get: function () { return auto_hedging_engine_1.HedgeStatus; } });
var delta_neutral_manager_1 = require("./delta_neutral_manager");
Object.defineProperty(exports, "DeltaNeutralManager", { enumerable: true, get: function () { return delta_neutral_manager_1.DeltaNeutralManager; } });
var hedging_risk_integration_1 = require("./hedging_risk_integration");
Object.defineProperty(exports, "HedgingRiskIntegration", { enumerable: true, get: function () { return hedging_risk_integration_1.HedgingRiskIntegration; } });
var advanced_hedging_strategies_1 = require("./advanced_hedging_strategies");
Object.defineProperty(exports, "AdvancedHedgingStrategies", { enumerable: true, get: function () { return advanced_hedging_strategies_1.AdvancedHedgingStrategies; } });
var hedge_execution_adapter_1 = require("./hedge_execution_adapter");
Object.defineProperty(exports, "HedgeExecutionAdapter", { enumerable: true, get: function () { return hedge_execution_adapter_1.HedgeExecutionAdapter; } });
const auto_hedging_engine_2 = require("./auto_hedging_engine");
const delta_neutral_manager_2 = require("./delta_neutral_manager");
const hedging_risk_integration_2 = require("./hedging_risk_integration");
const advanced_hedging_strategies_2 = require("./advanced_hedging_strategies");
/**
 * Complete Auto-Hedging System Factory
 */
class AutoHedgingSystemFactory {
    /**
     * Create complete auto-hedging system with all components
     */
    static create(logger, portfolio, riskManagement, config, executionEngine) {
        return new AutoHedgingSystem(logger, portfolio, riskManagement, config, executionEngine);
    }
}
exports.AutoHedgingSystemFactory = AutoHedgingSystemFactory;
/**
 * Complete Auto-Hedging System Orchestrator
 */
class AutoHedgingSystem {
    constructor(logger, portfolio, riskManagement, config, executionEngine) {
        // System state
        this.isSystemActive = false;
        this.startTime = 0;
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
    setExecutionEngine(executionEngine) {
        this.executionEngine = executionEngine;
        this.hedgingEngine.setExecutionEngine(executionEngine);
        this.logger.info('🔗 Auto-hedging system connected to live execution engine');
    }
    /**
     * Get current execution mode
     */
    getExecutionMode() {
        return this.executionEngine ? 'live' : 'simulation';
    }
    // =====================================================
    // SYSTEM LIFECYCLE
    // =====================================================
    /**
     * Start the complete auto-hedging system
     */
    async start() {
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
        }
        catch (error) {
            this.logger.error(`❌ Failed to start auto-hedging system: ${error}`);
            await this.stop(); // Cleanup on failure
            throw error;
        }
    }
    /**
     * Stop the complete auto-hedging system
     */
    async stop() {
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
        }
        catch (error) {
            this.logger.error(`❌ Error stopping auto-hedging system: ${error}`);
        }
    }
    /**
     * Restart the auto-hedging system
     */
    async restart() {
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
    getSystemStatus() {
        const activeHedges = this.hedgingEngine.getActiveHedges();
        const deltaMetrics = this.deltaNeutralManager.getCurrentMetrics();
        const integrationMetrics = this.riskIntegration.getCurrentMetrics();
        const queueStatus = this.riskIntegration.getEventQueueStatus();
        // Calculate metrics
        const totalHedgeValue = activeHedges.reduce((sum, hedge) => sum + Math.abs(hedge.hedgeSize * hedge.currentPrice), 0);
        const averageEffectiveness = activeHedges.length > 0 ?
            activeHedges.reduce((sum, hedge) => sum + hedge.effectiveness, 0) / activeHedges.length : 0;
        const portfolioCoverage = integrationMetrics?.hedgeCoverage || 0;
        const riskReduction = integrationMetrics?.riskReduction || 0;
        const hedgingCost = integrationMetrics?.hedgingCost || 0;
        // Collect alerts
        const alerts = [];
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
    getPerformanceMetrics() {
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
    async executeManualHedge(symbol, hedgeType, size) {
        this.logger.info(`🔧 Executing manual hedge: ${symbol} (${hedgeType})`);
        const trigger = {
            triggerId: `manual_${Date.now()}`,
            sourcePositionId: symbol,
            triggerType: 'RISK_LIMIT',
            triggerValue: size,
            timestamp: Date.now(),
            severity: 'MEDIUM',
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
    async forceDeltaRebalance() {
        this.logger.info('🔄 Forcing delta rebalance...');
        return await this.deltaNeutralManager.forceRebalance();
    }
    /**
     * Optimize hedge portfolio
     */
    async optimizeHedgePortfolio() {
        this.logger.info('🎯 Optimizing hedge portfolio...');
        return await this.advancedStrategies.optimizeHedgePortfolio();
    }
    /**
     * Get hedge effectiveness report
     */
    getHedgeEffectivenessReport() {
        return this.hedgingEngine.getHedgeEffectivenessReport();
    }
    /**
     * Check if system is running
     */
    isRunning() {
        return this.isSystemActive;
    }
    /**
     * Evaluate if hedging is needed based on current market data
     */
    async evaluateHedgeNeed(marketData) {
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
        }
        catch (error) {
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
    async executeHedge(trigger) {
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
            }
            else {
                return {
                    success: false,
                    error: hedgeResult?.errorMessage || 'Hedge execution returned unsuccessful result'
                };
            }
        }
        catch (error) {
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
    updateMarketData(symbol, data) {
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
    getHedgingEngine() {
        return this.hedgingEngine;
    }
    /**
     * Get delta-neutral manager instance
     */
    getDeltaNeutralManager() {
        return this.deltaNeutralManager;
    }
    /**
     * Get risk integration instance
     */
    getRiskIntegration() {
        return this.riskIntegration;
    }
    /**
     * Get advanced strategies instance
     */
    getAdvancedStrategies() {
        return this.advancedStrategies;
    }
    // =====================================================
    // PRIVATE METHODS
    // =====================================================
    /**
     * Initialize all hedging components
     */
    initializeComponents() {
        this.logger.info('🔧 Initializing auto-hedging components...');
        // Create hedging engine with execution engine
        this.hedgingEngine = new auto_hedging_engine_2.AutoHedgingEngine(this.logger, this.config.hedgingEngine, this.executionEngine);
        // Create delta-neutral manager
        this.deltaNeutralManager = new delta_neutral_manager_2.DeltaNeutralManager(this.logger, this.portfolio, this.hedgingEngine, this.config.deltaNeutral);
        // Create risk integration
        this.riskIntegration = new hedging_risk_integration_2.HedgingRiskIntegration(this.logger, this.riskManagement, this.hedgingEngine, this.deltaNeutralManager, this.config.riskIntegration);
        // Create advanced strategies
        this.advancedStrategies = new advanced_hedging_strategies_2.AdvancedHedgingStrategies(this.logger, this.hedgingEngine, this.deltaNeutralManager);
        this.logger.info('✅ All hedging components initialized');
        if (this.executionEngine) {
            this.logger.info('🔗 Auto-hedging system connected to live execution engine');
        }
        else {
            this.logger.warn('⚠️ Auto-hedging system running in simulation mode');
        }
    }
    /**
     * Setup integration between components
     */
    setupSystemIntegration() {
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
    logSystemStatus() {
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
    formatUptime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        }
        else if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        }
        else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        else {
            return `${seconds}s`;
        }
    }
    /**
     * Cleanup the auto-hedging system
     */
    async cleanup() {
        this.logger.info('🧹 Cleaning up Auto-Hedging System...');
        try {
            // Stop the system if it's running
            if (this.isSystemActive) {
                await this.stop();
            }
            // Final cleanup of any resources
            this.logger.info('✅ Auto-Hedging System cleanup completed');
        }
        catch (error) {
            this.logger.error(`❌ Error during auto-hedging cleanup: ${error}`);
            throw error;
        }
    }
}
exports.AutoHedgingSystem = AutoHedgingSystem;
// =====================================================
// DEFAULT EXPORT
// =====================================================
exports.default = AutoHedgingSystem;

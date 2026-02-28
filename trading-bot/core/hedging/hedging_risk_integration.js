"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🔗 HEDGING RISK INTEGRATION V1.0
 *
 * Integration layer between the auto-hedging system and enterprise risk management.
 * Features: Risk event handling, hedge monitoring, effectiveness tracking,
 * and seamless integration with existing risk management infrastructure.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HedgingRiskIntegration = void 0;
const events_1 = require("events");
// =====================================================
// HEDGING RISK INTEGRATION IMPLEMENTATION
// =====================================================
class HedgingRiskIntegration extends events_1.EventEmitter {
    constructor(logger, riskManagement, hedgingEngine, deltaNeutralManager, config) {
        super();
        this.eventQueue = [];
        this.responseHistory = [];
        this.activeMonitoring = false;
        this.currentMetrics = null;
        this.logger = logger;
        this.riskManagement = riskManagement;
        this.hedgingEngine = hedgingEngine;
        this.deltaNeutralManager = deltaNeutralManager;
        this.config = {
            enabled: true,
            autoResponseEnabled: true,
            responseTimeoutMs: 5000, // 5 second timeout
            maxConcurrentHedges: 10,
            hedgeEffectivenessThreshold: 0.7,
            costThreshold: 0.02, // 2% of portfolio value
            monitoringInterval: 2, // 2 minutes
            alertSettings: {
                enableAlerts: true,
                lowEffectivenessThreshold: 0.6,
                highCostThreshold: 0.03,
                insufficientCoverageThreshold: 0.5
            },
            ...config
        };
        this.setupEventHandlers();
    }
    // =====================================================
    // RISK EVENT HANDLING
    // =====================================================
    /**
     * Handle auto-hedge request from risk management system
     */
    async respondToHedgeRequest(event) {
        const startTime = Date.now();
        try {
            this.logger.info(`🔗 Processing hedge request: ${event.limitId || event.eventId}`);
            // Create hedge risk event
            const hedgeEvent = {
                eventId: `hedge_event_${Date.now()}`,
                eventType: 'AUTO_HEDGE_REQUESTED',
                source: 'RISK_MANAGEMENT',
                timestamp: Date.now(),
                severity: this.mapRiskSeverity(event.severity || 'MEDIUM'),
                data: {
                    limitId: event.limitId,
                    reason: event.reason,
                    riskLevel: event.riskLevel,
                    positionId: event.positionId,
                    originalEvent: event
                },
                processed: false
            };
            // Add to event queue
            this.eventQueue.push(hedgeEvent);
            // Process the event if auto-response is enabled
            if (this.config.autoResponseEnabled) {
                return await this.processHedgeEvent(hedgeEvent);
            }
            else {
                // Queue for manual processing
                this.emit('hedge_event_queued', hedgeEvent);
                return {
                    responseId: `response_${Date.now()}`,
                    eventId: hedgeEvent.eventId,
                    action: 'HEDGE_DEFERRED',
                    reason: 'Auto-response disabled, queued for manual processing',
                    timestamp: Date.now()
                };
            }
        }
        catch (error) {
            this.logger.error(`❌ Failed to respond to hedge request: ${error}`);
            return {
                responseId: `response_${Date.now()}`,
                eventId: 'unknown',
                action: 'HEDGE_REJECTED',
                reason: error instanceof Error ? error.message : 'Unknown error',
                timestamp: Date.now()
            };
        }
    }
    /**
     * Process a hedge event and execute appropriate response
     */
    async processHedgeEvent(event) {
        const startTime = Date.now();
        try {
            this.logger.info(`🔄 Processing hedge event: ${event.eventType}`);
            // Validate hedge request
            const validation = await this.validateHedgeRequest(event);
            if (!validation.valid) {
                return {
                    responseId: `response_${Date.now()}`,
                    eventId: event.eventId,
                    action: 'HEDGE_REJECTED',
                    reason: validation.reason,
                    timestamp: Date.now()
                };
            }
            // Create hedge trigger from event
            const hedgeTrigger = await this.createHedgeTrigger(event);
            // Execute hedge through hedging engine
            const hedgeResult = await this.hedgingEngine.executeHedge(hedgeTrigger);
            // Create response
            const response = {
                responseId: `response_${Date.now()}`,
                eventId: event.eventId,
                action: hedgeResult.success ? 'HEDGE_EXECUTED' : 'HEDGE_REJECTED',
                hedgeResult,
                reason: hedgeResult.success ? 'Hedge executed successfully' : hedgeResult.errorMessage,
                timestamp: Date.now(),
                metadata: {
                    executionTime: Date.now() - startTime,
                    hedgeId: hedgeResult.hedgeId,
                    effectiveness: hedgeResult.hedgeEffectiveness
                }
            };
            // Update event as processed
            event.processed = true;
            event.response = response;
            // Add to response history
            this.responseHistory.push(response);
            // Emit integration event
            this.emit('hedge_response_completed', { event, response });
            this.logger.info(`✅ Hedge event processed: ${response.action}`);
            return response;
        }
        catch (error) {
            this.logger.error(`❌ Failed to process hedge event: ${error}`);
            return {
                responseId: `response_${Date.now()}`,
                eventId: event.eventId,
                action: 'HEDGE_REJECTED',
                reason: error instanceof Error ? error.message : 'Processing error',
                timestamp: Date.now()
            };
        }
    }
    /**
     * Validate hedge request before execution
     */
    async validateHedgeRequest(event) {
        // Check if hedging is enabled
        if (!this.config.enabled) {
            return { valid: false, reason: 'Hedging integration is disabled' };
        }
        // Check concurrent hedge limits
        const activeHedges = this.hedgingEngine.getActiveHedges();
        if (activeHedges.length >= this.config.maxConcurrentHedges) {
            return { valid: false, reason: 'Maximum concurrent hedges limit reached' };
        }
        // Check cost constraints
        const estimatedCost = this.estimateHedgeCost(event);
        if (estimatedCost > this.config.costThreshold) {
            return { valid: false, reason: `Estimated hedge cost (${estimatedCost}) exceeds threshold` };
        }
        // Validate event data
        if (!event.data.positionId && !event.data.limitId) {
            return { valid: false, reason: 'Missing position or limit identifier' };
        }
        return { valid: true };
    }
    /**
     * Create hedge trigger from risk event
     */
    async createHedgeTrigger(event) {
        return {
            triggerId: `trigger_${event.eventId}`,
            sourcePositionId: event.data.positionId || 'portfolio',
            triggerType: this.mapEventToTriggerType(event.eventType),
            triggerValue: event.data.riskLevel || 0,
            timestamp: Date.now(),
            severity: event.severity,
            metadata: {
                originalEvent: event,
                riskLimitId: event.data.limitId,
                integrationSource: 'RISK_MANAGEMENT'
            }
        };
    }
    // =====================================================
    // HEDGE MONITORING & EFFECTIVENESS TRACKING
    // =====================================================
    /**
     * Monitor hedge effectiveness continuously
     */
    async monitorHedgeEffectiveness() {
        try {
            this.logger.debug('📊 Monitoring hedge effectiveness...');
            // Get all active hedges
            const activeHedges = this.hedgingEngine.getActiveHedges();
            if (activeHedges.length === 0) {
                return;
            }
            // Calculate monitoring metrics
            const metrics = await this.calculateMonitoringMetrics(activeHedges);
            this.currentMetrics = metrics;
            // Check for alerts
            const alerts = this.generateHedgeAlerts(metrics, activeHedges);
            metrics.alerts = alerts;
            // Process alerts
            for (const alert of alerts) {
                await this.processHedgeAlert(alert);
            }
            // Emit monitoring update
            this.emit('hedge_monitoring_update', metrics);
            // Log key metrics
            this.logger.debug(`📈 Hedge metrics - Active: ${metrics.totalActiveHedges}, Effectiveness: ${(metrics.averageEffectiveness * 100).toFixed(1)}%, Coverage: ${(metrics.hedgeCoverage * 100).toFixed(1)}%`);
        }
        catch (error) {
            this.logger.error(`❌ Hedge effectiveness monitoring failed: ${error}`);
        }
    }
    /**
     * Calculate comprehensive monitoring metrics
     */
    async calculateMonitoringMetrics(activeHedges) {
        const totalActiveHedges = activeHedges.length;
        const totalEffectiveness = activeHedges.reduce((sum, hedge) => sum + hedge.effectiveness, 0);
        const averageEffectiveness = totalActiveHedges > 0 ? totalEffectiveness / totalActiveHedges : 0;
        const totalHedgeValue = activeHedges.reduce((sum, hedge) => {
            return sum + Math.abs(hedge.hedgeSize * hedge.currentPrice);
        }, 0);
        // Calculate hedge coverage (simplified)
        const portfolioValue = await this.getPortfolioValue();
        const hedgeCoverage = portfolioValue > 0 ? totalHedgeValue / portfolioValue : 0;
        // Estimate risk reduction
        const riskReduction = averageEffectiveness * hedgeCoverage;
        // Calculate total hedging cost
        const hedgingCost = activeHedges.reduce((sum, hedge) => {
            return sum + Math.abs(hedge.unrealizedPnL);
        }, 0);
        return {
            totalActiveHedges,
            averageEffectiveness,
            totalHedgeValue,
            hedgeCoverage,
            riskReduction,
            hedgingCost,
            lastUpdated: Date.now(),
            alerts: [] // Will be populated by caller
        };
    }
    /**
     * Generate hedge alerts based on metrics
     */
    generateHedgeAlerts(metrics, activeHedges) {
        const alerts = [];
        if (!this.config.alertSettings.enableAlerts) {
            return alerts;
        }
        // Check average effectiveness
        if (metrics.averageEffectiveness < this.config.alertSettings.lowEffectivenessThreshold) {
            alerts.push({
                alertId: `alert_effectiveness_${Date.now()}`,
                alertType: 'EFFECTIVENESS_LOW',
                severity: 'HIGH',
                message: `Average hedge effectiveness (${(metrics.averageEffectiveness * 100).toFixed(1)}%) below threshold`,
                timestamp: Date.now(),
                acknowledged: false
            });
        }
        // Check hedging cost
        const costRatio = metrics.hedgingCost / 100000; // Mock portfolio value
        if (costRatio > this.config.alertSettings.highCostThreshold) {
            alerts.push({
                alertId: `alert_cost_${Date.now()}`,
                alertType: 'COST_HIGH',
                severity: 'MEDIUM',
                message: `Hedging cost (${(costRatio * 100).toFixed(2)}%) exceeds threshold`,
                timestamp: Date.now(),
                acknowledged: false
            });
        }
        // Check hedge coverage
        if (metrics.hedgeCoverage < this.config.alertSettings.insufficientCoverageThreshold) {
            alerts.push({
                alertId: `alert_coverage_${Date.now()}`,
                alertType: 'COVERAGE_INSUFFICIENT',
                severity: 'MEDIUM',
                message: `Hedge coverage (${(metrics.hedgeCoverage * 100).toFixed(1)}%) insufficient`,
                timestamp: Date.now(),
                acknowledged: false
            });
        }
        // Check individual hedge expiry
        const expiringHedges = activeHedges.filter(hedge => {
            const timeToExpiry = hedge.expiresAt ? hedge.expiresAt - Date.now() : Infinity;
            return timeToExpiry < 60 * 60 * 1000; // Less than 1 hour
        });
        for (const hedge of expiringHedges) {
            alerts.push({
                alertId: `alert_expiry_${hedge.hedgeId}`,
                alertType: 'HEDGE_EXPIRED',
                severity: 'LOW',
                message: `Hedge ${hedge.hedgeId} expires soon`,
                hedgeId: hedge.hedgeId,
                positionId: hedge.basePositionId,
                timestamp: Date.now(),
                acknowledged: false
            });
        }
        return alerts;
    }
    /**
     * Process hedge alert
     */
    async processHedgeAlert(alert) {
        this.logger.warn(`🚨 Hedge alert: ${alert.message}`);
        // Emit alert for external handling
        this.emit('hedge_alert_generated', alert);
        // Integration with enterprise risk management alerts
        try {
            // This would integrate with the existing alert system
            this.emit('risk_alert', {
                category: 'HEDGING',
                severity: alert.severity,
                message: alert.message,
                metadata: {
                    alertType: alert.alertType,
                    hedgeId: alert.hedgeId,
                    positionId: alert.positionId
                }
            });
        }
        catch (error) {
            this.logger.error(`❌ Failed to process hedge alert: ${error}`);
        }
    }
    // =====================================================
    // EVENT HANDLER SETUP
    // =====================================================
    /**
     * Setup event handlers for integration
     */
    setupEventHandlers() {
        // Listen for risk management hedge requests
        this.riskManagement.on('auto_hedge_requested', async (event) => {
            await this.respondToHedgeRequest(event);
        });
        // Listen for hedge engine events
        this.hedgingEngine.on('hedge_executed', (event) => {
            this.logger.info(`✅ Hedge executed via integration: ${event.hedgePosition.hedgeId}`);
            this.emit('integrated_hedge_executed', event);
        });
        this.hedgingEngine.on('hedge_effectiveness_low', async (event) => {
            const hedgeEvent = {
                eventId: `effectiveness_event_${Date.now()}`,
                eventType: 'HEDGE_EFFECTIVENESS_LOW',
                source: 'DELTA_MANAGER',
                timestamp: Date.now(),
                severity: 'MEDIUM',
                data: {
                    hedgeId: event.hedge.hedgeId,
                    effectiveness: event.hedge.effectiveness,
                    threshold: this.config.hedgeEffectivenessThreshold
                },
                processed: false
            };
            this.eventQueue.push(hedgeEvent);
            this.emit('hedge_effectiveness_alert', hedgeEvent);
        });
        // Listen for delta manager events
        this.deltaNeutralManager.on('neutrality_maintained', (result) => {
            this.logger.debug(`🔄 Delta neutrality maintained via integration - Adjustments: ${result.adjustmentsMade}`);
        });
        this.deltaNeutralManager.on('emergency_delta_breach', async (event) => {
            const hedgeEvent = {
                eventId: `emergency_delta_${Date.now()}`,
                eventType: 'EMERGENCY_HEDGE',
                source: 'DELTA_MANAGER',
                timestamp: Date.now(),
                severity: 'CRITICAL',
                data: {
                    deltaValue: event.deltaValue,
                    threshold: event.threshold,
                    portfolioValue: event.portfolioValue
                },
                processed: false
            };
            this.eventQueue.push(hedgeEvent);
            await this.processHedgeEvent(hedgeEvent);
        });
    }
    // =====================================================
    // UTILITY METHODS
    // =====================================================
    /**
     * Map risk severity to hedge severity
     */
    mapRiskSeverity(riskSeverity) {
        const mapping = {
            'LOW': 'LOW',
            'MEDIUM': 'MEDIUM',
            'HIGH': 'HIGH',
            'CRITICAL': 'CRITICAL'
        };
        return mapping[riskSeverity] || 'MEDIUM';
    }
    /**
     * Map event type to trigger type
     */
    mapEventToTriggerType(eventType) {
        const mapping = {
            'AUTO_HEDGE_REQUESTED': 'RISK_LIMIT',
            'HEDGE_EFFECTIVENESS_LOW': 'CORRELATION_BREAK',
            'EMERGENCY_HEDGE': 'DRAWDOWN_LIMIT'
        };
        return mapping[eventType] || 'RISK_LIMIT';
    }
    /**
     * Estimate hedge cost for validation
     */
    estimateHedgeCost(event) {
        // Simplified cost estimation
        const basePosition = event.data.positionValue || 10000;
        return basePosition * 0.001; // 0.1% of position value
    }
    /**
     * Get portfolio value for calculations
     */
    async getPortfolioValue() {
        // This would integrate with the actual portfolio
        return 100000; // Mock value
    }
    // =====================================================
    // PUBLIC API METHODS
    // =====================================================
    /**
     * Start hedge monitoring and integration
     */
    start() {
        if (this.activeMonitoring) {
            this.logger.warn('⚠️ Hedging risk integration is already running');
            return;
        }
        this.activeMonitoring = true;
        this.startMonitoringLoop();
        this.logger.info('🚀 Hedging risk integration started');
        this.emit('integration_started');
    }
    /**
     * Stop hedge monitoring and integration
     */
    stop() {
        if (!this.activeMonitoring) {
            return;
        }
        this.activeMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        this.logger.info('🛑 Hedging risk integration stopped');
        this.emit('integration_stopped');
    }
    /**
     * Get current monitoring metrics
     */
    getCurrentMetrics() {
        return this.currentMetrics;
    }
    /**
     * Get event queue status
     */
    getEventQueueStatus() {
        const unprocessedEvents = this.eventQueue.filter(event => !event.processed);
        const recentEvents = this.eventQueue.slice(-10); // Last 10 events
        return {
            totalEvents: this.eventQueue.length,
            unprocessedEvents: unprocessedEvents.length,
            recentEvents
        };
    }
    /**
     * Get response history
     */
    getResponseHistory() {
        return [...this.responseHistory];
    }
    /**
     * Acknowledge hedge alert
     */
    acknowledgeAlert(alertId) {
        if (this.currentMetrics) {
            const alert = this.currentMetrics.alerts.find(a => a.alertId === alertId);
            if (alert) {
                alert.acknowledged = true;
                this.emit('alert_acknowledged', alert);
                return true;
            }
        }
        return false;
    }
    /**
     * Start monitoring loop
     */
    startMonitoringLoop() {
        this.monitoringInterval = setInterval(async () => {
            if (!this.activeMonitoring)
                return;
            try {
                await this.monitorHedgeEffectiveness();
            }
            catch (error) {
                this.logger.error(`❌ Monitoring loop error: ${error}`);
            }
        }, this.config.monitoringInterval * 60 * 1000);
    }
}
exports.HedgingRiskIntegration = HedgingRiskIntegration;
// =====================================================
// EXPORT
// =====================================================
exports.default = HedgingRiskIntegration;

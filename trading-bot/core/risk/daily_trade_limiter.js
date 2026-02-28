"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🚀 [PRODUCTION-API]
 * Daily Trade Limiter - Enterprise-Grade Overtrading Protection
 *
 * Implements comprehensive daily trade frequency controls with:
 * - Hard limit enforcement (max trades per day)
 * - Adaptive cooldown periods
 * - Time-based reset mechanism
 * - Statistical tracking and alerts
 * - Multi-strategy coordination
 * - Emergency override capabilities
 *
 * Features:
 * - Configurable daily limits per strategy/symbol
 * - Automatic reset at market open
 * - Burst detection and prevention
 * - Trade velocity monitoring
 * - Alert integration
 * - Performance attribution
 *
 * @author Turbo Bot Team
 * @version 1.0.0
 * @since 2026-01-07
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyTradeLimiter = void 0;
exports.getDailyTradeLimiter = getDailyTradeLimiter;
exports.resetDailyTradeLimiter = resetDailyTradeLimiter;
const events_1 = require("events");
const logger_1 = require("../utils/logger");
// ============================================================================
// DAILY TRADE LIMITER CLASS
// ============================================================================
class DailyTradeLimiter extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        // Trade tracking
        this.dailyTrades = [];
        this.cooldownViolationCount = 0;
        // Statistics
        this.dailyStats = new Map();
        this.violations = [];
        // Initialize configuration with defaults
        this.config = {
            maxTradesPerDay: config.maxTradesPerDay || 5,
            maxTradesPerHour: config.maxTradesPerHour || 3,
            maxBurstTrades: config.maxBurstTrades || 2,
            burstWindowMs: config.burstWindowMs || 5 * 60 * 1000, // 5 minutes
            strategyLimits: config.strategyLimits || new Map(),
            symbolLimits: config.symbolLimits || new Map(),
            resetTimeUTC: config.resetTimeUTC || "00:00",
            resetOnMarketOpen: config.resetOnMarketOpen || false,
            marketOpenTimeUTC: config.marketOpenTimeUTC || "09:30",
            enableCooldown: config.enableCooldown !== false,
            cooldownDurationMs: config.cooldownDurationMs || 60 * 60 * 1000, // 1 hour
            adaptiveCooldown: config.adaptiveCooldown !== false,
            enableAlerts: config.enableAlerts !== false,
            alertThreshold: config.alertThreshold || 0.8,
            criticalThreshold: config.criticalThreshold || 0.95,
            allowEmergencyOverride: config.allowEmergencyOverride || false,
            emergencyOverrideCode: config.emergencyOverrideCode
        };
        this.logger = new logger_1.Logger();
        this.currentDayDate = this.getCurrentDateString();
        this.lastResetTime = new Date();
        this.logger.info('🚦 Daily Trade Limiter initialized', {
            maxTradesPerDay: this.config.maxTradesPerDay,
            maxTradesPerHour: this.config.maxTradesPerHour,
            resetTime: this.config.resetTimeUTC
        });
        // Initialize automatic reset
        this.initializeResetSchedule();
        // Initialize statistics for current day
        this.initializeDailyStats();
    }
    /**
     * 🔍 CHECK TRADE LIMIT
     * Main method to check if a trade is allowed
     */
    async checkTradeLimit(symbol, strategyId, emergencyOverrideCode) {
        // Check if we need to reset (new day)
        this.checkAndResetIfNeeded();
        // Check cooldown first
        if (this.isCooldownActive()) {
            return {
                allowed: false,
                reason: 'Trading cooldown active',
                currentCount: this.dailyTrades.length,
                limit: this.config.maxTradesPerDay,
                percentUsed: (this.dailyTrades.length / this.config.maxTradesPerDay) * 100,
                cooldownActive: true,
                cooldownEndsAt: this.cooldownEndTime,
                suggestions: [
                    `Cooldown ends at ${this.cooldownEndTime?.toLocaleTimeString()}`,
                    'Wait for cooldown to expire or use emergency override'
                ]
            };
        }
        // Check emergency override
        if (emergencyOverrideCode && this.validateEmergencyOverride(emergencyOverrideCode)) {
            this.logger.warn('⚠️ Emergency override activated for trade', { symbol, strategyId });
            return {
                allowed: true,
                reason: 'Emergency override',
                currentCount: this.dailyTrades.length,
                limit: this.config.maxTradesPerDay,
                percentUsed: (this.dailyTrades.length / this.config.maxTradesPerDay) * 100,
                cooldownActive: false
            };
        }
        // Check daily limit
        const dailyLimitCheck = this.checkDailyLimit();
        if (!dailyLimitCheck.allowed) {
            this.recordViolation('DAILY_LIMIT', { symbol, strategyId });
            return dailyLimitCheck;
        }
        // Check hourly limit
        const hourlyLimitCheck = this.checkHourlyLimit();
        if (!hourlyLimitCheck.allowed) {
            this.recordViolation('HOURLY_LIMIT', { symbol, strategyId });
            return hourlyLimitCheck;
        }
        // Check burst limit
        const burstLimitCheck = this.checkBurstLimit();
        if (!burstLimitCheck.allowed) {
            this.recordViolation('BURST_LIMIT', { symbol, strategyId });
            return burstLimitCheck;
        }
        // Check strategy-specific limit
        const strategyLimitCheck = this.checkStrategyLimit(strategyId);
        if (!strategyLimitCheck.allowed) {
            this.recordViolation('STRATEGY_LIMIT', { symbol, strategyId });
            return strategyLimitCheck;
        }
        // Check symbol-specific limit
        const symbolLimitCheck = this.checkSymbolLimit(symbol);
        if (!symbolLimitCheck.allowed) {
            this.recordViolation('SYMBOL_LIMIT', { symbol, strategyId });
            return symbolLimitCheck;
        }
        // Check alert thresholds
        this.checkAlertThresholds(dailyLimitCheck.percentUsed);
        // All checks passed
        return dailyLimitCheck;
    }
    /**
     * 📝 RECORD TRADE
     * Record a successful trade execution
     */
    recordTrade(trade) {
        const tradeRecord = {
            id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            ...trade
        };
        this.dailyTrades.push(tradeRecord);
        // Update statistics
        this.updateDailyStats(tradeRecord);
        // Emit event
        this.emit('tradeRecorded', tradeRecord);
        this.logger.info('✅ Trade recorded', {
            id: tradeRecord.id,
            symbol: trade.symbol,
            strategy: trade.strategyId,
            dailyCount: this.dailyTrades.length,
            limit: this.config.maxTradesPerDay
        });
    }
    /**
     * 🔄 CHECK DAILY LIMIT
     */
    checkDailyLimit() {
        const currentCount = this.dailyTrades.length;
        const limit = this.config.maxTradesPerDay;
        const percentUsed = (currentCount / limit) * 100;
        return {
            allowed: currentCount < limit,
            reason: currentCount >= limit ? `Daily limit of ${limit} trades reached` : undefined,
            currentCount,
            limit,
            percentUsed,
            cooldownActive: false,
            suggestions: currentCount >= limit ? [
                'Wait until daily reset',
                `Reset time: ${this.config.resetTimeUTC} UTC`,
                'Consider using emergency override if critical'
            ] : undefined
        };
    }
    /**
     * ⏱️ CHECK HOURLY LIMIT
     */
    checkHourlyLimit() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentTrades = this.dailyTrades.filter(t => t.timestamp >= oneHourAgo);
        const currentCount = recentTrades.length;
        const limit = this.config.maxTradesPerHour;
        const percentUsed = (currentCount / limit) * 100;
        return {
            allowed: currentCount < limit,
            reason: currentCount >= limit ? `Hourly limit of ${limit} trades reached` : undefined,
            currentCount,
            limit,
            percentUsed,
            cooldownActive: false,
            suggestions: currentCount >= limit ? [
                'Wait at least 1 hour before next trade',
                'Reduce trade frequency'
            ] : undefined
        };
    }
    /**
     * 💥 CHECK BURST LIMIT
     */
    checkBurstLimit() {
        const burstWindowStart = new Date(Date.now() - this.config.burstWindowMs);
        const burstTrades = this.dailyTrades.filter(t => t.timestamp >= burstWindowStart);
        const currentCount = burstTrades.length;
        const limit = this.config.maxBurstTrades;
        const percentUsed = (currentCount / limit) * 100;
        if (currentCount >= limit) {
            // Trigger cooldown on burst detection
            if (this.config.enableCooldown) {
                this.activateCooldown();
            }
        }
        return {
            allowed: currentCount < limit,
            reason: currentCount >= limit ? `Burst limit of ${limit} trades in ${this.config.burstWindowMs / 60000} minutes reached` : undefined,
            currentCount,
            limit,
            percentUsed,
            cooldownActive: this.isCooldownActive(),
            cooldownEndsAt: this.cooldownEndTime,
            suggestions: currentCount >= limit ? [
                'Slow down trading pace',
                'Wait for burst window to clear',
                'Review strategy for excessive trading signals'
            ] : undefined
        };
    }
    /**
     * 📊 CHECK STRATEGY LIMIT
     */
    checkStrategyLimit(strategyId) {
        const strategyLimit = this.config.strategyLimits?.get(strategyId);
        if (!strategyLimit) {
            return {
                allowed: true,
                currentCount: 0,
                limit: Infinity,
                percentUsed: 0,
                cooldownActive: false
            };
        }
        const strategyTrades = this.dailyTrades.filter(t => t.strategyId === strategyId);
        const currentCount = strategyTrades.length;
        const percentUsed = (currentCount / strategyLimit) * 100;
        return {
            allowed: currentCount < strategyLimit,
            reason: currentCount >= strategyLimit ? `Strategy '${strategyId}' daily limit of ${strategyLimit} trades reached` : undefined,
            currentCount,
            limit: strategyLimit,
            percentUsed,
            cooldownActive: false
        };
    }
    /**
     * 🎯 CHECK SYMBOL LIMIT
     */
    checkSymbolLimit(symbol) {
        const symbolLimit = this.config.symbolLimits?.get(symbol);
        if (!symbolLimit) {
            return {
                allowed: true,
                currentCount: 0,
                limit: Infinity,
                percentUsed: 0,
                cooldownActive: false
            };
        }
        const symbolTrades = this.dailyTrades.filter(t => t.symbol === symbol);
        const currentCount = symbolTrades.length;
        const percentUsed = (currentCount / symbolLimit) * 100;
        return {
            allowed: currentCount < symbolLimit,
            reason: currentCount >= symbolLimit ? `Symbol '${symbol}' daily limit of ${symbolLimit} trades reached` : undefined,
            currentCount,
            limit: symbolLimit,
            percentUsed,
            cooldownActive: false
        };
    }
    /**
     * ❄️ COOLDOWN MANAGEMENT
     */
    isCooldownActive() {
        if (!this.cooldownEndTime)
            return false;
        return new Date() < this.cooldownEndTime;
    }
    activateCooldown() {
        this.cooldownViolationCount++;
        // Calculate cooldown duration (adaptive if enabled)
        let duration = this.config.cooldownDurationMs;
        if (this.config.adaptiveCooldown) {
            // Increase cooldown by 50% for each repeated violation
            duration *= Math.pow(1.5, this.cooldownViolationCount - 1);
        }
        this.cooldownEndTime = new Date(Date.now() + duration);
        this.logger.warn('❄️ Trading cooldown activated', {
            duration: `${duration / 60000} minutes`,
            endsAt: this.cooldownEndTime.toISOString(),
            violationCount: this.cooldownViolationCount
        });
        this.emit('cooldownActivated', {
            duration,
            endsAt: this.cooldownEndTime,
            violationCount: this.cooldownViolationCount
        });
    }
    /**
     * 🚨 ALERT MANAGEMENT
     */
    checkAlertThresholds(percentUsed) {
        if (!this.config.enableAlerts)
            return;
        const threshold = percentUsed / 100;
        if (threshold >= this.config.criticalThreshold) {
            this.logger.error('🚨 CRITICAL: Daily trade limit almost exhausted', {
                percentUsed: percentUsed.toFixed(1),
                remaining: this.config.maxTradesPerDay - this.dailyTrades.length
            });
            this.emit('criticalThresholdReached', {
                percentUsed,
                remaining: this.config.maxTradesPerDay - this.dailyTrades.length
            });
        }
        else if (threshold >= this.config.alertThreshold) {
            this.logger.warn('⚠️ Warning: Daily trade limit threshold reached', {
                percentUsed: percentUsed.toFixed(1),
                remaining: this.config.maxTradesPerDay - this.dailyTrades.length
            });
            this.emit('alertThresholdReached', {
                percentUsed,
                remaining: this.config.maxTradesPerDay - this.dailyTrades.length
            });
        }
    }
    /**
     * 📊 VIOLATION TRACKING
     */
    recordViolation(type, attemptedTrade) {
        const violation = {
            timestamp: new Date(),
            type,
            attemptedTrade,
            currentCount: this.dailyTrades.length,
            limit: this.config.maxTradesPerDay,
            severity: this.calculateViolationSeverity(type)
        };
        this.violations.push(violation);
        // Emit violation event
        this.emit('limitViolation', violation);
        // Activate cooldown for severe violations
        if (violation.severity === 'HIGH' || violation.severity === 'CRITICAL') {
            if (this.config.enableCooldown) {
                this.activateCooldown();
            }
        }
    }
    calculateViolationSeverity(type) {
        switch (type) {
            case 'BURST_LIMIT':
                return 'CRITICAL';
            case 'DAILY_LIMIT':
                return 'HIGH';
            case 'HOURLY_LIMIT':
                return 'MEDIUM';
            case 'STRATEGY_LIMIT':
            case 'SYMBOL_LIMIT':
                return 'LOW';
            default:
                return 'MEDIUM';
        }
    }
    /**
     * 🔄 RESET MANAGEMENT
     */
    checkAndResetIfNeeded() {
        const currentDate = this.getCurrentDateString();
        if (currentDate !== this.currentDayDate) {
            this.logger.info('📅 New trading day detected, resetting counters', {
                previousDate: this.currentDayDate,
                newDate: currentDate
            });
            this.resetDailyCounters();
        }
    }
    resetDailyCounters() {
        // Save current day stats before reset
        if (this.dailyTrades.length > 0) {
            const stats = this.getDailyStats();
            this.dailyStats.set(this.currentDayDate, stats);
        }
        // Reset counters
        this.dailyTrades = [];
        this.cooldownViolationCount = 0;
        this.cooldownEndTime = undefined;
        this.currentDayDate = this.getCurrentDateString();
        this.lastResetTime = new Date();
        // Initialize stats for new day
        this.initializeDailyStats();
        this.logger.info('✅ Daily trade counters reset', {
            date: this.currentDayDate
        });
        this.emit('dailyReset', {
            date: this.currentDayDate,
            resetTime: this.lastResetTime
        });
    }
    initializeResetSchedule() {
        // Calculate next reset time
        const resetTime = this.config.resetOnMarketOpen
            ? this.config.marketOpenTimeUTC
            : this.config.resetTimeUTC;
        const [hours, minutes] = resetTime.split(':').map(Number);
        // Schedule daily reset
        const now = new Date();
        const nextReset = new Date();
        nextReset.setUTCHours(hours, minutes, 0, 0);
        // If reset time has passed today, schedule for tomorrow
        if (nextReset <= now) {
            nextReset.setDate(nextReset.getDate() + 1);
        }
        const msUntilReset = nextReset.getTime() - now.getTime();
        this.logger.info('⏰ Daily reset scheduled', {
            nextResetTime: nextReset.toISOString(),
            minutesUntilReset: Math.round(msUntilReset / 60000)
        });
        // Set timeout for first reset
        setTimeout(() => {
            this.resetDailyCounters();
            // Then set interval for subsequent resets (every 24 hours)
            this.resetInterval = setInterval(() => {
                this.resetDailyCounters();
            }, 24 * 60 * 60 * 1000);
        }, msUntilReset);
    }
    /**
     * 📊 STATISTICS & REPORTING
     */
    initializeDailyStats() {
        // Initialize empty stats for current day
        // Stats will be updated as trades are recorded
    }
    updateDailyStats(trade) {
        // Stats are calculated on-demand in getDailyStats()
        // This method is kept for future real-time stat updates
    }
    getDailyStats() {
        const tradesByStrategy = new Map();
        const tradesBySymbol = new Map();
        const tradesByHour = new Map();
        let totalInterval = 0;
        let maxHourlyTrades = 0;
        let burstEvents = 0;
        // Calculate statistics
        this.dailyTrades.forEach((trade, index) => {
            // Strategy stats
            tradesByStrategy.set(trade.strategyId, (tradesByStrategy.get(trade.strategyId) || 0) + 1);
            // Symbol stats
            tradesBySymbol.set(trade.symbol, (tradesBySymbol.get(trade.symbol) || 0) + 1);
            // Hour stats
            const hour = trade.timestamp.getUTCHours();
            tradesByHour.set(hour, (tradesByHour.get(hour) || 0) + 1);
            // Interval calculation
            if (index > 0) {
                const prevTrade = this.dailyTrades[index - 1];
                const intervalMs = trade.timestamp.getTime() - prevTrade.timestamp.getTime();
                totalInterval += intervalMs;
            }
        });
        // Calculate average trade interval
        const averageTradeInterval = this.dailyTrades.length > 1
            ? totalInterval / (this.dailyTrades.length - 1) / 60000 // Convert to minutes
            : 0;
        // Calculate peak trade velocity
        tradesByHour.forEach(count => {
            maxHourlyTrades = Math.max(maxHourlyTrades, count);
        });
        // Count burst events
        burstEvents = this.violations.filter(v => v.type === 'BURST_LIMIT').length;
        return {
            date: this.currentDayDate,
            totalTrades: this.dailyTrades.length,
            tradesByStrategy,
            tradesBySymbol,
            tradesByHour,
            burstEvents,
            limitViolations: this.violations.length,
            emergencyOverrides: this.dailyTrades.filter(t => t.isEmergencyOverride).length,
            averageTradeInterval,
            peakTradeVelocity: maxHourlyTrades
        };
    }
    getViolationHistory() {
        return [...this.violations];
    }
    getHistoricalStats(days = 30) {
        const stats = [];
        // Get stats from stored history
        this.dailyStats.forEach((stat, date) => {
            stats.push(stat);
        });
        // Add current day stats
        stats.push(this.getDailyStats());
        // Sort by date and limit to requested days
        return stats
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, days);
    }
    /**
     * 🆘 EMERGENCY OVERRIDE
     */
    validateEmergencyOverride(code) {
        if (!this.config.allowEmergencyOverride) {
            return false;
        }
        if (!this.config.emergencyOverrideCode) {
            // If no code is set, any code is accepted (development mode)
            return true;
        }
        return code === this.config.emergencyOverrideCode;
    }
    /**
     * 🛠️ UTILITY METHODS
     */
    getCurrentDateString() {
        return new Date().toISOString().split('T')[0];
    }
    /**
     * 🔧 CONFIGURATION UPDATES
     */
    updateConfig(updates) {
        Object.assign(this.config, updates);
        this.logger.info('⚙️ Daily Trade Limiter configuration updated', updates);
        this.emit('configUpdated', this.config);
    }
    setStrategyLimit(strategyId, limit) {
        if (!this.config.strategyLimits) {
            this.config.strategyLimits = new Map();
        }
        this.config.strategyLimits.set(strategyId, limit);
        this.logger.info(`📊 Strategy limit set: ${strategyId} = ${limit} trades/day`);
    }
    setSymbolLimit(symbol, limit) {
        if (!this.config.symbolLimits) {
            this.config.symbolLimits = new Map();
        }
        this.config.symbolLimits.set(symbol, limit);
        this.logger.info(`🎯 Symbol limit set: ${symbol} = ${limit} trades/day`);
    }
    /**
     * 🧹 CLEANUP
     */
    destroy() {
        if (this.resetInterval) {
            clearInterval(this.resetInterval);
        }
        this.removeAllListeners();
        this.logger.info('🛑 Daily Trade Limiter destroyed');
    }
}
exports.DailyTradeLimiter = DailyTradeLimiter;
// ============================================================================
// SINGLETON FACTORY
// ============================================================================
let globalDailyTradeLimiter = null;
function getDailyTradeLimiter(config) {
    if (!globalDailyTradeLimiter) {
        globalDailyTradeLimiter = new DailyTradeLimiter(config);
    }
    return globalDailyTradeLimiter;
}
function resetDailyTradeLimiter() {
    if (globalDailyTradeLimiter) {
        globalDailyTradeLimiter.destroy();
        globalDailyTradeLimiter = null;
    }
}

'use strict';
/**
 * @module MonitoringBridge
 * @description Health checks, Prometheus metrics, uptime tracking.
 * Outputs /health in format expected by dashboard.html
 */

class MonitoringBridge {
    constructor(config) {
        this.config = config;
        this.startTime = Date.now();
        this.healthStatus = {
            status: 'healthy', version: '6.0.0-ENTERPRISE-MODULAR',
            instance: config.instanceId, lastUpdate: Date.now(),
            components: {
                database: false,
                strategies: false,
                ml: false,
                monitoring: false,
                riskManager: true,
                portfolio: true,
                circuitBreaker: true,
            },
            metrics: {},
            uptime: 0,
        };
    }

    getUptime() { return Math.floor((Date.now() - this.startTime) / 1000); }

    getUptimeString() {
        const s = this.getUptime();
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
        return h + 'h ' + m + 'm ' + (s % 60) + 's';
    }

    updateHealth(pm, rm, ml, isRunning) {
        this.healthStatus.lastUpdate = Date.now();
        this.healthStatus.uptime = this.getUptime();
        const p = pm.getPortfolio();
        const cb = rm.getCircuitBreakerStatus();

        // Components status ??? dashboard reads data.components
        this.healthStatus.components.portfolio = true;
        this.healthStatus.components.riskManager = true;
        this.healthStatus.components.circuitBreaker = !cb.isTripped;
        if (ml) this.healthStatus.components.ml = true;

        // Determine overall health from components
        const comps = this.healthStatus.components;
        const total = Object.keys(comps).length;
        const healthy = Object.values(comps).filter(function(v) { return v === true; }).length;
        if (healthy >= total * 0.8) this.healthStatus.status = 'healthy';
        else if (healthy >= total * 0.5) this.healthStatus.status = 'degraded';
        else this.healthStatus.status = 'unhealthy';
        if (!isRunning) this.healthStatus.status = 'stopped';

        // Metrics wrapper ??? dashboard reads data.metrics.totalValue etc
        this.healthStatus.metrics = {
            totalValue: p.totalValue,
            unrealizedPnL: p.unrealizedPnL,
            realizedPnL: p.realizedPnL,
            drawdown: p.drawdown,
            peakValue: p.peakValue,
            winRate: p.winRate / 100,
            totalTrades: p.totalTrades,
            successfulTrades: p.successfulTrades,
            failedTrades: p.failedTrades,
            avgTradeReturn: p.avgTradeReturn,
            maxDrawdownValue: p.maxDrawdownValue,
            uptime: this.getUptime(),
            currentPositions: pm.positionCount,
            portfolioValue: p.totalValue,
            memoryUsage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
            cpuUsage: process.cpuUsage().user / 1000000,
            mlLearningPhase: ml ? ml.mlLearningPhase : 'disabled',
            mlConfidenceThreshold: ml ? ml.mlConfidenceThreshold : 0,
            mlTradingCount: ml ? ml.mlTradingCount : 0,
            mlAverageReward: ml ? (ml.mlPerformance.average_reward || 0) : 0,
            mlExplorationRate: ml ? (ml.mlPerformance.exploration_rate || 1.0) : 1.0,
            circuitBreakerTripped: cb.isTripped,
            circuitBreakerTripCount: cb.tripCount,
            consecutiveLosses: cb.consecutiveLosses,
            softPauseActive: cb.softPauseActive,
            dailyTradeCount: cb.dailyTradeCount,
        };

        // Also keep flat fields for backward compat with other API consumers
        this.healthStatus.totalValue = p.totalValue;
        this.healthStatus.drawdown = p.drawdown;
        this.healthStatus.totalTrades = p.totalTrades;
        this.healthStatus.winRate = p.winRate;
        this.healthStatus.unrealizedPnL = p.unrealizedPnL;
        this.healthStatus.realizedPnL = p.realizedPnL;
        this.healthStatus.circuitBreaker = cb;
    }

    setComponent(name, status) { this.healthStatus.components[name] = status; }

    getHealthStatus() { return this.healthStatus; }

    generatePrometheusMetrics(pm, rm) {
        const p = pm.getPortfolio();
        const cb = rm.getCircuitBreakerStatus();
        return [
            '# HELP trading_bot_portfolio_value Current portfolio value',
            '# TYPE trading_bot_portfolio_value gauge',
            'trading_bot_portfolio_value{instance="' + this.config.instanceId + '"} ' + p.totalValue.toFixed(2),
            '# HELP trading_bot_total_trades Total number of trades',
            '# TYPE trading_bot_total_trades counter',
            'trading_bot_total_trades{instance="' + this.config.instanceId + '"} ' + p.totalTrades,
            '# HELP trading_bot_win_rate Current win rate',
            '# TYPE trading_bot_win_rate gauge',
            'trading_bot_win_rate{instance="' + this.config.instanceId + '"} ' + p.winRate.toFixed(4),
            '# HELP trading_bot_drawdown Current drawdown',
            '# TYPE trading_bot_drawdown gauge',
            'trading_bot_drawdown{instance="' + this.config.instanceId + '"} ' + p.drawdown.toFixed(4),
            '# HELP trading_bot_realized_pnl Realized PnL',
            '# TYPE trading_bot_realized_pnl gauge',
            'trading_bot_realized_pnl{instance="' + this.config.instanceId + '"} ' + p.realizedPnL.toFixed(2),
            '# HELP trading_bot_unrealized_pnl Unrealized PnL',
            '# TYPE trading_bot_unrealized_pnl gauge',
            'trading_bot_unrealized_pnl{instance="' + this.config.instanceId + '"} ' + p.unrealizedPnL.toFixed(2),
            '# HELP trading_bot_circuit_breaker Circuit breaker status',
            '# TYPE trading_bot_circuit_breaker gauge',
            'trading_bot_circuit_breaker{instance="' + this.config.instanceId + '"} ' + (cb.isTripped ? 1 : 0),
            '# HELP trading_bot_uptime_seconds Bot uptime',
            '# TYPE trading_bot_uptime_seconds gauge',
            'trading_bot_uptime_seconds{instance="' + this.config.instanceId + '"} ' + this.getUptime(),
        ].join('\n');
    }
}

module.exports = { MonitoringBridge };

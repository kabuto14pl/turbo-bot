"use strict";
/**
 * 🎯 MONITORING SYSTEM - KROK 5 MASTER CONTROLLER
 * Enterprise-grade monitoring orchestration
 *
 * Integrates all monitoring components:
 * - PerformanceMonitor (auto-alerts)
 * - MLRetrainManager (auto-retrain)
 * - MetricsCollector (real-time metrics)
 * - AlertManager (multi-channel alerts)
 * - PrometheusExporter (metrics export)
 * - HealthCheckSystem (component health)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringSystem = void 0;
const events_1 = require("events");
const performance_monitor_1 = require("./performance_monitor");
const ml_retrain_manager_1 = require("./ml_retrain_manager");
const metrics_collector_1 = require("./metrics_collector");
const alert_manager_1 = require("./alert_manager");
const prometheus_exporter_1 = require("./prometheus_exporter");
const health_check_system_1 = require("./health_check_system");
class MonitoringSystem extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.is_running = false;
        this.config = {
            performance_monitoring_enabled: true,
            ml_retrain_enabled: true,
            retrain_interval_trades: 50,
            metrics_collection_enabled: true,
            alerts_enabled: true,
            prometheus_enabled: true,
            prometheus_port: 9090,
            health_checks_enabled: true,
            health_check_interval_ms: 30000,
            ...config
        };
    }
    /**
     * 🚀 Initialize all monitoring components
     */
    async initialize() {
        console.log('🚀 Initializing Monitoring System...');
        // 1. Performance Monitor
        if (this.config.performance_monitoring_enabled) {
            this.performance_monitor = new performance_monitor_1.PerformanceMonitor({
                min_win_rate: 0.50,
                min_sharpe_ratio: 1.0,
                max_drawdown: 0.10,
                max_consecutive_losses: 3,
                min_ml_confidence: 0.30,
                check_interval_ms: 60000,
                auto_pause_on_critical: true
            });
            // Forward performance alerts to alert manager
            this.performance_monitor.on('alert:generated', (alert) => {
                this.handlePerformanceAlert(alert);
            });
            console.log('  ✅ PerformanceMonitor initialized');
        }
        // 2. ML Retrain Manager
        if (this.config.ml_retrain_enabled) {
            this.ml_retrain_manager = new ml_retrain_manager_1.MLRetrainManager({
                retrain_interval_trades: this.config.retrain_interval_trades,
                validation_window: 20,
                max_performance_drop: 0.10,
                auto_rollback: true
            });
            // Forward retrain events to alert manager
            this.ml_retrain_manager.on('retrain:needed', (data) => {
                this.alert_manager?.sendAlert(alert_manager_1.AlertLevel.INFO, 'ML Retrain Needed', `Retrain triggered after ${data.trades_since_last} trades`);
            });
            this.ml_retrain_manager.on('retrain:completed', (result) => {
                const level = result.success && !result.rolled_back
                    ? alert_manager_1.AlertLevel.INFO
                    : alert_manager_1.AlertLevel.WARNING;
                this.alert_manager?.sendAlert(level, 'ML Retrain Completed', result.success
                    ? `Performance change: ${(result.performance_change * 100).toFixed(1)}%`
                    : `Retrain failed - rolled back`);
            });
            console.log('  ✅ MLRetrainManager initialized');
        }
        // 3. Metrics Collector
        if (this.config.metrics_collection_enabled) {
            this.metrics_collector = new metrics_collector_1.MetricsCollector();
            console.log('  ✅ MetricsCollector initialized');
        }
        // 4. Alert Manager
        if (this.config.alerts_enabled) {
            this.alert_manager = new alert_manager_1.AlertManager({
                email_enabled: process.env.EMAIL_ENABLED === 'true',
                webhook_enabled: process.env.WEBHOOK_ENABLED === 'true',
                rate_limit_ms: 300000,
                deduplicate_window_ms: 600000
            });
            console.log('  ✅ AlertManager initialized');
        }
        // 5. Prometheus Exporter
        if (this.config.prometheus_enabled) {
            this.prometheus_exporter = new prometheus_exporter_1.PrometheusExporter();
            console.log('  ✅ PrometheusExporter initialized');
        }
        // 6. Health Check System
        if (this.config.health_checks_enabled) {
            this.health_check_system = new health_check_system_1.HealthCheckSystem();
            // Forward health issues to alert manager
            this.health_check_system.on('health:checked', (result) => {
                if (result.overall_status === health_check_system_1.HealthStatus.UNHEALTHY) {
                    this.alert_manager?.sendAlert(alert_manager_1.AlertLevel.CRITICAL, 'System Health Critical', `Unhealthy components: ${result.recommendations.join(', ')}`);
                }
                else if (result.overall_status === health_check_system_1.HealthStatus.DEGRADED) {
                    this.alert_manager?.sendAlert(alert_manager_1.AlertLevel.WARNING, 'System Health Degraded', `Performance issues detected`);
                }
            });
            console.log('  ✅ HealthCheckSystem initialized');
        }
        console.log('✅ Monitoring System initialized successfully\n');
    }
    /**
     * 🎬 Start monitoring
     */
    startMonitoring() {
        if (this.is_running) {
            console.log('⚠️ Monitoring already running');
            return;
        }
        console.log('🎬 Starting Monitoring System...');
        // Start performance monitoring
        if (this.performance_monitor) {
            this.performance_monitor.startMonitoring();
        }
        // Start health checks
        if (this.health_check_system) {
            this.health_check_system.startMonitoring(this.config.health_check_interval_ms);
        }
        this.is_running = true;
        console.log('✅ Monitoring System started\n');
        this.emit('monitoring:started');
    }
    /**
     * ⏹️ Stop monitoring
     */
    stopMonitoring() {
        console.log('⏹️ Stopping Monitoring System...');
        if (this.performance_monitor) {
            this.performance_monitor.stopMonitoring();
        }
        if (this.health_check_system) {
            this.health_check_system.stopMonitoring();
        }
        this.is_running = false;
        console.log('✅ Monitoring System stopped\n');
        this.emit('monitoring:stopped');
    }
    /**
     * 📊 Handle trade event (main integration point)
     */
    async recordTrade(trade, portfolio, mlAdapter) {
        // 1. Record in performance monitor
        if (this.performance_monitor) {
            await this.performance_monitor.recordTrade(trade);
        }
        // 2. Record in metrics collector
        if (this.metrics_collector) {
            this.metrics_collector.recordTrade(trade);
            if (trade.ml_confidence !== undefined) {
                this.metrics_collector.recordMLPrediction(trade.ml_confidence, trade.ml_latency_ms || 0, trade.pnl);
            }
            if (portfolio.current_drawdown !== undefined) {
                this.metrics_collector.recordRiskMetrics(portfolio.current_drawdown, portfolio.volatility || 0.01);
            }
        }
        // 3. Update Prometheus metrics
        if (this.prometheus_exporter) {
            this.prometheus_exporter.updateFromTrade(trade, portfolio);
        }
        // 4. Record for ML retrain manager
        if (this.ml_retrain_manager) {
            this.ml_retrain_manager.recordTrade(trade);
            // Check if retrain needed
            if (mlAdapter) {
                const retrain_event = this.ml_retrain_manager.listeners('retrain:needed').length > 0;
                if (retrain_event) {
                    const result = await this.ml_retrain_manager.performRetrain(mlAdapter);
                    // Alert on retrain result
                    if (!result.success) {
                        await this.alert_manager?.sendAlert(alert_manager_1.AlertLevel.WARNING, 'ML Retrain Failed', result.error || 'Unknown error');
                    }
                }
            }
        }
    }
    /**
     * 🚨 Handle performance alert
     */
    async handlePerformanceAlert(alert) {
        if (!this.alert_manager)
            return;
        // Map performance alert level to AlertManager level
        const level_map = {
            'INFO': alert_manager_1.AlertLevel.INFO,
            'WARNING': alert_manager_1.AlertLevel.WARNING,
            'CRITICAL': alert_manager_1.AlertLevel.CRITICAL,
            'EMERGENCY': alert_manager_1.AlertLevel.EMERGENCY
        };
        const alert_level = level_map[alert.level] || alert_manager_1.AlertLevel.INFO;
        await this.alert_manager.sendAlert(alert_level, alert.metric, alert.message, {
            current_value: alert.current_value,
            threshold: alert.threshold_value,
            recommended_action: alert.recommended_action
        });
    }
    /**
     * 📊 Get comprehensive monitoring summary
     */
    getSummary() {
        return {
            monitoring_active: this.is_running,
            timestamp: new Date().toISOString(),
            performance: this.performance_monitor?.getSummary() || null,
            ml_retrain: this.ml_retrain_manager?.getStatistics() || null,
            metrics: this.metrics_collector?.getSummary() || null,
            alerts: this.alert_manager?.getStatistics() || null,
            health: this.health_check_system?.getSummary() || null,
            prometheus: this.prometheus_exporter?.getSummary() || null
        };
    }
    /**
     * 📈 Export Prometheus metrics
     */
    exportPrometheusMetrics() {
        return this.prometheus_exporter?.exportMetrics() || '';
    }
    /**
     * 🏥 Get health status
     */
    async getHealthStatus() {
        if (!this.health_check_system) {
            return { status: 'disabled' };
        }
        return await this.health_check_system.performHealthCheck();
    }
    /**
     * 📋 Get component instances (for direct access if needed)
     */
    getComponents() {
        return {
            performance_monitor: this.performance_monitor,
            ml_retrain_manager: this.ml_retrain_manager,
            metrics_collector: this.metrics_collector,
            alert_manager: this.alert_manager,
            prometheus_exporter: this.prometheus_exporter,
            health_check_system: this.health_check_system
        };
    }
}
exports.MonitoringSystem = MonitoringSystem;

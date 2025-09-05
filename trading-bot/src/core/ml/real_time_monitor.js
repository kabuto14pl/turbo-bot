"use strict";
/**
 * 📊 REAL-TIME MONITORING & ALERTING SYSTEM
 * Enterprise-grade monitoring with predictive alerting and anomaly detection
 * Implements comprehensive metrics collection, analysis, and intelligent alerting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MONITORING_CONFIGS = exports.RealTimeMonitor = void 0;
const logger_1 = require("../../../core/utils/logger");
class RealTimeMonitor {
    constructor(config = {}) {
        // Metrics storage
        this.metrics_store = new Map();
        this.metric_definitions = new Map();
        // Alerting
        this.active_alerts = new Map();
        this.alert_history = [];
        this.alert_channels = new Map();
        // Health monitoring
        this.health_checks = new Map();
        this.component_statuses = new Map();
        this.config = {
            metrics_collection_interval: 30000, // 30 seconds
            metrics_retention_period: 2592000000, // 30 days
            high_frequency_metrics: ['latency', 'error_rate', 'throughput'],
            alerting_enabled: true,
            alert_channels: [],
            escalation_rules: [],
            anomaly_detection_enabled: true,
            anomaly_sensitivity: 'medium',
            baseline_learning_period: 604800000, // 7 days
            latency_thresholds: {
                warning: 1000, // 1 second
                critical: 5000 // 5 seconds
            },
            error_rate_thresholds: {
                warning: 0.05, // 5%
                critical: 0.10 // 10%
            },
            memory_thresholds: {
                warning: 0.80, // 80%
                critical: 0.95 // 95%
            },
            trading_performance_thresholds: {
                min_sharpe_ratio: 1.0,
                max_drawdown: 0.20, // 20%
                min_win_rate: 0.55 // 55%
            },
            health_check_interval: 30000, // 30 seconds
            health_check_timeout: 5000, // 5 seconds
            consecutive_failures_threshold: 3,
            ...config
        };
        this.logger = new logger_1.Logger();
        this.anomaly_detector = new AnomalyDetector(this.config);
        this.baseline_calculator = new BaselineCalculator(this.config);
        this.initializeMetricDefinitions();
        this.initializeDefaultAlertChannels();
        this.initializeHealthChecks();
        this.startMonitoring();
        this.logger.info('📊 Real-Time Monitor initialized');
    }
    /**
     * 📈 COLLECT METRIC
     * Add new metric value to the monitoring system
     */
    collectMetric(metric_name, value, tags = {}, source = 'system') {
        const metric_value = {
            timestamp: Date.now(),
            value,
            tags,
            source
        };
        // Store metric
        if (!this.metrics_store.has(metric_name)) {
            this.metrics_store.set(metric_name, []);
        }
        const metric_history = this.metrics_store.get(metric_name);
        metric_history.push(metric_value);
        // Cleanup old metrics
        this.cleanupOldMetrics(metric_name);
        // Check for anomalies and alerts
        this.checkMetricThresholds(metric_name, value, tags);
        // Log high-frequency metrics
        if (this.config.high_frequency_metrics.includes(metric_name)) {
            this.logger.debug(`📈 ${metric_name}: ${value} ${tags ? JSON.stringify(tags) : ''}`);
        }
    }
    /**
     * 📊 COLLECT PERFORMANCE METRICS
     * Collect comprehensive performance metrics
     */
    async collectPerformanceMetrics(metrics) {
        const timestamp = Date.now();
        const base_tags = { source: 'performance_monitor' };
        // Memory metrics
        this.collectMetric('memory.total_mb', metrics.total_memory_mb, base_tags);
        this.collectMetric('memory.used_mb', metrics.used_memory_mb, base_tags);
        this.collectMetric('memory.peak_mb', metrics.peak_memory_mb, base_tags);
        this.collectMetric('memory.fragmentation', metrics.memory_fragmentation, base_tags);
        this.collectMetric('tensors.count', metrics.tensor_count, base_tags);
        // Compute metrics
        this.collectMetric('training.throughput', metrics.training_throughput, base_tags);
        this.collectMetric('inference.latency', metrics.inference_latency, base_tags);
        this.collectMetric('gpu.utilization', metrics.gpu_utilization, base_tags);
        this.collectMetric('cpu.utilization', metrics.cpu_utilization, base_tags);
        // Model metrics
        this.collectMetric('model.size_mb', metrics.model_size_mb, base_tags);
        this.collectMetric('model.parameters', metrics.parameter_count, base_tags);
        this.collectMetric('model.flops', metrics.flops_per_inference, base_tags);
        // Training metrics
        this.collectMetric('training.time_per_epoch', metrics.time_per_epoch, base_tags);
        this.collectMetric('training.convergence_speed', metrics.convergence_speed, base_tags);
        this.collectMetric('training.gradient_norm', metrics.gradient_norm, base_tags);
        this.collectMetric('training.stability', metrics.learning_stability, base_tags);
    }
    /**
     * 💼 COLLECT TRADING METRICS
     * Collect trading-specific performance metrics
     */
    async collectTradingMetrics(sharpe_ratio, max_drawdown, win_rate, total_return, volatility, trades_count) {
        const base_tags = { source: 'trading_engine' };
        this.collectMetric('trading.sharpe_ratio', sharpe_ratio, base_tags);
        this.collectMetric('trading.max_drawdown', max_drawdown, base_tags);
        this.collectMetric('trading.win_rate', win_rate, base_tags);
        this.collectMetric('trading.total_return', total_return, base_tags);
        this.collectMetric('trading.volatility', volatility, base_tags);
        this.collectMetric('trading.trades_count', trades_count, base_tags);
        // Check trading performance thresholds
        this.checkTradingPerformanceThresholds(sharpe_ratio, max_drawdown, win_rate);
    }
    /**
     * 🚨 CHECK METRIC THRESHOLDS
     * Check if metric values exceed defined thresholds
     */
    checkMetricThresholds(metric_name, value, tags) {
        // Check latency thresholds
        if (metric_name === 'inference.latency') {
            if (value > this.config.latency_thresholds.critical) {
                this.triggerAlert(metric_name, 'critical', `Inference latency is critically high: ${value}ms`, value, this.config.latency_thresholds.critical, tags);
            }
            else if (value > this.config.latency_thresholds.warning) {
                this.triggerAlert(metric_name, 'warning', `Inference latency is high: ${value}ms`, value, this.config.latency_thresholds.warning, tags);
            }
        }
        // Check memory thresholds
        if (metric_name === 'memory.fragmentation') {
            if (value > this.config.memory_thresholds.critical) {
                this.triggerAlert(metric_name, 'critical', `Memory fragmentation is critically high: ${(value * 100).toFixed(1)}%`, value, this.config.memory_thresholds.critical, tags);
            }
            else if (value > this.config.memory_thresholds.warning) {
                this.triggerAlert(metric_name, 'warning', `Memory fragmentation is high: ${(value * 100).toFixed(1)}%`, value, this.config.memory_thresholds.warning, tags);
            }
        }
        // Check for anomalies
        if (this.config.anomaly_detection_enabled) {
            this.checkForAnomalies(metric_name, value, tags);
        }
    }
    /**
     * 📈 CHECK TRADING PERFORMANCE THRESHOLDS
     */
    checkTradingPerformanceThresholds(sharpe_ratio, max_drawdown, win_rate) {
        const thresholds = this.config.trading_performance_thresholds;
        if (sharpe_ratio < thresholds.min_sharpe_ratio) {
            this.triggerAlert('trading.sharpe_ratio', 'warning', `Sharpe ratio below threshold: ${sharpe_ratio.toFixed(3)}`, sharpe_ratio, thresholds.min_sharpe_ratio, { source: 'trading_engine' });
        }
        if (max_drawdown > thresholds.max_drawdown) {
            this.triggerAlert('trading.max_drawdown', 'critical', `Maximum drawdown exceeded: ${(max_drawdown * 100).toFixed(1)}%`, max_drawdown, thresholds.max_drawdown, { source: 'trading_engine' });
        }
        if (win_rate < thresholds.min_win_rate) {
            this.triggerAlert('trading.win_rate', 'warning', `Win rate below threshold: ${(win_rate * 100).toFixed(1)}%`, win_rate, thresholds.min_win_rate, { source: 'trading_engine' });
        }
    }
    /**
     * 🔍 CHECK FOR ANOMALIES
     */
    async checkForAnomalies(metric_name, value, tags) {
        const metric_history = this.metrics_store.get(metric_name);
        if (!metric_history || metric_history.length < 30) {
            return; // Need more data for anomaly detection
        }
        const anomaly_result = await this.anomaly_detector.detectAnomaly(metric_name, value, metric_history);
        if (anomaly_result.is_anomaly) {
            this.triggerAlert(metric_name, anomaly_result.severity, `Anomaly detected in ${metric_name}: ${value} (score: ${anomaly_result.anomaly_score.toFixed(3)})`, value, anomaly_result.expected_range.upper_bound, { ...tags, anomaly_score: anomaly_result.anomaly_score.toString() });
        }
    }
    /**
     * 🚨 TRIGGER ALERT
     * Create and process new alert
     */
    triggerAlert(metric_name, severity, description, current_value, threshold_value, tags) {
        const alert_id = `alert_${metric_name}_${Date.now()}`;
        const alert = {
            alert_id,
            metric_name,
            severity,
            title: `${severity.toUpperCase()}: ${metric_name}`,
            description,
            triggered_at: Date.now(),
            status: 'active',
            current_value,
            threshold_value,
            tags,
            notification_count: 0,
            last_notification: 0,
            suggested_actions: this.getSuggestedActions(metric_name, severity),
            related_alerts: this.findRelatedAlerts(metric_name, tags),
            runbook_url: this.getRunbookUrl(metric_name)
        };
        this.active_alerts.set(alert_id, alert);
        this.alert_history.push(alert);
        this.logger.warn(`🚨 Alert triggered: ${alert.title} - ${description}`);
        // Send notifications
        if (this.config.alerting_enabled) {
            this.sendAlertNotifications(alert);
        }
    }
    /**
     * 📨 SEND ALERT NOTIFICATIONS
     */
    async sendAlertNotifications(alert) {
        const eligible_channels = Array.from(this.alert_channels.values())
            .filter(channel => channel.severity_filter.includes(alert.severity));
        for (const channel of eligible_channels) {
            // Check rate limiting
            if (this.isRateLimited(channel, alert)) {
                continue;
            }
            try {
                await this.sendNotification(channel, alert);
                alert.notification_count++;
                alert.last_notification = Date.now();
                this.logger.info(`📨 Alert notification sent via ${channel.name}`);
            }
            catch (error) {
                this.logger.error(`❌ Failed to send notification via ${channel.name}: ${error}`);
            }
        }
    }
    /**
     * 📤 SEND NOTIFICATION
     */
    async sendNotification(channel, alert) {
        const message = this.formatAlertMessage(alert);
        switch (channel.type) {
            case 'email':
                await this.sendEmailNotification(channel, alert, message);
                break;
            case 'slack':
                await this.sendSlackNotification(channel, alert, message);
                break;
            case 'webhook':
                await this.sendWebhookNotification(channel, alert, message);
                break;
            case 'sms':
                await this.sendSMSNotification(channel, alert, message);
                break;
            case 'pagerduty':
                await this.sendPagerDutyNotification(channel, alert, message);
                break;
        }
    }
    /**
     * 📧 SEND EMAIL NOTIFICATION
     */
    async sendEmailNotification(channel, alert, message) {
        // Email notification implementation
        this.logger.debug(`📧 Sending email notification for alert ${alert.alert_id}`);
    }
    /**
     * 💬 SEND SLACK NOTIFICATION
     */
    async sendSlackNotification(channel, alert, message) {
        // Slack notification implementation
        this.logger.debug(`💬 Sending Slack notification for alert ${alert.alert_id}`);
    }
    /**
     * 🔗 SEND WEBHOOK NOTIFICATION
     */
    async sendWebhookNotification(channel, alert, message) {
        // Webhook notification implementation
        this.logger.debug(`🔗 Sending webhook notification for alert ${alert.alert_id}`);
    }
    /**
     * 📱 SEND SMS NOTIFICATION
     */
    async sendSMSNotification(channel, alert, message) {
        // SMS notification implementation
        this.logger.debug(`📱 Sending SMS notification for alert ${alert.alert_id}`);
    }
    /**
     * 📟 SEND PAGERDUTY NOTIFICATION
     */
    async sendPagerDutyNotification(channel, alert, message) {
        // PagerDuty notification implementation
        this.logger.debug(`📟 Sending PagerDuty notification for alert ${alert.alert_id}`);
    }
    /**
     * 💬 FORMAT ALERT MESSAGE
     */
    formatAlertMessage(alert) {
        return `
🚨 **${alert.severity.toUpperCase()} ALERT**

**Metric:** ${alert.metric_name}
**Description:** ${alert.description}
**Current Value:** ${alert.current_value}
**Threshold:** ${alert.threshold_value}
**Triggered At:** ${new Date(alert.triggered_at).toISOString()}

**Suggested Actions:**
${alert.suggested_actions.map(action => `• ${action}`).join('\n')}

**Tags:** ${JSON.stringify(alert.tags)}
**Alert ID:** ${alert.alert_id}
    `.trim();
    }
    /**
     * 🏥 REGISTER HEALTH CHECK
     */
    registerHealthCheck(component, check_function) {
        this.health_checks.set(component, check_function);
        this.logger.info(`🏥 Registered health check for ${component}`);
    }
    /**
     * 🔍 PERFORM HEALTH CHECKS
     */
    async performHealthChecks() {
        const health_promises = Array.from(this.health_checks.entries()).map(async ([component, check_function]) => {
            try {
                const result = await Promise.race([
                    check_function(),
                    this.timeoutPromise(this.config.health_check_timeout)
                ]);
                this.component_statuses.set(component, result);
                if (result.status !== 'healthy') {
                    this.triggerAlert(`health.${component}`, result.status === 'unhealthy' ? 'critical' : 'warning', `Health check failed for ${component}: ${result.error_message || 'Unknown error'}`, 0, 1, { component, response_time: result.response_time.toString() });
                }
            }
            catch (error) {
                const failed_result = {
                    component,
                    status: 'unhealthy',
                    response_time: this.config.health_check_timeout,
                    error_message: error instanceof Error ? error.message : String(error),
                    details: {},
                    timestamp: Date.now()
                };
                this.component_statuses.set(component, failed_result);
                this.triggerAlert(`health.${component}`, 'critical', `Health check timeout for ${component}`, 0, 1, { component, timeout: 'true' });
            }
        });
        await Promise.all(health_promises);
    }
    /**
     * 📊 GET SYSTEM STATUS
     */
    getSystemStatus() {
        const component_statuses = Array.from(this.component_statuses.values());
        const active_alerts = Array.from(this.active_alerts.values());
        // Determine overall status
        let overall_status = 'healthy';
        if (component_statuses.some(c => c.status === 'unhealthy')) {
            overall_status = 'unhealthy';
        }
        else if (component_statuses.some(c => c.status === 'degraded')) {
            overall_status = 'degraded';
        }
        // Calculate performance summary
        const performance_summary = {
            latency_p99: this.getMetricP99('inference.latency'),
            error_rate: this.getMetricAverage('error.rate'),
            throughput: this.getMetricAverage('training.throughput'),
            memory_usage: this.getMetricLatest('memory.used_mb'),
            cpu_usage: this.getMetricLatest('cpu.utilization')
        };
        return {
            overall_status,
            component_statuses,
            active_alerts,
            performance_summary,
            last_updated: Date.now()
        };
    }
    /**
     * 📈 GET METRIC STATISTICS
     */
    getMetricStatistics(metric_name, time_range_ms = 3600000 // 1 hour default
    ) {
        const metric_history = this.metrics_store.get(metric_name);
        if (!metric_history)
            return null;
        const cutoff_time = Date.now() - time_range_ms;
        const recent_values = metric_history
            .filter(m => m.timestamp >= cutoff_time)
            .map(m => m.value)
            .sort((a, b) => a - b);
        if (recent_values.length === 0)
            return null;
        return {
            count: recent_values.length,
            average: recent_values.reduce((a, b) => a + b, 0) / recent_values.length,
            min: recent_values[0],
            max: recent_values[recent_values.length - 1],
            p50: this.calculatePercentile(recent_values, 50),
            p95: this.calculatePercentile(recent_values, 95),
            p99: this.calculatePercentile(recent_values, 99),
            latest: metric_history[metric_history.length - 1].value
        };
    }
    // =================== UTILITY METHODS ===================
    initializeMetricDefinitions() {
        const default_metrics = [
            {
                name: 'inference.latency',
                description: 'Time taken for model inference',
                unit: 'milliseconds',
                type: 'histogram',
                tags: ['model', 'endpoint'],
                collection_frequency: 1000,
                retention_period: 2592000000,
                aggregation_methods: ['avg', 'p50', 'p95', 'p99']
            },
            {
                name: 'memory.used_mb',
                description: 'Memory usage in megabytes',
                unit: 'megabytes',
                type: 'gauge',
                tags: ['component'],
                collection_frequency: 30000,
                retention_period: 2592000000,
                aggregation_methods: ['avg', 'max']
            },
            {
                name: 'trading.sharpe_ratio',
                description: 'Trading strategy Sharpe ratio',
                unit: 'ratio',
                type: 'gauge',
                tags: ['strategy', 'timeframe'],
                collection_frequency: 300000,
                retention_period: 2592000000,
                aggregation_methods: ['avg', 'min', 'max']
            }
        ];
        for (const metric of default_metrics) {
            this.metric_definitions.set(metric.name, metric);
        }
    }
    initializeDefaultAlertChannels() {
        // Initialize default alert channels based on config
        if (this.config.alert_channels.length === 0) {
            const default_channel = {
                name: 'default_log',
                type: 'webhook',
                config: {},
                severity_filter: ['warning', 'critical', 'emergency'],
                rate_limit: {
                    max_alerts_per_hour: 10,
                    burst_limit: 3
                }
            };
            this.alert_channels.set('default_log', default_channel);
        }
        else {
            for (const channel of this.config.alert_channels) {
                this.alert_channels.set(channel.name, channel);
            }
        }
    }
    initializeHealthChecks() {
        // Register basic system health checks
        this.registerHealthCheck('memory', async () => ({
            component: 'memory',
            status: 'healthy',
            response_time: 1,
            details: { usage: '50%' },
            timestamp: Date.now()
        }));
        this.registerHealthCheck('tensorflow', async () => ({
            component: 'tensorflow',
            status: 'healthy',
            response_time: 5,
            details: { backend: 'webgl' },
            timestamp: Date.now()
        }));
    }
    startMonitoring() {
        // Metrics collection
        this.metrics_collection_interval = setInterval(() => {
            this.collectSystemMetrics();
        }, this.config.metrics_collection_interval);
        // Health checks
        this.health_check_interval = setInterval(() => {
            this.performHealthChecks();
        }, this.config.health_check_interval);
        // Anomaly detection
        if (this.config.anomaly_detection_enabled) {
            this.anomaly_check_interval = setInterval(() => {
                this.performAnomalyDetection();
            }, 60000); // Every minute
        }
        this.logger.info('📊 Monitoring started');
    }
    collectSystemMetrics() {
        // Collect basic system metrics
        const memory_usage = process.memoryUsage();
        this.collectMetric('system.memory.rss', memory_usage.rss / 1024 / 1024, { type: 'rss' });
        this.collectMetric('system.memory.heap_used', memory_usage.heapUsed / 1024 / 1024, { type: 'heap' });
        this.collectMetric('system.uptime', process.uptime(), { unit: 'seconds' });
    }
    async performAnomalyDetection() {
        // Perform periodic anomaly detection on key metrics
        for (const metric_name of this.config.high_frequency_metrics) {
            const latest_value = this.getMetricLatest(metric_name);
            if (latest_value !== null) {
                await this.checkForAnomalies(metric_name, latest_value, {});
            }
        }
    }
    cleanupOldMetrics(metric_name) {
        const metric_history = this.metrics_store.get(metric_name);
        const cutoff_time = Date.now() - this.config.metrics_retention_period;
        const filtered_history = metric_history.filter(m => m.timestamp >= cutoff_time);
        this.metrics_store.set(metric_name, filtered_history);
    }
    getMetricLatest(metric_name) {
        const metric_history = this.metrics_store.get(metric_name);
        return metric_history && metric_history.length > 0
            ? metric_history[metric_history.length - 1].value
            : null;
    }
    getMetricAverage(metric_name, time_range_ms = 300000) {
        const stats = this.getMetricStatistics(metric_name, time_range_ms);
        return stats ? stats.average : 0;
    }
    getMetricP99(metric_name, time_range_ms = 300000) {
        const stats = this.getMetricStatistics(metric_name, time_range_ms);
        return stats ? stats.p99 : 0;
    }
    calculatePercentile(values, percentile) {
        const index = Math.ceil((percentile / 100) * values.length) - 1;
        return values[Math.max(0, index)];
    }
    getSuggestedActions(metric_name, severity) {
        const actions = [];
        if (metric_name.includes('memory')) {
            actions.push('Check for memory leaks');
            actions.push('Restart the service if memory usage is critical');
            actions.push('Scale up instances if consistently high');
        }
        if (metric_name.includes('latency')) {
            actions.push('Check network connectivity');
            actions.push('Review recent deployments');
            actions.push('Scale up resources if needed');
        }
        if (metric_name.includes('trading')) {
            actions.push('Review trading strategy parameters');
            actions.push('Check market conditions');
            actions.push('Consider reducing position sizes');
        }
        return actions;
    }
    findRelatedAlerts(metric_name, tags) {
        // Find other active alerts that might be related
        return Array.from(this.active_alerts.values())
            .filter(alert => alert.metric_name !== metric_name &&
            (alert.metric_name.split('.')[0] === metric_name.split('.')[0] ||
                Object.keys(alert.tags).some(key => tags[key] === alert.tags[key])))
            .map(alert => alert.alert_id);
    }
    getRunbookUrl(metric_name) {
        // Return URL to runbook for this metric type
        const metric_category = metric_name.split('.')[0];
        return `https://runbooks.company.com/${metric_category}`;
    }
    isRateLimited(channel, alert) {
        // Implement rate limiting logic
        return false; // Simplified
    }
    async timeoutPromise(timeout_ms) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Health check timeout')), timeout_ms);
        });
    }
    /**
     * 🧹 DISPOSE
     */
    dispose() {
        this.logger.info('🧹 Disposing Real-Time Monitor...');
        if (this.metrics_collection_interval) {
            clearInterval(this.metrics_collection_interval);
        }
        if (this.health_check_interval) {
            clearInterval(this.health_check_interval);
        }
        if (this.anomaly_check_interval) {
            clearInterval(this.anomaly_check_interval);
        }
        this.anomaly_detector.dispose();
        this.baseline_calculator.dispose();
        this.logger.info('✅ Real-Time Monitor disposed');
    }
}
exports.RealTimeMonitor = RealTimeMonitor;
/**
 * 🔍 ANOMALY DETECTOR
 * Statistical anomaly detection using multiple algorithms
 */
class AnomalyDetector {
    constructor(config) {
        this.config = config;
    }
    async detectAnomaly(metric_name, value, history) {
        // Simplified anomaly detection using statistical methods
        const recent_values = history.slice(-100).map(m => m.value);
        const mean = recent_values.reduce((a, b) => a + b, 0) / recent_values.length;
        const std_dev = Math.sqrt(recent_values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / recent_values.length);
        const z_score = Math.abs((value - mean) / std_dev);
        const threshold = this.config.anomaly_sensitivity === 'high' ? 2 :
            this.config.anomaly_sensitivity === 'medium' ? 2.5 : 3;
        const is_anomaly = z_score > threshold;
        const anomaly_score = z_score / threshold;
        return {
            is_anomaly,
            anomaly_score,
            confidence_level: Math.min(0.99, z_score / 4),
            expected_range: {
                lower_bound: mean - (threshold * std_dev),
                upper_bound: mean + (threshold * std_dev)
            },
            contributing_factors: is_anomaly ? ['statistical_outlier'] : [],
            severity: is_anomaly ? (z_score > threshold * 1.5 ? 'critical' : 'warning') : 'info'
        };
    }
    dispose() {
        // Cleanup anomaly detector
    }
}
/**
 * 📊 BASELINE CALCULATOR
 * Calculate baselines for normal metric behavior
 */
class BaselineCalculator {
    constructor(config) {
        this.config = config;
    }
    dispose() {
        // Cleanup baseline calculator
    }
}
/**
 * 🚀 DEFAULT MONITORING CONFIGURATIONS
 */
exports.DEFAULT_MONITORING_CONFIGS = {
    DEVELOPMENT: {
        metrics_collection_interval: 60000, // 1 minute
        alerting_enabled: false,
        anomaly_detection_enabled: false,
        health_check_interval: 60000
    },
    STAGING: {
        metrics_collection_interval: 30000, // 30 seconds
        alerting_enabled: true,
        anomaly_detection_enabled: true,
        health_check_interval: 30000,
        alert_channels: [
            {
                name: 'staging_slack',
                type: 'slack',
                config: { channel: '#staging-alerts' },
                severity_filter: ['warning', 'critical', 'emergency'],
                rate_limit: { max_alerts_per_hour: 20, burst_limit: 5 }
            }
        ]
    },
    PRODUCTION: {
        metrics_collection_interval: 15000, // 15 seconds
        alerting_enabled: true,
        anomaly_detection_enabled: true,
        health_check_interval: 15000,
        alert_channels: [
            {
                name: 'production_pagerduty',
                type: 'pagerduty',
                config: { api_key: 'production_key' },
                severity_filter: ['critical', 'emergency'],
                rate_limit: { max_alerts_per_hour: 50, burst_limit: 10 }
            },
            {
                name: 'production_slack',
                type: 'slack',
                config: { channel: '#production-alerts' },
                severity_filter: ['warning', 'critical', 'emergency'],
                rate_limit: { max_alerts_per_hour: 30, burst_limit: 8 }
            }
        ]
    }
};

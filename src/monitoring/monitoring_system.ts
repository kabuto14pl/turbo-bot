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

import { EventEmitter } from 'events';
import { PerformanceMonitor, PerformanceMetrics, AlertLevel as PerfAlertLevel } from './performance_monitor';
import { MLRetrainManager, RetrainConfig } from './ml_retrain_manager';
import { MetricsCollector } from './metrics_collector';
import { AlertManager, AlertLevel, AlertChannel } from './alert_manager';
import { PrometheusExporter } from './prometheus_exporter';
import { HealthCheckSystem, HealthStatus } from './health_check_system';

export interface MonitoringConfig {
  // Performance monitoring
  performance_monitoring_enabled: boolean;
  
  // ML retraining
  ml_retrain_enabled: boolean;
  retrain_interval_trades: number;
  
  // Metrics collection
  metrics_collection_enabled: boolean;
  
  // Alerts
  alerts_enabled: boolean;
  
  // Prometheus
  prometheus_enabled: boolean;
  prometheus_port: number;
  
  // Health checks
  health_checks_enabled: boolean;
  health_check_interval_ms: number;
}

export class MonitoringSystem extends EventEmitter {
  private config: MonitoringConfig;
  
  // Component instances
  private performance_monitor?: PerformanceMonitor;
  private ml_retrain_manager?: MLRetrainManager;
  private metrics_collector?: MetricsCollector;
  private alert_manager?: AlertManager;
  private prometheus_exporter?: PrometheusExporter;
  private health_check_system?: HealthCheckSystem;
  
  private is_running: boolean = false;
  
  constructor(config?: Partial<MonitoringConfig>) {
    super();
    
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
  public async initialize(): Promise<void> {
    console.log('🚀 Initializing Monitoring System...');
    
    // 1. Performance Monitor
    if (this.config.performance_monitoring_enabled) {
      this.performance_monitor = new PerformanceMonitor({
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
      this.ml_retrain_manager = new MLRetrainManager({
        retrain_interval_trades: this.config.retrain_interval_trades,
        validation_window: 20,
        max_performance_drop: 0.10,
        auto_rollback: true
      });
      
      // Forward retrain events to alert manager
      this.ml_retrain_manager.on('retrain:needed', (data) => {
        this.alert_manager?.sendAlert(
          AlertLevel.INFO,
          'ML Retrain Needed',
          `Retrain triggered after ${data.trades_since_last} trades`
        );
      });
      
      this.ml_retrain_manager.on('retrain:completed', (result) => {
        const level = result.success && !result.rolled_back 
          ? AlertLevel.INFO 
          : AlertLevel.WARNING;
        
        this.alert_manager?.sendAlert(
          level,
          'ML Retrain Completed',
          result.success 
            ? `Performance change: ${(result.performance_change * 100).toFixed(1)}%`
            : `Retrain failed - rolled back`
        );
      });
      
      console.log('  ✅ MLRetrainManager initialized');
    }
    
    // 3. Metrics Collector
    if (this.config.metrics_collection_enabled) {
      this.metrics_collector = new MetricsCollector();
      console.log('  ✅ MetricsCollector initialized');
    }
    
    // 4. Alert Manager
    if (this.config.alerts_enabled) {
      this.alert_manager = new AlertManager({
        email_enabled: process.env.EMAIL_ENABLED === 'true',
        webhook_enabled: process.env.WEBHOOK_ENABLED === 'true',
        rate_limit_ms: 300000,
        deduplicate_window_ms: 600000
      });
      
      console.log('  ✅ AlertManager initialized');
    }
    
    // 5. Prometheus Exporter
    if (this.config.prometheus_enabled) {
      this.prometheus_exporter = new PrometheusExporter();
      console.log('  ✅ PrometheusExporter initialized');
    }
    
    // 6. Health Check System
    if (this.config.health_checks_enabled) {
      this.health_check_system = new HealthCheckSystem();
      
      // Forward health issues to alert manager
      this.health_check_system.on('health:checked', (result) => {
        if (result.overall_status === HealthStatus.UNHEALTHY) {
          this.alert_manager?.sendAlert(
            AlertLevel.CRITICAL,
            'System Health Critical',
            `Unhealthy components: ${result.recommendations.join(', ')}`
          );
        } else if (result.overall_status === HealthStatus.DEGRADED) {
          this.alert_manager?.sendAlert(
            AlertLevel.WARNING,
            'System Health Degraded',
            `Performance issues detected`
          );
        }
      });
      
      console.log('  ✅ HealthCheckSystem initialized');
    }
    
    console.log('✅ Monitoring System initialized successfully\n');
  }
  
  /**
   * 🎬 Start monitoring
   */
  public startMonitoring(): void {
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
  public stopMonitoring(): void {
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
  public async recordTrade(trade: any, portfolio: any, mlAdapter?: any): Promise<void> {
    // 1. Record in performance monitor
    if (this.performance_monitor) {
      await this.performance_monitor.recordTrade(trade);
    }
    
    // 2. Record in metrics collector
    if (this.metrics_collector) {
      this.metrics_collector.recordTrade(trade);
      
      if (trade.ml_confidence !== undefined) {
        this.metrics_collector.recordMLPrediction(
          trade.ml_confidence,
          trade.ml_latency_ms || 0,
          trade.pnl
        );
      }
      
      if (portfolio.current_drawdown !== undefined) {
        this.metrics_collector.recordRiskMetrics(
          portfolio.current_drawdown,
          portfolio.volatility || 0.01
        );
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
            await this.alert_manager?.sendAlert(
              AlertLevel.WARNING,
              'ML Retrain Failed',
              result.error || 'Unknown error'
            );
          }
        }
      }
    }
  }
  
  /**
   * 🚨 Handle performance alert
   */
  private async handlePerformanceAlert(alert: any): Promise<void> {
    if (!this.alert_manager) return;
    
    // Map performance alert level to AlertManager level
    const level_map: Record<string, AlertLevel> = {
      'INFO': AlertLevel.INFO,
      'WARNING': AlertLevel.WARNING,
      'CRITICAL': AlertLevel.CRITICAL,
      'EMERGENCY': AlertLevel.EMERGENCY
    };
    
    const alert_level = level_map[alert.level] || AlertLevel.INFO;
    
    await this.alert_manager.sendAlert(
      alert_level,
      alert.metric,
      alert.message,
      {
        current_value: alert.current_value,
        threshold: alert.threshold_value,
        recommended_action: alert.recommended_action
      }
    );
  }
  
  /**
   * 📊 Get comprehensive monitoring summary
   */
  public getSummary(): any {
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
  public exportPrometheusMetrics(): string {
    return this.prometheus_exporter?.exportMetrics() || '';
  }
  
  /**
   * 🏥 Get health status
   */
  public async getHealthStatus(): Promise<any> {
    if (!this.health_check_system) {
      return { status: 'disabled' };
    }
    
    return await this.health_check_system.performHealthCheck();
  }
  
  /**
   * 📋 Get component instances (for direct access if needed)
   */
  public getComponents(): any {
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

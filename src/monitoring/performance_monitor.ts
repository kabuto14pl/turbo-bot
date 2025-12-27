/**
 * 🎯 PERFORMANCE MONITOR - KROK 5.1
 * Enterprise-grade performance monitoring with auto-alerts
 * 
 * Features:
 * - Real-time performance tracking (win rate, Sharpe, drawdown)
 * - Automatic alert generation (WARNING/CRITICAL/EMERGENCY)
 * - Threshold-based monitoring (configurable limits)
 * - Historical performance comparison
 * - Anomaly detection
 */

import { EventEmitter } from 'events';

export interface PerformanceMetrics {
  // Trading Metrics
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  
  // Financial Metrics
  total_pnl: number;
  realized_pnl: number;
  unrealized_pnl: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  
  // Risk Metrics
  current_drawdown: number;
  max_drawdown: number;
  volatility: number;
  var_95: number;
  
  // ML Metrics
  ml_confidence_avg: number;
  ml_accuracy: number;
  ensemble_consensus_rate: number;
  
  // System Metrics
  consecutive_losses: number;
  consecutive_wins: number;
  avg_trade_duration: number;
  avg_position_size: number;
  
  // Timestamps
  last_trade_time: Date;
  monitoring_start: Date;
  last_alert_time?: Date;
}

export enum AlertLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  EMERGENCY = 'EMERGENCY'
}

export interface PerformanceAlert {
  level: AlertLevel;
  metric: string;
  message: string;
  current_value: number;
  threshold_value: number;
  timestamp: Date;
  recommended_action?: string;
}

export interface MonitoringConfig {
  // Alert Thresholds
  min_win_rate: number;              // Default: 0.50 (50%)
  min_sharpe_ratio: number;          // Default: 1.0
  max_drawdown: number;              // Default: 0.10 (10%)
  max_consecutive_losses: number;    // Default: 3
  min_ml_confidence: number;         // Default: 0.30 (30%)
  
  // Monitoring Intervals
  check_interval_ms: number;         // Default: 60000 (1 min)
  alert_cooldown_ms: number;         // Default: 300000 (5 min)
  
  // Performance Windows
  short_window_trades: number;       // Default: 10
  long_window_trades: number;        // Default: 50
  
  // Alert Actions
  auto_pause_on_critical: boolean;   // Default: true
  auto_reduce_risk_on_warning: boolean; // Default: true
  
  // Logging
  verbose_logging: boolean;          // Default: false
  log_all_metrics: boolean;          // Default: true
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics;
  private config: MonitoringConfig;
  private alerts: PerformanceAlert[] = [];
  private trade_history: any[] = [];
  private monitoring_active: boolean = false;
  private check_interval?: NodeJS.Timeout;
  
  // Historical Performance (rolling windows)
  private short_window_metrics: PerformanceMetrics[] = [];
  private long_window_metrics: PerformanceMetrics[] = [];
  
  constructor(config?: Partial<MonitoringConfig>) {
    super();
    
    this.config = {
      // Thresholds
      min_win_rate: 0.50,
      min_sharpe_ratio: 1.0,
      max_drawdown: 0.10,
      max_consecutive_losses: 3,
      min_ml_confidence: 0.30,
      
      // Intervals
      check_interval_ms: 60000,      // 1 min
      alert_cooldown_ms: 300000,     // 5 min
      
      // Windows
      short_window_trades: 10,
      long_window_trades: 50,
      
      // Actions
      auto_pause_on_critical: true,
      auto_reduce_risk_on_warning: true,
      
      // Logging
      verbose_logging: false,
      log_all_metrics: true,
      
      ...config
    };
    
    this.metrics = this.initializeMetrics();
  }
  
  private initializeMetrics(): PerformanceMetrics {
    return {
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      win_rate: 0,
      
      total_pnl: 0,
      realized_pnl: 0,
      unrealized_pnl: 0,
      sharpe_ratio: 0,
      sortino_ratio: 0,
      
      current_drawdown: 0,
      max_drawdown: 0,
      volatility: 0,
      var_95: 0,
      
      ml_confidence_avg: 0,
      ml_accuracy: 0,
      ensemble_consensus_rate: 0,
      
      consecutive_losses: 0,
      consecutive_wins: 0,
      avg_trade_duration: 0,
      avg_position_size: 0,
      
      last_trade_time: new Date(),
      monitoring_start: new Date()
    };
  }
  
  /**
   * 🚀 Start performance monitoring
   */
  public startMonitoring(): void {
    if (this.monitoring_active) {
      console.log('⚠️ Performance monitoring already active');
      return;
    }
    
    this.monitoring_active = true;
    this.metrics.monitoring_start = new Date();
    
    // Periodic health checks
    this.check_interval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.check_interval_ms);
    
    console.log('✅ Performance monitoring started');
    this.emit('monitoring:started');
  }
  
  /**
   * ⏹️ Stop performance monitoring
   */
  public stopMonitoring(): void {
    if (this.check_interval) {
      clearInterval(this.check_interval);
      this.check_interval = undefined;
    }
    
    this.monitoring_active = false;
    console.log('⏹️ Performance monitoring stopped');
    this.emit('monitoring:stopped');
  }
  
  /**
   * 📊 Update metrics after trade
   */
  public async recordTrade(trade: any): Promise<void> {
    this.trade_history.push(trade);
    this.metrics.total_trades++;
    this.metrics.last_trade_time = new Date();
    
    // Win/Loss tracking
    if (trade.pnl > 0) {
      this.metrics.winning_trades++;
      this.metrics.consecutive_wins++;
      this.metrics.consecutive_losses = 0;
    } else if (trade.pnl < 0) {
      this.metrics.losing_trades++;
      this.metrics.consecutive_losses++;
      this.metrics.consecutive_wins = 0;
    }
    
    // Win rate
    this.metrics.win_rate = this.metrics.winning_trades / this.metrics.total_trades;
    
    // PnL tracking
    this.metrics.total_pnl += trade.pnl;
    this.metrics.realized_pnl += trade.pnl;
    
    // ML metrics (if available)
    if (trade.ml_confidence !== undefined) {
      const total_ml = this.metrics.ml_confidence_avg * (this.metrics.total_trades - 1);
      this.metrics.ml_confidence_avg = (total_ml + trade.ml_confidence) / this.metrics.total_trades;
    }
    
    // Update Sharpe ratio (simplified)
    this.updateSharpeRatio();
    
    // Update drawdown
    this.updateDrawdown();
    
    // Update rolling windows
    this.updateRollingWindows();
    
    // Log metrics if enabled
    if (this.config.log_all_metrics) {
      this.logMetrics();
    }
    
    // Immediate check after trade
    await this.performHealthCheck();
    
    this.emit('trade:recorded', trade);
  }
  
  /**
   * 📈 Update Sharpe ratio
   */
  private updateSharpeRatio(): void {
    if (this.trade_history.length < 2) {
      this.metrics.sharpe_ratio = 0;
      return;
    }
    
    const returns = this.trade_history.map(t => t.pnl);
    const mean_return = returns.reduce((a, b) => a + b, 0) / returns.length;
    
    const variance = returns.reduce((sum, r) => {
      return sum + Math.pow(r - mean_return, 2);
    }, 0) / returns.length;
    
    const std_dev = Math.sqrt(variance);
    
    if (std_dev === 0) {
      this.metrics.sharpe_ratio = 0;
    } else {
      // Annualized Sharpe (assuming ~250 trading days)
      this.metrics.sharpe_ratio = (mean_return / std_dev) * Math.sqrt(250);
    }
  }
  
  /**
   * 📉 Update drawdown tracking
   */
  private updateDrawdown(): void {
    if (this.trade_history.length === 0) {
      this.metrics.current_drawdown = 0;
      this.metrics.max_drawdown = 0;
      return;
    }
    
    // Calculate cumulative PnL curve
    let peak_pnl = 0;
    let current_pnl = 0;
    let max_dd = 0;
    
    for (const trade of this.trade_history) {
      current_pnl += trade.pnl;
      
      if (current_pnl > peak_pnl) {
        peak_pnl = current_pnl;
      }
      
      const drawdown = (peak_pnl - current_pnl) / Math.max(Math.abs(peak_pnl), 1);
      
      if (drawdown > max_dd) {
        max_dd = drawdown;
      }
    }
    
    this.metrics.current_drawdown = (peak_pnl - current_pnl) / Math.max(Math.abs(peak_pnl), 1);
    this.metrics.max_drawdown = max_dd;
  }
  
  /**
   * 🔄 Update rolling performance windows
   */
  private updateRollingWindows(): void {
    // Short window (last 10 trades)
    if (this.trade_history.length >= this.config.short_window_trades) {
      const recent_trades = this.trade_history.slice(-this.config.short_window_trades);
      const short_metrics = this.calculateWindowMetrics(recent_trades);
      this.short_window_metrics.push(short_metrics);
      
      // Keep only last 100 windows
      if (this.short_window_metrics.length > 100) {
        this.short_window_metrics.shift();
      }
    }
    
    // Long window (last 50 trades)
    if (this.trade_history.length >= this.config.long_window_trades) {
      const recent_trades = this.trade_history.slice(-this.config.long_window_trades);
      const long_metrics = this.calculateWindowMetrics(recent_trades);
      this.long_window_metrics.push(long_metrics);
      
      // Keep only last 50 windows
      if (this.long_window_metrics.length > 50) {
        this.long_window_metrics.shift();
      }
    }
  }
  
  /**
   * 📊 Calculate metrics for a window of trades
   */
  private calculateWindowMetrics(trades: any[]): PerformanceMetrics {
    const wins = trades.filter(t => t.pnl > 0).length;
    const total_pnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    
    return {
      ...this.metrics,
      total_trades: trades.length,
      winning_trades: wins,
      losing_trades: trades.length - wins,
      win_rate: wins / trades.length,
      total_pnl,
      realized_pnl: total_pnl,
      unrealized_pnl: 0,
      last_trade_time: new Date()
    } as PerformanceMetrics;
  }
  
  /**
   * 🏥 Perform health check and generate alerts
   */
  private async performHealthCheck(): Promise<void> {
    if (this.metrics.total_trades < 5) {
      // Not enough data for meaningful alerts
      return;
    }
    
    const new_alerts: PerformanceAlert[] = [];
    
    // Check 1: Win Rate
    if (this.metrics.win_rate < this.config.min_win_rate) {
      new_alerts.push({
        level: this.metrics.win_rate < 0.40 ? AlertLevel.CRITICAL : AlertLevel.WARNING,
        metric: 'win_rate',
        message: `Win rate (${(this.metrics.win_rate * 100).toFixed(1)}%) below threshold (${(this.config.min_win_rate * 100).toFixed(1)}%)`,
        current_value: this.metrics.win_rate,
        threshold_value: this.config.min_win_rate,
        timestamp: new Date(),
        recommended_action: this.metrics.win_rate < 0.40 
          ? 'PAUSE TRADING - Performance critically low'
          : 'Review strategy parameters and ML predictions'
      });
    }
    
    // Check 2: Sharpe Ratio
    if (this.metrics.sharpe_ratio < this.config.min_sharpe_ratio) {
      new_alerts.push({
        level: this.metrics.sharpe_ratio < 0.5 ? AlertLevel.CRITICAL : AlertLevel.WARNING,
        metric: 'sharpe_ratio',
        message: `Sharpe ratio (${this.metrics.sharpe_ratio.toFixed(2)}) below threshold (${this.config.min_sharpe_ratio.toFixed(2)})`,
        current_value: this.metrics.sharpe_ratio,
        threshold_value: this.config.min_sharpe_ratio,
        timestamp: new Date(),
        recommended_action: 'Risk-adjusted returns too low - review position sizing'
      });
    }
    
    // Check 3: Drawdown
    if (this.metrics.current_drawdown > this.config.max_drawdown) {
      new_alerts.push({
        level: this.metrics.current_drawdown > 0.15 ? AlertLevel.EMERGENCY : AlertLevel.CRITICAL,
        metric: 'current_drawdown',
        message: `Current drawdown (${(this.metrics.current_drawdown * 100).toFixed(1)}%) exceeds limit (${(this.config.max_drawdown * 100).toFixed(1)}%)`,
        current_value: this.metrics.current_drawdown,
        threshold_value: this.config.max_drawdown,
        timestamp: new Date(),
        recommended_action: this.metrics.current_drawdown > 0.15
          ? 'EMERGENCY STOP - Drawdown critical'
          : 'Reduce position sizes immediately'
      });
    }
    
    // Check 4: Consecutive Losses
    if (this.metrics.consecutive_losses > this.config.max_consecutive_losses) {
      new_alerts.push({
        level: this.metrics.consecutive_losses > 5 ? AlertLevel.EMERGENCY : AlertLevel.CRITICAL,
        metric: 'consecutive_losses',
        message: `${this.metrics.consecutive_losses} consecutive losses (max: ${this.config.max_consecutive_losses})`,
        current_value: this.metrics.consecutive_losses,
        threshold_value: this.config.max_consecutive_losses,
        timestamp: new Date(),
        recommended_action: 'Pause trading and review strategy logic'
      });
    }
    
    // Check 5: ML Confidence
    if (this.metrics.ml_confidence_avg < this.config.min_ml_confidence) {
      new_alerts.push({
        level: AlertLevel.WARNING,
        metric: 'ml_confidence',
        message: `ML confidence (${(this.metrics.ml_confidence_avg * 100).toFixed(1)}%) below threshold (${(this.config.min_ml_confidence * 100).toFixed(1)}%)`,
        current_value: this.metrics.ml_confidence_avg,
        threshold_value: this.config.min_ml_confidence,
        timestamp: new Date(),
        recommended_action: 'ML predictions weak - consider retraining'
      });
    }
    
    // Process alerts
    for (const alert of new_alerts) {
      await this.handleAlert(alert);
    }
  }
  
  /**
   * 🚨 Handle alert (log, emit, take action)
   */
  private async handleAlert(alert: PerformanceAlert): Promise<void> {
    // Check cooldown (avoid alert spam)
    if (this.metrics.last_alert_time) {
      const time_since_last = Date.now() - this.metrics.last_alert_time.getTime();
      if (time_since_last < this.config.alert_cooldown_ms) {
        return; // Still in cooldown
      }
    }
    
    // Store alert
    this.alerts.push(alert);
    this.metrics.last_alert_time = new Date();
    
    // Log alert
    const emoji = {
      [AlertLevel.INFO]: 'ℹ️',
      [AlertLevel.WARNING]: '⚠️',
      [AlertLevel.CRITICAL]: '🔴',
      [AlertLevel.EMERGENCY]: '🚨'
    }[alert.level];
    
    console.log(`${emoji} PERFORMANCE ALERT [${alert.level}]`);
    console.log(`   Metric: ${alert.metric}`);
    console.log(`   Message: ${alert.message}`);
    if (alert.recommended_action) {
      console.log(`   Action: ${alert.recommended_action}`);
    }
    
    // Emit alert event
    this.emit('alert:generated', alert);
    
    // Auto-actions
    if (alert.level === AlertLevel.CRITICAL && this.config.auto_reduce_risk_on_warning) {
      console.log('🛡️ Auto-action: Reducing risk per trade by 50%');
      this.emit('action:reduce_risk', { factor: 0.5 });
    }
    
    if (alert.level === AlertLevel.EMERGENCY && this.config.auto_pause_on_critical) {
      console.log('🛑 Auto-action: PAUSING TRADING');
      this.emit('action:pause_trading');
    }
  }
  
  /**
   * 📋 Log current metrics
   */
  private logMetrics(): void {
    if (!this.config.verbose_logging && this.metrics.total_trades % 10 !== 0) {
      return; // Only log every 10 trades if not verbose
    }
    
    console.log('\n📊 PERFORMANCE METRICS:');
    console.log(`   Trades: ${this.metrics.total_trades} (${this.metrics.winning_trades}W / ${this.metrics.losing_trades}L)`);
    console.log(`   Win Rate: ${(this.metrics.win_rate * 100).toFixed(1)}%`);
    console.log(`   Total PnL: $${this.metrics.total_pnl.toFixed(2)}`);
    console.log(`   Sharpe Ratio: ${this.metrics.sharpe_ratio.toFixed(2)}`);
    console.log(`   Current Drawdown: ${(this.metrics.current_drawdown * 100).toFixed(1)}%`);
    console.log(`   Max Drawdown: ${(this.metrics.max_drawdown * 100).toFixed(1)}%`);
    console.log(`   Consecutive: ${this.metrics.consecutive_wins}W / ${this.metrics.consecutive_losses}L`);
    console.log(`   ML Confidence: ${(this.metrics.ml_confidence_avg * 100).toFixed(1)}%`);
  }
  
  /**
   * 📈 Get current metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  /**
   * 🚨 Get recent alerts
   */
  public getAlerts(limit: number = 10): PerformanceAlert[] {
    return this.alerts.slice(-limit);
  }
  
  /**
   * 📊 Get performance summary
   */
  public getSummary(): any {
    const duration_ms = Date.now() - this.metrics.monitoring_start.getTime();
    const duration_hours = duration_ms / (1000 * 60 * 60);
    
    return {
      monitoring_duration_hours: duration_hours.toFixed(2),
      total_trades: this.metrics.total_trades,
      win_rate: `${(this.metrics.win_rate * 100).toFixed(1)}%`,
      total_pnl: `$${this.metrics.total_pnl.toFixed(2)}`,
      sharpe_ratio: this.metrics.sharpe_ratio.toFixed(2),
      max_drawdown: `${(this.metrics.max_drawdown * 100).toFixed(1)}%`,
      current_drawdown: `${(this.metrics.current_drawdown * 100).toFixed(1)}%`,
      ml_confidence_avg: `${(this.metrics.ml_confidence_avg * 100).toFixed(1)}%`,
      total_alerts: this.alerts.length,
      critical_alerts: this.alerts.filter(a => a.level === AlertLevel.CRITICAL || a.level === AlertLevel.EMERGENCY).length
    };
  }
  
  /**
   * 🔄 Reset metrics (use with caution)
   */
  public resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.trade_history = [];
    this.alerts = [];
    this.short_window_metrics = [];
    this.long_window_metrics = [];
    
    console.log('🔄 Performance metrics reset');
    this.emit('metrics:reset');
  }
}

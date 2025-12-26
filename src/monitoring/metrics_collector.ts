/**
 * 📊 METRICS COLLECTOR - KROK 5.3
 * Real-time metrics collection system
 * 
 * Features:
 * - Trading metrics (PnL, win rate, Sharpe)
 * - ML metrics (confidence, accuracy, features)
 * - Risk metrics (VaR, drawdown, volatility)
 * - System metrics (latency, memory, CPU)
 * - Time-series storage for historical analysis
 */

import { EventEmitter } from 'events';

export interface TradingMetrics {
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  avg_pnl_per_trade: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  profit_factor: number;
}

export interface MLMetrics {
  ml_confidence_avg: number;
  ml_accuracy: number;
  ensemble_consensus_rate: number;
  features_count: number;
  prediction_latency_ms: number;
}

export interface RiskMetrics {
  current_drawdown: number;
  max_drawdown: number;
  var_95: number;
  volatility: number;
  beta: number;
  position_concentration: number;
}

export interface SystemMetrics {
  avg_trade_latency_ms: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
  uptime_hours: number;
  errors_count: number;
}

export interface MetricsSnapshot {
  timestamp: Date;
  trading: TradingMetrics;
  ml: MLMetrics;
  risk: RiskMetrics;
  system: SystemMetrics;
}

export class MetricsCollector extends EventEmitter {
  private snapshots: MetricsSnapshot[] = [];
  private max_snapshots: number = 1000;
  private collection_start: Date;
  
  // Cumulative counters
  private total_trades: number = 0;
  private winning_trades: number = 0;
  private total_pnl: number = 0;
  private pnl_values: number[] = [];
  
  // ML tracking
  private ml_predictions: number[] = [];
  private ml_accuracies: number[] = [];
  private prediction_latencies: number[] = [];
  
  // Risk tracking
  private drawdown_history: number[] = [];
  private volatility_history: number[] = [];
  
  // System tracking
  private trade_latencies: number[] = [];
  private errors_count: number = 0;
  
  constructor() {
    super();
    this.collection_start = new Date();
    
    // Start periodic collection
    setInterval(() => {
      this.collectSnapshot();
    }, 60000); // Every 1 minute
  }
  
  /**
   * 📈 Record trading metrics
   */
  public recordTrade(trade: any): void {
    this.total_trades++;
    
    if (trade.pnl > 0) {
      this.winning_trades++;
    }
    
    this.total_pnl += trade.pnl;
    this.pnl_values.push(trade.pnl);
    
    // Keep only recent values
    if (this.pnl_values.length > 500) {
      this.pnl_values.shift();
    }
    
    // Record latency if available
    if (trade.execution_latency_ms) {
      this.trade_latencies.push(trade.execution_latency_ms);
      if (this.trade_latencies.length > 100) {
        this.trade_latencies.shift();
      }
    }
  }
  
  /**
   * 🤖 Record ML prediction
   */
  public recordMLPrediction(confidence: number, latency_ms: number, actual_result?: number): void {
    this.ml_predictions.push(confidence);
    this.prediction_latencies.push(latency_ms);
    
    if (actual_result !== undefined) {
      // Calculate accuracy
      const was_correct = (confidence > 0.5 && actual_result > 0) || (confidence < 0.5 && actual_result < 0);
      this.ml_accuracies.push(was_correct ? 1 : 0);
    }
    
    // Keep only recent
    if (this.ml_predictions.length > 500) {
      this.ml_predictions.shift();
      this.prediction_latencies.shift();
    }
    if (this.ml_accuracies.length > 500) {
      this.ml_accuracies.shift();
    }
  }
  
  /**
   * 🛡️ Record risk metrics
   */
  public recordRiskMetrics(drawdown: number, volatility: number): void {
    this.drawdown_history.push(drawdown);
    this.volatility_history.push(volatility);
    
    // Keep only recent
    if (this.drawdown_history.length > 500) {
      this.drawdown_history.shift();
    }
    if (this.volatility_history.length > 500) {
      this.volatility_history.shift();
    }
  }
  
  /**
   * ❌ Record error
   */
  public recordError(): void {
    this.errors_count++;
  }
  
  /**
   * 📸 Collect metrics snapshot
   */
  private collectSnapshot(): void {
    const snapshot: MetricsSnapshot = {
      timestamp: new Date(),
      trading: this.calculateTradingMetrics(),
      ml: this.calculateMLMetrics(),
      risk: this.calculateRiskMetrics(),
      system: this.calculateSystemMetrics()
    };
    
    this.snapshots.push(snapshot);
    
    // Keep only max_snapshots
    if (this.snapshots.length > this.max_snapshots) {
      this.snapshots.shift();
    }
    
    this.emit('snapshot:collected', snapshot);
  }
  
  /**
   * 📊 Calculate trading metrics
   */
  private calculateTradingMetrics(): TradingMetrics {
    const win_rate = this.total_trades > 0 ? this.winning_trades / this.total_trades : 0;
    const avg_pnl = this.total_trades > 0 ? this.total_pnl / this.total_trades : 0;
    
    // Sharpe ratio
    let sharpe = 0;
    if (this.pnl_values.length >= 2) {
      const mean = this.pnl_values.reduce((a, b) => a + b, 0) / this.pnl_values.length;
      const variance = this.pnl_values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.pnl_values.length;
      const std_dev = Math.sqrt(variance);
      sharpe = std_dev > 0 ? (mean / std_dev) * Math.sqrt(252) : 0;
    }
    
    // Sortino ratio (downside deviation)
    let sortino = 0;
    if (this.pnl_values.length >= 2) {
      const mean = this.pnl_values.reduce((a, b) => a + b, 0) / this.pnl_values.length;
      const downside_values = this.pnl_values.filter(v => v < 0);
      if (downside_values.length > 0) {
        const downside_variance = downside_values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / downside_values.length;
        const downside_dev = Math.sqrt(downside_variance);
        sortino = downside_dev > 0 ? (mean / downside_dev) * Math.sqrt(252) : 0;
      }
    }
    
    // Profit factor
    const wins = this.pnl_values.filter(v => v > 0);
    const losses = this.pnl_values.filter(v => v < 0);
    const gross_profit = wins.reduce((a, b) => a + b, 0);
    const gross_loss = Math.abs(losses.reduce((a, b) => a + b, 0));
    const profit_factor = gross_loss > 0 ? gross_profit / gross_loss : 0;
    
    return {
      total_trades: this.total_trades,
      win_rate,
      total_pnl: this.total_pnl,
      avg_pnl_per_trade: avg_pnl,
      sharpe_ratio: sharpe,
      sortino_ratio: sortino,
      profit_factor
    };
  }
  
  /**
   * 🤖 Calculate ML metrics
   */
  private calculateMLMetrics(): MLMetrics {
    const ml_confidence_avg = this.ml_predictions.length > 0
      ? this.ml_predictions.reduce((a, b) => a + b, 0) / this.ml_predictions.length
      : 0;
    
    const ml_accuracy = this.ml_accuracies.length > 0
      ? this.ml_accuracies.reduce((a, b) => a + b, 0) / this.ml_accuracies.length
      : 0;
    
    const prediction_latency_ms = this.prediction_latencies.length > 0
      ? this.prediction_latencies.reduce((a, b) => a + b, 0) / this.prediction_latencies.length
      : 0;
    
    return {
      ml_confidence_avg,
      ml_accuracy,
      ensemble_consensus_rate: 0.75, // Placeholder
      features_count: 17, // From Krok 2 improvements
      prediction_latency_ms
    };
  }
  
  /**
   * 🛡️ Calculate risk metrics
   */
  private calculateRiskMetrics(): RiskMetrics {
    const current_drawdown = this.drawdown_history.length > 0
      ? this.drawdown_history[this.drawdown_history.length - 1]
      : 0;
    
    const max_drawdown = this.drawdown_history.length > 0
      ? Math.max(...this.drawdown_history)
      : 0;
    
    const volatility = this.volatility_history.length > 0
      ? this.volatility_history[this.volatility_history.length - 1]
      : 0;
    
    // VaR 95% (simplified)
    let var_95 = 0;
    if (this.pnl_values.length >= 20) {
      const sorted = [...this.pnl_values].sort((a, b) => a - b);
      const index = Math.floor(sorted.length * 0.05);
      var_95 = Math.abs(sorted[index]);
    }
    
    return {
      current_drawdown,
      max_drawdown,
      var_95,
      volatility,
      beta: 1.0, // Placeholder
      position_concentration: 0.2 // Placeholder
    };
  }
  
  /**
   * 💻 Calculate system metrics
   */
  private calculateSystemMetrics(): SystemMetrics {
    const avg_trade_latency_ms = this.trade_latencies.length > 0
      ? this.trade_latencies.reduce((a, b) => a + b, 0) / this.trade_latencies.length
      : 0;
    
    const memory_usage_mb = process.memoryUsage().heapUsed / 1024 / 1024;
    const cpu_usage_percent = 0; // Placeholder (requires external lib)
    
    const uptime_ms = Date.now() - this.collection_start.getTime();
    const uptime_hours = uptime_ms / (1000 * 60 * 60);
    
    return {
      avg_trade_latency_ms,
      memory_usage_mb,
      cpu_usage_percent,
      uptime_hours,
      errors_count: this.errors_count
    };
  }
  
  /**
   * 📊 Get latest snapshot
   */
  public getLatestSnapshot(): MetricsSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }
  
  /**
   * 📈 Get historical snapshots
   */
  public getSnapshots(limit: number = 100): MetricsSnapshot[] {
    return this.snapshots.slice(-limit);
  }
  
  /**
   * 📊 Get metrics summary
   */
  public getSummary(): any {
    const latest = this.getLatestSnapshot();
    
    if (!latest) {
      return null;
    }
    
    return {
      timestamp: latest.timestamp,
      trading: {
        total_trades: latest.trading.total_trades,
        win_rate: `${(latest.trading.win_rate * 100).toFixed(1)}%`,
        total_pnl: `$${latest.trading.total_pnl.toFixed(2)}`,
        sharpe_ratio: latest.trading.sharpe_ratio.toFixed(2)
      },
      ml: {
        confidence: `${(latest.ml.ml_confidence_avg * 100).toFixed(1)}%`,
        accuracy: `${(latest.ml.ml_accuracy * 100).toFixed(1)}%`,
        latency: `${latest.ml.prediction_latency_ms.toFixed(0)}ms`
      },
      risk: {
        current_drawdown: `${(latest.risk.current_drawdown * 100).toFixed(1)}%`,
        max_drawdown: `${(latest.risk.max_drawdown * 100).toFixed(1)}%`,
        var_95: `$${latest.risk.var_95.toFixed(2)}`
      },
      system: {
        memory: `${latest.system.memory_usage_mb.toFixed(0)}MB`,
        uptime: `${latest.system.uptime_hours.toFixed(1)}h`,
        errors: latest.system.errors_count
      }
    };
  }
  
  /**
   * 🔄 Reset all metrics
   */
  public reset(): void {
    this.total_trades = 0;
    this.winning_trades = 0;
    this.total_pnl = 0;
    this.pnl_values = [];
    this.ml_predictions = [];
    this.ml_accuracies = [];
    this.prediction_latencies = [];
    this.drawdown_history = [];
    this.volatility_history = [];
    this.trade_latencies = [];
    this.errors_count = 0;
    this.snapshots = [];
    this.collection_start = new Date();
    
    console.log('🔄 Metrics collector reset');
    this.emit('metrics:reset');
  }
}

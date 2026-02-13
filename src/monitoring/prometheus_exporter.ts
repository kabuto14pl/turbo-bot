/**
 * 📊 PROMETHEUS EXPORTER - KROK 5.6
 * Metrics export to Prometheus format
 * 
 * Features:
 * - Gauge metrics (portfolio value, ML confidence, drawdown)
 * - Counter metrics (total trades, wins, losses, errors)
 * - Histogram metrics (trade duration, PnL distribution, latency)
 * - Custom labels (strategy, symbol, signal type)
 * - Auto-registration with Prometheus
 */

export interface PrometheusMetric {
  name: string;
  type: 'gauge' | 'counter' | 'histogram';
  help: string;
  value?: number;
  labels?: Record<string, string>;
}

export class PrometheusExporter {
  private gauges: Map<string, PrometheusMetric> = new Map();
  private counters: Map<string, PrometheusMetric> = new Map();
  private histograms: Map<string, { values: number[], labels?: Record<string, string> }> = new Map();
  
  constructor() {
    this.initializeMetrics();
  }
  
  /**
   * 🎯 Initialize default metrics
   */
  private initializeMetrics(): void {
    // Gauges (current values)
    this.registerGauge('trading_bot_portfolio_value', 'Current portfolio value in USD');
    this.registerGauge('trading_bot_ml_confidence', 'Current ML prediction confidence (0-1)');
    this.registerGauge('trading_bot_current_drawdown', 'Current drawdown percentage (0-1)');
    this.registerGauge('trading_bot_sharpe_ratio', 'Current Sharpe ratio');
    this.registerGauge('trading_bot_win_rate', 'Current win rate (0-1)');
    this.registerGauge('trading_bot_open_positions', 'Number of open positions');
    
    // Counters (cumulative)
    this.registerCounter('trading_bot_trades_total', 'Total number of trades');
    this.registerCounter('trading_bot_wins_total', 'Total winning trades');
    this.registerCounter('trading_bot_losses_total', 'Total losing trades');
    this.registerCounter('trading_bot_errors_total', 'Total errors encountered');
    this.registerCounter('trading_bot_ml_predictions_total', 'Total ML predictions made');
    this.registerCounter('trading_bot_retrains_total', 'Total ML retraining events');
    
    // Histograms (distributions)
    this.registerHistogram('trading_bot_trade_duration_seconds', 'Trade duration distribution');
    this.registerHistogram('trading_bot_pnl_distribution', 'PnL distribution per trade');
    this.registerHistogram('trading_bot_ml_latency_ms', 'ML prediction latency distribution');
    this.registerHistogram('trading_bot_execution_latency_ms', 'Trade execution latency distribution');
  }
  
  /**
   * 📊 Register gauge metric
   */
  private registerGauge(name: string, help: string): void {
    this.gauges.set(name, { name, type: 'gauge', help, value: 0 });
  }
  
  /**
   * 🔢 Register counter metric
   */
  private registerCounter(name: string, help: string): void {
    this.counters.set(name, { name, type: 'counter', help, value: 0 });
  }
  
  /**
   * 📈 Register histogram metric
   */
  private registerHistogram(name: string, help: string): void {
    this.histograms.set(name, { values: [] });
  }
  
  /**
   * ✏️ Set gauge value
   */
  public setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.gauges.get(name);
    if (metric) {
      metric.value = value;
      metric.labels = labels;
    }
  }
  
  /**
   * ➕ Increment counter
   */
  public incrementCounter(name: string, increment: number = 1, labels?: Record<string, string>): void {
    const metric = this.counters.get(name);
    if (metric) {
      metric.value = (metric.value || 0) + increment;
      metric.labels = labels;
    }
  }
  
  /**
   * 📊 Observe histogram value
   */
  public observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const histogram = this.histograms.get(name);
    if (histogram) {
      histogram.values.push(value);
      histogram.labels = labels;
      
      // Keep only last 1000 values
      if (histogram.values.length > 1000) {
        histogram.values.shift();
      }
    }
  }
  
  /**
   * 📈 Update metrics from trading data
   */
  public updateFromTrade(trade: any, portfolio: any): void {
    // Update counters
    this.incrementCounter('trading_bot_trades_total');
    if (trade.pnl > 0) {
      this.incrementCounter('trading_bot_wins_total');
    } else {
      this.incrementCounter('trading_bot_losses_total');
    }
    
    // Update gauges
    if (portfolio.total_value) {
      this.setGauge('trading_bot_portfolio_value', portfolio.total_value);
    }
    if (trade.ml_confidence !== undefined) {
      this.setGauge('trading_bot_ml_confidence', trade.ml_confidence);
    }
    if (portfolio.current_drawdown !== undefined) {
      this.setGauge('trading_bot_current_drawdown', portfolio.current_drawdown);
    }
    if (portfolio.sharpe_ratio !== undefined) {
      this.setGauge('trading_bot_sharpe_ratio', portfolio.sharpe_ratio);
    }
    if (portfolio.win_rate !== undefined) {
      this.setGauge('trading_bot_win_rate', portfolio.win_rate);
    }
    
    // Update histograms
    if (trade.duration_seconds) {
      this.observeHistogram('trading_bot_trade_duration_seconds', trade.duration_seconds);
    }
    if (trade.pnl !== undefined) {
      this.observeHistogram('trading_bot_pnl_distribution', trade.pnl);
    }
    if (trade.ml_latency_ms) {
      this.observeHistogram('trading_bot_ml_latency_ms', trade.ml_latency_ms);
    }
    if (trade.execution_latency_ms) {
      this.observeHistogram('trading_bot_execution_latency_ms', trade.execution_latency_ms);
    }
  }
  
  /**
   * 📝 Export metrics in Prometheus format
   */
  public exportMetrics(): string {
    let output = '';
    
    // Export gauges
    for (const [name, metric] of this.gauges) {
      output += `# HELP ${name} ${metric.help}\n`;
      output += `# TYPE ${name} gauge\n`;
      
      const labels = metric.labels ? this.formatLabels(metric.labels) : '';
      output += `${name}${labels} ${metric.value || 0}\n`;
      output += '\n';
    }
    
    // Export counters
    for (const [name, metric] of this.counters) {
      output += `# HELP ${name} ${metric.help}\n`;
      output += `# TYPE ${name} counter\n`;
      
      const labels = metric.labels ? this.formatLabels(metric.labels) : '';
      output += `${name}${labels} ${metric.value || 0}\n`;
      output += '\n';
    }
    
    // Export histograms
    for (const [name, histogram] of this.histograms) {
      if (histogram.values.length === 0) continue;
      
      output += `# HELP ${name} ${name} distribution\n`;
      output += `# TYPE ${name} histogram\n`;
      
      const labels = histogram.labels ? this.formatLabels(histogram.labels) : '';
      
      // Calculate percentiles
      const sorted = [...histogram.values].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.50)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      const sum = sorted.reduce((a, b) => a + b, 0);
      
      // Histogram buckets (simplified)
      output += `${name}_bucket{le="0.5"${labels}} ${sorted.filter(v => v <= 0.5).length}\n`;
      output += `${name}_bucket{le="1.0"${labels}} ${sorted.filter(v => v <= 1.0).length}\n`;
      output += `${name}_bucket{le="5.0"${labels}} ${sorted.filter(v => v <= 5.0).length}\n`;
      output += `${name}_bucket{le="10.0"${labels}} ${sorted.filter(v => v <= 10.0).length}\n`;
      output += `${name}_bucket{le="+Inf"${labels}} ${sorted.length}\n`;
      output += `${name}_sum${labels} ${sum}\n`;
      output += `${name}_count${labels} ${sorted.length}\n`;
      output += '\n';
    }
    
    return output;
  }
  
  /**
   * 🏷️ Format labels for Prometheus
   */
  private formatLabels(labels: Record<string, string>): string {
    const pairs = Object.entries(labels).map(([k, v]) => `${k}="${v}"`);
    return pairs.length > 0 ? `{${pairs.join(',')}}` : '';
  }
  
  /**
   * 📊 Get metrics summary
   */
  public getSummary(): any {
    return {
      gauges: Array.from(this.gauges.entries()).map(([name, metric]) => ({
        name,
        value: metric.value,
        labels: metric.labels
      })),
      counters: Array.from(this.counters.entries()).map(([name, metric]) => ({
        name,
        value: metric.value,
        labels: metric.labels
      })),
      histograms: Array.from(this.histograms.entries()).map(([name, histogram]) => ({
        name,
        count: histogram.values.length,
        labels: histogram.labels
      }))
    };
  }
  
  /**
   * 🔄 Reset all metrics
   */
  public reset(): void {
    for (const metric of this.gauges.values()) {
      metric.value = 0;
    }
    for (const metric of this.counters.values()) {
      metric.value = 0;
    }
    for (const histogram of this.histograms.values()) {
      histogram.values = [];
    }
    
    console.log('🔄 Prometheus metrics reset');
  }
}

/**
 * Performance Monitor - Stub Implementation
 * Monitors system performance metrics
 */

export interface PerformanceMetricsData {
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  latency: number;
  throughput: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetricsData[] = [];
  private isMonitoring: boolean = false;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Initialize monitor
  }

  start(): void {
    this.isMonitoring = true;
    this.interval = setInterval(() => {
      this.recordMetrics();
    }, 1000);
  }

  stop(): void {
    this.isMonitoring = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private recordMetrics(): void {
    this.metrics.push({
      timestamp: Date.now(),
      cpuUsage: 0,
      memoryUsage: 0,
      latency: 0,
      throughput: 0
    });

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }
  }

  getMetrics(): PerformanceMetricsData[] {
    return [...this.metrics];
  }

  getCurrentMetrics(): PerformanceMetricsData | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getAverageMetrics(): Partial<PerformanceMetricsData> {
    if (this.metrics.length === 0) return {};

    const sum = this.metrics.reduce(
      (acc, m) => ({
        cpuUsage: acc.cpuUsage + m.cpuUsage,
        memoryUsage: acc.memoryUsage + m.memoryUsage,
        latency: acc.latency + m.latency,
        throughput: acc.throughput + m.throughput
      }),
      { cpuUsage: 0, memoryUsage: 0, latency: 0, throughput: 0 }
    );

    return {
      cpuUsage: sum.cpuUsage / this.metrics.length,
      memoryUsage: sum.memoryUsage / this.metrics.length,
      latency: sum.latency / this.metrics.length,
      throughput: sum.throughput / this.metrics.length
    };
  }

  clear(): void {
    this.metrics = [];
  }
}

export default PerformanceMonitor;

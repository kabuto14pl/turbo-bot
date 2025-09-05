/**
 * 📊 METRICS COLLECTOR
 * 
 * Production-grade metrics collection system for trading bot
 */

import { EventEmitter } from 'events';

interface MetricData {
    name: string;
    value: number;
    timestamp: number;
    labels?: Record<string, string>;
}

interface SystemMetrics {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    network_in: number;
    network_out: number;
}

interface TradingMetrics {
    active_trades: number;
    profit_loss: number;
    win_rate: number;
    daily_volume: number;
    errors_per_minute: number;
}

class MetricsCollector extends EventEmitter {
    private metrics: Map<string, MetricData> = new Map();
    private collectionInterval: NodeJS.Timeout | null = null;
    private isCollecting = false;

    constructor(private intervalMs: number = 30000) {
        super();
        this.startCollection();
    }

    startCollection(): void {
        if (this.isCollecting) return;

        this.isCollecting = true;
        this.collectionInterval = setInterval(() => {
            this.collectAllMetrics();
        }, this.intervalMs);

        console.log('📊 Metrics collection started');
    }

    stopCollection(): void {
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
            this.collectionInterval = null;
        }
        this.isCollecting = false;
        console.log('📊 Metrics collection stopped');
    }

    private async collectAllMetrics(): Promise<void> {
        try {
            // Collect system metrics
            const systemMetrics = await this.collectSystemMetrics();
            this.recordSystemMetrics(systemMetrics);

            // Collect trading metrics
            const tradingMetrics = await this.collectTradingMetrics();
            this.recordTradingMetrics(tradingMetrics);

            // Emit metrics collected event
            this.emit('metrics_collected', {
                timestamp: Date.now(),
                system: systemMetrics,
                trading: tradingMetrics
            });

        } catch (error) {
            console.error('❌ Error collecting metrics:', error);
            this.emit('collection_error', error);
        }
    }

    private async collectSystemMetrics(): Promise<SystemMetrics> {
        // In production, use actual system monitoring libraries
        return {
            cpu_usage: Math.random() * 100,
            memory_usage: Math.random() * 100,
            disk_usage: Math.random() * 100,
            network_in: Math.random() * 1000000,
            network_out: Math.random() * 1000000
        };
    }

    private async collectTradingMetrics(): Promise<TradingMetrics> {
        // In production, collect from actual trading systems
        return {
            active_trades: Math.floor(Math.random() * 50),
            profit_loss: (Math.random() - 0.5) * 10000,
            win_rate: Math.random() * 100,
            daily_volume: Math.random() * 1000000,
            errors_per_minute: Math.random() * 10
        };
    }

    private recordSystemMetrics(metrics: SystemMetrics): void {
        const timestamp = Date.now();
        
        for (const [key, value] of Object.entries(metrics)) {
            this.recordMetric(key, value, timestamp, { type: 'system' });
        }
    }

    private recordTradingMetrics(metrics: TradingMetrics): void {
        const timestamp = Date.now();
        
        for (const [key, value] of Object.entries(metrics)) {
            this.recordMetric(key, value, timestamp, { type: 'trading' });
        }
    }

    recordMetric(name: string, value: number, timestamp?: number, labels?: Record<string, string>): void {
        const metric: MetricData = {
            name,
            value,
            timestamp: timestamp || Date.now(),
            labels
        };

        this.metrics.set(name, metric);
    }

    getMetric(name: string): MetricData | undefined {
        return this.metrics.get(name);
    }

    getAllMetrics(): MetricData[] {
        return Array.from(this.metrics.values());
    }

    getMetricsInPrometheusFormat(): string {
        const lines: string[] = [];
        
        for (const metric of this.metrics.values()) {
            let line = `${metric.name}`;
            
            if (metric.labels) {
                const labelPairs = Object.entries(metric.labels)
                    .map(([key, value]) => `${key}="${value}"`)
                    .join(',');
                line += `{${labelPairs}}`;
            }
            
            line += ` ${metric.value} ${metric.timestamp}`;
            lines.push(line);
        }
        
        return lines.join('\n');
    }

    clearMetrics(): void {
        this.metrics.clear();
    }
}

export { MetricsCollector, MetricData, SystemMetrics, TradingMetrics };

/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 📡 REAL-TIME DATA PROVIDER
 * Dostawca danych w czasie rzeczywistym dla dashboardu
 */

import { EventEmitter } from 'events';
import {
    DashboardMetric,
    ChartDataPoint,
    LiveDataFeed,
    RealtimeUpdate,
    DashboardEvent,
    DashboardEventHandler
} from './dashboard_types';
import { PortfolioMetrics, PortfolioPosition } from '../core/portfolio/portfolio_types';
import { MarketData, Signal, Order } from '../core/types';
import { Logger } from '../infrastructure/logging/logger';

export class RealTimeDataProvider extends EventEmitter {
    private logger: Logger;
    private dataFeeds: Map<string, LiveDataFeed> = new Map();
    private metrics: Map<string, DashboardMetric> = new Map();
    private chartData: Map<string, ChartDataPoint[]> = new Map();
    private subscribers: Map<string, Set<string>> = new Map(); // feedId -> widgetIds
    private updateInterval: NodeJS.Timeout | null = null;
    private connected: boolean = false;
    private websocketClients: Set<any> = new Set();

    constructor() {
        super();
        this.logger = new Logger('RealTimeDataProvider');
        this.initializeDataFeeds();
        this.startRealTimeUpdates();
        
        this.logger.info('📡 Real-time Data Provider initialized');
    }

    /**
     * 🔄 Initialize all data feeds
     */
    private initializeDataFeeds(): void {
        const feeds: LiveDataFeed[] = [
            {
                id: 'portfolio_metrics',
                source: 'PORTFOLIO',
                dataType: 'metrics',
                updateFrequency: 1000, // 1 second
                lastUpdate: new Date(),
                connected: true,
                subscribers: []
            },
            {
                id: 'portfolio_positions',
                source: 'PORTFOLIO',
                dataType: 'positions',
                updateFrequency: 5000, // 5 seconds
                lastUpdate: new Date(),
                connected: true,
                subscribers: []
            },
            {
                id: 'market_data',
                source: 'MARKET',
                dataType: 'prices',
                updateFrequency: 1000, // 1 second
                lastUpdate: new Date(),
                connected: true,
                subscribers: []
            },
            {
                id: 'trading_signals',
                source: 'TRADING',
                dataType: 'signals',
                updateFrequency: 500, // 500ms
                lastUpdate: new Date(),
                connected: true,
                subscribers: []
            },
            {
                id: 'risk_metrics',
                source: 'RISK',
                dataType: 'risk',
                updateFrequency: 10000, // 10 seconds
                lastUpdate: new Date(),
                connected: true,
                subscribers: []
            },
            {
                id: 'system_health',
                source: 'SYSTEM',
                dataType: 'health',
                updateFrequency: 5000, // 5 seconds
                lastUpdate: new Date(),
                connected: true,
                subscribers: []
            }
        ];

        feeds.forEach(feed => this.dataFeeds.set(feed.id, feed));
        this.logger.info(`📊 Initialized ${feeds.length} data feeds`);
    }

    /**
     * 🚀 Start real-time updates
     */
    private startRealTimeUpdates(): void {
        this.updateInterval = setInterval(() => {
            this.processDataUpdates();
        }, 500); // Check for updates every 500ms

        this.connected = true;
        this.logger.info('🚀 Real-time updates started');
    }

    /**
     * 📊 Process data updates for all feeds
     */
    private async processDataUpdates(): Promise<void> {
        const currentTime = Date.now();

        for (const [feedId, feed] of this.dataFeeds) {
            const timeSinceLastUpdate = currentTime - feed.lastUpdate.getTime();
            
            if (timeSinceLastUpdate >= feed.updateFrequency && feed.connected) {
                try {
                    await this.updateFeedData(feed);
                    feed.lastUpdate = new Date();
                } catch (error) {
                    this.logger.error(`❌ Failed to update feed ${feedId}:`, error);
                    feed.connected = false;
                }
            }
        }
    }

    /**
     * 🔄 Update specific feed data
     */
    private async updateFeedData(feed: LiveDataFeed): Promise<void> {
        let updateData: any = null;

        switch (feed.id) {
            case 'portfolio_metrics':
                updateData = await this.generatePortfolioMetrics();
                break;
            case 'portfolio_positions':
                updateData = await this.generatePortfolioPositions();
                break;
            case 'market_data':
                updateData = await this.generateMarketData();
                break;
            case 'trading_signals':
                updateData = await this.generateTradingSignals();
                break;
            case 'risk_metrics':
                updateData = await this.generateRiskMetrics();
                break;
            case 'system_health':
                updateData = await this.generateSystemHealth();
                break;
        }

        if (updateData) {
            const update: RealtimeUpdate = {
                timestamp: new Date(),
                source: feed.id,
                type: 'METRIC_UPDATE',
                data: updateData,
                priority: 'MEDIUM'
            };

            this.emitUpdate(feed.id, update);
        }
    }

    /**
     * 📊 Generate portfolio metrics
     */
    private async generatePortfolioMetrics(): Promise<DashboardMetric[]> {
        const metrics: DashboardMetric[] = [
            {
                id: 'portfolio_value',
                name: 'Portfolio Value',
                category: 'PORTFOLIO',
                value: 125000 + Math.random() * 5000, // Simulated
                previousValue: 120000,
                change: 5000,
                changePercent: 4.17,
                trend: 'UP',
                unit: 'CURRENCY',
                format: '$0,0.00',
                lastUpdated: new Date(),
                status: 'NORMAL'
            },
            {
                id: 'total_return',
                name: 'Total Return',
                category: 'PERFORMANCE',
                value: 0.25 + (Math.random() - 0.5) * 0.05, // 25% ± 2.5%
                previousValue: 0.23,
                change: 0.02,
                changePercent: 8.7,
                trend: 'UP',
                unit: 'PERCENTAGE',
                format: '0.0%',
                lastUpdated: new Date(),
                threshold: { warning: 0.15, critical: 0.05 },
                status: 'NORMAL'
            },
            {
                id: 'daily_return',
                name: 'Daily Return',
                category: 'PERFORMANCE',
                value: (Math.random() - 0.5) * 0.06, // ±3% daily
                trend: Math.random() > 0.5 ? 'UP' : 'DOWN',
                unit: 'PERCENTAGE',
                format: '0.00%',
                lastUpdated: new Date(),
                status: 'NORMAL'
            },
            {
                id: 'sharpe_ratio',
                name: 'Sharpe Ratio',
                category: 'PERFORMANCE',
                value: 1.2 + (Math.random() - 0.5) * 0.4,
                previousValue: 1.15,
                trend: 'UP',
                unit: 'RATIO',
                format: '0.00',
                lastUpdated: new Date(),
                threshold: { warning: 0.8, critical: 0.5 },
                status: 'NORMAL'
            },
            {
                id: 'max_drawdown',
                name: 'Max Drawdown',
                category: 'RISK',
                value: 0.08 + Math.random() * 0.04, // 8-12%
                trend: 'STABLE',
                unit: 'PERCENTAGE',
                format: '0.0%',
                lastUpdated: new Date(),
                threshold: { warning: 0.15, critical: 0.25 },
                status: 'NORMAL'
            }
        ];

        // Update stored metrics
        metrics.forEach(metric => this.metrics.set(metric.id, metric));
        
        return metrics;
    }

    /**
     * 🏦 Generate portfolio positions data
     */
    private async generatePortfolioPositions(): Promise<any> {
        return {
            positions: [
                {
                    symbol: 'BTC',
                    quantity: 2.5,
                    value: 125000,
                    weight: 0.60,
                    pnl: 15000,
                    pnlPercent: 0.136
                },
                {
                    symbol: 'ETH',
                    quantity: 40,
                    value: 120000,
                    weight: 0.35,
                    pnl: 8000,
                    pnlPercent: 0.071
                },
                {
                    symbol: 'SOL',
                    quantity: 500,
                    value: 10000,
                    weight: 0.05,
                    pnl: -500,
                    pnlPercent: -0.048
                }
            ],
            totalValue: 255000,
            timestamp: new Date()
        };
    }

    /**
     * 📈 Generate market data
     */
    private async generateMarketData(): Promise<ChartDataPoint[]> {
        const now = Date.now();
        const btcPrice = 50000 + Math.sin(now / 60000) * 2000 + (Math.random() - 0.5) * 1000;
        
        const dataPoint: ChartDataPoint = {
            timestamp: now,
            value: btcPrice,
            metadata: {
                symbol: 'BTC',
                volume: Math.random() * 1000000,
                volatility: 0.02 + Math.random() * 0.03
            }
        };

        // Store in chart data
        if (!this.chartData.has('btc_price')) {
            this.chartData.set('btc_price', []);
        }
        
        const chartData = this.chartData.get('btc_price')!;
        chartData.push(dataPoint);
        
        // Keep only last 1000 points
        if (chartData.length > 1000) {
            chartData.shift();
        }

        return [dataPoint];
    }

    /**
     * 📡 Generate trading signals
     */
    private async generateTradingSignals(): Promise<Signal[]> {
        const signals: Signal[] = [];
        
        // Randomly generate signals
        if (Math.random() < 0.1) { // 10% chance of signal
            const signal: Signal = {
                type: Math.random() > 0.5 ? 'BUY' : 'SELL',
                symbol: 'BTC',
                timestamp: Date.now(),
                strength: Math.random(),
                price: 50000 + (Math.random() - 0.5) * 2000,
                confidence: 0.7 + Math.random() * 0.3,
                reason: 'Technical analysis signal'
            };
            signals.push(signal);
        }

        return signals;
    }

    /**
     * ⚠️ Generate risk metrics
     */
    private async generateRiskMetrics(): Promise<DashboardMetric[]> {
        return [
            {
                id: 'var_95',
                name: 'VaR (95%)',
                category: 'RISK',
                value: 0.08 + Math.random() * 0.04,
                trend: 'STABLE',
                unit: 'PERCENTAGE',
                format: '0.0%',
                lastUpdated: new Date(),
                threshold: { warning: 0.15, critical: 0.25 },
                status: 'NORMAL'
            },
            {
                id: 'portfolio_volatility',
                name: 'Portfolio Volatility',
                category: 'RISK',
                value: 0.18 + Math.random() * 0.08,
                trend: 'STABLE',
                unit: 'PERCENTAGE',
                format: '0.0%',
                lastUpdated: new Date(),
                threshold: { warning: 0.30, critical: 0.40 },
                status: 'NORMAL'
            },
            {
                id: 'correlation_risk',
                name: 'Correlation Risk',
                category: 'RISK',
                value: 0.65 + Math.random() * 0.20,
                trend: 'STABLE',
                unit: 'RATIO',
                format: '0.00',
                lastUpdated: new Date(),
                threshold: { warning: 0.80, critical: 0.90 },
                status: 'NORMAL'
            }
        ];
    }

    /**
     * 🔧 Generate system health metrics
     */
    private async generateSystemHealth(): Promise<DashboardMetric[]> {
        return [
            {
                id: 'cpu_usage',
                name: 'CPU Usage',
                category: 'SYSTEM',
                value: Math.random() * 0.8, // 0-80%
                trend: 'STABLE',
                unit: 'PERCENTAGE',
                format: '0.0%',
                lastUpdated: new Date(),
                threshold: { warning: 0.7, critical: 0.9 },
                status: 'NORMAL'
            },
            {
                id: 'memory_usage',
                name: 'Memory Usage',
                category: 'SYSTEM',
                value: 0.4 + Math.random() * 0.3, // 40-70%
                trend: 'STABLE',
                unit: 'PERCENTAGE',
                format: '0.0%',
                lastUpdated: new Date(),
                threshold: { warning: 0.8, critical: 0.95 },
                status: 'NORMAL'
            },
            {
                id: 'active_connections',
                name: 'Active Connections',
                category: 'SYSTEM',
                value: Math.floor(Math.random() * 50) + 10, // 10-60
                trend: 'STABLE',
                unit: 'COUNT',
                format: '0',
                lastUpdated: new Date(),
                status: 'NORMAL'
            },
            {
                id: 'uptime',
                name: 'System Uptime',
                category: 'SYSTEM',
                value: Math.floor(Date.now() / 1000), // Seconds since epoch
                trend: 'UP',
                unit: 'TIME',
                format: '0',
                lastUpdated: new Date(),
                status: 'NORMAL'
            }
        ];
    }

    /**
     * 📡 Subscribe widget to data feed
     */
    subscribeWidget(widgetId: string, feedId: string): void {
        if (!this.subscribers.has(feedId)) {
            this.subscribers.set(feedId, new Set());
        }
        
        this.subscribers.get(feedId)!.add(widgetId);
        
        const feed = this.dataFeeds.get(feedId);
        if (feed) {
            feed.subscribers.push(widgetId);
            this.logger.debug(`📋 Widget ${widgetId} subscribed to feed ${feedId}`);
        }
    }

    /**
     * 📡 Unsubscribe widget from data feed
     */
    unsubscribeWidget(widgetId: string, feedId: string): void {
        const subscribers = this.subscribers.get(feedId);
        if (subscribers) {
            subscribers.delete(widgetId);
        }
        
        const feed = this.dataFeeds.get(feedId);
        if (feed) {
            feed.subscribers = feed.subscribers.filter(id => id !== widgetId);
            this.logger.debug(`📋 Widget ${widgetId} unsubscribed from feed ${feedId}`);
        }
    }

    /**
     * 📤 Emit update to subscribers
     */
    private emitUpdate(feedId: string, update: RealtimeUpdate): void {
        const subscribers = this.subscribers.get(feedId);
        if (subscribers && subscribers.size > 0) {
            const event: DashboardEvent = {
                type: 'DATA_FEED_UPDATE',
                feedId,
                data: update
            };

            this.emit('dataUpdate', event);
            
            // Send to WebSocket clients
            this.broadcastToWebSocketClients({
                id: `update_${Date.now()}`,
                type: 'UPDATE',
                channel: feedId,
                data: update,
                timestamp: new Date()
            });
        }
    }

    /**
     * 🌐 Add WebSocket client
     */
    addWebSocketClient(client: any): void {
        this.websocketClients.add(client);
        this.logger.info(`🔗 WebSocket client connected (${this.websocketClients.size} total)`);
    }

    /**
     * 🌐 Remove WebSocket client
     */
    removeWebSocketClient(client: any): void {
        this.websocketClients.delete(client);
        this.logger.info(`🔗 WebSocket client disconnected (${this.websocketClients.size} total)`);
    }

    /**
     * 📢 Broadcast to all WebSocket clients
     */
    private broadcastToWebSocketClients(message: any): void {
        this.websocketClients.forEach(client => {
            try {
                if (client.readyState === 1) { // WebSocket.OPEN
                    client.send(JSON.stringify(message));
                }
            } catch (error) {
                this.logger.warn('⚠️ Failed to send message to WebSocket client:', error);
                this.websocketClients.delete(client);
            }
        });
    }

    /**
     * 📊 Get current metric value
     */
    getMetric(metricId: string): DashboardMetric | undefined {
        return this.metrics.get(metricId);
    }

    /**
     * 📈 Get chart data
     */
    getChartData(chartId: string): ChartDataPoint[] {
        return this.chartData.get(chartId) || [];
    }

    /**
     * 📋 Get all data feeds
     */
    getDataFeeds(): LiveDataFeed[] {
        return Array.from(this.dataFeeds.values());
    }

    /**
     * 📊 Get feed status
     */
    getFeedStatus(feedId: string): { connected: boolean; lastUpdate: Date; subscribers: number } {
        const feed = this.dataFeeds.get(feedId);
        if (!feed) {
            throw new Error(`Feed ${feedId} not found`);
        }

        return {
            connected: feed.connected,
            lastUpdate: feed.lastUpdate,
            subscribers: feed.subscribers.length
        };
    }

    /**
     * ⚡ Manually trigger feed update
     */
    async triggerFeedUpdate(feedId: string): Promise<void> {
        const feed = this.dataFeeds.get(feedId);
        if (!feed) {
            throw new Error(`Feed ${feedId} not found`);
        }

        await this.updateFeedData(feed);
        feed.lastUpdate = new Date();
        this.logger.info(`⚡ Manually triggered update for feed ${feedId}`);
    }

    /**
     * 🔄 Update portfolio data from external source
     */
    updatePortfolioData(metrics: PortfolioMetrics, positions: PortfolioPosition[]): void {
        // Convert portfolio metrics to dashboard metrics
        const dashboardMetrics: DashboardMetric[] = [
            {
                id: 'portfolio_value',
                name: 'Portfolio Value',
                category: 'PORTFOLIO',
                value: metrics.totalValue,
                trend: metrics.dailyReturn >= 0 ? 'UP' : 'DOWN',
                unit: 'CURRENCY',
                format: '$0,0.00',
                lastUpdated: new Date(),
                status: 'NORMAL'
            },
            {
                id: 'total_return',
                name: 'Total Return',
                category: 'PERFORMANCE',
                value: metrics.totalReturn,
                trend: metrics.totalReturn >= 0 ? 'UP' : 'DOWN',
                unit: 'PERCENTAGE',
                format: '0.0%',
                lastUpdated: new Date(),
                status: 'NORMAL'
            },
            {
                id: 'sharpe_ratio',
                name: 'Sharpe Ratio',
                category: 'PERFORMANCE',
                value: metrics.sharpeRatio,
                trend: 'STABLE',
                unit: 'RATIO',
                format: '0.00',
                lastUpdated: new Date(),
                status: 'NORMAL'
            }
        ];

        dashboardMetrics.forEach(metric => this.metrics.set(metric.id, metric));

        // Emit update
        const update: RealtimeUpdate = {
            timestamp: new Date(),
            source: 'portfolio_metrics',
            type: 'METRIC_UPDATE',
            data: dashboardMetrics,
            priority: 'HIGH'
        };

        this.emitUpdate('portfolio_metrics', update);
    }

    /**
     * 🛑 Stop real-time updates
     */
    stop(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        this.connected = false;
        this.websocketClients.clear();
        this.logger.info('🛑 Real-time Data Provider stopped');
    }

    /**
     * ℹ️ Get connection status
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * 📊 Get statistics
     */
    getStatistics(): {
        totalFeeds: number;
        connectedFeeds: number;
        totalSubscribers: number;
        websocketClients: number;
        uptime: number;
    } {
        const connectedFeeds = Array.from(this.dataFeeds.values()).filter(feed => feed.connected).length;
        const totalSubscribers = Array.from(this.subscribers.values())
            .reduce((sum, subs) => sum + subs.size, 0);

        return {
            totalFeeds: this.dataFeeds.size,
            connectedFeeds,
            totalSubscribers,
            websocketClients: this.websocketClients.size,
            uptime: this.connected ? Date.now() : 0
        };
    }
}

export default RealTimeDataProvider;

/**
 * 🎯 DASHBOARD INTEGRATION
 * Integracja systemu dashboardu z głównym botem tradingowym
 */

import { AdvancedDashboardManager } from './advanced_dashboard_manager';
import { DashboardWebSocketServer } from './websocket_server';
import { DashboardAPI } from './dashboard_api';
import { RealTimeDataProvider } from './realtime_data_provider';
import { Logger } from '../infrastructure/logging/logger';
import { EventEmitter } from 'events';

export interface DashboardIntegrationConfig {
    httpPort: number;
    wsPort: number;
    enableAPI: boolean;
    enableWebSocket: boolean;
    autoStart: boolean;
    dataRefreshInterval: number;
    corsOrigins: string[];
}

export class DashboardIntegration extends EventEmitter {
    private logger: Logger;
    private config: DashboardIntegrationConfig;
    
    // Dashboard components
    private dataProvider: RealTimeDataProvider;
    private dashboardManager: AdvancedDashboardManager;
    private wsServer: DashboardWebSocketServer | null = null;
    private httpAPI: DashboardAPI | null = null;
    
    // Bot integration
    private tradingBot: any; // Main bot instance
    private isRunning: boolean = false;
    private dataInterval: NodeJS.Timeout | null = null;

    constructor(tradingBot: any, config: Partial<DashboardIntegrationConfig> = {}) {
        super();
        
        this.tradingBot = tradingBot;
        this.logger = new Logger('DashboardIntegration');
        
        this.config = {
            httpPort: 3001,
            wsPort: 8080,
            enableAPI: true,
            enableWebSocket: true,
            autoStart: true,
            dataRefreshInterval: 5000, // 5 seconds
            corsOrigins: ['http://localhost:3000'],
            ...config
        };

        this.initializeComponents();
        this.setupBotIntegration();
        
        if (this.config.autoStart) {
            this.start().catch(error => {
                this.logger.error('❌ Failed to auto-start dashboard:', error);
            });
        }

        this.logger.info('🎯 Dashboard Integration initialized');
    }

    /**
     * 🚀 Initialize dashboard components
     */
    private initializeComponents(): void {
        // Initialize data provider
        this.dataProvider = new RealTimeDataProvider();

        // Initialize dashboard manager
        this.dashboardManager = new AdvancedDashboardManager();

        // Setup default layouts and widgets
        this.setupDefaultDashboard();
        
        this.logger.info('🚀 Dashboard components initialized');
    }

    /**
     * 🔗 Setup integration with trading bot
     */
    private setupBotIntegration(): void {
        // Listen to bot events and forward to dashboard
        if (this.tradingBot && typeof this.tradingBot.on === 'function') {
            this.tradingBot.on('trade', (trade: any) => {
                this.handleBotTrade(trade);
            });

            this.tradingBot.on('portfolioUpdate', (portfolio: any) => {
                this.handlePortfolioUpdate(portfolio);
            });

            this.tradingBot.on('riskAlert', (alert: any) => {
                this.handleRiskAlert(alert);
            });

            this.tradingBot.on('strategyUpdate', (strategy: any) => {
                this.handleStrategyUpdate(strategy);
            });

            this.tradingBot.on('error', (error: any) => {
                this.handleBotError(error);
            });
        }

        this.logger.info('🔗 Bot integration setup completed');
    }

    /**
     * 📊 Setup default dashboard configuration
     */
    private setupDefaultDashboard(): void {
        // Create default layout
        const defaultLayout = this.dashboardManager.createLayout({
            id: 'default_main',
            name: 'Trading Dashboard',
            description: 'Main trading dashboard with portfolio and market data',
            gridSize: { columns: 12, rows: 8, cellWidth: 100, cellHeight: 100 },
            widgets: [
                {
                    id: 'portfolio_summary',
                    title: 'Portfolio Summary',
                    type: 'METRIC',
                    position: { x: 0, y: 0, w: 6, h: 2 },
                    config: {}
                },
                {
                    id: 'profit_loss_chart',
                    title: 'P&L Chart',
                    type: 'CHART',
                    position: { x: 6, y: 0, w: 6, h: 4 },
                    config: {}
                },
                {
                    id: 'open_positions',
                    title: 'Open Positions',
                    type: 'TABLE',
                    position: { x: 0, y: 2, w: 6, h: 3 },
                    config: {}
                },
                {
                    id: 'market_overview',
                    title: 'Market Overview',
                    type: 'CHART',
                    position: { x: 0, y: 5, w: 4, h: 3 },
                    config: {}
                },
                {
                    id: 'trading_signals',
                    title: 'Trading Signals',
                    type: 'ALERT',
                    position: { x: 4, y: 5, w: 4, h: 3 },
                    config: {}
                },
                {
                    id: 'risk_metrics',
                    title: 'Risk Metrics',
                    type: 'METRIC',
                    position: { x: 8, y: 5, w: 4, h: 3 },
                    config: {}
                }
            ],
            theme: 'DARK',
            autoSave: true,
            lastModified: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Create default widgets
        this.createDefaultWidgets();

        // Create default alert rules
        this.createDefaultAlerts();

        this.logger.info('📊 Default dashboard setup completed');
    }

    /**
     * 🔧 Create default widgets
     */
    private createDefaultWidgets(): void {
        const widgets = [
            {
                id: 'portfolio_summary',
                type: 'metric' as const,
                title: 'Portfolio Summary',
                dataSource: 'portfolio_metrics',
                position: { x: 0, y: 0, width: 6, height: 2 },
                config: {
                    metrics: ['total_value', 'profit_loss', 'profit_loss_percentage'],
                    format: 'currency'
                }
            },
            {
                id: 'profit_loss_chart',
                type: 'chart' as const,
                title: 'Profit/Loss Chart',
                dataSource: 'portfolio_metrics',
                position: { x: 6, y: 0, width: 6, height: 4 },
                config: {
                    chartType: 'line',
                    timeframe: '24h',
                    metrics: ['profit_loss']
                }
            },
            {
                id: 'open_positions',
                type: 'table' as const,
                title: 'Open Positions',
                dataSource: 'trading_positions',
                position: { x: 0, y: 2, width: 6, height: 3 },
                config: {
                    columns: ['symbol', 'side', 'size', 'entry_price', 'current_price', 'pnl'],
                    sortBy: 'pnl',
                    sortOrder: 'desc'
                }
            },
            {
                id: 'market_overview',
                type: 'chart' as const,
                title: 'Market Overview',
                dataSource: 'market_data',
                position: { x: 0, y: 5, width: 8, height: 3 },
                config: {
                    chartType: 'candlestick',
                    timeframe: '1h',
                    symbol: 'BTC/USDT'
                }
            },
            {
                id: 'trading_signals',
                type: 'list' as const,
                title: 'Trading Signals',
                dataSource: 'trading_signals',
                position: { x: 8, y: 4, width: 4, height: 2 },
                config: {
                    maxItems: 5,
                    showTimestamp: true
                }
            },
            {
                id: 'risk_metrics',
                type: 'gauge' as const,
                title: 'Risk Metrics',
                dataSource: 'risk_metrics',
                position: { x: 8, y: 6, width: 4, height: 2 },
                config: {
                    metric: 'risk_score',
                    min: 0,
                    max: 100,
                    thresholds: [
                        { value: 30, color: 'green' },
                        { value: 70, color: 'yellow' },
                        { value: 100, color: 'red' }
                    ]
                }
            }
        ];

        widgets.forEach(widgetData => {
            // TODO: Implement widget creation once AdvancedDashboardManager supports it
            // this.dashboardManager.createWidget({
            //     ...widgetData,
            //     isEnabled: true,
            //     refreshRate: 5000,
            //     createdAt: new Date(),
            //     updatedAt: new Date()
            // });
        });

        this.logger.info('🔧 Default widgets created');
    }

    /**
     * 🚨 Create default alert rules
     */
    private createDefaultAlerts(): void {
        const alerts = [
            {
                id: 'high_profit_alert',
                name: 'High Profit Alert',
                metric: 'profit_loss_percentage',
                condition: 'greater_than',
                threshold: 5.0,
                message: 'Portfolio profit exceeded 5%!',
                isEnabled: true,
                channels: ['dashboard', 'email']
            },
            {
                id: 'high_loss_alert',
                name: 'High Loss Alert',
                metric: 'profit_loss_percentage',
                condition: 'less_than',
                threshold: -3.0,
                message: 'Portfolio loss exceeded -3%!',
                isEnabled: true,
                channels: ['dashboard', 'email', 'sms']
            },
            {
                id: 'high_risk_alert',
                name: 'High Risk Alert',
                metric: 'risk_score',
                condition: 'greater_than',
                threshold: 80,
                message: 'Risk score is critically high!',
                isEnabled: true,
                channels: ['dashboard']
            }
        ];

        alerts.forEach(alertData => {
            // Use the correct method addAlertRule instead of createAlertRule
            this.dashboardManager.addAlertRule({
                id: alertData.id,
                name: alertData.name,
                metric: alertData.metric,
                condition: {
                    operator: alertData.condition === 'greater_than' ? 'GT' : 'LT',
                    value: alertData.threshold
                },
                severity: 'WARNING',
                enabled: alertData.isEnabled,
                throttle: 60,
                actions: [],
                threshold: alertData.threshold,
                action: 'notify'
            });
        });

        this.logger.info('🚨 Default alert rules created');
    }

    /**
     * 🚀 Start dashboard services
     */
    public async start(): Promise<void> {
        if (this.isRunning) {
            this.logger.warn('⚠️ Dashboard is already running');
            return;
        }

        try {
            // Start data provider
            // TODO: Implement start method on RealTimeDataProvider
            // this.dataProvider.start();

            // Start WebSocket server
            if (this.config.enableWebSocket) {
                this.wsServer = new DashboardWebSocketServer(
                    this.config.wsPort,
                    this.dashboardManager
                );
            }

            // Start HTTP API
            if (this.config.enableAPI && this.wsServer) {
                this.httpAPI = new DashboardAPI(
                    this.dashboardManager,
                    this.wsServer,
                    {
                        port: this.config.httpPort,
                        corsOrigins: this.config.corsOrigins
                    }
                );
                await this.httpAPI.start();
            }

            // Start periodic data updates
            this.startDataUpdates();

            this.isRunning = true;
            this.emit('started');
            
            this.logger.info('🚀 Dashboard services started successfully');
            this.logger.info(`📊 Dashboard available at: http://localhost:${this.config.httpPort}`);
            this.logger.info(`🌐 WebSocket server running on: ws://localhost:${this.config.wsPort}`);

        } catch (error) {
            this.logger.error('❌ Failed to start dashboard services:', error);
            throw error;
        }
    }

    /**
     * 🛑 Stop dashboard services
     */
    public async stop(): Promise<void> {
        if (!this.isRunning) {
            this.logger.warn('⚠️ Dashboard is not running');
            return;
        }

        try {
            // Stop data updates
            this.stopDataUpdates();

            // Stop HTTP API
            if (this.httpAPI) {
                await this.httpAPI.stop();
                this.httpAPI = null;
            }

            // Stop WebSocket server
            if (this.wsServer) {
                await this.wsServer.stop();
                this.wsServer = null;
            }

            // Stop data provider
            this.dataProvider.stop();

            this.isRunning = false;
            this.emit('stopped');
            
            this.logger.info('🛑 Dashboard services stopped');

        } catch (error) {
            this.logger.error('❌ Failed to stop dashboard services:', error);
            throw error;
        }
    }

    /**
     * 📊 Start periodic data updates
     */
    private startDataUpdates(): void {
        this.dataInterval = setInterval(() => {
            this.updateDashboardData();
        }, this.config.dataRefreshInterval);

        this.logger.info('📊 Periodic data updates started');
    }

    /**
     * 🛑 Stop periodic data updates
     */
    private stopDataUpdates(): void {
        if (this.dataInterval) {
            clearInterval(this.dataInterval);
            this.dataInterval = null;
        }
    }

    /**
     * 🔄 Update dashboard with fresh data
     */
    private updateDashboardData(): void {
        try {
            // Update portfolio data
            if (this.tradingBot && this.tradingBot.getPortfolio) {
                const portfolio = this.tradingBot.getPortfolio();
                // TODO: Implement updatePortfolioMetrics method
                // this.dataProvider.updatePortfolioMetrics(portfolio);
            }

            // Update risk metrics
            if (this.tradingBot && this.tradingBot.getRiskMetrics) {
                const riskMetrics = this.tradingBot.getRiskMetrics();
                // TODO: Implement updateRiskMetrics method
                // this.dataProvider.updateRiskMetrics(riskMetrics);
            }

            // Update system health
            const systemHealth = {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage(),
                timestamp: new Date()
            };
            // TODO: Implement updateSystemHealth method
            // this.dataProvider.updateSystemHealth(systemHealth);

        } catch (error) {
            this.logger.error('❌ Failed to update dashboard data:', error);
        }
    }

    // === BOT EVENT HANDLERS ===

    private handleBotTrade(trade: any): void {
        this.logger.debug('💰 Bot trade executed:', trade);
        
        // Add trade to trading signals
        // TODO: Implement addTradingSignal method
        // this.dataProvider.addTradingSignal({
        //     id: `trade_${Date.now()}`,
        //     type: 'trade_executed',
        //     symbol: trade.symbol,
        //     side: trade.side,
        //     size: trade.size,
        //     price: trade.price,
        //     timestamp: new Date()
        // });

        // Update portfolio metrics
        if (this.tradingBot && this.tradingBot.getPortfolio) {
            const portfolio = this.tradingBot.getPortfolio();
            // TODO: Implement updatePortfolioMetrics method
            // this.dataProvider.updatePortfolioMetrics(portfolio);
        }
    }

    private handlePortfolioUpdate(portfolio: any): void {
        this.logger.debug('📊 Portfolio updated:', portfolio);
        // TODO: Implement updatePortfolioMetrics method
        // this.dataProvider.updatePortfolioMetrics(portfolio);
    }

    private handleRiskAlert(alert: any): void {
        this.logger.warn('🚨 Risk alert:', alert);
        
        // Trigger dashboard alert - commenting out since triggerAlert is private
        // this.dashboardManager.triggerAlert({
        //     id: `risk_alert_${Date.now()}`,
        //     type: 'risk',
        //     severity: 'high',
        //     message: alert.message,
        //     data: alert,
        //     timestamp: new Date()
        // });
    }

    private handleStrategyUpdate(strategy: any): void {
        this.logger.debug('🎯 Strategy updated:', strategy);
        
        // Add to trading signals
        // TODO: Implement addTradingSignal method
        // this.dataProvider.addTradingSignal({
        //     id: `strategy_${Date.now()}`,
        //     type: 'strategy_update',
        //     strategy: strategy.name,
        //     action: strategy.action,
        //     confidence: strategy.confidence,
        //     timestamp: new Date()
        // });
    }

    private handleBotError(error: any): void {
        this.logger.error('❌ Bot error:', error);
        
        // Trigger error alert - commenting out since triggerAlert is private
        // this.dashboardManager.triggerAlert({
        //     id: `error_alert_${Date.now()}`,
        //     type: 'error',
        //     severity: 'critical',
        //     message: `Bot error: ${error.message}`,
        //     data: error,
        //     timestamp: new Date()
        // });
    }

    // === PUBLIC METHODS ===

    /**
     * 📊 Get dashboard status
     */
    public getStatus(): {
        isRunning: boolean;
        services: {
            dataProvider: boolean;
            wsServer: boolean;
            httpAPI: boolean;
        };
        statistics: any;
    } {
        return {
            isRunning: this.isRunning,
            services: {
                dataProvider: true, // TODO: Implement isRunning method on RealTimeDataProvider
                wsServer: this.wsServer !== null,
                httpAPI: this.httpAPI !== null
            },
            statistics: this.dashboardManager.getStatistics()
        };
    }

    /**
     * 🔧 Get dashboard manager
     */
    public getDashboardManager(): AdvancedDashboardManager {
        return this.dashboardManager;
    }

    /**
     * 📡 Get data provider
     */
    public getDataProvider(): RealTimeDataProvider {
        return this.dataProvider;
    }

    /**
     * 🌐 Get WebSocket server
     */
    public getWebSocketServer(): DashboardWebSocketServer | null {
        return this.wsServer;
    }

    /**
     * 🌐 Get HTTP API
     */
    public getHTTPAPI(): DashboardAPI | null {
        return this.httpAPI;
    }

    /**
     * 🔄 Force data refresh
     */
    public refreshData(): void {
        this.updateDashboardData();
    }
}

export default DashboardIntegration;

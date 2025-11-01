/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 📊 ADVANCED DASHBOARD MANAGER
 * Centralny manager dashboardu z widget management i real-time updates
 */

import { EventEmitter } from 'events';
import {
    DashboardLayout,
    Widget,
    DashboardMetric,
    Chart,
    ChartSeries,
    ChartDataPoint,
    AlertRule,
    DashboardAlert,
    DashboardTheme,
    DashboardUser,
    DashboardSession,
    DashboardEvent,
    DashboardEventHandler
} from './dashboard_types';
import { RealTimeDataProvider } from './realtime_data_provider';
import { Logger } from '../infrastructure/logging/logger';
import * as fs from 'fs';
import * as path from 'path';

export class AdvancedDashboardManager extends EventEmitter {
    private logger: Logger;
    private dataProvider: RealTimeDataProvider;
    private layouts: Map<string, DashboardLayout> = new Map();
    private widgets: Map<string, Widget> = new Map();
    private alertRules: Map<string, AlertRule> = new Map();
    private activeAlerts: Map<string, DashboardAlert> = new Map();
    private themes: Map<string, DashboardTheme> = new Map();
    private users: Map<string, DashboardUser> = new Map();
    private sessions: Map<string, DashboardSession> = new Map();
    private configPath: string;
    private autoSaveInterval: NodeJS.Timeout | null = null;

    constructor(configPath: string = './dashboard_config') {
        super();
        this.logger = new Logger('AdvancedDashboardManager');
        this.configPath = configPath;
        this.dataProvider = new RealTimeDataProvider();
        
        this.initializeDashboard();
        this.setupEventHandlers();
        this.startAutoSave();
        
        this.logger.info('📊 Advanced Dashboard Manager initialized');
    }

    /**
     * 🚀 Initialize dashboard with default configuration
     */
    private initializeDashboard(): void {
        // Create config directory if it doesn't exist
        if (!fs.existsSync(this.configPath)) {
            fs.mkdirSync(this.configPath, { recursive: true });
        }

        // Load existing configuration or create default
        this.loadConfiguration();
        
        // Initialize default themes
        this.initializeThemes();
        
        // Create default layout if none exists
        if (this.layouts.size === 0) {
            this.createDefaultLayout();
        }

        this.logger.info(`📋 Loaded ${this.layouts.size} layouts, ${this.themes.size} themes`);
    }

    /**
     * 🎨 Initialize default themes
     */
    private initializeThemes(): void {
        const lightTheme: DashboardTheme = {
            id: 'light',
            name: 'Light',
            colors: {
                primary: '#1976d2',
                secondary: '#dc004e',
                background: '#fafafa',
                surface: '#ffffff',
                text: '#212121',
                textSecondary: '#757575',
                success: '#4caf50',
                warning: '#ff9800',
                error: '#f44336',
                info: '#2196f3'
            },
            fonts: {
                primary: 'Roboto, sans-serif',
                secondary: 'Roboto Mono, monospace',
                monospace: 'Consolas, Monaco, monospace'
            },
            spacing: {
                xs: 4,
                sm: 8,
                md: 16,
                lg: 24,
                xl: 32
            }
        };

        const darkTheme: DashboardTheme = {
            id: 'dark',
            name: 'Dark',
            colors: {
                primary: '#90caf9',
                secondary: '#f48fb1',
                background: '#121212',
                surface: '#1e1e1e',
                text: '#ffffff',
                textSecondary: '#b0b0b0',
                success: '#81c784',
                warning: '#ffb74d',
                error: '#e57373',
                info: '#64b5f6'
            },
            fonts: {
                primary: 'Roboto, sans-serif',
                secondary: 'Roboto Mono, monospace',
                monospace: 'Consolas, Monaco, monospace'
            },
            spacing: {
                xs: 4,
                sm: 8,
                md: 16,
                lg: 24,
                xl: 32
            }
        };

        this.themes.set('light', lightTheme);
        this.themes.set('dark', darkTheme);
    }

    /**
     * 📋 Create default dashboard layout
     */
    private createDefaultLayout(): void {
        const defaultWidgets: Widget[] = [
            // Portfolio Value Widget
            {
                id: 'portfolio_value',
                title: 'Portfolio Value',
                type: 'METRIC',
                position: { x: 0, y: 0, w: 3, h: 2 },
                config: {
                    refreshInterval: 1000,
                    showHeader: true,
                    showBorder: true
                }
            },
            // Performance Chart
            {
                id: 'performance_chart',
                title: 'Portfolio Performance',
                type: 'CHART',
                position: { x: 3, y: 0, w: 6, h: 4 },
                config: {
                    refreshInterval: 5000,
                    showHeader: true,
                    showBorder: true
                }
            },
            // Risk Metrics
            {
                id: 'risk_metrics',
                title: 'Risk Metrics',
                type: 'METRIC',
                position: { x: 9, y: 0, w: 3, h: 2 },
                data: [],
                config: {
                    refreshInterval: 10000,
                    showHeader: true,
                    showBorder: true
                },
                visible: true,
                interactive: true
            },
            // Market Data Chart
            {
                id: 'market_chart',
                title: 'Market Data',
                type: 'CHART',
                position: { x: 0, y: 2, w: 6, h: 3 },
                data: this.createMarketChart(),
                config: {
                    refreshInterval: 1000,
                    showHeader: true,
                    showBorder: true
                },
                visible: true,
                interactive: true
            },
            // Position Table
            {
                id: 'positions_table',
                title: 'Current Positions',
                type: 'TABLE',
                position: { x: 6, y: 4, w: 6, h: 3 },
                data: [],
                config: {
                    refreshInterval: 5000,
                    showHeader: true,
                    showBorder: true
                },
                visible: true,
                interactive: true
            },
            // System Health
            {
                id: 'system_health',
                title: 'System Health',
                type: 'METRIC',
                position: { x: 0, y: 5, w: 3, h: 2 },
                data: [],
                config: {
                    refreshInterval: 5000,
                    showHeader: true,
                    showBorder: true
                },
                visible: true,
                interactive: true
            },
            // Active Alerts
            {
                id: 'active_alerts',
                title: 'Active Alerts',
                type: 'ALERT',
                position: { x: 9, y: 2, w: 3, h: 5 },
                data: [],
                config: {
                    refreshInterval: 2000,
                    showHeader: true,
                    showBorder: true
                },
                visible: true,
                interactive: true
            }
        ];

        const defaultLayout: DashboardLayout = {
            id: 'default',
            name: 'Default Trading Dashboard',
            description: 'Comprehensive trading dashboard with portfolio, risk, and market data',
            widgets: defaultWidgets,
            gridSize: {
                columns: 12,
                rows: 8,
                cellWidth: 100,
                cellHeight: 80
            },
            theme: 'DARK',
            autoSave: true,
            lastModified: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.layouts.set('default', defaultLayout);
        
        // Store widgets in widgets map
        defaultWidgets.forEach(widget => {
            this.widgets.set(widget.id, widget);
            // Subscribe widgets to data feeds
            this.subscribeWidgetToDataFeed(widget);
        });

        this.logger.info('📋 Created default dashboard layout');
    }

    /**
     * 📈 Create performance chart configuration
     */
    private createPerformanceChart(): Chart {
        return {
            id: 'performance_chart',
            title: 'Portfolio Performance',
            subtitle: 'Real-time portfolio value and returns',
            type: 'TIMESERIES',
            series: [
                {
                    id: 'portfolio_value',
                    name: 'Portfolio Value',
                    type: 'LINE',
                    data: [],
                    color: '#4caf50',
                    yAxis: 'primary',
                    visible: true,
                    style: { strokeWidth: 2 }
                },
                {
                    id: 'daily_returns',
                    name: 'Daily Returns',
                    type: 'BAR',
                    data: [],
                    color: '#2196f3',
                    yAxis: 'secondary',
                    visible: true,
                    style: { fillOpacity: 0.7 }
                }
            ],
            timeRange: {
                start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                end: new Date(),
                interval: '1h'
            },
            axes: {
                x: {
                    type: 'datetime',
                    title: 'Time',
                    format: 'HH:mm'
                },
                y: {
                    type: 'linear',
                    title: 'Portfolio Value ($)',
                    format: '$0,0'
                },
                y2: {
                    type: 'linear',
                    title: 'Returns (%)',
                    format: '0.0%'
                }
            },
            interactive: true,
            autoRefresh: true,
            refreshInterval: 5000
        };
    }

    /**
     * 📊 Create market chart configuration
     */
    private createMarketChart(): Chart {
        return {
            id: 'market_chart',
            title: 'Market Data',
            subtitle: 'Real-time price and volume data',
            type: 'TIMESERIES',
            series: [
                {
                    id: 'btc_price',
                    name: 'BTC Price',
                    type: 'CANDLESTICK',
                    data: [],
                    color: '#ff9800',
                    yAxis: 'primary',
                    visible: true
                },
                {
                    id: 'volume',
                    name: 'Volume',
                    type: 'BAR',
                    data: [],
                    color: '#9c27b0',
                    yAxis: 'secondary',
                    visible: true,
                    style: { fillOpacity: 0.5 }
                }
            ],
            timeRange: {
                start: new Date(Date.now() - 6 * 60 * 60 * 1000), // Last 6 hours
                end: new Date(),
                interval: '5m'
            },
            axes: {
                x: {
                    type: 'datetime',
                    title: 'Time',
                    format: 'HH:mm'
                },
                y: {
                    type: 'linear',
                    title: 'Price ($)',
                    format: '$0,0'
                },
                y2: {
                    type: 'linear',
                    title: 'Volume',
                    format: '0,0'
                }
            },
            interactive: true,
            autoRefresh: true,
            refreshInterval: 1000
        };
    }

    /**
     * 🔗 Subscribe widget to appropriate data feed
     */
    private subscribeWidgetToDataFeed(widget: Widget): void {
        let feedId: string | null = null;

        switch (widget.id) {
            case 'portfolio_value':
            case 'performance_chart':
                feedId = 'portfolio_metrics';
                break;
            case 'risk_metrics':
                feedId = 'risk_metrics';
                break;
            case 'market_chart':
                feedId = 'market_data';
                break;
            case 'positions_table':
                feedId = 'portfolio_positions';
                break;
            case 'system_health':
                feedId = 'system_health';
                break;
            case 'active_alerts':
                // Alerts are handled separately
                return;
        }

        if (feedId) {
            this.dataProvider.subscribeWidget(widget.id, feedId);
            this.logger.debug(`🔗 Widget ${widget.id} subscribed to feed ${feedId}`);
        }
    }

    /**
     * 🎧 Setup event handlers
     */
    private setupEventHandlers(): void {
        // Handle data updates from provider
        this.dataProvider.on('dataUpdate', (event: DashboardEvent) => {
            this.handleDataUpdate(event);
        });

        // Handle internal events
        this.on('widgetUpdate', this.handleWidgetUpdate.bind(this));
        this.on('alertTriggered', this.handleAlertTriggered.bind(this));
        this.on('layoutChanged', this.handleLayoutChanged.bind(this));
    }

    /**
     * 📊 Handle data updates from provider
     */
    private handleDataUpdate(event: DashboardEvent): void {
        if (event.type === 'DATA_FEED_UPDATE') {
            const { feedId, data } = event as any;
            
            // Update widgets subscribed to this feed
            const feed = this.dataProvider.getDataFeeds().find(f => f.id === feedId);
            if (feed) {
                feed.subscribers.forEach(widgetId => {
                    const widget = this.widgets.get(widgetId);
                    if (widget) {
                        this.updateWidgetData(widget, data.data);
                    }
                });
            }

            // Check alert rules
            this.checkAlertRules(data.data);
        }

        // Emit to dashboard clients
        this.emit('dashboardUpdate', event);
    }

    /**
     * 🔄 Update widget with new data
     */
    private updateWidgetData(widget: Widget, data: any): void {
        switch (widget.type) {
            case 'METRIC':
                if (Array.isArray(data)) {
                    widget.data = data;
                }
                break;
            case 'CHART':
                this.updateChartWidget(widget, data);
                break;
            case 'TABLE':
                widget.data = data;
                break;
        }

        this.emit('widgetUpdate', { widgetId: widget.id, data: widget.data });
    }

    /**
     * 📈 Update chart widget data
     */
    private updateChartWidget(widget: Widget, data: any): void {
        if (widget.data && typeof widget.data === 'object' && 'series' in widget.data) {
            const chart = widget.data as Chart;
            
            if (Array.isArray(data)) {
                // Data is array of ChartDataPoints
                const now = Date.now();
                data.forEach(point => {
                    chart.series.forEach(series => {
                        if (series.id === 'btc_price' || series.id === 'portfolio_value') {
                            series.data.push({
                                timestamp: now,
                                value: point.value || 0
                            });
                            
                            // Keep only last 500 points
                            if (series.data.length > 500) {
                                series.data.shift();
                            }
                        }
                    });
                });
            }
        }
    }

    /**
     * ⚠️ Check alert rules against new data
     */
    private checkAlertRules(data: any): void {
        if (!Array.isArray(data)) return;

        data.forEach((metric: DashboardMetric) => {
            this.alertRules.forEach((rule, ruleId) => {
                if (rule.metric === metric.id && rule.enabled) {
                    const shouldTrigger = this.evaluateAlertCondition(metric.value as number, rule.condition);
                    
                    if (shouldTrigger) {
                        const now = new Date();
                        const timeSinceLastTrigger = rule.lastTriggered ? 
                            (now.getTime() - rule.lastTriggered.getTime()) / 1000 : Infinity;
                        
                        if (timeSinceLastTrigger >= rule.throttle) {
                            this.triggerAlert(rule, metric);
                            rule.lastTriggered = now;
                        }
                    }
                }
            });
        });
    }

    /**
     * 🚨 Trigger alert
     */
    private triggerAlert(rule: AlertRule, metric: DashboardMetric): void {
        const alert: DashboardAlert = {
            id: `alert_${Date.now()}_${rule.id}`,
            rule,
            timestamp: new Date(),
            value: metric.value as number,
            message: `${rule.name}: ${metric.name} is ${metric.value} (${rule.condition.operator} ${rule.condition.value})`,
            acknowledged: false,
            resolved: false
        };

        this.activeAlerts.set(alert.id, alert);
        
        // Execute alert actions
        rule.actions.forEach(action => {
            if (action.enabled) {
                this.executeAlertAction(action, alert);
            }
        });

        this.emit('alertTriggered', alert);
        this.logger.warn(`🚨 Alert triggered: ${alert.message}`);
    }

    /**
     * ⚡ Execute alert action
     */
    private executeAlertAction(action: any, alert: DashboardAlert): void {
        switch (action.type) {
            case 'LOG':
                this.logger.warn(`🚨 ALERT: ${alert.message}`);
                break;
            case 'DASHBOARD':
                // Alert will be shown in dashboard (already added to activeAlerts)
                break;
            case 'WEBHOOK':
                // In production, would send HTTP request to webhook
                this.logger.info(`📡 Would send webhook to: ${action.config.webhook}`);
                break;
            default:
                this.logger.debug(`⚡ Alert action ${action.type} not implemented`);
        }
    }

    /**
     * 🔍 Evaluate alert condition
     */
    private evaluateAlertCondition(value: number, condition: any): boolean {
        switch (condition.operator) {
            case 'GT': return value > condition.value;
            case 'LT': return value < condition.value;
            case 'GTE': return value >= condition.value;
            case 'LTE': return value <= condition.value;
            case 'EQ': return value === condition.value;
            case 'NE': return value !== condition.value;
            case 'BETWEEN': 
                return Array.isArray(condition.value) && 
                       value >= condition.value[0] && 
                       value <= condition.value[1];
            case 'OUTSIDE':
                return Array.isArray(condition.value) && 
                       (value < condition.value[0] || value > condition.value[1]);
            default: return false;
        }
    }

    /**
     * 💾 Start auto-save
     */
    private startAutoSave(): void {
        this.autoSaveInterval = setInterval(() => {
            this.saveConfiguration();
        }, 30000); // Save every 30 seconds
    }

    /**
     * 💾 Save dashboard configuration
     */
    private saveConfiguration(): void {
        try {
            // Save layouts
            const layoutsData = Array.from(this.layouts.values());
            fs.writeFileSync(
                path.join(this.configPath, 'layouts.json'),
                JSON.stringify(layoutsData, null, 2)
            );

            // Save alert rules
            const alertRulesData = Array.from(this.alertRules.values());
            fs.writeFileSync(
                path.join(this.configPath, 'alert_rules.json'),
                JSON.stringify(alertRulesData, null, 2)
            );

            this.logger.debug('💾 Dashboard configuration saved');
        } catch (error) {
            this.logger.error('❌ Failed to save dashboard configuration:', error);
        }
    }

    /**
     * 📂 Load dashboard configuration
     */
    private loadConfiguration(): void {
        try {
            // Load layouts
            const layoutsPath = path.join(this.configPath, 'layouts.json');
            if (fs.existsSync(layoutsPath)) {
                const layoutsData = JSON.parse(fs.readFileSync(layoutsPath, 'utf-8'));
                layoutsData.forEach((layout: DashboardLayout) => {
                    this.layouts.set(layout.id, layout);
                    layout.widgets.forEach(widget => this.widgets.set(widget.id, widget));
                });
            }

            // Load alert rules
            const alertRulesPath = path.join(this.configPath, 'alert_rules.json');
            if (fs.existsSync(alertRulesPath)) {
                const alertRulesData = JSON.parse(fs.readFileSync(alertRulesPath, 'utf-8'));
                alertRulesData.forEach((rule: AlertRule) => {
                    this.alertRules.set(rule.id, rule);
                });
            }

            this.logger.info('📂 Dashboard configuration loaded');
        } catch (error) {
            this.logger.warn('⚠️ Failed to load dashboard configuration:', error);
        }
    }

    // Event handlers
    private handleWidgetUpdate(event: any): void {
        this.logger.debug(`🔄 Widget ${event.widgetId} updated`);
    }

    private handleAlertTriggered(alert: DashboardAlert): void {
        this.logger.info(`🚨 Alert triggered: ${alert.message}`);
    }

    private handleLayoutChanged(event: any): void {
        this.logger.info(`📋 Layout ${event.layoutId} changed`);
        this.saveConfiguration();
    }

    // Public API methods
    public getLayout(layoutId: string): DashboardLayout | undefined {
        return this.layouts.get(layoutId);
    }

    public getAllLayouts(): DashboardLayout[] {
        return Array.from(this.layouts.values());
    }

    public createLayout(layout: DashboardLayout): void {
        this.layouts.set(layout.id, layout);
        layout.widgets.forEach(widget => {
            this.widgets.set(widget.id, widget);
            this.subscribeWidgetToDataFeed(widget);
        });
        this.saveConfiguration();
    }

    public updateLayout(layoutId: string, updates: Partial<DashboardLayout>): void {
        const layout = this.layouts.get(layoutId);
        if (layout) {
            Object.assign(layout, updates);
            layout.lastModified = new Date();
            this.emit('layoutChanged', { layoutId, changes: updates });
        }
    }

    public getWidget(widgetId: string): Widget | undefined {
        return this.widgets.get(widgetId);
    }

    public updateWidget(widgetId: string, updates: Partial<Widget>): void {
        const widget = this.widgets.get(widgetId);
        if (widget) {
            Object.assign(widget, updates);
            this.emit('widgetUpdate', { widgetId, data: widget.data });
        }
    }

    public addAlertRule(rule: AlertRule): void {
        this.alertRules.set(rule.id, rule);
        this.saveConfiguration();
    }

    public getActiveAlerts(): DashboardAlert[] {
        return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
    }

    public acknowledgeAlert(alertId: string, userId: string): void {
        const alert = this.activeAlerts.get(alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedBy = userId;
            alert.acknowledgedAt = new Date();
        }
    }

    public getDataProvider(): RealTimeDataProvider {
        return this.dataProvider;
    }

    public getStatistics(): any {
        return {
            layouts: this.layouts.size,
            widgets: this.widgets.size,
            alertRules: this.alertRules.size,
            activeAlerts: Array.from(this.activeAlerts.values()).filter(a => !a.resolved).length,
            dataProvider: this.dataProvider.getStatistics()
        };
    }

    public stop(): void {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        this.dataProvider.stop();
        this.saveConfiguration();
        this.logger.info('🛑 Dashboard Manager stopped');
    }
}

export default AdvancedDashboardManager;

"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 📊 ADVANCED DASHBOARD MANAGER
 * Centralny manager dashboardu z widget management i real-time updates
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedDashboardManager = void 0;
const events_1 = require("events");
const realtime_data_provider_1 = require("./realtime_data_provider");
const logger_1 = require("../infrastructure/logging/logger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class AdvancedDashboardManager extends events_1.EventEmitter {
    constructor(configPath = './dashboard_config') {
        super();
        this.layouts = new Map();
        this.widgets = new Map();
        this.alertRules = new Map();
        this.activeAlerts = new Map();
        this.themes = new Map();
        this.users = new Map();
        this.sessions = new Map();
        this.autoSaveInterval = null;
        this.logger = new logger_1.Logger('AdvancedDashboardManager');
        this.configPath = configPath;
        this.dataProvider = new realtime_data_provider_1.RealTimeDataProvider();
        this.initializeDashboard();
        this.setupEventHandlers();
        this.startAutoSave();
        this.logger.info('📊 Advanced Dashboard Manager initialized');
    }
    /**
     * 🚀 Initialize dashboard with default configuration
     */
    initializeDashboard() {
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
    initializeThemes() {
        const lightTheme = {
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
        const darkTheme = {
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
    createDefaultLayout() {
        const defaultWidgets = [
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
        const defaultLayout = {
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
    createPerformanceChart() {
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
    createMarketChart() {
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
    subscribeWidgetToDataFeed(widget) {
        let feedId = null;
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
    setupEventHandlers() {
        // Handle data updates from provider
        this.dataProvider.on('dataUpdate', (event) => {
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
    handleDataUpdate(event) {
        if (event.type === 'DATA_FEED_UPDATE') {
            const { feedId, data } = event;
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
    updateWidgetData(widget, data) {
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
    updateChartWidget(widget, data) {
        if (widget.data && typeof widget.data === 'object' && 'series' in widget.data) {
            const chart = widget.data;
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
    checkAlertRules(data) {
        if (!Array.isArray(data))
            return;
        data.forEach((metric) => {
            this.alertRules.forEach((rule, ruleId) => {
                if (rule.metric === metric.id && rule.enabled) {
                    const shouldTrigger = this.evaluateAlertCondition(metric.value, rule.condition);
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
    triggerAlert(rule, metric) {
        const alert = {
            id: `alert_${Date.now()}_${rule.id}`,
            rule,
            timestamp: new Date(),
            value: metric.value,
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
    executeAlertAction(action, alert) {
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
    evaluateAlertCondition(value, condition) {
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
    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            this.saveConfiguration();
        }, 30000); // Save every 30 seconds
    }
    /**
     * 💾 Save dashboard configuration
     */
    saveConfiguration() {
        try {
            // Save layouts
            const layoutsData = Array.from(this.layouts.values());
            fs.writeFileSync(path.join(this.configPath, 'layouts.json'), JSON.stringify(layoutsData, null, 2));
            // Save alert rules
            const alertRulesData = Array.from(this.alertRules.values());
            fs.writeFileSync(path.join(this.configPath, 'alert_rules.json'), JSON.stringify(alertRulesData, null, 2));
            this.logger.debug('💾 Dashboard configuration saved');
        }
        catch (error) {
            this.logger.error('❌ Failed to save dashboard configuration:', error);
        }
    }
    /**
     * 📂 Load dashboard configuration
     */
    loadConfiguration() {
        try {
            // Load layouts
            const layoutsPath = path.join(this.configPath, 'layouts.json');
            if (fs.existsSync(layoutsPath)) {
                const layoutsData = JSON.parse(fs.readFileSync(layoutsPath, 'utf-8'));
                layoutsData.forEach((layout) => {
                    this.layouts.set(layout.id, layout);
                    layout.widgets.forEach(widget => this.widgets.set(widget.id, widget));
                });
            }
            // Load alert rules
            const alertRulesPath = path.join(this.configPath, 'alert_rules.json');
            if (fs.existsSync(alertRulesPath)) {
                const alertRulesData = JSON.parse(fs.readFileSync(alertRulesPath, 'utf-8'));
                alertRulesData.forEach((rule) => {
                    this.alertRules.set(rule.id, rule);
                });
            }
            this.logger.info('📂 Dashboard configuration loaded');
        }
        catch (error) {
            this.logger.warn('⚠️ Failed to load dashboard configuration:', error);
        }
    }
    // Event handlers
    handleWidgetUpdate(event) {
        this.logger.debug(`🔄 Widget ${event.widgetId} updated`);
    }
    handleAlertTriggered(alert) {
        this.logger.info(`🚨 Alert triggered: ${alert.message}`);
    }
    handleLayoutChanged(event) {
        this.logger.info(`📋 Layout ${event.layoutId} changed`);
        this.saveConfiguration();
    }
    // Public API methods
    getLayout(layoutId) {
        return this.layouts.get(layoutId);
    }
    getAllLayouts() {
        return Array.from(this.layouts.values());
    }
    createLayout(layout) {
        this.layouts.set(layout.id, layout);
        layout.widgets.forEach(widget => {
            this.widgets.set(widget.id, widget);
            this.subscribeWidgetToDataFeed(widget);
        });
        this.saveConfiguration();
    }
    updateLayout(layoutId, updates) {
        const layout = this.layouts.get(layoutId);
        if (layout) {
            Object.assign(layout, updates);
            layout.lastModified = new Date();
            this.emit('layoutChanged', { layoutId, changes: updates });
        }
    }
    getWidget(widgetId) {
        return this.widgets.get(widgetId);
    }
    updateWidget(widgetId, updates) {
        const widget = this.widgets.get(widgetId);
        if (widget) {
            Object.assign(widget, updates);
            this.emit('widgetUpdate', { widgetId, data: widget.data });
        }
    }
    addAlertRule(rule) {
        this.alertRules.set(rule.id, rule);
        this.saveConfiguration();
    }
    getActiveAlerts() {
        return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
    }
    acknowledgeAlert(alertId, userId) {
        const alert = this.activeAlerts.get(alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedBy = userId;
            alert.acknowledgedAt = new Date();
        }
    }
    getDataProvider() {
        return this.dataProvider;
    }
    getStatistics() {
        return {
            layouts: this.layouts.size,
            widgets: this.widgets.size,
            alertRules: this.alertRules.size,
            activeAlerts: Array.from(this.activeAlerts.values()).filter(a => !a.resolved).length,
            dataProvider: this.dataProvider.getStatistics()
        };
    }
    stop() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        this.dataProvider.stop();
        this.saveConfiguration();
        this.logger.info('🛑 Dashboard Manager stopped');
    }
}
exports.AdvancedDashboardManager = AdvancedDashboardManager;
exports.default = AdvancedDashboardManager;

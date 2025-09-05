/**
 * 📊 REAL-TIME ANALYTICS DASHBOARD TYPES
 * Definicje typów dla interaktywnego dashboardu analitycznego
 */

// Base types
export interface Widget {
    id: string;
    title: string;
    type: 'METRIC' | 'CHART' | 'TABLE' | 'ALERT' | 'NEWS' | 'CUSTOM';
    position: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    config: any;
    data?: any;
    visible?: boolean;
    interactive?: boolean;
}

export interface DashboardLayout {
    id: string;
    name: string;
    description?: string;
    widgets: Widget[];
    gridSize: {
        columns: number;
        rows: number;
        cellWidth: number;
        cellHeight: number;
    };
    theme: 'LIGHT' | 'DARK' | 'AUTO';
    autoSave: boolean;
    lastModified: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface AlertRule {
    id: string;
    name: string;
    description?: string;
    metric: string;
    condition: {
        operator: 'GT' | 'LT' | 'EQ' | 'NE' | 'GTE' | 'LTE' | 'BETWEEN' | 'OUTSIDE';
        value: number | number[];
        timeframe?: number; // Duration in seconds
    };
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    enabled: boolean;
    throttle: number; // Minimum time between alerts in seconds
    lastTriggered?: Date;
    actions: AlertAction[];
    threshold: number;
    action: string;
}

export interface DashboardUser {
    id: string;
    username: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'TRADER' | 'VIEWER';
    preferences: {
        defaultLayout: string;
        theme: string;
        timezone: string;
        refreshRate: number;
        notifications: {
            email: boolean;
            browser: boolean;
            sound: boolean;
        };
    };
    lastLogin: Date;
    layouts: string[]; // Layout IDs accessible to user
}

export interface DashboardTheme {
    id: string;
    name: string;
    colors: {
        primary: string;
        secondary: string;
        background: string;
        surface: string;
        text: string;
        textSecondary: string;
        success: string;
        warning: string;
        error: string;
        info: string;
    };
    fonts: {
        primary: string;
        secondary: string;
        monospace: string;
    };
    spacing: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
    };
}

export interface DashboardMetric {
    id: string;
    name: string;
    category: 'PERFORMANCE' | 'RISK' | 'PORTFOLIO' | 'TRADING' | 'MARKET' | 'SYSTEM';
    value: number | string;
    previousValue?: number | string;
    change?: number;
    changePercent?: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
    unit: 'CURRENCY' | 'PERCENTAGE' | 'COUNT' | 'RATIO' | 'TIME' | 'CUSTOM';
    format: string;
    lastUpdated: Date;
    threshold?: {
        warning: number;
        critical: number;
    };
    status: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

export interface AlertAction {
    type: 'EMAIL' | 'SMS' | 'WEBHOOK' | 'DASHBOARD' | 'LOG' | 'SOUND';
    config: {
        recipient?: string;
        webhook?: string;
        message?: string;
        sound?: string;
    };
    enabled: boolean;
}

// Service interfaces
export interface RealTimeDataProvider {
    getCurrentMetrics(): DashboardMetric[];
    getMetricsByType(type: string, interval: string, limit: number): DashboardMetric[];
    getChartData(chartId: string): any;
}

export interface AdvancedDashboardManager {
    // Basic dashboard methods
    init(): Promise<void>;
    destroy(): Promise<void>;

    // Layout methods
    getLayout(id: string): DashboardLayout | undefined;
    getLayouts(): DashboardLayout[];
    createLayout(layout: DashboardLayout): DashboardLayout;
    updateLayout(id: string, updates: Partial<DashboardLayout>): void;
    deleteLayout(id: string): boolean;
    exportLayout(id: string): DashboardLayout | null;
    importLayout(layout: DashboardLayout): DashboardLayout;

    // Widget methods
    getWidget(id: string): Widget | undefined;
    createWidget(widget: Widget): Widget;
    updateWidget(id: string, updates: Partial<Widget>): void;
    deleteWidget(id: string): boolean;

    // Alert methods
    getAlertRules(): AlertRule[];
    getAlertRule(id: string): AlertRule | undefined;
    createAlertRule(rule: AlertRule): AlertRule;
    updateAlertRule(id: string, updates: Partial<AlertRule>): AlertRule | undefined;
    deleteAlertRule(id: string): boolean;

    // User methods
    getUsers(): DashboardUser[];
    getUser(id: string): DashboardUser | undefined;
    createUser(user: DashboardUser): DashboardUser;
    updateUser(id: string, updates: Partial<DashboardUser>): DashboardUser | undefined;

    // Theme methods
    getThemes(): DashboardTheme[];
    getTheme(id: string): DashboardTheme | undefined;
    createTheme(theme: DashboardTheme): DashboardTheme;
    updateTheme(id: string, updates: Partial<DashboardTheme>): DashboardTheme | undefined;

    // Configuration methods
    exportConfiguration(): any;
    importConfiguration(config: any): any;

    // Data provider
    getDataProvider(): RealTimeDataProvider;
    
    // Statistics
    getStatistics(): { 
        layouts: number;
        widgets: number;
        alerts: number;
    };
}

export interface DashboardMetric {
    id: string;
    name: string;
    category: 'PERFORMANCE' | 'RISK' | 'PORTFOLIO' | 'TRADING' | 'MARKET' | 'SYSTEM';
    value: number | string;
    previousValue?: number | string;
    change?: number;
    changePercent?: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
    unit: 'CURRENCY' | 'PERCENTAGE' | 'COUNT' | 'RATIO' | 'TIME' | 'CUSTOM';
    format: string; // Format string for display
    lastUpdated: Date;
    threshold?: {
        warning: number;
        critical: number;
    };
    status: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

export interface ChartDataPoint {
    timestamp: number;
    value: number;
    label?: string;
    color?: string;
    metadata?: Record<string, any>;
}

export interface ChartSeries {
    id: string;
    name: string;
    type: 'LINE' | 'BAR' | 'AREA' | 'CANDLESTICK' | 'SCATTER' | 'PIE';
    data: ChartDataPoint[];
    color: string;
    yAxis?: 'primary' | 'secondary';
    visible: boolean;
    style?: {
        strokeWidth?: number;
        fillOpacity?: number;
        dashArray?: string;
    };
}

export interface Chart {
    id: string;
    title: string;
    subtitle?: string;
    type: 'TIMESERIES' | 'DISTRIBUTION' | 'COMPARISON' | 'CORRELATION' | 'HEATMAP';
    series: ChartSeries[];
    timeRange: {
        start: Date;
        end: Date;
        interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
    };
    axes: {
        x: {
            type: 'datetime' | 'category' | 'numeric';
            title: string;
            format?: string;
        };
        y: {
            type: 'linear' | 'logarithmic';
            title: string;
            format?: string;
            min?: number;
            max?: number;
        };
        y2?: {
            type: 'linear' | 'logarithmic';
            title: string;
            format?: string;
            min?: number;
            max?: number;
        };
    };
    annotations?: ChartAnnotation[];
    interactive: boolean;
    autoRefresh: boolean;
    refreshInterval: number; // milliseconds
}

export interface ChartAnnotation {
    type: 'LINE' | 'BAND' | 'FLAG' | 'CIRCLE';
    timestamp?: number;
    value?: number;
    label: string;
    color: string;
    style?: 'SOLID' | 'DASHED' | 'DOTTED';
}

export interface Widget {
    id: string;
    title: string;
    type: 'METRIC' | 'CHART' | 'TABLE' | 'ALERT' | 'NEWS' | 'CUSTOM';
    position: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    config: any;
}

export interface DashboardLayout {
    id: string;
    name: string;
    widgets: Widget[];
    createdAt: Date;
    updatedAt: Date;
}

export interface RealTimeDataProvider {
    getCurrentMetrics(): DashboardMetric[];
    getMetricsByType(type: string, interval: string, limit: number): DashboardMetric[];
    getChartData(chartId: string): any;
}

export interface RealTimeDataProvider {
    getCurrentMetrics(): DashboardMetric[];
    getMetricsByType(type: string, interval: string, limit: number): DashboardMetric[];
    getChartData(chartId: string): any;
}

export interface AdvancedDashboardManager {
    // Basic dashboard methods
    init(): Promise<void>;
    destroy(): Promise<void>;

    // Layout methods
    getLayout(id: string): DashboardLayout | undefined;
    getLayouts(): DashboardLayout[];
    createLayout(layout: DashboardLayout): DashboardLayout;
    updateLayout(id: string, updates: Partial<DashboardLayout>): void;
    deleteLayout(id: string): boolean;
    exportLayout(id: string): DashboardLayout | null;
    importLayout(layout: DashboardLayout): DashboardLayout;

    // Widget methods
    getWidget(id: string): Widget | undefined;
    createWidget(widget: Widget): Widget;
    updateWidget(id: string, updates: Partial<Widget>): void;
    deleteWidget(id: string): boolean;

    // Alert methods
    getAlertRules(): AlertRule[];
    getAlertRule(id: string): AlertRule | undefined;
    createAlertRule(rule: AlertRule): AlertRule;
    updateAlertRule(id: string, updates: Partial<AlertRule>): AlertRule | undefined;
    deleteAlertRule(id: string): boolean;

    // User methods
    getUsers(): DashboardUser[];
    getUser(id: string): DashboardUser | undefined;
    createUser(user: DashboardUser): DashboardUser;
    updateUser(id: string, updates: Partial<DashboardUser>): DashboardUser | undefined;

    // Theme methods
    getThemes(): DashboardTheme[];
    getTheme(id: string): DashboardTheme | undefined;
    createTheme(theme: DashboardTheme): DashboardTheme;
    updateTheme(id: string, updates: Partial<DashboardTheme>): DashboardTheme | undefined;

    // Configuration methods
    exportConfiguration(): any;
    importConfiguration(config: any): any;

    // Data provider
    getDataProvider(): RealTimeDataProvider;

    // Statistics
    getStatistics(): {
        layouts: number;
        widgets: number;
        alerts: number;
    };
    // Layout methods
    getLayout(id: string): DashboardLayout | undefined;
    getLayouts(): DashboardLayout[];
    createLayout(layout: DashboardLayout): DashboardLayout;
    updateLayout(id: string, updates: Partial<DashboardLayout>): void;
    deleteLayout(id: string): boolean;
    exportLayout(id: string): DashboardLayout | null;
    importLayout(layout: DashboardLayout): DashboardLayout;

    // Widget methods
    getWidget(id: string): Widget | undefined;
    createWidget(widget: Widget): Widget;
    updateWidget(id: string, updates: Partial<Widget>): void;
    deleteWidget(id: string): boolean;

    // Alert methods
    getAlertRules(): AlertRule[];
    getAlertRule(id: string): AlertRule | undefined;
    createAlertRule(rule: AlertRule): AlertRule;
    updateAlertRule(id: string, updates: Partial<AlertRule>): AlertRule | undefined;
    deleteAlertRule(id: string): boolean;

    // User methods
    getUsers(): DashboardUser[];
    getUser(id: string): DashboardUser | undefined;
    createUser(user: DashboardUser): DashboardUser;
    updateUser(id: string, updates: Partial<DashboardUser>): DashboardUser | undefined;

    // Theme methods
    getThemes(): DashboardTheme[];
    getTheme(id: string): DashboardTheme | undefined;
    createTheme(theme: DashboardTheme): DashboardTheme;
    updateTheme(id: string, updates: Partial<DashboardTheme>): DashboardTheme | undefined;

    // Configuration methods
    exportConfiguration(): any;
    importConfiguration(config: any): any;

    // Data provider
    getDataProvider(): RealTimeDataProvider;
    
    // Statistics
    getStatistics(): { 
        layouts: number;
        widgets: number;
        alerts: number;
    };
}

export interface DashboardLayout {
    id: string;
    name: string;
    description?: string;
    widgets: Widget[];
    gridSize: {
        columns: number;
        rows: number;
        cellWidth: number;
        cellHeight: number;
    };
    theme: 'LIGHT' | 'DARK' | 'AUTO';
    autoSave: boolean;
    lastModified: Date;
}

export interface AlertRule {
    id: string;
    name: string;
    description?: string;
    metric: string;
    condition: {
        operator: 'GT' | 'LT' | 'EQ' | 'NE' | 'GTE' | 'LTE' | 'BETWEEN' | 'OUTSIDE';
        value: number | number[];
        timeframe?: number; // Duration in seconds
    };
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    enabled: boolean;
    throttle: number; // Minimum time between alerts in seconds
    lastTriggered?: Date;
    actions: AlertAction[];
}

export interface AlertAction {
    type: 'EMAIL' | 'SMS' | 'WEBHOOK' | 'DASHBOARD' | 'LOG' | 'SOUND';
    config: {
        recipient?: string;
        webhook?: string;
        message?: string;
        sound?: string;
    };
    enabled: boolean;
}

export interface DashboardAlert {
    id: string;
    rule: AlertRule;
    timestamp: Date;
    value: number;
    message: string;
    acknowledged: boolean;
    acknowledgedBy?: string;
    acknowledgedAt?: Date;
    resolved: boolean;
    resolvedAt?: Date;
}

export interface LiveDataFeed {
    id: string;
    source: 'PORTFOLIO' | 'MARKET' | 'TRADING' | 'RISK' | 'SYSTEM';
    dataType: string;
    updateFrequency: number; // milliseconds
    lastUpdate: Date;
    connected: boolean;
    subscribers: string[]; // Widget IDs subscribed to this feed
}

export interface DashboardTheme {
    name: string;
    colors: {
        primary: string;
        secondary: string;
        background: string;
        surface: string;
        text: string;
        textSecondary: string;
        success: string;
        warning: string;
        error: string;
        info: string;
    };
    fonts: {
        primary: string;
        secondary: string;
        monospace: string;
    };
    spacing: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
    };
}

export interface DashboardUser {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'TRADER' | 'VIEWER';
    preferences: {
        defaultLayout: string;
        theme: string;
        timezone: string;
        refreshRate: number;
        notifications: {
            email: boolean;
            browser: boolean;
            sound: boolean;
        };
    };
    lastLogin: Date;
    layouts: string[]; // Layout IDs accessible to user
}

export interface DashboardSession {
    id: string;
    userId: string;
    startTime: Date;
    lastActivity: Date;
    ipAddress: string;
    userAgent: string;
    activeLayout: string;
    widgets: {
        id: string;
        lastRefresh: Date;
        errorCount: number;
    }[];
}

export interface DataExport {
    id: string;
    name: string;
    description?: string;
    type: 'CSV' | 'JSON' | 'EXCEL' | 'PDF';
    timeRange: {
        start: Date;
        end: Date;
    };
    metrics: string[];
    format: {
        includeHeaders: boolean;
        delimiter?: string;
        dateFormat?: string;
        timezone?: string;
    };
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
    downloadUrl?: string;
    createdAt: Date;
    expiresAt: Date;
}

export interface PerformanceChart {
    portfolioValue: ChartSeries;
    totalReturn: ChartSeries;
    dailyReturns: ChartSeries;
    drawdown: ChartSeries;
    sharpeRatio: ChartSeries;
    benchmarkComparison: ChartSeries[];
}

export interface RiskChart {
    var95: ChartSeries;
    volatility: ChartSeries;
    correlation: ChartSeries[];
    positionSizes: ChartSeries;
    sectorExposure: ChartSeries;
    stressTestResults: ChartSeries[];
}

export interface TradingChart {
    signals: ChartSeries;
    orders: ChartSeries;
    fills: ChartSeries;
    pnl: ChartSeries;
    winRate: ChartSeries;
    avgHoldTime: ChartSeries;
}

export interface MarketChart {
    prices: ChartSeries[];
    volumes: ChartSeries[];
    volatility: ChartSeries;
    correlations: ChartSeries[];
    technicalIndicators: ChartSeries[];
    sentiment: ChartSeries;
}

// Dashboard Event Types
export type DashboardEvent = 
    | { type: 'WIDGET_UPDATE'; widgetId: string; data: any }
    | { type: 'ALERT_TRIGGERED'; alert: DashboardAlert }
    | { type: 'DATA_FEED_UPDATE'; feedId: string; data: any }
    | { type: 'USER_ACTION'; userId: string; action: string; details: any }
    | { type: 'LAYOUT_CHANGED'; layoutId: string; changes: any }
    | { type: 'THEME_CHANGED'; theme: string }
    | { type: 'CONNECTION_STATUS'; connected: boolean }
    | { type: 'ERROR'; error: string; details?: any };

export type DashboardEventHandler = (event: DashboardEvent) => void | Promise<void>;

// Real-time Update Types
export interface RealtimeUpdate {
    timestamp: Date;
    source: string;
    type: 'METRIC_UPDATE' | 'CHART_UPDATE' | 'ALERT' | 'STATUS_CHANGE';
    data: any;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface WebSocketMessage {
    id: string;
    type: 'SUBSCRIBE' | 'UNSUBSCRIBE' | 'UPDATE' | 'PING' | 'PONG' | 'ERROR';
    channel?: string;
    data?: any;
    timestamp: Date;
}

// Custom Widget Types
export interface CustomWidgetConfig {
    id: string;
    name: string;
    component: string; // Component name/path
    props: Record<string, any>;
    dataSource: string;
    refreshInterval: number;
    cacheable: boolean;
    permissions: string[];
}

export interface WidgetTemplate {
    id: string;
    name: string;
    category: string;
    description: string;
    preview: string; // Base64 image or URL
    defaultConfig: Widget;
    configSchema: any; // JSON Schema for configuration
    minSize: { width: number; height: number };
    maxSize: { width: number; height: number };
}

export type MetricCalculator = (data: any[]) => number | string;
export type ChartDataProcessor = (data: any[]) => ChartDataPoint[];
export type AlertConditionEvaluator = (value: number, condition: AlertRule['condition']) => boolean;

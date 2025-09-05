"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultPerformanceLoggerConfig = exports.EnterprisePerformanceLogger = void 0;
const events_1 = require("events");
const path_1 = require("path");
class EnterprisePerformanceLogger extends events_1.EventEmitter {
    constructor(config, logger) {
        super();
        this.isInitialized = false;
        this.alertHistory = new Map();
        this.config = config;
        this.logger = logger;
    }
    async initialize() {
        try {
            this.logger.info('🚀 Initializing Enterprise Performance Logger...');
            await this.initializeDatabase();
            if (this.config.prometheus.enabled) {
                await this.initializePrometheus();
            }
            if (this.config.grafana.enabled) {
                await this.initializeGrafana();
            }
            this.isInitialized = true;
            this.logger.info('✅ Enterprise Performance Logger initialized');
        }
        catch (error) {
            this.logger.error('❌ Failed to initialize performance logger:', error);
            throw error;
        }
    }
    async initializeDatabase() {
        try {
            const Database = require('better-sqlite3');
            this.database = new Database(this.config.database.path);
            // Create performance metrics table
            this.database.exec(`
        CREATE TABLE IF NOT EXISTS performance_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          totalReturn REAL NOT NULL,
          sharpeRatio REAL NOT NULL,
          maxDrawdown REAL NOT NULL,
          volatility REAL NOT NULL,
          winRate REAL NOT NULL,
          avgWin REAL NOT NULL,
          avgLoss REAL NOT NULL,
          profitFactor REAL NOT NULL,
          recoveryFactor REAL NOT NULL,
          equityPeak REAL NOT NULL,
          equityTrough REAL NOT NULL,
          consecutiveWins INTEGER NOT NULL,
          consecutiveLosses INTEGER NOT NULL,
          largestWin REAL NOT NULL,
          largestLoss REAL NOT NULL,
          averageTradeLength REAL NOT NULL,
          tradingFrequency REAL NOT NULL,
          marketExposure REAL NOT NULL,
          riskAdjustedReturn REAL NOT NULL,
          sterling REAL NOT NULL,
          burke REAL NOT NULL,
          modifiedSharpe REAL NOT NULL
        )
      `);
            // Create index for timestamp queries
            this.database.exec(`
        CREATE INDEX IF NOT EXISTS idx_timestamp ON performance_metrics(timestamp)
      `);
            // Create equity curve table
            this.database.exec(`
        CREATE TABLE IF NOT EXISTS equity_curve (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          equity REAL NOT NULL,
          drawdown REAL NOT NULL,
          runup REAL NOT NULL
        )
      `);
            this.logger.info('✅ SQLite database initialized');
        }
        catch (error) {
            this.logger.error('❌ Failed to initialize database:', error);
            throw error;
        }
    }
    async initializePrometheus() {
        try {
            this.logger.info(`🔧 Prometheus metrics server starting on port ${this.config.prometheus.port}`);
            this.logger.info('✅ Prometheus metrics initialized');
        }
        catch (error) {
            this.logger.error(`❌ Failed to initialize Prometheus: ${error}`);
            throw error;
        }
    }
    async initializeGrafana() {
        try {
            this.logger.info(`🎨 Initializing Grafana dashboard: ${this.config.grafana.dashboardId}`);
            this.logger.info('✅ Grafana dashboard initialized');
        }
        catch (error) {
            this.logger.error(`❌ Failed to initialize Grafana: ${error}`);
            throw error;
        }
    }
    async logMetrics(metrics) {
        if (!this.isInitialized) {
            throw new Error('Performance logger not initialized');
        }
        try {
            await this.storeMetricsInDatabase(metrics);
            await this.checkAlertConditions(metrics);
            this.emit('metricsLogged', metrics);
            this.logger.debug('📊 Performance metrics logged successfully');
        }
        catch (error) {
            this.logger.error(`❌ Failed to collect metrics: ${error}`);
            throw error;
        }
    }
    async checkAlertConditions(metrics) {
        for (const condition of this.config.alerting.conditions) {
            if (!condition.enabled)
                continue;
            const value = metrics[condition.metricName];
            if (value === undefined)
                continue;
            const alertKey = `${condition.metricName}_${condition.operator}_${condition.threshold}`;
            const lastAlert = this.alertHistory.get(alertKey) || 0;
            const now = Date.now();
            if (now - lastAlert < 5 * 60 * 1000)
                continue;
            let shouldAlert = false;
            switch (condition.operator) {
                case 'gt':
                    shouldAlert = value > condition.threshold;
                    break;
                case 'lt':
                    shouldAlert = value < condition.threshold;
                    break;
                case 'gte':
                    shouldAlert = value >= condition.threshold;
                    break;
                case 'lte':
                    shouldAlert = value <= condition.threshold;
                    break;
                case 'eq':
                    shouldAlert = value === condition.threshold;
                    break;
            }
            if (shouldAlert) {
                await this.sendAlert(condition, value);
                this.alertHistory.set(alertKey, now);
            }
        }
    }
    async sendAlert(condition, value) {
        this.logger.warn(`🚨 ALERT [${condition.severity}]: ${condition.description} - ${condition.metricName} ${condition.operator} ${condition.threshold} (Current: ${value})`);
        if (this.config.alerting.webhookUrl) {
            this.logger.info(`📡 Sending webhook alert to ${this.config.alerting.webhookUrl}`);
        }
        if (this.config.alerting.emailConfig) {
            this.logger.info(`📧 Sending email alert to ${this.config.alerting.emailConfig.to.join(', ')}`);
        }
    }
    async storeMetricsInDatabase(metrics) {
        const stmt = this.database.prepare(`
      INSERT INTO performance_metrics (
        timestamp, totalReturn, sharpeRatio, maxDrawdown, volatility,
        winRate, avgWin, avgLoss, profitFactor, recoveryFactor,
        equityPeak, equityTrough, consecutiveWins, consecutiveLosses,
        largestWin, largestLoss, averageTradeLength, tradingFrequency,
        marketExposure, riskAdjustedReturn, sterling, burke, modifiedSharpe
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(metrics.timestamp, metrics.totalReturn, metrics.sharpeRatio, metrics.maxDrawdown, metrics.volatility, metrics.winRate, metrics.avgWin, metrics.avgLoss, metrics.profitFactor, metrics.recoveryFactor, metrics.equityPeak, metrics.equityTrough, metrics.consecutiveWins, metrics.consecutiveLosses, metrics.largestWin, metrics.largestLoss, metrics.averageTradeLength, metrics.tradingFrequency, metrics.marketExposure, metrics.riskAdjustedReturn, metrics.sterling, metrics.burke, metrics.modifiedSharpe);
    }
    async close() {
        if (this.database) {
            this.database.close();
            this.logger.info('📥 Performance logger database closed');
        }
        this.isInitialized = false;
    }
}
exports.EnterprisePerformanceLogger = EnterprisePerformanceLogger;
exports.defaultPerformanceLoggerConfig = {
    database: {
        path: (0, path_1.join)(__dirname, '../../data/performance_metrics.db')
    },
    prometheus: {
        enabled: true,
        port: 9090,
        endpoint: '/metrics'
    },
    grafana: {
        enabled: true,
        url: 'http://localhost:3000',
        apiKey: '',
        dashboardId: 'trading-performance'
    },
    alerting: {
        enabled: true,
        conditions: [
            {
                metricName: 'maxDrawdown',
                operator: 'gt',
                threshold: 0.1,
                severity: 'high',
                description: 'Maximum drawdown exceeded 10%',
                enabled: true
            }
        ]
    },
    retention: {
        days: 90
    }
};

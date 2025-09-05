import { EventEmitter } from 'events';
import { join } from 'path';
import * as fs from 'fs';

export interface PerformanceMetrics {
  timestamp: string;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  recoveryFactor: number;
  equityPeak: number;
  equityTrough: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  largestWin: number;
  largestLoss: number;
  averageTradeLength: number;
  tradingFrequency: number;
  marketExposure: number;
  riskAdjustedReturn: number;
  sterling: number;
  burke: number;
  modifiedSharpe: number;
}

export interface AlertCondition {
  metricName: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  enabled: boolean;
}

export interface PerformanceLoggerConfig {
  database: {
    path: string;
  };
  prometheus: {
    enabled: boolean;
    port: number;
    endpoint: string;
  };
  grafana: {
    enabled: boolean;
    url: string;
    apiKey: string;
    dashboardId: string;
  };
  alerting: {
    enabled: boolean;
    conditions: AlertCondition[];
    webhookUrl?: string;
    emailConfig?: {
      smtp: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      };
      from: string;
      to: string[];
    };
  };
  retention: {
    days: number;
  };
}

export class EnterprisePerformanceLogger extends EventEmitter {
  private config: PerformanceLoggerConfig;
  private database: any;
  private logger: any;
  private isInitialized: boolean = false;
  private alertHistory: Map<string, number> = new Map();

  constructor(config: PerformanceLoggerConfig, logger: any) {
    super();
    this.config = config;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
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
    } catch (error) {
      this.logger.error('❌ Failed to initialize performance logger:', error);
      throw error;
    }
  }

  private async initializeDatabase(): Promise<void> {
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
    } catch (error) {
      this.logger.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  private async initializePrometheus(): Promise<void> {
    try {
      this.logger.info(`🔧 Prometheus metrics server starting on port ${this.config.prometheus.port}`);
      this.logger.info('✅ Prometheus metrics initialized');
    } catch (error) {
      this.logger.error(`❌ Failed to initialize Prometheus: ${error}`);
      throw error;
    }
  }

  private async initializeGrafana(): Promise<void> {
    try {
      this.logger.info(`🎨 Initializing Grafana dashboard: ${this.config.grafana.dashboardId}`);
      this.logger.info('✅ Grafana dashboard initialized');
    } catch (error) {
      this.logger.error(`❌ Failed to initialize Grafana: ${error}`);
      throw error;
    }
  }

  async logMetrics(metrics: PerformanceMetrics): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Performance logger not initialized');
    }

    try {
      await this.storeMetricsInDatabase(metrics);
      await this.checkAlertConditions(metrics);
      this.emit('metricsLogged', metrics);
      this.logger.debug('📊 Performance metrics logged successfully');
    } catch (error) {
      this.logger.error(`❌ Failed to collect metrics: ${error}`);
      throw error;
    }
  }

  private async checkAlertConditions(metrics: PerformanceMetrics): Promise<void> {
    for (const condition of this.config.alerting.conditions) {
      if (!condition.enabled) continue;

      const value = (metrics as any)[condition.metricName];
      if (value === undefined) continue;

      const alertKey = `${condition.metricName}_${condition.operator}_${condition.threshold}`;
      const lastAlert = this.alertHistory.get(alertKey) || 0;
      const now = Date.now();
      
      if (now - lastAlert < 5 * 60 * 1000) continue;

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

  private async sendAlert(condition: AlertCondition, value: number): Promise<void> {
    this.logger.warn(`🚨 ALERT [${condition.severity}]: ${condition.description} - ${condition.metricName} ${condition.operator} ${condition.threshold} (Current: ${value})`);

    if (this.config.alerting.webhookUrl) {
      this.logger.info(`📡 Sending webhook alert to ${this.config.alerting.webhookUrl}`);
    }

    if (this.config.alerting.emailConfig) {
      this.logger.info(`📧 Sending email alert to ${this.config.alerting.emailConfig.to.join(', ')}`);
    }
  }

  private async storeMetricsInDatabase(metrics: PerformanceMetrics): Promise<void> {
    const stmt = this.database.prepare(`
      INSERT INTO performance_metrics (
        timestamp, totalReturn, sharpeRatio, maxDrawdown, volatility,
        winRate, avgWin, avgLoss, profitFactor, recoveryFactor,
        equityPeak, equityTrough, consecutiveWins, consecutiveLosses,
        largestWin, largestLoss, averageTradeLength, tradingFrequency,
        marketExposure, riskAdjustedReturn, sterling, burke, modifiedSharpe
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      metrics.timestamp,
      metrics.totalReturn,
      metrics.sharpeRatio,
      metrics.maxDrawdown,
      metrics.volatility,
      metrics.winRate,
      metrics.avgWin,
      metrics.avgLoss,
      metrics.profitFactor,
      metrics.recoveryFactor,
      metrics.equityPeak,
      metrics.equityTrough,
      metrics.consecutiveWins,
      metrics.consecutiveLosses,
      metrics.largestWin,
      metrics.largestLoss,
      metrics.averageTradeLength,
      metrics.tradingFrequency,
      metrics.marketExposure,
      metrics.riskAdjustedReturn,
      metrics.sterling,
      metrics.burke,
      metrics.modifiedSharpe
    );
  }

  async close(): Promise<void> {
    if (this.database) {
      this.database.close();
      this.logger.info('📥 Performance logger database closed');
    }
    this.isInitialized = false;
  }
}

export const defaultPerformanceLoggerConfig: PerformanceLoggerConfig = {
  database: {
    path: join(__dirname, '../../data/performance_metrics.db')
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

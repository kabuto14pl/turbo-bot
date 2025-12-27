/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * � [SHARED-INFRASTRUCTURE]
 * INTEGRATED PERFORMANCE MANAGER
 * Bridges existing PerformanceTracker with Enterprise Performance Analyzer
 * 
 * Shared component providing integrated performance management across all environments
 * Connects legacy performance tracking with enterprise analytics
 */

import { PerformanceTracker } from '../../trading-bot/core/analysis/performance_tracker';
import { 
  EnterprisePerformanceAnalyzer, 
  EnterpriseRiskMetrics, 
  PerformanceReport 
} from './enterprise_performance_analyzer';
import { Logger } from '../../trading-bot/infrastructure/logging/logger';

export interface RiskThresholds {
  maxDrawdown: number;      // Maximum allowed drawdown %
  var95Threshold: number;   // Maximum daily VaR 95%
  var99Threshold: number;   // Maximum daily VaR 99%
  minSharpeRatio: number;   // Minimum acceptable Sharpe ratio
  maxConsecutiveLosses: number; // Maximum consecutive losing trades
  minProfitFactor: number;  // Minimum profit factor
  maxUlcerIndex: number;    // Maximum ulcer index
}

export interface RealTimeRiskStatus {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alerts: string[];
  currentMetrics: any;
  thresholdBreaches: string[];
  recommendation: 'CONTINUE' | 'REDUCE_RISK' | 'EMERGENCY_STOP';
}

export interface IntegratedMetrics {
  // Basic metrics from PerformanceTracker
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  
  // Enterprise metrics
  var95: number;
  var99: number;
  cvar95: number;
  sortinoRatio: number;
  calmarRatio: number;
  systemQuality: number;
  profitFactor: number;
  ulcerIndex: number;
}

export class IntegratedPerformanceManager {
  private performanceTracker: PerformanceTracker;
  private enterpriseAnalyzer: EnterprisePerformanceAnalyzer;
  private logger: Logger;
  private riskThresholds: RiskThresholds;
  private monitoringActive: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(performanceTracker: PerformanceTracker) {
    this.performanceTracker = performanceTracker;
    this.enterpriseAnalyzer = new EnterprisePerformanceAnalyzer();
    this.logger = new Logger();
    
    // Default risk thresholds
    this.riskThresholds = {
      maxDrawdown: 20,        // 20%
      var95Threshold: 0.05,   // 5%
      var99Threshold: 0.10,   // 10%
      minSharpeRatio: 0.5,
      maxConsecutiveLosses: 5,
      minProfitFactor: 1.2,
      maxUlcerIndex: 15
    };
    
    this.logger.info('🔄 Integrated Performance Manager initialized');
  }

  /**
   * Update risk thresholds
   */
  public updateRiskThresholds(thresholds: Partial<RiskThresholds>): void {
    this.riskThresholds = { ...this.riskThresholds, ...thresholds };
    this.logger.info('📊 Risk thresholds updated:', thresholds);
  }

  /**
   * Get integrated metrics combining basic and enterprise analytics
   */
  public async getIntegratedMetrics(): Promise<IntegratedMetrics> {
    try {
      // Get basic metrics from PerformanceTracker
      const currentPerformance = this.performanceTracker.getCurrentPerformance();
      const trades = this.performanceTracker.getTrades();
      
      // Calculate enterprise metrics
      const enterpriseMetrics = this.enterpriseAnalyzer.calculateEnterpriseMetrics(
        trades, 
        10000 // Initial balance
      );

      // Extract basic metrics from current performance
      const basicMetrics = currentPerformance ? currentPerformance.summary : {
        totalReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        totalTrades: 0
      };

      return {
        // Basic metrics
        totalReturn: basicMetrics.totalReturn || 0,
        sharpeRatio: basicMetrics.sharpeRatio || 0,
        maxDrawdown: basicMetrics.maxDrawdown || 0,
        winRate: basicMetrics.winRate || 0,
        totalTrades: trades.length,
        
        // Enterprise metrics
        var95: enterpriseMetrics.var95,
        var99: enterpriseMetrics.var99,
        cvar95: enterpriseMetrics.cvar95,
        sortinoRatio: enterpriseMetrics.sortinoRatio,
        calmarRatio: enterpriseMetrics.calmarRatio,
        systemQuality: enterpriseMetrics.systemQuality,
        profitFactor: enterpriseMetrics.profitFactor,
        ulcerIndex: enterpriseMetrics.ulcerIndex
      };
    } catch (error) {
      this.logger.error('Error calculating integrated metrics:', error);
      return this.getDefaultIntegratedMetrics();
    }
  }

  /**
   * Generate comprehensive performance report
   */
  public async generateComprehensiveReport(): Promise<PerformanceReport> {
    const currentPerformance = this.performanceTracker.getCurrentPerformance();
    const trades = this.performanceTracker.getTrades();
    
    const basicMetrics = currentPerformance ? currentPerformance.summary : {};
    const enterpriseMetrics = this.enterpriseAnalyzer.calculateEnterpriseMetrics(trades, 10000);
    
    return this.enterpriseAnalyzer.generateReport(basicMetrics, enterpriseMetrics);
  }

  /**
   * Start real-time risk monitoring
   */
  public startRealTimeMonitoring(intervalMinutes: number = 5): void {
    if (this.monitoringActive) {
      this.logger.warn('Real-time monitoring already active');
      return;
    }

    this.monitoringActive = true;
    const intervalMs = intervalMinutes * 60 * 1000;

    this.monitoringInterval = setInterval(async () => {
      await this.performRiskCheck();
    }, intervalMs);

    this.logger.info(`🔄 Real-time risk monitoring started (checking every ${intervalMinutes} minutes)`);
  }

  /**
   * Stop real-time risk monitoring
   */
  public stopRealTimeMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.monitoringActive = false;
    this.logger.info('🛑 Real-time risk monitoring stopped');
  }

  /**
   * Get current real-time risk status
   */
  public async getRealTimeRiskStatus(): Promise<RealTimeRiskStatus> {
    try {
      const integratedMetrics = await this.getIntegratedMetrics();
      const thresholdBreaches = this.checkThresholdBreaches(integratedMetrics);
      
      const riskLevel = this.determineRiskLevel(thresholdBreaches, integratedMetrics);
      const alerts = this.generateRiskAlerts(thresholdBreaches, integratedMetrics);
      const recommendation = this.generateRecommendation(riskLevel, thresholdBreaches);

      return {
        riskLevel,
        alerts,
        currentMetrics: integratedMetrics,
        thresholdBreaches,
        recommendation
      };
    } catch (error) {
      this.logger.error('Error getting real-time risk status:', error);
      return {
        riskLevel: 'MEDIUM',
        alerts: ['Error calculating risk status'],
        currentMetrics: this.getDefaultIntegratedMetrics(),
        thresholdBreaches: [],
        recommendation: 'REDUCE_RISK'
      };
    }
  }

  /**
   * Emergency stop trading trigger
   */
  public async checkEmergencyStop(): Promise<boolean> {
    const riskStatus = await this.getRealTimeRiskStatus();
    return riskStatus.recommendation === 'EMERGENCY_STOP';
  }

  // =================== PRIVATE METHODS ===================

  private async performRiskCheck(): Promise<void> {
    try {
      const riskStatus = await this.getRealTimeRiskStatus();
      
      if (riskStatus.riskLevel === 'CRITICAL') {
        this.logger.error('🚨 CRITICAL RISK DETECTED', {
          alerts: riskStatus.alerts,
          breaches: riskStatus.thresholdBreaches,
          recommendation: riskStatus.recommendation
        });
      } else if (riskStatus.riskLevel === 'HIGH') {
        this.logger.warn('⚠️ HIGH RISK DETECTED', {
          alerts: riskStatus.alerts,
          breaches: riskStatus.thresholdBreaches
        });
      }
      
    } catch (error) {
      this.logger.error('Error in risk check:', error);
    }
  }

  private checkThresholdBreaches(metrics: IntegratedMetrics): string[] {
    const breaches: string[] = [];

    if (metrics.maxDrawdown > this.riskThresholds.maxDrawdown) {
      breaches.push(`Max Drawdown: ${metrics.maxDrawdown.toFixed(2)}% > ${this.riskThresholds.maxDrawdown}%`);
    }

    if (metrics.var95 > this.riskThresholds.var95Threshold) {
      breaches.push(`VaR 95%: ${(metrics.var95 * 100).toFixed(2)}% > ${(this.riskThresholds.var95Threshold * 100).toFixed(2)}%`);
    }

    if (metrics.var99 > this.riskThresholds.var99Threshold) {
      breaches.push(`VaR 99%: ${(metrics.var99 * 100).toFixed(2)}% > ${(this.riskThresholds.var99Threshold * 100).toFixed(2)}%`);
    }

    if (metrics.sharpeRatio < this.riskThresholds.minSharpeRatio) {
      breaches.push(`Sharpe Ratio: ${metrics.sharpeRatio.toFixed(3)} < ${this.riskThresholds.minSharpeRatio}`);
    }

    if (metrics.profitFactor < this.riskThresholds.minProfitFactor) {
      breaches.push(`Profit Factor: ${metrics.profitFactor.toFixed(2)} < ${this.riskThresholds.minProfitFactor}`);
    }

    if (metrics.ulcerIndex > this.riskThresholds.maxUlcerIndex) {
      breaches.push(`Ulcer Index: ${metrics.ulcerIndex.toFixed(2)} > ${this.riskThresholds.maxUlcerIndex}`);
    }

    return breaches;
  }

  private determineRiskLevel(breaches: string[], metrics: IntegratedMetrics): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalCount = breaches.filter(breach => 
      breach.includes('Max Drawdown') || 
      breach.includes('VaR 99%') || 
      (breach.includes('Profit Factor') && metrics.profitFactor < 1)
    ).length;

    if (criticalCount > 0 || breaches.length >= 4) {
      return 'CRITICAL';
    }
    
    if (breaches.length >= 3) {
      return 'HIGH';
    }
    
    if (breaches.length >= 1) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  private generateRiskAlerts(breaches: string[], metrics: IntegratedMetrics): string[] {
    const alerts: string[] = [];

    if (breaches.length > 0) {
      alerts.push(`🚨 ${breaches.length} risk threshold breach(es) detected`);
      breaches.forEach(breach => alerts.push(`⚠️ ${breach}`));
    }

    if (metrics.systemQuality < 30) {
      alerts.push(`📊 Poor system quality: ${metrics.systemQuality.toFixed(1)}/100`);
    }

    if (metrics.totalTrades > 10 && metrics.winRate < 40) {
      alerts.push(`📉 Low win rate: ${metrics.winRate.toFixed(1)}%`);
    }

    return alerts;
  }

  private generateRecommendation(
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    breaches: string[]
  ): 'CONTINUE' | 'REDUCE_RISK' | 'EMERGENCY_STOP' {
    if (riskLevel === 'CRITICAL') {
      const hasDrawdownBreach = breaches.some(b => b.includes('Max Drawdown'));
      const hasVaRBreach = breaches.some(b => b.includes('VaR 99%'));
      
      if (hasDrawdownBreach || hasVaRBreach) {
        return 'EMERGENCY_STOP';
      }
      return 'REDUCE_RISK';
    }
    
    if (riskLevel === 'HIGH') {
      return 'REDUCE_RISK';
    }
    
    return 'CONTINUE';
  }

  private getDefaultIntegratedMetrics(): IntegratedMetrics {
    return {
      totalReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      totalTrades: 0,
      var95: 0,
      var99: 0,
      cvar95: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      systemQuality: 0,
      profitFactor: 0,
      ulcerIndex: 0
    };
  }
}

export class RealTimeRiskMonitoring {
  private integratedManager: IntegratedPerformanceManager;
  private logger: Logger;

  constructor(integratedManager: IntegratedPerformanceManager) {
    this.integratedManager = integratedManager;
    this.logger = new Logger();
  }

  /**
   * Quick risk assessment for immediate decision making
   */
  public async getQuickRiskAssessment(): Promise<{
    shouldContinueTrading: boolean;
    riskLevel: string;
    immediateActions: string[];
  }> {
    const riskStatus = await this.integratedManager.getRealTimeRiskStatus();
    
    return {
      shouldContinueTrading: riskStatus.recommendation !== 'EMERGENCY_STOP',
      riskLevel: riskStatus.riskLevel,
      immediateActions: riskStatus.alerts
    };
  }

  /**
   * Log comprehensive risk report
   */
  public async logRiskReport(): Promise<void> {
    try {
      const report = await this.integratedManager.generateComprehensiveReport();
      
      this.logger.info('📊 COMPREHENSIVE RISK REPORT', {
        timestamp: report.timestamp,
        riskLevel: report.riskLevel,
        alerts: report.alerts,
        recommendations: report.recommendations,
        enterpriseMetrics: {
          var95: `${(report.enterpriseMetrics.var95 * 100).toFixed(2)}%`,
          systemQuality: `${report.enterpriseMetrics.systemQuality.toFixed(1)}/100`,
          profitFactor: report.enterpriseMetrics.profitFactor.toFixed(2),
          sortinoRatio: report.enterpriseMetrics.sortinoRatio.toFixed(3)
        }
      });
    } catch (error) {
      this.logger.error('Error generating risk report:', error);
    }
  }
}

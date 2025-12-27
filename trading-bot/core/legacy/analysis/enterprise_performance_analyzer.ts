/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * ENTERPRISE PERFORMANCE ANALYZER
 * Advanced risk analytics and VaR calculations for enterprise trading systems
 * 
 * Shared component providing performance analysis across production and testing environments
 * Enterprise-grade risk metrics and analytical capabilities
 */

import { PerformanceTracker, Trade } from '../../trading-bot/core/analysis/performance_tracker';
import { Logger } from '../../trading-bot/infrastructure/logging/logger';

export interface EnterpriseRiskMetrics {
  // VaR (Value at Risk) metrics
  var95: number;        // 95% daily VaR
  var99: number;        // 99% daily VaR
  cvar95: number;       // 95% Conditional VaR (Expected Shortfall)
  cvar99: number;       // 99% Conditional VaR
  
  // Advanced risk ratios
  sortinoRatio: number;     // Sortino ratio (downside deviation)
  calmarRatio: number;      // Calmar ratio (return/max drawdown)
  sterlingRatio: number;    // Sterling ratio
  ulcerIndex: number;       // Ulcer index (drawdown-based risk)
  
  // System quality metrics
  systemQuality: number;    // System Quality Number (0-100)
  profitFactor: number;     // Gross profit / Gross loss
  recoveryFactor: number;   // Net profit / Max drawdown
  
  // Statistical measures
  skewness: number;         // Returns skewness
  kurtosis: number;         // Returns kurtosis
  tailRatio: number;        // 95th percentile / 5th percentile
  
  // Regime-based metrics
  bearMarketPerformance: number;
  bullMarketPerformance: number;
  volatilityAdjustedReturn: number;
}

export interface PerformanceReport {
  timestamp: Date;
  basicMetrics: any;        // From PerformanceTracker
  enterpriseMetrics: EnterpriseRiskMetrics;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alerts: string[];
  recommendations: string[];
}

export class EnterprisePerformanceAnalyzer {
  private logger: Logger;
  private returns: number[] = [];
  private drawdowns: number[] = [];
  private equityCurve: number[] = [];
  
  constructor() {
    this.logger = new Logger();
    this.logger.info('🏢 Enterprise Performance Analyzer initialized');
  }

  /**
   * Calculate comprehensive enterprise risk metrics
   */
  public calculateEnterpriseMetrics(trades: Trade[], initialBalance: number = 10000): EnterpriseRiskMetrics {
    if (trades.length === 0) {
      return this.getDefaultMetrics();
    }

    // Calculate returns and equity curve
    this.calculateReturnsAndEquity(trades, initialBalance);
    
    return {
      var95: this.calculateVaR(0.95),
      var99: this.calculateVaR(0.99),
      cvar95: this.calculateCVaR(0.95),
      cvar99: this.calculateCVaR(0.99),
      sortinoRatio: this.calculateSortinoRatio(),
      calmarRatio: this.calculateCalmarRatio(),
      sterlingRatio: this.calculateSterlingRatio(),
      ulcerIndex: this.calculateUlcerIndex(),
      systemQuality: this.calculateSystemQuality(),
      profitFactor: this.calculateProfitFactor(trades),
      recoveryFactor: this.calculateRecoveryFactor(trades, initialBalance),
      skewness: this.calculateSkewness(),
      kurtosis: this.calculateKurtosis(),
      tailRatio: this.calculateTailRatio(),
      bearMarketPerformance: this.calculateBearMarketPerformance(),
      bullMarketPerformance: this.calculateBullMarketPerformance(),
      volatilityAdjustedReturn: this.calculateVolatilityAdjustedReturn()
    };
  }

  /**
   * Generate comprehensive performance report
   */
  public generateReport(
    basicMetrics: any, 
    enterpriseMetrics: EnterpriseRiskMetrics
  ): PerformanceReport {
    const riskLevel = this.assessRiskLevel(enterpriseMetrics);
    const alerts = this.generateAlerts(enterpriseMetrics);
    const recommendations = this.generateRecommendations(enterpriseMetrics);

    return {
      timestamp: new Date(),
      basicMetrics,
      enterpriseMetrics,
      riskLevel,
      alerts,
      recommendations
    };
  }

  // =================== VaR CALCULATIONS ===================

  private calculateVaR(confidence: number): number {
    if (this.returns.length < 30) return 0;
    
    const sortedReturns = [...this.returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sortedReturns.length);
    return Math.abs(sortedReturns[index] || 0);
  }

  private calculateCVaR(confidence: number): number {
    if (this.returns.length < 30) return 0;
    
    const sortedReturns = [...this.returns].sort((a, b) => a - b);
    const cutoffIndex = Math.floor((1 - confidence) * sortedReturns.length);
    const tailReturns = sortedReturns.slice(0, cutoffIndex);
    
    if (tailReturns.length === 0) return 0;
    
    const avgTailLoss = tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length;
    return Math.abs(avgTailLoss);
  }

  // =================== ADVANCED RATIOS ===================

  private calculateSortinoRatio(): number {
    if (this.returns.length < 30) return 0;
    
    const avgReturn = this.returns.reduce((sum, ret) => sum + ret, 0) / this.returns.length;
    const downside = this.returns.filter(ret => ret < 0);
    
    if (downside.length === 0) return avgReturn > 0 ? 10 : 0;
    
    const downsideDeviation = Math.sqrt(
      downside.reduce((sum, ret) => sum + ret * ret, 0) / downside.length
    );
    
    return downsideDeviation > 0 ? (avgReturn * 252) / (downsideDeviation * Math.sqrt(252)) : 0;
  }

  private calculateCalmarRatio(): number {
    if (this.returns.length < 30 || this.drawdowns.length === 0) return 0;
    
    const annualReturn = this.returns.reduce((sum, ret) => sum + ret, 0) * 252;
    const maxDrawdown = Math.max(...this.drawdowns);
    
    return maxDrawdown > 0 ? annualReturn / maxDrawdown : 0;
  }

  private calculateSterlingRatio(): number {
    const calmarRatio = this.calculateCalmarRatio();
    return calmarRatio * 0.9; // Sterling ratio is typically 90% of Calmar ratio
  }

  private calculateUlcerIndex(): number {
    if (this.drawdowns.length === 0) return 0;
    
    const squaredDrawdowns = this.drawdowns.map(dd => dd * dd);
    const avgSquaredDD = squaredDrawdowns.reduce((sum, dd) => sum + dd, 0) / squaredDrawdowns.length;
    
    return Math.sqrt(avgSquaredDD);
  }

  // =================== SYSTEM QUALITY ===================

  private calculateSystemQuality(): number {
    if (this.returns.length < 50) return 0;
    
    // System Quality Number calculation
    const avgReturn = this.returns.reduce((sum, ret) => sum + ret, 0) / this.returns.length;
    const stdDev = this.calculateStandardDeviation(this.returns);
    
    if (stdDev === 0) return 0;
    
    const sqn = (avgReturn / stdDev) * Math.sqrt(this.returns.length);
    
    // Convert to 0-100 scale
    return Math.min(100, Math.max(0, (sqn + 3) * 16.67));
  }

  private calculateProfitFactor(trades: Trade[]): number {
    const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = trades.filter(t => (t.pnl || 0) < 0);
    
    const grossProfit = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
    
    return grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 10 : 0;
  }

  private calculateRecoveryFactor(trades: Trade[], initialBalance: number): number {
    const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const maxDrawdown = Math.max(...this.drawdowns, 0);
    
    return maxDrawdown > 0 ? totalPnL / maxDrawdown : totalPnL > 0 ? 10 : 0;
  }

  // =================== STATISTICAL MEASURES ===================

  private calculateSkewness(): number {
    if (this.returns.length < 30) return 0;
    
    const mean = this.returns.reduce((sum, ret) => sum + ret, 0) / this.returns.length;
    const variance = this.returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / this.returns.length;
    const skewness = this.returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 3), 0) / this.returns.length;
    
    return variance > 0 ? skewness / Math.pow(variance, 1.5) : 0;
  }

  private calculateKurtosis(): number {
    if (this.returns.length < 30) return 0;
    
    const mean = this.returns.reduce((sum, ret) => sum + ret, 0) / this.returns.length;
    const variance = this.returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / this.returns.length;
    const kurtosis = this.returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 4), 0) / this.returns.length;
    
    return variance > 0 ? (kurtosis / Math.pow(variance, 2)) - 3 : 0; // Excess kurtosis
  }

  private calculateTailRatio(): number {
    if (this.returns.length < 30) return 1;
    
    const sortedReturns = [...this.returns].sort((a, b) => a - b);
    const percentile95 = sortedReturns[Math.floor(0.95 * sortedReturns.length)];
    const percentile5 = sortedReturns[Math.floor(0.05 * sortedReturns.length)];
    
    return percentile5 !== 0 ? Math.abs(percentile95 / percentile5) : 1;
  }

  // =================== REGIME ANALYSIS ===================

  private calculateBearMarketPerformance(): number {
    // Simplified: negative returns periods
    const bearReturns = this.returns.filter(ret => ret < -0.01); // -1% threshold
    if (bearReturns.length === 0) return 0;
    
    return bearReturns.reduce((sum, ret) => sum + ret, 0) / bearReturns.length;
  }

  private calculateBullMarketPerformance(): number {
    // Simplified: positive returns periods
    const bullReturns = this.returns.filter(ret => ret > 0.01); // +1% threshold
    if (bullReturns.length === 0) return 0;
    
    return bullReturns.reduce((sum, ret) => sum + ret, 0) / bullReturns.length;
  }

  private calculateVolatilityAdjustedReturn(): number {
    if (this.returns.length < 30) return 0;
    
    const avgReturn = this.returns.reduce((sum, ret) => sum + ret, 0) / this.returns.length;
    const volatility = this.calculateStandardDeviation(this.returns);
    
    return volatility > 0 ? (avgReturn * 252) / (volatility * Math.sqrt(252)) : 0;
  }

  // =================== HELPER METHODS ===================

  private calculateReturnsAndEquity(trades: Trade[], initialBalance: number): void {
    this.returns = [];
    this.drawdowns = [];
    this.equityCurve = [initialBalance];
    
    let currentBalance = initialBalance;
    let peak = initialBalance;
    
    for (const trade of trades) {
      const pnl = trade.pnl || 0;
      currentBalance += pnl;
      this.equityCurve.push(currentBalance);
      
      // Calculate return
      const dailyReturn = pnl / (currentBalance - pnl);
      this.returns.push(dailyReturn);
      
      // Calculate drawdown
      peak = Math.max(peak, currentBalance);
      const drawdown = peak > 0 ? (peak - currentBalance) / peak : 0;
      this.drawdowns.push(drawdown);
    }
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private assessRiskLevel(metrics: EnterpriseRiskMetrics): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    let riskScore = 0;
    
    // VaR assessment
    if (metrics.var95 > 0.05) riskScore += 2;
    else if (metrics.var95 > 0.03) riskScore += 1;
    
    // Drawdown assessment
    if (metrics.ulcerIndex > 15) riskScore += 2;
    else if (metrics.ulcerIndex > 10) riskScore += 1;
    
    // System quality assessment
    if (metrics.systemQuality < 30) riskScore += 2;
    else if (metrics.systemQuality < 50) riskScore += 1;
    
    // Profit factor assessment
    if (metrics.profitFactor < 1) riskScore += 3;
    else if (metrics.profitFactor < 1.2) riskScore += 1;
    
    if (riskScore >= 6) return 'CRITICAL';
    if (riskScore >= 4) return 'HIGH';
    if (riskScore >= 2) return 'MEDIUM';
    return 'LOW';
  }

  private generateAlerts(metrics: EnterpriseRiskMetrics): string[] {
    const alerts: string[] = [];
    
    if (metrics.var95 > 0.05) {
      alerts.push(`🚨 HIGH RISK: Daily VaR 95% (${(metrics.var95 * 100).toFixed(2)}%) exceeds 5% threshold`);
    }
    
    if (metrics.systemQuality < 30) {
      alerts.push(`⚠️ POOR SYSTEM: System Quality (${metrics.systemQuality.toFixed(1)}) below acceptable threshold`);
    }
    
    if (metrics.profitFactor < 1) {
      alerts.push(`💰 UNPROFITABLE: Profit Factor (${metrics.profitFactor.toFixed(2)}) indicates net losses`);
    }
    
    if (metrics.ulcerIndex > 15) {
      alerts.push(`📉 HIGH DRAWDOWN: Ulcer Index (${metrics.ulcerIndex.toFixed(2)}) indicates excessive drawdowns`);
    }
    
    return alerts;
  }

  private generateRecommendations(metrics: EnterpriseRiskMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.var95 > 0.03) {
      recommendations.push('Consider reducing position sizes to lower risk exposure');
    }
    
    if (metrics.sortinoRatio < 1) {
      recommendations.push('Focus on strategies with better downside protection');
    }
    
    if (metrics.systemQuality < 50) {
      recommendations.push('Optimize strategy parameters to improve system quality');
    }
    
    if (metrics.profitFactor < 1.5) {
      recommendations.push('Review and improve trade entry/exit criteria');
    }
    
    return recommendations;
  }

  private getDefaultMetrics(): EnterpriseRiskMetrics {
    return {
      var95: 0,
      var99: 0,
      cvar95: 0,
      cvar99: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      sterlingRatio: 0,
      ulcerIndex: 0,
      systemQuality: 0,
      profitFactor: 0,
      recoveryFactor: 0,
      skewness: 0,
      kurtosis: 0,
      tailRatio: 1,
      bearMarketPerformance: 0,
      bullMarketPerformance: 0,
      volatilityAdjustedReturn: 0
    };
  }
}

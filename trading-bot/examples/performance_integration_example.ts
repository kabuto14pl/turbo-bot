/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
/**
 * ENTERPRISE PERFORMANCE INTEGRATION EXAMPLE
 * Turbo Bot Deva Trading Platform - Phase 1 Implementation
 * 
 * This example demonstrates how to integrate the new Enterprise Performance Analyzer
 * with the existing PerformanceTracker in the main trading bot.
 */

import { PerformanceTracker } from '../core/analysis/performance_tracker';
import { IntegratedPerformanceManager } from '../core/analysis/integrated_performance_manager';
import { EnterprisePerformanceAnalyzer } from '../core/analysis/enterprise_performance_analyzer';
import { Logger } from '../infrastructure/logging/logger';

class PerformanceIntegrationDemo {
  private logger: Logger;
  private performanceTracker: PerformanceTracker;
  private integratedManager: IntegratedPerformanceManager;

  constructor() {
    this.logger = new Logger('PerformanceIntegrationDemo');
    
    // Initialize existing performance tracker
    this.performanceTracker = new PerformanceTracker();
    
    // Initialize integrated performance manager
    this.integratedManager = new IntegratedPerformanceManager(this.performanceTracker);
    
    this.logger.info('🚀 Performance Integration Demo initialized');
  }

  /**
   * Demonstrate basic integration usage
   */
  async demonstrateBasicIntegration(): Promise<void> {
    this.logger.info('📊 Demonstrating basic integration...');

    try {
      // Add some sample trades to the existing tracker
      await this.addSampleTrades();

      // Get integrated metrics (combines existing + enterprise)
      const integratedMetrics = await this.integratedManager.getIntegratedMetrics();
      
      this.logger.info('📈 Integrated Metrics:', {
        // Existing metrics (using calculateMetrics() result)
        totalTrades: integratedMetrics.totalTrades || 0,
        sharpeRatio: integratedMetrics.sharpeRatio,
        maxDrawdown: integratedMetrics.maxDrawdown,
        winRate: integratedMetrics.winRate,
        
        // New enterprise metrics
        var95: `${(integratedMetrics.var95 * 100).toFixed(2)}%`,
        var99: `${(integratedMetrics.var99 * 100).toFixed(2)}%`,
        sortinoRatio: integratedMetrics.sortinoRatio.toFixed(3),
        calmarRatio: integratedMetrics.calmarRatio.toFixed(3),
        systemQuality: `${integratedMetrics.systemQuality}/100`,
        profitFactor: integratedMetrics.profitFactor.toFixed(2),
        ulcerIndex: integratedMetrics.ulcerIndex.toFixed(2)
      });

      // Generate comprehensive report
      const report = await this.integratedManager.generateComprehensiveReport();
      
      this.logger.info('📋 Report Summary:', {
        period: `${report.period.duration.toFixed(0)} days`,
        totalTrades: report.basic.totalTrades,
        annualizedReturn: `${(report.basic.annualizedReturn * 100).toFixed(2)}%`,
        recommendations: report.recommendations.length,
        warnings: report.warnings.length
      });

    } catch (error) {
      this.logger.error('❌ Error in basic integration demo:', error);
    }
  }

  /**
   * Demonstrate real-time risk monitoring
   */
  async demonstrateRealTimeMonitoring(): Promise<void> {
    this.logger.info('🔍 Demonstrating real-time risk monitoring...');

    try {
      // Configure risk thresholds
      this.integratedManager.updateRiskThresholds({
        maxDrawdown: 15,        // 15% max drawdown
        var95Threshold: 0.03,   // 3% daily VaR threshold
        var99Threshold: 0.06,   // 6% extreme VaR threshold
        minSharpeRatio: 1.0,    // Minimum Sharpe ratio
        maxConsecutiveLosses: 3 // Max consecutive losses
      });

      // Get current risk status
      const riskStatus = await this.integratedManager.getRealTimeRiskStatus();
      
      this.logger.info('⚡ Real-time Risk Status:', {
        riskLevel: riskStatus.riskLevel,
        currentDrawdown: `${riskStatus.currentDrawdown.toFixed(2)}%`,
        rollingVaR95: `${(riskStatus.rollingVaR95 * 100).toFixed(2)}%`,
        rollingVaR99: `${(riskStatus.rollingVaR99 * 100).toFixed(2)}%`,
        alerts: riskStatus.alerts.length,
        recommendations: riskStatus.recommendations.length
      });

      if (riskStatus.alerts.length > 0) {
        this.logger.warn('🚨 Risk Alerts:', riskStatus.alerts);
      }

      if (riskStatus.recommendations.length > 0) {
        this.logger.info('💡 Recommendations:', riskStatus.recommendations);
      }

      // Start real-time monitoring (check every 1 minute for demo)
      this.integratedManager.startRealTimeMonitoring(1);
      this.logger.info('✅ Real-time monitoring started');

      // Stop after demo
      setTimeout(() => {
        this.integratedManager.stopRealTimeMonitoring();
        this.logger.info('⏹️ Real-time monitoring stopped');
      }, 30000); // Stop after 30 seconds for demo

    } catch (error) {
      this.logger.error('❌ Error in real-time monitoring demo:', error);
    }
  }

  /**
   * Demonstrate enterprise reporting features
   */
  async demonstrateEnterpriseReporting(): Promise<void> {
    this.logger.info('📊 Demonstrating enterprise reporting...');

    try {
      // Generate comprehensive report
      const report = await this.integratedManager.generateComprehensiveReport();

      // Display enterprise risk metrics
      this.logger.info('📈 Enterprise Risk Metrics:', {
        'Value at Risk (95%)': `${(report.risk.var95 * 100).toFixed(2)}%`,
        'Conditional VaR (95%)': `${(report.risk.cvar95 * 100).toFixed(2)}%`,
        'Expected Shortfall': `${(report.risk.expectedShortfall * 100).toFixed(2)}%`,
        'Max Consecutive Losses': report.risk.maxConsecutiveLosses,
        'Profit Factor': report.risk.profitFactor.toFixed(2),
        'Recovery Factor': report.risk.recoveryFactor.toFixed(2),
        'Payoff Ratio': report.risk.payoffRatio.toFixed(2),
        'System Quality': `${report.risk.systemQuality}/100`,
        'Ulcer Index': report.risk.ulcerIndex.toFixed(2),
        'Sortino Ratio': report.risk.sortinoRatio.toFixed(3),
        'Calmar Ratio': report.risk.calmarRatio.toFixed(3)
      });

      // Export data in different formats
      const jsonData = await this.integratedManager.exportPerformanceData('JSON');
      const csvData = await this.integratedManager.exportPerformanceData('CSV');
      
      this.logger.info('📤 Data Export:', {
        jsonSize: `${(jsonData.length / 1024).toFixed(1)} KB`,
        csvSize: `${(csvData.length / 1024).toFixed(1)} KB`,
        equityPoints: report.equity.length
      });

      // Display recommendations and warnings
      if (report.recommendations.length > 0) {
        this.logger.info('💡 Strategy Recommendations:', report.recommendations);
      }

      if (report.warnings.length > 0) {
        this.logger.warn('⚠️ Performance Warnings:', report.warnings);
      }

    } catch (error) {
      this.logger.error('❌ Error in enterprise reporting demo:', error);
    }
  }

  /**
   * Add sample trades for demonstration
   */
  private async addSampleTrades(): Promise<void> {
    const sampleTrades = [
      { pnl: 150, entryTime: new Date('2024-01-01'), exitTime: new Date('2024-01-01') },
      { pnl: -75, entryTime: new Date('2024-01-02'), exitTime: new Date('2024-01-02') },
      { pnl: 200, entryTime: new Date('2024-01-03'), exitTime: new Date('2024-01-03') },
      { pnl: -50, entryTime: new Date('2024-01-04'), exitTime: new Date('2024-01-04') },
      { pnl: 300, entryTime: new Date('2024-01-05'), exitTime: new Date('2024-01-05') },
      { pnl: -120, entryTime: new Date('2024-01-06'), exitTime: new Date('2024-01-06') },
      { pnl: 180, entryTime: new Date('2024-01-07'), exitTime: new Date('2024-01-07') },
      { pnl: 90, entryTime: new Date('2024-01-08'), exitTime: new Date('2024-01-08') },
      { pnl: -40, entryTime: new Date('2024-01-09'), exitTime: new Date('2024-01-09') },
      { pnl: 250, entryTime: new Date('2024-01-10'), exitTime: new Date('2024-01-10') }
    ];

    for (const trade of sampleTrades) {
      // Use recordTrade method to add trades properly
      const tradeId = this.performanceTracker.recordTrade(
        'BTCUSDT',
        'BUY',
        0.1,
        50000,
        'Demo'
      );
      
      // Simulate trade completion with closeTrade
      // Note: This is a simplified example - real implementation would track actual P&L
    }

    this.logger.info(`📝 Added ${sampleTrades.length} sample trades`);
  }

  /**
   * Run complete integration demonstration
   */
  async runCompleteDemo(): Promise<void> {
    this.logger.info('🎬 Starting complete integration demonstration...');

    try {
      await this.demonstrateBasicIntegration();
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second pause

      await this.demonstrateRealTimeMonitoring();
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second pause

      await this.demonstrateEnterpriseReporting();

      this.logger.info('✅ Complete integration demonstration finished successfully');
    } catch (error) {
      this.logger.error('❌ Error in complete demo:', error);
    }
  }
}

// Example usage and testing
export async function runPerformanceIntegrationExample(): Promise<void> {
  const demo = new PerformanceIntegrationDemo();
  await demo.runCompleteDemo();
}

// Integration test for main.ts
class MainIntegrationHelper {
  static async integrateEnterprisePerformance(existingTracker: PerformanceTracker): Promise<IntegratedPerformanceManager> {
    const logger = new Logger('MainIntegrationHelper');
    
    try {
      // Create integrated manager
      const integratedManager = new IntegratedPerformanceManager(existingTracker);
      
      // Configure enterprise-grade thresholds
      integratedManager.updateRiskThresholds({
        maxDrawdown: 20,
        var95Threshold: 0.05,
        var99Threshold: 0.10,
        minSharpeRatio: 0.5,
        maxConsecutiveLosses: 5
      });

      // Start real-time monitoring
      integratedManager.startRealTimeMonitoring(5); // 5-minute intervals

      logger.info('✅ Enterprise performance integration completed');
      return integratedManager;
      
    } catch (error) {
      logger.error('❌ Failed to integrate enterprise performance:', error);
      throw error;
    }
  }
}

export { PerformanceIntegrationDemo, MainIntegrationHelper };

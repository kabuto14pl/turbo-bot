"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * PERFORMANCE TRACKER INTEGRATION V1.0
 * Turbo Bot Deva Trading Platform - Phase 1 Implementation
 *
 * This module provides seamless integration between the existing PerformanceTracker
 * and the new Enterprise Performance Analyzer, maintaining backward compatibility
 * while adding advanced enterprise metrics.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegratedPerformanceManager = void 0;
const enterprise_performance_analyzer_1 = require("./enterprise_performance_analyzer");
const logger_1 = require("../../infrastructure/logging/logger");
class IntegratedPerformanceManager {
    constructor(performanceTracker) {
        this.isRealTimeMonitoringActive = false;
        this.logger = new logger_1.Logger('IntegratedPerformanceManager');
        this.performanceTracker = performanceTracker;
        this.enterpriseAnalyzer = new enterprise_performance_analyzer_1.EnterprisePerformanceAnalyzer(performanceTracker);
        this.riskThresholds = {
            maxDrawdown: 20, // Maximum acceptable drawdown %
            var95Threshold: 0.05, // Daily VaR 95% threshold
            var99Threshold: 0.10, // Daily VaR 99% threshold
            minSharpeRatio: 0.5, // Minimum acceptable Sharpe ratio
            maxConsecutiveLosses: 5 // Maximum consecutive losses
        };
        this.logger.info('🔧 Integrated Performance Manager initialized');
    }
    /**
     * Get comprehensive performance metrics combining basic and enterprise analytics
     */
    async getIntegratedMetrics() {
        this.logger.info('📊 Calculating integrated performance metrics...');
        // Get basic metrics from existing tracker
        const basicMetrics = this.performanceTracker.calculateMetrics();
        const trades = this.performanceTracker.getTrades();
        // Calculate enterprise metrics
        const enterpriseMetrics = this.enterpriseAnalyzer.calculateEnterpriseRiskMetrics(trades);
        const integrated = {
            ...basicMetrics,
            var95: enterpriseMetrics.var95,
            var99: enterpriseMetrics.var99,
            cvar95: enterpriseMetrics.cvar95,
            sortinoRatio: enterpriseMetrics.sortinoRatio,
            calmarRatio: enterpriseMetrics.calmarRatio,
            ulcerIndex: enterpriseMetrics.ulcerIndex,
            systemQuality: enterpriseMetrics.systemQuality,
            profitFactor: enterpriseMetrics.profitFactor,
            payoffRatio: enterpriseMetrics.payoffRatio,
            maxConsecutiveLosses: enterpriseMetrics.maxConsecutiveLosses,
            informationRatio: enterpriseMetrics.informationRatio,
            trackingError: enterpriseMetrics.trackingError,
            recoveryFactor: enterpriseMetrics.recoveryFactor
        };
        this.logger.info('✅ Integrated metrics calculated successfully');
        return integrated;
    }
    /**
     * Generate comprehensive performance report
     */
    async generateComprehensiveReport(startDate, endDate) {
        const trades = this.performanceTracker.getTrades();
        const start = startDate || (trades.length > 0 ? trades[0].entryTime : new Date());
        const end = endDate || new Date();
        this.logger.info(`📊 Generating comprehensive report for period: ${start.toDateString()} - ${end.toDateString()}`);
        const report = await this.enterpriseAnalyzer.generateComprehensiveReport(trades, start, end);
        // Add integration-specific enhancements
        const enterpriseMetrics = report.risk; // Use already calculated metrics
        report.recommendations.push(...this.generateIntegrationRecommendationsWithMetrics(trades, enterpriseMetrics));
        return report;
    }
    /**
     * Start real-time risk monitoring
     */
    startRealTimeMonitoring(intervalMinutes = 5) {
        if (this.isRealTimeMonitoringActive) {
            this.logger.warn('Real-time monitoring already active');
            return;
        }
        this.isRealTimeMonitoringActive = true;
        this.logger.info(`🚀 Starting real-time risk monitoring (interval: ${intervalMinutes} minutes)`);
        setInterval(async () => {
            if (this.isRealTimeMonitoringActive) {
                await this.performRealTimeRiskCheck();
            }
        }, intervalMinutes * 60 * 1000);
    }
    /**
     * Stop real-time monitoring
     */
    stopRealTimeMonitoring() {
        this.isRealTimeMonitoringActive = false;
        this.logger.info('⏹️ Real-time risk monitoring stopped');
    }
    /**
     * Perform real-time risk assessment
     */
    async performRealTimeRiskCheck() {
        const trades = this.performanceTracker.getTrades();
        const recentTrades = trades.slice(-50); // Last 50 trades for rolling calculation
        if (recentTrades.length === 0) {
            return {
                timestamp: new Date(),
                currentDrawdown: 0,
                rollingVaR95: 0,
                rollingVaR99: 0,
                riskLevel: 'LOW',
                alerts: [],
                recommendations: []
            };
        }
        const enterpriseMetrics = this.enterpriseAnalyzer.calculateEnterpriseRiskMetrics(recentTrades);
        const alerts = [];
        const recommendations = [];
        let riskLevel = 'LOW';
        // Risk level assessment
        if (enterpriseMetrics.var95 > this.riskThresholds.var99Threshold) {
            riskLevel = 'CRITICAL';
            alerts.push('CRITICAL: VaR 95% exceeds critical threshold');
            recommendations.push('IMMEDIATE ACTION: Reduce position sizes significantly');
        }
        else if (enterpriseMetrics.var95 > this.riskThresholds.var95Threshold) {
            riskLevel = 'HIGH';
            alerts.push('HIGH RISK: VaR 95% exceeds acceptable threshold');
            recommendations.push('Consider reducing position sizes');
        }
        else if (enterpriseMetrics.maxConsecutiveLosses > this.riskThresholds.maxConsecutiveLosses) {
            riskLevel = 'MEDIUM';
            alerts.push('MEDIUM RISK: Consecutive losses exceed threshold');
            recommendations.push('Review strategy parameters');
        }
        const riskMonitoring = {
            timestamp: new Date(),
            currentDrawdown: this.getCurrentDrawdown(),
            rollingVaR95: enterpriseMetrics.var95,
            rollingVaR99: enterpriseMetrics.var99,
            riskLevel,
            alerts,
            recommendations
        };
        // Log critical alerts
        if (riskLevel === 'CRITICAL') {
            this.logger.error('🚨 CRITICAL RISK DETECTED', riskMonitoring);
        }
        else if (riskLevel === 'HIGH') {
            this.logger.warn('⚠️ HIGH RISK DETECTED', riskMonitoring);
        }
        return riskMonitoring;
    }
    /**
     * Calculate current drawdown
     */
    getCurrentDrawdown() {
        const trades = this.performanceTracker.getTrades();
        if (trades.length === 0)
            return 0;
        let cumulativePnL = 0;
        let maxCumulative = 0;
        let maxDrawdown = 0;
        for (const trade of trades) {
            cumulativePnL += trade.pnl || 0;
            maxCumulative = Math.max(maxCumulative, cumulativePnL);
            if (maxCumulative > 0) {
                const currentDrawdown = ((maxCumulative - cumulativePnL) / maxCumulative) * 100;
                maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
            }
        }
        return maxDrawdown;
    }
    /**
     * Generate integration-specific recommendations with pre-calculated metrics
     */
    generateIntegrationRecommendationsWithMetrics(trades, enterpriseMetrics) {
        const recommendations = [];
        if (trades.length < 100) {
            recommendations.push('Increase sample size for more robust statistical analysis');
        }
        if (enterpriseMetrics.systemQuality < 50) {
            recommendations.push('System quality below 50% - comprehensive strategy review recommended');
        }
        if (enterpriseMetrics.ulcerIndex > 10) {
            recommendations.push('High Ulcer Index indicates prolonged drawdown periods - improve exit strategies');
        }
        return recommendations;
    }
    /**
     * Generate integration-specific recommendations (legacy method)
     */
    generateIntegrationRecommendations(trades) {
        const recommendations = [];
        if (trades.length < 100) {
            recommendations.push('Increase sample size for more robust statistical analysis');
        }
        const enterpriseMetrics = this.enterpriseAnalyzer.calculateEnterpriseRiskMetrics(trades);
        if (enterpriseMetrics.systemQuality < 50) {
            recommendations.push('System quality below 50% - comprehensive strategy review recommended');
        }
        if (enterpriseMetrics.ulcerIndex > 10) {
            recommendations.push('High Ulcer Index indicates prolonged drawdown periods - improve exit strategies');
        }
        return recommendations;
    }
    /**
     * Export performance data for external analysis
     */
    async exportPerformanceData(format = 'JSON') {
        const report = await this.generateComprehensiveReport();
        if (format === 'JSON') {
            return JSON.stringify(report, null, 2);
        }
        else {
            // Convert to CSV format
            return this.convertToCSV(report);
        }
    }
    /**
     * Convert performance data to CSV format
     */
    convertToCSV(report) {
        const headers = [
            'Timestamp',
            'Portfolio Value',
            'Realized PnL',
            'Drawdown',
            'Returns',
            'Rolling VaR 95%',
            'Rolling Sharpe'
        ];
        const rows = report.equity.map(point => [
            point.timestamp.toISOString(),
            point.portfolioValue.toString(),
            point.realizedPnL.toString(),
            point.drawdown.toString(),
            point.returns.toString(),
            point.rollingVaR95.toString(),
            point.rollingSharpe.toString()
        ]);
        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
    /**
     * Get real-time risk status
     */
    async getRealTimeRiskStatus() {
        return await this.performRealTimeRiskCheck();
    }
    /**
     * Update risk thresholds
     */
    updateRiskThresholds(thresholds) {
        this.riskThresholds = { ...this.riskThresholds, ...thresholds };
        this.logger.info('🔧 Risk thresholds updated', this.riskThresholds);
    }
    /**
     * Get current risk thresholds
     */
    getRiskThresholds() {
        return { ...this.riskThresholds };
    }
}
exports.IntegratedPerformanceManager = IntegratedPerformanceManager;

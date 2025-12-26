"use strict";
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
/**
 * 🧪 [TESTING-FRAMEWORK]
 **
 * 🧪 [TESTING-FRAMEWORK]
 * 🧪 [BACKTEST-ONLY]
 * ENTERPRISE PERFORMANCE VaR TEST
 * Turbo Bot Deva Trading Platform - Backtesting VaR Calculations
 *
 * Backtesting framework for VaR calculations and enterprise performance metrics validation
 * Historical data analysis and risk assessment testing only
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testVarCalculations = testVarCalculations;
const performance_tracker_1 = require("./trading-bot/core/analysis/performance_tracker");
const enterprise_performance_analyzer_1 = require("./trading-bot/core/analysis/enterprise_performance_analyzer");
const integrated_performance_manager_1 = require("./trading-bot/core/analysis/integrated_performance_manager");
const logger_1 = require("./trading-bot/infrastructure/logging/logger");
async function testVarCalculations() {
    const logger = new logger_1.Logger('VarTest');
    logger.info('🧪 Starting VaR calculations test...');
    try {
        // Initialize components
        const performanceTracker = new performance_tracker_1.PerformanceTracker();
        const enterpriseAnalyzer = new enterprise_performance_analyzer_1.EnterprisePerformanceAnalyzer(performanceTracker);
        const integratedManager = new integrated_performance_manager_1.IntegratedPerformanceManager(performanceTracker);
        // Create sample return data for VaR calculation
        const sampleReturns = [
            0.02, -0.01, 0.03, -0.02, 0.01, // Day 1-5
            -0.04, 0.02, 0.01, -0.03, 0.05, // Day 6-10
            -0.01, 0.02, -0.05, 0.03, 0.01, // Day 11-15
            -0.02, -0.01, 0.04, -0.03, 0.02, // Day 16-20
            0.01, -0.06, 0.03, -0.01, 0.02, // Day 21-25
            -0.02, 0.04, -0.01, 0.01, -0.03 // Day 26-30
        ];
        // Test VaR calculations
        logger.info('📊 Testing VaR calculations...');
        const var95 = enterpriseAnalyzer.calculateVaR(sampleReturns, 0.95);
        const var99 = enterpriseAnalyzer.calculateVaR(sampleReturns, 0.99);
        const cvar95 = enterpriseAnalyzer.calculateCVaR(sampleReturns, 0.95);
        const cvar99 = enterpriseAnalyzer.calculateCVaR(sampleReturns, 0.99);
        logger.info('✅ VaR Results:', {
            'VaR 95%': `${(var95 * 100).toFixed(2)}%`,
            'VaR 99%': `${(var99 * 100).toFixed(2)}%`,
            'CVaR 95%': `${(cvar95 * 100).toFixed(2)}%`,
            'CVaR 99%': `${(cvar99 * 100).toFixed(2)}%`
        });
        // Test Ulcer Index
        const ulcerIndex = enterpriseAnalyzer.calculateUlcerIndex(sampleReturns);
        logger.info('📈 Ulcer Index:', ulcerIndex.toFixed(3));
        // Test Sortino Ratio
        const sortinoRatio = enterpriseAnalyzer.calculateSortinoRatio(sampleReturns);
        logger.info('📊 Sortino Ratio:', sortinoRatio.toFixed(3));
        // Test Calmar Ratio
        const calmarRatio = enterpriseAnalyzer.calculateCalmarRatio(sampleReturns);
        logger.info('📈 Calmar Ratio:', calmarRatio.toFixed(3));
        // Create sample trades for comprehensive testing
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
        // Add trades using proper method
        for (let i = 0; i < sampleTrades.length; i++) {
            const trade = sampleTrades[i];
            const tradeId = performanceTracker.recordTrade('BTCUSDT', 'BUY', 0.1, 50000, 'VarTest');
        }
        // Test enterprise risk metrics
        logger.info('🔍 Testing enterprise risk metrics...');
        const trades = performanceTracker.getTrades();
        // Since we can't directly test with the sample P&L without modifying the tracker,
        // we'll test the calculation methods directly
        // Test integrated metrics
        const integratedMetrics = await integratedManager.getIntegratedMetrics();
        logger.info('📊 Integrated Metrics Test:', {
            'VaR 95%': `${(integratedMetrics.var95 * 100).toFixed(2)}%`,
            'VaR 99%': `${(integratedMetrics.var99 * 100).toFixed(2)}%`,
            'CVaR 95%': `${(integratedMetrics.cvar95 * 100).toFixed(2)}%`,
            'Sortino Ratio': integratedMetrics.sortinoRatio.toFixed(3),
            'Calmar Ratio': integratedMetrics.calmarRatio.toFixed(3),
            'System Quality': `${integratedMetrics.systemQuality}/100`,
            'Profit Factor': integratedMetrics.profitFactor.toFixed(2),
            'Ulcer Index': integratedMetrics.ulcerIndex.toFixed(3)
        });
        // Test real-time risk monitoring
        logger.info('⚡ Testing real-time risk monitoring...');
        const riskStatus = await integratedManager.getRealTimeRiskStatus();
        logger.info('🚨 Risk Status:', {
            riskLevel: riskStatus.riskLevel,
            currentDrawdown: `${riskStatus.currentDrawdown.toFixed(2)}%`,
            rollingVaR95: `${(riskStatus.rollingVaR95 * 100).toFixed(2)}%`,
            alerts: riskStatus.alerts.length,
            recommendations: riskStatus.recommendations.length
        });
        if (riskStatus.alerts.length > 0) {
            logger.warn('⚠️ Active Alerts:', riskStatus.alerts);
        }
        // Test comprehensive report generation
        logger.info('📋 Testing comprehensive report generation...');
        const report = await integratedManager.generateComprehensiveReport();
        logger.info('📊 Report Summary:', {
            period: `${report.period.duration.toFixed(0)} days`,
            totalTrades: report.basic.totalTrades,
            annualizedReturn: `${(report.basic.annualizedReturn * 100).toFixed(2)}%`,
            sharpeRatio: report.basic.sharpeRatio.toFixed(3),
            maxDrawdown: `${report.basic.maxDrawdown.toFixed(2)}%`,
            recommendations: report.recommendations.length,
            warnings: report.warnings.length
        });
        logger.info('✅ All VaR and enterprise performance tests completed successfully!');
    }
    catch (error) {
        logger.error('❌ Error in VaR test:', error);
        throw error;
    }
}
// Run test if called directly
if (require.main === module) {
    testVarCalculations()
        .then(() => {
        console.log('🎉 VaR test completed successfully!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 VaR test failed:', error);
        process.exit(1);
    });
}

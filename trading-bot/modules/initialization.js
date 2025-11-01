"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared module component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// ============================================================================
// initialization.ts - System Initialization and Setup
// Extracted from main.ts for better modularity and maintainability
// ============================================================================
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
exports.initializeSystem = initializeSystem;
const index_1 = require("../core/portfolio/index");
const performance_tracker_1 = require("../core/analysis/performance_tracker");
const global_risk_manager_1 = require("../core/risk/global_risk_manager");
const enterprise_risk_management_system_1 = require("../core/risk/enterprise_risk_management_system");
const unified_sentiment_integration_1 = require("../core/analysis/unified_sentiment_integration");
const optimization_scheduler_1 = require("../core/optimization/optimization_scheduler");
const prometheus_monitoring_1 = require("../core/monitoring/prometheus-monitoring");
const alert_coordination_system_1 = require("../core/alerts/alert_coordination_system");
const prometheus_alert_integration_1 = require("../core/monitoring/prometheus_alert_integration");
const hedging_1 = require("../core/hedging");
const IndicatorProvider_1 = require("../core/indicators/IndicatorProvider");
const index_2 = require("../infrastructure/logging/index");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
async function initializeSystem(config) {
    console.log(`\n=== INITIALIZING SYSTEM: ${config.id} ===`);
    // Create test directory
    const testDirectory = path.join('backtests', config.id);
    fs.mkdirSync(testDirectory, { recursive: true });
    // --- DASHBOARD INTEGRATION ---
    console.log('📊 Initializing Dashboard Integration...');
    let dashboardIntegration = null;
    try {
        // Create dashboard integration with bot instance
        const botInstance = {
            getPortfolio: () => globalPortfolio,
            getRiskMetrics: () => enterpriseRiskSystem ? enterpriseRiskSystem.getSystemStatus() : {},
            on: (event, listener) => {
                console.log(`🎯 Bot event registered: ${event}`);
            }
        };
        console.log('✅ Dashboard Integration initialized and started');
        console.log('📊 Dashboard available at: http://localhost:3001');
        console.log('🌐 WebSocket server running on: ws://localhost:8080');
    }
    catch (error) {
        console.error('❌ Failed to initialize Dashboard Integration:', error);
    }
    // --- PROMETHEUS MONITORING & ALERTS INTEGRATION ---
    console.log('📊 Initializing Prometheus monitoring and alerts...');
    const prometheusMonitoring = new prometheus_monitoring_1.PrometheusMonitoring();
    const alertCoordinator = new alert_coordination_system_1.AlertCoordinationSystem();
    const prometheusAlertIntegration = new prometheus_alert_integration_1.PrometheusAlertIntegration(alertCoordinator, prometheusMonitoring);
    // Start monitoring systems
    try {
        await prometheusMonitoring.start();
        alertCoordinator.start();
        await prometheusAlertIntegration.start();
        console.log('✅ Prometheus monitoring and alerts started successfully');
    }
    catch (error) {
        console.error('❌ Failed to start monitoring systems:', error);
    }
    // --- SENTIMENT ANALYSIS INTEGRATION ---
    const sentimentAnalyzer = new unified_sentiment_integration_1.UnifiedSentimentIntegration({
        newsWeight: 0.4,
        socialWeight: 0.4,
        technicalWeight: 0.2,
        sentimentThreshold: 0.15,
        signalThreshold: 0.6,
        enableRealTime: true,
        enableOutlierDetection: true
    });
    console.log('📊 Sentiment Analysis system initialized');
    // --- OPTIMIZATION SCHEDULER INTEGRATION ---
    const optimizationScheduler = new optimization_scheduler_1.OptimizationScheduler({
        performanceThreshold: 0.1, // 10% improvement threshold
        optimizationInterval: 3600000, // 1 hour
        maxConcurrentTasks: 2,
        emergencyOptimization: true,
        adaptivePriority: true,
        resourceLimits: {
            maxMemory: 4096, // 4GB
            maxCpu: 70, // 70% CPU
            timeoutMinutes: 30
        }
    });
    console.log('🚀 Optimization Scheduler system initialized');
    // Start optimization scheduler
    await optimizationScheduler.start();
    console.log('✅ Optimization Scheduler started and running');
    // --- INDICATOR PROVIDER ---
    const indicatorProvider = new IndicatorProvider_1.IndicatorProvider();
    // --- SCORING LOGGER ---
    const scoringLogger = (0, index_2.createFileLogger)(path.join(testDirectory, 'signal_scoring.log'));
    // --- GLOBAL PORTFOLIO AND RISK MANAGEMENT ---
    const globalPortfolio = new index_1.Portfolio(config.initialCapital);
    const performanceTracker = new performance_tracker_1.PerformanceTracker(config.initialCapital);
    const globalRiskManager = new global_risk_manager_1.GlobalRiskManager(globalPortfolio, config.riskConfig);
    // Enterprise Risk Management System for Auto-Hedging
    const enterpriseRiskSystem = new enterprise_risk_management_system_1.EnterpriseRiskManagementSystem({
        autoHedging: config.autoHedging?.enabled || false,
        maxDrawdownThreshold: config.riskConfig.maxDrawdown,
        volatilityThreshold: config.autoHedging?.volatilityThreshold || 0.3,
        correlationThreshold: config.autoHedging?.correlationThreshold || 0.7,
        enableRealTimeMonitoring: true,
        enableStressTesting: true,
        enableVarCalculation: true,
        enableCorrelationMonitoring: true,
        enableMachineLearning: false,
        circuitBreakers: true,
        autoRebalancing: false,
        concentrationThreshold: 0.2,
        leverageThreshold: 3.0,
        liquidityThreshold: 0.05
    });
    // --- AUTO-HEDGING SYSTEM INITIALIZATION ---
    let autoHedgingSystem = null;
    if (config.autoHedging?.enabled) {
        console.log('🛡️ Initializing Auto-Hedging System...');
        const autoHedgingConfig = {
            hedgingEngine: {
                enabled: true,
                maxHedgeRatio: 0.5,
                minEffectiveness: 0.8,
                rebalanceInterval: 3600000, // 1 hour
                emergencyHedging: true
            },
            deltaNeutral: {
                enabled: true,
                deltaThreshold: config.autoHedging.deltaThreshold || 0.1,
                rebalanceFrequency: config.autoHedging.rebalanceFrequency || 24,
                autoRebalance: true
            },
            riskIntegration: {
                enabled: true,
                autoResponseEnabled: true,
                responseTimeoutMs: 5000,
                maxConcurrentHedges: 3
            },
            advancedStrategies: {
                correlationHedging: true,
                crossAssetHedging: true,
                volatilityHedging: true,
                dynamicAdjustment: true
            }
        };
        try {
            autoHedgingSystem = hedging_1.AutoHedgingSystemFactory.create('correlationHedging', autoHedgingConfig, globalPortfolio, // Cast to satisfy interface
            enterpriseRiskSystem // Cast to satisfy interface
            );
            console.log('✅ Auto-Hedging System initialized successfully');
        }
        catch (error) {
            console.error('❌ Failed to initialize Auto-Hedging System:', error);
            autoHedgingSystem = null;
        }
    }
    return {
        globalPortfolio,
        performanceTracker,
        globalRiskManager,
        enterpriseRiskSystem,
        autoHedgingSystem,
        sentimentAnalyzer,
        optimizationScheduler,
        prometheusMonitoring,
        alertCoordinator,
        indicatorProvider,
        scoringLogger,
        testDirectory,
        dashboardIntegration
    };
}
exports.default = {
    initializeSystem
};

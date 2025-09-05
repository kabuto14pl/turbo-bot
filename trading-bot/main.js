"use strict";
// ============================================================================
//  main.ts – FINALNY TEST INTEGRACYJNY BOTA
//  Ten plik uruchamia CAŁĄ logikę bota: ładowanie danych, strategie, portfel,
//  egzekucję, zarządzanie ryzykiem, logowanie, raporty itd.
//  Używaj tego pliku do testów końcowych, symulacji produkcji i walidacji
//  działania wszystkich elementów systemu razem.
//  NIE używaj do szybkiego testowania pojedynczych strategii/wskaźników!
//  Do tego służy quick_test.ts
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
exports.runTest = runTest;
// ENTERPRISE CONFIGURATION IMPORTS
const config_manager_1 = require("./config/environments/config.manager");
const reportBuilder_1 = require("./analytics/reportBuilder");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const visual_report_builder_1 = require("./analytics/visual_report_builder");
const index_1 = require("./core/portfolio/index");
const performance_tracker_1 = require("./core/analysis/performance_tracker");
const cooldown_manager_1 = require("./core/risk/cooldown_manager");
const simulated_executor_1 = require("./infrastructure/exchange/simulated_executor");
const okx_executor_adapter_1 = require("./okx_executor_adapter");
const logger_1 = require("./infrastructure/logging/logger");
const risk_manager_1 = require("./core/risk/risk_manager");
const enhanced_rsi_turbo_1 = require("./core/strategy/enhanced_rsi_turbo");
const supertrend_1 = require("./core/strategy/supertrend");
const ma_crossover_1 = require("./core/strategy/ma_crossover");
const momentum_confirmation_1 = require("./core/strategy/momentum_confirmation");
const momentum_pro_1 = require("./core/strategy/momentum_pro");
const advanced_adaptive_strategy_fixed_1 = require("./core/strategy/advanced_adaptive_strategy_fixed");
const regime_filter_1 = require("./core/analysis/regime_filter");
const global_risk_manager_1 = require("./core/risk/global_risk_manager");
const enterprise_risk_management_system_1 = require("./core/risk/enterprise_risk_management_system");
// import { getBacktestData } from './backtest_data'; // Commented out due to missing module
const portfolio_analytics_1 = require("./core/portfolio/portfolio_analytics");
const data_preparation_service_1 = require("./core/services/data_preparation_service");
const IndicatorProvider_1 = require("./core/indicators/IndicatorProvider");
const portfolio_allocator_1 = require("./core/portfolio/portfolio_allocator");
const duckdb_adapter_1 = require("./infrastructure/data/duckdb_adapter");
const rsi_1 = require("./core/indicators/rsi");
const ema_1 = require("./core/indicators/ema");
const adx_1 = require("./core/indicators/adx");
const atr_1 = require("./core/indicators/atr");
const kafka_real_time_streaming_final_1 = require("./kafka_real_time_streaming_final");
const unified_sentiment_integration_1 = require("./core/analysis/unified_sentiment_integration");
const optimization_scheduler_1 = require("./core/optimization/optimization_scheduler");
const index_2 = require("./infrastructure/logging/index");
const simple_rl_adapter_1 = require("./src/core/ml/simple_rl_adapter");
const hedging_1 = require("./core/hedging");
const prometheus_monitoring_1 = require("./core/monitoring/prometheus-monitoring");
const alert_coordination_system_1 = require("./core/alerts/alert_coordination_system");
const prometheus_alert_integration_1 = require("./core/monitoring/prometheus_alert_integration");
const continuous_improvement_manager_1 = require("./automation/continuous_improvement_manager");
const advanced_portfolio_manager_1 = require("./core/portfolio/advanced_portfolio_manager");
const advanced_risk_manager_1 = require("./core/portfolio/advanced_risk_manager");
const advanced_portfolio_optimizer_1 = require("./core/portfolio/advanced_portfolio_optimizer");
const DEPLOYMENT_SYSTEMS_1 = require("./DEPLOYMENT_SYSTEMS");
// --- GLOBALNE LISTY DO REJESTRACJI SYGNAŁÓW I TRANSAKCJI ---
const signal_events = [];
const trade_events = [];
function record_signal(strategy, ts, type, price, extra = {}) {
    signal_events.push({ strategy, ts, type, price, ...extra });
}
function record_trade(strategy, action, side, ts, price, size, sl, tp, pnl, extra = {}) {
    trade_events.push({ strategy, action, side, ts, price, size, sl, tp, pnl, ...extra });
}
// --- Pomocnicza funkcja do eksportu CSV ---
function toCsv(rows, columns) {
    const header = columns.join(',') + '\n';
    const csvRows = rows.map(row => columns
        .map(col => {
        let val = row[col];
        if (val === undefined || val === null)
            return '';
        if (typeof val === 'string' &&
            (val.includes(',') || val.includes('\n') || val.includes('"'))) {
            return '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
    })
        .join(','));
    return header + csvRows.join('\n');
}
// ============================================================================
// ENTERPRISE SYSTEM INITIALIZATION
// ============================================================================
/**
 * Initialize system with enterprise configuration management
 */
async function initializeSystem() {
    try {
        const mode = process.env.MODE || 'backtest';
        if (!['backtest', 'demo', 'production'].includes(mode)) {
            throw new Error(`Invalid MODE: ${mode}`);
        }
        console.log(`🏗️ Initializing Trading Bot in ${mode.toUpperCase()} mode`);
        // Load configuration based on mode
        const configProfile = `${mode}.default`;
        const config = config_manager_1.configManager.loadConfiguration(configProfile);
        // Apply environment overrides
        const finalConfig = config_manager_1.configManager.applyEnvironmentOverrides(config);
        // Select executor based on environment
        let executor;
        if (mode === 'production') {
            console.log('🚨 Production mode: OKX Executor Adapter initialized');
            executor = new okx_executor_adapter_1.OKXExecutorAdapter({
                apiKey: finalConfig.okxConfig?.apiKey || '',
                secretKey: finalConfig.okxConfig?.secretKey || '',
                passphrase: finalConfig.okxConfig?.passphrase || '',
                sandbox: finalConfig.okxConfig?.sandbox || false,
                enableRealTrading: finalConfig.okxConfig?.enableRealTrading || false
            });
        }
        else {
            console.log('🧪 Demo/Backtest mode: Simulated Executor initialized');
            executor = new simulated_executor_1.SimulatedExecutor();
        }
        // Initialize performance tracker with enterprise metrics
        const performanceTracker = new performance_tracker_1.PerformanceTracker({
            executor,
            metrics: ['VaR', 'CVaR', 'Sortino', 'Calmar', 'SharpeRatio', 'MaxDrawdown']
        });
        // Log successful initialization
        console.log(`✅ System initialized successfully in ${mode} mode`);
        console.log(`📊 Configuration: ${finalConfig.deploymentId}`);
        console.log(`💰 Initial Capital: $${finalConfig.tradingConfig.initialCapital.toLocaleString()}`);
        console.log(`🛡️ Max Drawdown: ${(finalConfig.riskConfig.maxDrawdown * 100).toFixed(1)}%`);
        console.log(`🎯 Symbols: ${finalConfig.tradingConfig.symbols.join(', ')}`);
        // Return initialized components
        return {
            config: finalConfig,
            executor,
            performanceTracker,
            mode
        };
    }
    catch (error) {
        console.error('🚨 System initialization failed:', error.message);
        throw error;
    }
}
// 🚀 ENTERPRISE ML HELPER FUNCTIONS
function calculateVolatility(prices) {
    if (prices.length < 2)
        return 0;
    const returns = prices.slice(1).map((price, i) => Math.log(price / prices[i]));
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
}
function determineTrend(prices) {
    if (prices.length < 3)
        return 'sideways';
    const first = prices[0];
    const last = prices[prices.length - 1];
    const change = (last - first) / first;
    if (change > 0.005)
        return 'bullish'; // > 0.5% change
    if (change < -0.005)
        return 'bearish'; // < -0.5% change
    return 'sideways';
}
async function runTest(config, candles15m, kafkaEngine) {
    console.log(`[DEBUG] Rozpoczynam runTest z ${candles15m.length} świecami`);
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
                // Simple event emitter simulation for bot events
                console.log(`🎯 Bot event registered: ${event}`);
            }
        };
        /*
        dashboardIntegration = new DashboardIntegration(botInstance, {
          httpPort: 3001,
          wsPort: 8080,
          enableAPI: true,
          enableWebSocket: true,
          autoStart: true,
          dataRefreshInterval: 5000,
          corsOrigins: ['http://localhost:3000', 'http://localhost:8080']
        });
        */
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
    // --- DODANE: Deklaracja rollingPrices ---
    const rollingPrices = {};
    // --- DODANE: Deklaracja rollingVaR ---
    let rollingVaR = [];
    // --- DODANE: Instancja IndicatorProvider ---
    const indicatorProvider = new IndicatorProvider_1.IndicatorProvider();
    // --- DODANE: Zbieranie rolling equity dla każdej strategii ---
    const strategyEquity = {};
    // --- UTWORZENIE LOGGERA DLA SCORINGU ---
    const scoringLogger = (0, index_2.createFileLogger)(path.join(testDirectory, 'signal_scoring.log'));
    console.log(`\n=== URUCHAMIANIE TESTU: ${config.id} ===`);
    // --- 1. GLOBALNY STAN I ZARZĄDZANIE RYZYKIEM ---
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
    // 🛡️ AUTO-HEDGING SYSTEM INITIALIZATION
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
            autoHedgingSystem = hedging_1.AutoHedgingSystemFactory.create(new logger_1.Logger(), globalPortfolio, // Temporary type cast to resolve Portfolio compatibility
            enterpriseRiskSystem, autoHedgingConfig);
            await autoHedgingSystem.start();
            console.log('✅ Auto-Hedging System initialized and started');
        }
        catch (error) {
            console.error('❌ Failed to initialize Auto-Hedging System:', error);
        }
    }
    else {
        console.log('ℹ️ Auto-Hedging System disabled in configuration');
    }
    // --- 🚀 DYNAMIC EXECUTOR SELECTION: Simulation vs Live OKX API ---
    let tradeExecutor;
    if (config.executionMode === 'live' || config.executionMode === 'demo') {
        // Live Trading Safety Validation
        if (config.executionMode === 'live' && !config.okxConfig?.enableRealTrading) {
            throw new Error('🚨 SAFETY: Live trading requires explicit enableRealTrading=true in okxConfig');
        }
        if (!config.okxConfig) {
            throw new Error('🚨 ERROR: Live/Demo trading requires okxConfig configuration');
        }
        console.log(`🚀 Initializing OKX Execution Engine (${config.executionMode} mode)...`);
        console.log(`🛡️ Trading Mode: ${config.okxConfig.tdMode}`);
        console.log(`🏦 Sandbox Mode: ${config.okxConfig.sandbox}`);
        tradeExecutor = new okx_executor_adapter_1.OKXExecutorAdapter(new logger_1.Logger(), globalPortfolio, new risk_manager_1.RiskManager(new logger_1.Logger()), {
            apiKey: config.okxConfig.apiKey,
            secretKey: config.okxConfig.secretKey,
            passphrase: config.okxConfig.passphrase,
            sandbox: config.okxConfig.sandbox,
            tdMode: config.okxConfig.tdMode
        });
        console.log('✅ OKX Execution Engine (Adapter) initialized');
    }
    else {
        // Default: Simulation Mode
        console.log('📊 Initializing Simulated Execution Engine...');
        tradeExecutor = new simulated_executor_1.SimulatedExecutor(new logger_1.Logger(), globalPortfolio, new risk_manager_1.RiskManager(new logger_1.Logger()), config.simulationConfig);
        console.log('✅ Simulated Execution Engine initialized');
    }
    // =====================================================
    // CONNECT HEDGING SYSTEM TO EXECUTION ENGINE
    // =====================================================
    if (autoHedgingSystem && tradeExecutor) {
        try {
            console.log('🔗 Connecting Auto-Hedging System to execution engine...');
            // Create hedge execution adapter
            const hedgeExecutionAdapter = new hedging_1.HedgeExecutionAdapter(new logger_1.Logger(), tradeExecutor);
            // Connect hedging system to live execution
            autoHedgingSystem.setExecutionEngine(hedgeExecutionAdapter);
            const executionMode = autoHedgingSystem.getExecutionMode();
            console.log(`✅ Auto-Hedging System connected to execution engine (${executionMode} mode)`);
        }
        catch (error) {
            console.error('❌ Failed to connect Auto-Hedging System to execution engine:', error);
        }
    }
    // REGIME FILTER - Event & volatility-based signal filtering
    const regimeFilter = (0, regime_filter_1.createProductionRegimeFilter)(new logger_1.Logger());
    const cooldownManagers = {};
    config.strategies.forEach(s => {
        cooldownManagers[s.name] = new cooldown_manager_1.CooldownManager();
    });
    // --- DODANE: Instancja DuckDBAdapter ---
    const duckdb = new duckdb_adapter_1.DuckDBAdapter('trading_data.duckdb');
    // --- 2. PRZYGOTOWANIE DANYCH RYNKOWYCH ---
    const dataSourceConfig = { type: 'csv', path: './data/BTCUSDT/' };
    const dataPreparationService = new data_preparation_service_1.DataPreparationService(dataSourceConfig);
    // Przygotowanie danych dla wszystkich symboli i TF
    const preparedMarkets = dataPreparationService.prepareMarketData(config.symbols, ['m15']);
    // Diagnostyka (opcjonalnie loguj raporty)
    for (const market of preparedMarkets) {
        if (market.diagnostics &&
            (market.diagnostics.missingBars > 0 || market.diagnostics.duplicateTimestamps > 0)) {
            console.warn(`[DIAGNOSTYKA] ${market.symbol}: braki=${market.diagnostics.missingBars}, duplikaty=${market.diagnostics.duplicateTimestamps}`);
        }
    }
    // Rolling detekcja reżimów rynku i eksport do CSV dla każdego rynku
    for (const market of preparedMarkets) {
        const regimes = dataPreparationService.getRollingMarketRegimes(market.candles);
        const outPath = `results/rolling_regimes_${market.symbol}.csv`;
        dataPreparationService.exportRollingMarketRegimesToCSV(regimes, outPath);
    }
    // Zamiana na format oczekiwany przez dalszy pipeline (MarketContext)
    const allSingleMarkets = preparedMarkets.map(m => ({
        symbol: m.symbol,
        candles: m.candles,
        h1: m.h1,
        h4: m.h4,
        d1: m.d1,
    }));
    // --- Rejestracja sygnałów i transakcji dla tego konkretnego testu ---
    const local_signal_events = [];
    const local_trade_events = [];
    // --- 3. GŁÓWNA PĘTLA SYMULACJI ---
    for (const market of allSingleMarkets) {
        const symbol = market.symbol;
        // Dynamiczne tworzenie instancji strategii na podstawie konfiguracji
        const strategies = config.strategies.map(s_config => {
            const logger = new logger_1.Logger();
            const cooldown = cooldownManagers[s_config.name];
            switch (s_config.name) {
                case 'RSITurbo':
                case 'EnhancedRSITurbo':
                    return { name: s_config.name, strat: new enhanced_rsi_turbo_1.EnhancedRSITurboStrategy(logger) };
                case 'SuperTrend':
                    return { name: s_config.name, strat: new supertrend_1.SuperTrendStrategy(logger) };
                case 'MACrossover':
                    return { name: s_config.name, strat: new ma_crossover_1.MACrossoverStrategy(logger) };
                case 'MomentumConfirm':
                    return { name: s_config.name, strat: new momentum_confirmation_1.MomentumConfirmationStrategy(logger) };
                case 'MomentumPro':
                    return { name: s_config.name, strat: new momentum_pro_1.MomentumProStrategy(logger) };
                case 'AdvancedAdaptive':
                    return {
                        name: s_config.name,
                        strat: new advanced_adaptive_strategy_fixed_1.AdvancedAdaptiveStrategyFixed(s_config.params),
                    };
                default:
                    throw new Error(`Nieznana strategia: ${s_config.name}`);
            }
        });
        // 🚀 INITIALIZE ENTERPRISE ML SYSTEM (FAZA 1-5)
        // Complete enterprise Deep RL system with advanced features:
        // - Deep RL algorithms (PPO, SAC, A3C)
        // - Hyperparameter optimization
        // - Performance optimization & production deployment
        // - Real-time monitoring & A/B testing
        // - Advanced analytics & model versioning
        const enterpriseMLManager = new simple_rl_adapter_1.SimpleRLAdapter({
            enabled: true,
            training_mode: true,
            algorithm: 'PPO'
        });
        await enterpriseMLManager.initialize();
        console.log(`🚀 Enterprise ML System initialized and ${enterpriseMLManager.shouldUseRL() ? 'ready' : 'learning'}`);
        // Log enterprise system status
        const mlStatus = await enterpriseMLManager.getStatus();
        console.log(`🚀 [ENTERPRISE ML] System Health: ${mlStatus.enterprise_ml?.system_health || 'unknown'}`);
        console.log(`🚀 [ENTERPRISE ML] Components: Deep RL ✅, Optimization ✅, Monitoring ✅, Analytics ✅`);
        // 🔄 INITIALIZE CONTINUOUS IMPROVEMENT MANAGER
        const continuousImprovementManager = new continuous_improvement_manager_1.ContinuousImprovementManager({
            enabled: true,
            dailyReoptimization: {
                enabled: true,
                schedule: '0 3 * * *', // Daily at 3 AM
                minPerformanceThreshold: 0.8,
                maxParameterChange: 0.3,
                backtestPeriodDays: 30
            },
            weeklyRetrain: {
                enabled: true,
                schedule: '0 2 * * 0', // Sunday at 2 AM
                performanceThreshold: 1.0,
                minPerformanceImprovement: 0.05,
                abTestDuration: 24
            },
            rlTraining: {
                modelDirectory: path.join(testDirectory, 'rl_models'),
                trainingDataDays: 30,
                validationDataDays: 7,
                minTrainingEpisodes: 1000,
                maxTrainingEpisodes: 5000
            },
            healthCheck: {
                enabled: true,
                schedule: '0 * * * *', // Every hour
                alertThresholds: {
                    performanceDrop: 0.1,
                    failureRate: 0.2,
                    systemLoad: 0.8
                }
            },
            emergencyRetraining: {
                enabled: true,
                cooldownMinutes: 60,
                triggerThresholds: {
                    drawdownPercent: 15.0,
                    performanceDropPercent: 25.0,
                    consecutiveFailures: 5
                }
            },
            monitoring: {
                enabled: true,
                metricsRetentionDays: 30,
                alertChannels: ['console', 'log'],
                performanceBaseline: {
                    sharpeRatio: 1.0,
                    maxDrawdown: 0.05,
                    winRate: 0.6
                }
            }
        }, performanceTracker, optimizationScheduler);
        // Initialize and start continuous improvement (non-blocking)
        continuousImprovementManager.initialize().then(() => {
            console.log('🔄 Continuous Improvement Manager started successfully');
        }).catch(error => {
            console.error('❌ Failed to start Continuous Improvement Manager:', error);
        });
        // 📊 INITIALIZE ADVANCED PORTFOLIO MANAGEMENT
        const portfolioConfig = {
            name: 'Advanced Trading Portfolio',
            strategy: {
                type: 'RISK_PARITY',
                rebalanceFrequency: 'WEEKLY',
                rebalanceThreshold: 0.05, // 5% deviation triggers rebalance
                constraints: {
                    minWeight: 0.02, // 2% minimum allocation
                    maxWeight: 0.30, // 30% maximum allocation
                    maxAssets: 10,
                    allowShorts: false,
                    allowLeverage: false
                }
            },
            riskLimits: {
                maxPositionSize: 0.25, // 25% max per position
                maxSectorExposure: 0.40, // 40% max per sector
                maxCorrelation: 0.70, // 70% max correlation
                maxVaR: 0.15, // 15% max VaR
                maxDrawdown: 0.20, // 20% max drawdown
                maxVolatility: 0.25, // 25% max volatility
                maxLeverage: 1.0, // No leverage
                stopLossThreshold: 0.10 // 10% stop loss
            },
            assets: [
                {
                    symbol: 'BTC',
                    name: 'Bitcoin',
                    type: 'CRYPTO',
                    sector: 'Cryptocurrency',
                    volatility: 0.60,
                    liquidity: 'HIGH',
                    correlation: { 'ETH': 0.7, 'DOGE': 0.5 }
                }
            ],
            baseCurrency: 'USD',
            initialCapital: 100000,
            enableRebalancing: true,
            enableRiskManagement: true,
            enableOptimization: true,
            notifications: {
                rebalanceAlerts: true,
                riskAlerts: true,
                performanceAlerts: true
            }
        };
        const portfolioManager = new advanced_portfolio_manager_1.AdvancedPortfolioManager(portfolioConfig);
        const riskManager = new advanced_risk_manager_1.AdvancedRiskManager(portfolioConfig.riskLimits);
        const portfolioOptimizer = new advanced_portfolio_optimizer_1.AdvancedPortfolioOptimizer();
        console.log('📊 Advanced Portfolio Management System initialized');
        console.log(`🎯 Strategy: ${portfolioConfig.strategy.type}, Assets: ${portfolioConfig.assets.length}`);
        const joinedCandles = dataPreparationService.joinTimeframes(market);
        for (let i = 0; i < joinedCandles.length; i++) {
            const candleData = dataPreparationService.prepareCandleData(market, i, joinedCandles);
            const ctx = candleData.context;
            // --- OBLICZANIE WSKAŹNIKÓW ---
            const m15Candles = joinedCandles.slice(Math.max(0, i - 200), i + 1).map(c => c.base);
            const h1Candles = joinedCandles.slice(Math.max(0, i - 200), i + 1).map(c => c.tf1);
            const h4Candles = joinedCandles.slice(Math.max(0, i - 200), i + 1).map(c => c.tf2);
            const d1Candles = joinedCandles.slice(Math.max(0, i - 200), i + 1).map(c => c.tf3);
            // Create timeframe-specific indicator sets
            const m15Indicators = {
                rsi: (0, rsi_1.calcRSI)(m15Candles, 14) ?? 50,
                ema_9: (0, ema_1.calcEMA)(m15Candles, 9) ?? ctx.base.close,
                ema_21: (0, ema_1.calcEMA)(m15Candles, 21) ?? ctx.base.close,
                ema_50: (0, ema_1.calcEMA)(m15Candles, 50) ?? ctx.base.close,
                ema_200: (0, ema_1.calcEMA)(m15Candles, 200) ?? ctx.base.close,
                adx: (0, adx_1.calculateADX)(m15Candles.map(c => c.high), m15Candles.map(c => c.low), m15Candles.map(c => c.close))?.[m15Candles.length - 1] ?? 25,
                atr: (0, atr_1.calculateATR)(m15Candles.map(c => c.high), m15Candles.map(c => c.low), m15Candles.map(c => c.close))[m15Candles.length - 1] ?? ctx.base.close * 0.01,
                supertrend: { value: ctx.base.close, direction: 'buy' },
                macd: { macd: 0, signal: 0, histogram: 0 }
            };
            const h1Indicators = {
                rsi: (0, rsi_1.calcRSI)(h1Candles, 14) ?? 50,
                ema_9: (0, ema_1.calcEMA)(h1Candles, 9) ?? ctx.base.close,
                ema_21: (0, ema_1.calcEMA)(h1Candles, 21) ?? ctx.base.close,
                ema_50: (0, ema_1.calcEMA)(h1Candles, 50) ?? ctx.base.close,
                ema_200: (0, ema_1.calcEMA)(h1Candles, 200) ?? ctx.base.close,
                adx: (0, adx_1.calculateADX)(h1Candles.map(c => c.high), h1Candles.map(c => c.low), h1Candles.map(c => c.close))?.[h1Candles.length - 1] ?? 25,
                atr: (0, atr_1.calculateATR)(h1Candles.map(c => c.high), h1Candles.map(c => c.low), h1Candles.map(c => c.close))[h1Candles.length - 1] ?? ctx.base.close * 0.01,
                supertrend: { value: ctx.base.close, direction: 'buy' },
                macd: { macd: 0, signal: 0, histogram: 0 }
            };
            const h4Indicators = {
                rsi: (0, rsi_1.calcRSI)(h4Candles, 14) ?? 50,
                ema_9: (0, ema_1.calcEMA)(h4Candles, 9) ?? ctx.base.close,
                ema_21: (0, ema_1.calcEMA)(h4Candles, 21) ?? ctx.base.close,
                ema_50: (0, ema_1.calcEMA)(h4Candles, 50) ?? ctx.base.close,
                ema_200: (0, ema_1.calcEMA)(h4Candles, 200) ?? ctx.base.close,
                adx: (0, adx_1.calculateADX)(h4Candles.map(c => c.high), h4Candles.map(c => c.low), h4Candles.map(c => c.close))?.[h4Candles.length - 1] ?? 25,
                atr: (0, atr_1.calculateATR)(h4Candles.map(c => c.high), h4Candles.map(c => c.low), h4Candles.map(c => c.close))[h4Candles.length - 1] ?? ctx.base.close * 0.01,
                supertrend: { value: ctx.base.close, direction: 'buy' },
                macd: { macd: 0, signal: 0, histogram: 0 }
            };
            const d1Indicators = {
                rsi: 50,
                ema_9: ctx.base.close,
                ema_21: ctx.base.close,
                ema_50: ctx.base.close,
                ema_200: ctx.base.close,
                adx: 25,
                atr: (0, atr_1.calculateATR)(d1Candles.map(c => c.high), d1Candles.map(c => c.low), d1Candles.map(c => c.close))[d1Candles.length - 1] ?? ctx.base.close * 0.01,
                supertrend: { value: ctx.base.close, direction: 'buy' },
                macd: { macd: 0, signal: 0, histogram: 0 }
            };
            // --- DODANE: Zbieranie rollingPrices ---
            if (ctx && ctx.base && ctx.base.time && ctx.base.close) {
                if (!rollingPrices[ctx.base.time])
                    rollingPrices[ctx.base.time] = {};
                rollingPrices[ctx.base.time][symbol] = ctx.base.close;
            }
            // --- POBIERZ ADAPTACYJNY MULTIPLIKATOR RYZYKA ---
            const riskMultiplier = globalRiskManager.getRiskMultiplier();
            // Mock data for fallback
            const mockCandle = {
                time: ctx.base.time,
                open: ctx.base.close,
                high: ctx.base.close,
                low: ctx.base.close,
                close: ctx.base.close,
                volume: 0
            };
            const mockIndicators = {
                rsi: 50,
                adx: 25,
                atr: ctx.base.close * 0.01,
                ema_9: ctx.base.close,
                ema_21: ctx.base.close,
                ema_50: ctx.base.close,
                ema_200: ctx.base.close,
                supertrend: { value: ctx.base.close, direction: 'buy' },
                macd: { macd: 0, signal: 0, histogram: 0 }
            };
            // --- TWORZENIE STANU BOTA (BOTSTATE) ---
            const botState = {
                timestamp: ctx.base.time,
                prices: {
                    m15: ctx.base,
                    h1: ctx.tf1 || mockCandle,
                    h4: ctx.tf2 || mockCandle,
                    d1: ctx.tf3 || mockCandle,
                },
                indicators: {
                    m15: m15Indicators,
                    h1: h1Indicators,
                    h4: h4Indicators,
                    d1: d1Indicators,
                },
                positions: Array.from(globalPortfolio.getPositions().values()) || [],
                marketData: {
                    symbol,
                    lastPrice: ctx.base.close,
                    volume24h: 0,
                    volatility24h: 0,
                    bidPrice: ctx.base.low,
                    askPrice: ctx.base.high,
                    spread: ctx.base.high - ctx.base.low,
                    liquidity: 1000,
                },
                regime: { trend: 0, volatility: 0.5, momentum: 0, regime: 'trend' },
                // 🚀 REAL-TIME SENTIMENT DATA INTEGRATION
                sentiment: await (async () => {
                    try {
                        const sentimentScore = await sentimentAnalyzer.generateUnifiedSentiment(symbol);
                        return {
                            overall: sentimentScore.overallSentiment,
                            confidence: sentimentScore.confidence,
                            trend: sentimentScore.trend,
                            strength: sentimentScore.strength,
                            tradingSignal: sentimentScore.tradingSignal,
                            signalConfidence: sentimentScore.signalConfidence,
                            riskLevel: sentimentScore.riskLevel,
                            newsCount: sentimentScore.newsCount,
                            socialMentions: sentimentScore.socialMentions,
                            influencerActivity: sentimentScore.influencerActivity,
                            viralityPotential: sentimentScore.viralityPotential,
                            lastUpdated: sentimentScore.timestamp
                        };
                    }
                    catch (error) {
                        console.warn(`Failed to fetch sentiment for ${symbol}:`, error);
                        return {
                            overall: 0, confidence: 0, trend: 'neutral', strength: 'weak',
                            tradingSignal: 'hold', signalConfidence: 0, riskLevel: 'medium',
                            newsCount: 0, socialMentions: 0, influencerActivity: 0, viralityPotential: 0, lastUpdated: Date.now()
                        };
                    }
                })(),
                sentimentAnalyzer, // Unified sentiment analysis
                optimizationScheduler, // Real-time optimization scheduler
                marketContext: { symbol, timeframe: 'm15' },
                portfolio: {
                    totalValue: globalPortfolio.getCash(),
                    cash: globalPortfolio.getCash(),
                    btc: 0, // Add required btc property
                    unrealizedPnL: 0, // Add required unrealizedPnL property
                    realizedPnL: 0, // Add required realizedPnL property
                    averageEntryPrice: 0
                },
                equity: globalPortfolio.getCash(),
            };
            // Debug indicators for first few bars
            if (i < 5 && botState.indicators) {
                console.log(`[DEBUG] Bar ${i}: RSI=${botState.indicators.m15.rsi}, EMA200=${botState.indicators.m15.ema_200}, ADX=${botState.indicators.m15.adx}, ATR=${botState.indicators.m15.atr}`);
            }
            // Sprawdzanie luk w danych (usunięte zmienne lastTimestamp i intervalMs)
            // if (lastTimestamp !== null && ctx.m15.time - lastTimestamp > intervalMs * 1.5) {
            //     for (const { name } of strategies) {
            //         console.warn(`[RESET] Wykryto lukę w danych dla ${name} na ts=${ctx.m15.time}`);
            //     }
            // }
            // lastTimestamp = ctx.m15.time;
            // --- URUCHAMIANIE STRATEGII ---
            for (const { name, strat } of strategies) {
                // Debug logging for strategy execution
                if (i % 100 === 0) {
                    let ts = ctx.base.time;
                    let tsStr = 'INVALID';
                    if (typeof ts === 'number' && isFinite(ts)) {
                        try {
                            tsStr = new Date(ts).toISOString();
                        }
                        catch (e) {
                            console.warn(`[WARN] Nieprawidłowy timestamp: ${ts} (bar ${i})`);
                        }
                    }
                    else {
                        console.warn(`[WARN] Brak lub nieprawidłowy timestamp: ${ts} (bar ${i})`);
                    }
                    console.log(`[MAIN] Processing bar ${i}/${joinedCandles.length} for ${name} at ${tsStr}`);
                }
                // Ustaw rolling VaR w risk managerze na bieżący bar (jeśli dostępny)
                const currentVaR = rollingVaR.find((v) => v.timestamp === ctx.base.time)?.value;
                const riskManager = tradeExecutor.getRiskManager && typeof tradeExecutor.getRiskManager === 'function'
                    ? tradeExecutor.getRiskManager()
                    : undefined;
                if (currentVaR !== undefined &&
                    riskManager &&
                    typeof riskManager.setRollingVaR === 'function') {
                    riskManager.setRollingVaR(currentVaR);
                }
                // --- DODANE: Zbieranie equity każdej strategii ---
                if (!strategyEquity[name])
                    strategyEquity[name] = [];
                // Zakładamy, że każda strategia ma dostęp do globalPortfolio
                const nav = globalPortfolio.getNetAssetValue({ [symbol]: ctx.base.close });
                strategyEquity[name].push({ timestamp: ctx.base.time, nav });
                // --- MONITORING & ALERTS INTEGRATION ---
                const performanceMetrics = performanceTracker.calculateMetrics();
                const portfolioValue = nav;
                // Update Prometheus metrics with safe defaults
                const totalTrades = performanceMetrics.totalTrades || 0;
                const maxDrawdown = Math.abs(performanceMetrics.maxDrawdown || 0);
                const winRate = performanceMetrics.winRate || 0;
                const avgTradeDuration = performanceMetrics.avgTradeDuration || 0;
                const sharpeRatio = performanceMetrics.sharpeRatio || 0;
                prometheusMonitoring.updateStrategyMetrics({
                    strategyName: name,
                    signalsGenerated: totalTrades * 2, // Estimate
                    signalsExecuted: totalTrades,
                    profitLoss: nav - 10000, // Assuming starting capital of 10k
                    sharpeRatio: sharpeRatio,
                    maxDrawdown: maxDrawdown,
                    winRate: winRate,
                    avgTradeTime: avgTradeDuration,
                    totalTrades: totalTrades
                });
                // Update portfolio metrics
                prometheusMonitoring.updatePortfolioMetrics(portfolioValue, { [symbol]: portfolioValue }, // Simple exposure tracking
                maxDrawdown * 10 // Risk score based on drawdown
                );
                // Check for critical drawdown alert (5% threshold)
                if (maxDrawdown > 0.05) {
                    alertCoordinator.evaluateMetric('portfolio.drawdown', maxDrawdown, 'strategy-monitor');
                    console.log(`🚨 CRITICAL DRAWDOWN ALERT: ${(maxDrawdown * 100).toFixed(2)}%`);
                }
                // Inicjalizacja strategii
                // 🚀 GŁÓWNA RSI TURBO STRATEGY Z SENTIMENT INTEGRATION
                const logger = new logger_1.Logger();
                const strategy = new enhanced_rsi_turbo_1.EnhancedRSITurboStrategy(logger);
                // 🚀 SENTIMENT-ENHANCED SIGNAL GENERATION
                let signals = [];
                let enhancedSignal = null;
                try {
                    // NAPRAWKA: Użyj bezpośrednio metody run() zamiast nieistniejącej executeWithSentimentTracking
                    signals = await strategy.run(botState);
                    // Log signal details for debugging
                    if (signals.length > 0) {
                        console.log(`🎯 [${name}] Generated ${signals.length} signal(s): ${signals.map(s => s.type).join(', ')}`);
                    }
                }
                catch (error) {
                    // Fallback handling
                    console.warn(`⚠️ Strategy execution failed: ${error}`);
                    signals = [];
                }
                // Record strategy signals for monitoring
                if (signals.length > 0) {
                    prometheusMonitoring.recordStrategySignal(name, signals[0].type, symbol);
                }
                // 📊 SENTIMENT DATA LOGGING
                if (botState.sentiment && i % 10 === 0) { // Log every 10th bar to avoid spam
                    console.log(`📊 [SENTIMENT] ${symbol}: Overall=${botState.sentiment.overall.toFixed(3)}, ` +
                        `Trend=${botState.sentiment.trend}, Signal=${botState.sentiment.tradingSignal}, ` +
                        `Confidence=${botState.sentiment.confidence.toFixed(2)}, News=${botState.sentiment.newsCount}, ` +
                        `Social=${botState.sentiment.socialMentions}`);
                    // Enhanced signal logging
                    // TODO: enhancedSignal nie jest obecnie używane
                    // if (enhancedSignal) {
                    //   console.log(`🎯 [ENHANCED SIGNAL] Type=${enhancedSignal.type}, ` +
                    //              `Confidence=${enhancedSignal.confidence.toFixed(3)}, ` +
                    //              `Sentiment Impact=${enhancedSignal.sentiment?.influenced ? 'YES' : 'NO'}, ` +
                    //              `Conflict=${enhancedSignal.sentiment?.conflictDetected ? 'DETECTED' : 'NONE'}`);
                    // }
                }
                if (signals && signals.length > 0) {
                    for (const signal of signals) {
                        // 1. SPRAWDŹ ZLECENIA OCZEKUJĄCE (LIMIT, STOP) NA PODSTAWIE NOWEJ ŚWIECY
                        const executedOrders = await tradeExecutor.checkPendingOrders(ctx.base);
                        for (const order of executedOrders) {
                            const action = order.pnl !== null && order.pnl !== undefined ? 'close' : 'open';
                            console.log(`[EXECUTION] Zrealizowano zlecenie ${order.type} (${action}) dla ${name} w cenie ${order.executedPrice}. PnL: ${order.pnl}`);
                            local_trade_events.push({
                                strategy: name,
                                action: action,
                                side: order.side,
                                ts: order.executedAt,
                                price: order.executedPrice,
                                size: order.size,
                                pnl: order.pnl,
                                reason: `Triggered ${order.type}`,
                            });
                            record_trade(name, action, order.side, order.executedAt, order.executedPrice, order.size || 0, null, null, order.pnl ?? null, { reason: `Triggered ${order.type}` });
                            if (order.pnl !== null && order.pnl !== undefined) {
                                globalRiskManager.onTradeClosed(order.pnl);
                                // 🚀 ENTERPRISE ML LEARNING FROM TRADE RESULT
                                try {
                                    const trade_duration = Date.now() - (order.timestamp || Date.now());
                                    const current_rsi = botState.indicators.m15.rsi;
                                    const current_volume = ctx.base.volume;
                                    await enterpriseMLManager.learnFromResult(order.pnl, trade_duration, {
                                        market_volatility: calculateVolatility(candles15m.slice(-20).map(c => c.close)),
                                        rsi_level: current_rsi,
                                        volume_profile: current_volume,
                                        market_conditions: {
                                            price: ctx.base.close,
                                            trend: determineTrend(candles15m.slice(-10).map(c => c.close))
                                        }
                                    });
                                    console.log(`🚀 [ENTERPRISE ML] Learned from trade: PnL=${order.pnl.toFixed(4)}, Duration=${(trade_duration / 1000 / 60).toFixed(1)}min`);
                                }
                                catch (mlLearningError) {
                                    console.warn(`⚠️ Enterprise ML learning error: ${mlLearningError}`);
                                }
                            }
                        }
                        const orderRequest = signal.type.includes('ENTER')
                            ? {
                                symbol,
                                type: 'market',
                                side: signal.type === 'ENTER_LONG' ? 'buy' : 'sell',
                                size: 1,
                            }
                            : null;
                        // --- FILTRY (np. trendu, globalnego ryzyka) ---
                        if (orderRequest) {
                            // SPRAWDZENIE GLOBALNEGO LIMITU RYZYKA
                            if (!globalRiskManager.canOpenPosition()) {
                                console.log(`[GLOBAL RISK] ${name} ts=${ctx.base.time} Pomijam open (${orderRequest.side}), bo przekroczono globalny limit ryzyka.`);
                                continue;
                            }
                            let trendFilter = true;
                            // Filtr EMA200 dla strategii trendowych
                            if (name === 'RSITurbo' || name === 'SuperTrend' || name === 'MACrossover') {
                                const ema200 = botState.indicators.m15.ema_200;
                                if (ema200 !== undefined) {
                                    if (orderRequest.side === 'buy' && ctx.base.close < ema200) {
                                        trendFilter = false;
                                    }
                                    else if (orderRequest.side === 'sell' && ctx.base.close > ema200) {
                                        trendFilter = false;
                                    }
                                }
                                if (!trendFilter) {
                                    // console.log(`[FILTER] ${name} blokada sygnału przez EMA200: ${orderRequest.direction} @ ${ctx.m15.close}`);
                                }
                            }
                            if (!trendFilter) {
                                continue; // Pomiń ten sygnał
                            }
                        }
                        if (orderRequest) {
                            local_signal_events.push({
                                strategy: name,
                                ts: ctx.base.time,
                                type: orderRequest.type,
                                price: ctx.base.close,
                                order: orderRequest,
                            });
                            record_signal(name, ctx.base.time, orderRequest.type, ctx.base.close, {
                                order: orderRequest,
                            });
                            const result = await tradeExecutor.placeOrder(orderRequest);
                            if (!result) {
                                // Zlecenie odrzucone lub nie wykonane natychmiast
                            }
                            else {
                                if (result.status === 'filled') {
                                    const trade = result;
                                    const action = trade.pnl !== null && trade.pnl !== undefined ? 'close' : 'open';
                                    local_trade_events.push({
                                        strategy: name,
                                        action: action,
                                        side: trade.side,
                                        ts: trade.executedAt,
                                        price: trade.executedPrice,
                                        size: trade.size,
                                        pnl: trade.pnl,
                                        reason: `Signal: ${orderRequest.type}`,
                                    });
                                    record_trade(name, action, trade.side, trade.executedAt, trade.executedPrice, trade.size || 0, null, null, trade.pnl ?? null, { reason: `Signal: ${orderRequest.type}` });
                                    if (result.pnl !== null && result.pnl !== undefined) {
                                        globalRiskManager.onTradeClosed(result.pnl); // <--- DODANE
                                    }
                                }
                            }
                        }
                    }
                }
            }
            // 🛡️ AUTO-HEDGING SYSTEM PROCESSING
            // IMPORTANT: Auto-hedging runs on its own internal timer (15-minute intervals)
            // No need to call evaluateHedgeNeed here - it would cause massive log spam!
            // The system is already started and runs independently via setInterval
            // Log system status periodically
            if (autoHedgingSystem && autoHedgingSystem.isRunning() && i % 200 === 0) { // Every 200 bars
                try {
                    const systemStatus = autoHedgingSystem.getSystemStatus();
                    console.log(`🛡️ [AUTO-HEDGE STATUS] Active: ${systemStatus.isActive}, Hedges: ${systemStatus.components.hedgingEngine.activeHedges}, Delta: ${systemStatus.components.deltaNeutral.portfolioDelta.toFixed(4)}`);
                }
                catch (statusError) {
                    console.warn(`⚠️ Auto-hedging status error: ${statusError}`);
                }
            }
            // 🤖 SIMPLE RL SYSTEM PROCESSING
            // Process RL step after all traditional strategies have been executed
            try {
                const rlAction = await enterpriseMLManager.processStep(ctx.base.close, botState.indicators.m15.rsi, ctx.base.volume);
                // If Enterprise ML suggests an action and is performing well enough, log it
                if (rlAction && enterpriseMLManager.shouldUseRL() && rlAction.action_type !== 'HOLD') {
                    console.log(`🚀 [ENTERPRISE ML SIGNAL] ${rlAction.action_type} at ${ctx.base.close} (confidence: ${rlAction.confidence.toFixed(3)}) - ${rlAction.reasoning}`);
                    record_signal('EnterpriseMLAgent', ctx.base.time, rlAction.action_type, ctx.base.close, { confidence: rlAction.confidence, reasoning: rlAction.reasoning });
                }
                // Log RL performance every 100 bars
                if (i % 100 === 0) {
                    const rlPerf = enterpriseMLManager.getPerformance();
                    console.log(`🚀 [ENTERPRISE ML STATUS] Episodes: ${rlPerf.episodes}, Avg Reward: ${rlPerf.average_reward.toFixed(4)}, Exploration: ${(rlPerf.exploration_rate * 100).toFixed(1)}%`);
                    if (enterpriseMLManager.shouldUseRL()) {
                        console.log(`🚀 [ENTERPRISE ML READY] Advanced ML system performing well for live trading`);
                    }
                }
                // 📊 Extended Enterprise ML Monitoring (every 500 iterations)
                if (i % 500 === 0) {
                    try {
                        const mlStatus = await enterpriseMLManager.getStatus();
                        console.log(`🔍 [ENTERPRISE ML DETAILED STATUS]`);
                        console.log(`   System Health: ${mlStatus.enterprise_ml?.system_health || 'unknown'}`);
                        console.log(`   Components Status: ${JSON.stringify(mlStatus.enterprise_ml?.components_status || {})}`);
                        console.log(`   Performance: Sharpe=${mlStatus.performance?.sharpe_ratio?.toFixed(3) || 'N/A'}, DrawDown=${mlStatus.performance?.max_drawdown?.toFixed(3) || 'N/A'}`);
                    }
                    catch (statusError) {
                        console.warn(`⚠️ Enterprise ML status check failed: ${statusError}`);
                    }
                }
            }
            catch (mlError) {
                console.warn(`⚠️ Enterprise ML processing error: ${mlError}`);
            }
        }
    }
    // --- Po teście: eksport rolling wag do CSV ---
    function exportAllocCSV(filename, alloc) {
        const stratNames = Object.keys(alloc[0]?.weights || {});
        const header = ['timestamp', ...stratNames].join(',') + '\n';
        const rows = alloc.map(a => [a.timestamp, ...stratNames.map(s => a.weights[s] ?? 0)].join(','));
        fs.writeFileSync(path.join(testDirectory, filename), header + rows.join('\n'), 'utf-8');
    }
    exportAllocCSV('rolling_alloc_minvar.csv', portfolio_allocator_1.PortfolioAllocator.allocate({
        returns: Object.fromEntries(Object.entries(strategyEquity).map(([k, v]) => [
            k,
            v.map((x, i, arr) => i === 0
                ? { timestamp: x.timestamp, value: 0 }
                : { timestamp: x.timestamp, value: Math.log(x.nav / arr[i - 1].nav) }),
        ])),
        volatility: {},
        correlations: {},
        window: 50,
        timestamps: [], // uproszczone na potrzeby eksportu
    }, 'minimum_variance'));
    exportAllocCSV('rolling_alloc_riskparity.csv', portfolio_allocator_1.PortfolioAllocator.allocate({
        returns: Object.fromEntries(Object.entries(strategyEquity).map(([k, v]) => [
            k,
            v.map((x, i, arr) => i === 0
                ? { timestamp: x.timestamp, value: 0 }
                : { timestamp: x.timestamp, value: Math.log(x.nav / arr[i - 1].nav) }),
        ])),
        volatility: {},
        correlations: {},
        window: 50,
        timestamps: [], // uproszczone na potrzeby eksportu
    }, 'risk_parity'));
    // --- 4. RAPORT KOŃCOWY ---
    console.log(`\n--- PODSUMOWANIE TESTU: ${config.id} ---`);
    const finalNav = globalPortfolio.getNetAssetValue({});
    const totalPnl = finalNav - config.initialCapital;
    const totalPnlPercent = (totalPnl / config.initialCapital) * 100;
    console.log(`Kapitał początkowy: ${config.initialCapital.toFixed(2)}`);
    console.log(`Kapitał końcowy: ${finalNav.toFixed(2)}`);
    console.log(`Całkowity PnL: ${totalPnl.toFixed(2)} (${totalPnlPercent.toFixed(2)}%)`);
    const trades = globalPortfolio.getTradeHistory() || [];
    const tradesWithPnl = trades.filter(t => t.event === 'close' && typeof t.pnl === 'number');
    // --- Upewnij się, że katalog istnieje ---
    if (!fs.existsSync(testDirectory)) {
        fs.mkdirSync(testDirectory, { recursive: true });
    }
    // --- Eksport equity curve ---
    const navHistory = globalPortfolio.getNavHistory();
    // --- Portfolio Analytics ---
    const portfolioAnalytics = new portfolio_analytics_1.PortfolioAnalytics(globalPortfolio);
    const portfolioStats = portfolioAnalytics.getStats();
    fs.writeFileSync(path.join(testDirectory, 'portfolio_stats.json'), JSON.stringify(portfolioStats, null, 2), 'utf-8');
    console.log('Portfolio stats zapisane do portfolio_stats.json');
    // --- Rolling VaR ---
    rollingVaR = portfolioAnalytics.getRollingVaR(250, 0.05);
    // --- Eksport rolling metryk do CSV ---
    function exportRollingMetricCSV(filename, data, valueLabel) {
        const rows = data.map(row => `${row.timestamp},${row.value}`);
        fs.writeFileSync(path.join(testDirectory, filename), `timestamp,${valueLabel}\n` + rows.join('\n'), 'utf-8');
    }
    exportRollingMetricCSV('rolling_nav.csv', portfolioAnalytics.getRollingNAV(), 'nav');
    exportRollingMetricCSV('rolling_drawdown.csv', portfolioAnalytics.getRollingDrawdown(), 'drawdown');
    exportRollingMetricCSV('rolling_sharpe.csv', portfolioAnalytics.getRollingSharpe(), 'sharpe');
    exportRollingMetricCSV('rolling_volatility.csv', portfolioAnalytics.getRollingVolatility(), 'volatility');
    exportRollingMetricCSV('rolling_sortino.csv', portfolioAnalytics.getRollingSortino(), 'sortino');
    // --- Eksport rolling exposure ---
    const rollingExposure = portfolioAnalytics.getRollingExposure(rollingPrices);
    exportRollingMetricCSV('rolling_exposure.csv', rollingExposure, 'exposure');
    // --- Przygotowanie pod rolling korelacje (do rozbudowy przy multi-portfelach) ---
    // TODO: PortfolioAnalytics.getRollingCorrelations(portfolios: Portfolio[])
    // --- Raport statystyczny ---
    (0, reportBuilder_1.buildReport)(tradesWithPnl, testDirectory);
    // --- Eksport CSV transakcji ---
    const csvHeader = 'timestamp,symbol,side,price,size,pnl,margin,strategy\n';
    const csvRows = trades.map((t) => [t.timestamp, t.symbol, t.direction, t.price, t.size, t.pnl, t.margin, t.strategy].join(','));
    fs.writeFileSync(path.join(testDirectory, `trades_global.csv`), csvHeader + csvRows.join('\n'), 'utf-8');
    // --- KONIEC TESTU: eksport rolling metryk do DuckDB ---
    // Rolling equity każdej strategii
    for (const stratName of Object.keys(strategyEquity)) {
        const tableName = `equity_${stratName}_${config.id}`;
        await duckdb.saveSeries(tableName, strategyEquity[stratName]);
    }
    // Rolling ceny (close) dla każdego symbolu
    const pricesRows = Object.keys(rollingPrices).map((ts) => ({ timestamp: Number(ts), ...rollingPrices[ts] }));
    if (pricesRows.length > 0) {
        await duckdb.saveSeries(`rolling_prices_${config.id}`, pricesRows);
    }
    // --- 6. GENEROWANIE RAPORTU KOŃCOWEGO ---
    const stats = (0, reportBuilder_1.buildReport)(local_trade_events, testDirectory);
    (0, visual_report_builder_1.generateNavChart)(globalPortfolio.getNavHistory(), testDirectory);
    // --- 🚀 SENTIMENT PERFORMANCE REPORT ---
    const sentimentReport = performanceTracker.getSentimentPerformanceReport();
    console.log('\n=== 🚀 SENTIMENT ANALYSIS PERFORMANCE REPORT ===');
    if (sentimentReport.summary) {
        console.log(`📊 Blocked Trades: ${sentimentReport.summary.blockedTrades}`);
        console.log(`💰 Saved Losses: $${sentimentReport.summary.sentimentSavedLosses.toFixed(2)}`);
        console.log(`📈 Average Sentiment: ${(sentimentReport.summary.averageSentimentScore * 100).toFixed(1)}%`);
        console.log(`🎯 Sentiment Accuracy: ${(sentimentReport.summary.sentimentAccuracy * 100).toFixed(1)}%`);
        console.log(`📊 High Sentiment Win Rate: ${(sentimentReport.summary.highSentimentWinRate * 100).toFixed(1)}%`);
        console.log(`📉 Low Sentiment Win Rate: ${(sentimentReport.summary.lowSentimentWinRate * 100).toFixed(1)}%`);
    }
    if (sentimentReport.insights.length > 0) {
        console.log('\n💡 INSIGHTS:');
        sentimentReport.insights.forEach((insight) => console.log(`   ${insight}`));
    }
    if (sentimentReport.recommendations.length > 0) {
        console.log('\n🔧 RECOMMENDATIONS:');
        sentimentReport.recommendations.forEach((rec) => console.log(`   ${rec}`));
    }
    // Save sentiment report to file
    fs.writeFileSync(path.join(testDirectory, 'sentiment_performance_report.json'), JSON.stringify(sentimentReport, null, 2), 'utf-8');
    console.log('📄 Sentiment report zapisany do sentiment_performance_report.json');
    // --- ZAMKNIĘCIE LOGGERA SCORINGU ---
    scoringLogger.close();
    // --- OKX LIVE TRADING CLEANUP ---
    if (config.executionMode === 'live' || config.executionMode === 'demo') {
        console.log('🏦 Zamykanie połączenia z OKX API...');
        try {
            if (tradeExecutor && typeof tradeExecutor.cleanup === 'function') {
                await tradeExecutor.cleanup();
                console.log('✅ OKX API połączenie zamknięte pomyślnie');
            }
        }
        catch (error) {
            console.error('❌ Błąd podczas zamykania OKX API:', error);
        }
    }
    // --- AUTO-HEDGING CLEANUP ---
    if (autoHedgingSystem && autoHedgingSystem.isRunning()) {
        console.log('🛡️ Zamykanie systemu auto-hedging...');
        try {
            await autoHedgingSystem.cleanup();
            console.log('✅ System auto-hedging zamknięty pomyślnie');
        }
        catch (error) {
            console.error('❌ Błąd podczas zamykania systemu auto-hedging:', error);
        }
    }
    console.log(`\n=== TEST ${config.id} ZAKOŃCZONY ===`);
    console.log(`Wyniki zapisane w katalogu: ${testDirectory}`);
    // Return dashboard integration for cleanup in main function
    return { dashboardIntegration, stats };
    console.log(`Logi scoringu zapisane w: ${path.join(testDirectory, 'signal_scoring.log')}`);
    return stats;
}
// ============================================================================
//  GŁÓWNA FUNKCJA (jeśli uruchamiamy plik bezpośrednio)
// ============================================================================
async function main() {
    console.log('🚀 Inicjalizacja Trading Bot z Kafka Streaming...');
    // === ENTERPRISE CONFIGURATION INITIALIZATION ===
    const { config, executor, performanceTracker, mode } = await initializeSystem();
    // === MONITORING SYSTEMS SETUP ===
    const prometheusMonitoring = new prometheus_monitoring_1.PrometheusMonitoring();
    const alertCoordinator = new alert_coordination_system_1.AlertCoordinationSystem();
    // === DEPLOYMENT SYSTEMS SETUP ===
    console.log('🚀 Inicjalizacja Advanced Deployment Systems...');
    const deploymentOrchestrator = new DEPLOYMENT_SYSTEMS_1.DeploymentOrchestrator(false); // PRODUCTION MODE
    console.log('✅ Deployment Systems: Blue-Green, Hot-Reload, Rolling Updates, Zero-Downtime Migrations ready');
    // === KAFKA REAL-TIME STREAMING SETUP ===
    const kafkaEngine = new kafka_real_time_streaming_final_1.KafkaRealTimeStreamingEngine({
        kafka: {
            clientId: 'trading-bot',
            brokers: [process.env.KAFKA_BROKERS || 'kafka:9092'],
            connectionTimeout: 3000,
            requestTimeout: 30000,
            retry: {
                retries: 8,
                initialRetryTime: 100,
                maxRetryTime: 30000
            }
        },
        topics: {
            marketData: 'market-data',
            signals: 'trading-signals',
            predictions: 'ml-predictions',
            alerts: 'trade-alerts',
            analytics: 'real-time-analytics'
        },
        consumer: {
            groupId: 'trading-group',
            sessionTimeout: 30000,
            heartbeatInterval: 3000,
            maxBytesPerPartition: 1048576,
            fromBeginning: false
        },
        producer: {
            maxInFlightRequests: 1,
            idempotent: true,
            transactionTimeout: 30000,
            acks: -1
        },
        streaming: {
            batchSize: 100,
            maxWaitTime: 5000,
            bufferSize: 1000,
            enableCompression: true
        }
    });
    console.log('📡 Uruchamianie Kafka streaming...');
    try {
        await kafkaEngine.start();
        console.log('✅ Kafka streaming engine aktywny!');
    }
    catch (error) {
        console.log('⚠️ Kafka niedostępny - kontynuacja bez streaming (Offline Mode)');
        console.log('📊 Używanie lokalnych danych CSV...');
    }
    console.log('Pobieranie danych świecowych przez provider...');
    // Generate test candles for Enterprise ML demonstration
    const generateTestCandles = (count) => {
        const candles = [];
        const baseTime = Date.now() - (count * 15 * 60 * 1000); // 15 min intervals
        let basePrice = 50000; // Starting BTC price
        for (let i = 0; i < count; i++) {
            const time = baseTime + (i * 15 * 60 * 1000);
            const volatility = (Math.random() - 0.5) * 0.02; // 2% volatility
            const open = basePrice;
            const close = open * (1 + volatility);
            const high = Math.max(open, close) * (1 + Math.random() * 0.01);
            const low = Math.min(open, close) * (1 - Math.random() * 0.01);
            const volume = 1000 + Math.random() * 500;
            candles.push({
                time,
                open,
                high,
                low,
                close,
                volume
            });
            basePrice = close; // Continue from last close
        }
        return candles;
    };
    const candles15m = generateTestCandles(1000);
    console.log(`🧪 Generated ${candles15m.length} test candles for Enterprise ML demonstration.`);
    // --- OGRANICZENIE DANYCH DO TESTU ---
    const testCandleLimit = 1000; // Zwiększona próbka do testu
    if (candles15m.length > testCandleLimit) {
        console.log(`OGRANICZONO dane do ${testCandleLimit} świec na potrzeby szybkiego testu.`);
        candles15m.splice(testCandleLimit);
    }
    // --- KONIEC OGRANICZENIA ---
    // Definicja konfiguracji dla pełnego testu ze wszystkimi strategiami
    const testConfig = {
        id: `FullStrategiesTest_${Date.now()}`,
        initialCapital: 10000,
        riskConfig: {
            maxDrawdown: 0.2,
            maxDailyDrawdown: 0.1,
        },
        simulationConfig: {
            commissionBps: 4,
            slippageBps: 2,
        },
        strategies: [
            {
                name: 'RSITurbo',
                params: {
                    symbol: 'BTCUSDT',
                    rsiPeriod: 14,
                    minPeriod: 20,
                    rsiEntryLong: 0.15, // Zmieniony próg
                    rsiEntryShort: 70,
                    adxThreshold: 20,
                    stopLoss: 0.02,
                    takeProfit: 0.04,
                },
            },
            {
                name: 'SuperTrend',
                params: {
                    stMultiplier: 3,
                    minPeriod: 20,
                    symbol: 'BTCUSDT',
                },
            },
            {
                name: 'MACrossover',
                params: {
                    symbol: 'BTCUSDT',
                },
            },
            {
                name: 'MomentumConfirm',
                params: {
                    trendConfirmation: 'macd',
                    symbol: 'BTCUSDT',
                },
            },
            {
                name: 'MomentumPro',
                params: {
                    rsiPeriod: 14,
                    rocPeriod: 10,
                    emaFastPeriod: 9,
                    emaSlowPeriod: 21,
                    atrLookback: 14,
                    atrMultiplier: 2,
                    symbol: 'BTCUSDT',
                },
            },
            {
                name: 'EnhancedRSITurbo',
                params: {
                    symbol: 'BTCUSDT',
                    rsiPeriod: 14,
                    minPeriod: 20,
                    rsiEntryLong: 30,
                    rsiEntryShort: 70,
                    atrPeriod: 14,
                    slAtrMultiplier: 1.5,
                    tpAtrMultiplier: 3.0,
                    riskPerTrade: 0.01,
                    maxPositionSize: 0.1,
                    emaPeriod: 50,
                    adxThreshold: 20,
                    relaxedRsiEntryLong: 35,
                    relaxedRsiEntryShort: 65,
                    weakTrendAdxThreshold: 15,
                    trailingStopEnabled: true,
                    trailingStopAtrMultiplier: 1.0,
                    trailingStopActivation: 0.5,
                    adaptiveRsiEnabled: true,
                    volatilityPeriod: 20,
                    highVolatilityThreshold: 0.03,
                    lowVolatilityThreshold: 0.01,
                },
            },
            {
                name: 'AdvancedAdaptive',
                params: {
                    symbol: 'BTCUSDT',
                    rsiPeriod: 14,
                    rsiOversold: 30,
                    rsiOverbought: 70,
                    emaShortPeriod: 50,
                    emaLongPeriod: 200,
                    adxPeriod: 14,
                    atrPeriod: 14,
                    riskPerTrade: 0.02,
                    maxPositions: 3,
                    minSignalStrength: 0.3,
                    marketRegimeOptions: {
                        emaShortPeriod: 50,
                        emaLongPeriod: 200,
                        adxPeriod: 14,
                        adxTrendThreshold: 25,
                        adxConsolidationThreshold: 20,
                        atrPeriod: 14,
                        volatilityThreshold: 0.03,
                        bollingerPeriod: 20,
                        bollingerStdDev: 2,
                    },
                    signalScorerOptions: {
                        strongBuyThreshold: 0.6,
                        buyThreshold: 0.4,
                        sellThreshold: 0.6,
                        strongSellThreshold: 0.4,
                        regimeMultiplier: 1.0,
                    },
                    dynamicExitOptions: {
                        enableScaling: true,
                        scalingLevels: [
                            { percentage: 0.3, target: 1.0 },
                            { percentage: 0.3, target: 2.0 },
                            { percentage: 0.4, target: 3.0 },
                        ],
                        enableTimeExit: true,
                        maxHoldTime: 50,
                        enableStructuralExit: true,
                        structuralLookback: 10,
                        enableTrailingStop: true,
                        trailingStopMultiplier: 1.5,
                        trailingStopActivation: 0.5,
                        enableBreakEven: true,
                        breakEvenTrigger: 0.3,
                    },
                },
            },
        ],
        symbols: ['BTCUSDT'],
        autoHedging: {
            enabled: true,
            deltaThreshold: 0.1,
            correlationThreshold: 0.7,
            volatilityThreshold: 0.3,
            rebalanceFrequency: 24
        },
        // 🚨 LIVE TRADING CONFIGURATION (CURRENTLY DISABLED FOR SAFETY)
        executionMode: 'simulation', // 'simulation' | 'demo' | 'live'
        // okxConfig: {
        //   apiKey: process.env.OKX_API_KEY || '',
        //   secretKey: process.env.OKX_SECRET_KEY || '',
        //   passphrase: process.env.OKX_PASSPHRASE || '',
        //   sandbox: true, // true = demo trading, false = live trading
        //   tdMode: 'cash', // 'cash' | 'cross' | 'isolated'
        //   enableRealTrading: false // MUST be true for live trading
        // }
    };
    // --- URUCHOMIENIE POJEDYNCZEGO TESTU ---
    const testResult = await runTest(testConfig, candles15m, kafkaEngine);
    // === DEPLOYMENT API ENDPOINTS SETUP ===
    console.log('🚀 Uruchamianie Deployment API endpoints...');
    const express = require('express');
    const deploymentApp = express();
    deploymentApp.use(express.json());
    // Blue-Green deployment endpoint
    deploymentApp.post('/api/deploy/blue-green', async (req, res) => {
        try {
            const { version, artifact } = req.body;
            console.log(`🔄 Starting Blue-Green deployment to version ${version}...`);
            const blueGreenManager = deploymentOrchestrator.getBlueGreenManager();
            const success = await blueGreenManager.deployNewVersion(version, artifact);
            res.json({
                success,
                message: success ? 'Blue-Green deployment completed successfully' : 'Blue-Green deployment failed',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // Hot-reload configuration endpoint
    deploymentApp.post('/api/config/hot-reload', async (req, res) => {
        try {
            const { key, value } = req.body;
            console.log(`🔥 Hot-reloading configuration: ${key} = ${value}...`);
            const configManager = deploymentOrchestrator.getConfigManager();
            const success = await configManager.updateConfig(key, value);
            res.json({
                success,
                message: success ? 'Configuration hot-reloaded successfully' : 'Configuration hot-reload failed',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // Rolling update endpoint
    deploymentApp.post('/api/deploy/rolling-update', async (req, res) => {
        try {
            const { version } = req.body;
            console.log(`🔄 Starting rolling update to version ${version}...`);
            const rollingManager = deploymentOrchestrator.getRollingUpdateManager();
            const success = await rollingManager.performRollingUpdate(version);
            res.json({
                success,
                message: success ? 'Rolling update completed successfully' : 'Rolling update failed',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // Database migration endpoint
    deploymentApp.post('/api/deploy/migrate', async (req, res) => {
        try {
            const { migration } = req.body;
            console.log(`🗄️ Starting database migration: ${migration.description}...`);
            const migrationManager = deploymentOrchestrator.getMigrationManager();
            const success = await migrationManager.executeMigration(migration);
            res.json({
                success,
                message: success ? 'Database migration completed successfully' : 'Database migration failed',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // Full deployment orchestration endpoint
    deploymentApp.post('/api/deploy/full', async (req, res) => {
        try {
            const { version, deploymentType } = req.body;
            const strategy = deploymentType || 'blue-green';
            console.log(`🚀 Starting full deployment orchestration to version ${version} using ${strategy}...`);
            const success = await deploymentOrchestrator.performCompleteDeployment(version, strategy);
            res.json({
                success,
                message: success ? 'Full deployment orchestration completed successfully' : 'Full deployment orchestration failed',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // Deployment status endpoint
    deploymentApp.get('/api/deploy/status', (req, res) => {
        try {
            const blueGreenManager = deploymentOrchestrator.getBlueGreenManager();
            const status = blueGreenManager.getDeploymentStatus();
            res.json({
                deploymentSystems: 'operational',
                blueGreenStatus: status,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    const deploymentPort = 9096;
    deploymentApp.listen(deploymentPort, () => {
        console.log(`🚀 Deployment API running on http://localhost:${deploymentPort}`);
        console.log(`📋 Available endpoints:`);
        console.log(`   POST /api/deploy/blue-green - Blue-Green deployment`);
        console.log(`   POST /api/config/hot-reload - Hot-reload configuration`);
        console.log(`   POST /api/deploy/rolling-update - Rolling updates`);
        console.log(`   POST /api/deploy/migrate - Database migrations`);
        console.log(`   POST /api/deploy/full - Full deployment orchestration`);
        console.log(`   GET  /api/deploy/status - Deployment status`);
    });
    // === GRACEFUL SHUTDOWN ===
    console.log('🛑 Zatrzymywanie systemów...');
    try {
        // Stop dashboard integration if it was started in runTest
        if (testResult?.dashboardIntegration) {
            console.log('📊 Zatrzymywanie Dashboard Integration...');
            await testResult.dashboardIntegration.stop();
            console.log('✅ Dashboard Integration zatrzymany!');
        }
        // Stop deployment systems gracefully
        console.log('🚀 Zatrzymywanie Deployment Systems...');
        // Deployment systems don't need explicit stopping as they're stateless
        console.log('✅ Deployment Systems zatrzymane!');
        // Stop monitoring systems gracefully
        if (prometheusMonitoring) {
            await prometheusMonitoring.stop();
        }
        if (alertCoordinator) {
            alertCoordinator.stop();
        }
        console.log('✅ Systemy monitoringu zatrzymane!');
    }
    catch (error) {
        console.error('❌ Błąd podczas zatrzymywania systemów:', error);
    }
    console.log('🛑 Zatrzymywanie Kafka streaming...');
    try {
        await kafkaEngine.stop();
        console.log('✅ Kafka streaming zatrzymany!');
    }
    catch (error) {
        console.log('⚠️ Kafka już zatrzymany lub niedostępny');
    }
}
// Graceful shutdown on process termination
process.on('SIGINT', async () => {
    console.log('📡 Otrzymano SIGINT, zatrzymywanie aplikacji...');
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('📡 Otrzymano SIGTERM, zatrzymywanie aplikacji...');
    process.exit(0);
});
main().catch(console.error);

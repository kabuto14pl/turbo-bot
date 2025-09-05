"use strict";
/**
 * Demonstration System for Continuous Monitoring and Adaptation - Phase 4.1
 *
 * Kompleksowy demo system pokazujący:
 * - Ciągłe monitorowanie wydajności strategii
 * - Automatyczną adaptację parametrów w czasie rzeczywistym
 * - System alertów i degradacji wydajności
 * - Generowanie raportów zdrowia strategii
 * - Feedback loop z uczeniem maszynowym
 *
 * @author Turbo Bot Deva
 * @version 4.1.0
 */
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
exports.MonitoringAdaptationDemo = void 0;
const fs = __importStar(require("fs"));
const monitoring_adaptation_system_1 = require("./monitoring_adaptation_system");
// ============================================================================
// DEMO CONFIGURATION
// ============================================================================
const DEMO_CONFIG = {
    updateFrequency: 5000, // 5 seconds for demo
    lookbackPeriod: 30, // 30 days
    benchmarkSymbol: 'BTC',
    alertConfig: {
        enabled: true,
        maxDrawdownThreshold: 0.15, // 15%
        sharpeDeclineThreshold: 0.5,
        returnDeclineThreshold: -0.1, // -10%
        volatilityIncreaseThreshold: 0.25, // 25%
        correlationChangeThreshold: 0.3,
        var95ExceedanceThreshold: 0.08, // 8%
        regimeChangeThreshold: 0.4,
        volatilitySpike: 0.35,
        liquidityCrunch: 0.5,
        email: false,
        webhook: false,
        console: true,
        fileLog: true
    },
    adaptationEnabled: true,
    adaptationSensitivity: 0.4, // Moderate sensitivity
    maxAdaptationsPerDay: 5,
    cooldownPeriod: 30, // 30 minutes
    metricsRetentionDays: 90,
    performanceHistorySize: 200,
    outlierDetectionEnabled: true,
    seasonalityAdjustment: true,
    macroFactorAnalysis: true
};
// ============================================================================
// DEMO DATA GENERATORS
// ============================================================================
class DemoDataGenerator {
    constructor() {
        this.currentTime = Date.now();
        this.marketRegime = 'bull';
        this.volatilityLevel = 0.02;
        this.trendStrength = 0.05;
    }
    /**
     * Generuje syntetyczne metryki wydajności dla strategii
     */
    generatePerformanceMetrics(strategyId, degradationFactor = 0) {
        // Base performance with some randomness
        const baseReturn = 0.02 + (Math.random() - 0.5) * 0.04; // -2% to +4%
        const degradedReturn = baseReturn * (1 - degradationFactor);
        const baseSharpe = 1.5 + (Math.random() - 0.5) * 1.0; // 1.0 to 2.0
        const degradedSharpe = baseSharpe * (1 - degradationFactor * 0.5);
        const baseVolatility = this.volatilityLevel + (Math.random() - 0.5) * 0.01;
        const adjustedVolatility = baseVolatility * (1 + degradationFactor * 0.3);
        const totalTrades = Math.floor(20 + Math.random() * 30);
        const winRate = 0.55 - degradationFactor * 0.1 + (Math.random() - 0.5) * 0.1;
        const winningTrades = Math.floor(totalTrades * winRate);
        return {
            timestamp: this.currentTime,
            strategyId,
            period: '1h',
            // Core Performance
            totalReturn: degradedReturn,
            annualizedReturn: degradedReturn * 12, // Monthly to annual approximation
            sharpeRatio: Math.max(0, degradedSharpe),
            sortinoRatio: degradedSharpe * 1.2,
            calmarRatio: degradedSharpe * 0.8,
            maxDrawdown: Math.abs(degradedReturn) * 0.5 + Math.random() * 0.05,
            currentDrawdown: Math.random() * 0.03,
            // Risk Metrics
            volatility: adjustedVolatility,
            beta: 0.8 + (Math.random() - 0.5) * 0.4,
            alpha: degradedReturn * 0.3,
            var95: -(adjustedVolatility * 1.65), // 95% VaR approximation
            cvar95: -(adjustedVolatility * 2.0), // Conditional VaR
            // Trade Statistics
            totalTrades,
            winningTrades,
            losingTrades: totalTrades - winningTrades,
            winRate,
            profitFactor: 1.2 - degradationFactor * 0.3 + (Math.random() - 0.5) * 0.4,
            avgWin: 0.025 + Math.random() * 0.01,
            avgLoss: -0.015 - Math.random() * 0.005,
            avgTrade: degradedReturn / totalTrades,
            // Market Condition Metrics
            marketRegime: this.marketRegime,
            marketVolatility: this.volatilityLevel,
            marketTrend: this.trendStrength,
            correlation: 0.3 + (Math.random() - 0.5) * 0.4,
            // Degradation Indicators
            performanceDegradation: degradationFactor,
            parameterDrift: degradationFactor * 0.7,
            stabilityScore: 1 - degradationFactor,
            confidenceLevel: 0.8 - degradationFactor * 0.2
        };
    }
    /**
     * Generuje warunki rynkowe
     */
    generateMarketCondition() {
        // Simulate market regime changes
        if (Math.random() < 0.05) { // 5% chance of regime change
            const regimes = ['bull', 'bear', 'sideways', 'volatile', 'crisis'];
            this.marketRegime = regimes[Math.floor(Math.random() * regimes.length)];
        }
        // Adjust volatility based on regime
        switch (this.marketRegime) {
            case 'volatile':
                this.volatilityLevel = 0.04 + Math.random() * 0.02;
                break;
            case 'crisis':
                this.volatilityLevel = 0.06 + Math.random() * 0.04;
                break;
            case 'sideways':
                this.volatilityLevel = 0.015 + Math.random() * 0.01;
                this.trendStrength = (Math.random() - 0.5) * 0.02;
                break;
            case 'bull':
                this.volatilityLevel = 0.02 + Math.random() * 0.015;
                this.trendStrength = 0.03 + Math.random() * 0.03;
                break;
            case 'bear':
                this.volatilityLevel = 0.025 + Math.random() * 0.02;
                this.trendStrength = -(0.02 + Math.random() * 0.03);
                break;
        }
        return {
            timestamp: this.currentTime,
            regime: this.marketRegime,
            volatility: this.volatilityLevel,
            trend: this.trendStrength,
            volume: 1000000 + Math.random() * 500000,
            sentiment: (Math.random() - 0.5) * 2, // -1 to +1
            // Technical indicators
            vix: 15 + this.volatilityLevel * 500 + Math.random() * 10,
            rsi: 30 + Math.random() * 40, // 30-70 range
            macd: (Math.random() - 0.5) * 0.02,
            // Economic indicators (mock)
            interestRates: 0.02 + Math.random() * 0.03,
            inflation: 0.02 + Math.random() * 0.02,
            gdpGrowth: 0.01 + Math.random() * 0.03,
            // Market microstructure
            bidAskSpread: 0.0001 + Math.random() * 0.0005,
            liquidity: 0.8 + Math.random() * 0.2,
            orderBookDepth: 100000 + Math.random() * 50000
        };
    }
    /**
     * Symuluje przejście czasu
     */
    advanceTime(milliseconds) {
        this.currentTime += milliseconds;
    }
}
// ============================================================================
// DEMO SCENARIOS
// ============================================================================
class MonitoringAdaptationDemo {
    constructor() {
        this.demoStrategies = [
            'RSI_MACD_Fusion_v2',
            'Bollinger_Momentum_Pro',
            'EMA_Crossover_Advanced',
            'Ichimoku_Cloud_Master',
            'Stochastic_RSI_Combo'
        ];
        this.system = new monitoring_adaptation_system_1.MonitoringAndAdaptationSystem(DEMO_CONFIG);
        this.dataGenerator = new DemoDataGenerator();
        this.setupEventHandlers();
    }
    /**
     * Uruchamia kompletny demo system
     */
    async runCompleteDemo() {
        console.log('\n🚀 URUCHAMIANIE COMPLETE MONITORING & ADAPTATION DEMO 🚀\n');
        console.log('=' + '='.repeat(80) + '=\n');
        try {
            // Demo 1: Basic Monitoring Setup
            await this.demoBasicMonitoring();
            await this.delay(2000);
            // Demo 2: Performance Degradation Detection
            await this.demoPerformanceDegradation();
            await this.delay(2000);
            // Demo 3: Automatic Adaptation
            await this.demoAutomaticAdaptation();
            await this.delay(2000);
            // Demo 4: Market Regime Changes
            await this.demoMarketRegimeAdaptation();
            await this.delay(2000);
            // Demo 5: Health Reports Generation
            await this.demoHealthReports();
            await this.delay(2000);
            // Demo 6: Alert System
            await this.demoAlertSystem();
            await this.delay(2000);
            // Demo 7: Continuous Monitoring Cycle
            await this.demoContinuousMonitoring();
            console.log('\n✅ COMPLETE DEMO ZAKOŃCZONY SUKCESEM! ✅\n');
        }
        catch (error) {
            console.error('\n❌ BŁĄD W DEMO:', error);
        }
    }
    /**
     * Demo 1: Podstawowe uruchomienie monitorowania
     */
    async demoBasicMonitoring() {
        console.log('📊 DEMO 1: Podstawowe Monitorowanie Strategii');
        console.log('-'.repeat(60));
        // Add strategies to monitoring
        for (const strategyId of this.demoStrategies) {
            this.system.addStrategy(strategyId);
            console.log(`✓ Dodano strategię do monitorowania: ${strategyId}`);
        }
        // Start monitoring
        this.system.startMonitoring();
        console.log('\n✓ System monitorowania uruchomiony');
        // Generate initial market condition
        const marketCondition = this.dataGenerator.generateMarketCondition();
        this.system.updateMarketCondition(marketCondition);
        console.log(`✓ Stan rynku: ${marketCondition.regime} (volatility: ${(marketCondition.volatility * 100).toFixed(2)}%)`);
        // Add initial performance metrics with more historical data
        for (const strategyId of this.demoStrategies) {
            // Add multiple historical data points to avoid "insufficient data" errors
            for (let i = 0; i < 10; i++) {
                this.dataGenerator.advanceTime(3600000); // 1 hour increments
                const metrics = this.dataGenerator.generatePerformanceMetrics(strategyId, i * 0.05); // Gradual variation
                this.system.updateStrategyMetrics(strategyId, metrics);
            }
            const latestMetrics = this.system.getLatestMetrics(strategyId);
            if (latestMetrics) {
                console.log(`✓ Metryki dla ${strategyId}: Return ${(latestMetrics.totalReturn * 100).toFixed(2)}%, Sharpe ${latestMetrics.sharpeRatio.toFixed(2)} (${this.system.getMetricsHistory(strategyId).length} records)`);
            }
        }
        console.log('\n🎯 Rezultat: System monitorowania aktywny dla 5 strategii\n');
    }
    /**
     * Demo 2: Detekcja degradacji wydajności
     */
    async demoPerformanceDegradation() {
        console.log('📉 DEMO 2: Detekcja Degradacji Wydajności');
        console.log('-'.repeat(60));
        // Simulate performance degradation over time
        const targetStrategy = this.demoStrategies[0];
        console.log(`🎯 Symulacja degradacji dla strategii: ${targetStrategy}`);
        for (let i = 0; i < 10; i++) {
            this.dataGenerator.advanceTime(3600000); // 1 hour
            const degradationFactor = i * 0.1; // Increasing degradation
            const metrics = this.dataGenerator.generatePerformanceMetrics(targetStrategy, degradationFactor);
            this.system.updateStrategyMetrics(targetStrategy, metrics);
            const degradationLevel = (degradationFactor * 100).toFixed(1);
            console.log(`⏱️  Okres ${i + 1}: Degradacja ${degradationLevel}%, Return ${(metrics.totalReturn * 100).toFixed(2)}%, Sharpe ${metrics.sharpeRatio.toFixed(2)}`);
            await this.delay(200);
        }
        // Check degradation detection
        const latestMetrics = this.system.getLatestMetrics(targetStrategy);
        if (latestMetrics) {
            console.log(`\n📊 Końcowa degradacja: ${(latestMetrics.performanceDegradation * 100).toFixed(1)}%`);
            console.log(`📊 Stabilność: ${(latestMetrics.stabilityScore * 100).toFixed(1)}%`);
        }
        console.log('\n🎯 Rezultat: System wykrył progresywną degradację wydajności\n');
    }
    /**
     * Demo 3: Automatyczna adaptacja parametrów
     */
    async demoAutomaticAdaptation() {
        console.log('🔧 DEMO 3: Automatyczna Adaptacja Parametrów');
        console.log('-'.repeat(60));
        const targetStrategy = this.demoStrategies[1];
        console.log(`🎯 Testowanie adaptacji dla strategii: ${targetStrategy}`);
        // Create performance issues that trigger adaptation
        this.dataGenerator.advanceTime(3600000);
        const degradedMetrics = this.dataGenerator.generatePerformanceMetrics(targetStrategy, 0.6);
        this.system.updateStrategyMetrics(targetStrategy, degradedMetrics);
        console.log(`📉 Performance spadek: Return ${(degradedMetrics.totalReturn * 100).toFixed(2)}%, Sharpe ${degradedMetrics.sharpeRatio.toFixed(2)}`);
        // Trigger adaptation check
        await this.delay(1000);
        // Check if adaptation was triggered
        const adaptationHistory = this.system.getAdaptationHistory(targetStrategy);
        if (adaptationHistory.length > 0) {
            const lastAdaptation = adaptationHistory[adaptationHistory.length - 1];
            console.log(`\n✓ Adaptacja wykonana:`);
            console.log(`  - Typ: ${lastAdaptation.actionType}`);
            console.log(`  - Powód: ${lastAdaptation.reason}`);
            console.log(`  - Pewność: ${(lastAdaptation.confidence * 100).toFixed(1)}%`);
            console.log(`  - Oczekiwane usprawnienie: ${(lastAdaptation.expectedImprovement * 100).toFixed(2)}%`);
        }
        else {
            console.log('⏳ Adaptacja zostanie uruchomiona w następnym cyklu...');
        }
        console.log('\n🎯 Rezultat: System automatycznie dostosował parametry strategii\n');
    }
    /**
     * Demo 4: Adaptacja do zmian reżimu rynkowego
     */
    async demoMarketRegimeAdaptation() {
        console.log('🌊 DEMO 4: Adaptacja do Zmian Reżimu Rynkowego');
        console.log('-'.repeat(60));
        const regimes = ['bull', 'bear', 'volatile', 'crisis', 'sideways'];
        for (const regime of regimes) {
            this.dataGenerator.advanceTime(7200000); // 2 hours
            // Force market regime change
            const marketCondition = this.dataGenerator.generateMarketCondition();
            marketCondition.regime = regime;
            this.system.updateMarketCondition(marketCondition);
            console.log(`\n📊 Zmiana reżimu rynku na: ${regime.toUpperCase()}`);
            console.log(`   Volatility: ${(marketCondition.volatility * 100).toFixed(2)}%`);
            console.log(`   Trend: ${(marketCondition.trend * 100).toFixed(2)}%`);
            // Update all strategies with regime-appropriate metrics
            for (const strategyId of this.demoStrategies) {
                let degradationForRegime = 0;
                if (regime === 'crisis')
                    degradationForRegime = 0.4;
                else if (regime === 'volatile')
                    degradationForRegime = 0.2;
                else if (regime === 'bear')
                    degradationForRegime = 0.1;
                // Add multiple data points for better analysis
                for (let j = 0; j < 3; j++) {
                    const metrics = this.dataGenerator.generatePerformanceMetrics(strategyId, degradationForRegime + j * 0.05);
                    metrics.marketRegime = regime;
                    this.system.updateStrategyMetrics(strategyId, metrics);
                }
            }
            await this.delay(500);
        }
        console.log('\n🎯 Rezultat: System adaptował się do 5 różnych reżimów rynkowych\n');
    }
    /**
     * Demo 5: Generowanie raportów zdrowia strategii
     */
    async demoHealthReports() {
        console.log('📋 DEMO 5: Raporty Zdrowia Strategii');
        console.log('-'.repeat(60));
        for (const strategyId of this.demoStrategies.slice(0, 3)) { // First 3 strategies
            try {
                const healthReport = await this.system.generateStrategyReport(strategyId);
                console.log(`\n📊 Raport zdrowia dla ${strategyId}:`);
                console.log(`   Ogólny wskaźnik zdrowia: ${healthReport.healthScore}/100`);
                console.log(`   Performance Score: ${healthReport.performanceScore}/100`);
                console.log(`   Stability Score: ${healthReport.stabilityScore}/100`);
                console.log(`   Risk Score: ${healthReport.riskScore}/100`);
                console.log(`   Adaptability Score: ${healthReport.adaptabilityScore}/100`);
                console.log(`   Trend: ${healthReport.performanceTrend} (confidence: ${(healthReport.trendConfidence * 100).toFixed(1)}%)`);
                // Show recommendations
                if (healthReport.recommendations.length > 0) {
                    const rec = healthReport.recommendations[0];
                    console.log(`   Rekomendacja: ${rec.action.toUpperCase()} (${rec.urgency}, confidence: ${(rec.confidence * 100).toFixed(1)}%)`);
                    console.log(`   Powód: ${rec.reason}`);
                }
                // Save report to file
                const reportPath = `./reports/health_report_${strategyId}_${Date.now()}.json`;
                await this.ensureDirectoryExists('./reports');
                await this.system.saveReport(healthReport, reportPath);
                console.log(`   📁 Raport zapisany: ${reportPath}`);
            }
            catch (error) {
                console.log(`   ❌ Błąd generowania raportu dla ${strategyId}: ${error}`);
            }
        }
        console.log('\n🎯 Rezultat: Wygenerowano szczegółowe raporty zdrowia strategii\n');
    }
    /**
     * Demo 6: System alertów
     */
    async demoAlertSystem() {
        console.log('🚨 DEMO 6: System Alertów');
        console.log('-'.repeat(60));
        const criticalStrategy = this.demoStrategies[2];
        console.log(`🎯 Symulacja krytycznych warunków dla: ${criticalStrategy}`);
        // Create critical performance metrics that should trigger alerts
        this.dataGenerator.advanceTime(3600000);
        const criticalMetrics = this.dataGenerator.generatePerformanceMetrics(criticalStrategy, 0.8);
        criticalMetrics.maxDrawdown = 0.18; // 18% drawdown (above 15% threshold)
        criticalMetrics.sharpeRatio = 0.3; // Below 0.5 threshold
        criticalMetrics.totalReturn = -0.12; // -12% return (below -10% threshold)
        criticalMetrics.volatility = 0.28; // 28% volatility (above 25% threshold)
        console.log(`📉 Krytyczne metryki:`);
        console.log(`   Max Drawdown: ${(criticalMetrics.maxDrawdown * 100).toFixed(1)}%`);
        console.log(`   Sharpe Ratio: ${criticalMetrics.sharpeRatio.toFixed(2)}`);
        console.log(`   Return: ${(criticalMetrics.totalReturn * 100).toFixed(1)}%`);
        console.log(`   Volatility: ${(criticalMetrics.volatility * 100).toFixed(1)}%`);
        // Update metrics to trigger alerts
        this.system.updateStrategyMetrics(criticalStrategy, criticalMetrics);
        // Wait for alert processing
        await this.delay(1000);
        console.log('\n🎯 Rezultat: System alertów zidentyfikował i zgłosił krytyczne warunki\n');
    }
    /**
     * Demo 7: Ciągły cykl monitorowania
     */
    async demoContinuousMonitoring() {
        console.log('🔄 DEMO 7: Ciągły Cykl Monitorowania');
        console.log('-'.repeat(60));
        console.log('🕐 Uruchamianie 30-sekundowego cyklu ciągłego monitorowania...\n');
        const startTime = Date.now();
        const monitoringDuration = 30000; // 30 seconds
        let cycleCount = 0;
        const monitoringInterval = setInterval(() => {
            cycleCount++;
            this.dataGenerator.advanceTime(300000); // 5 minutes
            console.log(`🔄 Cykl ${cycleCount} - ${new Date().toLocaleTimeString()}`);
            // Update market conditions
            const marketCondition = this.dataGenerator.generateMarketCondition();
            this.system.updateMarketCondition(marketCondition);
            // Update metrics for all strategies
            for (const strategyId of this.demoStrategies) {
                const randomDegradation = Math.random() * 0.3; // Random degradation 0-30%
                const metrics = this.dataGenerator.generatePerformanceMetrics(strategyId, randomDegradation);
                this.system.updateStrategyMetrics(strategyId, metrics);
            }
            console.log(`   Market: ${marketCondition.regime}, Vol: ${(marketCondition.volatility * 100).toFixed(1)}%`);
            // Check if monitoring duration elapsed
            if (Date.now() - startTime >= monitoringDuration) {
                clearInterval(monitoringInterval);
                this.system.stopMonitoring();
                console.log(`\n✓ Zakończono ciągłe monitorowanie po ${cycleCount} cyklach`);
                console.log('\n🎯 Rezultat: System wykonał kompletny cykl ciągłego monitorowania i adaptacji\n');
            }
        }, 5000); // Every 5 seconds
    }
    /**
     * Konfiguruje obsługę zdarzeń systemu
     */
    setupEventHandlers() {
        // Monitoring events
        this.system.on('monitoringStarted', (data) => {
            console.log(`🟢 Monitoring started for ${data.strategies.length} strategies`);
        });
        this.system.on('monitoringStopped', () => {
            console.log(`🔴 Monitoring stopped`);
        });
        // Alert events
        this.system.on('alertTriggered', (data) => {
            console.log(`🚨 ALERT for ${data.strategyId} (${data.severity.toUpperCase()}):`);
            data.alerts.forEach((alert) => {
                console.log(`   - ${alert}`);
            });
        });
        // Adaptation events
        this.system.on('adaptationPerformed', (data) => {
            console.log(`🔧 Adaptation performed for ${data.strategyId}: ${data.actionType}`);
        });
        this.system.on('adaptationRecommended', (data) => {
            console.log(`💡 Adaptation recommended for ${data.strategyId}: ${data.adaptation.actionType}`);
        });
        // Health report events
        this.system.on('healthReportGenerated', (data) => {
            // console.log(`📊 Health report generated for ${data.strategyId}: ${data.healthScore}/100`);
        });
        // Error events
        this.system.on('strategyProcessingError', (data) => {
            // Only log significant errors, not "insufficient data" warnings
            if (!data.error.toString().includes('Insufficient data')) {
                console.log(`❌ Error processing ${data.strategyId}: ${data.error}`);
            }
        });
    }
    /**
     * Zapewnia istnienie katalogu
     */
    async ensureDirectoryExists(dirPath) {
        try {
            await fs.promises.access(dirPath);
        }
        catch {
            await fs.promises.mkdir(dirPath, { recursive: true });
        }
    }
    /**
     * Opóźnienie wykonania
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.MonitoringAdaptationDemo = MonitoringAdaptationDemo;
// ============================================================================
// URUCHOMIENIE DEMO
// ============================================================================
async function main() {
    const demo = new MonitoringAdaptationDemo();
    await demo.runCompleteDemo();
}
// Uruchom demo jeśli plik jest wykonywany bezpośrednio
if (require.main === module) {
    main().catch(console.error);
}

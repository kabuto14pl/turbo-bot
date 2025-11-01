/**
 * 🚀 [ENTERPRISE-INTEGRATION] 
 * Advanced Trading Engine Startup Script
 * 
 * Production startup script for the complete enterprise trading system.
 * Coordinates all enterprise components with graceful error handling.
 * 
 * 🚨🚫 ABSOLUTELY NO SIMPLIFICATIONS - FULL ENTERPRISE IMPLEMENTATION
 */

import * as dotenv from 'dotenv';
import { AdvancedTradingEngineBootstrap, startEnterpriseSystem } from './advanced_trading_engine_bootstrap';

// Load environment configuration
dotenv.config();

console.log('🚀 [ENTERPRISE-STARTUP] Advanced Trading Engine Enterprise System Starting...');
console.log('🚀 [ENTERPRISE-STARTUP] Loading configuration...');

// Enterprise configuration
const enterpriseConfig = {
    tradingBot: {
        enabled: process.env.ENABLE_TRADING_BOT !== 'false',
        mode: (process.env.MODE as 'simulation' | 'backtest' | 'live') || 'simulation',
        port: parseInt(process.env.HEALTH_CHECK_PORT || '3001'),
        enableML: process.env.ENABLE_ML !== 'false',
        enableRiskManagement: process.env.ENABLE_RISK_MANAGEMENT !== 'false',
        maxDrawdown: parseFloat(process.env.MAX_DRAWDOWN || '0.15'),
        riskPerTrade: parseFloat(process.env.RISK_PER_TRADE || '0.02')
    },
    monitoring: {
        enabled: process.env.ENABLE_MONITORING !== 'false',
        prometheusEnabled: process.env.ENABLE_PROMETHEUS !== 'false',
        grafanaEnabled: process.env.ENABLE_GRAFANA !== 'false',
        alertingEnabled: process.env.ENABLE_ALERTING !== 'false',
        metricsPort: parseInt(process.env.PROMETHEUS_PORT || '9090'),
        dashboardPort: parseInt(process.env.GRAFANA_PORT || '3002'),
        retentionDays: parseInt(process.env.METRICS_RETENTION_DAYS || '30')
    },
    apiGateway: {
        enabled: process.env.ENABLE_API_GATEWAY !== 'false',
        port: parseInt(process.env.API_GATEWAY_PORT || '3000'),
        authenticationEnabled: process.env.ENABLE_AUTHENTICATION !== 'false',
        rateLimitingEnabled: process.env.ENABLE_RATE_LIMITING !== 'false',
        corsEnabled: process.env.ENABLE_CORS !== 'false',
        maxConnections: parseInt(process.env.MAX_CONNECTIONS || '1000'),
        enableWebSockets: process.env.ENABLE_WEBSOCKETS !== 'false'
    },
    performance: {
        enabled: process.env.ENABLE_PERFORMANCE_OPTIMIZATION !== 'false',
        connectionPoolEnabled: process.env.ENABLE_CONNECTION_POOL !== 'false',
        cachingEnabled: process.env.ENABLE_CACHING !== 'false',
        parallelProcessingEnabled: process.env.ENABLE_PARALLEL_PROCESSING !== 'false',
        resourceOptimizationEnabled: process.env.ENABLE_RESOURCE_OPTIMIZATION !== 'false',
        maxConcurrentOperations: parseInt(process.env.MAX_CONCURRENT_OPERATIONS || '100')
    },
    mlPipeline: {
        enabled: process.env.ENABLE_ML_PIPELINE !== 'false',
        ensembleModeling: process.env.ENABLE_ENSEMBLE_MODELING !== 'false',
        realtimePredictions: process.env.ENABLE_REALTIME_PREDICTIONS !== 'false',
        modelRetrainingEnabled: process.env.ENABLE_MODEL_RETRAINING !== 'false',
        minimumConfidence: parseFloat(process.env.MINIMUM_CONFIDENCE || '0.7'),
        predictionInterval: parseInt(process.env.PREDICTION_INTERVAL || '5000')
    }
};

console.log('📋 [ENTERPRISE-STARTUP] Configuration loaded:');
console.log(`   🤖 Trading Bot: ${enterpriseConfig.tradingBot.enabled ? 'ENABLED' : 'DISABLED'} (Mode: ${enterpriseConfig.tradingBot.mode})`);
console.log(`   📊 Monitoring: ${enterpriseConfig.monitoring.enabled ? 'ENABLED' : 'DISABLED'}`);
console.log(`   🌐 API Gateway: ${enterpriseConfig.apiGateway.enabled ? 'ENABLED' : 'DISABLED'} (Port: ${enterpriseConfig.apiGateway.port})`);
console.log(`   ⚡ Performance: ${enterpriseConfig.performance.enabled ? 'ENABLED' : 'DISABLED'}`);
console.log(`   🧠 ML Pipeline: ${enterpriseConfig.mlPipeline.enabled ? 'ENABLED' : 'DISABLED'}`);

// Start the enterprise system
async function startSystem() {
    try {
        console.log('🚀 [ENTERPRISE-STARTUP] Initializing Advanced Trading Engine...');
        
        const bootstrap = await startEnterpriseSystem(enterpriseConfig);
        
        console.log('✅ [ENTERPRISE-STARTUP] Advanced Trading Engine started successfully!');
        console.log('📊 [ENTERPRISE-STARTUP] System Status:');
        
        const status = bootstrap.getStatus();
        console.log(`   📈 System Health: ${status.systemHealth.overall}`);
        console.log(`   🔄 Running Components: ${status.integrationMetrics.runningComponents}/${status.integrationMetrics.totalComponents}`);
        console.log(`   🌐 Bootstrap API: http://localhost:${process.env.BOOTSTRAP_PORT || 4000}`);
        
        if (enterpriseConfig.apiGateway.enabled) {
            console.log(`   🌐 API Gateway: http://localhost:${enterpriseConfig.apiGateway.port}`);
        }
        
        if (enterpriseConfig.tradingBot.enabled) {
            console.log(`   🤖 Trading Bot: http://localhost:${enterpriseConfig.tradingBot.port}`);
        }
        
        if (enterpriseConfig.monitoring.enabled) {
            console.log(`   📊 Monitoring: http://localhost:${enterpriseConfig.monitoring.metricsPort}`);
        }
        
        console.log('');
        console.log('🚀 [ENTERPRISE-STARTUP] Advanced Trading Engine is now running in enterprise mode!');
        console.log('🚀 [ENTERPRISE-STARTUP] All systems operational - ready for autonomous trading!');
        
        // Set up status monitoring
        setInterval(() => {
            const currentStatus = bootstrap.getStatus();
            const health = currentStatus.systemHealth.overall;
            
            if (health !== 'healthy') {
                console.log(`⚠️ [ENTERPRISE-MONITOR] System health: ${health} - Running components: ${currentStatus.integrationMetrics.runningComponents}/${currentStatus.integrationMetrics.totalComponents}`);
            }
        }, 60000); // Check every minute
        
    } catch (error) {
        console.error('❌ [ENTERPRISE-STARTUP] Failed to start Advanced Trading Engine:', error);
        console.error('❌ [ENTERPRISE-STARTUP] System startup failed - check configuration and dependencies');
        process.exit(1);
    }
}

// Handle startup
startSystem();

// Export for programmatic use
export { enterpriseConfig };
#!/usr/bin/env ts-node
/**
 * 🚀 [ENTERPRISE-TRADING-ENGINE-STARTUP]
 * Main Startup Script for Complete Enterprise Trading Engine
 * 
 * Orchestrates startup of entire enterprise trading ecosystem:
 * - Enterprise Integrated Trading System
 * - All monitoring, performance, API Gateway components
 * - Complete ML pipeline integration
 * - Production-ready deployment
 * 
 * 🚨🚫 NO SIMPLIFICATIONS - COMPLETE ENTERPRISE ORCHESTRATION
 */

import { config } from 'dotenv';
import { EnterpriseIntegratedTradingSystem, TradingEngineMetrics } from './enterprise_integrated_trading_system';
import * as path from 'path';
import * as fs from 'fs/promises';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env') });

interface StartupConfig {
    environment: 'development' | 'staging' | 'production';
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    gracefulShutdownTimeout: number;
    healthCheckInterval: number;
    metricsReportingInterval: number;
}

class EnterpriseStartupOrchestrator {
    private tradingSystem: EnterpriseIntegratedTradingSystem | null = null;
    private config: StartupConfig;
    private isShuttingDown = false;
    private healthCheckTimer: NodeJS.Timeout | null = null;
    private metricsTimer: NodeJS.Timeout | null = null;
    private startTime = Date.now();

    constructor() {
        this.config = {
            environment: (process.env.NODE_ENV as any) || 'development',
            logLevel: (process.env.LOG_LEVEL as any) || 'info',
            gracefulShutdownTimeout: parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT || '30000'),
            healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
            metricsReportingInterval: parseInt(process.env.METRICS_REPORTING_INTERVAL || '60000')
        };

        console.log('🚀 [ENTERPRISE STARTUP] Enterprise Trading Engine Startup Orchestrator');
        console.log(`Environment: ${this.config.environment.toUpperCase()}`);
        console.log(`Log Level: ${this.config.logLevel.toUpperCase()}`);
    }

    private setupProcessHandlers(): void {
        // Graceful shutdown on SIGTERM and SIGINT
        process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
        process.on('SIGINT', () => this.handleShutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('[ENTERPRISE STARTUP] Uncaught Exception:', error);
            this.handleShutdown('uncaughtException');
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('[ENTERPRISE STARTUP] Unhandled Rejection at:', promise, 'reason:', reason);
            this.handleShutdown('unhandledRejection');
        });

        // Handle warnings
        process.on('warning', (warning) => {
            console.warn('[ENTERPRISE STARTUP] Process Warning:', warning.name, warning.message);
        });
    }

    private async handleShutdown(signal: string): Promise<void> {
        if (this.isShuttingDown) {
            console.log('[ENTERPRISE STARTUP] Shutdown already in progress, forcing exit...');
            process.exit(1);
        }

        this.isShuttingDown = true;
        console.log(`[ENTERPRISE STARTUP] 🛑 Received ${signal}, starting graceful shutdown...`);

        const shutdownTimer = setTimeout(() => {
            console.error('[ENTERPRISE STARTUP] ⚠️ Graceful shutdown timeout exceeded, forcing exit');
            process.exit(1);
        }, this.config.gracefulShutdownTimeout);

        try {
            // Stop timers
            if (this.healthCheckTimer) {
                clearInterval(this.healthCheckTimer);
                this.healthCheckTimer = null;
            }
            
            if (this.metricsTimer) {
                clearInterval(this.metricsTimer);
                this.metricsTimer = null;
            }

            // Stop trading system
            if (this.tradingSystem) {
                console.log('[ENTERPRISE STARTUP] Stopping Enterprise Trading System...');
                await this.tradingSystem.stop();
                this.tradingSystem = null;
            }

            clearTimeout(shutdownTimer);
            console.log('[ENTERPRISE STARTUP] ✅ Graceful shutdown completed');
            process.exit(0);

        } catch (error) {
            console.error('[ENTERPRISE STARTUP] ❌ Error during shutdown:', error);
            clearTimeout(shutdownTimer);
            process.exit(1);
        }
    }

    private async validateEnvironment(): Promise<void> {
        console.log('[ENTERPRISE STARTUP] Validating environment configuration...');

        const requiredEnvVars = [
            'TRADING_SYMBOL',
            'INITIAL_CAPITAL'
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            console.warn('[ENTERPRISE STARTUP] ⚠️ Missing optional environment variables:', missingVars);
            console.log('[ENTERPRISE STARTUP] Using default values for missing variables');
        }

        // Validate numeric configurations
        const numericConfigs = [
            { name: 'INITIAL_CAPITAL', value: process.env.INITIAL_CAPITAL, default: '10000' },
            { name: 'MAX_DRAWDOWN', value: process.env.MAX_DRAWDOWN, default: '0.15' },
            { name: 'RISK_PER_TRADE', value: process.env.RISK_PER_TRADE, default: '0.02' }
        ];

        for (const config of numericConfigs) {
            const value = parseFloat(config.value || config.default);
            if (isNaN(value)) {
                throw new Error(`Invalid numeric configuration for ${config.name}: ${config.value}`);
            }
        }

        console.log('[ENTERPRISE STARTUP] ✅ Environment validation passed');
    }

    private createTradingSystemConfig() {
        return {
            trading: {
                symbol: process.env.TRADING_SYMBOL || 'BTCUSDT',
                timeframe: process.env.TIMEFRAME || '1h',
                strategy: process.env.STRATEGY || 'AdvancedAdaptive',
                initialCapital: parseFloat(process.env.INITIAL_CAPITAL || '10000'),
                maxDrawdown: parseFloat(process.env.MAX_DRAWDOWN || '0.15'),
                riskPerTrade: parseFloat(process.env.RISK_PER_TRADE || '0.02'),
                enableLiveTrading: process.env.ENABLE_LIVE_TRADING === 'true',
                instanceId: process.env.INSTANCE_ID || `enterprise-${Date.now()}`
            },
            monitoring: {
                enabled: process.env.MONITORING_ENABLED !== 'false',
                prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9090'),
                grafanaUrl: process.env.GRAFANA_URL,
                alertingEnabled: process.env.ALERTING_ENABLED !== 'false',
                healthCheckInterval: this.config.healthCheckInterval
            },
            performance: {
                enabled: process.env.PERFORMANCE_ENABLED !== 'false',
                connectionPoolSize: parseInt(process.env.CONNECTION_POOL_SIZE || '20'),
                cacheEnabled: process.env.CACHE_ENABLED !== 'false',
                parallelProcessingEnabled: process.env.PARALLEL_PROCESSING_ENABLED !== 'false',
                resourceOptimizationEnabled: process.env.RESOURCE_OPTIMIZATION_ENABLED !== 'false'
            },
            apiGateway: {
                enabled: process.env.API_GATEWAY_ENABLED !== 'false',
                port: parseInt(process.env.API_GATEWAY_PORT || '3000'),
                httpsEnabled: process.env.ENABLE_HTTPS === 'true',
                authenticationEnabled: process.env.AUTHENTICATION_ENABLED !== 'false',
                webSocketEnabled: process.env.WEBSOCKET_ENABLED !== 'false'
            },
            ml: {
                enabled: process.env.ML_ENABLED !== 'false',
                enterpriseMLEnabled: process.env.ENTERPRISE_ML_ENABLED !== 'false',
                reinforcementLearningEnabled: process.env.RL_ENABLED !== 'false',
                realTimeOptimization: process.env.REAL_TIME_OPTIMIZATION !== 'false'
            }
        };
    }

    private setupHealthMonitoring(): void {
        this.healthCheckTimer = setInterval(async () => {
            if (!this.tradingSystem) return;

            try {
                const healthStatus = this.tradingSystem.getHealthStatus();
                const metrics = this.tradingSystem.getMetrics();

                if (healthStatus !== 'healthy') {
                    console.warn(`[ENTERPRISE STARTUP] ⚠️ System health: ${healthStatus}`);
                }

                // Log basic health metrics
                if (this.config.logLevel === 'debug') {
                    console.log('[ENTERPRISE STARTUP] Health Check:', {
                        status: healthStatus,
                        uptime: Math.round(metrics.system.uptime / 1000),
                        trades: metrics.trading.totalTrades,
                        memory: Math.round(metrics.system.memoryUsage.heapUsed / 1024 / 1024)
                    });
                }

            } catch (error) {
                console.error('[ENTERPRISE STARTUP] Health check error:', error);
            }
        }, this.config.healthCheckInterval);
    }

    private setupMetricsReporting(): void {
        this.metricsTimer = setInterval(async () => {
            if (!this.tradingSystem) return;

            try {
                const metrics = this.tradingSystem.getMetrics();
                
                // Report key metrics
                const report = {
                    timestamp: new Date().toISOString(),
                    uptime: Math.round(metrics.system.uptime / 1000),
                    trading: {
                        totalTrades: metrics.trading.totalTrades,
                        winRate: Math.round(metrics.trading.winRate * 100) / 100,
                        totalPnL: Math.round(metrics.trading.totalPnL * 100) / 100
                    },
                    performance: {
                        cacheHitRate: Math.round(metrics.performance.cacheHitRate * 100) / 100,
                        parallelTasks: metrics.performance.parallelTasksCompleted
                    },
                    ml: {
                        accuracy: Math.round(metrics.ml.modelAccuracy * 100) / 100,
                        predictions: metrics.ml.predictionsGenerated
                    },
                    system: {
                        memoryMB: Math.round(metrics.system.memoryUsage.heapUsed / 1024 / 1024),
                        health: this.tradingSystem.getHealthStatus()
                    }
                };

                console.log('[ENTERPRISE STARTUP] 📊 Metrics Report:', JSON.stringify(report, null, 2));

            } catch (error) {
                console.error('[ENTERPRISE STARTUP] Metrics reporting error:', error);
            }
        }, this.config.metricsReportingInterval);
    }

    private async printStartupBanner(): Promise<void> {
        const config = this.createTradingSystemConfig();
        
        console.log('\n' + '='.repeat(100));
        console.log('🚀 ENTERPRISE INTEGRATED TRADING SYSTEM - STARTING DEPLOYMENT');
        console.log('='.repeat(100));
        console.log(`Environment      : ${this.config.environment.toUpperCase()}`);
        console.log(`Trading Symbol   : ${config.trading.symbol}`);
        console.log(`Strategy         : ${config.trading.strategy}`);
        console.log(`Initial Capital  : $${config.trading.initialCapital.toLocaleString()}`);
        console.log(`Live Trading     : ${config.trading.enableLiveTrading ? 'ENABLED' : 'DISABLED'}`);
        console.log(`Instance ID      : ${config.trading.instanceId}`);
        console.log('='.repeat(100));
        console.log('📊 Enterprise Systems:');
        console.log(`  Monitoring       : ${config.monitoring.enabled ? 'ENABLED' : 'DISABLED'}`);
        console.log(`  Performance      : ${config.performance.enabled ? 'ENABLED' : 'DISABLED'}`);
        console.log(`  API Gateway      : ${config.apiGateway.enabled ? 'ENABLED' : 'DISABLED'}`);
        console.log(`  ML Pipeline      : ${config.ml.enabled ? 'ENABLED' : 'DISABLED'}`);
        console.log('='.repeat(100));
        console.log('🚨 ENTERPRISE GRADE - NO SIMPLIFICATIONS - COMPLETE ORCHESTRATION');
        console.log('='.repeat(100) + '\n');
    }

    public async start(): Promise<void> {
        try {
            console.log('[ENTERPRISE STARTUP] 🚀 Starting Enterprise Trading Engine Orchestration...');

            // Setup process handlers first
            this.setupProcessHandlers();

            // Print startup banner
            await this.printStartupBanner();

            // Validate environment
            await this.validateEnvironment();

            // Create trading system configuration
            const systemConfig = this.createTradingSystemConfig();

            // Initialize Enterprise Integrated Trading System
            console.log('[ENTERPRISE STARTUP] Initializing Enterprise Integrated Trading System...');
            this.tradingSystem = new EnterpriseIntegratedTradingSystem(systemConfig);

            // Setup event listeners
            this.tradingSystem.on('started', () => {
                console.log('[ENTERPRISE STARTUP] ✅ Enterprise Trading System started successfully');
            });

            this.tradingSystem.on('stopped', () => {
                console.log('[ENTERPRISE STARTUP] 🛑 Enterprise Trading System stopped');
            });

            this.tradingSystem.on('tradingBotError', (error) => {
                console.error('[ENTERPRISE STARTUP] 🚨 Trading Bot error:', error);
            });

            this.tradingSystem.on('metricsUpdated', (metrics: TradingEngineMetrics) => {
                // Handle metrics updates if needed
            });

            // Start the enterprise trading system
            await this.tradingSystem.start();

            // Setup health monitoring
            this.setupHealthMonitoring();

            // Setup metrics reporting
            this.setupMetricsReporting();

            console.log('[ENTERPRISE STARTUP] 🎉 Enterprise Trading Engine Orchestration completed successfully!');
            console.log('[ENTERPRISE STARTUP] 📊 System is now fully operational and monitoring markets 24/7');

        } catch (error) {
            console.error('[ENTERPRISE STARTUP] ❌ Failed to start Enterprise Trading Engine:', error);
            process.exit(1);
        }
    }

    public async stop(): Promise<void> {
        await this.handleShutdown('manual');
    }
}

// Bootstrap the application if this file is run directly
if (require.main === module) {
    const orchestrator = new EnterpriseStartupOrchestrator();
    
    orchestrator.start().catch((error) => {
        console.error('[ENTERPRISE STARTUP] Fatal error during startup:', error);
        process.exit(1);
    });
}

export { EnterpriseStartupOrchestrator };

console.log('🚀 [ENTERPRISE STARTUP] Enterprise Trading Engine Startup Orchestrator ready for deployment');
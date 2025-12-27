/**
 * 🌐 API ROUTER - Enterprise REST API Endpoints
 * 
 * Centralized routing for all bot API endpoints:
 * - Health checks (Kubernetes-ready)
 * - Trading data (portfolio, trades, signals)
 * - Analytics (DuckDB time-series)
 * - TIER 3 (Ensemble, Portfolio Optimization, Backtest)
 * - WebSocket status
 * - Monitoring & metrics
 * 
 * @module APIRouter
 * @version 1.0.0
 * @tier Infrastructure
 */

import express, { Request, Response, Application } from 'express';
import http from 'http';
import cors from 'cors';

export interface APIRouterConfig {
    instanceId: string;
    healthCheckPort: number;
    version: string;
}

export interface BotComponents {
    // Core components
    portfolio: any;
    trades: any[];
    lastSignals: Map<string, any>;
    healthStatus: any;
    
    // TIER 3 Systems
    ensembleEngine?: any;
    portfolioOptimizer?: any;
    backtestEngine?: any;
    
    // Data Infrastructure
    wsAggregator?: any;
    duckdbIntegration?: any;
    queryBuilder?: any;
    monitoringSystem?: any;
    
    // Feature Flags
    ensembleEnabled: boolean;
    portfolioOptimizationEnabled: boolean;
    wsEnabled: boolean;
    
    // State
    lastOptimizationTime?: number;
    optimizationInterval?: number;
    wsUpdateCount: number;
    wsLastUpdate: number;
    
    // Methods
    getCircuitBreakerStatus: () => any;
    resetCircuitBreaker: () => void;
    getUptime: () => string;
    generatePrometheusMetrics: () => string;
}

/**
 * APIRouter - Centralized API endpoint management
 */
export class APIRouter {
    private config: APIRouterConfig;
    private app: Application;
    private httpServer?: http.Server;
    private wsClients: Set<any> = new Set();
    
    constructor(config: APIRouterConfig) {
        this.config = config;
        this.app = express();
        this.setupMiddleware();
    }
    
    /**
     * Setup Express middleware
     */
    private setupMiddleware(): void {
        // CORS configuration
        this.app.use(cors({
            origin: '*',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
        
        this.app.use(express.json());
        this.app.use(express.static('.'));
    }
    
    /**
     * Register all API endpoints
     */
    registerAllEndpoints(components: BotComponents): void {
        this.registerCoreEndpoints(components);
        this.registerHealthEndpoints(components);
        this.registerAnalyticsEndpoints(components);
        this.registerTier3Endpoints(components);
        this.registerWebSocketEndpoints(components);
        this.registerMonitoringEndpoints(components);
    }
    
    /**
     * Core trading endpoints
     */
    private registerCoreEndpoints(components: BotComponents): void {
        // Root endpoint
        this.app.get('/', (req: Request, res: Response) => {
            res.json({
                service: 'Autonomous Trading Bot - FINALNA WERSJA ENTERPRISE',
                version: this.config.version,
                instance: this.config.instanceId,
                status: components.healthStatus.status,
                uptime: components.getUptime(),
                dashboard: 'http://localhost:3001/dashboard'
            });
        });
        
        // Dashboard
        this.app.get('/dashboard', (req: Request, res: Response) => {
            res.sendFile('dashboard.html', { root: '.' });
        });
        
        // Portfolio
        this.app.get('/api/portfolio', (req: Request, res: Response) => {
            res.json({
                ...components.portfolio,
                instance: this.config.instanceId,
                timestamp: Date.now()
            });
        });
        
        // Signals
        this.app.get('/api/signals', (req: Request, res: Response) => {
            const signals = Array.from(components.lastSignals.values());
            res.json({
                signals,
                instance: this.config.instanceId,
                timestamp: Date.now(),
                count: signals.length
            });
        });
        
        // Trades
        this.app.get('/api/trades', (req: Request, res: Response) => {
            const limit = parseInt(req.query.limit as string) || 50;
            const recentTrades = components.trades.slice(-limit);
            
            res.json({
                trades: recentTrades,
                instance: this.config.instanceId,
                total: components.trades.length,
                timestamp: Date.now()
            });
        });
        
        // Status
        this.app.get('/api/status', (req: Request, res: Response) => {
            res.json({
                health: components.healthStatus,
                performance: components.portfolio,
                circuitBreaker: components.getCircuitBreakerStatus(),
                timestamp: Date.now()
            });
        });
    }
    
    /**
     * Health check endpoints (Kubernetes-ready)
     */
    private registerHealthEndpoints(components: BotComponents): void {
        // Main health check
        this.app.get('/health', (req: Request, res: Response) => {
            res.json(components.healthStatus);
        });
        
        // Readiness probe
        this.app.get('/health/ready', (req: Request, res: Response) => {
            const isReady = components.healthStatus.components.strategies &&
                components.healthStatus.components.monitoring &&
                components.healthStatus.components.portfolio;
            
            if (isReady) {
                res.status(200).json({
                    status: 'ready',
                    instance: this.config.instanceId,
                    version: this.config.version,
                    timestamp: Date.now()
                });
            } else {
                res.status(503).json({
                    status: 'not ready',
                    instance: this.config.instanceId,
                    components: components.healthStatus.components,
                    timestamp: Date.now()
                });
            }
        });
        
        // Liveness probe
        this.app.get('/health/live', (req: Request, res: Response) => {
            const isLive = (Date.now() - components.healthStatus.lastUpdate) < 60000;
            
            if (isLive) {
                res.status(200).json({
                    status: 'live',
                    instance: this.config.instanceId,
                    uptime: components.getUptime(),
                    timestamp: Date.now()
                });
            } else {
                res.status(503).json({
                    status: 'not live',
                    instance: this.config.instanceId,
                    lastUpdate: components.healthStatus.lastUpdate,
                    timestamp: Date.now()
                });
            }
        });
        
        // Prometheus metrics
        this.app.get('/metrics', (req: Request, res: Response) => {
            const metrics = components.generatePrometheusMetrics();
            res.set('Content-Type', 'text/plain');
            res.send(metrics);
        });
        
        // Circuit breaker endpoints
        this.app.get('/api/circuit-breaker', (req: Request, res: Response) => {
            res.json({
                ...components.getCircuitBreakerStatus(),
                instance: this.config.instanceId,
                timestamp: Date.now()
            });
        });
        
        this.app.post('/api/circuit-breaker/reset', (req: Request, res: Response) => {
            const previousStatus = components.getCircuitBreakerStatus();
            components.resetCircuitBreaker();
            
            res.json({
                success: true,
                previousStatus,
                currentStatus: components.getCircuitBreakerStatus(),
                instance: this.config.instanceId,
                timestamp: Date.now()
            });
        });
    }
    
    /**
     * Analytics endpoints (DuckDB time-series)
     */
    private registerAnalyticsEndpoints(components: BotComponents): void {
        // Daily performance
        this.app.get('/api/analytics/daily', async (req: Request, res: Response) => {
            try {
                if (!components.queryBuilder) {
                    return res.status(503).json({ error: 'Analytics not available' });
                }
                
                const days = parseInt(req.query.days as string) || 30;
                const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'daily';
                
                const performance = await components.queryBuilder.getPerformanceByPeriod(period, days);
                
                res.json({
                    performance,
                    period,
                    days,
                    instance: this.config.instanceId,
                    timestamp: Date.now()
                });
            } catch (error: any) {
                console.error(`❌ [ANALYTICS] Daily performance error:`, error);
                res.status(500).json({ error: error.message });
            }
        });
        
        // Strategy comparison
        this.app.get('/api/analytics/strategies', async (req: Request, res: Response) => {
            try {
                if (!components.queryBuilder) {
                    return res.status(503).json({ error: 'Analytics not available' });
                }
                
                const strategies = await components.queryBuilder.getStrategyComparison();
                
                res.json({
                    strategies,
                    instance: this.config.instanceId,
                    timestamp: Date.now()
                });
            } catch (error: any) {
                console.error(`❌ [ANALYTICS] Strategy comparison error:`, error);
                res.status(500).json({ error: error.message });
            }
        });
        
        // Portfolio time series
        this.app.get('/api/analytics/portfolio/timeseries', async (req: Request, res: Response) => {
            try {
                if (!components.duckdbIntegration) {
                    return res.status(503).json({ error: 'Analytics not available' });
                }
                
                const hours = parseInt(req.query.hours as string) || 24;
                const timeseries = await components.duckdbIntegration.getPortfolioTimeSeries(hours);
                
                res.json({
                    timeseries,
                    hours,
                    instance: this.config.instanceId,
                    timestamp: Date.now()
                });
            } catch (error: any) {
                console.error(`❌ [ANALYTICS] Portfolio timeseries error:`, error);
                res.status(500).json({ error: error.message });
            }
        });
        
        // Risk metrics time series
        this.app.get('/api/analytics/risk/timeseries', async (req: Request, res: Response) => {
            try {
                if (!components.duckdbIntegration) {
                    return res.status(503).json({ error: 'Analytics not available' });
                }
                
                const hours = parseInt(req.query.hours as string) || 24;
                const timeseries = await components.duckdbIntegration.getRiskMetricsTimeSeries(hours);
                
                res.json({
                    timeseries,
                    hours,
                    instance: this.config.instanceId,
                    timestamp: Date.now()
                });
            } catch (error: any) {
                console.error(`❌ [ANALYTICS] Risk timeseries error:`, error);
                res.status(500).json({ error: error.message });
            }
        });
    }
    
    /**
     * TIER 3 endpoints (Ensemble, Portfolio, Backtest)
     */
    private registerTier3Endpoints(components: BotComponents): void {
        // Ensemble prediction status
        this.app.get('/api/ensemble/status', (req: Request, res: Response) => {
            if (!components.ensembleEngine) {
                return res.status(503).json({ error: 'Ensemble not enabled' });
            }
            
            const report = components.ensembleEngine.getPerformanceReport();
            res.json({
                enabled: components.ensembleEnabled,
                accuracy: report.ensemble_accuracy,
                sharpe: report.ensemble_sharpe,
                winRate: report.ensemble_win_rate,
                totalPredictions: report.total_predictions,
                bestModel: report.best_performing_model,
                worstModel: report.worst_performing_model,
                unanimousDecisions: report.unanimous_decisions,
                instance: this.config.instanceId,
                timestamp: Date.now()
            });
        });
        
        // Portfolio optimization status
        this.app.get('/api/portfolio/optimization', (req: Request, res: Response) => {
            if (!components.portfolioOptimizer) {
                return res.status(503).json({ error: 'Portfolio optimization not enabled' });
            }
            
            const history = components.portfolioOptimizer.getOptimizationHistory();
            const latest = history[history.length - 1];
            
            res.json({
                enabled: components.portfolioOptimizationEnabled,
                lastOptimization: components.lastOptimizationTime,
                nextOptimization: components.lastOptimizationTime! + components.optimizationInterval!,
                latestResult: latest ? {
                    expectedReturn: latest.expected_return,
                    expectedVolatility: latest.expected_volatility,
                    sharpeRatio: latest.sharpe_ratio,
                    tradesRequired: latest.trades_required.size,
                    optimizationMethod: latest.optimization_method,
                    timestamp: latest.timestamp
                } : null,
                instance: this.config.instanceId,
                timestamp: Date.now()
            });
        });
        
        // Run backtest validation
        this.app.post('/api/backtest/validate', async (req: Request, res: Response) => {
            if (!components.backtestEngine) {
                return res.status(503).json({ error: 'Backtest engine not available' });
            }
            
            try {
                console.log(`🧪 [BACKTEST] Running validation...`);
                
                const result = {
                    status: 'Backtest engine ready',
                    walkForwardEnabled: true,
                    monteCarloEnabled: true,
                    message: 'Backtest validation endpoint ready. Implement with actual strategy + historical data.'
                };
                
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: String(error) });
            }
        });
    }
    
    /**
     * WebSocket feed endpoints
     */
    private registerWebSocketEndpoints(components: BotComponents): void {
        // WebSocket health status
        this.app.get('/api/websocket/health', (req: Request, res: Response) => {
            if (!components.wsAggregator) {
                return res.status(503).json({
                    error: 'WebSocket not enabled',
                    enabled: false
                });
            }
            
            const health = components.wsAggregator.getHealthStatus();
            res.json({
                ...health,
                updateCount: components.wsUpdateCount,
                lastUpdate: components.wsLastUpdate,
                instance: this.config.instanceId,
                timestamp: Date.now()
            });
        });
        
        // Source statuses
        this.app.get('/api/websocket/sources', (req: Request, res: Response) => {
            if (!components.wsAggregator) {
                return res.status(503).json({ error: 'WebSocket not enabled' });
            }
            
            const statuses = Array.from(components.wsAggregator.getSourceStatuses().values());
            res.json({
                sources: statuses,
                instance: this.config.instanceId,
                timestamp: Date.now()
            });
        });
        
        // Active source
        this.app.get('/api/websocket/active-source', (req: Request, res: Response) => {
            if (!components.wsAggregator) {
                return res.status(503).json({ error: 'WebSocket not enabled' });
            }
            
            res.json({
                activeSource: components.wsAggregator.getActiveSource(),
                instance: this.config.instanceId,
                timestamp: Date.now()
            });
        });
    }
    
    /**
     * Monitoring system endpoints
     */
    private registerMonitoringEndpoints(components: BotComponents): void {
        // Monitoring summary
        this.app.get('/api/monitoring/summary', (req: Request, res: Response) => {
            try {
                const summary = components.monitoringSystem?.getSummary() || { error: 'Monitoring not initialized' };
                res.json({
                    ...summary,
                    instance: this.config.instanceId,
                    timestamp: Date.now()
                });
            } catch (error: any) {
                console.error(`❌ [MONITORING] Summary error:`, error);
                res.status(500).json({ error: error.message });
            }
        });
        
        // Alert history
        this.app.get('/api/monitoring/alerts', (req: Request, res: Response) => {
            try {
                const components_any = components.monitoringSystem?.getComponents();
                const limit = parseInt(req.query.limit as string) || 50;
                const alerts = components_any?.alert_manager?.getAlertHistory(limit) || [];
                res.json({
                    alerts,
                    limit,
                    instance: this.config.instanceId,
                    timestamp: Date.now()
                });
            } catch (error: any) {
                console.error(`❌ [MONITORING] Alert history error:`, error);
                res.status(500).json({ error: error.message });
            }
        });
        
        // Retrain history
        this.app.get('/api/monitoring/retrains', (req: Request, res: Response) => {
            try {
                const components_any = components.monitoringSystem?.getComponents();
                const limit = parseInt(req.query.limit as string) || 20;
                const stats = components_any?.ml_retrain_manager?.getStatistics() || {};
                res.json({
                    ...stats,
                    instance: this.config.instanceId,
                    timestamp: Date.now()
                });
            } catch (error: any) {
                console.error(`❌ [MONITORING] Retrain history error:`, error);
                res.status(500).json({ error: error.message });
            }
        });
    }
    
    /**
     * Start HTTP server
     */
    async startServer(wsServerSetup?: (httpServer: http.Server) => void): Promise<void> {
        if (this.httpServer) {
            console.log(`⚠️ [${this.config.instanceId}] HTTP server already running, skipping...`);
            return;
        }
        
        return new Promise((resolve, reject) => {
            const tryPort = (port: number, maxAttempts: number = 10): void => {
                if (maxAttempts <= 0) {
                    console.warn(`⚠️ [${this.config.instanceId}] Could not bind health server after trying ports ${this.config.healthCheckPort}-${this.config.healthCheckPort + 9}`);
                    resolve();
                    return;
                }
                
                this.httpServer = http.createServer(this.app);
                
                this.httpServer.listen(port, () => {
                    console.log(`✅ [${this.config.instanceId}] Health server running on port ${port}`);
                    this.config.healthCheckPort = port;
                    
                    // Setup WebSocket server if callback provided
                    if (this.httpServer && wsServerSetup) {
                        wsServerSetup(this.httpServer);
                    }
                    
                    resolve();
                });
                
                this.httpServer.on('error', (error: any) => {
                    if (error.code === 'EADDRINUSE') {
                        console.warn(`⚠️ [${this.config.instanceId}] Port ${port} is busy, trying port ${port + 1}...`);
                        this.httpServer?.close();
                        tryPort(port + 1, maxAttempts - 1);
                    } else {
                        console.error(`❌ [${this.config.instanceId}] Health server error:`, error);
                        resolve();
                    }
                });
            };
            
            // Skip health server in simulation mode if configured
            if (process.env.MODE === 'simulation' && process.env.SKIP_HEALTH_SERVER === 'true') {
                console.log(`ℹ️ [${this.config.instanceId}] Skipping health server in simulation mode`);
                resolve();
                return;
            }
            
            tryPort(this.config.healthCheckPort);
        });
    }
    
    /**
     * Get Express app instance
     */
    getApp(): Application {
        return this.app;
    }
    
    /**
     * Get HTTP server instance
     */
    getHttpServer(): http.Server | undefined {
        return this.httpServer;
    }
    
    /**
     * Stop server
     */
    async stopServer(): Promise<void> {
        if (this.httpServer) {
            return new Promise((resolve) => {
                this.httpServer!.close(() => {
                    console.log(`✅ [${this.config.instanceId}] HTTP server stopped`);
                    resolve();
                });
            });
        }
    }
}

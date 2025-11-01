/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🖥️ COMPREHENSIVE UI/DASHBOARD INTERFACE SYSTEM
 * 
 * Enterprise-grade web-based dashboard for trading bot monitoring and control.
 * Provides real-time visualization, alert management, and system control interface.
 */

import { EventEmitter } from 'events';
import express = require('express');
import * as http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import * as path from 'path';
import { RiskMetrics } from '../types/common';
import { Alert } from '../alerts/enterprise_alert_coordination_system';

// =====================================================
// DASHBOARD INTERFACES & TYPES
// =====================================================

export interface DashboardConfig {
    port: number;
    host: string;
    staticPath: string;
    updateInterval: number;
    maxConnections: number;
    authentication: {
        enabled: boolean;
        username?: string;
        password?: string;
        sessionSecret?: string;
    };
    features: {
        realTimeData: boolean;
        alertManagement: boolean;
        systemControl: boolean;
        strategyManagement: boolean;
        portfolio: boolean;
        analytics: boolean;
    };
    theme: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
}

export interface DashboardData {
    system: SystemStatus;
    alerts: AlertSummary;
    portfolio: PortfolioStatus;
    strategies: StrategyStatus[];
    performance: PerformanceMetrics;
    market: MarketData;
    execution: ExecutionMetrics;
    timestamp: number;
}

export interface SystemStatus {
    isRunning: boolean;
    status?: 'running' | 'stopped' | 'error';
    uptime: number;
    version: string;
    environment: string;
    components: ComponentStatus[];
    resources: ResourceUsage;
    health: {
        overall: 'HEALTHY' | 'WARNING' | 'CRITICAL';
        score: number;
        issues: string[];
    };
}

export interface ComponentStatus {
    name: string;
    status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'MAINTENANCE';
    uptime: number;
    lastCheck: number;
    metrics: Record<string, any>;
}

export interface ResourceUsage {
    cpu: {
        usage: number;
        cores: number;
    };
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
    disk: {
        used: number;
        total: number;
        percentage: number;
    };
    network: {
        bytesIn: number;
        bytesOut: number;
        connections: number;
    };
}

export interface AlertSummary {
    total: number;
    active: number;
    critical: number;
    recent: Alert[];
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
}

export interface PortfolioStatus {
    totalValue: number;
    totalPnL: number;
    totalPnLPercentage: number;
    positions: Position[];
    assets: AssetHolding[];
    allocation: AssetAllocation[];
    risk: RiskMetrics;
}

export interface Position {
    symbol: string;
    side: 'LONG' | 'SHORT';
    size: number;
    entryPrice: number;
    currentPrice: number;
    pnl: number;
    pnlPercentage: number;
    value: number;
    timestamp: number;
}

export interface AssetHolding {
    asset: string;
    balance: number;
    value: number;
    percentage: number;
}

export interface AssetAllocation {
    asset: string;
    percentage: number;
    target: number;
    deviation: number;
}

export interface StrategyStatus {
    id: string;
    name: string;
    status: 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'ERROR';
    performance: {
        pnl: number;
        pnlPercentage: number;
        winRate: number;
        trades: number;
        successfulTrades: number;
    };
    allocation: number;
    lastSignal: {
        action: string;
        timestamp: number;
        confidence: number;
    };
    parameters: Record<string, any>;
}

export interface PerformanceMetrics {
    daily: {
        pnl: number;
        pnlPercentage: number;
        volume: number;
        trades: number;
    };
    weekly: {
        pnl: number;
        pnlPercentage: number;
        volume: number;
        trades: number;
    };
    monthly: {
        pnl: number;
        pnlPercentage: number;
        volume: number;
        trades: number;
    };
    overall: {
        totalPnL: number;
        totalPnLPercentage: number;
        totalVolume: number;
        totalTrades: number;
        winRate: number;
        sharpeRatio: number;
        maxDrawdown: number;
    };
}

export interface MarketData {
    symbols: MarketSymbol[];
    indices: MarketIndex[];
    trending: TrendingAsset[];
    volatility: VolatilityData[];
}

export interface MarketSymbol {
    symbol: string;
    price: number;
    change: number;
    changePercentage: number;
    volume: number;
    timestamp: number;
}

export interface MarketIndex {
    name: string;
    value: number;
    change: number;
    changePercentage: number;
}

export interface TrendingAsset {
    symbol: string;
    volume: number;
    priceChange: number;
    mentions: number;
}

export interface VolatilityData {
    symbol: string;
    volatility: number;
    impliedVolatility: number;
    historicalVolatility: number;
}

export interface ExecutionMetrics {
    orderCount: {
        total: number;
        successful: number;
        failed: number;
        pending: number;
    };
    latency: {
        average: number;
        p95: number;
        p99: number;
    };
    slippage: {
        average: number;
        worst: number;
        best: number;
    };
    fees: {
        total: number;
        percentage: number;
    };
}

// =====================================================
// MAIN DASHBOARD INTERFACE SYSTEM
// =====================================================

export class DashboardInterfaceSystem extends EventEmitter {
    private config: DashboardConfig;
    private app!: express.Application;
    private server!: http.Server;
    private io!: SocketIOServer;
    private isRunning = false;
    private updateInterval?: NodeJS.Timeout;
    private connectedClients: Set<string> = new Set();
    private currentData: DashboardData;
    private dataProviders: Map<string, () => any> = new Map();

    constructor(config?: Partial<DashboardConfig>) {
        super();
        
        this.config = {
            port: 3000,
            host: '0.0.0.0',
            staticPath: './public',
            updateInterval: 1000, // 1 second
            maxConnections: 100,
            authentication: {
                enabled: false
            },
            features: {
                realTimeData: true,
                alertManagement: true,
                systemControl: true,
                strategyManagement: true,
                portfolio: true,
                analytics: true
            },
            theme: {
                primary: '#2563eb',
                secondary: '#64748b',
                accent: '#10b981',
                background: '#0f172a',
                text: '#f8fafc'
            },
            ...config
        };

        this.currentData = this.initializeData();
        this.setupExpress();
        this.setupSocketIO();
        this.setupDefaultDataProviders();
    }

    // =====================================================
    // INITIALIZATION
    // =====================================================

    private initializeData(): DashboardData {
        return {
            system: {
                isRunning: false,
                uptime: 0,
                version: '2.0.0',
                environment: process.env.NODE_ENV || 'development',
                components: [],
                resources: {
                    cpu: { usage: 0, cores: 1 },
                    memory: { used: 0, total: 1, percentage: 0 },
                    disk: { used: 0, total: 1, percentage: 0 },
                    network: { bytesIn: 0, bytesOut: 0, connections: 0 }
                },
                health: {
                    overall: 'HEALTHY',
                    score: 100,
                    issues: []
                }
            },
            alerts: {
                total: 0,
                active: 0,
                critical: 0,
                recent: [],
                byCategory: {},
                bySeverity: {}
            },
            portfolio: {
                totalValue: 0,
                totalPnL: 0,
                totalPnLPercentage: 0,
                positions: [],
                assets: [],
                allocation: [],
                risk: {
                    currentDrawdown: 0,
                    maxDrawdown: 0,
                    var95: 0,
                    var99: 0,
                    sharpeRatio: 0,
                    sortinoRatio: 0,
                    calmarRatio: 0,
                    volatility: 0,
                    beta: 0,
                    exposure: 0,
                    concentration: 0,
                    leverageRatio: 0,
                    liquidityRisk: 0,
                    correlationRisk: 0
                }
            },
            strategies: [],
            performance: {
                daily: { pnl: 0, pnlPercentage: 0, volume: 0, trades: 0 },
                weekly: { pnl: 0, pnlPercentage: 0, volume: 0, trades: 0 },
                monthly: { pnl: 0, pnlPercentage: 0, volume: 0, trades: 0 },
                overall: {
                    totalPnL: 0,
                    totalPnLPercentage: 0,
                    totalVolume: 0,
                    totalTrades: 0,
                    winRate: 0,
                    sharpeRatio: 0,
                    maxDrawdown: 0
                }
            },
            market: {
                symbols: [],
                indices: [],
                trending: [],
                volatility: []
            },
            execution: {
                orderCount: { total: 0, successful: 0, failed: 0, pending: 0 },
                latency: { average: 0, p95: 0, p99: 0 },
                slippage: { average: 0, worst: 0, best: 0 },
                fees: { total: 0, percentage: 0 }
            },
            timestamp: Date.now()
        };
    }

    private setupExpress(): void {
        this.app = express();
        
        // Middleware
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // CORS
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            next();
        });

        // Authentication middleware
        if (this.config.authentication.enabled) {
            this.app.use(this.authenticationMiddleware.bind(this));
        }

        // Static files
        this.app.use(express.static(this.config.staticPath));

        // API routes
        this.setupAPIRoutes();

        // Serve dashboard HTML
        this.app.get('/', (req, res) => {
            res.send(this.generateDashboardHTML());
        });

        this.server = http.createServer(this.app);
    }

    private setupSocketIO(): void {
        this.io = new SocketIOServer(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            },
            maxHttpBufferSize: 1e6, // 1MB
            pingTimeout: 60000,
            pingInterval: 25000
        });

        this.io.on('connection', (socket: Socket) => {
            this.handleClientConnection(socket);
        });
    }

    private setupAPIRoutes(): void {
        const router = express.Router();

        // Dashboard data
        router.get('/data', (req, res) => {
            res.json(this.currentData);
        });

        // System control
        router.post('/system/start', (req, res) => {
            this.emit('system_start_requested');
            res.json({ success: true, message: 'System start requested' });
        });

        router.post('/system/stop', (req, res) => {
            this.emit('system_stop_requested');
            res.json({ success: true, message: 'System stop requested' });
        });

        router.post('/system/restart', (req, res) => {
            this.emit('system_restart_requested');
            res.json({ success: true, message: 'System restart requested' });
        });

        // Alert management
        router.get('/alerts', (req, res) => {
            res.json(this.currentData.alerts);
        });

        router.post('/alerts/:id/acknowledge', (req, res) => {
            const alertId = req.params.id;
            this.emit('alert_acknowledge_requested', alertId);
            res.json({ success: true, message: 'Alert acknowledgement requested' });
        });

        router.post('/alerts/:id/resolve', (req, res) => {
            const alertId = req.params.id;
            this.emit('alert_resolve_requested', alertId);
            res.json({ success: true, message: 'Alert resolution requested' });
        });

        // Strategy management
        router.get('/strategies', (req, res) => {
            res.json(this.currentData.strategies);
        });

        router.post('/strategies/:id/start', (req, res) => {
            const strategyId = req.params.id;
            this.emit('strategy_start_requested', strategyId);
            res.json({ success: true, message: 'Strategy start requested' });
        });

        router.post('/strategies/:id/stop', (req, res) => {
            const strategyId = req.params.id;
            this.emit('strategy_stop_requested', strategyId);
            res.json({ success: true, message: 'Strategy stop requested' });
        });

        router.post('/strategies/:id/parameters', (req, res) => {
            const strategyId = req.params.id;
            const parameters = req.body;
            this.emit('strategy_parameters_update_requested', strategyId, parameters);
            res.json({ success: true, message: 'Strategy parameters update requested' });
        });

        // Portfolio
        router.get('/portfolio', (req, res) => {
            res.json(this.currentData.portfolio);
        });

        // Performance
        router.get('/performance', (req, res) => {
            res.json(this.currentData.performance);
        });

        // Market data
        router.get('/market', (req, res) => {
            res.json(this.currentData.market);
        });

        this.app.use('/api', router);
    }

    private authenticationMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
        // Skip auth for static files and API endpoints that don't require auth
        if (req.path.startsWith('/static') || req.path === '/api/data') {
            next();
            return;
        }

        const auth = req.headers.authorization;
        if (!auth) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        // Basic auth implementation
        const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
        const username = credentials[0];
        const password = credentials[1];

        if (username === this.config.authentication.username && 
            password === this.config.authentication.password) {
            return next();
        }

        res.status(401).json({ error: 'Invalid credentials' });
    }

    // =====================================================
    // CLIENT CONNECTION HANDLING
    // =====================================================

    private handleClientConnection(socket: Socket): void {
        const clientId = socket.id;
        
        console.log(`🔌 Dashboard client connected: ${clientId}`);
        this.connectedClients.add(clientId);

        // Check connection limit
        if (this.connectedClients.size > this.config.maxConnections) {
            socket.emit('error', { message: 'Maximum connections exceeded' });
            socket.disconnect();
            return;
        }

        // Send initial data
        socket.emit('dashboard_data', this.currentData);

        // Handle client events
        socket.on('subscribe', (channels: string[]) => {
            channels.forEach(channel => {
                socket.join(channel);
            });
            console.log(`📡 Client ${clientId} subscribed to channels:`, channels);
        });

        socket.on('unsubscribe', (channels: string[]) => {
            channels.forEach(channel => {
                socket.leave(channel);
            });
            console.log(`📡 Client ${clientId} unsubscribed from channels:`, channels);
        });

        socket.on('command', (command: any) => {
            this.handleClientCommand(socket, command);
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Dashboard client disconnected: ${clientId}`);
            this.connectedClients.delete(clientId);
        });

        this.emit('client_connected', clientId);
    }

    private handleClientCommand(socket: Socket, command: any): void {
        try {
            switch (command.type) {
                case 'system_control':
                    this.emit(`system_${command.action}_requested`, command.data);
                    break;
                    
                case 'strategy_control':
                    this.emit(`strategy_${command.action}_requested`, command.strategyId, command.data);
                    break;
                    
                case 'alert_action':
                    this.emit(`alert_${command.action}_requested`, command.alertId, command.data);
                    break;
                    
                default:
                    socket.emit('error', { message: 'Unknown command type' });
            }
        } catch (error) {
            console.error('❌ Error handling client command:', error);
            socket.emit('error', { message: 'Command execution failed' });
        }
    }

    // =====================================================
    // DATA PROVIDERS
    // =====================================================

    private setupDefaultDataProviders(): void {
        // System status provider
        this.registerDataProvider('system', () => {
            return {
                isRunning: this.isRunning,
                uptime: this.isRunning ? Date.now() - this.getStartTime() : 0,
                version: '2.0.0',
                environment: process.env.NODE_ENV || 'development',
                components: this.getComponentStatus(),
                resources: this.getResourceUsage(),
                health: this.getSystemHealth()
            };
        });

        // Market data provider (mock)
        this.registerDataProvider('market', () => {
            return {
                symbols: this.generateMockMarketData(),
                indices: this.generateMockIndices(),
                trending: this.generateMockTrending(),
                volatility: this.generateMockVolatility()
            };
        });

        // Performance provider (mock)
        this.registerDataProvider('performance', () => {
            return this.generateMockPerformance();
        });
    }

    public registerDataProvider(key: string, provider: () => any): void {
        this.dataProviders.set(key, provider);
        console.log(`📊 Data provider registered: ${key}`);
    }

    public unregisterDataProvider(key: string): void {
        this.dataProviders.delete(key);
        console.log(`📊 Data provider unregistered: ${key}`);
    }

    private updateData(): void {
        try {
            // Update each data section
            Array.from(this.dataProviders.entries()).forEach(([key, provider]) => {
                try {
                    (this.currentData as any)[key] = provider();
                } catch (error) {
                    console.error(`❌ Error updating data for ${key}:`, error);
                }
            });

            this.currentData.timestamp = Date.now();

            // Broadcast to all connected clients
            this.io.emit('dashboard_data', this.currentData);
            
            // Emit specific channel updates
            if (this.config.features.realTimeData) {
                this.io.to('real-time').emit('real_time_update', {
                    market: this.currentData.market,
                    portfolio: this.currentData.portfolio,
                    execution: this.currentData.execution,
                    timestamp: this.currentData.timestamp
                });
            }

            this.emit('data_updated', this.currentData);
        } catch (error) {
            console.error('❌ Error updating dashboard data:', error);
        }
    }

    // =====================================================
    // MOCK DATA GENERATORS
    // =====================================================

    private generateMockMarketData(): MarketSymbol[] {
        const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT'];
        return symbols.map(symbol => ({
            symbol,
            price: 45000 + Math.random() * 10000,
            change: (Math.random() - 0.5) * 1000,
            changePercentage: (Math.random() - 0.5) * 10,
            volume: Math.random() * 1000000,
            timestamp: Date.now()
        }));
    }

    private generateMockIndices(): MarketIndex[] {
        return [
            {
                name: 'Crypto Total Market Cap',
                value: 2.1e12,
                change: 45000000000,
                changePercentage: 2.18
            },
            {
                name: 'DeFi Total Value Locked',
                value: 89000000000,
                change: -1200000000,
                changePercentage: -1.33
            }
        ];
    }

    private generateMockTrending(): TrendingAsset[] {
        return [
            { symbol: 'BTCUSDT', volume: 1234567890, priceChange: 3.45, mentions: 15423 },
            { symbol: 'ETHUSDT', volume: 987654321, priceChange: -1.23, mentions: 8932 },
            { symbol: 'ADAUSDT', volume: 456789123, priceChange: 7.89, mentions: 3456 }
        ];
    }

    private generateMockVolatility(): VolatilityData[] {
        return [
            { symbol: 'BTCUSDT', volatility: 0.034, impliedVolatility: 0.041, historicalVolatility: 0.038 },
            { symbol: 'ETHUSDT', volatility: 0.058, impliedVolatility: 0.062, historicalVolatility: 0.055 }
        ];
    }

    private generateMockPerformance(): PerformanceMetrics {
        return {
            daily: { pnl: 1234.56, pnlPercentage: 2.45, volume: 50000, trades: 45 },
            weekly: { pnl: 5678.90, pnlPercentage: 8.32, volume: 350000, trades: 289 },
            monthly: { pnl: 12345.67, pnlPercentage: 15.67, volume: 1500000, trades: 1234 },
            overall: {
                totalPnL: 87654.32,
                totalPnLPercentage: 23.45,
                totalVolume: 5000000,
                totalTrades: 4567,
                winRate: 67.8,
                sharpeRatio: 1.85,
                maxDrawdown: -8.9
            }
        };
    }

    private getComponentStatus(): ComponentStatus[] {
        // Mock component status
        return [
            {
                name: 'Trading Engine',
                status: 'ONLINE',
                uptime: 3600000,
                lastCheck: Date.now(),
                metrics: { ordersPerSecond: 15, latency: 50 }
            },
            {
                name: 'Market Data Feed',
                status: 'ONLINE',
                uptime: 3600000,
                lastCheck: Date.now(),
                metrics: { messagesPerSecond: 1000, delay: 2 }
            },
            {
                name: 'Risk Manager',
                status: 'ONLINE',
                uptime: 3600000,
                lastCheck: Date.now(),
                metrics: { checksPerSecond: 50, alerts: 2 }
            }
        ];
    }

    private getResourceUsage(): ResourceUsage {
        const os = require('os');
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        return {
            cpu: {
                usage: Math.random() * 50 + 10, // Mock CPU usage
                cores: os.cpus().length
            },
            memory: {
                used: usedMem,
                total: totalMem,
                percentage: (usedMem / totalMem) * 100
            },
            disk: {
                used: 50000000000, // Mock values
                total: 100000000000,
                percentage: 50
            },
            network: {
                bytesIn: Math.random() * 1000000,
                bytesOut: Math.random() * 500000,
                connections: this.connectedClients.size
            }
        };
    }

    private getSystemHealth(): { overall: 'HEALTHY' | 'WARNING' | 'CRITICAL'; score: number; issues: string[] } {
        const issues = [];
        let score = 100;

        // Simple health scoring
        const resources = this.getResourceUsage();
        if (resources.cpu.usage > 80) {
            issues.push('High CPU usage');
            score -= 20;
        }
        if (resources.memory.percentage > 85) {
            issues.push('High memory usage');
            score -= 20;
        }

        let overall: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
        if (score < 80) overall = 'WARNING';
        if (score < 60) overall = 'CRITICAL';

        return { overall, score, issues };
    }

    private getStartTime(): number {
        // Mock start time
        return Date.now() - 3600000; // 1 hour ago
    }

    // =====================================================
    // HTML DASHBOARD GENERATION
    // =====================================================

    private generateDashboardHTML(): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trading Bot Dashboard</title>
    <script src="https://cdn.socket.io/4.7.4/socket.io.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {
            --primary: ${this.config.theme.primary};
            --secondary: ${this.config.theme.secondary};
            --accent: ${this.config.theme.accent};
            --background: ${this.config.theme.background};
            --text: ${this.config.theme.text};
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background: var(--background);
            color: var(--text);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.5;
        }
        
        .dashboard {
            display: grid;
            grid-template-columns: 250px 1fr;
            grid-template-rows: 60px 1fr;
            height: 100vh;
        }
        
        .header {
            grid-column: 1 / -1;
            background: rgba(15, 23, 42, 0.8);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(100, 116, 139, 0.2);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 2rem;
        }
        
        .logo {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--primary);
        }
        
        .status-indicator {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--accent);
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .sidebar {
            background: rgba(15, 23, 42, 0.6);
            border-right: 1px solid rgba(100, 116, 139, 0.2);
            padding: 1rem 0;
        }
        
        .nav-item {
            display: block;
            padding: 0.75rem 1.5rem;
            color: var(--text);
            text-decoration: none;
            transition: all 0.2s;
            border-left: 3px solid transparent;
        }
        
        .nav-item:hover, .nav-item.active {
            background: rgba(37, 99, 235, 0.1);
            border-left-color: var(--primary);
        }
        
        .main {
            padding: 2rem;
            overflow-y: auto;
        }
        
        .grid {
            display: grid;
            gap: 1.5rem;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        }
        
        .card {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(100, 116, 139, 0.2);
            border-radius: 0.5rem;
            padding: 1.5rem;
            transition: all 0.2s;
        }
        
        .card:hover {
            border-color: rgba(37, 99, 235, 0.3);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
        }
        
        .card-title {
            font-size: 1.125rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: var(--text);
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid rgba(100, 116, 139, 0.1);
        }
        
        .metric:last-child {
            border-bottom: none;
        }
        
        .metric-value {
            font-weight: 600;
        }
        
        .positive { color: #10b981; }
        .negative { color: #ef4444; }
        .warning { color: #f59e0b; }
        
        .alert {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            margin-bottom: 0.5rem;
            border-radius: 0.375rem;
            font-size: 0.875rem;
        }
        
        .alert-critical { background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; }
        .alert-high { background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; }
        .alert-medium { background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; }
        .alert-low { background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; }
        
        .btn {
            background: var(--primary);
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.2s;
        }
        
        .btn:hover {
            background: #1d4ed8;
        }
        
        .btn-sm {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
        }
        
        .btn-success { background: #10b981; }
        .btn-success:hover { background: #059669; }
        
        .btn-danger { background: #ef4444; }
        .btn-danger:hover { background: #dc2626; }
        
        .chart-container {
            height: 200px;
            margin-top: 1rem;
        }
        
        .loading {
            text-align: center;
            padding: 2rem;
            color: var(--secondary);
        }
        
        .connection-status {
            position: fixed;
            top: 1rem;
            right: 1rem;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            font-size: 0.875rem;
            z-index: 1000;
        }
        
        .connected {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid #10b981;
            color: #10b981;
        }
        
        .disconnected {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid #ef4444;
            color: #ef4444;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <header class="header">
            <div class="logo">🤖 Trading Bot Dashboard</div>
            <div class="status-indicator">
                <div class="status-dot"></div>
                <span id="systemStatus">ONLINE</span>
            </div>
        </header>
        
        <nav class="sidebar">
            <a href="#overview" class="nav-item active" onclick="showSection('overview')">📊 Overview</a>
            <a href="#portfolio" class="nav-item" onclick="showSection('portfolio')">💼 Portfolio</a>
            <a href="#strategies" class="nav-item" onclick="showSection('strategies')">🎯 Strategies</a>
            <a href="#alerts" class="nav-item" onclick="showSection('alerts')">🚨 Alerts</a>
            <a href="#performance" class="nav-item" onclick="showSection('performance')">📈 Performance</a>
            <a href="#market" class="nav-item" onclick="showSection('market')">🌍 Market</a>
            <a href="#system" class="nav-item" onclick="showSection('system')">⚙️ System</a>
        </nav>
        
        <main class="main">
            <div id="overview" class="section">
                <div class="grid">
                    <div class="card">
                        <h3 class="card-title">System Status</h3>
                        <div class="metric">
                            <span>Status</span>
                            <span id="overviewStatus" class="metric-value positive">RUNNING</span>
                        </div>
                        <div class="metric">
                            <span>Uptime</span>
                            <span id="overviewUptime" class="metric-value">--</span>
                        </div>
                        <div class="metric">
                            <span>Active Strategies</span>
                            <span id="overviewStrategies" class="metric-value">0</span>
                        </div>
                        <div class="metric">
                            <span>Total P&L</span>
                            <span id="overviewPnL" class="metric-value">$0.00</span>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3 class="card-title">Portfolio Summary</h3>
                        <div class="metric">
                            <span>Total Value</span>
                            <span id="portfolioValue" class="metric-value">$0.00</span>
                        </div>
                        <div class="metric">
                            <span>Today's P&L</span>
                            <span id="portfolioDailyPnL" class="metric-value">$0.00</span>
                        </div>
                        <div class="metric">
                            <span>Open Positions</span>
                            <span id="portfolioPositions" class="metric-value">0</span>
                        </div>
                        <div class="metric">
                            <span>Max Drawdown</span>
                            <span id="portfolioDrawdown" class="metric-value">0%</span>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3 class="card-title">Recent Alerts</h3>
                        <div id="recentAlerts">
                            <div class="loading">No recent alerts</div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3 class="card-title">Market Overview</h3>
                        <div id="marketOverview">
                            <div class="loading">Loading market data...</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="portfolio" class="section" style="display: none;">
                <div class="grid">
                    <div class="card">
                        <h3 class="card-title">Portfolio Performance</h3>
                        <div class="chart-container">
                            <canvas id="portfolioChart"></canvas>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3 class="card-title">Asset Allocation</h3>
                        <div class="chart-container">
                            <canvas id="allocationChart"></canvas>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3 class="card-title">Open Positions</h3>
                        <div id="openPositions">
                            <div class="loading">No open positions</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Additional sections would be implemented similarly -->
        </main>
    </div>
    
    <div id="connectionStatus" class="connection-status connected">Connected</div>

    <script>
        // Dashboard JavaScript implementation
        class TradingDashboard {
            constructor() {
                this.socket = io();
                this.currentData = null;
                this.charts = {};
                this.setupSocketListeners();
                this.setupUI();
            }
            
            setupSocketListeners() {
                this.socket.on('connect', () => {
                    document.getElementById('connectionStatus').className = 'connection-status connected';
                    document.getElementById('connectionStatus').textContent = 'Connected';
                    console.log('✅ Connected to dashboard server');
                });
                
                this.socket.on('disconnect', () => {
                    document.getElementById('connectionStatus').className = 'connection-status disconnected';
                    document.getElementById('connectionStatus').textContent = 'Disconnected';
                    console.log('❌ Disconnected from dashboard server');
                });
                
                this.socket.on('dashboard_data', (data) => {
                    this.currentData = data;
                    this.updateDashboard(data);
                });
                
                this.socket.on('real_time_update', (data) => {
                    this.updateRealTimeData(data);
                });
            }
            
            setupUI() {
                // Subscribe to real-time updates
                this.socket.emit('subscribe', ['real-time', 'alerts', 'system']);
            }
            
            updateDashboard(data) {
                // Update overview section
                document.getElementById('overviewStatus').textContent = data.system.isRunning ? 'RUNNING' : 'STOPPED';
                document.getElementById('overviewStatus').className = data.system.isRunning ? 'metric-value positive' : 'metric-value negative';
                document.getElementById('overviewUptime').textContent = this.formatUptime(data.system.uptime);
                document.getElementById('overviewStrategies').textContent = data.strategies.filter(s => s.status === 'ACTIVE').length;
                document.getElementById('overviewPnL').textContent = this.formatCurrency(data.portfolio.totalPnL);
                
                // Update portfolio summary
                document.getElementById('portfolioValue').textContent = this.formatCurrency(data.portfolio.totalValue);
                document.getElementById('portfolioDailyPnL').textContent = this.formatCurrency(data.performance.daily.pnl);
                document.getElementById('portfolioPositions').textContent = data.portfolio.positions.length;
                document.getElementById('portfolioDrawdown').textContent = data.performance.overall.maxDrawdown.toFixed(2) + '%';
                
                // Update recent alerts
                this.updateRecentAlerts(data.alerts.recent);
                
                // Update market overview
                this.updateMarketOverview(data.market.symbols);
                
                console.log('📊 Dashboard updated', new Date(data.timestamp));
            }
            
            updateRealTimeData(data) {
                // Update real-time elements without full refresh
                if (data.portfolio) {
                    document.getElementById('portfolioValue').textContent = this.formatCurrency(data.portfolio.totalValue);
                }
            }
            
            updateRecentAlerts(alerts) {
                const container = document.getElementById('recentAlerts');
                if (!alerts || alerts.length === 0) {
                    container.innerHTML = '<div class="loading">No recent alerts</div>';
                    return;
                }
                
                container.innerHTML = alerts.slice(0, 5).map(alert => \`
                    <div class="alert alert-\${alert.severity.toLowerCase()}">
                        <span>\${alert.title}</span>
                        <button class="btn btn-sm" onclick="dashboard.acknowledgeAlert('\${alert.id}')">
                            Acknowledge
                        </button>
                    </div>
                \`).join('');
            }
            
            updateMarketOverview(symbols) {
                const container = document.getElementById('marketOverview');
                if (!symbols || symbols.length === 0) {
                    container.innerHTML = '<div class="loading">No market data</div>';
                    return;
                }
                
                container.innerHTML = symbols.slice(0, 3).map(symbol => \`
                    <div class="metric">
                        <span>\${symbol.symbol}</span>
                        <span class="metric-value \${symbol.changePercentage > 0 ? 'positive' : 'negative'}">
                            $\${symbol.price.toLocaleString()} (\${symbol.changePercentage.toFixed(2)}%)
                        </span>
                    </div>
                \`).join('');
            }
            
            acknowledgeAlert(alertId) {
                fetch(\`/api/alerts/\${alertId}/acknowledge\`, { method: 'POST' })
                    .then(response => response.json())
                    .then(data => console.log('Alert acknowledged:', data))
                    .catch(error => console.error('Error acknowledging alert:', error));
            }
            
            formatCurrency(value) {
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2
                }).format(value);
            }
            
            formatUptime(ms) {
                const seconds = Math.floor(ms / 1000);
                const minutes = Math.floor(seconds / 60);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);
                
                if (days > 0) return \`\${days}d \${hours % 24}h\`;
                if (hours > 0) return \`\${hours}h \${minutes % 60}m\`;
                if (minutes > 0) return \`\${minutes}m \${seconds % 60}s\`;
                return \`\${seconds}s\`;
            }
        }
        
        function showSection(sectionName) {
            // Hide all sections
            document.querySelectorAll('.section').forEach(section => {
                section.style.display = 'none';
            });
            
            // Remove active class from all nav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Show selected section
            document.getElementById(sectionName).style.display = 'block';
            
            // Add active class to clicked nav item
            document.querySelector(\`[href="#\${sectionName}"]\`).classList.add('active');
        }
        
        // Initialize dashboard
        const dashboard = new TradingDashboard();
    </script>
</body>
</html>
        `;
    }

    // =====================================================
    // SYSTEM CONTROL
    // =====================================================

    public start(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.isRunning) {
                resolve();
                return;
            }

            try {
                this.server.listen(this.config.port, this.config.host, () => {
                    this.isRunning = true;
                    
                    // Start data update interval
                    this.updateInterval = setInterval(() => {
                        this.updateData();
                    }, this.config.updateInterval);

                    console.log(`🖥️ Dashboard Interface System started`);
                    console.log(`   📍 URL: http://${this.config.host}:${this.config.port}`);
                    console.log(`   ⚙️ Features: ${Object.entries(this.config.features).filter(([,enabled]) => enabled).map(([feature]) => feature).join(', ')}`);
                    
                    this.emit('dashboard_started');
                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    public stop(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.isRunning) {
                resolve();
                return;
            }

            // Clear update interval
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
            }

            // Disconnect all clients
            this.io.disconnectSockets();

            // Close server
            this.server.close(() => {
                this.isRunning = false;
                console.log('🖥️ Dashboard Interface System stopped');
                this.emit('dashboard_stopped');
                resolve();
            });
        });
    }

    public updateAlerts(alerts: Alert[]): void {
        // Normalize status/severity to string form to avoid type mismatches between AlertStatus/Severity types and string literals
        const activeCount = alerts.filter(a => String(a.status).toUpperCase() === 'ACTIVE').length;
        const criticalCount = alerts.filter(a => String(a.severity).toUpperCase() === 'CRITICAL').length;

        this.currentData.alerts = {
            total: alerts.length,
            active: activeCount,
            critical: criticalCount,
            recent: alerts.slice(-10),
            byCategory: alerts.reduce((acc, alert) => {
                acc[alert.category] = (acc[alert.category] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            bySeverity: alerts.reduce((acc, alert) => {
                const sev = String(alert.severity);
                acc[sev] = (acc[sev] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        };

        // Broadcast alert updates
        this.io.to('alerts').emit('alerts_updated', this.currentData.alerts);
    }

    public updatePortfolio(portfolio: PortfolioStatus): void {
        this.currentData.portfolio = portfolio;
        this.io.to('portfolio').emit('portfolio_updated', portfolio);
    }

    public updateStrategies(strategies: StrategyStatus[]): void {
        this.currentData.strategies = strategies;
        this.io.to('strategies').emit('strategies_updated', strategies);
    }

    // =====================================================
    // GETTERS
    // =====================================================

    public getConfig(): DashboardConfig {
        return { ...this.config };
    }

    public getCurrentData(): DashboardData {
        return { ...this.currentData };
    }

    public updateSystemStatus(status: 'running' | 'stopped' | 'error'): void {
        this.currentData.system.status = status;
        this.io.emit('system_status_updated', { status });
    }

    public updatePortfolioData(portfolio: PortfolioStatus): void {
        this.updatePortfolio(portfolio);
    }

    public updateRiskMetrics(riskMetrics: RiskMetrics): void {
        if (this.currentData.portfolio) {
            this.currentData.portfolio.risk = riskMetrics;
            this.io.to('portfolio').emit('risk_metrics_updated', riskMetrics);
        }
    }

    public getConnectionCount(): number {
        return this.io.engine.clientsCount || 0;
    }

    public getConnectedClients(): number {
        return this.connectedClients.size;
    }

    public isActive(): boolean {
        return this.isRunning;
    }

    public getURL(): string {
        return `http://${this.config.host}:${this.config.port}`;
    }
}

// =====================================================
// EXPORT DEFAULT SINGLETON INSTANCE
// =====================================================

export const dashboardInterface = new DashboardInterfaceSystem();
export default dashboardInterface;

/**
 * 🔥 REAL-TIME SOCKET.IO MANAGER 2025
 * Professional-grade real-time data streaming with <500ms latency
 */

import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { Logger } from '../logging/logger';

export interface RealTimeMetrics {
    timestamp: number;
    pnl: number;
    sharpe: number;
    drawdown: number;
    winRate: number;
    activeStrategies: string[];
    alerts: any[];
    performance: {
        latency: number;
        requestsPerSecond: number;
        errorRate: number;
    };
}

export interface StrategyUpdate {
    strategyName: string;
    status: 'active' | 'paused' | 'stopped';
    pnl: number;
    trades: number;
    winRate: number;
    signals: any[];
}

export class RealTimeSocketManager {
    private io: SocketServer;
    private logger: Logger;
    private connectedClients: Set<string> = new Set();
    private metricsInterval: NodeJS.Timeout | null = null;
    private lastMetrics: RealTimeMetrics | null = null;

    constructor(httpServer: HttpServer) {
        this.logger = new Logger('RealTimeSocket');
        
        // Initialize Socket.IO with optimized config
        this.io = new SocketServer(httpServer, {
            cors: {
                origin: ["http://localhost:3001", "http://localhost:3000"],
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling'],
            pingTimeout: 60000,
            pingInterval: 25000
        });

        this.setupEventHandlers();
        this.startMetricsStreaming();
        
        this.logger.info('🚀 Real-time Socket.IO manager initialized');
    }

    /**
     * 🎯 Setup Socket.IO event handlers
     */
    private setupEventHandlers(): void {
        this.io.on('connection', (socket: Socket) => {
            const clientId = socket.id;
            this.connectedClients.add(clientId);
            
            this.logger.info(`📱 Client connected: ${clientId} (Total: ${this.connectedClients.size})`);

            // Send initial data immediately
            this.sendInitialData(socket);

            // Handle client events
            socket.on('subscribe_metrics', () => {
                socket.join('metrics');
                this.logger.debug(`📊 Client ${clientId} subscribed to metrics`);
            });

            socket.on('subscribe_strategies', () => {
                socket.join('strategies');
                this.logger.debug(`⚡ Client ${clientId} subscribed to strategies`);
            });

            socket.on('subscribe_alerts', () => {
                socket.join('alerts');
                this.logger.debug(`🚨 Client ${clientId} subscribed to alerts`);
            });

            socket.on('strategy_toggle', (data: { strategyName: string; action: 'start' | 'stop' | 'pause' }) => {
                this.handleStrategyToggle(socket, data);
            });

            socket.on('disconnect', () => {
                this.connectedClients.delete(clientId);
                this.logger.info(`📱 Client disconnected: ${clientId} (Total: ${this.connectedClients.size})`);
            });

            socket.on('error', (error) => {
                this.logger.error(`❌ Socket error for ${clientId}:`, error);
            });
        });
    }

    /**
     * 📊 Start real-time metrics streaming (250ms intervals)
     */
    private startMetricsStreaming(): void {
        this.metricsInterval = setInterval(() => {
            this.streamMetrics();
        }, 250); // 4Hz streaming - professional standard

        this.logger.info('📊 Real-time metrics streaming started (4Hz)');
    }

    /**
     * 📈 Stream live metrics to connected clients
     */
    private streamMetrics(): void {
        const metrics: RealTimeMetrics = this.generateLiveMetrics();
        
        // Only emit if data changed (optimization)
        if (this.hasMetricsChanged(metrics)) {
            this.io.to('metrics').emit('metrics_update', metrics);
            this.lastMetrics = metrics;
        }
    }

    /**
     * ⚡ Generate live metrics (simulated - connect to real bot data)
     */
    private generateLiveMetrics(): RealTimeMetrics {
        const now = Date.now();
        
        return {
            timestamp: now,
            pnl: 12450.75 + (Math.random() - 0.5) * 1000,
            sharpe: 2.34 + (Math.random() - 0.5) * 0.2,
            drawdown: Math.random() * 5,
            winRate: 0.68 + (Math.random() - 0.5) * 0.1,
            activeStrategies: ['RSITurbo', 'SuperTrend', 'MLPredictor'],
            alerts: this.generateLiveAlerts(),
            performance: {
                latency: Math.random() * 200 + 50, // 50-250ms
                requestsPerSecond: Math.random() * 100 + 50,
                errorRate: Math.random() * 0.01
            }
        };
    }

    /**
     * 🚨 Generate live alerts
     */
    private generateLiveAlerts(): any[] {
        const alerts = [];
        
        // Drawdown alert
        if (Math.random() < 0.1) {
            alerts.push({
                id: `alert_${Date.now()}`,
                type: 'warning',
                severity: 'medium',
                message: 'Drawdown approaching 4.5% threshold',
                timestamp: Date.now(),
                strategy: 'Portfolio'
            });
        }

        // Strategy performance alert
        if (Math.random() < 0.05) {
            alerts.push({
                id: `alert_${Date.now()}_perf`,
                type: 'info',
                severity: 'low',
                message: 'RSITurbo strategy outperforming benchmark +15%',
                timestamp: Date.now(),
                strategy: 'RSITurbo'
            });
        }

        return alerts;
    }

    /**
     * 📤 Send initial data to newly connected client
     */
    private sendInitialData(socket: Socket): void {
        const initialData = {
            timestamp: Date.now(),
            status: 'connected',
            serverVersion: '2025.1.0',
            supportedFeatures: [
                'real_time_metrics',
                'strategy_control',
                'live_alerts',
                'ai_insights'
            ]
        };

        socket.emit('connection_established', initialData);
        
        // Send current metrics if available
        if (this.lastMetrics) {
            socket.emit('metrics_update', this.lastMetrics);
        }
    }

    /**
     * ⚡ Handle strategy toggle requests
     */
    private handleStrategyToggle(socket: Socket, data: { strategyName: string; action: string }): void {
        this.logger.info(`🎯 Strategy toggle request: ${data.strategyName} - ${data.action}`);
        
        // Simulate strategy control (connect to real strategy manager)
        const response = {
            strategyName: data.strategyName,
            action: data.action,
            success: true,
            timestamp: Date.now(),
            newStatus: data.action === 'start' ? 'active' : data.action === 'stop' ? 'stopped' : 'paused'
        };

        // Send response to requesting client
        socket.emit('strategy_toggle_response', response);
        
        // Broadcast strategy update to all clients
        this.io.to('strategies').emit('strategy_update', {
            strategyName: data.strategyName,
            status: response.newStatus,
            pnl: 1250.50 + Math.random() * 500,
            trades: Math.floor(Math.random() * 50 + 10),
            winRate: Math.random() * 0.3 + 0.6,
            signals: []
        });
    }

    /**
     * 🔍 Check if metrics changed significantly
     */
    private hasMetricsChanged(newMetrics: RealTimeMetrics): boolean {
        if (!this.lastMetrics) return true;
        
        const pnlDiff = Math.abs(newMetrics.pnl - this.lastMetrics.pnl);
        const sharpeDiff = Math.abs(newMetrics.sharpe - this.lastMetrics.sharpe);
        
        return pnlDiff > 10 || sharpeDiff > 0.01 || newMetrics.alerts.length > 0;
    }

    /**
     * 🎯 Emit alert to all subscribed clients
     */
    public emitAlert(alert: any): void {
        this.io.to('alerts').emit('new_alert', alert);
        this.logger.info(`🚨 Alert broadcasted: ${alert.message}`);
    }

    /**
     * 📊 Emit strategy update
     */
    public emitStrategyUpdate(update: StrategyUpdate): void {
        this.io.to('strategies').emit('strategy_update', update);
        this.logger.debug(`⚡ Strategy update broadcasted: ${update.strategyName}`);
    }

    /**
     * 🛑 Cleanup resources
     */
    public destroy(): void {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
        
        this.io.close();
        this.logger.info('🛑 Real-time Socket.IO manager destroyed');
    }

    /**
     * 📊 Get connection stats
     */
    public getStats(): { connectedClients: number; rooms: string[] } {
        return {
            connectedClients: this.connectedClients.size,
            rooms: ['metrics', 'strategies', 'alerts']
        };
    }
}

export default RealTimeSocketManager;

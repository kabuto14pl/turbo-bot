"use strict";
/**
 * 🔥 REAL-TIME SOCKET.IO MANAGER 2025
 * Professional-grade real-time data streaming with <500ms latency
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealTimeSocketManager = void 0;
const socket_io_1 = require("socket.io");
const logger_1 = require("../logging/logger");
class RealTimeSocketManager {
    constructor(httpServer) {
        this.connectedClients = new Set();
        this.metricsInterval = null;
        this.lastMetrics = null;
        this.logger = new logger_1.Logger('RealTimeSocket');
        // Initialize Socket.IO with optimized config
        this.io = new socket_io_1.Server(httpServer, {
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
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
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
            socket.on('strategy_toggle', (data) => {
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
    startMetricsStreaming() {
        this.metricsInterval = setInterval(() => {
            this.streamMetrics();
        }, 250); // 4Hz streaming - professional standard
        this.logger.info('📊 Real-time metrics streaming started (4Hz)');
    }
    /**
     * 📈 Stream live metrics to connected clients
     */
    streamMetrics() {
        const metrics = this.generateLiveMetrics();
        // Only emit if data changed (optimization)
        if (this.hasMetricsChanged(metrics)) {
            this.io.to('metrics').emit('metrics_update', metrics);
            this.lastMetrics = metrics;
        }
    }
    /**
     * ⚡ Generate live metrics (simulated - connect to real bot data)
     */
    generateLiveMetrics() {
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
    generateLiveAlerts() {
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
    sendInitialData(socket) {
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
    handleStrategyToggle(socket, data) {
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
    hasMetricsChanged(newMetrics) {
        if (!this.lastMetrics)
            return true;
        const pnlDiff = Math.abs(newMetrics.pnl - this.lastMetrics.pnl);
        const sharpeDiff = Math.abs(newMetrics.sharpe - this.lastMetrics.sharpe);
        return pnlDiff > 10 || sharpeDiff > 0.01 || newMetrics.alerts.length > 0;
    }
    /**
     * 🎯 Emit alert to all subscribed clients
     */
    emitAlert(alert) {
        this.io.to('alerts').emit('new_alert', alert);
        this.logger.info(`🚨 Alert broadcasted: ${alert.message}`);
    }
    /**
     * 📊 Emit strategy update
     */
    emitStrategyUpdate(update) {
        this.io.to('strategies').emit('strategy_update', update);
        this.logger.debug(`⚡ Strategy update broadcasted: ${update.strategyName}`);
    }
    /**
     * 🛑 Cleanup resources
     */
    destroy() {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
        this.io.close();
        this.logger.info('🛑 Real-time Socket.IO manager destroyed');
    }
    /**
     * 📊 Get connection stats
     */
    getStats() {
        return {
            connectedClients: this.connectedClients.size,
            rooms: ['metrics', 'strategies', 'alerts']
        };
    }
}
exports.RealTimeSocketManager = RealTimeSocketManager;
exports.default = RealTimeSocketManager;

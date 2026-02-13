'use strict';
/**
 * @module Server
 * @description Express HTTP server + WebSocket for dashboard.
 */
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');

class Server {
    /**
     * @param {object} config
     * @param {object} deps - {pm, rm, ml, monitoring, strategies, dataPipeline}
     */
    constructor(config, deps) {
        this.config = config;
        this.pm = deps.pm;
        this.rm = deps.rm;
        this.ml = deps.ml;
        this.mon = deps.monitoring;
        this.strategies = deps.strategies;
        this.dp = deps.dataPipeline;
        this.app = null;
        this.httpServer = null;
        this.wss = null;
        this.wsClients = new Set();
    }

    async start() {
        if (this.httpServer) return;
        this.app = express();
        this.app.use(cors({ origin: '*', credentials: true, methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
        this.app.use(express.json());
        this.app.use(express.static('.'));
        this._setupRoutes();
        this.httpServer = http.createServer(this.app);
        this._setupWebSocket();
        const port = this.config.healthCheckPort;
        this.httpServer.listen(port, '0.0.0.0', () => console.log('[SERVER] ??? Listening on port ' + port));
    }

    _setupRoutes() {
        const app = this.app;
        app.get('/dashboard', (req, res) => res.sendFile('dashboard.html', { root: '.' }));
        app.get('/', (req, res) => res.json({ service: 'Autonomous Trading Bot - MODULAR ENTERPRISE', version: this.mon.healthStatus.version, instance: this.config.instanceId, status: this.mon.healthStatus.status, uptime: this.mon.getUptime() }));
        app.get('/health', (req, res) => res.json(this.mon.getHealthStatus()));
        app.get('/health/ready', (req, res) => {
            const ready = this.mon.healthStatus.components.strategies && this.mon.healthStatus.components.monitoring && this.mon.healthStatus.components.portfolio;
            res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not ready', instance: this.config.instanceId, components: this.mon.healthStatus.components });
        });
        app.get('/health/live', (req, res) => {
            const live = (Date.now() - this.mon.healthStatus.lastUpdate) < 60000;
            res.status(live ? 200 : 503).json({ status: live ? 'live' : 'not live', instance: this.config.instanceId, uptime: this.mon.getUptime() });
        });
        app.get('/metrics', (req, res) => { res.set('Content-Type', 'text/plain'); res.send(this.mon.generatePrometheusMetrics(this.pm, this.rm)); });
        app.get('/api/portfolio', (req, res) => res.json({ ...this.pm.getPortfolio(), balance: this.pm.getBalance(), instance: this.config.instanceId, timestamp: Date.now() }));
        app.get('/api/signals', (req, res) => {
            const sigs = this.strategies ? Array.from(this.strategies.getLastSignals().values()) : [];
            res.json({ signals: sigs, instance: this.config.instanceId, count: sigs.length });
        });
        app.get('/api/trades', (req, res) => {
            const limit = parseInt(req.query.limit) || 50;
            const trades = this.pm.getTrades().slice(-limit);
            res.json({ trades, total: this.pm.getTrades().length, instance: this.config.instanceId });
        });
        app.get('/api/status', (req, res) => res.json({
            config: this.config, health: this.mon.getHealthStatus(),
            trading: { isRunning: true, strategiesCount: this.strategies ? this.strategies.getStrategies().size : 0 },
            performance: this.pm.getPortfolio(), circuitBreaker: this.rm.getCircuitBreakerStatus(),
        }));
        app.get('/api/circuit-breaker', (req, res) => res.json({ ...this.rm.getCircuitBreakerStatus(), instance: this.config.instanceId }));
        app.post('/api/circuit-breaker/reset', (req, res) => {
            const prev = this.rm.getCircuitBreakerStatus();
            this.rm.resetCircuitBreaker();
            res.json({ success: true, previousStatus: prev, currentStatus: this.rm.getCircuitBreakerStatus() });
        });
        app.get('/api/positions', (req, res) => {
            const positions = [];
            for (const [sym, pos] of this.pm.getPositions()) positions.push({ ...pos, symbol: sym });
            res.json({ positions, count: positions.length });
        });
        app.get('/api/ml/status', (req, res) => {
            if (this.ml) res.json({ enabled: true, phase: this.ml.mlLearningPhase, trades: this.ml.mlTradingCount, threshold: this.ml.mlConfidenceThreshold, performance: this.ml.mlPerformance });
            else res.json({ enabled: false });
        });
    }

    _setupWebSocket() {
        this.wss = new WebSocketServer({ server: this.httpServer, path: '/ws' });
        this.wss.on('connection', (ws) => {
            this.wsClients.add(ws);
            ws.send(JSON.stringify({ type: 'connected', instance: this.config.instanceId, timestamp: Date.now() }));
            ws.on('close', () => this.wsClients.delete(ws));
            ws.on('error', () => this.wsClients.delete(ws));
        });
    }

    broadcast(type, data) {
        const msg = JSON.stringify({ type, data, timestamp: Date.now() });
        for (const ws of this.wsClients) {
            try { if (ws.readyState === 1) ws.send(msg); } catch(e) { this.wsClients.delete(ws); }
        }
    }

    broadcastPortfolioUpdate() { this.broadcast('portfolio_update', this.pm.getPortfolio()); }
    broadcastHealthUpdate() { this.broadcast('health_update', this.mon.getHealthStatus()); }
    broadcastAlert(message, level) { this.broadcast('alert', { message, level }); }
}

module.exports = { Server };

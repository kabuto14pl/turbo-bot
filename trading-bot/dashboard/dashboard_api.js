"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardAPI = void 0;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
// Try to require express-rate-limit at runtime. If unavailable, fall back to a no-op limiter.
let createRateLimit = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    createRateLimit = require('express-rate-limit');
}
catch (e) {
    // no-op
}
// Lightweight fallback logger so this file is self-contained.
class SimpleLogger {
    constructor(tag = 'DashboardAPI') { this.tag = tag; }
    info(...args) { console.info(`[${this.tag}]`, ...args); }
    warn(...args) { console.warn(`[${this.tag}]`, ...args); }
    error(...args) { console.error(`[${this.tag}]`, ...args); }
    debug(...args) { if (process.env.DEBUG)
        console.debug(`[${this.tag}]`, ...args); }
}
// This class is intentionally generic about dashboardManager and wsServer (typed as any)
// so it can be integrated with existing project-specific implementations without
// causing type-resolution errors while we fix/restore other files.
class DashboardAPI {
    constructor(dashboardManager, wsServer, config = {}) {
        this.server = null;
        this.dashboardManager = dashboardManager;
        this.wsServer = wsServer;
        this.logger = new SimpleLogger('DashboardAPI');
        this.config = {
            port: config.port ?? 3001,
            corsOrigins: config.corsOrigins ?? ['http://localhost:3000'],
            rateLimitWindowMs: config.rateLimitWindowMs ?? 15 * 60 * 1000,
            rateLimitMaxRequests: config.rateLimitMaxRequests ?? 100,
            enableSecurity: config.enableSecurity ?? true,
            apiPrefix: config.apiPrefix ?? '/api/v1'
        };
        this.app = (0, express_1.default)();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    setupMiddleware() {
        if (this.config.enableSecurity) {
            this.app.use((0, helmet_1.default)());
        }
        this.app.use((0, cors_1.default)({ origin: this.config.corsOrigins }));
        if (createRateLimit) {
            this.app.use(createRateLimit({
                windowMs: this.config.rateLimitWindowMs,
                max: this.config.rateLimitMaxRequests
            }));
        }
        else {
            // no-op limiter
            this.app.use((req, res, next) => next());
        }
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true }));
        this.app.use((req, res, next) => {
            this.logger.debug(`${req.method} ${req.originalUrl} ${req.ip}`);
            next();
        });
    }
    setupRoutes() {
        const router = express_1.default.Router();
        router.get('/health', this.handleHealthCheck.bind(this));
        router.get('/status', this.handleStatus.bind(this));
        // Minimal CRUD for layouts (delegates to dashboardManager if available)
        router.get('/layouts', async (req, res) => {
            try {
                const layouts = this.dashboardManager?.getLayouts ? await this.dashboardManager.getLayouts() : [];
                res.json({ layouts, count: layouts.length });
            }
            catch (err) {
                this.handleError(res, err);
            }
        });
        router.get('/layouts/:id', async (req, res) => {
            try {
                const layout = this.dashboardManager?.getLayout ? await this.dashboardManager.getLayout(req.params.id) : null;
                if (!layout)
                    return res.status(404).json({ error: 'Layout not found' });
                res.json(layout);
            }
            catch (err) {
                this.handleError(res, err);
            }
        });
        router.post('/layouts', async (req, res) => {
            try {
                const created = this.dashboardManager?.createLayout ? await this.dashboardManager.createLayout(req.body) : req.body;
                res.status(201).json(created);
            }
            catch (err) {
                this.handleError(res, err);
            }
        });
        // WebSocket info
        router.get('/websocket/stats', async (req, res) => {
            try {
                const stats = this.wsServer?.getStatistics ? await this.wsServer.getStatistics() : { clients: 0 };
                res.json(stats);
            }
            catch (err) {
                this.handleError(res, err);
            }
        });
        this.app.use(this.config.apiPrefix, router);
        // static (optional) - serve dashboard public folder if present
        this.app.use(express_1.default.static('dashboard/public'));
    }
    setupErrorHandling() {
        // 404
        this.app.use('*', (req, res) => {
            res.status(404).json({ error: 'Not Found', path: req.originalUrl });
        });
        // generic error handler
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        this.app.use((err, req, res, _next) => {
            this.logger.error('API error', err?.message ?? err);
            res.status(500).json({ error: 'Internal Server Error', message: err?.message ?? String(err) });
        });
    }
    handleError(res, error) {
        this.logger.error(error.message);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
    async handleHealthCheck(req, res) {
        res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
    }
    async handleStatus(req, res) {
        try {
            const ws = this.wsServer?.getStatistics ? await this.wsServer.getStatistics() : { clients: 0 };
            const dm = this.dashboardManager?.getStatistics ? await this.dashboardManager.getStatistics() : {};
            res.json({ api: { port: this.config.port }, websocket: ws, dashboard: dm, timestamp: new Date().toISOString() });
        }
        catch (err) {
            this.handleError(res, err);
        }
    }
    async start() {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.config.port, () => {
                    this.logger.info(`Dashboard API listening on ${this.config.port}`);
                    resolve();
                });
                this.server.on('error', (err) => { this.logger.error('Server error', err); reject(err); });
            }
            catch (err) {
                reject(err);
            }
        });
    }
    async stop() {
        return new Promise((resolve) => {
            if (!this.server)
                return resolve();
            this.server.close(() => { this.logger.info('Server stopped'); resolve(); });
        });
    }
    getApp() { return this.app; }
}
exports.DashboardAPI = DashboardAPI;
exports.default = DashboardAPI;

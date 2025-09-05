import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Try to require express-rate-limit at runtime. If unavailable, fall back to a no-op limiter.
let createRateLimit: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  createRateLimit = require('express-rate-limit');
} catch (e) {
  // no-op
}

// Lightweight fallback logger so this file is self-contained.
class SimpleLogger {
  private tag: string;
  constructor(tag = 'DashboardAPI') { this.tag = tag; }
  info(...args: any[]) { console.info(`[${this.tag}]`, ...args); }
  warn(...args: any[]) { console.warn(`[${this.tag}]`, ...args); }
  error(...args: any[]) { console.error(`[${this.tag}]`, ...args); }
  debug(...args: any[]) { if (process.env.DEBUG) console.debug(`[${this.tag}]`, ...args); }
}

export interface DashboardAPIConfig {
  port?: number;
  corsOrigins?: string[];
  rateLimitWindowMs?: number;
  rateLimitMaxRequests?: number;
  enableSecurity?: boolean;
  apiPrefix?: string;
}

// This class is intentionally generic about dashboardManager and wsServer (typed as any)
// so it can be integrated with existing project-specific implementations without
// causing type-resolution errors while we fix/restore other files.
export class DashboardAPI {
  private app: express.Application;
  private logger: SimpleLogger;
  private dashboardManager: any;
  private wsServer: any;
  private config: Required<DashboardAPIConfig>;
  private server: any = null;

  constructor(dashboardManager: any, wsServer: any, config: DashboardAPIConfig = {}) {
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

    this.app = express();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware() {
    if (this.config.enableSecurity) {
      this.app.use(helmet());
    }

    this.app.use(cors({ origin: this.config.corsOrigins }));

    if (createRateLimit) {
      this.app.use(createRateLimit({
        windowMs: this.config.rateLimitWindowMs,
        max: this.config.rateLimitMaxRequests
      }));
    } else {
      // no-op limiter
      this.app.use((req: Request, res: Response, next: NextFunction) => next());
    }

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      this.logger.debug(`${req.method} ${req.originalUrl} ${req.ip}`);
      next();
    });
  }

  private setupRoutes() {
    const router = express.Router();

    router.get('/health', this.handleHealthCheck.bind(this));
    router.get('/status', this.handleStatus.bind(this));

    // Minimal CRUD for layouts (delegates to dashboardManager if available)
    router.get('/layouts', async (req: Request, res: Response) => {
      try {
        const layouts = this.dashboardManager?.getLayouts ? await this.dashboardManager.getLayouts() : [];
        res.json({ layouts, count: layouts.length });
      } catch (err) {
        this.handleError(res, err as Error);
      }
    });

    router.get('/layouts/:id', async (req: Request, res: Response) => {
      try {
        const layout = this.dashboardManager?.getLayout ? await this.dashboardManager.getLayout(req.params.id) : null;
        if (!layout) return res.status(404).json({ error: 'Layout not found' });
        res.json(layout);
      } catch (err) { this.handleError(res, err as Error); }
    });

    router.post('/layouts', async (req: Request, res: Response) => {
      try {
        const created = this.dashboardManager?.createLayout ? await this.dashboardManager.createLayout(req.body) : req.body;
        res.status(201).json(created);
      } catch (err) { this.handleError(res, err as Error); }
    });

    // WebSocket info
    router.get('/websocket/stats', async (req: Request, res: Response) => {
      try {
        const stats = this.wsServer?.getStatistics ? await this.wsServer.getStatistics() : { clients: 0 };
        res.json(stats);
      } catch (err) { this.handleError(res, err as Error); }
    });

    this.app.use(this.config.apiPrefix, router);

    // static (optional) - serve dashboard public folder if present
    this.app.use(express.static('dashboard/public'));
  }

  private setupErrorHandling() {
    // 404
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({ error: 'Not Found', path: req.originalUrl });
    });

    // generic error handler
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this.app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      this.logger.error('API error', err?.message ?? err);
      res.status(500).json({ error: 'Internal Server Error', message: err?.message ?? String(err) });
    });
  }

  private handleError(res: Response, error: Error) {
    this.logger.error(error.message);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }

  private async handleHealthCheck(req: Request, res: Response) {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  }

  private async handleStatus(req: Request, res: Response) {
    try {
      const ws = this.wsServer?.getStatistics ? await this.wsServer.getStatistics() : { clients: 0 };
      const dm = this.dashboardManager?.getStatistics ? await this.dashboardManager.getStatistics() : {};
      res.json({ api: { port: this.config.port }, websocket: ws, dashboard: dm, timestamp: new Date().toISOString() });
    } catch (err) { this.handleError(res, err as Error); }
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, () => {
          this.logger.info(`Dashboard API listening on ${this.config.port}`);
          resolve();
        });
        this.server.on('error', (err: Error) => { this.logger.error('Server error', err); reject(err); });
      } catch (err) { reject(err); }
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) return resolve();
      this.server.close(() => { this.logger.info('Server stopped'); resolve(); });
    });
  }

  public getApp() { return this.app; }
}

export default DashboardAPI;

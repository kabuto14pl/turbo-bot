/**
 * 🚀 [PRODUCTION-API]
 * Production API component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🚀 APPLICATION BOOTSTRAP
 * Simple bootstrap for starting trading bot components
 */

import { DependencyContainer } from '../container/dependency_container';
import { Logger } from '../../infrastructure/logging/logger';
import express from 'express';
import cors from 'cors';

export class ApplicationBootstrap {
  private app: express.Application;
  private logger: Logger;
  private server?: any;
  private config: any;

  constructor(private container: DependencyContainer) {
    this.logger = this.container.resolve<Logger>('logger');
    this.config = this.container.resolve('config');
    this.app = express();
    this.setupExpress();
  }

  async initialize(): Promise<void> {
    this.logger.info('🚀 Initializing application bootstrap...');
    
    // Register bootstrap in container
    this.container.register('bootstrap', this);
    
    // Validate configuration
    if (this.config.validate) {
      const configValidation = this.config.validate();
      if (!configValidation.valid) {
        throw new Error(`Configuration validation failed: ${configValidation.errors.join(', ')}`);
      }
    }
    
    this.logger.info('✅ Application bootstrap initialized');
  }

  /**
   * Start all application services
   */
  async start(): Promise<void> {
    this.logger.info('🚀 Starting application services...');

    const appConfig = this.config.getConfig ? this.config.getConfig() : this.config;
    
    // Start HTTP server
    await this.startServer();
    
    // Log startup information
    this.logStartupInfo();
    
    this.logger.info('✅ All application services started');
  }

  /**
   * Stop all application services
   */
  async stop(): Promise<void> {
    this.logger.info('🛑 Stopping application services...');

    // Stop HTTP server
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          this.logger.info('🛑 Server stopped');
          resolve(undefined);
        });
      });
    }
  }

  /**
   * Setup Express application
   */
  private setupExpress(): void {
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // CORS middleware
    this.app.use(cors({
      origin: true,
      credentials: true
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      });
      
      next();
    });

    this.logger.info('🔧 Express middleware configured');
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid
      });
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      res.json({
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid
      });
    });

    // API status endpoint
    this.app.get('/api/status', (req, res) => {
      res.json({
        name: 'Trading Bot Enterprise',
        version: '4.0.4',
        status: 'running',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
        endpoints: [
          '/health',
          '/metrics',
          '/api/status',
          '/api/performance'
        ]
      });
    });

    // Performance endpoint
    this.app.get('/api/performance', (req, res) => {
      const memUsage = process.memoryUsage();
      
      res.json({
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`
        },
        cpu: {
          usage: process.cpuUsage()
        }
      });
    });

    // Cache stats endpoint
    this.app.get('/api/cache/stats', async (req, res) => {
      res.json({
        timestamp: new Date().toISOString(),
        cache: {
          status: 'not_implemented',
          message: 'Cache statistics not available'
        }
      });
    });

    // Configuration endpoint
    this.app.get('/api/config', (req, res) => {
      const safeConfig = {
        environment: process.env.NODE_ENV || 'development',
        version: '4.0.4',
        features: {
          trading: true,
          monitoring: true,
          metrics: true
        }
      };
      
      res.json({
        timestamp: new Date().toISOString(),
        config: safeConfig
      });
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Trading Bot Enterprise',
        version: '4.0.4',
        status: 'running',
        endpoints: ['/health', '/metrics', '/api/status', '/api/performance']
      });
    });

    this.logger.info('🛠️ Express routes configured');
  }

  /**
   * Start HTTP server
   */
  private async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const port = this.config.port || 3000;
      const host = this.config.host || '0.0.0.0';

      this.server = this.app.listen(port, host, () => {
        this.logger.info(`🚀 Trading Bot started on http://${host}:${port}`);
        resolve();
      });

      this.server.on('error', (error: any) => {
        this.logger.error('❌ Server startup error:', error);
        reject(error);
      });
    });
  }

  /**
   * Log startup information
   */
  private logStartupInfo(): void {
    const config = this.config.getConfig ? this.config.getConfig() : this.config;
    
    this.logger.info('📊 Application Information:');
    this.logger.info(`  • Environment: ${config.environment || 'development'}`);
    this.logger.info(`  • Port: ${config.port || 3000}`);
    this.logger.info(`  • Host: ${config.host || '0.0.0.0'}`);
    this.logger.info(`  • PID: ${process.pid}`);
    this.logger.info(`  • Node Version: ${process.version}`);
    
    if (config.isCodespace) {
      this.logger.info('☁️ Running in GitHub Codespace');
    }
  }

  /**
   * Get Express application instance
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * Get server instance
   */
  getServer(): any {
    return this.server;
  }
}

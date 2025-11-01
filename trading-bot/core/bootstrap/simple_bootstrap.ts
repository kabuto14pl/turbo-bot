/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
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

export class ApplicationBootstrap {
  private app: express.Application;
  private logger: Logger;
  private server?: any;

  constructor(private container: DependencyContainer) {
    this.logger = this.container.resolve<Logger>('logger');
    this.app = express();
    this.setupExpress();
  }

  async initialize(): Promise<void> {
    this.logger.info('🚀 Initializing application bootstrap...');
    
    // Register bootstrap in container
    this.container.register('bootstrap', this);
    
    this.logger.info('✅ Application bootstrap initialized');
  }

  async start(): Promise<void> {
    const configManager = this.container.resolve<any>('config');
    const config = configManager.getConfig();
    
    this.server = this.app.listen(config.port, config.host, () => {
      this.logger.info(`🚀 Trading Bot started on http://${config.host}:${config.port}`);
      this.logger.info(`🌍 Environment: ${config.environment}`);
      
      if (config.isCodespace) {
        this.logger.info('☁️ Running in GitHub Codespace');
      }
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          this.logger.info('🛑 Server stopped');
          resolve(undefined);
        });
      });
    }
  }

  private setupExpress(): void {
    // Basic middleware
    this.app.use(express.json());
    
    // Health endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '4.0.4'
      });
    });

    // Metrics endpoint (placeholder)
    this.app.get('/metrics', (req, res) => {
      const cacheMetrics = this.container.has('cacheService') 
        ? this.container.resolve<any>('cacheService').getMetrics()
        : { hits: 0, misses: 0, hitRate: 0 };
        
      res.json({
        cache: cacheMetrics,
        timestamp: new Date().toISOString()
      });
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Trading Bot Enterprise',
        version: '4.0.4',
        status: 'running',
        endpoints: ['/health', '/metrics']
      });
    });
  }
}

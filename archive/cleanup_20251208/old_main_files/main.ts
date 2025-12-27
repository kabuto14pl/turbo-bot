/**
 * 🚀 [PRODUCTION-API]
 * Production API component
 */

/**
 * 🚀 [PRODUCTION-API]
 * This is the production API server for the trading bot.
 * Provides health checks, metrics, and monitoring endpoints.
 * 
 * Turbo Trading Bot - Main API Server Entry Point (Express API - 193 lines)
 * Optimized for GitHub Codespaces and production deployment
 */

import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { register } from 'prom-client';
import consola from 'consola';

// Load environment variables
dotenv.config();

// Configuration
const config = {
  port: parseInt(process.env.API_PORT || '3000'),
  host: process.env.API_HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  isCodespace: process.env.CODESPACE === 'true',
  botName: process.env.BOT_NAME || 'TurboBot',
};

class TurboBotServer {
  private app: express.Application;
  
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security
    this.app.use(helmet());
    
    // CORS - Allow Codespace URLs
    this.app.use(cors({
      origin: config.isCodespace ? true : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    }));
    
    // Compression
    this.app.use(compression());
    
    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
        version: process.env.npm_package_version || '2.0.0',
        bot: config.botName,
        codespace: config.isCodespace
      });
    });

    // Metrics endpoint for Prometheus
    this.app.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
      } catch (error) {
        res.status(500).end(error);
      }
    });

    // API Info
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Turbo Trading Bot API',
        version: '2.0.0',
        description: 'Advanced autonomous trading bot with ML capabilities',
        endpoints: {
          health: '/health',
          metrics: '/metrics',
          api: '/api',
          trading: '/api/trading',
          portfolio: '/api/portfolio',
          strategies: '/api/strategies'
        },
        documentation: '/docs'
      });
    });

    // Trading endpoints placeholder
    this.app.get('/api/trading/status', (req, res) => {
      res.json({
        status: 'active',
        strategies: ['ML_Enhanced', 'Risk_Managed', 'Momentum'],
        positions: 0,
        pnl: 0,
        lastUpdate: new Date().toISOString()
      });
    });

    // Portfolio endpoint placeholder
    this.app.get('/api/portfolio', (req, res) => {
      res.json({
        totalValue: 10000,
        availableBalance: 8500,
        positions: [],
        performance: {
          daily: 0,
          weekly: 0,
          monthly: 0,
          total: 0
        }
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        availableRoutes: ['/health', '/metrics', '/api']
      });
    });

    // Error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      consola.error('API Error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: config.nodeEnv === 'development' ? error.message : 'Something went wrong'
      });
    });
  }

  public async start(): Promise<void> {
    try {
      // Start server
      this.app.listen(config.port, config.host, () => {
        consola.success(`🚀 Turbo Trading Bot started successfully!`);
        consola.info(`📡 Server running on http://${config.host}:${config.port}`);
        consola.info(`🌍 Environment: ${config.nodeEnv}`);
        
        if (config.isCodespace) {
          consola.info(`☁️  Running in GitHub Codespace`);
          consola.info(`🔗 Access your bot at the forwarded port ${config.port}`);
        }
        
        consola.info(`📊 Health check: http://${config.host}:${config.port}/health`);
        consola.info(`📈 Metrics: http://${config.host}:${config.port}/metrics`);
        consola.info(`🤖 Bot: ${config.botName} v2.0.0`);
      });

      // Graceful shutdown
      process.on('SIGTERM', this.shutdown.bind(this));
      process.on('SIGINT', this.shutdown.bind(this));
      
    } catch (error) {
      consola.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    consola.info('🛑 Shutting down Turbo Trading Bot...');
    
    // Add cleanup logic here
    // - Close database connections
    // - Save state
    // - Stop trading activities
    
    consola.success('✅ Shutdown complete');
    process.exit(0);
  }
}

// Start the bot
if (require.main === module) {
  const bot = new TurboBotServer();
  bot.start().catch(error => {
    consola.error('Startup failed:', error);
    process.exit(1);
  });
}

export default TurboBotServer;

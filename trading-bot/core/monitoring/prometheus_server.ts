/**
 * 🚀 [PRODUCTION-OPERATIONAL]
 * Production monitoring component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🚀 PROMETHEUS METRICS SERVER
 * 
 * HTTP server do eksportu metryk dla Prometheus
 */

import express from 'express';
import { getMetrics, allMetrics } from '../monitoring/trading_bot_metrics';

export class PrometheusMetricsServer {
  private app: express.Application;
  private server: any;
  private port: number;

  constructor(port: number = 9090) {
    this.port = port;
    this.app = express();
    this.setupRoutes();
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // Prometheus metrics endpoint
    this.app.get('/metrics', (req, res) => {
      try {
        res.set('Content-Type', 'text/plain');
        res.end(getMetrics());
      } catch (error) {
        console.error('❌ Error serving metrics:', error);
        res.status(500).send('Error serving metrics');
      }
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    });

    // Metrics summary endpoint
    this.app.get('/metrics/summary', (req, res) => {
      try {
        const summary = {
          trading: {
            portfolio_value: 0, // Będzie zaktualizowane z rzeczywistych danych
            total_pnl: 0,
            win_rate: 0,
            total_trades: 0
          },
          system: {
            active_pairs: 0,
            websocket_connections: 0,
            kafka_messages_rate: 0
          },
          health: {
            components_healthy: 0,
            total_components: 8
          }
        };
        
        res.json(summary);
      } catch (error) {
        console.error('❌ Error serving metrics summary:', error);
        res.status(500).json({ error: 'Error serving metrics summary' });
      }
    });
  }

  /**
   * Start the metrics server
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`🚀 Prometheus metrics server running on port ${this.port}`);
          console.log(`📊 Metrics endpoint: http://localhost:${this.port}/metrics`);
          console.log(`🏥 Health endpoint: http://localhost:${this.port}/health`);
          resolve();
        });

        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.log(`⚠️ Port ${this.port} is in use, trying ${this.port + 1}`);
            this.port = this.port + 1;
            this.start().then(resolve).catch(reject);
          } else {
            reject(error);
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the metrics server
   */
  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 Prometheus metrics server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get server port
   */
  public getPort(): number {
    return this.port;
  }
}

export default PrometheusMetricsServer;

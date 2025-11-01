/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
import express from 'express';
import cors from 'cors';
import { Server } from 'http';
import { WebSocketServer } from 'ws';
import { Logger } from '../logging/logger';

export interface DashboardAPIServerConfig {
  port: number;
  corsOrigin?: string[];
}

export class DashboardAPIServer {
  private app: express.Application;
  private server: Server | null = null;
  private wss: WebSocketServer | null = null;
  private port: number;
  private logger: Logger;

  constructor(config: DashboardAPIServerConfig, logger: Logger) {
    this.port = config.port;
    this.logger = logger;
    this.app = express();
    
    this.setupMiddleware(config.corsOrigin);
    this.setupRoutes();
  }

  private setupMiddleware(corsOrigin?: string[]): void {
    // CORS
    this.app.use(cors({
      origin: corsOrigin || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
      credentials: true
    }));

    // JSON parsing
    this.app.use(express.json());

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`📡 API ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Portfolio endpoints
    this.app.get('/api/portfolio', (req, res) => {
      const portfolioData = {
        totalValue: 11250.50,
        cash: 8750.50,
        positions: [
          { symbol: 'BTCUSDT', size: 0.057, value: 2500, pnl: 125.80 }
        ],
        totalPnL: 1250.50,
        unrealizedPnL: 125.80,
        assets: ['BTC', 'USDT'],
        timestamp: new Date().toISOString()
      };
      
      res.json(portfolioData);
    });

    this.app.get('/api/portfolio/history', (req, res) => {
      const timeframe = req.query.timeframe || '1d';
      const mockHistory = this.generateMockPortfolioHistory(timeframe as string);
      res.json(mockHistory);
    });

    // Trading endpoints
    this.app.get('/api/trades', (req, res) => {
      const limit = parseInt(req.query.limit as string) || 50;
      
      const mockTrades = [
        {
          id: 1,
          symbol: 'BTCUSDT',
          side: 'buy',
          amount: 0.025,
          price: 43200,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          strategy: 'Enhanced RSI Turbo',
          pnl: 125.50
        },
        {
          id: 2,
          symbol: 'ETHUSDT',
          side: 'sell',
          amount: 1.5,
          price: 2890,
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          strategy: 'MACD Crossover',
          pnl: -45.20
        }
      ];

      res.json(mockTrades.slice(0, limit));
    });

    this.app.get('/api/trades/history', (req, res) => {
      const { symbol, strategy } = req.query;
      
      let trades = [
        { id: 1, symbol: 'BTCUSDT', strategy: 'Enhanced RSI Turbo', pnl: 125.50 },
        { id: 2, symbol: 'ETHUSDT', strategy: 'MACD Crossover', pnl: -45.20 },
        { id: 3, symbol: 'BTCUSDT', strategy: 'Enhanced RSI Turbo', pnl: 89.30 }
      ];
      
      if (symbol) {
        trades = trades.filter(trade => trade.symbol === symbol);
      }
      
      if (strategy) {
        trades = trades.filter(trade => trade.strategy === strategy);
      }

      res.json(trades);
    });

    // Strategy endpoints
    this.app.get('/api/strategies', (req, res) => {
      const strategies = [
        {
          id: 'enhanced-rsi-turbo',
          name: 'Enhanced RSI Turbo',
          status: 'active',
          performance: {
            totalTrades: 156,
            winRate: 68.5,
            totalPnL: 1250.80
          }
        },
        {
          id: 'macd-crossover',
          name: 'MACD Crossover',
          status: 'paused',
          performance: {
            totalTrades: 89,
            winRate: 61.2,
            totalPnL: 890.45
          }
        }
      ];

      res.json(strategies);
    });

    // System status
    this.app.get('/api/system/status', (req, res) => {
      const status = {
        status: 'running',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        apiLatency: Math.round(Math.random() * 50),
        botState: 'active',
        portfolio: 'connected'
      };

      res.json(status);
    });

    // Market data
    this.app.get('/api/market/data', (req, res) => {
      const symbols = req.query.symbols as string[] || ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'];
      
      const marketData = symbols.map(symbol => ({
        symbol,
        price: 43500 + Math.random() * 1000,
        change24h: (Math.random() - 0.5) * 10,
        volume24h: Math.random() * 1000000,
        timestamp: new Date().toISOString()
      }));

      res.json(marketData);
    });

    // Alerts
    this.app.get('/api/alerts', (req, res) => {
      const limit = parseInt(req.query.limit as string) || 10;
      
      const mockAlerts = [
        {
          id: 1,
          type: 'price',
          message: 'BTC price above $45,000',
          severity: 'info',
          timestamp: new Date().toISOString()
        },
        {
          id: 2,
          type: 'system',
          message: 'Strategy performance warning',
          severity: 'warning',
          timestamp: new Date(Date.now() - 1800000).toISOString()
        }
      ];

      res.json(mockAlerts.slice(0, limit));
    });

    // Root endpoint
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Trading Bot Dashboard API',
        version: '2.0.0',
        endpoints: [
          '/api/health',
          '/api/portfolio',
          '/api/portfolio/history',
          '/api/trades',
          '/api/strategies',
          '/api/system/status',
          '/api/market/data',
          '/api/alerts'
        ]
      });
    });
  }

  private generateMockPortfolioHistory(timeframe: string): any[] {
    const periods = timeframe === '1h' ? 24 : timeframe === '1d' ? 30 : 12;
    const baseValue = 10000;
    const history = [];

    for (let i = 0; i < periods; i++) {
      const variance = (Math.random() - 0.5) * 2000;
      const value = baseValue + variance + (i * 100);
      
      history.push({
        timestamp: new Date(Date.now() - (periods - i) * 3600000).toISOString(),
        value: Math.max(8000, value),
        pnl: value - baseValue
      });
    }

    return history;
  }

  private setupWebSocket(): void {
    if (!this.server) return;

    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on('connection', (ws) => {
      console.log('🔌 Dashboard WebSocket connected');
      
      // Send initial data
      const initialData = {
        type: 'portfolio',
        payload: {
          totalValue: 11250.50,
          cash: 8750.50,
          totalPnL: 1250.50
        },
        timestamp: new Date().toISOString()
      };

      ws.send(JSON.stringify(initialData));

      // Send periodic updates
      const interval = setInterval(() => {
        if (ws.readyState === 1) { // WebSocket.OPEN
          const update = {
            type: 'priceUpdate',
            payload: {
              BTCUSDT: 43500 + (Math.random() - 0.5) * 1000,
              ETHUSDT: 2890 + (Math.random() - 0.5) * 200
            },
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(update));
        }
      }, 5000);

      ws.on('close', () => {
        console.log('🔌 Dashboard WebSocket disconnected');
        clearInterval(interval);
      });

      ws.on('error', (error) => {
        this.logger.error('WebSocket error:', error);
        clearInterval(interval);
      });
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`🌐 Dashboard API Server started on port ${this.port}`);
          console.log(`📡 API endpoints available at http://localhost:${this.port}/api`);
          console.log(`🔌 WebSocket available at ws://localhost:${this.port}`);
          
          this.setupWebSocket();
          resolve();
        });

        this.server.on('error', (error) => {
          this.logger.error('API Server error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close();
        this.wss = null;
      }

      if (this.server) {
        this.server.close(() => {
          console.log('🌐 Dashboard API Server stopped');
          resolve();
        });
        this.server = null;
      } else {
        resolve();
      }
    });
  }
}

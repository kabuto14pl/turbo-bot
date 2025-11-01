/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { createServer } from 'http';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
let mockPortfolio = {
  totalValue: 125847.32,
  dailyPnL: 2847.12,
  dailyPnLPercent: 2.31,
  positions: [
    { symbol: 'BTC/USDT', amount: 2.5, value: 112500, pnl: 2500 },
    { symbol: 'ETH/USDT', amount: 15.0, value: 42000, pnl: 750 },
    { symbol: 'BNB/USDT', amount: 100.0, value: 45000, pnl: -403 }
  ],
  availableBalance: 15432.18,
  lastUpdate: new Date()
};

let mockTrades = [
  {
    id: '1',
    symbol: 'BTC/USDT',
    side: 'buy',
    amount: 0.5,
    price: 45000,
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    strategy: 'RSI Pro Strategy',
    pnl: 125.50,
    status: 'completed'
  },
  {
    id: '2',
    symbol: 'ETH/USDT',
    side: 'sell',
    amount: 2.0,
    price: 2800,
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
    strategy: 'MACD Dynamic',
    pnl: -45.20,
    status: 'completed'
  }
];

let mockStrategies = [
  {
    id: 'rsi-pro',
    name: 'RSI Pro Strategy',
    status: 'active',
    performance: 15.2,
    totalTrades: 28,
    winRate: 72.5,
    symbol: 'BTC/USDT',
    params: { rsiPeriod: 14, oversold: 30, overbought: 70 }
  },
  {
    id: 'macd-dynamic',
    name: 'MACD Dynamic',
    status: 'active',
    performance: 12.8,
    totalTrades: 22,
    winRate: 68.2,
    symbol: 'ETH/USDT',
    params: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }
  },
  {
    id: 'momentum-plus',
    name: 'Momentum Plus',
    status: 'paused',
    performance: 8.9,
    totalTrades: 35,
    winRate: 60.0,
    symbol: 'BNB/USDT',
    params: { period: 20, threshold: 0.02 }
  }
];

let mockSystemStatus = {
  status: 'online',
  uptime: '99.8%',
  latency: 12,
  ordersPerHour: 847,
  activePairs: 12,
  connectedExchanges: ['Binance', 'Coinbase'],
  lastUpdate: new Date()
};

interface PriceData {
  price: number;
  change24h: number;
  volume24h: number;
  timestamp: number;
}

let mockPrices: Record<string, PriceData> = {
  'BTC/USDT': { price: 45123.45, change24h: 1234.56, volume24h: 25000000, timestamp: Date.now() },
  'ETH/USDT': { price: 2834.67, change24h: -45.23, volume24h: 15000000, timestamp: Date.now() },
  'BNB/USDT': { price: 456.78, change24h: 12.34, volume24h: 8000000, timestamp: Date.now() }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Portfolio endpoints
app.get('/api/portfolio', (req, res) => {
  res.json(mockPortfolio);
});

app.get('/api/portfolio/history', (req, res) => {
  const { timeframe = '1d' } = req.query;
  // Generate mock historical data
  const history = Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000),
    value: mockPortfolio.totalValue + (Math.random() - 0.5) * 5000
  }));
  res.json(history);
});

// Trading endpoints
app.get('/api/trades', (req, res) => {
  const { limit = 50 } = req.query;
  res.json(mockTrades.slice(0, parseInt(limit as string)));
});

// Strategy endpoints
app.get('/api/strategies', (req, res) => {
  res.json(mockStrategies);
});

app.get('/api/strategies/:id', (req, res) => {
  const strategy = mockStrategies.find(s => s.id === req.params.id);
  if (strategy) {
    res.json(strategy);
  } else {
    res.status(404).json({ error: 'Strategy not found' });
  }
});

// Market data endpoints
app.get('/api/market/prices', (req, res) => {
  const { symbols } = req.query;
  if (symbols) {
    const requestedSymbols = (symbols as string).split(',');
    const filteredPrices = Object.fromEntries(
      Object.entries(mockPrices).filter(([symbol]) => requestedSymbols.includes(symbol))
    );
    res.json(filteredPrices);
  } else {
    res.json(mockPrices);
  }
});

// System endpoints
app.get('/api/system/status', (req, res) => {
  res.json(mockSystemStatus);
});

app.get('/api/alerts', (req, res) => {
  const mockAlerts = [
    {
      id: '1',
      type: 'price',
      message: 'BTC/USDT reached $45,000',
      level: 'info',
      timestamp: new Date(),
      read: false
    },
    {
      id: '2',
      type: 'strategy',
      message: 'RSI Pro Strategy completed 10 trades',
      level: 'success',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      read: false
    }
  ];
  res.json(mockAlerts);
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('🔗 New WebSocket connection');
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection_established',
    data: { message: 'Connected to mock trading bot server' }
  }));

  // Send initial data
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'portfolio_update',
      payload: mockPortfolio
    }));

    ws.send(JSON.stringify({
      type: 'system_status_update',
      payload: mockSystemStatus
    }));
  }, 1000);

  // Simulate real-time price updates
  const priceUpdateInterval = setInterval(() => {
    Object.entries(mockPrices).forEach(([symbol, data]) => {
      const variation = (Math.random() - 0.5) * 0.001; // ±0.1% variation
      const newPrice = data.price * (1 + variation);
      const change = newPrice - data.price;
      
      mockPrices[symbol] = {
        ...data,
        price: Math.round(newPrice * 100) / 100,
        change24h: Math.round((data.change24h + change) * 100) / 100,
        timestamp: Date.now()
      };

      ws.send(JSON.stringify({
        type: 'price_update',
        payload: {
          symbol,
          ...mockPrices[symbol]
        }
      }));
    });
  }, 2000);

  // Simulate trade updates
  const tradeUpdateInterval = setInterval(() => {
    if (Math.random() > 0.7) { // 30% chance of new trade
      const symbols = Object.keys(mockPrices);
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const side = Math.random() > 0.5 ? 'buy' : 'sell';
      const amount = Math.random() * 2;
      const price = mockPrices[symbol].price;
      
      const newTrade = {
        id: Date.now().toString(),
        symbol,
        side,
        amount: Math.round(amount * 1000) / 1000,
        price: Math.round(price * 100) / 100,
        timestamp: new Date(),
        strategy: mockStrategies[Math.floor(Math.random() * mockStrategies.length)].name,
        pnl: (Math.random() - 0.4) * 100, // Slight positive bias
        status: 'completed'
      };

      mockTrades.unshift(newTrade);
      if (mockTrades.length > 100) mockTrades.pop();

      ws.send(JSON.stringify({
        type: 'trade_update',
        payload: newTrade
      }));
    }
  }, 5000);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Received message:', message.type);

      switch (message.type) {
        case 'request_initial_data':
          ws.send(JSON.stringify({
            type: 'initial_data',
            payload: {
              portfolio: mockPortfolio,
              strategies: mockStrategies,
              systemStatus: mockSystemStatus,
              prices: mockPrices,
              recentTrades: mockTrades.slice(0, 10)
            }
          }));
          break;
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    console.log('❌ WebSocket connection closed');
    clearInterval(priceUpdateInterval);
    clearInterval(tradeUpdateInterval);
  });
});

const PORT = process.env.PORT || 9090;

server.listen(PORT, () => {
  console.log(`🚀 Mock Trading Bot Server running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
  console.log(`🔗 WebSocket: ws://localhost:${PORT}`);
});

export default app;

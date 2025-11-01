/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component for validation and development
 */
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Mock data for portfolio
const mockPortfolio = {
    totalBalance: 25847.32,
    availableBalance: 18234.67,
    unrealizedPnL: 1247.89,
    realizedPnL: 2847.32,
    positions: [
        {
            symbol: 'BTCUSDT',
            side: 'LONG',
            size: 0.25,
            entryPrice: 45250.00,
            currentPrice: 47850.00,
            pnl: 650.00,
            pnlPercent: 1.44
        },
        {
            symbol: 'ETHUSDT',
            side: 'LONG',
            size: 2.5,
            entryPrice: 3180.00,
            currentPrice: 3245.00,
            pnl: 162.50,
            pnlPercent: 2.04
        }
    ]
};

const mockTrades = [
    {
        id: 1,
        symbol: 'BTCUSDT',
        side: 'BUY',
        price: 47850.00,
        quantity: 0.1,
        timestamp: new Date().toISOString(),
        pnl: 125.50
    },
    {
        id: 2,
        symbol: 'ETHUSDT',
        side: 'SELL',
        price: 3245.00,
        quantity: 0.5,
        timestamp: new Date(Date.now() - 300000).toISOString(),
        pnl: -45.20
    }
];

const mockRisk = {
    var_1d: -1250.50,
    var_5d: -3847.20,
    sharpe_ratio: 1.42,
    max_drawdown: -0.08,
    win_rate: 0.67
};

// API endpoints
app.get('/api/portfolio', (req, res) => {
    res.json({
        success: true,
        data: mockPortfolio
    });
});

app.get('/api/trades', (req, res) => {
    res.json({
        success: true,
        data: mockTrades
    });
});

app.get('/api/risk', (req, res) => {
    res.json({
        success: true,
        data: mockRisk
    });
});

app.get('/api/metrics', (req, res) => {
    res.json({
        success: true,
        data: {
            totalTrades: 347,
            winRate: 0.68,
            profitFactor: 1.75,
            sharpeRatio: 1.85,
            sortinoRatio: 2.34,
            maxDrawdown: 0.085,
            avgWin: 245.67,
            avgLoss: -142.34,
            largestWin: 1247.89,
            largestLoss: -876.54,
            consecutiveWins: 8,
            consecutiveLosses: 3,
            volatility: 0.0234,
            betaToMarket: 0.78
        }
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Mock Trading Bot API running on port ${PORT}`);
    console.log(`📊 Endpoints available:`);
    console.log(`   GET http://localhost:${PORT}/api/portfolio`);
    console.log(`   GET http://localhost:${PORT}/api/trades`);
    console.log(`   GET http://localhost:${PORT}/api/risk`);
    console.log(`   GET http://localhost:${PORT}/api/metrics`);
    console.log(`   GET http://localhost:${PORT}/api/health`);
});
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
class ProfessionalTradingDashboard {
    constructor() {
        this.port = 3002;
        this.app = (0, express_1.default)();
        this.server = new http_1.Server(this.app);
        this.io = new socket_io_1.Server(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        this.setupRoutes();
        this.setupWebSocket();
    }
    setupRoutes() {
        this.app.get('/', (req, res) => {
            res.send(this.generateProfessionalDashboard());
        });
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', timestamp: Date.now() });
        });
        this.app.get('/api/market-data/:symbol/:timeframe', async (req, res) => {
            try {
                const { symbol, timeframe } = req.params;
                const mockData = this.generateMockCandleData(50);
                res.json({
                    symbol,
                    timeframe,
                    data: mockData,
                    timestamp: Date.now()
                });
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to fetch market data' });
            }
        });
        this.app.get('/api/portfolio-performance', (req, res) => {
            res.json({
                totalValue: 10285.50,
                dailyPnL: 125.30,
                weeklyPnL: 582.45,
                totalReturn: 5.47,
                sharpeRatio: 1.82,
                positions: [
                    { symbol: 'BTCUSDT', side: 'LONG', size: 0.25, entryPrice: 44200, currentPrice: 45247, pnl: 261.75 },
                    { symbol: 'ETHUSDT', side: 'SHORT', size: 1.5, entryPrice: 2820, currentPrice: 2789, pnl: 46.50 }
                ],
                history: [
                    { date: '2025-10-12', symbol: 'BTCUSDT', type: 'KUP', price: 45000, amount: 0.1, pnl: 24.70 },
                    { date: '2025-10-11', symbol: 'ETHUSDT', type: 'SPRZEDAJ', price: 2800, amount: 1, pnl: -11.00 }
                ],
                totalPnL: 308.25,
                winRate: 68.5,
                averageWin: 145.20,
                averageLoss: -42.30
            });
        });
        this.app.get('/api/strategy-signals/:strategy', (req, res) => {
            res.json({
                strategy: req.params.strategy,
                signals: []
            });
        });
    }
    setupWebSocket() {
        this.io.on('connection', (socket) => {
            console.log('🔌 Client connected');
            const sendMarketUpdate = () => {
                const tick = {
                    symbol: 'BTCUSDT',
                    price: 45000 + (Math.random() - 0.5) * 1000,
                    change24h: (Math.random() - 0.5) * 5,
                    volume24h: Math.random() * 1000000,
                    timestamp: Date.now()
                };
                socket.emit('market-tick', tick);
                const ethTick = {
                    symbol: 'ETHUSDT',
                    price: 2800 + (Math.random() - 0.5) * 100,
                    change24h: (Math.random() - 0.5) * 5,
                    volume24h: Math.random() * 500000,
                    timestamp: Date.now()
                };
                socket.emit('market-tick', ethTick);
                const solTick = {
                    symbol: 'SOLUSDT',
                    price: 140 + (Math.random() - 0.5) * 10,
                    change24h: (Math.random() - 0.5) * 5,
                    volume24h: Math.random() * 200000,
                    timestamp: Date.now()
                };
                socket.emit('market-tick', solTick);
            };
            sendMarketUpdate();
            const interval = setInterval(sendMarketUpdate, 30000);
            socket.on('disconnect', () => {
                console.log('🔌 Client disconnected');
                clearInterval(interval);
            });
        });
    }
    generateMockCandleData(count) {
        const candles = [];
        const now = Date.now();
        let price = 45000;
        for (let i = count; i >= 0; i--) {
            const timestamp = now - i * 5 * 60 * 1000;
            const change = (Math.random() - 0.5) * 500;
            const open = price;
            const close = price + change;
            const high = Math.max(open, close) + Math.random() * 300;
            const low = Math.min(open, close) - Math.random() * 300;
            const volume = Math.random() * 1000 + 500;
            candles.push({
                timestamp,
                open: parseFloat(open.toFixed(2)),
                high: parseFloat(high.toFixed(2)),
                low: parseFloat(low.toFixed(2)),
                close: parseFloat(close.toFixed(2)),
                volume: parseFloat(volume.toFixed(2))
            });
            price = close;
        }
        return candles;
    }
    generateProfessionalDashboard() {
        return `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏛️ Enterprise Trading Dashboard</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            background: #0B0E14; 
            color: #E8E8E8; 
            font-family: 'JetBrains Mono', monospace; 
            overflow-x: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #1A1D24 0%, #0B0E14 100%);
            padding: 15px 30px;
            border-bottom: 2px solid #00D4AA;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
        
        .header h1 {
            color: #00D4AA;
            font-size: 24px;
            font-weight: 700;
        }
        
        .ticker-bar {
            display: flex;
            gap: 30px;
            align-items: center;
        }
        
        .ticker-item {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .ticker-symbol {
            color: #888;
            font-size: 11px;
            margin-bottom: 3px;
        }
        
        .ticker-price {
            font-size: 16px;
            font-weight: 600;
            color: #00D4AA;
        }
        
        .ticker-change {
            font-size: 12px;
            margin-top: 2px;
        }
        
        .ticker-change.positive { color: #00D4AA; }
        .ticker-change.negative { color: #FF4444; }
        
        .container {
            display: grid;
            grid-template-columns: 1fr 320px;
            gap: 15px;
            padding: 15px;
            height: calc(100vh - 80px);
        }
        
        .main-panel {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .chart-container {
            background: #181A20;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            flex: 1;
            display: flex;
            flex-direction: column;
            position: relative;
        }
        
        .chart-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .chart-title {
            font-size: 18px;
            font-weight: 600;
            color: #FFD700;
        }
        
        .chart-controls {
            display: flex;
            gap: 10px;
        }
        
        .btn {
            padding: 8px 16px;
            border-radius: 6px;
            border: none;
            background: #2A2D35;
            color: #E8E8E8;
            cursor: pointer;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        .btn:hover {
            background: #3A3D45;
            transform: translateY(-2px);
        }
        
        .btn.active {
            background: #00D4AA;
            color: #0B0E14;
            box-shadow: 0 4px 12px rgba(0, 212, 170, 0.4);
        }
        
        .btn-indicator {
            padding: 6px 12px;
            font-size: 11px;
        }
        
        .btn-indicator.active {
            background: #FFD700;
            color: #0B0E14;
        }
        
        .chart-wrapper {
            flex: 1;
            position: relative;
            min-height: 400px;
        }
        
        #main-chart {
            width: 100% !important;
            height: 100% !important;
        }
        
        .resize-handle {
            position: absolute;
            background: rgba(0, 212, 170, 0.3);
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .resize-handle:hover {
            background: rgba(0, 212, 170, 0.6);
        }
        
        .resize-handle-right {
            top: 0;
            right: -5px;
            width: 10px;
            height: 100%;
            cursor: ew-resize;
        }
        
        .resize-handle-bottom {
            bottom: -5px;
            left: 0;
            width: 100%;
            height: 10px;
            cursor: ns-resize;
        }
        
        .resize-handle-corner {
            bottom: -5px;
            right: -5px;
            width: 20px;
            height: 20px;
            cursor: nwse-resize;
            border-radius: 50%;
        }
        
        .side-panel {
            display: flex;
            flex-direction: column;
            gap: 15px;
            overflow-y: auto;
        }
        
        .panel {
            background: #181A20;
            border-radius: 12px;
            padding: 15px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
        
        .panel-header {
            font-size: 14px;
            font-weight: 600;
            color: #00D4AA;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #2A2D35;
        }
        
        .portfolio-value {
            text-align: center;
            margin-bottom: 15px;
        }
        
        .portfolio-total {
            font-size: 28px;
            font-weight: 700;
            color: #FFD700;
            margin-bottom: 5px;
        }
        
        .portfolio-change {
            font-size: 14px;
            color: #00D4AA;
        }
        
        .stat-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .stat-item {
            background: #1A1D24;
            padding: 10px;
            border-radius: 8px;
            text-align: center;
        }
        
        .stat-label {
            font-size: 10px;
            color: #888;
            margin-bottom: 4px;
        }
        
        .stat-value {
            font-size: 16px;
            font-weight: 600;
            color: #00D4AA;
        }
        
        .stat-value.negative {
            color: #FF4444;
        }
        
        .position-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .position-item {
            background: #1A1D24;
            padding: 12px;
            border-radius: 8px;
            border-left: 3px solid #00D4AA;
        }
        
        .position-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .position-symbol {
            font-weight: 600;
            color: #FFD700;
        }
        
        .position-side {
            font-size: 11px;
            padding: 2px 8px;
            border-radius: 4px;
            background: rgba(0, 212, 170, 0.2);
            color: #00D4AA;
        }
        
        .position-details {
            font-size: 12px;
            color: #888;
            display: flex;
            justify-content: space-between;
        }
        
        .position-pnl {
            font-weight: 600;
        }
        
        .position-pnl.positive {
            color: #00D4AA;
        }
        
        .position-pnl.negative {
            color: #FF4444;
        }
        
        .indicator-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }
        
        .indicator-item {
            background: #1A1D24;
            padding: 10px;
            border-radius: 8px;
        }
        
        .indicator-name {
            font-size: 11px;
            color: #888;
            margin-bottom: 4px;
        }
        
        .indicator-value {
            font-size: 16px;
            font-weight: 600;
            color: #FFD700;
        }
        
        .strategy-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .strategy-item {
            background: #1A1D24;
            padding: 12px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }
        
        .strategy-item:hover {
            background: #2A2D35;
        }
        
        .strategy-item.active {
            border-color: #00D4AA;
            background: rgba(0, 212, 170, 0.1);
        }
        
        .strategy-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .strategy-name {
            font-weight: 600;
            color: #FFD700;
        }
        
        .strategy-status {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #00D4AA;
        }
        
        .strategy-status.inactive {
            background: #FF4444;
        }
        
        .strategy-stats {
            font-size: 11px;
            color: #888;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: #888;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .spinner {
            border: 3px solid #2A2D35;
            border-top: 3px solid #00D4AA;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
</head>
<body>
    <div class="header">
        <h1>🏛️ Enterprise Trading Dashboard</h1>
        <div class="ticker-bar">
            <div class="ticker-item">
                <div class="ticker-symbol">BTC/USDT</div>
                <div class="ticker-price" id="btc-price">$45,247.82</div>
                <div class="ticker-change positive" id="btc-change">+2.34%</div>
            </div>
            <div class="ticker-item">
                <div class="ticker-symbol">ETH/USDT</div>
                <div class="ticker-price" id="eth-price">$2,789.45</div>
                <div class="ticker-change positive" id="eth-change">+1.82%</div>
            </div>
            <div class="ticker-item">
                <div class="ticker-symbol">SOL/USDT</div>
                <div class="ticker-price" id="sol-price">$142.67</div>
                <div class="ticker-change negative" id="sol-change">-0.45%</div>
            </div>
        </div>
    </div>
    
    <div class="container">
        <div class="main-panel">
            <div class="chart-container">
                <div class="chart-header">
                    <div class="chart-title">📈 BTC/USDT Price Chart</div>
                    <div class="chart-controls">
                        <button class="btn active" id="btn-line">Linia</button>
                        <button class="btn" id="btn-bar">Słupki</button>
                        <button class="btn btn-indicator" id="btn-rsi">RSI</button>
                        <button class="btn btn-indicator" id="btn-ema">EMA</button>
                        <button class="btn btn-indicator" id="btn-macd">MACD</button>
                    </div>
                </div>
                <div class="chart-wrapper" id="chart-wrapper">
                    <canvas id="main-chart"></canvas>
                    <div class="resize-handle resize-handle-right" id="resize-right"></div>
                    <div class="resize-handle resize-handle-bottom" id="resize-bottom"></div>
                    <div class="resize-handle resize-handle-corner" id="resize-corner"></div>
                </div>
            </div>
        </div>
        
        <div class="side-panel">
            <div class="panel">
                <div class="panel-header">💼 Portfolio</div>
                <div class="portfolio-value">
                    <div class="portfolio-total" id="portfolio-total">$10,542.38</div>
                    <div class="portfolio-change" id="portfolio-change">+542.38 (+5.42%)</div>
                </div>
                <div class="stat-grid">
                    <div class="stat-item">
                        <div class="stat-label">Daily PnL</div>
                        <div class="stat-value" id="daily-pnl">+$127.45</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Weekly PnL</div>
                        <div class="stat-value" id="weekly-pnl">+$542.38</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Win Rate</div>
                        <div class="stat-value" id="win-rate">68.4%</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Sharpe</div>
                        <div class="stat-value" id="sharpe">2.14</div>
                    </div>
                </div>
                <div class="position-list" id="position-list">
                    <div class="loading">
                        <div class="spinner"></div>
                        Loading positions...
                    </div>
                </div>
            </div>
            
            <div class="panel">
                <div class="panel-header">📊 Technical Indicators</div>
                <div class="indicator-grid" id="indicator-grid">
                    <div class="indicator-item">
                        <div class="indicator-name">RSI (14)</div>
                        <div class="indicator-value" id="ind-rsi">52.4</div>
                    </div>
                    <div class="indicator-item">
                        <div class="indicator-name">EMA (21)</div>
                        <div class="indicator-value" id="ind-ema">45,180</div>
                    </div>
                    <div class="indicator-item">
                        <div class="indicator-name">MACD</div>
                        <div class="indicator-value" id="ind-macd">+42.5</div>
                    </div>
                    <div class="indicator-item">
                        <div class="indicator-name">ADX (14)</div>
                        <div class="indicator-value" id="ind-adx">28.3</div>
                    </div>
                </div>
            </div>
            
            <div class="panel">
                <div class="panel-header">🎯 Active Strategies</div>
                <div class="strategy-list" id="strategy-list">
                    <div class="strategy-item active" data-strategy="RSI_TURBO">
                        <div class="strategy-header">
                            <div class="strategy-name">RSI Turbo</div>
                            <div class="strategy-status"></div>
                        </div>
                        <div class="strategy-stats">
                            <span>Win: 72.5%</span>
                            <span>PnL: +$284</span>
                        </div>
                    </div>
                    <div class="strategy-item active" data-strategy="MOMENTUM_PRO">
                        <div class="strategy-header">
                            <div class="strategy-name">Momentum Pro</div>
                            <div class="strategy-status"></div>
                        </div>
                        <div class="strategy-stats">
                            <span>Win: 65.8%</span>
                            <span>PnL: +$158</span>
                        </div>
                    </div>
                    <div class="strategy-item" data-strategy="SUPERTREND">
                        <div class="strategy-header">
                            <div class="strategy-name">SuperTrend</div>
                            <div class="strategy-status inactive"></div>
                        </div>
                        <div class="strategy-stats">
                            <span>Win: 58.2%</span>
                            <span>PnL: +$100</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // ============================================================================
        // ENTERPRISE TRADING DASHBOARD - JAVASCRIPT IMPLEMENTATION
        // ============================================================================
        
        let chart = null;
        let socket = null;
        let chartType = 'line';
        let activeIndicators = new Set();
        let activeStrategies = new Set(['RSI_TURBO', 'MOMENTUM_PRO', 'SUPERTREND']);
        let mockData = null;
        
        // ============================================================================
        // INITIALIZATION
        // ============================================================================
        
        function init() {
            console.log('🚀 Initializing Enterprise Trading Dashboard...');
            
            // Initialize WebSocket
            initWebSocket();
            
            // Generate mock data
            mockData = generateMockData(60);
            
            // Initialize chart
            renderChart(chartType);
            
            // Setup event listeners
            setupEventListeners();
            
            // Load initial data
            loadPortfolioData();
            loadPositions();
            
            // Start real-time updates
            startRealTimeUpdates();
            
            console.log('✅ Dashboard initialized successfully');
        }
        
        // ============================================================================
        // WEBSOCKET CONNECTION
        // ============================================================================
        
        function initWebSocket() {
            try {
                socket = io();
                
                socket.on('connect', () => {
                    console.log('✅ WebSocket connected');
                });
                
                socket.on('market-tick', (data) => {
                    updateTicker(data);
                });
                
                socket.on('disconnect', () => {
                    console.log('⚠️ WebSocket disconnected');
                });
            } catch (error) {
                console.error('❌ WebSocket initialization failed:', error);
            }
        }
        
        // ============================================================================
        // DATA GENERATION
        // ============================================================================
        
        function generateMockData(count) {
            const data = { labels: [], prices: [], rsi: [], ema9: [], ema21: [], macd: [] };
            const base = 45000;
            
            for (let i = 0; i < count; i++) {
                const timestamp = Date.now() - (count - i) * 5 * 60 * 1000;
                data.labels.push(new Date(timestamp).toLocaleTimeString());
                
                // Price with sine wave and noise
                const price = base + Math.sin(i / 8) * 1500 + (Math.random() - 0.5) * 800;
                data.prices.push(price);
                
                // RSI (simplified)
                const rsi = 50 + Math.sin(i / 6) * 30 + (Math.random() - 0.5) * 10;
                data.rsi.push(Math.max(0, Math.min(100, rsi)));
                
                // EMA
                data.ema9.push(price - 200 + (Math.random() - 0.5) * 100);
                data.ema21.push(price + 150 + (Math.random() - 0.5) * 100);
                
                // MACD
                data.macd.push((Math.random() - 0.5) * 100);
            }
            
            return data;
        }
        
        // ============================================================================
        // CHART RENDERING
        // ============================================================================
        
        // ============================================================================
        // STRATEGY SIGNALS GENERATION
        // ============================================================================
        
        function generateStrategySignals() {
            const signals = [];
            const prices = mockData.prices;
            const rsi = mockData.rsi;
            const ema9 = mockData.ema9;
            const ema21 = mockData.ema21;
            
            console.log('🎯 Generating signals for strategies:', Array.from(activeStrategies));
            console.log('📊 Data available - prices:', prices?.length, 'rsi:', rsi?.length);
            
            for (let i = 20; i < prices.length - 5; i++) {
                // RSI_TURBO Strategy
                if (activeStrategies.has('RSI_TURBO')) {
                    if (rsi[i] < 30 && rsi[i] > rsi[i-1]) {
                        signals.push({
                            index: i,
                            type: 'buy',
                            price: prices[i] * 0.998,
                            strategy: 'RSI_TURBO',
                            reason: \`RSI oversold: \${rsi[i].toFixed(1)}\`
                        });
                    } else if (rsi[i] > 70 && rsi[i] < rsi[i-1]) {
                        signals.push({
                            index: i,
                            type: 'sell',
                            price: prices[i] * 1.002,
                            strategy: 'RSI_TURBO',
                            reason: \`RSI overbought: \${rsi[i].toFixed(1)}\`
                        });
                    }
                }
                
                // MOMENTUM_PRO Strategy
                if (activeStrategies.has('MOMENTUM_PRO')) {
                    const momentum = prices[i] - prices[i-5];
                    if (momentum > 0 && ema9[i] > ema21[i] && ema9[i-1] <= ema21[i-1]) {
                        signals.push({
                            index: i,
                            type: 'buy',
                            price: prices[i] * 0.997,
                            strategy: 'MOMENTUM_PRO',
                            reason: 'EMA bullish crossover'
                        });
                    } else if (momentum < 0 && ema9[i] < ema21[i] && ema9[i-1] >= ema21[i-1]) {
                        signals.push({
                            index: i,
                            type: 'sell',
                            price: prices[i] * 1.003,
                            strategy: 'MOMENTUM_PRO',
                            reason: 'EMA bearish crossover'
                        });
                    }
                }
                
                // SUPERTREND Strategy
                if (activeStrategies.has('SUPERTREND')) {
                    const volatility = Math.abs(prices[i] - prices[i-1]) / prices[i-1];
                    if (volatility > 0.005 && prices[i] > ema21[i]) {
                        signals.push({
                            index: i,
                            type: 'buy',
                            price: prices[i] * 0.996,
                            strategy: 'SUPERTREND',
                            reason: \`High volatility: \${(volatility*100).toFixed(2)}%\`
                        });
                    } else if (volatility > 0.005 && prices[i] < ema21[i]) {
                        signals.push({
                            index: i,
                            type: 'sell',
                            price: prices[i] * 1.004,
                            strategy: 'SUPERTREND',
                            reason: \`High volatility downtrend\`
                        });
                    }
                }
            }
            
            console.log('✅ Generated', signals.length, 'signals:', signals.slice(0, 3));
            return signals;
        }
        
        function renderChart(type) {
            const ctx = document.getElementById('main-chart');
            if (!ctx) {
                console.error('❌ Canvas element not found');
                return;
            }
            
            const context = ctx.getContext('2d');
            
            if (chart) {
                chart.destroy();
            }
            
            const datasets = [{
                label: 'BTC/USDT',
                data: mockData.prices,
                borderColor: '#00D4AA',
                backgroundColor: type === 'line' ? 'rgba(0,212,170,0.1)' : 'rgba(0,212,170,0.6)',
                borderWidth: 3,
                fill: type === 'line',
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                yAxisID: 'y'
            }];
            
            // Add RSI if active
            if (activeIndicators.has('rsi')) {
                datasets.push({
                    label: 'RSI (14)',
                    data: mockData.rsi,
                    borderColor: '#FFD700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    yAxisID: 'y-rsi',
                    hidden: false
                });
            }
            
            // Add EMA if active
            if (activeIndicators.has('ema')) {
                datasets.push({
                    label: 'EMA (9)',
                    data: mockData.ema9,
                    borderColor: '#FF6B9D',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    yAxisID: 'y'
                });
                datasets.push({
                    label: 'EMA (21)',
                    data: mockData.ema21,
                    borderColor: '#C75FFF',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    yAxisID: 'y'
                });
            }
            
            // Add MACD if active
            if (activeIndicators.has('macd')) {
                datasets.push({
                    label: 'MACD',
                    data: mockData.macd,
                    type: 'bar',
                    backgroundColor: 'rgba(0, 150, 199, 0.6)',
                    yAxisID: 'y-macd'
                });
            }
            
            // Add Strategy Signals
            const signals = generateStrategySignals();
            const buySignals = new Array(mockData.prices.length).fill(null);
            const sellSignals = new Array(mockData.prices.length).fill(null);
            
            console.log('📍 Processing', signals.length, 'signals for chart');
            
            signals.forEach(signal => {
                if (signal.type === 'buy') {
                    buySignals[signal.index] = signal.price;
                } else {
                    sellSignals[signal.index] = signal.price;
                }
            });
            
            const buyCount = buySignals.filter(v => v !== null).length;
            const sellCount = sellSignals.filter(v => v !== null).length;
            console.log('📊 Buy signals:', buyCount, 'Sell signals:', sellCount);
            
            // Buy signals dataset
            if (buySignals.some(v => v !== null)) {
                datasets.push({
                    label: '🔥 KUP',
                    data: buySignals,
                    type: 'scatter',
                    backgroundColor: '#00D4AA',
                    borderColor: '#FFFFFF',
                    borderWidth: 2,
                    pointRadius: 8,
                    pointHoverRadius: 10,
                    pointStyle: 'triangle',
                    rotation: 0,
                    yAxisID: 'y',
                    showLine: false
                });
            }
            
            // Sell signals dataset
            if (sellSignals.some(v => v !== null)) {
                datasets.push({
                    label: '⚠️ SPRZEDAJ',
                    data: sellSignals,
                    type: 'scatter',
                    backgroundColor: '#FF4444',
                    borderColor: '#FFFFFF',
                    borderWidth: 2,
                    pointRadius: 8,
                    pointHoverRadius: 10,
                    pointStyle: 'triangle',
                    rotation: 180,
                    yAxisID: 'y',
                    showLine: false
                });
            }
            
            const scales = {
                y: {
                    position: 'right',
                    ticks: { 
                        color: '#B8BCC8',
                        callback: (value) => '$' + value.toLocaleString()
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { color: '#B8BCC8' },
                    grid: { color: 'rgba(255, 255, 255, 0.02)' }
                }
            };
            
            if (activeIndicators.has('rsi')) {
                scales['y-rsi'] = {
                    position: 'left',
                    min: 0,
                    max: 100,
                    ticks: { color: '#FFD700' },
                    grid: { display: false }
                };
            }
            
            if (activeIndicators.has('macd')) {
                scales['y-macd'] = {
                    position: 'left',
                    ticks: { color: '#0096C7' },
                    grid: { display: false }
                };
            }
            
            chart = new Chart(context, {
                type: type,
                data: {
                    labels: mockData.labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { 
                            labels: { 
                                color: '#E8E8E8',
                                font: { family: 'JetBrains Mono', size: 12, weight: '600' }
                            } 
                        },
                        tooltip: {
                            backgroundColor: 'rgba(11, 14, 20, 0.95)',
                            titleColor: '#00D4AA',
                            bodyColor: '#E8E8E8',
                            borderColor: '#00D4AA',
                            borderWidth: 2,
                            titleFont: { family: 'JetBrains Mono', weight: 'bold' },
                            bodyFont: { family: 'JetBrains Mono' },
                            callbacks: {
                                title: function(context) {
                                    const label = context[0].dataset.label || '';
                                    if (label.includes('KUP') || label.includes('SPRZEDAJ')) {
                                        const idx = context[0].dataIndex;
                                        const signal = signals.find(s => s.index === idx);
                                        if (signal) {
                                            return \`\${signal.type === 'buy' ? '🔥 SYGNAŁ KUP' : '⚠️ SYGNAŁ SPRZEDAJ'}\`;
                                        }
                                    }
                                    return label;
                                },
                                label: function(context) {
                                    const label = context.dataset.label || '';
                                    if (label.includes('KUP') || label.includes('SPRZEDAJ')) {
                                        const idx = context.dataIndex;
                                        const signal = signals.find(s => s.index === idx);
                                        if (signal) {
                                            return [
                                                'Strategia: ' + signal.strategy,
                                                'Cena: $' + signal.price.toLocaleString(),
                                                'Powód: ' + signal.reason
                                            ];
                                        }
                                    }
                                    return label + ': ' + context.parsed.y.toLocaleString();
                                }
                            }
                        }
                    },
                    scales: scales,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    }
                }
            });
            
            console.log('✅ Chart rendered with type:', type);
        }
        
        // ============================================================================
        // EVENT LISTENERS
        // ============================================================================
        
        function setupEventListeners() {
            // Chart type buttons
            document.getElementById('btn-line').onclick = () => {
                chartType = 'line';
                document.querySelectorAll('.chart-controls .btn').forEach(b => b.classList.remove('active'));
                document.getElementById('btn-line').classList.add('active');
                renderChart(chartType);
            };
            
            document.getElementById('btn-bar').onclick = () => {
                chartType = 'bar';
                document.querySelectorAll('.chart-controls .btn').forEach(b => b.classList.remove('active'));
                document.getElementById('btn-bar').classList.add('active');
                renderChart(chartType);
            };
            
            // Indicator buttons
            document.getElementById('btn-rsi').onclick = () => toggleIndicator('rsi');
            document.getElementById('btn-ema').onclick = () => toggleIndicator('ema');
            document.getElementById('btn-macd').onclick = () => toggleIndicator('macd');
            
            // Strategy items
            document.querySelectorAll('.strategy-item').forEach(item => {
                item.onclick = () => {
                    const strategy = item.dataset.strategy;
                    toggleStrategy(item, strategy);
                };
            });
            
            // Resize handles
            setupResizeHandles();
        }
        
        function toggleIndicator(indicator) {
            const btn = document.getElementById(\`btn-\${indicator}\`);
            
            if (activeIndicators.has(indicator)) {
                activeIndicators.delete(indicator);
                btn.classList.remove('active');
            } else {
                activeIndicators.add(indicator);
                btn.classList.add('active');
            }
            
            renderChart(chartType);
            console.log('✅ Indicator toggled:', indicator, 'Active:', Array.from(activeIndicators));
        }
        
        function toggleStrategy(item, strategy) {
            const statusDot = item.querySelector('.strategy-status');
            
            if (activeStrategies.has(strategy)) {
                activeStrategies.delete(strategy);
                item.classList.remove('active');
                statusDot.classList.add('inactive');
            } else {
                activeStrategies.add(strategy);
                item.classList.add('active');
                statusDot.classList.remove('inactive');
            }
            
            // Odśwież wykres aby pokazać/ukryć sygnały
            renderChart(chartType);
            
            console.log('✅ Strategy toggled:', strategy, 'Active:', Array.from(activeStrategies));
        }
        
        // ============================================================================
        // RESIZE FUNCTIONALITY
        // ============================================================================
        
        function setupResizeHandles() {
            const wrapper = document.getElementById('chart-wrapper');
            const rightHandle = document.getElementById('resize-right');
            const bottomHandle = document.getElementById('resize-bottom');
            const cornerHandle = document.getElementById('resize-corner');
            
            let isResizing = false;
            let resizeType = null;
            let startX, startY, startWidth, startHeight;
            
            function startResize(e, type) {
                isResizing = true;
                resizeType = type;
                startX = e.clientX;
                startY = e.clientY;
                startWidth = wrapper.offsetWidth;
                startHeight = wrapper.offsetHeight;
                e.preventDefault();
            }
            
            rightHandle.onmousedown = (e) => startResize(e, 'width');
            bottomHandle.onmousedown = (e) => startResize(e, 'height');
            cornerHandle.onmousedown = (e) => startResize(e, 'both');
            
            document.onmousemove = (e) => {
                if (!isResizing) return;
                
                if (resizeType === 'width' || resizeType === 'both') {
                    const newWidth = startWidth + (e.clientX - startX);
                    if (newWidth > 400) {
                        wrapper.style.width = newWidth + 'px';
                    }
                }
                
                if (resizeType === 'height' || resizeType === 'both') {
                    const newHeight = startHeight + (e.clientY - startY);
                    if (newHeight > 300) {
                        wrapper.style.height = newHeight + 'px';
                    }
                }
                
                if (chart) {
                    chart.resize();
                }
            };
            
            document.onmouseup = () => {
                if (isResizing) {
                    isResizing = false;
                    resizeType = null;
                    if (chart) {
                        chart.update('none');
                    }
                }
            };
        }
        
        // ============================================================================
        // DATA LOADING
        // ============================================================================
        
        function loadPortfolioData() {
            // Mock portfolio data
            const portfolioData = {
                total: 10542.38,
                change: 542.38,
                changePercent: 5.42,
                dailyPnL: 127.45,
                weeklyPnL: 542.38,
                winRate: 68.4,
                sharpe: 2.14
            };
            
            document.getElementById('portfolio-total').textContent = '$' + portfolioData.total.toLocaleString();
            document.getElementById('portfolio-change').textContent = 
                '+$' + portfolioData.change.toFixed(2) + ' (+' + portfolioData.changePercent.toFixed(2) + '%)';
            document.getElementById('daily-pnl').textContent = '+$' + portfolioData.dailyPnL.toFixed(2);
            document.getElementById('weekly-pnl').textContent = '+$' + portfolioData.weeklyPnL.toFixed(2);
            document.getElementById('win-rate').textContent = portfolioData.winRate.toFixed(1) + '%';
            document.getElementById('sharpe').textContent = portfolioData.sharpe.toFixed(2);
        }
        
        function loadPositions() {
            const positions = [
                { symbol: 'BTC/USDT', side: 'LONG', entry: 44200, current: 45248, pnl: 262.00 },
                { symbol: 'ETH/USDT', side: 'LONG', entry: 2750, current: 2789, pnl: 58.50 },
                { symbol: 'SOL/USDT', side: 'SHORT', entry: 145, current: 142.67, pnl: 23.30 }
            ];
            
            const container = document.getElementById('position-list');
            container.innerHTML = '';
            
            positions.forEach(pos => {
                const item = document.createElement('div');
                item.className = 'position-item';
                item.innerHTML = \`
                    <div class="position-header">
                        <div class="position-symbol">\${pos.symbol}</div>
                        <div class="position-side">\${pos.side}</div>
                    </div>
                    <div class="position-details">
                        <span>Entry: $\${pos.entry.toLocaleString()}</span>
                        <span class="position-pnl \${pos.pnl >= 0 ? 'positive' : 'negative'}">
                            \${pos.pnl >= 0 ? '+' : ''}$\${pos.pnl.toFixed(2)}
                        </span>
                    </div>
                    <div class="position-details">
                        <span>Current: $\${pos.current.toLocaleString()}</span>
                    </div>
                \`;
                container.appendChild(item);
            });
        }
        
        // ============================================================================
        // REAL-TIME UPDATES
        // ============================================================================
        
        function startRealTimeUpdates() {
            // Update indicators every 5 seconds
            setInterval(updateIndicators, 5000);
            
            // Update chart data every 30 seconds
            setInterval(() => {
                mockData = generateMockData(60);
                renderChart(chartType);
            }, 30000);
        }
        
        function updateTicker(data) {
            if (!data || !data.symbol) return;
            
            const symbol = data.symbol.toLowerCase();
            const priceEl = document.getElementById(\`\${symbol}-price\`);
            const changeEl = document.getElementById(\`\${symbol}-change\`);
            
            if (priceEl && typeof data.price === 'number') {
                priceEl.textContent = '$' + data.price.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                });
            }
            
            if (changeEl && typeof data.change24h === 'number') {
                const change = data.change24h;
                changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
                changeEl.className = 'ticker-change ' + (change >= 0 ? 'positive' : 'negative');
            }
        }
        
        function updateIndicators() {
            const rsi = 50 + (Math.random() - 0.5) * 30;
            const ema = 45000 + (Math.random() - 0.5) * 400;
            const macd = (Math.random() - 0.5) * 100;
            const adx = 20 + Math.random() * 20;
            
            document.getElementById('ind-rsi').textContent = rsi.toFixed(1);
            document.getElementById('ind-ema').textContent = ema.toLocaleString();
            document.getElementById('ind-macd').textContent = (macd >= 0 ? '+' : '') + macd.toFixed(1);
            document.getElementById('ind-adx').textContent = adx.toFixed(1);
        }
        
        // ============================================================================
        // START APPLICATION
        // ============================================================================
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
        
        console.log('🏛️ Enterprise Trading Dashboard Script Loaded');
    </script>
</body>
</html>`;
    }
    start() {
        this.server.listen(this.port, () => {
            console.log(`🏛️ Professional Trading Dashboard running on http://localhost:${this.port}`);
            console.log(`📊 WebSocket server active for real-time updates`);
            console.log(`💹 Multi-crypto support: BTC, ETH, SOL`);
        });
        process.on('SIGTERM', () => {
            console.log('🛑 Shutting down dashboard...');
            this.server.close(() => {
                console.log('🛑 Dashboard server stopped');
                process.exit(0);
            });
        });
    }
}
const dashboard = new ProfessionalTradingDashboard();
dashboard.start();

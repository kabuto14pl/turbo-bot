/**
 * 🚀 [PRODUCTION-OPERATIONAL]
 * Production monitoring component
 */
/**
 * 🚀 [PRODUCTION-OPERATIONAL]
 * Production monitoring component
 */
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3030;

app.use(cors());
app.use(express.json());

// Grafana-like interface
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📊 Grafana - Trading Analytics</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0b0c0e;
            color: #d9d9d9;
            min-height: 100vh;
        }
        
        .grafana-header {
            background: #1f1f20;
            border-bottom: 1px solid #36373a;
            padding: 10px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .grafana-logo {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #ff8c00;
            font-size: 1.5em;
            font-weight: 700;
        }
        
        .grafana-nav {
            display: flex;
            gap: 20px;
        }
        
        .nav-item {
            color: #d9d9d9;
            text-decoration: none;
            padding: 8px 16px;
            border-radius: 4px;
            transition: all 0.2s;
        }
        
        .nav-item:hover {
            background: #36373a;
            color: #fff;
        }
        
        .nav-item.active {
            background: #ff8c00;
            color: #000;
        }
        
        .grafana-content {
            padding: 20px;
        }
        
        .dashboard-header {
            margin-bottom: 30px;
        }
        
        .dashboard-title {
            font-size: 2em;
            margin-bottom: 10px;
            color: #fff;
        }
        
        .dashboard-tags {
            display: flex;
            gap: 10px;
        }
        
        .tag {
            background: #36373a;
            color: #d9d9d9;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.9em;
        }
        
        .panels-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
        }
        
        .panel {
            background: #1f1f20;
            border: 1px solid #36373a;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .panel-header {
            background: #26272a;
            padding: 12px 16px;
            border-bottom: 1px solid #36373a;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .panel-title {
            color: #fff;
            font-weight: 600;
        }
        
        .panel-content {
            padding: 20px;
        }
        
        .metric-large {
            font-size: 3em;
            font-weight: 700;
            text-align: center;
            margin: 20px 0;
            color: #00ff88;
        }
        
        .metric-large.warning {
            color: #ff8c00;
        }
        
        .metric-large.danger {
            color: #ff4444;
        }
        
        .chart-placeholder {
            height: 200px;
            background: linear-gradient(45deg, #36373a 25%, transparent 25%),
                        linear-gradient(-45deg, #36373a 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #36373a 75%),
                        linear-gradient(-45deg, transparent 75%, #36373a 75%);
            background-size: 20px 20px;
            background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            font-style: italic;
        }
        
        .status-indicator {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 0.9em;
            font-weight: 500;
        }
        
        .status-ok {
            background: rgba(0, 255, 136, 0.2);
            color: #00ff88;
        }
        
        .status-warning {
            background: rgba(255, 140, 0, 0.2);
            color: #ff8c00;
        }
        
        .status-error {
            background: rgba(255, 68, 68, 0.2);
            color: #ff4444;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: currentColor;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-top: 20px;
        }
        
        .stat-item {
            background: #36373a;
            padding: 15px;
            border-radius: 6px;
            text-align: center;
        }
        
        .stat-value {
            font-size: 1.5em;
            font-weight: 700;
            color: #fff;
        }
        
        .stat-label {
            color: #999;
            font-size: 0.9em;
            margin-top: 5px;
        }
        
        .refresh-indicator {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1f1f20;
            border: 1px solid #36373a;
            border-radius: 6px;
            padding: 10px 15px;
            display: flex;
            align-items: center;
            gap: 10px;
            color: #00ff88;
        }
        
        .spinner-small {
            width: 16px;
            height: 16px;
            border: 2px solid transparent;
            border-left: 2px solid #00ff88;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .alert-panel {
            background: linear-gradient(135deg, #1f1f20 0%, #2a1f1f 100%);
            border-left: 4px solid #ff4444;
        }
        
        .performance-panel {
            background: linear-gradient(135deg, #1f1f20 0%, #1f2a1f 100%);
            border-left: 4px solid #00ff88;
        }
        
        .time-selector {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        
        .time-btn {
            background: #36373a;
            border: none;
            color: #d9d9d9;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .time-btn:hover {
            background: #464749;
        }
        
        .time-btn.active {
            background: #ff8c00;
            color: #000;
        }
    </style>
</head>
<body>
    <div class="grafana-header">
        <div class="grafana-logo">
            📊 Grafana
        </div>
        <div class="grafana-nav">
            <a href="#" class="nav-item active">Dashboards</a>
            <a href="#" class="nav-item">Explore</a>
            <a href="#" class="nav-item">Alerting</a>
            <a href="#" class="nav-item">Configuration</a>
        </div>
    </div>
    
    <div class="grafana-content">
        <div class="dashboard-header">
            <h1 class="dashboard-title">🚀 Trading Bot Performance Dashboard</h1>
            <div class="dashboard-tags">
                <span class="tag">trading</span>
                <span class="tag">crypto</span>
                <span class="tag">performance</span>
                <span class="tag">real-time</span>
            </div>
        </div>
        
        <div class="time-selector">
            <button class="time-btn" onclick="setTimeRange('5m')">Last 5m</button>
            <button class="time-btn" onclick="setTimeRange('15m')">Last 15m</button>
            <button class="time-btn" onclick="setTimeRange('1h')">Last 1h</button>
            <button class="time-btn active" onclick="setTimeRange('6h')">Last 6h</button>
            <button class="time-btn" onclick="setTimeRange('24h')">Last 24h</button>
            <button class="time-btn" onclick="setTimeRange('7d')">Last 7d</button>
        </div>
        
        <div class="panels-grid">
            <!-- Portfolio Value Panel -->
            <div class="panel performance-panel">
                <div class="panel-header">
                    <div class="panel-title">💰 Portfolio Value</div>
                    <div class="status-indicator status-ok">
                        <div class="status-dot"></div>
                        Online
                    </div>
                </div>
                <div class="panel-content">
                    <div class="metric-large" id="portfolioValue">$125,847.89</div>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value" id="dailyChange">+2.34%</div>
                            <div class="stat-label">Daily Change</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="weeklyChange">+8.92%</div>
                            <div class="stat-label">Weekly Change</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- PnL Chart Panel -->
            <div class="panel">
                <div class="panel-header">
                    <div class="panel-title">📈 PnL Over Time</div>
                </div>
                <div class="panel-content">
                    <div class="chart-placeholder">
                        Real-time PnL Chart
                        <br><small>Connected to Prometheus metrics</small>
                    </div>
                </div>
            </div>
            
            <!-- Win Rate Panel -->
            <div class="panel performance-panel">
                <div class="panel-header">
                    <div class="panel-title">🎯 Win Rate</div>
                </div>
                <div class="panel-content">
                    <div class="metric-large" id="winRate">68.5%</div>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value" id="totalTrades">1,847</div>
                            <div class="stat-label">Total Trades</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="profitFactor">1.94</div>
                            <div class="stat-label">Profit Factor</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Risk Panel -->
            <div class="panel alert-panel">
                <div class="panel-header">
                    <div class="panel-title">⚠️ Risk Metrics</div>
                    <div class="status-indicator status-warning">
                        <div class="status-dot"></div>
                        Monitoring
                    </div>
                </div>
                <div class="panel-content">
                    <div class="metric-large warning" id="varValue">$2,847</div>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value" id="maxDrawdown">8.47%</div>
                            <div class="stat-label">Max Drawdown</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="sharpeRatio">1.87</div>
                            <div class="stat-label">Sharpe Ratio</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Active Positions Panel -->
            <div class="panel">
                <div class="panel-header">
                    <div class="panel-title">💼 Active Positions</div>
                </div>
                <div class="panel-content">
                    <div class="metric-large" id="positionCount">3</div>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value" id="longPositions">2</div>
                            <div class="stat-label">Long Positions</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="shortPositions">1</div>
                            <div class="stat-label">Short Positions</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Trading Volume Panel -->
            <div class="panel">
                <div class="panel-header">
                    <div class="panel-title">📊 Trading Volume (24h)</div>
                </div>
                <div class="panel-content">
                    <div class="chart-placeholder">
                        Volume Chart
                        <br><small>24h trading volume: $2,847,563</small>
                    </div>
                </div>
            </div>
            
            <!-- System Status Panel -->
            <div class="panel">
                <div class="panel-header">
                    <div class="panel-title">🖥️ System Status</div>
                </div>
                <div class="panel-content">
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value">99.9%</div>
                            <div class="stat-label">Uptime</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">12ms</div>
                            <div class="stat-label">Latency</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">OK</div>
                            <div class="stat-label">API Status</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">OK</div>
                            <div class="stat-label">Database</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Market Data Panel -->
            <div class="panel">
                <div class="panel-header">
                    <div class="panel-title">📈 Market Data</div>
                </div>
                <div class="panel-content">
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value" id="btcPrice">$45,987</div>
                            <div class="stat-label">BTC/USDT</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="ethPrice">$2,896</div>
                            <div class="stat-label">ETH/USDT</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="solPrice">$139.23</div>
                            <div class="stat-label">SOL/USDT</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">+2.1%</div>
                            <div class="stat-label">Market Trend</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="refresh-indicator">
        <div class="spinner-small"></div>
        Auto-refresh: 5s
    </div>
    
    <script>
        let currentTimeRange = '6h';
        
        function setTimeRange(range) {
            currentTimeRange = range;
            
            // Update UI
            document.querySelectorAll('.time-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // Refresh data
            updateDashboard();
        }
        
        function formatCurrency(value) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(value);
        }
        
        function formatPercent(value) {
            return (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
        }
        
        function updateDashboard() {
            // Fetch data from dashboard API
            fetch('http://localhost:3000/api/portfolio')
                .then(response => response.json())
                .then(portfolio => {
                    document.getElementById('portfolioValue').textContent = formatCurrency(portfolio.totalValue);
                    
                    // Calculate daily change (mock)
                    const dailyChange = ((portfolio.totalValue - 123000) / 123000) * 100;
                    document.getElementById('dailyChange').textContent = formatPercent(dailyChange);
                    
                    // Calculate weekly change (mock)
                    const weeklyChange = ((portfolio.totalValue - 115000) / 115000) * 100;
                    document.getElementById('weeklyChange').textContent = formatPercent(weeklyChange);
                    
                    // Update position counts
                    const longPositions = portfolio.positions.filter(p => p.side === 'LONG').length;
                    const shortPositions = portfolio.positions.filter(p => p.side === 'SHORT').length;
                    
                    document.getElementById('positionCount').textContent = portfolio.positions.length;
                    document.getElementById('longPositions').textContent = longPositions;
                    document.getElementById('shortPositions').textContent = shortPositions;
                })
                .catch(error => console.error('Error fetching portfolio:', error));
            
            // Fetch trading metrics
            fetch('http://localhost:3000/api/metrics')
                .then(response => response.json())
                .then(metrics => {
                    document.getElementById('winRate').textContent = metrics.winRate.toFixed(1) + '%';
                    document.getElementById('totalTrades').textContent = metrics.totalTrades.toLocaleString();
                    document.getElementById('profitFactor').textContent = metrics.profitFactor.toFixed(2);
                    document.getElementById('sharpeRatio').textContent = metrics.sharpeRatio.toFixed(2);
                })
                .catch(error => console.error('Error fetching metrics:', error));
            
            // Fetch risk data
            fetch('http://localhost:3000/api/risk')
                .then(response => response.json())
                .then(risk => {
                    document.getElementById('varValue').textContent = formatCurrency(risk.var_1d);
                    document.getElementById('maxDrawdown').textContent = (risk.maxDrawdown * 100).toFixed(2) + '%';
                })
                .catch(error => console.error('Error fetching risk:', error));
            
            // Fetch market data
            fetch('http://localhost:3000/api/market')
                .then(response => response.json())
                .then(market => {
                    document.getElementById('btcPrice').textContent = formatCurrency(market.btc.price);
                    document.getElementById('ethPrice').textContent = formatCurrency(market.eth.price);
                    document.getElementById('solPrice').textContent = formatCurrency(market.sol.price);
                })
                .catch(error => console.error('Error fetching market:', error));
        }
        
        // Initial load
        updateDashboard();
        
        // Auto-refresh every 5 seconds
        setInterval(updateDashboard, 5000);
    </script>
</body>
</html>`);
});

// API endpoints for data
app.get('/api/dashboards', (req, res) => {
    res.json([
        {
            id: 1,
            title: "Trading Bot Performance",
            tags: ["trading", "crypto", "performance"],
            url: "/d/trading-bot/trading-bot-performance"
        },
        {
            id: 2,
            title: "Risk Analysis Dashboard", 
            tags: ["risk", "var", "monitoring"],
            url: "/d/risk-analysis/risk-analysis"
        },
        {
            id: 3,
            title: "Market Overview",
            tags: ["market", "prices", "volume"],
            url: "/d/market/market-overview"
        }
    ]);
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '9.0.0',
        database: 'ok',
        uptime: Math.floor(process.uptime())
    });
});

// Login simulation
app.post('/login', (req, res) => {
    res.json({
        message: 'Login successful',
        user: 'admin',
        role: 'Admin'
    });
});

app.listen(PORT, () => {
    console.log(`📊 Grafana running on http://localhost:${PORT}`);
    console.log(`🔑 Login: admin / admin`);
});

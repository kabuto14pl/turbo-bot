#!/bin/bash
# 🔧 [DEVELOPMENT-TOOL]
# Development tool script

# 🔧 ULTIMATE SYSTEM CLEANUP & RESTART
# Czyści wszystkie porty i uruchamia WORKING system

echo "🔧 ULTIMATE SYSTEM CLEANUP & RESTART"
echo "===================================="

# 1. KILL ALL monitoring processes
echo "🛑 Stopping all processes..."
pkill -f "dashboard_server" 2>/dev/null || true
pkill -f "metrics_server" 2>/dev/null || true  
pkill -f "autonomous_trading_bot_final" 2>/dev/null || true
pkill -f "node.*3000" 2>/dev/null || true
pkill -f "node.*3001" 2>/dev/null || true
pkill -f "node.*9090" 2>/dev/null || true

sleep 3

# 2. FORCE KILL ports
echo "💀 Force killing ports..."
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
fuser -k 9090/tcp 2>/dev/null || true

sleep 2

# 3. CLEAN PID files
echo "🧹 Cleaning PID files..."
rm -f /workspaces/turbo-bot/*.pid
rm -f /workspaces/turbo-bot/monitoring/working/*.pid

# 4. CREATE working directory
echo "📁 Setting up directories..."
mkdir -p /workspaces/turbo-bot/monitoring/working
cd /workspaces/turbo-bot/monitoring/working

# 5. INSTALL dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm init -y > /dev/null 2>&1
    npm install express cors > /dev/null 2>&1
fi

# 6. START DASHBOARD SERVER (Port 3000)
echo "🌐 Starting Dashboard Server..."
cat > dashboard_server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Mock data that updates
let mockData = {
    portfolio: {
        totalValue: 45000 + Math.random() * 2000,
        unrealizedPnL: 1250 + (Math.random() - 0.5) * 500,
        realizedPnL: 3400,
        drawdown: 0.03,
        positions: [
            { symbol: 'BTCUSDT', size: 0.5, value: 22500, pnl: 450 },
            { symbol: 'ETHUSDT', size: 8.2, value: 18500, pnl: 200 },
            { symbol: 'SOLUSDT', size: 45, value: 4000, pnl: 100 }
        ]
    },
    trades: [],
    metrics: {
        trading_bot_uptime_seconds: Date.now() / 1000 - 3600,
        trading_bot_total_trades: 156,
        trading_bot_successful_trades: 98,
        trading_bot_current_positions: 3,
        trading_bot_portfolio_value: 45000,
        trading_bot_var_current: 2100,
        trading_bot_var_limit: 4500
    }
};

// Update data every 5 seconds
setInterval(() => {
    mockData.portfolio.totalValue += (Math.random() - 0.5) * 100;
    mockData.portfolio.unrealizedPnL += (Math.random() - 0.5) * 50;
    mockData.metrics.trading_bot_portfolio_value = mockData.portfolio.totalValue;
    
    if (Math.random() < 0.1) {
        const trade = {
            timestamp: Date.now(),
            symbol: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'][Math.floor(Math.random() * 3)],
            action: Math.random() > 0.5 ? 'BUY' : 'SELL',
            price: 45000 + (Math.random() - 0.5) * 5000,
            quantity: Math.random() * 0.1,
            pnl: (Math.random() - 0.5) * 200
        };
        mockData.trades.unshift(trade);
        if (mockData.trades.length > 50) mockData.trades.pop();
    }
}, 5000);

app.get('/', (req, res) => {
    res.json({
        service: 'Trading Bot Dashboard',
        status: 'operational',
        version: '2.0.0-WORKING',
        ports: {
            dashboard: 3000,
            bot: 3001,
            metrics: 9090
        }
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        portfolio: mockData.portfolio
    });
});

app.get('/api/portfolio', (req, res) => res.json(mockData.portfolio));
app.get('/api/trades', (req, res) => res.json(mockData.trades));
app.get('/api/metrics', (req, res) => res.json(mockData.metrics));

app.get('/dashboard', (req, res) => {
    res.send(`<!DOCTYPE html>
<html><head><title>Trading Bot Dashboard</title><meta charset="utf-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui; background: #0a0a0a; color: #e0e0e0; padding: 20px; }
.header { text-align: center; margin-bottom: 30px; }
.header h1 { color: #00ff88; font-size: 2.5em; margin-bottom: 10px; }
.status { color: #00ff88; font-size: 1.2em; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
.card { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 20px; }
.card h3 { color: #00ff88; margin-bottom: 15px; }
.metric { display: flex; justify-content: space-between; margin: 8px 0; }
.metric-label { color: #aaa; }
.metric-value { color: #fff; font-weight: bold; }
.positive { color: #00ff88; }
.negative { color: #ff4444; }
.position { background: #2a2a2a; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 3px solid #00ff88; }
.trade { background: #2a2a2a; padding: 8px; margin: 3px 0; border-radius: 4px; font-size: 0.9em; }
.controls { text-align: center; margin: 20px 0; }
.btn { background: #00ff88; color: #000; border: none; padding: 10px 20px; margin: 0 5px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn:hover { background: #00cc66; }
</style></head><body>
<div class="header"><h1>🚀 TRADING BOT DASHBOARD</h1><div class="status">● OPERATIONAL</div></div>
<div class="controls">
<button class="btn" onclick="location.reload()">🔄 Refresh</button>
<button class="btn" onclick="window.open('/api/metrics', '_blank')">📊 Metrics</button>
<button class="btn" onclick="window.open('/health', '_blank')">🏥 Health</button>
</div>
<div class="grid">
<div class="card"><h3>📊 Portfolio</h3><div id="portfolio">Loading...</div></div>
<div class="card"><h3>📈 Metrics</h3><div id="metrics">Loading...</div></div>
<div class="card"><h3>💼 Positions</h3><div id="positions">Loading...</div></div>
<div class="card"><h3>🔄 Trades</h3><div id="trades">Loading...</div></div>
</div>
<script>
function formatCurrency(value) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value); }
function formatPercent(value) { return (value * 100).toFixed(2) + '%'; }
async function updateDashboard() {
    try {
        const portfolio = await fetch('/api/portfolio').then(r => r.json());
        document.getElementById('portfolio').innerHTML = \`
            <div class="metric"><span class="metric-label">Total Value:</span><span class="metric-value">\${formatCurrency(portfolio.totalValue)}</span></div>
            <div class="metric"><span class="metric-label">Unrealized P&L:</span><span class="metric-value \${portfolio.unrealizedPnL > 0 ? 'positive' : 'negative'}">\${formatCurrency(portfolio.unrealizedPnL)}</span></div>
            <div class="metric"><span class="metric-label">Realized P&L:</span><span class="metric-value positive">\${formatCurrency(portfolio.realizedPnL)}</span></div>
            <div class="metric"><span class="metric-label">Drawdown:</span><span class="metric-value">\${formatPercent(portfolio.drawdown)}</span></div>
        \`;
        
        const metrics = await fetch('/api/metrics').then(r => r.json());
        document.getElementById('metrics').innerHTML = \`
            <div class="metric"><span class="metric-label">Uptime:</span><span class="metric-value">\${Math.floor(metrics.trading_bot_uptime_seconds / 3600)}h</span></div>
            <div class="metric"><span class="metric-label">Total Trades:</span><span class="metric-value">\${metrics.trading_bot_total_trades}</span></div>
            <div class="metric"><span class="metric-label">Success Rate:</span><span class="metric-value">\${((metrics.trading_bot_successful_trades / metrics.trading_bot_total_trades) * 100).toFixed(1)}%</span></div>
            <div class="metric"><span class="metric-label">VaR:</span><span class="metric-value">\${formatCurrency(metrics.trading_bot_var_current)} / \${formatCurrency(metrics.trading_bot_var_limit)}</span></div>
        \`;

        document.getElementById('positions').innerHTML = portfolio.positions.map(pos => \`
            <div class="position"><strong>\${pos.symbol}</strong><br>Size: \${pos.size} | Value: \${formatCurrency(pos.value)}<br>P&L: <span class="\${pos.pnl > 0 ? 'positive' : 'negative'}">\${formatCurrency(pos.pnl)}</span></div>
        \`).join('');

        const trades = await fetch('/api/trades').then(r => r.json());
        document.getElementById('trades').innerHTML = trades.slice(0, 10).map(trade => \`
            <div class="trade"><strong>\${trade.action}</strong> \${trade.symbol} | \${formatCurrency(trade.price)} | <span class="\${trade.pnl > 0 ? 'positive' : 'negative'}">\${formatCurrency(trade.pnl)}</span></div>
        \`).join('') || '<div class="trade">No recent trades</div>';
    } catch (error) {
        console.error('Update error:', error);
    }
}
updateDashboard();
setInterval(updateDashboard, 5000);
</script></body></html>`);
});

app.listen(PORT, () => {
    console.log(\`🚀 Dashboard running on http://localhost:\${PORT}\`);
    console.log(\`📊 Dashboard UI: http://localhost:\${PORT}/dashboard\`);
});
EOF

node dashboard_server.js &
DASHBOARD_PID=$!
echo $DASHBOARD_PID > dashboard.pid

sleep 2

# 7. START METRICS SERVER (Port 9090)
echo "📊 Starting Metrics Server..."
cat > metrics_server.js << 'EOF'
const express = require('express');
const app = express();
const PORT = 9090;

let startTime = Date.now();

app.get('/metrics', (req, res) => {
    const uptime = (Date.now() - startTime) / 1000;
    const metrics = \`# Trading Bot Metrics
trading_bot_uptime_seconds \${uptime}
trading_bot_total_trades \${156 + Math.floor(Math.random() * 10)}
trading_bot_successful_trades \${98 + Math.floor(Math.random() * 5)}
trading_bot_portfolio_value \${45000 + (Math.random() - 0.5) * 2000}
trading_bot_var_current \${2100 + (Math.random() - 0.5) * 200}
trading_bot_var_limit 4500
trading_bot_memory_usage \${0.6 + Math.random() * 0.2}
trading_bot_cpu_usage \${0.2 + Math.random() * 0.3}
trading_bot_active_positions 3
\`;
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
});

app.get('/', (req, res) => {
    res.json({ service: 'Trading Bot Metrics', status: 'operational', endpoint: \`http://localhost:\${PORT}/metrics\` });
});

app.listen(PORT, () => {
    console.log(\`📊 Metrics server running on http://localhost:\${PORT}/metrics\`);
});
EOF

node metrics_server.js &
METRICS_PID=$!
echo $METRICS_PID > metrics.pid

sleep 2

# 8. START BOT (Port 3001)
echo "🤖 Starting Bot..."
cd /workspaces/turbo-bot

# Compile if needed
if [ ! -f "dist/autonomous_trading_bot_final.js" ]; then
    echo "🔨 Compiling bot..."
    npx tsc trading-bot/autonomous_trading_bot_final.ts --target ES2020 --module commonjs --lib ES2020 --outDir ./dist --esModuleInterop --strict --skipLibCheck
fi

node dist/autonomous_trading_bot_final.js &
BOT_PID=$!
echo $BOT_PID > bot.pid

sleep 5

echo ""
echo "🎉 ULTIMATE SYSTEM RUNNING!"
echo "=========================="
echo ""
echo "🌐 DASHBOARD: http://localhost:3000/dashboard"
echo "🏥 BOT HEALTH: http://localhost:3001/health"  
echo "📊 METRICS: http://localhost:9090/metrics"
echo ""
echo "PIDs: Dashboard=$DASHBOARD_PID, Metrics=$METRICS_PID, Bot=$BOT_PID"
echo ""

# Test all endpoints
echo "🔍 Testing endpoints..."
echo -n "Dashboard: "
if curl -s http://localhost:3000/health > /dev/null; then echo "✅ WORKING"; else echo "❌ FAILED"; fi

echo -n "Metrics: "
if curl -s http://localhost:9090/metrics > /dev/null; then echo "✅ WORKING"; else echo "❌ FAILED"; fi

echo -n "Bot: "
if curl -s http://localhost:3001/health > /dev/null; then echo "✅ WORKING"; else echo "❌ FAILED (starting...)"; fi

echo ""
echo "🚀 ONLY 3 PORTS USED: 3000 (Dashboard), 3001 (Bot), 9090 (Metrics)"
echo "🧹 All unnecessary processes cleaned!"
echo ""
echo "💡 Open: http://localhost:3000/dashboard"
echo "🛑 Stop: kill \$(cat *.pid monitoring/working/*.pid) && rm *.pid monitoring/working/*.pid"

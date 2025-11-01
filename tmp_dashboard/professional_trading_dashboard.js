"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const axios_1 = __importDefault(require("axios"));
class ProfessionalTradingDashboard {
    constructor() {
        this.port = 3002;
        this.app = (0, express_1.default)();
        this.server = (0, http_1.createServer)(this.app);
        this.io = new socket_io_1.Server(this.server);
        this.setupRoutes();
        this.setupWebSocket();
    }
    setupRoutes() {
        // Middleware
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.static('public'));
        this.app.get('/', (req, res) => {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(this.generateProfessionalDashboard());
        });
        this.app.get('/health', (req, res) => {
            res.json({ status: 'OK', timestamp: Date.now() });
        });
        this.app.get('/api/market-data', async (req, res) => {
            try {
                const cryptoData = await this.fetchCryptoPrices();
                res.json(cryptoData);
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to fetch market data' });
            }
        });
        // Endpoint dla danych rynkowych z parametrami
        this.app.get('/api/market-data/:symbol/:timeframe', async (req, res) => {
            try {
                const { symbol, timeframe } = req.params;
                const candleData = this.generateMockCandleData(symbol, timeframe);
                res.json({
                    symbol: symbol,
                    timeframe: timeframe,
                    data: candleData
                });
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to fetch market data' });
            }
        });
        // Endpoint dla danych portfela
        this.app.get('/api/portfolio-performance', async (req, res) => {
            try {
                const portfolioData = this.generateMockPortfolioData();
                res.json(portfolioData);
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to fetch portfolio data' });
            }
        });
        // Endpoint dla sygnałów strategii
        this.app.get('/api/strategy-signals/:strategy', async (req, res) => {
            try {
                const { strategy } = req.params;
                const signals = this.generateMockStrategySignals(strategy);
                res.json({ signals });
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to fetch strategy signals' });
            }
        });
    }
    async fetchCryptoPrices() {
        try {
            // Próba Binance API
            const binanceResponse = await axios_1.default.get('https://api.binance.com/api/v3/ticker/24hr', {
                timeout: 5000
            });
            const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
            const cryptoData = [];
            for (const symbol of symbols) {
                const ticker = binanceResponse.data.find((t) => t.symbol === symbol);
                if (ticker) {
                    cryptoData.push({
                        symbol: symbol,
                        price: parseFloat(ticker.lastPrice),
                        change: parseFloat(ticker.priceChangePercent),
                        volume: parseFloat(ticker.volume),
                        high: parseFloat(ticker.highPrice),
                        low: parseFloat(ticker.lowPrice),
                        source: 'binance'
                    });
                }
            }
            if (cryptoData.length > 0) {
                console.log(`📊 Updated crypto prices: ${cryptoData.map(d => `${d.symbol}: $${d.price.toLocaleString()}`).join(', ')}`);
                return cryptoData;
            }
        }
        catch (binanceError) {
            console.log('⚠️ Binance API error, trying CoinGecko...');
        }
        try {
            // Fallback do CoinGecko API
            const coingeckoResponse = await axios_1.default.get('https://api.coingecko.com/api/v3/simple/price', {
                params: {
                    ids: 'bitcoin,ethereum,solana',
                    vs_currencies: 'usd',
                    include_24hr_change: 'true',
                    include_24hr_vol: 'true'
                },
                timeout: 5000
            });
            const data = coingeckoResponse.data;
            return [
                {
                    symbol: 'BTCUSDT',
                    price: data.bitcoin?.usd || 0,
                    change: data.bitcoin?.usd_24h_change || 0,
                    volume: data.bitcoin?.usd_24h_vol || 0,
                    high: (data.bitcoin?.usd || 0) * 1.02,
                    low: (data.bitcoin?.usd || 0) * 0.98,
                    source: 'coingecko'
                },
                {
                    symbol: 'ETHUSDT',
                    price: data.ethereum?.usd || 0,
                    change: data.ethereum?.usd_24h_change || 0,
                    volume: data.ethereum?.usd_24h_vol || 0,
                    high: (data.ethereum?.usd || 0) * 1.02,
                    low: (data.ethereum?.usd || 0) * 0.98,
                    source: 'coingecko'
                },
                {
                    symbol: 'SOLUSDT',
                    price: data.solana?.usd || 0,
                    change: data.solana?.usd_24h_change || 0,
                    volume: data.solana?.usd_24h_vol || 0,
                    high: (data.solana?.usd || 0) * 1.02,
                    low: (data.solana?.usd || 0) * 0.98,
                    source: 'coingecko'
                }
            ];
        }
        catch (coingeckoError) {
            console.log('⚠️ Both APIs failed, using mock data');
            return this.getMockCryptoData();
        }
    }
    getMockCryptoData() {
        return [
            {
                symbol: 'BTCUSDT',
                price: 65000 + Math.random() * 10000,
                change: (Math.random() - 0.5) * 10,
                volume: 1000000 + Math.random() * 500000,
                high: 75000,
                low: 60000,
                source: 'mock'
            },
            {
                symbol: 'ETHUSDT',
                price: 3500 + Math.random() * 1000,
                change: (Math.random() - 0.5) * 8,
                volume: 500000 + Math.random() * 250000,
                high: 4200,
                low: 3200,
                source: 'mock'
            },
            {
                symbol: 'SOLUSDT',
                price: 150 + Math.random() * 100,
                change: (Math.random() - 0.5) * 12,
                volume: 100000 + Math.random() * 50000,
                high: 220,
                low: 130,
                source: 'mock'
            }
        ];
    }
    generateMockCandleData(symbol, timeframe) {
        const candleCount = 50;
        const basePrice = symbol === 'BTCUSDT' ? 45000 : symbol === 'ETHUSDT' ? 2800 : 140;
        const now = Date.now();
        const intervalMs = this.getIntervalMs(timeframe);
        const candles = [];
        for (let i = candleCount - 1; i >= 0; i--) {
            const timestamp = now - i * intervalMs;
            const open = basePrice + Math.sin(i / 5) * 2000 + (Math.random() - 0.5) * 500;
            const close = open + (Math.random() - 0.5) * 1000;
            const high = Math.max(open, close) + Math.random() * 500;
            const low = Math.min(open, close) - Math.random() * 500;
            const volume = Math.random() * 1000 + 500;
            candles.push({
                timestamp,
                open: parseFloat(open.toFixed(2)),
                high: parseFloat(high.toFixed(2)),
                low: parseFloat(low.toFixed(2)),
                close: parseFloat(close.toFixed(2)),
                volume: parseFloat(volume.toFixed(2))
            });
        }
        return candles;
    }
    getIntervalMs(timeframe) {
        const intervals = {
            '1m': 60 * 1000,
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '4h': 4 * 60 * 60 * 1000,
            '1d': 24 * 60 * 60 * 1000
        };
        return intervals[timeframe] || intervals['15m'];
    }
    generateMockPortfolioData() {
        return {
            totalValue: 12543.67,
            dailyPnL: 234.12,
            weeklyPnL: 1023.45,
            totalReturn: 25.44,
            sharpeRatio: 2.34,
            positions: [
                {
                    symbol: 'BTCUSDT',
                    side: 'LONG',
                    size: 0.25,
                    entryPrice: 44200,
                    currentPrice: 45100,
                    pnl: 225
                },
                {
                    symbol: 'ETHUSDT',
                    side: 'SHORT',
                    size: 1.5,
                    entryPrice: 2820,
                    currentPrice: 2780,
                    pnl: 60
                }
            ],
            history: [
                {
                    date: '2025-10-05',
                    symbol: 'BTCUSDT',
                    type: 'KUP',
                    price: 45000,
                    amount: 0.1,
                    pnl: 200
                },
                {
                    date: '2025-10-04',
                    symbol: 'ETHUSDT',
                    type: 'SPRZEDAJ',
                    price: 2800,
                    amount: 1,
                    pnl: -50
                }
            ],
            totalPnL: 180,
            winRate: 66.7,
            averageWin: 115,
            averageLoss: -50
        };
    }
    generateMockStrategySignals(strategy) {
        return [
            {
                timestamp: Date.now() - 30 * 60 * 1000,
                type: 'KUP',
                price: 45200,
                strategy: strategy,
                confidence: 0.85,
                reason: 'RSI oversold + bullish MACD',
                dataIndex: 35
            },
            {
                timestamp: Date.now() - 60 * 60 * 1000,
                type: 'SPRZEDAJ',
                price: 44800,
                strategy: strategy,
                confidence: 0.78,
                reason: 'RSI overbought + bearish divergence',
                dataIndex: 30
            }
        ];
    }
    setupWebSocket() {
        this.io.on('connection', (socket) => {
            console.log('🔌 Client connected to dashboard');
            const sendMarketUpdate = async () => {
                try {
                    const cryptoData = await this.fetchCryptoPrices();
                    const btcData = cryptoData.find(d => d.symbol === 'BTCUSDT');
                    if (btcData) {
                        const tick = {
                            timestamp: Date.now(),
                            price: btcData.price,
                            volume: btcData.volume,
                            change: btcData.change,
                            symbol: btcData.symbol,
                            source: btcData.source
                        };
                        socket.emit('market-tick', tick);
                        socket.emit('crypto-update', cryptoData);
                    }
                }
                catch (error) {
                    console.error('Error sending market update:', error);
                }
            };
            // Wyślij dane natychmiast po połączeniu
            sendMarketUpdate();
            // Aktualizuj dane co 30 sekund
            const interval = setInterval(sendMarketUpdate, 30000);
            socket.on('disconnect', () => {
                console.log('🔌 Client disconnected');
                clearInterval(interval);
            });
        });
    }
    generateProfessionalDashboard() {
        return `
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏛️ Profesjonalny Terminal Handlowy</title>
    
    <!-- Biblioteki handlowe -->
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
    <!-- Usunięto problematyczną bibliotekę chartjs-chart-financial -->
    
    <!-- Czcionki -->
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <script>
        // Globalny monitor błędów runtime + patch console
        (function(){
            const overlayId = 'global-error-overlay';
            function ensureOverlay(){
                let el = document.getElementById(overlayId);
                if(!el){
                    el = document.createElement('div');
                    el.id = overlayId;
                    el.style.position='fixed';
                    el.style.top='0';
                    el.style.right='0';
                    el.style.zIndex='99999';
                    el.style.maxWidth='480px';
                    el.style.font='12px JetBrains Mono,monospace';
                    el.style.background='rgba(20,20,28,0.92)';
                    el.style.border='1px solid #ff4d4f';
                    el.style.boxShadow='0 0 12px rgba(255,77,79,0.6)';
                    el.style.color='#fefefe';
                    el.style.padding='8px 10px';
                    el.style.overflowY='auto';
                    el.style.maxHeight='60vh';
                    el.style.backdropFilter='blur(4px)';
                    el.innerHTML = '<div style="font-weight:600;margin-bottom:4px;color:#ff6b6b">GLOBAL ERROR MONITOR</div><div id="error-log"></div><button id="clear-errors" style="margin-top:6px;background:#222;border:1px solid #555;color:#ddd;padding:3px 6px;cursor:pointer;font-size:11px">Wyczyść</button>';
                    document.body.appendChild(el);
                    document.getElementById('clear-errors').onclick=function(){document.getElementById('error-log').innerHTML='';};
                }
                return el;
            }
            function log(type,msg,detail){
                const root = ensureOverlay().querySelector('#error-log');
                const row = document.createElement('div');
                row.style.borderBottom='1px solid #333';
                row.style.padding='2px 0 4px';
                row.innerHTML = '<span style="color:#888">'+new Date().toLocaleTimeString()+'</span> <span style="color:'+(type==='ERR'?'#ff6b6b':(type==='WARN'?'#ffb800':'#00d4aa'))+'">['+type+']</span> '+(msg||'')+(detail?'<div style="white-space:pre-wrap;color:#bbb;margin-top:2px">'+detail+'</div>':'');
                root.prepend(row);
            }
            const originalError = console.error;
            const originalWarn = console.warn;
            const originalInfo = console.info;
            console.error = function(){ log('ERR', arguments[0], Array.prototype.slice.call(arguments,1).map(a=> (a && a.stack) ? a.stack : JSON.stringify(a)).join('\n')); return originalError.apply(this,arguments); };
            console.warn = function(){ log('WARN', arguments[0], Array.prototype.slice.call(arguments,1).map(a=> typeof a==='object'? JSON.stringify(a): String(a)).join('\n')); return originalWarn.apply(this,arguments); };
            console.info = function(){ log('INFO', arguments[0]); return originalInfo.apply(this,arguments); };
            window.addEventListener('error', function(e){ log('ERR','Uncaught: '+e.message, (e.error && e.error.stack)||''); });
            window.addEventListener('unhandledrejection', function(e){ log('ERR','Promise rejection', (e.reason && e.reason.stack) || JSON.stringify(e.reason)); });
            log('INFO','Global error monitor aktywny');
        })();
    </script>
    
    <style>
        :root {
            --bg-primary: #0B0E14;
            --bg-secondary: #1A1D24;
            --bg-tertiary: #2A2D35;
            --bg-chart: #0F1419;
            --color-bull: #00D4AA;
            --color-bear: #FF6B6B;
            --color-neutral: #FFB800;
            --accent-primary: #00D4AA;
            --accent-secondary: #0096C7;
            --accent-tertiary: #7209B7;
            --text-primary: #E8E8E8;
            --text-secondary: #B8BCC8;
            --text-tertiary: #868A96;
            --border-primary: #2A2D35;
            --border-secondary: #3A3D45;
            --divider: #404348;
            --status-online: #00D4AA;
            --status-offline: #FF6B6B;
            --status-warning: #FFB800;
            --shadow-primary: 0 4px 20px rgba(0, 0, 0, 0.4);
            --shadow-secondary: 0 2px 10px rgba(0, 0, 0, 0.3);
            --glow-accent: 0 0 20px rgba(0, 212, 170, 0.3);
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            overflow: hidden;
            height: 100vh;
        }
        
        .terminal-container {
            display: grid;
            grid-template-rows: 60px 1fr 30px;
            height: 100vh;
            background: var(--bg-primary);
        }
        
        .top-bar {
            background: var(--bg-secondary);
            border-bottom: 2px solid var(--accent-primary);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            box-shadow: var(--shadow-secondary);
        }
        
        .terminal-logo {
            display: flex;
            align-items: center;
            gap: 15px;
            font-weight: 700;
            font-size: 18px;
            color: var(--accent-primary);
        }
        
        .status-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--status-online);
            animation: pulse-green 2s infinite;
        }
        
        @keyframes pulse-green {
            0%, 100% { opacity: 1; box-shadow: 0 0 10px var(--status-online); }
            50% { opacity: 0.6; }
        }
        
        .market-status {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        .market-pair {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .pair-name {
            font-size: 12px;
            color: var(--text-tertiary);
            font-weight: 500;
        }
        
        .pair-price {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
            font-size: 14px;
        }
        
        .price-positive { color: var(--color-bull); }
        .price-negative { color: var(--color-bear); }
        
        .timeframe-selector {
            display: flex;
            gap: 5px;
        }
        
        .timeframe-btn {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-secondary);
            color: var(--text-secondary);
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            font-weight: 500;
        }
        
        .timeframe-btn:hover {
            background: var(--accent-secondary);
            color: white;
        }
        
        .timeframe-btn.active {
            background: var(--accent-primary);
            color: var(--bg-primary);
            box-shadow: var(--glow-accent);
        }
        
        .workspace {
            display: grid;
            grid-template-columns: 1fr 300px 280px;
            gap: 15px;
            background: var(--bg-primary);
            height: calc(100vh - 90px);
            padding: 15px;
            overflow: hidden;
        }
        
        .main-chart-container {
            display: flex;
            flex-direction: column;
            background: var(--bg-primary);
            overflow: hidden;
            width: 70%;
            min-width: 600px;
            max-width: 85%;
            border-right: 3px solid var(--border-primary);
            position: relative;
        }
        
        .chart-resize-handle {
            position: absolute;
            top: 0;
            right: -6px;
            bottom: 0;
            width: 12px;
            background: linear-gradient(90deg, transparent, var(--accent-primary), transparent);
            cursor: ew-resize;
            z-index: 100;
            opacity: 0.8;
            transition: all 0.3s ease;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .chart-resize-handle::before {
            content: '⋮⋮';
            color: white;
            font-size: 14px;
            font-weight: bold;
            letter-spacing: -2px;
            opacity: 0.8;
        }
        
        .chart-resize-handle:hover {
            background: linear-gradient(90deg, rgba(0, 212, 170, 0.2), var(--accent-primary), rgba(0, 212, 170, 0.2));
            opacity: 1;
            width: 16px;
            right: -8px;
            box-shadow: 0 0 12px rgba(0, 212, 170, 0.6);
        }
        
        .chart-resize-corner {
            position: absolute;
            bottom: -3px;
            right: -3px;
            width: 25px;
            height: 25px;
            cursor: nwse-resize;
            z-index: 101;
            background: linear-gradient(135deg, transparent 40%, var(--accent-primary) 50%, transparent 60%);
            border-radius: 0 0 8px 0;
            opacity: 0.7;
            transition: all 0.3s ease;
        }
        
        .chart-resize-corner::before {
            content: '⤢';
            position: absolute;
            bottom: 2px;
            right: 2px;
            color: white;
            font-size: 12px;
            font-weight: bold;
        }
        
        .chart-resize-corner:hover {
            background: linear-gradient(135deg, rgba(0, 212, 170, 0.2) 30%, var(--accent-primary) 50%, rgba(0, 212, 170, 0.2) 70%);
            opacity: 1;
            width: 30px;
            height: 30px;
            bottom: -5px;
            right: -5px;
            box-shadow: 0 0 15px rgba(0, 212, 170, 0.8);
        }
        
        .chart-resize-bottom {
            position: absolute;
            bottom: -6px;
            left: 0;
            right: 30px;
            height: 12px;
            background: linear-gradient(180deg, transparent, var(--accent-secondary), transparent);
            cursor: ns-resize;
            z-index: 100;
            opacity: 0.7;
            transition: all 0.3s ease;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .chart-resize-bottom::before {
            content: '⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯';
            color: white;
            font-size: 10px;
            font-weight: bold;
            opacity: 0.8;
        }
        
        .chart-resize-bottom:hover {
            background: linear-gradient(180deg, rgba(0, 150, 199, 0.2), var(--accent-secondary), rgba(0, 150, 199, 0.2));
            opacity: 1;
            height: 16px;
            bottom: -8px;
            box-shadow: 0 0 12px rgba(0, 150, 199, 0.6);
        }
        
        .resize-tooltip {
            position: absolute;
            background: rgba(26, 29, 36, 0.95);
            color: var(--text-primary);
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            white-space: nowrap;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            border: 1px solid var(--border-secondary);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .chart-resize-handle:hover::after,
        .chart-resize-bottom:hover::after,
        .chart-resize-corner:hover::after {
            content: attr(data-tooltip);
            position: absolute;
            background: rgba(26, 29, 36, 0.95);
            color: var(--text-primary);
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            white-space: nowrap;
            z-index: 1000;
            opacity: 1;
            border: 1px solid var(--border-secondary);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .chart-resize-handle:hover::after {
            top: 50%;
            left: -120px;
            transform: translateY(-50%);
        }
        
        .chart-resize-bottom:hover::after {
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-bottom: 8px;
        }
        
        .chart-resize-corner:hover::after {
            bottom: 100%;
            right: 0;
            margin-bottom: 8px;
        }
        
        .chart-area {
            background: var(--bg-secondary);
            border-radius: 8px;
            overflow: hidden;
            flex: 8;
            display: flex;
            flex-direction: column;
            position: relative;
            min-height: 400px;
        }
        
        .price-chart-container {
            flex: 7;
            position: relative;
            background: var(--bg-primary);
            border-bottom: 1px solid var(--border-primary);
        }
        
        .chart-header {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(11, 14, 20, 0.95);
            backdrop-filter: blur(10px);
            padding: 10px 20px;
            border-bottom: 1px solid var(--border-secondary);
            z-index: 10;
        }
        
        .chart-title {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .symbol-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .symbol-name {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            font-size: 16px;
            color: var(--accent-primary);
        }
        
        .current-price {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
            font-size: 20px;
        }
        
        .price-change {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 500;
            font-size: 14px;
            padding: 4px 8px;
            border-radius: 4px;
            background: rgba(0, 212, 170, 0.1);
        }
        
        .chart-controls {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .chart-type-selector {
            display: flex;
            gap: 5px;
        }
        
        .chart-type-btn {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-secondary);
            color: var(--text-secondary);
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.3s ease;
        }
        
        .chart-type-btn.active {
            background: var(--accent-primary);
            color: var(--bg-primary);
        }
        
        .indicator-toggle {
            background: transparent;
            border: 1px solid var(--border-secondary);
            color: var(--text-secondary);
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.3s ease;
        }
        
        .indicator-toggle:hover,
        .indicator-toggle.active {
            background: var(--accent-tertiary);
            color: white;
        }
        
        .chart-container {
            position: absolute;
            top: 60px;
            left: 0;
            right: 0;
            bottom: 0;
            padding: 10px;
        }
        
        .price-chart-container .chart-container {
            position: relative;
            flex: 1;
            width: 100%;
            height: 100%;
            background: var(--bg-primary);
            border-radius: 4px;
        }
        
        #main-chart {
            width: 100% !important;
            height: 100% !important;
            display: block;
            background: var(--bg-primary);
            min-height: 350px;
            border: 1px solid var(--border-primary);
            border-radius: 4px;
        }
        
        .chart-container {
            background: var(--bg-primary);
            border: 1px solid var(--border-secondary);
            border-radius: 6px;
            position: relative;
        }
        
        .chart-loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: var(--text-secondary);
            font-size: 14px;
            z-index: 10;
        }
        
        .subpanel-header {
            background: var(--bg-tertiary);
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border-secondary);
            flex-shrink: 0;
        }
        
        .subpanel-chart {
            flex: 1;
            position: relative;
            padding: 3px;
        }
        
        .subpanel-chart canvas {
            width: 100% !important;
            height: 100% !important;
        }
        
        .portfolio-panel {
            width: 300px;
            flex-shrink: 0;
            background: var(--bg-secondary);
            border: 1px solid var(--border-primary);
            display: flex;
            flex-direction: column;
            border-radius: 8px;
            margin-left: 3px;
        }
        
        .panel-header {
            background: var(--bg-tertiary);
            padding: 12px 15px;
            border-bottom: 1px solid var(--border-secondary);
            font-weight: 600;
            font-size: 14px;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .portfolio-summary {
            padding: 15px;
            border-bottom: 1px solid var(--border-primary);
        }
        
        .portfolio-value {
            text-align: center;
            margin-bottom: 15px;
        }
        
        .total-value {
            font-family: 'JetBrains Mono', monospace;
            font-size: 24px;
            font-weight: 700;
            color: var(--accent-primary);
        }
        
        .value-label {
            font-size: 12px;
            color: var(--text-tertiary);
            margin-top: 5px;
        }
        
        .pnl-summary {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        
        .pnl-item {
            text-align: center;
            padding: 8px;
            background: var(--bg-primary);
            border-radius: 6px;
        }
        
        .pnl-label {
            font-size: 11px;
            color: var(--text-tertiary);
            margin-bottom: 4px;
        }
        
        .pnl-value {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
            font-size: 13px;
        }
        
        .tabs {
            display: flex;
            border-bottom: 1px solid var(--border-secondary);
        }
        
        .tab {
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            font-size: 12px;
            color: var(--text-secondary);
            transition: all 0.3s ease;
        }
        
        .tab:hover {
            color: var(--text-primary);
        }
        
        .tab.active {
            border-bottom: 2px solid var(--accent-primary);
            color: var(--text-primary);
        }
        
        .tab-content {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
        }
        
        .tab-content.hidden {
            display: none;
        }
        
        .history-table, .pnl-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .history-table th, .history-table td, .pnl-table th, .pnl-table td {
            padding: 8px;
            border-bottom: 1px solid var(--border-secondary);
            text-align: left;
            font-size: 12px;
        }
        
        .history-table th, .pnl-table th {
            color: var(--text-tertiary);
            font-weight: 500;
        }
        
        .positions-list {
            overflow-y: auto;
            padding: 15px;
        }
        
        .position-item {
            background: var(--bg-primary);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 8px;
            border-left: 3px solid var(--color-bull);
        }
        
        .position-item.short {
            border-left-color: var(--color-bear);
        }
        
        .position-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .position-symbol {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
            font-size: 14px;
        }
        
        .position-side {
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
        }
        
        .position-side.long {
            background: rgba(0, 212, 170, 0.2);
            color: var(--color-bull);
        }
        
        .position-side.short {
            background: rgba(255, 107, 107, 0.2);
            color: var(--color-bear);
        }
        
        .position-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            font-size: 12px;
        }
        
        .detail-item {
            display: flex;
            justify-content: space-between;
        }
        
        .detail-label {
            color: var(--text-tertiary);
        }
        
        .detail-value {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 500;
        }
        
        .strategy-panel {
            background: var(--bg-secondary);
            border: 1px solid var(--border-primary);
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 15px;
            overflow-y: auto;
            max-height: calc(100vh - 120px);
        }
        
        .strategy-card {
            background: var(--bg-primary);
            border-radius: 8px;
            padding: 12px;
            border: 1px solid var(--border-secondary);
            transition: all 0.3s ease;
            cursor: pointer;
            min-height: 120px;
        }
        
        .strategy-card:hover {
            border-color: var(--accent-secondary);
            box-shadow: 0 4px 15px rgba(0, 150, 199, 0.2);
            transform: translateY(-2px);
        }
        
        .strategy-card.active {
            border-color: var(--color-bull);
            background: linear-gradient(135deg, rgba(0, 212, 170, 0.1), rgba(0, 150, 199, 0.05));
            box-shadow: 0 6px 20px rgba(0, 212, 170, 0.3);
        }
        
        .strategy-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        
        .strategy-name {
            font-weight: 600;
            font-size: 14px;
            color: var(--text-primary);
        }
        
        .strategy-status {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--status-online);
        }
        
        .strategy-status.inactive {
            background: var(--status-offline);
        }
        
        .strategy-metrics {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            font-size: 11px;
        }
        
        .metric-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .metric-label {
            color: var(--text-tertiary);
        }
        
        .metric-value {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 500;
        }
        
        .status-bar {
            background: var(--bg-secondary);
            border-top: 1px solid var(--border-primary);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            font-size: 12px;
            color: var(--text-tertiary);
        }
        
        .status-left {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        .connection-status {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .connection-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--status-online);
        }
        
        .status-right {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .signal-overlay {
            position: absolute;
            z-index: 20;
            pointer-events: none;
        }
        
        .buy-signal {
            background: var(--color-bull);
            color: var(--bg-primary);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
        }
        
        .sell-signal {
            background: var(--color-bear);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
        }
        
        @media (max-width: 1400px) {
            .workspace {
                grid-template-columns: 1fr 250px;
            }
        }
        
        @media (max-width: 1200px) {
            .workspace {
                grid-template-columns: 1fr;
                grid-template-rows: 2fr 1fr;
            }
            
            .strategy-panel {
                grid-template-columns: 1fr 1fr;
            }
        }
        
        .loading-spinner {
            border: 2px solid var(--border-secondary);
            border-top: 2px solid var(--accent-primary);
            border-radius: 50%;
            width: 20px;
            height: 20px;
            animation: spin 1s linear infinite;
            margin: auto;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .chart-tooltip {
            background: var(--bg-tertiary) !important;
            border: 1px solid var(--border-secondary) !important;
            border-radius: 6px !important;
            color: var(--text-primary) !important;
            font-family: 'JetBrains Mono', monospace !important;
            font-size: 12px !important;
        }
        
        .glow-effect {
            box-shadow: var(--glow-accent);
        }
        
        .highlight-border {
            border: 1px solid var(--accent-primary);
        }
        
        .success-text { color: var(--color-bull); }
        .error-text { color: var(--color-bear); }
        .warning-text { color: var(--color-neutral); }
        .accent-text { color: var(--accent-primary); }
        
        .text-mono {
            font-family: 'JetBrains Mono', monospace;
        }
        
        .font-weight-600 {
            font-weight: 600;
        }
        
        .opacity-60 {
            opacity: 0.6;
        }
        
        .cursor-pointer {
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="terminal-container">
        <header class="top-bar">
            <div class="terminal-logo">
                <div class="status-indicator"></div>
                <i class="fas fa-chart-line"></i>
                <span>Profesjonalny Terminal Handlowy</span>
                <span style="font-size: 12px; opacity: 0.7;">v4.0.4</span>
            </div>
            
            <div class="market-status" id="market-status">
                <div class="market-pair">
                    <div class="pair-name">BTCUSDT</div>
                    <div class="pair-price price-positive" id="btc-price">$45,247.82</div>
                </div>
                <div class="market-pair">
                    <div class="pair-name">ETHUSDT</div>
                    <div class="pair-price price-negative" id="eth-price">$2,789.45</div>
                </div>
                <div class="market-pair">
                    <div class="pair-name">SOLUSDT</div>
                    <div class="pair-price price-positive" id="sol-price">$142.67</div>
                </div>
            </div>
            
            <div class="timeframe-selector">
                <button class="timeframe-btn" data-timeframe="1m">1m</button>
                <button class="timeframe-btn" data-timeframe="5m">5m</button>
                <button class="timeframe-btn active" data-timeframe="15m">15m</button>
                <button class="timeframe-btn" data-timeframe="1h">1h</button>
                <button class="timeframe-btn" data-timeframe="4h">4h</button>
                <button class="timeframe-btn" data-timeframe="1d">1d</button>
            </div>
        </header>

        <main class="workspace">
            <div class="main-chart-container">
                <section class="chart-area">
                    <div class="price-chart-container">
                        <div class="chart-header">
                            <div class="chart-title">
                                <div class="symbol-info">
                                    <div class="symbol-name">BTCUSDT</div>
                                    <div class="current-price price-positive">$45,247.82</div>
                                    <div class="price-change price-positive">+2.34%</div>
                                </div>
                                <div class="chart-controls">
                                    <div class="chart-type-selector">
                                        <button class="chart-type-btn active" data-chart-type="line">Liniowy</button>
                                        <button class="chart-type-btn" data-chart-type="area">Powierzchniowy</button>
                                    </div>
                                    <button class="indicator-toggle active" data-indicator="rsi">RSI</button>
                                    <button class="indicator-toggle active" data-indicator="bb">BB</button>
                                    <button class="indicator-toggle active" data-indicator="volume">VOL</button>
                                </div>
                            </div>
                        </div>
                        <div class="chart-container">
                            <div class="chart-loading" id="chart-loading">📊 Ładowanie wykresu...</div>
                            <canvas id="main-chart"></canvas>
                        </div>
                    </div>
                    
                    <div class="chart-resize-handle" id="chart-resize-handle" data-tooltip="↔ Przeciągnij aby zmienić szerokość wykresu" title="Zmień szerokość wykresu"></div>
                    <div class="chart-resize-bottom" id="chart-resize-bottom" data-tooltip="↕ Przeciągnij aby zmienić wysokość wykresu" title="Zmień wysokość wykresu"></div>
                    <div class="chart-resize-corner" id="chart-resize-corner" data-tooltip="⤢ Przeciągnij aby zmienić szerokość i wysokość" title="Zmień rozmiar wykresu"></div>
                </section>
            </div>

            <aside class="portfolio-panel">
                <div class="panel-header">
                    <i class="fas fa-wallet"></i> Portfel
                </div>
                <div class="portfolio-summary">
                    <div class="portfolio-value">
                        <div class="total-value" id="total-value">$12,543.67</div>
                        <div class="value-label">Całkowita wartość portfela</div>
                    </div>
                    <div class="pnl-summary">
                        <div class="pnl-item">
                            <div class="pnl-label">Dzienny zysk/strata</div>
                            <div class="pnl-value success-text" id="daily-pnl">+$234.12</div>
                        </div>
                        <div class="pnl-item">
                            <div class="pnl-label">Tygodniowy zysk/strata</div>
                            <div class="pnl-value success-text" id="weekly-pnl">+$1,023.45</div>
                        </div>
                        <div class="pnl-item">
                            <div class="pnl-label">Całkowity zwrot</div>
                            <div class="pnl-value success-text" id="total-return">+25.44%</div>
                        </div>
                        <div class="pnl-item">
                            <div class="pnl-label">Wskaźnik Sharpe’a</div>
                            <div class="pnl-value accent-text" id="sharpe-ratio">2.34</div>
                        </div>
                    </div>
                </div>
                <div class="tabs">
                    <button class="tab active" data-tab="positions">Otwarte Zlecenia</button>
                    <button class="tab" data-tab="history">Historia Transakcji</button>
                    <button class="tab" data-tab="pnl">Podsumowanie Zysków/Strat</button>
                </div>
                <div id="positions-tab" class="tab-content">
                    <div class="positions-list" id="positions-list"></div>
                </div>
                <div id="history-tab" class="tab-content hidden">
                    <table class="history-table" id="history-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Symbol</th>
                                <th>Typ</th>
                                <th>Cena</th>
                                <th>Ilość</th>
                                <th>Zysk/Strata</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
                <div id="pnl-tab" class="tab-content hidden">
                    <table class="pnl-table" id="pnl-table">
                        <thead>
                            <tr>
                                <th>Metryka</th>
                                <th>Wartość</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </aside>

            <section class="strategy-panel">
                <div class="panel-header">
                    <i class="fas fa-robot"></i> Strategie AI
                </div>
                <div class="strategy-card" data-strategy="RSI_TURBO">
                    <div class="strategy-header">
                        <div class="strategy-name">RSI Turbo Enterprise</div>
                        <div class="strategy-status"></div>
                    </div>
                    <div class="strategy-metrics">
                        <div class="metric-item">
                            <span class="metric-label">Wskaźnik sukcesu</span>
                            <span class="metric-value success-text">73.2%</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Współczynnik zysku</span>
                            <span class="metric-value success-text">1.87</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Wskaźnik Sharpe’a</span>
                            <span class="metric-value accent-text">2.34</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Maksymalna strata</span>
                            <span class="metric-value error-text">-3.21%</span>
                        </div>
                    </div>
                </div>
                
                <div class="strategy-card" data-strategy="MOMENTUM_PRO">
                    <div class="strategy-header">
                        <div class="strategy-name">Momentum Pro Enterprise</div>
                        <div class="strategy-status"></div>
                    </div>
                    <div class="strategy-metrics">
                        <div class="metric-item">
                            <span class="metric-label">Wskaźnik sukcesu</span>
                            <span class="metric-value success-text">68.7%</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Współczynnik zysku</span>
                            <span class="metric-value success-text">1.64</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Wskaźnik Sharpe’a</span>
                            <span class="metric-value accent-text">1.98</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Maksymalna strata</span>
                            <span class="metric-value error-text">-4.87%</span>
                        </div>
                    </div>
                </div>
                
                <div class="strategy-card" data-strategy="SUPERTREND">
                    <div class="strategy-header">
                        <div class="strategy-name">SuperTrend Enterprise</div>
                        <div class="strategy-status"></div>
                    </div>
                    <div class="strategy-metrics">
                        <div class="metric-item">
                            <span class="metric-label">Wskaźnik sukcesu</span>
                            <span class="metric-value success-text">71.4%</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Współczynnik zysku</span>
                            <span class="metric-value success-text">1.92</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Wskaźnik Sharpe’a</span>
                            <span class="metric-value accent-text">2.15</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Maksymalna strata</span>
                            <span class="metric-value error-text">-2.98%</span>
                        </div>
                    </div>
                </div>
            </section>
        </main>

        <footer class="status-bar">
            <div class="status-left">
                <div class="connection-status">
                    <div class="connection-dot"></div>
                    <span>Połączono z giełdą</span>
                </div>
                <div class="connection-status">
                    <div class="connection-dot"></div>
                    <span>Silnik ML aktywny</span>
                </div>
                <div class="connection-status">
                    <div class="connection-dot"></div>
                    <span>Menedżer ryzyka online</span>
                </div>
            </div>
            <div class="status-right">
                <span>Opóźnienie: 24ms</span>
                <span>Serwer: US-East-1</span>
                <span id="current-time">15:42:33 UTC</span>
            </div>
        </footer>
    </div>

    <script>
        window.onerror = function(msg, url, line, col, error) {
            console.error('🚨 Błąd JavaScript:', msg, 'w', url + ':' + line + ':' + col);
            alert('Błąd JavaScript: ' + msg);
            return false;
        };
        
        console.log('🌟 Uruchamianie skryptu panelu...');
        
        console.log('📚 Sprawdzanie bibliotek...');
        console.log('Chart.js dostępny:', typeof Chart !== 'undefined');
        console.log('Socket.io dostępny:', typeof io !== 'undefined');
        
        if (typeof Chart === 'undefined') {
            alert('Biblioteka Chart.js nie załadowała się!');
            throw new Error('Chart.js niedostępny');
        }
        
        if (typeof io === 'undefined') {
            alert('Biblioteka Socket.io nie załadowała się!');
            throw new Error('Socket.io niedostępny'); 
        }
        
        let socket;
        try {
            console.log('📡 Inicjalizacja Socket.io...');
            socket = io();
            console.log('✅ Socket.io zainicjalizowany:', socket);
        } catch (error) {
            console.error('❌ Błąd inicjalizacji Socket.io:', error);
            throw error;
        }
        
        let currentTimeframe = '15m';
        let currentSymbol = 'BTCUSDT';
        let currentChartType = 'line';
        let mainChart = null;
        let rawCandleData = [];
        let strategySignals = [];
        let currentCandleData = [];
        let activeStrategies = new Set(['RSI_TURBO', 'MOMENTUM_PRO', 'SUPERTREND']);

        document.addEventListener('DOMContentLoaded', function() {
            console.log('🌐 DOM załadowany - rozpoczęcie inicjalizacji...');
            try {
                initializeTerminal();
                setupEventListeners();
                startRealTimeUpdates();
                console.log('✅ Inicjalizacja zakończona');
            } catch (error) {
                console.error('❌ KRYTYCZNY BŁĄD podczas inicjalizacji:', error);
                alert('Inicjalizacja panelu nie powiodła się: ' + error.message);
            }
        });
        
        function calculateEMA(data, period) {
            const ema = [];
            const multiplier = 2 / (period + 1);
            
            if (data.length === 0) return [];
            
            ema[0] = data[0];
            
            for (let i = 1; i < data.length; i++) {
                if (i < period) {
                    const sum = data.slice(0, i + 1).reduce((acc, val) => acc + val, 0);
                    ema[i] = sum / (i + 1);
                } else {
                    ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
                }
            }
            
            return ema;
        }
        
        function initializeTerminal() {
            console.log('🏛️ Inicjalizacja Profesjonalnego Terminalu Handlowego...');
            
            try {
                // Sprawdzenie dostępności Chart.js
                if (typeof Chart === 'undefined') {
                    console.error('❌ Chart.js nie jest dostępny!');
                    alert('Błąd: Chart.js nie został załadowany. Sprawdź połączenie internetowe.');
                    return;
                }
                
                // Rejestracja komponentów Chart.js
                console.log('📊 Rejestracja komponentów Chart.js...');
                try {
                    Chart.register(
                        Chart.CategoryScale,
                        Chart.LinearScale,
                        Chart.TimeScale,
                        Chart.PointElement,
                        Chart.LineElement,
                        Chart.BarElement,
                        Chart.Title,
                        Chart.Tooltip,
                        Chart.Legend,
                        Chart.Filler
                    );
                    console.log('✅ Komponenty Chart.js zarejestrowane');
                } catch (chartError) {
                    console.error('❌ Błąd rejestracji Chart.js:', chartError);
                    alert('Błąd rejestracji Chart.js: ' + chartError.message);
                    return;
                }
                
                console.log('📊 Ładowanie początkowych danych...');
                loadMarketData();
                loadPortfolioData();
                loadStrategyData();
                console.log('✅ Początkowe dane załadowane');
                
                console.log('🔗 Subskrypcja aktualizacji w czasie rzeczywistym...');
                socket.emit('subscribe_market_data', ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
                socket.emit('subscribe_strategy_signals', ['RSI_TURBO', 'MOMENTUM_PRO', 'SUPERTREND']);
                console.log('✅ Subskrypcje aktywne');
                
                console.log('✅ Profesjonalny Terminal Handlowy zainicjalizowany');
            } catch (error) {
                console.error('❌ Błąd inicjalizacji terminalu:', error);
            }
        }
        
        function createMainChart(type, candleData, labels) {
            const ctx = document.getElementById('main-chart').getContext('2d');
            
            console.log('📊 Inicjalizacja głównego wykresu typu', type);
            
            let priceDataset = {
                label: 'Cena BTCUSDT',
                borderColor: '#00D4AA',
                backgroundColor: 'rgba(0, 212, 170, 0.1)',
                borderWidth: 2,
                fill: type === 'line' ? true : false,
                tension: 0.1,
                yAxisID: 'y'
            };
            
            if (type === 'area') {
                priceDataset.type = 'line';
                priceDataset.data = candleData.map(c => c.close);
                priceDataset.fill = true;
                priceDataset.backgroundColor = 'rgba(0, 212, 170, 0.2)';
            } else {
                priceDataset.type = 'line';
                priceDataset.data = candleData.map(c => c.close);
                priceDataset.fill = false;
            }
            
            mainChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        priceDataset,
                        {
                            label: 'Wolumen',
                            data: candleData.map(c => c.volume),
                            type: 'bar',
                            backgroundColor: 'rgba(0, 150, 199, 0.3)',
                            yAxisID: 'volume',
                            order: 2
                        },
                        {
                            label: 'RSI (14)',
                            data: [],
                            borderColor: '#FFD700',
                            backgroundColor: 'rgba(255, 215, 0, 0.1)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.1,
                            hidden: false,
                            pointRadius: 0,
                            yAxisID: 'rsi',
                            type: 'line'
                        },
                        {
                            label: 'Bollinger Górny',
                            data: [],
                            borderColor: '#9D4EDD',
                            backgroundColor: 'rgba(157, 78, 221, 0.1)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.1,
                            hidden: false,
                            pointRadius: 0,
                            borderDash: [5, 5],
                            yAxisID: 'y',
                            type: 'line'
                        },
                        {
                            label: 'Bollinger Dolny',
                            data: [],
                            borderColor: '#9D4EDD',
                            backgroundColor: 'rgba(157, 78, 221, 0.1)',
                            borderWidth: 2,
                            fill: '+1',
                            tension: 0.1,
                            hidden: false,
                            pointRadius: 0,
                            borderDash: [5, 5],
                            yAxisID: 'y',
                            type: 'line'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            labels: {
                                color: '#E8E8E8',
                                font: { family: 'Inter' }
                            }
                        },
                        tooltip: {
                            mode: 'point',
                            intersect: true,
                            backgroundColor: '#2A2D35',
                            titleColor: '#E8E8E8',
                            bodyColor: '#E8E8E8',
                            borderColor: '#3A3D45',
                            borderWidth: 1,
                            callbacks: {
                                title: function(context) {
                                    const datasetLabel = context[0].dataset.label;
                                    if (datasetLabel.includes('Sygnały')) {
                                        return \`\${datasetLabel.split(' ')[0]} SYGNAŁ\`;
                                    }
                                    return datasetLabel;
                                },
                                label: function(context) {
                                    const datasetLabel = context.dataset.label;
                                    if (datasetLabel.includes('Sygnały')) {
                                        const signal = strategySignals.find(s => s.dataIndex === context.dataIndex);
                                        if (signal) {
                                            return [
                                                \`Cena: $\${context.parsed.y.toLocaleString()}\`,
                                                \`Strategia: \${signal.strategy}\`,
                                                \`Pewność: \${(signal.confidence * 100).toFixed(1)}%\`,
                                                \`Powód: \${signal.reason}\`
                                            ];
                                        }
                                    }
                                    return \`\${datasetLabel}: \${context.parsed.y.toLocaleString()}\`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: getTimeUnit(currentTimeframe)
                            },
                            grid: { color: 'rgba(58, 61, 69, 0.3)' },
                            ticks: { color: '#B8BCC8' }
                        },
                        y: {
                            position: 'right',
                            grid: { color: 'rgba(58, 61, 69, 0.3)' },
                            ticks: {
                                color: '#B8BCC8',
                                callback: function(value) { return '$' + value.toLocaleString(); }
                            }
                        },
                        volume: {
                            type: 'linear',
                            position: 'left',
                            max: function(context) {
                                return context.chart.data.datasets[1].data.length === 0 ? 100 :
                                    Math.max(...context.chart.data.datasets[1].data) * 4;
                            },
                            grid: { display: false },
                            ticks: {
                                color: '#B8BCC8',
                                callback: function(value) { return (value / 1000).toFixed(0) + 'K'; }
                            }
                        },
                        rsi: {
                            type: 'linear',
                            position: 'right',
                            min: 0,
                            max: 100,
                            grid: { display: false },
                            ticks: {
                                color: '#FFD700',
                                stepSize: 20
                            }
                        }
                    },
                    interaction: { mode: 'index', intersect: false }
                }
            });
            
            generateTechnicalIndicators(candleData, labels);
            addStrategySignalsToChart();
            
            // Ukryj loading indicator
            const loadingElement = document.getElementById('chart-loading');
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            console.log('✅ Główny wykres zainicjalizowany jako', type);
            return mainChart;
        }
        
        function getTimeUnit(timeframe) {
            const units = {
                '1m': 'minute',
                '5m': 'minute',
                '15m': 'minute',
                '1h': 'hour',
                '4h': 'hour',
                '1d': 'day'
            };
            return units[timeframe] || 'minute';
        }
        
        function updateChartType(type) {
            if (type === currentChartType) return;
            currentChartType = type;
            if (mainChart) mainChart.destroy();
            mainChart = createMainChart(type, rawCandleData, mainChart ? mainChart.data.labels : []);
            synchronizeSubpanels();
        }
        

        

        
        async function loadMarketData() {
            try {
                console.log(\`📊 Ładowanie danych rynkowych dla \${currentSymbol} (\${currentTimeframe})\`);
                
                // Sprawdzenie dostępności fetch
                if (typeof fetch === 'undefined') {
                    console.error('❌ Fetch API niedostępne');
                    generateMockData();
                    return;
                }
                
                const response = await fetch(\`/api/market-data/\${currentSymbol}/\${currentTimeframe}\`);
                
                if (!response.ok) {
                    console.log(\`⚠️ API endpoint not available (status: \${response.status}), using mock data\`);
                    generateMockData();
                    return;
                }
                
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    console.log(\`⚠️ Non-JSON response, using mock data\`);
                    generateMockData();
                    return;
                }
                
                const data = await response.json();
                console.log('📈 Otrzymano dane rynkowe:', data);
                
                if (!data.data || !Array.isArray(data.data)) {
                    console.log(\`⚠️ Invalid data format, using mock data\`);
                    generateMockData();
                    return;
                }
                
                const labels = data.data.map(c => new Date(c.timestamp).toLocaleTimeString());
                rawCandleData = data.data;
                
                if (mainChart) mainChart.destroy();
                mainChart = createMainChart(currentChartType, rawCandleData, labels);
                
                setTimeout(() => generateMockSignals(labels, rawCandleData), 100);
                await loadStrategySignals();
                
            } catch (error) {
                console.error('❌ Błąd ładowania danych rynkowych:', error);
                generateMockData();
            }
        }
        
        function generateMockData() {
            const labels = [];
            const mockCandles = [];
            
            const now = Date.now();
            const basePrice = 45000;
            
            for (let i = 50; i >= 0; i--) {
                const timestamp = now - i * 5 * 60 * 1000;
                const time = new Date(timestamp);
                labels.push(time.toLocaleTimeString());
                
                const open = basePrice + Math.sin(i / 5) * 2000 + (Math.random() - 0.5) * 500;
                const close = open + (Math.random() - 0.5) * 1000;
                const high = Math.max(open, close) + Math.random() * 500;
                const low = Math.min(open, close) - Math.random() * 500;
                const volume = Math.random() * 1000 + 500;
                
                mockCandles.push({
                    timestamp: timestamp,
                    open: parseFloat(open.toFixed(2)),
                    high: parseFloat(high.toFixed(2)),
                    low: parseFloat(low.toFixed(2)),
                    close: parseFloat(close.toFixed(2)),
                    volume: parseFloat(volume.toFixed(2))
                });
            }
            
            rawCandleData = mockCandles;
            
            console.log('✅ Wygenerowano dane testowe z', mockCandles.length, 'punktami');
            if (mainChart) mainChart.destroy();
            mainChart = createMainChart(currentChartType, rawCandleData, labels);
            
            setTimeout(() => generateMockSignals(labels, rawCandleData), 100);
        }
        
        function generateTechnicalIndicators(candleData, labels) {
            console.log('📊 Generowanie wskaźników technicznych...');
            
            const prices = candleData.map(c => c.close);
            
            const rsiData = [];
            const macdData = [];
            const macdSignal = [];
            const bollingerUpper = [];
            const bollingerLower = [];
            
            const rsiPeriod = 14;
            let gains = [];
            let losses = [];
            
            for (let i = 0; i < prices.length; i++) {
                if (i === 0) {
                    rsiData.push(50);
                    continue;
                }
                
                const change = prices[i] - prices[i - 1];
                gains.push(change > 0 ? change : 0);
                losses.push(change < 0 ? Math.abs(change) : 0);
                
                if (i >= rsiPeriod) {
                    gains = gains.slice(-rsiPeriod);
                    losses = losses.slice(-rsiPeriod);
                    const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / rsiPeriod;
                    const avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / rsiPeriod;
                    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
                    const rsi = 100 - (100 / (1 + rs));
                    rsiData.push(Math.max(0, Math.min(100, rsi)));
                } else {
                    const partialGains = gains.slice(0, i);
                    const partialLosses = losses.slice(0, i);
                    const avgGain = partialGains.reduce((sum, gain) => sum + gain, 0) / partialGains.length;
                    const avgLoss = partialLosses.reduce((sum, loss) => sum + loss, 0) / partialLosses.length;
                    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
                    const rsi = 100 - (100 / (1 + rs));
                    rsiData.push(Math.max(0, Math.min(100, rsi)));
                }
            }
            
            const ema12 = calculateEMA(prices, 12);
            const ema26 = calculateEMA(prices, 26);
            
            for (let i = 0; i < prices.length; i++) {
                const macd = ema12[i] - ema26[i];
                macdData.push(macd);
            }
            
            const signalLine = calculateEMA(macdData, 9);
            
            const bbPeriod = 20;
            for (let i = 0; i < prices.length; i++) {
                if (i < bbPeriod - 1) {
                    const availablePrices = prices.slice(0, i + 1);
                    const sma = availablePrices.reduce((sum, price) => sum + price, 0) / availablePrices.length;
                    const variance = availablePrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / availablePrices.length;
                    const stdDev = Math.sqrt(variance);
                    bollingerUpper.push(sma + (2 * stdDev));
                    bollingerLower.push(sma - (2 * stdDev));
                } else {
                    const recentPrices = prices.slice(i - bbPeriod + 1, i + 1);
                    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / bbPeriod;
                    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / bbPeriod;
                    const stdDev = Math.sqrt(variance);
                    bollingerUpper.push(sma + (2 * stdDev));
                    bollingerLower.push(sma - (2 * stdDev));
                }
            }
            
            if (mainChart && mainChart.data && mainChart.data.datasets) {
                if (mainChart.data.datasets[2]) mainChart.data.datasets[2].data = rsiData;
                if (mainChart.data.datasets[3]) mainChart.data.datasets[3].data = bollingerUpper;
                if (mainChart.data.datasets[4]) mainChart.data.datasets[4].data = bollingerLower;
                mainChart.update('none');
            }
            

        
        function generateMockSignals(labels, candleData) {
            strategySignals = [];
            
            if (!mainChart || !mainChart.data || !mainChart.data.datasets[2]) {
                console.log('⚠️ Główny wykres nie jest gotowy dla sygnałów');
                return;
            }
            
            const rsiData = mainChart.data.datasets[2].data;
            
            for (let i = 14; i < candleData.length - 1; i++) {
                let signal = null;
                const candle = candleData[i];
                const rsi = rsiData[i];
                const macd = macdData[i];
                const prevMACD = macdData[i - 1] || 0;
                
                if (activeStrategies.has('RSI_TURBO') && rsi && macd) {
                    if (rsi < 35 && macd > prevMACD && macd > -10) {
                        signal = {
                            timestamp: Date.now() - (labels.length - i) * 5 * 60 * 1000,
                            type: 'KUP',
                            price: candle.low - (candle.high - candle.low) * 0.15,
                            strategy: 'RSI_TURBO',
                            confidence: 0.85,
                            reason: \`RSI wyprzedane (\${rsi.toFixed(1)}) + byczy krzyż MACD\`,
                            dataIndex: i
                        };
                    } else if (rsi > 65 && macd < prevMACD && macd < 10) {
                        signal = {
                            timestamp: Date.now() - (labels.length - i) * 5 * 60 * 1000,
                            type: 'SPRZEDAJ',
                            price: candle.high + (candle.high - candle.low) * 0.15,
                            strategy: 'RSI_TURBO',
                            confidence: 0.82,
                            reason: \`RSI wykupione (\${rsi.toFixed(1)}) + niedźwiedzi zwrot MACD\`,
                            dataIndex: i
                        };
                    }
                }
                
                if (activeStrategies.has('MOMENTUM_PRO') && macd && rsi) {
                    if (Math.abs(macd) > 15 && macd > prevMACD && macd > 0 && rsi > 40 && rsi < 70) {
                        signal = {
                            timestamp: Date.now() - (labels.length - i) * 5 * 60 * 1000,
                            type: 'KUP',
                            price: (candle.high + candle.low) / 2 - (candle.high - candle.low) * 0.05,
                            strategy: 'MOMENTUM_PRO',
                            confidence: 0.78,
                            reason: \`Silny impet MACD (\${macd.toFixed(2)}) + RSI neutralne\`,
                            dataIndex: i
                        };
                    } else if (Math.abs(macd) > 15 && macd < prevMACD && macd < 0 && rsi > 30 && rsi < 60) {
                        signal = {
                            timestamp: Date.now() - (labels.length - i) * 5 * 60 * 1000,
                            type: 'SPRZEDAJ',
                            price: (candle.high + candle.low) / 2 + (candle.high - candle.low) * 0.05,
                            strategy: 'MOMENTUM_PRO',
                            confidence: 0.75,
                            reason: \`Negatywny impet MACD (\${macd.toFixed(2)}) + RSI malejące\`,
                            dataIndex: i
                        };
                    }
                }
                
                if (activeStrategies.has('SUPERTREND') && rsi) {
                    const volatility = (candle.high - candle.low) / candle.close;
                    if (volatility > 0.01 && macd > 0) {
                        signal = {
                            timestamp: Date.now() - (labels.length - i) * 5 * 60 * 1000,
                            type: 'KUP',
                            price: candle.low - (candle.high - candle.low) * 0.25,
                            strategy: 'SUPERTREND',
                            confidence: 0.88,
                            reason: \`Wysoka zmienność (\${(volatility*100).toFixed(2)}%) + byczy MACD\`,
                            dataIndex: i
                        };
                    } else if (volatility > 0.01 && macd < 0) {
                        signal = {
                            timestamp: Date.now() - (labels.length - i) * 5 * 60 * 1000,
                            type: 'SPRZEDAJ',
                            price: candle.high + (candle.high - candle.low) * 0.25,
                            strategy: 'SUPERTREND',
                            confidence: 0.85,
                            reason: \`Wysoka zmienność (\${(volatility*100).toFixed(2)}%) + niedźwiedzi MACD\`,
                            dataIndex: i
                        };
                    }
                }
                
                if (signal) strategySignals.push(signal);
            }
            
            console.log('🎯 Wygenerowano', strategySignals.length, 'sygnałów strategii');
            addStrategySignalsToChart();
        }
        
        async function loadStrategySignals() {
            try {
                const response = await fetch('/api/strategy-signals/RSI_TURBO');
                const data = await response.json();
                
                strategySignals = data.signals.filter(signal => activeStrategies.has(signal.strategy));
                
                addStrategySignalsToChart();
                
            } catch (error) {
                console.error('Błąd ładowania sygnałów strategii:', error);
            }
        }
        
        function addStrategySignalsToChart() {
            console.log('🎯 Dodawanie', strategySignals.length, 'sygnałów strategii do wykresu');
            
            if (!mainChart || !mainChart.data || !mainChart.data.datasets || !strategySignals || activeStrategies.size === 0) {
                console.log('⚠️ Brak sygnałów do wyświetlenia lub wykresy niegotowe');
                return;
            }
            
            try {
            
            const buySignals = [];
            const sellSignals = [];
            
            strategySignals.forEach(signal => {
                if (activeStrategies.has(signal.strategy)) {
                    const signalIndex = signal.dataIndex;
                    if (signalIndex >= 0 && mainChart.data.labels && signalIndex < mainChart.data.labels.length) {
                        const dataPoint = {
                            x: signalIndex,
                            y: signal.price,
                            timestamp: signal.timestamp,
                            strategy: signal.strategy,
                            confidence: signal.confidence,
                            reason: signal.reason
                        };
                        signal.type === 'KUP' ? buySignals.push(dataPoint) : sellSignals.push(dataPoint);
                    }
                }
            });
            
            const coreDatasets = 5;
            if (mainChart.data.datasets.length > coreDatasets) {
                mainChart.data.datasets = mainChart.data.datasets.slice(0, coreDatasets);
            }
            
            const labelsLength = mainChart.data.labels ? mainChart.data.labels.length : 0;
            const buyOverlay = new Array(labelsLength).fill(null);
            const sellOverlay = new Array(labelsLength).fill(null);
            
            buySignals.forEach(signal => {
                if (signal.x >= 0 && signal.x < buyOverlay.length) {
                    buyOverlay[signal.x] = signal.y;
                }
            });
            
            sellSignals.forEach(signal => {
                if (signal.x >= 0 && signal.x < sellOverlay.length) {
                    sellOverlay[signal.x] = signal.y;
                }
            });
            
            mainChart.data.datasets.push({
                type: 'scatter',
                label: 'Sygnały KUP',
                data: buyOverlay,
                backgroundColor: '#00D4AA',
                borderColor: '#FFFFFF',
                borderWidth: 1,
                pointRadius: function(context) { return context.parsed.y !== null ? 4 : 0; },
                pointHoverRadius: 6,
                showLine: false,
                pointStyle: 'triangle',
                rotation: 0,
                order: 1,
                yAxisID: 'y'
            });
            
            mainChart.data.datasets.push({
                type: 'scatter',
                label: 'Sygnały SPRZEDAJ',
                data: sellOverlay,
                backgroundColor: '#FF4444',
                borderColor: '#FFFFFF',
                borderWidth: 1,
                pointRadius: function(context) { return context.parsed.y !== null ? 4 : 0; },
                pointHoverRadius: 6,
                showLine: false,
                pointStyle: 'triangle',
                rotation: 180,
                order: 1,
                yAxisID: 'y'
            });
            
            mainChart.update('active');
            
            } catch (error) {
                console.error('❌ Błąd dodawania sygnałów do wykresu:', error);
            }
        }
        
        function findClosestTimeIndex(timestamp) {
            if (!mainChart || !mainChart.data || !mainChart.data.labels) return -1;
            const chartLabels = mainChart.data.labels;
            if (!chartLabels || chartLabels.length === 0) return -1;
            
            const now = Date.now();
            const intervalMs = 5 * 60 * 1000;
            const timeDiff = now - timestamp;
            const approximateIndex = chartLabels.length - 1 - Math.floor(timeDiff / intervalMs);
            return Math.max(0, Math.min(approximateIndex, chartLabels.length - 1));
        }
        
        async function loadPortfolioData() {
            try {
                const response = await fetch('/api/portfolio-performance');
                
                if (!response.ok) {
                    console.log('⚠️ Portfolio API not available, using mock data');
                    throw new Error('API not available');
                }
                
                const data = await response.json();
                
                document.getElementById('total-value').textContent = \`$\${data.totalValue.toLocaleString()}\`;
                document.getElementById('daily-pnl').textContent = \`+$\${data.dailyPnL.toFixed(2)}\`;
                document.getElementById('weekly-pnl').textContent = \`+$\${data.weeklyPnL.toFixed(2)}\`;
                document.getElementById('total-return').textContent = \`+\${data.totalReturn.toFixed(2)}%\`;
                document.getElementById('sharpe-ratio').textContent = data.sharpeRatio.toFixed(2);
                
                updatePositionsList(data.positions);
                updateHistoryTable(data.history || []);
                updatePnLSummary(data);
                
            } catch (error) {
                console.error('Błąd ładowania danych portfela:', error);
                // Mock data if API fails
                const mockData = {
                    positions: [
                        {symbol: 'BTCUSDT', side: 'LONG', size: 0.25, entryPrice: 44200, currentPrice: 45100, pnl: 225},
                        {symbol: 'ETHUSDT', side: 'SHORT', size: 1.5, entryPrice: 2820, currentPrice: 2780, pnl: 60}
                    ],
                    history: [
                        {date: '2025-10-05', symbol: 'BTCUSDT', type: 'KUP', price: 45000, amount: 0.1, pnl: 200},
                        {date: '2025-10-04', symbol: 'ETHUSDT', type: 'SPRZEDAJ', price: 2800, amount: 1, pnl: -50},
                        {date: '2025-10-03', symbol: 'SOLUSDT', type: 'KUP', price: 140, amount: 10, pnl: 30}
                    ],
                    totalPnL: 180,
                    winRate: 66.7,
                    averageWin: 115,
                    averageLoss: -50
                };
                updatePositionsList(mockData.positions);
                updateHistoryTable(mockData.history);
                updatePnLSummary(mockData);
            }
        }
        
        function updatePositionsList(positions) {
            const positionsList = document.getElementById('positions-list');
            positionsList.innerHTML = '';
            
            positions.forEach(position => {
                const positionElement = document.createElement('div');
                positionElement.className = \`position-item \${position.side.toLowerCase()}\`;
                
                positionElement.innerHTML = \`
                    <div class="position-header">
                        <div class="position-symbol">\${position.symbol}</div>
                        <div class="position-side \${position.side.toLowerCase()}">\${position.side === 'LONG' ? 'DŁUGA' : 'KRÓTKA'}</div>
                    </div>
                    <div class="position-details">
                        <div class="detail-item">
                            <span class="detail-label">Wielkość</span>
                            <span class="detail-value">\${position.size}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Wejście</span>
                            <span class="detail-value">$\${position.entryPrice.toLocaleString()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Aktualna</span>
                            <span class="detail-value">$\${position.currentPrice.toLocaleString()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Zysk/Strata</span>
                            <span class="detail-value \${position.pnl >= 0 ? 'success-text' : 'error-text'}">
                                \${position.pnl >= 0 ? '+' : ''}$\${position.pnl.toFixed(2)}
                            </span>
                        </div>
                    </div>
                \`;
                
                positionsList.appendChild(positionElement);
            });
        }
        
        function updateHistoryTable(history) {
            const tbody = document.querySelector('#history-table tbody');
            tbody.innerHTML = '';
            
            history.forEach(tx => {
                const row = document.createElement('tr');
                row.innerHTML = \`
                    <td>\${tx.date}</td>
                    <td>\${tx.symbol}</td>
                    <td>\${tx.type}</td>
                    <td>$\${tx.price.toLocaleString()}</td>
                    <td>\${tx.amount}</td>
                    <td class="\${tx.pnl >= 0 ? 'success-text' : 'error-text'}">\${tx.pnl >= 0 ? '+' : ''}$\${tx.pnl.toFixed(2)}</td>
                \`;
                tbody.appendChild(row);
            });
        }
        
        function updatePnLSummary(data) {
            const tbody = document.querySelector('#pnl-table tbody');
            tbody.innerHTML = \`
                <tr>
                    <td>Całkowity Zysk/Strata</td>
                    <td class="\${data.totalPnL >= 0 ? 'success-text' : 'error-text'}">\${data.totalPnL >= 0 ? '+' : ''}$\${data.totalPnL.toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Wskaźnik sukcesu</td>
                    <td>\${data.winRate.toFixed(1)}%</td>
                </tr>
                <tr>
                    <td>Średni zysk</td>
                    <td>$\${data.averageWin.toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Średnia strata</td>
                    <td>$\${data.averageLoss.toFixed(2)}</td>
                </tr>
            \`;
        }
        
        function loadStrategyData() {
            console.log('📊 Dane strategii załadowane');
        }
        
        function setupEventListeners() {
            console.log('🔧 Konfigurowanie nasłuchiwaczy zdarzeń...');
            
            const timeframeBtns = document.querySelectorAll('.timeframe-btn');
            console.log('📊 Znaleziono przycisków timeframe:', timeframeBtns.length);
            timeframeBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    currentTimeframe = this.dataset.timeframe;
                    loadMarketData();
                    socket.emit('change_timeframe', currentTimeframe);
                });
            });
            
            const chartTypeBtns = document.querySelectorAll('.chart-type-btn');
            chartTypeBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    updateChartType(this.dataset.chartType);
                });
            });
            
            const indicatorBtns = document.querySelectorAll('.indicator-toggle');
            indicatorBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    this.classList.toggle('active');
                    const indicator = this.dataset.indicator;
                    toggleIndicator(indicator, this.classList.contains('active'));
                });
            });
            
            const strategyCards = document.querySelectorAll('.strategy-card');
            console.log('🎯 Znaleziono kart strategii:', strategyCards.length);
            strategyCards.forEach(card => {
                card.addEventListener('click', function() {
                    const strategyName = this.dataset.strategy;
                    console.log('🎯 Kliknięto strategię:', strategyName);
                    this.classList.toggle('active');
                    const isActive = this.classList.contains('active');
                    toggleStrategy(strategyName, isActive);
                    this.querySelector('.strategy-status').classList.toggle('inactive', !isActive);
                });
            });
            
            const tabBtns = document.querySelectorAll('.tab');
            tabBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    
                    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
                    document.getElementById(\`\${this.dataset.tab}-tab\`).classList.remove('hidden');
                });
            });
            
            const chartResizeHandle = document.getElementById('chart-resize-handle');
            if (chartResizeHandle) {
                let isResizingWidth = false;
                let startX = 0;
                let startWidth = 0;
                
                chartResizeHandle.addEventListener('mousedown', function(e) {
                    isResizingWidth = true;
                    startX = e.clientX;
                    const chartContainer = document.querySelector('.main-chart-container');
                    startWidth = chartContainer.offsetWidth;
                    document.body.style.cursor = 'ew-resize';
                    e.preventDefault();
                });
                
                document.addEventListener('mousemove', function(e) {
                    if (!isResizingWidth) return;
                    
                    const chartContainer = document.querySelector('.main-chart-container');
                    const deltaX = e.clientX - startX;
                    const newWidth = Math.max(600, Math.min(window.innerWidth * 0.85, startWidth + deltaX));
                    chartContainer.style.width = newWidth + 'px';
                    
                    if (mainChart) mainChart.resize();
                });
                
                document.addEventListener('mouseup', function() {
                    if (isResizingWidth) {
                        isResizingWidth = false;
                        document.body.style.cursor = 'default';
                        mainChart.update('none');
                    }
                });
            }
            
            const chartResizeCorner = document.getElementById('chart-resize-corner');
            if (chartResizeCorner) {
                let isResizingBoth = false;
                let startX = 0;
                let startY = 0;
                let startWidth = 0;
                let startHeight = 0;
                
                chartResizeCorner.addEventListener('mousedown', function(e) {
                    isResizingBoth = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    const chartContainer = document.querySelector('.main-chart-container');
                    const chartArea = document.querySelector('.chart-area');
                    startWidth = chartContainer.offsetWidth;
                    startHeight = chartArea.offsetHeight;
                    document.body.style.cursor = 'nwse-resize';
                    e.preventDefault();
                });
                
                document.addEventListener('mousemove', function(e) {
                    if (!isResizingBoth) return;
                    
                    const chartContainer = document.querySelector('.main-chart-container');
                    const chartArea = document.querySelector('.chart-area');
                    const deltaX = e.clientX - startX;
                    const deltaY = e.clientY - startY;
                    const newWidth = Math.max(600, Math.min(window.innerWidth * 0.85, startWidth + deltaX));
                    const newHeight = Math.max(300, Math.min(window.innerHeight * 0.8, startHeight + deltaY));
                    chartContainer.style.width = newWidth + 'px';
                    chartArea.style.height = newHeight + 'px';
                    
                    if (mainChart) mainChart.resize();
                });
                
                document.addEventListener('mouseup', function() {
                    if (isResizingBoth) {
                        isResizingBoth = false;
                        document.body.style.cursor = 'default';
                        mainChart.update('none');
                    }
                });
            }
            
            const chartResizeBottom = document.getElementById('chart-resize-bottom');
            if (chartResizeBottom) {
                let isResizingHeight = false;
                let startY = 0;
                let startHeight = 0;
                
                chartResizeBottom.addEventListener('mousedown', function(e) {
                    isResizingHeight = true;
                    startY = e.clientY;
                    const chartArea = document.querySelector('.chart-area');
                    startHeight = chartArea.offsetHeight;
                    document.body.style.cursor = 'ns-resize';
                    e.preventDefault();
                });
                
                document.addEventListener('mousemove', function(e) {
                    if (!isResizingHeight) return;
                    
                    const chartArea = document.querySelector('.chart-area');
                    const deltaY = e.clientY - startY;
                    const newHeight = Math.max(300, Math.min(window.innerHeight * 0.8, startHeight + deltaY));
                    chartArea.style.height = newHeight + 'px';
                    
                    if (mainChart) mainChart.resize();
                });
                
                document.addEventListener('mouseup', function() {
                    if (isResizingHeight) {
                        isResizingHeight = false;
                        document.body.style.cursor = 'default';
                        if (mainChart) mainChart.update('none');
                    }
                });
            }
        }
        
        function toggleIndicator(indicator, enabled) {
            const indicatorMap = {
                rsi: 2,
                macd: 'subpanel',
                bb: [3, 4],
                volume: 1
            };
            
            if (indicator === 'bb') {
                if (mainChart && mainChart.data && mainChart.data.datasets) {
                    if (mainChart.data.datasets[3]) mainChart.data.datasets[3].hidden = !enabled;
                    if (mainChart.data.datasets[4]) mainChart.data.datasets[4].hidden = !enabled;
                }
            } else {
                if (mainChart && mainChart.data && mainChart.data.datasets) {
                    const datasetIndex = indicatorMap[indicator];
                    if (mainChart.data.datasets[datasetIndex]) {
                        mainChart.data.datasets[datasetIndex].hidden = !enabled;
                    }
                }
            }
            
            if (mainChart) {
                mainChart.update('none');
            }
        }
        
        function toggleStrategy(strategyName, enabled) {
            if (enabled) {
                activeStrategies.add(strategyName);
            } else {
                activeStrategies.delete(strategyName);
            }
            
            if (rawCandleData.length > 0 && mainChart && mainChart.data && mainChart.data.labels) {
                const labels = mainChart.data.labels;
                generateMockSignals(labels, rawCandleData);
            }
        }
        
        function startRealTimeUpdates() {
            // Obsługa obu wariantów nazwy eventu dla zgodności (serwer emituje 'market-tick')
            socket.on('market-tick', updateMarketTicker);
            socket.on('market_tick', updateMarketTicker);
            socket.on('new_signal', signal => {
                if (activeStrategies.has(signal.strategy)) {
                    addNewSignalToChart(signal);
                    showSignalNotification(signal);
                }
            });
            socket.on('portfolio_update', updatePortfolioDisplay);
            
            setInterval(() => {
                const now = new Date();
                document.getElementById('current-time').textContent = now.toTimeString().split(' ')[0] + ' UTC';
            }, 1000);
            
            setInterval(() => {
                loadMarketData();
                loadPortfolioData();
            }, 30000);
        }
        
        function updateMarketTicker(tick) {
            try {
                if (!tick || !tick.symbol) {
                    console.warn('⚠️ Otrzymano niepoprawny tick:', tick);
                    return;
                }
                const sym = String(tick.symbol).toUpperCase();
                let key = null;
                if (sym.indexOf('BTC') === 0) key = 'btc';
                else if (sym.indexOf('ETH') === 0) key = 'eth';
                else if (sym.indexOf('SOL') === 0) key = 'sol';
                if (!key) return; // symbol nieobsługiwany w panelu
                var elId = key + '-price';
                var el = document.getElementById(elId);
                if (!el) {
                    console.warn('⚠️ Brak elementu ceny dla:', elId);
                    return;
                }
                var priceNum = Number(tick.price);
                if (isFinite(priceNum)) {
                    el.textContent = '$' + priceNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }
                var change = (tick.change24h !== undefined ? tick.change24h : (tick.change !== undefined ? tick.change : 0));
                el.classList.remove('price-positive','price-negative');
                el.classList.add(change >= 0 ? 'price-positive' : 'price-negative');
            } catch (err) {
                console.error('❌ Błąd w updateMarketTicker:', err);
            }
        }
        
        function addNewSignalToChart(signal) {
            if (activeStrategies.has(signal.strategy)) {
                strategySignals.push(signal);
                addStrategySignalsToChart();
            }
        }
        
        function showSignalNotification(signal) {
            console.log(\`📊 Nowy sygnał \${signal.type} dla \${signal.strategy} przy $\${signal.price}\`);
        }
        
        function updatePortfolioDisplay(portfolio) {
            console.log('💰 Portfel zaktualizowany:', portfolio);
        }
        
        console.log('🚀 Ładowanie Profesjonalnego Terminalu Handlowego...');
    </script>
</body>
</html>
        `;
    }
    start() {
        this.server.listen(this.port, () => {
            console.log(`🏛️ Professional Trading Dashboard running on http://localhost:${this.port}`);
            console.log(`📊 WebSocket server active for real-time updates`);
            console.log(`💹 Multi-crypto support: BTC, ETH, SOL`);
        });
    }
    stop() {
        this.server.close();
        console.log('🛑 Dashboard server stopped');
    }
}
// Uruchomienie serwera
const dashboard = new ProfessionalTradingDashboard();
dashboard.start();
// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down dashboard...');
    dashboard.stop();
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down dashboard...');
    dashboard.stop();
    process.exit(0);
});

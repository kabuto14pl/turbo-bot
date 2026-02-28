const fs = require('fs');
const path = require('path');

const htmlFile = path.join(__dirname, 'enterprise-dashboard.html');
const backupFile = htmlFile + '.pre-fix';

// Read current file
let html = fs.readFileSync(htmlFile, 'utf8');

// Backup 
fs.writeFileSync(backupFile, html);

// Find the <script> section (after the CSS/libs scripts)
const scriptStart = html.indexOf('    <script>\n', html.indexOf('</style>'));
const scriptEnd = html.indexOf('    </script>', scriptStart);

if (scriptStart === -1 || scriptEnd === -1) {
    console.error('Could not find script boundaries');
    console.log('Trying alternative search...');
    
    // Try looser search
    const altStart = html.lastIndexOf('<script>');
    const altEnd = html.lastIndexOf('</script>');
    
    if (altStart === -1 || altEnd === -1) {
        console.error('FATAL: No script section found at all');
        process.exit(1);
    }
    
    console.log('Found script (alt) at chars:', altStart, '-', altEnd);
    doReplace(html, altStart, altEnd + '</script>'.length);
    return;
}

console.log('Found script at chars:', scriptStart, '-', scriptEnd);
console.log('Script section length:', scriptEnd - scriptStart);
doReplace(html, scriptStart, scriptEnd + '    </script>'.length);

function doReplace(html, start, end) {
    const fixedJS = getFixedJS();
    
    const before = html.substring(0, start);
    const after = html.substring(end);
    
    const newHtml = before + fixedJS + after;
    
    fs.writeFileSync(htmlFile, newHtml, 'utf8');
    
    console.log('SUCCESS: Dashboard HTML patched');
    console.log('Old size:', html.length, 'bytes');
    console.log('New size:', newHtml.length, 'bytes');
}

function getFixedJS() {
    return `    <script>
        // =====================================================
        // ENTERPRISE DASHBOARD - PRODUCTION JAVASCRIPT
        // Version: 3.0.0 - All bugs fixed
        // =====================================================

        let chart = null;
        let candlestickSeries = null;
        let performanceChart = null;
        let isConnected = false;
        let reconnectTimeout = null;
        let performanceData = [];
        let btcWs = null;

        function setText(id, value) {
            var el = document.getElementById(id);
            if (el) el.textContent = value;
        }

        function setWidth(id, width) {
            var el = document.getElementById(id);
            if (el) el.style.width = width;
        }

        function setTextAndClass(id, text, className) {
            var el = document.getElementById(id);
            if (el) { el.textContent = text; el.className = className; }
        }

        function formatNumber(n) {
            return (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        function formatUptime(seconds) {
            var h = Math.floor(seconds / 3600);
            var m = Math.floor((seconds % 3600) / 60);
            var s = Math.floor(seconds % 60);
            return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        }

        async function initDashboard() {
            console.log('Initializing Enterprise Dashboard v3.0...');
            try { initPerformanceChart(); } catch (e) { console.error('Performance chart init error:', e); }
            try { initTradingViewChart(); } catch (e) {
                console.error('TradingView chart init failed:', e);
                var chartEl = document.getElementById('tradingview-chart');
                if (chartEl) chartEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);"><div style="text-align:center;"><i class="fas fa-chart-candlestick" style="font-size:3rem;margin-bottom:1rem;"></i><p>Chart library unavailable</p></div></div>';
            }
            await fetchBotData();
            await fetchTrades();
            startRealtimeUpdates();
        }

        function initTradingViewChart() {
            if (typeof LightweightCharts === 'undefined') throw new Error('LightweightCharts not loaded');
            var chartElement = document.getElementById('tradingview-chart');
            chart = LightweightCharts.createChart(chartElement, {
                width: chartElement.clientWidth, height: 550,
                layout: { background: { color: '#1a1f3a' }, textColor: '#d1d5db' },
                grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
                crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
                rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
                timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: true, secondsVisible: false }
            });
            candlestickSeries = chart.addCandlestickSeries({ upColor: '#10b981', downColor: '#ef4444', borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#ef4444' });
            window.addEventListener('resize', function() { if (chart) chart.applyOptions({ width: chartElement.clientWidth }); });
            loadBTCData();
        }

        async function loadBTCData() {
            var btcPriceEl = document.getElementById('btcPrice');
            if (btcPriceEl) { btcPriceEl.textContent = 'Loading...'; btcPriceEl.style.color = '#f59e0b'; }
            try {
                var response = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=200');
                if (!response.ok) throw new Error('Binance API returned ' + response.status);
                var data = await response.json();
                if (!data || data.length === 0) throw new Error('No data from Binance');
                var candlestickData = data.map(function(c) { return { time: c[0]/1000, open: parseFloat(c[1]), high: parseFloat(c[2]), low: parseFloat(c[3]), close: parseFloat(c[4]) }; });
                if (candlestickSeries) candlestickSeries.setData(candlestickData);
                var currentPrice = candlestickData[candlestickData.length - 1].close;
                if (btcPriceEl) { btcPriceEl.textContent = '$' + currentPrice.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}); btcPriceEl.style.color = '#10b981'; }
                subscribeToBTCUpdates();
            } catch (error) {
                console.error('Error loading BTC data:', error);
                if (btcPriceEl) { btcPriceEl.textContent = 'Binance API unavailable'; btcPriceEl.style.color = '#ef4444'; }
                setTimeout(loadBTCData, 30000);
            }
        }

        function subscribeToBTCUpdates() {
            if (btcWs) { try { btcWs.close(); } catch(e) {} }
            try {
                btcWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_15m');
                btcWs.onmessage = function(event) {
                    try {
                        var data = JSON.parse(event.data); var candle = data.k; if (!candle) return;
                        var newCandle = { time: candle.t/1000, open: parseFloat(candle.o), high: parseFloat(candle.h), low: parseFloat(candle.l), close: parseFloat(candle.c) };
                        if (candlestickSeries) candlestickSeries.update(newCandle);
                        var btcPriceEl = document.getElementById('btcPrice');
                        if (btcPriceEl) { btcPriceEl.textContent = '$' + newCandle.close.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}); btcPriceEl.style.color = '#10b981'; }
                    } catch (e) { console.error('WebSocket message error:', e); }
                };
                btcWs.onerror = function() { setTimeout(subscribeToBTCUpdates, 10000); };
                btcWs.onclose = function() { setTimeout(subscribeToBTCUpdates, 10000); };
            } catch (e) { setTimeout(subscribeToBTCUpdates, 30000); }
        }

        function initPerformanceChart() {
            var ctx = document.getElementById('performanceChart'); if (!ctx) return;
            performanceChart = new Chart(ctx.getContext('2d'), {
                type: 'line', data: { labels: [], datasets: [{ label: 'Portfolio Value (USDT)', data: [], borderColor: '#00d4aa', backgroundColor: 'rgba(0,212,170,0.1)', tension: 0.4, fill: true, pointRadius: 2, borderWidth: 2 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { color: '#d1d5db' } } },
                    scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0aec0', maxTicksLimit: 10 } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0aec0' } } } }
            });
        }

        function updatePerformanceChart(value) {
            if (!performanceChart) return;
            performanceData.push({ time: new Date().toLocaleTimeString(), value: value });
            if (performanceData.length > 50) performanceData.shift();
            performanceChart.data.labels = performanceData.map(function(d) { return d.time; });
            performanceChart.data.datasets[0].data = performanceData.map(function(d) { return d.value; });
            performanceChart.update('none');
        }

        async function fetchBotData() {
            var startTime = Date.now();
            try {
                var controller = new AbortController();
                var timeoutId = setTimeout(function() { controller.abort(); }, 8000);
                var response = await fetch('/api/status', { signal: controller.signal });
                clearTimeout(timeoutId);
                if (!response.ok) throw new Error('API returned ' + response.status);
                var data = await response.json();
                var latency = Date.now() - startTime;
                if (data.error) { updateConnectionStatus(false); return; }
                updateDashboard(data, latency);
                updateConnectionStatus(true);
            } catch (error) { console.warn('Bot API error:', error.message); updateConnectionStatus(false); }
        }

        async function fetchTrades() {
            try {
                var controller = new AbortController();
                var timeoutId = setTimeout(function() { controller.abort(); }, 8000);
                var response = await fetch('/api/trades', { signal: controller.signal });
                clearTimeout(timeoutId);
                if (!response.ok) throw new Error('Trades API ' + response.status);
                var data = await response.json();
                var trades = data.trades || data || [];
                updateTradesTable(trades);
            } catch (error) { console.warn('Trades API error:', error.message); }
        }

        function updateDashboard(data, latency) {
            if (data.performance) {
                var perf = data.performance;
                setText('totalValue', formatNumber(perf.totalValue));
                setText('winRate', (perf.winRate || 0).toFixed(2));
                setText('realizedPnL', formatNumber(perf.realizedPnL || 0));
                setText('avgTradeReturn', (perf.avgTradeReturn || 0).toFixed(4));
                setText('successfulTrades', perf.successfulTrades || 0);
                setText('totalTrades', perf.totalTrades || 0);
                setText('unrealizedPnL', formatNumber(perf.unrealizedPnL || 0));
                var drawdownVal = perf.drawdown || perf.maxDrawdownValue || 0;
                setText('maxDrawdown', drawdownVal.toFixed(4));
                setText('sharpeRatio', (perf.sharpeRatio || 0).toFixed(2));
                var initialCapital = (data.config && data.config.initialCapital) || 10000;
                var valuePct = ((perf.totalValue - initialCapital) / initialCapital * 100);
                setTextAndClass('valueChange', (valuePct >= 0 ? '+' : '') + valuePct.toFixed(2) + '%', 'metric-change ' + (valuePct >= 0 ? 'positive' : 'negative'));
                setWidth('valueProgress', Math.min(Math.abs(valuePct), 100) + '%');
                var pnlPct = ((perf.realizedPnL || 0) / initialCapital * 100);
                setTextAndClass('pnlChange', (pnlPct >= 0 ? '+' : '') + pnlPct.toFixed(2) + '%', 'metric-change ' + (pnlPct >= 0 ? 'positive' : 'negative'));
                var wr = perf.winRate || 0;
                if (perf.totalTrades === 0) setTextAndClass('winRateBadge', 'Waiting', 'badge badge-info');
                else if (wr >= 70) setTextAndClass('winRateBadge', 'Excellent', 'badge badge-success');
                else if (wr >= 50) setTextAndClass('winRateBadge', 'Good', 'badge badge-info');
                else if (wr >= 30) setTextAndClass('winRateBadge', 'Fair', 'badge badge-warning');
                else setTextAndClass('winRateBadge', 'Low', 'badge badge-danger');
                updatePerformanceChart(perf.totalValue);
            }
            if (data.trading) {
                setText('strategiesCount', data.trading.strategiesCount || 0);
                var botStatus = document.getElementById('botStatus');
                if (botStatus) {
                    if (data.trading.isRunning) { botStatus.innerHTML = '<i class="fas fa-check-circle"></i> Running'; botStatus.className = 'badge badge-success'; }
                    else { botStatus.innerHTML = '<i class="fas fa-pause-circle"></i> Paused'; botStatus.className = 'badge badge-warning'; }
                }
            }
            if (data.config) {
                var mode = data.config.enableLiveTrading ? 'Live' : (data.config.paperTrading !== false ? 'Simulation' : 'Backtest');
                var modeEl = document.getElementById('tradingMode');
                if (modeEl) { modeEl.textContent = mode; modeEl.className = mode === 'Live' ? 'badge badge-danger' : mode === 'Backtest' ? 'badge badge-info' : 'badge badge-warning'; }
                setText('maxRiskPerTrade', ((data.config.riskPerTrade || 0.02) * 100).toFixed(2) + '%');
                setText('activeStrategy', data.config.strategy || '--');
            }
            if (data.health) {
                setText('uptime', formatUptime(data.health.uptime || 0));
                setText('botVersion', data.health.version || '--');
                var healthBadge = document.getElementById('healthBadge');
                if (healthBadge) {
                    var status = data.health.status || 'unknown';
                    healthBadge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                    healthBadge.className = 'badge ' + (status === 'healthy' ? 'badge-success' : status === 'degraded' ? 'badge-warning' : 'badge-danger');
                }
                if (data.health.metrics) {
                    var m = data.health.metrics;
                    setText('mlConfidence', ((m.mlConfidenceThreshold || 0) * 100).toFixed(2));
                    setWidth('mlProgress', ((m.mlConfidenceThreshold || 0) * 100) + '%');
                    setText('mlAccuracy', ((1 - (m.mlExplorationRate || 1)) * 100).toFixed(2));
                    setText('trainingCycles', m.mlTradingCount || 0);
                    setText('mlPhase', m.mlLearningPhase || 'UNKNOWN');
                    setText('mlReward', (m.mlAverageReward || 0).toFixed(4));
                }
            }
            if (data.circuitBreaker) {
                var cb = data.circuitBreaker;
                var cbBanner = document.getElementById('circuitBreakerBanner');
                var cbStatus = document.getElementById('circuitBreakerStatus');
                if (cb.isTripped || cb.emergencyStopTriggered) {
                    if (cbBanner) cbBanner.className = 'circuit-breaker-alert active';
                    setText('cbDetails', 'Consecutive losses: ' + (cb.consecutiveLosses || 0) + '/' + (cb.maxConsecutiveLosses || 3) + ' | Trip count: ' + (cb.tripCount || 0));
                    if (cbStatus) cbStatus.innerHTML = '<span class="badge badge-danger"><i class="fas fa-exclamation-triangle"></i> TRIPPED</span>';
                } else {
                    if (cbBanner) cbBanner.className = 'circuit-breaker-alert';
                    if (cbStatus) cbStatus.innerHTML = '<span class="badge badge-success"><i class="fas fa-shield-alt"></i> OK</span>';
                }
            }
            setText('apiLatency', latency || 0);
            setText('lastUpdate', 'Last update: ' + new Date().toLocaleTimeString());
        }

        function updateTradesTable(trades) {
            var tbody = document.getElementById('tradesTable');
            var tradesCount = document.getElementById('tradesCount');
            if (!trades || trades.length === 0) {
                if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-secondary);"><i class="fas fa-info-circle"></i> No trades yet</td></tr>';
                if (tradesCount) tradesCount.textContent = '0 trades';
                return;
            }
            if (tradesCount) tradesCount.textContent = trades.length + ' trades';
            var displayTrades = trades.slice(-15).reverse();
            if (tbody) {
                tbody.innerHTML = displayTrades.map(function(trade) {
                    var pnl = parseFloat(trade.pnl) || 0;
                    var pnlClass = pnl >= 0 ? 'positive' : 'negative';
                    var time = new Date(trade.timestamp).toLocaleString();
                    var price = parseFloat(trade.price || trade.entryPrice || 0);
                    var qty = parseFloat(trade.quantity || 0);
                    var action = trade.action || trade.type || 'N/A';
                    var actionClass = (action === 'BUY' || action === 'LONG') ? 'badge-success' : 'badge-danger';
                    var strategy = trade.strategy || 'Unknown';
                    return '<tr><td style="font-size:0.85rem;">' + time + '</td><td><strong>' + (trade.symbol || 'N/A') + '</strong></td><td><span class="badge ' + actionClass + '">' + action + '</span></td><td>$' + price.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</td><td>' + qty.toFixed(6) + '</td><td class="' + pnlClass + '"><strong>' + (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(4) + '</strong></td><td style="font-size:0.85rem;">' + strategy + '</td></tr>';
                }).join('');
            }
        }

        function updateConnectionStatus(connected) {
            isConnected = connected;
            var statusDot = document.getElementById('statusDot');
            var statusText = document.getElementById('statusText');
            if (connected) { if (statusDot) statusDot.style.background = '#10b981'; if (statusText) statusText.textContent = 'Connected'; }
            else { if (statusDot) statusDot.style.background = '#ef4444'; if (statusText) statusText.textContent = 'Disconnected - retrying...'; }
        }

        function startRealtimeUpdates() {
            setInterval(function() { fetchBotData(); }, 5000);
            setInterval(function() { fetchTrades(); }, 15000);
        }

        document.addEventListener('DOMContentLoaded', initDashboard);
    </script>`;
}

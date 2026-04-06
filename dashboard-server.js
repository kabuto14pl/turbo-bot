const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.DASHBOARD_PORT || 8080;
// P#235: Multi-instance bot APIs — aggregate both SOL and BNB
const BOT_APIS = (process.env.BOT_APIS || 'http://localhost:3001,http://localhost:3002').split(',').map(s => s.trim());
const BOT_API = BOT_APIS[0]; // Primary bot for single-instance fallback

// Per-path cache to prevent /api/trades returning /api/status data
const apiCache = new Map();
const CACHE_DURATION = 3000;

function getCached(pathname) {
  const entry = apiCache.get(pathname);
  if (entry && (Date.now() - entry.time) < CACHE_DURATION) return entry.data;
  return null;
}

function setCache(pathname, data) {
  apiCache.set(pathname, { data, time: Date.now() });
}

// P#235: Fetch JSON from a single bot with timeout
function fetchBotJson(botUrl, pathname, timeout) {
  return new Promise(function(resolve) {
    const fullUrl = botUrl + pathname;
    const req = http.get(fullUrl, { timeout: timeout || 5000 }, function(res) {
      let data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
      });
    });
    req.on('error', function() { resolve(null); });
    req.on('timeout', function() { req.destroy(); resolve(null); });
  });
}

// P#235: Aggregate /health from all bot instances
function aggregateHealth(results) {
  const instances = [];
  let totalValue = 0, realizedPnL = 0, totalTrades = 0, totalWins = 0, totalPositions = 0;
  for (const r of results) {
    if (!r) continue;
    const m = r.metrics || {};
    instances.push({
      instance: r.instance || 'unknown',
      totalValue: m.totalValue || r.totalValue || 0,
      realizedPnL: m.realizedPnL || r.realizedPnL || 0,
      unrealizedPnL: m.unrealizedPnL || r.unrealizedPnL || 0,
      trades: m.totalTrades || r.totalTrades || 0,
      winRate: m.winRate || r.winRate || 0,
      positions: m.currentPositions || 0,
      mlPhase: m.mlLearningPhase || 'N/A',
    });
    totalValue += m.totalValue || r.totalValue || 0;
    realizedPnL += m.realizedPnL || r.realizedPnL || 0;
    totalTrades += m.totalTrades || r.totalTrades || 0;
    totalWins += m.successfulTrades || 0;
    totalPositions += m.currentPositions || 0;
  }
  const primary = results.find(function(r) { return r; }) || {};
  return Object.assign({}, primary, {
    aggregated: true,
    instanceCount: instances.length,
    instances: instances,
    portfolio: {
      totalValue: totalValue,
      realizedPnL: realizedPnL,
      trades: totalTrades,
      winRate: totalTrades > 0 ? (totalWins / totalTrades * 100) : 0,
      currentPositions: totalPositions,
    },
  });
}

// P#235: Aggregate /api/trades from all bot instances
function aggregateTrades(results) {
  const allTrades = [];
  for (const r of results) {
    if (!r) continue;
    const trades = Array.isArray(r) ? r : (r.trades || r.data || []);
    for (const t of trades) {
      allTrades.push(t);
    }
  }
  allTrades.sort(function(a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
  return allTrades;
}

// P#235: Multi-bot aggregated GET proxy
function proxyGetAggregated(res, pathname) {
  const cached = getCached('_agg_' + pathname);
  if (cached) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(cached));
  }

  Promise.all(BOT_APIS.map(function(api) { return fetchBotJson(api, pathname, 5000); }))
    .then(function(results) {
      let merged;
      if (pathname === '/health' || pathname === '/api/status') {
        merged = aggregateHealth(results);
      } else if (pathname === '/api/trades') {
        merged = aggregateTrades(results);
      } else {
        // For other endpoints, return first successful response
        merged = results.find(function(r) { return r; }) || { error: 'All bots offline' };
      }
      setCache('_agg_' + pathname, merged);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(merged));
    })
    .catch(function(err) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Aggregation failed', message: err.message }));
    });
}

function serveHTML(res, filename) {
  const filePath = path.join(__dirname, filename);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(filename + ' not found');
  }
}

function proxyToBot(req, res, pathname) {
  const method = req.method;

  // POST / PUT / PATCH — collect body, forward to bot
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const botUrl = new URL(pathname, BOT_API);
      const options = {
        hostname: botUrl.hostname,
        port: botUrl.port,
        path: botUrl.pathname + botUrl.search,
        method: method,
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 30000,
      };

      const proxy = http.request(options, (botRes) => {
        let data = '';
        botRes.on('data', chunk => { data += chunk; });
        botRes.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            res.writeHead(botRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(jsonData));
          } catch(e) {
            res.writeHead(botRes.statusCode || 500, { 'Content-Type': 'text/plain' });
            res.end(data);
          }
        });
      });

      proxy.on('error', (error) => {
        console.error('Bot API POST Error:', error.message);
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bot offline', message: error.message }));
      });

      proxy.on('timeout', () => {
        proxy.destroy();
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bot timeout' }));
      });

      proxy.write(body);
      proxy.end();
    });
    return;
  }

  // GET — use caching
  const cached = getCached(pathname);
  if (cached) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(cached));
  }

  const botUrl = `${BOT_API}${pathname}`;
  const botRequest = http.get(botUrl, (botRes) => {
    let data = '';
    botRes.on('data', (chunk) => { data += chunk; });
    botRes.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        setCache(pathname, jsonData);
        res.writeHead(botRes.statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(jsonData));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON from bot' }));
      }
    });
  });

  botRequest.on('error', (error) => {
    console.error('Bot API Error:', error.message);
    const fallback = getCached(pathname);
    if (fallback) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(fallback));
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bot offline', message: error.message }));
    }
  });

  botRequest.setTimeout(5000, () => {
    botRequest.destroy();
    const fallback = getCached(pathname);
    if (fallback) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(fallback));
    } else {
      res.writeHead(504, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bot timeout' }));
    }
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(200); return res.end(); }

  // ─── Routes ──────────────────────────────────────────────────
  if (pathname === '/' || pathname === '/index.html') {
    // Enterprise Dashboard with integrated MEGATRON AI Brain
    serveHTML(res, 'enterprise-dashboard.html');
  }
  else if (pathname === '/standalone' || pathname === '/megatron-standalone') {
    // Standalone Megatron dashboard (minimal)
    serveHTML(res, 'megatron-dashboard.html');
  }
  else if (pathname === '/dashboard-health') {
    // Dashboard server own health (moved from /health to avoid conflict)
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      dashboard: 'running',
      version: '4.0-MEGATRON',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pages: { megatron: '/', classic: '/classic' }
    }));
  }
  else if (pathname === '/health' || pathname.startsWith('/api/')) {
    // P#235: GET requests use multi-bot aggregation; POST/PUT/PATCH forward to primary
    if (req.method === 'GET') {
      proxyGetAggregated(res, pathname);
    } else {
      proxyToBot(req, res, pathname);
    }
  }
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', availableRoutes: ['/', '/standalone', '/health', '/dashboard-health', '/api/*'] }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   MEGATRON DASHBOARD SERVER v4.0             ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  Dashboard:  http://0.0.0.0:${PORT}/ (Enterprise + MEGATRON AI)`);
  console.log(`  Standalone: http://0.0.0.0:${PORT}/standalone (Megatron only)`);
  console.log(`  Bot API:    ${BOT_API}`);
  console.log(`  Health:     http://localhost:${PORT}/health (proxied to bot)`);
  console.log(`  DashHealth: http://localhost:${PORT}/dashboard-health (server own)`);
  console.log('  POST proxy: ENABLED (for Megatron chat)');
  console.log('  Caching:    ENABLED (per-path, 3s)');
  console.log('');
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });

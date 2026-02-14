const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.DASHBOARD_PORT || 8080;
const BOT_API = 'http://localhost:3001';

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
    // Proxy /health AND all /api/* to bot — supports GET, POST, PUT, DELETE
    proxyToBot(req, res, pathname);
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

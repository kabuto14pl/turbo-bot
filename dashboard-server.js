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

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') { res.writeHead(200); return res.end(); }

  // Routes
  if (pathname === '/' || pathname === '/index.html') {
    const dashboardPath = path.join(__dirname, 'enterprise-dashboard.html');
    if (fs.existsSync(dashboardPath)) {
      const content = fs.readFileSync(dashboardPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Dashboard file not found');
    }
  }
  else if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      dashboard: 'running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }));
  }
  else if (pathname.startsWith('/api/')) {
    // Check per-path cache
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
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('=== ENTERPRISE DASHBOARD SERVER v3.0 ===');
  console.log(`Dashboard:  http://0.0.0.0:${PORT}`);
  console.log(`Bot API:    ${BOT_API}`);
  console.log(`Health:     http://localhost:${PORT}/health`);
  console.log('Per-path caching: ENABLED (fixed)');
  console.log('========================================');
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
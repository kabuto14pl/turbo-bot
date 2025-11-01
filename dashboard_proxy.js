// Dashboard Proxy Server - CORS fix for bot API
const http = require('http');

const BOT_API_HOST = 'localhost';
const BOT_API_PORT = 3001;
const PROXY_PORT = 8081;

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Extract path (remove /proxy prefix)
    const path = req.url.replace('/proxy', '');
    
    console.log(`[${new Date().toISOString()}] Proxying: ${req.method} ${path}`);

    // Proxy request to bot API
    const options = {
        hostname: BOT_API_HOST,
        port: BOT_API_PORT,
        path: path,
        method: req.method,
        headers: req.headers
    };

    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
        console.error(`[${new Date().toISOString()}] Proxy error:`, error.message);
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            error: 'Service Unavailable', 
            message: 'Bot API not responding',
            details: error.message 
        }));
    });

    req.pipe(proxyReq);
});

server.listen(PROXY_PORT, () => {
    console.log(`🔗 Dashboard Proxy Server running on port ${PROXY_PORT}`);
    console.log(`📡 Proxying requests to bot API at ${BOT_API_HOST}:${BOT_API_PORT}`);
    console.log(`✅ CORS enabled for all origins`);
});

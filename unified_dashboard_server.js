// Unified Dashboard + Proxy Server - Wszystko na jednym porcie 8080
const http = require('http');
const fs = require('fs');
const path = require('path');

const BOT_API_HOST = 'localhost';
const BOT_API_PORT = 3001;
const SERVER_PORT = 8080;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

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

    // API endpoints - proxy to bot API
    if (req.url.startsWith('/health') || req.url.startsWith('/api/')) {
        const options = {
            hostname: BOT_API_HOST,
            port: BOT_API_PORT,
            path: req.url,
            method: req.method,
            headers: req.headers
        };

        const proxyReq = http.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (error) => {
            console.error(`[${new Date().toISOString()}] API error:`, error.message);
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'Service Unavailable', 
                message: 'Bot API not responding',
                details: error.message 
            }));
        });

        req.pipe(proxyReq);
        return;
    }

    // Static files - serve dashboard
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './live_test_dashboard.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(SERVER_PORT, () => {
    console.log(`🚀 Unified Dashboard Server running on port ${SERVER_PORT}`);
    console.log(`📊 Dashboard: http://localhost:${SERVER_PORT}/live_test_dashboard.html`);
    console.log(`📡 API Proxy: /health, /api/* → ${BOT_API_HOST}:${BOT_API_PORT}`);
    console.log(`✅ CORS enabled`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

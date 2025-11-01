#!/usr/bin/env node
/**
 * 🔄 Dashboard API Proxy Server
 * Fixes CORS issues by proxying requests from dashboard to bot API
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PROXY_PORT = 8081;
const BOT_API_BASE = 'http://localhost:3001';

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Parse request URL
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    
    // Special endpoints
    if (path === '/proxy/health') {
        proxyRequest('/health', res);
    } else if (path === '/proxy/portfolio') {
        proxyRequest('/api/portfolio', res);
    } else if (path === '/proxy/status') {
        proxyRequest('/api/status', res);
    } else if (path === '/proxy/test-info') {
        // Return test information
        const testInfo = {
            testId: 'extended_test_20251012_151143',
            startTime: new Date('2025-10-12T15:11:43').getTime(),
            duration: 7200, // 2 hours
            timeMultiplier: 24,
            tradingInterval: 1250
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(testInfo));
    } else if (path === '/proxy/process-info') {
        // Return process information from system
        const { exec } = require('child_process');
        
        exec('ps aux | grep "autonomous_trading_bot" | grep -v grep', (error, stdout) => {
            if (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to get process info' }));
                return;
            }
            
            const lines = stdout.trim().split('\n');
            const processInfo = lines.map(line => {
                const parts = line.trim().split(/\s+/);
                return {
                    user: parts[0],
                    pid: parts[1],
                    cpu: parts[2],
                    mem: parts[3],
                    vsz: parts[4],
                    rss: parts[5],
                    rssInMB: Math.round(parseInt(parts[5]) / 1024)
                };
            });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(processInfo));
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
    }
});

function proxyRequest(botPath, res) {
    const options = {
        hostname: 'localhost',
        port: 3001,
        path: botPath,
        method: 'GET'
    };
    
    const proxyReq = http.request(options, (proxyRes) => {
        let data = '';
        
        proxyRes.on('data', (chunk) => {
            data += chunk;
        });
        
        proxyRes.on('end', () => {
            res.writeHead(proxyRes.statusCode, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(data);
        });
    });
    
    proxyReq.on('error', (error) => {
        console.error('Proxy error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bot API not responding', details: error.message }));
    });
    
    proxyReq.end();
}

server.listen(PROXY_PORT, () => {
    console.log('🔄 Dashboard API Proxy Server');
    console.log('================================');
    console.log(`✅ Listening on: http://localhost:${PROXY_PORT}`);
    console.log(`🔗 Proxying to: ${BOT_API_BASE}`);
    console.log('');
    console.log('Available endpoints:');
    console.log(`  GET /proxy/health      - Bot health check`);
    console.log(`  GET /proxy/portfolio   - Portfolio data`);
    console.log(`  GET /proxy/status      - Full bot status`);
    console.log(`  GET /proxy/test-info   - Test information`);
    console.log(`  GET /proxy/process-info - Process statistics`);
    console.log('');
    console.log('🌐 Dashboard URL: http://localhost:8080/live_test_dashboard.html');
    console.log('================================');
});

server.on('error', (error) => {
    console.error('❌ Server error:', error);
    process.exit(1);
});

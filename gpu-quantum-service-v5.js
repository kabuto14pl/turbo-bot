'use strict';
/**
 * GPU Quantum Service v5.0 — CUDA-ONLY Proxy (Raw HTTP — SSH Tunnel Compatible)
 * PATCH #43: Pure CUDA proxy — NO WASM, NO TF.js, NO CPU fallback
 * 
 * Architecture:
 *   Request → raw HTTP proxy → Python CUDA (port 4002, RTX 5070 Ti)
 *   If CUDA fails → return error (NEVER fall back to CPU/WASM)
 * 
 * Uses raw http.createServer instead of Express for SSH tunnel compatibility.
 * Express was causing "Empty reply from server" through SSH reverse tunnels on Windows.
 * 
 * Endpoints (all proxied to Python CUDA):
 *   GET  /health               Service health + GPU status
 *   POST /gpu/qmc              Quantum Monte Carlo (5M paths default)
 *   POST /gpu/vqc-regime       VQC regime classification
 *   POST /gpu/batch-vqc        Batch VQC (multiple feature sets)
 *   POST /gpu/qaoa-weights     QAOA strategy optimization (1500 iter)
 *   POST /gpu/matmul           GPU matrix multiplication
 *   POST /gpu/var              Value at Risk
 *   POST /gpu/portfolio-opt    Portfolio optimization (200K portfolios)
 *   POST /gpu/deep-scenario    Deep scenario analysis (10 scenarios × 5M paths)
 *   POST /gpu/warmup-heavy     Heavy GPU warmup benchmark
 *   GET  /gpu/continuous-status Background engine status
 *   GET  /metrics              Performance metrics
 */

const http = require('http');
const os = require('os');
const { URL } = require('url');

// ═══════════════════════════════════════════════════════════════
//  CUDA PROXY CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const CUDA_URL = process.env.GPU_CUDA_URL || 'http://127.0.0.1:4002';
const CUDA_TIMEOUT_MS = parseInt(process.env.GPU_CUDA_TIMEOUT_MS || '30000', 10);
let cudaOnline = false;
let cudaLastCheck = 0;
let cudaHealthCache = null;

const stats = {
    startTime: Date.now(),
    totalRequests: 0,
    totalProxied: 0,
    totalErrors: 0,
    totalCudaMs: 0,
    endpoints: {},
};

// ═══════════════════════════════════════════════════════════════
//  HTTP HELPERS
// ═══════════════════════════════════════════════════════════════

/** Send JSON response with proper headers and Connection: close */
function sendJSON(res, statusCode, obj) {
    const body = JSON.stringify(obj);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Connection': 'close',
    });
    res.end(body);
}

/** Read request body as JSON */
function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        const MAX = 50 * 1024 * 1024; // 50MB
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > MAX) { reject(new Error('Body too large')); return; }
            chunks.push(chunk);
        });
        req.on('end', () => {
            try {
                const raw = Buffer.concat(chunks).toString('utf8');
                resolve(raw.length > 0 ? JSON.parse(raw) : {});
            } catch (e) {
                reject(new Error('Invalid JSON body: ' + e.message));
            }
        });
        req.on('error', reject);
    });
}

// ═══════════════════════════════════════════════════════════════
//  CUDA PROXY — All requests go to Python CUDA, NO fallback
// ═══════════════════════════════════════════════════════════════

/** POST request to Python CUDA service. Returns result or throws. */
function cudaPost(path, body, timeoutMs = CUDA_TIMEOUT_MS) {
    const url = CUDA_URL + path;
    const jsonBody = JSON.stringify(body);

    return new Promise((resolve, reject) => {
        const t0 = performance.now();
        const parsedUrl = new URL(url);

        const req = http.request({
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(jsonBody),
            },
            timeout: timeoutMs,
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                const latencyMs = Math.round((performance.now() - t0) * 100) / 100;
                stats.totalProxied++;

                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const result = JSON.parse(data);
                        cudaOnline = true;
                        result._proxyLatencyMs = latencyMs;
                        result._backend = 'cuda-gpu-rtx5070ti';
                        stats.totalCudaMs += result.computeTimeMs || result.offloadLatencyMs || latencyMs;
                        resolve(result);
                    } catch (e) {
                        stats.totalErrors++;
                        reject(new Error('CUDA response parse error: ' + e.message));
                    }
                } else {
                    stats.totalErrors++;
                    reject(new Error('CUDA HTTP ' + res.statusCode + ': ' + data.substring(0, 200)));
                }
            });
        });

        req.on('error', (e) => {
            stats.totalErrors++;
            cudaOnline = false;
            reject(new Error('CUDA connection failed: ' + e.message));
        });
        req.on('timeout', () => {
            stats.totalErrors++;
            cudaOnline = false;
            req.destroy();
            reject(new Error('CUDA timeout (' + timeoutMs + 'ms)'));
        });
        req.write(jsonBody);
        req.end();
    });
}

/** GET request to Python CUDA service. */
function cudaGet(path, timeoutMs = 5000) {
    const url = CUDA_URL + path;

    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const req = http.request({
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname,
            method: 'GET',
            timeout: timeoutMs,
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(data)); }
                    catch (e) { reject(new Error('CUDA parse error: ' + e.message)); }
                } else {
                    reject(new Error('CUDA HTTP ' + res.statusCode));
                }
            });
        });
        req.on('error', (e) => { cudaOnline = false; reject(e); });
        req.on('timeout', () => { cudaOnline = false; req.destroy(); reject(new Error('timeout')); });
        req.end();
    });
}

/** Check CUDA service health (cached for 15s). */
async function checkCUDAHealth() {
    if (Date.now() - cudaLastCheck < 15000 && cudaHealthCache) {
        return cudaHealthCache;
    }
    cudaLastCheck = Date.now();
    try {
        const health = await cudaGet('/health', 3000);
        cudaOnline = health.status === 'online';
        cudaHealthCache = health;
        return health;
    } catch (e) {
        cudaOnline = false;
        cudaHealthCache = null;
        return null;
    }
}

/** Track endpoint metrics. */
function trackEndpoint(name, latencyMs) {
    if (!stats.endpoints[name]) {
        stats.endpoints[name] = { calls: 0, totalMs: 0, errors: 0, avgMs: 0, lastMs: 0 };
    }
    const ep = stats.endpoints[name];
    ep.calls++;
    ep.totalMs += latencyMs;
    ep.lastMs = latencyMs;
    ep.avgMs = Math.round(ep.totalMs / ep.calls * 100) / 100;
}

function trackError(name) {
    if (!stats.endpoints[name]) {
        stats.endpoints[name] = { calls: 0, totalMs: 0, errors: 0, avgMs: 0, lastMs: 0 };
    }
    stats.endpoints[name].errors++;
}


// ═══════════════════════════════════════════════════════════════
//  ROUTE HANDLERS (raw HTTP, SSH tunnel compatible)
// ═══════════════════════════════════════════════════════════════

const routeHandlers = {};

// ── PING (instant, no CUDA calls — tunnel diagnostic) ──
routeHandlers['GET /ping'] = async (req, res) => {
    sendJSON(res, 200, { pong: true, ts: Date.now(), version: '5.0.0-CUDA-RAW-HTTP' });
};

// ── HEALTH ──
routeHandlers['GET /health'] = async (req, res) => {
    const uptime = Math.round((Date.now() - stats.startTime) / 1000);
    const cudaHealth = await checkCUDAHealth();

    sendJSON(res, 200, {
        service: 'gpu-quantum-offload',
        version: '5.0.0-CUDA-RAW-HTTP',
        mode: 'CUDA-ONLY (no WASM/CPU fallback)',
        status: cudaOnline ? 'online' : 'degraded',
        cuda: {
            online: cudaOnline,
            url: CUDA_URL,
            timeoutMs: CUDA_TIMEOUT_MS,
            gpu: cudaHealth ? cudaHealth.gpu : null,
            continuousEngine: cudaHealth ? cudaHealth.continuousEngine : null,
            version: cudaHealth ? cudaHealth.version : 'unknown',
        },
        gpu: cudaHealth ? cudaHealth.gpu : { enabled: false, backend: 'offline' },
        proxy: {
            totalRequests: stats.totalRequests,
            totalProxied: stats.totalProxied,
            totalErrors: stats.totalErrors,
            totalCudaMs: Math.round(stats.totalCudaMs),
            avgCudaMs: stats.totalProxied > 0 ? Math.round(stats.totalCudaMs / stats.totalProxied * 100) / 100 : 0,
        },
        uptime,
        uptimeFormatted: Math.floor(uptime / 3600) + 'h ' + Math.floor((uptime % 3600) / 60) + 'm',
        hostname: os.hostname(),
        platform: os.platform(),
        endpoints: [
            'GET /health', 'POST /gpu/qmc', 'POST /gpu/vqc-regime',
            'POST /gpu/batch-vqc', 'POST /gpu/qaoa-weights', 'POST /gpu/matmul',
            'POST /gpu/var', 'POST /gpu/portfolio-opt', 'POST /gpu/deep-scenario',
            'POST /gpu/warmup-heavy', 'GET /gpu/continuous-status', 'GET /metrics',
        ],
    });
};

// ── QMC — Quantum Monte Carlo ──
routeHandlers['POST /gpu/qmc'] = async (req, res) => {
    const t0 = performance.now();
    try {
        const params = await readBody(req);
        if (!params || typeof params.currentPrice !== 'number') {
            return sendJSON(res, 400, { error: 'Missing currentPrice (number required)' });
        }
        const result = await cudaPost('/gpu/qmc', params);
        trackEndpoint('qmc', performance.now() - t0);
        sendJSON(res, 200, result);
    } catch (e) {
        trackError('qmc');
        console.error('[QMC CUDA ERROR]', e.message);
        sendJSON(res, 503, {
            error: 'CUDA GPU computation failed (CUDA-ONLY mode — no fallback)',
            detail: e.message,
        });
    }
};

// ── VQC — Regime Classification ──
routeHandlers['POST /gpu/vqc-regime'] = async (req, res) => {
    const t0 = performance.now();
    try {
        const body = await readBody(req);
        if (!body.features || !Array.isArray(body.features)) {
            return sendJSON(res, 400, { error: 'Missing features (array required)' });
        }
        const result = await cudaPost('/gpu/vqc-regime', { features: body.features });
        trackEndpoint('vqc', performance.now() - t0);
        sendJSON(res, 200, result);
    } catch (e) {
        trackError('vqc');
        console.error('[VQC CUDA ERROR]', e.message);
        sendJSON(res, 503, { error: 'CUDA GPU failed (CUDA-ONLY)', detail: e.message });
    }
};

// ── Batch VQC ──
routeHandlers['POST /gpu/batch-vqc'] = async (req, res) => {
    const t0 = performance.now();
    try {
        const body = await readBody(req);
        if (!body.featureSets || !Array.isArray(body.featureSets)) {
            return sendJSON(res, 400, { error: 'Missing featureSets (array of arrays required)' });
        }
        const result = await cudaPost('/gpu/batch-vqc', { featureSets: body.featureSets });
        trackEndpoint('batch_vqc', performance.now() - t0);
        sendJSON(res, 200, result);
    } catch (e) {
        trackError('batch_vqc');
        sendJSON(res, 503, { error: 'CUDA GPU failed (CUDA-ONLY)', detail: e.message });
    }
};

// ── QAOA — Strategy Optimization ──
routeHandlers['POST /gpu/qaoa-weights'] = async (req, res) => {
    const t0 = performance.now();
    try {
        const body = await readBody(req);
        if (!body.strategyMetrics || typeof body.strategyMetrics !== 'object') {
            return sendJSON(res, 400, { error: 'Missing strategyMetrics (object required)' });
        }
        const result = await cudaPost('/gpu/qaoa-weights', {
            strategyMetrics: body.strategyMetrics,
            maxStrategies: body.maxStrategies || 5,
            nIterations: body.nIterations || 1500,
        });
        trackEndpoint('qaoa', performance.now() - t0);
        sendJSON(res, 200, result);
    } catch (e) {
        trackError('qaoa');
        console.error('[QAOA CUDA ERROR]', e.message);
        sendJSON(res, 503, { error: 'CUDA GPU failed (CUDA-ONLY)', detail: e.message });
    }
};

// ── MatMul ──
routeHandlers['POST /gpu/matmul'] = async (req, res) => {
    const t0 = performance.now();
    try {
        const body = await readBody(req);
        if (!body.A || !body.B || !Array.isArray(body.A) || !Array.isArray(body.B)) {
            return sendJSON(res, 400, { error: 'Missing A and B matrices' });
        }
        const result = await cudaPost('/gpu/matmul', { A: body.A, B: body.B });
        trackEndpoint('matmul', performance.now() - t0);
        sendJSON(res, 200, result);
    } catch (e) {
        trackError('matmul');
        sendJSON(res, 503, { error: 'CUDA GPU failed (CUDA-ONLY)', detail: e.message });
    }
};

// ── VaR ──
routeHandlers['POST /gpu/var'] = async (req, res) => {
    const t0 = performance.now();
    try {
        const body = await readBody(req);
        if (!body.pnls || !Array.isArray(body.pnls)) {
            return sendJSON(res, 400, { error: 'Missing pnls (array required)' });
        }
        const result = await cudaPost('/gpu/var', { pnls: body.pnls, confidenceLevels: body.confidenceLevels });
        trackEndpoint('var', performance.now() - t0);
        sendJSON(res, 200, result);
    } catch (e) {
        trackError('var');
        sendJSON(res, 503, { error: 'CUDA GPU failed (CUDA-ONLY)', detail: e.message });
    }
};

// ── Portfolio Optimization ──
routeHandlers['POST /gpu/portfolio-opt'] = async (req, res) => {
    const t0 = performance.now();
    try {
        const body = await readBody(req);
        const result = await cudaPost('/gpu/portfolio-opt', body);
        trackEndpoint('portfolio_opt', performance.now() - t0);
        sendJSON(res, 200, result);
    } catch (e) {
        trackError('portfolio_opt');
        sendJSON(res, 503, { error: 'CUDA GPU failed (CUDA-ONLY)', detail: e.message });
    }
};

// ── Deep Scenario Analysis — HEAVY GPU endpoint ──
routeHandlers['POST /gpu/deep-scenario'] = async (req, res) => {
    const t0 = performance.now();
    try {
        const body = await readBody(req);
        const result = await cudaPost('/gpu/deep-scenario', body, 60000);
        trackEndpoint('deep_scenario', performance.now() - t0);
        sendJSON(res, 200, result);
    } catch (e) {
        trackError('deep_scenario');
        sendJSON(res, 503, { error: 'CUDA GPU failed on deep scenario', detail: e.message });
    }
};

// ── Heavy Warmup ──
routeHandlers['POST /gpu/warmup-heavy'] = async (req, res) => {
    const t0 = performance.now();
    try {
        await readBody(req); // consume body
        const result = await cudaPost('/gpu/warmup-heavy', {}, 60000);
        trackEndpoint('warmup_heavy', performance.now() - t0);
        sendJSON(res, 200, result);
    } catch (e) {
        trackError('warmup_heavy');
        sendJSON(res, 503, { error: 'CUDA warmup failed', detail: e.message });
    }
};

// ── Continuous Engine Status ──
routeHandlers['GET /gpu/continuous-status'] = async (req, res) => {
    try {
        const result = await cudaGet('/gpu/continuous-status', 5000);
        sendJSON(res, 200, result);
    } catch (e) {
        sendJSON(res, 503, { error: 'Cannot reach CUDA continuous engine', detail: e.message });
    }
};

// ── Metrics ──
routeHandlers['GET /metrics'] = async (req, res) => {
    const uptime = Math.round((Date.now() - stats.startTime) / 1000);
    let cudaMetrics = null;
    try { cudaMetrics = await cudaGet('/metrics', 3000); } catch (e) { /* ignore */ }

    sendJSON(res, 200, {
        uptime,
        mode: 'CUDA-ONLY',
        proxy: {
            totalRequests: stats.totalRequests,
            totalProxied: stats.totalProxied,
            totalErrors: stats.totalErrors,
            totalCudaMs: Math.round(stats.totalCudaMs),
            endpoints: stats.endpoints,
        },
        cuda: cudaMetrics,
    });
};

// ═══════════════════════════════════════════════════════════════
//  RAW HTTP SERVER — SSH TUNNEL COMPATIBLE
// ═══════════════════════════════════════════════════════════════

const server = http.createServer(async (req, res) => {
    stats.totalRequests++;

    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
            'Connection': 'close',
        });
        return res.end();
    }

    // Parse URL
    const parsedUrl = new URL(req.url, 'http://localhost');
    const pathname = parsedUrl.pathname;
    const routeKey = req.method + ' ' + pathname;

    // Find route handler
    const handler = routeHandlers[routeKey];
    if (handler) {
        try {
            await handler(req, res);
        } catch (e) {
            console.error('[UNHANDLED ROUTE ERROR]', routeKey, e.message);
            if (!res.writableEnded) {
                sendJSON(res, 500, { error: 'Internal server error', detail: e.message });
            }
        }
    } else {
        sendJSON(res, 404, { error: 'Not found', path: pathname, method: req.method });
    }
});

// Disable keep-alive to ensure SSH tunnel compatibility
server.keepAliveTimeout = 0;

// ═══════════════════════════════════════════════════════════════
//  STARTUP
// ═══════════════════════════════════════════════════════════════

async function start() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║  GPU QUANTUM SERVICE v5.0 — CUDA-ONLY (Raw HTTP)               ║');
    console.log('║  PATCH #43: NO WASM • NO TF.js • NO CPU FALLBACK               ║');
    console.log('║  SSH TUNNEL COMPATIBLE (raw http.createServer, no Express)       ║');
    console.log('║                                                                  ║');
    console.log('║  All computation goes to Python CUDA (RTX 5070 Ti)              ║');
    console.log('║  If CUDA fails → HTTP 503 error (intentional — CUDA ONLY)       ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log('');

    // Check CUDA backend
    console.log('[CUDA] Checking Python CUDA service at ' + CUDA_URL + '...');
    const cudaHealth = await checkCUDAHealth();

    if (cudaHealth && cudaOnline) {
        console.log('[CUDA] ✓ Python CUDA service ONLINE');
        console.log('[CUDA]   Version: ' + (cudaHealth.version || 'unknown'));
        console.log('[CUDA]   GPU: ' + (cudaHealth.gpu ? cudaHealth.gpu.device : 'unknown'));
        console.log('[CUDA]   VRAM: ' + (cudaHealth.gpu ? cudaHealth.gpu.vram_total_mb + 'MB' : 'unknown'));
        if (cudaHealth.continuousEngine) {
            console.log('[CUDA]   ContinuousEngine: ' + (cudaHealth.continuousEngine.running ? 'RUNNING' : 'OFF'));
            console.log('[CUDA]   Target Utilization: ' + (cudaHealth.continuousEngine.targetUtilization || '50%'));
        }
    } else {
        console.log('[CUDA] ✗ Python CUDA service OFFLINE!');
        console.log('[CUDA]   Start with: python gpu-cuda-service.py');
        console.log('[CUDA]   WARNING: All GPU requests will fail until CUDA service is online!');
    }
    console.log('');

    // Periodic CUDA health check every 30s
    setInterval(() => {
        checkCUDAHealth().catch(() => {});
    }, 30000);

    // Start raw HTTP server
    const PORT = parseInt(process.env.GPU_SERVICE_PORT || '4000', 10);
    server.listen(PORT, '0.0.0.0', () => {
        console.log('╔══════════════════════════════════════════════════╗');
        console.log('║  SERVICE READY on http://0.0.0.0:' + PORT + '          ║');
        console.log('║  Mode: CUDA-ONLY (RTX 5070 Ti exclusive)       ║');
        console.log('║  Server: Raw HTTP (SSH tunnel compatible)       ║');
        console.log('║  Timeout: ' + (CUDA_TIMEOUT_MS / 1000) + 's (heavy workloads supported)  ║');
        console.log('╚══════════════════════════════════════════════════╝');
        console.log('');
    });
}

start().catch(err => { console.error('[FATAL]', err); process.exit(1); });

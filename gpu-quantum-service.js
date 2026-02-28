'use strict';
/**
 * @module gpu-quantum-service
 * @description PATCH #38: GPU Quantum Offload Service — Local RTX CUDA
 *
 * Runs on local PC (Windows/Linux with NVIDIA GPU).
 * Exposes REST API on port 4000 for VPS bot to offload heavy quantum computations.
 *
 * Endpoints:
 *   GET  /health            — GPU status + backend info
 *   POST /gpu/qmc           — GPU-accelerated Monte Carlo (200K paths)
 *   POST /gpu/vqc-regime    — VQC regime classification (quantum circuit)
 *   POST /gpu/qaoa-weights  — QAOA strategy weight optimization
 *   POST /gpu/matmul        — GPU matrix multiplication (kernels)
 *   POST /gpu/var           — VaR/CVaR calculation
 *   GET  /metrics           — Performance metrics (latency, throughput, calls)
 *
 * Usage:
 *   cd turbo-bot
 *   node gpu-quantum-service.js                    # Port 4000
 *   node gpu-quantum-service.js --port 5000        # Custom port
 *   node gpu-quantum-service.js --tunnel            # Auto-start ngrok
 *
 * VPS bot connects via ngrok/cloudflare tunnel URL.
 *
 * @version 1.0.0
 * @since PATCH #38
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// ─── CONFIG ──────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const GPU_PORT = parseInt(ARGS.find(a => a.startsWith('--port='))?.split('=')[1] || '4000');
const AUTO_TUNNEL = ARGS.includes('--tunnel');

// ─── Load quantum modules ───────────────────────────────────────────
const gpuSimPath = path.join(__dirname, 'trading-bot/src/core/ai/quantum_gpu_sim');
const pipelinePath = path.join(__dirname, 'trading-bot/src/core/ai/hybrid_quantum_pipeline');

let gpuSim, pipeline;
try {
    gpuSim = require(gpuSimPath);
    pipeline = require(pipelinePath);
} catch (e) {
    console.error('[GPU SERVICE] Failed to load modules:', e.message);
    console.error('Ensure you run from the turbo-bot root directory.');
    process.exit(1);
}

const {
    GPUQuantumState,
    gpuBatchMonteCarlo,
    gpuMatMul,
    gpuVaRCalculation,
    initGPU,
    getGPUStatus,
} = gpuSim;

const {
    VariationalQuantumClassifier,
    QAOAStrategyOptimizer,
} = pipeline;

// ─── METRICS TRACKER ─────────────────────────────────────────────────
const metrics = {
    startTime: Date.now(),
    totalRequests: 0,
    endpoints: {
        qmc:   { calls: 0, totalMs: 0, totalPaths: 0, errors: 0 },
        vqc:   { calls: 0, totalMs: 0, errors: 0 },
        qaoa:  { calls: 0, totalMs: 0, errors: 0 },
        matmul: { calls: 0, totalMs: 0, errors: 0 },
        var:   { calls: 0, totalMs: 0, errors: 0 },
    },
    lastRequestTime: null,
};

// ─── VQC + QAOA reusable instances ──────────────────────────────────
const vqcInstance = new VariationalQuantumClassifier({
    nQubits: 4, nLayers: 3, nFeatures: 8, learningRate: 0.01
});
const qaoaInstance = new QAOAStrategyOptimizer({
    nLayers: 4, nIterations: 150, learningRate: 0.05
});

// ─── EXPRESS APP ─────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Request counter middleware
app.use((req, res, next) => {
    metrics.totalRequests++;
    metrics.lastRequestTime = Date.now();
    next();
});

// ─── HEALTH ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    const status = getGPUStatus();
    res.json({
        service: 'gpu-quantum-offload',
        version: '1.0.0',
        gpu: status,
        uptime: Math.round((Date.now() - metrics.startTime) / 1000),
        totalRequests: metrics.totalRequests,
        lastRequest: metrics.lastRequestTime ? new Date(metrics.lastRequestTime).toISOString() : null,
    });
});

// ─── GPU QMC (Monte Carlo) ──────────────────────────────────────────
app.post('/gpu/qmc', (req, res) => {
    const t0 = performance.now();
    try {
        const params = req.body;
        // Validate required fields
        if (!params || typeof params.currentPrice !== 'number') {
            return res.status(400).json({ error: 'Missing currentPrice in params' });
        }

        // Default to large batch for GPU (that's the point of offloading)
        if (!params.nPaths) params.nPaths = 50000;

        const result = gpuBatchMonteCarlo(params);
        const latencyMs = Math.round((performance.now() - t0) * 100) / 100;

        metrics.endpoints.qmc.calls++;
        metrics.endpoints.qmc.totalMs += latencyMs;
        metrics.endpoints.qmc.totalPaths += (result.pathsGenerated || params.nPaths);

        res.json({
            ...result,
            offloadLatencyMs: latencyMs,
            source: 'gpu-remote',
        });
    } catch (e) {
        metrics.endpoints.qmc.errors++;
        console.error('[GPU QMC] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// ─── GPU VQC Regime Classification ──────────────────────────────────
app.post('/gpu/vqc-regime', (req, res) => {
    const t0 = performance.now();
    try {
        const { features } = req.body;
        if (!features || !Array.isArray(features)) {
            return res.status(400).json({ error: 'Missing features array' });
        }

        const classification = vqcInstance.classify(features);
        const latencyMs = Math.round((performance.now() - t0) * 100) / 100;

        metrics.endpoints.vqc.calls++;
        metrics.endpoints.vqc.totalMs += latencyMs;

        res.json({
            ...classification,
            offloadLatencyMs: latencyMs,
            source: 'gpu-remote',
        });
    } catch (e) {
        metrics.endpoints.vqc.errors++;
        console.error('[GPU VQC] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// ─── GPU QAOA Weight Optimization ───────────────────────────────────
app.post('/gpu/qaoa-weights', (req, res) => {
    const t0 = performance.now();
    try {
        const { strategyMetrics, maxStrategies } = req.body;
        if (!strategyMetrics || typeof strategyMetrics !== 'object') {
            return res.status(400).json({ error: 'Missing strategyMetrics object' });
        }

        const result = qaoaInstance.optimize(strategyMetrics, maxStrategies || 5);
        const latencyMs = Math.round((performance.now() - t0) * 100) / 100;

        metrics.endpoints.qaoa.calls++;
        metrics.endpoints.qaoa.totalMs += latencyMs;

        res.json({
            ...result,
            offloadLatencyMs: latencyMs,
            source: 'gpu-remote',
        });
    } catch (e) {
        metrics.endpoints.qaoa.errors++;
        console.error('[GPU QAOA] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// ─── GPU Matrix Multiply ────────────────────────────────────────────
app.post('/gpu/matmul', (req, res) => {
    const t0 = performance.now();
    try {
        const { A, B } = req.body;
        if (!A || !B) {
            return res.status(400).json({ error: 'Missing A or B matrices' });
        }

        const C = gpuMatMul(A, B);
        const latencyMs = Math.round((performance.now() - t0) * 100) / 100;

        metrics.endpoints.matmul.calls++;
        metrics.endpoints.matmul.totalMs += latencyMs;

        res.json({ C, offloadLatencyMs: latencyMs, source: 'gpu-remote' });
    } catch (e) {
        metrics.endpoints.matmul.errors++;
        res.status(500).json({ error: e.message });
    }
});

// ─── GPU VaR Calculation ────────────────────────────────────────────
app.post('/gpu/var', (req, res) => {
    const t0 = performance.now();
    try {
        const { pnls, confidenceLevels } = req.body;
        if (!pnls || !Array.isArray(pnls)) {
            return res.status(400).json({ error: 'Missing pnls array' });
        }

        const result = gpuVaRCalculation(pnls, confidenceLevels || [0.95, 0.99]);
        const latencyMs = Math.round((performance.now() - t0) * 100) / 100;

        metrics.endpoints.var.calls++;
        metrics.endpoints.var.totalMs += latencyMs;

        res.json({ ...result, offloadLatencyMs: latencyMs, source: 'gpu-remote' });
    } catch (e) {
        metrics.endpoints.var.errors++;
        res.status(500).json({ error: e.message });
    }
});

// ─── METRICS ─────────────────────────────────────────────────────────
app.get('/metrics', (req, res) => {
    const gpu = getGPUStatus();
    const result = { ...metrics, gpu: gpu };

    // Calculate averages
    for (const [name, ep] of Object.entries(metrics.endpoints)) {
        result.endpoints[name] = {
            ...ep,
            avgMs: ep.calls > 0 ? Math.round(ep.totalMs / ep.calls * 100) / 100 : 0,
        };
    }

    res.json(result);
});

// ─── START SERVER ────────────────────────────────────────────────────
async function start() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  PATCH #38: GPU Quantum Offload Service                      ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    // Initialize GPU
    const gpuResult = await initGPU();
    console.log(`[GPU] Backend: ${gpuResult.backend} | GPU: ${gpuResult.enabled ? 'ENABLED (' + gpuResult.device + ')' : 'DISABLED (CPU fallback)'}`);

    if (!gpuResult.enabled) {
        console.warn('[WARN] No GPU detected. Service will use CPU — offloading provides no speedup.');
        console.warn('[WARN] Ensure NVIDIA drivers + @tensorflow/tfjs-node-gpu installed.');
    }

    // Start HTTP server
    app.listen(GPU_PORT, '0.0.0.0', () => {
        console.log(`[GPU SERVICE] Listening on port ${GPU_PORT}`);
        console.log(`[GPU SERVICE] Health: http://localhost:${GPU_PORT}/health`);
        console.log(`[GPU SERVICE] Metrics: http://localhost:${GPU_PORT}/metrics`);
    });

    // Auto-tunnel via ngrok if requested
    if (AUTO_TUNNEL) {
        try {
            let ngrok;
            try { ngrok = require('ngrok'); } catch (e) {
                try { ngrok = require('@ngrok/ngrok'); } catch (e2) {
                    console.warn('[TUNNEL] ngrok not installed. Run: npm i ngrok');
                    console.warn('[TUNNEL] Or use manual tunnel: ngrok http ' + GPU_PORT);
                    return;
                }
            }
            const url = await ngrok.connect({ addr: GPU_PORT, proto: 'http' });
            console.log('');
            console.log('╔═══════════════════════════════════════════════════════════════╗');
            console.log(`║  🌐 TUNNEL ACTIVE: ${url.padEnd(40)}║`);
            console.log('║                                                              ║');
            console.log('║  Set on VPS: GPU_REMOTE_URL=' + url.padEnd(32) + '║');
            console.log('╚═══════════════════════════════════════════════════════════════╝');
        } catch (e) {
            console.warn('[TUNNEL] ngrok error:', e.message);
            console.warn('[TUNNEL] Use manual tunnel: ngrok http ' + GPU_PORT);
        }
    } else {
        console.log('');
        console.log('[INFO] To expose via tunnel, run one of:');
        console.log('  node gpu-quantum-service.js --tunnel      (auto ngrok)');
        console.log('  ngrok http ' + GPU_PORT + '                        (manual)');
        console.log('  cloudflared tunnel --url http://localhost:' + GPU_PORT);
    }
}

start().catch(err => {
    console.error('[FATAL]', err);
    process.exit(1);
});
